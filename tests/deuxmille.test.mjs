// 2048 : la règle de fusion, exactement celle de l'original.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    grilleVide, tasserLigne, glisser, apparaitre, peutJouer, plusGrande,
    conseiller, direConseil
} from '../js/core/deuxmille.js';
import { makeRng } from '../js/core/ids.js';

test('une tuile ne fusionne qu\'une fois par coup', () => {
    // [2,2,4] doit donner [4,4], jamais [8] : le 4 issu de la fusion ne
    // refusionne pas dans le même coup. C'est LA règle qui fait le jeu.
    assert.deepEqual(tasserLigne([2, 2, 4, 0]).ligne, [4, 4, 0, 0]);
    assert.deepEqual(tasserLigne([2, 2, 2, 2]).ligne, [4, 4, 0, 0]);
    assert.deepEqual(tasserLigne([4, 4, 8, 8]).ligne, [8, 16, 0, 0]);
});

test('les fusions se font du côté du mouvement', () => {
    // [4,4,4] vers la gauche : ce sont les DEUX PREMIERS qui fusionnent.
    assert.deepEqual(tasserLigne([4, 4, 4, 0]).ligne, [8, 4, 0, 0]);
});

test('le tassement traverse les vides', () => {
    assert.deepEqual(tasserLigne([2, 0, 0, 2]).ligne, [4, 0, 0, 0]);
    assert.deepEqual(tasserLigne([0, 2, 0, 4]).ligne, [2, 4, 0, 0]);
});

test('les points d\'un coup sont la somme des tuiles créées', () => {
    assert.equal(tasserLigne([2, 2, 4, 4]).points, 4 + 8);
    assert.equal(tasserLigne([2, 4, 2, 4]).points, 0);
});

test('les quatre directions lisent la même règle', () => {
    //  2 0 0 2         4 . . .   (gauche)
    //  0 4 4 0    →    8 . . .
    const g = [
        2, 0, 0, 2,
        0, 4, 4, 0,
        0, 0, 0, 0,
        2, 0, 0, 2
    ];
    assert.deepEqual(glisser(g, 'gauche').grille, [
        4, 0, 0, 0,
        8, 0, 0, 0,
        0, 0, 0, 0,
        4, 0, 0, 0
    ]);
    assert.deepEqual(glisser(g, 'droite').grille, [
        0, 0, 0, 4,
        0, 0, 0, 8,
        0, 0, 0, 0,
        0, 0, 0, 4
    ]);
    assert.deepEqual(glisser(g, 'haut').grille, [
        4, 4, 4, 4,
        0, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0
    ]);
    assert.deepEqual(glisser(g, 'bas').grille, [
        0, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0,
        4, 4, 4, 4
    ]);
});

test('un coup qui ne change rien n\'est pas un coup', () => {
    const g = [
        2, 4, 8, 16,
        0, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0
    ];
    assert.equal(glisser(g, 'gauche'), null, 'tout est déjà tassé à gauche');
    assert.equal(glisser(g, 'haut'), null, 'tout est déjà en haut');
    // La ligne est PLEINE et sans fusion : à droite non plus, rien ne bouge.
    assert.equal(glisser(g, 'droite'), null);
    assert.ok(glisser(g, 'bas'), 'mais vers le bas, ça bouge');
});

test('la tuile nouvelle apparaît sur une case vide, jamais ailleurs', () => {
    const rng = makeRng('app');
    let g = grilleVide(4);
    for (let k = 0; k < 16; k++) {
        const avant = g.slice();
        const res = apparaitre(g, rng);
        g = res.grille;
        assert.equal(avant[res.case], 0, 'elle a poussé sur une case pleine');
        assert.ok(g[res.case] === 2 || g[res.case] === 4);
    }
    // Grille pleine : plus rien n'apparaît.
    assert.equal(apparaitre(g, rng).case, -1);
});

test('la fin de partie se voit : plus de vide, plus de voisines égales', () => {
    const bloquee = [
        2, 4, 2, 4,
        4, 2, 4, 2,
        2, 4, 2, 4,
        4, 2, 4, 2
    ];
    assert.ok(!peutJouer(bloquee));
    const encore = bloquee.slice(); encore[5] = 4;
    assert.ok(peutJouer(encore), 'deux 4 côte à côte : on peut encore jouer');
    assert.equal(plusGrande(bloquee), 4);
});

test('le conseil trouve la fusion et sait la raconter', () => {
    const g = [
        8, 0, 0, 8,
        2, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0
    ];
    const c = conseiller(g);
    assert.ok(c.fusions.some(f => f.valeur === 16), 'les deux 8 doivent fusionner');
    const dit = direConseil(c);
    assert.match(dit, /8 \+ 8 = 16/);
    assert.match(dit, /gauche|droite/);
    assert.match(direConseil(null), /finie/);
});

test('une partie jouée au conseil avance sans jamais casser la règle', () => {
    const rng = makeRng('partie');
    let g = apparaitre(apparaitre(grilleVide(4), rng).grille, rng).grille;
    let score = 0;
    for (let coup = 0; coup < 220 && peutJouer(g); coup++) {
        const c = conseiller(g);
        assert.ok(c, 'peutJouer dit oui : il doit exister un coup');
        const res = glisser(g, c.direction);
        score += res.points;
        // Chaque valeur reste une puissance de 2.
        res.grille.forEach(v => assert.ok(v === 0 || Number.isInteger(Math.log2(v))));
        g = apparaitre(res.grille, rng).grille;
    }
    assert.ok(score > 100, 'le conseil doit au moins savoir marquer des points');
    assert.ok(plusGrande(g) >= 64, `plus grande tuile : ${plusGrande(g)}`);
});
