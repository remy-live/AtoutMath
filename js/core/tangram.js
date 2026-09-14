// LE TANGRAM — sept pièces, une figure, et des aires qui se comparent.
//
// Le tangram n'est pas un puzzle décoratif : c'est l'outil qui fait TOUCHER
// l'aire. Deux pièces de formes différentes peuvent couvrir exactement la même
// surface — le carré et le triangle moyen valent tous deux un huitième de la
// figure — et il faut quatre petits triangles pour recouvrir un grand. Un
// élève qui a posé les pièces sait cela avec ses mains avant de le lire.
//
// LA DÉCOUPE. Tout est exprimé dans un carré de côté 8, d'aire 64, où chaque
// sommet tombe sur un entier. Les sept pièces valent alors 16, 16, 8, 8, 8, 4
// et 4 : le quart, le quart, le huitième trois fois, le seizième deux fois.
//
// LES FIGURES ne sont pas écrites à la main. Elles ont été trouvées par un
// solveur qui pave chaque silhouette avec les sept pièces, et le test du dépôt
// revérifie chacune : aucun trou, aucun chevauchement, rien qui dépasse. Une
// figure fausse ne peut donc pas se glisser dans le jeu.
//
// Aucune rotation de 45° n'est nécessaire : toutes les figures se montent avec
// des quarts de tour, plus le retournement du seul parallélogramme — qui est
// justement la pièce dont l'image miroir n'est pas superposable à elle-même.

/** Les sept pièces, dans le carré de référence de côté 8. */
export const PIECES = [
    {
        id: 'grand1', nom: 'Grand triangle', famille: 'grand',
        sommets: [[0, 0], [8, 0], [4, 4]], aire: 16, fraction: '1/4', couleur: '#ef4444'
    },
    {
        id: 'grand2', nom: 'Grand triangle', famille: 'grand',
        sommets: [[0, 0], [8, 0], [4, 4]], aire: 16, fraction: '1/4', couleur: '#f97316'
    },
    {
        id: 'moyen', nom: 'Triangle moyen', famille: 'moyen',
        sommets: [[0, 0], [0, 4], [4, 4]], aire: 8, fraction: '1/8', couleur: '#22c55e'
    },
    {
        id: 'parallelo', nom: 'Parallélogramme', famille: 'parallelo',
        sommets: [[0, 0], [2, 2], [2, 6], [0, 4]], aire: 8, fraction: '1/8', couleur: '#a855f7'
    },
    {
        id: 'carre', nom: 'Carré', famille: 'carre',
        sommets: [[2, 0], [4, 2], [2, 4], [0, 2]], aire: 8, fraction: '1/8', couleur: '#eab308'
    },
    {
        id: 'petit1', nom: 'Petit triangle', famille: 'petit',
        sommets: [[0, 0], [2, 2], [0, 4]], aire: 4, fraction: '1/16', couleur: '#3b82f6'
    },
    {
        id: 'petit2', nom: 'Petit triangle', famille: 'petit',
        sommets: [[0, 0], [2, 2], [0, 4]], aire: 4, fraction: '1/16', couleur: '#06b6d4'
    }
];

export const AIRE_TOTALE = 64;
export const pieceDe = (id) => PIECES.find(p => p.id === id) || PIECES[0];
/** Le parallélogramme est la seule pièce que son miroir ne recouvre pas. */
export const retournable = (id) => pieceDe(id).famille === 'parallelo';

/**
 * Les figures : silhouette + placement des sept pièces.
 * Un placement s'écrit [pièce, quarts de tour, retournée, dx, dy].
 */
export const FIGURES = [
    {
        id: 'carre', nom: 'Le carré', ordre: 1,
        indice: 'La figure de départ : c\'est le carré d\'origine, celui qu\'on a découpé.',
        silhouette: [[0, 0], [8, 0], [8, 8], [0, 8]],
        placements: [
            ['grand1', 0, 0, 0, 0], ['grand2', 3, 0, 0, 8], ['parallelo', 0, 1, 8, 0],
            ['petit1', 2, 0, 6, 6], ['carre', 0, 0, 2, 4], ['moyen', 3, 0, 4, 8],
            ['petit2', 3, 0, 0, 8]
        ]
    },
    {
        id: 'triangle', nom: 'Le grand triangle', ordre: 2,
        indice: 'Les deux grands triangles font toute la base ; le reste monte au sommet.',
        silhouette: [[0, 0], [16, 0], [8, 8]],
        placements: [
            ['grand1', 0, 0, 0, 0], ['grand2', 0, 0, 8, 0], ['moyen', 3, 0, 4, 4],
            ['parallelo', 0, 0, 8, 0], ['petit1', 0, 0, 10, 2], ['petit2', 1, 0, 8, 4],
            ['carre', 0, 0, 6, 4]
        ]
    },
    {
        id: 'parallelogramme', nom: 'Le parallélogramme', ordre: 3,
        indice: 'Un carré poussé de côté : même aire, mais plus rien n\'est droit.',
        silhouette: [[0, 0], [8, 0], [16, 8], [8, 8]],
        placements: [
            ['grand1', 0, 0, 0, 0], ['grand2', 1, 0, 8, 0], ['parallelo', 0, 0, 8, 0],
            ['petit1', 0, 0, 10, 2], ['moyen', 0, 0, 8, 4], ['carre', 0, 0, 10, 4],
            ['petit2', 3, 0, 12, 8]
        ]
    },
    {
        id: 'noeud', nom: 'Le nœud papillon', ordre: 4,
        indice: 'Deux pointes rentrantes, une de chaque côté : les grands triangles les encadrent.',
        silhouette: [[0, 0], [12, 0], [8, 4], [12, 8], [0, 8], [4, 4]],
        placements: [
            ['grand1', 0, 0, 0, 0], ['moyen', 1, 0, 12, 0], ['parallelo', 0, 1, 8, 0],
            ['petit1', 2, 0, 6, 6], ['carre', 0, 0, 2, 4], ['grand2', 2, 0, 12, 8],
            ['petit2', 3, 0, 0, 8]
        ]
    },
    {
        id: 'bateau', nom: 'Le bateau', ordre: 5,
        indice: 'La voile est un grand triangle posé sur la pointe ; la coque est un trapèze.',
        silhouette: [[4, 4], [8, 8], [16, 8], [12, 12], [4, 12], [0, 8]],
        placements: [
            ['grand1', 1, 0, 4, 4], ['parallelo', 0, 0, 4, 4], ['petit1', 0, 0, 6, 6],
            ['grand2', 0, 0, 8, 8], ['moyen', 0, 0, 4, 8], ['carre', 0, 0, 6, 8],
            ['petit2', 3, 0, 8, 12]
        ]
    }
];

export const figureDe = (id) => FIGURES.find(f => f.id === id) || FIGURES[0];

// --- Géométrie ---------------------------------------------------------------

export function aire(poly) {
    let s = 0;
    for (let i = 0; i < poly.length; i++) {
        const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length];
        s += x1 * y2 - x2 * y1;
    }
    return Math.abs(s) / 2;
}

export function dedans(poly, x, y) {
    let ok = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, yi] = poly[i], [xj, yj] = poly[j];
        if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) ok = !ok;
    }
    return ok;
}

export function boite(poly) {
    return {
        x0: Math.min(...poly.map(p => p[0])), y0: Math.min(...poly.map(p => p[1])),
        x1: Math.max(...poly.map(p => p[0])), y1: Math.max(...poly.map(p => p[1]))
    };
}

export function centre(poly) {
    return [poly.reduce((s, p) => s + p[0], 0) / poly.length,
        poly.reduce((s, p) => s + p[1], 0) / poly.length];
}

/** Un quart de tour à la fois : (x, y) → (−y, x). */
export function tourner(poly, quarts) {
    return poly.map(([x, y]) => {
        for (let k = 0; k < ((quarts % 4) + 4) % 4; k++) { const t = x; x = -y; y = t; }
        return [x, y];
    });
}

export const retourner = (poly) => poly.map(([x, y]) => [-x, y]);

/** Les sommets d'une pièce posée : retournée, tournée, puis décalée. */
export function sommetsPlaces(idPiece, quarts, flip, dx, dy) {
    const base = pieceDe(idPiece).sommets;
    return tourner(flip ? retourner(base) : base, quarts).map(([x, y]) => [x + dx, y + dy]);
}

/** Les sept pièces d'une figure, déjà posées. */
export function piecesPlacees(figure) {
    return figure.placements.map(([id, q, f, dx, dy]) => ({
        id, quarts: q, flip: f, dx, dy, sommets: sommetsPlaces(id, q, f, dx, dy)
    }));
}

/**
 * Le contrôle qui protège le jeu : la figure est-elle un VRAI pavage ?
 * On échantillonne finement — décalé d'un tiers pour ne jamais tomber sur une
 * arête — et on compte les trous, les chevauchements et les débordements.
 */
export function verifierFigure(figure, pas = 0.1) {
    return verifierPavage(figure.silhouette, piecesPlacees(figure).map(p => p.sommets), pas);
}

/**
 * LE MÊME CONTRÔLE, MAIS SUR LE PAVAGE QU'ON LUI DONNE.
 *
 * Rémy : « fais attention, pour une même figure il peut y avoir plusieurs
 * solutions ; du coup l'aimantation ne fonctionne pas si c'est une autre
 * solution ». C'est vrai de presque toutes les silhouettes de tangram, et
 * c'était une faute de conception : le jeu comparait le travail de l'élève à
 * UNE disposition de référence, celle qu'on avait écrite dans le catalogue.
 * Une autre solution, aussi juste, n'était pas reconnue.
 *
 * La règle du tangram ne parle pas de disposition de référence : les sept
 * pièces couvrent la silhouette, sans trou, sans chevauchement et sans
 * déborder. C'est cela qu'on mesure ici, et c'est vrai de TOUTES les
 * solutions — y compris celles auxquelles personne n'avait pensé.
 *
 * @param {Array} silhouette  le contour à remplir
 * @param {Array} polys       les pièces posées, en coordonnées du monde
 * @param {number} pas        la finesse de l'échantillonnage
 */
export function verifierPavage(silhouette, polys, pas = 0.1) {
    const b = boite(silhouette);
    let trous = 0, doubles = 0, dehors = 0;
    // Décalé d'un tiers de rien : on ne veut jamais tomber pile sur une arête,
    // où « dedans » n'a pas de réponse franche.
    for (let x = b.x0 - 1; x < b.x1 + 1; x += pas) for (let y = b.y0 - 1; y < b.y1 + 1; y += pas) {
        const px = x + 0.0371, py = y + 0.0613;
        const dansSilhouette = dedans(silhouette, px, py);
        let n = 0;
        for (const p of polys) if (dedans(p, px, py)) n++;
        if (dansSilhouette && n === 0) trous++;
        if (n > 1) doubles++;
        if (!dansSilhouette && n > 0) dehors++;
    }
    return { trous, doubles, dehors, aire: aire(silhouette) };
}

// --- Ce que le tangram fait apprendre ----------------------------------------

/**
 * Une question d'aire posée à la fin, tirée des pièces elles-mêmes. Le tangram
 * ne sert à rien si l'on repart sans avoir vu que le carré et le triangle
 * moyen couvrent la même surface.
 */
export const QUESTIONS = [
    {
        id: 'petits-dans-grand',
        texte: 'Combien de PETITS triangles faut-il pour recouvrir exactement un GRAND triangle ?',
        choix: ['2', '3', '4', '8'], reponse: '4',
        explication: 'Le petit triangle vaut 4 et le grand 16 : 16 ÷ 4 = 4. Pose-les l\'un sur l\'autre, tu verras.'
    },
    {
        id: 'carre-et-moyen',
        texte: 'Le CARRÉ et le TRIANGLE MOYEN ont-ils la même aire ?',
        choix: ['Oui, exactement', 'Non, le carré est plus grand', 'Non, le triangle est plus grand'],
        reponse: 'Oui, exactement',
        explication: 'Deux formes différentes, la même surface : 8 chacune, soit un huitième de la figure. '
            + 'C\'est toute la leçon du tangram — l\'aire ne se lit pas à la forme.'
    },
    {
        id: 'fraction-grand',
        texte: 'Quelle fraction de la figure entière un GRAND triangle occupe-t-il ?',
        choix: ['1/4', '1/6', '1/8', '1/16'], reponse: '1/4',
        explication: '16 sur 64, soit un quart. Les deux grands triangles font donc à eux seuls la moitié.'
    },
    {
        id: 'fraction-petit',
        texte: 'Quelle fraction de la figure entière un PETIT triangle occupe-t-il ?',
        choix: ['1/8', '1/12', '1/16', '1/32'], reponse: '1/16',
        explication: '4 sur 64, soit un seizième. Il en faudrait seize pour refaire la figure.'
    },
    {
        id: 'moitie',
        texte: 'Quelles pièces suffisent, à elles deux, à couvrir la MOITIÉ de la figure ?',
        choix: ['Les deux grands triangles', 'Le carré et le parallélogramme',
            'Les deux petits triangles', 'Le carré et le triangle moyen'],
        reponse: 'Les deux grands triangles',
        explication: '16 + 16 = 32, et la figure entière vaut 64. Les cinq autres pièces se partagent l\'autre moitié.'
    },
    {
        id: 'parallelo-miroir',
        texte: 'Quelle est la seule pièce qu\'il faut parfois RETOURNER pour qu\'elle rentre ?',
        choix: ['Le parallélogramme', 'Le carré', 'Le triangle moyen', 'Un grand triangle'],
        reponse: 'Le parallélogramme',
        explication: 'Toutes les autres pièces se superposent à leur image dans un miroir. '
            + 'Pas le parallélogramme : il en existe deux versions, et une seule convient.'
    }
];

export const questionDe = (rng) => rng.pick(QUESTIONS);
