// LE STRIMKO — un carré latin dont les régions sont des RUISSEAUX.
//
// RÉMY : « tu me fais le jeu strimko ».
//
// ─────────────────────────────────────────────────────────────────────────────
//
// TROIS CHOSES PEUVENT RATER DANS UN GÉNÉRATEUR DE CE GENRE, et aucune ne se
// voit en regardant une grille :
//
//   · UNE GRILLE À PLUSIEURS SOLUTIONS. L'élève en trouve une, le logiciel la
//     refuse. C'est le défaut qui fait abandonner un exercice pour de bon.
//   · UN RUISSEAU QUI N'EN EST PAS. S'il n'est pas d'un seul tenant, on ne peut
//     pas le suivre du doigt, et le dessin ment sur la règle.
//   · UN RUISSEAU QUI PORTE DEUX FOIS LE MÊME NOMBRE. La grille n'a alors
//     aucune solution, et l'élève cherche une faute qui n'est pas la sienne.
//
// On les mesure toutes les trois sur chaque palier, et sur assez de grilles
// pour que le hasard ne décide pas du verdict.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    strimkoGenerator, PALIERS, carreLatin, decouperEnRuisseaux,
    carteDesRuisseaux, compterSolutions, choisirLesIndices, resoluParSingletons
} from '../js/core/generators/strimko.js';
import { makeRng } from '../js/core/ids.js';

const PALIERS_NOMMES = Object.keys(PALIERS);
const grilles = (palier, combien = 25) => Array.from({ length: combien },
    (_, i) => strimkoGenerator.generate({ palier }, { rng: makeRng(`${palier}-${i}`) }).meta);

const voisines = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;

// ───────────────────────────────────────── CE QUI REND LA GRILLE JOUABLE ────

test('CHAQUE GRILLE N\'A QU\'UNE SEULE SOLUTION', () => {
    // LE DÉFAUT QUI FAIT ABANDONNER UN EXERCICE : l'élève trouve une grille
    // valide, le logiciel la refuse, et il n'a aucun moyen de comprendre
    // pourquoi. Rien ne le signale à l'écran — il faut compter.
    for (const palier of PALIERS_NOMMES) {
        for (const m of grilles(palier)) {
            assert.equal(compterSolutions(m.n, m.ruisseaux, m.donnees, 2), 1,
                `${palier} : grille à plusieurs solutions`);
        }
    }
});

test('UN RUISSEAU EST UNE CHAÎNE, PAS UNE TACHE', () => {
    // C'est ce qui permet de le SUIVRE du doigt, et c'est ce que le dessin
    // promet : chaque case touche la suivante par un côté. Une région en forme
    // de L épais se regarde ; une chaîne se parcourt.
    for (const palier of PALIERS_NOMMES) {
        for (const m of grilles(palier)) {
            for (const ruisseau of m.ruisseaux) {
                assert.equal(ruisseau.length, m.n, `${palier} : ruisseau de ${ruisseau.length} cases`);
                for (let i = 1; i < ruisseau.length; i++) {
                    assert.ok(voisines(ruisseau[i - 1], ruisseau[i]),
                        `${palier} : le ruisseau saute de (${ruisseau[i - 1].r},${ruisseau[i - 1].c}) `
                        + `à (${ruisseau[i].r},${ruisseau[i].c})`);
                }
            }
        }
    }
});

test('ET IL PORTE LES n NOMBRES, UNE FOIS CHACUN', () => {
    // Sans cette contrainte, la grille n'a AUCUNE solution — et l'élève
    // cherche une faute qui n'est pas la sienne.
    for (const palier of PALIERS_NOMMES) {
        for (const m of grilles(palier)) {
            for (const ruisseau of m.ruisseaux) {
                const vues = new Set(ruisseau.map(p => m.solution[p.r][p.c]));
                assert.equal(vues.size, m.n, `${palier} : un ruisseau répète un nombre`);
            }
        }
    }
});

test('LES RUISSEAUX PAVENT LA GRILLE, SANS TROU NI RECOUVREMENT', () => {
    // n ruisseaux de n cases font n² cases : s'il y a un recouvrement, il y a
    // forcément un trou, et une case sans ruisseau n'a plus que deux
    // contraintes au lieu de trois — ce qui casse l'unicité sans rien dire.
    for (const palier of PALIERS_NOMMES) {
        for (const m of grilles(palier)) {
            assert.equal(m.ruisseaux.length, m.n);
            const carte = carteDesRuisseaux(m.n, m.ruisseaux);
            for (let r = 0; r < m.n; r++) {
                for (let c = 0; c < m.n; c++) {
                    assert.ok(carte[r][c] >= 0, `${palier} : la case (${r},${c}) n'a pas de ruisseau`);
                }
            }
            const cles = new Set();
            m.ruisseaux.flat().forEach(p => cles.add(`${p.r},${p.c}`));
            assert.equal(cles.size, m.n * m.n, `${palier} : deux ruisseaux se recouvrent`);
        }
    }
});

test('LA SOLUTION EST UN VRAI CARRÉ LATIN', () => {
    for (const palier of PALIERS_NOMMES) {
        for (const m of grilles(palier)) {
            for (let i = 0; i < m.n; i++) {
                assert.equal(new Set(m.solution[i]).size, m.n, `${palier} : ligne ${i}`);
                assert.equal(new Set(m.solution.map(l => l[i])).size, m.n, `${palier} : colonne ${i}`);
            }
        }
    }
});

test('les indices disent la vérité sur la solution', () => {
    // Un indice qui contredit la solution rend la grille insoluble, et l'élève
    // s'acharne sur une grille morte.
    for (const palier of PALIERS_NOMMES) {
        for (const m of grilles(palier, 10)) {
            for (const d of m.donnees) {
                assert.equal(d.v, m.solution[d.r][d.c], `${palier} : indice faux en (${d.r},${d.c})`);
            }
        }
    }
});

// ──────────────────────────────────────────────── LES PALIERS ──────────────

test('LE RUISSEAU SERT VRAIMENT — sinon ce n\'est pas un Strimko', () => {
    // L'ÉPREUVE QUI A SAUVÉ CE JEU, et je ne l'avais pas écrite.
    //
    // `epreuveTombe.mjs` a refusé une autre épreuve : en RETIRANT la contrainte
    // de ruisseau du solveur, rien ne tombait. J'ai alors compté, et c'était
    // massif — 23 grilles sur 25 au palier découverte, 9 ou 10 sur 25 ailleurs,
    // se résolvaient en IGNORANT les ruisseaux. Des sudokus à décor coloré,
    // valides, uniques, et qui n'étaient pas le jeu demandé.
    //
    // UNE GRILLE AMBIGUË SANS LES RUISSEAUX, C'EST LA DÉFINITION : il FAUT s'en
    // servir pour la finir. On passe une liste de ruisseaux vide pour compter
    // sans eux.
    for (const palier of PALIERS_NOMMES) {
        for (const m of grilles(palier, 20)) {
            assert.ok(compterSolutions(m.n, [], m.donnees, 2) > 1,
                `${palier} : cette grille se résout sans jamais regarder les ruisseaux`);
        }
    }
});

test('« DÉCOUVERTE » SE FINIT SANS JAMAIS ESSAYER', () => {
    // LE VRAI LEVIER DE FACILITÉ, et il a remplacé le mauvais. J'avais fait de
    // « découverte » une grille PLUS AIDÉE — six indices au lieu de quatre.
    // Mesuré : avec six indices sur un 4 × 4, les lignes et les colonnes
    // suffisent presque toujours, et le ruisseau ne sert jamais. Le palier
    // censé faire COMPRENDRE la règle était celui où elle ne servait pas.
    //
    // Ce qui rend une grille douce n'est pas le nombre d'indices, c'est qu'on
    // puisse toujours trouver une case à un seul candidat — donc la finir avec
    // la seule phrase qu'on enseigne, sans jamais raisonner par l'absurde.
    for (const m of grilles('decouverte', 20)) {
        assert.ok(resoluParSingletons(m.n, m.ruisseaux, m.donnees),
            'une grille de découverte demande d\'essayer');
    }
});

test('ET LES PALIERS DEMANDENT DE PLUS EN PLUS', () => {
    // Quatre paliers qui donnent la même chose ne servent à rien. La taille
    // monte, et la part de grilles qui se finissent sans essayer DESCEND —
    // mesuré : 30/30, 25/30, 15/30, 5/30, 3/30.
    const tailles = PALIERS_NOMMES.map(p => PALIERS[p].n);
    for (let i = 1; i < tailles.length; i++) {
        assert.ok(tailles[i] >= tailles[i - 1], `${PALIERS_NOMMES[i]} : la grille rétrécit`);
    }
    const douceur = (p) => {
        const g = grilles(p, 20);
        return g.filter(m => resoluParSingletons(m.n, m.ruisseaux, m.donnees)).length / g.length;
    };
    const facile = douceur('decouverte'), dur = douceur('difficile');
    assert.ok(facile > dur + 0.3,
        `découverte ${(facile * 100).toFixed(0)} % contre difficile ${(dur * 100).toFixed(0)} % : `
        + 'les deux paliers demandent la même chose');
});

test('ON NE DESCEND JAMAIS SOUS CE QUE L\'UNICITÉ PERMET', () => {
    // `garder` est un PLANCHER, pas une cible atteinte : si retirer une case de
    // plus rendait la grille ambiguë, on la garde. Une grille à deux solutions
    // serait pire qu'une grille trop aidée.
    const rng = makeRng('plancher');
    const n = 5;
    const sol = carreLatin(rng, n);
    const ruisseaux = decouperEnRuisseaux(rng, n, sol);
    // On demande l'impossible — zéro indice — et l'on vérifie qu'on reste
    // quand même sur une grille unique.
    const donnees = choisirLesIndices(rng, n, sol, ruisseaux, 0);
    assert.ok(donnees.length > 0, 'une grille sans aucun indice n\'est jamais unique');
    assert.equal(compterSolutions(n, ruisseaux, donnees, 2), 1);
});

// ────────────────────────────────────────── LE COMPTEUR DE SOLUTIONS ────────

test('LE COMPTEUR SAIT DIRE « PLUSIEURS » — sinon il ne garde rien', () => {
    // C'est lui qui garantit tout le reste : s'il rendait 1 à tort, chaque
    // épreuve ci-dessus passerait au vert sur des grilles ambiguës.
    const rng = makeRng('compteur');
    const n = 4;
    const sol = carreLatin(rng, n);
    const ruisseaux = decouperEnRuisseaux(rng, n, sol);
    assert.equal(compterSolutions(n, ruisseaux, [], 2), 2, 'sans indice, il y a plusieurs solutions');
    const toutes = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) toutes.push({ r, c, v: sol[r][c] });
    assert.equal(compterSolutions(n, ruisseaux, toutes, 2), 1, 'la grille pleine en a une');
});

test('et il dit ZÉRO sur une grille contradictoire', () => {
    // Deux fois le même nombre sur une ligne : aucune solution. Rendre 1 ici
    // ferait accepter une grille morte au moment du retrait d'indices.
    const rng = makeRng('zero');
    const n = 4;
    const sol = carreLatin(rng, n);
    const ruisseaux = decouperEnRuisseaux(rng, n, sol);
    const v = sol[0][0];
    const autre = (sol[0][1] === v ? sol[0][2] : sol[0][1]);
    assert.equal(compterSolutions(n, ruisseaux, [
        { r: 0, c: 0, v }, { r: 0, c: 1, v }
    ], 2), 0, `deux ${v} sur la première ligne`);
    assert.ok(autre !== undefined);
});

// ──────────────────────────────────────────────── LE DÉCOUPAGE ─────────────

test('le découpage réussit sur toutes les tailles', () => {
    // MESURÉ avant d'écrire le reste : 200 réussites sur 200 de 4 × 4 à 7 × 7.
    // L'épreuve garde cette réussite, parce qu'un découpage qui échouerait
    // rendrait une grille sans ruisseaux — donc un écran vide.
    for (const n of [4, 5, 6, 7]) {
        for (let s = 0; s < 15; s++) {
            const rng = makeRng(`d${n}-${s}`);
            const sol = carreLatin(rng, n);
            const ruisseaux = decouperEnRuisseaux(rng, n, sol);
            assert.ok(ruisseaux, `n=${n}, graine ${s} : découpage impossible`);
            assert.equal(ruisseaux.length, n);
        }
    }
});

test('la grille est reproductible à graine égale', () => {
    // Deux élèves sur la même séance doivent voir la même grille : sinon on ne
    // peut pas en parler au tableau.
    const a = strimkoGenerator.generate({ palier: 'moyen' }, { rng: makeRng('pareil') });
    const b = strimkoGenerator.generate({ palier: 'moyen' }, { rng: makeRng('pareil') });
    assert.deepEqual(a.meta.solution, b.meta.solution);
    assert.deepEqual(a.meta.donnees, b.meta.donnees);
    assert.equal(a.answer, b.answer);
});

test('la réponse attendue décrit bien la solution', () => {
    // L'activité compare ce que l'élève a posé à `answer` : les deux formes
    // doivent coïncider, sinon une grille juste est refusée.
    const it = strimkoGenerator.generate({ palier: 'facile' }, { rng: makeRng('rep') });
    assert.equal(it.answer, it.meta.solution.map(l => l.join('')).join('|'));
});

test('un palier inconnu ne casse rien', () => {
    const it = strimkoGenerator.generate({ palier: 'n\'importe quoi' }, { rng: makeRng('x') });
    assert.equal(it.meta.n, PALIERS.facile.n);
    assert.equal(strimkoGenerator.generate({}, { rng: makeRng('y') }).meta.n, PALIERS.facile.n);
});
