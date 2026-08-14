// Les codes de partage : ce qu'on écrit au tableau, et ce qui voyage par lien.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import '../js/core/activities/index.js';
import { Shortcodes } from '../js/core/shortcodes.js';
import { makeStep, makePath } from '../js/core/path.js';
import { defaultPolicy } from '../js/core/policy.js';

// --- Le code court ----------------------------------------------------------

import { codeCourt, normaliserCourt } from '../js/core/shortcodes.js';
import { exercices } from '../js/data/catalog.js';

test('un exercice pris tel quel tient en QUATRE caractères', () => {
    // « Fais l'exercice sur les relatifs ce soir » n'a pas besoin d'un
    // parcours. Le format complet coûtait 81 caractères de base64 : à recopier
    // sur un téléphone, c'est une faute de frappe garantie.
    const step = makeStep('num-relatifs-addition', {}, { nbItems: 10, threshold: 7 });
    const code = Shortcodes.encodePath(makePath('Relatifs', [step], defaultPolicy()));
    assert.equal(code.length, 4, `code trop long : ${code}`);
    const relu = Shortcodes.decodePath(code);
    assert.equal(relu.steps.length, 1);
    assert.equal(relu.steps[0].exerciseId, 'num-relatifs-addition');
    assert.equal(relu.steps[0].nbItems, 10);
});

test('AUCUN exercice du catalogue ne partage son code avec un autre', () => {
    // Le code est calculé à partir de l'identifiant : rien à tenir à jour,
    // mais tout à vérifier. Deux exercices sur le même code enverraient un
    // élève faire autre chose que ce que le professeur a demandé.
    const vus = new Map();
    const collisions = [];
    exercices.forEach(e => {
        const c = codeCourt(e.id);
        if (vus.has(c)) collisions.push(`${c} : ${vus.get(c)} et ${e.id}`);
        vus.set(c, e.id);
    });
    assert.deepEqual(collisions, []);
    assert.ok(exercices.length > 100, 'le catalogue doit être complet pour que ce test vaille');
});

test('le code se recopie à la main sans se tromper', () => {
    // On l'écrit au tableau et l'élève le tape : la casse, les tirets et les
    // confusions O/0, I/1, S/5 ne doivent pas le mettre en échec.
    const attendu = codeCourt('num-relatifs-addition');
    ['  ' + attendu + ' ', attendu.toLowerCase(), `REL-${attendu}`.slice(4)].forEach(saisie => {
        const relu = Shortcodes.decodePath(saisie);
        assert.ok(relu, `saisie refusée : « ${saisie} »`);
        assert.equal(relu.steps[0].exerciseId, 'num-relatifs-addition');
    });
    // L'alphabet lui-même écarte les caractères ambigus.
    assert.ok(!/[OIS01]/.test(attendu), `caractère ambigu dans ${attendu}`);
    assert.equal(normaliserCourt('k7-qp'), 'K7QP');
});

test('un parcours RÉGLÉ garde le format complet', () => {
    // Deux étapes, un nombre de questions choisi, une surcharge : tout cela
    // doit voyager, et ne tient évidemment pas en quatre caractères.
    const p = makePath('Chapitre', [
        makeStep('num-relatifs-addition', {}, { nbItems: 15 }),
        makeStep('num-relatifs-thermometre', { niveau: 'dur' }, { nbItems: 10 })
    ], defaultPolicy());
    const code = Shortcodes.encodePath(p);
    assert.ok(code.startsWith('M2-'), code);
    const relu = Shortcodes.decodePath(code);
    assert.equal(relu.steps.length, 2);
    assert.equal(relu.steps[0].nbItems, 15);
    assert.deepEqual(relu.steps[1].overrides, { niveau: 'dur' });
    // Et un exercice SEUL mais avec un réglage ne passe pas en court non plus.
    const regle = makePath('X', [makeStep('num-relatifs-addition', { niveau: 'dur' }, {})], defaultPolicy());
    assert.ok(Shortcodes.encodePath(regle).startsWith('M2-'));
});
