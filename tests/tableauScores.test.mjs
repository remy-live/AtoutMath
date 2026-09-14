// LE TABLEAU DES MEILLEURS SCORES.
//
// Rémy : « c'est un jeu, ne mets pas la solution des opérations 🙂 on peut
// plutôt faire un certain temps avec des vies et le but c'est de faire un méga
// score. ET on pourrait faire un tableau de Top Score. »
//
// Ces tests gardent les deux règles qui font qu'un tableau des records est un
// tableau des records, et non un journal de parties : une ligne par joueur, et
// le score qui monte assez vite pour qu'on ait envie de le battre.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    classer, ajouterScore, pointsChaine, multiplicateur, COMBO_MAX, TAILLE_TABLEAU
} from '../js/core/tableauScores.js';

test('UNE SEULE LIGNE PAR JOUEUR : son meilleur score', () => {
    // Sans cette règle, un élève qui joue vingt fois occupe les dix lignes à
    // lui seul, et le tableau ne dit plus rien de la classe — ce qui est
    // pourtant tout son intérêt : on y cherche les AUTRES.
    const t = classer([
        { qui: 'Léa', score: 300, quand: 1 },
        { qui: 'Léa', score: 900, quand: 2 },
        { qui: 'Léa', score: 500, quand: 3 },
        { qui: 'Tom', score: 700, quand: 4 }
    ]);
    assert.equal(t.length, 2);
    assert.deepEqual(t.map(e => e.qui), ['Léa', 'Tom']);
    assert.equal(t[0].score, 900);
});

test('à score égal, c\'est celui qui l\'a fait EN PREMIER', () => {
    // Battre un record demande de faire mieux, pas de refaire pareil.
    const t = classer([
        { qui: 'Tom', score: 500, quand: 200 },
        { qui: 'Léa', score: 500, quand: 100 }
    ]);
    assert.deepEqual(t.map(e => e.qui), ['Léa', 'Tom']);
});

test('le tableau se coupe, et il tient debout sur n\'importe quoi', () => {
    const beaucoup = Array.from({ length: 40 }, (_, i) => ({ qui: `J${i}`, score: i * 10, quand: i }));
    assert.equal(classer(beaucoup).length, TAILLE_TABLEAU);
    assert.equal(classer(beaucoup, 3).length, 3);
    // Une entrée sans score n'est pas une entrée à zéro : c'est du bruit, et
    // elle ne doit pas prendre la place de quelqu'un.
    assert.deepEqual(classer([{ qui: 'X' }, { qui: 'Y', score: null }, { qui: 'Z', score: 'abc' }]), []);
    assert.deepEqual(classer(null), []);
    assert.deepEqual(classer(undefined), []);
    // Un joueur sans nom garde quand même sa ligne — on ne perd pas un score.
    assert.equal(classer([{ qui: '', score: 10, quand: 1 }])[0].qui, '?');
});

test('LE RANG SE DIT, ET LE RECORD PERSONNEL AUSSI', () => {
    const avant = [{ qui: 'Léa', score: 900, quand: 1 }, { qui: 'Tom', score: 400, quand: 2 }];
    // Une partie qui entre au tableau connaît sa place.
    const r = ajouterScore(avant, { qui: 'Sam', score: 600, quand: 3 });
    assert.equal(r.rang, 2);
    assert.deepEqual(r.table.map(e => e.qui), ['Léa', 'Sam', 'Tom']);
    // Un record PERSONNEL, c'est faire mieux que soi — pas mieux que le
    // premier. C'est le seul compliment qu'on puisse faire sans comparer un
    // élève à plus fort que lui.
    assert.equal(ajouterScore(avant, { qui: 'Tom', score: 500, quand: 4 }).record, true);
    assert.equal(ajouterScore(avant, { qui: 'Tom', score: 300, quand: 4 }).record, false);
    // Et une PREMIÈRE partie n'est pas « un record battu » : il n'y avait rien
    // à battre. On ne crie pas victoire sur une partie sans adversaire.
    assert.equal(ajouterScore(avant, { qui: 'Sam', score: 10, quand: 5 }).record, false);
});

test('une partie hors du tableau le sait', () => {
    const plein = Array.from({ length: TAILLE_TABLEAU }, (_, i) =>
        ({ qui: `J${i}`, score: 1000 - i, quand: i }));
    assert.equal(ajouterScore(plein, { qui: 'Nouveau', score: 5, quand: 99 }).rang, 0);
});

test('LE MÉGA SCORE : la chaîne au carré, et l\'enchaînement', () => {
    // « Le but, c'est de faire un méga score. » Dix points par gemme donnaient
    // des parties à quatre cents points, ce qui n'emballe personne.
    //
    // LA LONGUEUR COMPTE AU CARRÉ : prendre cinq gemmes vaut plus du double de
    // deux fois deux. C'est ce qui pousse à chercher le grand tracé plutôt que
    // le premier venu — c'est-à-dire à faire le calcul mental qu'on veut.
    const cinq = pointsChaine({ longueur: 5 });
    const deuxFoisDeux = 2 * pointsChaine({ longueur: 2 });
    assert.ok(cinq > 2 * deuxFoisDeux, `${cinq} contre ${deuxFoisDeux}`);
    assert.equal(pointsChaine({ longueur: 3 }), 90);

    // L'ENCHAÎNEMENT multiplie, et il plafonne : sans plafond, une partie
    // parfaite finirait en nombres qu'on ne lit plus.
    assert.equal(multiplicateur(0), 1);
    assert.equal(multiplicateur(2), 2);
    assert.equal(multiplicateur(100), COMBO_MAX);
    assert.equal(pointsChaine({ longueur: 3, combo: 2 }), 180);

    // Une multiplication vaut le double d'une addition.
    assert.equal(pointsChaine({ longueur: 3, mode: 'multiplication' }), 180);

    // Et l'on ne rend jamais de score négatif ni fractionnaire, quoi qu'on
    // passe : un tableau des records n'a pas à afficher « 87,5 points ».
    for (const p of [{ longueur: 0 }, { longueur: -3, combo: -9 }, { longueur: NaN }]) {
        const v = pointsChaine(p);
        assert.ok(Number.isInteger(v) && v > 0, `${JSON.stringify(p)} → ${v}`);
    }
});
