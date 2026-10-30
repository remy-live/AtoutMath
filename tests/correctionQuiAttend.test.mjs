// QUAND ON DONNE LA RÉPONSE, ON ATTEND QUE L'ÉLÈVE L'AIT LUE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « si je me trompe deux fois, j'ai la solution. Sauf que celle-ci
// disparaît hyper vite, je n'ai pas le temps de la lire et de comprendre. Il
// faudrait mieux et de manière générale si on donne la réponse, attendre le
// bouton valider. »
//
// DEUX RÉGIMES EXISTENT, et c'est le partage entre eux qui était faux :
//   · la carte BLOQUANTE, qui attend « J'ai compris » — sans minuteur ;
//   · la carte ÉPHÉMÈRE, qui s'efface d'elle-même après 2 200 ms.
//
// `core/BaseGame.js` demandait la seconde pour TOUS ses héritiers, au motif que
// « ces jeux tournent en temps réel ». Or son message est « Faux ! <question> =
// <réponse> » : il donne la réponse, puis la reprend.
//
// MESURÉ en cherchant, dans chaque jeu, une boucle qui SE REPROGRAMME ou un
// `setInterval` qui fait avancer le monde (`tools/tmp/boucleContinue.mjs`) :
// 14 modules sur 52 avancent tout seuls — 15 exercices sur 54. Les 38 autres
// (mastermind, logigramme, futoshiki, dictée, conversion, priorités…) n'avaient
// aucune raison de presser l'élève.
//
// LE DÉFAUT EST DONC « ATTENDRE », et c'est le bon sens du côté où l'on se
// trompe : une carte qu'on ferme d'un clic ne coûte qu'un clic, tandis qu'une
// réponse qui file coûte la leçon.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const sansCommentaires = (s) => s
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const BASE = sansCommentaires(lire('js/core/BaseGame.js'));
const RETOUR = sansCommentaires(lire('js/ui/gameFeedbackUI.js'));

test('LE DÉFAUT EST D\'ATTENDRE, PAS DE S\'EFFACER', () => {
    assert.match(BASE, /this\.tempsReel = false;/,
        'tout jeu commence par « je peux attendre »');
    assert.match(BASE, /blocking: !this\.tempsReel/,
        'la carte n\'est éphémère que si le jeu avance tout seul');
    assert.ok(!/blocking: false/.test(BASE),
        'plus de carte éphémère imposée à tout le monde');
});

test('LES DEUX RÉGIMES SONT BIEN DISTINCTS', () => {
    // La carte bloquante n'a pas de minuteur : elle ne part QUE sur un geste.
    // C'est la garantie que Rémy demande, et elle se perd au premier
    // `setTimeout` ajouté par distraction.
    const bloquante = RETOUR.slice(RETOUR.indexOf('function showDismissable'),
        RETOUR.indexOf('function showTransient'));
    assert.ok(!/setTimeout/.test(bloquante),
        'la carte qui donne la réponse ne doit jamais se fermer toute seule');
    assert.match(bloquante, /btn\.onclick = finish;/);
    // Entrée, Espace et Échap ferment aussi : l'élève au clavier ne doit pas
    // avoir à viser un bouton.
    assert.match(bloquante, /e\.key === 'Enter' \|\| e\.key === ' ' \|\| e\.key === 'Escape'/);

    const fugace = RETOUR.slice(RETOUR.indexOf('function showTransient'));
    assert.match(fugace, /setTimeout\(\(\) => \{ close\(card\); done\(\); \}, 2200\);/);
});

test('SEULS LES JEUX QUI AVANCENT TOUT SEULS GARDENT LA CARTE FUGACE', () => {
    // La liste n'est pas tenue à part — elle dériverait. Chaque jeu le déclare
    // chez lui, et ce test compte seulement combien l'ont fait : un écart
    // signale soit un jeu d'arcade qu'on a oublié, soit un jeu calme qu'on
    // presse sans raison.
    const dossier = new URL('../js/games/', import.meta.url);
    const declarent = readdirSync(dossier)
        .filter(f => f.endsWith('.js'))
        .filter(f => /this\.tempsReel = true;/.test(readFileSync(new URL(f, dossier), 'utf8')))
        .map(f => f.replace(/\.js$/, ''))
        .sort();

    const attendus = ['canon', 'course', 'demineur', 'diviseurs', 'duel', 'escadrille',
        'galactic', 'jezzball', 'ninja', 'nova', 'pousseur', 'serpent', 'skweek', 'tetris'];
    assert.deepEqual(declarent, attendus,
        'la liste des jeux en temps réel a changé — mesure-la avant de la corriger '
        + '(tools/tmp/boucleContinue.mjs)');
});

test('LA RÉPONSE DONNÉE PAR LE MOTEUR DE QUESTIONS ATTEND DÉJÀ', () => {
    // Le chemin des exercices à questions (pavé numérique, bulles, saisie) ne
    // passe pas par BaseGame : il annonce sans `blocking`, donc en bloquant.
    // Vérifié au navigateur sur « Des Lettres aux Chiffres », ordinateur et
    // téléphone : la carte porte « cent quarante et un s'écrit 141 » et reste
    // tant qu'on n'a pas cliqué. Ce test garde la propriété qui le permet.
    const session = sansCommentaires(lire('js/core/itemSession.js'));
    assert.match(session, /dismissed = announce\(\{/);
    assert.ok(!/blocking/.test(session),
        'le moteur de questions ne doit jamais demander une carte éphémère');
});
