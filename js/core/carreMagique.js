// LE CARRÉ MAGIQUE — toutes les lignes font la même somme.
//
// Un carré magique se résout par UN raisonnement, toujours le même : trouver
// une ligne (rangée, colonne ou diagonale) où il ne manque qu'UNE case, et la
// compléter par une soustraction. Chaque case remplie en débloque d'autres —
// c'est le même moteur que le garam ou le sudoku, mais avec l'addition posée
// au premier plan : un carré magique, c'est trente soustractions à trous qui
// se donnent la main.
//
// LA FABRICATION garantit deux choses :
//   · le carré de départ est VRAIMENT magique (base de Lo Shu ou d'ordre 4,
//     transformée par symétries, décalage et échelle — ces opérations
//     conservent la magie) ;
//   · les trous laissent une solution ATTEIGNABLE PAR DÉDUCTION PURE : on ne
//     retire une case que si le carré reste résoluble ligne à ligne. Jamais
//     d'essai-erreur, jamais deux solutions.

// La base d'ordre 3 (Lo Shu) et une base d'ordre 4 (celle de Dürer).
const BASES = {
    3: [2, 7, 6, 9, 5, 1, 4, 3, 8],
    4: [16, 3, 2, 13, 5, 10, 11, 8, 9, 6, 7, 12, 4, 15, 14, 1]
};

/** Toutes les lignes qui doivent faire la somme : rangées, colonnes, diagonales. */
export function lignesDe(n) {
    const lignes = [];
    for (let r = 0; r < n; r++) lignes.push(Array.from({ length: n }, (_, i) => r * n + i));
    for (let c = 0; c < n; c++) lignes.push(Array.from({ length: n }, (_, i) => i * n + c));
    lignes.push(Array.from({ length: n }, (_, i) => i * n + i));
    lignes.push(Array.from({ length: n }, (_, i) => i * n + (n - 1 - i)));
    return lignes;
}

/** Le carré est-il magique, et pour quelle somme ? */
export function estMagique(cases, n) {
    const somme = lignesDe(n).map(l => l.reduce((s, i) => s + cases[i], 0));
    return somme.every(s => s === somme[0]) ? somme[0] : null;
}

// Les huit symétries du carré conservent la magie ; le décalage (+k partout)
// et l'échelle (×k partout) aussi. C'est toute la variété dont on a besoin.
const SYMETRIES = [
    (n, x, y) => [x, y], (n, x, y) => [n - 1 - x, y],
    (n, x, y) => [x, n - 1 - y], (n, x, y) => [n - 1 - x, n - 1 - y],
    (n, x, y) => [y, x], (n, x, y) => [n - 1 - y, x],
    (n, x, y) => [y, n - 1 - x], (n, x, y) => [n - 1 - y, n - 1 - x]
];

/** Un carré magique frais : base transformée, décalée, agrandie. */
export function tirerCarre(rng, options = {}) {
    const n = options.n || 3;
    const base = BASES[n] || BASES[3];
    const sym = rng.pick(SYMETRIES);
    const cases = new Array(n * n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const [sx, sy] = sym(n, x, y);
        cases[y * n + x] = base[sy * n + sx];
    }
    // L'échelle avant le décalage : k × v + d garde des nombres raisonnables.
    const k = options.difficile ? rng.pick([2, 3]) : 1;
    const d = rng.int(0, options.difficile ? 12 : 6);
    return { n, cases: cases.map(v => k * v + d), somme: estMagique(cases.map(v => k * v + d), n) };
}

/**
 * Résout par déduction pure : tant qu'une ligne n'a qu'un trou, on le comble.
 * Renvoie le journal — c'est lui que suivent l'aide et le robot.
 */
export function resoudre(carre, trous) {
    const { n, cases, somme } = carre;
    const grille = cases.map((v, i) => trous.includes(i) ? null : v);
    const etapes = [];
    let progres = true;
    while (progres) {
        progres = false;
        for (const ligne of lignesDe(n)) {
            const vides = ligne.filter(i => grille[i] === null);
            if (vides.length !== 1) continue;
            const connu = ligne.filter(i => grille[i] !== null).reduce((s, i) => s + grille[i], 0);
            grille[vides[0]] = somme - connu;
            etapes.push({
                case: vides[0], valeur: somme - connu,
                raison: `sur cette ligne, il manque une seule case : ${somme} − ${connu} = ${somme - connu}`
            });
            progres = true;
        }
    }
    return { complet: grille.every(v => v !== null), etapes, grille };
}

/**
 * Choisit les trous : on en creuse tant que la déduction ligne-à-ligne suffit
 * à tout retrouver. Un trou qui casserait cette promesse est rebouché.
 */
export function creuserTrous(carre, voulu, rng) {
    const ordre = rng.shuffle(carre.cases.map((_, i) => i));
    const trous = [];
    for (const i of ordre) {
        if (trous.length >= voulu) break;
        const essai = [...trous, i];
        if (resoudre(carre, essai).complet) trous.push(i);
    }
    return trous;
}

/** Un puzzle complet : le carré, ses trous, sa consigne. */
export function genererCarreMagique(params, rng) {
    const n = Number(params && params.taille) === 4 ? 4 : 3;
    const difficile = (params && params.difficulte) === 'difficile';
    const carre = tirerCarre(rng, { n, difficile });
    // 3×3 : de 4 à 6 trous ; 4×4 : de 6 à 10. Le plafond réel vient de la
    // promesse de résolubilité — creuserTrous s'arrête tout seul avant.
    const voulu = n === 3 ? (difficile ? 6 : 4) : (difficile ? 10 : 7);
    const trous = creuserTrous(carre, voulu, rng);
    return { ...carre, trous, etapes: resoudre(carre, trous).etapes };
}

/** La saisie de l'élève est-elle juste ? Les cases fausses, une par une. */
export function verifierSaisie(puzzle, saisie) {
    const fautes = [];
    let vides = 0;
    for (const i of puzzle.trous) {
        const v = saisie[i];
        if (v === null || v === undefined || v === '') { vides++; continue; }
        if (Number(v) !== puzzle.cases[i]) fautes.push(i);
    }
    return { ok: fautes.length === 0 && vides === 0, fautes, vides };
}
