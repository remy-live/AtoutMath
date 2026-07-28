// Vue « Mon Parcours ».
//
// Avant : uniquement la liste des étapes assignées par le professeur, ou un
// message vide si aucun code n'avait été saisi — c'est-à-dire rien à faire
// pour la majorité des élèves la plupart du temps.
//
// Maintenant, trois blocs, dans l'ordre de priorité pédagogique :
//   1. le parcours assigné (s'il existe) et sa progression ;
//   2. la séance conseillée, construite à partir du modèle de maîtrise
//      (révisions dues, prérequis fragiles, notions nouvelles accessibles) ;
//   3. le dernier bilan noté, pour que l'élève sache où il en est.

import { state } from '../core/state.js';
import { getExerciseById } from '../data/catalog.js';
import { hydratePath, normalizePath } from '../core/path.js';
import { resolvePolicy, isEvaluation, describePolicy } from '../core/policy.js';
import { journal } from '../core/journal.js';
import { computeRuns } from '../core/projections.js';
import { gradeRun } from '../core/grading.js';
import { buildRecommendedPreview, startRecommendedSession, startSkillSession } from '../core/remediation.js';
import { formatDuration } from './reportUI.js';

export function renderStudentPathView() {
    const container = document.getElementById('student-path-container');
    if (!container) return;
    container.innerHTML = '';

    container.appendChild(assignedSection());
    container.appendChild(recommendedSection());
    const last = lastResultSection();
    if (last) container.appendChild(last);
}

// --- 1. Parcours assigné ----------------------------------------------------

function assignedSection() {
    const box = document.createElement('section');
    box.className = 'path-section';

    const assigned = state.studentPath;
    if (!assigned || !assigned.steps || !assigned.steps.length) {
        box.innerHTML = `
            <h2 class="path-section-title">Parcours du professeur</h2>
            <div class="empty-state-msg">Aucun parcours assigné pour le moment.
            Saisis le code donné par ton professeur avec le bouton « Code » en haut de l'écran.</div>`;
        return box;
    }

    const path = normalizePath({ id: assigned.pathId, name: assigned.name, policy: assigned.policy, steps: assigned.steps, version: 2 });
    const { steps } = hydratePath(path);
    const policy = resolvePolicy(path.policy);
    const done = new Set(assigned.completed || []);
    const firstPending = steps.findIndex(s => !done.has(s.stepId));
    const allDone = firstPending === -1;

    box.innerHTML = `
        <h2 class="path-section-title">${escapeHtml(assigned.name || 'Parcours du professeur')}</h2>
        <p class="path-section-sub ${isEvaluation(policy) ? 'path-section-sub--eval' : ''}">${describePolicy(policy)}</p>`;

    const timeline = document.createElement('div');
    timeline.className = 'path-timeline';
    timeline.appendChild(Object.assign(document.createElement('div'), { className: 'path-timeline-line' }));

    steps.forEach((step, i) => {
        const isDone = done.has(step.stepId);
        const isCurrent = !isDone && i === firstPending;
        const isLocked = !isDone && !isCurrent;

        const row = document.createElement('div');
        row.className = 'path-timeline-step' + (isLocked ? ' path-timeline-step--locked' : '');

        const icon = document.createElement('div');
        icon.className = 'path-timeline-icon ' + (isDone ? 'path-timeline-icon--done' : isCurrent ? 'path-timeline-icon--current' : 'path-timeline-icon--locked');
        icon.textContent = isDone ? '✓' : isLocked ? '🔒' : String(i + 1);

        const card = document.createElement('div');
        card.className = 'card card--flush' + (isCurrent ? ' card--current' : '');

        const title = document.createElement('div');
        title.className = 'timeline-step-title' + (isCurrent ? ' timeline-step-title--active' : '');
        title.textContent = step.title;
        card.appendChild(title);

        const meta = document.createElement('div');
        meta.className = 'timeline-step-meta';
        meta.textContent = `${step.nbItems} questions${step.timeLimit ? ` • ${step.timeLimit}s` : ''}`;
        card.appendChild(meta);

        if (isDone) {
            card.appendChild(statusEl('Terminé !'));
        } else if (isCurrent) {
            const btn = document.createElement('button');
            btn.className = 'btn-toggle active';
            btn.textContent = isEvaluation(policy) ? 'Commencer l\'évaluation' : 'Jouer';
            btn.onclick = () => launchAssigned(path, i);
            card.appendChild(btn);
        } else {
            card.appendChild(statusEl('À débloquer'));
        }

        row.append(icon, card);
        timeline.appendChild(row);
    });

    box.appendChild(timeline);

    if (allDone) {
        const done2 = document.createElement('div');
        done2.className = 'path-complete-banner';
        done2.textContent = '🎉 Parcours terminé ! Bravo.';
        box.appendChild(done2);
    }
    return box;
}

async function launchAssigned(path, startIndex) {
    const { Runner } = await import('../core/runner.js');
    new Runner({ path, deviceMode: 'none', isStudentPath: true, startIndex }).start();
}

// --- 2. Séance conseillée ---------------------------------------------------

function recommendedSection() {
    const box = document.createElement('section');
    box.className = 'path-section';

    const recos = buildRecommendedPreview(3);
    if (!recos.length) {
        box.innerHTML = `
            <h2 class="path-section-title">Ta séance du jour</h2>
            <div class="empty-state-msg">Joue à quelques exercices : une séance sur mesure apparaîtra ici,
            construite à partir de ce que tu maîtrises et de ce qui est à revoir.</div>`;
        return box;
    }

    box.innerHTML = `
        <h2 class="path-section-title">Ta séance du jour</h2>
        <p class="path-section-sub">Choisie d'après tes résultats : ce qui est à revoir passe avant ce qui est nouveau.</p>`;

    const list = document.createElement('div');
    list.className = 'reco-list';

    recos.forEach(r => {
        const card = document.createElement('div');
        card.className = `card reco-card reco-card--${r.reason}`;
        const exo = getExerciseById(r.exerciseId);

        const label = document.createElement('div');
        label.className = 'reco-label';
        label.textContent = r.label;

        const motif = document.createElement('span');
        motif.className = `reco-badge reco-badge--${r.reason}`;
        motif.textContent = r.motif;

        const sub = document.createElement('div');
        sub.className = 'reco-sub';
        sub.textContent = exo ? exo.title : '';

        const btn = document.createElement('button');
        btn.className = 'btn-toggle btn-toggle--sm';
        btn.textContent = 'Travailler';
        btn.onclick = () => startSkillSession(r.skillId);

        card.append(motif, label, sub, btn);
        list.appendChild(card);
    });

    box.appendChild(list);

    const all = document.createElement('button');
    all.className = 'btn-toggle active reco-start-all';
    all.textContent = 'Lancer la séance complète';
    all.onclick = () => startRecommendedSession(3);
    box.appendChild(all);

    return box;
}

// --- 3. Dernier bilan -------------------------------------------------------

function lastResultSection() {
    const run = computeRuns(journal.all()).find(r => r.finishedAt && !r.aborted && r.attempts.length);
    if (!run) return null;

    const bilan = gradeRun(run);
    const box = document.createElement('section');
    box.className = 'path-section';

    const value = bilan.note !== null
        ? `${formatNote(bilan.note)}/${bilan.sur}`
        : `${Math.round(bilan.ratio * 100)} %`;

    box.innerHTML = `
        <h2 class="path-section-title">Ton dernier résultat</h2>
        <div class="card last-run-card">
            <div class="last-run-value">${value}</div>
            <div class="last-run-info">
                <div class="last-run-name">${escapeHtml(bilan.pathName || 'Entraînement libre')}</div>
                <div class="last-run-sub">${bilan.totalReussies}/${bilan.totalQuestions} questions •
                    ${formatDuration(bilan.tempsTotal)} • ${new Date(run.finishedAt).toLocaleDateString()}</div>
            </div>
        </div>`;

    const btn = document.createElement('button');
    btn.className = 'btn-toggle btn-toggle--sm';
    btn.textContent = 'Revoir le détail';
    btn.onclick = () => import('./reportUI.js').then(m => m.showRunReport(bilan, {}));
    box.querySelector('.last-run-card').appendChild(btn);

    return box;
}

function statusEl(text) {
    const el = document.createElement('div');
    el.className = 'timeline-step-status';
    el.textContent = text;
    return el;
}

function formatNote(n) {
    return Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',');
}

function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

document.addEventListener('studentPath_updated', renderStudentPathView);
document.addEventListener('attempts_updated', () => {
    const view = document.getElementById('view-path');
    if (view && view.style.display !== 'none') renderStudentPathView();
});
