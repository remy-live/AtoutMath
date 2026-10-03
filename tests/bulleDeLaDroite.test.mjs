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
// ── CE QUI SE DÉCIDE ICI, ET QUI N'ÉTAIT PAS DANS SA DEMANDE ────────────────
//
// SUR LA MARCHE « ÉCRIRE », LA BULLE NE PARAÎT PAS. C'est la seule décision
// que Rémy n'a pas prise, parce qu'il pensait à l'enseignement et pas à
// l'exercice : sur cette marche-là, l'élève doit ÉCRIRE « x = 6 » lui-même.
// Une bulle qui l'affiche au survol ne lui enseignerait plus rien, elle lui
// donnerait la réponse à recopier — et la marche cesserait d'être une marche.
//
// L'escalier existe précisément pour ça : on DÉCOUVRE la notation sur les deux
// premières marches, où elle ne coûte rien, et on la RESTITUE seul sur la
// troisième.
//
// ET ELLE NE TRAHIT RIEN SUR LES DEUX PREMIÈRES : toutes les droites disent la
// leur, pas seulement la bonne. Savoir que (d₂) s'écrit « x = 6 » ne dit pas
// que (d₂) est l'axe cherché.
//
// MESURÉ dans un vrai navigateur, sur « Symétrique par Rapport à Quoi ? » :
//   marche « choisir » → 4 zones, qui disent « y = 3 », « x = 9 », « x = 6 »
//                        et « (4 ; 5) » ; la bulle paraît au survol ET au
//                        doigt, et s'en va quand la souris s'en va.
//   marche « écrire »  → 0 zone. Rien à recopier.

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

test('SUR LA MARCHE « ÉCRIRE », AUCUNE DROITE NE DIT RIEN — tant qu\'on n\'a rien demandé', () => {
    // LA DÉCISION QUE RÉMY N'A PAS PRISE D'ABORD, et la raison d'être de ce
    // fichier. Il l'a prise le lendemain, et mieux : pas « jamais », mais
    // « derrière un point d'interrogation » — voir la fin du fichier. Le
    // défaut par défaut reste donc : rien ne se dit tant que personne ne
    // demande.
    const SRC = lire('js/core/activities/symetrieElement.js');
    assert.match(SRC, /const avecEcriture = marche !== 'ecrire' \|\| ecrituresVoulues\(\);/);
    assert.match(SRC, /const montres = avecEcriture\s*\n\s*\? candidats\.map/);
    // Et c'est `montres` qui part au dessin, pas `candidats`.
    assert.match(SRC, /elements: montres,/);
});

test('AU DOIGT AUSSI — c\'est la moitié de la classe', () => {
    // Sur une tablette il n'y a pas de survol. La bulle répond donc à trois
    // gestes, et le doigt la laisse le temps de lire : un doigt envoie bien
    // `pointerenter`, mais il n'enverra JAMAIS le `pointerleave` qui va avec,
    // et sans la tenue la bulle resterait ouverte jusqu'à la question suivante.
    const SRC = lire('js/core/activities/symetrieElement.js');
    assert.match(SRC, /addEventListener\('pointerenter'/);
    assert.match(SRC, /addEventListener\('pointerleave'/);
    assert.match(SRC, /addEventListener\('focus'/);
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
// ET SUR LA MARCHE « ÉCRIRE », DERRIÈRE UN POINT D'INTERROGATION.
//
// RÉMY, capture de cette marche-là à l'appui : « là il faudrait encore le point
// d'interrogation qui donne les coordonnées du point et de la droite ».
//
// SA FORMULATION LÈVE L'OBJECTION QUE J'AVAIS POSÉE. J'avais éteint les bulles
// ici parce qu'afficher « x = 6 » au survol donnerait la réponse à recopier sur
// la marche qui demande justement de l'écrire. Mais DERRIÈRE UN POINT
// D'INTERROGATION, ce n'est plus un cadeau : c'est l'élève qui demande, d'un
// geste, et il sait ce qu'il demande.
//
// ET ÇA NE DONNE TOUJOURS PAS LA RÉPONSE : toutes les droites disent la leur,
// pas seulement la bonne. Il reste à trouver LAQUELLE, et c'est la question.
// D'où aussi le fait que ça ne compte pas comme un indice — c'est une aide à la
// LECTURE, comme la calculatrice, et elle ne coûte rien à la note.
//
// MESURÉ dans un vrai navigateur, marche « écrire » :
//   AVANT   0 zone, un bouton « ? » de 44 × 44
//   APRÈS   4 zones — « y = 5 », « (3 ; 3) », « (3 ; 1) », « (5 ; 2) » —,
//           le bouton disparu, le réglage gardé, le champ toujours là,
//           et la bulle qui paraît au survol.

test('LE « ? » EXISTE SUR LA MARCHE QUI DEMANDE D\'ÉCRIRE, et seulement là', () => {
    const SRC = lire('js/core/activities/symetrieElement.js');
    // Il est posé dans la zone de réponse de l'écriture, pas dans les deux
    // autres : ailleurs, les bulles sont déjà allumées et il n'ouvrirait rien.
    const i = SRC.indexOf('const quoi =');
    const bloc = SRC.slice(i, SRC.indexOf('</div>', i));
    assert.ok(bloc.length > 200, 'tranche vide : le test ne vérifierait rien');
    assert.match(bloc, /data-sy-ecritures/);
    // ET IL SE TAIT DÈS QU'IL A SERVI : un bouton qui n'allume plus rien est un
    // bouton cassé.
    assert.match(bloc, /const demander = ecrituresVoulues\(\) \? '' : `<button/);
});

test('IL ALLUME LES ÉCRITURES, ET L\'APPAREIL S\'EN SOUVIENT', () => {
    const SRC = lire('js/core/activities/symetrieElement.js');
    assert.match(SRC, /const avecEcriture = marche !== 'ecrire' \|\| ecrituresVoulues\(\);/);
    assert.match(SRC, /seSouvenirDesEcritures\(true\);/);
    // Un élève qui ne tient pas la notation ne la tient pas davantage à la
    // question suivante : la lui redemander à chaque fois, ce serait la lui
    // refuser.
    const i = SRC.indexOf('demander.onclick');
    const bloc = SRC.slice(i, i + 200);
    assert.match(bloc, /render\(\);/, 'le dessin ne se refait pas : rien ne s\'allume');
});

test('MAIS IL NE DIT PAS LAQUELLE — ce n\'est donc pas un indice', () => {
    // LA RAISON POUR LAQUELLE ÇA NE COÛTE RIEN À LA NOTE. Si seul le bon
    // élément disait son écriture, le « ? » serait la réponse déguisée.
    const SRC = lire('js/core/activities/symetrieElement.js');
    // Les écritures sont posées sur TOUS les candidats, d'un seul `map`.
    assert.match(SRC, /\? candidats\.map\(c => \(\{ \.\.\.c, dit: ecrireElement\(m\.hauteur, c\) \}\)\)/);
    // Et le geste ne passe PAS par le compteur d'indices de la session.
    const i = SRC.indexOf('demander.onclick');
    const bloc = SRC.slice(i, i + 300);
    assert.ok(!/useHint|hintIndex|session\.indice/.test(bloc),
        'montrer les écritures compte comme un indice : il ne donne pourtant rien');
});

test('LE « ? » SE TOUCHE AU DOIGT — 44 px, comme toute cible', () => {
    const CSS = lire('css/modules.css');
    assert.match(CSS, /\.sy-demander \{[^}]*width: 44px; height: 44px;/);
    assert.match(CSS, /\.sy-demander:focus-visible \{ outline:/);
    // `--primary-texte` ET NON `--primary` : l'un est un FOND, l'autre du TEXTE
    // sur le fond de la page. La confusion a déjà coûté un contraste.
    assert.match(CSS, /\.sy-demander \{[^}]*color: var\(--primary-texte/);
});
