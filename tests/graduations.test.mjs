// La loupe sur la droite graduée : intercaler des décimaux.
//
// Le risque d'un générateur d'axe n'est pas de mal calculer, c'est de mal
// ARRONDIR : 0,1 + 0,1 + 0,1 vaut 0,30000000000000004 en virgule flottante, et
// une réponse affichée « 3,3 » qui vaut en mémoire 3,3000000000000003 compte
// faux une copie juste. Tout ce fichier vérifie donc que les nombres montrés
// sont exactement les nombres attendus.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { graduationsGenerator } from '../js/core/generators/graduations.js';
import { axeSvg } from '../js/core/figures.js';
import { makeRng } from '../js/core/ids.js';

const tirer = (i, params = {}) => graduationsGenerator.generate(
    params, { rng: makeRng(`g${i}`), index: i });

/** Le nombre de décimales réellement portées par une valeur. */
const decimales = (x) => (String(x).split('.')[1] || '').length;

test('la réponse est exactement le point marqué, sans traîne décimale', () => {
    for (const zoom of ['unites', 'dixiemes', 'centiemes']) {
        const rang = { unites: 0, dixiemes: 1, centiemes: 2 }[zoom];
        for (let i = 0; i < 60; i++) {
            const it = tirer(i, { zoom });
            assert.ok(decimales(it.answer) <= rang,
                `${zoom} : la réponse ${it.answer} porte trop de décimales`);
            const { debut, crans, valeur } = it.meta;
            const pas = { unites: 1, dixiemes: 0.1, centiemes: 0.01 }[zoom];
            assert.equal(valeur, Number((debut + crans * pas).toFixed(rang)));
            assert.equal(it.answer, valeur);
        }
    }
});

test('le point tombe strictement entre les deux grands traits', () => {
    for (let i = 0; i < 90; i++) {
        const it = tirer(i);
        const { debut, fin, valeur } = it.meta;
        assert.ok(valeur > debut, `${valeur} n'est pas après ${debut}`);
        assert.ok(valeur < fin, `${valeur} n'est pas avant ${fin}`);
    }
});

test('l\'axe porte dix intervalles et deux nombres seulement', () => {
    const svg = axeSvg({ debut: 3, fin: 4, pas: 0.1, rang: 1, point: 3.4 });
    const crans = (svg.match(/class="ax-cran/g) || []).length;
    assert.equal(crans, 11, 'dix intervalles font onze traits');
    const bouts = (svg.match(/ax-cran--bout/g) || []).length;
    assert.equal(bouts, 2, 'seuls les deux bouts sont marqués');
    const nombres = [...svg.matchAll(/class="ax-nb"[^>]*>([^<]+)</g)].map(m => m[1]);
    assert.deepEqual(nombres, ['3', '4'], 'écrire les dix nombres supprimerait la question');
});

test('l\'axe écrit ses bornes à la française', () => {
    const svg = axeSvg({ debut: 3.5, fin: 3.6, pas: 0.01, rang: 2, point: 3.54 });
    const nombres = [...svg.matchAll(/class="ax-nb"[^>]*>([^<]+)</g)].map(m => m[1]);
    assert.deepEqual(nombres, ['3,5', '3,6']);
});

test('le point du dessin est là où l\'énoncé le dit', () => {
    // Quatre intervalles après 3 sur un axe de 3 à 4 : le point est aux 40 %
    // de la distance entre les deux grands traits.
    const svg = axeSvg({ debut: 3, fin: 4, pas: 0.1, rang: 1, point: 3.4 });
    const croix = /<g class="ax-point">\s*<line x1="([\d.]+)"/.exec(svg);
    assert.ok(croix, 'point introuvable');
    const G = 26, D = 340 - 26;
    assert.ok(Math.abs(Number(croix[1]) + 6 - (G + 0.4 * (D - G))) < 0.6,
        `croix mal placée : ${croix[1]}`);
});

test('progressif : trois questions par échelle, puis on descend', () => {
    const vus = [];
    for (let i = 0; i < 9; i++) vus.push(tirer(i).meta.zoom);
    assert.deepEqual(vus, [
        'unites', 'unites', 'unites',
        'dixiemes', 'dixiemes', 'dixiemes',
        'centiemes', 'centiemes', 'centiemes'
    ]);
    // Au-delà, on reste au cran le plus fin plutôt que de sortir du tableau.
    assert.equal(tirer(30).meta.zoom, 'centiemes');
});

test('un réglage figé ne bouge pas', () => {
    for (let i = 0; i < 12; i++) assert.equal(tirer(i, { zoom: 'centiemes' }).meta.zoom, 'centiemes');
});

test('les deux voisins immédiats sont proposés', () => {
    // C'est l'erreur de celui qui compte les TRAITS au lieu des INTERVALLES :
    // elle doit être offerte, pas contournée.
    for (let i = 0; i < 40; i++) {
        const it = tirer(i, { zoom: 'dixiemes' });
        const v = it.meta.valeur;
        const bas = Number((v - 0.1).toFixed(1)), haut = Number((v + 0.1).toFixed(1));
        const valeurs = it.choices.map(c => c.value);
        assert.ok(valeurs.includes(bas) || valeurs.includes(haut),
            `ni ${bas} ni ${haut} parmi ${valeurs.join(', ')}`);
    }
});

test('quatre propositions distinctes, une seule juste', () => {
    for (let i = 0; i < 60; i++) {
        const it = tirer(i);
        assert.equal(it.choices.length, 4, `question ${i}`);
        assert.equal(new Set(it.choices.map(c => c.value)).size, 4, `question ${i}`);
        assert.equal(it.choices.filter(c => c.correct).length, 1, `question ${i}`);
        assert.equal(it.choices.find(c => c.correct).value, it.answer);
    }
});

test('l\'explication dit combien vaut un intervalle', () => {
    const it = tirer(4, { zoom: 'dixiemes' });
    assert.match(it.explanation, /coupé en dix/);
    assert.match(it.explanation, /0,1/);
});
