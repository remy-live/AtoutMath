// LES DROITES GRADUÉES SUR LE PAPIER — en tableau, l'énoncé à gauche, l'axe à
// droite.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, dans sa revue du catalogue :
//
//   sec-valeur-absolue  « présente-le sous forme de tableau pour avoir la même
//                        taille à gauche et la place à droite. Tu peux dessiner
//                        l'axe avec ou sans valeur pour l'impression »
//   sec-union-inter     « présente en tableau et dessine les axes »
//
// ── POURQUOI UN TABLEAU, ET NON UNE LIGNE DE PLUS ──────────────────────────
//
// Les deux exercices avaient déjà une fiche, mais ÉCRITE : « |x − 5| ⩽ 2 »
// suivi d'un pointillé. Or ce qu'on demande ici n'est pas une réponse à écrire,
// c'est un DESSIN à faire — et l'on ne dessine pas une droite graduée sur un
// pointillé de trois centimètres.
//
// Le tableau est ce que Rémy demande et c'est aussi ce qui règle le problème :
// une colonne étroite à gauche, de largeur CONSTANTE, où l'énoncé est toujours
// au même endroit ; tout le reste à droite pour l'axe. « La même taille à
// gauche et la place à droite » — c'est sa phrase, et c'est la mise en page.
//
// ── L'AXE EST DESSINÉ, PAS RECALCULÉ ───────────────────────────────────────
//
// `planDAxe` (core/generators/intervalles.js) rend les coordonnées que l'écran
// emploie : la fenêtre, les graduations, le sens des crochets, les nombres
// qu'on écrit et ceux qu'on tait. Tout cela a été réglé sur des mesures — « avec
// des bras de six pixels sur un axe de 324, on ne les distingue pas », « pourquoi
// le trait est au dessus, fais-le d'une autre couleur ». Le papier en hérite.
//
// C'est la troisième fois qu'on extrait ainsi un plan d'un rendu d'écran (les
// figures de géométrie, puis les racines) : à chaque fois qu'on a redessiné de
// l'autre côté, Rémy a vu la différence en une seconde.
//
// ── CE QUE L'ÉLÈVE TROUVE SUR LA FEUILLE ───────────────────────────────────
//
// Un axe VIDE, gradué, où il trace. C'est tout le sujet : le dessin EST la
// réponse. Sur la feuille de solutions, le même axe porte l'ensemble tracé.
//
// « AVEC OU SANS VALEUR » est un réglage, et c'est une vraie question de
// professeur : un axe qui porte déjà ses nombres se lit tout seul ; un axe nu
// oblige à placer le 0 et l'unité avant de tracer, ce qui est justement ce
// qu'on travaille en début de chapitre.

import { planDAxe } from '../../core/generators/intervalles.js';
import { dessinDe } from '../../core/valeursAbsolues.js';
import { boiteDe, echapperSheet } from './socle.js';
// L'ENCRE VIENT DU MODULE FEUILLE, et non de `socle.js` qui la ré-exporte :
// les deux constantes ci-dessous sont lues EN TÊTE DE MODULE, et `socle.js`
// est dans un cercle d'imports où une lecture en tête de module jette ou passe
// selon qui a été chargé en premier. Voir `fiches/encre.js`.
// Le noir des traits, le gris des graduations — nommés dans `encre.js`, pas
// réaliasés ici : deux fichiers qui déclarent `TRAIT` sont deux endroits où
// chercher la même chose.
import { ENCRE, GRIS, TRAIT } from './encre.js';

/** Le signe moins typographique et la virgule décimale, comme à l'écran. */
const nb = (v) => String(v).replace('.', ',').replace('-', '−');

/**
 * LA PART DE LA LARGEUR QUI REVIENT À L'ÉNONCÉ.
 *
 * « La même taille à gauche » : une proportion FIXE, et non une colonne qui
 * s'ajuste au plus long énoncé. Sinon la troisième question, plus longue,
 * décalerait les axes des trois autres, et l'on ne pourrait plus comparer deux
 * dessins d'un coup d'œil — ce qui est exactement ce qu'on fait en corrigeant.
 */
const PART_GAUCHE = 0.28;

/** L'axe et son énoncé dans un bloc : les mesures communes aux deux rendus. */
function plantDesAxes(item, slot, opts = {}) {
    const m = item.meta || {};
    const b = boiteDe(slot);
    const marge = 2;
    const gaucheW = b.w * PART_GAUCHE;
    const droiteX = b.x + gaucheW;
    const droiteW = b.w - gaucheW - marge;

    // Les axes à poser : un par ligne, de haut en bas.
    const axes = (opts.axes || []).map(a => ({
        ...a,
        plan: planDAxe(a.parts || [], {
            points: a.points || [], fenetre: a.fenetre, bornesEnPlus: a.bornesEnPlus,
            // TOUS LES ENTIERS SONT ÉCRITS SUR LE PAPIER — voir `planDAxe`.
            // L'élève y trace au lieu d'y lire ; il lui faut ses repères.
            tousLesEntiers: true
        })
    }));
    const hAxe = axes.length ? (b.h - marge) / axes.length : b.h;

    /**
     * DEUX ÉCHELLES, ET C'EST MESURÉ.
     *
     * Une seule échelle — la plus serrée des deux dimensions, comme à l'écran —
     * donnait ceci, lu sur la feuille réelle :
     *
     *   sec-valeur-absolue  bloc 693 × 50 px, 1 axe
     *                       k largeur 1,553  ·  k hauteur 0,774
     *                       axe obtenu 236 px sur 497 disponibles = 47 %
     *   sec-union-inter     bloc 693 × 204 px, 3 axes
     *                       k largeur 1,553  ·  k hauteur 1,086
     *                       axe obtenu 317 px sur 497 disponibles = 64 %
     *
     * LA HAUTEUR BORNAIT LES DEUX, et la moitié de la place à droite restait
     * blanche — l'inverse exact de ce que Rémy demande : « la même taille à
     * gauche et LA PLACE À DROITE ».
     *
     * Or une droite graduée est un objet à UNE dimension. Sa longueur et la
     * taille de ses signes n'ont aucune raison de varier ensemble : sur le
     * papier, les épaisseurs sont déjà choisies en millimètres (`EP`), et un
     * axe long aux graduations courtes est exactement ce qu'on trace à la main.
     *
     * Donc :
     *   · `kx` — le long de l'axe — REMPLIT la largeur disponible ;
     *   · `ky` — la hauteur des signes — prend ce que le bloc donne, sans
     *     jamais DÉPASSER `kx` : un bloc très haut n'a pas à grossir les
     *     crochets au-delà de leur proportion naturelle.
     *
     * Et la règle qui en découle, à tenir dans les deux dessins : une position
     * LE LONG de l'axe passe par `kx` ; tout ce qui donne à un signe sa FORME
     * — les bras d'un crochet, la hauteur d'une graduation — passe par `ky`.
     * Un crochet est un glyphe, pas une portion d'axe : étirer ses bras avec
     * l'axe en ferait un crochet large et plat, et c'est le SENS du crochet
     * que l'exercice enseigne.
     */
    const kx = axes.length ? droiteW / axes[0].plan.L : 1;
    const ky = axes.length
        ? Math.min(kx, hAxe / (axes[0].plan.hauteur + 4))
        : 1;

    return {
        m, b, marge, gaucheW, droiteX, droiteW, axes, hAxe, kx, ky,
        taille: Math.max(2.4, Math.min(b.w * 0.040, 3.6)),
        /**
         * Du repère de la vue SVG au papier, pour l'axe n° i.
         *
         * `dx` est un écart de FORME, en unités de vue : il passe par `ky`
         * comme les écarts verticaux, pour que le signe garde ses proportions
         * quand l'axe s'étire.
         *
         * ET LE DESSIN EST CENTRÉ SUR SON ENCOMBREMENT RÉEL. Une version
         * antérieure posait l'origine du plan au milieu de la ligne, ce qui
         * n'est pas la même chose : la droite est à `Y = 26` dans une boîte
         * qui va de 0 à 58, et les nombres s'écrivent à 48. Le dessin partait
         * donc trente unités trop bas, et l'énoncé se retrouvait UNE LIGNE
         * AU-DESSUS de son axe — vu sur la photo, pas déduit du code.
         */
        P: (i, x, y, dx = 0) => ({
            x: droiteX + x * kx + dx * ky,
            y: b.y + marge + i * hAxe + hAxe / 2
                + (y - (axes[i] ? encombrement(axes[i].plan).milieu : 0)) * ky
        })
    };
}

/**
 * LE HAUT ET LE BAS DE CE QUE L'AXE DESSINE VRAIMENT.
 *
 * `plan.hauteur` est la hauteur de la BOÎTE de la vue, qui ne dit pas où est
 * l'encre : la droite est à 26, les crochets montent à 18, les nombres
 * descendent à 48. Centrer sur la boîte laissait le dessin de travers.
 */
function encombrement(p) {
    let haut = p.Y - 6;                 // les graduations, sous la droite
    p.parts.forEach(q => { haut = Math.min(haut, p.Y - q.dy - p.crochetHaut); });
    // LA SECONDE LIGNE DES BORNES NON ENTIÈRES COMPTE DANS LA HAUTEUR : si on
    // l'oubliait, le dessin serait centré sur une boîte trop courte et « −6,5 »
    // descendrait sur la ligne d'en dessous.
    const bas = p.yNombre + (p.nombres.some(n => n.entre) ? 9 : 0);
    return { haut, bas, milieu: (haut + bas) / 2 };
}

/**
 * LA FENÊTRE COMMUNE À TOUS LES AXES D'UN MÊME BLOC.
 *
 * Deux axes empilés ne se lisent que s'ils portent LA MÊME GRADUATION — c'est
 * écrit dans `fenetreCommune`, et cela vaut aussi quand l'un des deux est VIDE :
 * l'axe où l'élève va tracer doit être gradué comme celui qu'il lit, sans quoi
 * il recopierait une longueur au lieu de lire une borne.
 */
function fenetreDe(parts) {
    const b = parts.filter(Boolean).flatMap(p => [p.a, p.b]).filter(v => v !== null);
    if (!b.length) return null;
    const min = Math.floor(Math.min(...b)) - 1;
    const max = Math.ceil(Math.max(...b)) + 1;
    return { min, max, pas: 320 / Math.max(1, max - min) };
}

// ── LE DESSIN D'UN AXE, DES DEUX CÔTÉS ──────────────────────────────────────

/**
 * LES ÉPAISSEURS SONT EN MILLIMÈTRES, pas en unités de vue.
 *
 * L'axe de l'écran est dessiné dans une boîte de 320 unités qu'on réduit à la
 * largeur du bloc : à cette échelle, un trait de 2 unités deviendrait 0,2 mm —
 * invisible à la photocopie. On choisit donc les épaisseurs POUR LE PAPIER, et
 * seules les POSITIONS passent par l'échelle.
 */
const EP = { axe: 0.35, ticGros: 0.35, tic: 0.22, intervalle: 1.0, crochet: 0.42 };

/**
 * LES TROIS TRAITS D'UN CROCHET. Le sens EST le sujet.
 *
 * Chaque trait est rendu comme une ANCRE sur l'axe (`x`, à l'échelle de la
 * longueur) et deux écarts de FORME (`dx1`, `dx2`, à l'échelle des signes) :
 * c'est ce qui garde au crochet ses proportions quand l'axe s'étire pour
 * remplir la feuille. Voir les deux échelles dans `plant`.
 */
function traitsDuCrochet(c, Y, dy, haut, bras) {
    // Le crochet d'une borne INCLUSE s'ouvre vers l'intérieur de l'intervalle ;
    // celui d'une borne exclue lui tourne le dos. C'est ce que l'exercice
    // enseigne, et c'est pour cela qu'il est dessiné gros.
    const sens = c.versLaDroite ? 1 : -1;
    const dx = c.ferme ? sens * bras : -sens * bras;
    const haut1 = Y - haut - dy, haut2 = Y + haut - dy;
    return [
        { x: c.x, y1: haut1, y2: haut1, dx1: 0, dx2: dx },
        { x: c.x, y1: haut1, y2: haut2, dx1: 0, dx2: 0 },
        { x: c.x, y1: haut2, y2: haut2, dx1: 0, dx2: dx }
    ];
}

/**
 * LES POINTES D'UN INTERVALLE QUI VA À L'INFINI.
 *
 * Un intervalle non borné n'a pas de crochet de ce côté-là : il a une FLÈCHE.
 * Sans elle, « I ∪ J = ℝ » sortait comme une barre entre deux graduations,
 * c'est-à-dire exactement comme un intervalle BORNÉ — le contraire de ce que
 * la réponse dit. Mesuré sur un tirage où la réponse était ℝ : la barre
 * s'arrêtait net à chaque bout, sans rien pour dire qu'elle continue.
 *
 * Comme pour les crochets, l'ancre est sur l'axe et les deux obliques sont
 * une FORME : elles gardent leur taille quand l'axe s'étire.
 */
function pointesDeLInfini(p, P) {
    const t = [];
    const pointe = (x, vers) => [-1, 1].forEach(s => t.push({
        x, y1: P.Y - p.dy, y2: P.Y - p.dy + s * 3, dx1: 0, dx2: -vers * 4
    }));
    if (p.flecheA) pointe(p.x1, -1);
    if (p.flecheB) pointe(p.x2, 1);
    return t;
}

function axeHtmlPapier(g, i, a, k, avecValeurs) {
    const P = a.plan;
    const mm = (v) => (v * k).toFixed(2);
    let d = '';
    // `d1`/`d2` : les écarts de FORME, qui ne suivent pas l'étirement de l'axe.
    const seg = (x1, y1, x2, y2, ep, c, d1 = 0, d2 = 0) => {
        const p = g.P(i, x1, y1, d1), q = g.P(i, x2, y2, d2);
        d += `<line x1="${mm(p.x)}" y1="${mm(p.y)}" x2="${mm(q.x)}" y2="${mm(q.y)}"
            stroke="rgb(${c.join(',')})" stroke-width="${mm(ep)}" stroke-linecap="round"/>`;
    };

    seg(4, P.Y, P.L - 4, P.Y, EP.axe, TRAIT);
    // LA FLÈCHE DU BOUT — ses deux obliques sont une FORME, donc à `ky` : elles
    // partent du bout de l'axe et reviennent en arrière d'une longueur fixe.
    // Sans elle, une droite graduée imprimée est un segment, et l'élève y lit
    // un intervalle borné là où il n'y en a pas.
    [-1, 1].forEach(s => seg(P.L - 4, P.Y, P.L - 4, P.Y + s * 3, EP.axe, TRAIT, 0, -4));
    P.tics.forEach(t =>
        seg(t.x, P.Y - t.demi, t.x, P.Y + t.demi, t.gros ? EP.ticGros : EP.tic, GRIS));

    if (avecValeurs) {
        P.nombres.forEach(n => {
            // `entre` : une borne qui ne tombe pas sur une graduation s'écrit
            // UNE LIGNE PLUS BAS — voir `planDAxe`. Sans ce décalage, « −6,5 »
            // touchait « −7 » et « −6 » sur le corrigé.
            const p = g.P(i, n.x, P.yNombre + (n.entre ? 9 : 0));
            d += `<text x="${mm(p.x)}" y="${mm(p.y)}" text-anchor="middle"
                font-size="${mm(g.taille * 0.86)}" ${n.gras ? 'font-weight="700" ' : ''}
                fill="rgb(${TRAIT.join(',')})">${echapperSheet(nb(n.v))}</text>`;
        });
    }

    P.parts.forEach(p => {
        seg(p.x1, P.Y - p.dy, p.x2, P.Y - p.dy, EP.intervalle, TRAIT);
        [p.crochetA, p.crochetB].forEach(c => {
            if (!c) return;
            traitsDuCrochet(c, P.Y, p.dy, P.crochetHaut, P.crochetBras)
                .forEach(t => seg(t.x, t.y1, t.x, t.y2, EP.crochet, TRAIT, t.dx1, t.dx2));
        });
        pointesDeLInfini(p, P).forEach(t =>
            seg(t.x, t.y1, t.x, t.y2, EP.intervalle, TRAIT, t.dx1, t.dx2));
    });
    P.points.forEach(p => {
        const c = g.P(i, p.x, P.Y);
        d += `<circle cx="${mm(c.x)}" cy="${mm(c.y)}" r="${mm(0.9)}"
            fill="rgb(${TRAIT.join(',')})"/>`;
    });

    if (a.nom) {
        const c = g.P(i, 2, P.Y - 15);
        d += `<text x="${mm(c.x)}" y="${mm(c.y)}" font-size="${mm(g.taille)}"
            font-weight="700" fill="rgb(${TRAIT.join(',')})">${echapperSheet(a.nom)}</text>`;
    }
    return d;
}

function axePdf(doc, g, i, a, avecValeurs) {
    const P = a.plan;
    const seg = (x1, y1, x2, y2, ep, c, d1 = 0, d2 = 0) => {
        const p = g.P(i, x1, y1, d1), q = g.P(i, x2, y2, d2);
        doc.setLineWidth(ep);
        doc.setDrawColor(...c);
        doc.line(p.x, p.y, q.x, q.y);
    };
    doc.setLineCap('round');

    seg(4, P.Y, P.L - 4, P.Y, EP.axe, TRAIT);
    // La flèche du bout, comme dans l'aperçu — et par les mêmes points, pour
    // qu'aucun des deux dessins ne puisse l'avoir et pas l'autre.
    [-1, 1].forEach(s => seg(P.L - 4, P.Y, P.L - 4, P.Y + s * 3, EP.axe, TRAIT, 0, -4));
    P.tics.forEach(t =>
        seg(t.x, P.Y - t.demi, t.x, P.Y + t.demi, t.gros ? EP.ticGros : EP.tic, GRIS));

    if (avecValeurs) {
        doc.setTextColor(...TRAIT);
        doc.setFontSize(g.taille * 0.86 * 2.83);
        P.nombres.forEach(n => {
            // La seconde ligne des bornes non entières, comme dans l'aperçu.
            const p = g.P(i, n.x, P.yNombre + (n.entre ? 9 : 0));
            doc.setFont('helvetica', n.gras ? 'bold' : 'normal');
            doc.text(nb(n.v), p.x, p.y, { align: 'center' });
        });
    }

    P.parts.forEach(p => {
        seg(p.x1, P.Y - p.dy, p.x2, P.Y - p.dy, EP.intervalle, TRAIT);
        [p.crochetA, p.crochetB].forEach(c => {
            if (!c) return;
            traitsDuCrochet(c, P.Y, p.dy, P.crochetHaut, P.crochetBras)
                .forEach(t => seg(t.x, t.y1, t.x, t.y2, EP.crochet, TRAIT, t.dx1, t.dx2));
        });
        pointesDeLInfini(p, P).forEach(t =>
            seg(t.x, t.y1, t.x, t.y2, EP.intervalle, TRAIT, t.dx1, t.dx2));
    });
    doc.setFillColor(...TRAIT);
    P.points.forEach(p => { const c = g.P(i, p.x, P.Y); doc.circle(c.x, c.y, 0.9, 'F'); });

    if (a.nom) {
        const c = g.P(i, 2, P.Y - 15);
        doc.setTextColor(...TRAIT);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(g.taille * 2.83);
        doc.text(a.nom, c.x, c.y);
    }
}

// ── LA VALEUR ABSOLUE : un énoncé, un axe à tracer ──────────────────────────

function axesDeLaValeurAbsolue(item, solution) {
    const m = item.meta || {};
    const sol = m.solution;
    if (!sol) return [];
    const d = dessinDe(sol);
    const fen = fenetreDe(d.parts.length ? d.parts
        : d.points.map(v => ({ a: v, b: v, ea: true, eb: true })));
    // LE BARREAU 8 TRACE SON AXE SUR LES DEUX FEUILLES : là, le dessin est la
    // DONNÉE — « écris la condition qui décrit l'ensemble dessiné » — et non la
    // réponse. Mesuré avant ce drapeau : la feuille de l'élève sortait un axe
    // vide sous cette question, c'est-à-dire la question privée de son énoncé.
    //
    // Partout ailleurs l'élève reçoit un axe VIDE et le corrigé le même axe
    // tracé. La fenêtre est la même des deux côtés : sans cela, la correction
    // ne se superposerait pas à ce qu'il a fait.
    const trace = m.donnee || solution;
    return [trace
        ? { parts: d.parts, points: d.points, fenetre: fen }
        : { parts: [], points: [], fenetre: fen }];
}

/**
 * LA LIGNE OÙ L'ÉLÈVE ÉCRIT, quand la réponse n'est pas un dessin.
 *
 * Le barreau 8 demande une CONDITION, pas un tracé : l'axe à droite est son
 * énoncé, et il faut donc une place pour écrire — sinon la question est posée
 * sans qu'on puisse y répondre. Sur la feuille de solutions, la même place
 * porte la condition attendue.
 */
function reponseEcriteHtml(g, k, texte) {
    const T = (v) => (v * k).toFixed(2);
    const y = g.b.y + g.b.h / 2 + g.taille * 1.6;
    return texte
        ? `<div class="fx-abs" style="position:absolute; left:${T(g.b.x)}px;
            top:${T(y - g.taille)}px; width:${T(g.gaucheW - 2)}px;
            font-size:${T(g.taille)}px; font-weight:700"
            >${echapperSheet(texte)}</div>`
        : `<svg class="fx-abs" style="position:absolute; left:0; top:0; overflow:visible"
            width="1" height="1"><line x1="${T(g.b.x)}" y1="${T(y)}"
            x2="${T(g.b.x + g.gaucheW - 3)}" y2="${T(y)}"
            stroke="rgb(${GRIS.join(',')})" stroke-width="${T(0.25)}"/></svg>`;
}

function reponseEcritePdf(doc, g, texte) {
    const y = g.b.y + g.b.h / 2 + g.taille * 1.6;
    if (texte) {
        doc.setTextColor(...TRAIT);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(g.taille * 2.83);
        doc.text(String(texte), g.b.x, y);
        return;
    }
    doc.setLineWidth(0.25);
    doc.setDrawColor(...GRIS);
    doc.line(g.b.x, y, g.b.x + g.gaucheW - 3, y);
}

function valeurAbsoluePreviewHtml(item, slot, k, solution) {
    const m = item.meta || {};
    const g = plantDesAxes(item, slot, { axes: axesDeLaValeurAbsolue(item, solution) });
    return enonceHtml(g, k, (item.prompt && item.prompt.papier) || '')
        + (m.donnee ? reponseEcriteHtml(g, k, solution ? m.reponse : '') : '')
        + `<svg class="fx-abs" style="position:absolute; left:0; top:0; overflow:visible"
            width="1" height="1">${g.axes.map((a, i) =>
    axeHtmlPapier(g, i, a, k, avecValeurs(item))).join('')}</svg>`;
}

function dessinerValeurAbsoluePdf(doc, item, slot, solution) {
    const m = item.meta || {};
    const g = plantDesAxes(item, slot, { axes: axesDeLaValeurAbsolue(item, solution) });
    enoncePdf(doc, g, (item.prompt && item.prompt.papier) || '');
    if (m.donnee) reponseEcritePdf(doc, g, solution ? m.reponse : '');
    g.axes.forEach((a, i) => axePdf(doc, g, i, a, avecValeurs(item)));
}

// ── UNION ET INTERSECTION : I et J donnés, la réponse à tracer ──────────────

function axesDeLUnion(item, solution) {
    const m = item.meta || {};
    if (!m.I || !m.J) return [];
    const fen = fenetreDe([m.I, m.J, ...(m.reponse || [])]);
    return [
        { parts: [m.I], nom: 'I', fenetre: fen },
        { parts: [m.J], nom: 'J', fenetre: fen },
        // LA TROISIÈME LIGNE EST CELLE DE L'ÉLÈVE. Elle porte la lettre de ce
        // qu'on demande — I ∩ J ou I ∪ J —, sans quoi trois axes nus se
        // ressemblent et l'on ne sait plus lequel remplir.
        {
            parts: solution ? (m.reponse || []) : [],
            // QUAND LA RÉPONSE EST L'ENSEMBLE VIDE, ON L'ÉCRIT.
            //
            // Deux intervalles disjoints donnent I ∩ J = ∅ : le corrigé n'a
            // alors RIEN à tracer, et sa troisième droite sortait identique à
            // celle de l'élève. Une feuille de solutions qu'on ne distingue
            // pas de la feuille de questions ne corrige rien — l'élève qui a
            // justement compris qu'il n'y avait rien à tracer ne peut pas le
            // vérifier.
            //
            // Trouvé par la sonde, sur un tirage que les précédents n'avaient
            // pas donné : `meta.vide` existait déjà, personne ne le lisait.
            nom: (m.op === 'inter' ? 'I ∩ J' : 'I ∪ J')
                + (solution && m.vide ? '  =  ∅' : ''), fenetre: fen,
            // LES MÊMES REPÈRES QUE LES DEUX AXES DU DESSUS. Un axe nu où seuls
            // 0 et 1 sont écrits obligerait l'élève à reporter une LONGUEUR
            // depuis les dessins précédents au lieu de lire une borne — ce qui
            // n'est pas l'exercice, et ce qui se rate.
            bornesEnPlus: [m.I, m.J].flatMap(x => [x.a, x.b]).filter(v => v !== null)
        }
    ];
}

function unionPreviewHtml(item, slot, k, solution) {
    const g = plantDesAxes(item, slot, { axes: axesDeLUnion(item, solution) });
    return enonceHtml(g, k, enoncesDeLUnion(item))
        + `<svg class="fx-abs" style="position:absolute; left:0; top:0; overflow:visible"
            width="1" height="1">${g.axes.map((a, i) =>
    axeHtmlPapier(g, i, a, k, true)).join('')}</svg>`;
}

/**
 * LES DEUX LIGNES DE L'ÉNONCÉ — une par intervalle, jamais coupées.
 *
 * Le générateur les prépare (`meta.enonces`) parce que lui seul sait écrire un
 * intervalle. Le repli découpe l'ancienne phrase sur le « et », pour qu'une
 * feuille rouverte depuis un parcours enregistré hier s'affiche quand même.
 */
function enoncesDeLUnion(item) {
    const m = item.meta || {};
    if (Array.isArray(m.enonces) && m.enonces.length) return m.enonces;
    const brut = (item.prompt && item.prompt.papier) || '';
    return brut.includes(' et J = ') ? brut.split(' et ') : brut;
}

function dessinerUnionPdf(doc, item, slot, solution) {
    const g = plantDesAxes(item, slot, { axes: axesDeLUnion(item, solution) });
    enoncePdf(doc, g, enoncesDeLUnion(item));
    g.axes.forEach((a, i) => axePdf(doc, g, i, a, true));
}

// ── L'ÉNONCÉ, DANS SA COLONNE DE GAUCHE ─────────────────────────────────────

/**
 * L'ÉNONCÉ, DANS SA COLONNE DE GAUCHE.
 *
 * Une CHAÎNE se centre en face des axes — c'est le cas de la valeur absolue,
 * qui n'a qu'une droite et un énoncé court.
 *
 * UN TABLEAU DE LIGNES se pose EN HAUT, une ligne par entrée, et chacune reste
 * entière. RÉMY : « attention à la présentation et au mauvais retour à la ligne
 * pour union et intersection d'intervalle ». Deux défauts, et le second causait
 * le premier :
 *
 *   · « I = ]−4 ; −1[ et J = ]−2 ; 2[ » tenait sur une seule ligne dans une
 *     colonne large d'un quart de page. Le navigateur la coupait où il pouvait,
 *     donc au milieu d'un intervalle ;
 *   · centré sur la hauteur du bloc, cet énoncé se retrouvait en face du
 *     DEUXIÈME axe — celui de J — et se lisait comme s'il ne nommait que lui.
 *
 * Une ligne par intervalle, posées en haut : chaque ligne reste entière, et le
 * bloc se lit de haut en bas comme il s'écrit.
 */
function enonceHtml(g, k, texte) {
    const T = (v) => (v * k).toFixed(2);
    const lignes = Array.isArray(texte) ? texte : null;
    const haut = lignes
        ? g.b.y + g.marge + g.taille * 0.2
        : g.b.y + g.b.h / 2 - g.taille;
    // `white-space:nowrap` : UN INTERVALLE NE SE COUPE PAS NON PLUS EN SON
    // MILIEU. Les séparateurs de « ]−4 ; −1[ » sont des espaces ordinaires —
    // le navigateur a donc deux endroits où couper DANS l'intervalle, et une
    // colonne plus étroite (une feuille en deux colonnes, un énoncé plus long)
    // lui en donnerait l'occasion. Une ligne par intervalle ne suffit pas si
    // la ligne elle-même peut se rompre : on le lui interdit.
    const corps = lignes
        ? lignes.map((l, i) =>
            `<div style="white-space:nowrap; margin-top:${i ? T(g.taille * 0.55) : 0}px">`
                + `${echapperSheet(l)}</div>`).join('')
        : echapperSheet(texte);
    return `<div class="fx-abs" style="position:absolute; left:${T(g.b.x)}px;
        top:${T(haut)}px; width:${T(g.gaucheW - 2)}px;
        font-size:${T(g.taille)}px; line-height:1.3">${corps}</div>`;
}

function enoncePdf(doc, g, texte) {
    doc.setTextColor(...ENCRE.texte);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(g.taille * 2.83);
    // UN TABLEAU DE LIGNES NE PASSE PAS PAR `splitTextToSize` : chacune est
    // déjà entière, et la découper serait précisément le défaut qu'on répare.
    // Voir le long commentaire de `enonceHtml`.
    if (Array.isArray(texte)) {
        texte.forEach((l, i) => doc.text(String(l), g.b.x,
            g.b.y + g.marge + g.taille + i * g.taille * 1.85));
        return;
    }
    const lignes = doc.splitTextToSize(String(texte), g.gaucheW - 2);
    lignes.forEach((l, i) =>
        doc.text(l, g.b.x, g.b.y + g.b.h / 2 - g.taille * 0.2 + i * g.taille * 1.3));
}

/** Le réglage « avec ou sans valeur », demandé par Rémy. */
const avecValeurs = (item) =>
    !((item.params && item.params.axeNu) || (item.meta && item.meta.axeNu));

export const RENDUS_AXES = {
    valeurAbsolueAxe: {
        titre: 'Représenter sur un axe',
        consigne: () => 'Pour chaque condition, trace sur la droite graduée '
            + 'l’ensemble des nombres réels x qui la vérifient.',
        previewGrille: valeurAbsoluePreviewHtml,
        pdfGrille: dessinerValeurAbsoluePdf,
        nomBloc: 'Ligne', nomBlocs: 'lignes',
        // UNE PAR LIGNE, SUR TOUTE LA LARGEUR. Une droite graduée coupée en
        // deux colonnes fait seize graduations sur six centimètres : on n'y
        // trace plus rien à la main.
        disposition: { cols: 1, rows: 7, maxCols: 1, maxRows: 9 },
        parLigneDefaut: 1,
        proportions: { w: 1, h: 0.17 },
        titreAGauche: true
    },
    unionInterAxe: {
        titre: 'Union et intersection',
        consigne: () => 'I et J sont tracés. Trace à ton tour l’ensemble demandé '
            + 'sur la troisième droite.',
        previewGrille: unionPreviewHtml,
        pdfGrille: dessinerUnionPdf,
        nomBloc: 'Ligne', nomBlocs: 'lignes',
        // TROIS AXES EMPILÉS : il en faut la hauteur, et la largeur entière.
        // DEUX PAR PAGE, ET C'EST MESURÉ. Une question porte TROIS droites, et
        // une droite graduée a besoin de sa longueur : à trois questions par
        // page, neuf axes se partageaient la hauteur et chacun tombait à 91 mm
        // de long sur 194 disponibles — la moitié de la feuille restait blanche
        // à droite pendant que les graduations se serraient à gauche.
        //
        // C'est l'inverse de ce que Rémy demande : « la place à droite ».
        disposition: { cols: 1, rows: 2, maxCols: 1, maxRows: 3 },
        parLigneDefaut: 1,
        // TROIS AXES EMPILÉS, ET C'EST LA HAUTEUR QUI COMMANDE. Mesuré à 0,34 :
        // la droite n'occupait qu'un quart de la largeur disponible, parce que
        // l'échelle est bornée par la plus serrée des deux dimensions et que
        // trois axes de 58 unités dans un bloc bas ne laissent presque rien.
        proportions: { w: 1, h: 0.62 },
        titreAGauche: true
    }
};
