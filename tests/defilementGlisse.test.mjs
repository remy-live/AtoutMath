// DÉFILER PENDANT QU'ON GLISSE, ET LE FANTÔME QUI NE CACHE PLUS LA CIBLE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, trois remarques du même geste :
//
//   « je trouve que le fantôme lorsqu'on drag drop est vraiment trop »
//   « Dans le toast où tu proposes de régler l'exercice, le régler ne
//     fonctionne pas, mais ne le mets pas. On règle en cliquant. »
//   « On ne peut pas dragger tout en bas ou tout en haut juste avec les
//     éléments visible à l'écran. »
//
// MESURÉ SUR UN PARCOURS DE QUATORZE ÉTAPES, fenêtre de 1440 × 800 : la zone
// qui défile est `#builder-center-col`, 690 px visibles pour 1 575 de contenu.
// Rien ne la faisait bouger pendant un glissement : on ne pouvait donc déposer
// que dans les 690 px sous les yeux — et comme lâcher DÉPOSE, aller voir plus
// loin obligeait d'abord à déposer au mauvais endroit.
//
// APRÈS : viser le bas fait descendre de 516 px en sept dixièmes de seconde,
// viser le haut ramène à 0, viser le milieu ne fait rien, et la butée ne force
// pas. Le comportement complet se vérifie au navigateur
// (tools/tmp/sondeDefilementGlisse.mjs) ; ici on tient les décisions.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const sansCommentaires = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const DEF = sansCommentaires(lire('js/ui/defilementGlisse.js'));
const NAV = sansCommentaires(lire('js/ui/navigation.js'));
const BUILDER = sansCommentaires(lire('js/ui/builder.js'));
const CSS = lire('css/modules.css');

test('UN SEUL MODULE POUR LES DEUX GESTES', () => {
    // Le glisser de la souris (API HTML5) et celui du doigt (Pointer Events
    // refaits à la main) n'ont en commun qu'un pointeur et une position. Deux
    // implémentations du même défilement finiraient par diverger — l'une
    // réglée, l'autre oubliée.
    assert.match(NAV, /import \{ pendantLeGlissement, arreterLeDefilement, brancherDefilementGlisse \}/);
    // Au doigt : à chaque mouvement.
    assert.match(NAV, /pendantLeGlissement\(e\.clientX, e\.clientY\);/);
    // À la souris : sur le DOCUMENT, parce que `dragover` ne va qu'aux éléments
    // qui l'acceptent, et l'on veut défiler où que le curseur passe.
    assert.match(DEF, /doc\.addEventListener\('dragover', \(e\) => pendantLeGlissement\(e\.clientX, e\.clientY\), true\);/);
    assert.match(NAV, /brancherDefilementGlisse\(\);/);
});

test('ON S\'ARRÊTE QUAND LE GESTE S\'ARRÊTE', () => {
    // Un défilement qui survit au lâcher emporterait la page toute seule.
    assert.match(NAV, /arreterLeDefilement\(\);/);
    assert.match(DEF, /doc\.addEventListener\('dragend', arreterLeDefilement, true\);/);
    assert.match(DEF, /doc\.addEventListener\('drop', arreterLeDefilement, true\);/);
    // Et PAS sur `dragleave` : il part aussi quand on survole un enfant, et
    // l'on s'arrêterait au milieu du geste.
    assert.ok(!/dragleave/.test(DEF), 'dragleave arrêterait le défilement en plein geste');
});

test('ON NE DÉFILE NI AU MILIEU, NI DANS LE VIDE', () => {
    // Au milieu, il ne doit rien se passer : sinon on ne peut plus rien
    // déposer. En butée, la boucle tournerait sans rien faire, et le pointeur
    // resterait coincé dans la bande sans qu'on comprenne pourquoi.
    assert.match(DEF, /if \(!vitesse\) return arreterLeDefilement\(\);/);
    assert.match(DEF, /const enHaut = zone\.scrollTop <= 0;/);
    assert.match(DEF, /if \(\(vitesse < 0 && enHaut\) \|\| \(vitesse > 0 && enBas\)\) vitesse = 0;/);
});

test('LA BANDE SENSIBLE SE BORNE AU QUART DE LA ZONE', () => {
    // Sur une zone courte, 90 px prendraient les deux tiers de la hauteur et il
    // n'y aurait plus nulle part où se poser.
    assert.match(DEF, /const bande = Math\.min\(BANDE, r\.height \/ 4\);/);
    // Et la vitesse suit la proximité du bord : au bord même, le maximum.
    assert.match(DEF, /vitesse = -VITESSE_MAX \* Math\.min\(1, p\);/);
});

test('LA ZONE QUI DÉFILE SE CHERCHE, ELLE NE SE SUPPOSE PAS', () => {
    // Mesuré : ce n'est ni `#path-container` (qui s'étend au lieu de défiler)
    // ni la page (qui ne défile pas ici), mais `#builder-center-col`. Un
    // identifiant écrit en dur aurait été faux dans deux cas sur trois — et
    // il l'était dans ma première sonde.
    assert.match(DEF, /function zoneDefilante\(x, y\) \{/);
    assert.match(DEF, /document\.elementFromPoint\(x, y\)/);
    assert.match(DEF, /\/auto\|scroll\|overlay\/\.test\(st\.overflowY\)/);
    assert.match(DEF, /el\.scrollHeight > el\.clientHeight \+ 2/);
    assert.ok(!/getElementById\('path-container'\)/.test(DEF));
});

test('LE FANTÔME EST UN INDICE, PAS UN SOSIE', () => {
    // Il était à 95 % d'opacité et AGRANDI de 6 % : une copie pleine de la
    // rangée, posée pile sur l'endroit qu'on vise — c'est-à-dire sur tout ce
    // qu'on regarde à ce moment-là.
    assert.match(CSS, /\.drag-ghost \{[\s\S]{0,220}opacity: \.5; transform: scale\(\.94\);/);
    assert.ok(!/\.drag-ghost \{[\s\S]{0,220}opacity: \.95/.test(CSS));
    assert.ok(!/\.drag-ghost \{[\s\S]{0,220}scale\(1\.06\)/.test(CSS));
});

test('L\'AVIS D\'AJOUT DIT LE GESTE, IL NE L\'OFFRE PLUS', () => {
    // « le régler ne fonctionne pas, mais ne le mets pas. On règle en
    // cliquant. » Un avis dure six secondes ; ce qu'il propose doit être ce
    // qu'on fait EN LE LISANT, pas un geste qu'on aura peut-être envie de faire.
    assert.match(BUILDER, /clique dessus pour le régler/);
    assert.ok(!/toast-action/.test(BUILDER), 'plus de bouton dans l\'avis');
    // Et la feuille de style ne garde pas la mise en forme d'un bouton mort.
    assert.ok(!/toast-action/.test(CSS), 'la règle CSS du bouton doit partir avec lui');
});
