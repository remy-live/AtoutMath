// L'atelier de géométrie : ce qui est jugé juste, et ce qui ne l'est pas.
//
// Le jugement porte sur la FIGURE, pas sur l'outil : ces tests fabriquent donc
// des états de feuille à la main, exactement comme GéoMaster les sérialise,
// et vérifient le verdict.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    CONSIGNES, consigneDe, tirerConsigne, departDe, juger, analyser,
    estDepart, demoMediatrice
} from '../js/core/geoConstruction.js';

const FEUILLE = { w: 800, h: 500 };
const rngFixe = { int: (a) => a };   // tirages déterministes : la borne basse

const pt = (id, x, y, label = '') => ({
    type: 'Point', id, x, y, label, showLabel: !!label, parentIds: [], subType: null
});
const lin = (type, id, a, b) => ({ type, id, p1Id: a, p2Id: b });
const cercle = (id, c, b) => ({ type: 'Circle', id, p1Id: c, p2Id: b });

/** L'état d'une feuille = la figure de départ + ce que l'élève a ajouté. */
const feuille = (depart, ajouts) => JSON.stringify([...depart.objets, ...ajouts]);

const depart = (id) => departDe(consigneDe(id), FEUILLE, rngFixe);
const verdict = (id, dep, ajouts) => juger(consigneDe(id), feuille(dep, ajouts), dep.reperes);

// --- Lecture d'un état ------------------------------------------------------

test('analyser lit points, droites et cercles', () => {
    const fig = analyser(JSON.stringify([
        pt('a', 0, 0, 'A'), pt('b', 100, 0, 'B'),
        lin('Segment', 's', 'a', 'b'),
        cercle('c', 'a', 'b')
    ]));
    assert.equal(fig.points.length, 2);
    assert.equal(fig.droites.length, 1);
    assert.equal(fig.cercles.length, 1);
    assert.equal(fig.cercles[0].rayon, 100);
    assert.deepEqual(fig.droites[0].u, { x: 1, y: 0 });
});

test('analyser survit à un état illisible ou vide', () => {
    for (const mauvais of ['', null, '{', 'null', '"texte"']) {
        const fig = analyser(mauvais);
        assert.deepEqual([fig.points.length, fig.droites.length, fig.cercles.length], [0, 0, 0]);
    }
});

test('une perpendiculaire tracée à l\'outil garde la direction de sa référence', () => {
    // L'outil ne stocke pas deux points : il stocke le point traversé et la
    // droite de référence. Sans remonter cette chaîne, la construction la plus
    // naturelle serait jugée absente.
    const fig = analyser(JSON.stringify([
        pt('p', 0, 0), pt('q', 100, 0), lin('Line', 'd', 'p', 'q'),
        pt('a', 40, -60),
        { type: 'PerpendicularLine', id: 'perp', p1Id: 'a', refLineId: 'd' }
    ]));
    const perp = fig.droites.find(d => d.id === 'perp');
    assert.ok(perp, 'la perpendiculaire doit être lue');
    assert.ok(Math.abs(perp.u.x) < 1e-6, 'elle est verticale quand (d) est horizontale');
});

test('une chaîne de références abîmée ne fait pas boucler la lecture', () => {
    const fig = analyser(JSON.stringify([
        { type: 'ParallelLine', id: 'a', p1Id: 'p', refLineId: 'b' },
        { type: 'ParallelLine', id: 'b', p1Id: 'p', refLineId: 'a' },
        pt('p', 0, 0)
    ]));
    assert.equal(fig.droites.length, 0);
});

test('les objets de la figure de départ se reconnaissent', () => {
    assert.ok(estDepart('dep-A'));
    assert.ok(!estDepart('abc123'));
    assert.ok(!estDepart(undefined));
});

// --- Les figures de départ --------------------------------------------------

test('chaque consigne pose une figure de départ dans la feuille', () => {
    for (const c of CONSIGNES) {
        const d = departDe(c, FEUILLE, rngFixe);
        assert.ok(d.objets.length > 0, c.id + ' : figure vide');
        assert.ok(d.objets.every(o => estDepart(o.id)), c.id + ' : identifiants non préfixés');
        JSON.parse(d.json);   // doit être du JSON valide
        for (const o of d.objets) {
            if (o.type !== 'Point') continue;
            assert.ok(o.x > 0 && o.x < FEUILLE.w, `${c.id} : point hors feuille en x`);
            assert.ok(o.y > 0 && o.y < FEUILLE.h, `${c.id} : point hors feuille en y`);
        }
    }
});

test('une petite feuille rabat la figure au lieu de la faire déborder', () => {
    const petite = { w: 320, h: 260 };
    for (const c of CONSIGNES) {
        const d = departDe(c, petite, rngFixe);
        for (const o of d.objets) {
            if (o.type !== 'Point') continue;
            assert.ok(o.x >= 0 && o.x <= petite.w, `${c.id} : ${o.id} déborde en x`);
            assert.ok(o.y >= 0 && o.y <= petite.h, `${c.id} : ${o.id} déborde en y`);
        }
    }
});

test('la figure suit la partie VISIBLE de la feuille, pas son origine', () => {
    // La feuille de GéoMaster fait 3000×2000 et se déplace sous la fenêtre :
    // posée à l'origine, la figure de départ tomberait hors de l'écran.
    const vue = { w: 700, h: 450, x: 900, y: 600 };
    for (const c of CONSIGNES) {
        const d = departDe(c, vue, rngFixe);
        for (const o of d.objets) {
            if (o.type !== 'Point') continue;
            assert.ok(o.x >= vue.x && o.x <= vue.x + vue.w, `${c.id} : ${o.id} hors du cadre vu (x)`);
            assert.ok(o.y >= vue.y && o.y <= vue.y + vue.h, `${c.id} : ${o.id} hors du cadre vu (y)`);
        }
    }
});

test('tirerConsigne respecte un choix imposé et évite la répétition', () => {
    assert.equal(tirerConsigne('cercle', rngFixe).id, 'cercle');
    // Une liste blanche : le professeur n'ouvre que ce qu'il a enseigné.
    const lot = ['milieu', 'cercle'];
    for (let i = 0; i < 12; i++) {
        assert.ok(lot.includes(tirerConsigne(lot, null).id));
    }
    // Deux fois de suite la même consigne, c'est décourageant.
    for (let i = 0; i < 12; i++) {
        assert.notEqual(tirerConsigne('aleatoire', null, 'mediatrice').id, 'mediatrice');
    }
});

// --- Le milieu --------------------------------------------------------------

test('le milieu : juste au milieu, faux ailleurs', () => {
    const d = depart('milieu');
    const { A, B } = d.reperes;
    const M = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };

    assert.ok(verdict('milieu', d, [pt('i', M.x, M.y, 'I')]).ok);
    // À un quart du segment : sur la droite, mais pas au milieu.
    const quart = verdict('milieu', d, [pt('i', A.x + (B.x - A.x) / 4, A.y + (B.y - A.y) / 4, 'I')]);
    assert.ok(!quart.ok);
    assert.match(quart.message, /pas au milieu/);
    // Hors du segment.
    const ailleurs = verdict('milieu', d, [pt('i', M.x, M.y - 90, 'I')]);
    assert.ok(!ailleurs.ok);
    assert.match(ailleurs.message, /pas sur le segment/);
    // Rien.
    assert.match(verdict('milieu', d, []).message, /Aucun point/);
});

test('le milieu suit A et B si l\'élève les déplace', () => {
    const d = depart('milieu');
    // L'élève tire le point A ailleurs : le milieu attendu bouge avec lui.
    const Abis = { x: 100, y: 100 }, B = d.reperes.B;
    const etat = JSON.stringify([
        pt('dep-A', Abis.x, Abis.y, 'A'), pt('dep-B', B.x, B.y, 'B'),
        lin('Segment', 'dep-AB', 'dep-A', 'dep-B'),
        pt('i', (Abis.x + B.x) / 2, (Abis.y + B.y) / 2, 'I')
    ]);
    assert.ok(juger(consigneDe('milieu'), etat, d.reperes).ok);
});

// --- La médiatrice ----------------------------------------------------------

test('la médiatrice : les deux conditions, et rien qu\'une ne suffit pas', () => {
    const d = depart('mediatrice');
    const { A, B } = d.reperes;
    const M = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
    const n = { x: -(B.y - A.y), y: B.x - A.x };   // normale à (AB)

    const droite = (id, P, u) => [
        pt(id + '1', P.x - u.x, P.y - u.y), pt(id + '2', P.x + u.x, P.y + u.y),
        lin('Line', id, id + '1', id + '2')
    ];

    assert.ok(verdict('mediatrice', d, droite('m', M, n)).ok, 'la médiatrice doit passer');

    // Perpendiculaire, mais pas par le milieu.
    const decalee = { x: A.x + (B.x - A.x) * 0.2, y: A.y + (B.y - A.y) * 0.2 };
    const v1 = verdict('mediatrice', d, droite('m', decalee, n));
    assert.ok(!v1.ok);
    assert.match(v1.message, /MILIEU/);

    // Par le milieu, mais pas perpendiculaire (la droite (AB) elle-même).
    const v2 = verdict('mediatrice', d, droite('m', M, { x: B.x - A.x, y: B.y - A.y }));
    assert.ok(!v2.ok);
    assert.match(v2.message, /PERPENDICULAIRE/);

    // Rien du tout.
    assert.match(verdict('mediatrice', d, []).message, /DROITE/);
});

test('la médiatrice tracée au segment (et non à la droite) est acceptée', () => {
    // Un élève trace souvent un SEGMENT le long de son tracé : c'est la même
    // droite, et elle vaut autant.
    const d = depart('mediatrice');
    const { A, B } = d.reperes;
    const M = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
    const n = { x: -(B.y - A.y) * 0.4, y: (B.x - A.x) * 0.4 };
    const v = verdict('mediatrice', d, [
        pt('h', M.x + n.x, M.y + n.y), pt('k', M.x - n.x, M.y - n.y),
        lin('Segment', 'med', 'h', 'k')
    ]);
    assert.ok(v.ok);
});

// --- Perpendiculaire et parallèle ------------------------------------------

test('la perpendiculaire par A : angle droit ET passage par A', () => {
    const d = depart('perpendiculaire');
    const { A, P, Q } = d.reperes;
    const u = { x: Q.x - P.x, y: Q.y - P.y };
    const n = { x: -u.y, y: u.x };

    const bonne = verdict('perpendiculaire', d, [
        pt('x1', A.x - n.x, A.y - n.y), pt('x2', A.x + n.x, A.y + n.y),
        lin('Line', 'r', 'x1', 'x2')
    ]);
    assert.ok(bonne.ok, bonne.message);

    // Perpendiculaire à (d), mais loin de A.
    const loin = verdict('perpendiculaire', d, [
        pt('x1', A.x + 150 - n.x, A.y - n.y), pt('x2', A.x + 150 + n.x, A.y + n.y),
        lin('Line', 'r', 'x1', 'x2')
    ]);
    assert.ok(!loin.ok);
    assert.match(loin.message, /ne passe pas par A/);

    // Par A, mais penchée.
    const penchee = verdict('perpendiculaire', d, [
        pt('x1', A.x - u.x, A.y - u.y), pt('x2', A.x + u.x, A.y + u.y),
        lin('Line', 'r', 'x1', 'x2')
    ]);
    assert.ok(!penchee.ok);
    assert.match(penchee.message, /angle droit/);
});

test('la parallèle par A : même direction ET passage par A', () => {
    const d = depart('parallele');
    const { A, P, Q } = d.reperes;
    const u = { x: Q.x - P.x, y: Q.y - P.y };

    const bonne = verdict('parallele', d, [
        pt('x1', A.x - u.x, A.y - u.y), pt('x2', A.x + u.x, A.y + u.y),
        lin('Line', 'r', 'x1', 'x2')
    ]);
    assert.ok(bonne.ok, bonne.message);

    // Parallèle mais ailleurs.
    const ailleurs = verdict('parallele', d, [
        pt('x1', A.x - u.x, A.y - u.y - 120), pt('x2', A.x + u.x, A.y + u.y - 120),
        lin('Line', 'r', 'x1', 'x2')
    ]);
    assert.ok(!ailleurs.ok);
    assert.match(ailleurs.message, /ne passe pas par A/);

    // Par A, mais penchée : elle finirait par couper (d).
    const penchee = verdict('parallele', d, [
        pt('x1', A.x - u.y, A.y + u.x), pt('x2', A.x + u.y, A.y - u.x),
        lin('Line', 'r', 'x1', 'x2')
    ]);
    assert.ok(!penchee.ok);
    assert.match(penchee.message, /couper/);
});

test('la parallèle acceptée à l\'outil, par sa droite de référence', () => {
    const d = depart('parallele');
    const v = verdict('parallele', d, [
        { type: 'ParallelLine', id: 'par', p1Id: 'dep-A', refLineId: 'dep-d' }
    ]);
    assert.ok(v.ok, v.message);
});

// --- Le cercle --------------------------------------------------------------

test('le cercle de centre O passant par A', () => {
    const d = depart('cercle');
    const { O, A } = d.reperes;
    const r = Math.hypot(A.x - O.x, A.y - O.y);

    assert.ok(verdict('cercle', d, [cercle('c', 'dep-O', 'dep-A')]).ok);

    // Bon centre, rayon trop grand.
    const grand = verdict('cercle', d, [
        pt('b', O.x + r * 1.6, O.y), cercle('c', 'dep-O', 'b')
    ]);
    assert.ok(!grand.ok);
    assert.match(grand.message, /trop grand/);

    // Bon centre, rayon trop petit.
    const petit = verdict('cercle', d, [
        pt('b', O.x + r * 0.5, O.y), cercle('c', 'dep-O', 'b')
    ]);
    assert.ok(!petit.ok);
    assert.match(petit.message, /trop petit/);

    // Mauvais centre.
    const decale = verdict('cercle', d, [
        pt('o2', O.x + 90, O.y + 40), pt('b', O.x + 90 + r, O.y + 40),
        cercle('c', 'o2', 'b')
    ]);
    assert.ok(!decale.ok);
    assert.match(decale.message, /pas centré/);
});

test('un arc de compas n\'est pas un cercle tracé, et on le dit', () => {
    const d = depart('cercle');
    const v = verdict('cercle', d, [
        { type: 'CompassArc', id: 'arc', centerId: 'dep-O', radius: 120, startA: 0, endA: 1 }
    ]);
    assert.ok(!v.ok);
    assert.match(v.message, /termine le tour/);
});

// --- La démonstration -------------------------------------------------------

test('la démonstration de la médiatrice va du segment nu à la droite juste', () => {
    const d = depart('mediatrice');
    const temps = demoMediatrice(d.reperes);
    assert.equal(temps.length, 5);
    assert.ok(temps.every(t => t.note && t.json));
    // Chaque temps ajoute quelque chose, jamais n'enlève.
    let precedent = 0;
    for (const t of temps) {
        const n = JSON.parse(t.json).length;
        assert.ok(n >= precedent, 'la figure ne doit pas régresser');
        precedent = n;
    }
    // Et le dernier temps, jugé par la consigne elle-même, est JUSTE : le
    // robot ne montre pas une construction qui serait refusée à l'élève.
    const dernier = JSON.parse(temps[temps.length - 1].json)
        .filter(o => !String(o.id).startsWith('dep-'));
    assert.ok(juger(consigneDe('mediatrice'), feuille(d, dernier), d.reperes).ok);
});
