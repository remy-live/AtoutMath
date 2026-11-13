// LE TABLEUR CALCULE LUI-MÊME, SANS `eval`.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 13 novembre, capture à l'appui : « on me dit que c'est faux ». École du
// Tableur, leçon « 5. Formules (+) », A1 = 9, B1 = 0. Il écrit dans C1 la
// formule `=A1+B1` — celle que la consigne donne en exemple deux lignes plus
// haut — et le logiciel répond « le calcul 9+0 ne se fait pas ».
//
// LE CALCUL SE FAISAIT TRÈS BIEN ; c'est `new Function` qui ne se faisait pas.
// La politique de sécurité du site ne porte pas `'unsafe-eval'`, et ne doit pas
// le porter. Toutes les formules des leçons 5 à 9 tombaient donc dans le
// `catch`, chez tous les élèves. Voir `tests/csp.test.mjs`, qui garde la règle
// à la source, et `tools/tableurAuClavier.mjs`, qui le mesure au clavier.
//
// CE QUE CETTE ÉPREUVE-CI GARDE : que le calculateur écrit à la place CALCULE
// JUSTE. Le remplaçant d'un `eval` est l'endroit même où l'on se trompe de
// priorité ou de signe, et un tableur qui additionne avant de multiplier
// enseignerait le contraire du cours.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';

import { calculerExpression } from '../js/games/spreadsheet.js';

const vaut = (expr) => calculerExpression(expr).valeur;

test('LES QUATRE OPÉRATIONS, ET LES PRIORITÉS DU TABLEUR', () => {
    assert.equal(vaut('9+0'), 9);        // la formule de sa capture
    assert.equal(vaut('2+3'), 5);
    assert.equal(vaut('7-9'), -2);
    assert.equal(vaut('6*7'), 42);
    assert.equal(vaut('35/4'), 8.75);
    // LA MULTIPLICATION AVANT L'ADDITION : c'est ce que fait un tableur, et
    // c'est ce que la leçon 9 — la facture — demande d'avoir compris.
    assert.equal(vaut('2+3*4'), 14);
    assert.equal(vaut('2*3+4'), 10);
    assert.equal(vaut('(2+3)*4'), 20);
    assert.equal(vaut('2*(3+4)*2'), 28);
    // De gauche à droite à priorité égale : 20/5/2 vaut 2, pas 8.
    assert.equal(vaut('20/5/2'), 2);
    assert.equal(vaut('10-3-2'), 5);
});

test('LES DÉCIMALES ET LES SIGNES, parce que la MOYENNE en rend', () => {
    // La leçon 8 pose `total / 4` : quatre nombres pairs, mais le résultat
    // passe par une division, et l'expression reçoit « 2.5 » tel quel.
    assert.equal(vaut('2.5+2.5'), 5);
    assert.equal(vaut('0.1+0.2').toFixed(2), '0.30');
    assert.equal(vaut('-3+5'), 2);
    assert.equal(vaut('-3*-4'), 12);
    assert.equal(vaut('4--3'), 7);
    assert.equal(vaut(' 2 + 3 '), 5);
});

test('CE QUI NE SE LIT PAS EST NOMMÉ, pas appelé « Erreur »', () => {
    // « Erreur » décrit le symptôme et cache la cause — c'est la leçon payée
    // deux fois sur ce jeu. Chaque refus doit dire CE QU'IL N'A PAS SU LIRE.
    const err = (e) => calculerExpression(e).erreur;
    assert.match(err('2+'), /s'arrête au milieu/);
    assert.match(err('(2+3'), /parenthèse fermante/);
    assert.match(err('2+3)'), /parenthèse fermante de trop/);
    assert.match(err('2++'), /s'arrête|je ne sais pas lire/);
    assert.match(err('5/0'), /divise pas par zéro/);
    assert.match(err('2.5.3'), /n'est pas un nombre/);
    // Et aucun refus ne rend de valeur : un appelant qui ne lit que `valeur`
    // prendrait `undefined` pour un résultat.
    for (const e of ['2+', '(2+3', '5/0']) {
        assert.equal(calculerExpression(e).valeur, undefined, `« ${e} » rend une valeur`);
    }
});

test('ET LE RÉSULTAT NE DÉBORDE PAS : un refus n\'est jamais un nombre', () => {
    // `evaluerFormule` rend soit un nombre, soit une phrase qui commence par
    // « Erreur » — les appelants ne testent que `parseFloat`, qui rend NaN
    // dans les deux cas. Une erreur qui rendrait un nombre serait donc
    // comptée comme une réponse.
    for (const e of ['2+', 'abc', '']) {
        const r = calculerExpression(e);
        assert.equal(typeof r.erreur, 'string', `« ${e} » ne dit pas pourquoi`);
    }
});
