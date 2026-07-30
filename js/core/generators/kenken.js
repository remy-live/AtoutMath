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
function opsPossibles(vals, autorisees) {
    const candidates = [];
    if (vals.length === 2) {
        const mx = Math.max(...vals), mn = Math.min(...vals);
        if (autorisees.includes('div') && mx % mn === 0 && mx !== mn) candidates.push(['div', 3]);
        if (autorisees.includes('sub')) candidates.push(['sub', 2]);
        if (autorisees.includes('mul')) candidates.push(['mul', 1.5]);
        if (autorisees.includes('add')) candidates.push(['add', 1]);
    } else {
        if (autorisees.includes('mul')) candidates.push(['mul', 1.2]);
        if (autorisees.includes('add')) candidates.push(['add', 1]);
    }
    return candidates;
}

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
        const candidates = opsPossibles(vals, autorisees);

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
export function compterSolutions(n, lo, cages, limite = 2, sorties = null) {
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
        if (i === n * n) {
            count++;
            if (sorties) sorties.push(g.map(ligne => [...ligne]));
            return;
        }
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

function contigue(cells) {
    if (cells.length <= 1) return true;
    const cle = p => `${p.r},${p.c}`;
    const dedans = new Set(cells.map(cle));
    const vus = new Set([cle(cells[0])]);
    const file = [cells[0]];
    while (file.length) {
        const { r, c } = file.pop();
        for (const [dr, dc] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
            const k = `${r + dr},${c + dc}`;
            if (dedans.has(k) && !vus.has(k)) { vus.add(k); file.push({ r: r + dr, c: c + dc }); }
        }
    }
    return vus.size === cells.length;
}

/**
 * Force l'unicité, avec le moins de dégâts possible.
 *
 * On demande au solveur DEUX solutions : leurs différences désignent les
 * cages responsables de l'ambiguïté — inutile de toucher aux autres. Sur ces
 * cages, par ordre de préférence :
 *
 *  1. changer l'OPÉRATION (5+ devient 1−) : même structure, aucune case
 *     donnée, juste une contrainte plus discriminante ;
 *  2. découper la cage en deux cages (une paire + un reste contigu) : plus de
 *     cages mais toujours tout à calculer ;
 *  3. en dernier recours, détacher la dernière case en case donnée.
 *
 * Les deux premières voies n'ajoutent aucune case pré-mâchée — sans elles,
 * 7 % des grilles faciles finissaient avec 5 cases données ou plus. Chaque
 * découpe structurelle réduit strictement la taille des cages et « tout
 * donné » est unique : la boucle termine toujours.
 */
function rendreUnique(rng, n, lo, cages, sol, autorisees) {
    let garde = 0;
    while (garde++ < n * n) {
        const sols = [];
        if (compterSolutions(n, lo, cages, 2, sols) <= 1) break;

        // Les cages où les deux solutions divergent.
        const ambigues = new Set();
        for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
            if (sols[0][r][c] !== sols[1][r][c]) {
                const cage = cages.find(k => k.cells.some(p => p.r === r && p.c === c));
                if (cage && cage.cells.length > 1) ambigues.add(cage);
            }
        }
        const candidates = [...ambigues].sort((a, b) => b.cells.length - a.cells.length);
        if (!candidates.length) break;

        // 1. Une autre opération suffit-elle ?
        let resolu = false;
        for (const cage of candidates) {
            const vals = cage.cells.map(p => sol[p.r][p.c]);
            for (const [op] of opsPossibles(vals, autorisees)) {
                if (op === cage.op) continue;
                const avant = { op: cage.op, target: cage.target };
                cage.op = op;
                cage.target = OPS[op].calc(vals);
                if (compterSolutions(n, lo, cages) === 1) { resolu = true; break; }
                cage.op = avant.op;
                cage.target = avant.target;
            }
            if (resolu) break;
        }
        if (resolu) break;

        // 2. Découpe de la plus grande cage ambiguë : une paire contiguë dont
        //    le retrait laisse un reste contigu, sinon une case donnée.
        const grosse = candidates[0];
        cages = cages.filter(c => c !== grosse);
        const d = grosse.cells[grosse.cells.length - 1];

        let morceaux = null;
        if (grosse.cells.length >= 4) {
            const voisin = grosse.cells.slice(0, -1).find(p =>
                Math.abs(p.r - d.r) + Math.abs(p.c - d.c) === 1
                && contigue(grosse.cells.filter(q => q !== p && q !== d)));
            if (voisin) {
                morceaux = [
                    { cells: grosse.cells.filter(q => q !== voisin && q !== d) },
                    { cells: [voisin, d] }
                ];
            }
        }
        if (!morceaux && grosse.cells.length === 3) {
            // 2+1 : la paire d'abord — le singleton restant devient une case
            // donnée via l'assignation, mais la paire garde son calcul.
            morceaux = [{ cells: grosse.cells.slice(0, 2) }, { cells: [d] }];
        }
        if (!morceaux) {
            cages.push({ cells: [d], op: null, target: sol[d.r][d.c] });
            morceaux = [{ cells: grosse.cells.slice(0, -1) }];
        }
        cages.push(...assignerOperations(rng, morceaux, sol, autorisees));
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
