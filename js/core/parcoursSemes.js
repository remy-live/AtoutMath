// LES PARCOURS QUE LE LOGICIEL SE DONNE À LUI-MÊME, ET QUI NE SONT PAS DU
// TRAVAIL DE PROFESSEUR.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// Deux parcours apparaissent tout seuls dans la bibliothèque, sur CHAQUE
// machine, au premier démarrage (voir `generateSampleData` dans `js/app.js`) :
//
//   · « Parcours découverte » — cinq étapes variées, pour avoir quelque chose
//     à ouvrir avant d'avoir rien préparé ;
//   · « Tout sur papier (N exercices) » — RECALCULÉ à chaque démarrage sur le
//     catalogue du jour, parce qu'un exercice imprimable ajouté après coup
//     doit s'y trouver.
//
// POURQUOI UN MODULE POUR DEUX NOMS. Le jour où la bibliothèque a commencé à
// descendre vraiment du serveur, ces deux-là sont devenus un problème : chaque
// machine les sème avec un IDENTIFIANT NEUF (`path_` + l'horloge), les monte au
// serveur, et les reçoit ensuite depuis les autres machines. MESURÉ sur deux
// postes du même compte : cinq lignes au serveur pour trois parcours, dont deux
// paires de jumeaux.
//
// ILS NE SONT PAS DU TRAVAIL À METTRE À L'ABRI. C'est la différence qui décide :
// un parcours de Rémy n'existe qu'une fois et doit survivre à son ordinateur ;
// ceux-ci se refabriquent à l'identique partout, et « Tout sur papier » est
// même plus juste refabriqué que rapatrié — rapatrié, il porterait le catalogue
// de l'autre machine.
//
// ON LES RECONNAÎT DONC AU NOM, et c'est assumé : leur nom est ce que le
// logiciel écrit lui-même, à un seul endroit. Un professeur qui appellerait
// VRAIMENT sa séance « Parcours découverte » la verrait rester sur sa machine —
// le prix est connu, et il est petit à côté d'une bibliothèque qui double à
// chaque poste.

/** Le nom exact du parcours de démonstration. */
export const NOM_DECOUVERTE = 'Parcours découverte';

/**
 * « Tout sur papier » porte son compte dans son nom — « Tout sur papier (168
 * exercices) » — qui change avec le catalogue. On reconnaît donc le début.
 */
export const DEBUT_PAPIER = 'Tout sur papier';

/**
 * CE PARCOURS EST-IL SEMÉ PAR LE LOGICIEL ?
 *
 * @param {object|string} quoi  une entrée de bibliothèque, un parcours, ou un nom
 */
export function estUnParcoursSeme(quoi) {
    const nom = typeof quoi === 'string'
        ? quoi
        : ((quoi && (quoi.name || (quoi.data && quoi.data.name))) || '');
    if (!nom) return false;
    return nom === NOM_DECOUVERTE || nom.startsWith(DEBUT_PAPIER);
}
