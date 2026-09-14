// LIRE UN CHEMIN SVG — et savoir le redessiner dans un PDF.
//
// POURQUOI CE MODULE EXISTE. Un dessin de pièce d'échecs sérieux est fait de
// COURBES, pas de polygones : c'est ce qui distingue une silhouette de cheval
// d'un profil taillé à la serpe. À l'écran, un `<path d="…">` suffit — le
// navigateur sait lire la syntaxe SVG. Le PDF, lui, ne la connaît pas : jsPDF
// n'offre que des segments et des courbes de Bézier, en coordonnées RELATIVES
// au point courant.
//
// Il faut donc un lecteur : transformer « M 22,9 C 19.79,9 18,10.79 18,13 … »
// en une suite de déplacements que jsPDF accepte. C'est ce que fait ce module,
// et c'est lui qui permet d'utiliser N'IMPORTE QUEL dessin SVG dans la fiche
// imprimée — y compris ceux qu'on n'a pas dessinés soi-même.
//
// CE QU'IL SAIT LIRE : M m L l H h V v C c S s Q q T t A a Z z. Les commandes
// courtes (S, T) s'appuient sur le point de contrôle précédent, comme le veut
// la spécification.
//
// LES ARCS SONT DE VRAIS ARCS. La planche de pièces de Cburnett dessine les
// boules de la couronne, la mitre du fou et l'œil du cavalier avec des arcs
// elliptiques (« A »). Les approcher par un segment aurait remplacé chaque
// boule par un trait — on ne s'en serait aperçu qu'à l'écran. On convertit
// donc l'arc en courbes de Bézier, par la méthode de la spécification :
// paramétrage par le centre, puis découpe en morceaux d'au plus un quart de
// tour, où l'approximation d'un arc par une cubique est exacte à 10⁻⁴ près.

/** Découpe la chaîne `d` en commandes { c, args[] }. */
export function lireChemin(d) {
    const out = [];
    // Une commande, puis ses nombres : le SVG autorise les virgules, les
    // espaces, et même le signe moins comme séparateur (« 10-5 » = 10, −5).
    const jetons = String(d).match(/[MmLlHhVvCcSsQqTtAaZz]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) || [];
    let i = 0;
    while (i < jetons.length) {
        const c = jetons[i++];
        if (!/[A-Za-z]/.test(c)) continue;              // nombre orphelin : on saute
        const combien = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 }[c.toUpperCase()];
        if (combien === 0) { out.push({ c, args: [] }); continue; }
        // Une commande peut porter plusieurs jeux d'arguments à la suite :
        // « L 1,2 3,4 » vaut deux L. Après un M, les suivants sont des L.
        let premier = true;
        while (i + combien <= jetons.length && !/[A-Za-z]/.test(jetons[i])) {
            const args = jetons.slice(i, i + combien).map(Number);
            i += combien;
            const cc = premier ? c : (c === 'M' ? 'L' : c === 'm' ? 'l' : c);
            out.push({ c: cc, args });
            premier = false;
        }
    }
    return out;
}

/**
 * Déroule un chemin en SOUS-CHEMINS de segments absolus.
 *
 * Chaque sous-chemin est `{ depart:[x,y], pas:[…], ferme:boolean }` où un pas
 * vaut soit `{ l:[x,y] }` (segment), soit `{ c:[x1,y1,x2,y2,x,y] }` (Bézier
 * cubique). Les Bézier quadratiques sont converties en cubiques : jsPDF ne
 * connaît que les cubiques, et la conversion est exacte.
 *
 * @param {string} d
 * @param {(x:number,y:number)=>number[]} [placer] - repère de sortie
 */
export function deroulerChemin(d, placer = (x, y) => [x, y]) {
    const cmds = lireChemin(d);
    const chemins = [];
    let cur = null;                       // sous-chemin en cours
    let x = 0, y = 0, dx = 0, dy = 0;     // point courant, et début du sous-chemin
    let cx = null, cy = null;             // dernier point de contrôle (pour S / T)
    let dernier = '';

    const ouvrir = () => { cur = { depart: placer(x, y), pas: [], ferme: false }; chemins.push(cur); };
    const ligne = (nx, ny) => {
        if (!cur) ouvrir();
        cur.pas.push({ l: placer(nx, ny) });
        x = nx; y = ny; cx = cy = null;
    };
    const courbe = (x1, y1, x2, y2, nx, ny) => {
        if (!cur) ouvrir();
        cur.pas.push({ c: [...placer(x1, y1), ...placer(x2, y2), ...placer(nx, ny)] });
        cx = x2; cy = y2; x = nx; y = ny;
    };

    for (const { c, args } of cmds) {
        const rel = c === c.toLowerCase() && c !== 'Z';
        const a = args.slice();
        switch (c.toUpperCase()) {
        case 'M':
            x = rel ? x + a[0] : a[0];
            y = rel ? y + a[1] : a[1];
            dx = x; dy = y; cx = cy = null;
            ouvrir();
            break;
        case 'L':
            ligne(rel ? x + a[0] : a[0], rel ? y + a[1] : a[1]);
            break;
        case 'H':
            ligne(rel ? x + a[0] : a[0], y);
            break;
        case 'V':
            ligne(x, rel ? y + a[0] : a[0]);
            break;
        case 'C':
            courbe(rel ? x + a[0] : a[0], rel ? y + a[1] : a[1],
                rel ? x + a[2] : a[2], rel ? y + a[3] : a[3],
                rel ? x + a[4] : a[4], rel ? y + a[5] : a[5]);
            break;
        case 'S': {
            // Le premier point de contrôle est le SYMÉTRIQUE du précédent.
            const rx = (dernier && 'CS'.includes(dernier.toUpperCase())) ? 2 * x - cx : x;
            const ry = (dernier && 'CS'.includes(dernier.toUpperCase())) ? 2 * y - cy : y;
            courbe(rx, ry, rel ? x + a[0] : a[0], rel ? y + a[1] : a[1],
                rel ? x + a[2] : a[2], rel ? y + a[3] : a[3]);
            break;
        }
        case 'Q': {
            const qx = rel ? x + a[0] : a[0], qy = rel ? y + a[1] : a[1];
            const ex = rel ? x + a[2] : a[2], ey = rel ? y + a[3] : a[3];
            // Une quadratique EST une cubique : les deux points de contrôle
            // valent le point courant (ou l'arrivée) plus deux tiers du sommet.
            const p = x, q = y;
            courbe(p + (2 / 3) * (qx - p), q + (2 / 3) * (qy - q),
                ex + (2 / 3) * (qx - ex), ey + (2 / 3) * (qy - ey), ex, ey);
            cx = qx; cy = qy;
            break;
        }
        case 'T': {
            const qx = (dernier && 'QT'.includes(dernier.toUpperCase())) ? 2 * x - cx : x;
            const qy = (dernier && 'QT'.includes(dernier.toUpperCase())) ? 2 * y - cy : y;
            const ex = rel ? x + a[0] : a[0], ey = rel ? y + a[1] : a[1];
            const p = x, q = y;
            courbe(p + (2 / 3) * (qx - p), q + (2 / 3) * (qy - q),
                ex + (2 / 3) * (qx - ex), ey + (2 / 3) * (qy - ey), ex, ey);
            cx = qx; cy = qy;
            break;
        }
        case 'A': {
            const ex = rel ? x + a[5] : a[5], ey = rel ? y + a[6] : a[6];
            const morceaux = arcVersCourbes(x, y, a[0], a[1], a[2], a[3], a[4], ex, ey);
            if (!morceaux.length) ligne(ex, ey);          // rayon nul : c'est un segment
            else morceaux.forEach(m => courbe(m[0], m[1], m[2], m[3], m[4], m[5]));
            cx = cy = null;
            break;
        }
        case 'Z':
            if (cur) { cur.ferme = true; x = dx; y = dy; }
            cur = null;
            break;
        default: break;
        }
        dernier = c;
    }
    return chemins;
}

/**
 * Dessine un chemin SVG dans un document jsPDF.
 *
 * jsPDF prend des DÉPLACEMENTS relatifs au point courant : on convertit donc
 * les points absolus en écarts successifs, exactement comme pour un polygone.
 *
 * @param {Object} doc
 * @param {string} d - l'attribut `d` du chemin
 * @param {(x:number,y:number)=>number[]} placer - repère de sortie (mm)
 * @param {string} style - 'F', 'S' ou 'FD', comme dans jsPDF
 */
export function dessinerCheminPdf(doc, d, placer, style = 'FD') {
    deroulerChemin(d, placer).forEach(sc => {
        if (!sc.pas.length) return;
        let [px, py] = sc.depart;
        const ecarts = [];
        sc.pas.forEach(p => {
            if (p.l) {
                ecarts.push([p.l[0] - px, p.l[1] - py]);
                [px, py] = p.l;
            } else {
                const [x1, y1, x2, y2, x, y] = p.c;
                ecarts.push([x1 - px, y1 - py, x2 - px, y2 - py, x - px, y - py]);
                px = x; py = y;
            }
        });
        doc.lines(ecarts, sc.depart[0], sc.depart[1], [1, 1], style, sc.ferme);
    });
}

/**
 * UN ARC ELLIPTIQUE EN COURBES DE BÉZIER.
 *
 * La spécification SVG donne l'arc par ses EXTRÉMITÉS ; pour le dessiner il
 * faut son CENTRE. La conversion est celle de l'annexe F.6 de la
 * spécification : on ramène l'ellipse au cercle, on trouve le centre, on en
 * tire les angles de départ et de balayage, puis on découpe en morceaux d'au
 * plus un quart de tour — au-delà, l'approximation par une cubique se voit.
 *
 * @returns {number[][]} des sextuplets [x1,y1,x2,y2,x,y], absolus
 */
export function arcVersCourbes(x1, y1, rx, ry, angle, grand, sens, x2, y2) {
    rx = Math.abs(rx); ry = Math.abs(ry);
    if (!rx || !ry || (x1 === x2 && y1 === y2)) return [];
    const phi = (angle * Math.PI) / 180;
    const cos = Math.cos(phi), sin = Math.sin(phi);

    // 1. Le segment, ramené dans le repère de l'ellipse.
    const dx2 = (x1 - x2) / 2, dy2 = (y1 - y2) / 2;
    const ux = cos * dx2 + sin * dy2;
    const uy = -sin * dx2 + cos * dy2;

    // 2. Des rayons trop petits ne peuvent pas joindre les deux points : la
    //    spécification demande de les AGRANDIR, pas de renoncer.
    const trop = (ux * ux) / (rx * rx) + (uy * uy) / (ry * ry);
    if (trop > 1) { const k = Math.sqrt(trop); rx *= k; ry *= k; }

    // 3. Le centre.
    const num = rx * rx * ry * ry - rx * rx * uy * uy - ry * ry * ux * ux;
    const den = rx * rx * uy * uy + ry * ry * ux * ux;
    let coef = Math.sqrt(Math.max(0, num / den));
    if (grand === sens) coef = -coef;
    const cxp = (coef * rx * uy) / ry;
    const cyp = (-coef * ry * ux) / rx;
    const cx = cos * cxp - sin * cyp + (x1 + x2) / 2;
    const cy = sin * cxp + cos * cyp + (y1 + y2) / 2;

    // 4. Les angles.
    const angleDe = (vx, vy) => {
        const n = Math.hypot(vx, vy);
        const a = Math.acos(Math.min(1, Math.max(-1, vx / n)));
        return vy < 0 ? -a : a;
    };
    const t1 = angleDe((ux - cxp) / rx, (uy - cyp) / ry);
    let dt = angleDe((ux - cxp) / rx, (uy - cyp) / ry)
        - angleDe((-ux - cxp) / rx, (-uy - cyp) / ry);
    dt = -dt;
    if (!sens && dt > 0) dt -= 2 * Math.PI;
    if (sens && dt < 0) dt += 2 * Math.PI;

    // 5. La découpe : un quart de tour au plus par morceau.
    const morceaux = Math.ceil(Math.abs(dt) / (Math.PI / 2));
    const pas = dt / morceaux;
    // Le facteur qui rend la cubique tangente à l'arc à ses deux bouts.
    const k = (4 / 3) * Math.tan(pas / 4);
    const point = (t) => {
        const c = Math.cos(t), s = Math.sin(t);
        return [cx + rx * cos * c - ry * sin * s, cy + rx * sin * c + ry * cos * s];
    };
    const derivee = (t) => {
        const c = Math.cos(t), s = Math.sin(t);
        return [-rx * cos * s - ry * sin * c, -rx * sin * s + ry * cos * c];
    };

    const out = [];
    let t = t1;
    for (let i = 0; i < morceaux; i++) {
        const tt = t + pas;
        const [px, py] = point(t), [qx, qy] = point(tt);
        const [dpx, dpy] = derivee(t), [dqx, dqy] = derivee(tt);
        out.push([px + k * dpx, py + k * dpy, qx - k * dqx, qy - k * dqy, qx, qy]);
        t = tt;
    }
    return out;
}

/**
 * Réécrit des sous-chemins déroulés en attribut « d ».
 * Sert à FIGER une transformation : le dessin sorti n'en porte plus aucune.
 */
export function ecrireChemin(chemins, decimales = 2) {
    const n = (v) => Number(v.toFixed(decimales));
    return chemins.map(sc => {
        let t = `M ${n(sc.depart[0])} ${n(sc.depart[1])}`;
        sc.pas.forEach(p => {
            t += p.l ? ` L ${n(p.l[0])} ${n(p.l[1])}`
                : ` C ${p.c.map(n).join(' ')}`;
        });
        return t + (sc.ferme ? ' Z' : '');
    }).join(' ');
}

/**
 * LES TRANSFORMATIONS SVG, réduites à une matrice.
 *
 * Un fichier réel en pose sur les groupes ET sur les formes : la planche de
 * Cburnett décale chaque pièce d'un « translate », et incline l'œil du
 * cavalier d'un « matrix ». Les ignorer empilerait les douze pièces au même
 * endroit.
 *
 * La matrice est [a, b, c, d, e, f], comme en SVG : x' = a·x + c·y + e.
 */
export const IDENTITE = [1, 0, 0, 1, 0, 0];

export function lireTransformation(texte) {
    let m = IDENTITE;
    if (!texte) return m;
    const re = /(matrix|translate|scale|rotate)\s*\(([^)]*)\)/gi;
    let t;
    while ((t = re.exec(texte))) {
        const v = t[2].trim().split(/[\s,]+/).map(Number);
        let n = IDENTITE;
        if (t[1] === 'matrix') n = v.slice(0, 6);
        else if (t[1] === 'translate') n = [1, 0, 0, 1, v[0] || 0, v[1] || 0];
        else if (t[1] === 'scale') n = [v[0] || 1, 0, 0, v.length > 1 ? v[1] : v[0] || 1, 0, 0];
        else if (t[1] === 'rotate') {
            const r = ((v[0] || 0) * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
            n = [c, s, -s, c, 0, 0];
            if (v.length === 3) {
                n = composer([1, 0, 0, 1, v[1], v[2]], composer(n, [1, 0, 0, 1, -v[1], -v[2]]));
            }
        }
        m = composer(m, n);
    }
    return m;
}

/** A puis B — dans l'ordre où le SVG les applique. */
export function composer(A, B) {
    return [
        A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1],
        A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3],
        A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5]
    ];
}

export const appliquer = (M, x, y) => [M[0] * x + M[2] * y + M[4], M[1] * x + M[3] * y + M[5]];

/** L'échelle moyenne d'une matrice — pour ajuster l'épaisseur d'un trait. */
export const echelleDe = (M) => Math.sqrt(Math.abs(M[0] * M[3] - M[1] * M[2])) || 1;

/** La boîte englobante d'un chemin — sommets et points de contrôle compris. */
export function boiteChemin(d) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const point = (x, y) => {
        x0 = Math.min(x0, x); x1 = Math.max(x1, x);
        y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    };
    deroulerChemin(d).forEach(sc => {
        point(sc.depart[0], sc.depart[1]);
        sc.pas.forEach(p => {
            if (p.l) point(p.l[0], p.l[1]);
            // Les points de contrôle bornent la courbe : la boîte qu'ils
            // donnent est un peu large, jamais trop étroite. Pour cadrer un
            // dessin, mieux vaut large que rogné.
            else for (let i = 0; i < 6; i += 2) point(p.c[i], p.c[i + 1]);
        });
    });
    return { x0, y0, x1, y1 };
}
