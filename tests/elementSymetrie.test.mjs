// PAR RAPPORT À QUOI ? — nommer, écrire et lire un élément de symétrie.
//
// Trois systèmes de coordonnées se croisent ici : les CASES où calcule le
// noyau, le DESSIN décalé d'un demi-carreau, et le REPÈRE que l'élève lit,
// dont l'ordonnée MONTE alors que les lignes se comptent de haut en bas. Une
// droite écrite « x = 4 » par la question et relue « x = 4,5 » par la
// correction serait un exercice qui donne tort à qui a raison.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    axeDansLeRepere, cleElement, ecrireElement, lireElement, memeElement,
    nommerCandidat, versRepere, verifierEcriture
} from '../js/core/elementSymetrie.js';

const H = 10;

// --- L'ordonnée qui monte -----------------------------------------------------

test('L\'ORDONNÉE DU REPÈRE MONTE, ALORS QUE LES LIGNES DESCENDENT', () => {
    // La case (0 ; 0) est en HAUT à gauche du quadrillage ; dans le repère de
    // l'élève, son centre est donc tout en HAUT, à l'ordonnée 9,5 sur dix
    // lignes — et non 0,5.
    assert.deepEqual(versRepere(10, { x: 0, y: 0 }), { x: 0.5, y: 9.5 });
    assert.deepEqual(versRepere(10, { x: 0, y: 9 }), { x: 0.5, y: 0.5 });
    // L'abscisse, elle, ne bouge pas.
    assert.equal(versRepere(10, { x: 4, y: 3 }).x, 4.5);
});

test('un axe vertical garde son abscisse, un axe horizontal se retourne', () => {
    assert.deepEqual(axeDansLeRepere(10, { type: 'v', a: 3.5 }), { sens: 'x', valeur: 4 });
    assert.deepEqual(axeDansLeRepere(10, { type: 'h', a: 3.5 }), { sens: 'y', valeur: 6 });
    // Le haut du quadrillage : la ligne la plus haute porte la plus grande
    // ordonnée.
    assert.equal(axeDansLeRepere(10, { type: 'h', a: 0.5 }).valeur, 9);
});

// --- Écrire -------------------------------------------------------------------

test('LES CANDIDATS S\'ÉCRIVENT AVEC DES ENTIERS', () => {
    // Posés sur les LIGNES et les NŒUDS du quadrillage — donc en demi-cases —,
    // ils tombent sur des entiers dans le repère. Au milieu d'une case, on
    // aurait écrit « x = 3,5 », et ajouté à l'exercice une difficulté de
    // lecture décimale qui n'a rien à voir avec la symétrie.
    assert.equal(ecrireElement(H, { genre: 'axe', axe: { type: 'v', a: 3.5 } }), 'x = 4');
    assert.equal(ecrireElement(H, { genre: 'axe', axe: { type: 'h', a: 2.5 } }), 'y = 7');
    assert.equal(ecrireElement(H, { genre: 'point', centre: { x: 3.5, y: 2.5 } }), '(4 ; 7)');
});

test('on écrit en français : la virgule, jamais le point', () => {
    assert.equal(ecrireElement(H, { genre: 'axe', axe: { type: 'v', a: 3 } }), 'x = 3,5');
});

test('les candidats se nomment (d₁), (d₂), O₃…', () => {
    assert.equal(nommerCandidat('axe', 0), '(d₁)');
    assert.equal(nommerCandidat('axe', 2), '(d₃)');
    assert.equal(nommerCandidat('point', 1), 'O₂');
});

// --- Lire ---------------------------------------------------------------------

test('ON EST LARGE SUR LA FORME, JAMAIS SUR LE FOND', () => {
    // Refuser « x=4 » parce qu'il manque des espaces n'enseignerait que la
    // ponctuation.
    const attendu = { genre: 'axe', axe: { type: 'v', a: 3.5 } };
    ['x = 4', 'x=4', 'X = 4', '  x   =   4  ', '(d) : x = 4', 'd: x=4'].forEach(t => {
        assert.ok(memeElement(lireElement(H, t), attendu), `« ${t} » refusé`);
    });
});

test('un couple de coordonnées se lit sous ses formes usuelles', () => {
    const attendu = { genre: 'point', centre: { x: 3.5, y: 2.5 } };
    ['(4 ; 7)', '(4;7)', '4 ; 7', '4;7', '( 4 ; 7 )', '4/7'].forEach(t => {
        assert.ok(memeElement(lireElement(H, t), attendu), `« ${t} » refusé`);
    });
});

test('UN NOMBRE SEUL NE DÉSIGNE RIEN', () => {
    // Une verticale et une horizontale peuvent porter le même nombre : deviner
    // laquelle serait répondre à la place de l'élève.
    assert.equal(lireElement(H, '4'), null);
    assert.equal(lireElement(H, ''), null);
    assert.equal(lireElement(H, 'la droite du milieu'), null);
    assert.equal(lireElement(H, null), null);
});

test('la virgule décimale se lit comme le point', () => {
    assert.ok(memeElement(lireElement(H, 'x = 3,5'), { genre: 'axe', axe: { type: 'v', a: 3 } }));
    assert.ok(memeElement(lireElement(H, 'x = 3.5'), { genre: 'axe', axe: { type: 'v', a: 3 } }));
});

// --- L'aller-retour -----------------------------------------------------------

test('CE QU\'ON ÉCRIT SE RELIT À L\'IDENTIQUE, SUR TOUT LE QUADRILLAGE', () => {
    // C'est LE test du fichier : la question écrit, l'élève lit, l'élève écrit,
    // la correction lit. Un demi-carreau perdu en route et l'exercice ment.
    for (let a = 0.5; a < 11; a += 1) {
        for (const type of ['v', 'h']) {
            const el = { genre: 'axe', axe: { type, a } };
            const relu = lireElement(H, ecrireElement(H, el));
            assert.ok(memeElement(el, relu), `${type} = ${a} : ${ecrireElement(H, el)}`);
        }
    }
    for (let x = 0.5; x < 11; x += 1) {
        for (let y = 0.5; y < 11; y += 1) {
            const el = { genre: 'point', centre: { x, y } };
            assert.ok(memeElement(el, lireElement(H, ecrireElement(H, el))));
        }
    }
});

test('la hauteur du quadrillage compte : le même texte ne dit pas la même ligne', () => {
    // « y = 7 » désigne la deuxième ligne d'un quadrillage de neuf, et la
    // troisième d'un quadrillage de dix. Oublier de passer la hauteur serait
    // une erreur silencieuse.
    assert.notEqual(cleElement(lireElement(9, 'y = 7')), cleElement(lireElement(10, 'y = 7')));
});

// --- Comparer -----------------------------------------------------------------

test('deux écritures du même élément valent pareil', () => {
    const el = { genre: 'point', centre: { x: 3.5, y: 2.5 } };
    assert.equal(cleElement(el), 'point:3.5:2.5');
    assert.ok(memeElement(lireElement(H, '(4;7)'), lireElement(H, '( 4 ; 7 )')));
});

test('un axe et un point ne se confondent pas', () => {
    assert.ok(!memeElement(
        { genre: 'axe', axe: { type: 'v', a: 3.5 } },
        { genre: 'point', centre: { x: 3.5, y: 3.5 } }));
    assert.ok(!memeElement(null, null));
});

test('verifierEcriture distingue « illisible » de « faux »', () => {
    // Compter une faute pour une notation mal formée découragerait celui qui a
    // pourtant trouvé la droite.
    const bon = { genre: 'axe', axe: { type: 'v', a: 3.5 } };
    assert.deepEqual(verifierEcriture(H, 'x = 4', bon), { lisible: true, juste: true, lu: verifierEcriture(H, 'x = 4', bon).lu });
    assert.equal(verifierEcriture(H, 'x = 5', bon).lisible, true);
    assert.equal(verifierEcriture(H, 'x = 5', bon).juste, false);
    assert.equal(verifierEcriture(H, 'la droite du haut', bon).lisible, false);
    assert.equal(verifierEcriture(H, 'la droite du haut', bon).juste, false);
});
