// LES CROISÉS DU CALCUL — deux égalités qui se croisent sur un chiffre.
//
// RÉMY, quatre pages d'un magazine de jeux à l'appui : « j'aimerais bien ces
// jeux en français et en rapport avec les maths ». Celui-ci s'appelait « Cross
// Wits » : des LETTRES à placer pour former deux mots. Les lettres sont
// devenues des CHIFFRES, et les mots des ÉGALITÉS.
//
// CE N'EST PAS UN EXERCICE DE CALCUL. Un exercice demande « combien font
// 3 + 4 ? » et l'élève répond. Ici il n'y a pas de question : il y a une
// contrainte, et l'on cherche ce qui la satisfait. Le chiffre du croisement
// appartient aux deux calculs à la fois, et c'est lui qui fait le raisonnement.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import {
    genererCroise, verifierCroise, solutionCroise, egalites, enCases,
    RANGS_CHIFFRES, PALIERS_CROISES
} from '../js/core/croises.js';

test('LES ÉGALITÉS TIENNENT TOUTES SUR UN CHIFFRE', () => {
    // Une case, un signe : dès qu'un nombre en occupe deux, la croix cesse
    // d'être une croix — le croisement pourrait tomber au milieu d'un nombre.
    for (const e of egalites(['+', '−', '×'])) {
        for (const x of [e.a, e.b, e.c]) {
            assert.ok(Number.isInteger(x) && x >= 1 && x <= 9, `${e.a} ${e.op} ${e.b} = ${e.c}`);
        }
        const vaut = e.op === '+' ? e.a + e.b : (e.op === '−' ? e.a - e.b : e.a * e.b);
        assert.equal(vaut, e.c, `${e.a} ${e.op} ${e.b} = ${e.c} est faux`);
    }
    // Et il y en a assez pour que le jeu ne se répète pas.
    assert.ok(egalites(['+']).length >= 30, 'trop peu d\'additions');
    assert.ok(egalites(['+', '−', '×']).length >= 90, 'trop peu d\'égalités');
});

test('LE CROISEMENT TOMBE SUR UN CHIFFRE, JAMAIS SUR UN SIGNE', () => {
    // Un croisement sur le « + » n'appartiendrait à personne : le signe n'est
    // ni dans un calcul ni dans l'autre.
    for (let i = 0; i < 200; i++) {
        const g = genererCroise({ rng: makeRng('c' + i), operations: ['+', '−', '×'] });
        assert.ok(g, `pas de croix au tirage ${i}`);
        assert.ok(RANGS_CHIFFRES.includes(g.rangee), `rangée ${g.rangee}`);
        assert.ok(RANGS_CHIFFRES.includes(g.colonne), `colonne ${g.colonne}`);
        const partage = g.cases.get(g.rangee * 5 + g.colonne);
        assert.match(partage, /^[1-9]$/, `le croisement porte « ${partage} »`);
        // Et ce chiffre est bien celui des DEUX calculs à cet endroit.
        assert.equal(enCases(g.h)[g.colonne], partage);
        assert.equal(enCases(g.v)[g.rangee], partage);
    }
});

test('LE FABRICANT NE PRODUIT QUE DES CROIX RÉSOLUBLES', () => {
    for (const [nom, P] of Object.entries(PALIERS_CROISES)) {
        for (let i = 0; i < 80; i++) {
            const g = genererCroise({ rng: makeRng(nom + i), ...P });
            assert.ok(g, `${nom} : pas de croix au tirage ${i}`);
            // Sa propre solution passe son propre juge.
            assert.equal(verifierCroise(g, solutionCroise(g)).ok, true, `${nom} tirage ${i}`);
            // Il y a autant de jetons que de trous, et ce sont les bons.
            assert.equal(g.jetons.length, g.aTrouver.length, `${nom} : jetons et trous diffèrent`);
            const attendus = g.aTrouver.map(x => g.cases.get(x)).sort();
            assert.deepEqual([...g.jetons].sort(), attendus, `${nom} : les jetons ne collent pas`);
            // On efface des CHIFFRES, jamais des signes.
            g.aTrouver.forEach(x => assert.match(g.cases.get(x), /^[1-9]$/,
                `${nom} : un signe a été effacé`));
            // Et le palier tient sa promesse sur le nombre de chiffres donnés.
            const chiffres = [...g.cases.keys()].filter(x => /^[1-9]$/.test(g.cases.get(x)));
            assert.equal(chiffres.length - g.aTrouver.length, P.donne,
                `${nom} : ${chiffres.length - g.aTrouver.length} chiffre(s) donné(s)`);
        }
    }
});

test('LE JUGE RELIT LES DEUX LIGNES, ET NE COMPARE PAS À SA SOLUTION', () => {
    const g = genererCroise({ rng: makeRng('juge'), operations: ['+'], donne: 1 });
    const sol = solutionCroise(g);

    // Une case vide se dit avant tout le reste.
    const partiel = { ...sol };
    delete partiel[g.aTrouver[0]];
    const r1 = verifierCroise(g, partiel);
    assert.equal(r1.ok, false);
    assert.equal(r1.problemes[0].genre, 'vides');

    // Un chiffre faux : on dit LA ligne, et ce qu'elle devrait faire.
    const faux = { ...sol };
    const i = g.aTrouver[0];
    faux[i] = String((Number(sol[i]) % 9) + 1);
    const r2 = verifierCroise(g, faux);
    assert.equal(r2.ok, false);
    assert.ok(r2.problemes.some(p => p.genre === 'faux'));
    assert.match(r2.problemes[0].message, /font \d/, r2.problemes[0].message);

    assert.equal(verifierCroise(g, sol).ok, true);
});

test('UN AUTRE PLACEMENT VALABLE EST ACCEPTÉ', () => {
    // « 3 + 4 = 7 » et « 4 + 3 = 7 » emploient les mêmes jetons : refuser le
    // second parce qu'il n'est pas celui qu'on avait en tête serait une faute
    // d'énoncé, pas de l'élève.
    const g = {
        rangee: 0, colonne: 0,
        h: { a: 3, op: '+', b: 4, c: 7 }, v: { a: 3, op: '+', b: 2, c: 5 },
        cases: new Map([
            [0, '3'], [1, '+'], [2, '4'], [3, '='], [4, '7'],
            [5, '+'], [10, '2'], [15, '='], [20, '5']
        ]),
        aTrouver: [0, 2, 4],
        jetons: ['3', '4', '7']
    };
    assert.equal(verifierCroise(g, { 0: '3', 2: '4', 4: '7' }).ok, true);
    // Et la commutativité aussi, quand elle tient : ici le 3 est partagé, donc
    // l'échanger casse la colonne — le juge doit le dire, pas l'ignorer.
    const echange = verifierCroise(g, { 0: '4', 2: '3', 4: '7' });
    assert.equal(echange.ok, false);
    assert.match(echange.problemes.map(p => p.message).join(' '), /colonne/);
});
