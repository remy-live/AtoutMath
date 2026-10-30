// LE TABLEAU DE VALEURS DANS « TRACER UNE FONCTION ».
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « pour tracer une fonction, ce serait bien de pouvoir aussi avoir des
// questions avec remplissage de tableau ».
//
// L'ÉTAPE QU'ON SAUTAIT. Pour tracer, on calcule d'abord f(−2), f(0), f(3) —
// et c'est ce calcul-là qui se travaille ; l'exercice ne posait que le POINT,
// c'est-à-dire ce qui vient après. Sur la feuille imprimée le tableau existait
// déjà ; à l'écran, non.
//
// UN TABLEAU NE SE POINTE PAS, IL S'ÉCRIT. L'activité de cet exercice pose des
// points dans un repère : elle passe donc la main au pavé sur `meta.cases`, et
// la REPREND à la question suivante. C'est la moitié qu'on oublie — passer la
// main est facile, la reprendre l'est moins, et sans cela tout le reste de
// l'exercice se jouerait au clavier.
//
// MESURÉ DANS UN NAVIGATEUR (`tools/tableauDeValeurs.mjs`) : trois cases, le
// pavé avec sa touche « ± », les trois réponses comptées justes, puis le
// repère de nouveau à l'écran. Zéro erreur de page.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { readFileSync } from 'node:fs';
import '../js/core/activities/index.js';
import { exercices } from '../js/data/catalog.js';
import { getGenerator } from '../js/core/registry.js';
import { makeRng } from '../js/core/ids.js';
import { evaluate } from '../js/core/items.js';

const lire = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

const exo = () => exercices.find(e => e.id === 'alg-fonction-repere');

test('LA MARCHE DU TABLEAU EST OFFERTE AU PROFESSEUR', () => {
    const e = exo();
    assert.ok(e, 'alg-fonction-repere a disparu du catalogue');
    // LES MARCHES SONT ÉCRITES DANS LE CATALOGUE *ET* DANS LE GÉNÉRATEUR :
    // c'est la liste du catalogue que le panneau d'avant-partie affiche, et
    // une marche absente d'ici n'existe pour personne.
    assert.ok((e.params.marches || []).includes('tableau'),
        'la marche « tableau » n\'est pas cochable dans le panneau');
    const gen = getGenerator(e.generatorId);
    assert.ok((gen.answerKinds || []).includes('numeric'),
        'le générateur ne déclare plus qu\'une de ses marches s\'écrit');
});

test('ELLE POSE TROIS CASES, ET LA RÉPONSE EN A TROIS', () => {
    const gen = getGenerator(exo().generatorId);
    for (let i = 0; i < 8; i++) {
        const it = gen.generate({ marches: ['tableau'] },
            { rng: makeRng('tab' + i), index: i });
        const ou = `tirage ${i} — ${it.prompt.text}`;
        assert.equal(it.meta.marche, 'tableau', `le réglage n'a pas été suivi (${ou})`);
        assert.equal(it.answerKind, 'numeric', `le tableau ne s'écrit pas (${ou})`);
        // LE PAVÉ COMPTE LES `[data-trou]` QU'IL TROUVE : trois cases à
        // l'écran, trois morceaux dans la réponse. Un seul oubli, et trois
        // cases justes seraient comptées fausses.
        assert.equal((it.prompt.html.match(/data-trou=/g) || []).length, 3,
            `il n'y a pas trois cases (${ou})`);
        assert.equal(String(it.answer).split('|').length, 3,
            `la réponse n'a pas trois morceaux (${ou})`);
        assert.ok(evaluate(it, it.answer).correct,
            `la bonne réponse est comptée fausse (${ou})`);
        // ET LE SIGNE EST LÀ : une image peut être négative, et sans la touche
        // la moitié des tableaux seraient impossibles à remplir.
        assert.equal(it.meta.signe, true, `pas de touche de signe (${ou})`);
        assert.equal(it.meta.cases, true, `rien ne dit au repère de passer la main (${ou})`);
        // TOUTES LES VALEURS TOMBENT DANS LA GRILLE : c'est ce tableau-là
        // qu'on reportera sur le repère à la marche suivante.
        String(it.answer).split('|').forEach(v => assert.ok(Math.abs(Number(v)) <= it.meta.max,
            `f(x) = ${v} sort du repère (${ou})`));
    }
});

test('ET LE REPÈRE PASSE LA MAIN, PUIS LA REPREND', () => {
    // LES DEUX MOITIÉS, ET LA SECONDE EST CELLE QU'ON OUBLIE. `rendreLaMain`
    // est le contrat que le pavé appelle avant CHAQUE question : sans lui, la
    // marche « tableau » laisserait le clavier pour tout le reste de
    // l'exercice, et l'on placerait des points en tapant leurs coordonnées.
    const src = lire('js/core/activities/repere.js');
    assert.match(src, /const auPave = \(item\) =>/,
        'le repère ne sait plus reconnaître une question à cases');
    assert.match(src, /function rendreLaMain\(item\)/,
        'le repère ne sait plus reprendre la main');
    assert.match(src, /mod\.mount\(container, session, \{ item, rendreLaMain \}\)/,
        'le pavé est monté sans le rappel qui lui fera rendre la main');
});
