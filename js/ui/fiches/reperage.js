// SE REPÉRER — repères, quadrillages, pavages, échiquiers.
//
// Une tranche de `printSheet.js`, découpée par `tools/decouperPrintSheet.mjs`.
// Tout ce qui est ici n'est utilisé QUE par les exercices de cette famille ;
// ce qui sert à plusieurs vit dans `socle.js`.

import {
    ENCRE, echapperSheet, geoQuadrillage, rvbCss
} from './socle.js';
import { SENS as SENS_ROTATION } from '../../core/transformations.js';
import { caseCentrale } from '../../core/quadrillageSvg.js';
import { dessinerPiecePdf, direPiece, pieceSvg } from '../piecesEchecs.js';
import { ecrireElement } from '../../core/elementSymetrie.js';
import { encre, polycopieEnCouleur, pourPdf } from '../ficheRendu.js';

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
    // LE CORPS DU TABLEAU, ÉCRIT UNE FOIS POUR LES DEUX RENDUS.
    //
    // Rémy : « écris les points dans le tableau un peu plus grand ». Il valait
    // un tiers de la hauteur d'un rang — deux millimètres huit sur un bloc de
    // huit centimètres —, et c'est pourtant la seule chose à LIRE du bloc : le
    // repère, lui, est vide tant que l'élève n'a rien tracé. Une case de rang
    // fait huit millimètres de haut et trois centimètres de large ; « A (5 ; 2) »
    // à 3,8 mm y tient largement, et se lit à bout de bras.
    const corpsTab = Math.max(2.4, hRang * 0.46);
    return {
        m, mini, pas, cote, listeH, cols, rows, hRang, corpsTab,
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
        font-size:${g.corpsTab * k}px">${cellules}</div>`;
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

    doc.setFontSize(g.corpsTab / 0.3528);
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
    const m = item.meta || {};
    // AUTANT DE LIGNES QUE DE QUESTIONS, ET LA GRILLE RECULE D'AUTANT.
    //
    // Rémy : « attention à ce que le texte n'aille pas sur le quadrillage ». Il
    // n'allait pas dessus, il allait DESSOUS — hors du bloc : la bande réservée
    // valait une ligne et demie, la question s'écrivait sur deux (l'énoncé, puis
    // les pointillés), et sur la dernière rangée de la feuille cela tombait sous
    // le bord de la page. Deux questions par pavage, maintenant, et l'on réserve
    // ce qu'on écrit vraiment.
    const quest = (m.questions && m.questions.length) ? m.questions : null;
    const lignes = quest ? quest.length : 1;
    const g = geoQuadrillage(item, slot, lignes * 2.2 + 0.6);
    return {
        ...g, quest, lignes,
        hQuestion: g.pt * 0.3528 * 2.2,
        yQuestion: g.boite.y + g.boite.h - g.pt * 0.3528 * (lignes * 2.2)
    };
}

function pavagePreviewHtml(item, slot, k, solution) {
    const g = geoPavage(item, slot);
    const m = g.m;
    let html = '';

    // AUCUNE PIÈCE N'EST DÉTOURÉE QUAND IL Y A PLUSIEURS QUESTIONS : le
    // détourage désignait la paire concernée, et il y en a maintenant deux. Les
    // lettres suffisent — c'est par elles que les questions les nomment.
    (m.pieces || []).forEach((cases, i) => {
        const vedette = g.lignes < 2 && (i === m.de || i === m.vers);
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

    const questions = g.quest || [{ de: m.de, vers: m.vers, idJuste: m.idJuste, bon: m.bon }];
    questions.forEach((q, i) => {
        const dit = solution ? solutionDuPavage(m, q)
            : `${(m.pieces || []).length ? questionDuPavage(m, q) : ''} ${'.'.repeat(20)}`;
        html += `<div style="position:absolute; left:${g.boite.x * k}px;
            top:${(g.yQuestion + i * g.hQuestion) * k}px; width:${g.boite.w * k}px;
            font-size:${(g.pt * 0.3528 * k).toFixed(2)}px; line-height:1.35;
            color:#2d3748">${dit}</div>`;
    });
    return html;
}

const questionDuPavage = (m, q = m) =>
    `${(m.noms || [])[q.vers]} est le symétrique de ${(m.noms || [])[q.de]} par rapport à :`;

/** Le corrigé : le nom du candidat ET ce qu'il vaut, pour qu'il se relise. */
const solutionDuPavage = (m, q = m) => {
    const juste = (m.candidats || []).find(c => c.id === q.idJuste);
    const el = q.bon || m.bon;
    const quoi = (el && el.genre) === 'axe' ? 'la droite' : 'le point';
    return `${(m.noms || [])[q.vers]} est le symétrique de ${(m.noms || [])[q.de]} par rapport à `
        + `${quoi} ${juste ? juste.nom : ''} : ${ecrireElement(m.hauteur, el)}.`;
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
        const vedette = g.lignes < 2 && (i === m.de || i === m.vers);
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
        if (g.lignes >= 2 || (i !== m.de && i !== m.vers)) return;
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
    const questions = g.quest || [{ de: m.de, vers: m.vers, idJuste: m.idJuste, bon: m.bon }];
    questions.forEach((q, i) => {
        const dit = solution ? solutionDuPavage(m, q)
            : `${questionDuPavage(m, q)} ${'.'.repeat(20)}`;
        doc.text(doc.splitTextToSize(pourPdf(dit), g.boite.w),
            g.boite.x, g.yQuestion + i * g.hQuestion + g.pt * 0.3528);
    });
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

export const RENDUS_REPERAGE = {
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
        //
        // C'était mesuré sur DEUX RANGÉES de deux. Rémy en demande quatre par
        // défaut, et quatre en une seule rangée ne coûtent pas la même chose :
        // 6,5 cm de côté au lieu de 13,7 — des cases de 8 mm sur une grille de
        // cinq, mesuré. `colonnesPapier` le dit sur l'exercice.
        disposition: { cols: 2, rows: 1, maxCols: 3, maxRows: 3 },
        parLigneDefaut: 2
    },
};
