// LA BARRE D'OUTILS DU PARCOURS RESTE À L'ÉCRAN.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, capture de la barre d'un parcours de 197 exercices :
//
//   « ce serait cool d'avoir la barre fixe et la partie des exercices
//     scrollable »
//
// MESURÉ AVANT (`tools/tmp/sonde-barre.mjs`), avec VINGT exercices seulement :
// la colonne fait 790 px de haut pour 2 425 px de contenu, et une fois descendu
// en bas de la liste la barre est à −1 505 px — deux écrans au-dessus. Pour
// imprimer, pour jouer, pour donner à une classe, il faut remonter. Sur ses 197
// exercices, c'est dix écrans.
//
// MESURÉ APRÈS (`tools/tmp/sonde-barre2.mjs`), même parcours : en haut comme en
// bas de la liste, la barre est à 0 px du haut de la colonne, et
// `elementFromPoint` au point le plus haut comme au bord gauche nomme
// `path-header-toggle` — rien ne défile ni au-dessus, ni à côté.
//
// ── POURQUOI TROIS ÉPREUVES, ET PAS UNE ────────────────────────────────────
//
// `position: sticky` seul ne colle rien du tout. Il lui faut, dans cet ordre,
// une boîte qui défile, un repère `top`, un fond opaque et toute la largeur. Il
// manque l'un des quatre, et la barre a l'air de marcher — c'est ce qui rend ce
// réglage si facile à casser sans s'en apercevoir :
//
//   sans `overflow-y` sur la colonne   elle suit la page et s'en va
//   sans `top`                          elle ne colle jamais
//   sans fond                           la liste se lit À TRAVERS elle
//   avec le rembourrage sur la colonne  une bande de 20 px au-dessus d'elle,
//                                       par laquelle on voit défiler la liste
//
// Les deux derniers ne JETTENT pas : ils donnent une barre qui colle et une
// image sale. C'est le genre de défaut qu'on ne voit qu'en regardant, et que
// personne ne regarde deux fois.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lireFeuille, corpsDeLaRegle, declare, valeurDe } from './aidesCss.mjs';

const COMPOSANTS = lireFeuille(new URL('../css/components.css', import.meta.url));
const MISE_EN_PAGE = lireFeuille(new URL('../css/layout.css', import.meta.url));

const barre = () => corpsDeLaRegle(COMPOSANTS, '.path-header-toggle',
    { ou: 'components.css' });
const colonne = () => corpsDeLaRegle(MISE_EN_PAGE, '#builder-center-col',
    { ou: 'layout.css' });

test('LA BARRE COLLE EN HAUT DE LA COLONNE QUI DÉFILE', () => {
    const b = barre();
    assert.ok(declare(b, 'position', 'sticky'),
        'la barre ne colle plus : elle repartira vers le haut au premier défilement');
    assert.equal(valeurDe(b, 'top'), '0',
        'une barre collée sans repère `top` ne colle jamais');
    // ET LA COLONNE RESTE LA BOÎTE QUI DÉFILE. C'est elle le point d'appui :
    // sans `overflow-y`, la barre se cale sur un ancêtre et s'en va avec la
    // page — mesuré au doigt, où la colonne passe en hauteur libre.
    assert.ok(declare(colonne(), 'overflow-y', 'auto'),
        'la colonne ne défile plus : la barre n\'a plus rien à quoi se tenir');
});

test('ET RIEN NE DÉFILE AU-DESSUS D\'ELLE, NI À CÔTÉ', () => {
    // LE REMBOURRAGE DU HAUT APPARTIENT À LA BARRE, PAS À LA COLONNE.
    //
    // `top: 0` se mesure depuis la boîte de REMBOURRAGE du conteneur qui
    // défile. Vingt pixels de rembourrage en haut de la colonne, et la barre
    // collée se range vingt pixels plus bas — avec, au-dessus d'elle, une
    // bande par laquelle on voit passer la liste.
    const c = colonne();
    const pad = valeurDe(c, 'padding');
    assert.ok(pad, '`#builder-center-col` ne déclare plus son rembourrage');
    const morceaux = pad.split(/\s+/);
    assert.equal(morceaux[0], '0',
        `rembourrage « ${pad} » : le haut n'est pas à zéro, la liste défilera `
        + 'dans la bande au-dessus de la barre');

    // ET LA BARRE VA D'UN BORD À L'AUTRE. Les côtés du rembourrage, eux,
    // restent sur la colonne — la barre les reprend en marges négatives, sans
    // quoi la liste défile dans les vingt pixels restés à gauche et à droite.
    const cote = morceaux[1];
    const b = barre();
    const marge = valeurDe(b, 'margin');
    assert.ok(marge, 'la barre ne déclare plus ses marges');
    const m = marge.split(/\s+/);
    assert.equal(m[1], '-' + cote,
        `marge « ${marge} » contre un rembourrage de colonne « ${pad} » : la `
        + 'barre ne couvre pas toute la largeur');

    // UN FOND OPAQUE, ET PRIS AU THÈME. Mesuré : `#main-area`, le premier
    // ancêtre qui peigne une couleur, est à `--bg-app`. Une barre transparente
    // laisse lire la liste à travers elle.
    assert.match(valeurDe(b, 'background') || '', /var\(--bg-app\)/,
        'la barre collée n\'a pas de fond opaque : la liste se lit à travers');
});

test('AU DOIGT, ELLE NE COLLE PAS — ET C\'EST ÉCRIT', () => {
    // MESURÉ sur 390 × 844 : la barre y tient TROIS rangées, 171 px, pour une
    // boîte qui défile de 741 px. La coller, c'est retirer 23 % de l'écran à
    // la liste, en permanence, sur l'appareil qui en a le moins.
    //
    // ON L'ÉCRIT PLUTÔT QUE DE LAISSER FAIRE. Au doigt, la colonne passe en
    // hauteur libre : elle reste la boîte de référence sans jamais défiler, et
    // la barre y resterait collée sans bouger — c'est-à-dire pas du tout. Un
    // `position: sticky` inerte qu'on n'a pas écrit se relit comme un défaut,
    // et le suivant passera une heure à chercher pourquoi « ça ne marche pas
    // sur téléphone ».
    const auDoigt = corpsDeLaRegle(COMPOSANTS, '.path-header-toggle',
        { apres: '@media (max-width: 700px)', ou: 'components.css' });
    assert.ok(declare(auDoigt, 'position', 'static'),
        'au doigt, la barre doit rester dans le flux — et le dire');
    // Et l'aperçu « téléphone » montre ce que montre un téléphone.
    const apercu = corpsDeLaRegle(COMPOSANTS, 'body.mobile-view .path-header-toggle',
        { ou: 'components.css' });
    assert.ok(declare(apercu, 'position', 'static'),
        'l\'aperçu téléphone collerait une barre que le téléphone ne colle pas');
});
