// SEIZE FOIS LA MÊME QUESTION N'EST PAS SEIZE ERREURS.
//
// Rémy, capture à l'appui : seize cartes identiques « 2 + 3 × 4 — ta réponse :
// 20, attendu : 14 » empilées dans le carnet, et « 26 à revoir » en pastille.
// Le journal les distinguait par leur graine, ce qui est juste pour rejouer une
// question et faux pour la compter.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    cleQuestion, fusionnerDoublons, grouperParExercice, questionsOuvertes
} from '../js/core/carnet.js';

const err = (o = {}) => ({
    id: o.id || 'calc-flash|graine-' + Math.random(),
    exoId: o.exoId || 'calc-flash',
    exoTitle: o.exoTitle || 'Flash Mult',
    corrected: !!o.corrected,
    count: o.count || 1,
    timestamp: o.timestamp || 1000,
    userAnswer: o.donne || '20',
    questionData: {
        questionText: o.texte !== undefined ? o.texte : '2 + 3 × 4',
        input: o.donne || '20',
        expected: o.attendu !== undefined ? o.attendu : '14',
        itemSeed: o.graine || null
    }
});

// --- L'identité d'une question ---------------------------------------------

test('LA MÊME QUESTION, C\'EST LE MÊME EXERCICE, LE MÊME ÉNONCÉ, LA MÊME RÉPONSE', () => {
    assert.equal(cleQuestion(err({ graine: 'a' })), cleQuestion(err({ graine: 'b' })));
    // Les trois ensemble, pas deux : « Quel est le périmètre ? » se répète
    // d'une figure à l'autre, mais rarement avec le même résultat.
    assert.notEqual(cleQuestion(err({ attendu: '14' })), cleQuestion(err({ attendu: '17' })));
    assert.notEqual(cleQuestion(err({ texte: '2 + 3 × 4' })), cleQuestion(err({ texte: '5 × 7' })));
    assert.notEqual(cleQuestion(err({ exoId: 'a' })), cleQuestion(err({ exoId: 'b' })));
});

test('SANS ÉNONCÉ, ON NE FUSIONNE PAS', () => {
    // Un angle à mesurer, une figure à nommer : la question vit dans son
    // dessin. Deux d'entre elles peuvent être aussi différentes que leurs
    // figures, et rien dans le texte ne le dit.
    assert.equal(cleQuestion(err({ texte: '' })), null);
    assert.equal(cleQuestion(err({ texte: '   ' })), null);
    const muettes = [err({ texte: '', graine: 'a' }), err({ texte: '', graine: 'b' })];
    assert.equal(fusionnerDoublons(muettes).length, 2);
});

test('la forme des projections marche aussi', () => {
    // `openErrors` rend `{exerciseId, questionText, expected}` à plat, le carnet
    // rend `{exoId, questionData:{…}}`. Les deux doivent donner la même clé.
    const plat = { exerciseId: 'calc-flash', questionText: '2 + 3 × 4', expected: '14' };
    assert.equal(cleQuestion(plat), cleQuestion(err()));
});

// --- La fusion --------------------------------------------------------------

test('SEIZE ENTRÉES IDENTIQUES DEVIENNENT UNE QUESTION VUE SEIZE FOIS', () => {
    const seize = Array.from({ length: 16 }, (_, i) =>
        err({ id: 'k' + i, graine: 'g' + i, timestamp: 1000 + i }));
    const f = fusionnerDoublons(seize);
    assert.equal(f.length, 1);
    assert.equal(f[0].count, 16);
    assert.equal(f[0].ids.length, 16, 'les quinze jumelles doivent rester corrigeables');
});

test('les répétitions déjà comptées s\'additionnent', () => {
    // Le journal compte déjà les redites d'une MÊME graine dans `count` : on
    // additionne, on ne repart pas de 1.
    const f = fusionnerDoublons([err({ id: 'a', count: 4 }), err({ id: 'b', count: 3 })]);
    assert.equal(f[0].count, 7);
});

test('ON MONTRE LA RÉPONSE LA PLUS RÉCENTE', () => {
    const f = fusionnerDoublons([
        err({ id: 'vieux', donne: '20', timestamp: 100 }),
        err({ id: 'neuf', donne: '9', timestamp: 900 })
    ]);
    assert.equal(f[0].userAnswer, '9');
    assert.equal(f[0].questionData.input, '9');
});

test('UNE SEULE ENTRÉE OUVERTE ROUVRE LA QUESTION', () => {
    // Avoir réussi la version d'hier ne solde pas celle de ce matin.
    const f = fusionnerDoublons([err({ corrected: true }), err({ corrected: false })]);
    assert.equal(f[0].corrected, false);
    const tout = fusionnerDoublons([err({ corrected: true }), err({ corrected: true })]);
    assert.equal(tout[0].corrected, true);
});

test('le compte annoncé à l\'élève est celui des questions, pas des graines', () => {
    const liste = [
        ...Array.from({ length: 16 }, (_, i) => err({ id: 'k' + i, graine: 'g' + i })),
        err({ id: 'z', texte: '5 × 7', attendu: '35' }),
        err({ id: 'y', texte: '9 × 8', attendu: '72', corrected: true })
    ];
    assert.equal(liste.length, 18);
    assert.equal(questionsOuvertes(liste).length, 2, '« 26 à revoir » pour deux questions');
});

// --- Le regroupement par exercice -------------------------------------------

test('LE CADRE DEVIENT UNE UNITÉ DE TRAVAIL', () => {
    const g = grouperParExercice([
        err({ id: 'a', graine: '1' }),
        err({ id: 'b', graine: '2' }),
        err({ id: 'c', texte: '5 × 7', attendu: '35' }),
        err({ id: 'd', texte: '9 × 8', attendu: '72', corrected: true }),
        err({ id: 'e', exoId: 'geo', exoTitle: 'Périmètres', texte: 'Périmètre ?', attendu: '24' })
    ]);
    assert.deepEqual(g.map(x => x.titre), ['Flash Mult', 'Périmètres']);

    const flash = g[0];
    assert.equal(flash.ouvertes.length, 2, 'deux questions ouvertes, pas trois entrées');
    assert.equal(flash.corrigees.length, 1);

    // UNE clé par question à rejouer, TOUTES les clés à solder ensuite.
    assert.equal(flash.familles.length, 2);
    assert.deepEqual(flash.familles[0].sort(), ['a', 'b']);
    assert.deepEqual(flash.familles[1], ['c']);
});

test('un exercice dont tout est corrigé n\'a plus rien à réviser', () => {
    const g = grouperParExercice([err({ corrected: true }), err({ texte: '5 × 7', corrected: true })]);
    assert.equal(g[0].ouvertes.length, 0);
    assert.deepEqual(g[0].familles, []);
    assert.equal(g[0].corrigees.length, 2);
});

test('une liste vide ne fabrique rien', () => {
    assert.deepEqual(fusionnerDoublons([]), []);
    assert.deepEqual(fusionnerDoublons(null), []);
    assert.deepEqual(grouperParExercice([]), []);
    assert.deepEqual(questionsOuvertes(null), []);
});
