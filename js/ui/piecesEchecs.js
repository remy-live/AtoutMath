// LES PIÈCES D'ÉCHECS, DESSINÉES — une seule définition, deux rendus.
//
// POURQUOI DES DESSINS ET PAS DES LETTRES. Une pastille marquée « C » se lit,
// mais elle ne se RECONNAÎT pas : l'élève doit traduire à chaque coup d'œil, et
// sur un diagramme de problème il passe son temps à relire les initiales au
// lieu de voir la position. Un cavalier dessiné se voit d'un coup.
//
// POURQUOI PAS LES SYMBOLES UNICODE (♞). À l'écran ils conviennent — c'est ce
// qu'utilise le jeu de plateau. Mais la police du PDF est en WinAnsi : ♞ n'y
// existe pas et sort en « ? ». Une fiche imprimée avec des points
// d'interrogation à la place des pièces ne sert à rien.
//
// D'OÙ CE MODULE. Chaque pièce est une liste de FORMES SIMPLES — cercles,
// polygones, rectangles — décrites dans un carré unité (0 à 1). Deux
// traducteurs les rendent : l'un en SVG pour l'aperçu à l'écran, l'autre avec
// les primitives de jsPDF pour l'impression. Les deux lisent la MÊME
// description : un dessin corrigé l'est des deux côtés, et l'aperçu ne peut
// pas mentir sur ce qui sortira de l'imprimante.
//
// Les pièces blanches sont blanches à trait noir, les noires sont pleines. Les
// détails intérieurs (la fente du fou, l'œil du cavalier) se dessinent dans la
// couleur opposée pour rester visibles sur les deux.

import { dessinerCheminPdf, deroulerChemin } from './cheminSvg.js';
import { PIECES_IMPORTEES, CADRE_IMPORTE, MENTION_PIECES } from './piecesImportees.js';

export { MENTION_PIECES };

/**
 * @typedef {{k:'cercle', c:[number,number], r:number, creux?:boolean}
 *   | {k:'poly', p:number[][], creux?:boolean}
 *   | {k:'rect', x:number, y:number, w:number, h:number, creux?:boolean}} Forme
 *
 * `creux` : la forme se dessine dans la couleur OPPOSÉE au corps de la pièce —
 * c'est ainsi qu'un détail reste visible sur une pièce noire comme blanche.
 */

/** Le socle, commun à toutes les pièces : c'est ce qui les fait « tenir ». */
const SOCLE = { k: 'poly', p: [[0.20, 0.88], [0.80, 0.88], [0.74, 0.80], [0.26, 0.80]] };

/** @type {Record<string, Forme[]>} */
export const DESSINS = {
    // LE PION : une tête ronde, un col, une jupe. La plus petite silhouette.
    P: [
        SOCLE,
        { k: 'poly', p: [[0.36, 0.46], [0.64, 0.46], [0.72, 0.80], [0.28, 0.80]] },
        { k: 'rect', x: 0.34, y: 0.42, w: 0.32, h: 0.06 },
        { k: 'cercle', c: [0.50, 0.30], r: 0.14 }
    ],

    // LA TOUR : un corps droit et des créneaux. Les créneaux sont LE signe —
    // sans eux on croit voir un pion.
    R: [
        SOCLE,
        { k: 'poly', p: [[0.30, 0.42], [0.70, 0.42], [0.74, 0.80], [0.26, 0.80]] },
        {
            k: 'poly',
            p: [[0.24, 0.42], [0.24, 0.18], [0.35, 0.18], [0.35, 0.26], [0.44, 0.26],
                [0.44, 0.18], [0.56, 0.18], [0.56, 0.26], [0.65, 0.26], [0.65, 0.18],
                [0.76, 0.18], [0.76, 0.42]]
        }
    ],

    // LE FOU : une mitre fendue, surmontée d'une boule.
    B: [
        SOCLE,
        { k: 'poly', p: [[0.34, 0.52], [0.66, 0.52], [0.72, 0.80], [0.28, 0.80]] },
        { k: 'rect', x: 0.32, y: 0.48, w: 0.36, h: 0.06 },
        { k: 'poly', p: [[0.50, 0.16], [0.68, 0.38], [0.62, 0.50], [0.38, 0.50], [0.32, 0.38]] },
        { k: 'cercle', c: [0.50, 0.12], r: 0.055 },
        // La fente : c'est elle qui distingue le fou d'un pion géant.
        { k: 'poly', p: [[0.505, 0.245], [0.60, 0.355], [0.578, 0.378], [0.483, 0.268]], creux: true }
    ],

    // LE CAVALIER : un profil de cheval. Museau à gauche, crinière à droite,
    // une oreille pointue. C'est la seule pièce qui ne soit pas symétrique, et
    // c'est ce qui la rend reconnaissable d'un coup d'œil.
    N: [
        SOCLE,
        {
            // Le profil, tourné vers la GAUCHE : encolure, gorge, museau qui
            // avance, front, UNE oreille, puis la crinière qui redescend. Deux
            // pointes en haut faisaient deux oreilles et plus aucun museau —
            // on ne reconnaissait plus rien.
            k: 'poly',
            p: [[0.28, 0.80], [0.30, 0.60], [0.24, 0.52], [0.17, 0.47], [0.15, 0.39],
                [0.24, 0.35], [0.34, 0.29], [0.43, 0.23], [0.47, 0.20], [0.50, 0.09],
                [0.57, 0.23], [0.68, 0.35], [0.75, 0.52], [0.75, 0.68], [0.72, 0.80]]
        },
        { k: 'cercle', c: [0.36, 0.38], r: 0.028, creux: true }
    ],

    // LA DAME : une couronne à pointes, chacune surmontée d'une perle.
    Q: [
        SOCLE,
        { k: 'poly', p: [[0.30, 0.50], [0.70, 0.50], [0.76, 0.80], [0.24, 0.80]] },
        {
            k: 'poly',
            p: [[0.22, 0.50], [0.18, 0.22], [0.32, 0.38], [0.42, 0.18], [0.50, 0.38],
                [0.58, 0.18], [0.68, 0.38], [0.82, 0.22], [0.78, 0.50]]
        },
        { k: 'cercle', c: [0.18, 0.20], r: 0.055 },
        { k: 'cercle', c: [0.42, 0.15], r: 0.055 },
        { k: 'cercle', c: [0.58, 0.15], r: 0.055 },
        { k: 'cercle', c: [0.82, 0.20], r: 0.055 }
    ],

    // LE ROI : la couronne, et surtout LA CROIX. C'est à la croix qu'on le
    // reconnaît, jamais à sa taille.
    K: [
        SOCLE,
        { k: 'poly', p: [[0.30, 0.50], [0.70, 0.50], [0.76, 0.80], [0.24, 0.80]] },
        { k: 'poly', p: [[0.26, 0.50], [0.30, 0.30], [0.50, 0.40], [0.70, 0.30], [0.74, 0.50]] },
        { k: 'rect', x: 0.455, y: 0.06, w: 0.09, h: 0.26 },
        { k: 'rect', x: 0.37, y: 0.13, w: 0.26, h: 0.08 }
    ]
};

export const TYPES = Object.keys(DESSINS);

/**
 * LE CADRAGE COMMUN — pourquoi les pièces paraissaient petites.
 *
 * Chaque dessin laisse du vide autour de lui dans son carré unité : le socle
 * va de 0,20 à 0,80, le sommet commence vers 0,06. Une pièce posée à 92 % de
 * sa case n'occupait donc que les deux tiers de la case, et sur un téléphone
 * elle flottait.
 *
 * On mesure ici, une fois pour toutes, la boîte qui contient TOUTE la série,
 * et les deux rendus s'y recalent. Un seul cadre pour les six pièces : les
 * tailles relatives sont conservées — un pion reste plus petit qu'un roi —
 * mais l'ensemble remplit vraiment la case.
 */
const CADRE = (() => {
    let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
    const point = (u, v) => { x0 = Math.min(x0, u); x1 = Math.max(x1, u); y0 = Math.min(y0, v); y1 = Math.max(y1, v); };
    Object.values(DESSINS).forEach(formes => formes.forEach(f => {
        if (f.k === 'cercle') { point(f.c[0] - f.r, f.c[1] - f.r); point(f.c[0] + f.r, f.c[1] + f.r); }
        else if (f.k === 'rect') { point(f.x, f.y); point(f.x + f.w, f.y + f.h); }
        else f.p.forEach(([u, v]) => point(u, v));
    }));
    const k = 1 / Math.max(x1 - x0, y1 - y0);
    return {
        // Recale et agrandit, en gardant le dessin centré dans sa case.
        u: (u) => (u - x0) * k + (1 - (x1 - x0) * k) / 2,
        v: (v) => (v - y0) * k + (1 - (y1 - y0) * k) / 2,
        k
    };
})();

const CORPS_BLANC = [255, 255, 255];
const CORPS_NOIR = [38, 45, 58];
const TRAIT = [17, 24, 39];

const hex = (c) => `#${c.map(v => v.toString(16).padStart(2, '0')).join('')}`;

/**
 * Une pièce en SVG, posée dans le carré (x, y, cote).
 * @param {string} type - K Q R B N P
 * @param {boolean} noir
 */
export function pieceSvg(type, noir, x, y, cote, trait = 0.035) {
    const importee = PIECES_IMPORTEES && PIECES_IMPORTEES[`${type}${noir ? 'n' : 'b'}`];
    if (importee) return pieceImporteeSvg(importee, x, y, cote);
    const formes = DESSINS[type] || DESSINS.P;
    const corps = noir ? CORPS_NOIR : CORPS_BLANC;
    const oppose = noir ? CORPS_BLANC : CORPS_NOIR;
    const X = (u) => (x + CADRE.u(u) * cote).toFixed(2);
    const Y = (v) => (y + CADRE.v(v) * cote).toFixed(2);
    const L = (t) => (t * CADRE.k * cote).toFixed(2);
    return formes.map(f => {
        const remplir = hex(f.creux ? oppose : corps);
        const bord = hex(f.creux ? oppose : TRAIT);
        // LE TRAIT D'UN DÉTAIL CREUX EST DE SA PROPRE COULEUR : il ne cerne
        // pas la forme, il l'ÉLARGIT. À pleine épaisseur, la fente du fou
        // doublait de largeur et se lisait comme une tache blanche.
        const e = ((f.creux ? trait * 0.35 : trait) * cote).toFixed(2);
        if (f.k === 'cercle') {
            return `<circle cx="${X(f.c[0])}" cy="${Y(f.c[1])}" r="${L(f.r)}"
                fill="${remplir}" stroke="${bord}" stroke-width="${e}"/>`;
        }
        if (f.k === 'rect') {
            return `<rect x="${X(f.x)}" y="${Y(f.y)}" width="${L(f.w)}"
                height="${L(f.h)}" fill="${remplir}" stroke="${bord}"
                stroke-width="${e}"/>`;
        }
        const points = f.p.map(([u, v]) => `${X(u)},${Y(v)}`).join(' ');
        return `<polygon points="${points}" fill="${remplir}" stroke="${bord}"
            stroke-width="${e}" stroke-linejoin="round"/>`;
    }).join('');
}

/**
 * LE JEU IMPORTÉ — des chemins SVG, recalés dans la case.
 *
 * On garde les couleurs du fichier : un jeu de pièces sérieux distingue le
 * blanc du noir par le remplissage ET par des traits intérieurs, et les
 * remplacer par nos deux couleurs effacerait la moitié du dessin.
 */
function repereImporte(x, y, cote) {
    const c = CADRE_IMPORTE;
    const k = cote / Math.max(c.x1 - c.x0, c.y1 - c.y0);
    // Centré dans la case, et à la même échelle pour les douze pièces : un
    // pion reste plus petit qu'un roi.
    const mx = (cote - (c.x1 - c.x0) * k) / 2;
    const my = (cote - (c.y1 - c.y0) * k) / 2;
    return (u, v) => [x + mx + (u - c.x0) * k, y + my + (v - c.y0) * k];
}

function pieceImporteeSvg(piece, x, y, cote) {
    const placer = repereImporte(x, y, cote);
    const c = CADRE_IMPORTE;
    const k = cote / Math.max(c.x1 - c.x0, c.y1 - c.y0);
    return piece.formes.map(f => {
        const d = deroulerChemin(f.d, placer).map(sc => {
            let t = `M ${sc.depart[0].toFixed(2)} ${sc.depart[1].toFixed(2)}`;
            sc.pas.forEach(p => {
                t += p.l ? ` L ${p.l[0].toFixed(2)} ${p.l[1].toFixed(2)}`
                    : ` C ${p.c.map(v => v.toFixed(2)).join(' ')}`;
            });
            return t + (sc.ferme ? ' Z' : '');
        }).join(' ');
        const e = ((f.largeur || 1.5) * k).toFixed(2);
        return `<path d="${d}" fill="${f.remplit ? (f.fill || '#fff') : 'none'}"
            stroke="${f.stroke || '#000'}" stroke-width="${e}"
            stroke-linejoin="round" stroke-linecap="round"/>`;
    }).join('');
}

/**
 * La même pièce, dessinée dans un PDF jsPDF.
 *
 * jsPDF n'a pas de « polygone » : `lines` prend une suite de DÉPLACEMENTS
 * relatifs depuis un point de départ, et sait refermer le contour. On convertit
 * donc les sommets en écarts successifs — c'est la seule subtilité du module.
 */
export function dessinerPiecePdf(doc, type, noir, x, y, cote, epaisseur = 0.22) {
    const importee = PIECES_IMPORTEES && PIECES_IMPORTEES[`${type}${noir ? 'n' : 'b'}`];
    if (importee) {
        const placer = repereImporte(x, y, cote);
        const c = CADRE_IMPORTE;
        const k = cote / Math.max(c.x1 - c.x0, c.y1 - c.y0);
        importee.formes.forEach(f => {
            doc.setFillColor(...couleurPdf(f.fill, [255, 255, 255]));
            doc.setDrawColor(...couleurPdf(f.stroke, TRAIT));
            doc.setLineWidth(Math.max(0.08, (f.largeur || 1.5) * k));
            dessinerCheminPdf(doc, f.d, placer, f.remplit ? 'FD' : 'S');
        });
        return;
    }
    const formes = DESSINS[type] || DESSINS.P;
    const corps = noir ? CORPS_NOIR : CORPS_BLANC;
    const oppose = noir ? CORPS_BLANC : CORPS_NOIR;
    formes.forEach(f => {
        const remplir = f.creux ? oppose : corps;
        const bord = f.creux ? oppose : TRAIT;
        // Même raison qu'en SVG : un détail creux ne se cerne pas, il se pose.
        doc.setLineWidth(f.creux ? epaisseur * 0.35 : epaisseur);
        // ORDRE IMPORTANT : dans jsPDF, `setTextColor` et `setDrawColor`
        // touchent des états distincts, mais le remplissage doit être redit
        // avant CHAQUE forme — un appel intermédiaire peut l'avoir changé.
        doc.setFillColor(...remplir);
        doc.setDrawColor(...bord);
        const X = (u) => x + CADRE.u(u) * cote;
        const Y = (v) => y + CADRE.v(v) * cote;
        const L = (t) => t * CADRE.k * cote;
        if (f.k === 'cercle') {
            doc.circle(X(f.c[0]), Y(f.c[1]), L(f.r), 'FD');
            return;
        }
        if (f.k === 'rect') {
            doc.rect(X(f.x), Y(f.y), L(f.w), L(f.h), 'FD');
            return;
        }
        const pts = f.p.map(([u, v]) => [X(u), Y(v)]);
        const ecarts = [];
        for (let i = 1; i < pts.length; i++) {
            ecarts.push([pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]]);
        }
        doc.lines(ecarts, pts[0][0], pts[0][1], [1, 1], 'FD', true);
    });
}

/** « #ffffff », « #fff », « white », « none » → un triplet pour jsPDF. */
function couleurPdf(v, defaut) {
    if (!v || v.toLowerCase() === 'none') return defaut;
    const t = v.trim().toLowerCase();
    const noms = { white: [255, 255, 255], black: [0, 0, 0], none: defaut };
    if (noms[t]) return noms[t];
    const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(t);
    if (!m) return defaut;
    const h = m[1].length === 3 ? m[1].split('').map(c => c + c).join('') : m[1];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Le nom français d'une pièce — pour les phrases et les corrections. */
export const NOMS = {
    K: { nom: 'roi', lettre: 'R' },
    Q: { nom: 'dame', lettre: 'D', feminin: true },
    R: { nom: 'tour', lettre: 'T', feminin: true },
    B: { nom: 'fou', lettre: 'F' },
    N: { nom: 'cavalier', lettre: 'C' },
    P: { nom: 'pion', lettre: 'P' }
};

/** « la tour noire », « le cavalier blanc » : le genre suit la pièce. */
export function direPiece(type, noir) {
    const p = NOMS[type];
    return p.feminin
        ? `la ${p.nom} ${noir ? 'noire' : 'blanche'}`
        : `le ${p.nom} ${noir ? 'noir' : 'blanc'}`;
}
