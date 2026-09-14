// « Il faut aussi pouvoir autoriser une zone de jeu si l'élève a fini le
// parcours. » — Rémy.
//
// LE LOGICIEL LE SAVAIT DÉJÀ, ET NE SE LE DISAIT PAS. `etatRecompenses()` répond
// `toutOuvert` depuis longtemps, mais ce savoir ne servait qu'aux étapes-cadeaux
// posées DANS le parcours. Le verrou du jeu libre, lui, ne connaissait qu'une
// mesure : le compteur cumulé de bonnes réponses depuis toujours. Un élève dont
// le parcours du jour était fini s'entendait donc dire « Encore 90 bonnes
// réponses pour débloquer ! ».

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
// LE REGISTRE DES ACTIVITÉS DOIT ÊTRE PEUPLÉ : `isGame` demande à chaque
// exercice si son activité est autonome, et sans cet import il n'y a aucune
// activité — donc aucun jeu, donc rien à verrouiller.
import '../js/core/activities/index.js';

// LE RÉGLAGE DU PROFESSEUR VIT DANS `localStorage`, que Node n'a pas. Sans lui,
// `getAccessConfig()` attrape l'erreur et rend les valeurs par défaut — donc le
// mode « parcours » ne s'appliquait jamais et l'essai passait pour de mauvaises
// raisons. Un stockage de trois lignes suffit : c'est bien celui-là que le
// verrou lit, et le fournir est la seule façon d'éprouver le réglage.
if (typeof globalThis.localStorage === 'undefined') {
    const boite = new Map();
    globalThis.localStorage = {
        getItem: (k) => (boite.has(k) ? boite.get(k) : null),
        setItem: (k, v) => { boite.set(k, String(v)); },
        removeItem: (k) => { boite.delete(k); }
    };
}
import { state } from '../js/core/state.js';
import { accessOf, saveAccessConfig, getAccessConfig, isGame } from '../js/core/gameAccess.js';
import { parcoursFini, prochaineObligatoire } from '../js/core/recompenses.js';
import { appliquerEtat, etatSeance } from '../js/core/seanceDistante.js';
import { makeStep } from '../js/core/path.js';
import { exercices } from '../js/data/catalog.js';

/** Un jeu du catalogue — c'est sur eux seuls que le verrou porte. */
const unJeu = exercices.find(isGame);
/** Un exercice ordinaire : jamais concerné par ce verrou-là. */
const unExercice = exercices.find(e => !isGame(e));

/** Le parcours du jour tel que le journal le projette. */
function parcoursDuJour({ faites = [], resultats = {} } = {}) {
    const steps = [
        makeStep('calc-add', {}, { stepId: 'a', nbItems: 4, threshold: 3 }),
        makeStep('calc-sub', {}, { stepId: 'b', nbItems: 4, threshold: 3 })
    ];
    return { steps, completed: faites, resultats };
}

/** Ce que `parcoursFini` attend : le parcours, et sa progression à part. */
const avecProgres = (p) => [p, { completed: p.completed, resultats: p.resultats }];

/**
 * `state.studentPath` est un ACCESSEUR projeté du journal : on ne peut pas
 * l'écrire. On le remplace le temps de l'essai — c'est bien ce que lit le
 * verrou, et le remplacer prouve qu'il le lit.
 */
function avecParcours(p, faire) {
    const vrai = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(state), 'studentPath')
        || Object.getOwnPropertyDescriptor(state, 'studentPath');
    Object.defineProperty(state, 'studentPath', { value: p, configurable: true, writable: true });
    try { faire(); } finally {
        delete state.studentPath;
        if (vrai) Object.defineProperty(state, 'studentPath', vrai);
    }
}

/**
 * Le professeur a retiré ces exercices de la séance. `seanceDistante` garde cet
 * état en mémoire de module ; on le pose le temps de l'essai.
 */
function avecRetires(ids, faire) {
    const avant = etatSeance();
    appliquerEtat({ ...avant, removed: ids });
    try { faire(); } finally { appliquerEtat(avant); }
}

const toutJuste = { a: { solved: 4, required: 3, questions: 4, passed: true },
                    b: { solved: 4, required: 3, questions: 4, passed: true } };

function avecMode(mode, faire) {
    const avant = getAccessConfig();
    saveAccessConfig({ ...avant, mode });
    try { faire(); } finally { saveAccessConfig(avant); }
}

test('« FINI » VEUT DIRE CE QUE L\'ÉCRAN DE L\'ÉLÈVE APPELLE FINI', () => {
    // La bannière « 🎉 Parcours terminé ! Bravo. » tombe sur
    // `prochaineObligatoire === -1`. Le verrou reprend cette règle-là,
    // littéralement. Prendre l'autre — `toutOuvert`, qui ajoute le niveau
    // demandé — aurait fait dire deux choses au même écran : mesuré, deux
    // étapes validées à 3/5 et 4/5 donnent « Parcours terminé ! Bravo » ET
    // « Finis ton parcours ».
    assert.equal(parcoursFini(...avecProgres(parcoursDuJour())), false, 'rien de fait');
    assert.equal(parcoursFini(...avecProgres(
        parcoursDuJour({ faites: ['a'], resultats: toutJuste }))), false, 'une étape sur deux');
    assert.equal(parcoursFini(...avecProgres(
        parcoursDuJour({ faites: ['a', 'b'], resultats: toutJuste }))), true, 'les deux étapes');

    // Et c'est bien la MÊME règle que la bannière, appelée telle quelle.
    const p = parcoursDuJour({ faites: ['a', 'b'], resultats: toutJuste });
    assert.equal(prochaineObligatoire(p.steps, new Set(p.completed)), -1);
});

test('LE VERROU NE MENT PAS : tout faire suffit, même sans tout réussir', () => {
    // Un élève qui a tout fait sans tout réussir lit « Parcours terminé !
    // Bravo » : lui refuser les jeux au nom d'un seuil qu'aucun écran ne montre,
    // ce serait un verrou qui ment — le défaut que ce module refuse par ailleurs.
    const maigre = { a: { solved: 1, required: 3, questions: 4, passed: true },
                     b: { solved: 1, required: 3, questions: 4, passed: true } };
    assert.equal(parcoursFini(...avecProgres(
        parcoursDuJour({ faites: ['a', 'b'], resultats: maigre }))), true);
});

test('une étape FACULTATIVE laissée de côté n\'empêche rien', () => {
    // Le professeur a dit « non obligatoire » : ne pas la faire ne doit rien
    // coûter, sans quoi le parcours ne serait jamais fini.
    const steps = [
        makeStep('calc-add', {}, { stepId: 'a', nbItems: 4, threshold: 3 }),
        { ...makeStep('calc-sub', {}, { stepId: 'b', nbItems: 4 }), facultatif: true }
    ];
    assert.equal(parcoursFini({ steps }, { completed: ['a'], resultats: {} }), true);
});

test('les jeux restent fermés tant que le parcours du jour n\'est pas fini', () => {
    avecMode('parcours', () => {
        avecParcours(parcoursDuJour({ faites: ['a'], resultats: toutJuste }), () => {
            assert.equal(accessOf(unJeu).status, 'attend-parcours');
            // Un exercice ordinaire n'est pas un jeu : il ne se ferme jamais
            // pour cette raison-là.
            assert.equal(accessOf(unExercice).status, 'libre');
        });
    });
});

test('et ils s\'ouvrent à la dernière étape validée', () => {
    avecMode('parcours', () => {
        avecParcours(parcoursDuJour({ faites: ['a', 'b'], resultats: toutJuste }), () => {
            assert.equal(accessOf(unJeu).status, 'libre');
        });
    });
});

test('UN EXERCICE RETIRÉ PAR LE PROFESSEUR NE TIENT PLUS LA PORTE FERMÉE', () => {
    // Le meneur écarte les exercices que le professeur a retirés de la séance :
    // l'élève ne les voit jamais et ne peut pas les faire. Les compter ici le
    // laisserait enfermé dehors à cause d'une étape qui n'existe plus pour lui.
    // (`state.studentPath` est projeté du journal TEL QUEL — personne ne l'a
    // filtré avant nous.)
    avecMode('parcours', () => {
        avecRetires(['calc-sub'], () => {
            avecParcours(parcoursDuJour({ faites: ['a'], resultats: toutJuste }), () => {
                assert.equal(accessOf(unJeu).status, 'libre',
                    'la seule étape qui reste est faite : c\'est fini');
            });
        });
    });
});

test('et si TOUT est retiré, il n\'y a plus de travail à finir', () => {
    avecMode('parcours', () => {
        avecRetires(['calc-add', 'calc-sub'], () => {
            avecParcours(parcoursDuJour(), () => {
                assert.equal(accessOf(unJeu).status, 'libre');
            });
        });
    });
});

test('SANS PARCOURS, RIEN N\'EST FERMÉ', () => {
    // Une punition sans faute : fermer les jeux à un élève à qui l'on n'a rien
    // donné. C'est aussi ce qui rend le mode inoffensif à la maison et pendant
    // les vacances.
    avecMode('parcours', () => {
        avecParcours(null, () => assert.equal(accessOf(unJeu).status, 'libre'));
        // Un parcours vide n'est pas davantage un travail à finir.
        avecParcours({ steps: [], completed: [], resultats: {} },
            () => assert.equal(accessOf(unJeu).status, 'libre'));
    });
});

test('le verrou annonce ce qui l\'ouvre, et non qu\'il est fermé', async () => {
    const { lockLabel } = await import('../js/core/gameAccess.js');
    assert.equal(lockLabel({ status: 'attend-parcours' }),
        'Finis ton parcours, et les jeux s\'ouvrent !');
    // Un verrou qui n'explique pas ce qui l'ouvre se lit comme une panne.
    assert.ok(!/verrouill|interdit|bloqu/i.test(lockLabel({ status: 'attend-parcours' })));
});

test('les deux autres modes ne changent pas', () => {
    avecMode('libre', () => {
        avecParcours(parcoursDuJour(), () =>       // rien de fait
            assert.equal(accessOf(unJeu).status, 'libre', 'mode libre : tout est ouvert'));
    });
    avecMode('progression', () => {
        // Le compteur cumulé garde la main : dans ce mode-là, un parcours fini
        // n'ouvre rien de plus — c'est un autre réglage, il ne bouge pas.
        avecParcours(parcoursDuJour({ faites: ['a', 'b'], resultats: toutJuste }), () => {
            const a = accessOf(unJeu);
            assert.ok(a.status === 'verrouille' || a.status === 'libre',
                'le mode progression garde sa propre règle');
            assert.notEqual(a.status, 'attend-parcours');
        });
    });
});
