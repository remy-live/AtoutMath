// LE MODE INTERROGATION — ce que le professeur règle, et ce que l'élève voit.
//
// Rémy : « en mode interrogation, il ne faut pas proposer à la fin de refaire
// l'exercice […] une option où l'ordinateur donne la note à la fin […] un mode
// où l'ordinateur montre la bonne réponse ou bien juste passe à la question
// suivante […] à la fin on a une option pour donner la note ou non. »
//
// Trois réglages indépendants, parce qu'ils répondent à trois questions
// différentes. Ces tests tiennent la différence.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
    MODES, CORRECTIONS, NOTES, evaluationPolicy, defaultPolicy, resolvePolicy,
    corrigeAvecRobot, noteVisible, noteCalculee
} from '../js/core/policy.js';
import { gradeRun, baremeParEtape, direBareme } from '../js/core/grading.js';

const run = (correctes, total, policy) => ({
    runId: 'r1', pathId: 'p1', pathName: 'Test', policy,
    steps: [{ stepId: 's1', title: 'A', weight: 1 }],
    attempts: Array.from({ length: total }, (_, i) => ({
        stepId: 's1', itemSeed: `q${i}`, questionText: `Q${i}`,
        correct: i < correctes, attemptIndex: 0, skillId: 'num.add.entiers'
    }))
});

// --- Ce qui se passe après une réponse --------------------------------------

test('l\'interrogation montre la bonne réponse par défaut', () => {
    const p = resolvePolicy(evaluationPolicy());
    assert.equal(p.correction, CORRECTIONS.REPONSE);
    assert.equal(p.showCorrection, true, 'il y a bien quelque chose à montrer');
    assert.equal(corrigeAvecRobot(p), false, 'mais pas d\'explication : on mesure');
});

test('« aucune » enchaîne sans rien dire — c\'est le devoir surveillé', () => {
    const p = resolvePolicy(evaluationPolicy({ correction: CORRECTIONS.AUCUNE }));
    assert.equal(p.showCorrection, false);
    assert.equal(corrigeAvecRobot(p), false);
});

test('« robot » ajoute l\'explication — c\'est le devoir formatif', () => {
    const p = resolvePolicy(evaluationPolicy({ correction: CORRECTIONS.ROBOT }));
    assert.equal(p.showCorrection, true);
    assert.equal(corrigeAvecRobot(p), true);
});

test('LE MOT COMMANDE LE BOOLÉEN, jamais l\'inverse', () => {
    // Un parcours qui porterait les deux et se contredirait : c'est
    // `correction` qui tranche, sinon deux réglages diraient le contraire.
    const p = resolvePolicy(evaluationPolicy({
        correction: CORRECTIONS.AUCUNE, showCorrection: true
    }));
    assert.equal(p.showCorrection, false);
});

test('un parcours enregistré AVANT ce réglage garde son comportement', () => {
    // Pas de `correction` : le booléen historique reste seul maître.
    const p = resolvePolicy({ mode: MODES.EVALUATION, correction: undefined, showCorrection: false });
    assert.equal(p.showCorrection, false);
});

// --- La note à la fin -------------------------------------------------------

test('par défaut la note est calculée ET montrée', () => {
    const p = evaluationPolicy();
    assert.equal(noteVisible(p), true);
    assert.equal(noteCalculee(p), true);
    const b = gradeRun(run(8, 10, p), p);
    assert.equal(b.sur, 20);
    assert.equal(b.note, 16);
    assert.equal(b.noteCachee, false);
});

test('« enregistrée » : la note existe pour le professeur, cachée à l\'élève', () => {
    const p = evaluationPolicy({ grading: { note: NOTES.ENREGISTREE } });
    assert.equal(noteVisible(p), false, 'l\'élève ne la voit pas');
    assert.equal(noteCalculee(p), true, 'mais elle est bien calculée');
    const b = gradeRun(run(8, 10, p), p);
    assert.equal(b.note, 16, 'le bilan de classe en a besoin');
    assert.equal(b.noteCachee, true);
    assert.equal(b.afficherCalcul, false, 'et son détail se tait aussi');
});

test('« aucune » : on ne note pas du tout', () => {
    const p = evaluationPolicy({ grading: { note: NOTES.AUCUNE } });
    assert.equal(noteVisible(p), false);
    assert.equal(noteCalculee(p), false);
    const b = gradeRun(run(8, 10, p), p);
    assert.equal(b.note, null);
    assert.equal(b.sur, null);
    // Le bilan par compétence, lui, reste entier : c'est tout l'intérêt.
    assert.ok(b.parCompetence.length > 0);
    assert.equal(b.totalReussies, 8);
});

test('un entraînement n\'a jamais de note', () => {
    const p = defaultPolicy();
    assert.equal(noteVisible(p), false);
    assert.equal(noteCalculee(p), false);
});

// --- On ne refait pas une interrogation -------------------------------------

test('l\'interrogation ne se rejoue pas', () => {
    assert.equal(resolvePolicy(evaluationPolicy()).allowRetryStep, false);
    assert.equal(resolvePolicy(defaultPolicy()).allowRetryStep, true);
});

// --- Le barème, annoncé avant de composer -----------------------------------

const etapes = [
    { stepId: 's1', title: 'Calcul', weight: 1 },
    { stepId: 's2', title: 'Géométrie', weight: 3 },
    { stepId: 's3', title: 'Jeu', weight: 1, bonus: true }
];

test('le barème se répartit selon le poids des étapes', () => {
    const b = baremeParEtape(etapes, evaluationPolicy());
    assert.equal(b.get('s1'), 5);       // 20 × 1/4
    assert.equal(b.get('s2'), 15);      // 20 × 3/4
    assert.equal(b.has('s3'), false, 'un jeu de récompense est hors barème');
    // La somme fait bien le total annoncé.
    assert.equal([...b.values()].reduce((s, x) => s + x, 0), 20);
});

test('pas de barème là où il n\'y a pas de note', () => {
    assert.equal(baremeParEtape(etapes, defaultPolicy()), null);
    assert.equal(baremeParEtape(etapes, evaluationPolicy({ grading: { note: NOTES.AUCUNE } })), null);
    assert.equal(baremeParEtape([], evaluationPolicy()), null);
    // Une note CACHÉE garde son barème : c'est le professeur qui le lit.
    assert.ok(baremeParEtape(etapes, evaluationPolicy({ grading: { note: NOTES.ENREGISTREE } })));
});

test('le barème s\'écrit en français, avec son pluriel', () => {
    assert.equal(direBareme(6.5), '6,5 pts');
    assert.equal(direBareme(1), '1 pt');
    assert.equal(direBareme(1.5), '1,5 pt');
    assert.equal(direBareme(2), '2 pts');
    assert.equal(direBareme(6.6666), '6,7 pts');
});
