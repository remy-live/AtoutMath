// « TU CONSIDÈRES COMME BON COMME RÉPONSE 53,300 » (Rémy).
//
// La Chasse aux Zéros demande d'enlever les zéros inutiles. Elle acceptait les
// réponses qui les gardaient, parce que la comparaison des réponses porte sur
// le NOMBRE — et 53,300 EST 53,3. Mesuré avant correction, sur quarante
// questions : 54 demi-réponses sur 54 étaient comptées justes, Y COMPRIS
// RECOPIER LA QUESTION. L'exercice donnait un point pour n'avoir rien fait.
//
// LA TOLÉRANCE RESTE LE DÉFAUT PARTOUT AILLEURS, et c'est voulu : un quotient
// écrit « 25,0 » est juste, et refuser ce zéro-là ferait perdre un point pour
// une broutille. C'est l'exercice qui déclare que chez lui la réponse est une
// ÉCRITURE (`ecritureExacte`).
//
// ET EN CHERCHANT CE QU'ON N'AVAIT PAS CORRIGÉ, ON A TROUVÉ PIRE. Les leurres
// de cet exercice — « il reste des zéros à la fin » — valaient le même nombre
// que la bonne réponse, donc ils étaient ÉCARTÉS de la liste des propositions
// pour ne pas faire deux réponses justes. Mesuré : sur quatre-vingts questions,
// soixante-treize n'offraient qu'UNE SEULE proposition. Un bouton, toujours
// juste. Maintenant qu'on juge l'écriture, ce sont les meilleurs leurres qui
// existent, et ils reviennent : 2 à 4 propositions par question, aucune
// comptée juste à tort.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import { evaluate, memeEcriture, sameAnswer, makeItem } from '../js/core/items.js';
import { zerosGenerator } from '../js/core/generators/numeration.js';

const questions = (n, params = { ou: 'deux', nombres: 'melange' }) =>
    Array.from({ length: n }, (_, i) =>
        zerosGenerator.generate(params, { rng: makeRng('zero' + i) }));

// Les deux moitiés du travail, prises à la RÈGLE et non aux morceaux collés :
// quand la base finit elle-même par un zéro (94,90), enlever « les zéros de la
// fin » en enlève deux.
const sansGauche = (x) => x.replace(/^0+(?=\d)/, '');
const sansDroite = (x) => x.includes(',') ? x.replace(/0+$/, '').replace(/,$/, '') : x;

test('MÊME VALEUR N\'EST PAS MÊME ÉCRITURE', () => {
    // Le comparateur par défaut : tolérant, et il doit le rester.
    assert.equal(sameAnswer('53,300', '53,3'), true);
    assert.equal(sameAnswer('0147', '147'), true);
    // Le comparateur de l'écriture : les zéros comptent.
    assert.equal(memeEcriture('53,300', '53,3'), false);
    assert.equal(memeEcriture('0147', '147'), false);
    assert.equal(memeEcriture('53,30', '53,3'), false);
    // Mais la virgule ou le point restent une affaire de clavier, pas de
    // numération — et les espaces de milliers non plus ne sont pas la leçon.
    assert.equal(memeEcriture('53.3', '53,3'), true);
    assert.equal(memeEcriture(' 53,3 ', '53,3'), true);
    assert.equal(memeEcriture('1 250', '1250'), true);
    assert.equal(memeEcriture(null, ''), true);
});

test('UN ITEM NE JUGE L\'ÉCRITURE QUE S\'IL LE DEMANDE', () => {
    const tolerant = makeItem({ seed: 's', skillId: 'k', answerKind: 'numeric', answer: '25' });
    assert.equal(tolerant.ecritureExacte, false);
    assert.equal(evaluate(tolerant, '25,0').correct, true);
    const strict = makeItem({ seed: 's', skillId: 'k', answerKind: 'numeric',
        answer: '25', ecritureExacte: true });
    assert.equal(evaluate(strict, '25,0').correct, false);
    assert.equal(evaluate(strict, '25').correct, true);
});

test('LA CHASSE AUX ZÉROS REFUSE LES RÉPONSES QUI EN GARDENT', () => {
    let refusees = 0, avecDiagnostic = 0, vues = 0;
    for (const it of questions(50)) {
        const affiche = it.meta.affiche;
        assert.equal(it.ecritureExacte, true, 'l\'exercice ne juge pas l\'écriture');
        // La bonne réponse passe, et la même avec un point aussi.
        assert.equal(evaluate(it, String(it.answer)).correct, true);
        assert.equal(evaluate(it, String(it.answer).replace(',', '.')).correct, true);
        for (const demi of [affiche, sansGauche(affiche), sansDroite(affiche)]) {
            if (demi === String(it.answer)) continue;
            vues++;
            const v = evaluate(it, demi);
            if (!v.correct) refusees++;
            if (!v.correct && v.misconception) avecDiagnostic++;
        }
    }
    assert.ok(vues >= 80, `trop peu de cas mesurés : ${vues}`);
    assert.equal(refusees, vues, 'des réponses chargées de zéros passent encore');
    // ET CHACUNE DIT CE QUI MANQUE. « Faux » sur une réponse à moitié juste
    // n'apprend rien : « bien pour les zéros de devant, il en reste à la fin »
    // nomme la moitié qui reste.
    assert.equal(avecDiagnostic, vues, 'des refus restent sans diagnostic');
});

test('ET ELLE OFFRE DE VRAIES PROPOSITIONS', () => {
    let seules = 0, justesATort = 0, leurres = 0;
    for (const it of questions(60)) {
        if (it.choices.length < 2) seules++;
        const ecrits = it.choices.map(c => String(c.value));
        assert.equal(new Set(ecrits).size, ecrits.length,
            `deux propositions identiques : ${ecrits.join(' / ')}`);
        assert.equal(evaluate(it, it.choices.find(c => c.correct).value).correct, true);
        for (const c of it.choices.filter(c => !c.correct)) {
            leurres++;
            if (evaluate(it, c.value).correct) justesATort++;
            assert.ok(c.why, 'un leurre sans « pourquoi »');
        }
    }
    assert.equal(seules, 0, `${seules} questions n'offrent qu'une proposition`);
    assert.equal(justesATort, 0, `${justesATort} leurres comptés justes`);
    assert.ok(leurres >= 100, `trop peu de leurres : ${leurres}`);
});

test('UN ENTIER NE PERD PAS SON ZÉRO DES UNITÉS', () => {
    // 250 ne s'écrit pas 25 : le zéro tient un rang. Aucune proposition, aucun
    // diagnostic ne doit donc valoir la bonne réponse par un autre chemin.
    for (const it of questions(40, { ou: 'gauche', nombres: 'entiers' })) {
        assert.ok(!String(it.answer).startsWith('0'), `réponse mal formée : ${it.answer}`);
        assert.ok(!String(it.answer).includes(','), `un entier avec virgule : ${it.answer}`);
        assert.equal(evaluate(it, it.meta.affiche).correct, false,
            'recopier la question est compté juste');
    }
});
