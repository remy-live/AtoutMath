// LES GRILLES À REMPLIR — logique pure, un crayon suffit.
//
// Une tranche de `printSheet.js`, découpée par `tools/decouperPrintSheet.mjs`.
// Tout ce qui est ici n'est utilisé QUE par les exercices de cette famille ;
// ce qui sert à plusieurs vit dans `socle.js`.

import {
    ENCRE, boiteDe, echapperSheet, largeurTexte
} from './socle.js';
import { ajusterAuCarre, boiteDe as boiteCaseDomino, cellulesDe, cheminSerpentin, insecable } from '../../core/dominos.js';
import { encre, pourPdf } from '../ficheRendu.js';

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

/** La hauteur qu'occupe l'énigme (titre, décor, indices numérotés) à cette largeur. */
/**
 * Le corps du texte de l'énigme, en points, pour un bloc de cette largeur.
 *
 * Fixé à 8 pt, il convenait à un bloc de parcours large de six centimètres ;
 * sur une fiche autonome, où le bloc fait une demi-page paysage, l'histoire
 * s'écrivait en pattes de mouche sous une grille de deux centimètres de case.
 */
const policeTexteLogi = (largeur) => Math.min(Math.max(8, largeur * 0.075), 11.5);

function hauteurTexteLogi(p, largeur, corps) {
    const pt = corps || policeTexteLogi(largeur);
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

    // LA COLONNE DE TEXTE NE PREND JAMAIS PLUS DE LA MOITIÉ DU BLOC.
    //
    // Son plancher valait 58 mm quelle que soit la largeur du bloc. Sur une
    // planche de trois colonnes — celle que Rémy demande —, le bloc en fait 89
    // : il en restait 25 pour la grille, soit des cases de quatre millimètres
    // où l'on doit cocher et barrer. Rémy : « les logigrammes vont sur les
    // textes, tu pourrais les faire un peu plus grands ». Le plancher est donc
    // relatif : la moitié du bloc, jamais plus, et la grille prend le reste.
    const texteW = Math.max(Math.min(58, boite.w * 0.5), Math.min(boite.w * 0.44, 118));
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
    // ET LA GRILLE NE DÉPASSE PAS NON PLUS. `ajuster` converge en deux passes,
    // ce qui suffit presque toujours : la bande d'étiquettes grandit avec les
    // cases, et si la dernière passe la fait grandir encore, la somme
    // « bandeau + bande + cases » repasse au-dessus de la place. Douze pixels
    // de trop, et le bandeau des lignes s'imprimait sur la rangée suivante.
    // On finit donc par une vérification, qui ne peut que réduire.
    const placeH = boite.h - (empile ? texteH + 3 : 0);
    let cote = Math.max(3, empile ? coteB : coteA);
    for (let i = 0; i < 4 && bandeau + bandeDe(cote) + ny * cote > placeH; i++) {
        cote = Math.max(3, (placeH - bandeau - bandeDe(cote)) / ny);
    }
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
        // ET IL NE DÉPASSE PAS DU BLOC. La hauteur du texte se mesurait sur la
        // largeur du BLOC, alors qu'en côte à côte il s'écrit dans une colonne
        // deux fois plus étroite : deux fois plus de lignes, et l'histoire du
        // premier logigramme descendait par-dessus le titre du quatrième. On
        // rétrécit donc le corps jusqu'à ce que le texte tienne dans la place
        // qu'il a — la même règle que partout ailleurs sur cette feuille, et
        // celle qui manquait ici.
        pt: corpsTexteLogi(p, indicesW, empile ? texteH : boite.h)
    };
}

/**
 * LE CORPS QUI FAIT TENIR L'HISTOIRE ET SES INDICES DANS LA PLACE DONNÉE.
 *
 * On part de ce que la largeur permet, et l'on descend tant que ça déborde —
 * jamais sous sept points, en dessous desquels un indice ne se lit plus.
 */
function corpsTexteLogi(p, largeur, hauteur) {
    let pt = policeTexteLogi(largeur);
    for (let i = 0; i < 8 && pt > 7 && hauteurTexteLogi(p, largeur, pt) > hauteur; i++) {
        pt *= 0.92;
    }
    return Math.max(7, pt);
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

// --- LE HASHI SUR PAPIER --------------------------------------------------------
//
// Rémy : « je voulais le hashi ». C'est un puzzle de journal : des îles, des
// chiffres, et de la place pour tirer des traits à la règle.
//
// LES ÎLES SONT DES CERCLES ÉPAIS, les ponts des traits fins. C'est ce qui
// permet de tracer par-dessus au crayon sans que la figure imprimée et celle de
// l'élève se confondent — et c'est aussi ce qui survit à la photocopie. Deux
// ponts se dessinent comme deux traits parallèles, écartés d'un tiers de case :
// serrés, ils font une barre épaisse qu'on ne sait plus compter.

function geoHashi(item, slot) {
    const m = item.meta;
    const b = boiteDe(slot);
    // ON CADRE SUR LES ÎLES, PAS SUR LA GRILLE. Le tirage laisse presque
    // toujours une bande vide en haut, en bas ou sur un côté : dessiner les
    // douze colonnes nominales, c'est payer ce vide en taille de cercle. On
    // mesure la boîte réellement occupée et l'on ajuste dessus — même leçon
    // que pour les figures d'angles.
    const xs = m.iles.map(i => i.x), ys = m.iles.map(i => i.y);
    const x1 = Math.min(...xs), y1 = Math.min(...ys);
    const cols = Math.max(...xs) - x1 + 1, lignes = Math.max(...ys) - y1 + 1;
    const pas = Math.min((b.w - 2) / cols, (b.h - 2) / lignes);
    const w = pas * cols, h = pas * lignes;
    const x0 = b.x + (b.w - w) / 2, y0 = b.y + (b.h - h) / 2;
    return {
        b, m, pas,
        // Le centre de la case (x, y) : c'est là que se pose une île.
        cx: (x) => x0 + (x - x1 + 0.5) * pas,
        cy: (y) => y0 + (y - y1 + 0.5) * pas,
        rayon: Math.max(1.6, pas * 0.34),
        ecart: pas * 0.16
    };
}

/** Les deux traits d'un pont, ou le seul : décalés de part et d'autre de l'axe. */
function traitsPont(g, e, n) {
    const A = g.m.iles[e.a], B = g.m.iles[e.b];
    const ax = g.cx(A.x), ay = g.cy(A.y), bx = g.cx(B.x), by = g.cy(B.y);
    const d = g.ecart;
    if (n === 2) {
        return e.dir === 'h'
            ? [[ax, ay - d, bx, by - d], [ax, ay + d, bx, by + d]]
            : [[ax - d, ay, bx - d, by], [ax + d, ay, bx + d, by]];
    }
    return [[ax, ay, bx, by]];
}

function hashiPreviewHtml(item, slot, k, solution) {
    const g = geoHashi(item, slot);
    const T = (v) => (v * k).toFixed(2);
    let d = '';
    if (solution) {
        g.m.aretes.forEach((e, i) => {
            const n = g.m.solution[i];
            if (!n) return;
            traitsPont(g, e, n).forEach(([x1, y1, x2, y2]) => {
                d += `<line x1="${T(x1)}" y1="${T(y1)}" x2="${T(x2)}" y2="${T(y2)}"
                    stroke="#2f855a" stroke-width="${T(0.45)}" stroke-linecap="round"/>`;
            });
        });
    }
    let html = `<svg class="fx-hs-svg" style="left:0; top:0; width:100%; height:100%">${d}</svg>`;
    g.m.iles.forEach(il => {
        const r = g.rayon;
        html += `<div class="fx-hs-ile" style="left:${T(g.cx(il.x) - r)}px; top:${T(g.cy(il.y) - r)}px;
            width:${T(2 * r)}px; height:${T(2 * r)}px; font-size:${T(r * 1.15)}px">${il.n}</div>`;
    });
    return html;
}

function dessinerHashiPdf(doc, item, slot, solution) {
    const g = geoHashi(item, slot);
    if (solution) {
        doc.setDrawColor(47, 133, 90);
        doc.setLineWidth(0.45);
        doc.setLineCap('round');
        g.m.aretes.forEach((e, i) => {
            const n = g.m.solution[i];
            if (!n) return;
            traitsPont(g, e, n).forEach(([x1, y1, x2, y2]) => doc.line(x1, y1, x2, y2));
        });
        doc.setLineCap('butt');
    }
    // LES ÎLES PAR-DESSUS, ET PLEINES DE BLANC : un pont qui s'arrête au bord
    // du cercle demanderait de connaître le rayon en chaque point ; un disque
    // blanc posé après coup fait le même travail et ne se trompe jamais.
    doc.setLineWidth(0.5);
    g.m.iles.forEach(il => {
        const x = g.cx(il.x), y = g.cy(il.y);
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...ENCRE.trait);
        doc.circle(x, y, g.rayon, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(Math.max(5, g.rayon * 2.6));
        doc.setTextColor(...ENCRE.trait);
        doc.text(String(il.n), x, y + g.rayon * 0.42, { align: 'center' });
    });
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
    // LES FONDS D'ABORD, LES TRAITS ENSUITE — et les fonds DÉBORDENT d'un
    // quart de millimètre.
    //
    // Rémy : « parfois en pdf, les carrés d'un carré ne sont pas collés, il y a
    // un petit vide ». Chaque case était peinte puis bordée dans la foulée
    // (`FD`) : deux cases données côte à côte laissaient voir, entre leurs deux
    // fonds, la bande blanche que le trait ne recouvre pas tout à fait — le
    // rendu d'un PDF arrondit chaque contour à sa façon, et un fond qui
    // s'arrête pile sur le contour laisse passer le papier.
    // En peignant tous les fonds d'abord, avec un léger recouvrement, puis tous
    // les traits par-dessus, il n'y a plus d'interstice possible.
    const debord = 0.25;
    doc.setFillColor(...ENCRE.donnee);
    for (let i = 0; i < cases.length; i++) {
        if (trous.includes(i)) continue;
        const x = slot.x + (i % n) * cote, y = slot.y + Math.floor(i / n) * cote;
        doc.rect(x - debord, y - debord, cote + debord * 2, cote + debord * 2, 'F');
    }
    for (let i = 0; i < cases.length; i++) {
        const x = slot.x + (i % n) * cote, y = slot.y + Math.floor(i / n) * cote;
        const trou = trous.includes(i);
        doc.setDrawColor(...ENCRE.trait);
        doc.setLineWidth(0.35);
        doc.rect(x, y, cote, cote, 'S');
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

// --- LE TASUKO SUR PAPIER ------------------------------------------------------
//
// Rémy : « Fais un tasuko. » Une grille de chiffres, un crayon pour relier les
// paires de voisines, et la bande des sommes à barrer au fur et à mesure.
// C'est la forme d'origine du jeu : l'écran n'y ajoute que la vérification.
//
// LA BANDE DES SOMMES N'EST PAS UNE DÉCORATION. À l'écran, la liste s'éteint
// toute seule ; sur le papier, c'est l'élève qui barre, et il lui faut donc de
// quoi barrer. Sans elle, il perd le fil au bout de six paires.
//
// LE CORRIGÉ DESSINE LES CAPSULES, il ne liste pas les additions : ce qu'on
// veut voir en corrigeant, c'est OÙ elles étaient — une liste ne se compare à
// rien. La capsule se calcule en unités de case, exactement comme à l'écran
// (voir games/tasuko.js), donc les deux dessins ne peuvent pas diverger.

function geoTasuko(item, slot) {
    const m = item.meta;
    const b = boiteDe(slot);
    // La bande des sommes mange le bas du bloc : on la réserve d'abord, et la
    // grille se dimensionne dans ce qui reste.
    const hBande = Math.min(b.h * 0.16, 9);
    const hGrille = b.h - hBande;
    // LA CASE SE DIMENSIONNE POUR UN CRAYON QUI ENTOURE, et c'est ce qui la
    // distingue d'une case où l'on écrit : le trait fait le tour de deux cases,
    // il lui faut de la place au bord.
    const cote = Math.min(b.w / m.l, hGrille / m.h, 12);
    const w = cote * m.l, h = cote * m.h;
    const n = m.n || Math.round((m.l * m.h) / 2);
    // Les pastilles de la bande : assez larges pour un nombre à deux chiffres,
    // et jamais plus hautes que la bande qui les porte.
    const pas = Math.min((b.w - 2) / n, hBande * 0.9, 7);
    return {
        m, b, cote, n, hBande, pas,
        x0: b.x + (b.w - w) / 2,
        y0: b.y + (hGrille - h) / 2,
        xBande: b.x + (b.w - pas * n) / 2,
        yBande: b.y + hGrille + (hBande - pas * 0.8) / 2,
        taille: Math.max(2, cote * 0.5),
        tailleBande: Math.max(1.7, pas * 0.5)
    };
}

/** Le rectangle arrondi qui entoure une addition, en millimètres. */
function capsuleTasuko(g, cases) {
    const xs = cases.map(([x]) => x), ys = cases.map(([, y]) => y);
    const marge = g.cote * 0.11;
    const x = g.x0 + Math.min(...xs) * g.cote + marge;
    const y = g.y0 + Math.min(...ys) * g.cote + marge;
    return {
        x, y,
        w: (Math.max(...xs) - Math.min(...xs) + 1) * g.cote - marge * 2,
        h: (Math.max(...ys) - Math.min(...ys) + 1) * g.cote - marge * 2,
        r: g.cote * 0.39
    };
}

function tasukoPreviewHtml(item, slot, k, solution) {
    const g = geoTasuko(item, slot);
    const T = (v) => (v * k).toFixed(2);
    let html = g.m.grille.map((ligne, y) => ligne.map((v, x) =>
        `<div class="fx-tk-case" style="left:${T(g.x0 + x * g.cote)}px;
            top:${T(g.y0 + y * g.cote)}px; width:${T(g.cote)}px; height:${T(g.cote)}px;
            font-size:${T(g.taille)}px">${v}</div>`).join('')).join('');
    // La bande des sommes à barrer.
    html += Array.from({ length: g.n }, (_, i) => i + 1).map(nb =>
        `<div class="fx-tk-somme" style="left:${T(g.xBande + (nb - 1) * g.pas)}px;
            top:${T(g.yBande)}px; width:${T(g.pas * 0.86)}px; height:${T(g.pas * 0.8)}px;
            font-size:${T(g.tailleBande)}px">${nb}</div>`).join('');
    if (solution) {
        html += g.m.solution.map(a => {
            const c = capsuleTasuko(g, a.cases);
            return `<div class="fx-tk-capsule" style="left:${T(c.x)}px; top:${T(c.y)}px;
                width:${T(c.w)}px; height:${T(c.h)}px; border-radius:${T(c.r)}px"></div>`;
        }).join('');
    }
    return html;
}

function dessinerTasukoPdf(doc, item, slot, solution) {
    const g = geoTasuko(item, slot);
    doc.setLineWidth(0.25);
    doc.setDrawColor(...ENCRE.grille);
    g.m.grille.forEach((ligne, y) => ligne.forEach((v, x) => {
        doc.rect(g.x0 + x * g.cote, g.y0 + y * g.cote, g.cote, g.cote);
    }));
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(Math.max(6, g.cote * 1.45));
    doc.setTextColor(...ENCRE.trait);
    g.m.grille.forEach((ligne, y) => ligne.forEach((v, x) => {
        doc.text(String(v), g.x0 + (x + 0.5) * g.cote, g.y0 + (y + 0.7) * g.cote,
            { align: 'center' });
    }));
    // LA BANDE DES SOMMES : les cases à barrer au fur et à mesure.
    doc.setLineWidth(0.2);
    doc.setDrawColor(...ENCRE.grille);
    doc.setFontSize(Math.max(5, g.pas * 1.35));
    for (let nb = 1; nb <= g.n; nb++) {
        const x = g.xBande + (nb - 1) * g.pas;
        doc.setFillColor(...ENCRE.donnee);
        doc.roundedRect(x, g.yBande, g.pas * 0.86, g.pas * 0.8, g.pas * 0.2, g.pas * 0.2, 'FD');
        doc.setTextColor(...ENCRE.texte);
        doc.text(String(nb), x + g.pas * 0.43, g.yBande + g.pas * 0.58, { align: 'center' });
    }

    if (!solution) return;
    doc.setDrawColor(47, 133, 90);
    doc.setLineWidth(0.5);
    g.m.solution.forEach(a => {
        const c = capsuleTasuko(g, a.cases);
        doc.roundedRect(c.x, c.y, c.w, c.h, c.r, c.r);
    });
    // Sur le corrigé, les sommes sont toutes faites : on les barre.
    doc.setDrawColor(47, 133, 90);
    doc.setLineWidth(0.4);
    for (let nb = 1; nb <= g.n; nb++) {
        const x = g.xBande + (nb - 1) * g.pas;
        doc.line(x + g.pas * 0.08, g.yBande + g.pas * 0.72,
            x + g.pas * 0.78, g.yBande + g.pas * 0.08);
    }
}

export const RENDUS_GRILLES = {
    tasuko: {
        titre: 'Tasuko — les sommes cachées',
        // COURTE, PARCE QU'ELLE EST COUPÉE. Le bandeau tient deux lignes : la
        // version longue s'arrêtait sur « commence par un chiffre qu'une », en
        // plein milieu du seul conseil qui serve.
        consigne: (items) => {
            const m = items && items[0] && items[0].meta;
            const n = (m && m.n) || 8;
            return `RELIE LES CASES VOISINES DEUX PAR DEUX, en ligne ou en colonne. Les sommes `
                + `obtenues doivent faire 1, 2, 3… jusqu'à ${n} — chacune une seule fois — et `
                + 'TOUS les chiffres doivent servir. Barre les sommes au fur et à mesure.';
        },
        previewGrille: tasukoPreviewHtml,
        pdfGrille: dessinerTasukoPdf,
        nomBloc: 'Grille', nomBlocs: 'grilles',
        proportions: { w: 1, h: 0.72 },
        disposition: { cols: 2, rows: 3, maxCols: 3, maxRows: 4 },
        parLigneDefaut: 2
    },
    hashi: {
        titre: 'Hashi — construis les ponts',
        consigne: () => 'RELIE LES ÎLES PAR DES PONTS. Un pont est un trait droit, horizontal '
            + 'ou vertical ; deux ponts au plus entre deux îles ; un pont n\'en croise jamais '
            + 'un autre et ne traverse jamais une île. Le chiffre d\'une île dit COMBIEN de '
            + 'ponts y arrivent. Et pour finir, tout doit tenir d\'un seul tenant : on doit '
            + 'pouvoir aller de n\'importe quelle île à n\'importe quelle autre.',
        previewGrille: hashiPreviewHtml,
        pdfGrille: dessinerHashiPdf,
        nomBloc: 'Grille', nomBlocs: 'grilles',
        // Une grille de hashi est carrée et se trace à la règle : deux par page
        // laissent encore la place du poignet, quatre ne l'ont plus.
        proportions: { w: 1, h: 1 },
        disposition: { cols: 2, rows: 1, maxCols: 3, maxRows: 2 },
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
        // ET UN PLANCHER, comme la rédaction de Thalès.
        //
        // Mesuré dans un parcours à trois par ligne : le bloc tombait à 26,9 mm
        // de haut, les cases atteignaient leur plancher de 3 mm — on ne coche
        // ni ne barre dans trois millimètres — et le bandeau des lignes
        // s'imprimait par-dessus la rangée suivante. Une proportion ne parle
        // que de forme et se laisse écraser ; ce qu'il faut ici est une
        // hauteur.
        //
        // Le compte : la bande du haut et ses étiquettes (16 mm), puis neuf
        // rangées de cases — trois catégories de trois valeurs, le format le
        // plus courant — à six millimètres, la plus petite case où un crayon
        // pose une croix sans déborder. Soit soixante-dix.
        hauteurMin: 70,
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
