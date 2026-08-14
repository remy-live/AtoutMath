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

import { getGenerator } from '../core/registry.js';
import { makeRng } from '../core/ids.js';
import { pourPdf, polycopieEnCouleur, reglerPolycopieCouleur
} from './ficheRendu.js';
import { ajusterAuCarre, insecable } from '../core/dominos.js';
import { marqueSvg as marqueSvgRelier } from '../core/relier.js';
import {
    dessiner as dessinerNoyau, aretesCachees as aretesCacheesNoyau,
    facesVisibles as facesVisiblesNoyau
} from '../core/solides.js';

// --- Mise en page (millimètres, A4 paysage) ---------------------------------

const PAGE = { w: 297, h: 210, marge: 9, enteteH: 17, piedH: 6 };
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
function hauteurTexteLogi(p, largeur) {
    const lignes = (s, pt, l) => Math.max(1, Math.ceil(largeurTexte(s, pt) / Math.max(10, l)));
    let h = 4 + lignes(p.decor, 7.6, largeur) * 3.4 + 1.5;
    p.indices.forEach((ind, k) => { h += lignes(`${k + 1}. ${ind.texte}`, 8, largeur - 2) * 3.9; });
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
    const etiq = Math.max(11, Math.min(17, boite.w * 0.13));
    const entete = bandeau + hauteurLibelles(p, colonnes);
    const nx = colonnes.length * n, ny = lignes.length * n;
    const cases = (largeur, hautDispo) => Math.min(
        (largeur - bandeau - etiq) / nx, (hautDispo - entete - 2) / ny, 14);

    // À côté : le texte tient dans une colonne, la grille occupe le reste.
    const texteW = Math.max(58, Math.min(boite.w * 0.44, 118));
    const coteA = cases(boite.w - texteW - 6, boite.h);
    // Empilée : le texte prend toute la largeur, la grille toute la hauteur qui reste.
    const texteH = hauteurTexteLogi(p, boite.w);
    const coteB = cases(boite.w, boite.h - texteH - 3);

    const empile = coteB > coteA;
    const cote = Math.max(3, empile ? coteB : coteA);
    const largeurTotale = bandeau + etiq + cote * nx;
    const zoneX = empile ? boite.x : boite.x + texteW + 6;
    const zoneW = empile ? boite.w : boite.w - texteW - 6;
    const xCat = zoneX + Math.max(0, (zoneW - largeurTotale) / 2);
    return {
        p, n, nc, colonnes, lignes, cote, bandeau, etiq, entete, xCat,
        x0: xCat + bandeau + etiq,
        y0: (empile ? boite.y + texteH + 3 : boite.y) + entete + 1,
        empile, indicesW: empile ? boite.w : texteW
    };
}

const logiVisible = (r, c) => r === 0 || c < r;

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
        width:${g.indicesW * k}px; font-size:${2.82 * k}px">
        <b>${echapperSheet(p.titre)}</b> — <i>${echapperSheet(solution ? 'Solution' : p.decor)}</i>
        <ol>${(solution ? phrasesSolutionLogi(item) : p.indices.map(i => i.texte))
        .map(t => `<li>${echapperSheet(t)}</li>`).join('')}</ol></div>`;

    // Les bandeaux et les étiquettes de colonne.
    const libH = g.entete - g.bandeau;
    colonnes.forEach((c, ci) => {
        const x = x0 + ci * n * cote;
        html += `<div class="fx-logi-cat" style="left:${x * k}px; top:${(y0 - g.entete) * k}px;
            width:${(n * cote) * k}px; height:${g.bandeau * k}px; background:${rgb(c, .55)};
            font-size:${Math.min(2.6, cote * 0.55) * k}px">${echapperSheet(p.categories[c].label)}</div>`;
        for (let j = 0; j < n; j++) {
            html += `<div class="fx-logi-vert" style="left:${(x + j * cote) * k}px;
                top:${(y0 - libH) * k}px; width:${cote * k}px;
                height:${libH * k}px; background:${rgb(c, .18)};
                font-size:${Math.min(2.5, cote * 0.5) * k}px">${echapperSheet(etiquetteLogi(p.categories[c], j))}</div>`;
        }
    });

    lignes.forEach((r, ri) => {
        const y = y0 + ri * n * cote;
        html += `<div class="fx-logi-catlig" style="left:${g.xCat * k}px; top:${y * k}px;
            width:${g.bandeau * k}px; height:${(n * cote) * k}px; background:${rgb(r, .55)};
            font-size:${Math.min(2.6, cote * 0.55) * k}px">${echapperSheet(p.categories[r].label)}</div>`;
        for (let i = 0; i < n; i++) {
            html += `<div class="fx-logi-lig" style="left:${(g.xCat + g.bandeau) * k}px;
                top:${(y + i * cote) * k}px; width:${g.etiq * k}px; height:${cote * k}px;
                background:${rgb(r, .18)}; font-size:${Math.min(2.5, cote * 0.5) * k}px">${echapperSheet(etiquetteLogi(p.categories[r], i))}</div>`;
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
    doc.setFontSize(9);
    doc.setTextColor(...ENCRE.texte);
    let y = b.y + 4;
    doc.text(pourPdf(p.titre), b.x, y);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.6);
    doc.setTextColor(...ENCRE.gris);
    doc.splitTextToSize(pourPdf(solution ? 'Solution' : p.decor), g.indicesW)
        .forEach(l => { y += 3.4; doc.text(l, b.x, y); });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...ENCRE.texte);
    y += 1.5;
    const textes = solution
        ? phrasesSolutionLogi(item)
        : p.indices.map(ind => ind.texte);
    textes.forEach((t, k) => {
        const lignesTexte = doc.splitTextToSize(pourPdf(`${k + 1}. ${t}`), g.indicesW - 2);
        lignesTexte.forEach((l, li) => { y += 3.9; doc.text(l, b.x + (li ? 3 : 0), y); });
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
        doc.setFontSize(Math.min(8, cote * 1.3));
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...ENCRE.texte);
        doc.text(pourPdf(p.categories[c].label), x + n * cote / 2, y0 - g.entete + g.bandeau * 0.72,
            { align: 'center' });
        doc.setFillColor(...pastel(c, 0.18));
        for (let j = 0; j < n; j++) doc.rect(x + j * cote, y0 - libH, cote, libH, 'FD');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(Math.min(7.5, cote * 1.2));
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
        doc.setFontSize(Math.min(8, cote * 1.3));
        doc.setTextColor(...ENCRE.texte);
        doc.text(pourPdf(p.categories[r].label), xCat + g.bandeau * 0.72, y0r + n * cote / 2,
            { align: 'center', angle: 90 });
        doc.setFillColor(...pastel(r, 0.18));
        for (let i = 0; i < n; i++) doc.rect(xCat + g.bandeau, y0r + i * cote, g.etiq, cote, 'FD');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(Math.min(7.5, cote * 1.2));
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
const DOM_ECART = 2.4;          // le blanc entre deux pièces : la marge du ciseau

/** La géométrie d'une planche : combien de pièces par ligne, et de quelle taille. */
function geometrieDominos(item, boite) {
    const pieces = item.meta.pieces || [];
    const plusLongue = Math.max(4, ...pieces.map(p =>
        Math.max(String(p.droite).length, String(p.gauche).length)));
    // UN DOMINO EST FAIT DE DEUX CARRÉS, comme le vrai. On choisit donc le
    // nombre de colonnes qui donne les plus grandes pièces au format 2:1 —
    // trois colonnes pour des tables, deux pour des périmètres, mais toujours
    // la MÊME pièce sur toute la planche : le texte s'adapte à la pièce,
    // jamais l'inverse.
    const rangs = (c) => Math.ceil(pieces.length / c);
    const coteDe = (c) => {
        const w = ((boite.w - DOM_ECART * (c - 1)) / c) / 2;   // le carré, par la largeur
        const h = (boite.h - DOM_ECART * (rangs(c) - 1)) / rangs(c);
        return Math.min(w, h, 24);
    };
    let cols = 2;
    for (const c of [3, 4]) if (coteDe(c) >= coteDe(cols) - 0.01 && plusLongue <= (c === 3 ? 26 : 12)) cols = c;
    const cote = Math.max(10, coteDe(cols));
    return { pieces, cols, pieceW: cote * 2, pieceH: cote, gaucheW: cote, droiteW: cote };
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
    // La grille de pièces est centrée dans son bloc : collée en haut à gauche
    // d'une page presque vide, la planche avait l'air d'une erreur de marge.
    const rangs = Math.ceil(ordre.length / g.cols);
    const x0 = b.x + Math.max(0, (b.w - (g.cols * g.pieceW + (g.cols - 1) * DOM_ECART)) / 2);
    const y0 = b.y + Math.max(0, (b.h - (rangs * g.pieceH + (rangs - 1) * DOM_ECART)) / 2);
    let html = '';
    ordre.forEach((id, rang) => {
        const p = g.pieces[id];
        if (!p) return;
        const x = x0 + (rang % g.cols) * (g.pieceW + DOM_ECART);
        const y = y0 + Math.floor(rang / g.cols) * (g.pieceH + DOM_ECART);
        if (y + g.pieceH > b.y + b.h + 1) return;
        const demi = (t, cls) => `<div class="fx-dom-demi ${cls}" style="width:${g.gaucheW * k}px;
            font-size:${policeDomino(t, g.pieceH) * k}px">${echapperSheet(insecable(t))}</div>`;
        html += `<div class="fx-dom-piece" style="left:${x * k}px; top:${y * k}px;
            width:${g.pieceW * k}px; height:${g.pieceH * k}px">
            ${demi(p.gauche, 'fx-dom-demi--g')}
            ${demi(p.droite, 'fx-dom-demi--d')}</div>`;
        // La flèche de la correction : elle dit dans quel sens se lit la chaîne.
        if (solution && rang < ordre.length - 1 && (rang % g.cols) !== g.cols - 1) {
            html += `<div class="fx-dom-fleche" style="left:${(x + g.pieceW) * k}px;
                top:${(y + g.pieceH / 2 - 1.4) * k}px; width:${DOM_ECART * k}px;
                font-size:${2.4 * k}px">›</div>`;
        }
    });
    return html;
}

function dessinerDominosPdf(doc, item, slot, solution, champ) {
    const b = slot.boite;
    const g = geometrieDominos(item, b);
    const ordre = ordreDominos(item, solution);
    const rangs = Math.ceil(ordre.length / g.cols);
    const x0 = b.x + Math.max(0, (b.w - (g.cols * g.pieceW + (g.cols - 1) * DOM_ECART)) / 2);
    const y0 = b.y + Math.max(0, (b.h - (rangs * g.pieceH + (rangs - 1) * DOM_ECART)) / 2);
    ordre.forEach((id, rang) => {
        const p = g.pieces[id];
        if (!p) return;
        const x = x0 + (rang % g.cols) * (g.pieceW + DOM_ECART);
        const y = y0 + Math.floor(rang / g.cols) * (g.pieceH + DOM_ECART);
        if (y + g.pieceH > b.y + b.h + 1) return;

        // Le trait de découpe : franc, et le même tout autour de la pièce.
        doc.setDrawColor(...ENCRE.trait);
        doc.setLineWidth(0.5);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(x, y, g.pieceW, g.pieceH, 1.2, 1.2, 'FD');
        doc.line(x + g.gaucheW, y, x + g.gaucheW, y + g.pieceH);

        doc.setTextColor(...ENCRE.texte);
        doc.setFont('helvetica', 'bold');
        // La police vient de la taille du carré : 1 pt ≈ 0,3528 mm.
        const ecrire = (texte, cx) => {
            const pt = policeDomino(texte, g.pieceH) / 0.3528;
            doc.setFontSize(pt);
            const interligne = pt * 0.42;
            // Un calcul court reste sur UNE ligne, comme à l'écran. On ne
            // met pas d'insécable dans le PDF : la police embarquée n'a pas
            // forcément ce caractère, et un glyphe manquant s'imprime.
            const court = insecable(texte) !== String(texte ?? '');
            const lignes = court ? [pourPdf(texte)]
                : doc.splitTextToSize(pourPdf(String(texte)), g.gaucheW - 2);
            const h0 = y + g.pieceH / 2 - (lignes.length - 1) * (interligne / 2) + pt * 0.12;
            lignes.forEach((l, i) => doc.text(l, cx, h0 + i * interligne, { align: 'center' }));
        };
        ecrire(p.gauche, x + g.gaucheW / 2);
        ecrire(p.droite, x + g.gaucheW + g.droiteW / 2);

        if (solution && rang < ordre.length - 1 && (rang % g.cols) !== g.cols - 1) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(...ENCRE.gris);
            doc.text('>', x + g.pieceW + DOM_ECART / 2, y + g.pieceH / 2 + 1.2, { align: 'center' });
        }
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
    const pas = Math.min(slot.taille / cols, slot.taille / lignes);
    const x0 = slot.x + (slot.taille - cols * pas) / 2;
    const y0 = slot.y + (slot.taille - lignes * pas) / 2;
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

function carreMagiquePreviewHtml(item, slot, k, solution, champs) {
    const { n, cases, trous, somme } = item.meta;
    const cote = slot.taille / n;
    // La somme s'écrit SOUS le carré : au-dessus, elle se battait avec le
    // titre « Grille N » de la fiche.
    let html = `<div class="fx-cm-somme" style="left:${slot.x * k}px; top:${(slot.y + slot.taille + 1.2) * k}px;
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
    const { n, cases, trous, somme } = item.meta;
    const cote = slot.taille / n;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...ENCRE.texte);
    doc.text(pourPdf(`Somme magique : ${somme}`), slot.x + (cote * n) / 2, slot.y + cote * n + 4.4,
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
const RED_ECRITURE = [2, 3, 2];
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
function geoSolide(item, slot) {
    // Le tableau prend le tiers du bas : trois cases à remplir au crayon
    // demandent de la hauteur, et un dessin trop grand ne laisse pas écrire.
    const tabH = slot.taille * 0.30;
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
    let html = '';

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
        <div class="fx-sd-case" style="left:${(g.x0 + i * largeur) * k}px; top:${g.tabY * k}px;
            width:${largeur * k}px; height:${g.tabH * k}px; font-size:${g.tabH * 0.22 * k}px">
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
    cols.forEach(([titre, valeur], i) => {
        const x = g.x0 + i * largeur;
        doc.rect(x, g.tabY, largeur, g.tabH);
        doc.setFontSize(5.4);
        doc.setTextColor(...ENCRE.gris);
        doc.text(pourPdf(titre), x + largeur / 2, g.tabY + g.tabH * 0.32, { align: 'center' });
        if (solution) {
            doc.setFontSize(11);
            doc.setTextColor(...ENCRE.trait);
            doc.text(String(valeur), x + largeur / 2, g.tabY + g.tabH * 0.82, { align: 'center' });
        }
    });
}

// --- Un repère, plusieurs points --------------------------------------------

/** Le repère dans son emplacement : axes, graduations, et la place d'écrire. */
function geoRepere(item, slot) {
    const m = item.meta;
    const mini = m.relatifs ? -m.max : 0;
    const etendue = m.max - mini;
    // Le bas de l'emplacement porte la liste (à placer) ou les lignes (à lire).
    const listeH = slot.taille * (m.mode === 'placer' ? 0.16 : 0.30);
    const cote = slot.taille - listeH;
    const marge = cote * 0.10;
    const pas = (cote - 2 * marge) / etendue;
    const x0 = slot.x + (slot.taille - cote) / 2 + marge;
    const y0 = slot.y + marge;
    return {
        m, mini, pas, cote, listeH, listeY: slot.y + cote, xGauche: slot.x + (slot.taille - cote) / 2,
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
    html += `<div class="fx-rp-axe" style="left:${g.px(g.mini) * k}px; top:${g.py(0) * k}px;
        width:${(g.px(m.max) - g.px(g.mini)) * k}px; height:0"></div>`;
    html += `<div class="fx-rp-axe" style="left:${g.px(0) * k}px; top:${g.py(m.max) * k}px;
        width:0; height:${(g.py(g.mini) - g.py(m.max)) * k}px"></div>`;

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
    html += `<div class="fx-rp-grad" style="left:${(g.px(0) - g.pas * 1.05) * k}px;
        top:${(g.py(0) + g.pas * 0.12) * k}px; width:${g.pas * 0.9 * k}px;
        font-size:${g.pas * 0.42 * k}px">O</div>`;

    // LES POINTS SE MARQUENT D'UNE CROIX : elle désigne exactement son centre,
    // là où un rond laisse hésiter entre son bord et son milieu.
    if (montrer) {
        m.points.forEach(pt => {
            const r = g.pas * 0.26;
            html += `<div class="fx-rp-croix" style="left:${(g.px(pt.x) - r) * k}px;
                top:${(g.py(pt.y) - r) * k}px; width:${2 * r * k}px; height:${2 * r * k}px"></div>`;
            html += `<div class="fx-rp-etiq" style="left:${(g.px(pt.x) + r * 0.9) * k}px;
                top:${(g.py(pt.y) - r * 2.6) * k}px; font-size:${g.pas * 0.5 * k}px">${pt.label}</div>`;
        });
    }

    // Sous le repère : les coordonnées à placer, ou les lignes à remplir.
    if (m.mode === 'placer') {
        html += `<div class="fx-rp-liste" style="left:${g.xGauche * k}px; top:${g.listeY * k}px;
            width:${g.cote * k}px; height:${g.listeH * k}px; font-size:${g.listeH * 0.28 * k}px">
            ${m.points.map(p => `${p.label} (${p.x} ; ${p.y})`).join(' &nbsp; ')}</div>`;
    } else {
        const parLigne = 2;
        html += `<div class="fx-rp-reponses" style="left:${g.xGauche * k}px; top:${g.listeY * k}px;
            width:${g.cote * k}px; height:${g.listeH * k}px; font-size:${g.listeH * 0.16 * k}px">
            ${m.points.map(p => `<span class="fx-rp-rep">${p.label} ( <span class="fx-rp-trou"
                >${solution ? p.x : ''}</span> ; <span class="fx-rp-trou"
                >${solution ? p.y : ''}</span> )</span>`).join('')}</div>`;
    }
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
    doc.line(g.px(g.mini), g.py(0), g.px(m.max), g.py(0));
    doc.line(g.px(0), g.py(m.max), g.px(0), g.py(g.mini));

    doc.setFontSize(Math.max(4.5, g.pas * 1.1));
    doc.setTextColor(...ENCRE.gris);
    for (let i = g.mini; i <= m.max; i++) {
        if (i === 0) continue;
        doc.text(String(i), g.px(i), g.py(0) + g.pas * 0.62, { align: 'center' });
        doc.text(String(i), g.px(0) - g.pas * 0.35, g.py(i) + g.pas * 0.18, { align: 'right' });
    }
    doc.text('O', g.px(0) - g.pas * 0.35, g.py(0) + g.pas * 0.62, { align: 'right' });

    if (montrer) {
        doc.setDrawColor(...ENCRE.trait);
        doc.setLineWidth(0.45);
        doc.setTextColor(...ENCRE.trait);
        m.points.forEach(pt => {
            const r = g.pas * 0.26, x = g.px(pt.x), y = g.py(pt.y);
            doc.line(x - r, y - r, x + r, y + r);
            doc.line(x - r, y + r, x + r, y - r);
            doc.setFontSize(Math.max(5, g.pas * 1.2));
            doc.text(pt.label, x + r * 1.1, y - r * 0.9);
        });
    }

    doc.setTextColor(...ENCRE.texte);
    if (m.mode === 'placer') {
        doc.setFontSize(Math.max(5, g.listeH * 0.7));
        const texte = m.points.map(p => `${p.label} (${p.x} ; ${p.y})`).join('   ');
        doc.text(pourPdf(texte), g.xGauche + g.cote / 2, g.listeY + g.listeH * 0.6, { align: 'center' });
    } else {
        doc.setFontSize(Math.max(5, g.pas * 0.9));
        const parLigne = 2;
        m.points.forEach((p, i) => {
            const col = i % parLigne, rang = Math.floor(i / parLigne);
            const x = g.xGauche + col * (g.cote / parLigne) + 1;
            const y = g.listeY + (rang + 0.8) * (g.listeH / Math.ceil(m.points.length / parLigne));
            const rep = solution ? `${p.x} ; ${p.y}` : '.......  ;  .......';
            doc.text(pourPdf(`${p.label} ( ${rep} )`), x, y);
        });
    }
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
        d += `<line x1="${T(g.cx)}" y1="${T(g.cy)}" x2="${T(gh.x)}" y2="${T(gh.y)}"
              stroke="#1a202c" stroke-width="${T(g.r * 0.085)}" stroke-linecap="round"/>`;
        d += `<line x1="${T(g.cx)}" y1="${T(g.cy)}" x2="${T(gm.x)}" y2="${T(gm.y)}"
              stroke="#1a202c" stroke-width="${T(g.r * 0.045)}" stroke-linecap="round"/>`;
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
        doc.setLineWidth(Math.max(0.5, g.r * 0.085));
        doc.line(g.cx, g.cy, gh.x, gh.y);
        doc.setLineWidth(Math.max(0.3, g.r * 0.045));
        doc.line(g.cx, g.cy, gm.x, gm.y);
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

export const RENDUS = {
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
        consigne: (items) => `Découpe les ${(items[0] && items[0].meta.pieces.length) || ''} pièces et remets-les `
            + 'bout à bout : chaque question doit toucher sa réponse. On part de la pièce DÉPART, '
            + 'on lit le bout ouvert, on le calcule, et on cherche ce résultat à GAUCHE d\'une autre pièce. '
            + 'Quand la pièce ARRIVÉE est posée et qu\'il ne reste rien, tout est juste.',
        previewGrille: dominosPreviewHtml,
        pdfGrille: dessinerDominosPdf,
        // Une planche prend une demi-page : les pièces doivent rester assez
        // grandes pour être découpées et manipulées par des doigts d'élève.
        proportions: { w: 1, h: 0.62 },
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
                    <input type="number" id="fp-cols" class="cfg-input cfg-input--num" min="1" max="5" value="3"></label>
                <label>Lignes
                    <input type="number" id="fp-rows" class="cfg-input cfg-input--num" min="1" max="5" value="4"></label>
                <span class="fp-total" id="fp-total"></span>
                <label>Impression
                    <select id="fp-couleur" class="cfg-input">
                        <option value="0">Noir et blanc</option>
                        <option value="1">En couleur</option>
                    </select></label>
                <button type="button" class="btn-hint" id="fp-regen">🎲 Autres grilles</button>
                <button type="button" class="btn-hint" id="fp-voir-sol" aria-pressed="false">Voir les solutions</button>
            </div>
            <div class="fp-apercu-cadre">
                <div class="fp-apercu" id="fp-apercu"></div>
            </div>
            <div class="fp-note">Page 1 : les grilles, avec un en-tête Nom / Date.
                Page 2 : les solutions — à garder pour soi ou à donner après.</div>
            <div class="modal-actions-center">
                <button type="button" class="btn-toggle glass-btn modal-btn-flex modal-btn-flex--neutral" id="fp-fermer">Fermer</button>
                <button type="button" class="btn-toggle glass-btn primary active modal-btn-flex" id="fp-telecharger">⬇️ Télécharger le PDF</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    return modal;
}

// --- Mathdoku ----------------------------------------------------------------

function entetePdf(doc, titre, sousTitre, consigne) {
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
    doc.text('Fiche générée par AtoutMath', PAGE.w / 2, PAGE.h - 4, { align: 'center' });
}

function construirePdf(jsPDF, rendu, items, cols, rows) {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const { slots, traits } = calculerFiche(cols, rows);

    const page = (solution) => {
        entetePdf(doc, rendu.titre, solution ? 'Solutions' : '', solution ? '' : rendu.consigne(items));
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
            rendu.pdfGrille(doc, item, slot, solution);
        });
    };

    page(false);
    doc.addPage('a4', 'landscape');
    page(true);
    return doc;
}

/**
 * Ouvre la modale de fiche pour un exercice imprimable.
 * @param {Object} exo    - entrée de catalogue portant `printable`
 * @param {Object} params - réglages courants (chiffres, opérations, difficulté)
 */
export function ouvrirFicheModal(exo, params) {
    // UN EXERCICE PEUT IMPRIMER AUTRE CHOSE QU'IL NE JOUE.
    //
    // À l'écran, le repérage pose UN point à la fois : c'est ce qu'il faut
    // pour corriger tout de suite. Sur le papier, un repère qui ne porte qu'un
    // point gâche une demi-page, et l'élève passe son temps à retracer des
    // axes. Le même exercice a donc le droit d'avoir un générateur de FICHE
    // distinct — plutôt que de doubler le catalogue d'entrées « à imprimer »
    // que personne ne cherche.
    const generator = getGenerator(exo.printGeneratorId || exo.generatorId);
    const rendu = RENDUS[exo.printable];
    // Deux papiers pour deux natures d'exercice : une GRILLE se dessine (on y
    // rature, on y note ses candidats), une QUESTION s'écrit sur une ligne.
    // Le second cas est de loin le plus fréquent, et n'existait pas.
    if (!rendu) {
        if (generator && generator.ecrit) {
            import('./printQuestions.js')
                .then(m => m.ouvrirFicheQuestions(exo, { ...(params || {}), ...(exo.printParams || {}) }, chargerJsPDF));
        }
        return;
    }
    if (!generator) return;

    const modal = assurerModale();
    const apercu = modal.querySelector('#fp-apercu');
    const colsEl = modal.querySelector('#fp-cols');
    const rowsEl = modal.querySelector('#fp-rows');
    const totalEl = modal.querySelector('#fp-total');
    const btnSol = modal.querySelector('#fp-voir-sol');

    const reglages = { ...(params || {}), ...(exo.printParams || {}) };
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

    const rendre = () => {
        const { cols, rows } = lireDisposition();
        completer(cols * rows);
        totalEl.textContent = `${cols * rows} ${(rendu.nomBloc || 'Grille').toLowerCase()}s`;

        // L'échelle vient de la place disponible : la page garde son format.
        const large = apercu.parentElement.clientWidth || 720;
        const k = large / PAGE.w;
        apercu.style.width = `${PAGE.w * k}px`;
        apercu.style.height = `${PAGE.h * k}px`;

        const { slots, traits } = calculerFiche(cols, rows);
        const en = PAGE.marge * k;
        let html = `
            <div class="fp-entete" style="left:${en}px; right:${en}px; top:${(PAGE.marge + 1) * k}px;">
                <b>${rendu.titre}${solutionsVisibles ? ' — Solutions' : ''}</b>
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
            html += rendu.previewGrille(item, slot, k, solutionsVisibles);
        });
        apercu.innerHTML = html;
    };

    colsEl.value = String(dispo.cols);
    rowsEl.value = String(dispo.rows);
    colsEl.max = String(dispo.maxCols || 5);
    rowsEl.max = String(dispo.maxRows || 5);
    colsEl.onchange = rendre;
    rowsEl.onchange = rendre;
    // Le choix couleur / noir et blanc : il vaut pour CETTE fiche, et devient
    // le choix par défaut des suivantes. Un professeur qui imprime en noir et
    // blanc le fait pour toute l'année, pas pour une feuille.
    const couleurEl = modal.querySelector('#fp-couleur');
    couleurEl.value = polycopieEnCouleur() ? '1' : '0';
    couleurEl.onchange = () => { reglerPolycopieCouleur(couleurEl.value === '1'); rendre(); };

    modal.querySelector('#fp-regen').onclick = () => { items = []; rendre(); };
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
                const doc = construirePdf(jsPDF, rendu, items, cols, rows);
                doc.save(`${exo.printable}-${cols}x${rows}.pdf`);
            })
            .catch(() => {
                import('./modal.js').then(m => m.showAlert(
                'Le générateur de PDF n\'a pas pu être chargé. Recharge la page : '
                + 'la bibliothèque est servie avec l\'application, elle ne dépend d\'aucun site extérieur.'));
            })
            .finally(() => { btnDl.disabled = false; });
    };

    items = [];
    solutionsVisibles = false;
    btnSol.textContent = 'Voir les solutions';
    modal.style.display = 'flex';
    rendre();
}
