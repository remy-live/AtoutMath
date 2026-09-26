// LE PATCHWORK — découper une grille en morceaux qui ont un centre de symétrie.
//
// Rémy, quatre pages d'un magazine de jeux à l'appui : « j'aimerais bien ces
// jeux en français et en rapport avec les maths ». Celui-ci s'appelait
// « Quilt » ; c'est le plus mathématique des quatre, et de loin.
//
// LA RÈGLE, EN DEUX PHRASES. On découpe toute la grille en morceaux. Chaque
// morceau porte UN nombre, qui dit combien il a de cases — son aire — et chaque
// morceau doit avoir un CENTRE DE SYMÉTRIE : tourné d'un demi-tour autour de ce
// point, il retombe exactement sur lui-même.
//
// CE QUE ÇA TRAVAILLE, ET POURQUOI C'EST RARE. La symétrie centrale s'enseigne
// presque toujours sur des figures qu'on regarde, jamais sur des figures qu'on
// FABRIQUE. Ici l'élève doit chercher, pour une aire donnée, quelles formes ont
// un centre — et découvrir en chemin que le centre n'est pas toujours une case
// (pour une aire paire il tombe entre deux cases) et qu'un morceau de quatre
// cases en L n'en a pas. C'est exactement la leçon, et elle ne se dit pas : elle
// se bute.
//
// ET CE N'EST PAS UNE CONSTRUCTION GÉOMÉTRIQUE. La ligne rouge de Rémy — « je
// ne veux pas de construction géométrique avec des outils virtuels, rien ne
// remplace le geste » — vise la règle et le compas. Ici on colorie des cases
// d'un quadrillage : c'est un jeu de logique, du même bois que le Slitherlink
// et le Hashi, qui sont au catalogue depuis longtemps.
//
// UNE SIMPLIFICATION ASSUMÉE PAR RAPPORT AU JEU D'ORIGINE. Le magazine autorise
// des morceaux SANS nombre, et interdit à deux morceaux de même aire de se
// toucher — deux règles qui font une grille plus dure et, surtout, une grille
// qu'on ne peut pas colorier au doigt (on ne sait pas par où commencer un
// morceau muet). Chaque morceau porte donc ici son nombre. Le jeu y perd une
// dent ; il y gagne de pouvoir se jouer en sixième, sur un téléphone.

import { makeRng } from './ids.js';

/**
 * LES PALIERS — ce qui monte, et ce qui ne monte pas.
 *
 * La grille grandit, et les morceaux avec elle. C'est la TAILLE DES MORCEAUX
 * qui fait la difficulté : plus un morceau est grand, plus il existe de formes
 * de cette aire-là, et plus il faut en essayer avant de trouver celle qui a un
 * centre. Une grande grille de petits morceaux est longue sans être difficile.
 *
 * ILS VIVENT DANS LE NOYAU, PAS DANS LE JEU. Le catalogue lit ces libellés pour
 * son menu ; s'ils habitaient le module de jeu, importer le catalogue
 * importerait le jeu, donc le DOM — et les tests, qui n'ont pas de navigateur,
 * tombaient tous d'un coup. Mesuré : dix-neuf fichiers de tests en échec sur
 * « document is not defined ».
 */
export const PALIERS_PATCHWORK = {
    decouverte: { label: 'Petite grille, petits morceaux', lignes: 4, colonnes: 4, tailleMax: 4 },
    facile: { label: 'Grille de 5 sur 5', lignes: 5, colonnes: 5, tailleMax: 5 },
    moyen: { label: 'Grille de 5 sur 5, morceaux jusqu\u2019\u00e0 6 cases',
        lignes: 5, colonnes: 5, tailleMax: 6 },
    difficile: { label: 'Grille de 6 sur 6, morceaux jusqu\u2019\u00e0 8 cases',
        lignes: 6, colonnes: 6, tailleMax: 8 }
};

/** Les quatre voisines d'une case, dans une grille de `colonnes` colonnes. */
export function voisines(i, lignes, colonnes) {
    const r = Math.floor(i / colonnes), c = i % colonnes;
    const out = [];
    if (r > 0) out.push(i - colonnes);
    if (r < lignes - 1) out.push(i + colonnes);
    if (c > 0) out.push(i - 1);
    if (c < colonnes - 1) out.push(i + 1);
    return out;
}

/**
 * LE CENTRE D'UN MORCEAU — et pourquoi c'est le centre de gravité.
 *
 * Si un ensemble de cases a un centre de symétrie, ce centre est forcément son
 * centre de gravité : les cases vont deux par deux, chacune avec son
 * symétrique, et le milieu de chaque paire EST le centre. On n'a donc rien à
 * chercher — on calcule la moyenne, et il ne reste qu'à vérifier.
 *
 * Les coordonnées sont DOUBLÉES pour rester entières : une aire paire met le
 * centre entre deux cases, et une demi-case en virgule flottante finirait par
 * ne plus être égale à elle-même.
 *
 * @returns {{r2:number, c2:number}} le centre, en coordonnées doublées
 */
export function centreDe(cases, colonnes) {
    let sr = 0, sc = 0;
    for (const i of cases) { sr += Math.floor(i / colonnes); sc += i % colonnes; }
    const n = cases.length;
    // 2 × moyenne, et c'est entier dès que la somme est divisible par n.
    return { r2: (2 * sr) / n, c2: (2 * sc) / n };
}

/**
 * CE MORCEAU A-T-IL UN CENTRE DE SYMÉTRIE ?
 *
 * On prend son centre de gravité, et l'on demande à chaque case où tombe sa
 * symétrique. Si UNE seule manque, c'est non — et c'est cette case-là qu'on
 * rend, parce qu'un « non » qui ne montre rien n'apprend rien.
 *
 * @returns {{ok:boolean, centre:{r2,c2}, manquante:?number}}
 */
export function symetrieCentrale(cases, lignes, colonnes) {
    const centre = centreDe(cases, colonnes);
    // Un centre qui tombe sur un quart de case ne peut appartenir à aucune
    // symétrie de quadrillage : le morceau est disqualifié d'emblée.
    if (!Number.isInteger(centre.r2) || !Number.isInteger(centre.c2)) {
        return { ok: false, centre, manquante: cases[0] ?? null };
    }
    const dedans = new Set(cases);
    for (const i of cases) {
        const r = Math.floor(i / colonnes), c = i % colonnes;
        const r2 = centre.r2 - r, c2 = centre.c2 - c;
        if (r2 < 0 || r2 >= lignes || c2 < 0 || c2 >= colonnes
            || !dedans.has(r2 * colonnes + c2)) {
            return { ok: false, centre, manquante: i };
        }
    }
    return { ok: true, centre, manquante: null };
}

/** Les cases d'un morceau tiennent-elles en UN SEUL tenant ? */
export function dUnSeulTenant(cases, lignes, colonnes) {
    if (!cases.length) return true;
    const dedans = new Set(cases);
    const vus = new Set([cases[0]]);
    const pile = [cases[0]];
    while (pile.length) {
        for (const v of voisines(pile.pop(), lignes, colonnes)) {
            if (dedans.has(v) && !vus.has(v)) { vus.add(v); pile.push(v); }
        }
    }
    return vus.size === cases.length;
}

// --- Fabriquer une grille ---------------------------------------------------

/**
 * TOUTES LES FORMES QUI ONT UN CENTRE DE SYMÉTRIE, jusqu'à une aire donnée.
 *
 * ON LES ÉNUMÈRE, ON NE LES ÉCRIT PAS À LA MAIN. Une liste écrite à la main
 * oublie toujours quelque chose — le Z de quatre cases, le 2×3, la croix de
 * cinq — et ce qu'elle oublie, l'élève ne le rencontrera jamais. On fabrique
 * donc tous les polyominos jusqu'à l'aire voulue, et l'on garde ceux que
 * `symetrieCentrale` accepte : le MÊME juge que celui qui corrigera l'élève.
 *
 * Les formes sont données en décalages `[dr, dc]` ramenés en haut à gauche, et
 * chaque ORIENTATION compte pour une forme : un domino couché et un domino
 * debout ne se posent pas au même endroit.
 */
const formesEnCache = new Map();

export function formesSymetriques(aireMax) {
    if (formesEnCache.has(aireMax)) return formesEnCache.get(aireMax);
    const cle = (cases) => {
        const mr = Math.min(...cases.map(x => x[0]));
        const mc = Math.min(...cases.map(x => x[1]));
        return cases.map(([r, c]) => [r - mr, c - mc])
            .sort((a, b) => a[0] - b[0] || a[1] - b[1])
            .map(x => x.join(',')).join(' ');
    };
    const lire = (k) => k.split(' ').map(x => x.split(',').map(Number));
    const vues = new Map([[cle([[0, 0]]), [[0, 0]]]]);
    let front = [[[0, 0]]];
    for (let taille = 1; taille < aireMax; taille++) {
        const suivant = [];
        for (const forme of front) {
            for (const [r, c] of forme) {
                for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                    const v = [r + dr, c + dc];
                    if (forme.some(x => x[0] === v[0] && x[1] === v[1])) continue;
                    const k = cle([...forme, v]);
                    if (vues.has(k)) continue;
                    const rangee = lire(k);
                    vues.set(k, rangee);
                    suivant.push(rangee);
                }
            }
        }
        front = suivant;
    }
    // Le filtre : on réutilise le juge de l'élève, sur une grille assez large
    // pour que rien ne dépasse.
    const large = aireMax + 2;
    const gardees = [...vues.values()].filter(f =>
        symetrieCentrale(f.map(([r, c]) => r * large + c), large, large).ok);
    gardees.sort((a, b) => a.length - b.length);
    formesEnCache.set(aireMax, gardees);
    return gardees;
}

/**
 * PAVER LA GRILLE, AVEC RETOUR ARRIÈRE.
 *
 * LA POUSSE AU HASARD NE MARCHAIT PAS, et la mesure l'a dit sans appel : en
 * faisant grandir un morceau symétrique case par case, sur trois cents grilles
 * de 5×5, PLUS DE LA MOITIÉ des morceaux ne faisaient qu'une case — les gros
 * morceaux se posaient d'abord, puis il ne restait que des trous d'une case, et
 * un patchwork de cases seules n'est pas un patchwork.
 *
 * On pose donc des FORMES entières, en commençant par la première case libre en
 * lecture, et l'on revient en arrière quand plus rien ne rentre. C'est le
 * pavage exact classique ; sur vingt-cinq ou trente-six cases il est instantané,
 * et il ne laisse une case seule que là où il n'y avait vraiment pas la place.
 *
 * ON ESSAIE LES GRANDES FORMES D'ABORD : c'est ce qui fait la variété des
 * aires, donc l'intérêt du jeu.
 */
function paver(rng, lignes, colonnes, tailleMax) {
    const N = lignes * colonnes;
    const formes = formesSymetriques(tailleMax);
    const pris = new Array(N).fill(false);
    const morceaux = [];
    let garde = 0;

    const faconsDeCouvrir = (depart) => {
        const rd = Math.floor(depart / colonnes), cd = depart % colonnes;
        // Toutes les façons de couvrir CETTE case : chaque forme, posée par
        // chacune de ses cases.
        const essais = [];
        for (const forme of formes) {
            for (const [ar, ac] of forme) {
                const cases = [];
                let bon = true;
                for (const [r, c] of forme) {
                    const rr = rd + r - ar, cc = cd + c - ac;
                    if (rr < 0 || rr >= lignes || cc < 0 || cc >= colonnes) { bon = false; break; }
                    const i = rr * colonnes + cc;
                    if (pris[i]) { bon = false; break; }
                    cases.push(i);
                }
                if (bon) essais.push(cases);
            }
        }
        // GRANDES D'ABORD, MAIS PAS TOUJOURS.
        //
        // Trier strictement par aire décroissante donnait un pavage
        // DÉTERMINISTE : mesuré sur trois cents grilles de 5×5, les trois cents
        // avaient exactement les mêmes aires — 2, 3, 4, 4, 6, 6. Le mélange à
        // aire égale n'y changeait rien, puisque le tri le défaisait aussitôt.
        //
        // On bruite donc le classement : chaque candidat reçoit son aire plus
        // un petit tirage. Les grandes formes passent encore devant, mais une
        // moyenne peut leur griller la politesse — et deux grilles ne se
        // ressemblent plus.
        rng.shuffle(essais);
        const note = new Map(essais.map(c => [c, c.length + rng.int(0, 2)]));
        essais.sort((a, b) => note.get(b) - note.get(a));
        return essais;
    };

    const suite = () => {
        if (garde++ > 20000) return false;
        const depart = pris.indexOf(false);
        if (depart < 0) return true;
        for (const cases of faconsDeCouvrir(depart)) {
            cases.forEach(i => { pris[i] = true; });
            morceaux.push(cases);
            if (suite()) return true;
            morceaux.pop();
            cases.forEach(i => { pris[i] = false; });
        }
        return false;
    };

    return suite() ? morceaux : null;
}

/**
 * UNE GRILLE DE PATCHWORK.
 *
 * @param {{rng?, lignes?:number, colonnes?:number, tailleMax?:number}} opts
 * @returns {{lignes, colonnes, morceaux:Array<{cases:number[], nombre:number,
 *   indice:number}>}}
 */
export function genererPatchwork({ rng = makeRng('patchwork'), lignes = 5,
    colonnes = 5, tailleMax = 6 } = {}) {
    for (let essai = 0; essai < 20; essai++) {
        const morceaux = paver(rng, lignes, colonnes, tailleMax);
        if (!morceaux) continue;
        // ON NE FAIT PAS CONFIANCE AU FABRICANT : on relit ce qu'on vient de
        // produire avec le MÊME vérificateur que celui qui jugera l'élève. Un
        // générateur qui se croit juste est un générateur qu'on ne peut pas
        // corriger.
        const bon = morceaux.every(m => m.length
            && dUnSeulTenant(m, lignes, colonnes)
            && symetrieCentrale(m, lignes, colonnes).ok);
        if (!bon) continue;

        return {
            lignes, colonnes,
            morceaux: morceaux.map(cases => ({
                cases: [...cases].sort((a, b) => a - b),
                nombre: cases.length,
                // OÙ S'ÉCRIT LE NOMBRE. Au centre quand le centre est une case
                // — c'est le plus parlant, et cela met la symétrie sous les
                // yeux. Sinon sur la première case : pour une aire paire, le
                // centre tombe entre deux cases et n'a pas de case à lui.
                indice: caseDuCentre(cases, lignes, colonnes)
            }))
        };
    }
    return null;
}

/** La case du centre, s'il tombe sur une case ; sinon la première du morceau. */
function caseDuCentre(cases, lignes, colonnes) {
    const { r2, c2 } = centreDe(cases, colonnes);
    if (Number.isInteger(r2) && Number.isInteger(c2) && r2 % 2 === 0 && c2 % 2 === 0) {
        const i = (r2 / 2) * colonnes + (c2 / 2);
        if (cases.includes(i)) return i;
    }
    return [...cases].sort((a, b) => a - b)[0];
}

// --- Juger la grille d'un élève ---------------------------------------------

/**
 * CE QUI NE VA PAS DANS CE DÉCOUPAGE — dans l'ordre où l'on veut l'apprendre.
 *
 * L'ordre n'est pas décoratif. Dire « ce morceau n'a pas de centre de symétrie »
 * à quelqu'un qui a laissé trois cases blanches, c'est répondre à une question
 * qu'il ne se pose pas encore. On signale donc, dans l'ordre : ce qui n'est pas
 * colorié, ce qui est en deux morceaux, ce qui a la mauvaise aire, et seulement
 * ensuite la symétrie — qui est la vraie leçon, et qui mérite qu'on y arrive
 * l'esprit libre.
 *
 * ON NE COMPARE PAS À LA SOLUTION DU FABRICANT. Une grille de patchwork peut
 * avoir plusieurs découpages valables ; refuser celui de l'élève parce qu'il
 * n'est pas celui qu'on avait en tête serait une faute d'énoncé, pas de l'élève.
 *
 * @param {object} grille ce que rend `genererPatchwork`
 * @param {Array<?number>} appartenance pour chaque case, l'indice du morceau
 *   (la case qui porte le nombre) auquel l'élève l'a donnée, ou null
 * @returns {{ok:boolean, problemes:Array<{genre,message,cases:number[]}>}}
 */
export function verifierPatchwork(grille, appartenance) {
    const { lignes, colonnes, morceaux } = grille;
    const N = lignes * colonnes;
    const problemes = [];
    const dit = (genre, message, cases) => problemes.push({ genre, message, cases });

    // 1. Les cases oubliées.
    const orphelines = [];
    for (let i = 0; i < N; i++) if (appartenance[i] === null || appartenance[i] === undefined) orphelines.push(i);
    if (orphelines.length) {
        dit('oubliees', orphelines.length === 1
            ? 'Il reste une case qui n’appartient à aucun morceau.'
            : `Il reste ${orphelines.length} cases qui n’appartiennent à aucun morceau.`,
        orphelines);
    }

    // 2. Chaque morceau, un par un.
    for (const m of morceaux) {
        const cases = [];
        for (let i = 0; i < N; i++) if (appartenance[i] === m.indice) cases.push(i);
        if (!cases.length) {
            dit('vide', `Le morceau du ${m.nombre} n’a aucune case.`, [m.indice]);
            continue;
        }
        if (!cases.includes(m.indice)) {
            dit('sansNombre', `Un morceau ne contient pas son nombre.`, cases);
            continue;
        }
        if (!dUnSeulTenant(cases, lignes, colonnes)) {
            dit('coupe', `Le morceau du ${m.nombre} est en deux parties séparées : `
                + 'un morceau se tient d’un seul tenant.', cases);
            continue;
        }
        if (cases.length !== m.nombre) {
            dit('aire', `Ce morceau a ${cases.length} case${cases.length > 1 ? 's' : ''}, `
                + `et son nombre dit ${m.nombre}.`, cases);
            continue;
        }
        const sym = symetrieCentrale(cases, lignes, colonnes);
        if (!sym.ok) {
            dit('symetrie', `Ce morceau de ${m.nombre} cases n’a pas de centre de `
                + 'symétrie : tourné d’un demi-tour, il ne retombe pas sur lui-même.',
            cases);
        }
    }

    // 3. Deux morceaux qui se chevauchent — impossible par construction de
    //    l'écran (une case n'a qu'un propriétaire), mais un jugement qui
    //    suppose son interface est un jugement qui se trompera le jour où
    //    l'interface changera.
    const connus = new Set(morceaux.map(m => m.indice));
    const inconnues = [];
    for (let i = 0; i < N; i++) {
        const a = appartenance[i];
        if (a !== null && a !== undefined && !connus.has(a)) inconnues.push(i);
    }
    if (inconnues.length) {
        dit('inconnu', 'Des cases sont données à un morceau qui n’existe pas.', inconnues);
    }

    return { ok: problemes.length === 0, problemes };
}

/**
 * LA SOLUTION DU FABRICANT, pour la correction du robot et le corrigé papier.
 *
 * Ce n'est PAS « la » solution — voir `verifierPatchwork` : il peut y en avoir
 * d'autres, et elles sont acceptées. C'est celle qu'on montre quand l'élève
 * demande à voir.
 */
export function solutionDe(grille) {
    const out = new Array(grille.lignes * grille.colonnes).fill(null);
    grille.morceaux.forEach(m => m.cases.forEach(i => { out[i] = m.indice; }));
    return out;
}
