// UNE PAIRE FAUSSE SE RETOURNE ; ELLE NE SE COMMENTE PAS.
//
// Rémy : « dans le jeu paire, si c'est faux tu attends et retournes les cartes,
// car ce que tu notes n'est pas aidant ».
//
// CE QUI S'AFFICHAIT, MESURÉ DANS LE NAVIGATEUR AVANT CORRECTION : une fenêtre
// « CE N'EST PAS ÇA — Faux ! 9 × 7 = 63 », avec un bouton « J'ai compris », et
// elle était TOUJOURS LÀ deux secondes plus tard. Trois défauts d'un coup :
//
//   · elle annonçait comme une erreur une égalité VRAIE. Le message générique
//     écrit « questionText = expected », et le jeu lui passait le texte ET la
//     réponse de la MÊME carte. Sur une carte-résultat, cela donnait le
//     « 40 = 40 » de la capture de Rémy ; sur une carte-opération, « 9 × 7 =
//     63 », qui est juste ;
//   · elle arrêtait le jeu, alors que le geste du memory est de retourner et
//     de continuer ;
//   · elle n'apprenait rien : se tromper de case n'est pas croire que 4 × 8
//     font 40.
//
// LA TENTATIVE RESTE ENREGISTRÉE. `silencieux` est le chemin que le socle
// prévoit : le score et le journal ne changent pas, seule la fenêtre disparaît.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const JEU = readFileSync(new URL('../js/games/math_memory.js', import.meta.url), 'utf8');
const SOCLE = readFileSync(new URL('../js/core/BaseGame.js', import.meta.url), 'utf8');

test('UNE PAIRE FAUSSE N\'OUVRE PLUS DE FENÊTRE', () => {
    // Le bloc qui traite la non-correspondance.
    const i = JEU.indexOf('DEUX CARTES QUI NE VONT PAS ENSEMBLE');
    assert.ok(i > 0, 'le cas de la paire fausse doit être écrit et expliqué');
    const bloc = JEU.slice(i, i + 2600);
    assert.match(bloc, /silencieux: true/,
        'la tentative s\'enregistre, mais rien ne s\'ouvre');

    // ET LE SOCLE DOIT ENCORE HONORER CE DRAPEAU. Un essai qui ne tient que le
    // côté appelant laisserait passer la refonte qui retire `silencieux` de
    // BaseGame : le jeu le passerait toujours, et la fenêtre reviendrait.
    assert.match(SOCLE, /if \(!snapshot\.silencieux &&/,
        'BaseGame doit continuer de se taire quand on le lui demande');
    assert.match(SOCLE, /state\.recordAttempt\(/,
        'et d\'enregistrer la tentative dans tous les cas');
});

test('CE QU\'ON NOTE DIT VRAI, ET SEULEMENT QUAND IL Y A QUELQUE CHOSE À DIRE', () => {
    const i = JEU.indexOf('DEUX CARTES QUI NE VONT PAS ENSEMBLE');
    const bloc = JEU.slice(i, i + 2600);

    // Une paire, c'est une opération et son résultat : l'ordre des deux clics
    // ne dit rien, donc on range les cartes avant d'écrire.
    assert.match(bloc, /cartes\.find\(c => c\.type === 'question'\)/,
        'la carte-opération se cherche, elle ne se déduit pas de l\'ordre des clics');

    // LE CAS QUE J'ALLAIS MANQUER : le plateau porte les deux sortes de cartes,
    // et retourner « 40 » puis « 32 » est une erreur de mémoire parfaitement
    // possible. Il n'y a alors AUCUNE opération à mettre en face, et ma
    // première version prenait la seconde carte par défaut — elle réécrivait
    // la même absurdité, « 32 = 32 » au lieu de « 40 = 40 ».
    assert.match(bloc, /carteQuestion \? \{/,
        'sans carte-opération, on n\'écrit pas de couple question/réponse');
    assert.doesNotMatch(bloc, /questionText: this\.firstPick\.data\.text/,
        'on n\'écrit plus le texte de la première carte venue');
});

test('LE COMPTEUR D\'ÉTAPE NE FAIT PLUS DOUBLON AVEC LA FRISE', () => {
    // Rémy, sur les quatre bandes du haut : « le 2 » — retirer le doublon.
    // « Étape 1 sur 10 » est écrit dans la frise ; le répéter « 1/10 » à côté
    // d'un AUTRE « 1/10 » qui compte les questions rendait les deux illisibles.
    const HTML = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    const RUNNER = readFileSync(new URL('../js/core/runner.js', import.meta.url), 'utf8');

    assert.doesNotMatch(HTML, /id="preview-step-label"/,
        'le compteur d\'étape a fondu dans la frise');
    // LE COMPTEUR DES QUESTIONS RESTE : « 48/167 » n'est écrit nulle part
    // ailleurs, et c'est la seule façon de savoir où l'on en est dans un jeu
    // qui enchaîne ses questions tout seul.
    assert.match(HTML, /id="preview-question-label"/,
        'celui des questions, lui, dit quelque chose qu\'aucune autre bande ne dit');

    // ET LE GARDE-FOU DU MENEUR NE DOIT PLUS L'EXIGER. Il rendait la main dès
    // qu'un des trois éléments manquait : retirer le libellé aurait emporté
    // avec lui la mise à jour des flèches ET celle de la navigation par
    // question, vingt lignes plus bas.
    assert.doesNotMatch(RUNNER, /if \(!label \|\| !prev \|\| !next\) return;/,
        'le meneur ne doit plus s\'arrêter faute d\'un libellé qui n\'existe plus');
    assert.match(RUNNER, /if \(!prev \|\| !next\) return;/,
        'il garde en revanche son garde-fou sur les deux flèches');
});
