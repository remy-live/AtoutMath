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
import { pourPdf } from './ficheRendu.js';

// --- Mise en page (millimètres, A4 paysage) ---------------------------------

const PAGE = { w: 297, h: 210, marge: 9, enteteH: 17, piedH: 6 };
const ENCRE = { trait: [26, 32, 44], grille: [176, 182, 197], donnee: [238, 240, 250], texte: [45, 55, 72] };

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
    return { slots, board };
}

// --- jsPDF, chargé au premier besoin ----------------------------------------

let jsPDFPromise = null;
export function chargerJsPDF() {
    if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
    if (!jsPDFPromise) {
        jsPDFPromise = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            s.onload = () => resolve(window.jspdf.jsPDF);
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
function dessinerGrillePdf(doc, item, slot, solution) {
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
            if (!solution && !donnee) continue;
            doc.text(String(sol[r][c]), x + c * s + s / 2, y + r * s + s / 2,
                { align: 'center', baseline: 'middle' });
        }
    }
}

/** La même grille en HTML pour l'aperçu, aux mêmes proportions (k px/mm). */
function grillePreviewHtml(item, slot, k, solution) {
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
            html += `<td style="width:${s}px; height:${s}px; font-size:${s * 0.5}px; ${bords}${donnee ? 'background:#eef0fa;' : ''}">
                ${premiere ? `<span class="fp-etiquette" style="font-size:${Math.max(6, s * 0.26)}px">${cage.label}</span>` : ''}
                ${solution || donnee ? sol[r][c] : ''}</td>`;
        }
        html += '</tr>';
    }
    return html + '</table>';
}

// --- Binairo ------------------------------------------------------------------

function dessinerBinairoPdf(doc, item, slot, solution) {
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
        if (!solution && givens[r][c] === null) continue;
        doc.text(String(sol[r][c]), x + c * s + s / 2, y + r * s + s / 2,
            { align: 'center', baseline: 'middle' });
    }
}

function binairoPreviewHtml(item, slot, k, solution) {
    const { n, givens, solution: sol } = item.meta;
    const s = (slot.taille / n) * k;
    let html = `<table class="fp-grille" style="left:${slot.x * k}px; top:${slot.y * k}px; border: 1.6px solid #1a202c;">`;
    for (let r = 0; r < n; r++) {
        html += '<tr>';
        for (let c = 0; c < n; c++) {
            const donnee = givens[r][c] !== null;
            html += `<td style="width:${s}px; height:${s}px; font-size:${s * 0.55}px; ${donnee ? 'background:#eef0fa;' : ''}">
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

function sudokuPreviewHtml(item, slot, k, solution) {
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
            html += `<td style="width:${s}px; height:${s}px; font-size:${s * 0.55}px;
                ${donnee ? 'background:#eef0fa;' : ''}${bords}">
                ${solution || donnee ? sol[i] : ''}</td>`;
        }
        html += '</tr>';
    }
    return html + '</table>';
}

function dessinerSudokuPdf(doc, item, slot, solution) {
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
        if (!solution && (givens[i] === null || givens[i] === undefined)) continue;
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

function dessinerGaramPdf(doc, item, slot, solution) {
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
        if (!solution && givens[i] === null) return;
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

function garamPreviewHtml(item, slot, k, solution) {
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
        html += `<div class="fx-ga-case${donnee ? ' fx-ga-case--donnee' : ''}"
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

function redactionPreviewHtml(item, slot, k, solution) {
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
            `<div class="fx-red-rail" style="left:${(b.x + 4) * k}px;
                top:${(yr + 0.8) * k}px; width:${(b.w - 4) * k}px"></div>`).join('');
        return `<div class="fx-red-ligne" style="left:${b.x * k}px; top:${y * k}px;
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

function dessinerRedactionPdf(doc, item, slot, solution) {
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
            doc.setLineDashPattern([], 0);
        }
    });
}

export const RENDUS = {
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
        // hauteur d'une figure plus trois lignes d'écriture.
        proportions: { w: 1, h: 0.72 },
        // DEUX PAR LIGNE, et pas ce que la largeur permettrait. Une grille se
        // contente d'être lisible ; ici l'élève doit ÉCRIRE trois phrases sur
        // la ligne, dont la propriété du cours en entier. À trois par ligne,
        // il reste cinq centimètres par phrase.
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
        doc.setFontSize(8.6);
        doc.setTextColor(90, 98, 112);
        doc.text(pourPdf(consigne), PAGE.marge, PAGE.marge + 12);
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
    const { slots } = calculerFiche(cols, rows);

    const page = (solution) => {
        entetePdf(doc, rendu.titre, solution ? 'Solutions' : '', solution ? '' : rendu.consigne(items));
        items.forEach((item, i) => {
            const slot = slots[i];
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(...ENCRE.texte);
            doc.text(`Grille ${i + 1}`, slot.titre.x, slot.titre.y, { align: 'center' });
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
    const generator = getGenerator(exo.generatorId);
    const rendu = RENDUS[exo.printable];
    // Deux papiers pour deux natures d'exercice : une GRILLE se dessine (on y
    // rature, on y note ses candidats), une QUESTION s'écrit sur une ligne.
    // Le second cas est de loin le plus fréquent, et n'existait pas.
    if (!rendu) {
        if (generator && generator.ecrit) {
            import('./printQuestions.js')
                .then(m => m.ouvrirFicheQuestions(exo, params, chargerJsPDF));
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

    let items = [];
    let solutionsVisibles = false;

    const lireDisposition = () => ({
        cols: Math.max(1, Math.min(5, Number(colsEl.value) || 3)),
        rows: Math.max(1, Math.min(5, Number(rowsEl.value) || 4))
    });

    // Graine fraîche par grille : chaque fiche est différente. Les grilles ne
    // sont RETIRÉES qu'en cas de besoin (plus de cases), jamais régénérées à
    // l'ouverture des solutions — l'aperçu doit montrer les mêmes grilles.
    const completer = (total) => {
        while (items.length < total) items.push(generator.generate(params, { rng: makeRng() }));
        items.length = total;
    };

    const rendre = () => {
        const { cols, rows } = lireDisposition();
        completer(cols * rows);
        totalEl.textContent = `${cols * rows} grilles`;

        // L'échelle vient de la place disponible : la page garde son format.
        const large = apercu.parentElement.clientWidth || 720;
        const k = large / PAGE.w;
        apercu.style.width = `${PAGE.w * k}px`;
        apercu.style.height = `${PAGE.h * k}px`;

        const { slots } = calculerFiche(cols, rows);
        const en = PAGE.marge * k;
        let html = `
            <div class="fp-entete" style="left:${en}px; right:${en}px; top:${(PAGE.marge + 1) * k}px;">
                <b>${rendu.titre}${solutionsVisibles ? ' — Solutions' : ''}</b>
                <span>Nom : ............  Date : ......</span>
            </div>
            <div class="fp-ligne" style="left:${en}px; right:${en}px; top:${(PAGE.marge + 8) * k}px;"></div>`;
        items.forEach((item, i) => {
            const slot = slots[i];
            html += `<div class="fp-titre" style="left:${(slot.titre.x - 20) * k}px; width:${40 * k}px; top:${(slot.titre.y - 3.6) * k}px; font-size:${Math.max(8, 3.2 * k)}px">Grille ${i + 1}</div>`;
            html += rendu.previewGrille(item, slot, k, solutionsVisibles);
        });
        apercu.innerHTML = html;
    };

    colsEl.value = '3';
    rowsEl.value = '4';
    colsEl.onchange = rendre;
    rowsEl.onchange = rendre;
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
                window.appConfirm('PDF indisponible',
                    'La bibliothèque de PDF n\'a pas pu être chargée (connexion ?). Réessaie une fois en ligne.',
                    null);
            })
            .finally(() => { btnDl.disabled = false; });
    };

    items = [];
    solutionsVisibles = false;
    btnSol.textContent = 'Voir les solutions';
    modal.style.display = 'flex';
    rendre();
}
