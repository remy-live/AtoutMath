// LES HIÉROGLYPHES SONT UN FICHIER RECOPIÉ, donc un fichier qui peut se
// tronquer. Ces vérifications ne jugent pas le dessin — cela, seul l'œil le
// peut — mais elles attrapent ce qu'un copier-coller casse en silence : un
// rang manquant, un tracé vide, un glyphe qui sort de sa case.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { egyptianSvg } from '../js/core/figures.js';
import { EGYPTE } from '../js/core/generators/numeration.js';

test('les sept rangs égyptiens ont tous un tracé', () => {
    for (const { value, nom } of EGYPTE) {
        const svg = egyptianSvg([{ value, n: 1 }]);
        assert.ok(svg.includes('<path'), `${nom} (${value}) n'a aucun tracé`);
        // Un glyphe non dessiné donnerait « undefined » dans le SVG — et une
        // figure vide passe inaperçue jusqu'à ce qu'un élève la regarde.
        assert.ok(!svg.includes('undefined'), `${nom} (${value}) est absent de la table`);
    }
});

test('chaque glyphe tient dans sa case de 24 × 32', () => {
    for (const { value, nom } of EGYPTE) {
        const svg = egyptianSvg([{ value, n: 1 }]);
        const m = /translate\((-?[\d.]+) (-?[\d.]+)\) scale\(([\d.]+)\)/.exec(svg);
        assert.ok(m, `${nom} : pas de transformation de cadrage`);
        // Les coordonnées du dessin d'origine sont autour de 10 500 ; après
        // mise à l'échelle et recentrage, le glyphe doit retomber dans [0, 32].
        const [, tx, ty, k] = m.map(Number);
        const xs = [...svg.matchAll(/[ML] (\d+),(\d+)/g)].map(a => Number(a[1]) * k + tx);
        const ys = [...svg.matchAll(/[ML] (\d+),(\d+)/g)].map(a => Number(a[2]) * k + ty);
        assert.ok(Math.min(...xs) >= -0.5 && Math.max(...xs) <= 24.5,
            `${nom} déborde en largeur : ${Math.min(...xs).toFixed(1)} → ${Math.max(...xs).toFixed(1)}`);
        assert.ok(Math.min(...ys) >= -0.5 && Math.max(...ys) <= 32.5,
            `${nom} déborde en hauteur : ${Math.min(...ys).toFixed(1)} → ${Math.max(...ys).toFixed(1)}`);
    }
});

test('les symboles s\'écrivent à la suite, pas un rang par ligne', () => {
    // SIX GLYPHES SUR UNE LIGNE. Un rang par ligne donnait au nombre l'allure
    // d'un tableau de numération — la seule chose que ce système n'a pas.
    const svg = egyptianSvg([{ value: 100, n: 2 }, { value: 10, n: 3 }, { value: 1, n: 1 }]);
    assert.match(svg, /viewBox="0 0 [\d.]+ 68"/, 'une seule ligne de 44 px, deux marges de 12');
    assert.equal((svg.match(/class="egy-glyph"/g) || []).length, 6);
    // Les six sont sur la MÊME ordonnée.
    const ys = [...svg.matchAll(/translate\(([-\d.]+), ([-\d.]+)\)/g)].map(m => Number(m[2]));
    assert.deepEqual([...new Set(ys)], [12]);
});

test('au-delà de neuf symboles, on passe à la ligne comme un texte', () => {
    const svg = egyptianSvg([{ value: 1, n: 12 }]);
    assert.equal((svg.match(/class="egy-glyph"/g) || []).length, 12);
    const ys = [...new Set([...svg.matchAll(/translate\(([-\d.]+), ([-\d.]+)\)/g)]
        .map(m => Number(m[2])))];
    assert.equal(ys.length, 2, 'douze bâtons tiennent sur deux lignes');
});

test('un blanc plus large sépare deux valeurs différentes', () => {
    const svg = egyptianSvg([{ value: 10, n: 2 }, { value: 1, n: 2 }]);
    const xs = [...svg.matchAll(/translate\(([-\d.]+), [-\d.]+\)/g)].map(m => Number(m[1]));
    const dansLeGroupe = xs[1] - xs[0];
    const entreGroupes = xs[2] - xs[1];
    assert.ok(entreGroupes > dansLeGroupe,
        `le groupement doit rester visible : ${dansLeGroupe} puis ${entreGroupes}`);
});
