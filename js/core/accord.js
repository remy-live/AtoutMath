// L'ACCORD DES MOTS QUE L'INTERFACE FABRIQUE ELLE-MÊME.
//
// Ce module existe parce que la même faute est apparue deux fois, à deux ans
// de code d'écart, et pour la même raison : un mot vient d'un réglage, le
// programme y colle un « s », et personne ne relit la phrase obtenue.
//
//   · l'en-tête d'une séance annonçait « 0 / 4 tableaus » ;
//   · le panneau de réglages titrait « Les barreaus travaillés », « Les
//     niveaus travaillés », et — accord cette fois — « Les figures
//     travaillés ».
//
// Ce sont des phrases que lisent un professeur de mathématiques et ses élèves
// de sixième. Une faute d'orthographe dans un logiciel scolaire décrédibilise
// tout le reste, et elle ne se voit jamais dans un test qui compare des
// identifiants.
//
// LA RÈGLE VIT DONC À UN SEUL ENDROIT. Elle était écrite dans `registry.js`,
// au milieu d'une fonction qui rend l'unité d'une activité — c'est-à-dire là
// où personne ne va la chercher quand il écrit une autre phrase.
//
// Module pur : ni DOM, ni catalogue. On lui passe des mots.

/**
 * UNE EXCEPTION AU PLURIEL EN -X, ET ELLE EST CONNUE.
 *
 * Les mots en -eau et -au prennent un X sans exception utile ici. Ceux en -eu
 * aussi, SAUF « pneu » et « bleu » — qu'on nomme, plutôt que de renoncer à la
 * règle pour deux mots qui n'apparaissent pas encore dans un réglage mais
 * pourraient y arriver (« les bleus », « les pneus » d'un problème de vélo).
 */
const EN_S = new Set(['pneu', 'bleu', 'émeu', 'lieu commun']);

/**
 * LE PLURIEL D'UN MOT FRANÇAIS ORDINAIRE.
 *
 * On ne traite que ce que l'interface fabrique : des noms communs, au
 * singulier, venus d'un réglage ou d'une déclaration d'activité. Ni adjectifs
 * ni formes composées.
 */
export function pluriel(mot) {
    const m = String(mot == null ? '' : mot).trim();
    if (!m) return '';
    // Déjà au pluriel, ou invariable : « un cas », « une croix », « un nez ».
    if (/[sxz]$/i.test(m)) return m;
    if (EN_S.has(m.toLowerCase())) return `${m}s`;
    if (/(eau|au|eu|œu)$/i.test(m)) return `${m}x`;
    // « un journal » → « des journaux ». « bal », « carnaval » et « festival »
    // font exception ; aucun n'est un mot de réglage, et on les nommera le
    // jour où l'un d'eux le deviendra.
    if (/al$/i.test(m)) return `${m.slice(0, -2)}aux`;
    return `${m}s`;
}

/**
 * LE GENRE D'UN MOT DE RÉGLAGE.
 *
 * On ne le DEVINE pas — le français ne s'y prête pas —, on le DÉCLARE. La
 * liste est courte parce que ces mots sont ceux qu'un générateur peut donner
 * à sa progression : une marche, une étape, une figure, une forme sont
 * féminines ; un palier, un niveau, un barreau masculins.
 *
 * Elle vivait dans `progression.js`, et « figure » y manquait : le panneau du
 * Chat Géomètre titrait « Les figures travaillés ».
 */
const FEMININS = new Set(['marche', 'étape', 'forme', 'figure', 'grille', 'question']);

export const feminin = (mot) => FEMININS.has(String(mot || '').trim().toLowerCase());

/** « travaillé » accordé : `accorde('travaillé', 'figure')` → « travaillée ». */
export const accorde = (participe, mot, pluriels = true) =>
    `${participe}${feminin(mot) ? 'e' : ''}${pluriels ? 's' : ''}`;
