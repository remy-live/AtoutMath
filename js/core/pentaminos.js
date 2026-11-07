// LES PENTAMINOS — douze pièces de cinq cases, et un rectangle à remplir.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 29 octobre, après avoir demandé « penses tu à d'autres jeux, d'autres
// énigmes que l'on manipule ? » et vu quatre maquettes : « les penamios, ca me
// va ». Le jeu est validé tel qu'il l'a vu — quatre pièces dans un 4 × 5 pour
// commencer, et non douze dans un 6 × 10.
//
// ── « FACILE » EST UNE CONTRAINTE MATHÉMATIQUE, PAS D'INTERFACE ─────────────
//
// Douze pentaminos dans un 6 × 10, c'est deux mille trois cent trente-neuf
// solutions et une demi-heure de tâtonnement : un élève de sixième n'y arrive
// pas, et un jeu qu'on ne réussit pas la première fois ne se rouvre pas. Le
// premier niveau tient donc en QUATRE pièces, et c'est le rectangle qui porte
// la difficulté, pas le nombre de pièces à retourner dans sa tête.
//
// ── CE QUE L'ÉLÈVE APPREND SANS QU'ON LE LUI DISE ──────────────────────────
//
// Chaque pièce vaut cinq cases. Le rectangle doit donc avoir une aire MULTIPLE
// DE CINQ, et le nombre de pièces s'en déduit : 4 × 5 = 20, donc quatre
// pièces. C'est la première chose qu'on remarque, et c'est de l'aire.
//
// ── CE FICHIER NE CONNAÎT NI LE DOM NI L'ÉCRAN ─────────────────────────────
//
// Il tire une grille, la résout, et dit si une pose est valide. L'écran pose
// les pièces, la fiche les imprime, l'épreuve les compte — et aucun des trois
// n'a besoin de savoir comment on fabrique un pavage.

/**
 * LES DOUZE PENTAMINOS, dans la nomenclature de Conway : chaque pièce porte la
 * lettre qu'elle dessine. C'est le nom qu'on emploie partout dans le monde, et
 * c'est celui que l'élève retrouvera s'il cherche ailleurs.
 */
export const FORMES = {
    F: [[1, 0], [2, 0], [0, 1], [1, 1], [1, 2]],
    I: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],
    L: [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3]],
    N: [[1, 0], [1, 1], [0, 2], [1, 2], [0, 3]],
    P: [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2]],
    T: [[0, 0], [1, 0], [2, 0], [1, 1], [1, 2]],
    U: [[0, 0], [2, 0], [0, 1], [1, 1], [2, 1]],
    V: [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]],
    W: [[0, 0], [0, 1], [1, 1], [1, 2], [2, 2]],
    X: [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]],
    Y: [[1, 0], [0, 1], [1, 1], [1, 2], [1, 3]],
    Z: [[0, 0], [1, 0], [1, 1], [1, 2], [2, 2]]
};

/** La couleur de chaque pièce — fixe, pour qu'on reconnaisse la même partout. */
export const TEINTES = {
    F: '#ef4444', I: '#3b82f6', L: '#f59e0b', N: '#10b981',
    P: '#a855f7', T: '#ec4899', U: '#0ea5e9', V: '#84cc16',
    W: '#f97316', X: '#8b5cf6', Y: '#14b8a6', Z: '#eab308'
};

/** Remet une pièce dans le coin, et range ses cases dans un ordre stable. */
export function normaliser(cells) {
    const mx = Math.min(...cells.map(c => c[0]));
    const my = Math.min(...cells.map(c => c[1]));
    return cells.map(([x, y]) => [x - mx, y - my])
        .sort((a, b) => (a[1] - b[1]) || (a[0] - b[0]));
}

const cle = (cells) => normaliser(cells).map(c => c.join(',')).join(' ');

/** Un quart de tour à droite. */
export const tourner = (cells) => normaliser(cells.map(([x, y]) => [-y, x]));
/** Le miroir, gauche-droite. */
export const retourner = (cells) => normaliser(cells.map(([x, y]) => [-x, y]));

/**
 * LES ORIENTATIONS DISTINCTES D'UNE PIÈCE — de une à huit.
 *
 * Le X n'en a qu'une, le I en a deux, le F en a huit. Ce n'est pas un détail
 * de code : c'est la SYMÉTRIE de la pièce, et c'est ce que l'élève manipule
 * quand il appuie sur « Tourner » sans que rien ne change.
 */
export function orientations(cells) {
    const vues = new Map();
    let c = normaliser(cells);
    for (let miroir = 0; miroir < 2; miroir++) {
        for (let q = 0; q < 4; q++) {
            vues.set(cle(c), c);
            c = tourner(c);
        }
        c = retourner(c);
    }
    return [...vues.values()];
}

/** Les cases qu'une pièce occupe, posée en (x, y). */
export const posees = (cells, x, y) => cells.map(([a, b]) => [a + x, b + y]);

/**
 * UN PAVAGE DU RECTANGLE, trouvé par retour sur trace.
 *
 * On remplit TOUJOURS la première case vide, de haut en bas et de gauche à
 * droite. C'est ce qui rend la recherche rapide : une case qu'aucune pièce ne
 * peut couvrir fait reculer tout de suite, au lieu d'être découverte à la fin.
 *
 * `ordre` décide quelles pièces sont essayées d'abord ; en le mélangeant, on
 * obtient un pavage DIFFÉRENT à chaque tirage sans avoir à les énumérer tous.
 */
export function resoudre(largeur, hauteur, ordre, combien) {
    const grille = Array.from({ length: hauteur }, () => Array(largeur).fill(null));
    const pose = [];
    const prises = new Set();
    const formes = new Map(ordre.map(id => [id, orientations(FORMES[id])]));

    const premiereVide = () => {
        for (let y = 0; y < hauteur; y++) for (let x = 0; x < largeur; x++) {
            if (!grille[y][x]) return [x, y];
        }
        return null;
    };

    function descendre() {
        const vide = premiereVide();
        // LA GRILLE PLEINE SUFFIT, et le compte des pièces n'a pas à être revérifié :
        // chaque pièce vaut cinq cases et le rectangle en a 5 × `combien`, donc un
        // rectangle plein est fait d'exactement `combien` pièces. Écrite
        // `pose.length === combien`, la condition ne pouvait jamais être fausse —
        // `epreuveTombe` l'a montré en remettant le défaut sans rien casser.
        if (!vide) return true;
        if (pose.length >= combien) return false;
        const [cx, cy] = vide;
        for (const id of ordre) {
            if (prises.has(id)) continue;
            for (const forme of formes.get(id)) {
                // On essaie chaque case de la pièce comme étant CELLE qui
                // couvre la première case vide : sans cela, une pièce dont le
                // coin haut-gauche est creux ne serait jamais posée.
                for (const [ax, ay] of forme) {
                    const x = cx - ax, y = cy - ay;
                    const cases = posees(forme, x, y);
                    if (cases.some(([a, b]) => a < 0 || b < 0 || a >= largeur || b >= hauteur
                        || grille[b][a])) continue;
                    cases.forEach(([a, b]) => { grille[b][a] = id; });
                    prises.add(id);
                    pose.push({ id, x, y, cells: forme });
                    if (descendre()) return true;
                    pose.pop();
                    prises.delete(id);
                    cases.forEach(([a, b]) => { grille[b][a] = null; });
                }
            }
        }
        return false;
    }

    return descendre() ? pose : null;
}

/** Les tailles de rectangle offertes, du plus facile au plus long. */
export const NIVEAUX = {
    1: { largeur: 4, hauteur: 5, nom: 'Quatre pièces — 4 × 5' },
    2: { largeur: 5, hauteur: 5, nom: 'Cinq pièces — 5 × 5' },
    3: { largeur: 5, hauteur: 6, nom: 'Six pièces — 5 × 6' }
};

/**
 * UNE GRILLE À REMPLIR, et le pavage qui prouve qu'elle se remplit.
 *
 * ON NE TIRE JAMAIS UN JEU DE PIÈCES AU HASARD pour voir ensuite s'il rentre :
 * la plupart des paquets de quatre pentaminos ne pavent AUCUN 4 × 5, et l'élève
 * chercherait une solution qui n'existe pas. On fait l'inverse — on fabrique un
 * pavage, et les pièces du jeu sont celles qu'il emploie.
 */
export function tirerPuzzle(rng, niveau = 1) {
    const n = NIVEAUX[niveau] ? niveau : 1;
    const { largeur, hauteur } = NIVEAUX[n];
    const combien = (largeur * hauteur) / 5;
    const ordre = rng.shuffle(Object.keys(FORMES));
    const solution = resoudre(largeur, hauteur, ordre, combien);
    // LE FILET N'EST PAS DÉCORATIF : avec un ordre malheureux, le solveur peut
    // ne rien trouver dans les limites qu'on lui donne. On réessaie plutôt que
    // de servir un écran vide.
    if (!solution) return tirerPuzzle(rng, n);
    return {
        largeur, hauteur, combien,
        pieces: solution.map(p => p.id),
        solution: solution.map(p => ({ id: p.id, x: p.x, y: p.y, cells: p.cells }))
    };
}

/** Une pose tient-elle dans la grille, sans sortir ni chevaucher ? */
export function poseTient(cells, x, y, largeur, hauteur, occupees) {
    for (const [a, b] of posees(cells, x, y)) {
        if (a < 0 || b < 0 || a >= largeur || b >= hauteur) return false;
        if (occupees && occupees.has(`${a}.${b}`)) return false;
    }
    return true;
}

/** Les cases couvertes par un ensemble de poses. */
export function couvertes(poses) {
    const s = new Set();
    for (const p of poses) {
        if (!p) continue;
        for (const [a, b] of posees(p.cells, p.x, p.y)) s.add(`${a}.${b}`);
    }
    return s;
}

/** Le rectangle est-il plein ? */
export function estFini(poses, largeur, hauteur) {
    return couvertes(poses).size === largeur * hauteur;
}
