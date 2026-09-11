// LA FIGURE DE L'HEXAGRILLE — la géométrie seule, sans une ligne de DOM.
//
// Rémy, sur le banc d'essai : « Pas de pdf ». L'Hexagrille n'avait pas de
// version papier du tout, et lui en donner une posait la question que ce
// dépôt se pose partout ailleurs : où vit le placement ?
//
// LE MÊME DESSIN À L'ÉCRAN ET SUR LA FEUILLE, DONC CALCULÉ AU MÊME ENDROIT.
// Les hexagones, les étiquettes de somme et les flèches qui vont de l'une à
// l'autre sont une géométrie, pas un rendu : ce module la donne en unités
// abstraites, et l'écran comme le PDF n'ont plus qu'à la mettre à l'échelle.
// Recopier ces vingt lignes dans `printSheet.js` aurait garanti qu'un jour les
// deux divergent — c'est arrivé assez souvent pour qu'on ne recommence pas.
//
// LE REPÈRE. Un hexagone à SOMMET PLAT : large de 2 R, haut de √3 R, et les
// colonnes se chevauchent d'un quart de largeur. Le losange de nnn cases se lit
// en (colonne, rangée), et une colonne descend en biais — d'où le `c / 2` dans
// l'ordonnée du centre.

import { CASES } from './hexagrille.js';

/** Le rayon d'un hexagone, dans les unités du dessin. Tout en découle. */
export const R = 30;
export const HAUT = Math.sqrt(3) * R;
const PAS_X = 1.5 * R;

// L'ORIGINE LAISSE LA PLACE AUX ÉTIQUETTES. Les sommes se posent en dehors du
// losange — au-dessus pour les colonnes, à gauche pour les descentes et les
// montées : sans cette marge, la somme de la première colonne sortait par le
// haut du dessin, et celle de la première descente venait se poser dessus.
const ORIG_X = 100;
const ORIG_Y = 80;

// CHAQUE FAMILLE A SON RECUL. Deux files qui partent de la MÊME case — la
// descente et la montée s'y croisent — poseraient sinon leurs étiquettes à
// quarante unités l'une de l'autre. En éloignant les montées, on écarte les
// deux couronnes d'étiquettes sans toucher au losange. Calculé sur les huit
// files : le plus petit écart entre deux étiquettes est de 21.
const RECUL = { 'bas': R + 46, 'bas-droite': R + 48, 'haut-droite': R + 88 };

// DU CENTRE D'UN HEXAGONE À SON BORD, dans les trois directions employées.
// Les files descendent (90°) ou suivent une diagonale (±30°) : ce sont les
// milieux des côtés d'un hexagone à sommet plat, tous à la même distance.
const BORDURE = HAUT / 2;
// « Que les flèches arrivent jusque la bordure, avec un petit décalage » : la
// pointe s'arrête juste avant le trait de la case, elle ne le touche pas.
const ECART = 7;
// L'étiquette et la flèche se tiennent : le trait part sous le chiffre.
const SOUS_LE_CHIFFRE = 15;

/** Le centre du dessin pour la case (c, r). */
export const centre = (c, r) => ({
    x: ORIG_X + c * PAS_X,
    y: ORIG_Y + (r + c / 2) * HAUT
});

/** Le contour d'un hexagone à sommet plat, centré à l'origine. */
export const SOMMETS = Array.from({ length: 6 }, (_, k) => {
    const a = (Math.PI / 180) * (60 * k);
    return [R * Math.cos(a), R * Math.sin(a)];
});

/** Le même contour, prêt pour l'attribut `points` d'un `<polygon>`. */
export const CONTOUR = SOMMETS.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');

/**
 * Où se pose la flèche d'une file : le vecteur qui la parcourt, et le point de
 * départ de son étiquette — TOUJOURS en amont de la première case, jamais
 * entre deux hexagones.
 *
 * LE TRAIT VA DU CHIFFRE À LA CASE. Il n'était qu'un moignon suspendu à
 * mi-chemin : on ne voyait ni d'où il partait ni où il allait, et Rémy lisait
 * « des soucis entre la position de la flèche et du chiffre ». Il part
 * maintenant sous l'étiquette et sa pointe s'arrête à sept unités du bord de
 * la première case.
 */
export function repereFleche(f) {
    const a = centre(CASES[f.cases[0]].c, CASES[f.cases[0]].r);
    const derniere = CASES[f.cases[f.cases.length - 1]];
    const b = centre(derniere.c, derniere.r);
    const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const ux = (b.x - a.x) / d, uy = (b.y - a.y) / d;
    const recul = RECUL[f.sens] || R + 48;
    return {
        ux, uy,
        x1: a.x - ux * (recul - SOUS_LE_CHIFFRE), y1: a.y - uy * (recul - SOUS_LE_CHIFFRE),
        x2: a.x - ux * (BORDURE + ECART), y2: a.y - uy * (BORDURE + ECART),
        // L'étiquette, au bout du trait, sur la même ligne.
        ex: a.x - ux * recul, ey: a.y - uy * recul
    };
}

/**
 * LE CADRE SE CALCULE, IL NE SE DEVINE PAS : on prend l'enveloppe des
 * hexagones ET des étiquettes, avec une marge. Une constante écrite à la main
 * laissait sortir la somme de la première colonne dès qu'elle passait à deux
 * chiffres.
 *
 * Rendu comme un rectangle `{ x, y, w, h }` dans les unités du dessin — c'est
 * le `viewBox` de l'écran, et c'est ce que la feuille met à l'échelle.
 */
export function cadreHexagrille(fleches = []) {
    const points = [];
    CASES.forEach(({ c, r }) => {
        const { x, y } = centre(c, r);
        points.push([x - R, y - HAUT / 2], [x + R, y + HAUT / 2]);
    });
    fleches.forEach(f => {
        const p = repereFleche(f);
        // L'étiquette tient sur UNE ligne depuis que « déjà 8 » a disparu :
        // vingt-six unités de haut suffisent, contre quarante auparavant.
        points.push([p.ex - 22, p.ey - 14], [p.ex + 22, p.ey + 14]);
    });
    const x = Math.min(...points.map(p => p[0])) - 6;
    const y = Math.min(...points.map(p => p[1])) - 6;
    return {
        x, y,
        w: Math.max(...points.map(p => p[0])) - x + 6,
        h: Math.max(...points.map(p => p[1])) - y + 6
    };
}
