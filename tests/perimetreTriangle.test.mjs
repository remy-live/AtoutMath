// LE TOUR DU TRIANGLE — ce que la figure doit garantir.
//
// L'exercice repose sur une figure : si elle ment, tout ment. Trois promesses
// donc, et ce sont elles qu'on tient ici — le triangle EXISTE (inégalité
// triangulaire), il est LISIBLE (pas de triangle-trait), et son CODAGE dit la
// vérité (les marques sont sur les côtés égaux, et sur eux seuls).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import {
    MARCHES_TRIANGLE, estUnTriangle, assezOuvert, tirerTriangle, enonceDe,
    reponseDe, expliquer, leurresDe, sommetsTriangle, figureTriangleSvg
} from '../js/core/perimetreTriangle.js';
import { perimetreTriangleGenerator } from '../js/core/generators/perimetreTriangle.js';

const ETAPES = MARCHES_TRIANGLE.map(m => m.id);

test('L\'INÉGALITÉ TRIANGULAIRE N\'EST PAS UNE FORMALITÉ', () => {
    assert.equal(estUnTriangle(3, 4, 5), true);
    assert.equal(estUnTriangle(1, 2, 3), false, 'aplati : ce n\'est pas un triangle');
    assert.equal(estUnTriangle(1, 2, 9), false);
    // Et « ouvert » est plus exigeant : 2, 11, 11 existe, mais dessiné c'est un trait.
    assert.equal(estUnTriangle(2, 11, 11), true);
    assert.equal(assezOuvert(2, 11, 11), false);
    assert.equal(assezOuvert(5, 6, 7), true);
});

test('TOUT TRIANGLE TIRÉ EXISTE ET SE LIT', () => {
    for (const marche of ETAPES) {
        for (let k = 0; k < 60; k++) {
            const t = tirerTriangle(makeRng(`tri-${marche}-${k}`), marche, { max: 12 });
            assert.ok(assezOuvert(t.a, t.b, t.c),
                `${marche} : ${t.a}/${t.b}/${t.c} ne se dessine pas`);
            assert.equal(t.perimetre, t.a + t.b + t.c);
            [t.a, t.b, t.c].forEach(x => {
                assert.ok(Number.isInteger(x) && x >= 2 && x <= 12, `${marche} : côté ${x}`);
            });
            // La position change d'une question à l'autre : sans cela, l'isocèle
            // pointerait toujours vers le même coin et l'on apprendrait la place
            // au lieu de la figure.
            assert.ok(Number.isFinite(t.rot));
        }
    }
});

test('LE CODAGE DIT LA VÉRITÉ', () => {
    for (let k = 0; k < 40; k++) {
        const iso = tirerTriangle(makeRng(`iso${k}`), 'isocele', { max: 12 });
        assert.equal(iso.b, iso.c, 'isocèle en A : [AB] et [AC] sont égaux');
        assert.notEqual(iso.a, iso.b, 'un isocèle tiré ne doit pas être équilatéral');

        const equi = tirerTriangle(makeRng(`equi${k}`), 'equilateral', { max: 12 });
        assert.equal(equi.a, equi.b);
        assert.equal(equi.b, equi.c);

        // Un triangle quelconque n'a AUCUN côté égal : deux côtés égaux sans
        // marques enseigneraient qu'un codage est facultatif.
        const q = tirerTriangle(makeRng(`quel${k}`), 'quelconque', { max: 12 });
        assert.equal(new Set([q.a, q.b, q.c]).size, 3, `${q.a}/${q.b}/${q.c}`);
    }
});

test('UNE SEULE MESURE PAR LONGUEUR DIFFÉRENTE', () => {
    // Sur l'isocèle, écrire les deux côtés égaux supprimerait le codage de
    // l'exercice : il ne resterait qu'une addition.
    const iso = tirerTriangle(makeRng('svg-iso'), 'isocele', { max: 12 });
    const svg = figureTriangleSvg(iso);
    const nombres = (svg.match(/class="tri-cote">([^<]*)</g) || [])
        .map(x => x.replace(/.*>/, '').replace('<', '')).filter(Boolean);
    assert.equal(nombres.length, 2, `isocèle : ${nombres.length} mesures écrites`);
    assert.equal((svg.match(/class="tri-marque"/g) || []).length, 2,
        'deux marques, une par côté égal — sans compter la règle de style du même nom');

    const equi = figureTriangleSvg(tirerTriangle(makeRng('svg-equi'), 'equilateral', { max: 12 }));
    const n2 = (equi.match(/class="tri-cote">([^<]*)</g) || [])
        .map(x => x.replace(/.*>/, '').replace('<', '')).filter(Boolean);
    assert.equal(n2.length, 1, 'équilatéral : une seule mesure');
    assert.equal((equi.match(/class="tri-marque"/g) || []).length, 3, 'trois marques');
});

test('LA FIGURE EST À L\'ÉCHELLE', () => {
    // Un côté de 3 et un côté de 9 doivent SE VOIR longs et courts : sinon on
    // lit des nombres au lieu de regarder une forme.
    for (let k = 0; k < 30; k++) {
        const t = tirerTriangle(makeRng(`ech${k}`), 'quelconque', { max: 12 });
        const S = Object.fromEntries(sommetsTriangle(t).map(p => [p.n, p]));
        const d = (P, Q) => Math.hypot(P.x - Q.x, P.y - Q.y);
        const mesures = { a: d(S.B, S.C), b: d(S.A, S.C), c: d(S.A, S.B) };
        // Les rapports dessinés valent les rapports demandés, à 1 % près.
        assert.ok(Math.abs(mesures.a / mesures.c - t.a / t.c) < 0.01,
            `${t.a}/${t.c} dessiné ${(mesures.a / mesures.c).toFixed(2)}`);
        assert.ok(Math.abs(mesures.b / mesures.c - t.b / t.c) < 0.01);
        // Et la figure tient dans son cadre.
        [S.A, S.B, S.C].forEach(P => {
            assert.ok(P.x >= 0 && P.x <= 200 && P.y >= 0 && P.y <= 200, 'sommet hors du cadre');
        });
    }
});

test('LE CÔTÉ QUI MANQUE SE RETROUVE, ET C\'EST LA RÉPONSE', () => {
    for (let k = 0; k < 40; k++) {
        const t = tirerTriangle(makeRng(`man${k}`), 'manquant', { max: 12 });
        assert.ok(['a', 'b', 'c'].includes(t.cache));
        assert.equal(reponseDe(t), t[t.cache]);
        // Le périmètre est donné dans l'énoncé, le côté cherché ne l'est pas.
        const phrase = enonceDe(t);
        assert.ok(phrase.includes(String(t.perimetre)), phrase);
        assert.ok(/Combien mesure le côté \[[A-C]{2}\]/.test(phrase), phrase);
        // Et la figure porte un « ? » à la place de la mesure cachée.
        assert.ok(figureTriangleSvg(t).includes('>?<'), 'la figure doit montrer le côté inconnu');
    }
});

test('l\'explication porte la réponse, et tient en deux phrases', () => {
    for (const marche of ETAPES) {
        for (let k = 0; k < 20; k++) {
            const t = tirerTriangle(makeRng(`ex-${marche}-${k}`), marche, { max: 12 });
            const dit = expliquer(t);
            assert.ok(dit.length <= 200, `${marche} : ${dit.length} caractères`);
            assert.ok(dit.includes(String(reponseDe(t))), `${marche} : ${dit}`);
        }
    }
});

test('LES FAUSSES RÉPONSES SONT DE VRAIES ERREURS, TOUTES DIFFÉRENTES', () => {
    for (const marche of ETAPES) {
        for (let k = 0; k < 40; k++) {
            const t = tirerTriangle(makeRng(`l-${marche}-${k}`), marche, { max: 12 });
            const juste = reponseDe(t);
            const leurres = leurresDe(t);
            assert.ok(leurres.length >= 2, `${marche} : ${leurres.length} leurre(s)`);
            const vus = new Set();
            leurres.forEach(l => {
                assert.notEqual(l.value, juste, `${marche} : un leurre vaut la bonne réponse`);
                assert.equal(vus.has(l.value), false, `${marche} : leurre en double`);
                vus.add(l.value);
                assert.ok(l.value > 0, `${marche} : leurre négatif`);
                assert.ok(l.why && l.why.length > 15, `${marche} : leurre sans explication`);
            });
        }
    }
});

test('CHAQUE ÉTAPE COCHÉE EST JOUÉE, et la figure part avec la question', () => {
    const total = ETAPES.length * 2;
    const vues = new Set();
    for (let i = 0; i < total; i++) {
        const it = perimetreTriangleGenerator.generate({}, { index: i, total, rng: makeRng(`g${i}`) });
        vues.add(it.meta.marche);
        assert.ok(it.prompt.html.includes('<svg'), 'la question doit porter sa figure');
        assert.equal(it.meta.unit, 'cm');
        assert.equal(it.answerKind, 'numeric');
    }
    assert.deepEqual([...vues].sort(), [...ETAPES].sort());
});

test('la réponse se règle étape par étape', () => {
    const total = ETAPES.length;
    const params = { reponseParMarche: 'quelconque:choix' };
    for (let i = 0; i < total; i++) {
        const it = perimetreTriangleGenerator.generate(params, { index: i, total, rng: makeRng(`pm${i}`) });
        if (it.meta.marche === 'quelconque') {
            assert.equal(it.answerKind, 'choice');
            assert.equal(it.choices.length, 4);
            assert.equal(it.choices.filter(c => c.correct).length, 1);
            it.choices.forEach(c => assert.ok(c.label.endsWith(' cm'), c.label));
        } else {
            assert.equal(it.answerKind, 'numeric');
        }
    }
});
