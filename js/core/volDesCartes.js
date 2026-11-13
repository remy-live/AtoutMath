// LE VOL DES CARTES — ce qui se calcule sans écran.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 13 novembre : « tu peux pas mettre un slide de vitesse, là ça bouge
// mais vraiment peu, j'adorerais que ça se déplace partout dans l'écran quitte
// à ce que le trait qui relie soit pas forcément sur le bord droit ».
//
// Le vol lui-même vit dans `games/apparier.js` : il a besoin de la mise en
// page, et il ne se mesure qu'en regardant bouger les cartes
// (`tools/lesCartesVolent.mjs`). Mais DEUX CHOSES se calculent à froid, et ce
// sont justement les deux où l'on se trompe sans le voir :
//
//   · L'ÉCHELLE DE VITESSE, et surtout la traduction des anciens réglages. Une
//     séance préparée hier porte « lent », « normal » ou « rapide » ; elle ne
//     doit ni tomber ni repartir au hasard.
//   · LE POINT PAR OÙ LE TRAIT SORT D'UNE CARTE. C'est de la géométrie, cela se
//     vérifie exactement, et une erreur d'un signe fait sortir le trait par le
//     côté opposé — c'est-à-dire qu'il traverse sa propre carte pour aller
//     rejoindre l'autre.
//
// Les deux sont ici pour être éprouvées sans navigateur.

export const VITESSE_MIN = 1;
export const VITESSE_MAX = 10;
export const VITESSE_DEFAUT = 4;

/**
 * LES ANCIENS RÉGLAGES, PLACÉS SUR L'ÉCHELLE.
 *
 * Le réglage était un menu à trois choix avant le 13 novembre. On ne les
 * oublie pas : une séance qui portait « rapide » doit rester rapide.
 */
export const ANCIENNES_VITESSES = { lent: 2, normal: 4, rapide: 7 };

/**
 * PIXELS PAR SECONDE AU CRAN `n`.
 *
 * LE PLANCHER EST À 35, ET IL A ÉTÉ RELEVÉ APRÈS MESURE. À 20 px/s, une carte
 * ne parcourait que 120 pixels en six secondes : elle avait l'air immobile
 * pendant tout le temps qu'on la regarde. Or « là ça bouge mais vraiment peu »
 * est la remarque de départ — un cran le plus bas qui la mérite encore ne vaut
 * rien. À 35, elle parcourt 210 pixels : on la voit partir.
 *
 * LE PLAFOND EST À 206 : la carte traverse un tableau de mille pixels en cinq
 * secondes, et le jeu devient franchement un jeu d'adresse. C'est ce que Rémy
 * demande, et c'est ce que le réglage permet de ne pas imposer à toute la
 * classe.
 */
export const allureDuVol = (n) => 35 + (niveauDeVitesse(n) - 1) * 19;

/**
 * Le cran demandé, QUELLE QUE SOIT LA FAÇON DONT IL A ÉTÉ ENREGISTRÉ.
 *
 * @param {number|string} brut la valeur du réglage, ancienne ou nouvelle
 * @returns {number} un entier de 1 à 10
 */
export function niveauDeVitesse(brut) {
    if (typeof brut === 'string' && ANCIENNES_VITESSES[brut]) return ANCIENNES_VITESSES[brut];
    // UNE ABSENCE N'EST PAS UN ZÉRO, et c'est l'épreuve qui l'a dit.
    //
    // `Number(null)` vaut 0, comme `Number('')` et `Number([])`. Passés
    // directement au rabattage, ces trois-là devenaient le cran le PLUS LENT —
    // c'est-à-dire qu'un réglage manquant, le cas le plus fréquent de tous,
    // donnait des cartes qui rampent au lieu du défaut choisi. Un zéro écrit
    // exprès, lui, reste un débordement et se rabat sur le minimum.
    if (typeof brut !== 'number' && typeof brut !== 'string') return VITESSE_DEFAUT;
    if (typeof brut === 'string' && !brut.trim()) return VITESSE_DEFAUT;
    const n = Math.round(Number(brut));
    if (!Number.isFinite(n)) return VITESSE_DEFAUT;
    return Math.max(VITESSE_MIN, Math.min(VITESSE_MAX, n));
}

/**
 * LE POINT PAR OÙ UN TRAIT SORT D'UNE CARTE, EN ALLANT VERS UN AUTRE POINT.
 *
 * RÉMY : « quitte à ce que le trait qui relie soit pas forcément sur le bord
 * droit ». C'était la phrase qui débloquait tout.
 *
 * AVANT, LE CÔTÉ ÉTAIT ÉCRIT D'AVANCE : une carte de gauche sortait par sa
 * droite, une carte de droite par sa gauche. Tant que les deux colonnes se
 * faisaient face, c'était juste. Dès que les cartes volent, une carte de gauche
 * peut passer au-dessus, en dessous ou à droite de sa partenaire — et le trait
 * sortait alors du mauvais côté.
 *
 * ON CHERCHE L'INTERSECTION du segment centre→cible avec le rectangle. Quand
 * les deux cartes sont côte à côte, cela rend exactement le bord droit de celle
 * de gauche : l'ancien comportement est le cas particulier du nouveau, et il
 * n'y a pas deux chemins à tenir.
 *
 * LE FACTEUR EST PLAFONNÉ À 1 : si la cible est DANS la carte — deux cartes qui
 * se chevauchent, un doigt posé dessus —, le point rendu est la cible
 * elle-même, pas un point projeté hors du rectangle dans la direction opposée.
 *
 * @param {{x:number,y:number,demiL:number,demiH:number}} c la carte
 * @param {{x:number,y:number}} vers le point visé
 */
export function sortieDuRectangle(c, vers) {
    const dx = vers.x - c.x, dy = vers.y - c.y;
    if (!dx && !dy) return { x: c.x, y: c.y };
    const tx = dx ? c.demiL / Math.abs(dx) : Infinity;
    const ty = dy ? c.demiH / Math.abs(dy) : Infinity;
    const t = Math.min(tx, ty, 1);
    return { x: c.x + dx * t, y: c.y + dy * t };
}
