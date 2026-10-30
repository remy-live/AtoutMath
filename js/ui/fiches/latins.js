// LES CARRÉS LATINS À RONDS — Strimko et Approxdoku, sur le papier.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, dans sa revue du catalogue : ces deux grilles n'avaient pas de version
// imprimée. Ce sont pourtant les deux casse-tête qu'on distribue le plus
// volontiers en début d'heure, et un élève qui n'a pas d'écran n'y avait pas
// accès du tout.
//
// ── CE QUI CHANGE ENTRE L'ÉCRAN ET LA FEUILLE : LA COULEUR ────────────────
//
// À l'écran, les quatre ruisseaux d'un Strimko sont de QUATRE COULEURS, et
// c'est ainsi qu'on les distingue. Une feuille passe à la photocopieuse : les
// sept teintes y deviennent quatre gris, dont deux se ressemblent.
//
// On ne peut donc pas transposer. Mais on n'a pas non plus à inventer : un
// ruisseau est un CHEMIN, et un chemin se suit du doigt. La feuille dessine
// donc chaque ruisseau comme une BANDE ÉPAISSE qui passe sous les ronds — on
// la suit de rond en rond, exactement comme on suit un fil. C'est d'ailleurs
// ainsi que les Strimko sont imprimés dans les recueils.
//
// Les ronds sont posés PAR-DESSUS, remplis de blanc : la bande passe derrière
// et le chiffre reste lisible. L'ordre de dessin est donc le sujet, et c'est
// pour cela qu'il est écrit ici.
//
// ── ET L'APPROXDOKU : LA CAPSULE EST L'ÉNONCÉ ─────────────────────────────
//
// Sans la capsule, une chaîne « 2 + 3 ≈ 4 × 1 » n'est qu'une rangée de ronds :
// rien ne dit où elle commence ni où elle s'arrête, et le « ≈ » du milieu ne
// sépare plus rien. La capsule est donc dessinée, et les opérateurs vont
// EXACTEMENT entre deux ronds — c'est ce que fait l'écran, où les ronds
// occupent les pistes impaires et les opérateurs les pistes paires.

import { boiteDe, echapperSheet } from './socle.js';
// `pourPdf` : la translittération des caractères que les polices d'un PDF
// ne portent pas. Voir l'opérateur de l'Approxdoku, plus bas.
// `polycopieEnVraieCouleur` décide de la couleur des ruisseaux — voir
// `encreDuRuisseau`.
import { polycopieEnVraieCouleur, pourPdf } from '../ficheRendu.js';
// L'encre vient du module feuille — voir `fiches/encre.js`.
import { GRIS, TRAIT } from './encre.js';

/** Le gris des bandes de ruisseau : visible, mais dessous. */
const BANDE = [218, 222, 232];

/**
 * ET QUAND ON MET DE LA COULEUR DANS L'IMPRIMANTE, ON MET LES COULEURS.
 *
 * RÉMY : « pour le strimko, quand on choisit les coulerus pour l'impression,
 * ca ne met pas les couleurs. »
 *
 * Il a raison, et le commentaire en tête de ce fichier disait pourquoi sans
 * s'en apercevoir : il explique que la feuille ne peut pas transposer les sept
 * teintes de l'écran PARCE QU'ELLE PASSE À LA PHOTOCOPIEUSE. C'est vrai de la
 * photocopieuse — ce n'est pas vrai de l'imprimante couleur du professeur, ni
 * d'une affiche qu'on projette. La bande grise était donc dessinée en gris
 * QUOI QU'ON COCHE, et le sélecteur ne servait à rien sur cette feuille.
 *
 * Le filtre général (`teindreHtml`, `teindreDoc`) ne pouvait rien y faire : il
 * DÉSATURE ce que le rendu a posé, il n'invente pas une couleur qui n'a jamais
 * été écrite. C'est la règle de la maison, écrite en tête de `encre()` — la
 * distinction se décide là où l'on SAIT ce qu'on dessine. Les trèfles ont payé
 * exactement la même friction trois semaines plus tôt (`casseTete.js`).
 *
 * LES SEPT TEINTES SONT CELLES DE L'ÉCRAN, relevées dans `css/modules.css`
 * (`.st-ruisseau--0` à `--6`) : un Strimko de la feuille et un Strimko du jeu
 * doivent être le même Strimko. Pâles à dessein — là aussi c'est l'écran qui
 * décide —, parce que le chiffre de l'élève s'écrit par-dessus et que c'est
 * LUI qu'on doit lire en premier.
 *
 * DEUX MODES SEULEMENT, ET LE GRIS N'EN EST PAS — c'est la question que
 * `polycopieEnVraieCouleur` pose, et c'est ici qu'elle s'est formulée. En
 * « Niveaux de gris », les sept pastels repassent par `encre()` et tombent
 * entre 160 et 210 : sept gris clairs qu'on ne distingue pas, à la place d'UNE
 * bande franche qui se suit du doigt. On garderait la lettre de la demande en
 * perdant ce qu'elle cherche. La couleur est donc pour « Couleur » et
 * « Affiche », et la photocopieuse garde sa bande.
 *
 * ET LA COULEUR NE PORTE TOUJOURS RIEN TOUTE SEULE : c'est le CHEMIN qui dit
 * l'appartenance, la couleur ne fait que reposer l'œil. Un élève daltonien lit
 * la feuille en couleur exactement comme la feuille grise.
 */
const TEINTES_RUISSEAU = [
    [191, 219, 254], [254, 215, 170], [187, 247, 208], [233, 213, 255],
    [254, 205, 211], [253, 230, 138], [165, 243, 252]
];

/** L'encre de la bande du ruisseau n° i. */
function encreDuRuisseau(i) {
    if (!polycopieEnVraieCouleur()) return BANDE;
    // LE MODULO N'EST PAS DE LA PRUDENCE DÉCORATIVE : l'écran déclare sept
    // teintes parce qu'une grille va jusqu'à sept ruisseaux. Si le générateur
    // en produit huit un jour, la huitième bande reprend la première au lieu de
    // sortir en `rgb(undefined)` — c'est-à-dire en NOIR, par-dessus les ronds.
    return TEINTES_RUISSEAU[i % TEINTES_RUISSEAU.length];
}

/**
 * LA GÉOMÉTRIE D'UNE GRILLE À RONDS, pour les deux rendus.
 *
 * Carrée, centrée dans son bloc, et c'est tout le calcul : le reste du module
 * ne fait que poser des objets aux coordonnées que cette fonction rend.
 */
function plantDuCarre(item, slot, marge = 1.5) {
    const m = item.meta || {};
    const b = boiteDe(slot);
    const n = m.n || 4;
    // UN CARRÉ, PAS UN RECTANGLE. Une grille de ronds étirée se lit encore,
    // mais on n'y écrit plus droit : le chiffre d'une case haute et étroite
    // sort de son rond.
    const cote = Math.min(b.w, b.h - marge * 2) / n;
    const x0 = b.x + (b.w - cote * n) / 2;
    const y0 = b.y + marge + (b.h - marge * 2 - cote * n) / 2;
    return {
        m, b, n, cote, x0, y0,
        /** Le centre du rond (r, c). */
        C: (r, c) => ({ x: x0 + (c + 0.5) * cote, y: y0 + (r + 0.5) * cote }),
        rayon: cote * 0.36,
        taille: Math.min(cote * 0.46, 6)
    };
}

/** Le chiffre d'une case : la donnée, la solution, ou rien. */
function chiffreDe(g, r, c, solution) {
    const m = g.m;
    const donnee = (m.donnees || []).find(d => d.r === r && d.c === c);
    if (donnee) return { v: donnee.v, gras: true };
    if (solution && m.solution) {
        const v = Array.isArray(m.solution[r]) ? m.solution[r][c] : null;
        if (v != null) return { v, gras: false };
    }
    return null;
}

// ── LE STRIMKO ──────────────────────────────────────────────────────────────

/**
 * LES BANDES DES RUISSEAUX, en segments de centre à centre.
 *
 * Un ruisseau est une suite de cases voisines ; la bande est la polyligne qui
 * joint leurs centres. On la rend en SEGMENTS plutôt qu'en polyligne pour que
 * jsPDF et le SVG en tracent exactement les mêmes : jsPDF n'a pas de
 * `polyline`, et deux descriptions à tenir d'accord finissent par diverger.
 *
 * CHAQUE SEGMENT PORTE SON ENCRE, et non son numéro de ruisseau : les deux
 * rendus posaient jusqu'ici la couleur UNE FOIS avant la boucle, et c'est
 * précisément ce qui ne marche plus quand elle change d'un ruisseau à l'autre.
 * La décider ici, c'est la décider une seule fois pour le SVG et pour le PDF.
 */
function bandesDuStrimko(g) {
    const out = [];
    (g.m.ruisseaux || []).forEach((ruisseau, i) => {
        const encreBande = encreDuRuisseau(i);
        for (let j = 0; j + 1 < ruisseau.length; j++) {
            out.push({
                p: g.C(ruisseau[j].r, ruisseau[j].c),
                q: g.C(ruisseau[j + 1].r, ruisseau[j + 1].c),
                encre: encreBande
            });
        }
    });
    return out;
}

function strimkoPreviewHtml(item, slot, k, solution) {
    const g = plantDuCarre(item, slot);
    const mm = (v) => (v * k).toFixed(2);
    let d = '';
    // 1. LES BANDES D'ABORD : elles passent DERRIÈRE les ronds. Dessinées
    //    après, elles barreraient les chiffres.
    bandesDuStrimko(g).forEach(({ p, q, encre: e }) => {
        d += `<line x1="${mm(p.x)}" y1="${mm(p.y)}" x2="${mm(q.x)}" y2="${mm(q.y)}"
            stroke="rgb(${e.join(',')})" stroke-width="${mm(g.rayon * 1.5)}"
            stroke-linecap="round"/>`;
    });
    // 2. PUIS LES RONDS, remplis de blanc.
    for (let r = 0; r < g.n; r++) for (let c = 0; c < g.n; c++) {
        const p = g.C(r, c);
        const ch = chiffreDe(g, r, c, solution);
        d += `<circle cx="${mm(p.x)}" cy="${mm(p.y)}" r="${mm(g.rayon)}"
            fill="#fff" stroke="rgb(${TRAIT.join(',')})" stroke-width="${mm(0.3)}"/>`;
        if (ch) {
            d += `<text x="${mm(p.x)}" y="${mm(p.y + g.taille * 0.35)}" text-anchor="middle"
                font-size="${mm(g.taille)}" ${ch.gras ? 'font-weight="700" ' : ''}
                fill="rgb(${TRAIT.join(',')})">${echapperSheet(ch.v)}</text>`;
        }
    }
    return `<svg class="fx-abs" style="position:absolute; left:0; top:0; overflow:visible"
        width="1" height="1">${d}</svg>`;
}

function dessinerStrimkoPdf(doc, item, slot, solution, champ) {
    const g = plantDuCarre(item, slot);
    doc.setLineCap('round');
    doc.setLineWidth(g.rayon * 1.5);
    // L'ENCRE SE POSE DANS LA BOUCLE, pas avant : voir `bandesDuStrimko`.
    bandesDuStrimko(g).forEach(({ p, q, encre: e }) => {
        doc.setDrawColor(...e);
        doc.line(p.x, p.y, q.x, q.y);
    });

    doc.setLineCap('butt');
    for (let r = 0; r < g.n; r++) for (let c = 0; c < g.n; c++) {
        const p = g.C(r, c);
        const ch = chiffreDe(g, r, c, solution);
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...TRAIT);
        doc.setLineWidth(0.3);
        doc.circle(p.x, p.y, g.rayon, 'FD');
        if (ch) {
            doc.setFont('helvetica', ch.gras ? 'bold' : 'normal');
            doc.setFontSize(g.taille * 2.83);
            doc.setTextColor(...TRAIT);
            doc.text(String(ch.v), p.x, p.y + g.taille * 0.35, { align: 'center' });
        } else if (champ) {
            // La fiche remplissable : le champ tient DANS le rond, pas dans la
            // case — sans quoi il déborderait sur la bande du ruisseau.
            champ(p.x - g.rayon * 0.7, p.y - g.rayon * 0.7, g.rayon * 1.4, g.rayon * 1.4);
        }
    }
}

// ── L'APPROXDOKU ────────────────────────────────────────────────────────────

/**
 * LA CAPSULE ET SES OPÉRATEURS, pour une chaîne.
 *
 * L'opérateur n° k se pose EXACTEMENT entre le rond k et le rond k+1 : c'est
 * ce que fait l'écran avec ses pistes paires, et c'est la seule place où il ne
 * se lit pas comme appartenant à l'un des deux.
 */
function plantDeLEquation(g, eq) {
    const a = g.C(eq.cases[0].r, eq.cases[0].c);
    const z = g.C(eq.cases[eq.cases.length - 1].r, eq.cases[eq.cases.length - 1].c);
    const marge = g.rayon * 1.25;
    return {
        capsule: {
            x: Math.min(a.x, z.x) - marge, y: Math.min(a.y, z.y) - marge,
            w: Math.abs(z.x - a.x) + marge * 2, h: Math.abs(z.y - a.y) + marge * 2,
            r: marge
        },
        ops: (eq.ops || []).map((op, k) => {
            const p = g.C(eq.cases[k].r, eq.cases[k].c);
            const q = g.C(eq.cases[k + 1].r, eq.cases[k + 1].c);
            return { op, x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
        })
    };
}

function approxdokuPreviewHtml(item, slot, k, solution) {
    const g = plantDuCarre(item, slot);
    const mm = (v) => (v * k).toFixed(2);
    let d = '';
    // 1. LES CAPSULES, derrière tout le reste.
    (g.m.equations || []).forEach(eq => {
        const p = plantDeLEquation(g, eq);
        d += `<rect x="${mm(p.capsule.x)}" y="${mm(p.capsule.y)}"
            width="${mm(p.capsule.w)}" height="${mm(p.capsule.h)}"
            rx="${mm(p.capsule.r)}" fill="none"
            stroke="rgb(${GRIS.join(',')})" stroke-width="${mm(0.3)}"/>`;
    });
    // 2. LES RONDS.
    for (let r = 0; r < g.n; r++) for (let c = 0; c < g.n; c++) {
        const p = g.C(r, c);
        const ch = chiffreDe(g, r, c, solution);
        d += `<circle cx="${mm(p.x)}" cy="${mm(p.y)}" r="${mm(g.rayon)}"
            fill="#fff" stroke="rgb(${TRAIT.join(',')})" stroke-width="${mm(0.3)}"/>`;
        if (ch) {
            d += `<text x="${mm(p.x)}" y="${mm(p.y + g.taille * 0.35)}" text-anchor="middle"
                font-size="${mm(g.taille)}" ${ch.gras ? 'font-weight="700" ' : ''}
                fill="rgb(${TRAIT.join(',')})">${echapperSheet(ch.v)}</text>`;
        }
    }
    // 3. LES OPÉRATEURS PAR-DESSUS : ils tombent entre deux ronds, donc sur le
    //    bord de la capsule. Dessinés dessous, le trait de la capsule les
    //    barrerait.
    (g.m.equations || []).forEach(eq => {
        plantDeLEquation(g, eq).ops.forEach(o => {
            d += `<text x="${mm(o.x)}" y="${mm(o.y + g.taille * 0.3)}" text-anchor="middle"
                font-size="${mm(g.taille * 0.8)}" font-weight="700"
                fill="rgb(${TRAIT.join(',')})"
                stroke="#fff" stroke-width="${mm(0.55)}" paint-order="stroke"
                >${echapperSheet(o.op)}</text>`;
        });
    });
    return `<svg class="fx-abs" style="position:absolute; left:0; top:0; overflow:visible"
        width="1" height="1">${d}</svg>`;
}

function dessinerApproxdokuPdf(doc, item, slot, solution, champ) {
    const g = plantDuCarre(item, slot);
    doc.setDrawColor(...GRIS);
    doc.setLineWidth(0.3);
    (g.m.equations || []).forEach(eq => {
        const p = plantDeLEquation(g, eq).capsule;
        doc.roundedRect(p.x, p.y, p.w, p.h, p.r, p.r, 'S');
    });

    for (let r = 0; r < g.n; r++) for (let c = 0; c < g.n; c++) {
        const p = g.C(r, c);
        const ch = chiffreDe(g, r, c, solution);
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...TRAIT);
        doc.setLineWidth(0.3);
        doc.circle(p.x, p.y, g.rayon, 'FD');
        if (ch) {
            doc.setFont('helvetica', ch.gras ? 'bold' : 'normal');
            doc.setFontSize(g.taille * 2.83);
            doc.setTextColor(...TRAIT);
            doc.text(String(ch.v), p.x, p.y + g.taille * 0.35, { align: 'center' });
        } else if (champ) {
            champ(p.x - g.rayon * 0.7, p.y - g.rayon * 0.7, g.rayon * 1.4, g.rayon * 1.4);
        }
    }

    // LES OPÉRATEURS, SUR UNE PASTILLE BLANCHE. Ils tombent sur le trait de la
    // capsule ; sans le blanc dessous, le « ≈ » se lit « ≋ ».
    (g.m.equations || []).forEach(eq => {
        plantDeLEquation(g, eq).ops.forEach(o => {
            const demi = g.taille * 0.42;
            doc.setFillColor(255, 255, 255);
            doc.rect(o.x - demi, o.y - demi, demi * 2, demi * 2, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(g.taille * 0.8 * 2.83);
            doc.setTextColor(...TRAIT);
            // LE MOINS DES MATHÉMATIQUES PASSE PAR `pourPdf`, comme partout
            // ailleurs : U+2212 n'existe pas dans les polices standard d'un
            // PDF et s'imprimait en guillemet. Trouvé par l'épreuve
            // `feuillesDu12OctobreSoir`, qui lit ce que CHAQUE rendu écrit —
            // le balayage des caractères, lui, ne voit que les questions.
            doc.text(pourPdf(String(o.op)), o.x, o.y + g.taille * 0.3, { align: 'center' });
        });
    });
}

export const RENDUS_LATINS = {
    strimko: {
        titre: 'Strimko',
        consigne: (items) => {
            const n = (items[0] && items[0].meta.n) || 4;
            // LA CONSIGNE DIT LA COULEUR DE LA FEUILLE QU'ON TIENT. Elle disait
            // « la bande grise » même sur la feuille en couleur : un élève qui
            // cherche du gris sur une feuille qui n'en a pas cherche longtemps.
            const bande = polycopieEnVraieCouleur() ? 'la bande colorée' : 'la bande grise';
            return `Écris les nombres de 1 à ${n} dans les ronds : chacun une seule fois `
                + 'par LIGNE, une seule fois par COLONNE, et une seule fois par RUISSEAU — '
                + `le ruisseau est ${bande} qui relie les ronds entre eux.`;
        },
        previewGrille: strimkoPreviewHtml,
        pdfGrille: dessinerStrimkoPdf,
        nomBloc: 'Grille', nomBlocs: 'grilles',
        // QUATRE PAR PAGE. Une grille de Strimko est carrée et l'on écrit DANS
        // des ronds : sous huit millimètres de côté, le chiffre ne rentre plus
        // et l'élève écrit à côté. Six par page les ramenaient à sept.
        disposition: { cols: 2, rows: 2, maxCols: 3, maxRows: 3 },
        parLigneDefaut: 2,
        proportions: { w: 1, h: 1 }
    },
    approxdoku: {
        titre: 'Approxdoku',
        consigne: (items) => {
            const n = (items[0] && items[0].meta.n) || 4;
            return `Écris les nombres de 1 à ${n} dans les ronds : chacun une seule fois par `
                + 'ligne et par colonne. Chaque capsule est un calcul, et le « ≈ » ne veut PAS '
                + 'dire « égal » : il veut dire « à un près ». Les deux côtés se suivent — '
                + '6 et 5, 2 et 1 —, donc une égalité parfaite y est FAUSSE. Les priorités '
                + 's\'appliquent, et chaque étape tombe sur un entier positif.';
        },
        previewGrille: approxdokuPreviewHtml,
        pdfGrille: dessinerApproxdokuPdf,
        nomBloc: 'Grille', nomBlocs: 'grilles',
        // DEUX PAR PAGE, et c'est une grille de plus que le Strimko qui s'en
        // va. Un Approxdoku porte ses capsules EN DEHORS de la grille des
        // ronds — elles débordent d'un quart de case de chaque côté —, et
        // surtout il faut lire « 2 + 3 ≈ 4 × 1 » entre deux ronds : à quatre
        // par page l'opérateur tombe à deux millimètres.
        disposition: { cols: 2, rows: 1, maxCols: 2, maxRows: 2 },
        parLigneDefaut: 2,
        proportions: { w: 1, h: 1 }
    }
};
