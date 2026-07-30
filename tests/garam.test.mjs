// Le Garam promet, comme ses deux aînés, UNE solution — et un treillis dont
// toutes les égalités sont vraies, y compris celles qui se croisent.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { garamGenerator, compterSolutionsGaram, OPS_GARAM } from '../js/core/generators/garam.js';
import { makeRng } from '../js/core/ids.js';

const genere = (seed, params = {}) =>
    garamGenerator.generate(
        { taille: 'petit', operations: ['add', 'sub', 'mul', 'div'], difficulte: 'moyen', ...params },
        { rng: makeRng(seed) }
    );

function verifieStructure(item) {
    const { structure, givens, solution } = item.meta;

    for (const v of solution) assert.ok(v >= 0 && v <= 9 && Number.isInteger(v), 'chiffre de 0 à 9');

    // Toutes les égalités sont vraies sur la solution.
    for (const { a, b, z, op } of structure.equations) {
        const calc = OPS_GARAM[op].calc(solution[a], solution[b]);
        assert.equal(calc, solution[z], `égalité ${solution[a]} ${op} ${solution[b]} = ${solution[z]}`);
        if (op === 'div') assert.ok(solution[b] !== 0, 'jamais de division par zéro');
        if (op === 'sub') assert.ok(solution[z] >= 0, 'jamais de résultat négatif');
    }

    // Les cases données coïncident avec la solution.
    givens.forEach((v, i) => { if (v !== null) assert.equal(v, solution[i]); });

    // Le nombre d'égalités et de cases correspond à la taille.
    const attendu = structure.rows === 9 ? [12, 24] : [7, 15];
    assert.equal(structure.equations.length, attendu[0]);
    assert.equal(structure.cells.length, attendu[1]);

    assert.equal(item.answer, 'g' + solution.join('/'));
}

test('la solution est unique, sur 60 graines, petit et grand', () => {
    for (let i = 0; i < 60; i++) {
        const item = genere(`unicite-${i}`, { taille: i % 2 ? 'grand' : 'petit' });
        assert.equal(compterSolutionsGaram(item.meta.structure, item.meta.givens, 3), 1,
            `graine unicite-${i} : solution unique`);
    }
});

test('structure valide : égalités vraies, données exactes, bonnes tailles', () => {
    for (let i = 0; i < 40; i++) {
        verifieStructure(genere(`structure-${i}`, { taille: i % 2 ? 'grand' : 'petit' }));
    }
});

test('les opérations non autorisées ne sortent jamais', () => {
    for (let i = 0; i < 20; i++) {
        const item = genere(`ops-${i}`, { operations: ['add', 'mul'] });
        for (const eq of item.meta.structure.equations) {
            assert.ok(['add', 'mul'].includes(eq.op), `opération interdite : ${eq.op}`);
        }
    }
});

test('même graine, même treillis', () => {
    const a = genere('repro');
    const b = genere('repro');
    assert.deepEqual(a.meta, b.meta);
    assert.equal(a.answer, b.answer);
});

test('la difficulté creuse davantage', () => {
    let facile = 0, difficile = 0;
    for (let i = 0; i < 20; i++) {
        facile += genere(`d1-${i}`, { difficulte: 'facile' }).meta.nbDonnees;
        difficile += genere(`d2-${i}`, { difficulte: 'difficile' }).meta.nbDonnees;
    }
    assert.ok(difficile < facile, `facile ${facile}, difficile ${difficile}`);
});

test('une grille presque juste est refusée', async () => {
    const { evaluate } = await import('../js/core/items.js');
    const item = genere('presque');
    assert.equal(evaluate(item, item.answer).correct, true);
    const digits = item.answer.slice(1).split('/');
    digits[digits.length - 1] = String((Number(digits[digits.length - 1]) + 1) % 10);
    assert.equal(evaluate(item, 'g' + digits.join('/')).correct, false);
});

test('la génération est rapide, y compris en grand difficile', () => {
    const debut = Date.now();
    for (let i = 0; i < 20; i++) genere(`vitesse-${i}`, { taille: 'grand', difficulte: 'difficile' });
    const duree = Date.now() - debut;
    assert.ok(duree < 5000, `20 grands treillis en ${duree} ms — trop lent`);
});
