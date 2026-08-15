// UN TRACÉ SVG, REDIT EN SEGMENTS — pour pouvoir l'imprimer.
//
// Les hiéroglyphes de Rémy sont des chemins SVG. À l'écran, le navigateur les
// dessine ; dans un PDF, personne ne les lit : jsPDF ne connaît que des
// segments et des courbes de Bézier, données EN RELATIF depuis le point
// courant. Ce module fait la traduction, et rien d'autre.
//
// Il ne gère que ce que contiennent les tracés dont on dispose — M, L, C, Z,
// en absolu, avec la répétition implicite des paramètres (« C a b c d e f
// g h i j k l » vaut deux courbes). Les commandes relatives (m, l, c) sont
// acceptées aussi : elles ne coûtent qu'une addition, et un fichier ré-exporté
// depuis un autre logiciel en contiendra tôt ou tard.
//
// Ce qu'il NE FAIT PAS, il le dit : arcs (A), quadratiques (Q), raccourcis
// (S, T) et lignes d'axe (H, V) lèvent une erreur nommée plutôt que de
// produire un dessin faux en silence. Un glyphe à moitié tracé sur une
// photocopie ne se remarque pas ; une exception, si.

/** Les nombres d'une commande SVG, séparés par virgules, espaces ou signes. */
function nombres(texte) {
    const out = [];
    const re = /-?\d*\.?\d+(?:[eE][-+]?\d+)?/g;
    let m;
    while ((m = re.exec(texte))) out.push(parseFloat(m[0]));
    return out;
}

/**
 * Découpe un tracé en SOUS-CHEMINS, chacun décrit par son point de départ et
 * ses segments.
 *
 * @param {string} d - l'attribut « d » d'un <path>
 * @returns {Array<{depart: [number, number], segments: Array<Array<number>>, ferme: boolean}>}
 *   Un segment vaut soit [x, y] — une droite —, soit
 *   [x1, y1, x2, y2, x, y] — une cubique. Tout est RELATIF au point précédent,
 *   c'est la convention de `doc.lines` de jsPDF.
 */
export function sousChemins(d) {
    const jetons = String(d || '').match(/[MmLlCcZzHhVvSsQqTtAa][^MmLlCcZzHhVvSsQqTtAa]*/g) || [];
    const chemins = [];
    let courant = null;
    let x = 0, y = 0;          // le point courant, en absolu
    let departX = 0, departY = 0;

    const pousser = (seg) => {
        if (!courant) throw new Error('tracé SVG : un segment avant tout « M »');
        courant.segments.push(seg);
    };

    for (const jeton of jetons) {
        const cmd = jeton[0];
        const n = nombres(jeton.slice(1));
        const relatif = cmd === cmd.toLowerCase();

        switch (cmd.toUpperCase()) {
        case 'M': {
            for (let i = 0; i + 1 < n.length; i += 2) {
                const px = relatif ? x + n[i] : n[i];
                const py = relatif ? y + n[i + 1] : n[i + 1];
                if (i === 0) {
                    // Un « M » ouvre un sous-chemin ; les paires suivantes
                    // sont des « L » implicites, c'est la norme.
                    courant = { depart: [px, py], segments: [], ferme: false };
                    chemins.push(courant);
                    departX = px; departY = py;
                } else {
                    pousser([px - x, py - y]);
                }
                x = px; y = py;
            }
            break;
        }
        case 'L': {
            for (let i = 0; i + 1 < n.length; i += 2) {
                const px = relatif ? x + n[i] : n[i];
                const py = relatif ? y + n[i + 1] : n[i + 1];
                pousser([px - x, py - y]);
                x = px; y = py;
            }
            break;
        }
        case 'C': {
            for (let i = 0; i + 5 < n.length; i += 6) {
                const abs = (k) => relatif
                    ? [x + n[i + k], y + n[i + k + 1]]
                    : [n[i + k], n[i + k + 1]];
                const [c1x, c1y] = abs(0);
                const [c2x, c2y] = abs(2);
                const [px, py] = abs(4);
                pousser([c1x - x, c1y - y, c2x - x, c2y - y, px - x, py - y]);
                x = px; y = py;
            }
            break;
        }
        case 'Z': {
            if (courant) {
                courant.ferme = true;
                x = departX; y = departY;
            }
            break;
        }
        default:
            throw new Error(`tracé SVG : commande « ${cmd} » non gérée`);
        }
    }
    return chemins.filter(c => c.segments.length);
}

/**
 * Dessine un tracé SVG dans un PDF, à l'échelle et à la place voulues.
 *
 * @param {Object} doc     - le document jsPDF
 * @param {string} d       - l'attribut « d »
 * @param {Object} cadre   - { x, y, k } : le coin, et le facteur d'échelle
 * @param {string} [style] - 'F' rempli, 'S' au trait, 'FD' les deux
 */
export function dessinerChemin(doc, d, cadre, style = 'F') {
    const chemins = sousChemins(d);
    // LES TROUS SONT DES SOUS-CHEMINS, ET IL FAUT LES ÉVIDER.
    //
    // Un « path » SVG remplit ses sous-chemins d'un seul tenant : la boucle
    // intérieure d'une fleur de lotus est un TROU, découpé dans la forme par la
    // règle de remplissage. jsPDF, lui, ne sait remplir qu'un sous-chemin à la
    // fois : chaque trou ressortait donc en aplat noir POSÉ SUR la forme, et la
    // fleur devenait une tache.
    //
    // On les repeint donc en blanc, dans l'ordre où ils viennent — l'extérieur
    // d'abord, les trous ensuite, comme dans le fichier. C'est exact sur une
    // feuille, qui est blanche ; et c'est la seule façon portable de le faire
    // avec l'interface publique de jsPDF.
    const contour = chemins[0] ? boiteSousChemin(chemins[0]) : null;
    const remplit = style.includes('F');
    chemins.forEach((c, i) => {
        const x0 = cadre.x + c.depart[0] * cadre.k;
        const y0 = cadre.y + c.depart[1] * cadre.k;
        const trou = remplit && i > 0 && contour && dedans(boiteSousChemin(c), contour);
        if (trou) doc.setFillColor(255, 255, 255);
        // `doc.lines` applique lui-même l'échelle aux segments : on lui donne
        // donc les valeurs BRUTES, et le facteur à part. Les mettre à l'échelle
        // ici les multiplierait deux fois.
        doc.lines(c.segments, x0, y0, [cadre.k, cadre.k], trou ? 'F' : style, c.ferme);
        if (trou && cadre.encre) doc.setFillColor(...cadre.encre);
    });
}

/** Le rectangle d'un sous-chemin déjà découpé. */
function boiteSousChemin(c) {
    let [x, y] = c.depart;
    let minX = x, maxX = x, minY = y, maxY = y;
    for (const s of c.segments) {
        for (let i = 0; i + 1 < s.length; i += 2) {
            minX = Math.min(minX, x + s[i]); maxX = Math.max(maxX, x + s[i]);
            minY = Math.min(minY, y + s[i + 1]); maxY = Math.max(maxY, y + s[i + 1]);
        }
        x += s[s.length - 2]; y += s[s.length - 1];
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** `a` tient-il dans `b` ? Un demi-point de tolérance pour les arrondis. */
function dedans(a, b) {
    return a.x >= b.x - 0.5 && a.y >= b.y - 0.5
        && a.x + a.w <= b.x + b.w + 0.5 && a.y + a.h <= b.y + b.h + 0.5;
}

/**
 * Le rectangle qui contient un tracé — utile pour le cadrer sans connaître
 * d'avance ce qu'il dessine.
 *
 * Les points de contrôle des courbes sont pris en compte : ils débordent
 * parfois de la courbe, mais une boîte un peu large ne coupe jamais un glyphe,
 * là où une boîte trop juste en rogne un bord.
 */
export function boiteChemin(d) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const c of sousChemins(d)) {
        let [x, y] = c.depart;
        const voir = (px, py) => {
            minX = Math.min(minX, px); maxX = Math.max(maxX, px);
            minY = Math.min(minY, py); maxY = Math.max(maxY, py);
        };
        voir(x, y);
        for (const s of c.segments) {
            for (let i = 0; i + 1 < s.length; i += 2) voir(x + s[i], y + s[i + 1]);
            x += s[s.length - 2]; y += s[s.length - 1];
        }
    }
    if (!Number.isFinite(minX)) return null;
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}
