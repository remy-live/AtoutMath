// LE DESSIN D'UNE FIGURE À CODER.
//
// Séparé du noyau (core/codage.js) qui, lui, ne connaît que des longueurs et
// des angles : ici on ne décide rien, on montre. Séparé de l'activité aussi,
// pour que la feuille imprimée puisse afficher exactement la même figure —
// vierge à coder, ou corrigée.
//
// LA FIGURE EST À L'ÉCHELLE. Un rectangle 12 x 5 doit ressembler à un
// rectangle 12 x 5 : on met la figure à l'échelle sans la déformer, sinon
// l'élève coderait des égalités que le dessin dément.

import { ORDRE_SEGMENTS, POINTS_ANGLE, bornesDe } from './codage.js';

// La marge laisse passer les noms des sommets, posés à dix-sept unités vers
// l'extérieur : trente suffisent, et chaque unité rendue au dessin est du
// doigt gagné sur les zones à toucher.
const W = 320, H = 300, PAD = 30;

/**
 * La projection du repère mathématique vers une boîte de dessin, y descendant.
 * Le SVG l'appelle sur sa zone de 320 x 300 ; la feuille imprimée, sur son
 * cadre en millimètres — d'où le même dessin des deux côtés.
 */
export function projeterDans(fig, { x = 0, y = 0, w = W, h = H, pad = PAD } = {}) {
    const noms = ['A', 'B', 'C', 'D'];
    const xs = noms.map(n => fig.points[n].x), ys = noms.map(n => fig.points[n].y);
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    const y0 = Math.min(...ys), y1 = Math.max(...ys);
    const k = Math.min((w - 2 * pad) / Math.max(x1 - x0, 1e-9), (h - 2 * pad) / Math.max(y1 - y0, 1e-9));
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    return (p) => ({ x: x + w / 2 + (p.x - cx) * k, y: y + h / 2 - (p.y - cy) * k });
}

export const projeter = (fig) => projeterDans(fig);

/** Tous les points nommés, projetés d'un coup. */
export function pointsProjetes(fig, boite) {
    const proj = projeterDans(fig, boite);
    const P = {};
    Object.keys(fig.points).forEach(n => { P[n] = proj(fig.points[n]); });
    return P;
}

const norme = (v) => {
    const n = Math.hypot(v.x, v.y) || 1;
    return { x: v.x / n, y: v.y / n };
};

// --- Les marques -------------------------------------------------------------

/**
 * La marque d'égalité, posée au milieu du segment et perpendiculaire à lui.
 *
 * Un trait, deux traits, trois traits — puis une croix. Quatre symboles
 * suffisent : c'est le parallélogramme quelconque qui en demande le plus, avec
 * ses deux paires de côtés et ses deux paires de demi-diagonales.
 */
export function traitsDeMarque(p, q, n, L = 7) {
    const u = norme({ x: q.x - p.x, y: q.y - p.y });
    const perp = { x: -u.y, y: u.x };
    const m = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
    const traits = [];

    if (n === 4) {
        // La croix : deux traits à 45 degrés du segment, qu'on ne confond avec
        // aucun nombre de traits.
        [[1, 1], [1, -1]].forEach(([a, b]) => {
            const d = norme({ x: u.x * a + perp.x * b, y: u.y * a + perp.y * b });
            traits.push([
                { x: m.x - d.x * L, y: m.y - d.y * L },
                { x: m.x + d.x * L, y: m.y + d.y * L }
            ]);
        });
    } else {
        const ecart = L * 0.72;
        const depart = -((n - 1) / 2) * ecart;
        for (let i = 0; i < n; i++) {
            const c = { x: m.x + u.x * (depart + i * ecart), y: m.y + u.y * (depart + i * ecart) };
            traits.push([
                { x: c.x - perp.x * L, y: c.y - perp.y * L },
                { x: c.x + perp.x * L, y: c.y + perp.y * L }
            ]);
        }
    }

    return traits;
}

export function marqueSvg(p, q, n, classe = 'cg-marque') {
    return traitsDeMarque(p, q, Number(n)).map(([a, b]) =>
        `<line class="${classe}" x1="${arr(a.x)}" y1="${arr(a.y)}" x2="${arr(b.x)}" y2="${arr(b.y)}"/>`
    ).join('');
}

/** Les trois points du petit carré de l'angle droit, DANS l'angle. */
export function pointsAngleDroit(sommet, bras1, bras2, c = 13) {
    const u = norme({ x: bras1.x - sommet.x, y: bras1.y - sommet.y });
    const v = norme({ x: bras2.x - sommet.x, y: bras2.y - sommet.y });
    return [
        { x: sommet.x + u.x * c, y: sommet.y + u.y * c },
        { x: sommet.x + (u.x + v.x) * c, y: sommet.y + (u.y + v.y) * c },
        { x: sommet.x + v.x * c, y: sommet.y + v.y * c }
    ];
}

export function angleDroitSvg(sommet, bras1, bras2, classe = 'cg-angle') {
    const [p1, p2, p3] = pointsAngleDroit(sommet, bras1, bras2);
    return `<path class="${classe}" d="M ${arr(p1.x)} ${arr(p1.y)} L ${arr(p2.x)} ${arr(p2.y)}
        L ${arr(p3.x)} ${arr(p3.y)}"/>`;
}

const arr = (n) => Math.round(n * 10) / 10;

/** Un symbole seul, pour le jeton de la palette. */
export function jetonSvg(n) {
    const p = { x: 4, y: 15 }, q = { x: 30, y: 15 };
    return `<svg class="cg-jeton-svg" viewBox="0 0 34 30" aria-hidden="true">
        <line class="cg-jeton-trait" x1="4" y1="15" x2="30" y2="15"/>
        ${marqueSvg(p, q, n, 'cg-marque cg-marque--jeton')}
    </svg>`;
}

/** Le jeton de l'angle droit : le même petit carré, sur un coin. */
export function jetonAngleSvg() {
    return `<svg class="cg-jeton-svg" viewBox="0 0 34 30" aria-hidden="true">
        <path class="cg-jeton-trait" d="M 6 26 L 6 6 M 6 26 L 28 26" fill="none"/>
        ${angleDroitSvg({ x: 6, y: 26 }, { x: 6, y: 6 }, { x: 28, y: 26 }, 'cg-angle cg-angle--jeton')}
    </svg>`;
}

/**
 * Le cadre de dessin, taillé au rapport de la figure. La hauteur reste 300 —
 * c'est elle qui fixe l'échelle des marques et des lettres —, seule la largeur
 * suit, entre deux bornes : une figure très plate ou très haute doit rester
 * dessinable, mais ses marques ne doivent pas changer de taille.
 */
export function cadreDe(fig) {
    const noms = ['A', 'B', 'C', 'D'];
    const xs = noms.map(n => fig.points[n].x), ys = noms.map(n => fig.points[n].y);
    const larg = Math.max(1e-6, Math.max(...xs) - Math.min(...xs));
    const haut = Math.max(1e-6, Math.max(...ys) - Math.min(...ys));
    const utileH = H - PAD * 2;
    const W2 = Math.round(Math.max(200, Math.min(460, utileH * (larg / haut) + PAD * 2)));
    return { x: 0, y: 0, w: W2, h: H, pad: PAD };
}

// --- La figure entière --------------------------------------------------------

/** Les deux voisins d'un point, pour dessiner son angle droit. */
const BRAS = { A: ['B', 'D'], B: ['C', 'A'], C: ['D', 'B'], D: ['A', 'C'], O: ['A', 'B'] };

/**
 * @param {Object} fig - une figure de core/codage.js
 * @param {Object} o
 * @param {string[]} [o.segments]  - les segments en jeu (sans diagonales : les côtés seuls)
 * @param {string[]} [o.points]    - les points où un angle droit peut se poser
 * @param {Object} [o.pose]        - {marques:{segId:n}, angles:{ptId:true}} ce qui est déjà posé
 * @param {boolean} [o.interactif] - ajoute les zones de dépôt
 * @param {Object} [o.etats]       - {id: 'juste'|'faux'} pour la correction
 * @param {boolean} [o.nomsSommets]
 */
export function codageSvg(fig, {
    segments = ORDRE_SEGMENTS, points = POINTS_ANGLE, pose = {},
    interactif = false, etats = {}, nomsSommets = true
} = {}) {
    // LE CADRE ÉPOUSE LA FIGURE. Rémy : « pour l'exercice codage, l'énoncé est
    // parfois énorme et la figure pas si grande ». Un cadre fixe de 320 sur 300
    // impose son rapport au dessin : un losange haut et étroit s'y retrouvait
    // calé sur la LARGEUR — la moitié de la hauteur disponible restait vide,
    // sur un téléphone où c'est la hauteur qu'on a. Le cadre prend donc le
    // rapport de la figure, borné pour que les noms des sommets et les marques
    // gardent la même taille d'une figure à l'autre.
    const cadre = cadreDe(fig);
    const P = pointsProjetes(fig, cadre);
    const marques = pose.marques || {};
    const angles = pose.angles || {};
    const avecDiagonales = segments.some(id => id.includes('O'));

    const parts = [];

    // LE CONTOUR D'ABORD, les diagonales par-dessus : le contour est REMPLI, et
    // un remplissage posé après effacerait les diagonales — ce qui est arrivé.
    parts.push(`<polygon class="cg-contour" points="${['A', 'B', 'C', 'D']
        .map(n => `${arr(P[n].x)},${arr(P[n].y)}`).join(' ')}"/>`);

    if (avecDiagonales) {
        parts.push(`<line class="cg-diagonale" x1="${arr(P.A.x)}" y1="${arr(P.A.y)}"
            x2="${arr(P.C.x)}" y2="${arr(P.C.y)}"/>`);
        parts.push(`<line class="cg-diagonale" x1="${arr(P.B.x)}" y1="${arr(P.B.y)}"
            x2="${arr(P.D.x)}" y2="${arr(P.D.y)}"/>`);
    }

    // Les angles droits posés, sous les marques : un petit carré au sommet.
    points.forEach(pt => {
        if (!angles[pt]) return;
        const [b1, b2] = BRAS[pt];
        parts.push(angleDroitSvg(P[pt], P[b1], P[b2],
            `cg-angle ${etats[pt] ? `cg-${etats[pt]}` : ''}`));
    });

    segments.forEach(id => {
        const n = marques[id];
        if (!n) return;
        const { de, a } = bornesDe(id);
        parts.push(marqueSvg(P[de], P[a], Number(n),
            `cg-marque ${etats[id] ? `cg-${etats[id]}` : ''}`));
    });

    // Les sommets : un point et son nom, posé vers l'extérieur.
    if (nomsSommets) {
        const centre = P.O;
        ['A', 'B', 'C', 'D'].forEach(n => {
            const d = norme({ x: P[n].x - centre.x, y: P[n].y - centre.y });
            parts.push(`<circle class="cg-sommet" cx="${arr(P[n].x)}" cy="${arr(P[n].y)}" r="3"/>`);
            parts.push(`<text class="cg-nom" x="${arr(P[n].x + d.x * 17)}" y="${arr(P[n].y + d.y * 17 + 5)}"
                text-anchor="middle">${n}</text>`);
        });
        if (avecDiagonales) {
            // LE « O » SE RANGE À L'OPPOSÉ DU PETIT CARRÉ. Rémy : « on ne voit
            // pas bien l'angle droit à cause de la lettre qui est dessus ».
            // Posé en bas à gauche du centre quoi qu'il arrive, il tombait
            // pile dans le quadrant où se dessine l'angle droit des diagonales
            // — celui d'un losange ou d'un carré. On le pose donc dans la
            // direction opposée à la bissectrice de cet angle : la seule qui
            // soit libre à coup sûr.
            const [b1, b2] = BRAS.O;
            const u = norme({ x: P[b1].x - P.O.x, y: P[b1].y - P.O.y });
            const v = norme({ x: P[b2].x - P.O.x, y: P[b2].y - P.O.y });
            const loin = norme({ x: -(u.x + v.x), y: -(u.y + v.y) });
            parts.push(`<circle class="cg-sommet" cx="${arr(P.O.x)}" cy="${arr(P.O.y)}" r="3"/>`);
            parts.push(`<text class="cg-nom cg-nom--centre" x="${arr(P.O.x + loin.x * 15)}"
                y="${arr(P.O.y + loin.y * 15 + 4)}" text-anchor="middle">O</text>`);
        }
    }

    // LES ZONES DE DÉPÔT EN DERNIER, donc au-dessus de tout : c'est ce que le
    // doigt touche. Elles ne couvrent que le milieu du segment — sinon celles
    // des quatre demi-diagonales se disputeraient le centre, et celles des
    // côtés voleraient les sommets, où se pose l'angle droit.
    if (interactif) {
        segments.forEach(id => {
            const { de, a } = bornesDe(id);
            const p = P[de], q = P[a];
            const t = 0.19;   // on rogne 19 % à chaque bout
            const x1 = p.x + (q.x - p.x) * t, y1 = p.y + (q.y - p.y) * t;
            const x2 = q.x - (q.x - p.x) * t, y2 = q.y - (q.y - p.y) * t;
            parts.push(`<line class="cg-cible cg-cible--seg" data-seg="${id}"
                x1="${arr(x1)}" y1="${arr(y1)}" x2="${arr(x2)}" y2="${arr(y2)}"
                tabindex="0" role="button" aria-label="Segment ${id[0]} ${id[1]}"/>`);
        });
        points.forEach(pt => {
            parts.push(`<circle class="cg-cible cg-cible--pt" data-pt="${pt}"
                cx="${arr(P[pt].x)}" cy="${arr(P[pt].y)}" r="19"
                tabindex="0" role="button" aria-label="Angle en ${pt}"/>`);
        });
    }

    return `<svg class="cg-svg" viewBox="0 0 ${cadre.w} ${cadre.h}" role="img"
        aria-label="Figure à coder : ${fig.type}">${parts.join('\n')}</svg>`;
}
