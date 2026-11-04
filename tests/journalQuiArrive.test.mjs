// LE JOURNAL QUI ARRIVE D'AILLEURS DOIT PRÉVENIR LES ÉCRANS.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 4 novembre : « j'ai aussi fait une séance avec les élèves et en allant
// dans le profil d'une élève je vois que dans mes progès, elle n'a rien », puis
// aussitôt : « en fait ca n'apparait pas tout de suite ».
//
// CE N'ÉTAIT PAS UN DÉLAI. MESURÉ par `tools/mesProgresApresLaSeance.mjs`, sur
// un appareil qui reçoit la séance du serveur : les trente-cinq tentatives
// étaient dans le journal, et « Mes progrès » affichait encore « Joue à
// quelques exercices » quinze secondes plus tard. Il l'aurait affiché toute la
// soirée — seul un rechargement remettait la vérité.
//
// LES ÉCRANS SE REDESSINENT SUR QUATRE ÉVÉNEMENTS, que seule une action LOCALE
// émettait. Un journal qui redescend du serveur vidait le cache et ne prévenait
// personne.
//
// CE QU'ON GARDE ICI EST L'ANNONCE, pas le dessin : le dessin se regarde, et la
// sonde le regarde. L'annonce, elle, est une ligne qu'on peut retirer sans que
// rien ne casse — et c'est précisément ce qui s'était passé.

import './busDOM.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attempt } from './helpers.mjs';
import '../js/core/state.js';
import { journal } from '../js/core/journal.js';

const ANNONCES = ['attempts_updated', 'score_updated', 'errors_updated', 'badges_updated'];

/** Compte les annonces émises pendant `faire()`. */
function pendant(faire) {
    const vus = Object.fromEntries(ANNONCES.map(n => [n, 0]));
    const fs = ANNONCES.map(n => {
        const f = () => { vus[n]++; };
        document.addEventListener(n, f);
        return [n, f];
    });
    try { faire(); } finally { fs.forEach(([n, f]) => document.removeEventListener(n, f)); }
    return vus;
}

test('UN JOURNAL QUI REDESCEND DU SERVEUR PRÉVIENT LES ÉCRANS', () => {
    const vus = pendant(() => {
        const combien = journal.merge([attempt({ correct: false }), attempt()]);
        assert.ok(combien > 0, 'rien n\'a été fusionné : l\'épreuve ne mesure rien');
    });
    // LES QUATRE, ET NON UNE SEULE : chaque écran écoute la sienne. « Mes
    // progrès » suit `attempts_updated`, la barre du haut `score_updated`, le
    // carnet `errors_updated`, les médailles `badges_updated`. En oublier une
    // laisse un écran en arrière, et c'est celui-là qu'on ne regarde jamais.
    for (const n of ANNONCES) {
        assert.ok(vus[n] >= 1, `${n} n'a pas été annoncé : son écran restera figé`);
    }
});

test('MAIS UNE FUSION QUI N\'APPORTE RIEN NE REDESSINE RIEN', () => {
    // `syncNow` tourne toutes les cinq minutes et ne rapporte le plus souvent
    // aucun événement. Repeindre quatre écrans pour zéro nouveauté serait du
    // travail pur — et sur la tablette de l'élève, ce travail se voit.
    //
    // ON ÉMET L'ÉVÉNEMENT À LA MAIN, et c'est `tools/epreuveTombe.mjs` qui l'a
    // imposé. Écrite avec `journal.merge([])`, cette épreuve restait VERTE en
    // retirant la ligne qu'elle prétend garder : `journal.js` n'annonce déjà
    // rien quand il n'ajoute rien, donc le garde-fou n'était jamais atteint.
    // Une épreuve verte qui ne garde rien donne une assurance qui n'existe
    // pas.
    const vus = pendant(() => {
        document.dispatchEvent(new CustomEvent('journal_merged', { detail: { added: 0 } }));
    });
    for (const n of ANNONCES) assert.equal(vus[n], 0, `${n} a été annoncé pour rien`);
});

test('ET UN CHANGEMENT DE PROFIL REDESSINE TOUT, MÊME SANS RIEN AJOUTER', () => {
    // Changer de profil remet le journal à zéro et le remplit d'un autre
    // travail : `journal.js` annonce alors `{ added: 0, reset: true }`. Sans le
    // `reset`, les écrans garderaient le dessin de l'élève PRÉCÉDENT — ce qui
    // est pire que de ne rien montrer.
    const vus = pendant(() => {
        document.dispatchEvent(new CustomEvent('journal_merged',
            { detail: { added: 0, reset: true } }));
    });
    for (const n of ANNONCES) {
        assert.ok(vus[n] >= 1, `${n} n'a pas été annoncé : l'écran garde le profil d'avant`);
    }
});
