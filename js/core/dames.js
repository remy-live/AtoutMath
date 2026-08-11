// LES DAMES — règles internationales, sur le damier 10 × 10 français.
//
// Trois règles font tout le jeu, et elles sont toutes les trois implacables :
//
//   LA PRISE EST OBLIGATOIRE.  On ne choisit pas de prendre : on prend.
//   LA PRISE EST MAJORITAIRE.  Entre deux rafles possibles, on joue celle qui
//                              prend LE PLUS de pièces — compter avant de
//                              bouger fait partie du jeu.
//   LA DAME VOLE.              Promue sur la dernière rangée, elle se déplace
//                              et prend à distance sur toute la diagonale.
//
// Détails qui distinguent les vraies dames des dames approximatives : le pion
// prend en AVANT ET EN ARRIÈRE (seul son déplacement simple est vers l'avant) ;
// les pièces prises restent sur le damier jusqu'à la fin de la rafle et ne se
// sautent qu'une fois ; un pion qui TRAVERSE la dernière rangée en pleine
// rafle sans s'y arrêter n'est PAS promu.
//
// Interface commune aux jeux de plateau (voir core/ia.js), états immuables.

export const N = 10;
const idx = (x, y) => y * N + x;
const dedans = (x, y) => x >= 0 && y >= 0 && x < N && y < N;
const DIAGS = [[-1, -1], [1, -1], [-1, 1], [1, 1]];

// 'p' pion / 'd' dame ; couleur 'B' (en bas, monte) ou 'N' (en haut, descend).
const pion = (c) => ({ genre: 'p', couleur: c });
const couleurDe = (p) => p && p.couleur;
const autre = (c) => c === 'B' ? 'N' : 'B';

/** Vingt pions chacun, sur les cases foncées des quatre premières rangées. */
export function initial() {
    const cases = new Array(N * N).fill(null);
    for (let y = 0; y < 4; y++) {
        for (let x = 0; x < N; x++) if ((x + y) % 2 === 1) cases[idx(x, y)] = pion('N');
    }
    for (let y = 6; y < N; y++) {
        for (let x = 0; x < N; x++) if ((x + y) % 2 === 1) cases[idx(x, y)] = pion('B');
    }
    return { cases, trait: 'B' };
}

/**
 * Toutes les rafles possibles depuis (x, y).
 *
 * Pendant la recherche, la pièce mobile est « en l'air » : sa case d'origine
 * est libre, les pièces sautées restent posées (elles bloquent) mais ne
 * peuvent être sautées qu'une fois. C'est LA subtilité des règles
 * internationales — l'enlever change les rafles longues.
 */
function rafles(etat, x0, y0) {
    const piece = etat.cases[idx(x0, y0)];
    const ennemie = (x, y, prises) => {
        const p = etat.cases[idx(x, y)];
        return p && p.couleur === autre(piece.couleur) && !prises.includes(idx(x, y));
    };
    const libre = (x, y) => {
        if (!dedans(x, y)) return false;
        if (x === x0 && y === y0) return true;      // la case quittée
        return !etat.cases[idx(x, y)];
    };
    const resultats = [];

    const explorer = (x, y, prises, chemin) => {
        let continue_ = false;
        for (const [dx, dy] of DIAGS) {
            if (piece.genre === 'p') {
                const mx = x + dx, my = y + dy;
                const lx = x + 2 * dx, ly = y + 2 * dy;
                if (dedans(mx, my) && ennemie(mx, my, prises) && libre(lx, ly)) {
                    continue_ = true;
                    explorer(lx, ly, [...prises, idx(mx, my)], [...chemin, { x: lx, y: ly }]);
                }
            } else {
                // La dame : on glisse jusqu'à la première pièce ; ennemie et
                // suivie d'au moins une case libre, elle se prend — et CHAQUE
                // case libre derrière est un point de chute possible.
                let cx = x + dx, cy = y + dy;
                while (libre(cx, cy)) { cx += dx; cy += dy; }
                if (dedans(cx, cy) && ennemie(cx, cy, prises)) {
                    let lx = cx + dx, ly = cy + dy;
                    while (libre(lx, ly)) {
                        continue_ = true;
                        explorer(lx, ly, [...prises, idx(cx, cy)], [...chemin, { x: lx, y: ly }]);
                        lx += dx; ly += dy;
                    }
                }
            }
        }
        if (!continue_ && prises.length) {
            resultats.push({ de: { x: x0, y: y0 }, vers: { x, y }, prises, chemin });
        }
    };
    explorer(x0, y0, [], []);
    return resultats;
}

/**
 * Les coups légaux : s'il existe une prise, SEULES les prises comptent — et
 * seules les plus longues d'entre elles. Sinon, les déplacements simples.
 */
export function coups(etat) {
    const toutes = [];
    for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
            const p = etat.cases[idx(x, y)];
            if (p && p.couleur === etat.trait) toutes.push(...rafles(etat, x, y));
        }
    }
    if (toutes.length) {
        const max = Math.max(...toutes.map(r => r.prises.length));
        return toutes.filter(r => r.prises.length === max);
    }

    const simples = [];
    const sens = etat.trait === 'B' ? -1 : 1;
    for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
            const p = etat.cases[idx(x, y)];
            if (!p || p.couleur !== etat.trait) continue;
            if (p.genre === 'p') {
                for (const dx of [-1, 1]) {
                    const nx = x + dx, ny = y + sens;
                    if (dedans(nx, ny) && !etat.cases[idx(nx, ny)]) {
                        simples.push({ de: { x, y }, vers: { x: nx, y: ny }, prises: [], chemin: [{ x: nx, y: ny }] });
                    }
                }
            } else {
                for (const [dx, dy] of DIAGS) {
                    let nx = x + dx, ny = y + dy;
                    while (dedans(nx, ny) && !etat.cases[idx(nx, ny)]) {
                        simples.push({ de: { x, y }, vers: { x: nx, y: ny }, prises: [], chemin: [{ x: nx, y: ny }] });
                        nx += dx; ny += dy;
                    }
                }
            }
        }
    }
    return simples;
}

export function jouer(etat, coup) {
    const cases = etat.cases.slice();
    const p = cases[idx(coup.de.x, coup.de.y)];
    cases[idx(coup.de.x, coup.de.y)] = null;
    for (const i of coup.prises) cases[i] = null;
    // La promotion n'a lieu que si le coup SE TERMINE sur la dernière rangée.
    const derniere = p.couleur === 'B' ? 0 : N - 1;
    const devientDame = p.genre === 'p' && coup.vers.y === derniere;
    cases[idx(coup.vers.x, coup.vers.y)] = devientDame ? { genre: 'd', couleur: p.couleur } : p;
    return { cases, trait: autre(etat.trait) };
}

/** Sans pièce ou sans coup, on a perdu — aux dames, être bloqué est une défaite. */
export function terminee(etat) {
    if (coups(etat).length) return null;
    return { gagnant: autre(etat.trait), raison: 'plus de coup possible' };
}

export function evaluer(etat) {
    let score = 0;
    for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
            const p = etat.cases[idx(x, y)];
            if (!p) continue;
            // Une dame vaut trois pions ; un pion AVANCÉ vaut un peu plus
            // qu'un pion de départ — il est en chemin vers la promotion.
            const avance = p.couleur === 'B' ? (N - 1 - y) : y;
            const v = p.genre === 'd' ? 300 : 100 + avance * 3;
            score += p.couleur === etat.trait ? v : -v;
        }
    }
    return score;
}

/** Les rafles longues d'abord : c'est là que l'élagage gagne son pain. */
export function ordonner(liste) {
    return liste.sort((a, b) => b.prises.length - a.prises.length);
}
