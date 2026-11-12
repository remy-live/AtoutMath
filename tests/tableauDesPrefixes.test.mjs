// LE TABLEAU DES PRÉFIXES S'OUVRE GARNI, ET IL DIT LES NOMS.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, après l'avoir essayé : « pour le tableau des mega w, kw, Mets le nom
// dans le tableau et leur équivalent non minifié, il faut que ce soit plus
// simple et aussi milli et on place dans le tableau au départ. »
//
// ── CE QU'IL VOYAIT, ET QUI A ÉTÉ PHOTOGRAPHIÉ ─────────────────────────────
//
// Quatre cases vides, quatre étiquettes — W, MW, mW, kW — et sous le tableau :
// « Attention : "m" minuscule est MILLI, "M" majuscule est MÉGA ». L'exercice
// ouvrait donc sur un TRI DE PRÉFIXES À LA CASSE, avant la première
// conversion, et celui qui s'y trompait n'atteignait jamais le calcul.
//
// ── CE QUE CES ÉPREUVES GARDENT ────────────────────────────────────────────
//
// Trois choses qu'on ne retrouverait pas en relisant le code, parce qu'elles
// se lisent à l'écran :
//
// 1. Les préfixes s'ouvrent GARNIS, et les longueurs NON. Placer km, hm, dam…
//    EST la leçon du tableau des longueurs ; l'élève connaît ces mots depuis
//    le CM2. Retirer l'étape 1 partout aurait réglé le problème de Rémy en
//    vidant un autre exercice de sa substance.
// 2. Chaque colonne garnie dit un NOM et une ÉQUIVALENCE. Une seule qui les
//    oublierait rouvrirait exactement le trou qu'on vient de combler.
// 3. L'équivalence dit la VÉRITÉ. « 1 000 W » sous « MW » serait pire que
//    rien : un appui faux est recopié sans être vérifié.
//
// ET LA TROISIÈME ÉPREUVE EST LA PLUS UTILE DES TROIS : les noms, eux, se
// distinguent sans la casse. « milliwatt » et « mégawatt » ne se confondent
// pas, là où « mW » et « MW » se confondent dès qu'on les écrit à la main.
// C'est précisément ce que la ligne du milieu vient réparer, et l'épreuve le
// dit en le VÉRIFIANT : les symboles en minuscules ne sont PAS distincts.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sansCommentaires } from './helpers.mjs';
import { FAMILLES, familleDe, echelonDe } from '../js/core/conversion.js';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
import { conversionFicheGenerator } from '../js/core/generators/conversionFiche.js';
import { makeRng } from '../js/core/ids.js';

/** « 1 000 000 W » → 1000000. Les espaces sont des séparateurs de milliers. */
const nombreDe = (txt) => Number(
    String(txt).replace(/[^\d,]/g, '').replace(',', '.')
);

test('LE TABLEAU DES PRÉFIXES S’OUVRE GARNI, LES LONGUEURS NON', () => {
    assert.equal(FAMILLES.prefixes.enPlace, true);
    // LES AUTRES FAMILLES GARDENT L'ÉTAPE 1. Si quelqu'un garnissait les
    // longueurs « pour simplifier aussi », un exercice entier perdrait son
    // premier temps sans que rien ne le signale.
    for (const id of ['longueur', 'masse', 'capacite', 'aire', 'volume']) {
        assert.notEqual(FAMILLES[id].enPlace, true,
            `${id} doit garder l’étape « place les unités »`);
    }
});

test('CHAQUE COLONNE GARNIE DIT SON NOM ET CE QU’ELLE VAUT', () => {
    for (const f of Object.values(FAMILLES)) {
        if (f.enPlace !== true) continue;
        for (const u of f.unites) {
            assert.ok(u.nom && u.nom.length > 2,
                `${u.symbole} doit porter un nom entier`);
            assert.ok(u.vaut, `${u.symbole} doit dire ce qu’il vaut`);
            // L'ÉQUIVALENCE EST ÉCRITE DANS L'UNITÉ DE BASE, pas dans une autre
            // unité de la famille : « 1 000 W » sous kW, jamais « 0,001 MW ».
            assert.ok(u.vaut.endsWith(' ' + f.base),
                `« ${u.vaut} » doit s’exprimer en ${f.base}`);
        }
    }
});

test('CE QUE DIT L’ÉQUIVALENCE EST VRAI', () => {
    const f = FAMILLES.prefixes;
    for (const u of f.unites) {
        // Le rang EST la puissance de dix : mégawatt au rang 6 vaut 10⁶ watts.
        const attendu = Math.pow(10, u.rang);
        const lu = nombreDe(u.vaut);
        assert.ok(Math.abs(lu - attendu) < attendu * 1e-9,
            `« ${u.vaut} » sous ${u.symbole} : on attendait ${attendu}`);
    }
    // ET LES QUATRE MARCHES SONT LÀ, milli compris — Rémy : « et aussi milli ».
    assert.deepEqual(f.unites.map(u => u.nom),
        ['mégawatt', 'kilowatt', 'watt', 'milliwatt']);
});

test('LES NOMS SE DISTINGUENT SANS LA CASSE, LES SYMBOLES NON', () => {
    const f = FAMILLES.prefixes;
    const noms = f.unites.map(u => u.nom.toLowerCase());
    assert.equal(new Set(noms).size, noms.length,
        'deux préfixes ne peuvent pas porter le même nom');
    // LA MESURE DU PROBLÈME, ET NON SA SOLUTION : les symboles, eux, se
    // confondent. mW et MW ne diffèrent que par une majuscule — c'est la
    // faute qui vaut un milliard, et c'est pourquoi le nom est écrit dessous.
    const symboles = f.unites.map(u => u.symbole.toLowerCase());
    assert.ok(new Set(symboles).size < symboles.length,
        'si les symboles se distinguaient sans la casse, cette épreuve a perdu son objet');
});

test('LE CORPS DES EN-TÊTES SE CALCULE SUR CE QU\u2019ON ÉCRIT', () => {
    // L'ANCIEN CALCUL MESURAIT UNE COLONNE ET SUPPOSAIT TROIS LETTRES — les
    // deux à la fois, dans le même 0,6 —, parce que « dam » était le plus long
    // des en-têtes. « mW milliwatt » en fait douze et coiffe trois colonnes.
    //
    // VU SUR LA FEUILLE avant la correction : « MW mégawatt » touchait les deux
    // traits épais de sa case. Il tenait encore parce que l'énoncé de ce
    // tirage-là était court ; rien ne l'aurait retenu au bord sur un tirage
    // plus long, et une feuille qui déborde ne se voit qu'à l'impression.
    const N = sansCommentaires(lire('js/ui/fiches/nombres.js'));
    const m = /tailleEntete:[\s\S]{0,200}/.exec(N);
    assert.ok(m, 'le corps des en-têtes doit se calculer quelque part');
    assert.match(m[0], /cw \* ech/,
        'la largeur disponible est celle du BLOC : une unité peut coiffer trois colonnes');
    assert.match(m[0], /m\.unites/,
        'la longueur est celle du texte qu\u2019on écrit, pas celle de « dam »');
});

test('LA FEUILLE ÉCRIT LE NOM À CÔTÉ DU SYMBOLE, ET SEULEMENT LÀ', () => {
    // UNE SEULE RANGÉE D'EN-TÊTE SUR LE PAPIER, de hauteur fixe et éprouvée :
    // le nom va donc sur la MÊME ligne que le symbole. Une unité de préfixe
    // coiffe trois cases, « MW mégawatt » y tient — vu sur la feuille.
    const q = conversionFicheGenerator.generate(
        { famille: 'prefixes', lignes: 3, entetes: true, ecart: 3, tableau: true },
        { rng: makeRng('feuille-prefixes') }
    );
    assert.deepEqual(q.meta.unites,
        ['MW mégawatt', 'kW kilowatt', 'W watt', 'mW milliwatt']);
    assert.equal(echelonDe('prefixes'), 3);

    // AUX LONGUEURS, RIEN NE CHANGE : une unité y coiffe UNE case de sept
    // millimètres, et « kilomètre » n'y tiendrait pas — mais surtout, écrire
    // « 1 000 m » sous « km » donnerait la conversion qu'on demande.
    const l = conversionFicheGenerator.generate(
        { famille: 'longueur', lignes: 3, entetes: true, ecart: 3, tableau: true },
        { rng: makeRng('feuille-longueur') }
    );
    assert.deepEqual(l.meta.unites, familleDe('longueur').unites.map(u => u.symbole));
    assert.ok(l.meta.unites.every(u => !u.includes(' ')),
        'un en-tête de longueur reste un symbole seul');
});
