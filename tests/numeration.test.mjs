import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import { evaluate } from '../js/core/items.js';
import { digitAtRank, stripUselessZeros, spellInteger } from '../js/core/numberWords.js';
import {
    chiffreRangGenerator, partiesGenerator, zerosGenerator, conversionGenerator,
    decompositionGenerator, lettresGenerator, ordreGrandeurGenerator,
    egypteGenerator, complementGenerator, pariteGenerator
} from '../js/core/generators/numeration.js';

const ctx = (i) => ({ rng: makeRng('n' + i) });

test('rang : la réponse est bien le chiffre du rang annoncé', () => {
    for (let i = 0; i < 120; i++) {
        const it = chiffreRangGenerator.generate({ partie: 'les deux', decimales: 3 }, ctx(i));
        const { value, rank } = it.meta;
        assert.equal(Number(it.answer), digitAtRank(value, rank),
            `${value} rang ${rank} : ${it.prompt.text}`);
        assert.ok(Number(it.answer) >= 0 && Number(it.answer) <= 9);
    }
});

test('parties : la somme des deux parties redonne le nombre', () => {
    for (let i = 0; i < 80; i++) {
        const it = partiesGenerator.generate({}, ctx(i));
        const { value, intPart, decStr } = it.meta;
        const dec = Number(decStr.replace(',', '.'));
        assert.ok(Math.abs(intPart + dec - value) < 1e-9, `${intPart} + ${decStr} ≠ ${value}`);
        assert.ok(decStr.startsWith('0,'), 'la partie décimale commence par 0,');
    }
});

test('zéros : la réponse vaut le nombre de départ, sans zéro inutile', () => {
    for (let i = 0; i < 120; i++) {
        const it = zerosGenerator.generate({}, ctx(i));
        const depart = Number(it.meta.affiche.replace(',', '.'));
        const arrivee = Number(String(it.answer).replace(',', '.'));
        assert.equal(arrivee, depart, `${it.meta.affiche} → ${it.answer}`);
        assert.equal(String(it.answer), stripUselessZeros(it.meta.affiche));
        assert.ok(!/^0\d/.test(String(it.answer)), 'plus de zéro en tête');
    }
});

test('conversion : la valeur convertie est exacte', () => {
    const FACTEURS = { dizaines: 10, centaines: 100, 'unités de mille': 1000, 'dizaines de mille': 10000, dixièmes: 0.1, centièmes: 0.01 };
    for (let i = 0; i < 120; i++) {
        const it = conversionGenerator.generate({ decimaux: 'oui' }, ctx(i));
        const attendu = Number((it.meta.count * FACTEURS[it.meta.conv]).toFixed(3));
        assert.equal(Number(it.answer), attendu, it.prompt.text);
    }
});

test('décomposition : les termes redonnent bien le total', () => {
    for (let i = 0; i < 120; i++) {
        const it = decompositionGenerator.generate({ sens: 'libre' }, ctx(i));
        const { total, termes, cache } = it.meta;
        assert.equal(termes.reduce((s, t) => s + t, 0), total);
        // Chaque terme est bien un chiffre × une puissance de dix.
        termes.forEach(t => assert.match(String(t), /^[1-9]0*$/, `terme ${t}`));
        const attendu = cache === undefined ? total : termes[cache];
        assert.equal(Number(it.answer), attendu);
    }
});

test('lettres : l\'écriture proposée correspond à la réponse', () => {
    for (let i = 0; i < 120; i++) {
        const it = lettresGenerator.generate({ max: 1000000, decimaux: 'non' }, ctx(i));
        // Sur le papier l'énoncé est nu : la consigne « Écris en chiffres »
        // est écrite UNE fois en tête de l'exercice, pas devant chaque nombre,
        // et la question se termine par le signe égal comme dans un cahier.
        assert.equal(it.prompt.text, `${spellInteger(it.meta.n)} =`);
        assert.equal(Number(it.answer), it.meta.n);
    }
});

test('ordre de grandeur : la réponse est le nombre rond le plus proche', () => {
    for (let i = 0; i < 120; i++) {
        const it = ordreGrandeurGenerator.generate({ decimaux: 'oui' }, ctx(i));
        const valeur = Number(it.meta.affiche.replace(/\s/g, '').replace(',', '.'));
        const ecart = Math.abs(valeur - it.meta.answer);
        it.choices.filter(c => !c.correct).forEach(c => {
            assert.ok(Math.abs(valeur - Number(c.value)) >= ecart,
                `${it.meta.affiche} : ${c.value} n'est pas plus loin que ${it.meta.answer}`);
        });
    }
});

test('égyptien : la somme des symboles vaut la réponse', () => {
    for (let i = 0; i < 120; i++) {
        const it = egypteGenerator.generate({ max: 10000 }, ctx(i));
        const somme = it.meta.symboles.reduce((s, g) => s + g.value * g.n, 0);
        assert.equal(somme, it.meta.total);
        assert.equal(Number(it.answer), somme, it.explanation);
        // Ordre décroissant, comme l'écrivaient les Égyptiens.
        const valeurs = it.meta.symboles.map(s => s.value);
        assert.deepEqual(valeurs, [...valeurs].sort((a, b) => b - a));
        // Peu de symboles par rang : ce n'est pas un exercice de dénombrement.
        it.meta.symboles.forEach(s => assert.ok(s.n <= 4, `${s.n} symboles de ${s.value}`));
    }
});

test('compléments : le total atteint bien la cible', () => {
    for (let i = 0; i < 120; i++) {
        const it = complementGenerator.generate({ cible: [10, 100, 1000] }, ctx(i));
        assert.equal(it.meta.a + Number(it.answer), it.meta.cible, it.prompt.text);
        assert.ok(Number(it.answer) > 0, 'le complément n\'est jamais nul');
    }
});

test('parité : la réponse suit le chiffre des unités', () => {
    for (let i = 0; i < 120; i++) {
        const it = pariteGenerator.generate({ max: 99 }, ctx(i));
        assert.equal(it.answer, it.meta.n % 2 === 0 ? 'pair' : 'impair');
        assert.equal(it.choices.length, 2);
        assert.equal(evaluate(it, it.answer).correct, true);
    }
});

test('la virgule n\'apparaît que si la réponse peut être décimale', () => {
    // Le pavé masque la touche « , » sur les items entiers : le drapeau
    // `meta.decimal` doit donc être fiable là où il est posé.
    for (let i = 0; i < 60; i++) {
        const it = zerosGenerator.generate({}, ctx(i));
        assert.equal(it.meta.decimal, String(it.answer).includes(','));
    }
});
