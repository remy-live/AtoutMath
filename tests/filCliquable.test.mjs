// LE FIL DE LA SÉANCE SE CLIQUE — POUR LE PROFESSEUR, ET POUR LUI SEUL.
//
// Rémy, devant un parcours de trente-cinq exercices qu'il essayait : « on
// pourrait cliquer les pastilles à droite de "Nombres et calculs — 35
// exercices" ». Pendant un essai, l'en-tête n'offre que « ‹ 1/35 › » — deux
// flèches qui avancent d'un cran : atteindre le trentième demande vingt-neuf
// clics, et l'on dépasse celui qu'on cherchait.
//
// MAIS LE FIL EST D'ABORD CELUI DE L'ÉLÈVE, et là il ne doit PAS cliquer :
// « sauter à l'étape 4 sans avoir fait les trois premières, c'est ce que le
// meneur refuse déjà ». Le drapeau qui départage existe déjà et sert déjà aux
// deux flèches — `allowStepNavigation`. On le LIT, on ne le refait pas : les
// deux ne peuvent donc pas diverger.
//
// Mesuré dans le navigateur, sur un parcours de cinq étapes : chez le
// professeur les cases sont des BUTTON, le fil porte `fil--pilotable`, et un
// clic posé SEPT PIXELS AU-DESSUS du ruban de huit pixels fait passer le
// meneur de l'étape 1 à l'étape 4. Chez l'élève, ce sont des SPAN.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { readFileSync } from 'node:fs';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const FIL = lire('js/ui/filSeance.js');
const CSS = lire('css/games.css');

test('LE FIL NE CLIQUE QUE LÀ OÙ LES FLÈCHES CLIQUENT', () => {
    // On lit le drapeau du meneur, on n'invente pas une seconde règle.
    assert.match(FIL, /r\.allowStepNavigation && typeof r\.goToStep === 'function'/);
    // Et l'on saute par le chemin que le meneur connaît déjà : `goToStep`
    // refuse tout seul hors essai, ce qui fait une seconde serrure.
    assert.match(FIL, /r\.goToStep\(Number\(b\.dataset\.rang\)\)/);
});

test('UNE CASE QUI SE CLIQUE EST UN BOUTON, PAS UN SPAN', () => {
    // Un `span` avec un gestionnaire serait cliquable à la souris et invisible
    // au clavier comme au lecteur d'écran.
    assert.match(FIL, /<button type="button" class="\$\{classes\}" data-rang=/);
    assert.match(FIL, /aria-label="\$\{esc\(dit\)\}"/);
    // Chez l'élève, la case reste un span muet.
    assert.match(FIL, /return `<span class="\$\{classes\}"/);
});

test('LE GESTIONNAIRE EST SUR LE FIL, PAS SUR TRENTE-CINQ CASES', () => {
    // `innerHTML` remplace toutes les cases à chaque réponse : rebrancher
    // trente-cinq boutons deux fois par question serait du travail pour rien,
    // et surtout une occasion d'en oublier.
    //
    // ─────────────────────────────────────────────────────────────────────
    // CETTE ÉPREUVE EXIGEAIT `el.onclick = meneur ?`, ET C'ÉTAIT TROP PRÉCIS.
    //
    // Le gestionnaire n'est plus conditionnel : depuis que le fil porte les
    // mots du professeur, il est posé TOUJOURS — la case d'un mot se clique
    // même sans pilotage, parce que l'élève doit pouvoir le relire (Rémy :
    // « oui, il reste dans le fil »). Ce que l'épreuve devait garder n'était
    // pas la condition, c'était qu'il y ait UN gestionnaire, et sur le FIL.
    //
    // On garde donc l'intention, et de deux côtés : un `onclick` sur `el`, et
    // AUCUN sur les cases que `innerHTML` recrée.
    assert.match(FIL, /el\.onclick = \(ev\) =>/);
    assert.doesNotMatch(FIL, /\.fil-pas[^\n]*\.onclick/,
        'une case qui porte son propre gestionnaire le perd au prochain rendu');
    // L'aiguillage se fait par `closest`, sur le fil, donc une seule fois.
    assert.match(FIL, /ev\.target\.closest\('\[data-rang\]'\)/);
    assert.match(FIL, /el\.classList\.toggle\('fil--pilotable', !!meneur\)/);
});

test('ON NE VISE PAS HUIT PIXELS', () => {
    // La case fait huit pixels de haut — c'est un ruban, pas un bouton. La
    // zone de clic déborde donc de neuf pixels en haut et en bas, soit les
    // vingt-six du fil, sans que rien ne bouge à l'écran.
    assert.match(CSS, /\.fil--pilotable \.fil-pas::before \{[\s\S]{0,140}inset: -9px 0/);
    // Il a fallu rendre son débordement visible à la case : `overflow: hidden`
    // aurait recoupé la zone de clic à la hauteur du ruban.
    assert.match(CSS, /\.fil--pilotable \.fil-pas \{[\s\S]{0,160}overflow: visible/);
    // Et le clavier voit où il est.
    assert.match(CSS, /\.fil--pilotable \.fil-pas:focus-visible/);
});

// ── OÙ L'ON EN EST — ET CE N'EST PAS LA MÊME QUESTION DES DEUX CÔTÉS ────────

test('LE BANDEAU DIT L\'ÉTAPE REGARDÉE QUAND C\'EST LE PROFESSEUR QUI PILOTE', async () => {
    const { ouEnEstOn } = await import('../js/ui/filSeance.js');
    // L'ÉLÈVE : on compte ce qu'il a TERMINÉ. Il a fini la première, il est à
    // la deuxième — c'est la bonne mesure, et on n'y touche pas.
    assert.equal(ouEnEstOn({ etapes: 3, faites: 1 }, null), 'Étape 2 sur 3');
    assert.equal(ouEnEstOn({ etapes: 3, faites: 0 }, null), 'Étape 1 sur 3');

    // LE PROFESSEUR : il n'a rien terminé, il a SAUTÉ. Le compte des étapes
    // faites reste à zéro quelle que soit celle qu'il regarde — d'où le
    // « Étape 1 sur 3 » affiché au-dessus de la TROISIÈME, que Rémy a vu.
    assert.equal(ouEnEstOn({ etapes: 3, faites: 0 }, { index: 2 }), 'Étape 3 sur 3');
    assert.equal(ouEnEstOn({ etapes: 5, faites: 0 }, { index: 3 }), 'Étape 4 sur 5');

    // ET L'APERÇU LE DIT EN TOUTES LETTRES : « Étape 3 sur 3 » tout seul
    // laisserait croire qu'on est à la fin d'une séance en cours.
    assert.equal(ouEnEstOn({ etapes: 3, faites: 0 }, { index: 2, apercuDUneEtape: true }),
        'Aperçu — étape 3 sur 3');

    // ON NE DÉBORDE JAMAIS DU TOTAL, d'où qu'on lise le rang.
    assert.equal(ouEnEstOn({ etapes: 2, faites: 9 }, null), 'Étape 2 sur 2');
    assert.equal(ouEnEstOn({ etapes: 2, faites: 0 }, { index: 9 }), 'Étape 2 sur 2');
});
