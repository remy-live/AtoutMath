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
    assert.match(FIL, /el\.onclick = meneur \?/);
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
