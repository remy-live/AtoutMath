// COMPLÉTER UNE SÉANCE EN COURS — ce qui passe, et ce qu'on refuse.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « si je me rends compte qu'une séance est trop courte ou que les
// élèves vont trop vite, puis-je la compléter ? et si un élève galère trop, je
// peux enlever un exercice ? »
//
// MESURÉ AVANT D'ÉCRIRE (tools/seanceQuiChange.mjs) : il complétait déjà, et
// cela n'arrivait nulle part.
//
//   le professeur donne « Séance du lundi », 2 exercices
//   Tom ouvre son poste               → 2 étapes
//   le professeur complète : 3 exercices
//   Tom recharge                      → 2 étapes   ← et pour toujours
//   Emma, qui ouvre après             → 3 étapes
//
// CE QUE CES ÉPREUVES GARDENT. La RÈGLE, qui est plus subtile que « on met à
// jour » : compléter n'est pas réécrire. Ajouter à la fin ne trahit personne ;
// retirer, déplacer ou rerégler une étape déjà donnée rendrait menteur le
// bilan d'un élève qui l'a faite. C'est la ligne exacte entre les deux qui
// doit tenir, et elle ne se voit pas à l'œil : une seule de ces huit épreuves
// porte sur le cas qui marche, les autres sur ceux qu'on refuse.
//
// ET L'IDENTITÉ DU TRAVAIL, qu'on surveille autant que le reste : tout
// l'avancement de l'élève y est accroché (`computeAssignedPath` filtre sur
// `pathId`, et les numéros d'étape en dérivent). La recalculer au complément
// rendrait orphelin tout ce qu'il a déjà fait, sans qu'aucune erreur ne
// paraisse. La mesure au navigateur est nommée ci-dessus ; ici on tient la
// règle, à chaque commit.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { complementDeSeance, completerSeance, donnerSeance, clore, retirer }
    from '../js/core/seances.js';
import { makePath, makeStep } from '../js/core/path.js';

// ON FABRIQUE LE PARCOURS AVEC LES VRAIES FABRIQUES, et c'est une leçon payée
// ici même : ma première version écrivait l'objet à la main, SANS `version`.
// `normalizePath` le prenait alors pour un parcours d'ANCIEN format et le
// réécrivait — tous les `nbItems` revenaient à 10. L'épreuve du réglage changé
// passait donc au vert en comparant deux étapes que la normalisation avait
// rendues identiques : elle ne gardait rien.
const parcours = (exos, reglages = {}) => makePath('Séance du lundi',
    exos.map((x) => makeStep(x, {}, { nbItems: reglages[x] || 10, threshold: 7 })));

const seanceDe = (exos) => donnerSeance({ id: 'c1', nom: '6e B' }, parcours(exos));

test('DEUX ÉTAPES EN PLUS À LA FIN : ON COMPLÈTE', () => {
    const s = seanceDe(['calc-add', 'calc-sub']);
    const plus = complementDeSeance(s, parcours(['calc-add', 'calc-sub', 'calc-mul', 'calc-div']));
    assert.ok(plus, 'un ajout en fin de parcours est un complément');
    assert.equal(plus.etapes.length, 2);
    assert.deepEqual(plus.etapes.map(e => e.exerciseId), ['calc-mul', 'calc-div']);
});

test('ET LA SÉANCE COMPLÉTÉE GARDE SON IDENTITÉ', () => {
    // C'EST LA LIGNE QUI FAIT TOUT TENIR. L'avancement de l'élève est retenu
    // par `pathId` et par des numéros d'étape `${pathId}_s${i}`. Recalculer
    // l'identité sur le nouveau contenu rendrait orphelin tout ce qu'il a
    // fait : il repartirait de zéro sur la carte, son travail resté au journal
    // sous un nom que plus personne ne lit.
    const s = seanceDe(['calc-add', 'calc-sub']);
    const plus = complementDeSeance(s, parcours(['calc-add', 'calc-sub', 'calc-mul']));
    const complete = completerSeance(s, plus.etapes);
    assert.equal(complete.pathId, s.pathId, 'l\'identité du travail ne bouge pas');
    assert.equal(complete.id, s.id, 'ni celle de la séance');
    // ET LES ÉTAPES DÉJÀ LÀ RESTENT À LEUR RANG : les numéros 0 à n−1 ne
    // doivent pas bouger, sans quoi l'avancement se recollerait de travers.
    assert.deepEqual(complete.path.steps.slice(0, 2), s.path.steps);
    assert.equal(complete.path.steps.length, 3);
    assert.equal(complete.complementN, 1, 'on retient combien on a ajouté');
    assert.ok(complete.completeeLe, 'et quand, pour pouvoir le dire à l\'élève');
});

test('UNE ÉTAPE RETIRÉE : ON NE TOUCHE À RIEN', () => {
    // Un élève a peut-être déjà fait celle qui disparaît. Pour enlever un
    // exercice à une classe qui bute, c'est la dispense (`override` en mode
    // `retire`) qui est faite pour ça — elle ne touche pas au parcours.
    const s = seanceDe(['calc-add', 'calc-sub', 'calc-mul']);
    assert.equal(complementDeSeance(s, parcours(['calc-add', 'calc-mul'])), null);
});

test('UNE ÉTAPE REMPLACÉE : ON NE TOUCHE À RIEN', () => {
    const s = seanceDe(['calc-add', 'calc-sub']);
    assert.equal(complementDeSeance(s, parcours(['calc-div', 'calc-sub', 'calc-mul'])), null,
        'le préfixe diffère : ce n\'est plus un complément, c\'est une réécriture');
});

test('DEUX ÉTAPES INTERVERTIES : ON NE TOUCHE À RIEN', () => {
    const s = seanceDe(['calc-add', 'calc-sub']);
    assert.equal(complementDeSeance(s, parcours(['calc-sub', 'calc-add', 'calc-mul'])), null);
});

test('UN RÉGLAGE CHANGÉ SUR UNE ÉTAPE DÉJÀ DONNÉE : ON NE TOUCHE À RIEN', () => {
    // Changer le nombre de questions d'une étape déjà validée par un élève
    // ferait compter deux versions de la même étape dans le bilan.
    const s = seanceDe(['calc-add', 'calc-sub']);
    const neuf = parcours(['calc-add', 'calc-sub', 'calc-mul'], { 'calc-add': 30 });
    assert.equal(complementDeSeance(s, neuf), null);
});

test('UNE SÉANCE CLOSE NE SE COMPLÈTE JAMAIS', () => {
    // La note est arrêtée : lui ajouter un exercice ferait baisser tout le
    // monde, et sur un travail que personne n'a eu sous les yeux.
    const s = clore(seanceDe(['calc-add']));
    assert.equal(complementDeSeance(s, parcours(['calc-add', 'calc-sub'])), null);
    // Ni une séance retirée de l'écran des élèves.
    assert.equal(complementDeSeance(retirer(seanceDe(['calc-add'])),
        parcours(['calc-add', 'calc-sub'])), null);
});

test('ET UN PARCOURS IDENTIQUE NE COMPLÈTE RIEN', () => {
    // Le cas le plus fréquent de tous : à chaque synchronisation, l'élève
    // reçoit la même séance. Si elle « se complétait » de zéro étape, on
    // réécrirait son tiroir toutes les dix secondes pour rien.
    const s = seanceDe(['calc-add', 'calc-sub']);
    assert.equal(complementDeSeance(s, parcours(['calc-add', 'calc-sub'])), null);
    // Et un aller-retour JSON — ce que fait le serveur — ne doit pas faire
    // croire à une différence : les clés peuvent revenir dans un autre ordre.
    const apresJson = JSON.parse(JSON.stringify(parcours(['calc-add', 'calc-sub'])));
    assert.equal(complementDeSeance(s, apresJson), null);
});
