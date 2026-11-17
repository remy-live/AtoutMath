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
    contourSecteur, equerreDe, mesureArc, rayonSecteur, boiteFigure, poseEtiquettes
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
        // PAS DE MARQUE SUR LE TRAIT. Rémy, deux fois : « je ne comprends pas
        // pourquoi tu mets des flèches », puis « ne mets pas de flèche sur les
        // tracés des valeurs manquantes des angles ».
        //
        // Le chevron est bien le codage des parallèles, celui de tous les
        // manuels — mais posé sur une droite qui s'arrête au bord du cadre, il
        // se lit comme une pointe. On l'avait déplacé du sixième au tiers ; ça
        // n'a pas suffi, et deux demandes valent mieux qu'un argument.
        //
        // CE QUI PORTE L'INFORMATION À SA PLACE. Le POINTILLÉ distingue déjà les
        // deux parallèles de la sécante — c'est la figure de Rémy —, et la
        // consigne le dit en toutes lettres, à l'écran comme sur la feuille. La
        // figure garde donc son seul décor utile : le sommet, l'arc, la mesure.
        //
        // AILLEURS, LE CHEVRON RESTE. Dans « Rédiger une justification » il est
        // la CONCLUSION du théorème, et dans « Le quadrilatère qui se
        // transforme » l'élève doit précisément apprendre à le lire. Ici il ne
        // servait qu'à redire ce que le pointillé disait déjà.
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

    // LA POSE, LA TAILLE ET LA PLACE DES VOISINES VIENNENT ENSEMBLE.
    //
    // C'étaient trois décisions séparées : `ancreArc` plaçait, une constante
    // dimensionnait, et personne ne regardait les voisines. Or la place qu'il
    // faut dépend de la LARGEUR du nombre — « 130° » est trois fois plus large
    // que haut —, la largeur dépend de la taille, et les trois secteurs d'un
    // triangle se recouvrent dans son intérieur. Trois décisions qui s'ignorent
    // ne peuvent pas tenir : Rémy l'a vu d'un coup d'œil (« déborde un peu ! »),
    // et la planche de huit triangles a montré bien pire.
    //
    // ON NE POSE QUE LES ÉTIQUETTES QUI S'ÉCRIVENT : une figure où l'on cache
    // les mesures n'a pas à écarter des nombres qu'elle ne montre pas.
    const texteDe = (arc) => {
        const dit = mesures === 'toutes'
            || (mesures === 'donne' && arc.role === 'donne');
        return dit ? `${mesureArc(arc)}°` : (arc.pas ? String(arc.pas) : '');
    };
    const ecrits = figure.arcs.filter(arc => texteDe(arc) !== '');
    const poses = poseEtiquettes(ecrits, texteDe);
    ecrits.forEach((arc, i) => {
        const texte = texteDe(arc);
        const pose = poses[i];
        const q = P(pose.x, pose.y);
        const taille = arr(pose.h * k);
        const ou = pose.dedans ? ' ar-mesure--dedans' : '';
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
