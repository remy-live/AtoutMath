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
import { getClassement, saveClassement } from './chapitres.js';
import { uuid } from './ids.js';

const FORMAT = 'atoutmath/v2';

// ─────────────────────────────────────────────────────────────────────────────
// CE QUI SE DÉCIDE SANS ÉCRAN — et qui est désormais à part.
//
// Ce fichier mélangeait trois choses : ouvrir une fenêtre, fabriquer un
// fichier, et FUSIONNER les données d'un professeur avec celles qu'il a déjà.
// Seule la troisième peut détruire quelque chose, et c'était la seule
// impossible à éprouver : pour l'atteindre il fallait un `document`, un
// `FileReader`, `ui/modal.js` et `ui/builder.js`.
//
// Les quatre fonctions qui suivent ne touchent à rien : on leur donne le
// fichier et l'état actuel, elles disent ce qu'il faut en faire. `applyImport`
// reste le seul à écrire. C'est ce découpage qui rend `tests/importExport.test.mjs`
// possible — et c'est le propre des quarante parcours d'une année de cours qui
// est en jeu.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * DE QUEL FICHIER S'AGIT-IL ? On le dit en un mot, avant d'y toucher.
 *
 * Les quatre réponses possibles correspondent aux quatre branches de
 * `applyImport`, et le `null` est la seule qui compte vraiment : un fichier
 * qu'on ne reconnaît pas doit être REFUSÉ, pas lu à moitié.
 *
 * @returns {'contenu-professeur'|'progression-eleve'|'progression-ancienne'|null}
 */
export function reconnaitreFichier(data) {
    if (!data || typeof data !== 'object') return null;
    if (data.kind === 'teacher_content' || data.type === 'teacher_paths') return 'contenu-professeur';
    if (data.kind === 'student_progress' && Array.isArray(data.events)) return 'progression-eleve';
    if (data.type === 'student_progress') return 'progression-ancienne';
    return null;
}

/**
 * FUSIONNER LE CONTENU D'UN PROFESSEUR DANS CE QU'IL A DÉJÀ.
 *
 * Rien n'est écrasé, et c'est la règle entière. Un professeur qui réimporte
 * son fichier de la semaine dernière ne doit pas se retrouver avec quarante
 * parcours en double, ni perdre les trois qu'il a écrits depuis.
 *
 * On ne rend pas l'état fusionné mais CE QU'IL FAUT AJOUTER : les tableaux de
 * `state` sont tenus par ailleurs (l'interface des parcours garde des
 * références dessus), et les remplacer ferait pointer l'écran sur l'ancien.
 *
 * @param {Object} data le fichier importé
 * @param {{parcours: Array, dossiers: Array, classement: Object}} actuel
 * @returns {{parcoursAAjouter: Array, dossiersAAjouter: Array, classement: Object, casesClassees: number}}
 */
export function fusionnerContenuProfesseur(data, actuel = {}) {
    const parcours = actuel.parcours || [];
    const dossiers = actuel.dossiers || [];

    // L'IDENTIFIANT DÉCIDE, PAS LE NOM. Deux parcours peuvent légitimement
    // s'appeler « Relatifs » — celui de la 6e B et celui de la 6e C.
    const dejaLa = new Set(parcours.map(p => p && p.id));
    const parcoursAAjouter = [];
    for (const p of (data.teacherPaths || [])) {
        if (!p || dejaLa.has(p.id)) continue;
        dejaLa.add(p.id);        // un fichier qui se répète lui-même ne double pas
        parcoursAAjouter.push(p);
    }

    const dossiersLa = new Set(dossiers.map(d => d && d.id));
    const dossiersAAjouter = [];
    for (const d of (data.teacherFolders || [])) {
        if (!d || dossiersLa.has(d.id)) continue;
        dossiersLa.add(d.id);
        dossiersAAjouter.push(d);
    }

    // LE CLASSEMENT PAR CHAPITRE SE FUSIONNE CASE PAR CASE.
    //
    // Il vit dans le stockage du poste : sur un autre navigateur, le professeur
    // ne retrouverait rien. C'est une soirée de relecture — elle ne peut pas
    // dépendre d'un cache. Le fichier importé, plus récent dans l'intention,
    // l'emporte sur une case déjà remplie ; une case qu'il ne connaît pas
    // reste.
    const classement = { ...(actuel.classement || {}) };
    let casesClassees = 0;
    if (data.chapitres && typeof data.chapitres === 'object') {
        for (const [exoId, cases] of Object.entries(data.chapitres)) {
            if (!cases || typeof cases !== 'object') continue;
            classement[exoId] = { ...(classement[exoId] || {}), ...cases };
            casesClassees += Object.keys(cases).length;
        }
    }

    return { parcoursAAjouter, dossiersAAjouter, classement, casesClassees };
}

/**
 * LE FICHIER QU'ON ÉCRIT, sans rien qui touche au disque.
 *
 * @param {Object} quoi
 * @param {boolean} quoi.professeur vrai pour un fichier de parcours
 * @param {number} [quoi.quand] la date d'export, pour pouvoir l'éprouver
 */
export function contenuAExporter({ professeur, profile, events, teacherPaths, teacherFolders, chapitres, quand = Date.now() }) {
    // POUR CELUI QUI OUVRE LE FICHIER DANS UN ÉDITEUR. `format` et `kind`
    // disent à la MACHINE quoi en faire ; `aPropos` le dit à la personne. Elle
    // ne coûte rien et évite la question « c'est quoi, ce fichier, et
    // qu'est-ce que j'en fais ? »
    if (professeur) {
        return {
            format: FORMAT, kind: 'teacher_content', exportedAt: quand,
            aPropos: 'Fichier AtoutMath — parcours et dossiers du professeur. '
                + 'Déposez-le sur la page d\'AtoutMath pour l\'importer.',
            teacherPaths: teacherPaths || [],
            teacherFolders: teacherFolders || [],
            chapitres: chapitres || {}
        };
    }
    return {
        format: FORMAT, kind: 'student_progress', exportedAt: quand,
        aPropos: 'Fichier AtoutMath — progression d\'un élève. '
            + 'Déposez-le sur la page d\'AtoutMath pour l\'importer.',
        profile: { id: profile && profile.id, name: profile && profile.name },
        // LE JOURNAL BRUT, MOINS LE DRAPEAU `synced`.
        //
        // Tout est reconstructible depuis là. Mais `synced` dit « ce poste-ci a
        // déjà envoyé cet événement au serveur », ce qui n'a aucun sens sur
        // l'appareil qui recevra le fichier : il le croirait envoyé et ne
        // l'enverrait jamais. Le travail de l'élève n'arriverait pas au
        // professeur, et personne ne verrait pourquoi.
        events: (events || []).map(({ synced, ...e }) => e)
    };
}

/** Le nom sous lequel le fichier se range dans les téléchargements. */
export function nomDuFichier(professeur, profile) {
    return professeur ? 'parcours_atoutmath.json' : `progression_${slug(profile && profile.name)}.json`;
}

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

    // LE CLASSEMENT PAR CHAPITRE VOYAGE AVEC LES PARCOURS : il vit dans le
    // stockage du poste, comme eux.
    const payload = contenuAExporter({
        professeur: teacher,
        profile,
        events: teacher ? null : journal.all(),
        teacherPaths: state.teacherPaths,
        teacherFolders: state.teacherFolders,
        chapitres: teacher ? getClassement() : null
    });

    download(JSON.stringify(payload, null, 2), nomDuFichier(teacher, profile));
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

/**
 * APPLIQUER UN FICHIER IMPORTÉ — quel que soit le chemin par lequel il arrive.
 *
 * Exporté depuis qu'on peut aussi DÉPOSER un fichier sur la page
 * (`ui/deposerFichier.js`) : la fenêtre d'import et le dépôt doivent faire
 * exactement la même chose, sans quoi l'un des deux prendrait du retard.
 *
 * @param {Object} data le contenu du fichier, déjà analysé
 * @param {Element} [modal] la fenêtre à refermer, s'il y en a une
 */
export async function applyImport(data, modal) {
    const { showToast, showAlert, showConfirm } = await import('../ui/modal.js');

    const quoi = reconnaitreFichier(data);

    // Contenu professeur (parcours et dossiers)
    if (quoi === 'contenu-professeur') {
        const fusion = fusionnerContenuProfesseur(data, {
            parcours: state.teacherPaths,
            dossiers: state.teacherFolders,
            classement: getClassement()
        });
        // On POUSSE dans les tableaux de `state` au lieu de les remplacer :
        // l'interface des parcours garde des références dessus.
        fusion.parcoursAAjouter.forEach(p => state.teacherPaths.push(p));
        fusion.dossiersAAjouter.forEach(f => state.teacherFolders.push(f));
        state.saveTeacherPaths();
        state.saveTeacherFolders();
        if (fusion.casesClassees) saveClassement(fusion.classement);

        const added = fusion.parcoursAAjouter.length;
        const classees = fusion.casesClassees;

        const { renderPathBrowser } = await import('../ui/builder.js');
        renderPathBrowser();
        if (modal) modal.style.display = 'none';
        showToast(classees
            ? `${added} parcours importé(s), et ${classees} case${classees > 1 ? 's' : ''} de classement.`
            : `${added} parcours importé(s).`, 'success');
        return;
    }

    // Progression élève
    if (quoi === 'progression-eleve') {
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
    if (quoi === 'progression-ancienne') {
        if (state.isTeacherMode) {
            if (modal) modal.style.display = 'none';
            return showStudentAnalysis({ ...data, legacy: true });
        }
        showConfirm('Ce fichier vient d\'une ancienne version. L\'importer ajoutera son historique au tien. Continuer ?', async () => {
            // On reconstruit des événements à partir des agrégats du fichier.
            journal.merge(evenementsDepuisAncienFormat(data, getActiveProfile().id));
            await journal.flush();
            showToast('Ancienne progression importée.', 'success');
        }, { bouton: 'Importer cet historique', doux: true });
        return;
    }

    showAlert('Format de fichier non reconnu.');
}

/**
 * LES ÉVÉNEMENTS QU'ON RECONSTRUIT D'UN FICHIER DE L'ANCIENNE VERSION.
 *
 * Elle ne gardait que des agrégats : un score, et une liste d'erreurs. On ne
 * peut donc pas reconstituer les bonnes réponses — seulement les fautes, qui
 * sont justement ce qu'un élève a besoin de reprendre, et le score, qu'on
 * réinjecte en un bonus unique puisqu'il n'est pas reconstituable question par
 * question.
 *
 * @param {number} [quand] la date de repli, pour pouvoir l'éprouver
 */
export function evenementsDepuisAncienFormat(data, profileId, quand = Date.now()) {
    const out = [];
    const mk = (type, payload, ts) => out.push({
        id: uuid(), type, ts: ts || quand, profileId, deviceId: 'import', payload
    });
    ((data && data.errorHistory) || []).forEach(err => {
        const qd = err.questionData || {};
        mk('attempt', {
            exerciseId: err.exoId, exerciseTitle: err.exoTitle,
            questionText: qd.questionText, given: qd.input, expected: qd.expected,
            correct: false, attemptIndex: 0, points: 0
        }, err.timestamp);
    });
    if (data && data.score) mk('bonus', { points: data.score, reason: 'import' });
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
