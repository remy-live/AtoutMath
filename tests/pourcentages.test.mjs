// LES POURCENTAGES — ce que l'exercice promet à l'élève.
//
// Trois promesses, et ce sont elles qui font qu'on peut donner cet exercice à
// une classe sans le relire :
//
//   · LES NOMBRES TOMBENT JUSTE. Un exercice qui apprend le SENS d'un
//     coefficient ne doit pas se jouer en même temps sur la division décimale.
//   · LA PHRASE EST FRANÇAISE. « Une console de jeux coûte 200 €, IL est
//     soldé » : une faute d'accord dans un énoncé de maths décrédibilise tout
//     le reste, et c'est le genre de faute qu'aucun test ne trouve par hasard.
//   · LES FAUSSES RÉPONSES SONT DE VRAIES ERREURS, toutes différentes, et
//     jamais la bonne réponse déguisée.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import { sameAnswer } from '../js/core/items.js';
import {
    MARCHES_POURCENTAGE, coefficient, partDe, montantsRonds, ecrireNombre,
    ecrireCoefficient, tirerPourcentage, enonceDe, reponseDe, uniteDe,
    expliquer, leurresDe
} from '../js/core/pourcentages.js';
import { pourcentagesGenerator } from '../js/core/generators/pourcentages.js';

const ETAPES = MARCHES_POURCENTAGE.map(m => m.id);
const entier = (x) => Math.abs(x - Math.round(x)) < 1e-9;

// --- Le calcul ---------------------------------------------------------------

test('LE COEFFICIENT, C\'EST TOUT LE CHAPITRE', () => {
    // Rémy : « se rendre compte que 120 % c'est multiplié par 1,20, que prendre
    // 80 % [c'est] 0,20 [de moins] ».
    assert.equal(coefficient(20, 1), 1.2);
    assert.equal(coefficient(20, -1), 0.8);
    assert.equal(coefficient(5, 1), 1.05);
    assert.equal(coefficient(75, -1), 0.25);
    // AUCUNE POUSSIÈRE DE VIRGULE FLOTTANTE DANS CE QUI S'AFFICHE. On vérifie
    // l'écriture, pas le produit : re-multiplier par 100 réintroduirait
    // l'erreur qu'on veut justement éviter de montrer (1,09 × 100 =
    // 109.00000000000001), et c'est le test qui serait faux, pas le code.
    for (let p = 1; p <= 99; p++) {
        assert.equal(ecrireCoefficient(coefficient(p, 1)),
            (1 + p / 100).toFixed(2).replace('.', ','));
        assert.ok(Math.abs(coefficient(p, -1) - (100 - p) / 100) < 1e-12);
    }
});

test('UN COEFFICIENT S\'ÉCRIT AVEC DEUX DÉCIMALES', () => {
    // C'est l'écriture de Rémy, et elle se lit d'un coup d'œil : « 1,20 » dit
    // cent vingt pour cent, « 1,2 » demande de recompter.
    assert.equal(ecrireCoefficient(1.2), '1,20');
    assert.equal(ecrireCoefficient(0.8), '0,80');
    assert.equal(ecrireCoefficient(1.05), '1,05');
    // Mais l'élève qui tape « 1,2 » a raison : on compare des nombres.
    assert.equal(sameAnswer('1,2', 1.2), true);
    assert.equal(sameAnswer('1,20', 1.2), true);
    assert.equal(sameAnswer('0,80', 0.8), true);
    assert.equal(sameAnswer('1,02', 1.2), false);
});

test('les montants ronds le sont vraiment', () => {
    for (const p of [5, 10, 15, 20, 25, 30, 40, 50, 75]) {
        const liste = montantsRonds(p, 20, 300);
        assert.ok(liste.length >= 3, `${p} % : seulement ${liste.length} montants`);
        liste.forEach(m => {
            assert.ok(entier(partDe(m, p)), `${p} % de ${m} ne tombe pas juste`);
            assert.equal(m % 5, 0, `${m} n'est pas un prix`);
        });
    }
});

// --- Le tirage ----------------------------------------------------------------

test('LES NOMBRES TOMBENT TOUJOURS JUSTE', () => {
    for (const marche of ETAPES) {
        for (let k = 0; k < 60; k++) {
            const t = tirerPourcentage(makeRng(`rond-${marche}-${k}`), marche);
            if (marche.endsWith('-coef')) {
                assert.ok(t.p > 0 && t.p < 100, `${marche} : pourcentage ${t.p}`);
                continue;
            }
            assert.ok(entier(t.montant), `${marche} : montant ${t.montant}`);
            assert.ok(entier(t.part), `${marche} : part ${t.part} (${t.p} % de ${t.montant})`);
            assert.ok(entier(t.final), `${marche} : prix final ${t.final}`);
            assert.ok(t.final > 0, `${marche} : prix final négatif ou nul`);
        }
    }
});

test('« 75 % DE 100 » N\'EST PAS UNE QUESTION', () => {
    // Elle se répond en recopiant le pourcentage : l'élève a juste sans avoir
    // rien fait, et croit avoir compris. C'est la seule valeur qu'on écarte.
    for (let k = 0; k < 200; k++) {
        const t = tirerPourcentage(makeRng(`cent${k}`), 'part');
        assert.notEqual(t.montant, 100);
    }
});

test('LA PHRASE S\'ACCORDE — « elle est soldée », pas « il est soldé »', () => {
    // Une faute d'accord dans un énoncé de maths décrédibilise tout le reste,
    // et le genre ne se devine pas sur l'article : « une paire de baskets »
    // commence par « une », « un ordinateur » et « une imprimante » non.
    let feminins = 0, masculins = 0;
    for (const marche of ['reduction', 'prix-reduit', 'prix-augmente']) {
        for (let k = 0; k < 80; k++) {
            const t = tirerPourcentage(makeRng(`accord-${marche}-${k}`), marche);
            const phrase = enonceDe(t);
            if (t.feminin) {
                feminins++;
                assert.ok(/Elle (est soldée|augmente)/.test(phrase), `${t.objet} : ${phrase}`);
                assert.ok(!/Il est soldé|Il augmente/.test(phrase), phrase);
            } else {
                masculins++;
                assert.ok(/Il (est soldé|augmente)/.test(phrase), `${t.objet} : ${phrase}`);
                assert.ok(!/soldée/.test(phrase), phrase);
            }
        }
    }
    assert.ok(feminins > 20 && masculins > 20, 'les deux genres doivent être testés');
});

test('l\'énoncé nomme toujours un prix et un pourcentage', () => {
    for (const marche of ETAPES) {
        for (let k = 0; k < 20; k++) {
            const t = tirerPourcentage(makeRng(`dit-${marche}-${k}`), marche);
            const phrase = enonceDe(t);
            assert.ok(phrase.length > 20, `${marche} : « ${phrase} »`);
            assert.ok(phrase.includes(`${t.p} %`), `${marche} : le pourcentage manque — ${phrase}`);
            assert.ok(phrase.trim().endsWith('?'), `${marche} : ce n'est pas une question`);
            if (!marche.endsWith('-coef')) {
                assert.ok(phrase.includes(ecrireNombre(t.montant)), `${marche} : le montant manque`);
            }
        }
    }
});

// --- Ce qu'on répond ----------------------------------------------------------

test('LA RÉPONSE EST CELLE DE LA QUESTION POSÉE', () => {
    // Les deux étapes qui se confondent : « combien on économise » et « quel
    // prix paie-t-on ». C'est l'erreur numéro un du chapitre, et il serait
    // fâcheux que l'exercice la fasse lui-même.
    for (let k = 0; k < 60; k++) {
        const r = tirerPourcentage(makeRng(`r${k}`), 'reduction');
        assert.equal(reponseDe(r), r.part, 'la réduction, c\'est ce qu\'on enlève');
        const pr = tirerPourcentage(makeRng(`pr${k}`), 'prix-reduit');
        assert.equal(reponseDe(pr), pr.final, 'le prix soldé, c\'est ce qui reste');
        assert.equal(reponseDe(pr), pr.montant - pr.part);
        const ta = tirerPourcentage(makeRng(`ta${k}`), 'taxe');
        assert.equal(reponseDe(ta), ta.montant + ta.part, 'la TVA s\'ajoute');
        assert.ok(reponseDe(ta) > ta.montant);
    }
    // Un coefficient n'a pas d'unité, un prix en a une.
    assert.equal(uniteDe(tirerPourcentage(makeRng('u1'), 'hausse-coef')), '');
    assert.equal(uniteDe(tirerPourcentage(makeRng('u2'), 'taxe')), '€');
});

test('L\'EXPLICATION TIENT EN DEUX PHRASES ET PORTE LA RÉPONSE', () => {
    // Rémy : « il faut les explications très simples ». C'est la contrainte la
    // plus facile à trahir — sur les pourcentages, on a toujours envie
    // d'ajouter la règle générale et le contre-exemple.
    for (const marche of ETAPES) {
        for (let k = 0; k < 20; k++) {
            const t = tirerPourcentage(makeRng(`ex-${marche}-${k}`), marche);
            const dit = expliquer(t);
            const phrases = dit.split(/[.!?]\s/).filter(x => x.trim().length > 3);
            assert.ok(phrases.length <= 3, `${marche} : ${phrases.length} phrases — ${dit}`);
            assert.ok(dit.length <= 200, `${marche} : ${dit.length} caractères — ${dit}`);
            const attendu = marche.endsWith('-coef')
                ? ecrireCoefficient(reponseDe(t)) : ecrireNombre(reponseDe(t));
            assert.ok(dit.includes(attendu),
                `${marche} : la réponse ${attendu} n'est pas dans l'explication — ${dit}`);
        }
    }
});

test('LES FAUSSES RÉPONSES SONT DE VRAIES ERREURS, TOUTES DIFFÉRENTES', () => {
    for (const marche of ETAPES) {
        for (let k = 0; k < 40; k++) {
            const t = tirerPourcentage(makeRng(`l-${marche}-${k}`), marche);
            const juste = reponseDe(t);
            const leurres = leurresDe(t);
            // TROIS AU MOINS : c'est ce qu'il faut pour un QCM à quatre
            // propositions, et un QCM à trois se repère à l'œil nu.
            assert.ok(leurres.length >= 3, `${marche} : ${leurres.length} leurre(s)`);
            const vus = new Set();
            leurres.forEach(l => {
                assert.ok(Number.isFinite(l.value), `${marche} : leurre non numérique`);
                assert.ok(l.value >= 0, `${marche} : leurre négatif ${l.value}`);
                assert.notEqual(l.value, juste, `${marche} : un leurre vaut la bonne réponse`);
                assert.equal(vus.has(l.value), false, `${marche} : leurre en double ${l.value}`);
                vus.add(l.value);
                // CHAQUE FAUSSE RÉPONSE DIT LAQUELLE : c'est ce qui transforme
                // un « faux » en diagnostic.
                assert.ok(l.why && l.why.length > 15, `${marche} : leurre sans explication`);
            });
        }
    }
});

// --- Le générateur -------------------------------------------------------------

test('CHAQUE ÉTAPE COCHÉE EST JOUÉE', () => {
    const total = ETAPES.length * 2;
    const vues = new Set();
    for (let i = 0; i < total; i++) {
        const it = pourcentagesGenerator.generate({}, { index: i, total, rng: makeRng(`g${i}`) });
        vues.add(it.meta.marche);
    }
    assert.deepEqual([...vues].sort(), [...ETAPES].sort());
});

test('LA FAÇON DE RÉPONDRE SE RÈGLE ÉTAPE PAR ÉTAPE', () => {
    // Le mécanisme `parMarche` : le coefficient se reconnaît parmi quatre, le
    // prix d'un jean soldé se tape. Un réglage unique obligerait à choisir le
    // moins mauvais compromis pour les sept étapes.
    const total = ETAPES.length;
    const params = { reponseParMarche: 'hausse-coef:choix,baisse-coef:choix' };
    const genres = {};
    for (let i = 0; i < total; i++) {
        const it = pourcentagesGenerator.generate(params, { index: i, total, rng: makeRng(`pm${i}`) });
        genres[it.meta.marche] = it.answerKind;
        if (it.answerKind === 'choice') {
            assert.equal(it.choices.length, 4, `${it.meta.marche} : ${it.choices.length} propositions`);
            assert.equal(it.choices.filter(c => c.correct).length, 1, 'une seule bonne réponse');
            // L'étiquette d'un coefficient n'a pas d'unité, celle d'un prix en a une.
            const euros = it.choices.filter(c => c.label.includes('€')).length;
            assert.equal(euros, it.meta.unite ? 4 : 0, `${it.meta.marche} : unités mélangées`);
        } else {
            assert.equal(it.choices, null);
        }
    }
    assert.equal(genres['hausse-coef'], 'choice');
    assert.equal(genres['baisse-coef'], 'choice');
    assert.equal(genres.taxe, 'numeric');
    assert.equal(genres.part, 'numeric');
});

test('la compétence suit l\'étape', () => {
    // Trois compétences parce que ce sont trois moments : un élève peut
    // calculer 20 % de 40 € sans savoir qu'une baisse de 20 % se multiplie par
    // 0,80. Un bilan qui dirait « pourcentages : à revoir » n'aiderait personne.
    const total = ETAPES.length;
    const parEtape = {};
    for (let i = 0; i < total; i++) {
        const it = pourcentagesGenerator.generate({}, { index: i, total, rng: makeRng(`sk${i}`) });
        parEtape[it.meta.marche] = it.skillId;
    }
    assert.equal(parEtape.part, 'num.pourcentage.part');
    assert.equal(parEtape['hausse-coef'], 'num.pourcentage.coefficient');
    assert.equal(parEtape['baisse-coef'], 'num.pourcentage.coefficient');
    assert.equal(parEtape.taxe, 'num.pourcentage.variation');
    assert.equal(parEtape['prix-reduit'], 'num.pourcentage.variation');
});

test('les indices ne donnent jamais la réponse', () => {
    // Un indice qui pose le résultat n'est plus un indice : le troisième pose
    // le CALCUL, et s'arrête là.
    for (const marche of ETAPES) {
        for (let k = 0; k < 15; k++) {
            const t = tirerPourcentage(makeRng(`i-${marche}-${k}`), marche);
            const it = pourcentagesGenerator.generate({ marches: [marche] },
                { index: 0, total: 1, rng: makeRng(`ii-${marche}-${k}`) });
            void t;
            assert.equal(it.hints.length, 3, `${marche} : ${it.hints.length} indices`);
            const reponse = ecrireNombre(it.answer);
            it.hints.forEach((h, n) => {
                assert.ok(h.length < 90, `${marche} indice ${n} : ${h.length} caractères`);
                // Le montant de départ peut apparaître ; la RÉPONSE, jamais.
                const sansMontant = h.split(String(it.meta.montant ?? ' ')).join(' ');
                assert.ok(!new RegExp(`(^|[^\\d,])${reponse.replace(',', '[.,]')}([^\\d,]|$)`).test(sansMontant),
                    `${marche} indice ${n} donne la réponse ${reponse} : ${h}`);
            });
        }
    }
});
