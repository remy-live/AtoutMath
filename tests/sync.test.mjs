import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { attempt, event } from './helpers.mjs';
import { Journal } from '../js/core/journal.js';
import { computeScore } from '../js/core/projections.js';
import { normalizePath, hydratePath, makeStep, makePath } from '../js/core/path.js';
import { Shortcodes } from '../js/core/shortcodes.js';
import { evaluationPolicy } from '../js/core/policy.js';

// Store en mémoire : le journal n'a besoin que de get/set.
function memStore() {
    const data = new Map();
    return {
        async get(k, fallback = null) { return data.has(k) ? data.get(k) : fallback; },
        async set(k, v) { data.set(k, v); }
    };
}

async function makeJournal(deviceId) {
    const j = new Journal();
    await j.load(memStore(), { profileId: 'p_test', deviceId });
    return j;
}

test('la fusion de journaux est une union par identifiant', async () => {
    const ecole = await makeJournal('d_ecole');
    const maison = await makeJournal('d_maison');

    const a1 = ecole.emit('attempt', { points: 10, correct: true });
    const a2 = maison.emit('attempt', { points: 7, correct: true });

    maison.merge([a1]);
    ecole.merge([a2]);

    assert.equal(ecole.all().length, 2);
    assert.equal(maison.all().length, 2);
    assert.equal(computeScore(ecole.all()), computeScore(maison.all()));
});

test('fusionner deux fois le même lot est sans effet', async () => {
    const j = await makeJournal('d1');
    const lot = [attempt({ points: 10 }), attempt({ points: 10 })];
    assert.equal(j.merge(lot), 2);
    assert.equal(j.merge(lot), 0);
    assert.equal(j.all().length, 2);
});

test('l\'ordre de fusion ne change pas le résultat', async () => {
    const lot = [attempt({ points: 5 }), attempt({ points: 8 }), event('bonus', { points: 3 })];
    const a = await makeJournal('d1');
    const b = await makeJournal('d2');
    a.merge(lot);
    b.merge([...lot].reverse());
    assert.equal(computeScore(a.all()), computeScore(b.all()));
    assert.equal(computeScore(a.all()), 16);
});

test('markSynced ne laisse que les événements réellement en attente', async () => {
    const j = await makeJournal('d1');
    const e1 = j.emit('attempt', { points: 1 });
    const e2 = j.emit('attempt', { points: 1 });
    assert.equal(j.pending().length, 2);
    j.markSynced([e1.id]);
    assert.deepEqual(j.pending().map(e => e.id), [e2.id]);
});

test('un ancien parcours (copies profondes) se convertit en références', () => {
    const legacy = [
        { id: 'calc-add', title: 'Additions', currentParams: { nbQuestions: 8, successThreshold: 6, tables: [7] } },
        { id: 'geom-grid', title: 'Grille', currentParams: { nbQuestions: 5 } }
    ];
    const path = normalizePath(legacy, 'Ancien parcours');

    assert.equal(path.version, 2);
    assert.equal(path.steps.length, 2);
    assert.equal(path.steps[0].exerciseId, 'calc-add');
    assert.equal(path.steps[0].nbItems, 8);
    assert.equal(path.steps[0].threshold, 6);
    // Les réglages de déroulement ne polluent plus les paramètres de contenu.
    assert.deepEqual(path.steps[0].overrides, { tables: [7] });
});

test('l\'hydratation fusionne catalogue et surcharges, et signale les manquants', () => {
    const path = makePath('Test', [
        makeStep('calc-mult-flash', { tables: [7] }, { nbItems: 5, threshold: 4 }),
        makeStep('exercice-supprime', {}, {})
    ]);
    const { steps, missing } = hydratePath(path);

    assert.equal(steps.length, 1);
    assert.deepEqual(missing, ['exercice-supprime']);
    assert.deepEqual(steps[0].params.tables, [7]);
    assert.equal(steps[0].title, 'Flash Mult');
});

test('un code de partage restitue le parcours, barème compris', () => {
    const original = makePath('Évaluation tables', [
        makeStep('calc-mult-flash', { tables: [7, 8] }, { nbItems: 12, threshold: 9, weight: 2 }),
        makeStep('calc-prio', {}, { nbItems: 5, threshold: 4 })
    ], evaluationPolicy());

    const code = Shortcodes.encodePath(original);
    const decoded = Shortcodes.decodePath(code);

    assert.equal(decoded.name, 'Évaluation tables');
    assert.equal(decoded.steps.length, 2);
    assert.deepEqual(decoded.steps[0].overrides.tables, [7, 8]);
    assert.equal(decoded.steps[0].nbItems, 12);
    assert.equal(decoded.steps[0].weight, 2);
    assert.equal(decoded.policy.mode, 'evaluation');
    assert.equal(decoded.policy.grading.scale, 20);
    assert.equal(decoded.policy.maxAttemptsPerItem, 1);
});

test('les anciens codes à deux lettres restent décodables', () => {
    // "AAF" = calc-add, 6 questions ; "ABEBC" = flash mult, 5 questions, tables 2 et 3
    const path = Shortcodes.decodePath('AAF-ABEBC');
    assert.equal(path.steps.length, 2);
    assert.equal(path.steps[0].exerciseId, 'calc-add');
    assert.equal(path.steps[0].nbItems, 6);
    assert.equal(path.steps[1].exerciseId, 'calc-mult-flash');
    assert.deepEqual(path.steps[1].overrides.tables, [2, 3]);
});

test('un code corrompu est refusé sans planter', () => {
    assert.equal(Shortcodes.decodePath('M2-@@@pas-du-base64@@@'), null);
    assert.equal(Shortcodes.decodePath(''), null);
});
