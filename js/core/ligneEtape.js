// LE JUGE D'UNE LIGNE INTERMÉDIAIRE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, capture à l'appui, sur « Enlever les parenthèses » :
//
//     −(+3) − (−7)
//     « Réécris la ligne SANS parenthèses. Ne la calcule pas encore. »
//     il tape −3+7, bordure rouge : « il me compte faux »
//
// IL AVAIT RAISON, ET LE JUGE NE JUGEAIT RIEN. `litteralSaisie.validerEtape`
// lisait `e.verifie` — un champ que PERSONNE ne fournit dans tout le dépôt.
// Le verdict valait donc `false` à tous les coups : TOUTE ligne intermédiaire
// était refusée, y compris celle que l'activité finit par écrire elle-même au
// bout de trois essais. Mesuré : on retape la ligne que le logiciel vient de
// poser, et il la refuse. Un juge qui refuse sa propre réponse n'est pas
// sévère, il est muet.
//
// POURQUOI CE JUGE VIT DANS SON PROPRE FICHIER. Parce qu'il était INÉPROUVABLE
// là où il était : `litteralSaisie.js` touche le document dès qu'on l'importe,
// et `node --test` tombe sur « document is not defined ». Une règle qu'aucune
// épreuve ne peut atteindre est une règle qui se casse en silence — c'est très
// exactement ce qui s'est passé. Ici, elle s'éprouve en deux lignes.
//
// CE QU'IL JUGE, ET AVEC QUOI. `montrer` EST la ligne attendue : l'en-tête de
// `litteralSaisie.js` le dit — « ce qu'on écrit en entier sur la ligne : c'est
// ce que l'élève tape, et ce qu'on lui montre s'il sèche ». On la compare avec
// `memeReponse`, le même juge que la ligne finale : espaces ignorés, trait
// d'union accepté pour le signe moins, « + » de tête facultatif. C'est la
// réponse de Rémy à la question posée en son temps — « 4 − 5 » et « +4 − 5 »
// valent l'un comme l'autre.
//
// `verifie` RESTE PRIORITAIRE, pour le jour où une étape aura plusieurs
// écritures justes qu'une comparaison de chaînes ne peut pas reconnaître : une
// factorisation, par exemple, où (x − 3)(x + 3) et (x + 3)(x − 3) sont tous
// deux bons.

import { memeReponse } from './reductionPuissances.js';

/**
 * Cette ligne intermédiaire est-elle juste ?
 *
 * @param {{verifie?:Function, montrer?:string}} etape
 * @param {string} texte - ce que l'élève a écrit
 * @returns {boolean|{juste:boolean, pourquoi?:string}} — le juge de l'étape
 *   peut rendre un objet ; la comparaison par défaut rend un booléen.
 */
export function jugerEtape(etape, texte) {
    if (!etape) return false;
    if (etape.verifie) return etape.verifie(texte);
    // UNE ÉTAPE SANS LIGNE ATTENDUE NE PEUT PAS ÊTRE JUGÉE, et l'on ne fait
    // pas semblant : dire « juste » à tout serait pire que dire « faux ».
    if (etape.montrer === undefined || etape.montrer === null) return false;
    if (!String(texte || '').trim()) return false;
    return memeReponse(texte, String(etape.montrer));
}
