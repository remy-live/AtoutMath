// Générateur de Garam.
//
// Un treillis de petites égalités croisées : des équations horizontales
// « a ∘ b = c » dont certaines cases servent aussi d'équations VERTICALES.
// Toutes les cases sont des chiffres de 0 à 9, les opérations sont imprimées,
// l'élève ne remplit que les chiffres. L'intérêt didactique est le calcul
// dans les deux sens : trouver un résultat, mais aussi un opérande manquant.
//
// Même principe que le Binairo : on construit d'abord un treillis COMPLET qui
// vérifie toutes les égalités, puis on le creuse case par case — un retrait
// n'est conservé que si la solution reste unique. Le solveur ne force pas
// bêtement : il DÉDUIT (deux cases connues d'une égalité imposent la
// troisième), et ne branche que sur ce qui reste — comme l'élève.
//
// Structure « petit » (7 égalités, 15 cases) :
//
//     A ∘ B = C     D ∘ E = F
//     ∘             ∘   (et ∘ sous C)
//     G       H     I
//     =       =     =
//     J ∘ K = L     M ∘ N = O
//
// Verticales : A∘G=J, C∘H=L, D∘I=M. « Grand » prolonge le motif d'un étage :
// J, L et M deviennent les têtes de trois nouvelles verticales menant à deux
// égalités horizontales de plus (12 égalités, 24 cases).

import { makeItem } from '../items.js';

export const OPS_GARAM = {
    add: { symbole: '+', calc: (a, b) => a + b },
    sub: { symbole: '−', calc: (a, b) => a - b },
    mul: { symbole: '×', calc: (a, b) => a * b },
    div: { symbole: '÷', calc: (a, b) => (b !== 0 && a % b === 0 ? a / b : null) }
};

/** a ∘ b, ou null si le résultat n'est pas un chiffre de 0 à 9. */
function evaluer(op, a, b) {
    const v = OPS_GARAM[op].calc(a, b);
    return v === null || v < 0 || v > 9 || !Number.isInteger(v) ? null : v;
}

// Part de cases données visée après creusage, comme au Binairo.
const CIBLES_DONNEES = { facile: 0.50, moyen: 0.38, difficile: 0.26 };
const DIFFICULTE_ITEM = { facile: 2, moyen: 3, difficile: 4 };

// --- Structures -------------------------------------------------------------

/**
 * Le treillis : cases positionnées sur une grille d'affichage (ligne,
 * colonne), égalités désignant leurs cases par indice, signes (∘ et =) posés
 * entre les cases. `ordre` est l'ordre de construction : chaque case y est
 * soit libre, soit déduite de l'égalité précédente — c'est lui qui rend la
 * génération constructive.
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
    // Une égalité horizontale occupe cinq colonnes : a ∘ b = c.
    const H = (r, c0) => {
        const eq = { a: cell(r, c0), b: cell(r, c0 + 2), z: cell(r, c0 + 4), op: null };
        signes.push({ r, c: c0 + 1, eq: equations.length, role: 'op' });
        signes.push({ r, c: c0 + 3, glyphe: '=' });
        equations.push(eq);
        return eq;
    };
    // Une verticale descend de deux lignes par case : a ∘ g = j.
    const V = (r0, c) => {
        const eq = { a: cell(r0, c), b: cell(r0 + 2, c), z: cell(r0 + 4, c), op: null };
        signes.push({ r: r0 + 1, c, eq: equations.length, role: 'op' });
        signes.push({ r: r0 + 3, c, glyphe: '=' });
        equations.push(eq);
        return eq;
    };

    // Étage : deux horizontales en haut (r), trois verticales, deux
    // horizontales en bas (r+4). Les têtes des verticales sont A, C et D.
    const etage = (r) => {
        H(r, 0); H(r, 6);
        V(r, 0); V(r, 4); V(r, 6);
        H(r + 4, 0); H(r + 4, 6);
    };

    etage(0);
    if (taille === 'grand') {
        // Les verticales du second étage partent de J (0,0), L (4,4) et
        // M (4,6) — les égalités du bas du premier étage sont déjà posées,
        // seules s'ajoutent les verticales et le nouveau bas.
        V(4, 0); V(4, 4); V(4, 6);
        H(8, 0); H(8, 6);
    }

    const rows = taille === 'grand' ? 9 : 5;
    return { cells, equations, signes, rows, cols: 11 };
}

// --- Solveur ----------------------------------------------------------------

/**
 * Compte les solutions d'un treillis partiel, en s'arrêtant à `limite`.
 * Exporté pour les tests. Déduction d'abord : dans chaque égalité, deux cases
 * connues imposent la troisième (l'inverse d'une soustraction est une
 * addition, celui d'une division une multiplication) ; on ne branche que sur
 * les cases qu'aucune déduction n'atteint.
 */
export function compterSolutionsGaram(structure, givens, limite = 2, sorties = null) {
    const { equations } = structure;
    let count = 0;

    // a ∘ b = z : retrouver a ou b. `undefined` = pas déductible (0×b=0),
    // null = contradiction.
    const retrouverA = (op, b, z) => {
        if (op === 'add') return z - b;
        if (op === 'sub') return z + b;
        if (op === 'mul') return b === 0 ? (z === 0 ? undefined : null) : (z % b === 0 ? z / b : null);
        return z * b; // div : a = z × b (b ≠ 0 vérifié à l'évaluation)
    };
    const retrouverB = (op, a, z) => {
        if (op === 'add') return z - a;
        if (op === 'sub') return a - z;
        if (op === 'mul') return a === 0 ? (z === 0 ? undefined : null) : (z % a === 0 ? z / a : null);
        return z === 0 ? (a === 0 ? undefined : null) : (a % z === 0 ? a / z : null); // div : b = a ÷ z
    };

    const deduire = (vals) => {
        let bouge = true;
        while (bouge) {
            bouge = false;
            for (const { a, b, z, op } of equations) {
                const va = vals[a], vb = vals[b], vz = vals[z];
                const connues = (va !== null) + (vb !== null) + (vz !== null);
                if (connues === 3) {
                    if (evaluer(op, va, vb) !== vz) return false;
                } else if (connues === 2) {
                    let idx, v;
                    if (va === null) { idx = a; v = retrouverA(op, vb, vz); }
                    else if (vb === null) { idx = b; v = retrouverB(op, va, vz); }
                    else { idx = z; v = evaluer(op, va, vb); }
                    if (v === undefined) continue;
                    if (v === null || v < 0 || v > 9 || !Number.isInteger(v)) return false;
                    vals[idx] = v;
                    bouge = true;
                }
            }
        }
        return true;
    };

    const chercher = (vals) => {
        if (count >= limite) return;
        const w = [...vals];
        if (!deduire(w)) return;
        const libre = w.indexOf(null);
        if (libre === -1) {
            // Toutes les égalités doivent être revérifiées : la déduction peut
            // avoir terminé sans repasser partout.
            for (const { a, b, z, op } of equations) {
                if (evaluer(op, w[a], w[b]) !== w[z]) return;
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

// --- Générateur -------------------------------------------------------------

/**
 * Second opérande compatible : tiré pour que « a ∘ b » reste un chiffre.
 * Tirer au hasard puis rejeter faisait s'effondrer la construction du grand
 * treillis — douze égalités à satisfaire en cascade.
 */
function tirerB(rng, op, a) {
    if (op === 'add') return rng.int(0, 9 - a);
    if (op === 'sub') return rng.int(0, a);
    if (op === 'mul') return a === 0 ? rng.int(0, 9) : rng.int(0, Math.floor(9 / a));
    if (a === 0) return rng.int(1, 9);                       // 0 ÷ b = 0
    const diviseurs = [];
    for (let b = 1; b <= 9; b++) if (a % b === 0) diviseurs.push(b);
    return rng.pick(diviseurs);
}

/** Un treillis complet valide : opérations tirées, chiffres construits. */
function treillisNeuf(rng, structure, autorisees) {
    const { equations, cells } = structure;

    for (let essai = 0; essai < 600; essai++) {
        // De nouvelles opérations régulièrement : certaines combinaisons
        // (divisions en cascade) sont ingrates, inutile de s'y acharner.
        if (essai % 40 === 0) {
            for (const eq of equations) eq.op = rng.pick(autorisees);
        }

        const vals = Array(cells.length).fill(null);
        let ok = true;
        for (const eq of equations) {
            const { a, b, z, op } = eq;
            // Les têtes des égalités suivantes sont souvent déjà remplies par
            // les précédentes — c'est le croisement du Garam.
            if (vals[a] === null) vals[a] = rng.int(0, 9);
            if (vals[b] === null) {
                if (vals[z] !== null) {
                    // z déjà imposé par une verticale : b se déduit.
                    const b2 = op === 'add' ? vals[z] - vals[a]
                        : op === 'sub' ? vals[a] - vals[z]
                        : op === 'mul' ? (vals[a] !== 0 && vals[z] % vals[a] === 0 ? vals[z] / vals[a] : null)
                        : (vals[z] !== 0 && vals[a] % vals[z] === 0 ? vals[a] / vals[z] : null);
                    if (b2 === null || b2 < 0 || b2 > 9 || !Number.isInteger(b2)) { ok = false; break; }
                    vals[b] = b2;
                } else {
                    vals[b] = tirerB(rng, op, vals[a]);
                }
            }
            const z2 = evaluer(op, vals[a], vals[b]);
            if (z2 === null || (vals[z] !== null && vals[z] !== z2)) { ok = false; break; }
            vals[z] = z2;
        }
        if (ok) return vals;
    }
    return null;
}

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
            ? params.operations : ['add', 'sub'];
        const difficulte = CIBLES_DONNEES[params.difficulte] ? params.difficulte : 'facile';

        const structure = construireStructure(taille);
        const sol = treillisNeuf(rng, structure, autorisees);
        // Introuvable (opérations trop restrictives) : repli sur l'addition,
        // qui est toujours satisfiable.
        const solution = sol || treillisNeuf(rng, structure, ['add']);

        // Creusage à solution unique, comme au Binairo.
        const givens = [...solution];
        let restantes = givens.length;
        const cible = Math.round(CIBLES_DONNEES[difficulte] * givens.length);
        for (const idx of rng.shuffle(Array.from({ length: givens.length }, (_, i) => i))) {
            if (restantes <= cible) break;
            const memo = givens[idx];
            givens[idx] = null;
            if (compterSolutionsGaram(structure, givens) > 1) givens[idx] = memo;
            else restantes--;
        }

        return makeItem({
            seed: rng.seed,
            generatorId: 'logique.garam',
            skillId: 'num.logique.garam',
            answerKind: 'grid',
            prompt: {
                text: 'Complète les cases avec des chiffres de 0 à 9 pour que toutes les égalités soient vraies.',
                html: '<div class="game-question kenken-consigne">Complète les cases (chiffres de <b>0 à 9</b>) pour que <b>toutes les égalités</b>, horizontales et verticales, soient vraies.</div>'
            },
            // Préfixe « g » : voir kenken.js — l'égalité stricte, pas parseFloat.
            answer: 'g' + solution.join('/'),
            hints: [
                'Observe la zone entourée en orange : une égalité y est fausse, ou presque complète.',
                'Une case a été remplie pour toi. Les égalités qui la traversent se débloquent.'
            ],
            explanation: 'Chaque égalité, lue horizontalement ou verticalement, doit être vraie — y compris celles qui partagent une case.',
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
