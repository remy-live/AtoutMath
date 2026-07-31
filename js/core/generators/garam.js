// Générateur de Garam.
//
// Un treillis d'égalités « a ∘ b = c » horizontales et verticales qui se
// partagent des cases — et, signature du Garam, des résultats à DEUX CHIFFRES
// écrits sur deux cases : 6 × 7 = [4][2]. Chacune des deux cases peut nourrir
// d'autres égalités. Le treillis est UNE SEULE TOILE : chaque case est reliée
// à toutes les autres de proche en proche (vérifié par les tests) — pas deux
// sous-grilles indépendantes.
//
// Deux garanties, plus fortes que la seule solution unique :
//  - solution unique (comme le Mathdoku et le Binairo) ;
//  - RÉSOLUBLE SANS DEVINER : on ne creuse une case que si la grille reste
//    terminable par pur enchaînement de déductions — dans chaque égalité où
//    il ne manque qu'une case, elle se calcule (l'inverse d'une soustraction
//    est une addition). C'est exactement le geste de résolution d'un vrai
//    Garam : il y a toujours un prochain coup forcé.
//
// Structure « petit » (7 égalités, 15 cases, 1 résultat à deux chiffres) :
//
//     A ∘ B = C  · · · ·  D ∘ E = F
//     ∘       ∘           ∘
//     G       H           P
//     =       =           =
//     J ∘ K = M N ∘ O =   Q
//
// Le résultat « MN » de la ligne du bas soude tout : M termine la verticale
// de C, N enchaîne vers Q, qui est le pied de la verticale de D — laquelle
// porte l'égalité du haut à droite. « Grand » répète le motif un étage plus
// bas à partir de J, M et Q (12 égalités, 24 cases, 2 résultats doubles).

import { makeItem } from '../items.js';

export const OPS_GARAM = {
    add: { symbole: '+', calc: (a, b) => a + b },
    sub: { symbole: '−', calc: (a, b) => a - b },
    mul: { symbole: '×', calc: (a, b) => a * b },
    div: { symbole: '÷', calc: (a, b) => (b !== 0 && a % b === 0 ? a / b : null) }
};

/** a ∘ b, ou null si invalide (négatif, division inexacte…). */
function calculer(op, a, b) {
    const v = OPS_GARAM[op].calc(a, b);
    return v === null || v < 0 || !Number.isInteger(v) ? null : v;
}

const CIBLES_DONNEES = { facile: 0.62, moyen: 0.46, difficile: 0.30 };
const DIFFICULTE_ITEM = { facile: 2, moyen: 3, difficile: 4 };

// --- Structure ---------------------------------------------------------------

/**
 * Égalité : { a, b, z, z2?, op }. Sans `z2`, le résultat est la case `z`
 * (0 à 9). Avec `z2`, il s'écrit sur deux cases : `z` les dizaines (1 à 9),
 * `z2` les unités — la valeur est 10·z + z2.
 *
 * Les égalités sont rangées dans l'ORDRE DE CONSTRUCTION : chacune ne dépend
 * que de cases déjà posées par les précédentes.
 */
function construireStructure(taille) {
    const cells = [];
    const cellAt = {};
    const cell = (r, c) => {
        const cle = `${r},${c}`;
        if (cellAt[cle] === undefined) { cellAt[cle] = cells.length; cells.push({ r, c }); }
        return cellAt[cle];
    };

    const equations = [];
    const signes = [];
    const H = (r, c0) => {
        const eq = { a: cell(r, c0), b: cell(r, c0 + 2), z: cell(r, c0 + 4), op: null };
        signes.push({ r, c: c0 + 1, eq: equations.length, role: 'op' });
        signes.push({ r, c: c0 + 3, glyphe: '=' });
        equations.push(eq);
        return eq;
    };
    // Horizontale à résultat double : … = [z][z2], deux cases accolées.
    const H2C = (r, c0) => {
        const eq = { a: cell(r, c0), b: cell(r, c0 + 2), z: cell(r, c0 + 4), z2: cell(r, c0 + 5), op: null };
        signes.push({ r, c: c0 + 1, eq: equations.length, role: 'op' });
        signes.push({ r, c: c0 + 3, glyphe: '=' });
        equations.push(eq);
        return eq;
    };
    const V = (r0, c) => {
        const eq = { a: cell(r0, c), b: cell(r0 + 2, c), z: cell(r0 + 4, c), op: null };
        signes.push({ r: r0 + 1, c, eq: equations.length, role: 'op' });
        signes.push({ r: r0 + 3, c, glyphe: '=' });
        equations.push(eq);
        return eq;
    };

    // Un étage : la boucle fermée décrite en tête de fichier. `r` est la ligne
    // des égalités du haut de l'étage ; celles du bas sont à r+4.
    const etage = (r) => {
        if (r === 0) H(0, 0);        // A ∘ B = C (déjà là aux étages suivants)
        V(r, 0);                     // A ∘ G = J
        V(r, 4);                     // C ∘ H = M
        H2C(r + 4, 0);               // J ∘ K = [M][N]
        H(r + 4, 5);                 // N ∘ O = Q
        V(r, 9);                     // D ∘ P = Q (construite tête en bas :
                                     //   Q est déjà posé, D s'en déduit)
        if (r === 0) H(0, 9);        // D ∘ E = F
    };

    etage(0);
    if (taille === 'grand') etage(4);

    return { cells, equations, signes, rows: taille === 'grand' ? 9 : 5, cols: 14 };
}

// --- Déduction et solveur -----------------------------------------------------

// a ∘ b = T : retrouver a ou b. `undefined` = pas déductible (0 × b = 0),
// null = contradiction.
const retrouverA = (op, b, T) => {
    if (op === 'add') return T - b;
    if (op === 'sub') return T + b;
    if (op === 'mul') return b === 0 ? (T === 0 ? undefined : null) : (T % b === 0 ? T / b : null);
    return T * b;
};
const retrouverB = (op, a, T) => {
    if (op === 'add') return T - a;
    if (op === 'sub') return a - T;
    if (op === 'mul') return a === 0 ? (T === 0 ? undefined : null) : (T % a === 0 ? T / a : null);
    return T === 0 ? (a === 0 ? undefined : null) : (a % T === 0 ? a / T : null);
};
const chiffre = (v) => v !== null && v !== undefined && Number.isInteger(v) && v >= 0 && v <= 9;

/**
 * Propage les déductions : dans chaque égalité où il ne manque qu'une case,
 * elle se calcule. Mute `vals` ; false en cas de contradiction. C'est à la
 * fois le cœur du solveur et la définition de « résoluble sans deviner ».
 */
function deduire(equations, vals) {
    let bouge = true;
    while (bouge) {
        bouge = false;
        for (const eq of equations) {
            const { a, b, z, z2, op } = eq;
            const double = z2 !== undefined;
            const va = vals[a], vb = vals[b], vz = vals[z], vz2 = double ? vals[z2] : 0;
            const inconnues = [va, vb, vz].filter(v => v === null).length
                + (double && vals[z2] === null ? 1 : 0);

            if (inconnues === 0) {
                const T = double ? 10 * vz + vz2 : vz;
                if (calculer(op, va, vb) !== T || (double && vz < 1)) return false;
                continue;
            }
            if (inconnues > 1) continue;

            let idx, v;
            if (va === null || vb === null) {
                const T = double ? 10 * vz + vz2 : vz;
                if (va === null) { idx = a; v = retrouverA(op, vb, T); }
                else { idx = b; v = retrouverB(op, va, T); }
            } else {
                const T = calculer(op, va, vb);
                if (T === null) return false;
                if (!double) { idx = z; v = T; }
                else if (vz === null) {
                    // T et les unités connues : les dizaines s'en déduisent.
                    if (T < 10 || T > 99 || T % 10 !== vz2) return false;
                    idx = z; v = Math.floor(T / 10);
                } else {
                    if (T < 10 || T > 99 || Math.floor(T / 10) !== vz) return false;
                    idx = z2; v = T % 10;
                }
            }
            if (v === undefined) continue;
            if (!chiffre(v)) return false;
            if (z2 !== undefined && idx === z && v < 1) return false; // pas de dizaine nulle
            vals[idx] = v;
            bouge = true;
        }
    }
    return true;
}

/** La grille est-elle terminable par déduction seule, sans jamais brancher ? */
export function resolubleParDeduction(structure, givens) {
    const vals = [...givens];
    return deduire(structure.equations, vals) && !vals.includes(null);
}

/** Compte les solutions (arrêt à `limite`). Exporté pour les tests. */
export function compterSolutionsGaram(structure, givens, limite = 2, sorties = null) {
    const { equations } = structure;
    let count = 0;

    const chercher = (vals) => {
        if (count >= limite) return;
        const w = [...vals];
        if (!deduire(equations, w)) return;
        const libre = w.indexOf(null);
        if (libre === -1) {
            for (const { a, b, z, z2, op } of equations) {
                const T = z2 !== undefined ? 10 * w[z] + w[z2] : w[z];
                if (calculer(op, w[a], w[b]) !== T) return;
            }
            count++;
            if (sorties) sorties.push(w);
            return;
        }
        for (let d = 0; d <= 9 && count < limite; d++) {
            w[libre] = d;
            chercher(w);
            w[libre] = null;
        }
    };

    chercher([...givens]);
    return count;
}

// --- Construction d'un treillis complet ---------------------------------------

/**
 * Remplit le treillis égalité par égalité, dans l'ordre de construction.
 * Pour chaque égalité, on énumère (opérations mélangées × valeurs mélangées)
 * et on garde la première combinaison valide — bien plus sûr que tirer au
 * hasard et rejeter, qui s'effondrait en cascade.
 */
function treillisNeuf(rng, structure, autorisees, essais = 800) {
    const { equations, cells } = structure;

    // Prévoyance sur les cases DIZAINES : une case qui servira de dizaines à
    // un résultat double ne peut pas prendre n'importe quelle valeur — en
    // addition pure, la somme de deux chiffres plafonne à 18, la dizaine vaut
    // forcément 1. Sans ce garde-fou, la construction posait ces cases à
    // l'aveugle et le grand treillis échouait trois fois sur quatre.
    const opsDoubles = autorisees.filter(o => o === 'add' || o === 'mul');
    const doubles = opsDoubles.length ? opsDoubles : ['add'];
    const dizainesOk = new Set();
    if (doubles.includes('add')) dizainesOk.add(1);
    if (doubles.includes('mul')) for (let t = 1; t <= 8; t++) dizainesOk.add(t);
    const casesDizaines = new Set(equations.filter(e => e.z2 !== undefined).map(e => e.z));

    for (let essai = 0; essai < essais; essai++) {
        const vals = Array(cells.length).fill(null);
        let ok = true;

        for (const eq of equations) {
            const { a, b, z, z2 } = eq;
            const double = z2 !== undefined;
            // Un résultat à deux chiffres exige + ou × (9 − 0 et 9 ÷ 1 plafonnent à 9).
            const possibles = double ? doubles : autorisees;

            let trouve = false;
            for (const op of rng.shuffle(double ? [...possibles, 'mul'] : possibles)) {
                if (double && !possibles.includes(op)) continue;
                // La seule vraie liberté est la case `b` (ou `a` si b est déjà
                // posé) : tout le reste se déduit. On énumère ses dix valeurs
                // en ordre aléatoire et on prend la première qui marche.
                for (const v of rng.shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])) {
                    const w = [...vals];
                    if (w[a] === null) w[a] = (w[b] === null && w[z] === null) ? rng.int(0, 9) : null;
                    if (w[a] === null) w[a] = v;
                    else if (w[b] === null) w[b] = v;
                    else if (w[z] === null && !double) { /* z se déduira */ }
                    const t = { ...eq, op };
                    const copie = [...w];
                    if (!deduire([t], copie)) continue;
                    // L'égalité doit être ENTIÈREMENT résolue à ce stade.
                    if ([a, b, z].some(i => copie[i] === null) || (double && copie[z2] === null)) continue;
                    const T = double ? 10 * copie[z] + copie[z2] : copie[z];
                    if (double && (T < 10 || T > 99)) continue;
                    if (!double && (T < 0 || T > 9)) continue;
                    // Une case dizaines posée hors de ses valeurs admissibles
                    // condamnerait l'égalité double à venir : on refuse ici.
                    let dizainesValides = true;
                    for (const i of casesDizaines) {
                        if (copie[i] !== null && !dizainesOk.has(copie[i])) { dizainesValides = false; break; }
                    }
                    if (!dizainesValides) continue;
                    eq.op = op;
                    for (let i = 0; i < copie.length; i++) vals[i] = copie[i];
                    trouve = true;
                    break;
                }
                if (trouve) break;
            }
            if (!trouve) { ok = false; break; }
        }
        if (ok) return vals;
    }
    return null;
}

// --- Générateur ---------------------------------------------------------------

export const garamGenerator = {
    id: 'logique.garam',
    label: 'Garam',
    skills: ['num.logique.garam'],
    answerKinds: ['grid'],
    params: [
        {
            id: 'taille', type: 'select', label: 'Taille', default: 'petit',
            options: [
                { value: 'petit', label: 'Petit (7 égalités)' },
                { value: 'grand', label: 'Grand (12 égalités)' }
            ]
        },
        {
            id: 'operations', type: 'multiselect', label: 'Opérations', default: ['add', 'sub', 'mul'],
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
                { value: 'facile', label: 'Facile (plus de cases données)' },
                { value: 'moyen', label: 'Moyen' },
                { value: 'difficile', label: 'Difficile (le minimum de cases)' }
            ]
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const taille = params.taille === 'grand' ? 'grand' : 'petit';
        const autorisees = Array.isArray(params.operations) && params.operations.length
            ? params.operations : ['add', 'sub', 'mul'];
        const difficulte = CIBLES_DONNEES[params.difficulte] ? params.difficulte : 'facile';

        const structure = construireStructure(taille);
        const solution = treillisNeuf(rng, structure, autorisees)
            || treillisNeuf(rng, structure, ['add'], 3000);

        // Creusage : un retrait n'est conservé que si la grille reste
        // RÉSOLUBLE PAR DÉDUCTION seule — garantie plus forte que l'unicité
        // (une valeur déduite est forcée), et c'est elle qui rend la grille
        // agréable : il y a toujours un prochain coup.
        const givens = [...solution];
        let restantes = givens.length;
        const cible = Math.round(CIBLES_DONNEES[difficulte] * givens.length);
        for (const idx of rng.shuffle(Array.from({ length: givens.length }, (_, i) => i))) {
            if (restantes <= cible) break;
            const memo = givens[idx];
            givens[idx] = null;
            if (!resolubleParDeduction(structure, givens)) givens[idx] = memo;
            else restantes--;
        }

        return makeItem({
            seed: rng.seed,
            generatorId: 'logique.garam',
            skillId: 'num.logique.garam',
            answerKind: 'grid',
            prompt: {
                text: 'Complète les cases avec des chiffres pour que toutes les égalités soient vraies. Deux cases collées forment un nombre à deux chiffres.',
                html: '<div class="game-question kenken-consigne">Complète les cases pour que <b>toutes les égalités</b> soient vraies. Deux cases collées forment un <b>nombre à deux chiffres</b>.</div>'
            },
            // Préfixe « g » : l'égalité stricte, pas parseFloat (voir kenken.js).
            answer: 'g' + solution.join('/'),
            hints: [
                'Observe la zone entourée en orange : une égalité y est fausse, ou il n\'y manque qu\'une case.',
                'Une case a été remplie pour toi. Les égalités qui la traversent se débloquent.'
            ],
            explanation: 'Chaque égalité, horizontale ou verticale, doit être vraie — les cases partagées et les nombres à deux chiffres relient tout le treillis.',
            difficulty: DIFFICULTE_ITEM[difficulte] + (taille === 'grand' ? 1 : 0),
            meta: {
                structure: {
                    cells: structure.cells,
                    equations: structure.equations.map(eq => ({ ...eq })),
                    signes: structure.signes.map(sg => sg.role === 'op'
                        ? { r: sg.r, c: sg.c, glyphe: OPS_GARAM[structure.equations[sg.eq].op].symbole }
                        : { r: sg.r, c: sg.c, glyphe: sg.glyphe }),
                    rows: structure.rows,
                    cols: structure.cols
                },
                givens,
                solution,
                nbDonnees: restantes
            }
        });
    }
};
