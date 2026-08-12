// Les jeux de récompense : ce qui ouvre un jeu, et ce qui le laisse fermé.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    etatRecompenses, direRecompense, seuilDe, estRecompense, SEUIL_DEFAUT
} from '../js/core/recompenses.js';

const exo = (id, opts = {}) => ({ stepId: id, exerciseId: 'x', nbItems: 10, ...opts });
const jeu = (id) => exo(id, { bonus: true });

/** Quatre exercices puis un jeu : l'exemple du professeur. */
const parcours = (seuil) => ({
    bonusSeuil: seuil,
    steps: [exo('e1'), exo('e2'), exo('e3'), exo('e4'), jeu('j1')]
});

// [bonnes réponses, questions posées] : c'est sur les questions POSÉES que se
// mesure le taux, jamais sur le seuil de validation de l'étape.
const resultats = (paires) => Object.fromEntries(
    Object.entries(paires).map(([id, [solved, questions]]) =>
        [id, { solved, questions, required: Math.ceil(questions / 2), passed: true }])
);

test('le jeu reste fermé tant que les exercices ne sont pas faits', () => {
    const e = etatRecompenses(parcours(0.75), { completed: ['e1', 'e2'] });
    assert.equal(e.jeux.length, 1);
    assert.equal(e.jeux[0].ouvert, false);
    assert.equal(e.jeux[0].raison, 'reste');
    assert.equal(e.jeux[0].restantes, 2);
    assert.match(direRecompense(e.jeux[0], e.seuil), /Encore 2 exercices/);
});

test('les quatre exercices bien réussis ouvrent le jeu', () => {
    const e = etatRecompenses(parcours(0.75), {
        completed: ['e1', 'e2', 'e3', 'e4'],
        resultats: resultats({ e1: [9, 10], e2: [8, 10], e3: [10, 10], e4: [7, 10] })
    });
    assert.equal(e.jeux[0].ouvert, true);
    // 34 bonnes sur 40 demandées, soit 85 % — au-dessus des 75 % exigés.
    assert.equal(e.jeux[0].reussies, 34);
    assert.equal(e.jeux[0].exigees, 40);
    assert.equal(e.toutOuvert, true);
});

test('les quatre exercices faits MAIS mal réussis laissent le jeu fermé', () => {
    const e = etatRecompenses(parcours(0.75), {
        completed: ['e1', 'e2', 'e3', 'e4'],
        resultats: resultats({ e1: [5, 10], e2: [6, 10], e3: [5, 10], e4: [6, 10] })
    });
    assert.equal(e.jeux[0].ouvert, false);
    assert.equal(e.jeux[0].raison, 'insuffisant');
    assert.equal(e.toutOuvert, false);
    // La phrase dit le seuil ET où en est l'élève : un verrou muet est une punition.
    const dit = direRecompense(e.jeux[0], e.seuil);
    assert.match(dit, /75 %/);
    assert.match(dit, /55 %/);
});

test('le professeur choisit le seuil', () => {
    const progres = {
        completed: ['e1', 'e2', 'e3', 'e4'],
        resultats: resultats({ e1: [5, 10], e2: [6, 10], e3: [5, 10], e4: [6, 10] })
    };
    assert.equal(etatRecompenses(parcours(0.5), progres).jeux[0].ouvert, true);
    assert.equal(etatRecompenses(parcours(0.9), progres).jeux[0].ouvert, false);
    // Un seuil absent, aberrant ou hors bornes retombe sur la valeur par défaut.
    assert.equal(seuilDe({}), SEUIL_DEFAUT);
    assert.equal(seuilDe({ bonusSeuil: 'oui' }), SEUIL_DEFAUT);
    assert.equal(seuilDe({ bonusSeuil: 3 }), 1);
    assert.equal(seuilDe({ bonusSeuil: -1 }), 0);
});

test('seuls les exercices PRÉCÉDENTS comptent pour un jeu placé au milieu', () => {
    const path = {
        bonusSeuil: 0.75,
        steps: [exo('e1'), exo('e2'), jeu('j1'), exo('e3'), exo('e4'), jeu('j2')]
    };
    const e = etatRecompenses(path, {
        completed: ['e1', 'e2'],
        resultats: resultats({ e1: [10, 10], e2: [10, 10] })
    });
    const [j1, j2] = e.jeux;
    assert.equal(j1.ouvert, true, 'les deux premiers suffisent au premier jeu');
    assert.equal(j1.exigees, 20);
    assert.equal(j2.ouvert, false, 'le second jeu attend encore deux exercices');
    assert.equal(j2.restantes, 2);
});

test('le parcours entier terminé ouvre TOUS les jeux, même ceux du milieu', () => {
    const path = {
        bonusSeuil: 0.75,
        steps: [exo('e1'), jeu('j1'), exo('e2'), jeu('j2'), exo('e3'), jeu('j3')]
    };
    const e = etatRecompenses(path, {
        completed: ['e1', 'e2', 'e3'],
        resultats: resultats({ e1: [9, 10], e2: [9, 10], e3: [9, 10] })
    });
    assert.equal(e.toutOuvert, true);
    assert.deepEqual(e.jeux.map(j => j.ouvert), [true, true, true]);
    assert.equal(e.jeux[2].raison, 'parcours');
    assert.match(direRecompense(e.jeux[2], e.seuil), /tous les jeux sont ouverts/i);
});

test('un jeu posé en tête de parcours n\'attend rien', () => {
    const e = etatRecompenses({ steps: [jeu('j0'), exo('e1')] }, {});
    assert.equal(e.jeux[0].ouvert, true);
    assert.equal(e.jeux[0].raison, 'libre');
});

test('un parcours sans jeu ne prétend rien ouvrir', () => {
    const e = etatRecompenses({ steps: [exo('e1'), exo('e2')] }, { completed: ['e1', 'e2'] });
    assert.deepEqual(e.jeux, []);
    assert.equal(e.toutOuvert, true, 'le travail est fait, même sans récompense à donner');
});

test('un parcours qui n\'est QUE des jeux n\'ouvre rien par le travail', () => {
    // Sans exercice, il n'y a pas de mérite à constater : les jeux sont libres
    // parce que rien ne les précède, pas parce que le parcours est réussi.
    const e = etatRecompenses({ steps: [jeu('j1'), jeu('j2')] }, {});
    assert.equal(e.toutOuvert, false);
    assert.deepEqual(e.jeux.map(j => j.raison), ['libre', 'libre']);
});

test('sans détail des résultats, une étape terminée vaut réussie', () => {
    // Les anciens parcours ne gardaient que la liste des étapes faites. Le
    // runner ne marque une étape terminée que si son seuil est atteint : la
    // récompense doit donc s'ouvrir quand même.
    const e = etatRecompenses(parcours(0.75), { completed: ['e1', 'e2', 'e3', 'e4'] });
    assert.equal(e.jeux[0].ouvert, true);
    // Ici le parcours entier est fait : c'est lui qui ouvre.
    assert.equal(e.jeux[0].raison, 'parcours');

    // Le mérite seul — jeu au milieu, travail restant après lui.
    const milieu = etatRecompenses(
        { bonusSeuil: 0.75, steps: [exo('e1'), exo('e2'), jeu('j1'), exo('e3')] },
        { completed: ['e1', 'e2'] });
    assert.equal(milieu.toutOuvert, false);
    assert.equal(milieu.jeux[0].ouvert, true);
    assert.equal(milieu.jeux[0].raison, 'merite');
});

test('estRecompense ne se laisse pas tromper', () => {
    assert.equal(estRecompense(jeu('j')), true);
    assert.equal(estRecompense(exo('e')), false);
    assert.equal(estRecompense(null), false);
    assert.equal(estRecompense(undefined), false);
});

test('le taux se mesure sur les questions POSÉES, pas sur le seuil', () => {
    // Une étape de 10 questions validée à partir de 5 bonnes réponses. L'élève
    // en réussit exactement 5 : l'étape est validée, mais il a raté la moitié
    // de la feuille — la récompense ne s'ouvre pas.
    const path = { bonusSeuil: 0.75, steps: [exo('e1'), jeu('j1')] };
    const e = etatRecompenses(path, {
        completed: ['e1'],
        resultats: { e1: { solved: 5, required: 5, questions: 10, passed: true } }
    });
    assert.equal(e.jeux[0].taux, 0.5);
    assert.equal(e.jeux[0].ouvert, false);
    assert.equal(e.jeux[0].raison, 'insuffisant');
});

test('sans « questions », le seuil sert de dénominateur par défaut', () => {
    // Les journaux d'avant ne notaient pas le nombre de questions posées : on
    // se rabat sur ce qu'ils ont, plutôt que de tout refuser.
    const path = { bonusSeuil: 0.75, steps: [exo('e1'), jeu('j1')] };
    const e = etatRecompenses(path, {
        completed: ['e1'],
        resultats: { e1: { solved: 8, required: 10, passed: true } }
    });
    assert.equal(e.jeux[0].taux, 0.8);
    assert.equal(e.jeux[0].ouvert, true);
});
