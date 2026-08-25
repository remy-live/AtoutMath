// LE DESSIN D'UNE FIGURE D'ANGLES REMARQUABLES.
//
// Séparé du noyau (core/anglesRemarquables.js), qui ne connaît que des traits
// et des secteurs : ici on ne décide rien, on montre. La feuille imprimée lit
// les MÊMES données et les redessine en jsPDF — c'est la garantie que ce qu'on
// voit à l'écran est ce qui sort de l'imprimante.
//
// LE REPÈRE DU NOYAU MONTE, CELUI D'UN ÉCRAN DESCEND. La conversion se fait
// ici, une fois, et nulle part ailleurs : `versEcran`.

import {
    contourSecteur, equerreDe, mesureArc, ancreArc, rayonSecteur, boiteFigure,
    HAUTEUR_ETIQUETTE, etiquetteDedans
} from './anglesRemarquables.js';

// LE CADRE ÉPOUSE LA FIGURE, il ne l'enferme pas dans un carré. Deux droites
// penchées forment une bande deux à quatre fois plus large que haute : dans un
// carré, les deux tiers du dessin sont du vide — et comme un écran de
// téléphone plafonne la HAUTEUR d'une figure, ce vide se paie en largeur
// perdue. Le cadre reprend donc les proportions de la figure ; on les borne
// seulement pour qu'une bande extrême ne devienne pas un fil.
const LONG = 300, PAD = 18, RAPPORT_MAX = 2.0;

const arr = (v) => Math.round(v * 100) / 100;

/**
 * @param {Object} figure  { traits, arcs, droit }, tel que le noyau le donne
 * @param {Object} opts
 *   `mesures` : quelles étiquettes écrire — 'donne' (l'énoncé), 'toutes' (le
 *               corrigé), 'aucune'.
 *   `prefixe` : pour que deux figures sur la même page ne partagent pas leurs
 *               identifiants de dégradé.
 */
export function figureAnglesSvg(figure, { mesures = 'donne', prefixe = 'ar' } = {}) {
    // L'ÉCHELLE ET LE CENTRE VIENNENT DE LA FIGURE, pas d'une constante : deux
    // droites penchées occupent une bande large et basse, un angle plein un
    // petit disque. On les mesure et l'on ajuste dessus.
    const b = boiteFigure(figure);
    const r = Math.min(RAPPORT_MAX, Math.max(1 / RAPPORT_MAX, b.largeur / b.hauteur));
    const W = r >= 1 ? LONG : Math.round(LONG * r);
    const H = r >= 1 ? Math.round(LONG / r) : LONG;
    const k = Math.min((W - PAD * 2) / b.largeur, (H - PAD * 2) / b.hauteur);
    const cx = (b.xmin + b.xmax) / 2, cy = (b.ymin + b.ymax) / 2;
    // Du repère mathématique (y monte, origine au centre) vers le SVG.
    const P = (x, y) => ({ x: W / 2 + (x - cx) * k, y: H / 2 - (y - cy) * k });

    let d = '';
    // LES SECTEURS D'ABORD, LES TRAITS PAR-DESSUS : une couleur posée sur un
    // trait le mange, et ce sont les côtés de l'angle qui portent le sens.
    figure.arcs.forEach((arc, i) => {
        const pts = contourSecteur(arc, rayonSecteur(arc, rang(figure, i)))
            .map(p => { const q = P(p.x, p.y); return `${arr(q.x)},${arr(q.y)}`; });
        d += `<polygon class="ar-sect ar-sect--${arc.role}" points="${pts.join(' ')}"/>`;
    });
    figure.traits.forEach(t => {
        const a = P(t.x1, t.y1), b = P(t.x2, t.y2);
        d += `<line class="ar-trait${t.pointille ? ' ar-trait--par' : ''}"
            x1="${arr(a.x)}" y1="${arr(a.y)}" x2="${arr(b.x)}" y2="${arr(b.y)}"/>`;
    });
    if (figure.droit) {
        const pts = equerreDe(figure.droit)
            .map(p => { const q = P(p.x, p.y); return `${arr(q.x)},${arr(q.y)}`; });
        d += `<polyline class="ar-droit" points="${pts.join(' ')}"/>`;
    }
    // Le sommet de chaque croisement : un point, pour qu'on sache où regarder.
    sommets(figure).forEach(s => {
        const q = P(s.x, s.y);
        d += `<circle class="ar-sommet" cx="${arr(q.x)}" cy="${arr(q.y)}" r="3"/>`;
    });

    figure.arcs.forEach((arc) => {
        const dit = mesures === 'toutes'
            || (mesures === 'donne' && arc.role === 'donne');
        const numero = arc.pas ? String(arc.pas) : '';
        if (!dit && !numero) return;
        const ancre = ancreArc(arc);
        const q = P(ancre.x, ancre.y);
        const texte = dit ? `${mesureArc(arc)}°` : numero;
        // LA TAILLE VIENT DE L'ÉCHELLE DU DESSIN, pas d'une constante de
        // feuille de style : c'est la seule façon qu'une étiquette occupe la
        // part de figure que `ancreArc` lui a réservée. Fixée en dur, elle
        // était énorme sur une figure resserrée et minuscule sur une figure
        // étalée — et dans le premier cas elle mordait sur un côté.
        const taille = arr(HAUTEUR_ETIQUETTE * k);
        const ou = etiquetteDedans(arc) ? ' ar-mesure--dedans' : '';
        d += `<text class="ar-mesure ar-mesure--${arc.role}${ou}" x="${arr(q.x)}" y="${arr(q.y + taille * 0.35)}"
            font-size="${taille}" stroke-width="${arr(taille * 0.26)}"
            text-anchor="middle">${texte}</text>`;
    });

    return `<svg class="fig-svg ar-svg" viewBox="0 0 ${W} ${H}" role="img"
        aria-label="Figure d'angles" data-prefixe="${prefixe}">${d}</svg>`;
}

/** Le rang d'un secteur AU MÊME SOMMET : deux voisins ne prennent pas le même rayon. */
function rang(figure, i) {
    const a = figure.arcs[i];
    let n = 0;
    for (let j = 0; j < i; j++) {
        const b = figure.arcs[j];
        if (Math.abs(b.x - a.x) < 1e-9 && Math.abs(b.y - a.y) < 1e-9) n++;
    }
    return n;
}

/** Les sommets distincts de la figure. */
export function sommets(figure) {
    const vus = [];
    figure.arcs.forEach(a => {
        if (!vus.some(s => Math.abs(s.x - a.x) < 1e-9 && Math.abs(s.y - a.y) < 1e-9)) {
            vus.push({ x: a.x, y: a.y });
        }
    });
    return vus;
}
