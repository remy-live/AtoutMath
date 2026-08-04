// Générateur de Sudoku : 4×4 (blocs 2×2), 6×6 (blocs 2×3), 9×9 (blocs 3×3).
//
// Deux garanties, les mêmes que le Garam : solution UNIQUE, et grille
// RÉSOLUBLE SANS DEVINER par les techniques du niveau choisi —
//   facile    : « candidat unique » seulement (une case n'a plus qu'un
//               chiffre possible en regardant sa ligne, sa colonne, son bloc) ;
//   moyen/difficile : + le « single caché » (dans une unité, un chiffre n'a
//               plus qu'une place possible), avec de moins en moins de cases
//               données. Résoluble par déductions forcées ⇒ solution unique.
//
// Tout est semé : une graine = une grille.

import { makeItem } from '../items.js';

export const TAILLES_SUDOKU = {
    4: { br: 2, bc: 2 },
    6: { br: 2, bc: 3 },
    9: { br: 3, bc: 3 }
};

// Part de cases DONNÉES visée, par difficulté et par taille.
const CIBLES = {
    facile: { 4: 0.65, 6: 0.55, 9: 0.48 },
    moyen: { 4: 0.50, 6: 0.44, 9: 0.39 },
    difficile: { 4: 0.40, 6: 0.36, 9: 0.31 }
};
const DIFFICULTE_ITEM = { facile: 2, moyen: 3, difficile: 4 };

/** Lignes, colonnes et blocs : chaque unité est la liste de ses cases. */
export function unitesDe(n, br, bc) {
    const unites = [];
    for (let r = 0; r < n; r++) unites.push(Array.from({ length: n }, (_, c) => r * n + c));
    for (let c = 0; c < n; c++) unites.push(Array.from({ length: n }, (_, r) => r * n + c));
    for (let R = 0; R < n; R += br) for (let C = 0; C < n; C += bc) {
        const bloc = [];
        for (let r = 0; r < br; r++) for (let c = 0; c < bc; c++) bloc.push((R + r) * n + C + c);
        unites.push(bloc);
    }
    return unites;
}

/** Les voisines de chaque case : celles qui partagent une unité avec elle. */
function voisinesDe(n, unites) {
    const voisines = Array.from({ length: n * n }, () => new Set());
    for (const u of unites) for (const a of u) for (const b of u) if (a !== b) voisines[a].add(b);
    return voisines.map(s => [...s]);
}

function candidats(vals, i, voisines, n) {
    const pris = new Set();
    for (const j of voisines[i]) if (vals[j] !== null) pris.add(vals[j]);
    const libres = [];
    for (let v = 1; v <= n; v++) if (!pris.has(v)) libres.push(v);
    return libres;
}

/** Grille complète aléatoire, par retour sur trace à candidats mélangés. */
function grilleComplete(rng, n, voisines) {
    const vals = Array(n * n).fill(null);
    const remplir = (i) => {
        if (i === n * n) return true;
        for (const v of rng.shuffle(candidats(vals, i, voisines, n))) {
            vals[i] = v;
            if (remplir(i + 1)) return true;
            vals[i] = null;
        }
        return false;
    };
    return remplir(0) ? vals : null;
}

/**
 * La grille se termine-t-elle par déductions seules ? `caches` autorise le
 * single caché en plus du candidat unique. C'est le critère de creusage — et
 * comme chaque coup est forcé, il implique l'unicité de la solution.
 */
export function resolubleParSingles(givens, n, voisines, unites, caches) {
    const vals = [...givens];
    let bouge = true;
    while (bouge) {
        bouge = false;
        for (let i = 0; i < vals.length; i++) {
            if (vals[i] !== null) continue;
            const cs = candidats(vals, i, voisines, n);
            if (cs.length === 0) return false;
            if (cs.length === 1) { vals[i] = cs[0]; bouge = true; }
        }
        if (bouge || !caches) continue;
        for (const u of unites) {
            for (let v = 1; v <= n; v++) {
                if (u.some(i => vals[i] === v)) continue;
                const places = u.filter(i => vals[i] === null && candidats(vals, i, voisines, n).includes(v));
                if (places.length === 1) { vals[places[0]] = v; bouge = true; }
            }
        }
    }
    return !vals.includes(null);
}

/** Compte les solutions (arrêt à `limite`) — pour les tests. */
export function compterSolutionsSudoku(givens, n, voisines, limite = 2) {
    let count = 0;
    const vals = [...givens];
    const chercher = () => {
        if (count >= limite) return;
        const i = vals.indexOf(null);
        if (i === -1) { count++; return; }
        for (const v of candidats(vals, i, voisines, n)) {
            vals[i] = v;
            chercher();
            vals[i] = null;
            if (count >= limite) return;
        }
    };
    chercher();
    return count;
}

export const sudokuGenerator = {
    id: 'logique.sudoku',
    label: 'Sudoku',
    skills: ['num.logique.sudoku'],
    answerKinds: ['grid'],
    params: [
        {
            id: 'taille', type: 'select', label: 'Taille de la grille', default: 6,
            options: [
                { value: 4, label: '4 × 4 (blocs 2×2)' },
                { value: 6, label: '6 × 6 (blocs 2×3)' },
                { value: 9, label: '9 × 9 (blocs 3×3)' }
            ]
        },
        {
            id: 'difficulte', type: 'select', label: 'Difficulté', default: 'facile',
            options: [
                { value: 'facile', label: 'Facile (candidat unique)' },
                { value: 'moyen', label: 'Moyen' },
                { value: 'difficile', label: 'Difficile (le minimum de cases)' }
            ]
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const n = TAILLES_SUDOKU[params.taille] ? Number(params.taille) : 6;
        const { br, bc } = TAILLES_SUDOKU[n];
        const difficulte = CIBLES[params.difficulte] ? params.difficulte : 'facile';
        const caches = difficulte !== 'facile';

        const unites = unitesDe(n, br, bc);
        const voisines = voisinesDe(n, unites);
        const solution = grilleComplete(rng, n, voisines);

        // Creusage : un retrait n'est gardé que si la grille reste résoluble
        // par les techniques du niveau — il y a donc toujours un prochain coup.
        const givens = [...solution];
        let restantes = givens.length;
        const cible = Math.round(CIBLES[difficulte][n] * givens.length);
        for (const idx of rng.shuffle(Array.from({ length: givens.length }, (_, i) => i))) {
            if (restantes <= cible) break;
            const memo = givens[idx];
            givens[idx] = null;
            if (!resolubleParSingles(givens, n, voisines, unites, caches)) givens[idx] = memo;
            else restantes--;
        }

        return makeItem({
            seed: rng.seed,
            generatorId: 'logique.sudoku',
            skillId: 'num.logique.sudoku',
            answerKind: 'grid',
            prompt: {
                text: `Complète la grille : chaque chiffre de 1 à ${n} doit apparaître une seule fois par ligne, par colonne et par bloc.`,
                html: `<div class="game-question kenken-consigne">Chaque chiffre de <b>1 à ${n}</b> apparaît une seule fois par <b>ligne</b>, par <b>colonne</b> et par <b>bloc</b>.</div>`
            },
            answer: 'g' + solution.join('/'),
            hints: [
                'Cherche une case dont la ligne, la colonne et le bloc contiennent déjà presque tous les chiffres : il n\'en reste qu\'un possible.',
                'Une case a été remplie pour toi. Regarde ce qu\'elle débloque autour d\'elle.'
            ],
            explanation: `Chaque ligne, chaque colonne et chaque bloc doit contenir les chiffres de 1 à ${n}, une seule fois chacun.`,
            difficulty: DIFFICULTE_ITEM[difficulte] + (n === 9 ? 1 : 0),
            meta: { n, br, bc, givens, solution, nbDonnees: restantes }
        });
    }
};
