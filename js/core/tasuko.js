// LE TASUKO — des additions cachées dans une grille de chiffres.
//
// Rémy : « Fais un tasuko », puis, quand je lui ai demandé lequel c'était :
// « Trouver et relier toutes les additions de deux nombres cachées dans la
// grille. Vous devez utiliser TOUS les chiffres présents dans la grille. »
//
// C'EST UNE RECHERCHE DE MOTS DONT LES MOTS SONT DES ADDITIONS. Trois cases
// alignées et voisines, lues dans un sens ou dans l'autre, forment une
// addition quand l'une des deux EXTRÊMES vaut la somme des deux autres :
// 3 · 4 · 7 en est une, 7 · 4 · 3 aussi (lue à l'envers), 4 · 7 · 3 non — le
// résultat d'une addition s'écrit au bout, pas au milieu.
//
// ET C'EST LA SECONDE RÈGLE QUI EN FAIT UN CASSE-TÊTE. Sans elle, on entoure
// les additions qu'on voit et l'on s'arrête ; avec elle — TOUS les chiffres
// doivent servir, et chacun une seule fois —, une addition juste peut être un
// piège, parce qu'elle vole un chiffre dont une autre avait besoin. On ne
// cherche donc pas des additions, on cherche LE découpage. C'est un pavage,
// et c'est ce qui le rapproche du sudoku bien plus que du calcul mental.
//
// HORIZONTAL ET VERTICAL, PAS DE DIAGONALES. Une recherche de mots en admet ;
// ici on y a renoncé, et pas par paresse : sur le papier, une addition en
// diagonale se suit mal au crayon, et surtout le pavage d'un rectangle par des
// pièces droites n'existe plus dès qu'on mélange les deux — il faudrait des
// grilles trouées, et « tous les chiffres » perdrait son sens.
//
// LA GRILLE EST DONC PAVÉE, AU SENS PROPRE : on la découpe d'abord en pièces
// de trois cases droites, puis on écrit une addition dans chaque pièce. Le
// découpage existe par construction ; reste à vérifier qu'il est le SEUL, et
// qu'on peut le trouver sans deviner.
//
// Module pur : ni DOM, ni hasard propre.

/** Les tailles proposées. L'aire est toujours un multiple de trois. */
export const TAILLES_TASUKO = {
    petite: { id: 'petite', label: '4 × 3 — pour découvrir', l: 4, h: 3 },
    moyenne: { id: 'moyenne', label: '6 × 4 — huit additions', l: 6, h: 4 },
    grande: { id: 'grande', label: '6 × 6 — douze additions', l: 6, h: 6 },
    geante: { id: 'geante', label: '9 × 6 — dix-huit additions', l: 9, h: 6 }
};

/** Le plus grand chiffre d'une case : un résultat d'addition tient sur un chiffre. */
export const CHIFFRE_MAX = 9;

const idx = (l, x, y) => y * l + x;

/**
 * TOUTES LES ADDITIONS QU'ON PEUT LIRE DANS LA GRILLE.
 *
 * Pour chaque trio de cases voisines et alignées, on regarde si l'une des deux
 * extrêmes vaut la somme des deux autres. Les deux lectures ne peuvent pas
 * être vraies à la fois : p + q = r et r + q = p donneraient q = 0, et il n'y
 * a pas de zéro dans la grille. Chaque trio donne donc au plus UNE addition, et
 * l'on peut la ranger dans l'ordre où elle se lit.
 */
export function additionsPossibles(grille) {
    const h = grille.length, l = grille[0].length;
    const trouvees = [];
    const essayer = (cases) => {
        const [p, q, r] = cases.map(([x, y]) => grille[y][x]);
        if (p + q === r) trouvees.push({ cases, a: p, b: q, somme: r });
        else if (r + q === p) trouvees.push({ cases: [...cases].reverse(), a: r, b: q, somme: p });
    };
    for (let y = 0; y < h; y++) {
        for (let x = 0; x + 2 < l; x++) essayer([[x, y], [x + 1, y], [x + 2, y]]);
    }
    for (let x = 0; x < l; x++) {
        for (let y = 0; y + 2 < h; y++) essayer([[x, y], [x, y + 1], [x, y + 2]]);
    }
    return trouvees.map((a, i) => ({ ...a, id: i, cellules: a.cases.map(([x, y]) => idx(l, x, y)) }));
}

/**
 * COMBIEN DE DÉCOUPAGES COMPLETS EXISTE-T-IL — on s'arrête à `limite`.
 *
 * C'est une couverture exacte : chaque case d'exactement une addition. On
 * traite toujours la case la PLUS CONTRAINTE d'abord — celle qui a le moins
 * d'additions encore possibles —, ce qui coupe l'arbre très tôt : une case sans
 * aucun candidat condamne la branche immédiatement.
 */
export function compterDecoupages(nbCases, additions, limite = 2) {
    const parCase = Array.from({ length: nbCases }, () => []);
    additions.forEach(a => a.cellules.forEach(c => parCase[c].push(a)));
    const pris = new Array(nbCases).fill(false);
    let trouves = 0;
    const solution = [];
    let premiere = null;

    const explorer = () => {
        if (trouves >= limite) return;
        // La case libre la plus contrainte.
        let meilleure = -1, meilleurNb = Infinity;
        for (let c = 0; c < nbCases; c++) {
            if (pris[c]) continue;
            const nb = parCase[c].filter(a => a.cellules.every(k => !pris[k])).length;
            if (nb < meilleurNb) { meilleurNb = nb; meilleure = c; }
            if (nb === 0) return;
        }
        if (meilleure < 0) {
            trouves++;
            if (!premiere) premiere = solution.slice();
            return;
        }
        for (const a of parCase[meilleure]) {
            if (!a.cellules.every(k => !pris[k])) continue;
            a.cellules.forEach(k => { pris[k] = true; });
            solution.push(a);
            explorer();
            solution.pop();
            a.cellules.forEach(k => { pris[k] = false; });
            if (trouves >= limite) return;
        }
    };
    explorer();
    return { nombre: trouves, decoupage: premiere };
}

/**
 * SE TROUVE-T-IL SANS DEVINER ?
 *
 * La règle du joueur, et la seule dont il ait besoin : une case qui n'est
 * couverte que par UNE addition encore possible est forcée. On la pose, on
 * retire toutes les additions qui empiètent dessus, et l'on recommence. Si
 * cela suffit à tout couvrir, personne n'a eu à essayer pour voir.
 */
export function propager(nbCases, additions) {
    const pris = new Array(nbCases).fill(false);
    const posees = [];
    const vivantes = () => additions.filter(a => a.cellules.every(k => !pris[k]));
    let bouge = true;
    while (bouge) {
        bouge = false;
        const dispo = vivantes();
        for (let c = 0; c < nbCases; c++) {
            if (pris[c]) continue;
            const pour = dispo.filter(a => a.cellules.includes(c));
            if (pour.length !== 1) continue;
            pour[0].cellules.forEach(k => { pris[k] = true; });
            posees.push(pour[0]);
            bouge = true;
            break;
        }
    }
    return { fini: pris.every(Boolean), posees };
}

// --- La fabrication ------------------------------------------------------------

/**
 * ON PAVE D'ABORD, ON CALCULE ENSUITE.
 *
 * Le rectangle se découpe en pièces droites de trois cases — horizontales ou
 * verticales. C'est un pavage par trominos droits, et il se trouve par
 * remplissage : on prend toujours la première case libre (celle du coin haut
 * gauche restant), on essaie les deux pièces qui peuvent la contenir en
 * commençant par elle, et l'on recule si ça coince.
 */
function paver(l, h, rng) {
    const pris = new Array(l * h).fill(false);
    const pieces = [];
    const poser = () => {
        const libre = pris.indexOf(false);
        if (libre < 0) return true;
        const x0 = libre % l, y0 = Math.floor(libre / l);
        const formes = rng.shuffle([
            [[x0, y0], [x0 + 1, y0], [x0 + 2, y0]],
            [[x0, y0], [x0, y0 + 1], [x0, y0 + 2]]
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

/** Une addition écrite dans une pièce : deux termes, leur somme, et un sens. */
function remplir(piece, grille, rng) {
    const a = rng.int(1, CHIFFRE_MAX - 1);
    const b = rng.int(1, CHIFFRE_MAX - a);
    // Le résultat au début ou à la fin : c'est ce qui empêche de repérer les
    // additions à la seule position du plus grand chiffre.
    const suite = rng.bool() ? [a, b, a + b] : [a + b, b, a];
    piece.forEach(([x, y], i) => { grille[y][x] = suite[i]; });
}

/**
 * Une grille prête à jouer ou à imprimer.
 *
 * @param {{taille?: string, rng: object, essais?: number}} opts
 * @returns {{taille: string, l: number, h: number, grille: number[][],
 *            solution: Array, additions: Array}|null}
 */
export function creerTasuko({ taille = 'moyenne', rng, essais = 400 }) {
    const t = TAILLES_TASUKO[taille] || TAILLES_TASUKO.moyenne;
    for (let n = 0; n < essais; n++) {
        // Un nouveau pavage tous les vingt essais : rester sur le même et ne
        // changer que les chiffres finit par tourner en rond quand c'est la
        // FORME du découpage qui crée les ambiguïtés.
        const pieces = paver(t.l, t.h, rng);
        if (!pieces) return null;
        for (let k = 0; k < 20; k++) {
            const grille = Array.from({ length: t.h }, () => new Array(t.l).fill(0));
            pieces.forEach(p => remplir(p, grille, rng));
            const additions = additionsPossibles(grille);
            // IL FAUT DES PIÈGES, sinon ce n'est pas un casse-tête. Quand
            // toutes les additions lisibles sont dans la solution, il suffit
            // d'entourer ce qu'on voit : la seconde règle — tous les chiffres
            // servent, et une seule fois — ne se rencontre jamais, et c'est
            // pourtant elle qui fait le jeu. On exige donc un tiers
            // d'additions de plus que nécessaire.
            const attendues = (t.l * t.h) / 3;
            if (additions.length < attendues + Math.max(1, Math.round(attendues / 3))) continue;
            const { nombre } = compterDecoupages(t.l * t.h, additions, 2);
            if (nombre !== 1) continue;
            // UNE SEULE SOLUTION NE SUFFIT PAS : encore faut-il pouvoir la
            // trouver sans essayer au hasard. C'est la règle de la maison pour
            // tous les casse-tête, du sudoku au hashi.
            const { fini, posees } = propager(t.l * t.h, additions);
            if (!fini) continue;
            return {
                taille: t.id, l: t.l, h: t.h, grille,
                additions,
                solution: posees.map(a => a.id).sort((x, y) => x - y)
            };
        }
    }
    return null;
}

// --- L'état d'une partie -------------------------------------------------------

/** Les identifiants des additions trouvées, au départ : aucune. */
export const saisieVide = () => [];

/** Une addition par son identifiant. */
export const additionDe = (g, id) => g.additions.find(a => a.id === id) || null;

/** Les cases déjà couvertes par les additions retenues. */
export function casesCouvertes(g, choisies) {
    const pris = new Array(g.l * g.h).fill(false);
    choisies.forEach(id => {
        const a = additionDe(g, id);
        if (a) a.cellules.forEach(c => { pris[c] = true; });
    });
    return pris;
}

/** Deux additions retenues qui se chevauchent : la faute qui bloque la suite. */
export function chevauchements(g, choisies) {
    const vus = new Map();
    const fautes = new Set();
    choisies.forEach(id => {
        const a = additionDe(g, id);
        if (!a) return;
        a.cellules.forEach(c => {
            if (vus.has(c)) { fautes.add(id); fautes.add(vus.get(c)); }
            else vus.set(c, id);
        });
    });
    return [...fautes];
}

/** La grille est finie quand chaque case est couverte exactement une fois. */
export const estResoluTasuko = (g, choisies) =>
    !chevauchements(g, choisies).length && casesCouvertes(g, choisies).every(Boolean);

/**
 * CE QUI CLOCHE, EN UN SEUL DIAGNOSTIC.
 *
 * On distingue le chevauchement du manque, parce que ce ne sont pas la même
 * faute : la première est une addition juste posée au mauvais endroit — elle
 * vole un chiffre à une autre — et c'est tout l'intérêt du jeu ; la seconde est
 * simplement du travail qui reste.
 */
export function diagnostic(g, choisies) {
    const doubles = chevauchements(g, choisies);
    if (doubles.length) return { ok: false, quoi: 'chevauchement', n: doubles.length };
    const restant = casesCouvertes(g, choisies).filter(v => !v).length;
    if (restant) return { ok: false, quoi: 'manque', n: restant };
    return { ok: true };
}

/**
 * LA PROCHAINE ADDITION FORCÉE, ET LA CASE QUI LA FORCE.
 *
 * C'est l'aide de ce jeu, et elle ne donne pas une addition au hasard : elle
 * montre une case que plus rien d'autre ne peut couvrir. Le raisonnement est
 * alors visible — « ce 6-là, aucune autre addition ne peut le prendre » — au
 * lieu d'être un cadeau.
 */
export function prochaineAddition(g, choisies) {
    const pris = casesCouvertes(g, choisies);
    const dispo = g.additions.filter(a => a.cellules.every(c => !pris[c]));
    for (let c = 0; c < g.l * g.h; c++) {
        if (pris[c]) continue;
        const pour = dispo.filter(a => a.cellules.includes(c));
        if (pour.length === 1) return { addition: pour[0], parLaCase: c };
    }
    // Plus rien n'est forcé : on rend une addition de la solution encore
    // absente, faute de mieux — cela n'arrive que sur une grille déjà entamée
    // de travers.
    const manquante = g.solution.map(id => additionDe(g, id))
        .find(a => a.cellules.every(c => !pris[c]));
    return manquante ? { addition: manquante, parLaCase: null } : null;
}

/** De quoi écrire un corrigé : les additions, dans l'ordre de lecture. */
export function qualiteTasuko(g) {
    return {
        additions: g.solution.length,
        cases: g.l * g.h,
        pieges: g.additions.length - g.solution.length,
        lignes: g.solution.map(id => {
            const a = additionDe(g, id);
            return `${a.a} + ${a.b} = ${a.somme}`;
        })
    };
}
