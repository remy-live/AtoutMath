// MULTIPLIER DEUX FRACTIONS — avec et sans décomposition.
//
// Rémy : « on fait les multiplications de fractions avec et sans
// décomposition ». Deux promesses tiennent cet exercice.
//
// LA PREMIÈRE : les deux réglages disent vrai. « Sans décomposition » doit
// vraiment ne rien laisser à simplifier, et « avec » doit vraiment l'exiger —
// sinon le réglage est un mot sur un bouton. Un produit tiré au hasard tombe
// presque toujours du même côté, donc les deux cas se CONSTRUISENT.
//
// LA SECONDE, et c'est celle qui compte : aucune proposition ne vaut la bonne
// réponse. C'est plus délicat ici qu'ailleurs — 24/36 et 2/3 sont deux
// écritures du même nombre, et l'élève qui choisit la première a raison. Une
// comparaison de chaînes ne l'aurait jamais vu.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { pgcd, estIrreductible } from '../js/core/fractionsEquivalentes.js';
import {
    tirerProduit, etapesProduit, corrigeProduit, reduire, memeValeur
} from '../js/core/fractionsProduit.js';
import { makeRng } from '../js/core/ids.js';

const tirages = (n, opts) => Array.from({ length: n }, (_, i) =>
    tirerProduit(makeRng(`pr${JSON.stringify(opts)}${i}`), opts));

// --- Le noyau ------------------------------------------------------------------

test('LE PRODUIT EST JUSTE — recalculé, pas recopié', () => {
    for (const decomposition of ['sans', 'avec', 'les-deux']) {
        for (const p of tirages(300, { decomposition, maxDen: 9, maxNum: 10 })) {
            assert.equal(p.produit.n, p.a * p.c);
            assert.equal(p.produit.d, p.b * p.d);
            // La réponse est le produit réduit, quel que soit le chemin.
            const r = reduire(p.produit.n, p.produit.d);
            assert.ok(memeValeur(r, p.reponse),
                `${p.a}/${p.b} × ${p.c}/${p.d} : annoncé ${p.reponse.n}/${p.reponse.d}`);
            assert.deepEqual({ n: p.reponse.n, d: p.reponse.d }, { n: r.n, d: r.d },
                'la réponse doit être irréductible');
        }
    }
});

test('LES DEUX RÉGLAGES DISENT VRAI — c\'est tout l\'objet de l\'exercice', () => {
    // « Sans décomposition » : rien ne se croise, donc le produit sort déjà
    // irréductible et l'élève n'a que la règle à appliquer.
    for (const p of tirages(300, { decomposition: 'sans', maxDen: 9, maxNum: 10 })) {
        assert.equal(p.croise, false);
        assert.equal(pgcd(p.a, p.d), 1, `${p.a} et ${p.d} se simplifient`);
        assert.equal(pgcd(p.c, p.b), 1, `${p.c} et ${p.b} se simplifient`);
        assert.equal(pgcd(p.produit.n, p.produit.d), 1,
            `${p.produit.n}/${p.produit.d} devrait être irréductible`);
    }
    // « Avec » : quelque chose se croise, et c'est TOUT ce qui se simplifie —
    // chaque facteur étant donné irréductible, a n'a rien à partager avec b.
    for (const p of tirages(300, { decomposition: 'avec', maxDen: 9, maxNum: 10 })) {
        assert.equal(p.croise, true);
        assert.ok(p.g1 > 1 || p.g2 > 1);
        assert.ok(pgcd(p.produit.n, p.produit.d) > 1,
            `${p.produit.n}/${p.produit.d} n'a rien à simplifier`);
        assert.equal(p.g1 * p.g2, pgcd(p.produit.n, p.produit.d),
            'toute la simplification vient des diagonales');
    }
});

test('CHAQUE FACTEUR EST DONNÉ IRRÉDUCTIBLE, comme dans un énoncé', () => {
    // Sans cela, « 2/4 × 5/7 » se simplifierait DANS une fraction avant même
    // qu'on ait multiplié : ce serait une question de simplification, et le
    // réglage « sans décomposition » deviendrait faux.
    for (const p of tirages(400, { decomposition: 'les-deux', maxDen: 9, maxNum: 10 })) {
        assert.ok(estIrreductible(p.a, p.b), `${p.a}/${p.b} se simplifie`);
        assert.ok(estIrreductible(p.c, p.d), `${p.c}/${p.d} se simplifie`);
        assert.ok(p.b >= 2 && p.d >= 2, 'un dénominateur de 1 n\'est pas une fraction');
        // ON RESTE DANS LES TABLES : sinon la règle des fractions tient en une
        // ligne et tout le reste est une multiplication à deux chiffres.
        assert.ok(p.produit.n <= 100 && p.produit.d <= 100,
            `${p.produit.n}/${p.produit.d} : le calcul prend le pas sur la règle`);
        // Et le résultat reste une FRACTION, pas un entier déguisé en « 1/1 ».
        assert.ok(p.reponse.d >= 2, `${p.reponse.n}/${p.reponse.d} n'est plus une fraction`);
    }
});

test('L\'INDICE MONTRE LA DIAGONALE, il ne donne pas le résultat', () => {
    for (const p of tirages(200, { decomposition: 'les-deux', maxDen: 9, maxNum: 10 })) {
        const e = etapesProduit(p);
        assert.equal(e.length, 3);
        // Le dernier indice dit ce qu'il RESTE à faire, pas ce que ça fait.
        assert.doesNotMatch(e[2], new RegExp(`${p.reponse.n}\\s*/\\s*${p.reponse.d}`));
        if (p.croise) assert.match(e[2], /DIAGONALE/);
        else assert.match(e[2], /[Rr]ien ne se simplifie/);
    }
});

test('LE CORRIGÉ MONTRE LES DEUX CHEMINS — c\'est la demande de Rémy', () => {
    // « Avec et sans décomposition » : les deux sont justes, et c'est en les
    // voyant l'un sous l'autre qu'on comprend pourquoi le premier est le bon.
    // La question n'est pas « lequel est juste » mais « lequel te fait chercher
    // un PGCD ».
    for (const p of tirages(200, { decomposition: 'avec', maxDen: 9, maxNum: 10 })) {
        const c = corrigeProduit(p);
        assert.match(c, /décomposant d’abord/);
        assert.match(c, new RegExp(`${p.produit.n}/${p.produit.d}`),
            'le corrigé doit montrer aussi le produit brut');
        assert.match(c, new RegExp(`${p.reponse.n}/${p.reponse.d}`));
        // Et il nomme le PGCD qu'on s'épargne.
        assert.match(c, new RegExp(`simplifier par ${pgcd(p.produit.n, p.produit.d)}`));
    }
    // Sans décomposition il n'y a pas deux chemins, et l'on ne fait pas
    // semblant : le corrigé dit simplement qu'il n'y a rien à simplifier.
    for (const p of tirages(100, { decomposition: 'sans', maxDen: 9, maxNum: 10 })) {
        const c = corrigeProduit(p);
        assert.doesNotMatch(c, /décomposant/);
        assert.match(c, /[Rr]ien n’est à simplifier/);
    }
});

// --- Le générateur ---------------------------------------------------------------

test('AUCUNE PROPOSITION NE VAUT LA BONNE RÉPONSE', async () => {
    // LE PIÈGE PROPRE À CE CHAPITRE. 24/36 et 2/3 sont deux ÉCRITURES du même
    // nombre : l'élève qui choisit la première a raison et se voit compté
    // faux, et rien ne l'aurait signalé puisque les chaînes diffèrent. On
    // compare donc des VALEURS.
    const { fracProduitGenerator: G } = await import('../js/core/generators/fractions.js');
    for (const decomposition of ['sans', 'avec', 'les-deux']) {
        for (let i = 0; i < 300; i++) {
            const it = G.generate({ decomposition, maxDen: 9, maxNum: 10 },
                { rng: makeRng(`gp${decomposition}${i}`), index: i, total: 300 });
            assert.equal(it.choices.length, 4, `${it.prompt.text} : ${it.choices.length} propositions`);
            assert.equal(it.choices.filter(c => c.correct).length, 1);
            assert.equal(it.choices.find(c => c.correct).value, it.answer);
            const valeurs = it.choices.map(c => {
                const [n, d] = String(c.value).split('/').map(Number);
                assert.ok(Number.isFinite(n) && Number.isFinite(d),
                    `« ${c.value} » n'est pas une fraction`);
                // PAS DE « 6/1 » DANS LA LISTE : un entier écrit sur 1 se
                // repère du premier coup d'œil, sans rien calculer.
                assert.ok(d >= 2, `« ${c.value} » n'est pas une fraction à comparer`);
                return reduire(n, d);
            });
            for (let x = 0; x < valeurs.length; x++) {
                for (let y = x + 1; y < valeurs.length; y++) {
                    assert.ok(!memeValeur(valeurs[x], valeurs[y]),
                        `${it.prompt.text} : « ${it.choices[x].value} » et `
                        + `« ${it.choices[y].value} » sont le même nombre`);
                }
            }
        }
    }
});

test('CHAQUE MAUVAISE PROPOSITION DIT QUELLE CONFUSION ELLE PIÈGE', async () => {
    // Additionner au lieu de multiplier, multiplier en croix — ce qui est la
    // DIVISION —, retourner le résultat : les trois façons dont un chapitre où
    // l'on vient d'apprendre trois opérations se mélange.
    const { fracProduitGenerator: G } = await import('../js/core/generators/fractions.js');
    let avecRaison = 0, total = 0;
    for (let i = 0; i < 200; i++) {
        const it = G.generate({ decomposition: 'les-deux', maxDen: 9, maxNum: 10 },
            { rng: makeRng(`why${i}`), index: i, total: 200 });
        it.choices.filter(c => !c.correct).forEach(c => {
            total += 1;
            if (c.why) avecRaison += 1;
        });
        assert.ok(!it.choices.find(c => c.correct).why,
            'la bonne réponse n\'a rien à justifier');
    }
    // Le remplissage n'a pas de raison à donner — c'est un nombre voisin, pas
    // une confusion — mais il ne doit pas devenir la règle.
    assert.ok(avecRaison / total > 0.85,
        `seulement ${avecRaison} propositions sur ${total} nomment une erreur`);
});

test('l\'exercice est au catalogue, rangé et imprimable', async () => {
    const { getExerciseById } = await import('../js/data/catalog.js');
    const { CHAPITRES } = await import('../js/data/chapitres.js');
    const { SKILLS } = await import('../js/data/skills.js');
    const { CODES_EXERCICES } = await import('../js/data/codesExercices.js');
    const { fracProduitGenerator } = await import('../js/core/generators/fractions.js');

    const e = getExerciseById('frac-produit');
    assert.ok(e, 'frac-produit manque au catalogue');
    assert.equal(e.generatorId, 'frac.produit');
    assert.deepEqual(fracProduitGenerator.skills, ['num.frac.multiplication']);
    assert.ok(SKILLS['num.frac.multiplication'], 'la compétence manque');
    assert.ok(SKILLS['num.frac.multiplication'].lesson.length > 300, 'leçon trop courte');
    assert.ok(e.consignePapier && e.instruction.length > 400);
    assert.equal(CODES_EXERCICES['frac-produit'], 'FP');
    // ET ELLE APPARTIENT À UN CHAPITRE : sans cela l'exercice n'est
    // atteignable que par la recherche, jamais depuis la vue par chapitres.
    const chapitres = CHAPITRES.filter(c => c.skills.includes('num.frac.multiplication'));
    assert.ok(chapitres.length >= 2, 'la multiplication doit être aux chapitres « Fractions »');
});
