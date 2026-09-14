// La pendule : ce qui se teste sans écran, c'est la LECTURE elle-même —
// quelle heure la position des aiguilles désigne, comment on la dit, et ce
// que chaque niveau autorise. Le dessin du cadran, lui, se regarde.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { horlogeGenerator, NIVEAUX, cleHeure, direHeure, expliquerLecture } from '../js/core/generators/horloge.js';
import { makeRng } from '../js/core/ids.js';

const genere = (seed, params = {}, index = 0) =>
    horlogeGenerator.generate({ niveau: 'cinq', question: 'lire', ...params }, { rng: makeRng(seed), index });

test('la clé d\'heure est toujours à deux chiffres pour les minutes', () => {
    assert.equal(cleHeure(3, 5), '3:05');
    assert.equal(cleHeure(14, 0), '14:00');
    assert.equal(cleHeure(12, 59), '12:59');
});

test('l\'heure se dit à la française', () => {
    assert.equal(direHeure(3, 0), 'trois heures');
    assert.equal(direHeure(1, 0), 'une heure');
    assert.equal(direHeure(3, 15), 'trois heures et quart');
    assert.equal(direHeure(3, 30), 'trois heures et demie');
    assert.equal(direHeure(3, 45), 'quatre heures moins le quart');
    assert.equal(direHeure(11, 45), 'midi moins le quart');
    assert.equal(direHeure(12, 0), 'midi');
    assert.equal(direHeure(0, 0), 'minuit');
    assert.equal(direHeure(15, 30), 'trois heures et demie');
    assert.equal(direHeure(23, 45), 'minuit moins le quart');
});

test('l\'explication refait le raisonnement, elle n\'annonce pas le résultat', () => {
    const pile = expliquerLecture(4, 0, false);
    assert.match(pile, /pile sur le 4/);
    assert.match(pile, /sur le 12 : 0 minute/);

    const entre = expliquerLecture(4, 35, false);
    assert.match(entre, /entre le 4 et le 5/);
    assert.match(entre, /7 × 5 = 35/);

    const fine = expliquerLecture(4, 37, false);
    assert.match(fine, /35 \+ 2 = 37/);

    const apm = expliquerLecture(16, 20, true);
    assert.match(apm, /on ajoute 12/);
    assert.match(apm, /16 h 20/);
});

test('chaque niveau ne produit que les minutes qu\'il annonce', () => {
    const attendus = {
        heures: (m) => m === 0,
        demies: (m) => m === 0 || m === 30,
        quarts: (m) => [0, 15, 30, 45].includes(m),
        cinq: (m) => m % 5 === 0,
        minute: (m) => m >= 0 && m < 60,
        apresmidi: (m) => m % 5 === 0
    };
    for (const niveau of NIVEAUX) {
        for (let s = 0; s < 60; s++) {
            const it = genere('h' + s, { niveau: niveau.id });
            assert.ok(attendus[niveau.id](it.meta.m),
                `niveau ${niveau.id} : minutes ${it.meta.m} inattendues`);
            assert.ok(it.meta.h >= 1 && it.meta.h <= 23, 'heure hors bornes');
        }
    }
});

test('le niveau après-midi tire des heures de 13 à 23 et le dit dans la réponse', () => {
    for (let s = 0; s < 40; s++) {
        const it = genere('a' + s, { niveau: 'apresmidi', question: 'lire' });
        assert.ok(it.meta.h >= 13 && it.meta.h <= 23, `heure ${it.meta.h} hors de l'après-midi`);
        assert.equal(it.answer, cleHeure(it.meta.h, it.meta.m));
        assert.equal(it.meta.h12, it.meta.h - 12);
        assert.match(it.prompt.text, /après-midi/);
    }
});

test('PLACER attend les aiguilles du cadran de 12, jamais 15 h', () => {
    for (let s = 0; s < 40; s++) {
        const it = genere('p' + s, { niveau: 'apresmidi', question: 'placer' });
        const h = Number(it.answer.split(':')[0]);
        assert.ok(h >= 1 && h <= 12, `réponse ${it.answer} : le cadran ne va pas au-delà de 12`);
        assert.equal(h, it.meta.h12);
        assert.match(it.prompt.text, new RegExp(`${it.meta.h} h`), 'la consigne, elle, donne bien l\'heure en 24 h');
    }
});

test('le mode progressif monte les six niveaux et s\'y tient', () => {
    const vus = [];
    for (let i = 0; i < 12; i++) {
        const it = horlogeGenerator.generate({ niveau: 'progressif', question: 'lire' },
            { rng: makeRng('prog' + i), index: i });
        vus.push(it.meta.niveau);
    }
    assert.deepEqual(vus, [
        'heures', 'heures', 'demies', 'demies', 'quarts', 'quarts',
        'cinq', 'cinq', 'minute', 'minute', 'apresmidi', 'apresmidi'
    ]);
});

test('chaque item porte trois aides et une explication utilisables', () => {
    for (const niveau of NIVEAUX) {
        for (const question of ['lire', 'placer']) {
            const it = genere('aide', { niveau: niveau.id, question });
            assert.equal(it.hints.length, 3, `${niveau.id}/${question} : trois aides graduées`);
            it.hints.forEach(h => assert.ok(h && h.length > 15, 'une aide vide ne sert à rien'));
            assert.ok(it.explanation.length > 40, 'explication trop courte');
            assert.ok(!/undefined|NaN/.test(it.explanation + it.hints.join(' ')),
                `${niveau.id}/${question} : texte mal formé`);
        }
    }
});

test('les repères de minutes suivent le niveau, sauf réglage explicite', () => {
    assert.equal(genere('r1', { niveau: 'heures' }).meta.reperes, true);
    assert.equal(genere('r2', { niveau: 'minute' }).meta.reperes, false);
    assert.equal(genere('r3', { niveau: 'minute', reperes: 'toujours' }).meta.reperes, true);
    assert.equal(genere('r4', { niveau: 'heures', reperes: 'jamais' }).meta.reperes, false);
});

test('la compétence dépend de la question posée', () => {
    assert.equal(genere('s1', { question: 'lire' }).skillId, 'mes.heure.lire');
    assert.equal(genere('s2', { question: 'placer' }).skillId, 'mes.heure.placer');
});
