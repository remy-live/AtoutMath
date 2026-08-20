// Le mot juste : le vocabulaire du calcul.
//
// Un générateur de vocabulaire ne se vérifie pas comme un générateur de
// calcul : ce n'est pas le résultat qu'il faut contrôler, c'est que le MOT
// annoncé corresponde bien au signe montré, et qu'aucun distracteur ne soit
// une seconde bonne réponse — dans un QCM de vocabulaire, deux formulations
// équivalentes rendraient l'élève fautif d'avoir raison.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { vocabulaireGenerator } from '../js/core/generators/vocabulaire.js';
import { makeRng } from '../js/core/ids.js';

const VOLETS = ['resultat', 'nombres', 'phrase-vers-calcul', 'calcul-vers-phrase', 'multiples', 'posee'];

const tirer = (volet, graine, index = 0) => vocabulaireGenerator.generate(
    { volets: [volet] }, { rng: makeRng(graine), index });

test('chaque question a une bonne réponse et une seule', () => {
    for (const volet of VOLETS) {
        for (let g = 0; g < 40; g++) {
            const it = tirer(volet, `${volet}-${g}`);
            const justes = it.choices.filter(c => c.correct);
            assert.equal(justes.length, 1, `${volet} : ${justes.length} bonnes réponses`);
            assert.equal(justes[0].value, it.answer);
        }
    }
});

test('quatre propositions, toutes différentes', () => {
    for (const volet of VOLETS) {
        for (let g = 0; g < 40; g++) {
            const it = tirer(volet, `${volet}-d${g}`);
            assert.equal(it.choices.length, 4, `${volet} : ${it.choices.length} propositions`);
            const vus = new Set(it.choices.map(c => String(c.value)));
            assert.equal(vus.size, 4, `${volet} : une proposition apparaît deux fois`);
        }
    }
});

// LE CALCUL S'ÉCRIT AVEC DES ESPACES INSÉCABLES : « 8 − 3 » ne doit jamais se
// couper en fin de ligne (voir `ecrire`). Les tests lisent donc l'énoncé à
// espaces normalisées — c'est le signe qui les intéresse, pas sa colle.
const lisible = (t) => String(t).replace(/ /g, ' ');

test('un calcul ne se coupe jamais en fin de ligne', () => {
    // Rémy : « c'est noté le résultat de 8 puis à la ligne −3, ça n'aide pas à
    // comprendre ». Sur un écran de 375 px, l'énoncé s'enroule ; le calcul,
    // lui, est un mot.
    for (const volet of ['resultat', 'nombres', 'calcul-vers-phrase']) {
        for (let g = 0; g < 30; g++) {
            const t = tirer(volet, `${volet}-nb${g}`).prompt.text;
            assert.ok(!/\d [+−×÷]/.test(t) && !/[+−×÷] \d/.test(t),
                `${volet} : un calcul à espaces sécables — « ${t} »`);
        }
    }
});

test('le mot du résultat suit le signe montré', () => {
    const attendu = { '+': 'la somme', '−': 'la différence', '×': 'le produit', '÷': 'le quotient' };
    for (let g = 0; g < 60; g++) {
        const it = tirer('resultat', `r${g}`);
        const dit = lisible(it.prompt.text);
        const signe = Object.keys(attendu).find(s => dit.includes(` ${s} `));
        assert.ok(signe, `signe introuvable dans « ${dit} »`);
        assert.equal(it.answer, attendu[signe], `pour « ${dit} »`);
    }
});

test('termes pour + et −, facteurs pour ×', () => {
    for (let g = 0; g < 60; g++) {
        const it = tirer('nombres', `n${g}`);
        const dit = lisible(it.prompt.text);
        const mult = dit.includes(' × ');
        assert.equal(it.answer, mult ? 'les facteurs' : 'les termes', `pour « ${dit} »`);
        // La division n'entre pas dans cette famille : ses deux nombres ont
        // chacun leur nom, et « les termes » y serait faux.
        assert.ok(!dit.includes(' ÷ '), 'la division ne doit pas être proposée ici');
    }
});

test('« et » avec la somme, « par » avec le produit', () => {
    // C'est le piège que la fiche surligne, et il ne doit jamais s'inverser
    // dans la BONNE réponse.
    for (let g = 0; g < 80; g++) {
        for (const volet of ['phrase-vers-calcul', 'calcul-vers-phrase']) {
            const it = tirer(volet, `${volet}-l${g}`);
            const enonce = volet === 'phrase-vers-calcul' ? it.prompt.text : String(it.answer);
            if (/somme|différence/.test(enonce)) assert.match(enonce, / et /, enonce);
            if (/produit|quotient/.test(enonce)) assert.match(enonce, / par /, enonce);
        }
    }
});

test('le quotient demandé tombe toujours juste', () => {
    // « Le quotient de 7 par 2 » vaut 3,5 : la question porterait alors sur le
    // calcul et non sur le mot.
    for (let g = 0; g < 60; g++) {
        const it = tirer('phrase-vers-calcul', `q${g}`);
        const m = /^(\d+) ÷ (\d+)$/.exec(String(it.answer));
        if (m) assert.equal(Number(m[1]) % Number(m[2]), 0, `${it.answer} ne tombe pas juste`);
    }
});

test('double et moitié : on multiplie ou on divise, on n\'ajoute pas', () => {
    for (let g = 0; g < 60; g++) {
        const it = tirer('multiples', `m${g}`);
        const m = /^(Le|La) ([a-zé]+) de (\d+)/.exec(it.prompt.text);
        assert.ok(m, it.prompt.text);
        const n = Number(m[3]);
        const k = { double: 2, triple: 3, quadruple: 4, moitié: 2, tiers: 3, quart: 4 }[m[2]];
        const attendu = ['moitié', 'tiers', 'quart'].includes(m[2]) ? n / k : n * k;
        assert.equal(it.answer, attendu, it.prompt.text);
        assert.ok(Number.isInteger(it.answer), `${it.prompt.text} → ${it.answer} n'est pas entier`);
    }
});

test('la division posée : dividende = diviseur × quotient + reste', () => {
    for (let g = 0; g < 60; g++) {
        const it = tirer('posee', `p${g}`);
        const m = /division de (\d+) par (\d+).*obtient (\d+).*reste (\d+)/.exec(it.prompt.text);
        assert.ok(m, it.prompt.text);
        const [, D, d, q, r] = m.map(Number);
        assert.equal(D, d * q + r, it.prompt.text);
        assert.ok(r < d, `le reste ${r} n'est pas plus petit que le diviseur ${d}`);
        // Le nombre montré ne doit désigner qu'un seul rôle.
        const nb = Number(/Que représente (\d+)/.exec(it.prompt.text)[1]);
        assert.equal([D, d, q, r].filter(v => v === nb).length, 1,
            `${nb} désigne deux rôles à la fois dans « ${it.prompt.text} »`);
    }
});

test('les volets tournent au lieu d\'être tirés au sort', () => {
    // Sur dix questions, un tirage aléatoire dans six familles en oublie
    // toujours une — et c'est celle que l'élève ne sait pas.
    const vus = [];
    for (let i = 0; i < 6; i++) {
        vus.push(vocabulaireGenerator.generate({}, { rng: makeRng(`t${i}`), index: i }).meta.volet);
    }
    assert.equal(new Set(vus).size, 6, `familles vues : ${vus.join(', ')}`);
});

test('chaque mauvaise réponse dit ce qu\'elle piège', () => {
    for (const volet of VOLETS) {
        const it = tirer(volet, `w-${volet}`);
        it.choices.filter(c => !c.correct).forEach(c => {
            assert.ok(c.why && c.why.length > 10,
                `${volet} : la proposition « ${c.label} » n'explique pas l'erreur`);
        });
    }
});

test('un réglage vide retombe sur toutes les familles', () => {
    const it = vocabulaireGenerator.generate({ volets: [] }, { rng: makeRng('vide'), index: 3 });
    assert.ok(VOLETS.includes(it.meta.volet));
});
