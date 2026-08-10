// LES ARPENTEURS — un jeu à deux sur la table de Pythagore.
//
// Un terrain quadrillé. À chaque tour, un nombre tombe : 36. Le joueur doit
// clôturer un rectangle de 36 cases — 6 × 6, 4 × 9, 3 × 12 — n'importe où sur
// ce qui reste libre. Celui qui ne peut plus poser a perdu.
//
// Ce qu'on y travaille n'est pas « combien font 6 × 6 » mais la question
// inverse, celle qu'on ne pose presque jamais : QUELLES multiplications font
// 36 ? Un élève qui ne connaît que 6 × 6 aura besoin d'un carré de six de côté
// et se retrouvera coincé bien avant celui qui voit aussi 4 × 9 et 3 × 12. La
// richesse des décompositions devient un avantage tactique — c'est-à-dire une
// raison de les connaître.
//
// Deuxième idée, plus discrète : à la fin, il reste des trous. Une bande de 5
// cases de large ne peut plus accueillir 36 même si la surface libre est
// grande. On apprend là, sans un mot de leçon, qu'une aire ne suffit pas à
// décrire une forme.

export const VIDE = 0;

/**
 * Toutes les façons d'écrire n comme un produit de deux facteurs.
 *
 * Les facteurs ne sont PAS bornés par la table : 36 vaut aussi 3 × 12, et
 * c'est exactement ce qui fait la richesse du jeu — le nombre vient de la
 * table de Pythagore, la forme non. Seul le terrain limite (`maxCote`).
 *
 * `minCote` vaut 2 par défaut : une bande d'UNE case de large est toujours
 * disponible tant qu'il reste une ligne libre, et elle transformerait la fin
 * de partie en remplissage mécanique où plus aucune décomposition ne se
 * cherche. Le réglage existe quand même, pour les parties longues.
 */
export function decompositions(n, maxCote = 30, minCote = 2) {
    const out = [];
    for (let a = minCote; a * a <= n; a++) {
        if (n % a) continue;
        const b = n / a;
        if (a <= maxCote && b <= maxCote && b >= minCote) out.push([a, b]);
    }
    return out;
}

/** Les nombres jouables : ceux de la table, sans doublon, du plus petit au plus grand. */
export function nombresDeLaTable(max = 10) {
    const vus = new Set();
    for (let a = 2; a <= max; a++) for (let b = a; b <= max; b++) vus.add(a * b);
    return [...vus].sort((x, y) => x - y);
}

export function creerPartie({ cols = 26, rows = 18, table = 10, minCote = 2 } = {}) {
    return {
        cols, rows, table, minCote,
        // Le plus grand côté possible : celui du terrain. Une parcelle plus
        // longue que le pré ne se clôture pas.
        max: Math.max(cols, rows),
        cases: new Array(cols * rows).fill(VIDE),
        joueur: 1,
        cible: null,
        tour: 0,
        perdant: null,
        parcelles: []
    };
}

export const idx = (e, x, y) => y * e.cols + x;

/** Le rectangle tient-il, et ne mord-il sur rien ? */
export function libre(e, x, y, w, h) {
    if (w < 1 || h < 1) return false;
    if (x < 0 || y < 0 || x + w > e.cols || y + h > e.rows) return false;
    for (let j = 0; j < h; j++) {
        for (let i = 0; i < w; i++) {
            if (e.cases[idx(e, x + i, y + j)] !== VIDE) return false;
        }
    }
    return true;
}

/**
 * Existe-t-il UNE place pour un rectangle d'aire n ?
 * On essaie chaque décomposition dans les deux orientations, à chaque position.
 * Le terrain fait au plus 30 × 20 et n a moins de cinq décompositions : le
 * balayage complet est instantané, et il est exact — ce qui compte, puisque
 * c'est lui qui décide qu'un joueur a perdu.
 */
export function placementPossible(e, n) {
    for (const [a, b] of formes(e, n)) {
        for (const [w, h] of (a === b ? [[a, b]] : [[a, b], [b, a]])) {
            for (let y = 0; y + h <= e.rows; y++) {
                for (let x = 0; x + w <= e.cols; x++) {
                    if (libre(e, x, y, w, h)) return { x, y, w, h };
                }
            }
        }
    }
    return null;
}

/** Les formes légales pour ce nombre SUR CE TERRAIN. */
export function formes(e, n) {
    return decompositions(n, Math.max(e.cols, e.rows), e.minCote);
}

/** Les nombres de la table encore posables sur ce terrain. */
export function ciblesPossibles(e) {
    return nombresDeLaTable(e.table).filter(n => placementPossible(e, n));
}

/**
 * Tire le nombre du tour.
 *
 * On ne tire QUE parmi les nombres encore posables. Sans cette précaution, un
 * joueur perdrait parce que la machine a sorti 81 quand il ne restait qu'une
 * bande de six : une défaite qu'aucune décision n'aurait pu éviter. La règle
 * de l'élève est respectée à la lettre — « le dernier qui ne peut pas poser a
 * perdu » — mais la défaite vient alors de la place qu'on a laissée, pas du
 * tirage.
 */
export function tirerCible(e, rng) {
    const possibles = ciblesPossibles(e);
    if (!possibles.length) {
        e.cible = null;
        e.perdant = e.joueur;
        return null;
    }
    e.cible = rng ? rng.pick(possibles) : possibles[Math.floor(Math.random() * possibles.length)];
    return e.cible;
}

/**
 * Pose une parcelle. Renvoie le compte rendu du coup — et surtout, quand il est
 * refusé, POURQUOI : c'est le seul retour dont l'élève puisse tirer quelque
 * chose (« tu as tracé 5 × 7 = 35, il en fallait 36 »).
 */
export function poser(e, x, y, w, h) {
    if (e.perdant) return { ok: false, raison: 'finie' };
    const aire = w * h;
    if (w < e.minCote || h < e.minCote) {
        return { ok: false, raison: 'trop-mince', aire, message: `Une parcelle doit faire au moins ${e.minCote} cases de large.` };
    }
    if (aire !== e.cible) {
        return { ok: false, raison: 'aire', aire, message: `Ta parcelle fait ${w} × ${h} = ${aire}. Il en fallait ${e.cible}.` };
    }
    if (!libre(e, x, y, w, h)) {
        return { ok: false, raison: 'occupe', aire, message: 'Cette parcelle sort du terrain ou mord sur une parcelle déjà clôturée.' };
    }

    for (let j = 0; j < h; j++) {
        for (let i = 0; i < w; i++) e.cases[idx(e, x + i, y + j)] = e.joueur;
    }
    const parcelle = { joueur: e.joueur, x, y, w, h, aire, tour: e.tour };
    e.parcelles.push(parcelle);
    e.tour++;
    e.joueur = e.joueur === 1 ? 2 : 1;
    return { ok: true, parcelle, message: `${w} × ${h} = ${aire}` };
}

/** Les cases encore libres. */
export function restant(e) {
    return e.cases.reduce((s, c) => s + (c === VIDE ? 1 : 0), 0);
}

export function score(e, joueur) {
    return e.cases.reduce((s, c) => s + (c === joueur ? 1 : 0), 0);
}

/**
 * Le conseil du tour : TOUTES les décompositions, et rien d'autre.
 *
 * Désigner la meilleure case supposerait de savoir laquelle abîme le moins le
 * terrain — c'est le cœur du jeu, et le donner reviendrait à jouer à la place
 * de l'élève. Énumérer les formes, en revanche, c'est lui rendre ce qu'il
 * devrait déjà savoir : que 36 ne se réduit pas à 6 × 6.
 */
export function conseil(e) {
    if (!e.cible) return '';
    const liste2 = formes(e, e.cible);
    if (!liste2.length) return '';
    const liste = liste2.map(([a, b]) => `${a} × ${b}`).join(', ');
    return liste2.length === 1
        ? `${e.cible} ne s'écrit que d'une façon : ${liste}. Tu n'as pas le choix de la forme, seulement de la place.`
        : `${e.cible} s'écrit de ${liste2.length} façons : ${liste}. Choisis celle qui abîme le moins le terrain.`;
}
