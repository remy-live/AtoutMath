// Import / export de fichiers.
//
// C'est le mode de transfert « sans serveur » : une clé USB ou une pièce
// jointe suffisent pour qu'un élève emporte sa progression, ou qu'un
// professeur récupère celle de sa classe. Le format est le même que celui
// envoyé à l'API PHP — un lot d'événements — donc importer un fichier et
// synchroniser produisent exactement le même résultat.

import { state } from './state.js';
import { journal } from './journal.js';
import { getActiveProfile } from './profile.js';
import { computeRuns, computeAttempts, computeErrors } from './projections.js';
import { computeMastery, weakSkills, strongSkills } from './mastery.js';
import { gradeRun } from './grading.js';
import { skillLabel } from '../data/skills.js';
import { uuid } from './ids.js';

const FORMAT = 'atoutmath/v2';

export function initImportExport() {
    const modal = document.getElementById('import-export-modal');
    const open = () => { if (modal) modal.style.display = 'flex'; };

    ['btn-open-import-export-student', 'btn-open-import-export-teacher'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.onclick = open;
    });

    const close = document.getElementById('btn-close-import-export');
    if (close) close.onclick = () => { modal.style.display = 'none'; };

    const btnExport = document.getElementById('btn-export-data');
    if (btnExport) btnExport.onclick = () => exportData();

    const input = document.getElementById('input-import-data');
    if (input) input.onchange = (e) => handleFile(e, modal, input);
}

// --- Export -----------------------------------------------------------------

export function exportData() {
    const profile = getActiveProfile();
    const teacher = state.isTeacherMode;

    const payload = teacher
        ? {
            format: FORMAT, kind: 'teacher_content', exportedAt: Date.now(),
            teacherPaths: state.teacherPaths,
            teacherFolders: state.teacherFolders
        }
        : {
            format: FORMAT, kind: 'student_progress', exportedAt: Date.now(),
            profile: { id: profile.id, name: profile.name },
            // Le journal brut : tout est reconstructible à partir de là.
            events: journal.all().map(({ synced, ...e }) => e)
        };

    download(
        JSON.stringify(payload, null, 2),
        teacher ? 'parcours_atoutmath.json' : `progression_${slug(profile.name)}.json`
    );
}

function download(text, filename) {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

// --- Import -----------------------------------------------------------------

function handleFile(e, modal, input) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
        try {
            const data = JSON.parse(ev.target.result);
            await applyImport(data, modal);
        } catch (err) {
            console.error(err);
            const { showAlert } = await import('../ui/modal.js');
            showAlert('Fichier illisible : ce n\'est pas un export AtoutMath valide.');
        } finally {
            input.value = '';
        }
    };
    reader.readAsText(file);
}

async function applyImport(data, modal) {
    const { showToast, showAlert, showConfirm } = await import('../ui/modal.js');

    // Contenu professeur (parcours et dossiers)
    if (data.kind === 'teacher_content' || data.type === 'teacher_paths') {
        const incoming = data.teacherPaths || [];
        let added = 0;
        incoming.forEach(p => {
            if (!state.teacherPaths.some(x => x.id === p.id)) {
                state.teacherPaths.push(p);
                added++;
            }
        });
        (data.teacherFolders || []).forEach(f => {
            if (!state.teacherFolders.some(x => x.id === f.id)) state.teacherFolders.push(f);
        });
        state.saveTeacherPaths();
        state.saveTeacherFolders();
        const { renderPathBrowser } = await import('../ui/builder.js');
        renderPathBrowser();
        if (modal) modal.style.display = 'none';
        showToast(`${added} parcours importé(s).`, 'success');
        return;
    }

    // Progression élève
    if (data.kind === 'student_progress' && Array.isArray(data.events)) {
        if (state.isTeacherMode) {
            if (modal) modal.style.display = 'none';
            return showStudentAnalysis(data);
        }
        // Fusion, jamais écrasement : l'union des deux journaux est la bonne
        // opération, y compris si les deux appareils ont travaillé en parallèle.
        const added = journal.merge(data.events);
        await journal.flush();
        if (modal) modal.style.display = 'none';
        showToast(`Progression fusionnée : ${added} nouvel(le)s événement(s).`, 'success');
        return;
    }

    // Ancien format (score + errorHistory)
    if (data.type === 'student_progress') {
        if (state.isTeacherMode) {
            if (modal) modal.style.display = 'none';
            return showStudentAnalysis({ ...data, legacy: true });
        }
        showConfirm('Ce fichier vient d\'une ancienne version. L\'importer ajoutera son historique au tien. Continuer ?', async () => {
            // On reconstruit des événements à partir des agrégats du fichier.
            journal.merge(legacyToEvents(data, getActiveProfile().id));
            await journal.flush();
            showToast('Ancienne progression importée.', 'success');
        });
        return;
    }

    showAlert('Format de fichier non reconnu.');
}

function legacyToEvents(data, profileId) {
    const out = [];
    const mk = (type, payload, ts) => out.push({
        id: uuid(), type, ts: ts || Date.now(), profileId, deviceId: 'import', payload
    });
    (data.errorHistory || []).forEach(err => {
        const qd = err.questionData || {};
        mk('attempt', {
            exerciseId: err.exoId, exerciseTitle: err.exoTitle,
            questionText: qd.questionText, given: qd.input, expected: qd.expected,
            correct: false, attemptIndex: 0, points: 0
        }, err.timestamp);
    });
    if (data.score) mk('bonus', { points: data.score, reason: 'import' });
    return out;
}

// --- Analyse d'un fichier élève par le professeur ---------------------------

function showStudentAnalysis(data) {
    const modal = document.getElementById('student-analysis-modal');
    const content = document.getElementById('student-analysis-content');
    if (!modal || !content) return;

    const events = data.events || [];
    const runs = computeRuns(events).filter(r => r.attempts.length);
    const name = (data.profile && data.profile.name) || 'Élève';

    const attempts = computeAttempts(events);
    const mastery = computeMastery(attempts);
    const errors = computeErrors(events).filter(e => !e.corrected);

    content.innerHTML = `
                <div class="analysis-head">
                    <div><div class="analysis-name">${escapeHtml(name)}</div>
                    <div class="analysis-sub">Export du ${new Date(data.exportedAt || Date.now()).toLocaleString()}</div></div>
                    <div class="analysis-kpis">
                        ${kpi('Questions', attempts.length)}
                        ${kpi('Réussite', attempts.length ? Math.round(100 * attempts.filter(a => a.correct).length / attempts.length) + ' %' : '—')}
                        ${kpi('Erreurs ouvertes', errors.length)}
                    </div>
                </div>

                <h4 class="report-section-title">Compétences fragiles</h4>
                ${listSkills(weakSkills(mastery, 6), 'Aucune notion identifiée comme fragile.')}

                <h4 class="report-section-title">Compétences acquises</h4>
                ${listSkills(strongSkills(mastery, 6), 'Pas encore de notion consolidée.')}

                <h4 class="report-section-title">Sessions notées</h4>
                ${runs.length ? `<table class="analysis-table">
                    <thead><tr><th>Parcours</th><th>Date</th><th>Note</th><th>Réussite</th></tr></thead>
                    <tbody>${runs.slice(0, 12).map(r => {
                        const b = gradeRun(r);
                        return `<tr>
                            <td>${escapeHtml(b.pathName || 'Entraînement libre')}</td>
                            <td>${new Date(r.startedAt).toLocaleDateString()}</td>
                            <td>${b.note !== null ? `<b>${b.note}/${b.sur}</b>` : '—'}</td>
                            <td>${b.totalReussies}/${b.totalQuestions}</td>
                        </tr>`;
                    }).join('')}</tbody></table>` : '<div class="empty-state-msg">Aucune session enregistrée.</div>'}`;

    modal.style.display = 'flex';
    const close = document.getElementById('btn-close-student-analysis');
    if (close) close.onclick = () => { modal.style.display = 'none'; };
}

function listSkills(skills, emptyMsg) {
    if (!skills.length) return `<div class="empty-state-msg">${emptyMsg}</div>`;
    return `<ul class="analysis-skills">${skills.map(s => {
        const pct = Math.round(s.mastery * 100);
        return `<li><span class="analysis-skill-label">${escapeHtml(skillLabel(s.skillId))}</span>
            <span class="analysis-skill-bar"><span style="width:${pct}%; background:${s.level.color}"></span></span>
            <span class="analysis-skill-pct" style="color:${s.level.color}">${s.level.short} · ${pct} %</span></li>`;
    }).join('')}</ul>`;
}

function kpi(label, value) {
    return `<div class="analysis-kpi"><div class="analysis-kpi-value">${value}</div><div class="analysis-kpi-label">${label}</div></div>`;
}

function slug(s) {
    return String(s || 'eleve').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_');
}

function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
