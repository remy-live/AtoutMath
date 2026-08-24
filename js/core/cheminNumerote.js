// LE CHEMIN NUMÉROTÉ — un seul trait qui passe partout, dans l'ordre.
//
// Le jeu que Rémy a envoyé en capture d'écran (« Zip Master : Number Path
// Puzzle »). La règle tient en une phrase, et c'est ce qui en fait un bon
// exercice : UN SEUL CHEMIN, qui part du 1, passe par 2, 3, 4… dans l'ordre,
// et ne laisse AUCUNE case derrière lui.
//
// CE QU'ON Y TRAVAILLE, ET QUI N'EST PAS RIEN. Ce n'est pas du calcul : c'est
// du raisonnement de place — anticiper, revenir, comprendre qu'une case de
// coin n'a que deux voisines et que le chemin y est donc presque toujours
// forcé. C'est la même famille que « relier les points », et le noyau le dit
// franchement : il lui emprunte son chemin hamiltonien.
//
// UNE GRILLE PROPOSÉE EST UNE GRILLE RÉSOLUBLE, comme pour « relier les
// points » et pour la même raison : on trace d'abord un chemin qui passe une
// fois par chaque case, PUIS on numérote quelques-unes de ses étapes. La
// solution existe donc avant l'énoncé.
//
// ET ELLE EST CONTRAINTE, ce qui n'est pas la même chose qu'unique. Deux
// repères suffiraient à la rendre résoluble, mais pas INTÉRESSANTE : avec un
// départ et une arrivée seulement, on trouve un chemin par tâtonnement sans
// jamais rien déduire. On ajoute donc des repères tant que les solutions sont
// nombreuses — c'est le compteur ci-dessous qui tranche, et il compte
// VRAIMENT, en explorant. Mais on s'arrête AVANT l'unicité : elle demanderait
// une case sur deux numérotée, et il ne resterait plus rien à chercher.

import { cheminHamiltonien, clef, adjacentes, memeCase, dedans } from './relier.js';

export const CONSIGNE = 'Trace UN SEUL chemin qui part du 1, passe par les nombres dans '
    + 'l\'ordre, et remplit toutes les cases. Pas de diagonale, et on ne repasse jamais '
    + 'deux fois au même endroit.';

/** Les tailles proposées, du coup d'œil à la vraie réflexion. */
export const TAILLES = {
    petit: { l: 4, h: 4, reperes: 3 },
    moyen: { l: 5, h: 5, reperes: 5 },
    grand: { l: 6, h: 6, reperes: 7 },
    geant: { l: 7, h: 7, reperes: 9 }
};

// --- Compter les solutions ----------------------------------------------------

function voisinsPrecalcules(l, h) {
    const table = [];
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < l; x++) {
            const v = [];
            if (x > 0) v.push(y * l + x - 1);
            if (x < l - 1) v.push(y * l + x + 1);
            if (y > 0) v.push((y - 1) * l + x);
            if (y < h - 1) v.push((y + 1) * l + x);
            table.push(v);
        }
    }
    return table;
}

/**
 * Combien de chemins respectent les repères ? On s'arrête à `max` : savoir
 * qu'il y en a « au moins deux » suffit à refuser une grille.
 *
 * L'exploration est bornée en nombre de nœuds. Au-delà, on répond `max` —
 * c'est-à-dire « pas unique » : le générateur gardera un repère de plus, ce
 * qui est le mauvais côté prudent. Une grille trop longue à démontrer unique
 * ne sera jamais proposée comme telle.
 */
export function compterSolutions(l, h, reperes, max = 2, limite = 120000) {
    return chercherSolutions(l, h, reperes, max, limite).nombre;
}

/**
 * Les chemins eux-mêmes, jusqu'à `max`. Le générateur en a besoin : pour
 * casser une ambiguïté, il faut savoir OÙ elle est — c'est-à-dire à quelle
 * case l'autre chemin s'écarte du nôtre.
 *
 * @returns {{nombre:number, chemins:Array, abandon:boolean}}
 */
export function chercherSolutions(l, h, reperes, max = 2, limite = 120000) {
    const total = l * h;
    const tries = [...reperes].sort((a, b) => a.n - b.n);
    if (!tries.length) return { nombre: 0, chemins: [], abandon: false };
    const idx = (r) => r.y * l + r.x;
    const numero = new Map();
    tries.forEach((r, i) => numero.set(idx(r), i));
    const arrivee = idx(tries[tries.length - 1]);

    const voisins = voisinsPrecalcules(l, h);
    const vus = new Uint8Array(total);
    const pile = new Int32Array(total);
    const chemins = [];
    let solutions = 0, noeuds = 0, abandon = false;

    /** Toutes les cases restantes sont-elles encore atteignables d'ici ? */
    function connecte(depuis, restants) {
        if (restants === 0) return true;
        const file = [depuis];
        const marque = new Uint8Array(total);
        marque[depuis] = 1;
        let compte = 0;
        while (file.length) {
            const c = file.pop();
            for (const v of voisins[c]) {
                if (vus[v] || marque[v]) continue;
                marque[v] = 1; compte++;
                file.push(v);
            }
        }
        return compte === restants;
    }

    function dfs(pos, profondeur, attendu) {
        if (solutions >= max || abandon) return;
        if (++noeuds > limite) { abandon = true; return; }

        if (profondeur === total) {
            if (pos === arrivee && attendu === tries.length) {
                solutions++;
                chemins.push(Array.from(pile).map(i => [i % l, Math.floor(i / l)]));
            }
            return;
        }
        // Le prochain repère doit encore être devant nous : s'il est déjà
        // consommé et qu'il en reste, la branche est morte.
        if (attendu >= tries.length) return;
        if (!connecte(pos, total - profondeur)) return;

        for (const v of voisins[pos]) {
            if (vus[v]) continue;
            const n = numero.has(v) ? numero.get(v) : -1;
            // On ne pose pas le pied sur un repère qui n'est pas le prochain.
            if (n >= 0 && n !== attendu) continue;
            vus[v] = 1;
            pile[profondeur] = v;
            dfs(v, profondeur + 1, n >= 0 ? attendu + 1 : attendu);
            vus[v] = 0;
            if (solutions >= max || abandon) return;
        }
    }

    const depart = idx(tries[0]);
    vus[depart] = 1;
    pile[0] = depart;
    dfs(depart, 1, 1);
    // ABANDON = « au moins max » : on n'a pas fini d'explorer, donc on ne peut
    // pas jurer de l'unicité. C'est le mauvais côté prudent, celui qui fait
    // garder un repère de trop plutôt que de promettre une grille unique qui
    // ne l'est pas.
    return { nombre: abandon ? max : solutions, chemins, abandon };
}

// --- Fabriquer une grille -----------------------------------------------------

/** k positions réparties le long d'un chemin de n cases, bouts compris. */
function repartir(n, k) {
    const nb = Math.max(2, Math.min(k, n));
    const pas = (n - 1) / (nb - 1);
    const positions = [];
    for (let i = 0; i < nb; i++) positions.push(Math.round(i * pas));
    return [...new Set(positions)].sort((a, b) => a - b);
}

/** Un repère de plus, posé au milieu du plus grand intervalle libre. */
function densifier(positions) {
    let trou = -1, taille = 1;
    for (let i = 1; i < positions.length; i++) {
        const d = positions[i] - positions[i - 1];
        if (d > taille) { taille = d; trou = i; }
    }
    if (trou < 0) return positions;
    const milieu = Math.floor((positions[trou - 1] + positions[trou]) / 2);
    if (milieu === positions[trou - 1] || milieu === positions[trou]) return positions;
    return [...positions.slice(0, trou), milieu, ...positions.slice(trou)];
}

/**
 * COMBIEN DE NOMBRES ? C'EST LA VRAIE QUESTION DU GÉNÉRATEUR.
 *
 * Trop peu, et la grille a des milliers de chemins : on en trouve un par
 * tâtonnement, sans jamais rien déduire. Trop, et il ne reste plus rien à
 * chercher — on relie les nombres et c'est fini.
 *
 * L'unicité, elle, coûte cher : mesuré, il faut vingt-quatre repères pour
 * qu'une grille de sept sur sept n'ait qu'une seule solution, soit une case
 * sur deux numérotée. Ce n'est plus un puzzle, c'est un pointillé. On vise
 * donc PEU DE SOLUTIONS plutôt qu'une seule : sous le seuil, la grille se
 * déduit pour l'essentiel, et le nombre de repères reste raisonnable. Et le
 * plafond a le dernier mot — mieux vaut une grille à huit solutions qu'une
 * grille couverte de chiffres.
 *
 * @param {Object} cfg
 * @param {number} cfg.l - largeur
 * @param {number} cfg.h - hauteur
 * @param {number} cfg.reperes - combien de nombres au départ
 * @param {Object} cfg.rng
 * @param {number} [cfg.seuil] - au-dessus de tant de solutions, on ajoute un repère
 * @param {number} [cfg.maxReperes] - le plafond, quoi qu'il arrive
 * @returns {{l:number,h:number,reperes:Array,solution:Array,solutions:number,unique:boolean}}
 */
export function genererParcours({ l = 5, h = 5, reperes = 4, rng, seuil = 6, maxReperes = 0 }) {
    const chemin = cheminHamiltonien(l, h, rng, 400);
    if (!chemin || chemin.length !== l * h) return null;

    const plafond = Math.min(maxReperes || (reperes + 3), chemin.length);
    const faire = (pos) => pos.map((p, i) => ({ n: i + 1, x: chemin[p][0], y: chemin[p][1] }));
    let positions = repartir(chemin.length, reperes);
    let compte = compterSolutions(l, h, faire(positions), seuil + 1);

    while (compte > seuil && positions.length < plafond) {
        const suivant = densifier(positions);
        if (suivant.length === positions.length) break;
        positions = suivant;
        compte = compterSolutions(l, h, faire(positions), seuil + 1);
    }

    return {
        l, h,
        reperes: faire(positions),
        solution: chemin.map(c => [c[0], c[1]]),
        // Plafonné : « au moins tant ». On ne compte pas au-delà, cela ne
        // servirait qu'à ralentir le tirage.
        solutions: compte,
        unique: compte === 1
    };
}

// --- Le tracé de l'élève --------------------------------------------------------

export const traceVide = () => [];

export const repereEn = (grille, x, y) => grille.reperes.find(r => r.x === x && r.y === y) || null;

/**
 * Peut-on avancer sur cette case ? La règle est complète ici, et nulle part
 * ailleurs : l'écran ne fait que l'appliquer.
 *
 * @returns {{ok:boolean, raison?:string, recule?:boolean}}
 */
export function peutAvancer(grille, cases, cible) {
    if (!dedans(cible, grille.l, grille.h)) return { ok: false, raison: 'hors de la grille' };
    if (!cases.length) {
        const r = repereEn(grille, cible[0], cible[1]);
        return r && r.n === 1
            ? { ok: true }
            : { ok: false, raison: 'Le chemin commence sur le 1.' };
    }
    const dernier = cases[cases.length - 1];
    if (memeCase(cible, dernier)) return { ok: false };
    // Revenir sur ses pas EFFACE : c'est la gomme naturelle du tracé.
    if (cases.length > 1 && memeCase(cible, cases[cases.length - 2])) return { ok: true, recule: true };
    if (!adjacentes(cible, dernier)) return { ok: false, raison: 'On avance case par case, sans diagonale.' };
    if (cases.some(c => memeCase(c, cible))) {
        return { ok: false, raison: 'On ne repasse pas deux fois au même endroit.' };
    }
    const r = repereEn(grille, cible[0], cible[1]);
    if (r) {
        const dejaVus = cases.filter(c => repereEn(grille, c[0], c[1])).length;
        if (r.n !== dejaVus + 1) {
            return { ok: false, raison: `Il faut passer par le ${dejaVus + 1} avant le ${r.n}.` };
        }
    }
    return { ok: true };
}

/** Le tracé après un pas — ou le même tracé si le pas est refusé. */
export function avancer(grille, cases, cible) {
    const v = peutAvancer(grille, cases, cible);
    if (!v.ok) return cases;
    if (v.recule) return cases.slice(0, -1);
    return [...cases, [cible[0], cible[1]]];
}

/** On touche le milieu de son propre chemin : on le raccourcit jusque-là. */
export function couperEn(cases, cible) {
    const i = cases.findIndex(c => memeCase(c, cible));
    return i < 0 ? cases : cases.slice(0, i + 1);
}

/**
 * Le bilan, dans les mots de l'élève.
 * @returns {{gagne:boolean, vides:Array, reperesFaits:number, message:string}}
 */
export function verifier(grille, cases) {
    const total = grille.l * grille.h;
    const occupees = new Set(cases.map(c => clef(c[0], c[1])));
    const vides = [];
    for (let y = 0; y < grille.h; y++) {
        for (let x = 0; x < grille.l; x++) {
            if (!occupees.has(clef(x, y))) vides.push([x, y]);
        }
    }
    const reperesFaits = cases.filter(c => repereEn(grille, c[0], c[1])).length;
    const tousLesReperes = reperesFaits === grille.reperes.length;

    if (cases.length === total && tousLesReperes && !vides.length) {
        return { gagne: true, vides, reperesFaits, message: 'Toutes les cases, et les nombres dans l\'ordre.' };
    }
    let message;
    if (!tousLesReperes) {
        const manque = grille.reperes.length - reperesFaits;
        message = `Le chemin n'a pas encore atteint ${manque > 1 ? `les ${manque} derniers nombres` : 'le dernier nombre'}.`;
    } else {
        message = `${vides.length} case${vides.length > 1 ? 's' : ''} `
            + `${vides.length > 1 ? 'restent' : 'reste'} en dehors du chemin — `
            + 'elles sont en rouge. Il faut passer PARTOUT.';
    }
    return { gagne: false, vides, reperesFaits, message };
}

/**
 * La case suivante, d'après la solution enregistrée — pour l'aide et pour le
 * robot. Si l'élève s'est écarté de ce chemin-là, on lui dit d'où reprendre :
 * son chemin est peut-être valide aussi, mais on ne sait conseiller que
 * celui-ci.
 */
export function prochainPas(grille, cases) {
    const sol = grille.solution;
    if (!cases.length) return { case: sol[0], depart: true };
    let i = 0;
    while (i < cases.length && i < sol.length && memeCase(cases[i], sol[i])) i++;
    if (i < cases.length) return { case: sol[i - 1] || sol[0], ecart: true };
    if (i >= sol.length) return null;
    return { case: sol[i] };
}

export function conseil(grille, cases) {
    const pas = prochainPas(grille, cases);
    if (!pas) return 'Le chemin est complet : vérifie qu\'aucune case ne reste vide.';
    if (pas.depart) return 'Pose le doigt sur le 1 : c\'est de là que tout part.';
    if (pas.ecart) {
        return 'Ton chemin s\'écarte de celui que je connais. Il n\'est pas forcément faux — '
            + 'mais si tu bloques, reviens en arrière jusqu\'à la case '
            + `(${pas.case[0] + 1} ; ${pas.case[1] + 1}) et repars de là.`;
    }
    return `Depuis le bout de ton chemin, la case suivante est celle de la colonne `
        + `${pas.case[0] + 1}, ligne ${pas.case[1] + 1}. Regarde les COINS : un coin n'a que `
        + 'deux voisines, donc le chemin y est presque toujours forcé.';
}

/** La solution entière — l'outil d'auteur, et la fin de la démonstration. */
export const solutionComplete = (grille) => grille.solution.map(c => [c[0], c[1]]);
