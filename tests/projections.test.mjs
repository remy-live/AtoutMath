import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { attempt, event } from './helpers.mjs';
import {
    computeScore, computeErrors, openErrors, computeRuns,
    computeAssignedPath, computeTime, computeBadges, countCorrect, computeExploits
} from '../js/core/projections.js';

test('le score est la somme des points portés par les événements', () => {
    const events = [
        attempt({ points: 10 }),
        attempt({ points: 7, correct: false }),
        event('bonus', { points: 150 })
    ];
    assert.equal(computeScore(events), 167);
});

test('une erreur reste ouverte tant qu\'elle n\'est pas réussie du premier coup', () => {
    const seed = 'abc';
    const events = [attempt({ itemSeed: seed, correct: false, given: '54' })];
    assert.equal(openErrors(events).length, 1);

    // Réussie, mais au deuxième essai : la notion n'est pas acquise pour autant.
    events.push(attempt({ itemSeed: seed, correct: true, attemptIndex: 1 }));
    assert.equal(openErrors(events).length, 1);

    // Réussie du premier coup plus tard : l'erreur se referme.
    events.push(attempt({ itemSeed: seed, correct: true, attemptIndex: 0 }));
    assert.equal(openErrors(events).length, 0);
});

test('une erreur refermée se rouvre si elle est refaite', () => {
    const seed = 'xyz';
    const events = [
        attempt({ itemSeed: seed, correct: false }),
        attempt({ itemSeed: seed, correct: true, attemptIndex: 0 }),
        attempt({ itemSeed: seed, correct: false })
    ];
    assert.equal(openErrors(events).length, 1);
    assert.equal(computeErrors(events)[0].count, 2);
});

test('une erreur écartée disparaît définitivement du carnet', () => {
    const events = [attempt({ itemSeed: 's1', correct: false })];
    const key = computeErrors(events)[0].key;
    events.push(event('error_dismissed', { errorKey: key }));
    assert.equal(computeErrors(events).length, 0);
});

test('les runs regroupent leurs tentatives et leurs étapes', () => {
    const events = [
        event('run_started', { runId: 'r1', pathId: 'p1', pathName: 'Test', mode: 'evaluation' }),
        attempt({ runId: 'r1' }),
        attempt({ runId: 'r1', correct: false }),
        event('step_completed', { runId: 'r1', stepId: 's1', passed: true }),
        event('run_finished', { runId: 'r1' })
    ];
    const [run] = computeRuns(events);
    assert.equal(run.runId, 'r1');
    assert.equal(run.mode, 'evaluation');
    assert.equal(run.attempts.length, 2);
    assert.equal(run.steps.length, 1);
    assert.ok(run.finishedAt);
});

test('le parcours assigné retenu est le dernier, avec ses étapes validées', () => {
    const events = [
        event('path_assigned', { pathId: 'p1', name: 'Ancien', steps: [{ stepId: 'a' }] }),
        event('path_assigned', { pathId: 'p2', name: 'Nouveau', steps: [{ stepId: 'b' }, { stepId: 'c' }] }),
        event('step_completed', { pathId: 'p2', stepId: 'b' }),
        event('step_completed', { pathId: 'p1', stepId: 'a' })
    ];
    const assigned = computeAssignedPath(events);
    assert.equal(assigned.pathId, 'p2');
    assert.deepEqual(assigned.completed, ['b']);
});

test('temps, badges et compteur de réussites', () => {
    const events = [
        event('time_spent', { exerciseId: 'calc-add', seconds: 90 }),
        event('time_spent', { exerciseId: 'calc-add', seconds: 30 }),
        event('badge_granted', { badgeId: 'first_step' }),
        event('badge_granted', { badgeId: 'first_step' }),
        attempt({ correct: true }),
        attempt({ correct: false })
    ];
    const time = computeTime(events);
    assert.equal(time.total, 120);
    assert.equal(time.perExercise['calc-add'], 120);
    assert.equal(Object.keys(computeBadges(events)).length, 1);
    assert.equal(countCorrect(events), 1);
});

// --- Exploits (médailles) ----------------------------------------------------

test('la série compte la plus longue suite de bonnes réponses', () => {
    const events = [
        attempt({ correct: true }), attempt({ correct: true }), attempt({ correct: true }),
        attempt({ correct: false }),
        attempt({ correct: true }), attempt({ correct: true })
    ];
    assert.equal(computeExploits(events).serie, 3);
});

test('seules les bonnes réponses rapides comptent comme éclairs', () => {
    const events = [
        attempt({ correct: true, msElapsed: 1200 }),
        attempt({ correct: true, msElapsed: 9000 }),
        attempt({ correct: false, msElapsed: 500 }),   // rapide mais faux
        attempt({ correct: true, msElapsed: 0 })       // durée inconnue
    ];
    assert.equal(computeExploits(events).rapides, 1);
});

test('les jours de pratique et les exercices essayés sont comptés sans doublon', () => {
    const jour = 24 * 3600 * 1000;
    const t0 = Date.parse('2026-03-02T09:00:00Z');
    const events = [
        attempt({ ts: t0, exerciseId: 'a' }),
        attempt({ ts: t0 + 3600e3, exerciseId: 'a' }),   // même jour, même exercice
        attempt({ ts: t0 + jour, exerciseId: 'b' })
    ];
    const x = computeExploits(events);
    assert.equal(x.jours, 2);
    assert.equal(x.exercices, 2);
});
