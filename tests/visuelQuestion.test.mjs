// Le carnet d'erreurs doit remontrer la FIGURE d'une question qui en porte
// une — et jamais une figure qui ne serait pas celle de la question.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import '../js/core/activities/index.js';
import { getGenerator } from '../js/core/registry.js';
import { makeRng } from '../js/core/ids.js';
import { figuresDe, normaliserEnonce, visuelDe } from '../js/core/visuelQuestion.js';

test('on extrait les figures, et rien que les figures', () => {
    const html = '<div class="game-question">Combien ?</div>'
        + '<div class="figure-wrap"><svg viewBox="0 0 10 10"><line x1="0"/></svg></div>';
    const f = figuresDe(html);
    assert.match(f, /figure-wrap/);
    assert.match(f, /<svg/);
    assert.ok(!/game-question/.test(f), 'la phrase est écrite par le carnet, pas par nous');
});

test('deux figures dans un énoncé sortent toutes les deux', () => {
    const html = '<div class="figure-wrap"><svg>A</svg></div><p>ou</p><div class="figure-wrap"><svg>B</svg></div>';
    assert.equal((figuresDe(html).match(/figure-wrap/g) || []).length, 2);
});

test('un SVG sans enveloppe compte quand même', () => {
    // Mieux vaut le montrer que de le perdre parce qu'il manque un div.
    const f = figuresDe('<svg viewBox="0 0 4 4"><circle/></svg>');
    assert.match(f, /figure-wrap/);
    assert.match(f, /<circle/);
});

test('un énoncé sans figure ne rend rien', () => {
    assert.equal(figuresDe('<div class="game-question">7 × 8 = ?</div>'), '');
    assert.equal(figuresDe(''), '');
    assert.equal(figuresDe(null), '');
});

test('la comparaison des énoncés ignore les espaces, pas les mots', () => {
    assert.equal(normaliserEnonce('  7 ×   8  '), '7 × 8');
    assert.equal(normaliserEnonce('a b'), 'a b');
    assert.notEqual(normaliserEnonce('7 × 8'), normaliserEnonce('9 × 8'));
    assert.equal(normaliserEnonce(null), '');
});

// --- Sur de vraies questions --------------------------------------------------

/** Fabrique une entrée de carnet comme le journal en produit une. */
function erreurDe(generatorId, params = {}) {
    const gen = getGenerator(generatorId);
    const seed = `g_${generatorId}`;
    const item = gen.generate(params, { rng: makeRng(seed), index: 0 });
    return {
        q: {
            generatorId, itemSeed: item.seed ?? seed,
            questionText: item.prompt.text
        },
        item
    };
}

test('une question à figure remontre sa figure', () => {
    // La notation des droites : « Comment note-t-on cette figure ? » — c'est
    // exactement la carte que Rémy a photographiée, sans son dessin.
    const gen = getGenerator('geo.notation');
    assert.ok(gen, 'le générateur de notation a changé de nom');

    let trouve = null;
    for (let i = 0; i < 30 && !trouve; i++) {
        const seed = `n${i}`;
        const item = gen.generate({ sens: ['ecrire'] }, { rng: makeRng(seed), index: i });
        if (!/figure-wrap|<svg/.test(item.prompt.html || '')) continue;
        trouve = { seed: item.seed ?? seed, item };
    }
    assert.ok(trouve, 'aucune question à figure produite en trente tirages');

    const v = visuelDe({
        generatorId: 'geo.notation',
        itemSeed: trouve.seed,
        questionText: trouve.item.prompt.text
    }, 'geo-notation');
    assert.ok(v, 'la figure de la question n\'a pas été retrouvée');
    assert.match(v.html, /<svg/);
    assert.equal(v.exact, true);
});

test('UNE FIGURE QUI N\'EST PAS CELLE DE LA QUESTION NE S\'AFFICHE PAS', () => {
    // Si les réglages ont changé depuis, la graine produit une AUTRE question.
    // Montrer son dessin serait pire que n'en montrer aucun.
    const { q } = erreurDe('geo.notation', { sens: ['ecrire'] });
    const menteur = { ...q, questionText: 'Une question qui n\'a jamais été posée' };
    assert.equal(visuelDe(menteur, 'geo-notation'), null);
});

test('sans graine ni générateur, on se tait', () => {
    assert.equal(visuelDe(null), null);
    assert.equal(visuelDe({}), null);
    assert.equal(visuelDe({ generatorId: 'geo.notation' }), null, 'pas de graine');
    assert.equal(visuelDe({ itemSeed: 'x' }), null, 'pas de générateur');
    assert.equal(visuelDe({ generatorId: 'ce.generateur.nexiste.pas', itemSeed: 'x' }), null);
});

test('une question SANS figure ne fabrique pas de figure', () => {
    const { q } = erreurDe('calc.mult.fact', { tables: [7] });
    assert.equal(visuelDe(q, 'calc-mult-flash'), null);
});

test('un générateur qui refuse les réglages ne fait pas tomber le carnet', () => {
    // Un `generate` qui lève doit rendre le carnet muet sur CETTE carte, pas
    // vide sur toutes.
    const q = { generatorId: 'geo.notation', itemSeed: 'x', questionText: 'peu importe' };
    assert.doesNotThrow(() => visuelDe(q, 'un-exercice-qui-nexiste-pas'));
});
