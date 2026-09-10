// LES JEUX QUI SE JOUENT À DEUX, sur la feuille.
//
// Une tranche de `printSheet.js`, découpée par `tools/decouperPrintSheet.mjs`.
// Tout ce qui est ici n'est utilisé QUE par les exercices de cette famille ;
// ce qui sert à plusieurs vit dans `socle.js`.

import {
    ENCRE, boiteDe, echapperSheet
} from './socle.js';
import { choisirDisposition } from '../../core/dispositionFiche.js';
import { polycopieEnCouleur, pourPdf } from '../ficheRendu.js';

/** La grille du puissance 4 : un rectangle de cercles, colonnes numérotées. */
function geoP4(item, slot) {
    const b = boiteDe(slot);
    const { cols, rows } = item.meta;
    // Une bande en haut pour les numéros de colonne : sans eux, on ne peut
    // pas dire « je joue la 4 » à voix haute.
    const tete = Math.min(6, b.h * 0.09);
    const pas = Math.min((b.w - 2) / cols, (b.h - tete - 2) / rows);
    const w = pas * cols, h = pas * rows;
    return { b, cols, rows, pas, tete, x: b.x + (b.w - w) / 2, y: b.y + tete + (b.h - tete - h) / 2, w, h };
}

function p4PreviewHtml(item, slot, k) {
    const g = geoP4(item, slot);
    const T = (v) => (v * k).toFixed(2);
    let html = `<div class="fx-plat" style="left:${T(g.x)}px; top:${T(g.y)}px;
        width:${T(g.w)}px; height:${T(g.h)}px"></div>`;
    for (let c = 0; c < g.cols; c++) {
        html += `<div class="fx-plat-num" style="left:${T(g.x + c * g.pas)}px;
            top:${T(g.y - g.tete)}px; width:${T(g.pas)}px; height:${T(g.tete)}px;
            font-size:${T(g.tete * 0.72)}px">${c + 1}</div>`;
        for (let r = 0; r < g.rows; r++) {
            const d = g.pas * 0.76;
            html += `<div class="fx-plat-trou" style="left:${T(g.x + c * g.pas + (g.pas - d) / 2)}px;
                top:${T(g.y + r * g.pas + (g.pas - d) / 2)}px; width:${T(d)}px; height:${T(d)}px"></div>`;
        }
    }
    return html;
}

function dessinerP4Pdf(doc, item, slot) {
    const g = geoP4(item, slot);
    doc.setDrawColor(...ENCRE.trait);
    doc.setLineWidth(0.6);
    doc.roundedRect(g.x, g.y, g.w, g.h, 1.4, 1.4, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(Math.min(11, g.tete * 2.4));
    doc.setTextColor(...ENCRE.gris);
    for (let c = 0; c < g.cols; c++) {
        doc.text(String(c + 1), g.x + c * g.pas + g.pas / 2, g.y - g.tete * 0.28,
            { align: 'center', baseline: 'alphabetic' });
    }
    doc.setDrawColor(...ENCRE.grille);
    doc.setLineWidth(0.3);
    for (let c = 0; c < g.cols; c++) for (let r = 0; r < g.rows; r++) {
        doc.circle(g.x + c * g.pas + g.pas / 2, g.y + r * g.pas + g.pas / 2, g.pas * 0.38, 'S');
    }
}

/** Le sim : six points en hexagone, numérotés, et rien d'autre. */
function geoSim(item, slot) {
    const b = boiteDe(slot);
    // Une bande en bas pour la légende des deux couleurs.
    const pied = Math.min(7, b.h * 0.12);
    const R = Math.max(6, Math.min(b.w, b.h - pied) / 2 - 5);
    const cx = b.x + b.w / 2, cy = b.y + (b.h - pied) / 2;
    const pts = Array.from({ length: 6 }, (_, i) => {
        const a = (-90 + i * 60) * Math.PI / 180;
        return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
    });
    return { b, R, cx, cy, pied, pts, rayonPoint: Math.max(1.4, R * 0.055) };
}

/** Un point poussé vers l'extérieur de l'hexagone, à distance fixe. */
function dehors(g, p) {
    const dx = p.x - g.cx, dy = p.y - g.cy;
    const d = Math.hypot(dx, dy) || 1;
    const ecart = g.rayonPoint * 2 + 2.4;
    return [p.x + (dx / d) * ecart, p.y + (dy / d) * ecart];
}

// --- LA PIPOPIPETTE, À JOUER AU CRAYON ---------------------------------------
//
// Rémy : « on pourrait faire le pdf ». C'est le jeu qui le mérite le plus des
// trois : il est NÉ sur du papier — Édouard Lucas, 1889 —, et l'écran n'en est
// que la copie. Une grille de points, deux crayons, et rien d'autre.
//
// LES POINTS SONT DES POINTS, PAS DES CASES. On ne trace pas dans les carrés,
// on trace ENTRE les points : la feuille ne dessine donc aucune grille, juste
// le semis. Un quadrillage imprimé donnerait les traits d'avance.

function geoPipopipette(item, slot) {
    const b = boiteDe(slot);
    const m = item.meta || {};
    const cols = Math.max(2, m.cols || 5), rows = Math.max(2, m.rows || 4);
    // Une bande en bas pour le rappel des deux crayons.
    const pied = Math.min(7, b.h * 0.12);
    // `cols` compte les CARRÉS : il y a un point de plus dans chaque sens.
    const pas = Math.min((b.w - 6) / cols, (b.h - pied - 6) / rows);
    const w = pas * cols, h = pas * rows;
    return {
        b, cols, rows, pas, pied,
        x0: b.x + (b.w - w) / 2,
        y0: b.y + (b.h - pied - h) / 2,
        rayon: Math.max(0.5, Math.min(1.2, pas * 0.075))
    };
}

function pipopipettePreviewHtml(item, slot, k) {
    const g = geoPipopipette(item, slot);
    const T = (v) => (v * k).toFixed(2);
    let html = '';
    for (let j = 0; j <= g.rows; j++) {
        for (let i = 0; i <= g.cols; i++) {
            const d = g.rayon * 2;
            html += `<div class="fx-plat-pt" style="left:${T(g.x0 + i * g.pas - g.rayon)}px;
                top:${T(g.y0 + j * g.pas - g.rayon)}px; width:${T(d)}px; height:${T(d)}px"></div>`;
        }
    }
    html += `<div class="fx-plat-leg" style="left:${T(g.b.x)}px; top:${T(g.b.y + g.b.h - g.pied)}px;
        width:${T(g.b.w)}px; font-size:${T(3.1)}px">Un crayon de couleur chacun.</div>`;
    return html;
}

function dessinerPipopipettePdf(doc, item, slot) {
    const g = geoPipopipette(item, slot);
    doc.setFillColor(...ENCRE.trait);
    for (let j = 0; j <= g.rows; j++) {
        for (let i = 0; i <= g.cols; i++) {
            doc.circle(g.x0 + i * g.pas, g.y0 + j * g.pas, g.rayon, 'F');
        }
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...ENCRE.gris);
    doc.text(pourPdf('Un crayon de couleur chacun.'),
        g.b.x + g.b.w / 2, g.b.y + g.b.h - g.pied * 0.35, { align: 'center' });
}

function simPreviewHtml(item, slot, k) {
    const g = geoSim(item, slot);
    const T = (v) => (v * k).toFixed(2);
    let html = '';
    g.pts.forEach((p, i) => {
        const d = g.rayonPoint * 2;
        html += `<div class="fx-plat-pt" style="left:${T(p.x - g.rayonPoint)}px;
            top:${T(p.y - g.rayonPoint)}px; width:${T(d)}px; height:${T(d)}px"></div>`;
        // L'étiquette est posée VERS L'EXTÉRIEUR, à distance FIXE du point :
        // proportionnelle au rayon, elle se posait sur le point lui-même dans
        // les petits plateaux — et le point est ce qu'on relie.
        const [ex, ey] = dehors(g, p);
        html += `<div class="fx-plat-num" style="left:${T(ex - 3)}px; top:${T(ey - 2.4)}px;
            width:${T(6)}px; height:${T(4.8)}px; font-size:${T(3.8)}px">${i + 1}</div>`;
    });
    html += `<div class="fx-plat-leg" style="left:${T(g.b.x)}px; top:${T(g.b.y + g.b.h - g.pied)}px;
        width:${T(g.b.w)}px; font-size:${T(3.1)}px">Un crayon de couleur chacun.</div>`;
    return html;
}

function dessinerSimPdf(doc, item, slot) {
    const g = geoSim(item, slot);
    doc.setFillColor(...ENCRE.trait);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(Math.min(11, g.R * 0.34));
    g.pts.forEach((p, i) => {
        doc.circle(p.x, p.y, g.rayonPoint, 'F');
        const [ex, ey] = dehors(g, p);
        doc.setTextColor(...ENCRE.texte);
        doc.text(String(i + 1), ex, ey, { align: 'center', baseline: 'middle' });
        doc.setFillColor(...ENCRE.trait);
    });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...ENCRE.gris);
    doc.text(pourPdf('Un crayon de couleur chacun.'),
        g.b.x + g.b.w / 2, g.b.y + g.b.h - g.pied * 0.35, { align: 'center' });
}

// --- LE MASTERMIND SUR PAPIER --------------------------------------------------
//
// Rémy : « Et un master mind ».
//
// UNE FEUILLE NE RÉPOND PAS, donc on n'y joue pas : on y imprime LA PARTIE
// DÉJÀ JOUÉE — des essais, et pour chacun le nombre de jetons bien placés et
// mal placés — et l'on demande le code. Le jeu devient un exercice de logique
// pure, et il y gagne : à l'écran on s'en tire en tâtonnant, ici il faut
// raisonner, parce qu'il n'y a plus d'essai à dépenser.
//
// LA PALETTE EST IMPRIMÉE EN TÊTE, et ce n'est pas un ornement : sans elle
// l'exercice est insoluble, puisqu'on ignore parmi quelles couleurs chercher.
//
// CHAQUE JETON PORTE SON INITIALE. La couleur ajoute du confort, jamais
// l'information : photocopiée, la fiche reste jouable, et c'est cette lettre
// que l'élève écrit dans les cases de la réponse.

const rvbDe = (hex) => [
    parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)
];

function geoMastermind(item, slot) {
    const m = item.meta;
    const b = boiteDe(slot);
    const n = m.longueur;
    // LES RANGÉES SE COMPTENT SUR CE QU'ON DESSINE VRAIMENT : la légende des
    // couleurs, l'en-tête des deux colonnes, les essais, un blanc, le libellé
    // « Le code : » et les cases de la réponse. Sous-évaluées, elles donnaient
    // une rangée de trop et la ligne de réponse débordait sur le bloc suivant.
    const rangs = m.lignes.length + 4.5;
    const hLigne = Math.min(b.h / rangs, 9);
    const jeton = hLigne * 0.8;
    const pas = jeton * 1.18;
    const colW = Math.max(13, hLigne * 1.9);
    const largeur = 7 + n * pas + 2 + colW * 2;
    const x = b.x + Math.max(0, (b.w - largeur) / 2);
    return {
        m, b, n, hLigne, jeton, pas, colW,
        xNum: x, xJetons: x + 7,
        xBien: x + 7 + n * pas + 2,
        xMal: x + 7 + n * pas + 2 + colW,
        yLegende: b.y + hLigne * 0.7,
        yTete: b.y + hLigne * 1.7,
        // La première rangée d'essais commence sous l'en-tête.
        ligneY: (i) => b.y + hLigne * (2.2 + i),
        // Le libellé de la réponse s'écrit AU-DESSUS des cases, pas à leur
        // gauche : « Le code : » fait quinze millimètres et la colonne de
        // gauche n'en offre que sept — le texte passait par-dessus la première
        // case, et l'on ne voyait plus où écrire.
        yLibelle: b.y + hLigne * (2.2 + m.lignes.length + 0.9),
        yReponse: b.y + hLigne * (2.2 + m.lignes.length + 1.6),
        taille: Math.max(1.7, hLigne * 0.34)
    };
}

function mastermindPreviewHtml(item, slot, k, solution) {
    const g = geoMastermind(item, slot);
    const m = g.m;
    const T = (v) => (v * k).toFixed(2);
    const pastille = (couleur, x, y, d = g.jeton) => `<div class="fx-mm-jeton"
        style="left:${T(x)}px; top:${T(y)}px; width:${T(d)}px; height:${T(d)}px;
        background:${couleur.hex}; font-size:${T(d * 0.6)}px">${couleur.id}</div>`;

    // La palette, en tête.
    let html = `<div class="fx-mm-titre" style="left:${T(g.xNum)}px;
        top:${T(g.yLegende - g.taille * 0.9)}px; font-size:${T(g.taille)}px">Couleurs :</div>`;
    const xPal = g.xNum + 14;
    m.couleurs.forEach((c, i) => {
        html += pastille(c, xPal + i * g.pas, g.yLegende - g.jeton * 0.55, g.jeton * 0.9);
    });

    // L'en-tête des deux colonnes de nombres.
    [['bien placés', g.xBien], ['mal placés', g.xMal]].forEach(([mot, x]) => {
        html += `<div class="fx-mm-tete" style="left:${T(x)}px; top:${T(g.yTete - g.taille)}px;
            width:${T(g.colW)}px; font-size:${T(g.taille)}px">${mot}</div>`;
    });

    m.lignes.forEach((l, i) => {
        const y = g.ligneY(i);
        html += `<div class="fx-mm-num" style="left:${T(g.xNum)}px; top:${T(y)}px;
            width:${T(6)}px; height:${T(g.jeton)}px; font-size:${T(g.taille)}px">${i + 1}</div>`;
        l.code.forEach((id, c) => {
            html += pastille(m.couleurs.find(x => x.id === id), g.xJetons + c * g.pas, y);
        });
        [[l.places, g.xBien], [l.presents, g.xMal]].forEach(([v, x]) => {
            html += `<div class="fx-mm-cell" style="left:${T(x)}px; top:${T(y)}px;
                width:${T(g.colW)}px; height:${T(g.jeton)}px;
                font-size:${T(g.jeton * 0.62)}px">${v}</div>`;
        });
    });

    // La ligne de réponse : des cases carrées, une par jeton du code.
    const y = g.yReponse;
    html += `<div class="fx-mm-titre" style="left:${T(g.xNum)}px;
        top:${T(g.yLibelle - g.taille)}px; font-size:${T(g.taille * 1.15)}px">Le code :</div>`;
    for (let c = 0; c < g.n; c++) {
        const lettre = solution ? m.secret[c] : '';
        html += `<div class="fx-mm-case${lettre ? ' fx-mm-case--sol' : ''}"
            style="left:${T(g.xJetons + c * g.pas)}px; top:${T(y)}px;
            width:${T(g.jeton)}px; height:${T(g.jeton)}px;
            font-size:${T(g.jeton * 0.62)}px">${lettre}</div>`;
    }
    return html;
}

function dessinerMastermindPdf(doc, item, slot, solution) {
    const g = geoMastermind(item, slot);
    const m = g.m;
    const aplat = polycopieEnCouleur();

    const pastille = (couleur, x, y, d = g.jeton) => {
        const r = d / 2;
        // EN NOIR ET BLANC, LE JETON RESTE UN ROND VIDE avec sa lettre : un
        // aplat gris derrière une lettre blanche ne survit pas toujours à la
        // photocopie, et la lettre est ce qui porte l'information.
        doc.setFillColor(...rvbDe(couleur.hex));
        doc.setDrawColor(...ENCRE.trait);
        doc.setLineWidth(0.3);
        doc.circle(x + r, y + r, r, aplat ? 'FD' : 'D');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(Math.max(4.5, d * 1.7));
        doc.setTextColor(...(aplat ? [255, 255, 255] : ENCRE.trait));
        doc.text(couleur.id, x + r, y + r + d * 0.22, { align: 'center' });
    };

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(g.taille / 0.3528);
    doc.setTextColor(...ENCRE.gris);
    doc.text(pourPdf('Couleurs :'), g.xNum, g.yLegende);
    m.couleurs.forEach((c, i) => {
        pastille(c, g.xNum + 14 + i * g.pas, g.yLegende - g.jeton * 0.55, g.jeton * 0.9);
    });

    doc.setFontSize(g.taille / 0.3528);
    doc.setTextColor(...ENCRE.gris);
    [['bien placés', g.xBien], ['mal placés', g.xMal]].forEach(([mot, x]) => {
        doc.text(pourPdf(mot), x + g.colW / 2, g.yTete, { align: 'center' });
    });

    m.lignes.forEach((l, i) => {
        const y = g.ligneY(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(g.taille / 0.3528);
        doc.setTextColor(...ENCRE.gris);
        doc.text(String(i + 1), g.xNum + 4, y + g.jeton * 0.7, { align: 'right' });
        l.code.forEach((id, c) => {
            pastille(m.couleurs.find(x => x.id === id), g.xJetons + c * g.pas, y);
        });
        doc.setDrawColor(...ENCRE.grille);
        doc.setLineWidth(0.25);
        [[l.places, g.xBien], [l.presents, g.xMal]].forEach(([v, x]) => {
            doc.rect(x, y, g.colW, g.jeton);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(Math.max(6, g.jeton * 1.9));
            doc.setTextColor(...ENCRE.trait);
            doc.text(String(v), x + g.colW / 2, y + g.jeton * 0.74, { align: 'center' });
        });
    });

    const y = g.yReponse;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize((g.taille * 1.1) / 0.3528);
    doc.setTextColor(...ENCRE.texte);
    doc.text(pourPdf('Le code :'), g.xNum, g.yLibelle);
    doc.setLineWidth(0.4);
    for (let c = 0; c < g.n; c++) {
        const x = g.xJetons + c * g.pas;
        doc.setDrawColor(...ENCRE.trait);
        doc.rect(x, y, g.jeton, g.jeton);
        if (!solution) continue;
        doc.setFontSize(Math.max(6, g.jeton * 1.9));
        doc.setTextColor(47, 133, 90);
        doc.text(m.secret[c], x + g.jeton / 2, y + g.jeton * 0.74, { align: 'center' });
    }
}

// --- LE MEMORY DES TABLES, À DÉCOUPER -----------------------------------------
//
// Rémy : « on va permettre de créer un jeu de memory que l'utilisateur pourra
// découper et coller, tu t'occupes du recto et du verso ». C'est un jeu de
// classe, pas un jeu d'écran : on imprime, on découpe, on colle dos à dos — ou
// l'on imprime en recto-verso —, et le paquet resservira toute l'année.
//
// UN BLOC = UNE PAIRE, deux cartes côte à côte : le calcul et son résultat. La
// PAGE DES SOLUTIONS porte les DOS, aux mêmes emplacements : tous identiques,
// donc rien à retourner ni à aligner au millimètre.

/** Les deux cartes d'une paire dans leur emplacement, et leurs traits de coupe. */
function geoMemory(slot, item) {
    const b = slot.boite || { x: slot.x, y: slot.y, w: slot.taille, h: slot.taille };
    // AUCUN ÉCART, NI ENTRE LES DEUX CARTES NI ENTRE LES BLOCS. Les cartes
    // remplissent leur emplacement et se touchent : les traits de coupe se
    // confondent deux à deux, et la page devient un quadrillage qu'on découpe
    // en lignes droites d'un bout à l'autre. C'est la demande de Rémy, et
    // c'est aussi la façon dont sont imprimées les planches du commerce.
    const w = b.w / 2;
    const h = b.h;
    // LE CORPS SUIT LE PLUS LONG DES DEUX LIBELLÉS. « 10 × 10 » et « 16 » ne
    // font pas la même longueur, et un corps calculé sur la carte laissait le
    // calcul toucher les deux bords pendant que le résultat flottait au milieu.
    const m = (item && item.meta) || {};
    const large = (t) => [...String(t || '')]
        .reduce((n, c) => n + (c === ' ' ? 0.3 : 0.62), 0);
    const pire = Math.max(1.6, large(m.calcul), large(m.resultat));
    const corps = Math.min(h * 0.3, (w - 6) / pire);
    return { b, w, h, ecart: 0, corps, y: b.y };
}

function memoryPreviewHtml(item, slot, k, solution) {
    const g = geoMemory(slot, item);
    const m = item.meta;
    const couleur = polycopieEnCouleur();
    const T = (v) => (v * k).toFixed(2);
    const corps = g.corps;
    let html = '';

    [0, 1].forEach((i) => {
        const x = g.b.x + i * (g.w + g.ecart);
        const dos = !!solution;
        // Les bordures voisines se superposent au pixel près : on n'en dessine
        // donc qu'UNE, et le trait reste fin partout au lieu de doubler
        // d'épaisseur sur les coutures.
        html += `<div class="fx-mm-carte${dos ? ' fx-mm-carte--dos' : ''}"
            style="left:${x * k}px; top:${g.y * k}px; width:${g.w * k}px; height:${g.h * k}px;
            ${dos && couleur ? 'background:#eef2ff;' : ''}"></div>`;
        if (dos) {
            // Le dos : un cadre intérieur et un « × » — le signe du jeu. Rien de
            // plus : un dos chargé, photocopié cent fois, mange une cartouche.
            html += `<div class="fx-mm-dos-cadre" style="left:${(x + g.w * 0.12) * k}px;
                top:${(g.y + g.h * 0.12) * k}px; width:${(g.w * 0.76) * k}px;
                height:${(g.h * 0.76) * k}px"></div>`;
            html += `<div class="fx-mm-dos-signe" style="left:${x * k}px; top:${g.y * k}px;
                width:${g.w * k}px; height:${g.h * k}px;
                font-size:${corps * 1.4 * k}px">×</div>`;
            return;
        }
        html += `<div class="fx-mm-texte" style="left:${x * k}px; top:${g.y * k}px;
            width:${g.w * k}px; height:${g.h * k}px; font-size:${corps * k}px">${
    echapperSheet(i === 0 ? m.calcul : m.resultat)}</div>`;
    });
    return html;
}

function dessinerMemoryPdf(doc, item, slot, solution) {
    const g = geoMemory(slot, item);
    const m = item.meta;
    const couleur = polycopieEnCouleur();
    const corps = g.corps;

    [0, 1].forEach((i) => {
        const x = g.b.x + i * (g.w + g.ecart);
        // LE TRAIT DE COUPE EST EN POINTILLÉS : c'est ce qui dit « ici, les
        // ciseaux » plutôt que « voici un cadre ».
        doc.setDrawColor(...ENCRE.trait);
        doc.setLineWidth(0.3);
        if (solution && couleur) {
            doc.setFillColor(238, 242, 255);
            doc.rect(x, g.y, g.w, g.h, 'F');
        }
        // À ANGLES DROITS, ET NON PLUS ARRONDIS : deux cartes voisines
        // partagent leur bord, et un coin arrondi laisserait quatre petites
        // lunules blanches à chaque croisement — autant d'endroits où les
        // ciseaux hésitent.
        if (doc.setLineDashPattern) doc.setLineDashPattern([1.2, 1], 0);
        doc.rect(x, g.y, g.w, g.h, 'S');
        if (doc.setLineDashPattern) doc.setLineDashPattern([], 0);

        if (solution) {
            doc.setDrawColor(...ENCRE.grille);
            doc.setLineWidth(0.4);
            doc.rect(x + g.w * 0.12, g.y + g.h * 0.12, g.w * 0.76, g.h * 0.76, 'S');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(corps * 1.4 / 0.3528);
            doc.setTextColor(...ENCRE.grille);
            doc.text('x', x + g.w / 2, g.y + g.h / 2 + corps * 0.5, { align: 'center' });
            return;
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(corps / 0.3528);
        doc.setTextColor(...ENCRE.texte);
        doc.text(pourPdf(i === 0 ? m.calcul : m.resultat),
            x + g.w / 2, g.y + g.h / 2 + corps * 0.35, { align: 'center' });
    });
}

export const RENDUS_JEUX = {
    puissance4: {
        titre: 'Grille de puissance 4',
        consigne: (items) => (items[0] && items[0].meta.regle) || '',
        previewGrille: p4PreviewHtml,
        pdfGrille: dessinerP4Pdf,
        nomBloc: 'Grille', nomBlocs: 'grilles',
        // Deux par page : une partie se joue à deux, et une feuille pour deux
        // élèves porte deux parties — la seconde pour la revanche.
        disposition: { cols: 1, rows: 2, maxCols: 2, maxRows: 3 },
        parLigneDefaut: 1,
        // Rien à corriger : la feuille de solutions serait le même plateau vide.
        sansSolution: true
    },
    sim: {
        titre: 'Plateau du Sim',
        consigne: (items) => (items[0] && items[0].meta.regle) || '',
        previewGrille: simPreviewHtml,
        pdfGrille: dessinerSimPdf,
        nomBloc: 'Plateau', nomBlocs: 'plateaux',
        // Quatre par page : une partie de sim dure trois minutes.
        disposition: { cols: 2, rows: 2, maxCols: 3, maxRows: 4 },
        parLigneDefaut: 2,
        sansSolution: true
    },
    pipopipette: {
        titre: 'La pipopipette',
        consigne: (items) => (items[0] && items[0].meta.regle) || '',
        previewGrille: pipopipettePreviewHtml,
        pdfGrille: dessinerPipopipettePdf,
        nomBloc: 'Grille', nomBlocs: 'grilles',
        // Quatre par page : une partie sur une grille de 5 × 4 dure dix
        // minutes, et l'on en refait deux ou trois d'affilée.
        disposition: { cols: 2, rows: 2, maxCols: 3, maxRows: 4 },
        parLigneDefaut: 2,
        sansSolution: true
    },
    mastermind: {
        titre: 'Mastermind — retrouve le code',
        consigne: (items) => {
            const m = items && items[0] && items[0].meta;
            const rep = !m || m.repetitions;
            // COURTE, PARCE QU'ELLE EST COUPÉE. Le bandeau tient deux lignes :
            // la version longue s'arrêtait au milieu du conseil, « raye d'un
            // coup » sans dire quoi — pire que pas de conseil du tout.
            return 'UN CODE SECRET EST CACHÉ. Chaque ligne est un essai déjà joué : on te dit '
                + 'combien de jetons sont de la BONNE COULEUR À LA BONNE PLACE, et combien sont '
                + 'de la bonne couleur MAIS AILLEURS. Écris les initiales du code dans les cases '
                + 'du bas. '
                + (rep ? 'Une couleur peut servir plusieurs fois.' : 'Chaque couleur ne sert qu\'une fois.');
        },
        previewGrille: mastermindPreviewHtml,
        pdfGrille: dessinerMastermindPdf,
        nomBloc: 'Code', nomBlocs: 'codes',
        // Plus large que haut : quatre jetons et deux colonnes de nombres sur
        // une ligne, et quatre ou cinq lignes en tout.
        proportions: { w: 1, h: 0.66 },
        disposition: { cols: 2, rows: 3, maxCols: 3, maxRows: 4 },
        parLigneDefaut: 2
    },
    memory: {
        titre: 'Memory des tables',
        consigne: () => 'DÉCOUPE les cartes le long des pointillés. La page 2 porte les '
            + 'DOS : imprime-la au verso, ou découpe-la aussi et colle chaque dos derrière '
            + 'sa carte. Puis mélange, étale face cachée, et retourne deux cartes à la '
            + 'fois : on garde la paire quand le calcul et son résultat se rencontrent.',
        previewGrille: memoryPreviewHtml,
        pdfGrille: dessinerMemoryPdf,
        nomBloc: 'Paire', nomBlocs: 'paires',
        nomSolutions: 'les dos à coller',
        // Bord à bord : la feuille est une planche de cartes, pas une grille
        // de blocs séparés. Voir `calculerFiche`.
        blocsColles: true,
        // Une paire = deux cartes. Douze paires font vingt-quatre cartes, ce qui
        // est déjà un long memory pour une classe de sixième.
        proportions: { w: 1, h: 0.62 },
        // HUIT PAIRES PAR DÉFAUT, ET PAR MULTIPLES DE HUIT. Rémy : « mets 8
        // paires ou 16 paires ou 24 paires ». Neuf n'est pas un nombre de
        // memory : on étale les cartes en rectangle, et neuf paires font une
        // rangée bancale. Quatre colonnes de paires — huit cartes de front —
        // donnent des cartes de 35 mm sur 43, la taille d'une carte à jouer ;
        // deux rangées font huit paires, quatre en font seize, six vingt-quatre.
        // `colonnes` est le vœu que `choisirDisposition` suivra : sans lui, la
        // règle générale préférait trois colonnes larges et neuf paires.
        disposition: { cols: 4, rows: 2, colonnes: 4, maxCols: 4, maxRows: 2 },
        // ET AUTANT DE FEUILLES QU'IL EN FAUT. Rémy : « 16 paires (2 pages du
        // coup) ou 24 paires (3 pages) ». Serrer seize paires sur une feuille
        // donnerait des cartes de 35 mm sur 21 : on ne joue pas avec cela. Une
        // feuille pleine, puis une autre, toutes découpées pareil.
        plusieursPages: true,
        parLigneDefaut: 4
    },
};
