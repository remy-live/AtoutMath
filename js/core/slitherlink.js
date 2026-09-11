// LE SLITHERLINK — une seule boucle, dictée par des chiffres.
//
// Sur un quadrillage de points, on trace des segments entre points voisins.
// Le tracé fini doit former UNE SEULE boucle fermée qui ne se croise ni ne se
// touche. Chaque chiffre écrit dans une case dit combien de ses quatre côtés
// appartiennent à la boucle. Une case vide ne dit rien.
//
// Ce que le puzzle fait travailler, c'est le RAISONNEMENT PAR L'ABSURDE et le
// dénombrement : « ce 3 a déjà deux côtés barrés, donc les deux autres sont
// tracés », « ce 0 interdit ses quatre côtés, donc la boucle contourne ».
//
// LA CLEF DE FABRICATION : on ne raisonne pas sur les segments mais sur les
// CASES, chacune dedans ou dehors de la boucle. Un segment est tracé
// exactement quand ses deux cases voisines sont de camps différents (le dehors
// du quadrillage comptant comme « dehors »). Dans cette lecture :
//
//   · un chiffre = le nombre de voisines de camp opposé — une contrainte de
//     comptage, propre et locale ;
//   · « une seule boucle qui ne se touche pas » = le dedans est d'un seul
//     tenant, le dehors aussi, et jamais deux cases opposées en diagonale
//     seules à un sommet (ce serait un croisement).
//
// On fabrique donc un dedans au hasard en maintenant ces trois invariants, on
// en déduit tous les chiffres, puis on en retire tant qu'un solveur par
// PROPAGATION PURE termine encore. Ce solveur ne devine jamais : s'il termine,
// la solution est unique ET un élève peut y arriver par déductions seules.

export const VIDE = -1;

/** Les quatre voisines d'une case. */
const VOISINS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** Le segment horizontal sous le point (x, y) : y va de 0 à `lignes`. */
export const clefH = (cols, x, y) => y * cols + x;
/** Le segment vertical à droite du point (x, y) : x va de 0 à `cols`. */
export const clefV = (cols, x, y) => y * (cols + 1) + x;

/** Le camp d'une case — hors du quadrillage, c'est toujours le dehors. */
export const camp = (col, cols, lignes, x, y) =>
    (x < 0 || y < 0 || x >= cols || y >= lignes) ? 0 : col[y * cols + x];

/** Les segments de la boucle : là où deux cases voisines changent de camp. */
export function aretesDe(interieur, cols, lignes) {
    const h = new Uint8Array((lignes + 1) * cols);
    const v = new Uint8Array(lignes * (cols + 1));
    for (let y = 0; y <= lignes; y++) for (let x = 0; x < cols; x++) {
        h[clefH(cols, x, y)] = camp(interieur, cols, lignes, x, y - 1)
            !== camp(interieur, cols, lignes, x, y) ? 1 : 0;
    }
    for (let y = 0; y < lignes; y++) for (let x = 0; x <= cols; x++) {
        v[clefV(cols, x, y)] = camp(interieur, cols, lignes, x - 1, y)
            !== camp(interieur, cols, lignes, x, y) ? 1 : 0;
    }
    return { h, v };
}

/** Tous les chiffres d'un dedans donné : le nombre de voisines opposées. */
export function indicesDe(interieur, cols, lignes) {
    const ind = new Int8Array(cols * lignes);
    for (let y = 0; y < lignes; y++) for (let x = 0; x < cols; x++) {
        const s = interieur[y * cols + x];
        let k = 0;
        for (const [dx, dy] of VOISINS) {
            if (camp(interieur, cols, lignes, x + dx, y + dy) !== s) k++;
        }
        ind[y * cols + x] = k;
    }
    return ind;
}

/**
 * Le sommet (x, y) verrait-il la boucle se croiser ? C'est le cas quand les
 * deux cases d'une diagonale sont dedans et les deux autres dehors : quatre
 * segments se rejoindraient en un point, ce que le Slitherlink interdit.
 */
function croisementAuSommet(a, b, c, d) {
    return a === d && b === c && a !== b;
}

/** Toute case hors de la boucle touche-t-elle encore le grand dehors ? */
function dehorsDUnSeulTenant(col, cols, lignes) {
    const vu = new Uint8Array(cols * lignes);
    const file = [];
    const pousser = (x, y) => {
        if (x < 0 || y < 0 || x >= cols || y >= lignes) return;
        const i = y * cols + x;
        if (col[i] || vu[i]) return;
        vu[i] = 1; file.push([x, y]);
    };
    // Le grand dehors touche toutes les cases du bord.
    for (let x = 0; x < cols; x++) { pousser(x, 0); pousser(x, lignes - 1); }
    for (let y = 0; y < lignes; y++) { pousser(0, y); pousser(cols - 1, y); }
    while (file.length) {
        const [x, y] = file.pop();
        for (const [dx, dy] of VOISINS) pousser(x + dx, y + dy);
    }
    for (let i = 0; i < col.length; i++) if (!col[i] && !vu[i]) return false;
    return true;
}

/** Le dedans reste-t-il licite après avoir ajouté la case (x, y) ? */
function ajoutLicite(col, cols, lignes, x, y) {
    for (let sy = y; sy <= y + 1; sy++) for (let sx = x; sx <= x + 1; sx++) {
        if (croisementAuSommet(
            camp(col, cols, lignes, sx - 1, sy - 1), camp(col, cols, lignes, sx, sy - 1),
            camp(col, cols, lignes, sx - 1, sy), camp(col, cols, lignes, sx, sy))) return false;
    }
    return dehorsDUnSeulTenant(col, cols, lignes);
}

/**
 * Un dedans au hasard : on part d'une case et on grossit par la frontière, en
 * refusant tout ajout qui enfermerait du dehors ou croiserait la boucle.
 */
export function genererInterieur(cols, lignes, rng) {
    const n = cols * lignes;
    const minimum = Math.max(3, Math.round(n * 0.25));
    for (let essai = 0; essai < 40; essai++) {
        const col = new Uint8Array(n);
        col[rng.int(0, lignes - 1) * cols + rng.int(0, cols - 1)] = 1;
        let taille = 1;
        const cible = Math.max(4, Math.round(n * (0.34 + rng.next() * 0.18)));
        while (taille < cible) {
            const bord = [];
            for (let y = 0; y < lignes; y++) for (let x = 0; x < cols; x++) {
                if (col[y * cols + x]) continue;
                if (VOISINS.some(([dx, dy]) => camp(col, cols, lignes, x + dx, y + dy) === 1)) {
                    bord.push([x, y]);
                }
            }
            if (!bord.length) break;
            let pose = false;
            for (const [x, y] of rng.shuffle(bord)) {
                col[y * cols + x] = 1;
                if (ajoutLicite(col, cols, lignes, x, y)) { taille++; pose = true; break; }
                col[y * cols + x] = 0;
            }
            if (!pose) break;
        }
        if (taille >= minimum) return col;
    }
    return null;
}

/**
 * LE SOLVEUR PAR PROPAGATION. Il colorie les cases (dedans / dehors) et ne
 * pose jamais une case sans y être forcé. Deux règles suffisent :
 *
 *   · LE COMPTAGE. Une case portant k connaît son camp : si k voisines lui
 *     sont déjà opposées, les autres lui sont semblables ; s'il en manque
 *     exactement autant qu'il reste d'inconnues, toutes sont opposées. Et si
 *     c'est la case elle-même qui est inconnue, on essaie ses deux camps :
 *     quand un seul reste possible, il est démontré.
 *   · LE SOMMET. Trois cases connues autour d'un point imposent la quatrième
 *     dès que l'autre valeur ferait se croiser la boucle.
 *
 * S'il termine, la grille a une solution unique — et l'élève peut la trouver
 * sans jamais tenter sa chance.
 */
export function resoudre(indices, cols, lignes) {
    const n = cols * lignes;
    const col = new Int8Array(n).fill(VIDE);
    let contradiction = false;

    const lire = (x, y) => (x < 0 || y < 0 || x >= cols || y >= lignes) ? 0 : col[y * cols + x];
    const poser = (x, y, val) => {
        if (x < 0 || y < 0 || x >= cols || y >= lignes) return false;
        const i = y * cols + x;
        if (col[i] === val) return false;
        if (col[i] !== VIDE) { contradiction = true; return false; }
        col[i] = val;
        return true;
    };

    let progres = true, garde = 0;
    while (progres && !contradiction && garde++ < 600) {
        progres = false;

        for (let y = 0; y < lignes && !contradiction; y++) for (let x = 0; x < cols; x++) {
            const k = indices[y * cols + x];
            if (k < 0) continue;
            const vois = VOISINS.map(([dx, dy]) => [x + dx, y + dy]);
            const s = lire(x, y);

            if (s === VIDE) {
                const possibles = [0, 1].filter(hyp => {
                    let opposees = 0, inconnues = 0;
                    for (const [vx, vy] of vois) {
                        const c = lire(vx, vy);
                        if (c === VIDE) inconnues++;
                        else if (c !== hyp) opposees++;
                    }
                    return opposees <= k && k <= opposees + inconnues;
                });
                if (!possibles.length) { contradiction = true; break; }
                if (possibles.length === 1 && poser(x, y, possibles[0])) progres = true;
                continue;
            }

            let opposees = 0;
            const inconnues = [];
            for (const [vx, vy] of vois) {
                const c = lire(vx, vy);
                if (c === VIDE) inconnues.push([vx, vy]);
                else if (c !== s) opposees++;
            }
            if (opposees > k || opposees + inconnues.length < k) { contradiction = true; break; }
            if (!inconnues.length) continue;
            if (opposees === k) {
                for (const [vx, vy] of inconnues) if (poser(vx, vy, s)) progres = true;
            } else if (opposees + inconnues.length === k) {
                for (const [vx, vy] of inconnues) if (poser(vx, vy, 1 - s)) progres = true;
            }
        }

        for (let y = 0; y <= lignes && !contradiction; y++) for (let x = 0; x <= cols; x++) {
            const cases = [[x - 1, y - 1], [x, y - 1], [x - 1, y], [x, y]];
            const val = cases.map(([qx, qy]) => lire(qx, qy));
            if (val.filter(v => v === VIDE).length !== 1) continue;
            const trou = val.indexOf(VIDE);
            for (const hyp of [0, 1]) {
                const t = val.slice();
                t[trou] = hyp;
                if (croisementAuSommet(t[0], t[1], t[2], t[3])) {
                    const [qx, qy] = cases[trou];
                    if (poser(qx, qy, 1 - hyp)) progres = true;
                    break;
                }
            }
        }
    }

    let complet = !contradiction;
    for (let i = 0; i < n && complet; i++) if (col[i] === VIDE) complet = false;
    return { col, complet, contradiction };
}

const TAILLES = {
    petit: { cols: 5, lignes: 5 },
    moyen: { cols: 7, lignes: 7 },
    grand: { cols: 10, lignes: 8 }
};
export const tailleDe = (id) => TAILLES[id] || TAILLES.moyen;

/** La part de chiffres qu'on s'autorise à retirer, selon la difficulté. */
const RETRAITS = { facile: 0.35, moyen: 0.55, difficile: 1 };

/**
 * Une grille jouable : un dedans licite, tous ses chiffres, puis on en retire
 * au hasard tant que la propagation pure recolorie encore toute la grille.
 */
export function genererSlitherlink(params = {}, rng) {
    const { cols, lignes } = tailleDe(params.taille);
    const part = RETRAITS[params.difficulte] ?? RETRAITS.moyen;
    const n = cols * lignes;

    for (let essai = 0; essai < 30; essai++) {
        const interieur = genererInterieur(cols, lignes, rng);
        if (!interieur) continue;
        const indices = indicesDe(interieur, cols, lignes);
        if (!resoudre(indices, cols, lignes).complet) continue;

        const maxRetraits = Math.floor(n * part);
        let retires = 0;
        for (const i of rng.shuffle([...Array(n).keys()])) {
            if (retires >= maxRetraits) break;
            const garde = indices[i];
            indices[i] = VIDE;
            if (resoudre(indices, cols, lignes).complet) retires++;
            else indices[i] = garde;
        }

        return {
            cols, lignes, indices, interieur,
            taille: params.taille || 'moyen',
            difficulte: params.difficulte || 'moyen',
            solution: aretesDe(interieur, cols, lignes),
            donnes: n - retires
        };
    }
    return null;
}

/** Les quatre côtés d'une case, repérés dans les tableaux de segments. */
export function cotesDe(cols, x, y) {
    return [
        { type: 'h', i: clefH(cols, x, y) },
        { type: 'h', i: clefH(cols, x, y + 1) },
        { type: 'v', i: clefV(cols, x, y) },
        { type: 'v', i: clefV(cols, x + 1, y) }
    ];
}

const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

/**
 * LE PAS SUIVANT, celui qu'un élève ferait sans deviner : une case dont le
 * chiffre ne laisse plus le choix. Elle sert d'indice à l'élève et de fil au
 * robot — les deux disent le même raisonnement, ce qui est tout l'intérêt.
 * Les segments valent 0 (libre), 1 (tracé) ou 2 (barré).
 */
export function deductionEvidente(puzzle, h, v) {
    const { cols, lignes, indices } = puzzle;
    for (let y = 0; y < lignes; y++) for (let x = 0; x < cols; x++) {
        const k = indices[y * cols + x];
        if (k < 0) continue;
        let traits = 0;
        const libres = [];
        for (const b of cotesDe(cols, x, y)) {
            const val = b.type === 'h' ? h[b.i] : v[b.i];
            if (val === 1) traits++;
            else if (val !== 2) libres.push(b);
        }
        if (!libres.length || traits > k || traits + libres.length < k) continue;
        if (traits === k) {
            return {
                x, y, k, action: 'croix', aretes: libres,
                raison: k === 0
                    ? 'Un 0 : la boucle ne longe aucun de ses côtés, je les barre tous les quatre.'
                    : `Ce ${k} a déjà ses ${pluriel(k, 'côté')} : les autres sont barrés.`
            };
        }
        if (traits + libres.length === k) {
            return {
                x, y, k, action: 'trait', aretes: libres,
                raison: `Ce ${k} n'a plus que ${pluriel(libres.length, 'côté')} `
                    + `libre${libres.length > 1 ? 's' : ''} et il lui en faut encore `
                    + `${k - traits} : on les trace.`
            };
        }
    }

    // LA RÈGLE DU POINT, l'autre moitié du raisonnement : la boucle traverse un
    // point ou l'évite, jamais elle ne s'y arrête. Un point porte donc zéro ou
    // deux segments — jamais un, jamais trois.
    for (let y = 0; y <= lignes; y++) for (let x = 0; x <= cols; x++) {
        const bords = [];
        if (x > 0) bords.push({ type: 'h', i: clefH(cols, x - 1, y) });
        if (x < cols) bords.push({ type: 'h', i: clefH(cols, x, y) });
        if (y > 0) bords.push({ type: 'v', i: clefV(cols, x, y - 1) });
        if (y < lignes) bords.push({ type: 'v', i: clefV(cols, x, y) });
        let traits = 0;
        const libres = [];
        for (const b of bords) {
            const val = b.type === 'h' ? h[b.i] : v[b.i];
            if (val === 1) traits++;
            else if (val !== 2) libres.push(b);
        }
        if (!libres.length) continue;
        if (traits === 2) {
            return {
                sommet: true, x, y, action: 'croix', aretes: libres,
                raison: 'Ce point porte déjà deux segments : la boucle y passe, '
                    + 'et ses autres côtés sont barrés.'
            };
        }
        if (traits === 1 && libres.length === 1) {
            return {
                sommet: true, x, y, action: 'trait', aretes: libres,
                raison: 'Ce point n\'a qu\'un segment et un seul côté encore libre : '
                    + 'la boucle ne s\'arrête jamais, elle repart forcément par là.'
            };
        }
        if (traits === 0 && libres.length === 1) {
            return {
                sommet: true, x, y, action: 'croix', aretes: libres,
                raison: 'Un seul segment possible en ce point : il y finirait en '
                    + 'cul-de-sac, donc il n\'existe pas.'
            };
        }
    }

    // LA PETITE BOUCLE. Un segment qui refermerait un circuit avant que tout
    // soit satisfait est impossible : la solution n'a qu'UNE boucle, et elle
    // passe par tous les chiffres. C'est la règle qui débloque les fins de
    // grille — et elle se dit en une phrase.
    for (const bord of tousLesBords(cols, lignes)) {
        const tab = bord.type === 'h' ? h : v;
        if (tab[bord.i] !== 0) continue;
        if (!bordsRelies(h, v, cols, lignes, bord)) continue;
        tab[bord.i] = 1;
        const gagne = verifier(puzzle, h, v).gagne;
        tab[bord.i] = 0;
        if (!gagne) {
            return {
                arete: bord, action: 'croix', aretes: [bord],
                raison: 'Ce segment refermerait une petite boucle, alors qu\'il reste '
                    + 'du chemin ailleurs : la solution n\'en fait qu\'une, donc il est barré.'
            };
        }
    }
    return null;
}

/**
 * LE PAS SUIVANT, toujours disponible. Les règles de comptage et de point
 * mènent loin mais calent parfois ; on repasse alors au raisonnement qui a
 * fabriqué la grille — le DEDANS et le DEHORS. C'est une méthode de
 * Slitherlink à part entière, et elle se dit simplement : deux cases de camps
 * différents ont un segment entre elles, deux cases du même camp n'en ont pas.
 */
export function prochainPas(puzzle, h, v) {
    const evidente = deductionEvidente(puzzle, h, v);
    if (evidente) return evidente;

    const { cols, lignes, interieur, solution } = puzzle;
    const libres = tousLesBords(cols, lignes)
        .filter(b => (b.type === 'h' ? h : v)[b.i] === 0);
    if (!libres.length) return null;

    // On préfère un segment au contact du tracé : la leçon reste locale.
    const touche = (b) => {
        const pts = b.type === 'h'
            ? [[b.x, b.y], [b.x + 1, b.y]] : [[b.x, b.y], [b.x, b.y + 1]];
        return pts.some(([x, y]) =>
            (x > 0 && h[clefH(cols, x - 1, y)] === 1) || (x < cols && h[clefH(cols, x, y)] === 1)
            || (y > 0 && v[clefV(cols, x, y - 1)] === 1) || (y < lignes && v[clefV(cols, x, y)] === 1));
    };
    const bord = libres.find(touche) || libres[0];
    const trace = (bord.type === 'h' ? solution.h : solution.v)[bord.i] === 1;
    const [a, b] = bord.type === 'h'
        ? [[bord.x, bord.y - 1], [bord.x, bord.y]]
        : [[bord.x - 1, bord.y], [bord.x, bord.y]];
    const mots = bord.type === 'h' ? ['Au-dessus', 'en dessous'] : ['À gauche', 'à droite'];
    const nom = (c) => camp(interieur, cols, lignes, c[0], c[1]) ? 'dedans' : 'dehors';

    return {
        arete: bord, action: trace ? 'trait' : 'croix', aretes: [bord],
        raison: trace
            ? `${mots[0]} de ce segment on est ${nom(a)}, ${mots[1]} on est ${nom(b)} : `
                + 'la boucle sépare les deux camps, elle passe donc ici.'
            : `${mots[0]} et ${mots[1]} de ce segment, on est du même côté `
                + `(${nom(a)}) : la boucle ne passe pas là, on le barre.`
    };
}

/** Tous les segments du quadrillage, horizontaux puis verticaux. */
function tousLesBords(cols, lignes) {
    const out = [];
    for (let y = 0; y <= lignes; y++) for (let x = 0; x < cols; x++) {
        out.push({ type: 'h', i: clefH(cols, x, y), x, y });
    }
    for (let y = 0; y < lignes; y++) for (let x = 0; x <= cols; x++) {
        out.push({ type: 'v', i: clefV(cols, x, y), x, y });
    }
    return out;
}

/** Les deux bouts d'un segment sont-ils déjà reliés par le tracé existant ? */
function bordsRelies(h, v, cols, lignes, bord) {
    const pt = (x, y) => y * (cols + 1) + x;
    const depart = pt(bord.x, bord.y);
    const arrivee = bord.type === 'h' ? pt(bord.x + 1, bord.y) : pt(bord.x, bord.y + 1);
    const vu = new Set([depart]);
    const file = [[bord.x, bord.y]];
    while (file.length) {
        const [x, y] = file.pop();
        const suites = [];
        if (x > 0 && h[clefH(cols, x - 1, y)] === 1) suites.push([x - 1, y]);
        if (x < cols && h[clefH(cols, x, y)] === 1) suites.push([x + 1, y]);
        if (y > 0 && v[clefV(cols, x, y - 1)] === 1) suites.push([x, y - 1]);
        if (y < lignes && v[clefV(cols, x, y)] === 1) suites.push([x, y + 1]);
        for (const [nx, ny] of suites) {
            const p = pt(nx, ny);
            if (vu.has(p)) continue;
            if (p === arrivee) return true;
            vu.add(p); file.push([nx, ny]);
        }
    }
    return false;
}

/** Combien de segments tracés bordent la case (x, y) ? */
export function cotesTraces(h, v, cols, x, y) {
    return (h[clefH(cols, x, y)] === 1 ? 1 : 0)
        + (h[clefH(cols, x, y + 1)] === 1 ? 1 : 0)
        + (v[clefV(cols, x, y)] === 1 ? 1 : 0)
        + (v[clefV(cols, x + 1, y)] === 1 ? 1 : 0);
}

/**
 * L'état du tracé de l'élève : les segments forment-ils UNE boucle fermée ?
 * On regarde les degrés des points (aucun ne doit dépasser 2, aucun ne doit
 * être impair), puis on parcourt la boucle depuis un segment : si le tour
 * ramène tous les segments, il n'y en a qu'une.
 */
export function etatBoucle(h, v, cols, lignes) {
    const pt = (x, y) => y * (cols + 1) + x;
    const degre = new Uint8Array((cols + 1) * (lignes + 1));
    const liens = new Map();
    const relier = (a, b) => {
        if (!liens.has(a)) liens.set(a, []);
        if (!liens.has(b)) liens.set(b, []);
        liens.get(a).push(b); liens.get(b).push(a);
        degre[a]++; degre[b]++;
    };
    let total = 0;
    for (let y = 0; y <= lignes; y++) for (let x = 0; x < cols; x++) {
        if (h[clefH(cols, x, y)] === 1) { relier(pt(x, y), pt(x + 1, y)); total++; }
    }
    for (let y = 0; y < lignes; y++) for (let x = 0; x <= cols; x++) {
        if (v[clefV(cols, x, y)] === 1) { relier(pt(x, y), pt(x, y + 1)); total++; }
    }
    if (!total) return { total: 0, fermee: false, unique: false, croisement: false };

    let croisement = false, impair = false;
    degre.forEach(d => { if (d > 2) croisement = true; else if (d % 2) impair = true; });
    if (croisement || impair) return { total, fermee: false, unique: false, croisement };

    // Un tour complet depuis un point du tracé.
    const depart = [...liens.keys()][0];
    let vus = 0, precedent = -1, courant = depart;
    do {
        const suite = liens.get(courant).filter(p => p !== precedent);
        const prochain = suite.length ? suite[0] : liens.get(courant)[0];
        precedent = courant; courant = prochain; vus++;
    } while (courant !== depart && vus <= total);

    return { total, fermee: true, unique: vus === total, croisement: false };
}

/**
 * La grille de l'élève est-elle la solution ? Une boucle unique et fermée, et
 * chaque chiffre satisfait. On renvoie aussi la liste des chiffres fautifs
 * pour pouvoir les montrer en rouge.
 */
export function verifier(puzzle, h, v) {
    const { cols, lignes, indices } = puzzle;
    const boucle = etatBoucle(h, v, cols, lignes);
    const fautifs = [];
    let manquants = 0;
    for (let y = 0; y < lignes; y++) for (let x = 0; x < cols; x++) {
        const k = indices[y * cols + x];
        if (k < 0) continue;
        const c = cotesTraces(h, v, cols, x, y);
        if (c > k) fautifs.push(y * cols + x);
        else if (c < k) manquants++;
    }
    return {
        boucle, fautifs, manquants,
        gagne: boucle.fermee && boucle.unique && !fautifs.length && !manquants
    };
}
