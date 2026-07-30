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
                x: xSlot + (slotW - board) / 2,
                y: ySlot + titreH + (slotH - titreH - board) / 2,
                taille: board
            });
        }
    }
    return { slots, board };
}

// --- jsPDF, chargé au premier besoin ----------------------------------------

let jsPDFPromise = null;
function chargerJsPDF() {
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
function dessinerGrillePdf(doc, item, x, y, taille, solution) {
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
        doc.text(cage.label, x + c * s + 0.9, y + r * s + policeEtiquette * 0.36);
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

function entetePdf(doc, sousTitre, consigne) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(...ENCRE.texte);
    doc.text(`Mathdoku${sousTitre ? ' — ' + sousTitre : ''}`, PAGE.marge, PAGE.marge + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Nom : ..............................    Date : ....................', PAGE.w - PAGE.marge, PAGE.marge + 6, { align: 'right' });
    if (consigne) {
        doc.setFontSize(8.6);
        doc.setTextColor(90, 98, 112);
        doc.text(consigne, PAGE.marge, PAGE.marge + 12);
    }
    doc.setDrawColor(...ENCRE.trait);
    doc.setLineWidth(0.4);
    doc.line(PAGE.marge, PAGE.marge + 8, PAGE.w - PAGE.marge, PAGE.marge + 8);
    doc.setFontSize(6.5);
    doc.setTextColor(150, 155, 165);
    doc.text('Fiche générée par AtoutMath', PAGE.w / 2, PAGE.h - 4, { align: 'center' });
}

function construirePdfMathdoku(jsPDF, items, cols, rows, consigne) {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const { slots } = calculerFiche(cols, rows);

    const page = (solution) => {
        entetePdf(doc, solution ? 'Solutions' : '', solution ? '' : consigne);
        items.forEach((item, i) => {
            const slot = slots[i];
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(...ENCRE.texte);
            doc.text(`Grille ${i + 1}`, slot.titre.x, slot.titre.y, { align: 'center' });
            dessinerGrillePdf(doc, item, slot.x, slot.y, slot.taille, solution);
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
                <b>Mathdoku${solutionsVisibles ? ' — Solutions' : ''}</b>
                <span>Nom : ............  Date : ......</span>
            </div>
            <div class="fp-ligne" style="left:${en}px; right:${en}px; top:${(PAGE.marge + 8) * k}px;"></div>`;
        items.forEach((item, i) => {
            const slot = slots[i];
            html += `<div class="fp-titre" style="left:${(slot.titre.x - 20) * k}px; width:${40 * k}px; top:${(slot.titre.y - 3.6) * k}px; font-size:${Math.max(8, 3.2 * k)}px">Grille ${i + 1}</div>`;
            html += grillePreviewHtml(item, slot, k, solutionsVisibles);
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
        const lo = items[0].meta.lo, hi = items[0].meta.hi;
        chargerJsPDF()
            .then(jsPDF => {
                const consigne = `Chaque chiffre de ${lo} à ${hi} apparaît une seule fois par ligne et par colonne. `
                    + `Chaque zone doit donner le résultat écrit dans son coin, avec l'opération indiquée.`;
                const doc = construirePdfMathdoku(jsPDF, items, cols, rows, consigne);
                doc.save(`mathdoku-${cols}x${rows}.pdf`);
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
