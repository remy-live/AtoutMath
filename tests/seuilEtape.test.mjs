// « IL NE PEUT PAS Y AVOIR PLUS DE BONNES RÉPONSES EXIGÉES QUE DE QUESTIONS. »
//
// Le panneau posait deux rails indépendants de 1 à 50 : rien n'empêchait
// « 30 bonnes réponses exigées » sous « 10 questions ». Le code rattrapait
// l'absurdité en douce au moment d'enregistrer, si bien que le professeur
// voyait 30 et que l'étape en gardait 10.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    MIN_ETAPE, MAX_ETAPE, seuilRequis, ajusterDuo, seuilPourMode, phraseDuo, quotaDemande
} from '../js/core/seuilEtape.js';

// --- Ce que vaut vraiment un seuil ------------------------------------------

test('UN SEUIL ABSENT N\'EXIGE RIEN — et surtout pas « tout réussir »', () => {
    // C'est ce que le code fait depuis toujours : `Math.min(null, 10)` vaut 0.
    // Le commentaire de `makeStep` disait l'inverse ; c'est le commentaire qui
    // avait tort, et l'évaluation a précisément besoin de cette lecture-là.
    assert.equal(seuilRequis({ nbItems: 10, threshold: null }), 0);
    assert.equal(seuilRequis({ nbItems: 10 }), 0);
    assert.equal(seuilRequis(null), 0);
});

test('un seuil plus grand que le devoir se ramène au devoir', () => {
    assert.equal(seuilRequis({ nbItems: 10, threshold: 30 }), 10);
    assert.equal(seuilRequis({ nbItems: 10, threshold: 7 }), 7);
    assert.equal(seuilRequis({ nbItems: 10, threshold: -3 }), 0);
});

// --- Les deux poignées ------------------------------------------------------

test('L\'EXIGENCE BUTE CONTRE LE DEVOIR', () => {
    // On tire la poignée basse vers la droite : elle s'arrête à la haute.
    // Monter le seuil ne doit pas allonger le devoir en douce.
    const r = ajusterDuo({ questions: 10, exigees: 30, bouge: 'exigees' });
    assert.deepEqual(r, { questions: 10, exigees: 10 });
});

test('RACCOURCIR LE DEVOIR EMMÈNE L\'EXIGENCE AVEC LUI', () => {
    // Sinon la poignée basse resterait derrière la haute — exactement l'état
    // qu'on veut rendre impossible.
    const r = ajusterDuo({ questions: 4, exigees: 7, bouge: 'questions' });
    assert.deepEqual(r, { questions: 4, exigees: 4 });
});

test('un état déjà possible n\'est pas touché', () => {
    assert.deepEqual(ajusterDuo({ questions: 10, exigees: 7 }), { questions: 10, exigees: 7 });
    assert.deepEqual(ajusterDuo({ questions: 10, exigees: 10 }), { questions: 10, exigees: 10 });
});

test('les bornes du rail tiennent, quoi qu\'on lui passe', () => {
    assert.deepEqual(ajusterDuo({ questions: 0, exigees: 0 }), { questions: 1, exigees: 1 });
    assert.deepEqual(ajusterDuo({ questions: 999, exigees: 999 }),
        { questions: MAX_ETAPE, exigees: MAX_ETAPE });
    assert.deepEqual(ajusterDuo({ questions: NaN, exigees: undefined }),
        { questions: MIN_ETAPE, exigees: MIN_ETAPE });
    // Un maximum imposé par l'appelant est respecté.
    assert.deepEqual(ajusterDuo({ questions: 40, exigees: 40, max: 12 }),
        { questions: 12, exigees: 12 });
});

// --- Le mode ----------------------------------------------------------------

test('EN ÉVALUATION, IL N\'Y A PAS DE SEUIL DU TOUT', () => {
    // Rémy : « quand on est en mode évaluation, pas besoin de bonne réponse
    // exigée ». Une interrogation ne se valide pas, elle se note : « en dessous
    // de 7, tu recommences » n'existe pas dans un devoir surveillé.
    const e = seuilPourMode({ questions: 10, exigees: 7, evaluation: true });
    assert.equal(e.nbItems, 10);
    assert.equal(e.threshold, null, 'un `null` — pas un 0 qu\'on relirait comme un réglage');
    assert.equal(seuilRequis({ nbItems: e.nbItems, threshold: e.threshold }), 0);

    const t = seuilPourMode({ questions: 10, exigees: 7, evaluation: false });
    assert.deepEqual(t, { nbItems: 10, threshold: 7 });
});

test('même en évaluation, l\'absurde reste impossible', () => {
    const e = seuilPourMode({ questions: 4, exigees: 30, evaluation: false });
    assert.deepEqual(e, { nbItems: 4, threshold: 4 });
});

// --- La légende -------------------------------------------------------------

test('DEUX POIGNÉES SANS LÉGENDE SE LISENT COMME UN INTERVALLE', () => {
    // « de 7 à 10 », ce qui n'est pas du tout ce qu'elles disent. La phrase
    // nomme donc les deux valeurs, et dit la marge en clair.
    const p = phraseDuo({ questions: 10, exigees: 7 });
    assert.ok(p.includes('7') && p.includes('10'), p);
    assert.ok(/3 erreurs tolérées/.test(p), p);

    assert.match(phraseDuo({ questions: 10, exigees: 10 }), /TOUT réussir/);
    assert.match(phraseDuo({ questions: 10, exigees: 7, evaluation: true }), /sans seuil/);
    // Une seule erreur tolérée reste au singulier.
    assert.match(phraseDuo({ questions: 5, exigees: 4 }), /1 erreur tolérée/);
    assert.match(phraseDuo({ questions: 1, exigees: 1 }), /^1 question /);
});

// --- L'interrupteur du quota -------------------------------------------------
//
// Rémy : « il n'y a qu'un bouton sur le slide, actif ou non selon la nécessité
// d'avoir un quota de bonne réponse. » Le panneau imposait un seuil à TOUTE
// étape : un entraînement où l'on veut simplement que l'élève fasse ses vingt
// calculs n'était pas exprimable, il fallait écrire « 0 sur 20 » et espérer.

test('SANS QUOTA, L\'ÉTAPE N\'EXIGE RIEN — et le dit', () => {
    const sans = seuilPourMode({ questions: 10, exigees: 7, quota: false });
    assert.deepEqual(sans, { nbItems: 10, threshold: null });
    // `null` et non 0 : c'est l'ABSENCE d'exigence, pas une exigence réglée au
    // plus bas. Un 0 se relirait comme un choix, et quelqu'un finirait par
    // l'« améliorer » en 1.
    assert.equal(seuilRequis({ nbItems: 10, threshold: null }), 0);
    assert.match(phraseDuo({ questions: 10, exigees: 7, quota: false }),
        /l'étape se valide en allant au bout/);
    // La phrase reste juste au singulier — une étape d'une seule question.
    assert.match(phraseDuo({ questions: 1, exigees: 1, quota: false }), /^1 question —/);
});

test('l\'interrupteur décide, pas la valeur restée sur le rail', () => {
    // Le rail garde 7 sous la main pour le jour où l'on recoche ; ce 7 ne doit
    // JAMAIS ressortir dans l'étape tant que la case est décochée.
    for (const exigees of [1, 5, 7, 10]) {
        assert.equal(seuilPourMode({ questions: 10, exigees, quota: false }).threshold, null);
    }
    assert.equal(seuilPourMode({ questions: 10, exigees: 7, quota: true }).threshold, 7);
    // Et l'évaluation l'emporte sur tout : même quota coché, pas de seuil.
    assert.equal(
        seuilPourMode({ questions: 10, exigees: 7, quota: true, evaluation: true }).threshold, null);
});

test('on relit dans l\'étape s\'il y avait un quota', () => {
    // C'est ce que le panneau consulte pour savoir s'il coche la case. Sans
    // cette lecture unique, chaque panneau redevinait la réponse à sa façon.
    assert.equal(quotaDemande({ nbItems: 10, threshold: 7 }), true);
    assert.equal(quotaDemande({ nbItems: 10, threshold: 0 }), true);   // « 0 exigée », choisi
    assert.equal(quotaDemande({ nbItems: 10, threshold: null }), false);
    assert.equal(quotaDemande({ nbItems: 10 }), false);
    assert.equal(quotaDemande(null), false);
});

test('LE MAXIMUM DU RAIL EST LE NOMBRE TAPÉ : « 11 sur 10 » n\'existe pas', () => {
    // C'est la garantie que le double curseur donnait par l'ordre des poignées,
    // et qu'on doit continuer d'offrir maintenant qu'il n'y en a qu'une : le
    // rail du quota est borné par le nombre de questions, pas par MAX_ETAPE.
    assert.deepEqual(seuilPourMode({ questions: 10, exigees: 11 }), { nbItems: 10, threshold: 10 });
    assert.deepEqual(ajusterDuo({ questions: 3, exigees: 40 }), { questions: 3, exigees: 3 });
    // Et raccourcir le devoir tire le quota avec lui, sans quoi il resterait
    // au-dessus — l'état exact qu'on veut rendre irreprésentable.
    assert.deepEqual(ajusterDuo({ questions: 4, exigees: 9, bouge: 'questions' }),
        { questions: 4, exigees: 4 });
});
