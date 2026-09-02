// L'ÉCRAN D'ARRIVÉE : UNE SEULE CHOSE À FAIRE.
//
// Rémy : « l'écran d'accueil […] pour pas faire peur avec tout ce qu'on peut y
// lire, que ce soit simple. Duolingo est rassurant. » Ce qui rassure chez eux,
// c'est qu'il n'y a rien à décider en arrivant. Ces tests gardent cette
// promesse-là : quoi qu'il arrive, l'accueil propose UNE action, et c'est la
// bonne — le travail demandé avant les révisions, les révisions avant la
// découverte.

import { test } from 'node:test';
import { conseilDuJour } from '../js/core/accueil.js';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    MAX_REVISION, MIN_REVISION, FENETRE_RECENTE, salutation, etatParcours,
    erreursOuvertes, bilanRecent, phraseDuJour, actionDuJour, raccourcisDuJour,
    planDuJour
} from '../js/core/aujourdhui.js';
import { CONSEILS } from '../js/core/accueil.js';

const JOUR = 86400000;
const midi = (h = 10) => new Date(2026, 2, 14, h, 0, 0).getTime();

const parcours = (faites = [], opts = {}) => ({
    name: 'Séance du mardi',
    completed: faites,
    steps: [
        { stepId: 'a', titre: 'Des Lettres aux Chiffres' },
        { stepId: 'b', titre: 'Périmètre : à toi de choisir' },
        { stepId: 'j', titre: 'Les Petites Ailes', bonus: true },
        ...(opts.extra || [])
    ]
});

// --- La salutation ---------------------------------------------------------

test('on ne dit pas « bonjour » à vingt heures', () => {
    assert.equal(salutation(midi(9)), 'Bonjour !');
    assert.equal(salutation(midi(17)), 'Bonjour !');
    assert.equal(salutation(midi(18)), 'Bonsoir !');
    assert.equal(salutation(midi(21)), 'Bonsoir !');
});

// --- Le parcours -----------------------------------------------------------

test('UN JEU DE RÉCOMPENSE N\'EST PAS UNE ÉTAPE À FAIRE', () => {
    // C'est ce qu'on GAGNE. Le compter dans le total annoncerait « 2 sur 3 » à
    // un élève qui a fini tout son devoir, et lui ferait croire qu'il lui reste
    // du travail.
    const e = etatParcours(parcours([]));
    assert.equal(e.total, 2, 'le jeu bonus est compté comme du travail');
    assert.equal(e.faites, 0);
    assert.equal(e.fini, false);
    assert.equal(e.prochain.stepId, 'a');

    const fini = etatParcours(parcours(['a', 'b']));
    assert.equal(fini.faites, 2);
    assert.equal(fini.fini, true, 'le devoir est fait, le jeu n\'est pas du devoir');
    assert.equal(fini.prochain, null);
});

test('pas de parcours, pas d\'état — et un parcours vide non plus', () => {
    assert.equal(etatParcours(null), null);
    assert.equal(etatParcours({ steps: [] }), null);
    // Un parcours qui ne contient QUE des jeux n'est pas un devoir.
    assert.equal(etatParcours({ steps: [{ stepId: 'j', bonus: true }] }), null);
});

// --- L'action, et son ordre de priorité ------------------------------------

test('LE TRAVAIL DEMANDÉ PASSE AVANT TOUT, y compris avant les erreurs', () => {
    // C'est le professeur qui décide de la séance. Un élève à qui l'on propose
    // de réviser alors qu'il a un devoir en attente fera la révision, et le
    // devoir ne sera pas fait.
    const beaucoup = Array.from({ length: 6 }, (_, i) => ({ id: i, corrected: false }));
    const a = actionDuJour({ parcours: parcours(['a']), erreurs: beaucoup, suggestions: [{ id: 'x' }] });
    assert.equal(a.genre, 'parcours');
    assert.equal(a.faites, 1);
    assert.equal(a.total, 2);
    assert.match(a.titre, /Continue/);
    assert.ok(a.sous.includes('Périmètre'), 'la prochaine étape n\'est pas nommée');
});

test('un parcours pas encore commencé dit « commence », pas « continue »', () => {
    const a = actionDuJour({ parcours: parcours([]), erreurs: [], suggestions: [] });
    assert.match(a.titre, /Commence/);
    assert.equal(a.bouton, 'Commencer');
});

test('LES ERREURS VIENNENT ENSUITE, et jamais pour une seule', () => {
    // « Revoir 1 question » à chaque connexion transforme un carnet en reproche.
    const une = [{ id: 1, corrected: false }];
    const deux = [{ id: 1, corrected: false }, { id: 2, corrected: false }];
    assert.equal(actionDuJour({ erreurs: une, suggestions: [{ id: 'x', title: 'X' }] }).genre,
        'decouverte');
    const a = actionDuJour({ erreurs: deux, suggestions: [{ id: 'x' }] });
    assert.equal(a.genre, 'revision');
    assert.equal(a.questions, 2);
    assert.equal(MIN_REVISION, 2);
});

test('une révision reste courte, quoi qu\'il y ait dans le carnet', () => {
    // Au-delà, ce n'est plus une révision, c'est une punition.
    const trente = Array.from({ length: 30 }, (_, i) => ({ id: i, corrected: false }));
    const a = actionDuJour({ erreurs: trente, suggestions: [] });
    assert.equal(a.questions, MAX_REVISION);
    assert.equal(MAX_REVISION, 10);
    assert.ok(a.sous.includes('30'), 'on dit quand même combien il en reste');
});

test('les erreurs déjà corrigées ne comptent pas', () => {
    const liste = [{ id: 1, corrected: true }, { id: 2, corrected: true }, { id: 3, corrected: false }];
    assert.equal(erreursOuvertes(liste).length, 1);
    assert.equal(actionDuJour({ erreurs: liste, suggestions: [{ id: 'x' }] }).genre, 'decouverte');
});

test('sinon on propose UN exercice — pas soixante', () => {
    const a = actionDuJour({ suggestions: [{ id: 'geo-perimetre', title: 'Périmètre' }] });
    assert.equal(a.genre, 'decouverte');
    assert.equal(a.exoId, 'geo-perimetre');
    assert.equal(a.sous, 'Périmètre');
});

test('le parcours TERMINÉ se dit, au lieu de disparaître', () => {
    // Sans quoi l'élève qui vient de finir son devoir voit exactement le même
    // écran que celui qui n'en a jamais eu.
    const a = actionDuJour({ parcours: parcours(['a', 'b']), suggestions: [{ id: 'x', title: 'X' }] });
    assert.equal(a.genre, 'decouverte');
    assert.match(a.titre, /termin/i);
});

test('sans rien à proposer, on ne fabrique pas un bouton vide', () => {
    assert.equal(actionDuJour({ suggestions: [] }), null);
});

// --- La phrase -------------------------------------------------------------

test('la phrase raconte la dernière séance, pas une moyenne', () => {
    const T = midi();
    const t = (n, ok) => Array.from({ length: n }, () => ({ ts: T - JOUR, correct: ok }));
    const p = phraseDuJour({ maintenant: T, tentatives: [...t(18, true), ...t(4, false)] });
    assert.ok(p.includes('18') && p.includes('22'), `phrase inattendue : ${p}`);
    assert.ok(!p.includes('%'), 'un pourcentage est un bulletin, pas une nouvelle');
});

test('trop peu de réponses, ou trop vieilles : on passe à la ligne du jour', () => {
    const T = midi();
    // LA LIGNE DU JOUR N'EST PLUS SEULEMENT UN CONSEIL : quatre genres tournent
    // (voir core/accueil.js). Ce qui compte ici n'est pas LEQUEL sort, c'est
    // qu'on bascule bien dessus faute d'avoir quelque chose à raconter sur
    // l'élève lui-même.
    const duJour = (t) => conseilDuJour(t);
    const rien = phraseDuJour({ maintenant: T, tentatives: [] });
    assert.equal(rien, duJour(T));
    // Quatre réponses ne font pas une séance.
    const quatre = Array.from({ length: 4 }, () => ({ ts: T - 1000, correct: true }));
    assert.equal(phraseDuJour({ maintenant: T, tentatives: quatre }), duJour(T));
    // Et une séance d'il y a une semaine n'est plus « ces derniers jours ».
    const vieilles = Array.from({ length: 20 }, () => ({ ts: T - FENETRE_RECENTE - 1, correct: true }));
    assert.equal(phraseDuJour({ maintenant: T, tentatives: vieilles }), duJour(T));
    assert.equal(bilanRecent(vieilles, T), null);
});

test('le premier jour, on explique le seul geste à connaître', () => {
    const p = phraseDuJour({ maintenant: midi(), premiere: true, tentatives: [] });
    assert.match(p, /robot/i);
    assert.match(p, /indice/i);
});

// --- Les raccourcis --------------------------------------------------------

test('UN RACCOURCI SANS CHIFFRE EST UNE PORTE FERMÉE', () => {
    const r = raccourcisDuJour({
        parcours: parcours(['a']),
        erreurs: [{ id: 1, corrected: false }, { id: 2, corrected: false }],
        nbExercices: 120
    });
    const par = Object.fromEntries(r.map(x => [x.id, x]));
    assert.equal(par.parcours.sous, '1 sur 2');
    assert.equal(par.erreurs.sous, '2 à revoir');
    assert.ok(par.catalogue.sous.includes('120'));
});

test('un carnet vide ne mérite pas sa tuile', () => {
    // Et « Explorer » toute seule non plus : elle doublerait mot pour mot le
    // bouton « Explorer tous les exercices » posé juste dessous.
    assert.deepEqual(raccourcisDuJour({ erreurs: [], nbExercices: 10 }), []);
    // Dès qu'elle a de la compagnie, elle revient : la rangée dit alors les
    // trois endroits où aller.
    const avec = raccourcisDuJour({
        parcours: parcours(['a']), erreurs: [], nbExercices: 10
    });
    assert.deepEqual(avec.map(x => x.id), ['parcours', 'catalogue']);
});

test('UNE TUILE NE RÉPÈTE JAMAIS LA CARTE POSÉE AU-DESSUS D\'ELLE', () => {
    // Rémy : « est-ce que les étoiles, la notification une erreur à revoir et le
    // profil font doublons ? » Ceux-là non, mais celui-ci si : la carte de
    // révision et la tuile « Mes erreurs » disaient le même chiffre, pour le
    // même endroit, l'une collée sous l'autre.
    const erreurs = [{ id: 1, corrected: false }, { id: 2, corrected: false }];
    const plan = planDuJour({ maintenant: midi(), erreurs, nbExercices: 10, suggestions: [{ id: 'x' }] });
    assert.equal(plan.action.genre, 'revision');
    assert.equal(plan.raccourcis.some(r => r.id === 'erreurs'), false);

    // Idem pour le parcours : l'anneau de la carte affiche déjà « 1/2 ».
    const p2 = planDuJour({
        maintenant: midi(), parcours: parcours(['a']), erreurs, nbExercices: 10
    });
    assert.equal(p2.action.genre, 'parcours');
    assert.equal(p2.raccourcis.some(r => r.id === 'parcours'), false);
    // Ce qu'on ne propose PAS, en revanche, garde son raccourci.
    assert.deepEqual(p2.raccourcis.map(r => r.id), ['erreurs', 'catalogue']);

    // Et un parcours TERMINÉ n'est plus l'action du jour : sa tuile revient,
    // pour l'élève qui veut relire ce qu'il a fait.
    const p3 = planDuJour({
        maintenant: midi(), parcours: parcours(['a', 'b']), erreurs: [],
        nbExercices: 10, suggestions: [{ id: 'x', title: 'X' }]
    });
    assert.equal(p3.action.genre, 'decouverte');
    assert.deepEqual(p3.raccourcis.map(r => r.id), ['parcours', 'catalogue']);
});

// --- L'écran entier --------------------------------------------------------

test('l\'accueil propose toujours UNE action, et une seule', () => {
    const T = midi();
    const cas = [
        { parcours: parcours([]), erreurs: [], suggestions: [{ id: 'x' }] },
        { erreurs: [{ id: 1, corrected: false }, { id: 2, corrected: false }], suggestions: [{ id: 'x' }] },
        { suggestions: [{ id: 'x', title: 'X' }] }
    ];
    cas.forEach((f, i) => {
        const plan = planDuJour({ maintenant: T, ...f });
        assert.ok(plan.action, `cas ${i} : pas d'action`);
        assert.ok(plan.action.bouton && plan.action.bouton.length > 2, `cas ${i} : bouton muet`);
        assert.ok(plan.action.titre, `cas ${i} : titre muet`);
        assert.ok(plan.salut && plan.phrase, `cas ${i} : écran muet`);
        // Une seule : le plan ne rend pas une liste d'actions.
        assert.equal(Array.isArray(plan.action), false);
    });
});

test('le premier jour, on souhaite la bienvenue', () => {
    const plan = planDuJour({ maintenant: midi(20), premiere: true, suggestions: [{ id: 'x' }] });
    assert.equal(plan.salut, 'Bienvenue !');
    // Et l'heure ne l'emporte pas sur la première visite.
    assert.notEqual(plan.salut, 'Bonsoir !');
});


// --- LA SÉANCE DU PROFESSEUR ------------------------------------------------
//
// Elle passe avant tout le reste, et c'est la règle la plus importante de cet
// écran : un élève qui arrive le mardi matin a UNE chose à faire, celle qu'on
// lui a donnée. Lui proposer d'abord une révision, c'est le laisser travailler
// sagement la mauvaise chose.

const seance = (x = {}) => ({
    titre: 'Les priorités', classeNom: '5e B', total: 4, faites: 0,
    fini: false, commence: false, close: false, mot: '', ...x
});

test('LA SÉANCE PASSE AVANT LA RÉVISION ET LA DÉCOUVERTE', () => {
    const beaucoupDErreurs = Array.from({ length: 8 },
        (_, i) => ({ id: i, corrected: false }));
    const a = actionDuJour({
        seance: seance(), erreurs: beaucoupDErreurs, suggestions: [{ id: 'x', title: 'X' }]
    });
    assert.equal(a.genre, 'seance');
    assert.equal(a.titre, 'Ta séance du jour');
    assert.equal(a.sous, 'Les priorités · 5e B');
    assert.equal(a.total, 4);
});

test('une séance commencée dit « reprends », pas « commence »', () => {
    const a = actionDuJour({ seance: seance({ faites: 2, commence: true }), erreurs: [] });
    assert.equal(a.titre, 'Reprends ta séance');
    assert.equal(a.bouton, 'Continuer');
    assert.equal(a.faites, 2);
});

test('une séance FINIE rend la place — mais garde sa tuile', () => {
    // La carte est une CHOSE À FAIRE ; un travail terminé n'en est plus une.
    const finie = seance({ faites: 4, commence: true, fini: true });
    const a = actionDuJour({ seance: finie, erreurs: [], suggestions: [{ id: 'x', title: 'X' }] });
    assert.notEqual(a.genre, 'seance');
    const r = raccourcisDuJour({ seance: finie, erreurs: [], action: a });
    const tuile = r.find(t => t.id === 'seance');
    assert.ok(tuile, 'la séance finie a disparu de partout');
    assert.equal(tuile.sous, 'Terminée — bravo');
});

test('la tuile ne répète jamais la carte de la séance', () => {
    const s = seance({ faites: 1, commence: true });
    const a = actionDuJour({ seance: s, erreurs: [] });
    const r = raccourcisDuJour({
        seance: s, parcours: parcours(['a']), erreurs: [], action: a
    });
    assert.equal(r.filter(t => t.id === 'seance' || t.id === 'parcours').length, 0,
        'la carte et la tuile disent deux fois le même chiffre');
});

test('le mot du professeur voyage avec la carte', () => {
    const a = actionDuJour({ seance: seance({ mot: 'Reprends les signes avec moi lundi.' }) });
    assert.equal(a.mot, 'Reprends les signes avec moi lundi.');
});

test('sans séance, l\'accueil est exactement celui d\'avant', () => {
    const T = midi();
    const sans = planDuJour({ maintenant: T, suggestions: [{ id: 'x', title: 'X' }] });
    const nulle = planDuJour({ maintenant: T, seance: null, suggestions: [{ id: 'x', title: 'X' }] });
    assert.deepEqual(nulle, sans);
});
