// LE RENDU D'UNE FICHE EN BLOCS — une seule fois, pour l'aperçu ET le PDF.
//
// core/fiche.js décide où va chaque chose, en millimètres. Ici on ne fait que
// dessiner ces items deux fois : en HTML positionné pour l'aperçu, en jsPDF
// pour le fichier. Les deux dessins lisent les MÊMES coordonnées — c'est la
// garantie que ce qu'on voit à l'écran est ce que sort l'imprimante.
//
// Ce module est partagé par la fiche d'un exercice (printQuestions) et la
// fiche d'un parcours (printParcours) : même papier, même trait, même bandeau.

import { A4 } from '../core/fiche.js';
// Les dessins de grilles vivent avec la fiche de grilles : un sudoku se dessine
// pareil qu'il occupe une page entière ou un bloc au milieu d'une évaluation.
import { RENDUS } from './printSheet.js';

export const ENCRE = {
    texte: [30, 41, 59],
    gris: [110, 118, 132],
    trait: [26, 32, 44],
    pointille: [168, 176, 191],
    bandeau: [238, 241, 245],
    bandeauTrait: [203, 210, 220]
};

export const echapper = (s) => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

/** Largeur d'un texte en mm, métriques Helvetica (la police du PDF). */
export function mesureur() {
    const c = document.createElement('canvas').getContext('2d');
    return (texte, taille) => {
        c.font = `${taille * 100}px Helvetica, Arial, sans-serif`;
        return c.measureText(texte).width / 100;
    };
}

/** Le libellé d'un bandeau d'exercice. */
const titreExo = (it) => `Exercice ${it.n} — ${it.titre}${it.suite ? ' (suite)' : ''}`;

// --- Aperçu HTML -------------------------------------------------------------

/** Les items d'une page, en HTML positionné. `k` = pixels par millimètre. */
export function apercuItems(page, k, o) {
    let html = '';
    for (const it of page.items) {
        if (it.type === 'exo') {
            html += `<div class="fx-bandeau" style="left:${it.x * k}px; top:${it.y * k}px;
                width:${it.w * k}px; height:${it.h * k}px; font-size:${o.taille * k * 1.02}px">
                <span>${echapper(titreExo(it))}</span>
                ${it.points ? `<span class="fx-points">… / ${it.points}</span>` : ''}</div>`;
            continue;
        }
        if (it.type === 'consigne') {
            it.lignes.forEach((ligne, i) => {
                html += `<div class="fx-consigne" style="left:${(it.x + 1) * k}px;
                    top:${(it.y + i * o.tailleConsigne * 1.45) * k}px; width:${it.w * k}px;
                    font-size:${o.tailleConsigne * k}px">${echapper(ligne)}</div>`;
            });
            continue;
        }
        if (it.type === 'grille') {
            const r = RENDUS[it.cle];
            if (r) {
                html += `<div class="fx-grille-num" style="left:${it.x * k}px; top:${(it.y - 3.4) * k}px;
                    font-size:${o.tailleConsigne * k}px">${it.n}.</div>`;
                html += r.previewGrille(it.item, { x: it.x, y: it.y, taille: it.taille, boite: it.boite }, k, false);
            }
            continue;
        }
        // type 'q'
        html += `<div class="fq-num" style="left:${it.x * k}px; top:${it.y * k}px; font-size:${o.taille * k}px">${it.n}.</div>`;
        it.lignes.forEach((ligne, i) => {
            html += `<div class="fq-ligne" style="left:${it.texteX * k}px; top:${(it.y + i * o.interligne) * k}px;
                width:${it.texteW * k}px; font-size:${o.taille * k}px">${echapper(ligne)}</div>`;
        });
        if (it.choix) {
            html += `<div class="fq-choix" style="left:${it.texteX * k}px; top:${it.choixY * k}px;
                font-size:${o.taille * k * .9}px">${it.choix.map(c => '☐ ' + echapper(c)).join('&nbsp;&nbsp;')}</div>`;
        }
        if (it.rep) {
            html += `<div class="fq-reponse" style="left:${it.rep.x * k}px; top:${it.rep.y * k}px; width:${it.rep.w * k}px"></div>`;
        }
    }
    return html;
}

/** L'en-tête d'une page d'aperçu (titre, Nom/Date, filet). */
export function apercuEntete(k, titre, sousTitre, note) {
    // LA CASE DE LA NOTE. Sur une interrogation, elle est le premier endroit
    // que regarde l'élève et le dernier que remplit le professeur : elle mérite
    // un cadre à elle, en haut à droite, pas une mention perdue dans une ligne
    // de texte. Le total du barème y est imprimé — « … / 20 » — pour que la
    // note se pose sans avoir à chercher sur combien elle compte.
    const cadre = note ? `
        <div class="fp-note-case" style="right:${A4.marge * k}px; top:${(A4.marge + 0.5) * k}px;
            width:${26 * k}px; height:${13 * k}px; font-size:${4.4 * k}px">… / ${echapper(String(note.sur))}</div>` : '';
    return `
        <div class="fp-entete" style="left:${A4.marge * k}px; right:${(A4.marge + (note ? 30 : 0)) * k}px; top:${(A4.marge + 1) * k}px;">
            <b>${echapper(titre)}${sousTitre ? ' — ' + echapper(sousTitre) : ''}</b>
            <span>Nom : ............  Date : ......</span>
        </div>
        ${cadre}
        <div class="fp-ligne" style="left:${A4.marge * k}px; right:${A4.marge * k}px; top:${(A4.marge + 9) * k}px;"></div>`;
}

// --- PDF ---------------------------------------------------------------------

export function entetePdf(pdf, titre, sousTitre, bareme, note) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14.5);
    pdf.setTextColor(...ENCRE.texte);
    pdf.text(`${titre}${sousTitre ? ' — ' + sousTitre : ''}`, A4.marge, A4.marge + 6);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9.5);
    // La case de la note mange le coin droit : le « Nom / Date » se décale.
    const droite = A4.w - A4.marge - (note ? 30 : 0);
    pdf.text('Nom : ...........................   Date : ..............',
        droite, A4.marge + 6, { align: 'right' });
    if (note) {
        pdf.setDrawColor(...ENCRE.trait);
        pdf.setLineWidth(0.5);
        pdf.roundedRect(A4.w - A4.marge - 26, A4.marge + 0.5, 26, 13, 1.5, 1.5, 'S');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(13);
        pdf.setTextColor(...ENCRE.gris);
        pdf.text(`… / ${note.sur}`, A4.w - A4.marge - 13, A4.marge + 8.6, { align: 'center' });
        pdf.setTextColor(...ENCRE.texte);
    }
    pdf.setDrawColor(...ENCRE.trait);
    pdf.setLineWidth(0.4);
    pdf.line(A4.marge, A4.marge + 9, A4.w - A4.marge, A4.marge + 9);
    if (bareme) {
        pdf.setFontSize(8.6);
        pdf.setTextColor(...ENCRE.gris);
        pdf.text(bareme, A4.marge, A4.marge + 14);
    }
    pdf.setFontSize(6.5);
    pdf.setTextColor(160, 165, 175);
    pdf.text('Fiche générée par AtoutMath', A4.w / 2, A4.h - 4, { align: 'center' });
}

function pointilles(pdf, x, y, largeur) {
    pdf.setDrawColor(...ENCRE.pointille);
    pdf.setLineWidth(0.25);
    pdf.setLineDashPattern([0.7, 1.1], 0);
    pdf.line(x, y, x + largeur, y);
    pdf.setLineDashPattern([], 0);
}

/** Les items d'une page, dans le PDF. */
export function pdfItems(pdf, page, o) {
    for (const it of page.items) {
        if (it.type === 'exo') {
            pdf.setFillColor(...ENCRE.bandeau);
            pdf.setDrawColor(...ENCRE.bandeauTrait);
            pdf.setLineWidth(0.2);
            pdf.roundedRect(it.x, it.y, it.w, it.h, 1.2, 1.2, 'FD');
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(o.taille * 2.9);
            pdf.setTextColor(...ENCRE.texte);
            pdf.text(titreExo(it), it.x + 3, it.y + it.h / 2 + o.taille * 0.42);
            if (it.points) {
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(o.taille * 2.5);
                pdf.setTextColor(...ENCRE.gris);
                pdf.text(`… / ${it.points}`, it.x + it.w - 3, it.y + it.h / 2 + o.taille * 0.42, { align: 'right' });
            }
            continue;
        }
        if (it.type === 'consigne') {
            pdf.setFont('helvetica', 'italic');
            pdf.setFontSize(o.tailleConsigne * 2.83);
            pdf.setTextColor(...ENCRE.gris);
            it.lignes.forEach((ligne, i) => {
                pdf.text(ligne, it.x + 1, it.y + o.tailleConsigne + i * o.tailleConsigne * 1.45);
            });
            continue;
        }
        if (it.type === 'grille') {
            const r = RENDUS[it.cle];
            if (r) {
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(o.tailleConsigne * 2.83);
                pdf.setTextColor(...ENCRE.gris);
                pdf.text(`${it.n}.`, it.x, it.y - 1.2);
                r.pdfGrille(pdf, it.item, { x: it.x, y: it.y, taille: it.taille, boite: it.boite }, false);
            }
            continue;
        }
        pdf.setTextColor(...ENCRE.texte);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(o.taille * 2.83);
        pdf.text(`${it.n}.`, it.x, it.y + o.taille);
        pdf.setFont('helvetica', 'normal');
        it.lignes.forEach((ligne, i) => {
            pdf.text(ligne, it.texteX, it.y + o.taille + i * o.interligne);
        });
        if (it.choix) {
            pdf.setFontSize(o.taille * 2.5);
            pdf.setTextColor(...ENCRE.gris);
            pdf.text(it.choix.map(c => `☐ ${c}`).join('   '), it.texteX, it.choixY + o.taille);
            pdf.setTextColor(...ENCRE.texte);
        }
        if (it.rep) pointilles(pdf, it.rep.x, it.rep.y, it.rep.w);
    }
}
