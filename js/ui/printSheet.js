// Fiches à imprimer.
//
// Certains exercices valent autant sur papier qu'à l'écran — les grilles en
// tête : on y rature, on note ses candidats, on gomme. Ce module ouvre une
// modale avec un APERÇU fidèle de la page A4 paysage, puis DESSINE le PDF
// (jsPDF) : traits, cases, étiquettes — pas une capture de page web. Le
// fichier se télécharge directement, les solutions occupent la page 2.
//
// L'aperçu et le PDF partagent la même fonction de mise en page, en
// millimètres : ce qu'on voit est ce qu'on imprime, au facteur d'échelle
// près. Le nombre de grilles se règle en colonnes × lignes — c'est la
// géométrie de la feuille, autant la demander telle quelle.
//
// Le cas par cas est assumé : un exercice s'inscrit en déclarant
// `printable: '<cle>'` au catalogue et en fournissant son dessin de grille ;
// la page, l'en-tête et la page des solutions sont communs.

import { getGenerator, generateurDeFiche } from '../core/registry.js';
import { makeRng } from '../core/ids.js';
import { dessinerChemin } from '../core/cheminSvg.js';
import {
    FLECHES as FLECHES_Q, FAMILLES as FAMILLES_Q, POSITIONS as POSITIONS_Q,
    traitsDeCondition as traitsQ, posEtiquette as posEtiquetteQ, cleFleche as cleFlecheQ,
    boiteCondition as boiteCondQ,
    CASE_L as CASE_L_Q, CASE_H as CASE_H_Q,
    COND_L as COND_L_Q, COND_H as COND_H_Q, PLAN_L as PLAN_L_Q, PLAN_H as PLAN_H_Q,
    coinsArrondis as coinsArrondisQ,
    pointeDe as pointeDeQ,
    BANDE_NOM as BANDE_NOM_Q, COULEURS_FAMILLE as COULEURS_Q,
    COULEUR_FIGURE as FIGURE_Q, COULEUR_BANDE as BANDE_Q
} from '../core/quadrilateres.js';
import { pointsDe as pointsDeTrigo } from '../core/trigonometrie.js';
import { ETAPES as ETAPES_RAISONNEMENT, trame as trameRaisonnement } from '../core/raisonnement.js';
// LA SOLUTION DES TROIS CASSE-TÊTE, POSITION PAR POSITION. Rémy : « pour les
// solutions des grenouilles, parking, hanoï, dessine des vignettes des étapes
// pour la correction. » Les noyaux savent jouer la partie parfaite ; la
// feuille n'a plus qu'à la dessiner.
import { etapesBrahma } from '../core/tourBrahma.js';
import { etapesGrenouilles } from '../core/grenouilles.js';
import { etapesParking } from '../core/parking.js';
// `relire` : relit un calcul récrit à la main et refait sa cascade — voir
// `retoucheGrille` du rendu « priorites ».
import { relire as relirePriorites } from '../core/priorites.js';
import { GLYPHES, egyptianSvgCadre, placerGlyphes } from '../core/figures.js';
import { tracesDe, branchesCroix, TAILLE_CROIX } from '../core/cercleFigure.js';
import { pourPdf, polycopieEnCouleur, modePolycopie, reglerModePolycopie,
    optionsPolycopie, teindreDoc, poserTeinte, teindreHtml, encre,
    ficheEnPortrait, reglerFichePortrait
} from './ficheRendu.js';
import { equiperFenetre } from './flottant.js';
// Les réglages qu'on ne règle qu'une fois se rangent derrière un repli.
import { retenirRepli } from './repli.js';
// Le détachement est un outil d'auteur : l'interrupteur vit dans la palette.
import { fenetresDetachables } from './debugBar.js';
import { paramSchemaOf } from '../data/catalog.js';
import {
    ajusterAuCarre, ajusterAuRectangle, insecable, cheminSerpentin,
    boiteDe as boiteCaseDomino, cellulesDe
} from '../core/dominos.js';
import { marqueSvg as marqueSvgRelier } from '../core/relier.js';
import { caseCentrale } from '../core/quadrillageSvg.js';
import { CASES as CASES_HEXA } from '../core/hexagrille.js';
import { R as R_HEXA, SOMMETS as SOMMETS_HEXA, centre as centreHexa,
    repereFleche as repereFlecheHexa, cadreHexagrille } from '../core/hexagrilleFigure.js';
import { placeNoms, ancrageNom, ECART_NOM } from '../core/thales.js';
import { LIGNES_CADRE as LIGNES_CADRE_Q } from '../core/generators/thalesRedactionFiche.js';
import { MC_DEF, disposerMotsCroises } from '../core/dispositionMotsCroises.js';
import { ecrireElement } from '../core/elementSymetrie.js';
import { SENS as SENS_ROTATION } from '../core/transformations.js';
import { pieceSvg, dessinerPiecePdf, direPiece, MENTION_PIECES } from './piecesEchecs.js';
import { INGREDIENTS as INGREDIENTS_FICHE } from '../core/pizza.js';
import { ecrire as ecrireProp } from '../core/proportion.js';
import {
    dessiner as dessinerNoyau, aretesCachees as aretesCacheesNoyau,
    facesVisibles as facesVisiblesNoyau
} from '../core/solides.js';
import { cubesAPeindre, facesCube, boiteDessin } from '../core/cubes.js';
import {
    cotesDe as cotesDePythagore, etapesCalcul as etapesCalculPythagore,
    ligneEnTexte as ligneEnTextePythagore
} from '../core/pythagore.js';
import { boite as boiteTangram } from '../core/tangram.js';
import { THEMES as THEMES_MOTCODE } from '../core/motCode.js';
import {
    construireFigure as construireFigureCodage,
    classesDeLongueur as classesDeLongueurCodage,
    anglesDroitsDe as anglesDroitsDeCodage,
    NOM_TYPE as NOM_TYPE_CODAGE
} from '../core/codage.js';
import {
    contourSecteur as contourSecteurAngle, equerreDe as equerreAngle,
    mesureArc as mesureArcAngle, ancreArc as ancreArcAngle,
    rayonSecteur as rayonSecteurAngle, boiteFigure as boiteFigureAngle,
    HAUTEUR_ETIQUETTE as HAUTEUR_ETIQ_ANGLE, etiquetteDedans as etiqDedansAngle
} from '../core/anglesRemarquables.js';
import { sommets as sommetsAngles } from '../core/anglesRemarquablesSvg.js';
import {
    pointsProjetes as pointsProjetesCodage,
    traitsDeMarque as traitsDeMarqueCodage,
    pointsAngleDroit as pointsAngleDroitCodage
} from '../core/codageSvg.js';
// LES BLOCS SCRATCH VIENNENT DU MÊME MOULE QUE CEUX DE L'ÉCRAN. Rémy : « les
// blocs rendus en PDF ne sont pas les mêmes que les vrais » — ils le sont
// maintenant, parce que la forme n'est plus écrite deux fois.
import {
    U as UBLOC, silhouette, gelule, versSvg as blocVersSvg, versPdf as blocVersPdf,
    largeurTexte as largeurTexteBloc, largeurChamp
} from '../core/blocScratch.js';
// COMBIEN DE GRILLES, ET RIEN D'AUTRE : la disposition se calcule, elle ne se
// règle plus. Le même module sert à placer les blocs et à choisir leur nombre.
import {
    mesuresSlot, choisirDisposition, capaciteMax, coteLisible, dispositionDuRendu
} from '../core/dispositionFiche.js';
import { monterPanneauContenu } from './panneauContenu.js';
// Poser une opération, c'est ranger des chiffres PAR RANG ; la virgule marque
// une frontière, elle n'est pas un chiffre. Le noyau le dit, la feuille le lit.
import { decimales as decimalesPose, rangsDe as rangsPose, enFrancais } from '../core/poser.js';

/** « un losange » -> « Un losange » : le mot se pose sous la figure. */
const nomTypeCodage = (type) => {
    const n = NOM_TYPE_CODAGE[type] || '';
    return n.charAt(0).toUpperCase() + n.slice(1);
};

// --- Mise en page (millimètres, A4 paysage) ---------------------------------

// LA PAGE, ORIENTABLE. Le paysage convient à six pendules ou neuf rectangles ;
// un treillis de Garam, plus haut que large, veut du portrait. On échange donc
// la largeur et la hauteur au lieu de figer l'une des deux — tout le reste de
// la mise en page se calcule à partir d'elles.
const PAGE = { w: 297, h: 210, marge: 9, enteteH: 17, piedH: 6 };
function orienterPage(portrait) {
    const grand = Math.max(PAGE.w, PAGE.h), petit = Math.min(PAGE.w, PAGE.h);
    PAGE.w = portrait ? petit : grand;
    PAGE.h = portrait ? grand : petit;
}
const ENCRE = { trait: [26, 32, 44], grille: [176, 182, 197], donnee: [238, 240, 250],
    texte: [45, 55, 72], gris: [110, 118, 132] };

/**
 * Positionne `cols × rows` blocs carrés (titre + grille) dans la zone utile.
 * Renvoie des millimètres ; l'aperçu multiplie par son échelle, le PDF les
 * utilise tels quels.
 */
function calculerFiche(cols, rows, colles = false) {
    // BLOCS COLLÉS : les cartes à découper se touchent par leur bordure.
    //
    // Rémy : « pour le memory des tables, COLLE les cartes par leur bordure,
    // les espaces entre sont un enfer pour les découper vite ». Une gouttière
    // oblige à deux coups de ciseaux là où un seul suffit, et à viser au
    // milieu du blanc ; bord à bord, un massicot traverse la page d'un trait
    // et sort toute une colonne de cartes. Le titre du bloc disparaît avec la
    // gouttière : il n'a plus où se poser, et une carte à jouer ne porte pas
    // d'étiquette « Paire 3 ».
    //
    // LES LONGUEURS SE CALCULENT DANS LE NOYAU, pas ici : c'est le même calcul
    // qui sert à CHOISIR la disposition à partir d'un simple « combien ». Deux
    // copies de cette arithmétique, et la taille annoncée au professeur cesse
    // un jour de correspondre à la feuille.
    const { gapX, gapY, titreH, zone, slotW, slotH, board } = mesuresSlot(PAGE, cols, rows, colles);
    const y0 = zone.y;
    const H = zone.h;

    const slots = [];
    for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
            const xSlot = PAGE.marge + i * (slotW + gapX);
            const ySlot = y0 + j * (slotH + gapY);
            slots.push({
                titre: { x: xSlot + slotW / 2, y: ySlot + titreH - 1.2 },
                // Le carré inscrit, pour les grilles carrées…
                x: xSlot + (slotW - board) / 2,
                y: ySlot + titreH + (slotH - titreH - board) / 2,
                taille: board,
                // … et la boîte complète, pour les treillis larges (Garam) :
                // un emplacement carré y donnerait des cases minuscules.
                boite: { x: xSlot, y: ySlot + titreH, w: slotW, h: slotH - titreH }
            });
        }
    }
    // Les traits de séparation passent au milieu des gouttières : de quoi les
    // tracer sans redéfinir la mise en page ailleurs.
    const traits = [];
    for (let i = 1; i < cols; i++) {
        const x = PAGE.marge + i * (slotW + gapX) - gapX / 2;
        traits.push({ x1: x, y1: y0 - 1, x2: x, y2: y0 + H });
    }
    for (let j = 1; j < rows; j++) {
        const y = y0 + j * (slotH + gapY) - gapY / 2;
        traits.push({ x1: PAGE.marge, y1: y, x2: PAGE.w - PAGE.marge, y2: y });
    }
    return { slots, board, traits };
}

// --- jsPDF, chargé au premier besoin ----------------------------------------

let jsPDFPromise = null;
export function chargerJsPDF() {
    if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
    if (!jsPDFPromise) {
        jsPDFPromise = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            // SERVIE AVEC L'APPLICATION, plus depuis un CDN. Le professeur qui
            // prépare sa fiche derrière le filtre de son établissement voyait
            // « PDF indisponible » sans rien pouvoir y faire — et la fiche est
            // justement ce qu'on emporte quand le réseau n'est pas là.
            s.src = './vendor/jspdf/jspdf.umd.min.js';
            s.onload = () => {
                if (window.jspdf && window.jspdf.jsPDF) resolve(window.jspdf.jsPDF);
                else { jsPDFPromise = null; reject(new Error('jsPDF illisible')); }
            };
            s.onerror = () => { jsPDFPromise = null; reject(new Error('jsPDF inaccessible')); };
            document.head.appendChild(s);
        });
    }
    return jsPDFPromise;
}

// --- Dessin d'une grille Mathdoku -------------------------------------------

function cageMap(item) {
    const { n, cages } = item.meta;
    const m = Array.from({ length: n }, () => Array(n).fill(-1));
    cages.forEach((cage, i) => cage.cells.forEach(p => { m[p.r][p.c] = i; }));
    return m;
}

/**
 * Dessine une grille dans le PDF à (x, y), côté `taille` mm.
 * Ordre des couches : fonds, quadrillage fin, bordures de cages, textes —
 * le même que le jeu, pour le même dessin.
 */
function dessinerGrillePdf(doc, item, slot, solution, champ) {
    const { x, y, taille } = slot;
    const { n, cages, solution: sol } = item.meta;
    const s = taille / n;
    const de = cageMap(item);

    doc.setFillColor(...ENCRE.donnee);
    for (const cage of cages) {
        if (cage.op !== null) continue;
        const { r, c } = cage.cells[0];
        doc.rect(x + c * s, y + r * s, s, s, 'F');
    }

    doc.setDrawColor(...ENCRE.grille);
    doc.setLineWidth(0.12);
    for (let i = 1; i < n; i++) {
        doc.line(x + i * s, y, x + i * s, y + taille);
        doc.line(x, y + i * s, x + taille, y + i * s);
    }

    doc.setDrawColor(...ENCRE.trait);
    doc.setLineWidth(0.55);
    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            const ci = de[r][c];
            if (r === 0 || de[r - 1][c] !== ci) doc.line(x + c * s, y + r * s, x + (c + 1) * s, y + r * s);
            if (c === 0 || de[r][c - 1] !== ci) doc.line(x + c * s, y + r * s, x + c * s, y + (r + 1) * s);
        }
    }
    doc.rect(x, y, taille, taille, 'S');

    const policeEtiquette = Math.min(8, Math.max(4.6, s * 0.62));
    const policeValeur = Math.min(20, s * 1.55);
    for (const cage of cages) {
        const { r, c } = cage.cells[0];
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(policeEtiquette);
        doc.setTextColor(90, 98, 112);
        // Le signe moins typographique (U+2212) n'existe pas dans les polices
        // standard du PDF : il sortait en guillemet. Le tiret ASCII s'imprime
        // pareil à cette taille. La baseline colle l'étiquette au coin —
        // 0,72 em d'ascendante au-dessus, un pt ≈ 0,353 mm.
        doc.text(pourPdf(cage.label),
            x + c * s + 0.5, y + r * s + 0.35 + policeEtiquette * 0.72 * 0.353);
    }
    doc.setTextColor(...ENCRE.texte);
    doc.setFontSize(policeValeur);
    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            const donnee = cages[de[r][c]].op === null;
            if (!solution && !donnee) {
                // Case à remplir : un champ si la fiche est remplissable.
                if (champ) champ(x + c * s + s * 0.12, y + r * s + s * 0.12, s * 0.76, s * 0.76);
                continue;
            }
            doc.text(String(sol[r][c]), x + c * s + s / 2, y + r * s + s / 2,
                { align: 'center', baseline: 'middle' });
        }
    }
}

/** La même grille en HTML pour l'aperçu, aux mêmes proportions (k px/mm). */
function grillePreviewHtml(item, slot, k, solution, champs) {
    const { n, cages, solution: sol } = item.meta;
    const s = (slot.taille / n) * k;
    const de = cageMap(item);

    let html = `<table class="fp-grille" style="left:${slot.x * k}px; top:${slot.y * k}px;">`;
    for (let r = 0; r < n; r++) {
        html += '<tr>';
        for (let c = 0; c < n; c++) {
            const ci = de[r][c];
            const cage = cages[ci];
            const bords = [
                r === 0 || de[r - 1][c] !== ci ? 'border-top:1.6px solid #1a202c;' : '',
                c === n - 1 || de[r][c + 1] !== ci ? 'border-right:1.6px solid #1a202c;' : '',
                r === n - 1 || de[r + 1][c] !== ci ? 'border-bottom:1.6px solid #1a202c;' : '',
                c === 0 || de[r][c - 1] !== ci ? 'border-left:1.6px solid #1a202c;' : ''
            ].join('');
            const donnee = cage.op === null;
            const premiere = cage.cells[0].r === r && cage.cells[0].c === c;
            const vide = champs && !donnee && !solution;
            html += `<td class="${vide ? 'fp-case--champ' : ''}" style="width:${s}px; height:${s}px; font-size:${s * 0.5}px; ${bords}${donnee ? 'background:#eef0fa;' : ''}">
                ${premiere ? `<span class="fp-etiquette" style="font-size:${Math.max(6, s * 0.26)}px">${cage.label}</span>` : ''}
                ${solution || donnee ? sol[r][c] : ''}</td>`;
        }
        html += '</tr>';
    }
    return html + '</table>';
}

// --- LES PLATEAUX À JOUER SUR PAPIER : puissance 4 et sim ---------------------
//
// Rémy : « on pourrait avoir un pdf de grille vide », « un pdf de jeu vide ».
// Ce ne sont pas des exercices à corriger, ce sont des SUPPORTS : on imprime,
// on distribue, deux élèves jouent au crayon de couleur. La correction n'a
// donc rien à montrer — c'est le même plateau vide, et c'est normal.

/** La boîte d'un bloc, quelle que soit la façon dont le gabarit l'a posée. */
const boiteDe = (slot) => slot.boite || { x: slot.x, y: slot.y, w: slot.taille, h: slot.taille };

/** La grille du puissance 4 : un rectangle de cercles, colonnes numérotées. */
function geoP4(item, slot) {
    const b = boiteDe(slot);
    const { cols, rows } = item.meta;
    // Une bande en haut pour les numéros de colonne : sans eux, on ne peut
    // pas dire « je joue la 4 » à voix haute.
    const tete = Math.min(6, b.h * 0.09);
    const pas = Math.min((b.w - 2) / cols, (b.h - tete - 2) / rows);
    const w = pas * cols, h = pas * rows;
    return { b, cols, rows, pas, tete, x: b.x + (b.w - w) / 2, y: b.y + tete + (b.h - tete - h) / 2, w, h };
}

function p4PreviewHtml(item, slot, k) {
    const g = geoP4(item, slot);
    const T = (v) => (v * k).toFixed(2);
    let html = `<div class="fx-plat" style="left:${T(g.x)}px; top:${T(g.y)}px;
        width:${T(g.w)}px; height:${T(g.h)}px"></div>`;
    for (let c = 0; c < g.cols; c++) {
        html += `<div class="fx-plat-num" style="left:${T(g.x + c * g.pas)}px;
            top:${T(g.y - g.tete)}px; width:${T(g.pas)}px; height:${T(g.tete)}px;
            font-size:${T(g.tete * 0.72)}px">${c + 1}</div>`;
        for (let r = 0; r < g.rows; r++) {
            const d = g.pas * 0.76;
            html += `<div class="fx-plat-trou" style="left:${T(g.x + c * g.pas + (g.pas - d) / 2)}px;
                top:${T(g.y + r * g.pas + (g.pas - d) / 2)}px; width:${T(d)}px; height:${T(d)}px"></div>`;
        }
    }
    return html;
}

function dessinerP4Pdf(doc, item, slot) {
    const g = geoP4(item, slot);
    doc.setDrawColor(...ENCRE.trait);
    doc.setLineWidth(0.6);
    doc.roundedRect(g.x, g.y, g.w, g.h, 1.4, 1.4, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(Math.min(11, g.tete * 2.4));
    doc.setTextColor(...ENCRE.gris);
    for (let c = 0; c < g.cols; c++) {
        doc.text(String(c + 1), g.x + c * g.pas + g.pas / 2, g.y - g.tete * 0.28,
            { align: 'center', baseline: 'alphabetic' });
    }
    doc.setDrawColor(...ENCRE.grille);
    doc.setLineWidth(0.3);
    for (let c = 0; c < g.cols; c++) for (let r = 0; r < g.rows; r++) {
        doc.circle(g.x + c * g.pas + g.pas / 2, g.y + r * g.pas + g.pas / 2, g.pas * 0.38, 'S');
    }
}

/** Le sim : six points en hexagone, numérotés, et rien d'autre. */
function geoSim(item, slot) {
    const b = boiteDe(slot);
    // Une bande en bas pour la légende des deux couleurs.
    const pied = Math.min(7, b.h * 0.12);
    const R = Math.max(6, Math.min(b.w, b.h - pied) / 2 - 5);
    const cx = b.x + b.w / 2, cy = b.y + (b.h - pied) / 2;
    const pts = Array.from({ length: 6 }, (_, i) => {
        const a = (-90 + i * 60) * Math.PI / 180;
        return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
    });
    return { b, R, cx, cy, pied, pts, rayonPoint: Math.max(1.4, R * 0.055) };
}

/** Un point poussé vers l'extérieur de l'hexagone, à distance fixe. */
function dehors(g, p) {
    const dx = p.x - g.cx, dy = p.y - g.cy;
    const d = Math.hypot(dx, dy) || 1;
    const ecart = g.rayonPoint * 2 + 2.4;
    return [p.x + (dx / d) * ecart, p.y + (dy / d) * ecart];
}

function simPreviewHtml(item, slot, k) {
    const g = geoSim(item, slot);
    const T = (v) => (v * k).toFixed(2);
    let html = '';
    g.pts.forEach((p, i) => {
        const d = g.rayonPoint * 2;
        html += `<div class="fx-plat-pt" style="left:${T(p.x - g.rayonPoint)}px;
            top:${T(p.y - g.rayonPoint)}px; width:${T(d)}px; height:${T(d)}px"></div>`;
        // L'étiquette est posée VERS L'EXTÉRIEUR, à distance FIXE du point :
        // proportionnelle au rayon, elle se posait sur le point lui-même dans
        // les petits plateaux — et le point est ce qu'on relie.
        const [ex, ey] = dehors(g, p);
        html += `<div class="fx-plat-num" style="left:${T(ex - 3)}px; top:${T(ey - 2.4)}px;
            width:${T(6)}px; height:${T(4.8)}px; font-size:${T(3.8)}px">${i + 1}</div>`;
    });
    html += `<div class="fx-plat-leg" style="left:${T(g.b.x)}px; top:${T(g.b.y + g.b.h - g.pied)}px;
        width:${T(g.b.w)}px; font-size:${T(3.1)}px">Un crayon de couleur chacun.</div>`;
    return html;
}

function dessinerSimPdf(doc, item, slot) {
    const g = geoSim(item, slot);
    doc.setFillColor(...ENCRE.trait);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(Math.min(11, g.R * 0.34));
    g.pts.forEach((p, i) => {
        doc.circle(p.x, p.y, g.rayonPoint, 'F');
        const [ex, ey] = dehors(g, p);
        doc.setTextColor(...ENCRE.texte);
        doc.text(String(i + 1), ex, ey, { align: 'center', baseline: 'middle' });
        doc.setFillColor(...ENCRE.trait);
    });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...ENCRE.gris);
    doc.text(pourPdf('Un crayon de couleur chacun.'),
        g.b.x + g.b.w / 2, g.b.y + g.b.h - g.pied * 0.35, { align: 'center' });
}

// --- LES ANAGRAMMES SUR PAPIER ------------------------------------------------
//
// Une ligne par mot : les lettres mélangées à gauche, la définition, puis
// autant de cases que de lettres. Les cases FONT l'exercice — sans elles on ne
// sait pas quand on a fini, et « RACER » pourrait donner « CRAER ».

function geoAnagrammes(item, slot) {
    const b = boiteDe(slot);
    const lignes = item.meta.lignes || [];
    const n = Math.max(1, lignes.length);
    const hLigne = Math.min(16, (b.h - 2) / n);
    // La case doit rester lisible même sur le mot le plus long de la feuille.
    const maxLettres = Math.max(4, ...lignes.map(l => l.mot.length));
    const colMelange = b.w * 0.26;
    const largeurCases = Math.min(b.w * 0.42, maxLettres * hLigne * 0.52);
    const cote = largeurCases / maxLettres;
    // UN SEUL CORPS POUR TOUTES LES DÉFINITIONS DE L'EXERCICE : celui de la
    // plus longue. Calculé ligne par ligne, « Six faces carrées identiques »
    // s'écrivait deux fois plus gros que la définition d'à côté, et la colonne
    // avait l'air bricolée. C'est la même raison qui aligne les « = » de la
    // fiche des pharaons : sur une feuille, l'irrégularité se voit avant le
    // contenu.
    const tailleDef = lignes.reduce((mini, l) => Math.min(mini, tailleDefinition(
        hLigne,
        Math.max(10, b.w * 0.74 - MARGE_DEF - cote * l.mot.length - 3),
        String(l.def || '').length
    )), hLigne * 0.30);
    return { b, lignes, hLigne, colMelange, cote, maxLettres, tailleDef,
        avecDef: item.meta.avecDef !== false };
}

/**
 * LES LETTRES MÉLANGÉES TIENNENT DANS LEUR COLONNE. Écrites à taille fixe, un
 * mot de douze lettres débordait sur la définition d'à côté — deux textes
 * superposés, illisibles tous les deux. La taille suit donc la longueur.
 *
 * Rémy : « pour l'anagramme, c'est qu'en PDF le mot mélangé et la définition
 * se superposent ». Deux erreurs de mesure se cumulaient. La largeur d'une
 * lettre d'abord : 0,66 em vaut pour du texte courant, mais un mélange est
 * tout en CAPITALES GRASSES — un M fait 0,83 em, un O 0,78 —, et il faut y
 * ajouter l'interlettrage de 0,08 em qui aère la suite. La marge ensuite : il
 * n'y en avait aucune, si bien qu'un mot « qui tient tout juste » venait
 * toucher la définition. AVANCE couvre les deux, MARGE_DEF sépare.
 */
const AVANCE_MELANGE = 0.80;
const MARGE_DEF = 3;
/**
 * LA DÉFINITION TIENT DANS SA LIGNE, ET NE MORD PAS SUR LA SUIVANTE.
 *
 * Rémy : « en anagramme, il y a toujours un souci de présentation ». Sur une
 * feuille de parcours, où le bloc est plus étroit, « Deux droites qui ne se
 * croisent jamais, même très loin » demandait trois lignes dans une place qui
 * n'en offrait que deux : la définition débordait sur le mot d'en dessous, et
 * deux textes se superposaient.
 *
 * Le corps se DÉDUIT de la place. Un texte de n signes écrit au corps t occupe
 * à peu près n × t / 2 en longueur ; il lui faut donc n × t / (2 × largeur)
 * lignes, chacune haute de 1,15 t. Poser que ce produit tient dans la hauteur
 * offerte donne directement t — une racine carrée, et plus aucune surprise.
 */
function tailleDefinition(hLigne, largeur, n) {
    const t = Math.sqrt(hLigne * 0.86 * Math.max(10, largeur) / (0.575 * Math.max(8, n)));
    return Math.max(1.9, Math.min(hLigne * 0.30, t));
}

/** La largeur qui reste à la définition, une fois le mélange et les cases posés. */
function largeurDefinition(g, ligne) {
    return Math.max(10, g.b.w - g.colMelange - MARGE_DEF - g.cote * ligne.mot.length - 3);
}

function tailleMelange(g, ligne) {
    const large = g.hLigne * 0.42;
    const tenu = (g.colMelange - MARGE_DEF)
        / Math.max(4, ligne.melange.length * AVANCE_MELANGE);
    return Math.max(g.hLigne * 0.2, Math.min(large, tenu));
}

function anagrammesPreviewHtml(item, slot, k, solution) {
    const g = geoAnagrammes(item, slot);
    const T = (v) => (v * k).toFixed(2);
    let html = '';
    g.lignes.forEach((l, i) => {
        const y = g.b.y + i * g.hLigne;
        html += `<div class="fx-ana-mel" style="left:${T(g.b.x)}px; top:${T(y + g.hLigne * 0.18)}px;
            width:${T(g.colMelange)}px; font-size:${T(tailleMelange(g, l))}px">${echapperSheet(l.melange)}</div>`;
        if (g.avecDef) {
            const largeurDef = largeurDefinition(g, l);
            html += `<div class="fx-ana-def" style="left:${T(g.b.x + g.colMelange + MARGE_DEF)}px;
                top:${T(y)}px; width:${T(largeurDef)}px; height:${T(g.hLigne)}px;
                font-size:${T(g.tailleDef)}px">${echapperSheet(l.def)}</div>`;
        }
        const x0 = g.b.x + g.b.w - g.cote * l.mot.length;
        for (let c = 0; c < l.mot.length; c++) {
            html += `<div class="fx-ana-case" style="left:${T(x0 + c * g.cote)}px;
                top:${T(y + g.hLigne * 0.12)}px; width:${T(g.cote)}px; height:${T(g.cote)}px;
                font-size:${T(g.cote * 0.62)}px">${solution ? l.mot[c] : ''}</div>`;
        }
    });
    return html;
}

function dessinerAnagrammesPdf(doc, item, slot, solution, champ) {
    const g = geoAnagrammes(item, slot);
    g.lignes.forEach((l, i) => {
        const y = g.b.y + i * g.hLigne;
        doc.setFont('helvetica', 'bold');
        // LA MÊME TAILLE QU'À L'APERÇU. Elle valait « × 2,5 », une échelle
        // sans rapport avec le millimètre : le PDF écrivait plus petit que
        // l'aperçu, et c'est l'aperçu qui décidait des largeurs. 1 pt vaut
        // 0,3528 mm — c'est la conversion qu'emploie déjà le reste du module.
        const taille = tailleMelange(g, l);
        doc.setFontSize(taille / 0.3528);
        doc.setTextColor(...ENCRE.texte);
        doc.text(pourPdf(l.melange), g.b.x, y + g.hLigne * 0.55,
            { baseline: 'middle', charSpace: taille * 0.08 });

        if (g.avecDef) {
            doc.setFont('helvetica', 'normal');
            const largeur = largeurDefinition(g, l);
            const taille = g.tailleDef;
            doc.setFontSize(taille / 0.3528);
            doc.setTextColor(...ENCRE.gris);
            const morceaux = doc.splitTextToSize(pourPdf(l.def), largeur);
            // Le paragraphe est CENTRÉ dans sa ligne, du haut vers le bas : au
            // milieu, deux lignes débordaient d'un demi-interligne de chaque
            // côté et venaient toucher les voisines.
            const interligne = taille * 1.15;
            const haut = y + (g.hLigne - morceaux.length * interligne) / 2 + taille * 0.85;
            morceaux.forEach((part, j) => {
                doc.text(part, g.b.x + g.colMelange + MARGE_DEF, haut + j * interligne);
            });
        }

        const x0 = g.b.x + g.b.w - g.cote * l.mot.length;
        doc.setDrawColor(...ENCRE.trait);
        doc.setLineWidth(0.35);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(Math.min(13, g.cote * 1.4));
        doc.setTextColor(...ENCRE.texte);
        for (let c = 0; c < l.mot.length; c++) {
            const x = x0 + c * g.cote, yc = y + g.hLigne * 0.12;
            doc.rect(x, yc, g.cote, g.cote, 'S');
            if (solution) {
                doc.text(l.mot[c], x + g.cote / 2, yc + g.cote / 2,
                    { align: 'center', baseline: 'middle' });
            } else if (champ) {
                champ(x + g.cote * 0.1, yc + g.cote * 0.1, g.cote * 0.8, g.cote * 0.8);
            }
        }
    });
}

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

const ENCRE_ANGLE = {
    donne: { fond: [253, 224, 160], trait: [199, 120, 0] },
    cherche: { fond: [200, 236, 218], trait: [31, 122, 77] },
    relais: { fond: [222, 226, 245], trait: [91, 107, 191] }
};

function geoAnglesManquants(item, slot, partLigne = 0.2) {
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

/** L'étiquette d'un arc : sa mesure, un « ? », ou le numéro d'un pas. */
function texteArcAngle(arc, solution) {
    if (arc.role === 'donne') return `${mesureArcAngle(arc)}°`;
    if (solution) return `${mesureArcAngle(arc)}°`;
    // LE RELAIS PORTE SON NUMÉRO, l'angle cherché garde son « ? ». Le numéro
    // dit par où passer ; c'est le point d'interrogation qui dit quoi rendre.
    return arc.role === 'relais' && arc.pas ? String(arc.pas) : '?';
}

/**
 * LE DESSIN SEUL — sans la ligne de réponse, qui n'est pas la même selon qu'on
 * demande une MESURE ou un NOM. `etiquette` dit ce qu'on écrit dans chaque
 * secteur : sa mesure, un « ? », ou son numéro.
 */
function figureAnglePreviewHtml(g, k, etiquette) {
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
function ligneAnglePreviewHtml(g, k, amorce, rep) {
    const T = (v) => (v * k).toFixed(2);
    return `<div class="fx-ligne-rep" style="left:${T(g.b.x + 2)}px;
        top:${T(g.b.y + g.dispoH)}px; width:${T(g.b.w - 4)}px; height:${T(g.ligneH * 0.8)}px;
        font-size:${T(g.taille)}px"><b>${echapperSheet(amorce)}</b>&nbsp;<i>${echapperSheet(rep)}</i></div>`;
}

function anglesManquantsPreviewHtml(item, slot, k, solution) {
    const g = geoAnglesManquants(item, slot);
    return figureAnglePreviewHtml(g, k, (arc) => texteArcAngle(arc, solution))
        + ligneAnglePreviewHtml(g, k, '? =', solution ? `${g.m.reponse}°` : '');
}

function dessinerFigureAnglePdf(doc, g, etiquette) {
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
function ligneReponsePdf(doc, g, amorce, rep) {
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
    const ligneH = Math.max(4.5, Math.min(b.h * 0.15, 6.5));
    // LA QUESTION EST SUR LE BLOC, pas dans la consigne commune. Chaque figure
    // pose la sienne — « que représente le segment [OA] ? » —, et une consigne
    // commune ne pourrait pas les dire toutes. Elle prend donc sa ligne, en
    // haut, comme sur une fiche de manuel.
    const corpsQ = Math.max(2.4, Math.min(b.w / 26, 3.4));
    const lignesQ = couperEnLignes(item.meta.enonce || '', Math.floor(b.w / (corpsQ * 0.46)), 2);
    const hQuestion = lignesQ.length * corpsQ * 1.3 + 1;
    const cote = Math.min(b.w - marge * 2, b.h - ligneH - hQuestion - marge);
    const x0 = b.x + (b.w - cote) / 2;
    const y0 = b.y + hQuestion;
    // Les tracés sont donnés dans un carré de 100 : on les y ramène.
    const P = (p) => ({ x: x0 + (p.x / 100) * cote, y: y0 + (p.y / 100) * cote });
    const u = cote / 100;
    return {
        m: item.meta, b, cote, x0, y0, P, u, ligneH, corpsQ, lignesQ, hQuestion,
        taille: Math.max(2.4, Math.min(ligneH * 0.6, 3.6)),
        yReponse: b.y + b.h - marge,
        dispoH: b.h - ligneH
    };
}

/** Le trait d'un tracé, sur le papier : le gras porte l'information, pas la couleur. */
const epaisCercle = (t, u) => Math.max(0.25, (t.fort ? 1.15 : 0.4) * u * 1.6);

function cercleVocabulairePreviewHtml(item, slot, k, solution) {
    const g = geoCercleVocabulaire(item, slot);
    const T = (v) => (v * k).toFixed(2);
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
    return `<svg style="position:absolute; left:0; top:0; width:100%; height:100%;
        overflow:visible; pointer-events:none">${d}</svg>`
        + ligneAnglePreviewHtml(g, k, '', solution ? g.m.reponse : '');
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
    ligneReponsePdf(doc, g, '', solution ? g.m.reponse : '');
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
        taille: Math.max(2.4, Math.min(enonceH * 0.62, 4)),
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

/** L'énoncé du bloc, dans les trois sens. */
function enonceNotation(m) {
    const e = ECRITURES_NOTATION[m.objet](m.a, m.b);
    if (m.sens === 'ecrire') return 'Comment note-t-on cette figure ?';
    if (m.sens === 'dire') return `Comment se lit ${e} ?`;
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

// --- LES MOTS CROISÉS SUR PAPIER ----------------------------------------------
//
// La mise en page du journal : la grille, puis les définitions rangées en
// « Horizontalement » et « Verticalement ». Une grille par page — à deux, un
// 15 × 18 tombe sous trois millimètres par case.

function geoMotsCroises(item, slot) {
    const b = boiteDe(slot);
    const m = item.meta;
    return { b, m, ...disposerMotsCroises(b, m, m.defs) };
}

function motsCroisesPreviewHtml(item, slot, k, solution) {
    const g = geoMotsCroises(item, slot);
    const T = (v) => (v * k).toFixed(2);
    const offertes = new Map((g.m.offertes || []).map(o => [`${o.x},${o.y}`, o.lettre]));
    let html = '';
    for (let y = 0; y < g.m.hauteur; y++) {
        for (let x = 0; x < g.m.largeur; x++) {
            const c = g.m.cases[y][x];
            const X = g.x + x * g.cote, Y = g.y + y * g.cote;
            // ON NE DESSINE RIEN DU TOUT SUR UNE CASE MUETTE.
            //
            // Rémy : « les cases qui ne servent pas, ne les mets juste pas, on
            // ne doit voir que la grille des mots ». Elles étaient noircies —
            // un gâchis d'encre —, puis hachurées — moins d'encre, mais autant
            // de bruit. Or elles ne portent AUCUNE information : ce qui compte,
            // c'est la silhouette des mots, et elle se dessine toute seule dès
            // qu'on laisse le blanc autour. C'est la grille des mots croisés
            // « à l'américaine », celle des grilles de vacances.
            if (c === null) continue;
            const donnee = offertes.get(`${x},${y}`);
            const lettre = solution ? c : (donnee || '');
            const num = (g.m.numeros && g.m.numeros[`${x},${y}`]) || '';
            html += `<div class="fx-mc-case" style="left:${T(X)}px; top:${T(Y)}px;
                width:${T(g.cote)}px; height:${T(g.cote)}px; font-size:${T(g.cote * 0.6)}px">
                ${num ? `<span class="fx-mc-num" style="font-size:${T(g.cote * 0.3)}px">${num}</span>` : ''}
                ${echapperSheet(lettre)}</div>`;
        }
    }
    html += listeDefsHtml(g, k);
    return html;
}

/**
 * Les définitions, là où la disposition les a mises.
 *
 * ELLES COULENT, ELLES NE SE POSENT PLUS UNE PAR UNE. Rémy : « pour les mots
 * croisés, les définitions se superposent ». Chaque définition était placée à
 * un pas fixe fois son rang — et « Du même côté de la sécante, à la même place
 * sur chaque droite. (14) » tient sur deux lignes. La suivante lui passait
 * dessus, et l'on ne lisait plus ni l'une ni l'autre. On donne maintenant des
 * boîtes au navigateur, qui empile dedans mieux qu'aucun calcul de notre part.
 *
 * EN DESSOUS : deux boîtes côte à côte, une par liste. À CÔTÉ : une seule
 * boîte, les deux listes l'une sous l'autre — et c'est la RÉSERVE calculée
 * pour la première qui dit où commence la seconde, pour que le PDF, qui n'a
 * pas de navigateur, tombe au même endroit.
 */
function listeDefsHtml(g, k) {
    const T = (v) => (v * k).toFixed(2);
    const d = g.defs;
    // LES DÉFINITIONS OCCUPENT LEUR COLONNE. La grille est bornée par sa
    // largeur et ne peut pas grandir ; la colonne de texte, elle, restait
    // remplie à six pour cent. La mise en page dit maintenant de combien
    // grossir (voir `core/dispositionMotsCroises.js`).
    const M = d.mesures || MC_DEF;
    const bloc = (titre, liste, x, y) => `
        <div class="fx-mc-col" style="left:${T(x)}px; top:${T(y)}px;
            width:${T(d.largeur)}px; font-size:${T(M.corps)}px;
            line-height:${(M.pas / M.corps).toFixed(2)}">
            <div class="fx-mc-titre" style="font-size:${T(M.titre)}px;
                height:${T(M.apresTitre)}px; line-height:${T(M.titre * 1.2)}px">${titre}</div>
            ${liste.map(x2 => `<div class="fx-mc-def"><b>${x2.num}.</b> `
        + `${echapperSheet(x2.def)} (${x2.longueur})</div>`).join('')}
        </div>`;
    if (d.colonnes === 2) {
        return bloc('Horizontalement', g.m.horizontales, d.x, d.y)
            + bloc('Verticalement', g.m.verticales, d.x2, d.y);
    }
    return bloc('Horizontalement', g.m.horizontales, d.x, d.y)
        + bloc('Verticalement', g.m.verticales, d.x,
            d.y + d.hHoriz + M.entreListes);
}

/** Les mêmes définitions, écrites par jsPDF. */
function dessinerDefsPdf(doc, g) {
    const d = g.defs;
    // Le même grossissement qu'à l'aperçu : c'est le calcul de la mise en page
    // qui le donne, et les deux rendus le lisent au même endroit.
    const M = d.mesures || MC_DEF;
    const bloc = (titre, liste, x, y) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(M.titre / 0.3528);
        doc.setTextColor(...ENCRE.texte);
        doc.text(pourPdf(titre), x, y + M.titre);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(M.corps / 0.3528);
        doc.setTextColor(...ENCRE.gris);
        let ligne = y + M.apresTitre + M.corps;
        liste.forEach(def => {
            const morceaux = doc.splitTextToSize(
                pourPdf(`${def.num}. ${def.def} (${def.longueur})`), d.largeur - 1);
            doc.text(morceaux, x, ligne);
            ligne += morceaux.length * M.pas;
        });
    };
    if (d.colonnes === 2) {
        bloc('Horizontalement', g.m.horizontales, d.x, d.y);
        bloc('Verticalement', g.m.verticales, d.x2, d.y);
    } else {
        bloc('Horizontalement', g.m.horizontales, d.x, d.y);
        bloc('Verticalement', g.m.verticales, d.x,
            d.y + d.hHoriz + M.entreListes);
    }
}

// --- LE MOT CODÉ SUR PAPIER ---------------------------------------------------
//
// La grille en haut, la CLÉ en bas : autant de petites cases numérotées qu'il y
// a de lettres dans la grille, et l'élève écrit dedans la lettre qu'il a
// trouvée. Sans cette clé, il retient de tête que le 14 est un E et se trompe
// trois lignes plus bas ; avec elle, il écrit une fois et relit vingt fois. Le
// professeur, lui, corrige la clé et la grille suit.

/** Combien de cases de clé tiennent sur une ligne, et où tout se pose. */
function geoMotCode(item, slot) {
    const b = boiteDe(slot);
    const m = item.meta;
    const n = m.lettres.length;
    // LA CLÉ D'ABORD : c'est elle qui a une taille imposée — une case où l'on
    // écrit une lettre à la main ne descend pas sous cinq millimètres. Ce qui
    // reste va à la grille, qui sait se réduire.
    const coteCle = Math.max(5, Math.min(9, (b.w - 2) / Math.max(9, Math.ceil(n / 2))));
    const parLigne = Math.min(n, Math.max(1, Math.floor((b.w - 2) / coteCle)));
    const lignesCle = Math.ceil(n / parLigne);
    // Chaque rangée de clé porte sa case ET son numéro écrit dessous.
    const hCle = lignesCle * coteCle * 1.5 + 5;
    const dispoH = b.h - hCle - 2;
    const cote = Math.max(3, Math.min((b.w - 2) / m.largeur, dispoH / m.hauteur));
    const w = cote * m.largeur, h = cote * m.hauteur;
    return {
        b, m, cote, coteCle, parLigne, lignesCle,
        x: b.x + (b.w - w) / 2, y: b.y + (dispoH - h) / 2, w, h,
        // La clé est CENTRÉE sous la grille, qui l'est aussi : alignée à
        // gauche, elle donnait une page qui penche.
        xCle: b.x + (b.w - Math.min(n, parLigne) * coteCle) / 2,
        yCle: b.y + dispoH + 2
    };
}

/**
 * LES FLÈCHES DE L'ANNEAU, rangées par case.
 *
 * Elles disent où commence chaque mot et dans quel sens il se lit : c'est ce
 * qui remplace les définitions d'un mot croisé, et sans elles la grille de
 * Rémy n'est qu'un cadre de numéros muets.
 */
function flechesDe(m) {
    return new Map((m.fleches || []).map(f => [`${f.x},${f.y}`, f.type]));
}

/** Le tracé d'une flèche dans une case, en coordonnées 0..1. */
// DE VRAIES FLÈCHES. Rémy : « dessine de plus jolies flèches ». C'étaient trois
// segments — une hampe et deux barres obliques —, qui se lisaient comme un
// oiseau à cinq millimètres et se cassaient à la photocopie : les deux barres
// de la pointe s'y détachaient de la hampe.
//
// Une flèche se dessine d'un seul CHEMIN FERMÉ : la hampe est un rectangle, la
// pointe un triangle, et le tout est REMPLI. Un aplat de deux millimètres reste
// un aplat après trois générations de photocopie, là où trois traits fins
// deviennent trois traits gris.
//
// Les coordonnées sont dans une case unité (0…1), comme avant.
const HAMPE = 0.085;           // demi-épaisseur de la hampe
const POINTE = 0.26;           // longueur de la pointe
const AILE = 0.2;              // demi-envergure de la pointe

/**
 * Le chemin d'une flèche, d'un point de départ vers un point d'arrivée.
 * Les deux seules directions utiles ici sont « vers la droite » et « vers le
 * bas » ; on les fabrique par la même fonction pour qu'elles se ressemblent
 * exactement — deux dessins écrits séparément finissent toujours par différer.
 */
/**
 * LA FLÈCHE REND SES POINTS, PAS SON DESSIN.
 *
 * Elle rendait une chaîne SVG — « M 0.16 0.42 L … Z » —, ce qui allait très
 * bien à l'aperçu, qui la pose telle quelle dans un `<path d>`. Le PDF, lui,
 * était resté à la version d'AVANT, celle où une flèche n'était qu'une paire
 * de segments : il écrivait `traitsFleche(type).forEach(([a, b]) => …)`.
 *
 * DÉSTRUCTURER UNE CHAÎNE NE LÈVE AUCUNE ERREUR. `[a, b]` sur « M 0.16… »
 * donne le CARACTÈRE `'M'` et une espace ; `'M' * cote` vaut `NaN`, et jsPDF
 * s'arrête sur « Invalid arguments passed to jsPDF.line ». C'est le bug que
 * Rémy a rapporté : plus aucune fiche de parcours contenant un Mot Codé ne
 * sortait — et le message ne parlait ni de flèche, ni de mot codé.
 *
 * Les deux rendus partent maintenant des MÊMES POINTS, chacun les mettant en
 * forme à sa façon. Une flèche ne peut plus être dessinée d'un côté et pas de
 * l'autre : il n'y a plus deux descriptions à tenir d'accord.
 *
 * @returns {Array<[number, number]>} les sept sommets, en fraction de case
 */
function pointsFleche(x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0;
    const L = Math.hypot(dx, dy) || 1;
    const ux = dx / L, uy = dy / L;          // le sens de la flèche
    const nx = -uy, ny = ux;                 // sa perpendiculaire
    const bx = x1 - ux * POINTE, by = y1 - uy * POINTE;   // la base de la pointe
    return [
        [x0 + nx * HAMPE, y0 + ny * HAMPE],
        [bx + nx * HAMPE, by + ny * HAMPE],
        [bx + nx * AILE, by + ny * AILE],
        [x1, y1],
        [bx - nx * AILE, by - ny * AILE],
        [bx - nx * HAMPE, by - ny * HAMPE],
        [x0 - nx * HAMPE, y0 - ny * HAMPE]
    ];
}

/** Les mêmes points, pour l'attribut `d` d'un `<path>`. */
const cheminFleche = (pts) => 'M ' + pts
    .map(([x, y]) => `${x.toFixed(3)} ${y.toFixed(3)}`).join(' L ') + ' Z';

const CHEMINS_FLECHE = {
    droite: [pointsFleche(0.16, 0.5, 0.84, 0.5)],
    bas: [pointsFleche(0.5, 0.16, 0.5, 0.84)]
};
// Sur une case d'angle, les deux flèches ne se superposent pas : centrées
// toutes les deux, elles se croisent en une étoile qu'on ne lit plus. Chacune
// dans sa moitié, comme les deux départs distincts qu'elles annoncent.
const CHEMINS_COIN = [
    pointsFleche(0.30, 0.28, 0.86, 0.28),
    pointsFleche(0.28, 0.30, 0.28, 0.86)
];

function traitsFleche(type) {
    if (type === 'coin') return CHEMINS_COIN;
    return CHEMINS_FLECHE[type] || [];
}

/** La place d'une case de clé, la i-ème (0 en tête). */
function poseCle(g, i) {
    const l = Math.floor(i / g.parLigne), c = i % g.parLigne;
    return { x: g.xCle + c * g.coteCle, y: g.yCle + 5 + l * g.coteCle * 1.5 };
}

function motCodePreviewHtml(item, slot, k, solution) {
    const g = geoMotCode(item, slot);
    const T = (v) => (v * k).toFixed(2);
    const donnees = new Set(g.m.donnees);
    const fleches = flechesDe(g.m);
    let html = '';
    for (let y = 0; y < g.m.hauteur; y++) {
        for (let x = 0; x < g.m.largeur; x++) {
            const c = g.m.cases[y][x];
            const X = g.x + x * g.cote, Y = g.y + y * g.cote;
            // LA CASE MUETTE PORTE SA FLÈCHE : dans un anneau, c'est elle qui
            // dit où commence le mot suivant et dans quel sens il se lit.
            if (c === null) {
                const type = fleches.get(`${x},${y}`);
                if (!type) continue;      // le centre de l'anneau reste blanc
                const traits = traitsFleche(type)
                    .map(pts => `<path d="${cheminFleche(pts)}"/>`).join('');
                html += `<div class="fx-mk-noire" style="left:${T(X)}px; top:${T(Y)}px;
                    width:${T(g.cote)}px; height:${T(g.cote)}px">
                    <svg viewBox="0 0 1 1" preserveAspectRatio="none" class="fx-mk-fl">${traits}</svg>
                    </div>`;
                continue;
            }
            // LA GRILLE RESTE VIDE. Rémy : « pour les mots codés, ne remplis
            // surtout pas la grille, l'élève va se débrouiller (surtout sur le
            // pdf) ». Les lettres du mot de départ étaient recopiées dans
            // toutes les cases qui portaient leur numéro : un quart de la
            // grille arrivait déjà faite, et le premier geste de l'exercice —
            // reporter la clé numéro par numéro — était fait à la place de
            // l'élève. La clé, sous la grille, donne le mot de départ ; c'est
            // de là qu'on part, et c'est tout ce qu'il faut.
            const lettre = solution ? c : '';
            html += `<div class="fx-mk-case" style="left:${T(X)}px; top:${T(Y)}px;
                width:${T(g.cote)}px; height:${T(g.cote)}px; font-size:${T(g.cote * 0.5)}px">
                <span class="fx-mk-num" style="font-size:${T(g.cote * 0.32)}px">${g.m.numeros[y][x]}</span>
                ${echapperSheet(lettre)}</div>`;
        }
    }
    html += `<div class="fx-mc-titre" style="left:${T(g.b.x)}px; top:${T(g.yCle)}px;
        width:${T(g.b.w)}px; text-align:center; font-size:${T(3.2)}px">La clé — une lettre par numéro</div>`;
    g.m.lettres.forEach((_, i) => {
        const num = i + 1;
        const lettre = g.m.parNumero[num];
        const donne = donnees.has(lettre);
        const p = poseCle(g, i);
        html += `<div class="fx-mc-case${donne ? ' fx-mk-donnee' : ''}"
            style="left:${T(p.x)}px; top:${T(p.y)}px; width:${T(g.coteCle)}px;
            height:${T(g.coteCle)}px; font-size:${T(g.coteCle * 0.6)}px">${
    echapperSheet(solution || donne ? lettre : '')}</div>`;
        html += `<div class="fx-mc-cle-num" style="left:${T(p.x)}px;
            top:${T(p.y + g.coteCle + 0.3)}px; width:${T(g.coteCle)}px;
            font-size:${T(g.coteCle * 0.42)}px">${num}</div>`;
    });
    return html;
}

function dessinerMotCodePdf(doc, item, slot, solution, champ) {
    const g = geoMotCode(item, slot);
    const donnees = new Set(g.m.donnees);
    const fleches = flechesDe(g.m);

    for (let y = 0; y < g.m.hauteur; y++) for (let x = 0; x < g.m.largeur; x++) {
        const c = g.m.cases[y][x];
        const X = g.x + x * g.cote, Y = g.y + y * g.cote;
        // LA CASE MUETTE PORTE SA FLÈCHE. En GRIS CLAIR, et non en noir : un
        // anneau compte une case muette par mot, et un aplat noir par case,
        // c'est une cartouche de toner par classe et une photocopie baveuse.
        // Le CENTRE de l'anneau, lui, reste blanc — c'est la place de la
        // consigne, pas une case.
        if (c === null) {
            const type = fleches.get(`${x},${y}`);
            if (!type) continue;
            doc.setFillColor(221, 226, 234);
            doc.rect(X, Y, g.cote, g.cote, 'F');
            // LA MÊME FLÈCHE PLEINE QU'À L'ÉCRAN, et non deux traits : c'est
            // le même polygone, tracé point par point. `doc.lines` veut des
            // DÉPLACEMENTS depuis le point de départ, pas des coordonnées.
            doc.setFillColor(90, 104, 126);
            traitsFleche(type).forEach(pts => {
                const abs = pts.map(([px, py]) => [X + px * g.cote, Y + py * g.cote]);
                const pas = abs.slice(1).map(([px, py], i) =>
                    [px - abs[i][0], py - abs[i][1]]);
                doc.lines(pas, abs[0][0], abs[0][1], [1, 1], 'F', true);
            });
            continue;
        }
        doc.setDrawColor(...ENCRE.trait);
        doc.setLineWidth(0.22);
        doc.rect(X, Y, g.cote, g.cote, 'S');
        // LE NUMÉRO EST DANS UN COIN, PAS AU MILIEU : le milieu appartient à la
        // lettre qu'on va écrire par-dessus, et un chiffre gris sous un stylo
        // se lit encore.
        // EN HAUT À GAUCHE, comme sur une grille de journal. Rémy : « pour le
        // chiffre, mets-le en haut à gauche dans la case. » Centré en haut, il
        // se retrouvait pile au-dessus de la lettre à écrire : deux signes sur
        // le même axe, et le chiffre disparaissait sous le crayon.
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(Math.max(3.6, g.cote * 0.9));
        doc.setTextColor(...ENCRE.gris);
        doc.text(String(g.m.numeros[y][x]), X + g.cote * 0.11, Y + g.cote * 0.33,
            { align: 'left' });

        // La grille reste VIDE sur la feuille : voir l'aperçu ci-dessus.
        const lettre = solution ? c : '';
        if (lettre) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(Math.min(12, g.cote * 1.5));
            doc.setTextColor(...(solution && !donnees.has(c) ? [47, 133, 90] : ENCRE.texte));
            doc.text(lettre, X + g.cote / 2, Y + g.cote * 0.88, { align: 'center' });
        } else if (champ) {
            champ(X + g.cote * 0.15, Y + g.cote * 0.38, g.cote * 0.7, g.cote * 0.56);
        }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...ENCRE.texte);
    doc.text(pourPdf('La clé — une lettre par numéro'), g.b.x + g.b.w / 2, g.yCle + 3,
        { align: 'center' });

    g.m.lettres.forEach((_, i) => {
        const num = i + 1;
        const lettre = g.m.parNumero[num];
        const donne = donnees.has(lettre);
        const p = poseCle(g, i);
        doc.setDrawColor(...ENCRE.trait);
        doc.setLineWidth(donne ? 0.5 : 0.25);
        doc.rect(p.x, p.y, g.coteCle, g.coteCle, 'S');
        if (solution || donne) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(Math.min(12, g.coteCle * 1.6));
            doc.setTextColor(...(solution && !donne ? [47, 133, 90] : ENCRE.texte));
            doc.text(lettre, p.x + g.coteCle / 2, p.y + g.coteCle * 0.72, { align: 'center' });
        } else if (champ) {
            champ(p.x + g.coteCle * 0.12, p.y + g.coteCle * 0.12,
                g.coteCle * 0.76, g.coteCle * 0.76);
        }
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(Math.max(4.4, g.coteCle * 1.1));
        doc.setTextColor(...ENCRE.gris);
        doc.text(String(num), p.x + g.coteCle / 2, p.y + g.coteCle + 2.6, { align: 'center' });
    });
    doc.setTextColor(...ENCRE.texte);
}

function dessinerMotsCroisesPdf(doc, item, slot, solution, champ) {
    const g = geoMotsCroises(item, slot);
    const offertes = new Map((g.m.offertes || []).map(o => [`${o.x},${o.y}`, o.lettre]));

    for (let y = 0; y < g.m.hauteur; y++) for (let x = 0; x < g.m.largeur; x++) {
        const X = g.x + x * g.cote, Y = g.y + y * g.cote;
        // Rien sur une case muette : seule la silhouette des mots se voit.
        if (g.m.cases[y][x] === null) continue;
        doc.setDrawColor(...ENCRE.trait);
        doc.setLineWidth(0.22);
        doc.rect(X, Y, g.cote, g.cote, 'S');

        const num = g.m.numeros && g.m.numeros[`${x},${y}`];
        if (num) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(Math.max(3.6, g.cote * 0.9));
            doc.setTextColor(...ENCRE.gris);
            doc.text(String(num), X + g.cote * 0.12, Y + g.cote * 0.36);
        }
        const donnee = offertes.get(`${x},${y}`);
        const lettre = solution ? g.m.cases[y][x] : (donnee || '');
        if (lettre) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(Math.min(12, g.cote * 1.7));
            doc.setTextColor(...ENCRE.texte);
            doc.text(lettre, X + g.cote / 2, Y + g.cote * 0.62, { align: 'center' });
        } else if (champ) {
            champ(X + g.cote * 0.1, Y + g.cote * 0.1, g.cote * 0.8, g.cote * 0.8);
        }
    }

    dessinerDefsPdf(doc, g);
}

// --- Binairo ------------------------------------------------------------------

function dessinerBinairoPdf(doc, item, slot, solution, champ) {
    const { x, y, taille } = slot;
    const { n, givens, solution: sol } = item.meta;
    const s = taille / n;

    doc.setFillColor(...ENCRE.donnee);
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        if (givens[r][c] !== null) doc.rect(x + c * s, y + r * s, s, s, 'F');
    }

    doc.setDrawColor(...ENCRE.grille);
    doc.setLineWidth(0.12);
    for (let i = 1; i < n; i++) {
        doc.line(x + i * s, y, x + i * s, y + taille);
        doc.line(x, y + i * s, x + taille, y + i * s);
    }
    doc.setDrawColor(...ENCRE.trait);
    doc.setLineWidth(0.55);
    doc.rect(x, y, taille, taille, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...ENCRE.texte);
    doc.setFontSize(Math.min(16, s * 1.5));
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        if (!solution && givens[r][c] === null) {
            if (champ) champ(x + c * s + s * 0.12, y + r * s + s * 0.12, s * 0.76, s * 0.76);
            continue;
        }
        doc.text(String(sol[r][c]), x + c * s + s / 2, y + r * s + s / 2,
            { align: 'center', baseline: 'middle' });
    }
}

function binairoPreviewHtml(item, slot, k, solution, champs) {
    const { n, givens, solution: sol } = item.meta;
    const s = (slot.taille / n) * k;
    let html = `<table class="fp-grille" style="left:${slot.x * k}px; top:${slot.y * k}px; border: 1.6px solid #1a202c;">`;
    for (let r = 0; r < n; r++) {
        html += '<tr>';
        for (let c = 0; c < n; c++) {
            const donnee = givens[r][c] !== null;
            html += `<td class="${champs && !donnee && !solution ? 'fp-case--champ' : ''}" style="width:${s}px; height:${s}px; font-size:${s * 0.55}px; ${donnee ? 'background:#eef0fa;' : ''}">
                ${solution || donnee ? sol[r][c] : ''}</td>`;
        }
        html += '</tr>';
    }
    return html + '</table>';
}

// --- Sudoku -------------------------------------------------------------------
//
// La seule chose qui distingue un sudoku d'un binairo à l'impression, ce sont
// ses BLOCS : sans les traits épais qui les délimitent, la grille est illisible
// et le raisonnement impossible. `br` × `bc` donnent la forme du bloc — 2×2
// pour un 4×4, 2×3 pour un 6×6, 3×3 pour un 9×9.
//
// ATTENTION : le sudoku range ses cases À PLAT (un seul tableau de n × n
// nombres), là où le binairo garde un tableau de lignes. On passe donc par
// `case(r, c)` plutôt que par `givens[r][c]`, qui ne veut rien dire ici.

function sudokuPreviewHtml(item, slot, k, solution, champs) {
    const { n, br, bc, givens, solution: sol } = item.meta;
    const s = (slot.taille / n) * k;
    let html = `<table class="fp-grille" style="left:${slot.x * k}px; top:${slot.y * k}px; border: 2.4px solid #1a202c;">`;
    for (let r = 0; r < n; r++) {
        html += '<tr>';
        for (let c = 0; c < n; c++) {
            const i = r * n + c;
            const donnee = givens[i] !== null && givens[i] !== undefined;
            // Les traits de bloc sont volontairement bien plus épais que le
            // quadrillage : c'est le seul repère qui dit où s'arrête un bloc,
            // et une photocopie mange toujours un peu de l'encre la plus fine.
            const bords = [
                r % br === 0 ? 'border-top:2.4px solid #1a202c;' : '',
                c % bc === 0 ? 'border-left:2.4px solid #1a202c;' : ''
            ].join('');
            html += `<td class="${champs && !donnee && !solution ? 'fp-case--champ' : ''}"
                style="width:${s}px; height:${s}px; font-size:${s * 0.55}px;
                ${donnee ? 'background:#eef0fa;' : ''}${bords}">
                ${solution || donnee ? sol[i] : ''}</td>`;
        }
        html += '</tr>';
    }
    return html + '</table>';
}

function dessinerSudokuPdf(doc, item, slot, solution, champ) {
    const { x, y, taille } = slot;
    const { n, br, bc, givens, solution: sol } = item.meta;
    const s = taille / n;

    doc.setFillColor(...ENCRE.donnee);
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        const g = givens[r * n + c];
        if (g !== null && g !== undefined) doc.rect(x + c * s, y + r * s, s, s, 'F');
    }

    doc.setDrawColor(...ENCRE.grille);
    doc.setLineWidth(0.12);
    for (let i = 1; i < n; i++) {
        doc.line(x + i * s, y, x + i * s, y + taille);
        doc.line(x, y + i * s, x + taille, y + i * s);
    }

    // Les séparations de blocs, par-dessus le quadrillage fin.
    doc.setDrawColor(...ENCRE.trait);
    doc.setLineWidth(0.55);
    for (let i = bc; i < n; i += bc) doc.line(x + i * s, y, x + i * s, y + taille);
    for (let i = br; i < n; i += br) doc.line(x, y + i * s, x + taille, y + i * s);
    doc.rect(x, y, taille, taille, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...ENCRE.texte);
    doc.setFontSize(Math.min(16, s * 1.5));
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        const i = r * n + c;
        if (!solution && (givens[i] === null || givens[i] === undefined)) {
            if (champ) champ(x + c * s + s * 0.12, y + r * s + s * 0.12, s * 0.76, s * 0.76);
            continue;
        }
        doc.text(String(sol[i]), x + c * s + s / 2, y + r * s + s / 2,
            { align: 'center', baseline: 'middle' });
    }
}

// --- Garam --------------------------------------------------------------------
// Le treillis n'est pas carré : on le dessine à sa proportion (11 colonnes ×
// 5 ou 9 lignes), centré verticalement dans l'emplacement carré du gabarit.

function geometrieGaram(item, boite) {
    const { rows, cols } = item.meta.structure;
    const u = Math.min(boite.w / cols, boite.h / rows);
    return {
        u,
        x0: boite.x + (boite.w - u * cols) / 2,
        y0: boite.y + (boite.h - u * rows) / 2
    };
}

function dessinerGaramPdf(doc, item, slot, solution, champ) {
    const { structure, givens, solution: sol } = item.meta;
    const { u, x0, y0 } = geometrieGaram(item, slot.boite);
    const cote = u * 0.92;                       // la case, un peu plus petite que sa maille
    const px = (c) => x0 + c * u + (u - cote) / 2;
    const py = (r) => y0 + r * u + (u - cote) / 2;

    const { dizaines, unites } = accolagesGaram(structure);
    const rond = Math.min(1.6, cote * 0.17);

    structure.cells.forEach((pos, i) => {
        const x = px(pos.c), y = py(pos.r);
        const diz = dizaines.has(i), uni = unites.has(i);
        // Une case accolée à sa voisine s'étend jusqu'à elle : le cadre des
        // deux ne fait qu'un, comme sur une fiche de garam.
        const h = diz ? cote + (u - cote) : cote;
        if (givens[i] !== null) {
            doc.setFillColor(...ENCRE.donnee);
            doc.roundedRect(x, y, cote, h, diz || uni ? 0.2 : rond, diz || uni ? 0.2 : rond, 'F');
        }
        doc.setDrawColor(...ENCRE.trait);
        doc.setLineWidth(0.55);
        if (!diz && !uni) {
            doc.roundedRect(x, y, cote, cote, rond, rond, 'S');
        } else if (diz) {
            // Le haut du cadre commun : trois côtés, sans le bas.
            doc.line(x, y + rond, x, y + h);
            doc.line(x + cote, y + rond, x + cote, y + h);
            doc.roundedRect(x, y, cote, cote, rond, rond, 'S');
            // On efface le trait du bas en le repassant en blanc, puis on
            // reposera le pointillé avec la case des unités.
            doc.setDrawColor(255, 255, 255);
            doc.setLineWidth(0.8);
            doc.line(x + rond, y + cote, x + cote - rond, y + cote);
            doc.setDrawColor(...ENCRE.trait);
            doc.setLineWidth(0.55);
        } else {
            doc.line(x, y, x, y + cote - rond);
            doc.line(x + cote, y, x + cote, y + cote - rond);
            doc.roundedRect(x, y, cote, cote, rond, rond, 'S');
            doc.setDrawColor(255, 255, 255);
            doc.setLineWidth(0.8);
            doc.line(x + rond, y, x + cote - rond, y);
            // LE POINTILLÉ qui sépare les dizaines des unités.
            doc.setDrawColor(148, 163, 184);
            doc.setLineWidth(0.35);
            doc.setLineDashPattern([0.7, 0.7], 0);
            doc.line(x + 0.3, y, x + cote - 0.3, y);
            doc.setLineDashPattern([], 0);
            doc.setDrawColor(...ENCRE.trait);
            doc.setLineWidth(0.55);
        }
    });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...ENCRE.texte);
    doc.setFontSize(Math.min(13, cote * 1.6));
    structure.cells.forEach((pos, i) => {
        if (!solution && givens[i] === null) {
            if (champ) champ(px(pos.c) + cote * 0.1, py(pos.r) + cote * 0.1, cote * 0.8, cote * 0.8);
            return;
        }
        doc.text(String(sol[i]), px(pos.c) + cote / 2, py(pos.r) + cote / 2,
            { align: 'center', baseline: 'middle' });
    });

    doc.setFontSize(Math.min(11, cote * 1.15));
    doc.setTextColor(90, 98, 112);
    structure.signes.forEach(sg => {
        doc.text(pourPdf(sg.glyphe),
            x0 + sg.c * u + u / 2, y0 + sg.r * u + u / 2, { align: 'center', baseline: 'middle' });
    });
}

/**
 * LES CASES ACCOLÉES. Le résultat d'une verticale s'écrit sur DEUX cases, de
 * haut en bas — dizaines puis unités — et elles se touchent, séparées d'un
 * simple pointillé : on lit UN nombre à deux chiffres, pas deux cases. C'est
 * la convention des fiches de garam, et l'exercice à l'écran la respecte ; le
 * papier l'ignorait et rendait la grille fausse à lire.
 */
function accolagesGaram(structure) {
    const dizaines = new Set(), unites = new Set();
    (structure.equations || []).forEach(eq => {
        if (eq.z2 !== undefined) { dizaines.add(eq.z); unites.add(eq.z2); }
    });
    return { dizaines, unites };
}

function garamPreviewHtml(item, slot, k, solution, champs) {
    const { structure, givens, solution: sol } = item.meta;
    const { u, x0, y0 } = geometrieGaram(item, slot.boite);
    const { dizaines, unites } = accolagesGaram(structure);
    const uk = u * k, cote = uk * 0.92;
    const trait = Math.max(1, cote * 0.075);
    const rond = Math.max(1.5, cote * 0.17);
    let html = '';
    structure.cells.forEach((pos, i) => {
        const donnee = givens[i] !== null;
        // La case du haut perd son bord bas et ses arrondis bas, celle du bas
        // reçoit le pointillé : les deux ne font plus qu'un cadre.
        const diz = dizaines.has(i), uni = unites.has(i);
        const bords = diz
            ? `border-bottom:0; border-bottom-left-radius:0; border-bottom-right-radius:0;`
            : uni
                ? `border-top:${Math.max(1, trait * 0.8)}px dashed #94a3b8;
                   border-top-left-radius:0; border-top-right-radius:0;`
                : '';
        const vide = champs && !donnee && !solution;
        html += `<div class="fx-ga-case${donnee ? ' fx-ga-case--donnee' : ''}${vide ? ' fp-case--champ' : ''}"
            style="left:${x0 * k + pos.c * uk}px; top:${y0 * k + pos.r * uk}px;
            width:${cote}px; height:${cote + (diz ? trait : 0)}px;
            border-width:${trait}px; border-radius:${rond}px;
            font-size:${cote * 0.6}px; ${bords}">${solution || donnee ? sol[i] : ''}</div>`;
    });
    structure.signes.forEach(sg => {
        html += `<div class="fx-ga-signe" style="left:${x0 * k + sg.c * uk}px;
            top:${y0 * k + sg.r * uk}px; width:${uk}px; height:${uk}px;
            font-size:${uk * 0.55}px;">${sg.glyphe}</div>`;
    });
    return html;
}


// --- Le logigramme -------------------------------------------------------------
//
// Sur le papier, un logigramme tient en deux morceaux : l'histoire et ses
// indices d'un côté, la grille de l'autre. La grille est celle du commerce —
// bandeaux de couleur en tête de chaque liste, blocs cernés, et l'angle mort
// laissé VIDE plutôt que grisé : un damier où il n'y a rien à croiser occupe
// l'œil pour rien.

const LOGI_TEINTES = [[125, 211, 252], [134, 239, 172], [252, 211, 77], [249, 168, 212]];
const pastel = (k, force) => LOGI_TEINTES[k % LOGI_TEINTES.length].map(v => Math.round(255 - (255 - v) * force));

// Le bandeau coloré de la liste, en millimètres. La hauteur des libellés
// verticaux, elle, se mesure : voir `hauteurLibelles`.
const LOGI_BANDEAU = 4.6;

/**
 * La hauteur des libellés écrits à la verticale au-dessus de la grille.
 * Elle suit le PLUS LONG d'entre eux : à hauteur fixe, « poules · lapins ·
 * chèvres » laissait une bande blanche aussi haute que la grille.
 */
function hauteurLibelles(p, colonnes) {
    const plusLong = Math.max(...colonnes.map(c => {
        const cat = p.categories[c];
        return Math.max(...(cat.valeurs || cat.nombres).map((_, j) => etiquetteLogi(cat, j).length));
    }));
    // 7,5 pt est la plus grande taille que le rendu s'autorise : la mesure
    // faite à cette taille couvre tous les cas, quelle que soit celle retenue.
    return Math.max(6, Math.min(17, largeurTexte('x'.repeat(plusLong), 7.5) + 2));
}

/** Une approximation de la largeur d'un texte en Helvetica, en millimètres. */
const largeurTexte = (s, pt) => String(s).length * pt * 0.48 * 0.3528;

/** La hauteur qu'occupe l'énigme (titre, décor, indices numérotés) à cette largeur. */
/**
 * Le corps du texte de l'énigme, en points, pour un bloc de cette largeur.
 *
 * Fixé à 8 pt, il convenait à un bloc de parcours large de six centimètres ;
 * sur une fiche autonome, où le bloc fait une demi-page paysage, l'histoire
 * s'écrivait en pattes de mouche sous une grille de deux centimètres de case.
 */
const policeTexteLogi = (largeur) => Math.min(Math.max(8, largeur * 0.075), 11.5);

function hauteurTexteLogi(p, largeur) {
    const pt = policeTexteLogi(largeur);
    const lignes = (s, taille, l) => Math.max(1, Math.ceil(largeurTexte(s, taille) / Math.max(10, l)));
    let h = pt * 0.5 + lignes(p.decor, pt * 0.95, largeur) * pt * 0.45 + 1.5;
    p.indices.forEach((ind, k) => {
        h += lignes(`${k + 1}. ${ind.texte}`, pt, largeur - 2) * pt * 0.49;
    });
    return h;
}

/**
 * La géométrie commune à l'aperçu et au PDF.
 *
 * Deux dispositions, et on garde celle qui donne les plus GROSSES cases : côte
 * à côte quand le bloc est large et bas (la fiche de parcours), empilée quand
 * il est haut (la fiche autonome, deux logigrammes par page). Toujours côte à
 * côte, la grille finissait minuscule au bord droit avec une clairière blanche
 * au milieu ; toujours empilée, elle ne tenait pas dans un bloc de parcours.
 */
function geometrieLogi(item, boite) {
    const p = item.meta;
    const n = p.categories[0].valeurs.length;
    const nc = p.categories.length;
    const colonnes = []; for (let c = 1; c < nc; c++) colonnes.push(c);
    const lignes = [0]; for (let r = nc - 1; r >= 2; r--) lignes.push(r);

    const bandeau = LOGI_BANDEAU;
    const nx = colonnes.length * n, ny = lignes.length * n;
    // LE PLAFOND EST CELUI DU CRAYON, PAS CELUI DE LA PAGE. À 14 mm, la grille
    // d'une fiche autonome — une demi-page paysage par énigme — flottait au
    // coin d'un bloc aux trois quarts vide : Rémy, « le rendu sur le PDF n'est
    // pas joli par rapport au rendu sur l'écran de jeu ». Vingt-deux
    // millimètres restent une case où l'on coche et où l'on barre, et le
    // dessin occupe enfin la place qu'on lui a donnée.
    const PLAFOND_CASE = 22;

    // LES BANDES D'ÉTIQUETTES GRANDISSENT AVEC LES CASES. Leur largeur (à
    // gauche) et leur hauteur (en haut) étaient bornées à 17 mm : à côté d'une
    // case de deux centimètres, « madeleines » écrit dans 13 mm faisait une
    // note de bas de page. Elles sont donc calculées DEUX FOIS — une première
    // pour connaître la taille des cases, une seconde pour s'y accorder.
    const libellesMin = hauteurLibelles(p, colonnes);
    const bandeDe = (cote) => Math.max(libellesMin, Math.min(cote * 1.5, 34));
    const etiqDe = (cote) => Math.max(11, Math.min(boite.w * 0.13, Math.max(17, cote * 1.1), 34));

    const texteW = Math.max(58, Math.min(boite.w * 0.44, 118));
    const texteH = hauteurTexteLogi(p, boite.w);
    /** La plus grande case qui tienne, pour une bande d'étiquettes donnée. */
    const cases = (largeur, hautDispo, etiqL, bandeL) => Math.min(
        (largeur - bandeau - etiqL) / nx,
        (hautDispo - bandeau - bandeL - 2) / ny, PLAFOND_CASE);
    /** Deux passes : la seconde tient compte des bandes que la première permet. */
    const ajuster = (largeur, hautDispo) => {
        let c = cases(largeur, hautDispo, etiqDe(0), bandeDe(0));
        for (let i = 0; i < 2; i++) c = cases(largeur, hautDispo, etiqDe(c), bandeDe(c));
        return c;
    };

    // À côté : le texte tient dans une colonne, la grille occupe le reste.
    const coteA = ajuster(boite.w - texteW - 6, boite.h);
    // Empilée : le texte prend toute la largeur, la grille toute la hauteur qui reste.
    const coteB = ajuster(boite.w, boite.h - texteH - 3);

    // ON PRÉFÈRE L'EMPILÉ, et il faut qu'il coûte plus de 15 % de la taille des
    // cases pour qu'on y renonce. C'est la disposition de l'écran — l'histoire
    // et ses indices en haut, la grille en dessous — et celle des logigrammes
    // de magazine ; les mettre côte à côte pour gagner un millimètre de case
    // change la feuille sans que personne l'ait demandé.
    const empile = coteB >= coteA * 0.85;
    const cote = Math.max(3, empile ? coteB : coteA);
    const etiq = etiqDe(cote);
    const entete = bandeau + bandeDe(cote);
    const largeurTotale = bandeau + etiq + cote * nx;
    const zoneX = empile ? boite.x : boite.x + texteW + 6;
    const zoneW = empile ? boite.w : boite.w - texteW - 6;
    const xCat = zoneX + Math.max(0, (zoneW - largeurTotale) / 2);
    // ET LA GRILLE EST CENTRÉE DANS CE QUI RESTE. Collée en haut du bloc, elle
    // laissait sous elle une clairière blanche aussi haute qu'elle.
    const hautGrille = entete + ny * cote;
    const hautLibre = boite.h - (empile ? texteH + 3 : 0);
    const yZone = (empile ? boite.y + texteH + 3 : boite.y)
        + Math.max(0, (hautLibre - hautGrille) / 2);
    const indicesW = empile ? boite.w : texteW;
    return {
        p, n, nc, colonnes, lignes, cote, bandeau, etiq, entete, xCat,
        x0: xCat + bandeau + etiq,
        y0: yZone + entete + 1,
        empile, indicesW,
        // Le corps du texte suit la largeur qui lui est vraiment donnée.
        pt: policeTexteLogi(indicesW)
    };
}

const logiVisible = (r, c) => r === 0 || c < r;

/**
 * LA PLUS GRANDE POLICE QUI TIENT, en millimètres.
 *
 * Les libellés d'un logigramme sont écrits dans des bandeaux étroits, souvent
 * de biais : « Chorale » posé verticalement le long de trois cases de trois
 * millimètres a besoin de neuf millimètres et en réclame douze. Il débordait
 * alors des deux côtés de son bandeau, par-dessus l'en-tête et par-dessus la
 * première ligne — et « Observateur » sortait carrément du bloc.
 *
 * 0,58 est la largeur moyenne d'un caractère d'Helvetica gras, en cadratins.
 */
/**
 * Le plafond de police SUIT la taille des cases.
 *
 * Il était fixe — 2,6 mm pour un bandeau, 2,5 mm pour une étiquette — parce
 * que les cases n'avaient jamais plus de 14 mm. Sur une fiche autonome, où
 * elles en font maintenant 22, la même étiquette de 2,5 mm à côté d'une case
 * de deux centimètres se lisait comme une note de bas de page : c'est une
 * bonne part du « pas joli » vu par Rémy.
 */
const PLAFOND_LOGI = {
    bandeau: (cote) => Math.min(Math.max(2.6, cote * 0.22), 4.6),
    etiquette: (cote) => Math.min(Math.max(2.5, cote * 0.2), 4)
};

function policeLogi(texte, place, plafond) {
    const n = Math.max(1, String(texte ?? '').length);
    return Math.max(1.3, Math.min(plafond, (place * 0.92) / (n * 0.58)));
}
/** La même, en points — l'unité de jsPDF. 1 pt ≈ 0,3528 mm. */
const policeLogiPt = (texte, place, plafond) => policeLogi(texte, place, plafond) / 0.3528;

/**
 * La solution en toutes lettres, une ligne par personnage.
 *
 * Le générateur la compose déjà pour l'explication de l'écran (« Malo · le roi ;
 * Zoé · la fée ») : on la redécoupe plutôt que de la recalculer, pour que le
 * papier et l'écran ne puissent pas diverger.
 */
function phrasesSolutionLogi(item) {
    return String(item.explanation || '').split(' ; ').filter(Boolean);
}

function logigrammePreviewHtml(item, slot, k, solution) {
    const b = slot.boite;
    const g = geometrieLogi(item, b);
    const { p, n, colonnes, lignes, cote, x0, y0 } = g;
    const rgb = (c, f) => `rgb(${pastel(c, f).join(',')})`;
    let html = '';

    // L'histoire et les indices — ou, sur la page des solutions, la réponse
    // en toutes lettres. Réimprimer les indices à côté d'une grille de ronds et
    // de croix n'aide personne : celui qui corrige trente copies veut lire
    // « Malo · le roi », pas déchiffrer un tableau une deuxième fois.
    html += `<div class="fx-logi-texte" style="left:${b.x * k}px; top:${b.y * k}px;
        width:${g.indicesW * k}px; font-size:${g.pt * 0.3528 * k}px">
        <b>${echapperSheet(p.titre)}</b> — <i>${echapperSheet(solution ? 'Solution' : p.decor)}</i>
        <ol>${(solution ? phrasesSolutionLogi(item) : p.indices.map(i => i.texte))
        .map(t => `<li>${echapperSheet(t)}</li>`).join('')}</ol></div>`;

    // Les bandeaux et les étiquettes de colonne.
    const libH = g.entete - g.bandeau;
    colonnes.forEach((c, ci) => {
        const x = x0 + ci * n * cote;
        html += `<div class="fx-logi-cat" style="left:${x * k}px; top:${(y0 - g.entete) * k}px;
            width:${(n * cote) * k}px; height:${g.bandeau * k}px; background:${rgb(c, .55)};
            font-size:${policeLogi(p.categories[c].label, n * cote, PLAFOND_LOGI.bandeau(cote)) * k}px"
            >${echapperSheet(p.categories[c].label)}</div>`;
        for (let j = 0; j < n; j++) {
            html += `<div class="fx-logi-vert" style="left:${(x + j * cote) * k}px;
                top:${(y0 - libH) * k}px; width:${cote * k}px;
                height:${libH * k}px; background:${rgb(c, .18)};
                font-size:${policeLogi(etiquetteLogi(p.categories[c], j), libH, PLAFOND_LOGI.etiquette(cote)) * k}px"
                >${echapperSheet(etiquetteLogi(p.categories[c], j))}</div>`;
        }
    });

    lignes.forEach((r, ri) => {
        const y = y0 + ri * n * cote;
        html += `<div class="fx-logi-catlig" style="left:${g.xCat * k}px; top:${y * k}px;
            width:${g.bandeau * k}px; height:${(n * cote) * k}px; background:${rgb(r, .55)};
            font-size:${policeLogi(p.categories[r].label, n * cote, PLAFOND_LOGI.bandeau(cote)) * k}px"
            >${echapperSheet(p.categories[r].label)}</div>`;
        for (let i = 0; i < n; i++) {
            html += `<div class="fx-logi-lig" style="left:${(g.xCat + g.bandeau) * k}px;
                top:${(y + i * cote) * k}px; width:${g.etiq * k}px; height:${cote * k}px;
                background:${rgb(r, .18)};
                font-size:${policeLogi(etiquetteLogi(p.categories[r], i), g.etiq, PLAFOND_LOGI.etiquette(cote)) * k}px"
                >${echapperSheet(etiquetteLogi(p.categories[r], i))}</div>`;
        }
        colonnes.forEach((c, ci) => {
            if (!logiVisible(r, c)) return;
            const x = x0 + ci * n * cote;
            for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
                const rempli = solution
                    ? (p.solution.findIndex(e => e[r] === i) === p.solution.findIndex(e => e[c] === j) ? '●' : '×')
                    : '';
                html += `<div class="fx-logi-case" style="left:${(x + j * cote) * k}px; top:${(y + i * cote) * k}px;
                    width:${cote * k}px; height:${cote * k}px; font-size:${cote * 0.6 * k}px">${rempli}</div>`;
            }
            // Le cadre du bloc est NOIR : en pastel il se confondait avec le
            // quadrillage, alors que c'est lui qui dit où s'arrête une liste.
            html += `<div class="fx-logi-bloc" style="left:${x * k}px; top:${y * k}px;
                width:${(n * cote) * k}px; height:${(n * cote) * k}px"></div>`;
        });
    });
    return html;
}

function dessinerLogigrammePdf(doc, item, slot, solution, champ) {
    const b = slot.boite;
    const g = geometrieLogi(item, b);
    const { p, n, colonnes, lignes, cote, x0, y0 } = g;

    // L'histoire, puis les indices numérotés — ou la réponse en toutes lettres
    // sur la page des solutions (voir `phrasesSolutionLogi`).
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(g.pt * 1.15);
    doc.setTextColor(...ENCRE.texte);
    let y = b.y + g.pt * 0.5;
    doc.text(pourPdf(p.titre), b.x, y);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(g.pt * 0.95);
    doc.setTextColor(...ENCRE.gris);
    doc.splitTextToSize(pourPdf(solution ? 'Solution' : p.decor), g.indicesW)
        .forEach(l => { y += g.pt * 0.45; doc.text(l, b.x, y); });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(g.pt);
    doc.setTextColor(...ENCRE.texte);
    y += 1.5;
    const textes = solution
        ? phrasesSolutionLogi(item)
        : p.indices.map(ind => ind.texte);
    textes.forEach((t, k) => {
        const lignesTexte = doc.splitTextToSize(pourPdf(`${k + 1}. ${t}`), g.indicesW - 2);
        lignesTexte.forEach((l, li) => { y += g.pt * 0.49; doc.text(l, b.x + (li ? 3 : 0), y); });
    });

    // Les bandeaux de colonne. Cernés eux aussi : le trait noir court sur
    // toute la grille, en-têtes compris.
    const libH = g.entete - g.bandeau;
    doc.setDrawColor(...ENCRE.trait);
    colonnes.forEach((c, ci) => {
        const x = x0 + ci * n * cote;
        doc.setLineWidth(0.15);
        doc.setFillColor(...pastel(c, 0.55));
        doc.rect(x, y0 - g.entete, n * cote, g.bandeau, 'FD');
        doc.setFontSize(policeLogiPt(p.categories[c].label, n * cote, PLAFOND_LOGI.bandeau(cote)));
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...ENCRE.texte);
        doc.text(pourPdf(p.categories[c].label), x + n * cote / 2, y0 - g.entete + g.bandeau * 0.72,
            { align: 'center' });
        doc.setFillColor(...pastel(c, 0.18));
        for (let j = 0; j < n; j++) doc.rect(x + j * cote, y0 - libH, cote, libH, 'FD');
        doc.setFont('helvetica', 'normal');
        // Ces libellés-ci sont COUCHÉS : c'est la hauteur de l'en-tête qui les
        // borne, pas la largeur d'une case.
        const plusLong = Math.max(...Array.from({ length: n },
            (_, j) => String(etiquetteLogi(p.categories[c], j)).length));
        doc.setFontSize(policeLogiPt('x'.repeat(plusLong), libH, PLAFOND_LOGI.etiquette(cote)));
        for (let j = 0; j < n; j++) {
            doc.text(pourPdf(etiquetteLogi(p.categories[c], j)),
                x + j * cote + cote * 0.68, y0 - 1.2, { angle: 90 });
        }
    });

    lignes.forEach((r, ri) => {
        const y0r = y0 + ri * n * cote;
        const xCat = g.xCat;
        doc.setDrawColor(...ENCRE.trait);
        doc.setLineWidth(0.15);
        doc.setFillColor(...pastel(r, 0.55));
        doc.rect(xCat, y0r, g.bandeau, n * cote, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(policeLogiPt(p.categories[r].label, n * cote, PLAFOND_LOGI.bandeau(cote)));
        doc.setTextColor(...ENCRE.texte);
        doc.text(pourPdf(p.categories[r].label), xCat + g.bandeau * 0.72, y0r + n * cote / 2,
            { align: 'center', angle: 90 });
        doc.setFillColor(...pastel(r, 0.18));
        for (let i = 0; i < n; i++) doc.rect(xCat + g.bandeau, y0r + i * cote, g.etiq, cote, 'FD');
        doc.setFont('helvetica', 'normal');
        const plusLongR = Math.max(...Array.from({ length: n },
            (_, i) => String(etiquetteLogi(p.categories[r], i)).length));
        doc.setFontSize(policeLogiPt('x'.repeat(plusLongR), g.etiq, PLAFOND_LOGI.etiquette(cote)));
        for (let i = 0; i < n; i++) {
            doc.text(pourPdf(etiquetteLogi(p.categories[r], i)),
                x0 - 1.5, y0r + i * cote + cote * 0.62, { align: 'right' });
        }

        colonnes.forEach((c, ci) => {
            if (!logiVisible(r, c)) return;
            const x = x0 + ci * n * cote;
            // Tout est noir : le quadrillage fin à l'intérieur, le cadre plus
            // épais autour. C'est le trait d'un logigramme de magazine, et
            // c'est lui qui dit d'un coup d'œil où s'arrête un bloc.
            doc.setDrawColor(...ENCRE.trait);
            doc.setLineWidth(0.15);
            for (let i = 1; i < n; i++) {
                doc.line(x, y0r + i * cote, x + n * cote, y0r + i * cote);
                doc.line(x + i * cote, y0r, x + i * cote, y0r + n * cote);
            }
            doc.setLineWidth(0.6);
            doc.rect(x, y0r, n * cote, n * cote, 'S');
            if (solution) {
                // Le rond et la croix sont DESSINÉS : écrits, ils sortaient en
                // « O » et « x » de machine à écrire, là où la grille de
                // l'élève porte un vrai rond et une vraie croix.
                doc.setFillColor(...ENCRE.trait);
                doc.setDrawColor(...ENCRE.trait);
                const r0 = cote * 0.2, br = cote * 0.24;
                for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
                    const cx = x + j * cote + cote / 2, cy = y0r + i * cote + cote / 2;
                    if (p.solution.findIndex(e => e[r] === i) === p.solution.findIndex(e => e[c] === j)) {
                        doc.setLineWidth(Math.max(0.35, cote * 0.06));
                        doc.circle(cx, cy, r0, 'FD');
                    } else {
                        doc.setLineWidth(Math.max(0.28, cote * 0.045));
                        doc.line(cx - br, cy - br, cx + br, cy + br);
                        doc.line(cx - br, cy + br, cx + br, cy - br);
                    }
                }
            } else if (champ) {
                for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
                    champ(x + j * cote + cote * 0.12, y0r + i * cote + cote * 0.12, cote * 0.76, cote * 0.76);
                }
            }
        });
    });
}

// --- Les dominos ---------------------------------------------------------------
//
// Une planche de pièces à découper. C'est l'usage historique du jeu en classe :
// on photocopie, on découpe, on distribue une enveloppe par binôme, et les
// élèves cherchent la chaîne à plat sur la table. La feuille de solutions
// montre la même chaîne dans l'ordre — le professeur corrige d'un regard.

const DOM_LIGNE = 3.5;          // hauteur d'une ligne de texte dans une pièce, en mm
// LES PIÈCES SE TOUCHENT, ET C'EST POUR LE CISEAU. Rémy : « ce serait bien que
// les dominos à découper soient collés car sinon c'est long à découper ». Avec
// un blanc de 2,4 mm autour de chaque pièce, il fallait faire le tour des
// vingt-quatre — quatre-vingt-seize coups de ciseau. Collées, elles partagent
// leurs traits : cinq coups droits dans un sens, sept dans l'autre, et la
// planche est débitée. C'est la raison pour laquelle les coins sont carrés
// (deux angles arrondis mis bord à bord laissent une encoche) et pour laquelle
// le pli reste plus fin que le contour — sinon on ne sait plus où couper.
const DOM_ECART = 0;

/**
 * La géométrie d'une planche — EN DEUX ZONES.
 *
 * On imprimait les pièces, et rien d'autre : l'élève découpait, puis cherchait
 * où les poser. Sur une table de classe, la chaîne se défait au premier coup
 * de coude. Il lui faut un PLATEAU : autant d'emplacements vides que de
 * pièces, dans l'ordre de lecture, sur lesquels on colle.
 *
 *   · en haut  — le plateau, des emplacements en pointillés ;
 *   · en bas   — les pièces à découper, mélangées.
 *
 * Les deux zones partagent la MÊME taille de pièce : un emplacement où la
 * pièce ne rentre pas ne sert à rien.
 *
 * ET LE PLATEAU EST UN PARCOURS, PAS UN TABLEAU. On imprimait neuf cases en
 * 3 × 3, numérotées de 1 à 9 : c'est une grille de rangement, ce n'est pas un
 * jeu de dominos. Un domino ne se range pas, il se RACCORDE — la question
 * touche sa réponse, et de proche en proche le trait forme un serpent. Sur la
 * grille, deux pièces voisines ne se touchaient par rien du tout, et l'élève
 * n'avait aucun moyen de voir que sa chaîne se tenait.
 *
 * Le serpentin vient donc du noyau — `cheminSerpentin`, celui-là même que
 * dessine l'écran. Les emplacements se touchent bord à bord, les virages sont
 * des dominos DEBOUT, et la jointure se lit à l'endroit exact où deux cases
 * se rencontrent.
 */
const DOM_TITRE = 4.2;          // la hauteur d'un intertitre de zone

function geometrieDominos(item, boite) {
    const pieces = item.meta.pieces || [];
    const n = Math.max(1, pieces.length);
    const plusLongue = Math.max(4, ...pieces.map(p =>
        Math.max(String(p.droite).length, String(p.gauche).length)));
    // Chaque zone reçoit la moitié de la hauteur, son intertitre déduit.
    const zoneH = Math.max(12, (boite.h - 2 * DOM_TITRE - 3) / 2);

    // LE PLATEAU : on essaie chaque repliement du serpentin et l'on garde
    // celui qui donne les plus grandes cases — un serpent large et plat sur
    // une feuille à l'italienne, plus replié sur une demi-page.
    let plateau = null;
    for (let k = 2; k <= 7; k++) {
        const chemin = cheminSerpentin(n, k);
        // Les cases se touchent : il n'y a pas d'écart à retrancher.
        const cote = Math.min(boite.w / chemin.colonnes, zoneH / chemin.lignes, 24);
        if (!plateau || cote >= plateau.cote) plateau = { cote, chemin };
    }

    // LA RÉSERVE : un domino est fait de deux carrés, comme le vrai. On choisit
    // le nombre de colonnes qui donne les plus grandes pièces au format 2:1 —
    // trois colonnes pour des tables, deux pour des périmètres.
    const rangs = (c) => Math.ceil(n / c);
    const coteDe = (c) => {
        const w = ((boite.w - DOM_ECART * (c - 1)) / c) / 2;   // le carré, par la largeur
        const h = (zoneH - DOM_ECART * (rangs(c) - 1)) / rangs(c);
        return Math.min(w, h, 24);
    };
    let cols = 2;
    for (const c of [3, 4]) if (coteDe(c) >= coteDe(cols) - 0.01 && plusLongue <= (c === 3 ? 26 : 12)) cols = c;

    // UNE SEULE TAILLE POUR LES DEUX ZONES : c'est la plus petite des deux qui
    // commande. Une pièce plus large que son emplacement ne se colle pas, et
    // une pièce plus petite laisse la chaîne se disloquer.
    const cote = Math.max(6, Math.min(plateau.cote, coteDe(cols)));
    const chemin = plateau.chemin;
    return {
        pieces, cols, cote, pieceW: cote * 2, pieceH: cote, gaucheW: cote, droiteW: cote,
        zoneH, chemin,
        // Le serpentin, centré dans sa zone : il ne remplit pas toujours le
        // rectangle, et un serpent collé au bord gauche se lit mal.
        plateauX: boite.x + Math.max(0, (boite.w - chemin.colonnes * cote) / 2),
        plateauY: boite.y + DOM_TITRE + Math.max(0, (zoneH - chemin.lignes * cote) / 2),
        piecesY: boite.y + DOM_TITRE + zoneH + 3 + DOM_TITRE
    };
}

/**
 * L'emplacement, en millimètres, de la case numéro `rang` du serpentin.
 *
 * `inverse` dit que le chemin traverse la case à rebours : c'est alors sa
 * SECONDE moitié qui se dessine en premier, pour que la chaîne se lise le long
 * du serpent et non contre lui.
 */
function caseDomino(g, rang) {
    const c = g.chemin.cases[rang];
    const b = boiteCaseDomino(c);
    const [tete] = cellulesDe(c);
    return {
        x: g.plateauX + b.x * g.cote, y: g.plateauY + b.y * g.cote,
        w: b.l * g.cote, h: b.h * g.cote,
        vertical: b.h === 2, inverse: b.inverse,
        // Le coin de la moitié par laquelle on ENTRE dans la case : c'est là
        // que se pose le numéro, pour qu'il suive le sens de lecture.
        teteX: g.plateauX + tete[0] * g.cote, teteY: g.plateauY + tete[1] * g.cote
    };
}

/** Le coin haut-gauche de la pièce `rang` de la réserve, à découper. */
function placeDomino(g, boite, ordreLong, rang, yZone) {
    const rangs = Math.ceil(ordreLong / g.cols);
    const x0 = boite.x + Math.max(0, (boite.w - (g.cols * g.pieceW + (g.cols - 1) * DOM_ECART)) / 2);
    const y0 = yZone + Math.max(0, (g.zoneH - (rangs * g.pieceH + (rangs - 1) * DOM_ECART)) / 2);
    return {
        x: x0 + (rang % g.cols) * (g.pieceW + DOM_ECART),
        y: y0 + Math.floor(rang / g.cols) * (g.pieceH + DOM_ECART)
    };
}

/** L'ordre d'affichage : mélangé sur la planche, dans l'ordre sur la correction. */
// Mélangées sur la planche (la réserve porte TOUTES les pièces), dans l'ordre
// de la chaîne sur la correction.
const ordreDominos = (item, solution) => solution
    ? (item.meta.pieces || []).map(p => p.id)
    : (item.meta.reserve && item.meta.reserve.length
        ? item.meta.reserve : (item.meta.pieces || []).map(p => p.id));

/** La taille du texte dans un carré de `cote` mm : la même règle qu'à l'écran. */
const policeDomino = (texte, cote) => Math.max(1.7, cote * ajusterAuCarre(insecable(texte)));

function dominosPreviewHtml(item, slot, k, solution) {
    const b = slot.boite;
    const g = geometrieDominos(item, b);
    const ordre = ordreDominos(item, solution);
    const chaine = (item.meta.pieces || []).map(p => p.id);
    let html = '';

    const intertitre = (texte, y) => `<div class="fx-dom-zone" style="left:${b.x * k}px;
        top:${y * k}px; width:${b.w * k}px; font-size:${2.9 * k}px">${echapperSheet(texte)}</div>`;

    /** Une pièce dessinée, couchée ou debout, ses moitiés dans l'ordre voulu. */
    const poser = (p, x, y, opts = {}) => {
        const vertical = !!opts.vertical;
        const textes = opts.inverse ? [p.droite, p.gauche] : [p.gauche, p.droite];
        const demi = (t, cls) => `<div class="fx-dom-demi ${cls}"
            style="font-size:${policeDomino(t, g.cote) * k}px">${echapperSheet(insecable(t))}</div>`;
        return `<div class="fx-dom-piece ${vertical ? 'fx-dom-piece--v' : ''}"
            style="left:${x * k}px; top:${y * k}px;
            width:${(vertical ? g.cote : g.pieceW) * k}px;
            height:${(vertical ? g.pieceW : g.cote) * k}px">
            ${demi(textes[0], 'fx-dom-demi--g')}
            ${demi(textes[1], 'fx-dom-demi--d')}</div>`;
    };

    // --- LE PLATEAU, c'est-à-dire le PARCOURS. Vide sur la fiche, rempli sur
    // la correction — mais dans les deux cas les cases se touchent, et c'est
    // cette continuité qui fait le jeu.
    html += intertitre(solution ? 'Le parcours, dans l\'ordre' : 'Le parcours — colle les pièces bout à bout',
        b.y);
    chaine.forEach((id, rang) => {
        const c = caseDomino(g, rang);
        if (solution) {
            const p = g.pieces[id];
            if (p) html += poser(p, c.x, c.y, { vertical: c.vertical, inverse: c.inverse });
            return;
        }
        html += `<div class="fx-dom-vide" style="left:${c.x * k}px; top:${c.y * k}px;
            width:${c.w * k}px; height:${c.h * k}px">
            <i class="fx-dom-pli fx-dom-pli--${c.vertical ? 'v' : 'h'}"></i></div>`;
        html += `<div class="fx-dom-num" style="left:${c.teteX * k}px; top:${c.teteY * k}px;
            width:${g.cote * k}px; height:${g.cote * k}px;
            font-size:${Math.min(g.cote * 0.34, 3.4) * k}px">${rang + 1}</div>`;
    });
    if (solution) return html;

    // --- LES PIÈCES À DÉCOUPER, mélangées.
    html += intertitre('À découper', g.piecesY - DOM_TITRE);
    ordre.forEach((id, rang) => {
        const p = g.pieces[id];
        if (!p) return;
        const { x, y } = placeDomino(g, b, ordre.length, rang, g.piecesY);
        html += poser(p, x, y);
    });
    return html;
}

function dessinerDominosPdf(doc, item, slot, solution, champ) {
    const b = slot.boite;
    const g = geometrieDominos(item, b);
    const ordre = ordreDominos(item, solution);
    const chaine = (item.meta.pieces || []).map(p => p.id);

    const intertitre = (texte, y) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...ENCRE.gris);
        doc.text(pourPdf(texte), b.x, y + 3);
    };

    /**
     * Une pièce, couchée ou debout, ses deux moitiés dans le sens du parcours.
     * `decoupe` trace le contour franc du ciseau ; sur le parcours rempli de la
     * correction, c'est le même trait — la pièce est la même.
     */
    const poser = (p, x, y, opts = {}) => {
        const vertical = !!opts.vertical;
        const w = vertical ? g.cote : g.pieceW;
        const h = vertical ? g.pieceW : g.cote;
        const textes = opts.inverse ? [p.droite, p.gauche] : [p.gauche, p.droite];

        doc.setDrawColor(...ENCRE.trait);
        doc.setLineWidth(0.5);
        doc.setFillColor(255, 255, 255);
        // Coins CARRÉS : deux pièces mises bord à bord ne doivent pas laisser
        // d'encoche entre leurs angles, sans quoi le trait à suivre au ciseau
        // se casse quatre fois par pièce.
        doc.rect(x, y, w, h, 'FD');
        // Le pli du domino : vertical sur une pièce couchée, horizontal sur
        // une pièce debout. PLUS FIN QUE LE CONTOUR — sur le parcours rempli
        // les pièces se touchent, et si le pli avait le même trait que la
        // découpe on ne verrait plus où finit une pièce et où commence la
        // suivante, c'est-à-dire où se lit la jointure.
        doc.setLineWidth(0.25);
        if (vertical) doc.line(x, y + g.cote, x + g.cote, y + g.cote);
        else doc.line(x + g.cote, y, x + g.cote, y + g.cote);
        doc.setLineWidth(0.5);

        doc.setTextColor(...ENCRE.texte);
        doc.setFont('helvetica', 'bold');
        // La police vient de la taille du carré : 1 pt ≈ 0,3528 mm.
        const ecrire = (texte, cx, cy) => {
            const pt = policeDomino(texte, g.cote) / 0.3528;
            doc.setFontSize(pt);
            const interligne = pt * 0.42;
            // Un calcul court reste sur UNE ligne, comme à l'écran. On ne
            // met pas d'insécable dans le PDF : la police embarquée n'a pas
            // forcément ce caractère, et un glyphe manquant s'imprime.
            const court = insecable(texte) !== String(texte ?? '');
            const lignes = court ? [pourPdf(texte)]
                : doc.splitTextToSize(pourPdf(String(texte)), g.cote - 2);
            const h0 = cy - (lignes.length - 1) * (interligne / 2) + pt * 0.12;
            lignes.forEach((l, i) => doc.text(l, cx, h0 + i * interligne, { align: 'center' }));
        };
        if (vertical) {
            ecrire(textes[0], x + g.cote / 2, y + g.cote / 2);
            ecrire(textes[1], x + g.cote / 2, y + g.cote * 1.5);
        } else {
            ecrire(textes[0], x + g.cote / 2, y + g.cote / 2);
            ecrire(textes[1], x + g.cote * 1.5, y + g.cote / 2);
        }
    };

    // --- LE PARCOURS. Vide sur la fiche, rempli sur la correction ; dans les
    // deux cas les cases se TOUCHENT, et c'est ce raccord qui fait le jeu.
    intertitre(solution ? 'Le parcours, dans l\'ordre' : 'Le parcours — colle les pièces bout à bout', b.y);
    chaine.forEach((id, rang) => {
        const c = caseDomino(g, rang);
        if (solution) {
            const p = g.pieces[id];
            if (p) poser(p, c.x, c.y, { vertical: c.vertical, inverse: c.inverse });
            return;
        }
        doc.setDrawColor(...ENCRE.grille);
        doc.setLineWidth(0.35);
        if (doc.setLineDashPattern) doc.setLineDashPattern([1.4, 1.1], 0);
        doc.roundedRect(c.x, c.y, c.w, c.h, 1.2, 1.2, 'S');
        // Le pli, plus discret que le contour : il montre où tombe la coupure
        // entre les deux moitiés, donc où se lira la jointure.
        doc.setLineWidth(0.25);
        if (c.vertical) doc.line(c.x, c.y + g.cote, c.x + g.cote, c.y + g.cote);
        else doc.line(c.x + g.cote, c.y, c.x + g.cote, c.y + g.cote);
        if (doc.setLineDashPattern) doc.setLineDashPattern([], 0);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(Math.max(5, Math.min(g.cote * 0.8, 9)));
        doc.setTextColor(...ENCRE.grille);
        doc.text(String(rang + 1), c.teteX + g.cote / 2, c.teteY + g.cote / 2 + 1.2, { align: 'center' });
    });
    if (solution) return;

    // --- LES PIÈCES À DÉCOUPER, mélangées.
    intertitre('À découper', g.piecesY - DOM_TITRE);
    ordre.forEach((id, rang) => {
        const p = g.pieces[id];
        if (!p) return;
        const { x, y } = placeDomino(g, b, ordre.length, rang, g.piecesY);
        poser(p, x, y);
    });
}

// --- Le futoshiki ------------------------------------------------------------

/** La géométrie : n cases et n−1 gouttières de signes, dans le carré du slot. */
function geoFutoshiki(item, slot) {
    const { n } = item.meta;
    const gout = slot.taille / (n * 3.4);      // la gouttière vaut ~30 % d'une case
    const cote = (slot.taille - gout * (n - 1)) / n;
    const pos = (k) => slot.x + k * (cote + gout);
    const posY = (k) => slot.y + k * (cote + gout);
    return { n, gout, cote, pos, posY };
}

const signeFuto = (meta, a, b) => {
    for (const ing of meta.inegalites) {
        if (ing.petit === a && ing.grand === b) return '<';
        if (ing.petit === b && ing.grand === a) return '>';
    }
    return '';
};

function futoshikiPreviewHtml(item, slot, k, solution, champs) {
    const m = item.meta;
    const { n, cote, gout, pos, posY } = geoFutoshiki(item, slot);
    let html = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        const i = r * n + c;
        const donnee = m.donnees[i];
        html += `<div class="fx-fu-case${donnee ? ' fx-fu-case--donnee' : ''}${!donnee && champs ? ' fp-case--champ' : ''}"
            style="left:${pos(c) * k}px; top:${posY(r) * k}px; width:${cote * k}px; height:${cote * k}px;
            font-size:${cote * 0.5 * k}px">${donnee || (solution ? m.solution[i] : '')}</div>`;
        if (c + 1 < n) {
            const s = signeFuto(m, i, i + 1);
            if (s) html += `<div class="fx-fu-signe" style="left:${(pos(c) + cote) * k}px; top:${posY(r) * k}px;
                width:${gout * k}px; height:${cote * k}px; font-size:${gout * 0.9 * k}px">${s}</div>`;
        }
        if (r + 1 < n) {
            const s = signeFuto(m, i, i + n);
            if (s) html += `<div class="fx-fu-signe" style="left:${pos(c) * k}px; top:${(posY(r) + cote) * k}px;
                width:${cote * k}px; height:${gout * k}px; font-size:${gout * 0.9 * k}px">${s === '<' ? '∧' : '∨'}</div>`;
        }
    }
    return html;
}

function dessinerFutoshikiPdf(doc, item, slot, solution, champ) {
    const m = item.meta;
    const { n, cote, gout, pos, posY } = geoFutoshiki(item, slot);
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        const i = r * n + c;
        const donnee = m.donnees[i];
        doc.setDrawColor(...ENCRE.trait);
        doc.setLineWidth(0.4);
        if (donnee) { doc.setFillColor(...ENCRE.donnee); doc.rect(pos(c), posY(r), cote, cote, 'FD'); }
        else doc.rect(pos(c), posY(r), cote, cote, 'S');
        if (donnee || solution) {
            doc.setFont('helvetica', donnee ? 'bold' : 'normal');
            doc.setFontSize(Math.min(13, cote * 1.6));
            doc.setTextColor(...ENCRE.texte);
            doc.text(String(donnee || m.solution[i]), pos(c) + cote / 2, posY(r) + cote / 2 + cote * 0.15,
                { align: 'center' });
        } else if (champ) {
            champ(pos(c) + cote * 0.12, posY(r) + cote * 0.12, cote * 0.76, cote * 0.76);
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(Math.min(10, gout * 2.6));
        if (c + 1 < n) {
            const s = signeFuto(m, i, i + 1);
            if (s) doc.text(s, pos(c) + cote + gout / 2, posY(r) + cote / 2 + 1.1, { align: 'center' });
        }
        if (r + 1 < n) {
            const s = signeFuto(m, i, i + n);
            // ∧ et ∨ n'existent pas en Windows-1252 : on dessine le chevron.
            if (s) {
                const cx = pos(c) + cote / 2, cy = posY(r) + cote + gout / 2;
                const w = gout * 0.42, h = gout * 0.34;
                doc.setLineWidth(0.5);
                if (s === '<') doc.lines([[w, -h], [w, h]], cx - w, cy + h / 2);
                else doc.lines([[w, h], [w, -h]], cx - w, cy - h / 2);
            }
        }
    }
}

// --- Le slitherlink ------------------------------------------------------------

/** La grille n'est pas carrée : on la centre dans le carré du slot. */
function geoSlither(item, slot) {
    const { cols, lignes } = item.meta;
    // DE L'AIR AU-DESSUS ET AU-DESSOUS. Les points de la grille touchaient le
    // bord du bloc : sur une fiche composée, la première rangée se retrouvait
    // à la hauteur du numéro de l'exercice et la dernière contre le numéro du
    // suivant. On ne savait plus quel « 0 » appartenait à quel énoncé.
    const air = Math.max(2, slot.taille * 0.05);
    const haut = slot.taille - 2 * air;
    const pas = Math.min(slot.taille / cols, haut / lignes);
    const x0 = slot.x + (slot.taille - cols * pas) / 2;
    const y0 = slot.y + air + (haut - lignes * pas) / 2;
    return { cols, lignes, pas, px: (x) => x0 + x * pas, py: (y) => y0 + y * pas };
}

function slitherlinkPreviewHtml(item, slot, k, solution) {
    const m = item.meta;
    const { cols, lignes, pas, px, py } = geoSlither(item, slot);
    const ep = Math.max(0.5, pas * 0.09);        // l'épaisseur du tracé
    let html = '';
    if (solution) {
        for (let y = 0; y <= lignes; y++) for (let x = 0; x < cols; x++) {
            if (!m.solution.h[y * cols + x]) continue;
            html += `<div class="fx-sl-trait" style="left:${px(x) * k}px; top:${(py(y) - ep / 2) * k}px;
                width:${pas * k}px; height:${ep * k}px"></div>`;
        }
        for (let y = 0; y < lignes; y++) for (let x = 0; x <= cols; x++) {
            if (!m.solution.v[y * (cols + 1) + x]) continue;
            html += `<div class="fx-sl-trait" style="left:${(px(x) - ep / 2) * k}px; top:${py(y) * k}px;
                width:${ep * k}px; height:${pas * k}px"></div>`;
        }
    }
    for (let y = 0; y < lignes; y++) for (let x = 0; x < cols; x++) {
        const n = m.indices[y * cols + x];
        if (n < 0) continue;
        html += `<div class="fx-sl-chiffre" style="left:${px(x) * k}px; top:${py(y) * k}px;
            width:${pas * k}px; height:${pas * k}px; font-size:${pas * 0.52 * k}px">${n}</div>`;
    }
    // Les points par-dessus : c'est le quadrillage sur lequel on trace.
    const r = Math.max(0.32, pas * 0.06);
    for (let y = 0; y <= lignes; y++) for (let x = 0; x <= cols; x++) {
        html += `<div class="fx-sl-point" style="left:${(px(x) - r) * k}px; top:${(py(y) - r) * k}px;
            width:${2 * r * k}px; height:${2 * r * k}px"></div>`;
    }
    return html;
}

function dessinerSlitherlinkPdf(doc, item, slot, solution) {
    const m = item.meta;
    const { cols, lignes, pas, px, py } = geoSlither(item, slot);
    if (solution) {
        doc.setDrawColor(...ENCRE.trait);
        doc.setLineWidth(Math.max(0.5, pas * 0.09));
        for (let y = 0; y <= lignes; y++) for (let x = 0; x < cols; x++) {
            if (m.solution.h[y * cols + x]) doc.line(px(x), py(y), px(x + 1), py(y));
        }
        for (let y = 0; y < lignes; y++) for (let x = 0; x <= cols; x++) {
            if (m.solution.v[y * (cols + 1) + x]) doc.line(px(x), py(y), px(x), py(y + 1));
        }
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(Math.min(11, pas * 1.5));
    doc.setTextColor(...ENCRE.texte);
    for (let y = 0; y < lignes; y++) for (let x = 0; x < cols; x++) {
        const n = m.indices[y * cols + x];
        if (n < 0) continue;
        doc.text(String(n), px(x) + pas / 2, py(y) + pas / 2 + pas * 0.18, { align: 'center' });
    }
    doc.setFillColor(...ENCRE.trait);
    const r = Math.max(0.3, pas * 0.06);
    for (let y = 0; y <= lignes; y++) for (let x = 0; x <= cols; x++) {
        doc.circle(px(x), py(y), r, 'F');
    }
}

// --- LE HASHI SUR PAPIER --------------------------------------------------------
//
// Rémy : « je voulais le hashi ». C'est un puzzle de journal : des îles, des
// chiffres, et de la place pour tirer des traits à la règle.
//
// LES ÎLES SONT DES CERCLES ÉPAIS, les ponts des traits fins. C'est ce qui
// permet de tracer par-dessus au crayon sans que la figure imprimée et celle de
// l'élève se confondent — et c'est aussi ce qui survit à la photocopie. Deux
// ponts se dessinent comme deux traits parallèles, écartés d'un tiers de case :
// serrés, ils font une barre épaisse qu'on ne sait plus compter.

function geoHashi(item, slot) {
    const m = item.meta;
    const b = boiteDe(slot);
    // ON CADRE SUR LES ÎLES, PAS SUR LA GRILLE. Le tirage laisse presque
    // toujours une bande vide en haut, en bas ou sur un côté : dessiner les
    // douze colonnes nominales, c'est payer ce vide en taille de cercle. On
    // mesure la boîte réellement occupée et l'on ajuste dessus — même leçon
    // que pour les figures d'angles.
    const xs = m.iles.map(i => i.x), ys = m.iles.map(i => i.y);
    const x1 = Math.min(...xs), y1 = Math.min(...ys);
    const cols = Math.max(...xs) - x1 + 1, lignes = Math.max(...ys) - y1 + 1;
    const pas = Math.min((b.w - 2) / cols, (b.h - 2) / lignes);
    const w = pas * cols, h = pas * lignes;
    const x0 = b.x + (b.w - w) / 2, y0 = b.y + (b.h - h) / 2;
    return {
        b, m, pas,
        // Le centre de la case (x, y) : c'est là que se pose une île.
        cx: (x) => x0 + (x - x1 + 0.5) * pas,
        cy: (y) => y0 + (y - y1 + 0.5) * pas,
        rayon: Math.max(1.6, pas * 0.34),
        ecart: pas * 0.16
    };
}

/** Les deux traits d'un pont, ou le seul : décalés de part et d'autre de l'axe. */
function traitsPont(g, e, n) {
    const A = g.m.iles[e.a], B = g.m.iles[e.b];
    const ax = g.cx(A.x), ay = g.cy(A.y), bx = g.cx(B.x), by = g.cy(B.y);
    const d = g.ecart;
    if (n === 2) {
        return e.dir === 'h'
            ? [[ax, ay - d, bx, by - d], [ax, ay + d, bx, by + d]]
            : [[ax - d, ay, bx - d, by], [ax + d, ay, bx + d, by]];
    }
    return [[ax, ay, bx, by]];
}

function hashiPreviewHtml(item, slot, k, solution) {
    const g = geoHashi(item, slot);
    const T = (v) => (v * k).toFixed(2);
    let d = '';
    if (solution) {
        g.m.aretes.forEach((e, i) => {
            const n = g.m.solution[i];
            if (!n) return;
            traitsPont(g, e, n).forEach(([x1, y1, x2, y2]) => {
                d += `<line x1="${T(x1)}" y1="${T(y1)}" x2="${T(x2)}" y2="${T(y2)}"
                    stroke="#2f855a" stroke-width="${T(0.45)}" stroke-linecap="round"/>`;
            });
        });
    }
    let html = `<svg class="fx-hs-svg" style="left:0; top:0; width:100%; height:100%">${d}</svg>`;
    g.m.iles.forEach(il => {
        const r = g.rayon;
        html += `<div class="fx-hs-ile" style="left:${T(g.cx(il.x) - r)}px; top:${T(g.cy(il.y) - r)}px;
            width:${T(2 * r)}px; height:${T(2 * r)}px; font-size:${T(r * 1.15)}px">${il.n}</div>`;
    });
    return html;
}

function dessinerHashiPdf(doc, item, slot, solution) {
    const g = geoHashi(item, slot);
    if (solution) {
        doc.setDrawColor(47, 133, 90);
        doc.setLineWidth(0.45);
        doc.setLineCap('round');
        g.m.aretes.forEach((e, i) => {
            const n = g.m.solution[i];
            if (!n) return;
            traitsPont(g, e, n).forEach(([x1, y1, x2, y2]) => doc.line(x1, y1, x2, y2));
        });
        doc.setLineCap('butt');
    }
    // LES ÎLES PAR-DESSUS, ET PLEINES DE BLANC : un pont qui s'arrête au bord
    // du cercle demanderait de connaître le rayon en chaque point ; un disque
    // blanc posé après coup fait le même travail et ne se trompe jamais.
    doc.setLineWidth(0.5);
    g.m.iles.forEach(il => {
        const x = g.cx(il.x), y = g.cy(il.y);
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...ENCRE.trait);
        doc.circle(x, y, g.rayon, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(Math.max(5, g.rayon * 2.6));
        doc.setTextColor(...ENCRE.trait);
        doc.text(String(il.n), x, y + g.rayon * 0.42, { align: 'center' });
    });
}

// --- Le carré magique ------------------------------------------------------------

/**
 * Le carré et sa somme, DANS l'emplacement — pas un millimètre dessous.
 *
 * La somme s'écrivait sous le carré, au-delà du bloc : sur une fiche composée,
 * elle tombait sur le numéro de l'exercice suivant et les deux devenaient
 * illisibles. Le carré cède la hauteur de la ligne, et tout tient.
 */
function geoCarreMagique(item, slot) {
    const { n } = item.meta;
    const sommeH = Math.max(4, Math.min(slot.taille * 0.1, 6));
    const cote = (slot.taille - sommeH) / n;
    return { n, cote, sommeH, sommeY: slot.y + cote * n };
}

function carreMagiquePreviewHtml(item, slot, k, solution, champs) {
    const { cases, trous, somme } = item.meta;
    const { n, cote, sommeH, sommeY } = geoCarreMagique(item, slot);
    let html = `<div class="fx-cm-somme" style="left:${slot.x * k}px; top:${(sommeY + sommeH * 0.15) * k}px;
        width:${slot.taille * k}px; font-size:${3 * k}px">Somme magique : <b>${somme}</b></div>`;
    for (let i = 0; i < cases.length; i++) {
        const x = slot.x + (i % n) * cote, y = slot.y + Math.floor(i / n) * cote;
        const trou = trous.includes(i);
        html += `<div class="fx-cm-case${trou ? ' fx-cm-case--trou' : ''}${trou && champs ? ' fp-case--champ' : ''}"
            style="left:${x * k}px; top:${y * k}px; width:${cote * k}px; height:${cote * k}px;
            font-size:${cote * 0.42 * k}px">${trou && !solution ? '' : cases[i]}</div>`;
    }
    return html;
}

function dessinerCarreMagiquePdf(doc, item, slot, solution, champ) {
    const { cases, trous, somme } = item.meta;
    const { n, cote, sommeH, sommeY } = geoCarreMagique(item, slot);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(Math.max(6, Math.min(sommeH * 1.5, 9)));
    doc.setTextColor(...ENCRE.texte);
    doc.text(pourPdf(`Somme magique : ${somme}`), slot.x + (cote * n) / 2, sommeY + sommeH * 0.78,
        { align: 'center' });
    // LES FONDS D'ABORD, LES TRAITS ENSUITE — et les fonds DÉBORDENT d'un
    // quart de millimètre.
    //
    // Rémy : « parfois en pdf, les carrés d'un carré ne sont pas collés, il y a
    // un petit vide ». Chaque case était peinte puis bordée dans la foulée
    // (`FD`) : deux cases données côte à côte laissaient voir, entre leurs deux
    // fonds, la bande blanche que le trait ne recouvre pas tout à fait — le
    // rendu d'un PDF arrondit chaque contour à sa façon, et un fond qui
    // s'arrête pile sur le contour laisse passer le papier.
    // En peignant tous les fonds d'abord, avec un léger recouvrement, puis tous
    // les traits par-dessus, il n'y a plus d'interstice possible.
    const debord = 0.25;
    doc.setFillColor(...ENCRE.donnee);
    for (let i = 0; i < cases.length; i++) {
        if (trous.includes(i)) continue;
        const x = slot.x + (i % n) * cote, y = slot.y + Math.floor(i / n) * cote;
        doc.rect(x - debord, y - debord, cote + debord * 2, cote + debord * 2, 'F');
    }
    for (let i = 0; i < cases.length; i++) {
        const x = slot.x + (i % n) * cote, y = slot.y + Math.floor(i / n) * cote;
        const trou = trous.includes(i);
        doc.setDrawColor(...ENCRE.trait);
        doc.setLineWidth(0.35);
        doc.rect(x, y, cote, cote, 'S');
        if (!trou || solution) {
            doc.setFont('helvetica', trou ? 'normal' : 'bold');
            doc.setFontSize(Math.min(14, cote * 1.7));
            doc.text(String(cases[i]), x + cote / 2, y + cote / 2 + cote * 0.14, { align: 'center' });
        } else if (champ) {
            champ(x + cote * 0.12, y + cote * 0.12, cote * 0.76, cote * 0.76);
        }
    }
    doc.setLineWidth(0.7);
    doc.rect(slot.x, slot.y, cote * n, cote * n, 'S');
}

const etiquetteLogi = (cat, i) => cat.nombres ? String(cat.nombres[i]) : ((cat.courts && cat.courts[i]) || cat.valeurs[i]);
const echapperSheet = (t) => String(t).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

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
    return {
        p1, p2, perp, angle, angle2, reciproque,
        noms: [
            { ...bout(p1, -1), texte: `(${f.noms.p1})` },
            { ...bout(p2, 1), texte: `(${f.noms.p2})` },
            { ...dedans(perp.x2 + nx * 1.5, perp.y2 + ny * 1.5 + 3.2), texte: `(${f.noms.perp})` }
        ],
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

/**
 * La marque d'une paire, dessinée au trait. Huit formes franches, qui restent
 * distinctes à cinq millimètres et après une photocopie — là où huit
 * caractères de police se ressembleraient tous.
 */
function dessinerMarque(doc, id, cx, cy, r, encre) {
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

// --- Compter sur un solide --------------------------------------------------

/** Le solide dessiné dans son emplacement, plus la place du tableau. */
/* LES FACES VUES SONT TEINTÉES. Un solide en fil de fer se compte mal : on ne
   sait plus quelle face on a déjà comptée. Trois tons doux, pris à tour de
   rôle, séparent les faces sans transformer la fiche en vitrail — et le noir et
   blanc reste disponible pour la photocopieuse. */
const TEINTES_SOLIDE = [[219, 234, 254], [224, 231, 255], [237, 233, 254]];
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

// --- LES JEUX À DÉCOUPER : LA TOUR DE BRAHMA ET LES GRENOUILLES ----------------
//
// Rémy : « j'aimerai ces deux jeux là en catégorie défi ou énigme ». Ce sont
// deux pages de son « Coin des jeux mathématiques », et ce sont des JEUX À
// DÉCOUPER : la feuille porte le plateau d'un côté, les pièces de l'autre, et
// un trait de découpe entre les deux.
//
// LE PLATEAU ET LES PIÈCES SUR LA MÊME FEUILLE, séparés par un pointillé : un
// élève reçoit une page et repart avec un jeu. C'est tout l'intérêt du format,
// et c'est pour cela qu'on n'imprime qu'UN plateau par page — deux jeux à
// découper sur une feuille donnent deux jeux trop petits pour être manipulés.
//
// LES VIGNETTES « DÉPART / ARRIVÉE / AUTORISÉ / INTERDIT » NE SONT PAS UN
// ORNEMENT. Rémy les met, et il a raison : une règle négative — « jamais une
// boule sur plus petite » — se comprend en la VOYANT enfreinte, pas en la
// lisant. Elles tiennent en bas de page et valent trois lignes de consigne.

/**
 * LA PART DU PLUS GRAND DIAMÈTRE que prend la boule de taille `b`.
 *
 * C'est LA donnée du jeu : une boule ne se pose que sur plus grosse qu'elle, et
 * la seule façon de le voir est que les tailles diffèrent VRAIMENT. Un écart de
 * quinze pour cent entre la 3 et la 4 ne se distingue pas sur une photocopie —
 * on part donc de quarante pour cent pour la plus petite.
 */
const partBoule = (b, n) => 0.4 + 0.6 * (b / n);

/** La hauteur d'une pile complète, en diamètres : la somme des parts. */
function sommeParts(n) {
    let s = 0;
    for (let b = 1; b <= n; b++) s += partBoule(b, n);
    return s;
}

/** Un mini-plateau de la tour, pour les vignettes du bas. */
function miniTour(x, y, w, h, piles, n) {
    const larg = w / 3;
    // UNE BOULE EST RONDE, et elle l'est aussi dans les vignettes.
    //
    // Rémy, en voyant la fiche : « attention à bien utiliser des cercles ». La
    // largeur portait la taille — c'est la règle du jeu en dessin, et c'était
    // juste — mais la HAUTEUR restait la même pour toutes : on obtenait des
    // galets de plus en plus écrasés, et la plus grosse ne ressemblait plus à
    // une boule du tout. Le diamètre porte donc la taille dans les deux sens.
    //
    // Et la pile s'empile sur les DIAMÈTRES, pas sur un pas fixe : sans cela,
    // une grosse boule chevaucherait sa voisine ou flotterait au-dessus.
    const dMax = Math.min(larg * 0.86, h / sommeParts(n));
    return {
        cadres: [0, 1, 2].map(p => ({ x: x + p * larg + larg * 0.08, y,
            w: larg * 0.84, h })),
        boules: piles.flatMap((pile, p) => {
            let empile = 0;
            return pile.map((b) => {
                const d = dMax * partBoule(b, n);
                const cy = y + h - empile - d / 2;
                empile += d;
                return { b, w: d, hh: d, cx: x + p * larg + larg / 2, cy };
            });
        })
    };
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
function planchePasAPas(b, nb, rapport, opts = {}) {
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

/**
 * LE RAPPORT D'UNE VIGNETTE DE TOUR : trois conduits de large, et de quoi
 * empiler toutes les boules. On l'écrit pour que la planche cherche ses
 * colonnes sur la vraie forme du plateau, et non sur un carré.
 */
const rapportTour = (n) => 3 / (0.86 * sommeParts(n));

/** Le titre de la planche : ce que le corrigé annonce en haut de page. */
const titrePasAPas = (coups) => `La partie parfaite, coup par coup — ${coups} coups`;

/** LA SOLUTION DE LA TOUR, en vignettes — aperçu. */
function brahmaSolutionHtml(item, slot, k) {
    const b = boiteDe(slot);
    const n = item.meta.n;
    const etapes = etapesBrahma(n);
    const pl = planchePasAPas(b, etapes.length, rapportTour(n));
    if (!pl) return '';
    const T = (v) => (v * k).toFixed(2);
    let html = `<div class="fx-pas-titre" style="left:${T(b.x)}px; top:${T(b.y)}px;
        width:${T(b.w)}px; font-size:${T(4)}px">${titrePasAPas(etapes.length - 1)}</div>`;
    etapes.forEach((piles, i) => {
        const o = pl.place(i);
        html += `<div class="fx-pas-legende" style="left:${T(o.x)}px;
            top:${T(o.yLegende - pl.legende)}px; width:${T(pl.w)}px;
            font-size:${T(pl.legende)}px">${pl.legendeDe(i)}</div>`;
        const mini = miniTour(o.x, o.y, pl.w, pl.h, piles, n);
        mini.cadres.forEach(c => {
            html += `<div class="fx-tb-mini" style="left:${T(c.x)}px; top:${T(c.y)}px;
                width:${T(c.w)}px; height:${T(c.h)}px"></div>`;
        });
        mini.boules.forEach(o2 => {
            html += `<div class="fx-tb-miniboule" style="left:${T(o2.cx - o2.w / 2)}px;
                top:${T(o2.cy - o2.hh / 2)}px; width:${T(o2.w)}px; height:${T(o2.hh)}px"></div>`;
        });
    });
    return html;
}

/** LA SOLUTION DE LA TOUR, en vignettes — PDF. */
function dessinerBrahmaSolutionPdf(doc, item, slot) {
    const b = boiteDe(slot);
    const n = item.meta.n;
    const etapes = etapesBrahma(n);
    const pl = planchePasAPas(b, etapes.length, rapportTour(n));
    if (!pl) return;
    const aplat = polycopieEnCouleur();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(4 / 0.3528);
    doc.setTextColor(...ENCRE.texte);
    doc.text(pourPdf(titrePasAPas(etapes.length - 1)), b.x + b.w / 2, b.y + 4, { align: 'center' });
    etapes.forEach((piles, i) => {
        const o = pl.place(i);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(Math.max(4, pl.legende / 0.3528));
        doc.setTextColor(...ENCRE.gris);
        doc.text(pourPdf(pl.legendeDe(i)), o.xLegende, o.yLegende, { align: 'center' });
        const mini = miniTour(o.x, o.y, pl.w, pl.h, piles, n);
        doc.setLineWidth(0.2);
        doc.setDrawColor(...ENCRE.grille);
        mini.cadres.forEach(c => doc.roundedRect(c.x, c.y, c.w, c.h, 0.5, 0.5));
        mini.boules.forEach(o2 => {
            doc.setDrawColor(...ENCRE.trait);
            doc.setFillColor(...(aplat ? ENCRE.donnee : [255, 255, 255]));
            doc.setLineWidth(0.25);
            doc.roundedRect(o2.cx - o2.w / 2, o2.cy - o2.hh / 2, o2.w, o2.hh,
                o2.hh / 2, o2.hh / 2, 'FD');
        });
    });
}

/** LA SOLUTION DES GRENOUILLES, en vignettes — aperçu. */
function grenouillesSolutionHtml(item, slot, k) {
    const b = boiteDe(slot);
    const n = item.meta.n, cases = n * 2 + 1;
    const etapes = etapesGrenouilles(n);
    const pl = planchePasAPas(b, etapes.length, cases);
    if (!pl) return '';
    const T = (v) => (v * k).toFixed(2);
    const pad = pl.w / cases;
    let html = `<div class="fx-pas-titre" style="left:${T(b.x)}px; top:${T(b.y)}px;
        width:${T(b.w)}px; font-size:${T(4)}px">${titrePasAPas(etapes.length - 1)}</div>`;
    etapes.forEach((ruban, i) => {
        const o = pl.place(i);
        html += `<div class="fx-pas-legende" style="left:${T(o.x)}px;
            top:${T(o.yLegende - pl.legende)}px; width:${T(pl.w)}px;
            font-size:${T(pl.legende)}px">${pl.legendeDe(i)}</div>`;
        ruban.forEach((c, j) => {
            html += `<div class="fx-gr-mini${c ? ` fx-gr-mini--${c}` : ''}"
                style="left:${T(o.x + j * pad)}px; top:${T(o.y)}px;
                width:${T(pad)}px; height:${T(pad)}px"></div>`;
        });
    });
    return html;
}

/** LA SOLUTION DES GRENOUILLES, en vignettes — PDF. */
function dessinerGrenouillesSolutionPdf(doc, item, slot) {
    const b = boiteDe(slot);
    const n = item.meta.n, cases = n * 2 + 1;
    const etapes = etapesGrenouilles(n);
    const pl = planchePasAPas(b, etapes.length, cases);
    if (!pl) return;
    const aplat = polycopieEnCouleur();
    const pad = pl.w / cases;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(4 / 0.3528);
    doc.setTextColor(...ENCRE.texte);
    doc.text(pourPdf(titrePasAPas(etapes.length - 1)), b.x + b.w / 2, b.y + 4, { align: 'center' });
    etapes.forEach((ruban, i) => {
        const o = pl.place(i);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(Math.max(4, pl.legende / 0.3528));
        doc.setTextColor(...ENCRE.gris);
        doc.text(pourPdf(pl.legendeDe(i)), o.xLegende, o.yLegende, { align: 'center' });
        ruban.forEach((c, j) => {
            doc.setLineWidth(0.18);
            doc.setDrawColor(...ENCRE.grille);
            doc.setFillColor(...(aplat && c
                ? (c === 'V' ? [220, 240, 214] : [251, 220, 220]) : [255, 255, 255]));
            doc.roundedRect(o.x + j * pad, o.y, pad, pad, 0.4, 0.4, 'FD');
            if (!c) return;
            // Trop petite pour une bête dessinée : l'INITIALE dit la couleur,
            // et elle survit à la photocopieuse en noir et blanc.
            doc.setFontSize(Math.max(3.5, pad * 1.5));
            doc.setTextColor(...(c === 'V' ? [47, 107, 35] : [143, 31, 20]));
            doc.text(c, o.x + (j + 0.5) * pad, o.y + pad * 0.74, { align: 'center' });
        });
    });
}

/** LA SOLUTION DU PARKING, en vignettes — aperçu. */
function parkingSolutionHtml(item, slot, k) {
    const b = boiteDe(slot);
    const m = item.meta;
    const etapes = etapesParking(m.n);
    const pl = planchePasAPas(b, etapes.length, 5 / m.hauteur);
    if (!pl) return '';
    const T = (v) => (v * k).toFixed(2);
    const cote = pl.w / 5;
    let html = `<div class="fx-pas-titre" style="left:${T(b.x)}px; top:${T(b.y)}px;
        width:${T(b.w)}px; font-size:${T(4)}px">${titrePasAPas(etapes.length - 1)}</div>`;
    etapes.forEach((etat, i) => {
        const o = pl.place(i);
        html += `<div class="fx-pas-legende" style="left:${T(o.x)}px;
            top:${T(o.yLegende - pl.legende)}px; width:${T(pl.w)}px;
            font-size:${T(pl.legende)}px">${pl.legendeDe(i)}</div>`;
        m.cases.forEach((c, j) => {
            const col = etat[j];
            html += `<div class="fx-pk-mini${col ? ` fx-pk-mini--${col}` : ''}"
                style="left:${T(o.x + c.x * cote)}px; top:${T(o.y + c.y * cote)}px;
                width:${T(cote)}px; height:${T(cote)}px"></div>`;
        });
    });
    return html;
}

/** LA SOLUTION DU PARKING, en vignettes — PDF. */
function dessinerParkingSolutionPdf(doc, item, slot) {
    const b = boiteDe(slot);
    const m = item.meta;
    const etapes = etapesParking(m.n);
    const pl = planchePasAPas(b, etapes.length, 5 / m.hauteur);
    if (!pl) return;
    const aplat = polycopieEnCouleur();
    const cote = pl.w / 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(4 / 0.3528);
    doc.setTextColor(...ENCRE.texte);
    doc.text(pourPdf(titrePasAPas(etapes.length - 1)), b.x + b.w / 2, b.y + 4, { align: 'center' });
    etapes.forEach((etat, i) => {
        const o = pl.place(i);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(Math.max(3.5, pl.legende / 0.3528));
        doc.setTextColor(...ENCRE.gris);
        doc.text(pourPdf(pl.legendeDe(i)), o.xLegende, o.yLegende, { align: 'center' });
        m.cases.forEach((c, j) => {
            const col = etat[j];
            doc.setLineWidth(0.15);
            doc.setDrawColor(...ENCRE.grille);
            doc.setFillColor(...(aplat && col
                ? (col === 'B' ? [214, 226, 250] : [251, 220, 220]) : [255, 255, 255]));
            doc.rect(o.x + c.x * cote, o.y + c.y * cote, cote, cote, 'FD');
            if (!col) return;
            doc.setFontSize(Math.max(3.5, cote * 1.5));
            doc.setTextColor(...(col === 'B' ? [28, 58, 138] : [143, 31, 20]));
            doc.text(col, o.x + (c.x + 0.5) * cote, o.y + (c.y + 0.74) * cote, { align: 'center' });
        });
    });
}

function geoBrahma(item, slot) {
    const m = item.meta;
    const b = boiteDe(slot);
    // Trois bandes : le plateau et les pièces, puis les vignettes.
    const hVignettes = Math.min(b.h * 0.26, 42);
    const hHaut = b.h - hVignettes - 6;
    const largePlateau = b.w * 0.66;
    const n = m.n;
    const taille = Math.max(2.2, Math.min(hVignettes * 0.12, 3.4));

    // LE DIAMÈTRE DES BOULES SE CALCULE UNE FOIS, ET TOUT S'Y ACCROCHE.
    //
    // Rémy : « le plus c'est que le jeu profite au mieux de l'espace sur la
    // feuille ». Le plateau était plafonné à quatorze millimètres de hauteur
    // par boule — soixante-dix pour quatre — et laissait quarante millimètres
    // de blanc au-dessus et au-dessous d'une page entière.
    //
    // Trois contraintes bornent la boule, et c'est la plus dure qui gagne :
    // la LARGEUR de sa colonne, la HAUTEUR qu'il faut pour les empiler toutes,
    // et surtout LA LARGEUR D'UN CONDUIT — une boule qu'on découpe et qui
    // n'entre pas dans le plateau, on s'en aperçoit trop tard.
    const piecesW = b.w - largePlateau - 8;
    const dispoPieces = hHaut - taille * 1.6;
    const parConduit = (largePlateau - 16) / 3;
    const D = Math.min(
        piecesW * 0.94,
        dispoPieces / sommeParts(n),
        parConduit / (1.15 * partBoule(n, n))
    );
    const grosse = D * partBoule(n, n);
    // Le conduit accueille la plus grosse boule avec un peu de jeu, sans
    // jamais dépasser le tiers du plateau — sinon le socle sort de la page.
    const largConduit = Math.min(parConduit, Math.max(grosse * 1.15, parConduit * 0.55));
    // Le socle déborde de six millimètres autour des conduits : il faut donc
    // les rentrer d'autant, sinon il remonte au-dessus de sa boîte et mange le
    // titre du bloc — « Jeu 1 » passait sous le gris.
    const hConduit = hHaut - 16;
    const socleW = largConduit * 3 + 12, socleH = hConduit + 12;
    return {
        m, b, n, hVignettes, hHaut, D,
        socle: { x: b.x + (largePlateau - socleW) / 2, y: b.y + (hHaut - socleH) / 2,
            w: socleW, h: socleH },
        largConduit, hConduit,
        // La ligne de découpe, et la colonne des pièces à droite.
        xCoupe: b.x + largePlateau + 2,
        pieces: { x: b.x + largePlateau + 6, w: b.w - largePlateau - 8, y: b.y, h: hHaut },
        yVignettes: b.y + hHaut + 6,
        taille
    };
}

/** Les quatre vignettes du bas : le départ, l'arrivée, un coup permis, un coup interdit. */
function vignettesBrahma(g) {
    const n = g.n;
    const tout = Array.from({ length: n }, (_, i) => n - i);
    // AUTORISÉ ET INTERDIT SE JOUENT SUR LES DEUX EXTRÊMES, la plus petite et
    // la plus grosse. Avec la 3 et la 4, l'écart de largeur est de quinze pour
    // cent et la vignette ne montre plus rien — alors que c'est précisément une
    // différence de taille qu'elle doit rendre évidente.
    return [
        { titre: 'Départ', piles: [tout, [], []] },
        { titre: 'Arrivée', piles: [[], [], tout] },
        { titre: 'Autorisé', piles: [[n, 1], [], []] },
        { titre: 'INTERDIT', piles: [[1, n], [], []], faute: true }
    ];
}

function brahmaPreviewHtml(item, slot, k, solution) {
    if (solution) return brahmaSolutionHtml(item, slot, k);
    const g = geoBrahma(item, slot);
    const T = (v) => (v * k).toFixed(2);
    let html = `<div class="fx-tb-socle" style="left:${T(g.socle.x)}px; top:${T(g.socle.y)}px;
        width:${T(g.socle.w)}px; height:${T(g.socle.h)}px"></div>`;
    for (let p = 0; p < 3; p++) {
        html += `<div class="fx-tb-conduit" style="left:${T(g.socle.x + 6 + p * g.largConduit)}px;
            top:${T(g.socle.y + 6)}px; width:${T(g.largConduit - 4)}px;
            height:${T(g.hConduit)}px"></div>`;
    }
    // Le trait de découpe, puis les pièces.
    html += `<div class="fx-tb-coupe" style="left:${T(g.xCoupe)}px; top:${T(g.b.y)}px;
        height:${T(g.hHaut)}px"></div>`;
    html += `<div class="fx-tb-etiq" style="left:${T(g.pieces.x)}px; top:${T(g.b.y)}px;
        width:${T(g.pieces.w)}px; font-size:${T(g.taille)}px">Boules à découper</div>`;
    // LES BOULES SONT EMPILÉES PAR TAILLE DÉCROISSANTE, chacune à SON diamètre :
    // c'est ce qui rend la règle du jeu visible avant même d'avoir découpé.
    // Le diamètre vient de la géométrie : le recalculer ici, c'était risquer
    // qu'une boule découpée n'entre pas dans le conduit dessiné à côté.
    const D = g.D;
    let y = g.b.y + g.taille * 1.6;
    for (let taille = g.n; taille >= 1; taille--) {
        const d = D * partBoule(taille, g.n);
        html += `<div class="fx-tb-boule" style="left:${T(g.pieces.x + (g.pieces.w - d) / 2)}px;
            top:${T(y)}px; width:${T(d)}px; height:${T(d)}px;
            font-size:${T(d * 0.46)}px">${taille}</div>`;
        y += d;
    }
    // Les quatre vignettes.
    const largeV = g.b.w / 4;
    vignettesBrahma(g).forEach((v, i) => {
        const x = g.b.x + i * largeV;
        html += `<div class="fx-tb-vtitre${v.faute ? ' fx-tb-vtitre--ko' : ''}"
            style="left:${T(x + 2)}px; top:${T(g.yVignettes)}px; width:${T(largeV - 4)}px;
            font-size:${T(g.taille)}px">${v.titre}</div>`;
        const mini = miniTour(x + 3, g.yVignettes + g.taille * 1.5, largeV - 6,
            g.hVignettes - g.taille * 1.6, v.piles, g.n);
        mini.cadres.forEach(c => {
            html += `<div class="fx-tb-mini" style="left:${T(c.x)}px; top:${T(c.y)}px;
                width:${T(c.w)}px; height:${T(c.h)}px"></div>`;
        });
        mini.boules.forEach(o => {
            html += `<div class="fx-tb-miniboule${v.faute ? ' fx-tb-miniboule--ko' : ''}"
                style="left:${T(o.cx - o.w / 2)}px; top:${T(o.cy - o.hh / 2)}px;
                width:${T(o.w)}px; height:${T(o.hh)}px"></div>`;
        });
    });
    return html;
}

function dessinerBrahmaPdf(doc, item, slot, solution) {
    if (solution) return dessinerBrahmaSolutionPdf(doc, item, slot);
    const g = geoBrahma(item, slot);
    const aplat = polycopieEnCouleur();

    doc.setLineWidth(0.4);
    doc.setDrawColor(...ENCRE.trait);
    if (aplat) { doc.setFillColor(...ENCRE.donnee); doc.roundedRect(g.socle.x, g.socle.y, g.socle.w, g.socle.h, 2, 2, 'FD'); }
    else doc.roundedRect(g.socle.x, g.socle.y, g.socle.w, g.socle.h, 2, 2);
    for (let p = 0; p < 3; p++) {
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(g.socle.x + 6 + p * g.largConduit, g.socle.y + 6,
            g.largConduit - 4, g.hConduit, 1.5, 1.5, 'FD');
    }

    // LE TRAIT DE DÉCOUPE : un pointillé, et c'est un ordre — c'est là qu'on
    // passe les ciseaux.
    doc.setDrawColor(...ENCRE.gris);
    doc.setLineWidth(0.3);
    if (doc.setLineDashPattern) doc.setLineDashPattern([1.4, 1.2], 0);
    doc.line(g.xCoupe, g.b.y, g.xCoupe, g.b.y + g.b.h);
    if (doc.setLineDashPattern) doc.setLineDashPattern([], 0);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(g.taille / 0.3528);
    doc.setTextColor(...ENCRE.gris);
    doc.text(pourPdf('Boules à découper'), g.pieces.x + g.pieces.w / 2, g.b.y + g.taille,
        { align: 'center' });

    // Le même diamètre que l'aperçu, et que les conduits : il vient de la
    // géométrie, il ne se recalcule pas ici.
    const D = g.D;
    let yb = g.b.y + g.taille * 1.6;
    for (let taille = g.n; taille >= 1; taille--) {
        const d = D * partBoule(taille, g.n);
        const cx = g.pieces.x + g.pieces.w / 2;
        const cy = yb + d / 2;
        yb += d;
        doc.setLineWidth(0.4);
        doc.setDrawColor(...ENCRE.trait);
        doc.setFillColor(...(aplat ? ENCRE.donnee : [255, 255, 255]));
        doc.circle(cx, cy, d / 2, 'FD');
        doc.setFontSize(Math.max(6, d * 1.2));
        doc.setTextColor(...ENCRE.trait);
        doc.text(String(taille), cx, cy + d * 0.16, { align: 'center' });
    }

    const largeV = g.b.w / 4;
    vignettesBrahma(g).forEach((v, i) => {
        const x = g.b.x + i * largeV;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(g.taille / 0.3528);
        doc.setTextColor(...(v.faute ? [197, 48, 48] : ENCRE.texte));
        doc.text(pourPdf(v.titre), x + largeV / 2, g.yVignettes + g.taille, { align: 'center' });
        const mini = miniTour(x + 3, g.yVignettes + g.taille * 1.5, largeV - 6,
            g.hVignettes - g.taille * 1.6, v.piles, g.n);
        doc.setLineWidth(0.25);
        doc.setDrawColor(...ENCRE.grille);
        mini.cadres.forEach(c => doc.roundedRect(c.x, c.y, c.w, c.h, 0.8, 0.8));
        mini.boules.forEach(o => {
            doc.setDrawColor(...(v.faute ? [197, 48, 48] : ENCRE.trait));
            doc.setFillColor(...(aplat ? ENCRE.donnee : [255, 255, 255]));
            doc.setLineWidth(0.3);
            doc.roundedRect(o.cx - o.w / 2, o.cy - o.hh / 2, o.w, o.hh, o.hh / 2, o.hh / 2, 'FD');
        });
    });
}

// --- LES GRENOUILLES À DÉCOUPER ------------------------------------------------

/** La grenouille, en formes simples : deux cuisses, un corps, deux yeux. */
function dessinerGrenouillePdf(doc, cx, cy, d, fonce, clair, aplat) {
    const u = d / 100;
    const E = (x, y, rx, ry, teinte) => {
        doc.setFillColor(...(aplat ? teinte : [255, 255, 255]));
        doc.setDrawColor(...ENCRE.trait);
        doc.setLineWidth(0.25);
        doc.ellipse(cx + (x - 50) * u, cy + (y - 45) * u, rx * u, ry * u, 'FD');
    };
    // L'ORDRE COMPTE : les cuisses, PUIS les yeux, PUIS le corps par-dessus.
    // Dessinés après, les yeux laissaient voir le trait du corps au travers et
    // la bête ressemblait à une grenouille à lunettes. Posés dessous, il ne
    // dépasse que la bosse — ce qui est exactement un œil de grenouille.
    E(22, 62, 16, 11, fonce);
    E(78, 62, 16, 11, fonce);
    E(28, 24, 14, 14, clair);
    E(72, 24, 14, 14, clair);
    E(50, 52, 34, 26, clair);
    doc.setFillColor(26, 32, 44);
    doc.circle(cx + (28 - 50) * u, cy + (24 - 45) * u, 5.5 * u, 'F');
    doc.circle(cx + (72 - 50) * u, cy + (24 - 45) * u, 5.5 * u, 'F');
}

function geoGrenouilles(item, slot) {
    const m = item.meta;
    const b = boiteDe(slot);
    const cases = m.n * 2 + 1;
    // LE NÉNUPHAR DONNE SA TAILLE À LA GRENOUILLE, ET C'ÉTAIT LE DÉFAUT.
    //
    // Rémy : « le plateau de jeu ne permet pas de poser ses pions ». Les deux
    // tailles étaient calculées séparément : la case du plateau tombait à
    // 20 mm (la largeur divisée par neuf), la bête à découper à 44 mm (la
    // hauteur restante divisée par deux). On découpait donc un pion DEUX FOIS
    // plus large que la case où il devait se poser. Un jeu à découper dont les
    // pièces ne rentrent pas sur le plateau n'est pas un jeu.
    //
    // Le plafond de 24 mm tombe au passage : il n'a plus de raison d'être
    // maintenant que la pièce suit la case, et le plateau prend la largeur.
    const pad = Math.min((b.w - 4) / cases, b.h * 0.3);
    const rubanW = pad * cases;
    const hRuban = pad * 1.5;
    const hVignettes = Math.min(b.h * 0.22, 34);
    const yCoupe = b.y + hRuban + hVignettes + 8;
    return {
        m, b, n: m.n, cases, pad,
        ruban: { x: b.x + (b.w - rubanW) / 2, y: b.y + 4, w: rubanW, h: pad },
        yVignettes: b.y + hRuban + 4,
        hVignettes,
        // Le trait de découpe, puis les bêtes à découper sous lui.
        yCoupe,
        // LA ZONE BASSE VA JUSQU'AU BORD DE LA PAGE. Elle était calculée à
        // partir de la hauteur totale moins les bandeaux, sans tenir compte de
        // son propre point de départ : elle s'arrêtait douze millimètres trop
        // haut, et les rubans de coups n'avaient la place que d'une ligne.
        pieces: { x: b.x, y: yCoupe + 4, w: b.w, h: b.y + b.h - (yCoupe + 4) },
        taille: Math.max(2.2, Math.min(pad * 0.22, 3.4))
    };
}

/** Les deux vignettes : la position de départ et celle d'arrivée. */
/**
 * OÙ SE POSENT LES PIÈCES, ET CE QU'ON MET SOUS ELLES.
 *
 * Les jetons font la taille d'une case — ils se posent dessus, c'est la seule
 * dimension qui ait un sens —, espacés d'un millimètre et demi pour les
 * ciseaux. Ce qui reste de la page devient des rubans vides numérotés : un par
 * coup, parce que COMPTER SES COUPS est le vrai exercice, et que sans ces
 * lignes il ne restait que du blanc.
 */
function piecesGrenouilles(g) {
    const ECART = 1.5;
    const pas = g.pad + ECART;
    const parRangee = Math.max(1, Math.min(g.n * 2, Math.floor(g.pieces.w / pas)));
    const rangees = Math.ceil(g.n * 2 / parRangee);
    const x0 = g.pieces.x + Math.max(0, (g.pieces.w - pas * parRangee) / 2);
    const jetons = [];
    for (let i = 0; i < g.n * 2; i++) {
        jetons.push({
            vert: i < g.n,
            x: x0 + (i % parRangee) * pas,
            y: g.pieces.y + Math.floor(i / parRangee) * pas
        });
    }
    // Les rubans à remplir commencent sous la dernière rangée de pièces.
    const yDebut = g.pieces.y + rangees * pas + 6;
    const restant = g.pieces.y + g.pieces.h - yDebut;
    const margeNum = Math.max(6, g.pad * 0.5);
    // ON VISE LE NOMBRE DE COUPS DU DÉFI, et l'on adapte la hauteur des rangées
    // pour qu'il tienne. L'inverse — une hauteur fixe, autant de rangées que le
    // reste en accepte — n'en donnait qu'UNE SEULE : c'est le reste qui décidait,
    // et il était petit. Ici c'est l'exercice qui décide, et la page suit.
    // UNE CASE OÙ L'ON PEUT ÉCRIRE, ou pas de case du tout. Viser les
    // vingt-quatre coups du défi donnait des rangées de trois millimètres et
    // demi : personne n'y dessine une grenouille. On fixe donc un plancher de
    // SIX millimètres — la plus petite case qu'un élève de sixième remplisse au
    // crayon — et l'on en met autant que la page en accepte, quitte à n'en
    // mettre que cinq. Cinq rangées lisibles valent mieux que vingt illisibles.
    // LA LARGEUR D'ABORD, LE NOMBRE ENSUITE. Faire tenir les vingt-quatre coups
    // du défi donnait des rangées de trois millimètres, illisibles ; les caler
    // sur la hauteur restante les rendait étroites, un quart de page pendant que
    // les pièces en occupaient la totalité. Une rangée de coups est un plateau
    // en réduction : elle a la LARGEUR d'un plateau, un peu plus de la moitié de
    // sa hauteur, et l'on en met autant que la page en accepte.
    const cible = g.n * g.n + 2 * g.n;
    const padCoup = Math.max(6, Math.min((g.b.w - margeNum) / g.cases, g.pad * 0.62));
    const pasCoup = padCoup + 1.2;
    const combien = Math.max(0, Math.min(cible, Math.floor(restant / pasCoup)));
    const coups = [];
    for (let i = 0; i < combien; i++) {
        coups.push({ x: g.b.x + margeNum, y: yDebut + i * pasCoup });
    }
    g.padCoup = padCoup;
    return { jetons, coups, margeNum, yDebut };
}

const vignettesGrenouilles = (n) => [
    { titre: 'Départ', ruban: [...new Array(n).fill('V'), null, ...new Array(n).fill('R')] },
    { titre: 'Arrivée', ruban: [...new Array(n).fill('R'), null, ...new Array(n).fill('V')] }
];

function grenouillesPreviewHtml(item, slot, k, solution) {
    if (solution) return grenouillesSolutionHtml(item, slot, k);
    const g = geoGrenouilles(item, slot);
    const T = (v) => (v * k).toFixed(2);
    let html = '';
    for (let i = 0; i < g.cases; i++) {
        html += `<div class="fx-gr-pad" style="left:${T(g.ruban.x + i * g.pad)}px;
            top:${T(g.ruban.y)}px; width:${T(g.pad)}px; height:${T(g.pad)}px"></div>`;
    }
    const largeV = g.b.w / 2;
    vignettesGrenouilles(g.n).forEach((v, j) => {
        const petit = Math.min((largeV - 10) / g.cases, g.hVignettes - g.taille * 1.7);
        const x0 = g.b.x + j * largeV + (largeV - petit * g.cases) / 2;
        html += `<div class="fx-gr-titre" style="left:${T(g.b.x + j * largeV)}px;
            top:${T(g.yVignettes)}px; width:${T(largeV)}px;
            font-size:${T(g.taille)}px">${v.titre}</div>`;
        v.ruban.forEach((c, i) => {
            html += `<div class="fx-gr-mini${c ? ` fx-gr-mini--${c}` : ''}"
                style="left:${T(x0 + i * petit)}px; top:${T(g.yVignettes + g.taille * 1.7)}px;
                width:${T(petit)}px; height:${T(petit)}px"></div>`;
        });
    });
    html += `<div class="fx-gr-coupe" style="left:${T(g.b.x)}px; top:${T(g.yCoupe)}px;
        width:${T(g.b.w)}px"></div>`;
    // LES BÊTES À DÉCOUPER FONT LA TAILLE D'UN NÉNUPHAR. Elles se posent
    // dessus : c'est la seule dimension qui ait un sens. On les espace en
    // revanche d'un bon millimètre — il faut passer des ciseaux entre deux.
    const pieces = piecesGrenouilles(g);
    pieces.jetons.forEach(j => {
        html += `<div class="fx-gr-decoupe fx-gr-mini--${j.vert ? 'V' : 'R'}"
            style="left:${T(j.x)}px; top:${T(j.y)}px;
            width:${T(g.pad)}px; height:${T(g.pad)}px">${
            grenouilleSvgFiche(j.vert)}</div>`;
    });
    // ET LA PAGE SERT À QUELQUE CHOSE. Rémy : « n'occupe pas le maximum de
    // l'espace ». Sous les pièces, autant de rubans vides que la feuille en
    // porte, numérotés : c'est là qu'on NOTE ses coups. Vingt-quatre coups
    // pour quatre contre quatre — les compter est le vrai exercice, et sans
    // ces lignes il ne reste que du blanc.
    pieces.coups.forEach((c, i) => {
        html += `<div class="fx-gr-num" style="left:${T(g.b.x)}px; top:${T(c.y + g.padCoup * 0.15)}px;
            width:${T(pieces.margeNum - 2)}px; font-size:${T(g.taille * 1.1)}px">${i + 1}</div>`;
        for (let j = 0; j < g.cases; j++) {
            html += `<div class="fx-gr-pad fx-gr-pad--coup" style="left:${T(c.x + j * g.padCoup)}px;
                top:${T(c.y)}px; width:${T(g.padCoup)}px; height:${T(g.padCoup)}px"></div>`;
        }
    });
    return html;
}

/** La même bête qu'à l'écran, en SVG, pour l'aperçu de la fiche. */
function grenouilleSvgFiche(vert) {
    const fonce = vert ? '#2f6b23' : '#8f1f14';
    const clair = vert ? '#6cbf4a' : '#e6503c';
    return `<svg viewBox="0 0 100 84" preserveAspectRatio="xMidYMid meet">
        <ellipse cx="22" cy="62" rx="16" ry="11" fill="${fonce}"/>
        <ellipse cx="78" cy="62" rx="16" ry="11" fill="${fonce}"/>
        <circle cx="28" cy="24" r="14" fill="${clair}"/>
        <circle cx="72" cy="24" r="14" fill="${clair}"/>
        <ellipse cx="50" cy="52" rx="34" ry="26" fill="${clair}"/>
        <circle cx="28" cy="24" r="5.5" fill="#1a202c"/>
        <circle cx="72" cy="24" r="5.5" fill="#1a202c"/></svg>`;
}

function dessinerGrenouillesPdf(doc, item, slot, solution) {
    if (solution) return dessinerGrenouillesSolutionPdf(doc, item, slot);
    const g = geoGrenouilles(item, slot);
    const aplat = polycopieEnCouleur();
    const VERT = [[47, 107, 35], [108, 191, 74]];
    const ROUGE = [[143, 31, 20], [230, 80, 60]];

    doc.setLineWidth(0.4);
    doc.setDrawColor(...ENCRE.trait);
    for (let i = 0; i < g.cases; i++) {
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(g.ruban.x + i * g.pad, g.ruban.y, g.pad, g.pad, 1.6, 1.6, 'FD');
    }

    const largeV = g.b.w / 2;
    vignettesGrenouilles(g.n).forEach((v, j) => {
        const petit = Math.min((largeV - 10) / g.cases, g.hVignettes - g.taille * 1.7);
        const x0 = g.b.x + j * largeV + (largeV - petit * g.cases) / 2;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(g.taille / 0.3528);
        doc.setTextColor(...ENCRE.texte);
        doc.text(pourPdf(v.titre), g.b.x + j * largeV + largeV / 2, g.yVignettes + g.taille,
            { align: 'center' });
        doc.setLineWidth(0.25);
        v.ruban.forEach((c, i) => {
            doc.setDrawColor(...ENCRE.grille);
            doc.setFillColor(...(aplat && c
                ? (c === 'V' ? [220, 240, 214] : [251, 220, 220]) : [255, 255, 255]));
            doc.roundedRect(x0 + i * petit, g.yVignettes + g.taille * 1.7, petit, petit,
                0.7, 0.7, 'FD');
            if (!c) return;
            // Sur une vignette, la bête est trop petite pour être dessinée :
            // son INITIALE dit la couleur, et survit au noir et blanc.
            doc.setFontSize(Math.max(4, petit * 1.5));
            doc.setTextColor(...(c === 'V' ? VERT[0] : ROUGE[0]));
            doc.text(c, x0 + (i + 0.5) * petit, g.yVignettes + g.taille * 1.7 + petit * 0.72,
                { align: 'center' });
        });
    });

    doc.setDrawColor(...ENCRE.gris);
    doc.setLineWidth(0.3);
    if (doc.setLineDashPattern) doc.setLineDashPattern([1.4, 1.2], 0);
    doc.line(g.b.x, g.yCoupe, g.b.x + g.b.w, g.yCoupe);
    if (doc.setLineDashPattern) doc.setLineDashPattern([], 0);

    const parRangee = Math.ceil(g.n * 2 / 2);
    const dispo = Math.min(g.pieces.w / parRangee, g.pieces.h / 2) * 0.92;
    for (let i = 0; i < g.n * 2; i++) {
        const vert = i < g.n;
        const col = i % parRangee, rang = Math.floor(i / parRangee);
        const x = g.pieces.x + (g.pieces.w - dispo * parRangee) / 2 + col * dispo;
        const y = g.pieces.y + rang * dispo;
        doc.setDrawColor(...ENCRE.grille);
        doc.setLineWidth(0.25);
        doc.setFillColor(...(aplat ? (vert ? [220, 240, 214] : [251, 220, 220]) : [255, 255, 255]));
        doc.roundedRect(x + dispo * 0.05, y + dispo * 0.05, dispo * 0.9, dispo * 0.9,
            1.4, 1.4, 'FD');
        dessinerGrenouillePdf(doc, x + dispo / 2, y + dispo / 2, dispo * 0.72,
            ...(vert ? VERT : ROUGE), aplat);
        // La flèche du sens autorisé : la règle, écrite sur la bête.
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(Math.max(5, dispo * 0.9));
        doc.setTextColor(...(vert ? VERT[0] : ROUGE[0]));
        doc.text(vert ? '>' : '<', x + dispo * (vert ? 0.82 : 0.18), y + dispo * 0.92,
            { align: 'center' });
    }
}

// --- LE PARKING À DÉCOUPER ------------------------------------------------------
//
// Rémy : « Le jeu de fin de semaine ». Le plateau d'un côté, les huit voitures
// de l'autre, un pointillé entre les deux — et les vignettes « Au Départ » et
// « Arrivée » qui disent le but sans une phrase.
//
// LE BITUME EST DESSINÉ, PAS SEULEMENT LES PLACES. C'est ce qui fait qu'on
// comprend le plateau d'un coup d'œil : on roule sur le gris, on se gare sur le
// blanc. Et la case en pointillés — la place de dégagement — se distingue des
// autres, parce que c'est elle, le sujet du jeu.

/**
 * LA GÉOMÉTRIE DU BLOC, EN MILLIMÈTRES : trois colonnes.
 *
 * Le plateau à gauche, les deux vignettes au milieu, les voitures à découper à
 * droite du pointillé. Le plateau est TOUJOURS limité par la hauteur — cinq
 * cases de large contre quatre de haut dans un bloc plus large que haut —,
 * alors la place gagnée en largeur est rendue aux vignettes plutôt que laissée
 * blanche. Et les mettre l'une SOUS l'autre, au milieu, dit ce qu'aucune
 * légende ne dirait aussi bien : on part de celle du haut, on arrive à celle du
 * bas.
 */
function geoParking(item, slot) {
    const m = item.meta;
    const b = boiteDe(slot);
    // LE PARTAGE DE LA LARGEUR, ET IL DÉCIDE DE TOUT. Le plateau tenait 42 % de
    // la boîte, les vignettes 22 %, et le reste — un bon tiers — allait aux
    // voitures à découper, qui n'en avaient pas besoin : leur taille est de
    // toute façon bornée par la case du plateau, sans quoi la voiture découpée
    // n'y entrerait pas. On rendait donc de la place à celui qui ne pouvait pas
    // s'en servir, et l'on bridait celui qui en manquait. La moitié au plateau,
    // et tout grandit d'un cinquième — Rémy : « occuper le maximum d'espace
    // pour être plus facile à découper ».
    const largePlateau = b.w * 0.55;
    const largeVign = b.w * 0.20;
    const cote = Math.min((largePlateau - 6) / 5, (b.h - 6) / m.hauteur, 34);
    const w = cote * 5, h = cote * m.hauteur;
    const taille = Math.max(2.2, Math.min(b.h * 0.05, 3.4));
    const xVign = b.x + largePlateau;
    // Chaque vignette occupe la moitié de la hauteur : titre, puis mini-plateau.
    const hVign = b.h / 2;
    const petit = Math.min((largeVign - 4) / 5, (hVign - taille * 2.4) / m.hauteur);
    const pieces = { x: xVign + largeVign + 6, w: b.w - largePlateau - largeVign - 6,
        y: b.y, h: b.h };
    // LA VOITURE DÉCOUPÉE DOIT ENTRER DANS SA PLACE. C'est une évidence sur la
    // table et un oubli facile sur la feuille : sans ce plafond, un bloc large
    // dessinait des voitures plus grandes que les cases du plateau, et le jeu
    // découpé était injouable.
    const d = Math.min(pieces.w / 2, (pieces.h - taille * 1.8) / Math.ceil(m.n), cote) * 0.94;
    return {
        m, b, cote, taille, petit, hVign, d,
        plateau: { x: b.x + (largePlateau - w) / 2, y: b.y + (b.h - h) / 2, w, h },
        vign: { x: xVign, w: largeVign, x0: xVign + (largeVign - petit * 5) / 2 },
        xCoupe: xVign + largeVign + 2,
        pieces
    };
}

/** Les deux vignettes : la position de départ et celle d'arrivée. */
const vignettesParking = (m) => [
    { titre: 'Au Départ', couleurs: m.cases.map(c => (c.zone === 'gauche' ? 'B' : c.zone === 'droite' ? 'R' : null)) },
    { titre: 'Arrivée', couleurs: m.cases.map(c => (c.zone === 'gauche' ? 'R' : c.zone === 'droite' ? 'B' : null)) }
];

/** La voiture de la fiche : la même qu'à l'écran. */
function voitureSvgFiche(bleue) {
    const fonce = bleue ? '#1c3a8a' : '#8f1f14';
    const clair = bleue ? '#2f5fd0' : '#e04a3a';
    return `<svg viewBox="0 0 60 100" preserveAspectRatio="xMidYMid meet">
        <rect x="2" y="12" width="8" height="18" rx="3" fill="#2d3748"/>
        <rect x="50" y="12" width="8" height="18" rx="3" fill="#2d3748"/>
        <rect x="2" y="66" width="8" height="18" rx="3" fill="#2d3748"/>
        <rect x="50" y="66" width="8" height="18" rx="3" fill="#2d3748"/>
        <rect x="6" y="4" width="48" height="92" rx="16" fill="${clair}"
            stroke="${fonce}" stroke-width="3"/>
        <rect x="14" y="30" width="32" height="30" rx="7" fill="#4a5568"/></svg>`;
}

function parkingPreviewHtml(item, slot, k, solution) {
    if (solution) return parkingSolutionHtml(item, slot, k);
    const g = geoParking(item, slot);
    const T = (v) => (v * k).toFixed(2);
    const P = g.plateau;
    // LE BITUME SUIT LA FORME DU PLATEAU, case par case — un rectangle plein
    // laisserait croire qu'on peut rouler dans les coins vides, et c'est
    // justement parce que le plateau N'EST PAS un rectangle que le jeu est
    // difficile. Même dessin qu'à l'écran (voir games/parking.js).
    const bord = g.cote * 0.14;
    let html = '';
    g.m.cases.forEach(c => {
        html += `<div class="fx-pk-bitume" style="left:${T(P.x + c.x * g.cote - bord)}px;
            top:${T(P.y + c.y * g.cote - bord)}px; width:${T(g.cote + bord * 2)}px;
            height:${T(g.cote + bord * 2)}px"></div>`;
    });
    g.m.cases.forEach(c => {
        html += `<div class="fx-pk-case${c.zone === 'place' ? ' fx-pk-case--place' : ''}"
            style="left:${T(P.x + c.x * g.cote)}px; top:${T(P.y + c.y * g.cote)}px;
            width:${T(g.cote)}px; height:${T(g.cote)}px"></div>`;
    });
    html += `<div class="fx-pk-coupe" style="left:${T(g.xCoupe)}px; top:${T(g.b.y)}px;
        height:${T(g.b.h)}px"></div>`;
    html += `<div class="fx-pk-titre" style="left:${T(g.pieces.x)}px; top:${T(g.b.y)}px;
        width:${T(g.pieces.w)}px; font-size:${T(g.taille)}px">Voitures à découper</div>`;

    // Les voitures à découper : deux colonnes, les bleues puis les rouges.
    const nb = g.m.n * 2;
    const d = g.d;
    for (let i = 0; i < nb; i++) {
        const bleue = i < g.m.n;
        const x = g.pieces.x + (g.pieces.w - d * 2) / 2 + (i % 2) * d;
        const y = g.b.y + g.taille * 1.8 + Math.floor(i / 2) * d;
        html += `<div class="fx-pk-piece" style="left:${T(x + d * 0.04)}px; top:${T(y + d * 0.04)}px;
            width:${T(d * 0.92)}px; height:${T(d * 0.92)}px">${voitureSvgFiche(bleue)}</div>`;
    }

    // Les deux vignettes, l'une sous l'autre : d'où l'on part, où l'on arrive.
    vignettesParking(g.m).forEach((v, j) => {
        const yTitre = g.b.y + j * g.hVign;
        html += `<div class="fx-pk-titre" style="left:${T(g.vign.x)}px; top:${T(yTitre)}px;
            width:${T(g.vign.w)}px; font-size:${T(g.taille)}px">${v.titre}</div>`;
        g.m.cases.forEach((c, i) => {
            const col = v.couleurs[i];
            html += `<div class="fx-pk-mini${col ? ` fx-pk-mini--${col}` : ''}"
                style="left:${T(g.vign.x0 + c.x * g.petit)}px;
                top:${T(yTitre + g.taille * 1.7 + c.y * g.petit)}px;
                width:${T(g.petit)}px; height:${T(g.petit)}px"></div>`;
        });
    });
    return html;
}

/** La voiture en formes simples, pour le PDF. */
function dessinerVoiturePdf(doc, x, y, w, h, fonce, clair, aplat) {
    doc.setFillColor(...(aplat ? clair : [255, 255, 255]));
    doc.setDrawColor(...fonce);
    doc.setLineWidth(0.4);
    doc.roundedRect(x + w * 0.1, y + h * 0.04, w * 0.8, h * 0.92, w * 0.2, w * 0.2, 'FD');
    // Les roues, puis le toit : quatre traits épais et un rectangle sombre
    // suffisent à faire une voiture vue de dessus.
    doc.setFillColor(45, 55, 72);
    [[0.03, 0.12], [0.83, 0.12], [0.03, 0.66], [0.83, 0.66]].forEach(([dx, dy]) => {
        doc.roundedRect(x + w * dx, y + h * dy, w * 0.14, h * 0.18, w * 0.05, w * 0.05, 'F');
    });
    doc.setFillColor(...(aplat ? [74, 85, 104] : [220, 224, 232]));
    doc.setDrawColor(...fonce);
    doc.setLineWidth(0.25);
    doc.roundedRect(x + w * 0.24, y + h * 0.3, w * 0.52, h * 0.3, w * 0.1, w * 0.1, 'FD');
}

function dessinerParkingPdf(doc, item, slot, solution) {
    if (solution) return dessinerParkingSolutionPdf(doc, item, slot);
    const g = geoParking(item, slot);
    const aplat = polycopieEnCouleur();
    const BLEU = [[28, 58, 138], [47, 95, 208]];
    const ROUGE = [[143, 31, 20], [224, 74, 58]];
    const P = g.plateau;

    // LE BITUME SUIT LA FORME DU PLATEAU, case par case. Un rectangle plein
    // laisserait croire qu'on peut rouler dans les coins vides ; or le plateau
    // n'est pas un rectangle, et c'est ce qui fait tout le jeu. En noir et
    // blanc il disparaît, et c'est très bien — le cadre des places suffit
    // alors à lire le plateau.
    const bord = g.cote * 0.14;
    if (aplat) {
        doc.setFillColor(154, 163, 173);
        g.m.cases.forEach(c => {
            doc.roundedRect(P.x + c.x * g.cote - bord, P.y + c.y * g.cote - bord,
                g.cote + bord * 2, g.cote + bord * 2, g.cote * 0.18, g.cote * 0.18, 'F');
        });
    }
    g.m.cases.forEach(c => {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...ENCRE.trait);
        doc.setLineWidth(0.4);
        if (c.zone === 'place' && doc.setLineDashPattern) doc.setLineDashPattern([1.2, 1], 0);
        doc.roundedRect(P.x + c.x * g.cote, P.y + c.y * g.cote, g.cote, g.cote, 1.2, 1.2, 'FD');
        if (doc.setLineDashPattern) doc.setLineDashPattern([], 0);
    });

    doc.setDrawColor(...ENCRE.gris);
    doc.setLineWidth(0.3);
    if (doc.setLineDashPattern) doc.setLineDashPattern([1.4, 1.2], 0);
    doc.line(g.xCoupe, g.b.y, g.xCoupe, g.b.y + g.b.h);
    if (doc.setLineDashPattern) doc.setLineDashPattern([], 0);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(g.taille / 0.3528);
    doc.setTextColor(...ENCRE.gris);
    doc.text(pourPdf('Voitures à découper'), g.pieces.x + g.pieces.w / 2, g.b.y + g.taille,
        { align: 'center' });

    const nb = g.m.n * 2;
    const d = g.d;
    for (let i = 0; i < nb; i++) {
        const bleue = i < g.m.n;
        const x = g.pieces.x + (g.pieces.w - d * 2) / 2 + (i % 2) * d;
        const y = g.b.y + g.taille * 1.8 + Math.floor(i / 2) * d;
        // Le cadre de découpe, puis la voiture dedans : c'est le cadre qu'on
        // suit aux ciseaux, et il doit faire la taille d'une case du plateau.
        doc.setDrawColor(...ENCRE.grille);
        doc.setLineWidth(0.25);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(x + d * 0.04, y + d * 0.04, d * 0.92, d * 0.92, 1.2, 1.2, 'FD');
        const wv = d * 0.5;
        dessinerVoiturePdf(doc, x + (d - wv) / 2, y + d * 0.13, wv, d * 0.74,
            ...(bleue ? BLEU : ROUGE), aplat);
    }

    vignettesParking(g.m).forEach((v, j) => {
        const yTitre = g.b.y + j * g.hVign;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(g.taille / 0.3528);
        doc.setTextColor(...ENCRE.texte);
        doc.text(pourPdf(v.titre), g.vign.x + g.vign.w / 2, yTitre + g.taille, { align: 'center' });
        g.m.cases.forEach((c, i) => {
            const col = v.couleurs[i];
            const x = g.vign.x0 + c.x * g.petit, y = yTitre + g.taille * 1.7 + c.y * g.petit;
            doc.setDrawColor(...ENCRE.grille);
            doc.setLineWidth(0.25);
            doc.setFillColor(...(aplat && col
                ? (col === 'B' ? [214, 226, 250] : [251, 220, 220]) : [255, 255, 255]));
            doc.roundedRect(x, y, g.petit, g.petit, 0.6, 0.6, 'FD');
            if (!col) return;
            // Trop petite pour être dessinée : son INITIALE dit la couleur, et
            // elle survit au noir et blanc.
            doc.setFontSize(Math.max(4, g.petit * 1.5));
            doc.setTextColor(...(col === 'B' ? BLEU[0] : ROUGE[0]));
            doc.text(col, x + g.petit / 2, y + g.petit * 0.72, { align: 'center' });
        });
    });
}

// --- LE TASUKO SUR PAPIER ------------------------------------------------------
//
// Rémy : « Fais un tasuko. » Une grille de chiffres, un crayon pour relier les
// paires de voisines, et la bande des sommes à barrer au fur et à mesure.
// C'est la forme d'origine du jeu : l'écran n'y ajoute que la vérification.
//
// LA BANDE DES SOMMES N'EST PAS UNE DÉCORATION. À l'écran, la liste s'éteint
// toute seule ; sur le papier, c'est l'élève qui barre, et il lui faut donc de
// quoi barrer. Sans elle, il perd le fil au bout de six paires.
//
// LE CORRIGÉ DESSINE LES CAPSULES, il ne liste pas les additions : ce qu'on
// veut voir en corrigeant, c'est OÙ elles étaient — une liste ne se compare à
// rien. La capsule se calcule en unités de case, exactement comme à l'écran
// (voir games/tasuko.js), donc les deux dessins ne peuvent pas diverger.

function geoTasuko(item, slot) {
    const m = item.meta;
    const b = boiteDe(slot);
    // La bande des sommes mange le bas du bloc : on la réserve d'abord, et la
    // grille se dimensionne dans ce qui reste.
    const hBande = Math.min(b.h * 0.16, 9);
    const hGrille = b.h - hBande;
    // LA CASE SE DIMENSIONNE POUR UN CRAYON QUI ENTOURE, et c'est ce qui la
    // distingue d'une case où l'on écrit : le trait fait le tour de deux cases,
    // il lui faut de la place au bord.
    const cote = Math.min(b.w / m.l, hGrille / m.h, 12);
    const w = cote * m.l, h = cote * m.h;
    const n = m.n || Math.round((m.l * m.h) / 2);
    // Les pastilles de la bande : assez larges pour un nombre à deux chiffres,
    // et jamais plus hautes que la bande qui les porte.
    const pas = Math.min((b.w - 2) / n, hBande * 0.9, 7);
    return {
        m, b, cote, n, hBande, pas,
        x0: b.x + (b.w - w) / 2,
        y0: b.y + (hGrille - h) / 2,
        xBande: b.x + (b.w - pas * n) / 2,
        yBande: b.y + hGrille + (hBande - pas * 0.8) / 2,
        taille: Math.max(2, cote * 0.5),
        tailleBande: Math.max(1.7, pas * 0.5)
    };
}

/** Le rectangle arrondi qui entoure une addition, en millimètres. */
function capsuleTasuko(g, cases) {
    const xs = cases.map(([x]) => x), ys = cases.map(([, y]) => y);
    const marge = g.cote * 0.11;
    const x = g.x0 + Math.min(...xs) * g.cote + marge;
    const y = g.y0 + Math.min(...ys) * g.cote + marge;
    return {
        x, y,
        w: (Math.max(...xs) - Math.min(...xs) + 1) * g.cote - marge * 2,
        h: (Math.max(...ys) - Math.min(...ys) + 1) * g.cote - marge * 2,
        r: g.cote * 0.39
    };
}

function tasukoPreviewHtml(item, slot, k, solution) {
    const g = geoTasuko(item, slot);
    const T = (v) => (v * k).toFixed(2);
    let html = g.m.grille.map((ligne, y) => ligne.map((v, x) =>
        `<div class="fx-tk-case" style="left:${T(g.x0 + x * g.cote)}px;
            top:${T(g.y0 + y * g.cote)}px; width:${T(g.cote)}px; height:${T(g.cote)}px;
            font-size:${T(g.taille)}px">${v}</div>`).join('')).join('');
    // La bande des sommes à barrer.
    html += Array.from({ length: g.n }, (_, i) => i + 1).map(nb =>
        `<div class="fx-tk-somme" style="left:${T(g.xBande + (nb - 1) * g.pas)}px;
            top:${T(g.yBande)}px; width:${T(g.pas * 0.86)}px; height:${T(g.pas * 0.8)}px;
            font-size:${T(g.tailleBande)}px">${nb}</div>`).join('');
    if (solution) {
        html += g.m.solution.map(a => {
            const c = capsuleTasuko(g, a.cases);
            return `<div class="fx-tk-capsule" style="left:${T(c.x)}px; top:${T(c.y)}px;
                width:${T(c.w)}px; height:${T(c.h)}px; border-radius:${T(c.r)}px"></div>`;
        }).join('');
    }
    return html;
}

function dessinerTasukoPdf(doc, item, slot, solution) {
    const g = geoTasuko(item, slot);
    doc.setLineWidth(0.25);
    doc.setDrawColor(...ENCRE.grille);
    g.m.grille.forEach((ligne, y) => ligne.forEach((v, x) => {
        doc.rect(g.x0 + x * g.cote, g.y0 + y * g.cote, g.cote, g.cote);
    }));
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(Math.max(6, g.cote * 1.45));
    doc.setTextColor(...ENCRE.trait);
    g.m.grille.forEach((ligne, y) => ligne.forEach((v, x) => {
        doc.text(String(v), g.x0 + (x + 0.5) * g.cote, g.y0 + (y + 0.7) * g.cote,
            { align: 'center' });
    }));
    // LA BANDE DES SOMMES : les cases à barrer au fur et à mesure.
    doc.setLineWidth(0.2);
    doc.setDrawColor(...ENCRE.grille);
    doc.setFontSize(Math.max(5, g.pas * 1.35));
    for (let nb = 1; nb <= g.n; nb++) {
        const x = g.xBande + (nb - 1) * g.pas;
        doc.setFillColor(...ENCRE.donnee);
        doc.roundedRect(x, g.yBande, g.pas * 0.86, g.pas * 0.8, g.pas * 0.2, g.pas * 0.2, 'FD');
        doc.setTextColor(...ENCRE.texte);
        doc.text(String(nb), x + g.pas * 0.43, g.yBande + g.pas * 0.58, { align: 'center' });
    }

    if (!solution) return;
    doc.setDrawColor(47, 133, 90);
    doc.setLineWidth(0.5);
    g.m.solution.forEach(a => {
        const c = capsuleTasuko(g, a.cases);
        doc.roundedRect(c.x, c.y, c.w, c.h, c.r, c.r);
    });
    // Sur le corrigé, les sommes sont toutes faites : on les barre.
    doc.setDrawColor(47, 133, 90);
    doc.setLineWidth(0.4);
    for (let nb = 1; nb <= g.n; nb++) {
        const x = g.xBande + (nb - 1) * g.pas;
        doc.line(x + g.pas * 0.08, g.yBande + g.pas * 0.72,
            x + g.pas * 0.78, g.yBande + g.pas * 0.08);
    }
}

// --- LA PYRAMIDE DE NOMBRES ----------------------------------------------------
//
// La jumelle arithmétique de la pyramide de mots, et sa forme naturelle : un
// triangle de cases, des trous, un crayon.
//
// LA BASE EST EN BAS, ET C'EST LOIN D'ÊTRE ÉVIDENT À CODER. Les données sont
// rangées du sol vers le sommet — `lignes[0]` est la base — alors que le papier
// se dessine du haut vers le bas. On retourne donc l'indice une fois pour
// toutes ici, plutôt qu'à chaque endroit qui dessine.
//
// LES CASES SONT LARGES, PAS CARRÉES : un sommet à trois chiffres doit y tenir
// sans que le nombre se serre, et c'est justement le sommet qu'on regarde.

function geoPyramideN(item, slot) {
    const m = item.meta;
    const b = boiteDe(slot);
    const n = m.n;
    const gap = 0.6;
    // La rangée la plus large compte `n` cases ; il y a `n` rangées.
    const cote = Math.min((b.w - gap * (n - 1)) / (n * 1.55), (b.h - gap * (n - 1)) / n, 9);
    const largeur = cote * 1.55;
    const w = largeur * n + gap * (n - 1);
    const h = cote * n + gap * (n - 1);
    const x0 = b.x + (b.w - w) / 2;
    const y0 = b.y + (b.h - h) / 2;
    return {
        m, b, n, cote, largeur, gap,
        // (k, i) : k = l'étage en partant du SOL, i = la case dans l'étage.
        // Le sol se dessine tout en bas, donc au rang n - 1 de la page.
        //
        // LE DÉCALAGE HORIZONTAL SUIT L'ÉTAGE, PAS SA HAUTEUR SUR LA PAGE. La
        // base est la rangée la plus LARGE : c'est elle qui ne se décale pas,
        // et chaque étage au-dessus rentre d'une demi-case. On avait pris
        // `n - 1 - k`, c'est-à-dire l'inverse : la pyramide penchait, et les
        // plus larges débordaient du bloc par la droite.
        x: (k, i) => x0 + k * (largeur + gap) / 2 + i * (largeur + gap),
        y: (k) => y0 + (n - 1 - k) * (cote + gap),
        taille: Math.max(2, cote * 0.52)
    };
}

function pyramideNPreviewHtml(item, slot, k, solution) {
    const g = geoPyramideN(item, slot);
    const T = (v) => (v * k).toFixed(2);
    return g.m.lignes.map((l, r) => l.map((v, i) => {
        const donne = g.m.donnes[r][i];
        const texte = donne ? v : (solution ? v : '');
        return `<div class="fx-pn-case${donne ? ' fx-pn-case--donne' : ''}${
            !donne && texte !== '' ? ' fx-pn-case--sol' : ''}"
            style="left:${T(g.x(r, i))}px; top:${T(g.y(r))}px;
            width:${T(g.largeur)}px; height:${T(g.cote)}px;
            font-size:${T(g.taille)}px">${texte}</div>`;
    }).join('')).join('');
}

function dessinerPyramideNPdf(doc, item, slot, solution) {
    const g = geoPyramideN(item, slot);
    doc.setLineWidth(0.35);
    g.m.lignes.forEach((l, r) => l.forEach((v, i) => {
        const x = g.x(r, i), y = g.y(r);
        const donne = g.m.donnes[r][i];
        // Une case DONNÉE est de l'énoncé : fond teinté, on n'écrit pas dedans.
        // Les autres restent blanches, prêtes pour le crayon.
        if (donne) {
            doc.setFillColor(...ENCRE.donnee);
            doc.rect(x, y, g.largeur, g.cote, 'F');
        }
        doc.setDrawColor(...ENCRE.trait);
        doc.rect(x, y, g.largeur, g.cote);
        if (!donne && !solution) return;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(Math.max(5, g.cote * 1.55));
        doc.setTextColor(...(donne ? ENCRE.trait : [47, 133, 90]));
        doc.text(String(v), x + g.largeur / 2, y + g.cote * 0.7, { align: 'center' });
    }));
}

// --- LE MASTERMIND SUR PAPIER --------------------------------------------------
//
// Rémy : « Et un master mind ».
//
// UNE FEUILLE NE RÉPOND PAS, donc on n'y joue pas : on y imprime LA PARTIE
// DÉJÀ JOUÉE — des essais, et pour chacun le nombre de jetons bien placés et
// mal placés — et l'on demande le code. Le jeu devient un exercice de logique
// pure, et il y gagne : à l'écran on s'en tire en tâtonnant, ici il faut
// raisonner, parce qu'il n'y a plus d'essai à dépenser.
//
// LA PALETTE EST IMPRIMÉE EN TÊTE, et ce n'est pas un ornement : sans elle
// l'exercice est insoluble, puisqu'on ignore parmi quelles couleurs chercher.
//
// CHAQUE JETON PORTE SON INITIALE. La couleur ajoute du confort, jamais
// l'information : photocopiée, la fiche reste jouable, et c'est cette lettre
// que l'élève écrit dans les cases de la réponse.

const rvbDe = (hex) => [
    parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)
];

function geoMastermind(item, slot) {
    const m = item.meta;
    const b = boiteDe(slot);
    const n = m.longueur;
    // LES RANGÉES SE COMPTENT SUR CE QU'ON DESSINE VRAIMENT : la légende des
    // couleurs, l'en-tête des deux colonnes, les essais, un blanc, le libellé
    // « Le code : » et les cases de la réponse. Sous-évaluées, elles donnaient
    // une rangée de trop et la ligne de réponse débordait sur le bloc suivant.
    const rangs = m.lignes.length + 4.5;
    const hLigne = Math.min(b.h / rangs, 9);
    const jeton = hLigne * 0.8;
    const pas = jeton * 1.18;
    const colW = Math.max(13, hLigne * 1.9);
    const largeur = 7 + n * pas + 2 + colW * 2;
    const x = b.x + Math.max(0, (b.w - largeur) / 2);
    return {
        m, b, n, hLigne, jeton, pas, colW,
        xNum: x, xJetons: x + 7,
        xBien: x + 7 + n * pas + 2,
        xMal: x + 7 + n * pas + 2 + colW,
        yLegende: b.y + hLigne * 0.7,
        yTete: b.y + hLigne * 1.7,
        // La première rangée d'essais commence sous l'en-tête.
        ligneY: (i) => b.y + hLigne * (2.2 + i),
        // Le libellé de la réponse s'écrit AU-DESSUS des cases, pas à leur
        // gauche : « Le code : » fait quinze millimètres et la colonne de
        // gauche n'en offre que sept — le texte passait par-dessus la première
        // case, et l'on ne voyait plus où écrire.
        yLibelle: b.y + hLigne * (2.2 + m.lignes.length + 0.9),
        yReponse: b.y + hLigne * (2.2 + m.lignes.length + 1.6),
        taille: Math.max(1.7, hLigne * 0.34)
    };
}

function mastermindPreviewHtml(item, slot, k, solution) {
    const g = geoMastermind(item, slot);
    const m = g.m;
    const T = (v) => (v * k).toFixed(2);
    const pastille = (couleur, x, y, d = g.jeton) => `<div class="fx-mm-jeton"
        style="left:${T(x)}px; top:${T(y)}px; width:${T(d)}px; height:${T(d)}px;
        background:${couleur.hex}; font-size:${T(d * 0.6)}px">${couleur.id}</div>`;

    // La palette, en tête.
    let html = `<div class="fx-mm-titre" style="left:${T(g.xNum)}px;
        top:${T(g.yLegende - g.taille * 0.9)}px; font-size:${T(g.taille)}px">Couleurs :</div>`;
    const xPal = g.xNum + 14;
    m.couleurs.forEach((c, i) => {
        html += pastille(c, xPal + i * g.pas, g.yLegende - g.jeton * 0.55, g.jeton * 0.9);
    });

    // L'en-tête des deux colonnes de nombres.
    [['bien placés', g.xBien], ['mal placés', g.xMal]].forEach(([mot, x]) => {
        html += `<div class="fx-mm-tete" style="left:${T(x)}px; top:${T(g.yTete - g.taille)}px;
            width:${T(g.colW)}px; font-size:${T(g.taille)}px">${mot}</div>`;
    });

    m.lignes.forEach((l, i) => {
        const y = g.ligneY(i);
        html += `<div class="fx-mm-num" style="left:${T(g.xNum)}px; top:${T(y)}px;
            width:${T(6)}px; height:${T(g.jeton)}px; font-size:${T(g.taille)}px">${i + 1}</div>`;
        l.code.forEach((id, c) => {
            html += pastille(m.couleurs.find(x => x.id === id), g.xJetons + c * g.pas, y);
        });
        [[l.places, g.xBien], [l.presents, g.xMal]].forEach(([v, x]) => {
            html += `<div class="fx-mm-cell" style="left:${T(x)}px; top:${T(y)}px;
                width:${T(g.colW)}px; height:${T(g.jeton)}px;
                font-size:${T(g.jeton * 0.62)}px">${v}</div>`;
        });
    });

    // La ligne de réponse : des cases carrées, une par jeton du code.
    const y = g.yReponse;
    html += `<div class="fx-mm-titre" style="left:${T(g.xNum)}px;
        top:${T(g.yLibelle - g.taille)}px; font-size:${T(g.taille * 1.15)}px">Le code :</div>`;
    for (let c = 0; c < g.n; c++) {
        const lettre = solution ? m.secret[c] : '';
        html += `<div class="fx-mm-case${lettre ? ' fx-mm-case--sol' : ''}"
            style="left:${T(g.xJetons + c * g.pas)}px; top:${T(y)}px;
            width:${T(g.jeton)}px; height:${T(g.jeton)}px;
            font-size:${T(g.jeton * 0.62)}px">${lettre}</div>`;
    }
    return html;
}

function dessinerMastermindPdf(doc, item, slot, solution) {
    const g = geoMastermind(item, slot);
    const m = g.m;
    const aplat = polycopieEnCouleur();

    const pastille = (couleur, x, y, d = g.jeton) => {
        const r = d / 2;
        // EN NOIR ET BLANC, LE JETON RESTE UN ROND VIDE avec sa lettre : un
        // aplat gris derrière une lettre blanche ne survit pas toujours à la
        // photocopie, et la lettre est ce qui porte l'information.
        doc.setFillColor(...rvbDe(couleur.hex));
        doc.setDrawColor(...ENCRE.trait);
        doc.setLineWidth(0.3);
        doc.circle(x + r, y + r, r, aplat ? 'FD' : 'D');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(Math.max(4.5, d * 1.7));
        doc.setTextColor(...(aplat ? [255, 255, 255] : ENCRE.trait));
        doc.text(couleur.id, x + r, y + r + d * 0.22, { align: 'center' });
    };

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(g.taille / 0.3528);
    doc.setTextColor(...ENCRE.gris);
    doc.text(pourPdf('Couleurs :'), g.xNum, g.yLegende);
    m.couleurs.forEach((c, i) => {
        pastille(c, g.xNum + 14 + i * g.pas, g.yLegende - g.jeton * 0.55, g.jeton * 0.9);
    });

    doc.setFontSize(g.taille / 0.3528);
    doc.setTextColor(...ENCRE.gris);
    [['bien placés', g.xBien], ['mal placés', g.xMal]].forEach(([mot, x]) => {
        doc.text(pourPdf(mot), x + g.colW / 2, g.yTete, { align: 'center' });
    });

    m.lignes.forEach((l, i) => {
        const y = g.ligneY(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(g.taille / 0.3528);
        doc.setTextColor(...ENCRE.gris);
        doc.text(String(i + 1), g.xNum + 4, y + g.jeton * 0.7, { align: 'right' });
        l.code.forEach((id, c) => {
            pastille(m.couleurs.find(x => x.id === id), g.xJetons + c * g.pas, y);
        });
        doc.setDrawColor(...ENCRE.grille);
        doc.setLineWidth(0.25);
        [[l.places, g.xBien], [l.presents, g.xMal]].forEach(([v, x]) => {
            doc.rect(x, y, g.colW, g.jeton);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(Math.max(6, g.jeton * 1.9));
            doc.setTextColor(...ENCRE.trait);
            doc.text(String(v), x + g.colW / 2, y + g.jeton * 0.74, { align: 'center' });
        });
    });

    const y = g.yReponse;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize((g.taille * 1.1) / 0.3528);
    doc.setTextColor(...ENCRE.texte);
    doc.text(pourPdf('Le code :'), g.xNum, g.yLibelle);
    doc.setLineWidth(0.4);
    for (let c = 0; c < g.n; c++) {
        const x = g.xJetons + c * g.pas;
        doc.setDrawColor(...ENCRE.trait);
        doc.rect(x, y, g.jeton, g.jeton);
        if (!solution) continue;
        doc.setFontSize(Math.max(6, g.jeton * 1.9));
        doc.setTextColor(47, 133, 90);
        doc.text(m.secret[c], x + g.jeton / 2, y + g.jeton * 0.74, { align: 'center' });
    }
}

// --- LA PYRAMIDE DES MOTS ------------------------------------------------------
//
// Rémy, avec la page de son « Coin des jeux mathématiques » : « Deux jeux dans
// ces styles. » Celui-ci en est un, et c'est un objet de PAPIER — une colonne
// de définitions, un escalier de cases, un crayon. Le bloc imprimé n'est donc
// pas une capture de l'écran : c'est l'original, et l'écran en est la copie.
//
// L'ESCALIER PART D'UN BORD COMMUN. Toutes les lignes commencent à la même
// verticale et s'allongent vers la droite : c'est ce qui fait qu'on VOIT la
// lettre gagnée à chaque marche, la case qui dépasse. Centré, l'escalier
// deviendrait un sapin et la règle du jeu disparaîtrait du dessin.
//
// LA DÉFINITION TIENT SUR UNE LIGNE, quitte à rétrécir. Deux lignes de texte
// dans une case haute d'une case décaleraient tout l'escalier, et un escalier
// dont les marches ne sont plus alignées ne se lit plus.

function geoPyramide(item, slot) {
    const m = item.meta;
    const b = boiteDe(slot);
    const n = m.hauteur;
    // UNE CASE SE DIMENSIONNE POUR UN CRAYON, pas pour remplir le bloc : au-delà
    // d'un centimètre, on écrit une lettre au milieu d'un grand vide.
    const cote = Math.min(b.h / (n + 0.3), 11);
    const casesW = cote * n;
    const plusLong = Math.max(1, ...m.barreaux.map(bb => bb.def.length));
    // La largeur d'un texte, en millimètres : à cette taille de police,
    // un caractère d'Helvetica en fait environ la moitié.
    const largeurDe = (taille) => plusLong * taille * 0.48;
    // LE TEXTE LE PLUS LONG FIXE LA TAILLE DE TOUS. Des définitions de corps
    // différents dans une même colonne se liraient comme des exercices
    // différents.
    const voulue = cote * 0.42;
    // LA COLONNE DES DÉFINITIONS PREND CE QU'IL LUI FAUT, PAS TOUTE LA PAGE.
    // Étirée sur la largeur d'une feuille A4, elle mettait cent trente
    // millimètres sous « Pour dormir. » et laissait des cases de huit
    // millimètres perdues au bord droit : le bloc ne ressemblait plus à une
    // pyramide mais à un tableau à deux colonnes.
    const defW = Math.min(largeurDe(voulue) + 2, b.w - casesW - 1);
    const taille = Math.max(1.6, Math.min(voulue, (defW - 2) / (plusLong * 0.48)));
    // Le tout est CENTRÉ dans le bloc : ce qui reste de place se partage des
    // deux côtés au lieu de s'accumuler à gauche.
    const x = b.x + Math.max(0, (b.w - defW - 1 - casesW) / 2);
    const y0 = b.y + (b.h - cote * n) / 2;
    return {
        m, b, n, cote, defW, taille,
        x, x0: x + defW + 1, y0,
        ligneY: (i) => y0 + i * cote
    };
}

/** Ce qu'on écrit dans la ligne `i` : le mot donné, la solution, ou rien. */
const motPyramide = (g, i, solution) =>
    (g.m.donnes[i] || solution) ? g.m.barreaux[i].mot : '';

function pyramidePreviewHtml(item, slot, k, solution) {
    const g = geoPyramide(item, slot);
    const T = (v) => (v * k).toFixed(2);
    return g.m.barreaux.map((bar, i) => {
        const y = g.ligneY(i);
        const mot = motPyramide(g, i, solution);
        const donne = g.m.donnes[i];
        let html = `<div class="fx-py-def" style="left:${T(g.x)}px; top:${T(y)}px;
            width:${T(g.defW)}px; height:${T(g.cote)}px; font-size:${T(g.taille)}px"
            ><span>${echapperSheet(bar.def)}</span></div>`;
        for (let c = 0; c <= i; c++) {
            const lettre = mot[c] || '';
            html += `<div class="fx-py-case${donne ? ' fx-py-case--donne' : ''}${
                lettre && !donne ? ' fx-py-case--sol' : ''}"
                style="left:${T(g.x0 + c * g.cote)}px; top:${T(y)}px;
                width:${T(g.cote)}px; height:${T(g.cote)}px;
                font-size:${T(g.cote * 0.58)}px">${lettre}</div>`;
        }
        return html;
    }).join('');
}

function dessinerPyramidePdf(doc, item, slot, solution) {
    const g = geoPyramide(item, slot);
    doc.setLineWidth(0.3);
    g.m.barreaux.forEach((bar, i) => {
        const y = g.ligneY(i);
        const mot = motPyramide(g, i, solution);
        const donne = g.m.donnes[i];

        // La colonne des définitions : un cadre, et le texte calé à gauche
        // comme dans la revue — l'œil descend la colonne sans chercher.
        doc.setDrawColor(...ENCRE.trait);
        doc.rect(g.x, y, g.defW, g.cote);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(g.taille / 0.3528);
        doc.setTextColor(...ENCRE.texte);
        doc.text(pourPdf(bar.def), g.x + 1, y + g.cote * 0.65);

        for (let c = 0; c <= i; c++) {
            const x = g.x0 + c * g.cote;
            // Une ligne DONNÉE est de l'énoncé : fond teinté, on n'écrit pas
            // dedans. Les autres restent blanches, prêtes pour le crayon.
            if (donne) {
                doc.setFillColor(...ENCRE.donnee);
                doc.rect(x, y, g.cote, g.cote, 'F');
            }
            doc.setDrawColor(...ENCRE.trait);
            doc.rect(x, y, g.cote, g.cote);
            const lettre = mot[c];
            if (!lettre) continue;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(Math.max(5, g.cote * 1.7));
            doc.setTextColor(...(donne ? ENCRE.trait : [47, 133, 90]));
            doc.text(lettre, x + g.cote / 2, y + g.cote * 0.73, { align: 'center' });
        }
    });
}

// --- COMBIEN DE CUBES ? -------------------------------------------------------
//
// Rémy : « j'aimerais un exercice de comptage de cube ».
//
// LE DESSIN VIENT DES MÊMES DONNÉES QUE L'ÉCRAN. `meta.hauteurs` dit combien de
// cubes sont empilés sur chaque case du sol ; core/cubes.js les projette et les
// range du plus loin au plus près, et il n'y a plus qu'à peindre — les cubes de
// devant recouvrent ceux de derrière tout seuls. Aucune occultation à calculer,
// et surtout aucune chance que la feuille montre autre chose que l'écran.
//
// TROIS CLARTÉS, ET ELLES SURVIVENT AU NOIR ET BLANC. Contrairement aux secteurs
// d'angles, on ne bascule PAS en ligne claire quand le polycopié est en noir et
// blanc : sans les trois valeurs, un empilement de cubes devient un pavage de
// losanges et l'exercice disparaît avec la perspective. Les trois teintes sont
// déjà des gris bleutés bien séparés ; le filtre d'encre (voir ficheRendu.js) les
// ramène à trois gris qui se distinguent encore à la photocopie.

/** Les trois faces vues, et l'arête. Ce sont les teintes de --cu-* (modules.css). */
const ENCRE_CUBE = {
    dessus: [238, 241, 250],
    droite: [182, 193, 218],
    gauche: [123, 137, 171],
    arete: [47, 58, 82]
};

function geoCubes(item, slot) {
    const m = item.meta;
    const b = boiteDe(slot);
    const marge = 2;
    // La ligne de réponse en bas, l'empilement dans tout le reste — même partage
    // que les figures d'angles, et pour la même raison : le bloc est plus haut
    // que large et le dessin doit prendre ce qui reste, pas un carré inscrit.
    const ligneH = Math.min(9, b.h * 0.2);
    const dispoH = b.h - ligneH;
    const bd = boiteDessin(m.hauteurs);
    const k = Math.min((b.w - marge * 2) / bd.largeur, (dispoH - marge) / bd.hauteur);
    const x0 = b.x + (b.w - bd.largeur * k) / 2 - bd.xmin * k;
    const y0 = b.y + (dispoH - bd.hauteur * k) / 2 - bd.ymin * k;
    return {
        m, b, k, ligneH, dispoH,
        // La projection descend déjà vers le bas (voir projeter) : rien à retourner.
        P: (p) => ({ x: x0 + p.x * k, y: y0 + p.y * k }),
        yReponse: b.y + dispoH + ligneH * 0.62,
        taille: Math.max(2.6, Math.min(Math.min(b.w, dispoH) * 0.085, 4.4)),
        // L'arête se mesure en CUBES, pas en millimètres : trop fine sur un grand
        // empilement elle disparaît, trop épaisse sur un petit elle mange la face.
        trait: Math.min(0.5, Math.max(0.14, k * 0.035))
    };
}

/** Toutes les faces à peindre, dans l'ordre, chacune avec son nom de teinte. */
function facesCubesPapier(g) {
    return cubesAPeindre(g.m.hauteurs).flatMap(({ x, y, z }) => {
        const f = facesCube(x, y, z);
        // Dans le cube aussi l'ordre compte : gauche, droite, puis le dessus.
        return [['gauche', f.gauche], ['droite', f.droite], ['dessus', f.dessus]];
    }).map(([nom, pts]) => [nom, pts.map(p => g.P(p))]);
}

function cubesPreviewHtml(item, slot, k, solution) {
    const g = geoCubes(item, slot);
    const T = (v) => (v * k).toFixed(2);
    const d = facesCubesPapier(g).map(([nom, pts]) => `<polygon
        points="${pts.map(p => `${T(p.x)},${T(p.y)}`).join(' ')}"
        fill="rgb(${ENCRE_CUBE[nom].join(',')})" stroke="rgb(${ENCRE_CUBE.arete.join(',')})"
        stroke-width="${T(g.trait)}" stroke-linejoin="round"/>`).join('');
    return `<svg class="fx-fig-svg" style="left:0; top:0; width:100%; height:100%">${d}</svg>`
        + `<div class="fx-ligne-rep" style="left:${T(g.b.x + 2)}px;
            top:${T(g.b.y + g.dispoH)}px; width:${T(g.b.w - 4)}px;
            height:${T(g.ligneH * 0.8)}px; font-size:${T(g.taille)}px"><b>=</b>&nbsp;<i>${
            solution ? `${g.m.reponse} cubes` : ''}</i></div>`;
}

function dessinerCubesPdf(doc, item, slot, solution) {
    const g = geoCubes(item, slot);
    doc.setLineWidth(g.trait);
    doc.setLineJoin('round');
    doc.setDrawColor(...ENCRE_CUBE.arete);
    facesCubesPapier(g).forEach(([nom, pts]) => {
        doc.setFillColor(...ENCRE_CUBE[nom]);
        const suite = pts.slice(1).map((p, j) => [p.x - pts[j].x, p.y - pts[j].y]);
        doc.lines(suite, pts[0].x, pts[0].y, [1, 1], 'FD', true);
    });
    doc.setLineJoin('miter');
    ligneReponsePdf(doc, g, '=', solution ? `${g.m.reponse} cubes` : '');
}

// --- LE MEMORY DES TABLES, À DÉCOUPER -----------------------------------------
//
// Rémy : « on va permettre de créer un jeu de memory que l'utilisateur pourra
// découper et coller, tu t'occupes du recto et du verso ». C'est un jeu de
// classe, pas un jeu d'écran : on imprime, on découpe, on colle dos à dos — ou
// l'on imprime en recto-verso —, et le paquet resservira toute l'année.
//
// UN BLOC = UNE PAIRE, deux cartes côte à côte : le calcul et son résultat. La
// PAGE DES SOLUTIONS porte les DOS, aux mêmes emplacements : tous identiques,
// donc rien à retourner ni à aligner au millimètre.

/** Les deux cartes d'une paire dans leur emplacement, et leurs traits de coupe. */
function geoMemory(slot, item) {
    const b = slot.boite || { x: slot.x, y: slot.y, w: slot.taille, h: slot.taille };
    // AUCUN ÉCART, NI ENTRE LES DEUX CARTES NI ENTRE LES BLOCS. Les cartes
    // remplissent leur emplacement et se touchent : les traits de coupe se
    // confondent deux à deux, et la page devient un quadrillage qu'on découpe
    // en lignes droites d'un bout à l'autre. C'est la demande de Rémy, et
    // c'est aussi la façon dont sont imprimées les planches du commerce.
    const w = b.w / 2;
    const h = b.h;
    // LE CORPS SUIT LE PLUS LONG DES DEUX LIBELLÉS. « 10 × 10 » et « 16 » ne
    // font pas la même longueur, et un corps calculé sur la carte laissait le
    // calcul toucher les deux bords pendant que le résultat flottait au milieu.
    const m = (item && item.meta) || {};
    const large = (t) => [...String(t || '')]
        .reduce((n, c) => n + (c === ' ' ? 0.3 : 0.62), 0);
    const pire = Math.max(1.6, large(m.calcul), large(m.resultat));
    const corps = Math.min(h * 0.3, (w - 6) / pire);
    return { b, w, h, ecart: 0, corps, y: b.y };
}

function memoryPreviewHtml(item, slot, k, solution) {
    const g = geoMemory(slot, item);
    const m = item.meta;
    const couleur = polycopieEnCouleur();
    const T = (v) => (v * k).toFixed(2);
    const corps = g.corps;
    let html = '';

    [0, 1].forEach((i) => {
        const x = g.b.x + i * (g.w + g.ecart);
        const dos = !!solution;
        // Les bordures voisines se superposent au pixel près : on n'en dessine
        // donc qu'UNE, et le trait reste fin partout au lieu de doubler
        // d'épaisseur sur les coutures.
        html += `<div class="fx-mm-carte${dos ? ' fx-mm-carte--dos' : ''}"
            style="left:${x * k}px; top:${g.y * k}px; width:${g.w * k}px; height:${g.h * k}px;
            ${dos && couleur ? 'background:#eef2ff;' : ''}"></div>`;
        if (dos) {
            // Le dos : un cadre intérieur et un « × » — le signe du jeu. Rien de
            // plus : un dos chargé, photocopié cent fois, mange une cartouche.
            html += `<div class="fx-mm-dos-cadre" style="left:${(x + g.w * 0.12) * k}px;
                top:${(g.y + g.h * 0.12) * k}px; width:${(g.w * 0.76) * k}px;
                height:${(g.h * 0.76) * k}px"></div>`;
            html += `<div class="fx-mm-dos-signe" style="left:${x * k}px; top:${g.y * k}px;
                width:${g.w * k}px; height:${g.h * k}px;
                font-size:${corps * 1.4 * k}px">×</div>`;
            return;
        }
        html += `<div class="fx-mm-texte" style="left:${x * k}px; top:${g.y * k}px;
            width:${g.w * k}px; height:${g.h * k}px; font-size:${corps * k}px">${
    echapperSheet(i === 0 ? m.calcul : m.resultat)}</div>`;
    });
    return html;
}

function dessinerMemoryPdf(doc, item, slot, solution) {
    const g = geoMemory(slot, item);
    const m = item.meta;
    const couleur = polycopieEnCouleur();
    const corps = g.corps;

    [0, 1].forEach((i) => {
        const x = g.b.x + i * (g.w + g.ecart);
        // LE TRAIT DE COUPE EST EN POINTILLÉS : c'est ce qui dit « ici, les
        // ciseaux » plutôt que « voici un cadre ».
        doc.setDrawColor(...ENCRE.trait);
        doc.setLineWidth(0.3);
        if (solution && couleur) {
            doc.setFillColor(238, 242, 255);
            doc.rect(x, g.y, g.w, g.h, 'F');
        }
        // À ANGLES DROITS, ET NON PLUS ARRONDIS : deux cartes voisines
        // partagent leur bord, et un coin arrondi laisserait quatre petites
        // lunules blanches à chaque croisement — autant d'endroits où les
        // ciseaux hésitent.
        if (doc.setLineDashPattern) doc.setLineDashPattern([1.2, 1], 0);
        doc.rect(x, g.y, g.w, g.h, 'S');
        if (doc.setLineDashPattern) doc.setLineDashPattern([], 0);

        if (solution) {
            doc.setDrawColor(...ENCRE.grille);
            doc.setLineWidth(0.4);
            doc.rect(x + g.w * 0.12, g.y + g.h * 0.12, g.w * 0.76, g.h * 0.76, 'S');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(corps * 1.4 / 0.3528);
            doc.setTextColor(...ENCRE.grille);
            doc.text('x', x + g.w / 2, g.y + g.h / 2 + corps * 0.5, { align: 'center' });
            return;
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(corps / 0.3528);
        doc.setTextColor(...ENCRE.texte);
        doc.text(pourPdf(i === 0 ? m.calcul : m.resultat),
            x + g.w / 2, g.y + g.h / 2 + corps * 0.35, { align: 'center' });
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

/** « #ef4444 » en composantes, pour jsPDF. */
const rvbHex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16)];

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
        doc.setDrawColor(...ENCRE.grille);
        doc.setLineWidth(0.2);
        if (doc.setLineDashPattern) doc.setLineDashPattern([1, 1], 0);
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
    const hautTexte = lesDeux ? corps * 5 : 0;
    return {
        b, schema, lesDeux, gaucheW, corps, pas,
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

// --- Un repère, plusieurs points --------------------------------------------

/** Le repère dans son emplacement : axes, graduations, et la place d'écrire. */
/**
 * LES POINTS SE RANGENT EN TABLEAU, SANS BORDURE EXTÉRIEURE.
 *
 * Rémy : « un tableau sans bordure extérieure, 3 colonnes 2 lignes, adapté au
 * nombre de points ». Alignés en une seule ligne courante, six couples se
 * lisaient comme une phrase — on cherchait où finissait l'un et où commençait
 * le suivant. En colonnes, chaque point a sa case ; et le filet ne fait que
 * séparer les cases, il n'encadre pas la liste : ce n'est pas un cadre, c'est
 * une mise en colonnes.
 */
function grilleDesPoints(n) {
    const cols = Math.min(3, n % 3 === 0 ? 3 : (n % 2 === 0 ? 2 : n));
    return { cols: Math.max(1, cols), rows: Math.ceil(n / Math.max(1, cols)) };
}

/**
 * UNE COULEUR FONCÉE PAR POINT, quand la fiche s'imprime en couleur.
 *
 * Rémy : « pour lire les coordonnées, les lettres sont un peu grosses ; si on
 * met en couleur, mets une couleur foncée par point différents ». Six croix
 * noires au milieu d'un quadrillage se ressemblent, et l'élève qui remplit la
 * quatrième ligne du tableau doit recompter les points pour savoir duquel il
 * parle. La couleur relie la croix, sa lettre et sa case du tableau.
 *
 * FONCÉES, et non pas vives : ces teintes doivent rester lisibles sur un
 * carreau clair, et surtout survivre au photocopieur noir et blanc, qui les
 * rend en gris nettement distincts au lieu d'un même gris pâle.
 */
const TEINTES_POINT = [
    [30, 64, 175],      // bleu nuit
    [21, 128, 61],      // vert forêt
    [159, 18, 57],      // bordeaux
    [124, 45, 18],      // brun
    [76, 29, 149],      // violet profond
    [15, 118, 110]      // sarcelle foncé
];
const teintePoint = (i, couleur) => (couleur ? TEINTES_POINT[i % TEINTES_POINT.length] : ENCRE.trait);

/**
 * LA LETTRE D'UN POINT, EN FRACTION DE CARREAU.
 *
 * « Les lettres sont un peu grosses » : à un demi-carreau, un « B » posé sur
 * (2 ; 3) mordait sur le carreau voisin et l'on ne savait plus quel croisement
 * il nommait. Et l'aperçu écrivait plus gros que le PDF — 0,5 carreau contre
 * 0,42 —, si bien que la feuille ne ressemblait pas à son image. Une seule
 * valeur, en millimètres, pour les deux rendus.
 */
const TAILLE_ETIQ_POINT = 0.38;

/** Le repère dans son emplacement : axes, graduations, et la place d'écrire. */
function geoRepere(item, slot) {
    const m = item.meta;
    const mini = m.relatifs ? -m.max : 0;
    const etendue = m.max - mini;
    // Le bas de l'emplacement porte le tableau des points : les coordonnées à
    // placer, ou les cases où écrire celles qu'on a lues.
    const { cols, rows } = grilleDesPoints(m.points.length);
    const hRang = slot.taille * (m.mode === 'placer' ? 0.105 : 0.125);
    const listeH = hRang * rows + slot.taille * 0.03;
    const cote = slot.taille - listeH;
    const marge = cote * 0.10;
    const pas = (cote - 2 * marge) / etendue;
    const x0 = slot.x + (slot.taille - cote) / 2 + marge;
    const y0 = slot.y + marge;
    // LE TABLEAU PREND TOUTE LA LARGEUR DU BLOC, pas seulement celle du repère :
    // c'est là qu'on écrit, et deux millimètres de plus par case, ce sont deux
    // millimètres de pointillés en plus.
    const b = slot.boite || { x: slot.x, w: slot.taille };
    return {
        m, mini, pas, cote, listeH, cols, rows, hRang,
        listeY: slot.y + cote + slot.taille * 0.03,
        xGauche: slot.x + (slot.taille - cote) / 2,
        tabX: b.x, tabW: b.w,
        px: (x) => x0 + (x - mini) * pas,
        py: (y) => y0 + (m.max - y) * pas
    };
}

function reperePreviewHtml(item, slot, k, solution) {
    const g = geoRepere(item, slot);
    const m = g.m;
    const montrer = m.mode === 'lire' || solution;      // les croix sont-elles tracées ?
    const couleur = polycopieEnCouleur();
    let html = '';

    // Le quadrillage, puis les deux axes par-dessus.
    for (let i = g.mini; i <= m.max; i++) {
        html += `<div class="fx-rp-grille" style="left:${g.px(i) * k}px; top:${g.py(m.max) * k}px;
            width:0; height:${(g.py(g.mini) - g.py(m.max)) * k}px"></div>`;
        html += `<div class="fx-rp-grille" style="left:${g.px(g.mini) * k}px; top:${g.py(i) * k}px;
            width:${(g.px(m.max) - g.px(g.mini)) * k}px; height:0"></div>`;
    }
    // LES DEUX AXES, ET ILS PORTENT UNE FLÈCHE. Sans elle, ce sont deux traits
    // du quadrillage un peu plus épais que les autres : l'élève ne voit pas
    // qu'il regarde un repère, et le sens de lecture ne se lit nulle part.
    // La flèche dépasse le dernier carreau — c'est ainsi qu'on trace au tableau.
    const bout = g.pas * 0.55;
    html += `<div class="fx-rp-axe" style="left:${g.px(g.mini) * k}px; top:${g.py(0) * k}px;
        width:${(g.px(m.max) - g.px(g.mini) + bout) * k}px; height:0"></div>`;
    html += `<div class="fx-rp-axe" style="left:${g.px(0) * k}px; top:${(g.py(m.max) - bout) * k}px;
        width:0; height:${(g.py(g.mini) - g.py(m.max) + bout) * k}px"></div>`;
    const fl = g.pas * 0.26;
    html += `<svg style="position:absolute; left:0; top:0; width:100%; height:100%; overflow:visible">
        <path d="M ${((g.px(m.max) + bout) * k).toFixed(2)} ${(g.py(0) * k).toFixed(2)}
                 l ${(-fl * k).toFixed(2)} ${(-fl * 0.5 * k).toFixed(2)}
                 l 0 ${(fl * k).toFixed(2)} Z" fill="#1a202c"/>
        <path d="M ${(g.px(0) * k).toFixed(2)} ${((g.py(m.max) - bout) * k).toFixed(2)}
                 l ${(-fl * 0.5 * k).toFixed(2)} ${(fl * k).toFixed(2)}
                 l ${(fl * k).toFixed(2)} 0 Z" fill="#1a202c"/></svg>`;

    // Les graduations chiffrées : sans elles, on ne lit rien.
    for (let i = g.mini; i <= m.max; i++) {
        if (i === 0) continue;
        html += `<div class="fx-rp-grad" style="left:${(g.px(i) - g.pas / 2) * k}px;
            top:${(g.py(0) + g.pas * 0.12) * k}px; width:${g.pas * k}px;
            font-size:${g.pas * 0.42 * k}px">${i}</div>`;
        html += `<div class="fx-rp-grad fx-rp-grad--y" style="left:${(g.px(0) - g.pas * 1.05) * k}px;
            top:${(g.py(i) - g.pas * 0.3) * k}px; width:${g.pas * 0.9 * k}px;
            font-size:${g.pas * 0.42 * k}px">${i}</div>`;
    }
    // LE ZÉRO SE POSE À L'ORIGINE, pas à un carreau de là. Il était écrit une
    // largeur de carreau à gauche et presque un demi-carreau plus bas : sur un
    // repère gradué de un en un, cela le mettait en face du −1.
    html += `<div class="fx-rp-grad" style="left:${(g.px(0) - g.pas * 0.62) * k}px;
        top:${(g.py(0) + g.pas * 0.06) * k}px; width:${g.pas * 0.5 * k}px;
        font-size:${g.pas * 0.42 * k}px">0</div>`;

    // LES POINTS SE MARQUENT D'UNE CROIX : elle désigne exactement son centre,
    // là où un rond laisse hésiter entre son bord et son milieu.
    if (montrer) {
        m.points.forEach((pt, i) => {
            // UNE CROIX DÉSIGNE UN POINT, elle ne le recouvre pas. À un quart
            // de carreau ses branches mordaient sur les cases voisines ; à un
            // sixième, elle marque le croisement sans le cacher — c'est ce
            // qu'on trace au tableau, et c'est ce que Rémy demande.
            const r = g.pas * 0.11;
            const c = rvbCss(teintePoint(i, couleur));
            html += `<div class="fx-rp-croix" style="left:${(g.px(pt.x) - r) * k}px;
                top:${(g.py(pt.y) - r) * k}px; width:${2 * r * k}px; height:${2 * r * k}px;
                color:${c}"></div>`;
            html += `<div class="fx-rp-etiq" style="left:${(g.px(pt.x) + r * 0.9) * k}px;
                top:${(g.py(pt.y) - r * 2.4) * k}px; color:${c};
                font-size:${TAILLE_ETIQ_POINT * g.pas * k}px">${pt.label}</div>`;
        });
    }

    // Sous le repère, le tableau des points : les coordonnées à placer, ou les
    // cases où écrire celles qu'on vient de lire. Le filet sépare les cases et
    // n'encadre pas l'ensemble — pas de bordure extérieure.
    //
    // DANS CHAQUE CASE À REMPLIR, une petite grille : « A ( », le trou, « ; »,
    // le trou, « ) ». Les deux trous prennent tout ce qui reste, à parts
    // égales — ils ne peuvent donc ni déborder sur le point voisin, ni rester
    // trop courts pour y écrire un nombre.
    const cellules = m.points.map((p, i) => {
        // La lettre du tableau porte la couleur de sa croix : c'est ce qui
        // fait le lien, et c'est la seule chose qu'on colore dans la case —
        // les coordonnées, elles, s'écrivent au crayon.
        const etiq = `<b style="color:${rvbCss(teintePoint(i, couleur))}">${p.label}</b>`;
        const dedans = m.mode === 'placer'
            ? `<b>${etiq} (${p.x} ; ${p.y})</b>`
            : `<span class="fx-rp-rep"><b>${etiq} (</b><span class="fx-rp-trou"
                >${solution ? p.x : ''}</span><b>;</b><span class="fx-rp-trou"
                >${solution ? p.y : ''}</span><b>)</b></span>`;
        const cls = 'fx-rp-cell'
            + (i % g.cols ? ' fx-rp-cell--filet-g' : '')
            + (i >= g.cols ? ' fx-rp-cell--filet-h' : '');
        return `<div class="${cls}">${dedans}</div>`;
    }).join('');
    html += `<div class="fx-rp-tab" style="left:${g.tabX * k}px; top:${g.listeY * k}px;
        width:${g.tabW * k}px; height:${(g.hRang * g.rows) * k}px;
        grid-template-columns:repeat(${g.cols}, 1fr);
        font-size:${g.hRang * 0.34 * k}px">${cellules}</div>`;
    return html;
}

function dessinerRepPdf(doc, item, slot, solution) {
    const g = geoRepere(item, slot);
    const m = g.m;
    const montrer = m.mode === 'lire' || solution;
    const couleur = polycopieEnCouleur();

    doc.setLineWidth(0.15);
    doc.setDrawColor(...ENCRE.grille);
    for (let i = g.mini; i <= m.max; i++) {
        doc.line(g.px(i), g.py(m.max), g.px(i), g.py(g.mini));
        doc.line(g.px(g.mini), g.py(i), g.px(m.max), g.py(i));
    }
    doc.setLineWidth(0.5);
    doc.setDrawColor(...ENCRE.trait);
    const bout = g.pas * 0.55, fl = g.pas * 0.26;
    doc.line(g.px(g.mini), g.py(0), g.px(m.max) + bout, g.py(0));
    doc.line(g.px(0), g.py(m.max) - bout, g.px(0), g.py(g.mini));
    // Les pointes : deux petits triangles pleins, comme au tableau.
    doc.setFillColor(...ENCRE.trait);
    doc.triangle(g.px(m.max) + bout, g.py(0), g.px(m.max) + bout - fl, g.py(0) - fl * 0.5,
        g.px(m.max) + bout - fl, g.py(0) + fl * 0.5, 'F');
    doc.triangle(g.px(0), g.py(m.max) - bout, g.px(0) - fl * 0.5, g.py(m.max) - bout + fl,
        g.px(0) + fl * 0.5, g.py(m.max) - bout + fl, 'F');

    doc.setFontSize(Math.max(4.5, g.pas * 1.1));
    doc.setTextColor(...ENCRE.gris);
    for (let i = g.mini; i <= m.max; i++) {
        if (i === 0) continue;
        doc.text(String(i), g.px(i), g.py(0) + g.pas * 0.62, { align: 'center' });
        doc.text(String(i), g.px(0) - g.pas * 0.35, g.py(i) + g.pas * 0.18, { align: 'right' });
    }
    doc.text('0', g.px(0) - g.pas * 0.16, g.py(0) + g.pas * 0.52, { align: 'right' });

    if (montrer) {
        doc.setLineWidth(0.45);
        doc.setFontSize(Math.max(4.6, TAILLE_ETIQ_POINT * g.pas / 0.3528));
        m.points.forEach((pt, i) => {
            const r = g.pas * 0.11, x = g.px(pt.x), y = g.py(pt.y);
            const c = teintePoint(i, couleur);
            doc.setDrawColor(...c);
            doc.setTextColor(...c);
            doc.line(x - r, y - r, x + r, y + r);
            doc.line(x - r, y + r, x + r, y - r);
            doc.text(pt.label, x + r * 1.1, y - r * 0.9);
        });
    }

    // LE TABLEAU DES POINTS, SANS BORDURE EXTÉRIEURE : on ne trace que les
    // filets INTÉRIEURS, ceux qui séparent une case de sa voisine.
    doc.setTextColor(...ENCRE.texte);
    const larg = g.tabW / g.cols;
    const hautTab = g.hRang * g.rows;
    doc.setLineWidth(0.2);
    doc.setDrawColor(...ENCRE.grille);
    for (let c = 1; c < g.cols; c++) {
        const x = g.tabX + c * larg;
        doc.line(x, g.listeY, x, g.listeY + hautTab);
    }
    for (let r = 1; r < g.rows; r++) {
        const y = g.listeY + r * g.hRang;
        doc.line(g.tabX, y, g.tabX + g.tabW, y);
    }

    doc.setFontSize(Math.max(5, g.hRang * 0.95));
    // LES POINTILLÉS REMPLISSENT LA PLACE, ils ne sont pas comptés d'avance.
    // Une longueur fixe est soit trop courte pour écrire un nombre à deux
    // chiffres, soit assez longue pour sortir de sa case.
    m.points.forEach((p, i) => {
        const col = i % g.cols, rang = Math.floor(i / g.cols);
        const cx = g.tabX + (col + 0.5) * larg;
        const y = g.listeY + (rang + 0.68) * g.hRang;
        // LA LETTRE PORTE LA COULEUR DE SA CROIX, le reste de la case non :
        // c'est ce qui relie la ligne du tableau au point du repère. On écrit
        // donc la case en deux morceaux, centrés ensemble.
        const suite = m.mode === 'placer' || solution
            ? ` (${p.x} ; ${p.y})`
            : (() => {
                const fixe = doc.getTextWidth(pourPdf(`${p.label} (  ;  )`));
                const unPoint = Math.max(0.4, doc.getTextWidth('.'));
                const combien = Math.max(3, Math.floor((larg - 2 - fixe) / (2 * unPoint)));
                const trou = '.'.repeat(combien);
                return ` ( ${trou} ; ${trou} )`;
            })();
        const wL = doc.getTextWidth(pourPdf(p.label)), wS = doc.getTextWidth(pourPdf(suite));
        const x0 = cx - (wL + wS) / 2;
        doc.setTextColor(...teintePoint(i, couleur));
        doc.text(pourPdf(p.label), x0, y);
        doc.setTextColor(...ENCRE.texte);
        doc.text(pourPdf(suite), x0 + wL, y);
    });
}


// --- LA PENDULE --------------------------------------------------------------
//
// Deux exercices sur le même cadran, et c'est le mode qui les sépare :
//
//   LIRE   — les aiguilles sont tracées, l'élève écrit « …… h …… » dessous.
//   PLACER — l'heure est écrite dessous, le cadran est nu, l'élève trace les
//            deux aiguilles.
//
// « Avec ou sans minutes » est le réglage de l'écran, repris tel quel : la
// couronne rouge des multiples de cinq est une AIDE qu'on retire quand la
// lecture est acquise, pas une décoration.
//
// La grande aiguille est plus LONGUE, la petite plus ÉPAISSE : c'est la seule
// façon de les distinguer sur un polycopié en noir et blanc, où la couleur de
// l'écran ne survit pas.

function geoHorloge(item, slot) {
    // Un tiers du bas pour la ligne de réponse : « …… h …… » écrit au crayon
    // demande de la place, et un cadran qui la mange rend la fiche inutilisable.
    const ligneH = slot.taille * 0.20;
    const cote = slot.taille - ligneH;
    const r = cote * 0.44;
    return {
        cote, ligneH, r,
        cx: slot.x + slot.taille / 2, cy: slot.y + cote / 2,
        ligneY: slot.y + cote, x0: slot.x
    };
}

/** Les bouts d'une aiguille, en coordonnées absolues. */
function aiguilleHorloge(g, tours, longueur) {
    const a = tours * Math.PI * 2 - Math.PI / 2;
    return { x: g.cx + Math.cos(a) * longueur, y: g.cy + Math.sin(a) * longueur };
}

const horlogeAngles = (m) => ({
    minutes: m.m / 60,
    heures: (((m.mode === 'placer' ? m.h12 : m.h) % 12) + m.m / 60) / 12
});

function horlogePreviewHtml(item, slot, k, solution) {
    const g = geoHorloge(item, slot);
    const m = item.meta;
    const tracer = m.mode === 'lire' || solution;
    const a = horlogeAngles(m);
    const T = (v) => (v * k).toFixed(2);
    // L'APERÇU MONTRE CE QUI SORTIRA. Les mêmes couleurs que le PDF, sous la
    // même condition : un aperçu qui ment fait imprimer deux fois.
    const enCouleur = polycopieEnCouleur();
    const hex = ([r, v, b]) => `rgb(${r},${v},${b})`;
    const C = HORLOGE_COULEUR;
    const cCadran = enCouleur ? hex(C.cadran) : '#1a202c';
    const cChiffres = enCouleur ? hex(C.chiffres) : '#1a202c';
    const cHeures = enCouleur ? hex(C.heures) : '#1a202c';
    const cMinutes = enCouleur ? hex(C.minutes) : '#1a202c';
    let d = '';

    // Le boîtier, les soixante graduations, et la couronne des minutes.
    d += `<circle cx="${T(g.cx)}" cy="${T(g.cy)}" r="${T(g.r)}"
          fill="${enCouleur ? hex(C.fond) : '#fff'}" stroke="${cCadran}" stroke-width="${T(g.r * 0.045)}"/>`;
    for (let i = 0; i < 60; i++) {
        const ang = i / 60 * Math.PI * 2 - Math.PI / 2;
        const gros = i % 5 === 0;
        const r2 = g.r * 0.94, r1 = r2 - g.r * (gros ? 0.085 : 0.045);
        d += `<line x1="${T(g.cx + Math.cos(ang) * r1)}" y1="${T(g.cy + Math.sin(ang) * r1)}"
              x2="${T(g.cx + Math.cos(ang) * r2)}" y2="${T(g.cy + Math.sin(ang) * r2)}"
              stroke="${gros ? cCadran : '#94a3b8'}" stroke-width="${T(g.r * (gros ? 0.035 : 0.014))}"/>`;
    }
    for (let n = 1; n <= 12; n++) {
        const ang = n / 12 * Math.PI * 2 - Math.PI / 2;
        const rr = g.r * (m.reperes ? 0.55 : 0.74);
        d += `<text x="${T(g.cx + Math.cos(ang) * rr)}" y="${T(g.cy + Math.sin(ang) * rr)}"
              text-anchor="middle" dominant-baseline="central"
              font-size="${T(g.r * 0.24)}" font-weight="700" fill="${cChiffres}">${n}</text>`;
    }
    if (m.reperes) {
        for (let n = 0; n < 12; n++) {
            const ang = n / 12 * Math.PI * 2 - Math.PI / 2;
            const rr = g.r * 0.78;
            d += `<text x="${T(g.cx + Math.cos(ang) * rr)}" y="${T(g.cy + Math.sin(ang) * rr)}"
                  text-anchor="middle" dominant-baseline="central"
                  font-size="${T(g.r * 0.155)}" font-weight="700"
                  fill="${enCouleur ? cMinutes : '#8a93a5'}">${n * 5}</text>`;
        }
    }
    if (tracer) {
        const gm = aiguilleHorloge(g, a.minutes, g.r * 0.84);
        const gh = aiguilleHorloge(g, a.heures, g.r * 0.50);
        // LA PETITE AIGUILLE RESTE UNE AIGUILLE. À huit centièmes de rayon et
        // le bout coupé net, elle avait l'air d'un doigt posé sur le cadran :
        // Rémy, « petite aiguille moche, trop grosse, non arrondie au bout ».
        // Elle reste plus ÉPAISSE que la grande — c'est ce qui les distingue —,
        // mais d'un tiers seulement, et les deux bouts sont arrondis.
        d += `<line x1="${T(g.cx)}" y1="${T(g.cy)}" x2="${T(gh.x)}" y2="${T(gh.y)}"
              stroke="${cHeures}" stroke-width="${T(g.r * 0.055)}" stroke-linecap="round"/>`;
        d += `<line x1="${T(g.cx)}" y1="${T(g.cy)}" x2="${T(gm.x)}" y2="${T(gm.y)}"
              stroke="${cMinutes}" stroke-width="${T(g.r * 0.036)}" stroke-linecap="round"/>`;
    }
    d += `<circle cx="${T(g.cx)}" cy="${T(g.cy)}" r="${T(g.r * 0.05)}" fill="#1a202c"/>`;

    const ligne = m.mode === 'lire'
        ? (solution ? `${m.h} h ${String(m.m).padStart(2, '0')}` : '.......   h   .......')
        : `${m.h} h ${String(m.m).padStart(2, '0')}`;
    return `<svg class="fx-hg-svg" style="left:0; top:0; width:100%; height:100%">${d}</svg>`
        + `<div class="fx-hg-ligne" style="left:${g.x0 * k}px; top:${g.ligneY * k}px;
             width:${slot.taille * k}px; height:${g.ligneH * k}px;
             font-size:${g.ligneH * 0.44 * k}px">${echapperSheet(ligne)}</div>`;
}

// LES COULEURS DE LA PENDULE, quand la feuille s'imprime en couleur.
//
// Rémy : « si on demande le pdf en couleur, il faut un peu de couleur sur les
// pendules ». Et ce n'est pas de la décoration : la GRANDE aiguille et la
// PETITE sont exactement ce qu'un élève confond, et deux couleurs les
// séparent mieux que deux épaisseurs. Le cadran reste sobre — c'est un
// instrument de lecture, pas une affiche.
const HORLOGE_COULEUR = {
    fond: [252, 252, 255],
    cadran: [37, 99, 235],      // le cercle et les gros traits
    heures: [220, 38, 38],      // la petite aiguille, la plus lue de travers
    minutes: [22, 101, 52],     // la grande
    chiffres: [30, 41, 59]
};

function dessinerHorlogePdf(doc, item, slot, solution) {
    const g = geoHorloge(item, slot);
    const m = item.meta;
    const tracer = m.mode === 'lire' || solution;
    const a = horlogeAngles(m);
    const couleur = polycopieEnCouleur();
    const C = HORLOGE_COULEUR;

    doc.setDrawColor(...(couleur ? C.cadran : ENCRE.trait));
    doc.setFillColor(...(couleur ? C.fond : [255, 255, 255]));
    doc.setLineWidth(Math.max(0.35, g.r * 0.045));
    doc.circle(g.cx, g.cy, g.r, 'FD');

    for (let i = 0; i < 60; i++) {
        const ang = i / 60 * Math.PI * 2 - Math.PI / 2;
        const gros = i % 5 === 0;
        const r2 = g.r * 0.94, r1 = r2 - g.r * (gros ? 0.085 : 0.045);
        doc.setDrawColor(...(gros ? (couleur ? C.cadran : ENCRE.trait) : ENCRE.gris));
        doc.setLineWidth(Math.max(0.12, g.r * (gros ? 0.035 : 0.014)));
        doc.line(g.cx + Math.cos(ang) * r1, g.cy + Math.sin(ang) * r1,
            g.cx + Math.cos(ang) * r2, g.cy + Math.sin(ang) * r2);
    }
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...(couleur ? C.chiffres : ENCRE.texte));
    doc.setFontSize(Math.max(5, g.r * 0.24 * 2.6));
    for (let n = 1; n <= 12; n++) {
        const ang = n / 12 * Math.PI * 2 - Math.PI / 2;
        const rr = g.r * (m.reperes ? 0.55 : 0.74);
        doc.text(String(n), g.cx + Math.cos(ang) * rr, g.cy + Math.sin(ang) * rr + g.r * 0.08,
            { align: 'center' });
    }
    if (m.reperes) {
        doc.setFontSize(Math.max(4, g.r * 0.155 * 2.6));
        // Les repères de minutes en VERT : ce sont ceux de la grande aiguille,
        // et l'élève doit faire le lien entre les deux d'un coup d'œil.
        doc.setTextColor(...(couleur ? C.minutes : ENCRE.gris));
        for (let n = 0; n < 12; n++) {
            const ang = n / 12 * Math.PI * 2 - Math.PI / 2;
            const rr = g.r * 0.78;
            doc.text(String(n * 5), g.cx + Math.cos(ang) * rr, g.cy + Math.sin(ang) * rr + g.r * 0.05,
                { align: 'center' });
        }
    }
    if (tracer) {
        const gm = aiguilleHorloge(g, a.minutes, g.r * 0.84);
        const gh = aiguilleHorloge(g, a.heures, g.r * 0.50);
        // LE BOUT ARRONDI, dans le PDF aussi. L'aperçu arrondissait, la feuille
        // coupait net : deux dessins pour la même pendule, et c'est la feuille
        // qu'on donne aux élèves.
        if (doc.setLineCap) doc.setLineCap('round');
        doc.setDrawColor(...(couleur ? C.heures : ENCRE.trait));
        doc.setLineWidth(Math.max(0.45, g.r * 0.055));
        doc.line(g.cx, g.cy, gh.x, gh.y);
        doc.setDrawColor(...(couleur ? C.minutes : ENCRE.trait));
        doc.setLineWidth(Math.max(0.28, g.r * 0.036));
        doc.line(g.cx, g.cy, gm.x, gm.y);
        if (doc.setLineCap) doc.setLineCap('butt');
    }
    doc.setFillColor(...(couleur ? C.cadran : ENCRE.trait));
    doc.circle(g.cx, g.cy, Math.max(0.5, g.r * 0.05), 'F');

    const ligne = m.mode === 'lire'
        ? (solution ? `${m.h} h ${String(m.m).padStart(2, '0')}` : '.......   h   .......')
        : `${m.h} h ${String(m.m).padStart(2, '0')}`;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(Math.max(7, g.ligneH * 1.5));
    doc.setTextColor(...ENCRE.texte);
    doc.text(pourPdf(ligne), slot.x + slot.taille / 2, g.ligneY + g.ligneH * 0.7, { align: 'center' });
}


// --- LA PIZZERIA DES FRACTIONS ------------------------------------------------
//
// La pizza est partagée en parts égales — le PPCM des dénominateurs — et la
// commande est écrite dessous. L'élève convertit chaque fraction en NOMBRE DE
// PARTS, puis colorie.
//
// Chaque garniture a sa MARQUE (disque, carré, triangle…), pas seulement sa
// couleur : sur un polycopié en noir et blanc, deux gris voisins ne se
// distinguent pas, et l'élève doit pouvoir travailler au crayon. La marque
// figure dans la légende et, sur la page des solutions, dans chaque part.

function geoPizza(item, slot) {
    const n = item.meta.fractions.length;
    // LA COMMANDE EST À DROITE DE LA PIZZA, pas dessous. Rémy : « les fractions
    // des ingrédients à droite des pizzas ». Ce n'est pas qu'une question de
    // goût — sous le disque, chaque garniture supplémentaire rognait la hauteur
    // de la pizza, alors que c'est elle qu'on doit pouvoir colorier part par
    // part. À côté, la pizza garde toute la hauteur du bloc, et l'œil lit la
    // commande sans quitter le dessin.
    // On travaille sur la BOÎTE, pas sur le carré inscrit : un bloc « disque à
    // gauche, commande à droite » n'est pas carré, et le carré inscrit lui
    // ferait perdre la moitié de sa largeur.
    const b = slot.boite || { x: slot.x, y: slot.y, w: slot.taille, h: slot.taille };
    const listeW = Math.min(b.w * 0.42, 42);
    const cote = b.w - listeW;
    // Deux lignes par garniture : la fraction et son nom, puis la place où
    // écrire le nombre de parts.
    const hLigne = Math.min(b.h / Math.max(1, n), b.h * 0.42);
    // LE CORPS DE TEXTE SE DÉDUIT DU PLUS LONG NOM DE GARNITURE. « de sauce
    // tomate » écrit au même corps que « de olives » sortait de la colonne et
    // se faisait couper : c'est la ligne la plus longue qui fixe la taille, et
    // toutes les garnitures d'une même pizza s'écrivent pareil.
    const long = Math.max(...item.meta.fractions.map(f => `de ${f.nom}`.length), 8);
    const corps = Math.max(2.1, Math.min(hLigne * 0.22, listeW / (3.6 + long * 0.5)));
    return {
        cote, listeW, n, hLigne, corps,
        r: Math.min(cote, b.h) * 0.46,
        cx: b.x + cote / 2, cy: b.y + b.h / 2,
        x0: b.x + cote, listeY: b.y + Math.max(0, (b.h - n * hLigne) / 2)
    };
}

/** L'angle du milieu de la part `k`, pour y poser sa marque. */
const milieuPart = (k, parts) => (k + 0.5) / parts * Math.PI * 2 - Math.PI / 2;

/** À quelle garniture revient chaque part, dans l'ordre de la commande. */
function partsDeLaPizza(m) {
    const out = [];
    m.fractions.forEach((f, i) => {
        for (let k = 0; k < (m.cible[f.ingredient] || 0); k++) out.push(i);
    });
    while (out.length < m.parts) out.push(-1);      // le reste : nature
    return out.slice(0, m.parts);
}

function pizzaPreviewHtml(item, slot, k, solution) {
    const g = geoPizza(item, slot);
    const m = item.meta;
    const couleur = polycopieEnCouleur();
    const T = (v) => (v * k).toFixed(2);
    const attribution = partsDeLaPizza(m);
    let d = '';

    d += `<circle cx="${T(g.cx)}" cy="${T(g.cy)}" r="${T(g.r)}" fill="#fff"
          stroke="#1a202c" stroke-width="${T(g.r * 0.05)}"/>`;
    for (let i = 0; i < m.parts; i++) {
        const a = i / m.parts * Math.PI * 2 - Math.PI / 2;
        d += `<line x1="${T(g.cx)}" y1="${T(g.cy)}"
              x2="${T(g.cx + Math.cos(a) * g.r)}" y2="${T(g.cy + Math.sin(a) * g.r)}"
              stroke="#1a202c" stroke-width="${T(g.r * 0.022)}"/>`;
    }
    if (solution) {
        attribution.forEach((idx, i) => {
            if (idx < 0) return;
            const a = milieuPart(i, m.parts);
            const px = g.cx + Math.cos(a) * g.r * 0.62;
            const py = g.cy + Math.sin(a) * g.r * 0.62;
            const rr = Math.min(g.r * 0.2, (g.r * 2.6) / m.parts);
            d += `<circle cx="${T(px)}" cy="${T(py)}" r="${T(rr)}"
                  fill="${couleur ? teinteIngredient(m.fractions[idx].ingredient) : '#fff'}"
                  stroke="#1a202c" stroke-width="${T(rr * 0.16)}"/>`;
            d += `<svg class="fx-pz-marque" x="${T(px - rr * 0.62)}" y="${T(py - rr * 0.62)}"
                  width="${T(rr * 1.24)}" height="${T(rr * 1.24)}" viewBox="0 0 10 10">${
    marqueSvgRelier(idx, 5, 5, 3.4, { fond: couleur ? '#fff' : '#1a202c',
        trait: couleur ? '#fff' : '#1a202c', ep: 1.5 })}</svg>`;
        });
    }

    let html = `<svg class="fx-pz-svg" style="left:0; top:0; width:100%; height:100%">${d}</svg>`;
    const hLigne = g.hLigne;
    const corps = g.corps;
    m.fractions.forEach((f, i) => {
        html += `<div class="fx-pz-entree" style="left:${g.x0 * k}px;
            top:${(g.listeY + i * hLigne) * k}px; width:${g.listeW * k}px;
            height:${hLigne * k}px; font-size:${corps * k}px">
            <div class="fx-pz-ligne">
                <svg class="fx-pz-cle" width="${T(corps * 1.5)}" height="${T(corps * 1.5)}"
                     viewBox="0 0 10 10">${marqueSvgRelier(i, 5, 5, 3.6,
        { fond: couleur ? teinteIngredient(f.ingredient) : '#1a202c',
            trait: couleur ? teinteIngredient(f.ingredient) : '#1a202c', ep: 1.6 })}</svg>
                <b class="fx-frac"><span class="fx-frac-n">${f.num}</span><span class="fx-frac-d">${f.den}</span></b>
                <span>de ${echapperSheet(f.nom)}</span>
            </div>
            <div class="fx-pz-parts">${solution
        ? `= ${echapperSheet(direParts(m.cible[f.ingredient]))}` : '= ....... parts'}</div>
        </div>`;
    });
    return html;
}

const teinteIngredient = (id) => (INGREDIENTS_FICHE.find(i => i.id === id) || {}).teinte || '#64748b';

/** La même teinte, en composantes, pour jsPDF. */
const rvbIngredient = (id) => {
    const h = teinteIngredient(id);
    return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
};

/** « 1/2 » écrit en fraction, barre oblique comprise — la feuille l'accepte. */
const fractionEcrite = (num, den) => `${num}/${den}`;

/** « 1 part », « 3 parts » : un singulier fautif se remarque sur une fiche. */
const direParts = (n) => `${n} part${n > 1 ? 's' : ''}`;

function dessinerPizzaPdf(doc, item, slot, solution) {
    const g = geoPizza(item, slot);
    const m = item.meta;
    const couleur = polycopieEnCouleur();
    const attribution = partsDeLaPizza(m);

    doc.setDrawColor(...ENCRE.trait);
    doc.setFillColor(255, 255, 255);
    doc.setLineWidth(Math.max(0.4, g.r * 0.05));
    doc.circle(g.cx, g.cy, g.r, 'FD');
    doc.setLineWidth(Math.max(0.2, g.r * 0.022));
    for (let i = 0; i < m.parts; i++) {
        const a = i / m.parts * Math.PI * 2 - Math.PI / 2;
        doc.line(g.cx, g.cy, g.cx + Math.cos(a) * g.r, g.cy + Math.sin(a) * g.r);
    }
    if (solution) {
        attribution.forEach((idx, i) => {
            if (idx < 0) return;
            const a = milieuPart(i, m.parts);
            const px = g.cx + Math.cos(a) * g.r * 0.62;
            const py = g.cy + Math.sin(a) * g.r * 0.62;
            const rr = Math.min(g.r * 0.2, (g.r * 2.6) / m.parts);
            doc.setLineWidth(Math.max(0.2, rr * 0.16));
            doc.setDrawColor(...ENCRE.trait);
            doc.setFillColor(...(couleur ? rvbIngredient(m.fractions[idx].ingredient) : [255, 255, 255]));
            doc.circle(px, py, rr, 'FD');
            dessinerMarque(doc, idx, px, py, rr * 0.62,
                couleur ? [255, 255, 255] : ENCRE.trait);
        });
    }

    const hLigne = g.hLigne;
    const mm = g.corps;                    // le corps en millimètres
    const corps = mm / 0.3528;             // le même, en points, pour jsPDF
    m.fractions.forEach((f, i) => {
        const haut = g.listeY + i * hLigne;
        const y = haut + hLigne * 0.42;          // la ligne d'écriture de la fraction
        const cx = g.x0 + mm * 0.55;
        doc.setLineWidth(0.3);
        doc.setDrawColor(...ENCRE.trait);
        doc.setFillColor(...(couleur ? rvbIngredient(f.ingredient) : [255, 255, 255]));
        doc.circle(cx, y - mm * 0.2, mm * 0.42, 'FD');
        dessinerMarque(doc, i, cx, y - mm * 0.2, mm * 0.26,
            couleur ? [255, 255, 255] : ENCRE.trait);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(corps);
        doc.setTextColor(...ENCRE.texte);
        // LA FRACTION S'ÉCRIT EN COLONNE, comme partout ailleurs sur les fiches.
        const x = fractionPdf(doc, f.num, f.den, cx + mm * 0.68, y, mm);
        doc.setFont('helvetica', 'normal');
        doc.text(pourPdf(` de ${f.nom}`), x, y);
        doc.setTextColor(...ENCRE.gris);
        doc.setFont('helvetica', 'bold');
        doc.text(pourPdf(solution ? `= ${direParts(m.cible[f.ingredient])}` : '= ....... parts'),
            cx + mm * 0.68, haut + hLigne * 0.88);
    });
}

/**
 * Une fraction empilée dans le PDF : numérateur au-dessus, dénominateur en
 * dessous, et le trait POSÉ SUR LA LIGNE D'ÉCRITURE — la règle est la même que
 * sur les fiches de questions. Rend l'abscisse atteinte, pour enchaîner le
 * texte qui suit.
 */
function fractionPdf(doc, num, den, x, y, taille) {
    const n = String(num), d = String(den);
    const wn = doc.getTextWidth(n), wd = doc.getTextWidth(d);
    const w = Math.max(wn, wd) + taille * 0.26;
    doc.text(n, x + (w - wn) / 2, y - taille * 0.28);
    doc.text(d, x + (w - wd) / 2, y + taille * 0.98);
    doc.setLineWidth(Math.max(0.2, taille * 0.06));
    doc.setDrawColor(...ENCRE.texte);
    doc.line(x + taille * 0.06, y, x + w - taille * 0.06, y);
    return x + w;
}


// --- LE TABLEAU DE PROPORTIONNALITÉ --------------------------------------------
//
// Deux lignes, quelques colonnes, des cases vides : c'est l'exercice du cahier,
// et il se photocopie tel quel. Les en-têtes portent leur unité — « Prix (€) »,
// « Farine (g) » — parce qu'un tableau sans unité ne dit pas de quoi il parle,
// et que la réponse d'un problème porte toujours la sienne.
//
// LA COLONNE COMPLÈTE EST GARANTIE PAR LE NOYAU : sans elle le coefficient
// serait indéterminé et l'élève aurait tort en ayant raison. Le titre du bloc
// rappelle la situation (« l'achat de stylos ») : un tableau de nombres nus
// n'apprend pas à reconnaître une situation de proportionnalité.

function geoProportion(item, slot) {
    const m = item.meta;
    const cols = m.a.length + 1;                 // + la colonne des libellés
    const b = slot.boite;
    const enTete = Math.min(b.h * 0.28, 9);      // la phrase de situation
    const hDispo = b.h - enTete;
    const cellH = Math.min(hDispo / 2.6, 13);
    const libW = Math.min(b.w * 0.34, 42);
    const cellW = (b.w - libW) / (cols - 1);
    return { m, cols, b, enTete, cellH, libW, cellW, y0: b.y + enTete };
}

const enTeteProp = (nom, unite) => (unite ? `${nom} (${unite})` : nom);

function proportionPreviewHtml(item, slot, k, solution) {
    const g = geoProportion(item, slot);
    const m = g.m;
    const creux = (col, ligne) => m.trous.some(t => t.col === col && t.ligne === ligne);
    let html = `<div class="fx-pr-sujet" style="left:${g.b.x * k}px; top:${g.b.y * k}px;
        width:${g.b.w * k}px; height:${g.enTete * k}px;
        font-size:${Math.min(g.enTete * 0.5, 3.4) * k}px">Tableau de proportionnalité pour
        ${echapperSheet(m.contexte.sujet)}.</div>`;

    const ligne = (nom, unite, valeurs, quelle, rang) => {
        const y = g.y0 + rang * g.cellH;
        let out = `<div class="fx-pr-tete" style="left:${g.b.x * k}px; top:${y * k}px;
            width:${g.libW * k}px; height:${g.cellH * k}px;
            font-size:${Math.min(g.cellH * 0.34, 3) * k}px">${echapperSheet(enTeteProp(nom, unite))}</div>`;
        valeurs.forEach((v, i) => {
            const vide = creux(i, quelle) && !solution;
            out += `<div class="fx-pr-case${vide ? ' fx-pr-case--vide' : ''}"
                style="left:${(g.b.x + g.libW + i * g.cellW) * k}px; top:${y * k}px;
                width:${g.cellW * k}px; height:${g.cellH * k}px;
                font-size:${Math.min(g.cellH * 0.46, 4.2) * k}px">${vide ? '' : echapperSheet(ecrireProp(v))}</div>`;
        });
        return out;
    };
    html += ligne(m.contexte.a, m.contexte.uA, m.a, 'a', 0);
    html += ligne(m.contexte.b, m.contexte.uB, m.b, 'b', 1);
    return html;
}

function dessinerProportionPdf(doc, item, slot, solution, champ) {
    const g = geoProportion(item, slot);
    const m = g.m;
    const creux = (col, ligne) => m.trous.some(t => t.col === col && t.ligne === ligne);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(Math.max(6, Math.min(g.enTete * 0.85, 8)));
    doc.setTextColor(...ENCRE.gris);
    doc.text(pourPdf(`Tableau de proportionnalité pour ${m.contexte.sujet}.`),
        g.b.x, g.b.y + g.enTete * 0.72);

    const ligne = (nom, unite, valeurs, quelle, rang) => {
        const y = g.y0 + rang * g.cellH;
        doc.setDrawColor(...ENCRE.trait);
        doc.setLineWidth(0.35);
        doc.setFillColor(...ENCRE.donnee);
        doc.rect(g.b.x, y, g.libW, g.cellH, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(Math.max(5.5, Math.min(g.cellH * 0.62, 8)));
        doc.setTextColor(...ENCRE.texte);
        doc.text(pourPdf(enTeteProp(nom, unite)), g.b.x + 1.4, y + g.cellH * 0.64, {
            maxWidth: g.libW - 2.6
        });
        valeurs.forEach((v, i) => {
            const x = g.b.x + g.libW + i * g.cellW;
            const vide = creux(i, quelle) && !solution;
            doc.setFillColor(255, 255, 255);
            doc.rect(x, y, g.cellW, g.cellH, 'FD');
            if (vide) { if (champ) champ(x + 1, y + 1, g.cellW - 2, g.cellH - 2); return; }
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(Math.max(6, Math.min(g.cellH * 0.72, 11)));
            doc.setTextColor(...ENCRE.texte);
            doc.text(pourPdf(ecrireProp(v)), x + g.cellW / 2, y + g.cellH * 0.68, { align: 'center' });
        });
    };
    ligne(m.contexte.a, m.contexte.uA, m.a, 'a', 0);
    ligne(m.contexte.b, m.contexte.uB, m.b, 'b', 1);
}


// --- RELIER LES COMPLÉMENTS ----------------------------------------------------
//
// Deux colonnes de nombres, et un trait à tracer entre chaque nombre et son
// complément. La pastille au bord intérieur de chaque case dit OÙ partir et où
// arriver : sans elle, les traits partent du milieu des chiffres et la feuille
// devient illisible dès la troisième paire.

function geoPaires(item, slot) {
    const m = item.meta;
    const n = Math.max(m.gauche.length, m.droite.length);
    const b = slot.boite;
    const h = Math.min(b.h / (n + 0.6), 13);
    const largeur = Math.min(b.w * 0.3, 26);
    const y0 = b.y + (b.h - n * h) / 2;
    return {
        m, n, b, h, largeur, y0,
        xG: b.x + b.w * 0.06,
        xD: b.x + b.w * 0.94 - largeur,
        // Le point d'attache : au bord INTÉRIEUR, à mi-hauteur de la case.
        py: (i) => y0 + i * h + h / 2,
        pxG: b.x + b.w * 0.06 + largeur,
        pxD: b.x + b.w * 0.94 - largeur
    };
}

function pairesPreviewHtml(item, slot, k, solution) {
    const g = geoPaires(item, slot);
    const m = g.m;
    let html = '';
    const T = (v) => (v * k).toFixed(2);

    if (solution) {
        let d = '';
        m.lien.forEach((j, i) => {
            if (j < 0) return;
            d += `<line x1="${T(g.pxG + 1)}" y1="${T(g.py(i))}" x2="${T(g.pxD - 1)}" y2="${T(g.py(j))}"
                  stroke="#4f46e5" stroke-width="${T(0.5)}" stroke-linecap="round"/>`;
        });
        html += `<svg class="fx-pa-svg" style="left:0; top:0; width:100%; height:100%">${d}</svg>`;
    }

    const colonne = (valeurs, x, cote) => valeurs.map((v, i) => `
        <div class="fx-pa-case fx-pa-case--${cote}" style="left:${x * k}px; top:${(g.y0 + i * g.h) * k}px;
            width:${g.largeur * k}px; height:${(g.h * 0.82) * k}px;
            font-size:${Math.min(g.h * 0.5, 5) * k}px">${v}</div>
        <div class="fx-pa-point" style="left:${((cote === 'g' ? g.pxG : g.pxD) - 0.9) * k}px;
            top:${(g.py(i) - 0.9) * k}px; width:${1.8 * k}px; height:${1.8 * k}px"></div>`).join('');
    html += colonne(m.gauche, g.xG, 'g');
    html += colonne(m.droite, g.xD, 'd');
    return html;
}

function dessinerPairesPdf(doc, item, slot, solution) {
    const g = geoPaires(item, slot);
    const m = g.m;

    if (solution) {
        doc.setDrawColor(79, 70, 229);
        doc.setLineWidth(0.5);
        m.lien.forEach((j, i) => {
            if (j < 0) return;
            doc.line(g.pxG + 1, g.py(i), g.pxD - 1, g.py(j));
        });
    }

    const colonne = (valeurs, x, cote) => {
        valeurs.forEach((v, i) => {
            const y = g.y0 + i * g.h;
            doc.setDrawColor(...ENCRE.trait);
            doc.setFillColor(255, 255, 255);
            doc.setLineWidth(0.35);
            doc.roundedRect(x, y, g.largeur, g.h * 0.82, 1.2, 1.2, 'FD');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(Math.max(7, Math.min(g.h * 1.4, 13)));
            doc.setTextColor(...ENCRE.texte);
            doc.text(String(v), x + g.largeur / 2, y + g.h * 0.58, { align: 'center' });
            doc.setFillColor(...ENCRE.trait);
            doc.circle(cote === 'g' ? g.pxG : g.pxD, g.py(i), 0.7, 'F');
        });
    };
    colonne(m.gauche, g.xG, 'g');
    colonne(m.droite, g.xD, 'd');
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
    const metas = (tous && tous.length ? tous : [item]).map(it => it.meta || {});
    const hautMax = Math.max(m.l, ...metas.map(x => Number(x.l) || 0));
    const ech = Math.min(dispoW / grand, dispoH / Math.max(1, hautMax));
    const w = m.L * ech, h = m.l * ech;
    return {
        m, lignes, ligneH, w, h, b,
        // La police des cotes ne dépend plus d'un carré qui n'existe pas :
        // elle suit la hauteur du bloc, comme le reste.
        police: Math.max(2.1, Math.min(b.h * 0.075, 3.6)),
        x: b.x + coteW + (dispoW - w) / 2,
        y: b.y + (dispoH - h) / 2,
        x0: b.x, ligneY: b.y + zone
    };
}

const nomDemande = (d) => (d === 'aire' ? 'Aire' : 'Périmètre');
const uniteDemande = (d, u) => (d === 'aire' ? `${u}²` : u);

/**
 * LES FIGURES SONT EN COULEUR, ET PAS TOUTES DE LA MÊME.
 *
 * Rémy : « couleur sur le PDF, varier les couleurs dans l'exercice ». Neuf
 * rectangles noirs identiques se confondent d'une ligne à l'autre — on ne sait
 * plus quelle réponse va avec quelle figure. Et la couleur dit quelque chose :
 * le TOUR pour le périmètre, la SURFACE pour l'aire. C'est très exactement la
 * confusion qui coûte le plus de points.
 */
const TEINTES_FIGURE = [
    { trait: [37, 99, 235], fond: [219, 234, 254] },     // bleu
    { trait: [22, 163, 74], fond: [220, 252, 231] },     // vert
    { trait: [219, 39, 119], fond: [252, 231, 243] },    // rose
    { trait: [217, 119, 6], fond: [254, 243, 199] },     // ambre
    { trait: [124, 58, 237], fond: [237, 233, 254] },    // violet
    { trait: [13, 148, 136], fond: [204, 251, 241] }     // sarcelle
];
const teinteFigure = (i) => TEINTES_FIGURE[(i || 0) % TEINTES_FIGURE.length];
const rvbCss = (c) => `rgb(${c.join(',')})`;

function rectanglePreviewHtml(item, slot, k, solution, rang, tous) {
    const g = geoRectangle(item, slot, tous);
    const m = g.m;
    const T = (v) => (v * k).toFixed(2);
    // Le périmètre est un TOUR : c'est le trait qu'on colore, et l'intérieur
    // reste presque blanc. L'aire est une SURFACE : c'est elle qu'on remplit.
    const couleur = polycopieEnCouleur();
    const t = teinteFigure(rang);
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
    const t = teinteFigure(rang);
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

// --- L'ÉCHIQUIER ---------------------------------------------------------------
//
// Un échiquier est un tableau à double entrée : lettre en abscisse, chiffre en
// ordonnée. Les lettres SOUS le damier et les chiffres à GAUCHE, comme sur un
// vrai — c'est la convention, et un élève qui jouera aux échecs un jour doit
// retrouver la même.
//
// Les pièces sont des jetons portant leur initiale française (T, C, F, D, P) :
// les symboles Unicode (♞) n'existent pas dans la police du PDF, et un jeton
// blanc contre un jeton noir se photocopie, contrairement à une nuance de gris.

function geoEchiquier(item, slot) {
    const m = item.meta;
    // TOUJOURS LA MÊME HAUTEUR DE TEXTE, DONC TOUJOURS LE MÊME DAMIER.
    //
    // Le nombre de lignes suivait l'exercice : six pour « nommer », une pour
    // « placer ». Sur une même feuille, les échiquiers n'avaient donc pas la
    // même taille — celui de « placer » était le plus grand, et sa longue
    // liste de pièces sortait par le bas du bloc. Trois lignes pour tout le
    // monde : deux pour la consigne, une pour la réponse.
    const lignes = 3;
    const ligneH = slot.taille * 0.072;
    const zone = slot.taille - lignes * ligneH;
    const marge = Math.min(zone * 0.1, slot.taille * 0.09);   // les graduations
    const cote = Math.max(12, Math.min(slot.taille - marge, zone - marge));
    return {
        m, lignes, ligneH, cote, marge, cell: cote / 8,
        x0: slot.x + marge + (slot.taille - marge - cote) / 2,
        y0: slot.y + (zone - marge - cote) / 2,
        ligneY: slot.y + zone
    };
}

const caseEchiquier = (g, x, y) => ({ x: g.x0 + x * g.cell, y: g.y0 + y * g.cell });

function echiquierPreviewHtml(item, slot, k, solution) {
    const g = geoEchiquier(item, slot);
    const m = g.m;
    const T = (v) => (v * k).toFixed(2);
    // Sur « placer », le damier est vide : c'est à l'élève de le composer.
    const montrerPieces = m.quoi !== 'placer' || solution;

    let d = '';
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            const q = caseEchiquier(g, x, y);
            d += `<rect x="${T(q.x)}" y="${T(q.y)}" width="${T(g.cell)}" height="${T(g.cell)}"
                fill="${(x + y) % 2 ? '#dfe5ee' : '#ffffff'}" stroke="#9aa3b2"
                stroke-width="${T(0.14)}"/>`;
        }
    }
    d += `<rect x="${T(g.x0)}" y="${T(g.y0)}" width="${T(g.cote)}" height="${T(g.cote)}"
        fill="none" stroke="#2d3748" stroke-width="${T(0.42)}"/>`;

    // Les graduations : lettres dessous, chiffres à gauche.
    for (let i = 0; i < 8; i++) {
        d += `<text x="${T(g.x0 + (i + 0.5) * g.cell)}" y="${T(g.y0 + g.cote + g.marge * 0.55)}"
            text-anchor="middle" dominant-baseline="central"
            font-size="${T(Math.min(g.marge * 0.62, g.cell * 0.5))}" font-weight="700"
            fill="#4a5568">${'abcdefgh'[i]}</text>
            <text x="${T(g.x0 - g.marge * 0.45)}" y="${T(g.y0 + (i + 0.5) * g.cell)}"
            text-anchor="middle" dominant-baseline="central"
            font-size="${T(Math.min(g.marge * 0.62, g.cell * 0.5))}" font-weight="700"
            fill="#4a5568">${8 - i}</text>`;
    }

    // Les cases atteignables : un point sur la correction seulement.
    if (m.quoi === 'deplacements' && solution) {
        (m.cibles || []).forEach(c => {
            const q = caseEchiquier(g, c.x, c.y);
            d += `<circle cx="${T(q.x + g.cell / 2)}" cy="${T(q.y + g.cell / 2)}"
                r="${T(g.cell * 0.2)}" fill="#e11d48" opacity="0.6"/>`;
        });
    }

    if (montrerPieces) {
        // LA PIÈCE EST DESSINÉE, ET ELLE REMPLIT SA CASE. Une pastille marquée
        // « C » se traduit à chaque coup d'œil ; un cavalier se reconnaît. Et
        // elle était petite : un disque de 0,36 de côté dans une case, c'est
        // moins de la moitié de la place disponible.
        m.posees.forEach(p => {
            const q = caseEchiquier(g, p.x, p.y);
            d += pieceSvg(p.type, p.noir, (q.x + g.cell * 0.02) * k, (q.y + g.cell * 0.02) * k,
                g.cell * 0.96 * k, 0.026);
        });
    }

    let html = `<svg class="fx-ec-svg" style="left:0; top:0; width:100%; height:100%">${d}</svg>`;
    const t = texteEchiquier(m, solution);
    const police = Math.min(g.ligneH * 0.62, 3.2) * k;
    // La consigne, sur deux lignes au plus.
    html += `<div class="fx-ec-ligne fx-ec-ligne--longue"
        style="left:${slot.x * k}px; top:${g.ligneY * k}px; width:${slot.taille * k}px;
        height:${2 * g.ligneH * k}px; font-size:${police}px">${echapperSheet(t.consigne)}</div>`;
    if (t.question) {
        html += `<div class="fx-ec-ligne"
            style="left:${slot.x * k}px; top:${(g.ligneY + 2 * g.ligneH) * k}px;
            width:${slot.taille * k}px; height:${g.ligneH * k}px; font-size:${police}px;
            overflow:hidden; white-space:nowrap">
            <b>${echapperSheet(t.question)}</b>&nbsp;${solution
        ? `<span style="color:#2f855a">${echapperSheet(t.reponse)}</span>`
        : POINTILLES}</div>`;
    }
    return html;
}

/**
 * UN EXERCICE = UN DAMIER, UNE CONSIGNE, UNE LIGNE DE POINTILLÉS.
 *
 * C'est la forme d'un exercice de manuel, et c'est celle que la fiche prend
 * partout. Avant, « nommer » alignait six questions sous un damier rétréci et
 * « placer » posait une phrase à rallonge qui sortait du bloc.
 *
 * LES PIÈCES ÉTANT DESSINÉES, on ne les désigne pas par une initiale posée
 * dessus : on les NOMME. « la dame blanche » se cherche sur le damier aussi
 * vite qu'un D, et c'est du français.
 *
 * @returns {{consigne:string, question:string, reponse:string}}
 *          `question` vide = pas de ligne à remplir (« placer » se fait sur le
 *          damier lui-même), mais la place reste prise pour que tous les blocs
 *          gardent la même taille.
 */
function texteEchiquier(m, solution) {
    if (m.quoi === 'nommer') {
        // UNE SEULE PIÈCE EST DEMANDÉE, les autres sont là pour qu'il faille
        // la chercher. Six questions sur un damier de quatre centimètres ne
        // laissaient de place ni pour écrire ni pour regarder.
        const p = m.posees[0];
        const nom = direPiece(p.type, p.noir);
        return {
            consigne: `Sur quelle case se trouve ${nom} ?`,
            question: 'Réponse :',
            reponse: p.case
        };
    }
    // UN DIAGRAMME COMPOSÉ À LA MAIN. L'atelier ne pose pas de question : le
    // professeur écrit la sienne sous le damier, ou n'en écrit aucune — c'est
    // sa feuille. On garde la LIGNE de réponse même quand la légende est vide,
    // pour que tous les blocs d'une même page fassent la même taille.
    if (m.quoi === 'atelier') {
        return { consigne: m.consigne || '', question: m.question || '', reponse: '' };
    }
    if (m.quoi === 'placer') {
        // LE MODE D'EMPLOI EST EN HAUT DE LA FEUILLE, pas répété dans chaque
        // bloc : la phrase « dessine une croix et écris l'initiale » mangeait
        // une ligne sur deux, et la liste des pièces sortait du cadre.
        return {
            consigne: `À placer : ${m.posees.map(p =>
                `${direPiece(p.type, p.noir)} en ${p.case}`).join(', ')}.`,
            question: '', reponse: ''
        };
    }
    const quelle = m.nom === 'tour' || m.nom === 'dame' ? `la ${m.nom}` : `le ${m.nom}`;
    return {
        consigne: `Marque d'une croix toutes les cases où ${quelle} peut aller.`,
        question: 'Combien de cases en tout ?',
        // Le compte, pas la liste : « 14 cases : a4, b4, c4… » ne tenait pas
        // sur une ligne, et personne ne recopie quatorze cases.
        reponse: `${m.noms.length} cases`
    };
}

// Assez de points pour atteindre le bord du bloc quelle que soit la question ;
// le débordement est coupé. Une longueur fixe laissait un blanc à droite, et
// l'élève finit toujours par écrire dans ce blanc.
const POINTILLES = '.'.repeat(120);

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
        const l = 2.6 * g.echelle;
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
        const l = 2.6 * g.echelle;
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

function geoMat(item, slot) {
    const ligneH = slot.taille * 0.085;
    const zone = slot.taille - ligneH;
    const marge = Math.min(zone * 0.09, slot.taille * 0.08);
    const cote = Math.max(12, Math.min(slot.taille - marge, zone - marge));
    return {
        m: item.meta, ligneH, cote, marge, cell: cote / 8,
        x0: slot.x + marge + (slot.taille - marge - cote) / 2,
        y0: slot.y + (zone - marge - cote) / 2,
        ligneY: slot.y + zone
    };
}

function matPreviewHtml(item, slot, k, solution) {
    const g = geoMat(item, slot);
    const T = (v) => (v * k).toFixed(2);
    let d = '';
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            d += `<rect x="${T(g.x0 + x * g.cell)}" y="${T(g.y0 + y * g.cell)}"
                width="${T(g.cell)}" height="${T(g.cell)}"
                fill="${(x + y) % 2 ? '#dfe5ee' : '#ffffff'}" stroke="#9aa3b2"
                stroke-width="${T(0.12)}"/>`;
        }
    }
    d += `<rect x="${T(g.x0)}" y="${T(g.y0)}" width="${T(g.cote)}" height="${T(g.cote)}"
        fill="none" stroke="#2d3748" stroke-width="${T(0.42)}"/>`;
    for (let i = 0; i < 8; i++) {
        const taille = T(Math.min(g.marge * 0.62, g.cell * 0.5));
        d += `<text x="${T(g.x0 + (i + 0.5) * g.cell)}" y="${T(g.y0 + g.cote + g.marge * 0.55)}"
            text-anchor="middle" dominant-baseline="central" font-size="${taille}"
            font-weight="700" fill="#4a5568">${'abcdefgh'[i]}</text>
            <text x="${T(g.x0 - g.marge * 0.45)}" y="${T(g.y0 + (i + 0.5) * g.cell)}"
            text-anchor="middle" dominant-baseline="central" font-size="${taille}"
            font-weight="700" fill="#4a5568">${8 - i}</text>`;
    }
    (g.m.pieces || []).forEach(p => {
        d += pieceSvg(p.type, p.noir, (g.x0 + p.x * g.cell) * k, (g.y0 + p.y * g.cell) * k,
            g.cell * k, 0.03);
    });

    // EN COMBIEN DE COUPS ? Rémy : « comment on sait en combien de coups il
    // faut faire mat ? ». C'était écrit en tête de feuille, d'après le PREMIER
    // problème — donc faux dès qu'une feuille mêle des mats en un et des mats
    // en deux, et de toute façon loin du diagramme qu'on regarde. Chaque
    // problème porte maintenant le sien.
    const enCombien = `Mat en ${g.m.coups || 1}`;
    const texte = solution
        ? `${enCombien} — solution : ${g.m.solution}`
        : `${enCombien} — coup des Blancs : ...................`;
    let html = `<svg class="fx-ec-svg" style="left:0; top:0; width:100%; height:100%">${d}</svg>`;
    html += `<div class="fx-ec-ligne" style="left:${slot.x * k}px; top:${g.ligneY * k}px;
        width:${slot.taille * k}px; height:${g.ligneH * k}px;
        font-size:${Math.min(g.ligneH * 0.55, 3.4) * k}px">${echapperSheet(texte)}</div>`;
    return html;
}

function dessinerMatPdf(doc, item, slot, solution) {
    const g = geoMat(item, slot);
    doc.setDrawColor(154, 163, 178);
    doc.setLineWidth(0.12);
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            // Le remplissage est redit à chaque case : dans jsPDF, écrire du
            // texte change la couleur de remplissage.
            if ((x + y) % 2) doc.setFillColor(223, 229, 238);
            else doc.setFillColor(255, 255, 255);
            doc.rect(g.x0 + x * g.cell, g.y0 + y * g.cell, g.cell, g.cell, 'FD');
        }
    }
    doc.setDrawColor(...ENCRE.trait);
    doc.setLineWidth(0.42);
    doc.rect(g.x0, g.y0, g.cote, g.cote, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(Math.max(5, Math.min(g.cell * 1.3, 9)));
    doc.setTextColor(74, 85, 104);
    for (let i = 0; i < 8; i++) {
        doc.text('abcdefgh'[i], g.x0 + (i + 0.5) * g.cell, g.y0 + g.cote + g.marge * 0.7,
            { align: 'center' });
        doc.text(String(8 - i), g.x0 - g.marge * 0.45, g.y0 + (i + 0.6) * g.cell,
            { align: 'center' });
    }

    (item.meta.pieces || []).forEach(p => {
        dessinerPiecePdf(doc, p.type, p.noir, g.x0 + p.x * g.cell, g.y0 + p.y * g.cell,
            g.cell, Math.max(0.12, g.cell * 0.035));
    });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(Math.max(6, Math.min(g.ligneH * 0.55, 9)));
    doc.setTextColor(...ENCRE.trait);
    const enCombien = `Mat en ${item.meta.coups || 1}`;
    doc.text(pourPdf(solution
        ? `${enCombien} — solution : ${item.meta.solution}`
        : `${enCombien} — coup des Blancs : ...................`),
    slot.x, g.ligneY + g.ligneH * 0.62);
}

function dessinerEchiquierPdf(doc, item, slot, solution) {
    const g = geoEchiquier(item, slot);
    const m = g.m;
    const montrerPieces = m.quoi !== 'placer' || solution;

    doc.setDrawColor(154, 163, 178);
    doc.setLineWidth(0.14);
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            const q = caseEchiquier(g, x, y);
            // Le remplissage est redit à chaque case : dans jsPDF, écrire du
            // texte change la couleur de remplissage.
            if ((x + y) % 2) doc.setFillColor(223, 229, 238);
            else doc.setFillColor(255, 255, 255);
            doc.rect(q.x, q.y, g.cell, g.cell, 'FD');
        }
    }
    doc.setDrawColor(...ENCRE.trait);
    doc.setLineWidth(0.42);
    doc.rect(g.x0, g.y0, g.cote, g.cote, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(Math.max(5, Math.min(g.cell * 1.3, 9)));
    doc.setTextColor(74, 85, 104);
    for (let i = 0; i < 8; i++) {
        doc.text('abcdefgh'[i], g.x0 + (i + 0.5) * g.cell, g.y0 + g.cote + g.marge * 0.7,
            { align: 'center' });
        doc.text(String(8 - i), g.x0 - g.marge * 0.45, g.y0 + (i + 0.6) * g.cell,
            { align: 'center' });
    }

    if (m.quoi === 'deplacements' && solution) {
        doc.setFillColor(244, 150, 172);
        (m.cibles || []).forEach(c => {
            const q = caseEchiquier(g, c.x, c.y);
            doc.circle(q.x + g.cell / 2, q.y + g.cell / 2, g.cell * 0.2, 'F');
        });
    }

    if (montrerPieces) {
        m.posees.forEach(p => {
            const q = caseEchiquier(g, p.x, p.y);
            dessinerPiecePdf(doc, p.type, p.noir, q.x + g.cell * 0.02, q.y + g.cell * 0.02,
                g.cell * 0.96, Math.max(0.1, g.cell * 0.026));
        });
    }

    const t = texteEchiquier(m, solution);
    const police = Math.max(6, Math.min(g.ligneH * 1.5, 9));
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(police);
    doc.setTextColor(...ENCRE.texte);
    // La consigne, deux lignes au plus : au-delà elle mordrait sur la ligne
    // de réponse, et c'est justement ce qui débordait avant.
    doc.splitTextToSize(pourPdf(t.consigne), slot.taille).slice(0, 2).forEach((part, j) => {
        doc.text(part, slot.x, g.ligneY + g.ligneH * 0.72 + j * g.ligneH * 0.86);
    });
    if (!t.question) return;

    const y = g.ligneY + 2 * g.ligneH + g.ligneH * 0.78;
    doc.setFont('helvetica', 'bold');
    const etiquette = pourPdf(`${t.question} `);
    doc.text(etiquette, slot.x, y);
    const x = slot.x + doc.getTextWidth(etiquette);
    if (solution) {
        doc.setTextColor(47, 133, 90);
        doc.text(pourPdf(t.reponse), x, y);
        return;
    }
    // LA LIGNE DE POINTILLÉS VA JUSQU'AU BORD DU BLOC. Une longueur fixe
    // laissait un blanc à droite, et l'élève écrivait dans la marge.
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...ENCRE.gris);
    const large = slot.x + slot.taille - x;
    const unPoint = doc.getTextWidth('.');
    doc.text('.'.repeat(Math.max(4, Math.floor(large / unPoint))), x, y);
}

// --- LE CHAT GÉOMÈTRE ----------------------------------------------------------
//
// Le programme à gauche, le quadrillage à droite. Un carreau vaut dix pas de
// chat : c'est ce qui permet de compter les côtés au lieu de les mesurer, et
// c'est pour cela que les figures n'avancent que par multiples de dix.
//
// Le chat de départ est un triangle posé sur le quadrillage, la pointe dans la
// direction où il regarde. Sans lui, « avancer de 40 » n'a pas d'origine.

function geoChat(item, slot) {
    const m = item.meta;
    const b = slot.boite;
    const ligneH = b.h * 0.1;
    const zone = b.h - ligneH;
    const progW = Math.max(42, Math.min(b.w * 0.42, 84));
    const cote = Math.max(20, Math.min(b.w - progW - 5, zone));
    return {
        m, b, cote, progW, ligneH,
        pas: cote / m.cases,
        x0: b.x + progW + 5, y0: b.y + (zone - cote) / 2,
        ligneY: b.y + zone
    };
}

/**
 * DE VRAIS BLOCS SCRATCH, pas des lignes de texte indentées.
 *
 * L'élève a le logiciel sous les yeux : des briques bleues « avancer de 50 pas »
 * empilées dans une brique jaune « répéter 4 fois » qui les enveloppe en C.
 * Recopier cela en texte indenté, c'est déjà une TRADUCTION — et la première
 * difficulté devient de retrouver le programme derrière le texte, alors que
 * l'exercice porte sur la figure.
 *
 * Les couleurs sont celles de Scratch 3 : Mouvement #4C97FF, Contrôle #FFAB19.
 * Elles restent lisibles en noir et blanc — le bleu tombe en gris moyen, le
 * jaune en gris clair —, et le texte est écrit en blanc sur le premier, en
 * noir sur le second, comme dans le logiciel.
 */
/**
 * LA VERSION NOIR ET BLANC DES BLOCS.
 *
 * Un bloc Scratch est un APLAT SATURÉ avec du texte blanc dessus. Passé à la
 * moulinette du mode « photocopie » — qui retranche la saturation, voir
 * `ui/ficheRendu.js` —, le bleu #4C97FF devient un gris très sombre : la brique
 * sort en noir et le texte blanc dessus est illisible. C'est la pire des
 * combinaisons sur une photocopieuse fatiguée, et c'est exactement ce qu'un
 * professeur imprime.
 *
 * En noir et blanc, on RENVERSE donc : fond blanc, contour noir, texte noir.
 * Ce sont alors les FORMES qui distinguent les familles — le chapeau arrondi de
 * l'événement, le C du contrôle —, comme dans un manuel imprimé.
 */
const BLOC_SCRATCH_NB = {
    mouvement: { fond: [255, 255, 255], bord: [40, 48, 62], encre: [26, 32, 44] },
    controle: { fond: [244, 246, 250], bord: [40, 48, 62], encre: [26, 32, 44] },
    evenement: { fond: [232, 236, 243], bord: [40, 48, 62], encre: [26, 32, 44] }
};

/** Les couleurs d'un genre de bloc, selon ce qui sortira de l'imprimante. */
const couleurBloc = (genre) => {
    const table = polycopieEnCouleur() ? BLOC_SCRATCH : BLOC_SCRATCH_NB;
    return table[genre] || table.mouvement;
};

const BLOC_SCRATCH = {
    mouvement: { fond: [76, 151, 255], bord: [60, 120, 210], encre: [255, 255, 255] },
    controle: { fond: [255, 171, 25], bord: [207, 139, 23], encre: [40, 30, 0] },
    // Le chapeau « quand ⚑ est cliqué » : c'est la famille Événements, un
    // jaune plus chaud que le Contrôle. Sans lui en tête, la pile de la feuille
    // n'est pas un programme Scratch — c'est une liste de briques.
    evenement: { fond: [255, 191, 0], bord: [207, 155, 0], encre: [40, 30, 0] }
};

/**
 * LA PILE DE BLOCS, EN UNITÉS D'ATELIER.
 *
 * Toute la forme vient de core/blocScratch.js — le même module que l'écran.
 * Ici on ne décide que de deux choses : COMBIEN de millimètres vaut une unité
 * d'atelier (`u`), et OÙ tombe chaque bloc de la pile. Le reste — tenon,
 * mortaise, coins, gélules — est commun aux trois rendus.
 *
 * Les blocs s'emboîtent, donc ils SE TOUCHENT : un bloc simple fait exactement
 * `U.ligne` de haut et le suivant commence là où il finit. C'est ce qui
 * manquait à l'ancienne pile, où un écart séparait deux briques censées être
 * accrochées l'une à l'autre.
 */
function geoBlocsChat(g) {
    // Le chapeau en tête, puis une ligne par bloc — sauf les barres de
    // fermeture, qui sont dessinées AVEC leur C et ne prennent pas de rang.
    const lignes = g.m.lignes;
    const hautTotale = UBLOC.chapeau + lignes.reduce(
        (n, l) => n + (l.fin ? UBLOC.basBoucle : UBLOC.ligne), 0);
    // UN « RÉPÉTER » EST AU MOINS AUSSI LARGE QUE CE QU'IL ENVELOPPE. Sans
    // cela, les briques bleues dépassaient du C par la droite : on voyait des
    // blocs posés SUR une brique jaune, pas dedans. On élargit donc de la fin
    // vers le début, pour qu'un C imbriqué soit déjà à sa taille définitive
    // quand celui qui le contient se mesure.
    const w = lignes.map(largeurBlocChat);
    for (let i = lignes.length - 1; i >= 0; i--) {
        if (lignes[i].fin || lignes[i].genre !== 'controle') continue;
        const j = lignes.findIndex((z, n) => n > i && z.fin && z.creux === lignes[i].creux);
        const fin = j < 0 ? lignes.length : j;
        for (let n = i + 1; n < fin; n++) {
            w[i] = Math.max(w[i], (lignes[n].creux - lignes[i].creux) * UBLOC.retrait + w[n]);
        }
    }
    // La pile tient dans la hauteur du quadrillage ET dans sa colonne : c'est
    // la plus contraignante des deux qui décide.
    const largeurUnites = Math.max(
        ...lignes.map((l, i) => l.creux * UBLOC.retrait + w[i]), 132);
    const u = Math.min(g.cote / hautTotale, g.progW / largeurUnites);
    // Les rangs, en unités : chaque bloc sait où il commence et ce qu'il ferme.
    const y = [];
    let curseur = UBLOC.chapeau;
    lignes.forEach((l) => { y.push(curseur); curseur += l.fin ? UBLOC.basBoucle : UBLOC.ligne; });
    return { lignes, u, y, w, hautTotale, largeurUnites, x: g.b.x, y0: g.y0 };
}

/** La largeur d'un bloc, en unités d'atelier : son texte et sa gélule. */
function largeurBlocChat(l) {
    if (l.fin) return 0;
    const morceaux = l.valeur === undefined
        ? largeurTexteBloc(l.texte)
        : largeurTexteBloc(l.avant) + largeurChamp(l.valeur) + largeurTexteBloc(l.apres) + 14;
    return Math.max(l.genre === 'controle' ? 132 : 108, UBLOC.margeG * 2 + morceaux);
}

/**
 * Où tombe chaque morceau d'un bloc : le texte d'avant, la gélule, le texte
 * d'après. En unités d'atelier, à partir du bord gauche du bloc.
 */
function morceauxBlocChat(l) {
    const out = [];
    let x = UBLOC.margeG;
    const poser = (t) => {
        if (!t) return;
        // LE DRAPEAU VERT N'EST PAS UNE LETTRE. Le caractère ⚑ n'existe pas
        // dans les polices d'un PDF : le bloc s'y écrivait « quand le drapeau
        // est cliqué » pendant que l'aperçu montrait l'icône — deux feuilles
        // différentes pour le même bloc. On le sort donc du texte, et chaque
        // rendu le DESSINE : un fanion, comme dans le logiciel.
        for (const bout of String(t).split('⚑')) {
            if (bout) {
                out.push({ texte: bout, x });
                x += largeurTexteBloc(bout) + 7;
            }
            out.push({ drapeau: true, x, w: 12 });
            x += 12 + 7;
        }
        out.pop();                        // un séparateur de trop, en fin de liste
        x -= 19;
    };
    if (l.valeur === undefined) { poser(l.texte); return { morceaux: out, fin: x }; }
    poser(l.avant.replace(/ $/, ''));
    const w = largeurChamp(l.valeur);
    out.push({ champ: String(l.valeur), x, w, h: UBLOC.champH });
    x += w + 7;
    poser(l.apres.replace(/^ /, ''));
    return { morceaux: out, fin: x };
}

/** La hauteur qu'enveloppe un « répéter », en unités : de sa bouche à sa barre. */
function boucheDe(bl, i) {
    const j = bl.lignes.findIndex((z, n) => n > i && z.fin && z.creux === bl.lignes[i].creux);
    const fin = j < 0 ? bl.hautTotale : bl.y[j];
    return Math.max(UBLOC.boucheVide, fin - bl.y[i] - UBLOC.ligne);
}

/** Un point du chat (en pas) vers le papier (en millimètres). */
/**
 * L'ORIGINE TOMBE SUR UNE INTERSECTION DU QUADRILLAGE.
 *
 * Rémy : « pour les figures de scratch pour le pdf, la figure que tu dessines
 * ne va pas tout à fait sur les lignes qui créent les carreaux. »
 *
 * Le tracé était centré sur `cote / 2`, le milieu géométrique du carré. Or les
 * lignes du quadrillage sont en `i × pas` : le milieu n'en est une que si le
 * nombre de carreaux est PAIR. Sur une grille impaire — onze carreaux, treize
 * carreaux — toute la figure se retrouvait décalée d'un demi-carreau, donc
 * AUCUN sommet ne tombait sur une intersection, et l'élève qui compte les
 * carreaux pour vérifier son tracé ne retrouvait jamais ses comptes.
 *
 * On arrondit donc l'origine à l'intersection la plus proche. Un carreau valant
 * dix pas (c'est la consigne de la feuille), tout déplacement multiple de dix
 * retombe alors exactement sur une ligne.
 */
function pointChat(g, p) {
    const centre = Math.round(g.m.cases / 2) * g.pas;
    return {
        x: g.x0 + centre + (p.x / 10) * g.pas,
        // L'axe du chat monte, celui du papier descend : on retourne.
        y: g.y0 + centre - (p.y / 10) * g.pas
    };
}

/** Les trois sommets du petit chat de départ, en millimètres. */
function trianguleChat(g) {
    const c = pointChat(g, g.m.depart);
    const rad = (g.m.depart.dir || 90) * Math.PI / 180;
    const r = g.pas * 0.42;
    const bout = { x: c.x + Math.sin(rad) * r, y: c.y - Math.cos(rad) * r };
    const cote = (s) => ({
        x: c.x + Math.sin(rad + s) * r * 0.72,
        y: c.y - Math.cos(rad + s) * r * 0.72
    });
    return [bout, cote(2.4), cote(-2.4)];
}

function chatPreviewHtml(item, slot, k, solution) {
    const g = geoChat(item, slot);
    const m = g.m;
    const T = (v) => (v * k).toFixed(2);
    // Le tracé est visible d'emblée quand c'est l'angle qu'on cherche : la
    // figure est alors une DONNÉE, pas la réponse.
    const montrer = solution || m.quoi === 'angle';

    let d = '';
    for (let i = 0; i <= m.cases; i++) {
        const p = i * g.pas;
        d += `<line x1="${T(g.x0)}" y1="${T(g.y0 + p)}" x2="${T(g.x0 + g.cote)}" y2="${T(g.y0 + p)}"
            stroke="#c9cfda" stroke-width="${T(0.18)}"/>
            <line x1="${T(g.x0 + p)}" y1="${T(g.y0)}" x2="${T(g.x0 + p)}" y2="${T(g.y0 + g.cote)}"
            stroke="#c9cfda" stroke-width="${T(0.18)}"/>`;
    }
    d += `<rect x="${T(g.x0)}" y="${T(g.y0)}" width="${T(g.cote)}" height="${T(g.cote)}"
        fill="none" stroke="#8a93a3" stroke-width="${T(0.34)}"/>`;

    if (montrer) {
        m.traces.forEach(trait => {
            if (trait.length < 2) return;
            const pts = trait.map(p => { const q = pointChat(g, p); return `${T(q.x)},${T(q.y)}`; });
            d += `<polyline points="${pts.join(' ')}" fill="none" stroke="#1a202c"
                stroke-width="${T(0.55)}" stroke-linejoin="round" stroke-linecap="round"/>`;
        });
    }
    const t = trianguleChat(g);
    d += `<polygon points="${t.map(p => `${T(p.x)},${T(p.y)}`).join(' ')}"
        fill="#e11d48" opacity="0.85"/>`;

    // LE PROGRAMME, EN BLOCS — les mêmes qu'à l'écran, tracés par le même
    // module. Le chapeau en tête, les briques emboîtées dessous, et le
    // « répéter » qui les enveloppe dans son C.
    const bl = geoBlocsChat(g);
    const mm = (v) => v * bl.u;                       // unités d'atelier → mm
    let textes = '';
    const poserContenu = (l, bx, by) => {
        const c = couleurBloc(l.genre);
        const { morceaux } = morceauxBlocChat(l);
        const milieu = l.genre === 'evenement'
            ? UBLOC.dome + (UBLOC.chapeau - UBLOC.dome) / 2
            : UBLOC.ligne / 2;
        morceaux.forEach((mo) => {
            if (mo.drapeau) {
                textes += `<div class="fx-ch-bloc fx-ch-drapeau" style="left:${(bx + mm(mo.x)) * k}px;
                    top:${(by + mm(milieu - UBLOC.ligne / 2)) * k}px; height:${mm(UBLOC.ligne) * k}px;
                    font-size:${mm(UBLOC.texte) * k}px">&#9873;</div>`;
                return;
            }
            if (mo.champ !== undefined) {
                d += `<path d="${blocVersSvg(gelule(mo.w, mo.h),
                    { x: (bx + mm(mo.x)) * k, y: (by + mm(milieu - mo.h / 2)) * k, u: mm(k) })}"
                    fill="#fff"/>`;
                textes += `<div class="fx-ch-champ" style="left:${(bx + mm(mo.x)) * k}px;
                    top:${(by + mm(milieu - mo.h / 2)) * k}px; width:${mm(mo.w) * k}px;
                    height:${mm(mo.h) * k}px;
                    font-size:${mm(UBLOC.texte) * k}px">${echapperSheet(mo.champ)}</div>`;
                return;
            }
            textes += `<div class="fx-ch-bloc" style="left:${(bx + mm(mo.x)) * k}px;
                top:${(by + mm(milieu - UBLOC.ligne / 2)) * k}px; height:${mm(UBLOC.ligne) * k}px;
                color:rgb(${c.encre.join(',')});
                font-size:${mm(UBLOC.texte) * k}px">${echapperSheet(mo.texte)}</div>`;
        });
    };
    const chapeau = { genre: 'evenement', texte: 'quand ⚑ est cliqué', creux: 0 };
    const pile = [{ l: chapeau, y: 0, forme: silhouette({ genre: 'chapeau', largeur: largeurBlocChat(chapeau) }) }];
    bl.lignes.forEach((l, i) => {
        if (l.fin) return;                 // la barre du bas est tracée avec son C
        pile.push({
            l, y: bl.y[i],
            forme: silhouette({
                genre: l.genre === 'controle' ? 'boucle' : 'simple',
                largeur: bl.w[i],
                bouche: l.genre === 'controle' ? boucheDe(bl, i) : undefined
            })
        });
    });
    pile.forEach(({ l, y: yu, forme }) => {
        const c = couleurBloc(l.genre);
        const bx = bl.x + mm(l.creux * UBLOC.retrait), by = bl.y0 + mm(yu);
        d += `<path d="${blocVersSvg(forme, { x: bx * k, y: by * k, u: mm(k) })}"
            fill="rgb(${c.fond.join(',')})" stroke="rgb(${c.bord.join(',')})"
            stroke-width="${T(0.15)}" stroke-linejoin="round"/>`;
        poserContenu(l, bx, by);
    });

    let html = `<svg class="fx-ch-svg" style="left:0; top:0; width:100%; height:100%">${d}</svg>${textes}`;

    const rep = m.quoi === 'angle'
        ? [`L'angle vaut`, solution ? `${m.angle}°` : '……… °']
        : ['La figure obtenue est', solution ? m.nom : '..................'];
    html += `<div class="fx-ch-ligne" style="left:${g.b.x * k}px; top:${g.ligneY * k}px;
        width:${g.b.w * k}px; height:${g.ligneH * k}px;
        font-size:${Math.min(g.ligneH * 0.42, 3.6) * k}px">
        <b>${rep[0]}</b><i>${echapperSheet(rep[1])}</i></div>`;
    return html;
}

function dessinerChatPdf(doc, item, slot, solution, champ) {
    const g = geoChat(item, slot);
    const m = g.m;
    const montrer = solution || m.quoi === 'angle';

    doc.setDrawColor(201, 207, 218);
    doc.setLineWidth(0.18);
    for (let i = 0; i <= m.cases; i++) {
        const p = i * g.pas;
        doc.line(g.x0, g.y0 + p, g.x0 + g.cote, g.y0 + p);
        doc.line(g.x0 + p, g.y0, g.x0 + p, g.y0 + g.cote);
    }
    doc.setDrawColor(138, 147, 163);
    doc.setLineWidth(0.34);
    doc.rect(g.x0, g.y0, g.cote, g.cote, 'S');

    if (montrer) {
        doc.setDrawColor(...ENCRE.trait);
        doc.setLineWidth(0.55);
        m.traces.forEach(trait => {
            for (let i = 1; i < trait.length; i++) {
                const a = pointChat(g, trait[i - 1]), z = pointChat(g, trait[i]);
                doc.line(a.x, a.y, z.x, z.y);
            }
        });
    }
    const t = trianguleChat(g);
    doc.setFillColor(225, 29, 72);
    doc.triangle(t[0].x, t[0].y, t[1].x, t[1].y, t[2].x, t[2].y, 'F');

    // LE PROGRAMME, EN BLOCS — les mêmes qu'à l'écran, tracés par le même
    // module (core/blocScratch.js) : c'est tout l'intérêt.
    const bl = geoBlocsChat(g);
    const mm = (v) => v * bl.u;
    const chapeau = { genre: 'evenement', texte: 'quand ⚑ est cliqué', creux: 0 };
    const pile = [{ l: chapeau, y: 0, forme: silhouette({ genre: 'chapeau', largeur: largeurBlocChat(chapeau) }) }];
    bl.lignes.forEach((l, i) => {
        if (l.fin) return;               // la barre du bas est tracée avec son C
        pile.push({
            l, y: bl.y[i],
            forme: silhouette({
                genre: l.genre === 'controle' ? 'boucle' : 'simple',
                largeur: bl.w[i],
                bouche: l.genre === 'controle' ? boucheDe(bl, i) : undefined
            })
        });
    });
    pile.forEach(({ l, y: yu, forme }) => {
        const c = couleurBloc(l.genre);
        const bx = bl.x + mm(l.creux * UBLOC.retrait), by = bl.y0 + mm(yu);
        const t = blocVersPdf(forme, { x: bx, y: by, u: bl.u });
        doc.setFillColor(...c.fond);
        doc.setDrawColor(...c.bord);
        doc.setLineWidth(0.15);
        doc.lines(t.suite, t.x, t.y, [1, 1], 'FD', true);

        const { morceaux } = morceauxBlocChat(l);
        const milieu = l.genre === 'evenement'
            ? UBLOC.dome + (UBLOC.chapeau - UBLOC.dome) / 2
            : UBLOC.ligne / 2;
        doc.setFont('helvetica', 'bold');
        // 1 pt ≈ 0,3528 mm : le corps est donné en millimètres, comme le reste
        // du bloc, pour que l'aperçu et la feuille soient identiques.
        doc.setFontSize(mm(UBLOC.texte) / 0.3528);
        morceaux.forEach((mo) => {
            if (mo.drapeau) {
                // Le fanion : une hampe et un triangle vert, comme le bouton
                // « lancer » du logiciel.
                const fx = bx + mm(mo.x), fy = by + mm(milieu), t = mm(UBLOC.texte);
                doc.setDrawColor(60, 120, 60);
                doc.setLineWidth(t * 0.09);
                doc.line(fx, fy - t * 0.5, fx, fy + t * 0.45);
                doc.setFillColor(60, 160, 90);
                doc.triangle(fx, fy - t * 0.5, fx + t * 0.62, fy - t * 0.24,
                    fx, fy + t * 0.02, 'F');
                return;
            }
            if (mo.champ !== undefined) {
                // LA GÉLULE BLANCHE DU NOMBRE : c'est elle qui dit « ce nombre
                // se change », et c'est la première chose qu'on reconnaît d'un
                // bloc Scratch. Le PDF l'ignorait.
                const gx = bx + mm(mo.x), gy = by + mm(milieu - mo.h / 2);
                const gp = blocVersPdf(gelule(mo.w, mo.h), { x: gx, y: gy, u: bl.u });
                doc.setFillColor(255, 255, 255);
                doc.lines(gp.suite, gp.x, gp.y, [1, 1], 'F', true);
                doc.setTextColor(30, 41, 59);
                doc.text(pourPdf(mo.champ), gx + mm(mo.w) / 2, gy + mm(mo.h) * 0.7,
                    { align: 'center' });
                return;
            }
            doc.setTextColor(...c.encre);
            doc.text(pourPdf(mo.texte), bx + mm(mo.x), by + mm(milieu + UBLOC.texte * 0.36));
        });
    });

    const yl = g.ligneY + g.ligneH * 0.66;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(Math.max(6.5, Math.min(g.ligneH * 1.2, 10)));
    // ON REDIT L'ENCRE : le dernier bloc du programme vient de la passer en
    // blanc, et la question s'imprimait en blanc sur blanc.
    doc.setTextColor(...ENCRE.texte);
    const etiquette = pourPdf(m.quoi === 'angle' ? 'L\'angle vaut' : 'La figure obtenue est');
    doc.text(etiquette, g.b.x, yl);
    const xr = g.b.x + doc.getTextWidth(etiquette) + 3;
    if (solution) {
        doc.text(pourPdf(m.quoi === 'angle' ? `${m.angle}°` : m.nom), xr, yl);
        return;
    }
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...ENCRE.gris);
    doc.text(m.quoi === 'angle' ? pourPdf('......... °') : '..................', xr, yl);
    if (champ) champ(xr, yl - g.ligneH * 0.55, g.b.x + g.b.w - xr, g.ligneH * 0.8);
}

// --- LE TABLEUR ----------------------------------------------------------------
//
// Une grille de tableur, avec sa barre de lettres en haut et sa colonne de
// numéros à gauche : c'est ce liseré gris qui fait reconnaître un tableur, et
// c'est aussi lui qui porte tout le repérage.
//
// Trois exercices sur le même dessin — nommer la zone coloriée, colorier la
// zone nommée, écrire la formule sous une colonne de nombres — et une seule
// géométrie, parce que ce sont les mêmes cases.

function geoTableur(item, slot) {
    const m = item.meta;
    const formule = m.quoi === 'formule';
    // Le tableau de la formule : deux colonnes (libellé, nombre) et une ligne
    // de plus que les données — celle qui reçoit la formule.
    const cols = formule ? 2 : m.cols;
    const rows = formule ? m.derniere + 1 : m.rows;
    const lignes = formule ? 2 : 1;                  // la place pour répondre
    const ligneH = slot.taille * 0.115;
    const zone = slot.taille - lignes * ligneH;

    // L'en-tête (les lettres) et la gouttière (les numéros) sont plus minces
    // qu'une case : sur un vrai tableur aussi.
    const cellW = Math.min(slot.taille * 0.9 / (cols + 0.55), formule ? slot.taille * 0.42 : 99);
    const enTeteH = Math.min(zone / (rows + 1.4), cellW * 0.62);
    const cellH = Math.min((zone - enTeteH) / rows, cellW * 0.68);
    const gouttiereW = cellW * 0.55;
    const largeur = gouttiereW + cols * cellW;
    const hauteur = enTeteH + rows * cellH;
    return {
        m, formule, cols, rows, cellW, cellH, enTeteH, gouttiereW, largeur, hauteur, ligneH,
        x0: slot.x + (slot.taille - largeur) / 2,
        y0: slot.y + (zone - hauteur) / 2,
        ligneY: slot.y + zone
    };
}

/** Le coin haut-gauche d'une case, en millimètres. */
const caseTableur = (g, c, r) => ({
    x: g.x0 + g.gouttiereW + c * g.cellW,
    y: g.y0 + g.enTeteH + r * g.cellH
});

const LETTRES_T = 'ABCDEFGH';

/** Le texte d'une case du tableau de formule — vide si rien n'y va. */
function contenuTableur(m, c, r) {
    if (r === 0) return m.entetes[c];
    const i = r - 1;
    if (i < m.valeurs.length) return c === 0 ? m.libelles[i] : String(m.valeurs[i]);
    return c === 0 ? m.etiquette : '';
}

function tableurPreviewHtml(item, slot, k, solution) {
    const g = geoTableur(item, slot);
    const m = g.m;
    const T = (v) => (v * k).toFixed(2);
    const zone = m.zone;
    // La zone est coloriée d'emblée quand on demande son nom ; sur la
    // correction, elle l'est aussi quand c'était à l'élève de le faire.
    const teinter = !g.formule && (m.quoi === 'nommer' || solution);
    const dansZone = (c, r) => zone && c >= zone.c1 && c <= zone.c2 && r >= zone.r1 && r <= zone.r2;

    let d = '';
    for (let r = 0; r < g.rows; r++) {
        for (let c = 0; c < g.cols; c++) {
            const q = caseTableur(g, c, r);
            const chaude = teinter && dansZone(c, r);
            d += `<rect x="${T(q.x)}" y="${T(q.y)}" width="${T(g.cellW)}" height="${T(g.cellH)}"
                fill="${chaude ? '#c9dcf7' : '#fff'}" stroke="#8a93a3" stroke-width="${T(0.22)}"/>`;
            if (g.formule) {
                const texte = contenuTableur(m, c, r);
                const cible = r === g.rows - 1 && c === 1;
                if (texte || (cible && solution)) {
                    d += `<text x="${T(q.x + (c === 0 ? g.cellW * 0.08 : g.cellW / 2))}"
                        y="${T(q.y + g.cellH / 2)}"
                        text-anchor="${c === 0 ? 'start' : 'middle'}" dominant-baseline="central"
                        font-size="${T(Math.min(g.cellH * 0.42, 3.2))}"
                        font-weight="${r === 0 || c === 0 ? 700 : 500}"
                        fill="#1a202c">${echapperSheet(
                            cible ? String(m.resultat).replace('.', ',') : texte)}</text>`;
                }
            }
        }
    }
    // L'en-tête des colonnes et la gouttière des lignes : le liseré gris.
    for (let c = 0; c < g.cols; c++) {
        const x = g.x0 + g.gouttiereW + c * g.cellW;
        d += `<rect x="${T(x)}" y="${T(g.y0)}" width="${T(g.cellW)}" height="${T(g.enTeteH)}"
            fill="#e7eaf0" stroke="#8a93a3" stroke-width="${T(0.22)}"/>
            <text x="${T(x + g.cellW / 2)}" y="${T(g.y0 + g.enTeteH / 2)}" text-anchor="middle"
            dominant-baseline="central" font-size="${T(Math.min(g.enTeteH * 0.6, 3))}"
            font-weight="700" fill="#4a5568">${LETTRES_T[c]}</text>`;
    }
    for (let r = 0; r < g.rows; r++) {
        const y = g.y0 + g.enTeteH + r * g.cellH;
        d += `<rect x="${T(g.x0)}" y="${T(y)}" width="${T(g.gouttiereW)}" height="${T(g.cellH)}"
            fill="#e7eaf0" stroke="#8a93a3" stroke-width="${T(0.22)}"/>
            <text x="${T(g.x0 + g.gouttiereW / 2)}" y="${T(y + g.cellH / 2)}" text-anchor="middle"
            dominant-baseline="central" font-size="${T(Math.min(g.cellH * 0.5, 3))}"
            font-weight="700" fill="#4a5568">${r + 1}</text>`;
    }

    let html = `<svg class="fx-tb-svg" style="left:0; top:0; width:100%; height:100%">${d}</svg>`;
    html += lignesReponseTableur(m, g, k, solution, slot);
    return html;
}

/** Les lignes sous la grille : la question, puis la place pour répondre. */
function lignesReponseTableur(m, g, k, solution, slot) {
    const dire = [];
    if (m.quoi === 'nommer') {
        dire.push(['La zone coloriée s\'appelle', solution ? m.nom : '..................']);
    } else if (m.quoi === 'colorier') {
        dire.push([`Colorie ${m.nom}`, solution ? `${m.combien} case${m.combien > 1 ? 's' : ''}` : '']);
    } else {
        dire.push([`En B${m.derniere + 1} :`, solution ? m.formule : '=..............................']);
        dire.push(['', solution ? '' : '']);
    }
    return dire.map(([gauche, droite], i) => {
        if (!gauche && !droite) return '';
        return `<div class="fx-tb-ligne" style="left:${slot.x * k}px;
            top:${(g.ligneY + i * g.ligneH) * k}px; width:${slot.taille * k}px;
            height:${g.ligneH * k}px; font-size:${g.ligneH * 0.44 * k}px">
            <b>${echapperSheet(gauche)}</b><i>${echapperSheet(droite)}</i></div>`;
    }).join('');
}

function dessinerTableurPdf(doc, item, slot, solution, champ) {
    const g = geoTableur(item, slot);
    const m = g.m;
    const zone = m.zone;
    const teinter = !g.formule && (m.quoi === 'nommer' || solution);
    const dansZone = (c, r) => zone && c >= zone.c1 && c <= zone.c2 && r >= zone.r1 && r <= zone.r2;

    doc.setDrawColor(138, 147, 163);
    doc.setLineWidth(0.22);
    for (let r = 0; r < g.rows; r++) {
        for (let c = 0; c < g.cols; c++) {
            const q = caseTableur(g, c, r);
            if (teinter && dansZone(c, r)) {
                doc.setFillColor(201, 220, 247);
                doc.rect(q.x, q.y, g.cellW, g.cellH, 'FD');
            } else {
                // Un fond blanc explicite : sans lui, la case garderait la
                // teinte laissée par le dernier texte écrit.
                doc.setFillColor(255, 255, 255);
                doc.rect(q.x, q.y, g.cellW, g.cellH, 'FD');
            }
            if (!g.formule) continue;
            const cible = r === g.rows - 1 && c === 1;
            const texte = cible && solution
                ? String(m.resultat).replace('.', ',')
                : contenuTableur(m, c, r);
            if (!texte) continue;
            doc.setFont('helvetica', (r === 0 || c === 0) ? 'bold' : 'normal');
            doc.setFontSize(Math.max(5, Math.min(g.cellH * 1.6, 9)));
            doc.setTextColor(...ENCRE.texte);
            if (c === 0) doc.text(pourPdf(texte), q.x + g.cellW * 0.08, q.y + g.cellH * 0.66);
            else doc.text(pourPdf(texte), q.x + g.cellW / 2, q.y + g.cellH * 0.66, { align: 'center' });
        }
    }

    // ATTENTION : `setTextColor` change AUSSI la couleur de remplissage dans
    // jsPDF — un texte est peint avec le « fill ». Sans redire la teinte du
    // liseré avant chaque case, la première sortait grise et toutes les
    // suivantes en bleu nuit, lettres invisibles dessus.
    doc.setFont('helvetica', 'bold');
    for (let c = 0; c < g.cols; c++) {
        const x = g.x0 + g.gouttiereW + c * g.cellW;
        doc.setFillColor(231, 234, 240);
        doc.rect(x, g.y0, g.cellW, g.enTeteH, 'FD');
        doc.setFontSize(Math.max(5, Math.min(g.enTeteH * 1.7, 9)));
        doc.setTextColor(74, 85, 104);
        doc.text(LETTRES_T[c], x + g.cellW / 2, g.y0 + g.enTeteH * 0.72, { align: 'center' });
    }
    for (let r = 0; r < g.rows; r++) {
        const y = g.y0 + g.enTeteH + r * g.cellH;
        doc.setFillColor(231, 234, 240);
        doc.rect(g.x0, y, g.gouttiereW, g.cellH, 'FD');
        doc.setFontSize(Math.max(5, Math.min(g.cellH * 1.4, 9)));
        doc.setTextColor(74, 85, 104);
        doc.text(String(r + 1), g.x0 + g.gouttiereW / 2, y + g.cellH * 0.68, { align: 'center' });
    }

    const y = g.ligneY + g.ligneH * 0.7;
    const x0 = slot.x + slot.taille * 0.04;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(Math.max(6.5, Math.min(g.ligneH * 1.3, 10)));
    doc.setTextColor(...ENCRE.texte);
    const etiquette = pourPdf(m.quoi === 'formule'
        ? `En B${m.derniere + 1} :`
        : (m.quoi === 'nommer' ? 'La zone coloriée s\'appelle' : `Colorie ${m.nom}`));
    doc.text(etiquette, x0, y);
    if (m.quoi === 'colorier' && !solution) return;

    const xr = x0 + doc.getTextWidth(etiquette) + slot.taille * 0.03;
    if (solution) {
        doc.text(pourPdf(m.quoi === 'formule' ? m.formule
            : (m.quoi === 'nommer' ? m.nom : `${m.combien} case${m.combien > 1 ? 's' : ''}`)), xr, y);
        return;
    }
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...ENCRE.gris);
    doc.text(m.quoi === 'formule' ? '=..............................' : '..................', xr, y);
    if (champ) champ(xr, y - g.ligneH * 0.6, slot.x + slot.taille * 0.96 - xr, g.ligneH * 0.8);
}

// --- LES MOTS CACHÉS -----------------------------------------------------------
//
// La grille prend la hauteur de la page, la liste des mots se range à côté.
// Une grille par feuille : à deux, les lettres tombent sous quatre millimètres
// et l'on ne cherche plus des mots, on plisse les yeux.
//
// SUR LA CORRECTION, on ne redessine pas la grille en couleur — on éteint les
// lettres de bourrage et l'on trace un trait d'un bout à l'autre de chaque mot.
// C'est exactement le geste qu'on demande à l'élève, et ça se photocopie.

/** La largeur dont dispose la liste quand elle passe sous la grille. */
const empileLargeur = (b) => b.w;

function geoMots(item, slot) {
    const m = item.meta;
    const b = slot.boite;
    // La colonne des indices : large quand elle porte des définitions, étroite
    // quand elle ne porte que les mots.
    const seulsMots = m.indices === 'mots';
    // Ce dont la colonne a BESOIN — son plancher, pas sa part.
    const listeMin = seulsMots
        ? Math.max(34, Math.min(b.w * 0.20, 58))
        : Math.max(58, Math.min(b.w * 0.42, 118));

    // DEUX DISPOSITIONS, ET ON GARDE CELLE QUI DONNE LA PLUS GRANDE GRILLE.
    //
    // Toujours à côté, le bloc d'une fiche composée — presque carré — donnait
    // une grille bornée par sa largeur amputée de la colonne de mots, avec
    // quatre centimètres de blanc au-dessus ET au-dessous. C'est exactement ce
    // qu'on voyait : une grille perdue au milieu de sa page.
    const coteA = Math.max(10, Math.min(b.w - listeMin - 8, b.h));

    // LE RESTE DE LA LARGEUR EST À LA COLONNE DE MOTS.
    //
    // Rémy : « quand la grille est toute seule sans colonne, on peut la faire
    // un peu plus grande et mettre les mots à trouver à droite de la grille. »
    // Les mots sont bien à droite — mais MESURÉ sur une grille seule en
    // paysage : la case, carrée, bute sur la HAUTEUR de la page (164,6 mm) et
    // ne peut plus grandir, pendant que la colonne prenait 20 % de la largeur
    // et laissait CINQ CENTIMÈTRES de papier blanc à sa droite. La grille est
    // déjà à son maximum ; c'est la colonne qui doit prendre le reste, et les
    // mots qui doivent enfin s'écrire gros — ce sont eux qu'on relit à chaque
    // lettre trouvée.
    const listeW = Math.max(listeMin, b.w - coteA - 8);
    // Empilée : les mots passent SOUS la grille, sur plusieurs colonnes.
    const parCol = Math.max(3, Math.ceil(m.mots.length / (seulsMots ? 3 : 2)));
    const listeH = parCol * (seulsMots ? 6.1 : 4.6) + 2;
    const coteB = Math.max(10, Math.min(b.w, b.h - listeH - 3));
    const empile = coteB > coteA + 2;
    const cote = empile ? coteB : coteA;
    const cell = cote / m.taille;

    // L'ensemble est centré : collée à gauche, la grille laissait cinq
    // centimètres de blanc à droite, comme une feuille mal cadrée.
    const x0 = empile
        ? b.x + Math.max(0, (b.w - cote) / 2)
        : b.x + Math.max(0, (b.w - cote - 8 - listeW) / 2);
    const y0 = empile ? b.y : b.y + (b.h - cote) / 2;
    // LA TAILLE DES MOTS À CHERCHER, CALCULÉE UNE FOIS POUR LES DEUX RENDUS.
    //
    // Rémy : « les mots à chercher sont écrits très petit ». Ils l'étaient
    // deux fois : neuf points sur le PDF, et dans l'aperçu une taille déduite
    // de la hauteur disponible qui tombait à six. Or ces mots-là, on les relit
    // à chaque lettre trouvée — c'est la ligne la plus lue de la feuille.
    //
    // Une liste de mots seuls peut être franche ; des définitions, plus
    // longues, tiennent un cran en dessous. En POINTS, comme le PDF ; l'aperçu
    // convertit.
    // ET LA TAILLE SUIT LA COLONNE. Une colonne deux fois plus large ne sert à
    // rien si les mots y restent écrits en 11,5 : on remplit la largeur avec le
    // MOT LE PLUS LONG, et l'on plafonne — passé vingt points, une liste de dix
    // mots ne tient plus en hauteur, et l'on ne lit pas mieux pour autant.
    const leMotLePlusLong = Math.max(...indicesMots(m).map(l => l.length), 1);
    const tailleQuiTient = (largeur) =>
        (largeur - 4) / Math.max(1, leMotLePlusLong * 0.3528 * 0.62);
    const plancher = seulsMots ? 11.5 : 8.5;
    const taille = empile ? plancher
        : Math.max(plancher, Math.min(seulsMots ? 20 : 13, tailleQuiTient(listeW)));
    // LE NOMBRE DE COLONNES SUIT LE MOT LE PLUS LONG, pas un chiffre décidé
    // d'avance. Trois colonnes fixes convenaient à « ANGLE » et « SOMME » ;
    // « DENOMINATEUR » débordait sur sa voisine et les deux devenaient
    // illisibles — juste à l'endroit qu'on relit à chaque lettre trouvée.
    const largeurMot = leMotLePlusLong * taille * 0.3528 * 0.62 + 4;
    const colonnesTient = Math.max(1, Math.floor((empileLargeur(b) || b.w) / largeurMot));
    return {
        m, b, cell, cote, empile, taille,
        listeW: empile ? b.w : listeW,
        listeColonnes: empile
            ? Math.max(1, Math.min(seulsMots ? 3 : 2, colonnesTient)) : 1,
        x0, y0,
        listeX: empile ? b.x : x0 + cote + 8,
        listeY: empile ? y0 + cote + 3 : y0,
        listeH: empile ? listeH : cote
    };
}

/** Le centre d'une case, en millimètres — la même pour l'aperçu et le PDF. */
const centreMot = (g, x, y) => ({
    cx: g.x0 + (x + 0.5) * g.cell,
    cy: g.y0 + (y + 0.5) * g.cell
});

/** Les lignes de la colonne d'indices, dans l'ordre où elles s'impriment. */
function indicesMots(m) {
    if (m.indices === 'definitions') return m.mots.map((w, i) => `${i + 1}. ${w.def}`);
    if (m.indices === 'les-deux') return m.mots.map(w => `${w.mot} — ${w.def}`);
    return m.mots.map(w => w.mot);
}

function motsPreviewHtml(item, slot, k, solution) {
    const g = geoMots(item, slot);
    const m = g.m;
    // Les cases occupées par un mot : sur la correction, seules celles-là
    // restent noires.
    const dedans = new Set();
    if (solution) {
        m.mots.forEach(w => {
            for (let i = 0; i < w.longueur; i++) dedans.add(`${w.x + w.dx * i},${w.y + w.dy * i}`);
        });
    }

    const T = (v) => (v * k).toFixed(2);
    let svg = '';
    m.grille.forEach((ligne, y) => {
        ligne.forEach((lettre, x) => {
            const c = centreMot(g, x, y);
            const chaude = !solution || dedans.has(`${x},${y}`);
            svg += `<text x="${T(c.cx)}" y="${T(c.cy)}" text-anchor="middle"
                dominant-baseline="central" font-size="${T(g.cell * 0.62)}"
                font-weight="${chaude ? 700 : 400}"
                fill="${chaude ? '#1a202c' : '#c3c8d2'}">${lettre}</text>`;
        });
    });
    if (solution) {
        m.mots.forEach(w => {
            const a = centreMot(g, w.x, w.y);
            const z = centreMot(g, w.x + w.dx * (w.longueur - 1), w.y + w.dy * (w.longueur - 1));
            svg += `<line x1="${T(a.cx)}" y1="${T(a.cy)}" x2="${T(z.cx)}" y2="${T(z.cy)}"
                stroke="#e11d48" stroke-width="${T(g.cell * 0.44)}" stroke-linecap="round"
                opacity="0.26"/>`;
        });
    } else {
        // Le cadre : sans lui, une grille de lettres flotte au milieu du papier.
        svg += `<rect x="${T(g.x0)}" y="${T(g.y0)}" width="${T(g.cote)}" height="${T(g.cote)}"
            fill="none" stroke="#1a202c" stroke-width="${T(0.45)}"/>`;
    }

    let html = `<svg class="fx-mc-svg" style="left:0; top:0; width:100%; height:100%">${svg}</svg>`;
    const lignes = indicesMots(m);
    html += `<div class="fx-mc-liste" style="left:${g.listeX * k}px; top:${g.listeY * k}px;
        width:${g.listeW * k}px; height:${g.listeH * k}px;
        column-count:${g.listeColonnes}; column-gap:${4 * k}px;
        font-weight:${m.indices === 'mots' ? 800 : 600};
        font-size:${g.taille * 0.3528 * k}px; line-height:${g.taille * 0.53 * k}px">`
        + lignes.map(l => `<div>${echapperSheet(l)}</div>`).join('') + '</div>';
    return html;
}

function dessinerMotsPdf(doc, item, slot, solution) {
    const g = geoMots(item, slot);
    const m = g.m;
    const dedans = new Set();
    if (solution) {
        m.mots.forEach(w => {
            for (let i = 0; i < w.longueur; i++) dedans.add(`${w.x + w.dx * i},${w.y + w.dy * i}`);
        });
    }

    if (solution) {
        // Le trait D'ABORD, les lettres par-dessus : l'inverse barrerait le mot
        // au lieu de le désigner.
        // Assez large pour désigner, assez clair pour qu'on lise la lettre au
        // travers : à pleine case, deux mots qui se croisent font une tache.
        doc.setDrawColor(249, 205, 216);
        doc.setLineWidth(g.cell * 0.46);
        m.mots.forEach(w => {
            const a = centreMot(g, w.x, w.y);
            const z = centreMot(g, w.x + w.dx * (w.longueur - 1), w.y + w.dy * (w.longueur - 1));
            doc.line(a.cx, a.cy, z.cx, z.cy);
        });
        doc.setLineWidth(0.4);
    } else {
        doc.setDrawColor(...ENCRE.trait);
        doc.setLineWidth(0.45);
        doc.rect(g.x0, g.y0, g.cote, g.cote, 'S');
    }

    doc.setFontSize(Math.max(5, Math.min(g.cell * 2.1, 13)));
    m.grille.forEach((ligne, y) => {
        ligne.forEach((lettre, x) => {
            const c = centreMot(g, x, y);
            const chaude = !solution || dedans.has(`${x},${y}`);
            doc.setFont('helvetica', chaude ? 'bold' : 'normal');
            doc.setTextColor(...(chaude ? ENCRE.texte : [196, 201, 210]));
            doc.text(lettre, c.cx, c.cy + g.cell * 0.22, { align: 'center' });
        });
    });

    const lignes = indicesMots(m);
    const taille = g.taille;
    doc.setFont('helvetica', m.indices === 'mots' ? 'bold' : 'normal');
    doc.setFontSize(taille);
    doc.setTextColor(...ENCRE.texte);
    // EN COLONNES QUAND LA LISTE EST SOUS LA GRILLE. Une seule colonne y
    // aurait tiré huit mots sur toute la hauteur laissée libre, ou débordé.
    const colW = (g.listeW - 4 * (g.listeColonnes - 1)) / g.listeColonnes;
    const parCol = Math.ceil(lignes.length / g.listeColonnes);
    const interligne = taille * 0.53;
    let col = 0;
    let y = g.listeY + taille * 0.5;
    let dansLaColonne = 0;
    // Chaque indice est découpé à la largeur de sa colonne : une définition
    // d'un seul tenant sortait par la droite de la feuille.
    lignes.forEach(l => {
        if (dansLaColonne >= parCol && col < g.listeColonnes - 1) {
            col++; dansLaColonne = 0; y = g.listeY + taille * 0.5;
        }
        dansLaColonne++;
        doc.splitTextToSize(pourPdf(l), colW).forEach(part => {
            if (y > g.listeY + g.listeH) return;
            doc.text(part, g.listeX + col * (colW + 4), y);
            y += interligne;
        });
        y += interligne * 0.55;
    });
}

// --- Priorités : la cascade ---------------------------------------------------
//
// L'expression en haut, puis AUTANT DE LIGNES VIDES QUE LE CALCUL A D'ÉTAPES.
// Ni une de plus — ce serait un piège, l'élève chercherait une étape qui
// n'existe pas —, ni une de moins : la dernière ligne porte le résultat seul,
// et sans elle il faudrait l'écrire dans la marge.

function geoPriorites(item, slot) {
    const m = item.meta;
    // LA BOÎTE ENTIÈRE, pas le carré inscrit : une cascade est large et courte,
    // et le carré lui laissait un quart de bloc vide sur la gauche.
    const b = slot.boite;
    // AUTANT DE LIGNES POUR TOUS LES CALCULS DE LA FEUILLE.
    //
    // On donnait exactement le nombre d'étapes de CE calcul : deux lignes ici,
    // quatre là. Rémy : « mets le même nombre de lignes à chaque fois ». Deux
    // raisons, et la seconde est la vraie. La feuille d'abord : des blocs de
    // hauteurs différentes se rangent mal et l'on voit un escalier. Mais
    // surtout, le nombre de lignes DIT COMBIEN D'ÉTAPES IL Y A — c'est-à-dire
    // une partie de la réponse. Un élève qui compte trois lignes sait qu'il
    // lui reste trois opérations, et n'a plus à se demander s'il a fini.
    //
    // Le maximum du RÉGLAGE, pas un nombre inventé : le générateur le calcule
    // sur les formes qu'il peut tirer (`etapesMax`), et il est donc le même
    // pour tous les calculs d'une même fiche.
    const rangs = Math.max(m.etapes, m.etapesMax || 0) + 1;
    // LE NUMÉRO EST SUR LA MÊME LIGNE QUE LE CALCUL, comme dans un cahier :
    // « 1.  2 × 6 + 7 − 2 ». Posé au-dessus du bloc, il coûtait une ligne
    // entière et le calcul flottait sans rien à quoi s'aligner.
    const gouttiere = slot.numero != null ? 7 : 0;
    // LES LIGNES NE S'ÉTIRENT PAS POUR REMPLIR LE BLOC — mais elles ne se
    // perdent pas non plus dedans. Sept millimètres, c'est l'interligne d'un
    // cahier : au-delà on n'écrit plus une cascade, on écrit dans le vide, et
    // l'œil ne relie plus une ligne à la suivante. Rémy : « il y a trop
    // d'espace entre les lignes » — c'était neuf, et sur une feuille à six
    // calculs le bloc était assez haut pour que le plafond soit atteint : les
    // trois lignes se retrouvaient à un centimètre l'une de l'autre. Le blanc
    // qui reste au bas du bloc ne se perd pas, il SÉPARE deux calculs.
    const ligneH = Math.min(b.h / (rangs + 0.3), 7);
    return {
        m, rangs, ligneH, gouttiere,
        numero: slot.numero,
        x0: b.x + gouttiere,
        largeur: b.w - gouttiere - 2,
        y0: b.y,
        // LA MÊME TAILLE POUR TOUS LES CALCULS DE LA FEUILLE. Elle se prenait
        // sur l'interligne, qui dépend du nombre d'étapes : un calcul en deux
        // étapes s'imprimait à côté d'un calcul en trois, moitié plus gros, et
        // la feuille avait l'air bricolée. Elle ne dépend plus que du bloc,
        // le même pour tout le monde.
        taille: Math.max(7.5, Math.min(b.h * 0.3, 11))
    };
}

function prioritesPreviewHtml(item, slot, k, solution) {
    const g = geoPriorites(item, slot);
    let html = '';
    // LE CALCUL SE RÉCRIT — voir `retoucheGrille` plus bas.
    //
    // Rémy : « on ne peut pas changer les calculs du 33 ». Sur cette feuille on
    // récrit déjà un titre, une consigne, un énoncé ; la cascade, elle, se
    // dessine par un rendu à part et n'offrait aucune prise. C'est pourtant
    // l'exercice qu'un professeur veut le plus retoucher : il a SES calculs,
    // ceux de son cours.
    //
    // La zone couvre la première ligne — l'expression —, jamais les lignes
    // vides en dessous : elles ne portent rien à récrire.
    if (slot.retouchable && slot.exoId != null && slot.iQ != null) {
        html += `<div class="fx-qgestes fx-retouche" data-txt-exo="${echapperSheet(slot.exoId)}"
            data-txt-rang="${slot.iQ}" title="Cliquer pour récrire ce calcul"
            style="left:${g.x0 * k}px; top:${g.y0 * k}px;
            width:${g.largeur * k}px; height:${g.ligneH * k}px"></div>`;
    }
    // Le numéro, dans la marge, à la hauteur du calcul.
    if (g.numero != null) {
        html += `<div style="position:absolute; left:${slot.boite.x * k}px; top:${g.y0 * k}px;
            width:${(g.gouttiere - 1) * k}px; height:${g.ligneH * k}px;
            display:flex; align-items:center; font-weight:800; color:#6e7684;
            font-size:${g.taille * 0.3 * k}px">${g.numero}.</div>`;
    }
    for (let i = 0; i < g.rangs; i++) {
        const y = g.y0 + i * g.ligneH;
        const texte = (i === 0 || solution) ? (g.m.lignes[i] || '') : '';
        // La ligne d'écriture s'arrête sous la première ligne : l'énoncé est
        // imprimé, on n'écrit pas dessus.
        if (i > 0) {
            html += `<div style="position:absolute; left:${g.x0 * k}px;
                top:${(y + g.ligneH * 0.86) * k}px; width:${g.largeur * k}px;
                height:1px; background:#b0b6c5"></div>`;
        }
        if (!texte) continue;
        // LA TAILLE DU PDF EST EN POINTS, l'aperçu travaille en millimètres :
        // 1 pt ≈ 0,3528 mm. Sans la conversion, l'aperçu écrivait presque trois
        // fois trop gros et les lignes se chevauchaient.
        html += `<div style="position:absolute; left:${g.x0 * k}px; top:${y * k}px;
            width:${g.largeur * k}px; height:${g.ligneH * k}px;
            display:flex; align-items:center; font-size:${g.taille * 0.3528 * k}px;
            font-weight:${i === 0 ? 800 : 600}; color:${i === 0 ? '#1a202c' : '#2f855a'};
            white-space:nowrap">${texte}</div>`;
    }
    return html;
}

function dessinerPrioritesPdf(doc, item, slot, solution) {
    const g = geoPriorites(item, slot);
    if (g.numero != null) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(g.taille * 0.85);
        doc.setTextColor(...ENCRE.gris);
        doc.text(`${g.numero}.`, slot.boite.x, g.y0 + g.ligneH * 0.7);
    }
    for (let i = 0; i < g.rangs; i++) {
        const y = g.y0 + i * g.ligneH;
        if (i > 0) {
            doc.setDrawColor(...ENCRE.grille);
            doc.setLineWidth(0.22);
            const yl = y + g.ligneH * 0.86;
            doc.line(g.x0, yl, g.x0 + g.largeur, yl);
        }
        const texte = (i === 0 || solution) ? (g.m.lignes[i] || '') : '';
        if (!texte) continue;
        doc.setFont('helvetica', i === 0 ? 'bold' : 'normal');
        doc.setFontSize(g.taille);
        // Les lignes de la solution en gris : sur la page des solutions, on
        // distingue d'un coup d'œil ce qui était donné de ce qui était à faire.
        doc.setTextColor(...(i === 0 ? ENCRE.texte : ENCRE.gris));
        doc.text(pourPdf(texte), g.x0, y + g.ligneH * 0.7);
    }
}

// --- POSER UNE OPÉRATION, SUR LE PAPIER -----------------------------------------

/**
 * LA GÉOMÉTRIE D'UNE OPÉRATION POSÉE, commune à l'aperçu et au PDF.
 *
 * Tout se joue sur une grille de colonnes de largeur fixe : c'est elle qui
 * met les unités sous les unités. Les nombres sont imprimés DÉJÀ ALIGNÉS —
 * l'alignement se travaille à l'écran, où l'on peut recommencer ; sur une
 * photocopie, un élève qui aligne mal n'a plus qu'à raturer.
 *
 * Le nombre de rangées dépend de l'opération, et c'est ce qui donne « la bonne
 * hauteur » que Rémy réclamait pour la division : une potence a besoin de deux
 * lignes par étape — le produit qu'on écrit, et le reste qu'on trouve.
 */
/**
 * Les étapes d'une division QU'ON ÉCRIT VRAIMENT au tableau.
 *
 * Le noyau rend une étape par chiffre du dividende, y compris celles où le
 * diviseur « ne va pas » — « 2 ÷ 64 », puis « 22 ÷ 64 ». On ne les pose pas :
 * on prend les trois premiers chiffres d'un coup, et c'est ce que fait tout
 * élève. Les dessiner remplissait la potence de zéros parasites ; les compter
 * la faisait deux fois trop haute.
 */
function etapesEcrites(t) {
    const ecrites = (t.etapes || []).filter(e => e.ecrit);
    // ON S'ARRÊTE QUAND LA DIVISION EST FINIE. Poussée jusqu'au centième, une
    // division qui tombe juste avant — 146 ÷ 2 = 73 — continue d'abaisser des
    // zéros : le noyau a raison de les calculer, la feuille aurait tort de les
    // dessiner. Deux rangées de « 0 » sous un travail terminé, et l'élève
    // cherche ce qu'on attend de lui.
    let fin = ecrites.length;
    while (fin > 1 && ecrites[fin - 1].produit === 0 && ecrites[fin - 1].reste === 0) fin--;
    return ecrites.slice(0, fin);
}

/**
 * LA VIRGULE N'EST PAS UN CHIFFRE : elle ne prend pas de colonne.
 *
 * On posait les nombres en découpant leur chaîne — `String(12.5)` — ce qui
 * donnait quatre cases dont une contenant un point, calées sur le bord droit.
 * C'est exactement l'erreur qu'on passe l'année à corriger chez les élèves, et
 * la feuille l'imprimait. Les chiffres se posent maintenant PAR RANG, et la
 * virgule se dessine sur la frontière entre les unités et les dixièmes —
 * là où elle tombe sur un cahier, entre deux carreaux.
 */
const digitsDe = (v) => String(Math.round(Math.abs(v) * Math.pow(10, decimalesPose(v)))).split('');

/**
 * COMBIEN DE COLONNES SOUS LES UNITÉS, dans une potence.
 *
 * Le dividende en apporte par ses décimales ; poursuivre la division en
 * apporte d'autres, qu'aucun chiffre du dividende n'occupe. Les deux se
 * comptent au même endroit, sinon la géométrie et le dessin ne parlent plus
 * de la même feuille.
 */
const basPotence = (m, t) =>
    Math.max(decimalesPose(m.operandes[0]), t.decimalesQuotient || 0);

function geoPose(item, slot) {
    const m = item.meta;
    const b = slot.boite;
    const t = m.table;
    const op = m.operation;
    const gouttiere = slot.numero != null ? 7 : 0;
    const x0 = b.x + gouttiere;
    const large = b.w - gouttiere - 1;

    // Combien de colonnes de chiffres, et combien de rangées d'écriture ?
    let nCol, rangs, lignesOperandes = m.operandes.length;
    if (op === '+' || op === '-') {
        // `t.colonnes` est indexé PAR RANG, décimales comprises : le compte est
        // donc déjà le bon, et la virgule n'y ajoute pas de colonne — elle se
        // dessine sur la frontière, comme entre deux carreaux d'un cahier.
        nCol = t.colonnes.length;
        // Une rangée de retenues, les opérandes, le trait, le résultat.
        rangs = 1 + lignesOperandes + 1;
    } else if (op === '×') {
        nCol = String(t.produitEntier).length;
        // Les deux facteurs, le trait, un produit partiel par ligne, puis —
        // s'il y en a plusieurs — le trait et la somme.
        rangs = 1 + 2 + t.lignes.length + (t.sommeAPoser ? 1 : 0);
    } else {
        // LA DIVISION : deux lignes par étape. C'est exactement la place qu'il
        // faut pour écrire le produit sous le nombre courant, tirer le trait,
        // et poser le reste dessous — « il faut la soustraction étape par
        // étape », et sans la hauteur, elle ne tient pas.
        // LE DIVIDENDE SE COMPTE EN RANGS, pas en caractères : « 336,5 » a
        // cinq caractères et quatre chiffres, et compter le point donnait une
        // colonne de trop — puis tout le reste décalé d'un cran.
        //
        // ET LA POTENCE VA PLUS BAS QUE LE DIVIDENDE quand on poursuit la
        // division : abaisser des zéros crée des rangs que le dividende n'a
        // pas. Sans ces colonnes-là, les dernières soustractions se posaient
        // à DROITE du dernier chiffre, c'est-à-dire hors du bloc.
        //
        // On compte DU RANG LE PLUS FORT DU DIVIDENDE AU PLUS FAIBLE ÉCRIT,
        // plus une colonne de garde avant la barre. Additionner la longueur du
        // dividende ET les décimales comptait deux fois celles qu'il porte
        // déjà, et décalait toute la potence vers la gauche.
        nCol = rangsPose(m.operandes[0])[0] + basPotence(m, t) + 2;
        // Deux lignes par étape ÉCRITE — le produit qu'on pose, le reste qu'on
        // trouve. Les étapes muettes (« 2 ÷ 64, ça ne va pas ») ne s'écrivent
        // pas au tableau : les compter donnait une potence deux fois trop
        // haute, et les dessiner remplissait la page de zéros parasites.
        rangs = 1 + etapesEcrites(t).length * 2;
    }
    nCol = Math.max(2, nCol);

    // La colonne : assez large pour un chiffre lisible, jamais plus large que
    // ce que le bloc peut offrir. Sur la division, il faut la place du
    // diviseur à droite de la potence.
    // À droite de la potence, il faut la place du diviseur ET du quotient : un
    // quotient décimal est plus large que le diviseur, et débordait du bloc.
    const largeurDroite = op === '÷'
        ? Math.max(String(m.operandes[1]).length, enFrancais(t.quotient).length) + 1
        : 0;
    const colonnesTotales = op === '÷' ? nCol + largeurDroite : nCol + 1.2;
    // UNE RANGÉE EST PLUS HAUTE QU'UNE COLONNE N'EST LARGE — de 32 %, ligne
    // suivante. Le plafond en hauteur l'oubliait : à neuf rangées, il rendait
    // une potence 24 % trop haute, dont la barre verticale descendait dans le
    // bloc du dessous. Cela ne se voyait pas tant que les divisions tenaient en
    // peu d'étapes ; poursuivre au centième en ajoute deux, et le voilà.
    const cw = Math.max(3.2, Math.min(large / colonnesTotales, b.h / (1.32 * (rangs + 0.6)), 7));
    const rh = cw * 1.32;
    const hauteur = rangs * rh;
    // Centré verticalement dans le bloc : une addition à trois rangées et une
    // division à sept ne doivent pas flotter chacune à sa façon.
    const y0 = b.y + Math.max(0, (b.h - hauteur) / 2);
    // La grille des chiffres est calée à DROITE de sa zone, comme au cahier.
    const droite = op === '÷' ? x0 + nCol * cw : x0 + Math.min(large - 1, (nCol + 1.2) * cw);

    return {
        m, t, op, cw, rh, rangs, nCol, y0, x0, droite, gouttiere,
        numero: slot.numero,
        taille: Math.max(6, Math.min(cw * 2.1, 13)),
        /** L'abscisse du centre de la colonne d'indice `i` en partant de la droite. */
        colX: (i) => droite - (i + 0.5) * cw,
        ligneY: (r) => y0 + r * rh
    };
}

/** Les chiffres d'un nombre, du rang le plus faible au plus fort. */
const chiffresDroiteGauche = (v) => digitsDe(v).reverse();

/**
 * Ce qu'il y a à écrire dans une opération posée : une liste de
 * `{ x, y, texte, gras, creux }` en millimètres, plus les traits.
 *
 * Le même plan sert deux fois : l'aperçu le pose en HTML, le PDF l'écrit tel
 * quel. C'est la seule façon d'être sûr que les deux tombent au même endroit —
 * et sur une opération posée, un décalage d'un demi-millimètre entre deux
 * colonnes se voit tout de suite.
 */
function planPose(g, solution) {
    const { m, t, op, cw, rh } = g;
    const cases = [];
    const traits = [];
    const cercles = [];
    const pose = (col, rang, texte, o = {}) =>
        cases.push({ x: g.colX(col), y: g.ligneY(rang) + rh * 0.5, texte: String(texte), ...o });

    /**
     * UN NOMBRE POSÉ, virgule comprise.
     *
     * `col0` est la colonne du CHIFFRE DES UNITÉS. Les chiffres se rangent à
     * gauche, les décimales à droite, et la virgule se dessine sur la frontière
     * entre les deux — elle ne prend pas de colonne, comme sur un cahier où
     * elle tombe entre deux carreaux.
     */
    const poserNombre = (valeur, col0, rang, o = {}) => {
        const d = decimalesPose(valeur);
        chiffresDroiteGauche(valeur).forEach((c, i) => pose(i + col0 - d, rang, c, o));
        if (!d) return;
        cases.push({
            // LA FRONTIÈRE : le bord droit de la colonne des unités, c'est-à-
            // dire entre les unités et les dixièmes. Posée un peu bas, comme
            // on l'écrit.
            // Même ligne de base que les chiffres : une virgule descend
            // d'elle-même sous cette ligne, c'est sa forme qui la place.
            x: g.droite - col0 * cw, y: g.ligneY(rang) + rh * 0.5,
            texte: ',', virgule: true, ...o
        });
    };

    if (op === '+' || op === '-') {
        // LES CHIFFRES SE RANGENT PAR RANG, et c'est toute la leçon de
        // l'addition décimale : on aligne sur la VIRGULE, pas sur le bord
        // droit. Découper la chaîne « 12.5 » alignait sur le bord droit et
        // posait un point dans une colonne — la faute qu'on corrige toute
        // l'année, imprimée sur la feuille.
        const bas = t.colonnes[0].rang;      // le rang le plus faible écrit
        const col0 = -bas;                   // la colonne des unités
        m.operandes.forEach((v, i) => poserNombre(v, col0, 1 + i));
        // Le signe, à gauche du dernier opérande.
        pose(g.nCol, m.operandes.length, op === '+' ? '+' : '−', { signe: true });
        const yTrait = g.ligneY(m.operandes.length + 1) - rh * 0.12;
        traits.push({ x1: g.colX(g.nCol - 0.2), x2: g.droite, y: yTrait, epais: true });
        // PAS DE RONDS DE RETENUE SUR LA FEUILLE. Rémy : « pour le pdf, ne
        // mets pas le rond des retenues », « ne mets pas les cercles ».
        //
        // À l'écran ils ont un rôle : ils se cliquent, ils comptent dans la
        // correction, et ils obligent à ÉCRIRE la retenue au lieu de la
        // penser. Sur le papier, ils ne font qu'imposer une façon d'écrire —
        // et pas celle du cahier, où la retenue se glisse où l'on veut, au
        // crayon, petite. Un rond imprimé dit à l'élève « pose-la ICI », ce
        // que le professeur ne demande pas. La place, elle, reste : la rangée
        // du haut est comptée dans la hauteur du bloc.
        if (solution) poserNombre(t.resultat, col0, m.operandes.length + 1, { reponse: true });
        return { cases, traits, cercles };
    }

    if (op === '×') {
        // LA MULTIPLICATION DÉCIMALE NE S'ALIGNE PAS SUR LA VIRGULE, et c'est
        // sa difficulté propre : on écrit les facteurs calés à droite, on
        // multiplie comme si de rien n'était, et l'on place la virgule à la
        // fin en comptant les décimales des deux facteurs. Chaque facteur
        // porte donc SA virgule à SA place, sans rapport avec celle de l'autre.
        const [a, b] = m.operandes;
        poserNombre(a, decimalesPose(a), 1);
        poserNombre(b, decimalesPose(b), 2);
        pose(g.nCol, 2, '×', { signe: true });
        traits.push({ x1: g.colX(g.nCol - 0.2), x2: g.droite, y: g.ligneY(3) - rh * 0.12, epais: true });
        t.lignes.forEach((l, i) => {
            if (!solution) return;
            // LES PRODUITS PARTIELS SONT DES ENTIERS, sans virgule : c'est la
            // règle du chapitre, et en poser une ici la contredirait.
            const valeur = l.chiffre * t.entiers[0];
            chiffresDroiteGauche(valeur).forEach((d, c) => pose(c + l.decalage, 3 + i, d, { reponse: true }));
        });
        if (t.sommeAPoser) {
            const yT = g.ligneY(3 + t.lignes.length) - rh * 0.12;
            traits.push({ x1: g.colX(g.nCol - 0.2), x2: g.droite, y: yT, epais: true });
            pose(g.nCol, 3 + t.lignes.length - 1, '+', { signe: true });
            if (solution) {
                // Le produit, LUI, porte la virgule — au rang que donnent les
                // décimales des deux facteurs réunies.
                poserNombre(t.resultat, t.decimales, 3 + t.lignes.length, { reponse: true });
            }
        }
        // PAS DE RONDS DE RETENUE SUR L'ADDITION FINALE : Rémy, « ne mets pas
        // les petits ronds de retenue pour l'addition finale ». Ils sont déjà
        // portés par chaque produit partiel, et les répéter en bas donne un
        // fouillis de bulles qu'on ne relie plus à rien.
        return { cases, traits, cercles };
    }

    // LA POTENCE. Le dividende à gauche, la barre verticale, le diviseur à
    // droite, le trait sous le diviseur, et le quotient dessous.
    const [dividende, diviseur] = m.operandes;
    // Le rang le plus faible ÉCRIT — celui du dividende, ou plus bas encore si
    // l'on poursuit la division. C'est lui qui cale toute la potence, y compris
    // les soustractions successives.
    const col0Div = basPotence(m, t) + 1;    // la colonne des unités du dividende
    poserNombre(dividende, col0Div, 0);
    const xBarre = g.droite + cw * 0.1;
    traits.push({ x1: xBarre, x2: xBarre, y: g.ligneY(0) + rh * 0.1, y2: g.ligneY(g.rangs) - rh * 0.2, vertical: true });
    /**
     * À DROITE DE LA BARRE, ON ÉCRIT DE GAUCHE À DROITE — et une virgule n'y
     * vaut pas une pleine colonne : « 14,71 » écrit en cinq cases laisse un
     * trou au milieu du quotient.
     */
    const ecrireADroite = (texte, rang, o = {}) => {
        let x = xBarre + cw * 0.6;
        for (const c of texte) {
            const large = c === ',' ? cw * 0.42 : cw;
            cases.push({ x: x + large / 2, y: g.ligneY(rang) + rh * 0.5, texte: c, ...o });
            x += large;
        }
        return x - xBarre;
    };
    const largeurDiv = ecrireADroite(String(diviseur), 0) / cw;
    traits.push({
        x1: xBarre, x2: xBarre + (largeurDiv + 0.4) * cw,
        y: g.ligneY(1) - rh * 0.12, epais: true
    });
    if (solution) ecrireADroite(enFrancais(t.quotient), 1, { reponse: true });
    // LES SOUSTRACTIONS SUCCESSIVES, étape par étape — c'est ce que Rémy
    // demandait : « il faut la soustraction étape par étape ».
    //
    // L'ALIGNEMENT SUIT LE RANG, et c'est toute la méthode : le chiffre du
    // quotient obtenu en abaissant le chiffre de rang r se pose au rang r, et
    // le produit qu'on soustrait se termine sur cette même colonne. Aligner
    // sur le numéro de l'étape — ce que je faisais — décalait tout dès qu'une
    // étape muette passait devant.
    if (solution) {
        let rang = 1;
        for (const e of etapesEcrites(t)) {
            // La colonne du rang e.rang. Le dividende est posé avec ses unités
            // en `col0Div` : le produit s'aligne sur la même règle, sinon une
            // division à virgule décale ses soustractions d'un cran.
            const col0 = col0Div + e.rang;
            chiffresDroiteGauche(e.produit).forEach((d, c) => {
                cases.push({ x: g.colX(c + col0), y: g.ligneY(rang) + rh * 0.5, texte: d, reponse: true });
            });
            const largeurBloc = Math.max(String(e.produit).length, String(e.reste).length);
            traits.push({
                x1: g.colX(col0 + largeurBloc - 0.5),
                x2: g.colX(col0 - 0.5), y: g.ligneY(rang + 1) - rh * 0.12
            });
            chiffresDroiteGauche(e.reste).forEach((d, c) => {
                cases.push({ x: g.colX(c + col0), y: g.ligneY(rang + 1) + rh * 0.5, texte: d, reponse: true });
            });
            rang += 2;
        }
    }
    return { cases, traits, cercles };
}

function posePreviewHtml(item, slot, k, solution) {
    const g = geoPose(item, slot);
    const plan = planPose(g, solution);
    let html = '';
    if (g.numero != null) {
        html += `<div style="position:absolute; left:${slot.boite.x * k}px; top:${g.y0 * k}px;
            width:${(g.gouttiere - 1) * k}px; height:${g.rh * k}px; display:flex;
            align-items:center; font-weight:800; color:#6e7684;
            font-size:${g.taille * 0.34 * k}px">${g.numero}.</div>`;
    }
    for (const t of plan.traits) {
        if (t.vertical) {
            html += `<div style="position:absolute; left:${t.x1 * k}px; top:${t.y * k}px;
                width:${Math.max(1, 0.5 * k)}px; height:${(t.y2 - t.y) * k}px;
                background:#1a202c"></div>`;
        } else {
            html += `<div style="position:absolute; left:${t.x1 * k}px; top:${t.y * k}px;
                width:${(t.x2 - t.x1) * k}px; height:${Math.max(1, (t.epais ? 0.5 : 0.35) * k)}px;
                background:#1a202c"></div>`;
        }
    }
    for (const c of plan.cercles) {
        html += `<div style="position:absolute; left:${(c.x - c.r) * k}px; top:${(c.y - c.r) * k}px;
            width:${c.r * 2 * k}px; height:${c.r * 2 * k}px; border-radius:50%;
            border:1px dashed #9aa3b2; display:flex; align-items:center; justify-content:center;
            font-size:${g.taille * 0.22 * k}px; color:#6e7684; font-weight:700">${echapperSheet(c.texte)}</div>`;
    }
    for (const c of plan.cases) {
        html += `<div style="position:absolute; left:${(c.x - g.cw / 2) * k}px;
            top:${(c.y - g.rh / 2) * k}px; width:${g.cw * k}px; height:${g.rh * k}px;
            display:flex; align-items:center; justify-content:center;
            font-size:${g.taille * 0.3528 * k}px; font-weight:${c.signe ? 700 : 800};
            color:${c.reponse ? '#6e7684' : '#1a202c'}">${echapperSheet(c.texte)}</div>`;
    }
    return html;
}

function dessinerPosePdf(doc, item, slot, solution) {
    const g = geoPose(item, slot);
    const plan = planPose(g, solution);
    if (g.numero != null) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(g.taille * 0.9);
        doc.setTextColor(...ENCRE.gris);
        doc.text(`${g.numero}.`, slot.boite.x, g.y0 + g.rh * 0.7);
    }
    doc.setDrawColor(...ENCRE.trait);
    for (const t of plan.traits) {
        doc.setLineWidth(t.epais ? 0.5 : 0.32);
        if (t.vertical) doc.line(t.x1, t.y, t.x1, t.y2);
        else doc.line(t.x1, t.y, t.x2, t.y);
    }
    // Les ronds de retenue : en POINTILLÉ, pour qu'on voie qu'ils sont à
    // remplir et non déjà écrits.
    doc.setDrawColor(...ENCRE.grille);
    doc.setLineWidth(0.25);
    doc.setLineDashPattern([0.6, 0.7], 0);
    for (const c of plan.cercles) doc.circle(c.x, c.y, c.r, 'S');
    doc.setLineDashPattern([], 0);
    doc.setFont('helvetica', 'bold');
    for (const c of plan.cercles) {
        if (!c.texte) continue;
        doc.setFontSize(g.taille * 0.62);
        doc.setTextColor(...ENCRE.gris);
        doc.text(c.texte, c.x, c.y + g.taille * 0.2, { align: 'center' });
    }
    for (const c of plan.cases) {
        doc.setFontSize(g.taille);
        doc.setTextColor(...(c.reponse ? ENCRE.gris : ENCRE.trait));
        doc.setFont('helvetica', c.signe ? 'normal' : 'bold');
        // LA LIGNE DE BASE, PAS UNE APPROXIMATION. `c.y` est le MILIEU de la
        // rangée ; pour y centrer un chiffre il faut descendre d'une
        // demi-hauteur de capitale — 0,717 em en Helvetica, et un point vaut
        // 0,3528 mm. On descendait de `taille × 0,35`, presque trois fois
        // trop : les chiffres tombaient dans la rangée du dessous, et le trait
        // de la soustraction leur passait au travers comme une rature. Cela ne
        // se voyait qu'à la lecture du PDF — l'aperçu, lui, centrait juste.
        doc.text(pourPdf(c.texte), c.x, c.y + g.taille * 0.1265, { align: 'center' });
    }
    doc.setTextColor(...ENCRE.trait);
}

// --- LE TABLEAU DE CONVERSION, SUR LE PAPIER ------------------------------------

/**
 * La géométrie d'un tableau de conversion : les colonnes d'unités, une ligne
 * par conversion, et l'énoncé de chacune écrit à gauche de sa ligne.
 */
function geoConversion(item, slot) {
    const m = item.meta;
    const b = slot.boite;
    const nCol = m.unites.length;
    const nLignes = m.conversions.length;
    // L'énoncé « 505 mm = ……… m » à gauche, le tableau à droite. L'énoncé
    // prend le tiers : moins, il passe à la ligne et le tableau se décale.
    // « 505,4 mm = ……… dam » : il faut la place de l'écrire d'un trait, sinon
    // l'énoncé passe à la ligne et le tableau se décale d'une conversion à
    // l'autre.
    // LA COLONNE DE L'ÉNONCÉ PORTE AUSSI LA RÉPONSE : « 1,3 km = …… m » —
    // c'est sur ces pointillés-là qu'on écrit, et ils étaient trop courts pour
    // un nombre à virgule. Rémy : « mets un peu plus de pointillés pour noter
    // la réponse ». La colonne s'élargit d'autant : allonger les points sans
    // élargir la colonne les aurait simplement coupés.
    // SANS TABLEAU, l'énoncé prend toute la largeur : c'est l'exercice une fois
    // le tableau su, et il ne reste que les conversions à écrire.
    const avecTableau = m.tableau !== false;
    // LE TABLEAU PASSE AVANT L'ÉNONCÉ — et c'était l'inverse.
    //
    // Rémy : « pour le tableau de conversion, le tableau est tellement
    // compressé, horrible ». Il l'était, et cela se calculait : trois blocs de
    // front font 62 mm chacun, l'énoncé en prenait 40 par plancher, et les SEPT
    // colonnes se partageaient les 20 restants — DEUX MILLIMÈTRES NEUF par
    // colonne. Les en-têtes se touchaient au point de former un seul mot,
    // « kmhndanmdmcmmm », et l'on ne pouvait rien écrire dedans.
    //
    // La colonne de l'énoncé ne prend donc plus que ce qui RESTE après avoir
    // servi le tableau. Une case de conversion doit accueillir un chiffre écrit
    // à la main : six millimètres est le minimum vital, onze le confort — et
    // c'est ce plancher, pas une proportion, qui décide du partage.
    const MIN_CASE = 6, MAX_CASE = 11;
    const enonceIdeal = Math.min(Math.max(b.w * 0.34, 40), 56);
    const enonceW = avecTableau
        // Ce qu'il faudrait laisser au tableau pour que ses cases soient
        // lisibles ; si l'énoncé le lui prend, on le lui reprend.
        ? Math.max(26, Math.min(enonceIdeal, b.w - 2 - nCol * MIN_CASE))
        : b.w;
    const cw = avecTableau
        ? Math.min((b.w - enonceW - 2) / nCol, MAX_CASE)
        : 0;
    // Une rangée d'en-tête, puis une par conversion. Une case de tableau de
    // conversion doit accueillir un chiffre écrit à la main : sept
    // millimètres, c'est l'interligne d'un cahier.
    // SANS TABLEAU, LES CONVERSIONS SE METTENT EN COLONNES.
    //
    // Rémy : « permet plusieurs colonnes pour la conversion, regarde l'espace
    // vide. » Il envoyait la capture d'une feuille où huit conversions
    // descendaient en une seule colonne — « 0,11 dm = ……… mm » fait quatre
    // centimètres — et où les deux tiers droits de la page restaient blancs.
    //
    // Avec le tableau, la question ne se pose pas : le tableau EST large, et
    // la conversion doit être à sa hauteur, sur la même ligne. Sans lui, il ne
    // reste qu'une ligne de texte, et rien n'oblige à n'en mettre qu'une par
    // rangée. On en met donc autant que la largeur en porte — quarante
    // millimètres chacune, la place d'écrire l'énoncé et sa réponse.
    // CINQUANTE-DEUX MILLIMÈTRES, ET NON QUARANTE. Mesuré : à quarante, la
    // page en tenait trois par bloc, mais « 659 dam = ……… dm » s'y coupait
    // après le « d » — on lisait « dr ». Une conversion doit tenir ENTIÈRE,
    // unité comprise : c'est elle, la réponse.
    const LARGEUR_CONVERSION = 52;
    // ET LE MOINS DE COLONNES QUI TIENNE, PAS LE PLUS.
    //
    // Rémy : « pour le tableau de conversion, quand on ne met pas le tableau,
    // c'est tout petit, tout moche et il y a beaucoup d'espaces libres. »
    // MESURÉ sur une feuille sans tableau : huit conversions en deux colonnes
    // occupaient quatre rangées de 9,5 mm — TRENTE-HUIT millimètres sur une
    // page qui en offre deux cents. Le reste était blanc.
    //
    // Empiler en colonnes remplit la LARGEUR ; ce qui restait vide, c'est la
    // HAUTEUR. On prend donc le plus petit nombre de colonnes qui tienne —
    // donc le plus de rangées, donc les lignes les plus hautes — et l'on
    // laisse ensuite la rangée s'étirer. Une conversion s'écrit alors sur une
    // ligne franche, comme sur un cahier, au lieu d'un timbre-poste.
    const colonnesQuiTiennent = Math.max(1, Math.min(4, Math.floor(b.w / LARGEUR_CONVERSION)));
    // DEUX PAR LIGNE, ET C'EST LUI QUI TRANCHE.
    //
    // Rémy : « quand on n'a pas le tableau, ça laisse de l'espace, on pourrait
    // en profiter pour avoir deux conversions par ligne. » La règle d'avant
    // prenait le PLUS PETIT nombre de colonnes qui tienne — donc une seule dès
    // que la hauteur suffisait, ce qui est le cas ordinaire — au motif que
    // c'était la hauteur qui restait blanche. Mais une colonne unique laisse
    // les deux tiers de la LARGEUR vides, et il regarde la feuille : ce vide-là
    // se voit davantage. Deux, donc, dès que deux tiennent.
    const RH_MINI = 7;
    let colonnes = 1;
    if (!avecTableau) {
        colonnes = Math.min(colonnesQuiTiennent, 2);
        // Et davantage seulement si la hauteur ne prend pas les rangées qu'il
        // faudrait : une conversion écrite à la main veut sept millimètres.
        while (colonnes < colonnesQuiTiennent
            && Math.ceil(nLignes / colonnes) * RH_MINI > b.h - 2) colonnes++;
    }
    const parColonne = Math.ceil(nLignes / colonnes);
    // Sans tableau, la rangée a le droit de respirer : seize millimètres, la
    // hauteur d'une ligne de cahier bien aérée, au lieu des neuf et demi que
    // le tableau impose à sa voisine.
    const rhMax = avecTableau ? 9.5 : 16;
    const rh = Math.max(6.5, Math.min((b.h - 2) / (parColonne + (avecTableau ? 1.2 : 0.2)), rhMax));
    const x0 = b.x + enonceW;
    const y0 = b.y + 1;
    const taille = Math.max(7.5, Math.min(rh * 1.15, avecTableau ? 12 : 14));
    // L'ÉNONCÉ NE DÉBORDE PAS SUR LE TABLEAU. Ses points de suspension sont des
    // caractères PLEINE CHASSE — huit d'entre eux valent huit lettres larges —,
    // et « 248 dam = ……………… km » venait s'écrire par-dessus la première colonne
    // dès qu'on a resserré le tableau. On mesure la pire ligne et l'on ajuste.
    const largeurEm = (t) => [...String(t)].reduce(
        (s, ch) => s + (ch === '…' ? 1 : (/[\s.,]/.test(ch) ? 0.3 : 0.56)), 0);
    const pire = Math.max(1, ...m.conversions.map(c => largeurEm(c.enonce)));
    return {
        m, b, nCol, nLignes, cw, rh, x0, y0, enonceW, avecTableau, taille,
        colonnes, parColonne,
        // Où tombe la conversion de rang `r` : une seule colonne avec le
        // tableau, plusieurs sans lui. Les deux rendus — l'aperçu et le PDF —
        // passent par ici, donc ils ne peuvent pas se désaccorder.
        // SANS TABLEAU, PAS DE RANGÉE D'EN-TÊTE À SAUTER. Le « r + 1 » réserve
        // la ligne des unités, en haut du tableau ; quand il n'y a pas de
        // tableau, il ne réserve qu'un trou — c'est le blanc que Rémy voyait
        // au-dessus de la première conversion.
        placeDe: (r) => (colonnes <= 1
            ? { x: b.x, y: y0 + (r + (avecTableau ? 1 : 0)) * rh, w: enonceW - 2 }
            : {
                x: b.x + Math.floor(r / parColonne) * (b.w / colonnes),
                y: y0 + (r % parColonne) * rh,
                w: b.w / colonnes - 2
            }),
        largeur: nCol * cw,
        // En POINTS, comme tout ce qui va dans le PDF ; l'aperçu convertit.
        //
        // LE CORPS SE CALCULE SUR LA COLONNE QUI PORTE LE TEXTE, et non sur le
        // bloc entier : sans tableau, le bloc en contient plusieurs, et un
        // corps calculé sur toute sa largeur débordait de chacune.
        tailleEnonce: Math.max(5, Math.min(taille * 0.92,
            ((avecTableau ? enonceW : b.w / colonnes) - 3) / 0.3528 / pire)),
        // « dam » est le plus large des en-têtes : c'est lui qui fixe leur
        // corps, sans quoi il déborde de sa case dès qu'on resserre le tableau.
        tailleEntete: Math.max(5, Math.min(rh * 1.15, 12, (cw - 0.8) / 0.6))
    };
}

/**
 * LA COULEUR D'UNE COLONNE DE RANG.
 *
 * Rémy : « comment est-ce que le mode couleur intense pourrait être pertinent,
 * car pour l'instant il n'y a pas grand-chose ? » Voici de quoi lui donner du
 * travail : dans un tableau de conversion, la colonne EST l'information. C'est
 * elle qu'on cherche, elle qu'on compte, elle qu'on rate — et c'est ainsi que
 * sont peintes toutes les affiches de classe.
 *
 * TROIS TEINTES, PAS SEPT. Une couleur par unité donnerait un arc-en-ciel où
 * l'on ne repère plus rien. Ce qui compte, c'est le RANG dans le groupe de
 * trois : l'unité principale (km, m, mm), puis ses deux subdivisions. On teinte
 * donc par position modulo trois, et l'unité de base de chaque groupe est la
 * plus soutenue — c'est elle qu'on cherche des yeux.
 *
 * En noir et blanc, le filtre les ramène à trois gris très clairs qui alternent :
 * l'information survit, en plus discret. Rien à faire de plus.
 */
const TEINTES_RANG = ['#dbeafe', '#eef2f7', '#f7f9fc'];

function conversionPreviewHtml(item, slot, k, solution) {
    const g = geoConversion(item, slot);
    const m = g.m;
    let html = '';
    if (g.avecTableau) {
        // LES COLONNES TEINTÉES, SOUS LE QUADRILLAGE. Les aplats se posent en
        // premier : le trait passe par-dessus, sinon la teinte mange la grille.
        m.unites.forEach((u, c) => {
            html += `<div style="position:absolute; left:${(g.x0 + c * g.cw) * k}px;
                top:${g.y0 * k}px; width:${g.cw * k}px;
                height:${((g.nLignes + 1) * g.rh) * k}px;
                background:${TEINTES_RANG[c % 3]}"></div>`;
        });
        // Le quadrillage.
        for (let c = 0; c <= g.nCol; c++) {
            const x = g.x0 + c * g.cw;
            html += `<div style="position:absolute; left:${x * k}px; top:${g.y0 * k}px;
                width:1px; height:${((g.nLignes + 1) * g.rh) * k}px; background:#8d94a5"></div>`;
        }
        for (let r = 0; r <= g.nLignes + 1; r++) {
            const y = g.y0 + r * g.rh;
            html += `<div style="position:absolute; left:${g.x0 * k}px; top:${y * k}px;
                width:${g.largeur * k}px; height:${r === 1 ? 2 : 1}px;
                background:${r === 1 ? '#1a202c' : '#8d94a5'}"></div>`;
        }
        // Les en-têtes — donnés, ou à écrire.
        m.unites.forEach((u, c) => {
            const texte = (m.entetes || solution) ? u : '';
            html += `<div style="position:absolute; left:${(g.x0 + c * g.cw) * k}px; top:${g.y0 * k}px;
                width:${g.cw * k}px; height:${g.rh * k}px; display:flex; align-items:center;
                justify-content:center; font-weight:800;
                color:${m.entetes ? '#1a202c' : '#6e7684'};
                font-size:${g.tailleEntete * 0.3528 * k}px">${echapperSheet(texte)}</div>`;
        });
    }
    // Les énoncés — et, sur la page des solutions, l'égalité complète PLUS le
    // tableau rempli : c'est le placement des chiffres qui est la leçon, et
    // un corrigé qui donne « 1 300 m » sans dire où tombe le 1 n'explique rien.
    m.conversions.forEach((cv, r) => {
        const pl = g.placeDe(r);
        const y = pl.y;
        html += `<div style="position:absolute; left:${pl.x * k}px; top:${y * k}px;
            width:${pl.w * k}px; height:${g.rh * k}px; display:flex;
            align-items:center; font-size:${g.tailleEnonce * 0.3528 * k}px;
            color:#1a202c; white-space:nowrap; overflow:hidden"
            >${echapperSheet(solution ? cv.complet : cv.enonce)}</div>`;
        if (!solution || !g.avecTableau) return;
        (cv.cases || []).forEach(c => {
            html += `<div style="position:absolute; left:${(g.x0 + c.col * g.cw) * k}px;
                top:${y * k}px; width:${g.cw * k}px; height:${g.rh * k}px; display:flex;
                align-items:center; justify-content:center; font-weight:800; color:#6e7684;
                font-size:${g.taille * 0.3528 * k}px">${c.chiffre}</div>`;
        });
        // La virgule, juste après la colonne demandée.
        if (cv.virguleApres >= 0 && cv.virguleApres < g.nCol - 1) {
            html += `<div style="position:absolute;
                left:${(g.x0 + (cv.virguleApres + 1) * g.cw - g.cw * 0.14) * k}px;
                top:${(y + g.rh * 0.3) * k}px; width:${g.cw * 0.28 * k}px;
                height:${g.rh * 0.7 * k}px; display:flex; align-items:flex-end;
                justify-content:center; font-weight:900; color:#1a202c;
                font-size:${g.taille * 0.42 * k}px">,</div>`;
        }
    });
    return html;
}

function dessinerConversionPdf(doc, item, slot, solution) {
    const g = geoConversion(item, slot);
    const m = g.m;
    if (g.avecTableau) {
        // Les colonnes teintées d'abord, le trait par-dessus. `encre` les fait
        // passer par le mode polycopie : en noir et blanc elles deviennent trois
        // gris très clairs qui alternent, et l'information survit.
        const hex = (t) => [1, 3, 5].map(i => parseInt(t.slice(i, i + 2), 16));
        m.unites.forEach((u, c) => {
            doc.setFillColor(...encre(hex(TEINTES_RANG[c % 3])));
            doc.rect(g.x0 + c * g.cw, g.y0, g.cw, (g.nLignes + 1) * g.rh, 'F');
        });
        doc.setDrawColor(...ENCRE.grille);
        doc.setLineWidth(0.25);
        for (let c = 0; c <= g.nCol; c++) {
            const x = g.x0 + c * g.cw;
            doc.line(x, g.y0, x, g.y0 + (g.nLignes + 1) * g.rh);
        }
        for (let r = 0; r <= g.nLignes + 1; r++) {
            const y = g.y0 + r * g.rh;
            // Le trait sous les en-têtes est FRANC : c'est lui qui sépare les
            // unités du travail de l'élève.
            doc.setDrawColor(...(r === 1 ? ENCRE.trait : ENCRE.grille));
            doc.setLineWidth(r === 1 ? 0.5 : 0.25);
            doc.line(g.x0, y, g.x0 + g.largeur, y);
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(g.tailleEntete);
        m.unites.forEach((u, c) => {
            if (!m.entetes && !solution) return;
            doc.setTextColor(...(m.entetes ? ENCRE.trait : ENCRE.gris));
            doc.text(pourPdf(u), g.x0 + (c + 0.5) * g.cw, g.y0 + g.rh * 0.68, { align: 'center' });
        });
    }
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...ENCRE.trait);
    m.conversions.forEach((cv, r) => {
        const pl = g.placeDe(r);
        const y = pl.y;
        doc.setFontSize(g.tailleEnonce);
        doc.setTextColor(...ENCRE.trait);
        doc.text(pourPdf(solution ? cv.complet : cv.enonce), pl.x, y + g.rh * 0.68);
        if (!solution || !g.avecTableau) return;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...ENCRE.gris);
        doc.setFontSize(g.taille);
        (cv.cases || []).forEach(c => {
            doc.text(String(c.chiffre), g.x0 + (c.col + 0.5) * g.cw, y + g.rh * 0.68, { align: 'center' });
        });
        if (cv.virguleApres >= 0 && cv.virguleApres < g.nCol - 1) {
            doc.setTextColor(...ENCRE.trait);
            doc.setFontSize(g.taille * 1.3);
            doc.text(',', g.x0 + (cv.virguleApres + 1) * g.cw, y + g.rh * 0.78, { align: 'center' });
        }
        doc.setFont('helvetica', 'normal');
    });
    doc.setTextColor(...ENCRE.trait);
}

// --- LE COMPTE EST BON, SUR LE PAPIER -------------------------------------------

/**
 * Le but en gros, les six plaques en dessous, et des lignes vides pour
 * chercher. C'est exactement la feuille qu'on distribue en début d'heure.
 *
 * AUTANT DE LIGNES QUE LA SOLUTION EN DEMANDE, PLUS UNE. Une solution plus
 * longue que celle qui a servi à fabriquer le tirage est parfaitement
 * recevable ; une feuille qui n'en laisse pas la place dit le contraire.
 */
function geoCompte(item, slot) {
    const m = item.meta;
    const b = slot.boite;
    const nP = m.plaques.length;
    const plaqueW = Math.min((b.w - 2) / nP - 2, 15);
    const plaqueH = Math.min(plaqueW * 0.72, 10);
    const butH = Math.min(b.h * 0.2, 12);
    const y0 = b.y + 1;
    const yPlaques = y0 + butH + 1.5;
    const yLignes = yPlaques + plaqueH + 3;
    // Le même plafond que la cascade des priorités, et pour la même raison :
    // les lignes de recherche s'écartaient jusqu'à huit millimètres sur une
    // feuille à quatre tirages, et l'on cherchait dans le vide.
    const ligneH = Math.max(5.5, Math.min((b.y + b.h - yLignes - 1) / m.lignes, 7));
    return { m, b, nP, plaqueW, plaqueH, butH, y0, yPlaques, yLignes, ligneH,
        taille: Math.max(7, Math.min(plaqueW * 0.9, 12)) };
}

function comptePreviewHtml(item, slot, k, solution) {
    const g = geoCompte(item, slot);
    const m = g.m;
    let html = `<div style="position:absolute; left:${g.b.x * k}px; top:${g.y0 * k}px;
        width:${g.b.w * k}px; height:${g.butH * k}px; display:flex; align-items:center;
        justify-content:center; font-weight:900; color:#4c1d95;
        font-size:${g.butH * 0.78 * k}px">${m.but}</div>`;
    const largeurTotale = g.nP * g.plaqueW + (g.nP - 1) * 2;
    const xP = g.b.x + (g.b.w - largeurTotale) / 2;
    m.plaques.forEach((p, i) => {
        html += `<div style="position:absolute; left:${(xP + i * (g.plaqueW + 2)) * k}px;
            top:${g.yPlaques * k}px; width:${g.plaqueW * k}px; height:${g.plaqueH * k}px;
            border:1.5px solid #b45309; border-radius:${2 * k}px; background:#fef3c7;
            display:flex; align-items:center; justify-content:center; font-weight:900;
            color:#78350f; font-size:${g.taille * 0.3528 * k}px">${p}</div>`;
    });
    for (let i = 0; i < m.lignes; i++) {
        const y = g.yLignes + i * g.ligneH;
        const texte = solution ? (m.etapes[i] || '') : '';
        html += `<div style="position:absolute; left:${g.b.x * k}px;
            top:${(y + g.ligneH * 0.88) * k}px; width:${g.b.w * k}px; height:1px;
            background:#b0b6c5"></div>`;
        if (!texte) continue;
        html += `<div style="position:absolute; left:${g.b.x * k}px; top:${y * k}px;
            width:${g.b.w * k}px; height:${g.ligneH * k}px; display:flex; align-items:center;
            font-weight:700; color:#6e7684;
            font-size:${g.taille * 0.32 * k}px">${echapperSheet(texte)}</div>`;
    }
    return html;
}

function dessinerComptePdf(doc, item, slot, solution) {
    const g = geoCompte(item, slot);
    const m = g.m;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(g.butH * 2.2);
    doc.setTextColor(...ENCRE.trait);
    doc.text(String(m.but), g.b.x + g.b.w / 2, g.y0 + g.butH * 0.85, { align: 'center' });

    const largeurTotale = g.nP * g.plaqueW + (g.nP - 1) * 2;
    const xP = g.b.x + (g.b.w - largeurTotale) / 2;
    doc.setFontSize(g.taille);
    m.plaques.forEach((p, i) => {
        const x = xP + i * (g.plaqueW + 2);
        doc.setDrawColor(...ENCRE.trait);
        doc.setLineWidth(0.4);
        doc.roundedRect(x, g.yPlaques, g.plaqueW, g.plaqueH, 1.2, 1.2, 'S');
        doc.setTextColor(...ENCRE.trait);
        doc.text(String(p), x + g.plaqueW / 2, g.yPlaques + g.plaqueH * 0.68, { align: 'center' });
    });
    for (let i = 0; i < m.lignes; i++) {
        const y = g.yLignes + i * g.ligneH;
        doc.setDrawColor(...ENCRE.grille);
        doc.setLineWidth(0.22);
        doc.line(g.b.x, y + g.ligneH * 0.88, g.b.x + g.b.w, y + g.ligneH * 0.88);
        if (!solution || !m.etapes[i]) continue;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(g.taille * 0.9);
        doc.setTextColor(...ENCRE.gris);
        doc.text(pourPdf(m.etapes[i]), g.b.x + 1, y + g.ligneH * 0.72);
        doc.setFont('helvetica', 'bold');
    }
    doc.setTextColor(...ENCRE.trait);
}

// --- LE POINT À POINT, SUR LE PAPIER --------------------------------------------

/**
 * Les points sont donnés en pour-cent — mais AUCUN DESSIN N'OCCUPE LES CENT
 * POUR CENT. Un poisson tient dans une bande large et basse, une maison dans un
 * carré plus haut que large. Rapportés tels quels au bloc, ils s'y perdaient
 * dans un coin, minuscules, avec leurs calculs collés les uns aux autres.
 *
 * On recadre donc sur l'étendue RÉELLE des points, en gardant la proportion :
 * le dessin remplit son bloc, et les étiquettes s'écartent d'autant.
 */
function geoPointAPoint(item, slot) {
    const m = item.meta;
    const b = slot.boite;
    const xs = m.points.map(p => p.x), ys = m.points.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const larg = Math.max(1, maxX - minX), haut = Math.max(1, maxY - minY);
    // La marge laisse la place aux étiquettes des points du bord, qui
    // s'écrivent SOUS le point et déborderaient du cadre. Elle a grandi avec
    // elles.
    const marge = 9;
    const k = Math.min((b.w - marge * 2) / larg, (b.h - marge * 2.4) / haut);
    const dessinW = larg * k, dessinH = haut * k;
    const ox = b.x + (b.w - dessinW) / 2;
    const oy = b.y + (b.h - dessinH) / 2 - marge * 0.2;
    const cote = Math.max(dessinW, dessinH);
    return {
        m, cote, x0: ox, y0: oy,
        px: (p) => ox + (p.x - minX) * k,
        py: (p) => oy + (p.y - minY) * k,
        // LE POINT EST UN REPÈRE, PAS UNE PASTILLE. Rémy : « fais des cercles
        // bien plus petits et sur le pdf une écriture un peu plus grande ».
        // C'est le bon ordre des choses : ce qu'on lit, c'est le CALCUL écrit
        // à côté du point ; le point, lui, n'a qu'à dire où poser le crayon.
        // Gros, il mangeait la place de son étiquette et faisait croire qu'on
        // devait le colorier.
        r: Math.max(0.55, cote * 0.008),
        taille: Math.max(7, Math.min(cote * 0.075, 13))
    };
}

function pointAPointPreviewHtml(item, slot, k, solution) {
    const g = geoPointAPoint(item, slot);
    const m = g.m;
    let html = '';
    if (solution) {
        // Le dessin, tracé : c'est la seule correction qui vaille.
        const pts = m.points.slice().sort((a, b) => a.ordre - b.ordre);
        m.segments.forEach(([a, b]) => {
            const A = pts[a - 1], B = pts[b - 1];
            if (!A || !B) return;
            const x1 = g.px(A), y1 = g.py(A), x2 = g.px(B), y2 = g.py(B);
            const L = Math.hypot(x2 - x1, y2 - y1);
            const ang = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
            html += `<div style="position:absolute; left:${x1 * k}px; top:${y1 * k}px;
                width:${L * k}px; height:${Math.max(1, 0.5 * k)}px; background:#6e7684;
                transform-origin:0 50%; transform:rotate(${ang}deg)"></div>`;
        });
    }
    m.points.forEach(p => {
        const x = g.px(p), y = g.py(p);
        html += `<div style="position:absolute; left:${(x - g.r) * k}px; top:${(y - g.r) * k}px;
            width:${g.r * 2 * k}px; height:${g.r * 2 * k}px; border-radius:50%;
            border:1.2px solid #1a202c; background:#fff"></div>`;
        html += `<div style="position:absolute; left:${(x - 12) * k}px; top:${(y + g.r + 0.4) * k}px;
            width:${24 * k}px; text-align:center; font-weight:800; color:#1a202c;
            font-size:${g.taille * 0.3528 * k}px; white-space:nowrap"
            >${echapperSheet(solution ? String(p.ordre) : p.texte)}</div>`;
    });
    return html;
}

function dessinerPointAPointPdf(doc, item, slot, solution) {
    const g = geoPointAPoint(item, slot);
    const m = g.m;
    if (solution) {
        const pts = m.points.slice().sort((a, b) => a.ordre - b.ordre);
        doc.setDrawColor(...ENCRE.gris);
        doc.setLineWidth(0.45);
        m.segments.forEach(([a, b]) => {
            const A = pts[a - 1], B = pts[b - 1];
            if (A && B) doc.line(g.px(A), g.py(A), g.px(B), g.py(B));
        });
    }
    doc.setDrawColor(...ENCRE.trait);
    doc.setFillColor(255, 255, 255);
    doc.setLineWidth(0.35);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(g.taille);
    doc.setTextColor(...ENCRE.trait);
    m.points.forEach(p => {
        const x = g.px(p), y = g.py(p);
        doc.circle(x, y, g.r, 'FD');
        doc.text(pourPdf(solution ? String(p.ordre) : p.texte),
            x, y + g.r + g.taille * 0.42, { align: 'center' });
    });
}

// --- LE DÉDALE, SUR LE PAPIER ---------------------------------------------------

/**
 * Un dédale imprimé, c'est UN QUADRILLAGE DE MURS — pas un dessin de couloirs.
 * On ne trace que les côtés fermés de chaque case ; les côtés ouverts ne
 * s'écrivent pas, et c'est leur absence qui fait le chemin.
 */
function geoDedale(item, slot) {
    const m = item.meta;
    const cote = slot.taille;
    const pas = cote / Math.max(m.cols, m.lignes);
    return {
        m, pas, cote,
        // Le dédale est centré dans son carré : une forme ronde n'occupe pas
        // le rectangle entier de ses colonnes.
        x0: slot.x + (cote - m.cols * pas) / 2,
        y0: slot.y + (cote - m.lignes * pas) / 2
    };
}

/** Les deux bouts d'un mur, en millimètres. */
function segmentMur(g, [x, y, dx, dy]) {
    const X = g.x0 + x * g.pas, Y = g.y0 + y * g.pas, p = g.pas;
    if (dx === 1) return [X + p, Y, X + p, Y + p];
    if (dx === -1) return [X, Y, X, Y + p];
    if (dy === 1) return [X, Y + p, X + p, Y + p];
    return [X, Y, X + p, Y];
}

function dedalePreviewHtml(item, slot, k, solution) {
    const g = geoDedale(item, slot);
    const m = g.m;
    let html = '';
    if (solution) {
        // Le chemin, tracé au milieu des cases.
        for (let i = 1; i < m.solution.length; i++) {
            const [ax, ay] = m.solution[i - 1], [bx, by] = m.solution[i];
            const x1 = g.x0 + (ax + 0.5) * g.pas, y1 = g.y0 + (ay + 0.5) * g.pas;
            const x2 = g.x0 + (bx + 0.5) * g.pas, y2 = g.y0 + (by + 0.5) * g.pas;
            html += `<div style="position:absolute; left:${Math.min(x1, x2) * k}px;
                top:${Math.min(y1, y2) * k}px;
                width:${(Math.abs(x2 - x1) + g.pas * 0.22) * k}px;
                height:${(Math.abs(y2 - y1) + g.pas * 0.22) * k}px;
                background:#c4b5fd; border-radius:${g.pas * 0.11 * k}px;
                transform:translate(${-g.pas * 0.11 * k}px, ${-g.pas * 0.11 * k}px)"></div>`;
        }
    }
    for (const mur of m.murs) {
        const [x1, y1, x2, y2] = segmentMur(g, mur);
        html += `<div style="position:absolute; left:${x1 * k}px; top:${y1 * k}px;
            width:${Math.max(1, (x2 - x1) * k || 1.2)}px;
            height:${Math.max(1, (y2 - y1) * k || 1.2)}px; background:#1a202c"></div>`;
    }
    const rond = (c, cls) => {
        const cx = g.x0 + (c[0] + 0.5) * g.pas, cy = g.y0 + (c[1] + 0.5) * g.pas;
        const r = g.pas * 0.3;
        return `<div style="position:absolute; left:${(cx - r) * k}px; top:${(cy - r) * k}px;
            width:${r * 2 * k}px; height:${r * 2 * k}px; background:#1a202c;
            border-radius:${cls === 'rond' ? '50%' : '0'}"></div>`;
    };
    html += rond(m.depart, 'rond') + rond(m.arrivee, 'carre');
    return html;
}

function dessinerDedalePdf(doc, item, slot, solution) {
    const g = geoDedale(item, slot);
    const m = g.m;
    if (solution) {
        doc.setDrawColor(...ENCRE.grille);
        doc.setLineWidth(g.pas * 0.42);
        doc.setLineJoin('round');
        for (let i = 1; i < m.solution.length; i++) {
            const [ax, ay] = m.solution[i - 1], [bx, by] = m.solution[i];
            doc.line(g.x0 + (ax + 0.5) * g.pas, g.y0 + (ay + 0.5) * g.pas,
                g.x0 + (bx + 0.5) * g.pas, g.y0 + (by + 0.5) * g.pas);
        }
    }
    doc.setDrawColor(...ENCRE.trait);
    doc.setLineWidth(Math.max(0.35, g.pas * 0.11));
    for (const mur of m.murs) {
        const [x1, y1, x2, y2] = segmentMur(g, mur);
        doc.line(x1, y1, x2, y2);
    }
    doc.setFillColor(...ENCRE.trait);
    const r = g.pas * 0.3;
    doc.circle(g.x0 + (m.depart[0] + 0.5) * g.pas, g.y0 + (m.depart[1] + 0.5) * g.pas, r, 'F');
    doc.rect(g.x0 + (m.arrivee[0] + 0.5) * g.pas - r, g.y0 + (m.arrivee[1] + 0.5) * g.pas - r,
        r * 2, r * 2, 'F');
}

/**
 * LES TRACÉS D'UN GLYPHE, LUS UNE FOIS ET RETENUS.
 *
 * `GLYPHES` (core/figures.js) porte, pour chaque valeur, un groupe SVG :
 * un « translate … scale » suivi d'un ou plusieurs chemins. Le navigateur sait
 * le lire ; le PDF, non. On en extrait donc ce dont jsPDF a besoin — le tracé,
 * sa transformation, son style — et on le garde : relire la même chaîne à
 * chaque hiéroglyphe imprimé, sur une feuille qui en compte cent, se paie.
 */
const TRACES_GLYPHES = new Map();

function tracesDuGlyphe(valeur) {
    if (TRACES_GLYPHES.has(valeur)) return TRACES_GLYPHES.get(valeur);
    const src = GLYPHES[valeur] || '';
    const tr = /translate\(([-\d.]+) ([-\d.]+)\) scale\(([\d.]+)\)/.exec(src);
    const tx = tr ? parseFloat(tr[1]) : 0;
    const ty = tr ? parseFloat(tr[2]) : 0;
    const k = tr ? parseFloat(tr[3]) : 1;
    const out = [];
    for (const m of src.matchAll(/<path\b([^>]*)\/>/g)) {
        const attrs = m[1];
        const d = (/\sd="([^"]+)"/.exec(attrs) || [])[1];
        if (!d) continue;
        const rempli = /fill="currentColor"/.test(attrs);
        const creux = /class="egy-creux"/.test(attrs);
        const trait = /stroke="currentColor"/.test(attrs);
        const ep = (/stroke-width="([\d.]+)"/.exec(attrs) || [])[1];
        // Un chemin sans remplissage NI trait ne dessine rien : on l'écarte
        // plutôt que d'appeler jsPDF avec un style vide, qui remplirait en noir.
        if (!rempli && !creux && !trait) continue;
        out.push({
            d, tx, ty, k, creux,
            style: (rempli || creux ? 'F' : '') + (trait ? 'D' : ''),
            epaisseur: ep ? parseFloat(ep) : 10
        });
    }
    TRACES_GLYPHES.set(valeur, out);
    return out;
}

// --- LES NOMBRES DES PHARAONS, SUR LE PAPIER ------------------------------------

/**
 * Un rang par ligne, du plus grand au plus petit — comme à l'écran.
 *
 * DEUX SENS. « Lire » imprime les glyphes et laisse une ligne pour le nombre ;
 * « écrire » imprime le nombre et laisse un cadre vide à remplir. Le second est
 * le plus instructif : c'est en CHOISISSANT les symboles qu'on découvre que
 * leur position ne compte pas.
 */
/** « 32100 » -> « 32 100 » : un nombre se lit par tranches de trois. */
function nombreEspace(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
}

// La part du bloc réservée au nombre et à son « = ». Assez large pour un
// million sans jamais manger la place où l'on dessine les glyphes.
//
// QUARANTE-DEUX POUR CENT, ET NON TRENTE. Rémy, sur l'aperçu de sa feuille :
// « écris les nombres plus gros ». MESURÉ : à trente pour cent d'un bloc de
// 86 mm, la colonne du nombre faisait 25,8 mm, et le corps qui s'en déduit —
// il doit loger « 1 000 000  = », douze signes — tombait à 3,4 mm, soit dix
// points. Or dans le sens « écrire », CE NOMBRE EST L'ÉNONCÉ : c'est la seule
// chose à lire du bloc, et le reste de la ligne n'est que des pointillés.
const LARGEUR_NOMBRE = 0.42;

function geoEgypte(item, slot, tous) {
    const m = item.meta;
    const b = slot.boite;
    // LES SYMBOLES S'ÉCRIVENT À LA SUITE, comme à l'écran : c'est le même
    // placement, calculé au même endroit (core/figures.js). Un rang par ligne
    // donnait au nombre l'allure d'un tableau de numération, et la feuille ne
    // disait pas la même chose que le jeu.
    const plan = placerGlyphes(m.symboles);
    const INTERLIGNE = 0.16;
    const hautCases = plan.lignes + (plan.lignes - 1) * INTERLIGNE;
    // La ligne de réponse, en bas, prend sa part de la hauteur.
    const hDispo = b.h - 8;
    // « ÉCRIS 32 100 EN HIÉROGLYPHES » : LE NOMBRE EST L'ÉNONCÉ, PAS LA
    // RÉPONSE. Il était écrit SOUS la ligne de réponse, au milieu, et la place
    // à remplir se trouvait au-dessus, muette : on croyait lire une correction.
    // Rémy : « des hiéroglyphes au nombre. Tu écris les hiéroglyphes : ……… ».
    // Le nombre passe donc devant, suivi d'un « = », et la place de dessiner
    // vient après lui, sur la même ligne — comme au cahier.
    // LES DEUX SENS S'ÉCRIVENT SUR UNE SEULE LIGNE. Rémy : « écris le nombre en
    // hiéroglyphes puis : puis les pointillés sur la même ligne, idem dans
    // l'autre sens. » Dans le sens « lire », les glyphes étaient posés en haut
    // du bloc et la ligne de réponse dessous : deux étages, alors que l'élève
    // écrit « ▯▯▯ = 132 » d'un trait sur son cahier. Les glyphes prennent
    // maintenant la colonne de gauche, le « = » les suit, et les pointillés
    // courent à leur droite — sur la MÊME ligne de base.
    const ecrire = m.sens === 'ecrire';
    const texte = ecrire ? `${nombreEspace(m.total)}  =` : '';
    // UNE COLONNE DE MÊME LARGEUR POUR TOUS LES NOMBRES DE LA FEUILLE.
    //
    // Rémy : « la présentation des hiéroglyphes est curieuse ». Elle l'était :
    // la colonne se calculait sur la longueur de CE nombre-là, si bien que
    // « 404 » et « 30 103 » ne commençaient pas au même endroit, que les « = »
    // ne s'alignaient pas, et que les pointillés n'avaient pas deux fois la
    // même longueur. Une part fixe du bloc, et tout se met en colonne.
    // LA COLONNE DE GAUCHE. En « écrire », c'est le nombre suivi du « = ». En
    // « lire », ce sont les GLYPHES suivis du « = » : même géométrie, même
    // alignement d'un bloc à l'autre.
    // SOIXANTE-DOUZE POUR CENT AUX GLYPHES. « Utilise bien la largeur pour
    // écrire les hiéroglyphes assez grand » : c'est la LARGEUR qui les bride,
    // pas la hauteur — sept symboles dans la moitié d'un bloc donnent des
    // signes de six millimètres. Ce qui reste — un quart de bloc, soit deux
    // bons centimètres — suffit largement à écrire « 10 033 ».
    const PART_GLYPHES = 0.72;
    const largeurTexte = b.w * (ecrire ? LARGEUR_NOMBRE : PART_GLYPHES);
    // Le corps est calculé sur le PLUS LONG nombre possible — « 1 000 000  = »,
    // douze signes — et non sur celui qu'on a sous la main : sinon un nombre
    // court s'écrirait plus gros que son voisin, et l'on retomberait dans le
    // dépareillé qu'on vient de corriger.
    // Le plafond monte avec la colonne : à 4,6 mm il bornait un corps que la
    // largeur ne bornait plus.
    const corpsTexte = ecrire
        ? Math.min(6.5, (largeurTexte - 2) / (12 * 0.58))
        : 0;
    // « UTILISE BIEN LA LARGEUR POUR ÉCRIRE LES HIÉROGLYPHES ASSEZ GRAND. »
    // En « lire », les glyphes disposent de leur colonne moins la place du
    // signe égal ; le plafond passe de seize à vingt millimètres, parce qu'ils
    // ne partagent plus la hauteur avec une ligne de réponse posée dessous.
    const LARGEUR_EGAL = 7;
    const largeurGlyphes = ecrire ? b.w - largeurTexte : largeurTexte - LARGEUR_EGAL;
    // UN BÂTON A LA MÊME TAILLE PARTOUT SUR LA FEUILLE.
    //
    // Rémy : « il faut que les nombres de pharaons soient écrits à la même
    // taille de chaque caractère. »
    //
    // LA CASE SE CALCULAIT SUR CE NOMBRE-CI. Trois symboles remplissaient leur
    // colonne, neuf devaient s'y serrer — et le même bâton se retrouvait deux
    // fois plus petit d'un bloc à l'autre. L'élève à qui l'on demande de
    // COMPTER des signes se met alors à comparer des tailles qui ne veulent
    // rien dire.
    //
    // Le raisonnement était déjà écrit vingt lignes plus haut, pour le corps
    // du nombre : « calculé sur le PLUS LONG nombre possible, sinon un nombre
    // court s'écrirait plus gros que son voisin ». Il ne manquait qu'à
    // l'appliquer aux glyphes. La référence est le nombre le plus large DE
    // CETTE FEUILLE — pas un pire cas théorique à trente-six signes, qui
    // rapetisserait tout le monde pour un nombre qui n'y est pas.
    const plans = (tous && tous.length ? tous : [item])
        .map(it => placerGlyphes((it.meta && it.meta.symboles) || []));
    const refLargeur = Math.max(plan.largeur, ...plans.map(x => x.largeur));
    const refHaut = Math.max(hautCases,
        ...plans.map(x => x.lignes + (x.lignes - 1) * INTERLIGNE));
    const cell = Math.min(
        largeurGlyphes / (refLargeur + 0.3),
        hDispo / (refHaut + 0.3),
        ecrire ? 16 : 20
    );
    // La ligne de base : sous les glyphes en « lire », sous le nombre en
    // « écrire ». Dans les deux cas, TOUT est dessus.
    const hautGlyphes = hautCases * cell;
    return {
        m, b, plan, cell, interligne: INTERLIGNE, ecrire, texte, largeurTexte, corpsTexte,
        largeurEgal: LARGEUR_EGAL,
        rangs: plan.lignes, colonnes: plan.largeur, hautCases,
        x0: b.x + 1 + (ecrire ? largeurTexte : 0),
        y0: b.y + 1,
        yReponse: b.y + 2 + hautGlyphes,
        // Les glyphes sont dessinés dans une case de 24 × 32.
        k: cell / 32
    };
}

function egyptePreviewHtml(item, slot, k, solution, _rang, tous) {
    const g = geoEgypte(item, slot, tous);
    const m = g.m;
    let html = '';
    if (m.sens === 'lire' || solution) {
        // L'APERÇU DESSINE CE QUE LE PDF DESSINE, au même endroit.
        //
        // Rémy : « l'exercice 7 est très mal présenté et mal aligné ». Il
        // l'était, et la faute revenait à ce bloc : il posait le SVG DE
        // L'ÉCRAN — qui porte douze pixels de marge sur chaque bord — dans une
        // boîte calculée par la géométrie du PDF, laquelle n'en a aucune. Les
        // deux cadres n'avaient donc ni la même taille ni les mêmes
        // proportions, et `meet` réduisait chaque nombre d'un facteur
        // DIFFÉRENT selon sa longueur. D'où les rangées qui ne commençaient
        // pas au même endroit et les signes deux fois plus gros d'une ligne à
        // l'autre.
        //
        // LA HAUTEUR OUBLIAIT AUSSI LES INTERLIGNES (`rangs` au lieu de
        // `hautCases`) : sur un nombre à deux rangées, le dessin était en plus
        // écrasé vers le haut de sa boîte, et le « = » se retrouvait à flotter
        // sous un dessin qui ne le touchait pas.
        html += `<div style="position:absolute; left:${g.x0 * k}px; top:${g.y0 * k}px;
            width:${(g.colonnes * g.cell) * k}px; height:${(g.hautCases * g.cell) * k}px;
            color:#1a202c">${egyptianSvgCadre(m.symboles.map(s => ({ value: s.value, n: s.n })))
        .replace('<svg ', '<svg style="width:100%;height:100%" ')}</div>`;
    }
    // L'énoncé du sens « écrire » : le nombre, puis le signe d'égalité, à
    // hauteur des glyphes qu'il faudra tracer à côté.
    if (g.ecrire) {
        // LE NOMBRE S'ASSOIT SUR LA LIGNE, comme au cahier : « 1 400 = » puis
        // les pointillés, d'un seul tenant. Centré dans toute la hauteur du
        // bloc, il flottait un centimètre au-dessus de la ligne qu'il annonce,
        // et l'on ne lisait plus une phrase mais deux étages. Le rembourrage
        // du bas vaut la descente de la police : c'est ce qui pose la ligne
        // de base du texte exactement sur le trait.
        html += `<div style="position:absolute; left:${g.b.x * k}px;
            top:${(g.yReponse - 8) * k}px; width:${g.largeurTexte * k}px; height:${8 * k}px;
            display:flex; align-items:flex-end; justify-content:flex-end;
            padding-bottom:${g.corpsTexte * 0.21 * k}px; box-sizing:border-box;
            font-weight:800; color:#1a202c; font-size:${g.corpsTexte * k}px;
            white-space:nowrap">${echapperSheet(g.texte)}</div>`;
    }
    // LE SIGNE ÉGAL APRÈS LES GLYPHES. Sans lui, la ligne de pointillés posée à
    // droite d'un dessin ne dit pas ce qu'on attend ; avec, on lit « ▯▯▯ = … »
    // exactement comme on l'écrirait au cahier.
    if (!g.ecrire) {
        html += `<div style="position:absolute;
            left:${(g.b.x + g.largeurTexte - g.largeurEgal) * k}px;
            top:${(g.yReponse - 7) * k}px; width:${g.largeurEgal * k}px; height:${7 * k}px;
            display:flex; align-items:flex-end; justify-content:center;
            padding-bottom:${1 * k}px; box-sizing:border-box;
            font-weight:800; color:#1a202c; font-size:${4.4 * k}px">=</div>`;
    }
    const bas = m.sens === 'lire' ? (solution ? nombreEspace(m.total) : '') : '';
    html += `<div style="position:absolute; left:${(g.b.x + g.largeurTexte) * k}px;
        top:${g.yReponse * k}px; width:${(g.b.w - g.largeurTexte) * k}px; height:${6 * k}px;
        display:flex; align-items:center; justify-content:flex-start;
        border-top:1px dotted #9aa3b2; font-weight:800;
        color:${solution ? '#6e7684' : '#1a202c'};
        font-size:${4.2 * k}px">${echapperSheet(bas)}</div>`;
    return html;
}

function dessinerEgyptePdf(doc, item, slot, solution, _c, _rang, tous) {
    const g = geoEgypte(item, slot, tous);
    const m = g.m;
    if (m.sens === 'lire' || solution) {
        g.plan.cases.forEach((c) => {
            const traces = tracesDuGlyphe(c.value);
            const x = g.x0 + c.col * g.cell;
            const y = g.y0 + c.ligne * (1 + g.interligne) * g.cell;
            for (const t of traces) {
                // Le tracé est écrit dans les coordonnées du dessin de Rémy ;
                // « translate » et « scale » du groupe le ramènent dans sa
                // case de 24 × 32, et g.k dans le bloc imprimé.
                const k = t.k * g.cell / 32;
                if (t.style.includes('F')) {
                    doc.setFillColor(...(t.creux ? [255, 255, 255] : ENCRE.trait));
                }
                if (t.style.includes('S')) {
                    doc.setDrawColor(...ENCRE.trait);
                    doc.setLineWidth(Math.max(0.18, (t.epaisseur || 10) * k));
                    doc.setLineJoin('round');
                }
                dessinerChemin(doc, t.d, {
                    x: x + t.tx * g.cell / 32,
                    y: y + t.ty * g.cell / 32,
                    k,
                    // La couleur à reprendre après avoir évidé un trou.
                    encre: t.creux ? [255, 255, 255] : ENCRE.trait
                }, t.style);
            }
        });
    }
    doc.setDrawColor(...ENCRE.grille);
    doc.setLineWidth(0.3);
    doc.line(g.b.x + g.largeurTexte, g.yReponse, g.b.x + g.b.w, g.yReponse);

    if (g.ecrire) {
        doc.setFont('helvetica', 'bold');
        // La MÊME taille qu'à l'aperçu : elle est donnée en millimètres.
        doc.setFontSize(g.corpsTexte / 0.3528);
        doc.setTextColor(...ENCRE.trait);
        // La même ligne de base qu'à l'aperçu : le trait.
        doc.text(pourPdf(g.texte), g.b.x + g.largeurTexte - 1, g.yReponse, { align: 'right' });
    }

    const bas = m.sens === 'lire' ? (solution ? nombreEspace(m.total) : '') : '';
    if (!bas) return;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...(solution ? ENCRE.gris : ENCRE.trait));
    doc.text(pourPdf(bas), g.b.x + g.largeurTexte + 2, g.yReponse + 5, { align: 'left' });
    doc.setTextColor(...ENCRE.trait);
}

// --- L'AXE GRADUÉ, SUR LE PAPIER --------------------------------------------
//
// « Sur l'axe ci-dessus, écris l'abscisse du point » — et il n'y avait pas
// d'axe. L'exercice n'avait pas de rendu imprimé : sur la feuille, il sortait
// en questions de texte, et la question renvoyait à un dessin absent. Elle
// était donc, mot pour mot, impossible.
//
// Le dessin est le même que celui de l'écran (core/figures.js, `axeSvg`), mais
// refait ici en géométrie de page : la feuille travaille en millimètres et le
// PDF ne sait pas rendre un SVG.

/** Les décimales de la réponse, par échelle. */
const RANG_GRADUATION = { unites: 0, dixiemes: 1, centiemes: 2 };

function ecrireDecimal(v, rang) {
    return v.toFixed(rang).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '').replace('.', ',');
}

function geoGraduation(item, slot) {
    const m = item.meta || {};
    const rang = RANG_GRADUATION[m.zoom] ?? 1;
    // TOUT SE CALE SUR LA BOÎTE DU BLOC, jamais sur `slot.taille` : celle-ci
    // est le côté d'un emplacement CARRÉ, et un axe est large et bas. Mesurée
    // au carré, l'écriture sortait trois fois trop grosse et le trait de
    // réponse allait se poser sur l'axe suivant.
    const b = slot.boite || { x: slot.x, y: slot.y, w: slot.taille, h: slot.taille };
    const marge = b.w * 0.06;
    const x0 = b.x + marge;
    const larg = b.w - 2 * marge;
    const pas = larg / 10;
    const cran = Math.min(b.h * 0.15, pas * 0.65);
    return {
        m, rang, x0, larg, pas, cran, boite: b,
        // L'axe en haut du bloc, les nombres dessous, la réponse tout en bas.
        yAxe: b.y + b.h * 0.30,
        yNombres: b.y + b.h * 0.30 + cran + Math.max(2.2, b.h * 0.16),
        yEcrit: b.y + b.h * 0.90,
        // La taille du texte est en POINTS : c'est l'unité du PDF, et l'aperçu
        // la convertit en millimètres (1 pt ≈ 0,3528 mm).
        pt: Math.max(6, Math.min(11, b.h * 0.42)),
        px: (i) => x0 + i * pas
    };
}

function graduationPreviewHtml(item, slot, k, solution) {
    const g = geoGraduation(item, slot);
    const m = g.m;
    let html = '';

    // L'axe, et la flèche : sans elle, c'est un trait, pas un axe.
    const bout = g.pas * 0.5;
    html += `<div style="position:absolute; left:${g.x0 * k}px; top:${g.yAxe * k}px;
        width:${(g.larg + bout) * k}px; height:${Math.max(1, 0.5 * k)}px; background:#1a202c"></div>`;
    html += `<svg style="position:absolute; left:0; top:0; width:100%; height:100%; overflow:visible">
        <path d="M ${((g.x0 + g.larg + bout) * k).toFixed(2)} ${(g.yAxe * k).toFixed(2)}
                 l ${(-g.cran * 0.55 * k).toFixed(2)} ${(-g.cran * 0.3 * k).toFixed(2)}
                 l 0 ${(g.cran * 0.6 * k).toFixed(2)} Z" fill="#1a202c"/></svg>`;

    // Onze traits : les dix intervalles, et les deux bouts plus longs.
    for (let i = 0; i <= 10; i++) {
        const grand = i === 0 || i === 10;
        const h = grand ? g.cran : g.cran * 0.5;
        html += `<div style="position:absolute; left:${g.px(i) * k}px;
            top:${(g.yAxe - h) * k}px; width:${Math.max(1, 0.45 * k)}px;
            height:${2 * h * k}px; background:#1a202c"></div>`;
    }

    // Seuls les deux bouts sont chiffrés : tout le reste EST la question.
    const police = g.pt * 0.3528 * k;
    [[0, m.debut], [10, m.fin]].forEach(([i, v]) => {
        html += `<div style="position:absolute; left:${(g.px(i) - g.pas) * k}px;
            top:${(g.yNombres - g.pt * 0.3528) * k}px; width:${2 * g.pas * k}px;
            text-align:center; font-size:${police}px; font-weight:700;
            color:#1a202c">${ecrireDecimal(v, g.rang)}</div>`;
    });

    // La croix marque le point : elle désigne le trait sans le recouvrir.
    const xp = g.px(m.crans), r = g.cran * 0.5;
    html += `<svg style="position:absolute; left:0; top:0; width:100%; height:100%; overflow:visible">
        <g stroke="#c0392b" stroke-width="${(0.55 * k).toFixed(2)}" stroke-linecap="round">
            <line x1="${((xp - r) * k).toFixed(2)}" y1="${((g.yAxe - r) * k).toFixed(2)}"
                  x2="${((xp + r) * k).toFixed(2)}" y2="${((g.yAxe + r) * k).toFixed(2)}"/>
            <line x1="${((xp - r) * k).toFixed(2)}" y1="${((g.yAxe + r) * k).toFixed(2)}"
                  x2="${((xp + r) * k).toFixed(2)}" y2="${((g.yAxe - r) * k).toFixed(2)}"/>
        </g></svg>`;

    // Où écrire la réponse : à gauche du bloc, sous l'axe.
    const xMot = g.boite.x + g.boite.w * 0.06;
    const xTrait = xMot + g.pt * 0.3528 * 5.4;
    const lTrait = g.boite.w * 0.30;
    html += `<div style="position:absolute; left:${xMot * k}px;
        top:${(g.yEcrit - g.pt * 0.3528) * k}px; font-size:${police}px;
        font-weight:700; color:#1a202c; white-space:nowrap">Abscisse :</div>`;
    if (solution) {
        html += `<div style="position:absolute; left:${xTrait * k}px;
            top:${(g.yEcrit - g.pt * 0.3528) * k}px; font-size:${police}px;
            font-weight:800; color:#2f855a">${ecrireDecimal(m.valeur, g.rang)}</div>`;
    } else {
        html += `<div style="position:absolute; left:${xTrait * k}px; top:${g.yEcrit * k}px;
            width:${lTrait * k}px; height:0; border-top:${Math.max(1, 0.4 * k)}px dotted #a8b0bf"></div>`;
    }
    return html;
}

function dessinerGraduationPdf(doc, item, slot, solution) {
    const g = geoGraduation(item, slot);
    const m = g.m;
    const bout = g.pas * 0.5;

    doc.setDrawColor(...ENCRE.trait);
    doc.setLineWidth(0.5);
    doc.line(g.x0, g.yAxe, g.x0 + g.larg + bout, g.yAxe);
    doc.setFillColor(...ENCRE.trait);
    doc.triangle(g.x0 + g.larg + bout, g.yAxe,
        g.x0 + g.larg + bout - g.cran * 0.55, g.yAxe - g.cran * 0.3,
        g.x0 + g.larg + bout - g.cran * 0.55, g.yAxe + g.cran * 0.3, 'F');

    doc.setLineWidth(0.45);
    for (let i = 0; i <= 10; i++) {
        const h = (i === 0 || i === 10) ? g.cran : g.cran * 0.5;
        doc.line(g.px(i), g.yAxe - h, g.px(i), g.yAxe + h);
    }

    doc.setTextColor(...ENCRE.texte);
    doc.setFontSize(g.pt);
    doc.text(ecrireDecimal(m.debut, g.rang), g.px(0), g.yNombres, { align: 'center' });
    doc.text(ecrireDecimal(m.fin, g.rang), g.px(10), g.yNombres, { align: 'center' });

    // La croix du point, à l'encre du trait : une photocopie ne garde pas la
    // couleur, et une croix rouge devenue grise doit rester la plus marquée.
    const xp = g.px(m.crans), r = g.cran * 0.55;
    doc.setLineWidth(0.7);
    doc.line(xp - r, g.yAxe - r, xp + r, g.yAxe + r);
    doc.line(xp - r, g.yAxe + r, xp + r, g.yAxe - r);

    const xMot = g.boite.x + g.boite.w * 0.06;
    const xTrait = xMot + g.pt * 0.3528 * 5.4;
    doc.setFontSize(g.pt);
    doc.text('Abscisse :', xMot, g.yEcrit);
    if (solution) {
        doc.setTextColor(...ENCRE.gris);
        doc.text(ecrireDecimal(m.valeur, g.rang), xTrait, g.yEcrit);
    } else {
        // `ENCRE.gris`, et non un `ENCRE.pointille` qui n'a jamais existé :
        // l'étalement d'une clef absente lève une TypeError, et c'est la
        // FEUILLE DE QUESTIONS qui passe par ici — celle qu'on imprime
        // toujours. Le corrigé, lui, prend l'autre branche et s'en tirait.
        doc.setDrawColor(...ENCRE.gris);
        doc.setLineWidth(0.35);
        doc.setLineDashPattern([0.8, 0.8], 0);
        doc.line(xTrait, g.yEcrit, xTrait + g.boite.w * 0.30, g.yEcrit);
        doc.setLineDashPattern([], 0);
    }
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
function geoQuadrillage(item, slot) {
    const m = item.meta || {};
    const b = slot.boite || { x: slot.x, y: slot.y, w: slot.taille, h: slot.taille };
    const L = Math.max(1, m.largeur || 10), H = Math.max(1, m.hauteur || 10);
    // Le carreau est CARRÉ, sinon ce n'est plus un quadrillage : on prend le
    // plus petit des deux pas possibles et l'on centre ce qui reste.
    // Une bande est réservée EN BAS pour la légende : sans elle, deux
    // quadrillages voisins de la même feuille ne se distinguent pas — un axe
    // vertical et un centre posé sur la même colonne se ressemblent beaucoup.
    const pt = Math.max(5.5, Math.min(9, b.h * 0.055));
    const legendeH = pt * 0.3528 * 1.7;
    const pas = Math.min((b.w * 0.92) / L, ((b.h - legendeH) * 0.94) / H);
    return {
        m, L, H, pas, boite: b, pt, legendeH,
        x0: b.x + (b.w - pas * L) / 2,
        y0: b.y + (b.h - legendeH - pas * H) / 2,
        yLegende: b.y + b.h - pt * 0.3528 * 0.35
    };
}

/**
 * La légende d'un bloc : QUELLE transformation, en trois mots.
 *
 * Le dessin dit déjà où passe l'axe ou où se trouve le centre, mais il ne dit
 * pas tout : une croix marque aussi bien le centre d'une symétrie que celui
 * d'un quart de tour, et le SENS du quart de tour ne se dessine pas lisiblement
 * dans trois millimètres. On l'écrit.
 */
function qLegende(m) {
    const t = m.transfo || {};
    if (t.genre === 'axiale') return 'Symétrie d\'axe (d)';
    if (t.genre === 'centrale') return 'Symétrie de centre O';
    if (t.genre === 'translation') return 'Translation du vecteur tracé';
    if (t.genre === 'rotation') {
        return `Quart de tour, sens ${SENS_ROTATION[t.quarts] ? SENS_ROTATION[t.quarts].nom : 'indirect'}, autour de O`;
    }
    return '';
}

/** Le centre d'une case, en millimètres — le demi-carreau est ici. */
const qCentre = (g, v, axe) => (axe === 'x' ? g.x0 : g.y0) + (v + 0.5) * g.pas;
/**
 * LE VECTEUR SE POSE SUR LES NŒUDS DU QUADRILLAGE, PAS AU MILIEU DES CASES.
 *
 * Rémy : « pour les flèches des translations, il faut qu'elle soit sur les
 * traits de la grille ». Partie du centre d'un carreau, la flèche flottait
 * dans le blanc : pour lire « trois carreaux vers le bas », l'élève devait
 * estimer où elle commençait. D'un nœud à l'autre, elle longe les traits et
 * se compte du regard — c'est ainsi qu'on trace un vecteur au tableau.
 *
 * La croix d'un CENTRE de symétrie, elle, reste au milieu de sa case : c'est
 * là qu'elle est, et l'y déplacer changerait la réponse.
 */
const qNoeud = (g, v, axe) => (axe === 'x' ? g.x0 : g.y0) + v * g.pas;

/**
 * Les deux bouts du trait qui porte l'axe, déjà rabotés au quadrillage.
 * Rendus à part parce que c'est la seule partie du dessin qui demande à
 * réfléchir, et qu'elle doit être identique dans l'aperçu et dans le PDF.
 */
function qBoutsDeLAxe(g, axe) {
    if (!axe) return null;
    const X = (v) => g.x0 + v * g.pas, Y = (v) => g.y0 + v * g.pas;
    if (axe.type === 'v') { const x = X(axe.a + 0.5); return [x, Y(0), x, Y(g.H)]; }
    if (axe.type === 'h') { const y = Y(axe.a + 0.5); return [X(0), y, X(g.L), y]; }
    // Les obliques : y = x + a, ou y = −x + a + 1, en coordonnées de dessin.
    // On coupe la droite aux quatre bords, et l'on garde ce qui tombe dedans.
    const pente = axe.type === 'd' ? 1 : -1;
    const b = axe.type === 'd' ? axe.a : axe.a + 1;
    const pts = [];
    [[0, b], [g.L, pente * g.L + b]].forEach(([x, y]) => pts.push([x, y]));
    [[0, 'y'], [g.H, 'y']].forEach(([y]) => pts.push([(y - b) / pente, y]));
    const dedans = pts.filter(([x, y]) => x >= -0.001 && x <= g.L + 0.001 && y >= -0.001 && y <= g.H + 0.001);
    if (dedans.length < 2) return null;
    const [p1, p2] = [dedans[0], dedans[dedans.length - 1]];
    return [X(p1[0]), Y(p1[1]), X(p2[0]), Y(p2[1])];
}

function quadrillagePreviewHtml(item, slot, k, solution) {
    const g = geoQuadrillage(item, slot);
    const m = g.m;
    const t = m.transfo || {};
    let html = '';

    const carre = (c, fond, bord) => `<div style="position:absolute;
        left:${(g.x0 + c.x * g.pas) * k}px; top:${(g.y0 + c.y * g.pas) * k}px;
        width:${g.pas * k}px; height:${g.pas * k}px;
        background:${fond}; ${bord ? `outline:${Math.max(1, 0.4 * k)}px solid ${bord}; outline-offset:-1px;` : ''}"></div>`;

    (m.depart || []).forEach(c => { html += carre(c, 'rgba(120,128,150,.30)'); });
    if (solution) (m.image || []).forEach(c => { html += carre(c, 'rgba(120,128,150,.16)', '#6e7684'); });

    const traits = [];
    for (let i = 0; i <= g.L; i++) {
        traits.push(`<line x1="${((g.x0 + i * g.pas) * k).toFixed(2)}" y1="${(g.y0 * k).toFixed(2)}"
            x2="${((g.x0 + i * g.pas) * k).toFixed(2)}" y2="${((g.y0 + g.H * g.pas) * k).toFixed(2)}"/>`);
    }
    for (let j = 0; j <= g.H; j++) {
        traits.push(`<line x1="${(g.x0 * k).toFixed(2)}" y1="${((g.y0 + j * g.pas) * k).toFixed(2)}"
            x2="${((g.x0 + g.L * g.pas) * k).toFixed(2)}" y2="${((g.y0 + j * g.pas) * k).toFixed(2)}"/>`);
    }

    // L'APERÇU DOIT MONTRER EXACTEMENT CE QUE LE PDF IMPRIMERA — nom de l'axe,
    // lettre du centre, pointe de la flèche compris. Sans la pointe, un vecteur
    // n'est qu'un segment et le sens du glissement se perd ; le professeur
    // validerait à l'écran une feuille que ses élèves ne pourraient pas faire.
    const marques = [];
    const nom = (x, y, texte) => `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}"
        font-size="${(g.pt * 0.3528 * k).toFixed(2)}" font-weight="700"
        font-style="italic" fill="#1a202c">${texte}</text>`;

    const bouts = t.genre === 'axiale' ? qBoutsDeLAxe(g, t.axe) : null;
    if (bouts) {
        marques.push(`<line x1="${(bouts[0] * k).toFixed(2)}" y1="${(bouts[1] * k).toFixed(2)}"
            x2="${(bouts[2] * k).toFixed(2)}" y2="${(bouts[3] * k).toFixed(2)}"
            stroke="#1a202c" stroke-width="${Math.max(1, 0.55 * k).toFixed(2)}"/>`);
        marques.push(nom((bouts[0] + 0.6) * k, (bouts[1] + 2.6) * k, '(d)'));
    }
    if ((t.genre === 'centrale' || t.genre === 'rotation') && t.centre) {
        const cx = qCentre(g, t.centre.x, 'x') * k, cy = qCentre(g, t.centre.y, 'y') * k;
        const r = g.pas * 0.3 * k;
        marques.push(`<g stroke="#1a202c" stroke-width="${Math.max(1, 0.6 * k).toFixed(2)}" stroke-linecap="round">
            <line x1="${(cx - r).toFixed(2)}" y1="${(cy - r).toFixed(2)}" x2="${(cx + r).toFixed(2)}" y2="${(cy + r).toFixed(2)}"/>
            <line x1="${(cx - r).toFixed(2)}" y1="${(cy + r).toFixed(2)}" x2="${(cx + r).toFixed(2)}" y2="${(cy - r).toFixed(2)}"/>
        </g>`);
        marques.push(nom(cx + r + 0.6 * k, cy - r, 'O'));
    }
    if (t.genre === 'translation' && t.vecteur && m.ancre) {
        const ax = qNoeud(g, m.ancre.x, 'x') * k, ay = qNoeud(g, m.ancre.y, 'y') * k;
        const bx = ax + t.vecteur.x * g.pas * k, by = ay + t.vecteur.y * g.pas * k;
        marques.push(`<line x1="${ax.toFixed(2)}" y1="${ay.toFixed(2)}"
            x2="${bx.toFixed(2)}" y2="${by.toFixed(2)}"
            stroke="#1a202c" stroke-width="${Math.max(1, 0.55 * k).toFixed(2)}"/>`);
        // La pointe, calculée comme celle du PDF : un triangle porté par le
        // vecteur unitaire, pour que les deux dessins coïncident au trait près.
        const l = Math.hypot(bx - ax, by - ay) || 1;
        const ux = (bx - ax) / l, uy = (by - ay) / l, q = g.pas * 0.35 * k;
        marques.push(`<polygon fill="#1a202c" points="${bx.toFixed(2)},${by.toFixed(2)}
            ${(bx - ux * q - uy * q * 0.45).toFixed(2)},${(by - uy * q + ux * q * 0.45).toFixed(2)}
            ${(bx - ux * q + uy * q * 0.45).toFixed(2)},${(by - uy * q - ux * q * 0.45).toFixed(2)}"/>`);
        marques.push(nom((ax + bx) / 2, (ay + by) / 2 - 0.35 * g.pas * k, 'v'));
    }

    html += `<svg style="position:absolute; left:0; top:0; width:100%; height:100%; overflow:visible">
        <g stroke="#b0b6c5" stroke-width="${Math.max(0.5, 0.2 * k).toFixed(2)}">${traits.join('')}</g>
        ${marques.join('')}
    </svg>`;

    html += `<div style="position:absolute; left:${g.boite.x * k}px;
        top:${(g.yLegende - g.pt * 0.3528) * k}px; width:${g.boite.w * k}px;
        text-align:center; font-size:${(g.pt * 0.3528 * k).toFixed(2)}px;
        font-weight:600; color:#2d3748">${qLegende(m)}</div>`;
    return html;
}

function dessinerQuadrillagePdf(doc, item, slot, solution) {
    const g = geoQuadrillage(item, slot);
    const m = g.m;
    const t = m.transfo || {};

    // Les cases d'abord, le quadrillage par-dessus : les traits doivent rester
    // visibles À TRAVERS la figure, sinon on ne peut plus compter les carreaux
    // qui la séparent de l'axe — et c'est tout l'exercice.
    doc.setFillColor(...ENCRE.donnee);
    (m.depart || []).forEach(c => {
        doc.rect(g.x0 + c.x * g.pas, g.y0 + c.y * g.pas, g.pas, g.pas, 'F');
    });
    if (solution) {
        doc.setFillColor(...ENCRE.grille);
        (m.image || []).forEach(c => {
            doc.rect(g.x0 + c.x * g.pas, g.y0 + c.y * g.pas, g.pas, g.pas, 'F');
        });
    }

    doc.setDrawColor(...ENCRE.grille);
    doc.setLineWidth(0.2);
    for (let i = 0; i <= g.L; i++) {
        doc.line(g.x0 + i * g.pas, g.y0, g.x0 + i * g.pas, g.y0 + g.H * g.pas);
    }
    for (let j = 0; j <= g.H; j++) {
        doc.line(g.x0, g.y0 + j * g.pas, g.x0 + g.L * g.pas, g.y0 + j * g.pas);
    }

    // L'axe, le centre, le vecteur : à l'encre du trait. Une photocopie ne
    // garde pas la couleur, et c'est la donnée la plus importante du dessin.
    doc.setDrawColor(...ENCRE.trait);
    doc.setLineWidth(0.55);
    doc.setFontSize(g.pt);
    doc.setTextColor(...ENCRE.trait);
    const bouts = t.genre === 'axiale' ? qBoutsDeLAxe(g, t.axe) : null;
    if (bouts) {
        doc.line(bouts[0], bouts[1], bouts[2], bouts[3]);
        doc.text('(d)', bouts[0] + 0.6, bouts[1] + 2.6);
    }

    if ((t.genre === 'centrale' || t.genre === 'rotation') && t.centre) {
        const cx = qCentre(g, t.centre.x, 'x'), cy = qCentre(g, t.centre.y, 'y');
        const r = g.pas * 0.3;
        doc.setLineWidth(0.6);
        doc.line(cx - r, cy - r, cx + r, cy + r);
        doc.line(cx - r, cy + r, cx + r, cy - r);
        doc.setFontSize(g.pt);
        doc.setTextColor(...ENCRE.trait);
        doc.text('O', cx + r + 0.6, cy - r);
    }

    if (t.genre === 'translation' && t.vecteur && m.ancre) {
        const ax = qNoeud(g, m.ancre.x, 'x'), ay = qNoeud(g, m.ancre.y, 'y');
        const bx = ax + t.vecteur.x * g.pas, by = ay + t.vecteur.y * g.pas;
        doc.line(ax, ay, bx, by);
        // La pointe : sans elle, un vecteur n'est qu'un segment, et le sens du
        // glissement se perd.
        const l = Math.hypot(bx - ax, by - ay) || 1;
        const ux = (bx - ax) / l, uy = (by - ay) / l, p = g.pas * 0.35;
        doc.setFillColor(...ENCRE.trait);
        doc.triangle(bx, by,
            bx - ux * p - uy * p * 0.45, by - uy * p + ux * p * 0.45,
            bx - ux * p + uy * p * 0.45, by - uy * p - ux * p * 0.45, 'F');
        doc.text('v', (ax + bx) / 2, (ay + by) / 2 - g.pas * 0.35, { align: 'center' });
    }

    doc.setFontSize(g.pt);
    doc.setTextColor(...ENCRE.texte);
    doc.text(qLegende(m), g.boite.x + g.boite.w / 2, g.yLegende, { align: 'center' });
}

// --- Le pavage ----------------------------------------------------------------
//
// Même quadrillage, autre question : les pièces portent une LETTRE, et l'élève
// écrit le nom de la transformation. Sur le papier il n'a pas les propositions
// sous les yeux — c'est plus exigeant que l'écran, et c'est très bien : le
// vocabulaire se retient en l'écrivant.
//
// La lettre fait tout le travail de désignation. La couleur, elle, ne survit
// pas à une photocopie ; les pièces sont donc grises, et seules celles DONT
// PARLE LA QUESTION sont cerclées de noir — sur cinq pièces éparpillées, les
// retrouver prendrait plus de temps que de répondre.

function geoPavage(item, slot) {
    const g = geoQuadrillage(item, slot);
    // Deux lignes sous la grille : la question, puis de quoi écrire.
    return { ...g, yQuestion: g.boite.y + g.boite.h - g.pt * 0.3528 * 3.4 };
}

function pavagePreviewHtml(item, slot, k, solution) {
    const g = geoPavage(item, slot);
    const m = g.m;
    let html = '';

    (m.pieces || []).forEach((cases, i) => {
        const vedette = i === m.de || i === m.vers;
        cases.forEach(c => {
            html += `<div style="position:absolute;
                left:${(g.x0 + c.x * g.pas) * k}px; top:${(g.y0 + c.y * g.pas) * k}px;
                width:${g.pas * k}px; height:${g.pas * k}px;
                background:rgba(120,128,150,${vedette ? '.34' : '.18'});
                ${vedette ? `outline:${Math.max(1, 0.45 * k)}px solid #1a202c; outline-offset:-1px;` : ''}"></div>`;
        });
        const c = caseCentrale(cases);
        html += `<div style="position:absolute;
            left:${(g.x0 + c.x * g.pas) * k}px; top:${(g.y0 + c.y * g.pas) * k}px;
            width:${g.pas * k}px; height:${g.pas * k}px; display:flex;
            align-items:center; justify-content:center;
            font-size:${(g.pas * 0.6 * k).toFixed(2)}px; font-weight:800;
            color:#1a202c">${(m.noms || [])[i] || ''}</div>`;
    });

    const traits = [];
    for (let i = 0; i <= g.L; i++) {
        traits.push(`<line x1="${((g.x0 + i * g.pas) * k).toFixed(2)}" y1="${(g.y0 * k).toFixed(2)}"
            x2="${((g.x0 + i * g.pas) * k).toFixed(2)}" y2="${((g.y0 + g.H * g.pas) * k).toFixed(2)}"/>`);
    }
    for (let j = 0; j <= g.H; j++) {
        traits.push(`<line x1="${(g.x0 * k).toFixed(2)}" y1="${((g.y0 + j * g.pas) * k).toFixed(2)}"
            x2="${((g.x0 + g.L * g.pas) * k).toFixed(2)}" y2="${((g.y0 + j * g.pas) * k).toFixed(2)}"/>`);
    }
    // LES CANDIDATS, tous du même trait : c'est leur nom qui les sépare, jamais
    // leur allure. Sur le papier ils sont noirs comme le reste — une photocopie
    // ne garde pas la couleur, et cet exercice se corrige à l'œil.
    const cands = [];
    (m.candidats || []).forEach(el => {
        if (el.genre === 'axe') {
            const vert = el.axe.type === 'v';
            const q = el.axe.a + 0.5;
            const [x1, y1, x2, y2] = vert ? [q, 0, q, g.H] : [0, q, g.L, q];
            cands.push(`<line x1="${((g.x0 + x1 * g.pas) * k).toFixed(2)}" y1="${((g.y0 + y1 * g.pas) * k).toFixed(2)}"
                x2="${((g.x0 + x2 * g.pas) * k).toFixed(2)}" y2="${((g.y0 + y2 * g.pas) * k).toFixed(2)}"
                stroke="#1a202c" stroke-width="${Math.max(1, 0.4 * k).toFixed(2)}"/>`);
            cands.push(nomDuCandidat(g, k, el.nom,
                vert ? g.x0 + q * g.pas : g.x0 + g.L * g.pas + g.pas * 0.15,
                vert ? g.y0 - g.pas * 0.15 : g.y0 + q * g.pas, vert));
        } else {
            const cx = g.x0 + (el.centre.x + 0.5) * g.pas, cy = g.y0 + (el.centre.y + 0.5) * g.pas;
            const r = g.pas * 0.28;
            cands.push(`<g stroke="#1a202c" stroke-width="${Math.max(1, 0.5 * k).toFixed(2)}" stroke-linecap="round">
                <line x1="${((cx - r) * k).toFixed(2)}" y1="${((cy - r) * k).toFixed(2)}" x2="${((cx + r) * k).toFixed(2)}" y2="${((cy + r) * k).toFixed(2)}"/>
                <line x1="${((cx - r) * k).toFixed(2)}" y1="${((cy + r) * k).toFixed(2)}" x2="${((cx + r) * k).toFixed(2)}" y2="${((cy - r) * k).toFixed(2)}"/>
            </g>`);
            cands.push(nomDuCandidat(g, k, el.nom, cx + r * 1.3, cy - r, false));
        }
    });

    html += `<svg style="position:absolute; left:0; top:0; width:100%; height:100%; overflow:visible">
        <g stroke="#b0b6c5" stroke-width="${Math.max(0.5, 0.2 * k).toFixed(2)}" fill="none">${traits.join('')}</g>
        ${cands.join('')}
    </svg>`;

    const dit = solution ? solutionDuPavage(m)
        : `${(m.pieces || []).length ? questionDuPavage(m) : ''} ${'.'.repeat(24)}`;
    html += `<div style="position:absolute; left:${g.boite.x * k}px;
        top:${g.yQuestion * k}px; width:${g.boite.w * k}px;
        font-size:${(g.pt * 0.3528 * k).toFixed(2)}px; line-height:1.35;
        color:#2d3748">${dit}</div>`;
    return html;
}

const questionDuPavage = (m) =>
    `${(m.noms || [])[m.vers]} est le symétrique de ${(m.noms || [])[m.de]} par rapport à :`;

/** Le corrigé : le nom du candidat ET ce qu'il vaut, pour qu'il se relise. */
const solutionDuPavage = (m) => {
    const juste = (m.candidats || []).find(c => c.id === m.idJuste);
    const quoi = m.genre === 'axe' ? 'la droite' : 'le point';
    return `${(m.noms || [])[m.vers]} est le symétrique de ${(m.noms || [])[m.de]} par rapport à `
        + `${quoi} ${juste ? juste.nom : ''} : ${ecrireElement(m.hauteur, m.bon)}.`;
};

const nomDuCandidat = (g, k, nom, x, y, centre) =>
    `<text x="${(x * k).toFixed(2)}" y="${(y * k).toFixed(2)}"
        text-anchor="${centre ? 'middle' : 'start'}" fill="#1a202c"
        font-size="${(g.pt * 0.3528 * k).toFixed(2)}" font-weight="700"
        font-style="italic">${nom || ''}</text>`;

function dessinerPavagePdf(doc, item, slot, solution) {
    const g = geoPavage(item, slot);
    const m = g.m;

    (m.pieces || []).forEach((cases, i) => {
        const vedette = i === m.de || i === m.vers;
        doc.setFillColor(...(vedette ? ENCRE.grille : ENCRE.donnee));
        cases.forEach(c => doc.rect(g.x0 + c.x * g.pas, g.y0 + c.y * g.pas, g.pas, g.pas, 'F'));
    });

    doc.setDrawColor(...ENCRE.grille);
    doc.setLineWidth(0.2);
    for (let i = 0; i <= g.L; i++) doc.line(g.x0 + i * g.pas, g.y0, g.x0 + i * g.pas, g.y0 + g.H * g.pas);
    for (let j = 0; j <= g.H; j++) doc.line(g.x0, g.y0 + j * g.pas, g.x0 + g.L * g.pas, g.y0 + j * g.pas);

    // Le contour des deux pièces de la question, tracé APRÈS le quadrillage :
    // dessiné avant, les traits gris de la grille l'auraient recouvert.
    doc.setDrawColor(...ENCRE.trait);
    doc.setLineWidth(0.45);
    (m.pieces || []).forEach((cases, i) => {
        if (i !== m.de && i !== m.vers) return;
        cases.forEach(c => doc.rect(g.x0 + c.x * g.pas, g.y0 + c.y * g.pas, g.pas, g.pas, 'D'));
    });

    doc.setTextColor(...ENCRE.trait);
    doc.setFontSize(Math.max(7, g.pas * 1.6));
    (m.pieces || []).forEach((cases, i) => {
        const c = caseCentrale(cases);
        doc.text(String((m.noms || [])[i] || ''),
            g.x0 + (c.x + 0.5) * g.pas, g.y0 + (c.y + 0.68) * g.pas, { align: 'center' });
    });

    // LES CANDIDATS, tous du même trait. C'est leur nom qui les sépare, jamais
    // leur allure : le bon ne doit se distinguer par rien.
    doc.setLineWidth(0.4);
    doc.setFontSize(g.pt);
    (m.candidats || []).forEach(el => {
        if (el.genre === 'axe') {
            const vert = el.axe.type === 'v';
            const q = el.axe.a + 0.5;
            if (vert) {
                const x = g.x0 + q * g.pas;
                doc.line(x, g.y0, x, g.y0 + g.H * g.pas);
                doc.text(String(el.nom || ''), x, g.y0 - 0.6, { align: 'center' });
            } else {
                const y = g.y0 + q * g.pas;
                doc.line(g.x0, y, g.x0 + g.L * g.pas, y);
                doc.text(String(el.nom || ''), g.x0 + g.L * g.pas + 0.6, y + g.pt * 0.12);
            }
            return;
        }
        const cx = g.x0 + (el.centre.x + 0.5) * g.pas, cy = g.y0 + (el.centre.y + 0.5) * g.pas;
        const r = g.pas * 0.28;
        doc.setLineWidth(0.5);
        doc.line(cx - r, cy - r, cx + r, cy + r);
        doc.line(cx - r, cy + r, cx + r, cy - r);
        doc.setLineWidth(0.4);
        doc.text(String(el.nom || ''), cx + r * 1.3, cy - r * 0.6);
    });

    doc.setFontSize(g.pt);
    doc.setTextColor(...ENCRE.texte);
    const dit = solution ? solutionDuPavage(m) : `${questionDuPavage(m)} ${'.'.repeat(24)}`;
    doc.text(doc.splitTextToSize(pourPdf(dit), g.boite.w), g.boite.x, g.yQuestion);
}

// --- CODER UNE FIGURE, SUR LE PAPIER ------------------------------------------
//
// L'exercice de codage est né pour l'ecran, mais c'est sur une feuille qu'il
// se fait depuis toujours : on trace les marques au crayon, on les efface, on
// recommence. Le meme noyau sert les deux — la figure est projetee dans la
// boite du bloc au lieu de la zone du SVG, et les marques se dessinent avec
// les memes fonctions de geometrie. Une figure imprimee est donc exactement
// celle de l'ecran.

const CODAGE_PIED = 5;   // la bande du bas, ou se nomme la figure

function geoCodage(item, slot) {
    const b = boiteDe(slot);
    const m = item.meta;
    const fig = construireFigureCodage(m.type, m.dims, m.rotation);
    const cadre = { x: b.x, y: b.y, w: b.w, h: Math.max(10, b.h - CODAGE_PIED) };
    const pad = Math.min(cadre.w, cadre.h) * 0.15;
    const P = pointsProjetesCodage(fig, { ...cadre, pad });
    const L = Math.max(1.2, Math.min(cadre.w, cadre.h) * 0.035);
    return { b, fig, P, L, cadre, ids: m.segments, pts: m.points,
        avecDiagonales: m.avecDiagonales !== false };
}

/** Ce qu'il y a a tracer : des traits, des points, des mots. */
function tracesCodage(g, solution) {
    const { P, fig, L, ids, pts } = g;
    const traits = [];
    const gras = [];
    ['AB', 'BC', 'CD', 'DA'].forEach(id => gras.push([P[id[0]], P[id[1]]]));
    if (g.avecDiagonales) {
        traits.push([P.A, P.C]);
        traits.push([P.B, P.D]);
    }

    const marques = [];
    if (solution) {
        classesDeLongueurCodage(fig, ids).forEach((classe, i) => {
            classe.forEach(id => {
                traitsDeMarqueCodage(P[id[0]], P[id[1]], i + 1, L).forEach(t => marques.push(t));
            });
        });
        anglesDroitsDeCodage(fig, pts).forEach(nom => {
            const [b1, b2] = BRAS_CODAGE[nom];
            marques.push(pointsAngleDroitCodage(P[nom], P[b1], P[b2], L * 1.7));
        });
    }

    const noms = ['A', 'B', 'C', 'D'].map(n => {
        const dx = P[n].x - P.O.x, dy = P[n].y - P.O.y;
        const d = Math.hypot(dx, dy) || 1;
        return { t: n, x: P[n].x + (dx / d) * L * 2.4, y: P[n].y + (dy / d) * L * 2.4 };
    });
    if (g.avecDiagonales) noms.push({ t: 'O', x: P.O.x - L * 1.9, y: P.O.y + L * 2.2 });

    return { traits, gras, marques, noms };
}

const BRAS_CODAGE = { A: ['B', 'D'], B: ['C', 'A'], C: ['D', 'B'], D: ['A', 'C'], O: ['A', 'B'] };

function codagePreviewHtml(item, slot, k, solution) {
    const g = geoCodage(item, slot);
    const t = tracesCodage(g, solution);
    const T = (v) => (v * k).toFixed(2);
    const ligne = ([a, b], w, couleur) => `<line x1="${T(a.x)}" y1="${T(a.y)}" x2="${T(b.x)}" `
        + `y2="${T(b.y)}" stroke="${couleur}" stroke-width="${(w * k).toFixed(2)}" stroke-linecap="round"/>`;
    let dedans = t.traits.map(seg => ligne(seg, 0.28, '#8a90a0')).join('');
    dedans += t.gras.map(seg => ligne(seg, 0.5, '#1a202c')).join('');
    dedans += t.marques.map(m => (m.length === 3
        ? `<path d="M ${T(m[0].x)} ${T(m[0].y)} L ${T(m[1].x)} ${T(m[1].y)} L ${T(m[2].x)} ${T(m[2].y)}"
             fill="none" stroke="#1a202c" stroke-width="${(0.42 * k).toFixed(2)}"/>`
        : ligne(m, 0.55, '#1a202c'))).join('');
    dedans += ['A', 'B', 'C', 'D'].map(n => `<circle cx="${T(g.P[n].x)}" cy="${T(g.P[n].y)}"
        r="${(0.5 * k).toFixed(2)}" fill="#1a202c"/>`).join('');
    if (g.avecDiagonales) {
        dedans += `<circle cx="${T(g.P.O.x)}" cy="${T(g.P.O.y)}" r="${(0.5 * k).toFixed(2)}" fill="#1a202c"/>`;
    }
    dedans += t.noms.map(n => `<text x="${T(n.x)}" y="${T(n.y)}" fill="#1a202c"
        font-size="${(3.1 * k).toFixed(2)}" font-weight="700" text-anchor="middle"
        dominant-baseline="middle" font-family="Helvetica, Arial, sans-serif">${n.t}</text>`).join('');
    dedans += `<text x="${T(g.b.x + g.b.w / 2)}" y="${T(g.b.y + g.b.h - 1.2)}" fill="#6e7684"
        font-size="${(3 * k).toFixed(2)}" text-anchor="middle"
        font-family="Helvetica, Arial, sans-serif">${nomTypeCodage(item.meta.type)}</text>`;
    return `<svg style="position:absolute; left:0; top:0; width:100%; height:100%;
        overflow:visible; pointer-events:none">${dedans}</svg>`;
}

function dessinerCodagePdf(doc, item, slot, solution) {
    const g = geoCodage(item, slot);
    const t = tracesCodage(g, solution);

    doc.setDrawColor(...ENCRE.grille);
    doc.setLineWidth(0.28);
    t.traits.forEach(([a, b]) => doc.line(a.x, a.y, b.x, b.y));

    doc.setDrawColor(...ENCRE.trait);
    doc.setLineWidth(0.5);
    t.gras.forEach(([a, b]) => doc.line(a.x, a.y, b.x, b.y));

    doc.setLineWidth(0.45);
    t.marques.forEach(m => {
        if (m.length === 3) {
            doc.line(m[0].x, m[0].y, m[1].x, m[1].y);
            doc.line(m[1].x, m[1].y, m[2].x, m[2].y);
        } else {
            doc.line(m[0].x, m[0].y, m[1].x, m[1].y);
        }
    });

    doc.setFillColor(...ENCRE.trait);
    ['A', 'B', 'C', 'D'].concat(g.avecDiagonales ? ['O'] : [])
        .forEach(n => doc.circle(g.P[n].x, g.P[n].y, 0.5, 'F'));

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...ENCRE.texte);
    t.noms.forEach(n => doc.text(n.t, n.x, n.y, { align: 'center', baseline: 'middle' }));

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...ENCRE.gris);
    doc.text(pourPdf(nomTypeCodage(item.meta.type)),
        g.b.x + g.b.w / 2, g.b.y + g.b.h - 1.2, { align: 'center' });
}

// --- LE CHEMIN NUMÉROTÉ, SUR LE PAPIER ----------------------------------------
//
// Rémy est parti d'un LIVRE : la couverture qu'il a envoyée est un recueil de
// labyrinthes de nombres. Le jeu devait donc savoir revenir sur une feuille —
// c'est même sa forme d'origine. Une grille par bloc, et la page des solutions
// montre le chemin, tracé au gros trait comme à l'écran.

function geoChemin(item, slot) {
    const b = boiteDe(slot);
    const m = item.meta;
    const cote = Math.min(b.w / m.l, b.h / m.h);
    const x0 = b.x + (b.w - cote * m.l) / 2;
    const y0 = b.y + (b.h - cote * m.h) / 2;
    const centre = (x, y) => ({ x: x0 + (x + 0.5) * cote, y: y0 + (y + 0.5) * cote });
    return { b, m, cote, x0, y0, centre, r: cote * 0.33 };
}

function cheminPreviewHtml(item, slot, k, solution) {
    const g = geoChemin(item, slot);
    const T = (v) => (v * k).toFixed(2);
    let dedans = '';
    for (let y = 0; y < g.m.h; y++) {
        for (let x = 0; x < g.m.l; x++) {
            dedans += `<rect x="${T(g.x0 + x * g.cote)}" y="${T(g.y0 + y * g.cote)}"
                width="${T(g.cote)}" height="${T(g.cote)}" fill="none"
                stroke="#b0b6c5" stroke-width="${(0.25 * k).toFixed(2)}"/>`;
        }
    }
    if (solution) {
        const d = g.m.solution.map(([x, y], i) => {
            const p = g.centre(x, y);
            return `${i ? 'L' : 'M'}${T(p.x)} ${T(p.y)}`;
        }).join(' ');
        dedans += `<path d="${d}" fill="none" stroke="#8a90a0" stroke-linecap="round"
            stroke-linejoin="round" stroke-width="${(g.cote * 0.34 * k).toFixed(2)}" opacity="0.5"/>`;
    }
    g.m.reperes.forEach(rep => {
        const p = g.centre(rep.x, rep.y);
        dedans += `<circle cx="${T(p.x)}" cy="${T(p.y)}" r="${T(g.r)}" fill="#ffffff"
            stroke="#1a202c" stroke-width="${(0.35 * k).toFixed(2)}"/>`;
        dedans += `<text x="${T(p.x)}" y="${T(p.y)}" fill="#1a202c" font-weight="700"
            font-size="${(g.r * 1.15 * k).toFixed(2)}" text-anchor="middle"
            dominant-baseline="central" font-family="Helvetica, Arial, sans-serif">${rep.n}</text>`;
    });
    return `<svg style="position:absolute; left:0; top:0; width:100%; height:100%;
        overflow:visible; pointer-events:none">${dedans}</svg>`;
}

function dessinerCheminPdf(doc, item, slot, solution) {
    const g = geoChemin(item, slot);

    doc.setDrawColor(...ENCRE.grille);
    doc.setLineWidth(0.25);
    for (let y = 0; y < g.m.h; y++) {
        for (let x = 0; x < g.m.l; x++) {
            doc.rect(g.x0 + x * g.cote, g.y0 + y * g.cote, g.cote, g.cote);
        }
    }

    if (solution) {
        // Le chemin en gros trait gris : il se lit d'un coup d'oeil sans
        // couvrir les nombres, qu'on redessine par-dessus.
        doc.setDrawColor(...ENCRE.gris);
        doc.setLineWidth(g.cote * 0.3);
        doc.setLineCap('round');
        doc.setLineJoin('round');
        for (let i = 1; i < g.m.solution.length; i++) {
            const a = g.centre(...g.m.solution[i - 1]);
            const b = g.centre(...g.m.solution[i]);
            doc.line(a.x, a.y, b.x, b.y);
        }
        doc.setLineCap('butt');
        doc.setLineJoin('miter');
    }

    doc.setLineWidth(0.35);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(Math.max(6, Math.min(13, g.r * 3.1)));
    g.m.reperes.forEach(rep => {
        const p = g.centre(rep.x, rep.y);
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...ENCRE.trait);
        doc.circle(p.x, p.y, g.r, 'FD');
        doc.setTextColor(...ENCRE.texte);
        doc.text(String(rep.n), p.x, p.y, { align: 'center', baseline: 'middle' });
    });
    doc.setFont('helvetica', 'normal');
}

// --- L'ORGANIGRAMME DES QUADRILATÈRES, SUR LE PAPIER --------------------------
//
// Rémy l'a demandé pour sa fiche : cinq cases de figures, treize flèches, et la
// liste des conditions à reporter. C'est la feuille qu'on colle dans le cahier
// de leçons — celle qu'on remplit une fois et qu'on relit toute l'année.
//
// LE PLAN VIENT DU NOYAU, pas d'ici : `POSITIONS`, `traceFleche` et
// `posEtiquette` sont les mêmes qu'à l'écran (voir core/quadrilateres.js). Un
// élève qui a la feuille sous les yeux et l'exercice sur la tablette doit
// reconnaître LA MÊME figure, au même endroit — sans quoi ce sont deux leçons.
//
// LA LISTE SE MET SOUS LE PLAN, sur deux colonnes. Neuf énoncés dont trois font
// deux lignes : en une colonne ils prennent la moitié de la page, en trois ils
// se coupent au milieu d'un mot.

/**
 * LA PLANCHE DE VIGNETTES, quand on l'a demandée — la page 3 de la fiche de Rémy.
 *
 * ELLE SE CALCULE À REBOURS DU PLAN, et c'est l'inverse de tout le reste de ce
 * fichier. Une vignette doit entrer DANS la case du plan — c'est là qu'on la
 * colle —, donc sa taille est celle des cases, donc elle dépend de la taille du
 * plan… qui dépend de la place que prend la planche. On essaie donc plusieurs
 * hauteurs de plan en descendant et l'on garde la plus grande où les treize
 * cartes tiennent dessous. Six essais suffisent : au-delà, on grignote des
 * dixièmes de millimètre qu'aucune photocopieuse ne rend.
 *
 * LES CARTES SE TOUCHENT. Rémy, à propos des dominos : « ce serait bien que les
 * dominos à découper soient collés car sinon c'est long à découper. » Treize
 * cartes séparées font cinquante-deux coups de ciseau ; collées, elles
 * partagent leurs traits et la planche se débite en huit coups droits.
 */
function planVignettes(b, m, RAPPORT) {
    const n = (m.vignettes || []).length;
    const TITRE = 4.2;
    let dernier = null;
    // ON PART DU PLUS GRAND PLAN POSSIBLE et l'on descend : les cartes ont la
    // taille des cases, donc un plan plus grand fait des cartes plus lisibles,
    // et c'est la seule chose qui compte ici. Le premier essai qui laisse la
    // place à la planche gagne.
    for (const part of [0.84, 0.80, 0.76, 0.72, 0.68, 0.64, 0.58, 0.52]) {
        const hUtile = b.h * part;
        const wUtile = Math.min(b.w, hUtile * RAPPORT);
        const h2 = wUtile / RAPPORT;
        const condW = wUtile * (COND_L_Q / PLAN_L_Q);
        const condH = h2 * (COND_H_Q / PLAN_H_Q);
        // DES RANGÉES ÉGALES PLUTÔT QU'UNE RANGÉE PLEINE ET UN RESTE. Neuf
        // cartes puis quatre laisse un décrochement en escalier au milieu de la
        // planche : on coupe droit dans le vide, et le dernier trait de ciseau
        // n'a plus rien à suivre. Sept et six se coupent d'un seul trait.
        const maxCols = Math.max(1, Math.floor(b.w / condW));
        const rangs = Math.ceil(n / maxCols);
        const cols = Math.ceil(n / rangs);
        const besoin = TITRE + rangs * condH;
        const dispo = b.h - h2 - 3;
        dernier = { hUtile: h2, wUtile, condW, condH, cols, rangs, besoin, TITRE };
        if (besoin <= dispo) return dernier;
    }
    return dernier;
}

/** Les treize cartes mesurées d'un coup, rangées par clé de flèche. */
function mesuresVignettes(m, planche) {
    const v = m.vignettes || [];
    const mesures = mesurerVignettes(v.map(x => x.texte), planche.condW, planche.condH);
    const out = {};
    v.forEach((x, i) => { out[x.cle] = mesures[i]; });
    return out;
}

/** Le plan de 100 × 140 du noyau, posé dans le bloc — et la place de la liste. */
function geoOrganigramme(item, slot) {
    const b = boiteDe(slot);
    const m = item.meta;
    const RAPPORT_PLAN = PLAN_L_Q / PLAN_H_Q;

    // La liste d'abord : c'est elle qui a une hauteur imposée par son texte.
    // Avec des vignettes, c'est la PLANCHE qui commande, et elle se calcule à
    // rebours du plan (voir `planVignettes`).
    const planche = m.vignettes ? planVignettes(b, m, RAPPORT_PLAN) : null;

    // LE PLAN GARDE LES PROPORTIONS DE CELUI DU NOYAU, et c'est la règle du
    // chapitre : un élève qui a la feuille sous les yeux et l'exercice sur la
    // tablette doit reconnaître LA MÊME figure.
    //
    // IL EST EN PORTRAIT depuis qu'on a repris la fiche de Rémy : huit rangées
    // qui alternent figures et conditions, du quadrilatère tout en haut au
    // carré tout en bas. C'est la seule forme où les treize conditions ont
    // chacune leur boîte — et c'est celle qu'il a dessinée à la main.
    // AVEC UNE PLANCHE, C'EST ELLE QUI A FIXÉ LA TAILLE DU PLAN — on la reprend
    // telle quelle plutôt que de la recalculer. Recalculer donnait un plan un
    // cheveu plus grand que celui sur lequel la planche s'était accordée, donc
    // des cases un cheveu plus grandes que les cartes : invisible à l'œil, et
    // faux là où c'est gênant — une carte doit entrer dans sa case, exactement.
    // LE PLAN PREND TOUTE LA LARGEUR DE LA FEUILLE, et la liste ce qui reste.
    //
    // Rémy : « je suis un peu déçu de l'organigramme. » Il tenait dans un tiers
    // de la page — cinquante millimètres de blanc de chaque côté — parce que la
    // largeur se déduisait de la hauteur laissée par la liste, elle-même
    // dimensionnée en premier. On prend le problème dans l'autre sens : le plan
    // s'étale sur la largeur (le format du noyau lui donne sa hauteur), et la
    // liste occupe le bas de la feuille.
    const RAPPORT = PLAN_L_Q / PLAN_H_Q;        // largeur / hauteur
    // LE PLAN PREND TOUTE LA HAUTEUR QUE LA LISTE LUI LAISSE, ET IL S'ÉTIRE.
    //
    // Rémy : « rends l'organigramme plus haut, car les flèches sont écrasées. »
    // Mesuré sur la feuille précédente : le plan tenait 135 mm de haut — la
    // largeur de la page divisée par les proportions du noyau — et il restait
    // CINQUANTE MILLIMÈTRES DE BLANC sous la légende. Les flèches, elles, ne
    // reliaient plus rien : entre deux rangées, le segment vertical faisait
    // moins de quatre millimètres, et les cases se touchaient presque.
    //
    // On garde donc la largeur pleine, et l'on prend en hauteur ce que la liste
    // n'utilise pas. Le plan cesse alors d'avoir les proportions exactes du
    // noyau — c'est un ÉTIREMENT, pas un agrandissement — et c'est acceptable
    // ici parce que rien de ce qui s'étire ne porte de sens géométrique : les
    // figures, elles, restent carrées (voir `fw`/`fh`, plus bas), et ce sont les
    // seules formes que l'élève lit comme des formes. Ce qui s'allonge, ce sont
    // les intervalles entre les rangées — c'est-à-dire les flèches — et les
    // cases de condition, qu'on remplit à la main : les deux y gagnent.
    //
    // L'étirement est BORNÉ : au-delà de la moitié, l'organigramme devient une
    // échelle, les cases s'éloignent et l'on perd la vue d'ensemble qui fait
    // tout l'intérêt de la carte.
    const ETIRE_MAX = 1.5;
    const besoinListe = Math.ceil((m.liste ? m.liste.length : 9) / 2) * 9 + 10;
    const wVoulue = planche ? planche.wUtile : b.w;
    const hNaturelle = wVoulue / RAPPORT;
    const wUtile = wVoulue;
    const hUtile = planche ? planche.hUtile
        : Math.max(hNaturelle, Math.min(b.h - besoinListe - 4, hNaturelle * ETIRE_MAX));
    const hListe = planche ? planche.besoin : Math.max(16, b.h - hUtile - 4);
    const x0 = b.x + (b.w - wUtile) / 2;
    const y0 = b.y;

    // LA CASE A LA MÊME TAILLE QU'À L'ÉCRAN — les deux constantes viennent du
    // noyau, comme le tracé des flèches et la place des étiquettes.
    const caseW = wUtile * (CASE_L_Q / PLAN_L_Q), caseH = hUtile * (CASE_H_Q / PLAN_H_Q);
    const condW = wUtile * (COND_L_Q / PLAN_L_Q), condH = hUtile * (COND_H_Q / PLAN_H_Q);

    // LE PLAN SE RÉTRÉCIT DE LA MOITIÉ D'UNE CASE, DE TOUS LES CÔTÉS. Une case
    // est CENTRÉE sur sa position, et le quadrilatère est à y = 4, le carré à
    // y = 97 : posés tels quels, ils débordaient du plan par le haut et par le
    // bas. Mesuré sur le premier PDF : la case « Carré » descendait sur la
    // liste des conditions et en couvrait la première ligne.
    // Le repère du noyau va de 0 à PLAN_L en x et de 0 à PLAN_H en y, et les
    // boîtes y tiennent déjà tout entières : il n'y a plus à rétrécir d'une
    // demi-case comme du temps où les positions étaient des CENTRES posés sur
    // les bords du plan.
    const px = (v) => x0 + (v / PLAN_L_Q) * wUtile;
    const py = (v) => y0 + (v / PLAN_H_Q) * hUtile;
    const P = (p) => ({ x: px(p.x), y: py(p.y) });
    return {
        b, m, x0, y0, wUtile, hUtile,
        P, caseW, caseH, condW, condH,
        // LA PETITE CASE OÙ S'ÉCRIT LA LETTRE — et elle est petite pour de bon.
        // Mesuré à 5,2 % de la largeur du plan : les trois cases du chemin
        // quadrilatère → parallélogramme, empilées dans un intervalle de dix
        // unités, se touchaient bord à bord et l'on ne savait plus laquelle
        // appartenait à quelle flèche. À 3,5 % elles font neuf millimètres —
        // largement de quoi écrire une lettre à la main — et il reste trois
        // unités de blanc entre deux.
        lettreW: Math.max(4.5, wUtile * 0.035),
        listeY: y0 + hUtile + 3,
        listeH: hListe,
        // LES MESURES, CALCULÉES UNE FOIS ET RANGÉES PAR CLÉ DE FLÈCHE. La même
        // carte est dessinée à deux endroits — sur la planche, et dans sa case
        // sur la feuille de solutions — et elle doit y être écrite à
        // l'identique : c'est ce qui permet de vérifier qu'on l'a bien collée
        // au bon endroit.
        mesures: planche ? mesuresVignettes(m, planche) : null,
        // LA PLANCHE, avec l'origine de sa grille : centrée sous le plan, parce
        // qu'un bloc de cartes collé au bord gauche se lit comme un débord.
        planche: planche && {
            ...planche,
            x: b.x + Math.max(0, (b.w - planche.cols * planche.condW) / 2),
            y: y0 + hUtile + 3 + planche.TITRE
        }
    };
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
function geoThalesRedaction(item, slot) {
    const b = boiteDe(slot);
    const m = item.meta;

    // L'ÉNONCÉ D'ABORD : sa hauteur dépend de sa longueur, et tout le reste se
    // partage ce qui reste.
    const hEnonce = 9;

    // LES CADRES SE DIMENSIONNENT SUR LA RÉDACTION ATTENDUE, pas sur un tiers de
    // page chacun. Le « Or » demande cinq lignes — l'annonce, l'égalité des
    // rapports, la même chiffrée —, le « Je sais que » deux, le « Donc » trois.
    // Un cadre trop court fait écrire en petit dans la marge ; un cadre trop
    // long fait croire qu'il manque quelque chose.
    const cadres = [
        { cle: 'sais', titre: 'Je sais que', lignes: LIGNES_CADRE_Q.sais,
            aide: 'ce que dit l’énoncé' },
        { cle: 'or', titre: 'Or', lignes: LIGNES_CADRE_Q.or,
            aide: 'ce que dit le cours' },
        { cle: 'donc', titre: 'Donc', lignes: LIGNES_CADRE_Q.donc,
            aide: 'ce qu’on en déduit' }
    ];
    const totalLignes = cadres.reduce((n, c) => n + c.lignes, 0);
    const H_TITRE = 5;      // la bande du titre, au-dessus des lignes
    const MARGE = 2.5;      // entre deux cadres

    // La figure prend ce qui reste, mais jamais plus du tiers du bloc : une
    // figure géante sur une page où l'on doit ÉCRIRE est un contresens.
    const hFixe = hEnonce + cadres.length * (H_TITRE + MARGE + 2);
    const hLigneMin = 5.5;  // de quoi écrire à la main
    const restePourFigure = b.h - hFixe - totalLignes * hLigneMin;
    const hFigure = Math.max(24, Math.min(b.h * 0.32, restePourFigure));
    const hLigne = (b.h - hFixe - hFigure) / totalLignes;

    // LA FIGURE GARDE SES PROPORTIONS. Étirée à la largeur du bloc, un papillon
    // devient un accordéon et les cotes ne longent plus leur segment.
    const vue = m.figure.vue;
    const echelle = Math.min((b.w * 0.62) / vue.w, hFigure / vue.h);
    const figW = vue.w * echelle, figH = vue.h * echelle;
    const figX = b.x + (b.w - figW) / 2, figY = b.y + hEnonce;
    /** Un point de la figure, en millimètres sur la page. */
    const F = (q) => ({ x: figX + (q.x - vue.x0) * echelle, y: figY + (q.y - vue.y0) * echelle });

    // Les cadres, empilés sous la figure.
    let y = b.y + hEnonce + hFigure + 2;
    const boites = cadres.map(c => {
        // DEUX MILLIMÈTRES DE PLUS QUE LES LIGNES : sans eux, la dernière
        // ligne d'écriture tombait exactement sur le bord du cadre et se
        // confondait avec lui — on croyait le cadre plus court d'une ligne.
        const h = H_TITRE + c.lignes * hLigne + 2;
        const box = { ...c, x: b.x, y, w: b.w, h, hLigne, hTitre: H_TITRE };
        y += h + MARGE;
        return box;
    });

    return { b, m, F, echelle, figX, figY, figW, figH, hEnonce, boites, hLigne };
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
    const g = geoThalesRedaction(item, slot);
    const T = (v) => (v * k).toFixed(2);
    const m = g.m;
    let out = '';

    // L'énoncé.
    out += `<text x="${T(g.b.x)}" y="${T(g.b.y + 4)}" font-size="${T(3.1)}"
        font-family="Helvetica, Arial, sans-serif" fill="#1a202c">${echapper(m.enonce)}</text>`;

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
    const g = geoThalesRedaction(item, slot);
    const m = g.m;

    // L'énoncé.
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...ENCRE.trait);
    doc.text(pourPdf(m.enonce), g.b.x, g.b.y + 4);

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

// UN TRAIT PAR CONDITION, comme à l'écran depuis que l'organigramme est
// couché. En colonne il n'y avait la place que d'un trait par CHEMIN, avec les
// conditions échelonnées dessus ; l'élève ne pouvait pas compter les portes du
// regard. Ici les treize se dessinent, et le nombre de traits qui arrivent sur
// une case dit à lui seul de combien de façons on y accède.
const cheminsUniques = () => FLECHES_Q;

/**
 * LES TROIS TEINTES DE LA FICHE DE RÉMY, claires pour qu'on écrive dessus.
 *
 * Bleu ce qui parle des CÔTÉS, rouge ce qui parle des DIAGONALES, mauve les
 * deux raccourcis qui descendent directement du quadrilatère. Ce n'est pas de
 * la décoration : l'élève qui cherche ce qui manque au rectangle pour être un
 * carré sait qu'il y a une réponse bleue et une rouge, et que les deux disent
 * la même chose autrement.
 *
 * ELLES SONT PÂLES À DESSEIN. Sur la fiche de Rémy le fond est saturé et le
 * texte blanc ; photocopié en noir et blanc, cela donne trois gris qu'on ne
 * distingue plus, et la case ne se remplit pas au crayon. Ici la teinte est
 * assez claire pour qu'on écrive dedans et assez marquée pour qu'on la lise en
 * couleur.
 */
/**
 * TROIS TEINTES QUI SE DISTINGUENT AUSSI EN NOIR ET BLANC.
 *
 * Rémy imprime « noir et blanc — la photocopieuse ». Les trois teintes avaient
 * la même clarté : passées au gris, elles tombaient toutes sur le même
 * 88 % — treize cases d'un gris uniforme, et la couleur qui dit la famille ne
 * disait plus rien. On les échelonne donc en CLARTÉ autant qu'en teinte : le
 * bleu des côtés très clair, le rouge des diagonales à mi-chemin, le mauve des
 * raccourcis plus soutenu. En couleur on lit la teinte, en gris on lit la
 * clarté, et les deux disent la même chose.
 */
/**
 * LA COULEUR D'UNE FAMILLE DÉPEND DE CE QU'ON MET DANS L'IMPRIMANTE.
 *
 * En COULEUR, ce sont les teintes de la fiche de Rémy, relevées dans son PDF :
 * fond saturé et texte blanc pour les diagonales et les raccourcis, bleu pâle
 * et texte noir pour les côtés. C'est ce qui les sépare à trois mètres.
 *
 * EN NOIR ET BLANC, NON — et c'était le piège. Le rouge vif de sa fiche ne
 * devient pas un gris moyen : la conversion de la feuille tient compte de la
 * SATURATION autant que de la clarté (voir `encre` dans ui/ficheRendu.js), et
 * un rouge pur tombe sur un gris presque noir. Mesuré sur la première épreuve :
 * six cases sur treize sortaient en aplat noir. On donne donc au noir et blanc
 * trois gris CHOISIS — clair, moyen, foncé, texte noir sur les trois —, ce qui
 * dit la même chose sans vider la cartouche du photocopieur de la salle des
 * profs.
 */
// ET LES TROIS GRIS S'ÉCLAIRCISSENT AUSSI. Même raison que les couleurs : la
// case n'a plus de carré blanc au milieu, c'est ELLE qu'on remplit au crayon.
// Un gris à 61 % — celui des raccourcis — avale une écriture de crayon à
// papier ; à 78 %, elle se lit encore, et les trois marches restent nettes.
const GRIS_COND = {
    cotes: { fond: '#f1f1f1', encre: '#111111' },
    diagonales: { fond: '#dedede', encre: '#111111' },
    raccourci: { fond: '#c6c6c6', encre: '#111111' }
};
const paletteCond = () => (['couleur', 'intense'].includes(modePolycopie())
    ? COULEURS_Q : GRIS_COND);

const teinteCond = (f) => (paletteCond()[f] || paletteCond().cotes).fond;
const RVB_COND = new Proxy({}, { get: (_, f) => rvbHex(teinteCond(String(f))) });
const TEINTE_COND = new Proxy({}, { get: (_, f) => teinteCond(String(f)) });

/** L'encre du texte d'une carte : elle suit son fond. */
const ENCRE_COND = (f) => (paletteCond()[f] || paletteCond().cotes).encre;

/**
 * LA TAILLE DU NOM D'UNE FIGURE : celle qui tient dans sa case.
 *
 * « Parallélogramme » fait quinze lettres. Écrit à un sixième de la hauteur de
 * la case, il en débordait des deux côtés et s'asseyait sur le trait du bas —
 * ce qui se voyait d'autant plus que la case venait de grandir. La largeur
 * commande : le nom le plus long décide, et les cinq cases gardent la même
 * taille de police pour que l'une ne paraisse pas plus importante que l'autre.
 */
/**
 * LA CLEF DES COULEURS, dans l'ordre où on la lit.
 */
const LEGENDE_COND = [
    { famille: 'cotes', mot: 'les côtés' },
    { famille: 'diagonales', mot: 'les diagonales' },
    { famille: 'raccourci', mot: 'les raccourcis de 6ᵉ' }
];

/**
 * L'ÉCART ENTRE DEUX LIGNES DE LA LISTE, BORNÉ.
 *
 * La liste occupe le bas de la feuille, et depuis que le plan s'étale ce bas
 * est large : réparties dessus, cinq lignes se retrouvaient à dix-sept
 * millimètres l'une de l'autre — une liste de neuf conditions qui ressemblait
 * à un sommaire. Neuf millimètres suffisent pour deux lignes de texte, et le
 * blanc qui reste est du blanc, pas de l'espacement.
 */
const pasListe = (g, lignes) => Math.min(g.listeH / lignes, 9);


function policeNomFigure(caseW, hBande) {
    const plusLong = Math.max(...FAMILLES_Q.map(f => f.nom.length));
    // 0,52 cadratin par lettre : c'est la largeur moyenne d'une capitale et
    // d'une bas-de-casse en Helvetica gras, mesurée sur les cinq noms.
    // La hauteur disponible est celle du BANDEAU, dont le nom occupe les deux
    // tiers : calculée sur la case entière, elle donnait un corps d'un
    // millimètre — un nom qu'il fallait deviner.
    return Math.min(hBande * 0.62, (caseW * 0.88) / (plusLong * 0.52));
}

/**
 * LES TROIS POINTS D'UNE POINTE DE FLÈCHE, en millimètres sur la feuille.
 *
 * Rémy : « celui que je t'ai donné était plus joli. » Sa fiche est tracée à la
 * flèche ; la nôtre l'était au trait. Un organigramme sans pointes ne dit plus
 * dans quel sens il se lit — or c'est précisément ce qu'il enseigne : on
 * DESCEND du général au particulier, et chaque flèche ajoute une condition.
 *
 * La pointe se pose au bout du trait et regarde dans le sens du dernier
 * segment (voir `pointeDe` dans le noyau). Elle est calculée ici en
 * millimètres pour que l'aperçu et le PDF la dessinent identique.
 */
function pointeMm(trait, g, taille) {
    const q = pointeDeQ(trait);
    if (!q) return null;
    const bout = g.P({ x: q.x, y: q.y });
    // Le vecteur du plan vers la feuille : les deux axes n'ont pas la même
    // échelle depuis que le plan s'étale, et une pointe calculée sur l'un
    // sortirait de travers sur l'autre.
    const kx = g.wUtile / PLAN_L_Q, ky = g.hUtile / PLAN_H_Q;
    const vx = q.ux * kx, vy = q.uy * ky;
    const n = Math.hypot(vx, vy) || 1;
    const ux = vx / n, uy = vy / n;
    const base = { x: bout.x - ux * taille, y: bout.y - uy * taille };
    const px = -uy * taille * 0.42, py = ux * taille * 0.42;
    return [bout, { x: base.x + px, y: base.y + py }, { x: base.x - px, y: base.y - py }];
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

/** Le vecteur unitaire de `a` vers `b` — nul si les deux points se confondent. */
function unite(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const n = Math.hypot(dx, dy) || 1;
    return { x: dx / n, y: dy / n };
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
        out += `<text x="${T(g.b.x + 1)}" y="${T(y + 3)}" font-size="${T(2.9)}" fill="#2d3748"
            font-family="${police}">${echapper(l.etiquette)}</text>`;
        const xDebut = g.b.x + 1 + largeurTrigo(l.etiquette, 2.9) + 2;
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
 * La largeur d'un texte, en millimètres, à la louche.
 *
 * L'aperçu ne peut pas mesurer un texte SVG avant de l'avoir posé, et le PDF a
 * `getTextWidth`. Un facteur de 0,52 sur la taille de police approche Helvetica
 * à mieux qu'un millimètre sur ces étiquettes-là — vérifié en comparant les
 * deux rendus : la ligne pointillée commence au même endroit sur l'écran et sur
 * la feuille.
 */
const largeurTrigo = (texte, taille) => String(texte || '').length * taille * 0.52;

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
        doc.setTextColor(...ENCRE.texte);
        doc.text(l.etiquette, g.b.x + 1, y + 3);
        const xDebut = g.b.x + 1 + doc.getTextWidth(l.etiquette) + 2;
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

function organigrammePreviewHtml(item, slot, k, solution) {
    const g = geoOrganigramme(item, slot);
    const T = (v) => (v * k).toFixed(2);
    let out = '';

    // DEUX TRAITS PAR CONDITION : ce qui y entre, ce qui en sort. Sur la fiche
    // de Rémy, la condition est une CASE sur le chemin — pas une étiquette
    // collée sur une flèche —, et c'est ce qui permet de la découper.
    const tailleP = Math.max(1.6, g.wUtile * 0.011);
    cheminsUniques().forEach(f => {
        const t = traitsQ(f);
        [t.entrant, t.sortant].forEach(seg => {
            // LES VIRAGES SONT ARRONDIS — Rémy : « j'aimerais des flèches
            // arrondies ». L'écran l'était depuis qu'il a dit « c'est pas beau
            // une flèche en escaliers » ; la feuille traçait encore ses angles
            // droits. Le rayon vient du noyau, pour que les deux supports
            // dessinent la même carte.
            const pts = coinsArrondisQ(seg).map(q => g.P(q))
                .map(q => `${T(q.x)},${T(q.y)}`).join(' ');
            out += `<polyline points="${pts}" fill="none" stroke="#5a6274"
                stroke-width="${(0.45 * k).toFixed(2)}" stroke-linejoin="round"/>`;
            const tri = pointeMm(seg, g, tailleP);
            if (tri) {
                out += `<path d="M${T(tri[0].x)} ${T(tri[0].y)} L${T(tri[1].x)} ${T(tri[1].y)}
                    L${T(tri[2].x)} ${T(tri[2].y)} Z" fill="#5a6274"/>`;
            }
        });
    });

    FAMILLES_Q.forEach(fam => {
        const c = g.P(POSITIONS_Q[fam.id]);
        const x = c.x - g.caseW / 2, y = c.y - g.caseH / 2;
        // LA CASE D'UNE FIGURE, COMME CHEZ RÉMY : le dessin en haut, et SOUS
        // lui un bandeau d'une autre couleur qui porte le nom. On lit la figure
        // d'abord, son nom ensuite — dans l'ordre du raisonnement — et le
        // bandeau reste vide quand c'est à l'élève de la nommer.
        const hb = g.caseH * BANDE_NOM_Q, hd = g.caseH - hb;
        out += `<rect x="${T(x)}" y="${T(y)}" width="${T(g.caseW)}" height="${T(g.caseH)}"
            rx="${T(1.4)}" fill="#ffffff" stroke="#1a202c" stroke-width="${(0.35 * k).toFixed(2)}"/>`;
        out += `<path d="M${T(x)} ${T(y + hd)} h${T(g.caseW)} v${T(hb - 1.4)}
            a${T(1.4)} ${T(1.4)} 0 0 1 ${T(-1.4)} ${T(1.4)} h${T(-(g.caseW - 2.8))}
            a${T(1.4)} ${T(1.4)} 0 0 1 ${T(-1.4)} ${T(-1.4)} Z"
            fill="${BANDE_Q}" stroke="#1a202c" stroke-width="${(0.3 * k).toFixed(2)}"/>`;
        // LA FIGURE RESTE CARRÉE. La case est plus large que haute depuis que le
        // plan s'est étalé ; une figure calculée en pourcentages de la case en
        // serait sortie aplatie — un carré qui n'est plus carré, sur la feuille
        // qui enseigne les quadrilatères.
        const fw = Math.min(g.caseW * 0.5, hd * 0.82), fh = fw;
        const fx = c.x - fw / 2, fy = y + (hd - fh) / 2;
        const d = fam.figure.map((pt, i) =>
            `${i ? 'L' : 'M'}${T(fx + (pt[0] / 100) * fw)} ${T(fy + (pt[1] / 100) * fh)}`).join(' ') + ' Z';
        out += `<path d="${d}" fill="${FIGURE_Q}" stroke="#1a202c" stroke-width="${(0.4 * k).toFixed(2)}"/>`;
        const nom = (g.m.avecNoms || solution) ? fam.nom : '';
        const corpsNom = policeNomFigure(g.caseW, hb);
        out += `<text x="${T(c.x)}" y="${T(y + hd + hb / 2)}" text-anchor="middle"
            dominant-baseline="central"
            font-size="${T(corpsNom)}" font-weight="700" fill="#1a202c"
            font-family="Helvetica, Arial, sans-serif">${nom}</text>`;
    });

    FLECHES_Q.forEach(f => {
        const e = g.P(posEtiquetteQ(f));
        const w = g.condW, h = g.condH;
        // LA COULEUR DIT LA FAMILLE — l'idée de Rémy, reprise telle quelle :
        // bleu les côtés, rouge les diagonales, mauve les deux raccourcis.
        //
        // SAUF QUAND LA VIGNETTE LA PORTE. En mode découpage, c'est la CARTE
        // qui est teintée ; teinter aussi la case du plan donnerait la réponse
        // — il suffirait d'assortir les couleurs sans lire une seule phrase.
        const teinte = g.planche ? '#ffffff' : (TEINTE_COND[f.famille] || '#ffffff');
        out += `<rect x="${T(e.x - w / 2)}" y="${T(e.y - h / 2)}" width="${T(w)}" height="${T(h)}"
            rx="${T(1.6)}" fill="${teinte}" stroke="#1a202c" stroke-width="${(0.3 * k).toFixed(2)}"/>`;
        if (g.planche) {
            if (solution) {
                dessinerVignetteSvg(g.mesures[cleFlecheQ(f)], f.famille,
                    e.x - w / 2, e.y - h / 2, w, h, k, (html) => { out += html; });
            }
            return;
        }
        // ON ÉCRIT DANS LA CASE, PAS DANS UN CARRÉ DEDANS.
        //
        // Rémy : « ne mets pas les carrés d'écriture dans les propriétés, car
        // l'élève écrira dans les cases qui ont une couleur pastel. » Il y avait
        // un petit carré blanc au milieu de chaque case teintée, pour dire « la
        // lettre va ici ». Deux cadres emboîtés pour une seule réponse : la case
        // pastel suffit, elle est faite pour cela, et depuis que le plan s'étire
        // elle est deux fois plus haute qu'avant. Le carré, lui, contraignait
        // l'écriture à neuf millimètres au milieu d'un rectangle de trente.
        if (solution) {
            out += `<text x="${T(e.x)}" y="${T(e.y)}" text-anchor="middle"
                dominant-baseline="central" font-size="${T(Math.min(h * 0.62, 7))}" font-weight="700"
                fill="${ENCRE_COND(f.famille)}" font-family="Helvetica, Arial, sans-serif"
                >${g.m.parCle[cleFlecheQ(f)]}</text>`;
        }
    });

    if (g.planche) {
        // LA PLANCHE : on ne la répète pas sur la feuille de solutions. Le
        // corrigé montre le plan REMPLI ; treize cartes redessinées dessous ne
        // servent qu'à faire une deuxième page à photocopier par erreur.
        if (!solution) out += plancheVignettesSvg(g, k);
        return `<svg style="position:absolute; left:0; top:0; width:100%; height:100%;
            overflow:visible; pointer-events:none">${out}</svg>`;
    }

    // La liste, sur deux colonnes — et en entier, comme au PDF.
    const colW = g.b.w / 2;
    const lignes = Math.ceil(g.m.liste.length / 2);
    const pas = pasListe(g, lignes);
    g.m.liste.forEach((l, i) => {
        const col = Math.floor(i / lignes), rang = i % lignes;
        const x = g.b.x + col * colW;
        const y = g.listeY + rang * pas + 3;
        out += `<text x="${T(x)}" y="${T(y)}" font-size="${T(3)}" font-weight="700"
            fill="#2d3748" font-family="Helvetica, Arial, sans-serif">${l.lettre}.</text>`;
        couperEnLignes(l.texte, colW - 10, 3, (t, taille) => t.length * taille * 0.5)
            .forEach((t, j) => {
                out += `<text x="${T(x + 5.5)}" y="${T(y + j * 3.6)}" font-size="${T(3)}"
                    fill="#2d3748" font-family="Helvetica, Arial, sans-serif">${echapperXml(t)}</text>`;
            });
    });

    // LA CLEF DES COULEURS. C'est l'idée de Rémy — bleu les côtés, rouge les
    // diagonales, mauve les deux raccourcis de sixième — et elle ne servait à
    // rien tant que la feuille ne disait pas ce que les teintes veulent dire.
    let lx = g.b.x;
    const ly = g.listeY + lignes * pas + 4;
    LEGENDE_COND.forEach(({ famille, mot }) => {
        out += `<rect x="${T(lx)}" y="${T(ly - 2.4)}" width="${T(3.4)}" height="${T(3.4)}"
            rx="${T(0.6)}" fill="${TEINTE_COND[famille]}" stroke="#5a6274"
            stroke-width="${(0.25 * k).toFixed(2)}"/>`;
        out += `<text x="${T(lx + 4.6)}" y="${T(ly)}" font-size="${T(2.9)}" fill="#5a6274"
            font-family="Helvetica, Arial, sans-serif">${echapperXml(mot)}</text>`;
        lx += 6 + mot.length * 1.42;
    });

    return `<svg style="position:absolute; left:0; top:0; width:100%; height:100%;
        overflow:visible; pointer-events:none">${out}</svg>`;
}

/**
 * UNE VIGNETTE, EN SVG — teinte, cadre, et son texte replié.
 *
 * Le repli vient du noyau (`ajusterAuRectangle`), pas du navigateur : c'est ce
 * qui fait que l'aperçu coupe la phrase aux MÊMES endroits que le PDF. Un
 * aperçu qui replie autrement affiche trois lignes là où la feuille en aura
 * quatre, et cesse de dire la vérité sur ce qu'on va imprimer.
 */
/**
 * TOUTES LES CARTES À LA MÊME TAILLE — parce qu'une planche panachée se lit mal.
 *
 * Chaque carte prise à part accepterait sa plus grande police : « 4 côtés
 * égaux » en gros, « diagonales perpendiculaires » en tout petit. Le résultat
 * est une planche où la taille du texte semble vouloir dire quelque chose
 * — plus gros, plus important — alors qu'elle ne dit que la longueur du mot.
 * On prend donc la plus petite des tailles, et on la donne à toutes.
 *
 * AVEC UN PLANCHER, ET UNE EXCEPTION. Un seul mot très long — ici
 * « perpendiculaires » — tire toute la planche vers le bas : il ne se coupe
 * pas, il doit tenir sur une ligne, et il impose sa taille aux douze autres.
 * On refuse de descendre en dessous du plancher pour lui : les douze restent
 * lisibles, et lui seul s'écrit un cran plus petit. La différence ne se
 * remarque pas ; la planche entière écrite en corps 5, si.
 */
const PLANCHER_VIGNETTE = 2.4;   // mm d'œil — en dessous, on ne lit plus de loin

function mesurerVignettes(textes, w, h) {
    const util = { w: w - 1.6, h: h - 1.6 };
    const seules = textes.map(t => ajusterAuRectangle(t, util.w, util.h, { max: 4, min: 1.5 }));
    const commune = Math.max(PLANCHER_VIGNETTE, Math.min(...seules.map(m => m.taille)));
    return textes.map((t, i) => (seules[i].taille >= commune
        ? ajusterAuRectangle(t, util.w, util.h, { max: commune, min: commune })
        : seules[i]));
}

/**
 * UNE VIGNETTE, AU PDF — le pendant exact de `dessinerVignetteSvg`.
 *
 * LA TAILLE DE POLICE PASSE DES MILLIMÈTRES AUX POINTS. `ajusterAuRectangle`
 * raisonne dans l'unité qu'on lui donne — ici le millimètre, comme toute cette
 * feuille —, et jsPDF veut des points typographiques. Un point vaut 0,352 78 mm,
 * d'où le facteur. Sans lui, une carte calculée pour 4 mm d'œil recevait une
 * police de 4 points, soit un tiers de la taille voulue : le texte tenait, et
 * ne se lisait plus.
 */
function dessinerVignettePdf(doc, mesure, famille, x, y, w, h) {
    const { taille, lignes } = mesure;
    doc.setDrawColor(...ENCRE.trait);
    doc.setLineWidth(0.3);
    doc.setFillColor(...(RVB_COND[famille] || [255, 255, 255]));
    doc.roundedRect(x, y, w, h, 0.8, 0.8, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(taille / 0.352778);
    doc.setTextColor(...rvbHex(ENCRE_COND(famille)));
    const total = lignes.length * taille * 1.16;
    lignes.forEach((ligne, i) => {
        doc.text(pourPdf(ligne), x + w / 2, y + h / 2 - total / 2 + (i + 0.5) * taille * 1.16,
            { align: 'center', baseline: 'middle' });
    });
}

/** Les treize cartes, collées bord à bord, sous leur intertitre. */
function dessinerPlancheVignettes(doc, g) {
    const p = g.planche;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(...ENCRE.texte);
    doc.text(pourPdf('À découper et à coller dans les cases'), g.b.x, g.listeY + 2.6);
    (g.m.vignettes || []).forEach((v, i) => {
        dessinerVignettePdf(doc, g.mesures[v.cle], v.famille,
            p.x + (i % p.cols) * p.condW,
            p.y + Math.floor(i / p.cols) * p.condH,
            p.condW, p.condH);
    });
}

const echapperXml = (t) => String(t == null ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function dessinerVignetteSvg(mesure, famille, x, y, w, h, k, ecrire) {
    const T = (v) => (v * k).toFixed(2);
    const { taille, lignes } = mesure;
    ecrire(`<rect x="${T(x)}" y="${T(y)}" width="${T(w)}" height="${T(h)}" rx="${T(0.8)}"
        fill="${TEINTE_COND[famille] || '#ffffff'}" stroke="#1a202c"
        stroke-width="${(0.3 * k).toFixed(2)}"/>`);
    const encre = ENCRE_COND(famille);
    const total = lignes.length * taille * 1.16;
    lignes.forEach((ligne, i) => {
        const yy = y + h / 2 - total / 2 + (i + 0.5) * taille * 1.16;
        ecrire(`<text x="${T(x + w / 2)}" y="${T(yy)}" text-anchor="middle"
            dominant-baseline="central" font-size="${T(taille)}" fill="${encre}"
            font-family="Helvetica, Arial, sans-serif">${echapperXml(ligne)}</text>`);
    });
}

/** Les treize cartes, collées bord à bord, sous leur intertitre. */
function plancheVignettesSvg(g, k) {
    const p = g.planche;
    const T = (v) => (v * k).toFixed(2);
    let out = `<text x="${T(g.b.x)}" y="${T(g.listeY + 2.6)}" font-size="${T(2.9)}"
        font-weight="700" fill="#2d3748" font-family="Helvetica, Arial, sans-serif"
        >À découper et à coller dans les cases</text>`;
    (g.m.vignettes || []).forEach((v, i) => {
        const x = p.x + (i % p.cols) * p.condW;
        const y = p.y + Math.floor(i / p.cols) * p.condH;
        dessinerVignetteSvg(g.mesures[v.cle], v.famille, x, y, p.condW, p.condH, k,
            (html) => { out += html; });
    });
    return out;
}

function dessinerOrganigrammePdf(doc, item, slot, solution) {
    const g = geoOrganigramme(item, slot);

    const tailleP = Math.max(1.6, g.wUtile * 0.011);
    doc.setDrawColor(90, 98, 116);
    doc.setFillColor(90, 98, 116);
    doc.setLineWidth(0.45);
    doc.setLineJoin('round');
    doc.setLineCap('round');
    cheminsUniques().forEach(f => {
        const t = traitsQ(f);
        [t.entrant, t.sortant].forEach(seg => {
            // Les mêmes virages arrondis qu'à l'aperçu et qu'à l'écran : le
            // noyau rend la ligne déjà découpée, les deux rendus n'ont plus qu'à
            // la projeter. Une courbe échantillonnée à huit segments s'écarte
            // d'un dixième de millimètre de la vraie — invisible au trait de
            // 0,45 mm dont elle est tracée.
            const pts = coinsArrondisQ(seg).map(q => g.P(q));
            for (let i = 1; i < pts.length; i++) {
                doc.line(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
            }
            const tri = pointeMm(seg, g, tailleP);
            if (tri) doc.triangle(tri[0].x, tri[0].y, tri[1].x, tri[1].y, tri[2].x, tri[2].y, 'F');
        });
    });

    FAMILLES_Q.forEach(fam => {
        const c = g.P(POSITIONS_Q[fam.id]);
        const x = c.x - g.caseW / 2, y = c.y - g.caseH / 2;
        const hb = g.caseH * BANDE_NOM_Q, hd = g.caseH - hb;
        doc.setDrawColor(...ENCRE.trait);
        doc.setLineWidth(0.35);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(x, y, g.caseW, g.caseH, 1.4, 1.4, 'FD');
        // Le bandeau du nom, sous le dessin — voir l'aperçu.
        doc.setFillColor(...rvbHex(BANDE_Q));
        doc.setLineWidth(0.3);
        doc.rect(x, y + hd, g.caseW, hb - 1.4, 'FD');
        doc.roundedRect(x, y + hd, g.caseW, hb, 1.4, 1.4, 'FD');

        // LA FIGURE PREND LES DEUX TIERS DU HAUT, le nom le dernier tiers. La
        // case a rétréci en passant en portrait, et le nom, calé à 85 % de sa
        // hauteur avec une police plancher de 5 points, débordait dessous —
        // mesuré sur le premier PDF, « Parallélogramme » chevauchait le trait
        // qui descend vers la rangée suivante.
        const fw = Math.min(g.caseW * 0.5, hd * 0.82), fh = fw;
        const fx = c.x - fw / 2, fy = y + (hd - fh) / 2;
        const pts = fam.figure.map(pt => [fx + (pt[0] / 100) * fw, fy + (pt[1] / 100) * fh]);
        doc.setFillColor(...rvbHex(FIGURE_Q));
        doc.setDrawColor(...ENCRE.trait);
        doc.setLineWidth(0.4);
        doc.lines(pts.slice(1).concat([pts[0]]).map((q, i) => {
            const a = i === 0 ? pts[0] : pts[i];
            return [q[0] - a[0], q[1] - a[1]];
        }), pts[0][0], pts[0][1], [1, 1], 'FD', true);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(policeNomFigure(g.caseW, hb) / 0.352778);
        doc.setTextColor(...ENCRE.texte);
        if (g.m.avecNoms || solution) {
            doc.text(pourPdf(fam.nom), c.x, y + hd + hb / 2, { align: 'center', baseline: 'middle' });
        }
    });

    FLECHES_Q.forEach(f => {
        const e = g.P(posEtiquetteQ(f));
        const w = g.condW, h = g.condH;
        if (g.planche) {
            // EN MODE DÉCOUPAGE, LA CASE DU PLAN RESTE BLANCHE : c'est la CARTE
            // qui porte la couleur de sa famille. Teinter les deux reviendrait
            // à donner la réponse — il suffirait d'assortir les couleurs sans
            // lire une seule phrase.
            if (solution) {
                dessinerVignettePdf(doc, g.mesures[cleFlecheQ(f)], f.famille,
                    e.x - w / 2, e.y - h / 2, w, h);
            }
            else {
                doc.setDrawColor(...ENCRE.trait);
                doc.setLineWidth(0.3);
                doc.setFillColor(255, 255, 255);
                doc.roundedRect(e.x - w / 2, e.y - h / 2, w, h, 0.8, 0.8, 'FD');
            }
            return;
        }
        doc.setDrawColor(...ENCRE.trait);
        doc.setLineWidth(0.3);
        const teinte = RVB_COND[f.famille] || [255, 255, 255];
        doc.setFillColor(...teinte);
        doc.roundedRect(e.x - w / 2, e.y - h / 2, w, h, 1.6, 1.6, 'FD');
        // PAS DE CARRÉ D'ÉCRITURE DEDANS — voir l'aperçu : on écrit dans la case
        // teintée elle-même.
        if (solution) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(Math.min(h * 0.62, 7) / 0.352778);
            doc.setTextColor(...rvbHex(ENCRE_COND(f.famille)));
            doc.text(g.m.parCle[cleFlecheQ(f)], e.x, e.y, { align: 'center', baseline: 'middle' });
        }
    });

    if (g.planche) {
        // La planche ne se répète pas sur la feuille de solutions.
        if (!solution) dessinerPlancheVignettes(doc, g);
        return;
    }

    // LA LISTE, EN ENTIER — et c'était un vrai défaut.
    //
    // On repliait le libellé à la largeur de la colonne… puis on n'imprimait
    // que sa PREMIÈRE ligne. La feuille annonçait donc « Qui a ses côtés
    // opposés », « Qui a deux côtés consécutifs de », « Qui a ses diagonales » :
    // quatre conditions sur neuf s'arrêtaient au milieu d'une phrase, et
    // l'exercice devenait indevinable. On écrit maintenant toutes les lignes.
    const colW = g.b.w / 2;
    const lignes = Math.ceil(g.m.liste.length / 2);
    const pas = pasListe(g, lignes);
    doc.setFontSize(8.4);
    doc.setTextColor(...ENCRE.texte);
    g.m.liste.forEach((l, i) => {
        const col = Math.floor(i / lignes), rang = i % lignes;
        const x = g.b.x + col * colW;
        const y = g.listeY + rang * pas + 3;
        doc.setFont('helvetica', 'bold');
        doc.text(`${l.lettre}.`, x, y);
        doc.setFont('helvetica', 'normal');
        doc.splitTextToSize(pourPdf(l.texte), colW - 10)
            .forEach((t, j) => doc.text(t, x + 5.5, y + j * 3.6));
    });

    // La clef des couleurs — voir l'aperçu.
    let lx = g.b.x;
    const ly = g.listeY + lignes * pas + 4;
    doc.setFontSize(8.2);
    LEGENDE_COND.forEach(({ famille, mot }) => {
        doc.setFillColor(...RVB_COND[famille]);
        doc.setDrawColor(90, 98, 116);
        doc.setLineWidth(0.25);
        doc.roundedRect(lx, ly - 2.4, 3.4, 3.4, 0.6, 0.6, 'FD');
        doc.setTextColor(...ENCRE.gris);
        doc.text(pourPdf(mot), lx + 4.6, ly);
        lx += 6 + doc.getTextWidth(pourPdf(mot));
    });
    doc.setTextColor(...ENCRE.texte);
    doc.setFont('helvetica', 'normal');
}

// --- LES BONS CHEMINS, SUR LE PAPIER ------------------------------------------
//
// Sa forme d'origine : Rémy est parti d'une fiche photocopiée. Une grille de
// nombres avec un D et un A dans deux coins opposés, la cible écrite dessous,
// et rien d'autre — le chemin se trace au crayon.
//
// LA CIBLE EST SOUS LA GRILLE, PAS DANS LA CONSIGNE. Six blocs sur une page,
// c'est six cibles différentes : les mettre dans la consigne commune les
// mélangerait. Chaque bloc porte donc la sienne, en gras, exactement comme sur
// la fiche de Rémy — « Trouve 240 ».
//
// CE QUI A ÉTÉ REPRIS, ET POURQUOI. Rémy, banc d'essai : « c'est assez moche le
// bon chemin en rendu PDF ». Trois défauts, dont un vrai bogue.
//
//   · LES CHIFFRES SORTAIENT DEUX FOIS TROP PETITS. L'aperçu écrivait un corps
//     de 0,42 × la case, le PDF plafonnait le sien à 15 points : dans une case
//     de 24 mm, cela fait un chiffre de 5 mm perdu au milieu de rien. L'aperçu
//     ne montrait donc PAS ce qu'on imprimait, ce qui est le pire défaut qu'un
//     aperçu puisse avoir. Les deux rendus lisent maintenant les mêmes mesures,
//     écrites une seule fois ici — en millimètres, la seule unité que les deux
//     partagent.
//
//   · LE D ET LE A RESSEMBLAIENT À DES NOMBRES. Même corps, même graisse, même
//     noir : rien ne disait où l'on part ni où l'on arrive, alors que c'est la
//     première chose à voir sur la grille. Leurs deux cases sont désormais
//     teintées, et la lettre y est plus grande.
//
//   · LA GRILLE ÉTAIT UN TABLEAU PÂLE. Neuf rectangles dessinés un par un, en
//     gris clair, chaque trait intérieur repassé deux fois. On trace maintenant
//     un cadre net et des traits intérieurs fins, une seule fois chacun.
//
// Et « Trouve 240 » est posé dans une étiquette de la largeur de la grille : la
// consigne de chaque bloc tient dans une forme, au lieu de flotter dessous.

/** Le corps d'un texte, en points, pour un cadratin de `mm` millimètres. */
const enPoints = (mm) => mm * 2.8346;

// LE TRAIT DE LA SOLUTION EST PÂLE, ET C'EST UNE CORRECTION.
//
// Le PDF le traçait en gris moyen, pleine opacité, SOUS les nombres : sur la
// page des solutions, les chiffres du chemin — ceux qu'on veut lire, puisque ce
// sont eux qu'on multiplie — devenaient noirs sur gris foncé. L'aperçu, lui,
// posait une opacité de 0,5 et paraissait correct : encore un endroit où il
// mentait sur ce qui allait sortir de l'imprimante. Un ruban clair porte le
// chemin aussi bien et laisse lire ce qu'il traverse.
const RUBAN_CHEMIN = [205, 211, 228];

/**
 * LA GÉOMÉTRIE DU BLOC, en millimètres — et elle est la SEULE.
 *
 * L'aperçu la multiplie par son échelle, le PDF la prend telle quelle : c'est
 * ce qui garantit que la feuille imprimée est celle qu'on a vue. Tout ce que
 * les deux dessins ont besoin de savoir est ici, corps des textes compris.
 */
function geoBonsChemins(item, slot) {
    const b = boiteDe(slot);
    const m = item.meta;
    // L'étiquette de la cible mange le bas du bloc : on la réserve AVANT de
    // calculer le côté des cases, sinon la grille déborderait dessus.
    const hCible = Math.max(5, Math.min(8.5, b.h * 0.155));
    const dispo = { w: b.w, h: b.h - hCible };
    const cote = Math.min(dispo.w / m.l, dispo.h / m.h);
    const W = cote * m.l, H = cote * m.h;
    const x0 = b.x + (b.w - W) / 2;
    const y0 = b.y + (dispo.h - H) / 2;
    const centre = (x, y) => ({ x: x0 + (x + 0.5) * cote, y: y0 + (y + 0.5) * cote });
    const estBout = (x, y) => (x === 0 && y === 0) || (x === m.l - 1 && y === m.h - 1);
    // L'étiquette fait la largeur de la grille : les deux formes s'alignent, et
    // le bloc se lit comme un seul objet.
    const pill = { x: x0, y: y0 + H + hCible * 0.14, w: W, h: hCible * 0.78 };
    return {
        b, m, cote, x0, y0, W, H, centre, estBout, pill,
        // Les corps, en millimètres de cadratin. Un chiffre occupe alors un peu
        // plus du tiers de sa case : lisible de loin, sans toucher les traits.
        corps: { nombre: cote * 0.46, lettre: cote * 0.56, cible: Math.min(pill.h * 0.62, W / 6.5) },
        rayon: Math.min(1.6, cote * 0.1),
        trace: cote * 0.26
    };
}

function bonsCheminsPreviewHtml(item, slot, k, solution) {
    const g = geoBonsChemins(item, slot);
    const T = (v) => (v * k).toFixed(2);
    const txt = (p, s, corps, poids) => `<text x="${T(p.x)}" y="${T(p.y)}" fill="#1a202c"
        font-weight="${poids}" font-size="${T(corps)}" text-anchor="middle"
        dominant-baseline="central" font-family="Helvetica, Arial, sans-serif">${s}</text>`;
    let dedans = '';

    // Les deux bouts, teintés : on voit d'où l'on part avant d'avoir rien lu.
    for (let y = 0; y < g.m.h; y++) {
        for (let x = 0; x < g.m.l; x++) {
            if (!g.estBout(x, y)) continue;
            dedans += `<rect x="${T(g.x0 + x * g.cote)}" y="${T(g.y0 + y * g.cote)}"
                width="${T(g.cote)}" height="${T(g.cote)}" fill="#e6eaf6"/>`;
        }
    }
    // Le cadre, puis les traits intérieurs — chacun une seule fois.
    dedans += `<rect x="${T(g.x0)}" y="${T(g.y0)}" width="${T(g.W)}" height="${T(g.H)}"
        rx="${T(g.rayon)}" fill="none" stroke="#4a5266" stroke-width="${T(0.45)}"/>`;
    for (let x = 1; x < g.m.l; x++) {
        dedans += `<path d="M${T(g.x0 + x * g.cote)} ${T(g.y0)} V${T(g.y0 + g.H)}"
            stroke="#b0b6c5" stroke-width="${T(0.22)}"/>`;
    }
    for (let y = 1; y < g.m.h; y++) {
        dedans += `<path d="M${T(g.x0)} ${T(g.y0 + y * g.cote)} H${T(g.x0 + g.W)}"
            stroke="#b0b6c5" stroke-width="${T(0.22)}"/>`;
    }

    if (solution) {
        const d = g.m.solution.map(([x, y], i) => {
            const p = g.centre(x, y);
            return `${i ? 'L' : 'M'}${T(p.x)} ${T(p.y)}`;
        }).join(' ');
        dedans += `<path d="${d}" fill="none" stroke="#cdd3e4" stroke-linecap="round"
            stroke-linejoin="round" stroke-width="${T(g.trace)}"/>`;
    }

    for (let y = 0; y < g.m.h; y++) {
        for (let x = 0; x < g.m.l; x++) {
            const v = String(g.m.cases[y][x]);
            const bout = g.estBout(x, y);
            dedans += txt(g.centre(x, y), v, bout ? g.corps.lettre : g.corps.nombre, bout ? 800 : 700);
        }
    }

    dedans += `<rect x="${T(g.pill.x)}" y="${T(g.pill.y)}" width="${T(g.pill.w)}"
        height="${T(g.pill.h)}" rx="${T(g.pill.h / 2)}" fill="#e6eaf6"/>`;
    dedans += txt({ x: g.pill.x + g.pill.w / 2, y: g.pill.y + g.pill.h / 2 },
        `Trouve ${g.m.cible}`, g.corps.cible, 700);
    return `<svg style="position:absolute; left:0; top:0; width:100%; height:100%;
        overflow:visible; pointer-events:none">${dedans}</svg>`;
}

function dessinerBonsCheminsPdf(doc, item, slot, solution) {
    const g = geoBonsChemins(item, slot);

    // Les deux bouts d'abord : une teinte pleine, sous tout le reste.
    doc.setFillColor(...ENCRE.donnee);
    for (let y = 0; y < g.m.h; y++) {
        for (let x = 0; x < g.m.l; x++) {
            if (g.estBout(x, y)) doc.rect(g.x0 + x * g.cote, g.y0 + y * g.cote, g.cote, g.cote, 'F');
        }
    }
    // Le cadre net, puis les traits intérieurs fins : chacun tracé UNE fois,
    // là où neuf rectangles repassaient deux fois sur chaque trait commun.
    doc.setDrawColor(...ENCRE.trait);
    doc.setLineWidth(0.45);
    doc.roundedRect(g.x0, g.y0, g.W, g.H, g.rayon, g.rayon);
    doc.setDrawColor(...ENCRE.grille);
    doc.setLineWidth(0.22);
    for (let x = 1; x < g.m.l; x++) doc.line(g.x0 + x * g.cote, g.y0, g.x0 + x * g.cote, g.y0 + g.H);
    for (let y = 1; y < g.m.h; y++) doc.line(g.x0, g.y0 + y * g.cote, g.x0 + g.W, g.y0 + y * g.cote);

    if (solution) {
        // Le chemin en ruban clair : il se lit d'un coup d'oeil sans effacer les
        // nombres, qu'on redessine par-dessus.
        doc.setDrawColor(...RUBAN_CHEMIN);
        doc.setLineWidth(g.trace);
        doc.setLineCap('round');
        doc.setLineJoin('round');
        for (let i = 1; i < g.m.solution.length; i++) {
            const a = g.centre(...g.m.solution[i - 1]);
            const b = g.centre(...g.m.solution[i]);
            doc.line(a.x, a.y, b.x, b.y);
        }
        doc.setLineCap('butt');
        doc.setLineJoin('miter');
    }

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...ENCRE.texte);
    for (let y = 0; y < g.m.h; y++) {
        for (let x = 0; x < g.m.l; x++) {
            const p = g.centre(x, y);
            doc.setFontSize(enPoints(g.estBout(x, y) ? g.corps.lettre : g.corps.nombre));
            doc.text(String(g.m.cases[y][x]), p.x, p.y, { align: 'center', baseline: 'middle' });
        }
    }

    doc.setFillColor(...ENCRE.donnee);
    doc.roundedRect(g.pill.x, g.pill.y, g.pill.w, g.pill.h, g.pill.h / 2, g.pill.h / 2, 'F');
    doc.setFontSize(enPoints(g.corps.cible));
    doc.text(pourPdf(`Trouve ${g.m.cible}`), g.pill.x + g.pill.w / 2, g.pill.y + g.pill.h / 2,
        { align: 'center', baseline: 'middle' });
    doc.setFont('helvetica', 'normal');
}

// --- LE TABLEAU À DOUBLE ENTRÉE, SUR LE PAPIER --------------------------------
//
// Sa forme d'origine : Rémy est parti d'une fiche. L'énoncé au-dessus, le
// tableau dessous, les cases à trouver vides — c'est tout.
//
// LES COLONNES NE SONT PAS TOUTES DE LA MÊME LARGEUR. La colonne des libellés
// porte « Pains au chocolat », les autres portent un nombre à trois chiffres :
// leur donner la même largeur gâcherait la moitié du bloc ou couperait les
// mots. On mesure donc le libellé le plus long et on lui donne ce qu'il faut,
// le reste se partageant équitablement.

function geoTableauCroise(item, slot) {
    const b = boiteDe(slot);
    const m = item.meta;

    // L'ÉNONCÉ SE MESURE AVANT DE RÉSERVER SA PLACE. On réservait une hauteur
    // fixe : quand la phrase prenait deux lignes, la seconde se posait sur le
    // bord du tableau.
    // ET EN MODE « ÉNONCÉ », C'EST L'ÉNONCÉ QUI PORTE LES NOMBRES : il y en a
    // huit ou douze, écrits en toutes lettres, et le tableau part vide. Le
    // texte prend donc beaucoup plus de place — jusqu'à sept lignes, en plus
    // petit — et le tableau se contente de ce qui reste. Les faits s'enchaînent
    // en une seule phrase séparée par des points-virgules : douze puces sur un
    // bloc de huit centimètres ne tiendraient pas, et se liraient mal.
    const parEnonce = m.depart === 'enonce' && Array.isArray(m.donnees) && m.donnees.length;
    const texte = parEnonce
        ? `${m.phrase} On sait que : ${m.donnees.map(d => d.phrase).join(' ; ')}.`
        : m.phrase;

    // LE TABLEAU GARDE SA PLACE, C'EST LE TEXTE QUI RÉTRÉCIT. Mesuré : à corps
    // fixe, huit faits mangeaient les deux tiers du bloc et il ne restait que
    // quatre millimètres pour trois lignes de tableau — les libellés étaient
    // illisibles, et sur deux blocs le tableau avait entièrement disparu. On
    // réserve donc d'abord de quoi écrire dans les cases (5,2 mm par ligne,
    // le minimum où un nombre à trois chiffres reste lisible), et l'on cherche
    // le plus grand corps de texte qui tient dans ce qui reste.
    const hauteurMini = (m.R + 2) * 5.2;
    let corpsTexte = 5.6;
    let lignesTexte = couperEnLignes(texte, Math.floor(b.w / (corpsTexte * 0.46)), 2);
    if (parEnonce) {
        const place = Math.max(10, b.h - hauteurMini);
        for (const corps of [4.6, 4.2, 3.8, 3.4, 3.1, 2.8]) {
            corpsTexte = corps;
            lignesTexte = couperEnLignes(texte, Math.floor(b.w / (corps * 0.46)), 40);
            if (lignesTexte.length * corps * 1.25 + 1.8 <= place) break;
        }
    }
    const hEnonce = lignesTexte.length * corpsTexte * 1.25 + 1.8;
    const rh = Math.min(8.5, Math.max(4.4, (b.h - hEnonce) / (m.R + 2)));

    // LA COLONNE DES LIBELLÉS N'EST PAS COMME LES AUTRES. Elle porte « Pains au
    // chocolat » quand les autres portent trois chiffres. Mais lui donner un
    // tiers du bloc quand elle ne contient que « Gagnées » vole de la largeur
    // aux en-têtes, qui se touchent alors. Elle prend donc ce que réclame son
    // plus long libellé, entre un cinquième et un tiers du bloc.
    const libelles = [...m.lignes, 'Total'];
    const plusLong = libelles.reduce((a, l) => Math.max(a, l.length), 1);
    const wLib = Math.max(b.w * 0.2, Math.min(b.w * 0.34, plusLong * 3.1 + 1.6));
    const wCol = (b.w - wLib) / (m.C + 1);

    // CHAQUE TEXTE REÇOIT LA TAILLE QUI LE FAIT TENIR DANS SA CASE — en largeur
    // ET en hauteur. Le premier jet ne bornait que la largeur : les nombres
    // courts prenaient la taille maximale et dépassaient de leur ligne.
    // 0,52 DE LA LIGNE, ET NON 0,62. Rémy, sur une fiche de cinquième : « ça
    // déborde un peu, les chiffres font un peu gros ». Un caractère occupe en
    // hauteur bien plus que son corps — hampes hautes et jambages compris, à
    // peu près 1,2 fois —, si bien qu'un corps de 0,62 ligne remplissait la
    // case du haut en bas et venait toucher les traits.
    const haut = rh * 0.52;
    const corpsLib = Math.min(haut, tailleQuiRentre(libelles, wLib - 1.6, 8));
    const corpsTete = Math.min(haut, tailleQuiRentre([...m.colonnes, 'Total'], wCol - 0.8, 8));
    const corpsNb = Math.min(haut, tailleQuiRentre(m.valeurs.flat().map(String), wCol - 1.4, 8));

    const x0 = b.x;
    const y0 = b.y + hEnonce;
    const xDe = (c) => x0 + wLib + c * wCol;    // c de 0 à C
    const yDe = (r) => y0 + rh + r * rh;        // la ligne d'en-tête est au-dessus
    return { b, m, rh, corpsLib, corpsTete, corpsNb, corpsTexte, lignesTexte,
        wLib, wCol, x0, y0, xDe, yDe, hEnonce };
}

/**
 * La plus grande taille de police (en mm) qui fait tenir TOUS ces textes dans
 * la largeur donnée.
 *
 * 0,60 ET NON 0,52. C'était le second morceau du débordement signalé par Rémy,
 * et c'est une erreur de mesure : ces textes-là sont écrits en GRAS, et un
 * chiffre d'Helvetica gras fait 0,556 cadratin de large — 0,52 le sous-estimait
 * donc de sept pour cent, sans compter la marge qu'on croyait garder. Un
 * nombre de trois chiffres dépassait ainsi sa case d'un demi-millimètre, ce qui
 * se voit ; un demi-point de police en moins ne se voit pas.
 */
function tailleQuiRentre(textes, largeur, corpsMax) {
    const plusLong = textes.reduce((a, t) => Math.max(a, String(t).length), 1);
    // Le plancher à 3 mm vaut environ 8,5 points : c'est petit, mais lisible à
    // l'impression — et cela reste préférable à un « Septembre » qui déborde
    // sur la colonne voisine.
    return Math.max(3, Math.min(corpsMax, largeur / (plusLong * 0.6)));
}

function tableauCroisePreviewHtml(item, slot, k, solution) {
    const g = geoTableauCroise(item, slot);
    const m = g.m;
    const T = (v) => (v * k).toFixed(2);
    // EN MODE « ÉNONCÉ », AUCUNE CASE N'EST IMPRIMÉE : les nombres connus sont
    // dans le texte, et les recopier dans le tableau supprimerait l'exercice.
    const connus = new Set(m.depart === 'enonce' ? [] : m.connus);
    let d = '';
    const centre = (x, y, s, corps, couleur) => `<text x="${T(x)}" y="${T(y)}" fill="${couleur || '#1a202c'}"
        font-weight="700" font-size="${(corps * k).toFixed(2)}" text-anchor="middle"
        dominant-baseline="central" font-family="Helvetica, Arial, sans-serif">${echapper(s)}</text>`;

    g.lignesTexte.forEach((ligne, i) => {
        d += `<text x="${T(g.b.x)}" y="${T(g.b.y + g.corpsTexte * (0.95 + i * 1.25))}" fill="#1a202c"
            font-size="${(g.corpsTexte * k).toFixed(2)}" font-family="Helvetica, Arial, sans-serif">${echapper(ligne)}</text>`;
    });

    for (let r = -1; r <= m.R; r++) {
        for (let c = -1; c <= m.C; c++) {
            const x = c < 0 ? g.x0 : g.xDe(c);
            const w = c < 0 ? g.wLib : g.wCol;
            const y = r < 0 ? g.y0 : g.yDe(r);
            d += `<rect x="${T(x)}" y="${T(y)}" width="${T(w)}" height="${T(g.rh)}" fill="none"
                stroke="#8a90a0" stroke-width="${(0.25 * k).toFixed(2)}"/>`;
        }
    }
    m.colonnes.forEach((c, i) => { d += centre(g.xDe(i) + g.wCol / 2, g.y0 + g.rh / 2, c, g.corpsTete); });
    d += centre(g.xDe(m.C) + g.wCol / 2, g.y0 + g.rh / 2, 'Total', g.corpsTete);
    [...m.lignes, 'Total'].forEach((l, r) => {
        d += `<text x="${T(g.x0 + 0.8)}" y="${T(g.yDe(r) + g.rh / 2)}" fill="#1a202c" font-weight="700"
            font-size="${(g.corpsLib * k).toFixed(2)}" dominant-baseline="central"
            font-family="Helvetica, Arial, sans-serif">${echapper(l)}</text>`;
    });
    for (let r = 0; r <= m.R; r++) {
        for (let c = 0; c <= m.C; c++) {
            const donne = connus.has(`${r},${c}`);
            if (!donne && !solution) continue;
            d += centre(g.xDe(c) + g.wCol / 2, g.yDe(r) + g.rh / 2, String(m.valeurs[r][c]),
                g.corpsNb, donne ? '#1a202c' : '#8a90a0');
        }
    }
    return `<svg style="position:absolute; left:0; top:0; width:100%; height:100%;
        overflow:visible; pointer-events:none">${d}</svg>`;
}

function dessinerTableauCroisePdf(doc, item, slot, solution) {
    const g = geoTableauCroise(item, slot);
    const m = g.m;
    const connus = new Set(m.depart === 'enonce' ? [] : m.connus);
    // jsPDF compte en points, la géométrie en millimètres : 1 mm ≈ 2,835 pt,
    // et les fontes remplissent environ les trois quarts de leur corps.
    const pt = (mm) => mm * 2.6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(pt(g.corpsTexte));
    doc.setTextColor(...ENCRE.texte);
    g.lignesTexte.forEach((ligne, i) => {
        doc.text(pourPdf(ligne), g.b.x, g.b.y + g.corpsTexte * (0.95 + i * 1.25));
    });

    doc.setDrawColor(...ENCRE.grille);
    doc.setLineWidth(0.25);
    for (let r = -1; r <= m.R; r++) {
        for (let c = -1; c <= m.C; c++) {
            const x = c < 0 ? g.x0 : g.xDe(c);
            const w = c < 0 ? g.wLib : g.wCol;
            const y = r < 0 ? g.y0 : g.yDe(r);
            doc.rect(x, y, w, g.rh);
        }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(pt(g.corpsTete));
    m.colonnes.forEach((c, i) => {
        doc.text(pourPdf(c), g.xDe(i) + g.wCol / 2, g.y0 + g.rh / 2, { align: 'center', baseline: 'middle' });
    });
    doc.text('Total', g.xDe(m.C) + g.wCol / 2, g.y0 + g.rh / 2, { align: 'center', baseline: 'middle' });

    doc.setFontSize(pt(g.corpsLib));
    [...m.lignes, 'Total'].forEach((l, r) => {
        doc.text(pourPdf(l), g.x0 + 0.8, g.yDe(r) + g.rh / 2, { baseline: 'middle' });
    });

    doc.setFontSize(pt(g.corpsNb));
    for (let r = 0; r <= m.R; r++) {
        for (let c = 0; c <= m.C; c++) {
            const donne = connus.has(`${r},${c}`);
            if (!donne && !solution) continue;
            doc.setTextColor(...(donne ? ENCRE.texte : ENCRE.gris));
            doc.text(String(m.valeurs[r][c]), g.xDe(c) + g.wCol / 2, g.yDe(r) + g.rh / 2,
                { align: 'center', baseline: 'middle' });
        }
    }
    doc.setTextColor(...ENCRE.texte);
    doc.setFont('helvetica', 'normal');
}

/** Couper un texte en lignes d'au plus `large` caractères, `max` lignes au plus. */
function couperEnLignes(texte, large, max) {
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

const echapper = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

// --- RELIER SANS CROISER, SUR LE PAPIER ---------------------------------------
//
// Sa forme d'origine : Rémy est parti d'une image de fiche. Un cadre, des
// carrés étiquetés, rien d'autre — on trace au crayon et l'on gomme.
//
// LA CORRECTION DIT « UNE » SOLUTION, PAS « LA ». Ces figures en ont presque
// toujours plusieurs, qui ne se ressemblent même pas : un élève dont le tracé
// diffère de la feuille de solutions ne doit pas croire qu'il s'est trompé.
// C'est écrit dans la consigne du bloc de solutions.

function geoSansCroiser(item, slot) {
    const b = boiteDe(slot);
    const m = item.meta;
    const k = Math.min(b.w / m.cadre.l, b.h / m.cadre.h);
    const x0 = b.x + (b.w - m.cadre.l * k) / 2;
    const y0 = b.y + (b.h - m.cadre.h * k) / 2;
    const point = (p) => ({ x: x0 + p.x * k, y: y0 + p.y * k });
    return { b, m, k, x0, y0, point, cote: m.cote * k };
}

function sansCroiserPreviewHtml(item, slot, kEch, solution) {
    const g = geoSansCroiser(item, slot);
    const T = (v) => (v * kEch).toFixed(2);
    let d = `<rect x="${T(g.x0)}" y="${T(g.y0)}" width="${T(g.m.cadre.l * g.k)}"
        height="${T(g.m.cadre.h * g.k)}" fill="none" stroke="#1a202c"
        stroke-width="${(0.4 * kEch).toFixed(2)}"/>`;

    if (solution) {
        for (const t of g.m.solution) {
            const trace = t.points.map((p, i) => {
                const q = g.point(p);
                return `${i ? 'L' : 'M'}${T(q.x)} ${T(q.y)}`;
            }).join(' ');
            d += `<path d="${trace}" fill="none" stroke="#8a90a0" stroke-linecap="round"
                stroke-linejoin="round" stroke-width="${(g.cote * 0.28 * kEch).toFixed(2)}" opacity="0.65"/>`;
        }
    }

    for (const b of g.m.bornes) {
        const c = g.point(b);
        d += `<rect x="${T(c.x - g.cote / 2)}" y="${T(c.y - g.cote / 2)}" width="${T(g.cote)}"
            height="${T(g.cote)}" fill="#ffffff" stroke="#1a202c" stroke-width="${(0.35 * kEch).toFixed(2)}"/>`;
        d += `<text x="${T(c.x)}" y="${T(c.y)}" fill="#1a202c" font-weight="700"
            font-size="${(g.cote * 0.68 * kEch).toFixed(2)}" text-anchor="middle"
            dominant-baseline="central" font-family="Helvetica, Arial, sans-serif">${b.lettre}</text>`;
    }
    return `<svg style="position:absolute; left:0; top:0; width:100%; height:100%;
        overflow:visible; pointer-events:none">${d}</svg>`;
}

function dessinerSansCroiserPdf(doc, item, slot, solution) {
    const g = geoSansCroiser(item, slot);

    doc.setDrawColor(...ENCRE.trait);
    doc.setLineWidth(0.4);
    doc.rect(g.x0, g.y0, g.m.cadre.l * g.k, g.m.cadre.h * g.k);

    if (solution) {
        doc.setDrawColor(...ENCRE.gris);
        doc.setLineWidth(Math.max(0.5, g.cote * 0.22));
        doc.setLineCap('round');
        doc.setLineJoin('round');
        for (const t of g.m.solution) {
            for (let i = 1; i < t.points.length; i++) {
                const a = g.point(t.points[i - 1]);
                const b = g.point(t.points[i]);
                doc.line(a.x, a.y, b.x, b.y);
            }
        }
        doc.setLineCap('butt');
        doc.setLineJoin('miter');
    }

    doc.setLineWidth(0.35);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(Math.max(6, Math.min(14, g.cote * 1.9)));
    for (const b of g.m.bornes) {
        const c = g.point(b);
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...ENCRE.trait);
        doc.rect(c.x - g.cote / 2, c.y - g.cote / 2, g.cote, g.cote, 'FD');
        doc.setTextColor(...ENCRE.texte);
        doc.text(b.lettre, c.x, c.y, { align: 'center', baseline: 'middle' });
    }
    doc.setFont('helvetica', 'normal');
}

// --- LE LABYRINTHE DES NOMBRES, SUR LE PAPIER ---------------------------------
//
// Sa forme d'origine : Rémy est parti d'un livre. Une grille de nombres, un
// depart entoure, une etoile, et rien d'autre — le chemin se trace au crayon.

function geoLabyNombres(item, slot) {
    const b = boiteDe(slot);
    const m = item.meta;
    const cote = Math.min(b.w / m.l, b.h / m.h);
    const x0 = b.x + (b.w - cote * m.l) / 2;
    const y0 = b.y + (b.h - cote * m.h) / 2;
    const centre = (x, y) => ({ x: x0 + (x + 0.5) * cote, y: y0 + (y + 0.5) * cote });
    return { b, m, cote, x0, y0, centre };
}

/** Une etoile a cinq branches, en coordonnees absolues. */
function pointsEtoile(cx, cy, r) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 ? r * 0.45 : r;
        pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    return pts;
}

function labyNombresPreviewHtml(item, slot, k, solution) {
    const g = geoLabyNombres(item, slot);
    const T = (v) => (v * k).toFixed(2);
    let dedans = '';
    for (let y = 0; y < g.m.h; y++) {
        for (let x = 0; x < g.m.l; x++) {
            dedans += `<rect x="${T(g.x0 + x * g.cote)}" y="${T(g.y0 + y * g.cote)}"
                width="${T(g.cote)}" height="${T(g.cote)}" fill="none"
                stroke="#b0b6c5" stroke-width="${(0.25 * k).toFixed(2)}"/>`;
        }
    }
    if (solution) {
        const d = g.m.solution.map(([x, y], i) => {
            const p = g.centre(x, y);
            return `${i ? 'L' : 'M'}${T(p.x)} ${T(p.y)}`;
        }).join(' ');
        dedans += `<path d="${d}" fill="none" stroke="#8a90a0" stroke-linecap="round"
            stroke-linejoin="round" stroke-width="${(g.cote * 0.16 * k).toFixed(2)}" opacity="0.75"/>`;
    }
    // Le depart : un carre autour de la case.
    const dep = g.centre(...g.m.depart);
    dedans += `<rect x="${T(dep.x - g.cote * 0.42)}" y="${T(dep.y - g.cote * 0.42)}"
        width="${T(g.cote * 0.84)}" height="${T(g.cote * 0.84)}" rx="${T(g.cote * 0.12)}"
        fill="none" stroke="#1a202c" stroke-width="${(0.5 * k).toFixed(2)}"/>`;
    for (let y = 0; y < g.m.h; y++) {
        for (let x = 0; x < g.m.l; x++) {
            const n = g.m.grille[y][x];
            const p = g.centre(x, y);
            if (!n) {
                const pts = pointsEtoile(p.x, p.y, g.cote * 0.3).map(([a, b2]) => `${T(a)},${T(b2)}`).join(' ');
                dedans += `<polygon points="${pts}" fill="#1a202c"/>`;
                continue;
            }
            dedans += `<text x="${T(p.x)}" y="${T(p.y)}" fill="#1a202c" font-weight="700"
                font-size="${(g.cote * 0.42 * k).toFixed(2)}" text-anchor="middle"
                dominant-baseline="central" font-family="Helvetica, Arial, sans-serif">${n}</text>`;
        }
    }
    return `<svg style="position:absolute; left:0; top:0; width:100%; height:100%;
        overflow:visible; pointer-events:none">${dedans}</svg>`;
}

function dessinerLabyNombresPdf(doc, item, slot, solution) {
    const g = geoLabyNombres(item, slot);

    doc.setDrawColor(...ENCRE.grille);
    doc.setLineWidth(0.25);
    for (let y = 0; y < g.m.h; y++) {
        for (let x = 0; x < g.m.l; x++) {
            doc.rect(g.x0 + x * g.cote, g.y0 + y * g.cote, g.cote, g.cote);
        }
    }

    if (solution) {
        doc.setDrawColor(...ENCRE.gris);
        doc.setLineWidth(Math.max(0.5, g.cote * 0.14));
        doc.setLineCap('round');
        doc.setLineJoin('round');
        for (let i = 1; i < g.m.solution.length; i++) {
            const a = g.centre(...g.m.solution[i - 1]);
            const b = g.centre(...g.m.solution[i]);
            doc.line(a.x, a.y, b.x, b.y);
        }
        doc.setLineCap('butt');
        doc.setLineJoin('miter');
    }

    const dep = g.centre(...g.m.depart);
    doc.setDrawColor(...ENCRE.trait);
    doc.setLineWidth(0.5);
    doc.rect(dep.x - g.cote * 0.42, dep.y - g.cote * 0.42, g.cote * 0.84, g.cote * 0.84);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(Math.max(6, Math.min(14, g.cote * 1.2)));
    doc.setTextColor(...ENCRE.texte);
    doc.setFillColor(...ENCRE.trait);
    for (let y = 0; y < g.m.h; y++) {
        for (let x = 0; x < g.m.l; x++) {
            const n = g.m.grille[y][x];
            const p = g.centre(x, y);
            if (!n) {
                const pts = pointsEtoile(p.x, p.y, g.cote * 0.3);
                doc.lines(
                    pts.slice(1).map((q, i) => [q[0] - pts[i][0], q[1] - pts[i][1]])
                        .concat([[pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]]]),
                    pts[0][0], pts[0][1], [1, 1], 'F'
                );
                continue;
            }
            doc.text(String(n), p.x, p.y, { align: 'center', baseline: 'middle' });
        }
    }
    doc.setFont('helvetica', 'normal');
}


// --- Colorier par les nombres -------------------------------------------------
//
// Rémy : « pour colorier par les nombres, on ne pourrait pas faire un pdf ».
//
// LA GRILLE OCCUPE UN CARRÉ, INDICES COMPRIS. Les nombres se lisent à gauche
// des lignes et au-dessus des colonnes ; la place qu'ils prennent dépend de la
// grille — une grille de dix peut demander trois nombres sur une colonne, une
// grille de cinq n'en demande qu'un. On mesure donc les marges sur l'énoncé,
// et la case se déduit du reste : `taille / (n + marge)`. Une marge écrite en
// dur aurait rogné les indices d'un côté ou gaspillé un tiers de la feuille de
// l'autre.
//
// LES CASES SONT GRANDES, ET C'EST LE POINT. On colorie au crayon et l'on
// BARRE ce qu'on sait blanc — une croix vaut autant qu'une case coloriée. Une
// case de trois millimètres ne se barre pas.
function plaqueColorier(item, slot) {
    const { enonce, margeLignes, margeColonnes } = item.meta;
    const n = enonce.largeur, h = enonce.hauteur;
    // Une colonne d'indices est moins large qu'une case : ce sont des chiffres
    // seuls, et leur donner la largeur d'une case pousserait la grille dehors.
    const c = slot.taille / (n + margeLignes * 0.62);
    const cote = Math.min(c, slot.taille / (h + margeColonnes * 0.62));
    return {
        cote,
        gauche: slot.x + margeLignes * cote * 0.62,
        haut: slot.y + margeColonnes * cote * 0.62,
        n, h
    };
}

function colorierPreviewHtml(item, slot, k, solution) {
    const { enonce, solution: sol } = item.meta;
    const p = plaqueColorier(item, slot);
    const s = p.cote * k;
    const g = p.gauche * k, t = p.haut * k;
    const petit = s * 0.42;
    // LE CONTENEUR RESTE À L'ORIGINE DE LA FEUILLE, et ses enfants portent des
    // coordonnées de PAGE. Le poser sur la case et donner à ses enfants des
    // coordonnées de page revenait à additionner deux fois le décalage : la
    // deuxième grille partait hors de la feuille — vu à l'écran, la place
    // réservée était bien là, et la grille nulle part.
    let html = '<div class="fp-colorier" style="left:0; top:0">';

    // Les indices des colonnes, empilés vers le haut, le dernier collé à la grille.
    enonce.colonnes.forEach((ind, x) => {
        ind.forEach((v, j) => {
            const rang = ind.length - 1 - j;
            html += `<span class="fp-col-ind" style="left:${g + x * s}px;
                top:${t - (rang + 1) * s * 0.62}px; width:${s}px; height:${s * 0.62}px;
                font-size:${petit}px">${v}</span>`;
        });
    });
    // Ceux des lignes, alignés à droite contre la grille.
    enonce.lignes.forEach((ind, y) => {
        ind.forEach((v, j) => {
            const rang = ind.length - 1 - j;
            html += `<span class="fp-lig-ind" style="left:${g - (rang + 1) * s * 0.62}px;
                top:${t + y * s}px; width:${s * 0.62}px; height:${s}px;
                font-size:${petit}px">${v}</span>`;
        });
    });
    // La grille. Les traits de cinq en cinq sont plus épais : sans eux, on perd
    // sa ligne au milieu d'une grille de dix.
    for (let y = 0; y < p.h; y++) {
        for (let x = 0; x < p.n; x++) {
            const plein = solution && sol[y][x];
            html += `<span class="fp-cn-case${plein ? ' fp-cn-case--plein' : ''}"
                style="left:${g + x * s}px; top:${t + y * s}px; width:${s}px; height:${s}px;
                ${x % 5 === 0 ? 'border-left-width:1.6px;' : ''}
                ${y % 5 === 0 ? 'border-top-width:1.6px;' : ''}"></span>`;
        }
    }
    html += `<span class="fp-cn-cadre" style="left:${g}px; top:${t}px;
        width:${p.n * s}px; height:${p.h * s}px"></span>`;
    return html + '</div>';
}

function dessinerColorierPdf(doc, item, slot, solution) {
    const { enonce, solution: sol } = item.meta;
    const p = plaqueColorier(item, slot);
    const { cote: s, gauche: g, haut: t, n, h } = p;

    // Les cases coloriées, d'abord : le quadrillage passe par-dessus.
    if (solution) {
        doc.setFillColor(...ENCRE.trait);
        for (let y = 0; y < h; y++) for (let x = 0; x < n; x++) {
            if (sol[y][x]) doc.rect(g + x * s, t + y * s, s, s, 'F');
        }
    }

    doc.setDrawColor(...ENCRE.grille);
    doc.setLineWidth(0.12);
    for (let i = 1; i < n; i++) doc.line(g + i * s, t, g + i * s, t + h * s);
    for (let i = 1; i < h; i++) doc.line(g, t + i * s, g + n * s, t + i * s);

    doc.setDrawColor(...ENCRE.trait);
    doc.setLineWidth(0.45);
    for (let i = 5; i < n; i += 5) doc.line(g + i * s, t, g + i * s, t + h * s);
    for (let i = 5; i < h; i += 5) doc.line(g, t + i * s, g + n * s, t + i * s);
    doc.rect(g, t, n * s, h * s, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...ENCRE.texte);
    doc.setFontSize(Math.max(5, Math.min(11, s * 2.1)));
    enonce.colonnes.forEach((ind, x) => {
        ind.forEach((v, j) => {
            const rang = ind.length - 1 - j;
            doc.text(String(v), g + x * s + s / 2, t - (rang + 0.5) * s * 0.62,
                { align: 'center', baseline: 'middle' });
        });
    });
    enonce.lignes.forEach((ind, y) => {
        ind.forEach((v, j) => {
            const rang = ind.length - 1 - j;
            doc.text(String(v), g - (rang + 0.5) * s * 0.62, t + y * s + s / 2,
                { align: 'center', baseline: 'middle' });
        });
    });
}

export const RENDUS = {
    // --- Les jeux à jouer sur papier ---
    puissance4: {
        titre: 'Grille de puissance 4',
        consigne: (items) => (items[0] && items[0].meta.regle) || '',
        previewGrille: p4PreviewHtml,
        pdfGrille: dessinerP4Pdf,
        nomBloc: 'Grille', nomBlocs: 'grilles',
        // Deux par page : une partie se joue à deux, et une feuille pour deux
        // élèves porte deux parties — la seconde pour la revanche.
        disposition: { cols: 1, rows: 2, maxCols: 2, maxRows: 3 },
        parLigneDefaut: 1,
        // Rien à corriger : la feuille de solutions serait le même plateau vide.
        sansSolution: true
    },

    codage: {
        titre: 'Coder les figures',
        consigne: () => 'CODE CHAQUE FIGURE. Pose la MÊME marque — un trait, deux traits, trois '
            + 'traits, une croix — sur les segments qui ont la même longueur, et le petit carré '
            + 'de l\'angle droit là où l\'angle est droit. Les diagonales comptent pour deux '
            + 'segments chacune, coupés au point O. Une marque affirme une égalité : deux '
            + 'segments de longueurs différentes ne peuvent pas porter la même.',
        previewGrille: codagePreviewHtml,
        pdfGrille: dessinerCodagePdf,
        nomBloc: 'Figure', nomBlocs: 'figures',
        disposition: { cols: 3, rows: 2, maxCols: 4, maxRows: 3 },
        parLigneDefaut: 3
    },

    chemin: {
        titre: 'Le chemin numéroté',
        consigne: () => 'TRACE UN SEUL CHEMIN qui part du 1, passe par 2, 3, 4… dans l\'ordre, '
            + 'et remplit TOUTES les cases. On avance case par case, sans diagonale, et on ne '
            + 'repasse jamais deux fois au même endroit. La règle qu\'on oublie est la seconde : '
            + 'aucune case ne doit rester en dehors du chemin. Commence par les COINS — un coin '
            + 'n\'a que deux voisines.',
        previewGrille: cheminPreviewHtml,
        pdfGrille: dessinerCheminPdf,
        nomBloc: 'Grille', nomBlocs: 'grilles',
        disposition: { cols: 3, rows: 2, maxCols: 4, maxRows: 3 },
        parLigneDefaut: 3
    },

    'laby-nombres': {
        titre: 'Le labyrinthe des nombres',
        consigne: () => 'LE NOMBRE DE TA CASE DIT DE COMBIEN DE CASES TU SAUTES. Tu choisis la '
            + 'direction — haut, bas, gauche ou droite — mais pas la distance, et jamais la '
            + 'diagonale. Pars de la case encadrée et rejoins l\'étoile. Attention en comptant : '
            + 'la première case comptée est celle juste à côté de toi, pas celle où tu es.',
        previewGrille: labyNombresPreviewHtml,
        pdfGrille: dessinerLabyNombresPdf,
        nomBloc: 'Grille', nomBlocs: 'grilles',
        disposition: { cols: 3, rows: 2, maxCols: 4, maxRows: 3 },
        parLigneDefaut: 3
    },

    'thales-redaction': {
        titre: 'Thalès : rédiger la démonstration',
        consigne: () => 'RÉDIGE LA DÉMONSTRATION EN TROIS PARTIES, comme sur une copie. '
            + 'Dans le « Or », chaque petit segment se met sur le segment ENTIER qui le '
            + 'contient, jamais sur le reste. Et l\'on conclut AVEC L\'UNITÉ.',
        previewGrille: thalesRedactionPreviewHtml,
        pdfGrille: dessinerThalesRedactionPdf,
        nomBloc: 'Démonstration', nomBlocs: 'démonstrations',
        // UNE PAR PAGE PAR DÉFAUT, ET C'EST LE SUJET MÊME. Une démonstration
        // de Thalès occupe une demi-page dans un cahier : dix lignes d'écriture
        // à la main, plus la figure. En serrer quatre sur une feuille donnerait
        // des cadres où l'on n'écrit qu'en abrégé — c'est-à-dire l'inverse de ce
        // qu'on travaille ici.
        disposition: { cols: 1, rows: 1, maxCols: 2, maxRows: 2 },
        parLigneDefaut: 1,
        // Plus haut que large : la figure en haut, les trois cadres dessous.
        proportions: { w: 1, h: 1.45 },
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

    'organigramme-quadri': {
        titre: 'L\'organigramme des quadrilatères',
        consigne: (items) => (items[0] && items[0].prompt && items[0].prompt.papier)
            || 'Reporte la lettre de chaque condition dans la case posée sur sa flèche.',
        previewGrille: organigrammePreviewHtml,
        pdfGrille: dessinerOrganigrammePdf,
        nomBloc: 'Organigramme', nomBlocs: 'organigrammes',
        // UN SEUL PAR PAGE, ET C'EST VOULU. Rémy : « l'organigramme des
        // quadrilatères est toujours le même » — c'est une hiérarchie, elle ne
        // se tire pas au sort. En mettre deux côte à côte donnerait deux fois la
        // même figure sur la même feuille. Ce qui change d'une copie à l'autre,
        // ce sont les lettres de la liste : deux voisins ne se recopient pas.
        disposition: { cols: 1, rows: 1, maxCols: 1, maxRows: 1 },
        parLigneDefaut: 1,
        unique: true,
        // LA FEUILLE ENTIÈRE, DEBOUT. Rémy : « je suis un peu déçu de
        // l'organigramme, celui que je t'ai donné était plus joli. »
        //
        // Le bloc était déclaré à 1,3 fois sa largeur, et la mise en page lui
        // donnait donc un carré de la moitié de la page ; le plan, plus haut
        // que large, s'y tassait dans un tiers de la largeur — cinquante
        // millimètres de blanc de chaque côté. Un organigramme qu'on colle dans
        // le cahier de leçons se donne la page entière : le plan s'étale sur
        // toute la largeur, la liste des conditions se range dessous.
        portrait: true,
        proportions: 'plein',
        titreAGauche: true
    },

    'bons-chemins': {
        titre: 'Les bons chemins',
        consigne: () => 'TROUVE LE CHEMIN DE D À A dont le produit vaut le nombre écrit sous la '
            + 'grille. On multiplie les nombres traversés ; on peut aller sur n\'importe quelle '
            + 'case voisine, EN DIAGONALE AUSSI, mais jamais deux fois sur la même case. Ne '
            + 'cherche pas au hasard : casse d\'abord le nombre en facteurs. Il te dira quels '
            + 'nombres doivent être sur le chemin — et lesquels ne peuvent pas y être.',
        previewGrille: bonsCheminsPreviewHtml,
        pdfGrille: dessinerBonsCheminsPdf,
        nomBloc: 'Grille', nomBlocs: 'grilles',
        // Un peu plus haut que large : la cible s'écrit sous la grille.
        proportions: { w: 1, h: 1.18 },
        // SIX PAR LIGNE. Rémy : « bons chemins — 6 grilles par ligne par
        // défaut ». Une grille de neuf cases n'a pas besoin de six centimètres
        // de large : les chiffres qu'elle porte tiennent en un caractère, et
        // c'est la HAUTEUR de la page qu'on gaspillait à trois par rangée. Six
        // de front, et la feuille porte une vraie séance — ce qui est
        // exactement la forme de la fiche d'origine, où la même grille était
        // répétée en bande.
        disposition: { cols: 6, rows: 3, maxCols: 6, maxRows: 5 },
        parLigneDefaut: 6
    },

    'tableau-croise': {
        titre: 'Tableaux à double entrée',
        // LA CONSIGNE DIT CE QU'ON DEMANDE VRAIMENT, et ce n'est pas la même
        // chose selon d'où viennent les nombres : quand le tableau part vide,
        // le premier travail est de RANGER l'énoncé, et c'est celui-là qu'on
        // rate. `consigne` reçoit les items : elle le lit sur eux.
        consigne: (items) => {
            const astuce = 'Astuce : cherche à chaque fois la ligne ou la colonne où il ne '
                + 'manque QU\'UNE SEULE information — celle-là, tu peux la boucler. Si la case '
                + 'qui manque est un total, tu additionnes ; si elle est dans le corps du '
                + 'tableau, tu pars du total et tu retires ce qui est déjà écrit. Le nombre que '
                + 'tu viens d\'écrire en ouvre alors d\'autres.';
            const parEnonce = (items || []).some(it => it.meta && it.meta.depart === 'enonce');
            // L'en-tête de la feuille coupe ce qui dépasse : la variante
            // « énoncé » ajoute une phrase, elle en retranche donc une autre.
            // Ce qu'on garde est ce qui ne se devine pas.
            return parEnonce
                ? 'REPORTE D\'ABORD LES INFORMATIONS DE L\'ÉNONCÉ dans le tableau — une phrase, '
                    + 'une case — puis complète les valeurs manquantes. Astuce : cherche à chaque '
                    + 'fois la ligne ou la colonne où il ne manque QU\'UNE SEULE information : '
                    + 'celle-là, tu peux la boucler.'
                : 'COMPLÈTE LES VALEURS MANQUANTES de chaque tableau. ' + astuce;
        },
        previewGrille: tableauCroisePreviewHtml,
        pdfGrille: dessinerTableauCroisePdf,
        nomBloc: 'Tableau', nomBlocs: 'tableaux',
        // Large et bas : un tableau se lit en largeur, et l'énoncé le surmonte.
        proportions: { w: 1.6, h: 1 },
        disposition: { cols: 2, rows: 3, maxCols: 2, maxRows: 4 },
        parLigneDefaut: 2
    },

    'sans-croiser': {
        titre: 'Relier sans croiser',
        consigne: () => 'RELIE CHAQUE LETTRE À SA JUMELLE. Trois interdits : les traits ne se '
            + 'croisent pas (ni entre eux, ni eux-mêmes), ils ne sortent pas du cadre, et ils ne '
            + 'passent pas sur un carré — pas même sur les tiens, sauf pour en partir et y '
            + 'arriver. Regarde bien AVANT de tracer : un trait posé coupe le cadre en deux, et '
            + 'ce qui est d\'un côté ne pourra plus rejoindre l\'autre. Commence par la paire qui '
            + 'a le moins de chemins possibles, pas par la plus proche.',
        previewGrille: sansCroiserPreviewHtml,
        pdfGrille: dessinerSansCroiserPdf,
        nomBloc: 'Figure', nomBlocs: 'figures',
        // Un peu plus large que haut, comme le cadre de la fiche.
        proportions: { w: 1.28, h: 1 },
        disposition: { cols: 2, rows: 3, maxCols: 3, maxRows: 4 },
        parLigneDefaut: 2,
        // « UNE » solution, pas « LA » : ces figures en ont plusieurs, qui ne
        // se ressemblent pas. Un élève dont le tracé diffère ne s'est pas
        // trompé pour autant, et la feuille doit le dire.
        // Court, parce que l'en-tête le tronque : la nuance complète est dans
        // la consigne. « Une » et non « la » suffit à dire l'essentiel — un
        // élève dont le tracé diffère ne s'est pas trompé pour autant.
        nomSolutions: 'Une solution possible'
    },

    cercleVocabulaire: {
        titre: 'Le vocabulaire du cercle',
        consigne: () => 'COMPLÈTE. Réponds à la question posée sous chaque figure, en donnant '
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

    sim: {
        titre: 'Plateau du Sim',
        consigne: (items) => (items[0] && items[0].meta.regle) || '',
        previewGrille: simPreviewHtml,
        pdfGrille: dessinerSimPdf,
        nomBloc: 'Plateau', nomBlocs: 'plateaux',
        // Quatre par page : une partie de sim dure trois minutes.
        disposition: { cols: 2, rows: 2, maxCols: 3, maxRows: 4 },
        parLigneDefaut: 2,
        sansSolution: true
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

    parking: {
        titre: 'Le jeu à découper : le Parking',
        consigne: (items) => {
            const m = items && items[0] && items[0].meta;
            const n = (m && m.n) || 4;
            const mini = (m && m.mini) || 104;
            return `DÉCOUPE LES ${n * 2} VOITURES et place-les comme sur « Au Départ ». Le but `
                + 'est que toutes celles de gauche se retrouvent à droite, et celles de droite '
                + 'à gauche. Les véhicules se déplacent CASE PAR CASE, sur une place voisine '
                + 'libre : une voiture ne saute jamais par-dessus une autre. Tout est là — une '
                + 'seule voie, et une seule place en pointillés pour se ranger et laisser '
                + `passer. Minimum : ${mini} coups.`;
        },
        previewGrille: parkingPreviewHtml,
        pdfGrille: dessinerParkingPdf,
        nomBloc: 'Jeu', nomBlocs: 'jeux',
        // UN SEUL, UNE SEULE FOIS, ET IL PREND TOUTE LA PAGE.
        //
        // Rémy, d'abord : « les exercices énigmes doivent être en version
        // unique de base et occuper le maximum d'espace pour être plus facile
        // à découper. » Une proportion déclarée laissait quarante-cinq
        // millimètres de blanc au bord droit ; « plein » rend au plateau la
        // page entière (voir core/dispositionFiche.js).
        //
        // Puis, la feuille en main : « pour la tour de hanoi, les grenouilles
        // et le parking, pour l'impression, une seule colonne, pas plus, et
        // aussi mettre une seule fois l'exercice. » `maxCols: 2` autorisait
        // encore deux plateaux côte à côte, et la feuille du parcours en
        // demandait six par défaut : on découpait six fois le même jeu. Un
        // jeu à découper n'est pas une série d'exercices — on en distribue un
        // par élève, et il n'y en a qu'un à faire.
        proportions: 'plein',
        unique: true,
        disposition: { cols: 1, rows: 1, maxCols: 1, maxRows: 1 },
        parLigneDefaut: 1
    },

    tourBrahma: {
        titre: 'Le jeu à découper : la Tour de Brahma',
        consigne: (items) => {
            const n = (items && items[0] && items[0].meta && items[0].meta.n) || 4;
            return `DÉCOUPE LES ${n} BOULES et pose-les sur le conduit de gauche, la plus `
                + 'grosse en bas. Le but est de les passer TOUTES à droite. On déplace une '
                + 'boule à la fois, on a le droit d\'utiliser les trois conduits, et la seule '
                + 'règle est qu\'une boule doit toujours être posée sur une boule PLUS GROSSE. '
                + `Sauras-tu le faire en ${2 ** n - 1} coups ? C'est le minimum, et il n'y a `
                + 'pas moyen de faire mieux.';
        },
        previewGrille: brahmaPreviewHtml,
        pdfGrille: dessinerBrahmaPdf,
        nomBloc: 'Jeu', nomBlocs: 'jeux',
        // UN SEUL, UNE SEULE FOIS, ET IL PREND TOUTE LA PAGE.
        //
        // Rémy, d'abord : « les exercices énigmes doivent être en version
        // unique de base et occuper le maximum d'espace pour être plus facile
        // à découper. » Une proportion déclarée laissait quarante-cinq
        // millimètres de blanc au bord droit ; « plein » rend au plateau la
        // page entière (voir core/dispositionFiche.js).
        //
        // Puis, la feuille en main : « pour la tour de hanoi, les grenouilles
        // et le parking, pour l'impression, une seule colonne, pas plus, et
        // aussi mettre une seule fois l'exercice. » `maxCols: 2` autorisait
        // encore deux plateaux côte à côte, et la feuille du parcours en
        // demandait six par défaut : on découpait six fois le même jeu. Un
        // jeu à découper n'est pas une série d'exercices — on en distribue un
        // par élève, et il n'y en a qu'un à faire.
        proportions: 'plein',
        unique: true,
        disposition: { cols: 1, rows: 1, maxCols: 1, maxRows: 1 },
        parLigneDefaut: 1
    },

    grenouilles: {
        titre: 'Le jeu à découper : les Grenouilles',
        // COURTE, PARCE QU'ELLE EST COUPÉE : le bandeau tient deux lignes, et
        // la version longue s'arrêtait sur « et attention, une ».
        consigne: (items) => {
            const n = (items && items[0] && items[0].meta && items[0].meta.n) || 4;
            return `DÉCOUPE LES ${n * 2} GRENOUILLES et place-les comme sur la vignette `
                + '« Départ ». Le but est d\'arriver à « Arrivée ». Les vertes ne vont qu\'à '
                + 'DROITE, les rouges qu\'à GAUCHE ; une grenouille avance d\'un nénuphar '
                + `libre, ou saute par-dessus UNE SEULE grenouille. Minimum : ${n * n + 2 * n} coups.`;
        },
        previewGrille: grenouillesPreviewHtml,
        pdfGrille: dessinerGrenouillesPdf,
        nomBloc: 'Jeu', nomBlocs: 'jeux',
        // UN SEUL, UNE SEULE FOIS, ET IL PREND TOUTE LA PAGE.
        //
        // Rémy, d'abord : « les exercices énigmes doivent être en version
        // unique de base et occuper le maximum d'espace pour être plus facile
        // à découper. » Une proportion déclarée laissait quarante-cinq
        // millimètres de blanc au bord droit ; « plein » rend au plateau la
        // page entière (voir core/dispositionFiche.js).
        //
        // Puis, la feuille en main : « pour la tour de hanoi, les grenouilles
        // et le parking, pour l'impression, une seule colonne, pas plus, et
        // aussi mettre une seule fois l'exercice. » `maxCols: 2` autorisait
        // encore deux plateaux côte à côte, et la feuille du parcours en
        // demandait six par défaut : on découpait six fois le même jeu. Un
        // jeu à découper n'est pas une série d'exercices — on en distribue un
        // par élève, et il n'y en a qu'un à faire.
        proportions: 'plein',
        unique: true,
        disposition: { cols: 1, rows: 1, maxCols: 1, maxRows: 1 },
        parLigneDefaut: 1
    },

    tasuko: {
        titre: 'Tasuko — les sommes cachées',
        // COURTE, PARCE QU'ELLE EST COUPÉE. Le bandeau tient deux lignes : la
        // version longue s'arrêtait sur « commence par un chiffre qu'une », en
        // plein milieu du seul conseil qui serve.
        consigne: (items) => {
            const m = items && items[0] && items[0].meta;
            const n = (m && m.n) || 8;
            return `RELIE LES CASES VOISINES DEUX PAR DEUX, en ligne ou en colonne. Les sommes `
                + `obtenues doivent faire 1, 2, 3… jusqu'à ${n} — chacune une seule fois — et `
                + 'TOUS les chiffres doivent servir. Barre les sommes au fur et à mesure.';
        },
        previewGrille: tasukoPreviewHtml,
        pdfGrille: dessinerTasukoPdf,
        nomBloc: 'Grille', nomBlocs: 'grilles',
        proportions: { w: 1, h: 0.72 },
        disposition: { cols: 2, rows: 3, maxCols: 3, maxRows: 4 },
        parLigneDefaut: 2
    },

    pyramideNombres: {
        titre: 'La Pyramide des nombres',
        consigne: (items) => {
            const m = items && items[0] && items[0].meta;
            const commun = 'CHAQUE CASE EST LA SOMME DES DEUX DU DESSOUS. Complète la pyramide.';
            if (m && m.difficulte === 'addition') {
                return `${commun} Tout se remplit en montant : additionne les deux cases `
                    + 'du dessous, et recommence à l\'étage suivant.';
            }
            return `${commun} Attention, la règle se lit DANS LES DEUX SENS : vers le haut on `
                + 'additionne, vers le bas on SOUSTRAIT — si le dessus vaut 12 et l\'une des '
                + 'deux du dessous 7, l\'autre vaut 12 − 7. Cherche toujours un petit triangle '
                + 'où deux cases sur trois sont déjà remplies.';
        },
        previewGrille: pyramideNPreviewHtml,
        pdfGrille: dessinerPyramideNPdf,
        nomBloc: 'Pyramide', nomBlocs: 'pyramides',
        // Presque carrée : autant d'étages que de cases à la base, et les cases
        // sont une fois et demie plus larges que hautes.
        proportions: { w: 1, h: 0.72 },
        disposition: { cols: 3, rows: 3, maxCols: 4, maxRows: 4 },
        parLigneDefaut: 3
    },

    mastermind: {
        titre: 'Mastermind — retrouve le code',
        consigne: (items) => {
            const m = items && items[0] && items[0].meta;
            const rep = !m || m.repetitions;
            // COURTE, PARCE QU'ELLE EST COUPÉE. Le bandeau tient deux lignes :
            // la version longue s'arrêtait au milieu du conseil, « raye d'un
            // coup » sans dire quoi — pire que pas de conseil du tout.
            return 'UN CODE SECRET EST CACHÉ. Chaque ligne est un essai déjà joué : on te dit '
                + 'combien de jetons sont de la BONNE COULEUR À LA BONNE PLACE, et combien sont '
                + 'de la bonne couleur MAIS AILLEURS. Écris les initiales du code dans les cases '
                + 'du bas. '
                + (rep ? 'Une couleur peut servir plusieurs fois.' : 'Chaque couleur ne sert qu\'une fois.');
        },
        previewGrille: mastermindPreviewHtml,
        pdfGrille: dessinerMastermindPdf,
        nomBloc: 'Code', nomBlocs: 'codes',
        // Plus large que haut : quatre jetons et deux colonnes de nombres sur
        // une ligne, et quatre ou cinq lignes en tout.
        proportions: { w: 1, h: 0.66 },
        disposition: { cols: 2, rows: 3, maxCols: 3, maxRows: 4 },
        parLigneDefaut: 2
    },

    pyramide: {
        titre: 'La Pyramide des mots',
        consigne: () => 'À CHAQUE LIGNE, TU RAJOUTES UNE LETTRE pour faire un nouveau mot. '
            + 'Les lettres PEUVENT ÊTRE MÉLANGÉES : le mot du dessous reprend toutes celles '
            + 'du dessus, plus une, mais pas forcément dans le même ordre. La définition de '
            + 'gauche dit lequel. Commence toujours par le haut.',
        previewGrille: pyramidePreviewHtml,
        pdfGrille: dessinerPyramidePdf,
        nomBloc: 'Pyramide', nomBlocs: 'pyramides',
        // Large et basse : une colonne de définitions, un escalier de six
        // marches. Un bloc carré rendrait les cases minuscules pour rien.
        proportions: { w: 1, h: 0.62 },
        // QUATRE PAR PAGE, EN DEUX COLONNES. Rémy : « je prends les pyramides de
        // lettres, il y a tellement d'espace vide, par défaut on pourrait mettre
        // deux colonnes. » Il avait raison, et la cause est arithmétique : une
        // pyramide est large et basse (1 × 0,62), la page en paysage est large
        // et basse aussi (1 × 0,64) — DEUX pyramides sur cette page ne peuvent
        // pas la remplir, quelle que soit la façon de les poser. Côte à côte,
        // il reste la moitié de la hauteur ; l'une sur l'autre, la moitié de la
        // largeur. QUATRE, en deux colonnes et deux rangées, tombent juste.
        //
        // On garde l'idée de la revue — une pyramide commencée puis une vide,
        // l'exemple travaillé suivi de l'exercice —, mais deux fois : c'est
        // encore mieux, deux exemples valent mieux qu'un.
        disposition: { cols: 2, rows: 2, maxCols: 2, maxRows: 4 },
        parLigneDefaut: 2
    },

    cubes: {
        titre: 'Combien de cubes ?',
        consigne: (items) => {
            const q = items && items[0] && items[0].meta ? items[0].meta.question : 'total';
            // LA QUESTION EST LA MÊME POUR TOUTE LA FICHE — c'est un réglage, pas
            // un tirage —, donc elle se dit UNE FOIS en consigne. Répétée sous
            // chacun des douze dessins, elle mangeait la place du dessin.
            if (q === 'sol') {
                return 'COMBIEN DE CUBES TOUCHENT LE SOL dans chaque empilement ? Attention : '
                    + 'une pile de quatre cubes ne pose qu\'UN cube par terre. Ce qu\'on compte '
                    + 'ici, c\'est le nombre de cases occupées de la base — pas le volume.';
            }
            if (q === 'ajouter') {
                return 'COMBIEN DE CUBES FAUT-IL AJOUTER à chaque empilement pour obtenir un '
                    + 'PAVÉ PLEIN, celui qui le contient tout juste ? Compte d\'abord les cubes '
                    + 'du pavé plein — longueur × profondeur × hauteur —, puis retire ceux qui '
                    + 'sont déjà là.';
            }
            return 'COMPTE LES CUBES DE CHAQUE EMPILEMENT. Certains sont cachés derrière ou '
                + 'dessous : ils comptent aussi, et aucun ne flotte — sous chaque cube il y en '
                + 'a d\'autres jusqu\'au sol. Ne compte pas cube par cube mais COLONNE par '
                + 'colonne : chaque case du sol porte une pile, et il suffit d\'additionner '
                + 'les hauteurs.';
        },
        previewGrille: cubesPreviewHtml,
        pdfGrille: dessinerCubesPdf,
        nomBloc: 'Empilement', nomBlocs: 'empilements',
        // LE BLOC EST PLUS HAUT QUE LARGE, et c'est contre l'intuition : vu en
        // perspective, un empilement paraît s'étaler en largeur. Mesuré, il ne
        // le fait pas — la hauteur des piles s'ajoute au décalage des deux
        // directions, et le dessin sort autour de 0,9 de large pour 1 de haut.
        // Avec un bloc carré, un tiers de la largeur restait blanc de chaque
        // côté et le dessin rapetissait d'autant. Neuf empilements tiennent
        // encore sur une page.
        proportions: { w: 1, h: 1.08 },
        // DOUZE PAR PAGE, PAS NEUF. Un empilement est plus haut que large ; à
        // trois colonnes il ne grandissait pas pour autant — il restait limité
        // par la hauteur de la case — et l'on payait un tiers de la largeur en
        // blanc. Quatre colonnes donnent le MÊME dessin et trois exercices de
        // plus. Pour une version « affiche », il reste 3 × 2.
        disposition: { cols: 4, rows: 3, maxCols: 5, maxRows: 4 },
        parLigneDefaut: 4
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

    anagrammes: {
        titre: 'Anagrammes du vocabulaire',
        consigne: (items) => {
            const avecDef = items[0] && items[0].meta.avecDef !== false;
            const commun = 'REMETS LES LETTRES DANS L\'ORDRE. Chaque suite de lettres cache un mot '
                + 'de mathématiques : écris-le dans les cases, une lettre par case.';
            return avecDef
                ? `${commun} La définition est là pour te guider — relis-la une fois le mot trouvé.`
                : `${commun} Aucune définition ici : ce sont les lettres seules qui doivent parler.`;
        },
        previewGrille: anagrammesPreviewHtml,
        pdfGrille: dessinerAnagrammesPdf,
        nomBloc: 'Liste', nomBlocs: 'listes',
        titreAGauche: true,
        disposition: { cols: 1, rows: 1, maxCols: 2, maxRows: 2 },
        parLigneDefaut: 1
    },

    hashi: {
        titre: 'Hashi — construis les ponts',
        consigne: () => 'RELIE LES ÎLES PAR DES PONTS. Un pont est un trait droit, horizontal '
            + 'ou vertical ; deux ponts au plus entre deux îles ; un pont n\'en croise jamais '
            + 'un autre et ne traverse jamais une île. Le chiffre d\'une île dit COMBIEN de '
            + 'ponts y arrivent. Et pour finir, tout doit tenir d\'un seul tenant : on doit '
            + 'pouvoir aller de n\'importe quelle île à n\'importe quelle autre.',
        previewGrille: hashiPreviewHtml,
        pdfGrille: dessinerHashiPdf,
        nomBloc: 'Grille', nomBlocs: 'grilles',
        // Une grille de hashi est carrée et se trace à la règle : deux par page
        // laissent encore la place du poignet, quatre ne l'ont plus.
        proportions: { w: 1, h: 1 },
        disposition: { cols: 2, rows: 1, maxCols: 3, maxRows: 2 },
        parLigneDefaut: 2
    },

    motcode: {
        titre: 'Mot codé du vocabulaire',
        consigne: (items) => 'CHAQUE LETTRE EST REMPLACÉE PAR UN NUMÉRO, le même partout dans '
            + 'la grille. Les mots se lisent en anneau autour du cadre : une flèche marque le '
            + 'début de chacun et le sens dans lequel il se lit. LA CLÉ, sous la grille, '
            + 'COMMENCE PAR UN MOT — ses lettres sont déjà posées partout où leur numéro '
            + 'reparaît, et c\'est de là qu\'on part. Retrouve les autres — deux numéros '
            + 'différents ne cachent jamais la même lettre — et '
            + 'reporte chaque trouvaille dans la clé. Tous les mots sont du vocabulaire du cours'
            + (items && items[0] && items[0].meta && THEMES_MOTCODE[items[0].meta.theme]
                ? ` (${THEMES_MOTCODE[items[0].meta.theme].toLowerCase()})` : '') + '.',
        previewGrille: motCodePreviewHtml,
        pdfGrille: dessinerMotCodePdf,
        nomBloc: 'Grille', nomBlocs: 'grilles',
        titreAGauche: true,
        // Une grille par page : la clé prend déjà deux rangées, et à deux
        // grilles les cases tombent sous trois millimètres.
        disposition: { cols: 1, rows: 1, maxCols: 1, maxRows: 1 },
        parLigneDefaut: 1
    },

    motscroises: {
        titre: 'Mots croisés du vocabulaire',
        consigne: () => 'REMPLIS LA GRILLE. Chaque définition donne un mot du cours ; le nombre '
            + 'entre parenthèses est son nombre de lettres. Commence par ceux dont tu es sûr : '
            + 'chaque mot trouvé donne une lettre à ceux qui le croisent, et c\'est là toute '
            + 'l\'aide dont tu disposes.',
        previewGrille: motsCroisesPreviewHtml,
        pdfGrille: dessinerMotsCroisesPdf,
        nomBloc: 'Grille', nomBlocs: 'grilles',
        titreAGauche: true,
        // UNE GRILLE PAR PAGE : à deux, un 15 × 18 tombe sous trois millimètres
        // par case, et les définitions ne tiennent plus.
        disposition: { cols: 1, rows: 1, maxCols: 1, maxRows: 1 },
        parLigneDefaut: 1
    },

    pavage: {
        titre: 'Symétrique par rapport à quoi ?',
        // SUR LE PAPIER, ON RÉPOND PAR LE NOM. Écrire « x = 4 » demanderait un
        // quadrillage gradué, et graduer quatre pavages sur une page les
        // réduirait à des timbres. L'écran, lui, gradue et fait écrire
        // l'équation : les deux exercices se complètent au lieu de se répéter.
        consigne: () => 'Chaque pièce porte une lettre ; les droites et les points tracés portent '
            + 'un nom. Pour chaque pavage, écris par rapport à quoi la seconde pièce est le '
            + 'symétrique de la première. Deux gestes suffisent. UN : la figure a-t-elle été '
            + 'RETOURNÉE, comme dans un miroir ? Si oui, cherche une droite ; sinon, elle a fait '
            + 'un demi-tour, cherche un point. DEUX : prends UN point et son image — ce que tu '
            + 'cherches est au MILIEU des deux.',
        previewGrille: pavagePreviewHtml,
        pdfGrille: dessinerPavagePdf,
        nomBloc: 'Pavage', nomBlocs: 'pavages',
        disposition: { cols: 2, rows: 2, maxCols: 3, maxRows: 3 },
        parLigneDefaut: 2
    },

    quadrillage: {
        titre: 'Tracer l\'image sur le quadrillage',
        consigne: (items) => {
            const genres = new Set(items.map(it => it.meta && it.meta.genre));
            const un = genres.size === 1 ? [...genres][0] : null;
            const commun = 'Colorie l\'image de la figure grise. Travaille CASE PAR CASE : '
                + 'pour chacune, compte les carreaux, puis reporte-les.';
            if (un === 'axiale') return `${commun} Le trait noir est l'axe de symétrie.`;
            if (un === 'centrale') return `${commun} La croix marque le centre O de la symétrie.`;
            if (un === 'translation') return `${commun} La flèche donne le déplacement.`;
            if (un === 'rotation') return `${commun} La croix marque le centre O du quart de tour.`;
            return `${commun} La transformation demandée est écrite sous chaque quadrillage.`;
        },
        previewGrille: quadrillagePreviewHtml,
        pdfGrille: dessinerQuadrillagePdf,
        nomBloc: 'Quadrillage', nomBlocs: 'quadrillages',
        // JUSQU'À CINQ PAR RANGÉE. Rémy : « on pourrait avoir plus que trois
        // colonnes avec des grilles plus petites ». Un quadrillage de symétrie
        // reste lisible petit — ce sont des carreaux qu'on compte, pas des
        // graduations qu'on lit — et une feuille de vingt figures se donne
        // comme entraînement là où quatre font un contrôle.
        disposition: { cols: 2, rows: 2, maxCols: 5, maxRows: 5 },
        parLigneDefaut: 2
    },

    graduation: {
        titre: 'La loupe sur la droite graduée',
        consigne: (items) => {
            const zooms = new Set(items.map(it => it.meta && it.meta.zoom));
            const commun = 'Chaque axe est coupé en DIX intervalles égaux. '
                + 'Compte les INTERVALLES depuis le trait de gauche — jamais les traits — '
                + 'et écris l\'abscisse du point marqué d\'une croix.';
            return zooms.size > 1
                ? `${commun} Attention : l'échelle change d'un axe à l'autre.`
                : commun;
        },
        previewGrille: graduationPreviewHtml,
        pdfGrille: dessinerGraduationPdf,
        nomBloc: 'Axe', nomBlocs: 'axes',
        // Large et bas : un axe tient sur trois centimètres de haut, et lui en
        // donner huit laisserait la page à moitié blanche.
        proportions: { w: 1, h: 0.22 },
        // ET IL PREND TOUTE LA LARGEUR. Le plafond commun (78 mm) le centrait
        // sur la moitié de la page : plus l'axe est long, plus les intervalles
        // se distinguent — c'est exactement ce qu'on demande de compter.
        grilleMax: 170,
        disposition: { cols: 1, rows: 6, maxCols: 2, maxRows: 8 },
        parLigneDefaut: 1
    },

    egypte: {
        titre: 'Les nombres des pharaons',
        consigne: (items) => (items[0] && items[0].meta.sens === 'ecrire')
            ? 'Écris chaque nombre en hiéroglyphes. Bâton 1, anse 10, corde 100, lotus '
            + '1 000, doigt 10 000, têtard 100 000, dieu Heh 1 000 000. L\'ordre des '
            + 'symboles n\'a aucune importance : c\'est une numération ADDITIVE.'
            : 'Additionne la valeur des symboles. Bâton 1, anse 10, corde 100, lotus '
            + '1 000, doigt 10 000, têtard 100 000, dieu Heh 1 000 000. Attention : on '
            + 'ne compte pas les symboles, on additionne ce qu\'ils valent.',
        previewGrille: egyptePreviewHtml,
        pdfGrille: dessinerEgyptePdf,
        nomBloc: 'Nombre', nomBlocs: 'nombres',
        // UN NOMBRE TIENT SUR UNE LIGNE de symboles : le bloc n'a plus besoin
        // d'être carré. En hauteur, il ne lui faut que la ligne de glyphes et
        // la ligne de réponse — d'où huit nombres par page au lieu de six, et
        // des glyphes plus grands parce que le bloc est deux fois plus large.
        proportions: { w: 1, h: 0.34 },
        // L'ÉTIQUETTE SE MET AU-DESSUS DE CE QU'ELLE NOMME. Rémy : « l'exercice
        // 7 est très mal présenté ». « Nombre 5 » était centré sur toute la
        // largeur du bloc alors que les hiéroglyphes commencent à gauche : le
        // titre flottait au-dessus du blanc qui sépare le dessin des
        // pointillés, et ne désignait plus rien.
        titreAGauche: true,
        // SIX RANGÉES, PAS QUATRE. Un nombre en hiéroglyphes tient sur une
        // ligne de treize millimètres ; huit nombres laissaient la moitié
        // basse de la feuille blanche, avec des rangées écartées de trois
        // centimètres pour combler. Douze remplissent la page SANS rétrécir
        // les signes : ils sont bornés par la largeur du bloc, pas par sa
        // hauteur, et la largeur ne change pas.
        //
        // ET JAMAIS TROIS COLONNES. La grille en proposait jusqu'à trois, et
        // douze nombres s'y rangeaient d'eux-mêmes en 3 × 4 — au prix d'un
        // tiers de la taille des signes, qui sont bornés par la LARGEUR du
        // bloc. Or c'est exactement ce que Rémy demandait de ne pas faire :
        // « utilise bien la largeur pour écrire les hiéroglyphes assez grand ».
        // Deux colonnes de six, donc : la page se remplit et les signes ne
        // perdent pas un millimètre.
        disposition: { cols: 2, rows: 6, maxCols: 2, maxRows: 6 },
        parLigneDefaut: 2,
        grilleMax: 70
    },

    dedale: {
        titre: 'Le dédale',
        consigne: () => 'Va du ROND au CARRÉ sans traverser de mur. Entre deux cases il '
            + 'n\'existe qu\'un seul chemin : si tu tournes en rond, c\'est que tu es dans '
            + 'une impasse — reviens sur tes pas et essaie l\'autre couloir. Repasse ton '
            + 'trajet au crayon.',
        previewGrille: dedalePreviewHtml,
        pdfGrille: dessinerDedalePdf,
        nomBloc: 'Dédale', nomBlocs: 'dédales',
        proportions: { w: 1, h: 1 },
        disposition: { cols: 2, rows: 1, maxCols: 3, maxRows: 2 },
        parLigneDefaut: 2,
        grilleMax: 120
    },

    compte: {
        titre: 'Le compte est bon',
        consigne: () => 'Atteins le nombre écrit en haut avec les six plaques. Chaque '
            + 'plaque ne sert QU\'UNE FOIS, et le résultat d\'une opération peut '
            + 'resservir. Écris une opération par ligne. Aucun nombre négatif, et une '
            + 'division doit tomber juste. Il y a plusieurs solutions : la tienne compte '
            + 'si elle arrive au but.',
        previewGrille: comptePreviewHtml,
        pdfGrille: dessinerComptePdf,
        nomBloc: 'Tirage', nomBlocs: 'tirages',
        titreAGauche: true,
        proportions: { w: 1, h: 0.85 },
        disposition: { cols: 2, rows: 2, maxCols: 3, maxRows: 3 },
        parLigneDefaut: 2,
        separateurs: true,
        grilleMax: 90
    },

    pointapoint: {
        titre: 'Le point à point',
        consigne: () => 'Cherche le calcul qui vaut 1 et pars de là : relie ensuite '
            + 'celui qui vaut 2, puis 3, et ainsi de suite jusqu\'au dernier. Une image '
            + 'apparaît — mais on ne la devine qu\'à la fin.',
        previewGrille: pointAPointPreviewHtml,
        pdfGrille: dessinerPointAPointPdf,
        nomBloc: 'Dessin', nomBlocs: 'dessins',
        proportions: { w: 1, h: 1 },
        disposition: { cols: 2, rows: 1, maxCols: 3, maxRows: 2 },
        parLigneDefaut: 1,
        grilleMax: 130
    },

    conversion: {
        titre: 'Le tableau de conversion',
        consigne: (items) => {
            // SANS TABLEAU, la consigne ne parle plus d'un tableau absent : la
            // feuille demande alors la conversion toute seule, et c'est un
            // autre exercice — celui qu'on donne une fois le tableau su.
            if (items.every(i => i.meta && i.meta.tableau === false)) {
                return 'Effectue chaque conversion. Si tu as besoin du tableau, trace-le '
                    + 'au brouillon : sur cette feuille, il ne reste que les réponses à écrire.';
            }
            // COURTE. Rémy : « un énoncé trop long n'est jamais lu. » La version
            // longue tenait quatre lignes de corps 2 en tête de feuille, et
            // décrivait une méthode que le tableau montre déjà : l'élève écrit
            // son nombre dans la bonne colonne parce que les colonnes sont
            // nommées, pas parce qu'un paragraphe le lui a dit.
            const donnes = items.every(i => i.meta && i.meta.entetes);
            return donnes
                ? 'Pose chaque nombre dans le tableau, puis lis la réponse.'
                : 'Écris les unités en haut des colonnes — hecto vient avant déca —, '
                    + 'puis pose chaque nombre et lis la réponse.';
        },
        previewGrille: conversionPreviewHtml,
        pdfGrille: dessinerConversionPdf,
        nomBloc: 'Tableau', nomBlocs: 'tableaux',
        titreAGauche: true,
        // TROIS TABLEAUX DE FRONT. À quinze millimètres de case, il n'en tenait
        // qu'un par rangée et la moitié droite de la feuille restait blanche ;
        // les cases resserrées, trois passent — et chacun porte huit
        // conversions, ce qui fait une vraie séance sur une seule feuille.
        // LA HAUTEUR SUIT LE NOMBRE DE LIGNES. Rémy : « la présentation de
        // l'exercice de conversion est horrible. » Elle l'était en parcours :
        // une proportion fixe de 0,72 tenait pour quatre conversions et
        // écrasait les huit — les questions du tableau suivant s'écrivaient
        // alors par-dessus les dernières du précédent.
        //
        // Un tableau, c'est un en-tête plus N lignes ; sa hauteur en dépend
        // donc, et d'elles seules. Cinq millimètres par ligne, plus un
        // millimètre et demi de respiration : c'est ce qu'il faut pour écrire
        // un chiffre à la main dans une case.
        proportions: (items) => {
            const n = Math.max(1, ...(items || []).map(i => (i && i.meta && i.meta.lignes) || 8), 8);
            // SANS TABLEAU, LE BLOC EST DEUX FOIS MOINS HAUT. Les conversions y
            // tiennent en plusieurs colonnes (voir `geoConversion`), donc la
            // hauteur ne suit plus leur nombre mais celui d'une colonne. Le
            // bloc reste large — c'est cette largeur qui porte les colonnes —,
            // et deux blocs de front tiennent sur une page au lieu d'un.
            const sansTableau = (items || []).length
                && (items || []).every(i => i && i.meta && i.meta.tableau === false);
            if (sansTableau) return { w: 1, h: 0.09 * Math.ceil(n / 2) + 0.06 };
            return { w: 1, h: 0.09 * (n + 1) + 0.06 };
        },
        // DEUX DE FRONT, PLUS TROIS. Le commentaire d'origine disait vrai — à
        // quinze millimètres de case il n'en tenait qu'un par rangée et la
        // moitié droite restait blanche — mais la correction est allée trop
        // loin : à trois de front, il ne restait pas trois millimètres par
        // colonne. Deux blocs de 93 mm laissent au tableau de quoi être un
        // tableau, et la feuille porte encore seize conversions par rangée.
        disposition: { cols: 2, rows: 1, maxCols: 3, maxRows: 3 },
        parLigneDefaut: 2,
        separateurs: true,
        grilleMax: 300
    },

    pose: {
        titre: 'Poser et effectuer',
        consigne: (items) => {
            const noms = [...new Set(items.map(i => i.meta && i.meta.nom).filter(Boolean))];
            const quoi = noms.length === 1 ? `Ces ${noms[0]}s sont posées` : 'Ces opérations sont posées';
            return `${quoi} et alignées : il ne reste qu'à calculer, colonne par `
                + 'colonne, en partant de la DROITE. Écris tes retenues au crayon, '
                + 'là où tu as l\'habitude de les mettre. Une division se fait par étapes : '
                + 'on abaisse un chiffre, on cherche combien de fois le diviseur tient '
                + 'dedans, on multiplie, on soustrait — et le reste est toujours plus '
                + 'petit que le diviseur.';
        },
        previewGrille: posePreviewHtml,
        pdfGrille: dessinerPosePdf,
        nomBloc: 'Opération', nomBlocs: 'opérations',
        // Le numéro sur la ligne du calcul, comme au cahier — pas au-dessus,
        // où il coûterait une ligne entière pour trois caractères.
        numeroInterne: true,
        titreAGauche: true,
        // UNE OPÉRATION POSÉE EST HAUTE ET ÉTROITE : trois rangées pour une
        // addition, sept pour une division. Le bloc suit, et c'est en colonnes
        // qu'on en met — six additions sur une ligne de feuille, comme dans
        // tous les cahiers de calcul.
        proportions: { w: 1, h: 1.05 },
        disposition: { cols: 4, rows: 3, maxCols: 6, maxRows: 4 },
        parLigneDefaut: 4,
        grilleMax: 60
    },

    priorites: {
        titre: 'Priorités opératoires — ligne par ligne',
        // COURTE. Rémy : « pour l'énoncé, mets juste Calcule en respectant les
        // priorités, écris les calculs ». Six lignes de méthode en tête de
        // feuille ne se lisent pas — la méthode s'enseigne au tableau, la
        // consigne rappelle ce qu'on attend. Et la dernière phrase était
        // devenue fausse : les lignes sont maintenant les mêmes pour tous les
        // calculs, elles ne comptent plus les étapes de celui-là.
        consigne: () => 'Calcule en respectant les priorités, et écris les calculs : '
            + 'une opération par ligne, en recopiant tout le reste.',
        previewGrille: prioritesPreviewHtml,
        pdfGrille: dessinerPrioritesPdf,
        // CE RENDU SAIT SE FAIRE RÉCRIRE — et surtout, se faire RECORRIGER.
        //
        // Rémy : « on ne peut pas changer les calculs du 33 (attention à la
        // correction) ». Sa parenthèse est tout le problème : récrire
        // « 8 × 4 − 6 » en « 8 × 4 − 7 » ne change pas qu'une ligne, cela rend
        // fausses les trois lignes du corrigé en dessous. Laisser taper du
        // texte ne suffisait donc pas ; il fallait un moteur capable de RELIRE
        // ce qu'on tape et de refaire la cascade entière. C'est `relire` dans
        // `core/priorites.js`, et il rend `null` sur ce qu'il ne sait pas lire
        // — auquel cas la feuille le dit au lieu d'imprimer un corrigé qui ment.
        retoucheGrille: {
            legende: 'Le calcul',
            aide: 'Écris-le comme au tableau : 8 × 4 − 6, (3 + 4) × 2, 3² + 2. '
                + 'Le × du clavier, l\'étoile et la virgule sont compris. '
                + 'La correction est refaite entière à partir de ce que tu écris.',
            lire: (item) => (item.meta && item.meta.lignes && item.meta.lignes[0]) || '',
            appliquer: (item, texte) => {
                const r = relirePriorites(texte);
                if (!r) return null;
                const lignes = [r.texte, ...r.lignes.slice(1).map(l => `= ${l.texte}`)];
                return {
                    ...item,
                    meta: {
                        ...item.meta,
                        lignes,
                        etapes: r.etapes,
                        // Les lignes vides sont les mêmes pour toute la feuille
                        // (voir `geoPriorites`) : un calcul récrit plus long
                        // que les autres emporte donc le plafond avec lui.
                        etapesMax: Math.max(item.meta.etapesMax || 0, r.etapes)
                    },
                    answer: r.valeur
                };
            }
        },
        nomBloc: 'Calcul', nomBlocs: 'calculs',
        titreAGauche: true,
        // LE NUMÉRO EST POSÉ PAR LE BLOC LUI-MÊME, sur la ligne du calcul :
        // « 1.  2 × 6 + 7 − 2 », comme dans un cahier. Écrit au-dessus par la
        // mise en page, il coûtait une ligne entière pour trois caractères.
        numeroInterne: true,
        // ET LE BLOC EST BAS. Une cascade de trois étapes tient sur quatre
        // lignes de cahier : lui donner un carré de huit centimètres laissait
        // la moitié de sa hauteur en blanc.
        proportions: { w: 1, h: 0.52 },
        // DIX PAR PAGE. Une cascade est large et courte : c'est en LIGNES
        // qu'il en faut, pas en colonnes — au-delà de deux colonnes,
        // « (2 + 3) × (4 + 1) » sort de son bloc.
        disposition: { cols: 2, rows: 5, maxCols: 3, maxRows: 6 },
        parLigneDefaut: 2
    },

    repere: {
        titre: 'Repère et coordonnées',
        consigne: (items) => ((items[0] && items[0].meta.mode === 'placer')
            ? 'Place chaque point dans le repère et marque-le d\'une CROIX, puis écris sa '
                + 'lettre à côté. Le premier nombre dit de combien on avance vers la droite, '
                + 'le second de combien on monte.'
            : 'Lis les coordonnées de chaque point et écris-les dans les parenthèses. '
                + 'On donne toujours l\'abscisse d\'abord — de combien on avance vers la '
                + 'droite — puis l\'ordonnée.'),
        previewGrille: reperePreviewHtml,
        pdfGrille: dessinerRepPdf,
        // QUATRE PAR PAGE. Un repère gradué demande de la place : sous six
        // centimètres, deux graduations voisines se touchent et l'on ne peut
        // plus tracer une croix entre elles.
        disposition: { cols: 2, rows: 2, maxCols: 3, maxRows: 3 },
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

    mat: {
        titre: 'Échecs : mat en un, mat en deux',
        // LE NOMBRE DE COUPS EST SOUS CHAQUE DIAGRAMME, pas en tête de
        // feuille : il se lit d'après le premier problème, et une feuille qui
        // mêle des mats en un et des mats en deux annonçait alors le mauvais
        // pour la moitié de ses cases.
        consigne: (items) => {
            const deux = (items || []).some(i => (i.meta && i.meta.coups) > 1);
            return 'LES BLANCS JOUENT ET MATENT — le nombre de coups est écrit sous chaque '
                + 'diagramme. Écris le coup en notation : l\'initiale de la pièce (T tour, '
                + 'C cavalier, F fou, D dame, R roi ; rien pour un pion) puis la case '
                + 'd\'arrivée — par exemple Ta8. Un mat est un échec dont le roi ne peut pas '
                + 'sortir : ni fuir, ni parer, ni prendre.'
                + (deux ? ' En deux coups, écris le PREMIER : il doit gagner contre TOUTES '
                    + 'les réponses noires, pas seulement contre la plus naturelle.' : '');
        },
        previewGrille: matPreviewHtml,
        pdfGrille: dessinerMatPdf,
        nomBloc: 'Problème de mat', nomBlocs: 'problèmes de mat',
        disposition: { cols: 2, rows: 2, maxCols: 3, maxRows: 3 },
        parLigneDefaut: 2
    },

    echiquier: {
        titre: 'L\'échiquier, une grille à deux entrées',
        // Un diagramme composé à l'atelier n'a pas à porter le mode d'emploi
        // du repérage : le professeur écrit sa propre légende sous chaque
        // damier, et la feuille dit ce qu'il a voulu dire.
        consigne: (items) => (items && items.length && items.every(i => i.meta.quoi === 'atelier'))
            ? '' : 'Une case d\'échiquier se nomme comme un point dans un repère : LA '
            + 'LETTRE DE SA COLONNE, PUIS LE CHIFFRE DE SA LIGNE — e4, pas 4e. Les pièces sont '
            + 'dessinées : les claires sont blanches, les pleines sont noires. Quand des pièces '
            + 'sont À PLACER, marque leur case d\'une croix et écris à côté l\'initiale de la '
            + 'pièce (T tour, C cavalier, F fou, D dame, P pion).',
        previewGrille: echiquierPreviewHtml,
        pdfGrille: dessinerEchiquierPdf,
        nomBloc: 'Échiquier',
        disposition: { cols: 2, rows: 2, maxCols: 3, maxRows: 2 },
        parLigneDefaut: 2
    },

    chat: {
        titre: 'Le chat géomètre — programmes de construction',
        consigne: () => 'UN CARREAU VAUT DIX PAS. Le chat rouge montre où il part et dans '
            + 'quelle direction il regarde. Lis le programme et trace la figure au crayon, '
            + 'côté par côté — rien ne s\'exécute ici, il faut prévoir. Un polygone régulier '
            + 'à n côtés se ferme en tournant à chaque sommet de 360 ÷ n.',
        previewGrille: chatPreviewHtml,
        pdfGrille: dessinerChatPdf,
        nomBloc: 'Programme',
        titreAGauche: true,
        disposition: { cols: 2, rows: 2, maxCols: 3, maxRows: 3 },
        parLigneDefaut: 2
    },

    tableur: {
        titre: 'Le tableur sur le papier',
        consigne: () => 'Une case porte le nom de sa colonne et de sa ligne : B3. Une plage '
            + 'porte le nom de ses deux coins : A1:C2. ET UNE FORMULE COMMENCE PAR « = » ET '
            + 'N\'UTILISE QUE DES RÉFÉRENCES — jamais les nombres recopiés, sinon rien ne se '
            + 'recalcule quand une donnée change.',
        previewGrille: tableurPreviewHtml,
        pdfGrille: dessinerTableurPdf,
        nomBloc: 'Exercice',
        disposition: { cols: 3, rows: 2, maxCols: 4, maxRows: 3 },
        parLigneDefaut: 3
    },

    motscaches: {
        titre: 'Mots cachés du vocabulaire',
        consigne: (items) => {
            const m = (items[0] && items[0].meta) || {};
            // LA CONSIGNE COMMENCE PAR CE QU'IL FAUT FAIRE. Le reste est du
            // mode d'emploi : un élève qui lit trois lignes avant de savoir
            // ce qu'on lui demande a déjà décroché.
            const commun = 'TROUVE LES MOTS CACHÉS. Ils se lisent dans tous les sens : '
                + 'horizontalement, verticalement, en diagonale — et parfois à l\'envers. '
                + 'Entoure chacun dans la grille.';
            if (m.indices === 'definitions') {
                return `${commun} Ici les mots ne sont pas donnés : chaque définition en `
                    + 'désigne un seul. Écris-le sur la ligne, puis va le chercher.';
            }
            // COMBIEN DE LETTRES SONT DU BRUIT. Rémy le veut écrit : dans une
            // grille serrée, savoir qu'il ne reste que douze lettres au hasard
            // change la façon de chercher — presque tout ce qu'on voit fait
            // partie d'un mot. C'est une information de jeu, pas une
            // statistique.
            const n = Number(m.aleatoires);
            const bruit = Number.isFinite(n)
                ? ` Dans cette grille, ${n} lettre${n > 1 ? 's' : ''} seulement `
                    + `${n > 1 ? 'ont été tirées' : 'a été tirée'} au hasard.`
                : '';
            if (m.indices === 'les-deux') {
                return `${commun} La définition est là pour que le mot veuille dire quelque `
                    + 'chose — relis-la une fois le mot trouvé.' + bruit;
            }
            return commun + bruit;
        },
        previewGrille: motsPreviewHtml,
        pdfGrille: dessinerMotsPdf,
        nomBloc: 'Grille',
        titreAGauche: true,
        // UNE GRILLE PAR PAGE. À deux, un 12 × 12 tombe sous quatre millimètres
        // par lettre : on ne cherche plus des mots, on plisse les yeux.
        disposition: { cols: 1, rows: 1, maxCols: 1, maxRows: 1 },
        parLigneDefaut: 1
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

    paires: {
        titre: 'Relier les compléments',
        consigne: (items) => {
            const c = (items[0] && items[0].meta.cible) || 10;
            return `Relie chaque nombre de gauche au nombre de droite qui le complète à ${c}. `
                + 'Trace un trait d\'une pastille à l\'autre, à la règle. Chaque nombre a un '
                + 'partenaire et un seul.';
        },
        previewGrille: pairesPreviewHtml,
        pdfGrille: dessinerPairesPdf,
        nomBloc: 'Grille',
        titreAGauche: true,
        disposition: { cols: 2, rows: 2, maxCols: 3, maxRows: 3 },
        parLigneDefaut: 2
    },

    proportion: {
        titre: 'Tableaux de proportionnalité',
        consigne: () => 'Complète chaque tableau. Une colonne est toujours entièrement '
            + 'connue : c\'est elle qui donne le lien entre les deux lignes. Écris ce lien '
            + 'au-dessus du tableau si cela t\'aide (× ou ÷ combien ?).',
        previewGrille: proportionPreviewHtml,
        pdfGrille: dessinerProportionPdf,
        nomBloc: 'Tableau',
        titreAGauche: true,
        // Trois par ligne tient : la colonne des libellés se resserre, les
        // cases restent au-dessus de neuf millimètres. Au-delà, un « 12,5 » ne
        // rentrerait plus dans sa case.
        disposition: { cols: 2, rows: 3, maxCols: 3, maxRows: 4 },
        parLigneDefaut: 2
    },

    memory: {
        titre: 'Memory des tables',
        consigne: () => 'DÉCOUPE les cartes le long des pointillés. La page 2 porte les '
            + 'DOS : imprime-la au verso, ou découpe-la aussi et colle chaque dos derrière '
            + 'sa carte. Puis mélange, étale face cachée, et retourne deux cartes à la '
            + 'fois : on garde la paire quand le calcul et son résultat se rencontrent.',
        previewGrille: memoryPreviewHtml,
        pdfGrille: dessinerMemoryPdf,
        nomBloc: 'Paire', nomBlocs: 'paires',
        nomSolutions: 'les dos à coller',
        // Bord à bord : la feuille est une planche de cartes, pas une grille
        // de blocs séparés. Voir `calculerFiche`.
        blocsColles: true,
        // Une paire = deux cartes. Douze paires font vingt-quatre cartes, ce qui
        // est déjà un long memory pour une classe de sixième.
        proportions: { w: 1, h: 0.62 },
        disposition: { cols: 3, rows: 3, maxCols: 4, maxRows: 4 },
        parLigneDefaut: 3
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

    pizza: {
        titre: 'Fractions d\'une pizza',
        consigne: () => 'La pizza est déjà partagée en parts égales. Pour chaque garniture, '
            + 'écris d\'abord COMBIEN DE PARTS elle représente, puis colorie-les. La marque '
            + 'de la légende sert à s\'y retrouver sans couleur.',
        previewGrille: pizzaPreviewHtml,
        pdfGrille: dessinerPizzaPdf,
        nomBloc: 'Pizza',
        // LE BLOC EST LARGE ET BAS depuis que la commande est posée à droite du
        // disque : la pizza n'a plus besoin de la hauteur qu'occupait la liste.
        // Six par page au lieu de quatre, sans que le disque rétrécisse — une
        // pizza en douze parts qui tient dans quatre centimètres a des parts de
        // six millimètres, et on ne les colorie pas.
        proportions: { w: 1, h: 0.62 },
        disposition: { cols: 2, rows: 3, maxCols: 3, maxRows: 4 },
        parLigneDefaut: 2
    },

    horloge: {
        titre: 'La pendule',
        consigne: (items) => ((items[0] && items[0].meta.mode === 'placer')
            ? 'Trace les deux aiguilles pour afficher l\'heure écrite sous chaque pendule. '
                + 'La grande aiguille (les minutes) est LONGUE, la petite (les heures) est '
                + 'courte et épaisse — et elle se décale un peu vers le nombre suivant.'
            : 'Écris sous chaque pendule l\'heure qu\'elle affiche. La PETITE aiguille donne '
                + 'les heures, la GRANDE donne les minutes — et chaque nombre du cadran vaut '
                + 'CINQ minutes pour la grande.'),
        previewGrille: horlogePreviewHtml,
        pdfGrille: dessinerHorlogePdf,
        nomBloc: 'Pendule',
        // SIX PAR PAGE. Sous quatre centimètres, une aiguille sur le 7 et une
        // aiguille sur le 8 ne se distinguent plus : l'exercice devient un test
        // de vue au lieu d'une lecture.
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
    colorier: {
        titre: 'Colorier par les nombres',
        // PAS DE TOTAL DANS LA CONSIGNE. Le premier jet annonçait « 52 cases
        // coloriées par grille » — le compte de la PREMIÈRE grille, présenté
        // comme celui de toutes. Deux grilles n'ont aucune raison d'avoir le
        // même, et un renseignement faux vaut moins que pas de renseignement.
        consigne: () => 'LES NOMBRES DONNENT LA LONGUEUR DES BLOCS COLORIÉS, dans l\'ordre, '
            + 'séparés d\'au moins une case blanche. « 2 1 » : un bloc de deux, une blanche '
            + 'au moins, puis un bloc d\'un. On ne devine jamais — on cherche ce qui est '
            + 'CERTAIN, et l\'on BARRE les cases qu\'on sait blanches : une croix interdit '
            + 'des placements, elle vaut autant qu\'une case coloriée. Commence par les '
            + 'grands nombres : un bloc large ne peut pas beaucoup bouger.',
        previewGrille: colorierPreviewHtml,
        pdfGrille: dessinerColorierPdf,
        nomBloc: 'Grille', nomBlocs: 'grilles',
        // DEUX PAR PAGE AU PLUS, ET C'EST LA TAILLE DES CASES QUI COMMANDE : on
        // colorie au crayon et l'on barre, ce qu'une case de trois millimètres
        // ne permet pas. Quatre grilles de dix sur une page donnaient des cases
        // de 4 mm — mesuré ; deux en donnent 8.
        disposition: { cols: 2, rows: 1, maxCols: 3, maxRows: 3 },
        parLigneDefaut: 2
    },
    sudoku: {
        titre: 'Sudoku',
        consigne: (items) => {
            const { n, br, bc } = items[0].meta;
            return `Complète la grille : chaque chiffre de 1 à ${n} une seule fois par ligne, `
                + `par colonne et par bloc de ${br} × ${bc}.`;
        },
        previewGrille: sudokuPreviewHtml,
        pdfGrille: dessinerSudokuPdf
    },
    mathdoku: {
        titre: 'Mathdoku',
        consigne: (items) => {
            const { lo, hi } = items[0].meta;
            return `Chaque chiffre de ${lo} à ${hi} apparaît une seule fois par ligne et par colonne. `
                + `Chaque zone doit donner le résultat écrit dans son coin, avec l'opération indiquée.`;
        },
        previewGrille: grillePreviewHtml,
        pdfGrille: dessinerGrillePdf
    },
    garam: {
        titre: 'Garam',
        consigne: () => 'Complète les cases avec des chiffres de 0 à 9 pour que toutes les égalités, '
            + 'horizontales et verticales, soient vraies.',
        previewGrille: garamPreviewHtml,
        pdfGrille: dessinerGaramPdf,
        // DEUX PAR LIGNE. Un garam n'est pas une grille de cases vides : c'est
        // un treillis d'égalités où l'on écrit un chiffre dans des cases de
        // trois millimètres. À trois par ligne elles deviennent illisibles —
        // et la première chose qu'on fait sur un garam, c'est écrire dedans.
        parLigneDefaut: 2
    },
    logigramme: {
        titre: 'Logigramme',
        consigne: () => 'Chaque personne a UNE valeur dans chaque liste, et chaque valeur ne sert qu\'une fois. '
            + 'Barre les cases impossibles, coche les certaines : dès qu\'une case est cochée, sa ligne et sa '
            + 'colonne se barrent, et s\'il ne reste qu\'une case non barrée dans une ligne, c\'est elle.',
        previewGrille: logigrammePreviewHtml,
        pdfGrille: dessinerLogigrammePdf,
        // Un logigramme n'est pas carré : il lui faut la largeur d'une page
        // pour poser ses indices à côté de sa grille.
        // Assez haut pour la grille et ses indices, assez court pour en poser
        // DEUX sur une page : un logigramme par feuille serait du gâchis.
        proportions: { w: 1, h: 0.47 },
        parLigneDefaut: 1,
        // SUR LA FICHE AUTONOME : deux colonnes, une seule rangée. La page est
        // en paysage, un logigramme est HAUT (son énigme au-dessus de sa
        // grille) : deux colonnes pleine hauteur donnent des cases de douze
        // millimètres là où trois par quatre les réduisait à deux.
        disposition: { cols: 2, rows: 1, maxCols: 3, maxRows: 2 },
        titreAGauche: true,
        // Et un trait noir entre les énigmes : sans lui on ne sait plus quel
        // indice appartient à quelle grille.
        separateurs: true,
        // Il prend toute la largeur : ses indices se lisent à côté de sa grille.
        grilleMax: 300
    },
    futoshiki: {
        titre: 'Futoshiki',
        consigne: (items) => {
            const { n } = items[0].meta;
            return `Chaque chiffre de 1 à ${n} une seule fois par ligne et par colonne, `
                + 'en respectant les signes < et > entre les cases.';
        },
        previewGrille: futoshikiPreviewHtml,
        pdfGrille: dessinerFutoshikiPdf
    },
    slitherlink: {
        titre: 'Slitherlink',
        consigne: () => 'Relie des points voisins par des segments pour former UNE seule boucle '
            + 'fermée, qui ne se croise ni ne se touche. Un chiffre dit combien des quatre côtés '
            + 'de sa case font partie de la boucle ; une case vide ne dit rien. '
            + 'Barre d\'une croix les côtés dont tu es sûr : un point porte deux segments ou aucun.',
        previewGrille: slitherlinkPreviewHtml,
        pdfGrille: dessinerSlitherlinkPdf,
        // QUATRE grilles par page, pas douze. On trace au crayon entre des
        // points : sous six millimètres de côté, la main ne passe plus et la
        // grille devient un exercice de dessin fin au lieu d'un raisonnement.
        disposition: { cols: 2, rows: 2, maxCols: 3, maxRows: 3 },
        parLigneDefaut: 2
    },
    'carre-magique': {
        titre: 'Carrés magiques',
        consigne: (items) => 'Complète chaque carré : toutes les lignes, colonnes et diagonales doivent '
            + 'faire la somme indiquée. Cherche une ligne où il ne manque qu\'une case, et soustrais.',
        previewGrille: carreMagiquePreviewHtml,
        pdfGrille: dessinerCarreMagiquePdf,
        parLigneDefaut: 3
    },
    dominos: {
        titre: 'Dominos',
        consigne: (items) => `Découpe les ${(items[0] && items[0].meta.pieces.length) || ''} pièces du bas `
            + 'et colle-les le long du parcours, bout à bout : chaque question doit TOUCHER sa '
            + 'réponse. On part de DÉPART, on calcule le bout ouvert, on cherche ce résultat sur une '
            + 'autre pièce. Le parcours serpente : aux virages l\'emplacement est debout, et au retour '
            + 'la pièce se pose à l\'envers — un domino se tourne.',
        previewGrille: dominosPreviewHtml,
        pdfGrille: dessinerDominosPdf,
        // Une planche prend une demi-page : les pièces doivent rester assez
        // grandes pour être découpées et manipulées par des doigts d'élève —
        // et il en faut désormais DEUX fois la place, le plateau vide au-dessus
        // et les pièces à découper en dessous.
        proportions: { w: 1, h: 0.95 },
        parLigneDefaut: 1,
        // Sur la fiche autonome : UNE planche par page. Deux jeux de dominos
        // découpés sur la même feuille finiraient mélangés dans l'enveloppe.
        disposition: { cols: 1, rows: 1, maxCols: 2, maxRows: 2 },
        titreAGauche: true,
        separateurs: true,
        grilleMax: 300,
        // On ne dit pas « grille » à une planche de dominos.
        nomBloc: 'Planche'
    },
    binairo: {
        titre: 'Binairo',
        consigne: (items) => {
            const { n } = items[0].meta;
            return `Complète avec des 0 et des 1 : ${n / 2} de chaque sur chaque ligne et chaque colonne, `
                + `jamais trois chiffres identiques qui se suivent.`;
        },
        previewGrille: binairoPreviewHtml,
        pdfGrille: dessinerBinairoPdf
    }
};

// --- La modale ---------------------------------------------------------------

const CLE_FENETRE = 'mathbox-fiche-flottante';
const lireModeFenetre = () => {
    try { return localStorage.getItem(`${CLE_FENETRE}-mode`); } catch (e) { return null; }
};
let fenetreFiche = null;

function assurerModale() {
    let modal = document.getElementById('print-sheet-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'print-sheet-modal';
    modal.className = 'modal-overlay modal-overlay--top';
    modal.innerHTML = `
        <div class="glass-panel modal-panel-lg fp-panel">
            <h3 class="modal-title">📄 Fiche à imprimer</h3>
            <!-- TROIS QUESTIONS, TOUJOURS DANS LE MÊME ORDRE, et les mêmes
                 sur les deux fiches : QUOI dessus, COMBIEN, SUR QUEL PAPIER.
                 Rémy : « il faut aller au plus clair et au plus simple ». Les
                 deux fenêtres mélangeaient les trois, et celle des questions
                 sautait la première. -->

            <!-- ① QUOI — les réglages de l'exercice, sur la fiche elle-même.
                 Rémy : « peut-on demander des sudokus autres que 6 × 6 pour
                 les PDF ? ». On le pouvait — mais seulement en ressortant de
                 la fiche pour aller régler l'exercice, puis en y revenant. -->
            <div class="fp-contenu" id="fp-contenu" hidden></div>

            <!-- ② COMBIEN — un seul nombre, et la taille qui en découle. -->
            <div class="fp-controles fp-combien">
                <label>Combien
                    <span class="fp-pas">
                        <button type="button" class="fp-pas-btn" data-pas="-1" aria-label="Un de moins">−</button>
                        <input type="number" id="fp-combien" class="cfg-input cfg-input--num" min="1" max="25" value="12">
                        <button type="button" class="fp-pas-btn" data-pas="1" aria-label="Un de plus">+</button>
                    </span></label>
                <span class="fp-total" id="fp-total"></span>
                <button type="button" class="btn-hint" id="fp-regen">🎲 Autres grilles</button>
                <button type="button" class="btn-hint" id="fp-atelier" style="display:none">♟ Composer mes échiquiers…</button>
                <button type="button" class="btn-hint" id="fp-voir-sol" aria-pressed="false">Voir les solutions</button>
            </div>

            <!-- ③ SUR QUEL PAPIER — le format et la couleur de l'imprimante ne
                 changent pas d'une fiche à l'autre : on les règle une fois. -->
            <details class="fp-repli" id="fp-plus">
                <summary>Papier et impression</summary>
                <div class="fp-controles">
                    <label>Format
                        <select id="fp-orientation" class="cfg-input">
                            <option value="paysage">A4 paysage</option>
                            <option value="portrait">A4 portrait</option>
                        </select></label>
                    <label>Impression
                        <select id="fp-couleur" class="cfg-input"></select></label>
                </div>
            </details>
            <div class="fp-apercu-cadre">
                <div class="fp-apercu" id="fp-apercu"></div>
            </div>
            <div class="fp-note" id="fp-note">Page 1 : les grilles, avec un en-tête Nom / Date.
                Page 2 : les solutions — à garder pour soi ou à donner après.</div>
            <div class="modal-actions-center">
                <button type="button" class="btn-toggle glass-btn modal-btn-flex modal-btn-flex--neutral" id="fp-fermer">Fermer</button>
                <button type="button" class="btn-toggle glass-btn primary active modal-btn-flex" id="fp-telecharger">⬇️ Télécharger le PDF</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    // Les deux commandes de fenêtre — ancrer/détacher, replier les réglages —
    // sont posées dans le titre une fois pour toutes.
    fenetreFiche = equiperFenetre(modal, CLE_FENETRE, { peutDetacher: fenetresDetachables });
    return modal;
}

// --- Mathdoku ----------------------------------------------------------------

function entetePdf(doc, titre, sousTitre, consigne, mention = '') {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(...ENCRE.texte);
    doc.text(pourPdf(`${titre}${sousTitre ? ' — ' + sousTitre : ''}`), PAGE.marge, PAGE.marge + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Nom : ..............................    Date : ....................', PAGE.w - PAGE.marge, PAGE.marge + 6, { align: 'right' });
    if (consigne) {
        // Découpée à la largeur de la page : d'un seul tenant, une consigne un
        // peu longue sortait par la droite et se terminait dans le vide.
        //
        // ET ON NE LA COUPE PLUS EN SILENCE. Deux lignes tenaient dans
        // l'en-tête, la troisième était jetée : la consigne du pavage perdait
        // ses derniers mots — « ce que tu cherches est au MILIEU des deux » —
        // c'est-à-dire précisément ce qu'il fallait faire. L'aperçu, lui,
        // affichait la phrase entière ; le défaut ne se voyait qu'à
        // l'impression. On rétrécit donc le texte jusqu'à ce qu'il tienne.
        doc.setTextColor(90, 98, 112);
        const large = PAGE.w - PAGE.marge * 2;
        let lignes = [], taille = 8.6;
        for (const t of [8.6, 8, 7.4, 6.9]) {
            doc.setFontSize(t);
            lignes = doc.splitTextToSize(pourPdf(consigne), large);
            taille = t;
            if (lignes.length <= 2) break;
        }
        doc.setFontSize(taille);
        // Au-delà de deux lignes même rétréci, on le DIT — un « … » vaut mieux
        // qu'une phrase qui s'arrête net au milieu d'une idée.
        if (lignes.length > 2) lignes = [lignes[0], `${lignes[1].trimEnd()} …`];
        lignes.forEach((l, i) => doc.text(l, PAGE.marge, PAGE.marge + 11.6 + i * 3.4));
    }
    doc.setDrawColor(...ENCRE.trait);
    doc.setLineWidth(0.4);
    doc.line(PAGE.marge, PAGE.marge + 8, PAGE.w - PAGE.marge, PAGE.marge + 8);
    doc.setFontSize(6.5);
    doc.setTextColor(150, 155, 165);
    // LA MENTION DE LICENCE VOYAGE AVEC LA FEUILLE. Un jeu de pièces importé
    // peut être sous CC BY-SA : la citation doit figurer là où le dessin est
    // distribué, c'est-à-dire sur la feuille elle-même, pas seulement dans le
    // code. Elle ne s'affiche que sur les fiches qui montrent des pièces.
    doc.text('Fiche générée par AtoutMath' + (mention ? ` — ${mention}` : ''),
        PAGE.w / 2, PAGE.h - 4, { align: 'center' });
}

function construirePdf(jsPDF, rendu, items, cols, rows, titre = null, sansSolutions = false) {
    // L'ENCRE DU MODE CHOISI EST POSÉE SUR LE DOCUMENT, une fois : les deux
    // cents endroits qui écrivent une couleur n'ont rien à en savoir.
    const doc = teindreDoc(new jsPDF({ orientation: ficheEnPortrait() ? 'portrait' : 'landscape', unit: 'mm', format: 'a4' }));
    const { slots, traits } = calculerFiche(cols, rows, !!rendu.blocsColles);

    // La mention de licence ne s'ajoute qu'aux fiches qui montrent des pièces.
    const avecPieces = rendu === RENDUS.mat || rendu === RENDUS.echiquier;
    const page = (solution) => {
        // LA SECONDE PAGE N'EST PAS TOUJOURS UN CORRIGÉ : celle du memory
        // porte les DOS des cartes, et l'appeler « Solutions » ferait croire
        // à une feuille de réponses qu'on garde pour soi.
        entetePdf(doc, titre || rendu.titre, solution ? (rendu.nomSolutions || 'Solutions') : '', solution ? '' : rendu.consigne(items),
            avecPieces ? MENTION_PIECES : '');
        if (rendu.separateurs) {
            doc.setDrawColor(...ENCRE.trait);
            doc.setLineWidth(0.35);
            traits.forEach(t => doc.line(t.x1, t.y1, t.x2, t.y2));
        }
        items.forEach((item, i) => {
            const slot = slots[i];
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(...ENCRE.texte);
            // « Grille » pour un sudoku, « Planche » pour des dominos : le
            // rendu nomme ses blocs, la modale ne le devine pas.
            const nom = `${rendu.nomBloc || 'Grille'} ${i + 1}`;
            if (rendu.blocsColles) { /* pas d'étiquette sur une carte à découper */ }
            else if (rendu.titreAGauche) doc.text(nom, slot.boite.x, slot.titre.y);
            else doc.text(nom, slot.titre.x, slot.titre.y, { align: 'center' });
            // Le RANG du bloc sur la feuille : certains rendus en tirent leur
            // couleur, pour que deux figures voisines ne soient pas jumelles.
            rendu.pdfGrille(doc, item, slot, solution, null, i, items);
        });
    };

    page(false);
    // UNE PLANCHE COMPOSÉE À LA MAIN N'A PAS DE CORRIGÉ. La page « Solutions »
    // y recopiait la première à l'identique : une feuille de plus à imprimer,
    // et rien de plus à lire dessus.
    if (!sansSolutions) {
        doc.addPage('a4', ficheEnPortrait() ? 'portrait' : 'landscape');
        page(true);
    }
    return doc;
}

/**
 * Ouvre la modale de fiche pour un exercice imprimable.
 * @param {Object} exo    - entrée de catalogue portant `printable`
 * @param {Object} params - réglages courants (chiffres, opérations, difficulté)
 */
export function ouvrirFicheModal(exo, params, atelier = null, opts = {}) {
    // DES GRILLES FAITES À LA MAIN, PAS TIRÉES AU SORT.
    //
    // L'atelier d'échiquiers compose ses diagrammes pièce par pièce : il n'y a
    // pas de générateur derrière, et « d'autres grilles » n'aurait aucun sens
    // — on jetterait ce que le professeur vient de poser. Le reste de la
    // modale ne change pas : c'est le même aperçu, la même mise en page, le
    // même PDF.
    // UN EXERCICE PEUT IMPRIMER AUTRE CHOSE QU'IL NE JOUE.
    //
    // À l'écran, le repérage pose UN point à la fois : c'est ce qu'il faut
    // pour corriger tout de suite. Sur le papier, un repère qui ne porte qu'un
    // point gâche une demi-page, et l'élève passe son temps à retracer des
    // axes. Le même exercice a donc le droit d'avoir un générateur de FICHE
    // distinct — plutôt que de doubler le catalogue d'entrées « à imprimer »
    // que personne ne cherche.
    const generator = atelier ? null : generateurDeFiche(exo);
    const rendu = RENDUS[exo.printable];
    // Deux papiers pour deux natures d'exercice : une GRILLE se dessine (on y
    // rature, on y note ses candidats), une QUESTION s'écrit sur une ligne.
    // Le second cas est de loin le plus fréquent, et n'existait pas.
    if (!rendu) {
        if (atelier) return;
        if (generator && generator.ecrit) {
            import('./printQuestions.js')
                .then(m => m.ouvrirFicheQuestions(exo, { ...(exo.printParams || {}), ...(params || {}) },
                    chargerJsPDF, opts));
        }
        return;
    }
    if (!generator && !atelier) return;

    // UNE FICHE PEUT ÊTRE FAITE POUR UNE ORIENTATION, et le dire.
    //
    // L'orientation est d'ordinaire un choix du professeur, retenu d'une
    // feuille à l'autre. Mais certaines planches n'existent que dans un sens :
    // l'organigramme des quadrilatères est PORTRAIT — huit rangées empilées du
    // quadrilatère au carré — et sorti en paysage il se tasse jusqu'à ce que
    // ses cases ne puissent plus rien recevoir. Mesuré : 84 mm de large sur une
    // page de 279, et des cases de 13 mm où l'on doit écrire « Qui a ses
    // diagonales perpendiculaires ». La fiche impose donc son sens à
    // l'ouverture ; le sélecteur reste là, et le professeur peut toujours en
    // décider autrement.
    if (rendu.portrait && !ficheEnPortrait()) reglerFichePortrait(true);

    const modal = assurerModale();
    const apercu = modal.querySelector('#fp-apercu');
    const combienEl = modal.querySelector('#fp-combien');
    const totalEl = modal.querySelector('#fp-total');
    const btnSol = modal.querySelector('#fp-voir-sol');

    // Le papier PROPOSE, le professeur DISPOSE — voir `printParcours.js`.
    const reglages = { ...(exo.printParams || {}), ...(params || {}) };
    // Le titre imprimé. « L'échiquier, une grille à deux entrées » est le titre
    // de l'exercice de repérage ; une planche composée à la main n'est pas cet
    // exercice-là, et coiffer la feuille du professeur d'une consigne qu'il
    // n'a pas écrite serait la lui prendre.
    const titreFiche = (atelier && atelier.titre) || rendu.titre;
    let items = [];
    let solutionsVisibles = false;

    // Le rendu sait mieux que la modale comment il tient sur une page : un
    // sudoku va par douze, un logigramme par deux. Il le disait déjà en
    // colonnes et en lignes ; on n'en garde que le PRODUIT — le nombre qu'il
    // conseille — et les bornes.
    const dispo = dispositionDuRendu(rendu);
    const combienDefaut = Math.max(1, (dispo.cols || 3) * (dispo.rows || 4));
    const plafond = capaciteMax(dispo);
    const lireCombien = () =>
        Math.max(1, Math.min(plafond, Math.round(Number(combienEl.value)) || combienDefaut));
    // LE PROFESSEUR DIT COMBIEN, LA FEUILLE TROUVE COMMENT. Trois colonnes et
    // quatre lignes, c'était à lui de le résoudre ; ce n'est pas sa question.
    // LA PROPORTION D'UN BLOC PEUT DÉPENDRE DE CE QU'IL CONTIENT. Un tableau de
    // conversion à huit lignes n'a pas la même forme qu'un à quatre : une
    // proportion fixe convenait à l'un et écrasait l'autre — c'est ainsi que
    // les questions du tableau suivant venaient s'écrire par-dessus les
    // dernières du précédent. Un rendu peut donc déclarer une fonction, à qui
    // l'on passe les grilles tirées.
    const proportionsDe = () => (typeof rendu.proportions === 'function'
        // `items` peut être encore vide au tout premier appel : le rendu doit
        // alors répondre pour une liste vide, ce que la conversion fait en
        // retombant sur son nombre de lignes par défaut.
        ? rendu.proportions(items)
        : rendu.proportions);
    const disposerPour = (n) => choisirDisposition(n, dispo, PAGE, {
        proportions: proportionsDe(), colles: !!rendu.blocsColles
    });

    // Graine fraîche par grille : chaque fiche est différente. Les grilles ne
    // sont RETIRÉES qu'en cas de besoin (plus de cases), jamais régénérées à
    // l'ouverture des solutions — l'aperçu doit montrer les mêmes grilles.
    const completer = (total) => {
        // Les diagrammes de l'atelier sont donnés : on ne complète pas, et on
        // ne rogne pas non plus — la feuille montre ce qui a été composé.
        if (atelier) return;
        while (items.length < total) {
            // On passe au générateur ce qui a DÉJÀ été tiré : un logigramme
            // change alors d'histoire à chaque grille au lieu de resservir la
            // boulangerie trois fois sur la même feuille.
            items.push(generator.generate(reglages, {
                rng: makeRng(), index: items.length,
                themesExclus: items.map(it => it.meta && it.meta.theme).filter(Boolean)
            }));
        }
        items.length = total;
    };

    // LE CHAMP DOIT DIRE LA VÉRITÉ. Un tableau de proportionnalité ne tient
    // qu'à deux par ligne ; taper « 30 » donne le maximum possible, mais si le
    // champ affiche toujours 30 et que le compte ne bouge pas, on croit
    // l'interface cassée alors qu'elle borne en silence. On réécrit donc la
    // valeur retenue, et les boutons − / + s'éteignent aux bornes.
    const recaler = (n) => {
        if (combienEl.value !== '') combienEl.value = String(n);
        combienEl.max = String(plafond);
        modal.querySelectorAll('.fp-pas-btn').forEach(b => {
            b.disabled = Number(b.dataset.pas) > 0 ? n >= plafond : n <= 1;
        });
    };

    const rendre = () => {
        // Une planche composée à la main porte ce qu'on y a posé, ni plus ni
        // moins : c'est le nombre de diagrammes qui commande, pas le champ.
        const n = atelier ? Math.max(1, items.length) : lireCombien();
        if (!atelier) recaler(n);
        const { cols, rows, cote } = disposerPour(n);
        completer(n);
        // « tableaus », « bateaus »… Un pluriel fautif dans une interface de
        // professeur de français-et-maths ne passe pas : le rendu peut donner
        // le sien, sinon on ajoute un « s » (ou rien s'il y en a déjà un).
        const un = rendu.nomBloc || 'Grille';
        const plusieurs = rendu.nomBlocs || (/(au|eu|eau)$/.test(un) ? `${un}x` : `${un}s`);
        // ET LA TAILLE, EN CENTIMÈTRES. C'est la conséquence du nombre, et la
        // seule chose qu'on voulait vraiment savoir en réglant « colonnes » :
        // est-ce que les élèves auront la place d'écrire dedans ?
        totalEl.textContent = `${n} ${(n > 1 ? plusieurs : un).toLowerCase()}`
            + ` · ${coteLisible(cote)}`;

        // L'échelle vient de la place disponible : la page garde son format.
        const large = apercu.parentElement.clientWidth || 720;
        const k = large / PAGE.w;
        apercu.style.width = `${PAGE.w * k}px`;
        apercu.style.height = `${PAGE.h * k}px`;

        const { slots, traits } = calculerFiche(cols, rows, !!rendu.blocsColles);
        const en = PAGE.marge * k;
        let html = `
            <div class="fp-entete fp-entete--partage" style="left:${en}px; right:${en}px; top:${(PAGE.marge + 1) * k}px;">
                <b>${titreFiche}${solutionsVisibles ? ' — ' + (rendu.nomSolutions || 'Solutions') : ''}</b>
                <span>Nom : ............  Date : ......</span>
            </div>
            <div class="fp-ligne" style="left:${en}px; right:${en}px; top:${(PAGE.marge + 8) * k}px;"></div>`;
        // La consigne aussi : l'aperçu doit montrer la feuille telle qu'elle
        // sortira de l'imprimante, consigne comprise.
        if (!solutionsVisibles) {
            html += `<div class="fp-consigne" style="left:${en}px; right:${en}px;
                top:${(PAGE.marge + 9.4) * k}px; font-size:${3.03 * k}px">${echapperSheet(rendu.consigne(items))}</div>`;
        }
        if (rendu.separateurs) {
            traits.forEach(t => {
                html += `<div class="fp-separateur" style="left:${t.x1 * k}px; top:${t.y1 * k}px;
                    width:${Math.max(1, (t.x2 - t.x1) * k)}px; height:${Math.max(1, (t.y2 - t.y1) * k)}px"></div>`;
            });
        }
        const nomBloc = rendu.nomBloc || 'Grille';
        items.forEach((item, i) => {
            const slot = slots[i];
            // Centré au-dessus d'une grille carrée ; à gauche pour un bloc
            // large, où le milieu tombe en plein dans le texte de l'énigme.
            html += rendu.blocsColles ? ''
                : rendu.titreAGauche
                ? `<div class="fp-titre fp-titre--gauche" style="left:${slot.boite.x * k}px;
                    width:${slot.boite.w * k}px; top:${(slot.titre.y - 3.6) * k}px;
                    font-size:${Math.max(8, 3.2 * k)}px">${nomBloc} ${i + 1}</div>`
                : `<div class="fp-titre" style="left:${(slot.titre.x - 20) * k}px; width:${40 * k}px; top:${(slot.titre.y - 3.6) * k}px; font-size:${Math.max(8, 3.2 * k)}px">${nomBloc} ${i + 1}</div>`;
            html += rendu.previewGrille(item, slot, k, solutionsVisibles, i, items);
            // ON CHANGE UNE GRILLE EN CLIQUANT DESSUS.
            //
            // « Autres grilles » refait la feuille entière : quand une seule
            // grille ne convient pas — trop facile, un mot qu'on ne veut pas,
            // une position déjà donnée l'an dernier —, on perdait les onze
            // autres pour la remplacer. Le bloc lui-même est donc un bouton.
            if (atelier) return;
            const bo = slot.boite;
            html += `<button type="button" class="fp-bloc" data-bloc="${i}"
                title="Changer cette grille"
                style="left:${bo.x * k}px; top:${(bo.y - 4) * k}px;
                width:${bo.w * k}px; height:${(bo.h + 4) * k}px"><span>🎲 Autre</span></button>`;
        });
        // L'ENCRE DU MODE, POSÉE SUR LA CHAÎNE ELLE-MÊME : c'est la porte
        // unique par où passent toutes les couleurs de l'aperçu.
        apercu.innerHTML = teindreHtml(html);

        apercu.querySelectorAll('[data-bloc]').forEach(b => {
            b.onclick = () => {
                const i = Number(b.dataset.bloc);
                // On exclut ce que portent les AUTRES blocs, pas celui-ci :
                // sinon la grille qu'on veut changer s'interdit elle-même de
                // revenir, et le tirage se rétrécit à chaque clic.
                items[i] = generator.generate(reglages, {
                    rng: makeRng(), index: i,
                    themesExclus: items
                        .filter((_, j) => j !== i)
                        .map(it => it.meta && it.meta.theme).filter(Boolean)
                });
                rendre();
            };
        });
    };

    combienEl.value = String(combienDefaut);
    combienEl.max = String(plafond);
    // « input » et pas seulement « change » : la feuille suit la frappe, sans
    // qu'il faille sortir du champ pour voir ce qu'on a demandé.
    combienEl.oninput = rendre;
    combienEl.onchange = rendre;
    modal.querySelectorAll('.fp-pas-btn').forEach(b => {
        b.onclick = () => {
            combienEl.value = String(lireCombien() + Number(b.dataset.pas));
            rendre();
        };
    });
    // Une planche d'atelier ne se compte pas depuis cette fenêtre : on y
    // ajoute ou l'on y retire un damier dans l'atelier lui-même.
    modal.querySelector('.fp-combien').classList.toggle('fp-combien--fige', !!atelier);
    // Le choix couleur / noir et blanc : il vaut pour CETTE fiche, et devient
    // le choix par défaut des suivantes. Un professeur qui imprime en noir et
    // blanc le fait pour toute l'année, pas pour une feuille.
    const couleurEl = modal.querySelector('#fp-couleur');
    retenirRepli(modal.querySelector('#fp-plus'), 'grilles');
    // LES QUATRE MODES SONT ÉNUMÉRÉS UNE FOIS, dans ficheRendu.js : trois
    // listes recopiées à la main dériveraient, et un mode absent d'une liste
    // serait un réglage impossible à choisir sur cette fiche-là.
    couleurEl.innerHTML = optionsPolycopie();
    couleurEl.value = modePolycopie();
    couleurEl.onchange = () => {
        reglerModePolycopie(couleurEl.value);
        poserTeinte(modal.querySelector('#fp-apercu'));
        rendre();
    };
    poserTeinte(modal.querySelector('#fp-apercu'));
    // L'ORIENTATION DE LA FEUILLE. Comme la couleur : elle vaut pour celle-ci,
    // et devient le défaut des suivantes.
    const orientEl = modal.querySelector('#fp-orientation');
    orientEl.value = ficheEnPortrait() ? 'portrait' : 'paysage';
    orienterPage(ficheEnPortrait());
    orientEl.onchange = () => {
        reglerFichePortrait(orientEl.value === 'portrait');
        orienterPage(ficheEnPortrait());
        rendre();
    };

    // --- ① QUOI : LES RÉGLAGES DE L'EXERCICE, dans la fiche -----------------
    //
    // Le générateur dit ce qu'il sait faire varier ; le catalogue dit sous
    // quels mots et dans quel ordre. On prenait le premier seulement, et cinq
    // réglages qui changent VRAIMENT la feuille n'y étaient pas réglables :
    // l'histoire d'un logigramme, la difficulté d'un futoshiki, le niveau de
    // Pythagore, le départ d'un mat en un coup, le nombre de termes d'une
    // opération posée. La règle est maintenant dans `core/reglagesFiche.js`,
    // avec les tests qui la tiennent.
    //
    // Rien du tout pour un atelier : les diagrammes y sont composés à la main.
    const contenuEl = modal.querySelector('#fp-contenu');
    if (atelier || !generator) {
        contenuEl.hidden = true;
        contenuEl.innerHTML = '';
    } else {
        monterPanneauContenu(contenuEl, {
            exo, schemaCatalogue: paramSchemaOf(exo), generator, reglages,
            // Un réglage changé RETIRE les grilles : elles ont été tirées avec
            // l'ancien, et garder un sudoku 6 × 6 sur une fiche réglée en 9 × 9
            // ferait mentir l'aperçu.
            onChange: () => { items = []; rendre(); }
        });
    }

    const btnRegen = modal.querySelector('#fp-regen');
    btnRegen.onclick = () => { items = []; rendre(); };
    // Rien à retirer au sort, et rien à corriger : l'atelier n'a ni tirage ni
    // solution. Les deux boutons se cachent plutôt que de ne rien faire.
    btnRegen.style.display = atelier ? 'none' : '';
    btnSol.style.display = atelier ? 'none' : '';

    // L'ATELIER SE TROUVE OÙ L'ON PENSE DÉJÀ À IMPRIMER. Le professeur qui
    // regarde une fiche d'échiquiers tirée au sort est exactement celui qui
    // voudra poser SA position — et il ne le cherchera pas dans un menu.
    // Une planche composée à la main n'a pas de corrigé à produire : promettre
    // une page de solutions qui ne viendra pas serait un mensonge d'interface.
    modal.querySelector('#fp-note').textContent = atelier
        ? 'Une page, avec un en-tête Nom / Date. Reviens à l\'atelier pour ajouter ou retirer un damier.'
        : 'Page 1 : les grilles, avec un en-tête Nom / Date. '
          + 'Page 2 : les solutions — à garder pour soi ou à donner après.';

    const btnAtelier = modal.querySelector('#fp-atelier');
    btnAtelier.style.display = (!atelier && exo.printable === 'echiquier') ? '' : 'none';
    btnAtelier.onclick = () => {
        modal.style.display = 'none';
        import('./echiquierAtelier.js').then(m => m.ouvrirAtelierEchiquier());
    };
    btnSol.onclick = () => {
        solutionsVisibles = !solutionsVisibles;
        btnSol.textContent = solutionsVisibles ? 'Voir les grilles' : 'Voir les solutions';
        btnSol.setAttribute('aria-pressed', String(solutionsVisibles));
        rendre();
    };
    modal.querySelector('#fp-fermer').onclick = () => { modal.style.display = 'none'; };

    const btnDl = modal.querySelector('#fp-telecharger');
    btnDl.onclick = () => {
        btnDl.disabled = true;
        const n = atelier ? Math.max(1, items.length) : lireCombien();
        const { cols, rows } = disposerPour(n);
        chargerJsPDF()
            .then(jsPDF => {
                // Un plateau de jeu vide n'a pas
                // de correction — la page de solutions serait le même plateau,
                // toujours vide, et une feuille de plus à photocopier.
                const doc = construirePdf(jsPDF, rendu, items, cols, rows, titreFiche,
                    !!atelier || !!rendu.sansSolution);
                doc.save(`${(atelier && atelier.nom) || exo.printable}-${items.length}.pdf`);
            })
            .catch(() => {
                import('./modal.js').then(m => m.showAlert(
                'Le générateur de PDF n\'a pas pu être chargé. Recharge la page : '
                + 'la bibliothèque est servie avec l\'application, elle ne dépend d\'aucun site extérieur.'));
            })
            .finally(() => { btnDl.disabled = false; });
    };

    items = atelier ? atelier.items.slice() : [];
    solutionsVisibles = false;
    btnSol.textContent = 'Voir les solutions';
    // La disposition part du NOMBRE de diagrammes composés : deux échiquiers
    // demandés ne s'impriment pas sur une grille de quatre cases vides. C'est
    // désormais la règle générale, et l'atelier n'a plus de cas à part — il
    // dit seulement que le nombre ne se règle pas ici.
    // De quoi se redessiner quand la fenêtre change de taille : détacher,
    // replier ou tirer le coin change la largeur disponible, et l'aperçu
    // calcule son échelle dessus.
    modal._flotRendre = () => rendre();
    modal.style.display = 'flex';
    // ANCRÉE PAR DÉFAUT, POUR TOUT LE MONDE — Y COMPRIS SOUS LA BARRE DE PASSE.
    // Rémy : « quand la barre de début test (le banc de test), la modale
    // d'impression (PDF) doit être comme avant en prenant une partie de
    // l'écran. » La barre de passe l'ouvrait détachée, au prétexte qu'une
    // modale qui bloque ne peut pas accompagner une passe de cent exercices —
    // c'est la BARRE qu'on a remontée au-dessus de la fiche, pas la fiche
    // qu'on met de côté. `opts.flottant` ne dit donc plus « détache-toi » mais
    // seulement « cette fiche suit l'exercice qu'on regarde ».
    //
    // Le mode détaché ne se restaure QUE si l'interrupteur d'auteur est
    // allumé : sans cela, un seul clic pendant une passe laissait une fenêtre
    // baladeuse à tous ceux qui ouvraient une fiche ensuite.
    fenetreFiche.majDetachable();
    if (fenetresDetachables() && lireModeFenetre() === 'detache') fenetreFiche.detacher();
    else fenetreFiche.ancrer();
    rendre();
}
