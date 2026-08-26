// UNE GRILLE RECTANGULAIRE, PLEINE — celle du mot codé.
//
// Rémy, en voyant la première version : « C'est pas vraiment comme ce que je
// t'ai envoyé, moi ça tenait sur une grille rectangulaire et je partais d'un
// mot et il fallait compléter. »
//
// LA DIFFÉRENCE N'EST PAS COSMÉTIQUE. Une grille de mots croisés a la
// silhouette d'une croix : elle pousse en étoile autour du premier mot, et son
// contour dentelé est justement ce qui la rend lisible sans définitions — on
// voit où commence et où finit chaque mot. Un mot codé, lui, se joue SANS
// définitions et SANS silhouette : c'est un pavé plein, où les cases noires
// sont rares et où l'on avance uniquement par l'alphabet. Le contour dentelé
// n'y aide pas, il donne juste l'air d'une grille ratée.
//
// D'OÙ CE MODULE À PART. On ne cherche plus la grille la plus CROISÉE dans un
// carré immense qu'on recadre après coup ; on se donne un rectangle et l'on
// cherche à le REMPLIR. Le score n'est plus « combien de croisements », c'est
// « combien de cases blanches sur le rectangle ».
//
// LE LEXIQUE ENTIER, PAS SEULEMENT LE THÈME. Un mot codé n'affiche aucune
// définition : le joueur ne lit jamais la liste des mots, il les découvre. Se
// limiter aux vingt mots du thème « angles » condamnerait le rectangle à être
// aux trois quarts noir. On place donc d'abord les mots du thème — ce sont eux
// qu'on veut faire lire —, puis le reste du lexique vient boucher les trous.

import { poseValide } from './motsCroises.js';
import { motsDisponibles } from './motsCaches.js';

const DIRS = { h: [1, 0], v: [0, 1] };

/** Un rectangle vide : `null` partout. */
export function vide(largeur, hauteur) {
    return Array.from({ length: hauteur }, () => new Array(largeur).fill(null));
}

function poser(g, mot, x, y, dir) {
    const [dx, dy] = DIRS[dir];
    for (let i = 0; i < mot.length; i++) g[y + dy * i][x + dx * i] = mot[i];
}

/** Combien de cases NEUVES un mot posé là ajouterait-il ? */
function neuves(g, mot, x, y, dir) {
    const [dx, dy] = DIRS[dir];
    let n = 0;
    for (let i = 0; i < mot.length; i++) if (g[y + dy * i][x + dx * i] === null) n++;
    return n;
}

/**
 * LA MEILLEURE POSE POUR REMPLIR, qui n'est pas la meilleure pose pour croiser.
 *
 * Trois termes, et leur ordre de grandeur dit l'intention :
 *   · les cases neuves comptent le plus — c'est le remplissage qu'on cherche ;
 *   · les croisements comptent aussi, mais moitié moins : ils resserrent le
 *     tissu sans être le but ;
 *   · un mot qui va vers une zone encore vide est préféré à un mot qui se
 *     replie sur la zone déjà dense, sans quoi le rectangle se remplit par un
 *     coin et laisse l'autre en friche.
 */
function meilleurePose(g, mot, rng, densite) {
    const L = g[0].length, H = g.length;
    let meilleur = null, meilleurScore = -Infinity;
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < L; x++) {
            for (const dir of ['h', 'v']) {
                const croix = poseValide(g, mot, x, y, dir);
                if (croix <= 0) continue;      // sans croisement, pas d'île isolée
                const n = neuves(g, mot, x, y, dir);
                if (!n) continue;              // un mot entièrement recouvert n'apporte rien
                const [dx, dy] = DIRS[dir];
                // Le vide alentour, mesuré sur les cases que le mot occuperait.
                let appel = 0;
                for (let i = 0; i < mot.length; i++) {
                    appel += 1 - densite(x + dx * i, y + dy * i);
                }
                const score = n * 10 + croix * 5 + appel * 3 + rng.next() * 2;
                if (score > meilleurScore) { meilleurScore = score; meilleur = { x, y, dir }; }
            }
        }
    }
    return meilleur;
}

/** La densité locale autour d'une case : 0 = désert, 1 = plein. */
function mesureur(g) {
    const L = g[0].length, H = g.length;
    return (x, y) => {
        let pleines = 0, total = 0;
        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                const cx = x + dx, cy = y + dy;
                if (cx < 0 || cy < 0 || cx >= L || cy >= H) continue;
                total++;
                if (g[cy][cx] !== null) pleines++;
            }
        }
        return total ? pleines / total : 1;
    };
}

/** Les lignes et colonnes vides du bord : ce n'est pas du rectangle, c'est de la marge. */
export function recadrer(g) {
    let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
    g.forEach((ligne, y) => ligne.forEach((c, x) => {
        if (c === null) return;
        x0 = Math.min(x0, x); y0 = Math.min(y0, y);
        x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }));
    if (x1 < 0) return { cases: [[null]], dx: 0, dy: 0 };
    const cases = [];
    for (let y = y0; y <= y1; y++) cases.push(g[y].slice(x0, x1 + 1));
    return { cases, dx: x0, dy: y0 };
}

/**
 * UN RECTANGLE GARNI, en un tirage.
 *
 * Le premier mot est posé au milieu, en travers : c'est la barre dont tout le
 * reste va pendre. Ensuite on repasse tant que quelque chose se place — un mot
 * refusé au premier tour peut devenir plaçable une fois que trois autres ont
 * ouvert des lettres.
 */
export function garnirRectangle(mots, rng, options = {}) {
    const { largeur = 11, hauteur = 9 } = options;
    const g = vide(largeur, hauteur);
    const poses = [];
    const restants = mots.filter(m => m.mot.length <= Math.max(largeur, hauteur));
    if (!restants.length) return { g, poses };

    // Le plus long des mots du thème ouvre la grille : c'est celui qu'on est
    // sûr de faire lire, et il ne rentrerait plus dans un rectangle déjà garni.
    let iPremier = 0;
    restants.forEach((m, i) => {
        const mieux = (Number(!!m.duTheme) * 100 + m.mot.length)
            > (Number(!!restants[iPremier].duTheme) * 100 + restants[iPremier].mot.length);
        if (mieux) iPremier = i;
    });
    const premier = restants.splice(iPremier, 1)[0];
    const px = Math.floor((largeur - premier.mot.length) / 2);
    const py = Math.floor((hauteur - 1) / 2);
    poser(g, premier.mot, px, py, 'h');
    poses.push({ ...premier, x: px, y: py, dir: 'h' });

    const densite = mesureur(g);
    let progres = true;
    while (progres && restants.length) {
        progres = false;
        for (let k = 0; k < restants.length; k++) {
            const cand = restants[k];
            const pose = meilleurePose(g, cand.mot, rng, densite);
            if (!pose) continue;
            poser(g, cand.mot, pose.x, pose.y, pose.dir);
            poses.push({ ...cand, ...pose });
            restants.splice(k, 1);
            k--;
            progres = true;
        }
    }
    return { g, poses };
}

/** Ce qui se mesure sur un rectangle garni. */
export function remplissage(cases) {
    let blanches = 0;
    cases.forEach(l => l.forEach(c => { if (c !== null) blanches++; }));
    const total = cases.length * (cases[0] ? cases[0].length : 0);
    return { blanches, total, part: total ? blanches / total : 0 };
}

/**
 * LE MEILLEUR RECTANGLE DE PLUSIEURS TIRAGES.
 *
 * L'ordre dans lequel les mots se présentent change tout : le même lexique
 * donne un pavé bien serré ou une croix perdue au milieu du vide. On en tire
 * donc plusieurs et l'on garde celui dont le rectangle est le plus PLEIN, à
 * égalité de quoi on préfère celui qui fait lire le plus de mots du thème.
 */
export function rectangleOptimise(options = {}) {
    const {
        theme = 'angles', niveauMax = 3, largeur = 11, hauteur = 9,
        essais = 14, rngPour, longueurMin = 3
    } = options;

    const duTheme = motsDisponibles({ theme, niveauMax })
        .filter(m => m.mot.length >= longueurMin)
        .map(m => ({ ...m, duTheme: true }));
    const clesTheme = new Set(duTheme.map(m => m.mot));
    const autres = motsDisponibles({ theme: 'tout', niveauMax: Math.max(niveauMax, 3) })
        .filter(m => m.mot.length >= longueurMin && !clesTheme.has(m.mot))
        .map(m => ({ ...m, duTheme: false }));

    let meilleur = null, meilleurScore = -Infinity;
    for (let i = 0; i < essais; i++) {
        const rng = rngPour(i);
        // On rebat les deux paquets séparément : le thème garde sa priorité,
        // mais on ne veut pas toujours les mêmes bouche-trous.
        const liste = rng.shuffle([...duTheme]).concat(rng.shuffle([...autres]));
        const { g, poses } = garnirRectangle(liste, rng, { largeur, hauteur });
        const { cases, dx, dy } = recadrer(g);
        const r = remplissage(cases);
        const theTheme = poses.filter(p => p.duTheme).length;
        const score = r.part * 100 + theTheme * 2 + poses.length * 0.5;
        if (score > meilleurScore) {
            meilleurScore = score;
            meilleur = {
                cases,
                largeur: cases[0].length, hauteur: cases.length,
                mots: poses.map(p => ({
                    mot: p.mot, def: p.def, duTheme: !!p.duTheme,
                    x: p.x - dx, y: p.y - dy, dir: p.dir
                })).sort((a, b) => (a.y - b.y) || (a.x - b.x)),
                remplissage: r
            };
        }
    }
    return meilleur;
}
