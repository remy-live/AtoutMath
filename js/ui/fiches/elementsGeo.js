// ÉLÉMENTS DE GÉOMÉTRIE, SUR LE PAPIER — la figure, et les quatre affirmations.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, dans sa revue du catalogue, sur quatre exercices d'un coup :
//
//   geo-appartenance       « Tu oublies toutes les figures sur la version imprimé »
//   geo-appartenance-demi  « tu oublies toutes les figures »
//   geo-codage-lire        « sur la version imprimé tu oublies toutes les figures... »
//   geo-milieu             « Tu oublies toutes les figures sur la version imprimé »
//
// ── CE QUE LA FEUILLE IMPRIMAIT, ET POURQUOI C'ÉTAIT PIRE QU'INCOMPLET ─────
//
// Dix fois la ligne « Quelle affirmation est vraie ? », et rien d'autre : ni la
// figure, ni les quatre affirmations. Une question dont l'énoncé entier a
// disparu n'est pas incomplète, elle est INSOLUBLE — et elle occupait quand
// même sa place sur la feuille, numérotée, avec sa ligne de réponse.
//
// La cause n'était pas un oubli de rendu : le tuyau de la fiche porte le texte,
// le tableau, les choix et la réponse, et AUCUNE case pour une figure. Ces
// exercices n'avaient donc aucun moyen d'en montrer une, et l'on tombait sur le
// rendu générique « questions écrites », qui écrit `prompt.papier`.
//
// ── POURQUOI UN RENDU, ET NON UNE IMAGE DU SVG ─────────────────────────────
//
// On aurait pu transformer le SVG de l'écran en image et la poser dans le PDF.
// C'est la solution générale, et c'est la mauvaise ici : une image tramée sur
// une photocopie donne des traits gris et baveux, alors qu'un trait vectoriel
// sort net à n'importe quelle échelle. Toute la maison dessine ses figures
// (`fiches/socle.js`, les angles, les solides, le tangram) pour cette raison.
//
// ON NE RECALCULE RIEN POUR AUTANT. `planDeLaScene` et `planFigureCodee`
// rendent les coordonnées que l'écran emploie — placement des noms compris, qui
// est une correction payée : « 56 noms sur 196 touchés par un trait ». Le
// papier les met à son échelle, et c'est tout.

import { planDeLaScene, planFigureCodee, TYPO } from '../../core/pointsDroitesSvg.js';
import { boiteDe, echapperSheet } from './socle.js';
import { traitsDuPoint } from '../../core/figures.js';

/**
 * LE RÉGLAGE « MARQUE DES POINTS », LU À LA MÊME SOURCE QUE LE CSS.
 *
 * `state.stylePoint` le pose sur `document.documentElement.dataset.point`, et
 * la feuille de style s'en sert pour montrer l'une des trois marques. On lit
 * donc cet attribut plutôt que d'importer `core/state.js` : une seule source,
 * et aucun module de plus dans le cercle d'imports des fiches.
 */
const styleDuPoint = () => {
    const v = (typeof document !== 'undefined' && document.documentElement.dataset.point) || '';
    return ['croix', 'plus', 'disque'].includes(v) ? v : 'croix';
};
// L'ENCRE VIENT DU MODULE FEUILLE, et non de `socle.js` qui la ré-exporte :
// les deux constantes ci-dessous sont lues EN TÊTE DE MODULE, et `socle.js`
// est dans un cercle d'imports où une lecture en tête de module jette ou passe
// selon qui a été chargé en premier. Voir `fiches/encre.js`.
// Le noir des traits, nommé dans `encre.js` : deux fichiers qui déclarent
// `TRAIT` sont deux endroits où chercher la même chose.
import { TRAIT } from './encre.js';

/** Le gris des traits ordinaires, le noir de ce qui porte la question. */

/**
 * LA FIGURE EN HAUT, LES AFFIRMATIONS EN BAS.
 *
 * Quatre affirmations tiennent sur deux lignes de deux ; la figure prend le
 * reste. C'est le même partage que sur l'écran, où la figure est au-dessus des
 * boutons — un élève qui a travaillé à l'écran retrouve sa feuille.
 */
function plantDeLaFigure(item, slot) {
    const m = item.meta || {};
    const b = boiteDe(slot);
    const marge = 2;

    const dessiner = (typo) => (m.scene ? planDeLaScene(m.scene, typo ? { typo } : {})
        : m.figure ? planFigureCodee(m.figure, typo ? { typo } : {}) : null);
    // UN PREMIER PLAN POUR CONNAÎTRE L'ENCOMBREMENT, et rien d'autre.
    //
    // L'échelle `k` se déduit de `W` et `H`, qui ne dépendent pas des noms ; et
    // la place des noms, elle, dépend de `k` — voir plus bas. Deux passes donc,
    // dans cet ordre, plutôt qu'un calcul d'échelle recopié ici : l'autre
    // chemin est celui qui a coûté la racine carrée et les deux pointes de
    // flèche.
    const plan0 = dessiner(null);

    // LA PLACE DES AFFIRMATIONS SE CALCULE SUR LEUR NOMBRE, pas sur un
    // pourcentage : deux lignes de deux, plus un peu d'air.
    const choix = (item.choices || []).map(c => String(c.label ?? c.texte ?? ''));
    const lignesChoix = Math.ceil(choix.length / 2);
    const taille = Math.max(2.3, Math.min(b.w * 0.040, 3.4));
    const hChoix = choix.length ? lignesChoix * (taille * 1.75) + 1.2 : 0;
    const dispoH = b.h - hChoix;

    // La figure entre dans ce qui reste, sans jamais s'agrandir au-delà : une
    // scène de douze carreaux étirée sur toute la largeur devient illisible.
    const k = plan0 ? Math.min((b.w - marge * 2) / plan0.W, (dispoH - marge) / plan0.H) : 1;

    // ── OÙ SE POSE LA LETTRE, SUR LE PAPIER ─────────────────────────────
    //
    // RÉMY, deux fois : « le label du point est loin du point », puis « c'est
    // encore bien éloigné le libellé du point dans le codage ».
    //
    // LA FIGURE SE RÉDUIT, LA LETTRE NON. `g.taille` est en millimètres de
    // PAGE ; l'écart, lui, se comptait en unités de FIGURE et se réduisait
    // donc avec `k`. Mesuré sur la feuille à quatre figures par page : les
    // lettres du tour le plus proche laissaient −0,7 px de blanc — c'est-à-dire
    // qu'elles mordaient sur la croix — et celles qui avaient dû s'écarter d'un
    // tour en laissaient 5,6, plus d'une demi-hauteur de lettre. Les deux
    // défauts sur la même page, en sens contraire.
    //
    // ON DONNE DONC AU PLAN LA TYPOGRAPHIE DU PAPIER, convertie en unités de
    // plan — c'est-à-dire divisée par `k`. `placerNoms` en déduit la distance
    // de contact direction par direction, et le blanc qu'on voit est le même
    // partout.
    const corpsMm = taille * 1.05;              // la lettre, telle qu'on l'écrit
    const marqueMm = 0.85 * 0.72 + 0.16;        // la croix, branches et demi-trait
    const typo = {
        ...TYPO,
        corps: corpsMm / k,
        marque: marqueMm / k,
        blanc: (corpsMm * 0.09) / k
    };
    const plan = plan0 ? dessiner(typo) : null;
    // LA FIGURE SE CENTRE DANS SA PLACE, horizontalement ET verticalement.
    //
    // Posée en haut, elle laissait une bande blanche de huit centimètres entre
    // elle et ses affirmations dès que le bloc était plus haut que large — ce
    // qui arrive à chaque fois qu'il n'y a qu'une ligne de figures. L'échelle
    // est bornée par la LARGEUR dans presque tous les cas : la hauteur
    // restante n'est donc pas une marge, c'est du vide à répartir.
    const x0 = b.x + (b.w - (plan ? plan.W * k : 0)) / 2;
    const y0 = b.y + Math.max(marge * 0.5, (dispoH - (plan ? plan.H * k : 0)) / 2);

    return {
        m, b, plan, choix, taille, hChoix, dispoH, k,
        // Du repère de l'écran (y descend déjà) à celui du papier.
        P: (x, y) => ({ x: x0 + x * k, y: y0 + y * k }),
        yChoix: b.y + dispoH
    };
}

/** Les marques du codage : n petits traits en travers, au milieu du segment. */
function marquesDuSegment(g, s) {
    const out = [];
    if (!s.marque) return out;
    const A = g.P(s.A.x, s.A.y), B = g.P(s.B.x, s.B.y);
    const dx = B.x - A.x, dy = B.y - A.y;
    const L = Math.hypot(dx, dy) || 1;
    const ux = dx / L, uy = dy / L;
    const nx = -uy, ny = ux;
    const taille = Math.max(1, Math.min(2.2, L * 0.09));
    const ecart = taille * 0.9;
    const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
    for (let i = 0; i < s.marque; i++) {
        const d = (i - (s.marque - 1) / 2) * ecart;
        const cx = mx + ux * d, cy = my + uy * d;
        out.push([{ x: cx - nx * taille, y: cy - ny * taille },
            { x: cx + nx * taille, y: cy + ny * taille }]);
    }
    return out;
}

/** Les traits d'une figure, quelle que soit sa sorte. */
const traitsDe = (g) => (g.plan.traits
    ? g.plan.traits.map(t => ({ A: { x: t.x1, y: t.y1 }, B: { x: t.x2, y: t.y2 } }))
    : g.plan.segments.map(s => ({ A: s.A, B: s.B })));

// ── L'APERÇU ────────────────────────────────────────────────────────────────

export function elementsGeoPreviewHtml(item, slot, k, solution) {
    const g = plantDeLaFigure(item, slot);
    const T = (v) => (v * k).toFixed(2);
    if (!g.plan) return '';

    const ligne = (A, B, epais, encre) => {
        const a = g.P(A.x, A.y), b2 = g.P(B.x, B.y);
        return `<line x1="${T(a.x)}" y1="${T(a.y)}" x2="${T(b2.x)}" y2="${T(b2.y)}"
            stroke="rgb(${encre.join(',')})" stroke-width="${T(epais)}" stroke-linecap="round"/>`;
    };

    let d = traitsDe(g).map(t => ligne(t.A, t.B, 0.45, TRAIT)).join('');
    if (g.plan.segments) {
        g.plan.segments.forEach(s => marquesDuSegment(g, s).forEach(([p, q]) => {
            d += `<line x1="${T(p.x)}" y1="${T(p.y)}" x2="${T(q.x)}" y2="${T(q.y)}"
                stroke="rgb(${TRAIT.join(',')})" stroke-width="${T(0.42)}" stroke-linecap="round"/>`;
        }));
    }
    // LA MARQUE DU POINT SUIT LE RÉGLAGE DU PROFESSEUR.
    //
    // RÉMY : « il faut se fier au paramètre, sur le pdf un point est représenté
    // par un point alors que dans mes options j'avais mis une croix ».
    //
    // La fiche dessinait un disque EN DUR, et j'avais même écrit le commentaire
    // qui le justifiait — « une croix se confondrait avec une marque de
    // codage ». L'argument n'était pas faux ; il n'était pas à moi. Le réglage
    // existe, il est à lui, et il dit croix par défaut parce que c'est la
    // convention des manuels.
    //
    // À l'écran, le SVG dessine les trois marques et le CSS en cache deux —
    // c'est ce qui les fait changer à l'instant où l'on touche le réglage. Le
    // papier n'a pas de feuille de style : il lit `data-point` sur la racine,
    // qui est la MÊME source que le CSS, et trace la marque demandée.
    const marque = styleDuPoint();
    g.plan.points.forEach(p => {
        const c = g.P(p.x, p.y);
        const m = traitsDuPoint(c.x, c.y, marque, 0.85);
        // `class="eg-point"` NE SERT À RIEN AU DESSIN, et tout à la MESURE.
        //
        // La sonde comptait les `<circle>` et appelait ça « les points ». Le
        // jour où un point est devenu deux traits, elle a annoncé « 0 point »
        // sans broncher — et elle aurait annoncé la même chose si les marques
        // avaient disparu. Une mesure qui ne peut plus voir son sujet rend la
        // réponse d'un logiciel cassé.
        if (m.disque) {
            d += `<circle class="eg-point" cx="${T(c.x)}" cy="${T(c.y)}"
                r="${T(m.rayon)}" fill="rgb(${TRAIT.join(',')})"/>`;
            return;
        }
        m.traits.forEach(t => {
            d += `<line class="eg-point" x1="${T(t.x1)}" y1="${T(t.y1)}"
                x2="${T(t.x2)}" y2="${T(t.y2)}"
                stroke="rgb(${TRAIT.join(',')})" stroke-width="${T(0.32)}"
                stroke-linecap="round"/>`;
        });
    });
    g.plan.points.forEach(p => {
        const n = g.plan.noms[p.nom];
        const c = g.P(n.x, n.y);
        d += `<text x="${T(c.x)}" y="${T(c.y + 1.3)}" text-anchor="middle"
            font-size="${T(g.taille * 1.05)}" font-weight="700"
            fill="rgb(${TRAIT.join(',')})">${echapperSheet(p.nom)}</text>`;
    });

    const svg = `<svg class="fx-abs" style="left:0; top:0; position:absolute; overflow:visible"
        width="1" height="1">${d}</svg>`;

    // LES QUATRE AFFIRMATIONS, DEUX PAR LIGNE, chacune devant sa case.
    const bonne = (item.choices || []).findIndex(c => c.correct);
    const cases = g.choix.map((c, i) => {
        const col = i % 2, lig = Math.floor(i / 2);
        const x = g.b.x + 1.5 + col * (g.b.w - 3) / 2;
        const y = g.yChoix + lig * (g.taille * 1.75);
        const coche = solution && i === bonne;
        return `<div class="fx-abs" style="position:absolute; left:${T(x)}px; top:${T(y)}px;
            width:${T((g.b.w - 3) / 2 - 1)}px; font-size:${T(g.taille)}px; line-height:1.25">
            <span style="display:inline-block; width:${T(g.taille * 0.9)}px;
                height:${T(g.taille * 0.9)}px; border:${T(0.25)}px solid rgb(${TRAIT.join(',')});
                margin-right:${T(0.8)}px; vertical-align:-10%;
                background:${coche ? `rgb(${TRAIT.join(',')})` : 'transparent'}"></span>${
    echapperSheet(c)}</div>`;
    }).join('');

    return svg + cases;
}

// ── LE PDF ──────────────────────────────────────────────────────────────────

export function dessinerElementsGeoPdf(doc, item, slot, solution) {
    const g = plantDeLaFigure(item, slot);
    if (!g.plan) return;

    doc.setDrawColor(...TRAIT);
    doc.setLineCap('round');
    doc.setLineWidth(0.45);
    traitsDe(g).forEach(t => {
        const a = g.P(t.A.x, t.A.y), b2 = g.P(t.B.x, t.B.y);
        doc.line(a.x, a.y, b2.x, b2.y);
    });
    if (g.plan.segments) {
        doc.setLineWidth(0.42);
        g.plan.segments.forEach(s => marquesDuSegment(g, s).forEach(([p, q]) =>
            doc.line(p.x, p.y, q.x, q.y)));
    }

    // La marque du point suit le réglage — voir l'aperçu, même source.
    const marque = styleDuPoint();
    doc.setFillColor(...TRAIT);
    doc.setDrawColor(...TRAIT);
    doc.setLineWidth(0.32);
    doc.setLineCap('round');
    g.plan.points.forEach(p => {
        const c = g.P(p.x, p.y);
        const m = traitsDuPoint(c.x, c.y, marque, 0.85);
        if (m.disque) { doc.circle(c.x, c.y, m.rayon, 'F'); return; }
        m.traits.forEach(t => doc.line(t.x1, t.y1, t.x2, t.y2));
    });
    doc.setLineCap('butt');

    doc.setTextColor(...TRAIT);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(g.taille * 1.05 * 2.83);
    g.plan.points.forEach(p => {
        const n = g.plan.noms[p.nom];
        const c = g.P(n.x, n.y);
        doc.text(p.nom, c.x, c.y + 1.3, { align: 'center' });
    });

    // LES AFFIRMATIONS, ET LEUR CASE. Dessinée, jamais écrite : le caractère
    // « ☐ » n'existe pas dans les polices standard du PDF — piège déjà payé
    // par la ligne de choix de `ficheRendu.js`.
    const bonne = (item.choices || []).findIndex(c => c.correct);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(g.taille * 2.83);
    g.choix.forEach((c, i) => {
        const col = i % 2, lig = Math.floor(i / 2);
        const x = g.b.x + 1.5 + col * (g.b.w - 3) / 2;
        const y = g.yChoix + lig * (g.taille * 1.75);
        const cote = g.taille * 0.9;
        doc.setLineWidth(0.25);
        doc.setDrawColor(...TRAIT);
        doc.rect(x, y, cote, cote, solution && i === bonne ? 'FD' : 'S');
        doc.setTextColor(...TRAIT);
        doc.text(String(c), x + cote + 0.8, y + cote * 0.85);
    });
}

/**
 * LE RENDU, POUR LES QUATRE EXERCICES.
 *
 * DEUX PAR LIGNE, DEUX LIGNES. Une figure de géométrie et quatre affirmations
 * ne tiennent pas dans un quart de colonne : à trois par ligne, la scène tombe
 * sous deux centimètres et les noms des points se touchent. Quatre questions
 * par page, c'est ce que fait sa fiche de 6e.
 */
export const RENDUS_ELEMENTS_GEO = {
    geoElements: {
        titre: 'Éléments de géométrie',
        consigne: (items) => (items[0] && items[0].prompt && items[0].prompt.papier)
            || 'Coche l\'affirmation vraie.',
        previewGrille: elementsGeoPreviewHtml,
        pdfGrille: dessinerElementsGeoPdf,
        nomBloc: 'Figure', nomBlocs: 'figures',
        disposition: { cols: 2, rows: 2, maxCols: 2, maxRows: 3 },
        parLigneDefaut: 2,
        // Un peu plus haut que large : la figure dessus, les affirmations
        // dessous, et les affirmations sont des phrases, pas des nombres.
        proportions: { w: 1, h: 1.15 },
        titreAGauche: true
    }
};
