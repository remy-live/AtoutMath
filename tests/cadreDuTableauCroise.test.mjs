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
import { readFileSync } from 'node:fs';

const SOURCE = 'js/games/tableauCroise.js';
const source = readFileSync(SOURCE, 'utf8');

/** Le corps de la règle `.tc-wrap`, dans la feuille que le jeu injecte. */
function corpsDuCadre() {
    const i = source.indexOf('.tc-wrap {');
    assert.notEqual(i, -1, `la règle .tc-wrap a disparu de ${SOURCE}`);
    const ouvre = source.indexOf('{', i);
    return source.slice(ouvre + 1, source.indexOf('}', ouvre));
}

/**
 * La règle déclare-t-elle cette propriété, avec cette valeur ?
 *
 * On exige que la propriété COMMENCE une déclaration : chercher `height`
 * trouverait `min-height` et `max-height`, le tiret comptant comme une
 * frontière de mot. Le piège a déjà coûté une épreuve verte qui ne gardait
 * rien, le même jour.
 */
function declare(corps, propriete, valeur = '') {
    return new RegExp(`(?:^|[;{\\s])${propriete}\\s*:\\s*${valeur}`).test(corps);
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
