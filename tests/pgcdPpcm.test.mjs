// DÉCOMPOSER, PGCD ET PPCM — l'arithmétique de troisième.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « J'aimerai bien des exercices pour décomposer un nombre et pgcd et
// ppcm niveau 3ème. Des exercices d'application direct et des petits
// problèmes ».
//
// CE QUE CES ÉPREUVES GARDENT :
//
//   1. LES NOMBRES JUSTES. Un exercice d'arithmétique dont une réponse est
//      fausse est pire qu'un exercice absent : l'élève qui a juste est compté
//      faux, et il n'a aucun moyen de le savoir.
//   2. DES COUPLES QUI VALENT LA PEINE. Deux nombres pris au hasard sont
//      premiers entre eux six fois sur dix — PGCD égal à 1, PPCM égal au
//      produit, et le problème des bouquets devient « un bouquet par fleur ».
//   3. LE SENS DE LA RÉPONSE. Un PGCD est plus PETIT que ses deux nombres, un
//      PPCM plus GRAND. C'est la seule vérification qu'un élève de troisième
//      puisse faire seul, et c'est elle qui lui dit qu'il s'est trompé de
//      notion. Si les énoncés eux-mêmes ne la respectaient pas, on lui
//      apprendrait le contraire.
//   4. DES ÉNONCÉS QUI SE LISENT. Mesuré en lisant ce que le générateur
//      produit : « en utilisant toutes ses stylos », « des trousses TOUS
//      IDENTIQUES », « ils sont ensemble de la gare ». Un énoncé mal accordé
//      fait trébucher la lecture au moment précis où l'on demande de lire avec
//      attention.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../js/core/ids.js';
import {
    pgcd, ppcm, estPremier, facteursPremiers, facteursGroupes,
    ecrireDecomposition, ecrireAPlat, irreductible, premiersEntreEux,
    pgcdExplique, ppcmExplique
} from '../js/core/arithmetique.js';
import {
    pgcdPpcmGenerator as G, ETAPES, COUPLES, COUPLES_PETITS, A_DECOMPOSER, A_TESTER
} from '../js/core/generators/pgcdPpcm.js';

// ────────────────────────────────────────── LE NOYAU ────────────────────────

test('LE PGCD ET LE PPCM SONT JUSTES, Y COMPRIS AUX BORDS', () => {
    assert.equal(pgcd(84, 120), 12);
    assert.equal(pgcd(13, 13), 13);
    assert.equal(ppcm(12, 18), 36);
    assert.equal(ppcm(7, 13), 91);
    // PGCD(0 ; 0) N'EXISTE PAS. Rendre 0 ferait diviser par zéro chez
    // l'appelant — `irreductible` le fait, par exemple. Un diviseur commun qui
    // vaut 1 est toujours vrai et ne casse rien en aval.
    assert.equal(pgcd(0, 0), 1);
    assert.equal(ppcm(0, 5), 0);
    // ET LA RELATION QUI LES LIE, sur cent couples : a × b = PGCD × PPCM.
    // C'est la vérification croisée — les deux fonctions ne peuvent pas se
    // tromper ensemble sans qu'elle le dise.
    for (let a = 1; a <= 60; a++) {
        for (let b = 1; b <= 60; b++) {
            assert.equal(pgcd(a, b) * ppcm(a, b), a * b, `${a} et ${b}`);
        }
    }
});

test('LA PRIMALITÉ VA JUSQU\'À LA RACINE — 91 est le piège du chapitre', () => {
    // Qui essaie 2, 3 et 5 et s'arrête là déclare 91 premier. Il faut aller
    // jusqu'à 9, et 7 × 13 tombe en route.
    assert.equal(estPremier(91), false);
    assert.equal(estPremier(97), true);
    assert.equal(estPremier(1), false, '1 n\'est pas premier');
    assert.equal(estPremier(2), true);
    assert.equal(estPremier(0), false);
    // Les premiers jusqu'à 100, comptés : il y en a 25. Un crible qui en
    // trouve 26 a laissé passer 1 ; 24, il a perdu 2.
    const combien = Array.from({ length: 101 }, (_, n) => n).filter(estPremier).length;
    assert.equal(combien, 25, `${combien} premiers jusqu'à 100`);
});

test('LA DÉCOMPOSITION REDONNE LE NOMBRE, TOUJOURS', () => {
    // LA SEULE VÉRIFICATION QUI COMPTE : le produit des facteurs vaut le
    // nombre, et chaque facteur est premier. Comparer à une liste écrite à la
    // main ne garderait que les nombres qu'on y aurait pensés.
    for (let n = 2; n <= 400; n++) {
        const f = facteursPremiers(n);
        assert.equal(f.reduce((p, x) => p * x, 1), n, `${n} mal décomposé`);
        assert.ok(f.every(estPremier), `${n} garde un facteur non premier`);
        // Et dans l'ordre croissant : on descend l'escalier des divisions.
        assert.deepEqual(f, [...f].sort((a, b) => a - b), `${n} est dans le désordre`);
    }
    assert.deepEqual(facteursPremiers(1), [], '1 n\'a aucun facteur premier');
    assert.deepEqual(facteursGroupes(360), [{ p: 2, e: 3 }, { p: 3, e: 2 }, { p: 5, e: 1 }]);
    assert.equal(ecrireDecomposition(360), '2³ × 3² × 5');
    assert.equal(ecrireAPlat(360), '2 × 2 × 2 × 3 × 3 × 5');
    assert.equal(ecrireDecomposition(7), '7', 'un premier s\'écrit tout seul');
});

test('LES DEUX RÈGLES DES EXPOSANTS SE LISENT, ET ELLES SONT JUSTES', () => {
    // Le PGCD garde les facteurs COMMUNS au plus PETIT exposant, le PPCM garde
    // TOUS les facteurs au plus GRAND. Un élève qui ne retient que les
    // communs calcule un PGCD en croyant faire un PPCM : la moitié qu'on
    // oublie est celle du PPCM.
    const lire = (ecrit) => ecrit.split(' × ').reduce((p, m) => {
        const [b, e] = m.split(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/).length > 1
            ? [m.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, ''), '²³⁴⁵⁶⁷⁸⁹'.indexOf(m.slice(-1)) + 2]
            : [m, 1];
        return p * Math.pow(Number(b), e);
    }, 1);
    for (const [a, b] of COUPLES) {
        assert.equal(lire(pgcdExplique(a, b).ecrit), pgcd(a, b), `PGCD ${a} ${b}`);
        assert.equal(lire(ppcmExplique(a, b).ecrit), ppcm(a, b), `PPCM ${a} ${b}`);
    }
    // SANS FACTEUR COMMUN, LA RÉPONSE EST « 1 » — et non une chaîne vide, qui
    // laisserait l'écran dire « PGCD = ».
    assert.equal(pgcdExplique(8, 9).ecrit, '1');
});

test('« PREMIERS ENTRE EUX » NE VEUT PAS DIRE « PREMIERS »', () => {
    // C'est la confusion du chapitre, et elle a sa marche. 8 et 9 sont
    // premiers entre eux, et aucun des deux n'est premier.
    assert.ok(premiersEntreEux(8, 9));
    assert.ok(!estPremier(8) && !estPremier(9));
    assert.ok(!premiersEntreEux(84, 120));
    assert.deepEqual(irreductible(84, 120), [7, 10]);
    assert.ok(premiersEntreEux(...irreductible(84, 120)),
        'une fraction irréductible a un numérateur et un dénominateur premiers entre eux');
});

// ──────────────────────────────────── CE QUE L'EXERCICE DONNE ───────────────

test('CHAQUE COUPLE VAUT LA PEINE D\'ÊTRE DÉCOMPOSÉ', () => {
    // DEUX NOMBRES AU HASARD SONT PREMIERS ENTRE EUX SIX FOIS SUR DIX : le
    // PGCD vaut 1, le PPCM vaut le produit, et l'élève apprend qu'on ne
    // décompose jamais pour rien. Pire, un PGCD de 1 rend le problème des
    // bouquets absurde — « un bouquet par fleur ».
    assert.ok(COUPLES.length >= 15, `${COUPLES.length} couples seulement`);
    for (const [a, b] of COUPLES) {
        assert.ok(pgcd(a, b) > 1, `${a} et ${b} sont premiers entre eux : PGCD = 1`);
        assert.ok(ppcm(a, b) < a * b, `PPCM(${a} ; ${b}) vaut le produit : rien à chercher`);
        assert.ok(a !== b, `${a} et ${b} sont le même nombre`);
    }
    // LES RYTHMES D'UN PROBLÈME SONT DES MINUTES. Mesuré en lisant : « Le car
    // bleu part toutes les 132 minutes » — deux heures douze. L'énoncé est
    // juste et personne n'y croit ; un élève qui ne croit pas à l'énoncé cesse
    // de le lire.
    assert.ok(COUPLES_PETITS.length >= 8);
    for (const [a, b] of COUPLES_PETITS) {
        assert.ok(Math.max(a, b) <= 75, `${a} et ${b} : un car toutes les ${Math.max(a, b)} minutes`);
    }
    // ET LE PROBLÈME DES RYTHMES Y PUISE VRAIMENT. L'épreuve ne gardait
    // d'abord que la LISTE : remplacer `COUPLES_PETITS` par `COUPLES` dans la
    // question la laissait verte, et le car repartait toutes les 132 minutes.
    // `epreuveTombe` l'a dit — une épreuve verte qui ne garde rien donne une
    // assurance qui n'existe pas.
    for (let k = 0; k < 30; k++) {
        const it = G.generate({ marches: ['ensemble'] },
            { rng: makeRng('rythme' + k), index: k, total: 30 });
        assert.ok(Math.max(...it.meta.nombres) <= 75,
            `un rythme de ${Math.max(...it.meta.nombres)} minutes : « ${it.prompt.text} »`);
    }
    // ET LES NOMBRES À DÉCOMPOSER NE SONT JAMAIS PREMIERS : « décompose 97 »
    // n'est pas une question, c'est un malentendu.
    for (const n of A_DECOMPOSER) {
        assert.ok(!estPremier(n), `${n} est premier : il n'y a rien à décomposer`);
        assert.ok(facteursGroupes(n).length >= 2,
            `${n} n'a qu'un seul facteur premier : la règle des exposants ne se voit pas`);
    }
    // LA LISTE DES NOMBRES À TESTER DIT LA VÉRITÉ. Une erreur ici compterait
    // faux un élève qui a raison, sur la question même du piège.
    for (const { n, premier } of A_TESTER) {
        assert.equal(estPremier(n), premier, `${n} : la table se trompe`);
    }
    assert.ok(A_TESTER.some(x => x.premier) && A_TESTER.some(x => !x.premier),
        'tous les nombres à tester donnent la même réponse');
});

test('TOUTES LES MARCHES RÉPONDENT JUSTE — vérifié contre un calcul indépendant', () => {
    // ON NE RELIT PAS LA RÉPONSE DU GÉNÉRATEUR : on recalcule depuis l'énoncé,
    // comme le ferait un élève. Relire ce qu'il a écrit ne garde rien.
    for (const e of ETAPES) {
        for (let k = 0; k < 40; k++) {
            const it = G.generate({ marches: [e.id] },
                { rng: makeRng(`${e.id}-${k}`), index: k, total: 40 });
            const texte = it.prompt.text;
            assert.ok(texte && texte.length > 10, `${e.id} : énoncé vide`);
            assert.ok(it.answer !== undefined && it.answer !== null && it.answer !== '',
                `${e.id} : pas de réponse`);
            assert.equal(it.meta.marche, e.id);

            if (e.id === 'premier') {
                const n = Number(texte.match(/^(\d+)/)[1]);
                assert.equal(it.answer, estPremier(n) ? 'oui' : 'non', `${n}`);
            }
            if (e.id === 'recomposer') {
                assert.equal(ecrireDecomposition(Number(it.answer)),
                    texte.match(/s'écrit (.+?)\. Quel/)[1], 'la décomposition ne redonne pas le nombre');
            }
            if (e.id === 'decomposer') {
                // L'ÉCRITURE À REMPLIR PORTE LE SQUELETTE : on la relit, on
                // remet les exposants donnés en réponse, et le produit doit
                // valoir le nombre de départ. C'est bien ce que l'élève a sous
                // les yeux — la question, elle, ne dit plus que « complète ».
                const ecriture = it.prompt.html.match(/pp-ecriture">([^<]*(?:<[^>]*>[^<]*)*)<\/span>/);
                assert.ok(ecriture, 'l\'écriture à remplir a disparu de l\'énoncé');
                const n = Number(it.prompt.html.match(/pp-ecriture">(\d+) =/)[1]);
                const bases = [...it.prompt.html.matchAll(/(\d+)<sup>/g)].map(m => Number(m[1]));
                const exposants = String(it.answer).split('|').map(Number);
                assert.equal(bases.length, exposants.length, `${n} : autant d'exposants que de bases`);
                assert.equal(bases.reduce((p, b, i) => p * Math.pow(b, exposants[i]), 1), n, `${n}`);
            }
            if (e.id === 'pgcd' || e.id === 'ppcm') {
                const [, a, b] = texte.match(/de (\d+) et (\d+) \?/).map(Number);
                assert.equal(Number(it.answer),
                    e.id === 'pgcd' ? pgcd(a, b) : ppcm(a, b), `${e.id} ${a} ${b}`);
            }
            if (e.id === 'entre-eux') {
                const [, a, b] = texte.match(/^(\d+) et (\d+)/).map(Number);
                assert.equal(it.answer, premiersEntreEux(a, b) ? 'oui' : 'non', `${a} ${b}`);
            }
            if (e.id === 'irreductible') {
                const [, a, b] = texte.match(/fraction (\d+)\/(\d+)/).map(Number);
                assert.equal(it.answer, irreductible(a, b).join('|'), `${a}/${b}`);
            }
        }
    }
});

test('LE SENS DE LA RÉPONSE EST RESPECTÉ — c\'est la seule vérification qu\'un élève peut faire', () => {
    // Un PGCD est plus PETIT que ses deux nombres, un PPCM plus GRAND. C'est
    // ce qui dit à l'élève qu'il s'est trompé de notion, et c'est écrit dans
    // les deux indices. Si un énoncé ne le respectait pas, on lui apprendrait
    // le contraire.
    const PETIT = { paquets: true, pgcd: true, irreductible: true };
    const GRAND = { ensemble: true, carre: true, ppcm: true };
    for (const e of ETAPES) {
        if (!PETIT[e.id] && !GRAND[e.id]) continue;
        for (let k = 0; k < 30; k++) {
            const it = G.generate({ marches: [e.id] },
                { rng: makeRng(`sens-${e.id}-${k}`), index: k, total: 30 });
            // LES DEUX NOMBRES DE LA QUESTION VIENNENT DE `meta`, et non
            // d'une expression régulière sur l'énoncé : celui d'un PGCD porte
            // AUSSI les facteurs des deux décompositions, et les relire au
            // passage rendait « 2 » pour le plus petit nombre de l'énoncé.
            // Toute vérification de bon sens s'effondrait alors.
            const nombres = it.meta.nombres;
            assert.ok(Array.isArray(nombres) && nombres.length === 2,
                `${e.id} : les deux nombres ne voyagent pas dans meta`);
            const rep = Number(String(it.answer).split('|')[0]);
            if (PETIT[e.id]) {
                assert.ok(rep <= Math.min(...nombres.filter(n => n > 1)),
                    `${e.id} : réponse ${rep} plus grande que l'énoncé ${nombres}`);
            } else {
                assert.ok(rep >= Math.max(...nombres),
                    `${e.id} : réponse ${rep} plus petite que l'énoncé ${nombres}`);
            }
        }
    }
});

test('LES ÉNONCÉS SE LISENT — accords compris', () => {
    // MESURÉ en lisant ce que le générateur produisait : « en utilisant toutes
    // ses stylos », « des trousses TOUS IDENTIQUES », « ils sont ensemble de
    // la gare ». Trois fautes dans trois énoncés sur dix.
    // ET LE POINT MÉDIAN EST BANNI. Sur une feuille de MATHÉMATIQUES, « · »
    // est un signe de multiplication : « 110 = 2 × 5 × 11 · 132 » se lit
    // « 11 × 132 ». Vu sur le PDF imprimé, jamais à l'écran — où les deux
    // décompositions vivent dans des blocs séparés.
    const FAUTES = [
        / · /,
        // L'ÉNONCÉ FINIT PAR UN POINT, sans quoi le papier colle la question
        // derrière : « … = 2⁴ × 3 Quel est le PGCD ».
        /[0-9⁰¹²³⁴⁵⁶⁷⁸⁹] Quel est/,
        /toutes ses (stylos|cahiers|bonbons|chocolats)/,
        /tous ses (roses|tulipes|billes)/,
        /trousses TOUS IDENTIQUES/,
        /(bouquets|sachets) TOUTES IDENTIQUES/,
        /carreaux [^.]*toutes posées/,
        /(dalles|briques) [^.]*tous posés/,
        /carreaux [^.]*aucune\./,
        /ensemble de la gare/,
        /undefined|NaN|\[object/
    ];
    for (const e of ETAPES) {
        for (let k = 0; k < 40; k++) {
            const it = G.generate({ marches: [e.id] },
                { rng: makeRng(`mots-${e.id}-${k}`), index: k, total: 40 });
            const tout = `${it.prompt.text} ${it.explanation} ${(it.hints || []).join(' ')}`;
            FAUTES.forEach(re => assert.ok(!re.test(tout),
                `${e.id} : « ${(tout.match(re) || [''])[0]} » dans « ${it.prompt.text} »`));
        }
    }
});

test('LES TROIS COMPÉTENCES SONT DISTINGUÉES — c\'est le diagnostic utile', () => {
    // Un élève qui calcule très bien les deux et qui, devant un problème,
    // prend le PGCD là où il fallait le PPCM a zéro. Son bilan doit le DIRE,
    // sinon le professeur relit « n'a pas acquis le PGCD » pour quelqu'un qui
    // le calcule parfaitement.
    const vues = new Set();
    for (const e of ETAPES) {
        const it = G.generate({ marches: [e.id] }, { rng: makeRng('sk-' + e.id), index: 0, total: 1 });
        vues.add(it.skillId);
    }
    assert.deepEqual([...vues].sort(),
        ['num.arith.decomposition', 'num.arith.pgcd', 'num.arith.ppcm']);
    assert.deepEqual([...G.skills].sort(),
        ['num.arith.decomposition', 'num.arith.pgcd', 'num.arith.ppcm']);
});

test('LES PROBLÈMES SONT MÉLANGÉS, ET LES DEUX NOTIONS Y SONT', () => {
    // Ranger les problèmes de PGCD ensemble puis ceux de PPCM ensemble
    // apprendrait à lire le titre du paragraphe, pas l'énoncé. Le temps C
    // porte donc les deux, et une fiche qui tire dedans doit voir les deux.
    const tempsC = ETAPES.filter(e => e.temps === 'C');
    assert.ok(tempsC.length >= 3, `${tempsC.length} problèmes seulement`);
    const skills = new Set(tempsC.map(e => e.skill));
    assert.ok(skills.has('num.arith.pgcd') && skills.has('num.arith.ppcm'),
        'les problèmes ne travaillent qu\'une des deux notions');
    // ET UNE SÉRIE TIRÉE DANS LE TEMPS C LES DONNE BIEN TOUTES LES DEUX.
    const marches = tempsC.map(e => e.id);
    const vus = new Set();
    for (let k = 0; k < 12; k++) {
        vus.add(G.generate({ marches }, { rng: makeRng('mix' + k), index: k, total: 12 }).skillId);
    }
    assert.equal(vus.size, 2, `une série de douze ne montre qu'une notion : ${[...vus]}`);
});

test('UNE RÉPONSE À PLUSIEURS NOMBRES DÉCLARE SES CASES', () => {
    // LE DÉFAUT QUE CECI GARDE, ET QUI NE DISAIT RIEN. Une réponse « 3|4 » ne
    // fabrique PAS deux champs toute seule : le pavé compte les `[data-trou]`
    // que l'ÉNONCÉ déclare, et n'en allume plusieurs que s'il en trouve plus
    // d'un (`aTrous`, dans core/activities/numeric.js). Sans eux, l'élève n'a
    // qu'un seul écran et devrait y taper « 3|4 » — ce que le pavé ne permet
    // même pas. Rien ne plante, rien ne prévient : la question est simplement
    // impossible. Mesuré en ouvrant l'exercice, pas en relisant le code.
    for (const e of ETAPES) {
        for (let k = 0; k < 20; k++) {
            const it = G.generate({ marches: [e.id] },
                { rng: makeRng(`trous-${e.id}-${k}`), index: k, total: 20 });
            const morceaux = String(it.answer).split('|').length;
            const trous = (it.prompt.html.match(/data-trou=/g) || []).length;
            if (morceaux > 1) {
                assert.equal(trous, morceaux,
                    `${e.id} : ${morceaux} nombres à donner et ${trous} case(s) dans l'énoncé`);
                assert.equal(it.meta.cases, morceaux, `${e.id} : meta.cases`);
            } else {
                assert.equal(trous, 0, `${e.id} : des cases pour une réponse unique`);
            }
        }
    }
});

test('LE PAVÉ N\'OFFRE PAS DE VIRGULE — toutes les réponses sont entières', () => {
    // Une touche qui n'a aucun sens sur une question est une invitation à la
    // faute : l'élève qui la voit se demande ce qu'il a raté.
    for (const e of ETAPES) {
        const it = G.generate({ marches: [e.id] }, { rng: makeRng('dec-' + e.id), index: 0, total: 1 });
        assert.equal(it.meta.decimal, false, e.id);
        String(it.answer).split('|').forEach(v => {
            if (v === 'oui' || v === 'non') return;
            assert.ok(Number.isInteger(Number(v)), `${e.id} : réponse non entière « ${v} »`);
        });
    }
});
