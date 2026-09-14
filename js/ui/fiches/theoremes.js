// PYTHAGORE, THALÈS, TRIGONOMÉTRIE — les théorèmes et leur rédaction.
//
// Une tranche de `printSheet.js`, découpée par `tools/decouperPrintSheet.mjs`.
// Tout ce qui est ici n'est utilisé QUE par les exercices de cette famille ;
// ce qui sert à plusieurs vit dans `socle.js`.

import {
    ENCRE, POINTE, boiteDe, couperEnLignes, echapper, echapperSheet,
    largeurTrigo, unite
} from './socle.js';
import { ECART_NOM, ancrageNom, placeNoms } from '../../core/thales.js';
import { LIGNES_CADRE as LIGNES_CADRE_Q } from '../../core/generators/thalesRedactionFiche.js';
import { cotesDe as cotesDePythagore, etapesCalcul as etapesCalculPythagore, ligneEnTexte as ligneEnTextePythagore } from '../../core/pythagore.js';
import { encre, pourPdf } from '../ficheRendu.js';
import { pointsDe as pointsDeTrigo } from '../../core/trigonometrie.js';
import { trame as trameRaisonnement } from '../../core/raisonnement.js';

// --- LE THÉORÈME DE PYTHAGORE, RÉDIGÉ ----------------------------------------
//
// « Je sais que… Or… Donc… » : c'est la rédaction du cahier, et c'est elle
// qu'on note. Une fiche de Pythagore qui aligne vingt énoncés et se corrige par
// un nombre n'apprend pas à la produire — Rémy : « rédaction Je sais que / Or /
// Donc avec les bons symboles, texte OU schéma au choix, place pour rédiger ».
//
// Chaque bloc porte donc l'énoncé — en toutes lettres ou en figure codée —, les
// trois amorces imprimées en gris, et des lignes pour écrire dessous. La feuille
// de solutions remplit exactement les mêmes lignes.

// LES MÊMES AMORCES QUE PARTOUT. Elles s'écrivaient ici « Je sais que » sans
// deux-points et en gris, et sur la fiche des droites « Je sais que : » en noir
// — deux présentations pour un seul schéma, donc deux choses à reconnaître pour
// l'élève au lieu d'une. Le moteur commun porte les mots, le deux-points et la
// couleur ; ce chapitre garde SA place.
//
// C'EST LE « OR » QUI EST LONG, PAS LE « DONC ». Rémy : « le Or doit être plus
// long et le donc en une seule ligne. » On avait fait l'inverse — deux lignes
// pour le Or, quatre pour le Donc — en croyant que le calcul appartenait à la
// conclusion. Il appartient au raisonnement : le « Or » porte le théorème
// écrit en entier POUR ce triangle, la substitution et le calcul ; le « Donc »
// ne dit qu'une chose, « EF = 12 cm », et trois lignes vides sous elle ne font
// qu'un blanc au bas de chaque bloc.
//
// SIX LIGNES ET NON CINQ : quand on cherche un CÔTÉ de l'angle droit, le
// calcul en compte six — l'égalité, l'isolement du côté cherché, la
// substitution, les deux carrés, la somme, la racine. Avec cinq, la dernière
// tombait dans le vide, et c'était justement celle qui donne la réponse.
const AMORCES = trameRaisonnement([2, 6, 1]);

/** L'énoncé en toutes lettres, tel que le générateur l'écrit pour le papier. */
const enoncePythagore = (item) =>
    (item.prompt && (item.prompt.papier || item.prompt.text)) || '';

// --- THALÈS SUR PAPIER ----------------------------------------------------------
//
// Rémy : « Un exercice sur le théorème de Thalès. » Un chapitre de géométrie se
// travaille sur une feuille : la figure d'un côté, la question et la place
// d'écrire de l'autre.
//
// LA FIGURE EST INDISPENSABLE, ET C'EST CE QUI OBLIGE À UN RENDU. Sans elle,
// « quelle est la configuration de cette figure ? » n'est pas une question :
// c'est une devinette. Les coordonnées viennent du même calcul qu'à l'écran
// (core/thales.js), donc les deux dessins ne peuvent pas diverger.
//
// LA FIGURE N'EST PAS À L'ÉCHELLE, comme dans tous les manuels : à l'échelle,
// elle se mesurerait à la règle et l'élève cesserait d'appliquer le théorème.
// Seul le RAPPORT est respecté — c'est lui qu'on doit voir.

function geoThalesFiche(item, slot) {
    const m = item.meta;
    const b = boiteDe(slot);
    const corps = Math.max(2.2, Math.min(b.h * 0.1, 3.2));
    // La figure à gauche, l'énoncé et les lignes à droite.
    const figW = Math.min(b.w * 0.34, b.h * 0.95);
    const P = m.points;
    const xs = Object.values(P).map(p => p.x), ys = Object.values(P).map(p => p.y);
    const x0 = Math.min(...xs) - 10, x1 = Math.max(...xs) + 10;
    const y0 = Math.min(...ys) - 10, y1 = Math.max(...ys) + 10;
    // Une seule échelle pour les deux axes : une figure étirée ne serait plus
    // la figure, et le papillon n'aurait plus ses deux triangles semblables.
    const e = Math.min(figW / (x1 - x0), (b.h - corps) / (y1 - y0));
    const versX = (x) => b.x + (x - x0) * e + (figW - (x1 - x0) * e) / 2;
    const versY = (y) => b.y + corps * 0.4 + (y - y0) * e;
    return {
        m, b, corps, figW, versX, versY, e,
        texteX: b.x + figW + 3, texteW: b.w - figW - 4
    };
}

/** Les cinq points nommés, et les segments à tracer. */
const SEGMENTS_THALES = [['A', 'B'], ['A', 'C'], ['A', 'E'], ['A', 'D']];

/**
 * L'ÉGALITÉ DES TROIS RAPPORTS, EN POINTILLÉS, PRÊTE À REMPLIR.
 *
 * Rémy : « sous le texte, écris l'égalité de fraction en pointillé :
 * ..../.... = ..../.... = ..../....  Les fractions en colonne. »
 *
 * Il y avait trois lignes de pointillés, et ce n'est pas la même chose. UNE
 * LIGNE NE DIT PAS CE QU'ON ATTEND : l'élève y écrit ce qu'il veut, souvent
 * « AD/AB = AE/AC » à plat, parfois un calcul, parfois rien. Le squelette,
 * lui, POSE LA FORME de la réponse — trois fractions, deux signes égal — et
 * ne laisse à remplir que ce qui s'apprend : QUELLE longueur va au numérateur
 * et laquelle au dénominateur.
 *
 * Et les fractions sont EN COLONNE, numérateur au-dessus du trait : c'est
 * l'écriture du cours et celle du tableau. « AD/AB » écrit à plat se relit mal
 * et se confond avec une division ; posée en colonne, la fraction montre le
 * rapport qu'elle est.
 *
 * @returns {{barres:Array, pointilles:Array, egaux:Array, bas:number}}
 */
function egaliteThalesTraces(g, y0) {
    const c = g.corps;
    const wEq = c * 2.4;
    const wF = Math.max(6, (g.texteW - 2 * wEq) / 3);
    const wBarre = wF * 0.74;
    const yBarre = y0 + c * 1.7;
    const barres = [], pointilles = [], egaux = [];
    for (let i = 0; i < 3; i++) {
        const cx = g.texteX + i * (wF + wEq) + wF / 2;
        barres.push({ x1: cx - wBarre / 2, x2: cx + wBarre / 2, y: yBarre });
        pointilles.push({ x1: cx - wBarre / 2, x2: cx + wBarre / 2, y: yBarre - c * 1.25 });
        pointilles.push({ x1: cx - wBarre / 2, x2: cx + wBarre / 2, y: yBarre + c * 1.25 });
        if (i < 2) egaux.push({ x: cx + wF / 2 + wEq / 2, y: yBarre });
    }
    return { barres, pointilles, egaux, bas: yBarre + c * 2.1 };
}

/**
 * OÙ ÉCRIRE CHAQUE LETTRE, EN MILLIMÈTRES DE FEUILLE.
 *
 * Rémy : « Les lettres se supperpose aux trait. Ne met pas de rond pour le
 * point. » Le défaut était le même à l'écran et sur le papier, et pour la même
 * raison : cinq décalages écrits à la main (« A en haut à droite, B en bas à
 * gauche ») justes pour UNE figure, alors que la figure change à chaque
 * question. La règle est maintenant géométrique et PARTAGÉE — `placeNoms`
 * cherche le plus grand secteur libre autour du point —, donc les deux dessins
 * ne peuvent pas diverger, ce qui est toute la raison d'être de cette figure
 * commune.
 *
 * @returns {Array<{nom, x, y, align}>} de quoi écrire les cinq lettres.
 */
function nomsThales(g, X, Y, taille) {
    const dirs = placeNoms(g.m.points);
    // L'écart est donné dans le carré de 100 de la figure ; ici on est en
    // millimètres, et `g.e` est justement le facteur d'échelle entre les deux.
    const ecart = Math.max(1.6, ECART_NOM * g.e);
    return ['A', 'B', 'C', 'E', 'D'].map(nom => {
        const d = dirs[nom], a = ancrageNom(d);
        return {
            nom,
            x: X(nom) + d.x * ecart,
            y: Y(nom) + d.y * ecart + (a.v > 0 ? 0.78 : a.v < 0 ? -0.06 : 0.32) * taille,
            align: a.h > 0 ? 'left' : a.h < 0 ? 'right' : 'center'
        };
    });
}

function thalesPreviewHtml(item, slot, k) {
    const g = geoThalesFiche(item, slot);
    const T = (v) => (v * k).toFixed(2);
    const P = g.m.points;
    let html = '';
    const trait = (a, b, cls) => {
        html += `<div class="fx-th-trait ${cls}" style="left:${T(g.versX(P[a].x))}px;
            top:${T(g.versY(P[a].y))}px;
            width:${T(Math.hypot(g.versX(P[b].x) - g.versX(P[a].x),
        g.versY(P[b].y) - g.versY(P[a].y)))}px;
            transform:rotate(${Math.atan2(g.versY(P[b].y) - g.versY(P[a].y),
        g.versX(P[b].x) - g.versX(P[a].x))}rad)"></div>`;
    };
    SEGMENTS_THALES.forEach(([a, b]) => trait(a, b, 'fx-th-droite'));
    trait('B', 'C', 'fx-th-base');
    trait('D', 'E', 'fx-th-para');
    // Plus de disque noir sur les points : « Ne met pas de rond pour le point. »
    // Un point de géométrie se nomme, il ne se colorie pas — c'est le
    // croisement des traits, et c'est déjà visible.
    const taille = g.corps * 0.95;
    nomsThales(g, (n) => g.versX(P[n].x), (n) => g.versY(P[n].y), taille)
        .forEach(({ nom, x, y, align }) => {
            // L'aperçu pose ses boîtes par le coin haut-gauche : on rend
            // l'ancrage en décalant d'une demi-largeur ou d'une largeur
            // entière, puisqu'une div n'a pas de `text-anchor`.
            const large = taille * 0.62;
            const gx = align === 'left' ? x : align === 'right' ? x - large : x - large / 2;
            html += `<div class="fx-th-nom" style="left:${T(gx)}px;
                top:${T(y - taille * 0.78)}px; width:${T(large)}px;
                text-align:center; font-size:${T(taille)}px">${nom}</div>`;
        });
    html += `<div class="fx-th-enonce" style="left:${T(g.texteX)}px; top:${T(g.b.y)}px;
        width:${T(g.texteW)}px; font-size:${T(g.corps)}px">${echapperSheet(item.prompt.papier)}</div>`;
    // L'ÉGALITÉ À REMPLIR, quand c'est elle qu'on demande — voir
    // `egaliteThalesTraces`. La réciproque, elle, se justifie en phrases : on
    // lui laisse ses lignes.
    const avecEgalite = g.m.etape === 'egalite' || g.m.etape === 'calculer';
    if (avecEgalite) {
        const e = egaliteThalesTraces(g, g.b.y + g.b.h * 0.40);
        e.pointilles.forEach(l => {
            html += `<div class="fx-th-ligne" style="left:${T(l.x1)}px; top:${T(l.y)}px;
                width:${T(l.x2 - l.x1)}px"></div>`;
        });
        e.barres.forEach(l => {
            html += `<div style="position:absolute; left:${T(l.x1)}px; top:${T(l.y)}px;
                width:${T(l.x2 - l.x1)}px; height:${Math.max(1, 0.35 * k)}px;
                background:#1a202c"></div>`;
        });
        e.egaux.forEach(p => {
            html += `<div style="position:absolute; left:${T(p.x - g.corps)}px;
                top:${T(p.y - g.corps * 0.75)}px; width:${T(g.corps * 2)}px;
                text-align:center; font-size:${T(g.corps * 1.15)}px; font-weight:700;
                color:#1a202c">=</div>`;
        });
        // Pour « calcule AD », une ligne de plus sous l'égalité : c'est là que
        // le produit en croix se pose.
        if (g.m.etape === 'calculer') {
            [0, 1].forEach(i => {
                html += `<div class="fx-th-ligne" style="left:${T(g.texteX)}px;
                    top:${T(e.bas + i * g.corps * 1.9)}px; width:${T(g.texteW)}px"></div>`;
            });
        }
        return html;
    }
    // Les lignes pour rédiger : c'est là que Thalès se note.
    for (let i = 0; i < 3; i++) {
        const y = g.b.y + g.b.h * 0.42 + i * (g.b.h * 0.18);
        html += `<div class="fx-th-ligne" style="left:${T(g.texteX)}px; top:${T(y)}px;
            width:${T(g.texteW)}px"></div>`;
    }
    return html;
}

function dessinerThalesPdf(doc, item, slot, solution) {
    const g = geoThalesFiche(item, slot);
    const P = g.m.points;
    const X = (n) => g.versX(P[n].x), Y = (n) => g.versY(P[n].y);

    doc.setLineWidth(0.3);
    doc.setDrawColor(...ENCRE.gris);
    SEGMENTS_THALES.forEach(([a, b]) => doc.line(X(a), Y(a), X(b), Y(b)));
    // Les deux parallèles ressortent : ce sont elles, le théorème.
    doc.setLineWidth(0.6);
    doc.setDrawColor(...ENCRE.trait);
    doc.line(X('B'), Y('B'), X('C'), Y('C'));
    doc.line(X('D'), Y('D'), X('E'), Y('E'));

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(g.corps * 0.95 / 0.3528);
    doc.setTextColor(...ENCRE.trait);
    // Le rond a disparu ici comme à l'écran, et la lettre se place au même
    // endroit qu'à l'écran : `nomsThales` rend l'alignement, jsPDF le comprend.
    nomsThales(g, X, Y, g.corps * 0.95)
        .forEach(({ nom, x, y, align }) => doc.text(nom, x, y, { align }));

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(g.corps / 0.3528);
    doc.setTextColor(...ENCRE.texte);
    const lignes = doc.splitTextToSize(pourPdf(item.prompt.papier), g.texteW);
    lignes.slice(0, 4).forEach((l, i) => doc.text(l, g.texteX, g.b.y + g.corps * (1 + i * 1.15)));

    // Les lignes de rédaction, ou la correction.
    if (!solution) {
        const avecEgalite = g.m.etape === 'egalite' || g.m.etape === 'calculer';
        doc.setDrawColor(...ENCRE.grille);
        doc.setLineWidth(0.2);
        if (doc.setLineDashPattern) doc.setLineDashPattern([1, 1], 0);
        if (avecEgalite) {
            // Le squelette de l'égalité — les mêmes traits qu'à l'aperçu.
            const e = egaliteThalesTraces(g, g.b.y + g.b.h * 0.40);
            e.pointilles.forEach(l => doc.line(l.x1, l.y, l.x2, l.y));
            if (g.m.etape === 'calculer') {
                [0, 1].forEach(i => doc.line(g.texteX, e.bas + i * g.corps * 1.9,
                    g.texteX + g.texteW, e.bas + i * g.corps * 1.9));
            }
            if (doc.setLineDashPattern) doc.setLineDashPattern([], 0);
            doc.setDrawColor(...ENCRE.trait);
            doc.setLineWidth(0.35);
            e.barres.forEach(l => doc.line(l.x1, l.y, l.x2, l.y));
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(g.corps * 1.15 / 0.3528);
            doc.setTextColor(...ENCRE.trait);
            e.egaux.forEach(p => doc.text('=', p.x, p.y + g.corps * 0.4, { align: 'center' }));
            return;
        }
        for (let i = 0; i < 3; i++) {
            const y = g.b.y + g.b.h * 0.42 + i * (g.b.h * 0.18);
            doc.line(g.texteX, y, g.texteX + g.texteW, y);
        }
        if (doc.setLineDashPattern) doc.setLineDashPattern([], 0);
        return;
    }
    doc.setTextColor(47, 133, 90);
    doc.setFontSize(g.corps * 0.92 / 0.3528);
    doc.splitTextToSize(pourPdf(item.explanation), g.texteW).slice(0, 5)
        .forEach((l, i) => doc.text(l, g.texteX, g.b.y + g.b.h * 0.42 + i * g.corps * 1.2));
}

function geoPythagoreFiche(item, slot) {
    const b = slot.boite || { x: slot.x, y: slot.y, w: slot.taille, h: slot.taille };
    // TROIS PRÉSENTATIONS : le texte seul, la figure seule, ou les deux.
    const presentation = item.meta.presentation;
    const lesDeux = presentation === 'les-deux';
    const schema = presentation === 'schema' || lesDeux;
    const gaucheW = b.w * 0.32;
    const corps = Math.max(2.2, Math.min(b.h * 0.072, 3.3));
    const nLignes = AMORCES.reduce((s, a) => s + a.lignes, 0);
    const pas = Math.max(3.4, (b.h - AMORCES.length * corps * 1.35) / nLignes);
    // LA FIGURE A BESOIN DE SES MARGES. Une longueur s'écrit À CÔTÉ du côté
    // qu'elle mesure, la lettre d'un sommet À CÔTÉ du sommet, et la question
    // SOUS le tout : sans ces bandes réservées, « Calcule LM. » venait se poser
    // sur le sommet du bas et sur la longueur de la base.
    const gaucheMarge = corps * 3.2;             // les longueurs portées à gauche
    const basMarge = corps * 3.4;                // la base, sa mesure, puis la question
    // AVEC LES DEUX, L'ÉNONCÉ PREND LE HAUT ET LA FIGURE CE QUI RESTE. Le texte
    // se lit d'abord, la figure le traduit — c'est l'ordre du geste qu'on
    // demande. On lui réserve trois lignes de corps : un énoncé de Pythagore
    // tient en deux, trois par prudence.
    // Trois lignes d'énoncé, plus la hauteur de la lettre du sommet du HAUT,
    // qui se pose au-dessus du triangle : sans elle, le « P » venait s'écrire
    // dans la dernière ligne de l'énoncé.
    // ET QUAND LES DEUX NE TIENNENT PAS, C'EST LA FIGURE QUI RESTE.
    //
    // Rémy, sur le PDF : l'énoncé et le triangle s'imprimaient l'un sur
    // l'autre — « Le triangle RST est rectangle en T, avec RS = 13 cm et
    // ST = 12 cm. Calcule RT, en cm. » traversé par le dessin. « Fais soit la
    // figure, soit l'énoncé, mais n'oublie pas de demander ce que l'on
    // calcule. »
    //
    // MESURÉ : on réservait CINQ lignes au texte. Dans la colonne de gauche
    // d'un bloc à deux par ligne — trente-deux pour cent d'un demi-page, soit
    // vingt-neuf millimètres —, cet énoncé-là en prend six. La sixième tombait
    // donc dans la figure, et la figure sur elle.
    //
    // On compte maintenant les lignes au lieu de les supposer. Si ce qui reste
    // ne fait plus une figure — vingt-deux millimètres, en dessous desquels un
    // triangle coté n'est plus lisible —, le texte s'efface et la figure
    // reste : elle porte les longueurs, l'angle droit, le « ? », et la ligne
    // « Calcule … » qui dit ce qu'on cherche. Rien n'est perdu, et le réglage
    // « Le texte ET la figure » garde son sens partout où la place existe.
    const lignesEnonce = lesDeux
        ? couperEnLignes(enoncePythagore(item), Math.max(10, gaucheW / (corps * 0.5)), corps).length
        : 0;
    const voulu = lignesEnonce ? (lignesEnonce + 2) * corps : 0;
    const FIGURE_MIN = 22;
    const tientLesDeux = lesDeux
        && b.h - corps * 0.9 - voulu - basMarge >= FIGURE_MIN;
    const avecTexte = lesDeux && tientLesDeux;
    const hautTexte = avecTexte ? voulu : 0;
    return {
        b, schema, lesDeux: avecTexte, gaucheW, corps, pas,
        figX: b.x + gaucheMarge, figY: b.y + corps * 0.9 + hautTexte,
        figW: Math.max(6, gaucheW - gaucheMarge - corps * 1.6),
        figH: Math.max(6, b.h - corps * 0.9 - hautTexte - basMarge),
        questionY: b.y + b.h - corps * 0.5,
        droiteX: b.x + gaucheW + 3, droiteW: b.w - gaucheW - 3
    };
}

/** Les trois sommets du triangle, à l'échelle, dans l'ordre de `t.sommets`. */
function pointsTriangle(item, larg, haut) {
    const t = item.meta.triangle;
    const [a, b] = t.triplet;
    const droit = t.angleDroit;
    const autres = [0, 1, 2].filter(i => i !== droit);
    const s = Math.min(larg / a, haut / b);
    const P = [];
    P[droit] = [0, haut];
    P[autres[0]] = [a * s, haut];
    P[autres[1]] = [0, haut - b * s];
    return { P, droit, autres, s };
}

/**
 * Ce que porte chaque côté de la figure : la longueur connue, ou le « ? » du
 * côté cherché. C'est le codage d'une figure d'énoncé — sans lui, le dessin ne
 * dit rien de plus que trois traits.
 */
function cotesCodes(item) {
    const t = item.meta.triangle;
    const { hypo, cathetes } = cotesDePythagore(t);
    const cherche = item.meta.chercher || hypo.nom;
    const dit = (c) => (c.nom === cherche ? '?' : `${c.longueur} cm`);
    return { hypo: { ...hypo, texte: dit(hypo) }, cathetes: cathetes.map(c => ({ ...c, texte: dit(c) })) };
}

function pythagorePreviewHtml(item, slot, k, solution) {
    const g = geoPythagoreFiche(item, slot);
    const b = g.b;
    const T = (v) => (v * k).toFixed(2);
    let html = '';

    // À gauche : la figure codée, ou l'énoncé en toutes lettres.
    if (g.schema) {
        const { P, droit, autres } = pointsTriangle(item, g.figW, g.figH);
        const X = (i) => g.figX + P[i][0];
        const Y = (i) => g.figY + P[i][1];
        const t = item.meta.triangle;
        const codes = cotesCodes(item);
        const cote = (i, j) => {
            const nom = [t.sommets[i], t.sommets[j]].join('');
            const inv = [t.sommets[j], t.sommets[i]].join('');
            const tous = [codes.hypo, ...codes.cathetes];
            const c = tous.find(x => x.nom === nom || x.nom === inv);
            return c ? c.texte : '';
        };
        const carre = Math.min(3.2, g.corps);
        html += `<svg class="fx-py-svg" style="left:0; top:0; width:100%; height:100%">
            <polygon points="${[droit, autres[0], autres[1]].map(i => `${T(X(i))},${T(Y(i))}`).join(' ')}"
                fill="none" stroke="#1a202c" stroke-width="${T(0.45)}"/>
            <polyline points="${T(X(droit) + carre)},${T(Y(droit))}
                ${T(X(droit) + carre)},${T(Y(droit) - carre)} ${T(X(droit))},${T(Y(droit) - carre)}"
                fill="none" stroke="#1a202c" stroke-width="${T(0.3)}"/></svg>`;
        // Les lettres des sommets, puis ce que porte chaque côté.
        const etiq = (x, y, texte, cls) => `<div class="fx-py-etiq${cls || ''}"
            style="left:${T(x)}px; top:${T(y)}px; font-size:${T(g.corps)}px">${echapperSheet(texte)}</div>`;
        html += etiq(X(droit) - g.corps * 1.4, Y(droit) + g.corps * 0.15, t.sommets[droit]);
        html += etiq(X(autres[0]) + g.corps * 0.35, Y(autres[0]) + g.corps * 0.15, t.sommets[autres[0]]);
        html += etiq(X(autres[1]) - g.corps * 1.4, Y(autres[1]) - g.corps * 1.15, t.sommets[autres[1]]);
        html += etiq((X(droit) + X(autres[0])) / 2 - g.corps, Y(droit) + g.corps * 0.9,
            cote(droit, autres[0]), ' fx-py-etiq--mesure');
        html += etiq(b.x, (Y(droit) + Y(autres[1])) / 2 - g.corps * 0.5,
            cote(droit, autres[1]), ' fx-py-etiq--mesure');
        html += etiq((X(autres[0]) + X(autres[1])) / 2 + g.corps * 0.2,
            (Y(autres[0]) + Y(autres[1])) / 2 - g.corps * 1.3,
            cote(autres[0], autres[1]), ' fx-py-etiq--mesure');
    }
    // L'énoncé : en haut quand il accompagne la figure, en bas — réduit à
    // « Calcule … » — quand la figure porte tout, à sa place habituelle quand
    // il est seul.
    html += `<div class="fx-py-enonce" style="left:${T(b.x)}px;
        top:${T(g.lesDeux || !g.schema ? b.y : g.questionY - g.corps)}px;
        width:${T(g.gaucheW)}px; font-size:${T(g.corps)}px">${echapperSheet(
        g.schema && !g.lesDeux
            ? `Calcule ${item.meta.chercher || cotesDePythagore(item.meta.triangle).hypo.nom}.`
            : enoncePythagore(item))}</div>`;

    // À droite : les trois amorces et leurs lignes.
    const rempli = solution ? redactionPapier(item) : null;
    let y = b.y;
    AMORCES.forEach((a, iA) => {
        html += `<div class="fx-py-amorce" style="left:${T(g.droiteX)}px; top:${T(y)}px;
            font-size:${T(g.corps)}px; color:${a.couleur}">${a.amorce}</div>`;
        y += g.corps * 1.35;
        for (let i = 0; i < a.lignes; i++) {
            const texte = rempli ? (rempli[iA][i] || '') : '';
            html += `<div class="fx-py-ligne" style="left:${T(g.droiteX)}px; top:${T(y + g.pas * 0.82)}px;
                width:${T(g.droiteW)}px"></div>`;
            if (texte) {
                html += `<div class="fx-py-ecrit" style="left:${T(g.droiteX + 2)}px;
                    top:${T(y + g.pas * 0.12)}px; width:${T(g.droiteW - 2)}px;
                    font-size:${T(g.corps)}px">${echapperSheet(texte)}</div>`;
            }
            y += g.pas;
        }
    });
    return html;
}

/**
 * LA CORRECTION, ZONE PAR ZONE — ET QUI CALCULE AU LIEU DE RÉCITER.
 *
 * Rémy : « la correction du théorème de Pythagore n'est pas bonne. Ne récite
 * pas le théorème, fais les calculs détaillés. » Elle faisait exactement
 * l'inverse. Le « Or » portait la phrase du cours — « dans un triangle
 * rectangle, le carré de l'hypoténuse est égal à la somme des carrés des deux
 * autres côtés » —, deux lignes que l'élève a déjà dans sa leçon et qui ne lui
 * apprennent rien sur SON triangle. Et les six étapes du calcul, elles,
 * étaient versées dans le « Donc », qui n'a QU'UNE ligne : cinq d'entre elles
 * — dont celle qui donne la réponse — n'étaient tout simplement pas imprimées.
 * La feuille de solutions ne montrait donc aucun calcul.
 *
 * Le calcul remonte donc dans le « Or », là où il appartient : le théorème
 * écrit POUR ce triangle, la substitution, les carrés, la somme, la racine —
 * une étape par ligne, comme au tableau. Le « Donc » redevient ce qu'il est,
 * la conclusion en une ligne.
 */
function redactionPapier(item) {
    const t = item.meta.triangle;
    const chercher = item.meta.chercher;
    const { hypo, cathetes } = cotesDePythagore(t);
    const calc = etapesCalculPythagore(t, chercher);
    const donnees = chercher && chercher !== hypo.nom
        ? [`${hypo.nom} = ${hypo.longueur} cm`,
            `${cathetes.find(x => x.nom !== chercher).nom} = ${cathetes.find(x => x.nom !== chercher).longueur} cm`]
        : [`${cathetes[0].nom} = ${cathetes[0].longueur} cm`,
            `${cathetes[1].nom} = ${cathetes[1].longueur} cm`];
    return [
        [`le triangle ${t.nom} est rectangle en ${t.sommets[t.angleDroit]},`,
            `avec ${donnees.join(' et ')}.`],
        calc.lignes.map(ligneEnTextePythagore),
        [`${calc.cherche} = ${calc.resultat} cm.`]
    ];
}

function dessinerPythagorePdf(doc, item, slot, solution) {
    const g = geoPythagoreFiche(item, slot);
    const b = g.b;

    if (g.schema) {
        const { P, droit, autres } = pointsTriangle(item, g.figW, g.figH);
        const X = (i) => g.figX + P[i][0];
        const Y = (i) => g.figY + P[i][1];
        const t = item.meta.triangle;
        const codes = cotesCodes(item);
        const cote = (i, j) => {
            const nom = [t.sommets[i], t.sommets[j]].join('');
            const inv = [t.sommets[j], t.sommets[i]].join('');
            const c = [codes.hypo, ...codes.cathetes].find(x => x.nom === nom || x.nom === inv);
            return c ? c.texte : '';
        };
        doc.setDrawColor(...ENCRE.trait);
        doc.setLineWidth(0.45);
        doc.lines([
            [X(autres[0]) - X(droit), Y(autres[0]) - Y(droit)],
            [X(autres[1]) - X(autres[0]), Y(autres[1]) - Y(autres[0])],
            [X(droit) - X(autres[1]), Y(droit) - Y(autres[1])]
        ], X(droit), Y(droit), [1, 1], 'S', true);
        // Le petit carré de l'angle droit : sans lui, la figure ne code rien.
        const c = Math.min(3.2, g.corps);
        doc.setLineWidth(0.3);
        doc.line(X(droit) + c, Y(droit), X(droit) + c, Y(droit) - c);
        doc.line(X(droit) + c, Y(droit) - c, X(droit), Y(droit) - c);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(g.corps / 0.3528);
        doc.setTextColor(...ENCRE.trait);
        doc.text(t.sommets[droit], X(droit) - g.corps * 0.4, Y(droit) + g.corps, { align: 'right' });
        doc.text(t.sommets[autres[0]], X(autres[0]) + g.corps * 0.3, Y(autres[0]) + g.corps);
        doc.text(t.sommets[autres[1]], X(autres[1]) - g.corps * 0.4, Y(autres[1]) - g.corps * 0.3, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...ENCRE.texte);
        doc.text(pourPdf(cote(droit, autres[0])), (X(droit) + X(autres[0])) / 2,
            Y(droit) + g.corps * 2, { align: 'center' });
        doc.text(pourPdf(cote(droit, autres[1])), b.x,
            (Y(droit) + Y(autres[1])) / 2 + g.corps * 0.35);
        doc.text(pourPdf(cote(autres[0], autres[1])),
            (X(autres[0]) + X(autres[1])) / 2 + g.corps * 0.4,
            (Y(autres[0]) + Y(autres[1])) / 2 - g.corps * 0.3);
    }

    // L'énoncé : la question sous la figure, ou le texte entier à gauche.
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(g.corps / 0.3528);
    doc.setTextColor(...ENCRE.texte);
    const enonce = g.schema
        ? `Calcule ${item.meta.chercher || cotesDePythagore(item.meta.triangle).hypo.nom}.`
        : enoncePythagore(item);
    doc.text(doc.splitTextToSize(pourPdf(enonce), g.gaucheW - 2), b.x,
        g.schema ? g.questionY : b.y + g.corps);

    // Les trois amorces, et les lignes où l'on écrit.
    const rempli = solution ? redactionPapier(item) : null;
    let y = b.y;
    AMORCES.forEach((a, iA) => {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...a.rgb);
        doc.setFontSize(g.corps / 0.3528);
        doc.text(pourPdf(a.amorce), g.droiteX, y + g.corps);
        y += g.corps * 1.35;
        for (let i = 0; i < a.lignes; i++) {
            doc.setDrawColor(...ENCRE.grille);
            doc.setLineWidth(0.2);
            doc.line(g.droiteX, y + g.pas * 0.82, g.droiteX + g.droiteW, y + g.pas * 0.82);
            const texte = rempli ? (rempli[iA][i] || '') : '';
            if (texte) {
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(...ENCRE.texte);
                ecrireAvecRacines(doc, texte, g.droiteX + 1.5, y + g.pas * 0.66, g.corps);
            }
            y += g.pas;
        }
    });
}

/**
 * Le texte d'une ligne de rédaction, RACINES COMPRISES. Les polices standard
 * d'un PDF ne connaissent pas « √ » — il en sortait un « V », et « V225 » n'est
 * pas ce qu'on demande d'écrire. On trace donc le radical : la potence et sa
 * barre au-dessus du nombre.
 */
function ecrireAvecRacines(doc, texte, x0, y, corps) {
    let x = x0;
    for (const morceau of String(texte).split(/(√\d+)/)) {
        if (!morceau) continue;
        const rac = /^√(\d+)$/.exec(morceau);
        if (!rac) { doc.text(pourPdf(morceau), x, y); x += doc.getTextWidth(pourPdf(morceau)); continue; }
        const n = rac[1];
        const w = doc.getTextWidth(n);
        const h = corps * 0.72;
        doc.setLineWidth(Math.max(0.15, corps * 0.05));
        doc.setDrawColor(...ENCRE.texte);
        doc.lines([[corps * 0.14, corps * 0.2], [corps * 0.2, -h], [w + corps * 0.2, 0]],
            x + corps * 0.05, y - h * 0.42, [1, 1], 'S', false);
        doc.text(n, x + corps * 0.42, y);
        x += w + corps * 0.62;
    }
    return x;
}

// --- THALÈS : LA RÉDACTION, SUR PAPIER ----------------------------------------
//
// Rémy : « et pour l'impression, il faut aussi proposer un exercice de
// rédaction. »
//
// TROIS CADRES, DES LIGNES, ET RIEN D'AUTRE. À l'écran, l'élève choisit ses
// hypothèses parmi six et pose des étiquettes pour écrire l'égalité : la machine
// l'empêche d'écrire une bêtise et lui explique chaque refus. C'est un
// échafaudage, et il est fait pour être retiré. Sur la feuille il n'y en a plus,
// et c'est le seul endroit où l'on vérifie qu'il sait encore le faire seul.
//
// LA FIGURE EST CELLE DE L'ÉCRAN, au trait près : elle se calcule dans
// `figureThalesElements` — placement des lettres, choix du côté de chaque cote,
// écart au segment — et se trace ici au PDF, là-bas en SVG.

/** La figure, l'énoncé et les trois cadres, posés dans le bloc. */
function geoThalesRedaction(item, slot, solution = false) {
    const b = boiteDe(slot);
    const m = item.meta;

    /**
     * LE CORRIGÉ NE SE MESURE PAS SUR LA COPIE DE L'ÉLÈVE.
     *
     * Rémy veut UNE ligne pour le « Donc », et il a raison : sur une copie,
     * « AD = (4 × 10) ÷ 8 = 5 cm » tient sur une ligne. Mais la feuille de
     * solutions, elle, écrit la démonstration en TROIS temps — la formule
     * isolée, les nombres remplacés, la conclusion avec l'unité — parce que
     * c'est ce qu'on veut que l'élève relise. Le cadre du corrigé se mesure
     * donc sur ce qu'il contient, pas sur la place qu'on laisse pour écrire.
     * Sans cela, le « Donc » corrigé débordait de son cadre de deux lignes.
     */
    const lignesDuCorrige = (titre) => {
        const l = (m.redaction.find(r => r.titre === titre) || {}).lignes || [];
        return l.reduce((n, x) =>
            n + (EN_FRACTIONS.test(String(x).trim()) ? LIGNES_FRACTION : 1), 0);
    };

    // L'ÉNONCÉ SE PLIE À LA LARGEUR DU BLOC, et c'est nouveau.
    //
    // Il était tracé d'un seul trait, sur une ligne. Cela tenait tant qu'il y
    // avait UNE démonstration par feuille : 190 millimètres de large, l'énoncé
    // en fait cent. Sur trois colonnes il n'en reste que soixante, et la phrase
    // sortait du bloc pour se poser sur la figure du voisin. Une largeur de
    // caractère de 1,6 mm à ce corps-là (mesurée : « Helvetica 9 pt » donne à
    // peu près la moitié du corps par caractère).
    const largeurCar = 1.6;
    const enonceLignes = couperEnLignes(m.enonce, Math.max(18, Math.floor(b.w / largeurCar)), 4);
    const hEnonce = 5 + (enonceLignes.length - 1) * 4;

    // LES CADRES SE DIMENSIONNENT SUR LA RÉDACTION ATTENDUE, pas sur un tiers de
    // page chacun. Les comptes sont ceux de Rémy — trois, cinq, une — et le
    // pourquoi de chacun est écrit dans `LIGNES_CADRE`. Un cadre trop court fait
    // écrire en petit dans la marge ; un cadre trop long fait croire qu'il
    // manque quelque chose.
    const cadres = [
        { cle: 'sais', titre: 'Je sais que', aide: 'ce que dit l’énoncé' },
        { cle: 'or', titre: 'Or', aide: 'ce que dit le cours' },
        { cle: 'donc', titre: 'Donc', aide: 'ce qu’on en déduit' }
    ].map(c => ({
        ...c,
        lignes: Math.max(1, solution ? lignesDuCorrige(c.titre) : LIGNES_CADRE_Q[c.cle])
    }));
    const totalLignes = cadres.reduce((n, c) => n + c.lignes, 0);
    const H_TITRE = 5;      // la bande du titre, au-dessus des lignes
    const MARGE = 2.5;      // entre deux cadres
    const hFixe = cadres.length * (H_TITRE + MARGE + 2);

    // DEUX MISES EN PAGE, ET LE « OU » DE RÉMY EST UN VRAI OU : « mets 3
    // colonnes par défaut OU la possibilité de mettre la rédaction à droite de
    // la figure ». Ce sont bien deux réponses au même problème — la feuille à
    // une seule démonstration gaspillait la page —, et elles ne se cumulent
    // pas : une colonne de trois fait 89 mm de large, la rédaction posée à
    // droite n'y disposerait que de 44 mm pour écrire « Les droites (DE) et
    // (CB) sont parallèles » à la main. Illisible.
    //
    // LE CHOIX SE FAIT DONC SUR LA PLACE, PAS SUR UN GOÛT. Il faut au moins
    // 70 mm pour écrire une hypothèse à la main sans la couper n'importe où, et
    // 34 pour que la figure reste une figure. Quand le bloc est assez large
    // pour les deux — une ou deux démonstrations par feuille — la rédaction va
    // à droite ; sinon elle passe dessous. Le professeur garde la main dans
    // « Où va la rédaction » : le réglage force l'une ou l'autre.
    const GOUTTIERE = 3;
    const W_ECRITURE = 70;   // de quoi écrire une hypothèse à la main
    const W_FIGURE_MIN = 34; // en dessous, la figure n'est plus lisible
    const aDroite = m.mise === 'droite' ? true
        : m.mise === 'dessous' ? false
            : b.w - W_ECRITURE - GOUTTIERE >= W_FIGURE_MIN;

    // La colonne d'écriture, et la place laissée à la figure.
    // ET LA FIGURE GARDE SA LARGEUR MINIMALE, MÊME QUAND ON FORCE « À DROITE ».
    // Elle était bornée à vingt-six millimètres — un chiffre écrit là et nulle
    // part ailleurs —, alors que `W_FIGURE_MIN` dit vingt lignes plus haut ce
    // qu'il faut pour qu'une figure reste une figure : trente-quatre. Sur une
    // feuille à trois démonstrations, cela fait un tiers de figure en plus.
    // Rémy : « quand on met la rédaction à droite, [...] la figure un peu plus
    // grande ».
    const wCadres = aDroite
        ? Math.min(Math.max(W_ECRITURE, b.w * 0.55), b.w - GOUTTIERE - W_FIGURE_MIN)
        : b.w;
    const xCadres = aDroite ? b.x + b.w - wCadres : b.x;
    const wFigure = aDroite ? b.w - wCadres - GOUTTIERE : b.w * 0.62;

    const yCorps = b.y + hEnonce;
    const hCorps = b.h - hEnonce;
    const hLigneMin = 5.5;  // de quoi écrire à la main
    // À DROITE, la rédaction dispose de toute la hauteur, et la figure aussi.
    // DESSOUS, elles se la partagent — et la figure ne prend jamais plus du
    // tiers du bloc : une figure géante sur une page où l'on doit ÉCRIRE est un
    // contresens.
    const hFigure = aDroite
        ? hCorps
        : Math.max(24, Math.min(hCorps * 0.36, hCorps - hFixe - totalLignes * hLigneMin));
    // L'INTERLIGNE NE S'ÉTIRE PAS JUSQU'AU BAS DU BLOC.
    //
    // Rémy : « quand on met la rédaction à droite, l'écart entre les lignes est
    // grand ». Il l'était : la hauteur restante se partageait entre les neuf
    // lignes, quelle qu'elle soit — sur une feuille à trois démonstrations en
    // paysage, cela donnait quatorze millimètres entre deux lignes, deux fois
    // l'interligne d'un cahier. On écrit alors une ligne sur deux et le cadre
    // paraît vide.
    //
    // Huit millimètres et demi, c'est l'interligne d'un grand carreau : la main
    // d'un élève de quatrième y tient à l'aise. Ce qu'on ne prend plus en
    // hauteur, la figure le garde — elle est centrée sur la colonne.
    const H_LIGNE_MAX = 8.5;
    const hLigneBrut = ((aDroite ? hCorps : hCorps - hFigure - 2) - hFixe) / totalLignes;
    const hLigne = Math.max(hLigneMin, Math.min(hLigneBrut, H_LIGNE_MAX));

    // LA FIGURE GARDE SES PROPORTIONS. Étirée à la largeur du bloc, un papillon
    // devient un accordéon et les cotes ne longent plus leur segment.
    const vue = m.figure.vue;
    const echelle = Math.min(wFigure / vue.w, hFigure / vue.h);
    const figW = vue.w * echelle, figH = vue.h * echelle;
    const figX = aDroite
        ? b.x + (wFigure - figW) / 2
        : b.x + (b.w - figW) / 2;
    // Posée à droite, la figure se centre en hauteur sur la colonne d'écriture.
    const figY = aDroite ? yCorps + (hCorps - figH) / 2 : yCorps;
    /** Un point de la figure, en millimètres sur la page. */
    const F = (q) => ({ x: figX + (q.x - vue.x0) * echelle, y: figY + (q.y - vue.y0) * echelle });

    // LES CADRES SE CENTRENT SUR CE QUI RESTE. Bloqués en haut du bloc avec un
    // interligne plafonné, ils laissaient tout le blanc au bas de la colonne.
    const hCadres = hFixe + totalLignes * hLigne;
    let y = (aDroite ? yCorps : yCorps + hFigure + 2)
        + Math.max(0, ((aDroite ? hCorps : hCorps - hFigure - 2) - hCadres) / 2);
    const boites = cadres.map(c => {
        // DEUX MILLIMÈTRES DE PLUS QUE LES LIGNES : sans eux, la dernière
        // ligne d'écriture tombait exactement sur le bord du cadre et se
        // confondait avec lui — on croyait le cadre plus court d'une ligne.
        const h = H_TITRE + c.lignes * hLigne + 2;
        const box = { ...c, x: xCadres, y, w: wCadres, h, hLigne, hTitre: H_TITRE };
        y += h + MARGE;
        return box;
    });

    return { b, m, F, echelle, figX, figY, figW, figH, hEnonce, enonceLignes, boites, hLigne };
}

/**
 * LA DOUBLE FLÈCHE D'UNE COTE, en millimètres — les mêmes proportions qu'en SVG.
 *
 * Deux lignes d'attache qui partent des extrémités du segment, la ligne de cote
 * entre les deux, une pointe pleine à chaque bout tournée vers l'extérieur.
 * C'est la convention du dessin technique, et elle est là pour une raison
 * précise : « AB = 20 » posé près de deux traits qui se croisent ne dit pas
 * lequel des deux il mesure — surtout ici, où [AE] est un morceau de [AB].
 */
function traitsDeCote(c, F, k) {
    const p1 = F(c.p1), q1 = F(c.q1), p = F(c.p), q = F(c.q);
    const dx = q1.x - p1.x, dy = q1.y - p1.y;
    const n = Math.hypot(dx, dy) || 1;
    const vx = dx / n, vy = dy / n;
    const POINTE = 2.6 * k, LARGE = 1.15 * k;
    const attache = (P0, P1) => {
        const ex = P1.x - P0.x, ey = P1.y - P0.y;
        const e = Math.hypot(ex, ey) || 1;
        const gx = ex / e, gy = ey / e;
        return { p: { x: P0.x + gx * 1.6 * k, y: P0.y + gy * 1.6 * k },
            q: { x: P1.x + gx * 1.4 * k, y: P1.y + gy * 1.4 * k } };
    };
    const pointe = (P0, sx, sy) => [
        P0,
        { x: P0.x - sx * POINTE + sy * LARGE, y: P0.y - sy * POINTE - sx * LARGE },
        { x: P0.x - sx * POINTE - sy * LARGE, y: P0.y - sy * POINTE + sx * LARGE }
    ];
    return {
        attaches: [attache(p, c.p1 && p1), attache(q, q1)],
        ligne: { p: p1, q: q1 },
        pointes: [pointe(p1, -vx, -vy), pointe(q1, vx, vy)]
    };
}

/**
 * L'ÉGALITÉ DE THALÈS S'ÉCRIT EN FRACTIONS, SUR LE PAPIER AUSSI.
 *
 * Rémy : « pour le théorème de Thalès, à l'impression fais l'égalité en
 * fraction. » Le corrigé posait « AD/AC = AE/AB = DE/BC » avec des barres
 * obliques. À l'écran, l'exercice l'affiche depuis toujours en vraies
 * fractions — numérateur, trait, dénominateur —, et c'est ainsi qu'elle
 * s'écrit au tableau et dans le cahier. Deux écritures pour une seule
 * égalité, c'est une de trop : l'élève qui compare sa copie au corrigé doit
 * y retrouver ce qu'il a écrit.
 *
 * On ne touche pas à la feuille vierge : elle ne porte que des lignes.
 */
const EN_FRACTIONS = /^[^/\s]+\/[^/\s]+(\s*=\s*[^/\s]+\/[^/\s]+)*$/;

/**
 * UNE FRACTION OCCUPE DEUX LIGNES. Le numérateur au-dessus du trait, le
 * dénominateur en dessous : sur une seule ligne, le « AC » de la première
 * égalité venait s'asseoir sur le « 5 » de la seconde. C'est aussi ce que
 * l'élève fait sur sa copie — deux interlignes pour un rapport.
 */
const LIGNES_FRACTION = 2;

/**
 * Les morceaux d'une égalité, dans l'ordre, chacun avec la largeur qu'il
 * prendra. `mesurer(texte, corps)` rend une largeur en millimètres : le PDF
 * sait la sienne exactement, l'aperçu l'approche (voir `largeurHelvetica`).
 */
function planFractions(ligne, mesurer, corps) {
    const petit = corps * 0.86;
    const morceaux = [];
    String(ligne).split('=').forEach((brut, i) => {
        const t = brut.trim();
        if (i) morceaux.push({ texte: '=', w: mesurer('=', corps), ecart: corps * 0.4 });
        const coupe = t.split('/');
        if (coupe.length === 2 && coupe[0] && coupe[1]) {
            // Le trait de fraction déborde un peu de chaque côté du plus long
            // des deux termes : c'est ce débord qui le fait lire comme un
            // trait de fraction et non comme un soulignement.
            const w = Math.max(mesurer(coupe[0], petit), mesurer(coupe[1], petit)) + corps * 0.5;
            morceaux.push({ haut: coupe[0], bas: coupe[1], w, petit, ecart: corps * 0.4 });
        } else {
            morceaux.push({ texte: t, w: mesurer(t, corps), ecart: corps * 0.4 });
        }
    });
    return morceaux;
}

/**
 * UNE LARGEUR DE TEXTE APPROCHÉE, pour l'aperçu — qui construit sa chaîne SVG
 * sans pouvoir mesurer quoi que ce soit. Les fractions n'y portent que des
 * majuscules et des chiffres, dont l'Helvetica fait à peu de choses près
 * 0,58 cadratin ; la virgule et le point, moitié moins. L'erreur se voit sur
 * l'espacement entre deux rapports, jamais sur l'alignement d'une fraction,
 * qui se centre sur elle-même.
 */
function largeurHelvetica(texte, corps) {
    return String(texte).split('').reduce((n, c) => n + (/[.,'’ ]/.test(c) ? 0.29 : 0.58), 0) * corps;
}

/** L'égalité en fractions, en SVG — pour l'aperçu de la feuille de solutions. */
function fractionsSvg(ligne, x, yBase, corps, T, couleur) {
    const plan = planFractions(ligne, largeurHelvetica, corps);
    const police = 'font-family="Helvetica, Arial, sans-serif"';
    // La barre de fraction se pose à la hauteur de la barre du « = », soit un
    // tiers de corps au-dessus de la ligne de base.
    const barre = yBase - corps * 0.32;
    let out = '', cx = x;
    plan.forEach(m => {
        if (m.texte !== undefined) {
            out += `<text x="${T(cx)}" y="${T(yBase)}" font-size="${T(corps)}"
                ${police} fill="${couleur}">${echapper(m.texte)}</text>`;
        } else {
            const mid = cx + m.w / 2;
            out += `<text x="${T(mid)}" y="${T(barre - corps * 0.24)}" text-anchor="middle"
                font-size="${T(m.petit)}" ${police} fill="${couleur}">${echapper(m.haut)}</text>`;
            out += `<line x1="${T(cx + corps * 0.08)}" y1="${T(barre)}"
                x2="${T(cx + m.w - corps * 0.08)}" y2="${T(barre)}"
                stroke="${couleur}" stroke-width="${T(0.22)}"/>`;
            out += `<text x="${T(mid)}" y="${T(barre + m.petit * 0.94)}" text-anchor="middle"
                font-size="${T(m.petit)}" ${police} fill="${couleur}">${echapper(m.bas)}</text>`;
        }
        cx += m.w + m.ecart;
    });
    return out;
}

/**
 * La même égalité au PDF, où l'on sait mesurer pour de bon. `rgb` est la
 * couleur du TRAIT de fraction : sans lui, la barre héritait de la couleur du
 * cadre — de l'encre noire sous des chiffres bleus.
 */
function dessinerFractionsPdf(doc, ligne, x, yBase, corps, rgb) {
    const mesurer = (t, taille) => {
        doc.setFontSize(taille / 0.3528);
        return doc.getTextWidth(pourPdf(t));
    };
    const plan = planFractions(ligne, mesurer, corps);
    const barre = yBase - corps * 0.32;
    let cx = x;
    plan.forEach(m => {
        if (m.texte !== undefined) {
            doc.setFontSize(corps / 0.3528);
            doc.text(pourPdf(m.texte), cx, yBase);
        } else {
            const mid = cx + m.w / 2;
            doc.setFontSize(m.petit / 0.3528);
            doc.text(pourPdf(m.haut), mid, barre - corps * 0.24, { align: 'center' });
            doc.text(pourPdf(m.bas), mid, barre + m.petit * 0.94, { align: 'center' });
            doc.setDrawColor(...(rgb || ENCRE.trait));
            doc.setLineWidth(0.22);
            doc.line(cx + corps * 0.08, barre, cx + m.w - corps * 0.08, barre);
        }
        cx += m.w + m.ecart;
    });
    doc.setFontSize(corps / 0.3528);
}

function thalesRedactionPreviewHtml(item, slot, k, solution) {
    const g = geoThalesRedaction(item, slot, solution);
    const T = (v) => (v * k).toFixed(2);
    const m = g.m;
    let out = '';

    // L'énoncé, plié à la largeur du bloc — voir `geoThalesRedaction`.
    g.enonceLignes.forEach((l, i) => {
        out += `<text x="${T(g.b.x)}" y="${T(g.b.y + 4 + i * 4)}" font-size="${T(3.1)}"
            font-family="Helvetica, Arial, sans-serif" fill="#1a202c">${echapper(l)}</text>`;
    });

    // La figure : traits, cotes, lettres.
    const COULEUR = { droite: '#4a5568', base: '#2b6cb0', para: '#2f855a' };
    m.figure.traits.forEach(t => {
        const p = g.F(t.p), q = g.F(t.q);
        out += `<line x1="${T(p.x)}" y1="${T(p.y)}" x2="${T(q.x)}" y2="${T(q.y)}"
            stroke="${COULEUR[t.genre]}" stroke-width="${T(t.genre === 'droite' ? 0.25 : 0.4)}"/>`;
    });
    m.figure.cotes.forEach(c => {
        const d = traitsDeCote(c, g.F, g.echelle);
        d.attaches.forEach(a => {
            out += `<line x1="${T(a.p.x)}" y1="${T(a.p.y)}" x2="${T(a.q.x)}" y2="${T(a.q.y)}"
                stroke="#2c5282" stroke-width="${T(0.12)}" opacity=".6"/>`;
        });
        out += `<line x1="${T(d.ligne.p.x)}" y1="${T(d.ligne.p.y)}"
            x2="${T(d.ligne.q.x)}" y2="${T(d.ligne.q.y)}" stroke="#2c5282" stroke-width="${T(0.18)}"/>`;
        d.pointes.forEach(tri => {
            out += `<path d="M${T(tri[0].x)} ${T(tri[0].y)} L${T(tri[1].x)} ${T(tri[1].y)}
                L${T(tri[2].x)} ${T(tri[2].y)} Z" fill="#2c5282"/>`;
        });
        const pt = g.F({ x: c.x, y: c.y });
        out += `<text x="${T(pt.x)}" y="${T(pt.y)}"
            transform="rotate(${c.angle.toFixed(1)} ${T(pt.x)} ${T(pt.y)})"
            text-anchor="middle" dominant-baseline="central"
            font-size="${T(m.figure.tailleCote * g.echelle)}" font-weight="700" fill="#2c5282"
            font-family="Helvetica, Arial, sans-serif">${echapper(c.texte)}</text>`;
    });
    m.figure.noms.forEach(t => {
        const pt = g.F({ x: t.x, y: t.yBase });
        out += `<text x="${T(pt.x)}" y="${T(pt.y)}" text-anchor="${t.ancre}"
            font-size="${T(m.figure.tailleNom * g.echelle)}" font-weight="800" fill="#1a202c"
            font-family="Helvetica, Arial, sans-serif">${echapper(t.texte)}</text>`;
    });

    // Les trois cadres.
    g.boites.forEach(box => {
        out += `<rect x="${T(box.x)}" y="${T(box.y)}" width="${T(box.w)}" height="${T(box.h)}"
            rx="${T(1.5)}" fill="none" stroke="#1a202c" stroke-width="${T(0.3)}"/>`;
        out += `<text x="${T(box.x + 2.5)}" y="${T(box.y + 3.6)}" font-size="${T(3.2)}"
            font-weight="700" fill="#1a202c"
            font-family="Helvetica, Arial, sans-serif">${echapper(box.titre)}</text>`;
        if (m.rappel) {
            out += `<text x="${T(box.x + 2.5 + box.titre.length * 1.9)}" y="${T(box.y + 3.6)}"
                font-size="${T(2.5)}" fill="#8a90a0"
                font-family="Helvetica, Arial, sans-serif">${echapper('— ' + box.aide)}</text>`;
        }
        if (solution) {
            const lignes = (m.redaction.find(r => r.titre === box.titre) || {}).lignes || [];
            let rang = 0;
            lignes.forEach((l) => {
                const texte = String(l).trim();
                if (EN_FRACTIONS.test(texte)) {
                    out += fractionsSvg(texte, box.x + 4,
                        box.y + box.hTitre + (rang + 1.3) * box.hLigne, 3, T, '#2c5282');
                    rang += LIGNES_FRACTION;
                    return;
                }
                out += `<text x="${T(box.x + 4)}" y="${T(box.y + box.hTitre + (rang + 0.7) * box.hLigne)}"
                    font-size="${T(3)}" fill="#2c5282"
                    font-family="Helvetica, Arial, sans-serif">${echapper(l)}</text>`;
                rang += 1;
            });
            return;
        }
        for (let i = 1; i <= box.lignes; i++) {
            const y = box.y + box.hTitre + i * box.hLigne - 1.5;
            out += `<line x1="${T(box.x + 3)}" y1="${T(y)}" x2="${T(box.x + box.w - 3)}" y2="${T(y)}"
                stroke="#c9cedb" stroke-width="${T(0.18)}"/>`;
        }
    });

    return `<svg style="position:absolute; left:0; top:0; width:100%; height:100%;
        overflow:visible; pointer-events:none">${out}</svg>`;
}

function dessinerThalesRedactionPdf(doc, item, slot, solution) {
    const g = geoThalesRedaction(item, slot, solution);
    const m = g.m;

    // L'énoncé, plié à la largeur du bloc — voir `geoThalesRedaction`.
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...ENCRE.trait);
    g.enonceLignes.forEach((l, i) => doc.text(pourPdf(l), g.b.x, g.b.y + 4 + i * 4));

    // La figure.
    const COULEUR = { droite: [74, 85, 104], base: [43, 108, 176], para: [47, 133, 90] };
    m.figure.traits.forEach(t => {
        const p = g.F(t.p), q = g.F(t.q);
        doc.setDrawColor(...COULEUR[t.genre]);
        doc.setLineWidth(t.genre === 'droite' ? 0.25 : 0.4);
        doc.line(p.x, p.y, q.x, q.y);
    });
    m.figure.cotes.forEach(c => {
        const d = traitsDeCote(c, g.F, g.echelle);
        doc.setDrawColor(44, 82, 130);
        doc.setLineWidth(0.12);
        d.attaches.forEach(a => doc.line(a.p.x, a.p.y, a.q.x, a.q.y));
        doc.setLineWidth(0.18);
        doc.line(d.ligne.p.x, d.ligne.p.y, d.ligne.q.x, d.ligne.q.y);
        doc.setFillColor(44, 82, 130);
        d.pointes.forEach(tri => {
            doc.triangle(tri[0].x, tri[0].y, tri[1].x, tri[1].y, tri[2].x, tri[2].y, 'F');
        });
        const pt = g.F({ x: c.x, y: c.y });
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(Math.max(5, m.figure.tailleCote * g.echelle * 2.83));
        doc.setTextColor(44, 82, 130);
        // LE NOMBRE TOURNE AVEC SA FLÈCHE. jsPDF compte les angles à l'envers du
        // SVG — sens trigonométrique contre sens horaire —, d'où le signe.
        doc.text(pourPdf(c.texte), pt.x, pt.y, { angle: -c.angle, align: 'center', baseline: 'middle' });
    });
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...ENCRE.trait);
    m.figure.noms.forEach(t => {
        const pt = g.F({ x: t.x, y: t.yBase });
        doc.setFontSize(Math.max(6, m.figure.tailleNom * g.echelle * 2.83));
        doc.text(pourPdf(t.texte), pt.x, pt.y,
            { align: t.ancre === 'start' ? 'left' : t.ancre === 'end' ? 'right' : 'center' });
    });

    // Les trois cadres.
    g.boites.forEach(box => {
        doc.setDrawColor(...ENCRE.trait);
        doc.setLineWidth(0.3);
        doc.roundedRect(box.x, box.y, box.w, box.h, 1.5, 1.5, 'S');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...ENCRE.trait);
        doc.text(pourPdf(box.titre), box.x + 2.5, box.y + 3.8);
        if (m.rappel) {
            // LA LARGEUR DU TITRE SE MESURE AVANT DE CHANGER DE POLICE. Mesurée
            // après, c'est la largeur du petit corps gris qu'on obtenait, et le
            // rappel venait se coller au titre : « Je sais quece que dit
            // l'énoncé ».
            const largeurTitre = doc.getTextWidth(pourPdf(box.titre));
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(...ENCRE.gris);
            doc.text(pourPdf('— ' + box.aide), box.x + 2.5 + largeurTitre + 2.5, box.y + 3.8);
        }
        if (solution) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9.5);
            doc.setTextColor(44, 82, 130);
            const lignes = (m.redaction.find(r => r.titre === box.titre) || {}).lignes || [];
            let rang = 0;
            lignes.forEach((l) => {
                const texte = String(l).trim();
                if (EN_FRACTIONS.test(texte)) {
                    dessinerFractionsPdf(doc, texte, box.x + 4,
                        box.y + box.hTitre + (rang + 1.3) * box.hLigne, 3.35, [44, 82, 130]);
                    rang += LIGNES_FRACTION;
                    return;
                }
                doc.text(pourPdf(l), box.x + 4, box.y + box.hTitre + (rang + 0.7) * box.hLigne);
                rang += 1;
            });
            return;
        }
        doc.setDrawColor(...ENCRE.grille);
        doc.setLineWidth(0.18);
        for (let i = 1; i <= box.lignes; i++) {
            const y = box.y + box.hTitre + i * box.hLigne - 1.5;
            doc.line(box.x + 3, y, box.x + box.w - 3, y);
        }
    });
}

// ================= HYPOTÉNUSE, OPPOSÉ, ADJACENT ==========================
//
// Rémy, quand je lui ai demandé quels exercices manquaient de fiche :
// « Hypoténuse, Opposé, Adjacent, et Les Fonctions : Image et Antécédent ».
//
// UN BLOC = UNE FIGURE ET SES LIGNES. Le triangle occupe le haut du bloc, les
// deux ou trois lignes à remplir sont dessous. Ce partage n'est pas décoratif :
// c'est la figure qui porte TOUTE la donnée — l'angle droit, l'angle marqué,
// les trois lettres — et l'élève y revient à chaque ligne. La mettre à côté du
// texte, comme une illustration, obligerait à traverser le bloc des yeux trois
// fois.
//
// LA FIGURE OCCUPE LA PLACE QU'ON LUI DONNE, et pas la place qu'elle voudrait.
// `pointsDe` rend un triangle inscrit dans un carré de cent, orientation
// comprise : on le remet à l'échelle du cadre disponible. Un triangle 5-12
// tourné de 40° n'a pas les mêmes proportions qu'un 3-4 droit, mais tous deux
// remplissent leur cadre — sinon la feuille alternerait des figures énormes et
// des figures minuscules, ce qui se lit comme une erreur.

/** La hauteur réservée sous la figure, par ligne à remplir. */
const TRIGO_LIGNE = 8.5;

function geoTrigo(item, slot) {
    const b = boiteDe(slot);
    const m = item.meta;
    const lignes = m.lignes || [];
    // Le pied : une ligne par réponse, plus un peu d'air.
    const pied = lignes.length * TRIGO_LIGNE + 2;
    const cadre = { x: b.x, y: b.y, w: b.w, h: Math.max(14, b.h - pied) };
    // Une marge intérieure : les lettres des sommets se posent EN DEHORS du
    // triangle, et sans elle elles sortaient du bloc — mesuré sur les
    // orientations proches de 90°, où le sommet touche le bord du carré.
    const marge = Math.min(cadre.w, cadre.h) * 0.16;
    const cote = Math.min(cadre.w - 2 * marge, cadre.h - 2 * marge);
    const x0 = cadre.x + (cadre.w - cote) / 2;
    const y0 = cadre.y + (cadre.h - cote) / 2;
    const pts = pointsDeTrigo(m.triangle, 100).map(q => ({
        x: x0 + (q.x / 100) * cote,
        y: y0 + (q.y / 100) * cote
    }));
    return { b, m, lignes, cadre, pts, cote, pied };
}

/**
 * CE QU'IL Y A À TRACER : trois côtés, trois lettres, le carré de l'angle droit
 * et l'arc de l'angle marqué.
 *
 * L'ARC EST LA SEULE DONNÉE VARIABLE DE LA FIGURE, et c'est lui qui fait
 * l'exercice : sans lui, « opposé » et « adjacent » n'ont pas de sens. Il est
 * donc gras et coloré, quand le reste est au trait noir.
 */
function tracesTrigo(g) {
    const { pts, m } = g;
    const t = m.triangle;
    const iD = t.angleDroit, iA = t.angleVise;
    const cotes = [[0, 1], [1, 2], [0, 2]].map(([i, j]) => [pts[i], pts[j]]);

    // LE PETIT CARRÉ DE L'ANGLE DROIT, posé sur les deux côtés qui s'y
    // rejoignent — à la taille du triangle, pas à une taille fixe : sur une
    // feuille à six figures par page, un carré de 3 mm mange le sommet.
    const taille = Math.max(1.6, g.cote * 0.075);
    const versDroit = [0, 1, 2].filter(i => i !== iD).map(i => unite(pts[iD], pts[i]));
    const carre = [
        { x: pts[iD].x + versDroit[0].x * taille, y: pts[iD].y + versDroit[0].y * taille },
        { x: pts[iD].x + (versDroit[0].x + versDroit[1].x) * taille,
            y: pts[iD].y + (versDroit[0].y + versDroit[1].y) * taille },
        { x: pts[iD].x + versDroit[1].x * taille, y: pts[iD].y + versDroit[1].y * taille }
    ];

    // L'ARC DE L'ANGLE MARQUÉ — un arc de cercle centré sur le sommet, tracé en
    // segments : le PDF n'a pas d'arc elliptique simple, et un polygone de
    // douze points est indiscernable d'un arc à cette taille.
    const rayon = Math.max(2.4, g.cote * 0.155);
    const versA = [0, 1, 2].filter(i => i !== iA).map(i => unite(pts[iA], pts[i]));
    const a0 = Math.atan2(versA[0].y, versA[0].x);
    let a1 = Math.atan2(versA[1].y, versA[1].x);
    // On prend le PETIT arc : celui qui est à l'intérieur du triangle.
    while (a1 - a0 > Math.PI) a1 -= 2 * Math.PI;
    while (a0 - a1 > Math.PI) a1 += 2 * Math.PI;
    const arc = [];
    for (let i = 0; i <= 12; i++) {
        const a = a0 + ((a1 - a0) * i) / 12;
        arc.push({ x: pts[iA].x + Math.cos(a) * rayon, y: pts[iA].y + Math.sin(a) * rayon });
    }

    // LES LETTRES SE POSENT VERS L'EXTÉRIEUR — dans la direction opposée au
    // centre du triangle. Posées au sommet même, elles chevauchaient le trait ;
    // posées toujours au-dessus, elles tombaient dans la figure une fois sur
    // trois selon l'orientation.
    const cx = (pts[0].x + pts[1].x + pts[2].x) / 3;
    const cy = (pts[0].y + pts[1].y + pts[2].y) / 3;
    const ecart = Math.max(2.6, g.cote * 0.085);
    const noms = pts.map((p, i) => {
        const u = unite({ x: cx, y: cy }, p);
        return { t: t.sommets[i], x: p.x + u.x * ecart, y: p.y + u.y * ecart };
    });

    return { cotes, carre, arc, noms, rayon };
}

function trigoPreviewHtml(item, slot, k, solution) {
    const g = geoTrigo(item, slot);
    const t = tracesTrigo(g);
    const T = (v) => (v * k).toFixed(2);
    const police = 'Helvetica, Arial, sans-serif';
    let out = '';

    t.cotes.forEach(([a, b]) => {
        out += `<line x1="${T(a.x)}" y1="${T(a.y)}" x2="${T(b.x)}" y2="${T(b.y)}"
            stroke="#1a202c" stroke-width="${T(0.45)}" stroke-linecap="round"/>`;
    });
    out += `<path d="M ${T(t.carre[0].x)} ${T(t.carre[0].y)} L ${T(t.carre[1].x)} ${T(t.carre[1].y)}
        L ${T(t.carre[2].x)} ${T(t.carre[2].y)}" fill="none" stroke="#1a202c"
        stroke-width="${T(0.35)}"/>`;
    // L'ARC EST NOIR ET GRAS, PAS BLEU ET FIN.
    //
    // Une fiche s'imprime en noir et blanc : la couleur ne survit pas, et un
    // trait de 0,55 mm dans un bleu moyen devient un gris pâle. Or l'arc est la
    // SEULE donnée variable de la figure — sans lui, « opposé » et « adjacent »
    // n'ont aucun sens et la feuille n'a pas de réponse. Il est donc de la même
    // encre que les côtés, plus épais qu'eux, et son rayon fait 15 % du
    // triangle : on le voit d'un mètre.
    out += `<path d="M ${t.arc.map(p => `${T(p.x)} ${T(p.y)}`).join(' L ')}" fill="none"
        stroke="#1a202c" stroke-width="${T(0.75)}" stroke-linecap="round"
        stroke-linejoin="round"/>`;
    t.noms.forEach(n => {
        out += `<text x="${T(n.x)}" y="${T(n.y)}" text-anchor="middle" dominant-baseline="central"
            font-size="${T(3.4)}" font-weight="800" fill="#1a202c"
            font-family="${police}">${echapper(n.t)}</text>`;
    });

    // Les lignes à remplir.
    let y = g.cadre.y + g.cadre.h + 2;
    g.lignes.forEach(l => {
        const lib = libelleTrigo(l, (t) => largeurTrigo(t, 2.9));
        out += `<text x="${T(g.b.x + 1)}" y="${T(y + 3)}" font-size="${T(2.9)}" fill="#2d3748"
            font-family="${police}">${echapper(lib.texte)}</text>`;
        if (lib.xLettre !== null) {
            const cx = g.b.x + 1 + lib.xLettre + lib.largeurLettre / 2;
            const haut = y + 3 - 2.9 * 0.92;
            out += `<path d="M ${T(cx - 0.75)} ${T(haut + 0.7)} L ${T(cx)} ${T(haut)}
                L ${T(cx + 0.75)} ${T(haut + 0.7)}" fill="none" stroke="#2d3748"
                stroke-width="${T(0.24)}" stroke-linecap="round" stroke-linejoin="round"/>`;
        }
        const xDebut = g.b.x + 1 + largeurTrigo(lib.texte, 2.9) + 2;
        out += `<line x1="${T(xDebut)}" y1="${T(y + 4)}" x2="${T(g.b.x + g.b.w - 1)}" y2="${T(y + 4)}"
            stroke="#b0b6c5" stroke-width="${T(0.22)}" stroke-dasharray="${T(0.9)} ${T(0.9)}"/>`;
        if (solution) {
            out += `<text x="${T(xDebut + 1.5)}" y="${T(y + 3)}" font-size="${T(2.9)}"
                font-weight="700" fill="#2b6cb0"
                font-family="${police}">${echapper(l.solution)}</text>`;
        }
        y += TRIGO_LIGNE;
    });
    return `<svg style="position:absolute; left:0; top:0; width:100%; height:100%;
        overflow:visible; pointer-events:none">${out}</svg>`;
}

/**
 * LE LIBELLÉ D'UNE LIGNE À REMPLIR, AVEC SON CHAPEAU ET SES DEUX-POINTS.
 *
 * Rémy : « n'oublie pas le ":" après côté opposé à l'angle B. Mets un chapeau à
 * l'angle B. » Deux demandes, et la seconde n'est pas cosmétique : « B » tout
 * seul désigne un POINT, « B̂ » désigne l'angle en ce point. Écrire l'un pour
 * l'autre dans le chapitre où l'on apprend justement à ne pas les confondre
 * revient à enseigner la confusion.
 *
 * Le chapeau ne peut pas s'écrire : les polices du PDF n'ont pas de circonflexe
 * combinable, et la table de caractères ne monte pas jusque-là (voir
 * `pourPdf`). On le TRACE — deux traits au-dessus de la lettre, comme au
 * tableau —, et l'aperçu comme la feuille le posent au même endroit puisqu'ils
 * partent des mêmes mesures.
 *
 * @returns {{texte:string, xLettre:number|null, largeurLettre:number}} le texte
 *   complet et, s'il y a un chapeau, où poser ses deux traits.
 */
function libelleTrigo(ligne, mesurer) {
    const lettre = ligne.chapeau ? String(ligne.chapeau) : '';
    const avant = lettre ? `${ligne.etiquette} ` : ligne.etiquette;
    const texte = `${avant}${lettre} :`;
    return {
        texte,
        xLettre: lettre ? mesurer(avant) : null,
        largeurLettre: lettre ? mesurer(lettre) : 0
    };
}

function dessinerTrigoPdf(doc, item, slot, solution) {
    const g = geoTrigo(item, slot);
    const t = tracesTrigo(g);

    doc.setDrawColor(...ENCRE.trait);
    doc.setLineWidth(0.45);
    doc.setLineJoin('round');
    doc.setLineCap('round');
    t.cotes.forEach(([a, b]) => doc.line(a.x, a.y, b.x, b.y));

    doc.setLineWidth(0.35);
    doc.line(t.carre[0].x, t.carre[0].y, t.carre[1].x, t.carre[1].y);
    doc.line(t.carre[1].x, t.carre[1].y, t.carre[2].x, t.carre[2].y);

    doc.setLineWidth(0.75);
    for (let i = 1; i < t.arc.length; i++) {
        doc.line(t.arc[i - 1].x, t.arc[i - 1].y, t.arc[i].x, t.arc[i].y);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...ENCRE.trait);
    t.noms.forEach(n => doc.text(n.t, n.x, n.y, { align: 'center', baseline: 'middle' }));

    let y = g.cadre.y + g.cadre.h + 2;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    g.lignes.forEach(l => {
        const lib = libelleTrigo(l, (t) => doc.getTextWidth(pourPdf(t)));
        doc.setTextColor(...ENCRE.texte);
        doc.text(pourPdf(lib.texte), g.b.x + 1, y + 3);
        if (lib.xLettre !== null) {
            const cx = g.b.x + 1 + lib.xLettre + lib.largeurLettre / 2;
            const haut = y + 3 - 8.5 * 0.3528 * 0.92;   // 8,5 pt en millimètres
            doc.setDrawColor(...ENCRE.texte);
            doc.setLineWidth(0.24);
            doc.setLineJoin('round');
            doc.setLineCap('round');
            doc.line(cx - 0.75, haut + 0.7, cx, haut);
            doc.line(cx, haut, cx + 0.75, haut + 0.7);
        }
        const xDebut = g.b.x + 1 + doc.getTextWidth(pourPdf(lib.texte)) + 2;
        doc.setDrawColor(...ENCRE.grille);
        doc.setLineWidth(0.22);
        doc.setLineDashPattern([0.9, 0.9], 0);
        doc.line(xDebut, y + 4, g.b.x + g.b.w - 1, y + 4);
        doc.setLineDashPattern([], 0);
        if (solution) {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(43, 108, 176);
            doc.text(l.solution, xDebut + 1.5, y + 3);
            doc.setFont('helvetica', 'normal');
        }
        y += TRIGO_LIGNE;
    });
    doc.setLineJoin('miter');
    doc.setLineCap('butt');
}

export const RENDUS_THEOREMES = {
    'thales-redaction': {
        titre: 'Thalès : rédiger la démonstration',
        consigne: () => 'RÉDIGE LA DÉMONSTRATION EN TROIS PARTIES, comme sur une copie. '
            + 'Dans le « Or », chaque petit segment se met sur le segment ENTIER qui le '
            + 'contient, jamais sur le reste. Et l\'on conclut AVEC L\'UNITÉ.',
        previewGrille: thalesRedactionPreviewHtml,
        pdfGrille: dessinerThalesRedactionPdf,
        nomBloc: 'Démonstration', nomBlocs: 'démonstrations',
        // TROIS PAR FEUILLE PAR DÉFAUT — Rémy : « De base sur le poly mets 3
        // colonnes par défaut ».
        //
        // Une par page était le bon compte tant que la rédaction s'empilait
        // SOUS la figure : la démonstration faisait alors toute la hauteur de
        // la feuille. Posée à CÔTÉ, elle en fait la moitié, et trois colonnes
        // tiennent sans que personne écrive en abrégé — c'est le même nombre de
        // lignes, dans une colonne trois fois plus étroite mais trois fois plus
        // haute. Le professeur qui préfère l'ancienne mise en page la retrouve
        // dans « Où va la rédaction » et redescend à une ou deux par feuille.
        disposition: { cols: 3, rows: 1, maxCols: 3, maxRows: 2 },
        parLigneDefaut: 3,
        // Plus haut que large : trois colonnes étroites sur toute la hauteur.
        proportions: { w: 1, h: 1.45 },
        // ET CE BLOC A UN PLANCHER, QUE LA PROPORTION NE DIT PAS.
        //
        // Rémy, sur une feuille de parcours : « le thalès bugge ». Il buggait :
        // le « Or » et le « Donc » de la première rangée s'imprimaient PAR-DESSUS
        // les énoncés et les figures de la seconde.
        //
        // MESURÉ, et l'écart est net : sur trois colonnes d'un parcours, la
        // proportion donnait un emplacement de 83,1 mm et le bloc en demandait
        // 113. Ce 113 n'est pas négociable, il s'additionne : 9 mm d'énoncé
        // replié, 24 de figure, 28,5 pour les trois bandeaux de cadre, et
        // 49,5 pour les neuf lignes à écrire — à 5,5 mm, l'interligne en dessous
        // duquel une main d'élève n'écrit plus. Un rendu qui ne peut pas se
        // serrer davantage doit le DIRE ; la proportion, elle, ne parle que de
        // forme, et se laisse écraser quand la page manque.
        //
        // Sur sa propre feuille le défaut n'existait pas — `rows: 1` lui donne
        // la page entière —, et à une ou deux démonstrations par ligne la
        // proportion tombe déjà sur 113 : ce plancher ne change donc rien
        // ailleurs, il rattrape le seul cas où elle passait dessous.
        //
        // CENT DIX-NEUF, ET NON CENT TREIZE. Le premier compte supposait un
        // énoncé sur DEUX lignes. « (DE) // (CB). On donne AE = 20 cm, AB = 24
        // cm, AC = 30 cm. Calcule AD. » en prend trois dans une colonne de
        // cinquante-sept millimètres, et la sonde des feuilles de parcours
        // rattrapait encore six pixels de débordement. Une ligne d'énoncé de
        // plus, et la marge qui va avec.
        hauteurMin: 119,
        titreAGauche: true
    },
    'trigo-cotes': {
        titre: 'Hypoténuse, opposé, adjacent',
        consigne: (items) => (items[0] && items[0].prompt && items[0].prompt.papier)
            || 'Nomme les trois côtés de chaque triangle par leurs deux extrémités.',
        previewGrille: trigoPreviewHtml,
        pdfGrille: dessinerTrigoPdf,
        nomBloc: 'Triangle', nomBlocs: 'triangles',
        // SIX PAR PAGE, DEUX RANGÉES DE TROIS. Une figure doit rester lisible —
        // trois lettres, un petit carré, un arc — et trois lignes d'écriture
        // manuscrite se logent dessous. À neuf par page, mesuré, la ligne à
        // remplir tombait à quatre millimètres : on n'y écrit pas « [MN] » au
        // stylo. À quatre, la feuille ne pose que quatre questions, et le piège
        // de l'exercice — la MÊME lecture sur des figures tournées différemment
        // — a besoin de la série pour se tendre.
        disposition: { cols: 3, rows: 2, maxCols: 4, maxRows: 3 },
        parLigneDefaut: 3,
        // Plus haut que large : la figure occupe le carré du haut, les lignes
        // s'ajoutent dessous. Un bloc carré écraserait l'une ou l'autre.
        proportions: { w: 1, h: 1.3 }
    },
    thales: {
        titre: 'Le théorème de Thalès',
        consigne: () => 'La figure n\'est PAS en vraie grandeur : ne mesure pas, applique '
            + 'le théorème. Chaque petit segment se compare au segment ENTIER qui le '
            + 'contient — AM avec AB, jamais avec MB.',
        previewGrille: thalesPreviewHtml,
        pdfGrille: dessinerThalesPdf,
        nomBloc: 'Exercice', nomBlocs: 'exercices',
        // Large et bas, comme Pythagore : la figure à gauche, la rédaction à droite.
        proportions: { w: 1, h: 0.4 },
        titreAGauche: true,
        disposition: { cols: 2, rows: 3, maxCols: 2, maxRows: 4 },
        parLigneDefaut: 2
    },
    pythagore: {
        titre: 'Le théorème de Pythagore',
        // ET SI LA FIGURE EST LÀ, ON PRÉVIENT. Rémy : « les figures ne sont pas
        // forcément à l'échelle ». Un élève qui mesure au double décimètre sur
        // un triangle dessiné pour tenir dans deux centimètres trouve un
        // nombre faux et croit avoir travaillé.
        // La consigne dit ce que la correction montre : le calcul est dans le
        // « Or », et le « Donc » ne porte que la réponse.
        consigne: (items) => 'Rédige comme au cahier : « Je sais que » les données de '
            + 'l\'énoncé, « Or » l\'égalité de Pythagore écrite pour CE triangle puis '
            + 'le calcul étape par étape, « Donc » la longueur cherchée — sans oublier '
            + 'la ligne qui revient du carré à la longueur.'
            + (items && items.some(i => i.meta && i.meta.presentation !== 'texte')
                ? ' Les figures ne sont PAS en vraie grandeur : ne mesure pas.' : ''),
        previewGrille: pythagorePreviewHtml,
        pdfGrille: dessinerPythagorePdf,
        nomBloc: 'Exercice', nomBlocs: 'exercices',
        // Un bloc LARGE, L'ÉNONCÉ À GAUCHE ET LES LIGNES À DROITE — ET ASSEZ
        // HAUT POUR LES NEUF LIGNES QU'IL PORTE. À 0,36 de sa largeur il en
        // faisait quarante millimètres de contenu dans trente-deux : le
        // « Donc » de chaque bloc allait s'écrire dans le bloc du dessous, et
        // la ligne de la réponse tombait par-dessus l'énoncé suivant.
        proportions: { w: 1, h: 0.52 },
        titreAGauche: true,
        disposition: { cols: 2, rows: 3, maxCols: 2, maxRows: 4 },
        parLigneDefaut: 2
    },
};
