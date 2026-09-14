// Disposition du plateau de paires — calcul pur, donc testable sans navigateur.
//
// Auparavant le nombre de colonnes ne dépendait que du nombre de paires (six
// colonnes dès neuf paires) : sur un téléphone en portrait, vingt cartes se
// serraient donc en six colonnes de 50 px de large pour 80 px de haut — des
// lamelles verticales où « 8 × 6 » se coupait en deux lignes, avec une
// dernière rangée bancale et un grand vide sous le plateau.
//
// Deux idées le remplacent :
//   - le découpage se choisit d'après l'espace RÉELLEMENT mesuré, en visant
//     les cartes les plus GRANDES en surface — le format restant borné, une
//     grande carte est forcément assez large pour un calcul sur une ligne ;
//   - la dernière rangée, quand elle est incomplète, est CENTRÉE — un duo
//     centré sous trois colonnes paraît voulu, là où deux cartes collées à
//     gauche sous six colonnes paraissaient oubliées.
// La hauteur des cartes s'étire ensuite pour occuper la place restante, sans
// jamais sortir d'un format raisonnable.

/** Formats admissibles d'une carte (largeur / hauteur). */
export const FORMAT_MIN = 0.72;   // la plus haute : une carte à jouer
export const FORMAT_MAX = 1.6;    // la plus large

/**
 * Part de la surface qu'on accepte de céder pour un plateau mieux dessiné.
 * En deçà, les cartes deviendraient sensiblement plus petites : la taille
 * reprend alors le dessus sur l'esthétique.
 */
const TOLERANCE = 0.8;

/**
 * Nombre de colonnes retenu pour l'espace disponible.
 *
 * On calcule d'abord la plus grande carte possible (en surface), puis, parmi
 * tous les découpages qui en restent proches, on prend celui dont la dernière
 * rangée est la plus remplie : 4 × 4 se lit mieux que 3 × 6 avec une carte
 * esseulée en bas, pour des cartes à peine plus petites.
 *
 * @param {number} n        nombre de cartes
 * @param {number} largeur  espace utile en px
 * @param {number} hauteur  espace utile en px
 * @param {number} gap      écart entre cartes
 */
export function meilleuresColonnes(n, largeur, hauteur, gap = 10) {
    const candidats = [];
    for (let c = 1; c <= n; c++) {
        const { largeurCarte, hauteurCarte } = mesurerCarte(n, c, largeur, hauteur, gap);
        const aire = largeurCarte * hauteurCarte;
        if (aire > 0) candidats.push({ cols: c, aire, trous: (c - n % c) % c });
    }
    if (!candidats.length) return 1;

    const aireMax = Math.max(...candidats.map(x => x.aire));
    const proches = candidats.filter(x => x.aire >= aireMax * TOLERANCE);
    // Le moins de trous d'abord ; à égalité, la plus grande carte.
    proches.sort((a, b) => (a.trous - b.trous) || (b.aire - a.aire));
    return proches[0].cols;
}

/**
 * Taille d'une carte pour un découpage donné : la plus grande qui tienne en
 * largeur comme en hauteur, le format restant dans les bornes admises. La
 * hauteur s'étire jusqu'à occuper la place libre — c'est ce qui évite le
 * grand vide sous un plateau trop compact.
 *
 * @returns {{largeurCarte:number, hauteurCarte:number, lignes:number}}
 */
export function mesurerCarte(n, cols, largeur, hauteur, gap = 10) {
    const lignes = Math.ceil(n / cols);
    const dispoL = (largeur - gap * (cols - 1)) / cols;
    const dispoH = (hauteur - gap * (lignes - 1)) / lignes;
    if (dispoL <= 0 || dispoH <= 0) return { largeurCarte: 0, hauteurCarte: 0, lignes };

    let l = dispoL;
    let h = dispoH;
    // Trop large pour sa hauteur : on rogne la largeur.
    if (l / h > FORMAT_MAX) l = h * FORMAT_MAX;
    // Trop haute pour sa largeur : on rogne la hauteur.
    if (l / h < FORMAT_MIN) h = l / FORMAT_MIN;
    return { largeurCarte: l, hauteurCarte: h, lignes };
}
