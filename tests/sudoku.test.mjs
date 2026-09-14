// Sudoku : les mêmes promesses que le Garam — solution unique, grille
// résoluble par les techniques du niveau (jamais besoin de deviner), et
// génération semée, rapide, dans les trois tailles.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    sudokuGenerator, TAILLES_SUDOKU, unitesDe, resolubleParSingles, compterSolutionsSudoku
} from '../js/core/generators/sudoku.js';
import { makeRng } from '../js/core/ids.js';

const genere = (seed, params = {}) =>
    sudokuGenerator.generate({ taille: 6, difficulte: 'moyen', ...params }, { rng: makeRng(seed) });

function voisinesDe(n, unites) {
    const voisines = Array.from({ length: n * n }, () => new Set());
    for (const u of unites) for (const a of u) for (const b of u) if (a !== b) voisines[a].add(b);
    return voisines.map(s => [...s]);
}

test('la solution respecte les règles, dans les trois tailles', () => {
    for (const taille of [4, 6, 9]) {
        const { n, br, bc, solution, givens } = genere(`regles-${taille}`, { taille }).meta;
        assert.equal(n, taille);
        assert.equal(br * bc, n, 'les blocs pavent la grille');
        assert.equal(solution.length, n * n);
        for (const u of unitesDe(n, br, bc)) {
            const vus = new Set(u.map(i => solution[i]));
            assert.equal(vus.size, n, 'chaque unité contient chaque chiffre une fois');
        }
        givens.forEach((v, i) => { if (v !== null) assert.equal(v, solution[i]); });
    }
});

test('chaque grille est résoluble par singles — jamais besoin de deviner', () => {
    for (let i = 0; i < 24; i++) {
        const taille = [4, 6, 9][i % 3];
        const difficulte = ['facile', 'moyen', 'difficile'][i % 2 === 0 ? i % 3 : (i + 1) % 3];
        const item = genere(`deduction-${i}`, { taille, difficulte });
        const { n, br, bc, givens } = item.meta;
        const unites = unitesDe(n, br, bc);
        assert.ok(resolubleParSingles(givens, n, voisinesDe(n, unites), unites, true),
            `graine deduction-${i} (${taille}, ${difficulte})`);
    }
});

test('facile se résout au candidat unique SEUL', () => {
    for (let i = 0; i < 12; i++) {
        const taille = [4, 6, 9][i % 3];
        const item = genere(`facile-${i}`, { taille, difficulte: 'facile' });
        const { n, br, bc, givens } = item.meta;
        const unites = unitesDe(n, br, bc);
        assert.ok(resolubleParSingles(givens, n, voisinesDe(n, unites), unites, false),
            `graine facile-${i} (${taille})`);
    }
});

test('la solution est unique, sur 24 graines', () => {
    for (let i = 0; i < 24; i++) {
        const taille = [4, 6, 9][i % 3];
        const item = genere(`unicite-${i}`, { taille });
        const { n, br, bc, givens } = item.meta;
        assert.equal(compterSolutionsSudoku(givens, n, voisinesDe(n, unitesDe(n, br, bc)), 3), 1,
            `graine unicite-${i} (${taille})`);
    }
});

test('la difficulté creuse davantage', () => {
    let facile = 0, difficile = 0;
    for (let i = 0; i < 12; i++) {
        facile += genere(`d1-${i}`, { taille: 9, difficulte: 'facile' }).meta.nbDonnees;
        difficile += genere(`d2-${i}`, { taille: 9, difficulte: 'difficile' }).meta.nbDonnees;
    }
    assert.ok(difficile < facile, `facile ${facile}, difficile ${difficile}`);
});

test('même graine, même grille', () => {
    const a = genere('repro');
    const b = genere('repro');
    assert.deepEqual(a.meta, b.meta);
    assert.equal(a.answer, b.answer);
});

test('une grille presque juste est refusée', async () => {
    const { evaluate } = await import('../js/core/items.js');
    const item = genere('presque');
    assert.equal(evaluate(item, item.answer).correct, true);
    const digits = item.answer.slice(1).split('/');
    digits[0] = String((Number(digits[0]) % item.meta.n) + 1);
    assert.equal(evaluate(item, 'g' + digits.join('/')).correct, false);
});

test('la génération est rapide, y compris en 9×9 difficile', () => {
    const debut = Date.now();
    for (let i = 0; i < 10; i++) genere(`vitesse-${i}`, { taille: 9, difficulte: 'difficile' });
    const duree = Date.now() - debut;
    assert.ok(duree < 5000, `10 grilles 9×9 en ${duree} ms — trop lent`);
});

test('la grille est un tableau PLAT, comme l\'attend la fiche imprimée', () => {
    // Le rendu papier lit la case (r, c) à l'indice r × n + c. Le binairo, lui,
    // range ses cases en tableau de lignes : les deux se ressemblent assez pour
    // qu'on écrive `givens[r][c]` par habitude, et la fiche plantait pour ça.
    // Ce test fige le contrat du côté du générateur.
    for (const taille of [4, 6, 9]) {
        const { meta } = genere(taille * 7, { taille });
        const { n, br, bc, givens, solution } = meta;
        assert.equal(n, taille);
        assert.equal(givens.length, n * n, `givens à plat pour ${n}×${n}`);
        assert.equal(solution.length, n * n, `solution à plat pour ${n}×${n}`);
        assert.ok(givens.every(v => v === null || typeof v === 'number'),
            'une case est un nombre ou null — jamais une ligne');
        assert.equal(br * bc, n, 'un bloc contient exactement n cases');
        // La case (1, 2) doit bien être à l'indice n + 2.
        assert.equal(solution[n + 2], solution[1 * n + 2]);
    }
});
