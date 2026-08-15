import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { espacerMilliers, espacerDansTexte, sansEspaces, FINE } from '../js/core/nombres.js';
import { sameAnswer } from '../js/core/items.js';

const F = FINE;

test('l\'espace est la FINE INSÉCABLE, pas une espace ordinaire', () => {
    // U+202F. Une espace ordinaire coupe le nombre en fin de ligne, et l'on
    // croit en lire deux.
    assert.equal(F, ' ');
    assert.equal(espacerMilliers(1000), `1${F}000`);
});

test('la partie entière se groupe par trois EN PARTANT DE LA DROITE', () => {
    assert.equal(espacerMilliers(62307), `62${F}307`);
    assert.equal(espacerMilliers(1234567), `1${F}234${F}567`);
    assert.equal(espacerMilliers(123), '123');
    assert.equal(espacerMilliers(999), '999');
    // Y compris à quatre chiffres : c'est la convention de l'école.
    assert.equal(espacerMilliers(1000), `1${F}000`);
});

test('la partie décimale se groupe DEPUIS LA VIRGULE', () => {
    // Les rangs se comptent depuis la virgule dans les deux sens : grouper la
    // partie décimale par la droite ferait mentir le tableau de numération.
    assert.equal(espacerMilliers('3,1415926535'), `3,141${F}592${F}653${F}5`);
    assert.equal(espacerMilliers('0,5'), '0,5');
    assert.equal(espacerMilliers('1234,56789'), `1${F}234,567${F}89`);
});

test('une saisie EN COURS se groupe aussi — c\'est l\'usage principal', () => {
    // L'élève tape, et son nombre se découpe sous ses doigts.
    assert.equal(espacerMilliers('1'), '1');
    assert.equal(espacerMilliers('12'), '12');
    assert.equal(espacerMilliers('123'), '123');
    assert.equal(espacerMilliers('1234'), `1${F}234`);
    // Virgule tapée mais pas encore de décimale.
    assert.equal(espacerMilliers('1234,'), `1${F}234,`);
});

test('le signe est conservé, et ce qui n\'est pas un nombre passe intact', () => {
    assert.equal(espacerMilliers('-1234'), `-1${F}234`);
    assert.equal(espacerMilliers('un carré'), 'un carré');
    assert.equal(espacerMilliers(''), '');
    assert.equal(espacerMilliers(null), '');
});

test('regrouper puis dégrouper redonne exactement le nombre de départ', () => {
    for (let i = 0; i < 500; i++) {
        const n = String(i * 7919);
        assert.equal(sansEspaces(espacerMilliers(n)), n);
    }
});

test('dans un texte, seuls les grands nombres sont groupés', () => {
    // « 999 élèves » ne gagne rien à être espacé, et « 1 000 » au milieu d'une
    // phrase se lit mal si l'on descend trop bas.
    assert.equal(espacerDansTexte('62307 = 60000 + 300 + 7'),
        `62${F}307 = 60${F}000 + 300 + 7`);
    assert.equal(espacerDansTexte('Il y a 999 élèves'), 'Il y a 999 élèves');
});

test('« 62 307 » vaut « 62307 » à la correction', () => {
    // SANS CELA, L'ÉLÈVE A RAISON ET LA MACHINE DIT NON : on lui apprend à
    // écrire les nombres groupés, puis on refuse sa réponse groupée.
    assert.equal(sameAnswer(`62${F}307`, 62307), true);
    assert.equal(sameAnswer('62 307', 62307), true);
    assert.equal(sameAnswer('1 234,5', 1234.5), true);
    assert.equal(sameAnswer(`62${F}307`, 62308), false);
    // Et une réponse rédigée n'est pas recollée au passage.
    assert.equal(sameAnswer('un carré', 'uncarré'), false);
});
