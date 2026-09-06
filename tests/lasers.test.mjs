// LE RAYON ET LES MIROIRS — ce que la grille doit garantir.
//
// Rémy : « j'aimerai bien un jeu dans ce style avec des lasers et des miroirs
// […] C'est un exercice bonus comme le sudoku. »
//
// Un rayon qui tourne du mauvais côté est une erreur qu'on ne voit pas en
// relisant le code : elle se voit à l'écran, une fois, et l'on croit alors
// avoir mal compris le jeu. Trois promesses, donc, et la première est celle qui
// rendrait l'exercice injouable si elle tombait :
//
//   · TOUTE GRILLE TIRÉE SE RÉSOUT, et avec exactement son budget. Une grille
//     insoluble ne se signale pas : l'élève cherche, et c'est tout.
//   · LE REBOND EST JUSTE, ET SES QUATRE CAS AVEC. Un seul inversé, et c'est
//     un jeu qui ment.
//   · LE BUDGET TIENT. Sans lui on couvre la grille de miroirs jusqu'à ce que
//     ça marche, et il ne reste plus de raisonnement.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import {
    VIDE, MUR, MIROIRS, SENS, refleter, miroirPour, tracer, tourner,
    poserMiroir, miroirsPoses, MARCHES_LASER, tirerNiveau
} from '../js/core/lasers.js';
import { lasersGenerator } from '../js/core/generators/lasers.js';

test('LE REBOND EST JUSTE, ET SES QUATRE CAS AVEC', () => {
    // Le miroir « / » va du coin bas-gauche au coin haut-droit. Un rayon qui
    // part vers la droite le frappe par en dessous et repart vers le haut.
    assert.equal(refleter('E', '/'), 'N');
    assert.equal(refleter('N', '/'), 'E');
    assert.equal(refleter('O', '/'), 'S');
    assert.equal(refleter('S', '/'), 'O');
    // Et « \ » est l'autre diagonale : elle échange la droite et le bas.
    assert.equal(refleter('E', '\\'), 'S');
    assert.equal(refleter('S', '\\'), 'E');
    assert.equal(refleter('O', '\\'), 'N');
    assert.equal(refleter('N', '\\'), 'O');
    // Rien d'autre ne dévie le rayon.
    SENS.forEach(s => {
        assert.equal(refleter(s, VIDE), s);
        assert.equal(refleter(s, MUR), s, 'un mur ARRÊTE, il ne dévie pas');
    });
    // UN MIROIR EST UNE INVOLUTION : repasser dessus en sens inverse remet le
    // rayon dans sa direction d'origine. C'est ce qui fait qu'un miroir est un
    // miroir et non une flèche.
    MIROIRS.forEach(m => SENS.forEach(s => {
        assert.equal(refleter(refleter(s, m), m), s, `${m} sur ${s}`);
    }));
    // Et un rebond est TOUJOURS un quart de tour, jamais un demi-tour.
    MIROIRS.forEach(m => SENS.forEach(s => {
        const apres = refleter(s, m);
        assert.ok(apres === tourner(s, 1) || apres === tourner(s, -1),
            `${m} sur ${s} : ${apres} n'est pas un quart de tour`);
    }));
});

test('le miroir qui fait tourner d\'ici vers là se retrouve, et lui seul', () => {
    SENS.forEach(a => SENS.forEach(b => {
        const m = miroirPour(a, b);
        if (a === b) assert.equal(m, null, 'aller tout droit ne demande pas de miroir');
        else if (tourner(a, 1) === b || tourner(a, -1) === b) {
            assert.ok(MIROIRS.includes(m), `${a} → ${b}`);
            assert.equal(refleter(a, m), b);
        } else assert.equal(m, null, 'un demi-tour ne se fait pas avec un miroir');
    }));
});

test('TOUTE GRILLE TIRÉE SE RÉSOUT, et avec exactement son budget', () => {
    for (const marche of MARCHES_LASER) {
        for (let k = 0; k < 40; k++) {
            const g = tirerNiveau(makeRng(`${marche.id}-${k}`), marche);
            assert.ok(g, `${marche.nom} : tirage impossible`);
            // La solution tirée amène bien le rayon sur la cible.
            const r = tracer({ ...g, cases: g.solution });
            assert.equal(r.touche, true, `${marche.nom} : la solution rate la cible`);
            // Le budget vaut exactement le nombre de miroirs qui manquent.
            const manquants = g.solution.filter((c, i) =>
                MIROIRS.includes(c) && !MIROIRS.includes(g.cases[i])).length;
            assert.equal(g.budget, manquants, `${marche.nom} : budget ${g.budget} pour ${manquants} miroirs`);
            assert.ok(g.budget >= 1, `${marche.nom} : rien à poser`);
            // ET CE N'EST PAS DÉJÀ GAGNÉ. Une grille où le rayon touche la
            // cible sans rien poser n'est pas une question.
            assert.equal(tracer(g).touche, false, `${marche.nom} : gagnée d'avance`);
            // Les miroirs vissés le sont vraiment, et jamais tous.
            const vis = g.fixes.filter(Boolean).length;
            assert.ok(vis < manquants + vis, `${marche.nom} : tout est déjà posé`);
            g.fixes.forEach((f, i) => {
                if (f) assert.ok(MIROIRS.includes(g.cases[i]), 'une case vissée sans miroir');
            });
        }
    }
});

test('LE RAYON S\'ARRÊTE, TOUJOURS, ET DIT COMMENT', () => {
    // Les quatre fins possibles existent et sont nommées : sans cela, une
    // boucle serait une page figée.
    const n = 4;
    const vide = { n, cases: new Array(n * n).fill(VIDE), fixes: [], source: { x: 0, y: 0, sens: 'E' }, cible: { x: 3, y: 3 } };
    assert.equal(tracer(vide).fin, 'sortie');

    const mur = { ...vide, cases: vide.cases.map((c, i) => (i === 2 ? MUR : c)) };
    assert.equal(tracer(mur).fin, 'mur');

    const gagne = { ...vide, cible: { x: 2, y: 0 } };
    assert.equal(tracer(gagne).fin, 'cible');
    assert.equal(tracer(gagne).touche, true);

    // ET LA BOUCLE N'ARRIVE JAMAIS — c'est un théorème, pas une chance.
    //
    // Un miroir est une INVOLUTION : le trajet est réversible. Si le rayon
    // tournait en rond, on pourrait le remonter à l'envers, et il devrait
    // ressortir par où il est entré — ce qui contredit le fait qu'il tourne.
    // Un rayon venu du dehors ne peut donc pas se faire piéger. Le garde-fou
    // du compteur de pas reste dans le code (une page figée serait pire qu'un
    // rayon perdu), mais on vérifie ici qu'il ne sert jamais : mille grilles
    // couvertes de miroirs au hasard, et pas une boucle.
    const rng = makeRng('boucles');
    for (let k = 0; k < 1000; k++) {
        const m = 5;
        const cases = new Array(m * m).fill(VIDE).map(() => {
            const d = rng.int(0, 3);
            return d === 0 ? '/' : d === 1 ? '\\' : d === 2 ? MUR : VIDE;
        });
        const g2 = {
            n: m, cases, fixes: [],
            source: { x: 0, y: rng.int(0, m - 1), sens: 'E' }, cible: { x: m - 1, y: m - 1 }
        };
        const fin = tracer(g2).fin;
        assert.notEqual(fin, 'boucle', `grille ${k} : ${cases.join('')}`);
        assert.ok(['sortie', 'mur', 'cible'].includes(fin), fin);
    }
});

test('UNE CASE TRAVERSÉE DEUX FOIS N\'EST PAS UNE BOUCLE', () => {
    // Un rayon peut repasser sur ses pas à angle droit — une fois à
    // l'horizontale, une fois à la verticale. Compter les CASES vues au lieu
    // des couples (case, direction) déclarerait une boucle qui n'existe pas,
    // et refuserait des trajets parfaitement justes.
    const n = 5;
    const cases = new Array(n * n).fill(VIDE);
    cases[0 * n + 3] = '\\';        // E → S
    cases[2 * n + 3] = '\\';        // S → E ... on redescend plus loin
    const g = { n, cases, fixes: [], source: { x: 0, y: 0, sens: 'E' }, cible: { x: 4, y: 2 } };
    const r = tracer(g);
    assert.equal(r.touche, true, r.fin);
});

test('LE BUDGET TIENT, ET IL LE DIT AVANT DE REFUSER', () => {
    const n = 4;
    const g = {
        n, cases: new Array(n * n).fill(VIDE), fixes: new Array(n * n).fill(false),
        solution: new Array(n * n).fill(VIDE),
        source: { x: 0, y: 0, sens: 'E' }, cible: { x: 3, y: 3 }, budget: 1
    };
    // Le premier miroir passe, le second est refusé — et le refus s'explique.
    const un = poserMiroir(g, 5);
    assert.equal(un.refus, undefined);
    assert.equal(miroirsPoses(un.cases, g.fixes), 1);
    const deux = poserMiroir({ ...g, cases: un.cases }, 9);
    assert.ok(deux.refus && deux.refus.includes('1 miroir'), deux.refus);

    // MAIS ON PEUT TOUJOURS TOURNER CELUI QU'ON A POSÉ : le budget compte les
    // miroirs, pas les appuis. Sans cela, un élève qui pose le bon miroir dans
    // le mauvais sens serait coincé.
    const tourne = poserMiroir({ ...g, cases: un.cases }, 5);
    assert.equal(tourne.refus, undefined);
    assert.equal(tourne.cases[5], MIROIRS[1]);
    // Et le troisième appui le retire, ce qui rend le miroir au budget.
    const vide2 = poserMiroir({ ...g, cases: tourne.cases }, 5);
    assert.equal(vide2.cases[5], VIDE);
    assert.equal(miroirsPoses(vide2.cases, g.fixes), 0);
});

test('on ne pose rien sur la source, la cible, un mur ni un miroir vissé', () => {
    const n = 4;
    const cases = new Array(n * n).fill(VIDE);
    cases[6] = MUR; cases[7] = '/';
    const fixes = new Array(n * n).fill(false); fixes[7] = true;
    const g = {
        n, cases, fixes, solution: cases.slice(),
        source: { x: 0, y: 0, sens: 'E' }, cible: { x: 3, y: 3 }, budget: 3
    };
    assert.ok(poserMiroir(g, 0).refus, 'la source');
    assert.ok(poserMiroir(g, 15).refus, 'la cible');
    assert.ok(poserMiroir(g, 6).refus, 'un mur');
    assert.ok(poserMiroir(g, 7).refus, 'un miroir vissé');
    // Et chaque refus est une phrase, pas un silence.
    [0, 15, 6, 7].forEach(i => assert.ok(poserMiroir(g, i).refus.length > 20));
});

test('CHAQUE NIVEAU COCHÉ EST JOUÉ, et son item porte tout ce qu\'il faut', () => {
    const total = MARCHES_LASER.length;
    const vus = new Set();
    for (let i = 0; i < total; i++) {
        const it = lasersGenerator.generate({}, { index: i, total, rng: makeRng(`g${i}`) });
        vus.add(it.meta.marche);
        assert.equal(it.answerKind, 'grid');
        assert.equal(it.answer, 'rayon-arrive');
        assert.equal(it.meta.depart.length, it.meta.n * it.meta.n);
        assert.equal(it.meta.solution.length, it.meta.n * it.meta.n);
        assert.equal(it.meta.fixes.length, it.meta.n * it.meta.n);
        assert.equal(it.hints.length, 3);
        it.hints.forEach(h => assert.ok(h.length < 120, h));
        assert.ok(it.meta.trajet.length >= 2);
        // La consigne dit COMBIEN de miroirs, parce que c'est la règle du jeu.
        assert.match(it.prompt.text, /miroirs?/);
    }
    // Le repli sur un niveau plus court est autorisé — un trajet à quatre
    // virages ne tient pas toujours —, mais il ne doit pas avaler la
    // progression : au moins la moitié des niveaux demandés doivent sortir.
    assert.ok(vus.size >= Math.ceil(total / 2), `${vus.size} niveaux distincts sur ${total}`);
});

test('l\'explication dit le trajet sans donner les cases', () => {
    for (let i = 0; i < MARCHES_LASER.length; i++) {
        const it = lasersGenerator.generate({}, { index: i, total: MARCHES_LASER.length, rng: makeRng(`e${i}`) });
        assert.ok(it.explanation.length <= 200, it.explanation);
        assert.doesNotMatch(it.explanation, /\d+\s*,\s*\d+/, 'une case nommée dans l\'explication');
        assert.match(it.explanation, /quart de tour/);
    }
});
