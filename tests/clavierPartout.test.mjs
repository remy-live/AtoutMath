// LE CLAVIER : LÀ OÙ IL VIENT, ET LÀ OÙ ON LE PROMET.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « pour les fractions sur la droite, l'option clavier ne fonctionne
// jamais, est ce le cas pour beaucoup d'exercices. »
//
// RECENSÉ (`tools/clavierDuCatalogue.mjs`) : sur les 166 exercices à
// générateur, 70 n'atteignaient JAMAIS le pavé — leur réponse est « 1/3 »,
// « pair », « [AB) », une grille. C'est juste pour presque tous : une grille
// de sudoku se remplit case par case. Ce qui ne l'était pas, c'est que le
// panneau d'avant-partie OFFRAIT quand même « Autoriser le clavier » sur les
// soixante-dix.
//
// ET SA SECONDE PHRASE : « attention certains exercices ont parfois besoin de
// la virgule ». Elle est gardée ici sur TOUT le catalogue.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { readFileSync } from 'node:fs';
import '../js/core/activities/index.js';
import { exercices } from '../js/data/catalog.js';
import { getGenerator } from '../js/core/registry.js';
import { makeRng } from '../js/core/ids.js';
import { itemPeutAllerAuClavier, itemPeutEtreChoisi } from '../js/core/aide.js';
import { evaluate } from '../js/core/items.js';

const lire = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

test('LES DEUX PANNEAUX POSENT LA MÊME QUESTION AVANT D\'OFFRIR LE CLAVIER', () => {
    // LA RÈGLE VIVAIT DANS UN SEUL DES DEUX. Le panneau des ÉTAPES d'un
    // parcours retirait « Autoriser le clavier » quand il ne pouvait pas
    // agir ; celui qu'on ouvre depuis le CATALOGUE ne le savait pas. Une règle
    // écrite deux fois est une règle qu'on oublie à un endroit — ici, elle
    // n'était écrite qu'une fois et appelée une fois.
    const CFG = lire('js/games/configUI.js');
    assert.match(CFG, /export function selonLesFormes\(schema, exo\) \{/,
        'la règle n\'est plus une fonction à elle');
    // ON COMPTE LES APPELS : deux panneaux, deux appels. Un `assert.match`
    // trouverait le premier et se déclarerait content pendant que le second
    // offrirait un clavier qui ne vient pas.
    assert.equal((CFG.match(/selonLesFormes\(paramSchemaOf\(exo\)/g) || []).length, 2,
        'les deux panneaux doivent filtrer, pas un seul');
});

test('LES FRACTIONS SE TAPENT EN DEUX CASES, SANS PERDRE LEURS PROPOSITIONS', () => {
    // RÉMY, sur la droite graduée puis « du coup, tu le mets pour tous ? ».
    // Une fraction n'est pas UN nombre, c'est DEUX : elle se tape donc comme
    // une durée, en deux cases — et les propositions restent, parce qu'elles
    // portent le « pourquoi » de chaque erreur.
    for (const id of ['frac-graduation', 'frac-add', 'frac-produit']) {
        const exo = exercices.find(e => e.id === id);
        assert.ok(exo, `${id} a disparu du catalogue`);
        const gen = getGenerator(exo.generatorId);
        assert.ok((gen.answerKinds || []).includes('numeric'),
            `${id} ne déclare plus qu'on peut taper`);
        for (let i = 0; i < 6; i++) {
            const it = gen.generate({ ...(exo.params || {}) },
                { rng: makeRng(id + 'g' + i), index: i });
            const ou = `${id} — ${it.prompt.text}`;
            assert.ok(itemPeutAllerAuClavier(it), `pas de clavier sur ${ou}`);
            assert.ok(itemPeutEtreChoisi(it), `plus de propositions sur ${ou}`);
            assert.match(String(it.answer), /^\d+\|\d+$/, `réponse mal formée sur ${ou}`);
            // DEUX CASES DANS L'ÉNONCÉ : le pavé compte les `[data-trou]`
            // qu'il y trouve, et sans elles il rendrait un seul nombre pour
            // une réponse qui en demande deux.
            assert.equal((it.prompt.html.match(/data-trou=/g) || []).length, 2,
                `il n'y a pas deux cases à remplir sur ${ou}`);
            // LA BONNE PROPOSITION DOIT ÊTRE COMPTÉE JUSTE : sa valeur part
            // telle quelle dans `submit`.
            const bon = (it.choices || []).find(c => c.correct);
            assert.ok(bon && evaluate(it, bon.value).correct,
                `la bonne proposition est comptée fausse sur ${ou}`);
            // ET AUCUNE ÉTIQUETTE NE MONTRE LA FORME INTERNE : « 7|5 » est ce
            // que le pavé envoie, pas ce qu'un élève lit sur un bouton.
            (it.choices || []).forEach(c => assert.ok(
                !String(c.label).includes('|'),
                `une proposition montre « ${c.label} » sur ${ou}`));
        }
    }
});

test('ET LA VIRGULE EST LÀ DÈS QUE LA RÉPONSE EN A BESOIN', () => {
    // RÉMY : « attention certains exercices ont parfois besoin de la virgule ».
    //
    // LA RÈGLE DU PAVÉ (`activities/numeric.js`) : la touche paraît quand un
    // morceau de la réponse n'est pas entier, SAUF si l'exercice tranche
    // lui-même par `meta.decimal`. C'est ce « sauf » qui peut mentir — un
    // exercice qui déclare `decimal: false` et rend « 2,5 » devient
    // impossible à répondre, et rien à l'écran ne le dit.
    //
    // ON NE REGARDE QUE LES QUESTIONS QUI PEUVENT ALLER AU PAVÉ : ailleurs, la
    // touche ne se pose pas. Premier jet sans ce filtre : un faux coupable,
    // « Laquelle de ces valeurs ne peut PAS être une probabilité ? », dont la
    // réponse « 1,2 » se CHOISIT et ne se tape jamais.
    const fautifs = [];
    let vues = 0;
    for (const exo of exercices) {
        const gen = getGenerator(exo.generatorId);
        if (!gen || typeof gen.generate !== 'function') continue;
        for (let i = 0; i < 10; i++) {
            let it;
            try {
                it = gen.generate({ ...(exo.params || {}) },
                    { rng: makeRng(exo.id + 'virg' + i), index: i });
            } catch (e) { continue; }
            if (!it || it.answer === null || it.answer === undefined) continue;
            if (!itemPeutAllerAuClavier(it)) continue;
            vues++;
            const morceaux = String(it.answer).split('|');
            const decimale = morceaux.some(v => {
                const n = Number(String(v).replace(',', '.'));
                return Number.isFinite(n) && !Number.isInteger(n);
            });
            if (decimale && it.meta && it.meta.decimal === false) {
                fautifs.push(`${exo.id} → ${it.answer}`);
            }
        }
    }
    assert.ok(vues > 500, `seulement ${vues} questions au pavé : le tirage ne couvre plus rien`);
    assert.deepEqual(fautifs, [],
        'une réponse décimale se tape sur un pavé sans virgule');
});
