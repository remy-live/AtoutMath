// PAR RAPPORT À QUOI ? — nommer, écrire et lire un élément de symétrie.
//
// Rémy : « je préférerais comme mon exercice avec des points, et on demande
// c'est symétrique par rapport à quoi ». C'est une bien meilleure question que
// « quel genre de transformation » : nommer la famille ne demande que de
// reconnaître une allure, tandis que trouver L'ÉLÉMENT — cette droite-là, ce
// point-là — demande de le CHERCHER, donc de savoir qu'il passe au milieu de
// chaque paire de points correspondants.
//
// UN ÉLÉMENT, DEUX ESPÈCES ET PAS TROIS :
//
//   { genre: 'axe',   axe: { type: 'v'|'h', a } }   une droite du quadrillage
//   { genre: 'point', centre: { x, y } }            un centre de symétrie
//
// Pas d'axe oblique ici, et c'est délibéré : son équation (y = x + 3) n'a pas
// le même statut au collège que x = 4, et l'élève de cinquième qui découvre la
// symétrie centrale n'a pas à trancher entre les deux. L'oblique reste dans
// « Tracer l'image », où il se règle d'une case.
//
// TROIS COORDONNÉES POUR UNE MÊME CHOSE, et c'est le piège de ce fichier.
//
//   · les CASES, où travaille le noyau : la case (3 ; 2), entière ;
//   · le DESSIN, décalé d'un demi-carreau, parce qu'une case a un centre ;
//   · le REPÈRE que l'élève lit, dont l'origine est en bas à gauche et dont
//     l'ordonnée MONTE — comme dans tous les repères qu'il connaît, alors que
//     les lignes du quadrillage, elles, se comptent de haut en bas.
//
// Les deux conversions vivent ici et nulle part ailleurs. Une droite écrite
// « x = 4 » par la question et lue « x = 4,5 » par la correction serait un
// exercice qui donne tort à qui a raison.

import { ecrireDemi } from './transformations.js';

/**
 * Du repère des cases à celui que l'élève lit.
 *
 * L'abscisse ne bouge pas ; l'ordonnée se retourne, parce que les lignes se
 * comptent de haut en bas et que l'ordonnée d'un repère monte.
 *
 * @param {number} hauteur - le nombre de lignes du quadrillage
 */
export function versRepere(hauteur, p) {
    return { x: p.x + 0.5, y: hauteur - (p.y + 0.5) };
}

/** La coordonnée, dans le repère de l'élève, de la droite qui porte un axe. */
export function axeDansLeRepere(hauteur, axe) {
    if (!axe) return null;
    if (axe.type === 'v') return { sens: 'x', valeur: axe.a + 0.5 };
    return { sens: 'y', valeur: hauteur - (axe.a + 0.5) };
}

/**
 * L'écriture canonique d'un élément — celle qu'on compare, jamais celle qu'on
 * montre. Elle est en coordonnées de CASE : c'est le seul repère où le noyau
 * calcule, donc le seul où deux éléments égaux s'écrivent pareil.
 */
export function cleElement(el) {
    if (!el) return '';
    if (el.genre === 'axe') return `axe:${el.axe.type}:${el.axe.a}`;
    return `point:${el.centre.x}:${el.centre.y}`;
}

export const memeElement = (a, b) => !!a && !!b && cleElement(a) === cleElement(b);

/**
 * Ce que l'élève doit ÉCRIRE : « x = 4 », « y = 7 », « (4 ; 7) ».
 *
 * Les candidats sont posés sur les lignes du quadrillage et sur ses nœuds, de
 * sorte que ces nombres tombent toujours juste. Ce n'est pas une commodité
 * d'affichage : un axe passant au milieu d'une colonne s'écrirait « x = 3,5 »,
 * et l'on aurait ajouté à l'exercice une difficulté de lecture décimale qui
 * n'a rien à voir avec la symétrie.
 */
export function ecrireElement(hauteur, el) {
    if (!el) return '';
    if (el.genre === 'axe') {
        const d = axeDansLeRepere(hauteur, el.axe);
        return `${d.sens} = ${ecrireDemi(d.valeur)}`;
    }
    const p = versRepere(hauteur, el.centre);
    return `(${ecrireDemi(p.x)} ; ${ecrireDemi(p.y)})`;
}

/** Le nom court porté par le dessin : (d₁), (d₂), O₁… */
export const INDICES = ['₁', '₂', '₃', '₄', '₅', '₆'];

export function nommerCandidat(genre, rang) {
    const i = INDICES[rang] || String(rang + 1);
    return genre === 'axe' ? `(d${i})` : `O${i}`;
}

// --- Lire ce que l'élève écrit ------------------------------------------------

const nombre = (s) => {
    const n = Number(String(s).replace(',', '.').replace(/\s/g, ''));
    return Number.isFinite(n) ? n : null;
};

/**
 * Ce que l'élève a tapé, ramené à un élément — ou `null` si ce n'en est pas un.
 *
 * ON EST LARGE SUR LA FORME, JAMAIS SUR LE FOND. « x=4 », « X = 4 »,
 * « d : x = 4 » désignent la même droite, et refuser l'une d'elles
 * n'enseignerait que la ponctuation. En revanche « 4 » tout seul ne désigne
 * rien : une droite verticale et une droite horizontale peuvent porter le même
 * nombre, et deviner laquelle serait répondre à la place de l'élève.
 *
 * @param {number} hauteur - pour revenir des coordonnées de l'élève aux cases
 * @returns {Object|null} un élément en coordonnées de CASE
 */
export function lireElement(hauteur, texte) {
    const t = String(texte ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
    if (!t) return null;

    // Un couple de coordonnées : (4 ; 7), (4;7), 4;7, 4 / 7
    const couple = t.match(/^\(?\s*(-?[\d.,]+)\s*[;/|]\s*(-?[\d.,]+)\s*\)?$/);
    if (couple) {
        const x = nombre(couple[1]), y = nombre(couple[2]);
        if (x === null || y === null) return null;
        return { genre: 'point', centre: { x: x - 0.5, y: hauteur - y - 0.5 } };
    }

    // Une équation de droite : x = 4, y=7, (d) : x = 4
    const eq = t.match(/([xy])\s*=\s*(-?[\d.,]+)$/);
    if (eq) {
        const v = nombre(eq[2]);
        if (v === null) return null;
        return eq[1] === 'x'
            ? { genre: 'axe', axe: { type: 'v', a: v - 0.5 } }
            : { genre: 'axe', axe: { type: 'h', a: hauteur - v - 0.5 } };
    }

    return null;
}

/**
 * Ce que l'élève a écrit était-il le bon élément ?
 * Rendu à part de `lireElement` pour que l'activité puisse distinguer
 * « je n'ai pas compris ce que tu as écrit » de « ce n'est pas le bon ».
 */
export function verifierEcriture(hauteur, texte, attendu) {
    const lu = lireElement(hauteur, texte);
    if (!lu) return { lisible: false, juste: false, lu: null };
    return { lisible: true, juste: memeElement(lu, attendu), lu };
}
