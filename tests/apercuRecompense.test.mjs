// L'APERÇU D'UNE ÉTAPE MONTRE CETTE ÉTAPE — 31 octobre.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « quand on met role de l'étape jeu de récompense et que je mets
// l'apercu (en mode professeur), il me montre le monde avec tous les exercices
// et non le jeu ».
//
// LA CAUSE EST UN ORDRE DE LECTURE dans `avecCarte` : la règle « dès qu'une
// étape est facultative, carte obligatoire » passait AVANT celle qui reconnaît
// un essai de professeur. Un parcours portant une récompense forçait donc la
// carte dans tous les cas, aperçu compris — si bien que plus le professeur
// posait de récompenses, moins il pouvait les regarder.
//
// ON ÉPROUVE L'ACCESSEUR LUI-MÊME, emprunté au prototype : c'est une règle
// pure, elle ne demande ni écran ni séance, et l'éprouver par le Runner entier
// demanderait un navigateur pour une décision qui tient en quatre `if`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { Runner } from '../js/core/runner.js';

const regle = Object.getOwnPropertyDescriptor(Runner.prototype, 'avecCarte');
const avecCarte = (faux) => regle.get.call(faux);

const TRAVAIL = { exerciseId: 'calc-add', nbItems: 3 };
const RECOMPENSE = { exerciseId: 'jeu-tetris', nbItems: 1, bonus: true, facultatif: true };

test('L\'ACCESSEUR EXISTE ENCORE, ET C\'EST BIEN UN ACCESSEUR', () => {
    // Si `avecCarte` devenait une méthode ou un champ, tout ce fichier
    // mesurerait `undefined` en restant vert. On le dit tout de suite.
    assert.ok(regle && typeof regle.get === 'function',
        'avecCarte n\'est plus un accesseur : cette épreuve ne mesure plus rien');
});

test('L\'APERÇU D\'UNE ÉTAPE N\'OUVRE PAS LA CARTE, MÊME AVEC UNE RÉCOMPENSE', () => {
    const vu = avecCarte({
        steps: [TRAVAIL, TRAVAIL, RECOMPENSE],
        apercuDUneEtape: true, allowStepNavigation: true, essai: false
    });
    assert.equal(vu, false,
        'l\'aperçu d\'une étape ouvre la carte : Rémy voit « le monde avec tous '
            + 'les exercices » au lieu du jeu qu\'il vient de poser');
});

test('MAIS L\'ÉLÈVE, LUI, GARDE SA CARTE', () => {
    // C'est la raison d'être de la règle, et elle ne doit pas tomber avec la
    // correction : l'enchaînement SAUTE les étapes facultatives — c'est ce qui
    // les rend facultatives —, donc la carte est le seul endroit où l'élève
    // peut en prendre une. Sans elle, une récompense posée ne se verrait
    // jamais.
    assert.equal(avecCarte({
        steps: [TRAVAIL, TRAVAIL, RECOMPENSE], apercuDUneEtape: false,
        allowStepNavigation: false, essai: false
    }), true, 'l\'élève n\'a plus de carte : sa récompense est inatteignable');

    // Et même quand le professeur déroule le parcours ENTIER : c'est ce que
    // l'élève verra, donc c'est ce qu'il doit voir.
    assert.equal(avecCarte({
        steps: [TRAVAIL, TRAVAIL, RECOMPENSE], apercuDUneEtape: false,
        allowStepNavigation: true, essai: false
    }), true, 'l\'aperçu du parcours entier ne montre plus ce que l\'élève verra');
});

test('ET LES AUTRES RÈGLES TIENNENT ENCORE', () => {
    // Un exercice seul n'est pas un chemin : pas de carte, quoi qu'on demande.
    assert.equal(avecCarte({
        steps: [RECOMPENSE], apercuDUneEtape: false, allowStepNavigation: false
    }), false, 'un exercice seul s\'ouvre sur une carte');
    // Un essai de professeur sur un parcours sans facultative enchaîne.
    assert.equal(avecCarte({
        steps: [TRAVAIL, TRAVAIL], essai: true, allowStepNavigation: false
    }), false);
    // Et une séance ordinaire d'élève a sa carte.
    assert.equal(avecCarte({
        steps: [TRAVAIL, TRAVAIL], essai: false, allowStepNavigation: false
    }), true);
});
