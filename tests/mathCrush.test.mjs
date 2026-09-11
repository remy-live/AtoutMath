import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    OPERATIONS, operationDe, valeurChaine, expressionChaine, depasse, disposerPlateau
} from '../js/core/mathCrush.js';

test('une chaîne vaut sa somme ou son produit, selon le mode', () => {
    assert.equal(valeurChaine([3, 4, 5], 'addition'), 12);
    assert.equal(valeurChaine([3, 4, 5], 'multiplication'), 60);
    // Une chaîne vide ne vaut PAS l'élément neutre : afficher « produit : 1 »
    // avant d'avoir touché la moindre case n'aurait aucun sens.
    assert.equal(valeurChaine([], 'addition'), 0);
    assert.equal(valeurChaine([], 'multiplication'), 0);
    assert.equal(valeurChaine([7], 'multiplication'), 7);
});

test('l\'expression écrit le CALCUL, signe compris', () => {
    // Rémy : « pour la cible, on ne sait pas si on doit additionner ou
    // multiplier ». C'est ici que ça se règle : on ne montre plus un total nu.
    assert.equal(expressionChaine([3, 4], 'addition'), '3 + 4 = 7');
    assert.equal(expressionChaine([3, 4], 'multiplication'), '3 × 4 = 12');
    assert.equal(expressionChaine([5], 'addition'), '5 = 5');
    assert.equal(expressionChaine([], 'addition'), '');
});

test('un mode inconnu retombe sur l\'addition plutôt que de casser', () => {
    assert.equal(operationDe('bidon'), OPERATIONS.addition);
    assert.equal(valeurChaine([2, 3], undefined), 5);
});

test('le dépassement ne se signale qu\'à partir de deux cases', () => {
    // Une première case plus grande que la cible arrive tout le temps ; la
    // peindre en rouge dès le premier doigt posé ferait clignoter le plateau.
    assert.equal(depasse([9], 5, 'addition'), false);
    assert.equal(depasse([3, 4], 5, 'addition'), true);
    assert.equal(depasse([2, 3], 5, 'addition'), false, 'pile la cible n\'est pas un dépassement');
    assert.equal(depasse([3, 4], 12, 'multiplication'), false);
    assert.equal(depasse([5, 4], 12, 'multiplication'), true);
    assert.equal(depasse([], 5, 'addition'), false);
});

test('le plateau est centré dans ce qui reste sous le bandeau', () => {
    // Rémy : « c'est bizarre comment apparaît le plateau ». Il ne l'était plus
    // dès lors qu'on cesse de réserver cent pixels quelle que soit la hauteur.
    const P = disposerPlateau(800, 600, 6, 7);
    assert.ok(P.cote > 0);
    assert.equal(P.w, P.cote * 6);
    assert.equal(P.h, P.cote * 7);
    // Centré horizontalement, au pixel près.
    assert.ok(Math.abs((P.x + P.w / 2) - 400) <= 1);
    // Et il tient : rien ne déborde de la boîte.
    assert.ok(P.x >= 0 && P.y >= P.bandeau);
    assert.ok(P.x + P.w <= 800 && P.y + P.h <= 600);
});

test('le bandeau suit la hauteur au lieu d\'être fixe, et reste borné', () => {
    const petit = disposerPlateau(400, 300, 6, 7);
    const grand = disposerPlateau(1400, 1000, 6, 7);
    assert.ok(petit.bandeau < grand.bandeau, 'le bandeau ne suit pas la hauteur');
    assert.ok(petit.bandeau >= 64, 'le bandeau devient illisible');
    assert.ok(grand.bandeau <= 128, 'le bandeau mange le plateau');
});

test('le plateau tient dans toutes les boîtes qu\'on peut lui donner', () => {
    // Téléphone debout, téléphone couché, tablette, bureau : dans les quatre,
    // les cases restent carrées et rien ne sort du cadre.
    for (const [w, h] of [[360, 640], [640, 360], [820, 1180], [1280, 720], [1920, 1080]]) {
        const P = disposerPlateau(w, h, 6, 7);
        assert.ok(P.x >= 0, `${w}×${h} : déborde à gauche`);
        assert.ok(P.x + P.w <= w, `${w}×${h} : déborde à droite`);
        assert.ok(P.y >= P.bandeau, `${w}×${h} : monte sur le bandeau`);
        assert.ok(P.y + P.h <= h, `${w}×${h} : déborde en bas`);
    }
});
