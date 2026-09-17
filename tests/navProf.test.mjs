// LE PROFESSEUR DOIT POUVOIR AVANCER DANS UN EXERCICE, ET LIRE OÙ IL EN EST.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « on peut tjs pas (par exemple pour le tableau des conversion) en tant
// que prof avancer dans les exercices. Dans le mode téléphone portable, en mode
// apercu, le 1/12 va à la ligne, trouve mieux ».
//
// DEUX CHOSES, MESURÉES SÉPARÉMENT.
//
// 1. AVANCER. La navigation du professeur existait, entièrement construite —
//    ◀◀ 1/10 ▶▶, plus les boutons « répondre juste » et « répondre faux » —
//    mais `allowStepNavigation` n'était posé QUE par le constructeur, quand on
//    teste un parcours. Mesuré en ouvrant « Amis de 10 » depuis le catalogue en
//    mode professeur : les deux barres absentes. Après : la barre des questions
//    est là, et un clic passe de « 1 + ? = 10 » à « 2 + ? = 10 », compteur 1/15
//    puis 2/15.
//
//    LA BARRE DES ACTIVITÉS, ELLE, RESTE CACHÉE quand il n'y a qu'un exercice :
//    elle afficherait « 1/1 » entre deux flèches mortes.
//
//    CE QUE CELA NE COUVRE PAS, ET IL FAUT LE SAVOIR : une activité AUTONOME —
//    le tableau de conversion en est une — n'a pas de questions à compter. Le
//    Runner n'a pas de session pour elle, et la barre des questions reste donc
//    cachée. Son « autre tirage » vit dans le plateau, où l'activité le pose
//    elle-même (« ↺ Autre conversion »), et dans les aperçus par le bouton
//    « Relancer ».
//
// 2. LIRE. Mesuré sur un téléphone de 390 px : le compteur de questions faisait
//    26 px de large pour 26 de haut — DEUX LIGNES — et il avait fallu descendre
//    la police à 9,9 px pour l'y faire tenir. Après : une ligne, 25 px de large,
//    11,8 px de police, et l'en-tête garde exactement la même hauteur (84 px).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const sansCommentaires = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const ENGINE = sansCommentaires(lire('js/games/engine.js'));
const RUNNER = sansCommentaires(lire('js/core/runner.js'));
const CSS = lire('css/modules.css');

test('UN EXERCICE OUVERT PAR LE PROFESSEUR SE PARCOURT', () => {
    assert.match(ENGINE, /allowStepNavigation: state\.isTeacherMode/);
    // Pour l'élève, rien ne change : il n'a pas à sauter ce qu'il n'a pas fait.
    assert.ok(!/allowStepNavigation: true/.test(ENGINE));
});

test('LA BARRE DES ACTIVITÉS SE TAIT QUAND IL N\'Y EN A QU\'UNE', () => {
    assert.match(RUNNER, /const plusieurs = this\.steps && this\.steps\.length > 1;/);
    assert.match(RUNNER, /if \(nav\) nav\.hidden = !this\.allowStepNavigation \|\| !plusieurs;/);
    // Celle des questions, elle, ne dépend que de l'existence d'une session :
    // une activité autonome n'a pas de questions à compter.
    assert.match(RUNNER, /if \(navQ\) navQ\.hidden = !this\.allowStepNavigation;/);
    assert.match(RUNNER, /navQ\.hidden = !this\.session;/);
});

test('UNE FRACTION NE SE COUPE PAS, ET NE S\'ÉCRIT PAS AVEC DES ESPACES', () => {
    // Les espaces coûtaient un quart de la largeur, et c'est cette largeur-là
    // qui a été rendue à la taille du texte plutôt qu'à un retour à la ligne.
    assert.match(RUNNER, /label\.textContent = `\$\{position \+ 1\}\/\$\{this\.steps\.length\}`;/);
    assert.match(RUNNER, /labelQ\.textContent = `\$\{Math\.min\(vue, total\)\}\/\$\{total\}`;/);
    assert.ok(!/\$\{position \+ 1\} \/ \$\{/.test(RUNNER), 'plus d\'espaces autour de la barre');
    assert.match(CSS, /\.preview-step-label \{[\s\S]{0,400}white-space: nowrap;/);
});

test('LE COMPTEUR REDEVIENT LISIBLE SUR TÉLÉPHONE', () => {
    // .62rem valait 9,9 px de haut : on ne lit pas cela d'un coup d'œil en
    // tenant un téléphone, et le rapetisser encore n'était pas une réponse.
    assert.ok(!/font-size: \.62rem/.test(CSS), 'plus aucun compteur à .62rem');
    assert.match(CSS, /#game-layer\.avec-nav-prof \.preview-step-nav--question \.preview-step-label \{\s*\n\s*min-width: 0; font-size: \.74rem;/);
    // Et les majuscules ne servaient à rien : il n'y a que des chiffres.
    assert.ok(!/\.preview-step-nav--question \.preview-step-label \{[^}]*text-transform/.test(CSS));
});
