// LE PUISSANCE 4 — les règles, sans une ligne de DOM.
//
// Rémy : « et aussi le puissance 4 ».
//
// Sept colonnes, six rangées, un jeton qui TOMBE : on ne choisit pas la case,
// on choisit la colonne, et la gravité décide. C'est ce détail qui fait le jeu
// — poser un jeton sous une case gagnante la donne à l'adversaire, et il faut
// donc lire le plateau en trois dimensions de menace : la sienne, celle d'en
// face, et ce que son propre coup ouvre au-dessus.
//
// LE CONTRAT est celui de `core/ia.js`. Les états ne sont jamais modifiés.

export const COLONNES = 7;
export const RANGEES = 6;
/** Combien de jetons alignés il faut : quatre, d'où le nom. */
export const ALIGNE = 4;

/** Les quatre directions à explorer — l'opposée se déduit. */
const SENS = [[1, 0], [0, 1], [1, 1], [1, -1]];

export function creerPartie(options = {}) {
    const cols = options.cols || COLONNES;
    const rows = options.rows || RANGEES;
    return {
        cols, rows,
        // `grille[y][x]` : null, 'B' ou 'N'. La rangée 0 est EN HAUT, comme à
        // l'écran ; un jeton tombe donc vers les y croissants.
        grille: Array.from({ length: rows }, () => new Array(cols).fill(null)),
        trait: options.trait === 'N' ? 'N' : 'B',
        dernier: null,          // { x, y, par }
        alignement: null        // les quatre cases gagnantes, pour les montrer
    };
}

function cloner(p) {
    return { ...p, grille: p.grille.map(l => l.slice()) };
}

/** Les colonnes où il reste de la place. */
export function coups(p) {
    if (terminee(p)) return [];
    const out = [];
    for (let x = 0; x < p.cols; x++) if (p.grille[0][x] === null) out.push(x);
    return out;
}

/** Où tombera un jeton lâché dans cette colonne, ou -1 si elle est pleine. */
export function chute(p, x) {
    for (let y = p.rows - 1; y >= 0; y--) if (p.grille[y][x] === null) return y;
    return -1;
}

/** L'alignement de quatre passant par (x, y), s'il existe. */
export function alignementEn(p, x, y) {
    const couleur = p.grille[y][x];
    if (!couleur) return null;
    for (const [dx, dy] of SENS) {
        const cases = [{ x, y }];
        for (const signe of [1, -1]) {
            let cx = x + dx * signe, cy = y + dy * signe;
            while (cx >= 0 && cy >= 0 && cx < p.cols && cy < p.rows && p.grille[cy][cx] === couleur) {
                cases.push({ x: cx, y: cy });
                cx += dx * signe; cy += dy * signe;
            }
        }
        if (cases.length >= ALIGNE) return { couleur, cases };
    }
    return null;
}

export function jouer(p, x) {
    const y = chute(p, x);
    if (y < 0) return p;
    const n = cloner(p);
    n.grille[y][x] = p.trait;
    n.dernier = { x, y, par: p.trait };
    const a = alignementEn(n, x, y);
    n.alignement = a;
    n.trait = p.trait === 'B' ? 'N' : 'B';
    return n;
}

export function terminee(p) {
    if (p.alignement) return { gagnant: p.alignement.couleur, raison: 'quatre alignés' };
    const plein = p.grille[0].every(c => c !== null);
    return plein ? { gagnant: null, raison: 'grille pleine' } : null;
}

/**
 * L'ÉVALUATION, du point de vue du joueur au trait.
 *
 * On compte les FENÊTRES de quatre cases consécutives. Une fenêtre qui contient
 * des jetons d'une seule couleur est une menace, et sa valeur croît vite avec
 * le nombre de jetons : trois jetons et une case vide, c'est un coup de la
 * victoire. Une fenêtre mixte ne vaut rien pour personne — elle est morte.
 *
 * La colonne du MILIEU compte à part : un jeton central appartient à plus de
 * fenêtres qu'un jeton de bord, donc il vaut mécaniquement plus cher.
 */
export function evaluer(p) {
    const moi = p.trait, lui = moi === 'B' ? 'N' : 'B';
    let score = 0;
    const valeur = (n) => (n === 3 ? 60 : n === 2 ? 8 : n === 1 ? 1 : 0);
    for (let y = 0; y < p.rows; y++) {
        for (let x = 0; x < p.cols; x++) {
            for (const [dx, dy] of SENS) {
                const fx = x + dx * (ALIGNE - 1), fy = y + dy * (ALIGNE - 1);
                if (fx < 0 || fy < 0 || fx >= p.cols || fy >= p.rows) continue;
                let a = 0, b = 0;
                for (let i = 0; i < ALIGNE; i++) {
                    const c = p.grille[y + dy * i][x + dx * i];
                    if (c === moi) a++; else if (c === lui) b++;
                }
                if (a && b) continue;             // fenêtre morte
                score += valeur(a) - valeur(b) * 1.1;   // la défense passe d'abord
            }
        }
    }
    const milieu = Math.floor(p.cols / 2);
    for (let y = 0; y < p.rows; y++) {
        const c = p.grille[y][milieu];
        if (c === moi) score += 3; else if (c === lui) score -= 3;
    }
    return score;
}

/** Le centre d'abord : c'est là que passent le plus de fenêtres. */
export function ordonner(liste, p) {
    const milieu = ((p ? p.cols : COLONNES) - 1) / 2;
    return liste.slice().sort((a, b) => Math.abs(a - milieu) - Math.abs(b - milieu));
}

export const JEU = { coups, jouer, terminee, evaluer, ordonner };

/**
 * LE COUP QUI GAGNE TOUT DE SUITE, s'il existe — et sinon celui qu'il faut
 * absolument empêcher.
 *
 * L'IA le trouve toute seule à partir de la profondeur 2, mais ces deux
 * questions servent aussi à EXPLIQUER : « tu avais quatre en jouant la
 * colonne 4 » vaut mieux qu'un score. Le robot s'en sert, et le mode « à deux »
 * peut le proposer en indice.
 */
export function coupGagnant(p, couleur = p.trait) {
    for (const x of coups(p)) {
        const essai = jouer({ ...p, trait: couleur }, x);
        if (essai.alignement && essai.alignement.couleur === couleur) return x;
    }
    return null;
}

/** Combien de jetons sont posés : sert au bandeau. */
export function poses(p) {
    return p.grille.flat().filter(c => c !== null).length;
}
