// LES SERPENTS — remplir une grille de chemins dont la longueur est imposée.
//
// RÉMY, quatre pages d'un magazine de jeux à l'appui : « j'aimerais bien ces
// jeux en français et en rapport avec les maths ». Celui-ci s'appelait
// « Snakes in Boxes ». Deuxième des quatre.
//
// LA RÈGLE DU CARRÉ DE QUATRE EST LA PLUS BELLE, et c'est celle qu'on oublie :
// sans elle, un « serpent » de huit cases pourrait être un rectangle 2 × 4, et
// le jeu se réduirait à découper la grille en rectangles. Avec elle, le chemin
// doit rester un chemin — parcourable de la tête à la queue sans s'élargir.
//
// CE QUI EN FAIT UN JEU DE MATHÉMATIQUES : le réglage « calculs ». La longueur
// n'est plus écrite, elle est calculée — « 2 × 3 » à la tête du serpent —, et
// il faut savoir que six cases suivront avant de commencer à tracer.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import {
    genererSerpents, verifierSerpents, solutionSerpents, estUnSerpent,
    ecrireLaLongueur, PALIERS_SERPENTS
} from '../js/core/serpents.js';

test('CE QUI EST UN SERPENT, ET CE QUI N\'EN EST PAS', () => {
    // Sur une grille de 5 colonnes.
    const dit = (cases) => estUnSerpent(cases, 5, 5);
    assert.equal(dit([0]).ok, true, 'une case seule');
    assert.equal(dit([0, 1, 2, 3]).ok, true, 'quatre cases en ligne');
    assert.equal(dit([0, 1, 2, 7]).ok, true, 'un L qui tourne à angle droit');
    assert.equal(dit([0, 1, 6, 11, 12, 13]).ok, true, 'un S de six');
    // LE CŒUR DU JEU : ce qui est trop épais.
    assert.equal(dit([0, 1, 5, 6]).ok, false, 'un carré de quatre');
    assert.equal(dit([0, 1, 2, 3, 5, 6, 7, 8]).ok, false, 'un rectangle 2 × 4');
    // Et ce qui n'est pas un chemin.
    assert.equal(dit([0, 1, 2, 6]).pourquoi, 'fourche', 'un T se divise');
    assert.equal(dit([0, 1, 2, 7, 12, 11, 10, 5]).pourquoi, 'boucle', 'un anneau n\'a pas de bout');
    assert.equal(dit([0, 1, 10]).pourquoi, 'coupe', 'deux parties séparées');
});

test('LA TÊTE ET LA QUEUE SONT LES DEUX BOUTS', () => {
    // Le nombre doit être à un BOUT — c'est ce que dit la règle, « le serpent
    // part de ce nombre », et cela change la forme des solutions.
    const v = estUnSerpent([0, 1, 2, 7], 5, 5);
    assert.deepEqual(v.bouts.sort((a, b) => a - b), [0, 7]);
    assert.ok(!v.bouts.includes(1), 'le milieu n\'est pas un bout');
});

test('LE FABRICANT REMPLIT TOUTE LA GRILLE, ET NE TRICHE PAS', () => {
    for (const [nom, P] of Object.entries(PALIERS_SERPENTS)) {
        const longueurs = {};
        for (let i = 0; i < 60; i++) {
            const g = genererSerpents({ rng: makeRng(nom + i), ...P });
            assert.ok(g, `${nom} : pas de grille au tirage ${i}`);
            const vues = new Set();
            g.serpents.forEach(s => s.cases.forEach(c => {
                assert.ok(!vues.has(c), `${nom} : deux serpents se chevauchent`);
                vues.add(c);
            }));
            assert.equal(vues.size, P.lignes * P.colonnes, `${nom} : des cases restent vides`);
            // Chacun est un vrai serpent, et son nombre est à un bout.
            g.serpents.forEach(s => {
                const v = estUnSerpent(s.cases, g.lignes, g.colonnes);
                assert.equal(v.ok, true, `${nom} : « ${v.pourquoi} » dans une grille fabriquée`);
                assert.ok(v.bouts.includes(s.tete), `${nom} : le nombre n\'est pas à un bout`);
                assert.ok(s.longueur <= P.longueurMax, `${nom} : un serpent dépasse la longueur`);
            });
            // Et sa propre solution passe son propre juge.
            assert.equal(verifierSerpents(g, solutionSerpents(g)).ok, true, `${nom} : tirage ${i}`);
            g.serpents.forEach(s => { longueurs[s.longueur] = (longueurs[s.longueur] || 0) + 1; });
        }
        // LA VARIÉTÉ EST UNE EXIGENCE : une grille de serpents de deux cases
        // n'est pas une grille de serpents.
        assert.ok(Object.keys(longueurs).length >= Math.min(4, P.longueurMax),
            `${nom} : seulement ${Object.keys(longueurs).length} longueurs différentes`);
        const seuls = (longueurs[1] || 0) / Object.values(longueurs).reduce((a, b) => a + b, 0);
        assert.ok(seuls < 0.2, `${nom} : ${Math.round(seuls * 100)} % de serpents d\'une case`);
    }
});

test('LE JUGE DIT CE QUI NE VA PAS, ET DANS QUEL ORDRE', () => {
    const g = genererSerpents({ rng: makeRng('juge'), lignes: 5, colonnes: 5, longueurMax: 6 });
    const sol = solutionSerpents(g);
    const grand = g.serpents.find(s => s.longueur >= 3);

    // Une case oubliée passe avant tout le reste.
    const trou = [...sol];
    trou[grand.cases[grand.cases.length - 1]] = null;
    const r1 = verifierSerpents(g, trou);
    assert.equal(r1.problemes[0].genre, 'oubliees');

    // Un serpent trop long : on le dit avec les deux nombres.
    const autre = g.serpents.find(s => s.tete !== grand.tete);
    const vole = [...sol];
    vole[autre.cases[autre.cases.length - 1]] = grand.tete;
    const r2 = verifierSerpents(g, vole);
    assert.equal(r2.ok, false);
    assert.ok(r2.problemes.some(p => p.genre === 'longueur' || p.genre === 'forme'),
        JSON.stringify(r2.problemes.map(p => p.genre)));
    assert.ok(r2.problemes.every(p => p.message && p.message.length > 20),
        'un refus sans phrase n\'apprend rien');

    assert.equal(verifierSerpents(g, sol).ok, true);
});

test('LA LONGUEUR PEUT ÊTRE UN CALCUL, ET IL RESTE FAISABLE DE TÊTE', () => {
    const rng = makeRng('calculs');
    // En nombres, c'est le nombre — et rien d'autre.
    assert.equal(ecrireLaLongueur(6, 'nombres', rng), '6');
    // En calculs, cent tirages : tous justes, et aucun à poser.
    for (let n = 2; n <= 9; n++) {
        for (let k = 0; k < 20; k++) {
            const texte = ecrireLaLongueur(n, 'calculs', rng);
            const m = texte.match(/^(\d+) ([×+−]) (\d+)$/);
            assert.ok(m || texte === String(n), `calcul illisible : « ${texte} »`);
            if (!m) continue;
            const [, a, op, b] = m;
            const vaut = op === '×' ? a * b : (op === '+' ? +a + +b : a - b);
            assert.equal(vaut, n, `« ${texte} » ne fait pas ${n}`);
            // Rien au-delà de 18 : c'est un jeu de logique, le calcul se fait
            // de tête et ne se pose pas.
            assert.ok(Number(a) <= 18 && Number(b) <= 18, `« ${texte} » demande de poser`);
        }
    }
});
