// LE CADRE DU TABLEAU À DOUBLE ENTRÉE NE CACHE RIEN.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, capture d'iPhone du 13 octobre : « là c'est tronqué sur téléphone ».
// Le tableau s'arrêtait au milieu de sa troisième ligne, avec une barre de
// défilement de quatre pixels au bord pour toute explication.
//
// MESURÉ, dans un plateau de 354 px : 638 px de contenu, donc 324 px cachés.
// Après : 0 px caché, et la page glisse de 324 px à la place.
//
// ── DEUX DÉCLARATIONS FAISAIENT LE DÉFAUT ─────────────────────────────────
//
// · `height: 100%` imposait au cadre la hauteur du plateau, quel que soit ce
//   qu'il contient ;
// · `min-height: 0` autorisait le surplus à rétrécir jusqu'à zéro. Le cadre
//   est un élément flex dans une colonne : c'est le même piège que la scène du
//   contre-la-montre, corrigé le même jour.
//
// `overflow-y: auto` ne les rattrapait pas : il rend le contenu ATTEIGNABLE,
// pas VISIBLE. Une ligne de tableau coupée en deux ne se lit pas « il y a la
// suite plus bas », elle se lit « c'est cassé ».
//
// ── CE QUE CETTE ÉPREUVE NE GARDE PAS, ET POURQUOI ────────────────────────
//
// Le débordement en LARGEUR est déjà traité, et par une décision écrite et
// mesurée du jeu lui-même : `[data-table] { max-width: 100%; overflow-x: auto }`,
// posée parce que « la colonne coupée est celle des TOTAUX — celle que
// l'exercice demande de compléter ». Une sonde écrite trop vite a crié sur ces
// 26 px et a failli faire écrire un correctif qui doublait celui-là. On ne
// garde donc ici que la hauteur.

import test from 'node:test';
import assert from 'node:assert/strict';
import { lireFeuille, corpsDeLaRegle as aideCorps, declare } from './aidesCss.mjs';

const SOURCE = 'js/games/tableauCroise.js';
const source = lireFeuille(SOURCE);

// LES DEUX AIDES VIVENT DANS `tests/aidesCss.mjs` : elles étaient écrites trois
// fois, et le commentaire sur le piège de `\b` avec elles.
/** Le corps de la règle `.tc-wrap`, dans la feuille que le jeu injecte. */
function corpsDuCadre() {
    return aideCorps(source, '.tc-wrap', { ou: SOURCE });
}

test('LE CADRE DU TABLEAU CROISÉ NE S\'IMPOSE PAS LA HAUTEUR DU PLATEAU', () => {
    const cadre = corpsDuCadre();
    assert.ok(!declare(cadre, 'height', '100%'),
        'le cadre du tableau à double entrée reprend `height: 100%`.\n'
        + 'Il se fige alors à la hauteur du plateau et CACHE ce qui dépasse —\n'
        + 'mesuré : 638 px de contenu dans 354 px, soit 324 px invisibles, et\n'
        + 'une ligne de tableau coupée en deux (Rémy : « là c\'est tronqué »).\n'
        + `      ${cadre.trim().replace(/\s+/g, ' ').slice(0, 110)}`);
});

test('ET IL NE S\'AUTORISE PAS À RÉTRÉCIR SOUS SON CONTENU', () => {
    const cadre = corpsDuCadre();
    assert.ok(!declare(cadre, 'min-height', '0'),
        'le cadre du tableau à double entrée reprend `min-height: 0`.\n'
        + 'Élément flex dans une colonne, il redescendra sous son contenu dès\n'
        + 'que le plateau sera court — le même piège que la scène du\n'
        + 'contre-la-montre.');
    assert.ok(declare(cadre, 'min-height', '100%'),
        'le cadre ne demande plus `min-height: 100%` : quand le contenu est\n'
        + 'court, il ne remplira plus le plateau et le tableau se collera en\n'
        + 'haut au lieu de rester centré.');
});

test('TOUTES LES COLONNES DE DONNÉES ONT LA MÊME LARGEUR', () => {
    // RÉMY, capture à l'appui : « le colonne lundi, mardi, mercredi n'ont pas
    // la même taille ». Mesuré en 1280 × 800 avant correction : Lundi 46 px,
    // Mardi 96 px, Mercredi 150 px — c'est le défaut par défaut d'un tableau
    // HTML, chaque colonne prenant la largeur de son contenu.
    const t = aideCorps(source, '.tc-table', { ou: 'tableauCroise.js' });
    assert.ok(declare(t, 'table-layout', 'fixed'),
        'sans table-layout: fixed, « Mercredi » reste deux fois plus large que « Lundi »');

    // ET LES DEUX LARGEURS SONT ÉCRITES. table-layout: fixed déplace la
    // décision sur la PREMIÈRE rangée : ce que les cellules du corps
    // contiennent ne compte plus. Sans la largeur des intitulés, « Pains au
    // chocolat » (mesuré à 211 px) se retrouverait dans une colonne large de
    // trois caractères.
    const cellules = aideCorps(source, '.tc-table th, .tc-table td',
        { ou: 'tableauCroise.js' });
    assert.match(cellules, /width:\s*calc\(var\(--tc-col/,
        'les colonnes de données n\'ont pas de largeur commune');
    assert.match(source, /\.tc-table \.tc-tete-ligne \{[^}]*width:\s*calc\(var\(--tc-tete/,
        'la colonne des intitulés n\'a pas de largeur : son contenu ne compte plus');

    // ET ELLES SONT CALCULÉES SUR LE MOT LE PLUS LONG. Les en-têtes viennent
    // de l'énoncé — des jours, des parfums, des mois —, donc aucune largeur
    // écrite à la main ne tiendrait : « Lun. » et « Septembre » ne demandent
    // pas la même chose. Mesuré sur quatre tirages
    // (tools/colonnesDuTableauCroise.mjs) : 111, 122, 111 et 111 px, jamais un
    // en-tête coupé ni passé à la ligne.
    assert.match(source, /--tc-col: \$\{larg\}ch; --tc-tete: \$\{largTete\}ch/,
        'les deux largeurs ne partent plus dans le tableau');
    assert.match(source, /const larg = long\(\[\.\.\.t\.colonnes, 'Total'\]/,
        'la largeur des colonnes ne se calcule plus sur leurs en-têtes');
});

test('LE TABLEAU GARDE SON DÉFILEMENT HORIZONTAL', () => {
    // Celle-ci ne garde pas mon correctif mais la décision du jeu, prise avant
    // et mesurée : sans elle, la colonne des TOTAUX sort de l'écran, et c'est
    // celle que l'exercice demande de compléter. Une épreuve qui garde la
    // hauteur sans garder la largeur laisserait revenir l'autre moitié.
    assert.match(source, /\[data-table\]\s*\{[^}]*overflow-x:\s*auto/,
        '`[data-table]` ne défile plus en largeur : au pire tirage mesuré, le\n'
        + 'tableau fait 361 px dans un cadre de 320, et la colonne perdue est\n'
        + 'celle des totaux.');
});
