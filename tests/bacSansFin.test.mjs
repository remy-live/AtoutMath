// « IL FAUDRAIT QUE LES JEUX BACS À SABLE NE SOIENT PAS LIMITÉS, par exemple le
// peintre ou nova ça s'arrête trop vite » (Rémy).
//
// Le bac à sable posait `nbItems: 1` pour dire « ici, ce n'est pas un devoir ».
// Le meneur, lui, ferme l'étape dès que le compte est atteint — donc à la
// PREMIÈRE réussite. MESURÉ dans le navigateur, en envoyant au meneur les
// tentatives que le jeu lui envoie lui-même : Nova, le Peintre et Tetris
// s'arrêtaient tous les trois au premier point. Ce n'étaient pas deux jeux,
// c'était tout le bac.
//
// Après : dix réussites d'affilée sans que l'étape se ferme, sur les trois.
//
// ET LA RÈGLE DU COMPTE EST DÉSORMAIS À UN SEUL ENDROIT. Elle était écrite
// trois fois dans le meneur — la réponse, le saut du professeur, le temps
// écoulé sur une question. Trois copies, c'est trois occasions de respecter le
// drapeau ici et de l'oublier là : le bac se serait arrêté par le chemin qu'on
// n'aurait pas corrigé.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { readFileSync } from 'node:fs';
import { makeStep, makePath } from '../js/core/path.js';
import { parcoursDuBac } from '../js/core/bacASable.js';
import { defaultPolicy } from '../js/core/policy.js';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const sansCommentaires = (s) => s
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const MENEUR = sansCommentaires(lire('js/core/runner.js'));

test('UNE PARTIE DU BAC EST UNE ÉTAPE SANS FIN', () => {
    const parcours = parcoursDuBac(makeStep, makePath, 'calc-nova', defaultPolicy());
    const etape = parcours.steps[0];
    assert.equal(etape.sansFin, true, 'le bac se ferme encore sur un compte');
    // Et l'en-tête ne promet pas un but : dans un bac à sable, « 7 » est un
    // score, « 7 / 1 » n'est rien.
    assert.equal(etape.sansTotal, true);
    // Ce qui faisait du bac un bac reste : pas de travail, pas d'exigence.
    assert.equal(etape.bonus, true);
    assert.equal(etape.threshold, 0);
    assert.equal(parcours.bac, true);
    assert.equal(parcours.personnel, true);
});

test('UNE ÉTAPE ORDINAIRE, ELLE, GARDE SA FIN', () => {
    // Le drapeau se demande : il ne s'attrape pas.
    const etape = makeStep('calc-add', {}, { nbItems: 6 });
    assert.equal(etape.sansFin, false);
    assert.equal(etape.sansTotal, false);
});

test('LE COMPTE NE SE DÉCIDE QU\'À UN ENDROIT', () => {
    // La comparaison brute ne doit plus exister qu'une fois : dans
    // `compteAtteint`. Ailleurs, on l'appelle.
    const brutes = MENEUR.match(/itemsResolved\.size >= this\.step\.nbItems/g) || [];
    assert.equal(brutes.length, 1,
        `la règle du compte est écrite ${brutes.length} fois : elles peuvent diverger`);
    assert.match(MENEUR, /compteAtteint\(\) \{[\s\S]{0,160}this\.step\.sansFin/);
    // Et les trois chemins qui fermaient l'étape passent par elle.
    assert.equal((MENEUR.match(/this\.compteAtteint\(\)/g) || []).length, 3);
});

test('UN JEU SANS FIN NE REÇOIT PAS DE BUT', () => {
    // Le meneur passe `nbQuestions` au jeu autonome. Avec `nbItems: 1`, il lui
    // annonçait « une question » — un jeu qui lirait ce nombre s'arrêterait de
    // lui-même, et le drapeau n'y changerait rien.
    assert.match(MENEUR, /nbQuestions: step\.sansFin \? null : step\.nbItems/);
});
