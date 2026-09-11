// La durée d'un parcours : une fourchette quand on estime, une mesure quand
// on en a une. Jamais un chiffre unique qui aurait l'air d'être vrai.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    FOURCHETTES, MANCHE_DE_JEU, MINIMUM_MESURES,
    mesuresParExercice, estimerEtape, estimerParcours,
    direDuree, tensionDuree, PHRASES_TENSION
} from '../js/core/dureeParcours.js';

const tentative = (exerciseId, msElapsed) => ({ exerciseId, msElapsed });

test('un réflexe se répond plus vite qu\'une notion — c\'est le but d\'un réflexe', () => {
    const r = estimerEtape({ nature: 'reflexe', questions: 10 });
    const n = estimerEtape({ nature: 'notion', questions: 10 });
    assert.ok(r.max < n.min, `${r.max} s de réflexes devrait rester sous ${n.min} s de notions`);
    assert.equal(r.min, FOURCHETTES.reflexe[0] * 10);
    assert.equal(n.max, FOURCHETTES.notion[1] * 10);
});

test('un jeu ne se compte pas en questions : on y joue une manche', () => {
    const court = estimerEtape({ nature: 'jeu', questions: 3 });
    const long = estimerEtape({ nature: 'jeu', questions: 40 });
    assert.deepEqual([court.min, court.max], MANCHE_DE_JEU);
    assert.deepEqual([long.min, long.max], MANCHE_DE_JEU, 'le nombre de questions ne change rien');
});

test('une nature inconnue est traitée comme une notion, pas comme une erreur', () => {
    const inconnue = estimerEtape({ nature: 'zzz', questions: 4 });
    assert.deepEqual(inconnue, estimerEtape({ nature: 'notion', questions: 4 }));
});

test('la fourchette est toujours une fourchette : le bas sous le haut', () => {
    for (const nature of ['reflexe', 'notion', 'jeu', undefined]) {
        for (const questions of [1, 5, 20]) {
            const d = estimerEtape({ nature, questions });
            assert.ok(d.min < d.max, `${nature} × ${questions}`);
            assert.ok(d.min > 0);
        }
    }
});

// --- Ce que font vraiment les élèves ------------------------------------------

test('en dessous de six réponses, on ne mesure rien : c\'est un échantillon', () => {
    const peu = Array.from({ length: MINIMUM_MESURES - 1 }, () => tentative('a', 20000));
    assert.deepEqual(mesuresParExercice(peu), {});
});

test('la médiane, et non la moyenne : une pause ne doit pas fausser tout le monde', () => {
    const liste = [
        ...Array.from({ length: 6 }, () => tentative('a', 10000)),
        tentative('a', 240000)               // l'élève est parti se moucher
    ];
    const m = mesuresParExercice(liste);
    assert.equal(m.a.medianeMs, 10000, 'la moyenne aurait donné 43 s');
    assert.equal(m.a.nombre, 7);
});

test('les temps aberrants sont écartés avant tout calcul', () => {
    const liste = [
        ...Array.from({ length: 6 }, () => tentative('a', 12000)),
        tentative('a', 60 * 60 * 1000),      // une heure sur une question : non
        tentative('a', 0),
        tentative('a', -5)
    ];
    assert.equal(mesuresParExercice(liste).a.nombre, 6);
});

test('une mesure remplace l\'estimation, et elle reste une fourchette', () => {
    const mesure = { medianeMs: 20000, nombre: 30 };
    const d = estimerEtape({ nature: 'reflexe', questions: 10 }, mesure);
    assert.equal(d.mesure, true);
    assert.ok(d.min < d.max);
    // 20 s par question, dix questions : autour de 200 s, et loin de la
    // fourchette théorique du réflexe (80 à 180 s).
    assert.ok(d.max > FOURCHETTES.reflexe[1] * 10, 'la mesure doit primer sur le barème');
});

test('le parcours additionne, et dit combien d\'étapes sont mesurées', () => {
    const etapes = [
        { exerciceId: 'a', nature: 'reflexe', questions: 10 },
        { exerciceId: 'b', nature: 'notion', questions: 5 },
        { exerciceId: 'c', nature: 'jeu', questions: 1 }
    ];
    const mesures = { a: { medianeMs: 12000, nombre: 40 } };
    const p = estimerParcours(etapes, mesures);
    assert.equal(p.total, 3);
    assert.equal(p.mesurees, 1);
    assert.ok(p.min < p.max);
    // La somme, et rien d'autre.
    const somme = etapes.reduce((s, e) => s + estimerEtape(e, mesures[e.exerciceId]).min, 0);
    assert.equal(p.min, somme);
});

test('un parcours vide ne dure rien et ne plante pas', () => {
    assert.deepEqual(estimerParcours([]), { min: 0, max: 0, mesurees: 0, total: 0 });
    assert.deepEqual(estimerParcours(null), { min: 0, max: 0, mesurees: 0, total: 0 });
    assert.equal(direDuree(0, 0), '');
});

// --- Le dire ------------------------------------------------------------------

test('la durée se dit en français, et s\'arrondit sans faire semblant', () => {
    assert.equal(direDuree(300, 480), '5 à 8 min');
    assert.equal(direDuree(1500, 2400), '25 à 40 min');
    assert.equal(direDuree(4200, 5400), '1 h 10 à 1 h 30');
    // Deux bouts qui s'arrondissent pareil : un seul chiffre suffit.
    assert.equal(direDuree(1500, 1560), '25 min');
});

test('le verdict se prend sur le HAUT de la fourchette', () => {
    // Un parcours qui « tient peut-être » ne tient pas.
    assert.equal(tensionDuree(20 * 60), 'courte');
    assert.equal(tensionDuree(45 * 60), 'seance');
    assert.equal(tensionDuree(70 * 60), 'longue');
    Object.values(PHRASES_TENSION).forEach(p => assert.ok(p.length > 15));
});
