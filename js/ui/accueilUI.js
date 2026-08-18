// LA MODALE D'ARRIVÉE, ET LE BILAN DE FIN D'EXERCICE.
//
// Deux écrans, une seule règle : on ne parle à l'élève que quand on a quelque
// chose à lui dire. Une modale par connexion au maximum, un bilan seulement
// quand l'exercice a été assez long pour vouloir dire quelque chose.
//
// Toutes les décisions vivent dans core/accueil.js, testé sans navigateur :
// ce fichier ne fait que peindre ce qu'on lui dit de peindre. Un seuil se
// règle donc à un endroit, et il est couvert par des tests — ce qui compte,
// parce qu'un seuil mal réglé ici se paie en découragement.

import { state } from '../core/state.js';
import { estRevisable, getExerciseById } from '../data/catalog.js';
import { messageDArrivee, bilanExercice } from '../core/accueil.js';
import { startErrorReview } from '../core/remediation.js';
import { robotSvg, ampouleSvg } from './icones.js';

const CLE_VISITE = 'mathbox-derniere-visite';

function lireVisite() {
    try {
        const v = localStorage.getItem(CLE_VISITE);
        return v ? Number(v) : null;
    } catch (e) { return null; }
}

function ecrireVisite(t) {
    try { localStorage.setItem(CLE_VISITE, String(t)); } catch (e) { /* mode privé */ }
}

function assurerModale() {
    let m = document.getElementById('accueil-modal');
    if (m) return m;
    m = document.createElement('div');
    m.id = 'accueil-modal';
    m.className = 'modal-overlay modal-overlay--top';
    m.innerHTML = `
        <div class="glass-panel modal-panel ac-panel">
            <div class="ac-robot">${robotSvg(46)}</div>
            <h3 class="modal-title" id="ac-titre"></h3>
            <p class="ac-texte" id="ac-texte"></p>
            <ul class="ac-liste" id="ac-liste"></ul>
            <p class="ac-texte" id="ac-suite"></p>
            <p class="ac-conseil" id="ac-conseil"></p>
            <div class="modal-actions-center">
                <button type="button" class="btn-toggle glass-btn modal-btn-flex modal-btn-flex--neutral" id="ac-plus-tard">Plus tard</button>
                <button type="button" class="btn-toggle glass-btn primary active modal-btn-flex" id="ac-go"></button>
            </div>
        </div>`;
    document.body.appendChild(m);
    return m;
}

/**
 * Le message d'arrivée, une fois par jour au plus.
 *
 * Appelé au démarrage. Ne s'affiche pas si un exercice est déjà ouvert (lien
 * de parcours partagé) : on ne coupe pas quelqu'un qui vient pour travailler.
 */
export function initAccueil() {
    const layer = document.getElementById('game-layer');
    if (layer && layer.style.display === 'flex') return;

    const maintenant = Date.now();
    const derniereVisite = lireVisite();
    const message = messageDArrivee({
        maintenant, derniereVisite,
        // Le carnet, débarrassé des jeux qui n'y écrivent rien d'utile.
        erreurs: (state.errorHistory || []).filter(e => estRevisable(e.exoId)),
        tentatives: (state.attemptHistory || []).map(a => ({ ts: a.timestamp || a.ts, correct: !!a.correct }))
    });
    // La visite est notée MÊME sans message : sinon, un élève sans erreur
    // reverrait la question « rien à réviser » à chaque rechargement.
    ecrireVisite(maintenant);
    if (!message) return;

    const m = assurerModale();
    m.querySelector('#ac-titre').textContent = message.titre;
    m.querySelector('#ac-texte').textContent = message.texte;

    // Les titres qui ont résisté, un par ligne. `textContent` sur chaque
    // élément : un titre d'exercice n'a pas à traverser l'analyseur HTML.
    const listeEl = m.querySelector('#ac-liste');
    listeEl.innerHTML = '';
    (message.liste || []).forEach(nom => {
        const li = document.createElement('li');
        li.textContent = nom;
        listeEl.appendChild(li);
    });
    m.querySelector('#ac-suite').textContent = message.suite || '';
    const conseilEl = m.querySelector('#ac-conseil');
    conseilEl.innerHTML = message.conseil ? `${ampouleSvg(19, 'ac-ampoule')}<span>${message.conseil}</span>` : '';

    const go = m.querySelector('#ac-go');
    const tard = m.querySelector('#ac-plus-tard');
    const fermer = () => { m.style.display = 'none'; };

    if (message.revision) {
        go.textContent = `Réviser (${message.revision.questions} question${message.revision.questions > 1 ? 's' : ''})`;
        go.onclick = () => { fermer(); startErrorReview(message.revision.questions); };
        tard.textContent = 'Plus tard';
    } else {
        go.textContent = 'C\'est parti';
        go.onclick = fermer;
        tard.style.display = 'none';
    }
    tard.onclick = fermer;
    m.style.display = 'flex';
}

// --- Le bilan de fin d'exercice ------------------------------------------------

function assurerBilan() {
    let m = document.getElementById('bilan-modal');
    if (m) return m;
    m = document.createElement('div');
    m.id = 'bilan-modal';
    m.className = 'modal-overlay modal-overlay--top';
    m.innerHTML = `
        <div class="glass-panel modal-panel ac-panel">
            <div class="ac-robot" id="bi-emoji">${robotSvg(46)}</div>
            <h3 class="modal-title" id="bi-titre"></h3>
            <p class="ac-texte" id="bi-texte"></p>
            <div class="ac-lecon" id="bi-lecon"></div>
            <div class="modal-actions-center">
                <button type="button" class="btn-toggle glass-btn modal-btn-flex modal-btn-flex--neutral" id="bi-fermer">Fermer</button>
                <button type="button" class="btn-toggle glass-btn primary active modal-btn-flex" id="bi-refaire">Recommencer avec le robot</button>
            </div>
        </div>`;
    document.body.appendChild(m);
    return m;
}

/**
 * Branche le bilan sur la fin des exercices.
 *
 * L'ItemSession annonce sa fin par un événement du document : le noyau n'a pas
 * à connaître cette interface, et l'aperçu du catalogue — qui termine lui aussi
 * des sessions — n'ouvre évidemment aucune modale (il n'a pas de réponses).
 */
export function initBilanExercice() {
    document.addEventListener('session_finished', (ev) => {
        const d = ev.detail || {};
        const exo = d.exerciseId ? getExerciseById(d.exerciseId) : null;
        const bilan = bilanExercice({
            repondues: d.answered || 0,
            justes: d.correct || 0,
            titre: exo ? exo.title : (d.exerciseTitle || ''),
            lecon: d.lecon || ''
        });
        if (bilan.verdict === 'court') return;

        const m = assurerBilan();
        // Le robot de l'application, pas un emoji : c'est LUI qui parle à
        // l'élève partout ailleurs, et un autre dessin ferait un autre
        // personnage au moment le plus personnel.
        m.querySelector('#bi-emoji').innerHTML =
            bilan.verdict === 'reussi' ? '🎉' : robotSvg(46);
        m.querySelector('#bi-titre').textContent = bilan.titre;
        m.querySelector('#bi-texte').textContent = bilan.texte;
        const lecon = m.querySelector('#bi-lecon');
        lecon.textContent = bilan.lecon || '';
        lecon.style.display = bilan.lecon ? '' : 'none';

        const refaire = m.querySelector('#bi-refaire');
        // On ne repropose l'exercice QUE s'il a été loupé. Après une réussite,
        // « recommencer » serait un contresens : c'est d'un cran de plus que
        // l'élève a besoin, pas du même exercice.
        refaire.style.display = bilan.relancer && exo ? '' : 'none';
        refaire.onclick = () => {
            m.style.display = 'none';
            import('../games/engine.js').then(g => g.openGameLayer(exo, true));
        };
        m.querySelector('#bi-fermer').onclick = () => { m.style.display = 'none'; };
        m.style.display = 'flex';
    });
}
