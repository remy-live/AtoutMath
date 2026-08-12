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
import { TAGS } from '../data/tags.js';
import { hydratePath, normalizePath } from '../core/path.js';
import { resolvePolicy, isEvaluation, describePolicy } from '../core/policy.js';
import { journal } from '../core/journal.js';
import { computeRuns } from '../core/projections.js';
import { gradeRun } from '../core/grading.js';
import { buildRecommendedPreview, startRecommendedSession, startSkillSession } from '../core/remediation.js';
import { formatDuration } from './reportUI.js';
import { showModal } from './modal.js';

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

/** Retient le choix d'habillage, sans rien redessiner. */
function memoriserStyle(id) {
    try { localStorage.setItem(STYLE_KEY, id); } catch (e) { /* mode privé */ }
}

function setPathStyle(id) {
    memoriserStyle(id);
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

// --- Habillage commun des parcours illustrés --------------------------------
// La carte des mondes et le chemin d'étapes partagent la même pastille : un
// palet rond à liseré épais, avec le PICTOGRAMME de la notion travaillée
// plutôt qu'un numéro anonyme — on reconnaît « les angles » ou « l'heure »
// d'un coup d'œil, comme sur les leçons d'une application de langues.

const PICTOS = {
    [TAGS.SOUS_DOMAINE.CALCUL_MENTAL]: '🧮',
    [TAGS.SOUS_DOMAINE.NUMERATION]: '🔢',
    [TAGS.SOUS_DOMAINE.FRACTIONS]: '🍕',
    [TAGS.SOUS_DOMAINE.DECIMAUX]: '💰',
    [TAGS.SOUS_DOMAINE.REPERAGE]: '🗺️',
    [TAGS.SOUS_DOMAINE.ANGLES]: '📐',
    [TAGS.SOUS_DOMAINE.PRIORITES]: '⚖️',
    [TAGS.SOUS_DOMAINE.LOGIQUE]: '🧩',
    [TAGS.SOUS_DOMAINE.PERIMETRE_AIRE]: '📏',
    [TAGS.SOUS_DOMAINE.ESPACE]: '🧊',
    [TAGS.SOUS_DOMAINE.TABLEUR]: '📊',
    [TAGS.SOUS_DOMAINE.DUREES]: '🕐',
    [TAGS.DOMAINE.NUMERIQUE]: '🔢',
    [TAGS.DOMAINE.GEOMETRIQUE]: '📐',
    [TAGS.DOMAINE.GRANDEURS]: '📏',
    [TAGS.DOMAINE.DONNEES]: '📊'
};

function pictoDe(step) {
    const chemin = (step.exercise && step.exercise.tags && step.exercise.tags.chemin) || [];
    for (let i = chemin.length - 1; i >= 0; i--) {
        if (PICTOS[chemin[i]]) return PICTOS[chemin[i]];
    }
    return '✏️';
}

/**
 * Une pastille de parcours, identique pour les deux habillages illustrés.
 * Le numéro n'est pas perdu : il passe dans une petite gommette d'angle.
 */
function creerNoeud(step, i, statut, opts) {
    const node = document.createElement('div');
    node.className = `world-node world-node--${statut}`;

    const socle = document.createElement('div');
    socle.className = 'world-node-socle';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'world-node-btn';
    btn.innerHTML = `<span class="world-node-picto">${statut === 'locked' ? '🔒' : pictoDe(step)}</span>`;
    btn.title = step.title;
    btn.setAttribute('aria-label',
        `Étape ${i + 1} : ${step.title} — ${statut === 'done' ? 'terminé' : statut === 'locked' ? 'à débloquer' : 'jouer'}`);
    btn.onclick = () => { if (opts.onNodeClick) opts.onNodeClick(i, statut); };

    const rang = document.createElement('span');
    rang.className = 'world-node-rang';
    rang.textContent = statut === 'done' ? '★' : String(i + 1);

    socle.append(btn, rang);
    node.appendChild(socle);

    // Le fanion « c'est ici » : sur une carte, l'élève doit trouver SANS
    // réfléchir l'endroit où reprendre.
    if (statut === 'current') {
        const fanion = document.createElement('span');
        fanion.className = 'world-node-ici';
        fanion.textContent = 'C\'est ici !';
        node.appendChild(fanion);
    }

    const label = document.createElement('span');
    label.className = 'world-node-label';
    label.textContent = step.title;

    const meta = document.createElement('span');
    meta.className = 'world-node-meta';
    meta.textContent = `${step.nbItems} q.${step.timeLimit ? ` • ${step.timeLimit}s` : ''}`;

    node.append(label, meta);
    return node;
}

/**
 * Le sentier qui relie les pastilles. Il était dessiné en `::before` par
 * pastille : des bouts de pointillés horizontaux qui s'arrêtaient au bout de
 * chaque rangée, sans jamais rejoindre la suivante — le chemin ne menait
 * nulle part. Il est maintenant tracé d'un seul trait, en SVG, en mesurant
 * les pastilles APRÈS leur mise en page : courbes douces d'un centre à
 * l'autre, plein et doré sur la partie déjà parcourue, pointillé devant.
 */
function tracerSentier(hote) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'path-trail');
    svg.setAttribute('aria-hidden', 'true');
    const fait = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    fait.setAttribute('class', 'path-trail-fait');
    const reste = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    reste.setAttribute('class', 'path-trail-reste');
    svg.append(reste, fait);
    hote.insertBefore(svg, hote.firstChild);

    const redessiner = () => {
        const cadre = hote.getBoundingClientRect();
        if (!cadre.width) return;
        svg.setAttribute('viewBox', `0 0 ${cadre.width} ${cadre.height}`);
        const noeuds = [...hote.querySelectorAll('.world-node')];
        const pts = noeuds.map(n => {
            const r = n.querySelector('.world-node-btn').getBoundingClientRect();
            return { x: r.left - cadre.left + r.width / 2, y: r.top - cadre.top + r.height / 2 };
        });
        // Jusqu'où le chemin est-il parcouru ? Jusqu'à la pastille en cours.
        let coupe = noeuds.findIndex(n => n.classList.contains('world-node--current'));
        if (coupe === -1) coupe = noeuds.every(n => n.classList.contains('world-node--done')) ? pts.length - 1 : 0;

        const milieu = cadre.width / 2;
        const trace = (de, a) => {
            if (a - de < 1) return '';
            let d = `M ${pts[de].x} ${pts[de].y}`;
            for (let i = de + 1; i <= a; i++) {
                const p = pts[i - 1], q = pts[i];
                if (noeuds[i].dataset.virage) {
                    // Changement de rangée : le sentier fait un virage bombé
                    // VERS L'EXTÉRIEUR, sinon il descend tout droit à travers
                    // le titre de l'étape qu'il vient de quitter.
                    const sens = p.x >= milieu ? 1 : -1;
                    const k = sens * Math.min(70, cadre.width * 0.09);
                    d += ` C ${p.x + k} ${p.y + (q.y - p.y) * 0.35},`
                        + ` ${q.x + k} ${q.y - (q.y - p.y) * 0.35}, ${q.x} ${q.y}`;
                } else {
                    // Courbe en S : on sort verticalement d'une pastille pour
                    // entrer verticalement dans la suivante.
                    const my = (p.y + q.y) / 2;
                    d += ` C ${p.x} ${my}, ${q.x} ${my}, ${q.x} ${q.y}`;
                }
            }
            return d;
        };
        fait.setAttribute('d', trace(0, coupe));
        reste.setAttribute('d', trace(coupe, pts.length - 1));
    };

    redessiner();
    // La mise en page n'est pas figée au moment de la construction (polices,
    // largeur du panneau) : on retrace à chaque changement de taille.
    if (typeof ResizeObserver === 'function') {
        const obs = new ResizeObserver(() => {
            if (!hote.isConnected) { obs.disconnect(); return; }
            redessiner();
        });
        obs.observe(hote);
    }
    requestAnimationFrame(redessiner);
}

/**
 * Carte des mondes : les étapes serpentent par rangées de trois, reliées par
 * un sentier continu, comme la carte d'un jeu de plateforme. Réutilisée par la
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
    const map = document.createElement('div');
    map.className = 'world-map';

    const PAR_RANGEE = 3;
    for (let debut = 0; debut < steps.length; debut += PAR_RANGEE) {
        const rangee = document.createElement('div');
        const inversee = (debut / PAR_RANGEE) % 2 === 1;
        rangee.className = 'world-row' + (inversee ? ' world-row--reverse' : '');

        const paquet = steps.slice(debut, debut + PAR_RANGEE);
        paquet.forEach((step, j) => {
            const i = debut + j;
            const n = creerNoeud(step, i, statutDe(step, i, opts), opts);
            if (j === 0 && debut > 0) n.dataset.virage = '1';
            rangee.appendChild(n);
        });
        // Une dernière rangée incomplète était étalée par `space-around` : ses
        // pastilles glissaient au milieu du vide, et le sentier traversait la
        // carte en diagonale pour aller les chercher. Des cales invisibles
        // gardent les colonnes alignées d'une rangée à l'autre.
        for (let c = paquet.length; c < PAR_RANGEE; c++) {
            rangee.appendChild(Object.assign(document.createElement('div'), { className: 'world-cale' }));
        }

        map.appendChild(rangee);
    }
    tracerSentier(map);
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
        const node = creerNoeud(step, i, statutDe(step, i, opts), opts);
        node.classList.add('duo-node');
        // Serpentin : décalage sinusoïdal autour de l'axe, en pourcentage de
        // la largeur disponible pour que la courbe tienne aussi sur un
        // téléphone (en pixels fixes, les pastilles sortaient du cadre).
        node.style.setProperty('--duo-decalage', `${(Math.sin(i * 1.05) * 20).toFixed(1)}%`);
        chemin.appendChild(node);
    });
    tracerSentier(chemin);
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
        btn.textContent = 'Voir le parcours';
        btn.onclick = async () => {
            // On montre la carte AVANT de lancer : « Jouer » engageait l'élève
            // pour douze étapes sans lui avoir dit lesquelles.
            if (!await apercuParcours(normalized)) return;
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

// --- L'APERÇU D'UN PARCOURS, AVANT DE S'Y ENGAGER ---------------------------
//
// Jusqu'ici, choisir un parcours — en cliquant une carte ou en saisissant le
// code du professeur — jetait l'élève directement dans la première question.
// Il découvrait le contenu de sa séance en la faisant, et n'apprenait qu'à la
// fin qu'elle comptait douze étapes.
//
// L'aperçu montre le chemin AVANT de s'y engager, dans le même habillage que
// la vue « Mon Parcours » : la carte des mondes, le chemin d'étapes ou la
// liste, au choix de l'élève. On y lit d'un coup d'œil combien d'étapes, quoi
// (les pictogrammes disent la notion), combien de questions, et s'il s'agit
// d'un entraînement ou d'une évaluation — la seule chose qu'on ne devrait
// jamais apprendre en cours de route.

/**
 * Ouvre l'aperçu illustré d'un parcours et attend la décision de l'élève.
 * @param {Object} path      parcours normalisé
 * @param {Object} [opts]
 * @param {string} [opts.titre]   titre de la fenêtre
 * @param {string} [opts.action]  texte du bouton de départ
 * @returns {Promise<boolean>} vrai si l'élève se lance
 */
export function apercuParcours(path, opts = {}) {
    const { steps } = hydratePath(path);
    if (!steps.length) return Promise.resolve(false);
    const policy = resolvePolicy(path.policy);
    const evaluation = isEvaluation(policy);

    return new Promise((resolve) => {
        const corps = document.createElement('div');
        corps.className = 'apercu-parcours';

        const tete = document.createElement('div');
        tete.className = 'apercu-tete';
        const total = steps.reduce((s, e) => s + (e.nbItems || 0), 0);
        tete.innerHTML = `
            <div>
                <div class="apercu-nom">${escapeHtml(path.name || 'Parcours')}</div>
                <div class="apercu-chiffres">${steps.length} étape${steps.length > 1 ? 's' : ''}
                    • ${total} question${total > 1 ? 's' : ''}</div>
            </div>
            <div class="apercu-genre ${evaluation ? 'apercu-genre--eval' : ''}">
                ${evaluation ? '📝 Évaluation' : '🎯 Entraînement'}</div>`;
        corps.appendChild(tete);

        const regle = document.createElement('p');
        regle.className = 'apercu-regle';
        regle.textContent = describePolicy(policy);
        corps.appendChild(regle);

        // La carte elle-même, redessinée quand l'élève change d'habillage.
        const scene = document.createElement('div');
        scene.className = 'apercu-carte';
        corps.appendChild(scene);

        const dessiner = () => {
            scene.innerHTML = '';
            // Toutes les étapes sont montrées, aucune n'est encore faite : les
            // cadenas n'apprendraient rien ici, ils feraient seulement peur.
            const o = { allUnlocked: true, currentIndex: 0, doneIds: new Set() };
            const style = getPathStyle();
            scene.appendChild(
                style === 'classique' ? buildClassicTimeline(steps, o)
                    : style === 'chemin' ? buildDuoPath(steps, o)
                        : buildWorldMap(steps, o));
        };

        const barre = document.createElement('div');
        barre.className = 'apercu-styles';
        STYLES.forEach(s => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'path-style-btn' + (s.id === getPathStyle() ? ' path-style-btn--active' : '');
            b.textContent = s.icon;
            b.title = s.label;
            b.setAttribute('aria-label', `Présentation : ${s.label}`);
            b.onclick = () => {
                memoriserStyle(s.id);
                barre.querySelectorAll('.path-style-btn').forEach(x => x.classList.remove('path-style-btn--active'));
                b.classList.add('path-style-btn--active');
                dessiner();
            };
            barre.appendChild(b);
        });
        tete.appendChild(barre);
        dessiner();

        const actions = document.createElement('div');
        actions.className = 'apercu-actions';
        const retour = document.createElement('button');
        retour.type = 'button';
        retour.className = 'btn-toggle';
        retour.textContent = 'Plus tard';
        const partir = document.createElement('button');
        partir.type = 'button';
        partir.className = 'btn-toggle active';
        partir.textContent = opts.action || (evaluation ? 'Commencer l\'évaluation' : 'C\'est parti !');
        actions.append(retour, partir);
        corps.appendChild(actions);

        let choisi = false;
        const fenetre = showModal(opts.titre || 'Ton parcours', '', {
            width: '640px',
            onClose: () => resolve(choisi)
        });
        // showModal pose l'en-tête puis le corps défilant : c'est ce dernier
        // bloc qui accueille la carte.
        fenetre.element.lastElementChild.appendChild(corps);

        retour.onclick = () => fenetre.close();
        partir.onclick = () => { choisi = true; fenetre.close(); };
    });
}

function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

document.addEventListener('studentPath_updated', renderStudentPathView);
document.addEventListener('attempts_updated', () => {
    const view = document.getElementById('view-path');
    if (view && view.style.display !== 'none') renderStudentPathView();
});
