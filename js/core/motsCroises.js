// LES MOTS CROISÉS — la grille, sans une ligne de DOM.
//
// Rémy : « et aussi idéalement, des mots croisés (avec des grilles toutes
// faites ou un générateur). Par exemple un mot croisé sur le vocabulaire
// d'angle. Il faut que la grille soit optimisée. Ou mot croisé sur le
// vocabulaire des opérations. »
//
// « Optimisée » est le mot juste, et c'est tout le travail de ce module. Une
// grille où les mots ne se touchent presque pas est une liste de définitions
// déguisée : on répond dans le désordre, rien n'aide rien. Une grille SERRÉE,
// au contraire, se résout par ricochet — la troisième lettre d'ANGLE donne le
// G de AIGU, qui donne le I de BISSECTRICE. C'est ce chaînage qui fait
// l'exercice, et il ne dépend que de la densité des croisements.
//
// LA RÈGLE DE POSE, en trois lignes, garantit qu'aucun mot parasite
// n'apparaît :
//   · les cases juste avant et juste après le mot sont vides ou hors grille ;
//   · chaque lettre NOUVELLE n'a aucun voisin perpendiculaire ;
//   · une lettre posée sur une lettre existante doit être la même.
// Ce qui se lit dans la grille est donc exactement ce qui a été posé — c'est
// la propriété que le test vérifie sur des centaines de grilles.

import { motsDisponibles, THEMES } from './motsCaches.js';

export { THEMES };

/** Une grille vide : `null` partout (une case noire). */
function vide(n) {
    return Array.from({ length: n }, () => new Array(n).fill(null));
}

const DIRS = { h: [1, 0], v: [0, 1] };

/**
 * Peut-on poser `mot` en (x, y) dans cette direction ?
 * @returns {number} le nombre de croisements, ou -1 si la pose est interdite.
 */
export function poseValide(g, mot, x, y, dir) {
    // LA GRILLE N'EST PAS FORCÉMENT CARRÉE. Les mots croisés la veulent carrée,
    // le mot codé la veut rectangulaire ; la règle de pose, elle, est la même.
    // On lit donc les deux dimensions au lieu d'en supposer une.
    const L1 = g[0] ? g[0].length : 0, H = g.length;
    const [dx, dy] = DIRS[dir];
    const L = mot.length;
    const fin = { x: x + dx * (L - 1), y: y + dy * (L - 1) };
    if (x < 0 || y < 0 || fin.x >= L1 || fin.y >= H) return -1;

    // Avant et après : la case doit être libre, sinon le mot s'allonge d'une
    // lettre qui appartient à un autre mot et l'on ne lit plus ni l'un ni
    // l'autre.
    const avant = { x: x - dx, y: y - dy };
    const apres = { x: fin.x + dx, y: fin.y + dy };
    const occupee = (p) => p.x >= 0 && p.y >= 0 && p.x < L1 && p.y < H && g[p.y][p.x] !== null;
    if (occupee(avant) || occupee(apres)) return -1;

    let croisements = 0;
    for (let i = 0; i < L; i++) {
        const cx = x + dx * i, cy = y + dy * i;
        const dedans = g[cy][cx];
        if (dedans !== null) {
            if (dedans !== mot[i]) return -1;
            croisements++;
            continue;
        }
        // Une lettre NOUVELLE ne doit toucher personne sur les côtés : sinon
        // elle rallonge un mot perpendiculaire déjà posé.
        const cotes = dir === 'h' ? [[cx, cy - 1], [cx, cy + 1]] : [[cx - 1, cy], [cx + 1, cy]];
        for (const [ox, oy] of cotes) {
            if (ox >= 0 && oy >= 0 && ox < L1 && oy < H && g[oy][ox] !== null) return -1;
        }
    }
    return croisements;
}

function poser(g, mot, x, y, dir) {
    const [dx, dy] = DIRS[dir];
    for (let i = 0; i < mot.length; i++) g[y + dy * i][x + dx * i] = mot[i];
}

/** L'étendue réellement occupée : le reste n'est que du papier blanc. */
function cadre(g) {
    let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
    g.forEach((ligne, y) => ligne.forEach((c, x) => {
        if (c === null) return;
        x0 = Math.min(x0, x); y0 = Math.min(y0, y);
        x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }));
    return x1 < 0 ? { x0: 0, y0: 0, x1: 0, y1: 0 } : { x0, y0, x1, y1 };
}

/**
 * UNE GRILLE, en posant les mots l'un après l'autre.
 *
 * Le premier mot va au centre ; chacun des suivants cherche TOUTES ses poses
 * possibles et garde la meilleure. « Meilleure » veut dire trois choses, dans
 * cet ordre : le plus de croisements (c'est le chaînage qu'on veut), puis
 * l'encombrement le plus faible (une grille compacte se photocopie), puis la
 * proximité du centre. Un mot qui ne croise rien n'est pas posé du tout : une
 * île isolée dans un coin ne sert à rien.
 */
export function construire(mots, rng, options = {}) {
    const cote = options.cote || 21;
    const max = options.max || Infinity;
    const g = vide(cote);
    const poses = [];
    const restants = [...mots];
    if (!restants.length) return { g, poses };

    // Le plus long d'abord : c'est lui qui donne son ossature à la grille, et
    // il ne rentrerait plus dans une grille déjà garnie.
    restants.sort((a, b) => b.mot.length - a.mot.length);
    const premier = restants.shift();
    const dep = Math.floor((cote - premier.mot.length) / 2);
    const milieu = Math.floor(cote / 2);
    poser(g, premier.mot, dep, milieu, 'h');
    poses.push({ ...premier, x: dep, y: milieu, dir: 'h' });

    let progres = true;
    while (progres && restants.length) {
        progres = false;
        for (let k = 0; k < restants.length; k++) {
            if (poses.length >= max) return { g, poses };
            const cand = restants[k];
            const meilleur = meilleurePose(g, cand.mot, rng);
            if (!meilleur) continue;
            poser(g, cand.mot, meilleur.x, meilleur.y, meilleur.dir);
            poses.push({ ...cand, x: meilleur.x, y: meilleur.y, dir: meilleur.dir });
            restants.splice(k, 1);
            k--;
            progres = true;
        }
    }
    return { g, poses };
}

/** Toutes les poses qui croisent quelque chose, et la meilleure d'entre elles. */
function meilleurePose(g, mot, rng) {
    const n = g.length;
    const c = cadre(g);
    const milieu = { x: (c.x0 + c.x1) / 2, y: (c.y0 + c.y1) / 2 };
    let meilleur = null, meilleurScore = -Infinity;
    for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
            for (const dir of ['h', 'v']) {
                const croix = poseValide(g, mot, x, y, dir);
                if (croix <= 0) continue;          // sans croisement, on ne pose pas
                const [dx, dy] = DIRS[dir];
                const fx = x + dx * (mot.length - 1), fy = y + dy * (mot.length - 1);
                const large = Math.max(c.x1, fx) - Math.min(c.x0, x);
                const haut = Math.max(c.y1, fy) - Math.min(c.y0, y);
                // Un encombrement CARRÉ plutôt qu'une bande : une grille de
                // 19 × 5 ne se lit pas, et ne s'imprime pas mieux.
                const encombrement = large + haut + Math.abs(large - haut);
                const distance = Math.abs(x - milieu.x) + Math.abs(y - milieu.y);
                // Un soupçon de hasard départage les poses équivalentes :
                // sans lui, deux grilles du même thème sont identiques.
                const score = croix * 100 - encombrement * 4 - distance + rng.next() * 3;
                if (score > meilleurScore) { meilleurScore = score; meilleur = { x, y, dir }; }
            }
        }
    }
    return meilleur;
}

/**
 * La numérotation d'une grille : celle des vraies grilles de journal.
 *
 * Une case porte un numéro si un mot COMMENCE là — horizontalement ou
 * verticalement — et les numéros se suivent dans l'ordre de lecture. Le même
 * numéro sert aux deux quand deux mots partent de la même case.
 */
export function numeroter(cases, mots) {
    const debuts = new Map();
    mots.forEach(m => {
        const cle = `${m.x},${m.y}`;
        if (!debuts.has(cle)) debuts.set(cle, []);
        debuts.get(cle).push(m);
    });
    let n = 0;
    const numeros = [];
    for (let y = 0; y < cases.length; y++) {
        for (let x = 0; x < cases[y].length; x++) {
            const cle = `${x},${y}`;
            if (!debuts.has(cle)) continue;
            n++;
            numeros.push({ x, y, num: n });
            debuts.get(cle).forEach(m => { m.num = n; });
        }
    }
    return numeros;
}

/**
 * Une grille jouable, recadrée et numérotée.
 *
 * `cases[y][x]` vaut la lettre attendue, ou `null` pour une case noire.
 */
export function creerGrille(options = {}) {
    const {
        theme = 'tout', niveauMax = 3, nbMots = 10, rng,
        longueurMin = 4, cote = 21
    } = options;
    const dispo = motsDisponibles({ theme, niveauMax }).filter(m => m.mot.length >= longueurMin);
    // Quelques mots de rab : certains ne croiseront rien, et une grille à six
    // mots quand on en demandait dix se remarque.
    const choisis = (rng ? rng.shuffle(dispo) : dispo).slice(0, nbMots + 6);
    const { g, poses } = construire(choisis, rng, { cote, max: nbMots });

    const c = cadre(g);
    const cases = [];
    for (let y = c.y0; y <= c.y1; y++) {
        cases.push(g[y].slice(c.x0, c.x1 + 1));
    }
    const mots = poses
        .map(p => ({ ...p, x: p.x - c.x0, y: p.y - c.y0 }))
        .sort((a, b) => (a.y - b.y) || (a.x - b.x));
    const numeros = numeroter(cases, mots);
    return {
        largeur: cases[0] ? cases[0].length : 0,
        hauteur: cases.length,
        cases, mots, numeros,
        // Ce qu'on n'a pas pu placer : le professeur doit pouvoir le savoir
        // plutôt que de compter les définitions.
        ecartes: choisis.filter(m => !poses.some(p => p.mot === m.mot)).map(m => m.mot)
    };
}

/**
 * LA GRILLE LA PLUS SERRÉE de plusieurs essais.
 *
 * « Il faut que la grille soit optimisée. » L'ordre dans lequel on présente
 * les mots change tout : un même lexique donne une croix maigre ou un damier
 * selon le tirage. On en fabrique donc plusieurs et l'on garde celle qui a le
 * meilleur RENDEMENT — le nombre de croisements rapporté à la surface, avec
 * un fort bonus pour le nombre de mots réellement placés.
 */
export function grilleOptimisee(options = {}) {
    const { essais = 12, rngPour, ...reste } = options;
    let meilleure = null, meilleurScore = -Infinity;
    for (let i = 0; i < essais; i++) {
        const grille = creerGrille({ ...reste, rng: rngPour(i) });
        const s = qualite(grille);
        const score = grille.mots.length * 10 + s.croisements * 4 - s.surface * 0.05;
        if (score > meilleurScore) { meilleurScore = score; meilleure = grille; }
    }
    return meilleure;
}

/** Ce qui se mesure sur une grille : de quoi comparer deux tirages. */
export function qualite(grille) {
    let lettres = 0, croisements = 0;
    grille.cases.forEach((ligne, y) => ligne.forEach((c, x) => {
        if (c === null) return;
        lettres++;
        // Une case est un croisement si elle appartient à un mot horizontal ET
        // à un mot vertical.
        const h = grille.mots.some(m => m.dir === 'h' && m.y === y && x >= m.x && x < m.x + m.mot.length);
        const v = grille.mots.some(m => m.dir === 'v' && m.x === x && y >= m.y && y < m.y + m.mot.length);
        if (h && v) croisements++;
    }));
    const surface = grille.largeur * grille.hauteur;
    return {
        mots: grille.mots.length, lettres, croisements, surface,
        // La part de la grille qui porte une lettre : au-dessus de 40 %, la
        // grille se tient ; en dessous, ce sont des mots posés côte à côte.
        remplissage: surface ? lettres / surface : 0
    };
}

/**
 * TOUT CE QUI SE LIT DANS LA GRILLE EST UN MOT POSÉ.
 *
 * C'est LA propriété qui fait qu'une grille est jouable : si une suite de deux
 * lettres ou plus apparaît sans être un mot de la liste, l'élève la voit, la
 * cherche, et ne trouve rien. Exporté parce que c'est aussi ce que le test
 * vérifie — et parce qu'une grille fabriquée à la main doit pouvoir passer le
 * même contrôle.
 */
export function suitesParasites(grille) {
    const parasites = [];
    const attendus = new Set(grille.mots.map(m => `${m.dir}:${m.x},${m.y}:${m.mot}`));
    const balayer = (dir) => {
        const lignes = dir === 'h' ? grille.hauteur : grille.largeur;
        const colonnes = dir === 'h' ? grille.largeur : grille.hauteur;
        for (let a = 0; a < lignes; a++) {
            let suite = '', debut = 0;
            for (let b = 0; b <= colonnes; b++) {
                const lettre = b < colonnes
                    ? (dir === 'h' ? grille.cases[a][b] : grille.cases[b][a])
                    : null;
                if (lettre !== null) {
                    if (!suite) debut = b;
                    suite += lettre;
                    continue;
                }
                if (suite.length >= 2) {
                    const x = dir === 'h' ? debut : a;
                    const y = dir === 'h' ? a : debut;
                    if (!attendus.has(`${dir}:${x},${y}:${suite}`)) parasites.push({ dir, x, y, suite });
                }
                suite = '';
            }
        }
    };
    balayer('h'); balayer('v');
    return parasites;
}

/** Les définitions, rangées comme sur une grille de journal. */
export function definitions(grille) {
    const par = (dir) => grille.mots.filter(m => m.dir === dir).sort((a, b) => a.num - b.num)
        .map(m => ({ num: m.num, def: m.def, longueur: m.mot.length, mot: m.mot }));
    return { horizontal: par('h'), vertical: par('v') };
}

/** La grille est-elle entièrement et correctement remplie ? */
export function estResolue(grille, saisie) {
    return grille.cases.every((ligne, y) => ligne.every((c, x) =>
        c === null || (saisie[`${x},${y}`] || '') === c));
}

/** Les cases fausses — pour la vérification, qui ne dit pas la réponse. */
export function casesFausses(grille, saisie) {
    const out = [];
    grille.cases.forEach((ligne, y) => ligne.forEach((c, x) => {
        if (c === null) return;
        const v = saisie[`${x},${y}`] || '';
        if (v && v !== c) out.push({ x, y });
    }));
    return out;
}
