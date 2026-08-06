// Générateur de Garam.
//
// La structure est celle des fiches officielles (garam.io), relevée sur un
// livret original : une BRIQUE de trois colonnes et QUATRE rangées.
//
//     A op B = C          ← horizontale haute, résultat à un chiffre
//     op       op
//     D        E
//     =        =
//     P        Q          ← DIZAINES des résultats verticaux
//     F op G = H          ← et leurs UNITÉS, qui servent aussi
//                           d'opérande et de résultat à l'horizontale basse
//
// Quatre égalités par brique, dix cases, et tout se referme : la case F est
// à la fois l'unité de la verticale gauche et le premier terme de
// l'horizontale basse ; H est l'unité de la verticale droite et le résultat
// de cette même horizontale.
//
// La conséquence tient en une phrase, et c'est elle qui fait le jeu : une
// VERTICALE donne toujours un nombre à DEUX CHIFFRES, écrit de haut en bas.
// Donc une verticale ne peut être qu'une addition ou une multiplication —
// une soustraction ou une division de deux chiffres ne dépasse jamais 9.
// Les horizontales, elles, tiennent sur un chiffre et acceptent les quatre
// opérations.
//
// Les briques s'assemblent par des PONTS : une case entre deux briques, qui
// porte sa propre égalité. Petit : deux briques côte à côte et un pont
// (9 égalités, 21 cases). Grand : quatre briques en carré et quatre ponts,
// exactement la fiche originale (20 égalités, 44 cases).
//
// Trois garanties : solution unique ; RÉSOLUBLE SANS DEVINER (on ne creuse
// une case que si la grille reste terminable par pur enchaînement de
// déductions — dans chaque égalité où il ne manque qu'une case, elle se
// calcule) ; et tout est semé, une grille = une graine.
//
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
 * Le treillis, brique par brique.
 *
 * Les égalités sont rangées dans l'ORDRE DE CONSTRUCTION : chacune ne dépend
 * que de cases déjà posées par les précédentes. C'est pour ça que l'ordre
 * change d'une brique à l'autre — un pont a pu poser B ou D d'avance.
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
    const pousser = (eq, opPos, egalPos) => {
        signes.push({ r: opPos[0], c: opPos[1], eq: equations.length, role: 'op' });
        signes.push({ r: egalPos[0], c: egalPos[1], glyphe: '=' });
        equations.push(eq);
        return eq;
    };

    /**
     * Une brique en (r0, c0). Dix cases, quatre égalités.
     *
     *   r0    : A [op] B [=] C
     *   r0+1  : [op]        [op]
     *   r0+2  : D            E
     *   r0+3  : [=]         [=]
     *   r0+4  : P            Q      ← dizaines, collées à la rangée suivante
     *   r0+5  : F [op] G [=] H      ← unités
     *
     * `ordre` liste les égalités dans l'ordre de construction voulu — il
     * change selon ce que les ponts ont déjà posé (B ou D connus).
     */
    const brique = (r0, c0, ordre) => {
        const A = cell(r0, c0), B = cell(r0, c0 + 2), C = cell(r0, c0 + 4);
        const D = cell(r0 + 2, c0), E = cell(r0 + 2, c0 + 4);
        const P = cell(r0 + 4, c0), Q = cell(r0 + 4, c0 + 4);
        const F = cell(r0 + 5, c0), G = cell(r0 + 5, c0 + 2), H = cell(r0 + 5, c0 + 4);
        const eqs = {
            H1: { a: A, b: B, z: C, op: null, _s: [[r0, c0 + 1], [r0, c0 + 3]] },
            // Les VERTICALES portent le résultat double : dizaines au-dessus,
            // unités en dessous. Ce sont elles, et elles seules, qui obligent
            // à passer la dizaine — c'est là qu'est le travail.
            VL: { a: A, b: D, z: P, z2: F, op: null, _s: [[r0 + 1, c0], [r0 + 3, c0]] },
            VR: { a: C, b: E, z: Q, z2: H, op: null, _s: [[r0 + 1, c0 + 4], [r0 + 3, c0 + 4]] },
            H2: { a: F, b: G, z: H, op: null, _s: [[r0 + 5, c0 + 1], [r0 + 5, c0 + 3]] }
        };
        for (const nom of ordre) pousser(eqs[nom], eqs[nom]._s[0], eqs[nom]._s[1]);
        Object.values(eqs).forEach(eq => delete eq._s);
        return { A, B, C, D, E, P, Q, F, G, H };
    };

    // Un pont : a ∘ M = z, avec sa case M à lui. `sens` place les signes.
    const pont = (a, z, mPos) => {
        const M = cell(mPos[0], mPos[1]);
        const horizontal = mPos[2] === 'h';
        const opPos = horizontal ? [mPos[0], mPos[1] - 1] : [mPos[0] - 1, mPos[1]];
        const egalPos = horizontal ? [mPos[0], mPos[1] + 1] : [mPos[0] + 1, mPos[1]];
        return pousser({ a, b: M, z, op: null }, opPos, egalPos);
    };

    // Brique haut-gauche : rien n'est connu, ordre naturel.
    const TL = brique(0, 0, ['H1', 'VL', 'VR', 'H2']);

    // Pont horizontal haut : E(TL) ∘ M = D(TR).
    const D_TR = cell(2, 8);
    pont(TL.E, D_TR, [2, 6, 'h']);
    // Brique haut-droite : D est posé par le pont — la verticale gauche se
    // construit d'abord (A libre, P et F déduits), le reste suit.
    const TR = brique(0, 8, ['VL', 'H1', 'VR', 'H2']);

    if (taille === 'petit') return { cells, equations, signes, rows: 6, cols: 13 };

    // Pont vertical gauche : G(TL) ∘ M = B(BL).
    const B_BL = cell(9, 2);
    pont(TL.G, B_BL, [7, 2, 'v']);
    const BL = brique(9, 0, ['H1', 'VL', 'VR', 'H2']);
    // Pont vertical droit, puis pont horizontal bas.
    const B_BR = cell(9, 10);
    pont(TR.G, B_BR, [7, 10, 'v']);
    const D_BR = cell(11, 8);
    pont(BL.E, D_BR, [11, 6, 'h']);
    // Brique bas-droite : B et D posés par les ponts.
    brique(9, 8, ['H1', 'VL', 'VR', 'H2']);

    return { cells, equations, signes, rows: 15, cols: 13 };
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
            // Les deux opérandes connus : le résultat l'est aussi, DIZAINES ET
            // UNITÉS comprises. Deux cases se remplissent d'un coup — ce n'est
            // pas deviner, c'est poser une opération. Sans ce cas, une brique
            // dont A et D sont déjà là restait bloquée : deux inconnues, donc
            // écartée, alors que rien n'était incertain.
            if (double && va !== null && vb !== null && vz === null && vals[z2] === null) {
                const T = calculer(op, va, vb);
                if (T === null || T < 10 || T > 99) return false;
                vals[z] = Math.floor(T / 10);
                vals[z2] = T % 10;
                bouge = true;
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

    // Prévoyance à DEUX niveaux. Une case dizaines est le résultat d'une
    // égalité de l'anneau : la case qui OUVRE cette égalité doit pouvoir y
    // mener (en addition pure, dizaines = 1, donc C ≤ 1) ; et la case qui
    // ouvre l'égalité double doit pouvoir dépasser 10 (F ≥ 1 en addition).
    // Sans ces deux gardes, l'addition seule échouait encore en cascade.
    const nourritDizaines = new Set();
    const ouvreDouble = new Set();
    for (const eq of equations) {
        if (eq.z2 !== undefined) ouvreDouble.add(eq.a);
        else if (casesDizaines.has(eq.z)) nourritDizaines.add(eq.a);
    }
    const peutNourrir = (val) => {
        for (const op of autorisees) for (let v = 0; v <= 9; v++) {
            const t = calculer(op, val, v);
            if (t !== null && dizainesOk.has(t)) return true;
        }
        return false;
    };
    const peutOuvrir = (val) => {
        for (const op of doubles) for (let v = 0; v <= 9; v++) {
            const t = calculer(op, val, v);
            if (t !== null && t >= 10 && t <= 99) return true;
        }
        return false;
    };

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
                    // Une case posée qui condamnerait une égalité à venir est
                    // refusée ici : dizaines hors valeurs admissibles, ouvreuse
                    // de dizaines sans issue, ouvreuse de double trop petite.
                    let avenirValide = true;
                    for (const i of casesDizaines) {
                        if (copie[i] !== null && !dizainesOk.has(copie[i])) { avenirValide = false; break; }
                    }
                    if (avenirValide) for (const i of nourritDizaines) {
                        if (copie[i] !== null && vals[i] === null && !peutNourrir(copie[i])) { avenirValide = false; break; }
                    }
                    if (avenirValide) for (const i of ouvreDouble) {
                        if (copie[i] !== null && vals[i] === null && !peutOuvrir(copie[i])) { avenirValide = false; break; }
                    }
                    if (!avenirValide) continue;
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

/**
 * Note de « vivacité » d'un treillis.
 *
 * Une grille pleine de 0 et de 1 est juste, et sans intérêt : « 0 + 0 = 0 »
 * ne se calcule pas, il se lit. On récompense donc la VARIÉTÉ des chiffres et
 * on pénalise les zéros, ainsi que les opérations neutres (∘ 0 pour + et −,
 * ∘ 1 pour × et ÷) qui ne demandent aucun effort.
 */
function qualiteTreillis(vals, structure) {
    const distincts = new Set(vals).size;
    const zeros = vals.filter(v => v === 0).length;
    let neutres = 0;
    for (const eq of structure.equations) {
        const b = vals[eq.b];
        if ((eq.op === 'add' || eq.op === 'sub') && b === 0) neutres++;
        if ((eq.op === 'mul' || eq.op === 'div') && b === 1) neutres++;
        if (eq.op === 'mul' && (b === 0 || vals[eq.a] === 0)) neutres++;
    }
    return distincts * 4 - zeros * 2 - neutres * 3;
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
                { value: 'petit', label: 'Petit (9 égalités)' },
                { value: 'grand', label: 'Grand (20 égalités)' }
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
        // On tire PLUSIEURS treillis et on garde le plus vivant.
        //
        // La construction prend la première combinaison valide, ce qui la fait
        // pencher vers les valeurs dégénérées : « 0 + 0 = 0 », « 1 − 0 = 1 ».
        // Rien de faux, mais rien à calculer non plus. Quelques tirages de plus
        // coûtent une milliseconde et donnent une grille qui ressemble à celles
        // du livret.
        // `treillisNeuf` ÉCRIT les opérations dans la structure : garder un
        // candidat suppose donc de garder ses opérations avec lui, sinon le
        // tirage suivant les écrase et la grille conservée devient fausse.
        let solution = null, opsRetenues = null, meilleure = -Infinity;
        for (let essai = 0; essai < 5; essai++) {
            const candidat = treillisNeuf(rng, structure, autorisees);
            if (!candidat) continue;
            const note = qualiteTreillis(candidat, structure);
            if (note > meilleure) {
                meilleure = note;
                solution = candidat;
                opsRetenues = structure.equations.map(e => e.op);
            }
        }
        if (!solution) solution = treillisNeuf(rng, structure, ['add'], 3000);
        else structure.equations.forEach((e, i) => { e.op = opsRetenues[i]; });

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
                text: 'Complète les cases avec des chiffres pour que toutes les égalités soient vraies. Les égalités verticales donnent un nombre à deux chiffres : les dizaines au-dessus, les unités en dessous.',
                html: '<div class="game-question kenken-consigne">Complète les cases pour que <b>toutes les égalités</b> soient vraies. Une égalité <b>verticale</b> donne un nombre à <b>deux chiffres</b> : dizaines au-dessus, unités en dessous.</div>'
            },
            // Préfixe « g » : l'égalité stricte, pas parseFloat (voir kenken.js).
            answer: 'g' + solution.join('/'),
            hints: [
                'Observe la zone entourée en orange : une égalité y est fausse, ou il n\'y manque qu\'une case.',
                'Une case a été remplie pour toi. Les égalités qui la traversent se débloquent.'
            ],
            explanation: 'Chaque égalité doit être vraie, horizontale comme verticale. Les verticales dépassent toujours dix : leur résultat s’écrit sur deux cases empilées, et la case du bas sert aussi à l’égalité horizontale — c’est ce qui relie tout le treillis.',
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
