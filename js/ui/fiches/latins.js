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
// L'encre vient du module feuille — voir `fiches/encre.js`.
import { GRIS, TRAIT } from './encre.js';

/** Le gris des bandes de ruisseau : visible, mais dessous. */
const BANDE = [218, 222, 232];

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
 */
function bandesDuStrimko(g) {
    const out = [];
    (g.m.ruisseaux || []).forEach(ruisseau => {
        for (let i = 0; i + 1 < ruisseau.length; i++) {
            out.push([g.C(ruisseau[i].r, ruisseau[i].c), g.C(ruisseau[i + 1].r, ruisseau[i + 1].c)]);
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
    bandesDuStrimko(g).forEach(([p, q]) => {
        d += `<line x1="${mm(p.x)}" y1="${mm(p.y)}" x2="${mm(q.x)}" y2="${mm(q.y)}"
            stroke="rgb(${BANDE.join(',')})" stroke-width="${mm(g.rayon * 1.5)}"
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
    doc.setDrawColor(...BANDE);
    doc.setLineWidth(g.rayon * 1.5);
    bandesDuStrimko(g).forEach(([p, q]) => doc.line(p.x, p.y, q.x, q.y));

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
            doc.text(String(o.op), o.x, o.y + g.taille * 0.3, { align: 'center' });
        });
    });
}

export const RENDUS_LATINS = {
    strimko: {
        titre: 'Strimko',
        consigne: (items) => {
            const n = (items[0] && items[0].meta.n) || 4;
            return `Écris les nombres de 1 à ${n} dans les ronds : chacun une seule fois `
                + 'par LIGNE, une seule fois par COLONNE, et une seule fois par RUISSEAU — '
                + 'le ruisseau est la bande grise qui relie les ronds entre eux.';
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
