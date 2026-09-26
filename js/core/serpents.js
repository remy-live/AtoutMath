// LES SERPENTS — remplir une grille de serpents dont on donne la longueur.
//
// Rémy, quatre pages d'un magazine de jeux à l'appui : « j'aimerais bien ces
// jeux en français et en rapport avec les maths ». Celui-ci s'appelait
// « Snakes in Boxes ».
//
// LA RÈGLE, EN TROIS PHRASES. On remplit toute la grille de serpents. Chaque
// serpent part d'une case qui porte un nombre, et ce nombre dit sa LONGUEUR —
// combien de cases il occupe. Un serpent va tout droit ou tourne à angle droit,
// et il ne se replie jamais au point de remplir un carré de quatre cases : un
// serpent est mince partout.
//
// CE QUE ÇA TRAVAILLE. Compter une longueur en cases, d'abord — c'est le
// dénombrement, et il se fait le doigt sur l'écran. Puis l'angle droit, qui est
// le seul virage permis. Et surtout, avec le réglage « calculs », le nombre
// n'est plus écrit : il est CALCULÉ. « 2 × 3 » au départ d'un serpent, et il
// faut savoir que six cases suivront avant même de commencer à le tracer. Le
// calcul mental cesse alors d'être un exercice pour devenir un moyen.
//
// LA RÈGLE DU CARRÉ DE QUATRE EST LA PLUS BELLE, et c'est celle qu'on oublie.
// Sans elle, un « serpent » de huit cases pourrait être un rectangle 2 × 4, et
// le jeu se réduirait à découper la grille en rectangles. Avec elle, il faut
// que le chemin reste un chemin — qu'on puisse le parcourir de la tête à la
// queue sans jamais s'élargir.

import { makeRng } from './ids.js';
// LES DEUX AIDES DE QUADRILLAGE VIENNENT DU PATCHWORK, et ce n'est pas un
// hasard : les deux jeux découpent une grille en morceaux. Les recopier ici,
// c'est accepter qu'un jour l'une des deux copies se corrige et pas l'autre.
import { voisines, dUnSeulTenant } from './patchwork.js';

export { voisines, dUnSeulTenant };

/** Les paliers : la grille grandit, les serpents s'allongent. */
export const PALIERS_SERPENTS = {
    decouverte: { label: 'Petite grille, serpents courts', lignes: 4, colonnes: 4, longueurMax: 4 },
    facile: { label: 'Grille de 5 sur 5', lignes: 5, colonnes: 5, longueurMax: 6 },
    moyen: { label: 'Grille de 6 sur 6', lignes: 6, colonnes: 6, longueurMax: 7 },
    difficile: { label: 'Grille de 7 sur 7, serpents jusqu’à 9 cases',
        lignes: 7, colonnes: 7, longueurMax: 9 }
};

/**
 * EST-CE UN SERPENT ?
 *
 * Trois conditions, et la troisième est celle du jeu :
 *   · les cases se tiennent — on passe de l'une à l'autre par des côtés ;
 *   · c'est un CHEMIN : deux cases ont une seule voisine (la tête et la queue),
 *     toutes les autres en ont exactement deux. Une fourche ou une boucle n'est
 *     pas un serpent ;
 *   · aucun carré de quatre cases n'est entièrement dedans. Sans cette
 *     condition, un rectangle 2 × 4 passerait — et le jeu se réduirait à
 *     découper la grille en rectangles.
 *
 * @returns {{ok:boolean, pourquoi:string, bouts:number[]}}
 */
export function estUnSerpent(cases, lignes, colonnes) {
    if (!cases.length) return { ok: false, pourquoi: 'vide', bouts: [] };
    if (cases.length === 1) return { ok: true, pourquoi: '', bouts: [cases[0]] };
    if (!dUnSeulTenant(cases, lignes, colonnes)) {
        return { ok: false, pourquoi: 'coupe', bouts: [] };
    }
    const dedans = new Set(cases);
    const bouts = [];
    for (const i of cases) {
        const n = voisines(i, lignes, colonnes).filter(v => dedans.has(v)).length;
        if (n === 1) bouts.push(i);
        else if (n !== 2) return { ok: false, pourquoi: n > 2 ? 'fourche' : 'seule', bouts: [] };
    }
    // Un chemin a exactement deux bouts ; une boucle fermée n'en a aucun.
    if (bouts.length !== 2) return { ok: false, pourquoi: 'boucle', bouts: [] };

    for (const i of cases) {
        const r = Math.floor(i / colonnes), c = i % colonnes;
        if (r + 1 >= lignes || c + 1 >= colonnes) continue;
        if (dedans.has(i + 1) && dedans.has(i + colonnes) && dedans.has(i + colonnes + 1)) {
            return { ok: false, pourquoi: 'carre', bouts };
        }
    }
    return { ok: true, pourquoi: '', bouts };
}

// --- Fabriquer une grille ---------------------------------------------------

/**
 * FAIRE POUSSER UN SERPENT, case par case.
 *
 * Un serpent pousse par un bout : c'est un chemin, et un chemin n'a que deux
 * extrémités. On part donc de la case visée, et l'on avance tant qu'on peut —
 * en refusant tout pas qui fermerait un carré de quatre.
 *
 * ON PART DE LA PREMIÈRE CASE LIBRE EN LECTURE, et l'on pousse vers ce qui
 * reste : c'est ce qui évite de laisser des trous d'une case derrière soi.
 */
function pousserUnSerpent(rng, libre, lignes, colonnes, cible) {
    const depart = [...libre].sort((a, b) => a - b)[0];
    const chemin = [depart];
    const dedans = new Set([depart]);

    const fermeUnCarre = (i) => {
        const r = Math.floor(i / colonnes), c = i % colonnes;
        // Les quatre carrés dont cette case peut être un coin.
        for (const [dr, dc] of [[0, 0], [0, -1], [-1, 0], [-1, -1]]) {
            const r0 = r + dr, c0 = c + dc;
            if (r0 < 0 || c0 < 0 || r0 + 1 >= lignes || c0 + 1 >= colonnes) continue;
            const coins = [r0 * colonnes + c0, r0 * colonnes + c0 + 1,
                (r0 + 1) * colonnes + c0, (r0 + 1) * colonnes + c0 + 1];
            if (coins.every(x => x === i || dedans.has(x))) return true;
        }
        return false;
    };

    while (chemin.length < cible) {
        const tete = chemin[chemin.length - 1];
        const pas = voisines(tete, lignes, colonnes).filter(v =>
            libre.has(v) && !dedans.has(v) && !fermeUnCarre(v));
        if (!pas.length) break;
        // ON PRÉFÈRE LE PAS QUI LAISSE LE MOINS D'ISSUES. C'est la vieille
        // heuristique de Warnsdorff, celle du cavalier : aller d'abord là où
        // l'on pourra le moins revenir, pour ne pas enfermer une case seule
        // derrière soi. Mesurée plus bas, elle change tout.
        const compte = (v) => voisines(v, lignes, colonnes)
            .filter(x => libre.has(x) && !dedans.has(x)).length;
        const moins = Math.min(...pas.map(compte));
        const choix = rng.pick(pas.filter(v => compte(v) === moins));
        chemin.push(choix);
        dedans.add(choix);
    }
    return chemin;
}

/**
 * UNE GRILLE DE SERPENTS.
 *
 * On pousse un serpent, on l'enlève des cases libres, on recommence. Si la
 * grille se retrouve avec un serpent d'une seule case en trop, ou si l'un
 * d'eux n'est pas un vrai serpent, on jette tout et l'on retire : une grille
 * ratée coûte un dixième de milliseconde, et rafistoler coûte bien plus cher
 * en justesse.
 *
 * @param {{rng?, lignes?, colonnes?, longueurMax?, seules?:number}} opts
 *   `seules` : combien de serpents d'une seule case on tolère. Un serpent d'une
 *   case est un serpent légitime — mais une grille qui n'en contient que ça
 *   n'est pas une grille de serpents.
 */
export function genererSerpents({ rng = makeRng('serpents'), lignes = 5, colonnes = 5,
    longueurMax = 6, seules = 1 } = {}) {
    const N = lignes * colonnes;
    for (let essai = 0; essai < 400; essai++) {
        const libre = new Set(Array.from({ length: N }, (_, i) => i));
        const serpents = [];
        let rate = false;
        while (libre.size) {
            const cible = rng.int(Math.min(2, libre.size), Math.min(longueurMax, libre.size));
            const s = pousserUnSerpent(rng, libre, lignes, colonnes, cible);
            if (!s.length) { rate = true; break; }
            s.forEach(i => libre.delete(i));
            serpents.push(s);
        }
        if (rate) continue;
        if (serpents.filter(s => s.length === 1).length > seules) continue;
        // ON RELIT CE QU'ON VIENT DE PRODUIRE avec le juge de l'élève.
        if (!serpents.every(s => estUnSerpent(s, lignes, colonnes).ok)) continue;

        return {
            lignes, colonnes,
            serpents: serpents.map(chemin => ({
                cases: [...chemin],
                longueur: chemin.length,
                // LE NOMBRE S'ÉCRIT À UN BOUT, jamais au milieu : c'est de là
                // que part le serpent, et c'est ce que dit la règle.
                tete: chemin[0]
            }))
        };
    }
    return null;
}

/**
 * LE NOMBRE, OU LE CALCUL QUI LE DONNE.
 *
 * Rémy voulait ces jeux « en rapport avec les maths ». Un serpent de six cases
 * annoncé par « 2 × 3 » demande de savoir combien AVANT de pouvoir tracer : le
 * calcul mental cesse d'être un exercice pour devenir un moyen. Les
 * décompositions sont choisies pour rester lisibles — on ne propose pas
 * « 36 ÷ 6 » à un élève de sixième au milieu d'un jeu de logique.
 */
export function ecrireLaLongueur(n, comment, rng) {
    if (comment !== 'calculs') return String(n);
    // LE PRODUIT D'ABORD, LA SOUSTRACTION EN DERNIER. Mesuré sans pondération,
    // sur cinq tirages du nombre 6 : « 4 + 2 », « 15 − 9 », « 9 − 3 », « 9 − 3 »,
    // « 5 + 1 » — pas un seul produit, et deux soustractions à deux chiffres
    // pour dire « six ». Le jeu est un jeu de logique : le calcul doit se faire
    // de tête, sans poser.
    const façons = [];
    const ajouter = (texte, poids) => { for (let k = 0; k < poids; k++) façons.push(texte); };
    for (let a = 2; a <= 9; a++) {
        if (n % a === 0 && n / a >= 2 && n / a <= 9) ajouter(`${a} × ${n / a}`, 4);
    }
    for (let a = 2; a < n; a++) if (n - a >= 2) ajouter(`${a} + ${n - a}`, 2);
    // On ne va pas chercher loin pour soustraire : « 15 − 9 » pour dire six
    // fait deux calculs là où l'on en voulait un.
    for (let a = n + 2; a <= Math.min(n + 5, 18); a++) ajouter(`${a} − ${a - n}`, 1);
    return façons.length ? rng.pick(façons) : String(n);
}

// --- Juger la grille d'un élève ---------------------------------------------

/**
 * CE QUI NE VA PAS, dans l'ordre où on veut l'apprendre.
 *
 * Comme pour Le Patchwork : ce qui n'est pas colorié d'abord, la longueur
 * ensuite, et la forme du serpent en dernier — c'est la règle la plus fine, et
 * elle mérite qu'on y arrive l'esprit libre.
 *
 * ON NE COMPARE PAS À LA SOLUTION DU FABRICANT : une grille peut se remplir de
 * plusieurs façons, et refuser celle de l'élève parce qu'elle n'est pas la
 * nôtre serait une faute d'énoncé.
 */
export function verifierSerpents(grille, appartenance) {
    const { lignes, colonnes, serpents } = grille;
    const N = lignes * colonnes;
    const problemes = [];
    const dit = (genre, message, cases) => problemes.push({ genre, message, cases });

    const orphelines = [];
    for (let i = 0; i < N; i++) {
        if (appartenance[i] === null || appartenance[i] === undefined) orphelines.push(i);
    }
    if (orphelines.length) {
        dit('oubliees', orphelines.length === 1
            ? 'Il reste une case qu’aucun serpent ne couvre.'
            : `Il reste ${orphelines.length} cases qu’aucun serpent ne couvre.`, orphelines);
    }

    for (const s of serpents) {
        const cases = [];
        for (let i = 0; i < N; i++) if (appartenance[i] === s.tete) cases.push(i);
        if (!cases.length) { dit('vide', `Le serpent de ${s.longueur} n’a aucune case.`, [s.tete]); continue; }
        if (!cases.includes(s.tete)) { dit('sansTete', 'Un serpent ne part pas de son nombre.', cases); continue; }
        if (cases.length !== s.longueur) {
            dit('longueur', `Ce serpent a ${cases.length} case${cases.length > 1 ? 's' : ''}, `
                + `et son nombre dit ${s.longueur}.`, cases);
            continue;
        }
        const v = estUnSerpent(cases, lignes, colonnes);
        if (!v.ok) {
            const pourquoi = {
                coupe: 'il est en deux parties séparées',
                fourche: 'il se divise en deux : un serpent n’a pas de patte',
                boucle: 'il se referme sur lui-même : un serpent a une tête et une queue',
                seule: 'une de ses cases est isolée',
                carre: 'il remplit un carré de quatre cases : un serpent est mince partout'
            }[v.pourquoi] || 'ce n’est pas un serpent';
            dit('forme', `Ce serpent de ${s.longueur} cases ne va pas : ${pourquoi}.`, cases);
            continue;
        }
        // LA TÊTE EST UN BOUT, pas le milieu. C'est ce que dit la règle — « le
        // serpent part de ce nombre » — et cela change la forme des solutions.
        if (!v.bouts.includes(s.tete)) {
            dit('tete', `Ce serpent passe par son nombre au lieu d’en partir : `
                + 'le nombre doit être à un bout.', cases);
        }
    }

    const connus = new Set(serpents.map(s => s.tete));
    const inconnues = [];
    for (let i = 0; i < N; i++) {
        const a = appartenance[i];
        if (a !== null && a !== undefined && !connus.has(a)) inconnues.push(i);
    }
    if (inconnues.length) dit('inconnu', 'Des cases sont données à un serpent qui n’existe pas.', inconnues);

    return { ok: problemes.length === 0, problemes };
}

/** La solution du fabricant — une parmi d'autres, pour le robot et le corrigé. */
export function solutionSerpents(grille) {
    const out = new Array(grille.lignes * grille.colonnes).fill(null);
    grille.serpents.forEach(s => s.cases.forEach(i => { out[i] = s.tete; }));
    return out;
}
