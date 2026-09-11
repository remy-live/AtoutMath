// LE SOCLE DES FICHES — ce dont plusieurs familles se servent.
//
// Rien ici n'appartient à un exercice en particulier : c'est la règle qui a
// décidé du contenu de ce fichier. Une fonction qu'UNE seule entrée de
// `RENDUS` atteint part avec sa famille ; celles qu'en atteignent deux ou
// plus restent ici. Voir `tools/decouperPrintSheet.mjs`.

import { HAUTEUR_ETIQUETTE as HAUTEUR_ETIQ_ANGLE, ancreArc as ancreArcAngle, boiteFigure as boiteFigureAngle, contourSecteur as contourSecteurAngle, equerreDe as equerreAngle, etiquetteDedans as etiqDedansAngle, rayonSecteur as rayonSecteurAngle } from '../../core/anglesRemarquables.js';
import { encre, mesureur, polycopieEnCouleur, pourPdf, texteRiche } from '../ficheRendu.js';
import { sommets as sommetsAngles } from '../../core/anglesRemarquablesSvg.js';

export const ENCRE = { trait: [26, 32, 44], grille: [176, 182, 197], donnee: [238, 240, 250],
    texte: [45, 55, 72], gris: [110, 118, 132] };

// --- LES PLATEAUX À JOUER SUR PAPIER : puissance 4 et sim ---------------------
//
// Rémy : « on pourrait avoir un pdf de grille vide », « un pdf de jeu vide ».
// Ce ne sont pas des exercices à corriger, ce sont des SUPPORTS : on imprime,
// on distribue, deux élèves jouent au crayon de couleur. La correction n'a
// donc rien à montrer — c'est le même plateau vide, et c'est normal.

/** La boîte d'un bloc, quelle que soit la façon dont le gabarit l'a posée. */
export const boiteDe = (slot) => slot.boite || { x: slot.x, y: slot.y, w: slot.taille, h: slot.taille };

// --- LES ANGLES REMARQUABLES SUR LE PAPIER ------------------------------------
//
// La même figure qu'à l'écran, tirée des mêmes données (core/anglesRemarquables
// .js). Ici on la pose dans un bloc en millimètres, et l'on écrit dessous la
// ligne où l'élève donne sa réponse.
//
// LES DEUX COULEURS SURVIVENT À LA PHOTOCOPIEUSE. L'angle donné est ambré,
// celui qu'on cherche est vert : en noir et blanc, l'un tombe en gris moyen et
// l'autre en gris clair, et les deux portent un contour — c'est la règle de la
// maison, la couleur ajoute du confort mais ne porte jamais l'information
// seule. Un « ? » posé dans le secteur cherché le dit d'ailleurs en toutes
// lettres.

export const ENCRE_ANGLE = {
    donne: { fond: [253, 224, 160], trait: [199, 120, 0] },
    cherche: { fond: [200, 236, 218], trait: [31, 122, 77] },
    relais: { fond: [222, 226, 245], trait: [91, 107, 191] }
};

export function geoAnglesManquants(item, slot, partLigne = 0.2) {
    const m = item.meta;
    const b = boiteDe(slot);
    const marge = 2;
    // La ligne de réponse en bas, et le dessin dans tout le reste.
    const ligneH = Math.min(9, b.h * partLigne);
    const dispoH = b.h - ligneH;
    // LA FIGURE REMPLIT SON BLOC. Enfermée dans le carré inscrit, elle n'en
    // occupait qu'un tiers : un bloc de fiche est large et bas, une paire de
    // droites penchées aussi, et forcer un carré perdait les deux tiers de la
    // largeur. On mesure la boîte réelle du dessin — étiquettes comprises — et
    // l'on ajuste dessus, comme pour les rapporteurs.
    const bf = boiteFigureAngle(m.figure);
    const k = Math.min((b.w - marge * 2) / bf.largeur, (dispoH - marge) / bf.hauteur);
    const cx = b.x + b.w / 2 - ((bf.xmin + bf.xmax) / 2) * k;
    const cy = b.y + dispoH / 2 + ((bf.ymin + bf.ymax) / 2) * k;
    return {
        m, b, k, cx, cy, ligneH, dispoH,
        // Du repère mathématique (y monte) au papier (y descend).
        P: (x, y) => ({ x: cx + x * k, y: cy - y * k }),
        yReponse: b.y + dispoH + ligneH * 0.62,
        // La taille de la ligne « ? = » suit le bloc ; celle des étiquettes
        // suit LE DESSIN, pour que `ancreArc` leur ait réservé la bonne place.
        //
        // MAIS JAMAIS PLUS QUE SA PART DU BLOC. Un angle plein tient dans un
        // petit disque et se dessine donc très agrandi : à l'échelle du dessin,
        // son « 183° » sortait deux fois plus gros que le « 51° » de la figure
        // d'à côté, et la planche entière paraissait bancale. On plafonne — un
        // plafond ne fait que RÉDUIRE l'étiquette, donc la place que `ancreArc`
        // lui a réservée reste suffisante.
        taille: Math.max(2.6, Math.min(Math.min(b.w, dispoH) * 0.085, 4.4)),
        tailleEtiq: Math.min(HAUTEUR_ETIQ_ANGLE * k, Math.max(2.2, Math.min(b.w, dispoH) * 0.075))
    };
}

/**
 * LE DESSIN SEUL — sans la ligne de réponse, qui n'est pas la même selon qu'on
 * demande une MESURE ou un NOM. `etiquette` dit ce qu'on écrit dans chaque
 * secteur : sa mesure, un « ? », ou son numéro.
 */
export function figureAnglePreviewHtml(g, k, etiquette) {
    const m = g.m;
    const T = (v) => (v * k).toFixed(2);
    // EN NOIR ET BLANC, UN SECTEUR N'EST PLUS UN APLAT MAIS UN CONTOUR.
    //
    // C'est la règle de la maison — la couleur ajoute du confort, jamais
    // l'information — et c'est aussi ce qui distingue « noir et blanc » de
    // « niveau de gris » : le premier rend une figure de manuel, en ligne
    // claire ; le second garde les aplats et les ramène à des gris. Ici rien
    // n'est perdu : chaque secteur porte déjà sa mesure ou son « ? ».
    const aplat = polycopieEnCouleur();
    const Q = (x, y) => { const p = g.P(x, y); return `${T(p.x)},${T(p.y)}`; };
    let d = '';
    m.figure.arcs.forEach((arc, i) => {
        const rangArc = m.figure.arcs.slice(0, i)
            .filter(a => Math.abs(a.x - arc.x) < 1e-9 && Math.abs(a.y - arc.y) < 1e-9).length;
        const pts = contourSecteurAngle(arc, rayonSecteurAngle(arc, rangArc)).map(p => Q(p.x, p.y));
        const c = ENCRE_ANGLE[arc.role] || ENCRE_ANGLE.donne;
        d += `<polygon points="${pts.join(' ')}"
            fill="${aplat ? `rgb(${c.fond.join(',')})` : 'none'}"
            stroke="rgb(${c.trait.join(',')})" stroke-width="${T(aplat ? 0.35 : 0.5)}"
            ${arc.role === 'relais' ? `stroke-dasharray="${T(1.2)} ${T(1)}"` : ''}/>`;
    });
    m.figure.traits.forEach(t => {
        const a = g.P(t.x1, t.y1), z = g.P(t.x2, t.y2);
        d += `<line x1="${T(a.x)}" y1="${T(a.y)}" x2="${T(z.x)}" y2="${T(z.y)}"
            stroke="#1a202c" stroke-width="${T(0.5)}" stroke-linecap="round"
            ${t.pointille ? `stroke-dasharray="${T(2)} ${T(1.4)}"` : ''}/>`;
    });
    if (m.figure.droit) {
        const pts = equerreAngle(m.figure.droit).map(p => Q(p.x, p.y));
        d += `<polyline points="${pts.join(' ')}" fill="none" stroke="#1a202c" stroke-width="${T(0.4)}"/>`;
    }
    sommetsAngles(m.figure).forEach(s => {
        const p = g.P(s.x, s.y);
        d += `<circle cx="${T(p.x)}" cy="${T(p.y)}" r="${T(0.6)}" fill="#1a202c"/>`;
    });
    let html = `<svg class="fx-fig-svg" style="left:0; top:0; width:100%; height:100%">${d}</svg>`;
    m.figure.arcs.forEach(arc => {
        const mot = etiquette(arc);
        if (!mot) return;
        const ancre = ancreArcAngle(arc);
        const p = g.P(ancre.x, ancre.y);
        const c = ENCRE_ANGLE[arc.role] || ENCRE_ANGLE.donne;
        // La même gomme qu'au PDF : le fond du secteur quand l'étiquette est
        // dedans, le blanc du papier quand elle est derrière l'arc.
        const gomme = aplat && etiqDedansAngle(arc) ? `rgb(${c.fond.join(',')})` : '#fff';
        html += `<div class="fx-ar-mesure" style="left:${T(p.x - 8)}px; top:${T(p.y - g.tailleEtiq * 0.7)}px;
            width:${T(16)}px; font-size:${T(g.tailleEtiq)}px;
            color:rgb(${c.trait.join(',')})"><span
            style="background:${gomme}">${echapperSheet(mot)}</span></div>`;
    });
    return html;
}

/** La ligne de réponse sous la figure : une amorce, et ce qu'on y écrit. */
export function ligneAnglePreviewHtml(g, k, amorce, rep) {
    const T = (v) => (v * k).toFixed(2);
    return `<div class="fx-ligne-rep" style="left:${T(g.b.x + 2)}px;
        top:${T(g.b.y + g.dispoH)}px; width:${T(g.b.w - 4)}px; height:${T(g.ligneH * 0.8)}px;
        font-size:${T(g.taille)}px"><b>${echapperSheet(amorce)}</b>&nbsp;<i>${echapperSheet(rep)}</i></div>`;
}

export function dessinerFigureAnglePdf(doc, g, etiquette) {
    const m = g.m;
    // En noir et blanc : un contour, pas un aplat (voir figureAnglePreviewHtml).
    const aplat = polycopieEnCouleur();
    m.figure.arcs.forEach((arc, i) => {
        const rangArc = m.figure.arcs.slice(0, i)
            .filter(a => Math.abs(a.x - arc.x) < 1e-9 && Math.abs(a.y - arc.y) < 1e-9).length;
        const pts = contourSecteurAngle(arc, rayonSecteurAngle(arc, rangArc)).map(p => g.P(p.x, p.y));
        const c = ENCRE_ANGLE[arc.role] || ENCRE_ANGLE.donne;
        doc.setFillColor(...c.fond);
        doc.setDrawColor(...c.trait);
        doc.setLineWidth(aplat ? 0.35 : 0.5);
        const suite = pts.slice(1).map((p, j) => [p.x - pts[j].x, p.y - pts[j].y]);
        doc.lines(suite, pts[0].x, pts[0].y, [1, 1], aplat ? 'FD' : 'S', true);
    });
    doc.setDrawColor(...ENCRE.trait);
    doc.setLineWidth(0.5);
    doc.setLineCap('round');
    m.figure.traits.forEach(t => {
        const a = g.P(t.x1, t.y1), z = g.P(t.x2, t.y2);
        if (t.pointille && doc.setLineDashPattern) doc.setLineDashPattern([2, 1.4], 0);
        doc.line(a.x, a.y, z.x, z.y);
        if (t.pointille && doc.setLineDashPattern) doc.setLineDashPattern([], 0);
    });
    doc.setLineCap('butt');
    if (m.figure.droit) {
        const pts = equerreAngle(m.figure.droit).map(p => g.P(p.x, p.y));
        doc.setLineWidth(0.4);
        doc.line(pts[0].x, pts[0].y, pts[1].x, pts[1].y);
        doc.line(pts[1].x, pts[1].y, pts[2].x, pts[2].y);
    }
    doc.setFillColor(...ENCRE.trait);
    sommetsAngles(m.figure).forEach(s => {
        const p = g.P(s.x, s.y);
        doc.circle(p.x, p.y, 0.6, 'F');
    });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(g.tailleEtiq / 0.3528);
    m.figure.arcs.forEach(arc => {
        const ancre = ancreArcAngle(arc);
        const p = g.P(ancre.x, ancre.y);
        const c = ENCRE_ANGLE[arc.role] || ENCRE_ANGLE.donne;
        const brut = etiquette(arc);
        if (!brut) return;
        const mot = pourPdf(brut);
        // LE BLANC SOUS L'ÉTIQUETTE. Un côté d'angle passe forcément près de
        // sa bissectrice quand l'angle est serré ; un rectangle blanc posé
        // avant le texte coupe le trait juste là, comme une gomme, et le
        // nombre reste lisible sans qu'on ait à écarter la figure.
        const lg = doc.getTextWidth(mot) + 0.8, ht = g.tailleEtiq * 0.9;
        // Dedans, la gomme prend la couleur du secteur : blanche, elle y
        // perçait un trou. Sans aplat, c'est le blanc du papier partout.
        doc.setFillColor(...(aplat && etiqDedansAngle(arc) ? c.fond : [255, 255, 255]));
        doc.rect(p.x - lg / 2, p.y - ht * 0.62, lg, ht, 'F');
        doc.setTextColor(...c.trait);
        doc.text(mot, p.x, p.y + g.tailleEtiq * 0.35, { align: 'center' });
    });

}

/**
 * LA LIGNE DE RÉPONSE SOUS UNE FIGURE : une amorce, puis la réponse ou un
 * pointillé à remplir. Commune à tous les blocs « une figure, et de quoi écrire
 * dessous » — les angles, les cubes — et c'est pour cela qu'elle ne porte plus le
 * nom d'un seul d'entre eux.
 */
export function ligneReponsePdf(doc, g, amorce, rep) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(g.taille / 0.3528);
    doc.setTextColor(...ENCRE.texte);
    doc.text(pourPdf(amorce), g.b.x + 2, g.yReponse);
    const x = g.b.x + 2 + doc.getTextWidth(pourPdf(amorce)) + 2;
    if (rep) {
        doc.setTextColor(47, 133, 90);
        doc.text(pourPdf(rep), x, g.yReponse);
        doc.setTextColor(...ENCRE.texte);
        return;
    }
    doc.setDrawColor(...ENCRE.grille);
    doc.setLineWidth(0.25);
    if (doc.setLineDashPattern) doc.setLineDashPattern([0.6, 0.9], 0);
    doc.line(x, g.yReponse, g.b.x + g.b.w - 2, g.yReponse);
    if (doc.setLineDashPattern) doc.setLineDashPattern([], 0);
}

export const POINTE = 0.26;           // longueur de la pointe

/** Une approximation de la largeur d'un texte en Helvetica, en millimètres. */
export const largeurTexte = (s, pt) => String(s).length * pt * 0.48 * 0.3528;

export const echapperSheet = (t) => String(t).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

/**
 * La marque d'une paire, dessinée au trait. Huit formes franches, qui restent
 * distinctes à cinq millimètres et après une photocopie — là où huit
 * caractères de police se ressembleraient tous.
 */
export function dessinerMarque(doc, id, cx, cy, r, encre) {
    doc.setFillColor(...encre);
    doc.setDrawColor(...encre);
    doc.setLineWidth(r * 0.42);
    const k = id % 8;
    if (k === 0) doc.circle(cx, cy, r * 0.72, 'F');
    else if (k === 1) doc.rect(cx - r * 0.66, cy - r * 0.66, r * 1.32, r * 1.32, 'F');
    else if (k === 2) doc.triangle(cx, cy - r, cx - r * 0.9, cy + r * 0.7, cx + r * 0.9, cy + r * 0.7, 'F');
    else if (k === 3) {
        doc.triangle(cx, cy - r, cx + r, cy, cx, cy + r, 'F');
        doc.triangle(cx, cy - r, cx - r, cy, cx, cy + r, 'F');
    }
    else if (k === 4) { doc.line(cx - r, cy, cx + r, cy); doc.line(cx, cy - r, cx, cy + r); }
    else if (k === 5) { doc.line(cx - r * 0.8, cy - r * 0.8, cx + r * 0.8, cy + r * 0.8);
        doc.line(cx - r * 0.8, cy + r * 0.8, cx + r * 0.8, cy - r * 0.8); }
    else if (k === 6) { doc.circle(cx, cy, r * 0.78, 'S'); doc.circle(cx, cy, r * 0.3, 'F'); }
    else { doc.rect(cx - r * 0.7, cy - r * 0.7, r * 1.4, r * 1.4, 'S'); doc.circle(cx, cy, r * 0.3, 'F'); }
}

/**
 * LA PLANCHE DE VIGNETTES D'UNE SOLUTION, ET COMMENT ELLE SE RANGE.
 *
 * Rémy : « pour les solutions des grenouilles, parking, hanoï, dessine des
 * vignettes des étapes pour la correction. » La page de solutions redessinait
 * jusqu'ici le plateau VIDE — le même que l'énoncé, à ceci près qu'il était
 * annoncé comme un corrigé. Elle ne corrigeait donc rien.
 *
 * Une solution de casse-tête ne s'écrit pas, elle se regarde : quinze coups
 * pour la tour, vingt-quatre pour les grenouilles, cent quatre pour le
 * parking. Une vignette par position — le départ, puis l'état après chaque
 * coup —, numérotée, et l'on suit du doigt.
 *
 * LE NOMBRE DE COLONNES NE SE DÉCRÈTE PAS, IL SE CHERCHE. Cent cinq plateaux
 * de parking sur une page : à huit colonnes chaque vignette fait vingt
 * millimètres, à quinze elle en fait onze. On essaie donc toutes les
 * découpes et l'on garde CELLE QUI DONNE LA PLUS GRANDE VIGNETTE — c'est le
 * seul critère qui compte pour un corrigé qu'on lit à un mètre.
 *
 * @param {Object} b        - la boîte du bloc, en millimètres
 * @param {number} nb       - combien de positions à montrer
 * @param {number} rapport  - largeur / hauteur d'un mini-plateau
 * @param {Object} [opts]   - { hTitre } la bande du titre, en haut
 */
export function planchePasAPas(b, nb, rapport, opts = {}) {
    const hTitre = opts.hTitre === undefined ? 7 : opts.hTitre;
    const dispoH = Math.max(1, b.h - hTitre);
    let best = null;
    for (let cols = 1; cols <= nb; cols++) {
        const rows = Math.ceil(nb / cols);
        const cw = b.w / cols, ch = dispoH / rows;
        // La légende — « Départ », « 1 », « 2 »… — vit au-dessus de sa
        // vignette : sans elle on ne sait plus à quel coup on en est.
        const legende = Math.max(1.6, Math.min(3, ch * 0.2));
        // UNE GOUTTIÈRE ENTRE DEUX VIGNETTES. À 94 % de leur case, cent cinq
        // plateaux de parking se touchaient bord à bord et l'on ne savait plus
        // où finissait l'un et où commençait l'autre.
        const w = Math.min(cw * 0.86, (ch - legende * 1.5) * rapport);
        if (!(w > 0.5)) continue;
        const cand = { cols, rows, cw, ch, w, h: w / rapport, legende };
        if (!best || cand.w > best.w) best = cand;
    }
    if (!best) return null;
    /** Où tombe la vignette numéro `i` : sa légende, puis son plateau. */
    const place = (i) => {
        const c = i % best.cols, r = Math.floor(i / best.cols);
        const x0 = b.x + c * best.cw, y0 = b.y + hTitre + r * best.ch;
        return {
            x: x0 + (best.cw - best.w) / 2,
            y: y0 + best.legende * 1.4,
            xLegende: x0 + best.cw / 2,
            yLegende: y0 + best.legende
        };
    };
    /** « Départ », puis le numéro du coup. */
    const legendeDe = (i) => (i === 0 ? 'Départ' : String(i));
    return { ...best, hTitre, place, legendeDe };
}

/** Le titre de la planche : ce que le corrigé annonce en haut de page. */
export const titrePasAPas = (coups) => `La partie parfaite, coup par coup — ${coups} coups`;

/** « #ef4444 » en composantes, pour jsPDF. */
export const rvbHex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16)];

/**
 * LES FIGURES SONT EN COULEUR, ET PAS TOUTES DE LA MÊME.
 *
 * Rémy : « couleur sur le PDF, varier les couleurs dans l'exercice ». Neuf
 * rectangles noirs identiques se confondent d'une ligne à l'autre — on ne sait
 * plus quelle réponse va avec quelle figure. Et la couleur dit quelque chose :
 * le TOUR pour le périmètre, la SURFACE pour l'aire. C'est très exactement la
 * confusion qui coûte le plus de points.
 */
export const TEINTES_FIGURE = [
    { trait: [37, 99, 235], fond: [219, 234, 254] },     // bleu
    { trait: [22, 163, 74], fond: [220, 252, 231] },     // vert
    { trait: [219, 39, 119], fond: [252, 231, 243] },    // rose
    { trait: [217, 119, 6], fond: [254, 243, 199] },     // ambre
    { trait: [124, 58, 237], fond: [237, 233, 254] },    // violet
    { trait: [13, 148, 136], fond: [204, 251, 241] }     // sarcelle
];

export const teinteFigure = (i) => TEINTES_FIGURE[(i || 0) % TEINTES_FIGURE.length];

/**
 * LE RANG DU BLOC — d'où qu'il vienne.
 *
 * Rémy : « quand le poly est en couleur, n'hésite pas à mettre des couleurs
 * différentes ». Elles y étaient déjà : six teintes, une par figure, choisies
 * sur le RANG du bloc. Sur la feuille d'un exercice seul, elles tournaient
 * bien ; dans un parcours, tous les triangles sortaient du même bleu.
 *
 * La raison est celle du mois dernier, au mot près : la feuille de parcours ne
 * passait pas le rang. Elle le pose maintenant dans l'emplacement — comme la
 * liste des voisins, voir `blocsVoisins` —, et l'on regarde les deux. Sans ce
 * rang, `teinteFigure(undefined)` rendait toujours la première teinte, et six
 * couleurs n'en faisaient qu'une.
 */
export const rangDuBloc = (slot, rang) => (Number.isFinite(rang) ? rang
    : (slot && Number.isFinite(slot.rang) ? slot.rang : 0));

export const rvbCss = (c) => `rgb(${c.join(',')})`;

/**
 * La ligne « Périmètre = ……… cm » sous une figure, commune au triangle et au
 * disque. (Le nom porte « Figure » : `ligneReponsePdf` existe déjà plus haut,
 * pour les blocs de texte, et ne prend pas les mêmes mesures.)
 */
export function ligneReponseFigurePdf(doc, g, q, solution, champ, unite) {
    const y = g.ligneY + g.ligneH * 0.68;
    const x0 = g.b.x + 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(Math.max(6.5, Math.min(g.ligneH * 1.4, 11)));
    doc.setTextColor(...ENCRE.texte);
    // π ET EXPOSANTS S'ÉCRIVENT ICI. « Périmètre exact = 16π cm » passait par
    // `pourPdf`, qui ne sait pas les écrire et les translittère : la feuille
    // imprimait « 16pi cm² ». Voir `texteRiche`.
    const corps = Math.max(6.5, Math.min(g.ligneH * 1.4, 11)) * 0.3528;
    const etiquette = `${q.etiquette} ${q.signe || '='}`;
    const xr = x0 + texteRiche(doc, etiquette, x0, y, corps) + 2;
    if (solution) { texteRiche(doc, q.valeur, xr, y, corps); return; }
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...ENCRE.gris);
    doc.text(pourPdf(`.............. ${unite || ''}`.trim()), xr, y);
    if (champ) champ(xr, y - g.ligneH * 0.6, g.b.x + g.b.w - 2 - xr, g.ligneH * 0.8);
}

/**
 * LES BLOCS AVEC LESQUELS CELUI-CI PARTAGE SON ÉCHELLE.
 *
 * Quatre rendus ne se règlent pas sur le bloc qu'ils dessinent mais sur toute
 * la feuille : les hiéroglyphes, pour que le même bâton fasse la même taille
 * partout ; les disques, les rectangles et les triangles, pour que la plus
 * grande figure donne l'échelle des autres.
 *
 * DEUX FEUILLES LES APPELLENT, ET UNE SEULE LEUR DISAIT. La fiche d'un
 * exercice seul passe la liste en dernier argument (voir l'appel de
 * `previewGrille`) ; celle d'un parcours ne la passait pas du tout, et chaque
 * bloc se calculait alors comme s'il était seul — d'où des signes deux fois
 * plus petits d'une case à l'autre, et des lignes de réponse à des hauteurs
 * différentes. Rémy : « pourquoi ce décalage ? » La liste voyage maintenant
 * aussi dans l'emplacement, et l'on regarde les deux.
 */
export function blocsVoisins(item, slot, tous) {
    if (tous && tous.length) return tous;
    const dansLEmplacement = slot && slot.tous;
    if (dansLEmplacement && dansLEmplacement.length) return dansLEmplacement;
    return [item];
}

// --- Le quadrillage des transformations --------------------------------------
//
// Le même dessin que l'écran, aux mêmes coordonnées : le noyau donne des cases
// et un axe en COORDONNÉES DE CASE, et le demi-carreau qui mène au centre de la
// case est appliqué ici comme il l'est dans `core/quadrillageSvg.js`. Deux
// conversions différentes auraient déplacé l'axe d'un demi-carreau entre
// l'écran et la feuille, et rendu l'un des deux corrigés faux.
//
// LA FIGURE DE DÉPART EST HACHURÉE, PAS NOIRCIE : l'élève doit pouvoir écrire
// par-dessus au crayon, et une case pleine à la photocopieuse devient un carré
// noir où plus rien ne se lit.

/** La géométrie du bloc : où commence la grille, et quel est le pas. */
export function geoQuadrillage(item, slot, lignesBas = 1.7) {
    const m = item.meta || {};
    const b = slot.boite || { x: slot.x, y: slot.y, w: slot.taille, h: slot.taille };
    const L = Math.max(1, m.largeur || 10), H = Math.max(1, m.hauteur || 10);
    // Le carreau est CARRÉ, sinon ce n'est plus un quadrillage : on prend le
    // plus petit des deux pas possibles et l'on centre ce qui reste.
    // Une bande est réservée EN BAS pour la légende : sans elle, deux
    // quadrillages voisins de la même feuille ne se distinguent pas — un axe
    // vertical et un centre posé sur la même colonne se ressemblent beaucoup.
    const pt = Math.max(5.5, Math.min(9, b.h * 0.055));
    const legendeH = pt * 0.3528 * lignesBas;
    const pas = Math.min((b.w * 0.92) / L, ((b.h - legendeH) * 0.94) / H);
    return {
        m, L, H, pas, boite: b, pt, legendeH,
        x0: b.x + (b.w - pas * L) / 2,
        y0: b.y + (b.h - legendeH - pas * H) / 2,
        yLegende: b.y + b.h - pt * 0.3528 * 0.35
    };
}

/** Le vecteur unitaire de `a` vers `b` — nul si les deux points se confondent. */
export function unite(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const n = Math.hypot(dx, dy) || 1;
    return { x: dx / n, y: dy / n };
}

/**
 * La largeur d'un texte, en millimètres — POUR DE VRAI.
 *
 * C'était un facteur : `longueur × taille × 0,52`, « qui approche Helvetica à
 * mieux qu'un millimètre ». Sur une étiquette de vingt-cinq caractères l'écart
 * monte à huit, et cela ne se voyait pas tant qu'on ne s'en servait que pour
 * savoir OÙ COMMENCENT les pointillés — à un millimètre près, personne ne
 * regarde. Il a fallu poser un accent circonflexe AU-DESSUS D'UNE LETTRE
 * précise pour que l'erreur devienne visible : le chapeau atterrissait après
 * les deux-points.
 *
 * Le PDF sait mesurer (`getTextWidth`) ; l'aperçu aussi, par le canevas — c'est
 * `mesureur`, la même mesure Helvetica que le reste de la fiche. On mesure donc
 * des deux côtés, et les deux rendus tombent au même endroit parce qu'ils
 * mesurent la même chose au lieu de l'estimer pareil.
 */
export let mesureCanvas = null;

export const largeurTrigo = (texte, taille) => {
    if (!mesureCanvas) mesureCanvas = mesureur();
    return mesureCanvas(String(texte || ''), taille);
};

/** Couper un texte en lignes d'au plus `large` caractères, `max` lignes au plus. */
export function couperEnLignes(texte, large, max) {
    const mots = String(texte).split(/\s+/);
    const out = [''];
    for (const mot of mots) {
        const essai = out[out.length - 1] ? `${out[out.length - 1]} ${mot}` : mot;
        if (essai.length <= large || !out[out.length - 1]) out[out.length - 1] = essai;
        else if (out.length < max) out.push(mot);
        else { out[out.length - 1] += '…'; break; }
    }
    return out;
}

export const echapper = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
