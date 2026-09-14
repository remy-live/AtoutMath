// PAR DÉFAUT, PAR EXCÈS, ARRONDI — trois mots, un encadrement.
//
// Rémy : « tu feras un exercice d'arrondi avec valeur par excès, valeur par
// défaut, valeur approchée (au dixième, centième, millième). »
//
// Trois promesses, et aucune ne se voit sur un écran :
//
//   · LE CALCUL NE PASSE PAS PAR LES FLOTTANTS. `Math.floor(2.675 * 100) / 100`
//     rend 2,67, parce que 2,675 n'existe pas en binaire. Sur un exercice qui
//     porte exactement sur le chiffre qu'on garde et celui qu'on jette, c'est
//     la seule erreur qui compte — et elle serait invisible en jouant.
//   · LE NOMBRE POSÉ NE TOMBE JAMAIS JUSTE. Sinon les trois réponses sont
//     égales, et l'élève qui coupe partout a raison sans le savoir.
//   · L'OUTIL NE DONNE PAS LA RÉPONSE. L'encadrement du nombre posé répond à
//     deux des trois questions : le bouton montre donc un AUTRE nombre.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import {
    RANGS, SORTES, ORDRE_SORTES, MARCHES_ARRONDI, rangDe,
    nombreDecimal, ecrire, valeur, parDefaut, parExces, arrondi,
    tirerArrondi, reponseDe, encadrementDe, indicesDe, expliquer, leurresDe
} from '../js/core/arrondi.js';
import { arrondiGenerator as G } from '../js/core/generators/arrondi.js';
import { evaluate } from '../js/core/items.js';
import { getExerciseById } from '../js/data/catalog.js';

const RANGS_ID = MARCHES_ARRONDI.map(m => m.id);

test('LE CAS QUI TUE LES FLOTTANTS : 2,675 au centième', () => {
    // `Math.floor(2.675 * 100) / 100` rend 2,67 — la machine tient
    // 2,67499999999999982. On travaille sur les CHIFFRES, pas sur le nombre.
    const n = nombreDecimal(2, [6, 7, 5]);
    assert.equal(ecrire(parDefaut(n, 2)), '2,67');
    assert.equal(ecrire(parExces(n, 2)), '2,68');
    // À 5, on monte : c'est la convention, et elle doit être tenue.
    assert.equal(ecrire(arrondi(n, 2)), '2,68');
});

test('LES RETENUES SE PROPAGENT — 9,999 par excès', () => {
    const n = nombreDecimal(9, [9, 9, 9]);
    assert.equal(ecrire(parExces(n, 2)), '10,00');
    assert.equal(ecrire(parExces(n, 0)), '10');
    assert.equal(ecrire(parDefaut(n, 2)), '9,99');
    // Et le cas de la retenue partielle.
    const m = nombreDecimal(3, [1, 9, 7]);
    assert.equal(ecrire(parExces(m, 2)), '3,20');
    assert.equal(ecrire(parDefaut(m, 2)), '3,19');
});

test('ON N’ARRONDIT PAS DE PROCHE EN PROCHE — 2,4999 à l’unité vaut 2', () => {
    // La seconde faute du chapitre, et elle vient de ceux qui ont compris la
    // première : on regarde le chiffre qui SUIT le rang, et lui seul.
    const n = nombreDecimal(2, [4, 9, 9, 9]);
    assert.equal(ecrire(arrondi(n, 0)), '2');
    assert.equal(ecrire(parExces(n, 0)), '3');
    assert.equal(ecrire(parDefaut(n, 0)), '2');
});

test('L’ARRONDI EST TOUJOURS L’UNE DES DEUX BORNES, et la plus proche', () => {
    for (let i = 0; i < 400; i++) {
        const t = tirerArrondi(makeRng(`b${i}`), 'melange');
        const d = rangDe(t.rang).decimales;
        const bas = parDefaut(t.n, d), haut = parExces(t.n, d), rond = arrondi(t.n, d);
        const x = valeur(t.n), vb = valeur(bas), vh = valeur(haut), vr = valeur(rond);
        assert.ok(vb < x && x < vh, `${ecrire(bas)} < ${ecrire(t.n)} < ${ecrire(haut)}`);
        assert.ok(vr === vb || vr === vh, 'l’arrondi n’est pas une borne');
        // La plus proche, avec la convention « à 5 on monte ».
        const attendu = (x - vb) < (vh - x) - 1e-12 ? vb : vh;
        assert.equal(vr, attendu, `${ecrire(t.n)} → ${ecrire(rond)}`);
    }
});

test('LE NOMBRE POSÉ NE TOMBE JAMAIS JUSTE, et ne finit pas par un zéro', () => {
    for (const marche of RANGS_ID) {
        for (let i = 0; i < 120; i++) {
            const t = tirerArrondi(makeRng(`j${marche}${i}`), marche);
            const d = rangDe(t.rang).decimales;
            // Il reste quelque chose à couper : sinon les trois mots donnent
            // la même valeur et la question ne mesure plus rien.
            assert.notEqual(valeur(parDefaut(t.n, d)), valeur(t.n), ecrire(t.n));
            assert.notEqual(valeur(parDefaut(t.n, d)), valeur(parExces(t.n, d)));
            // « 85,50 » ne s'écrit pas : on écrit « 85,5 ».
            assert.doesNotMatch(ecrire(t.n), /,\d*0$/, ecrire(t.n));
        }
    }
});

test('ARRONDIR ET COUPER TOMBENT PAREIL UNE FOIS SUR DEUX — c’est mesuré', () => {
    // C'est la raison d'être de l'exercice : un élève qui tronque partout a
    // juste la moitié du temps, et rien dans son résultat ne le dit.
    let pareil = 0;
    const total = 800;
    for (let i = 0; i < total; i++) {
        const t = tirerArrondi(makeRng(`m${i}`), 'centieme');
        if (valeur(arrondi(t.n, 2)) === valeur(parDefaut(t.n, 2))) pareil++;
    }
    const taux = pareil / total;
    assert.ok(taux > 0.4 && taux < 0.6, `tronquer réussit ${Math.round(taux * 100)} % du temps`);
});

test('CHAQUE MARCHE POSE SON RANG, et « mélangés » les mélange vraiment', () => {
    for (const r of RANGS) {
        for (let i = 0; i < 20; i++) {
            assert.equal(tirerArrondi(makeRng(`r${r.id}${i}`), r.id).rang, r.id);
        }
    }
    const vus = new Set();
    for (let i = 0; i < 200; i++) vus.add(tirerArrondi(makeRng(`x${i}`), 'melange').rang);
    assert.equal(vus.size, RANGS.length, `${vus.size} rangs seulement dans le mélange`);
});

test('LES TROIS SORTES SE DÉCOCHENT', () => {
    for (const sorte of ORDRE_SORTES) {
        for (let i = 0; i < 30; i++) {
            assert.equal(tirerArrondi(makeRng(`s${sorte}${i}`), 'melange', { sortes: [sorte] }).sorte,
                sorte);
        }
    }
    // Et une liste vide ne vide pas l'exercice : elle retombe sur les trois.
    const t = tirerArrondi(makeRng('vide'), 'centieme', { sortes: [] });
    assert.ok(ORDRE_SORTES.includes(t.sorte));
});

test('L’ÉNONCÉ NOMME LE MOT ET LE RANG, l’explication montre l’encadrement', () => {
    for (let i = 0; i < 60; i++) {
        const t = tirerArrondi(makeRng(`e${i}`), 'melange');
        const it = G.generate({}, { index: 0, total: 1, rng: makeRng(`e${i}`) });
        assert.ok(it.prompt.text.includes(rangDe(it.meta.rang).nom), it.prompt.text);
        assert.ok(it.explanation.includes('<'), 'l’explication porte l’encadrement');
        assert.equal(it.hints.length, 3);
        // Le premier indice ne donne pas la réponse : il dit le rang.
        assert.doesNotMatch(it.hints[0], new RegExp(`\\b${String(it.answer).replace('.', ',')}\\b`));
        assert.ok(SORTES[t.sorte].mot.length > 5);
    }
});

test('L’OUTIL RAPPELLE LES MOTS SANS DONNER LA RÉPONSE', () => {
    // L'encadrement du nombre POSÉ répond à deux des trois questions. Le
    // bouton montre donc l'exemple du cours, jamais le nombre de l'élève.
    for (let i = 0; i < 80; i++) {
        const it = G.generate({}, { index: i % 5, total: 5, rng: makeRng(`o${i}`) });
        const outil = (it.meta.outils || [])[0];
        assert.equal(outil.id, 'mots');
        assert.ok(!outil.html.includes(it.meta.nombre),
            `le nombre posé (${it.meta.nombre}) est dans l’outil`);
        assert.ok(!outil.html.includes(it.meta.encadrement), 'l’encadrement posé est dans l’outil');
        assert.match(outil.html, /3,14 &lt; <b>3,1416<\/b> &lt; 3,15/);
    }
});

test('LE MOT PRIS POUR UN AUTRE EST NOMMÉ — même quand la réponse est TAPÉE', () => {
    // Les trois mots sont les bonnes réponses les uns des autres : celui qui
    // tape la valeur par défaut quand on demandait l'arrondi ne s'est pas
    // trompé de calcul, il s'est trompé de mot.
    let nommes = 0;
    for (let i = 0; i < 120; i++) {
        const it = G.generate({}, { index: i % 5, total: 5, rng: makeRng(`d${i}`) });
        if (it.answerKind !== 'numeric') continue;
        assert.ok(Array.isArray(it.diagnostics) && it.diagnostics.length, it.prompt.text);
        for (const d of it.diagnostics) {
            assert.notEqual(d.value, it.answer, 'la bonne réponse diagnostiquée comme une faute');
            const v = evaluate(it, d.value);
            assert.equal(v.correct, false);
            assert.equal(v.misconception, d.why);
            nommes++;
        }
    }
    assert.ok(nommes > 100, `seulement ${nommes} diagnostics`);
});

test('L’EXERCICE EXISTE, avec sa compétence et sa fiche', () => {
    const exo = getExerciseById('num-arrondi');
    assert.ok(exo, 'num-arrondi est au catalogue');
    assert.equal(exo.generatorId, 'num.arrondi');
    assert.deepEqual(G.skills, ['num.arrondi']);
    assert.equal(G.ecrit, true, 'il doit y avoir une fiche : c’est un exercice d’écriture');
    assert.ok(exo.consignePapier);
});

test('À L’UNITÉ, PAS DE VIRGULE AU PAVÉ', () => {
    for (let i = 0; i < 40; i++) {
        const it = G.generate({ marches: ['unite'] }, { index: 0, total: 1, rng: makeRng(`v${i}`) });
        assert.equal(it.meta.rang, 'unite');
        assert.equal(it.meta.decimal, false, 'une touche virgule inutilisable suggère des décimales');
        assert.equal(Number.isInteger(it.answer), true);
    }
});

test('LES LEURRES SONT LES TROIS MOTS, jamais deux fois le même nombre', () => {
    for (let i = 0; i < 200; i++) {
        const t = tirerArrondi(makeRng(`l${i}`), 'melange');
        const l = leurresDe(t);
        const juste = valeur(reponseDe(t));
        // Trois leurres au moins : c'est ce qu'un QCM à quatre demande.
        assert.ok(l.length >= 3, `${ecrire(t.n)} : ${l.length} leurres`);
        assert.equal(new Set(l.map(x => x.value)).size, l.length, 'un doublon');
        l.forEach(x => assert.notEqual(x.value, juste));
        l.forEach(x => assert.ok(x.why && x.why.length > 15, x.why));
    }
});

test('L’ENCADREMENT ET LES INDICES DISENT LA MÊME CHOSE', () => {
    for (let i = 0; i < 60; i++) {
        const t = tirerArrondi(makeRng(`i${i}`), 'melange');
        const enc = encadrementDe(t);
        assert.match(enc, /^[\d,]+ < [\d,]+ < [\d,]+$/, enc);
        assert.ok(indicesDe(t)[1].includes(ecrire(parDefaut(t.n, rangDe(t.rang).decimales))));
        assert.ok(expliquer(t).startsWith(enc.split(' ')[0]));
    }
});
