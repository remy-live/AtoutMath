// L'ÉCRAN D'ARRIVÉE DE L'ÉLÈVE — le dessin.
//
// Rémy : « l'écran d'accueil d'AtoutMath […] pour pas faire peur avec tout ce
// qu'on peut y lire, que ce soit simple. Par exemple Duolingo est rassurant. »
//
// TOUTES LES DÉCISIONS VIVENT DANS `core/aujourdhui.js`, testé sans navigateur.
// Ce fichier ne fait que peindre, et brancher trois boutons.
//
// CE QU'ON A ENLEVÉ, ET OÙ C'EST PARTI. Rien n'est supprimé — le catalogue, les
// filtres, l'arbre des domaines, le carnet et la carte du parcours existent
// tous encore, et se rejoignent en un geste. Ils ne sont simplement plus la
// PREMIÈRE chose qu'on voit :
//
//   · les deux rangées de filtres et la grille de soixante cartes attendent
//     derrière « Explorer tous les exercices » ;
//   · le carnet d'erreurs et la carte du parcours deviennent deux tuiles
//     nommées, avec leur compte ;
//   · la modale d'arrivée disparaît. Ce qu'elle disait — la révision proposée,
//     le conseil du jour — est maintenant DANS la page : on le lit si on veut,
//     on ne le congédie pas pour arriver au travail.
//
// UNE FOIS LE CATALOGUE OUVERT, IL LE RESTE. L'élève qui a cliqué « Explorer »
// a dit ce qu'il voulait ; le lui refermer au retour de chaque exercice serait
// lui redemander vingt fois par séance.

import { state } from '../core/state.js';
import {
    exercices, estRevisable, getExerciseById, filterByStatus
} from '../data/catalog.js';
import { accessOf } from '../core/gameAccess.js';
import { planDuJour } from '../core/aujourdhui.js';
import { startErrorReview } from '../core/remediation.js';
import { openGameLayer } from '../games/engine.js';
import { setTopNavMode } from './navigation.js';

const CLE_PREMIERE = 'mathbox-derniere-visite';
const CLE_CATALOGUE = 'mathbox-catalogue-ouvert';

const lire = (cle) => { try { return localStorage.getItem(cle); } catch (e) { return null; } };
const ecrire = (cle, v) => { try { localStorage.setItem(cle, v); } catch (e) { /* privé */ } };

/**
 * TROIS EXERCICES À PROPOSER, ET ILS NE SONT PAS TIRÉS AU HASARD.
 *
 * On veut quelque chose que l'élève PEUT faire tout de suite : un exercice
 * verrouillé proposé en grand sur l'écran d'accueil serait une porte fermée
 * peinte en bleu. On garde donc ce qui est ouvert, et l'on préfère son niveau
 * quand il en a choisi un.
 */
function suggestions() {
    const ouverts = filterByStatus(exercices, { only: 'valide', teacher: false })
        .filter(e => accessOf(e).status === 'libre');
    const niveaux = state.selectedNiveaux || [];
    const monNiveau = niveaux.length
        ? ouverts.filter(e => (e.tags.niveaux || []).some(n => niveaux.includes(n)))
        : [];
    const source = monNiveau.length ? monNiveau : ouverts;
    // LE MÊME TOUTE LA JOURNÉE. Un exercice proposé qui change à chaque
    // rechargement se lit comme un tirage au sort, pas comme un conseil.
    const jour = Math.floor(Date.now() / 86400000);
    const debut = source.length ? jour % source.length : 0;
    return source.slice(debut).concat(source.slice(0, debut));
}

/** Le parcours assigné, sous la forme que le noyau attend. */
function parcoursAssigne() {
    const a = state.studentPath;
    if (!a || !Array.isArray(a.steps)) return null;
    return {
        name: a.name,
        completed: a.completed || [],
        steps: a.steps.map(s => ({
            stepId: s.stepId,
            bonus: !!s.bonus,
            titre: (getExerciseById(s.exerciseId) || {}).title || ''
        }))
    };
}

function anneauHtml(faites, total) {
    const part = total ? Math.max(0, Math.min(1, faites / total)) : 0;
    // Un `conic-gradient` plutôt qu'un SVG : c'est un anneau de progression, il
    // n'a ni trait ni forme à animer, et une seule propriété le décrit.
    return `<div class="auj-anneau" style="--auj-part:${(part * 100).toFixed(1)}%">
        <i>${faites}<span>/${total}</span></i></div>`;
}

function echapper(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Le bloc lui-même, posé une fois pour toutes en tête du corps principal. */
function boite() {
    let b = document.getElementById('accueil-aujourdhui');
    if (b) return b;
    const hote = document.getElementById('main-wrapper');
    if (!hote) return null;
    b = document.createElement('section');
    b.id = 'accueil-aujourdhui';
    b.className = 'auj';
    hote.insertBefore(b, hote.firstChild);
    return b;
}

export function catalogueOuvert() {
    return lire(CLE_CATALOGUE) === '1';
}

function poserCatalogue(ouvert) {
    const hote = document.getElementById('main-wrapper');
    if (hote) hote.classList.toggle('auj-catalogue-ouvert', !!ouvert);
    ecrire(CLE_CATALOGUE, ouvert ? '1' : '0');
}

/**
 * Dessine — et rebranche — l'écran d'arrivée.
 *
 * Appelé au démarrage et à chaque retour au catalogue : les comptes (erreurs
 * ouvertes, étapes faites) ont pu changer pendant l'exercice, et un accueil qui
 * annonce « 3 à revoir » alors qu'on vient d'en corriger deux ment.
 */
export function rendreAujourdhui() {
    if (state.isTeacherMode) return;
    const b = boite();
    if (!b) return;

    const plan = planDuJour({
        maintenant: Date.now(),
        premiere: lire(CLE_PREMIERE) === null,
        parcours: parcoursAssigne(),
        erreurs: (state.errorHistory || []).filter(e => estRevisable(e.exoId)),
        tentatives: (state.attemptHistory || [])
            .map(a => ({ ts: a.timestamp || a.ts, correct: !!a.correct })),
        suggestions: suggestions(),
        nbExercices: filterByStatus(exercices, { only: 'valide', teacher: false }).length
    });

    const a = plan.action;
    b.innerHTML = `
        <h1 class="auj-salut">${echapper(plan.salut)}</h1>
        <p class="auj-phrase">${echapper(plan.phrase)}</p>
        ${a ? `<div class="auj-carte auj-carte--${a.genre}">
            ${a.total ? anneauHtml(a.faites, a.total) : '<div class="auj-embleme" aria-hidden="true">'
        + (a.genre === 'revision' ? '📓' : '✨') + '</div>'}
            <div class="auj-dit">
                <b>${echapper(a.titre)}</b>
                <span>${echapper(a.sous)}</span>
            </div>
            <button type="button" class="auj-go" data-go>${echapper(a.bouton)}</button>
        </div>` : ''}
        <div class="auj-tuiles">
            ${plan.raccourcis.map(r => `<button type="button" class="auj-tuile" data-raccourci="${r.id}">
                <span class="auj-tuile-ico" aria-hidden="true">${r.icone}</span>
                <span class="auj-tuile-dit"><b>${echapper(r.titre)}</b>
                <em>${echapper(r.sous)}</em></span>
            </button>`).join('')}
        </div>
        <button type="button" class="auj-explorer" data-explorer>
            <span data-explorer-mot>Explorer tous les exercices</span>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
                 stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="m6 9 6 6 6-6"/></svg>
        </button>`;

    const go = b.querySelector('[data-go]');
    if (go && a) go.onclick = () => lancer(a);
    b.querySelectorAll('[data-raccourci]').forEach(t => {
        t.onclick = () => allerA(t.dataset.raccourci);
    });
    const explorer = b.querySelector('[data-explorer]');
    if (explorer) explorer.onclick = () => basculerCatalogue();

    poserCatalogue(catalogueOuvert());
    majMotExplorer();
}

function majMotExplorer() {
    const mot = document.querySelector('[data-explorer-mot]');
    const bouton = document.querySelector('[data-explorer]');
    if (!mot || !bouton) return;
    const ouvert = catalogueOuvert();
    mot.textContent = ouvert ? 'Masquer le catalogue' : 'Explorer tous les exercices';
    bouton.classList.toggle('auj-explorer--ouvert', ouvert);
}

function basculerCatalogue() {
    const ouvrir = !catalogueOuvert();
    poserCatalogue(ouvrir);
    majMotExplorer();
    if (ouvrir) {
        const cible = document.getElementById('filter-bar');
        if (cible && cible.scrollIntoView) cible.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function lancer(a) {
    if (a.genre === 'parcours') return allerA('parcours');
    if (a.genre === 'revision') return startErrorReview(a.questions);
    const exo = getExerciseById(a.exoId);
    if (exo) openGameLayer(exo, false);
}

function allerA(quoi) {
    if (quoi === 'parcours') {
        const btn = document.getElementById('top-btn-path');
        if (btn) return btn.click();
        return setTopNavMode('path');
    }
    if (quoi === 'erreurs') {
        const btn = document.getElementById('btn-open-errors');
        if (btn) btn.click();
        return;
    }
    if (!catalogueOuvert()) basculerCatalogue();
}
