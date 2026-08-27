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
// TROIS ESSAIS, ET LA TROISIÈME EST LA BONNE.
//
//   1. Une croix de mots croisés. Rémy : « moi ça tenait sur une grille
//      rectangulaire et je partais d'un mot ».
//   2. Un rectangle qu'on cherche à remplir de mots croisés. Rémy : « pour le
//      mot caché, ce n'est vraiment pas ça, je te redonne un exercice que j'ai
//      créé » — avec la photo de sa fiche.
//   3. LA PHOTO, DÉCODÉE CASE PAR CASE. C'est un ANNEAU : un cadre de quatre
//      bandes par côté, le centre vide, et des mots qui ne se croisent jamais.
//      Voir `core/anneauMots.js`, qui n'a plus qu'à ranger des mots dans des
//      couloirs — et y arrive donc toujours.
//
// DEUX DÉTAILS DE SA GRILLE QUI N'EN SONT PAS.
//
//   · LA CLÉ COMMENCE PAR UN MOT. Sous sa grille, les cases 1 à 7 portent déjà
//     P, R, O, D, U, I, T. Ce n'est pas un semis d'indices : c'est PRODUIT, le
//     mot du chapitre, et il donne sept lettres d'un coup. On choisit donc un
//     mot du thème dont toutes les lettres sont distinctes et présentes dans
//     la grille, et on lui attribue les numéros 1, 2, 3… dans l'ordre.
//
//   · UNE LETTRE QUI NE PARAÎT QU'UNE FOIS EST ÉCRITE EN CLAIR. Chez lui, un
//     « B » solitaire s'affiche au milieu de NOMBRE, et sa clé compte dix-sept
//     numéros pour dix-huit lettres. C'est juste : un numéro qui n'apparaît
//     qu'une seule fois dans toute la grille ne se déduit de rien — ni du mot
//     qui l'entoure, puisque les mots ne se croisent pas, ni d'ailleurs. Le
//     coder serait poser une devinette sans indice.

import { garnirAnneau } from './anneauMots.js';
import { motsDisponibles, THEMES } from './motsCaches.js';

export { THEMES };

/**
 * LES TROIS FORMATS D'ANNEAU.
 *
 * La profondeur — le nombre de bandes par côté — est ce qui fait la taille
 * réelle : un anneau de profondeur 4 sur 13 × 12 porte seize mots, celui de
 * profondeur 2 sur 9 × 8 en porte huit. La grille de Rémy est la grande.
 */
export const FORMATS_CODE = {
    petite: { largeur: 9, hauteur: 8, profondeur: 2 },
    moyenne: { largeur: 11, hauteur: 10, profondeur: 3 },
    grande: { largeur: 13, hauteur: 12, profondeur: 4 }
};

export function formatDe(nom) {
    return FORMATS_CODE[nom] || FORMATS_CODE.moyenne;
}

/** Les lettres distinctes d'un mot. */
function distinctes(mot) {
    return new Set(mot.split('')).size;
}

/**
 * LE MOT QUI OUVRE LA CLÉ.
 *
 * Il lui faut trois qualités, dans cet ordre : toutes ses lettres distinctes
 * (sans quoi il ne peut pas occuper des numéros consécutifs), toutes présentes
 * dans la grille (un numéro sans case est un numéro qu'on ne peut pas trouver),
 * et de préférence long — c'est le nombre de lettres offertes.
 */
function motDeLaCle(candidats, presentes, rng) {
    const bons = candidats.filter(m =>
        distinctes(m.mot) === m.mot.length
        && m.mot.split('').every(l => presentes.has(l)));
    if (!bons.length) return null;
    const max = Math.max(...bons.map(m => m.mot.length));
    const meilleurs = bons.filter(m => m.mot.length === max);
    return (rng ? rng.pick(meilleurs) : meilleurs[0]).mot;
}

/**
 * LE MOT CODÉ D'UN THÈME.
 *
 * `essais` tirages, et l'on garde l'anneau le mieux rempli : les bandes sont
 * garnies au hasard dans la réserve, si bien qu'un tirage malheureux laisse une
 * bande courte sans mot alors que le suivant la remplit.
 */
export function creerMotCode(options = {}) {
    const {
        theme = 'litteral', niveauMax = 3, taille = 'moyenne',
        rng, rngPour, essais = 12
    } = options;
    const { largeur, hauteur, profondeur } = formatDe(taille);

    // LE LEXIQUE ENTIER, PAS SEULEMENT LE THÈME. Un mot codé n'affiche aucune
    // définition : le joueur ne lit jamais la liste des mots, il les découvre.
    // Se limiter aux vingt mots du thème condamnerait la moitié des bandes à
    // rester muettes. On marque donc ceux du thème — ce sont eux qu'on veut
    // faire lire, et `garnirBande` les sert en premier —, puis le reste du
    // lexique et les nombres écrits en toutes lettres bouchent les bandes
    // courtes, celles de quatre cases où aucun mot de vocabulaire ne rentre.
    const duTheme = motsDisponibles({ theme, niveauMax })
        .map(m => ({ ...m, duTheme: true }));
    const clesTheme = new Set(duTheme.map(m => m.mot));
    const autres = motsDisponibles({ theme: 'tout', niveauMax: 3, bouchons: true })
        .filter(m => !clesTheme.has(m.mot))
        .map(m => ({ ...m, duTheme: false }));
    const reserve = duTheme.concat(autres);

    const tirer = rngPour || ((i) => (i === 0 ? rng : rng));
    let grille = null;
    for (let i = 0; i < Math.max(1, essais); i++) {
        const r = tirer(i);
        const essai = garnirAnneau({ largeur, hauteur, profondeur, mots: reserve, rng: r });
        const score = -essai.trous * 100
            + essai.mots.filter(m => m.duTheme).length * 3
            + essai.mots.length;
        if (!grille || score > grille.score) grille = { ...essai, score };
        if (!essai.trous) break;   // plein : rien de mieux à espérer
    }

    // Combien de fois chaque lettre paraît : c'est ce qui décide du code.
    const compte = new Map();
    grille.cases.forEach(ligne => ligne.forEach(c => {
        if (c !== null) compte.set(c, (compte.get(c) || 0) + 1);
    }));

    // UNE LETTRE SOLITAIRE S'ÉCRIT EN CLAIR. Voir l'en-tête : un numéro qui ne
    // paraît qu'une fois ne se déduit de rien, puisque les mots de l'anneau ne
    // se croisent pas. Le coder serait poser une devinette sans indice.
    const enClair = [...compte.entries()].filter(([, n]) => n === 1).map(([l]) => l).sort();
    const solitaires = new Set(enClair);
    const lettres = [...compte.keys()].filter(l => !solitaires.has(l)).sort();

    // LA CLÉ COMMENCE PAR UN MOT : ses lettres prennent 1, 2, 3… dans l'ordre.
    const presentes = new Set(lettres);
    const mot = motDeLaCle(duTheme.length ? duTheme : autres, presentes, rng)
        || motDeLaCle(autres, presentes, rng);
    const ouverture = mot ? mot.split('') : [];
    const suite = lettres.filter(l => !ouverture.includes(l));
    const ordre = ouverture.concat(rng ? rng.shuffle(suite) : suite);

    const code = {};
    const parNumero = {};
    ordre.forEach((l, i) => { code[l] = i + 1; parNumero[i + 1] = l; });

    return {
        largeur: grille.largeur, hauteur: grille.hauteur,
        cases: grille.cases,
        fleches: grille.fleches,
        mots: grille.mots,
        lettres: ordre,
        code, parNumero,
        // Le mot qui ouvre la clé, et les lettres qu'il donne d'avance.
        motCle: mot || '', donnees: ouverture,
        // Les lettres solitaires, écrites en clair dans la grille.
        enClair,
        trous: grille.trous,
        // La grille des numéros : `null` sur une case muette OU sur une lettre
        // écrite en clair — celle-là porte sa lettre, pas un numéro.
        numeros: grille.cases.map(ligne => ligne.map(
            c => (c === null || solitaires.has(c) ? null : code[c])))
    };
}

/** La saisie de départ : les lettres du mot de la clé, déjà posées. */
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
    let lettres = 0;
    m.cases.forEach(ligne => ligne.forEach(c => { if (c !== null) lettres++; }));
    return {
        mots: m.mots.length, lettres,
        muettes: m.fleches.length,
        alphabet: m.lettres.length,
        enClair: m.enClair.length,
        trous: m.trous,
        cle: m.motCle
    };
}
