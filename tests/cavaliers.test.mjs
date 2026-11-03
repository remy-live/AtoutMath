// L'ÉNIGME DES CAVALIERS — 2 novembre.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, avec la photo d'un livre d'énigmes : « j'aimeri bien aussi cette
// enigme ». La légende disait : « Sixteen moves is the minimum. Note that the
// knights have to move around in a cycle in the same direction. »
//
// CE QUE CETTE ÉPREUVE GARDE :
//
//   · SEIZE COUPS, ET ON NE LES RECOPIE PAS DU LIVRE. Le nombre est calculé
//     par un parcours en largeur. C'est la seule façon de savoir que le jeu
//     qu'on sert est bien celui dont on raconte l'histoire.
//   · LES HUIT CASES FORMENT UN SEUL ANNEAU. C'est la chute de l'énigme, et
//     c'est ce que l'écran montre en allumant TOUJOURS deux cases. Si une case
//     en avait trois, tout le raisonnement de l'élève serait faux.
//   · LA CASE DU MILIEU EST MORTE — aucun saut n'y mène ni n'en part.
//   · ET LE DAMIER TOURNÉ RESTE RÉSOLUBLE, avec la MÊME solution tournée : une
//     feuille de deux blocs montrait deux fois la même figure, on la fait donc
//     tourner d'un quart de tour par bloc. Un corrigé faux serait pire que pas
//     de corrigé.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import '../js/core/activities/index.js';
import { exercices } from '../js/data/catalog.js';
import { getGenerator } from '../js/core/registry.js';
import { makeRng } from '../js/core/ids.js';
import {
    NIVEAUX, arrivee, collier, coups, depart, estArrive, graphe, jouer, resoudre, tirerEnigme
} from '../js/core/cavaliers.js';

const ID = 'logi-cavaliers';

test('L\'ÉNIGME DE 1512 SE FAIT EN SEIZE COUPS, ET ON LES COMPTE', () => {
    const e = tirerEnigme(2);
    assert.equal(e.minimum, 16,
        `le livre dit seize, le parcours en largeur dit ${e.minimum}`);
    // ET LA SOLUTION SERVIE MÈNE VRAIMENT AU BUT, coup après coup.
    const voisins = graphe(NIVEAUX[2]);
    let cases = e.depart.slice();
    for (const c of e.solution) {
        assert.ok(voisins[c.de].includes(c.vers),
            `le coup ${c.de} → ${c.vers} n'est pas un saut de cavalier`);
        assert.ok(cases[c.de], 'on déplace une case vide');
        assert.equal(cases[c.vers], null, 'on saute sur une case occupée');
        cases = jouer(cases, c.de, c.vers);
    }
    assert.ok(estArrive(cases, e.arrivee), 'la solution n\'échange pas les cavaliers');
});

test('LES HUIT CASES UTILES FORMENT UN SEUL ANNEAU', () => {
    // C'EST TOUTE L'ÉNIGME. Chaque case n'a que deux voisines, donc les
    // cavaliers tournent sans jamais pouvoir se dépasser — et échanger deux
    // paires demande un quart de tour de tout le monde.
    const voisins = graphe(NIVEAUX[2]);
    const vivantes = voisins.map((v, k) => (v.length ? k : -1)).filter(k => k >= 0);
    assert.equal(vivantes.length, 8, `${vivantes.length} cases utiles au lieu de huit`);
    for (const k of vivantes) {
        assert.equal(voisins[k].length, 2,
            `la case ${k} a ${voisins[k].length} voisines : l'anneau est rompu, et `
                + 'le raisonnement qu\'on fait faire à l\'élève devient faux');
    }
    const anneau = collier(NIVEAUX[2]);
    assert.ok(anneau, 'les cases ne forment plus un cycle');
    assert.equal(anneau.length, 8);
    // Et c'est bien un cycle : chaque case suit la précédente d'un saut.
    for (let i = 0; i < anneau.length; i++) {
        const a = anneau[i], b = anneau[(i + 1) % anneau.length];
        assert.ok(voisins[a].includes(b), `${a} et ${b} ne se suivent pas`);
    }
});

test('ET LA CASE DU MILIEU NE SERT À RIEN', () => {
    // ELLE L'EST PAR GÉOMÉTRIE, PAS PAR DÉCLARATION. En essayant de faire
    // tomber l'épreuve de l'anneau en retirant `mortes: [4]`, elle est restée
    // verte : depuis le centre d'un 3 × 3, les huit sauts du cavalier tombent
    // tous hors du damier. Le champ `mortes` sert au dessin. C'est ce que
    // vérifie la ligne suivante — sans lire `mortes`.
    const voisins = graphe(NIVEAUX[2]);
    assert.deepEqual(voisins[4], [], 'la case du milieu a des voisines');
    for (let k = 0; k < 9; k++) {
        assert.ok(!voisins[k].includes(4), `on peut sauter sur la case du milieu depuis ${k}`);
    }
    // Et aucun cavalier n'y est posé au départ.
    assert.equal(depart(NIVEAUX[2])[4], null);
    assert.equal(arrivee(NIVEAUX[2])[4], null);
});

test('LE DAMIER TOURNÉ RESTE RÉSOLUBLE, AVEC SA SOLUTION', () => {
    // Une feuille de deux blocs montrait DEUX FOIS la même figure — vu sur
    // l'image. On tourne donc le damier d'un quart de tour par bloc.
    //
    // CE QUE CETTE ÉPREUVE ATTRAPE, ET CE QU'ELLE N'ATTRAPE PAS. Elle tombe
    // sur une rotation FAUSSE — vu tomber, en échangeant les deux termes de
    // `tournerIndice`. Elle ne tombe PAS si l'on retire la rotation de la
    // solution, et ce n'est pas un défaut de l'épreuve : la solution non
    // tournée arrive quand même, parce qu'un quart de tour renvoie le collier
    // sur lui-même. Elle garde donc le jour où l'on ajoutera un damier sans
    // cette symétrie — pas le code d'aujourd'hui.
    const vus = new Set();
    for (const rang of [0, 1, 2, 3]) {
        const e = tirerEnigme(2, rang);
        assert.equal(e.minimum, 16, `rang ${rang} : ${e.minimum} coups`);
        assert.equal(e.solution.length, 16, `rang ${rang} : corrigé de ${e.solution.length} coups`);
        vus.add(e.depart.map(x => x || '.').join(''));
        let cases = e.depart.slice();
        for (const c of e.solution) cases = jouer(cases, c.de, c.vers);
        assert.ok(estArrive(cases, e.arrivee),
            `rang ${rang} : le corrigé n'arrive pas au but`);
    }
    assert.ok(vus.size >= 2,
        `les quatre rangs ne donnent que ${vus.size} figure(s) : la feuille se répète`);
});

test('AUCUN NIVEAU NE SERT UNE ÉNIGME IMPOSSIBLE', () => {
    for (const niveau of Object.keys(NIVEAUX)) {
        const e = tirerEnigme(Number(niveau));
        assert.ok(e.minimum !== null && e.minimum > 0,
            `niveau ${niveau} : aucune solution`);
        // ET ELLE DEMANDE ASSEZ DE TRAVAIL : une énigme en deux coups n'en est
        // pas une, c'est un écran qu'on traverse.
        assert.ok(e.minimum >= 4, `niveau ${niveau} : ${e.minimum} coups seulement`);
        const voisins = graphe(NIVEAUX[niveau]);
        assert.ok(coups(e.depart, voisins).length > 0,
            `niveau ${niveau} : aucun coup possible au départ`);
    }
});

test('LE NIVEAU 3 N\'EST PLUS UN ANNEAU, ET C\'EST EXPRÈS', () => {
    // Ce qui marchait ne marche plus : sur un 4 × 3 le milieu n'est plus mort,
    // le graphe n'est plus un cycle, et les cavaliers peuvent enfin se croiser.
    // C'est ainsi qu'on apprend que la forme du graphe était la vraie question.
    assert.equal(collier(NIVEAUX[3]), null,
        'le niveau 3 est encore un anneau : il ne distingue plus rien du niveau 2');
    const voisins = graphe(NIVEAUX[3]);
    assert.ok(voisins.some(v => v.length > 2),
        'aucune case du niveau 3 n\'a plus de deux voisines');
});

test('LES CAVALIERS SONT AU CATALOGUE, AVEC LEUR ÉCRAN ET LEUR PAPIER', () => {
    const exo = exercices.find(e => e.id === ID);
    assert.ok(exo, 'les cavaliers ont disparu du catalogue');
    assert.equal(exo.activityId, 'cavaliers');
    assert.ok(exo.printable, 'les cavaliers ne s\'impriment pas');
    assert.equal(exo.params.niveau, '2', 'le jeu n\'ouvre pas sur l\'énigme du livre');
    assert.ok(exo.instruction && exo.instruction.length > 120,
        'pas d\'explication de la règle dans la fiche');
});

test('ET LA RÉPONSE ATTENDUE EST CELLE QUE L\'ÉCRAN ENVERRA', () => {
    const exo = exercices.find(e => e.id === ID);
    const gen = getGenerator(exo.generatorId);
    for (const niveau of ['1', '2', '3']) {
        for (let i = 0; i < 3; i++) {
            const it = gen.generate({ niveau }, { rng: makeRng(`c${niveau}${i}`), index: i });
            assert.equal(it.answer, 'echange');
            assert.ok(it.hints.length >= 3, 'moins de trois indices');
            assert.equal(it.meta.depart.length, it.meta.colonnes * it.meta.lignes);
            assert.ok(it.meta.minimum > 0, 'le minimum n\'est pas calculé');
            // Le but n'est jamais le départ : ce serait une énigme déjà finie.
            assert.ok(!estArrive(it.meta.depart, it.meta.arrivee),
                `niveau ${niveau}, rang ${i} : l'énigme est déjà résolue`);
        }
    }
});

test('ET LES CAVALIERS SE FABRIQUENT SANS SE FAIRE ATTENDRE', () => {
    const t = performance.now();
    for (const niveau of [1, 2, 3]) {
        for (let i = 0; i < 4; i++) tirerEnigme(niveau, i);
    }
    const dt = Math.round(performance.now() - t);
    // Marge franche : une garde de durée mesure la machine autant que le code,
    // et `npm test` lance ses fichiers en parallèle — leçon du 2 novembre.
    assert.ok(dt < 6000, `${dt} ms pour douze tirages`);
    assert.equal(resoudre(NIVEAUX[2]).length, 16);
});
