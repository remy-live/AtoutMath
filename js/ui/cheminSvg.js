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
// CE QU'IL SAIT LIRE : M m L l H h V v C c S s Q q T t Z z. Les commandes
// courtes (S, T) s'appuient sur le point de contrôle précédent, comme le veut
// la spécification. Les arcs (A) sont approchés par un segment — aucune des
// pièces qu'on utilise n'en contient, et un arc silencieusement faux serait
// pire qu'un arc grossier signalé.

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
        case 'A':
            // Aucune des pièces utilisées n'en contient. Plutôt qu'un arc faux
            // qui passerait inaperçu, on tire le segment et l'on laisse la
            // trace visible : `arcs` le signale à l'appelant.
            ligne(rel ? x + a[5] : a[5], rel ? y + a[6] : a[6]);
            (chemins.arcs = chemins.arcs || []).push(a);
            break;
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
