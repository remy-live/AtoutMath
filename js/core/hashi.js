// LE HASHI — Hashiwokakero, « construire des ponts ».
//
// Rémy : « je voulais le hashi ».
//
// LA RÈGLE TIENT EN QUATRE LIGNES. Des îles portent un chiffre. On relie les
// îles par des ponts droits, horizontaux ou verticaux ; deux ponts au plus
// entre deux îles ; un pont n'en croise jamais un autre ni ne traverse une
// île ; et le chiffre d'une île dit COMBIEN de ponts y arrivent. Au bout, tout
// doit tenir d'un seul tenant — on doit pouvoir aller de n'importe quelle île
// à n'importe quelle autre.
//
// CE MODULE NE DESSINE RIEN. Il donne des îles, des arêtes possibles et une
// solution. L'écran en fait des cercles et des traits, la feuille du jsPDF, et
// les deux montrent la même chose parce qu'ils lisent les mêmes nombres.
//
// LA GRILLE SE DÉDUIT, ELLE NE SE DEVINE PAS. C'est la règle de la maison pour
// tous les puzzles de logique d'AtoutMath : on fabrique, puis on VÉRIFIE que la
// solution est unique — et, pour les deux premiers niveaux, qu'une propagation
// pure suffit à la trouver. Un élève qui doit essayer au hasard n'apprend rien
// de ce qu'on voulait lui apprendre.

/** Les arêtes possibles : entre deux îles CONSÉCUTIVES d'une même ligne ou colonne. */
export function aretesPossibles(iles, largeur, hauteur) {
    const carte = new Map(iles.map((i, k) => [`${i.x},${i.y}`, k]));
    const out = [];
    iles.forEach((a, ia) => {
        for (let x = a.x + 1; x < largeur; x++) {
            const k = carte.get(`${x},${a.y}`);
            if (k === undefined) continue;
            out.push({ a: ia, b: k, dir: 'h' });
            break;
        }
        for (let y = a.y + 1; y < hauteur; y++) {
            const k = carte.get(`${a.x},${y}`);
            if (k === undefined) continue;
            out.push({ a: ia, b: k, dir: 'v' });
            break;
        }
    });
    return out;
}

/**
 * QUELLES ARÊTES SE CROISENT. Un pont horizontal et un pont vertical se
 * coupent si le second passe STRICTEMENT entre les deux îles du premier, dans
 * les deux sens. Deux ponts de même direction ne peuvent pas se croiser : ils
 * relient des îles consécutives, donc ils ne se recouvrent jamais.
 */
export function croisements(iles, aretes) {
    const paires = aretes.map(() => []);
    aretes.forEach((e, i) => {
        if (e.dir !== 'h') return;
        const y = iles[e.a].y;
        const x1 = Math.min(iles[e.a].x, iles[e.b].x), x2 = Math.max(iles[e.a].x, iles[e.b].x);
        aretes.forEach((f, j) => {
            if (f.dir !== 'v') return;
            const x = iles[f.a].x;
            const y1 = Math.min(iles[f.a].y, iles[f.b].y), y2 = Math.max(iles[f.a].y, iles[f.b].y);
            if (x1 < x && x < x2 && y1 < y && y < y2) { paires[i].push(j); paires[j].push(i); }
        });
    });
    return paires;
}

/** Les arêtes de chaque île. */
function aretesParIle(nbIles, aretes) {
    const par = Array.from({ length: nbIles }, () => []);
    aretes.forEach((e, i) => { par[e.a].push(i); par[e.b].push(i); });
    return par;
}

/** Tout tient-il d'un seul tenant ? C'est la dernière règle, et la plus oubliée. */
export function dUnSeulTenant(nbIles, aretes, val) {
    if (!nbIles) return true;
    const pere = Array.from({ length: nbIles }, (_, i) => i);
    const trouver = (i) => { while (pere[i] !== i) { pere[i] = pere[pere[i]]; i = pere[i]; } return i; };
    aretes.forEach((e, i) => {
        if (!val[i]) return;
        const ra = trouver(e.a), rb = trouver(e.b);
        if (ra !== rb) pere[ra] = rb;
    });
    const r0 = trouver(0);
    for (let i = 1; i < nbIles; i++) if (trouver(i) !== r0) return false;
    return true;
}

/**
 * LA PROPAGATION — ce qu'un élève déduit sans jamais essayer.
 *
 * Pour chaque île, il reste `n − posés` ponts à placer sur `R` arêtes encore
 * ouvertes. Une arête ne peut donc porter ni moins de `(n − posés) − 2(|R| − 1)`
 * ponts, ni plus de `n − posés` : quand les deux bornes se rejoignent, la case
 * est décidée. Et un pont posé ferme toutes les arêtes qu'il croise.
 *
 * `val[i]` vaut -1 tant qu'on ne sait pas, 0, 1 ou 2 ensuite.
 */
export function propager(iles, aretes, croise, val) {
    const par = aretesParIle(iles.length, aretes);
    let bouge = true;
    while (bouge) {
        bouge = false;
        for (let k = 0; k < iles.length; k++) {
            const mesA = par[k];
            let poses = 0;
            const ouvertes = [];
            for (const i of mesA) {
                if (val[i] < 0) ouvertes.push(i);
                else poses += val[i];
            }
            const reste = iles[k].n - poses;
            if (reste < 0 || reste > 2 * ouvertes.length) return 'impossible';
            if (!ouvertes.length) continue;
            for (const i of ouvertes) {
                const bas = Math.max(0, reste - 2 * (ouvertes.length - 1));
                const haut = Math.min(2, reste);
                if (bas !== haut) continue;
                val[i] = bas;
                bouge = true;
                if (bas > 0) {
                    for (const j of croise[i]) {
                        if (val[j] > 0) return 'impossible';
                        if (val[j] < 0) { val[j] = 0; }
                    }
                }
            }
        }
    }
    return val.every(v => v >= 0) ? 'fini' : 'bloque';
}

/**
 * COMBIEN DE SOLUTIONS ? On s'arrête à deux : au-delà, la grille est mauvaise
 * et le compte exact n'intéresse personne.
 */
export function compterSolutions(iles, aretes, croise, limite = 2) {
    const par = aretesParIle(iles.length, aretes);
    const val = new Array(aretes.length).fill(-1);
    let trouvees = 0;
    const solutions = [];

    const possible = () => {
        for (let k = 0; k < iles.length; k++) {
            let poses = 0, ouvertes = 0;
            for (const i of par[k]) { if (val[i] < 0) ouvertes++; else poses += val[i]; }
            if (poses > iles[k].n) return false;
            if (poses + 2 * ouvertes < iles[k].n) return false;
        }
        return true;
    };

    const explorer = (i) => {
        if (trouvees >= limite) return;
        if (i === aretes.length) {
            if (!possible()) return;
            if (iles.some((il, k) => par[k].reduce((s, j) => s + val[j], 0) !== il.n)) return;
            if (!dUnSeulTenant(iles.length, aretes, val)) return;
            trouvees++;
            solutions.push(val.slice());
            return;
        }
        for (let v = 0; v <= 2; v++) {
            if (v > 0 && croise[i].some(j => val[j] > 0)) continue;
            val[i] = v;
            if (possible()) explorer(i + 1);
            val[i] = -1;
            if (trouvees >= limite) return;
        }
    };
    explorer(0);
    return { nombre: trouvees, solutions };
}

/** Une grille de hashi, ou `null` si le tirage n'a rien donné de bon. */
function essayer({ largeur, hauteur, nbIles, rng, sautMax, densite }) {
    const occupe = new Map();
    const iles = [];
    const poser = (x, y) => { occupe.set(`${x},${y}`, iles.length); iles.push({ x, y }); };
    // LES ÎLES NE SE TOUCHENT PAS. Deux cercles côte à côte donnent un pont de
    // longueur nulle : on ne voit plus s'il y en a un, deux ou aucun.
    const libre = (x, y) => x >= 0 && y >= 0 && x < largeur && y < hauteur
        && ![[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => occupe.has(`${x + dx},${y + dy}`));

    poser(rng.int(0, largeur - 1), rng.int(0, hauteur - 1));
    const liens = new Map();          // « a-b » -> 1 ou 2
    const cle = (a, b) => `${Math.min(a, b)}-${Math.max(a, b)}`;

    const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    let echecs = 0;
    while (iles.length < nbIles && echecs < nbIles * 40) {
        const ia = rng.int(0, iles.length - 1);
        const a = iles[ia];
        const [dx, dy] = rng.pick(DIRS);
        const d = rng.int(2, sautMax);
        const x = a.x + dx * d, y = a.y + dy * d;
        // Le chemin doit être vide : ni île, ni voisine d'île.
        let ok = libre(x, y);
        for (let s = 1; s < d && ok; s++) {
            if (occupe.has(`${a.x + dx * s},${a.y + dy * s}`)) ok = false;
        }
        if (!ok) { echecs++; continue; }
        const ib = iles.length;
        poser(x, y);
        // Un pont neuf ne peut croiser personne : le chemin est vide, et une
        // arête déjà posée qui le couperait passerait par une case occupée.
        const aretesActuelles = aretesPossibles(iles, largeur, hauteur);
        const idx = aretesActuelles.findIndex(e => cle(e.a, e.b) === cle(ia, ib));
        if (idx < 0) { echecs++; continue; }
        const croise = croisements(iles, aretesActuelles);
        const conflit = croise[idx].some(j => {
            const f = aretesActuelles[j];
            return liens.has(cle(f.a, f.b));
        });
        if (conflit) { echecs++; continue; }
        liens.set(cle(ia, ib), rng.int(1, 2));
    }
    if (iles.length < Math.max(4, nbIles - 2)) return null;

    // DES PONTS EN PLUS : sans eux, la grille est un arbre, et un arbre se
    // devine plus qu'il ne se déduit. Chaque boucle ajoutée resserre les
    // contraintes — c'est ce qui rend la grille sûre.
    const aretes = aretesPossibles(iles, largeur, hauteur);
    const croise = croisements(iles, aretes);
    const val = aretes.map(e => liens.get(cle(e.a, e.b)) || 0);
    rng.shuffle(aretes.map((_, i) => i)).forEach(i => {
        if (val[i] > 0) return;
        if (croise[i].some(j => val[j] > 0)) return;
        if (rng.next() < densite) val[i] = rng.int(1, 2);
    });

    const degres = iles.map((_, k) => 0);
    aretes.forEach((e, i) => { degres[e.a] += val[i]; degres[e.b] += val[i]; });
    if (degres.some(d => d === 0 || d > 8)) return null;
    iles.forEach((il, k) => { il.n = degres[k]; });
    if (!dUnSeulTenant(iles.length, aretes, val)) return null;

    return { largeur, hauteur, iles, aretes, croise, solution: val };
}

/** Les trois tailles proposées. Le nombre d'îles suit la surface. */
export const TAILLES_HASHI = {
    petit: { largeur: 7, hauteur: 7, nbIles: 9, sautMax: 4 },
    moyen: { largeur: 9, hauteur: 9, nbIles: 14, sautMax: 5 },
    grand: { largeur: 12, hauteur: 12, nbIles: 18, sautMax: 6 }
};

/**
 * LA DIFFICULTÉ EST UNE DENSITÉ DE PONTS, pas un mot posé après coup.
 *
 * Plus il y a de ponts, plus il y a de contraintes, et plus la grille se
 * déduit vite : une île qui demande six ponts sur trois arêtes ne laisse aucun
 * choix. Une grille clairsemée, au contraire, oblige à raisonner sur le
 * « d'un seul tenant » — la règle que personne n'utilise avant d'y être forcé.
 */
const DENSITES = { facile: 0.62, moyen: 0.45, difficile: 0.28 };

/**
 * UNE GRILLE DE HASHI JOUABLE.
 *
 * On tire, on vérifie, on recommence. La condition qui ne se négocie pas : la
 * solution est UNIQUE — sinon deux élèves rendent deux feuilles justes et
 * différentes, et la correction devient impossible. La seconde condition
 * dépend du niveau : en facile et en moyen, la propagation seule doit suffire
 * ; en difficile, on préfère au contraire une grille qui lui résiste.
 */
export function creerHashi(options = {}) {
    const {
        taille = 'moyen', difficulte = 'moyen', rng, essais = 600
    } = options;
    const t = TAILLES_HASHI[taille] || TAILLES_HASHI.moyen;
    const densite = DENSITES[difficulte] === undefined ? DENSITES.moyen : DENSITES[difficulte];
    let secours = null;
    for (let k = 0; k < essais; k++) {
        const g = essayer({ ...t, rng, densite });
        if (!g) continue;
        const { nombre } = compterSolutions(g.iles, g.aretes, g.croise, 2);
        if (nombre !== 1) continue;
        const val = new Array(g.aretes.length).fill(-1);
        const deductible = propager(g.iles, g.aretes, g.croise, val) === 'fini';
        const voulu = difficulte === 'difficile' ? !deductible : deductible;
        const grille = { ...g, taille, difficulte, deductible };
        if (voulu) return grille;
        if (!secours) secours = grille;
    }
    return secours;
}

/** L'état de départ : aucun pont posé. */
export const saisieVide = (g) => new Array(g.aretes.length).fill(0);

/** Combien de ponts arrivent sur chaque île, dans l'état courant. */
export function degres(g, val) {
    const d = g.iles.map(() => 0);
    g.aretes.forEach((e, i) => { d[e.a] += val[i]; d[e.b] += val[i]; });
    return d;
}

/** La grille est-elle finie ? Les trois règles, dans l'ordre où on les oublie. */
export function estResoluHashi(g, val) {
    const d = degres(g, val);
    if (g.iles.some((il, k) => d[k] !== il.n)) return false;
    if (g.aretes.some((e, i) => val[i] > 0 && g.croise[i].some(j => val[j] > 0))) return false;
    return dUnSeulTenant(g.iles.length, g.aretes, val);
}

/** Ce qui ne va pas, dit en français — pour la note du jeu. */
export function diagnostic(g, val) {
    const d = degres(g, val);
    const trop = g.iles.filter((il, k) => d[k] > il.n).length;
    const manque = g.iles.filter((il, k) => d[k] < il.n).length;
    const croises = g.aretes.filter((e, i) => val[i] > 0 && g.croise[i].some(j => val[j] > 0)).length;
    if (croises) return { ok: false, quoi: 'croisement', n: croises };
    if (trop) return { ok: false, quoi: 'trop', n: trop };
    if (manque) return { ok: false, quoi: 'manque', n: manque };
    if (!dUnSeulTenant(g.iles.length, g.aretes, val)) return { ok: false, quoi: 'morceaux', n: 0 };
    return { ok: true };
}

/** Ce qui se mesure sur une grille : de quoi annoncer la partie. */
export function qualiteHashi(g) {
    const ponts = g.solution.reduce((s, v) => s + v, 0);
    return {
        iles: g.iles.length,
        ponts,
        doubles: g.solution.filter(v => v === 2).length,
        deductible: !!g.deductible
    };
}
