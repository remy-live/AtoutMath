// LES TROIS TEMPS D'UNE JUSTIFICATION.
//
// Rémy : « il faut avoir le Je sais que : / Or : / Donc : . Il faut que l'élève
// imprime ce schéma. » Ce que ces tests gardent, c'est l'invariance : les mêmes
// mots, le même ordre, le même deux-points, dans tous les chapitres. Un schéma
// qui change de forme d'un exercice à l'autre ne s'imprime dans aucune tête.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    ETAPES, ETAPE, amorce, couleurCss, trame, totalLignes, rediger
} from '../js/core/raisonnement.js';

test('TROIS TEMPS, ET L\'ORDRE EST LE FOND DU SUJET', () => {
    // Conclure avant d'avoir cité la propriété est LA faute du chapitre.
    assert.deepEqual(ETAPES.map(e => e.mot), ['Je sais que', 'Or', 'Donc']);
    assert.deepEqual(ETAPES.map(e => e.id), ['sais', 'or', 'donc']);
    assert.equal(ETAPE.or.mot, 'Or');
});

test('LE DEUX-POINTS FAIT PARTIE DE L\'AMORCE', () => {
    // « Or » seul en début de ligne se lit comme un mot oublié, pas comme une
    // amorce à compléter.
    assert.deepEqual(ETAPES.map(amorce), ['Je sais que :', 'Or :', 'Donc :']);
});

test('CHAQUE TEMPS PORTE UNE COULEUR, ET ELLE SURVIT À LA PHOTOCOPIE', () => {
    // Trois teintes distinctes, et toutes assez sombres pour rester lisibles
    // une fois grisées. La luminance perçue reste sous la moitié : au-delà, le
    // mot passe en gris clair et disparaît sur une photocopie fatiguée.
    const vues = new Set();
    ETAPES.forEach(e => {
        assert.equal(e.rgb.length, 3, `${e.mot} : couleur incomplète`);
        e.rgb.forEach(c => assert.ok(Number.isInteger(c) && c >= 0 && c <= 255));
        const [r, g, b] = e.rgb;
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        assert.ok(luminance < 0.5, `${e.mot} est trop clair pour une photocopie (${luminance.toFixed(2)})`);
        vues.add(e.rgb.join(','));
    });
    assert.equal(vues.size, 3, 'deux temps partagent une couleur');
    assert.equal(couleurCss(ETAPE.sais), 'rgb(29, 78, 216)');
});

test('CHAQUE TEMPS DIT À QUOI IL SERT', () => {
    // C'est ce texte qui alimentera l'aide et le corrigé : sans lui, « Or »
    // n'apprend rien à qui ne sait pas déjà.
    ETAPES.forEach(e => assert.ok(e.role && e.role.length > 15, `${e.mot} sans rôle`));
});

// --- La place, qui appartient au chapitre ------------------------------------

test('LA TRAME COMPTE LES LIGNES, ET DIT OÙ CHAQUE TEMPS COMMENCE', () => {
    // Les droites : la propriété du cours prend trois lignes. Pythagore : c'est
    // le calcul, dans le « Donc », qui en prend quatre. Le module porte les
    // mots, le chapitre porte la place.
    const droites = trame([2, 3, 1]);
    assert.deepEqual(droites.map(b => b.lignes), [2, 3, 1]);
    assert.deepEqual(droites.map(b => b.debut), [0, 2, 5]);
    assert.equal(totalLignes([2, 3, 1]), 6);

    const pythagore = trame([2, 2, 4]);
    assert.deepEqual(pythagore.map(b => b.debut), [0, 2, 4]);
    assert.equal(totalLignes([2, 2, 4]), 8);

    // Et les mots ne changent pas d'un chapitre à l'autre — c'est tout l'objet.
    assert.deepEqual(droites.map(b => b.amorce), pythagore.map(b => b.amorce));
});

test('UNE TRAME SANS PLACE DÉCLARÉE LAISSE QUAND MÊME UNE LIGNE', () => {
    // Zéro ligne d'écriture, c'est une amorce imprimée sur laquelle on ne peut
    // rien écrire : le pire des deux mondes.
    assert.deepEqual(trame([]).map(b => b.lignes), [1, 1, 1]);
    assert.deepEqual(trame([0, -3, 2.4]).map(b => b.lignes), [1, 1, 2]);
});

// --- Le corrigé emploie les mots de la feuille --------------------------------

test('LA JUSTIFICATION RÉDIGÉE REPREND LES AMORCES IMPRIMÉES', () => {
    const t = rediger([
        '(d₁) // (d₂) et (d₃) ⊥ (d₁)',
        'si deux droites sont parallèles, toute perpendiculaire à l\'une est perpendiculaire à l\'autre',
        '(d₃) ⊥ (d₂)'
    ]);
    assert.ok(t.startsWith('Je sais que : '), t);
    assert.ok(t.includes(' Or : '), t);
    assert.ok(t.includes(' Donc : (d₃) ⊥ (d₂)'), t);
});

test('un temps vide ne laisse ni double espace ni amorce orpheline en trop', () => {
    const t = rediger(['A', '', 'C']);
    assert.equal(t, 'Je sais que : A Or : Donc : C');
    assert.ok(!/ {2}/.test(t), 'double espace dans la rédaction');
});
