import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import {
    creerMotCode, saisieInitiale, numerosFaux, lettresEnDouble,
    estResoluCode, qualiteCode, THEMES
} from '../js/core/motCode.js';
import { motCodeFicheGenerator as G } from '../js/core/generators/motCodeFiche.js';

const faire = (opts = {}, cle = 'mk') => creerMotCode({
    theme: 'angles', niveauMax: 3, nbMots: 10, essais: 4,
    rng: makeRng(cle), rngPour: (i) => makeRng(`${cle}-${i}`), ...opts
});

test('le code est une bijection : un numéro par lettre, une lettre par numéro', () => {
    // C'est LA règle du jeu — « deux numéros ne cachent jamais la même
    // lettre ». Si le codage la viole, la grille n'a pas de solution unique et
    // toute la déduction s'effondre.
    for (let i = 0; i < 30; i++) {
        const m = faire({}, 'bij' + i);
        const numeros = m.lettres.map(l => m.code[l]);
        assert.equal(new Set(numeros).size, numeros.length, 'deux lettres partagent un numéro');
        assert.deepEqual([...numeros].sort((a, b) => a - b),
            m.lettres.map((_, k) => k + 1), 'les numéros ne vont pas de 1 à N sans trou');
        m.lettres.forEach(l => assert.equal(m.parNumero[m.code[l]], l));
    }
});

test('la grille codée est exactement la grille des mots', () => {
    // Une case porte le numéro de SA lettre, et rien d'autre : c'est la seule
    // garantie que ce qu'on décode est ce qui a été écrit.
    for (let i = 0; i < 20; i++) {
        const m = faire({}, 'gr' + i);
        m.cases.forEach((ligne, y) => ligne.forEach((c, x) => {
            if (c === null) return assert.equal(m.numeros[y][x], null, 'une case muette est numérotée');
            assert.equal(m.numeros[y][x], m.code[c]);
        }));
        // Et chaque lettre du lexique employée est bien dans l'alphabet.
        m.mots.forEach(w => [...w.mot].forEach(l =>
            assert.ok(m.lettres.includes(l), `${l} manque à l'alphabet`)));
    }
});

test('les lettres offertes sont les plus fréquentes, pas des lettres au hasard', () => {
    // Une lettre offerte qui ne paraît qu'une fois ne débloque rien : l'élève
    // reste devant un mur, et le cadeau n'en est pas un.
    const m = faire({ offertes: 3 }, 'off');
    const compte = new Map();
    m.cases.forEach(l => l.forEach(c => { if (c) compte.set(c, (compte.get(c) || 0) + 1); }));
    const seuil = Math.min(...m.donnees.map(l => compte.get(l)));
    [...compte.entries()].forEach(([l, n]) => {
        if (!m.donnees.includes(l)) assert.ok(n <= seuil, `${l} (${n}) est plus fréquent qu'une offerte`);
    });
    assert.equal(m.donnees.length, 3);
});

test('on n\'offre jamais tout l\'alphabet', () => {
    // Sinon la grille est déjà résolue à l'ouverture.
    const m = faire({ offertes: 50 }, 'trop');
    assert.ok(m.donnees.length < m.lettres.length);
    assert.equal(estResoluCode(m, saisieInitiale(m)), false);
    // Et zéro lettre offerte reste un réglage valable.
    assert.deepEqual(faire({ offertes: 0 }, 'zero').donnees, []);
});

test('la saisie de départ contient les lettres offertes, et rien de faux', () => {
    const m = faire({}, 'dep');
    const s = saisieInitiale(m);
    assert.equal(Object.keys(s).length, m.donnees.length);
    assert.deepEqual(numerosFaux(m, s), []);
});

test('« vérifier » ne montre que les numéros faux, jamais les vides', () => {
    const m = faire({}, 'ver');
    const bon = m.lettres[0], num = m.code[bon];
    const faux = m.lettres.find(l => l !== bon);
    assert.deepEqual(numerosFaux(m, { [num]: bon }), []);
    assert.deepEqual(numerosFaux(m, { [num]: faux }), [num]);
    assert.deepEqual(numerosFaux(m, { [num]: '' }), [], 'une case vide n\'est pas fausse');
});

test('une lettre posée sur deux numéros est signalée', () => {
    // C'est la contradiction qui fait avancer un mot codé : « ce ne peut pas
    // être un E, le E est déjà pris ». Le jeu la montre au lieu de la refuser.
    assert.deepEqual(lettresEnDouble({ 3: 'E', 7: 'A', 11: 'E' }),
        [{ lettre: 'E', numeros: [3, 11] }]);
    assert.deepEqual(lettresEnDouble({ 3: 'E', 7: 'A' }), []);
});

test('la grille est résolue quand tout l\'alphabet est retrouvé, pas avant', () => {
    const m = faire({}, 'fin');
    const complet = {};
    m.lettres.forEach(l => { complet[m.code[l]] = l; });
    assert.ok(estResoluCode(m, complet));
    const presque = { ...complet };
    delete presque[m.code[m.lettres[0]]];
    assert.equal(estResoluCode(m, presque), false);
});

test('chaque thème donne une grille jouable', () => {
    // Un thème dont le lexique est trop maigre rendrait une grille vide, et
    // l'exercice s'ouvrirait sur rien.
    Object.keys(THEMES).forEach(theme => {
        const m = faire({ theme, nbMots: 7 }, 't-' + theme);
        const q = qualiteCode(m);
        assert.ok(q.mots >= 4, `${theme} : ${q.mots} mots seulement`);
        assert.ok(q.croisements >= 2, `${theme} : ${q.croisements} croisements`);
        assert.ok(m.lettres.length >= 8, `${theme} : ${m.lettres.length} lettres`);
    });
});

test('le générateur de fiche rend de quoi imprimer ET corriger', () => {
    const it = G.generate({ theme: 'angles', nbMots: 10, niveauMax: 3, offertes: 3 },
        { rng: makeRng('fiche'), index: 0 });
    const m = it.meta;
    assert.equal(m.numeros.length, m.hauteur);
    assert.equal(m.numeros[0].length, m.largeur);
    assert.equal(m.donnees.length, 3);
    // Le corrigé dit le code ET les mots : c'est ce que le professeur relit.
    m.lettres.forEach(l => assert.ok(it.explanation.includes(`${m.code[l]} = ${l}`)));
    m.mots.forEach(w => assert.ok(it.explanation.includes(w.mot), `${w.mot} manque au corrigé`));
});
