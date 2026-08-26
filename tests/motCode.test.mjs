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
    theme: 'angles', niveauMax: 3, taille: 'moyenne', essais: 4,
    rng: makeRng(cle), rngPour: (i) => makeRng(`${cle}-${i}`), ...opts
});

/** Les cases qu'un mot posé occupe. */
const casesDe = (d) => Array.from({ length: d.mot.length }, (_, i) =>
    (d.dir === 'h' ? `${d.x + i},${d.y}` : `${d.x},${d.y + i}`));

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

test('la grille est un RECTANGLE, pas une croix de mots croisés', () => {
    // Rémy : « moi ça tenait sur une grille rectangulaire ». Deux choses à
    // vérifier : que le rectangle est bien plein — sinon c'est une croix
    // entourée de noir — et qu'aucune de ses bordures n'est entièrement muette,
    // ce qui voudrait dire qu'on a annoncé une largeur qu'on n'occupe pas.
    for (let i = 0; i < 12; i++) {
        const m = faire({}, 'rect' + i);
        const blanches = m.cases.flat().filter(c => c !== null).length;
        const part = blanches / (m.largeur * m.hauteur);
        assert.ok(part >= 0.4, `rectangle rempli à ${(part * 100).toFixed(0)} % seulement`);
        assert.ok(m.cases[0].some(c => c !== null), 'première ligne vide');
        assert.ok(m.cases[m.hauteur - 1].some(c => c !== null), 'dernière ligne vide');
        assert.ok(m.cases.some(l => l[0] !== null), 'première colonne vide');
        assert.ok(m.cases.some(l => l[m.largeur - 1] !== null), 'dernière colonne vide');
        m.cases.forEach(l => assert.equal(l.length, m.largeur, 'ligne dépareillée'));
    }
});

test('on part d\'un MOT ENTIER, écrit en clair dans la grille', () => {
    // Rémy : « je partais d'un mot et il fallait compléter ». Le mot donné doit
    // être un mot de la grille, posé à sa place, et ses lettres doivent être
    // exactement celles qu'on offre.
    const m = faire({}, 'depart');
    assert.equal(m.depart.length, 1);
    const d = m.depart[0];
    assert.ok(m.mots.some(w => w.mot === d.mot && w.x === d.x && w.y === d.y && w.dir === d.dir));
    casesDe(d).forEach(cle => {
        const [x, y] = cle.split(',').map(Number);
        assert.ok(m.donnees.includes(m.cases[y][x]), `${cle} n'est pas donnée`);
    });
    assert.deepEqual(m.donnees, [...new Set(d.mot.split(''))].sort());
    // Et c'est le mot qui porte le PLUS de lettres différentes : c'est lui qui
    // allume le plus de cases ailleurs dans la grille.
    const mieux = Math.max(...m.mots.filter(w => w.duTheme)
        .map(w => new Set(w.mot.split('')).size));
    assert.equal(new Set(d.mot.split('')).size, mieux);
});

test('le mot de départ ne résout jamais la grille, et zéro reste un réglage', () => {
    const m = faire({ motsOfferts: 3 }, 'trop');
    assert.ok(m.donnees.length < m.lettres.length);
    assert.equal(estResoluCode(m, saisieInitiale(m)), false);
    const rien = faire({ motsOfferts: 0 }, 'zero');
    assert.deepEqual(rien.donnees, []);
    assert.deepEqual(rien.depart, []);
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
        const m = faire({ theme, taille: 'petite' }, 't-' + theme);
        const q = qualiteCode(m);
        assert.ok(q.mots >= 4, `${theme} : ${q.mots} mots seulement`);
        assert.ok(q.croisements >= 2, `${theme} : ${q.croisements} croisements`);
        assert.ok(m.lettres.length >= 8, `${theme} : ${m.lettres.length} lettres`);
    });
});

test('le générateur de fiche rend de quoi imprimer ET corriger', () => {
    const it = G.generate({ theme: 'angles', taille: 'moyenne', niveauMax: 3, motsOfferts: 1 },
        { rng: makeRng('fiche'), index: 0 });
    const m = it.meta;
    assert.equal(m.numeros.length, m.hauteur);
    assert.equal(m.numeros[0].length, m.largeur);
    // La fiche porte le mot de départ : c'est lui que l'impression souligne.
    assert.equal(m.depart.length, 1);
    assert.ok(it.explanation.includes(m.depart[0].mot));
    // Le corrigé dit le code ET les mots : c'est ce que le professeur relit.
    m.lettres.forEach(l => assert.ok(it.explanation.includes(`${m.code[l]} = ${l}`)));
    m.mots.forEach(w => assert.ok(it.explanation.includes(w.mot), `${w.mot} manque au corrigé`));
});
