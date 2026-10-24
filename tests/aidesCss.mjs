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
    // UN SÉLECTEUR GROUPÉ N'EST PAS LE SÉLECTEUR DEMANDÉ.
    //
    // `indexOf('.btn-toggle {')` trouvait `.rang-btn, .btn-toggle { min-height:
    // 44px; }` — une règle de média, à deux cent trente lignes de celle qu'on
    // cherchait — et rendait son corps. L'épreuve lisait alors UNE SEULE
    // déclaration et concluait sur la bonne règle. Elle est tombée du bon côté
    // ce jour-là ; elle serait restée verte si la règle attrapée avait contenu
    // par hasard ce qu'on vérifiait.
    //
    // On exige donc que le sélecteur COMMENCE un sélecteur : ce qui le précède,
    // espaces mis à part, est la fin d'une règle, l'ouverture d'un bloc, la fin
    // d'un commentaire, ou le début du fichier.
    const groupes = [];
    let debut = -1;
    // On balaie toutes les apparitions du sélecteur suivi d'un « { » (la règle
    // qu'on cherche) ou d'une virgule (un groupe dont il fait partie).
    const motif = new RegExp(
        selecteur.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*[{,]', 'g');
    motif.lastIndex = depuis;
    for (let m = motif.exec(source); m; m = motif.exec(source)) {
        const avant = source.slice(0, m.index).replace(/\s+$/, '');
        const commence = avant === '' || /[};{]$/.test(avant) || avant.endsWith('*/');
        // La règle cherchée : le sélecteur commence un sélecteur ET le ferme.
        if (commence && m[0].endsWith('{')) { debut = m.index; break; }
        // Sinon c'est un groupe : on le retient pour le dire, en entier, de la
        // première lettre du sélecteur jusqu'à l'accolade.
        const debutDuGroupe = commence ? m.index
            : Math.max(source.lastIndexOf('}', m.index), source.lastIndexOf('{', m.index),
                source.lastIndexOf('*/', m.index)) + 1;
        const accolade = source.indexOf('{', m.index);
        if (accolade !== -1) {
            groupes.push(source.slice(debutDuGroupe, accolade).trim().replace(/\s+/g, ' '));
        }
    }
    assert.notEqual(debut, -1,
        `la règle « ${selecteur} » a disparu de ${o.ou || 'la feuille'}`
        + (o.apres ? ` (cherchée après « ${o.apres} »)` : '') + '.'
        + (groupes.length
            ? ` Elle n'existe qu'en groupe : « ${groupes[0].trim()} ». Demander`
              + ' ce sélecteur-là en entier, ou écrire la règle à part.'
            : ''));
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
