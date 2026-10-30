// DE VRAIES ALLUMETTES — la géométrie d'un chiffre à sept bâtons.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 27 octobre, capture à l'appui : « fais des vraies allumettre et les
// horizontals en haut et en bas sont un peu décales ».
//
// ── IL A RAISON, ET LA CAUSE EST PLUS PROFONDE QUE LES MARGES ───────────────
//
// Les bâtons étaient dessinés en POURCENTAGES DE LEUR ZONE : les horizontaux
// occupaient de 12 % à 88 % de la largeur de la case, les verticaux
// débordaient de 34 % en haut et en bas de la leur. Deux familles, deux
// repères, donc des coins qui ne se ferment pas — le trait du haut finissait
// dix pixels avant le montant de droite et commençait six pixels après celui
// de gauche. Aucun réglage de marge n'y pouvait rien.
//
// LA VRAIE CAUSE EST LE FORMAT DE LA CASE. Un chiffre à sept segments fait
// d'allumettes TOUTES DE LA MÊME LONGUEUR est exactement deux fois plus haut
// que large : un bâton horizontal mesure la largeur, un bâton vertical mesure
// la demi-hauteur, et les deux ne sont égaux que si hauteur = 2 × largeur. La
// case était en 1 / 2,5. Les horizontaux étaient donc forcément plus courts,
// et c'est ce qui donnait, sans qu'on sache le nommer, l'impression que « ça
// ne tombe pas juste ».
//
// ── LA CASE EST LA BOÎTE DES CENTRES ────────────────────────────────────────
//
// Les bâtons sont CENTRÉS sur les bords de la case : ils en dépassent d'une
// demi-épaisseur. C'est ce qui rend les sept longueurs rigoureusement égales,
// et c'est pour cela que la vue du SVG est plus grande que la case.
//
// Ce fichier ne dessine rien et ne connaît ni le DOM ni le catalogue : il rend
// des rectangles. L'écran et la fiche imprimée lisent les mêmes.

/** La case, en unités : cent de large, deux cents de haut. */
export const L = 100;
/** L'épaisseur d'une allumette, le jeu laissé aux coins, la longueur de la tête. */
export const T = 13, JEU = 9, TETE = 22;
/** La longueur commune des sept allumettes. */
export const LONG = L - 2 * JEU;

/**
 * LES SEPT EMPLACEMENTS, dans la numérotation du générateur.
 *
 * `tete` dit à quel bout se trouve la tête : 0 au début (gauche ou haut), 1 à
 * la fin. ELLE N'EST PAS TOUJOURS DU MÊME CÔTÉ, et c'est volontaire — sept
 * allumettes dont les têtes pointent toutes dans le même sens font un dessin
 * de machine, pas une poignée de bâtons posés sur une table.
 */
export const EMPLACEMENTS = [
    { i: 0, sens: 'h', x: JEU, y: 0, tete: 0 },          // haut
    { i: 1, sens: 'v', x: L, y: JEU, tete: 1 },          // haut-droite
    { i: 2, sens: 'v', x: L, y: L + JEU, tete: 0 },      // bas-droite
    { i: 3, sens: 'h', x: JEU, y: 2 * L, tete: 0 },      // bas
    { i: 4, sens: 'v', x: 0, y: L + JEU, tete: 1 },      // bas-gauche
    { i: 5, sens: 'v', x: 0, y: JEU, tete: 0 },          // haut-gauche
    { i: 6, sens: 'h', x: JEU, y: L, tete: 1 }           // milieu
];

/**
 * LE RECTANGLE D'UNE ALLUMETTE, et celui de sa tête.
 *
 * `x` et `y` d'un emplacement sont le DÉBUT du bâton sur son axe et le CENTRE
 * sur l'autre : un horizontal commence en (x, y) et court vers la droite, un
 * vertical commence en (x, y) et descend.
 */
export function baton(e) {
    const corps = e.sens === 'h'
        ? { x: e.x, y: e.y - T / 2, w: LONG, h: T }
        : { x: e.x - T / 2, y: e.y, w: T, h: LONG };
    const tete = e.sens === 'h'
        ? { x: e.tete ? e.x + LONG - TETE : e.x, y: corps.y, w: TETE, h: T }
        : { x: corps.x, y: e.tete ? e.y + LONG - TETE : e.y, w: T, h: TETE };
    return { corps, tete };
}

/**
 * LES ALLUMETTES D'UN SIGNE, et le masque qui dit lesquelles sont posées.
 *
 * Le « + » est fait de deux bâtons croisés — bit 0 l'horizontal, bit 1 le
 * vertical, comme le générateur les compte. Le « = » en a deux, parallèles, et
 * aucun n'est un bouton : une égalité dont on défait le signe ne se lit plus.
 */
export function batonsDuSigne(quoi) {
    if (quoi === '=') {
        return [
            { i: 0, sens: 'h', x: JEU, y: L - T * 1.5, tete: 0 },
            { i: 1, sens: 'h', x: JEU, y: L + T * 1.5, tete: 1 }
        ];
    }
    return [
        { i: 0, sens: 'h', x: JEU, y: L, tete: 0 },
        { i: 1, sens: 'v', x: L / 2, y: L - LONG / 2, tete: 0 }
    ];
}

/** La vue du SVG : la case, plus la demi-épaisseur dont les bâtons dépassent. */
export const VUE = {
    x: -(T / 2 + 1), y: -(T / 2 + 1),
    w: L + T + 2, h: 2 * L + T + 2
};

/**
 * LES CINQ BANDES DE TOUCHER, en pourcentage de la case.
 *
 * Elles PAVENT la case sans se recouvrir — règle payée le 27 octobre par
 * « les 43 boutons étirés » : la feuille de style impose 44 px de haut à tout
 * bouton de l'aire de jeu, les zones se recouvraient de treize pixels, et un
 * doigt qui visait le segment du milieu enlevait celui du haut. Vingt-quatre
 * paires, mesurées par la sonde.
 *
 * Chaque bande contient le bâton qu'elle commande, et lui seul.
 */
/**
 * ELLES SE COMPTENT EN POURCENTAGE DE LA VUE, PAS DE LA CASE.
 *
 * La case est la boîte des CENTRES ; la vue du SVG est plus grande d'une
 * demi-épaisseur tout autour, puisque les bâtons dépassent. Les boutons, eux,
 * se posent sur le cadre de la case HTML, qui a le format de la vue — c'est
 * donc dans ce repère-là qu'il faut écrire les frontières, sinon chaque bande
 * est décalée de trois pour cent et l'on retombe exactement sur le défaut
 * qu'on vient de corriger.
 *
 * La première bande part de 0 et la dernière finit à 100 : un toucher au ras
 * du bord doit agir, pas tomber dans un couloir mort.
 */
const versVue = (y) => Math.round((y - VUE.y) / VUE.h * 10000) / 100;
export const ZONES = {
    0: { haut: 0, bas: versVue(L / 4), gauche: 0, droite: 100 },
    5: { haut: versVue(L / 4), bas: versVue(3 * L / 4), gauche: 0, droite: 50 },
    1: { haut: versVue(L / 4), bas: versVue(3 * L / 4), gauche: 50, droite: 100 },
    6: { haut: versVue(3 * L / 4), bas: versVue(5 * L / 4), gauche: 0, droite: 100 },
    4: { haut: versVue(5 * L / 4), bas: versVue(7 * L / 4), gauche: 0, droite: 50 },
    2: { haut: versVue(5 * L / 4), bas: versVue(7 * L / 4), gauche: 50, droite: 100 },
    3: { haut: versVue(7 * L / 4), bas: 100, gauche: 0, droite: 100 }
};
