import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { relatifsGenerator, NIVEAUX, ecrire, signe, expliquer, leurres, rang } from '../js/core/generators/relatifs.js';
import { makeRng } from '../js/core/ids.js';

function item(params = {}, index = 0, seed = 'g_relatifs') {
    return relatifsGenerator.generate(params, { index, rng: makeRng(`${seed}_${index}`) });
}

test('l\'écriture des relatifs utilise un vrai signe moins', () => {
    assert.equal(ecrire(4), '(+4)');
    assert.equal(ecrire(-7), '(−7)');
    assert.equal(signe(-3), '−3');
    assert.equal(signe(0), '+0');
});

test('la réponse est toujours la somme du départ et des déplacements', () => {
    for (let i = 0; i < 60; i++) {
        const it = item({ niveau: 'progressif' }, i);
        const { depart, deplacements, total } = it.meta;
        assert.equal(total, depart + deplacements.reduce((s, d) => s + d, 0),
            `item ${i} : ${depart} + ${deplacements}`);
        assert.equal(it.answer, total);
    }
});

test('chaque niveau garde son résultat dans la fenêtre de son modèle', () => {
    for (const n of NIVEAUX) {
        for (let i = 0; i < 25; i++) {
            const it = item({ niveau: n.id }, i);
            assert.ok(it.meta.total >= n.min && it.meta.total <= n.max,
                `${n.id} : ${it.meta.total} hors de [${n.min}, ${n.max}]`);
        }
    }
});

test('le premier niveau ne descend jamais sous zéro', () => {
    for (let i = 0; i < 40; i++) {
        const it = item({ niveau: 'ascenseur-positif' }, i);
        assert.ok(it.meta.depart >= 0, 'départ négatif');
        assert.ok(it.meta.total >= 0, 'arrivée négative');
        assert.ok(it.meta.deplacements.every(d => d > 0), 'descente au niveau 1');
    }
});

test('le mode progressif traverse les six étapes dans l\'ordre', () => {
    const vus = [];
    for (let i = 0; i < 12; i++) {
        const r = item({ niveau: 'progressif' }, i).meta.niveau;
        if (r !== vus[vus.length - 1]) vus.push(r);
    }
    assert.deepEqual(vus, NIVEAUX.map(n => n.id));
});

test('un déplacement n\'est jamais nul : il y a toujours quelque chose à faire', () => {
    for (let i = 0; i < 60; i++) {
        const it = item({ niveau: 'progressif' }, i);
        assert.ok(it.meta.deplacements.length >= 1);
        assert.ok(it.meta.deplacements.every(d => d !== 0));
    }
});

test('le niveau « chaîne » pose bien trois nombres', () => {
    for (let i = 0; i < 20; i++) {
        const it = item({ niveau: 'chaine' }, i);
        assert.ok(it.meta.deplacements.length >= 1 && it.meta.deplacements.length <= 2,
            'un départ plus un ou deux déplacements');
        assert.match(it.prompt.text, /\+/);
    }
});

test('en mode « à choisir », la bonne réponse est présente et unique', () => {
    for (let i = 0; i < 40; i++) {
        const it = item({ niveau: 'progressif', reponse: 'choix' }, i);
        assert.equal(it.answerKind, 'choice');
        const bons = it.choices.filter(c => c.correct);
        assert.equal(bons.length, 1);
        assert.equal(bons[0].value, it.meta.total);
        const valeurs = it.choices.map(c => c.value);
        assert.equal(new Set(valeurs).size, valeurs.length, 'des choix en double');
    }
});

test('chaque leurre porte une explication de l\'erreur', () => {
    const l = leurres(-7, [4], -3);
    assert.ok(l.length >= 3);
    assert.ok(l.every(x => x.value !== -3), 'un leurre vaut la bonne réponse');
    assert.ok(l.every(x => typeof x.why === 'string' && x.why.length > 10));
});

test('l\'explication refait le raisonnement du modèle', () => {
    assert.match(expliquer('ascenseur', 3, [-5], -2), /descend de 5/);
    assert.match(expliquer('ascenseur', 3, [-5], -2), /sous-sol/);
    assert.match(expliquer('thermometre', -3, [5], 2), /°C/);
    assert.match(expliquer('pastilles', 5, [-3], 2), /paires?/);
    assert.match(expliquer('ecriture', -7, [4], -3), /signes sont différents/);
    assert.match(expliquer('ecriture', -7, [-4], -11), /même signe/);
});

test('l\'explication des pastilles compte les bonnes paires', () => {
    assert.match(expliquer('pastilles', 5, [-3], 2), /3 paires/);
    assert.match(expliquer('pastilles', -2, [6], 4), /2 paires/);
    assert.match(expliquer('pastilles', 4, [-4], 0), /résultat est 0/);
});

test('trois aides graduées, dont la dernière est l\'explication', () => {
    for (let i = 0; i < 20; i++) {
        const it = item({ niveau: 'progressif' }, i);
        assert.equal(it.hints.length, 3);
        assert.equal(it.hints[2], it.explanation);
        assert.ok(it.hints.every(h => typeof h === 'string' && h.length > 12));
    }
});

test('même graine, même question', () => {
    const a = item({ niveau: 'thermometre' }, 3, 'z');
    const b = item({ niveau: 'thermometre' }, 3, 'z');
    assert.equal(a.prompt.text, b.prompt.text);
    assert.equal(a.answer, b.answer);
});

test('les nombres négatifs s\'écrivent avec un vrai signe moins, pas un trait d\'union', () => {
    for (let i = 0; i < 60; i++) {
        const it = item({ niveau: 'progressif' }, i);
        assert.ok(!/-\d/.test(it.prompt.text), `énoncé avec trait d'union : ${it.prompt.text}`);
        assert.ok(!/-\d/.test(it.explanation), `explication avec trait d'union : ${it.explanation}`);
        it.hints.forEach(h => assert.ok(!/-\d/.test(h), `aide avec trait d'union : ${h}`));
    }
});

test('les étiquettes des choix portent aussi le vrai signe moins', () => {
    for (let i = 0; i < 30; i++) {
        const it = item({ niveau: 'ecriture', reponse: 'choix' }, i);
        it.choices.forEach(c => {
            assert.ok(!/-\d/.test(c.label), `choix avec trait d'union : ${c.label}`);
            assert.equal(Number(String(c.label).replace('−', '-')), c.value);
        });
    }
});

test('les rangs se disent à la française', () => {
    assert.equal(rang(1), '1er');
    assert.equal(rang(2), '2e');
    assert.equal(rang(4), '4e');
});
