// LIRE UNE RÈGLE CSS DANS UNE ÉPREUVE — écrit une fois, et non quatre.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// POURQUOI CE FICHIER EXISTE. Trois épreuves portaient déjà ces deux fonctions,
// recopiées — `colonnesDuTableau`, `sceneDuSprint`, `cadreDuTableauCroise` — et
// toutes les trois portaient AUSSI le commentaire qui explique le même piège :
//
//   > « /\bwidth\s*:/ NE SUFFIT PAS, et l'épreuve s'est fait prendre : le tiret
//   >   de "max-width" compte comme une frontière de mot, si bien que le motif
//   >   trouvait `width` dans `max-width` et restait vert sur le défaut même
//   >   qu'il devait attraper. »
//
// Une leçon écrite trois fois est une leçon qu'on réapprendra une quatrième.
// Elle est écrite ICI, et les épreuves l'importent.
//
// ── CE QUE CES DEUX FONCTIONS GARDENT, ET QUI N'EST PAS ÉVIDENT ─────────────
//
// `corpsDeLaRegle` refuse de chercher une déclaration N'IMPORTE OÙ dans la
// feuille : `width: 100%` s'y trouve quarante fois, et une épreuve qui la
// verrait ailleurs resterait verte en ne gardant plus rien. On découpe donc le
// corps de LA règle visée, et l'on ne lit que lui.
//
// `declare` exige que la propriété COMMENCE une déclaration, pour la raison
// citée plus haut : avec `\b`, chercher `height` trouve `min-height` et
// `max-height`.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/** Le contenu d'une feuille — ou d'un jeu, qui porte la sienne en gabarit. */
export function lireFeuille(chemin) {
    return readFileSync(chemin, 'utf8');
}

/**
 * Le corps d'une règle, désignée par son sélecteur exact.
 *
 * @param {string} source    la feuille, déjà lue
 * @param {string} selecteur le sélecteur, tel qu'il est écrit avant le « { »
 * @param {object} [o]
 * @param {string} [o.apres] ne chercher qu'APRÈS cette chaîne. Indispensable
 *        quand le même sélecteur revient dans plusieurs blocs `@container` :
 *        le Duel fixe la hauteur de son pavé à trois endroits, et c'est le
 *        DERNIER qui gagne. Sans cela, l'épreuve lirait le premier et jugerait
 *        une règle que le navigateur n'applique pas.
 * @param {string} [o.ou]    le nom du fichier, pour que l'échec se lise
 */
export function corpsDeLaRegle(source, selecteur, o = {}) {
    const depuis = o.apres ? source.indexOf(o.apres) : 0;
    assert.notEqual(depuis, -1,
        `« ${o.apres} » a disparu de ${o.ou || 'la feuille'} : l'épreuve ne sait `
        + 'plus où chercher.');
    const debut = source.indexOf(selecteur + ' {', depuis);
    assert.notEqual(debut, -1,
        `la règle « ${selecteur} » a disparu de ${o.ou || 'la feuille'}`
        + (o.apres ? ` (cherchée après « ${o.apres} »)` : '') + '.');
    const ouvre = source.indexOf('{', debut);
    return source.slice(ouvre + 1, source.indexOf('}', ouvre));
}

/**
 * La règle déclare-t-elle CETTE propriété, et avec cette valeur ?
 *
 * La valeur est un fragment d'expression régulière : `declare(c, 'height', '44px')`
 * ou `declare(c, 'gap', '2px')`. Omise, on ne demande que la présence.
 */
export function declare(corps, propriete, valeur = '') {
    return new RegExp(`(?:^|[;{\\s])${propriete}\\s*:\\s*${valeur}`).test(corps);
}

/** La valeur déclarée pour cette propriété, ou null. Même garde-fou. */
export function valeurDe(corps, propriete) {
    const m = corps.match(
        new RegExp(`(?:^|[;{\\s])${propriete}\\s*:\\s*([^;}]+)`));
    return m ? m[1].trim() : null;
}
