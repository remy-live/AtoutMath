// LE MOT CODÉ — la grille et son alphabet chiffré, sans une ligne de DOM.
//
// Rémy : « fais-moi aussi le jeu (par thématique ou mélange) du jeu que je t'ai
// [montré] avec les lettres et les chiffres ». C'est le mot codé — codeword en
// anglais —, celui qu'il fabrique à la main pour ses fiches de vocabulaire.
//
// LA RÈGLE TIENT EN UNE PHRASE : chaque lettre de la grille est remplacée par
// un numéro, le MÊME numéro partout, et il faut retrouver quelle lettre se
// cache derrière chaque numéro.
//
// D'OÙ LA FORME DE L'ÉTAT : on ne remplit pas des cases, on remplit un
// dictionnaire numéro → lettre. Écrire un E sur la case 14 met un E dans
// TOUTES les cases 14, et c'est exactement ce qui fait la partie. Une saisie
// case par case serait le même jeu privé de son ressort.
//
// DEUX CORRECTIONS DE RÉMY, APRÈS AVOIR VU LA PREMIÈRE VERSION : « C'est pas
// vraiment comme ce que je t'ai envoyé, moi ça tenait sur une grille
// rectangulaire et je partais d'un mot et il fallait compléter. »
//
//   · LA GRILLE EST UN RECTANGLE, pas une croix de mots croisés. On ne
//     construit donc plus la grille la plus croisée dans un carré immense
//     qu'on recadre ensuite ; on se donne un rectangle et l'on cherche à le
//     REMPLIR. C'est `rectangleOptimise`, dans son module à part.
//
//   · ON PART D'UN MOT ENTIER, pas de trois lettres fréquentes éparpillées.
//     La différence est pédagogique autant que visuelle : trois lettres
//     dispersées, c'est un semis d'indices sans sens ; un mot entier, c'est
//     une PHRASE de départ — l'élève lit « BISSECTRICE », comprend de quel
//     chapitre on parle, et repart de ses onze lettres, qui sont déjà posées
//     partout ailleurs dans la grille. On choisit d'ailleurs le mot qui porte
//     le plus de lettres DISTINCTES : c'est lui qui éclaire le plus de cases.

import { rectangleOptimise } from './grilleRectangle.js';
import { THEMES } from './motsCaches.js';

export { THEMES };

/**
 * LES TROIS FORMATS DE RECTANGLE.
 *
 * On règle la grille par sa TAILLE et non par son nombre de mots : dans un
 * rectangle à remplir, le nombre de mots n'est pas une consigne mais un
 * résultat — c'est le rectangle qui décide combien il en faut pour être plein.
 */
export const FORMATS_CODE = {
    petite: { largeur: 9, hauteur: 7 },
    moyenne: { largeur: 11, hauteur: 9 },
    grande: { largeur: 13, hauteur: 11 }
};

export function formatDe(nom) {
    return FORMATS_CODE[nom] || FORMATS_CODE.moyenne;
}

/** Les lettres distinctes d'un mot. */
function distinctes(mot) {
    return new Set(mot.split('')).size;
}

/**
 * LE MOT CODÉ D'UN THÈME.
 *
 * `motsOfferts` est le nombre de mots donnés d'avance, écrits en clair dans la
 * grille. Un seul suffit d'ordinaire : c'est le point d'appui.
 */
export function creerMotCode(options = {}) {
    const {
        theme = 'angles', niveauMax = 3, taille = 'moyenne',
        rng, rngPour, motsOfferts = 1, essais = 14
    } = options;
    const { largeur, hauteur } = formatDe(taille);
    const grille = rectangleOptimise({
        theme, niveauMax, largeur, hauteur, essais,
        rngPour: rngPour || (() => rng)
    });

    // Combien de fois chaque lettre paraît : c'est ce qui décide du code.
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

    // LE MOT DE DÉPART : celui qui porte le plus de lettres distinctes, et de
    // préférence un mot du thème — c'est le mot qu'on veut faire lire, et
    // c'est aussi celui qui allume le plus de cases ailleurs.
    const combien = Math.max(0, Math.min(motsOfferts, grille.mots.length - 1));
    const depart = [...grille.mots]
        .sort((a, b) => (Number(b.duTheme) - Number(a.duTheme))
            || (distinctes(b.mot) - distinctes(a.mot))
            || (a.mot < b.mot ? -1 : 1))
        .slice(0, combien);

    const donnees = [...new Set(depart.flatMap(m => m.mot.split('')))].sort();

    return {
        largeur: grille.largeur, hauteur: grille.hauteur,
        cases: grille.cases,
        mots: grille.mots.map(m => ({
            mot: m.mot, def: m.def, x: m.x, y: m.y, dir: m.dir, duTheme: m.duTheme
        })),
        lettres, code, parNumero,
        // Le mot dont on part, et les lettres qu'il donne.
        depart, donnees,
        remplissage: grille.remplissage,
        // La grille des numéros, prête à afficher : `null` sur une case muette.
        numeros: grille.cases.map(ligne => ligne.map(c => (c === null ? null : code[c])))
    };
}

/** La saisie de départ : les lettres du mot offert, déjà posées sur leur numéro. */
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
    return {
        mots: m.mots.length, lettres, croisements, alphabet: m.lettres.length,
        depart: m.depart.map(d => d.mot)
    };
}
