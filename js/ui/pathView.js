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

// --- Style de présentation du parcours --------------------------------------
// Trois habillages pour le même parcours : liste classique, carte des mondes
// (façon jeu de plateforme) ou chemin vertical (façon Duolingo). Le choix est
// un réglage du poste, rangé dans le localStorage.

const STYLE_KEY = 'mathbox-path-style';
const STYLES = [
    { id: 'mondes', icon: '🗺️', label: 'Carte des mondes' },
    { id: 'chemin', icon: '🐾', label: 'Chemin d\'étapes' },
    { id: 'classique', icon: '📋', label: 'Liste classique' }
];

function getPathStyle() {
    try {
        const v = localStorage.getItem(STYLE_KEY);
        return STYLES.some(s => s.id === v) ? v : 'mondes';
    } catch (e) { return 'mondes'; }
}

function setPathStyle(id) {
    try { localStorage.setItem(STYLE_KEY, id); } catch (e) { /* mode privé */ }
    renderStudentPathView();
}

function styleSwitcher() {
    const box = document.createElement('div');
    box.className = 'path-style-switcher';
    const actif = getPathStyle();
    STYLES.forEach(s => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'path-style-btn' + (s.id === actif ? ' path-style-btn--active' : '');
        btn.textContent = s.icon;
        btn.title = s.label;
        btn.setAttribute('aria-label', `Présentation : ${s.label}`);
        btn.onclick = () => setPathStyle(s.id);
        box.appendChild(btn);
    });
    return box;
}

export function renderStudentPathView() {
    const container = document.getElementById('student-path-container');
    if (!container) return;
    container.innerHTML = '';

    container.appendChild(assignedSection());
    const teacher = teacherPathsSection();
    if (teacher) container.appendChild(teacher);
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
        <div class="path-section-head">
            <div>
                <h2 class="path-section-title">${escapeHtml(assigned.name || 'Parcours du professeur')}</h2>
                <p class="path-section-sub ${isEvaluation(policy) ? 'path-section-sub--eval' : ''}">${describePolicy(policy)}</p>
            </div>
        </div>`;
    box.querySelector('.path-section-head').appendChild(styleSwitcher());

    const opts = {
        doneIds: done,
        currentIndex: firstPending,
        onNodeClick: (i, statut) => {
            if (statut === 'locked') return;
            launchAssigned(path, i);
        }
    };
    const style = getPathStyle();
    const rendu = style === 'classique' ? buildClassicTimeline(steps, opts)
        : style === 'chemin' ? buildDuoPath(steps, opts)
            : buildWorldMap(steps, opts);
    box.appendChild(rendu);

    if (!allDone && firstPending !== -1) {
        const btn = document.createElement('button');
        btn.className = 'btn-toggle active world-map-play';
        btn.textContent = isEvaluation(policy) ? 'Commencer l\'évaluation' : `Jouer : ${steps[firstPending].title}`;
        btn.onclick = () => launchAssigned(path, firstPending);
        box.appendChild(btn);
    }

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

/**
 * Carte des mondes : les étapes serpentent par rangées de trois, reliées par
 * des pointillés, comme la carte d'un jeu de plateforme. Réutilisée par la
 * vue élève et par le mode présentation du professeur.
 *
 * @param {Array} steps
 * @param {Object} opts
 * @param {Set}    [opts.doneIds]      stepId terminés
 * @param {number} [opts.currentIndex] étape en cours (-1 : tout est fait)
 * @param {boolean}[opts.allUnlocked]  professeur : aucun cadenas
 * @param {(i:number, statut:string)=>void} [opts.onNodeClick]
 */
export function buildWorldMap(steps, opts = {}) {
    const done = opts.doneIds || new Set();
    const map = document.createElement('div');
    map.className = 'world-map';

    const PAR_RANGEE = 3;
    for (let debut = 0; debut < steps.length; debut += PAR_RANGEE) {
        const rangee = document.createElement('div');
        const inversee = (debut / PAR_RANGEE) % 2 === 1;
        rangee.className = 'world-row' + (inversee ? ' world-row--reverse' : '');

        steps.slice(debut, debut + PAR_RANGEE).forEach((step, j) => {
            const i = debut + j;
            const isDone = done.has(step.stepId);
            const isCurrent = !opts.allUnlocked && !isDone && i === opts.currentIndex;
            const statut = opts.allUnlocked ? 'open'
                : isDone ? 'done' : (isCurrent ? 'current' : 'locked');

            const node = document.createElement('div');
            node.className = `world-node world-node--${statut}`;

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'world-node-btn';
            btn.innerHTML = isDone ? '⭐' : (statut === 'locked' ? '🔒' : String(i + 1));
            btn.title = step.title;
            btn.setAttribute('aria-label',
                `${step.title} — ${statut === 'done' ? 'terminé' : statut === 'locked' ? 'à débloquer' : 'jouer'}`);
            btn.onclick = () => { if (opts.onNodeClick) opts.onNodeClick(i, statut); };

            const label = document.createElement('span');
            label.className = 'world-node-label';
            label.textContent = step.title;

            const meta = document.createElement('span');
            meta.className = 'world-node-meta';
            meta.textContent = `${step.nbItems} q.${step.timeLimit ? ` • ${step.timeLimit}s` : ''}`;

            node.append(btn, label, meta);
            rangee.appendChild(node);
        });

        map.appendChild(rangee);
    }
    return map;
}

function statutDe(step, i, opts) {
    const done = opts.doneIds || new Set();
    if (opts.allUnlocked) return 'open';
    if (done.has(step.stepId)) return 'done';
    return i === opts.currentIndex ? 'current' : 'locked';
}

/**
 * Présentation classique : la liste verticale d'étapes détaillées, avec la
 * pastille d'état et le bouton « Jouer » sur l'étape en cours.
 */
export function buildClassicTimeline(steps, opts = {}) {
    const timeline = document.createElement('div');
    timeline.className = 'path-timeline';
    timeline.appendChild(Object.assign(document.createElement('div'), { className: 'path-timeline-line' }));

    steps.forEach((step, i) => {
        const statut = statutDe(step, i, opts);

        const row = document.createElement('div');
        row.className = 'path-timeline-step' + (statut === 'locked' ? ' path-timeline-step--locked' : '');

        const icon = document.createElement('div');
        icon.className = 'path-timeline-icon path-timeline-icon--' + (statut === 'done' ? 'done' : statut === 'current' ? 'current' : statut === 'open' ? 'current' : 'locked');
        icon.textContent = statut === 'done' ? '✓' : statut === 'locked' ? '🔒' : String(i + 1);

        const card = document.createElement('div');
        card.className = 'card card--flush' + (statut === 'current' ? ' card--current' : '');

        const title = document.createElement('div');
        title.className = 'timeline-step-title' + (statut === 'current' ? ' timeline-step-title--active' : '');
        title.textContent = step.title;
        card.appendChild(title);

        const meta = document.createElement('div');
        meta.className = 'timeline-step-meta';
        meta.textContent = `${step.nbItems} questions${step.timeLimit ? ` • ${step.timeLimit}s` : ''}`;
        card.appendChild(meta);

        if (statut === 'done') {
            const st = document.createElement('div');
            st.className = 'timeline-step-status';
            st.textContent = 'Terminé !';
            card.appendChild(st);
        } else if (statut === 'current' || statut === 'open') {
            const btn = document.createElement('button');
            btn.className = 'btn-toggle' + (statut === 'current' ? ' active' : ' btn-toggle--sm');
            btn.textContent = 'Jouer';
            btn.onclick = () => { if (opts.onNodeClick) opts.onNodeClick(i, statut); };
            card.appendChild(btn);
        } else {
            const st = document.createElement('div');
            st.className = 'timeline-step-status';
            st.textContent = 'À débloquer';
            card.appendChild(st);
        }

        row.append(icon, card);
        timeline.appendChild(row);
    });
    return timeline;
}

/**
 * Chemin d'étapes vertical façon Duolingo : une colonne de pastilles rondes
 * qui serpente doucement de gauche à droite, le titre posé à côté.
 */
export function buildDuoPath(steps, opts = {}) {
    const chemin = document.createElement('div');
    chemin.className = 'duo-path';

    steps.forEach((step, i) => {
        const statut = statutDe(step, i, opts);
        const node = document.createElement('div');
        node.className = `duo-node world-node--${statut}`;
        // Serpentin : décalage sinusoïdal autour de l'axe.
        const offset = Math.round(Math.sin(i * 1.1) * 70);
        node.style.transform = `translateX(${offset}px)`;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'world-node-btn';
        btn.innerHTML = statut === 'done' ? '⭐' : (statut === 'locked' ? '🔒' : String(i + 1));
        btn.title = step.title;
        btn.setAttribute('aria-label',
            `${step.title} — ${statut === 'done' ? 'terminé' : statut === 'locked' ? 'à débloquer' : 'jouer'}`);
        btn.onclick = () => { if (opts.onNodeClick) opts.onNodeClick(i, statut); };

        const label = document.createElement('div');
        label.className = 'duo-node-label';
        label.innerHTML = `<span class="world-node-label">${escapeHtml(step.title)}</span>
            <span class="world-node-meta">${step.nbItems} q.${step.timeLimit ? ` • ${step.timeLimit}s` : ''}</span>`;

        node.append(btn, label);
        chemin.appendChild(node);
    });
    return chemin;
}

// --- Parcours du professeur (sur ce poste) ----------------------------------
// Les parcours construits dans l'éditeur de CE poste sont directement jouables
// par l'élève, sans passer par un code : en classe, c'est le même appareil.

function teacherPathsSection() {
    const paths = state.teacherPaths || [];
    if (!paths.length) return null;

    const box = document.createElement('section');
    box.className = 'path-section';
    box.innerHTML = `
        <h2 class="path-section-title">Parcours du professeur</h2>
        <p class="path-section-sub">Préparés sur ce poste — choisis-en un et lance-toi !</p>`;

    const list = document.createElement('div');
    list.className = 'teacher-path-list';

    paths.slice(0, 8).forEach(p => {
        const normalized = normalizePath(p.data, p.name);
        if (!normalized.steps.length) return;
        const policy = resolvePolicy(normalized.policy);

        const card = document.createElement('div');
        card.className = 'card teacher-path-card';
        card.innerHTML = `
            <div class="teacher-path-info">
                <div class="teacher-path-name">${escapeHtml(p.name)}</div>
                <div class="teacher-path-sub">${normalized.steps.length} activité${normalized.steps.length > 1 ? 's' : ''}
                    • ${isEvaluation(policy) ? 'Évaluation' : 'Entraînement'}</div>
            </div>`;

        const btn = document.createElement('button');
        btn.className = 'btn-toggle active';
        btn.textContent = 'Jouer';
        btn.onclick = async () => {
            const { Runner } = await import('../core/runner.js');
            new Runner({ path: normalized, deviceMode: 'none' }).start();
        };
        card.appendChild(btn);
        list.appendChild(card);
    });

    if (!list.children.length) return null;
    box.appendChild(list);
    return box;
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
