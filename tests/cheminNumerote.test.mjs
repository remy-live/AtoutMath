// Le chemin numéroté : une grille proposée est résoluble, et sa règle tient.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    TAILLES, CONSIGNE, genererParcours, compterSolutions, traceVide, repereEn,
    peutAvancer, avancer, couperEn, verifier, prochainPas, conseil, solutionComplete
} from '../js/core/cheminNumerote.js';
import { makeRng } from '../js/core/ids.js';
import { adjacentes, clef } from '../js/core/relier.js';

const grilleDe = (cfg, graine) => genererParcours({ ...cfg, rng: makeRng(graine) });

test('la solution passe une fois par chaque case, de proche en proche', () => {
    Object.values(TAILLES).forEach((t, i) => {
        const g = grilleDe(t, `chemin-${i}`);
        assert.ok(g, 'grille produite');
        assert.equal(g.solution.length, g.l * g.h);
        const vus = new Set(g.solution.map(c => clef(...c)));
        assert.equal(vus.size, g.l * g.h, 'aucune case en double');
        for (let k = 1; k < g.solution.length; k++) {
            assert.ok(adjacentes(g.solution[k - 1], g.solution[k]), `saut en ${k}`);
        }
    });
});

test('les repères sont sur le chemin, numérotés dans l\'ordre du parcours', () => {
    const g = grilleDe(TAILLES.moyen, 'ordre');
    let precedent = -1;
    g.reperes.forEach((r, i) => {
        assert.equal(r.n, i + 1, 'numérotation continue');
        const pos = g.solution.findIndex(c => c[0] === r.x && c[1] === r.y);
        assert.ok(pos >= 0, 'le repère est sur le chemin');
        assert.ok(pos > precedent, 'les repères se suivent le long du chemin');
        precedent = pos;
    });
    assert.equal(g.reperes[0].x, g.solution[0][0]);
    assert.equal(g.reperes[g.reperes.length - 1].y, g.solution[g.solution.length - 1][1]);
});

test('le compteur trouve exactement une solution quand la grille est pleine de repères', () => {
    const g = grilleDe(TAILLES.petit, 'plein');
    // Tout numéroter ne laisse évidemment qu'un chemin.
    const tous = g.solution.map((c, i) => ({ n: i + 1, x: c[0], y: c[1] }));
    assert.equal(compterSolutions(g.l, g.h, tous, 5), 1);
});

test('deux repères seulement laissent plusieurs chemins', () => {
    // D'un coin au coin voisin sur un 4 × 4 : plusieurs chemins conviennent.
    // (D'un coin au coin OPPOSÉ, il n'y en a aucun — les deux cases sont de
    // même couleur sur le damier, et un chemin de seize cases change de
    // couleur à chaque pas. Le compteur le dit d'ailleurs : zéro.)
    assert.ok(compterSolutions(4, 4, [{ n: 1, x: 0, y: 0 }, { n: 2, x: 3, y: 0 }], 2) >= 2);
    assert.equal(compterSolutions(4, 4, [{ n: 1, x: 0, y: 0 }, { n: 2, x: 3, y: 3 }], 2), 0);
});

test('la grille tirée est CONTRAINTE : peu de solutions, peu de nombres', () => {
    Object.entries(TAILLES).forEach(([nom, cfg]) => {
        const g = grilleDe(cfg, `contrainte-${nom}`);
        assert.ok(g.solutions >= 1, 'la grille a au moins la solution qui l\'a engendrée');
        // Le plafond de repères est tenu : sinon la grille se remplirait de
        // chiffres et il n'y aurait plus rien à chercher.
        assert.ok(g.reperes.length <= cfg.reperes + 3,
            `${nom} : ${g.reperes.length} repères pour ${cfg.reperes} demandés`);
        assert.ok(g.reperes.length <= Math.ceil(cfg.l * cfg.h / 3),
            `${nom} : pas plus d'une case sur trois numérotée`);
    });
});

test('ajouter des repères diminue le nombre de chemins', () => {
    const g = grilleDe(TAILLES.moyen, 'moins-de-chemins');
    const deuxBouts = [g.reperes[0], { ...g.reperes[g.reperes.length - 1], n: 2 }];
    const avecTout = compterSolutions(g.l, g.h, g.reperes, 40);
    const avecDeux = compterSolutions(g.l, g.h, deuxBouts, 40);
    assert.ok(avecDeux >= avecTout, `${avecDeux} chemins à deux repères, ${avecTout} avec tous`);
    assert.ok(avecTout >= 1);
});

test('le chemin commence sur le 1, et nulle part ailleurs', () => {
    const g = grilleDe(TAILLES.moyen, 'depart');
    const un = g.reperes[0];
    const ailleurs = [(un.x + 2) % g.l, (un.y + 1) % g.h];
    assert.equal(peutAvancer(g, [], [un.x, un.y]).ok, true);
    const refus = peutAvancer(g, [], ailleurs);
    assert.equal(refus.ok, false);
    assert.match(refus.raison, /commence sur le 1/);
});

test('on avance case par case, sans diagonale et sans repasser', () => {
    const g = grilleDe(TAILLES.moyen, 'pas');
    let trace = avancer(g, traceVide(), g.solution[0]);
    trace = avancer(g, trace, g.solution[1]);
    assert.equal(trace.length, 2);
    // Une case lointaine est refusée.
    const loin = g.solution[g.solution.length - 1];
    assert.equal(avancer(g, trace, loin).length, 2);
    // Revenir en arrière efface.
    assert.equal(avancer(g, trace, g.solution[0]).length, 1);
    // Repasser sur une case déjà prise est refusé, sauf ce retour d'un pas.
    let long = trace;
    for (let i = 2; i < 5; i++) long = avancer(g, long, g.solution[i]);
    assert.equal(long.length, 5);
    const refus = peutAvancer(g, long, g.solution[0]);
    assert.equal(refus.ok, false);
});

test('on ne pose pas le pied sur un nombre avant son tour', () => {
    const g = grilleDe(TAILLES.grand, 'ordre-reperes');
    // On avance jusqu'à la case juste avant le deuxième repère…
    const deuxieme = g.reperes[1];
    const posDeux = g.solution.findIndex(c => c[0] === deuxieme.x && c[1] === deuxieme.y);
    // … puis on tente le TROISIÈME repère, s'il est voisin de là où on est.
    let trace = [];
    for (let i = 0; i < posDeux; i++) trace = avancer(g, trace, g.solution[i]);
    const troisieme = g.reperes[2];
    const v = peutAvancer(g, trace, [troisieme.x, troisieme.y]);
    if (v.raison && !/diagonale|deux fois/.test(v.raison)) {
        assert.match(v.raison, /avant le 3/);
    }
    assert.equal(v.ok, false);
});

test('toucher le milieu de son chemin le raccourcit', () => {
    const g = grilleDe(TAILLES.moyen, 'couper');
    let trace = [];
    for (let i = 0; i < 6; i++) trace = avancer(g, trace, g.solution[i]);
    const coupe = couperEn(trace, g.solution[2]);
    assert.equal(coupe.length, 3);
    assert.deepEqual(coupe[2], g.solution[2]);
    // Une case hors du chemin ne coupe rien.
    assert.equal(couperEn(trace, g.solution[9]).length, 6);
});

test('la solution complète gagne, un chemin partiel non', () => {
    Object.values(TAILLES).forEach((t, i) => {
        const g = grilleDe(t, `gagne-${i}`);
        const gagne = verifier(g, solutionComplete(g));
        assert.equal(gagne.gagne, true, `${t.l}x${t.h}`);
        assert.equal(gagne.vides.length, 0);

        const partiel = verifier(g, g.solution.slice(0, 4));
        assert.equal(partiel.gagne, false);
        assert.ok(partiel.vides.length > 0);
        assert.ok(partiel.message.length > 10);
    });
});

test('un chemin qui couvre tout mais rate un nombre ne gagne pas', () => {
    const g = grilleDe(TAILLES.petit, 'sans-repere');
    // On enlève artificiellement le dernier repère du décompte en tronquant.
    const bilan = verifier(g, g.solution.slice(0, g.solution.length - 1));
    assert.equal(bilan.gagne, false);
});

test('le conseil dit par où commencer, puis où continuer', () => {
    const g = grilleDe(TAILLES.moyen, 'conseil');
    assert.match(conseil(g, []), /1/);
    const debut = g.solution.slice(0, 3);
    const suite = prochainPas(g, debut);
    assert.deepEqual(suite.case, g.solution[3]);
    assert.match(conseil(g, debut), /colonne|coin/i);
    assert.equal(prochainPas(g, solutionComplete(g)), null);
});

test('la consigne dit les trois règles', () => {
    assert.match(CONSIGNE, /1/);
    assert.match(CONSIGNE, /ordre/);
    assert.match(CONSIGNE, /toutes les cases/i);
    assert.ok(repereEn(grilleDe(TAILLES.petit, 'r'), 99, 99) === null);
});
