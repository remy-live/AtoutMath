// SIXIÈME, BLOCS 3 ET 8 — inégalités, division euclidienne, durées.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, dans sa progression de sixième. Trois chapitres manquaient, et chacun
// pour une raison différente :
//
//   · l'inégalité LARGE ou STRICTE — le logiciel savait comparer deux nombres
//     (<, =, >), jamais distinguer < de ⩽ ;
//   · la division EUCLIDIENNE — il savait poser une division et savait les
//     fractions, pas ce qui les relie : le reste ;
//   · les DURÉES — la pendule se lisait, rien ne faisait additionner 1 h 45 et
//     2 h 30.
//
// ── CE QUE CETTE ÉPREUVE GARDE ─────────────────────────────────────────────
//
// Les trois phrases sur lesquelles trébuche une classe entière, et qu'un
// générateur peut rendre fausses sans que rien ne se voie :
//
//   « 7 ⩽ 7 » est VRAI.
//   Le reste est TOUJOURS plus petit que le diviseur.
//   La retenue vaut SOIXANTE, jamais dix.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../js/core/ids.js';
import { encadrementGenerator } from '../js/core/generators/encadrement.js';
import { euclidienneGenerator } from '../js/core/generators/euclidienne.js';
import { dureesGenerator, ecrireDuree } from '../js/core/generators/durees.js';

/** Joue un générateur sur assez de questions pour traverser ses marches. */
function tirer(gen, combien = 60) {
    const out = [];
    for (let i = 0; i < combien; i++) {
        out.push(gen.generate({}, { rng: makeRng(`t${i}`), index: i, total: combien }));
    }
    return out;
}

// ─────────────────────────────────────── BLOC 3 ─────────────────────────────

test('« 7 ⩽ 7 » EST VRAI, ET « 7 < 7 » EST FAUX', () => {
    // C'EST LA PHRASE QUI FAIT TRÉBUCHER UNE CLASSE, et elle n'est pas un
    // détail de notation : tout le collège s'appuie dessus. Un générateur qui
    // jugerait « 7 ⩽ 7 » faux apprendrait l'inverse de la leçon, et rien dans
    // l'écran ne le signalerait.
    const vus = tirer(encadrementGenerator).filter(it => it.meta.marche === 'large-strict');
    assert.ok(vus.length >= 5, 'la marche des inégalités ne sort jamais');
    for (const it of vus) {
        const { a, b, signe } = it.meta;
        const attendu = signe === '<' ? a < b : signe === '⩽' ? a <= b
            : signe === '>' ? a > b : a >= b;
        assert.equal(it.answer, attendu ? 'vrai' : 'faux',
            `${a} ${signe} ${b} est jugé ${it.answer}`);
    }
    // ET LES NOMBRES ÉGAUX SORTENT VRAIMENT. C'est le seul cas où < et ⩽ ne
    // disent pas la même chose : sans lui, répondre au hasard sur le signe
    // marche une fois sur deux, et l'exercice n'apprend rien.
    assert.ok(vus.some(it => it.meta.egaux), 'aucune question sur deux nombres égaux');
});

test('UN ENCADREMENT ENCADRE VRAIMENT, ET AU BON RANG', () => {
    const vus = tirer(encadrementGenerator).filter(it => it.meta.marche.startsWith('encadrer'));
    assert.ok(vus.length >= 5);
    for (const it of vus) {
        const { valeur, bas, haut, pas } = it.meta;
        assert.ok(bas < valeur && valeur < haut,
            `${bas} < ${valeur} < ${haut} n'encadre pas`);
        // STRICTEMENT : « 40 < 40 < 50 » n'a pas de sens, et c'est le tirage
        // qui doit l'empêcher — pas une explication après coup.
        assert.notEqual(valeur, bas);
        assert.notEqual(valeur, haut);
        // AU RANG DEMANDÉ : les bornes sont des multiples du pas, et elles se
        // suivent. Encadrer 47 entre 40 et 60 serait juste et hors sujet.
        assert.equal(Number((haut - bas).toFixed(4)), pas);
        assert.equal(Number((bas / pas).toFixed(4)) % 1, 0,
            `${bas} n'est pas un multiple de ${pas}`);
        // ET AUCUNE PROPOSITION FAUSSE N'ENCADRE AUSSI : deux bonnes réponses
        // dans quatre propositions punit l'élève qui a raison.
        for (const c of it.choices) {
            if (c.correct) continue;
            const m = /^([\d,]+) < [\d,]+ < ([\d,]+)$/.exec(c.value);
            if (!m) continue;
            const b2 = Number(m[1].replace(',', '.')), h2 = Number(m[2].replace(',', '.'));
            assert.ok(!(b2 < valeur && valeur < h2 && Number((h2 - b2).toFixed(4)) === pas),
                `${c.value} encadre aussi ${valeur}`);
        }
    }
});

// ─────────────────────────────────────── BLOC 8 ─────────────────────────────

test('LE RESTE EST TOUJOURS PLUS PETIT QUE LE DIVISEUR', () => {
    // SANS CETTE CONDITION, LE COUPLE N'EST PAS UNIQUE, et l'erreur la plus
    // fréquente du chapitre — « 47 = 6 × 6 + 11 » — devient une réponse
    // acceptable. C'est elle qui dit qu'une division n'est pas finie.
    for (const it of tirer(euclidienneGenerator)) {
        const { a, b, q, r } = it.meta;
        assert.equal(a, b * q + r, `${a} ≠ ${b} × ${q} + ${r}`);
        assert.ok(r > 0, 'une division qui tombe juste n\'apprend rien du reste');
        assert.ok(r < b, `le reste ${r} n'est pas plus petit que le diviseur ${b}`);
    }
});

test('LE LIEN AVEC LA FRACTION DIT a/b = q + r/b', () => {
    const vus = tirer(euclidienneGenerator).filter(it => it.meta.marche === 'fraction');
    assert.ok(vus.length >= 3, 'la marche des fractions ne sort jamais');
    for (const it of vus) {
        const { a, b, q, r } = it.meta;
        assert.equal(it.answer, `${q} + ${r}/${b}`);
        // La valeur se vérifie : c'est le seul contrôle qui ne recopie pas la
        // formule qu'on prétend garder.
        assert.ok(Math.abs((q + r / b) - a / b) < 1e-9);
        // ET LE DÉNOMINATEUR EST LE DIVISEUR, jamais le dividende — c'est
        // l'erreur qu'on propose justement en leurre.
        assert.ok(it.choices.some(c => !c.correct && c.value.endsWith(`/${a}`)),
            'le leurre du dénominateur n\'est pas proposé');
    }
});

test('LA RETENUE D\'UNE DURÉE VAUT SOIXANTE, JAMAIS DIX', () => {
    // LE CAS DE RÉMY, MOT POUR MOT : 1 h 45 + 2 h 30. Les heures font 3, les
    // minutes 75 — et 75 minutes ne s'écrivent pas.
    assert.equal(ecrireDuree(105 + 150), '4 h 15');
    assert.equal(ecrireDuree(75), '1 h 15');
    assert.equal(ecrireDuree(60), '1 h');
    assert.equal(ecrireDuree(45), '45 min');
    // LES MINUTES S'ÉCRIVENT SUR DEUX CHIFFRES, comme sur une pendule :
    // « 2 h 5 » se lit mal, et personne ne l'écrit ainsi.
    assert.equal(ecrireDuree(125), '2 h 05');

    for (const it of tirer(dureesGenerator)) {
        // AUCUNE RÉPONSE JUSTE NE PORTE SOIXANTE MINUTES OU PLUS. C'est la
        // faute que l'exercice existe pour corriger : la voir dans la BONNE
        // réponse serait le comble.
        const m = /(\d+) h (\d+)/.exec(String(it.answer));
        if (m) assert.ok(Number(m[2]) < 60, `la réponse ${it.answer} dépasse 60 minutes`);
        assert.ok(!/-/.test(String(it.answer)), `durée négative : ${it.answer}`);
    }
});

test('LA RETENUE À DIX EST PROPOSÉE, ET ELLE EST FAUSSE', () => {
    // UN LEURRE QUI N'EST JAMAIS PROPOSÉ NE SERT À RIEN. L'élève qui retient
    // dix doit TROUVER sa réponse dans la liste, et lire pourquoi elle est
    // fausse : c'est là que le chapitre s'apprend.
    const vus = tirer(dureesGenerator)
        .filter(it => it.meta.marche === 'somme' && it.meta.deborde);
    assert.ok(vus.length >= 2, 'aucune addition avec retenue n\'est tirée');
    for (const it of vus) {
        // ON CHERCHE LA VALEUR, PAS LE MOT. Premier jet : je vérifiais qu'un
        // leurre PARLE de soixante — et `epreuveTombe` a dit « CETTE ÉPREUVE
        // NE GARDE RIEN », parce qu'un AUTRE leurre en parle aussi. On exige
        // donc la réponse qu'écrit l'élève qui retient dix : cinquante
        // minutes d'écart, puisqu'une heure comptée pour dix en coûte
        // cinquante.
        const dix = ecrireDuree(it.meta.total + 50);
        const leurre = it.choices.find(c => !c.correct && c.value === dix);
        assert.ok(leurre, `la retenue à dix (${dix}) n'est pas proposée pour `
            + `${it.prompt.text}`);
        assert.match(leurre.why || '', /60|soixante/i,
            'le leurre de la retenue à dix n\'explique pas pourquoi');
        // ET LA BONNE RÉPONSE EST BIEN LA SOMME, retenue comprise.
        assert.equal(it.answer, ecrireDuree(it.meta.x + it.meta.y));
    }
});

test('PASSER DES MINUTES AUX HEURES, C\'EST DIVISER PAR SOIXANTE', () => {
    const vus = tirer(dureesGenerator).filter(it => it.meta.marche === 'vers-heures');
    assert.ok(vus.length >= 2);
    for (const it of vus) {
        assert.equal(it.answer, ecrireDuree(it.meta.total));
        // LE LEURRE DE LA DIVISION PAR CENT EST PROPOSÉ : c'est la même erreur
        // que « 2 h 15 = 215 minutes », prise par l'autre bout.
        assert.ok(it.choices.some(c => !c.correct && /100|cent/i.test(c.why || '')),
            'le leurre de la division par cent n\'est pas proposé');
    }
});
