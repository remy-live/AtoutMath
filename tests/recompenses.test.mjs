// Les jeux de récompense : ce qui ouvre un jeu, et ce qui le laisse fermé.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    etatRecompenses, direRecompense, seuilDe, estRecompense, SEUIL_DEFAUT,
    statutEtape, etapesMontrees, cadeauCache, routeOuverte, prochaineObligatoire
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

// --- CE QU'ON MONTRE DU PARCOURS ---------------------------------------------

test('UN JEU NON GAGNÉ N\'EST PAS SUR LA CARTE', () => {
    // Rémy : « les jeux récompenses sur le parcours apparaissent déjà. Alors
    // que ce serait bien qu'ils apparaissent après. » Un cadenas posé dès le
    // premier jour annonce la récompense et la refuse dans le même geste.
    const p = parcours(0.75);
    const rien = etatRecompenses(p, { completed: [] });
    const opts = { recompenses: new Map(rien.jeux.map(j => [j.stepId, j])) };
    const montres = etapesMontrees(p.steps, opts);
    assert.deepEqual(montres.map(v => v.step.stepId), ['e1', 'e2', 'e3', 'e4']);
    assert.equal(cadeauCache(jeu('j1'), opts), true);

    // Et le jour où il est gagné, il est là.
    const gagne = etatRecompenses(p, {
        completed: ['e1', 'e2', 'e3', 'e4'],
        resultats: resultats({ e1: [10, 10], e2: [10, 10], e3: [10, 10], e4: [10, 10] })
    });
    const ouvert = { recompenses: new Map(gagne.jeux.map(j => [j.stepId, j])) };
    assert.equal(etapesMontrees(p.steps, ouvert).length, 5);
    assert.equal(statutEtape(jeu('j1'), 4, ouvert), 'cadeau');
});

test('LE PROFESSEUR VOIT LA SÉANCE QU\'IL A COMPOSÉE, jeux compris', () => {
    // La surprise est pour l'élève. Celui qui a posé le jeu doit le relire.
    const p = parcours(0.75);
    assert.equal(etapesMontrees(p.steps, { montrerCadeaux: true }).length, 5);
    assert.equal(statutEtape(jeu('j1'), 4, { montrerCadeaux: true, allUnlocked: true }), 'cadeau');
});

test('LES NUMÉROS COMPTENT LE TRAVAIL, pas les jeux', () => {
    // Un jeu au milieu donnerait « 1, 2, 4 » sur une carte de trois exercices,
    // et l'élève chercherait la troisième.
    const steps = [exo('e1'), jeu('j1'), exo('e2'), exo('e3')];
    const montres = etapesMontrees(steps, {});
    assert.deepEqual(montres.map(v => v.numero), [1, 2, 3]);
    // L'index d'origine, lui, ne bouge pas : c'est lui qui lance l'étape.
    assert.deepEqual(montres.map(v => v.i), [0, 2, 3]);
});

test('L\'ORDRE LIBRE OUVRE TOUT CE QUI N\'EST PAS FAIT', () => {
    // Rémy : « on peut appuyer sur le premier élément, ou sur les éléments
    // disponibles s'il n'y a pas d'obligation d'ordre. »
    const steps = [exo('e1'), exo('e2'), exo('e3')];
    const impose = { doneIds: new Set(['e1']), currentIndex: 1 };
    assert.equal(statutEtape(steps[0], 0, impose), 'done');
    assert.equal(statutEtape(steps[1], 1, impose), 'current');
    assert.equal(statutEtape(steps[2], 2, impose), 'locked');

    const libre = { ...impose, ordreLibre: true };
    assert.equal(statutEtape(steps[2], 2, libre), 'open');
    // Ce qui est fait reste fait : l'ordre libre n'efface rien.
    assert.equal(statutEtape(steps[0], 0, libre), 'done');
});

// --- Les étapes non obligatoires --------------------------------------------
//
// Rémy : « ce serait cool de pouvoir sélectionner plusieurs exercices pour les
// rendre non obligatoires ou en récompense. Par contre c'est chronologique. Si
// les 2 premiers sont obligatoires et le 3 et 4 non obligatoires, il faut
// réussir le 1 et 2 pour ouvrir le 3 et 4 et pouvoir faire le 5. »
//
// C'est son exemple, mot pour mot, qui sert de test.

const libreEtape = (id) => exo(id, { facultatif: true });

test('L\'EXEMPLE DE RÉMY : 1 et 2 obligatoires, 3 et 4 non, et le 5 s\'ouvre avec eux', () => {
    const steps = [exo('e1'), exo('e2'), libreEtape('e3'), libreEtape('e4'), exo('e5')];

    // Au départ, seule la première est ouverte.
    const rien = new Set();
    assert.deepEqual(steps.map((s, i) => routeOuverte(steps, i, rien)),
        [true, false, false, false, false]);

    // Le 1 fait : le 2 s'ouvre, le reste attend encore le 2.
    const un = new Set(['e1']);
    assert.deepEqual(steps.map((s, i) => routeOuverte(steps, i, un)),
        [true, true, false, false, false]);

    // LE 1 ET LE 2 FAITS : le 3, le 4 ET le 5 s'ouvrent en même temps.
    const deux = new Set(['e1', 'e2']);
    assert.deepEqual(steps.map((s, i) => routeOuverte(steps, i, deux)),
        [true, true, true, true, true]);

    // Et le statut vu par la carte dit la même chose, sans ordre libre.
    const vue = { doneIds: deux, currentIndex: 2, steps };
    assert.equal(statutEtape(steps[3], 3, vue), 'open');
    assert.equal(statutEtape(steps[4], 4, vue), 'open');
});

test('UNE NON OBLIGATOIRE NE RETIENT PAS LE CURSEUR', () => {
    // Sinon le parcours indiquerait éternellement « prochaine étape » sur une
    // étape que l'élève a le droit de ne pas faire.
    const steps = [exo('e1'), libreEtape('e2'), exo('e3')];
    assert.equal(prochaineObligatoire(steps, new Set()), 0);
    assert.equal(prochaineObligatoire(steps, new Set(['e1'])), 2);
    assert.equal(prochaineObligatoire(steps, new Set(['e1', 'e3'])), -1,
        'le parcours est fini même si la non obligatoire est restée de côté');
    // Un jeu de récompense non plus ne retient rien.
    const avecJeu = [exo('a1'), jeu('j1'), exo('a2')];
    assert.equal(prochaineObligatoire(avecJeu, new Set(['a1'])), 2);
});

test('UNE NON OBLIGATOIRE SAUTÉE NE FERME PAS LA RÉCOMPENSE, et ne coûte rien', () => {
    // Elle resterait sinon « restante » à jamais : le travail ne serait jamais
    // fini, le cadeau jamais ouvert, et son zéro tirerait la moyenne.
    const p = {
        bonusSeuil: 0.75,
        steps: [exo('e1'), libreEtape('e2'), jeu('j1')]
    };
    const saute = etatRecompenses(p, {
        completed: ['e1'],
        resultats: resultats({ e1: [10, 10] })
    });
    assert.equal(saute.travailFait, true);
    assert.equal(saute.jeux[0].ouvert, true);
    assert.equal(saute.tauxGlobal, 1);

    // FAITE, EN REVANCHE, ELLE COMPTE COMME LES AUTRES : c'est du vrai travail.
    const faite = etatRecompenses(p, {
        completed: ['e1', 'e2'],
        resultats: resultats({ e1: [10, 10], e2: [4, 10] })
    });
    assert.equal(faite.tauxGlobal, 14 / 20);
    assert.equal(faite.jeux[0].ouvert, false, '70 % : sous le seuil de 75 %');
});

test('SANS LA LISTE DES ÉTAPES, la règle reste celle d\'avant', () => {
    // `statutEtape` est appelé d'endroits qui ne passent que le rang. La
    // chronologie stricte est le bon repli : c'est la même règle quand rien
    // n'est facultatif.
    const steps = [exo('e1'), exo('e2'), exo('e3')];
    assert.equal(statutEtape(steps[2], 2, { doneIds: new Set(['e1']), currentIndex: 1 }), 'locked');
});
