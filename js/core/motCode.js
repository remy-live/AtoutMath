// LE MOT CODÉ — la grille et son alphabet chiffré, sans une ligne de DOM.
//
// Rémy : « fais-moi aussi le jeu (par thématique ou mélange) du jeu que je t'ai
// [montré] avec les lettres et les chiffres ». C'est le mot codé — codeword en
// anglais —, celui qu'il fabrique à la main pour ses fiches de vocabulaire.
//
// LA RÈGLE TIENT EN UNE PHRASE : chaque lettre de la grille est remplacée par
// un numéro, le MÊME numéro partout, et il faut retrouver quelle lettre se
// cache derrière chaque numéro. Deux ou trois lettres sont données pour
// commencer. Ce n'est pas un mots croisés sans définitions : c'est un autre
// exercice, où l'on ne cherche pas un mot mais un ALPHABET, et où chaque
// lettre trouvée se propage d'un bout à l'autre de la grille.
//
// D'OÙ LA FORME DE L'ÉTAT : on ne remplit pas des cases, on remplit un
// dictionnaire numéro → lettre. Écrire un E sur la case 14 met un E dans
// TOUTES les cases 14, et c'est exactement ce qui fait la partie. Une saisie
// case par case serait le même jeu privé de son ressort.
//
// LA GRILLE, ELLE, EST CELLE DES MOTS CROISÉS — `grilleOptimisee`, celle qui
// se croise le plus. Ici la densité compte encore davantage : c'est par les
// croisements que la lettre trouvée dans un mot va servir dans un autre.

import { grilleOptimisee } from './motsCroises.js';
import { THEMES } from './motsCaches.js';

export { THEMES };

/**
 * LE MOT CODÉ D'UN THÈME.
 *
 * `offertes` est le nombre de lettres données d'avance. On donne les PLUS
 * FRÉQUENTES de la grille, pas des lettres au hasard : une lettre offerte qui
 * n'apparaît qu'une fois ne débloque rien, et l'élève reste devant un mur. Les
 * plus fréquentes sèment la grille entière — c'est le coup de pouce du premier
 * quart d'heure, et c'est ainsi que les grilles de journal sont amorcées.
 */
export function creerMotCode(options = {}) {
    const {
        theme = 'angles', niveauMax = 3, nbMots = 10,
        rng, rngPour, offertes = 3, essais = 10
    } = options;
    const grille = grilleOptimisee({
        theme, niveauMax, nbMots, essais,
        rngPour: rngPour || (() => rng)
    });

    // Combien de fois chaque lettre paraît : c'est ce qui décide des cadeaux.
    const compte = new Map();
    grille.cases.forEach(ligne => ligne.forEach(c => {
        if (c !== null) compte.set(c, (compte.get(c) || 0) + 1);
    }));
    const lettres = [...compte.keys()].sort();

    // LE CODE NE VA QUE JUSQU'AU NOMBRE DE LETTRES PRÉSENTES, pas jusqu'à 26.
    // Une grille de dix mots n'emploie pas tout l'alphabet ; numéroter les
    // vingt-six laisserait dans la clé des cases que rien ne permet de
    // remplir, et un élève qui bute sur une case impossible s'arrête.
    const numeros = rng ? rng.shuffle(lettres.map((_, i) => i + 1))
        : lettres.map((_, i) => i + 1);
    const code = {};
    const parNumero = {};
    lettres.forEach((l, i) => { code[l] = numeros[i]; parNumero[numeros[i]] = l; });

    const donnees = [...compte.entries()]
        .sort((a, b) => (b[1] - a[1]) || (a[0] < b[0] ? -1 : 1))
        .slice(0, Math.max(0, Math.min(offertes, lettres.length - 1)))
        .map(([l]) => l)
        .sort();

    return {
        largeur: grille.largeur, hauteur: grille.hauteur,
        cases: grille.cases,
        mots: grille.mots.map(m => ({ mot: m.mot, def: m.def, x: m.x, y: m.y, dir: m.dir })),
        lettres, code, parNumero, donnees,
        // La grille des numéros, prête à afficher : `null` sur une case muette.
        numeros: grille.cases.map(ligne => ligne.map(c => (c === null ? null : code[c])))
    };
}

/** La saisie de départ : les lettres offertes, déjà posées sur leur numéro. */
export function saisieInitiale(m) {
    const s = {};
    m.donnees.forEach(l => { s[m.code[l]] = l; });
    return s;
}

/**
 * LES NUMÉROS FAUX — jamais les justes.
 *
 * Comme pour les mots croisés : montrer ce qui est bon reviendrait à donner la
 * grille par tâtonnement. Un numéro vide n'est pas faux.
 */
export function numerosFaux(m, saisie) {
    return Object.keys(saisie || {})
        .filter(n => saisie[n] && saisie[n] !== m.parNumero[n])
        .map(Number)
        .sort((a, b) => a - b);
}

/**
 * DEUX NUMÉROS NE PEUVENT PAS PORTER LA MÊME LETTRE. C'est la contrainte qui
 * fait avancer un mot codé — « ce ne peut pas être un E, le E est déjà pris » —
 * et l'élève doit pouvoir la voir sur sa propre grille.
 */
export function lettresEnDouble(saisie) {
    const vus = new Map();
    Object.entries(saisie || {}).forEach(([n, l]) => {
        if (!l) return;
        vus.set(l, (vus.get(l) || []).concat(Number(n)));
    });
    return [...vus.entries()].filter(([, ns]) => ns.length > 1)
        .map(([lettre, numeros]) => ({ lettre, numeros: numeros.sort((a, b) => a - b) }));
}

/** Tout l'alphabet de la grille est-il retrouvé ? */
export function estResoluCode(m, saisie) {
    return m.lettres.every(l => (saisie || {})[m.code[l]] === l);
}

/** Ce qui se mesure sur un mot codé : de quoi annoncer la partie. */
export function qualiteCode(m) {
    let lettres = 0, croisements = 0;
    m.cases.forEach((ligne, y) => ligne.forEach((c, x) => {
        if (c === null) return;
        lettres++;
        const h = (m.cases[y][x - 1] != null) || (m.cases[y][x + 1] != null);
        const v = (m.cases[y - 1] && m.cases[y - 1][x] != null)
            || (m.cases[y + 1] && m.cases[y + 1][x] != null);
        if (h && v) croisements++;
    }));
    return { mots: m.mots.length, lettres, croisements, alphabet: m.lettres.length };
}
