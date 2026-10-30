// CE QUI DIT QU'UN PARCOURS A CHANGÉ — et qui ne le disait pas.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// TROUVÉ EN MESURANT AUTRE CHOSE (tools/seanceDepuisLaClasse.mjs) : après avoir
// ajouté un exercice à une séance, l'entrée locale portait 3 étapes, le serveur
// en gardait 2, et l'écran affichait « ajouté à la séance ». Le logiciel
// disait vrai de ce qu'il voyait, et faux de ce qui comptait.
//
// LA CAUSE. `state.teacherPaths` contient DEUX FORMES : une ENVELOPPE
// { id, name, data, … } pour tout ce qui sort de « Préparer », et le PARCOURS
// NU pour ce qui vient du serveur. L'empreinte ne regardait que `name`,
// `steps` et `policy` AU PREMIER NIVEAU. Sur une enveloppe, `steps` vaut
// `undefined` : l'empreinte se réduisait au nom et ne bougeait plus jamais.
//
// CE QUE CELA COÛTAIT, BIEN AU-DELÀ DU BOUTON QU'ON VENAIT D'ÉCRIRE : un
// parcours retouché dans Préparer ne remontait pas au serveur. « Enregistré
// 14:32 » disait vrai — il l'est, SUR CE POSTE — et les élèves continuaient de
// recevoir la version d'avant. Aucune erreur, aucun avis, et le seul moyen de
// s'en apercevoir était de regarder ce que les élèves reçoivent.
//
// C'EST LE GENRE DE DÉFAUT QUI JUSTIFIE LA RÈGLE DE LA MAISON : une mesure qui
// n'emprunte pas le chemin de l'utilisateur ne mesure pas son problème. Tous
// les essais passaient ; c'est une sonde qui recomptait AU SERVEUR qui l'a vu.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { empreinte } from '../js/core/empreinteParcours.js';

const PARCOURS = (exos) => ({
    id: 'p1', name: 'Séance du lundi', version: 2,
    steps: exos.map((x, i) => ({ stepId: 's' + i, exerciseId: x }))
});

/** L'enveloppe que `state.saveTeacherPath` range dans la bibliothèque. */
const ENVELOPPE = (exos, quand = 1) => ({
    id: 'p1', name: 'Séance du lundi', data: PARCOURS(exos),
    folderId: 'root', timestamp: quand
});

test('UNE ÉTAPE DE PLUS CHANGE L\'EMPREINTE — PARCOURS NU', () => {
    assert.notEqual(empreinte(PARCOURS(['a', 'b'])), empreinte(PARCOURS(['a', 'b', 'c'])));
});

test('ET AUSSI DANS UNE ENVELOPPE — c\'est tout le défaut', () => {
    // C'EST LA FORME QUE PRODUIT « PRÉPARER », donc celle de tous les parcours
    // de Rémy. L'ancienne empreinte rendait ici deux fois la même chaîne.
    assert.notEqual(empreinte(ENVELOPPE(['a', 'b'])), empreinte(ENVELOPPE(['a', 'b', 'c'])));
});

test('UN RÉGLAGE D\'ÉTAPE CHANGÉ CHANGE AUSSI L\'EMPREINTE', () => {
    // Le nombre de questions ou le quota ne touchent pas à la LISTE des
    // exercices : une empreinte qui ne regarderait que les identifiants
    // laisserait un parcours rerréglé en arrière sur le serveur.
    const a = ENVELOPPE(['a']);
    const b = ENVELOPPE(['a']);
    b.data.steps[0].nbItems = 30;
    assert.notEqual(empreinte(a), empreinte(b));
});

test('MAIS L\'HEURE D\'ENREGISTREMENT, NON', () => {
    // `timestamp` bouge à chaque enregistrement sans rien dire du contenu.
    // L'inclure ferait remonter au serveur un parcours qu'on vient seulement
    // de rouvrir — trente parcours renvoyés pour rien à chaque ouverture.
    assert.equal(empreinte(ENVELOPPE(['a', 'b'], 1)), empreinte(ENVELOPPE(['a', 'b'], 999)));
});

test('ET DEUX PARCOURS IDENTIQUES ONT LA MÊME EMPREINTE', () => {
    // Sans cela, le cache ne servirait plus à rien et chaque battement
    // renverrait toute la bibliothèque.
    assert.equal(empreinte(ENVELOPPE(['a', 'b'])), empreinte(ENVELOPPE(['a', 'b'])));
    assert.equal(empreinte(PARCOURS(['a'])), empreinte(PARCOURS(['a'])));
});

test('ET UN PARCOURS ILLISIBLE NE FAIT PAS TOMBER LA MONTÉE', () => {
    // Une référence circulaire casse JSON.stringify. On rend alors une valeur
    // qui ne ressemble à rien — donc on remonte, ce qui est le bon côté sur
    // lequel se tromper : mieux vaut un envoi de trop qu'un parcours perdu.
    const boucle = { id: 'x', name: 'x' };
    boucle.soi = boucle;
    assert.doesNotThrow(() => empreinte(boucle));
    assert.notEqual(empreinte(boucle), empreinte(boucle));
});
