// LE DESSIN DES ANGLES REMARQUABLES — ET LE CADRE QUI ÉPOUSE LA FIGURE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// `js/core/anglesRemarquablesSvg.js` dessine les figures d'angles : deux
// sécantes, un angle partagé, deux parallèles coupées. Le noyau
// (`core/anglesRemarquables.js`, déjà éprouvé) ne connaît que des traits et des
// secteurs ; ici « on ne décide rien, on montre ».
//
// SAUF QUE CE MODULE DÉCIDE DE TROIS CHOSES, ET LES TROIS SE VOIENT :
//
//   1. LE REPÈRE. « LE REPÈRE DU NOYAU MONTE, CELUI D'UN ÉCRAN DESCEND. La
//      conversion se fait ici, une fois, et nulle part ailleurs. » Un `y`
//      oublié retourne la figure, et un angle « au-dessus de la droite » se
//      retrouve dessous — l'énoncé ne décrit plus le dessin.
//   2. LE CADRE. Il reprend les proportions de la figure plutôt que de
//      l'enfermer dans un carré, parce que « deux droites penchées forment une
//      bande deux à quatre fois plus large que haute : dans un carré, les deux
//      tiers du dessin sont du vide ». Et il BORNE ce rapport, « pour qu'une
//      bande extrême ne devienne pas un fil ».
//   3. CE QU'ON ÉCRIT. 'donne' pour l'énoncé, 'toutes' pour le corrigé. SI LES
//      DEUX DISAIENT LA MÊME CHOSE, l'énoncé donnerait la réponse — et c'est la
//      faute la plus coûteuse d'un logiciel d'exercices, parce qu'elle rend
//      l'exercice inutile sans jamais rien casser.
//
// LA FEUILLE IMPRIMÉE LIT LES MÊMES DONNÉES et les redessine en jsPDF : « c'est
// la garantie que ce qu'on voit à l'écran est ce qui sort de l'imprimante ». Les
// `sommets` exportés d'ici en font partie.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { figureAnglesSvg, sommets } from '../js/core/anglesRemarquablesSvg.js';
import {
    figureSecantes, figurePartage, figureParalleles, mesureArc, boiteFigure
} from '../js/core/anglesRemarquables.js';

/** Les trois familles de figures que le catalogue produit vraiment. */
const FIGURES = [
    ['deux sécantes', figureSecantes({ angle: 50 })],
    ['deux sécantes penchées', figureSecantes({ angle: 35, penche: 20 })],
    ['angle partagé', figurePartage({ ouverture: 80, angle: 30 })],
    ['parallèles, correspondants', figureParalleles({ angle: 55 })],
    ['parallèles, alternes-internes', figureParalleles({ angle: 40, relation: 'alternes-internes' })]
];

/** Les nombres d'un attribut de SVG, lus un à un. */
function nombresDe(svg, attribut) {
    const out = [];
    const re = new RegExp(`${attribut}="([^"]*)"`, 'g');
    let m;
    while ((m = re.exec(svg))) {
        for (const bout of m[1].trim().split(/[\s,]+/)) {
            if (bout !== '') out.push(Number(bout));
        }
    }
    return out;
}

/** Le `viewBox` du SVG : sa boîte de dessin. */
function viewBox(svg) {
    const m = /viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/.exec(svg);
    assert.ok(m, 'le SVG doit porter un viewBox lisible');
    return { w: Number(m[1]), h: Number(m[2]) };
}

/**
 * Toutes les coordonnées réellement dessinées : traits, secteurs, équerre,
 * sommets — ET les étiquettes.
 *
 * LES ÉTIQUETTES COMPTENT MÊME EN MODE « aucune », et c'est ce que la première
 * version de cette épreuve ignorait : un arc qui porte un NUMÉRO D'ÉTAPE
 * (`arc.pas`) écrit son numéro quelles que soient les mesures demandées. Sans
 * elles, le dessin des parallèles paraissait décentré de six pixels — et
 * l'épreuve accusait le code de ce qu'elle ne regardait pas.
 */
function toutCeQuiEstDessine(svg) {
    const xs = [...nombresDe(svg, 'x1'), ...nombresDe(svg, 'x2'), ...nombresDe(svg, 'cx')];
    const ys = [...nombresDe(svg, 'y1'), ...nombresDe(svg, 'y2'), ...nombresDe(svg, 'cy')];
    // On lit les `<text>` par une expression à eux : chercher l'attribut `x`
    // tout court attraperait aussi la fin de `cx`.
    for (const m of svg.matchAll(/<text[^>]*\sx="([-\d.]+)"[^>]*\sy="([-\d.]+)"/g)) {
        xs.push(Number(m[1]));
        ys.push(Number(m[2]));
    }
    for (const bloc of svg.match(/points="[^"]*"/g) || []) {
        for (const paire of bloc.slice(8, -1).trim().split(/\s+/)) {
            const [x, y] = paire.split(',').map(Number);
            if (Number.isFinite(x)) xs.push(x);
            if (Number.isFinite(y)) ys.push(y);
        }
    }
    return { xs, ys };
}

test('AUCUN NOMBRE NON FINI NE SORT D\'ICI', () => {
    // UN SEUL `NaN` DANS UN ATTRIBUT, ET LE NAVIGATEUR N'AFFICHE RIEN — sans
    // message, sans erreur de console. L'élève voit un cadre vide et croit que
    // l'exercice est cassé ; personne ne sait pourquoi.
    for (const [nom, fig] of FIGURES) {
        for (const mesures of ['donne', 'toutes', 'aucune']) {
            const svg = figureAnglesSvg(fig, { mesures });
            assert.ok(!/NaN|undefined|Infinity/.test(svg),
                `${nom} (${mesures}) : un nombre non fini s'est glissé dans le dessin`);
            assert.ok(svg.startsWith('<svg'), `${nom} : le rendu doit être un SVG`);
        }
    }
});

test('TOUT LE DESSIN TIENT DANS LE CADRE', () => {
    // Un trait qui sort du `viewBox` est COUPÉ par le navigateur, en silence.
    // Une sécante amputée ne coupe plus les parallèles, et l'élève cherche un
    // croisement qui n'est pas dessiné.
    for (const [nom, fig] of FIGURES) {
        const svg = figureAnglesSvg(fig, { mesures: 'toutes' });
        const { w, h } = viewBox(svg);

        for (const [attr, max] of [['x1', w], ['x2', w], ['cx', w], ['y1', h], ['y2', h], ['cy', h]]) {
            for (const v of nombresDe(svg, attr)) {
                assert.ok(v >= -0.5 && v <= max + 0.5,
                    `${nom} : ${attr}=${v} sort du cadre (0..${max})`);
            }
        }
        // Les polygones de secteur, lus point par point.
        for (const bloc of svg.match(/points="[^"]*"/g) || []) {
            const vals = bloc.slice(8, -1).trim().split(/\s+/);
            for (const paire of vals) {
                const [x, y] = paire.split(',').map(Number);
                assert.ok(x >= -0.5 && x <= w + 0.5, `${nom} : un secteur sort en x (${x})`);
                assert.ok(y >= -0.5 && y <= h + 0.5, `${nom} : un secteur sort en y (${y})`);
            }
        }
    }
});

test('LE CADRE ÉPOUSE LA FIGURE, SANS DEVENIR UN FIL', () => {
    // Le rapport du cadre doit suivre celui de la figure — c'est l'intérêt —
    // mais rester borné entre un demi et deux : au-delà, « une bande extrême
    // devient un fil » sur lequel plus rien ne se lit.
    for (const [nom, fig] of FIGURES) {
        const { w, h } = viewBox(figureAnglesSvg(fig));
        const rapport = w / h;
        assert.ok(rapport >= 0.5 - 1e-6 && rapport <= 2 + 1e-6,
            `${nom} : rapport ${rapport.toFixed(3)} hors des bornes`);
        // Le grand côté vaut toujours la longueur de référence : c'est elle qui
        // fixe l'échelle du trait et des étiquettes d'une figure à l'autre.
        assert.equal(Math.max(w, h), 300, `${nom} : le grand côté doit rester constant`);
    }

    // ET LE CADRE SUIT VRAIMENT LA FIGURE. Une bande large doit recevoir un
    // cadre plus large qu'un angle ramassé — sinon tout ce paragraphe ne sert
    // à rien et l'on aurait pu garder un carré.
    const bande = boiteFigure(figureParalleles({ angle: 55 }));
    const ramasse = boiteFigure(figurePartage({ ouverture: 80, angle: 30 }));
    if (bande.largeur / bande.hauteur > ramasse.largeur / ramasse.hauteur) {
        const a = viewBox(figureAnglesSvg(figureParalleles({ angle: 55 })));
        const b = viewBox(figureAnglesSvg(figurePartage({ ouverture: 80, angle: 30 })));
        assert.ok(a.w / a.h >= b.w / b.h,
            'la figure la plus large doit recevoir le cadre le plus large');
    }
});

test('LE REPÈRE DE L\'ÉCRAN DESCEND, CELUI DU NOYAU MONTE', () => {
    // LA CONVERSION SE FAIT ICI, UNE FOIS, ET NULLE PART AILLEURS. Un `y`
    // oublié retourne la figure : un angle décrit « au-dessus de la droite » se
    // dessine dessous, et l'énoncé ne parle plus de ce qu'on voit.
    const fig = figureSecantes({ angle: 50, penche: 20 });
    const svg = figureAnglesSvg(fig, { mesures: 'aucune' });

    // On prend un trait du noyau et l'on regarde où ses deux bouts sont partis.
    // Celui dont le `y` mathématique est le plus GRAND doit avoir le `y` d'écran
    // le plus PETIT.
    const t = fig.traits.find(tr => Math.abs(tr.y2 - tr.y1) > 1e-6);
    assert.ok(t, 'il faut un trait non horizontal pour mesurer le sens de l\'axe');

    const y1s = nombresDe(svg, 'y1'), y2s = nombresDe(svg, 'y2');
    const i = fig.traits.indexOf(t);
    const hautEnMaths = t.y1 > t.y2;
    const hautALEcran = y1s[i] < y2s[i];
    assert.equal(hautEnMaths, hautALEcran,
        'le bout le plus haut en mathématiques doit avoir le plus petit y à l\'écran');
});

test('LA FIGURE EST CENTRÉE DANS SON CADRE', () => {
    // Une figure collée dans un coin laisse l'autre moitié vide — et sur un
    // téléphone, cette moitié est précisément celle qu'on voulait donner au
    // dessin.
    //
    // ─────────────────────────────────────────────────────────────────────────
    //
    // LA TOLÉRANCE N'EST PAS DE ZÉRO, ET C'EST MESURÉ, PAS CONCÉDÉ.
    //
    // Premier état de cette épreuve : écart nul exigé. Trois des cinq figures le
    // tiennent exactement ; les deux figures de parallèles sont décalées de 6 px
    // et de 1 px sur un cadre de 300. On a d'abord cru à un défaut du dessin.
    //
    // CE N'EN EST PAS UN. `boiteFigure` (dans le noyau) ne compte pas seulement
    // les traits : pour chaque arc, elle RÉSERVE la place de son étiquette —
    // « quatre signes de large, une hauteur d'étiquette de haut » — autour de son
    // ancre. C'est cette boîte-là qui est centrée, et elle a raison de l'être :
    // sans quoi un « 127° » posé au bord sortirait du cadre.
    //
    // Or cette épreuve ne voit de l'étiquette que son ANCRE, pas sa largeur. Son
    // écart mesure donc exactement la moitié de l'étiquette la plus excentrée, et
    // reconstituer cette largeur ici serait recopier le code au lieu de
    // l'éprouver. On borne donc à 3 % du cadre : c'est au-dessus de ce que les
    // étiquettes expliquent, et très au-dessous de ce qu'un vrai décentrage
    // donnerait — une erreur de signe dans la projection déplace de la moitié du
    // cadre, un centre oublié de tout le cadre.
    const MARGE = 0.03;
    for (const [nom, fig] of FIGURES) {
        const svg = figureAnglesSvg(fig, { mesures: 'toutes' });
        const { w, h } = viewBox(svg);
        const { xs, ys } = toutCeQuiEstDessine(svg);
        assert.ok(xs.length && ys.length, `${nom} : le dessin doit avoir quelque chose`);
        const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
        const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
        assert.ok(Math.abs(cx - w / 2) <= w * MARGE,
            `${nom} : décentré en x (${cx.toFixed(1)} pour ${w / 2})`);
        assert.ok(Math.abs(cy - h / 2) <= h * MARGE,
            `${nom} : décentré en y (${cy.toFixed(1)} pour ${h / 2})`);
    }
});

test('L\'ÉNONCÉ NE DONNE PAS LA RÉPONSE', () => {
    // LA FAUTE LA PLUS COÛTEUSE D'UN LOGICIEL D'EXERCICES, et elle ne casse
    // rien : si 'donne' écrivait toutes les mesures, l'élève lirait la réponse
    // au lieu de la chercher, et le logiciel la lui compterait juste.
    const fig = figureParalleles({ angle: 55 });
    const enonce = figureAnglesSvg(fig, { mesures: 'donne' });
    const corrige = figureAnglesSvg(fig, { mesures: 'toutes' });
    const rien = figureAnglesSvg(fig, { mesures: 'aucune' });

    const compter = (svg) => (svg.match(/class="ar-mesure/g) || []).length;
    assert.ok(compter(corrige) > compter(enonce),
        `le corrigé doit écrire plus de mesures que l'énoncé (${compter(corrige)} contre ${compter(enonce)})`);
    assert.ok(compter(enonce) >= 1, 'un énoncé sans aucune donnée n\'est pas résoluble');
    assert.equal(compter(rien), 0, '« aucune » veut dire aucune');

    // Et la mesure CHERCHÉE n'est écrite nulle part dans l'énoncé.
    const cherche = fig.arcs.find(a => a.role !== 'donne');
    if (cherche) {
        const valeur = `${mesureArc(cherche)}°`;
        const uneDonneeVautPareil = fig.arcs.some(a => a.role === 'donne' && `${mesureArc(a)}°` === valeur);
        assert.ok(!enonce.includes(valeur) || uneDonneeVautPareil,
            `la réponse « ${valeur} » apparaît dans l'énoncé`);
        assert.ok(corrige.includes(valeur), `le corrigé doit, lui, écrire « ${valeur} »`);
    }
});

test('UN SOMMET PAR CROISEMENT, ET PAS UN DE PLUS', () => {
    // `sommets` sert à l'écran ET à la feuille imprimée. Un doublon dessine deux
    // points l'un sur l'autre — un gros point noir qui mange l'arc dessous — et
    // sur le papier, deux disques d'encre.
    for (const [nom, fig] of FIGURES) {
        const liste = sommets(fig);
        assert.ok(liste.length >= 1, `${nom} : il faut au moins un croisement`);
        for (let i = 0; i < liste.length; i++) {
            for (let j = i + 1; j < liste.length; j++) {
                const d = Math.hypot(liste[i].x - liste[j].x, liste[i].y - liste[j].y);
                assert.ok(d > 1e-9, `${nom} : deux sommets confondus (${i} et ${j})`);
            }
        }
        // Et le dessin en pose exactement autant.
        const svg = figureAnglesSvg(fig, { mesures: 'aucune' });
        assert.equal((svg.match(/class="ar-sommet"/g) || []).length, liste.length,
            `${nom} : autant de points dessinés que de croisements`);
    }
});

test('DEUX FIGURES SUR LA MÊME PAGE NE SE MARCHENT PAS DESSUS', () => {
    // Le préfixe existe « pour que deux figures sur la même page ne partagent
    // pas leurs identifiants de dégradé ». Sur une feuille imprimée de huit
    // exercices, un identifiant partagé fait que les huit figures prennent la
    // couleur de la dernière.
    const fig = figureSecantes({ angle: 50 });
    const a = figureAnglesSvg(fig, { prefixe: 'ex1' });
    const b = figureAnglesSvg(fig, { prefixe: 'ex2' });
    assert.ok(a.includes('ex1'), 'le préfixe demandé doit se retrouver dans le rendu');
    assert.ok(b.includes('ex2'));
    assert.notEqual(a, b, 'deux préfixes doivent donner deux rendus distincts');
});

test('LA FIGURE S\'ANNONCE AUX LECTEURS D\'ÉCRAN', () => {
    // Un SVG sans rôle ni libellé est un trou dans la page pour un lecteur
    // d'écran — et une figure muette rend l'exercice impossible à faire.
    const svg = figureAnglesSvg(figureSecantes({ angle: 50 }));
    assert.match(svg, /role="img"/);
    assert.match(svg, /aria-label="[^"]+"/);
});

test('UNE FIGURE SANS ARC NE FAIT PAS TOMBER LE DESSIN', () => {
    // Cas de mise au point, et cas d'un générateur mal réglé. Mieux vaut un
    // dessin pauvre qu'une page blanche.
    const nue = { traits: [{ x1: -1, y1: 0, x2: 1, y2: 0 }], arcs: [], droit: null };
    const svg = figureAnglesSvg(nue);
    assert.ok(svg.startsWith('<svg'));
    assert.ok(!/NaN|undefined/.test(svg));
    assert.deepEqual(sommets(nue), [], 'pas d\'arc, pas de croisement');
});
