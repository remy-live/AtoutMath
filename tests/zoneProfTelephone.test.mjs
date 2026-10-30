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

test('LA BARRE DE FILTRES TIENT SUR UNE LIGNE, ET LE RANGEMENT N\'Y EST PLUS', () => {
    // CE QUE CET ESSAI GARDAIT AVANT : que le niveau et le rangement soient
    // VOISINS dans le document, pour tenir côte à côte sur téléphone.
    //
    // CE QU'IL GARDE DEPUIS LE 28 SEPTEMBRE : que le rangement n'y soit PLUS.
    // Rémy, devant la colonne : « ça prend de la place quand même ne code
    // rien ». Mesuré sur 1440 × 900 : 287 px avant le premier exercice, soit
    // six exercices de 48 px. Le bandeau gris écrivant déjà « Domaines » ou
    // « Chapitres », la bande de boutons a fondu dedans — et la ligne ainsi
    // libérée a permis de mettre Clic/Arbre à côté du niveau. Mesuré après :
    // 176 px, deux exercices et demi de plus.
    const debut = HTML.indexOf('class="sidebar-top-controls"');
    const fin = HTML.indexOf('id="sidebar-search-wrap"');
    const dedans = HTML.slice(debut, fin);
    assert.ok(debut > 0 && fin > debut, 'les deux repères doivent exister, dans cet ordre');
    assert.doesNotMatch(dedans, /id="rangement-bascule"/,
        'la bande du rangement a fondu dans le fil d\'Ariane : elle ne doit pas revenir');
    assert.match(UI, /\.sidebar-top-controls \{[^}]*flex-direction: row/,
        'la barre de filtres tient sur une ligne, sur téléphone comme sur ordinateur');
});

test('LA BASCULE DU RANGEMENT EST ATTEIGNABLE DANS LES DEUX VUES', () => {
    // LE PIÈGE ÉVITÉ DE JUSTESSE, et il mérite son essai : le fil d'Ariane
    // vivait DANS `#view-drilldown`. Y poser la bascule sans l'en sortir
    // l'aurait rendue introuvable en vue « Arbre » — et le professeur n'aurait
    // même pas su qu'un rangement existait.
    const fil = HTML.indexOf('id="breadcrumb"');
    const vue = HTML.indexOf('id="view-drilldown"');
    assert.ok(fil > 0, 'le fil d\'Ariane doit exister');
    assert.ok(fil < vue,
        'le fil d\'Ariane doit être AVANT la vue « Clic », donc hors d\'elle : '
        + 'sinon la bascule disparaît en vue « Arbre »');
    assert.match(HTML, /id="rangement-fil"/, 'la pastille de rangement est dans le fil');
    // ET ELLE DIT OÙ L'ON VA, pas où l'on est : une pastille unique qui
    // afficherait « Domaines » alors qu'on y est déjà ne veut rien dire.
    const nav = readFileSync(new URL('../js/ui/navigation.js', import.meta.url), 'utf8');
    assert.match(nav, /RANGEMENTS\.CHAPITRE \? 'Domaines' : 'Chapitres'/,
        'la pastille porte le nom de l\'AUTRE rangement');
    assert.match(nav, /function peindreFil/,
        'le fil doit savoir se peindre en vue « Arbre », où il n\'a pas de chemin');
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
