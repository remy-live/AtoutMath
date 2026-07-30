// Le Binairo promet, comme le Mathdoku, UNE solution : ces tests le vérifient
// sur beaucoup de graines, avec les règles de structure — équilibre des 0 et
// des 1, jamais trois identiques à la suite.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { binairoGenerator, compterSolutionsBinairo } from '../js/core/generators/binairo.js';
import { makeRng } from '../js/core/ids.js';

const genere = (seed, params = {}) =>
    binairoGenerator.generate({ taille: 6, difficulte: 'moyen', ...params }, { rng: makeRng(seed) });

function verifieStructure(item) {
    const { n, givens, solution } = item.meta;

    for (let i = 0; i < n; i++) {
        const ligne = solution[i];
        const colonne = solution.map(l => l[i]);
        assert.equal(ligne.filter(v => v === 0).length, n / 2, 'équilibre de la ligne');
        assert.equal(colonne.filter(v => v === 0).length, n / 2, 'équilibre de la colonne');
        for (let j = 0; j + 2 < n; j++) {
            assert.ok(!(ligne[j] === ligne[j + 1] && ligne[j] === ligne[j + 2]), 'trois à la suite en ligne');
            assert.ok(!(colonne[j] === colonne[j + 1] && colonne[j] === colonne[j + 2]), 'trois à la suite en colonne');
        }
    }

    // Les cases données coïncident avec la solution.
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        if (givens[r][c] !== null) assert.equal(givens[r][c], solution[r][c], 'case donnée exacte');
    }

    assert.equal(item.answer, solution.map(l => l.join('')).join('/'));
}

test('la solution est unique, sur 60 graines et toutes les tailles', () => {
    const tailles = [4, 6, 8];
    for (let i = 0; i < 60; i++) {
        const item = genere(`unicite-${i}`, { taille: tailles[i % 3] });
        assert.equal(compterSolutionsBinairo(item.meta.n, item.meta.givens, 3), 1,
            `graine unicite-${i} : solution unique`);
    }
});

test('structure valide : équilibre, pas de triple, données exactes', () => {
    for (let i = 0; i < 40; i++) {
        verifieStructure(genere(`structure-${i}`, { taille: [4, 6, 8][i % 3] }));
    }
});

test('même graine, même grille', () => {
    const a = genere('repro');
    const b = genere('repro');
    assert.deepEqual(a.meta, b.meta);
    assert.equal(a.answer, b.answer);
});

test('la difficulté creuse davantage : moins de cases données en difficile', () => {
    let facile = 0, difficile = 0;
    for (let i = 0; i < 20; i++) {
        facile += genere(`d1-${i}`, { difficulte: 'facile', taille: 6 }).meta.nbDonnees;
        difficile += genere(`d2-${i}`, { difficulte: 'difficile', taille: 6 }).meta.nbDonnees;
    }
    assert.ok(difficile < facile,
        `difficile devrait donner moins de cases (facile ${facile}, difficile ${difficile})`);
});

test('le compte de cases données annoncé est le vrai', () => {
    for (let i = 0; i < 10; i++) {
        const item = genere(`compte-${i}`);
        const reel = item.meta.givens.flat().filter(v => v !== null).length;
        assert.equal(item.meta.nbDonnees, reel);
    }
});

test('la génération est rapide, y compris en 8×8 difficile', () => {
    const debut = Date.now();
    for (let i = 0; i < 20; i++) genere(`vitesse-${i}`, { taille: 8, difficulte: 'difficile' });
    const duree = Date.now() - debut;
    assert.ok(duree < 5000, `20 grilles 8×8 en ${duree} ms — trop lent`);
});
