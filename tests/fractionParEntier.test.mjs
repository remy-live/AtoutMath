// MULTIPLIER UNE FRACTION PAR UN ENTIER — le cas de sixième.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, dix-huitième bloc de sa progression de sixième : « multiplier une
// fraction par un nombre ». MESURÉ AVANT D'ÉCRIRE : « Multiplier des
// Fractions » ne savait multiplier que DEUX fractions, et s'interdisait même
// explicitement le dénominateur 1 — « 1/1 et 3/1 ne sont pas des fractions à
// multiplier », ce qui est juste et manquait le cas.
//
// CE QUE CES ÉPREUVES GARDENT :
//
//   1. LE DÉNOMINATEUR NE BOUGE PAS. C'est toute la notion : « 3 × 2/5 », c'est
//      « 2/5 + 2/5 + 2/5 ». Le nombre de parts est multiplié, LEUR TAILLE NON.
//   2. LE RÉSULTAT S'ÉCRIT D'UNE SEULE FAÇON. 6/4 et 3/2 sont tous les deux
//      justes ; le logiciel doit en écrire un, et quel que soit son choix la
//      moitié des élèves qui ont raison seraient comptés faux.
//   3. AUCUNE PROPOSITION N'EST UN ENTIER DÉGUISÉ. « 3 × 1/2 » proposait
//      « 4/2 », qui vaut 2 : au milieu de fractions, un entier se repère du
//      premier coup d'œil, sans rien calculer.
//   4. LES TROIS LEURRES SONT LES TROIS ERREURS DU CHAPITRE, et le premier —
//      multiplier aussi le dénominateur — doit toujours sortir : c'est CELUI
//      que l'exercice existe pour montrer.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../js/core/ids.js';
import { pgcd } from '../js/core/fractionsEquivalentes.js';
import { tirerParEntier, corrigeParEntier } from '../js/core/fractionsProduit.js';
import { fracProduitGenerator as G } from '../js/core/generators/fractions.js';

// LA VALEUR D'UNE PROPOSITION S'ÉCRIT « n|d » DEPUIS QU'UNE FRACTION SE TAPE.
// Rémy : « du coup, tu le mets pour tous ? ». Les deux cases du pavé imposent
// « 20|49 » comme forme JUGÉE ; « 20/49 » reste la forme LUE, sur l'étiquette.
// On lit donc les deux, et l'épreuve garde la propriété, pas l'écriture.
const lire = (v) => String(v).split(/[/|]/).map(Number);

test('LE DÉNOMINATEUR NE BOUGE PAS, ET LE RÉSULTAT S\'ÉCRIT D\'UNE SEULE FAÇON', () => {
    for (let k = 0; k < 400; k++) {
        const p = tirerParEntier(makeRng('t' + k), { maxDen: 9, maxEntier: 9 });
        assert.ok(p.b >= 2 && p.b <= 9, `dénominateur ${p.b}`);
        assert.ok(p.k >= 2, `entier ${p.k}`);
        // LA FRACTION DE DÉPART EST UNE VRAIE FRACTION, inférieure à 1 : le
        // cas de sixième est celui des parts d'un tout.
        assert.ok(p.a >= 1 && p.a < p.b, `${p.a}/${p.b} n'est pas une fraction de sixième`);
        assert.equal(pgcd(p.a, p.b), 1, `${p.a}/${p.b} n'est pas irréductible`);
        // LE DÉNOMINATEUR DE LA RÉPONSE EST CELUI DU DÉPART.
        assert.equal(p.reponse.d, p.b, `${p.k} × ${p.a}/${p.b} → ${p.reponse.n}/${p.reponse.d}`);
        assert.equal(p.reponse.n, p.a * p.k);
        // ET IL N'Y A QU'UNE ÉCRITURE : sinon deux élèves ont raison et un
        // seul est compté juste.
        assert.equal(pgcd(p.reponse.n, p.reponse.d), 1,
            `${p.reponse.n}/${p.reponse.d} se simplifie`);
    }
});

test('L\'ENTIER S\'ÉCRIT DES DEUX CÔTÉS, ET JAMAIS SUR 1', () => {
    // Les manuels écrivent « 3 × 2/5 » et « 2/5 × 3 » ; n'en montrer qu'un
    // apprendrait que l'entier est toujours en tête. Et « 3/1 » donnerait la
    // méthode avant qu'on l'ait cherchée.
    const cotes = new Set();
    for (let k = 0; k < 60; k++) {
        const it = G.generate({ facteurs: 'par-un-entier' }, { rng: makeRng('c' + k) });
        const t = it.prompt.text;
        assert.doesNotMatch(t, /\/1\b/, `« ${t} » écrit l'entier sur 1`);
        assert.doesNotMatch(it.prompt.html, /\/1</, 'l\'entier est écrit sur 1 dans le html');
        cotes.add(/^\d+ ×/.test(t) ? 'devant' : 'derrière');
    }
    assert.deepEqual([...cotes].sort(), ['derrière', 'devant']);
});

test('AUCUNE PROPOSITION N\'EST UN ENTIER DÉGUISÉ, NI DEUX FOIS LA MÊME VALEUR', () => {
    for (const facteurs of ['par-un-entier', 'deux-fractions']) {
        for (let k = 0; k < 250; k++) {
            const it = G.generate({ facteurs, maxDen: 9, maxNum: 9 },
                { rng: makeRng(`e-${facteurs}-${k}`) });
            assert.equal(it.choices.length, 4, it.prompt.text);
            const valeurs = [];
            for (const c of it.choices) {
                const [n, d] = lire(c.value);
                assert.ok(d >= 2, `« ${c.value} » dans « ${it.prompt.text} »`);
                assert.notEqual(n % d, 0, `« ${c.value} » vaut un entier — ${it.prompt.text}`);
                valeurs.push(n / d);
            }
            assert.equal(new Set(valeurs).size, 4,
                `deux propositions valent le même nombre : ${it.choices.map(c => c.value)}`);
            assert.equal(it.choices.filter(c => c.correct).length, 1);
        }
    }
});

test('L\'ERREUR DU CHAPITRE EST TOUJOURS PROPOSÉE', () => {
    // « On multiplie aussi le dénominateur » est L'erreur de sixième, et elle
    // est sournoise : le résultat VAUT la fraction de départ. Si elle manque
    // de la liste, l'exercice ne montre plus rien — il fait seulement calculer.
    //
    // ET C'EST PLUS QU'UNE PROPOSITION PARMI QUATRE. MESURÉ À L'ÉCRAN : quand
    // l'escalier d'aide n'en montre que DEUX — « la question la plus nette
    // qu'on puisse poser », dit `activities/choice.js` —, les deux gardées
    // sont la bonne réponse et celle-ci. « 1/4 × 5 » proposait 5/4 et 5/20,
    // « 3/5 × 6 » 18/5 et 18/30. Si ce leurre disparaissait, la question à
    // deux propositions deviendrait un pile ou face.
    let manquantes = 0;
    for (let k = 0; k < 200; k++) {
        const it = G.generate({ facteurs: 'par-un-entier' }, { rng: makeRng('p' + k) });
        const { a, b, k: ent } = it.meta;
        const piege = `${a * ent}/${b * ent}`;
        if (!it.choices.some(c => String(c.value) === piege)) manquantes++;
    }
    assert.equal(manquantes, 0, `${manquantes} questions sur 200 sans le leurre du chapitre`);
});

test('LE CORRIGÉ N\'INVERSE PAS L\'ORDRE D\'ÉCRITURE', () => {
    // Il écrivait « 1/7 × 5 = (5 × 1)/7 » : juste, et illisible pour qui suit
    // le calcul des yeux. Un professeur de mathématiques le voit tout de suite.
    for (let k = 0; k < 120; k++) {
        const p = tirerParEntier(makeRng('o' + k));
        const texte = corrigeParEntier(p);
        const gauche = p.entierDevant ? `${p.k} × ${p.a}/${p.b}` : `${p.a}/${p.b} × ${p.k}`;
        const haut = p.entierDevant ? `(${p.k} × ${p.a})` : `(${p.a} × ${p.k})`;
        assert.ok(texte.startsWith(`${gauche} = ${haut}/${p.b}`), texte.slice(0, 60));
        assert.ok(texte.includes(`${p.reponse.n}/${p.reponse.d}`), texte);
    }
});

test('LE MÉLANGE DONNE BIEN LES DEUX GENRES', () => {
    // Un réglage « les deux » qui ne sortirait qu'un seul genre serait un
    // réglage mort, et rien ne le dirait : les questions seraient justes.
    const genres = new Set();
    for (let k = 0; k < 80; k++) {
        const it = G.generate({ facteurs: 'les-deux' }, { rng: makeRng('m' + k) });
        genres.add(it.meta.parEntier ? 'entier' : 'fractions');
    }
    assert.deepEqual([...genres].sort(), ['entier', 'fractions']);
});
