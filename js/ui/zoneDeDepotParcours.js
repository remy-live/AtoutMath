// OÙ L'ON PEUT LÂCHER UN EXERCICE — une règle, un seul endroit.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, capture de l'atelier à l'appui :
//
//   « dans la zone de création de parcours, la zone ou on dragge pourrait aller
//     jusqu'en bas mais le cadre autour des exercices restent tel quel, est ce
//     clair, c'est juste que sous le cadre qui a les exercices du parcours, ca
//     ne réagit pas quand on glisse un exercice »
//
// MESURÉ (tools/tmp/zoneDeDepot.mjs, écran de 1440 × 900, deux étapes au
// parcours) : le cadre s'arrête à 585 px, la colonne descend à 900. Soit
// **315 px** de colonne où l'on peut amener un exercice — et où
// `elementFromPoint` ne trouve AUCUN écouteur de dépôt. Le professeur lâche
// dans ce vide, rien ne tombe, et rien ne lui dit pourquoi : le geste a l'air
// cassé alors qu'il a simplement visé trois centimètres trop bas.
//
// ── CE QUE CE MODULE SÉPARE ────────────────────────────────────────────────
//
// Deux choses que le code confondait en une seule, parce qu'elles étaient le
// même élément :
//
//   LA ZONE QUI ACCEPTE  — l'enveloppe repliable, qui remplit la colonne.
//   LE CADRE QUI S'ALLUME — le cadre en pointillés autour des exercices, que
//                           Rémy veut « tel quel ».
//
// C'est pour cela qu'elles vivent ici et non dans `builder.js` : le glisser à
// la SOURIS (`builder.js`) et le glisser AU DOIGT (`navigation.js`) posent tous
// deux la question « suis-je sur la zone ? », et une règle écrite deux fois
// finit toujours par ne plus se comporter pareil. Le dépôt sur une tablette
// cesserait de marcher le jour où l'on corrige celui de la souris, et l'on ne
// le verrait qu'en classe.

/**
 * LA ZONE QUI ACCEPTE LE DÉPÔT : l'enveloppe du parcours, qui descend jusqu'au
 * bas de la colonne (voir `#path-collapsible-wrapper` dans `css/layout.css`).
 *
 * LE REPLI EST LE CADRE, et non l'inverse : si l'enveloppe manque — une page
 * plus ancienne, un essai qui ne monte qu'une partie de l'atelier —, on rend le
 * cadre, qui acceptait déjà. Mieux vaut la zone d'avant que plus de zone du
 * tout.
 */
export function laZoneDeDepot() {
    return document.getElementById('path-collapsible-wrapper')
        || document.getElementById('path-container');
}

/** Le cadre en pointillés : celui qui s'allume, celui qu'on ne touche pas. */
export function leCadreDuParcours() {
    return document.getElementById('path-container');
}

/**
 * Le point est-il dans la zone ?
 *
 * ON MESURE SUR LA ZONE ET NON SUR LE CADRE — c'est toute la correction. Et
 * l'on répond `false` quand la zone n'est pas là : un dépôt sur une zone
 * absente ajouterait l'exercice à un parcours que le professeur ne voit pas.
 *
 * @param {number} x
 * @param {number} y
 * @returns {boolean}
 */
export function dansLaZoneDeDepot(x, y) {
    const zone = laZoneDeDepot();
    if (!zone) return false;
    const r = zone.getBoundingClientRect();
    // Une zone de hauteur nulle n'est pas une zone : c'est l'enveloppe repliée
    // du téléphone (`style.display = 'none'`), et tout point serait « dedans »
    // si l'on se contentait de comparer des bornes égales.
    if (r.height <= 0 || r.width <= 0) return false;
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}
