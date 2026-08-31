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
//   · TOUTES LES LETTRES SONT CODÉES, LES SOLITAIRES COMPRISES. Rémy :
//     « Même les lettres toutes seules tu peux les mettre dans la grille. »
//
//     La première version les écrivait en clair — un « B » solitaire lisible
//     au milieu de NOMBRE —, au motif qu'un numéro vu une seule fois ne se
//     déduirait de rien, puisque les mots de l'anneau ne se croisent pas.
//     C'était faux, et c'est Rémy qui avait raison : il se déduit du MOT.
//     NOM?RE n'a qu'une lettre possible, et la trouver est exactement le
//     plaisir du mot codé. Les écrire en clair revenait à donner la réponse —
//     ce qu'il reprochait déjà : « de base pour le mot codé, tu donnes
//     presque toute la solution ».

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
 * COMBIEN DE LETTRES ON OFFRE — et « le plus possible » était une erreur.
 *
 * Rémy, capture à l'appui : « de base pour le mot codé, tu donnes presque
 * toute la solution ». C'était mesurable, et mesuré : sur la grille moyenne,
 * réglages par défaut, 52 % de la clé était donnée d'avance et SOIXANTE-QUATRE
 * POUR CENT DES CASES étaient déjà remplies avant le premier coup.
 *
 * La faute au mot de la clé, qui prenait le mot le PLUS LONG qu'il pouvait
 * trouver — ÉQUATION, huit lettres sur quatorze numéros. Et comme ce sont les
 * lettres les plus fréquentes du français qui composent les mots les plus longs
 * (E, A, I, O, U, N, T), les huit numéros offerts remplissaient les deux tiers
 * de la grille. On croyait donner une amorce ; on donnait la réponse.
 *
 * LA BONNE MESURE EST UNE PROPORTION, PAS UNE LONGUEUR. Ce qui compte n'est pas
 * qu'un mot fasse huit lettres, c'est la part de l'alphabet codé qu'il découvre
 * — et cette part doit rester une AMORCE. Un tiers laisse de quoi démarrer sans
 * rien résoudre ; c'est aussi, à peu de chose près, la proportion de la grille
 * de Rémy (sept lettres pour dix-sept numéros, soit 41 %).
 */
export const PART_OFFERTE = { large: 0.45, normale: 0.3, mince: 0.18 };
export const partOfferteDe = (nom) => PART_OFFERTE[nom] ?? PART_OFFERTE.normale;

/**
 * ON COMPTE EN CASES, PAS EN LETTRES — et c'est le test qui l'a imposé.
 *
 * Première tentative : borner le NOMBRE de lettres du mot de la clé. Elle a
 * beaucoup amélioré les choses et laissé passer un cas, que la mesure a
 * attrapé — LITRE, cinq lettres seulement sur seize numéros, remplissait
 * cinquante-sept pour cent de la grille. Évidemment : L, I, T, R, E sont cinq
 * des lettres les plus fréquentes du français, et une grille est faite de mots
 * français.
 *
 * Ce qui gêne Rémy n'est pas le nombre de numéros donnés, c'est le nombre de
 * CASES déjà écrites — c'est cela qu'on voit en ouvrant la fiche. On borne donc
 * cela, directement, et le choix s'en trouve meilleur des deux côtés : à budget
 * de cases égal, le mot fait de lettres RARES donne plus de numéros. On obtient
 * une amorce plus généreuse ET une grille plus vide.
 */
export const budgetCases = (total, part) => Math.max(1, Math.round(total * part));

/** Combien de lettres la clé a le droit d'offrir sur `n` numéros. */
export const budgetOuverture = (n, part) => Math.max(3, Math.floor(n * part));

/**
 * LE MOT QUI OUVRE LA CLÉ.
 *
 * Il lui faut trois qualités, dans cet ordre : toutes ses lettres distinctes
 * (sans quoi il ne peut pas occuper des numéros consécutifs), toutes présentes
 * dans la grille (un numéro sans case est un numéro qu'on ne peut pas trouver),
 * et LE PLUS LONG QUI TIENNE DANS LE BUDGET — pas le plus long tout court.
 *
 * `strict` dit ce qu'on fait quand aucun mot du budget ne se présente : rendre
 * la main (pour aller chercher ailleurs) ou prendre le plus court qu'on ait.
 * C'est ce va-et-vient qui a fait la différence — la première version tentait
 * le thème puis le lexique entier, mais le repli du THÈME rendait déjà un mot,
 * si bien que le lexique n'était jamais consulté et que le budget ne mordait
 * sur rien. On cherche donc DANS LE BUDGET partout d'abord, et l'on n'élargit
 * qu'ensuite.
 */
function motDeLaCle(candidats, presentes, rng, mesure, strict = false) {
    const { compte, budget } = mesure;
    const cases = (mot) => mot.split('').reduce((t, l) => t + (compte.get(l) || 0), 0);
    const bons = candidats.filter(m =>
        distinctes(m.mot) === m.mot.length
        && m.mot.split('').every(l => presentes.has(l)));
    if (!bons.length) return null;
    const tenables = bons.filter(m => cases(m.mot) <= budget);
    if (!tenables.length) {
        if (strict) return null;
        // Le moins pire : celui qui découvre le moins de cases.
        const mini = Math.min(...bons.map(m => cases(m.mot)));
        const petits = bons.filter(m => cases(m.mot) === mini);
        return (rng ? rng.pick(petits) : petits[0]).mot;
    }
    // Dans le budget, on prend celui qui donne le PLUS DE NUMÉROS : c'est un
    // vrai mot du chapitre qu'on veut faire lire, et à cases égales, plus de
    // numéros placés vaut mieux.
    const vise = Math.max(...tenables.map(m => m.mot.length));
    const meilleurs = tenables.filter(m => m.mot.length === vise);
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
        aide = 'normale',
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

    // TOUTE LETTRE DE LA GRILLE PORTE UN NUMÉRO, même celle qu'on n'y voit
    // qu'une fois — voir l'en-tête : elle se déduit du mot qui l'entoure.
    const lettres = [...compte.keys()].sort();

    // LA CLÉ COMMENCE PAR UN MOT : ses lettres prennent 1, 2, 3… dans l'ordre.
    const presentes = new Set(lettres);
    // Le budget se compte en CASES : c'est le nombre de cases déjà remplies qui
    // dit si la grille est donnée, pas le nombre de numéros offerts.
    const casesCodees = lettres.reduce((t, l) => t + compte.get(l), 0);
    const mesure = { compte, budget: budgetCases(casesCodees, partOfferteDe(aide)) };
    // Le thème d'abord — c'est son mot qu'on veut faire lire —, puis le lexique
    // entier, et seulement si personne ne tient dans le budget on l'élargit.
    //
    // LE DERNIER REPLI REGARDE TOUT LE MONDE À LA FOIS. Il consultait le thème
    // seul avant le lexique, et sur les grilles pauvres en lettres distinctes
    // il ne reste parfois qu'UN mot du thème éligible : c'était
    // alors lui, quel que soit son coût. D'où des ÉQUATION à soixante-neuf pour
    // cent de cases remplies sur le réglage le plus AVARE — l'inverse de ce
    // qu'on demandait. Quand on cherche le moins cher, on cherche partout.
    const mot = motDeLaCle(duTheme, presentes, rng, mesure, true)
        || motDeLaCle(autres, presentes, rng, mesure, true)
        || motDeLaCle(duTheme.concat(autres), presentes, rng, mesure, false);
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
        trous: grille.trous,
        // La grille des numéros : `null` sur une case muette, et seulement là.
        numeros: grille.cases.map(ligne => ligne.map(c => (c === null ? null : code[c])))
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
        trous: m.trous,
        cle: m.motCle
    };
}
