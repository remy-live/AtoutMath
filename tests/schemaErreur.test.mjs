// L'INSTANTANÉ D'UNE ERREUR — DIX-NEUF LIGNES DONT DÉPEND TOUT LE CARNET.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// `js/core/errorSchema.js` fabrique l'objet qu'on range quand un élève se
// trompe. C'est lui que le carnet d'erreurs relit pour afficher « tu avais
// écrit 14, il fallait 15 », et c'est lui que la fiche imprimée reprend.
//
// TROIS DÉCISIONS DANS CES DIX-NEUF LIGNES, ET CHACUNE A SA RAISON :
//
//   1. TOUT EST CONVERTI EN CHAÎNE. Une réponse d'élève arrive du champ de
//      saisie (une chaîne), mais l'attendu vient du générateur (souvent un
//      nombre). Comparer puis afficher deux types différents est la source
//      classique du « tu avais écrit 15, il fallait 15 ».
//   2. `0` ET `''` DOIVENT SURVIVRE. C'est le piège : `input || ''` écraserait
//      le zéro, et une erreur d'élève qui a répondu 0 s'afficherait vide. Le
//      code teste `!== undefined` ; cette épreuve s'oppose au jour où
//      quelqu'un « simplifiera ».
//   3. LE RESTE DU CONTEXTE PASSE. Chaque exercice a des champs à lui — la
//      figure, le barreau, la ligne du tableau — et le carnet doit pouvoir
//      REJOUER la question. Les jeter rendrait le carnet illisible pour tout
//      exercice un peu riche.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { createErrorSnapshot } from '../js/core/errorSchema.js';

test('UNE ERREUR PORTE CE QU\'IL FAUT POUR L\'AFFICHER', () => {
    const e = createErrorSnapshot({ input: '14', expected: 15, questionText: '7 + 8' });
    assert.equal(e.input, '14');
    assert.equal(e.expected, '15');
    assert.equal(e.questionText, '7 + 8');
    assert.equal(e.customMessage, '');
    // Le drapeau distingue les instantanés de ce format des erreurs d'avant.
    // Sans lui, le carnet ne saurait pas lequel des deux il relit.
    assert.equal(e.isStandardized, true);
});

test('L\'ATTENDU ET LA RÉPONSE SONT DU MÊME TYPE', () => {
    // SINON ON AFFICHE « tu avais écrit 15, il fallait 15 ».
    //
    // La réponse vient d'un champ de saisie, donc c'est une chaîne. L'attendu
    // vient du générateur, donc c'est un nombre. Les deux doivent arriver au
    // carnet sous la même forme, sans quoi la ligne qui les compare pour
    // décider d'afficher une correction se trompe.
    const e = createErrorSnapshot({ input: 15, expected: 15, questionText: '7 + 8' });
    assert.equal(typeof e.input, 'string');
    assert.equal(typeof e.expected, 'string');
    assert.equal(e.input, e.expected);

    // Y compris pour les réponses qui ne sont pas des nombres : une formule de
    // tableur, une coordonnée, un booléen.
    const f = createErrorSnapshot({ input: '=A1+B1', expected: '=A1+B1', questionText: 'la formule' });
    assert.equal(f.input, '=A1+B1');
    const g = createErrorSnapshot({ input: false, expected: true, questionText: 'vrai ou faux' });
    assert.equal(g.input, 'false');
    assert.equal(g.expected, 'true');
});

test('ZÉRO N\'EST PAS UNE ABSENCE DE RÉPONSE', () => {
    // LE PIÈGE DU `||`. Un élève qui répond 0 à « 7 − 7 » et se trompe doit
    // voir « tu avais écrit 0 ». Avec `input || ''`, le carnet afficherait une
    // case vide — et l'élève conclurait qu'il n'avait rien écrit.
    const e = createErrorSnapshot({ input: 0, expected: 0, questionText: '7 − 7' });
    assert.equal(e.input, '0');
    assert.equal(e.expected, '0');

    // La chaîne vide est un cas réel elle aussi : l'élève a validé sans rien
    // écrire. Elle doit rester une chaîne vide, pas devenir « undefined ».
    const f = createErrorSnapshot({ input: '', expected: 15, questionText: '7 + 8' });
    assert.equal(f.input, '');
});

test('UNE RÉPONSE ABSENTE DEVIENT UNE CHAÎNE VIDE, PAS « undefined »', () => {
    // « undefined » écrit en toutes lettres dans le carnet d'un élève est le
    // genre de détail qui fait perdre confiance dans tout l'écran.
    const e = createErrorSnapshot({ questionText: 'une question' });
    assert.equal(e.input, '');
    assert.equal(e.expected, '');
    assert.equal(e.questionText, 'une question');
});

test('UN ÉNONCÉ ABSENT NE DEVIENT PAS « undefined » NON PLUS', () => {
    const e = createErrorSnapshot({ input: 1, expected: 2 });
    assert.equal(e.questionText, '');
});

test('LE CONTEXTE PROPRE À L\'EXERCICE VOYAGE AVEC L\'ERREUR', () => {
    // C'est ce qui permet au carnet de REJOUER la question. Un exercice de
    // figure sans sa figure, un tableau de conversion sans sa ligne : l'élève
    // relit une erreur qu'il ne peut pas comprendre.
    const e = createErrorSnapshot({
        input: '3', expected: 4, questionText: 'combien de côtés ?',
        figure: { type: 'carre', cote: 4 }, barreau: 2, seed: 'abc'
    });
    assert.deepEqual(e.figure, { type: 'carre', cote: 4 });
    assert.equal(e.barreau, 2);
    assert.equal(e.seed, 'abc');
    // Et le contexte ne doit pas être converti en chaîne au passage : le carnet
    // a besoin de l'objet pour redessiner.
    assert.equal(typeof e.figure, 'object');
});

test('UN MESSAGE SUR MESURE REMPLACE LE MESSAGE AUTOMATIQUE', () => {
    // Certains exercices ont une explication que la comparaison brute ne peut
    // pas donner : « la bonne réponse est =A1+B1 pas 17 ».
    const e = createErrorSnapshot({
        input: '17', expected: '=A1+B1', questionText: 'la formule',
        customMessage: 'On écrit la FORMULE, pas son résultat.'
    });
    assert.equal(e.customMessage, 'On écrit la FORMULE, pas son résultat.');
});
