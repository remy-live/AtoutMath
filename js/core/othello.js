// OTHELLO — poser un pion, c'est ENCADRER.
//
// Un pion posé retourne tous les pions adverses pris entre lui et un autre de
// ses pions, dans les huit directions. On ne joue QUE là où l'on retourne au
// moins un pion ; sans coup possible, on passe ; plus personne ne peut jouer,
// on compte.
//
// Ce qu'on y travaille : l'anticipation pure — le coup qui rapporte le plus de
// pions MAINTENANT est rarement le bon, et les coins, imprenables, valent plus
// que dix pions du centre. C'est le jeu du « réfléchis avant de poser ».
//
// Interface commune aux jeux de plateau (voir core/ia.js) : coups / jouer /
// terminee / evaluer, états immuables.

export const N = 8;
const DIRS = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
const idx = (x, y) => y * N + x;
const dedans = (x, y) => x >= 0 && y >= 0 && x < N && y < N;
const autre = (c) => c === 'N' ? 'B' : 'N';

/** Position de départ : quatre pions croisés au centre, les Noirs commencent. */
export function initial() {
    const cases = new Array(N * N).fill(null);
    cases[idx(3, 3)] = 'B'; cases[idx(4, 4)] = 'B';
    cases[idx(4, 3)] = 'N'; cases[idx(3, 4)] = 'N';
    return { cases, trait: 'N', passes: 0 };
}

/** Les pions retournés si `couleur` pose en (x, y) — vide si le coup est nul. */
export function retournes(etat, x, y, couleur = etat.trait) {
    if (!dedans(x, y) || etat.cases[idx(x, y)]) return [];
    const pris = [];
    for (const [dx, dy] of DIRS) {
        const ligne = [];
        let cx = x + dx, cy = y + dy;
        while (dedans(cx, cy) && etat.cases[idx(cx, cy)] === autre(couleur)) {
            ligne.push(idx(cx, cy));
            cx += dx; cy += dy;
        }
        if (ligne.length && dedans(cx, cy) && etat.cases[idx(cx, cy)] === couleur) {
            pris.push(...ligne);
        }
    }
    return pris;
}

function coupsDe(etat, couleur) {
    const out = [];
    for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
            const pris = retournes(etat, x, y, couleur);
            if (pris.length) out.push({ x, y, pris });
        }
    }
    return out;
}

/**
 * Les coups du joueur au trait. Sans coup, on PASSE — c'est la règle, pas un
 * arrangement — tant que l'adversaire peut encore jouer. Plus personne :
 * tableau vide, la partie est finie.
 */
export function coups(etat) {
    const propres = coupsDe(etat, etat.trait);
    if (propres.length) return propres;
    if (coupsDe(etat, autre(etat.trait)).length) return [{ passe: true }];
    return [];
}

export function jouer(etat, coup) {
    const cases = etat.cases.slice();
    if (coup.passe) return { cases, trait: autre(etat.trait), passes: etat.passes + 1 };
    cases[idx(coup.x, coup.y)] = etat.trait;
    for (const i of coup.pris) cases[i] = etat.trait;
    return { cases, trait: autre(etat.trait), passes: 0 };
}

export function score(etat) {
    let n = 0, b = 0;
    for (const c of etat.cases) { if (c === 'N') n++; else if (c === 'B') b++; }
    return { N: n, B: b };
}

export function terminee(etat) {
    if (coups(etat).length) return null;
    const s = score(etat);
    if (s.N === s.B) return { gagnant: null, raison: 'égalité', score: s };
    return { gagnant: s.N > s.B ? 'N' : 'B', raison: 'décompte', score: s };
}

// --- L'évaluation -----------------------------------------------------------
//
// La grille de poids dit tout le savoir du jeu : les coins sont en or, leurs
// voisins sont un poison (ils OFFRENT le coin), les bords valent mieux que le
// centre. En fin de partie, seuls les pions comptent — c'est le décompte qui
// approche.

const POIDS = [
    120, -20, 20, 5, 5, 20, -20, 120,
    -20, -40, -5, -5, -5, -5, -40, -20,
    20, -5, 15, 3, 3, 15, -5, 20,
    5, -5, 3, 3, 3, 3, -5, 5,
    5, -5, 3, 3, 3, 3, -5, 5,
    20, -5, 15, 3, 3, 15, -5, 20,
    -20, -40, -5, -5, -5, -5, -40, -20,
    120, -20, 20, 5, 5, 20, -20, 120
];

export function evaluer(etat) {
    const moi = etat.trait, lui = autre(moi);
    let pos = 0, nMoi = 0, nLui = 0, vides = 0;
    for (let i = 0; i < N * N; i++) {
        const c = etat.cases[i];
        if (!c) { vides++; continue; }
        if (c === moi) { pos += POIDS[i]; nMoi++; }
        else { pos -= POIDS[i]; nLui++; }
    }
    // La MOBILITÉ : avoir des coups, c'est choisir ; ne plus en avoir, c'est
    // subir. C'est le vrai moteur du milieu de partie.
    const mob = coupsDe(etat, moi).length - coupsDe(etat, lui).length;
    if (vides <= 10) return (nMoi - nLui) * 12 + pos * 0.2 + mob * 4;
    return pos + mob * 6;
}

export function ordonner(liste) {
    return liste.sort((a, b) => (b.passe ? -1000 : POIDS[idx(b.x, b.y)]) - (a.passe ? -1000 : POIDS[idx(a.x, a.y)]));
}
