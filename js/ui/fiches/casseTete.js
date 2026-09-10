// LES CASSE-TÊTE DE DÉPLACEMENT — on bouge des pièces, on compte les coups.
//
// Une tranche de `printSheet.js`, découpée par `tools/decouperPrintSheet.mjs`.
// Tout ce qui est ici n'est utilisé QUE par les exercices de cette famille ;
// ce qui sert à plusieurs vit dans `socle.js`.

import {
    ENCRE, boiteDe, echapperSheet, planchePasAPas, titrePasAPas
} from './socle.js';
import { etapesBrahma } from '../../core/tourBrahma.js';
import { etapesGrenouilles } from '../../core/grenouilles.js';
import { etapesParking } from '../../core/parking.js';
import { polycopieEnCouleur, pourPdf } from '../ficheRendu.js';

// --- LES JEUX À DÉCOUPER : LA TOUR DE BRAHMA ET LES GRENOUILLES ----------------
//
// Rémy : « j'aimerai ces deux jeux là en catégorie défi ou énigme ». Ce sont
// deux pages de son « Coin des jeux mathématiques », et ce sont des JEUX À
// DÉCOUPER : la feuille porte le plateau d'un côté, les pièces de l'autre, et
// un trait de découpe entre les deux.
//
// LE PLATEAU ET LES PIÈCES SUR LA MÊME FEUILLE, séparés par un pointillé : un
// élève reçoit une page et repart avec un jeu. C'est tout l'intérêt du format,
// et c'est pour cela qu'on n'imprime qu'UN plateau par page — deux jeux à
// découper sur une feuille donnent deux jeux trop petits pour être manipulés.
//
// LES VIGNETTES « DÉPART / ARRIVÉE / AUTORISÉ / INTERDIT » NE SONT PAS UN
// ORNEMENT. Rémy les met, et il a raison : une règle négative — « jamais une
// boule sur plus petite » — se comprend en la VOYANT enfreinte, pas en la
// lisant. Elles tiennent en bas de page et valent trois lignes de consigne.

/**
 * LA PART DU PLUS GRAND DIAMÈTRE que prend la boule de taille `b`.
 *
 * C'est LA donnée du jeu : une boule ne se pose que sur plus grosse qu'elle, et
 * la seule façon de le voir est que les tailles diffèrent VRAIMENT. Un écart de
 * quinze pour cent entre la 3 et la 4 ne se distingue pas sur une photocopie —
 * on part donc de quarante pour cent pour la plus petite.
 */
const partBoule = (b, n) => 0.4 + 0.6 * (b / n);

/** La hauteur d'une pile complète, en diamètres : la somme des parts. */
function sommeParts(n) {
    let s = 0;
    for (let b = 1; b <= n; b++) s += partBoule(b, n);
    return s;
}

/** Un mini-plateau de la tour, pour les vignettes du bas. */
function miniTour(x, y, w, h, piles, n) {
    const larg = w / 3;
    // UNE BOULE EST RONDE, et elle l'est aussi dans les vignettes.
    //
    // Rémy, en voyant la fiche : « attention à bien utiliser des cercles ». La
    // largeur portait la taille — c'est la règle du jeu en dessin, et c'était
    // juste — mais la HAUTEUR restait la même pour toutes : on obtenait des
    // galets de plus en plus écrasés, et la plus grosse ne ressemblait plus à
    // une boule du tout. Le diamètre porte donc la taille dans les deux sens.
    //
    // Et la pile s'empile sur les DIAMÈTRES, pas sur un pas fixe : sans cela,
    // une grosse boule chevaucherait sa voisine ou flotterait au-dessus.
    const dMax = Math.min(larg * 0.86, h / sommeParts(n));
    return {
        cadres: [0, 1, 2].map(p => ({ x: x + p * larg + larg * 0.08, y,
            w: larg * 0.84, h })),
        boules: piles.flatMap((pile, p) => {
            let empile = 0;
            return pile.map((b) => {
                const d = dMax * partBoule(b, n);
                const cy = y + h - empile - d / 2;
                empile += d;
                return { b, w: d, hh: d, cx: x + p * larg + larg / 2, cy };
            });
        })
    };
}

/**
 * LE RAPPORT D'UNE VIGNETTE DE TOUR : trois conduits de large, et de quoi
 * empiler toutes les boules. On l'écrit pour que la planche cherche ses
 * colonnes sur la vraie forme du plateau, et non sur un carré.
 */
const rapportTour = (n) => 3 / (0.86 * sommeParts(n));

/** LA SOLUTION DE LA TOUR, en vignettes — aperçu. */
function brahmaSolutionHtml(item, slot, k) {
    const b = boiteDe(slot);
    const n = item.meta.n;
    const etapes = etapesBrahma(n);
    const pl = planchePasAPas(b, etapes.length, rapportTour(n));
    if (!pl) return '';
    const T = (v) => (v * k).toFixed(2);
    let html = `<div class="fx-pas-titre" style="left:${T(b.x)}px; top:${T(b.y)}px;
        width:${T(b.w)}px; font-size:${T(4)}px">${titrePasAPas(etapes.length - 1)}</div>`;
    etapes.forEach((piles, i) => {
        const o = pl.place(i);
        html += `<div class="fx-pas-legende" style="left:${T(o.x)}px;
            top:${T(o.yLegende - pl.legende)}px; width:${T(pl.w)}px;
            font-size:${T(pl.legende)}px">${pl.legendeDe(i)}</div>`;
        const mini = miniTour(o.x, o.y, pl.w, pl.h, piles, n);
        mini.cadres.forEach(c => {
            html += `<div class="fx-tb-mini" style="left:${T(c.x)}px; top:${T(c.y)}px;
                width:${T(c.w)}px; height:${T(c.h)}px"></div>`;
        });
        mini.boules.forEach(o2 => {
            html += `<div class="fx-tb-miniboule" style="left:${T(o2.cx - o2.w / 2)}px;
                top:${T(o2.cy - o2.hh / 2)}px; width:${T(o2.w)}px; height:${T(o2.hh)}px"></div>`;
        });
    });
    return html;
}

/** LA SOLUTION DE LA TOUR, en vignettes — PDF. */
function dessinerBrahmaSolutionPdf(doc, item, slot) {
    const b = boiteDe(slot);
    const n = item.meta.n;
    const etapes = etapesBrahma(n);
    const pl = planchePasAPas(b, etapes.length, rapportTour(n));
    if (!pl) return;
    const aplat = polycopieEnCouleur();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(4 / 0.3528);
    doc.setTextColor(...ENCRE.texte);
    doc.text(pourPdf(titrePasAPas(etapes.length - 1)), b.x + b.w / 2, b.y + 4, { align: 'center' });
    etapes.forEach((piles, i) => {
        const o = pl.place(i);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(Math.max(4, pl.legende / 0.3528));
        doc.setTextColor(...ENCRE.gris);
        doc.text(pourPdf(pl.legendeDe(i)), o.xLegende, o.yLegende, { align: 'center' });
        const mini = miniTour(o.x, o.y, pl.w, pl.h, piles, n);
        doc.setLineWidth(0.2);
        doc.setDrawColor(...ENCRE.grille);
        mini.cadres.forEach(c => doc.roundedRect(c.x, c.y, c.w, c.h, 0.5, 0.5));
        mini.boules.forEach(o2 => {
            doc.setDrawColor(...ENCRE.trait);
            doc.setFillColor(...(aplat ? ENCRE.donnee : [255, 255, 255]));
            doc.setLineWidth(0.25);
            doc.roundedRect(o2.cx - o2.w / 2, o2.cy - o2.hh / 2, o2.w, o2.hh,
                o2.hh / 2, o2.hh / 2, 'FD');
        });
    });
}

/** LA SOLUTION DES GRENOUILLES, en vignettes — aperçu. */
function grenouillesSolutionHtml(item, slot, k) {
    const b = boiteDe(slot);
    const n = item.meta.n, cases = n * 2 + 1;
    const etapes = etapesGrenouilles(n);
    const pl = planchePasAPas(b, etapes.length, cases);
    if (!pl) return '';
    const T = (v) => (v * k).toFixed(2);
    const pad = pl.w / cases;
    let html = `<div class="fx-pas-titre" style="left:${T(b.x)}px; top:${T(b.y)}px;
        width:${T(b.w)}px; font-size:${T(4)}px">${titrePasAPas(etapes.length - 1)}</div>`;
    etapes.forEach((ruban, i) => {
        const o = pl.place(i);
        html += `<div class="fx-pas-legende" style="left:${T(o.x)}px;
            top:${T(o.yLegende - pl.legende)}px; width:${T(pl.w)}px;
            font-size:${T(pl.legende)}px">${pl.legendeDe(i)}</div>`;
        ruban.forEach((c, j) => {
            html += `<div class="fx-gr-mini${c ? ` fx-gr-mini--${c}` : ''}"
                style="left:${T(o.x + j * pad)}px; top:${T(o.y)}px;
                width:${T(pad)}px; height:${T(pad)}px"></div>`;
        });
    });
    return html;
}

/** LA SOLUTION DES GRENOUILLES, en vignettes — PDF. */
function dessinerGrenouillesSolutionPdf(doc, item, slot) {
    const b = boiteDe(slot);
    const n = item.meta.n, cases = n * 2 + 1;
    const etapes = etapesGrenouilles(n);
    const pl = planchePasAPas(b, etapes.length, cases);
    if (!pl) return;
    const aplat = polycopieEnCouleur();
    const pad = pl.w / cases;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(4 / 0.3528);
    doc.setTextColor(...ENCRE.texte);
    doc.text(pourPdf(titrePasAPas(etapes.length - 1)), b.x + b.w / 2, b.y + 4, { align: 'center' });
    etapes.forEach((ruban, i) => {
        const o = pl.place(i);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(Math.max(4, pl.legende / 0.3528));
        doc.setTextColor(...ENCRE.gris);
        doc.text(pourPdf(pl.legendeDe(i)), o.xLegende, o.yLegende, { align: 'center' });
        ruban.forEach((c, j) => {
            doc.setLineWidth(0.18);
            doc.setDrawColor(...ENCRE.grille);
            doc.setFillColor(...(aplat && c
                ? (c === 'V' ? [220, 240, 214] : [251, 220, 220]) : [255, 255, 255]));
            doc.roundedRect(o.x + j * pad, o.y, pad, pad, 0.4, 0.4, 'FD');
            if (!c) return;
            // Trop petite pour une bête dessinée : l'INITIALE dit la couleur,
            // et elle survit à la photocopieuse en noir et blanc.
            doc.setFontSize(Math.max(3.5, pad * 1.5));
            doc.setTextColor(...(c === 'V' ? [47, 107, 35] : [143, 31, 20]));
            doc.text(c, o.x + (j + 0.5) * pad, o.y + pad * 0.74, { align: 'center' });
        });
    });
}

/** LA SOLUTION DU PARKING, en vignettes — aperçu. */
function parkingSolutionHtml(item, slot, k) {
    const b = boiteDe(slot);
    const m = item.meta;
    const etapes = etapesParking(m.n);
    const pl = planchePasAPas(b, etapes.length, 5 / m.hauteur);
    if (!pl) return '';
    const T = (v) => (v * k).toFixed(2);
    const cote = pl.w / 5;
    let html = `<div class="fx-pas-titre" style="left:${T(b.x)}px; top:${T(b.y)}px;
        width:${T(b.w)}px; font-size:${T(4)}px">${titrePasAPas(etapes.length - 1)}</div>`;
    etapes.forEach((etat, i) => {
        const o = pl.place(i);
        html += `<div class="fx-pas-legende" style="left:${T(o.x)}px;
            top:${T(o.yLegende - pl.legende)}px; width:${T(pl.w)}px;
            font-size:${T(pl.legende)}px">${pl.legendeDe(i)}</div>`;
        m.cases.forEach((c, j) => {
            const col = etat[j];
            html += `<div class="fx-pk-mini${col ? ` fx-pk-mini--${col}` : ''}"
                style="left:${T(o.x + c.x * cote)}px; top:${T(o.y + c.y * cote)}px;
                width:${T(cote)}px; height:${T(cote)}px"></div>`;
        });
    });
    return html;
}

/** LA SOLUTION DU PARKING, en vignettes — PDF. */
function dessinerParkingSolutionPdf(doc, item, slot) {
    const b = boiteDe(slot);
    const m = item.meta;
    const etapes = etapesParking(m.n);
    const pl = planchePasAPas(b, etapes.length, 5 / m.hauteur);
    if (!pl) return;
    const aplat = polycopieEnCouleur();
    const cote = pl.w / 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(4 / 0.3528);
    doc.setTextColor(...ENCRE.texte);
    doc.text(pourPdf(titrePasAPas(etapes.length - 1)), b.x + b.w / 2, b.y + 4, { align: 'center' });
    etapes.forEach((etat, i) => {
        const o = pl.place(i);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(Math.max(3.5, pl.legende / 0.3528));
        doc.setTextColor(...ENCRE.gris);
        doc.text(pourPdf(pl.legendeDe(i)), o.xLegende, o.yLegende, { align: 'center' });
        m.cases.forEach((c, j) => {
            const col = etat[j];
            doc.setLineWidth(0.15);
            doc.setDrawColor(...ENCRE.grille);
            doc.setFillColor(...(aplat && col
                ? (col === 'B' ? [214, 226, 250] : [251, 220, 220]) : [255, 255, 255]));
            doc.rect(o.x + c.x * cote, o.y + c.y * cote, cote, cote, 'FD');
            if (!col) return;
            doc.setFontSize(Math.max(3.5, cote * 1.5));
            doc.setTextColor(...(col === 'B' ? [28, 58, 138] : [143, 31, 20]));
            doc.text(col, o.x + (c.x + 0.5) * cote, o.y + (c.y + 0.74) * cote, { align: 'center' });
        });
    });
}

function geoBrahma(item, slot) {
    const m = item.meta;
    const b = boiteDe(slot);
    // Trois bandes : le plateau et les pièces, puis les vignettes.
    const hVignettes = Math.min(b.h * 0.26, 42);
    const hHaut = b.h - hVignettes - 6;
    const largePlateau = b.w * 0.66;
    const n = m.n;
    const taille = Math.max(2.2, Math.min(hVignettes * 0.12, 3.4));

    // LE DIAMÈTRE DES BOULES SE CALCULE UNE FOIS, ET TOUT S'Y ACCROCHE.
    //
    // Rémy : « le plus c'est que le jeu profite au mieux de l'espace sur la
    // feuille ». Le plateau était plafonné à quatorze millimètres de hauteur
    // par boule — soixante-dix pour quatre — et laissait quarante millimètres
    // de blanc au-dessus et au-dessous d'une page entière.
    //
    // Trois contraintes bornent la boule, et c'est la plus dure qui gagne :
    // la LARGEUR de sa colonne, la HAUTEUR qu'il faut pour les empiler toutes,
    // et surtout LA LARGEUR D'UN CONDUIT — une boule qu'on découpe et qui
    // n'entre pas dans le plateau, on s'en aperçoit trop tard.
    const piecesW = b.w - largePlateau - 8;
    const dispoPieces = hHaut - taille * 1.6;
    const parConduit = (largePlateau - 16) / 3;
    const D = Math.min(
        piecesW * 0.94,
        dispoPieces / sommeParts(n),
        parConduit / (1.15 * partBoule(n, n))
    );
    const grosse = D * partBoule(n, n);
    // Le conduit accueille la plus grosse boule avec un peu de jeu, sans
    // jamais dépasser le tiers du plateau — sinon le socle sort de la page.
    const largConduit = Math.min(parConduit, Math.max(grosse * 1.15, parConduit * 0.55));
    // Le socle déborde de six millimètres autour des conduits : il faut donc
    // les rentrer d'autant, sinon il remonte au-dessus de sa boîte et mange le
    // titre du bloc — « Jeu 1 » passait sous le gris.
    const hConduit = hHaut - 16;
    const socleW = largConduit * 3 + 12, socleH = hConduit + 12;
    return {
        m, b, n, hVignettes, hHaut, D,
        socle: { x: b.x + (largePlateau - socleW) / 2, y: b.y + (hHaut - socleH) / 2,
            w: socleW, h: socleH },
        largConduit, hConduit,
        // La ligne de découpe, et la colonne des pièces à droite.
        //
        // ELLE S'ARRÊTE OÙ FINISSENT LES PIÈCES. Rémy, sur le PDF : le trait
        // descendait sur toute la hauteur du bloc et traversait la vignette
        // « Autorisé », qui, elle, s'étale sur toute la largeur sous le
        // plateau. On y lisait un ciseau là où il n'y a rien à couper — et la
        // vignette qu'il barrait est justement celle qui montre le coup permis.
        xCoupe: b.x + largePlateau + 2,
        hCoupe: hHaut,
        pieces: { x: b.x + largePlateau + 6, w: b.w - largePlateau - 8, y: b.y, h: hHaut },
        yVignettes: b.y + hHaut + 6,
        taille
    };
}

/** Les quatre vignettes du bas : le départ, l'arrivée, un coup permis, un coup interdit. */
function vignettesBrahma(g) {
    const n = g.n;
    const tout = Array.from({ length: n }, (_, i) => n - i);
    // AUTORISÉ ET INTERDIT SE JOUENT SUR LES DEUX EXTRÊMES, la plus petite et
    // la plus grosse. Avec la 3 et la 4, l'écart de largeur est de quinze pour
    // cent et la vignette ne montre plus rien — alors que c'est précisément une
    // différence de taille qu'elle doit rendre évidente.
    return [
        { titre: 'Départ', piles: [tout, [], []] },
        { titre: 'Arrivée', piles: [[], [], tout] },
        { titre: 'Autorisé', piles: [[n, 1], [], []] },
        { titre: 'INTERDIT', piles: [[1, n], [], []], faute: true }
    ];
}

function brahmaPreviewHtml(item, slot, k, solution) {
    if (solution) return brahmaSolutionHtml(item, slot, k);
    const g = geoBrahma(item, slot);
    const T = (v) => (v * k).toFixed(2);
    let html = `<div class="fx-tb-socle" style="left:${T(g.socle.x)}px; top:${T(g.socle.y)}px;
        width:${T(g.socle.w)}px; height:${T(g.socle.h)}px"></div>`;
    for (let p = 0; p < 3; p++) {
        html += `<div class="fx-tb-conduit" style="left:${T(g.socle.x + 6 + p * g.largConduit)}px;
            top:${T(g.socle.y + 6)}px; width:${T(g.largConduit - 4)}px;
            height:${T(g.hConduit)}px"></div>`;
    }
    // Le trait de découpe, puis les pièces.
    html += `<div class="fx-tb-coupe" style="left:${T(g.xCoupe)}px; top:${T(g.b.y)}px;
        height:${T(g.hHaut)}px"></div>`;
    html += `<div class="fx-tb-etiq" style="left:${T(g.pieces.x)}px; top:${T(g.b.y)}px;
        width:${T(g.pieces.w)}px; font-size:${T(g.taille)}px">Boules à découper</div>`;
    // LES BOULES SONT EMPILÉES PAR TAILLE DÉCROISSANTE, chacune à SON diamètre :
    // c'est ce qui rend la règle du jeu visible avant même d'avoir découpé.
    // Le diamètre vient de la géométrie : le recalculer ici, c'était risquer
    // qu'une boule découpée n'entre pas dans le conduit dessiné à côté.
    const D = g.D;
    let y = g.b.y + g.taille * 1.6;
    for (let taille = g.n; taille >= 1; taille--) {
        const d = D * partBoule(taille, g.n);
        html += `<div class="fx-tb-boule" style="left:${T(g.pieces.x + (g.pieces.w - d) / 2)}px;
            top:${T(y)}px; width:${T(d)}px; height:${T(d)}px;
            font-size:${T(d * 0.46)}px">${taille}</div>`;
        y += d;
    }
    // Les quatre vignettes.
    const largeV = g.b.w / 4;
    vignettesBrahma(g).forEach((v, i) => {
        const x = g.b.x + i * largeV;
        html += `<div class="fx-tb-vtitre${v.faute ? ' fx-tb-vtitre--ko' : ''}"
            style="left:${T(x + 2)}px; top:${T(g.yVignettes)}px; width:${T(largeV - 4)}px;
            font-size:${T(g.taille)}px">${v.titre}</div>`;
        const mini = miniTour(x + 3, g.yVignettes + g.taille * 1.5, largeV - 6,
            g.hVignettes - g.taille * 1.6, v.piles, g.n);
        mini.cadres.forEach(c => {
            html += `<div class="fx-tb-mini" style="left:${T(c.x)}px; top:${T(c.y)}px;
                width:${T(c.w)}px; height:${T(c.h)}px"></div>`;
        });
        mini.boules.forEach(o => {
            html += `<div class="fx-tb-miniboule${v.faute ? ' fx-tb-miniboule--ko' : ''}"
                style="left:${T(o.cx - o.w / 2)}px; top:${T(o.cy - o.hh / 2)}px;
                width:${T(o.w)}px; height:${T(o.hh)}px"></div>`;
        });
    });
    return html;
}

function dessinerBrahmaPdf(doc, item, slot, solution) {
    if (solution) return dessinerBrahmaSolutionPdf(doc, item, slot);
    const g = geoBrahma(item, slot);
    const aplat = polycopieEnCouleur();

    doc.setLineWidth(0.4);
    doc.setDrawColor(...ENCRE.trait);
    if (aplat) { doc.setFillColor(...ENCRE.donnee); doc.roundedRect(g.socle.x, g.socle.y, g.socle.w, g.socle.h, 2, 2, 'FD'); }
    else doc.roundedRect(g.socle.x, g.socle.y, g.socle.w, g.socle.h, 2, 2);
    for (let p = 0; p < 3; p++) {
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(g.socle.x + 6 + p * g.largConduit, g.socle.y + 6,
            g.largConduit - 4, g.hConduit, 1.5, 1.5, 'FD');
    }

    // LE TRAIT DE DÉCOUPE : un pointillé, et c'est un ordre — c'est là qu'on
    // passe les ciseaux.
    doc.setDrawColor(...ENCRE.gris);
    doc.setLineWidth(0.3);
    if (doc.setLineDashPattern) doc.setLineDashPattern([1.4, 1.2], 0);
    doc.line(g.xCoupe, g.b.y, g.xCoupe, g.b.y + g.hCoupe);
    if (doc.setLineDashPattern) doc.setLineDashPattern([], 0);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(g.taille / 0.3528);
    doc.setTextColor(...ENCRE.gris);
    doc.text(pourPdf('Boules à découper'), g.pieces.x + g.pieces.w / 2, g.b.y + g.taille,
        { align: 'center' });

    // Le même diamètre que l'aperçu, et que les conduits : il vient de la
    // géométrie, il ne se recalcule pas ici.
    const D = g.D;
    let yb = g.b.y + g.taille * 1.6;
    for (let taille = g.n; taille >= 1; taille--) {
        const d = D * partBoule(taille, g.n);
        const cx = g.pieces.x + g.pieces.w / 2;
        const cy = yb + d / 2;
        yb += d;
        doc.setLineWidth(0.4);
        doc.setDrawColor(...ENCRE.trait);
        doc.setFillColor(...(aplat ? ENCRE.donnee : [255, 255, 255]));
        doc.circle(cx, cy, d / 2, 'FD');
        doc.setFontSize(Math.max(6, d * 1.2));
        doc.setTextColor(...ENCRE.trait);
        doc.text(String(taille), cx, cy + d * 0.16, { align: 'center' });
    }

    const largeV = g.b.w / 4;
    vignettesBrahma(g).forEach((v, i) => {
        const x = g.b.x + i * largeV;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(g.taille / 0.3528);
        doc.setTextColor(...(v.faute ? [197, 48, 48] : ENCRE.texte));
        doc.text(pourPdf(v.titre), x + largeV / 2, g.yVignettes + g.taille, { align: 'center' });
        const mini = miniTour(x + 3, g.yVignettes + g.taille * 1.5, largeV - 6,
            g.hVignettes - g.taille * 1.6, v.piles, g.n);
        doc.setLineWidth(0.25);
        doc.setDrawColor(...ENCRE.grille);
        mini.cadres.forEach(c => doc.roundedRect(c.x, c.y, c.w, c.h, 0.8, 0.8));
        mini.boules.forEach(o => {
            doc.setDrawColor(...(v.faute ? [197, 48, 48] : ENCRE.trait));
            doc.setFillColor(...(aplat ? ENCRE.donnee : [255, 255, 255]));
            doc.setLineWidth(0.3);
            doc.roundedRect(o.cx - o.w / 2, o.cy - o.hh / 2, o.w, o.hh, o.hh / 2, o.hh / 2, 'FD');
        });
    });
}

// --- LES GRENOUILLES À DÉCOUPER ------------------------------------------------

/** La grenouille, en formes simples : deux cuisses, un corps, deux yeux. */
function dessinerGrenouillePdf(doc, cx, cy, d, fonce, clair, aplat) {
    const u = d / 100;
    const E = (x, y, rx, ry, teinte) => {
        doc.setFillColor(...(aplat ? teinte : [255, 255, 255]));
        doc.setDrawColor(...ENCRE.trait);
        doc.setLineWidth(0.25);
        doc.ellipse(cx + (x - 50) * u, cy + (y - 45) * u, rx * u, ry * u, 'FD');
    };
    // L'ORDRE COMPTE : les cuisses, PUIS les yeux, PUIS le corps par-dessus.
    // Dessinés après, les yeux laissaient voir le trait du corps au travers et
    // la bête ressemblait à une grenouille à lunettes. Posés dessous, il ne
    // dépasse que la bosse — ce qui est exactement un œil de grenouille.
    E(22, 62, 16, 11, fonce);
    E(78, 62, 16, 11, fonce);
    E(28, 24, 14, 14, clair);
    E(72, 24, 14, 14, clair);
    E(50, 52, 34, 26, clair);
    doc.setFillColor(26, 32, 44);
    doc.circle(cx + (28 - 50) * u, cy + (24 - 45) * u, 5.5 * u, 'F');
    doc.circle(cx + (72 - 50) * u, cy + (24 - 45) * u, 5.5 * u, 'F');
}

function geoGrenouilles(item, slot) {
    const m = item.meta;
    const b = boiteDe(slot);
    const cases = m.n * 2 + 1;
    // LE NÉNUPHAR DONNE SA TAILLE À LA GRENOUILLE, ET C'ÉTAIT LE DÉFAUT.
    //
    // Rémy : « le plateau de jeu ne permet pas de poser ses pions ». Les deux
    // tailles étaient calculées séparément : la case du plateau tombait à
    // 20 mm (la largeur divisée par neuf), la bête à découper à 44 mm (la
    // hauteur restante divisée par deux). On découpait donc un pion DEUX FOIS
    // plus large que la case où il devait se poser. Un jeu à découper dont les
    // pièces ne rentrent pas sur le plateau n'est pas un jeu.
    //
    // Le plafond de 24 mm tombe au passage : il n'a plus de raison d'être
    // maintenant que la pièce suit la case, et le plateau prend la largeur.
    const pad = Math.min((b.w - 4) / cases, b.h * 0.3);
    const rubanW = pad * cases;
    const hRuban = pad * 1.5;
    const hVignettes = Math.min(b.h * 0.22, 34);
    const yCoupe = b.y + hRuban + hVignettes + 8;
    return {
        m, b, n: m.n, cases, pad,
        ruban: { x: b.x + (b.w - rubanW) / 2, y: b.y + 4, w: rubanW, h: pad },
        yVignettes: b.y + hRuban + 4,
        hVignettes,
        // Le trait de découpe, puis les bêtes à découper sous lui.
        yCoupe,
        // LA ZONE BASSE VA JUSQU'AU BORD DE LA PAGE. Elle était calculée à
        // partir de la hauteur totale moins les bandeaux, sans tenir compte de
        // son propre point de départ : elle s'arrêtait douze millimètres trop
        // haut, et les rubans de coups n'avaient la place que d'une ligne.
        pieces: { x: b.x, y: yCoupe + 4, w: b.w, h: b.y + b.h - (yCoupe + 4) },
        taille: Math.max(2.2, Math.min(pad * 0.22, 3.4))
    };
}

/** Les deux vignettes : la position de départ et celle d'arrivée. */
/**
 * OÙ SE POSENT LES PIÈCES, ET CE QU'ON MET SOUS ELLES.
 *
 * Les jetons font la taille d'une case — ils se posent dessus, c'est la seule
 * dimension qui ait un sens —, espacés d'un millimètre et demi pour les
 * ciseaux. Ce qui reste de la page devient des rubans vides numérotés : un par
 * coup, parce que COMPTER SES COUPS est le vrai exercice, et que sans ces
 * lignes il ne restait que du blanc.
 */
function piecesGrenouilles(g) {
    const ECART = 1.5;
    const pas = g.pad + ECART;
    const parRangee = Math.max(1, Math.min(g.n * 2, Math.floor(g.pieces.w / pas)));
    const rangees = Math.ceil(g.n * 2 / parRangee);
    const x0 = g.pieces.x + Math.max(0, (g.pieces.w - pas * parRangee) / 2);
    const jetons = [];
    for (let i = 0; i < g.n * 2; i++) {
        jetons.push({
            vert: i < g.n,
            x: x0 + (i % parRangee) * pas,
            y: g.pieces.y + Math.floor(i / parRangee) * pas
        });
    }
    // PAS DE RUBANS À REMPLIR SOUS LES PIÈCES.
    //
    // Il y en avait : autant de rangées numérotées que la page en acceptait,
    // « c'est là qu'on note ses coups ». L'idée venait d'une remarque de Rémy
    // sur une autre feuille — « n'occupe pas le maximum de l'espace » — et
    // c'était une mauvaise réponse à une bonne question. Rémy, la feuille en
    // main : « ne mets pas les lignes de carrés arrondis qui vont de 1 à 10
    // sous les jetons grenouille ». Cette feuille-là se DÉCOUPE : ce qu'on met
    // sous les pièces, on le passe aux ciseaux. Et les rangées n'existaient
    // que dans l'aperçu — le PDF ne les traçait pas —, si bien que la fiche
    // imprimée ne ressemblait déjà pas à ce qu'on voyait.
    const margeNum = Math.max(6, g.pad * 0.5);
    return { jetons, margeNum };
}

const vignettesGrenouilles = (n) => [
    { titre: 'Départ', ruban: [...new Array(n).fill('V'), null, ...new Array(n).fill('R')] },
    { titre: 'Arrivée', ruban: [...new Array(n).fill('R'), null, ...new Array(n).fill('V')] }
];

function grenouillesPreviewHtml(item, slot, k, solution) {
    if (solution) return grenouillesSolutionHtml(item, slot, k);
    const g = geoGrenouilles(item, slot);
    const T = (v) => (v * k).toFixed(2);
    let html = '';
    for (let i = 0; i < g.cases; i++) {
        html += `<div class="fx-gr-pad" style="left:${T(g.ruban.x + i * g.pad)}px;
            top:${T(g.ruban.y)}px; width:${T(g.pad)}px; height:${T(g.pad)}px"></div>`;
    }
    const largeV = g.b.w / 2;
    vignettesGrenouilles(g.n).forEach((v, j) => {
        const petit = Math.min((largeV - 10) / g.cases, g.hVignettes - g.taille * 1.7);
        const x0 = g.b.x + j * largeV + (largeV - petit * g.cases) / 2;
        html += `<div class="fx-gr-titre" style="left:${T(g.b.x + j * largeV)}px;
            top:${T(g.yVignettes)}px; width:${T(largeV)}px;
            font-size:${T(g.taille)}px">${v.titre}</div>`;
        v.ruban.forEach((c, i) => {
            html += `<div class="fx-gr-mini${c ? ` fx-gr-mini--${c}` : ''}"
                style="left:${T(x0 + i * petit)}px; top:${T(g.yVignettes + g.taille * 1.7)}px;
                width:${T(petit)}px; height:${T(petit)}px"></div>`;
        });
    });
    html += `<div class="fx-gr-coupe" style="left:${T(g.b.x)}px; top:${T(g.yCoupe)}px;
        width:${T(g.b.w)}px"></div>`;
    // LES BÊTES À DÉCOUPER FONT LA TAILLE D'UN NÉNUPHAR. Elles se posent
    // dessus : c'est la seule dimension qui ait un sens. On les espace en
    // revanche d'un bon millimètre — il faut passer des ciseaux entre deux.
    const pieces = piecesGrenouilles(g);
    pieces.jetons.forEach(j => {
        html += `<div class="fx-gr-decoupe fx-gr-mini--${j.vert ? 'V' : 'R'}"
            style="left:${T(j.x)}px; top:${T(j.y)}px;
            width:${T(g.pad)}px; height:${T(g.pad)}px">${
            grenouilleSvgFiche(j.vert)}</div>`;
    });
    return html;
}

/** La même bête qu'à l'écran, en SVG, pour l'aperçu de la fiche. */
function grenouilleSvgFiche(vert) {
    const fonce = vert ? '#2f6b23' : '#8f1f14';
    const clair = vert ? '#6cbf4a' : '#e6503c';
    return `<svg viewBox="0 0 100 84" preserveAspectRatio="xMidYMid meet">
        <ellipse cx="22" cy="62" rx="16" ry="11" fill="${fonce}"/>
        <ellipse cx="78" cy="62" rx="16" ry="11" fill="${fonce}"/>
        <circle cx="28" cy="24" r="14" fill="${clair}"/>
        <circle cx="72" cy="24" r="14" fill="${clair}"/>
        <ellipse cx="50" cy="52" rx="34" ry="26" fill="${clair}"/>
        <circle cx="28" cy="24" r="5.5" fill="#1a202c"/>
        <circle cx="72" cy="24" r="5.5" fill="#1a202c"/></svg>`;
}

function dessinerGrenouillesPdf(doc, item, slot, solution) {
    if (solution) return dessinerGrenouillesSolutionPdf(doc, item, slot);
    const g = geoGrenouilles(item, slot);
    const aplat = polycopieEnCouleur();
    const VERT = [[47, 107, 35], [108, 191, 74]];
    const ROUGE = [[143, 31, 20], [230, 80, 60]];

    doc.setLineWidth(0.4);
    doc.setDrawColor(...ENCRE.trait);
    for (let i = 0; i < g.cases; i++) {
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(g.ruban.x + i * g.pad, g.ruban.y, g.pad, g.pad, 1.6, 1.6, 'FD');
    }

    const largeV = g.b.w / 2;
    vignettesGrenouilles(g.n).forEach((v, j) => {
        const petit = Math.min((largeV - 10) / g.cases, g.hVignettes - g.taille * 1.7);
        const x0 = g.b.x + j * largeV + (largeV - petit * g.cases) / 2;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(g.taille / 0.3528);
        doc.setTextColor(...ENCRE.texte);
        doc.text(pourPdf(v.titre), g.b.x + j * largeV + largeV / 2, g.yVignettes + g.taille,
            { align: 'center' });
        doc.setLineWidth(0.25);
        v.ruban.forEach((c, i) => {
            doc.setDrawColor(...ENCRE.grille);
            doc.setFillColor(...(aplat && c
                ? (c === 'V' ? [220, 240, 214] : [251, 220, 220]) : [255, 255, 255]));
            doc.roundedRect(x0 + i * petit, g.yVignettes + g.taille * 1.7, petit, petit,
                0.7, 0.7, 'FD');
            if (!c) return;
            // Sur une vignette, la bête est trop petite pour être dessinée :
            // son INITIALE dit la couleur, et survit au noir et blanc.
            doc.setFontSize(Math.max(4, petit * 1.5));
            doc.setTextColor(...(c === 'V' ? VERT[0] : ROUGE[0]));
            doc.text(c, x0 + (i + 0.5) * petit, g.yVignettes + g.taille * 1.7 + petit * 0.72,
                { align: 'center' });
        });
    });

    doc.setDrawColor(...ENCRE.gris);
    doc.setLineWidth(0.3);
    if (doc.setLineDashPattern) doc.setLineDashPattern([1.4, 1.2], 0);
    doc.line(g.b.x, g.yCoupe, g.b.x + g.b.w, g.yCoupe);
    if (doc.setLineDashPattern) doc.setLineDashPattern([], 0);

    const parRangee = Math.ceil(g.n * 2 / 2);
    const dispo = Math.min(g.pieces.w / parRangee, g.pieces.h / 2) * 0.92;
    for (let i = 0; i < g.n * 2; i++) {
        const vert = i < g.n;
        const col = i % parRangee, rang = Math.floor(i / parRangee);
        const x = g.pieces.x + (g.pieces.w - dispo * parRangee) / 2 + col * dispo;
        const y = g.pieces.y + rang * dispo;
        doc.setDrawColor(...ENCRE.grille);
        doc.setLineWidth(0.25);
        doc.setFillColor(...(aplat ? (vert ? [220, 240, 214] : [251, 220, 220]) : [255, 255, 255]));
        doc.roundedRect(x + dispo * 0.05, y + dispo * 0.05, dispo * 0.9, dispo * 0.9,
            1.4, 1.4, 'FD');
        dessinerGrenouillePdf(doc, x + dispo / 2, y + dispo / 2, dispo * 0.72,
            ...(vert ? VERT : ROUGE), aplat);
        // La flèche du sens autorisé : la règle, écrite sur la bête.
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(Math.max(5, dispo * 0.9));
        doc.setTextColor(...(vert ? VERT[0] : ROUGE[0]));
        doc.text(vert ? '>' : '<', x + dispo * (vert ? 0.82 : 0.18), y + dispo * 0.92,
            { align: 'center' });
    }
}

// --- LE PARKING À DÉCOUPER ------------------------------------------------------
//
// Rémy : « Le jeu de fin de semaine ». Le plateau d'un côté, les huit voitures
// de l'autre, un pointillé entre les deux — et les vignettes « Au Départ » et
// « Arrivée » qui disent le but sans une phrase.
//
// LE BITUME EST DESSINÉ, PAS SEULEMENT LES PLACES. C'est ce qui fait qu'on
// comprend le plateau d'un coup d'œil : on roule sur le gris, on se gare sur le
// blanc. Et la case en pointillés — la place de dégagement — se distingue des
// autres, parce que c'est elle, le sujet du jeu.

/**
 * LA GÉOMÉTRIE DU BLOC, EN MILLIMÈTRES : trois colonnes.
 *
 * Le plateau à gauche, les deux vignettes au milieu, les voitures à découper à
 * droite du pointillé. Le plateau est TOUJOURS limité par la hauteur — cinq
 * cases de large contre quatre de haut dans un bloc plus large que haut —,
 * alors la place gagnée en largeur est rendue aux vignettes plutôt que laissée
 * blanche. Et les mettre l'une SOUS l'autre, au milieu, dit ce qu'aucune
 * légende ne dirait aussi bien : on part de celle du haut, on arrive à celle du
 * bas.
 */
function geoParking(item, slot) {
    const m = item.meta;
    const b = boiteDe(slot);
    // LE PARTAGE DE LA LARGEUR, ET IL DÉCIDE DE TOUT. Le plateau tenait 42 % de
    // la boîte, les vignettes 22 %, et le reste — un bon tiers — allait aux
    // voitures à découper, qui n'en avaient pas besoin : leur taille est de
    // toute façon bornée par la case du plateau, sans quoi la voiture découpée
    // n'y entrerait pas. On rendait donc de la place à celui qui ne pouvait pas
    // s'en servir, et l'on bridait celui qui en manquait. La moitié au plateau,
    // et tout grandit d'un cinquième — Rémy : « occuper le maximum d'espace
    // pour être plus facile à découper ».
    const largePlateau = b.w * 0.55;
    const largeVign = b.w * 0.20;
    const cote = Math.min((largePlateau - 6) / 5, (b.h - 6) / m.hauteur, 34);
    const w = cote * 5, h = cote * m.hauteur;
    const taille = Math.max(2.2, Math.min(b.h * 0.05, 3.4));
    const xVign = b.x + largePlateau;
    // Chaque vignette occupe la moitié de la hauteur : titre, puis mini-plateau.
    const hVign = b.h / 2;
    const petit = Math.min((largeVign - 4) / 5, (hVign - taille * 2.4) / m.hauteur);
    const pieces = { x: xVign + largeVign + 6, w: b.w - largePlateau - largeVign - 6,
        y: b.y, h: b.h };
    // LA VOITURE DÉCOUPÉE DOIT ENTRER DANS SA PLACE. C'est une évidence sur la
    // table et un oubli facile sur la feuille : sans ce plafond, un bloc large
    // dessinait des voitures plus grandes que les cases du plateau, et le jeu
    // découpé était injouable.
    const d = Math.min(pieces.w / 2, (pieces.h - taille * 1.8) / Math.ceil(m.n), cote) * 0.94;
    return {
        m, b, cote, taille, petit, hVign, d,
        plateau: { x: b.x + (largePlateau - w) / 2, y: b.y + (b.h - h) / 2, w, h },
        vign: { x: xVign, w: largeVign, x0: xVign + (largeVign - petit * 5) / 2 },
        xCoupe: xVign + largeVign + 2,
        pieces
    };
}

/** Les deux vignettes : la position de départ et celle d'arrivée. */
const vignettesParking = (m) => [
    { titre: 'Au Départ', couleurs: m.cases.map(c => (c.zone === 'gauche' ? 'B' : c.zone === 'droite' ? 'R' : null)) },
    { titre: 'Arrivée', couleurs: m.cases.map(c => (c.zone === 'gauche' ? 'R' : c.zone === 'droite' ? 'B' : null)) }
];

/** La voiture de la fiche : la même qu'à l'écran. */
/**
 * LA VOITURE PORTE SA LETTRE, et la couleur n'est qu'un confort.
 *
 * Rémy, sur le PDF : « pour les voitures un peu foncé ». Elles l'étaient, et
 * le filtre n'était pas seul en cause : leur palette est SOMBRE avant toute
 * conversion — le bleu (47, 95, 208) a une clarté de 87, le rouge (224, 74,
 * 58) de 92 —, et la vitre, un gris neutre à 66, tombe plus bas encore que
 * la carrosserie. En niveaux de gris, les huit voitures deviennent huit
 * taches identiques : on ne sait plus laquelle va à droite et laquelle à
 * gauche, et c'est TOUT ce qu'il faut savoir pour jouer.
 *
 * C'est la règle de la maison, écrite en tête de ce fichier et tenue partout
 * ailleurs : la couleur ajoute du confort, elle ne porte jamais
 * l'information. Le plateau marque déjà ses places « B » et « R » ; les
 * voitures ne marquaient rien. Elles portent maintenant la même lettre, en
 * blanc sur la vitre — la partie la plus sombre du dessin, donc lisible quel
 * que soit le mode d'impression.
 *
 * Et la carrosserie s'éclaircit, pour que la vitre s'y détache : une voiture
 * n'est pas un aplat, c'est un contour, quatre roues et un toit.
 */
function voitureSvgFiche(bleue) {
    const fonce = bleue ? '#1c3a8a' : '#8f1f14';
    const clair = bleue ? '#8fb4f2' : '#f2a79b';
    return `<svg viewBox="0 0 60 100" preserveAspectRatio="xMidYMid meet">
        <rect x="2" y="12" width="8" height="18" rx="3" fill="#2d3748"/>
        <rect x="50" y="12" width="8" height="18" rx="3" fill="#2d3748"/>
        <rect x="2" y="66" width="8" height="18" rx="3" fill="#2d3748"/>
        <rect x="50" y="66" width="8" height="18" rx="3" fill="#2d3748"/>
        <rect x="6" y="4" width="48" height="92" rx="16" fill="${clair}"
            stroke="${fonce}" stroke-width="3"/>
        <rect x="14" y="30" width="32" height="30" rx="7" fill="#4a5568"/>
        <text x="30" y="52" text-anchor="middle" fill="#ffffff"
            font-family="Helvetica, Arial, sans-serif" font-size="20"
            font-weight="700">${bleue ? 'B' : 'R'}</text></svg>`;
}

function parkingPreviewHtml(item, slot, k, solution) {
    if (solution) return parkingSolutionHtml(item, slot, k);
    const g = geoParking(item, slot);
    const T = (v) => (v * k).toFixed(2);
    const P = g.plateau;
    // LE BITUME SUIT LA FORME DU PLATEAU, case par case — un rectangle plein
    // laisserait croire qu'on peut rouler dans les coins vides, et c'est
    // justement parce que le plateau N'EST PAS un rectangle que le jeu est
    // difficile. Même dessin qu'à l'écran (voir games/parking.js).
    const bord = g.cote * 0.14;
    let html = '';
    g.m.cases.forEach(c => {
        html += `<div class="fx-pk-bitume" style="left:${T(P.x + c.x * g.cote - bord)}px;
            top:${T(P.y + c.y * g.cote - bord)}px; width:${T(g.cote + bord * 2)}px;
            height:${T(g.cote + bord * 2)}px"></div>`;
    });
    g.m.cases.forEach(c => {
        html += `<div class="fx-pk-case${c.zone === 'place' ? ' fx-pk-case--place' : ''}"
            style="left:${T(P.x + c.x * g.cote)}px; top:${T(P.y + c.y * g.cote)}px;
            width:${T(g.cote)}px; height:${T(g.cote)}px"></div>`;
    });
    html += `<div class="fx-pk-coupe" style="left:${T(g.xCoupe)}px; top:${T(g.b.y)}px;
        height:${T(g.b.h)}px"></div>`;
    html += `<div class="fx-pk-titre" style="left:${T(g.pieces.x)}px; top:${T(g.b.y)}px;
        width:${T(g.pieces.w)}px; font-size:${T(g.taille)}px">Voitures à découper</div>`;

    // Les voitures à découper : deux colonnes, les bleues puis les rouges.
    const nb = g.m.n * 2;
    const d = g.d;
    for (let i = 0; i < nb; i++) {
        const bleue = i < g.m.n;
        const x = g.pieces.x + (g.pieces.w - d * 2) / 2 + (i % 2) * d;
        const y = g.b.y + g.taille * 1.8 + Math.floor(i / 2) * d;
        html += `<div class="fx-pk-piece" style="left:${T(x + d * 0.04)}px; top:${T(y + d * 0.04)}px;
            width:${T(d * 0.92)}px; height:${T(d * 0.92)}px">${voitureSvgFiche(bleue)}</div>`;
    }

    // Les deux vignettes, l'une sous l'autre : d'où l'on part, où l'on arrive.
    vignettesParking(g.m).forEach((v, j) => {
        const yTitre = g.b.y + j * g.hVign;
        html += `<div class="fx-pk-titre" style="left:${T(g.vign.x)}px; top:${T(yTitre)}px;
            width:${T(g.vign.w)}px; font-size:${T(g.taille)}px">${v.titre}</div>`;
        g.m.cases.forEach((c, i) => {
            const col = v.couleurs[i];
            html += `<div class="fx-pk-mini${col ? ` fx-pk-mini--${col}` : ''}"
                style="left:${T(g.vign.x0 + c.x * g.petit)}px;
                top:${T(yTitre + g.taille * 1.7 + c.y * g.petit)}px;
                width:${T(g.petit)}px; height:${T(g.petit)}px"></div>`;
        });
    });
    return html;
}

/** La voiture en formes simples, pour le PDF. */
function dessinerVoiturePdf(doc, x, y, w, h, fonce, clair, aplat, lettre) {
    doc.setFillColor(...(aplat ? clair : [255, 255, 255]));
    doc.setDrawColor(...fonce);
    doc.setLineWidth(0.4);
    doc.roundedRect(x + w * 0.1, y + h * 0.04, w * 0.8, h * 0.92, w * 0.2, w * 0.2, 'FD');
    // Les roues, puis le toit : quatre traits épais et un rectangle sombre
    // suffisent à faire une voiture vue de dessus.
    doc.setFillColor(45, 55, 72);
    [[0.03, 0.12], [0.83, 0.12], [0.03, 0.66], [0.83, 0.66]].forEach(([dx, dy]) => {
        doc.roundedRect(x + w * dx, y + h * dy, w * 0.14, h * 0.18, w * 0.05, w * 0.05, 'F');
    });
    doc.setFillColor(...(aplat ? [74, 85, 104] : [220, 224, 232]));
    doc.setDrawColor(...fonce);
    doc.setLineWidth(0.25);
    doc.roundedRect(x + w * 0.24, y + h * 0.3, w * 0.52, h * 0.3, w * 0.1, w * 0.1, 'FD');
    // LA LETTRE SUR LA VITRE — voir `voitureSvgFiche`. Blanche sur le toit
    // sombre quand il y a des aplats, sombre sur le toit clair sinon : dans
    // les deux cas c'est le contraste le plus franc du dessin.
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(h * 0.26 / 0.3528);
    doc.setTextColor(...(aplat ? [255, 255, 255] : fonce));
    doc.text(pourPdf(lettre), x + w / 2, y + h * 0.52, { align: 'center' });
}

function dessinerParkingPdf(doc, item, slot, solution) {
    if (solution) return dessinerParkingSolutionPdf(doc, item, slot);
    const g = geoParking(item, slot);
    const aplat = polycopieEnCouleur();
    const BLEU = [[28, 58, 138], [143, 180, 242]];
    const ROUGE = [[143, 31, 20], [242, 167, 155]];
    const P = g.plateau;

    // LE BITUME SUIT LA FORME DU PLATEAU, case par case. Un rectangle plein
    // laisserait croire qu'on peut rouler dans les coins vides ; or le plateau
    // n'est pas un rectangle, et c'est ce qui fait tout le jeu. En noir et
    // blanc il disparaît, et c'est très bien — le cadre des places suffit
    // alors à lire le plateau.
    const bord = g.cote * 0.14;
    if (aplat) {
        doc.setFillColor(154, 163, 173);
        g.m.cases.forEach(c => {
            doc.roundedRect(P.x + c.x * g.cote - bord, P.y + c.y * g.cote - bord,
                g.cote + bord * 2, g.cote + bord * 2, g.cote * 0.18, g.cote * 0.18, 'F');
        });
    }
    g.m.cases.forEach(c => {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...ENCRE.trait);
        doc.setLineWidth(0.4);
        if (c.zone === 'place' && doc.setLineDashPattern) doc.setLineDashPattern([1.2, 1], 0);
        doc.roundedRect(P.x + c.x * g.cote, P.y + c.y * g.cote, g.cote, g.cote, 1.2, 1.2, 'FD');
        if (doc.setLineDashPattern) doc.setLineDashPattern([], 0);
    });

    doc.setDrawColor(...ENCRE.gris);
    doc.setLineWidth(0.3);
    if (doc.setLineDashPattern) doc.setLineDashPattern([1.4, 1.2], 0);
    doc.line(g.xCoupe, g.b.y, g.xCoupe, g.b.y + g.b.h);
    if (doc.setLineDashPattern) doc.setLineDashPattern([], 0);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(g.taille / 0.3528);
    doc.setTextColor(...ENCRE.gris);
    doc.text(pourPdf('Voitures à découper'), g.pieces.x + g.pieces.w / 2, g.b.y + g.taille,
        { align: 'center' });

    const nb = g.m.n * 2;
    const d = g.d;
    for (let i = 0; i < nb; i++) {
        const bleue = i < g.m.n;
        const x = g.pieces.x + (g.pieces.w - d * 2) / 2 + (i % 2) * d;
        const y = g.b.y + g.taille * 1.8 + Math.floor(i / 2) * d;
        // Le cadre de découpe, puis la voiture dedans : c'est le cadre qu'on
        // suit aux ciseaux, et il doit faire la taille d'une case du plateau.
        doc.setDrawColor(...ENCRE.grille);
        doc.setLineWidth(0.25);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(x + d * 0.04, y + d * 0.04, d * 0.92, d * 0.92, 1.2, 1.2, 'FD');
        const wv = d * 0.5;
        dessinerVoiturePdf(doc, x + (d - wv) / 2, y + d * 0.13, wv, d * 0.74,
            ...(bleue ? BLEU : ROUGE), aplat, bleue ? 'B' : 'R');
    }

    vignettesParking(g.m).forEach((v, j) => {
        const yTitre = g.b.y + j * g.hVign;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(g.taille / 0.3528);
        doc.setTextColor(...ENCRE.texte);
        doc.text(pourPdf(v.titre), g.vign.x + g.vign.w / 2, yTitre + g.taille, { align: 'center' });
        g.m.cases.forEach((c, i) => {
            const col = v.couleurs[i];
            const x = g.vign.x0 + c.x * g.petit, y = yTitre + g.taille * 1.7 + c.y * g.petit;
            doc.setDrawColor(...ENCRE.grille);
            doc.setLineWidth(0.25);
            doc.setFillColor(...(aplat && col
                ? (col === 'B' ? [214, 226, 250] : [251, 220, 220]) : [255, 255, 255]));
            doc.roundedRect(x, y, g.petit, g.petit, 0.6, 0.6, 'FD');
            if (!col) return;
            // Trop petite pour être dessinée : son INITIALE dit la couleur, et
            // elle survit au noir et blanc.
            doc.setFontSize(Math.max(4, g.petit * 1.5));
            doc.setTextColor(...(col === 'B' ? BLEU[0] : ROUGE[0]));
            doc.text(col, x + g.petit / 2, y + g.petit * 0.72, { align: 'center' });
        });
    });
}

// --- LE POINT À POINT, SUR LE PAPIER --------------------------------------------

/**
 * Les points sont donnés en pour-cent — mais AUCUN DESSIN N'OCCUPE LES CENT
 * POUR CENT. Un poisson tient dans une bande large et basse, une maison dans un
 * carré plus haut que large. Rapportés tels quels au bloc, ils s'y perdaient
 * dans un coin, minuscules, avec leurs calculs collés les uns aux autres.
 *
 * On recadre donc sur l'étendue RÉELLE des points, en gardant la proportion :
 * le dessin remplit son bloc, et les étiquettes s'écartent d'autant.
 */
function geoPointAPoint(item, slot) {
    const m = item.meta;
    const b = slot.boite;
    const xs = m.points.map(p => p.x), ys = m.points.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const larg = Math.max(1, maxX - minX), haut = Math.max(1, maxY - minY);
    // La marge laisse la place aux étiquettes des points du bord, qui
    // s'écrivent SOUS le point et déborderaient du cadre. Elle a grandi avec
    // elles.
    const marge = 9;
    const k = Math.min((b.w - marge * 2) / larg, (b.h - marge * 2.4) / haut);
    const dessinW = larg * k, dessinH = haut * k;
    const ox = b.x + (b.w - dessinW) / 2;
    const oy = b.y + (b.h - dessinH) / 2 - marge * 0.2;
    const cote = Math.max(dessinW, dessinH);
    return {
        m, cote, x0: ox, y0: oy,
        px: (p) => ox + (p.x - minX) * k,
        py: (p) => oy + (p.y - minY) * k,
        // LE POINT EST UN REPÈRE, PAS UNE PASTILLE. Rémy : « fais des cercles
        // bien plus petits et sur le pdf une écriture un peu plus grande ».
        // C'est le bon ordre des choses : ce qu'on lit, c'est le CALCUL écrit
        // à côté du point ; le point, lui, n'a qu'à dire où poser le crayon.
        // Gros, il mangeait la place de son étiquette et faisait croire qu'on
        // devait le colorier.
        r: Math.max(0.55, cote * 0.008),
        taille: Math.max(7, Math.min(cote * 0.075, 13))
    };
}

function pointAPointPreviewHtml(item, slot, k, solution) {
    const g = geoPointAPoint(item, slot);
    const m = g.m;
    let html = '';
    if (solution) {
        // Le dessin, tracé : c'est la seule correction qui vaille.
        const pts = m.points.slice().sort((a, b) => a.ordre - b.ordre);
        m.segments.forEach(([a, b]) => {
            const A = pts[a - 1], B = pts[b - 1];
            if (!A || !B) return;
            const x1 = g.px(A), y1 = g.py(A), x2 = g.px(B), y2 = g.py(B);
            const L = Math.hypot(x2 - x1, y2 - y1);
            const ang = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
            html += `<div style="position:absolute; left:${x1 * k}px; top:${y1 * k}px;
                width:${L * k}px; height:${Math.max(1, 0.5 * k)}px; background:#6e7684;
                transform-origin:0 50%; transform:rotate(${ang}deg)"></div>`;
        });
    }
    m.points.forEach(p => {
        const x = g.px(p), y = g.py(p);
        html += `<div style="position:absolute; left:${(x - g.r) * k}px; top:${(y - g.r) * k}px;
            width:${g.r * 2 * k}px; height:${g.r * 2 * k}px; border-radius:50%;
            border:1.2px solid #1a202c; background:#fff"></div>`;
        html += `<div style="position:absolute; left:${(x - 12) * k}px; top:${(y + g.r + 0.4) * k}px;
            width:${24 * k}px; text-align:center; font-weight:800; color:#1a202c;
            font-size:${g.taille * 0.3528 * k}px; white-space:nowrap"
            >${echapperSheet(solution ? String(p.ordre) : p.texte)}</div>`;
    });
    return html;
}

function dessinerPointAPointPdf(doc, item, slot, solution) {
    const g = geoPointAPoint(item, slot);
    const m = g.m;
    if (solution) {
        const pts = m.points.slice().sort((a, b) => a.ordre - b.ordre);
        doc.setDrawColor(...ENCRE.gris);
        doc.setLineWidth(0.45);
        m.segments.forEach(([a, b]) => {
            const A = pts[a - 1], B = pts[b - 1];
            if (A && B) doc.line(g.px(A), g.py(A), g.px(B), g.py(B));
        });
    }
    doc.setDrawColor(...ENCRE.trait);
    doc.setFillColor(255, 255, 255);
    doc.setLineWidth(0.35);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(g.taille);
    doc.setTextColor(...ENCRE.trait);
    m.points.forEach(p => {
        const x = g.px(p), y = g.py(p);
        doc.circle(x, y, g.r, 'FD');
        doc.text(pourPdf(solution ? String(p.ordre) : p.texte),
            x, y + g.r + g.taille * 0.42, { align: 'center' });
    });
}

// --- LE DÉDALE, SUR LE PAPIER ---------------------------------------------------

/**
 * Un dédale imprimé, c'est UN QUADRILLAGE DE MURS — pas un dessin de couloirs.
 * On ne trace que les côtés fermés de chaque case ; les côtés ouverts ne
 * s'écrivent pas, et c'est leur absence qui fait le chemin.
 */
function geoDedale(item, slot) {
    const m = item.meta;
    const cote = slot.taille;
    const pas = cote / Math.max(m.cols, m.lignes);
    return {
        m, pas, cote,
        // Le dédale est centré dans son carré : une forme ronde n'occupe pas
        // le rectangle entier de ses colonnes.
        x0: slot.x + (cote - m.cols * pas) / 2,
        y0: slot.y + (cote - m.lignes * pas) / 2
    };
}

/** Les deux bouts d'un mur, en millimètres. */
function segmentMur(g, [x, y, dx, dy]) {
    const X = g.x0 + x * g.pas, Y = g.y0 + y * g.pas, p = g.pas;
    if (dx === 1) return [X + p, Y, X + p, Y + p];
    if (dx === -1) return [X, Y, X, Y + p];
    if (dy === 1) return [X, Y + p, X + p, Y + p];
    return [X, Y, X + p, Y];
}

function dedalePreviewHtml(item, slot, k, solution) {
    const g = geoDedale(item, slot);
    const m = g.m;
    let html = '';
    if (solution) {
        // Le chemin, tracé au milieu des cases.
        for (let i = 1; i < m.solution.length; i++) {
            const [ax, ay] = m.solution[i - 1], [bx, by] = m.solution[i];
            const x1 = g.x0 + (ax + 0.5) * g.pas, y1 = g.y0 + (ay + 0.5) * g.pas;
            const x2 = g.x0 + (bx + 0.5) * g.pas, y2 = g.y0 + (by + 0.5) * g.pas;
            html += `<div style="position:absolute; left:${Math.min(x1, x2) * k}px;
                top:${Math.min(y1, y2) * k}px;
                width:${(Math.abs(x2 - x1) + g.pas * 0.22) * k}px;
                height:${(Math.abs(y2 - y1) + g.pas * 0.22) * k}px;
                background:#c4b5fd; border-radius:${g.pas * 0.11 * k}px;
                transform:translate(${-g.pas * 0.11 * k}px, ${-g.pas * 0.11 * k}px)"></div>`;
        }
    }
    for (const mur of m.murs) {
        const [x1, y1, x2, y2] = segmentMur(g, mur);
        html += `<div style="position:absolute; left:${x1 * k}px; top:${y1 * k}px;
            width:${Math.max(1, (x2 - x1) * k || 1.2)}px;
            height:${Math.max(1, (y2 - y1) * k || 1.2)}px; background:#1a202c"></div>`;
    }
    const rond = (c, cls) => {
        const cx = g.x0 + (c[0] + 0.5) * g.pas, cy = g.y0 + (c[1] + 0.5) * g.pas;
        const r = g.pas * 0.3;
        return `<div style="position:absolute; left:${(cx - r) * k}px; top:${(cy - r) * k}px;
            width:${r * 2 * k}px; height:${r * 2 * k}px; background:#1a202c;
            border-radius:${cls === 'rond' ? '50%' : '0'}"></div>`;
    };
    html += rond(m.depart, 'rond') + rond(m.arrivee, 'carre');
    return html;
}

function dessinerDedalePdf(doc, item, slot, solution) {
    const g = geoDedale(item, slot);
    const m = g.m;
    if (solution) {
        doc.setDrawColor(...ENCRE.grille);
        doc.setLineWidth(g.pas * 0.42);
        doc.setLineJoin('round');
        for (let i = 1; i < m.solution.length; i++) {
            const [ax, ay] = m.solution[i - 1], [bx, by] = m.solution[i];
            doc.line(g.x0 + (ax + 0.5) * g.pas, g.y0 + (ay + 0.5) * g.pas,
                g.x0 + (bx + 0.5) * g.pas, g.y0 + (by + 0.5) * g.pas);
        }
    }
    doc.setDrawColor(...ENCRE.trait);
    doc.setLineWidth(Math.max(0.35, g.pas * 0.11));
    for (const mur of m.murs) {
        const [x1, y1, x2, y2] = segmentMur(g, mur);
        doc.line(x1, y1, x2, y2);
    }
    doc.setFillColor(...ENCRE.trait);
    const r = g.pas * 0.3;
    doc.circle(g.x0 + (m.depart[0] + 0.5) * g.pas, g.y0 + (m.depart[1] + 0.5) * g.pas, r, 'F');
    doc.rect(g.x0 + (m.arrivee[0] + 0.5) * g.pas - r, g.y0 + (m.arrivee[1] + 0.5) * g.pas - r,
        r * 2, r * 2, 'F');
}

// --- LE CHEMIN NUMÉROTÉ, SUR LE PAPIER ----------------------------------------
//
// Rémy est parti d'un LIVRE : la couverture qu'il a envoyée est un recueil de
// labyrinthes de nombres. Le jeu devait donc savoir revenir sur une feuille —
// c'est même sa forme d'origine. Une grille par bloc, et la page des solutions
// montre le chemin, tracé au gros trait comme à l'écran.

function geoChemin(item, slot) {
    const b = boiteDe(slot);
    const m = item.meta;
    const cote = Math.min(b.w / m.l, b.h / m.h);
    const x0 = b.x + (b.w - cote * m.l) / 2;
    const y0 = b.y + (b.h - cote * m.h) / 2;
    const centre = (x, y) => ({ x: x0 + (x + 0.5) * cote, y: y0 + (y + 0.5) * cote });
    return { b, m, cote, x0, y0, centre, r: cote * 0.33 };
}

function cheminPreviewHtml(item, slot, k, solution) {
    const g = geoChemin(item, slot);
    const T = (v) => (v * k).toFixed(2);
    let dedans = '';
    for (let y = 0; y < g.m.h; y++) {
        for (let x = 0; x < g.m.l; x++) {
            dedans += `<rect x="${T(g.x0 + x * g.cote)}" y="${T(g.y0 + y * g.cote)}"
                width="${T(g.cote)}" height="${T(g.cote)}" fill="none"
                stroke="#b0b6c5" stroke-width="${(0.25 * k).toFixed(2)}"/>`;
        }
    }
    if (solution) {
        const d = g.m.solution.map(([x, y], i) => {
            const p = g.centre(x, y);
            return `${i ? 'L' : 'M'}${T(p.x)} ${T(p.y)}`;
        }).join(' ');
        dedans += `<path d="${d}" fill="none" stroke="#8a90a0" stroke-linecap="round"
            stroke-linejoin="round" stroke-width="${(g.cote * 0.34 * k).toFixed(2)}" opacity="0.5"/>`;
    }
    g.m.reperes.forEach(rep => {
        const p = g.centre(rep.x, rep.y);
        dedans += `<circle cx="${T(p.x)}" cy="${T(p.y)}" r="${T(g.r)}" fill="#ffffff"
            stroke="#1a202c" stroke-width="${(0.35 * k).toFixed(2)}"/>`;
        dedans += `<text x="${T(p.x)}" y="${T(p.y)}" fill="#1a202c" font-weight="700"
            font-size="${(g.r * 1.15 * k).toFixed(2)}" text-anchor="middle"
            dominant-baseline="central" font-family="Helvetica, Arial, sans-serif">${rep.n}</text>`;
    });
    return `<svg style="position:absolute; left:0; top:0; width:100%; height:100%;
        overflow:visible; pointer-events:none">${dedans}</svg>`;
}

function dessinerCheminPdf(doc, item, slot, solution) {
    const g = geoChemin(item, slot);

    doc.setDrawColor(...ENCRE.grille);
    doc.setLineWidth(0.25);
    for (let y = 0; y < g.m.h; y++) {
        for (let x = 0; x < g.m.l; x++) {
            doc.rect(g.x0 + x * g.cote, g.y0 + y * g.cote, g.cote, g.cote);
        }
    }

    if (solution) {
        // Le chemin en gros trait gris : il se lit d'un coup d'oeil sans
        // couvrir les nombres, qu'on redessine par-dessus.
        doc.setDrawColor(...ENCRE.gris);
        doc.setLineWidth(g.cote * 0.3);
        doc.setLineCap('round');
        doc.setLineJoin('round');
        for (let i = 1; i < g.m.solution.length; i++) {
            const a = g.centre(...g.m.solution[i - 1]);
            const b = g.centre(...g.m.solution[i]);
            doc.line(a.x, a.y, b.x, b.y);
        }
        doc.setLineCap('butt');
        doc.setLineJoin('miter');
    }

    doc.setLineWidth(0.35);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(Math.max(6, Math.min(13, g.r * 3.1)));
    g.m.reperes.forEach(rep => {
        const p = g.centre(rep.x, rep.y);
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...ENCRE.trait);
        doc.circle(p.x, p.y, g.r, 'FD');
        doc.setTextColor(...ENCRE.texte);
        doc.text(String(rep.n), p.x, p.y, { align: 'center', baseline: 'middle' });
    });
    doc.setFont('helvetica', 'normal');
}

// --- LES BONS CHEMINS, SUR LE PAPIER ------------------------------------------
//
// Sa forme d'origine : Rémy est parti d'une fiche photocopiée. Une grille de
// nombres avec un D et un A dans deux coins opposés, la cible écrite dessous,
// et rien d'autre — le chemin se trace au crayon.
//
// LA CIBLE EST SOUS LA GRILLE, PAS DANS LA CONSIGNE. Six blocs sur une page,
// c'est six cibles différentes : les mettre dans la consigne commune les
// mélangerait. Chaque bloc porte donc la sienne, en gras, exactement comme sur
// la fiche de Rémy — « Trouve 240 ».
//
// CE QUI A ÉTÉ REPRIS, ET POURQUOI. Rémy, banc d'essai : « c'est assez moche le
// bon chemin en rendu PDF ». Trois défauts, dont un vrai bogue.
//
//   · LES CHIFFRES SORTAIENT DEUX FOIS TROP PETITS. L'aperçu écrivait un corps
//     de 0,42 × la case, le PDF plafonnait le sien à 15 points : dans une case
//     de 24 mm, cela fait un chiffre de 5 mm perdu au milieu de rien. L'aperçu
//     ne montrait donc PAS ce qu'on imprimait, ce qui est le pire défaut qu'un
//     aperçu puisse avoir. Les deux rendus lisent maintenant les mêmes mesures,
//     écrites une seule fois ici — en millimètres, la seule unité que les deux
//     partagent.
//
//   · LE D ET LE A RESSEMBLAIENT À DES NOMBRES. Même corps, même graisse, même
//     noir : rien ne disait où l'on part ni où l'on arrive, alors que c'est la
//     première chose à voir sur la grille. Leurs deux cases sont désormais
//     teintées, et la lettre y est plus grande.
//
//   · LA GRILLE ÉTAIT UN TABLEAU PÂLE. Neuf rectangles dessinés un par un, en
//     gris clair, chaque trait intérieur repassé deux fois. On trace maintenant
//     un cadre net et des traits intérieurs fins, une seule fois chacun.
//
// Et « Trouve 240 » est posé dans une étiquette de la largeur de la grille : la
// consigne de chaque bloc tient dans une forme, au lieu de flotter dessous.

/** Le corps d'un texte, en points, pour un cadratin de `mm` millimètres. */
const enPoints = (mm) => mm * 2.8346;

// LE TRAIT DE LA SOLUTION EST PÂLE, ET C'EST UNE CORRECTION.
//
// Le PDF le traçait en gris moyen, pleine opacité, SOUS les nombres : sur la
// page des solutions, les chiffres du chemin — ceux qu'on veut lire, puisque ce
// sont eux qu'on multiplie — devenaient noirs sur gris foncé. L'aperçu, lui,
// posait une opacité de 0,5 et paraissait correct : encore un endroit où il
// mentait sur ce qui allait sortir de l'imprimante. Un ruban clair porte le
// chemin aussi bien et laisse lire ce qu'il traverse.
const RUBAN_CHEMIN = [205, 211, 228];

/**
 * LA GÉOMÉTRIE DU BLOC, en millimètres — et elle est la SEULE.
 *
 * L'aperçu la multiplie par son échelle, le PDF la prend telle quelle : c'est
 * ce qui garantit que la feuille imprimée est celle qu'on a vue. Tout ce que
 * les deux dessins ont besoin de savoir est ici, corps des textes compris.
 */
function geoBonsChemins(item, slot) {
    const b = boiteDe(slot);
    const m = item.meta;
    // L'étiquette de la cible mange le bas du bloc : on la réserve AVANT de
    // calculer le côté des cases, sinon la grille déborderait dessus.
    const hCible = Math.max(5, Math.min(8.5, b.h * 0.155));
    const dispo = { w: b.w, h: b.h - hCible };
    const cote = Math.min(dispo.w / m.l, dispo.h / m.h);
    const W = cote * m.l, H = cote * m.h;
    const x0 = b.x + (b.w - W) / 2;
    const y0 = b.y + (dispo.h - H) / 2;
    const centre = (x, y) => ({ x: x0 + (x + 0.5) * cote, y: y0 + (y + 0.5) * cote });
    const estBout = (x, y) => (x === 0 && y === 0) || (x === m.l - 1 && y === m.h - 1);
    // L'étiquette fait la largeur de la grille : les deux formes s'alignent, et
    // le bloc se lit comme un seul objet.
    const pill = { x: x0, y: y0 + H + hCible * 0.14, w: W, h: hCible * 0.78 };
    return {
        b, m, cote, x0, y0, W, H, centre, estBout, pill,
        // Les corps, en millimètres de cadratin. Un chiffre occupe alors un peu
        // plus du tiers de sa case : lisible de loin, sans toucher les traits.
        corps: { nombre: cote * 0.46, lettre: cote * 0.56, cible: Math.min(pill.h * 0.62, W / 6.5) },
        rayon: Math.min(1.6, cote * 0.1),
        trace: cote * 0.26
    };
}

function bonsCheminsPreviewHtml(item, slot, k, solution) {
    const g = geoBonsChemins(item, slot);
    const T = (v) => (v * k).toFixed(2);
    const txt = (p, s, corps, poids) => `<text x="${T(p.x)}" y="${T(p.y)}" fill="#1a202c"
        font-weight="${poids}" font-size="${T(corps)}" text-anchor="middle"
        dominant-baseline="central" font-family="Helvetica, Arial, sans-serif">${s}</text>`;
    let dedans = '';

    // Les deux bouts, teintés : on voit d'où l'on part avant d'avoir rien lu.
    for (let y = 0; y < g.m.h; y++) {
        for (let x = 0; x < g.m.l; x++) {
            if (!g.estBout(x, y)) continue;
            dedans += `<rect x="${T(g.x0 + x * g.cote)}" y="${T(g.y0 + y * g.cote)}"
                width="${T(g.cote)}" height="${T(g.cote)}" fill="#e6eaf6"/>`;
        }
    }
    // Le cadre, puis les traits intérieurs — chacun une seule fois.
    dedans += `<rect x="${T(g.x0)}" y="${T(g.y0)}" width="${T(g.W)}" height="${T(g.H)}"
        rx="${T(g.rayon)}" fill="none" stroke="#4a5266" stroke-width="${T(0.45)}"/>`;
    for (let x = 1; x < g.m.l; x++) {
        dedans += `<path d="M${T(g.x0 + x * g.cote)} ${T(g.y0)} V${T(g.y0 + g.H)}"
            stroke="#b0b6c5" stroke-width="${T(0.22)}"/>`;
    }
    for (let y = 1; y < g.m.h; y++) {
        dedans += `<path d="M${T(g.x0)} ${T(g.y0 + y * g.cote)} H${T(g.x0 + g.W)}"
            stroke="#b0b6c5" stroke-width="${T(0.22)}"/>`;
    }

    if (solution) {
        const d = g.m.solution.map(([x, y], i) => {
            const p = g.centre(x, y);
            return `${i ? 'L' : 'M'}${T(p.x)} ${T(p.y)}`;
        }).join(' ');
        dedans += `<path d="${d}" fill="none" stroke="#cdd3e4" stroke-linecap="round"
            stroke-linejoin="round" stroke-width="${T(g.trace)}"/>`;
    }

    for (let y = 0; y < g.m.h; y++) {
        for (let x = 0; x < g.m.l; x++) {
            const v = String(g.m.cases[y][x]);
            const bout = g.estBout(x, y);
            dedans += txt(g.centre(x, y), v, bout ? g.corps.lettre : g.corps.nombre, bout ? 800 : 700);
        }
    }

    dedans += `<rect x="${T(g.pill.x)}" y="${T(g.pill.y)}" width="${T(g.pill.w)}"
        height="${T(g.pill.h)}" rx="${T(g.pill.h / 2)}" fill="#e6eaf6"/>`;
    dedans += txt({ x: g.pill.x + g.pill.w / 2, y: g.pill.y + g.pill.h / 2 },
        `Trouve ${g.m.cible}`, g.corps.cible, 700);
    return `<svg style="position:absolute; left:0; top:0; width:100%; height:100%;
        overflow:visible; pointer-events:none">${dedans}</svg>`;
}

function dessinerBonsCheminsPdf(doc, item, slot, solution) {
    const g = geoBonsChemins(item, slot);

    // Les deux bouts d'abord : une teinte pleine, sous tout le reste.
    doc.setFillColor(...ENCRE.donnee);
    for (let y = 0; y < g.m.h; y++) {
        for (let x = 0; x < g.m.l; x++) {
            if (g.estBout(x, y)) doc.rect(g.x0 + x * g.cote, g.y0 + y * g.cote, g.cote, g.cote, 'F');
        }
    }
    // Le cadre net, puis les traits intérieurs fins : chacun tracé UNE fois,
    // là où neuf rectangles repassaient deux fois sur chaque trait commun.
    doc.setDrawColor(...ENCRE.trait);
    doc.setLineWidth(0.45);
    doc.roundedRect(g.x0, g.y0, g.W, g.H, g.rayon, g.rayon);
    doc.setDrawColor(...ENCRE.grille);
    doc.setLineWidth(0.22);
    for (let x = 1; x < g.m.l; x++) doc.line(g.x0 + x * g.cote, g.y0, g.x0 + x * g.cote, g.y0 + g.H);
    for (let y = 1; y < g.m.h; y++) doc.line(g.x0, g.y0 + y * g.cote, g.x0 + g.W, g.y0 + y * g.cote);

    if (solution) {
        // Le chemin en ruban clair : il se lit d'un coup d'oeil sans effacer les
        // nombres, qu'on redessine par-dessus.
        doc.setDrawColor(...RUBAN_CHEMIN);
        doc.setLineWidth(g.trace);
        doc.setLineCap('round');
        doc.setLineJoin('round');
        for (let i = 1; i < g.m.solution.length; i++) {
            const a = g.centre(...g.m.solution[i - 1]);
            const b = g.centre(...g.m.solution[i]);
            doc.line(a.x, a.y, b.x, b.y);
        }
        doc.setLineCap('butt');
        doc.setLineJoin('miter');
    }

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...ENCRE.texte);
    for (let y = 0; y < g.m.h; y++) {
        for (let x = 0; x < g.m.l; x++) {
            const p = g.centre(x, y);
            doc.setFontSize(enPoints(g.estBout(x, y) ? g.corps.lettre : g.corps.nombre));
            doc.text(String(g.m.cases[y][x]), p.x, p.y, { align: 'center', baseline: 'middle' });
        }
    }

    doc.setFillColor(...ENCRE.donnee);
    doc.roundedRect(g.pill.x, g.pill.y, g.pill.w, g.pill.h, g.pill.h / 2, g.pill.h / 2, 'F');
    doc.setFontSize(enPoints(g.corps.cible));
    doc.text(pourPdf(`Trouve ${g.m.cible}`), g.pill.x + g.pill.w / 2, g.pill.y + g.pill.h / 2,
        { align: 'center', baseline: 'middle' });
    doc.setFont('helvetica', 'normal');
}

// --- RELIER SANS CROISER, SUR LE PAPIER ---------------------------------------
//
// Sa forme d'origine : Rémy est parti d'une image de fiche. Un cadre, des
// carrés étiquetés, rien d'autre — on trace au crayon et l'on gomme.
//
// LA CORRECTION DIT « UNE » SOLUTION, PAS « LA ». Ces figures en ont presque
// toujours plusieurs, qui ne se ressemblent même pas : un élève dont le tracé
// diffère de la feuille de solutions ne doit pas croire qu'il s'est trompé.
// C'est écrit dans la consigne du bloc de solutions.

function geoSansCroiser(item, slot) {
    const b = boiteDe(slot);
    const m = item.meta;
    const k = Math.min(b.w / m.cadre.l, b.h / m.cadre.h);
    const x0 = b.x + (b.w - m.cadre.l * k) / 2;
    const y0 = b.y + (b.h - m.cadre.h * k) / 2;
    const point = (p) => ({ x: x0 + p.x * k, y: y0 + p.y * k });
    return { b, m, k, x0, y0, point, cote: m.cote * k };
}

function sansCroiserPreviewHtml(item, slot, kEch, solution) {
    const g = geoSansCroiser(item, slot);
    const T = (v) => (v * kEch).toFixed(2);
    let d = `<rect x="${T(g.x0)}" y="${T(g.y0)}" width="${T(g.m.cadre.l * g.k)}"
        height="${T(g.m.cadre.h * g.k)}" fill="none" stroke="#1a202c"
        stroke-width="${(0.4 * kEch).toFixed(2)}"/>`;

    if (solution) {
        for (const t of g.m.solution) {
            const trace = t.points.map((p, i) => {
                const q = g.point(p);
                return `${i ? 'L' : 'M'}${T(q.x)} ${T(q.y)}`;
            }).join(' ');
            d += `<path d="${trace}" fill="none" stroke="#8a90a0" stroke-linecap="round"
                stroke-linejoin="round" stroke-width="${(g.cote * 0.28 * kEch).toFixed(2)}" opacity="0.65"/>`;
        }
    }

    for (const b of g.m.bornes) {
        const c = g.point(b);
        d += `<rect x="${T(c.x - g.cote / 2)}" y="${T(c.y - g.cote / 2)}" width="${T(g.cote)}"
            height="${T(g.cote)}" fill="#ffffff" stroke="#1a202c" stroke-width="${(0.35 * kEch).toFixed(2)}"/>`;
        d += `<text x="${T(c.x)}" y="${T(c.y)}" fill="#1a202c" font-weight="700"
            font-size="${(g.cote * 0.68 * kEch).toFixed(2)}" text-anchor="middle"
            dominant-baseline="central" font-family="Helvetica, Arial, sans-serif">${b.lettre}</text>`;
    }
    return `<svg style="position:absolute; left:0; top:0; width:100%; height:100%;
        overflow:visible; pointer-events:none">${d}</svg>`;
}

function dessinerSansCroiserPdf(doc, item, slot, solution) {
    const g = geoSansCroiser(item, slot);

    doc.setDrawColor(...ENCRE.trait);
    doc.setLineWidth(0.4);
    doc.rect(g.x0, g.y0, g.m.cadre.l * g.k, g.m.cadre.h * g.k);

    if (solution) {
        doc.setDrawColor(...ENCRE.gris);
        doc.setLineWidth(Math.max(0.5, g.cote * 0.22));
        doc.setLineCap('round');
        doc.setLineJoin('round');
        for (const t of g.m.solution) {
            for (let i = 1; i < t.points.length; i++) {
                const a = g.point(t.points[i - 1]);
                const b = g.point(t.points[i]);
                doc.line(a.x, a.y, b.x, b.y);
            }
        }
        doc.setLineCap('butt');
        doc.setLineJoin('miter');
    }

    doc.setLineWidth(0.35);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(Math.max(6, Math.min(14, g.cote * 1.9)));
    for (const b of g.m.bornes) {
        const c = g.point(b);
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...ENCRE.trait);
        doc.rect(c.x - g.cote / 2, c.y - g.cote / 2, g.cote, g.cote, 'FD');
        doc.setTextColor(...ENCRE.texte);
        doc.text(b.lettre, c.x, c.y, { align: 'center', baseline: 'middle' });
    }
    doc.setFont('helvetica', 'normal');
}

// --- LE LABYRINTHE DES NOMBRES, SUR LE PAPIER ---------------------------------
//
// Sa forme d'origine : Rémy est parti d'un livre. Une grille de nombres, un
// depart entoure, une etoile, et rien d'autre — le chemin se trace au crayon.

function geoLabyNombres(item, slot) {
    const b = boiteDe(slot);
    const m = item.meta;
    const cote = Math.min(b.w / m.l, b.h / m.h);
    const x0 = b.x + (b.w - cote * m.l) / 2;
    const y0 = b.y + (b.h - cote * m.h) / 2;
    const centre = (x, y) => ({ x: x0 + (x + 0.5) * cote, y: y0 + (y + 0.5) * cote });
    return { b, m, cote, x0, y0, centre };
}

/** Une etoile a cinq branches, en coordonnees absolues. */
function pointsEtoile(cx, cy, r) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 ? r * 0.45 : r;
        pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    return pts;
}

function labyNombresPreviewHtml(item, slot, k, solution) {
    const g = geoLabyNombres(item, slot);
    const T = (v) => (v * k).toFixed(2);
    let dedans = '';
    for (let y = 0; y < g.m.h; y++) {
        for (let x = 0; x < g.m.l; x++) {
            dedans += `<rect x="${T(g.x0 + x * g.cote)}" y="${T(g.y0 + y * g.cote)}"
                width="${T(g.cote)}" height="${T(g.cote)}" fill="none"
                stroke="#b0b6c5" stroke-width="${(0.25 * k).toFixed(2)}"/>`;
        }
    }
    if (solution) {
        const d = g.m.solution.map(([x, y], i) => {
            const p = g.centre(x, y);
            return `${i ? 'L' : 'M'}${T(p.x)} ${T(p.y)}`;
        }).join(' ');
        dedans += `<path d="${d}" fill="none" stroke="#8a90a0" stroke-linecap="round"
            stroke-linejoin="round" stroke-width="${(g.cote * 0.16 * k).toFixed(2)}" opacity="0.75"/>`;
    }
    // Le depart : un carre autour de la case.
    const dep = g.centre(...g.m.depart);
    dedans += `<rect x="${T(dep.x - g.cote * 0.42)}" y="${T(dep.y - g.cote * 0.42)}"
        width="${T(g.cote * 0.84)}" height="${T(g.cote * 0.84)}" rx="${T(g.cote * 0.12)}"
        fill="none" stroke="#1a202c" stroke-width="${(0.5 * k).toFixed(2)}"/>`;
    for (let y = 0; y < g.m.h; y++) {
        for (let x = 0; x < g.m.l; x++) {
            const n = g.m.grille[y][x];
            const p = g.centre(x, y);
            if (!n) {
                const pts = pointsEtoile(p.x, p.y, g.cote * 0.3).map(([a, b2]) => `${T(a)},${T(b2)}`).join(' ');
                dedans += `<polygon points="${pts}" fill="#1a202c"/>`;
                continue;
            }
            dedans += `<text x="${T(p.x)}" y="${T(p.y)}" fill="#1a202c" font-weight="700"
                font-size="${(g.cote * 0.42 * k).toFixed(2)}" text-anchor="middle"
                dominant-baseline="central" font-family="Helvetica, Arial, sans-serif">${n}</text>`;
        }
    }
    return `<svg style="position:absolute; left:0; top:0; width:100%; height:100%;
        overflow:visible; pointer-events:none">${dedans}</svg>`;
}

function dessinerLabyNombresPdf(doc, item, slot, solution) {
    const g = geoLabyNombres(item, slot);

    doc.setDrawColor(...ENCRE.grille);
    doc.setLineWidth(0.25);
    for (let y = 0; y < g.m.h; y++) {
        for (let x = 0; x < g.m.l; x++) {
            doc.rect(g.x0 + x * g.cote, g.y0 + y * g.cote, g.cote, g.cote);
        }
    }

    if (solution) {
        doc.setDrawColor(...ENCRE.gris);
        doc.setLineWidth(Math.max(0.5, g.cote * 0.14));
        doc.setLineCap('round');
        doc.setLineJoin('round');
        for (let i = 1; i < g.m.solution.length; i++) {
            const a = g.centre(...g.m.solution[i - 1]);
            const b = g.centre(...g.m.solution[i]);
            doc.line(a.x, a.y, b.x, b.y);
        }
        doc.setLineCap('butt');
        doc.setLineJoin('miter');
    }

    const dep = g.centre(...g.m.depart);
    doc.setDrawColor(...ENCRE.trait);
    doc.setLineWidth(0.5);
    doc.rect(dep.x - g.cote * 0.42, dep.y - g.cote * 0.42, g.cote * 0.84, g.cote * 0.84);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(Math.max(6, Math.min(14, g.cote * 1.2)));
    doc.setTextColor(...ENCRE.texte);
    doc.setFillColor(...ENCRE.trait);
    for (let y = 0; y < g.m.h; y++) {
        for (let x = 0; x < g.m.l; x++) {
            const n = g.m.grille[y][x];
            const p = g.centre(x, y);
            if (!n) {
                const pts = pointsEtoile(p.x, p.y, g.cote * 0.3);
                doc.lines(
                    pts.slice(1).map((q, i) => [q[0] - pts[i][0], q[1] - pts[i][1]])
                        .concat([[pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]]]),
                    pts[0][0], pts[0][1], [1, 1], 'F'
                );
                continue;
            }
            doc.text(String(n), p.x, p.y, { align: 'center', baseline: 'middle' });
        }
    }
    doc.setFont('helvetica', 'normal');
}

export const RENDUS_CASSETETE = {
    chemin: {
        titre: 'Le chemin numéroté',
        consigne: () => 'TRACE UN SEUL CHEMIN qui part du 1, passe par 2, 3, 4… dans l\'ordre, '
            + 'et remplit TOUTES les cases. On avance case par case, sans diagonale, et on ne '
            + 'repasse jamais deux fois au même endroit. La règle qu\'on oublie est la seconde : '
            + 'aucune case ne doit rester en dehors du chemin. Commence par les COINS — un coin '
            + 'n\'a que deux voisines.',
        previewGrille: cheminPreviewHtml,
        pdfGrille: dessinerCheminPdf,
        nomBloc: 'Grille', nomBlocs: 'grilles',
        disposition: { cols: 3, rows: 2, maxCols: 4, maxRows: 3 },
        parLigneDefaut: 3
    },
    'laby-nombres': {
        titre: 'Le labyrinthe des nombres',
        consigne: () => 'LE NOMBRE DE TA CASE DIT DE COMBIEN DE CASES TU SAUTES. Tu choisis la '
            + 'direction — haut, bas, gauche ou droite — mais pas la distance, et jamais la '
            + 'diagonale. Pars de la case encadrée et rejoins l\'étoile. Attention en comptant : '
            + 'la première case comptée est celle juste à côté de toi, pas celle où tu es.',
        previewGrille: labyNombresPreviewHtml,
        pdfGrille: dessinerLabyNombresPdf,
        nomBloc: 'Grille', nomBlocs: 'grilles',
        disposition: { cols: 3, rows: 2, maxCols: 4, maxRows: 3 },
        parLigneDefaut: 3
    },
    'bons-chemins': {
        titre: 'Les bons chemins',
        consigne: () => 'TROUVE LE CHEMIN DE D À A dont le produit vaut le nombre écrit sous la '
            + 'grille. On multiplie les nombres traversés ; on peut aller sur n\'importe quelle '
            + 'case voisine, EN DIAGONALE AUSSI, mais jamais deux fois sur la même case. Ne '
            + 'cherche pas au hasard : casse d\'abord le nombre en facteurs. Il te dira quels '
            + 'nombres doivent être sur le chemin — et lesquels ne peuvent pas y être.',
        previewGrille: bonsCheminsPreviewHtml,
        pdfGrille: dessinerBonsCheminsPdf,
        nomBloc: 'Grille', nomBlocs: 'grilles',
        // Un peu plus haut que large : la cible s'écrit sous la grille.
        proportions: { w: 1, h: 1.18 },
        // SIX PAR LIGNE. Rémy : « bons chemins — 6 grilles par ligne par
        // défaut ». Une grille de neuf cases n'a pas besoin de six centimètres
        // de large : les chiffres qu'elle porte tiennent en un caractère, et
        // c'est la HAUTEUR de la page qu'on gaspillait à trois par rangée. Six
        // de front, et la feuille porte une vraie séance — ce qui est
        // exactement la forme de la fiche d'origine, où la même grille était
        // répétée en bande.
        disposition: { cols: 6, rows: 3, maxCols: 6, maxRows: 5 },
        parLigneDefaut: 6
    },
    'sans-croiser': {
        titre: 'Relier sans croiser',
        consigne: () => 'RELIE CHAQUE LETTRE À SA JUMELLE. Trois interdits : les traits ne se '
            + 'croisent pas (ni entre eux, ni eux-mêmes), ils ne sortent pas du cadre, et ils ne '
            + 'passent pas sur un carré — pas même sur les tiens, sauf pour en partir et y '
            + 'arriver. Regarde bien AVANT de tracer : un trait posé coupe le cadre en deux, et '
            + 'ce qui est d\'un côté ne pourra plus rejoindre l\'autre. Commence par la paire qui '
            + 'a le moins de chemins possibles, pas par la plus proche.',
        previewGrille: sansCroiserPreviewHtml,
        pdfGrille: dessinerSansCroiserPdf,
        nomBloc: 'Figure', nomBlocs: 'figures',
        // Un peu plus large que haut, comme le cadre de la fiche.
        proportions: { w: 1.28, h: 1 },
        disposition: { cols: 2, rows: 3, maxCols: 3, maxRows: 4 },
        parLigneDefaut: 2,
        // « UNE » solution, pas « LA » : ces figures en ont plusieurs, qui ne
        // se ressemblent pas. Un élève dont le tracé diffère ne s'est pas
        // trompé pour autant, et la feuille doit le dire.
        // Court, parce que l'en-tête le tronque : la nuance complète est dans
        // la consigne. « Une » et non « la » suffit à dire l'essentiel — un
        // élève dont le tracé diffère ne s'est pas trompé pour autant.
        nomSolutions: 'Une solution possible'
    },
    parking: {
        titre: 'Le jeu à découper : le Parking',
        consigne: (items) => {
            const m = items && items[0] && items[0].meta;
            const n = (m && m.n) || 4;
            const mini = (m && m.mini) || 104;
            return `DÉCOUPE LES ${n * 2} VOITURES et place-les comme sur « Au Départ ». Le but `
                + 'est que toutes celles de gauche se retrouvent à droite, et celles de droite '
                + 'à gauche. Les véhicules se déplacent CASE PAR CASE, sur une place voisine '
                + 'libre : une voiture ne saute jamais par-dessus une autre. Tout est là — une '
                + 'seule voie, et une seule place en pointillés pour se ranger et laisser '
                + `passer. Minimum : ${mini} coups.`;
        },
        previewGrille: parkingPreviewHtml,
        pdfGrille: dessinerParkingPdf,
        nomBloc: 'Jeu', nomBlocs: 'jeux',
        // UN SEUL, UNE SEULE FOIS, ET IL PREND TOUTE LA PAGE.
        //
        // Rémy, d'abord : « les exercices énigmes doivent être en version
        // unique de base et occuper le maximum d'espace pour être plus facile
        // à découper. » Une proportion déclarée laissait quarante-cinq
        // millimètres de blanc au bord droit ; « plein » rend au plateau la
        // page entière (voir core/dispositionFiche.js).
        //
        // Puis, la feuille en main : « pour la tour de hanoi, les grenouilles
        // et le parking, pour l'impression, une seule colonne, pas plus, et
        // aussi mettre une seule fois l'exercice. » `maxCols: 2` autorisait
        // encore deux plateaux côte à côte, et la feuille du parcours en
        // demandait six par défaut : on découpait six fois le même jeu. Un
        // jeu à découper n'est pas une série d'exercices — on en distribue un
        // par élève, et il n'y en a qu'un à faire.
        proportions: 'plein',
        unique: true,
        disposition: { cols: 1, rows: 1, maxCols: 1, maxRows: 1 },
        parLigneDefaut: 1
    },
    tourBrahma: {
        titre: 'Le jeu à découper : la Tour de Brahma',
        consigne: (items) => {
            const n = (items && items[0] && items[0].meta && items[0].meta.n) || 4;
            return `DÉCOUPE LES ${n} BOULES et pose-les sur le conduit de gauche, la plus `
                + 'grosse en bas. Le but est de les passer TOUTES à droite. On déplace une '
                + 'boule à la fois, on a le droit d\'utiliser les trois conduits, et la seule '
                + 'règle est qu\'une boule doit toujours être posée sur une boule PLUS GROSSE. '
                + `Sauras-tu le faire en ${2 ** n - 1} coups ? C'est le minimum, et il n'y a `
                + 'pas moyen de faire mieux.';
        },
        previewGrille: brahmaPreviewHtml,
        pdfGrille: dessinerBrahmaPdf,
        nomBloc: 'Jeu', nomBlocs: 'jeux',
        // UN SEUL, UNE SEULE FOIS, ET IL PREND TOUTE LA PAGE.
        //
        // Rémy, d'abord : « les exercices énigmes doivent être en version
        // unique de base et occuper le maximum d'espace pour être plus facile
        // à découper. » Une proportion déclarée laissait quarante-cinq
        // millimètres de blanc au bord droit ; « plein » rend au plateau la
        // page entière (voir core/dispositionFiche.js).
        //
        // Puis, la feuille en main : « pour la tour de hanoi, les grenouilles
        // et le parking, pour l'impression, une seule colonne, pas plus, et
        // aussi mettre une seule fois l'exercice. » `maxCols: 2` autorisait
        // encore deux plateaux côte à côte, et la feuille du parcours en
        // demandait six par défaut : on découpait six fois le même jeu. Un
        // jeu à découper n'est pas une série d'exercices — on en distribue un
        // par élève, et il n'y en a qu'un à faire.
        proportions: 'plein',
        unique: true,
        disposition: { cols: 1, rows: 1, maxCols: 1, maxRows: 1 },
        parLigneDefaut: 1
    },
    grenouilles: {
        titre: 'Le jeu à découper : les Grenouilles',
        // COURTE, PARCE QU'ELLE EST COUPÉE : le bandeau tient deux lignes, et
        // la version longue s'arrêtait sur « et attention, une ».
        consigne: (items) => {
            const n = (items && items[0] && items[0].meta && items[0].meta.n) || 4;
            return `DÉCOUPE LES ${n * 2} GRENOUILLES et place-les comme sur la vignette `
                + '« Départ ». Le but est d\'arriver à « Arrivée ». Les vertes ne vont qu\'à '
                + 'DROITE, les rouges qu\'à GAUCHE ; une grenouille avance d\'un nénuphar '
                + `libre, ou saute par-dessus UNE SEULE grenouille. Minimum : ${n * n + 2 * n} coups.`;
        },
        previewGrille: grenouillesPreviewHtml,
        pdfGrille: dessinerGrenouillesPdf,
        nomBloc: 'Jeu', nomBlocs: 'jeux',
        // UN SEUL, UNE SEULE FOIS, ET IL PREND TOUTE LA PAGE.
        //
        // Rémy, d'abord : « les exercices énigmes doivent être en version
        // unique de base et occuper le maximum d'espace pour être plus facile
        // à découper. » Une proportion déclarée laissait quarante-cinq
        // millimètres de blanc au bord droit ; « plein » rend au plateau la
        // page entière (voir core/dispositionFiche.js).
        //
        // Puis, la feuille en main : « pour la tour de hanoi, les grenouilles
        // et le parking, pour l'impression, une seule colonne, pas plus, et
        // aussi mettre une seule fois l'exercice. » `maxCols: 2` autorisait
        // encore deux plateaux côte à côte, et la feuille du parcours en
        // demandait six par défaut : on découpait six fois le même jeu. Un
        // jeu à découper n'est pas une série d'exercices — on en distribue un
        // par élève, et il n'y en a qu'un à faire.
        proportions: 'plein',
        unique: true,
        disposition: { cols: 1, rows: 1, maxCols: 1, maxRows: 1 },
        parLigneDefaut: 1
    },
    dedale: {
        titre: 'Le dédale',
        consigne: () => 'Va du ROND au CARRÉ sans traverser de mur. Entre deux cases il '
            + 'n\'existe qu\'un seul chemin : si tu tournes en rond, c\'est que tu es dans '
            + 'une impasse — reviens sur tes pas et essaie l\'autre couloir. Repasse ton '
            + 'trajet au crayon.',
        previewGrille: dedalePreviewHtml,
        pdfGrille: dessinerDedalePdf,
        nomBloc: 'Dédale', nomBlocs: 'dédales',
        proportions: { w: 1, h: 1 },
        disposition: { cols: 2, rows: 1, maxCols: 3, maxRows: 2 },
        parLigneDefaut: 2,
        grilleMax: 120
    },
    pointapoint: {
        titre: 'Le point à point',
        consigne: () => 'Cherche le calcul qui vaut 1 et pars de là : relie ensuite '
            + 'celui qui vaut 2, puis 3, et ainsi de suite jusqu\'au dernier. Une image '
            + 'apparaît — mais on ne la devine qu\'à la fin.',
        previewGrille: pointAPointPreviewHtml,
        pdfGrille: dessinerPointAPointPdf,
        nomBloc: 'Dessin', nomBlocs: 'dessins',
        proportions: { w: 1, h: 1 },
        disposition: { cols: 2, rows: 1, maxCols: 3, maxRows: 2 },
        parLigneDefaut: 1,
        grilleMax: 130
    },
};
