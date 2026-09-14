import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spellInteger, digitAtRank, stripUselessZeros, formatFr, spellDecimalRank, valueOfRank } from '../js/core/numberWords.js';

test('unités et adolescents', () => {
    const attendu = ['zéro','un','deux','trois','quatre','cinq','six','sept','huit','neuf',
                     'dix','onze','douze','treize','quatorze','quinze','seize',
                     'dix-sept','dix-huit','dix-neuf'];
    attendu.forEach((mot, n) => assert.equal(spellInteger(n), mot, `pour ${n}`));
});

test('les dizaines et leurs pièges', () => {
    const cas = {
        20: 'vingt', 21: 'vingt et un', 22: 'vingt-deux',
        30: 'trente', 31: 'trente et un', 35: 'trente-cinq',
        // 70 et 90 se construisent sur 60 et 80
        70: 'soixante-dix', 71: 'soixante et onze', 72: 'soixante-douze', 79: 'soixante-dix-neuf',
        // « quatre-vingts » prend un s seul, pas suivi d'un nombre, et jamais de « et »
        80: 'quatre-vingts', 81: 'quatre-vingt-un', 89: 'quatre-vingt-neuf',
        90: 'quatre-vingt-dix', 91: 'quatre-vingt-onze', 99: 'quatre-vingt-dix-neuf'
    };
    for (const [n, mot] of Object.entries(cas)) assert.equal(spellInteger(Number(n)), mot, `pour ${n}`);
});

test('« cent » s\'accorde seulement s\'il est multiplié et final', () => {
    assert.equal(spellInteger(100), 'cent');
    assert.equal(spellInteger(125), 'cent vingt-cinq');
    assert.equal(spellInteger(200), 'deux cents');
    assert.equal(spellInteger(203), 'deux cent trois');
    assert.equal(spellInteger(324), 'trois cent vingt-quatre');   // exemple de la fiche
    assert.equal(spellInteger(800), 'huit cents');
    assert.equal(spellInteger(812), 'huit cent douze');
});

test('« mille » est invariable', () => {
    assert.equal(spellInteger(1000), 'mille');
    assert.equal(spellInteger(2000), 'deux mille');
    assert.equal(spellInteger(2500), 'deux mille cinq cents');
    assert.equal(spellInteger(1889), 'mille huit cent quatre-vingt-neuf');  // fiche : tour Eiffel
    assert.equal(spellInteger(18038), 'dix-huit mille trente-huit');
    assert.equal(spellInteger(200005), 'deux cent mille cinq');
    assert.equal(spellInteger(250030), 'deux cent cinquante mille trente');
    // « quatre-vingts » perd aussi son s devant mille
    assert.equal(spellInteger(80000), 'quatre-vingt mille');
    assert.equal(spellInteger(80500), 'quatre-vingt mille cinq cents');
});

test('millions et milliards', () => {
    assert.equal(spellInteger(1000000), 'un million');
    assert.equal(spellInteger(2500000), 'deux millions cinq cent mille');
    assert.equal(spellInteger(200000000), 'deux cents millions');
    assert.equal(spellInteger(1000400000), 'un milliard quatre cent mille');
});

test('rang d\'un chiffre, parties entière et décimale', () => {
    assert.equal(digitAtRank(4786, 1), 8, 'dizaines de 4 786');
    assert.equal(digitAtRank(1310, 0), 0, 'unités de 1 310');
    assert.equal(digitAtRank(1845.22, 2), 8, 'centaines de 1 845,22');
    assert.equal(digitAtRank(437.12, -1), 1, 'dixièmes de 437,12');
    assert.equal(digitAtRank(104.453, -2), 5, 'centièmes de 104,453');
    assert.equal(digitAtRank(3453.006, -3), 6, 'millièmes de 3 453,006');
    assert.equal(digitAtRank(35425, 3), 5, 'unités de mille de 35 425');
    // Piège du flottant : 0,1 × 3 ne vaut pas exactement 0,3 en binaire.
    assert.equal(digitAtRank(0.3, -1), 3);
    assert.equal(digitAtRank(0.07, -2), 7);
});

test('suppression des zéros inutiles', () => {
    assert.equal(stripUselessZeros('12,700'), '12,7');
    assert.equal(stripUselessZeros('0001,120'), '1,12');
    assert.equal(stripUselessZeros('040,0'), '40');
    assert.equal(stripUselessZeros('003,000'), '3');
    assert.equal(stripUselessZeros('17,070'), '17,07');   // le 0 du milieu reste
    assert.equal(stripUselessZeros('003000'), '3000');    // ceux de droite d'un entier restent
    assert.equal(stripUselessZeros('0'), '0');
});

test('groupement par tranches de trois', () => {
    // L'ESPACE EST UNE FINE INSÉCABLE (U+202F), pas une espace ordinaire :
    // « 123 456 » ne doit jamais se couper en fin de ligne, sinon on croit
    // lire deux nombres.
    const F = '\u202F';
    assert.equal(formatFr(123456), `123${F}456`);
    assert.equal(formatFr(1000), `1${F}000`);
    assert.equal(formatFr(123456789876), `123${F}456${F}789${F}876`);
    assert.equal(formatFr(2730.5), `2${F}730,5`);
    // Et la partie décimale se groupe DEPUIS LA VIRGULE : les rangs se
    // comptent dans les deux sens à partir d'elle.
    assert.equal(formatFr(3.1415926, 7), `3,141${F}592${F}6`);
});

test('nombres exprimés en unités d\'un rang', () => {
    assert.equal(spellDecimalRank(3, 1), 'trois dixièmes');
    assert.equal(spellDecimalRank(35, 2), 'trente-cinq centièmes');
    assert.equal(spellDecimalRank(212, 2), 'deux cent douze centièmes');
    assert.equal(valueOfRank(3, 1), 0.3);
    assert.equal(valueOfRank(35, 2), 0.35);
    assert.equal(valueOfRank(212, 2), 2.12);
    assert.equal(valueOfRank(212, 1), 21.2);
});
