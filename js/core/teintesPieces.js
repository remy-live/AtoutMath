// LES COULEURS DES PIÈCES D'UN PAVAGE — un module sans le moindre import.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// Elles ne portent AUCUNE information : deux pièces voisines doivent seulement
// se distinguer, et c'est le NUMÉRO qui désigne. Un élève daltonien fait donc
// l'exercice exactement comme les autres — ce qui ne serait pas le cas si l'on
// avait écrit « l'image de la pièce bleue ».
//
// On prend des teintes claires : le numéro est écrit par-dessus en noir, et il
// doit se lire. Mesuré sur le Jardin : une encre qui suit le thème devient
// illisible dès que la couleur de fond est fixe (contraste 1,11 en thème
// sombre). L'encre est donc littérale ici aussi.
//
// ── POURQUOI UN FICHIER POUR SEIZE COULEURS ──────────────────────────────
//
// RÉMY : « Pour les pavages quand c'est couleur pour le poly, mets de la
// couleur. » La feuille a donc besoin de la même palette que le jeu — et une
// seconde palette recopiée dans le rendu de fiche aurait fini par ne plus
// être la même, ce qui est précisément le défaut qu'on répare ailleurs toute
// la journée.
//
// MAIS LA FEUILLE NE PEUT PAS IMPORTER L'ACTIVITÉ. `activities/pavageImage.js`
// tire derrière lui le meneur de démonstration, le curseur, la barre d'indice
// — tout ce qui touche au `document`. Les rendus de fiche vivent dans un
// cercle d'imports déjà fragile (voir `fiches/encre.js` et
// `tests/cercleDesFiches.test.mjs`), et une seule feuille de ce genre suffit
// à faire tomber tous les tests sur « document is not defined ».
//
// D'où ce module FEUILLE au sens des graphes : il n'importe rien, donc il
// n'entraîne rien. C'est la même décision que `fiches/encre.js`, prise pour la
// même raison.

export const TEINTES = [
    '#bfdbfe', '#fecaca', '#bbf7d0', '#fde68a', '#e9d5ff', '#a5f3fc',
    '#fed7aa', '#d9f99d', '#fbcfe8', '#c7d2fe', '#99f6e4', '#fef08a',
    '#ddd6fe', '#bae6fd', '#fecdd3', '#d1fae5'
];
