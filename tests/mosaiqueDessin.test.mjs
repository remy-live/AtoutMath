// LA MOSAÏQUE SE LIT : DES CARREAUX, UNE VRAIE TAILLE, LA MARQUE DU POSTE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, devant l'exercice : « il faudrait des carreaux, une figure plus grande
// et que les points soient des croix, pixel ou rond selon l'option ».
//
// ── LES TROIS, ET CE QUE CHACUNE A APPRIS ──────────────────────────────────
//
// LES CARREAUX. Mon commentaire d'origine disait l'INVERSE — « un quadrillage
// complet ferait ressembler la mosaïque à du papier millimétré ». C'était un
// argument de dessinateur, pas de professeur : la réponse à « quelle
// translation ? » se lit en COMPTANT les carreaux entre deux sommets. Sans eux,
// l'élève voit des taches de couleur et ne peut mesurer aucun déplacement.
//
// LA TAILLE, ET C'EST ELLE QUI A COÛTÉ. Agrandir la case ne changeait RIEN à
// l'écran : mesuré dans un navigateur, viewBox de 550 de large, rendu 320 px.
// Un `<svg>` sans `width` ni `height` n'a pas de taille naturelle — `max-width:
// 100%` n'a donc rien à limiter, et c'est le `min-width: 320px` de la feuille
// de style qui décidait de tout. La mosaïque faisait 320 px sur un écran de
// 1400, quelle que soit la valeur de COTE.
//
// LA MARQUE DES POINTS. L'option existe depuis longtemps — `state.stylePoint`,
// « croix / plus / disque » — et toutes les figures la suivent. Celle-ci
// dessinait son propre disque de 3,5 px. Un exercice qui invente sa convention
// apprend à l'élève que la convention n'en est pas une.
//
// ── CE QUE CETTE ÉPREUVE PEUT DIRE, ET CE QU'ELLE NE PEUT PAS ──────────────
//
// `activities/pavageImage.js` touche le document dès qu'on l'importe : elle lit
// donc la SOURCE. Elle garde des règles, pas une apparence.
// `tools/mosaiqueCarreaux.mjs` mesure l'apparence pour de vrai — il compte les
// carreaux RENDUS, vérifie qu'ils passent par-dessus les couleurs, lit la
// largeur réelle du dessin et bascule les trois réglages de point. Mais il met
// une minute, et une mesure d'une minute ne se fait pas à chaque commit.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import './helpers.mjs';
import { sansCommentaires } from './helpers.mjs';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const SRC = sansCommentaires(lire('js/core/activities/pavageImage.js'));
const CSS = lire('css/modules.css');

test('LE DESSIN PORTE DES CARREAUX, ET ILS PASSENT PAR-DESSUS LES COULEURS', () => {
    assert.match(SRC, /class="pv-carreau"/, 'plus de carreaux : on ne peut plus compter');
    // L'ORDRE DÉCIDE DE TOUT. Les fonds des pièces sont OPAQUES : un carreau
    // dessiné avant eux existerait dans le document et serait recouvert à
    // l'écran — c'est-à-dire invisible exactement là où l'élève compte, à
    // l'intérieur des pièces.
    const i = SRC.indexOf('<g class="pv-fonds"');
    const j = SRC.indexOf('<g class="pv-carreaux"');
    assert.ok(i > 0 && j > 0, 'les deux groupes doivent exister');
    assert.ok(j > i, 'les carreaux sont dessinés AVANT les fonds : ils seront couverts');
    // Et ils ne volent pas le clic destiné à la pièce qu'ils traversent.
    assert.match(CSS, /\.pv-carreaux \{[^}]*pointer-events: none/);
});

test('LE DESSIN A UNE TAILLE NATURELLE — sans quoi « plus grand » ne veut rien dire', () => {
    // LE DÉFAUT EXACT, ET IL NE SE VOYAIT QUE DANS UN NAVIGATEUR : un `<svg>`
    // sans `width` ni `height` se laisse dimensionner par le `min-width` de sa
    // feuille de style. Agrandir la case ne changeait pas un pixel.
    assert.match(SRC, /<svg class="pv-svg" viewBox="0 0 \$\{w\} \$\{h\}" width="\$\{w\}" height="\$\{h\}"/,
        'le SVG doit porter sa taille, sinon il rend toujours 320 px de large');
    // ET IL RÉTRÉCIT TOUJOURS SUR UN TÉLÉPHONE : la taille naturelle est un
    // plancher pour les grands écrans, pas une largeur imposée à tous.
    assert.match(CSS, /\.pv-svg \{[^}]*max-width: 100%/);
    assert.match(CSS, /\.pv-svg \{[^}]*height: auto/);
});

test('LA CASE EST ASSEZ GRANDE POUR QU\'ON LA COMPTE', () => {
    // LE TÉMOIN DE « une figure plus grande ». Sans lui, les deux épreuves
    // ci-dessus resteraient vertes sur une mosaïque revenue à 34 px, et l'on
    // aurait gardé la forme en perdant la demande.
    const m = /const COTE = (\d+);/.exec(SRC);
    assert.ok(m, '`COTE` a disparu : la règle est à reporter');
    assert.ok(Number(m[1]) >= 44,
        `la case ne fait que ${m[1]} px : deux carreaux voisins ne se distinguent `
        + 'plus à bout de bras, et compter est le geste de l\'exercice');
});

test('LES POINTS SUIVENT L\'OPTION DU POSTE, ILS N\'INVENTENT PAS LEUR MARQUE', () => {
    // `marqueurPoint` écrit LES TROIS écritures dans le SVG, et le CSS en
    // montre une selon `html[data-point]`. Changer le réglage ne redessine donc
    // rien : une mosaïque déjà à l'écran change de convention à l'instant où le
    // professeur bascule l'option.
    assert.match(SRC, /from '\.\.\/figures\.js'/, 'la marque commune n\'est pas importée');
    assert.match(SRC, /marqueurPoint\(X\(s\.x\), Y\(s\.y\), 'pv-sommet'/,
        'les sommets nommés doivent passer par la marque commune');
    // LE CENTRE D'UNE SYMÉTRIE EST UN POINT LUI AUSSI. Deux conventions dans
    // une seule figure, c'est une de trop.
    assert.match(SRC, /marqueurPoint\(X\(t\.centre\.x\), Y\(t\.centre\.y\), 'pv-centre'/);
    // PLUS AUCUN CERCLE ÉCRIT À LA MAIN pour un point : c'était la forme du
    // défaut, et elle reviendrait sans qu'on la voie.
    assert.doesNotMatch(SRC, /<circle class="pv-(sommet|centre)"/,
        'un point est encore dessiné à la main : il ignorera le réglage');
});

test('ET LA COULEUR PASSE PAR `color`, SANS QUOI LA CROIX RESTE NOIRE', () => {
    // LE PIÈGE DE `marqueurPoint` : ses trois écritures prennent toutes
    // `currentColor`. Un `fill` ne colorerait que le disque — on aurait donc un
    // centre de symétrie rouge en mode « rond » et noir en mode « croix », sans
    // que rien ne le dise.
    assert.match(CSS, /\.pv-sommet \{ color: /, 'le sommet doit poser `color`, pas `fill`');
    assert.match(CSS, /\.pv-centre \{ color: /, 'le centre doit poser `color`, pas `fill`');
});
