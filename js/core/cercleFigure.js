// LA FIGURE DU CERCLE — une seule description, deux rendus.
//
// Rémy : « j'aimerai bien un exercice sur le vocabulaire du cercle ». Centre,
// rayon, diamètre, corde, arc, tangente, sécante — et la distinction que tout
// le monde rate, entre le CERCLE (la ligne) et le DISQUE (la surface).
//
// CE MODULE NE DÉCIDE RIEN, IL DESSINE. Il transforme une description
// (« un rayon vers 40°, nommé A ; une corde de 200° à 320°, nommée B et C ») en
// une liste de TRACÉS élémentaires — des segments, des arcs, des croix, des
// mots. L'écran en fait du SVG, la feuille en fait du jsPDF, et les deux lisent
// la même liste : c'est la garantie que ce que l'élève voit à l'écran est ce
// qui sort de l'imprimante.
//
// UN POINT EST UNE CROIX. Rémy, banc d'essai : « je te rappelle qu'un point est
// représenté par une croix ». C'est la convention du collège, et elle n'est pas
// décorative : un disque plein occupe une surface, alors qu'un point n'en a
// pas — c'est l'INTERSECTION des deux traits qui EST le point, et cela se voit.
//
// LES POINTS SONT NOMMÉS, et c'est ce qui change tout pour l'énoncé. « Que
// représente le segment [OA] ? » désigne exactement ce qu'on montre ; « comment
// s'appelle le tracé 2 » désignait un rang dans une liste. La notation est
// elle-même au programme : l'exercice de vocabulaire la fait travailler en
// passant.
//
// UN ARC EST UNE POLYLIGNE, pas une primitive. jsPDF ne sait pas tracer d'arc,
// et deux implémentations d'arc — une par rendu — finiraient forcément par
// diverger d'un degré. On l'aplatit donc ici, une fois, pour tout le monde.

/** Le repère de la figure : un carré de 100, cercle centré, rayon 32. */
export const CX = 50, CY = 50, R = 32;

/** Le point du cercle à cet angle (en degrés, sens trigonométrique). */
export function surCercle(a, r = R) {
    const t = (a * Math.PI) / 180;
    return { x: CX + r * Math.cos(t), y: CY - r * Math.sin(t) };
}

const arr = (v) => Math.round(v * 100) / 100;

/**
 * LES COULEURS. Rémy : « n'hésite pas à mettre de la couleur ». Une par
 * élément, prises dans la palette catégorielle usuelle — celles qui restent
 * distinctes y compris en luminosité, donc encore séparables une fois
 * photocopiées en gris. L'élément dont on parle reste en plus le plus ÉPAIS :
 * la couleur ne porte jamais l'information toute seule.
 */
export const COULEURS = ['#d62728', '#1f77b4', '#2ca02c', '#9467bd', '#e07b00', '#17a2b8'];
export const ENCRE_FIG = '#1a202c';

/**
 * LES TRACÉS D'UNE FIGURE.
 *
 * @param {Object} spec
 *   `elements`  : [{ type, a, b, noms }] — le vocabulaire à dessiner
 *   `surligne`  : index (ou liste d'index) des éléments mis en avant
 *   `couleurs`  : true pour donner une couleur à chaque élément
 * @returns {Array} des objets { k: 'cercle'|'ligne'|'croix'|'texte', … }
 */
export function tracesDe(spec) {
    const els = spec.elements || [];
    const forts = new Set([].concat(spec.surligne === undefined ? [] : spec.surligne));
    const out = [];

    // LE DISQUE D'ABORD, SOUS TOUT LE RESTE : c'est un fond, pas un trait.
    const disque = els.findIndex(e => e.type === 'disque');
    if (disque >= 0) out.push({ k: 'cercle', x: CX, y: CY, r: R, plein: true, fort: forts.has(disque) });
    const cercle = els.findIndex(e => e.type === 'cercle');
    out.push({ k: 'cercle', x: CX, y: CY, r: R, fort: cercle >= 0 && forts.has(cercle) });

    els.forEach((e, i) => {
        const couleur = spec.couleurs === false ? ENCRE_FIG : COULEURS[i % COULEURS.length];
        for (const t of traceElement(e, forts.has(i), couleur)) out.push(t);
    });

    // LE CENTRE EST TOUJOURS LÀ, ET IL S'APPELLE O. Même quand la question ne
    // porte pas sur lui : c'est de lui qu'on parle pour dire ce qu'est un rayon
    // ou un diamètre, et une figure sans son centre nommé rendrait l'énoncé
    // muet.
    const centre = els.findIndex(e => e.type === 'centre');
    out.push({ k: 'croix', x: CX, y: CY, fort: centre >= 0 && forts.has(centre),
        couleur: centre >= 0 && forts.has(centre) ? COULEURS[centre % COULEURS.length] : ENCRE_FIG });
    out.push({ k: 'texte', x: CX - 5, y: CY + 5.5, t: 'O', taille: 6.5 });

    return out.map(t => (t.k === 'ligne'
        ? { ...t, pts: t.pts.map(p => ({ x: arr(p.x), y: arr(p.y) })) }
        : t));
}

function traceElement(e, fort, couleur) {
    const out = [];
    const noms = e.noms || [];
    /** Une croix et sa lettre, posée du côté opposé au centre. */
    const pointNomme = (p, nom) => {
        out.push({ k: 'croix', x: p.x, y: p.y, fort, couleur });
        if (!nom) return;
        const q = ecarteDuCentre(p, 6);
        out.push({ k: 'texte', x: q.x, y: q.y, t: nom, taille: 6.5 });
    };

    if (e.type === 'centre' || e.type === 'cercle' || e.type === 'disque') {
        // Ces trois-là sont la figure elle-même : rien de plus à tracer.
        return out;
    }
    if (e.type === 'rayon') {
        const p = surCercle(e.a);
        out.push({ k: 'ligne', pts: [{ x: CX, y: CY }, p], fort, couleur });
        pointNomme(p, noms[0]);
        return out;
    }
    if (e.type === 'diametre' || e.type === 'corde') {
        const p = surCercle(e.a);
        const q = surCercle(e.type === 'diametre' ? e.a + 180 : e.b);
        out.push({ k: 'ligne', pts: [p, q], fort, couleur });
        pointNomme(p, noms[0]);
        pointNomme(q, noms[1]);
        return out;
    }
    if (e.type === 'arc') {
        const pts = polyArc(e.a, e.b);
        out.push({ k: 'ligne', pts, fort, couleur, arc: true });
        pointNomme(pts[0], noms[0]);
        pointNomme(pts[pts.length - 1], noms[1]);
        return out;
    }
    if (e.type === 'tangente') {
        // Perpendiculaire au rayon, au point de contact : c'est la définition,
        // et c'est ce qui la distingue d'une sécante qui frôle.
        const p = surCercle(e.a);
        const dir = { x: -Math.sin((e.a * Math.PI) / 180), y: -Math.cos((e.a * Math.PI) / 180) };
        const L = 30;
        const bout = { x: p.x + dir.x * L * 0.7, y: p.y + dir.y * L * 0.7 };
        out.push({
            k: 'ligne', fort, couleur,
            pts: [{ x: p.x - dir.x * L, y: p.y - dir.y * L }, { x: p.x + dir.x * L, y: p.y + dir.y * L }]
        });
        pointNomme(p, noms[0]);
        // UNE DROITE SE NOMME PAR DEUX POINTS. Le second est posé sur la
        // tangente, hors du cercle : sans lui, on ne pourrait pas écrire
        // « (AB) » dans l'énoncé, et la question perdrait sa notation.
        pointNomme(bout, noms[1]);
        return out;
    }
    if (e.type === 'secante') {
        const p = surCercle(e.a), q = surCercle(e.b);
        const d = { x: q.x - p.x, y: q.y - p.y };
        const L = Math.hypot(d.x, d.y) || 1;
        const u = { x: d.x / L, y: d.y / L };
        out.push({
            k: 'ligne', fort, couleur,
            pts: [{ x: p.x - u.x * 13, y: p.y - u.y * 13 }, { x: q.x + u.x * 13, y: q.y + u.y * 13 }]
        });
        pointNomme(p, noms[0]);
        pointNomme(q, noms[1]);
        return out;
    }
    return out;
}

/** Pousse un point vers l'extérieur du cercle, pour poser sa lettre à côté. */
function ecarteDuCentre(p, d) {
    const v = { x: p.x - CX, y: p.y - CY };
    const L = Math.hypot(v.x, v.y) || 1;
    return { x: p.x + (v.x / L) * d, y: p.y + (v.y / L) * d };
}

/** Un arc aplati en polyligne : un point tous les cinq degrés au plus. */
export function polyArc(a, b, r = R) {
    let fin = b;
    while (fin <= a) fin += 360;
    const n = Math.max(6, Math.ceil((fin - a) / 5));
    const pts = [];
    for (let i = 0; i <= n; i++) pts.push(surCercle(a + ((fin - a) * i) / n, r));
    return pts;
}

/** Les deux segments d'une croix, en coordonnées de la figure. */
export function branchesCroix(x, y, taille) {
    const d = taille / 2;
    return [[{ x: x - d, y: y - d }, { x: x + d, y: y + d }],
        [{ x: x - d, y: y + d }, { x: x + d, y: y - d }]];
}

export const TAILLE_CROIX = 3.4;

/**
 * Le SVG d'une figure. Les couleurs sont écrites en dur et non en variables de
 * thème : cette figure part aussi à l'imprimante, et un trait « couleur du
 * texte » y sortirait blanc sur blanc.
 */
export function cercleSvg(traces, { taille = 300 } = {}) {
    const k = taille / 100;
    const T = (v) => arr(v * k);
    const trait = (pts, couleur, epaisseur) => `<path d="${pts.map((p, i) =>
        `${i ? 'L' : 'M'}${T(p.x)} ${T(p.y)}`).join(' ')}" fill="none" stroke="${couleur}"
        stroke-width="${T(epaisseur)}" stroke-linecap="round" stroke-linejoin="round"/>`;
    let d = '';
    for (const t of traces) {
        if (t.k === 'cercle' && t.plein) {
            d += `<circle cx="${T(t.x)}" cy="${T(t.y)}" r="${T(t.r)}"
                fill="${t.fort ? '#fde2e2' : '#eef2f9'}"/>`;
        } else if (t.k === 'cercle') {
            d += `<circle cx="${T(t.x)}" cy="${T(t.y)}" r="${T(t.r)}" fill="none"
                stroke="${t.fort ? COULEURS[0] : ENCRE_FIG}" stroke-width="${T(t.fort ? 1.6 : 0.7)}"/>`;
        } else if (t.k === 'ligne') {
            d += trait(t.pts, t.couleur || ENCRE_FIG, t.fort ? 1.6 : 0.8);
        } else if (t.k === 'croix') {
            for (const b of branchesCroix(t.x, t.y, TAILLE_CROIX)) {
                d += trait(b, t.couleur || ENCRE_FIG, t.fort ? 1.1 : 0.75);
            }
        } else if (t.k === 'texte') {
            d += `<text x="${T(t.x)}" y="${T(t.y)}" fill="${ENCRE_FIG}" font-weight="700"
                font-size="${T(t.taille)}" text-anchor="middle" dominant-baseline="central"
                font-family="Helvetica, Arial, sans-serif">${t.t}</text>`;
        }
    }
    return `<svg viewBox="0 0 ${taille} ${taille}" width="${taille}" height="${taille}"
        role="img" aria-label="figure du cercle">${d}</svg>`;
}
