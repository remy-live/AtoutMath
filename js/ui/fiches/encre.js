// L'ENCRE DES FICHES — un module FEUILLE, qui n'importe rien.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// Ces cinq couleurs sont les seules de tout le papier : le noir des traits, le
// gris des graduations et des numéros, le bleu pâle d'une donnée imprimée, le
// gris clair d'une grille, et l'encre du texte. Elles étaient en tête de
// `socle.js` ; elles n'y pouvaient plus rester, et c'est une histoire d'ORDRE
// D'ÉVALUATION.
//
// ── CE QUE CE FICHIER EMPÊCHE, ET CE QUE ÇA A COÛTÉ ────────────────────────
//
// Les modules de la fiche forment un CERCLE, et c'est ancien :
//
//     socle.js → ficheRendu.js → printSheet.js → <un rendu> → socle.js
//
// Un cercle d'imports ne casse rien par lui-même. Ce qui casse, c'est de LIRE
// une valeur du cercle pendant qu'il se referme. Quand l'application charge
// `printSheet.js`, `socle.js` a fini de s'évaluer avant qu'aucun rendu ne
// commence : un rendu peut écrire `const TRAIT = ENCRE.trait` en tête de
// module, et ça passe. Quand l'entrée est un rendu — ce qu'une sonde fait
// naturellement, et ce qu'un futur module fera un jour —, `socle.js` est
// encore EN COURS au moment où le rendu lit `ENCRE`, qui est alors dans sa
// zone morte. Le module jette :
//
//     ReferenceError: Cannot access 'ENCRE' before initialization
//
// MESURÉ : une sonde qui importait `fiches/axes.js` sans passer par
// `printSheet.js` faisait tomber TOUT le sous-système d'impression sur ce
// message — qui désigne un fichier sans rapport avec ce qu'on mesurait. Vingt
// minutes avant de comprendre que le sujet était l'ordre des imports.
//
// ── POURQUOI UNE FEUILLE RÈGLE LA QUESTION ─────────────────────────────────
//
// Un module qui n'importe RIEN est évalué AVANT tous ceux qui le demandent, en
// toute circonstance : il ne peut pas être « en cours » quand on le lit.
// `socle.js` ré-exporte ces noms, donc aucun appel ne change — et un lien de
// ré-export pointe sur la variable de CE fichier-ci, déjà prête, pas sur une
// copie que `socle.js` aurait à initialiser.
//
// RÈGLE, pour le prochain rendu de fiche : tout ce qu'un module de `fiches/`
// peut vouloir lire EN TÊTE DE MODULE vit ici. Une épreuve le garde —
// `tests/encreFeuille.test.mjs`.

/** Les cinq encres du papier. Aucune autre couleur n'est écrite sur une fiche. */
export const ENCRE = {
    trait: [26, 32, 44],        // le noir des traits qu'on dessine
    grille: [176, 182, 197],    // le gris des bordures de grille
    donnee: [238, 240, 250],    // le fond très pâle d'une case déjà remplie
    texte: [45, 55, 72],        // l'encre des phrases
    gris: [110, 118, 132]       // les numéros, les graduations, le second plan
};

/**
 * LES DEUX ENCRES QU'ON ÉCRIT LE PLUS, NOMMÉES UNE SEULE FOIS.
 *
 * Chaque rendu de fiche commençait par `const TRAIT = ENCRE.trait;` — le même
 * alias, recopié d'un fichier à l'autre. Au deuxième, `tests/fichesDecoupe`
 * a rougi : « TRAIT : axes.js, elementsGeo.js ». Sa règle est bonne et elle
 * vaut même pour un alias d'une ligne — deux déclarations du même nom, c'est
 * un lecteur qui cherche `TRAIT` et qui en trouve deux.
 */
export const TRAIT = ENCRE.trait;
export const GRIS = ENCRE.gris;
