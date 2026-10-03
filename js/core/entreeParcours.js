// UNE ENTRÉE DE BIBLIOTHÈQUE A DEUX FORMES, ET LA MAUVAISE PERD SES ÉTAPES EN
// SILENCE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// `state.teacherPaths` ne contient pas toujours la même chose :
//
//   · `state.saveTeacherPath()` y range une ENVELOPPE — { id, name, data,
//     folderId, timestamp } — dont `data` est le parcours. C'est ce que fait
//     « Préparer » quand on enregistre ;
//   · un parcours NU, avec ses `steps` au premier niveau, s'y promène aussi.
//
// LES DEUX FORMES COHABITENT DEPUIS LONGTEMPS, et le serveur le sait déjà :
// `assignmentsFor` lit `brut['data'] ?? brut` avec le commentaire « les étapes
// sont un niveau plus bas que là où on les cherche naturellement ».
//
// CE PETIT MODULE EXISTE PARCE QUE LA MÊME LIGNE A ÉTÉ ÉCRITE DEUX FOIS, ET
// QU'ELLE A MANQUÉ UNE TROISIÈME.
//
//   · dans `js/ui/espaceClasses.js`, pour ajouter un exercice à une séance. Mon
//     premier essai y écrivait `[...(entree.steps || []), nouvelle]` sur une
//     enveloppe : `steps` y vaut `undefined`, donc la séance passait de DEUX
//     étapes à UNE. Ajouter un exercice effaçait la séance ;
//   · dans `js/core/parcoursServeur.js`, au rapatriement, où elle manquait.
//     `normalizePath(enveloppe, nom)` rend ZÉRO étape — MESURÉ, contre deux sur
//     le parcours — parce qu'il cherche `raw.data` comme un TABLEAU d'étapes,
//     le vieux format de l'explorateur, et retombe sur `raw.steps`, absent à ce
//     niveau. Un parcours redescendait du serveur avec son nom, son
//     identifiant, et rien dedans.
//
// Deux fois la même ligne, deux fois le même oubli : elle n'a plus qu'un seul
// endroit.

/**
 * LE PARCOURS QUI EST DANS CETTE ENTRÉE, quelle que soit sa forme.
 *
 * @param {object} entree  une enveloppe de bibliothèque, ou un parcours
 * @returns {object|null}  le parcours, celui qui porte les `steps`
 */
export function cheminDeLEntree(entree) {
    if (!entree || typeof entree !== 'object') return null;
    const enveloppe = entree.data && typeof entree.data === 'object' && !Array.isArray(entree.data);
    return enveloppe ? entree.data : entree;
}

/**
 * COMBIEN D'ÉTAPES PORTE CETTE ENTRÉE — zéro si l'on n'en trouve pas.
 *
 * C'est le compte qui trahit une enveloppe mal déballée : un parcours arrivé
 * avec son nom et zéro étape a l'air d'être arrivé.
 */
export function combienDEtapes(entree) {
    const chemin = cheminDeLEntree(entree);
    return ((chemin && chemin.steps) || []).length;
}
