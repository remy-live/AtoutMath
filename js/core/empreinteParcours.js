// CE QUI DIT QU'UN PARCOURS A CHANGÉ.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// Un fichier pour une fonction de six lignes, et c'est justifié : `empreinte`
// vivait dans `parcoursServeur.js`, qui importe `state.js`, qui a besoin d'un
// `document`. On ne pouvait donc pas l'éprouver sans navigateur — et c'est
// précisément une erreur de cette fonction qui a coûté le plus cher.
//
// CE QU'ELLE A COÛTÉ. On empreintait TROIS CHAMPS CHOISIS : `name`, `steps`,
// `policy`. C'était juste pour un parcours NU, et aveugle pour tous les
// autres. Or `state.teacherPaths` contient DEUX FORMES selon l'origine :
//
//   · une ENVELOPPE { id, name, data, folderId, timestamp } — c'est ce que
//     `state.saveTeacherPath()` range, donc tout ce qui sort de « Préparer » ;
//   · le PARCOURS NU, avec ses `steps` au premier niveau.
//
// Sur une enveloppe, `parcours.steps` vaut `undefined` : l'empreinte se
// réduisait à `{"n":"Séance du lundi"}` et ne bougeait PLUS JAMAIS. Le premier
// envoi remplissait le cache ; tous les suivants étaient sautés en répondant
// « monté » — donc en MENTANT, puisque rien ne partait.
//
// Un parcours retouché dans Préparer ne remontait donc pas au serveur. La
// mention « Enregistré 14:32 » disait vrai — il l'est, SUR CE POSTE — et les
// élèves continuaient de recevoir la version d'avant. Aucune erreur, aucun
// avis, et le seul moyen de s'en apercevoir était de regarder ce que les
// élèves reçoivent. MESURÉ par `tools/seanceDepuisLaClasse.mjs` : entrée
// locale à 3 étapes, serveur à 2, écran affichant « ajouté à la séance ».
//
// LA RÈGLE QU'ON EN TIRE : trois champs choisis à la main sont un PARI sur la
// forme de l'objet. L'objet entier n'en est pas un.

/**
 * L'empreinte du CONTENU d'un parcours, quelle que soit sa forme.
 *
 * `timestamp` est écarté : il change à chaque enregistrement sans rien dire du
 * contenu, et l'inclure ferait remonter au serveur un parcours qu'on vient
 * seulement de rouvrir — trente parcours renvoyés pour rien à chaque
 * ouverture de la bibliothèque.
 *
 * UN PARCOURS ILLISIBLE REND UNE VALEUR QUI NE RESSEMBLE À RIEN, donc il
 * remonte. C'est le bon côté sur lequel se tromper : mieux vaut un envoi de
 * trop qu'un parcours qui reste à terre sans que personne ne le sache.
 *
 * @param {object} parcours une enveloppe de bibliothèque ou un parcours nu
 * @returns {string}
 */
export function empreinte(parcours) {
    try {
        const { timestamp, ...contenu } = parcours || {};
        return JSON.stringify(contenu);
    } catch (e) {
        return String(Math.random());
    }
}
