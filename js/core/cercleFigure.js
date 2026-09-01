// LA FIGURE DU CERCLE — une seule description, deux rendus.
//
// Rémy : « j'aimerai bien un exercice sur le vocabulaire du cercle ». Centre,
// rayon, diamètre, corde, arc, tangente, sécante — et la distinction que tout
// le monde rate, entre le CERCLE (la ligne) et le DISQUE (la surface).
//
// CE MODULE NE DÉCIDE RIEN, IL DESSINE. Il transforme une description
// (« un rayon à 40°, une corde de 200° à 320°, on surligne le premier ») en une
// liste de TRACÉS élémentaires — des segments, des arcs, des points, des mots.
// L'écran en fait du SVG, la feuille en fait du jsPDF, et les deux lisent la
// même liste : c'est la garantie que ce que l'élève voit à l'écran est ce qui
// sort de l'imprimante.
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
 * LES TRACÉS D'UNE FIGURE.
 *
 * @param {Object} spec
 *   `elements`  : [{ type, a, b }] — le vocabulaire à dessiner
 *   `surligne`  : index (ou liste d'index) des éléments mis en avant
 *   `numerote`  : true pour écrire 1, 2, 3… à côté de chaque élément
 *   `nommer`    : true pour écrire O au centre et A, B aux bouts du surligné
 * @returns {Array} des objets { k: 'cercle'|'ligne'|'point'|'texte', … }
 */
export function tracesDe(spec) {
    const els = spec.elements || [];
    const forts = new Set([].concat(spec.surligne === undefined ? [] : spec.surligne));
    const out = [];

    // LE DISQUE D'ABORD, SOUS TOUT LE RESTE : c'est un fond, pas un trait.
    if (els.some(e => e.type === 'disque')) out.push({ k: 'cercle', x: CX, y: CY, r: R, plein: true });
    out.push({ k: 'cercle', x: CX, y: CY, r: R, fort: els.some((e, i) => e.type === 'cercle' && forts.has(i)) });

    els.forEach((e, i) => {
        const fort = forts.has(i);
        const n = spec.numerote ? String(i + 1) : null;
        for (const t of traceElement(e, fort, n)) out.push(t);
    });

    if (spec.nommer !== false) {
        out.push({ k: 'point', x: CX, y: CY, fort: els.some((e, i) => e.type === 'centre' && forts.has(i)) });
        out.push({ k: 'texte', x: CX - 4.5, y: CY + 5.5, t: 'O', taille: 6 });
    }
    return out.map(t => (t.k === 'ligne'
        ? { ...t, pts: t.pts.map(p => ({ x: arr(p.x), y: arr(p.y) })) }
        : t));
}

function traceElement(e, fort, n) {
    const out = [];
    const etiquette = (p) => (n ? [{ k: 'texte', x: p.x, y: p.y, t: n, taille: 5.5, cadre: true }] : []);

    if (e.type === 'centre' || e.type === 'cercle' || e.type === 'disque') {
        // Ces trois-là sont la figure elle-même : rien de plus à tracer.
        return out;
    }
    if (e.type === 'rayon') {
        const p = surCercle(e.a);
        out.push({ k: 'ligne', pts: [{ x: CX, y: CY }, p], fort });
        out.push(...etiquette(auxTroisQuarts({ x: CX, y: CY }, p)));
        return out;
    }
    if (e.type === 'diametre') {
        const p = surCercle(e.a), q = surCercle(e.a + 180);
        out.push({ k: 'ligne', pts: [p, q], fort });
        out.push(...etiquette(decale(auxTroisQuarts(p, q), p, q)));
        return out;
    }
    if (e.type === 'corde') {
        const p = surCercle(e.a), q = surCercle(e.b);
        out.push({ k: 'ligne', pts: [p, q], fort });
        out.push(...etiquette(decale(auxTroisQuarts(p, q), p, q)));
        return out;
    }
    if (e.type === 'arc') {
        const pts = polyArc(e.a, e.b);
        out.push({ k: 'ligne', pts, fort, arc: true });
        out.push(...etiquette(ecarteDuCentre(pts[Math.floor(pts.length / 2)], 5)));
        return out;
    }
    if (e.type === 'tangente') {
        // Perpendiculaire au rayon, au point de contact : c'est la définition,
        // et c'est ce qui la distingue d'une sécante qui frôle.
        const p = surCercle(e.a);
        const dir = { x: -Math.sin((e.a * Math.PI) / 180), y: -Math.cos((e.a * Math.PI) / 180) };
        const L = 30;
        const A = { x: p.x - dir.x * L, y: p.y - dir.y * L };
        const B = { x: p.x + dir.x * L, y: p.y + dir.y * L };
        out.push({ k: 'ligne', pts: [A, B], fort });
        out.push({ k: 'point', x: p.x, y: p.y, petit: true, fort });
        out.push(...etiquette(ecarteDuCentre(milieu(p, B), 3)));
        return out;
    }
    if (e.type === 'secante') {
        const p = surCercle(e.a), q = surCercle(e.b);
        const d = { x: q.x - p.x, y: q.y - p.y };
        const L = Math.hypot(d.x, d.y) || 1;
        const u = { x: d.x / L, y: d.y / L };
        const A = { x: p.x - u.x * 12, y: p.y - u.y * 12 };
        const B = { x: q.x + u.x * 12, y: q.y + u.y * 12 };
        out.push({ k: 'ligne', pts: [A, B], fort });
        out.push(...etiquette(decale(auxTroisQuarts(p, q), p, q)));
        return out;
    }
    return out;
}

const milieu = (p, q) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });

/**
 * LE POINT OÙ L'ON POSE LE NUMÉRO — aux trois quarts, et non au milieu.
 *
 * Au milieu, les numéros se tassaient tous près du centre : le milieu d'un
 * rayon est à mi-chemin du centre, celui d'un diamètre EST le centre, et trois
 * étiquettes se recouvraient sur la feuille imprimée. Aux trois quarts, chaque
 * numéro part vers son propre bout de figure.
 */
const auxTroisQuarts = (p, q) => ({ x: p.x + (q.x - p.x) * 0.74, y: p.y + (q.y - p.y) * 0.74 });

/** Décale l'étiquette perpendiculairement au trait, pour ne pas la poser dessus. */
function decale(m, p, q) {
    const d = { x: q.x - p.x, y: q.y - p.y };
    const L = Math.hypot(d.x, d.y) || 1;
    return { x: m.x - (d.y / L) * 4.5, y: m.y + (d.x / L) * 4.5 };
}

/** Pousse un point vers l'extérieur du cercle, pour poser l'étiquette d'un arc. */
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

/**
 * Le SVG d'une figure. Les couleurs sont écrites en dur et non en variables de
 * thème : cette figure part aussi à l'imprimante, et un trait « couleur du
 * texte » y sortirait blanc sur blanc.
 */
export function cercleSvg(traces, { taille = 300, fond = false } = {}) {
    const k = taille / 100;
    const T = (v) => arr(v * k);
    let d = '';
    for (const t of traces) {
        if (t.k === 'cercle' && t.plein) {
            d += `<circle cx="${T(t.x)}" cy="${T(t.y)}" r="${T(t.r)}" fill="#dbeafe"/>`;
        } else if (t.k === 'cercle') {
            d += `<circle cx="${T(t.x)}" cy="${T(t.y)}" r="${T(t.r)}" fill="none"
                stroke="${t.fort ? '#d62728' : '#1a202c'}" stroke-width="${T(t.fort ? 1.5 : 0.7)}"/>`;
        } else if (t.k === 'ligne') {
            const chemin = t.pts.map((p, i) => `${i ? 'L' : 'M'}${T(p.x)} ${T(p.y)}`).join(' ');
            d += `<path d="${chemin}" fill="none" stroke="${t.fort ? '#d62728' : '#6e7684'}"
                stroke-width="${T(t.fort ? 1.5 : 0.7)}" stroke-linecap="round" stroke-linejoin="round"/>`;
        } else if (t.k === 'point') {
            d += `<circle cx="${T(t.x)}" cy="${T(t.y)}" r="${T(t.petit ? 1.1 : 1.5)}"
                fill="${t.fort ? '#d62728' : '#1a202c'}"/>`;
        } else if (t.k === 'texte') {
            if (t.cadre) {
                d += `<circle cx="${T(t.x)}" cy="${T(t.y)}" r="${T(t.taille * 0.72)}"
                    fill="#ffffff" stroke="#1a202c" stroke-width="${T(0.4)}"/>`;
            }
            d += `<text x="${T(t.x)}" y="${T(t.y)}" fill="#1a202c" font-weight="700"
                font-size="${T(t.taille)}" text-anchor="middle" dominant-baseline="central"
                font-family="Helvetica, Arial, sans-serif">${t.t}</text>`;
        }
    }
    const style = fond ? ' style="background:#ffffff;border-radius:10px"' : '';
    return `<svg viewBox="0 0 ${taille} ${taille}" width="${taille}" height="${taille}"
        role="img" aria-label="figure du cercle"${style}>${d}</svg>`;
}
