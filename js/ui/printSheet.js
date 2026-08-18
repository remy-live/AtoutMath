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
import { GLYPHES, egyptianSvg, placerGlyphes } from '../core/figures.js';
import { pourPdf, polycopieEnCouleur, reglerPolycopieCouleur,
    ficheEnPortrait, reglerFichePortrait
} from './ficheRendu.js';
import { equiperFenetre } from './flottant.js';
// Le détachement est un outil d'auteur : l'interrupteur vit dans la palette.
import { fenetresDetachables } from './debugBar.js';
import { paramSchemaOf } from '../data/catalog.js';
import {
    ajusterAuCarre, insecable, cheminSerpentin, boiteDe as boiteCaseDomino, cellulesDe
} from '../core/dominos.js';
import { marqueSvg as marqueSvgRelier } from '../core/relier.js';
import { pieceSvg, dessinerPiecePdf, direPiece, MENTION_PIECES } from './piecesEchecs.js';
import { INGREDIENTS as INGREDIENTS_FICHE } from '../core/pizza.js';
import { ecrire as ecrireProp } from '../core/proportion.js';
import {
    dessiner as dessinerNoyau, aretesCachees as aretesCacheesNoyau,
    facesVisibles as facesVisiblesNoyau
} from '../core/solides.js';
import {
    cotesDe as cotesDePythagore, etapesCalcul as etapesCalculPythagore,
    ligneEnTexte as ligneEnTextePythagore
} from '../core/pythagore.js';
import { boite as boiteTangram } from '../core/tangram.js';

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
function calculerFiche(cols, rows) {
    const gapX = 6, gapY = 4, titreH = 4.4;
    const y0 = PAGE.marge + PAGE.enteteH;
    const W = PAGE.w - PAGE.marge * 2;
    const H = PAGE.h - y0 - PAGE.marge - PAGE.piedH;
    const slotW = (W - gapX * (cols - 1)) / cols;
    const slotH = (H - gapY * (rows - 1)) / rows;
    const board = Math.min(slotW, slotH - titreH);

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
    for (let i = 0; i < cases.length; i++) {
        const x = slot.x + (i % n) * cote, y = slot.y + Math.floor(i / n) * cote;
        const trou = trous.includes(i);
        doc.setDrawColor(...ENCRE.trait);
        doc.setLineWidth(0.35);
        if (!trou) {
            doc.setFillColor(...ENCRE.donnee);
            doc.rect(x, y, cote, cote, 'FD');
        } else {
            doc.rect(x, y, cote, cote, 'S');
        }
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

const RED_LIGNES = ['Je sais que', 'Or', 'Donc'];
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
    const figH = Math.min(boite.h * 0.40, boite.w * 0.34);
    const cx = boite.x + boite.w / 2;
    const cy = boite.y + figH / 2;
    const a = f.inclinaison * Math.PI / 180;
    const dx = Math.cos(a), dy = Math.sin(a);
    const nx = -dy, ny = dx;
    // LA FIGURE TIENT DANS SA BOÎTE, quelle que soit son inclinaison. Calculée
    // à taille fixe, elle débordait sur le bloc voisin dès qu'elle penchait :
    // « (d₁) » de la première figure se posait sur la deuxième. On calcule donc
    // l'encombrement réel — demi-longueur projetée sur chaque axe, plus la
    // place d'une étiquette — et on met le tout à l'échelle.
    const MARGE_NOM = 7;
    let L = boite.w * 0.34, e = figH * 0.26;
    const demiW = L * Math.abs(dx) + e * Math.abs(nx) + MARGE_NOM;
    const demiH = L * Math.abs(dy) + e * Math.abs(ny) + MARGE_NOM;
    const facteur = Math.min(
        (boite.w / 2 - 1) / demiW,
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
        x: Math.min(boite.x + boite.w - 4.5, Math.max(boite.x + 4.5, x)),
        y: Math.min(boite.y + figH - 0.5, Math.max(boite.y + 3.2, y))
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
        pas: (boite.h - figH - 6) / RED_TOTAL,
        ligneY: (i) => boite.y + figH + 5 + RED_DEBUT[i] * ((boite.h - figH - 6) / RED_TOTAL),
        railsY: (i) => {
            const pas = (boite.h - figH - 6) / RED_TOTAL;
            const y0 = boite.y + figH + 5;
            return Array.from({ length: RED_ECRITURE[i] - 1 },
                (_, j) => y0 + (RED_DEBUT[i] + j + 1) * pas);
        },
        ligneH: (boite.h - figH - 6) / RED_TOTAL
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
                style="left:${(b.x + 4) * k}px;
                top:${(yr + 0.8) * k}px; width:${(b.w - 4) * k}px"></div>`).join('');
        // `y` est la LIGNE DE BASE du texte dans le PDF ; en HTML, `top` est le
        // haut de la boîte. Sans ce décalage, l'aperçu descendait chaque
        // étiquette d'une hauteur de police et les écarts semblaient irréguliers.
        return `<div class="fx-red-ligne" style="left:${b.x * k}px; top:${(y - 2.5) * k}px;
            width:${b.w * k}px; height:${haut * k}px; font-size:${3.2 * k}px">
            <b>${et} :</b> <span class="${solution ? 'fx-red-sol' : 'fx-red-vide'}">${rempli || ''}</span></div>${rails}`;
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
        doc.setTextColor(30, 41, 59);
        const chapeau = `${et} : `;
        doc.text(chapeau, b.x, y);
        const x0 = b.x + doc.getTextWidth(chapeau);
        doc.setFont('helvetica', 'normal');
        if (solution) {
            doc.setFontSize(8.2);
            doc.setTextColor(60, 70, 88);
            const mots = doc.splitTextToSize(pourPdf(lignes[i].texte), b.x + b.w - x0);
            mots.slice(0, 2).forEach((ligne, j) => doc.text(ligne, x0, y + j * 3.6));
        } else {
            doc.setDrawColor(168, 176, 191);
            doc.setLineWidth(0.25);
            doc.setLineDashPattern([0.7, 1.1], 0);
            doc.line(x0, y + 0.8, b.x + b.w, y + 0.8);
            g.railsY(i).forEach(yr => doc.line(b.x + 4, yr + 0.8, b.x + b.w, yr + 0.8));
            // Rédiger au clavier : un champ par ligne d'écriture, posé sur son
            // trait. Sans eux, la fiche remplissable s'arrête avant la seule
            // chose qu'on demande vraiment d'écrire ici.
            if (champ) {
                const h = g.ligneH * 0.8;
                champ(x0, y + 0.8 - h, b.x + b.w - x0, h);
                g.railsY(i).forEach(yr => champ(b.x + 4, yr + 0.8 - h, b.x + b.w - 4 - 4, h));
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
    // Un écart entre les deux cartes : on passe les ciseaux entre elles, et un
    // trait unique partagé ferait deux cartes collées d'un demi-millimètre.
    const ecart = 3;
    const w = (b.w - ecart) / 2;
    // UNE CARTE À JOUER EST PLUS HAUTE QUE LARGE, mais jamais plus haute que son
    // bloc : au-delà, deux rangées se chevaucheraient.
    const h = Math.min(b.h, w * 1.35);
    // LE CORPS SUIT LE PLUS LONG DES DEUX LIBELLÉS. « 10 × 10 » et « 16 » ne
    // font pas la même longueur, et un corps calculé sur la carte laissait le
    // calcul toucher les deux bords pendant que le résultat flottait au milieu.
    const m = (item && item.meta) || {};
    const large = (t) => [...String(t || '')]
        .reduce((n, c) => n + (c === ' ' ? 0.3 : 0.62), 0);
    const pire = Math.max(1.6, large(m.calcul), large(m.resultat));
    const corps = Math.min(h * 0.3, (w - 4) / pire);
    return { b, w, h, ecart, corps, y: b.y + (b.h - h) / 2 };
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
            doc.roundedRect(x, g.y, g.w, g.h, 1.6, 1.6, 'F');
        }
        if (doc.setLineDashPattern) doc.setLineDashPattern([1.2, 1], 0);
        doc.roundedRect(x, g.y, g.w, g.h, 1.6, 1.6, 'S');
        if (doc.setLineDashPattern) doc.setLineDashPattern([], 0);

        if (solution) {
            doc.setDrawColor(...ENCRE.grille);
            doc.setLineWidth(0.4);
            doc.roundedRect(x + g.w * 0.12, g.y + g.h * 0.12, g.w * 0.76, g.h * 0.76, 1.2, 1.2, 'S');
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
function cadrerTangram(poly, b, marge) {
    const bb = boiteTangram(poly);
    const w = bb.x1 - bb.x0, h = bb.y1 - bb.y0;
    const e = Math.min((b.w - 2 * marge) / w, (b.h - 2 * marge) / h);
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
    const g = cadrerTangram(ref, decouper ? b : { ...b, h: b.h - 5 }, 2);
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

function dessinerTangramPdf(doc, item, slot, solution) {
    const m = item.meta;
    const b = slot.boite || { x: slot.x, y: slot.y, w: slot.taille, h: slot.taille };
    const couleur = polycopieEnCouleur();
    const decouper = m.quoi === 'decouper';
    const ref = decouper ? m.pieces.flatMap(p => p.sommets) : m.silhouette;
    const g = cadrerTangram(ref, decouper ? b : { ...b, h: b.h - 5 }, 2);
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

const AMORCES = [
    { mot: 'Je sais que', lignes: 2 },
    { mot: 'Or', lignes: 2 },
    { mot: 'Donc', lignes: 4 }
];

/** L'énoncé en toutes lettres, tel que le générateur l'écrit pour le papier. */
const enoncePythagore = (item) =>
    (item.prompt && (item.prompt.papier || item.prompt.text)) || '';

function geoPythagoreFiche(item, slot) {
    const b = slot.boite || { x: slot.x, y: slot.y, w: slot.taille, h: slot.taille };
    const schema = item.meta.presentation === 'schema';
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
    return {
        b, schema, gaucheW, corps, pas,
        figX: b.x + gaucheMarge, figY: b.y + corps * 0.9,
        figW: Math.max(6, gaucheW - gaucheMarge - corps * 1.6),
        figH: Math.max(6, b.h - corps * 0.9 - basMarge),
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
    html += `<div class="fx-py-enonce" style="left:${T(b.x)}px;
        top:${T(g.schema ? g.questionY - g.corps : b.y)}px;
        width:${T(g.gaucheW)}px; font-size:${T(g.corps)}px">${echapperSheet(
        g.schema ? `Calcule ${item.meta.chercher || cotesDePythagore(item.meta.triangle).hypo.nom}.`
            : enoncePythagore(item))}</div>`;

    // À droite : les trois amorces et leurs lignes.
    const rempli = solution ? redactionPapier(item) : null;
    let y = b.y;
    AMORCES.forEach((a, iA) => {
        html += `<div class="fx-py-amorce" style="left:${T(g.droiteX)}px; top:${T(y)}px;
            font-size:${T(g.corps)}px">${a.mot}</div>`;
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
 * La rédaction découpée en lignes, une par ligne imprimée. C'est le même texte
 * que `redactionComplete`, mais réparti sur les trois zones de la feuille — et
 * le « Donc » y déroule le calcul étape par étape, comme au cahier.
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
        ['dans un triangle rectangle, le carré de l\'hypoténuse',
            'est égal à la somme des carrés des deux autres côtés.'],
        [...calc.lignes.map(ligneEnTextePythagore),
            `${calc.cherche} = ${calc.resultat} cm.`]
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
        doc.setTextColor(...ENCRE.gris);
        doc.setFontSize(g.corps / 0.3528);
        doc.text(pourPdf(a.mot), g.droiteX, y + g.corps);
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
        m.points.forEach(pt => {
            // UNE CROIX DÉSIGNE UN POINT, elle ne le recouvre pas. À un quart
            // de carreau ses branches mordaient sur les cases voisines ; à un
            // sixième, elle marque le croisement sans le cacher — c'est ce
            // qu'on trace au tableau, et c'est ce que Rémy demande.
            const r = g.pas * 0.11;
            html += `<div class="fx-rp-croix" style="left:${(g.px(pt.x) - r) * k}px;
                top:${(g.py(pt.y) - r) * k}px; width:${2 * r * k}px; height:${2 * r * k}px"></div>`;
            html += `<div class="fx-rp-etiq" style="left:${(g.px(pt.x) + r * 0.9) * k}px;
                top:${(g.py(pt.y) - r * 2.6) * k}px; font-size:${g.pas * 0.5 * k}px">${pt.label}</div>`;
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
        const dedans = m.mode === 'placer'
            ? `<b>${p.label} (${p.x} ; ${p.y})</b>`
            : `<span class="fx-rp-rep"><b>${p.label} (</b><span class="fx-rp-trou"
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
        doc.setDrawColor(...ENCRE.trait);
        doc.setLineWidth(0.45);
        doc.setTextColor(...ENCRE.trait);
        m.points.forEach(pt => {
            const r = g.pas * 0.11, x = g.px(pt.x), y = g.py(pt.y);
            doc.line(x - r, y - r, x + r, y + r);
            doc.line(x - r, y + r, x + r, y - r);
            doc.setFontSize(Math.max(5, g.pas * 1.2));
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
        if (m.mode === 'placer' || solution) {
            doc.text(pourPdf(`${p.label} (${p.x} ; ${p.y})`), cx, y, { align: 'center' });
            return;
        }
        const fixe = doc.getTextWidth(pourPdf(`${p.label} (  ;  )`));
        const unPoint = Math.max(0.4, doc.getTextWidth('.'));
        const combien = Math.max(3, Math.floor((larg - 2 - fixe) / (2 * unPoint)));
        const trou = '.'.repeat(combien);
        doc.text(pourPdf(`${p.label} ( ${trou} ; ${trou} )`), cx, y, { align: 'center' });
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
    let d = '';

    // Le boîtier, les soixante graduations, et la couronne des minutes.
    d += `<circle cx="${T(g.cx)}" cy="${T(g.cy)}" r="${T(g.r)}" fill="#fff" stroke="#1a202c" stroke-width="${T(g.r * 0.045)}"/>`;
    for (let i = 0; i < 60; i++) {
        const ang = i / 60 * Math.PI * 2 - Math.PI / 2;
        const gros = i % 5 === 0;
        const r2 = g.r * 0.94, r1 = r2 - g.r * (gros ? 0.085 : 0.045);
        d += `<line x1="${T(g.cx + Math.cos(ang) * r1)}" y1="${T(g.cy + Math.sin(ang) * r1)}"
              x2="${T(g.cx + Math.cos(ang) * r2)}" y2="${T(g.cy + Math.sin(ang) * r2)}"
              stroke="${gros ? '#1a202c' : '#94a3b8'}" stroke-width="${T(g.r * (gros ? 0.035 : 0.014))}"/>`;
    }
    for (let n = 1; n <= 12; n++) {
        const ang = n / 12 * Math.PI * 2 - Math.PI / 2;
        const rr = g.r * (m.reperes ? 0.55 : 0.74);
        d += `<text x="${T(g.cx + Math.cos(ang) * rr)}" y="${T(g.cy + Math.sin(ang) * rr)}"
              text-anchor="middle" dominant-baseline="central"
              font-size="${T(g.r * 0.24)}" font-weight="700" fill="#1a202c">${n}</text>`;
    }
    if (m.reperes) {
        for (let n = 0; n < 12; n++) {
            const ang = n / 12 * Math.PI * 2 - Math.PI / 2;
            const rr = g.r * 0.78;
            d += `<text x="${T(g.cx + Math.cos(ang) * rr)}" y="${T(g.cy + Math.sin(ang) * rr)}"
                  text-anchor="middle" dominant-baseline="central"
                  font-size="${T(g.r * 0.155)}" font-weight="700" fill="#8a93a5">${n * 5}</text>`;
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
              stroke="#1a202c" stroke-width="${T(g.r * 0.055)}" stroke-linecap="round"/>`;
        d += `<line x1="${T(g.cx)}" y1="${T(g.cy)}" x2="${T(gm.x)}" y2="${T(gm.y)}"
              stroke="#1a202c" stroke-width="${T(g.r * 0.036)}" stroke-linecap="round"/>`;
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

function dessinerHorlogePdf(doc, item, slot, solution) {
    const g = geoHorloge(item, slot);
    const m = item.meta;
    const tracer = m.mode === 'lire' || solution;
    const a = horlogeAngles(m);

    doc.setDrawColor(...ENCRE.trait);
    doc.setFillColor(255, 255, 255);
    doc.setLineWidth(Math.max(0.35, g.r * 0.045));
    doc.circle(g.cx, g.cy, g.r, 'FD');

    for (let i = 0; i < 60; i++) {
        const ang = i / 60 * Math.PI * 2 - Math.PI / 2;
        const gros = i % 5 === 0;
        const r2 = g.r * 0.94, r1 = r2 - g.r * (gros ? 0.085 : 0.045);
        doc.setDrawColor(...(gros ? ENCRE.trait : ENCRE.gris));
        doc.setLineWidth(Math.max(0.12, g.r * (gros ? 0.035 : 0.014)));
        doc.line(g.cx + Math.cos(ang) * r1, g.cy + Math.sin(ang) * r1,
            g.cx + Math.cos(ang) * r2, g.cy + Math.sin(ang) * r2);
    }
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...ENCRE.texte);
    doc.setFontSize(Math.max(5, g.r * 0.24 * 2.6));
    for (let n = 1; n <= 12; n++) {
        const ang = n / 12 * Math.PI * 2 - Math.PI / 2;
        const rr = g.r * (m.reperes ? 0.55 : 0.74);
        doc.text(String(n), g.cx + Math.cos(ang) * rr, g.cy + Math.sin(ang) * rr + g.r * 0.08,
            { align: 'center' });
    }
    if (m.reperes) {
        doc.setFontSize(Math.max(4, g.r * 0.155 * 2.6));
        doc.setTextColor(...ENCRE.gris);
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
        doc.setDrawColor(...ENCRE.trait);
        // LE BOUT ARRONDI, dans le PDF aussi. L'aperçu arrondissait, la feuille
        // coupait net : deux dessins pour la même pendule, et c'est la feuille
        // qu'on donne aux élèves.
        if (doc.setLineCap) doc.setLineCap('round');
        doc.setLineWidth(Math.max(0.45, g.r * 0.055));
        doc.line(g.cx, g.cy, gh.x, gh.y);
        doc.setLineWidth(Math.max(0.28, g.r * 0.036));
        doc.line(g.cx, g.cy, gm.x, gm.y);
        if (doc.setLineCap) doc.setLineCap('butt');
    }
    doc.setFillColor(...ENCRE.trait);
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

function geoAngle(item, slot) {
    const ligneH = slot.taille * 0.16;
    const cote = slot.taille - ligneH;
    // LE SOMMET EST EN BAS AU MILIEU, et le côté d'origine PRESQUE horizontal.
    //
    // Posé à gauche et incliné n'importe comment, le demi-cercle du rapporteur
    // sortait du bloc et venait écrire ses graduations sur le voisin. Le
    // rapporteur occupe les deux côtés du sommet : il lui faut donc la moitié
    // de la largeur de chaque côté, et le sommet ne peut être qu'au centre.
    // L'inclinaison résiduelle (±25°) suffit à empêcher la lecture directe sans
    // faire déborder l'arc sous la ligne de réponse.
    const r = Math.min(cote * 0.78, slot.taille * 0.42);
    return {
        cote, ligneH, r,
        sx: slot.x + slot.taille / 2,
        sy: slot.y + cote * 0.82,
        x0: slot.x, ligneY: slot.y + cote
    };
}

/** Les deux côtés de l'angle, en coordonnées absolues. */
function cotesAngle(g, m) {
    // L'inclinaison du côté d'origine, ramenée dans ±25° sans perdre la
    // variété : deux angles voisins ne se dessinent pas pareil.
    const penche = (((m.baseDeg % 50) + 50) % 50) - 25;
    const a0 = -penche * Math.PI / 180;
    const a1 = -(penche + m.target) * Math.PI / 180;
    return {
        a0, a1,
        b: { x: g.sx + Math.cos(a0) * g.r, y: g.sy + Math.sin(a0) * g.r },
        r: { x: g.sx + Math.cos(a1) * g.r, y: g.sy + Math.sin(a1) * g.r }
    };
}

function anglePreviewHtml(item, slot, k, solution) {
    const g = geoAngle(item, slot);
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
             width:${slot.taille * k}px; height:${g.ligneH * k}px;
             font-size:${g.ligneH * 0.42 * k}px">${echapperSheet(ligne)}</div>`;
}

function dessinerAnglePdf(doc, item, slot, solution) {
    const g = geoAngle(item, slot);
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
    doc.text(pourPdf(ligne), slot.x + slot.taille / 2, g.ligneY + g.ligneH * 0.7, { align: 'center' });
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

function geoRectangle(item, slot) {
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
    const coteH = Math.min(zone * 0.26, 6);
    const dispoW = Math.max(6, b.w - coteW - 2);
    const dispoH = Math.max(6, zone - coteH - 1);
    // L'ÉCHELLE EST CELLE DE LA FICHE, PAS CELLE DU RECTANGLE. On la calcule
    // sur la plus grande dimension permise (meta.max), jamais sur les côtés de
    // cette figure-ci : sinon un 4 cm et un 10 cm seraient dessinés de la même
    // longueur, ce qui est faux — et sur une fiche de géométrie, c'est le
    // dessin qui ment en premier. Le facteur 0,7 est la largeur maximale que
    // le générateur s'autorise, il borne donc la hauteur.
    const grand = Math.max(m.max || m.L, m.L);
    const ech = Math.min(dispoW / grand, dispoH / (grand * 0.7));
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

function rectanglePreviewHtml(item, slot, k, solution, rang) {
    const g = geoRectangle(item, slot);
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
             stroke-width="${T(remplit ? 0.5 : 0.8)}"/>`;
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

function dessinerRectanglePdf(doc, item, slot, solution, champ, rang) {
    const g = geoRectangle(item, slot);
    const m = g.m;
    const couleur = polycopieEnCouleur();
    const t = teinteFigure(rang);
    const remplit = m.demande.includes('aire');

    if (couleur) {
        doc.setDrawColor(...t.trait);
        doc.setFillColor(...t.fond);
        doc.setLineWidth(remplit ? 0.5 : 0.8);
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
const BLOC_SCRATCH = {
    mouvement: { fond: [76, 151, 255], bord: [60, 120, 210], encre: [255, 255, 255] },
    controle: { fond: [255, 171, 25], bord: [207, 139, 23], encre: [40, 30, 0] }
};

/**
 * LA SILHOUETTE D'UN BLOC SCRATCH : LE CRAN.
 *
 * C'est lui qu'on reconnaît — la bosse du bas qui s'emboîte dans le creux du
 * bloc suivant. Un rectangle arrondi coloré n'est pas un bloc : il ne dit pas
 * que les briques s'accrochent, et c'est précisément ce que l'élève voit à
 * l'écran. Rémy : « de vrais blocs Scratch pour le PDF ».
 */
const cranScratch = (h) => ({ d: h * 0.17, debut: h * 0.42, large: h * 0.85 });

/** Le contour d'un bloc simple, du coin haut-gauche, dans le sens horaire. */
function contourBloc(x, y, w, h) {
    const c = cranScratch(h);
    const s = x + c.debut, f = s + c.large;
    return [
        [x, y], [s, y], [s + c.d, y + c.d], [f - c.d, y + c.d], [f, y], [x + w, y],
        [x + w, y + h], [f, y + h], [f - c.d, y + h + c.d], [s + c.d, y + h + c.d],
        [s, y + h], [x, y + h]
    ];
}

/**
 * Le contour d'un bloc en C — l'anse du haut, le dos, et le bras du bas — en
 * UN SEUL tracé. Dessiné en trois morceaux séparés, le « répéter » laissait des
 * coutures blanches entre son dos et ses bras : on voyait trois rectangles, pas
 * une brique qui enveloppe.
 */
function contourC(x, y, w, h, creux, bras, dos) {
    const c = cranScratch(h);
    const s = x + c.debut, f = s + c.large;
    const si = x + dos + c.debut, fi = si + c.large;      // le cran intérieur
    const yb = y + h + creux;                             // le haut du bras
    const yf = yb + bras;                                 // le bas du bras
    const wBras = Math.max(dos + c.large + c.debut * 2, w * 0.58);
    return [
        [x, y], [s, y], [s + c.d, y + c.d], [f - c.d, y + c.d], [f, y], [x + w, y],
        [x + w, y + h], [fi, y + h], [fi - c.d, y + h + c.d], [si + c.d, y + h + c.d],
        [si, y + h], [x + dos, y + h],
        [x + dos, yb], [x + wBras, yb], [x + wBras, yf],
        [f, yf], [f - c.d, yf + c.d], [s + c.d, yf + c.d], [s, yf], [x, yf]
    ];
}

/** Un polygone fermé dans le PDF, à partir de points absolus en millimètres. */
function tracerPolygone(doc, pts, style) {
    const suite = pts.slice(1).map((p, i) => [p[0] - pts[i][0], p[1] - pts[i][1]]);
    doc.lines(suite, pts[0][0], pts[0][1], [1, 1], style, true);
}

/** La géométrie de la pile de blocs : un bloc par ligne, indenté sous son C. */
function geoBlocsChat(g) {
    const lignes = g.m.lignes;
    // La pile occupe la hauteur du quadrillage : c'est ce qui la rend lisible
    // sans déborder, quel que soit le nombre de blocs.
    const pas = Math.min(g.cote / Math.max(lignes.length + 1, 5), 7.5);
    const h = pas * 0.82;                 // le bloc, l'écart entre deux déduit
    const retrait = Math.min(pas * 0.55, 3);
    return {
        lignes, pas, h, retrait,
        taille: Math.max(1.5, Math.min(h * 0.5, 3.1)),   // la police, en mm
        x: g.b.x,
        y: g.y0,
        largeur: g.progW
    };
}

/** Un point du chat (en pas) vers le papier (en millimètres). */
function pointChat(g, p) {
    return {
        x: g.x0 + g.cote / 2 + (p.x / 10) * g.pas,
        // L'axe du chat monte, celui du papier descend : on retourne.
        y: g.y0 + g.cote / 2 - (p.y / 10) * g.pas
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

    // LE PROGRAMME, EN BLOCS. Un bloc par ligne, empilés avec leur cran, et le
    // « répéter » les enveloppe dans un C — comme dans le logiciel.
    const bl = geoBlocsChat(g);
    let textes = '';
    bl.lignes.forEach((l, i) => {
        const c = BLOC_SCRATCH[l.genre] || BLOC_SCRATCH.mouvement;
        const x = bl.x + l.creux * bl.retrait;
        const y = bl.y + i * bl.pas;
        const fond = `rgb(${c.fond.join(',')})`;
        const bord = `rgb(${c.bord.join(',')})`;
        // La barre du bas d'un C est dessinée AVEC son C : rien à faire ici.
        if (l.fin) return;
        const w = bl.largeur - l.creux * bl.retrait;
        const pts = (l.genre === 'controle')
            ? (() => {
                const j = bl.lignes.findIndex((z, n) => n > i && z.fin && z.creux === l.creux);
                const yFin = bl.y + (j < 0 ? bl.lignes.length : j) * bl.pas;
                return contourC(x, y, w, bl.h, yFin - y - bl.h, bl.h * 0.62, bl.retrait);
            })()
            : contourBloc(x, y, w, bl.h);
        d += `<polygon points="${pts.map(p => `${T(p[0])},${T(p[1])}`).join(' ')}"
            fill="${fond}" stroke="${bord}" stroke-width="${T(0.18)}" stroke-linejoin="round"/>`;
        textes += `<div class="fx-ch-bloc" style="left:${x * k}px; top:${y * k}px;
            width:${w * k}px; height:${bl.h * k}px; color:rgb(${c.encre.join(',')});
            font-size:${bl.taille * k}px">${echapperSheet(l.texte)}</div>`;
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

    // LE PROGRAMME, EN BLOCS — les mêmes qu'à l'écran, et les mêmes que dans
    // le logiciel : c'est tout l'intérêt.
    const bl = geoBlocsChat(g);
    bl.lignes.forEach((l, i) => {
        const c = BLOC_SCRATCH[l.genre] || BLOC_SCRATCH.mouvement;
        const x = bl.x + l.creux * bl.retrait;
        const y = bl.y + i * bl.pas;
        doc.setFillColor(...c.fond);
        doc.setDrawColor(...c.bord);
        doc.setLineWidth(0.18);
        if (l.fin) return;               // la barre du bas est tracée avec son C
        const w = bl.largeur - l.creux * bl.retrait;
        if (l.genre === 'controle') {
            const j = bl.lignes.findIndex((z, n) => n > i && z.fin && z.creux === l.creux);
            const yFin = bl.y + (j < 0 ? bl.lignes.length : j) * bl.pas;
            tracerPolygone(doc, contourC(x, y, w, bl.h, yFin - y - bl.h, bl.h * 0.62, bl.retrait), 'FD');
        } else {
            tracerPolygone(doc, contourBloc(x, y, w, bl.h), 'FD');
        }
        doc.setFont('helvetica', 'bold');
        // 1 pt ≈ 0,3528 mm : la police du bloc est donnée en millimètres, comme
        // sa hauteur, pour que l'aperçu et la feuille soient identiques.
        doc.setFontSize(bl.taille / 0.3528);
        doc.setTextColor(...c.encre);
        doc.text(pourPdf(l.texte), x + 1.4, y + bl.h * 0.68);
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
    const listeW = seulsMots
        ? Math.max(34, Math.min(b.w * 0.20, 58))
        : Math.max(58, Math.min(b.w * 0.42, 118));

    // DEUX DISPOSITIONS, ET ON GARDE CELLE QUI DONNE LA PLUS GRANDE GRILLE.
    //
    // Toujours à côté, le bloc d'une fiche composée — presque carré — donnait
    // une grille bornée par sa largeur amputée de la colonne de mots, avec
    // quatre centimètres de blanc au-dessus ET au-dessous. C'est exactement ce
    // qu'on voyait : une grille perdue au milieu de sa page.
    const coteA = Math.max(10, Math.min(b.w - listeW - 8, b.h));
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
    const taille = seulsMots ? 11.5 : 8.5;
    // LE NOMBRE DE COLONNES SUIT LE MOT LE PLUS LONG, pas un chiffre décidé
    // d'avance. Trois colonnes fixes convenaient à « ANGLE » et « SOMME » ;
    // « DENOMINATEUR » débordait sur sa voisine et les deux devenaient
    // illisibles — juste à l'endroit qu'on relit à chaque lettre trouvée.
    const plusLong = Math.max(...indicesMots(m).map(l => l.length), 1);
    const largeurMot = plusLong * taille * 0.3528 * 0.62 + 4;
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
    // perdent pas non plus dedans. Neuf millimètres, c'est l'interligne d'un
    // cahier de collège : au-delà on n'écrit plus une cascade, on écrit dans
    // le vide, et l'œil ne relie plus une ligne à la suivante.
    const ligneH = Math.min(b.h / (rangs + 0.3), 9);
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
    return (t.etapes || []).filter(e => e.ecrit);
}

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
        nCol = String(m.operandes[0]).length + 1;
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
    const colonnesTotales = op === '÷' ? nCol + String(m.operandes[1]).length + 1 : nCol + 1.2;
    const cw = Math.max(3.2, Math.min(large / colonnesTotales, b.h / (rangs + 0.6), 7));
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
const chiffresDroiteGauche = (v) => String(v).split('').reverse();

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

    if (op === '+' || op === '-') {
        // Les retenues : au-DESSUS pour l'addition, au-dessous du chiffre du
        // bas pour la soustraction — ce n'est pas un détail de présentation,
        // c'est la méthode française de compensation.
        m.operandes.forEach((v, i) => {
            chiffresDroiteGauche(v).forEach((d, c) => pose(c, 1 + i, d));
        });
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
        if (solution) {
            chiffresDroiteGauche(t.resultat).forEach((d, c) => pose(c, m.operandes.length + 1, d, { reponse: true }));
        }
        return { cases, traits, cercles };
    }

    if (op === '×') {
        const [a, b] = m.operandes;
        chiffresDroiteGauche(a).forEach((d, c) => pose(c, 1, d));
        chiffresDroiteGauche(b).forEach((d, c) => pose(c, 2, d));
        pose(g.nCol, 2, '×', { signe: true });
        traits.push({ x1: g.colX(g.nCol - 0.2), x2: g.droite, y: g.ligneY(3) - rh * 0.12, epais: true });
        t.lignes.forEach((l, i) => {
            if (!solution) return;
            const valeur = l.chiffre * Number(String(t.entiers[0]));
            chiffresDroiteGauche(valeur).forEach((d, c) => pose(c + l.decalage, 3 + i, d, { reponse: true }));
        });
        if (t.sommeAPoser) {
            const yT = g.ligneY(3 + t.lignes.length) - rh * 0.12;
            traits.push({ x1: g.colX(g.nCol - 0.2), x2: g.droite, y: yT, epais: true });
            pose(g.nCol, 3 + t.lignes.length - 1, '+', { signe: true });
            if (solution) {
                chiffresDroiteGauche(t.produitEntier)
                    .forEach((d, c) => pose(c, 3 + t.lignes.length, d, { reponse: true }));
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
    chiffresDroiteGauche(dividende).forEach((d, c) => pose(c + 1, 0, d));
    const xBarre = g.droite + cw * 0.1;
    traits.push({ x1: xBarre, x2: xBarre, y: g.ligneY(0) + rh * 0.1, y2: g.ligneY(g.rangs) - rh * 0.2, vertical: true });
    String(diviseur).split('').forEach((d, i) => {
        cases.push({ x: xBarre + (i + 0.6) * cw, y: g.ligneY(0) + rh * 0.5, texte: d });
    });
    const largeurDiv = String(diviseur).length;
    traits.push({
        x1: xBarre, x2: xBarre + (largeurDiv + 0.4) * cw,
        y: g.ligneY(1) - rh * 0.12, epais: true
    });
    if (solution) {
        String(t.quotient).split('').forEach((d, i) => {
            cases.push({
                x: xBarre + (i + 0.6) * cw, y: g.ligneY(1) + rh * 0.5,
                texte: d, reponse: true
            });
        });
    }
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
            // La colonne du rang e.rang : les chiffres du dividende sont posés
            // décalés d'une colonne, le produit s'y aligne donc aussi.
            const col0 = e.rang + 1;
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
        doc.text(pourPdf(c.texte), c.x, c.y + g.taille * 0.35, { align: 'center' });
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
    const enonceW = avecTableau
        ? Math.min(Math.max(b.w * 0.34, 40), 56)
        : b.w;
    // DES CASES MOINS LARGES. À quinze millimètres, sept colonnes mangeaient
    // toute la feuille pour y écrire un chiffre — et il ne tenait plus qu'un
    // tableau par rangée. À onze, trois tableaux passent de front.
    const cw = avecTableau ? Math.min((b.w - enonceW - 2) / nCol, 11) : 0;
    // Une rangée d'en-tête, puis une par conversion. Une case de tableau de
    // conversion doit accueillir un chiffre écrit à la main : sept
    // millimètres, c'est l'interligne d'un cahier.
    const rh = Math.max(6.5, Math.min((b.h - 2) / (nLignes + 1.2), 9.5));
    const x0 = b.x + enonceW;
    const y0 = b.y + 1;
    const taille = Math.max(7.5, Math.min(rh * 1.15, 12));
    // L'ÉNONCÉ NE DÉBORDE PAS SUR LE TABLEAU. Ses points de suspension sont des
    // caractères PLEINE CHASSE — huit d'entre eux valent huit lettres larges —,
    // et « 248 dam = ……………… km » venait s'écrire par-dessus la première colonne
    // dès qu'on a resserré le tableau. On mesure la pire ligne et l'on ajuste.
    const largeurEm = (t) => [...String(t)].reduce(
        (s, ch) => s + (ch === '…' ? 1 : (/[\s.,]/.test(ch) ? 0.3 : 0.56)), 0);
    const pire = Math.max(1, ...m.conversions.map(c => largeurEm(c.enonce)));
    return {
        m, b, nCol, nLignes, cw, rh, x0, y0, enonceW, avecTableau, taille,
        largeur: nCol * cw,
        // En POINTS, comme tout ce qui va dans le PDF ; l'aperçu convertit.
        tailleEnonce: Math.max(5, Math.min(taille * 0.92, (enonceW - 3) / 0.3528 / pire)),
        // « dam » est le plus large des en-têtes : c'est lui qui fixe leur
        // corps, sans quoi il déborde de sa case dès qu'on resserre le tableau.
        tailleEntete: Math.max(5, Math.min(rh * 1.15, 12, (cw - 0.8) / 0.6))
    };
}

function conversionPreviewHtml(item, slot, k, solution) {
    const g = geoConversion(item, slot);
    const m = g.m;
    let html = '';
    if (g.avecTableau) {
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
        const y = g.y0 + (r + 1) * g.rh;
        html += `<div style="position:absolute; left:${g.b.x * k}px; top:${y * k}px;
            width:${(g.enonceW - 2) * k}px; height:${g.rh * k}px; display:flex;
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
        const y = g.y0 + (r + 1) * g.rh;
        doc.setFontSize(g.tailleEnonce);
        doc.setTextColor(...ENCRE.trait);
        doc.text(pourPdf(solution ? cv.complet : cv.enonce), g.b.x, y + g.rh * 0.68);
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
    const ligneH = Math.max(5.5, Math.min((b.y + b.h - yLignes - 1) / m.lignes, 8));
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
function geoEgypte(item, slot) {
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
    const cell = Math.min(b.w / (plan.largeur + 0.3), hDispo / (hautCases + 0.3), 16);
    return {
        m, b, plan, cell, interligne: INTERLIGNE,
        rangs: plan.lignes, colonnes: plan.largeur,
        x0: b.x + 1,
        y0: b.y + 1,
        yReponse: b.y + 2 + hautCases * cell,
        // Les glyphes sont dessinés dans une case de 24 × 32.
        k: cell / 32
    };
}

function egyptePreviewHtml(item, slot, k, solution) {
    const g = geoEgypte(item, slot);
    const m = g.m;
    let html = '';
    if (m.sens === 'lire' || solution) {
        // L'aperçu est du HTML : le SVG des glyphes s'y pose tel quel.
        html += `<div style="position:absolute; left:${g.x0 * k}px; top:${g.y0 * k}px;
            width:${(g.colonnes * g.cell) * k}px; height:${(g.rangs * g.cell) * k}px;
            color:#1a202c">${egyptianSvg(m.symboles.map(s => ({ value: s.value, n: s.n })))
        .replace('<svg ', `<svg style="width:100%;height:100%" preserveAspectRatio="xMinYMin meet" `)}</div>`;
    }
    const bas = m.sens === 'lire'
        ? (solution ? String(m.total) : '')
        : String(m.total);
    html += `<div style="position:absolute; left:${g.b.x * k}px; top:${g.yReponse * k}px;
        width:${g.b.w * k}px; height:${6 * k}px; display:flex; align-items:center;
        ${m.sens === 'lire' ? 'justify-content:flex-start' : 'justify-content:center'};
        border-top:1px dotted #9aa3b2; font-weight:800;
        color:${solution && m.sens === 'lire' ? '#6e7684' : '#1a202c'};
        font-size:${4.2 * k}px">${echapperSheet(bas)}</div>`;
    return html;
}

function dessinerEgyptePdf(doc, item, slot, solution) {
    const g = geoEgypte(item, slot);
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
    doc.line(g.b.x, g.yReponse, g.b.x + g.b.w, g.yReponse);
    const bas = m.sens === 'lire' ? (solution ? String(m.total) : '') : String(m.total);
    if (!bas) return;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...(solution && m.sens === 'lire' ? ENCRE.gris : ENCRE.trait));
    doc.text(bas, m.sens === 'lire' ? g.b.x + 2 : g.b.x + g.b.w / 2, g.yReponse + 5,
        { align: m.sens === 'lire' ? 'left' : 'center' });
    doc.setTextColor(...ENCRE.trait);
}

export const RENDUS = {
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
        disposition: { cols: 2, rows: 4, maxCols: 3, maxRows: 6 },
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
            const donnes = items.every(i => i.meta && i.meta.entetes);
            return (donnes
                ? 'Le tableau est prêt : ses unités sont écrites. '
                : 'Écris d\'abord les unités en haut des colonnes — attention, hecto vient avant déca. ')
                + 'Pour chaque conversion, écris le nombre de départ dans le tableau — le '
                + 'chiffre des unités dans la colonne de SON unité — puis pose la virgule '
                + 'après la colonne demandée, comble les cases vides avec des zéros, et '
                + 'lis la réponse.';
        },
        previewGrille: conversionPreviewHtml,
        pdfGrille: dessinerConversionPdf,
        nomBloc: 'Tableau', nomBlocs: 'tableaux',
        titreAGauche: true,
        // TROIS TABLEAUX DE FRONT. À quinze millimètres de case, il n'en tenait
        // qu'un par rangée et la moitié droite de la feuille restait blanche ;
        // les cases resserrées, trois passent — et chacun porte huit
        // conversions, ce qui fait une vraie séance sur une seule feuille.
        proportions: { w: 1, h: 0.72 },
        disposition: { cols: 3, rows: 1, maxCols: 3, maxRows: 3 },
        parLigneDefaut: 3,
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
        nomBloc: 'Calcul', nomBlocs: 'calculs',
        titreAGauche: true,
        // LE NUMÉRO EST POSÉ PAR LE BLOC LUI-MÊME, sur la ligne du calcul :
        // « 1.  2 × 6 + 7 − 2 », comme dans un cahier. Écrit au-dessus par la
        // mise en page, il coûtait une ligne entière pour trois caractères.
        numeroInterne: true,
        // ET LE BLOC EST BAS. Une cascade de trois étapes tient sur quatre
        // lignes de cahier : lui donner un carré de huit centimètres laissait
        // la moitié de sa hauteur en blanc.
        proportions: { w: 1, h: 0.46 },
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

    pythagore: {
        titre: 'Le théorème de Pythagore',
        consigne: () => 'Rédige comme au cahier : « Je sais que » les données de '
            + 'l\'énoncé, « Or » le théorème, « Donc » l\'égalité puis le calcul — '
            + 'et n\'oublie pas la dernière ligne, celle qui revient du carré à la '
            + 'longueur.',
        previewGrille: pythagorePreviewHtml,
        pdfGrille: dessinerPythagorePdf,
        nomBloc: 'Exercice', nomBlocs: 'exercices',
        // Un bloc LARGE et BAS : l'énoncé à gauche, les lignes à droite. Six par
        // page, ce qui est déjà beaucoup à rédiger pour une séance.
        proportions: { w: 1, h: 0.36 },
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
            <div class="fp-controles">
                <label>Colonnes
                    <span class="fp-pas">
                        <button type="button" class="fp-pas-btn" data-pas="-1" data-cible="fp-cols" aria-label="Une colonne de moins">−</button>
                        <input type="number" id="fp-cols" class="cfg-input cfg-input--num" min="1" max="5" value="3">
                        <button type="button" class="fp-pas-btn" data-pas="1" data-cible="fp-cols" aria-label="Une colonne de plus">+</button>
                    </span></label>
                <label>Lignes
                    <span class="fp-pas">
                        <button type="button" class="fp-pas-btn" data-pas="-1" data-cible="fp-rows" aria-label="Une ligne de moins">−</button>
                        <input type="number" id="fp-rows" class="cfg-input cfg-input--num" min="1" max="5" value="4">
                        <button type="button" class="fp-pas-btn" data-pas="1" data-cible="fp-rows" aria-label="Une ligne de plus">+</button>
                    </span></label>
                <span class="fp-total" id="fp-total"></span>
                <label>Format
                    <select id="fp-orientation" class="cfg-input">
                        <option value="paysage">A4 paysage</option>
                        <option value="portrait">A4 portrait</option>
                    </select></label>
                <label>Impression
                    <select id="fp-couleur" class="cfg-input">
                        <option value="0">Noir et blanc</option>
                        <option value="1">En couleur</option>
                    </select></label>
                <button type="button" class="btn-hint" id="fp-regen">🎲 Autres grilles</button>
                <button type="button" class="btn-hint" id="fp-atelier" style="display:none">♟ Composer mes échiquiers…</button>
                <button type="button" class="btn-hint" id="fp-voir-sol" aria-pressed="false">Voir les solutions</button>
            </div>
            <!-- LES RÉGLAGES DE L'EXERCICE, sur la fiche elle-même. Rémy :
                 « peut-on demander des sudokus autres que 6 × 6 pour les
                 PDF ? ». On le pouvait — mais seulement en ressortant de la
                 fiche pour aller régler l'exercice, puis en y revenant. La
                 feuille du parcours montrait déjà ces réglages ; la fiche d'un
                 exercice seul les ignorait. -->
            <div class="fp-contenu" id="fp-contenu" hidden></div>
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
        doc.setFontSize(8.6);
        doc.setTextColor(90, 98, 112);
        const lignes = doc.splitTextToSize(pourPdf(consigne), PAGE.w - PAGE.marge * 2);
        lignes.slice(0, 2).forEach((l, i) => doc.text(l, PAGE.marge, PAGE.marge + 11.6 + i * 3.4));
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
    const doc = new jsPDF({ orientation: ficheEnPortrait() ? 'portrait' : 'landscape', unit: 'mm', format: 'a4' });
    const { slots, traits } = calculerFiche(cols, rows);

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
            if (rendu.titreAGauche) doc.text(nom, slot.boite.x, slot.titre.y);
            else doc.text(nom, slot.titre.x, slot.titre.y, { align: 'center' });
            // Le RANG du bloc sur la feuille : certains rendus en tirent leur
            // couleur, pour que deux figures voisines ne soient pas jumelles.
            rendu.pdfGrille(doc, item, slot, solution, null, i);
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
                .then(m => m.ouvrirFicheQuestions(exo, { ...(params || {}), ...(exo.printParams || {}) },
                    chargerJsPDF, opts));
        }
        return;
    }
    if (!generator && !atelier) return;

    const modal = assurerModale();
    const apercu = modal.querySelector('#fp-apercu');
    const colsEl = modal.querySelector('#fp-cols');
    const rowsEl = modal.querySelector('#fp-rows');
    const totalEl = modal.querySelector('#fp-total');
    const btnSol = modal.querySelector('#fp-voir-sol');

    const reglages = { ...(params || {}), ...(exo.printParams || {}) };
    // Le titre imprimé. « L'échiquier, une grille à deux entrées » est le titre
    // de l'exercice de repérage ; une planche composée à la main n'est pas cet
    // exercice-là, et coiffer la feuille du professeur d'une consigne qu'il
    // n'a pas écrite serait la lui prendre.
    const titreFiche = (atelier && atelier.titre) || rendu.titre;
    let items = [];
    let solutionsVisibles = false;

    // Le rendu sait mieux que la modale comment il tient sur une page : un
    // sudoku va par douze, un logigramme par deux.
    const dispo = rendu.disposition || { cols: 3, rows: 4, maxCols: 5, maxRows: 5 };
    const lireDisposition = () => ({
        cols: Math.max(1, Math.min(dispo.maxCols || 5, Number(colsEl.value) || dispo.cols)),
        rows: Math.max(1, Math.min(dispo.maxRows || 5, Number(rowsEl.value) || dispo.rows))
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
    // qu'à deux par ligne ; taper « 3 » donnait bien deux colonnes, mais le
    // champ affichait toujours 3 et le compte ne bougeait pas — on croyait
    // l'interface cassée alors qu'elle bornait en silence. On réécrit donc la
    // valeur retenue, et les boutons − / + s'éteignent aux bornes.
    const recaler = (cols, rows) => {
        if (colsEl.value !== '') colsEl.value = String(cols);
        if (rowsEl.value !== '') rowsEl.value = String(rows);
        modal.querySelectorAll('.fp-pas-btn').forEach(b => {
            const v = b.dataset.cible === 'fp-cols' ? cols : rows;
            const maxi = b.dataset.cible === 'fp-cols' ? (dispo.maxCols || 5) : (dispo.maxRows || 5);
            b.disabled = Number(b.dataset.pas) > 0 ? v >= maxi : v <= 1;
        });
    };

    const rendre = () => {
        const { cols, rows } = lireDisposition();
        recaler(cols, rows);
        completer(cols * rows);
        // « tableaus », « bateaus »… Un pluriel fautif dans une interface de
        // professeur de français-et-maths ne passe pas : le rendu peut donner
        // le sien, sinon on ajoute un « s » (ou rien s'il y en a déjà un).
        const un = rendu.nomBloc || 'Grille';
        const plusieurs = rendu.nomBlocs || (/(au|eu|eau)$/.test(un) ? `${un}x` : `${un}s`);
        totalEl.textContent = `${cols * rows} ${(cols * rows > 1 ? plusieurs : un).toLowerCase()}`;

        // L'échelle vient de la place disponible : la page garde son format.
        const large = apercu.parentElement.clientWidth || 720;
        const k = large / PAGE.w;
        apercu.style.width = `${PAGE.w * k}px`;
        apercu.style.height = `${PAGE.h * k}px`;

        const { slots, traits } = calculerFiche(cols, rows);
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
            html += rendu.titreAGauche
                ? `<div class="fp-titre fp-titre--gauche" style="left:${slot.boite.x * k}px;
                    width:${slot.boite.w * k}px; top:${(slot.titre.y - 3.6) * k}px;
                    font-size:${Math.max(8, 3.2 * k)}px">${nomBloc} ${i + 1}</div>`
                : `<div class="fp-titre" style="left:${(slot.titre.x - 20) * k}px; width:${40 * k}px; top:${(slot.titre.y - 3.6) * k}px; font-size:${Math.max(8, 3.2 * k)}px">${nomBloc} ${i + 1}</div>`;
            html += rendu.previewGrille(item, slot, k, solutionsVisibles, i);
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
        apercu.innerHTML = html;

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

    colsEl.value = String(dispo.cols);
    rowsEl.value = String(dispo.rows);
    colsEl.max = String(dispo.maxCols || 5);
    rowsEl.max = String(dispo.maxRows || 5);
    // « input » et pas seulement « change » : la feuille suit la frappe, sans
    // qu'il faille sortir du champ pour voir ce qu'on a demandé.
    colsEl.oninput = rendre;
    rowsEl.oninput = rendre;
    colsEl.onchange = rendre;
    rowsEl.onchange = rendre;
    modal.querySelectorAll('.fp-pas-btn').forEach(b => {
        b.onclick = () => {
            const champ = b.dataset.cible === 'fp-cols' ? colsEl : rowsEl;
            const defaut = b.dataset.cible === 'fp-cols' ? dispo.cols : dispo.rows;
            champ.value = String((Number(champ.value) || defaut) + Number(b.dataset.pas));
            rendre();
        };
    });
    // Le choix couleur / noir et blanc : il vaut pour CETTE fiche, et devient
    // le choix par défaut des suivantes. Un professeur qui imprime en noir et
    // blanc le fait pour toute l'année, pas pour une feuille.
    const couleurEl = modal.querySelector('#fp-couleur');
    couleurEl.value = polycopieEnCouleur() ? '1' : '0';
    couleurEl.onchange = () => { reglerPolycopieCouleur(couleurEl.value === '1'); rendre(); };
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

    // --- LES RÉGLAGES DE L'EXERCICE, dans la fiche ---------------------------
    //
    // Le générateur dit ce qu'il sait faire varier ; le catalogue dit lesquels
    // de ces réglages le professeur a le droit de toucher. On garde
    // l'intersection — et l'on n'affiche rien du tout pour un atelier, où les
    // diagrammes sont composés à la main.
    const contenuEl = modal.querySelector('#fp-contenu');
    // UN RÉGLAGE EST DU CONTENU, OU DE L'ÉCRAN — et seul le premier a sa place
    // ici. La tolérance du rapporteur, le passage au clavier, le nombre de
    // propositions : sur une feuille photocopiée, rien de tout cela n'existe.
    // Affichés quand même, ce sont des boutons qui ne changent rien à ce qu'on
    // imprime — exactement la panne qu'on vient de corriger dans l'autre sens,
    // où `printParams` écrasait des réglages bien réels.
    //
    // Le tri se lisait jusqu'ici en creux (« ce que le générateur déclare »),
    // ce qui marchait par accident : les réglages d'activité n'y sont pas.
    // `papier: false` le dit en clair, et vaut aussi pour un réglage de
    // générateur qui ne concerne que l'écran.
    const surPapier = (p) => p && p.papier !== false;
    const schemaContenu = (() => {
        if (atelier || !generator) return [];
        // UN GÉNÉRATEUR DE FICHE A SES PROPRES RÉGLAGES. Quand la feuille tire
        // ses questions ailleurs que l'écran (`printGeneratorId`), l'ordre du
        // catalogue ne parle pas d'elle : l'intersection effaçait les boutons
        // qui n'existent QUE sur le papier — le nombre de lignes du tableau de
        // conversion, ou le tableau lui-même. On montre alors ce que le
        // générateur de fiche sait faire varier.
        if (exo && exo.printGeneratorId && exo.printGeneratorId !== exo.generatorId) {
            return (generator.params || []).filter(surPapier);
        }
        const connus = new Set((generator.params || []).map(p => p.id));
        const gardes = (paramSchemaOf(exo) || []).filter(p => p && connus.has(p.id) && surPapier(p));
        return gardes.length ? gardes : (generator.params || []).filter(surPapier);
    })();
    contenuEl.hidden = !schemaContenu.length;
    contenuEl.innerHTML = '';
    // Les champs viennent du panneau de configuration, pas d'une copie. Chargé
    // À LA DEMANDE : games/configUI.js pose des écouteurs sur `document` dès
    // son import, et ce module-ci est lu par le rendu commun des fiches, qui
    // doit rester chargeable hors navigateur.
    if (schemaContenu.length) {
        import('../games/configUI.js').then(({ fieldHtml, readParams, wireTips }) => {
            contenuEl.innerHTML = `<span class="fp-contenu-titre">Contenu</span>`
                + schemaContenu.map(p => fieldHtml(p,
                    reglages[p.id] !== undefined ? reglages[p.id] : p.default)).join('');
            wireTips(contenuEl);
            // Un réglage changé RETIRE les grilles : elles ont été tirées avec
            // l'ancien, et garder un sudoku 6 × 6 sur une fiche réglée en 9 × 9
            // ferait mentir l'aperçu. On relit tout le panneau d'un seul coup —
            // un seul chemin, donc jamais deux réglages qui divergent.
            const relire = () => {
                Object.assign(reglages, readParams(contenuEl, schemaContenu));
                items = [];
                rendre();
            };
            contenuEl.addEventListener('change', relire);
            // Les bascules « Oui / Non » n'émettent pas `change` : leur écouteur
            // global ne fait que basculer la classe. On repasse derrière lui.
            contenuEl.addEventListener('click', (ev) => {
                if (ev.target.closest('.cfg-on')) setTimeout(relire, 0);
            });
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
        const { cols, rows } = lireDisposition();
        chargerJsPDF()
            .then(jsPDF => {
                const doc = construirePdf(jsPDF, rendu, items, cols, rows, titreFiche, !!atelier);
                doc.save(`${(atelier && atelier.nom) || exo.printable}-${cols}x${rows}.pdf`);
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
    // demandés ne s'impriment pas sur une grille de quatre cases vides.
    if (atelier) {
        const n = Math.max(1, items.length);
        colsEl.value = String(Math.min(dispo.maxCols || 3, n > 1 ? 2 : 1));
        rowsEl.value = String(Math.max(1, Math.min(dispo.maxRows || 3,
            Math.ceil(n / Math.min(dispo.maxCols || 3, n > 1 ? 2 : 1)))));
    }
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
