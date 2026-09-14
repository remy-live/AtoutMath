// LE CIRCUIT D'EAU — ce que le jeu doit garantir à l'élève.
//
// Un jeu de tuyaux a une promesse et une seule : la grille qu'on te donne PEUT
// être reliée. Elle se tire au hasard, elle se mélange au hasard, et personne
// ne la relit avant de la poser à l'écran — c'est donc ici, et nulle part
// ailleurs, qu'on peut jurer qu'aucun élève ne tombera sur un circuit
// impossible. Le reste des tests protège les deux règles qui font le jeu :
// quatre quarts de tour ne changent rien, et l'eau fuit là où un tuyau plein
// s'ouvre sur le vide.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import {
    NORD, EST, SUD, OUEST, DIRECTIONS, OPPOSE,
    tourner, compterBras, formeDe, periodeDe, quartsMini, sensMini, coutMinimum,
    voisine, tirerReseau, melanger, etatReseau, prochaineReparation
} from '../js/core/tuyaux.js';
import { tuyauxGenerator, LISTE_MARCHES } from '../js/core/generators/tuyaux.js';

// --- Tourner ----------------------------------------------------------------

test('QUATRE QUARTS DE TOUR NE CHANGENT RIEN', () => {
    for (let d = 0; d < 16; d++) {
        assert.equal(tourner(d, 4), d, `${d} : quatre quarts de tour doivent revenir au départ`);
        assert.equal(tourner(d, 0), d);
        // Et le sens inverse est bien l'inverse.
        assert.equal(tourner(tourner(d, 1), -1), d);
        assert.equal(tourner(d, -1), tourner(d, 3), 'un quart à gauche = trois quarts à droite');
    }
});

test('un quart de tour fait glisser chaque bras sur le suivant', () => {
    assert.equal(tourner(NORD, 1), EST);
    assert.equal(tourner(EST, 1), SUD);
    assert.equal(tourner(SUD, 1), OUEST);
    assert.equal(tourner(OUEST, 1), NORD);
    // Un coude nord-est devient un coude est-sud.
    assert.equal(tourner(NORD | EST, 1), EST | SUD);
});

test('LA FORME SE LIT SUR LES BRAS, ET LA PÉRIODE AVEC', () => {
    assert.equal(formeDe(0), 'vide');
    assert.equal(formeDe(NORD), 'bout');
    assert.equal(formeDe(NORD | SUD), 'droit');
    assert.equal(formeDe(EST | OUEST), 'droit');
    assert.equal(formeDe(NORD | EST), 'coude');
    assert.equal(formeDe(NORD | EST | SUD), 'te');
    assert.equal(formeDe(15), 'croix');

    // UNE CROIX NE TOURNE PAS, UN DROIT N'A QUE DEUX POSITIONS. C'est ce qui
    // rend le comptage des quarts de tour honnête : on ne fait pas payer un
    // geste qui ne change rien.
    assert.equal(periodeDe(15), 1);
    assert.equal(periodeDe(NORD | SUD), 2);
    assert.equal(periodeDe(EST | OUEST), 2);
    assert.equal(periodeDe(NORD | EST), 4);
    assert.equal(periodeDe(NORD), 4);
    assert.equal(periodeDe(NORD | EST | SUD), 4);
});

test('LE PLUS COURT CHEMIN NE DÉPASSE JAMAIS DEUX QUARTS DE TOUR', () => {
    for (let d = 1; d < 16; d++) {
        for (let k = 0; k < 4; k++) {
            const cible = tourner(d, k);
            const q = quartsMini(d, cible);
            assert.ok(q !== null && q <= 2, `${d} → ${cible} : ${q}`);
            // Et le sens rendu mène bien à la cible en ce nombre de quarts.
            assert.equal(tourner(d, sensMini(d, cible) * q), cible,
                `${d} → ${cible} : le sens annoncé n'y va pas`);
        }
    }
    // Trois quarts à droite, c'est un quart à gauche — la remarque que la
    // marche comptée est faite pour provoquer.
    assert.equal(quartsMini(NORD, OUEST), 1);
    assert.equal(sensMini(NORD, OUEST), -1);
    // Deux pièces de formes différentes ne se rejoignent jamais.
    assert.equal(quartsMini(NORD | SUD, NORD | EST), null);
});

// --- Le tirage ---------------------------------------------------------------

/** Toutes les arêtes du réseau, comptées une fois. */
function aretes(reseau) {
    const { lignes: L, colonnes: C, cases } = reseau;
    let n = 0;
    cases.forEach((dirs, i) => DIRECTIONS.forEach(d => {
        const j = voisine(i, d, L, C);
        if (j > i && (dirs & d) && (cases[j] & OPPOSE[d])) n++;
    }));
    return n;
}

test('LE CIRCUIT TIRÉ EST UN ARBRE COUVRANT — donc il a une solution', () => {
    for (const [L, C] of [[2, 2], [3, 3], [4, 4], [5, 5], [3, 5], [6, 4]]) {
        for (let essai = 0; essai < 25; essai++) {
            const r = tirerReseau(makeRng(`arbre-${L}-${C}-${essai}`), { lignes: L, colonnes: C });
            const etat = etatReseau(r);

            assert.equal(etat.complet, true, `${L}×${C} : la solution tirée doit être complète`);
            assert.equal(etat.fuites.length, 0, `${L}×${C} : une solution ne fuit pas`);
            // Aucune case décorative : tout ce qu'on voit est à relier.
            assert.ok(r.cases.every(d => compterBras(d) >= 1), `${L}×${C} : une case sans bras`);
            // Aucun bras ne sort de la grille.
            r.cases.forEach((dirs, i) => DIRECTIONS.forEach(d => {
                if (dirs & d) assert.notEqual(voisine(i, d, L, C), -1,
                    `${L}×${C} : un bras sort de la grille en ${i}`);
            }));
            // n − 1 arêtes et tout connecté : c'est la définition d'un arbre.
            assert.equal(aretes(r), L * C - 1, `${L}×${C} : ce n'est pas un arbre`);
            // La source est un bout de tuyau, ou au moins la case la moins fournie.
            const mini = Math.min(...r.cases.map(compterBras));
            assert.equal(compterBras(r.cases[r.source]), mini, 'la source doit être une extrémité');
        }
    }
});

test('LE MÉLANGE NE REND JAMAIS UNE GRILLE DÉJÀ GAGNÉE', () => {
    // C'est le seul cas où le jeu n'aurait aucun sens, et il est d'autant plus
    // probable que la grille est petite : sur du 2×2, une pièce sur deux tombe
    // juste par hasard.
    for (const [L, C] of [[2, 2], [3, 3], [4, 4]]) {
        for (let essai = 0; essai < 40; essai++) {
            const sol = tirerReseau(makeRng(`m-${L}-${C}-${essai}`), { lignes: L, colonnes: C });
            const mel = melanger(makeRng(`s-${L}-${C}-${essai}`), sol);
            assert.equal(etatReseau(mel).complet, false,
                `${L}×${C} essai ${essai} : la grille est déjà finie`);
        }
    }
});

test('« combien » borne le nombre de pièces déplacées', () => {
    for (let essai = 0; essai < 20; essai++) {
        const sol = tirerReseau(makeRng(`c${essai}`), { lignes: 4, colonnes: 4 });
        const mel = melanger(makeRng(`d${essai}`), sol, { combien: 3 });
        const bougees = mel.cases.filter((d, i) => d !== sol.cases[i]).length;
        // Trois au plus — et une de plus dans le seul cas où le mélange serait
        // tombé juste, où l'on retourne une pièce pour casser la grille.
        assert.ok(bougees >= 1 && bougees <= 4, `${bougees} pièces déplacées pour un budget de 3`);
        // On ne « mélange » jamais une croix : la tourner ne ferait rien.
        mel.cases.forEach((d, i) => {
            if (periodeDe(sol.cases[i]) === 1) assert.equal(d, sol.cases[i], 'une croix a été comptée comme déplacée');
        });
    }
});

// --- L'eau et les fuites ------------------------------------------------------

test('L\'EAU NE MOUILLE QUE CE QUI EST RELIÉ À LA SOURCE', () => {
    // Deux cases côte à côte : un bout tourné vers l'autre, et un bout tourné
    // vers le mur. L'eau passe ou non selon le geste, et rien d'autre.
    const relie = { lignes: 1, colonnes: 2, source: 0, cases: [EST, OUEST] };
    assert.equal(etatReseau(relie).complet, true);
    assert.equal(etatReseau(relie).nbRemplies, 2);

    const coupe = { lignes: 1, colonnes: 2, source: 0, cases: [EST, EST] };
    const etat = etatReseau(coupe);
    assert.equal(etat.nbRemplies, 1, 'la deuxième case est sèche');
    assert.equal(etat.complet, false);
    // UNE FUITE EST UN BRAS DE CASE MOUILLÉE. La case sèche pointe elle aussi
    // dans le vide, et ce n'est pas encore un problème.
    assert.deepEqual(etat.fuites, [{ case: 0, dir: EST }]);
});

test('un tuyau sec qui pointe dans le vide ne fuit pas encore', () => {
    const g = { lignes: 1, colonnes: 3, source: 0, cases: [EST, OUEST, NORD] };
    const etat = etatReseau(g);
    assert.equal(etat.nbRemplies, 2);
    // La case 1 est mouillée et son bras est vers l'ouest seulement : rien ne
    // fuit d'elle. La case 2 pointe vers le mur du haut, mais elle est sèche.
    assert.deepEqual(etat.fuites, []);
});

test('L\'INDICE MONTRE UNE PIÈCE À TOURNER, ET LE GESTE EXACT', () => {
    const sol = tirerReseau(makeRng('indice'), { lignes: 4, colonnes: 4 });
    const mel = melanger(makeRng('indice2'), sol, { combien: 3 });
    const coup = prochaineReparation(mel, sol.cases);
    assert.ok(coup, 'une grille mélangée a toujours une réparation à proposer');
    assert.ok(coup.quarts >= 1 && coup.quarts <= 2);
    assert.equal(tourner(mel.cases[coup.case], coup.sens * coup.quarts), sol.cases[coup.case],
        'le geste annoncé doit remettre la pièce d\'aplomb');

    // Une grille déjà finie n'a plus rien à réparer — et l'indice le dit en ne
    // renvoyant rien, plutôt qu'en désignant une pièce au hasard.
    assert.equal(prochaineReparation(sol, sol.cases), null);
});

// --- La promesse : toute grille posée est résoluble ---------------------------

/**
 * UN SOLVEUR, ÉCRIT POUR LE TEST ET POUR LUI SEUL.
 *
 * Le jeu n'en a pas besoin — il vérifie l'état, il ne cherche pas la solution —
 * mais le test, si : c'est la seule façon de prouver qu'une grille tirée AU
 * HASARD puis mélangée AU HASARD reste jouable. On pose les pièces dans
 * l'ordre de lecture, chacune dans une orientation compatible avec le bord et
 * avec ses voisines déjà posées, et l'on revient en arrière quand ça coince.
 */
function resoudre({ lignes, colonnes, cases }) {
    const n = cases.length;
    const out = new Array(n).fill(0);
    const pose = (i) => {
        if (i === n) return true;
        for (let k = 0; k < periodeDe(cases[i]); k++) {
            const d = tourner(cases[i], k);
            let bon = true;
            for (const dir of DIRECTIONS) {
                const j = voisine(i, dir, lignes, colonnes);
                if (j < 0) { if (d & dir) { bon = false; break; } continue; }
                if (j > i) continue;
                if (!!(d & dir) !== !!(out[j] & OPPOSE[dir])) { bon = false; break; }
            }
            if (!bon) continue;
            out[i] = d;
            if (pose(i + 1)) return true;
        }
        return false;
    };
    return pose(0) ? out : null;
}

test('AUCUN ÉLÈVE NE PEUT TOMBER SUR UN CIRCUIT IMPOSSIBLE', () => {
    // La garantie du jeu, et la seule qui compte. On la vérifie sur les quatre
    // niveaux, avec des graines différentes à chaque fois.
    let vues = 0;
    for (const marche of LISTE_MARCHES) {
        for (let essai = 0; essai < 12; essai++) {
            const it = tuyauxGenerator.generate({ marches: [marche.id], nbQuestions: 1 },
                { index: 0, total: 1, rng: makeRng(`jouable-${marche.id}-${essai}`) });
            const grille = {
                lignes: it.meta.lignes, colonnes: it.meta.colonnes,
                source: it.meta.source, cases: it.meta.depart
            };
            const trouvee = resoudre(grille);
            assert.ok(trouvee, `${marche.id} essai ${essai} : grille insoluble`);
            assert.equal(etatReseau({ ...grille, cases: trouvee }).complet, true,
                `${marche.id} : la solution trouvée ne relie pas tout`);
            assert.equal(etatReseau(grille).complet, false,
                `${marche.id} : la grille est donnée déjà finie`);
            vues++;
        }
    }
    assert.equal(vues, LISTE_MARCHES.length * 12);
});

test('LE BUDGET ANNONCÉ EST TENABLE', () => {
    // On promet « en N quarts de tour au plus », et N est le coût de la
    // solution dont la grille est tirée : il est donc atteignable par
    // construction. Ce test fige le lien entre la promesse et le tirage — s'ils
    // se désaccordent un jour, l'exercice deviendrait impossible sans que rien
    // ne le dise.
    for (let essai = 0; essai < 20; essai++) {
        const it = tuyauxGenerator.generate({ marches: ['comptes'], nbQuestions: 1 },
            { index: 0, total: 1, rng: makeRng(`budget${essai}`) });
        const { depart, solution, budget, aTourner } = it.meta;
        assert.equal(budget, coutMinimum(depart, solution));
        assert.ok(budget >= aTourner, 'chaque pièce déplacée coûte au moins un quart de tour');
        assert.ok(budget <= 2 * aTourner, 'et deux au plus');
        assert.ok(aTourner >= 1 && aTourner <= 5, `${aTourner} pièces de travers : ce n'est plus un budget`);
        assert.match(it.prompt.text, /^Relie tout le circuit en \d+ quarts? de tour au plus\.$/);
    }
});

test('CHAQUE NIVEAU COCHÉ EST JOUÉ', () => {
    // La garde commune à tous les exercices à progression : une marche cochée
    // qui ne sort jamais serait un réglage sans effet.
    const total = LISTE_MARCHES.length;
    const vues = new Set();
    for (let i = 0; i < total; i++) {
        const it = tuyauxGenerator.generate({}, { index: i, total, rng: makeRng(`marche${i}`) });
        vues.add(it.meta.marche);
    }
    assert.deepEqual([...vues].sort(), LISTE_MARCHES.map(m => m.id).sort());
});
