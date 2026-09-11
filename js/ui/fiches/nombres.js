// LES NOMBRES — poser, convertir, graduer, fractionner.
//
// Une tranche de `printSheet.js`, découpée par `tools/decouperPrintSheet.mjs`.
// Tout ce qui est ici n'est utilisé QUE par les exercices de cette famille ;
// ce qui sert à plusieurs vit dans `socle.js`.

import {
    ENCRE, TEINTES_FIGURE, blocsVoisins, boiteDe, dessinerMarque,
    echapperSheet, largeurTexte, largeurTrigo, ligneReponsePdf, rangDuBloc,
    unite
} from './socle.js';
import { GLYPHES, egyptianSvgCadre, placerGlyphes } from '../../core/figures.js';
import { INGREDIENTS as INGREDIENTS_FICHE } from '../../core/pizza.js';
import { boiteDessin, cubesAPeindre, facesCube } from '../../core/cubes.js';
import { decimales as decimalesPose, enFrancais, rangsDe as rangsPose } from '../../core/poser.js';
import { dessinerChemin } from '../../core/cheminSvg.js';
import { ecrire as ecrireProp } from '../../core/proportion.js';
import { encre, polycopieEnCouleur, pourPdf } from '../ficheRendu.js';
import { marqueSvg as marqueSvgRelier } from '../../core/relier.js';
import { relire as relirePriorites } from '../../core/priorites.js';

// --- LA PYRAMIDE DE NOMBRES ----------------------------------------------------
//
// La jumelle arithmétique de la pyramide de mots, et sa forme naturelle : un
// triangle de cases, des trous, un crayon.
//
// LA BASE EST EN BAS, ET C'EST LOIN D'ÊTRE ÉVIDENT À CODER. Les données sont
// rangées du sol vers le sommet — `lignes[0]` est la base — alors que le papier
// se dessine du haut vers le bas. On retourne donc l'indice une fois pour
// toutes ici, plutôt qu'à chaque endroit qui dessine.
//
// LES CASES SONT LARGES, PAS CARRÉES : un sommet à trois chiffres doit y tenir
// sans que le nombre se serre, et c'est justement le sommet qu'on regarde.

function geoPyramideN(item, slot) {
    const m = item.meta;
    const b = boiteDe(slot);
    const n = m.n;
    const gap = 0.6;
    // La rangée la plus large compte `n` cases ; il y a `n` rangées.
    const cote = Math.min((b.w - gap * (n - 1)) / (n * 1.55), (b.h - gap * (n - 1)) / n, 9);
    const largeur = cote * 1.55;
    const w = largeur * n + gap * (n - 1);
    const h = cote * n + gap * (n - 1);
    const x0 = b.x + (b.w - w) / 2;
    const y0 = b.y + (b.h - h) / 2;
    return {
        m, b, n, cote, largeur, gap,
        // (k, i) : k = l'étage en partant du SOL, i = la case dans l'étage.
        // Le sol se dessine tout en bas, donc au rang n - 1 de la page.
        //
        // LE DÉCALAGE HORIZONTAL SUIT L'ÉTAGE, PAS SA HAUTEUR SUR LA PAGE. La
        // base est la rangée la plus LARGE : c'est elle qui ne se décale pas,
        // et chaque étage au-dessus rentre d'une demi-case. On avait pris
        // `n - 1 - k`, c'est-à-dire l'inverse : la pyramide penchait, et les
        // plus larges débordaient du bloc par la droite.
        x: (k, i) => x0 + k * (largeur + gap) / 2 + i * (largeur + gap),
        y: (k) => y0 + (n - 1 - k) * (cote + gap),
        taille: Math.max(2, cote * 0.52)
    };
}

function pyramideNPreviewHtml(item, slot, k, solution) {
    const g = geoPyramideN(item, slot);
    const T = (v) => (v * k).toFixed(2);
    return g.m.lignes.map((l, r) => l.map((v, i) => {
        const donne = g.m.donnes[r][i];
        const texte = donne ? v : (solution ? v : '');
        return `<div class="fx-pn-case${donne ? ' fx-pn-case--donne' : ''}${
            !donne && texte !== '' ? ' fx-pn-case--sol' : ''}"
            style="left:${T(g.x(r, i))}px; top:${T(g.y(r))}px;
            width:${T(g.largeur)}px; height:${T(g.cote)}px;
            font-size:${T(g.taille)}px">${texte}</div>`;
    }).join('')).join('');
}

function dessinerPyramideNPdf(doc, item, slot, solution) {
    const g = geoPyramideN(item, slot);
    doc.setLineWidth(0.35);
    g.m.lignes.forEach((l, r) => l.forEach((v, i) => {
        const x = g.x(r, i), y = g.y(r);
        const donne = g.m.donnes[r][i];
        // Une case DONNÉE est de l'énoncé : fond teinté, on n'écrit pas dedans.
        // Les autres restent blanches, prêtes pour le crayon.
        if (donne) {
            doc.setFillColor(...ENCRE.donnee);
            doc.rect(x, y, g.largeur, g.cote, 'F');
        }
        doc.setDrawColor(...ENCRE.trait);
        doc.rect(x, y, g.largeur, g.cote);
        if (!donne && !solution) return;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(Math.max(5, g.cote * 1.55));
        doc.setTextColor(...(donne ? ENCRE.trait : [47, 133, 90]));
        doc.text(String(v), x + g.largeur / 2, y + g.cote * 0.7, { align: 'center' });
    }));
}

// --- LA PYRAMIDE DES MOTS ------------------------------------------------------
//
// Rémy, avec la page de son « Coin des jeux mathématiques » : « Deux jeux dans
// ces styles. » Celui-ci en est un, et c'est un objet de PAPIER — une colonne
// de définitions, un escalier de cases, un crayon. Le bloc imprimé n'est donc
// pas une capture de l'écran : c'est l'original, et l'écran en est la copie.
//
// L'ESCALIER PART D'UN BORD COMMUN. Toutes les lignes commencent à la même
// verticale et s'allongent vers la droite : c'est ce qui fait qu'on VOIT la
// lettre gagnée à chaque marche, la case qui dépasse. Centré, l'escalier
// deviendrait un sapin et la règle du jeu disparaîtrait du dessin.
//
// LA DÉFINITION TIENT SUR UNE LIGNE, quitte à rétrécir. Deux lignes de texte
// dans une case haute d'une case décaleraient tout l'escalier, et un escalier
// dont les marches ne sont plus alignées ne se lit plus.

function geoPyramide(item, slot) {
    const m = item.meta;
    const b = boiteDe(slot);
    const n = m.hauteur;
    // UNE CASE SE DIMENSIONNE POUR UN CRAYON, pas pour remplir le bloc : au-delà
    // d'un centimètre, on écrit une lettre au milieu d'un grand vide.
    const cote = Math.min(b.h / (n + 0.3), 11);
    const casesW = cote * n;
    const plusLong = Math.max(1, ...m.barreaux.map(bb => bb.def.length));
    // La largeur d'un texte, en millimètres : à cette taille de police,
    // un caractère d'Helvetica en fait environ la moitié.
    const largeurDe = (taille) => plusLong * taille * 0.48;
    // LE TEXTE LE PLUS LONG FIXE LA TAILLE DE TOUS. Des définitions de corps
    // différents dans une même colonne se liraient comme des exercices
    // différents.
    const voulue = cote * 0.42;
    // LA COLONNE DES DÉFINITIONS PREND CE QU'IL LUI FAUT, PAS TOUTE LA PAGE.
    // Étirée sur la largeur d'une feuille A4, elle mettait cent trente
    // millimètres sous « Pour dormir. » et laissait des cases de huit
    // millimètres perdues au bord droit : le bloc ne ressemblait plus à une
    // pyramide mais à un tableau à deux colonnes.
    const defW = Math.min(largeurDe(voulue) + 2, b.w - casesW - 1);
    const taille = Math.max(1.6, Math.min(voulue, (defW - 2) / (plusLong * 0.48)));
    // Le tout est CENTRÉ dans le bloc : ce qui reste de place se partage des
    // deux côtés au lieu de s'accumuler à gauche.
    const x = b.x + Math.max(0, (b.w - defW - 1 - casesW) / 2);
    const y0 = b.y + (b.h - cote * n) / 2;
    return {
        m, b, n, cote, defW, taille,
        x, x0: x + defW + 1, y0,
        ligneY: (i) => y0 + i * cote
    };
}

/** Ce qu'on écrit dans la ligne `i` : le mot donné, la solution, ou rien. */
const motPyramide = (g, i, solution) =>
    (g.m.donnes[i] || solution) ? g.m.barreaux[i].mot : '';

function pyramidePreviewHtml(item, slot, k, solution) {
    const g = geoPyramide(item, slot);
    const T = (v) => (v * k).toFixed(2);
    return g.m.barreaux.map((bar, i) => {
        const y = g.ligneY(i);
        const mot = motPyramide(g, i, solution);
        const donne = g.m.donnes[i];
        let html = `<div class="fx-py-def" style="left:${T(g.x)}px; top:${T(y)}px;
            width:${T(g.defW)}px; height:${T(g.cote)}px; font-size:${T(g.taille)}px"
            ><span>${echapperSheet(bar.def)}</span></div>`;
        for (let c = 0; c <= i; c++) {
            const lettre = mot[c] || '';
            html += `<div class="fx-py-case${donne ? ' fx-py-case--donne' : ''}${
                lettre && !donne ? ' fx-py-case--sol' : ''}"
                style="left:${T(g.x0 + c * g.cote)}px; top:${T(y)}px;
                width:${T(g.cote)}px; height:${T(g.cote)}px;
                font-size:${T(g.cote * 0.58)}px">${lettre}</div>`;
        }
        return html;
    }).join('');
}

function dessinerPyramidePdf(doc, item, slot, solution) {
    const g = geoPyramide(item, slot);
    doc.setLineWidth(0.3);
    g.m.barreaux.forEach((bar, i) => {
        const y = g.ligneY(i);
        const mot = motPyramide(g, i, solution);
        const donne = g.m.donnes[i];

        // La colonne des définitions : un cadre, et le texte calé à gauche
        // comme dans la revue — l'œil descend la colonne sans chercher.
        doc.setDrawColor(...ENCRE.trait);
        doc.rect(g.x, y, g.defW, g.cote);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(g.taille / 0.3528);
        doc.setTextColor(...ENCRE.texte);
        doc.text(pourPdf(bar.def), g.x + 1, y + g.cote * 0.65);

        for (let c = 0; c <= i; c++) {
            const x = g.x0 + c * g.cote;
            // Une ligne DONNÉE est de l'énoncé : fond teinté, on n'écrit pas
            // dedans. Les autres restent blanches, prêtes pour le crayon.
            if (donne) {
                doc.setFillColor(...ENCRE.donnee);
                doc.rect(x, y, g.cote, g.cote, 'F');
            }
            doc.setDrawColor(...ENCRE.trait);
            doc.rect(x, y, g.cote, g.cote);
            const lettre = mot[c];
            if (!lettre) continue;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(Math.max(5, g.cote * 1.7));
            doc.setTextColor(...(donne ? ENCRE.trait : [47, 133, 90]));
            doc.text(lettre, x + g.cote / 2, y + g.cote * 0.73, { align: 'center' });
        }
    });
}

// --- COMBIEN DE CUBES ? -------------------------------------------------------
//
// Rémy : « j'aimerais un exercice de comptage de cube ».
//
// LE DESSIN VIENT DES MÊMES DONNÉES QUE L'ÉCRAN. `meta.hauteurs` dit combien de
// cubes sont empilés sur chaque case du sol ; core/cubes.js les projette et les
// range du plus loin au plus près, et il n'y a plus qu'à peindre — les cubes de
// devant recouvrent ceux de derrière tout seuls. Aucune occultation à calculer,
// et surtout aucune chance que la feuille montre autre chose que l'écran.
//
// TROIS CLARTÉS, ET ELLES SURVIVENT AU NOIR ET BLANC. Contrairement aux secteurs
// d'angles, on ne bascule PAS en ligne claire quand le polycopié est en noir et
// blanc : sans les trois valeurs, un empilement de cubes devient un pavage de
// losanges et l'exercice disparaît avec la perspective. Les trois teintes sont
// déjà des gris bleutés bien séparés ; le filtre d'encre (voir ficheRendu.js) les
// ramène à trois gris qui se distinguent encore à la photocopie.

/** Les trois faces vues, et l'arête. Ce sont les teintes de --cu-* (modules.css). */
const ENCRE_CUBE = {
    dessus: [238, 241, 250],
    droite: [182, 193, 218],
    gauche: [123, 137, 171],
    arete: [47, 58, 82]
};

/** Une couleur éclaircie vers le blanc — `f` = 0 la garde, 1 la blanchit. */
const eclaircir = (c, f) => c.map(v => Math.round(v + (255 - v) * f));

/**
 * LA TEINTE D'UN EMPILEMENT, EN COULEUR : une par bloc, jamais deux voisines.
 *
 * Rémy : « si c'est en couleur, mets des cubes de différentes couleur ». Douze
 * empilements du même gris-bleu se confondent d'une rangée à l'autre — c'est
 * le défaut qu'il avait déjà relevé sur les rectangles du périmètre —, et l'on
 * ne sait plus quel « = ……… » va avec quel dessin.
 *
 * LES TROIS FACES GARDENT LEUR ÉCART. Le relief d'un cube ne tient qu'à cela :
 * le dessus clair, la face droite à mi-chemin, la gauche sombre. On décline
 * donc UNE couleur en trois valeurs plutôt que d'en tirer trois au hasard —
 * trois teintes indépendantes feraient trois faces qui ne se ressemblent plus,
 * et l'empilement cesserait de se lire en volume.
 */
function teinteCube(rang) {
    if (!polycopieEnCouleur()) return ENCRE_CUBE;
    const t = TEINTES_FIGURE[(rang || 0) % TEINTES_FIGURE.length].trait;
    return {
        dessus: eclaircir(t, 0.80),
        droite: eclaircir(t, 0.52),
        gauche: eclaircir(t, 0.18),
        arete: ENCRE_CUBE.arete
    };
}

function geoCubes(item, slot) {
    const m = item.meta;
    const b = boiteDe(slot);
    const marge = 2;
    // La ligne de réponse en bas, l'empilement dans tout le reste — même partage
    // que les figures d'angles, et pour la même raison : le bloc est plus haut
    // que large et le dessin doit prendre ce qui reste, pas un carré inscrit.
    const ligneH = Math.min(9, b.h * 0.2);
    const dispoH = b.h - ligneH;
    const bd = boiteDessin(m.hauteurs);
    const k = Math.min((b.w - marge * 2) / bd.largeur, (dispoH - marge) / bd.hauteur);
    const x0 = b.x + (b.w - bd.largeur * k) / 2 - bd.xmin * k;
    const y0 = b.y + (dispoH - bd.hauteur * k) / 2 - bd.ymin * k;
    return {
        m, b, k, ligneH, dispoH,
        // La projection descend déjà vers le bas (voir projeter) : rien à retourner.
        P: (p) => ({ x: x0 + p.x * k, y: y0 + p.y * k }),
        yReponse: b.y + dispoH + ligneH * 0.62,
        taille: Math.max(2.6, Math.min(Math.min(b.w, dispoH) * 0.085, 4.4)),
        // L'arête se mesure en CUBES, pas en millimètres : trop fine sur un grand
        // empilement elle disparaît, trop épaisse sur un petit elle mange la face.
        trait: Math.min(0.5, Math.max(0.14, k * 0.035))
    };
}

/** Toutes les faces à peindre, dans l'ordre, chacune avec son nom de teinte. */
function facesCubesPapier(g) {
    return cubesAPeindre(g.m.hauteurs).flatMap(({ x, y, z }) => {
        const f = facesCube(x, y, z);
        // Dans le cube aussi l'ordre compte : gauche, droite, puis le dessus.
        return [['gauche', f.gauche], ['droite', f.droite], ['dessus', f.dessus]];
    }).map(([nom, pts]) => [nom, pts.map(p => g.P(p))]);
}

function cubesPreviewHtml(item, slot, k, solution, rang) {
    const g = geoCubes(item, slot);
    const T = (v) => (v * k).toFixed(2);
    const encre = teinteCube(rangDuBloc(slot, rang));
    const d = facesCubesPapier(g).map(([nom, pts]) => `<polygon
        points="${pts.map(p => `${T(p.x)},${T(p.y)}`).join(' ')}"
        fill="rgb(${encre[nom].join(',')})" stroke="rgb(${encre.arete.join(',')})"
        stroke-width="${T(g.trait)}" stroke-linejoin="round"/>`).join('');
    return `<svg class="fx-fig-svg" style="left:0; top:0; width:100%; height:100%">${d}</svg>`
        + `<div class="fx-ligne-rep" style="left:${T(g.b.x + 2)}px;
            top:${T(g.b.y + g.dispoH)}px; width:${T(g.b.w - 4)}px;
            height:${T(g.ligneH * 0.8)}px; font-size:${T(g.taille)}px"><b>=</b>&nbsp;<i>${
            solution ? `${g.m.reponse} cubes` : ''}</i></div>`;
}

function dessinerCubesPdf(doc, item, slot, solution, _c, rang) {
    const g = geoCubes(item, slot);
    const encre = teinteCube(rangDuBloc(slot, rang));
    doc.setLineWidth(g.trait);
    doc.setLineJoin('round');
    doc.setDrawColor(...encre.arete);
    facesCubesPapier(g).forEach(([nom, pts]) => {
        doc.setFillColor(...encre[nom]);
        const suite = pts.slice(1).map((p, j) => [p.x - pts[j].x, p.y - pts[j].y]);
        doc.lines(suite, pts[0].x, pts[0].y, [1, 1], 'FD', true);
    });
    doc.setLineJoin('miter');
    ligneReponsePdf(doc, g, '=', solution ? `${g.m.reponse} cubes` : '');
}

// --- LA PENDULE --------------------------------------------------------------
//
// Deux exercices sur le même cadran, et c'est le mode qui les sépare :
//
//   LIRE   — les aiguilles sont tracées, l'élève écrit « …… h …… » dessous.
//   PLACER — l'heure est écrite dessous, le cadran est nu, l'élève trace les
//            deux aiguilles.
//
// « Avec ou sans minutes » est le réglage de l'écran, repris tel quel : la
// couronne rouge des multiples de cinq est une AIDE qu'on retire quand la
// lecture est acquise, pas une décoration.
//
// La grande aiguille est plus LONGUE, la petite plus ÉPAISSE : c'est la seule
// façon de les distinguer sur un polycopié en noir et blanc, où la couleur de
// l'écran ne survit pas.

function geoHorloge(item, slot) {
    // Un tiers du bas pour la ligne de réponse : « …… h …… » écrit au crayon
    // demande de la place, et un cadran qui la mange rend la fiche inutilisable.
    const ligneH = slot.taille * 0.20;
    const cote = slot.taille - ligneH;
    const r = cote * 0.44;
    // LA COURONNE DES MINUTES DEMANDE UN CADRAN, PAS UN TIMBRE.
    //
    // Rémy, sur le PDF : les pendules étaient illisibles. Mesuré : à cinq
    // par ligne, le rayon tombe à 8,5 mm et les « 5, 10, 15… » s'écrivent en
    // 1,3 mm — douze nombres à deux chiffres serrés sur un anneau de 6,6 mm de
    // rayon, par-dessus les heures qui sont juste dedans. On ne lit plus deux
    // couronnes, on lit une tache.
    //
    // Le rendu dit déjà « six par page » et se plafonne à quatre colonnes ;
    // c'est le descripteur qui en demande cinq, et Rémy l'a voulu — un test
    // l'épingle. On ne touche donc pas au nombre de pendules : on retire ce qui
    // ne tient pas. Les heures, elles, reprennent l'anneau extérieur qu'elles
    // occupaient avant qu'on y pose les minutes, et redeviennent lisibles.
    //
    // Le seuil est celui de la lisibilité : 1,9 mm de corps, en dessous duquel
    // un nombre à deux chiffres ne se lit plus sur une photocopie.
    const reperes = !!(item.meta && item.meta.reperes) && r * 0.155 >= 1.9;
    return {
        cote, ligneH, r, reperes,
        cx: slot.x + slot.taille / 2, cy: slot.y + cote / 2,
        ligneY: slot.y + cote, x0: slot.x
    };
}

/** Les bouts d'une aiguille, en coordonnées absolues. */
function aiguilleHorloge(g, tours, longueur) {
    const a = tours * Math.PI * 2 - Math.PI / 2;
    return { x: g.cx + Math.cos(a) * longueur, y: g.cy + Math.sin(a) * longueur };
}

const horlogeAngles = (m) => ({
    minutes: m.m / 60,
    heures: (((m.mode === 'placer' ? m.h12 : m.h) % 12) + m.m / 60) / 12
});

function horlogePreviewHtml(item, slot, k, solution) {
    const g = geoHorloge(item, slot);
    const m = item.meta;
    const tracer = m.mode === 'lire' || solution;
    const a = horlogeAngles(m);
    const T = (v) => (v * k).toFixed(2);
    // L'APERÇU MONTRE CE QUI SORTIRA. Les mêmes couleurs que le PDF, sous la
    // même condition : un aperçu qui ment fait imprimer deux fois.
    const enCouleur = polycopieEnCouleur();
    const hex = ([r, v, b]) => `rgb(${r},${v},${b})`;
    const C = HORLOGE_COULEUR;
    const cCadran = enCouleur ? hex(C.cadran) : '#1a202c';
    const cChiffres = enCouleur ? hex(C.chiffres) : '#1a202c';
    const cHeures = enCouleur ? hex(C.heures) : '#1a202c';
    const cMinutes = enCouleur ? hex(C.minutes) : '#1a202c';
    let d = '';

    // Le boîtier, les soixante graduations, et la couronne des minutes.
    d += `<circle cx="${T(g.cx)}" cy="${T(g.cy)}" r="${T(g.r)}"
          fill="${enCouleur ? hex(C.fond) : '#fff'}" stroke="${cCadran}" stroke-width="${T(g.r * 0.045)}"/>`;
    for (let i = 0; i < 60; i++) {
        const ang = i / 60 * Math.PI * 2 - Math.PI / 2;
        const gros = i % 5 === 0;
        const r2 = g.r * 0.94, r1 = r2 - g.r * (gros ? 0.085 : 0.045);
        d += `<line x1="${T(g.cx + Math.cos(ang) * r1)}" y1="${T(g.cy + Math.sin(ang) * r1)}"
              x2="${T(g.cx + Math.cos(ang) * r2)}" y2="${T(g.cy + Math.sin(ang) * r2)}"
              stroke="${gros ? cCadran : '#94a3b8'}" stroke-width="${T(g.r * (gros ? 0.035 : 0.014))}"/>`;
    }
    for (let n = 1; n <= 12; n++) {
        const ang = n / 12 * Math.PI * 2 - Math.PI / 2;
        const rr = g.r * (g.reperes ? 0.55 : 0.74);
        d += `<text x="${T(g.cx + Math.cos(ang) * rr)}" y="${T(g.cy + Math.sin(ang) * rr)}"
              text-anchor="middle" dominant-baseline="central"
              font-size="${T(g.r * 0.24)}" font-weight="700" fill="${cChiffres}">${n}</text>`;
    }
    if (g.reperes) {
        for (let n = 0; n < 12; n++) {
            const ang = n / 12 * Math.PI * 2 - Math.PI / 2;
            const rr = g.r * 0.78;
            d += `<text x="${T(g.cx + Math.cos(ang) * rr)}" y="${T(g.cy + Math.sin(ang) * rr)}"
                  text-anchor="middle" dominant-baseline="central"
                  font-size="${T(g.r * 0.155)}" font-weight="700"
                  fill="${enCouleur ? cMinutes : '#8a93a5'}">${n * 5}</text>`;
        }
    }
    if (tracer) {
        const gm = aiguilleHorloge(g, a.minutes, g.r * 0.84);
        const gh = aiguilleHorloge(g, a.heures, g.r * 0.50);
        // LA PETITE AIGUILLE RESTE UNE AIGUILLE. À huit centièmes de rayon et
        // le bout coupé net, elle avait l'air d'un doigt posé sur le cadran :
        // Rémy, « petite aiguille moche, trop grosse, non arrondie au bout ».
        // Elle reste plus ÉPAISSE que la grande — c'est ce qui les distingue —,
        // mais d'un tiers seulement, et les deux bouts sont arrondis.
        d += `<line x1="${T(g.cx)}" y1="${T(g.cy)}" x2="${T(gh.x)}" y2="${T(gh.y)}"
              stroke="${cHeures}" stroke-width="${T(g.r * 0.055)}" stroke-linecap="round"/>`;
        d += `<line x1="${T(g.cx)}" y1="${T(g.cy)}" x2="${T(gm.x)}" y2="${T(gm.y)}"
              stroke="${cMinutes}" stroke-width="${T(g.r * 0.036)}" stroke-linecap="round"/>`;
    }
    d += `<circle cx="${T(g.cx)}" cy="${T(g.cy)}" r="${T(g.r * 0.05)}" fill="#1a202c"/>`;

    const ligne = m.mode === 'lire'
        ? (solution ? `${m.h} h ${String(m.m).padStart(2, '0')}` : '.......   h   .......')
        : `${m.h} h ${String(m.m).padStart(2, '0')}`;
    return `<svg class="fx-hg-svg" style="left:0; top:0; width:100%; height:100%">${d}</svg>`
        + `<div class="fx-hg-ligne" style="left:${g.x0 * k}px; top:${g.ligneY * k}px;
             width:${slot.taille * k}px; height:${g.ligneH * k}px;
             font-size:${g.ligneH * 0.44 * k}px">${echapperSheet(ligne)}</div>`;
}

// LES COULEURS DE LA PENDULE, quand la feuille s'imprime en couleur.
//
// Rémy : « si on demande le pdf en couleur, il faut un peu de couleur sur les
// pendules ». Et ce n'est pas de la décoration : la GRANDE aiguille et la
// PETITE sont exactement ce qu'un élève confond, et deux couleurs les
// séparent mieux que deux épaisseurs. Le cadran reste sobre — c'est un
// instrument de lecture, pas une affiche.
const HORLOGE_COULEUR = {
    fond: [252, 252, 255],
    cadran: [37, 99, 235],      // le cercle et les gros traits
    heures: [220, 38, 38],      // la petite aiguille, la plus lue de travers
    minutes: [22, 101, 52],     // la grande
    chiffres: [30, 41, 59]
};

function dessinerHorlogePdf(doc, item, slot, solution) {
    const g = geoHorloge(item, slot);
    const m = item.meta;
    const tracer = m.mode === 'lire' || solution;
    const a = horlogeAngles(m);
    const couleur = polycopieEnCouleur();
    const C = HORLOGE_COULEUR;

    doc.setDrawColor(...(couleur ? C.cadran : ENCRE.trait));
    doc.setFillColor(...(couleur ? C.fond : [255, 255, 255]));
    doc.setLineWidth(Math.max(0.35, g.r * 0.045));
    doc.circle(g.cx, g.cy, g.r, 'FD');

    for (let i = 0; i < 60; i++) {
        const ang = i / 60 * Math.PI * 2 - Math.PI / 2;
        const gros = i % 5 === 0;
        const r2 = g.r * 0.94, r1 = r2 - g.r * (gros ? 0.085 : 0.045);
        doc.setDrawColor(...(gros ? (couleur ? C.cadran : ENCRE.trait) : ENCRE.gris));
        doc.setLineWidth(Math.max(0.12, g.r * (gros ? 0.035 : 0.014)));
        doc.line(g.cx + Math.cos(ang) * r1, g.cy + Math.sin(ang) * r1,
            g.cx + Math.cos(ang) * r2, g.cy + Math.sin(ang) * r2);
    }
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...(couleur ? C.chiffres : ENCRE.texte));
    doc.setFontSize(Math.max(5, g.r * 0.24 * 2.6));
    for (let n = 1; n <= 12; n++) {
        const ang = n / 12 * Math.PI * 2 - Math.PI / 2;
        const rr = g.r * (g.reperes ? 0.55 : 0.74);
        doc.text(String(n), g.cx + Math.cos(ang) * rr, g.cy + Math.sin(ang) * rr + g.r * 0.08,
            { align: 'center' });
    }
    if (g.reperes) {
        doc.setFontSize(Math.max(4, g.r * 0.155 * 2.6));
        // Les repères de minutes en VERT : ce sont ceux de la grande aiguille,
        // et l'élève doit faire le lien entre les deux d'un coup d'œil.
        doc.setTextColor(...(couleur ? C.minutes : ENCRE.gris));
        for (let n = 0; n < 12; n++) {
            const ang = n / 12 * Math.PI * 2 - Math.PI / 2;
            const rr = g.r * 0.78;
            doc.text(String(n * 5), g.cx + Math.cos(ang) * rr, g.cy + Math.sin(ang) * rr + g.r * 0.05,
                { align: 'center' });
        }
    }
    if (tracer) {
        const gm = aiguilleHorloge(g, a.minutes, g.r * 0.84);
        const gh = aiguilleHorloge(g, a.heures, g.r * 0.50);
        // LE BOUT ARRONDI, dans le PDF aussi. L'aperçu arrondissait, la feuille
        // coupait net : deux dessins pour la même pendule, et c'est la feuille
        // qu'on donne aux élèves.
        if (doc.setLineCap) doc.setLineCap('round');
        doc.setDrawColor(...(couleur ? C.heures : ENCRE.trait));
        doc.setLineWidth(Math.max(0.45, g.r * 0.055));
        doc.line(g.cx, g.cy, gh.x, gh.y);
        doc.setDrawColor(...(couleur ? C.minutes : ENCRE.trait));
        doc.setLineWidth(Math.max(0.28, g.r * 0.036));
        doc.line(g.cx, g.cy, gm.x, gm.y);
        if (doc.setLineCap) doc.setLineCap('butt');
    }
    doc.setFillColor(...(couleur ? C.cadran : ENCRE.trait));
    doc.circle(g.cx, g.cy, Math.max(0.5, g.r * 0.05), 'F');

    const ligne = m.mode === 'lire'
        ? (solution ? `${m.h} h ${String(m.m).padStart(2, '0')}` : '.......   h   .......')
        : `${m.h} h ${String(m.m).padStart(2, '0')}`;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(Math.max(7, g.ligneH * 1.5));
    doc.setTextColor(...ENCRE.texte);
    doc.text(pourPdf(ligne), slot.x + slot.taille / 2, g.ligneY + g.ligneH * 0.7, { align: 'center' });
}

// --- LA PIZZERIA DES FRACTIONS ------------------------------------------------
//
// La pizza est partagée en parts égales — le PPCM des dénominateurs — et la
// commande est écrite dessous. L'élève convertit chaque fraction en NOMBRE DE
// PARTS, puis colorie.
//
// Chaque garniture a sa MARQUE (disque, carré, triangle…), pas seulement sa
// couleur : sur un polycopié en noir et blanc, deux gris voisins ne se
// distinguent pas, et l'élève doit pouvoir travailler au crayon. La marque
// figure dans la légende et, sur la page des solutions, dans chaque part.

function geoPizza(item, slot) {
    const n = item.meta.fractions.length;
    // LA COMMANDE EST À DROITE DE LA PIZZA, pas dessous. Rémy : « les fractions
    // des ingrédients à droite des pizzas ». Ce n'est pas qu'une question de
    // goût — sous le disque, chaque garniture supplémentaire rognait la hauteur
    // de la pizza, alors que c'est elle qu'on doit pouvoir colorier part par
    // part. À côté, la pizza garde toute la hauteur du bloc, et l'œil lit la
    // commande sans quitter le dessin.
    // On travaille sur la BOÎTE, pas sur le carré inscrit : un bloc « disque à
    // gauche, commande à droite » n'est pas carré, et le carré inscrit lui
    // ferait perdre la moitié de sa largeur.
    const b = slot.boite || { x: slot.x, y: slot.y, w: slot.taille, h: slot.taille };
    const listeW = Math.min(b.w * 0.42, 42);
    const cote = b.w - listeW;
    // Deux lignes par garniture : la fraction et son nom, puis la place où
    // écrire le nombre de parts.
    const hLigne = Math.min(b.h / Math.max(1, n), b.h * 0.42);
    // LE CORPS DE TEXTE SE DÉDUIT DU PLUS LONG NOM DE GARNITURE. « de sauce
    // tomate » écrit au même corps que « de olives » sortait de la colonne et
    // se faisait couper : c'est la ligne la plus longue qui fixe la taille, et
    // toutes les garnitures d'une même pizza s'écrivent pareil.
    const long = Math.max(...item.meta.fractions.map(f => `de ${f.nom}`.length), 8);
    const corps = Math.max(2.1, Math.min(hLigne * 0.22, listeW / (3.6 + long * 0.5)));
    return {
        cote, listeW, n, hLigne, corps,
        r: Math.min(cote, b.h) * 0.46,
        cx: b.x + cote / 2, cy: b.y + b.h / 2,
        x0: b.x + cote, listeY: b.y + Math.max(0, (b.h - n * hLigne) / 2)
    };
}

/** L'angle du milieu de la part `k`, pour y poser sa marque. */
const milieuPart = (k, parts) => (k + 0.5) / parts * Math.PI * 2 - Math.PI / 2;

/** À quelle garniture revient chaque part, dans l'ordre de la commande. */
function partsDeLaPizza(m) {
    const out = [];
    m.fractions.forEach((f, i) => {
        for (let k = 0; k < (m.cible[f.ingredient] || 0); k++) out.push(i);
    });
    while (out.length < m.parts) out.push(-1);      // le reste : nature
    return out.slice(0, m.parts);
}

function pizzaPreviewHtml(item, slot, k, solution) {
    const g = geoPizza(item, slot);
    const m = item.meta;
    const couleur = polycopieEnCouleur();
    const T = (v) => (v * k).toFixed(2);
    const attribution = partsDeLaPizza(m);
    let d = '';

    d += `<circle cx="${T(g.cx)}" cy="${T(g.cy)}" r="${T(g.r)}" fill="#fff"
          stroke="#1a202c" stroke-width="${T(g.r * 0.05)}"/>`;
    for (let i = 0; i < m.parts; i++) {
        const a = i / m.parts * Math.PI * 2 - Math.PI / 2;
        d += `<line x1="${T(g.cx)}" y1="${T(g.cy)}"
              x2="${T(g.cx + Math.cos(a) * g.r)}" y2="${T(g.cy + Math.sin(a) * g.r)}"
              stroke="#1a202c" stroke-width="${T(g.r * 0.022)}"/>`;
    }
    if (solution) {
        attribution.forEach((idx, i) => {
            if (idx < 0) return;
            const a = milieuPart(i, m.parts);
            const px = g.cx + Math.cos(a) * g.r * 0.62;
            const py = g.cy + Math.sin(a) * g.r * 0.62;
            const rr = Math.min(g.r * 0.2, (g.r * 2.6) / m.parts);
            d += `<circle cx="${T(px)}" cy="${T(py)}" r="${T(rr)}"
                  fill="${couleur ? teinteIngredient(m.fractions[idx].ingredient) : '#fff'}"
                  stroke="#1a202c" stroke-width="${T(rr * 0.16)}"/>`;
            d += `<svg class="fx-pz-marque" x="${T(px - rr * 0.62)}" y="${T(py - rr * 0.62)}"
                  width="${T(rr * 1.24)}" height="${T(rr * 1.24)}" viewBox="0 0 10 10">${
    marqueSvgRelier(idx, 5, 5, 3.4, { fond: couleur ? '#fff' : '#1a202c',
        trait: couleur ? '#fff' : '#1a202c', ep: 1.5 })}</svg>`;
        });
    }

    let html = `<svg class="fx-pz-svg" style="left:0; top:0; width:100%; height:100%">${d}</svg>`;
    const hLigne = g.hLigne;
    const corps = g.corps;
    m.fractions.forEach((f, i) => {
        html += `<div class="fx-pz-entree" style="left:${g.x0 * k}px;
            top:${(g.listeY + i * hLigne) * k}px; width:${g.listeW * k}px;
            height:${hLigne * k}px; font-size:${corps * k}px">
            <div class="fx-pz-ligne">
                <svg class="fx-pz-cle" width="${T(corps * 1.5)}" height="${T(corps * 1.5)}"
                     viewBox="0 0 10 10">${marqueSvgRelier(i, 5, 5, 3.6,
        { fond: couleur ? teinteIngredient(f.ingredient) : '#1a202c',
            trait: couleur ? teinteIngredient(f.ingredient) : '#1a202c', ep: 1.6 })}</svg>
                <b class="fx-frac"><span class="fx-frac-n">${f.num}</span><span class="fx-frac-d">${f.den}</span></b>
                <span>de ${echapperSheet(f.nom)}</span>
            </div>
            <div class="fx-pz-parts">${solution
        ? `= ${echapperSheet(direParts(m.cible[f.ingredient]))}` : '= ....... parts'}</div>
        </div>`;
    });
    return html;
}

const teinteIngredient = (id) => (INGREDIENTS_FICHE.find(i => i.id === id) || {}).teinte || '#64748b';

/** La même teinte, en composantes, pour jsPDF. */
const rvbIngredient = (id) => {
    const h = teinteIngredient(id);
    return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
};

/** « 1 part », « 3 parts » : un singulier fautif se remarque sur une fiche. */
const direParts = (n) => `${n} part${n > 1 ? 's' : ''}`;

function dessinerPizzaPdf(doc, item, slot, solution) {
    const g = geoPizza(item, slot);
    const m = item.meta;
    const couleur = polycopieEnCouleur();
    const attribution = partsDeLaPizza(m);

    doc.setDrawColor(...ENCRE.trait);
    doc.setFillColor(255, 255, 255);
    doc.setLineWidth(Math.max(0.4, g.r * 0.05));
    doc.circle(g.cx, g.cy, g.r, 'FD');
    doc.setLineWidth(Math.max(0.2, g.r * 0.022));
    for (let i = 0; i < m.parts; i++) {
        const a = i / m.parts * Math.PI * 2 - Math.PI / 2;
        doc.line(g.cx, g.cy, g.cx + Math.cos(a) * g.r, g.cy + Math.sin(a) * g.r);
    }
    if (solution) {
        attribution.forEach((idx, i) => {
            if (idx < 0) return;
            const a = milieuPart(i, m.parts);
            const px = g.cx + Math.cos(a) * g.r * 0.62;
            const py = g.cy + Math.sin(a) * g.r * 0.62;
            const rr = Math.min(g.r * 0.2, (g.r * 2.6) / m.parts);
            doc.setLineWidth(Math.max(0.2, rr * 0.16));
            doc.setDrawColor(...ENCRE.trait);
            doc.setFillColor(...(couleur ? rvbIngredient(m.fractions[idx].ingredient) : [255, 255, 255]));
            doc.circle(px, py, rr, 'FD');
            dessinerMarque(doc, idx, px, py, rr * 0.62,
                couleur ? [255, 255, 255] : ENCRE.trait);
        });
    }

    const hLigne = g.hLigne;
    const mm = g.corps;                    // le corps en millimètres
    const corps = mm / 0.3528;             // le même, en points, pour jsPDF
    m.fractions.forEach((f, i) => {
        const haut = g.listeY + i * hLigne;
        const y = haut + hLigne * 0.42;          // la ligne d'écriture de la fraction
        const cx = g.x0 + mm * 0.55;
        doc.setLineWidth(0.3);
        doc.setDrawColor(...ENCRE.trait);
        doc.setFillColor(...(couleur ? rvbIngredient(f.ingredient) : [255, 255, 255]));
        doc.circle(cx, y - mm * 0.2, mm * 0.42, 'FD');
        dessinerMarque(doc, i, cx, y - mm * 0.2, mm * 0.26,
            couleur ? [255, 255, 255] : ENCRE.trait);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(corps);
        doc.setTextColor(...ENCRE.texte);
        // LA FRACTION S'ÉCRIT EN COLONNE, comme partout ailleurs sur les fiches.
        const x = fractionPdf(doc, f.num, f.den, cx + mm * 0.68, y, mm);
        doc.setFont('helvetica', 'normal');
        doc.text(pourPdf(` de ${f.nom}`), x, y);
        doc.setTextColor(...ENCRE.gris);
        doc.setFont('helvetica', 'bold');
        doc.text(pourPdf(solution ? `= ${direParts(m.cible[f.ingredient])}` : '= ....... parts'),
            cx + mm * 0.68, haut + hLigne * 0.88);
    });
}

/**
 * Une fraction empilée dans le PDF : numérateur au-dessus, dénominateur en
 * dessous, et le trait POSÉ SUR LA LIGNE D'ÉCRITURE — la règle est la même que
 * sur les fiches de questions. Rend l'abscisse atteinte, pour enchaîner le
 * texte qui suit.
 */
function fractionPdf(doc, num, den, x, y, taille) {
    const n = String(num), d = String(den);
    const wn = doc.getTextWidth(n), wd = doc.getTextWidth(d);
    const w = Math.max(wn, wd) + taille * 0.26;
    doc.text(n, x + (w - wn) / 2, y - taille * 0.28);
    doc.text(d, x + (w - wd) / 2, y + taille * 0.98);
    doc.setLineWidth(Math.max(0.2, taille * 0.06));
    doc.setDrawColor(...ENCRE.texte);
    doc.line(x + taille * 0.06, y, x + w - taille * 0.06, y);
    return x + w;
}

// --- LE TABLEAU DE PROPORTIONNALITÉ --------------------------------------------
//
// Deux lignes, quelques colonnes, des cases vides : c'est l'exercice du cahier,
// et il se photocopie tel quel. Les en-têtes portent leur unité — « Prix (€) »,
// « Farine (g) » — parce qu'un tableau sans unité ne dit pas de quoi il parle,
// et que la réponse d'un problème porte toujours la sienne.
//
// LA COLONNE COMPLÈTE EST GARANTIE PAR LE NOYAU : sans elle le coefficient
// serait indéterminé et l'élève aurait tort en ayant raison. Le titre du bloc
// rappelle la situation (« l'achat de stylos ») : un tableau de nombres nus
// n'apprend pas à reconnaître une situation de proportionnalité.

function geoProportion(item, slot) {
    const m = item.meta;
    const cols = m.a.length + 1;                 // + la colonne des libellés
    const b = slot.boite;
    const enTete = Math.min(b.h * 0.28, 9);      // la phrase de situation
    const hDispo = b.h - enTete;
    const cellH = Math.min(hDispo / 2.6, 13);
    const libW = Math.min(b.w * 0.34, 42);
    const cellW = (b.w - libW) / (cols - 1);
    return { m, cols, b, enTete, cellH, libW, cellW, y0: b.y + enTete };
}

const enTeteProp = (nom, unite) => (unite ? `${nom} (${unite})` : nom);

function proportionPreviewHtml(item, slot, k, solution) {
    const g = geoProportion(item, slot);
    const m = g.m;
    const creux = (col, ligne) => m.trous.some(t => t.col === col && t.ligne === ligne);
    let html = `<div class="fx-pr-sujet" style="left:${g.b.x * k}px; top:${g.b.y * k}px;
        width:${g.b.w * k}px; height:${g.enTete * k}px;
        font-size:${Math.min(g.enTete * 0.5, 3.4) * k}px">Tableau de proportionnalité pour
        ${echapperSheet(m.contexte.sujet)}.</div>`;

    const ligne = (nom, unite, valeurs, quelle, rang) => {
        const y = g.y0 + rang * g.cellH;
        let out = `<div class="fx-pr-tete" style="left:${g.b.x * k}px; top:${y * k}px;
            width:${g.libW * k}px; height:${g.cellH * k}px;
            font-size:${Math.min(g.cellH * 0.34, 3) * k}px">${echapperSheet(enTeteProp(nom, unite))}</div>`;
        valeurs.forEach((v, i) => {
            const vide = creux(i, quelle) && !solution;
            out += `<div class="fx-pr-case${vide ? ' fx-pr-case--vide' : ''}"
                style="left:${(g.b.x + g.libW + i * g.cellW) * k}px; top:${y * k}px;
                width:${g.cellW * k}px; height:${g.cellH * k}px;
                font-size:${Math.min(g.cellH * 0.46, 4.2) * k}px">${vide ? '' : echapperSheet(ecrireProp(v))}</div>`;
        });
        return out;
    };
    html += ligne(m.contexte.a, m.contexte.uA, m.a, 'a', 0);
    html += ligne(m.contexte.b, m.contexte.uB, m.b, 'b', 1);
    return html;
}

function dessinerProportionPdf(doc, item, slot, solution, champ) {
    const g = geoProportion(item, slot);
    const m = g.m;
    const creux = (col, ligne) => m.trous.some(t => t.col === col && t.ligne === ligne);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(Math.max(6, Math.min(g.enTete * 0.85, 8)));
    doc.setTextColor(...ENCRE.gris);
    doc.text(pourPdf(`Tableau de proportionnalité pour ${m.contexte.sujet}.`),
        g.b.x, g.b.y + g.enTete * 0.72);

    const ligne = (nom, unite, valeurs, quelle, rang) => {
        const y = g.y0 + rang * g.cellH;
        doc.setDrawColor(...ENCRE.trait);
        doc.setLineWidth(0.35);
        doc.setFillColor(...ENCRE.donnee);
        doc.rect(g.b.x, y, g.libW, g.cellH, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(Math.max(5.5, Math.min(g.cellH * 0.62, 8)));
        doc.setTextColor(...ENCRE.texte);
        doc.text(pourPdf(enTeteProp(nom, unite)), g.b.x + 1.4, y + g.cellH * 0.64, {
            maxWidth: g.libW - 2.6
        });
        valeurs.forEach((v, i) => {
            const x = g.b.x + g.libW + i * g.cellW;
            const vide = creux(i, quelle) && !solution;
            doc.setFillColor(255, 255, 255);
            doc.rect(x, y, g.cellW, g.cellH, 'FD');
            if (vide) { if (champ) champ(x + 1, y + 1, g.cellW - 2, g.cellH - 2); return; }
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(Math.max(6, Math.min(g.cellH * 0.72, 11)));
            doc.setTextColor(...ENCRE.texte);
            doc.text(pourPdf(ecrireProp(v)), x + g.cellW / 2, y + g.cellH * 0.68, { align: 'center' });
        });
    };
    ligne(m.contexte.a, m.contexte.uA, m.a, 'a', 0);
    ligne(m.contexte.b, m.contexte.uB, m.b, 'b', 1);
}

// --- RELIER LES COMPLÉMENTS ----------------------------------------------------
//
// Deux colonnes de nombres, et un trait à tracer entre chaque nombre et son
// complément. La pastille au bord intérieur de chaque case dit OÙ partir et où
// arriver : sans elle, les traits partent du milieu des chiffres et la feuille
// devient illisible dès la troisième paire.

function geoPaires(item, slot) {
    const m = item.meta;
    const n = Math.max(m.gauche.length, m.droite.length);
    const b = slot.boite;
    const h = Math.min(b.h / (n + 0.6), 13);
    const largeur = Math.min(b.w * 0.3, 26);
    const y0 = b.y + (b.h - n * h) / 2;
    return {
        m, n, b, h, largeur, y0,
        xG: b.x + b.w * 0.06,
        xD: b.x + b.w * 0.94 - largeur,
        // Le point d'attache : au bord INTÉRIEUR, à mi-hauteur de la case.
        py: (i) => y0 + i * h + h / 2,
        pxG: b.x + b.w * 0.06 + largeur,
        pxD: b.x + b.w * 0.94 - largeur
    };
}

function pairesPreviewHtml(item, slot, k, solution) {
    const g = geoPaires(item, slot);
    const m = g.m;
    let html = '';
    const T = (v) => (v * k).toFixed(2);

    if (solution) {
        let d = '';
        m.lien.forEach((j, i) => {
            if (j < 0) return;
            d += `<line x1="${T(g.pxG + 1)}" y1="${T(g.py(i))}" x2="${T(g.pxD - 1)}" y2="${T(g.py(j))}"
                  stroke="#4f46e5" stroke-width="${T(0.5)}" stroke-linecap="round"/>`;
        });
        html += `<svg class="fx-pa-svg" style="left:0; top:0; width:100%; height:100%">${d}</svg>`;
    }

    const colonne = (valeurs, x, cote) => valeurs.map((v, i) => `
        <div class="fx-pa-case fx-pa-case--${cote}" style="left:${x * k}px; top:${(g.y0 + i * g.h) * k}px;
            width:${g.largeur * k}px; height:${(g.h * 0.82) * k}px;
            font-size:${Math.min(g.h * 0.5, 5) * k}px">${v}</div>
        <div class="fx-pa-point" style="left:${((cote === 'g' ? g.pxG : g.pxD) - 0.9) * k}px;
            top:${(g.py(i) - 0.9) * k}px; width:${1.8 * k}px; height:${1.8 * k}px"></div>`).join('');
    html += colonne(m.gauche, g.xG, 'g');
    html += colonne(m.droite, g.xD, 'd');
    return html;
}

function dessinerPairesPdf(doc, item, slot, solution) {
    const g = geoPaires(item, slot);
    const m = g.m;

    if (solution) {
        doc.setDrawColor(79, 70, 229);
        doc.setLineWidth(0.5);
        m.lien.forEach((j, i) => {
            if (j < 0) return;
            doc.line(g.pxG + 1, g.py(i), g.pxD - 1, g.py(j));
        });
    }

    const colonne = (valeurs, x, cote) => {
        valeurs.forEach((v, i) => {
            const y = g.y0 + i * g.h;
            doc.setDrawColor(...ENCRE.trait);
            doc.setFillColor(255, 255, 255);
            doc.setLineWidth(0.35);
            doc.roundedRect(x, y, g.largeur, g.h * 0.82, 1.2, 1.2, 'FD');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(Math.max(7, Math.min(g.h * 1.4, 13)));
            doc.setTextColor(...ENCRE.texte);
            doc.text(String(v), x + g.largeur / 2, y + g.h * 0.58, { align: 'center' });
            doc.setFillColor(...ENCRE.trait);
            doc.circle(cote === 'g' ? g.pxG : g.pxD, g.py(i), 0.7, 'F');
        });
    };
    colonne(m.gauche, g.xG, 'g');
    colonne(m.droite, g.xD, 'd');
}

// --- LE TABLEUR ----------------------------------------------------------------
//
// Une grille de tableur, avec sa barre de lettres en haut et sa colonne de
// numéros à gauche : c'est ce liseré gris qui fait reconnaître un tableur, et
// c'est aussi lui qui porte tout le repérage.
//
// Trois exercices sur le même dessin — nommer la zone coloriée, colorier la
// zone nommée, écrire la formule sous une colonne de nombres — et une seule
// géométrie, parce que ce sont les mêmes cases.

function geoTableur(item, slot) {
    const m = item.meta;
    const formule = m.quoi === 'formule';
    // Le tableau de la formule : deux colonnes (libellé, nombre) et une ligne
    // de plus que les données — celle qui reçoit la formule.
    const cols = formule ? 2 : m.cols;
    const rows = formule ? m.derniere + 1 : m.rows;
    const lignes = formule ? 2 : 1;                  // la place pour répondre
    const ligneH = slot.taille * 0.115;
    const zone = slot.taille - lignes * ligneH;

    // L'en-tête (les lettres) et la gouttière (les numéros) sont plus minces
    // qu'une case : sur un vrai tableur aussi.
    const cellW = Math.min(slot.taille * 0.9 / (cols + 0.55), formule ? slot.taille * 0.42 : 99);
    const enTeteH = Math.min(zone / (rows + 1.4), cellW * 0.62);
    const cellH = Math.min((zone - enTeteH) / rows, cellW * 0.68);
    const gouttiereW = cellW * 0.55;
    const largeur = gouttiereW + cols * cellW;
    const hauteur = enTeteH + rows * cellH;
    return {
        m, formule, cols, rows, cellW, cellH, enTeteH, gouttiereW, largeur, hauteur, ligneH,
        x0: slot.x + (slot.taille - largeur) / 2,
        y0: slot.y + (zone - hauteur) / 2,
        ligneY: slot.y + zone
    };
}

/** Le coin haut-gauche d'une case, en millimètres. */
const caseTableur = (g, c, r) => ({
    x: g.x0 + g.gouttiereW + c * g.cellW,
    y: g.y0 + g.enTeteH + r * g.cellH
});

const LETTRES_T = 'ABCDEFGH';

/** Le texte d'une case du tableau de formule — vide si rien n'y va. */
function contenuTableur(m, c, r) {
    if (r === 0) return m.entetes[c];
    const i = r - 1;
    if (i < m.valeurs.length) return c === 0 ? m.libelles[i] : String(m.valeurs[i]);
    return c === 0 ? m.etiquette : '';
}

function tableurPreviewHtml(item, slot, k, solution) {
    const g = geoTableur(item, slot);
    const m = g.m;
    const T = (v) => (v * k).toFixed(2);
    const zone = m.zone;
    // La zone est coloriée d'emblée quand on demande son nom ; sur la
    // correction, elle l'est aussi quand c'était à l'élève de le faire.
    const teinter = !g.formule && (m.quoi === 'nommer' || solution);
    const dansZone = (c, r) => zone && c >= zone.c1 && c <= zone.c2 && r >= zone.r1 && r <= zone.r2;

    let d = '';
    for (let r = 0; r < g.rows; r++) {
        for (let c = 0; c < g.cols; c++) {
            const q = caseTableur(g, c, r);
            const chaude = teinter && dansZone(c, r);
            d += `<rect x="${T(q.x)}" y="${T(q.y)}" width="${T(g.cellW)}" height="${T(g.cellH)}"
                fill="${chaude ? '#c9dcf7' : '#fff'}" stroke="#8a93a3" stroke-width="${T(0.22)}"/>`;
            if (g.formule) {
                const texte = contenuTableur(m, c, r);
                const cible = r === g.rows - 1 && c === 1;
                if (texte || (cible && solution)) {
                    d += `<text x="${T(q.x + (c === 0 ? g.cellW * 0.08 : g.cellW / 2))}"
                        y="${T(q.y + g.cellH / 2)}"
                        text-anchor="${c === 0 ? 'start' : 'middle'}" dominant-baseline="central"
                        font-size="${T(Math.min(g.cellH * 0.42, 3.2))}"
                        font-weight="${r === 0 || c === 0 ? 700 : 500}"
                        fill="#1a202c">${echapperSheet(
                            cible ? String(m.resultat).replace('.', ',') : texte)}</text>`;
                }
            }
        }
    }
    // L'en-tête des colonnes et la gouttière des lignes : le liseré gris.
    for (let c = 0; c < g.cols; c++) {
        const x = g.x0 + g.gouttiereW + c * g.cellW;
        d += `<rect x="${T(x)}" y="${T(g.y0)}" width="${T(g.cellW)}" height="${T(g.enTeteH)}"
            fill="#e7eaf0" stroke="#8a93a3" stroke-width="${T(0.22)}"/>
            <text x="${T(x + g.cellW / 2)}" y="${T(g.y0 + g.enTeteH / 2)}" text-anchor="middle"
            dominant-baseline="central" font-size="${T(Math.min(g.enTeteH * 0.6, 3))}"
            font-weight="700" fill="#4a5568">${LETTRES_T[c]}</text>`;
    }
    for (let r = 0; r < g.rows; r++) {
        const y = g.y0 + g.enTeteH + r * g.cellH;
        d += `<rect x="${T(g.x0)}" y="${T(y)}" width="${T(g.gouttiereW)}" height="${T(g.cellH)}"
            fill="#e7eaf0" stroke="#8a93a3" stroke-width="${T(0.22)}"/>
            <text x="${T(g.x0 + g.gouttiereW / 2)}" y="${T(y + g.cellH / 2)}" text-anchor="middle"
            dominant-baseline="central" font-size="${T(Math.min(g.cellH * 0.5, 3))}"
            font-weight="700" fill="#4a5568">${r + 1}</text>`;
    }

    let html = `<svg class="fx-tb-svg" style="left:0; top:0; width:100%; height:100%">${d}</svg>`;
    html += lignesReponseTableur(m, g, k, solution, slot);
    return html;
}

/** Les lignes sous la grille : la question, puis la place pour répondre. */
function lignesReponseTableur(m, g, k, solution, slot) {
    const dire = [];
    if (m.quoi === 'nommer') {
        dire.push(['La zone coloriée s\'appelle', solution ? m.nom : '..................']);
    } else if (m.quoi === 'colorier') {
        dire.push([`Colorie ${m.nom}`, solution ? `${m.combien} case${m.combien > 1 ? 's' : ''}` : '']);
    } else {
        dire.push([`En B${m.derniere + 1} :`, solution ? m.formule : '=..............................']);
        dire.push(['', solution ? '' : '']);
    }
    return dire.map(([gauche, droite], i) => {
        if (!gauche && !droite) return '';
        return `<div class="fx-tb-ligne" style="left:${slot.x * k}px;
            top:${(g.ligneY + i * g.ligneH) * k}px; width:${slot.taille * k}px;
            height:${g.ligneH * k}px; font-size:${g.ligneH * 0.44 * k}px">
            <b>${echapperSheet(gauche)}</b><i>${echapperSheet(droite)}</i></div>`;
    }).join('');
}

function dessinerTableurPdf(doc, item, slot, solution, champ) {
    const g = geoTableur(item, slot);
    const m = g.m;
    const zone = m.zone;
    const teinter = !g.formule && (m.quoi === 'nommer' || solution);
    const dansZone = (c, r) => zone && c >= zone.c1 && c <= zone.c2 && r >= zone.r1 && r <= zone.r2;

    doc.setDrawColor(138, 147, 163);
    doc.setLineWidth(0.22);
    for (let r = 0; r < g.rows; r++) {
        for (let c = 0; c < g.cols; c++) {
            const q = caseTableur(g, c, r);
            if (teinter && dansZone(c, r)) {
                doc.setFillColor(201, 220, 247);
                doc.rect(q.x, q.y, g.cellW, g.cellH, 'FD');
            } else {
                // Un fond blanc explicite : sans lui, la case garderait la
                // teinte laissée par le dernier texte écrit.
                doc.setFillColor(255, 255, 255);
                doc.rect(q.x, q.y, g.cellW, g.cellH, 'FD');
            }
            if (!g.formule) continue;
            const cible = r === g.rows - 1 && c === 1;
            const texte = cible && solution
                ? String(m.resultat).replace('.', ',')
                : contenuTableur(m, c, r);
            if (!texte) continue;
            doc.setFont('helvetica', (r === 0 || c === 0) ? 'bold' : 'normal');
            doc.setFontSize(Math.max(5, Math.min(g.cellH * 1.6, 9)));
            doc.setTextColor(...ENCRE.texte);
            if (c === 0) doc.text(pourPdf(texte), q.x + g.cellW * 0.08, q.y + g.cellH * 0.66);
            else doc.text(pourPdf(texte), q.x + g.cellW / 2, q.y + g.cellH * 0.66, { align: 'center' });
        }
    }

    // ATTENTION : `setTextColor` change AUSSI la couleur de remplissage dans
    // jsPDF — un texte est peint avec le « fill ». Sans redire la teinte du
    // liseré avant chaque case, la première sortait grise et toutes les
    // suivantes en bleu nuit, lettres invisibles dessus.
    doc.setFont('helvetica', 'bold');
    for (let c = 0; c < g.cols; c++) {
        const x = g.x0 + g.gouttiereW + c * g.cellW;
        doc.setFillColor(231, 234, 240);
        doc.rect(x, g.y0, g.cellW, g.enTeteH, 'FD');
        doc.setFontSize(Math.max(5, Math.min(g.enTeteH * 1.7, 9)));
        doc.setTextColor(74, 85, 104);
        doc.text(LETTRES_T[c], x + g.cellW / 2, g.y0 + g.enTeteH * 0.72, { align: 'center' });
    }
    for (let r = 0; r < g.rows; r++) {
        const y = g.y0 + g.enTeteH + r * g.cellH;
        doc.setFillColor(231, 234, 240);
        doc.rect(g.x0, y, g.gouttiereW, g.cellH, 'FD');
        doc.setFontSize(Math.max(5, Math.min(g.cellH * 1.4, 9)));
        doc.setTextColor(74, 85, 104);
        doc.text(String(r + 1), g.x0 + g.gouttiereW / 2, y + g.cellH * 0.68, { align: 'center' });
    }

    const y = g.ligneY + g.ligneH * 0.7;
    const x0 = slot.x + slot.taille * 0.04;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(Math.max(6.5, Math.min(g.ligneH * 1.3, 10)));
    doc.setTextColor(...ENCRE.texte);
    const etiquette = pourPdf(m.quoi === 'formule'
        ? `En B${m.derniere + 1} :`
        : (m.quoi === 'nommer' ? 'La zone coloriée s\'appelle' : `Colorie ${m.nom}`));
    doc.text(etiquette, x0, y);
    if (m.quoi === 'colorier' && !solution) return;

    const xr = x0 + doc.getTextWidth(etiquette) + slot.taille * 0.03;
    if (solution) {
        doc.text(pourPdf(m.quoi === 'formule' ? m.formule
            : (m.quoi === 'nommer' ? m.nom : `${m.combien} case${m.combien > 1 ? 's' : ''}`)), xr, y);
        return;
    }
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...ENCRE.gris);
    doc.text(m.quoi === 'formule' ? '=..............................' : '..................', xr, y);
    if (champ) champ(xr, y - g.ligneH * 0.6, slot.x + slot.taille * 0.96 - xr, g.ligneH * 0.8);
}

// --- Priorités : la cascade ---------------------------------------------------
//
// L'expression en haut, puis AUTANT DE LIGNES VIDES QUE LE CALCUL A D'ÉTAPES.
// Ni une de plus — ce serait un piège, l'élève chercherait une étape qui
// n'existe pas —, ni une de moins : la dernière ligne porte le résultat seul,
// et sans elle il faudrait l'écrire dans la marge.

function geoPriorites(item, slot) {
    const m = item.meta;
    // LA BOÎTE ENTIÈRE, pas le carré inscrit : une cascade est large et courte,
    // et le carré lui laissait un quart de bloc vide sur la gauche.
    const b = slot.boite;
    // AUTANT DE LIGNES POUR TOUS LES CALCULS DE LA FEUILLE.
    //
    // On donnait exactement le nombre d'étapes de CE calcul : deux lignes ici,
    // quatre là. Rémy : « mets le même nombre de lignes à chaque fois ». Deux
    // raisons, et la seconde est la vraie. La feuille d'abord : des blocs de
    // hauteurs différentes se rangent mal et l'on voit un escalier. Mais
    // surtout, le nombre de lignes DIT COMBIEN D'ÉTAPES IL Y A — c'est-à-dire
    // une partie de la réponse. Un élève qui compte trois lignes sait qu'il
    // lui reste trois opérations, et n'a plus à se demander s'il a fini.
    //
    // Le maximum du RÉGLAGE, pas un nombre inventé : le générateur le calcule
    // sur les formes qu'il peut tirer (`etapesMax`), et il est donc le même
    // pour tous les calculs d'une même fiche.
    const rangs = Math.max(m.etapes, m.etapesMax || 0) + 1;
    // LE NUMÉRO EST SUR LA MÊME LIGNE QUE LE CALCUL, comme dans un cahier :
    // « 1.  2 × 6 + 7 − 2 ». Posé au-dessus du bloc, il coûtait une ligne
    // entière et le calcul flottait sans rien à quoi s'aligner.
    const gouttiere = slot.numero != null ? 7 : 0;
    // LES LIGNES NE S'ÉTIRENT PAS POUR REMPLIR LE BLOC — mais elles ne se
    // perdent pas non plus dedans. Sept millimètres, c'est l'interligne d'un
    // cahier : au-delà on n'écrit plus une cascade, on écrit dans le vide, et
    // l'œil ne relie plus une ligne à la suivante. Rémy : « il y a trop
    // d'espace entre les lignes » — c'était neuf, et sur une feuille à six
    // calculs le bloc était assez haut pour que le plafond soit atteint : les
    // trois lignes se retrouvaient à un centimètre l'une de l'autre. Le blanc
    // qui reste au bas du bloc ne se perd pas, il SÉPARE deux calculs.
    const ligneH = Math.min(b.h / (rangs + 0.3), 7);
    return {
        m, rangs, ligneH, gouttiere,
        numero: slot.numero,
        x0: b.x + gouttiere,
        largeur: b.w - gouttiere - 2,
        y0: b.y,
        // LA MÊME TAILLE POUR TOUS LES CALCULS DE LA FEUILLE. Elle se prenait
        // sur l'interligne, qui dépend du nombre d'étapes : un calcul en deux
        // étapes s'imprimait à côté d'un calcul en trois, moitié plus gros, et
        // la feuille avait l'air bricolée. Elle ne dépend plus que du bloc,
        // le même pour tout le monde.
        //
        // ET UN CRAN PLUS GROS. Rémy, sur les deux fiches de priorités : « tu
        // peux écrire les calculs en un peu plus gros — les pointillés
        // nickel ». C'est bien l'EXPRESSION qu'il vise, pas l'interligne : le
        // calcul est la seule chose imprimée du bloc, tout le reste est du
        // vide à remplir, et il se lit de loin quand on corrige une pile de
        // copies. Le plus long qu'on tire — « 3 × (−2) + 5 − (−6) » — occupe
        // encore moins de la moitié d'un bloc de quatre colonnes.
        taille: Math.max(8.5, Math.min(b.h * 0.36, 14))
    };
}

function prioritesPreviewHtml(item, slot, k, solution) {
    const g = geoPriorites(item, slot);
    let html = '';
    // LE CALCUL SE RÉCRIT — voir `retoucheGrille` plus bas.
    //
    // Rémy : « on ne peut pas changer les calculs du 33 ». Sur cette feuille on
    // récrit déjà un titre, une consigne, un énoncé ; la cascade, elle, se
    // dessine par un rendu à part et n'offrait aucune prise. C'est pourtant
    // l'exercice qu'un professeur veut le plus retoucher : il a SES calculs,
    // ceux de son cours.
    //
    // La zone couvre la première ligne — l'expression —, jamais les lignes
    // vides en dessous : elles ne portent rien à récrire.
    if (slot.retouchable && slot.exoId != null && slot.iQ != null) {
        html += `<div class="fx-qgestes fx-retouche" data-txt-exo="${echapperSheet(slot.exoId)}"
            data-txt-rang="${slot.iQ}" title="Cliquer pour récrire ce calcul"
            style="left:${g.x0 * k}px; top:${g.y0 * k}px;
            width:${g.largeur * k}px; height:${g.ligneH * k}px"></div>`;
    }
    // Le numéro, dans la marge, à la hauteur du calcul.
    if (g.numero != null) {
        html += `<div style="position:absolute; left:${slot.boite.x * k}px; top:${g.y0 * k}px;
            width:${(g.gouttiere - 1) * k}px; height:${g.ligneH * k}px;
            display:flex; align-items:center; font-weight:800; color:#6e7684;
            font-size:${g.taille * 0.3 * k}px">${g.numero}.</div>`;
    }
    for (let i = 0; i < g.rangs; i++) {
        const y = g.y0 + i * g.ligneH;
        const texte = (i === 0 || solution) ? (g.m.lignes[i] || '') : '';
        // La ligne d'écriture s'arrête sous la première ligne : l'énoncé est
        // imprimé, on n'écrit pas dessus.
        if (i > 0) {
            html += `<div style="position:absolute; left:${g.x0 * k}px;
                top:${(y + g.ligneH * 0.86) * k}px; width:${g.largeur * k}px;
                height:1px; background:#b0b6c5"></div>`;
        }
        if (!texte) continue;
        // LA TAILLE DU PDF EST EN POINTS, l'aperçu travaille en millimètres :
        // 1 pt ≈ 0,3528 mm. Sans la conversion, l'aperçu écrivait presque trois
        // fois trop gros et les lignes se chevauchaient.
        html += `<div style="position:absolute; left:${g.x0 * k}px; top:${y * k}px;
            width:${g.largeur * k}px; height:${g.ligneH * k}px;
            display:flex; align-items:center; font-size:${g.taille * 0.3528 * k}px;
            font-weight:${i === 0 ? 800 : 600}; color:${i === 0 ? '#1a202c' : '#2f855a'};
            white-space:nowrap">${texte}</div>`;
    }
    return html;
}

function dessinerPrioritesPdf(doc, item, slot, solution) {
    const g = geoPriorites(item, slot);
    if (g.numero != null) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(g.taille * 0.85);
        doc.setTextColor(...ENCRE.gris);
        doc.text(`${g.numero}.`, slot.boite.x, g.y0 + g.ligneH * 0.7);
    }
    for (let i = 0; i < g.rangs; i++) {
        const y = g.y0 + i * g.ligneH;
        if (i > 0) {
            doc.setDrawColor(...ENCRE.grille);
            doc.setLineWidth(0.22);
            const yl = y + g.ligneH * 0.86;
            doc.line(g.x0, yl, g.x0 + g.largeur, yl);
        }
        const texte = (i === 0 || solution) ? (g.m.lignes[i] || '') : '';
        if (!texte) continue;
        doc.setFont('helvetica', i === 0 ? 'bold' : 'normal');
        doc.setFontSize(g.taille);
        // Les lignes de la solution en gris : sur la page des solutions, on
        // distingue d'un coup d'œil ce qui était donné de ce qui était à faire.
        doc.setTextColor(...(i === 0 ? ENCRE.texte : ENCRE.gris));
        doc.text(pourPdf(texte), g.x0, y + g.ligneH * 0.7);
    }
}

// --- POSER UNE OPÉRATION, SUR LE PAPIER -----------------------------------------

/**
 * LA GÉOMÉTRIE D'UNE OPÉRATION POSÉE, commune à l'aperçu et au PDF.
 *
 * Tout se joue sur une grille de colonnes de largeur fixe : c'est elle qui
 * met les unités sous les unités. Les nombres sont imprimés DÉJÀ ALIGNÉS —
 * l'alignement se travaille à l'écran, où l'on peut recommencer ; sur une
 * photocopie, un élève qui aligne mal n'a plus qu'à raturer.
 *
 * Le nombre de rangées dépend de l'opération, et c'est ce qui donne « la bonne
 * hauteur » que Rémy réclamait pour la division : une potence a besoin de deux
 * lignes par étape — le produit qu'on écrit, et le reste qu'on trouve.
 */
/**
 * Les étapes d'une division QU'ON ÉCRIT VRAIMENT au tableau.
 *
 * Le noyau rend une étape par chiffre du dividende, y compris celles où le
 * diviseur « ne va pas » — « 2 ÷ 64 », puis « 22 ÷ 64 ». On ne les pose pas :
 * on prend les trois premiers chiffres d'un coup, et c'est ce que fait tout
 * élève. Les dessiner remplissait la potence de zéros parasites ; les compter
 * la faisait deux fois trop haute.
 */
function etapesEcrites(t) {
    const ecrites = (t.etapes || []).filter(e => e.ecrit);
    // ON S'ARRÊTE QUAND LA DIVISION EST FINIE. Poussée jusqu'au centième, une
    // division qui tombe juste avant — 146 ÷ 2 = 73 — continue d'abaisser des
    // zéros : le noyau a raison de les calculer, la feuille aurait tort de les
    // dessiner. Deux rangées de « 0 » sous un travail terminé, et l'élève
    // cherche ce qu'on attend de lui.
    let fin = ecrites.length;
    while (fin > 1 && ecrites[fin - 1].produit === 0 && ecrites[fin - 1].reste === 0) fin--;
    return ecrites.slice(0, fin);
}

/**
 * LA VIRGULE N'EST PAS UN CHIFFRE : elle ne prend pas de colonne.
 *
 * On posait les nombres en découpant leur chaîne — `String(12.5)` — ce qui
 * donnait quatre cases dont une contenant un point, calées sur le bord droit.
 * C'est exactement l'erreur qu'on passe l'année à corriger chez les élèves, et
 * la feuille l'imprimait. Les chiffres se posent maintenant PAR RANG, et la
 * virgule se dessine sur la frontière entre les unités et les dixièmes —
 * là où elle tombe sur un cahier, entre deux carreaux.
 */
const digitsDe = (v) => String(Math.round(Math.abs(v) * Math.pow(10, decimalesPose(v)))).split('');

/**
 * COMBIEN DE COLONNES SOUS LES UNITÉS, dans une potence.
 *
 * Le dividende en apporte par ses décimales ; poursuivre la division en
 * apporte d'autres, qu'aucun chiffre du dividende n'occupe. Les deux se
 * comptent au même endroit, sinon la géométrie et le dessin ne parlent plus
 * de la même feuille.
 */
const basPotence = (m, t) =>
    Math.max(decimalesPose(m.operandes[0]), t.decimalesQuotient || 0);

function geoPose(item, slot) {
    const m = item.meta;
    const b = slot.boite;
    const t = m.table;
    const op = m.operation;
    const gouttiere = slot.numero != null ? 7 : 0;
    const x0 = b.x + gouttiere;
    const large = b.w - gouttiere - 1;

    // Combien de colonnes de chiffres, et combien de rangées d'écriture ?
    let nCol, rangs, lignesOperandes = m.operandes.length;
    if (op === '+' || op === '-') {
        // `t.colonnes` est indexé PAR RANG, décimales comprises : le compte est
        // donc déjà le bon, et la virgule n'y ajoute pas de colonne — elle se
        // dessine sur la frontière, comme entre deux carreaux d'un cahier.
        nCol = t.colonnes.length;
        // Une rangée de retenues, les opérandes, le trait, le résultat.
        rangs = 1 + lignesOperandes + 1;
    } else if (op === '×') {
        nCol = String(t.produitEntier).length;
        // Les deux facteurs, le trait, un produit partiel par ligne, puis —
        // s'il y en a plusieurs — le trait et la somme.
        rangs = 1 + 2 + t.lignes.length + (t.sommeAPoser ? 1 : 0);
    } else {
        // LA DIVISION : deux lignes par étape. C'est exactement la place qu'il
        // faut pour écrire le produit sous le nombre courant, tirer le trait,
        // et poser le reste dessous — « il faut la soustraction étape par
        // étape », et sans la hauteur, elle ne tient pas.
        // LE DIVIDENDE SE COMPTE EN RANGS, pas en caractères : « 336,5 » a
        // cinq caractères et quatre chiffres, et compter le point donnait une
        // colonne de trop — puis tout le reste décalé d'un cran.
        //
        // ET LA POTENCE VA PLUS BAS QUE LE DIVIDENDE quand on poursuit la
        // division : abaisser des zéros crée des rangs que le dividende n'a
        // pas. Sans ces colonnes-là, les dernières soustractions se posaient
        // à DROITE du dernier chiffre, c'est-à-dire hors du bloc.
        //
        // On compte DU RANG LE PLUS FORT DU DIVIDENDE AU PLUS FAIBLE ÉCRIT,
        // plus une colonne de garde avant la barre. Additionner la longueur du
        // dividende ET les décimales comptait deux fois celles qu'il porte
        // déjà, et décalait toute la potence vers la gauche.
        nCol = rangsPose(m.operandes[0])[0] + basPotence(m, t) + 2;
        // Deux lignes par étape ÉCRITE — le produit qu'on pose, le reste qu'on
        // trouve. Les étapes muettes (« 2 ÷ 64, ça ne va pas ») ne s'écrivent
        // pas au tableau : les compter donnait une potence deux fois trop
        // haute, et les dessiner remplissait la page de zéros parasites.
        rangs = 1 + etapesEcrites(t).length * 2;
    }
    nCol = Math.max(2, nCol);

    // La colonne : assez large pour un chiffre lisible, jamais plus large que
    // ce que le bloc peut offrir. Sur la division, il faut la place du
    // diviseur à droite de la potence.
    // À droite de la potence, il faut la place du diviseur ET du quotient : un
    // quotient décimal est plus large que le diviseur, et débordait du bloc.
    const largeurDroite = op === '÷'
        ? Math.max(String(m.operandes[1]).length, enFrancais(t.quotient).length) + 1
        : 0;
    const colonnesTotales = op === '÷' ? nCol + largeurDroite : nCol + 1.2;
    // UNE RANGÉE EST PLUS HAUTE QU'UNE COLONNE N'EST LARGE — de 32 %, ligne
    // suivante. Le plafond en hauteur l'oubliait : à neuf rangées, il rendait
    // une potence 24 % trop haute, dont la barre verticale descendait dans le
    // bloc du dessous. Cela ne se voyait pas tant que les divisions tenaient en
    // peu d'étapes ; poursuivre au centième en ajoute deux, et le voilà.
    const cw = Math.max(3.2, Math.min(large / colonnesTotales, b.h / (1.32 * (rangs + 0.6)), 7));
    const rh = cw * 1.32;
    const hauteur = rangs * rh;
    // Centré verticalement dans le bloc : une addition à trois rangées et une
    // division à sept ne doivent pas flotter chacune à sa façon.
    const y0 = b.y + Math.max(0, (b.h - hauteur) / 2);
    // La grille des chiffres est calée à DROITE de sa zone, comme au cahier.
    const droite = op === '÷' ? x0 + nCol * cw : x0 + Math.min(large - 1, (nCol + 1.2) * cw);

    return {
        m, t, op, cw, rh, rangs, nCol, y0, x0, droite, gouttiere,
        numero: slot.numero,
        taille: Math.max(6, Math.min(cw * 2.1, 13)),
        /** L'abscisse du centre de la colonne d'indice `i` en partant de la droite. */
        colX: (i) => droite - (i + 0.5) * cw,
        ligneY: (r) => y0 + r * rh
    };
}

/** Les chiffres d'un nombre, du rang le plus faible au plus fort. */
const chiffresDroiteGauche = (v) => digitsDe(v).reverse();

/**
 * Ce qu'il y a à écrire dans une opération posée : une liste de
 * `{ x, y, texte, gras, creux }` en millimètres, plus les traits.
 *
 * Le même plan sert deux fois : l'aperçu le pose en HTML, le PDF l'écrit tel
 * quel. C'est la seule façon d'être sûr que les deux tombent au même endroit —
 * et sur une opération posée, un décalage d'un demi-millimètre entre deux
 * colonnes se voit tout de suite.
 */
function planPose(g, solution) {
    const { m, t, op, cw, rh } = g;
    const cases = [];
    const traits = [];
    const cercles = [];
    const pose = (col, rang, texte, o = {}) =>
        cases.push({ x: g.colX(col), y: g.ligneY(rang) + rh * 0.5, texte: String(texte), ...o });

    /**
     * UN NOMBRE POSÉ, virgule comprise.
     *
     * `col0` est la colonne du CHIFFRE DES UNITÉS. Les chiffres se rangent à
     * gauche, les décimales à droite, et la virgule se dessine sur la frontière
     * entre les deux — elle ne prend pas de colonne, comme sur un cahier où
     * elle tombe entre deux carreaux.
     */
    const poserNombre = (valeur, col0, rang, o = {}) => {
        const d = decimalesPose(valeur);
        chiffresDroiteGauche(valeur).forEach((c, i) => pose(i + col0 - d, rang, c, o));
        if (!d) return;
        cases.push({
            // LA FRONTIÈRE : le bord droit de la colonne des unités, c'est-à-
            // dire entre les unités et les dixièmes. Posée un peu bas, comme
            // on l'écrit.
            // Même ligne de base que les chiffres : une virgule descend
            // d'elle-même sous cette ligne, c'est sa forme qui la place.
            x: g.droite - col0 * cw, y: g.ligneY(rang) + rh * 0.5,
            texte: ',', virgule: true, ...o
        });
    };

    if (op === '+' || op === '-') {
        // LES CHIFFRES SE RANGENT PAR RANG, et c'est toute la leçon de
        // l'addition décimale : on aligne sur la VIRGULE, pas sur le bord
        // droit. Découper la chaîne « 12.5 » alignait sur le bord droit et
        // posait un point dans une colonne — la faute qu'on corrige toute
        // l'année, imprimée sur la feuille.
        const bas = t.colonnes[0].rang;      // le rang le plus faible écrit
        const col0 = -bas;                   // la colonne des unités
        m.operandes.forEach((v, i) => poserNombre(v, col0, 1 + i));
        // Le signe, à gauche du dernier opérande.
        pose(g.nCol, m.operandes.length, op === '+' ? '+' : '−', { signe: true });
        const yTrait = g.ligneY(m.operandes.length + 1) - rh * 0.12;
        traits.push({ x1: g.colX(g.nCol - 0.2), x2: g.droite, y: yTrait, epais: true });
        // PAS DE RONDS DE RETENUE SUR LA FEUILLE. Rémy : « pour le pdf, ne
        // mets pas le rond des retenues », « ne mets pas les cercles ».
        //
        // À l'écran ils ont un rôle : ils se cliquent, ils comptent dans la
        // correction, et ils obligent à ÉCRIRE la retenue au lieu de la
        // penser. Sur le papier, ils ne font qu'imposer une façon d'écrire —
        // et pas celle du cahier, où la retenue se glisse où l'on veut, au
        // crayon, petite. Un rond imprimé dit à l'élève « pose-la ICI », ce
        // que le professeur ne demande pas. La place, elle, reste : la rangée
        // du haut est comptée dans la hauteur du bloc.
        if (solution) poserNombre(t.resultat, col0, m.operandes.length + 1, { reponse: true });
        return { cases, traits, cercles };
    }

    if (op === '×') {
        // LA MULTIPLICATION DÉCIMALE NE S'ALIGNE PAS SUR LA VIRGULE, et c'est
        // sa difficulté propre : on écrit les facteurs calés à droite, on
        // multiplie comme si de rien n'était, et l'on place la virgule à la
        // fin en comptant les décimales des deux facteurs. Chaque facteur
        // porte donc SA virgule à SA place, sans rapport avec celle de l'autre.
        const [a, b] = m.operandes;
        poserNombre(a, decimalesPose(a), 1);
        poserNombre(b, decimalesPose(b), 2);
        pose(g.nCol, 2, '×', { signe: true });
        traits.push({ x1: g.colX(g.nCol - 0.2), x2: g.droite, y: g.ligneY(3) - rh * 0.12, epais: true });
        t.lignes.forEach((l, i) => {
            if (!solution) return;
            // LES PRODUITS PARTIELS SONT DES ENTIERS, sans virgule : c'est la
            // règle du chapitre, et en poser une ici la contredirait.
            const valeur = l.chiffre * t.entiers[0];
            chiffresDroiteGauche(valeur).forEach((d, c) => pose(c + l.decalage, 3 + i, d, { reponse: true }));
        });
        if (t.sommeAPoser) {
            const yT = g.ligneY(3 + t.lignes.length) - rh * 0.12;
            traits.push({ x1: g.colX(g.nCol - 0.2), x2: g.droite, y: yT, epais: true });
            pose(g.nCol, 3 + t.lignes.length - 1, '+', { signe: true });
            if (solution) {
                // Le produit, LUI, porte la virgule — au rang que donnent les
                // décimales des deux facteurs réunies.
                poserNombre(t.resultat, t.decimales, 3 + t.lignes.length, { reponse: true });
            }
        }
        // PAS DE RONDS DE RETENUE SUR L'ADDITION FINALE : Rémy, « ne mets pas
        // les petits ronds de retenue pour l'addition finale ». Ils sont déjà
        // portés par chaque produit partiel, et les répéter en bas donne un
        // fouillis de bulles qu'on ne relie plus à rien.
        return { cases, traits, cercles };
    }

    // LA POTENCE. Le dividende à gauche, la barre verticale, le diviseur à
    // droite, le trait sous le diviseur, et le quotient dessous.
    const [dividende, diviseur] = m.operandes;
    // Le rang le plus faible ÉCRIT — celui du dividende, ou plus bas encore si
    // l'on poursuit la division. C'est lui qui cale toute la potence, y compris
    // les soustractions successives.
    const col0Div = basPotence(m, t) + 1;    // la colonne des unités du dividende
    poserNombre(dividende, col0Div, 0);
    const xBarre = g.droite + cw * 0.1;
    traits.push({ x1: xBarre, x2: xBarre, y: g.ligneY(0) + rh * 0.1, y2: g.ligneY(g.rangs) - rh * 0.2, vertical: true });
    /**
     * À DROITE DE LA BARRE, ON ÉCRIT DE GAUCHE À DROITE — et une virgule n'y
     * vaut pas une pleine colonne : « 14,71 » écrit en cinq cases laisse un
     * trou au milieu du quotient.
     */
    const ecrireADroite = (texte, rang, o = {}) => {
        let x = xBarre + cw * 0.6;
        for (const c of texte) {
            const large = c === ',' ? cw * 0.42 : cw;
            cases.push({ x: x + large / 2, y: g.ligneY(rang) + rh * 0.5, texte: c, ...o });
            x += large;
        }
        return x - xBarre;
    };
    const largeurDiv = ecrireADroite(String(diviseur), 0) / cw;
    traits.push({
        x1: xBarre, x2: xBarre + (largeurDiv + 0.4) * cw,
        y: g.ligneY(1) - rh * 0.12, epais: true
    });
    if (solution) ecrireADroite(enFrancais(t.quotient), 1, { reponse: true });
    // LES SOUSTRACTIONS SUCCESSIVES, étape par étape — c'est ce que Rémy
    // demandait : « il faut la soustraction étape par étape ».
    //
    // L'ALIGNEMENT SUIT LE RANG, et c'est toute la méthode : le chiffre du
    // quotient obtenu en abaissant le chiffre de rang r se pose au rang r, et
    // le produit qu'on soustrait se termine sur cette même colonne. Aligner
    // sur le numéro de l'étape — ce que je faisais — décalait tout dès qu'une
    // étape muette passait devant.
    if (solution) {
        let rang = 1;
        for (const e of etapesEcrites(t)) {
            // La colonne du rang e.rang. Le dividende est posé avec ses unités
            // en `col0Div` : le produit s'aligne sur la même règle, sinon une
            // division à virgule décale ses soustractions d'un cran.
            const col0 = col0Div + e.rang;
            chiffresDroiteGauche(e.produit).forEach((d, c) => {
                cases.push({ x: g.colX(c + col0), y: g.ligneY(rang) + rh * 0.5, texte: d, reponse: true });
            });
            const largeurBloc = Math.max(String(e.produit).length, String(e.reste).length);
            traits.push({
                x1: g.colX(col0 + largeurBloc - 0.5),
                x2: g.colX(col0 - 0.5), y: g.ligneY(rang + 1) - rh * 0.12
            });
            chiffresDroiteGauche(e.reste).forEach((d, c) => {
                cases.push({ x: g.colX(c + col0), y: g.ligneY(rang + 1) + rh * 0.5, texte: d, reponse: true });
            });
            rang += 2;
        }
    }
    return { cases, traits, cercles };
}

function posePreviewHtml(item, slot, k, solution) {
    const g = geoPose(item, slot);
    const plan = planPose(g, solution);
    let html = '';
    if (g.numero != null) {
        html += `<div style="position:absolute; left:${slot.boite.x * k}px; top:${g.y0 * k}px;
            width:${(g.gouttiere - 1) * k}px; height:${g.rh * k}px; display:flex;
            align-items:center; font-weight:800; color:#6e7684;
            font-size:${g.taille * 0.34 * k}px">${g.numero}.</div>`;
    }
    for (const t of plan.traits) {
        if (t.vertical) {
            html += `<div style="position:absolute; left:${t.x1 * k}px; top:${t.y * k}px;
                width:${Math.max(1, 0.5 * k)}px; height:${(t.y2 - t.y) * k}px;
                background:#1a202c"></div>`;
        } else {
            html += `<div style="position:absolute; left:${t.x1 * k}px; top:${t.y * k}px;
                width:${(t.x2 - t.x1) * k}px; height:${Math.max(1, (t.epais ? 0.5 : 0.35) * k)}px;
                background:#1a202c"></div>`;
        }
    }
    for (const c of plan.cercles) {
        html += `<div style="position:absolute; left:${(c.x - c.r) * k}px; top:${(c.y - c.r) * k}px;
            width:${c.r * 2 * k}px; height:${c.r * 2 * k}px; border-radius:50%;
            border:1px dashed #9aa3b2; display:flex; align-items:center; justify-content:center;
            font-size:${g.taille * 0.22 * k}px; color:#6e7684; font-weight:700">${echapperSheet(c.texte)}</div>`;
    }
    for (const c of plan.cases) {
        html += `<div style="position:absolute; left:${(c.x - g.cw / 2) * k}px;
            top:${(c.y - g.rh / 2) * k}px; width:${g.cw * k}px; height:${g.rh * k}px;
            display:flex; align-items:center; justify-content:center;
            font-size:${g.taille * 0.3528 * k}px; font-weight:${c.signe ? 700 : 800};
            color:${c.reponse ? '#6e7684' : '#1a202c'}">${echapperSheet(c.texte)}</div>`;
    }
    return html;
}

function dessinerPosePdf(doc, item, slot, solution) {
    const g = geoPose(item, slot);
    const plan = planPose(g, solution);
    if (g.numero != null) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(g.taille * 0.9);
        doc.setTextColor(...ENCRE.gris);
        doc.text(`${g.numero}.`, slot.boite.x, g.y0 + g.rh * 0.7);
    }
    doc.setDrawColor(...ENCRE.trait);
    for (const t of plan.traits) {
        doc.setLineWidth(t.epais ? 0.5 : 0.32);
        if (t.vertical) doc.line(t.x1, t.y, t.x1, t.y2);
        else doc.line(t.x1, t.y, t.x2, t.y);
    }
    // Les ronds de retenue : en POINTILLÉ, pour qu'on voie qu'ils sont à
    // remplir et non déjà écrits.
    doc.setDrawColor(...ENCRE.grille);
    doc.setLineWidth(0.25);
    doc.setLineDashPattern([0.6, 0.7], 0);
    for (const c of plan.cercles) doc.circle(c.x, c.y, c.r, 'S');
    doc.setLineDashPattern([], 0);
    doc.setFont('helvetica', 'bold');
    for (const c of plan.cercles) {
        if (!c.texte) continue;
        doc.setFontSize(g.taille * 0.62);
        doc.setTextColor(...ENCRE.gris);
        doc.text(c.texte, c.x, c.y + g.taille * 0.2, { align: 'center' });
    }
    for (const c of plan.cases) {
        doc.setFontSize(g.taille);
        doc.setTextColor(...(c.reponse ? ENCRE.gris : ENCRE.trait));
        doc.setFont('helvetica', c.signe ? 'normal' : 'bold');
        // LA LIGNE DE BASE, PAS UNE APPROXIMATION. `c.y` est le MILIEU de la
        // rangée ; pour y centrer un chiffre il faut descendre d'une
        // demi-hauteur de capitale — 0,717 em en Helvetica, et un point vaut
        // 0,3528 mm. On descendait de `taille × 0,35`, presque trois fois
        // trop : les chiffres tombaient dans la rangée du dessous, et le trait
        // de la soustraction leur passait au travers comme une rature. Cela ne
        // se voyait qu'à la lecture du PDF — l'aperçu, lui, centrait juste.
        doc.text(pourPdf(c.texte), c.x, c.y + g.taille * 0.1265, { align: 'center' });
    }
    doc.setTextColor(...ENCRE.trait);
}

// --- LE TABLEAU DE CONVERSION, SUR LE PAPIER ------------------------------------

/**
 * La géométrie d'un tableau de conversion : les colonnes d'unités, une ligne
 * par conversion, et l'énoncé de chacune écrit à gauche de sa ligne.
 */
function geoConversion(item, slot) {
    const m = item.meta;
    const b = slot.boite;
    const nCol = m.unites.length;
    const nLignes = m.conversions.length;
    // L'énoncé « 505 mm = ……… m » à gauche, le tableau à droite. L'énoncé
    // prend le tiers : moins, il passe à la ligne et le tableau se décale.
    // « 505,4 mm = ……… dam » : il faut la place de l'écrire d'un trait, sinon
    // l'énoncé passe à la ligne et le tableau se décale d'une conversion à
    // l'autre.
    // LA COLONNE DE L'ÉNONCÉ PORTE AUSSI LA RÉPONSE : « 1,3 km = …… m » —
    // c'est sur ces pointillés-là qu'on écrit, et ils étaient trop courts pour
    // un nombre à virgule. Rémy : « mets un peu plus de pointillés pour noter
    // la réponse ». La colonne s'élargit d'autant : allonger les points sans
    // élargir la colonne les aurait simplement coupés.
    // SANS TABLEAU, l'énoncé prend toute la largeur : c'est l'exercice une fois
    // le tableau su, et il ne reste que les conversions à écrire.
    const avecTableau = m.tableau !== false;
    // LE TABLEAU PASSE AVANT L'ÉNONCÉ — et c'était l'inverse.
    //
    // Rémy : « pour le tableau de conversion, le tableau est tellement
    // compressé, horrible ». Il l'était, et cela se calculait : trois blocs de
    // front font 62 mm chacun, l'énoncé en prenait 40 par plancher, et les SEPT
    // colonnes se partageaient les 20 restants — DEUX MILLIMÈTRES NEUF par
    // colonne. Les en-têtes se touchaient au point de former un seul mot,
    // « kmhndanmdmcmmm », et l'on ne pouvait rien écrire dedans.
    //
    // La colonne de l'énoncé ne prend donc plus que ce qui RESTE après avoir
    // servi le tableau. Une case de conversion doit accueillir un chiffre écrit
    // à la main : six millimètres est le minimum vital, onze le confort — et
    // c'est ce plancher, pas une proportion, qui décide du partage.
    const MIN_CASE = 6, MAX_CASE = 11;
    const enonceIdeal = Math.min(Math.max(b.w * 0.34, 40), 56);
    const enonceW = avecTableau
        // Ce qu'il faudrait laisser au tableau pour que ses cases soient
        // lisibles ; si l'énoncé le lui prend, on le lui reprend.
        ? Math.max(26, Math.min(enonceIdeal, b.w - 2 - nCol * MIN_CASE))
        : b.w;
    const cw = avecTableau
        ? Math.min((b.w - enonceW - 2) / nCol, MAX_CASE)
        : 0;
    // Une rangée d'en-tête, puis une par conversion. Une case de tableau de
    // conversion doit accueillir un chiffre écrit à la main : sept
    // millimètres, c'est l'interligne d'un cahier.
    // SANS TABLEAU, LES CONVERSIONS SE METTENT EN COLONNES.
    //
    // Rémy : « permet plusieurs colonnes pour la conversion, regarde l'espace
    // vide. » Il envoyait la capture d'une feuille où huit conversions
    // descendaient en une seule colonne — « 0,11 dm = ……… mm » fait quatre
    // centimètres — et où les deux tiers droits de la page restaient blancs.
    //
    // Avec le tableau, la question ne se pose pas : le tableau EST large, et
    // la conversion doit être à sa hauteur, sur la même ligne. Sans lui, il ne
    // reste qu'une ligne de texte, et rien n'oblige à n'en mettre qu'une par
    // rangée. On en met donc autant que la largeur en porte — quarante
    // millimètres chacune, la place d'écrire l'énoncé et sa réponse.
    // CINQUANTE-DEUX MILLIMÈTRES, ET NON QUARANTE. Mesuré : à quarante, la
    // page en tenait trois par bloc, mais « 659 dam = ……… dm » s'y coupait
    // après le « d » — on lisait « dr ». Une conversion doit tenir ENTIÈRE,
    // unité comprise : c'est elle, la réponse.
    const LARGEUR_CONVERSION = 52;
    // ET LE MOINS DE COLONNES QUI TIENNE, PAS LE PLUS.
    //
    // Rémy : « pour le tableau de conversion, quand on ne met pas le tableau,
    // c'est tout petit, tout moche et il y a beaucoup d'espaces libres. »
    // MESURÉ sur une feuille sans tableau : huit conversions en deux colonnes
    // occupaient quatre rangées de 9,5 mm — TRENTE-HUIT millimètres sur une
    // page qui en offre deux cents. Le reste était blanc.
    //
    // Empiler en colonnes remplit la LARGEUR ; ce qui restait vide, c'est la
    // HAUTEUR. On prend donc le plus petit nombre de colonnes qui tienne —
    // donc le plus de rangées, donc les lignes les plus hautes — et l'on
    // laisse ensuite la rangée s'étirer. Une conversion s'écrit alors sur une
    // ligne franche, comme sur un cahier, au lieu d'un timbre-poste.
    const colonnesQuiTiennent = Math.max(1, Math.min(4, Math.floor(b.w / LARGEUR_CONVERSION)));
    // DEUX PAR LIGNE, ET C'EST LUI QUI TRANCHE.
    //
    // Rémy : « quand on n'a pas le tableau, ça laisse de l'espace, on pourrait
    // en profiter pour avoir deux conversions par ligne. » La règle d'avant
    // prenait le PLUS PETIT nombre de colonnes qui tienne — donc une seule dès
    // que la hauteur suffisait, ce qui est le cas ordinaire — au motif que
    // c'était la hauteur qui restait blanche. Mais une colonne unique laisse
    // les deux tiers de la LARGEUR vides, et il regarde la feuille : ce vide-là
    // se voit davantage. Deux, donc, dès que deux tiennent.
    const RH_MINI = 7;
    let colonnes = 1;
    if (!avecTableau) {
        colonnes = Math.min(colonnesQuiTiennent, 2);
        // Et davantage seulement si la hauteur ne prend pas les rangées qu'il
        // faudrait : une conversion écrite à la main veut sept millimètres.
        while (colonnes < colonnesQuiTiennent
            && Math.ceil(nLignes / colonnes) * RH_MINI > b.h - 2) colonnes++;
    }
    const parColonne = Math.ceil(nLignes / colonnes);
    // Sans tableau, la rangée a le droit de respirer : seize millimètres, la
    // hauteur d'une ligne de cahier bien aérée, au lieu des neuf et demi que
    // le tableau impose à sa voisine.
    const rhMax = avecTableau ? 9.5 : 16;
    const rh = Math.max(6.5, Math.min((b.h - 2) / (parColonne + (avecTableau ? 1.2 : 0.2)), rhMax));
    const x0 = b.x + enonceW;
    const y0 = b.y + 1;
    const taille = Math.max(7.5, Math.min(rh * 1.15, avecTableau ? 12 : 14));
    // L'ÉNONCÉ NE DÉBORDE PAS SUR LE TABLEAU. Ses points de suspension sont des
    // caractères PLEINE CHASSE — huit d'entre eux valent huit lettres larges —,
    // et « 248 dam = ……………… km » venait s'écrire par-dessus la première colonne
    // dès qu'on a resserré le tableau. On mesure la pire ligne et l'on ajuste.
    const largeurEm = (t) => [...String(t)].reduce(
        (s, ch) => s + (ch === '…' ? 1 : (/[\s.,]/.test(ch) ? 0.3 : 0.56)), 0);
    const pire = Math.max(1, ...m.conversions.map(c => largeurEm(c.enonce)));
    return {
        m, b, nCol, nLignes, cw, rh, x0, y0, enonceW, avecTableau, taille,
        colonnes, parColonne,
        // Où tombe la conversion de rang `r` : une seule colonne avec le
        // tableau, plusieurs sans lui. Les deux rendus — l'aperçu et le PDF —
        // passent par ici, donc ils ne peuvent pas se désaccorder.
        // SANS TABLEAU, PAS DE RANGÉE D'EN-TÊTE À SAUTER. Le « r + 1 » réserve
        // la ligne des unités, en haut du tableau ; quand il n'y a pas de
        // tableau, il ne réserve qu'un trou — c'est le blanc que Rémy voyait
        // au-dessus de la première conversion.
        placeDe: (r) => (colonnes <= 1
            ? { x: b.x, y: y0 + (r + (avecTableau ? 1 : 0)) * rh, w: enonceW - 2 }
            : {
                x: b.x + Math.floor(r / parColonne) * (b.w / colonnes),
                y: y0 + (r % parColonne) * rh,
                w: b.w / colonnes - 2
            }),
        largeur: nCol * cw,
        // En POINTS, comme tout ce qui va dans le PDF ; l'aperçu convertit.
        //
        // LE CORPS SE CALCULE SUR LA COLONNE QUI PORTE LE TEXTE, et non sur le
        // bloc entier : sans tableau, le bloc en contient plusieurs, et un
        // corps calculé sur toute sa largeur débordait de chacune.
        tailleEnonce: Math.max(5, Math.min(taille * 0.92,
            ((avecTableau ? enonceW : b.w / colonnes) - 3) / 0.3528 / pire)),
        // « dam » est le plus large des en-têtes : c'est lui qui fixe leur
        // corps, sans quoi il déborde de sa case dès qu'on resserre le tableau.
        tailleEntete: Math.max(5, Math.min(rh * 1.15, 12, (cw - 0.8) / 0.6))
    };
}

/**
 * LA COULEUR D'UNE COLONNE DE RANG.
 *
 * Rémy : « comment est-ce que le mode couleur intense pourrait être pertinent,
 * car pour l'instant il n'y a pas grand-chose ? » Voici de quoi lui donner du
 * travail : dans un tableau de conversion, la colonne EST l'information. C'est
 * elle qu'on cherche, elle qu'on compte, elle qu'on rate — et c'est ainsi que
 * sont peintes toutes les affiches de classe.
 *
 * TROIS TEINTES, PAS SEPT. Une couleur par unité donnerait un arc-en-ciel où
 * l'on ne repère plus rien. Ce qui compte, c'est le RANG dans le groupe de
 * trois : l'unité principale (km, m, mm), puis ses deux subdivisions. On teinte
 * donc par position modulo trois, et l'unité de base de chaque groupe est la
 * plus soutenue — c'est elle qu'on cherche des yeux.
 *
 * En noir et blanc, le filtre les ramène à trois gris très clairs qui alternent :
 * l'information survit, en plus discret. Rien à faire de plus.
 */
const TEINTES_RANG = ['#dbeafe', '#eef2f7', '#f7f9fc'];

function conversionPreviewHtml(item, slot, k, solution) {
    const g = geoConversion(item, slot);
    const m = g.m;
    let html = '';
    if (g.avecTableau) {
        // LES COLONNES TEINTÉES, SOUS LE QUADRILLAGE. Les aplats se posent en
        // premier : le trait passe par-dessus, sinon la teinte mange la grille.
        m.unites.forEach((u, c) => {
            html += `<div style="position:absolute; left:${(g.x0 + c * g.cw) * k}px;
                top:${g.y0 * k}px; width:${g.cw * k}px;
                height:${((g.nLignes + 1) * g.rh) * k}px;
                background:${TEINTES_RANG[c % 3]}"></div>`;
        });
        // Le quadrillage.
        for (let c = 0; c <= g.nCol; c++) {
            const x = g.x0 + c * g.cw;
            html += `<div style="position:absolute; left:${x * k}px; top:${g.y0 * k}px;
                width:1px; height:${((g.nLignes + 1) * g.rh) * k}px; background:#8d94a5"></div>`;
        }
        for (let r = 0; r <= g.nLignes + 1; r++) {
            const y = g.y0 + r * g.rh;
            html += `<div style="position:absolute; left:${g.x0 * k}px; top:${y * k}px;
                width:${g.largeur * k}px; height:${r === 1 ? 2 : 1}px;
                background:${r === 1 ? '#1a202c' : '#8d94a5'}"></div>`;
        }
        // Les en-têtes — donnés, ou à écrire.
        m.unites.forEach((u, c) => {
            const texte = (m.entetes || solution) ? u : '';
            html += `<div style="position:absolute; left:${(g.x0 + c * g.cw) * k}px; top:${g.y0 * k}px;
                width:${g.cw * k}px; height:${g.rh * k}px; display:flex; align-items:center;
                justify-content:center; font-weight:800;
                color:${m.entetes ? '#1a202c' : '#6e7684'};
                font-size:${g.tailleEntete * 0.3528 * k}px">${echapperSheet(texte)}</div>`;
        });
    }
    // Les énoncés — et, sur la page des solutions, l'égalité complète PLUS le
    // tableau rempli : c'est le placement des chiffres qui est la leçon, et
    // un corrigé qui donne « 1 300 m » sans dire où tombe le 1 n'explique rien.
    m.conversions.forEach((cv, r) => {
        const pl = g.placeDe(r);
        const y = pl.y;
        html += `<div style="position:absolute; left:${pl.x * k}px; top:${y * k}px;
            width:${pl.w * k}px; height:${g.rh * k}px; display:flex;
            align-items:center; font-size:${g.tailleEnonce * 0.3528 * k}px;
            color:#1a202c; white-space:nowrap; overflow:hidden"
            >${echapperSheet(solution ? cv.complet : cv.enonce)}</div>`;
        if (!solution || !g.avecTableau) return;
        (cv.cases || []).forEach(c => {
            html += `<div style="position:absolute; left:${(g.x0 + c.col * g.cw) * k}px;
                top:${y * k}px; width:${g.cw * k}px; height:${g.rh * k}px; display:flex;
                align-items:center; justify-content:center; font-weight:800; color:#6e7684;
                font-size:${g.taille * 0.3528 * k}px">${c.chiffre}</div>`;
        });
        // La virgule, juste après la colonne demandée.
        if (cv.virguleApres >= 0 && cv.virguleApres < g.nCol - 1) {
            html += `<div style="position:absolute;
                left:${(g.x0 + (cv.virguleApres + 1) * g.cw - g.cw * 0.14) * k}px;
                top:${(y + g.rh * 0.3) * k}px; width:${g.cw * 0.28 * k}px;
                height:${g.rh * 0.7 * k}px; display:flex; align-items:flex-end;
                justify-content:center; font-weight:900; color:#1a202c;
                font-size:${g.taille * 0.42 * k}px">,</div>`;
        }
    });
    return html;
}

function dessinerConversionPdf(doc, item, slot, solution) {
    const g = geoConversion(item, slot);
    const m = g.m;
    if (g.avecTableau) {
        // Les colonnes teintées d'abord, le trait par-dessus. `encre` les fait
        // passer par le mode polycopie : en noir et blanc elles deviennent trois
        // gris très clairs qui alternent, et l'information survit.
        const hex = (t) => [1, 3, 5].map(i => parseInt(t.slice(i, i + 2), 16));
        m.unites.forEach((u, c) => {
            doc.setFillColor(...encre(hex(TEINTES_RANG[c % 3])));
            doc.rect(g.x0 + c * g.cw, g.y0, g.cw, (g.nLignes + 1) * g.rh, 'F');
        });
        doc.setDrawColor(...ENCRE.grille);
        doc.setLineWidth(0.25);
        for (let c = 0; c <= g.nCol; c++) {
            const x = g.x0 + c * g.cw;
            doc.line(x, g.y0, x, g.y0 + (g.nLignes + 1) * g.rh);
        }
        for (let r = 0; r <= g.nLignes + 1; r++) {
            const y = g.y0 + r * g.rh;
            // Le trait sous les en-têtes est FRANC : c'est lui qui sépare les
            // unités du travail de l'élève.
            doc.setDrawColor(...(r === 1 ? ENCRE.trait : ENCRE.grille));
            doc.setLineWidth(r === 1 ? 0.5 : 0.25);
            doc.line(g.x0, y, g.x0 + g.largeur, y);
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(g.tailleEntete);
        m.unites.forEach((u, c) => {
            if (!m.entetes && !solution) return;
            doc.setTextColor(...(m.entetes ? ENCRE.trait : ENCRE.gris));
            doc.text(pourPdf(u), g.x0 + (c + 0.5) * g.cw, g.y0 + g.rh * 0.68, { align: 'center' });
        });
    }
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...ENCRE.trait);
    m.conversions.forEach((cv, r) => {
        const pl = g.placeDe(r);
        const y = pl.y;
        doc.setFontSize(g.tailleEnonce);
        doc.setTextColor(...ENCRE.trait);
        doc.text(pourPdf(solution ? cv.complet : cv.enonce), pl.x, y + g.rh * 0.68);
        if (!solution || !g.avecTableau) return;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...ENCRE.gris);
        doc.setFontSize(g.taille);
        (cv.cases || []).forEach(c => {
            doc.text(String(c.chiffre), g.x0 + (c.col + 0.5) * g.cw, y + g.rh * 0.68, { align: 'center' });
        });
        if (cv.virguleApres >= 0 && cv.virguleApres < g.nCol - 1) {
            doc.setTextColor(...ENCRE.trait);
            doc.setFontSize(g.taille * 1.3);
            doc.text(',', g.x0 + (cv.virguleApres + 1) * g.cw, y + g.rh * 0.78, { align: 'center' });
        }
        doc.setFont('helvetica', 'normal');
    });
    doc.setTextColor(...ENCRE.trait);
}

// --- LE COMPTE EST BON, SUR LE PAPIER -------------------------------------------

/**
 * Le but en gros, les six plaques en dessous, et des lignes vides pour
 * chercher. C'est exactement la feuille qu'on distribue en début d'heure.
 *
 * AUTANT DE LIGNES QUE LA SOLUTION EN DEMANDE, PLUS UNE. Une solution plus
 * longue que celle qui a servi à fabriquer le tirage est parfaitement
 * recevable ; une feuille qui n'en laisse pas la place dit le contraire.
 */
function geoCompte(item, slot) {
    const m = item.meta;
    const b = slot.boite;
    const nP = m.plaques.length;
    const plaqueW = Math.min((b.w - 2) / nP - 2, 15);
    const plaqueH = Math.min(plaqueW * 0.72, 10);
    const butH = Math.min(b.h * 0.2, 12);
    const y0 = b.y + 1;
    const yPlaques = y0 + butH + 1.5;
    const yLignes = yPlaques + plaqueH + 3;
    // Le même plafond que la cascade des priorités, et pour la même raison :
    // les lignes de recherche s'écartaient jusqu'à huit millimètres sur une
    // feuille à quatre tirages, et l'on cherchait dans le vide.
    const ligneH = Math.max(5.5, Math.min((b.y + b.h - yLignes - 1) / m.lignes, 7));
    return { m, b, nP, plaqueW, plaqueH, butH, y0, yPlaques, yLignes, ligneH,
        taille: Math.max(7, Math.min(plaqueW * 0.9, 12)) };
}

function comptePreviewHtml(item, slot, k, solution) {
    const g = geoCompte(item, slot);
    const m = g.m;
    let html = `<div style="position:absolute; left:${g.b.x * k}px; top:${g.y0 * k}px;
        width:${g.b.w * k}px; height:${g.butH * k}px; display:flex; align-items:center;
        justify-content:center; font-weight:900; color:#4c1d95;
        font-size:${g.butH * 0.78 * k}px">${m.but}</div>`;
    const largeurTotale = g.nP * g.plaqueW + (g.nP - 1) * 2;
    const xP = g.b.x + (g.b.w - largeurTotale) / 2;
    m.plaques.forEach((p, i) => {
        html += `<div style="position:absolute; left:${(xP + i * (g.plaqueW + 2)) * k}px;
            top:${g.yPlaques * k}px; width:${g.plaqueW * k}px; height:${g.plaqueH * k}px;
            border:1.5px solid #b45309; border-radius:${2 * k}px; background:#fef3c7;
            display:flex; align-items:center; justify-content:center; font-weight:900;
            color:#78350f; font-size:${g.taille * 0.3528 * k}px">${p}</div>`;
    });
    for (let i = 0; i < m.lignes; i++) {
        const y = g.yLignes + i * g.ligneH;
        const texte = solution ? (m.etapes[i] || '') : '';
        html += `<div style="position:absolute; left:${g.b.x * k}px;
            top:${(y + g.ligneH * 0.88) * k}px; width:${g.b.w * k}px; height:1px;
            background:#b0b6c5"></div>`;
        if (!texte) continue;
        html += `<div style="position:absolute; left:${g.b.x * k}px; top:${y * k}px;
            width:${g.b.w * k}px; height:${g.ligneH * k}px; display:flex; align-items:center;
            font-weight:700; color:#6e7684;
            font-size:${g.taille * 0.32 * k}px">${echapperSheet(texte)}</div>`;
    }
    return html;
}

function dessinerComptePdf(doc, item, slot, solution) {
    const g = geoCompte(item, slot);
    const m = g.m;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(g.butH * 2.2);
    doc.setTextColor(...ENCRE.trait);
    doc.text(String(m.but), g.b.x + g.b.w / 2, g.y0 + g.butH * 0.85, { align: 'center' });

    const largeurTotale = g.nP * g.plaqueW + (g.nP - 1) * 2;
    const xP = g.b.x + (g.b.w - largeurTotale) / 2;
    doc.setFontSize(g.taille);
    m.plaques.forEach((p, i) => {
        const x = xP + i * (g.plaqueW + 2);
        doc.setDrawColor(...ENCRE.trait);
        doc.setLineWidth(0.4);
        doc.roundedRect(x, g.yPlaques, g.plaqueW, g.plaqueH, 1.2, 1.2, 'S');
        doc.setTextColor(...ENCRE.trait);
        doc.text(String(p), x + g.plaqueW / 2, g.yPlaques + g.plaqueH * 0.68, { align: 'center' });
    });
    for (let i = 0; i < m.lignes; i++) {
        const y = g.yLignes + i * g.ligneH;
        doc.setDrawColor(...ENCRE.grille);
        doc.setLineWidth(0.22);
        doc.line(g.b.x, y + g.ligneH * 0.88, g.b.x + g.b.w, y + g.ligneH * 0.88);
        if (!solution || !m.etapes[i]) continue;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(g.taille * 0.9);
        doc.setTextColor(...ENCRE.gris);
        doc.text(pourPdf(m.etapes[i]), g.b.x + 1, y + g.ligneH * 0.72);
        doc.setFont('helvetica', 'bold');
    }
    doc.setTextColor(...ENCRE.trait);
}

/**
 * LES TRACÉS D'UN GLYPHE, LUS UNE FOIS ET RETENUS.
 *
 * `GLYPHES` (core/figures.js) porte, pour chaque valeur, un groupe SVG :
 * un « translate … scale » suivi d'un ou plusieurs chemins. Le navigateur sait
 * le lire ; le PDF, non. On en extrait donc ce dont jsPDF a besoin — le tracé,
 * sa transformation, son style — et on le garde : relire la même chaîne à
 * chaque hiéroglyphe imprimé, sur une feuille qui en compte cent, se paie.
 */
const TRACES_GLYPHES = new Map();

function tracesDuGlyphe(valeur) {
    if (TRACES_GLYPHES.has(valeur)) return TRACES_GLYPHES.get(valeur);
    const src = GLYPHES[valeur] || '';
    const tr = /translate\(([-\d.]+) ([-\d.]+)\) scale\(([\d.]+)\)/.exec(src);
    const tx = tr ? parseFloat(tr[1]) : 0;
    const ty = tr ? parseFloat(tr[2]) : 0;
    const k = tr ? parseFloat(tr[3]) : 1;
    const out = [];
    for (const m of src.matchAll(/<path\b([^>]*)\/>/g)) {
        const attrs = m[1];
        const d = (/\sd="([^"]+)"/.exec(attrs) || [])[1];
        if (!d) continue;
        const rempli = /fill="currentColor"/.test(attrs);
        const creux = /class="egy-creux"/.test(attrs);
        const trait = /stroke="currentColor"/.test(attrs);
        const ep = (/stroke-width="([\d.]+)"/.exec(attrs) || [])[1];
        // Un chemin sans remplissage NI trait ne dessine rien : on l'écarte
        // plutôt que d'appeler jsPDF avec un style vide, qui remplirait en noir.
        if (!rempli && !creux && !trait) continue;
        out.push({
            d, tx, ty, k, creux,
            style: (rempli || creux ? 'F' : '') + (trait ? 'D' : ''),
            epaisseur: ep ? parseFloat(ep) : 10
        });
    }
    TRACES_GLYPHES.set(valeur, out);
    return out;
}

// --- LES NOMBRES DES PHARAONS, SUR LE PAPIER ------------------------------------

/**
 * Un rang par ligne, du plus grand au plus petit — comme à l'écran.
 *
 * DEUX SENS. « Lire » imprime les glyphes et laisse une ligne pour le nombre ;
 * « écrire » imprime le nombre et laisse un cadre vide à remplir. Le second est
 * le plus instructif : c'est en CHOISISSANT les symboles qu'on découvre que
 * leur position ne compte pas.
 */
/** « 32100 » -> « 32 100 » : un nombre se lit par tranches de trois. */
function nombreEspace(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
}

// La part du bloc réservée au nombre et à son « = ». Assez large pour un
// million sans jamais manger la place où l'on dessine les glyphes.
//
// QUARANTE-DEUX POUR CENT, ET NON TRENTE. Rémy, sur l'aperçu de sa feuille :
// « écris les nombres plus gros ». MESURÉ : à trente pour cent d'un bloc de
// 86 mm, la colonne du nombre faisait 25,8 mm, et le corps qui s'en déduit —
// il doit loger « 1 000 000  = », douze signes — tombait à 3,4 mm, soit dix
// points. Or dans le sens « écrire », CE NOMBRE EST L'ÉNONCÉ : c'est la seule
// chose à lire du bloc, et le reste de la ligne n'est que des pointillés.
const LARGEUR_NOMBRE = 0.42;

function geoEgypte(item, slot, tous) {
    const m = item.meta;
    const b = slot.boite;
    // LES SYMBOLES S'ÉCRIVENT À LA SUITE, comme à l'écran : c'est le même
    // placement, calculé au même endroit (core/figures.js). Un rang par ligne
    // donnait au nombre l'allure d'un tableau de numération, et la feuille ne
    // disait pas la même chose que le jeu.
    let plan = placerGlyphes(m.symboles);
    const INTERLIGNE = 0.16;
    let hautCases = plan.lignes + (plan.lignes - 1) * INTERLIGNE;
    // La ligne de réponse, en bas, prend sa part de la hauteur.
    const hDispo = b.h - 8;
    // « ÉCRIS 32 100 EN HIÉROGLYPHES » : LE NOMBRE EST L'ÉNONCÉ, PAS LA
    // RÉPONSE. Il était écrit SOUS la ligne de réponse, au milieu, et la place
    // à remplir se trouvait au-dessus, muette : on croyait lire une correction.
    // Rémy : « des hiéroglyphes au nombre. Tu écris les hiéroglyphes : ……… ».
    // Le nombre passe donc devant, suivi d'un « = », et la place de dessiner
    // vient après lui, sur la même ligne — comme au cahier.
    // LES DEUX SENS S'ÉCRIVENT SUR UNE SEULE LIGNE. Rémy : « écris le nombre en
    // hiéroglyphes puis : puis les pointillés sur la même ligne, idem dans
    // l'autre sens. » Dans le sens « lire », les glyphes étaient posés en haut
    // du bloc et la ligne de réponse dessous : deux étages, alors que l'élève
    // écrit « ▯▯▯ = 132 » d'un trait sur son cahier. Les glyphes prennent
    // maintenant la colonne de gauche, le « = » les suit, et les pointillés
    // courent à leur droite — sur la MÊME ligne de base.
    const ecrire = m.sens === 'ecrire';
    // LE NOMBRE SEUL : le signe égal se pose à part, juste après lui.
    const texte = ecrire ? nombreEspace(m.total) : '';
    // UNE COLONNE DE MÊME LARGEUR POUR TOUS LES NOMBRES DE LA FEUILLE.
    //
    // Rémy : « la présentation des hiéroglyphes est curieuse ». Elle l'était :
    // la colonne se calculait sur la longueur de CE nombre-là, si bien que
    // « 404 » et « 30 103 » ne commençaient pas au même endroit, que les « = »
    // ne s'alignaient pas, et que les pointillés n'avaient pas deux fois la
    // même longueur. Une part fixe du bloc, et tout se met en colonne.
    // LA COLONNE DE GAUCHE. En « écrire », c'est le nombre suivi du « = ». En
    // « lire », ce sont les GLYPHES suivis du « = » : même géométrie, même
    // alignement d'un bloc à l'autre.
    // SOIXANTE-DOUZE POUR CENT AUX GLYPHES. « Utilise bien la largeur pour
    // écrire les hiéroglyphes assez grand » : c'est la LARGEUR qui les bride,
    // pas la hauteur — sept symboles dans la moitié d'un bloc donnent des
    // signes de six millimètres. Ce qui reste — un quart de bloc, soit deux
    // bons centimètres — suffit largement à écrire « 10 033 ».
    //
    // EN « LIRE », CE N'EST PLUS UNE PART DU BLOC MAIS LA LARGEUR DES SIGNES.
    // Rémy : « le = juste après les hiéroglyphes ». Une colonne fixe met le
    // signe égal au même endroit d'un bloc à l'autre — c'est joli en colonne,
    // et cela ouvre un blanc de deux centimètres derrière un nombre court. Ce
    // qu'on lit alors, ce n'est plus « ▯▯▯ = …… », c'est un dessin, puis du
    // vide, puis une équation. Le signe suit donc les glyphes ; ce qui reste à
    // droite est la ligne à remplir, et c'est ELLE qui a une longueur
    // minimale — pas la place du dessin.
    const PART_GLYPHES = 0.72;
    // LA LIGNE DE RÉPONSE PREND CE QU'IL LUI FAUT, PAS UN MILLIMÈTRE DE PLUS.
    //
    // Elle était fixée à 22 mm — la place d'« 1 000 000 », le plus long nombre
    // que l'exercice sache produire. Mais une feuille réglée « jusqu'à 10 000 »
    // n'écrit jamais que six signes, et les cinq millimètres de rien qu'on
    // gardait au bout étaient pris aux glyphes : ce sont eux que la LARGEUR
    // bride, et Rémy l'a déjà dit deux fois — « utilise bien la largeur »,
    // « trop petits les hiéroglyphes ».
    //
    // On mesure donc sur le plus long nombre DE CETTE FEUILLE, comme on le
    // fait déjà pour la taille des signes et pour le corps du nombre. Douze
    // millimètres au plancher : en dessous, on n'écrit plus, on coince.
    const CORPS_REPONSE = 4.2;
    const plusLongTotal = Math.max(...blocsVoisins(item, slot, tous)
        .map(it => nombreEspace((it.meta || {}).total ?? 0).length));
    const REPONSE_MIN = Math.max(12, plusLongTotal * CORPS_REPONSE * 0.55 + 3);
    const largeurTexte = b.w * (ecrire ? LARGEUR_NOMBRE : PART_GLYPHES);
    // Le corps est calculé sur le PLUS LONG nombre possible — « 1 000 000  = »,
    // douze signes — et non sur celui qu'on a sous la main : sinon un nombre
    // court s'écrirait plus gros que son voisin, et l'on retomberait dans le
    // dépareillé qu'on vient de corriger.
    // Le plafond monte avec la colonne : à 4,6 mm il bornait un corps que la
    // largeur ne bornait plus.
    const corpsTexte = ecrire
        ? Math.min(6.5, (largeurTexte - 2) / (12 * 0.58))
        : 0;
    // « UTILISE BIEN LA LARGEUR POUR ÉCRIRE LES HIÉROGLYPHES ASSEZ GRAND. »
    // En « lire », les glyphes disposent de leur colonne moins la place du
    // signe égal ; le plafond passe de seize à vingt millimètres, parce qu'ils
    // ne partagent plus la hauteur avec une ligne de réponse posée dessous.
    const LARGEUR_EGAL = 7;
    const largeurGlyphes = ecrire
        ? b.w - largeurTexte
        : b.w - 2 - LARGEUR_EGAL - REPONSE_MIN;
    // UN BÂTON A LA MÊME TAILLE PARTOUT SUR LA FEUILLE.
    //
    // Rémy : « il faut que les nombres de pharaons soient écrits à la même
    // taille de chaque caractère. »
    //
    // LA CASE SE CALCULAIT SUR CE NOMBRE-CI. Trois symboles remplissaient leur
    // colonne, neuf devaient s'y serrer — et le même bâton se retrouvait deux
    // fois plus petit d'un bloc à l'autre. L'élève à qui l'on demande de
    // COMPTER des signes se met alors à comparer des tailles qui ne veulent
    // rien dire.
    //
    // Le raisonnement était déjà écrit vingt lignes plus haut, pour le corps
    // du nombre : « calculé sur le PLUS LONG nombre possible, sinon un nombre
    // court s'écrirait plus gros que son voisin ». Il ne manquait qu'à
    // l'appliquer aux glyphes. La référence est le nombre le plus large DE
    // CETTE FEUILLE — pas un pire cas théorique à trente-six signes, qui
    // rapetisserait tout le monde pour un nombre qui n'y est pas.
    //
    // UN NOMBRE S'ÉCRIT SUR UNE SEULE LIGNE. Rémy : « il faut que les
    // hiéroglyphes soient sur la même ligne. »
    //
    // On repliait, et pour une bonne raison : à douze signes par ligne les
    // signes étaient bornés par la largeur, les deux tiers de la hauteur du
    // bloc restaient blancs, et Rémy avait dit « trop petits les
    // hiéroglyphes ». Replier à six doublait la case — mesuré, de 6,4 mm à
    // 10,9 sur une feuille de trois colonnes.
    //
    // MAIS UN NOMBRE REPLIÉ N'EST PLUS UN NOMBRE. « ⟩⟩ 𓍢𓍢𓍢𓍢 » sur une
    // ligne et « | | » sur la suivante, ce sont deux paquets de signes qu'il
    // faut additionner ensemble alors que la mise en page les sépare — et
    // c'est précisément le geste que l'exercice apprend. Le blanc gagné en
    // hauteur se payait en lisibilité.
    //
    // La vraie réponse à « trop petits » n'était pas le pli, c'était la
    // LARGEUR DU BLOC : le rendu dit déjà « jamais trois colonnes », et c'est
    // ce plafond-là qui garde les signes grands (voir `disposition.maxCols`).
    const items = blocsVoisins(item, slot, tous);
    const parLigne = Infinity;
    const plans = items.map(it => placerGlyphes((it.meta && it.meta.symboles) || [],
        { maxParLigne: parLigne }));
    const refL = Math.max(...plans.map(x => x.largeur));
    const refH = Math.max(...plans.map(x => x.lignes + (x.lignes - 1) * INTERLIGNE));
    const cell = Math.min(largeurGlyphes / (refL + 0.3), hDispo / (refH + 0.3), ecrire ? 16 : 20);
    plan = placerGlyphes(m.symboles, { maxParLigne: parLigne });
    // TOUS LES BLOCS DE LA FEUILLE PARTAGENT LEUR LIGNE DE BASE.
    //
    // Rémy, sur les nombres à écrire en hiéroglyphes : « pourquoi ce décalage ? »
    // La hauteur se calculait sur les glyphes de CE bloc-ci, si bien que deux
    // questions voisines n'avaient pas leurs pointillés à la même hauteur. Et
    // dans le sens « écrire », c'était absurde deux fois : rien n'y est dessiné,
    // et pourtant la place d'un dessin absent décalait le nombre.
    //
    // La hauteur est donc celle du PLUS HAUT de la feuille — la même pour tous,
    // comme le corps du nombre et la taille des signes le sont déjà.
    hautCases = refH;
    // La ligne de base : sous les glyphes en « lire », sous le nombre en
    // « écrire ». Dans les deux cas, TOUT est dessus.
    const hautGlyphes = hautCases * cell;
    const x0 = b.x + 1 + (ecrire ? largeurTexte : 0);   // en « écrire », rien n'y est dessiné
    // Le signe égal, puis la ligne à remplir : collés aux glyphes en « lire »,
    // à la colonne du nombre en « écrire ».
    //
    // LE NOMBRE EST CALÉ À GAUCHE, et le « = » le suit. Rémy : « mets le nombre
    // bien à gauche ». Il était calé à DROITE d'une colonne fixe, pour que les
    // signes égal tombent en colonne d'un bloc à l'autre — mais la colonne fait
    // quatre centimètres et « 13 » y flottait au milieu du bloc, précédé de
    // trois centimètres de rien. Le nombre commence donc au bord, comme sur un
    // cahier, et le « = » vient au bout de ce qu'on vient d'écrire — la même
    // règle que pour les hiéroglyphes de l'autre sens.
    const xEgal = ecrire
        ? b.x + 1 + largeurTrigo(texte, corpsTexte) + 1.5
        : x0 + plan.largeurDerniere * cell + 1.5;
    const xReponse = Math.min(xEgal + LARGEUR_EGAL, b.x + b.w - 12);
    return {
        m, b, plan, cell, interligne: INTERLIGNE, ecrire, texte, largeurTexte, corpsTexte,
        // Le signe égal a le corps de ce qu'il relie : celui du nombre quand
        // c'est un nombre qu'on écrit, une taille de lecture sinon.
        corpsEgal: ecrire ? corpsTexte : 4.4,
        largeurEgal: LARGEUR_EGAL, parLigne, xEgal, xReponse,
        rangs: plan.lignes, colonnes: plan.largeur, hautCases,
        x0,
        y0: b.y + 1,
        yReponse: b.y + 2 + hautGlyphes,
        // Les glyphes sont dessinés dans une case de 24 × 32.
        k: cell / 32
    };
}

function egyptePreviewHtml(item, slot, k, solution, _rang, tous) {
    const g = geoEgypte(item, slot, tous);
    const m = g.m;
    let html = '';
    if (m.sens === 'lire' || solution) {
        // L'APERÇU DESSINE CE QUE LE PDF DESSINE, au même endroit.
        //
        // Rémy : « l'exercice 7 est très mal présenté et mal aligné ». Il
        // l'était, et la faute revenait à ce bloc : il posait le SVG DE
        // L'ÉCRAN — qui porte douze pixels de marge sur chaque bord — dans une
        // boîte calculée par la géométrie du PDF, laquelle n'en a aucune. Les
        // deux cadres n'avaient donc ni la même taille ni les mêmes
        // proportions, et `meet` réduisait chaque nombre d'un facteur
        // DIFFÉRENT selon sa longueur. D'où les rangées qui ne commençaient
        // pas au même endroit et les signes deux fois plus gros d'une ligne à
        // l'autre.
        //
        // LA HAUTEUR OUBLIAIT AUSSI LES INTERLIGNES (`rangs` au lieu de
        // `hautCases`) : sur un nombre à deux rangées, le dessin était en plus
        // écrasé vers le haut de sa boîte, et le « = » se retrouvait à flotter
        // sous un dessin qui ne le touchait pas.
        html += `<div style="position:absolute; left:${g.x0 * k}px; top:${g.y0 * k}px;
            width:${(g.colonnes * g.cell) * k}px; height:${(g.hautCases * g.cell) * k}px;
            color:#1a202c">${egyptianSvgCadre(m.symboles.map(s => ({ value: s.value, n: s.n })),
        44, { maxParLigne: g.parLigne })
        .replace('<svg ', '<svg style="width:100%;height:100%" ')}</div>`;
    }
    // L'énoncé du sens « écrire » : le nombre, puis le signe d'égalité, à
    // hauteur des glyphes qu'il faudra tracer à côté.
    if (g.ecrire) {
        // LE NOMBRE S'ASSOIT SUR LA LIGNE, comme au cahier : « 1 400 = » puis
        // les pointillés, d'un seul tenant. Centré dans toute la hauteur du
        // bloc, il flottait un centimètre au-dessus de la ligne qu'il annonce,
        // et l'on ne lisait plus une phrase mais deux étages. Le rembourrage
        // du bas vaut la descente de la police : c'est ce qui pose la ligne
        // de base du texte exactement sur le trait.
        html += `<div style="position:absolute; left:${(g.b.x + 1) * k}px;
            top:${(g.yReponse - 8) * k}px; width:${(g.xEgal - g.b.x - 1) * k}px; height:${8 * k}px;
            display:flex; align-items:flex-end; justify-content:flex-start;
            padding-bottom:${g.corpsTexte * 0.21 * k}px; box-sizing:border-box;
            font-weight:800; color:#1a202c; font-size:${g.corpsTexte * k}px;
            white-space:nowrap">${echapperSheet(g.texte)}</div>`;
    }
    // LE SIGNE ÉGAL APRÈS LES GLYPHES. Sans lui, la ligne de pointillés posée à
    // droite d'un dessin ne dit pas ce qu'on attend ; avec, on lit « ▯▯▯ = … »
    // exactement comme on l'écrirait au cahier.
    {
        html += `<div style="position:absolute;
            left:${g.xEgal * k}px;
            top:${(g.yReponse - 8) * k}px; width:${g.largeurEgal * k}px; height:${8 * k}px;
            display:flex; align-items:flex-end; justify-content:center;
            padding-bottom:${g.corpsEgal * 0.21 * k}px; box-sizing:border-box;
            font-weight:800; color:#1a202c; font-size:${g.corpsEgal * k}px">=</div>`;
    }
    const bas = m.sens === 'lire' ? (solution ? nombreEspace(m.total) : '') : '';
    html += `<div style="position:absolute; left:${g.xReponse * k}px;
        top:${g.yReponse * k}px; width:${(g.b.x + g.b.w - g.xReponse) * k}px; height:${6 * k}px;
        display:flex; align-items:center; justify-content:flex-start;
        border-top:1px dotted #9aa3b2; font-weight:800;
        color:${solution ? '#6e7684' : '#1a202c'};
        font-size:${4.2 * k}px">${echapperSheet(bas)}</div>`;
    return html;
}

function dessinerEgyptePdf(doc, item, slot, solution, _c, _rang, tous) {
    const g = geoEgypte(item, slot, tous);
    const m = g.m;
    if (m.sens === 'lire' || solution) {
        g.plan.cases.forEach((c) => {
            const traces = tracesDuGlyphe(c.value);
            const x = g.x0 + c.col * g.cell;
            const y = g.y0 + c.ligne * (1 + g.interligne) * g.cell;
            for (const t of traces) {
                // Le tracé est écrit dans les coordonnées du dessin de Rémy ;
                // « translate » et « scale » du groupe le ramènent dans sa
                // case de 24 × 32, et g.k dans le bloc imprimé.
                const k = t.k * g.cell / 32;
                if (t.style.includes('F')) {
                    doc.setFillColor(...(t.creux ? [255, 255, 255] : ENCRE.trait));
                }
                if (t.style.includes('S')) {
                    doc.setDrawColor(...ENCRE.trait);
                    doc.setLineWidth(Math.max(0.18, (t.epaisseur || 10) * k));
                    doc.setLineJoin('round');
                }
                dessinerChemin(doc, t.d, {
                    x: x + t.tx * g.cell / 32,
                    y: y + t.ty * g.cell / 32,
                    k,
                    // La couleur à reprendre après avoir évidé un trou.
                    encre: t.creux ? [255, 255, 255] : ENCRE.trait
                }, t.style);
            }
        });
    }
    doc.setDrawColor(...ENCRE.grille);
    doc.setLineWidth(0.3);
    doc.line(g.xReponse, g.yReponse, g.b.x + g.b.w, g.yReponse);

    // LE SIGNE ÉGAL — QUE LE PDF NE TRAÇAIT PAS. L'aperçu le posait, la feuille
    // non : on relisait « ▯▯▯ ……… » là où l'écran avait promis « ▯▯▯ = ……… ».
    // Un aperçu qui ment fait imprimer deux fois.
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(g.corpsEgal / 0.3528);
    doc.setTextColor(...ENCRE.trait);
    doc.text('=', g.xEgal + g.largeurEgal / 2, g.yReponse, { align: 'center' });

    if (g.ecrire) {
        doc.setFont('helvetica', 'bold');
        // La MÊME taille qu'à l'aperçu : elle est donnée en millimètres.
        doc.setFontSize(g.corpsTexte / 0.3528);
        doc.setTextColor(...ENCRE.trait);
        // La même ligne de base qu'à l'aperçu : le trait.
        doc.text(pourPdf(g.texte), g.b.x + 1, g.yReponse, { align: 'left' });
    }

    const bas = m.sens === 'lire' ? (solution ? nombreEspace(m.total) : '') : '';
    if (!bas) return;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...(solution ? ENCRE.gris : ENCRE.trait));
    doc.text(pourPdf(bas), g.xReponse + 2, g.yReponse + 5, { align: 'left' });
    doc.setTextColor(...ENCRE.trait);
}

// --- L'AXE GRADUÉ, SUR LE PAPIER --------------------------------------------
//
// « Sur l'axe ci-dessus, écris l'abscisse du point » — et il n'y avait pas
// d'axe. L'exercice n'avait pas de rendu imprimé : sur la feuille, il sortait
// en questions de texte, et la question renvoyait à un dessin absent. Elle
// était donc, mot pour mot, impossible.
//
// Le dessin est le même que celui de l'écran (core/figures.js, `axeSvg`), mais
// refait ici en géométrie de page : la feuille travaille en millimètres et le
// PDF ne sait pas rendre un SVG.

/** Les décimales de la réponse, par échelle. */
const RANG_GRADUATION = { unites: 0, dixiemes: 1, centiemes: 2 };

function ecrireDecimal(v, rang) {
    return v.toFixed(rang).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '').replace('.', ',');
}

function geoGraduation(item, slot) {
    const m = item.meta || {};
    const rang = RANG_GRADUATION[m.zoom] ?? 1;
    // TOUT SE CALE SUR LA BOÎTE DU BLOC, jamais sur `slot.taille` : celle-ci
    // est le côté d'un emplacement CARRÉ, et un axe est large et bas. Mesurée
    // au carré, l'écriture sortait trois fois trop grosse et le trait de
    // réponse allait se poser sur l'axe suivant.
    const b = slot.boite || { x: slot.x, y: slot.y, w: slot.taille, h: slot.taille };
    const marge = b.w * 0.06;
    const x0 = b.x + marge;
    const larg = b.w - 2 * marge;
    const pas = larg / 10;
    const cran = Math.min(b.h * 0.15, pas * 0.65);
    // UN POINT, OU PLUSIEURS QUI ONT CHACUN LEUR LETTRE. La fiche en pose deux
    // ou trois par axe (voir `pointsPapier`) ; les parcours enregistrés et
    // l'écran n'en ont qu'un, sans lettre, et continuent de marcher.
    const points = (Array.isArray(m.points) && m.points.length)
        ? m.points
        : [{ lettre: '', crans: m.crans, valeur: m.valeur }];
    return {
        m, rang, x0, larg, pas, cran, boite: b, points,
        // L'axe en haut du bloc, les nombres dessous, la réponse tout en bas.
        yAxe: b.y + b.h * 0.30,
        yNombres: b.y + b.h * 0.30 + cran + Math.max(2.2, b.h * 0.16),
        yEcrit: b.y + b.h * 0.90,
        // La taille du texte est en POINTS : c'est l'unité du PDF, et l'aperçu
        // la convertit en millimètres (1 pt ≈ 0,3528 mm).
        pt: Math.max(6, Math.min(11, b.h * 0.42)),
        px: (i) => x0 + i * pas
    };
}

function graduationPreviewHtml(item, slot, k, solution) {
    const g = geoGraduation(item, slot);
    const m = g.m;
    let html = '';

    // L'axe, et la flèche : sans elle, c'est un trait, pas un axe.
    const bout = g.pas * 0.5;
    html += `<div style="position:absolute; left:${g.x0 * k}px; top:${g.yAxe * k}px;
        width:${(g.larg + bout) * k}px; height:${Math.max(1, 0.5 * k)}px; background:#1a202c"></div>`;
    html += `<svg style="position:absolute; left:0; top:0; width:100%; height:100%; overflow:visible">
        <path d="M ${((g.x0 + g.larg + bout) * k).toFixed(2)} ${(g.yAxe * k).toFixed(2)}
                 l ${(-g.cran * 0.55 * k).toFixed(2)} ${(-g.cran * 0.3 * k).toFixed(2)}
                 l 0 ${(g.cran * 0.6 * k).toFixed(2)} Z" fill="#1a202c"/></svg>`;

    // Onze traits : les dix intervalles, et les deux bouts plus longs.
    for (let i = 0; i <= 10; i++) {
        const grand = i === 0 || i === 10;
        const h = grand ? g.cran : g.cran * 0.5;
        html += `<div style="position:absolute; left:${g.px(i) * k}px;
            top:${(g.yAxe - h) * k}px; width:${Math.max(1, 0.45 * k)}px;
            height:${2 * h * k}px; background:#1a202c"></div>`;
    }

    // Seuls les deux bouts sont chiffrés : tout le reste EST la question.
    const police = g.pt * 0.3528 * k;
    [[0, m.debut], [10, m.fin]].forEach(([i, v]) => {
        html += `<div style="position:absolute; left:${(g.px(i) - g.pas) * k}px;
            top:${(g.yNombres - g.pt * 0.3528) * k}px; width:${2 * g.pas * k}px;
            text-align:center; font-size:${police}px; font-weight:700;
            color:#1a202c">${ecrireDecimal(v, g.rang)}</div>`;
    });

    // Les croix marquent les points : elles désignent le trait sans le
    // recouvrir, et chacune porte sa lettre au-dessus de l'axe.
    const r = g.cran * 0.5;
    let croix = '';
    g.points.forEach(p => {
        const xp = g.px(p.crans);
        croix += `<line x1="${((xp - r) * k).toFixed(2)}" y1="${((g.yAxe - r) * k).toFixed(2)}"
                  x2="${((xp + r) * k).toFixed(2)}" y2="${((g.yAxe + r) * k).toFixed(2)}"/>
            <line x1="${((xp - r) * k).toFixed(2)}" y1="${((g.yAxe + r) * k).toFixed(2)}"
                  x2="${((xp + r) * k).toFixed(2)}" y2="${((g.yAxe - r) * k).toFixed(2)}"/>`;
    });
    html += `<svg style="position:absolute; left:0; top:0; width:100%; height:100%; overflow:visible">
        <g stroke="#c0392b" stroke-width="${(0.55 * k).toFixed(2)}" stroke-linecap="round">
            ${croix}</g></svg>`;
    g.points.forEach(p => {
        if (!p.lettre) return;
        html += `<div style="position:absolute; left:${(g.px(p.crans) - g.pas / 2) * k}px;
            top:${(g.yAxe - g.cran - g.pt * 0.3528 * 1.15) * k}px; width:${g.pas * k}px;
            text-align:center; font-size:${police}px; font-weight:800;
            color:#c0392b">${echapperSheet(p.lettre)}</div>`;
    });

    // Où écrire la réponse : « A ( …… ) », une case par point, sous l'axe.
    // Rémy : « écris plutôt A(....) B(...) ». C'est la notation du cours, et
    // elle rattache chaque trait à sa lettre — « Abscisse : …… » ne pouvait
    // rien rattacher, puisqu'il n'y avait qu'un point.
    const xMot = g.boite.x + g.boite.w * 0.06;
    const large = (g.boite.w * 0.88) / g.points.length;
    g.points.forEach((p, i) => {
        const x = xMot + i * large;
        const etiq = p.lettre ? `${p.lettre} (` : 'Abscisse :';
        html += `<div style="position:absolute; left:${x * k}px;
            top:${(g.yEcrit - g.pt * 0.3528) * k}px; font-size:${police}px;
            font-weight:700; color:#1a202c; white-space:nowrap">${etiq}</div>`;
        const xTrait = x + g.pt * 0.3528 * (p.lettre ? 2.2 : 5.4);
        const lTrait = Math.max(8, large - g.pt * 0.3528 * (p.lettre ? 4.2 : 6.4));
        if (solution) {
            html += `<div style="position:absolute; left:${xTrait * k}px;
                top:${(g.yEcrit - g.pt * 0.3528) * k}px; font-size:${police}px;
                font-weight:800; color:#2f855a">${ecrireDecimal(p.valeur, g.rang)}</div>`;
        } else {
            html += `<div style="position:absolute; left:${xTrait * k}px; top:${g.yEcrit * k}px;
                width:${lTrait * k}px; height:0;
                border-top:${Math.max(1, 0.4 * k)}px dotted #a8b0bf"></div>`;
        }
        if (p.lettre) {
            html += `<div style="position:absolute; left:${(xTrait + lTrait + 0.6) * k}px;
                top:${(g.yEcrit - g.pt * 0.3528) * k}px; font-size:${police}px;
                font-weight:700; color:#1a202c">)</div>`;
        }
    });
    return html;
}

function dessinerGraduationPdf(doc, item, slot, solution) {
    const g = geoGraduation(item, slot);
    const m = g.m;
    const bout = g.pas * 0.5;

    doc.setDrawColor(...ENCRE.trait);
    doc.setLineWidth(0.5);
    doc.line(g.x0, g.yAxe, g.x0 + g.larg + bout, g.yAxe);
    doc.setFillColor(...ENCRE.trait);
    doc.triangle(g.x0 + g.larg + bout, g.yAxe,
        g.x0 + g.larg + bout - g.cran * 0.55, g.yAxe - g.cran * 0.3,
        g.x0 + g.larg + bout - g.cran * 0.55, g.yAxe + g.cran * 0.3, 'F');

    doc.setLineWidth(0.45);
    for (let i = 0; i <= 10; i++) {
        const h = (i === 0 || i === 10) ? g.cran : g.cran * 0.5;
        doc.line(g.px(i), g.yAxe - h, g.px(i), g.yAxe + h);
    }

    doc.setTextColor(...ENCRE.texte);
    doc.setFontSize(g.pt);
    doc.text(ecrireDecimal(m.debut, g.rang), g.px(0), g.yNombres, { align: 'center' });
    doc.text(ecrireDecimal(m.fin, g.rang), g.px(10), g.yNombres, { align: 'center' });

    // Les croix des points, à l'encre du trait : une photocopie ne garde pas la
    // couleur, et une croix rouge devenue grise doit rester la plus marquée.
    const r = g.cran * 0.55;
    doc.setLineWidth(0.7);
    g.points.forEach(p => {
        const xp = g.px(p.crans);
        doc.line(xp - r, g.yAxe - r, xp + r, g.yAxe + r);
        doc.line(xp - r, g.yAxe + r, xp + r, g.yAxe - r);
    });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(g.pt);
    doc.setTextColor(...ENCRE.trait);
    g.points.forEach(p => {
        if (!p.lettre) return;
        doc.text(p.lettre, g.px(p.crans), g.yAxe - g.cran - g.pt * 0.3528 * 0.35,
            { align: 'center' });
    });

    // « A ( …… ) », une case par point — voir l'aperçu.
    const xMot = g.boite.x + g.boite.w * 0.06;
    const large = (g.boite.w * 0.88) / g.points.length;
    doc.setFontSize(g.pt);
    g.points.forEach((p, i) => {
        const x = xMot + i * large;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...ENCRE.texte);
        doc.text(p.lettre ? `${p.lettre} (` : 'Abscisse :', x, g.yEcrit);
        const xTrait = x + g.pt * 0.3528 * (p.lettre ? 2.2 : 5.4);
        const lTrait = Math.max(8, large - g.pt * 0.3528 * (p.lettre ? 4.2 : 6.4));
        if (solution) {
            doc.setTextColor(...ENCRE.gris);
            doc.text(ecrireDecimal(p.valeur, g.rang), xTrait, g.yEcrit);
        } else {
            // `ENCRE.gris`, et non un `ENCRE.pointille` qui n'a jamais existé :
            // l'étalement d'une clef absente lève une TypeError, et c'est la
            // FEUILLE DE QUESTIONS qui passe par ici — celle qu'on imprime
            // toujours. Le corrigé, lui, prend l'autre branche et s'en tirait.
            doc.setDrawColor(...ENCRE.gris);
            doc.setLineWidth(0.35);
            doc.setLineDashPattern([0.8, 0.8], 0);
            doc.line(xTrait, g.yEcrit, xTrait + lTrait, g.yEcrit);
            doc.setLineDashPattern([], 0);
        }
        if (p.lettre) {
            doc.setTextColor(...ENCRE.texte);
            doc.text(')', xTrait + lTrait + 0.6, g.yEcrit);
        }
    });
}

export const RENDUS_NOMBRES = {
    pyramideNombres: {
        titre: 'La Pyramide des nombres',
        consigne: (items) => {
            const m = items && items[0] && items[0].meta;
            const commun = 'CHAQUE CASE EST LA SOMME DES DEUX DU DESSOUS. Complète la pyramide.';
            if (m && m.difficulte === 'addition') {
                return `${commun} Tout se remplit en montant : additionne les deux cases `
                    + 'du dessous, et recommence à l\'étage suivant.';
            }
            return `${commun} Attention, la règle se lit DANS LES DEUX SENS : vers le haut on `
                + 'additionne, vers le bas on SOUSTRAIT — si le dessus vaut 12 et l\'une des '
                + 'deux du dessous 7, l\'autre vaut 12 − 7. Cherche toujours un petit triangle '
                + 'où deux cases sur trois sont déjà remplies.';
        },
        previewGrille: pyramideNPreviewHtml,
        pdfGrille: dessinerPyramideNPdf,
        nomBloc: 'Pyramide', nomBlocs: 'pyramides',
        // Presque carrée : autant d'étages que de cases à la base, et les cases
        // sont une fois et demie plus larges que hautes.
        proportions: { w: 1, h: 0.72 },
        disposition: { cols: 3, rows: 3, maxCols: 4, maxRows: 4 },
        parLigneDefaut: 3
    },
    pyramide: {
        titre: 'La Pyramide des mots',
        consigne: () => 'À CHAQUE LIGNE, TU RAJOUTES UNE LETTRE pour faire un nouveau mot. '
            + 'Les lettres PEUVENT ÊTRE MÉLANGÉES : le mot du dessous reprend toutes celles '
            + 'du dessus, plus une, mais pas forcément dans le même ordre. La définition de '
            + 'gauche dit lequel. Commence toujours par le haut.',
        previewGrille: pyramidePreviewHtml,
        pdfGrille: dessinerPyramidePdf,
        nomBloc: 'Pyramide', nomBlocs: 'pyramides',
        // Large et basse : une colonne de définitions, un escalier de six
        // marches. Un bloc carré rendrait les cases minuscules pour rien.
        proportions: { w: 1, h: 0.62 },
        // QUATRE PAR PAGE, EN DEUX COLONNES. Rémy : « je prends les pyramides de
        // lettres, il y a tellement d'espace vide, par défaut on pourrait mettre
        // deux colonnes. » Il avait raison, et la cause est arithmétique : une
        // pyramide est large et basse (1 × 0,62), la page en paysage est large
        // et basse aussi (1 × 0,64) — DEUX pyramides sur cette page ne peuvent
        // pas la remplir, quelle que soit la façon de les poser. Côte à côte,
        // il reste la moitié de la hauteur ; l'une sur l'autre, la moitié de la
        // largeur. QUATRE, en deux colonnes et deux rangées, tombent juste.
        //
        // On garde l'idée de la revue — une pyramide commencée puis une vide,
        // l'exemple travaillé suivi de l'exercice —, mais deux fois : c'est
        // encore mieux, deux exemples valent mieux qu'un.
        disposition: { cols: 2, rows: 2, maxCols: 2, maxRows: 4 },
        parLigneDefaut: 2
    },
    cubes: {
        titre: 'Combien de cubes ?',
        consigne: (items) => {
            const q = items && items[0] && items[0].meta ? items[0].meta.question : 'total';
            // LA QUESTION EST LA MÊME POUR TOUTE LA FICHE — c'est un réglage, pas
            // un tirage —, donc elle se dit UNE FOIS en consigne. Répétée sous
            // chacun des douze dessins, elle mangeait la place du dessin.
            if (q === 'sol') {
                return 'COMBIEN DE CUBES TOUCHENT LE SOL dans chaque empilement ? Attention : '
                    + 'une pile de quatre cubes ne pose qu\'UN cube par terre. Ce qu\'on compte '
                    + 'ici, c\'est le nombre de cases occupées de la base — pas le volume.';
            }
            if (q === 'ajouter') {
                return 'COMBIEN DE CUBES FAUT-IL AJOUTER à chaque empilement pour obtenir un '
                    + 'PAVÉ PLEIN, celui qui le contient tout juste ? Compte d\'abord les cubes '
                    + 'du pavé plein — longueur × profondeur × hauteur —, puis retire ceux qui '
                    + 'sont déjà là.';
            }
            return 'COMPTE LES CUBES DE CHAQUE EMPILEMENT. Certains sont cachés derrière ou '
                + 'dessous : ils comptent aussi, et aucun ne flotte — sous chaque cube il y en '
                + 'a d\'autres jusqu\'au sol. Ne compte pas cube par cube mais COLONNE par '
                + 'colonne : chaque case du sol porte une pile, et il suffit d\'additionner '
                + 'les hauteurs.';
        },
        previewGrille: cubesPreviewHtml,
        pdfGrille: dessinerCubesPdf,
        nomBloc: 'Empilement', nomBlocs: 'empilements',
        // LE BLOC EST PLUS HAUT QUE LARGE, et c'est contre l'intuition : vu en
        // perspective, un empilement paraît s'étaler en largeur. Mesuré, il ne
        // le fait pas — la hauteur des piles s'ajoute au décalage des deux
        // directions, et le dessin sort autour de 0,9 de large pour 1 de haut.
        // Avec un bloc carré, un tiers de la largeur restait blanc de chaque
        // côté et le dessin rapetissait d'autant. Neuf empilements tiennent
        // encore sur une page.
        proportions: { w: 1, h: 1.08 },
        // DOUZE PAR PAGE, PAS NEUF. Un empilement est plus haut que large ; à
        // trois colonnes il ne grandissait pas pour autant — il restait limité
        // par la hauteur de la case — et l'on payait un tiers de la largeur en
        // blanc. Quatre colonnes donnent le MÊME dessin et trois exercices de
        // plus. Pour une version « affiche », il reste 3 × 2.
        disposition: { cols: 4, rows: 3, maxCols: 5, maxRows: 4 },
        parLigneDefaut: 4
    },
    graduation: {
        titre: 'La loupe sur la droite graduée',
        consigne: (items) => {
            const zooms = new Set(items.map(it => it.meta && it.meta.zoom));
            // LA CONSIGNE COMPTE LES POINTS QU'ELLE ANNONCE. Un axe en porte
            // maintenant deux ou trois, nommés ; « le point marqué d'une croix »
            // au singulier faisait chercher lequel.
            const commun = 'Chaque axe est coupé en DIX intervalles égaux. '
                + 'Compte les INTERVALLES depuis le trait de gauche — jamais les traits — '
                + 'et écris l\'abscisse de chaque point marqué d\'une croix, '
                + 'entre les parenthèses qui portent sa lettre.';
            return zooms.size > 1
                ? `${commun} Attention : l'échelle change d'un axe à l'autre.`
                : commun;
        },
        previewGrille: graduationPreviewHtml,
        pdfGrille: dessinerGraduationPdf,
        nomBloc: 'Axe', nomBlocs: 'axes',
        // Large et bas : un axe tient sur trois centimètres de haut, et lui en
        // donner huit laisserait la page à moitié blanche.
        proportions: { w: 1, h: 0.22 },
        // ET IL PREND TOUTE LA LARGEUR. Le plafond commun (78 mm) le centrait
        // sur la moitié de la page : plus l'axe est long, plus les intervalles
        // se distinguent — c'est exactement ce qu'on demande de compter.
        grilleMax: 170,
        disposition: { cols: 1, rows: 6, maxCols: 2, maxRows: 8 },
        parLigneDefaut: 1
    },
    egypte: {
        titre: 'Les nombres des pharaons',
        consigne: (items) => (items[0] && items[0].meta.sens === 'ecrire')
            ? 'Écris chaque nombre en hiéroglyphes. Bâton 1, anse 10, corde 100, lotus '
            + '1 000, doigt 10 000, têtard 100 000, dieu Heh 1 000 000. L\'ordre des '
            + 'symboles n\'a aucune importance : c\'est une numération ADDITIVE.'
            : 'Additionne la valeur des symboles. Bâton 1, anse 10, corde 100, lotus '
            + '1 000, doigt 10 000, têtard 100 000, dieu Heh 1 000 000. Attention : on '
            + 'ne compte pas les symboles, on additionne ce qu\'ils valent.',
        previewGrille: egyptePreviewHtml,
        pdfGrille: dessinerEgyptePdf,
        nomBloc: 'Nombre', nomBlocs: 'nombres',
        // UN NOMBRE TIENT SUR UNE LIGNE de symboles : le bloc n'a plus besoin
        // d'être carré. En hauteur, il ne lui faut que la ligne de glyphes et
        // la ligne de réponse — d'où huit nombres par page au lieu de six, et
        // des glyphes plus grands parce que le bloc est deux fois plus large.
        proportions: { w: 1, h: 0.34 },
        // L'ÉTIQUETTE SE MET AU-DESSUS DE CE QU'ELLE NOMME. Rémy : « l'exercice
        // 7 est très mal présenté ». « Nombre 5 » était centré sur toute la
        // largeur du bloc alors que les hiéroglyphes commencent à gauche : le
        // titre flottait au-dessus du blanc qui sépare le dessin des
        // pointillés, et ne désignait plus rien.
        titreAGauche: true,
        // SIX RANGÉES, PAS QUATRE. Un nombre en hiéroglyphes tient sur une
        // ligne de treize millimètres ; huit nombres laissaient la moitié
        // basse de la feuille blanche, avec des rangées écartées de trois
        // centimètres pour combler. Douze remplissent la page SANS rétrécir
        // les signes : ils sont bornés par la largeur du bloc, pas par sa
        // hauteur, et la largeur ne change pas.
        //
        // ET JAMAIS TROIS COLONNES. La grille en proposait jusqu'à trois, et
        // douze nombres s'y rangeaient d'eux-mêmes en 3 × 4 — au prix d'un
        // tiers de la taille des signes, qui sont bornés par la LARGEUR du
        // bloc. Or c'est exactement ce que Rémy demandait de ne pas faire :
        // « utilise bien la largeur pour écrire les hiéroglyphes assez grand ».
        // Deux colonnes de six, donc : la page se remplit et les signes ne
        // perdent pas un millimètre.
        disposition: { cols: 2, rows: 6, maxCols: 2, maxRows: 6 },
        parLigneDefaut: 2,
        grilleMax: 70
    },
    compte: {
        titre: 'Le compte est bon',
        consigne: () => 'Atteins le nombre écrit en haut avec les six plaques. Chaque '
            + 'plaque ne sert QU\'UNE FOIS, et le résultat d\'une opération peut '
            + 'resservir. Écris une opération par ligne. Aucun nombre négatif, et une '
            + 'division doit tomber juste. Il y a plusieurs solutions : la tienne compte '
            + 'si elle arrive au but.',
        previewGrille: comptePreviewHtml,
        pdfGrille: dessinerComptePdf,
        nomBloc: 'Tirage', nomBlocs: 'tirages',
        titreAGauche: true,
        proportions: { w: 1, h: 0.85 },
        disposition: { cols: 2, rows: 2, maxCols: 3, maxRows: 3 },
        parLigneDefaut: 2,
        separateurs: true,
        grilleMax: 90
    },
    conversion: {
        titre: 'Le tableau de conversion',
        consigne: (items) => {
            // SANS TABLEAU, la consigne ne parle plus d'un tableau absent : la
            // feuille demande alors la conversion toute seule, et c'est un
            // autre exercice — celui qu'on donne une fois le tableau su.
            if (items.every(i => i.meta && i.meta.tableau === false)) {
                return 'Effectue chaque conversion. Si tu as besoin du tableau, trace-le '
                    + 'au brouillon : sur cette feuille, il ne reste que les réponses à écrire.';
            }
            // COURTE. Rémy : « un énoncé trop long n'est jamais lu. » La version
            // longue tenait quatre lignes de corps 2 en tête de feuille, et
            // décrivait une méthode que le tableau montre déjà : l'élève écrit
            // son nombre dans la bonne colonne parce que les colonnes sont
            // nommées, pas parce qu'un paragraphe le lui a dit.
            const donnes = items.every(i => i.meta && i.meta.entetes);
            return donnes
                ? 'Pose chaque nombre dans le tableau, puis lis la réponse.'
                : 'Écris les unités en haut des colonnes — hecto vient avant déca —, '
                    + 'puis pose chaque nombre et lis la réponse.';
        },
        previewGrille: conversionPreviewHtml,
        pdfGrille: dessinerConversionPdf,
        nomBloc: 'Tableau', nomBlocs: 'tableaux',
        titreAGauche: true,
        // TROIS TABLEAUX DE FRONT. À quinze millimètres de case, il n'en tenait
        // qu'un par rangée et la moitié droite de la feuille restait blanche ;
        // les cases resserrées, trois passent — et chacun porte huit
        // conversions, ce qui fait une vraie séance sur une seule feuille.
        // LA HAUTEUR SUIT LE NOMBRE DE LIGNES. Rémy : « la présentation de
        // l'exercice de conversion est horrible. » Elle l'était en parcours :
        // une proportion fixe de 0,72 tenait pour quatre conversions et
        // écrasait les huit — les questions du tableau suivant s'écrivaient
        // alors par-dessus les dernières du précédent.
        //
        // Un tableau, c'est un en-tête plus N lignes ; sa hauteur en dépend
        // donc, et d'elles seules. Cinq millimètres par ligne, plus un
        // millimètre et demi de respiration : c'est ce qu'il faut pour écrire
        // un chiffre à la main dans une case.
        proportions: (items) => {
            const n = Math.max(1, ...(items || []).map(i => (i && i.meta && i.meta.lignes) || 8), 8);
            // SANS TABLEAU, LE BLOC EST DEUX FOIS MOINS HAUT. Les conversions y
            // tiennent en plusieurs colonnes (voir `geoConversion`), donc la
            // hauteur ne suit plus leur nombre mais celui d'une colonne. Le
            // bloc reste large — c'est cette largeur qui porte les colonnes —,
            // et deux blocs de front tiennent sur une page au lieu d'un.
            const sansTableau = (items || []).length
                && (items || []).every(i => i && i.meta && i.meta.tableau === false);
            if (sansTableau) return { w: 1, h: 0.09 * Math.ceil(n / 2) + 0.06 };
            return { w: 1, h: 0.09 * (n + 1) + 0.06 };
        },
        // DEUX DE FRONT, PLUS TROIS. Le commentaire d'origine disait vrai — à
        // quinze millimètres de case il n'en tenait qu'un par rangée et la
        // moitié droite restait blanche — mais la correction est allée trop
        // loin : à trois de front, il ne restait pas trois millimètres par
        // colonne. Deux blocs de 93 mm laissent au tableau de quoi être un
        // tableau, et la feuille porte encore seize conversions par rangée.
        disposition: { cols: 2, rows: 1, maxCols: 3, maxRows: 3 },
        parLigneDefaut: 2,
        separateurs: true,
        grilleMax: 300
    },
    pose: {
        titre: 'Poser et effectuer',
        consigne: (items) => {
            const noms = [...new Set(items.map(i => i.meta && i.meta.nom).filter(Boolean))];
            const quoi = noms.length === 1 ? `Ces ${noms[0]}s sont posées` : 'Ces opérations sont posées';
            return `${quoi} et alignées : il ne reste qu'à calculer, colonne par `
                + 'colonne, en partant de la DROITE. Écris tes retenues au crayon, '
                + 'là où tu as l\'habitude de les mettre. Une division se fait par étapes : '
                + 'on abaisse un chiffre, on cherche combien de fois le diviseur tient '
                + 'dedans, on multiplie, on soustrait — et le reste est toujours plus '
                + 'petit que le diviseur.';
        },
        previewGrille: posePreviewHtml,
        pdfGrille: dessinerPosePdf,
        nomBloc: 'Opération', nomBlocs: 'opérations',
        // Le numéro sur la ligne du calcul, comme au cahier — pas au-dessus,
        // où il coûterait une ligne entière pour trois caractères.
        numeroInterne: true,
        titreAGauche: true,
        // UNE OPÉRATION POSÉE EST HAUTE ET ÉTROITE : trois rangées pour une
        // addition, sept pour une division. Le bloc suit, et c'est en colonnes
        // qu'on en met — six additions sur une ligne de feuille, comme dans
        // tous les cahiers de calcul.
        proportions: { w: 1, h: 1.05 },
        disposition: { cols: 4, rows: 3, maxCols: 6, maxRows: 4 },
        parLigneDefaut: 4,
        grilleMax: 60
    },
    priorites: {
        titre: 'Priorités opératoires — ligne par ligne',
        // COURTE. Rémy : « pour l'énoncé, mets juste Calcule en respectant les
        // priorités, écris les calculs ». Six lignes de méthode en tête de
        // feuille ne se lisent pas — la méthode s'enseigne au tableau, la
        // consigne rappelle ce qu'on attend. Et la dernière phrase était
        // devenue fausse : les lignes sont maintenant les mêmes pour tous les
        // calculs, elles ne comptent plus les étapes de celui-là.
        consigne: () => 'Calcule en respectant les priorités, et écris les calculs : '
            + 'une opération par ligne, en recopiant tout le reste.',
        previewGrille: prioritesPreviewHtml,
        pdfGrille: dessinerPrioritesPdf,
        // CE RENDU SAIT SE FAIRE RÉCRIRE — et surtout, se faire RECORRIGER.
        //
        // Rémy : « on ne peut pas changer les calculs du 33 (attention à la
        // correction) ». Sa parenthèse est tout le problème : récrire
        // « 8 × 4 − 6 » en « 8 × 4 − 7 » ne change pas qu'une ligne, cela rend
        // fausses les trois lignes du corrigé en dessous. Laisser taper du
        // texte ne suffisait donc pas ; il fallait un moteur capable de RELIRE
        // ce qu'on tape et de refaire la cascade entière. C'est `relire` dans
        // `core/priorites.js`, et il rend `null` sur ce qu'il ne sait pas lire
        // — auquel cas la feuille le dit au lieu d'imprimer un corrigé qui ment.
        retoucheGrille: {
            legende: 'Le calcul',
            aide: 'Écris-le comme au tableau : 8 × 4 − 6, (3 + 4) × 2, 3² + 2. '
                + 'Le × du clavier, l\'étoile et la virgule sont compris. '
                + 'La correction est refaite entière à partir de ce que tu écris.',
            lire: (item) => (item.meta && item.meta.lignes && item.meta.lignes[0]) || '',
            appliquer: (item, texte) => {
                const r = relirePriorites(texte);
                if (!r) return null;
                const lignes = [r.texte, ...r.lignes.slice(1).map(l => `= ${l.texte}`)];
                return {
                    ...item,
                    meta: {
                        ...item.meta,
                        lignes,
                        etapes: r.etapes,
                        // Les lignes vides sont les mêmes pour toute la feuille
                        // (voir `geoPriorites`) : un calcul récrit plus long
                        // que les autres emporte donc le plafond avec lui.
                        etapesMax: Math.max(item.meta.etapesMax || 0, r.etapes)
                    },
                    answer: r.valeur
                };
            }
        },
        nomBloc: 'Calcul', nomBlocs: 'calculs',
        titreAGauche: true,
        // LE NUMÉRO EST POSÉ PAR LE BLOC LUI-MÊME, sur la ligne du calcul :
        // « 1.  2 × 6 + 7 − 2 », comme dans un cahier. Écrit au-dessus par la
        // mise en page, il coûtait une ligne entière pour trois caractères.
        numeroInterne: true,
        // ET LE BLOC EST BAS. Une cascade de trois étapes tient sur quatre
        // lignes de cahier : lui donner un carré de huit centimètres laissait
        // la moitié de sa hauteur en blanc.
        proportions: { w: 1, h: 0.52 },
        // DIX PAR PAGE. Une cascade est large et courte : c'est en LIGNES
        // qu'il en faut, pas en colonnes — au-delà de deux colonnes,
        // « (2 + 3) × (4 + 1) » sort de son bloc.
        disposition: { cols: 2, rows: 5, maxCols: 3, maxRows: 6 },
        parLigneDefaut: 2
    },
    tableur: {
        titre: 'Le tableur sur le papier',
        consigne: () => 'Une case porte le nom de sa colonne et de sa ligne : B3. Une plage '
            + 'porte le nom de ses deux coins : A1:C2. ET UNE FORMULE COMMENCE PAR « = » ET '
            + 'N\'UTILISE QUE DES RÉFÉRENCES — jamais les nombres recopiés, sinon rien ne se '
            + 'recalcule quand une donnée change.',
        previewGrille: tableurPreviewHtml,
        pdfGrille: dessinerTableurPdf,
        nomBloc: 'Exercice',
        disposition: { cols: 3, rows: 2, maxCols: 4, maxRows: 3 },
        parLigneDefaut: 3
    },
    paires: {
        titre: 'Relier les compléments',
        consigne: (items) => {
            const c = (items[0] && items[0].meta.cible) || 10;
            return `Relie chaque nombre de gauche au nombre de droite qui le complète à ${c}. `
                + 'Trace un trait d\'une pastille à l\'autre, à la règle. Chaque nombre a un '
                + 'partenaire et un seul.';
        },
        previewGrille: pairesPreviewHtml,
        pdfGrille: dessinerPairesPdf,
        nomBloc: 'Grille',
        titreAGauche: true,
        disposition: { cols: 2, rows: 2, maxCols: 3, maxRows: 3 },
        parLigneDefaut: 2
    },
    proportion: {
        titre: 'Tableaux de proportionnalité',
        consigne: () => 'Complète chaque tableau. Une colonne est toujours entièrement '
            + 'connue : c\'est elle qui donne le lien entre les deux lignes. Écris ce lien '
            + 'au-dessus du tableau si cela t\'aide (× ou ÷ combien ?).',
        previewGrille: proportionPreviewHtml,
        pdfGrille: dessinerProportionPdf,
        nomBloc: 'Tableau',
        titreAGauche: true,
        // Trois par ligne tient : la colonne des libellés se resserre, les
        // cases restent au-dessus de neuf millimètres. Au-delà, un « 12,5 » ne
        // rentrerait plus dans sa case.
        disposition: { cols: 2, rows: 3, maxCols: 3, maxRows: 4 },
        parLigneDefaut: 2
    },
    pizza: {
        titre: 'Fractions d\'une pizza',
        consigne: () => 'La pizza est déjà partagée en parts égales. Pour chaque garniture, '
            + 'écris d\'abord COMBIEN DE PARTS elle représente, puis colorie-les. La marque '
            + 'de la légende sert à s\'y retrouver sans couleur.',
        previewGrille: pizzaPreviewHtml,
        pdfGrille: dessinerPizzaPdf,
        nomBloc: 'Pizza',
        // LE BLOC EST LARGE ET BAS depuis que la commande est posée à droite du
        // disque : la pizza n'a plus besoin de la hauteur qu'occupait la liste.
        // Six par page au lieu de quatre, sans que le disque rétrécisse — une
        // pizza en douze parts qui tient dans quatre centimètres a des parts de
        // six millimètres, et on ne les colorie pas.
        proportions: { w: 1, h: 0.62 },
        disposition: { cols: 2, rows: 3, maxCols: 3, maxRows: 4 },
        parLigneDefaut: 2
    },
    horloge: {
        titre: 'La pendule',
        consigne: (items) => ((items[0] && items[0].meta.mode === 'placer')
            ? 'Trace les deux aiguilles pour afficher l\'heure écrite sous chaque pendule. '
                + 'La grande aiguille (les minutes) est LONGUE, la petite (les heures) est '
                + 'courte et épaisse — et elle se décale un peu vers le nombre suivant.'
            : 'Écris sous chaque pendule l\'heure qu\'elle affiche. La PETITE aiguille donne '
                + 'les heures, la GRANDE donne les minutes — et chaque nombre du cadran vaut '
                + 'CINQ minutes pour la grande.'),
        // Rémy : « laisse moins d'espaces entre les colonnes ». Un cadran est
        // carré et la hauteur le bride : la largeur qui reste dans
        // l'emplacement est du blanc — voir `serrerColonnes`.
        serrerColonnes: true,
        previewGrille: horlogePreviewHtml,
        pdfGrille: dessinerHorlogePdf,
        nomBloc: 'Pendule',
        // SIX PAR PAGE. Sous quatre centimètres, une aiguille sur le 7 et une
        // aiguille sur le 8 ne se distinguent plus : l'exercice devient un test
        // de vue au lieu d'une lecture.
        disposition: { cols: 3, rows: 2, maxCols: 4, maxRows: 3 },
        parLigneDefaut: 3
    },
};
