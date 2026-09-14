import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { gradeRun } from '../js/core/grading.js';
import { evaluationPolicy, defaultPolicy } from '../js/core/policy.js';

function run(attempts, policy = null, steps = []) {
    return { runId: 'r1', pathId: 'p1', pathName: 'Test', policy, attempts, steps };
}

function a(overrides = {}) {
    return {
        runId: 'r1', stepId: 's1', skillId: 'num.mult.table.7',
        itemSeed: overrides.itemSeed || 'seed_' + Math.random(),
        questionText: '7 × 8', expected: 56, given: '56',
        correct: true, attemptIndex: 0, msElapsed: 2000, hintsUsed: 0,
        ...overrides
    };
}

test('sans barème, aucune note n\'est produite', () => {
    const bilan = gradeRun(run([a(), a()]), defaultPolicy());
    assert.equal(bilan.note, null);
    assert.equal(bilan.ratio, 1);
});

test('règle firstTry : seules les réussites du premier coup comptent', () => {
    const bilan = gradeRun(run([
        a({ itemSeed: 'q1' }),
        a({ itemSeed: 'q2', correct: false }),
        a({ itemSeed: 'q2', correct: true, attemptIndex: 1 }),
        a({ itemSeed: 'q3' }),
        a({ itemSeed: 'q4', correct: false })
    ]), evaluationPolicy());

    assert.equal(bilan.totalQuestions, 4);   // q2 compte pour une seule question
    assert.equal(bilan.totalReussies, 3);    // q2 finit par être résolue
    assert.equal(bilan.premierEssai, 2);
    assert.equal(bilan.note, 10);            // 2/4 sur 20
});

test('règle ratio : une question résolue vaut plein point', () => {
    const policy = evaluationPolicy({ grading: { scale: 20, rule: 'ratio', arrondi: 0.5 } });
    const bilan = gradeRun(run([
        a({ itemSeed: 'q1' }),
        a({ itemSeed: 'q2', correct: false }),
        a({ itemSeed: 'q2', correct: true, attemptIndex: 1 })
    ]), policy);
    assert.equal(bilan.note, 20);
});

test('règle pondérée : essais et aides amputent le crédit', () => {
    const policy = evaluationPolicy({
        grading: { scale: 20, rule: 'ponderee', penalties: { hint: 0.25, retry: 0.5 }, arrondi: 0.5 }
    });
    const bilan = gradeRun(run([
        a({ itemSeed: 'q1' }),                                       // 1
        a({ itemSeed: 'q2', hintsUsed: 1 }),                         // 0.75
        a({ itemSeed: 'q3', correct: false }),
        a({ itemSeed: 'q3', correct: true, attemptIndex: 1 })        // 0.5
    ]), policy);
    // (1 + 0.75 + 0.5) / 3 = 0.75  ->  15/20
    assert.equal(bilan.note, 15);
});

test('les poids d\'étape modifient la note', () => {
    const policy = evaluationPolicy({ grading: { scale: 20, rule: 'firstTry', stepWeights: { s1: 3, s2: 1 } } });
    const bilan = gradeRun(run([
        a({ stepId: 's1', itemSeed: 'q1' }),
        a({ stepId: 's2', itemSeed: 'q2', correct: false })
    ]), policy);
    // s1 réussie (poids 3), s2 ratée (poids 1) -> 3/4 -> 15/20
    assert.equal(bilan.note, 15);
});

test('le bilan par compétence distingue les notions', () => {
    const bilan = gradeRun(run([
        a({ itemSeed: 'q1', skillId: 'num.mult.table.7' }),
        a({ itemSeed: 'q2', skillId: 'num.mult.table.7', correct: false }),
        a({ itemSeed: 'q3', skillId: 'num.prio' })
    ]), evaluationPolicy());

    const parSkill = Object.fromEntries(bilan.parCompetence.map(c => [c.skillId, c]));
    assert.equal(parSkill['num.mult.table.7'].taux, 0.5);
    assert.equal(parSkill['num.prio'].taux, 1);
    assert.equal(parSkill['num.prio'].niveau.key, 'E');
});

test('les questions ratées sortent avec leur diagnostic et leur graine', () => {
    const bilan = gradeRun(run([
        a({ itemSeed: 'q1', correct: false, given: '54', misconception: 'Tu as compté une fois de trop.' })
    ]), evaluationPolicy());

    assert.equal(bilan.aRetravailler.length, 1);
    assert.equal(bilan.aRetravailler[0].diagnostic, 'Tu as compté une fois de trop.');
    assert.equal(bilan.aRetravailler[0].seed, 'q1');   // rejeu exact possible
    assert.equal(bilan.aRetravailler[0].resolue, false);
});

test('un run sans réponse ne casse pas la notation', () => {
    const bilan = gradeRun(run([]), evaluationPolicy());
    assert.equal(bilan.totalQuestions, 0);
    assert.equal(bilan.note, 0);
});

test('le détail du calcul est cohérent avec la note affichée', () => {
    const policy = evaluationPolicy({
        grading: { scale: 20, rule: 'firstTry', arrondi: 0.5, stepWeights: { s1: 3, s2: 1 } }
    });
    const bilan = gradeRun(run([
        a({ stepId: 's1', itemSeed: 'q1' }),
        a({ stepId: 's1', itemSeed: 'q2', correct: false }),
        a({ stepId: 's2', itemSeed: 'q3' })
    ], policy), policy);

    const c = bilan.calcul;
    assert.ok(c, 'le détail du calcul doit être fourni quand il y a un barème');
    assert.equal(c.lignes.length, 2);
    assert.equal(c.totalPoids, 4);

    // s1 : 1 réussie sur 2 -> ratio 0,5 × poids 3 = 1,5 ; s2 : 1 × 1 = 1
    const s1 = c.lignes.find(l => l.stepId === 's1');
    assert.equal(s1.ratio, 0.5);
    assert.equal(s1.contribution, 1.5);
    assert.equal(c.sommeContributions, 2.5);
    assert.equal(c.ratioPondere, 0.63);      // 2,5 / 4 arrondi à 2 décimales
    assert.equal(c.pourcentage, 63);

    // Le calcul affiché doit redonner exactement la note du bilan.
    assert.equal(c.note, bilan.note);
    assert.equal(c.note, 12.5);              // 0,625 × 20 = 12,5
    assert.match(c.formuleArrondie, /12\.5\/20/);
});

test('le détail du calcul est masquable par le professeur', () => {
    const visible = gradeRun(run([a()]), evaluationPolicy());
    assert.equal(visible.afficherCalcul, true, 'affiché par défaut');

    const cache = gradeRun(run([a()]), evaluationPolicy({
        grading: { scale: 20, rule: 'firstTry', showCalculation: false }
    }));
    assert.equal(cache.afficherCalcul, false);
    assert.ok(cache.calcul, 'le calcul reste disponible pour le professeur');
});

test('sans barème, il n\'y a pas de calcul à montrer', () => {
    const bilan = gradeRun(run([a()]), defaultPolicy());
    assert.equal(bilan.calcul, null);
    assert.equal(bilan.afficherCalcul, false);
});

// --- Temps de séance --------------------------------------------------------
// `msElapsed` est un INTERVALLE : le temps écoulé depuis la tentative
// précédente. C'est ce qui rend l'addition légitime.

test('le temps de séance additionne les intervalles', () => {
    const bilan = gradeRun(run([
        a({ itemSeed: 'q1', msElapsed: 3000 }),
        a({ itemSeed: 'q2', msElapsed: 5000 }),
        a({ itemSeed: 'q3', msElapsed: 4000 })
    ]), defaultPolicy());
    assert.equal(bilan.tempsTotal, 12);
    assert.equal(bilan.tempsMoyenParQuestion, 4);
});

test('plusieurs essais sur la même question ne comptent pas plusieurs fois sa durée', () => {
    // L'élève cherche 4 s, se trompe, cherche 3 s de plus, trouve.
    // La question a duré 7 s — pas 4 + 7 = 11 s.
    const bilan = gradeRun(run([
        a({ itemSeed: 'q1', correct: false, msElapsed: 4000 }),
        a({ itemSeed: 'q1', correct: true, attemptIndex: 1, msElapsed: 3000 })
    ]), defaultPolicy());
    assert.equal(bilan.tempsTotal, 7);
});

test('une pause interminable ne gonfle pas le temps de séance', () => {
    // Onglet laissé ouvert une heure entre deux questions : la question est
    // plafonnée, sinon le bilan raconte les allées et venues de l'élève.
    const bilan = gradeRun(run([
        a({ itemSeed: 'q1', msElapsed: 6000 }),
        a({ itemSeed: 'q2', msElapsed: 60 * 60 * 1000 })
    ]), defaultPolicy());
    assert.equal(bilan.tempsTotal, 6 + 300);
});

test('un temps absent ou négatif ne casse pas le total', () => {
    const bilan = gradeRun(run([
        a({ itemSeed: 'q1', msElapsed: undefined }),
        a({ itemSeed: 'q2', msElapsed: -5000 }),
        a({ itemSeed: 'q3', msElapsed: 8000 })
    ]), defaultPolicy());
    assert.equal(bilan.tempsTotal, 8);
});
