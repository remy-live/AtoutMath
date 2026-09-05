// LES PRÉFIXES : kilo, méga, giga, téra, milli, micro, nano.
//
// Rémy : « je ne veux pour l'instant que des exercices sur les puissances sur
// les préfixes ». Ce que ces tests gardent, c'est la distinction qui fait tout
// le chapitre : le SYMBOLE qu'on lit (M), le PRÉFIXE qu'on prononce (méga), la
// PUISSANCE avec laquelle on calcule (10⁶). Savoir dire « méga, c'est un
// million » ne suffit pas à écrire 3 Mo = 3 × 10⁶ octets.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import {
    PREFIXES, prefixeDe, prefixeDuSymbole, convertirPrefixe, puissanceTexte
} from '../js/core/puissances.js';
import {
    ETAPES, ORDRE, symboleMesure, ecritureMesure, marchePour, prefixesGenerator as G
} from '../js/core/generators/prefixes.js';

const item = (params = {}, index = 0, cle = 'pf') =>
    G.generate(params, { rng: makeRng(`${cle}-${index}`), index });

// --- La table ----------------------------------------------------------------

test('LA TABLE DE RÉMY, DE PICO À TÉRA', () => {
    // Il en a fait une colonne entière de sa fiche de quatrième. Les six que le
    // programme demande vraiment sont marqués `usuel` ; les autres existent
    // pour lire un tableau, pas pour être récités.
    const attendus = { téra: 12, giga: 9, méga: 6, kilo: 3, centi: -2, milli: -3, micro: -6, nano: -9, pico: -12 };
    Object.entries(attendus).forEach(([nom, n]) => {
        const p = PREFIXES.find(x => x.prefixe === nom);
        assert.ok(p, `${nom} manque à la table`);
        assert.equal(p.n, n, `${nom} devrait valoir 10^${n}`);
    });
    // Chacun porte les trois choses, et un exemple pour les ancrer.
    PREFIXES.forEach(p => {
        assert.ok(p.symbole && p.prefixe && p.nom && p.exemple, `${p.prefixe} incomplet`);
    });
    // Et deux symboles ne se confondent jamais.
    const symboles = PREFIXES.map(p => p.symbole);
    assert.equal(new Set(symboles).size, symboles.length, 'deux préfixes partagent un symbole');
});

test('« µ » EST LE MICRO DES SCIENCES, pas la lettre grecque mu', () => {
    // U+00B5, celui des claviers et des étiquettes — pas U+03BC. Sur un
    // exercice où le symbole EST la réponse, les deux ne se valent pas.
    const micro = PREFIXES.find(p => p.prefixe === 'micro');
    assert.equal(micro.symbole, 'µ');
    assert.notEqual(micro.symbole, 'μ');
});

test('LA CASSE VAUT UN MILLIARD', () => {
    // « m » minuscule est milli (10⁻³), « M » majuscule est méga (10⁶).
    assert.equal(prefixeDuSymbole('m').prefixe, 'milli');
    assert.equal(prefixeDuSymbole('M').prefixe, 'méga');
    assert.equal(prefixeDuSymbole('M').n - prefixeDuSymbole('m').n, 9);
    assert.equal(prefixeDe(-9).prefixe, 'nano');
    assert.equal(prefixeDe(7), null, 'un exposant sans préfixe n\'en invente pas un');
});

test('CONVERTIR SE FAIT EN EXPOSANT, jamais en flottant', () => {
    // « 5 µm en mètres » vaut 5 × 10⁻⁶. Multiplier 5 par 1e-6 donnerait
    // 0.000005000000001 dans un énoncé, ce qu'aucun professeur n'écrit.
    assert.deepEqual(convertirPrefixe(5, -6, 0), { valeur: 5, exposant: -6 });
    assert.deepEqual(convertirPrefixe(3, 9, 6), { valeur: 3, exposant: 3 });
    assert.deepEqual(convertirPrefixe(8, 12, 0), { valeur: 8, exposant: 12 });
    // Vers la même unité, il n'y a rien à faire.
    assert.deepEqual(convertirPrefixe(7, 3, 3), { valeur: 7, exposant: 0 });
    assert.equal(ecritureMesure(7, 0), '7', 'un exposant nul ne s\'écrit pas');
    assert.equal(ecritureMesure(5, -6), `5 × ${puissanceTexte(-6)}`);
});

test('un symbole de mesure colle le préfixe à l\'unité', () => {
    assert.equal(symboleMesure(prefixeDe(-6), { court: 'm' }), 'µm');
    assert.equal(symboleMesure(prefixeDe(12), { court: 'o' }), 'To');
    assert.equal(symboleMesure(prefixeDe(6), { court: 'W' }), 'MW');
});

// --- La progression ------------------------------------------------------------

test('SIX MARCHES, ET LA CONVERSION ARRIVE EN DERNIER', () => {
    // C'est le but de tout le chapitre : on ne demande pas de convertir avant
    // d'avoir séparé le symbole, le préfixe et la puissance.
    assert.deepEqual(ORDRE, ['symbole', 'versPuissance', 'versPrefixe', 'casse', 'mesure', 'entre']);
    ETAPES.forEach((e, i) => assert.equal(e.rang, i + 1, `${e.id} mal rangé`));
});

test('les six marches se partagent l\'exercice, dans l\'ordre', () => {
    // Dix-huit questions pour six marches : trois chacune.
    const total = ORDRE.length * 3;
    for (let i = 0; i < 3; i++) assert.equal(marchePour({}, i, total), 'symbole');
    for (let i = 3; i < 6; i++) assert.equal(marchePour({}, i, total), 'versPuissance');
    // PLUS DE CYCLE. Il servait à ne pas finir une fiche de vingt par quinze
    // questions du même type quand la montée était fixe ; les marches cochées
    // se partagent maintenant le total, donc aucune ne déborde et l'on ne
    // redescend plus au bas de l'escalier. Une question de rab reste en haut.
    assert.equal(marchePour({}, total, total), 'entre');
    // Et cocher une seule case y reste — comme le faisait le menu, dont les
    // parcours enregistrés se relisent encore.
    for (let i = 0; i < 10; i++) {
        assert.equal(marchePour({ marches: ['mesure'] }, i, total), 'mesure');
        assert.equal(marchePour({ etape: 'mesure' }, i, total), 'mesure');
    }
});

test('CHAQUE QUESTION A QUATRE PROPOSITIONS, TOUTES DIFFÉRENTES', () => {
    // Les pas de trois se rejoignent parfois — « un cran trop court » depuis
    // 10³ et depuis 10⁻³ tombent tous deux sur 10⁰ —, et une question à trois
    // propositions dont l'une est seule de son espèce ne piège personne.
    for (let i = 0; i < 120; i++) {
        const it = item({}, i);
        assert.equal(it.choices.length, 4, `question ${i} : ${it.choices.length} propositions`);
        const vues = it.choices.map(c => String(c.value));
        assert.equal(new Set(vues).size, 4, `question ${i} : deux propositions identiques`);
        assert.equal(it.choices.filter(c => c.correct).length, 1);
        assert.equal(it.choices.find(c => c.correct).value, it.answer);
    }
});

test('LES RÉPONSES SONT JUSTES — recalculées, pas recopiées', () => {
    for (let i = 0; i < 60; i++) {
        const it = item({}, i);
        const m = it.meta.etape;
        if (m === 'versPuissance') {
            const p = PREFIXES.find(x => it.prompt.text.includes(`« ${x.prefixe} »`));
            assert.equal(it.answer, puissanceTexte(p.n), it.prompt.text);
        }
        if (m === 'versPrefixe') {
            const p = PREFIXES.find(x => it.answer === x.prefixe);
            assert.ok(it.prompt.text.startsWith(puissanceTexte(p.n)), it.prompt.text);
        }
        if (m === 'symbole') {
            const p = PREFIXES.find(x => it.answer === x.prefixe);
            assert.ok(it.prompt.text.includes(`« ${p.symbole} »`), it.prompt.text);
        }
    }
});

test('LE PIÈGE DE LA CASSE EST POSÉ, et il nomme les deux préfixes', () => {
    for (let i = 0; i < 12; i++) {
        const it = item({ etape: 'casse' }, i);
        assert.equal(it.meta.etape, 'casse');
        assert.match(it.explanation, /milli/);
        assert.match(it.explanation, /méga/);
        // Le distracteur qui confond les deux existe, et il le dit.
        assert.ok(it.choices.some(c => !c.correct && /CASSE/.test(c.why || '')),
            'aucun distracteur ne pointe la majuscule');
    }
});

test('un item porte tout ce qu\'il faut pour jouer, corriger et imprimer', () => {
    for (let i = 0; i < 24; i++) {
        const it = item({}, i);
        assert.equal(it.skillId, 'num.puissances.prefixes');
        assert.equal(it.answerKind, 'choice');
        assert.ok(it.prompt.papier && it.prompt.papier.length > 3, 'rien à imprimer');
        assert.ok(!/<[a-z]/i.test(it.prompt.papier), 'du HTML sur la feuille');
        assert.ok(it.explanation.length > 20, 'corrigé muet');
        assert.ok(it.hints.length >= 1, 'pas d\'indice');
        it.choices.filter(c => !c.correct).forEach(c =>
            assert.ok(c.why && c.why.length > 10, `piège muet : ${c.value}`));
    }
});

test('la même graine rend la même question', () => {
    const a = G.generate({}, { rng: makeRng('rejeu'), index: 9 });
    const b = G.generate({}, { rng: makeRng('rejeu'), index: 9 });
    assert.equal(a.prompt.text, b.prompt.text);
    assert.equal(a.answer, b.answer);
});
