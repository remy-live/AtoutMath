// LES HIÉROGLYPHES SONT UN FICHIER RECOPIÉ, donc un fichier qui peut se
// tronquer. Ces vérifications ne jugent pas le dessin — cela, seul l'œil le
// peut — mais elles attrapent ce qu'un copier-coller casse en silence : un
// rang manquant, un tracé vide, un glyphe qui sort de sa case.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    egyptianSvg, egyptianSvgCadre, placerGlyphes, hauteurPlan, EGY_INTERLIGNE
} from '../js/core/figures.js';
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

test('au-delà de douze symboles, on passe à la ligne comme un texte', () => {
    // DOUZE, et non neuf : les signes avancent maintenant de la largeur du
    // dessin (24 unités sur 32) et non d'une case entière, donc douze tiennent
    // dans la place qu'en occupaient neuf. Un nombre comme 3 centaines et
    // 9 dizaines cesse ainsi de se couper en deux.
    const svg = egyptianSvg([{ value: 1, n: 15 }]);
    assert.equal((svg.match(/class="egy-glyph"/g) || []).length, 15);
    const ys = [...new Set([...svg.matchAll(/translate\(([-\d.]+), ([-\d.]+)\)/g)]
        .map(m => Number(m[2])))];
    assert.equal(ys.length, 2, 'quinze bâtons tiennent sur deux lignes');
});

test('douze symboles tiennent sur une seule ligne', () => {
    const svg = egyptianSvg([{ value: 1, n: 12 }]);
    const ys = [...new Set([...svg.matchAll(/translate\(([-\d.]+), ([-\d.]+)\)/g)]
        .map(m => Number(m[2])))];
    assert.deepEqual(ys, [12]);
});

test('un blanc plus large sépare deux valeurs différentes', () => {
    const svg = egyptianSvg([{ value: 10, n: 2 }, { value: 1, n: 2 }]);
    const xs = [...svg.matchAll(/translate\(([-\d.]+), [-\d.]+\)/g)].map(m => Number(m[1]));
    const dansLeGroupe = xs[1] - xs[0];
    const entreGroupes = xs[2] - xs[1];
    assert.ok(entreGroupes > dansLeGroupe,
        `le groupement doit rester visible : ${dansLeGroupe} puis ${entreGroupes}`);
});

// --- L'ALIGNEMENT SUR LA FICHE ----------------------------------------------
//
// Rémy : « l'exercice 7 est très mal présenté et mal aligné ». Mesuré sur la
// feuille, les hiéroglyphes d'un même exercice allaient du simple au double —
// 13,8 px pour le plus petit, 30,1 px pour le plus grand — alors qu'ils
// devraient tous être au même corps.
//
// LA CAUSE : douze pixels de marge. L'aperçu posait le SVG DE L'ÉCRAN, qui
// porte une marge, dans une boîte calculée par la géométrie du PDF, qui n'en a
// pas. Les deux cadres n'ayant ni la même taille ni les mêmes proportions,
// `preserveAspectRatio` réduisait chaque nombre d'un facteur différent selon
// sa longueur. Ces tests ferment cette porte.

test('LE SVG DE FICHE N\'A AUCUNE MARGE : son viewBox EST le plan', () => {
    for (const symboles of [
        [{ value: 1, n: 3 }],
        [{ value: 100, n: 2 }, { value: 10, n: 3 }, { value: 1, n: 1 }],
        [{ value: 1, n: 15 }]                       // deux rangées
    ]) {
        const plan = placerGlyphes(symboles);
        const svg = egyptianSvgCadre(symboles, 44);
        const vb = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
        assert.ok(vb, 'le viewBox est écrit');
        assert.ok(Math.abs(Number(vb[1]) - plan.largeur * 44) < 0.02,
            `largeur ${vb[1]} pour un plan de ${plan.largeur} cases`);
        // ET LA HAUTEUR COMPTE LES INTERLIGNES. L'aperçu les oubliait
        // (`rangs` au lieu de `hautCases`) : sur un nombre à deux rangées, le
        // dessin s'écrasait vers le haut de sa boîte et le « = » se retrouvait
        // à flotter sous un dessin qui ne le touchait pas.
        assert.ok(Math.abs(Number(vb[2]) - hauteurPlan(plan) * 44) < 0.02,
            `hauteur ${vb[2]} pour ${plan.lignes} rangée(s)`);
    }
});

test('DEUX NOMBRES DE LONGUEURS DIFFÉRENTES ONT LE MÊME CORPS', () => {
    // C'est la propriété que la feuille de Rémy n'avait pas. À taille de case
    // donnée, l'échelle des tracés ne doit dépendre QUE de la case — jamais du
    // nombre de signes, ni du nombre de rangées.
    const echelle = (symboles) => {
        const m = egyptianSvgCadre(symboles, 44).match(/scale\(([\d.]+)\)/);
        return Number(m[1]);
    };
    const court = echelle([{ value: 1, n: 2 }]);
    const long = echelle([{ value: 1, n: 9 }, { value: 10, n: 4 }]);
    const surDeuxRangees = echelle([{ value: 1, n: 15 }]);
    assert.equal(court, long);
    assert.equal(court, surDeuxRangees);
    // Et l'échelle est bien celle de la case : les tracés sont écrits dans une
    // boîte de 24 × 32.
    assert.ok(Math.abs(court - 44 / 32) < 0.001, `échelle ${court}`);
});

test('l\'interligne est écrit UNE fois, et les deux rendus le partagent', () => {
    // L'écran, l'aperçu et le PDF l'écrivaient chacun de leur côté : trois
    // copies d'un même nombre, donc trois occasions de diverger.
    const plan = placerGlyphes([{ value: 1, n: 15 }]);
    assert.equal(plan.lignes, 2);
    assert.equal(hauteurPlan(plan), 2 + EGY_INTERLIGNE);
    // Une seule rangée n'a pas d'interligne du tout.
    assert.equal(hauteurPlan(placerGlyphes([{ value: 1, n: 3 }])), 1);
});
