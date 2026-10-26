// LE SHIKAKU — une grille, un seul découpage possible.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 26 octobre, capture d'écran à l'appui : « Tu pourrais me créer ce jeu
// là ».
//
// LA PROMESSE CENTRALE EST L'UNICITÉ, et c'est elle que cette épreuve garde :
// un élève ne doit JAMAIS poser un découpage cohérent et s'entendre dire qu'il
// est faux. Sur une grille à deux solutions, l'une des deux est comptée fausse
// sans que rien ne puisse l'expliquer — ni à l'élève, ni au professeur.
//
// ON NE VÉRIFIE PAS QUE LE GÉNÉRATEUR DIT « unique », ON COMPTE. Le solveur
// qui compte est celui du générateur, mais il sert ici à vérifier une grille
// RENDUE, pas à en fabriquer une : s'il se trompait, le pavage et les aires —
// mesurés séparément, case par case — le diraient.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { readFileSync } from 'node:fs';
import '../js/core/activities/index.js';
import { exercices } from '../js/data/catalog.js';
import { getGenerator } from '../js/core/registry.js';
import { makeRng } from '../js/core/ids.js';
import { evaluate } from '../js/core/items.js';
import { shikakuGenerator as G, compterSolutions, FORMATS, ecrireDecoupage }
    from '../js/core/generators/shikaku.js';

const lire = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const aire = (r) => (r.r1 - r.r0 + 1) * (r.c1 - r.c0 + 1);

/** Toutes les grilles d'un réglage, pour les regarder une par une. */
function grilles(format, difficulte, combien = 10) {
    return Array.from({ length: combien }, (_, i) =>
        G.generate({ format, difficulte }, { rng: makeRng(`${format}${difficulte}${i}`), index: i }));
}

test('CHAQUE GRILLE EST COUVERTE EXACTEMENT UNE FOIS', () => {
    // NI TROU NI CHEVAUCHEMENT : c'est la règle du jeu, et c'est aussi la
    // seule chose qu'un pavage par découpes successives ne peut pas rater —
    // on le vérifie quand même, parce que c'est ce qui rendrait la grille
    // impossible sans qu'aucun message ne le dise.
    for (const format of Object.keys(FORMATS)) {
        for (const difficulte of ['facile', 'moyen', 'difficile']) {
            for (const it of grilles(format, difficulte, 6)) {
                const { lignes, colonnes, solution } = it.meta;
                const vu = Array.from({ length: lignes }, () => Array(colonnes).fill(0));
                solution.forEach(r => {
                    for (let a = r.r0; a <= r.r1; a++) {
                        for (let b = r.c0; b <= r.c1; b++) vu[a][b]++;
                    }
                });
                const fautes = vu.flat().filter(v => v !== 1).length;
                assert.equal(fautes, 0,
                    `${format}/${difficulte} : ${fautes} case(s) couvertes 0 ou 2 fois`);
            }
        }
    }
});

test('CHAQUE NOMBRE EST L\'AIRE DE SON RECTANGLE, ET IL EST DEDANS', () => {
    for (const difficulte of ['facile', 'moyen', 'difficile']) {
        for (const it of grilles('classique', difficulte, 8)) {
            const { indices, solution } = it.meta;
            assert.equal(indices.length, solution.length,
                'un rectangle sans nombre, ou un nombre sans rectangle');
            indices.forEach((ind, k) => {
                const r = solution[k];
                assert.equal(ind.n, aire(r),
                    `le nombre ${ind.n} coiffe un rectangle de ${aire(r)} cases`);
                assert.ok(ind.r >= r.r0 && ind.r <= r.r1 && ind.c >= r.c0 && ind.c <= r.c1,
                    `le nombre ${ind.n} est écrit HORS de son rectangle`);
            });
        }
    }
});

test('ET LA SOLUTION EST UNIQUE — C\'EST TOUTE LA PROMESSE', () => {
    for (const format of Object.keys(FORMATS)) {
        for (const difficulte of ['facile', 'moyen', 'difficile']) {
            for (const it of grilles(format, difficulte, 5)) {
                const { lignes, colonnes, indices } = it.meta;
                const n = compterSolutions(lignes, colonnes, indices, 3);
                assert.equal(n, 1,
                    `${format}/${difficulte} : ${n} découpage(s) possibles au lieu d'un seul`);
            }
        }
    }
});

test('AUCUNE CASE SEULE : UN « 1 » NE DEMANDE RIEN', () => {
    // Un rectangle d'une case DONNE sa réponse — il désigne sa propre case. Le
    // premier jet en fabriquait jusqu'à trente-sept par grille, parce que la
    // découpe n'avait pas de plancher : la grille se remplissait toute seule.
    for (const format of Object.keys(FORMATS)) {
        for (const difficulte of ['facile', 'moyen', 'difficile']) {
            for (const it of grilles(format, difficulte, 5)) {
                const seules = it.meta.solution.filter(r => aire(r) === 1).length;
                assert.equal(seules, 0, `${format}/${difficulte} : ${seules} case(s) seule(s)`);
            }
        }
    }
});

test('LA DIFFICULTÉ FAIT GRANDIR LES RECTANGLES, PAS LE NOMBRE DE CASES', () => {
    // C'EST LE LEVIER, ET IL S'EST TROMPÉ DE SENS AU PREMIER JET : « difficile »
    // découpait PLUS menu que « facile ». Or un 2 n'a qu'une forme et se pose
    // sans réfléchir ; un 12 en a trois, et c'est là que l'exercice commence.
    const moyenne = (d) => {
        const aires = grilles('classique', d, 10).flatMap(it => it.meta.solution.map(aire));
        return aires.reduce((a, b) => a + b, 0) / aires.length;
    };
    const f = moyenne('facile'), m = moyenne('moyen'), d = moyenne('difficile');
    assert.ok(f < m, `facile ${f.toFixed(1)} n'est pas plus menu que moyen ${m.toFixed(1)}`);
    assert.ok(m < d, `moyen ${m.toFixed(1)} n'est pas plus menu que difficile ${d.toFixed(1)}`);
    // ET LE PLAFOND DU FORMAT EST TENU : la promesse « aucun nombre au-dessus
    // de 12 » doit être vraie, sinon le réglage ne veut rien dire.
    for (const difficulte of ['facile', 'moyen', 'difficile']) {
        for (const it of grilles('classique', difficulte, 6)) {
            const max = Math.max(...it.meta.solution.map(aire));
            assert.ok(max <= FORMATS.classique.max,
                `un rectangle de ${max} cases pour un plafond de ${FORMATS.classique.max}`);
        }
    }
});

test('LE DÉCOUPAGE ATTENDU EST CELUI QUE L\'ÉCRAN ENVERRA', () => {
    // L'activité trie ses rectangles de haut en bas puis de gauche à droite,
    // et écrit la même chaîne. Deux découpages identiques doivent s'écrire
    // pareil — sinon le bon serait compté faux, ce qui est exactement ce que
    // l'unicité existe pour empêcher.
    for (const it of grilles('classique', 'moyen', 6)) {
        const tri = it.meta.solution.slice().sort((a, b) => (a.r0 - b.r0) || (a.c0 - b.c0));
        assert.equal(ecrireDecoupage(tri), it.answer,
            'l\'ordre de lecture du générateur n\'est pas celui de l\'activité');
        assert.ok(evaluate(it, it.answer).correct, 'la bonne réponse est comptée fausse');
        // Et un découpage qui diffère d'un seul rectangle est compté faux.
        const autre = tri.map((r, i) => (i === 0 ? { ...r, r1: r.r1 } : r));
        autre[0] = { ...autre[0], c1: autre[0].c1 + 1 };
        assert.ok(!evaluate(it, ecrireDecoupage(autre)).correct,
            'un découpage différent est compté juste');
    }
});

test('L\'EXERCICE EST AU CATALOGUE, AVEC SON ÉCRAN ET SON PAPIER', () => {
    const exo = exercices.find(e => e.id === 'logi-shikaku');
    assert.ok(exo, 'logi-shikaku a disparu du catalogue');
    assert.equal(exo.activityId, 'shikaku');
    assert.equal(exo.printable, 'shikaku', 'le Shikaku ne s\'imprime plus');
    assert.ok(getGenerator(exo.generatorId), 'le générateur n\'est pas enregistré');
    // LE GESTE EST LE GLISSER, et l'activité doit le brancher : sans
    // `pointerdown` sur le plateau, la grille s'affiche et rien ne se pose.
    const act = lire('js/core/activities/shikaku.js');
    assert.match(act, /addEventListener\('pointerdown'/, 'le glisser n\'est plus branché');
    // ET CHAQUE CASE DIT OÙ ELLE VA. Sans position explicite, la grille range
    // les cases dans ce que les nombres lui laissent : mesuré,
    // `elementFromPoint` au milieu du plateau désignait la case [0,6] là où
    // l'on visait [1,1], et un rectangle juste se posait sur deux nombres.
    assert.match(act, /class="sk-case"[^]{0,120}style="\$\{zone\(/,
        'les cases sont de nouveau placées automatiquement');
});
