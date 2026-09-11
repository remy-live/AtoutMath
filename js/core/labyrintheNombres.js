// LE LABYRINTHE DES NOMBRES — le nombre dit de combien on saute.
//
// L'autre image envoyée par Rémy : la couverture d'un recueil de « number
// mazes ». Le principe de ces livres, et il est plus joli qu'il n'en a l'air :
// chaque case porte un nombre, et ce nombre n'est pas une étiquette, c'est un
// ORDRE. Sur un 3, on saute de trois cases — en haut, en bas, à gauche ou à
// droite, jamais en diagonale — et l'on retombe sur un autre nombre, qui
// commande le saut suivant. Le but est d'atteindre la sortie.
//
// CE QU'ON Y TRAVAILLE. Compter des cases sans se tromper d'une (l'erreur la
// plus fréquente : partir de la case où l'on est au lieu de la suivante),
// lire une grille en lignes et en colonnes, et surtout ANTICIPER — un saut
// mène souvent dans un coin d'où plus rien ne part.
//
// LES MURS N'EXISTENT PAS ICI, et c'est ce qui distingue ce labyrinthe des
// deux autres du logiciel : ce qui bloque, ce n'est pas une cloison, c'est
// l'arithmétique. Une case portant 4 au milieu d'une grille de cinq est une
// impasse, non parce qu'on l'a fermée, mais parce que quatre cases dans
// n'importe quelle direction tombent hors du plateau.
//
// UNE GRILLE PROPOSÉE EST RÉSOLUBLE, comme partout ailleurs : on trace
// d'abord le chemin — une suite de sauts, dont chacun FIXE le nombre de la
// case qu'on quitte —, puis on remplit le reste. La solution existe donc avant
// l'énoncé, et l'on vérifie ensuite, par un parcours en largeur, qu'aucun
// raccourci ne la rend triviale.

export const CONSIGNE = 'Le nombre écrit dans ta case dit DE COMBIEN DE CASES tu sautes. '
    + 'Tu choisis la direction — haut, bas, gauche ou droite — mais pas la distance, et '
    + 'jamais la diagonale. Le but : atteindre l\'étoile.';

export const TAILLES = {
    petit: { l: 5, h: 5, coups: 5 },
    moyen: { l: 6, h: 6, coups: 7 },
    grand: { l: 7, h: 7, coups: 9 },
    geant: { l: 8, h: 8, coups: 11 }
};

const DIRECTIONS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export const clef = (x, y) => `${x},${y}`;
export const memeCase = (a, b) => !!a && !!b && a[0] === b[0] && a[1] === b[1];
const dedans = (x, y, l, h) => x >= 0 && y >= 0 && x < l && y < h;

/** Le nombre écrit dans une case (0 pour la sortie, qui ne se saute pas). */
export const valeur = (laby, x, y) => laby.grille[y][x];

/**
 * Les cases où l'on peut sauter depuis celle-ci. La sortie n'a pas de nombre :
 * on n'en repart pas, la partie est finie.
 */
export function sautsPossibles(laby, [x, y]) {
    const n = valeur(laby, x, y);
    if (!n) return [];
    const sorties = [];
    DIRECTIONS.forEach(([dx, dy]) => {
        const nx = x + dx * n, ny = y + dy * n;
        if (dedans(nx, ny, laby.l, laby.h)) sorties.push([nx, ny]);
    });
    return sorties;
}

export function peutSauter(laby, de, vers) {
    return sautsPossibles(laby, de).some(c => memeCase(c, vers));
}

/**
 * Le plus court chemin, en parcours en largeur. Sert à deux choses : vérifier
 * qu'une grille est résoluble, et mesurer si elle vaut la peine — une grille
 * qui se résout en deux sauts n'est pas un labyrinthe.
 *
 * @returns {Array|null} la suite des cases, départ compris
 */
export function resoudre(laby) {
    const vus = new Map();
    const file = [laby.depart];
    vus.set(clef(...laby.depart), null);
    while (file.length) {
        const c = file.shift();
        if (memeCase(c, laby.sortie)) {
            const chemin = [];
            let k = clef(...c), cur = c;
            while (cur) { chemin.unshift(cur); const p = vus.get(k); if (!p) break; cur = p; k = clef(...p); }
            return chemin;
        }
        sautsPossibles(laby, c).forEach(v => {
            const kv = clef(...v);
            if (vus.has(kv)) return;
            vus.set(kv, c);
            file.push(v);
        });
    }
    return null;
}

/** Toutes les cases d'où l'on peut encore atteindre la sortie. */
export function casesVivantes(laby) {
    const atteint = new Set([clef(...laby.sortie)]);
    let change = true;
    while (change) {
        change = false;
        for (let y = 0; y < laby.h; y++) {
            for (let x = 0; x < laby.l; x++) {
                const k = clef(x, y);
                if (atteint.has(k)) continue;
                if (sautsPossibles(laby, [x, y]).some(v => atteint.has(clef(...v)))) {
                    atteint.add(k); change = true;
                }
            }
        }
    }
    return atteint;
}

// --- Fabriquer une grille -------------------------------------------------------

/**
 * Le chemin d'abord : une suite de sauts au hasard, dont chacun FIXE le nombre
 * de la case qu'on quitte. Une case déjà traversée ne peut pas resservir — son
 * nombre est déjà décidé, et un second passage exigerait souvent une autre
 * distance.
 */
function tracerChemin(l, h, coups, rng) {
    const maxSaut = Math.max(l, h) - 1;
    for (let essai = 0; essai < 60; essai++) {
        const depart = [rng.int(0, l - 1), rng.int(0, h - 1)];
        const chemin = [depart];
        const valeurs = new Map();
        const pris = new Set([clef(...depart)]);
        let ok = true;
        for (let k = 0; k < coups; k++) {
            const [x, y] = chemin[chemin.length - 1];
            const choix = [];
            for (let n = 1; n <= maxSaut; n++) {
                DIRECTIONS.forEach(([dx, dy]) => {
                    const nx = x + dx * n, ny = y + dy * n;
                    if (!dedans(nx, ny, l, h)) return;
                    if (pris.has(clef(nx, ny))) return;
                    choix.push({ n, c: [nx, ny] });
                });
            }
            if (!choix.length) { ok = false; break; }
            const pris1 = rng.pick(choix);
            valeurs.set(clef(x, y), pris1.n);
            pris.add(clef(...pris1.c));
            chemin.push(pris1.c);
        }
        if (ok && chemin.length === coups + 1) return { chemin, valeurs };
    }
    return null;
}

/**
 * @param {Object} cfg
 * @param {number} cfg.l, cfg.h
 * @param {number} cfg.coups - longueur voulue du chemin de référence
 * @param {Object} cfg.rng
 * @returns {{l,h,grille,depart,sortie,solution,longueur}|null}
 */
export function genererLabyrinthe({ l = 6, h = 6, coups = 7, rng }) {
    const maxSaut = Math.max(l, h) - 1;
    for (let essai = 0; essai < 80; essai++) {
        const trace = tracerChemin(l, h, coups, rng);
        if (!trace) continue;
        const { chemin, valeurs } = trace;
        const sortie = chemin[chemin.length - 1];

        // Le reste de la grille : des nombres au hasard. Ils ne cassent rien —
        // le chemin de référence garde ses valeurs — mais ils peuvent ouvrir
        // des raccourcis, et c'est le parcours en largeur qui tranchera.
        const grille = [];
        for (let y = 0; y < h; y++) {
            const ligne = [];
            for (let x = 0; x < l; x++) {
                if (memeCase([x, y], sortie)) { ligne.push(0); continue; }
                const fixe = valeurs.get(clef(x, y));
                ligne.push(fixe || rng.int(1, maxSaut));
            }
            grille.push(ligne);
        }

        const laby = { l, h, grille, depart: chemin[0], sortie, solution: chemin };
        const court = resoudre(laby);
        if (!court) continue;
        // Une grille qui se résout en deux sauts n'est pas un labyrinthe. Les
        // nombres semés au hasard ouvrent souvent un raccourci : on exige que
        // le plus court chemin reste proche du calibre demandé, sinon on jette
        // la grille et l'on recommence.
        // L'EXIGENCE SE RELÂCHE AVEC LES ESSAIS. Sur une grande grille, un
        // raccourci apparaît presque à chaque tirage : rester intransigeant
        // rendrait une fois sur deux une grille NULLE, et le jeu ne peut pas
        // se permettre de n'avoir rien à proposer. On vise donc haut, puis on
        // se contente de moins — et jamais de moins de quatre sauts.
        const exigence = essai < 40
            ? Math.max(4, Math.round(coups * 0.8))
            : Math.max(4, Math.round(coups * 0.55));
        if (court.length - 1 < exigence) continue;
        laby.solution = court;
        laby.longueur = court.length - 1;
        return laby;
    }
    return null;
}

// --- Le parcours de l'élève -------------------------------------------------------

export const traceVide = (laby) => [laby.depart];

/**
 * @returns {{ok:boolean, raison?:string, recule?:boolean}}
 */
export function peutAvancer(laby, chemin, cible) {
    if (!chemin.length) return { ok: false };
    // Revenir sur ses pas : c'est la gomme du jeu, et elle est indispensable —
    // un labyrinthe se parcourt en se trompant.
    if (chemin.length > 1 && memeCase(cible, chemin[chemin.length - 2])) return { ok: true, recule: true };
    const de = chemin[chemin.length - 1];
    if (memeCase(cible, de)) return { ok: false };
    const n = valeur(laby, de[0], de[1]);
    if (!n) return { ok: false, raison: 'Tu es sur la sortie : la partie est finie.' };
    const dx = cible[0] - de[0], dy = cible[1] - de[1];
    if (dx !== 0 && dy !== 0) {
        return { ok: false, raison: 'On ne saute jamais en diagonale : haut, bas, gauche ou droite.' };
    }
    const d = Math.abs(dx) + Math.abs(dy);
    if (d !== n) {
        return { ok: false, raison: `Tu es sur un ${n} : il faut sauter de ${n} cases exactement, `
            + `pas de ${d}.` };
    }
    return { ok: true };
}

export function avancer(laby, chemin, cible) {
    const v = peutAvancer(laby, chemin, cible);
    if (!v.ok) return chemin;
    if (v.recule) return chemin.slice(0, -1);
    return [...chemin, [cible[0], cible[1]]];
}

export function verifier(laby, chemin) {
    const arrive = chemin.length && memeCase(chemin[chemin.length - 1], laby.sortie);
    if (arrive) {
        return {
            gagne: true,
            message: `Sortie atteinte en ${chemin.length - 1} saut${chemin.length > 2 ? 's' : ''}`
                + (laby.longueur && chemin.length - 1 === laby.longueur
                    ? ' — le plus court chemin\u00a0!' : '.')
        };
    }
    const bloque = chemin.length && !sautsPossibles(laby, chemin[chemin.length - 1]).length;
    return {
        gagne: false,
        bloque,
        message: bloque
            ? 'Impasse : de cette case, tous les sauts sortent de la grille. Reviens en arrière.'
            : 'Tu n\'es pas encore sur l\'étoile.'
    };
}

/** L'aide : le pas suivant du plus court chemin depuis là où l'on est. */
export function prochainSaut(laby, chemin) {
    if (!chemin.length) return null;
    const ici = chemin[chemin.length - 1];
    if (memeCase(ici, laby.sortie)) return null;
    const depuis = { ...laby, depart: ici };
    const court = resoudre(depuis);
    if (!court || court.length < 2) return null;
    return court[1];
}

export function conseil(laby, chemin) {
    const ici = chemin[chemin.length - 1];
    const n = valeur(laby, ici[0], ici[1]);
    const suite = prochainSaut(laby, chemin);
    if (!suite) {
        const vivantes = casesVivantes(laby);
        return vivantes.has(clef(...ici))
            ? 'Tu es arrivé : il n\'y a plus rien à sauter.'
            : 'D\'ici, la sortie n\'est plus atteignable — reviens en arrière, tu as pris '
                + 'un saut qui menait dans une impasse.';
    }
    const dx = suite[0] - ici[0], dy = suite[1] - ici[1];
    const ou = dx > 0 ? 'à droite' : (dx < 0 ? 'à gauche' : (dy > 0 ? 'vers le bas' : 'vers le haut'));
    return `Tu es sur un ${n} : compte ${n} cases ${ou} — la première case comptée est celle `
        + 'juste à côté de toi, pas celle où tu es.';
}
