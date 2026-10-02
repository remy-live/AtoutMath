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

test('SUR LA MARCHE « ÉCRIRE », AUCUNE DROITE NE DIT RIEN', () => {
    // LA DÉCISION QUE RÉMY N'A PAS PRISE, et la raison d'être de ce fichier.
    const SRC = lire('js/core/activities/symetrieElement.js');
    assert.match(SRC, /const avecEcriture = marche !== 'ecrire';/);
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
