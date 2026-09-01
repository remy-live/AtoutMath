// LES BONS CHEMINS — la règle, la grille, et ce qui se démontre.
//
// Rémy est parti d'une fiche : une grille de nombres avec un D dans un coin,
// un A dans l'autre, et six fois la même grille sous six produits différents.
// « Trouve le bon chemin de D à A en multipliant les chiffres le long du
// chemin. »
//
// LA RÈGLE N'EST PAS ÉCRITE SUR LA FICHE, ON L'A RETROUVÉE EN LA VÉRIFIANT.
// La grille de Rémy est
//        D   2   3
//        2   4   5
//       10   2   A
// et ses six cibles sont 8, 30, 40, 320, 240 et 4800. Avec des déplacements en
// croix seulement, cinq cibles sur six sortent — mais 8 est INATTEIGNABLE : les
// deux seules cases voisines de A valent 5 et 2, donc tout chemin finit par un
// 5 ou un 2, et 8 = 2 × 4 demanderait de sauter du 4 à A. En autorisant les
// DIAGONALES, les six sortent, et 8 s'écrit 2 × 4 en passant du 4 à A en
// biais. Les diagonales font donc partie de la règle. On ne repasse pas deux
// fois sur une case, sans quoi 4800 (qui traverse les sept nombres) ne serait
// plus une performance mais un tour de piste.
//
// CE QUE L'EXERCICE TRAVAILLE VRAIMENT, et c'est pour cela qu'il est bon : la
// DÉCOMPOSITION EN FACTEURS. Chercher 240 au hasard est désespérant ; voir que
// 240 = 2⁴ × 3 × 5, donc que le 3 est forcément sur le chemin et que le 7 ne
// peut pas y être, transforme le jeu en raisonnement. Le jeu le dit à l'élève
// dès qu'il s'égare : si le produit déjà fait ne DIVISE pas la cible, aucun
// chemin ne peut plus aboutir — inutile de continuer.

import { makeRng } from './ids.js';

export const CONSIGNE = 'Pars du D, arrive au A, et multiplie les nombres que tu '
    + 'traverses. Tu peux aller sur n\'importe quelle case voisine, y compris EN '
    + 'DIAGONALE, mais jamais deux fois sur la même case. Avant de te lancer au '
    + 'hasard, casse la cible en facteurs : elle te dit quels nombres doivent être '
    + 'sur le chemin, et lesquels ne peuvent pas y être.';

/**
 * LES PALIERS. Ce qui rend la recherche difficile n'est pas la taille de la
 * grille, c'est la LONGUEUR du chemin cherché : deux nombres se voient, cinq
 * demandent de décomposer. On règle donc les paliers sur le nombre de facteurs
 * à traverser, et la grille ne grandit qu'ensuite.
 */
export const PALIERS = {
    facile: {
        label: '3 × 3 — deux ou trois nombres',
        l: 3, h: 3, nombres: [2, 2, 3, 4, 5, 5, 10], longueur: [2, 3], cibleMax: 120
    },
    moyen: {
        label: '3 × 3 — la fiche d\'origine',
        // CIBLE PLAFONNÉE À 600, ET NON 3000. Rémy, banc d'essai : « le premier
        // calcul que tu m'as demandé est 1800, c'est super dur ». Il avait
        // raison : 1800 = 2³ × 3² × 5², cinq facteurs à replacer d'entrée de
        // jeu. Le palier « la fiche d'origine » doit ressembler à la fiche —
        // ses cibles à elle sont 8, 30 et 40 avant de monter.
        l: 3, h: 3, nombres: [2, 2, 2, 3, 4, 5, 6, 10], longueur: [3, 4], cibleMax: 600
    },
    difficile: {
        // Le grand tour : le chemin traverse presque toute la grille, et la
        // cible devient un nombre qu'on ne reconnaît plus — il FAUT le casser.
        label: '3 × 3 — le grand tour',
        l: 3, h: 3, nombres: [2, 2, 3, 3, 4, 5, 6, 7, 10], longueur: [5, 7], cibleMax: 30000
    },
    grand: {
        label: '4 × 4 — la grande grille',
        l: 4, h: 4, nombres: [2, 2, 2, 3, 3, 4, 4, 5, 5, 6, 7, 9, 10], longueur: [4, 7], cibleMax: 30000
    }
};

/** Les huit voisines — les diagonales comprises, c'est la règle du jeu. */
export function voisines(g, [x, y]) {
    const out = [];
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const X = x + dx, Y = y + dy;
            if (X < 0 || Y < 0 || X >= g.l || Y >= g.h) continue;
            out.push([X, Y]);
        }
    }
    return out;
}

export const clef = (x, y) => `${x},${y}`;
export const memeCase = (a, b) => !!a && !!b && a[0] === b[0] && a[1] === b[1];

/** Le nombre d'une case, ou null pour le départ et l'arrivée qui n'en portent pas. */
export function valeur(g, x, y) {
    const v = g.cases[y][x];
    return typeof v === 'number' ? v : null;
}

export const estDepart = (g, c) => memeCase(c, g.depart);
export const estArrivee = (g, c) => memeCase(c, g.arrivee);

/** Le produit des nombres traversés par ce chemin. Le D et le A ne comptent pas. */
export function produit(g, chemin) {
    return chemin.reduce((p, [x, y]) => p * (valeur(g, x, y) || 1), 1);
}

/** La liste des nombres traversés, dans l'ordre — pour l'afficher et l'expliquer. */
export function facteurs(g, chemin) {
    return chemin.map(([x, y]) => valeur(g, x, y)).filter(n => n !== null);
}

export const traceVide = (g) => [[...g.depart]];

// --- Tous les chemins ---------------------------------------------------------

/**
 * TOUS LES CHEMINS SIMPLES DE D À A, et le produit de chacun.
 *
 * On énumère vraiment tout : la grille est minuscule (neuf ou seize cases) et
 * c'est le seul moyen HONNÊTE de garantir qu'une cible est atteignable. Un
 * générateur qui tirerait un chemin puis en donnerait le produit poserait des
 * énigmes justes, mais ne saurait pas dire combien de chemins y répondent —
 * or c'est exactement ce qui fait la difficulté d'une cible.
 *
 * @returns {Map<number, Array>} produit → le chemin le plus COURT qui l'atteint
 */
export function cheminsPossibles(g, plafond = 400000) {
    const out = new Map();
    const vu = new Set([clef(...g.depart)]);
    const route = [[...g.depart]];
    let visites = 0;

    (function marche(ici, p) {
        if (visites++ > plafond) return;
        if (estArrivee(g, ici)) {
            const ancien = out.get(p);
            // Le plus court d'abord : c'est celui qu'on montrera en solution,
            // et celui qui décide de la difficulté annoncée.
            if (!ancien || route.length < ancien.length) out.set(p, route.map(c => [...c]));
            return;
        }
        for (const v of voisines(g, ici)) {
            const k = clef(...v);
            if (vu.has(k)) continue;
            vu.add(k);
            route.push(v);
            marche(v, p * (valeur(g, v[0], v[1]) || 1));
            route.pop();
            vu.delete(k);
        }
    })(g.depart, 1);

    return out;
}

/** Combien de chemins DIFFÉRENTS donnent ce produit ? (une cible unique est plus dure) */
export function compterChemins(g, cible) {
    let n = 0;
    const vu = new Set([clef(...g.depart)]);
    (function marche(ici, p) {
        if (estArrivee(g, ici)) { if (p === cible) n++; return; }
        // Un produit qui ne divise plus la cible ne peut plus y revenir : les
        // nombres de la grille sont tous entiers et supérieurs à zéro.
        if (cible % p !== 0) return;
        for (const v of voisines(g, ici)) {
            const k = clef(...v);
            if (vu.has(k)) continue;
            vu.add(k);
            marche(v, p * (valeur(g, v[0], v[1]) || 1));
            vu.delete(k);
        }
    })(g.depart, 1);
    return n;
}

// --- La génération ------------------------------------------------------------

/**
 * Une grille et sa cible.
 *
 * Le D est en haut à gauche, le A en bas à droite : c'est la disposition de la
 * fiche, et elle n'est pas arbitraire — deux coins opposés obligent à traverser,
 * là où deux coins voisins laisseraient longer un bord.
 *
 * @returns {Object|null} null si le tirage n'a pas abouti (l'appelant retire)
 */
export function genererGrille({ rng = makeRng(1), palier = 'moyen' } = {}) {
    const P = PALIERS[palier] || PALIERS.moyen;
    for (let essai = 0; essai < 40; essai++) {
        const g = tirerGrille(P, rng);
        const tous = cheminsPossibles(g);
        const candidats = [];
        for (const [p, route] of tous) {
            const nb = route.length - 2;          // sans le D ni le A
            if (nb < P.longueur[0] || nb > P.longueur[1]) continue;
            // Une cible qui vaut 1 n'apprend rien. Et on PLAFONNE : un chemin
            // de sept nombres peut dépasser le million, et « trouve 850 500 »
            // n'est plus un exercice de sixième, c'est une intimidation.
            if (p <= 1 || p > P.cibleMax) continue;
            candidats.push({ cible: p, route });
        }
        if (!candidats.length) continue;
        const choix = rng.pick(candidats);
        g.cible = choix.cible;
        g.solution = choix.route;
        g.nbChemins = compterChemins(g, choix.cible);
        g.palier = palier;
        return g;
    }
    return null;
}

function tirerGrille(P, rng) {
    // Le même tirage doit se refaire à l'identique depuis la même graine,
    // sinon la feuille et l'écran divergeraient.
    const pioche = rng.shuffle(P.nombres);
    const cases = [];
    let k = 0;
    for (let y = 0; y < P.h; y++) {
        const ligne = [];
        for (let x = 0; x < P.l; x++) {
            if (x === 0 && y === 0) ligne.push('D');
            else if (x === P.l - 1 && y === P.h - 1) ligne.push('A');
            else ligne.push(pioche[k++ % pioche.length]);
        }
        cases.push(ligne);
    }
    return { l: P.l, h: P.h, cases, depart: [0, 0], arrivee: [P.l - 1, P.h - 1] };
}

// --- Ce que fait le doigt ------------------------------------------------------

/**
 * Peut-on aller là ?
 *
 * Les refus PARLENT. « Ce n'est pas une case voisine » n'apprend rien ; « le A
 * touche le 4 en diagonale, et la diagonale est permise » apprend la règle au
 * moment où l'élève en a besoin.
 */
export function peutAvancer(g, chemin, cible) {
    const ici = chemin[chemin.length - 1];
    if (memeCase(ici, cible)) return { ok: false };
    if (chemin.some(c => memeCase(c, cible))) {
        return { ok: false, raison: 'Tu es déjà passé par cette case — on ne repasse jamais deux fois.' };
    }
    if (!voisines(g, ici).some(v => memeCase(v, cible))) {
        return { ok: false, raison: 'Cette case n\'est pas voisine de la tienne. Les diagonales comptent, mais pas les sauts.' };
    }
    return { ok: true };
}

export function avancer(g, chemin, cible) {
    return chemin.concat([[...cible]]);
}

/** On revient sur une case déjà prise : le chemin se coupe là. */
export function couper(chemin, cible) {
    const i = chemin.findIndex(c => memeCase(c, cible));
    return i <= 0 ? chemin.slice(0, 1) : chemin.slice(0, i + 1);
}

/**
 * Où en est-on ?
 *
 * `mort` est le cœur pédagogique : dès que le produit courant ne divise plus la
 * cible, AUCUN chemin ne peut plus aboutir — on multiplie par des entiers, on
 * ne redescend jamais. Le dire tout de suite évite dix minutes de tâtonnement
 * et enseigne la divisibilité par l'usage.
 */
export function verifier(g, chemin) {
    const p = produit(g, chemin);
    const ici = chemin[chemin.length - 1];
    if (estArrivee(g, ici)) {
        if (p === g.cible) {
            return { gagne: true, produit: p, message: `${facteurs(g, chemin).join(' × ')} = ${g.cible}. C'est le bon chemin.` };
        }
        return {
            gagne: false, produit: p,
            message: `Tu es arrivé, mais ton chemin fait ${facteurs(g, chemin).join(' × ')} = ${p}, `
                + `et il fallait ${g.cible}. Reviens en arrière.`
        };
    }
    if (g.cible % p !== 0) {
        return {
            gagne: false, produit: p, mort: true,
            message: `${p} ne divise pas ${g.cible} : à partir d'ici, plus aucun chemin ne peut tomber juste. `
                + 'Reviens en arrière.'
        };
    }
    return { gagne: false, produit: p, reste: g.cible / p };
}

/**
 * Le pas suivant d'un chemin qui gagne — pour l'aide et pour la démonstration.
 * On repart de la position actuelle : l'aide doit prolonger le chemin de
 * l'élève, pas lui montrer un autre chemin en le contredisant.
 */
export function prochainPas(g, chemin) {
    const vu = new Set(chemin.map(c => clef(...c)));
    const suite = [];
    const trouve = (function marche(ici, p) {
        if (estArrivee(g, ici)) return p === g.cible;
        if (g.cible % p !== 0) return false;
        for (const v of voisines(g, ici)) {
            const k = clef(...v);
            if (vu.has(k)) continue;
            vu.add(k);
            suite.push(v);
            if (marche(v, p * (valeur(g, v[0], v[1]) || 1))) return true;
            suite.pop();
            vu.delete(k);
        }
        return false;
    })(chemin[chemin.length - 1], produit(g, chemin));
    return trouve ? suite[0] : null;
}

/** Le conseil écrit : il donne le raisonnement, jamais la case. */
export function conseil(g, chemin) {
    const p = produit(g, chemin);
    if (g.cible % p !== 0) {
        return `Ton chemin fait déjà ${p}, et ${p} ne divise pas ${g.cible}. Recommence : `
            + `un chemin ne peut que MULTIPLIER, donc il ne rattrape jamais un facteur en trop.`;
    }
    const reste = g.cible / p;
    if (reste === 1) return 'Tu as déjà tout le produit : il ne te reste qu\'à rejoindre le A sans traverser d\'autre nombre.';
    return `Il te reste ${reste} à faire, soit ${decomposer(reste).join(' × ')}. `
        + `Cherche ces nombres-là sur la grille — et tout nombre qui n'est pas dans cette liste `
        + 'ne peut pas être sur ton chemin.';
}

/** La décomposition en facteurs premiers, pour montrer ce qu'il reste à trouver. */
export function decomposer(n) {
    const out = [];
    let r = Math.round(n);
    for (let d = 2; d * d <= r; d++) {
        while (r % d === 0) { out.push(d); r /= d; }
    }
    if (r > 1) out.push(r);
    return out.length ? out : [n];
}
