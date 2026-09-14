// LES FIGURES — ce qui se trace, se code et se nomme.
//
// Une tranche de `printSheet.js`, découpée par `tools/decouperPrintSheet.mjs`.
// Tout ce qui est ici n'est utilisé QUE par les exercices de cette famille ;
// ce qui sert à plusieurs vit dans `socle.js`.

import {
    ENCRE, blocsVoisins, boiteDe, couperEnLignes, dessinerFigureAnglePdf,
    dessinerMarque, echapper, echapperSheet, figureAnglePreviewHtml,
    geoAnglesManquants, ligneAnglePreviewHtml, ligneReponseFigurePdf,
    ligneReponsePdf, rangDuBloc, rvbCss, rvbHex, teinteFigure, unite
} from './socle.js';
import { CASES as CASES_HEXA } from '../../core/hexagrille.js';
import { ETAPES as ETAPES_RAISONNEMENT } from '../../core/raisonnement.js';
import { ETAPES_EXACTES as DISQUE_EXACTES, ecrireNombre as ecrireNombreDisque } from '../../core/disque.js';
import { MONDE as MONDE_PC, couperAuMonde } from '../../core/programmeConstruction.js';
import { R as R_HEXA, SOMMETS as SOMMETS_HEXA, cadreHexagrille, centre as centreHexa, repereFleche as repereFlecheHexa } from '../../core/hexagrilleFigure.js';
import { TAILLE_CROIX, branchesCroix, tracesDe } from '../../core/cercleFigure.js';
import { aretesCachees as aretesCacheesNoyau, dessiner as dessinerNoyau, facesVisibles as facesVisiblesNoyau } from '../../core/solides.js';
import { boite as boiteTangram } from '../../core/tangram.js';
import { etendueTriangle, sommetsBruts } from '../../core/perimetreTriangle.js';
import { marqueSvg as marqueSvgRelier } from '../../core/relier.js';
import { mesureArc as mesureArcAngle } from '../../core/anglesRemarquables.js';
import { polycopieEnCouleur, pourPdf, texteRiche } from '../ficheRendu.js';
import { silhouette } from '../../core/blocScratch.js';

/** L'étiquette d'un arc : sa mesure, un « ? », ou le numéro d'un pas. */
function texteArcAngle(arc, solution) {
    if (arc.role === 'donne') return `${mesureArcAngle(arc)}°`;
    if (solution) return `${mesureArcAngle(arc)}°`;
    // LE RELAIS PORTE SON NUMÉRO, l'angle cherché garde son « ? ». Le numéro
    // dit par où passer ; c'est le point d'interrogation qui dit quoi rendre.
    return arc.role === 'relais' && arc.pas ? String(arc.pas) : '?';
}

function anglesManquantsPreviewHtml(item, slot, k, solution) {
    const g = geoAnglesManquants(item, slot);
    return figureAnglePreviewHtml(g, k, (arc) => texteArcAngle(arc, solution))
        + ligneAnglePreviewHtml(g, k, '? =', solution ? `${g.m.reponse}°` : '');
}

function dessinerAnglesManquantsPdf(doc, item, slot, solution) {
    const g = geoAnglesManquants(item, slot);
    dessinerFigureAnglePdf(doc, g, (arc) => texteArcAngle(arc, solution));
    ligneReponsePdf(doc, g, '? =', solution ? `${g.m.reponse}°` : '');
}

// --- LE NOM DES ANGLES : L'EXERCICE 8 DE LA FICHE -----------------------------
//
// Rémy : « Classe les angles. Le tableau est en dessous. » Douze figures, deux
// secteurs colorés dans chacune, et six cases où les ranger. Ici la figure
// porte ses deux angles NUMÉROTÉS — ① et ② —, et non ses mesures : il n'y a
// rien à calculer, tout est dans la POSITION. Les numéros valent mieux que les
// couleurs pour désigner les deux angles : ils se photocopient.

function anglesNommerPreviewHtml(item, slot, k, solution) {
    // Un nom prend plus de place qu'un nombre : la ligne du bas est plus haute.
    const g = geoAnglesManquants(item, slot, 0.24);
    return figureAnglePreviewHtml(g, k, (arc) => (arc.pas ? String(arc.pas) : ''))
        + ligneAnglePreviewHtml(g, k, 'Nom :', solution ? g.m.nom : '');
}

function dessinerAnglesNommerPdf(doc, item, slot, solution) {
    const g = geoAnglesManquants(item, slot, 0.24);
    dessinerFigureAnglePdf(doc, g, (arc) => (arc.pas ? String(arc.pas) : ''));
    ligneReponsePdf(doc, g, 'Nom :', solution ? g.m.nom : '');
}

// --- LE VOCABULAIRE DU CERCLE, SUR LE PAPIER ----------------------------------
//
// Rémy : « j'aimerai bien un exercice sur le vocabulaire du cercle ».
//
// LA FIGURE VIENT DU MÊME MODULE QUE L'ÉCRAN. `core/cercleFigure.js` rend une
// liste de tracés élémentaires — segments, arcs aplatis, points, mots — et les
// deux rendus la lisent telle quelle. C'est la garantie qu'une corde imprimée
// est à la même place que la corde affichée, et qu'aucun arc ne diverge d'un
// degré entre deux implémentations.
//
// LE ROUGE DEVIENT UN TRAIT GRAS EN NOIR ET BLANC. Un polycopié photocopié
// n'a pas de couleur, et « ce qui est tracé en rouge » n'aurait alors plus de
// référent : l'élément surligné est donc AUSSI deux fois plus épais que les
// autres. Il se repère sans la couleur.

function geoCercleVocabulaire(item, slot) {
    const b = boiteDe(slot);
    const marge = 2;
    // UNE LIGNE DE RÉPONSE, OU AUTANT QUE DE TRACÉS À NOMMER — voir
    // `questions` dans le générateur : sur le papier, la figure porte trois
    // tracés nommés et on les demande tous les trois.
    const quest = (item.meta.questions && item.meta.questions.length)
        ? item.meta.questions : null;
    const hLigne = Math.max(4.5, Math.min(b.h * 0.15, 6.5));
    const ligneH = quest ? hLigne * quest.length : hLigne;
    // LA QUESTION EST SUR LE BLOC, pas dans la consigne commune. Chaque figure
    // pose la sienne — « que représente le segment [OA] ? » —, et une consigne
    // commune ne pourrait pas les dire toutes. Elle prend donc sa ligne, en
    // haut, comme sur une fiche de manuel.
    const corpsQ = Math.max(2.4, Math.min(b.w / 26, 3.4));
    const lignesQ = couperEnLignes(item.meta.enoncePapier || item.meta.enonce || '',
        Math.floor(b.w / (corpsQ * 0.46)), 2);
    const hQuestion = lignesQ.length * corpsQ * 1.3 + 1;
    const cote = Math.min(b.w - marge * 2, b.h - ligneH - hQuestion - marge);
    const x0 = b.x + (b.w - cote) / 2;
    const y0 = b.y + hQuestion;
    // Les tracés sont donnés dans un carré de 100 : on les y ramène.
    const P = (p) => ({ x: x0 + (p.x / 100) * cote, y: y0 + (p.y / 100) * cote });
    const u = cote / 100;
    return {
        m: item.meta, b, cote, x0, y0, P, u, ligneH, corpsQ, lignesQ, hQuestion,
        quest, hLigne,
        taille: Math.max(2.4, Math.min(hLigne * 0.6, 3.6)),
        yReponse: b.y + b.h - marge,
        dispoH: b.h - ligneH
    };
}

/** Le trait d'un tracé, sur le papier : le gras porte l'information, pas la couleur. */
const epaisCercle = (t, u) => Math.max(0.25, (t.fort ? 1.15 : 0.4) * u * 1.6);

function cercleVocabulairePreviewHtml(item, slot, k, solution) {
    const g = geoCercleVocabulaire(item, slot);
    const T = (v) => (v * k).toFixed(2);
    // LE PREMIER TRACÉ RESTE SURLIGNÉ, MÊME QUAND ON LES DEMANDE TOUS.
    //
    // Le gras ne désigne pas « celui dont on parle » — il désigne CELUI QU'ON
    // NE PEUT PAS NOMMER PAR SES LETTRES. Le cercle et le disque n'ont pas de
    // points : la ligne à remplir les appelle « la ligne en gras », « la
    // partie coloriée », et retirer le gras rendrait la question sans objet.
    // Les autres tracés se désignent par leurs lettres et n'en ont pas besoin.
    const traces = tracesDe({ ...g.m.spec, couleurs: false });
    let d = '';
    const poly = (pts, ep) => `<path d="${pts.map((p, i) => {
        const q = g.P(p);
        return `${i ? 'L' : 'M'}${T(q.x)} ${T(q.y)}`;
    }).join(' ')}" fill="none" stroke="#1a202c" stroke-width="${T(ep)}"
        stroke-linecap="round" stroke-linejoin="round"/>`;

    // La question, au-dessus de la figure.
    g.lignesQ.forEach((ligne, i) => {
        d += `<text x="${T(g.b.x)}" y="${T(g.b.y + g.corpsQ * (1 + i * 1.3))}" fill="#1a202c"
            font-size="${T(g.corpsQ)}" font-family="Helvetica, Arial, sans-serif">${echapperSheet(ligne)}</text>`;
    });

    for (const t of traces) {
        if (t.k === 'cercle' && t.plein) {
            const c = g.P({ x: t.x, y: t.y });
            d += `<circle cx="${T(c.x)}" cy="${T(c.y)}" r="${T(t.r * g.u)}" fill="#e6ecf7"/>`;
        } else if (t.k === 'cercle') {
            const c = g.P({ x: t.x, y: t.y });
            d += `<circle cx="${T(c.x)}" cy="${T(c.y)}" r="${T(t.r * g.u)}" fill="none"
                stroke="#1a202c" stroke-width="${T(epaisCercle(t, g.u))}"/>`;
        } else if (t.k === 'ligne') {
            d += poly(t.pts, epaisCercle(t, g.u));
        } else if (t.k === 'croix') {
            for (const br of branchesCroix(t.x, t.y, TAILLE_CROIX)) d += poly(br, epaisCercle(t, g.u) * 0.8);
        } else if (t.k === 'texte') {
            const c = g.P({ x: t.x, y: t.y });
            d += `<text x="${T(c.x)}" y="${T(c.y)}" fill="#1a202c" font-weight="700"
                font-size="${T(t.taille * g.u)}" text-anchor="middle" dominant-baseline="central"
                font-family="Helvetica, Arial, sans-serif">${echapperSheet(t.t)}</text>`;
        }
    }
    let lignes = '';
    if (g.quest) {
        // « [OA] : ………… », une ligne par tracé nommé.
        g.quest.forEach((q, i) => {
            const y = g.b.y + g.b.h - g.ligneH + i * g.hLigne;
            lignes += `<div style="position:absolute; left:${T(g.b.x + 1)}px;
                top:${T(y)}px; height:${T(g.hLigne)}px; display:flex; align-items:center;
                font-size:${T(g.taille)}px; font-weight:700; color:#1a202c;
                white-space:nowrap">${echapperSheet(q.objet)}&nbsp;:</div>`;
            const xT = g.b.x + 1 + g.taille * (q.objet.length * 0.62 + 1.4);
            lignes += `<div style="position:absolute; left:${T(xT)}px;
                top:${T(y + g.hLigne * 0.7)}px; width:${T(g.b.x + g.b.w - 1 - xT)}px;
                height:0; border-top:${Math.max(1, 0.35 * k)}px dotted #a8b0bf"></div>`;
            if (solution) {
                lignes += `<div style="position:absolute; left:${T(xT + 1)}px;
                    top:${T(y)}px; height:${T(g.hLigne)}px; display:flex; align-items:center;
                    font-size:${T(g.taille)}px; font-weight:700;
                    color:#2f855a">${echapperSheet(q.reponse)}</div>`;
            }
        });
    }
    return `<svg style="position:absolute; left:0; top:0; width:100%; height:100%;
        overflow:visible; pointer-events:none">${d}</svg>`
        + (g.quest ? lignes : ligneAnglePreviewHtml(g, k, '', solution ? g.m.reponse : ''));
}

function dessinerCercleVocabulairePdf(doc, item, slot, solution) {
    const g = geoCercleVocabulaire(item, slot);
    const traces = tracesDe({ ...g.m.spec, couleurs: false });
    const poly = (pts, ep) => {
        doc.setLineWidth(ep);
        doc.setLineCap('round');
        doc.setLineJoin('round');
        for (let i = 1; i < pts.length; i++) {
            const a = g.P(pts[i - 1]), b = g.P(pts[i]);
            doc.line(a.x, a.y, b.x, b.y);
        }
        doc.setLineCap('butt');
        doc.setLineJoin('miter');
    };

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(g.corpsQ * 2.6);
    doc.setTextColor(...ENCRE.texte);
    g.lignesQ.forEach((ligne, i) => {
        doc.text(pourPdf(ligne), g.b.x, g.b.y + g.corpsQ * (1 + i * 1.3));
    });

    doc.setDrawColor(...ENCRE.trait);
    for (const t of traces) {
        if (t.k === 'cercle' && t.plein) {
            const c = g.P({ x: t.x, y: t.y });
            doc.setFillColor(230, 236, 247);
            doc.circle(c.x, c.y, t.r * g.u, 'F');
        } else if (t.k === 'cercle') {
            const c = g.P({ x: t.x, y: t.y });
            doc.setLineWidth(epaisCercle(t, g.u));
            doc.circle(c.x, c.y, t.r * g.u, 'S');
        } else if (t.k === 'ligne') {
            poly(t.pts, epaisCercle(t, g.u));
        } else if (t.k === 'croix') {
            for (const br of branchesCroix(t.x, t.y, TAILLE_CROIX)) poly(br, epaisCercle(t, g.u) * 0.8);
        } else if (t.k === 'texte') {
            const c = g.P({ x: t.x, y: t.y });
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(Math.max(5, t.taille * g.u * 2.7));
            doc.setTextColor(...ENCRE.texte);
            doc.text(t.t, c.x, c.y, { align: 'center', baseline: 'middle' });
            doc.setFont('helvetica', 'normal');
        }
    }
    if (!g.quest) {
        ligneReponsePdf(doc, g, '', solution ? g.m.reponse : '');
        return;
    }
    // « [OA] : ………… », une ligne par tracé nommé — les mêmes que l'aperçu.
    doc.setFontSize(g.taille / 0.3528);
    g.quest.forEach((q, i) => {
        const y = g.b.y + g.b.h - g.ligneH + (i + 0.7) * g.hLigne;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...ENCRE.texte);
        doc.text(pourPdf(`${q.objet} :`), g.b.x + 1, y);
        const xT = g.b.x + 1 + doc.getTextWidth(pourPdf(`${q.objet} : `));
        if (solution) {
            doc.setTextColor(47, 133, 90);
            doc.text(pourPdf(q.reponse), xT, y);
        } else {
            doc.setDrawColor(...ENCRE.grille);
            doc.setLineWidth(0.25);
            doc.setLineDashPattern([0.8, 0.8], 0);
            doc.line(xT, y, g.b.x + g.b.w - 1, y);
            doc.setLineDashPattern([], 0);
        }
    });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...ENCRE.texte);
}

// --- SEGMENT, DROITE OU DEMI-DROITE : LE SCHÉMA SUR LE PAPIER -----------------
//
// Rémy : « pour l'exercice 60, tu as oublié tous les schémas ». Il avait
// raison : la feuille écrite ne sait poser que du texte, et cet exercice-là
// pose une FIGURE — « comment note-t-on ceci ? » n'a aucun sens sans le trait
// qu'on montre. Sur le papier, l'élève lisait « Note la figure ci-dessus »
// au-dessus de rien.
//
// Il devient donc un bloc à part entière, comme les pendules et les repères,
// et chacun des trois sens y trouve ce qu'il lui faut :
//
//   ÉCRIRE — le trait est dessiné, on écrit son nom dessous.
//   DESSIN — les deux croix sont posées, l'écriture est donnée, on TRACE.
//            Sans trait : c'est justement lui qu'on demande.
//   DIRE   — l'écriture est donnée en grand, on la lit en toutes lettres.

/** Les proportions du dessin de `core/figures.js`, en fractions de largeur. */
const NOT_XA = 70 / 210, NOT_XB = 140 / 210, NOT_BORD = 8 / 210;

function geoNotation(item, slot) {
    const m = item.meta;
    const b = boiteDe(slot);
    const marge = 2;
    const enonceH = Math.min(6, b.h * 0.22);
    // « DIRE » N'A PAS DE FIGURE : c'est une lecture, pas un dessin. La bande
    // du milieu lui rend sa place, et les deux lignes d'écriture la prennent.
    const avecFigure = m.sens !== 'dire';
    const figH = avecFigure ? Math.min(b.h * 0.42, 20) : 0;
    const x0 = b.x + marge, largeur = b.w - marge * 2;
    const yFig = b.y + enonceH;
    return {
        m, b, marge, enonceH, figH, avecFigure, x0, largeur,
        yFig, yTrait: yFig + figH * 0.62,
        xa: x0 + largeur * NOT_XA, xb: x0 + largeur * NOT_XB,
        xDebut: x0 + largeur * NOT_BORD, xFin: x0 + largeur * (1 - NOT_BORD),
        // La croix, et la lettre au-dessus d'elle.
        r: Math.max(1.2, Math.min(figH * 0.14, 2.2)),
        // L'ÉNONCÉ TIENT DANS SA BANDE, ou il rétrécit.
        //
        // Rémy, sur le PDF : « Comment note-t-on cette fi » — la phrase
        // s'arrêtait au milieu d'un mot. La bande de l'énoncé fait une seule
        // ligne et ne se replie pas ; le corps, lui, ne regardait que la
        // HAUTEUR de la bande. À quatre blocs par ligne, trente-deux
        // caractères ne tiennent pas dans quarante millimètres, et le reste
        // était coupé — une question tronquée ne se répond pas.
        //
        // On borne donc aussi par la LARGEUR. Un caractère d'Helvetica fait
        // environ la moitié de son corps ; le plancher de 2,4 mm reste, et en
        // dessous c'est la fiche qui a trop de colonnes, pas la phrase qui est
        // trop longue.
        taille: Math.max(2.4, Math.min(enonceH * 0.62, 4,
            (largeur - 1) / (enonceNotation(m).length * 0.5))),
        // Les lignes où l'on écrit : une pour une notation, deux pour une
        // lecture en toutes lettres — « la demi-droite d'origine A passant
        // par B » ne tient pas sur une seule.
        lignes: m.sens === 'dessin' ? 0 : (m.sens === 'dire' ? 2 : 1),
        yReponse: b.y + b.h - marge
    };
}

/**
 * Les deux bouts du trait, ou `null` quand c'est à l'élève de le tracer.
 *
 * DANS LE SENS « DESSIN », le corrigé le montre — et il faut alors tenir
 * compte de l'ORDRE DES CROIX. Le générateur pose les deux lettres au hasard,
 * de sorte que [AB) se trace parfois avec A à droite : l'origine est le
 * premier point NOMMÉ, pas celui de gauche, et c'est tout le piège du
 * chapitre. Une correction qui l'ignorerait enseignerait l'erreur.
 */
function traitNotation(g, solution) {
    const m = g.m, t = m.objet;
    if (m.sens === 'dessin' && !solution) return null;
    if (t === 'droite') return { x1: g.xDebut, x2: g.xFin };
    if (t === 'segment') return { x1: g.xa, x2: g.xb };
    // La demi-droite part de son origine et file au-delà de l'autre point.
    const origineAGauche = m.sens !== 'dessin' || (m.gauche || m.a) === m.a;
    return origineAGauche ? { x1: g.xa, x2: g.xFin } : { x1: g.xb, x2: g.xDebut };
}

/**
 * L'énoncé du bloc, dans les trois sens.
 *
 * « COMMENT SE LIT [RA) ? » NE DIT PAS CE QU'ON ATTEND — Rémy : « je ne
 * comprends pas la question ». Il a raison, et pour deux raisons à la fois.
 *
 * D'abord la réponse a l'air d'être la question : on répond « la demi-droite
 * [RA) », et l'on a l'impression de recopier ce qu'on vient de lire. Ensuite,
 * sur la feuille, le bloc n'a PAS de figure — les deux autres sens en ont
 * une —, et l'élève cherche ce qu'il devrait regarder.
 *
 * On demande donc ce qu'on veut vraiment : « nomme [RA) en toutes lettres ».
 * C'est la même demande que sur la fiche de questions, en plus court — l'énoncé
 * d'un bloc tient sur UNE ligne et ne se coupe pas : « écris en toutes lettres
 * ce que désigne [RA) », la phrase de l'autre feuille, sortait du cadre.
 */
function enonceNotation(m) {
    const e = ECRITURES_NOTATION[m.objet](m.a, m.b);
    if (m.sens === 'ecrire') return 'Comment note-t-on cette figure ?';
    if (m.sens === 'dire') return `Nomme ${e} en toutes lettres.`;
    return `Trace ${ECRITURES_NOTATION[m.objet](m.a, m.b)}.`;
}

const ECRITURES_NOTATION = {
    segment: (a, b) => `[${a}${b}]`,
    droite: (a, b) => `(${a}${b})`,
    'demi-droite': (a, b) => `[${a}${b})`
};

function notationPreviewHtml(item, slot, k, solution) {
    const g = geoNotation(item, slot);
    const m = g.m;
    const T = (v) => (v * k).toFixed(2);
    let html = `<div class="fx-not-enonce" style="left:${T(g.x0)}px; top:${T(g.b.y)}px;
        width:${T(g.largeur)}px; height:${T(g.enonceH)}px;
        font-size:${T(g.taille)}px">${echapperSheet(enonceNotation(m))}</div>`;

    if (g.avecFigure) {
        // Pour le sens « dessin », les deux croix sont posées dans l'ordre
        // TIRÉ AU SORT par le générateur : c'est tout le piège de la
        // demi-droite, dont l'origine est le premier point NOMMÉ et non celui
        // de gauche.
        const gauche = m.sens === 'dessin' ? (m.gauche || m.a) : m.a;
        const droite = m.sens === 'dessin' ? (m.droite || m.b) : m.b;
        const trait = traitNotation(g);
        let d = '';
        if (trait) {
            d += `<line x1="${T(trait.x1)}" y1="${T(g.yTrait)}" x2="${T(trait.x2)}" y2="${T(g.yTrait)}"
                stroke="${m.sens === 'dessin' ? '#2f855a' : '#1a202c'}" stroke-width="${T(0.5)}"/>`;
        }
        [[g.xa, gauche], [g.xb, droite]].forEach(([x, nom]) => {
            d += `<g stroke="#1a202c" stroke-width="${T(0.5)}" stroke-linecap="round">
                <line x1="${T(x - g.r)}" y1="${T(g.yTrait - g.r)}" x2="${T(x + g.r)}" y2="${T(g.yTrait + g.r)}"/>
                <line x1="${T(x - g.r)}" y1="${T(g.yTrait + g.r)}" x2="${T(x + g.r)}" y2="${T(g.yTrait - g.r)}"/>
            </g>`;
            html += `<div class="fx-not-nom" style="left:${T(x - 6)}px;
                top:${T(g.yTrait - g.r - g.taille * 1.5)}px; width:${T(12)}px;
                font-size:${T(g.taille)}px">${echapperSheet(nom)}</div>`;
        });
        html += `<svg class="fx-not-svg" style="left:0; top:0; width:100%; height:100%">${d}</svg>`;
    }

    for (let i = 0; i < g.lignes; i++) {
        const y = g.yReponse - (g.lignes - 1 - i) * (g.taille * 2);
        const texte = solution
            ? (i === 0 ? reponseNotation(m) : '')
            : '';
        html += `<div class="fx-not-ligne" style="left:${T(g.x0)}px; top:${T(y - g.taille * 1.3)}px;
            width:${T(g.largeur)}px; height:${T(g.taille * 1.3)}px;
            font-size:${T(g.taille)}px">${echapperSheet(texte)}</div>`;
    }
    return html;
}

/** Ce qu'on attend dans la ligne de réponse. */
function reponseNotation(m) {
    const e = ECRITURES_NOTATION[m.objet](m.a, m.b);
    if (m.sens === 'ecrire') return e;
    if (m.sens === 'dire') return NOMS_NOTATION[m.objet](m.a, m.b);
    return '';
}

const NOMS_NOTATION = {
    segment: (a, b) => `le segment d'extrémités ${a} et ${b}`,
    droite: (a, b) => `la droite passant par ${a} et ${b}`,
    'demi-droite': (a, b) => `la demi-droite d'origine ${a} passant par ${b}`
};

function dessinerNotationPdf(doc, item, slot, solution) {
    const g = geoNotation(item, slot);
    const m = g.m;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(g.taille / 0.3528);
    doc.setTextColor(...ENCRE.texte);
    doc.text(pourPdf(enonceNotation(m)), g.x0, g.b.y + g.enonceH * 0.72);

    if (g.avecFigure) {
        const gauche = m.sens === 'dessin' ? (m.gauche || m.a) : m.a;
        const droite = m.sens === 'dessin' ? (m.droite || m.b) : m.b;
        doc.setDrawColor(...ENCRE.trait);
        doc.setLineWidth(0.5);
        const trait = traitNotation(g, solution);
        if (trait) {
            // Le tracé du corrigé se distingue de la figure donnée : c'est la
            // réponse, pas l'énoncé.
            if (m.sens === 'dessin') doc.setDrawColor(47, 133, 90);
            doc.line(trait.x1, g.yTrait, trait.x2, g.yTrait);
            doc.setDrawColor(...ENCRE.trait);
        }
        doc.setFont('helvetica', 'bold');
        [[g.xa, gauche], [g.xb, droite]].forEach(([x, nom]) => {
            doc.line(x - g.r, g.yTrait - g.r, x + g.r, g.yTrait + g.r);
            doc.line(x - g.r, g.yTrait + g.r, x + g.r, g.yTrait - g.r);
            doc.text(pourPdf(nom), x, g.yTrait - g.r - g.taille * 0.6, { align: 'center' });
        });
        doc.setFont('helvetica', 'normal');
    }

    for (let i = 0; i < g.lignes; i++) {
        const y = g.yReponse - (g.lignes - 1 - i) * (g.taille * 2);
        doc.setDrawColor(...ENCRE.grille);
        doc.setLineWidth(0.25);
        if (doc.setLineDashPattern) doc.setLineDashPattern([0.6, 0.9], 0);
        doc.line(g.x0, y, g.x0 + g.largeur, y);
        if (doc.setLineDashPattern) doc.setLineDashPattern([], 0);
        if (!solution || i > 0) continue;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(g.taille / 0.3528);
        doc.setTextColor(47, 133, 90);
        doc.text(pourPdf(reponseNotation(m)), g.x0 + 1, y - 1);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...ENCRE.texte);
    }
}

// --- Rendus par exercice ------------------------------------------------------
// Le gabarit (page, en-tête, aperçu, page 2 des solutions) est commun ; chaque
// exercice imprimable ne fournit que sa consigne et le dessin de SA grille.

// --- Rédiger un raisonnement ---------------------------------------------------
//
// Le seul « imprimable » qui ne soit pas une grille : une FIGURE, puis trois
// lignes à écrire. La géométrie est calculée une fois, en millimètres, et
// servie aux deux rendus — l'aperçu HTML et le PDF tombent donc au même
// endroit, comme partout ailleurs dans la fiche.

// LES MOTS ET LES COULEURS VIENNENT DU MOTEUR COMMUN. Rémy : « ça pourrait
// être un moteur commun et au niveau de la présentation, mettre des couleurs et
// garder une cohérence ». Les droites et Pythagore écrivaient chacun leurs
// amorces — « Je sais que : » avec deux-points ici, « Je sais que » sans rien
// là. Trois chapitres, trois présentations : le schéma ne s'imprime que s'il
// est identique partout. La PLACE, elle, reste au chapitre (voir RED_ECRITURE).
const RED_LIGNES = ETAPES_RAISONNEMENT.map(e => e.mot);

// Combien de lignes d'écriture pour chacune, et où elles commencent.
// Je sais que : 2 lignes · Or : 3 (elle porte la propriété du cours, écrite en
// entier) · Donc : 1. Rémy, deux fois dans la même passe : « une seule ligne
// suffit pour le Donc ». La conclusion tient en une phrase — « les droites
// (d1) et (d2) sont parallèles » — et les deux lignes qu'on lui réservait
// laissaient un blanc au bas de chaque bloc.
const RED_ECRITURE = [2, 3, 1];

const RED_TOTAL = RED_ECRITURE.reduce((a, b) => a + b, 0);

const RED_DEBUT = RED_ECRITURE.reduce((acc, n) => (acc.push(acc[acc.length - 1] + n), acc), [0]);

function geometrieRedaction(item, boite) {
    const f = item.meta.figure;
    // La figure prend le haut de la boîte, les trois lignes le bas — et
    // celles-ci en prennent la plus grosse part. La ligne « Or » porte la
    // propriété du cours EN ENTIER (« Si deux droites sont parallèles, toute
    // perpendiculaire à l'une… ») : sur une seule ligne de trois centimètres,
    // aucun élève ne peut l'écrire.
    // DEUX MISES EN PAGE. Rémy : « on pourrait proposer deux formes de
    // présentation pour le pdf, soit le schéma et dessous la rédaction, soit le
    // schéma et à droite la partie rédaction ».
    //
    // EMPILÉ : la figure en haut sur toute la largeur, les lignes dessous —
    // c'est la présentation d'un cahier, et les lignes y sont longues.
    // CÔTE À CÔTE : la figure à gauche, la rédaction à droite — la figure reste
    // sous les yeux pendant qu'on écrit, ce qui est justement ce qu'on demande
    // à l'élève de faire. En revanche les lignes sont deux fois plus courtes :
    // c'est le prix, et c'est au professeur de choisir.
    const cote = item.meta.miseEnPage === 'cote';
    // LA FIGURE ÉTAIT ÉCRASÉE. Rémy, sur ses PDF : « je trouve que tu ne
    // profites pas du tout de l'espace ». Le plafond de hauteur — 40 % du bloc,
    // ou 34 % de sa largeur — donnait une figure de deux centimètres au milieu
    // d'un bloc qui en fait huit, et la mise à l'échelle ci-dessous la réduisait
    // ENCORE de moitié pour loger les étiquettes. Résultat : un dessin large
    // comme un timbre, avec des « (d₁) » qu'on lit à la loupe.
    //
    // On monte le plafond à 52 % : les trois droites d'une justification tiennent
    // sur peu de lignes, c'est la FIGURE qu'il faut voir pour lire les codages.
    const zoneFig = cote
        ? { x: boite.x, y: boite.y, w: boite.w * 0.44, h: boite.h }
        : { x: boite.x, y: boite.y, w: boite.w, h: Math.min(boite.h * 0.52, boite.w * 0.46) };
    const zoneTexte = cote
        ? { x: boite.x + boite.w * 0.47, y: boite.y, w: boite.w * 0.53, h: boite.h }
        : { x: boite.x, y: boite.y + zoneFig.h + 5, w: boite.w, h: boite.h - zoneFig.h - 6 };

    const figH = zoneFig.h;
    const cx = zoneFig.x + zoneFig.w / 2;
    const cy = zoneFig.y + figH / 2;
    const a = f.inclinaison * Math.PI / 180;
    const dx = Math.cos(a), dy = Math.sin(a);
    const nx = -dy, ny = dx;
    // LA FIGURE TIENT DANS SA BOÎTE, quelle que soit son inclinaison. Calculée
    // à taille fixe, elle débordait sur le bloc voisin dès qu'elle penchait :
    // « (d₁) » de la première figure se posait sur la deuxième. On calcule donc
    // l'encombrement réel — demi-longueur projetée sur chaque axe, plus la
    // place d'une étiquette — et on met le tout à l'échelle.
    // La marge d'étiquette était fixe à 7 mm — sur une petite boîte elle mangeait
    // à elle seule le tiers de la place. Elle suit maintenant la taille du bloc,
    // avec un plancher : une étiquette doit rester lisible, pas proportionnelle
    // à l'infini.
    const MARGE_NOM = Math.max(4.5, Math.min(7, zoneFig.w * 0.06));
    let L = zoneFig.w * 0.42, e = figH * 0.30;
    const demiW = L * Math.abs(dx) + e * Math.abs(nx) + MARGE_NOM;
    const demiH = L * Math.abs(dy) + e * Math.abs(ny) + MARGE_NOM;
    const facteur = Math.min(
        (zoneFig.w / 2 - 1) / demiW,
        (figH / 2 - 1) / demiH,
        1
    );
    L *= facteur; e *= facteur;

    const droite = (ox, oy) => ({
        x1: cx + ox - dx * L, y1: cy + oy - dy * L,
        x2: cx + ox + dx * L, y2: cy + oy + dy * L
    });
    const p1 = droite(nx * -e, ny * -e);
    const p2 = droite(nx * e, ny * e);
    const t = (f.ou - 50) / 100 * 1.2 * L;
    const px = cx + dx * t, py = cy + dy * t;
    const debord = e * 0.85;
    const perp = {
        x1: px - nx * (e + debord), y1: py - ny * (e + debord),
        x2: px + nx * (e + debord), y2: py + ny * (e + debord)
    };
    // LES ANGLES DROITS DONNÉS. Pour la propriété directe, un seul : celui
    // que la figure offre. Pour la réciproque, les DEUX — ce sont eux les
    // données, et c'est le parallélisme qui se conclut.
    const c = Math.min(3.2, e * 0.35);
    const equerre = (cx0, cy0, sens) => [
        { x: cx0 + dx * c, y: cy0 + dy * c },
        { x: cx0 + dx * c + nx * c * sens, y: cy0 + dy * c + ny * c * sens },
        { x: cx0 + nx * c * sens, y: cy0 + ny * c * sens }
    ];
    const jx = px - nx * e, jy = py - ny * e;
    const angle = equerre(jx, jy, 1);
    const reciproque = (item.meta.propriete || f.propriete) === 'perp-perp';
    const angle2 = reciproque ? equerre(px + nx * e, py + ny * e, -1) : null;
    // Les noms au bout le plus loin du croisement, comme à l'écran.
    const loin = f.ou > 50 ? -1 : 1;
    // Chaque nom est RAMENÉ dans la boîte : à moitié coupé, il ne nomme rien,
    // et posé sur le bloc voisin il nomme la mauvaise figure.
    const dedans = (x, y) => ({
        x: Math.min(zoneFig.x + zoneFig.w - 4.5, Math.max(zoneFig.x + 4.5, x)),
        y: Math.min(zoneFig.y + figH - 0.5, Math.max(zoneFig.y + 3.2, y))
    });
    const bout = (d, sens) => {
        const bx = loin > 0 ? d.x2 - 3 * dx : d.x1 + 3 * dx;
        const by = loin > 0 ? d.y2 - 3 * dy : d.y1 + 3 * dy;
        return dedans(bx + nx * 3.6 * sens, by + ny * 3.6 * sens + 1.1);
    };
    // DEUX NOMS NE S'ÉCRIVENT PAS L'UN SUR L'AUTRE.
    //
    // Rémy, sur le PDF : à la question 532, « (d3) » et « (d1) » étaient
    // imprimés au même endroit, illisibles tous les deux. Chaque nom était
    // placé pour SA droite, puis ramené dans la boîte par `dedans` — et quand
    // deux droites finissent du même côté, les deux ramenés tombent sur le
    // même coin. On ne le voyait pas venir parce que chacun, pris seul, était
    // bien placé.
    //
    // On les écarte donc APRÈS, en descendant celui qui arrive sur un voisin —
    // et en remontant s'il n'y a plus de place en bas. Un nom déplacé de quatre
    // millimètres désigne encore sa droite ; deux noms superposés n'en
    // désignent aucune.
    const ECART_Y = 4, ECART_X = 11;
    const ecarter = (liste) => {
        const poses = [];
        for (const n of liste) {
            let { x, y } = n;
            for (let essai = 0; essai < 8; essai++) {
                const gene = poses.find(q => Math.abs(q.x - x) < ECART_X && Math.abs(q.y - y) < ECART_Y);
                if (!gene) break;
                y = gene.y + ECART_Y;
                if (y > zoneFig.y + figH - 0.5) y = gene.y - ECART_Y;
            }
            const place = dedans(x, y);
            poses.push({ ...n, ...place });
        }
        return poses;
    };
    return {
        p1, p2, perp, angle, angle2, reciproque,
        noms: ecarter([
            { ...bout(p1, -1), texte: `(${f.noms.p1})` },
            { ...bout(p2, 1), texte: `(${f.noms.p2})` },
            // ET LE NOM DE LA PERPENDICULAIRE S'ÉCARTE DE SON PROPRE TRAIT.
            // Posé à un millimètre et demi de son bout, il était barré par la
            // droite qu'il nomme. On le pousse le long de la NORMALE — donc de
            // côté, jamais dans le prolongement —, de quoi passer à côté du
            // trait sans quitter la figure.
            { ...dedans(perp.x2 + nx * 4.5, perp.y2 + ny * 4.5 + 2.6), texte: `(${f.noms.perp})` }
        ]),
        // LES LIGNES À REMPLIR, COMPTÉES UNE PAR UNE.
        //
        // On répartissait en « parts » — Je sais que 1, Or 2, Donc 1 — et on
        // ajoutait ensuite des traits intermédiaires à la louche : les écarts
        // ne tombaient pas juste, et il restait un blanc entre la propriété et
        // la conclusion. Ici on dit combien de lignes d'écriture chaque partie
        // reçoit, on divise la hauteur par leur nombre TOTAL, et tout est
        // régulier par construction. « Or » en reçoit trois : c'est elle qui
        // porte la propriété du cours, écrite en entier.
        lignesEcriture: RED_ECRITURE,
        zoneFig, zoneTexte, cote,
        pas: zoneTexte.h / RED_TOTAL,
        ligneY: (i) => zoneTexte.y + RED_DEBUT[i] * (zoneTexte.h / RED_TOTAL),
        railsY: (i) => {
            const pas = zoneTexte.h / RED_TOTAL;
            return Array.from({ length: RED_ECRITURE[i] - 1 },
                (_, j) => zoneTexte.y + (RED_DEBUT[i] + j + 1) * pas);
        },
        ligneH: zoneTexte.h / RED_TOTAL
    };
}

function redactionPreviewHtml(item, slot, k, solution, champs) {
    const b = slot.boite;
    const g = geometrieRedaction(item, b);
    const trait = (d, cls) => `<line x1="${d.x1}" y1="${d.y1}" x2="${d.x2}" y2="${d.y2}" class="${cls}" />`;
    const lignes = item.meta.lignes;
    const texteLignes = RED_LIGNES.map((et, i) => {
        const y = g.ligneY(i);
        const rempli = solution ? lignes[i].texte : '';
        // « Or » occupe deux interlignes : c'est elle qui porte la propriété.
        const haut = g.ligneH * RED_ECRITURE[i];
        // Les lignes d'écriture supplémentaires, comme sur le PDF : l'aperçu
        // doit montrer la place réelle, sinon le professeur découvre à
        // l'impression que la propriété ne tient pas.
        const rails = solution ? '' : g.railsY(i).map(yr =>
            `<div class="fx-red-rail${champs ? ' fx-red-rail--champ' : ''}"
                style="left:${(g.zoneTexte.x + 4) * k}px;
                top:${(yr + 0.8) * k}px; width:${(g.zoneTexte.w - 4) * k}px"></div>`).join('');
        // `y` est la LIGNE DE BASE du texte dans le PDF ; en HTML, `top` est le
        // haut de la boîte. Sans ce décalage, l'aperçu descendait chaque
        // étiquette d'une hauteur de police et les écarts semblaient irréguliers.
        // L'AMORCE EST COLORÉE, LE RESTE NON. C'est le schéma qu'on veut voir
        // de loin — « Je sais que », « Or », « Donc » — pas la phrase que
        // l'élève écrira dessus. Sur une photocopie noir et blanc, c'est le
        // gras qui la détache ; la couleur n'est qu'un confort en plus.
        const teinte = ETAPES_RAISONNEMENT[i].rgb.join(', ');
        return `<div class="fx-red-ligne" style="left:${g.zoneTexte.x * k}px; top:${(y - 2.5) * k}px;
            width:${g.zoneTexte.w * k}px; height:${haut * k}px; font-size:${3.2 * k}px">
            <b style="color:rgb(${teinte})">${et} :</b> <span class="${solution ? 'fx-red-sol' : 'fx-red-vide'}">${rempli || ''}</span></div>${rails}`;
    }).join('');
    return `<div class="fx-red" style="left:0; top:0">
        <svg class="fx-red-svg" style="left:${b.x * k}px; top:${b.y * k}px;
             width:${b.w * k}px; height:${b.h * k}px"
             viewBox="${b.x} ${b.y} ${b.w} ${b.h}">
            ${trait(g.p1, g.reciproque ? 'fx-red-plein' : 'fx-red-para')}${trait(g.p2, g.reciproque ? 'fx-red-plein' : 'fx-red-para')}${trait(g.perp, 'fx-red-perp')}
            <path d="M ${g.angle.map(p => `${p.x} ${p.y}`).join(' L ')}" class="fx-red-angle" />
            ${g.angle2 ? `<path d="M ${g.angle2.map(p => `${p.x} ${p.y}`).join(' L ')}" class="fx-red-angle" />` : ''}
            ${g.noms.map(n => `<text x="${n.x}" y="${n.y}" class="fx-red-nom" text-anchor="middle">${n.texte}</text>`).join('')}
        </svg>${texteLignes}</div>`;
}

function dessinerRedactionPdf(doc, item, slot, solution, champ) {
    const b = slot.boite;
    const g = geometrieRedaction(item, b);

    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.5);
    // Le pointillé EST la marque du parallélisme : dans la réciproque, où le
    // parallélisme est ce qu'on doit conclure, les deux droites se tracent au
    // trait plein — sinon la figure donne la réponse.
    if (!g.reciproque) doc.setLineDashPattern([1.6, 1.1], 0);
    doc.line(g.p1.x1, g.p1.y1, g.p1.x2, g.p1.y2);
    doc.line(g.p2.x1, g.p2.y1, g.p2.x2, g.p2.y2);
    doc.setLineDashPattern([], 0);

    doc.setDrawColor(180, 83, 9);
    doc.line(g.perp.x1, g.perp.y1, g.perp.x2, g.perp.y2);
    doc.setLineWidth(0.4);
    for (const a of [g.angle, g.angle2]) {
        if (!a) continue;
        doc.line(a[0].x, a[0].y, a[1].x, a[1].y);
        doc.line(a[1].x, a[1].y, a[2].x, a[2].y);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    g.noms.forEach((n, i) => {
        doc.setTextColor(...(i === 2 ? [180, 83, 9] : [37, 99, 235]));
        doc.text(pourPdf(n.texte), n.x, n.y, { align: 'center' });
    });

    // Les trois lignes. Sans réponse, un filet pointillé à remplir ; avec, la
    // phrase rédigée — c'est la feuille de correction.
    const lignes = item.meta.lignes;
    RED_LIGNES.forEach((et, i) => {
        const y = g.ligneY(i);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        // La couleur du temps, la même qu'à l'aperçu et la même que dans
        // Pythagore : c'est ce qui fait qu'on reconnaît le schéma d'un chapitre
        // à l'autre au lieu de le redécouvrir.
        doc.setTextColor(...ETAPES_RAISONNEMENT[i].rgb);
        // Tout s'écrit dans la ZONE DE TEXTE : elle occupe toute la largeur en
        // présentation empilée, la moitié droite en présentation côte à côte.
        const zx = g.zoneTexte.x, zw = g.zoneTexte.w;
        const chapeau = `${et} : `;
        doc.text(chapeau, zx, y);
        const x0 = zx + doc.getTextWidth(chapeau);
        doc.setFont('helvetica', 'normal');
        if (solution) {
            doc.setFontSize(8.2);
            doc.setTextColor(60, 70, 88);
            const mots = doc.splitTextToSize(pourPdf(lignes[i].texte), zx + zw - x0);
            mots.slice(0, 2).forEach((ligne, j) => doc.text(ligne, x0, y + j * 3.6));
        } else {
            doc.setDrawColor(168, 176, 191);
            doc.setLineWidth(0.25);
            doc.setLineDashPattern([0.7, 1.1], 0);
            doc.line(x0, y + 0.8, zx + zw, y + 0.8);
            g.railsY(i).forEach(yr => doc.line(zx + 4, yr + 0.8, zx + zw, yr + 0.8));
            // Rédiger au clavier : un champ par ligne d'écriture, posé sur son
            // trait. Sans eux, la fiche remplissable s'arrête avant la seule
            // chose qu'on demande vraiment d'écrire ici.
            if (champ) {
                const h = g.ligneH * 0.8;
                champ(x0, y + 0.8 - h, zx + zw - x0, h);
                g.railsY(i).forEach(yr => champ(zx + 4, yr + 0.8 - h, zw - 8, h));
            }
            doc.setLineDashPattern([], 0);
        }
    });
}

// --- Relier les points ------------------------------------------------------

/**
 * La géométrie d'une grille de liens dans son emplacement. Un emplacement est
 * CARRÉ et se décrit par `taille` — comme pour toutes les autres grilles ; le
 * lire autrement rendait des positions NaN, donc des cases invisibles.
 */
function geoRelier(item, slot) {
    const m = item.meta;
    const marge = slot.taille * 0.04;
    const pas = (slot.taille - 2 * marge) / Math.max(m.l, m.h);
    const x0 = slot.x + (slot.taille - pas * m.l) / 2;
    const y0 = slot.y + (slot.taille - pas * m.h) / 2;
    return { m, pas, x0, y0, cx: (x) => x0 + (x + 0.5) * pas, cy: (y) => y0 + (y + 0.5) * pas };
}

/**
 * LA GRILLE SUR LE PAPIER. Les bornes portent TOUJOURS leur symbole : c'est
 * lui qui dit quelle borne va avec quelle autre une fois la feuille
 * photocopiée. La couleur, quand elle est demandée, ne fait que doubler cette
 * information — jamais la porter seule.
 */
function relierPreviewHtml(item, slot, k, solution) {
    const g = geoRelier(item, slot);
    const couleur = polycopieEnCouleur();
    const ep = g.pas * 0.09;
    let html = '';

    // Le quadrillage.
    for (let y = 0; y < g.m.h; y++) {
        for (let x = 0; x < g.m.l; x++) {
            html += `<div class="fx-rl-case" style="left:${(g.x0 + x * g.pas) * k}px;
                top:${(g.y0 + y * g.pas) * k}px; width:${g.pas * k}px; height:${g.pas * k}px"></div>`;
        }
    }

    // La solution : le chemin, et le symbole de la paire DANS CHAQUE CASE.
    // En noir et blanc, deux tuyaux gris voisins seraient indiscernables ;
    // le symbole répété lève l'ambiguïté sans dépendre d'une couleur.
    if (solution) {
        g.m.paires.forEach(p => {
            p.solution.forEach((c, i) => {
                if (i) {
                    const b = p.solution[i - 1];
                    const x1 = Math.min(g.cx(c[0]), g.cx(b[0])), y1 = Math.min(g.cy(c[1]), g.cy(b[1]));
                    const l = Math.abs(g.cx(c[0]) - g.cx(b[0])) || ep;
                    const h = Math.abs(g.cy(c[1]) - g.cy(b[1])) || ep;
                    html += `<div class="fx-rl-trait" style="left:${(x1 - ep / 2) * k}px;
                        top:${(y1 - ep / 2) * k}px; width:${(l + ep) * k}px; height:${(h + ep) * k}px;
                        background:${couleur ? p.couleur : '#94a3b8'}"></div>`;
                }
                html += `<svg class="fx-rl-marque" style="left:${(g.cx(c[0]) - g.pas / 2) * k}px;
                    top:${(g.cy(c[1]) - g.pas / 2) * k}px" width="${g.pas * k}" height="${g.pas * k}"
                    viewBox="0 0 10 10">${marqueSvgRelier(p.id, 5, 5, 1.7,
        { fond: couleur ? p.couleur : '#334155' })}</svg>`;
            });
        });
    }

    // Les bornes : un disque marqué, aux deux bouts de chaque paire.
    g.m.paires.forEach(p => {
        [p.a, p.b].forEach(([x, y]) => {
            const d = g.pas * 0.62;
            // LA MARQUE EST TRACÉE, pas écrite : un glyphe « ▲ » n'est jamais
            // centré dans son cadratin, et sur une borne de cinq millimètres
            // le décalage se voit. La forme, elle, se centre exactement.
            html += `<svg class="fx-rl-borne" style="left:${(g.cx(x) - d / 2) * k}px;
                top:${(g.cy(y) - d / 2) * k}px" width="${d * k}" height="${d * k}"
                viewBox="0 0 10 10">
                <circle cx="5" cy="5" r="4.4" fill="${couleur ? p.couleur : '#ffffff'}"
                    stroke="#0f172a" stroke-width="0.7"/>
                ${marqueSvgRelier(p.id, 5, 5, 2.5, { fond: couleur ? '#ffffff' : '#0f172a' })}
            </svg>`;
        });
    });
    return html;
}

function dessinerRelierPdf(doc, item, slot, solution) {
    const g = geoRelier(item, slot);
    const couleur = polycopieEnCouleur();
    const teinte = (hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16),
        parseInt(hex.slice(5, 7), 16)];

    doc.setLineWidth(0.2);
    doc.setDrawColor(...ENCRE.grille);
    for (let y = 0; y <= g.m.h; y++) {
        doc.line(g.x0, g.y0 + y * g.pas, g.x0 + g.m.l * g.pas, g.y0 + y * g.pas);
    }
    for (let x = 0; x <= g.m.l; x++) {
        doc.line(g.x0 + x * g.pas, g.y0, g.x0 + x * g.pas, g.y0 + g.m.h * g.pas);
    }

    if (solution) {
        g.m.paires.forEach(p => {
            doc.setLineWidth(g.pas * 0.14);
            doc.setDrawColor(...(couleur ? teinte(p.couleur) : [150, 158, 170]));
            for (let i = 1; i < p.solution.length; i++) {
                const a = p.solution[i - 1], b = p.solution[i];
                doc.line(g.cx(a[0]), g.cy(a[1]), g.cx(b[0]), g.cy(b[1]));
            }
        });
    }

    // Les symboles ne passent pas dans les polices standard du PDF : on dessine
    // donc les marques en GÉOMÉTRIE — un disque, un carré, un triangle. C'est
    // d'ailleurs plus net à l'impression qu'un caractère de police.
    g.m.paires.forEach(p => {
        const r = g.pas * 0.3;
        [p.a, p.b].forEach(([x, y]) => {
            const cx = g.cx(x), cy = g.cy(y);
            doc.setLineWidth(0.4);
            doc.setDrawColor(...ENCRE.trait);
            doc.setFillColor(...(couleur ? teinte(p.couleur) : [255, 255, 255]));
            doc.circle(cx, cy, r, 'FD');
            dessinerMarque(doc, p.id, cx, cy, r * 0.62, couleur ? [255, 255, 255] : ENCRE.trait);
        });
    });
}

// --- Compter sur un solide --------------------------------------------------

/** Le solide dessiné dans son emplacement, plus la place du tableau. */
/* LES FACES VUES SONT TEINTÉES. Un solide en fil de fer se compte mal : on ne
   sait plus quelle face on a déjà comptée. Trois tons doux, pris à tour de
   rôle, séparent les faces sans transformer la fiche en vitrail — et le noir et
   blanc reste disponible pour la photocopieuse. */
/**
 * LES TEINTES DES FACES VUES — une par face, et VRAIMENT différentes.
 *
 * Rémy : « n'hésite pas à mettre plusieurs couleurs pour les solides ». Il y en
 * avait trois, et c'était trois bleus pâles à un cheveu l'un de l'autre : sur
 * la feuille, un prisme hexagonal ressortait d'un seul bleu uniforme, et deux
 * faces voisines ne se distinguaient que par l'arête entre elles.
 *
 * Or ce qu'on demande ici, c'est de COMPTER LES FACES. Une couleur par face
 * n'est pas une décoration : c'est l'outil du comptage — on suit les teintes
 * au lieu de suivre des arêtes qui se croisent. Six teintes claires, assez
 * franches pour se distinguer, assez pâles pour qu'un pointillé passe dessus
 * sans disparaître.
 */
const TEINTES_SOLIDE = [
    [191, 219, 254],   // bleu
    [187, 247, 208],   // vert
    [254, 215, 170],   // ambre
    [233, 213, 255],   // violet
    [254, 205, 211],   // rose
    [153, 246, 228]    // sarcelle
];

const hexTeinte = (rvb) => '#' + rvb.map(v => v.toString(16).padStart(2, '0')).join('');

/** Le solide dessiné dans son emplacement, plus la place du tableau. */
function geoSolide(item, slot) {
    // LE TABLEAU EST UNE BANDE, pas un tiers de page. Il prenait la hauteur de
    // trois lignes d'écriture pour trois nombres à un chiffre : autant de moins
    // pour le dessin, qui est le seul endroit où l'on compte vraiment.
    const tabH = slot.taille * 0.17;
    const cote = slot.taille - tabH;
    const d = dessinerSolide(item.meta, cote, cote * 0.10);
    return { d, cote, tabH, x0: slot.x + (slot.taille - cote) / 2, y0: slot.y, tabY: slot.y + cote };
}

/** La projection, reprise du noyau : une seule perspective dans tout le logiciel. */
function dessinerSolide(meta, cote, marge) {
    const solide = { ...meta, sommets: meta.sommets, faces: meta.faces, aretes: meta.aretes };
    return {
        plan: dessinerNoyau(solide, cote, marge),
        cachees: aretesCacheesNoyau(solide),
        vues: facesVisiblesNoyau(solide)
    };
}

function solidesPreviewHtml(item, slot, k, solution) {
    const g = geoSolide(item, slot);
    const m = item.meta;
    const P = (i) => g.d.plan.points[i];
    const X = (i) => g.x0 + P(i)[0];
    const Y = (i) => g.y0 + P(i)[1];
    const couleur = polycopieEnCouleur();
    let html = '';

    // Les faces vues d'abord, teintées : elles passent SOUS les arêtes.
    // `vues` est un tableau de booléens PARALLÈLE aux faces, pas une liste
    // d'indices : c'est le contrat du noyau.
    if (couleur) {
        const polys = m.faces.map((face, iF) => {
            if (!g.d.vues[iF] || !Array.isArray(face) || face.length < 3) return '';
            const pts = face.map(i => `${(X(i) * k).toFixed(2)},${(Y(i) * k).toFixed(2)}`);
            return `<polygon points="${pts.join(' ')}"
                fill="${hexTeinte(TEINTES_SOLIDE[iF % TEINTES_SOLIDE.length])}" stroke="none"/>`;
        }).join('');
        if (polys) html += `<svg class="fx-sd-svg" style="left:0; top:0; width:100%; height:100%">${polys}</svg>`;
    }

    // Les arêtes cachées d'abord, sous les pleines : un pointillé qui passe
    // par-dessus un trait plein donne un dessin sale.
    const arete = (idx, cachee) => {
        const [a, b] = m.aretes[idx];
        const x1 = X(a), y1 = Y(a), x2 = X(b), y2 = Y(b);
        const l = Math.hypot(x2 - x1, y2 - y1);
        const ang = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
        return `<div class="fx-sd-arete${cachee ? ' fx-sd-arete--cachee' : ''}"
            style="left:${x1 * k}px; top:${y1 * k}px; width:${l * k}px;
                   transform:rotate(${ang}deg)"></div>`;
    };
    html += m.aretes.map((_, i) => (g.d.cachees[i] ? arete(i, true) : '')).join('');
    html += m.aretes.map((_, i) => (g.d.cachees[i] ? '' : arete(i, false))).join('');

    // Le tableau à remplir : trois colonnes, et la solution s'y écrit.
    const cols = [['Sommets', m.compte.S], ['Arêtes', m.compte.A], ['Faces', m.compte.F]];
    const largeur = g.cote / 3;
    html += cols.map(([titre, valeur], i) => `
        <div class="fx-sd-case${couleur ? ' fx-sd-case--couleur' : ''}"
            style="left:${(g.x0 + i * largeur) * k}px; top:${g.tabY * k}px;
            width:${largeur * k}px; height:${g.tabH * k}px; font-size:${g.tabH * 0.36 * k}px">
            <span class="fx-sd-tete">${titre}</span>
            <span class="fx-sd-rep">${solution ? valeur : ''}</span>
        </div>`).join('');
    return html;
}

function dessinerSolidesPdf(doc, item, slot, solution) {
    const g = geoSolide(item, slot);
    const m = item.meta;
    const X = (i) => g.x0 + g.d.plan.points[i][0];
    const Y = (i) => g.y0 + g.d.plan.points[i][1];
    const couleur = polycopieEnCouleur();

    // Les faces vues, teintées, SOUS les arêtes.
    if (couleur) {
        m.faces.forEach((face, iF) => {
            if (!g.d.vues[iF] || !Array.isArray(face) || face.length < 3) return;
            doc.setFillColor(...TEINTES_SOLIDE[iF % TEINTES_SOLIDE.length]);
            const suite = face.slice(1).map((s, j) => [X(s) - X(face[j]), Y(s) - Y(face[j])]);
            doc.lines(suite, X(face[0]), Y(face[0]), [1, 1], 'F', true);
        });
    }

    m.aretes.forEach(([a, b], i) => {
        doc.setDrawColor(...(g.d.cachees[i] ? ENCRE.grille : ENCRE.trait));
        doc.setLineWidth(g.d.cachees[i] ? 0.25 : 0.45);
        if (g.d.cachees[i] && doc.setLineDashPattern) doc.setLineDashPattern([0.9, 0.8], 0);
        doc.line(X(a), Y(a), X(b), Y(b));
        if (doc.setLineDashPattern) doc.setLineDashPattern([], 0);
    });

    const cols = [['Sommets', m.compte.S], ['Arêtes', m.compte.A], ['Faces', m.compte.F]];
    const largeur = g.cote / 3;
    doc.setLineWidth(0.3);
    doc.setDrawColor(...ENCRE.trait);
    // L'EN-TÊTE EST UNE BANDE TEINTÉE, la case à remplir reste blanche : on voit
    // d'un coup d'œil où l'on écrit.
    const teteH = g.tabH * 0.42;
    cols.forEach(([titre, valeur], i) => {
        const x = g.x0 + i * largeur;
        if (couleur) {
            doc.setFillColor(...TEINTES_SOLIDE[i % TEINTES_SOLIDE.length]);
            doc.rect(x, g.tabY, largeur, teteH, 'F');
        }
        doc.setDrawColor(...ENCRE.trait);
        doc.rect(x, g.tabY, largeur, g.tabH);
        doc.line(x, g.tabY + teteH, x + largeur, g.tabY + teteH);
        doc.setFontSize(Math.max(5, g.tabH * 0.9));
        doc.setTextColor(...ENCRE.gris);
        doc.text(pourPdf(titre), x + largeur / 2, g.tabY + teteH * 0.72, { align: 'center' });
        if (solution) {
            doc.setFontSize(Math.max(8, g.tabH * 1.5));
            doc.setTextColor(...ENCRE.trait);
            doc.text(String(valeur), x + largeur / 2, g.tabY + g.tabH * 0.92, { align: 'center' });
        }
    });
}

// --- LE TANGRAM : UN CARRÉ À DÉCOUPER, DES SILHOUETTES À REMPLIR ---------------
//
// Rémy : « PDF d'un tangram à découper (avec ou sans couleur) plus les
// silhouettes ». C'est ainsi que le tangram vit en classe : on découpe UNE
// fois, on garde les sept pièces dans une pochette, et l'on ressort les
// silhouettes à chaque séance. Le carré porte ses traits de découpe ; la
// silhouette n'est qu'un contour plein — surtout pas ses lignes intérieures,
// qui donneraient la solution.

/** Le polygone mis à l'échelle de son emplacement, centré. */
/**
 * @param {Object} [commun] - l'encombrement de la figure la plus étalée du jeu.
 *   Fourni, c'est LUI qui fixe le millimètre : toutes les figures de la feuille
 *   sortent alors à la même échelle, et les pièces découpées dans le carré
 *   recouvrent vraiment les silhouettes. Absent, chaque figure remplit son
 *   cadre — plus grand à regarder, impossible à recouvrir.
 */
function cadrerTangram(poly, b, marge, commun) {
    const bb = boiteTangram(poly);
    const w = bb.x1 - bb.x0, h = bb.y1 - bb.y0;
    const ref = commun && commun.w && commun.h ? commun : { w, h };
    const e = Math.min((b.w - 2 * marge) / ref.w, (b.h - 2 * marge) / ref.h);
    return {
        e,
        px: (x) => b.x + (b.w - w * e) / 2 + (x - bb.x0) * e,
        py: (y) => b.y + (b.h - h * e) / 2 + (y - bb.y0) * e
    };
}

function tangramPreviewHtml(item, slot, k, solution) {
    const m = item.meta;
    const b = slot.boite || { x: slot.x, y: slot.y, w: slot.taille, h: slot.taille };
    const couleur = polycopieEnCouleur();
    const decouper = m.quoi === 'decouper';
    // Le cadrage se fait sur la SILHOUETTE, jamais sur les pièces : elles
    // dépassent parfois d'un cheveu et la figure sauterait d'un bloc à l'autre.
    const ref = decouper ? m.pieces.flatMap(p => p.sommets) : m.silhouette;
    // UNE SILHOUETTE PORTE SON NOM DESSOUS : on lui réserve la bande, sinon le
    // carré remplit tout le bloc et son nom s'écrit par-dessus lui.
    const g = cadrerTangram(ref, decouper ? b : { ...b, h: b.h - 5 }, 2, m.commun);
    const T = (v) => (v * k).toFixed(2);
    const chemin = (pts) => pts.map(([x, y]) => `${T(g.px(x))},${T(g.py(y))}`).join(' ');
    let d = '';

    // La silhouette : un contour plein, gris clair, SANS ses lignes intérieures.
    if (!decouper) {
        d += `<polygon points="${chemin(m.silhouette)}" fill="#e6e9f0"
              stroke="#1a202c" stroke-width="${T(0.7)}" stroke-linejoin="round"/>`;
    }
    // Les pièces : toujours pour le carré à découper, et sur le corrigé d'une
    // silhouette — c'est la seule correction possible d'un pavage.
    if (decouper || solution) {
        m.pieces.forEach(p => {
            d += `<polygon points="${chemin(p.sommets)}"
                  fill="${couleur ? p.couleur : '#fff'}" fill-opacity="${couleur ? 0.85 : 1}"
                  stroke="#1a202c" stroke-width="${T(decouper ? 0.5 : 0.35)}"
                  stroke-linejoin="round"/>`;
        });
    }
    let html = `<svg class="fx-tg-svg" style="left:0; top:0; width:100%; height:100%">${d}</svg>`;
    if (!decouper) {
        html += `<div class="fx-tg-nom" style="left:${b.x * k}px; top:${(b.y + b.h - 4.4) * k}px;
            width:${b.w * k}px; font-size:${3.2 * k}px">${echapperSheet(m.nom)}</div>`;
    }
    return html;
}

/**
 * UN POLYGONE PLEIN DANS LE PDF, depuis une liste de points `[x, y]`.
 *
 * jsPDF ne sait tracer que des SUITES DE DÉPLACEMENTS : on lui donne un point
 * de départ et les écarts d'un sommet au suivant. Le tangram appelait un
 * `tracerPolygone` qui n'existait nulle part — son PDF échouait donc TOUJOURS,
 * pour tout le monde, depuis le début. Et en silence : l'aperçu dessine en
 * SVG, il ne montrait rien de ce défaut ; il fallait cliquer « Télécharger »
 * pour le rencontrer, et l'échec se rangeait dans le message général « le
 * générateur de PDF n'a pas pu être chargé », qui accusait la bibliothèque.
 */
function tracerPolygone(doc, points, style = 'FD') {
    if (!points || points.length < 3) return;
    const suite = points.slice(1).map(([x, y], j) => [x - points[j][0], y - points[j][1]]);
    doc.lines(suite, points[0][0], points[0][1], [1, 1], style, true);
}

function dessinerTangramPdf(doc, item, slot, solution) {
    const m = item.meta;
    const b = slot.boite || { x: slot.x, y: slot.y, w: slot.taille, h: slot.taille };
    const couleur = polycopieEnCouleur();
    const decouper = m.quoi === 'decouper';
    const ref = decouper ? m.pieces.flatMap(p => p.sommets) : m.silhouette;
    const g = cadrerTangram(ref, decouper ? b : { ...b, h: b.h - 5 }, 2, m.commun);
    const mm = (pts) => pts.map(([x, y]) => [g.px(x), g.py(y)]);

    if (!decouper) {
        doc.setFillColor(230, 233, 240);
        doc.setDrawColor(...ENCRE.trait);
        doc.setLineWidth(0.7);
        tracerPolygone(doc, mm(m.silhouette), 'FD');
    }
    if (decouper || solution) {
        doc.setLineWidth(decouper ? 0.5 : 0.35);
        doc.setDrawColor(...ENCRE.trait);
        m.pieces.forEach(p => {
            if (couleur) doc.setFillColor(...rvbHex(p.couleur));
            else doc.setFillColor(255, 255, 255);
            tracerPolygone(doc, mm(p.sommets), 'FD');
        });
    }
    if (!decouper) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...ENCRE.texte);
        doc.text(pourPdf(m.nom), b.x + b.w / 2, b.y + b.h - 1, { align: 'center' });
    }
}

// --- LES ANGLES ----------------------------------------------------------------
//
// Deux exercices, un seul dessin :
//
//   MESURER    — l'angle est tracé, l'élève pose SON rapporteur dessus et
//                écrit la mesure. C'est l'exercice qu'un écran ne remplace
//                pas : le rapporteur de plastique se pose de travers, et c'est
//                en le redressant qu'on comprend à quoi sert le repère central.
//   CONSTRUIRE — un seul côté est tracé, la mesure est donnée, l'élève trace
//                le second côté.
//
// LA PAGE DES SOLUTIONS PORTE LE RAPPORTEUR. Un angle corrigé par un simple
// nombre ne dit pas où l'élève s'est trompé — presque toujours, il a lu la
// mauvaise graduation (130 au lieu de 50). Le demi-cercle gradué, posé sur le
// sommet et aligné sur le côté d'origine, montre la lecture elle-même.

/**
 * LA BOÎTE QU'OCCUPE VRAIMENT L'ANGLE, en unités de rayon, relativement au
 * sommet. Deux segments et un point : leur enveloppe se calcule exactement.
 * Avec le rapporteur de la correction — un demi-disque posé sur le premier
 * côté —, on échantillonne le demi-plan, ce qui revient au même à un pour cent.
 */
function boiteAngle(a0, a1, avecRapporteur) {
    const xs = [0, Math.cos(a0), Math.cos(a1)];
    const ys = [0, Math.sin(a0), Math.sin(a1)];
    if (avecRapporteur) {
        // 1,12 et non 0,9 : au-delà du demi-disque, la correction pose encore
        // l'étiquette rouge de la graduation lue, et c'est elle qui sortait du
        // bloc pour aller écrire sur le titre du voisin.
        for (let d = 0; d <= 180; d += 6) {
            const a = a0 - d * Math.PI / 180;
            xs.push(Math.cos(a) * 1.12);
            ys.push(Math.sin(a) * 1.12);
        }
    }
    return {
        xmin: Math.min(...xs), xmax: Math.max(...xs),
        ymin: Math.min(...ys), ymax: Math.max(...ys)
    };
}

function geoAngle(item, slot, solution = false) {
    // LA BOÎTE ENTIÈRE, ET L'ANGLE POSÉ DEDANS.
    //
    // Rémy, sur une fiche en 3 x 3 : « tu vois la place que l'on perd, les
    // angles semblent se réfugier en bas à droite ». Deux causes, une seule
    // conséquence. D'abord le bloc : on dessinait dans le CARRÉ inscrit —
    // 49 mm dans un emplacement large de 89 —, donc quarante millimètres
    // perdus par angle, cent vingt par ligne. Ensuite le sommet : posé au
    // MILIEU du bloc alors que le côté d'origine part vers la droite et que
    // l'angle s'ouvre vers le haut, tout le dessin tenait dans le quart
    // supérieur droit et la moitié gauche restait blanche.
    //
    // On calcule donc la boîte que l'angle occupe VRAIMENT — elle dépend de
    // son ouverture et de son inclinaison —, puis on choisit le rayon qui la
    // fait tenir juste, et l'on centre. Un angle aigu monte peu et s'étale ;
    // un angle de 170° prend toute la largeur : chacun reçoit ce qu'il lui
    // faut, et rien ne dépasse. Le rayon passe de 21 à près de 40 mm — l'angle
    // se mesure au rapporteur de plastique, et vingt millimètres de côté, ce
    // sont trois millimètres d'écart pour un degré.
    const b = boiteDe(slot);
    const ligneH = Math.min(9, b.h * 0.22);
    const dispoH = b.h - ligneH;
    const m = item.meta;

    // Les angles des deux côtés — les mêmes qu'à l'écran : le côté d'origine
    // reste PRESQUE horizontal, parce que c'est ainsi qu'on pose un rapporteur.
    const penche = (((m.baseDeg % 50) + 50) % 50) - 25;
    const a0 = -penche * Math.PI / 180;
    const a1 = -(penche + m.target) * Math.PI / 180;

    const boite = boiteAngle(a0, a1, !!solution);
    const largeurUtile = Math.max(0.2, boite.xmax - boite.xmin);
    const hauteurUtile = Math.max(0.2, boite.ymax - boite.ymin);
    const marge = 1.5;
    const r = Math.max(6, Math.min(
        (b.w - marge * 2) / largeurUtile,
        (dispoH - marge * 2) / hauteurUtile
    ));

    // Le sommet, posé pour que la boîte de l'angle soit centrée dans le bloc.
    const sx = b.x + (b.w - r * largeurUtile) / 2 - r * boite.xmin;
    const sy = b.y + (dispoH - r * hauteurUtile) / 2 - r * boite.ymin;

    return {
        cote: dispoH, ligneH, r, a0, a1,
        sx, sy, x0: b.x, largeur: b.w, ligneY: b.y + dispoH
    };
}

/** Les deux côtés de l'angle, en coordonnées absolues. */
function cotesAngle(g, m) {
    // L'inclinaison du côté d'origine, ramenée dans ±25° sans perdre la
    // variété : deux angles voisins ne se dessinent pas pareil. `geoAngle` l'a
    // déjà calculée pour placer la figure — on la relit plutôt que de risquer
    // deux formules qui divergent.
    const penche = (((m.baseDeg % 50) + 50) % 50) - 25;
    const a0 = g.a0 !== undefined ? g.a0 : -penche * Math.PI / 180;
    const a1 = g.a1 !== undefined ? g.a1 : -(penche + m.target) * Math.PI / 180;
    return {
        a0, a1,
        b: { x: g.sx + Math.cos(a0) * g.r, y: g.sy + Math.sin(a0) * g.r },
        r: { x: g.sx + Math.cos(a1) * g.r, y: g.sy + Math.sin(a1) * g.r }
    };
}

function anglePreviewHtml(item, slot, k, solution) {
    const g = geoAngle(item, slot, solution);
    const m = item.meta;
    const c = cotesAngle(g, m);
    const T = (v) => (v * k).toFixed(2);
    const construire = m.mode === 'construire';
    let d = '';

    // LE RAPPORTEUR DE LA CORRECTION, sous les côtés : un trait plein par-dessus
    // un demi-cercle gradué reste lisible, l'inverse non.
    // UN RAPPORTEUR, PAS UN ARC GRADUÉ QUI FLOTTE. Il lui manquait sa RÈGLE —
    // le bord droit qui joint le 0 au 180 — et son REPÈRE CENTRAL, les deux
    // choses par lesquelles on le pose. Sans elles, le demi-cercle ne montrait
    // pas le geste qu'on demande à l'élève : centre sur le sommet, zéro sur le
    // côté tracé. Rémy : « dessiner le rapporteur bien placé dans la solution ».
    if (solution) {
        const rr = g.r * 0.9;
        const P = (ang, ray) => `${T(g.sx + Math.cos(ang) * ray)} ${T(g.sy + Math.sin(ang) * ray)}`;
        // Le corps du rapporteur : demi-disque translucide, bord droit compris.
        d += `<path d="M ${P(c.a0, rr)} A ${T(rr)} ${T(rr)} 0 0 0 ${P(c.a0 + Math.PI, rr)} Z"
              fill="rgba(167,139,250,.10)" stroke="#a78bfa" stroke-width="${T(0.45)}"/>`;
        for (let deg = 0; deg <= 180; deg += 10) {
            const a = c.a0 - deg * Math.PI / 180;
            const gros = deg % 30 === 0;
            const r1 = rr - g.r * (gros ? 0.13 : 0.07);
            d += `<line x1="${P(a, r1).split(' ')[0]}" y1="${P(a, r1).split(' ')[1]}"
                  x2="${P(a, rr).split(' ')[0]}" y2="${P(a, rr).split(' ')[1]}"
                  stroke="#a78bfa" stroke-width="${T(gros ? 0.4 : 0.25)}"/>`;
            if (!gros) continue;
            const rt = rr - g.r * 0.24;
            d += `<text x="${T(g.sx + Math.cos(a) * rt)}" y="${T(g.sy + Math.sin(a) * rt)}"
                  text-anchor="middle" dominant-baseline="central"
                  font-size="${T(g.r * 0.1)}" fill="#7c3aed">${deg}</text>`;
        }
        // LE REPÈRE CENTRAL : la petite croix qu'on fait coïncider avec le
        // sommet. C'est elle qu'on cherche quand on pose l'instrument.
        const cr = g.r * 0.09;
        d += `<line x1="${T(g.sx - cr)}" y1="${T(g.sy)}" x2="${T(g.sx + cr)}" y2="${T(g.sy)}"
              stroke="#7c3aed" stroke-width="${T(0.3)}"/>
              <line x1="${T(g.sx)}" y1="${T(g.sy - cr)}" x2="${T(g.sx)}" y2="${T(g.sy + cr)}"
              stroke="#7c3aed" stroke-width="${T(0.3)}"/>`;
        // LA GRADUATION LUE, en évidence : c'est la lecture elle-même qui se
        // corrige, pas le nombre écrit en dessous.
        const al = c.a0 - m.target * Math.PI / 180;
        d += `<line x1="${T(g.sx + Math.cos(al) * (rr - g.r * 0.2))}" y1="${T(g.sy + Math.sin(al) * (rr - g.r * 0.2))}"
              x2="${T(g.sx + Math.cos(al) * (rr + g.r * 0.06))}" y2="${T(g.sy + Math.sin(al) * (rr + g.r * 0.06))}"
              stroke="#dc2626" stroke-width="${T(0.55)}"/>
              <text x="${T(g.sx + Math.cos(al) * (rr + g.r * 0.2))}" y="${T(g.sy + Math.sin(al) * (rr + g.r * 0.2))}"
              text-anchor="middle" dominant-baseline="central"
              font-size="${T(g.r * 0.13)}" fill="#dc2626" font-weight="700">${m.target}°</text>`;
    }

    // L'ARC MARQUE UN ANGLE QUI EXISTE, JAMAIS UN ANGLE À TRACER.
    //
    // En mode « construire », il était dessiné en pointillé pour montrer où
    // l'angle devait aller : c'est donner la moitié de la réponse — la
    // direction —, et sur une feuille où l'élève doit poser son rapporteur
    // lui-même, cela ne laisse plus qu'à recopier. Rémy : « enlève sur le pdf
    // les arcs de cercle en pointillés ! ». Le PDF, lui, n'en dessinait aucun :
    // l'aperçu montrait donc autre chose que la feuille, des deux côtés à la
    // fois. Un seul arc, plein, quand il y a un angle à voir.
    const ra = g.r * 0.26;
    if (!construire || solution) {
        d += `<path d="M ${T(g.sx + Math.cos(c.a0) * ra)} ${T(g.sy + Math.sin(c.a0) * ra)}
              A ${T(ra)} ${T(ra)} 0 0 ${m.target > 180 ? 1 : 0}
              ${T(g.sx + Math.cos(c.a1) * ra)} ${T(g.sy + Math.sin(c.a1) * ra)}"
              fill="none" stroke="#1a202c" stroke-width="${T(0.3)}"/>`;
    }
    d += `<line x1="${T(g.sx)}" y1="${T(g.sy)}" x2="${T(c.b.x)}" y2="${T(c.b.y)}"
          stroke="#1a202c" stroke-width="${T(0.55)}" stroke-linecap="round"/>`;
    if (!construire || solution) {
        d += `<line x1="${T(g.sx)}" y1="${T(g.sy)}" x2="${T(c.r.x)}" y2="${T(c.r.y)}"
              stroke="${construire ? '#dc2626' : '#1a202c'}" stroke-width="${T(0.55)}" stroke-linecap="round"/>`;
    }
    d += `<circle cx="${T(g.sx)}" cy="${T(g.sy)}" r="${T(0.7)}" fill="#1a202c"/>`;

    const ligne = construire
        ? `Construis un angle de ${m.target}°`
        : (solution ? `${m.target}°` : 'L\'angle mesure  .......  °');
    return `<svg class="fx-ag-svg" style="left:0; top:0; width:100%; height:100%">${d}</svg>`
        + `<div class="fx-ag-ligne" style="left:${g.x0 * k}px; top:${g.ligneY * k}px;
             width:${g.largeur * k}px; height:${g.ligneH * k}px;
             font-size:${g.ligneH * 0.42 * k}px">${echapperSheet(ligne)}</div>`;
}

function dessinerAnglePdf(doc, item, slot, solution) {
    const g = geoAngle(item, slot, solution);
    const m = item.meta;
    const c = cotesAngle(g, m);
    const construire = m.mode === 'construire';

    if (solution) {
        const rr = g.r * 0.9;
        doc.setDrawColor(167, 139, 250);
        doc.setLineWidth(0.25);
        // Le demi-cercle, en segments : jsPDF n'a pas d'arc partiel.
        let px = g.sx + Math.cos(c.a0) * rr, py = g.sy + Math.sin(c.a0) * rr;
        for (let deg = 2; deg <= 180; deg += 2) {
            const a = c.a0 - deg * Math.PI / 180;
            const nx = g.sx + Math.cos(a) * rr, ny = g.sy + Math.sin(a) * rr;
            doc.line(px, py, nx, ny); px = nx; py = ny;
        }
        // LE BORD DROIT DE L'INSTRUMENT, du 0 au 180 : c'est lui qu'on aligne
        // sur le côté tracé, et il manquait.
        doc.setLineWidth(0.4);
        doc.line(g.sx + Math.cos(c.a0) * rr, g.sy + Math.sin(c.a0) * rr,
            g.sx - Math.cos(c.a0) * rr, g.sy - Math.sin(c.a0) * rr);
        doc.setLineWidth(0.25);
        for (let deg = 0; deg <= 180; deg += 10) {
            const a = c.a0 - deg * Math.PI / 180;
            const gros = deg % 30 === 0;
            const r1 = rr - g.r * (gros ? 0.13 : 0.07);
            doc.setLineWidth(gros ? 0.35 : 0.2);
            doc.line(g.sx + Math.cos(a) * r1, g.sy + Math.sin(a) * r1,
                g.sx + Math.cos(a) * rr, g.sy + Math.sin(a) * rr);
            if (!gros) continue;
            const rt = rr - g.r * 0.24;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(Math.max(4, g.r * 0.26));
            doc.setTextColor(124, 58, 237);
            doc.text(String(deg), g.sx + Math.cos(a) * rt, g.sy + Math.sin(a) * rt + 0.6,
                { align: 'center' });
        }
        // Le repère central — la croix qu'on pose sur le sommet.
        const cr = g.r * 0.09;
        doc.setDrawColor(124, 58, 237);
        doc.setLineWidth(0.3);
        doc.line(g.sx - cr, g.sy, g.sx + cr, g.sy);
        doc.line(g.sx, g.sy - cr, g.sx, g.sy + cr);
        // Et la graduation LUE, en rouge : c'est la lecture qui se corrige.
        const al = c.a0 - m.target * Math.PI / 180;
        doc.setDrawColor(220, 38, 38);
        doc.setLineWidth(0.55);
        doc.line(g.sx + Math.cos(al) * (rr - g.r * 0.2), g.sy + Math.sin(al) * (rr - g.r * 0.2),
            g.sx + Math.cos(al) * (rr + g.r * 0.06), g.sy + Math.sin(al) * (rr + g.r * 0.06));
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(Math.max(5, g.r * 0.34));
        doc.setTextColor(220, 38, 38);
        doc.text(pourPdf(`${m.target}°`), g.sx + Math.cos(al) * (rr + g.r * 0.22),
            g.sy + Math.sin(al) * (rr + g.r * 0.22) + 0.7, { align: 'center' });
        doc.setFont('helvetica', 'normal');
    }

    doc.setDrawColor(...ENCRE.trait);
    // L'arc de l'angle — le même qu'à l'aperçu, et seulement quand il y a un
    // angle à voir. Il manquait ici : la feuille et son aperçu ne montraient
    // pas la même figure.
    if (!construire || solution) {
        const ra = g.r * 0.26;
        doc.setLineWidth(0.3);
        const pas = (c.a1 - c.a0) / 24;
        let ax = g.sx + Math.cos(c.a0) * ra, ay = g.sy + Math.sin(c.a0) * ra;
        for (let i = 1; i <= 24; i++) {
            const a = c.a0 + pas * i;
            const nx = g.sx + Math.cos(a) * ra, ny = g.sy + Math.sin(a) * ra;
            doc.line(ax, ay, nx, ny); ax = nx; ay = ny;
        }
    }
    doc.setLineWidth(0.55);
    doc.line(g.sx, g.sy, c.b.x, c.b.y);
    if (!construire || solution) {
        if (construire) doc.setDrawColor(220, 38, 38);
        doc.line(g.sx, g.sy, c.r.x, c.r.y);
        doc.setDrawColor(...ENCRE.trait);
    }
    doc.setFillColor(...ENCRE.trait);
    doc.circle(g.sx, g.sy, 0.7, 'F');

    const ligne = construire
        ? `Construis un angle de ${m.target}°`
        : (solution ? `${m.target}°` : 'L\'angle mesure  .......  °');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(Math.max(7, g.ligneH * 1.5));
    doc.setTextColor(...ENCRE.texte);
    doc.text(pourPdf(ligne), g.x0 + g.largeur / 2, g.ligneY + g.ligneH * 0.7, { align: 'center' });
}

// --- PÉRIMÈTRE ET AIRE : LE RECTANGLE COTÉ ------------------------------------
//
// Le rectangle est dessiné À L'ÉCHELLE de ses dimensions — un 12 × 3 est long
// et plat, un 5 × 4 est presque carré. C'est ce qui permet de VOIR qu'un
// périmètre fait le tour et qu'une aire remplit, et cette confusion-là est
// celle qui coûte le plus de points.
//
// Les cotes sont écrites sur les côtés, pas dans un énoncé : sur une fiche de
// géométrie, une longueur se lit sur la figure.

function geoRectangle(item, slot, tous) {
    const m = item.meta;
    const lignes = m.demande.length;
    // TOUTE LA BOÎTE, PAS LE CARRÉ INSCRIT. Rémy : « je pense que tu peux
    // faire quelque chose de plus compact ». Un rectangle de 11 × 5 et une
    // ligne de réponse tenaient dans un emplacement CARRÉ : la moitié droite
    // de chaque bloc restait blanche, et six figures mangeaient une page
    // entière. Sur la boîte réelle — large et basse en trois colonnes — la
    // figure grandit ET l'on tient neuf rectangles au lieu de six.
    const b = slot.boite;
    const ligneH = Math.max(4, Math.min(b.h * 0.2, 6));
    const zone = b.h - lignes * ligneH;
    // La place des cotes : le nombre à gauche de la figure, le nombre dessous.
    const coteW = Math.min(b.w * 0.15, 12);
    const coteH = Math.min(zone * 0.2, 4.5);
    const dispoW = Math.max(6, b.w - coteW - 2);
    const dispoH = Math.max(6, zone - coteH - 1);
    // L'ÉCHELLE EST CELLE DE LA FICHE, PAS CELLE DU RECTANGLE. On la calcule
    // sur la plus grande dimension permise (meta.max), jamais sur les côtés de
    // cette figure-ci : sinon un 4 cm et un 10 cm seraient dessinés de la même
    // longueur, ce qui est faux — et sur une fiche de géométrie, c'est le
    // dessin qui ment en premier. Le facteur 0,7 est la largeur maximale que
    // le générateur s'autorise, il borne donc la hauteur.
    const grand = Math.max(m.max || m.L, m.L);
    // LA HAUTEUR RÉSERVÉE EST CELLE DE LA PLUS HAUTE FIGURE DE LA FEUILLE.
    //
    // Rémy : « on pourrait faire les figures un peu plus grandes. » On leur
    // gardait la place d'un rectangle dont la largeur ferait 70 % de la plus
    // grande dimension possible — un chiffre en l'air, qui n'était ni sûr ni
    // généreux. Ni sûr : le générateur tire la largeur jusqu'à L − 1, donc un
    // 12 × 11 débordait. Ni généreux : une feuille de rectangles plats, qui
    // est le cas ordinaire, se voyait rogner un tiers de sa hauteur pour une
    // figure qui n'y était pas.
    //
    // On regarde donc ce que la feuille contient VRAIMENT. L'échelle reste
    // commune à tous les blocs — c'est elle qui fait qu'un 4 cm se voit plus
    // court qu'un 10 cm, et sur une fiche de géométrie c'est le dessin qui
    // ment en premier —, mais elle n'est plus bridée par un cas absent.
    const metas = blocsVoisins(item, slot, tous).map(it => it.meta || {});
    const hautMax = Math.max(m.l, ...metas.map(x => Number(x.l) || 0));
    const ech = Math.min(dispoW / grand, dispoH / Math.max(1, hautMax));
    const w = m.L * ech, h = m.l * ech;
    // LA RÉPONSE SE POSE SOUS LA FIGURE, PAS AU FOND DU BLOC.
    //
    // Rémy : « il y a trop d'espace entre la figure et le périmètre à
    // calculer ». La ligne était collée au bas de l'emplacement et la figure
    // centrée dans ce qui restait : sur un rectangle plat — 2 cm sur 8, le cas
    // le plus fréquent —, cela ouvrait deux centimètres de blanc entre le
    // dessin et la question qui le concerne, et l'œil ne les rattachait plus
    // l'un à l'autre.
    //
    // On réserve donc la hauteur de la PLUS HAUTE figure de la feuille, on y
    // pose toutes les autres SUR LA MÊME LIGNE DE BASE — comme des objets sur
    // une étagère, ce qui garde les cotes et les réponses alignées d'un bloc à
    // l'autre —, et l'on centre l'ensemble dans le bloc. Le blanc restant
    // passe au-dessus et au-dessous du groupe, où il ne sépare plus rien.
    const hautGroupe = hautMax * ech + coteH + 1;
    const haussee = Math.max(0, (zone - hautGroupe) / 2);
    return {
        m, lignes, ligneH, w, h, b,
        // La police des cotes ne dépend plus d'un carré qui n'existe pas :
        // elle suit la hauteur du bloc, comme le reste.
        police: Math.max(2.1, Math.min(b.h * 0.075, 3.6)),
        x: b.x + coteW + (dispoW - w) / 2,
        y: b.y + haussee + (hautMax * ech - h),
        x0: b.x, ligneY: b.y + haussee + hautGroupe
    };
}

const nomDemande = (d) => (d === 'aire' ? 'Aire' : 'Périmètre');

const uniteDemande = (d, u) => (d === 'aire' ? `${u}²` : u);

function rectanglePreviewHtml(item, slot, k, solution, rang, tous) {
    const g = geoRectangle(item, slot, tous);
    const m = g.m;
    const T = (v) => (v * k).toFixed(2);
    // Le périmètre est un TOUR : c'est le trait qu'on colore, et l'intérieur
    // reste presque blanc. L'aire est une SURFACE : c'est elle qu'on remplit.
    const couleur = polycopieEnCouleur();
    const t = teinteFigure(rangDuBloc(slot, rang));
    const remplit = m.demande.includes('aire');
    let d = `<rect x="${T(g.x)}" y="${T(g.y)}" width="${T(g.w)}" height="${T(g.h)}"
             fill="${couleur ? rvbCss(t.fond) : 'none'}"
             fill-opacity="${remplit ? 1 : 0.35}"
             stroke="${couleur ? rvbCss(t.trait) : '#1a202c'}"
             stroke-width="${T(remplit ? 0.35 : 0.5)}"/>`;
    // Les cotes : la longueur sous la figure, la largeur à gauche.
    d += `<text x="${T(g.x + g.w / 2)}" y="${T(g.y + g.h + g.police * 1.1)}"
          text-anchor="middle" font-size="${T(g.police)}" font-weight="700"
          fill="#2d3748">${m.L} ${m.u}</text>`;
    d += `<text x="${T(g.x - g.police * 0.5)}" y="${T(g.y + g.h / 2)}"
          text-anchor="end" dominant-baseline="central"
          font-size="${T(g.police)}" font-weight="700"
          fill="#2d3748">${m.l} ${m.u}</text>`;

    let html = `<svg class="fx-rc-svg" style="left:0; top:0; width:100%; height:100%">${d}</svg>`;
    m.demande.forEach((q, i) => {
        const valeur = solution
            ? `${q === 'aire' ? m.aire : m.perimetre} ${uniteDemande(q, m.u)}`
            : `.............. ${uniteDemande(q, m.u)}`;
        html += `<div class="fx-rc-ligne" style="left:${g.x0 * k}px;
            top:${(g.ligneY + i * g.ligneH) * k}px; width:${g.b.w * k}px;
            height:${g.ligneH * k}px; font-size:${g.ligneH * 0.46 * k}px">
            <b>${nomDemande(q)}</b><span>=</span><i>${valeur}</i></div>`;
    });
    return html;
}

function dessinerRectanglePdf(doc, item, slot, solution, champ, rang, tous) {
    const g = geoRectangle(item, slot, tous);
    const m = g.m;
    const couleur = polycopieEnCouleur();
    const t = teinteFigure(rangDuBloc(slot, rang));
    const remplit = m.demande.includes('aire');

    if (couleur) {
        doc.setDrawColor(...t.trait);
        doc.setFillColor(...t.fond);
        // LE TOUR SE VOIT SANS ÉPAISSIR LA FIGURE. Rémy : « pour le rectangle,
        // le trait extérieur est trop gros. » Huit dixièmes de millimètre sur
        // un rectangle de deux centimètres de haut, c'est un cadre, pas un
        // contour : le trait mange la figure qu'il entoure et les cotes
        // semblent flotter contre un mur.
        doc.setLineWidth(remplit ? 0.35 : 0.5);
        doc.rect(g.x, g.y, g.w, g.h, remplit ? 'FD' : 'S');
    } else {
        doc.setDrawColor(...ENCRE.trait);
        doc.setLineWidth(0.5);
        doc.rect(g.x, g.y, g.w, g.h, 'S');
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(g.police * 2.83);
    doc.setTextColor(...ENCRE.texte);
    doc.text(pourPdf(`${m.L} ${m.u}`), g.x + g.w / 2, g.y + g.h + g.police * 1.1,
        { align: 'center' });
    doc.text(pourPdf(`${m.l} ${m.u}`), g.x - g.police * 0.5, g.y + g.h / 2 + g.police * 0.35,
        { align: 'right' });

    m.demande.forEach((q, i) => {
        const y = g.ligneY + i * g.ligneH + g.ligneH * 0.68;
        const x0 = g.b.x + 2;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(Math.max(6.5, Math.min(g.ligneH * 1.4, 11)));
        doc.setTextColor(...ENCRE.texte);
        const etiquette = pourPdf(`${nomDemande(q)} =`);
        doc.text(etiquette, x0, y);
        // LA RÉPONSE SUIT LE SIGNE « = ». Alignée à droite du bloc, elle
        // laissait un blanc au milieu de la ligne, et un élève lit ce blanc
        // comme une case à remplir de plus.
        const xr = x0 + doc.getTextWidth(etiquette) + 2;
        if (solution) {
            doc.text(pourPdf(`${q === 'aire' ? m.aire : m.perimetre} ${uniteDemande(q, m.u)}`),
                xr, y);
            return;
        }
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...ENCRE.gris);
        doc.text(pourPdf(`.............. ${uniteDemande(q, m.u)}`), xr, y);
        if (champ) champ(xr, y - g.ligneH * 0.6, g.b.x + g.b.w - 2 - xr, g.ligneH * 0.8);
    });
}

// --- LE TOUR DU TRIANGLE ------------------------------------------------------
//
// Même principe que le rectangle, et pour la même raison : sur une fiche de
// géométrie, une longueur se LIT sur la figure. Le triangle est donc coté, codé
// et dessiné à l'échelle — l'échelle de la FEUILLE, commune à tous les blocs,
// sans quoi un côté de 4 cm et un côté de 10 cm se dessineraient pareil.

/** La mise en page d'un bloc « triangle », en millimètres. */
function geoTriangle(item, slot, tous) {
    const m = item.meta;
    const b = slot.boite;
    const ligneH = Math.max(4, Math.min(b.h * 0.2, 6));
    const zone = b.h - ligneH;
    // De quoi loger les cotes et les noms de sommets, qui sortent de la figure.
    const marge = Math.max(3.5, Math.min(b.w, zone) * 0.12);
    const dispoW = Math.max(6, b.w - 2 * marge);
    const dispoH = Math.max(6, zone - 2 * marge);

    const metas = blocsVoisins(item, slot, tous).map(it => it.meta || {});
    const etendues = metas.map(x => etendueTriangle(x));
    const grandW = Math.max(...etendues.map(e => e.w), 1);
    const grandH = Math.max(...etendues.map(e => e.h), 1);
    const ech = Math.min(dispoW / grandW, dispoH / grandH);

    const e = etendueTriangle(m);
    const w = e.w * ech, h = e.h * ech;
    const x = b.x + marge + (dispoW - w) / 2;
    const y = b.y + marge + (dispoH - h) / 2;
    // L'AXE DES ORDONNÉES EST RETOURNÉ, comme à l'écran : en PDF comme en SVG,
    // y descend. Sans ce retournement le triangle est dessiné pointe en bas —
    // juste, mais illisible.
    const P = Object.fromEntries(sommetsBruts(m).map(p => [p.n, {
        x: x + (p.x - e.x0) * ech,
        y: y + h - (p.y - e.y0) * ech
    }]));
    const centre = {
        x: (P.A.x + P.B.x + P.C.x) / 3,
        y: (P.A.y + P.B.y + P.C.y) / 3
    };
    return {
        m, P, centre, b, ligneH,
        police: Math.max(2.1, Math.min(b.h * 0.075, 3.6)),
        ligneY: b.y + zone
    };
}

/** Ce qu'on demande sur la feuille, et la réponse quand c'est le corrigé. */
function demandeTriangle(m) {
    const nom = { a: '[BC]', b: '[AC]', c: '[AB]' };
    if (m.marche === 'manquant') {
        return { etiquette: nom[m.cache] || 'Côté', signe: '=', valeur: `${m[m.cache]} ${m.unit}` };
    }
    return { etiquette: 'Périmètre', signe: '=', valeur: `${m.perimetre} ${m.unit}` };
}

/**
 * Les mesures et les marques d'un côté, en coordonnées de page.
 *
 * Une cote se pose DEHORS : au milieu du côté, poussée à l'opposé du centre de
 * gravité. C'est la règle la plus simple qui marche pour tous les triangles, y
 * compris les très plats — et c'est la même qu'à l'écran, pour que la feuille
 * et l'écran montrent la même figure.
 */
function cotesTriangle(g) {
    const m = g.m;
    const muet = { isocele: ['b'], equilateral: ['a', 'b'] }[m.marche] || [];
    // L'UNITÉ SUR CHAQUE LONGUEUR. Rémy : « mets l'unité sur les longueurs des
    // côtés ». Sur la feuille, un « 8 » nu oblige à aller chercher l'unité dans
    // la consigne — et la moitié des élèves l'oublient dans leur réponse pour
    // exactement cette raison. À l'écran l'unité est dans le pavé ; sur le
    // papier, il n'y a que la figure.
    const dit = (k) => (m.marche === 'manquant' && m.cache === k) ? '?'
        : (muet.includes(k) ? '' : `${m[k]} ${m.unit}`);
    const marques = m.marche === 'isocele' ? { a: 0, b: 1, c: 1 }
        : (m.marche === 'equilateral' ? { a: 1, b: 1, c: 1 } : { a: 0, b: 0, c: 0 });
    const cotes = [['a', g.P.B, g.P.C], ['b', g.P.A, g.P.C], ['c', g.P.A, g.P.B]];

    return cotes.map(([cle, Q, R]) => {
        const mx = (Q.x + R.x) / 2, my = (Q.y + R.y) / 2;
        const vx = mx - g.centre.x, vy = my - g.centre.y;
        const n = Math.hypot(vx, vy) || 1;
        const ecart = g.police * 1.15;
        const dx = R.x - Q.x, dy = R.y - Q.y;
        const l = Math.hypot(dx, dy) || 1;
        const ux = dx / l, uy = dy / l;
        const traits = [];
        for (let i = 0; i < (marques[cle] || 0); i++) {
            const d = (i - (marques[cle] - 1) / 2) * g.police * 0.5;
            const cx = mx + ux * d, cy = my + uy * d;
            const e = g.police * 0.45;
            traits.push({ x1: cx - uy * e, y1: cy + ux * e, x2: cx + uy * e, y2: cy - ux * e });
        }
        // LA COTE SUIT LA DIRECTION DU CÔTÉ. Rémy : « écris-les dans la
        // direction du côté (si le côté est penché, la longueur suit sa
        // direction) ». C'est la convention du cahier, et elle sert : une
        // longueur écrite à l'horizontale à côté d'un côté oblique se
        // rattache à l'œil au mauvais côté quand deux d'entre eux se
        // rejoignent. On redresse seulement pour ne jamais écrire à l'envers.
        let angle = Math.atan2(dy, dx) * 180 / Math.PI;
        if (angle > 90) angle -= 180;
        if (angle < -90) angle += 180;
        return {
            texte: dit(cle), traits, angle,
            x: mx + (vx / n) * ecart, y: my + (vy / n) * ecart
        };
    });
}

function trianglePreviewHtml(item, slot, k, solution, rang, tous) {
    const g = geoTriangle(item, slot, tous);
    const T = (v) => (v * k).toFixed(2);
    const couleur = polycopieEnCouleur();
    const t = teinteFigure(rangDuBloc(slot, rang));
    const trait = couleur ? rvbCss(t.trait) : '#1a202c';

    let d = `<polygon points="${[g.P.A, g.P.B, g.P.C].map(p => `${T(p.x)},${T(p.y)}`).join(' ')}"
        fill="${couleur ? rvbCss(t.fond) : 'none'}" fill-opacity="0.35"
        stroke="${trait}" stroke-width="${T(0.45)}" stroke-linejoin="round"/>`;

    cotesTriangle(g).forEach(c => {
        c.traits.forEach(m => {
            d += `<line x1="${T(m.x1)}" y1="${T(m.y1)}" x2="${T(m.x2)}" y2="${T(m.y2)}"
                stroke="${couleur ? rvbCss(t.trait) : '#1a202c'}" stroke-width="${T(0.4)}"/>`;
        });
        if (!c.texte) return;
        d += `<text x="${T(c.x)}" y="${T(c.y)}" text-anchor="middle" dominant-baseline="central"
            transform="rotate(${(c.angle || 0).toFixed(1)} ${T(c.x)} ${T(c.y)})"
            font-size="${T(g.police)}" font-weight="700" fill="#2d3748">${c.texte}</text>`;
    });
    ['A', 'B', 'C'].forEach(nom => {
        const p = g.P[nom];
        const vx = p.x - g.centre.x, vy = p.y - g.centre.y;
        const n = Math.hypot(vx, vy) || 1;
        d += `<text x="${T(p.x + (vx / n) * g.police)}" y="${T(p.y + (vy / n) * g.police)}"
            text-anchor="middle" dominant-baseline="central"
            font-size="${T(g.police * 0.92)}" font-weight="700" fill="#1a202c">${nom}</text>`;
    });

    const q = demandeTriangle(g.m);
    const valeur = solution ? q.valeur : `.............. ${g.m.unit}`;
    return `<svg class="fx-rc-svg" style="left:0; top:0; width:100%; height:100%">${d}</svg>`
        + `<div class="fx-rc-ligne" style="left:${g.b.x * k}px; top:${g.ligneY * k}px;
            width:${g.b.w * k}px; height:${g.ligneH * k}px;
            font-size:${g.ligneH * 0.46 * k}px">
            <b>${q.etiquette}</b><span>${q.signe || '='}</span><i>${valeur}</i></div>`;
}

function dessinerTrianglePdf(doc, item, slot, solution, champ, rang, tous) {
    const g = geoTriangle(item, slot, tous);
    const couleur = polycopieEnCouleur();
    const t = teinteFigure(rangDuBloc(slot, rang));

    if (couleur) { doc.setDrawColor(...t.trait); doc.setFillColor(...t.fond); }
    else { doc.setDrawColor(...ENCRE.trait); doc.setFillColor(255, 255, 255); }
    doc.setLineWidth(0.45);
    doc.setLineJoin('round');
    doc.triangle(g.P.A.x, g.P.A.y, g.P.B.x, g.P.B.y, g.P.C.x, g.P.C.y, couleur ? 'FD' : 'S');

    doc.setLineWidth(0.4);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(g.police * 2.83);
    doc.setTextColor(...ENCRE.texte);
    cotesTriangle(g).forEach(c => {
        c.traits.forEach(m => doc.line(m.x1, m.y1, m.x2, m.y2));
        // jsPDF compte les angles dans le sens TRIGONOMÉTRIQUE, l'écran dans
        // le sens des aiguilles : d'où le signe opposé. Écrit pareil des deux
        // côtés, la feuille et l'aperçu ne montreraient pas la même figure.
        if (c.texte) {
            doc.text(pourPdf(c.texte), c.x, c.y + g.police * 0.35,
                { align: 'center', angle: -(c.angle || 0) });
        }
    });
    doc.setFontSize(g.police * 2.6);
    ['A', 'B', 'C'].forEach(nom => {
        const p = g.P[nom];
        const vx = p.x - g.centre.x, vy = p.y - g.centre.y;
        const n = Math.hypot(vx, vy) || 1;
        doc.text(nom, p.x + (vx / n) * g.police, p.y + (vy / n) * g.police + g.police * 0.35,
            { align: 'center' });
    });

    ligneReponseFigurePdf(doc, g, demandeTriangle(g.m), solution, champ, g.m.unit);
}

// --- LE DISQUE ------------------------------------------------------------------
//
// Le disque est dessiné à l'échelle lui aussi, et il ne porte QUE le segment
// donné par l'énoncé : le rayon, ou le diamètre. Les dessiner tous les deux
// répondrait à l'étape où toute la difficulté est justement de passer de l'un
// à l'autre.

/** L'inclinaison du rayon, la même qu'à l'écran : le papier ne montre pas une
 *  autre figure que le jeu. */
const PENTE_RAYON = -30 * Math.PI / 180;

function geoDisque(item, slot, tous) {
    const m = item.meta;
    const b = slot.boite;
    const ligneH = Math.max(4, Math.min(b.h * 0.2, 6));
    const police = Math.max(2.1, Math.min(b.h * 0.075, 3.6));
    // CE QU'ON DEMANDE, EN TÊTE DE CASE. Rémy : « sur le polycopié, on ne sait
    // pas si tu demandes l'aire ou le périmètre ». C'était écrit — en bas, en
    // tout petit, à la fin d'une ligne de pointillés qu'on remplit APRÈS avoir
    // cherché. Or c'est la question : elle se lit avant la figure, pas après.
    const titreH = police * 1.5;
    const zone = b.h - ligneH - titreH;
    const marge = police * 1.6;
    const dispo = Math.max(6, Math.min(b.w, zone) - 2 * marge);

    const metas = blocsVoisins(item, slot, tous).map(it => it.meta || {});
    const grand = Math.max(...metas.map(x => Number(x.r) || 1), 1);
    // « QUELLE FORMULE ? » NE PARLE D'AUCUN DISQUE PARTICULIER : sa figure porte
    // « r », pas une mesure. La dessiner à l'échelle du rayon tiré ferait deux
    // disques de tailles différentes pour la même question, et l'écart
    // signifierait quelque chose qui n'existe pas. On la dessine donc à la
    // taille de la case.
    const rayon = m.marche === 'formule' ? grand : (Number(m.r) || 1);
    // LES DISQUES RESTENT ORDONNÉS, MAIS LE PLUS PETIT RESTE LISIBLE.
    // À l'échelle stricte, un rayon 4 à côté d'un rayon 11 donnait un cercle de
    // trois millimètres : sa mesure débordait de tous les côtés et l'on ne
    // voyait plus un disque, mais un point. Le rayon dessiné garde l'ordre des
    // rayons vrais — plus grand reste plus grand — sans descendre sous 60 % du
    // plus gros. Aucune question ne demande de comparer deux disques entre eux ;
    // l'échelle exacte ne sert donc à rien qu'on perde ici.
    const R = (dispo / 2) * (0.6 + 0.4 * rayon / grand);
    return {
        m, R, police, b, ligneH, titreH,
        cx: b.x + b.w / 2, cy: b.y + titreH + zone / 2,
        titreY: b.y + titreH * 0.8,
        ligneY: b.y + titreH + zone
    };
}

/** La question, en trois mots, écrite en tête de case. */
function titreDisque(m) {
    // LAQUELLE DES DEUX ? Rémy, sur la feuille : « tu demandes quelle formule,
    // mais est-ce l'aire ou le périmètre ? » La case disait « Quelle
    // formule ? » et rien d'autre — deux blocs voisins posaient donc la même
    // question, l'un attendant 2 × π × r et l'autre π × r × r, et l'élève ne
    // pouvait pas savoir lequel était lequel. L'écran, lui, l'a toujours dit :
    // « Quelle formule donne le périmètre d'un disque de rayon r ? »
    if (m.marche === 'formule') {
        return m.surLAire ? 'Formule de l’aire ?' : 'Formule du périmètre ?';
    }
    const exact = DISQUE_EXACTES.includes(m.marche);
    return `${m.surLAire ? 'Aire' : 'Périmètre'}${exact ? ' exact' : ' arrondi'}${m.surLAire && exact ? 'e' : ''} ?`;
}

function demandeDisque(m) {
    if (m.marche === 'formule') {
        return { etiquette: 'Formule', signe: '=',
            valeur: m.surLAire ? 'π × r × r' : '2 × π × r', unite: '' };
    }
    const exact = DISQUE_EXACTES.includes(m.marche);
    const grandeur = m.surLAire ? 'Aire' : 'Périmètre';
    // LE SIGNE FAIT PARTIE DE LA QUESTION. Une valeur exacte s'écrit avec « = »,
    // une valeur arrondie avec « ≈ », et c'est une distinction du cours — pas
    // une décoration. La ligne écrivait « Périmètre ≈ = … » : les deux signes à
    // la file, parce que l'étiquette portait déjà le sien.
    return exact
        ? { etiquette: `${grandeur} exact${m.surLAire ? 'e' : ''}`, signe: '=',
            valeur: m.exact, unite: '' }
        : { etiquette: grandeur, signe: '≈',
            valeur: `${ecrireNombreDisque(m.arrondi)} ${m.unit}`, unite: m.unit };
}

/**
 * Le segment donné : rayon depuis le centre, ou diamètre de bord à bord.
 *
 * IL EST PENCHÉ, COMME À L'ÉCRAN, ET SA MESURE SUIT SA DIRECTION.
 *
 * Rémy : « mets la longueur dans la direction du rayon (penché si le rayon est
 * penché) ». La première fiche le dessinait à l'horizontale, pour une raison
 * qui n'était pas bonne : un rayon oblique avec une mesure ÉCRITE À PLAT posait
 * « 20 cm » en travers de l'arc. Ce n'était pas l'inclinaison le problème,
 * c'était le texte horizontal — écrit PARALLÈLEMENT au rayon et décalé d'un
 * côté, il longe le trait sans jamais croiser le cercle. Et la feuille montre
 * de nouveau la même figure que le jeu, ce qui compte plus que tout le reste.
 */
function segmentDisque(g) {
    const parDiametre = g.m.marche === 'diametre';
    const ux = Math.cos(PENTE_RAYON), uy = Math.sin(PENTE_RAYON);
    const P = { x: g.cx + g.R * ux, y: g.cy + g.R * uy };
    const Q = parDiametre
        ? { x: g.cx - g.R * ux, y: g.cy - g.R * uy }
        : { x: g.cx, y: g.cy };
    // LA COTE MESURE UNE LONGUEUR, PAS UNE AIRE. `m.unit` est l'unité de la
    // RÉPONSE — « cm² » dès qu'on demande une aire —, et l'on écrivait donc
    // « 18 cm² » le long du rayon. Voir `uniteLongueur` dans le générateur.
    const texte = g.m.marche === 'formule' ? 'r'
        : `${parDiametre ? g.m.d : g.m.r} ${g.m.uniteLongueur || 'cm'}`;
    // LA MESURE TIENT DANS LE SEGMENT QU'ELLE MESURE. Sur un petit disque,
    // « 20 cm » écrit au corps de la case dépassait du cercle des deux côtés :
    // le nombre semblait alors mesurer autre chose. On le réduit jusqu'à ce
    // qu'il tienne — jamais sous les deux tiers, en deçà on ne le lit plus.
    const longueur = Math.hypot(P.x - Q.x, P.y - Q.y);
    const large = 0.55 * texte.length;
    const police = Math.max(g.police * 0.66,
        Math.min(g.police, (longueur * 0.92) / Math.max(1, large)));
    // Le décalage est PERPENDICULAIRE au segment : c'est ce qui garde le
    // nombre à côté du trait quelle que soit la pente.
    const ecart = police * 0.7;
    let angle = PENTE_RAYON * 180 / Math.PI;
    if (angle > 90) angle -= 180;
    if (angle < -90) angle += 180;
    return {
        P, Q, texte, angle, police,
        mx: (P.x + Q.x) / 2 + uy * ecart,
        my: (P.y + Q.y) / 2 - ux * ecart
    };
}

function disquePreviewHtml(item, slot, k, solution, rang, tous) {
    const g = geoDisque(item, slot, tous);
    const T = (v) => (v * k).toFixed(2);
    const couleur = polycopieEnCouleur();
    const t = teinteFigure(rangDuBloc(slot, rang));
    const s = segmentDisque(g);

    let d = `<circle cx="${T(g.cx)}" cy="${T(g.cy)}" r="${T(g.R)}"
        fill="${couleur ? rvbCss(t.fond) : 'none'}" fill-opacity="0.35"
        stroke="${couleur ? rvbCss(t.trait) : '#1a202c'}" stroke-width="${T(0.45)}"/>`;
    d += `<line x1="${T(s.P.x)}" y1="${T(s.P.y)}" x2="${T(s.Q.x)}" y2="${T(s.Q.y)}"
        stroke="#1a202c" stroke-width="${T(0.4)}"/>`;
    d += `<circle cx="${T(g.cx)}" cy="${T(g.cy)}" r="${T(0.35)}" fill="#1a202c"/>`;
    d += `<text x="${T(s.mx)}" y="${T(s.my)}" text-anchor="middle" dominant-baseline="central"
        transform="rotate(${s.angle.toFixed(1)} ${T(s.mx)} ${T(s.my)})"
        font-size="${T(s.police)}" font-weight="700" fill="#2d3748">${s.texte}</text>`;
    d += `<text x="${T(g.cx)}" y="${T(g.titreY)}" text-anchor="middle" dominant-baseline="central"
        font-size="${T(g.police * 1.05)}" font-weight="700" fill="#1a202c"
        >${titreDisque(g.m)}</text>`;

    const q = demandeDisque(g.m);
    const valeur = solution ? q.valeur : `.............. ${q.unite}`.trimEnd();
    return `<svg class="fx-rc-svg" style="left:0; top:0; width:100%; height:100%">${d}</svg>`
        + `<div class="fx-rc-ligne" style="left:${g.b.x * k}px; top:${g.ligneY * k}px;
            width:${g.b.w * k}px; height:${g.ligneH * k}px;
            font-size:${g.ligneH * 0.44 * k}px">
            <b>${q.etiquette}</b><span>${q.signe || '='}</span><i>${valeur}</i></div>`;
}

function dessinerDisquePdf(doc, item, slot, solution, champ, rang, tous) {
    const g = geoDisque(item, slot, tous);
    const couleur = polycopieEnCouleur();
    const t = teinteFigure(rangDuBloc(slot, rang));
    const s = segmentDisque(g);

    if (couleur) { doc.setDrawColor(...t.trait); doc.setFillColor(...t.fond); }
    else { doc.setDrawColor(...ENCRE.trait); doc.setFillColor(255, 255, 255); }
    doc.setLineWidth(0.45);
    doc.circle(g.cx, g.cy, g.R, couleur ? 'FD' : 'S');

    doc.setDrawColor(...ENCRE.trait);
    doc.setLineWidth(0.4);
    doc.line(s.P.x, s.P.y, s.Q.x, s.Q.y);
    doc.setFillColor(...ENCRE.trait);
    doc.circle(g.cx, g.cy, 0.35, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(s.police * 2.83);
    doc.setTextColor(...ENCRE.texte);
    // Signe opposé : jsPDF compte les angles dans le sens trigonométrique.
    doc.text(pourPdf(s.texte), s.mx, s.my + s.police * 0.35,
        { align: 'center', angle: -s.angle });
    // LA QUESTION EN TÊTE DE CASE, avant la figure.
    doc.setFontSize(g.police * 2.97);
    texteRiche(doc, titreDisque(g.m), g.cx, g.titreY + g.police * 0.35,
        g.police * 2.97 * 0.3528, { align: 'center' });

    const q = demandeDisque(g.m);
    ligneReponseFigurePdf(doc, g, q, solution, champ, q.unite);
}

// --- LES PROBLÈMES DE MAT ------------------------------------------------------
//
// LES PIÈCES SONT DESSINÉES, PAS ÉCRITES. Une pastille marquée « C » oblige à
// traduire à chaque coup d'œil ; sur un diagramme de problème, où l'élève
// balaie la position vingt fois, cela suffit à rendre l'exercice pénible. Le
// module ui/piecesEchecs.js donne les mêmes silhouettes à l'écran et au PDF —
// et c'est la seule raison pour laquelle l'aperçu ne peut pas mentir sur ce
// qui sortira de l'imprimante.

// --- L'HEXAGRILLE, SUR LE PAPIER ---------------------------------------------
//
// Rémy : « Pas de pdf ». Neuf cases, huit sommes, aucune manipulation : c'est
// un exercice qui se cherche très bien au crayon, et qui se rature.
//
// LE DESSIN VIENT DU NOYAU (`core/hexagrilleFigure.js`), le même qu'à l'écran.
// La feuille ne fait que le poser dans son bloc, à l'échelle : hexagones,
// étiquettes de somme et flèches tombent donc exactement là où le jeu les met.

/**
 * Le bloc, et le facteur qui fait passer des unités du dessin aux millimètres.
 *
 * Le cadre du dessin dépend des FLÈCHES conservées — une grille difficile en
 * garde plus, et son enveloppe est plus large. On le recalcule donc pour
 * chaque grille au lieu de prendre une taille fixe, sinon la moitié des
 * feuilles auraient une marge et l'autre une somme coupée.
 */
function geoHexagrille(item, slot) {
    const b = slot.boite || { x: slot.x, y: slot.y, w: slot.taille, h: slot.taille };
    const p = item.meta.puzzle;
    const cadre = cadreHexagrille(p.fleches);
    // La consigne du bloc tient sous la figure : on lui laisse sa ligne.
    const echelle = Math.min(b.w / cadre.w, b.h / cadre.h);
    const larg = cadre.w * echelle, haut = cadre.h * echelle;
    return {
        p, cadre, echelle,
        // Centré dans son bloc : une figure collée en haut à gauche a l'air
        // tombée là.
        x0: b.x + (b.w - larg) / 2 - cadre.x * echelle,
        y0: b.y + (b.h - haut) / 2 - cadre.y * echelle,
        // Le rayon et le corps des chiffres, en millimètres.
        rayon: R_HEXA * echelle,
        corps: Math.max(2, Math.min(R_HEXA * echelle * 0.62, 6))
    };
}

/** Les six sommets d'une case, en millimètres, autour de son centre. */
function polygoneHexa(g, c, r) {
    const o = centreHexa(c, r);
    return SOMMETS_HEXA.map(([dx, dy]) => [
        g.x0 + (o.x + dx) * g.echelle,
        g.y0 + (o.y + dy) * g.echelle
    ]);
}

function hexagrillePreviewHtml(item, slot, k, solution) {
    const g = geoHexagrille(item, slot);
    const T = (v) => (v * k).toFixed(2);
    let svg = '';

    CASES_HEXA.forEach(({ c, r, i }) => {
        const pts = polygoneHexa(g, c, r).map(([x, y]) => `${T(x)},${T(y)}`).join(' ');
        // UNE CASE DONNÉE EST IMPRIMÉE, LES AUTRES SONT VIDES. Sur une
        // photocopie en noir et blanc, c'est le FOND qui les distingue —
        // une couleur de chiffre ne survit pas au gris.
        const donnee = g.p.donnees[i] !== 0;
        svg += `<polygon points="${pts}" fill="${donnee ? '#eef1f6' : '#ffffff'}"
            stroke="#1a202c" stroke-width="${T(0.4)}"/>`;
        const ecrit = solution ? g.p.solution[i] : (donnee ? g.p.donnees[i] : 0);
        if (!ecrit) return;
        const o = centreHexa(c, r);
        svg += `<text x="${T(g.x0 + o.x * g.echelle)}" y="${T(g.y0 + o.y * g.echelle)}"
            text-anchor="middle" dominant-baseline="central" font-size="${T(g.corps)}"
            font-weight="700" fill="${donnee ? '#1a202c' : '#e11d48'}">${ecrit}</text>`;
    });

    g.p.fleches.forEach(f => {
        const q = repereFlecheHexa(f);
        const X = (v) => T(g.x0 + v * g.echelle), Y = (v) => T(g.y0 + v * g.echelle);
        svg += `<line x1="${X(q.x1)}" y1="${Y(q.y1)}" x2="${X(q.x2)}" y2="${Y(q.y2)}"
            stroke="#5a687e" stroke-width="${T(0.35)}"/>`;
        // La pointe : deux traits, comme partout ailleurs sur la feuille — un
        // marqueur SVG ne se retrouve pas dans le PDF.
        //
        // ET SA LONGUEUR EST EN UNITÉS DU DESSIN, PAS EN MILLIMÈTRES. Rémy,
        // deux revues de suite : « les bouts des flèches sont minuscules »,
        // « l'extrémité des flèches est tout petit ». Elle l'était, et par
        // deux fois : `2,6 × echelle` était une longueur en MILLIMÈTRES qu'on
        // repassait ensuite dans `X()`, lequel remultiplie par l'échelle — la
        // pointe rapetissait donc comme le CARRÉ de la réduction. Sur un bloc
        // de six centimètres et demi, cela faisait quatre dixièmes de
        // millimètre : un trait de crayon, pas une flèche. Une pointe se
        // mesure sur ce qu'elle désigne : la moitié du rayon d'une case.
        const l = R_HEXA * 0.5;
        const nx = -q.uy, ny = q.ux;
        [1, -1].forEach(sens => {
            svg += `<line x1="${X(q.x2)}" y1="${Y(q.y2)}"
                x2="${X(q.x2 - q.ux * l + nx * l * 0.6 * sens)}"
                y2="${Y(q.y2 - q.uy * l + ny * l * 0.6 * sens)}"
                stroke="#5a687e" stroke-width="${T(0.35)}"/>`;
        });
        svg += `<text x="${X(q.ex)}" y="${Y(q.ey)}" text-anchor="middle"
            dominant-baseline="central" font-size="${T(g.corps * 0.9)}"
            font-weight="700" fill="#2f855a">${f.somme}</text>`;
    });

    return `<svg class="fx-hx-svg" style="left:0; top:0; width:100%; height:100%">${svg}</svg>`;
}

function dessinerHexagrillePdf(doc, item, slot, solution) {
    const g = geoHexagrille(item, slot);

    CASES_HEXA.forEach(({ c, r, i }) => {
        const pts = polygoneHexa(g, c, r);
        const donnee = g.p.donnees[i] !== 0;
        doc.setDrawColor(...ENCRE.trait);
        doc.setLineWidth(0.4);
        if (donnee) doc.setFillColor(238, 241, 246);
        else doc.setFillColor(255, 255, 255);
        // `doc.lines` veut des DÉPLACEMENTS depuis le point de départ, pas des
        // coordonnées : le même piège que les flèches du mot codé.
        const pas = pts.slice(1).map(([x, y], k) => [x - pts[k][0], y - pts[k][1]]);
        doc.lines(pas, pts[0][0], pts[0][1], [1, 1], 'FD', true);

        const ecrit = solution ? g.p.solution[i] : (donnee ? g.p.donnees[i] : 0);
        if (!ecrit) return;
        const o = centreHexa(c, r);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(g.corps / 0.3528);
        if (donnee) doc.setTextColor(...ENCRE.texte);
        else doc.setTextColor(225, 29, 72);
        doc.text(String(ecrit), g.x0 + o.x * g.echelle,
            g.y0 + o.y * g.echelle + g.corps * 0.36, { align: 'center' });
    });

    g.p.fleches.forEach(f => {
        const q = repereFlecheHexa(f);
        const X = (v) => g.x0 + v * g.echelle, Y = (v) => g.y0 + v * g.echelle;
        doc.setDrawColor(90, 104, 126);
        doc.setLineWidth(0.35);
        doc.line(X(q.x1), Y(q.y1), X(q.x2), Y(q.y2));
        const l = R_HEXA * 0.5;   // voir l'aperçu : en unités du dessin
        const nx = -q.uy, ny = q.ux;
        [1, -1].forEach(sens => {
            doc.line(X(q.x2), Y(q.y2),
                X(q.x2 - q.ux * l + nx * l * 0.6 * sens),
                Y(q.y2 - q.uy * l + ny * l * 0.6 * sens));
        });
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(g.corps * 0.9 / 0.3528);
        doc.setTextColor(47, 133, 90);
        doc.text(String(f.somme), X(q.ex), Y(q.ey) + g.corps * 0.32, { align: 'center' });
    });
}

// ================= LE PROGRAMME DE CONSTRUCTION ===========================
//
// LA FIGURE EN HAUT, LES LIGNES DESSOUS. C'est la seule disposition qui marche :
// l'élève regarde le dessin, écrit une phrase, revient au dessin, écrit la
// suivante. Mettre la figure à côté du texte doublerait ce va-et-vient.
//
// ET DEUX LIGNES DE PLUS QUE LE MODÈLE. Donner exactement le compte serait un
// indice — « ah, il en faut sept » —, en donner trois de trop laisserait croire
// qu'on en attend davantage. Deux, c'est de la place pour se reprendre.

/** La hauteur d'une ligne d'écriture manuscrite, en millimètres. */
const PC_LIGNE = 7;

/** La demi-branche de la croix qui marque un point, en millimètres. */
const PC_CROIX = 1.1;

/** La réserve, repliée à la largeur du bloc — en nombre de lignes de texte. */
function reservePliee(texte, largeur, taille) {
    if (!texte) return [];
    // Une largeur de caractère à 0,49 fois le corps approche Helvetica en
    // italique à mieux qu'un millimètre sur ces libellés-là ; le PDF, lui,
    // mesure pour de bon (voir `dessinerProgrammePdf`).
    const parLigne = Math.max(10, Math.floor(largeur / (taille * 0.49)));
    const lignes = [];
    let courante = '';
    texte.split(' · ').forEach(mot => {
        const essai = courante ? `${courante} · ${mot}` : mot;
        if (essai.length <= parLigne) { courante = essai; return; }
        if (courante) lignes.push(courante);
        courante = mot;
    });
    if (courante) lignes.push(courante);
    return lignes;
}

const PC_RESERVE = 2.1;      // corps de la réserve, en millimètres

function geoProgramme(item, slot) {
    const b = boiteDe(slot);
    const m = item.meta;
    const reserve = reservePliee(m.reserve, b.w - 2, PC_RESERVE);
    const hReserve = reserve.length ? reserve.length * (PC_RESERVE + 0.5) + 1.5 : 0;
    const pied = m.lignes * PC_LIGNE + 3 + hReserve;
    const cadre = { x: b.x, y: b.y, w: b.w, h: Math.max(16, b.h - pied) };
    // La figure garde ses proportions : un monde de 100 × 70 étiré au cadre
    // rendrait les cercles ovales, et un cercle ovale n'est plus un cercle.
    const k = Math.min(cadre.w / MONDE_PC.w, cadre.h / MONDE_PC.h);
    const w = MONDE_PC.w * k, h = MONDE_PC.h * k;
    const x0 = cadre.x + (cadre.w - w) / 2, y0 = cadre.y + (cadre.h - h) / 2;
    const P = (p) => ({ x: x0 + p.x * k, y: y0 + p.y * k });
    return { b, m, cadre, k, P, pied, reserve, hReserve };
}

/** Ce qu'il y a à tracer, en millimètres : des traits, des cercles, des lettres. */
function tracesProgramme(g) {
    const traits = [], cercles = [];
    (g.m.objets || []).forEach(o => {
        if (o.genre === 'cercle') {
            cercles.push({ c: g.P(o.c), r: o.r * g.k });
            return;
        }
        const bouts = o.genre === 'droite' ? couperAuMonde(o.a, o.b) : [o.a, o.b];
        if (bouts) traits.push([g.P(bouts[0]), g.P(bouts[1])]);
    });
    const noms = Object.entries(g.m.depart || {}).map(([nom, p]) => {
        const q = g.P(p);
        return { t: nom, x: q.x + 1.6, y: q.y - 1.6, pt: q };
    });
    return { traits, cercles, noms };
}

function programmePreviewHtml(item, slot, k, solution) {
    const g = geoProgramme(item, slot);
    const t = tracesProgramme(g);
    const T = (v) => (v * k).toFixed(2);
    const police = 'Helvetica, Arial, sans-serif';
    let out = '';

    t.traits.forEach(([a, b]) => {
        out += `<line x1="${T(a.x)}" y1="${T(a.y)}" x2="${T(b.x)}" y2="${T(b.y)}"
            stroke="#1a202c" stroke-width="${T(0.4)}" stroke-linecap="round"/>`;
    });
    t.cercles.forEach(c => {
        out += `<circle cx="${T(c.c.x)}" cy="${T(c.c.y)}" r="${T(c.r)}" fill="none"
            stroke="#1a202c" stroke-width="${T(0.4)}"/>`;
    });
    // UN POINT SE MARQUE D'UNE CROIX — Rémy : « les points sont des croix ».
    // C'est la convention du collège : le point est le CROISEMENT des deux
    // traits, on peut y poser la pointe du compas. Un disque cacherait
    // justement l'endroit qu'il désigne. L'écran fait de même.
    t.noms.forEach(n => {
        const c = PC_CROIX;
        out += `<path d="M ${T(n.pt.x - c)} ${T(n.pt.y - c)} L ${T(n.pt.x + c)} ${T(n.pt.y + c)}
            M ${T(n.pt.x - c)} ${T(n.pt.y + c)} L ${T(n.pt.x + c)} ${T(n.pt.y - c)}"
            fill="none" stroke="#1a202c" stroke-width="${T(0.35)}" stroke-linecap="round"/>`;
        out += `<text x="${T(n.x)}" y="${T(n.y)}" font-size="${T(3.2)}" font-weight="800"
            fill="#1a202c" font-family="${police}">${echapper(n.t)}</text>`;
    });

    let y = g.cadre.y + g.cadre.h + 2;
    g.reserve.forEach((ligne, i) => {
        out += `<text x="${T(g.b.x + 1)}" y="${T(y + PC_RESERVE + i * (PC_RESERVE + 0.5))}"
            font-size="${T(PC_RESERVE)}" font-style="italic" fill="#8a90a0"
            font-family="${police}">${echapper(ligne)}</text>`;
    });
    y += g.hReserve;
    for (let i = 0; i < g.m.lignes; i++) {
        out += `<line x1="${T(g.b.x + 1)}" y1="${T(y + 4.6)}" x2="${T(g.b.x + g.b.w - 1)}"
            y2="${T(y + 4.6)}" stroke="#b0b6c5" stroke-width="${T(0.22)}"
            stroke-dasharray="${T(0.9)} ${T(0.9)}"/>`;
        if (solution && g.m.solution[i]) {
            out += `<text x="${T(g.b.x + 1.5)}" y="${T(y + 3.9)}" font-size="${T(2.6)}"
                font-weight="700" fill="#2b6cb0"
                font-family="${police}">${echapper(`${i + 1}. ${g.m.solution[i]}`)}</text>`;
        }
        y += PC_LIGNE;
    }
    return `<svg style="position:absolute; left:0; top:0; width:100%; height:100%;
        overflow:visible; pointer-events:none">${out}</svg>`;
}

function dessinerProgrammePdf(doc, item, slot, solution) {
    const g = geoProgramme(item, slot);
    const t = tracesProgramme(g);

    doc.setDrawColor(...ENCRE.trait);
    doc.setLineWidth(0.4);
    doc.setLineCap('round');
    t.traits.forEach(([a, b]) => doc.line(a.x, a.y, b.x, b.y));
    t.cercles.forEach(c => doc.circle(c.c.x, c.c.y, c.r, 'S'));
    doc.setLineCap('butt');

    doc.setLineWidth(0.35);
    doc.setLineCap('round');
    t.noms.forEach(n => {
        const c = PC_CROIX;
        doc.line(n.pt.x - c, n.pt.y - c, n.pt.x + c, n.pt.y + c);
        doc.line(n.pt.x - c, n.pt.y + c, n.pt.x + c, n.pt.y - c);
    });
    doc.setLineCap('butt');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...ENCRE.trait);
    t.noms.forEach(n => doc.text(n.t, n.x, n.y));

    let y = g.cadre.y + g.cadre.h + 2;
    if (g.reserve.length) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(PC_RESERVE * 2.83);       // millimètres → points
        doc.setTextColor(...ENCRE.gris);
        // Le PDF sait mesurer : on replie sur la vraie largeur plutôt que sur
        // l'estimation de l'aperçu.
        doc.splitTextToSize(g.m.reserve, g.b.w - 2).slice(0, g.reserve.length)
            .forEach((ligne, i) => doc.text(ligne, g.b.x + 1, y + PC_RESERVE + i * (PC_RESERVE + 0.5)));
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...ENCRE.trait);
    }
    y += g.hReserve;
    doc.setDrawColor(...ENCRE.grille);
    doc.setLineWidth(0.22);
    for (let i = 0; i < g.m.lignes; i++) {
        doc.setLineDashPattern([0.9, 0.9], 0);
        doc.line(g.b.x + 1, y + 4.6, g.b.x + g.b.w - 1, y + 4.6);
        doc.setLineDashPattern([], 0);
        if (solution && g.m.solution[i]) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.setTextColor(43, 108, 176);
            doc.text(`${i + 1}. ${g.m.solution[i]}`, g.b.x + 1.5, y + 3.9);
            doc.setTextColor(...ENCRE.trait);
        }
        y += PC_LIGNE;
    }
}

export const RENDUS_FIGURES = {
    'programme-construction': {
        titre: 'Écris le programme de construction',
        consigne: (items) => (items[0] && items[0].prompt && items[0].prompt.papier)
            || 'Écris le programme de construction de chaque figure.',
        previewGrille: programmePreviewHtml,
        pdfGrille: dessinerProgrammePdf,
        nomBloc: 'Figure', nomBlocs: 'figures',
        // DEUX PAR PAGE, ET C'EST LE SUJET. Une figure demande cinq à neuf
        // lignes d'écriture manuscrite : à quatre par page, la ligne tombe à
        // trois millimètres et l'on n'y écrit pas « le cercle de centre A
        // passant par B ». Ce qu'on travaille ici est la rédaction, pas le
        // nombre de figures.
        disposition: { cols: 2, rows: 2, maxCols: 2, maxRows: 3 },
        parLigneDefaut: 2,
        // Plus haut que large : le dessin en haut, les lignes dessous.
        proportions: { w: 1, h: 1.3 },
        titreAGauche: true
    },
    cercleVocabulaire: {
        titre: 'Le vocabulaire du cercle',
        // « LES LIGNES », au pluriel : une figure en porte maintenant deux ou
        // trois — voir `questions` dans le générateur.
        consigne: () => 'COMPLÈTE les lignes posées sous chaque figure, en donnant '
            + 'le nom LE PLUS PRÉCIS. Deux questions à se poser chaque fois : OÙ commence et '
            + 'où finit le tracé — au centre O ? sur le cercle ? de part et d\'autre ? — et '
            + 'est-il DROIT ou COURBE. Attention : un diamètre est bien une corde, mais il a '
            + 'un nom plus précis, et c\'est celui-là qu\'on attend.',
        previewGrille: cercleVocabulairePreviewHtml,
        pdfGrille: dessinerCercleVocabulairePdf,
        nomBloc: 'Figure', nomBlocs: 'figures',
        // Un peu plus haut que large : la ligne de réponse est sous la figure.
        proportions: { w: 1, h: 1.16 },
        // SIX PAR PAGE, ET NON NEUF. À neuf, le cercle tombe à quatre
        // centimètres et les numéros des tracés se marchent dessus : vérifié
        // sur l'aperçu. Une figure qu'on ne lit pas ne sert à rien.
        disposition: { cols: 3, rows: 2, maxCols: 4, maxRows: 4 },
        parLigneDefaut: 3
    },
    anglesNommer: {
        titre: 'Les angles remarquables — le nom de la relation',
        consigne: () => 'CLASSE LES ANGLES : dans chaque figure, comment s\'appellent les '
            + 'angles 1 et 2 ? Adjacents, opposés par le sommet, correspondants, '
            + 'alternes-internes, complémentaires ou supplémentaires. Donne le nom LE PLUS '
            + 'PRÉCIS. Les droites en pointillés sont parallèles, et les figures ne sont pas '
            + 'en vraie grandeur.',
        previewGrille: anglesNommerPreviewHtml,
        pdfGrille: dessinerAnglesNommerPdf,
        nomBloc: 'Figure', nomBlocs: 'figures',
        // Un peu plus haut que « la valeur manquante » : le nom écrit sous la
        // figure tient sur une ligne plus large qu'un « ? = 74° ».
        proportions: { w: 1, h: 1.1 },
        disposition: { cols: 3, rows: 3, maxCols: 4, maxRows: 4 },
        parLigneDefaut: 3
    },
    anglesManquants: {
        titre: 'Les angles remarquables — la valeur manquante',
        consigne: () => 'TROUVE LA MESURE DE L\'ANGLE VERT. Cherche d\'abord COMMENT les deux '
            + 'angles sont placés l\'un par rapport à l\'autre : opposés par le sommet, '
            + 'correspondants, alternes-internes, complémentaires ou supplémentaires. Les '
            + 'droites en pointillés sont parallèles, et les figures ne sont pas en vraie grandeur.',
        previewGrille: anglesManquantsPreviewHtml,
        pdfGrille: dessinerAnglesManquantsPdf,
        nomBloc: 'Figure', nomBlocs: 'figures',
        // Presque carré : une figure d'angles rayonne autour d'un point, et sa
        // ligne de réponse tient en une bande basse.
        proportions: { w: 1, h: 1.06 },
        disposition: { cols: 3, rows: 3, maxCols: 4, maxRows: 4 },
        parLigneDefaut: 3
    },
    notation: {
        titre: 'Segment, droite ou demi-droite',
        consigne: () => 'LE CROCHET EST UN MUR, LA PARENTHÈSE LAISSE FILER. [AB] s\'arrête aux '
            + 'deux croix, (AB) dépasse des deux côtés, et [AB) part de A — le premier point '
            + 'nommé — pour filer au-delà de B.',
        previewGrille: notationPreviewHtml,
        pdfGrille: dessinerNotationPdf,
        nomBloc: 'Figure', nomBlocs: 'figures',
        titreAGauche: true,
        // Large et bas : un trait horizontal, son énoncé au-dessus et sa ligne
        // d'écriture en dessous. Un carré lui laisserait la moitié en blanc.
        proportions: { w: 1, h: 0.52 },
        disposition: { cols: 2, rows: 4, maxCols: 3, maxRows: 5 },
        parLigneDefaut: 2
    },
    rectangle: {
        titre: 'Périmètre et aire',
        consigne: (items) => {
            const q = (items[0] && items[0].meta.quoi) || 'les-deux';
            const commun = 'Les dimensions sont écrites sur la figure. ';
            if (q === 'aire') return `${commun}Calcule l\'aire de chaque rectangle — la surface qu\'il couvre.`;
            if (q === 'perimetre') return `${commun}Calcule le périmètre de chaque rectangle — le tour de la figure.`;
            return `${commun}Pour chaque rectangle, calcule le PÉRIMÈTRE (le tour) puis l\'AIRE `
                + '(la surface). Les deux se demandent sur la même figure : c\'est en les faisant '
                + 'côte à côte qu\'on cesse de les confondre. Attention aux unités.';
        },
        previewGrille: rectanglePreviewHtml,
        pdfGrille: dessinerRectanglePdf,
        nomBloc: 'Rectangle',
        // Une figure basse et une ligne de réponse : le bloc n'a pas besoin
        // d'être haut. Trois rangées au lieu de deux, et jusqu'à quatre.
        disposition: { cols: 3, rows: 3, maxCols: 4, maxRows: 4 },
        proportions: { w: 1, h: 0.5 },
        parLigneDefaut: 3
    },
    triangle: {
        titre: 'Le tour du triangle',
        // Rémy : « énoncé pour le pdf : Calcule le périmètre des figures. » Sa
        // phrase d'abord, en tête et en clair ; le reste est ce qu'il faut
        // savoir pour lire la figure, et vient après.
        consigne: () => 'CALCULE LE PÉRIMÈTRE DES FIGURES — le tour, c\'est-à-dire les trois '
            + 'côtés mis bout à bout. Attention aux MARQUES : deux côtés qui portent la même '
            + 'marque ont la même longueur, et c\'est pour cela qu\'une seule mesure est '
            + 'écrite. Quand le périmètre est donné et qu\'un côté porte un « ? », c\'est ce '
            + 'côté qu\'on cherche.',
        previewGrille: trianglePreviewHtml,
        pdfGrille: dessinerTrianglePdf,
        nomBloc: 'Triangle',
        // Une figure et une ligne de réponse : même encombrement que le
        // rectangle, à ceci près qu'un triangle est plus haut que large.
        disposition: { cols: 3, rows: 3, maxCols: 4, maxRows: 4 },
        proportions: { w: 1, h: 0.75 },
        parLigneDefaut: 3
    },
    disque: {
        titre: 'Le périmètre et l\'aire du disque',
        consigne: (items) => {
            const exact = (items || []).some(it => DISQUE_EXACTES.includes((it.meta || {}).marche));
            const arrondi = (items || []).some(it => !DISQUE_EXACTES.includes((it.meta || {}).marche));
            // LA CONSIGNE NE DONNE PAS LA RÉPONSE D'UNE QUESTION DE LA FEUILLE.
            //
            // Le rappel « Périmètre = 2 × π × r, aire = π × r × r » aide à
            // CALCULER une valeur exacte, et c'est très bien quand c'est ce
            // qu'on demande. Mais la première étape du chapitre demande
            // justement LA FORMULE : quand elle est sur la même feuille, le
            // rappel est la réponse, imprimée trois centimètres plus haut.
            const demandeLaFormule = (items || []).some(it => (it.meta || {}).marche === 'formule');
            const commun = 'La mesure donnée est écrite sur la figure — regarde bien s\'il '
                + 's\'agit du RAYON ou du DIAMÈTRE. ';
            if (exact && !arrondi) {
                return `${commun}Donne la valeur EXACTE : on garde le π, on n\'arrondit pas.`
                    + (demandeLaFormule ? '' : ' Périmètre = 2 × π × r, aire = π × r × r.');
            }
            if (arrondi && !exact) {
                return `${commun}Donne la valeur ARRONDIE : le périmètre au dixième, l\'aire à `
                    + 'l\'unité. On arrondit à la toute fin, jamais avant.';
            }
            return `${commun}Quand on demande la valeur EXACTE, on garde le π ; quand on demande `
                + 'la valeur arrondie, on prend la calculatrice — le périmètre au dixième, '
                + 'l\'aire à l\'unité.';
        },
        previewGrille: disquePreviewHtml,
        pdfGrille: dessinerDisquePdf,
        // Rémy : « il y a trop d'espace entre les colonnes de disque du poly ».
        // Un disque et sa ligne de réponse ont une largeur propre, plus étroite
        // que l'emplacement dès que la hauteur bride — voir `serrerColonnes`.
        serrerColonnes: true,
        nomBloc: 'Disque',
        disposition: { cols: 3, rows: 3, maxCols: 4, maxRows: 4 },
        proportions: { w: 1, h: 0.8 },
        parLigneDefaut: 3
    },
    hexagrille: {
        titre: 'L\'Hexagrille',
        consigne: () => 'PLACE LES CHIFFRES DE 1 À 9, un par case, chacun une seule fois. '
            + 'Chaque flèche part d\'un nombre et désigne une FILE de cases : les chiffres '
            + 'de cette file doivent faire ce nombre-là. Les cases grisées sont déjà '
            + 'écrites. Commence par la file la plus courte — une somme sur deux cases ne '
            + 'laisse presque jamais le choix — et déduis de proche en proche : on ne '
            + 'devine jamais, chaque grille n\'a qu\'une solution.',
        previewGrille: hexagrillePreviewHtml,
        pdfGrille: dessinerHexagrillePdf,
        nomBloc: 'Grille', nomBlocs: 'grilles',
        titreAGauche: true,
        // Quatre par page : le losange est large — les étiquettes des montées
        // se posent loin sur la gauche — et sous quatre centimètres de côté on
        // n'écrit plus un chiffre dans un hexagone.
        disposition: { cols: 2, rows: 2, maxCols: 2, maxRows: 3 },
        parLigneDefaut: 2
    },
    angles: {
        titre: 'Mesurer et construire des angles',
        consigne: (items) => ((items[0] && items[0].meta.mode === 'construire')
            ? 'Un seul côté est tracé, et l\'angle à obtenir est écrit dessous. Pose ton '
                + 'rapporteur : le centre sur le sommet, le zéro sur le côté tracé. Marque la '
                + 'graduation demandée, puis trace le second côté à la règle.'
            : 'Mesure chaque angle avec ton rapporteur, puis écris sa mesure. Le centre du '
                + 'rapporteur va sur le SOMMET, et le zéro sur l\'un des deux côtés — c\'est à '
                + 'partir de ce zéro qu\'on lit, jamais l\'autre échelle.'),
        previewGrille: anglePreviewHtml,
        pdfGrille: dessinerAnglePdf,
        nomBloc: 'Angle',
        // QUATRE PAR PAGE. Un angle qu'on mesure au rapporteur de plastique
        // demande des côtés d'au moins cinq centimètres : plus court, l'erreur
        // de lecture vient de l'outil et non de l'élève.
        disposition: { cols: 2, rows: 2, maxCols: 3, maxRows: 3 },
        parLigneDefaut: 2
    },
    tangram: {
        titre: 'Le tangram',
        consigne: (items) => (items.some(i => i.meta && i.meta.quoi === 'decouper')
            ? 'Découpe le carré le long des traits : tu obtiens les sept pièces du '
                + 'tangram. Range-les dans une pochette — elles resserviront. Puis remplis '
                + 'chaque silhouette avec les SEPT pièces, sans trou ni chevauchement : on '
                + 'a le droit de les tourner, et le parallélogramme a le droit d\'être retourné.'
            : 'Remplis chaque silhouette avec les SEPT pièces de ton tangram, sans trou ni '
                + 'chevauchement. On a le droit de tourner les pièces, et le parallélogramme '
                + 'a le droit d\'être retourné.'),
        previewGrille: tangramPreviewHtml,
        pdfGrille: dessinerTangramPdf,
        nomBloc: 'Figure', nomBlocs: 'figures',
        // Le carré à découper veut de la place — on ne découpe pas au ciseau
        // dans quatre centimètres — et les silhouettes suivent la même taille.
        proportions: { w: 1, h: 1 },
        disposition: { cols: 3, rows: 2, maxCols: 4, maxRows: 3 },
        parLigneDefaut: 3
    },
    solides: {
        titre: 'Compter sur un solide',
        consigne: () => 'Compte les sommets, les arêtes et les faces de chaque solide, et '
            + 'écris les trois nombres dans le tableau. Les traits en POINTILLÉS sont les '
            + 'arêtes de derrière : on ne les voit pas, mais elles comptent. Pour te '
            + 'relire : sommets − arêtes + faces = 2, toujours.',
        previewGrille: solidesPreviewHtml,
        pdfGrille: dessinerSolidesPdf,
        // SIX PAR PAGE. Un solide qu'on doit compter à l'œil ne se dessine pas
        // en timbre-poste : sous quatre centimètres, deux arêtes voisines se
        // confondent et l'exercice devient un test de vue.
        disposition: { cols: 3, rows: 2, maxCols: 3, maxRows: 3 },
        parLigneDefaut: 3
    },
    relier: {
        titre: 'Relier les points',
        consigne: () => 'Relie les deux points de MÊME MARQUE par un chemin qui suit les cases, '
            + 'sans diagonale. Deux règles, et c\'est la seconde qui fait chercher : les chemins '
            + 'ne se croisent jamais, et à la fin il ne doit rester AUCUNE case vide. '
            + 'Commence par les coins : un coin n\'a que deux voisines, le chemin qui y passe '
            + 'est donc presque toujours obligé.',
        previewGrille: relierPreviewHtml,
        pdfGrille: dessinerRelierPdf,
        // QUATRE par page PAR DÉFAUT — on trace au crayon entre des cases, et
        // sous huit millimètres de côté le trait ne se corrige plus à la
        // gomme. Mais le plafond monte à cinq : sur une page couchée, ou pour
        // des grilles de 5 × 5, une planche de vingt tient très bien, et c'est
        // au professeur d'en juger devant l'aperçu.
        disposition: { cols: 2, rows: 2, maxCols: 5, maxRows: 5 },
        parLigneDefaut: 2
    },
    redaction: {
        titre: 'Rédiger un raisonnement',
        consigne: (items) => (items[0] && items[0].meta.propriete === 'perp-perp')
            ? 'Les deux angles droits sont donnés sur la figure. Justifie en trois lignes que les '
              + 'deux droites sont parallèles. Propriété : si deux droites sont perpendiculaires '
              + 'à une même troisième, alors elles sont parallèles entre elles.'
            : 'Les droites en pointillés sont parallèles. Justifie la perpendicularité '
              + 'demandée en trois lignes. Propriété : si deux droites sont parallèles, '
              + 'toute perpendiculaire à l\'une est perpendiculaire à l\'autre.',
        previewGrille: redactionPreviewHtml,
        pdfGrille: dessinerRedactionPdf,
        // Ce bloc n'est pas carré : il lui faut la largeur d'une colonne et la
        // hauteur d'une figure plus SEPT lignes d'écriture — deux pour « Je
        // sais que », trois pour « Or » (qui porte la propriété du cours), deux
        // pour « Donc ». À 0,72 les interlignes se serraient au point qu'on ne
        // pouvait plus écrire entre deux pointillés.
        proportions: { w: 1, h: 0.88 },
        // DEUX PAR LIGNE, et pas ce que la largeur permettrait. Une grille se
        // contente d'être lisible ; ici l'élève doit ÉCRIRE trois phrases sur
        // la ligne, dont la propriété du cours en entier. À trois par ligne,
        // il reste cinq centimètres par phrase.
        //
        // `parLigneDefaut` ne réglait que la fiche composée : la fenêtre
        // d'impression, elle, restait sur son 3 × 4 d'usine et servait douze
        // rédactions par page, à onze pixels d'interligne. La disposition le
        // dit maintenant aussi — six par page, et de quoi écrire entre les
        // pointillés.
        disposition: { cols: 2, rows: 3, maxCols: 2, maxRows: 4 },
        parLigneDefaut: 2
    },
};
