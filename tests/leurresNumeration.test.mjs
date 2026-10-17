// LES LEURRES D'UNE QUESTION DE RANG DOIVENT ÊTRE DANS LE NOMBRE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RETOUR D'UN PROFESSEUR, capture à l'appui :
//
//   « Quel est le chiffre des unités de 8 788,13 ? — □ 0 □ 8 □ 4 □ 7 »
//   « un IPR te dirait que ça ne teste pas forcément ce que tu veux… et puis
//     2 chiffres qui ne se trouvent pas dans les chiffres du nombre à analyser
//     c'est trop facilitant, ça vide l'exo de sa substance. »
//   « c'est LE truc à gérer quand on fait des exos versionnables, car c'est le
//     genre de détail qui fera qu'un prof lance ses élèves dessus… ou pas »
//
// Le 0 et le 4 ne figurent pas dans 8 788,13. Un élève qui ignore tout du rang
// des unités les écarte d'un coup d'œil : il ne lui reste que 8 et 7, et il a
// une chance sur deux sans rien savoir.
//
// MESURÉ sur 4 000 questions (`tools/tmp/devinable.mjs`), en simulant cet élève
// qui écarte les chiffres absents puis répond au hasard :
//
//     avant : 4 295 leurres sur 12 000 absents du nombre (36 %)
//             → 37 réussites sur 100, contre 25 au pur hasard
//     après : 0 leurre sur 12 000 absent du nombre
//             → 25 sur 100, c'est-à-dire le hasard et rien d'autre
//
// Ce test tient la règle, parce qu'elle se reperd au premier leurre ajouté sans
// y penser : TOUTE proposition est un chiffre qu'on voit dans l'énoncé.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { chiffreRangGenerator } from '../js/core/generators/numeration.js';
import { makeRng } from '../js/core/ids.js';

/** Les chiffres de l'énoncé : il n'en contient aucun autre que le nombre. */
const chiffresDeLEnonce = (item) => item.prompt.text.replace(/[^0-9]/g, '');

const tirer = (i, params = { partie: 'les deux', decimales: 3 }) =>
    chiffreRangGenerator.generate(params, { rng: makeRng('leurre_' + i) });

test('AUCUNE PROPOSITION N\'EST ÉTRANGÈRE AU NOMBRE', () => {
    let vues = 0;
    for (let i = 0; i < 600; i++) {
        const item = tirer(i);
        const nombre = chiffresDeLEnonce(item);
        assert.ok(nombre.length >= 5, `énoncé sans nombre lisible : ${item.prompt.text}`);
        for (const c of item.choices) {
            vues++;
            assert.ok(nombre.includes(String(c.value)),
                `« ${item.prompt.text} » propose ${c.value}, absent du nombre`);
        }
    }
    assert.ok(vues > 2000, `${vues} propositions vérifiées`);
});

test('IL Y A TOUJOURS QUATRE PROPOSITIONS, ET UNE SEULE JUSTE', () => {
    // Tirer les leurres DANS le nombre ne marche que si le nombre a de quoi les
    // fournir : « 8 888,88 » n'a qu'un chiffre, et la question n'aurait qu'une
    // proposition — elle serait d'ailleurs sans objet, la réponse y étant la
    // même à tous les rangs. Le générateur retire tant que le nombre n'a pas
    // quatre chiffres différents ; ce test vérifie que cela suffit toujours.
    for (let i = 0; i < 600; i++) {
        const item = tirer(i);
        assert.equal(item.choices.length, 4, item.prompt.text);
        assert.equal(item.choices.filter(c => c.correct).length, 1, item.prompt.text);
        const valeurs = item.choices.map(c => String(c.value));
        assert.equal(new Set(valeurs).size, 4, `propositions en double : ${valeurs.join(', ')}`);
    }
});

test('ÉLIMINER LES CHIFFRES ABSENTS NE RAPPORTE PLUS RIEN', () => {
    // La règle précédente exprimée autrement, et c'est CELLE-CI qui compte pour
    // l'élève : sa stratégie de surface doit valoir exactement le hasard.
    let hasard = 0, elimination = 0;
    const N = 600;
    for (let i = 0; i < N; i++) {
        const item = tirer(i);
        const nombre = chiffresDeLEnonce(item);
        const restent = item.choices.filter(c => nombre.includes(String(c.value)));
        hasard += 1 / item.choices.length;
        elimination += 1 / restent.length;
    }
    assert.equal(Math.round(elimination * 100 / N), Math.round(hasard * 100 / N),
        'écarter les chiffres absents ne doit donner aucun avantage');
});

test('LES DEUX LEURRES QUI ENSEIGNENT SONT TOUJOURS LÀ', () => {
    // Un leurre sans « pourquoi » ne fait que remplir. Ceux qui portent l'erreur
    // du chapitre — confondre dizaines et dixièmes, compter les rangs depuis la
    // gauche au lieu de la virgule — doivent survivre à la correction : c'est eux
    // qui font de la correction une leçon.
    let avecPourquoi = 0;
    for (let i = 0; i < 300; i++) {
        const item = tirer(i);
        if (item.choices.some(c => !c.correct && c.why)) avecPourquoi++;
    }
    assert.ok(avecPourquoi > 280, `seulement ${avecPourquoi} questions sur 300 expliquent une erreur`);
});
