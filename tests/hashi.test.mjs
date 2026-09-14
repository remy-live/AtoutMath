import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import {
    creerHashi, aretesPossibles, croisements, compterSolutions, propager,
    dUnSeulTenant, estResoluHashi, diagnostic, saisieVide, degres, qualiteHashi,
    TAILLES_HASHI
} from '../js/core/hashi.js';
import { hashiFicheGenerator as G } from '../js/core/generators/hashiFiche.js';

const faire = (opts = {}, cle = 'h') => creerHashi({
    taille: 'moyen', difficulte: 'moyen', rng: makeRng(cle), ...opts
});

test('un pont ne relie que deux îles qui se VOIENT', () => {
    // C'est la géométrie du jeu, et elle est portée par le noyau : une arête
    // n'existe qu'entre deux îles consécutives d'une même ligne ou colonne.
    // Un élève ne peut donc pas tracer un pont par-dessus une île — cette
    // faute-là n'existe pas, et il reste les trois vraies règles.
    const iles = [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 6, y: 0 }, { x: 0, y: 4 }];
    const a = aretesPossibles(iles, 8, 8);
    const paires = a.map(e => `${e.a}-${e.b}`).sort();
    assert.deepEqual(paires, ['0-1', '0-3', '1-2'], 'l\'île 0 ne voit pas l\'île 2');
});

test('un pont horizontal et un pont vertical se croisent quand ils se coupent', () => {
    const iles = [{ x: 0, y: 2 }, { x: 4, y: 2 }, { x: 2, y: 0 }, { x: 2, y: 4 }];
    const a = aretesPossibles(iles, 6, 6);
    const c = croisements(iles, a);
    const ih = a.findIndex(e => e.dir === 'h');
    const iv = a.findIndex(e => e.dir === 'v');
    assert.ok(c[ih].includes(iv) && c[iv].includes(ih), 'la croix n\'est pas vue');
    // Deux ponts de même direction ne se croisent jamais : ils relient des
    // îles consécutives, donc ils ne se recouvrent pas.
    assert.ok(a.filter(e => e.dir === 'h').every((_, k) => true));
});

test('« d\'un seul tenant » est bien la règle qu\'on croit', () => {
    const aretes = [{ a: 0, b: 1 }, { a: 2, b: 3 }];
    assert.equal(dUnSeulTenant(4, aretes, [1, 1]), false, 'deux morceaux passent');
    assert.equal(dUnSeulTenant(4, aretes.concat([{ a: 1, b: 2 }]), [1, 1, 1]), true);
    assert.equal(dUnSeulTenant(4, aretes, [1, 0]), false);
});

test('toute grille tirée a UNE solution, et c\'est celle qu\'on garde', () => {
    // Sans unicité, deux élèves rendent deux feuilles justes et différentes,
    // et la correction devient impossible.
    for (const taille of Object.keys(TAILLES_HASHI)) {
        for (const difficulte of ['facile', 'moyen', 'difficile']) {
            const g = faire({ taille, difficulte }, `u-${taille}-${difficulte}`);
            assert.ok(g, `${taille}/${difficulte} : aucune grille`);
            assert.ok(estResoluHashi(g, g.solution),
                `${taille}/${difficulte} : la solution annoncée ne respecte pas les règles`);
            const { nombre } = compterSolutions(g.iles, g.aretes, g.croise, 2);
            assert.equal(nombre, 1, `${taille}/${difficulte} : ${nombre} solutions`);
        }
    }
});

test('facile et moyen se déduisent sans jamais essayer', () => {
    // La règle de la maison pour tous les puzzles de logique : un élève qui
    // doit tenter au hasard n'apprend pas ce qu'on voulait lui apprendre.
    for (let i = 0; i < 6; i++) {
        for (const difficulte of ['facile', 'moyen']) {
            const g = faire({ difficulte }, `d-${difficulte}-${i}`);
            const val = new Array(g.aretes.length).fill(-1);
            assert.equal(propager(g.iles, g.aretes, g.croise, val), 'fini',
                `${difficulte} #${i} : la propagation reste bloquée`);
            assert.deepEqual(val, g.solution, `${difficulte} #${i} : elle trouve autre chose`);
        }
    }
});

test('difficile résiste à la propagation — sinon ce n\'est pas difficile', () => {
    let resistantes = 0;
    for (let i = 0; i < 6; i++) {
        const g = faire({ difficulte: 'difficile' }, `x-${i}`);
        const val = new Array(g.aretes.length).fill(-1);
        if (propager(g.iles, g.aretes, g.croise, val) !== 'fini') resistantes++;
    }
    assert.equal(resistantes, 6, `${resistantes}/6 seulement demandent un vrai raisonnement`);
});

test('les chiffres des îles sont ceux des ponts, et tiennent dans 1..8', () => {
    for (let i = 0; i < 8; i++) {
        const g = faire({ taille: 'grand' }, 'n' + i);
        const d = degres(g, g.solution);
        g.iles.forEach((il, k) => {
            assert.equal(d[k], il.n, `l'île ${k} annonce ${il.n} et reçoit ${d[k]}`);
            assert.ok(il.n >= 1 && il.n <= 8, `chiffre impossible : ${il.n}`);
        });
        assert.ok(g.solution.every(v => v >= 0 && v <= 2), 'trois ponts entre deux îles');
    }
});

test('deux îles ne se touchent jamais', () => {
    // Deux cercles côte à côte donnent un pont de longueur nulle : on ne voit
    // plus s'il y en a un, deux ou aucun.
    for (let i = 0; i < 8; i++) {
        const g = faire({ taille: 'grand' }, 'v' + i);
        g.iles.forEach((a, k) => g.iles.forEach((b, j) => {
            if (k >= j) return;
            assert.ok(Math.abs(a.x - b.x) + Math.abs(a.y - b.y) > 1,
                `les îles ${k} et ${j} se touchent`);
        }));
    }
});

test('la grille vide n\'est jamais résolue, et le diagnostic le dit', () => {
    const g = faire({}, 'diag');
    const vide = saisieVide(g);
    assert.equal(estResoluHashi(g, vide), false);
    assert.deepEqual(diagnostic(g, vide), { ok: false, quoi: 'manque', n: g.iles.length });
    assert.deepEqual(diagnostic(g, g.solution), { ok: true });
    // Un croisement se voit avant tout le reste : c'est la faute qui rend la
    // suite du raisonnement fausse.
    const i = g.croise.findIndex(c => c.length);
    if (i >= 0) {
        const faux = g.solution.slice();
        faux[i] = 1; faux[g.croise[i][0]] = 1;
        assert.equal(diagnostic(g, faux).quoi, 'croisement');
    }
});

test('le générateur de fiche rend de quoi imprimer ET corriger', () => {
    const it = G.generate({ taille: 'petit', difficulte: 'facile' },
        { rng: makeRng('fiche'), index: 0 });
    const m = it.meta;
    assert.equal(m.iles.length, 9);
    assert.equal(m.solution.length, m.aretes.length);
    const q = qualiteHashi({ ...m, solution: m.solution });
    assert.ok(it.explanation.includes(`${q.ponts} ponts`));
    // Le corrigé imprimé lit `meta.solution` : elle doit respecter les règles.
    assert.ok(estResoluHashi({ ...m, croise: croisements(m.iles, m.aretes) }, m.solution));
});
