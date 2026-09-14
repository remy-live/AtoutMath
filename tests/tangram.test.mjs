// Tangram : la découpe est exacte, et chaque figure est un vrai pavage.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    PIECES, FIGURES, AIRE_TOTALE, QUESTIONS, pieceDe, figureDe, retournable,
    aire, boite, tourner, retourner, sommetsPlaces, piecesPlacees, verifierFigure, verifierPavage
} from '../js/core/tangram.js';

const LONG = (p) => p.map((_, i) => {
    const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length];
    return Math.round(Math.hypot(x2 - x1, y2 - y1) * 1000) / 1000;
});

test('sept pièces, et leurs aires font exactement le carré', () => {
    assert.equal(PIECES.length, 7);
    assert.equal(PIECES.reduce((s, p) => s + p.aire, 0), AIRE_TOTALE);
    PIECES.forEach(p => assert.equal(aire(p.sommets), p.aire, `${p.id} : aire annoncée fausse`));
    // Les fractions annoncées doivent coller à l'aire, sinon la leçon ment.
    PIECES.forEach(p => {
        const [num, den] = p.fraction.split('/').map(Number);
        assert.equal(p.aire / AIRE_TOTALE, num / den, `${p.id} : ${p.fraction} ne vaut pas son aire`);
    });
});

test('les formes sont bien celles du tangram', () => {
    // Deux grands triangles rectangles isocèles de côtés 4√2, un moyen de
    // côtés 4, deux petits de côtés 2√2, un carré de côté 2√2, un
    // parallélogramme de côtés 2√2 et 4.
    const c = (id) => LONG(pieceDe(id).sommets).sort((a, b) => a - b);
    const r2 = Math.round(2 * Math.SQRT2 * 1000) / 1000;      // 2,828
    const r4 = Math.round(4 * Math.SQRT2 * 1000) / 1000;      // 5,657
    assert.deepEqual(c('grand1'), [r4, r4, 8]);
    assert.deepEqual(c('grand2'), [r4, r4, 8]);
    assert.deepEqual(c('moyen'), [4, 4, r4]);
    assert.deepEqual(c('petit1'), [r2, r2, 4]);
    assert.deepEqual(c('petit2'), [r2, r2, 4]);
    assert.deepEqual(c('carre'), [r2, r2, r2, r2]);
    assert.deepEqual(c('parallelo'), [r2, r2, 4, 4]);
    // Une seule pièce se retourne : c'est ce qui la rend difficile.
    assert.deepEqual(PIECES.filter(p => retournable(p.id)).map(p => p.id), ['parallelo']);
});

test('chaque figure est un pavage exact : ni trou, ni chevauchement, ni débordement', () => {
    // C'est le test qui protège le jeu : une figure fausse serait injouable,
    // et rien à l'écran ne le dirait avant qu'un élève ne s'y casse les dents.
    assert.ok(FIGURES.length >= 5);
    for (const f of FIGURES) {
        assert.equal(f.placements.length, 7, `${f.id} : il faut les sept pièces`);
        assert.deepEqual([...f.placements.map(p => p[0])].sort(),
            PIECES.map(p => p.id).sort(), `${f.id} : chaque pièce une fois et une seule`);
        assert.equal(aire(f.silhouette), AIRE_TOTALE, `${f.id} : la silhouette n'a pas la bonne aire`);
        const bilan = verifierFigure(f);
        assert.equal(bilan.trous, 0, `${f.id} : ${bilan.trous} trous`);
        assert.equal(bilan.doubles, 0, `${f.id} : ${bilan.doubles} chevauchements`);
        assert.equal(bilan.dehors, 0, `${f.id} : ${bilan.dehors} débordements`);
    }
});

test('aucune figure n\'exige une rotation de 45°', () => {
    // Le jeu ne propose que des quarts de tour : si une figure en demandait un
    // huitième, elle serait impossible à monter.
    FIGURES.forEach(f => f.placements.forEach(([id, q, flip]) => {
        assert.ok(Number.isInteger(q) && q >= 0 && q <= 3, `${f.id}/${id} : quart de tour ${q}`);
        assert.ok(!flip || retournable(id), `${f.id}/${id} : seule le parallélogramme se retourne`);
    }));
});

test('tourner quatre fois ramène la pièce, retourner deux fois aussi', () => {
    const p = pieceDe('parallelo').sommets;
    assert.deepEqual(tourner(p, 4), p);
    assert.deepEqual(retourner(retourner(p)), p);
    // Un quart de tour conserve l'aire et échange les dimensions de la boîte.
    const b0 = boite(p), b1 = boite(tourner(p, 1));
    assert.equal(aire(tourner(p, 1)), aire(p));
    assert.equal(Math.round((b1.x1 - b1.x0) * 100), Math.round((b0.y1 - b0.y0) * 100));
});

test('les pièces posées tiennent dans la boîte de leur silhouette', () => {
    for (const f of FIGURES) {
        const b = boite(f.silhouette);
        for (const p of piecesPlacees(f)) {
            const pb = boite(p.sommets);
            assert.ok(pb.x0 >= b.x0 - 1e-9 && pb.x1 <= b.x1 + 1e-9
                && pb.y0 >= b.y0 - 1e-9 && pb.y1 <= b.y1 + 1e-9,
            `${f.id}/${p.id} déborde de la silhouette`);
        }
    }
});

test('les questions d\'aire disent vrai', () => {
    assert.ok(QUESTIONS.length >= 5);
    QUESTIONS.forEach(q => {
        assert.ok(q.choix.includes(q.reponse), `${q.id} : la réponse n'est pas dans les choix`);
        assert.ok(new Set(q.choix).size === q.choix.length, `${q.id} : un choix en double`);
        assert.ok(q.explication.length > 30, `${q.id} : explication trop courte`);
    });
    // Les deux questions numériques se recalculent depuis les pièces.
    const grand = pieceDe('grand1').aire, petit = pieceDe('petit1').aire;
    assert.equal(String(grand / petit), QUESTIONS.find(q => q.id === 'petits-dans-grand').reponse);
    assert.equal(pieceDe('carre').aire, pieceDe('moyen').aire);
    assert.equal(2 * grand, AIRE_TOTALE / 2);
});

test('sommetsPlaces suit bien rotation, retournement et décalage', () => {
    const s = sommetsPlaces('petit1', 0, 0, 3, 5);
    assert.deepEqual(s, [[3, 5], [5, 7], [3, 9]]);
    assert.equal(aire(sommetsPlaces('grand1', 2, 0, 10, 10)), 16);
    assert.equal(figureDe('inconnue').id, FIGURES[0].id, 'figure inconnue : on repart de la première');
});

// --- Plusieurs solutions pour une même silhouette ----------------------------
//
// Rémy : « fais attention, pour une même figure il peut y avoir plusieurs
// solutions ; du coup l'aimantation ne fonctionne pas si c'est une autre
// solution ». Le jeu ne compare donc plus à la disposition du catalogue : il
// vérifie que le pavage EN COURS couvre la silhouette. Ce qu'on teste ici,
// c'est cette bascule — la règle du tangram, pas notre corrigé.

test('la solution du catalogue passe le contrôle de pavage', () => {
    FIGURES.forEach(f => {
        const polys = piecesPlacees(f).map(p => p.sommets);
        const bilan = verifierPavage(f.silhouette, polys, 0.1);
        assert.equal(bilan.trous, 0, `${f.id} : des trous`);
        assert.equal(bilan.doubles, 0, `${f.id} : des chevauchements`);
        assert.equal(bilan.dehors, 0, `${f.id} : ça déborde`);
    });
});

test('ÉCHANGER DEUX PIÈCES DE MÊME FORME RESTE UNE SOLUTION', () => {
    // Les deux grands triangles sont interchangeables, et les deux petits
    // aussi : c'est la plus simple des « autres solutions », et elle était
    // pourtant refusée dès lors qu'on n'occupait pas le bon emplacement.
    FIGURES.forEach(f => {
        const posees = piecesPlacees(f);
        const echange = (a, b) => {
            const i = posees.findIndex(p => p.id === a);
            const j = posees.findIndex(p => p.id === b);
            if (i < 0 || j < 0) return;
            const t = posees[i].sommets; posees[i].sommets = posees[j].sommets; posees[j].sommets = t;
        };
        echange('grand1', 'grand2');
        echange('petit1', 'petit2');
        const bilan = verifierPavage(f.silhouette, posees.map(p => p.sommets), 0.1);
        assert.equal(bilan.trous + bilan.doubles + bilan.dehors, 0,
            `${f.id} : l'échange de deux pièces identiques devrait rester juste`);
    });
});

test('une pièce décalée d\'un carreau est refusée', () => {
    const f = FIGURES[0];
    const polys = piecesPlacees(f).map(p => p.sommets);
    polys[0] = polys[0].map(([x, y]) => [x + 1, y]);
    const bilan = verifierPavage(f.silhouette, polys, 0.1);
    assert.ok(bilan.trous > 0 || bilan.doubles > 0 || bilan.dehors > 0,
        'un décalage d\'un carreau doit se voir');
});
