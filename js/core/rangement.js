// COMMENT LE CATALOGUE EST RANGÉ DANS LA COLONNE DE GAUCHE.
//
// Deux rangements, et un même arbre pour les afficher :
//
//   PAR DOMAINE   Numérique › Calcul Mental. C'est le rangement d'origine,
//                 celui de la recherche : il dit de quoi parle l'exercice.
//   PAR CHAPITRE  6ème › Fractions. C'est la progression du professeur : elle
//                 dit QUAND on s'en sert. « Je choisis mon chapitre, et bam
//                 mes exercices. »
//
// UN EXERCICE PEUT ÊTRE À DEUX ENDROITS À LA FOIS, et c'est tout l'intérêt du
// classement par chapitre : le Théorème de Pythagore travaille les racines
// carrées et les triangles rectangles. L'arbre reçoit donc une LISTE de
// chemins par exercice, et non un chemin unique — un exercice rangé dans deux
// chapitres apparaît dans les deux dossiers, sans être dupliqué en mémoire.
//
// Ce module ne connaît ni le DOM ni l'arbre : il répond à une seule question,
// « où va cet exercice ? », et il est testable sans navigateur.

import { chapitresDe } from './chapitres.js';

const CLE = 'mathbox-rangement';

export const RANGEMENTS = {
    DOMAINE: 'domaine',
    CHAPITRE: 'chapitre'
};

/** Le dossier des exercices qu'aucun chapitre ne réclame. */
export const HORS_CHAPITRE = 'Hors chapitre';

export function modeRangement() {
    try {
        const lu = localStorage.getItem(CLE);
        return lu === RANGEMENTS.CHAPITRE ? RANGEMENTS.CHAPITRE : RANGEMENTS.DOMAINE;
    } catch (e) {
        return RANGEMENTS.DOMAINE;
    }
}

export function setModeRangement(mode) {
    try { localStorage.setItem(CLE, mode); } catch (e) { /* mode privé */ }
    document.dispatchEvent(new CustomEvent('rangement_updated', { detail: { mode } }));
}

/**
 * Les chemins d'un exercice, dans le rangement demandé.
 *
 * @param {Object} exo
 * @param {string} [mode] - par défaut, le rangement en vigueur
 * @param {Object} [classement] - passé explicitement pour les tests
 * @returns {string[][]} un ou plusieurs chemins, jamais vide
 */
export function cheminsDe(exo, mode = modeRangement(), classement = undefined) {
    if (!exo || !exo.tags) return [[]];
    if (mode !== RANGEMENTS.CHAPITRE) return [exo.tags.chemin || []];

    const niveaux = exo.tags.niveaux || [];
    const siens = classement === undefined ? chapitresDe(exo) : chapitresDe(exo, classement);

    const chemins = [];
    siens.forEach(chap => {
        // Un chapitre de 5ᵉ ne s'affiche pas sous un exercice qu'on n'a pas
        // étiqueté 5ᵉ : le classement propose large, l'étiquette de niveau
        // tranche.
        if (niveaux.includes(chap.niveau)) chemins.push([chap.niveau, chap.nom]);
    });

    if (chemins.length) return dedoublonner(chemins);

    // Rien ne le réclame : il se range sous chacun de ses niveaux, dans un
    // dossier qui se voit. C'est ainsi qu'on repère ce qui reste à classer —
    // un exercice invisible ne se corrige jamais.
    if (niveaux.length) return niveaux.map(n => [n, HORS_CHAPITRE]);
    return [[HORS_CHAPITRE]];
}

function dedoublonner(chemins) {
    const vus = new Set();
    return chemins.filter(ch => {
        const cle = ch.join(' > ');
        if (vus.has(cle)) return false;
        vus.add(cle);
        return true;
    });
}

/** L'exercice appartient-il au dossier `path` (ou à l'un de ses sous-dossiers) ? */
export function sousLeDossier(exo, path, mode, classement) {
    return cheminsDe(exo, mode, classement)
        .some(ch => path.every((v, i) => ch[i] === v));
}
