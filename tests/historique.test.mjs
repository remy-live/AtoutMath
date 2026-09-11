// Annuler et refaire : la pile d'états du parcours.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { creerHistorique } from '../js/core/historique.js';

const etat = (...noms) => ({ steps: noms.map(n => ({ exerciseId: n })) });

test('au départ, il n\'y a rien à annuler ni à refaire', () => {
    const h = creerHistorique(etat());
    assert.equal(h.peutAnnuler(), false);
    assert.equal(h.peutRefaire(), false);
    assert.equal(h.annuler(), null);
    assert.equal(h.refaire(), null);
});

test('on remonte le fil geste par geste, puis on le redescend', () => {
    const h = creerHistorique(etat());
    h.enregistrer(etat('a'));
    h.enregistrer(etat('a', 'b'));
    h.enregistrer(etat('a', 'b', 'c'));

    assert.deepEqual(h.annuler(), etat('a', 'b'));
    assert.deepEqual(h.annuler(), etat('a'));
    assert.deepEqual(h.annuler(), etat());
    assert.equal(h.annuler(), null, 'on ne remonte pas avant le début');

    assert.deepEqual(h.refaire(), etat('a'));
    assert.deepEqual(h.refaire(), etat('a', 'b'));
    assert.deepEqual(h.refaire(), etat('a', 'b', 'c'));
    assert.equal(h.refaire(), null);
});

test('un état identique n\'est pas retenu deux fois', () => {
    // L'appelant enregistre après CHAQUE rendu, et un rendu se déclenche aussi
    // quand on choisit une étape. Sans ce filtre, il faudrait dix « annuler »
    // pour défaire un seul ajout.
    const h = creerHistorique(etat('a'));
    assert.equal(h.enregistrer(etat('a')), false);
    assert.equal(h.enregistrer({ steps: [{ exerciseId: 'a' }] }), false, 'même contenu, autre objet');
    assert.equal(h.peutAnnuler(), false);
    assert.equal(h.enregistrer(etat('a', 'b')), true);
});

test('agir après avoir annulé efface ce qu\'on avait annulé', () => {
    const h = creerHistorique(etat());
    h.enregistrer(etat('a'));
    h.enregistrer(etat('a', 'b'));
    h.annuler();                               // on est revenu à ['a']
    h.enregistrer(etat('a', 'z'));             // et l'on part ailleurs

    assert.equal(h.peutRefaire(), false, '« b » n\'est plus rattrapable');
    assert.deepEqual(h.annuler(), etat('a'));
});

test('la pile ne grandit pas sans fin, et garde les gestes RÉCENTS', () => {
    const h = creerHistorique(etat(), { max: 4 });
    for (let i = 1; i <= 10; i++) h.enregistrer(etat(`e${i}`));
    assert.equal(h.taille(), 4);
    assert.deepEqual(h.courant(), etat('e10'));
    assert.deepEqual(h.annuler(), etat('e9'));
});

test('l\'historique rend des COPIES : modifier ce qu\'on reçoit ne le corrompt pas', () => {
    const h = creerHistorique(etat('a'));
    h.enregistrer(etat('a', 'b'));

    const rendu = h.annuler();
    rendu.steps.push({ exerciseId: 'intrus' });
    assert.deepEqual(h.courant(), etat('a'), 'la pile a été modifiée par l\'extérieur');

    // Et dans l'autre sens : garder une référence sur ce qu'on enregistre ne
    // doit pas permettre de réécrire l'histoire après coup.
    const vivant = etat('x');
    h.enregistrer(vivant);
    vivant.steps.push({ exerciseId: 'intrus' });
    assert.deepEqual(h.courant(), etat('x'));
});

test('on peut repartir de zéro sur un autre parcours', () => {
    const h = creerHistorique(etat('a'));
    h.enregistrer(etat('a', 'b'));
    h.reinitialiser(etat('autre'));
    assert.equal(h.peutAnnuler(), false, 'le parcours précédent ne doit pas revenir');
    assert.equal(h.peutRefaire(), false);
    assert.deepEqual(h.courant(), etat('autre'));
});
