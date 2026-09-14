// LE TASUKO — découper une grille de chiffres en paires dont les sommes font
// 1, 2, 3, … jusqu'au bout.
//
// Rémy : « Fais un tasuko », puis, en m'envoyant une capture du vrai jeu.
//
// J'AVAIS COMPRIS DE TRAVERS, ET LA CAPTURE L'A PROUVÉ. Sa description disait
// « trouver et relier toutes les additions de deux nombres cachées dans la
// grille » : j'y avais lu des additions écrites sur TROIS cases — deux termes
// et leur résultat, à la manière d'une recherche de mots. C'était faux. Les
// pièces du vrai jeu sont des DOMINOS de deux cases, et ce qui les rend justes
// n'est pas écrit dans la grille : ce sont leurs SOMMES qui doivent faire
// 1, 2, 3, … n, chacune une seule fois.
//
// LA CAPTURE, CASE PAR CASE — c'est elle qui a tranché :
//
//     0 0 0 3        les huit capsules colorées valaient
//     1 2 3 3        0+1=1  0+2=2  0+3=3  3+1=4
//     3 4 1 2        3+2=5  3+3=6  3+4=7  4+4=8
//     3 3 4 4
//
// Les huit sommes sont exactement 1 à 8. Et le total des seize chiffres vaut
// 36, c'est-à-dire 1+2+⋯+8 : ce n'est pas une coïncidence qu'on interprète,
// c'est une identité qui ne peut pas être fausse. La règle est donc celle-là.
//
// C'EST UN JEU BIEN MEILLEUR QUE CELUI QUE J'AVAIS ÉCRIT, et pour une raison
// précise : le joueur ne cherche plus « une addition qui marche » — il en
// verrait trente —, il cherche OÙ CASER UNE SOMME DONNÉE. Deux raisonnements
// s'ouvrent alors, et ils se répondent :
//
//   · par la case  — « ce 4-là n'a plus qu'un seul voisin possible » ;
//   · par la somme — « le 7, on ne peut le faire qu'à cet endroit-là ».
//
// C'est exactement la double lecture d'un sudoku (le chiffre dans la case, la
// case pour le chiffre), et c'est ce que Rémy décrivait en parlant de « sudoku,
// recherche de mots et calcul de sommes » dans la même phrase.
//
// LES CHIFFRES SONT PETITS, ET C'EST VOULU. Pour écrire la plus grande somme n
// avec deux chiffres, il en faut au moins un qui vaille ⌈n/2⌉ ; on prend
// exactement ce plafond et pas un de plus. Le vrai jeu fait pareil — huit
// sommes, aucun chiffre au-dessus de 4 — et ce n'est pas de la coquetterie :
// des chiffres rares se repèrent d'un coup d'œil, des chiffres qui se répètent
// obligent à raisonner. Le plafond bas est ce qui rend la grille difficile.
//
// Module pur : ni DOM, ni hasard propre.

/**
 * Les tailles proposées. L'aire est toujours PAIRE — on la découpe en dominos.
 *
 * Le nombre de paires vaut la moitié de l'aire, et les sommes vont de 1 à ce
 * nombre : une grille de seize cases, ce sont huit sommes, de 1 à 8.
 */
export const TAILLES_TASUKO = {
    petite: { id: 'petite', label: '4 × 3 — six sommes, pour découvrir', l: 4, h: 3 },
    moyenne: { id: 'moyenne', label: '4 × 4 — huit sommes, la grille du vrai jeu', l: 4, h: 4 },
    grande: { id: 'grande', label: '6 × 4 — douze sommes', l: 6, h: 4 },
    geante: { id: 'geante', label: '6 × 6 — dix-huit sommes', l: 6, h: 6 }
};

/** Le nombre de paires d'une grille, et donc la plus grande somme à trouver. */
export const nombreDePaires = (l, h) => (l * h) / 2;

/**
 * LE PLUS GRAND CHIFFRE ADMIS, pour n sommes à écrire.
 *
 * Il faut pouvoir écrire n avec deux chiffres, donc au moins ⌈n/2⌉. On s'arrête
 * là : c'est le plafond le plus bas possible, celui qui force les chiffres à se
 * répéter — et donc à raisonner au lieu de reconnaître.
 */
export const chiffreMaxPour = (n) => Math.ceil(n / 2);

const idx = (l, x, y) => y * l + x;

/**
 * TOUTES LES PAIRES QU'ON PEUT LIRE DANS LA GRILLE.
 *
 * Deux cases voisines — côte à côte ou l'une sur l'autre, jamais en diagonale —
 * forment une paire candidate si leur somme est l'une des sommes à trouver.
 * Une paire dont la somme dépasse n, ou vaut zéro, n'est candidate à rien : on
 * ne la propose même pas.
 */
export function pairesPossibles(grille, n) {
    const h = grille.length, l = grille[0].length;
    const trouvees = [];
    const essayer = (cases) => {
        const [p, q] = cases.map(([x, y]) => grille[y][x]);
        const somme = p + q;
        if (somme < 1 || somme > n) return;
        trouvees.push({ cases, a: p, b: q, somme });
    };
    for (let y = 0; y < h; y++) {
        for (let x = 0; x + 1 < l; x++) essayer([[x, y], [x + 1, y]]);
    }
    for (let x = 0; x < l; x++) {
        for (let y = 0; y + 1 < h; y++) essayer([[x, y], [x, y + 1]]);
    }
    return trouvees.map((p, i) => ({ ...p, id: i, cellules: p.cases.map(([x, y]) => idx(l, x, y)) }));
}

/**
 * LE PROBLÈME EST UNE COUVERTURE EXACTE À DEUX ÉTAGES.
 *
 * Il n'y a pas seulement des cases à couvrir : il y a aussi des SOMMES à
 * employer, chacune une fois. On traite donc les deux sur le même pied — une
 * case et une somme sont l'une comme l'autre « quelque chose qui attend
 * exactement une paire » —, et l'on s'occupe toujours du plus contraint des
 * deux. C'est ce qui coupe l'arbre tôt : une somme qui n'a plus nulle part où
 * s'écrire condamne la branche aussi sûrement qu'une case sans voisin.
 */
function parcourir(nbCases, n, paires, limite, arreterAuPremierBlocage) {
    const parCase = Array.from({ length: nbCases }, () => []);
    const parSomme = Array.from({ length: n + 1 }, () => []);
    paires.forEach(p => {
        p.cellules.forEach(c => parCase[c].push(p));
        parSomme[p.somme].push(p);
    });
    const prisCase = new Array(nbCases).fill(false);
    const prisSomme = new Array(n + 1).fill(false);
    const vivante = (p) => !prisSomme[p.somme] && p.cellules.every(c => !prisCase[c]);
    const poser = (p, v) => {
        p.cellules.forEach(c => { prisCase[c] = v; });
        prisSomme[p.somme] = v;
    };

    let trouves = 0;
    let premiere = null;
    const solution = [];

    const explorer = () => {
        if (trouves >= limite) return;
        // Le plus contraint, cases et sommes confondues.
        let candidats = null;
        let mieux = Infinity;
        for (let c = 0; c < nbCases && mieux; c++) {
            if (prisCase[c]) continue;
            const vivants = parCase[c].filter(vivante);
            if (vivants.length < mieux) { mieux = vivants.length; candidats = vivants; }
        }
        for (let s = 1; s <= n && mieux; s++) {
            if (prisSomme[s]) continue;
            const vivants = parSomme[s].filter(vivante);
            if (vivants.length < mieux) { mieux = vivants.length; candidats = vivants; }
        }
        if (candidats === null) {          // plus rien à couvrir : c'en est une
            trouves++;
            if (!premiere) premiere = solution.slice();
            return;
        }
        if (mieux === 0) return;           // impasse
        if (arreterAuPremierBlocage && mieux > 1) return;
        for (const p of candidats) {
            if (!vivante(p)) continue;
            poser(p, true);
            solution.push(p);
            explorer();
            solution.pop();
            poser(p, false);
            if (trouves >= limite) return;
        }
    };
    explorer();
    return { nombre: trouves, decoupage: premiere };
}

/** Combien de découpages complets existe-t-il — on s'arrête à `limite`. */
export const compterDecoupages = (nbCases, n, paires, limite = 2) =>
    parcourir(nbCases, n, paires, limite, false);

/**
 * SE TROUVE-T-IL SANS DEVINER ?
 *
 * Les deux règles du joueur, et il n'en a pas besoin d'une troisième :
 *
 *   · une case qui n'a plus qu'UNE paire possible est forcée ;
 *   · une somme qui n'a plus qu'UN endroit possible est forcée aussi.
 *
 * On pose, on retire ce que cela condamne, et l'on recommence. Si la grille se
 * finit ainsi, personne n'a eu à essayer pour voir — c'est la règle de la
 * maison, du sudoku au hashi.
 */
export function propager(nbCases, n, paires) {
    const prisCase = new Array(nbCases).fill(false);
    const prisSomme = new Array(n + 1).fill(false);
    const posees = [];
    const vivante = (p) => !prisSomme[p.somme] && p.cellules.every(c => !prisCase[c]);

    let bouge = true;
    while (bouge) {
        bouge = false;
        const dispo = paires.filter(vivante);
        let forcee = null;
        for (let c = 0; c < nbCases && !forcee; c++) {
            if (prisCase[c]) continue;
            const pour = dispo.filter(p => p.cellules.includes(c));
            if (pour.length === 1) forcee = pour[0];
        }
        for (let s = 1; s <= n && !forcee; s++) {
            if (prisSomme[s]) continue;
            const pour = dispo.filter(p => p.somme === s);
            if (pour.length === 1) forcee = pour[0];
        }
        if (!forcee) break;
        forcee.cellules.forEach(c => { prisCase[c] = true; });
        prisSomme[forcee.somme] = true;
        posees.push(forcee);
        bouge = true;
    }
    return { fini: prisCase.every(Boolean), posees };
}

// --- La fabrication ------------------------------------------------------------

/**
 * ON PAVE D'ABORD, ON CALCULE ENSUITE.
 *
 * Le rectangle se découpe en dominos par remplissage : on prend toujours la
 * première case libre — celle du coin haut gauche restant —, on essaie les deux
 * dominos qui peuvent la contenir, et l'on recule si ça coince. Un rectangle
 * d'aire paire se pave toujours, donc cela aboutit ; le hasard ne sert qu'à
 * varier la forme.
 */
function paver(l, h, rng) {
    const pris = new Array(l * h).fill(false);
    const pieces = [];
    const poser = () => {
        const libre = pris.indexOf(false);
        if (libre < 0) return true;
        const x0 = libre % l, y0 = Math.floor(libre / l);
        const formes = rng.shuffle([
            [[x0, y0], [x0 + 1, y0]],
            [[x0, y0], [x0, y0 + 1]]
        ]);
        for (const f of formes) {
            if (!f.every(([x, y]) => x < l && y < h && !pris[idx(l, x, y)])) continue;
            f.forEach(([x, y]) => { pris[idx(l, x, y)] = true; });
            pieces.push(f);
            if (poser()) return true;
            pieces.pop();
            f.forEach(([x, y]) => { pris[idx(l, x, y)] = false; });
        }
        return false;
    };
    return poser() ? pieces : null;
}

/**
 * Les deux chiffres d'une somme, sous le plafond.
 *
 * On tire deux découpes et l'on garde LA PLUS ÉQUILIBRÉE. Un 0 face à un 7 se
 * remarque de loin — le 7 ne peut presque rien faire d'autre —, alors que deux
 * chiffres proches se ressemblent d'une paire à l'autre et obligent à chercher.
 */
function couper(s, max, rng) {
    const bas = Math.max(0, s - max), haut = Math.min(max, s);
    if (bas > haut) return null;
    let a = rng.int(bas, haut);
    const autre = rng.int(bas, haut);
    if (Math.abs(autre * 2 - s) < Math.abs(a * 2 - s)) a = autre;
    return rng.bool() ? [a, s - a] : [s - a, a];
}

/**
 * Une grille prête à jouer ou à imprimer.
 *
 * @param {{taille?: string, rng: object, essais?: number}} opts
 * @returns {{taille: string, l: number, h: number, n: number, chiffreMax: number,
 *            grille: number[][], paires: Array, solution: number[]}|null}
 */
export function creerTasuko({ taille = 'moyenne', rng, essais = 300 }) {
    const t = TAILLES_TASUKO[taille] || TAILLES_TASUKO.moyenne;
    const nbCases = t.l * t.h;
    const n = nombreDePaires(t.l, t.h);
    const max = chiffreMaxPour(n);

    for (let essai = 0; essai < essais; essai++) {
        // Un nouveau pavage tous les dix essais : rester sur le même et ne
        // changer que les chiffres finit par tourner en rond quand c'est la
        // FORME du découpage qui crée les ambiguïtés.
        const pieces = paver(t.l, t.h, rng);
        if (!pieces) return null;
        for (let k = 0; k < 10; k++) {
            const grille = Array.from({ length: t.h }, () => new Array(t.l).fill(0));
            const sommes = rng.shuffle(Array.from({ length: n }, (_, i) => i + 1));
            let bon = true;
            pieces.forEach((p, i) => {
                const paire = couper(sommes[i], max, rng);
                if (!paire) { bon = false; return; }
                p.forEach(([x, y], j) => { grille[y][x] = paire[j]; });
            });
            if (!bon) continue;

            const paires = pairesPossibles(grille, n);
            // IL FAUT DES PIÈGES, sinon ce n'est pas un casse-tête. Si la
            // grille ne se lit qu'avec les n bonnes paires, il suffit de les
            // entourer : la règle qui fait tout le jeu — chaque somme une seule
            // fois — ne se rencontre jamais. On exige donc la moitié de paires
            // candidates en plus de ce qu'il faut.
            if (paires.length < n + Math.max(2, Math.round(n / 2))) continue;
            if (compterDecoupages(nbCases, n, paires, 2).nombre !== 1) continue;
            // UNE SEULE SOLUTION NE SUFFIT PAS : encore faut-il pouvoir la
            // trouver sans essayer au hasard.
            const { fini, posees } = propager(nbCases, n, paires);
            if (!fini) continue;
            return {
                taille: t.id, l: t.l, h: t.h, n, chiffreMax: max, grille, paires,
                solution: posees.map(p => p.id).sort((x, y) => x - y)
            };
        }
    }
    return null;
}

// --- L'état d'une partie -------------------------------------------------------

/** Les identifiants des paires retenues, au départ : aucune. */
export const saisieVide = () => [];

/** Une paire par son identifiant. */
export const paireDe = (g, id) => g.paires.find(p => p.id === id) || null;

/** Les cases déjà couvertes par les paires retenues. */
export function casesCouvertes(g, choisies) {
    const pris = new Array(g.l * g.h).fill(false);
    choisies.forEach(id => {
        const p = paireDe(g, id);
        if (p) p.cellules.forEach(c => { pris[c] = true; });
    });
    return pris;
}

/** Les sommes déjà employées, et par quelle paire. */
export function sommesEmployees(g, choisies) {
    const par = new Map();
    choisies.forEach(id => {
        const p = paireDe(g, id);
        if (!p) return;
        if (!par.has(p.somme)) par.set(p.somme, []);
        par.get(p.somme).push(id);
    });
    return par;
}

/** Deux paires retenues qui se partagent une CASE. */
export function chevauchements(g, choisies) {
    const vus = new Map();
    const fautes = new Set();
    choisies.forEach(id => {
        const p = paireDe(g, id);
        if (!p) return;
        p.cellules.forEach(c => {
            if (vus.has(c)) { fautes.add(id); fautes.add(vus.get(c)); }
            else vus.set(c, id);
        });
    });
    return [...fautes];
}

/** Deux paires retenues qui font la MÊME SOMME : l'autre faute, et la plus fine. */
export function sommesEnDouble(g, choisies) {
    const fautes = new Set();
    sommesEmployees(g, choisies).forEach((ids) => {
        if (ids.length > 1) ids.forEach(id => fautes.add(id));
    });
    return [...fautes];
}

/**
 * FINI QUAND CHAQUE CASE EST COUVERTE UNE FOIS ET CHAQUE SOMME EMPLOYÉE UNE
 * FOIS. La seconde condition découle en fait de la première — n paires sans
 * chevauchement couvrant 2n cases, chacune de somme distincte, épuisent
 * forcément 1 à n —, mais on la vérifie quand même : c'est la règle du jeu, et
 * une règle qu'on déduit se vérifie mal quand la partie est en cours.
 */
export const estResoluTasuko = (g, choisies) =>
    !chevauchements(g, choisies).length
    && !sommesEnDouble(g, choisies).length
    && casesCouvertes(g, choisies).every(Boolean);

/**
 * CE QUI CLOCHE, EN UN SEUL DIAGNOSTIC.
 *
 * Trois fautes possibles, et ce ne sont pas les mêmes : deux paires sur un même
 * chiffre, deux paires sur une même somme, ou simplement du travail qui reste.
 * Les deux premières sont le jeu lui-même — une paire parfaitement juste peut
 * être au mauvais endroit —, la troisième n'est qu'un état d'avancement.
 */
export function diagnostic(g, choisies) {
    const doubles = chevauchements(g, choisies);
    if (doubles.length) return { ok: false, quoi: 'chevauchement', n: doubles.length };
    const memes = sommesEnDouble(g, choisies);
    if (memes.length) return { ok: false, quoi: 'sommeDouble', n: memes.length };
    const restant = casesCouvertes(g, choisies).filter(v => !v).length;
    if (restant) return { ok: false, quoi: 'manque', n: restant };
    return { ok: true };
}

/**
 * LA PROCHAINE PAIRE FORCÉE, ET CE QUI LA FORCE.
 *
 * L'aide ne donne pas une paire au hasard : elle montre le RAISONNEMENT, et il
 * y en a deux. Ou bien une case n'a plus qu'un voisin possible, ou bien une
 * somme n'a plus qu'un endroit où s'écrire. On préfère la seconde quand elle se
 * présente : c'est celle à laquelle on ne pense pas tout seul.
 */
export function prochaineAddition(g, choisies) {
    const pris = casesCouvertes(g, choisies);
    const employees = sommesEmployees(g, choisies);
    const dispo = g.paires.filter(p =>
        !employees.has(p.somme) && p.cellules.every(c => !pris[c]));

    for (let s = 1; s <= g.n; s++) {
        if (employees.has(s)) continue;
        const pour = dispo.filter(p => p.somme === s);
        if (pour.length === 1) return { paire: pour[0], parLaSomme: s, parLaCase: null };
    }
    for (let c = 0; c < g.l * g.h; c++) {
        if (pris[c]) continue;
        const pour = dispo.filter(p => p.cellules.includes(c));
        if (pour.length === 1) return { paire: pour[0], parLaSomme: null, parLaCase: c };
    }
    // Plus rien n'est forcé : on rend une paire de la solution encore absente,
    // faute de mieux — cela n'arrive que sur une grille entamée de travers.
    const manquante = g.solution.map(id => paireDe(g, id))
        .find(p => !employees.has(p.somme) && p.cellules.every(c => !pris[c]));
    return manquante ? { paire: manquante, parLaSomme: null, parLaCase: null } : null;
}

/** De quoi écrire un corrigé : les paires, dans l'ordre des sommes. */
export function qualiteTasuko(g) {
    const paires = g.solution.map(id => paireDe(g, id)).sort((x, y) => x.somme - y.somme);
    return {
        additions: g.solution.length,
        cases: g.l * g.h,
        pieges: g.paires.length - g.solution.length,
        lignes: paires.map(p => `${p.a} + ${p.b} = ${p.somme}`)
    };
}
