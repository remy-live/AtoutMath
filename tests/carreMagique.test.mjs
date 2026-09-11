// Le carré magique : vraiment magique, et résoluble sans deviner.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    lignesDe, estMagique, tirerCarre, resoudre, creuserTrous,
    genererCarreMagique, verifierSaisie
} from '../js/core/carreMagique.js';
import { carreMagiqueGenerator } from '../js/core/generators/carreMagique.js';
import { makeRng } from '../js/core/ids.js';

test('un carré de n×n a 2n + 2 lignes à vérifier', () => {
    assert.equal(lignesDe(3).length, 8);
    assert.equal(lignesDe(4).length, 10);
});

test('tous les tirages sont magiques — symétries, décalage et échelle compris', () => {
    for (let g = 0; g < 30; g++) {
        for (const n of [3, 4]) {
            const c = tirerCarre(makeRng(`m${n}-${g}`), { n, difficile: g % 2 === 1 });
            assert.ok(estMagique(c.cases, n), `tirage ${g} d'ordre ${n} : pas magique`);
            assert.equal(c.somme, estMagique(c.cases, n));
            c.cases.forEach(v => assert.ok(v > 0 && Number.isInteger(v)));
        }
    }
});

test('chaque puzzle se résout ligne à ligne, sans jamais deviner', () => {
    for (let g = 0; g < 25; g++) {
        const p = genererCarreMagique({ taille: g % 2 ? 4 : 3, difficulte: g % 3 ? 'normal' : 'difficile' }, makeRng(`p${g}`));
        assert.ok(p.trous.length >= 3, 'au moins trois cases à trouver');
        const r = resoudre(p, p.trous);
        assert.ok(r.complet, `graine ${g} : déduction insuffisante`);
        assert.deepEqual(r.grille, p.cases, 'la déduction retombe sur le carré d\'origine');
        // Le journal explique chaque trou par une soustraction.
        assert.equal(r.etapes.length, p.trous.length);
        r.etapes.forEach(e => assert.match(e.raison, /−/));
    }
});

test('un trou qui casserait la résolubilité est rebouché', () => {
    // On demande 9 trous sur un 3×3 : c'est trop, creuserTrous doit s'arrêter
    // de lui-même au moment où la déduction ne suffirait plus.
    const carre = tirerCarre(makeRng('trop'), { n: 3 });
    const trous = creuserTrous(carre, 9, makeRng('trop2'));
    assert.ok(trous.length < 9);
    assert.ok(resoudre(carre, trous).complet);
});

test('la vérification distingue la faute du simple vide', () => {
    const p = genererCarreMagique({ taille: 3 }, makeRng('v'));
    const juste = {};
    p.trous.forEach(i => { juste[i] = p.cases[i]; });
    assert.ok(verifierSaisie(p, juste).ok);

    const unVide = { ...juste };
    delete unVide[p.trous[0]];
    const b1 = verifierSaisie(p, unVide);
    assert.ok(!b1.ok);
    assert.equal(b1.fautes.length, 0, 'une case vide n\'est pas une faute');
    assert.equal(b1.vides, 1);

    const unFaux = { ...juste, [p.trous[0]]: p.cases[p.trous[0]] + 1 };
    assert.deepEqual(verifierSaisie(p, unFaux).fautes, [p.trous[0]]);
});

test('le même tirage donne le même carré', () => {
    const a = genererCarreMagique({ taille: 4 }, makeRng('stable'));
    const b = genererCarreMagique({ taille: 4 }, makeRng('stable'));
    assert.deepEqual(a.cases, b.cases);
    assert.deepEqual(a.trous, b.trous);
});

test('le générateur pose un carré complet sur la feuille', () => {
    for (let g = 1; g <= 8; g++) {
        const it = carreMagiqueGenerator.generate(
            { taille: g % 2 ? 3 : 4 }, { rng: makeRng(`f${g}`), index: g });
        assert.ok(it.meta.somme > 0);
        assert.ok(it.meta.trous.length >= 3);
        assert.match(it.prompt.text, new RegExp(String(it.meta.somme)));
        assert.ok(!/undefined|NaN/.test(it.explanation));
    }
});
