// CE QUE COMPTE LE COMPTEUR.
//
// Rémy, à propos des Amis de Dix : « est-ce qu'on considère qu'on a répondu à
// une question quand on a relié deux cartes, ou toutes les cartes présentées ?
// Une vraie question pour la plupart des exercices. »
//
// Elle l'est. « 3 / 10 » au-dessus d'un plateau de six paires, d'une grille de
// sudoku ou d'une partie de dames ne dit pas la même chose à chaque fois, et
// rien à l'écran ne tranchait. Le compteur, lui, ne change pas : une paire,
// une grille, une partie sont bien les bonnes unités de travail. Ce qui
// manquait, c'était de le DIRE.
//
// Ce que ce fichier vérifie : chaque activité nomme une unité, l'accord au
// pluriel est correct, et les exercices dont l'unité N'EST PAS une question la
// déclarent bien — sans quoi la correction serait invisible là où elle sert.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import '../js/core/activities/index.js';
import { uniteDe, getActivity } from '../js/core/registry.js';
import { exercices } from '../js/data/catalog.js';
import { questionsConseillees } from '../js/core/duree.js';

test('toute activité a une unité, et elle s\'accorde', () => {
    const vus = new Set(exercices.map(e => e.activityId));
    vus.forEach(id => {
        const a = getActivity(id);
        if (!a) return;
        assert.equal(typeof a.unite, 'string');
        assert.ok(a.unite.length > 2, `unité douteuse pour ${id} : « ${a.unite} »`);
        // Au singulier, rien d'ajouté ; au pluriel, une marque du pluriel.
        assert.equal(uniteDe(id, 1), a.unite);
        const pluriel = uniteDe(id, 7);
        assert.match(pluriel, /[sxz]$/,
            `le pluriel de « ${a.unite} » (${id}) ne porte pas de marque : ${pluriel}`);
        assert.ok(pluriel.length >= a.unite.length, `${id} : le pluriel a raccourci`);
    });
});

test('LE PLURIEL DES UNITÉS EST DU FRANÇAIS, PAS UN « S » COLLÉ', () => {
    // L'en-tête affichait « 0 / 4 tableaus ». Le pluriel se fabriquait en
    // ajoutant un « s » à tout — ce qui touchait aussi le Tableau de
    // Proportionnalité, qui compte lui aussi des tableaux. C'est ce qu'un élève
    // lit à chaque question, alors on le vérifie mot par mot.
    assert.equal(uniteDe('tableau-croise', 4), 'tableaux');
    assert.equal(uniteDe('proportion', 6), 'tableaux');
    assert.equal(uniteDe('dix', 24), 'paires');
    assert.equal(uniteDe('othello', 2), 'parties');
    assert.equal(uniteDe('problemes', 6), 'problèmes');
    assert.equal(uniteDe('compte-est-bon', 5), 'tirages');
    // Un mot déjà au pluriel ne prend rien de plus.
    assert.equal(uniteDe('sudoku', 1), 'grille');
});

test('LES UNITÉS QUI NE SONT PAS DES QUESTIONS SONT NOMMÉES', () => {
    // La liste est explicite à dessein : c'est elle qu'on relit quand on
    // ajoute un jeu où « une question » ne veut rien dire.
    const attendu = {
        dix: 'paire', memory: 'paire',
        sudoku: 'grille', kenken: 'grille', binairo: 'grille', garam: 'grille',
        futoshiki: 'grille', slitherlink: 'grille', hexagrille: 'grille',
        'carre-magique': 'grille', logigramme: 'grille', demineur: 'grille',
        othello: 'partie', dames: 'partie', echecs: 'partie',
        pipopipette: 'partie', puissance4: 'partie', sim: 'partie',
        'course-vecteurs': 'course', ville: 'trajet', pizza: 'commande',
        tangram: 'figure', quadrillage: 'figure', relier: 'figure',
        'compte-est-bon': 'tirage', dominos: 'domino', problemes: 'problème',
        'poser-operation': 'opération', duel: 'échange',
        // L'École du Tableur compte des RÉUSSITES, pas des formules : ses
        // quatre premières leçons portent sur le repérage des cases, où il n'y
        // a pas la moindre formule à écrire. Vingt-sept réussites, c'est
        // l'école entière — « il faut faire le parcours en entier ».
        tableur: 'réussite'
    };
    Object.entries(attendu).forEach(([id, u]) => {
        const a = getActivity(id);
        assert.ok(a, `activité inconnue : ${id}`);
        assert.equal(a.unite, u, `${id} devrait compter des ${u}s`);
    });
});

test('l\'unité par défaut reste « question »', () => {
    assert.equal(getActivity('bubbles').unite, 'question');
    assert.equal(getActivity('numpad').unite, 'question');
    assert.equal(uniteDe('activité-qui-n-existe-pas', 3), 'questions');
});

test('un mot déjà terminé par s ou x ne double pas sa marque', () => {
    // Aucun aujourd'hui, mais la règle doit tenir le jour où il y en aura un.
    assert.equal(uniteDe('bubbles', 0), 'question');
});

// --- Combien d'unités font une séance ---------------------------------------

test('DIX N\'EST PLUS LE COMPTE DE TOUT LE MONDE', () => {
    // « Mais du coup 10 paires, c'est très court. » Dix était le nombre de
    // QUESTIONS, et il valait pour tout le monde tant que personne ne
    // regardait ce qu'il comptait.
    const q = (id) => questionsConseillees(null, {}, { activite: id });
    assert.ok(q('dix') >= 20, 'les paires se comptent par dizaines');
    assert.ok(q('memory') >= 12);
    assert.equal(q('sudoku'), 3);
    assert.equal(q('echecs'), 1, 'une partie d\'échecs EST la séance');
    assert.equal(q('course-vecteurs'), 3);
    assert.equal(q('bubbles'), 10, 'une question reste une question');
});

test('L\'ESCALIER DE L\'AIDE NE S\'IMPOSE PAS AUX PARTIES', () => {
    // Il demande sept réponses pour avoir le temps de monter : sept parties
    // d'échecs ne sont pas une séance, ce sont des vacances.
    assert.equal(questionsConseillees(null, {}, { activite: 'echecs' }), 1);
    assert.equal(questionsConseillees(null, {}, { activite: 'sudoku' }), 3);
    // Là où l'on compte des questions, le plancher tient toujours.
    assert.ok(questionsConseillees(null, {}, { activite: 'bubbles' }) >= 7);
});

test('une progression du générateur peut encore RELEVER le compte', () => {
    // Le compte de l'activité est un point de départ, pas un plafond : un
    // générateur qui annonce douze marches en demande vingt-quatre.
    const gen = { conseil: () => 24 };
    assert.equal(questionsConseillees(gen, {}, { activite: 'bubbles' }), 24);
    assert.equal(questionsConseillees(gen, {}, { activite: 'sudoku' }), 24);
});
