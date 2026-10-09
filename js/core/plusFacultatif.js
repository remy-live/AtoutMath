// UN « + » QUI N'APPREND RIEN NE DOIT RIEN DÉPARTAGER.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, sur « Enlever les parenthèses » :
//
//   « une élève, au −(3 − 5) + (−2 + 9), elle a mis −(−2) + (+7) et le logiciel
//     a dit qu'elle avait faux car elle aurait dû mettre −(−2) + (7). Mais elle
//     a bon en fait. »
//
// ELLE AVAIT BON, ET LE LOGICIEL AVAIT DÉJÀ LA RÈGLE QUI LUI DONNAIT RAISON.
// `opposeParentheses.js` l'écrivait noir sur blanc depuis des mois : « ON
// ACCEPTE "4 − 5" ET "+4 − 5" […] Le + de tête est une trace utile au tableau,
// pas une condition de justesse. » Seulement elle était écrite POUR LE DÉBUT DE
// LA CHAÎNE — `startsWith('+')` d'un côté, `replace(/^\+/, '')` de l'autre — et
// le « + » de son élève était DANS une parenthèse. La règle était juste ; sa
// portée était trop petite d'un caractère.
//
// ── OÙ UN « + » NE VEUT RIEN DIRE, ET POURQUOI C'EST EXACTEMENT LÀ ──────────
//
// Un « + » est tantôt un OPÉRATEUR — « 2 + 7 », il ajoute — tantôt un SIGNE —
// « (+7) », il ne fait que redire que le nombre est positif. On ne peut enlever
// que le second, et on le reconnaît à sa place : il est en tête de ce qu'il
// qualifie. Deux positions dans tout ce que ce logiciel fait écrire :
//
//     +4 − 5          au début de l'expression
//     −(−2) + (+7)    juste après une parenthèse ouvrante
//
// ON NE TOUCHE À RIEN D'AUTRE. « 2 + +7 » n'est pas accepté : ce n'est pas une
// écriture qu'un élève produit en raisonnant juste, et l'accepter ne corrigerait
// aucune injustice. Et l'on n'enlève JAMAIS un « − », évidemment : −(+2) et
// −(2) ne sont pas la même chose, c'est tout le chapitre.
//
// ── POURQUOI UN FICHIER POUR TROIS LIGNES ───────────────────────────────────
//
// PARCE QUE DEUX JUGES SE PARTAGENT CET EXERCICE, et qu'ils ne le savaient pas :
//
//   · la LIGNE FINALE passe par `reponseJuste` (opposeParentheses.js) ;
//   · les LIGNES INTERMÉDIAIRES — celle que son élève remplissait — passent par
//     `jugerEtape` → `memeReponse` → `normaliser` (reductionPuissances.js).
//
// Chacun avait sa copie de la règle, et corriger l'une aurait laissé l'autre
// refuser la même réponse. C'est le troisième défaut de cette forme en deux
// jours — la corbeille des parcours, la carte du monde, et maintenant celui-ci :
// **une correction posée sur un seul des chemins qui mènent au même endroit ne
// ferme rien.** La règle vit donc ici, une fois, et `tests/plusFacultatif.test.mjs`
// garde le fait que les deux juges l'appellent au lieu de la recopier.

/**
 * ENLEVER LES « + » QUI NE SONT QUE DES SIGNES.
 *
 * On tolère les espaces autour pour que la fonction soit juste quel que soit le
 * moment où on l'appelle : avant ou après que l'appelant ait retiré les blancs.
 *
 * @param {string} s  une écriture déjà ramenée à un seul signe moins, ou non
 * @returns {string}  la même écriture, sans ses « + » de tête
 */
export function sansPlusFacultatif(s) {
    return String(s == null ? '' : s).replace(/(^|\()\s*\+\s*/g, '$1');
}
