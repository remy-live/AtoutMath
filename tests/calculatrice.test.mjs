// LA CALCULATRICE — ce qu'elle doit répondre.
//
// Une calculatrice fausse est pire que pas de calculatrice : l'élève ne
// vérifie pas sa machine, il la croit. Ces tests tiennent les quatre choses
// qu'on lui demande de ne jamais rater — la priorité des opérations, le moins
// de signe, les degrés, et l'écriture française du résultat.

import { test } from 'node:test';
import assert from 'node:assert';
import {
    calculer, ecrire, jetons, evaluerPourAffichage, FONCTIONS, CONSTANTES
} from '../js/core/calculatrice.js';

const proche = (a, b, eps = 1e-9) =>
    assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b} ?`);

test('les quatre opérations', () => {
    assert.strictEqual(calculer('2+3'), 5);
    assert.strictEqual(calculer('7−4'), 3);
    assert.strictEqual(calculer('6×7'), 42);
    assert.strictEqual(calculer('12÷4'), 3);
    // Les signes du clavier d'ordinateur valent ceux de la machine.
    assert.strictEqual(calculer('6*7'), 42);
    assert.strictEqual(calculer('12/4'), 3);
    assert.strictEqual(calculer('7-4'), 3);
});

test('LA PRIORITÉ DES OPÉRATIONS, qui est tout le sujet au collège', () => {
    assert.strictEqual(calculer('2+3×4'), 14);      // et non 20
    assert.strictEqual(calculer('(2+3)×4'), 20);
    assert.strictEqual(calculer('2+3×4−5'), 9);
    assert.strictEqual(calculer('20−3×4'), 8);
    assert.strictEqual(calculer('100÷10÷2'), 5);    // de gauche à droite
    assert.strictEqual(calculer('12−5−3'), 4);      // et non 10
});

test('la puissance passe avant le produit, et s\'associe à droite', () => {
    assert.strictEqual(calculer('2×3^2'), 18);
    assert.strictEqual(calculer('2^3^2'), 512);     // 2^(3^2), et non 64
    assert.strictEqual(calculer('(2^3)^2'), 64);
});

test('LE MOINS DE SIGNE N\'EST PAS LE MOINS DE SOUSTRACTION', () => {
    assert.strictEqual(calculer('−5+2'), -3);
    assert.strictEqual(calculer('-5+2'), -3);
    assert.strictEqual(calculer('−5×−4'), 20);
    assert.strictEqual(calculer('3×(−4)'), -12);
    assert.strictEqual(calculer('+7'), 7);
    assert.strictEqual(calculer('−(2+3)'), -5);
});

test('la virgule française est le séparateur décimal', () => {
    proche(calculer('1,5+2,5'), 4);
    proche(calculer('0,1+0,2'), 0.3);
    proche(calculer('1.5×2'), 3);          // le point marche aussi
    assert.throws(() => calculer('1,2,3'));
});

test('les espaces des grands nombres ne gênent pas', () => {
    assert.strictEqual(calculer('12 + 8'), 20);
    assert.strictEqual(calculer('2 000 + 1'), 2001);
});

test('LES ANGLES SONT EN DEGRÉS — cos(60) vaut un demi', () => {
    proche(calculer('cos(60)'), 0.5);
    proche(calculer('sin(30)'), 0.5);
    proche(calculer('tan(45)'), 1);
    proche(calculer('sin(0)'), 0);
    // Le piège : en radians, cos(60) rendrait −0,952…
    assert.ok(calculer('cos(60)') > 0);
});

test('racine, logarithmes et valeur absolue', () => {
    assert.strictEqual(calculer('√(9)'), 3);
    assert.strictEqual(calculer('√9'), 3);
    proche(calculer('√(2)×√(2)'), 2);
    proche(calculer('log(1000)'), 3);
    proche(calculer('ln(1)'), 0);
    assert.strictEqual(calculer('abs(−7)'), 7);
});

test('une fonction s\'applique à l\'expression entre parenthèses', () => {
    assert.strictEqual(calculer('√(16+9)'), 5);
    proche(calculer('2×cos(60)'), 1);
    proche(calculer('cos(60)+sin(30)'), 1);
    proche(calculer('√(4)+√(9)'), 5);
});

test('π et e sont des nombres', () => {
    proche(calculer('π'), Math.PI);
    proche(calculer('2×π'), 2 * Math.PI);
    proche(calculer('e'), Math.E);
    proche(calculer('cos(180)'), -1);
});

test('le pour-cent divise par cent', () => {
    proche(calculer('50%'), 0.5);
    proche(calculer('200×15%'), 30);
});

test('ce qui ne veut rien dire est refusé, sans faire tomber la page', () => {
    assert.throws(() => calculer(''));
    assert.throws(() => calculer('2+'));
    assert.throws(() => calculer('(2+3'));
    assert.throws(() => calculer('2+3)'));
    assert.throws(() => calculer('×3'));
    assert.throws(() => calculer('bonjour'));
    assert.throws(() => calculer('1÷0'), /impossible/);
});

test('AUCUNE EXÉCUTION DE CODE : ce n\'est pas un `eval` déguisé', () => {
    // Si l'analyseur passait par `eval`, ces lignes s\'exécuteraient.
    assert.throws(() => calculer('alert(1)'));
    assert.throws(() => calculer('[1].length'));
    assert.throws(() => calculer('1;2'));
});

test('le résultat s\'écrit comme au cahier', () => {
    assert.strictEqual(ecrire(4), '4');
    assert.strictEqual(ecrire(-3), '-3');
    assert.strictEqual(ecrire(0.5), '0,5');
    assert.strictEqual(ecrire(1 / 3), '0,3333333333');
    // LE BRUIT BINAIRE NE S'AFFICHE PAS : 0,1 + 0,2 rend 0,3.
    assert.strictEqual(ecrire(0.1 + 0.2), '0,3');
    assert.strictEqual(ecrire(NaN), 'Erreur');
    assert.strictEqual(ecrire(Infinity), 'Erreur');
});

test('l\'affichage ne lève jamais', () => {
    assert.deepStrictEqual(evaluerPourAffichage('2+3'), { ok: true, texte: '5' });
    const raté = evaluerPourAffichage('2+');
    assert.strictEqual(raté.ok, false);
    assert.strictEqual(raté.texte, 'Erreur');
    assert.ok(raté.pourquoi);
    assert.strictEqual(evaluerPourAffichage(null).ok, false);
    assert.strictEqual(evaluerPourAffichage(undefined).ok, false);
});

test('le découpage rend des jetons lisibles', () => {
    assert.deepStrictEqual(jetons('2+3'), [
        { genre: 'nombre', valeur: 2 },
        { genre: 'op', valeur: '+' },
        { genre: 'nombre', valeur: 3 }
    ]);
    assert.strictEqual(jetons('cos(60)')[0].genre, 'fonction');
    assert.strictEqual(jetons('π')[0].valeur, Math.PI);
});

test('le catalogue de fonctions et de constantes est celui du collège', () => {
    for (const nom of ['sin', 'cos', 'tan', '√', 'ln', 'log', 'abs']) {
        assert.strictEqual(typeof FONCTIONS[nom], 'function', nom);
    }
    proche(CONSTANTES['π'], Math.PI);
    proche(CONSTANTES.e, Math.E);
});
