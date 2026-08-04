// Le Garam version treillis lié : ces tests vérifient les trois promesses —
// solution unique, treillis d'UN SEUL TENANT, et grilles RÉSOLUBLES SANS
// DEVINER (terminables par pur enchaînement de déductions).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    garamGenerator, compterSolutionsGaram, resolubleParDeduction, OPS_GARAM
} from '../js/core/generators/garam.js';
import { makeRng } from '../js/core/ids.js';

const genere = (seed, params = {}) =>
    garamGenerator.generate(
        { taille: 'petit', operations: ['add', 'sub', 'mul', 'div'], difficulte: 'moyen', ...params },
        { rng: makeRng(seed) }
    );

const casesDe = (eq) => (eq.z2 !== undefined ? [eq.a, eq.b, eq.z, eq.z2] : [eq.a, eq.b, eq.z]);

function verifieStructure(item) {
    const { structure, givens, solution } = item.meta;

    for (const v of solution) assert.ok(v >= 0 && v <= 9 && Number.isInteger(v), 'chiffre de 0 à 9');

    for (const eq of structure.equations) {
        const T = eq.z2 !== undefined ? 10 * solution[eq.z] + solution[eq.z2] : solution[eq.z];
        assert.equal(OPS_GARAM[eq.op].calc(solution[eq.a], solution[eq.b]), T,
            `égalité ${solution[eq.a]} ${eq.op} ${solution[eq.b]} = ${T}`);
        if (eq.z2 !== undefined) {
            assert.ok(T >= 10 && T <= 99, 'résultat double entre 10 et 99');
            assert.ok(solution[eq.z] >= 1, 'pas de dizaine nulle');
        }
        if (eq.op === 'div') assert.ok(solution[eq.b] !== 0, 'jamais de division par zéro');
        if (eq.op === 'sub') assert.ok(T >= 0, 'jamais de résultat négatif');
    }

    givens.forEach((v, i) => { if (v !== null) assert.equal(v, solution[i]); });

    // Le petit est désormais vertical (13 lignes aussi) : c'est la largeur
    // qui distingue les deux tailles.
    const grand = structure.cols === 14;
    const doubles = structure.equations.filter(e => e.z2 !== undefined).length;
    assert.equal(structure.equations.length, grand ? 20 : 9, 'nombre d\'égalités');
    assert.ok(doubles >= 1, 'au moins un résultat double — la signature du Garam');
    assert.ok(doubles <= (grand ? 4 : 2));
    // 8 cases par brique + 1 par pont + 1 par résultat double.
    const attenduCases = (grand ? 4 * 8 + 4 : 2 * 8 + 1) + doubles;
    assert.equal(structure.cells.length, attenduCases, 'compte de cases');

    assert.equal(item.answer, 'g' + solution.join('/'));
}

test('le treillis est d\'UN SEUL TENANT : toutes les cases reliées entre elles', () => {
    for (const taille of ['petit', 'grand']) {
        const { structure } = genere(`connexe-${taille}`, { taille }).meta;
        // Parcours du graphe : deux cases sont voisines si une égalité les
        // contient toutes les deux. C'était LE défaut de la première version —
        // deux sous-grilles indépendantes.
        const voisins = Array.from({ length: structure.cells.length }, () => new Set());
        for (const eq of structure.equations) {
            const cs = casesDe(eq);
            for (const x of cs) for (const y of cs) if (x !== y) voisins[x].add(y);
        }
        const vus = new Set([0]);
        const file = [0];
        while (file.length) {
            for (const v of voisins[file.pop()]) if (!vus.has(v)) { vus.add(v); file.push(v); }
        }
        assert.equal(vus.size, structure.cells.length, `${taille} : une seule toile`);
    }
});

test('chaque grille est résoluble par déduction seule — jamais besoin de deviner', () => {
    for (let i = 0; i < 40; i++) {
        const item = genere(`deduction-${i}`, { taille: i % 2 ? 'grand' : 'petit' });
        assert.ok(resolubleParDeduction(item.meta.structure, item.meta.givens),
            `graine deduction-${i}`);
    }
});

test('la solution est unique, sur 40 graines, petit et grand', () => {
    for (let i = 0; i < 40; i++) {
        const item = genere(`unicite-${i}`, { taille: i % 2 ? 'grand' : 'petit' });
        assert.equal(compterSolutionsGaram(item.meta.structure, item.meta.givens, 3), 1,
            `graine unicite-${i}`);
    }
});

test('structure valide : égalités vraies, résultats doubles, données exactes', () => {
    for (let i = 0; i < 30; i++) {
        verifieStructure(genere(`structure-${i}`, { taille: i % 2 ? 'grand' : 'petit' }));
    }
});

test('il y a bien des multiplications à résultat double quand on les autorise', () => {
    let doublesMul = 0;
    for (let i = 0; i < 30; i++) {
        const item = genere(`mul-${i}`, { operations: ['add', 'mul'] });
        doublesMul += item.meta.structure.equations
            .filter(e => e.z2 !== undefined && e.op === 'mul').length;
    }
    assert.ok(doublesMul >= 10, `seulement ${doublesMul} multiplications doubles sur 30 grilles`);
});

test('les égalités simples respectent les opérations autorisées', () => {
    for (let i = 0; i < 20; i++) {
        const item = genere(`ops-${i}`, { operations: ['sub', 'div'] });
        for (const eq of item.meta.structure.equations) {
            // Un résultat double exige + ou × : seules ces égalités-là ont
            // droit au repli sur l'addition.
            if (eq.z2 === undefined) assert.ok(['sub', 'div'].includes(eq.op), `simple en ${eq.op}`);
            else assert.ok(['add', 'mul'].includes(eq.op), `double en ${eq.op}`);
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

test('cas ingrat : addition seule, les deux tailles restent générables', () => {
    for (let i = 0; i < 10; i++) {
        const item = genere(`addonly-${i}`, { operations: ['add'], taille: i % 2 ? 'grand' : 'petit' });
        assert.ok(item.meta.solution.every(v => v !== null));
        assert.ok(resolubleParDeduction(item.meta.structure, item.meta.givens));
    }
});
