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
    MIN_ETAPE, MAX_ETAPE, seuilRequis, ajusterDuo, seuilPourMode, phraseDuo
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
