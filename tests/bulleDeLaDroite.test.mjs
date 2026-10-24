// « x = 6 » SE DIT EN PASSANT SUR LA DROITE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « le symétrique par rapport à quoi -> Les élèves ont beaucoup de mal à
// comprendre le concept de x = 6, ce qui serait possible c'est que si la souris
// passe sur une droite ou sur un point ou qu'il clique dessus, on a un petit
// tooltip visible qui donne les coordonnées du point ou l'équation de la droite
// x = 6 ou y = 8 par exemple et il faut le signaler ».
//
// ── TROIS TEMPS POUR Y ARRIVER, DONT DEUX FAUX. C'EST L'HISTOIRE DE CE FICHIER.
//
//   1. J'avais ÉTEINT la bulle sur la marche « écrire », en raisonnant seul :
//      l'élève doit écrire « x = 6 » lui-même, une bulle qui l'affiche lui
//      donnerait la réponse à recopier. L'argument paraissait solide, et ce
//      fichier l'a porté en gras pendant des semaines.
//   2. Rémy : « là il faudrait encore le point d'interrogation qui donne les
//      coordonnées ». J'ai mis un bouton « ? » qui l'allumait, et que l'appareil
//      se rappelait d'avoir vu presser.
//   3. Rémy, l'ayant essayé en classe : « en fait c'est le point ? qui n'est pas
//      instinctif, et qui disparaît d'ailleurs quand on clique dessus. Mets par
//      défaut quand on passe ou clique dessus. »
//
// SES DEUX GRIEFS SE TIENNENT, ET LE SECOND DÉCOUSAIT LE PREMIER. Le bouton
// s'effaçait dès qu'il avait servi — c'était voulu, « un bouton qui n'allume
// plus rien est un bouton cassé » —, si bien que l'élève qui l'avait pressé une
// fois ne pouvait plus comprendre d'où venaient les bulles, et celui qui ne
// l'avait jamais remarqué ne savait pas qu'il existait. Une aide qu'il faut
// deviner n'est pas une aide.
//
// ET MON OBJECTION DE DÉPART ÉTAIT FAUSSE, ce qui rend la décision facile : la
// bulle ne donne PAS la réponse. Toutes les droites disent la leur, pas
// seulement la bonne. Savoir que (d₂) s'écrit « x = 6 » ne dit pas que (d₂) est
// l'axe cherché — il reste à trouver LAQUELLE, et c'est toute la question.
//
// MESURÉ dans un vrai navigateur (tools/mesureAideSymetrie.mjs), les neuf
// combinaisons de marche et de taille :
//   AVANT   choisir et cliquer → 3, 4 et 5 zones qui parlent toutes ;
//           écrire → 0 zone aux trois tailles, puis 4 après le « ? ».
//   APRÈS   les neuf combinaisons parlent, et il n'y a plus de « ? ».

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import './helpers.mjs';
import { quadrillageSvg } from '../js/core/quadrillageSvg.js';
import { ecrireElement } from '../js/core/elementSymetrie.js';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

const axe = (type, a, id) => ({ id, genre: 'axe', axe: { type, a }, nom: '(d)' });
const point = (x, y, id) => ({ id, genre: 'point', centre: { x, y }, nom: 'O' });

/** La figure, telle que l'activité la demande. */
const dessiner = (elements, cliquables = false) => quadrillageSvg({
    largeur: 10, hauteur: 10, repere: true, prefixe: 'sy',
    figures: [], elements, elementsCliquables: cliquables
});

test('UNE ZONE QUI A QUELQUE CHOSE À DIRE LE PORTE', () => {
    const svg = dessiner([
        { ...axe('v', 6, 'a'), dit: 'x = 6' },
        { ...point(4, 5, 'o'), dit: '(4 ; 5)' }
    ]);
    assert.match(svg, /data-dit="x = 6"/);
    assert.match(svg, /data-dit="\(4 ; 5\)"/);
});

test('ET ELLE NAÎT MÊME QUAND ON NE PEUT PAS CLIQUER', () => {
    // SUR LA PREMIÈRE MARCHE, l'élève répond par des boutons SOUS la figure :
    // le dessin n'est pas cliquable. C'est pourtant là qu'il a le plus besoin
    // de voir le lien entre le trait et son écriture — la zone doit donc
    // exister pour le survol seul.
    const svg = dessiner([{ ...axe('v', 6, 'a'), dit: 'x = 6' }], false);
    assert.match(svg, /class="qd-el-hit"[^>]*data-dit="x = 6"/);
    // MAIS ELLE NE SE PREND PAS POUR UN BOUTON : sans clic possible, pas de
    // `tabindex` ni de `role`, et le lecteur d'écran lit la figure plutôt que
    // trente cibles muettes.
    const zone = svg.slice(svg.indexOf('qd-el-hit'), svg.indexOf('qd-el-hit') + 300);
    assert.ok(!/tabindex/.test(zone), 'une zone non cliquable attrape le clavier');
    assert.match(zone, /aria-hidden="true"/);
});

test('SANS RIEN À DIRE ET SANS CLIC, IL N\'Y A PAS DE ZONE DU TOUT', () => {
    // C'est l'état de la marche « écrire ». Une zone transparente qui ne dit
    // rien et ne reçoit rien n'est qu'un obstacle de plus entre le doigt et le
    // dessin.
    const svg = dessiner([axe('v', 6, 'a'), point(4, 5, 'o')], false);
    assert.ok(!svg.includes('qd-el-hit'), 'des zones inutiles couvrent la figure');
});

test('CE QU\'ELLE DIT EST CE QUE L\'ÉLÈVE DEVRA ÉCRIRE — le même module', () => {
    // LA MOITIÉ QUI COMPTE. Si la bulle fabriquait sa propre phrase, elle
    // dirait « x=6 » là où l'exercice attend « x = 6 », ou compterait les
    // cases à l'envers : l'élève recopierait fidèlement une notation que
    // l'exercice refuserait. Les deux passent par `ecrireElement`.
    const SRC = lire('js/core/activities/symetrieElement.js');
    assert.match(SRC, /dit: ecrireElement\(m\.hauteur, c\)/);
    // Et c'est bien la même fonction qui juge l'écriture de l'élève.
    assert.match(SRC, /lireElement\(item\.meta\.hauteur, texte\)/);
    // LE TÉMOIN, SUR DE VRAIES VALEURS — et il m'a repris. J'avais écrit
    // « une droite verticale en 6 s'écrit x = 6 » : c'est faux, elle s'écrit
    // « x = 6,5 ». Les candidats vivent en coordonnées de CASE et le repère de
    // l'élève est décalé d'une demi-case (voir `axeDansLeRepere`), ce qui est
    // tout l'intérêt de passer par ce module plutôt que d'écrire la phrase
    // soi-même : une bulle qui aurait recopié le nombre brut aurait enseigné
    // une notation que l'exercice refuse ensuite.
    assert.equal(ecrireElement(10, axe('v', 5.5)), 'x = 6');
    assert.equal(ecrireElement(10, axe('h', 6.5)), 'y = 3');
    assert.equal(ecrireElement(10, point(3.5, 4.5)), '(4 ; 5)');
    // Et le décalage se voit : le nombre de CASE n'est pas celui du repère.
    assert.equal(ecrireElement(10, axe('v', 6)), 'x = 6,5');
});

test('CHAQUE DROITE DIT COMMENT ELLE S\'ÉCRIT, À TOUTES LES MARCHES', () => {
    // RÉMY : « mets par défaut quand on passe ou clique dessus ». Il n'y a donc
    // plus de condition du tout — et c'est cela qu'on garde, parce que les deux
    // versions précédentes en avaient une, chacune juste à sa façon et chacune
    // retirée par l'usage en classe.
    const SRC = lire('js/core/activities/symetrieElement.js');
    assert.match(SRC,
        /const montres = candidats\.map\(c => \(\{ \.\.\.c, dit: ecrireElement\(m\.hauteur, c\) \}\)\);/,
        'les écritures doivent être posées sans condition');
    // AUCUNE TRACE DE LA CONDITION D'AVANT. Sans cette ligne, un `if` remis
    // discrètement sur la marche « écrire » passerait inaperçu.
    assert.ok(!/avecEcriture|ecrituresVoulues/.test(SRC),
        'une condition est revenue sur les écritures : Rémy les a demandées par défaut');
    // Et c'est `montres` qui part au dessin, pas `candidats`.
    assert.match(SRC, /elements: montres,/);
});

test('AU DOIGT ET AU CLIC AUSSI — c\'est la moitié de la classe', () => {
    // Sur une tablette il n'y a pas de survol. La bulle répond donc à quatre
    // gestes, et le doigt la laisse le temps de lire : un doigt envoie bien
    // `pointerenter`, mais il n'enverra JAMAIS le `pointerleave` qui va avec,
    // et sans la tenue la bulle resterait ouverte jusqu'à la question suivante.
    const SRC = lire('js/core/activities/symetrieElement.js');
    assert.match(SRC, /addEventListener\('pointerenter'/);
    assert.match(SRC, /addEventListener\('pointerleave'/);
    assert.match(SRC, /addEventListener\('focus'/);
    // LE CLIC ÉTAIT DANS SA DEMANDE DEPUIS LE PREMIER JOUR — « si la souris
    // passe sur une droite ou sur un point OU QU'IL CLIQUE DESSUS » — et il
    // n'était pas branché. À la souris cela ne se voyait pas, un clic étant
    // toujours précédé d'un survol ; pour l'élève qui vise et appuie, si.
    assert.match(SRC, /addEventListener\('pointerdown'/,
        'le clic doit montrer la bulle : Rémy l\'a demandé deux fois');
    assert.match(SRC, /montrer\(cible, e\.pointerType !== 'mouse'\)/);
    assert.match(SRC, /if \(e\.pointerType === 'mouse'\) cacher\(\);/);
    // `regTimeout` ET NON `setTimeout` : un minuteur laissé derrière soi
    // écrirait dans une bulle que la question suivante a effacée.
    const i = SRC.indexOf('function brancherLaBulle');
    const bloc = SRC.slice(i, SRC.indexOf('function brancher()', i));
    assert.ok(bloc.length > 400, 'tranche vide : le test ne vérifierait rien');
    assert.match(bloc, /minuteur = regTimeout\(cacher, 2500\)/);
    assert.ok(!/setTimeout\(/.test(bloc), 'un minuteur qui survit à la question');
});

test('ELLE SE SIGNALE, ET ELLE NE SE MET PAS DEVANT CE DONT ELLE PARLE', () => {
    // Rémy : « et il faut le signaler ». Une zone transparente qui ne répond
    // pas au survol ne se découvre jamais.
    const CSS = lire('css/modules.css');
    assert.match(CSS, /\.qd-el-hit\[data-dit\] \{ cursor: help; \}/);
    assert.match(CSS, /\.qd-el-hit\[data-dit\]:hover \{ fill:/);
    // ELLE EST REMONTÉE AU-DESSUS DU TRAIT : posée dessus, elle couvrirait la
    // droite dont elle parle — exactement ce qu'il ne faut pas faire quand on
    // enseigne le lien entre un trait et son écriture.
    assert.match(CSS, /\.sy-bulle \{[^}]*transform: translate\(-50%, calc\(-100% - 10px\)\)/);
    // ET ELLE NE VOLE PAS LE SURVOL : sans cela, la bulle passe sous le
    // curseur, la droite perd le survol, la bulle se cache, la droite le
    // retrouve — et l'ensemble clignote.
    assert.match(CSS, /\.sy-bulle \{[^}]*pointer-events: none/);
    // Le plateau est le repère du placement.
    assert.match(CSS, /\.sy-plateau \{ position: relative; \}/);
});

// ─────────────────────────────────────────────────────────────────────────────
//
// IL Y A EU UN BOUTON « ? » ICI, ET IL N'A PAS SURVÉCU À LA CLASSE.
//
// Rémy l'avait demandé — « là il faudrait encore le point d'interrogation qui
// donne les coordonnées du point et de la droite » —, et quatre épreuves le
// gardaient : son existence sur la seule marche « écrire », le souvenir par
// appareil, le fait qu'il ne comptait pas comme un indice, ses 44 px sur 44.
// Toutes les quatre étaient justes, et toutes les quatre sont parties avec lui.
//
// RÉMY, APRÈS L'AVOIR ESSAYÉ : « en fait c'est le point ? qui n'est pas
// instinctif, et qui disparaît d'ailleurs quand on clique dessus. Mets par
// défaut quand on passe ou clique dessus. »
//
// LES DEUX ÉPREUVES QUI RESTENT SONT CELLES QUI GARDENT SA DÉCISION : qu'il ne
// revienne ni bouton, ni réglage, ni condition. Une aide par défaut se défait
// en remettant un `if` de trois mots ; c'est cela qu'on surveille.

test('IL N\'Y A PLUS DE BOUTON « ? », NI DE RÉGLAGE QUI L\'ACCOMPAGNAIT', () => {
    const SRC = lire('js/core/activities/symetrieElement.js');
    assert.ok(!/data-sy-ecritures|sy-demander/.test(SRC),
        'le bouton « ? » est revenu : Rémy l\'a retiré, « pas instinctif »');
    assert.ok(!/seSouvenirDesEcritures|ecrituresVoulues/.test(SRC),
        'le réglage par appareil est revenu : il n\'y a plus rien à se rappeler');
    // ET SA FEUILLE DE STYLE AUSSI EST PARTIE. Une règle qui habille un élément
    // que personne ne dessine plus se garde des années par superstition.
    const CSS = lire('css/modules.css');
    assert.ok(!/^\.sy-demander/m.test(CSS), '.sy-demander habille un bouton qui n\'existe plus');
    // LE CHAMP DE SAISIE, LUI, EST TOUJOURS LÀ : c'est la marche « écrire », et
    // supprimer le bouton ne doit pas avoir emporté la zone de réponse.
    assert.match(SRC, /id="sy-champ"/);
    assert.match(SRC, /data-valider/);
});

test('ET AUCUNE DROITE N\'EST SEULE À PARLER — ce n\'est donc pas un indice', () => {
    // LA RAISON POUR LAQUELLE L'AIDE PAR DÉFAUT NE COÛTE RIEN À LA NOTE, et
    // c'est elle qui a fait tomber mon objection d'origine. Si seul le bon
    // élément disait son écriture, la bulle serait la réponse déguisée.
    const SRC = lire('js/core/activities/symetrieElement.js');
    // Les écritures sont posées sur TOUS les candidats, d'un seul `map`.
    assert.match(SRC,
        /const montres = candidats\.map\(c => \(\{ \.\.\.c, dit: ecrireElement\(m\.hauteur, c\) \}\)\);/);
    // Et montrer la bulle ne passe PAS par le compteur d'indices de la session.
    const i = SRC.indexOf('function brancherLaBulle');
    const bloc = SRC.slice(i, SRC.indexOf('function brancher()', i));
    assert.ok(bloc.length > 400, 'tranche vide : le test ne vérifierait rien');
    assert.ok(!/useHint|hintIndex|session\.indice/.test(bloc),
        'la bulle compte comme un indice : elle ne donne pourtant rien');
});
