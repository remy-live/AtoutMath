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

/**
 * LE TEXTE TEL QUE LE PDF SAIT L'ÉCRIRE.
 *
 * Les polices standard d'un PDF (Helvetica et compagnie) n'ont qu'un jeu de
 * caractères : celui de Windows-1252. Dès qu'une chaîne contient AUTRE CHOSE,
 * jsPDF bascule la chaîne ENTIÈRE en UTF-16 — mais la police, elle, ne sait
 * pas la relire, et chaque caractère sort en deux glyphes de hasard. C'est
 * ainsi que « 5 + ? = 10 → 5 » s'imprimait « 5 + ? = 1 0 !' 5 » : un seul
 * caractère hors table, et toute la ligne était perdue.
 *
 * On remplace donc ces caractères par leur équivalent lisible AVANT de les
 * confier au PDF. Les symboles vraiment utiles à une fiche de mathématiques —
 * × ÷ ° ² ³ ½ « » — sont dans la table, eux, et passent intacts.
 */
const HORS_TABLE = {
    '\u2212': '-',      // le vrai signe moins
    '\u2192': '->', '\u2190': '<-',
    '\u2248': '~',      // « à peu près égal »
    '\u22A5': '_|_',    // perpendiculaire
    '\u2260': '=/=', '\u2264': '<=', '\u2265': '>=',
    '\u2081': '1', '\u2082': '2', '\u2083': '3', '\u2084': '4', '\u2085': '5',
    '\u2086': '6', '\u2087': '7', '\u2088': '8', '\u2089': '9', '\u2080': '0',
    '\u1D49': 'e',      // le « e » de « 2ᵉ »
    '\u2610': '[ ]', '\u2611': '[x]',
    '\u2153': '1/3', '\u2154': '2/3', '\u00BC': '1/4', '\u00BE': '3/4',
    '\u2218': 'o', '\u2032': "'", '\u2033': '"',
    '\u2261': '=', '\u221A': 'V', '\u03C0': 'pi'
};

export function pourPdf(texte) {
    let t = String(texte ?? '');
    for (const [de, a] of Object.entries(HORS_TABLE)) t = t.split(de).join(a);
    // Filet de sécurité : tout ce qui reste au-dessus de la table y passe.
    // Un point d'interrogation vaut mieux qu'une ligne entière illisible.
    return t.replace(/[^\u0000-\u00FF\u0152\u0153\u0160\u0161\u0178\u017D\u017E\u0192\u02C6\u02DC\u2013\u2014\u2018\u2019\u201A\u201C\u201D\u201E\u2020\u2021\u2022\u2026\u2030\u2039\u203A\u20AC\u2122]/g, '?');
}

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
                // `n` vaut null quand le professeur a décoché la numérotation
                // de cet exercice : on n'écrit alors rien du tout.
                if (it.n != null) {
                    html += `<div class="fx-grille-num" style="left:${it.x * k}px; top:${(it.y - 3.4) * k}px;
                        font-size:${o.tailleConsigne * k}px">${it.n}.</div>`;
                }
                html += r.previewGrille(it.item, { x: it.x, y: it.y, taille: it.taille, boite: it.boite }, k, !!o.solution);
            }
            continue;
        }
        // type 'q'
        if (it.n != null) {
            html += `<div class="fq-num" style="left:${it.x * k}px; top:${it.y * k}px; font-size:${o.taille * k}px">${it.n}.</div>`;
        }
        it.lignes.forEach((ligne, i) => {
            html += `<div class="fq-ligne" style="left:${it.texteX * k}px; top:${(it.y + i * o.interligne) * k}px;
                width:${it.texteW * k}px; font-size:${o.taille * k}px">${echapper(ligne)}</div>`;
        });
        if (it.choix) {
            html += `<div class="fq-choix" style="left:${it.texteX * k}px; top:${it.choixY * k}px;
                font-size:${o.taille * k * .9}px">${it.choix.map(c => '☐ ' + echapper(c)).join('&nbsp;&nbsp;')}</div>`;
        }
        if (it.rep) {
            // AVEC CHAMPS, la place à remplir est une boîte, pas un trait :
            // l'aperçu doit montrer ce que l'élève verra dans son lecteur PDF,
            // sinon le professeur découvre la différence à l'impression.
            html += o.champs
                ? `<div class="fx-champ" style="left:${it.rep.x * k}px; top:${it.rep.champY * k}px;
                    width:${it.rep.w * k}px; height:${it.rep.h * k}px"></div>`
                : `<div class="fq-reponse" style="left:${it.rep.x * k}px; top:${it.rep.y * k}px; width:${it.rep.w * k}px"></div>`;
        }
    }
    return html;
}

/** L'en-tête d'une page d'aperçu (titre, Nom/Date, filet). */
export function apercuEntete(k, titre, sousTitre, note, page) {
    const P = page || A4;
    // LA CASE DE LA NOTE. Sur une interrogation, elle est le premier endroit
    // que regarde l'élève et le dernier que remplit le professeur : elle mérite
    // un cadre à elle, en haut à droite, pas une mention perdue dans une ligne
    // de texte. Le total du barème y est imprimé — « … / 20 » — pour que la
    // note se pose sans avoir à chercher sur combien elle compte.
    const cadre = note ? `
        <div class="fp-note-case" style="right:${P.marge * k}px; top:${(P.marge + 0.5) * k}px;
            width:${26 * k}px; height:${13 * k}px; font-size:${4.4 * k}px">… / ${echapper(String(note.sur))}</div>` : '';
    return `
        <div class="fp-entete" style="left:${P.marge * k}px; right:${(P.marge + (note ? 30 : 0)) * k}px; top:${(P.marge + 1) * k}px;">
            <b>${echapper(titre)}${sousTitre ? ' — ' + echapper(sousTitre) : ''}</b>
            <span>Nom : ............  Date : ......</span>
        </div>
        ${cadre}
        <div class="fp-ligne" style="left:${P.marge * k}px; right:${P.marge * k}px; top:${(P.marge + 9) * k}px;"></div>`;
}

// --- PDF ---------------------------------------------------------------------

export function entetePdf(pdf, titre, sousTitre, bareme, note, page) {
    const P = page || A4;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14.5);
    pdf.setTextColor(...ENCRE.texte);
    pdf.text(pourPdf(`${titre}${sousTitre ? ' — ' + sousTitre : ''}`), P.marge, P.marge + 6);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9.5);
    // La case de la note mange le coin droit : le « Nom / Date » se décale.
    const droite = P.w - P.marge - (note ? 30 : 0);
    pdf.text('Nom : ...........................   Date : ..............',
        droite, P.marge + 6, { align: 'right' });
    if (note) {
        pdf.setDrawColor(...ENCRE.trait);
        pdf.setLineWidth(0.5);
        pdf.roundedRect(P.w - P.marge - 26, P.marge + 0.5, 26, 13, 1.5, 1.5, 'S');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(13);
        pdf.setTextColor(...ENCRE.gris);
        pdf.text(`… / ${note.sur}`, P.w - P.marge - 13, P.marge + 8.6, { align: 'center' });
        pdf.setTextColor(...ENCRE.texte);
    }
    pdf.setDrawColor(...ENCRE.trait);
    pdf.setLineWidth(0.4);
    pdf.line(P.marge, P.marge + 9, P.w - P.marge, P.marge + 9);
    if (bareme) {
        pdf.setFontSize(8.6);
        pdf.setTextColor(...ENCRE.gris);
        pdf.text(pourPdf(bareme), P.marge, P.marge + 14);
    }
    pdf.setFontSize(6.5);
    pdf.setTextColor(160, 165, 175);
    pdf.text('Fiche générée par AtoutMath', P.w / 2, P.h - 4, { align: 'center' });
}

function pointilles(pdf, x, y, largeur) {
    pdf.setDrawColor(...ENCRE.pointille);
    pdf.setLineWidth(0.25);
    pdf.setLineDashPattern([0.7, 1.1], 0);
    pdf.line(x, y, x + largeur, y);
    pdf.setLineDashPattern([], 0);
}

/**
 * UN CHAMP DE SAISIE dans le PDF — un vrai champ de formulaire AcroForm, pas
 * un rectangle dessiné. L'élève ouvre le fichier, clique, tape sa réponse,
 * enregistre et rend le PDF : la fiche se remplit à l'écran sans imprimante.
 *
 * jsPDF fournit `AcroFormTextField` sur le module UMD (`window.jspdf`). S'il
 * manque — build allégé, version ancienne — on retombe sur les pointillés :
 * une fiche imprimable vaut mieux qu'une erreur au téléchargement.
 */
function champSaisie(pdf, rep, index) {
    const Champ = (typeof window !== 'undefined' && window.jspdf && window.jspdf.AcroFormTextField)
        || (pdf.AcroFormTextField);
    if (typeof Champ !== 'function' || typeof pdf.addField !== 'function') {
        pointilles(pdf, rep.x, rep.y, rep.w);
        return false;
    }
    const champ = new Champ();
    champ.Rect = [rep.x, rep.champY, rep.w, rep.h];
    // Le nom doit être UNIQUE dans le document : deux champs homonymes sont un
    // seul champ pour un lecteur PDF, et taper dans l'un remplit l'autre.
    champ.fieldName = rep.nom ? `${rep.nom}_${index}` : `reponse_${index}`;
    champ.fontSize = 10;
    champ.multiline = false;
    pdf.addField(champ);
    // Le champ lui-même n'a pas de bordure visible à l'impression : on pose un
    // trait sous lui, pour que la fiche imprimée reste utilisable au stylo.
    pointilles(pdf, rep.x, rep.champY + rep.h, rep.w);
    return true;
}

/** Les items d'une page, dans le PDF. */
export function pdfItems(pdf, page, o) {
    let nChamp = 0;
    for (const it of page.items) {
        if (it.type === 'exo') {
            pdf.setFillColor(...ENCRE.bandeau);
            pdf.setDrawColor(...ENCRE.bandeauTrait);
            pdf.setLineWidth(0.2);
            pdf.roundedRect(it.x, it.y, it.w, it.h, 1.2, 1.2, 'FD');
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(o.taille * 2.9);
            pdf.setTextColor(...ENCRE.texte);
            pdf.text(pourPdf(titreExo(it)), it.x + 3, it.y + it.h / 2 + o.taille * 0.42);
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
                pdf.text(pourPdf(ligne), it.x + 1, it.y + o.tailleConsigne + i * o.tailleConsigne * 1.45);
            });
            continue;
        }
        if (it.type === 'grille') {
            const r = RENDUS[it.cle];
            if (r) {
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(o.tailleConsigne * 2.83);
                pdf.setTextColor(...ENCRE.gris);
                if (it.n != null) pdf.text(`${it.n}.`, it.x, it.y - 1.2);
                r.pdfGrille(pdf, it.item, { x: it.x, y: it.y, taille: it.taille, boite: it.boite }, !!o.solution);
            }
            continue;
        }
        pdf.setTextColor(...ENCRE.texte);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(o.taille * 2.83);
        if (it.n != null) pdf.text(`${it.n}.`, it.x, it.y + o.taille);
        pdf.setFont('helvetica', 'normal');
        it.lignes.forEach((ligne, i) => {
            pdf.text(pourPdf(ligne), it.texteX, it.y + o.taille + i * o.interligne);
        });
        if (it.choix) {
            // LES CASES À COCHER SONT DESSINÉES, pas écrites. Le caractère ☐
            // n'existe pas dans les polices standard du PDF : il sortait en
            // deux glyphes de hasard, et emportait toute la ligne de choix
            // avec lui. Un carré tracé s'imprime partout et se coche mieux.
            pdf.setFontSize(o.taille * 2.5);
            const cote = o.taille * 0.82;
            let cx = it.texteX;
            for (const choix of it.choix) {
                const mot = pourPdf(String(choix));
                pdf.setDrawColor(...ENCRE.gris);
                pdf.setLineWidth(0.22);
                pdf.rect(cx, it.choixY + o.taille - cote, cote, cote, 'S');
                pdf.setTextColor(...ENCRE.gris);
                pdf.text(mot, cx + cote + 1.4, it.choixY + o.taille);
                cx += cote + 1.4 + pdf.getTextWidth(mot) + 4;
            }
            pdf.setTextColor(...ENCRE.texte);
        }
        if (it.rep) {
            if (o.champs) champSaisie(pdf, it.rep, ++nChamp);
            else pointilles(pdf, it.rep.x, it.rep.y, it.rep.w);
        }
    }
}
