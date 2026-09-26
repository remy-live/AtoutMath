// LE PATCHWORK — découper une grille en morceaux qui ont un centre de symétrie.
//
// RÉMY, quatre pages d'un magazine de jeux à l'appui : « j'aimerais bien ces
// jeux en français et en rapport avec les maths ». Celui-ci s'appelait
// « Quilt », et c'est le plus mathématique des quatre.
//
// CE QU'IL APPREND, ET QUI MANQUAIT. La symétrie centrale s'enseigne sur des
// figures qu'on REGARDE, presque jamais sur des figures qu'on FABRIQUE. Ici
// l'élève cherche, pour une aire donnée, quelles formes ont un centre : il bute
// sur le L de quatre cases qui n'en a pas, et découvre que pour une aire paire
// le centre tombe ENTRE deux cases. Ces deux choses-là ne se disent pas.
//
// DEUX MESURES ONT CHANGÉ LE FABRICANT :
//   · pousse au hasard, 300 grilles de 5×5 : plus de la MOITIÉ des morceaux ne
//     faisaient qu'une case — un patchwork de cases seules n'est pas un
//     patchwork. Remplacée par un pavage avec retour arrière ;
//   · pavage trié strictement par aire : les 300 grilles avaient EXACTEMENT les
//     mêmes aires (2, 3, 4, 4, 6, 6). Corrigé en bruitant le classement.
//   Après : 5 à 10 morceaux par grille, des aires de 1 à 6, 0,2 ms par grille.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import {
    genererPatchwork, verifierPatchwork, solutionDe, symetrieCentrale,
    dUnSeulTenant, formesSymetriques, centreDe, PALIERS_PATCHWORK
} from '../js/core/patchwork.js';

test('CE QUI A UN CENTRE DE SYMÉTRIE, ET CE QUI N\'EN A PAS', () => {
    // Sur une grille de 5 colonnes. C'est la leçon du jeu, en quatre lignes.
    const oui = (cases) => symetrieCentrale(cases, 5, 5).ok;
    assert.equal(oui([0]), true, 'une case seule est son propre centre');
    assert.equal(oui([0, 1]), true, 'un domino couché');
    assert.equal(oui([0, 5]), true, 'un domino debout');
    assert.equal(oui([0, 1, 2]), true, 'trois cases en ligne');
    assert.equal(oui([0, 1, 5, 6]), true, 'un carré de quatre');
    assert.equal(oui([0, 1, 6, 7]), true, 'un S de quatre');
    assert.equal(oui([1, 2, 5, 6]), true, 'un Z de quatre');
    assert.equal(oui([1, 5, 6, 7, 11]), true, 'une croix de cinq');
    // ET LES REFUS, qui sont ce que l'élève vient chercher.
    assert.equal(oui([0, 1, 5]), false, 'un L de trois');
    assert.equal(oui([0, 1, 5, 10]), false, 'un L de quatre');
    assert.equal(oui([0, 1, 2, 5]), false, 'un T de quatre');
    assert.equal(oui([0, 1, 2, 6]), false, 'un T renversé');
});

test('LE CENTRE TOMBE ENTRE DEUX CASES QUAND L\'AIRE EST PAIRE', () => {
    // C'est la découverte du jeu, et elle se lit dans les coordonnées doublées :
    // un nombre impair veut dire « entre deux ».
    assert.deepEqual(centreDe([0], 5), { r2: 0, c2: 0 });         // sur la case
    assert.deepEqual(centreDe([0, 1], 5), { r2: 0, c2: 1 });      // entre deux, à l'horizontale
    assert.deepEqual(centreDe([0, 5], 5), { r2: 1, c2: 0 });      // entre deux, à la verticale
    assert.deepEqual(centreDe([0, 1, 5, 6], 5), { r2: 1, c2: 1 }); // au coin de quatre
    assert.deepEqual(centreDe([0, 1, 2], 5), { r2: 0, c2: 2 });   // sur la case du milieu
});

test('LES FORMES SONT ÉNUMÉRÉES, PAS ÉCRITES À LA MAIN', () => {
    // Une liste écrite à la main oublie toujours quelque chose, et ce qu'elle
    // oublie, l'élève ne le rencontre jamais.
    const f = formesSymetriques(6);
    const parTaille = {};
    f.forEach(x => { parTaille[x.length] = (parTaille[x.length] || 0) + 1; });
    assert.equal(parTaille[1], 1, 'la case seule');
    assert.equal(parTaille[2], 2, 'le domino, couché et debout');
    assert.ok(parTaille[4] >= 5, `seulement ${parTaille[4]} formes de quatre cases`);
    assert.ok(parTaille[6] >= 8, `seulement ${parTaille[6]} formes de six cases`);
    // Et TOUTES passent le juge de l'élève : le filtre est le même.
    const large = 8;
    f.forEach(forme => assert.ok(
        symetrieCentrale(forme.map(([r, c]) => r * large + c), large, large).ok,
        `une forme sans centre a été gardée : ${JSON.stringify(forme)}`));
    // Aucune forme ne dépasse l'aire demandée.
    assert.ok(Math.max(...f.map(x => x.length)) === 6);
});

test('LE FABRICANT PRODUIT DES GRILLES VARIÉES, ET JUSTES', () => {
    const aires = [];
    const tailles = {};
    for (let i = 0; i < 120; i++) {
        const g = genererPatchwork({ rng: makeRng('t' + i), lignes: 5, colonnes: 5, tailleMax: 6 });
        assert.ok(g, `pas de grille au tirage ${i}`);
        // Toute la grille est couverte, une seule fois.
        const vues = new Set();
        g.morceaux.forEach(m => m.cases.forEach(c => {
            assert.ok(!vues.has(c), 'deux morceaux se chevauchent');
            vues.add(c);
        }));
        assert.equal(vues.size, 25, 'des cases ne sont dans aucun morceau');
        // Et sa propre solution passe son propre juge.
        assert.equal(verifierPatchwork(g, solutionDe(g)).ok, true,
            `le fabricant produit une grille que le juge refuse (tirage ${i})`);
        aires.push(g.morceaux.length);
        g.morceaux.forEach(m => { tailles[m.nombre] = (tailles[m.nombre] || 0) + 1; });
    }
    // LA VARIÉTÉ EST UNE EXIGENCE, PAS UN BONUS : mesurée, elle avait disparu
    // deux fois — d'abord en morceaux d'une case, puis en grilles identiques.
    assert.ok(new Set(aires).size >= 3,
        `toutes les grilles ont le même nombre de morceaux (${[...new Set(aires)]})`);
    assert.ok(Object.keys(tailles).length >= 4,
        `seulement ${Object.keys(tailles).length} aires différentes`);
    const seules = (tailles[1] || 0) / Object.values(tailles).reduce((a, b) => a + b, 0);
    assert.ok(seules < 0.45, `${Math.round(seules * 100)} % des morceaux ne font qu'une case`);
});

test('LE JUGE DIT CE QUI NE VA PAS, DANS L\'ORDRE OÙ ON L\'APPREND', () => {
    const g = genererPatchwork({ rng: makeRng('juge'), lignes: 5, colonnes: 5, tailleMax: 6 });
    const sol = solutionDe(g);

    // Une case oubliée : on le dit avant tout le reste.
    const gros = g.morceaux.find(m => m.nombre >= 2);
    const trou = [...sol];
    trou[gros.cases.find(c => c !== gros.indice)] = null;
    const r1 = verifierPatchwork(g, trou);
    assert.equal(r1.ok, false);
    assert.equal(r1.problemes[0].genre, 'oubliees');

    // Une aire fausse, sans case oubliée : une case change de propriétaire.
    const autre = g.morceaux.find(m => m.indice !== gros.indice && m.nombre >= 2);
    const vole = [...sol];
    vole[autre.cases.find(c => c !== autre.indice)] = gros.indice;
    const r2 = verifierPatchwork(g, vole);
    assert.equal(r2.ok, false);
    assert.ok(r2.problemes.every(p => p.genre !== 'oubliees'));
    assert.ok(r2.problemes.some(p => ['aire', 'coupe', 'symetrie'].includes(p.genre)),
        JSON.stringify(r2.problemes.map(p => p.genre)));

    // Et la solution du fabricant, elle, passe.
    assert.equal(verifierPatchwork(g, sol).ok, true);
});

test('UN MORCEAU EN DEUX PARTIES EST REFUSÉ', () => {
    // Deux carrés séparés ont un centre de symétrie commun, et pourtant ce
    // n'est pas UN morceau : sans ce test, l'élève pourrait colorier deux
    // taches et les appeler un patchwork.
    assert.equal(symetrieCentrale([0, 4, 20, 24], 5, 5).ok, true, 'les quatre coins sont symétriques');
    assert.equal(dUnSeulTenant([0, 4, 20, 24], 5, 5), false, 'et pourtant ils ne se touchent pas');
});

test('LES QUATRE PALIERS FABRIQUENT TOUS QUELQUE CHOSE', () => {
    for (const [nom, P] of Object.entries(PALIERS_PATCHWORK)) {
        const g = genererPatchwork({ rng: makeRng('p' + nom), ...P });
        assert.ok(g, `le palier ${nom} ne produit rien`);
        assert.equal(verifierPatchwork(g, solutionDe(g)).ok, true, nom);
        assert.ok(g.morceaux.every(m => m.nombre <= P.tailleMax),
            `${nom} : un morceau dépasse ${P.tailleMax} cases`);
        assert.ok(P.label && P.label.length > 5, `${nom} : pas de libellé`);
    }
});
