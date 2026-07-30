// Générateur de Mathdoku (KenKen).
//
// Une grille N×N à remplir avec N chiffres consécutifs : chaque chiffre
// apparaît une fois par ligne et par colonne (carré latin), et la grille est
// découpée en « cages » dont les cases doivent produire le résultat indiqué
// avec l'opération indiquée (« 6+ », « 2÷ »…).
//
// La promesse centrale est la SOLUTION UNIQUE : un élève ne doit jamais
// arriver à une grille cohérente comptée fausse. On construit donc d'abord la
// solution, on découpe les cages, puis un solveur compte les solutions du
// puzzle obtenu ; tant qu'il y en a plusieurs, on détache une case d'une
// grande cage en case donnée — chaque détachement contraint le puzzle, et le
// cas limite (toutes les cases données) est trivialement unique : la boucle
// termine toujours.
//
// Tout est tiré du rng semé : une grille = une graine, reproductible dans le
// journal comme partout ailleurs.

import { makeItem } from '../items.js';

// Les quatre opérations. Soustraction et division ne valent que sur DEUX
// cases : elles ne sont ni associatives ni commutatives, la convention KenKen
// est |a−b| et max÷min — l'ordre des cases ne compte donc jamais.
export const OPS = {
    add: { symbole: '+', calc: v => v.reduce((a, b) => a + b, 0) },
    mul: { symbole: '×', calc: v => v.reduce((a, b) => a * b, 1) },
    sub: { symbole: '−', calc: v => Math.abs(v[0] - v[1]) },
    div: { symbole: '÷', calc: v => Math.max(v[0], v[1]) / Math.min(v[0], v[1]) }
};

// Tailles de cages par difficulté : c'est LE levier. À chiffres égaux, une
// grille de petites cages se résout par petits pas, une grille de grandes
// cages demande de croiser les contraintes.
const TAILLES = {
    facile: [[1, 0.15], [2, 0.65], [3, 0.20]],
    moyen: [[1, 0.05], [2, 0.50], [3, 0.37], [4, 0.08]],
    difficile: [[1, 0.02], [2, 0.38], [3, 0.42], [4, 0.18]]
};

const DIFFICULTE_ITEM = { facile: 1, moyen: 3, difficile: 4 };

// --- Construction -----------------------------------------------------------

/** Carré latin aléatoire par remplissage avec retour arrière. */
function carreLatin(rng, n, lo) {
    const g = Array.from({ length: n }, () => Array(n).fill(0));
    const lignes = Array.from({ length: n }, () => new Set());
    const colonnes = Array.from({ length: n }, () => new Set());
    const valeurs = Array.from({ length: n }, (_, k) => lo + k);

    const remplir = (i) => {
        if (i === n * n) return true;
        const r = Math.floor(i / n), c = i % n;
        for (const v of rng.shuffle(valeurs)) {
            if (lignes[r].has(v) || colonnes[c].has(v)) continue;
            g[r][c] = v; lignes[r].add(v); colonnes[c].add(v);
            if (remplir(i + 1)) return true;
            lignes[r].delete(v); colonnes[c].delete(v);
        }
        return false;
    };
    remplir(0);
    return g;
}

function tirerTaille(rng, poids) {
    const total = poids.reduce((a, [, p]) => a + p, 0);
    let t = rng.next() * total;
    for (const [taille, p] of poids) { t -= p; if (t <= 0) return taille; }
    return poids[poids.length - 1][0];
}

/**
 * Découpe la grille en cages contiguës. Les cases d'une cage sont gardées
 * dans leur ordre de croissance : retirer la DERNIÈRE laisse toujours un
 * reste contigu, ce dont dépendent les découpes d'unicité.
 */
function decouperCages(rng, n, poids) {
    const cageOf = Array.from({ length: n }, () => Array(n).fill(-1));
    const cages = [];
    const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];

    for (const idx of rng.shuffle(Array.from({ length: n * n }, (_, i) => i))) {
        const r0 = Math.floor(idx / n), c0 = idx % n;
        if (cageOf[r0][c0] !== -1) continue;

        const cible = tirerTaille(rng, poids);
        const id = cages.length;
        const cells = [{ r: r0, c: c0 }];
        cageOf[r0][c0] = id;

        while (cells.length < cible) {
            const candidats = [];
            for (const { r, c } of cells) {
                for (const [dr, dc] of dirs) {
                    const nr = r + dr, nc = c + dc;
                    if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue;
                    if (cageOf[nr][nc] !== -1) continue;
                    if (!candidats.some(p => p.r === nr && p.c === nc)) candidats.push({ r: nr, c: nc });
                }
            }
            if (!candidats.length) break;
            const suivant = rng.pick(candidats);
            cageOf[suivant.r][suivant.c] = id;
            cells.push(suivant);
        }
        cages.push({ cells });
    }
    return cages;
}

/**
 * Choisit l'opération d'une cage parmi celles que le professeur autorise ET
 * que les valeurs permettent (une division doit tomber juste). Une cage de
 * 3+ cases qui ne peut recevoir ni + ni × est découpée : sa dernière case
 * devient une case donnée et le reste repasse dans la file.
 */
function assignerOperations(rng, cages, sol, autorisees) {
    const faites = [];
    const file = [...cages];

    while (file.length) {
        const cage = file.pop();
        const vals = cage.cells.map(p => sol[p.r][p.c]);

        if (cage.cells.length === 1) {
            faites.push({ cells: cage.cells, op: null, target: vals[0] });
            continue;
        }

        // [op, poids] : la division est favorisée quand elle est possible —
        // elle est naturellement rare (il faut que ça divise), sans coup de
        // pouce on ne la verrait presque jamais.
        const candidates = [];
        if (cage.cells.length === 2) {
            const mx = Math.max(...vals), mn = Math.min(...vals);
            if (autorisees.includes('div') && mx % mn === 0 && mx !== mn) candidates.push(['div', 3]);
            if (autorisees.includes('sub')) candidates.push(['sub', 2]);
            if (autorisees.includes('mul')) candidates.push(['mul', 1.5]);
            if (autorisees.includes('add')) candidates.push(['add', 1]);
        } else {
            if (autorisees.includes('mul')) candidates.push(['mul', 1.2]);
            if (autorisees.includes('add')) candidates.push(['add', 1]);
        }

        if (!candidates.length) {
            const detachee = cage.cells[cage.cells.length - 1];
            faites.push({ cells: [detachee], op: null, target: sol[detachee.r][detachee.c] });
            file.push({ cells: cage.cells.slice(0, -1) });
            continue;
        }

        const total = candidates.reduce((a, [, p]) => a + p, 0);
        let t = rng.next() * total;
        let op = candidates[candidates.length - 1][0];
        for (const [o, p] of candidates) { t -= p; if (t <= 0) { op = o; break; } }

        faites.push({ cells: cage.cells, op, target: OPS[op].calc(vals) });
    }
    return faites;
}

// --- Solveur ----------------------------------------------------------------

/**
 * Compte les solutions d'un puzzle, en s'arrêtant à `limite`. Exporté pour
 * les tests : c'est lui qui prouve l'unicité.
 */
export function compterSolutions(n, lo, cages, limite = 2) {
    const hi = lo + n - 1;
    const cageOf = Array.from({ length: n }, () => Array(n).fill(0));
    cages.forEach((cage, i) => cage.cells.forEach(p => { cageOf[p.r][p.c] = i; }));

    const g = Array.from({ length: n }, () => Array(n).fill(0));
    const lignes = Array.from({ length: n }, () => new Set());
    const colonnes = Array.from({ length: n }, () => new Set());
    let count = 0;

    // Élagage : une cage complète doit donner exactement son résultat ; une
    // cage partielle doit encore POUVOIR l'atteindre. Sans cet élagage le
    // comptage resterait correct mais visiterait tout l'arbre.
    const cagePossible = (ci) => {
        const cage = cages[ci];
        const vals = [];
        for (const p of cage.cells) if (g[p.r][p.c] !== 0) vals.push(g[p.r][p.c]);
        const restantes = cage.cells.length - vals.length;

        if (cage.op === null) return !vals.length || vals[0] === cage.target;
        if (restantes === 0) return OPS[cage.op].calc(vals) === cage.target;

        if (cage.op === 'add') {
            const s = vals.reduce((a, b) => a + b, 0);
            return s + restantes * lo <= cage.target && s + restantes * hi >= cage.target;
        }
        if (cage.op === 'mul') {
            const p = vals.reduce((a, b) => a * b, 1);
            return cage.target % p === 0
                && p * Math.pow(lo, restantes) <= cage.target
                && p * Math.pow(hi, restantes) >= cage.target;
        }
        if (vals.length === 1) {
            const v = vals[0], t = cage.target;
            if (cage.op === 'sub') return v - t >= lo || v + t <= hi;
            if (cage.op === 'div') return v * t <= hi || (v % t === 0 && v / t >= lo);
        }
        return true;
    };

    const placer = (i) => {
        if (count >= limite) return;
        if (i === n * n) { count++; return; }
        const r = Math.floor(i / n), c = i % n, ci = cageOf[r][c];
        for (let v = lo; v <= hi; v++) {
            if (lignes[r].has(v) || colonnes[c].has(v)) continue;
            g[r][c] = v; lignes[r].add(v); colonnes[c].add(v);
            if (cagePossible(ci)) placer(i + 1);
            g[r][c] = 0; lignes[r].delete(v); colonnes[c].delete(v);
        }
    };
    placer(0);
    return count;
}

/**
 * Force l'unicité : tant qu'il existe plusieurs solutions, la plus grande
 * cage perd sa dernière case, qui devient une case donnée. Converge à coup
 * sûr (tout donné = unique), mais en pratique une ou deux découpes suffisent.
 */
function rendreUnique(rng, n, lo, cages, sol, autorisees) {
    let garde = 0;
    while (compterSolutions(n, lo, cages) > 1 && garde++ < n * n) {
        const multi = cages.filter(c => c.cells.length > 1);
        if (!multi.length) break;
        const grosse = multi.reduce((a, b) => (b.cells.length > a.cells.length ? b : a));

        const detachee = grosse.cells[grosse.cells.length - 1];
        const reste = { cells: grosse.cells.slice(0, -1) };
        cages = cages.filter(c => c !== grosse);
        cages.push({ cells: [detachee], op: null, target: sol[detachee.r][detachee.c] });
        cages.push(...assignerOperations(rng, [reste], sol, autorisees));
    }
    return cages;
}

// --- Générateur -------------------------------------------------------------

const PLAGES = {
    '1-3': { lo: 1, n: 3 }, '1-4': { lo: 1, n: 4 }, '1-5': { lo: 1, n: 5 },
    '2-4': { lo: 2, n: 3 }, '2-5': { lo: 2, n: 4 }
};

export const kenkenGenerator = {
    id: 'logique.mathodu',
    label: 'Mathdoku',
    skills: ['num.logique.mathodu'],
    answerKinds: ['grid'],
    params: [
        {
            id: 'chiffres', type: 'select', label: 'Chiffres utilisés', default: '1-4',
            options: [
                { value: '1-3', label: '1 à 3 (grille 3×3)' },
                { value: '2-4', label: '2 à 4 (grille 3×3)' },
                { value: '1-4', label: '1 à 4 (grille 4×4)' },
                { value: '2-5', label: '2 à 5 (grille 4×4)' },
                { value: '1-5', label: '1 à 5 (grille 5×5)' }
            ]
        },
        {
            id: 'operations', type: 'multiselect', label: 'Opérations', default: ['add', 'sub'],
            options: [
                { value: 'add', label: 'Addition' },
                { value: 'sub', label: 'Soustraction' },
                { value: 'mul', label: 'Multiplication' },
                { value: 'div', label: 'Division' }
            ]
        },
        {
            id: 'difficulte', type: 'select', label: 'Difficulté', default: 'facile',
            options: [
                { value: 'facile', label: 'Facile (petites zones)' },
                { value: 'moyen', label: 'Moyen' },
                { value: 'difficile', label: 'Difficile (grandes zones)' }
            ]
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const plage = PLAGES[params.chiffres] || PLAGES['1-4'];
        const { lo, n } = plage;
        const autorisees = Array.isArray(params.operations) && params.operations.length
            ? params.operations : ['add', 'sub'];
        const difficulte = TAILLES[params.difficulte] ? params.difficulte : 'facile';

        const sol = carreLatin(rng, n, lo);

        // Quatre découpes candidates, on garde celle qui a le MOINS de cases
        // données : les détachements d'unicité en créent, et sur une petite
        // grille chaque case donnée est une case pré-mâchée. Le tirage reste
        // déterministe — même graine, mêmes quatre essais, même choix.
        let cages = null, donnees = Infinity;
        for (let essai = 0; essai < 4; essai++) {
            let cand = assignerOperations(rng, decouperCages(rng, n, TAILLES[difficulte]), sol, autorisees);
            cand = rendreUnique(rng, n, lo, cand, sol, autorisees);
            const nb = cand.filter(c => c.op === null).length;
            if (nb < donnees) { donnees = nb; cages = cand; }
            if (nb === 0) break;
        }

        // Ordre de lecture : l'étiquette d'une cage s'affiche dans sa première
        // case en partant du haut-gauche, on fige cet ordre ici.
        cages.forEach(cage => cage.cells.sort((a, b) => (a.r - b.r) || (a.c - b.c)));
        cages.sort((a, b) => (a.cells[0].r - b.cells[0].r) || (a.cells[0].c - b.cells[0].c));

        const hi = lo + n - 1;
        return makeItem({
            seed: rng.seed,
            generatorId: 'logique.mathodu',
            skillId: 'num.logique.mathodu',
            answerKind: 'grid',
            prompt: {
                text: `Chaque chiffre de ${lo} à ${hi} apparaît une seule fois par ligne et par colonne.`,
                html: `<div class="game-question kenken-consigne">Chaque chiffre de <b>${lo} à ${hi}</b> apparaît une seule fois par ligne et par colonne.</div>`
            },
            answer: sol.map(ligne => ligne.join('')).join('/'),
            // Les textes restent vrais quel que soit l'état de la grille :
            // l'activité entoure une zone fausse s'il y en a une, sinon la
            // meilleure zone par laquelle continuer.
            hints: [
                'Observe la zone entourée en orange : vérifie son résultat, ou commence par elle.',
                'Une case a été remplie pour toi. Sa ligne et sa colonne se complètent maintenant plus facilement.'
            ],
            explanation: `Chaque ligne et chaque colonne contient une seule fois chaque chiffre de ${lo} à ${hi}, et chaque zone donne le résultat indiqué dans son coin.`,
            difficulty: DIFFICULTE_ITEM[difficulte] + (n === 5 ? 1 : 0),
            meta: {
                n, lo, hi,
                cages: cages.map(cage => ({
                    cells: cage.cells,
                    op: cage.op,
                    target: cage.target,
                    label: cage.op ? `${cage.target}${OPS[cage.op].symbole}` : String(cage.target)
                })),
                solution: sol
            }
        });
    }
};
