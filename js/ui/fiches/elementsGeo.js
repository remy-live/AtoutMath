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

import { planDeLaScene, planFigureCodee } from '../../core/pointsDroitesSvg.js';
import { ENCRE, boiteDe, echapperSheet } from './socle.js';

/** Le gris des traits ordinaires, le noir de ce qui porte la question. */
const TRAIT = ENCRE.trait;

/**
 * LA FIGURE EN HAUT, LES AFFIRMATIONS EN BAS.
 *
 * Quatre affirmations tiennent sur deux lignes de deux ; la figure prend le
 * reste. C'est le même partage que sur l'écran, où la figure est au-dessus des
 * boutons — un élève qui a travaillé à l'écran retrouve sa feuille.
 */
function plant(item, slot) {
    const m = item.meta || {};
    const b = boiteDe(slot);
    const marge = 2;

    const plan = m.scene ? planDeLaScene(m.scene)
        : m.figure ? planFigureCodee(m.figure) : null;

    // LA PLACE DES AFFIRMATIONS SE CALCULE SUR LEUR NOMBRE, pas sur un
    // pourcentage : deux lignes de deux, plus un peu d'air.
    const choix = (item.choices || []).map(c => String(c.label ?? c.texte ?? ''));
    const lignesChoix = Math.ceil(choix.length / 2);
    const taille = Math.max(2.3, Math.min(b.w * 0.040, 3.4));
    const hChoix = choix.length ? lignesChoix * (taille * 1.75) + 1.2 : 0;
    const dispoH = b.h - hChoix;

    // La figure entre dans ce qui reste, sans jamais s'agrandir au-delà : une
    // scène de douze carreaux étirée sur toute la largeur devient illisible.
    const k = plan ? Math.min((b.w - marge * 2) / plan.W, (dispoH - marge) / plan.H) : 1;
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
    const g = plant(item, slot);
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
    // LES POINTS SONT DES DISQUES PLEINS, et les noms à côté. Une croix se
    // confondrait avec une marque de codage sur la même figure.
    g.plan.points.forEach(p => {
        const c = g.P(p.x, p.y);
        d += `<circle cx="${T(c.x)}" cy="${T(c.y)}" r="${T(0.72)}"
            fill="rgb(${TRAIT.join(',')})"/>`;
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
    const g = plant(item, slot);
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

    doc.setFillColor(...TRAIT);
    g.plan.points.forEach(p => {
        const c = g.P(p.x, p.y);
        doc.circle(c.x, c.y, 0.72, 'F');
    });

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
