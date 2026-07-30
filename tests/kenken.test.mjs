// Le générateur de Mathodu promet UNE solution : c'est la propriété que ces
// tests martèlent, sur beaucoup de graines et toutes les configurations,
// parce qu'un puzzle à deux solutions compte fausse une grille juste.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kenkenGenerator, compterSolutions, OPS } from '../js/core/generators/kenken.js';
import { makeRng } from '../js/core/ids.js';

const genere = (seed, params = {}) =>
    kenkenGenerator.generate(
        { chiffres: '1-4', operations: ['add', 'sub', 'mul', 'div'], difficulte: 'moyen', ...params },
        { rng: makeRng(seed) }
    );

function verifieStructure(item) {
    const { n, lo, hi, cages, solution } = item.meta;

    // Carré latin : chaque chiffre une fois par ligne et par colonne.
    for (let i = 0; i < n; i++) {
        assert.equal(new Set(solution[i]).size, n, 'ligne sans répétition');
        assert.equal(new Set(solution.map(l => l[i])).size, n, 'colonne sans répétition');
        for (const v of solution[i]) assert.ok(v >= lo && v <= hi, 'valeur dans la plage');
    }

    // Les cages couvrent la grille exactement une fois.
    const vues = new Set();
    for (const cage of cages) {
        for (const { r, c } of cage.cells) {
            const cle = `${r},${c}`;
            assert.ok(!vues.has(cle), 'case dans deux cages');
            vues.add(cle);
        }
    }
    assert.equal(vues.size, n * n, 'toutes les cases couvertes');

    // Chaque cage est cohérente avec la solution.
    for (const cage of cages) {
        const vals = cage.cells.map(p => solution[p.r][p.c]);
        if (cage.op === null) {
            assert.equal(cage.cells.length, 1, 'case donnée = une seule case');
            assert.equal(cage.target, vals[0]);
        } else {
            if (cage.op === 'sub' || cage.op === 'div') {
                assert.equal(cage.cells.length, 2, `${cage.op} sur deux cases uniquement`);
            }
            assert.equal(OPS[cage.op].calc(vals), cage.target, 'résultat de cage exact');
            if (cage.op === 'div') assert.ok(Number.isInteger(cage.target), 'division exacte');
        }
        // Contiguïté : chaque case (sauf la première) touche une autre case de la cage.
        for (let i = 1; i < cage.cells.length; i++) {
            const { r, c } = cage.cells[i];
            assert.ok(cage.cells.some((p, j) => j !== i && Math.abs(p.r - r) + Math.abs(p.c - c) === 1),
                'cage contiguë');
        }
    }

    // La sérialisation de la solution est la réponse attendue.
    assert.equal(item.answer, solution.map(l => l.join('')).join('/'));
}

test('la solution est unique, sur 60 graines et toutes les tailles', () => {
    const configs = ['1-3', '2-4', '1-4', '2-5', '1-5'];
    for (let i = 0; i < 60; i++) {
        const item = genere(`unicite-${i}`, { chiffres: configs[i % configs.length] });
        const { n, lo, cages } = item.meta;
        assert.equal(compterSolutions(n, lo, cages, 3), 1, `graine unicite-${i} : solution unique`);
    }
});

test('structure valide : carré latin, cages exactes, contiguës, division entière', () => {
    for (let i = 0; i < 40; i++) {
        verifieStructure(genere(`structure-${i}`, { chiffres: ['1-3', '1-4', '1-5'][i % 3] }));
    }
});

test('les opérations non autorisées ne sortent jamais', () => {
    for (let i = 0; i < 25; i++) {
        const item = genere(`ops-${i}`, { operations: ['add'] });
        for (const cage of item.meta.cages) {
            assert.ok(cage.op === null || cage.op === 'add', `cage ${cage.label} : opération interdite`);
        }
        assert.equal(compterSolutions(item.meta.n, item.meta.lo, item.meta.cages, 3), 1);
    }
});

test('soustraction et division seules : cages de deux cases et données seulement', () => {
    for (let i = 0; i < 15; i++) {
        const item = genere(`subdiv-${i}`, { operations: ['sub', 'div'] });
        for (const cage of item.meta.cages) {
            if (cage.op === null) assert.equal(cage.cells.length, 1);
            else assert.equal(cage.cells.length, 2);
        }
        assert.equal(compterSolutions(item.meta.n, item.meta.lo, item.meta.cages, 3), 1);
    }
});

test('les chiffres décalés (2 à 4) sont respectés', () => {
    for (let i = 0; i < 15; i++) {
        const item = genere(`decale-${i}`, { chiffres: '2-4' });
        assert.equal(item.meta.lo, 2);
        assert.equal(item.meta.hi, 4);
        for (const ligne of item.meta.solution) {
            for (const v of ligne) assert.ok(v >= 2 && v <= 4);
        }
    }
});

test('même graine, même grille : la génération est reproductible', () => {
    const a = genere('repro');
    const b = genere('repro');
    assert.deepEqual(a.meta, b.meta);
    assert.equal(a.answer, b.answer);
});

test('la difficulté change la structure : plus de grandes cages en difficile', () => {
    let cagesFacile = 0, cagesDifficile = 0;
    for (let i = 0; i < 20; i++) {
        cagesFacile += genere(`d1-${i}`, { difficulte: 'facile', chiffres: '1-4' }).meta.cages.length;
        cagesDifficile += genere(`d2-${i}`, { difficulte: 'difficile', chiffres: '1-4' }).meta.cages.length;
    }
    // Des cages plus grandes = moins de cages au total.
    assert.ok(cagesDifficile < cagesFacile,
        `difficile devrait avoir moins de cages (facile ${cagesFacile}, difficile ${cagesDifficile})`);
});

test('la génération est rapide, y compris en 5×5 difficile', () => {
    const debut = Date.now();
    for (let i = 0; i < 20; i++) genere(`vitesse-${i}`, { chiffres: '1-5', difficulte: 'difficile' });
    const duree = Date.now() - debut;
    assert.ok(duree < 4000, `20 grilles 5×5 en ${duree} ms — trop lent`);
});
