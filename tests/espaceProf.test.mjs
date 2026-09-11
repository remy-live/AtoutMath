// L'espace professeur : les deux décisions qui se prennent sans serveur.
//
// Tout le reste de `espaceProf.js` parle au réseau et se vérifie contre un vrai
// serveur (`tools/testApi.php`, sections « L'espace professeur, depuis
// l'application » et « Créer un second professeur »). Ces deux fonctions-ci,
// elles, décident toutes seules — et elles décident de ce que le professeur
// voit : la pastille verte et la phrase « vu il y a douze minutes ».

import { test } from 'node:test';
import assert from 'node:assert/strict';
// Le module tire `verrouProf` puis `portail`, qui touchent au document : le
// décor des essais le fournit, comme pour tous les autres modules du noyau.
import './helpers.mjs';
import { estEnLigne, depuis, EN_LIGNE_SECONDES } from '../js/core/espaceProf.js';

test('« en ligne » se décide sur l\'heure du serveur, jamais sur celle du poste', () => {
    // On passe DEUX instants, et c'est tout l'intérêt : le second vient du
    // serveur (`/teacher/live` le renvoie). Une tablette réglée avec dix
    // minutes d'avance déclarerait autrement toute la classe absente.
    const serveur = 1_700_000_000;

    assert.equal(estEnLigne(serveur, serveur), true, 'à l\'instant même');
    assert.equal(estEnLigne(serveur - 30, serveur), true, 'il y a trente secondes');
    assert.equal(estEnLigne(serveur - EN_LIGNE_SECONDES, serveur), true, 'juste à la limite');
    assert.equal(estEnLigne(serveur - EN_LIGNE_SECONDES - 1, serveur), false, 'une seconde après');
    assert.equal(estEnLigne(serveur - 600, serveur), false, 'il y a dix minutes');

    // Jamais venu : ni vrai, ni une erreur.
    assert.equal(estEnLigne(null, serveur), false);
    assert.equal(estEnLigne(0, serveur), false);
    assert.equal(estEnLigne(undefined, serveur), false);
});

test('la limite vaut trois synchronisations manquées', () => {
    // La synchronisation d'un élève au travail passe toutes les trente
    // secondes : en dessous de trois passages, la pastille clignoterait pour
    // rien ; au-delà, elle resterait verte devant une classe partie en
    // récréation. C'est la même valeur que la page d'administration.
    assert.equal(EN_LIGNE_SECONDES, 90);
});

test('« vu » se dit en français, et jamais par une heure', () => {
    // Le professeur ne veut pas savoir qu'il était là à 14 h 03 : il veut
    // savoir s'il vient de partir ou s'il n'est jamais venu.
    const t = 1_700_000_000;
    assert.equal(depuis(null, t), 'jamais venu');
    assert.equal(depuis(t - 10, t), 'en ligne');
    assert.equal(depuis(t - 300, t), 'il y a 5 min');
    assert.equal(depuis(t - 7200, t), 'il y a 2 h');
    assert.equal(depuis(t - 86400, t), 'hier');
    assert.equal(depuis(t - 86400 * 4, t), 'il y a 4 jours');

    // Une horloge en avance ne doit pas produire « il y a -3 minutes ».
    assert.equal(depuis(t + 500, t), 'en ligne');
});
