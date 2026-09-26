// LA ZONE DU PROFESSEUR SUR TÉLÉPHONE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, trois captures d'un iPhone : « La zone prof en portable est horrible et
// quand on déroule le tiroir les exercices sont quasi inaccessibles et quelle
// place perdue en haut et il y a des choses tronquées ».
//
// MESURÉ sur un écran de 390 × 844 (`tools/tmp/sondeProfTel.mjs`) :
//
//                                          avant      après
//   barre du haut                          149 px     99 px   (3 rangées → 2)
//   place laissée au contenu               635 px    685 px   (75 % → 81 %)
//   tiroir : avant le premier exercice     396 px    328 px
//   exercices visibles en entier (sur 172)      4          8
//   menu « ⋯ » : bord gauche              −188 px      8 px   (242 px de large)
//
// LE MENU ÉTAIT LE PLUS NET : aligné à droite de son bouton (`right: 0`), et ce
// bouton est à dix pixels du bord GAUCHE — le panneau partait donc à −188, et
// l'on ne lisait que « …urer » et « …sseur ». C'est ce que montre sa capture.
//
// Les mesures se refont au navigateur ; ici on tient les DÉCISIONS, parce
// qu'une mise en page se défait sans bruit à la première règle ajoutée.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const sansCommentaires = (s) => s
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    .replace(/<!--[\s\S]*?-->/g, '');

const LAYOUT = sansCommentaires(lire('css/layout.css'));
const UI = sansCommentaires(lire('css/ui.css'));
const APP = sansCommentaires(lire('js/app.js'));
const HTML = sansCommentaires(lire('index.html'));

test('LA BARRE DU HAUT TIENT EN DEUX RANGÉES, PAS TROIS', () => {
    // La cause était l'ORDRE du document : les onglets du professeur sont au
    // milieu et prennent toute la largeur, ce qui rejetait le groupe d'icônes —
    // pourtant court — sur une troisième ligne. On les descend en dernier.
    assert.match(UI, /body\.mobile-view\.teacher-mode #top-navbar \.nav-left \{ order: 1; \}/);
    assert.match(UI, /body\.mobile-view\.teacher-mode #top-navbar \.nav-right \{ order: 2; \}/);
    assert.match(UI, /body\.mobile-view\.teacher-mode #top-navbar \.nav-center--prof \{ order: 3; \}/);
    // `order` ne touche pas au document : la lecture d'écran et la tabulation
    // gardent l'ordre d'origine. C'est pour cela qu'on ne déplace pas le HTML.
    assert.ok(HTML.indexOf('nav-center') < HTML.indexOf('nav-right'),
        'le document garde l\'ordre gauche → centre → droite');
});

test('LE PLEIN ÉCRAN S\'EFFACE POUR LE PROFESSEUR SUR TÉLÉPHONE', () => {
    // Mesuré : 178 px à gauche et 218 à droite font 396, pour 370 disponibles.
    // Vingt-six de trop, et la barre repassait à trois lignes. Ce bouton-ci ne
    // fait rien sur l'iPhone de Rémy — Safari iOS n'ouvre pas le plein écran —
    // et un professeur qui prépare un parcours ne cherche pas à masquer sa
    // propre barre d'outils. L'élève, lui, le garde.
    assert.match(UI, /body\.mobile-view\.teacher-mode #top-navbar #btn-fullscreen \{ display: none; \}/);
    assert.ok(!/body\.mobile-view #top-navbar #btn-fullscreen \{ display: none/.test(UI),
        'l\'élève doit garder le plein écran');
});

test('LE TIROIR OUVERT PREND L\'ÉCRAN', () => {
    // 64 % laissait 144 px de liste : quatre exercices sur cent soixante-douze.
    assert.match(LAYOUT, /height: 78vh; height: min\(78dvh, 720px\);/);
    assert.ok(!/min\(64dvh/.test(LAYOUT), 'l\'ancienne hauteur ne doit plus traîner');
    // Fermé, rien ne change : on ne voit que la poignée.
    assert.match(LAYOUT, /transform: translateY\(calc\(100% - var\(--tiroir-poignee\)\)\);/);
});

test('OUVERT, LE TIROIR NE RÉPÈTE PLUS SON NOM', () => {
    // « 📚 Catalogue d'exercices » sert quand il est fermé et qu'il faut deviner
    // ce qui se cache dessous ; ouvert, les onglets disent déjà « Exercices ».
    assert.match(LAYOUT, /#sidebar\.drawer-open \.drawer-label \{ display: none; \}/);
    assert.match(LAYOUT, /#sidebar\.drawer-open \.drawer-handle \{ padding: 8px 0 6px; \}/);
});

test('LES DEUX FILTRES PARTAGENT UNE LIGNE SUR TÉLÉPHONE', () => {
    // Le niveau et le rangement répondent à deux questions voisines, et chacun
    // tenait sa propre bande. Il faut qu'ils soient VOISINS dans le document
    // pour pouvoir se ranger côte à côte : une colonne flex ne sait pas réunir
    // deux bandes séparées par une troisième.
    const debut = HTML.indexOf('class="sidebar-top-controls"');
    const fin = HTML.indexOf('id="sidebar-search-wrap"');
    const dedans = HTML.slice(debut, fin);
    assert.ok(debut > 0 && fin > debut, 'les deux repères doivent exister, dans cet ordre');
    assert.match(dedans, /id="rangement-bascule"/,
        'le rangement doit être DANS la barre de filtres, avant la recherche');
    assert.match(UI, /body\.mobile-view \.sidebar-top-controls \{ flex-direction: row;/);
});

test('LE MENU « ⋯ » RENTRE DANS L\'ÉCRAN', () => {
    // Le bug que Rémy photographie : 242 px de panneau posés à x = −188, dont
    // 54 visibles — d'où « …urer » et « …sseur ».
    assert.match(APP, /const rentrerDansLEcran = \(\) => \{/);
    // On corrige APRÈS coup, une fois qu'on peut mesurer : c'est la seule façon
    // de traiter les deux bords et toutes les largeurs sans cas particuliers.
    assert.match(APP, /if \(b\.left < marge\) \{/);
    assert.match(APP, /else if \(b\.right > window\.innerWidth - marge\) \{/);
    // Et le décalage se compte dans le PARENT positionné, pas dans la page.
    assert.match(APP, /const parent = liste\.offsetParent \|\| liste\.parentElement;/);
    // Rouvrir n'est pas la seule occasion de déborder : tourner le téléphone
    // aussi.
    assert.match(APP, /window\.addEventListener\('resize', \(\) => \{ if \(!liste\.hidden\) rentrerDansLEcran\(\); \}\);/);
});

test('CE QUI PASSE DERRIÈRE LE TIROIR SE LIT COMME UN ARRIÈRE-PLAN', () => {
    // Le tiroir ouvert laisse une trentaine de pixels du parcours au-dessus, et
    // l'on y voyait la MOITIÉ d'un titre. Ce n'est pas un texte coupé par
    // erreur, mais ça se voit pareil — « il y a des choses tronquées ».
    assert.match(APP, /document\.body\.classList\.toggle\('tiroir-ouvert', ouvert\);/);
    assert.match(LAYOUT, /body\.mobile-view\.teacher-mode\.tiroir-ouvert #app-body::after \{/);
    // Le voile ne doit pas voler les appuis destinés au tiroir.
    assert.match(LAYOUT, /body\.mobile-view\.teacher-mode\.tiroir-ouvert #app-body::after \{[\s\S]{0,400}pointer-events: none;/);
});
