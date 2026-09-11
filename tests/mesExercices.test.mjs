// Les exercices que l'élève se donne à lui-même.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    LIMITES, LIMITE_DEFAUT, politiquePerso, normaliserLimite, decrireLimite,
    creerExercicePerso, ajouter, retirer, noterResultat, enEtape, enParcours,
    meriteRecompense, parcoursRecompense, SEUIL_RECOMPENSE
} from '../js/core/mesExercices.js';

const entree = (limite) => creerExercicePerso({ exerciseId: 'calc-addition', titre: 'Additions', limite });

test('une limite se lit, se borne, et se dit en français', () => {
    assert.deepEqual(normaliserLimite({ type: 'questions', valeur: 10 }), { type: 'questions', valeur: 10 });
    assert.deepEqual(normaliserLimite({ type: 'temps', valeur: 5 }), { type: 'temps', valeur: 5 });
    // Ce qui n'a pas de sens retombe sur le réglage par défaut.
    assert.deepEqual(normaliserLimite(null), LIMITE_DEFAUT);
    assert.deepEqual(normaliserLimite({ type: 'questions', valeur: -3 }), LIMITE_DEFAUT);
    assert.deepEqual(normaliserLimite({ type: 'questions', valeur: 'douze' }), LIMITE_DEFAUT);
    // Et ce qui est excessif se borne : trois cents questions ne sont pas un
    // entraînement.
    assert.equal(normaliserLimite({ type: 'questions', valeur: 300 }).valeur, 60);

    assert.equal(decrireLimite({ type: 'questions', valeur: 1 }), '1 question');
    assert.equal(decrireLimite({ type: 'questions', valeur: 10 }), '10 questions');
    assert.equal(decrireLimite({ type: 'temps', valeur: 1 }), '1 minute');
    assert.equal(decrireLimite({ type: 'temps', valeur: 5 }), '5 minutes');
});

test('les bornes proposées existent et sont croissantes', () => {
    [LIMITES.questions, LIMITES.minutes].forEach(liste => {
        assert.ok(liste.length >= 3);
        liste.forEach((v, i) => { if (i) assert.ok(v > liste[i - 1]); });
    });
});

test('créer une entrée exige un exercice', () => {
    assert.equal(creerExercicePerso({}), null);
    assert.equal(creerExercicePerso(), null);
    const e = entree({ type: 'questions', valeur: 15 });
    assert.equal(e.exerciseId, 'calc-addition');
    assert.equal(e.limite.valeur, 15);
    assert.equal(e.fois, 0);
    assert.equal(e.meilleur, null);
    assert.ok(e.id.startsWith('perso_'));
});

test('le même exercice à la même limite ne s\'ajoute pas deux fois', () => {
    let liste = [];
    liste = ajouter(liste, entree({ type: 'questions', valeur: 10 }));
    liste = ajouter(liste, entree({ type: 'questions', valeur: 10 }));
    assert.equal(liste.length, 1);
    // Mais la même notion à une AUTRE limite est un autre entraînement.
    liste = ajouter(liste, entree({ type: 'temps', valeur: 5 }));
    assert.equal(liste.length, 2);
    liste = retirer(liste, liste[0].id);
    assert.equal(liste.length, 1);
    assert.equal(liste[0].limite.type, 'temps');
});

test('on garde le MEILLEUR résultat, pas le dernier', () => {
    let liste = ajouter([], entree({ type: 'questions', valeur: 10 }));
    const id = liste[0].id;
    liste = noterResultat(liste, id, 0.6);
    assert.equal(liste[0].meilleur, 60);
    assert.equal(liste[0].fois, 1);
    liste = noterResultat(liste, id, 0.9);
    assert.equal(liste[0].meilleur, 90);
    liste = noterResultat(liste, id, 0.2);
    assert.equal(liste[0].meilleur, 90, 'un mauvais jour n\'efface pas le bon');
    assert.equal(liste[0].fois, 3);
});

test('la limite en questions borne le nombre de questions', () => {
    const etape = enEtape(entree({ type: 'questions', valeur: 15 }));
    assert.equal(etape.nbItems, 15);
    assert.equal(etape.timeLimit, null);
    assert.equal(etape.exerciseId, 'calc-addition');
});

test('la limite en temps arme le chronomètre, en secondes', () => {
    const etape = enEtape(entree({ type: 'temps', valeur: 5 }));
    assert.equal(etape.timeLimit, 300);
    // Le nombre de questions ne borne plus rien, mais reste large : la séance
    // ne doit pas s'arrêter d'elle-même avant la fin du temps.
    assert.ok(etape.nbItems >= 20);
});

test('un exercice personnel devient un parcours d\'une seule étape, non noté', () => {
    const e = entree({ type: 'questions', valeur: 10 });
    const path = enParcours(e, { title: 'Additions' });
    assert.equal(path.steps.length, 1);
    assert.equal(path.name, 'Additions');
    assert.equal(path.personnel, true);
    assert.equal(path.policy.grading, null);
    assert.equal(path.policy.mode, 'entrainement');
    assert.equal(path.policy.hints, true);
    // Sans titre ni exercice connu, il reste nommé.
    const anonyme = enParcours(creerExercicePerso({ exerciseId: 'x' }));
    assert.ok(anonyme.name.length > 0);
});

test('la récompense se mérite : assez de questions, et assez de réussite', () => {
    assert.equal(meriteRecompense({ totalQuestions: 10, ratioPondere: 0.8 }), true);
    assert.equal(meriteRecompense({ totalQuestions: 10, ratioPondere: 0.5 }), false);
    // Deux questions réussies avant d'abandonner ne sont pas une séance.
    assert.equal(meriteRecompense({ totalQuestions: 2, ratioPondere: 1 }), false);
    assert.equal(meriteRecompense(null), false);
    // Sans ratio, on le calcule.
    assert.equal(meriteRecompense({ totalQuestions: 8, totalReussies: 7 }), true);
    assert.equal(meriteRecompense({ totalQuestions: 8, totalReussies: 4 }), false);
    assert.ok(SEUIL_RECOMPENSE > 0.5 && SEUIL_RECOMPENSE < 1);
});

test('la partie offerte est un jeu, chronométré, et une seule', () => {
    const path = parcoursRecompense('jeu-2048', 3);
    assert.equal(path.steps.length, 1);
    assert.equal(path.steps[0].timeLimit, 180);
    assert.equal(path.steps[0].bonus, true);
    assert.equal(path.personnel, true);
    // Une durée absurde se borne à au moins une minute.
    assert.equal(parcoursRecompense('jeu-2048', 0).steps[0].timeLimit, 60);
});

test('la politique personnelle aide et corrige, sans noter', () => {
    const p = politiquePerso();
    assert.equal(p.hints, true);
    assert.equal(p.showCorrection, true);
    assert.equal(p.grading, null);
});
