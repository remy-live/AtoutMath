// TESTER UNE SOLUTION, ET LES PROGRAMMES DE CALCUL.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « Equations (tester et retour - Résolution et programme de calcul
// (Exercices type de brevet)) ». Mesuré avant d'écrire : « La Balance des
// Équations » RÉSOUT, et ne fait ni tester ni programme de calcul.
//
// CE QUE CES ÉPREUVES GARDENT :
//
//   1. LES RÉPONSES JUSTES, recalculées depuis l'ÉNONCÉ. Une équation dont la
//      solution annoncée est fausse compte faux un élève qui a raison.
//   2. LES QUATRE PROGRAMMES SE CROISENT. « ×3 puis +4 » donne 3x + 4, « +4
//      puis ×3 » donne 3(x + 4) : tout le chapitre tient dans cette confusion,
//      et la marche qui demande l'expression doit proposer LES DEUX formes
//      avec LES MÊMES nombres. Sinon l'élève choisit sur la taille des
//      nombres, et la question n'apprend rien.
//   3. LE CHEMIN INVERSE TOMBE SUR UN ENTIER. On part du nombre choisi, on
//      calcule — jamais l'inverse. Une division posée au mauvais endroit
//      rendrait 3,5 sous une question qui attend un entier.
//   4. UN ESSAI FAUX RESTE PROCHE. « 42 » quand la solution est 3 se rejette
//      au flair, et la marche n'apprend plus à remplacer.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../js/core/ids.js';
import {
    equationsGenerator as G, ETAPES, PROGRAMMES
} from '../js/core/generators/equations.js';

const nombresDe = (t) => (t.match(/-?\d+/g) || []).map(Number);

test('LES QUATRE PROGRAMMES SE RÉPONDENT DEUX À DEUX', () => {
    // « multiplier puis ajouter » et « ajouter puis multiplier » doivent
    // exister tous les deux, avec les mêmes nombres : c'est la confusion que
    // tout le chapitre travaille, et elle n'existe que si les deux formes se
    // croisent.
    assert.equal(PROGRAMMES.length, 4);
    const ecrits = PROGRAMMES.map(p => p.ecrire(3, 4));
    assert.equal(new Set(ecrits).size, 4, `deux programmes s'écrivent pareil : ${ecrits}`);
    assert.ok(ecrits.some(e => /^\d+x \+/.test(e)), 'il manque la forme ax + b');
    assert.ok(ecrits.some(e => /^\d+\(x \+/.test(e)), 'il manque la forme a(x + b)');
    assert.ok(ecrits.some(e => /^\d+x −/.test(e)), 'il manque la forme ax − b');
    assert.ok(ecrits.some(e => /^\d+\(x −/.test(e)), 'il manque la forme a(x − b)');

    // ET `retour` DÉFAIT VRAIMENT `valeur`. Il est écrit à la main plutôt que
    // déduit : une division posée au mauvais endroit rendrait un résultat faux
    // sans que rien ne casse.
    for (const p of PROGRAMMES) {
        for (let a = 2; a <= 6; a++) {
            for (let b = 1; b <= 9; b++) {
                for (let x = b + 1; x <= b + 9; x++) {
                    const r = p.valeur(x, a, b);
                    assert.equal(p.retour(r, a, b), x,
                        `${p.id} : a=${a} b=${b} x=${x} → ${r} → ${p.retour(r, a, b)}`);
                }
            }
        }
    }
});

test('TOUTES LES MARCHES RÉPONDENT JUSTE', () => {
    for (const e of ETAPES) {
        for (let k = 0; k < 40; k++) {
            const it = G.generate({ marches: [e.id] },
                { rng: makeRng(`${e.id}-${k}`), index: k, total: 40 });
            const t = it.prompt.text;
            assert.ok(t.length > 15, `${e.id} : énoncé vide`);
            assert.equal(it.meta.marche, e.id);

            if (e.id === 'tester') {
                // « On considère l'équation Ax + B = C. Le nombre E est-il solution ? »
                const [a, b, c, essai] = nombresDe(t);
                assert.equal(it.answer, a * essai + b === c ? 'oui' : 'non',
                    `${essai} dans ${a}x + ${b} = ${c}`);
                // UN ESSAI FAUX RESTE PROCHE : au-delà de deux, il se rejette
                // au flair et la marche n'apprend plus à remplacer.
                const vrai = (c - b) / a;
                assert.ok(Math.abs(essai - vrai) <= 2,
                    `${essai} contre ${vrai} : l'essai est trop loin`);
            }
            if (e.id === 'lequel') {
                const nb = nombresDe(t);
                const [p1, p2, p3, p4, a, b, c] = nb;
                const quatre = [p1, p2, p3, p4];
                const solutions = quatre.filter(v => a * v + b === c);
                assert.equal(solutions.length, 1,
                    `${solutions.length} solutions parmi ${quatre} pour ${a}x + ${b} = ${c}`);
                assert.equal(Number(it.answer), solutions[0], t);
                // ET LES QUATRE SONT ÉCRITS DANS L'ÉNONCÉ : la feuille n'a pas
                // de boutons.
                const papier = it.prompt.papier || t;
                it.choices.forEach(ch => assert.ok(papier.includes(String(ch.value)),
                    `${ch.value} n'est pas dans l'énoncé de papier`));
            }
            if (e.id === 'programme-direct' || e.id === 'programme-retour') {
                // On refait le programme à la main depuis les lignes écrites.
                const a = Number(t.match(/par (\d+)/)[1]);
                const b = Number(t.match(/(?:Ajoute|Retire) (\d+)/)[1]);
                const ajoute = /Ajoute/.test(t);
                const multDAbord = /Multiplie-le par/.test(t);
                const calc = (x) => (multDAbord
                    ? a * x + (ajoute ? b : -b)
                    : a * (x + (ajoute ? b : -b)));
                if (e.id === 'programme-direct') {
                    const x = Number(t.match(/On choisit (\d+)/)[1]);
                    assert.equal(Number(it.answer), calc(x), t);
                } else {
                    const r = Number(t.match(/On obtient (-?\d+)/)[1]);
                    assert.equal(calc(Number(it.answer)), r, t);
                    assert.ok(Number.isInteger(Number(it.answer)),
                        `${t} → ${it.answer} : le chemin inverse ne tombe pas sur un entier`);
                }
            }
            if (e.id === 'programme-ecrire') {
                // LES QUATRE PROPOSITIONS PORTENT LES MÊMES NOMBRES : rien
                // d'autre que l'ordre des lignes ne les départage.
                const valeurs = it.choices.map(c => String(c.value));
                assert.equal(valeurs.length, 4, t);
                const chiffres = valeurs.map(v => (v.match(/\d+/g) || []).join(','));
                assert.equal(new Set(chiffres).size, 1,
                    `les propositions n'ont pas les mêmes nombres : ${valeurs}`);
                assert.equal(valeurs.filter(v => /\(/.test(v)).length, 2,
                    `il faut deux formes avec parenthèses et deux sans : ${valeurs}`);
                const juste = it.choices.find(c => c.correct).value;
                const multDAbord = /Multiplie-le par/.test(t);
                assert.equal(/\(/.test(juste), !multDAbord,
                    `${t} → ${juste} : les parenthèses ne disent pas le bon ordre`);
            }
            if (e.id === 'resoudre') {
                const [a, b, c] = nombresDe(t);
                const plus = /x \+/.test(t);
                assert.equal(Number(it.answer), plus ? (c - b) / a : (c + b) / a, t);
                assert.ok(c > 0, `${t} : le second membre est négatif`);
            }
            if (e.id === 'probleme') {
                const [fixe, par, total] = nombresDe(t);
                assert.equal(Number(it.answer), (total - fixe) / par, t);
                assert.ok(Number.isInteger(Number(it.answer)), t);
                assert.ok(Number(it.answer) > 0, t);
            }
        }
    }
});

test('LES MARCHES FERMÉES NE RÉPONDENT PAS TOUJOURS PAREIL', () => {
    // Une marche qui dirait « oui » quarante fois apprendrait à répondre
    // « oui » sans lire — c'est l'inverse de ce qu'elle travaille.
    for (const id of ['tester']) {
        const vues = new Set();
        for (let k = 0; k < 40; k++) {
            vues.add(G.generate({ marches: [id] },
                { rng: makeRng(`v-${id}-${k}`), index: k, total: 40 }).answer);
        }
        assert.deepEqual([...vues].sort(), ['non', 'oui'], `${id} : ${[...vues]}`);
    }
    // ET LES QUATRE PROGRAMMES SORTENT TOUS, sinon deux d'entre eux ne se
    // rencontrent jamais et la confusion qu'on travaille n'arrive pas.
    const formes = new Set();
    for (let k = 0; k < 60; k++) {
        const t = G.generate({ marches: ['programme-direct'] },
            { rng: makeRng('f' + k), index: k, total: 60 }).prompt.text;
        formes.add(`${/Multiplie-le par/.test(t) ? 'mult' : 'add'}-${/Ajoute/.test(t) ? '+' : '-'}`);
    }
    assert.equal(formes.size, 4, `seulement ${formes.size} programmes sur quatre : ${[...formes]}`);
});

test('LE FACTEUR ET LE TERME NE SONT JAMAIS LE MÊME NOMBRE', () => {
    // VU SUR LA FEUILLE IMPRIMÉE : « Multiplie-le par 4. Ajoute 4. » puis
    // « Parmi 4x + 4 ; 4(x + 4) ; 4x − 4 et 4(x − 4) ». La question reste
    // résoluble — seules les parenthèses tranchent —, mais l'élève ne peut
    // plus dire quel 4 vient de quelle ligne, et c'est tout ce qu'on lui
    // demande de lire ici.
    for (const id of ['programme-direct', 'programme-retour', 'programme-ecrire']) {
        for (let k = 0; k < 60; k++) {
            const t = G.generate({ marches: [id] },
                { rng: makeRng(`ab-${id}-${k}`), index: k, total: 60 }).prompt.text;
            const a = Number(t.match(/par (\d+)/)[1]);
            const b = Number(t.match(/(?:Ajoute|Retire) (\d+)/)[1]);
            assert.notEqual(a, b, t);
        }
    }
});

test('LES TROIS COMPÉTENCES SONT DISTINGUÉES', () => {
    // Tester n'est pas une petite résolution, et un programme de calcul n'est
    // pas une équation : un élève peut dérouler un programme sans savoir
    // résoudre, et l'inverse.
    const vues = new Set(ETAPES.map(e =>
        G.generate({ marches: [e.id] }, { rng: makeRng('s' + e.id), index: 0, total: 1 }).skillId));
    assert.deepEqual([...vues].sort(),
        ['alg.equation.programme', 'alg.equation.resoudre', 'alg.equation.tester']);
    assert.deepEqual([...G.skills].sort(),
        ['alg.equation.programme', 'alg.equation.resoudre', 'alg.equation.tester']);
});

test('LE PETIT BAIN EST EN TÊTE, ET IL NE RÉSOUT RIEN', () => {
    // RÉMY : « progressif ». Les deux premières marches TESTENT — on remplace,
    // on calcule, on compare — et ne demandent aucune technique de résolution.
    const temps = ETAPES.map(e => e.temps);
    assert.deepEqual([...temps].sort(), temps, `les temps ne se suivent pas : ${temps.join('')}`);
    assert.equal(temps[0], 'A');
    for (const e of ETAPES.filter(x => x.temps === 'A')) {
        for (let k = 0; k < 20; k++) {
            const it = G.generate({ marches: [e.id] },
                { rng: makeRng(`bain-${e.id}-${k}`), index: k, total: 20 });
            assert.ok(!/Résous/.test(it.prompt.text),
                `${e.id} demande déjà de résoudre : « ${it.prompt.text} »`);
        }
    }
});

test('LES ÉNONCÉS SE LISENT', () => {
    // MESURÉ SUR LA SORTIE : « On ajoute 1 DES deux côtés » — on retire des
    // deux côtés, on n'ajoute pas des deux côtés.
    const FAUTES = [
        /ajoute \d+ des deux côtés/,
        /\bde (é|â|î|ô|û|a|e|i|o|u)/i,
        /undefined|NaN|\[object/,
        /\s{2}|\s[.,]/
    ];
    for (const e of ETAPES) {
        for (let k = 0; k < 30; k++) {
            const it = G.generate({ marches: [e.id] },
                { rng: makeRng(`m-${e.id}-${k}`), index: k, total: 30 });
            const tout = `${it.prompt.text} ${it.explanation} ${(it.hints || []).join(' ')}`;
            FAUTES.forEach(re => assert.ok(!re.test(tout),
                `${e.id} : « ${(tout.match(re) || [''])[0]} » dans « ${it.prompt.text} »`));
        }
    }
});
