// Relier les points : une grille proposée est une grille résoluble.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    COULEURS, SYMBOLES, MAX_PAIRES, serpentin, mordre, cheminHamiltonien, couper,
    genererGrille, bornes, traceVide, poserTrace, nettoyer, reliee, verifier,
    solutionComplete, prochainPas, conseil, adjacentes, memeCase, clef, occupant
} from '../js/core/relier.js';
import { makeRng } from '../js/core/ids.js';

/** Un chemin couvre-t-il chaque case une fois, en avançant de proche en proche ? */
function estHamiltonien(chemin, l, h) {
    if (chemin.length !== l * h) return 'longueur';
    const vus = new Set(chemin.map(c => clef(...c)));
    if (vus.size !== l * h) return 'doublon';
    for (let i = 1; i < chemin.length; i++) {
        if (!adjacentes(chemin[i - 1], chemin[i])) return `saut en ${i}`;
    }
    return null;
}

test('le serpentin passe une fois par chaque case', () => {
    [[4, 4], [5, 3], [6, 7], [3, 8]].forEach(([l, h]) => {
        assert.equal(estHamiltonien(serpentin(l, h), l, h), null, `${l}×${h}`);
    });
});

test('le mordillement brasse le chemin SANS jamais le casser', () => {
    // C'est toute la garantie du générateur : à chaque instant le chemin
    // couvre encore la grille, donc la grille reste résoluble.
    const rng = makeRng('morsure');
    const [l, h] = [6, 6];
    let chemin = serpentin(l, h);
    const depart = chemin.map(c => clef(...c)).join(' ');
    for (let k = 0; k < 400; k++) {
        chemin = mordre(chemin, l, h, rng);
        assert.equal(estHamiltonien(chemin, l, h), null, `cassé à la morsure ${k}`);
    }
    assert.notEqual(chemin.map(c => clef(...c)).join(' '), depart, 'rien n\'a bougé');
});

test('le tirage est reproductible, et différent d\'un tirage à l\'autre', () => {
    const a = cheminHamiltonien(5, 5, makeRng('x'));
    const b = cheminHamiltonien(5, 5, makeRng('x'));
    const c = cheminHamiltonien(5, 5, makeRng('y'));
    assert.deepEqual(a, b, 'même graine, même chemin');
    assert.notDeepEqual(a, c, 'graines différentes, chemins différents');
});

test('une grille tirée est TOUJOURS résoluble, et sa solution remplit tout', () => {
    // On ne pose pas des points au hasard en espérant que ça tombe juste : la
    // solution existe avant l'énoncé. Vingt grilles de tailles variées.
    for (let k = 0; k < 20; k++) {
        const l = 4 + (k % 4), h = 4 + ((k + 2) % 4), paires = 3 + (k % 4);
        const g = genererGrille({ l, h, paires, rng: makeRng(`g${k}`) });
        assert.ok(g, `${l}×${h}/${paires} : aucune grille produite`);
        assert.equal(g.paires.length, paires);

        // La réunion des solutions couvre la grille, sans recouvrement.
        const cases = g.paires.flatMap(p => p.solution.map(c => clef(...c)));
        assert.equal(cases.length, l * h, 'la solution ne couvre pas tout');
        assert.equal(new Set(cases).size, l * h, 'deux chemins se croisent');

        g.paires.forEach(p => {
            assert.ok(memeCase(p.solution[0], p.a) && memeCase(p.solution[p.solution.length - 1], p.b));
            assert.ok(p.solution.length >= 3, 'un chemin de deux cases ne demande rien');
            // Deux bouts voisins se relieraient d'un trait droit, sans réfléchir.
            assert.ok(!adjacentes(p.a, p.b), 'les deux bornes se touchent');
            for (let i = 1; i < p.solution.length; i++) {
                assert.ok(adjacentes(p.solution[i - 1], p.solution[i]), 'chemin discontinu');
            }
        });

        // Et la solution passe la vérification du jeu.
        const bilan = verifier(g, solutionComplete(g));
        assert.ok(bilan.gagne, `${l}×${h}/${paires} : la solution ne gagne pas`);
    }
});

test('la couleur n\'est jamais seule : chaque paire a son symbole', () => {
    // Photocopie en gris, polycopié en noir et blanc, élève qui distingue mal
    // le rouge du vert : le symbole reste lisible dans les trois cas.
    const g = genererGrille({ l: 6, h: 6, paires: 6, rng: makeRng('sym') });
    const symboles = g.paires.map(p => p.symbole);
    const couleurs = g.paires.map(p => p.couleur);
    assert.equal(new Set(symboles).size, 6, 'deux paires portent le même symbole');
    assert.equal(new Set(couleurs).size, 6, 'deux paires portent la même couleur');
    symboles.forEach(s => assert.ok(SYMBOLES.includes(s)));
    couleurs.forEach(c => assert.ok(COULEURS.includes(c)));
    assert.equal(COULEURS.length, SYMBOLES.length, 'autant de symboles que de couleurs');
    assert.equal(MAX_PAIRES, COULEURS.length);
});

test('un tracé doit partir d\'une borne et avancer case par case', () => {
    const g = genererGrille({ l: 5, h: 5, paires: 3, rng: makeRng('t') });
    const p = g.paires[0];
    const etat = traceVide(g);
    // Partir d'ailleurs que d'une borne ne trace rien.
    assert.deepEqual(nettoyer(g, etat, 0, [p.solution[1]]), []);
    // Un saut de case coupe le tracé là où il saute.
    const saut = [p.a, p.solution[1], [p.a[0] + 3, p.a[1] + 3]];
    assert.equal(nettoyer(g, etat, 0, saut).length, 2);
    // Repasser sur soi-même s'arrête aussi.
    assert.equal(nettoyer(g, etat, 0, [p.a, p.solution[1], p.a]).length, 2);
    // Et le chemin s'arrête net sur l'autre bout : au-delà, ce serait un détour.
    const trop = p.solution.concat([p.solution[p.solution.length - 2]]);
    assert.equal(nettoyer(g, etat, 0, trop).length, p.solution.length);
});

test('un tracé ne traverse pas la borne d\'une autre paire', () => {
    // Sinon la paire traversée n'aurait plus de sortie, et la grille
    // deviendrait impossible sans que l'élève comprenne pourquoi.
    const g = genererGrille({ l: 6, h: 6, paires: 4, rng: makeRng('bornes') });
    const autres = bornes(g);
    const p = g.paires[0];
    // On fabrique un chemin qui part de la borne et tombe sur une borne
    // étrangère si elle est voisine ; sinon le test ne s'applique pas ici.
    const voisine = [[1, 0], [-1, 0], [0, 1], [0, -1]]
        .map(([dx, dy]) => [p.a[0] + dx, p.a[1] + dy])
        .find(c => { const b = autres.get(clef(...c)); return b && b.id !== 0; });
    if (voisine) {
        assert.deepEqual(nettoyer(g, traceVide(g), 0, [p.a, voisine]), [p.a]);
    }
    assert.ok(true);
});

test('repasser sur un autre chemin le COUPE, au lieu de refuser le geste', () => {
    // C'est le geste normal du jeu : on repasse par-dessus, l'autre chemin est
    // tronqué. Refuser obligerait à effacer d'abord, ce qui double chaque
    // correction. Grille écrite à la main : le cas doit être NET.
    const g = {
        l: 4, h: 3,
        paires: [
            { id: 0, a: [0, 0], b: [0, 2], couleur: COULEURS[0], symbole: SYMBOLES[0],
                solution: [[0, 0], [0, 1], [0, 2]] },
            { id: 1, a: [3, 0], b: [3, 2], couleur: COULEURS[1], symbole: SYMBOLES[1],
                solution: [[3, 0], [3, 1], [3, 2]] }
        ]
    };
    // La paire 1 fait un détour par la colonne 2.
    let etat = poserTrace(g, traceVide(g), 1, [[3, 0], [2, 0], [2, 1], [2, 2], [3, 2]]);
    assert.equal(etat.traces[1].length, 5);
    assert.ok(reliee(g, etat, 1));

    // La paire 0 vient prendre la case [2,0], au milieu de ce détour.
    etat = poserTrace(g, etat, 0, [[0, 0], [1, 0], [2, 0]]);
    assert.deepEqual(etat.traces[0], [[0, 0], [1, 0], [2, 0]]);
    assert.deepEqual(etat.traces[1], [[3, 0]], 'la paire 1 est coupée AVANT la case reprise');
    assert.ok(!reliee(g, etat, 1), 'et elle n\'est donc plus reliée');
    // Une case n'appartient jamais à deux paires à la fois.
    assert.equal(occupant(etat, 2, 0), 0);
});

test('tout relier ne suffit pas : il ne doit rester AUCUNE case vide', () => {
    // C'est la moitié de la règle qu'on oublie, et celle qui fait chercher.
    const g = genererGrille({ l: 5, h: 5, paires: 3, rng: makeRng('vide') });
    const complet = solutionComplete(g);
    assert.ok(verifier(g, complet).gagne);

    // On raccourcit une paire jusqu'à ses deux bornes seules : elle n'est plus
    // reliée, et des cases se libèrent.
    const abime = { traces: complet.traces.map((t, i) => (i === 0 ? [t[0]] : t)) };
    const bilan = verifier(g, abime);
    assert.ok(!bilan.gagne);
    assert.ok(!bilan.toutesReliees);
    assert.ok(bilan.vides.length > 0);
    assert.equal(bilan.reliees[0], false);
    assert.ok(bilan.reliees.slice(1).every(Boolean), 'les autres restent reliées');
});

test('le robot avance le long de la solution, et l\'aide ne la donne pas', () => {
    const g = genererGrille({ l: 5, h: 5, paires: 3, rng: makeRng('robot') });
    let etat = traceVide(g);
    let garde = 0, pas;
    while ((pas = prochainPas(g, etat)) && garde++ < 60) {
        etat = poserTrace(g, etat, pas.id, pas.solution.slice(0, pas.jusqua));
    }
    assert.ok(verifier(g, etat).gagne, 'le robot doit finir la grille');
    assert.equal(prochainPas(g, etat), null);

    // L'aide dit la méthode — les coins forcés — et jamais une case précise.
    const debut = conseil(g, traceVide(g));
    assert.match(debut, /coin/);
    assert.ok(debut.length > 60);
    assert.ok(!/\(\d+\s*,\s*\d+\)/.test(debut), 'l\'aide ne donne pas de coordonnées');
    // Et quand tout est relié mais qu'il reste un trou, elle dit ce qu'il
    // faut faire : allonger, pas recommencer.
    const troue = { traces: solutionComplete(g).traces.map((t, i) => (i === 0 ? t.slice(0, 2).concat([t[t.length - 1]]) : t)) };
    const dit = conseil(g, { traces: troue.traces.map((t, i) => (i === 0 ? [] : t)) });
    assert.ok(dit.length > 40);
});
