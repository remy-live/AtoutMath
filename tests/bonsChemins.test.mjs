// Les bons chemins : la règle du jeu, et la preuve qu'on l'a bien retrouvée.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import '../js/core/activities/index.js';
import { getGenerator } from '../js/core/registry.js';
import { getExerciseById } from '../js/data/catalog.js';
import { RENDUS } from '../js/ui/printSheet.js';
import {
    PALIERS, genererGrille, cheminsPossibles, compterChemins, voisines, produit,
    facteurs, peutAvancer, avancer, couper, verifier, prochainPas, conseil,
    decomposer, traceVide
} from '../js/core/bonsChemins.js';

/** La grille de la fiche de Rémy, telle quelle. */
const FICHE = {
    l: 3, h: 3, depart: [0, 0], arrivee: [2, 2],
    cases: [['D', 2, 3], [2, 4, 5], [10, 2, 'A']]
};

test('LA GRILLE DE LA FICHE DONNE SES SIX CIBLES', () => {
    // C'est le test qui a FIXÉ la règle. Les six produits imprimés sur la
    // feuille sont 8, 30, 40, 320, 240 et 4800 ; si notre règle en manque un,
    // c'est notre règle qui est fausse, pas la fiche.
    const tous = cheminsPossibles(FICHE);
    for (const cible of [8, 30, 40, 320, 240, 4800]) {
        assert.ok(tous.has(cible), `la fiche demande ${cible} : aucun chemin ne le donne`);
        const route = tous.get(cible);
        assert.equal(produit(FICHE, route), cible);
    }
});

test('SANS LES DIAGONALES, LA CIBLE 8 SERAIT IMPOSSIBLE', () => {
    // La preuve que les diagonales font partie de la règle, et non un choix de
    // confort : les deux cases voisines de A en croix valent 5 et 2, donc tout
    // chemin sans diagonale finit par un 5 ou un 2. Or 8 = 2 × 4, et le 4 n'est
    // voisin de A qu'en biais.
    const enCroix = { ...FICHE };
    const tous = new Map();
    (function marche(x, y, p, vu) {
        if (x === 2 && y === 2) { tous.set(p, true); return; }
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const X = x + dx, Y = y + dy;
            if (X < 0 || Y < 0 || X > 2 || Y > 2 || vu.has(`${X},${Y}`)) continue;
            const v = enCroix.cases[Y][X];
            marche(X, Y, p * (typeof v === 'number' ? v : 1), new Set(vu).add(`${X},${Y}`));
        }
    })(0, 0, 1, new Set(['0,0']));
    assert.equal(tous.has(8), false, 'sans diagonale, 8 ne devrait pas sortir');
    assert.equal(tous.has(30), true, 'les autres cibles, elles, sortent quand même');
});

test('4800 traverse les sept nombres — donc on ne repasse jamais deux fois', () => {
    // La plus grosse cible de la fiche est le produit de TOUS les nombres de la
    // grille : 2 × 3 × 2 × 4 × 5 × 10 × 2. C'est ce qui borne le jeu par le
    // haut, et ce qui prouve qu'une case ne se reprend pas — sinon il n'y
    // aurait plus de maximum du tout.
    const route = cheminsPossibles(FICHE).get(4800);
    assert.equal(facteurs(FICHE, route).length, 7, 'les sept nombres, chacun une fois');
    assert.equal(new Set(route.map(c => c.join(','))).size, route.length, 'aucune case reprise');
});

test('les huit voisines, et pas une de plus', () => {
    assert.equal(voisines(FICHE, [1, 1]).length, 8, 'au centre, huit voisines');
    assert.equal(voisines(FICHE, [0, 0]).length, 3, 'dans un coin, trois');
    assert.equal(voisines(FICHE, [1, 0]).length, 5, 'sur un bord, cinq');
});

test('UN PRODUIT QUI NE DIVISE PLUS LA CIBLE EST UNE IMPASSE, ET LE JEU LE DIT', () => {
    // C'est le cœur pédagogique. On multiplie par des entiers : le produit ne
    // redescend jamais, et il ne perd jamais un facteur. Dès que le produit
    // courant ne divise plus la cible, aucun chemin ne peut plus aboutir —
    // laisser l'élève tâtonner dix minutes serait cruel et inutile.
    const g = { ...FICHE, cible: 8 };
    // D → 2 (en haut) → 3 : on a 6, et 6 ne divise pas 8.
    const chemin = [[0, 0], [1, 0], [2, 0]];
    const bilan = verifier(g, chemin);
    assert.equal(bilan.mort, true);
    assert.match(bilan.message, /ne divise pas 8/);
    // Tant qu'il divise, le jeu dit ce qu'il RESTE à faire.
    const bon = verifier(g, [[0, 0], [1, 0]]);
    assert.equal(bon.mort, undefined);
    assert.equal(bon.reste, 4);
});

test('le chemin de la fiche pour 8 gagne, un autre arrivé au A perd', () => {
    const g = { ...FICHE, cible: 8 };
    // D → 2 → 4 → A en diagonale : 2 × 4 = 8.
    const gagnant = [[0, 0], [1, 0], [1, 1], [2, 2]];
    assert.equal(verifier(g, gagnant).gagne, true);
    // Arriver au A ne suffit pas : le produit doit tomber juste.
    const perdant = [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]];
    const bilan = verifier(g, perdant);
    assert.equal(bilan.gagne, false);
    assert.match(bilan.message, /il fallait 8/);
});

test('les refus expliquent la règle au lieu de la répéter', () => {
    const g = { ...FICHE, cible: 8 };
    const chemin = [[0, 0], [1, 0]];
    // Un saut : ce n'est pas une voisine.
    const loin = peutAvancer(g, chemin, [0, 2]);
    assert.equal(loin.ok, false);
    assert.match(loin.raison, /diagonales comptent/);
    // Une case déjà prise.
    const reprise = peutAvancer(g, chemin, [0, 0]);
    assert.equal(reprise.ok, false);
    assert.match(reprise.raison, /jamais deux fois/);
    // Une diagonale, elle, passe.
    assert.equal(peutAvancer(g, chemin, [2, 1]).ok, true);
});

test('revenir sur une case de son chemin le COUPE là', () => {
    // Un chemin se cherche en se trompant : tout effacer pour une erreur au
    // cinquième pas découragerait n'importe qui.
    const chemin = [[0, 0], [1, 0], [1, 1], [2, 1]];
    assert.deepEqual(couper(chemin, [1, 0]), [[0, 0], [1, 0]]);
    assert.deepEqual(couper(chemin, [0, 0]), [[0, 0]], 'revenir au départ remet tout à zéro');
});

test('L\'AIDE PROLONGE LE CHEMIN DE L\'ÉLÈVE, ELLE N\'EN PROPOSE PAS UN AUTRE', () => {
    const g = { ...FICHE, cible: 240 };
    // L'élève a commencé par le haut : D → 2. L'aide continue DE LÀ.
    const commence = [[0, 0], [1, 0]];
    const pas = prochainPas(g, commence);
    assert.ok(pas, 'il existe une suite gagnante à partir de là');
    const suite = avancer(g, commence, pas);
    assert.equal(240 % produit(g, suite), 0, 'et elle garde le produit divisant la cible');

    // ET ELLE NE MENT PAS QUAND IL N'Y A PLUS RIEN. Descendre par la gauche
    // (D → 2 → 10) donne 20, il resterait 12 à faire — or de là, aucun chemin
    // ne rejoint le A en faisant exactement 12. L'aide doit le reconnaître
    // plutôt que de proposer un pas qui ne mène nulle part.
    assert.equal(prochainPas(g, [[0, 0], [0, 1], [0, 2]]), null);
    // Et depuis une impasse arithmétique, encore moins.
    assert.equal(prochainPas({ ...FICHE, cible: 8 }, [[0, 0], [1, 0], [2, 0]]), null);
});

test('le conseil donne le RAISONNEMENT, jamais la case', () => {
    const g = { ...FICHE, cible: 240 };
    const texte = conseil(g, [[0, 0], [1, 0]]);        // on a fait 2, il reste 120
    assert.match(texte, /reste 120/);
    assert.match(texte, /2 × 2 × 2 × 3 × 5/, 'la décomposition en facteurs premiers');
    assert.equal(/case|colonne|ligne|droite|gauche/.test(texte), false,
        'un conseil qui désigne une case n\'apprend rien');
    assert.deepEqual(decomposer(240), [2, 2, 2, 2, 3, 5]);
});

test('chaque palier produit une grille RÉSOLUBLE, et de la bonne longueur', () => {
    for (const [nom, P] of Object.entries(PALIERS)) {
        for (let s = 1; s <= 25; s++) {
            const g = genererGrille({ rng: makeRng(`${nom}-${s}`), palier: nom });
            assert.ok(g, `${nom} graine ${s} : aucune grille`);
            // La solution annoncée doit vraiment gagner.
            assert.equal(produit(g, g.solution), g.cible, `${nom} graine ${s}`);
            assert.equal(verifier(g, g.solution).gagne, true, `${nom} graine ${s}`);
            const nb = facteurs(g, g.solution).length;
            assert.ok(nb >= P.longueur[0] && nb <= P.longueur[1],
                `${nom} graine ${s} : ${nb} nombres, on en voulait ${P.longueur.join('–')}`);
            assert.ok(g.cible > 1 && g.cible <= P.cibleMax,
                `${nom} graine ${s} : cible ${g.cible} hors des bornes`);
            assert.ok(g.nbChemins >= 1, `${nom} graine ${s} : aucun chemin ne mène à la cible`);
            // Le départ et l'arrivée ne portent pas de nombre : ils ne comptent pas.
            assert.equal(g.cases[0][0], 'D');
            assert.equal(g.cases[g.h - 1][g.l - 1], 'A');
        }
    }
});

test('la même graine redonne exactement la même grille', () => {
    // La feuille et l'écran doivent montrer la même chose : c'est ce qui permet
    // de corriger au tableau ce qu'on a imprimé.
    const a = genererGrille({ rng: makeRng('pareil'), palier: 'moyen' });
    const b = genererGrille({ rng: makeRng('pareil'), palier: 'moyen' });
    assert.deepEqual(a.cases, b.cases);
    assert.equal(a.cible, b.cible);
});

test('compterChemins dit combien de solutions a une cible', () => {
    // Sur la grille de la fiche, 40 s'atteint de neuf façons et 30 d'une seule :
    // c'est exactement ce qui distingue une cible où l'on tombe juste par
    // hasard d'une cible qui FORCE le raisonnement.
    assert.equal(compterChemins({ ...FICHE }, 40), 9);
    assert.equal(compterChemins({ ...FICHE }, 30), 1);
    // 4800 est le produit des sept nombres : tous les chemins qui passent
    // partout y arrivent, seul l'ordre change.
    assert.equal(compterChemins({ ...FICHE }, 4800), 30);
    // 7 n'est pas dans la grille : aucun chemin ne peut le donner.
    assert.equal(compterChemins({ ...FICHE }, 7), 0, 'un produit impossible en compte zéro');
});

test('le chemin part toujours du D', () => {
    const g = genererGrille({ rng: makeRng('depart'), palier: 'facile' });
    assert.deepEqual(traceVide(g), [[0, 0]]);
    assert.equal(produit(g, traceVide(g)), 1, 'le D ne multiplie rien');
});

// --- La feuille ---------------------------------------------------------------

test('LE GÉNÉRATEUR DE FICHE POSE DES GRILLES RÉSOLUBLES', () => {
    const gen = getGenerator('logique.bons-chemins');
    assert.ok(gen, 'le générateur doit être enregistré');
    for (const palier of Object.keys(PALIERS)) {
        for (let s = 1; s <= 6; s++) {
            const item = gen.generate({ palier }, { rng: makeRng(`fiche-${palier}-${s}`) });
            const m = item.meta;
            // La grille voyage ENTIÈRE dans meta : la feuille ne recalcule rien,
            // donc elle ne peut pas diverger de l'écran.
            const g = { l: m.l, h: m.h, cases: m.cases, depart: [0, 0], arrivee: [m.l - 1, m.h - 1], cible: m.cible };
            assert.equal(produit(g, m.solution), m.cible, `${palier} ${s}`);
            assert.equal(verifier(g, m.solution).gagne, true, `${palier} ${s}`);
            // La consigne du bloc porte la cible : six blocs, six cibles.
            assert.match(item.prompt.html, new RegExp(`Trouve ${m.cible}`));
            assert.equal(item.answer, facteurs(g, m.solution).join(' × '));
            assert.ok(item.difficulty >= 1 && item.difficulty <= 4);
        }
    }
});

test('la fiche sait dessiner ces grilles', () => {
    const rendu = RENDUS['bons-chemins'];
    assert.ok(rendu, 'le rendu papier doit être déclaré');
    const item = getGenerator('logique.bons-chemins').generate({}, { rng: makeRng('dessin') });
    const slot = { x: 10, y: 10, w: 55, h: 65 };
    for (const solution of [false, true]) {
        const svg = rendu.previewGrille(item, slot, 3, solution);
        assert.match(svg, /<svg/);
        // Les neuf cases, le D, le A et la cible sous la grille.
        assert.equal((svg.match(/<rect/g) || []).length, item.meta.l * item.meta.h);
        assert.match(svg, />D</);
        assert.match(svg, />A</);
        assert.match(svg, new RegExp(`Trouve ${item.meta.cible}`));
        assert.equal(/<path/.test(svg), solution, 'le chemin ne se montre que sur la correction');
    }
});

test('l\'exercice du catalogue tient debout', () => {
    const exo = getExerciseById('calc-bons-chemins');
    assert.ok(exo, 'l\'exercice doit être au catalogue');
    assert.equal(exo.activityId, 'bons-chemins');
    assert.equal(exo.printGeneratorId, 'logique.bons-chemins');
    assert.ok(getGenerator(exo.printGeneratorId), 'son générateur de fiche doit exister');
    assert.ok(RENDUS[exo.printable], 'son rendu papier doit exister');
    // Les paliers proposés au professeur doivent tous exister dans le noyau :
    // un réglage qui ne correspond à rien retomberait en silence sur « moyen ».
    const schema = exo.paramSchema.find(p => p.id === 'palier');
    schema.options.forEach(o => assert.ok(PALIERS[o.value], `palier inconnu : ${o.value}`));
});
