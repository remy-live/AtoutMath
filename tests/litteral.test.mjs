// SIMPLIFIER ET RÉDUIRE UNE EXPRESSION LITTÉRALE.
//
// Rémy : « j'aimerais bien un exercice qui entraîne à simplifier et à réduire
// des expressions littérales (d'abord 2*x = 2x) — ATTENTION ON UTILISE LE SIGNE
// FOIS. » La majuscule est de lui, et c'est le premier test du fichier.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import {
    ecrireTerme, ecrireSomme, reduire, partLitterale, ETAPES, question,
    litteralReduireGenerator as G
} from '../js/core/generators/litteral.js';

const MOINS = '−';
const item = (params = {}, index = 0, cle = 'lit') =>
    G.generate(params, { rng: makeRng(`${cle}-${index}`), index });

// --- Le signe fois -----------------------------------------------------------

test('L\'ÉNONCÉ ÉCRIT LE SIGNE ×, TOUJOURS, ET JAMAIS L\'ASTÉRISQUE', () => {
    // C'est le signe qu'on apprend à faire disparaître : l'exercice n'aurait
    // plus d'objet si la question l'avait déjà supprimé. Et l'astérisque
    // n'existe qu'au clavier d'un ordinateur — l'écrire serait enseigner une
    // faute.
    const produits = ETAPES.filter(e => e.temps === 'A' || e.temps === 'B');
    produits.forEach(e => {
        for (let i = 0; i < 6; i++) {
            const q = question(e, makeRng(`fois-${e.id}-${i}`));
            assert.ok(q.enonce.includes('×'), `${e.id} : « ${q.enonce} » sans signe ×`);
            assert.ok(!q.enonce.includes('*'), `${e.id} : astérisque dans « ${q.enonce} »`);
        }
    });
});

test('ET LA RÉPONSE, ELLE, N\'EN A PLUS', () => {
    ETAPES.forEach(e => {
        for (let i = 0; i < 6; i++) {
            const q = question(e, makeRng(`sans-${e.id}-${i}`));
            assert.ok(!q.reponse.includes('×'), `${e.id} : « ${q.reponse} » garde un ×`);
        }
    });
});

// --- Les conventions d'écriture ---------------------------------------------

test('LE COEFFICIENT 1 NE S\'ÉCRIT PAS', () => {
    // On écrit x, jamais 1x ; et −x, jamais −1x. C'est une convention, et une
    // faute d'écriture très fréquente.
    assert.equal(ecrireTerme(1, 'x'), 'x');
    assert.equal(ecrireTerme(-1, 'x'), MOINS + 'x');
    assert.equal(ecrireTerme(3, 'x'), '3x');
    assert.equal(ecrireTerme(-3, 'x'), MOINS + '3x');
    assert.equal(ecrireTerme(0, 'x'), '0');
    // Sans partie littérale, c'est un nombre tout simple.
    assert.equal(ecrireTerme(7, ''), '7');
});

test('ON N\'ÉCRIT JAMAIS DEUX SIGNES À LA SUITE', () => {
    // « 3x + −2 » ne s'écrit pas : le signe du terme devient le signe de
    // l'opération. C'est la même règle que pour les relatifs.
    assert.equal(ecrireSomme([{ coef: 3, part: 'x' }, { coef: -2, part: '' }]),
        `3x ${MOINS} 2`);
    assert.equal(ecrireSomme([{ coef: 3, part: 'x' }, { coef: 2, part: '' }]), '3x + 2');
    assert.equal(ecrireSomme([{ coef: -3, part: 'x' }, { coef: 2, part: '' }]),
        `${MOINS}3x + 2`);
    // Un terme nul disparaît, et une somme entièrement nulle vaut 0.
    assert.equal(ecrireSomme([{ coef: 0, part: 'x' }, { coef: 5, part: '' }]), '5');
    assert.equal(ecrireSomme([{ coef: 0, part: 'x' }]), '0');
});

test('LA MÊME LETTRE DEUX FOIS DONNE UN CARRÉ, pas un double', () => {
    // x × x = x², mais x + x = 2x. C'est LA confusion du chapitre.
    assert.equal(partLitterale(['x', 'x']), 'x²');
    assert.equal(partLitterale(['x', 'x', 'x']), 'x³');
    assert.equal(partLitterale(['b', 'a']), 'ab', 'les lettres se rangent dans l\'ordre');
    assert.equal(partLitterale(['x']), 'x');
});

// --- La réduction ------------------------------------------------------------

test('ON NE REGROUPE QUE CE QUI PORTE LA MÊME PARTIE LITTÉRALE', () => {
    // C'est la seule règle du chapitre, et elle explique à elle seule toutes
    // les fautes : x et x² ne se regroupent pas, x et y non plus, x et un
    // nombre non plus.
    assert.deepEqual(reduire([{ coef: 2, part: 'x' }, { coef: 3, part: 'x' }]),
        [{ part: 'x', coef: 5 }]);
    assert.deepEqual(reduire([{ coef: 2, part: 'x' }, { coef: 3, part: 'x²' }]),
        [{ part: 'x', coef: 2 }, { part: 'x²', coef: 3 }]);
    assert.deepEqual(reduire([{ coef: 2, part: 'x' }, { coef: 3, part: '' }]),
        [{ part: 'x', coef: 2 }, { part: '', coef: 3 }]);
    // Les termes qui s'annulent disparaissent.
    assert.deepEqual(reduire([{ coef: 2, part: 'x' }, { coef: -2, part: 'x' }, { coef: 5, part: '' }]),
        [{ part: '', coef: 5 }]);
    // Et les lettres passent AVANT les nombres, comme au cahier.
    assert.deepEqual(reduire([{ coef: 5, part: '' }, { coef: 2, part: 'x' }])
        .map(t => t.part), ['x', '']);
});

// --- Les treize marches ------------------------------------------------------

test('CHAQUE MARCHE POSE LA QUESTION QU\'ELLE ANNONCE', () => {
    const attendu = {
        'nombre-lettre': /^\d × [a-z]$/,
        'lettre-nombre': /^[a-z] × \d$/,
        'facteur-un': /^(1 × [a-z]|[a-z] × 1)$/,
        'deux-lettres': /^[a-z] × [a-z]$/,
        'meme-lettre': /^([a-z]) × \1$/,
        'trois-facteurs': /^\d × [a-z] × \d$/,
        'facteur-carre': /^\d × ([a-z]) × \1$/,
        'nombre-deux-lettres': /^\d × [a-z] × \d × [a-z]$/,
        'somme-lettres': /^([a-z])( \+ \1)+$/,
        'somme-termes': /^\d[a-z] \+ \d[a-z]$/,
        'difference-termes': new RegExp(`^\\d[a-z] ${MOINS} \\d[a-z]$`)
    };
    ETAPES.forEach(e => {
        if (!attendu[e.id]) return;
        for (let i = 0; i < 8; i++) {
            const q = question(e, makeRng(`forme-${e.id}-${i}`));
            assert.match(q.enonce, attendu[e.id], `${e.id} : « ${q.enonce} »`);
        }
    });
});

test('LES RÉPONSES SONT JUSTES — vérifiées par le calcul, pas par la forme', () => {
    // On refait le calcul indépendamment de l'énoncé : c'est le seul moyen de
    // vérifier une réponse plutôt que de recopier la façon dont on l'a écrite.
    const cas = {
        'nombre-lettre': (q) => {
            const [a, l] = q.enonce.split(' × ');
            return `${a}${l}`;
        },
        'lettre-nombre': (q) => {
            const [l, a] = q.enonce.split(' × ');
            return `${a}${l}`;
        },
        'trois-facteurs': (q) => {
            const [a, l, b] = q.enonce.split(' × ');
            return `${Number(a) * Number(b)}${l}`;
        },
        'somme-termes': (q) => {
            const [g, d] = q.enonce.split(' + ');
            const l = g.slice(-1);
            return `${Number(g.slice(0, -1)) + Number(d.slice(0, -1))}${l}`;
        }
    };
    Object.entries(cas).forEach(([id, refaire]) => {
        const e = ETAPES.find(x => x.id === id);
        for (let i = 0; i < 10; i++) {
            const q = question(e, makeRng(`juste-${id}-${i}`));
            assert.equal(q.reponse, refaire(q), `${id} : « ${q.enonce} »`);
        }
    });
});

test('UNE EXPRESSION PEUT ÊTRE DÉJÀ RÉDUITE, et c\'est une vraie question', () => {
    // « 2x + 3 » ne se réduit pas : un nombre de x et un nombre tout court ne
    // se rangent pas dans le même sac. C'est la faute la plus tenace du
    // chapitre, et le seul moyen de la travailler est de poser la question dont
    // la réponse est « on ne peut pas aller plus loin ».
    const e = ETAPES.find(x => x.id === 'melange');
    let vues = 0;
    for (let i = 0; i < 40; i++) {
        const q = question(e, makeRng(`irr-${i}`));
        if (!q.dejaReduite) continue;
        vues++;
        assert.equal(q.reponse, q.enonce, 'l\'expression a été changée alors qu\'elle est réduite');
        assert.match(q.pourquoi, /DÉJÀ réduite/);
    }
    assert.ok(vues >= 5, `seulement ${vues} expressions déjà réduites sur 40 tirages`);
});

// --- Les distracteurs --------------------------------------------------------

test('CHAQUE MAUVAISE RÉPONSE DIT L\'ERREUR QU\'ELLE PIÈGE', () => {
    // « Faux » n'a jamais rien appris à personne. Chaque distracteur écrit à la
    // main porte son « pourquoi », et aucun ne vaut la bonne réponse.
    ETAPES.forEach(e => {
        for (let i = 0; i < 5; i++) {
            const q = question(e, makeRng(`pieges-${e.id}-${i}`));
            assert.ok(q.pieges.length >= 1, `${e.id} : aucun piège`);
            q.pieges.forEach(p => {
                assert.ok(p.why && p.why.length > 10, `${e.id} : piège muet (${p.value})`);
                assert.notEqual(String(p.value), String(q.reponse),
                    `${e.id} : un piège vaut la bonne réponse`);
            });
        }
    });
});

test('LE PIÈGE « x + x = x² » EST POSÉ, parce que c\'est LA faute', () => {
    const e = ETAPES.find(x => x.id === 'somme-lettres');
    let vu = false;
    for (let i = 0; i < 20 && !vu; i++) {
        const q = question(e, makeRng('carre-' + i));
        if (q.enonce.split(' + ').length !== 2) continue;
        const l = q.enonce[0];
        vu = q.pieges.some(p => p.value === `${l}²`);
    }
    assert.ok(vu, 'le carré n\'est jamais proposé comme piège d\'une somme');
});

// --- Le générateur -----------------------------------------------------------

test('deux questions par marche, et les treize dans l\'ordre', () => {
    const marches = [];
    for (let i = 0; i < ETAPES.length * 2; i++) marches.push(item({}, i).meta.etape);
    ETAPES.forEach((e, k) => {
        assert.equal(marches[k * 2], e.id, `question ${k * 2} hors marche`);
        assert.equal(marches[k * 2 + 1], e.id, `question ${k * 2 + 1} hors marche`);
    });
});

test('un item porte tout ce qu\'il faut pour jouer, corriger et imprimer', () => {
    for (let i = 0; i < 26; i++) {
        const it = item({}, i);
        assert.equal(it.skillId, 'num.litteral.reduire');
        assert.equal(it.answerKind, 'choice');
        assert.ok(it.choices.length >= 3, 'trop peu de propositions');
        assert.equal(it.choices.filter(c => c.correct).length, 1, 'zéro ou deux bonnes réponses');
        assert.equal(it.choices.find(c => c.correct).value, it.answer);
        assert.ok(it.prompt.papier.includes('='), 'la version papier n\'attend pas de réponse');
        assert.ok(it.explanation.length > 20, 'corrigé muet');
        assert.ok(it.hints.length >= 2, 'pas d\'indice');
        // Deux propositions identiques rendraient la question insoluble.
        const vues = it.choices.map(c => String(c.value));
        assert.equal(new Set(vues).size, vues.length, 'deux propositions identiques');
    }
});

test('isoler un temps, ou une marche, ne sort jamais de ce qu\'on a demandé', () => {
    ['A', 'B', 'C'].forEach(temps => {
        const attendues = new Set(ETAPES.filter(e => e.temps === temps).map(e => e.id));
        for (let i = 0; i < 12; i++) {
            assert.ok(attendues.has(item({ etape: temps }, i).meta.etape), `temps ${temps}`);
        }
    });
    for (let i = 0; i < 6; i++) {
        assert.equal(item({ etape: 'meme-lettre' }, i).meta.etape, 'meme-lettre');
    }
});

test('la même graine rend la même question', () => {
    // Le rejeu à l'identique du carnet d'erreurs en dépend.
    const a = G.generate({}, { rng: makeRng('rejeu'), index: 7 });
    const b = G.generate({}, { rng: makeRng('rejeu'), index: 7 });
    assert.equal(a.prompt.text, b.prompt.text);
    assert.equal(a.answer, b.answer);
});
