// UN INDICE QUI DONNE LA RÉPONSE N'EST PAS UN INDICE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// LA RÈGLE, écrite en tête de `js/data/enigmes.js` depuis le début : « L'indice
// dit la PREMIÈRE CHOSE À REGARDER. "Compte les poignées de main deux fois"
// n'est pas la réponse, c'est la méthode. »
//
// Elle vaut pour les énigmes du jour ET pour les dingbats — deux ateliers, deux
// écrans, une seule règle. Elle vit donc ici, et pas en double. Le dépôt a payé
// cinq fois la leçon inverse : une correction posée sur un seul des chemins qui
// mènent au même endroit ne ferme rien.
//
// ── DEUX PRÉCAUTIONS, ET ELLES ONT ÉTÉ PAYÉES ──────────────────────────────
//
// La première version cherchait la réponse comme simple sous-chaîne de l'indice.
// Elle a dénoncé quatre énigmes sur cent — toutes à tort :
//
//   · une réponse d'UN CHIFFRE se retrouve partout. « Les unités des puissances
//     de 7 tournent : 7, 9, 3, 1 » contient « 1 », qui est la réponse, mais
//     l'indice donne le CYCLE : il reste à compter jusqu'à la quatrième ;
//
//   · une réponse NOMBRE est presque toujours citée en route. Un indice utile
//     dit « enlève d'abord les 20 € d'écart » ; refuser tout nombre dans
//     l'indice interdirait d'expliquer quoi que ce soit.
//
// UNE MESURE QUI CRIE QUATRE FOIS POUR RIEN NE SERA PLUS LUE — et c'est ce qui
// serait arrivé : Rémy aurait vu quatre avertissements faux sur des énigmes
// qu'il avait validées, et il aurait cessé de regarder l'encart.
//
// ON NE GARDE DONC QUE LE CAS QUI COMPTE : la réponse en MOTS, écrite telle
// quelle dans l'indice, aux frontières de mot. « racine carrée » dans un indice,
// c'est la réponse donnée ; « 2 » ne l'est pas.

/** Combien de LETTRES porte une réponse — les chiffres et la ponctuation ne comptent pas. */
const lettresDe = (s) => String(s == null ? '' : s).replace(/[^\p{L}]+/gu, '').length;

/** Le seuil : en dessous, la réponse est un nombre ou une syllabe, et l'on se tait. */
const ASSEZ_DE_LETTRES = 4;

/**
 * L'indice contient-il la réponse, écrite telle quelle ?
 *
 * @param {string} indice
 * @param {string} reponse
 * @returns {boolean}  faux dès que la réponse est trop courte pour être reconnue
 */
export function indiceDonneLaReponse(indice, reponse) {
    const rep = String(reponse == null ? '' : reponse).trim();
    const ind = String(indice == null ? '' : indice).trim();
    if (!rep || !ind || lettresDe(rep) < ASSEZ_DE_LETTRES) return false;
    // AUX FRONTIÈRES DE MOT, et non n'importe où : « racine » dans l'indice d'une
    // énigme dont la réponse est « racine carrée » n'est pas la réponse — c'est
    // la moitié, donc précisément un indice.
    const nu = rep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^\\p{L}])${nu}([^\\p{L}]|$)`, 'iu').test(ind);
}
