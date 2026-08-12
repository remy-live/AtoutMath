// Temps, distance, vitesse : une formule, trois questions, zéro nombre sale.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { vitesseGenerator } from '../js/core/generators/vitesse.js';
import { makeRng } from '../js/core/ids.js';

const tirer = (params, graine) => vitesseGenerator.generate(params, { rng: makeRng(graine), index: 0 });

test('les trois questions sortent, et chacune est cohérente avec d = v × t', () => {
    const vus = new Set();
    for (let g = 0; g < 60; g++) {
        const it = tirer({ chercher: 'melange', difficulte: 2 }, `m${g}`);
        const { quoi, v, t, d } = it.meta;
        vus.add(quoi);
        assert.equal(v * t, d, 'd = v × t doit être vrai par construction');
        assert.equal(it.answer, quoi === 'distance' ? d : quoi === 'vitesse' ? v : t);
        assert.ok(!/undefined|NaN/.test(it.prompt.text + it.explanation));
    }
    assert.deepEqual([...vus].sort(), ['distance', 'duree', 'vitesse']);
});

test('les distances restent entières, même avec des demi-heures', () => {
    // 15 × 1,5 = 22,5 ne se corrige pas en calcul mental de ce niveau : le
    // générateur n'a pas le droit de le produire.
    for (let g = 0; g < 80; g++) {
        const it = tirer({ chercher: 'melange', difficulte: 2 }, `e${g}`);
        assert.ok(Number.isInteger(it.meta.d), `distance non entière : ${it.meta.d} km`);
        assert.ok(Number.isInteger(it.meta.v), `vitesse non entière : ${it.meta.v}`);
    }
});

test('au niveau 1, les durées sont des heures entières', () => {
    for (let g = 0; g < 40; g++) {
        const it = tirer({ chercher: 'melange', difficulte: 1 }, `h${g}`);
        assert.ok(Number.isInteger(it.meta.t), `durée fractionnaire au niveau 1 : ${it.meta.t}`);
    }
});

test('le piège des durées est corrigé en toutes lettres', () => {
    // « 1 h 30 = 1,5 h » doit être ÉCRIT quelque part dès qu'une durée
    // fractionnaire apparaît — c'est l'obstacle du chapitre.
    let vus = 0;
    for (let g = 0; g < 120 && vus < 5; g++) {
        const it = tirer({ chercher: 'distance', difficulte: 2 }, `p${g}`);
        if (!Number.isInteger(it.meta.t)) {
            vus++;
            assert.ok(it.meta.conversion, 'la conversion doit accompagner la durée fractionnaire');
            assert.match(it.explanation + it.hints.join(' '), /=\s*[\d,]+\s*h/);
        }
    }
    assert.ok(vus >= 3, 'les durées fractionnaires doivent réellement sortir au niveau 2');
});

test('chaque véhicule garde une vitesse vraisemblable', () => {
    // L'ordre de grandeur est un OUTIL de vérification qu'on enseigne : un
    // randonneur à 90 km/h le détruirait.
    for (let g = 0; g < 60; g++) {
        const it = tirer({ chercher: 'vitesse', difficulte: 1 }, `v${g}`);
        if (/randonneur/i.test(it.meta.mobile)) assert.ok(it.meta.v <= 6);
        if (/train/i.test(it.meta.mobile)) assert.ok(it.meta.v >= 120);
    }
});

test('la question demandée est la question obtenue', () => {
    assert.equal(tirer({ chercher: 'distance' }, 'q1').meta.quoi, 'distance');
    assert.equal(tirer({ chercher: 'vitesse' }, 'q2').meta.quoi, 'vitesse');
    assert.equal(tirer({ chercher: 'duree' }, 'q3').meta.quoi, 'duree');
});
