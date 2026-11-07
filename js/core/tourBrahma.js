// LA TOUR DE BRAHMA — le plus vieux défi du monde, en dix lignes de règle.
//
// Rémy, avec la page de son « Coin des jeux mathématiques » : « Le but du jeu
// est de passer toutes les boules à droite. On a le droit d'utiliser un des
// 3 conduits. On déplace une boule par une boule. La seule règle est qu'une
// boule doit toujours être posée sur une boule plus grosse. »
//
// C'est la tour de Hanoï, sous le nom que lui a donné Édouard Lucas en 1883 :
// des moines de Brahma déplaçant soixante-quatre disques d'or, et le monde qui
// s'achève quand ils ont fini. Ils en ont pour 2⁶⁴ − 1 coups, soit cinq cents
// milliards d'années à un coup par seconde. La légende est fausse ; le calcul,
// lui, est la leçon.
//
// CE QU'ON Y APPREND N'EST PAS DE DÉPLACER DES BOULES, C'EST DE RÉCURRER. Pour
// déplacer quatre boules à droite, il faut d'abord déplacer les trois du dessus
// AILLEURS, puis poser la plus grosse, puis ramener les trois. « Résoudre pour
// n » se ramène à « résoudre deux fois pour n − 1 » — et le nombre de coups
// double à chaque boule ajoutée, plus un : 1, 3, 7, 15, 31. C'est la première
// suite géométrique qu'un élève rencontre sans qu'on la lui présente comme
// telle.
//
// L'ÉTAT EST TROIS PILES, LA PLUS GROSSE BOULE EN BAS. Une pile est donc
// toujours décroissante du bas vers le haut, et c'est la règle du jeu tout
// entière : on ne peut poser que sur plus gros que soi.
//
// Module pur : ni DOM, ni hasard propre.

/** Le nombre de boules proposé, et le nombre de coups qu'il faut. */
export const TAILLES_BRAHMA = {
    trois: { id: 'trois', label: '3 boules — 7 coups', n: 3 },
    quatre: { id: 'quatre', label: '4 boules — 15 coups', n: 4 },
    cinq: { id: 'cinq', label: '5 boules — 31 coups', n: 5 },
    six: { id: 'six', label: '6 boules — 63 coups', n: 6 }
};

/** Le minimum de coups : 2ⁿ − 1, et il n'y a pas moyen de faire mieux. */
export const minimumBrahma = (n) => 2 ** n - 1;

/**
 * LES TEINTES DES BOULES, de la plus petite à la plus grosse.
 *
 * ELLES VIVENT ICI, ET NON DANS LE JEU, parce que la FEUILLE les demande
 * aussi. Rémy : « Vérifie aussi les autres pour les couleurs » — mesuré, la
 * planche à découper sortait en six ronds du même lavande pâle, et la solution
 * pas à pas en trente et une vignettes de galets blancs où l'on ne voit pas
 * quelle boule a bougé. Deux listes à tenir d'accord, c'est une boule verte à
 * l'écran et bleue sur le papier au premier changement de palette.
 *
 * La couleur ne porte rien toute seule : chaque boule porte SON NUMÉRO et son
 * DIAMÈTRE, qui sont la règle du jeu. La teinte ne fait que reposer l'œil.
 */
export const TEINTES_BRAHMA = ['#7c3aed', '#c1274a', '#2f855a', '#e0a020',
    '#3182ce', '#b7791f'];

/** La teinte de la boule de taille `b`, les tailles commençant à 1. */
export const teinteBoule = (b) => TEINTES_BRAHMA[(b - 1) % TEINTES_BRAHMA.length];

/** La position de départ : tout à gauche, la plus grosse en bas. */
export const departBrahma = (n) => [
    Array.from({ length: n }, (_, i) => n - i), [], []
];

const sommet = (pile) => (pile.length ? pile[pile.length - 1] : null);

/**
 * A-T-ON LE DROIT ? Trois refus, et ce sont les trois seules règles :
 * on ne prend pas dans un conduit vide, on ne repose pas d'où l'on vient,
 * et on ne pose jamais une boule sur une plus petite.
 */
export function coupValide(etat, de, vers) {
    if (de === vers) return false;
    if (!etat[de] || !etat[vers]) return false;
    const prise = sommet(etat[de]);
    if (prise === null) return false;
    const dessous = sommet(etat[vers]);
    return dessous === null || dessous > prise;
}

/** Le coup joué, sur un nouvel état — l'ancien n'est jamais modifié. */
export function jouer(etat, de, vers) {
    if (!coupValide(etat, de, vers)) return etat;
    const suite = etat.map(p => p.slice());
    suite[vers].push(suite[de].pop());
    return suite;
}

/** Gagné quand tout est arrivé sur le conduit de droite. */
export const estGagneBrahma = (etat, n) => etat[2].length === n;

/**
 * LE CHEMIN LE PLUS COURT DEPUIS N'IMPORTE QUELLE POSITION.
 *
 * On ne rejoue pas la partie depuis le début : on raisonne sur la PLUS GROSSE
 * boule pas encore rangée. Si elle est déjà sur le conduit visé, il ne reste
 * qu'à y amener les plus petites ; sinon, il faut d'abord dégager toutes les
 * plus petites sur le troisième conduit, puis la déplacer.
 *
 * C'est la récursion du jeu, et c'est pour cela que la fonction sert autant à
 * l'indice qu'au compteur : elle dit LE nombre de coups qui restent, donc si
 * l'élève est encore sur le chemin optimal.
 */
export function coupsRestants(etat, n, cible = 2) {
    const ou = new Array(n + 1).fill(-1);
    etat.forEach((pile, p) => pile.forEach(b => { ou[b] = p; }));
    const coups = [];
    const deplacer = (taille, versLa) => {
        if (taille === 0) return;
        const ici = ou[taille];
        if (ici === versLa) { deplacer(taille - 1, versLa); return; }
        // Dégager tout ce qui est plus petit sur le conduit qui reste, poser
        // celle-ci, puis ramener le reste.
        const libre = 3 - ici - versLa;
        deplacer(taille - 1, libre);
        coups.push({ de: ici, vers: versLa, boule: taille });
        ou[taille] = versLa;
        deplacer(taille - 1, versLa);
    };
    deplacer(n, cible);
    return coups;
}

/** Le prochain coup du chemin le plus court, ou `null` si c'est fini. */
export function prochainCoupBrahma(etat, n, cible = 2) {
    const c = coupsRestants(etat, n, cible);
    return c.length ? c[0] : null;
}

/**
 * LA PARTIE PARFAITE, POSITION PAR POSITION — pour la feuille de solutions.
 *
 * Rémy : « pour les solutions des grenouilles, parking, hanoï, dessine des
 * vignettes des étapes pour la correction. » Il faut donc, non pas le nombre
 * de coups, mais la SUITE DES POSITIONS : celle du départ, puis celle après
 * chaque coup. `coupsRestants` connaît déjà le chemin entier — on le rejoue.
 *
 * Le premier élément est le départ : la vignette « Départ » du corrigé, celle
 * à laquelle on compare la sienne avant même d'avoir joué.
 */
export function etapesBrahma(n, cible = 2) {
    let etat = departBrahma(n);
    const etapes = [etat];
    for (const c of coupsRestants(etat, n, cible)) {
        etat = jouer(etat, c.de, c.vers);
        etapes.push(etat);
    }
    return etapes;
}

/**
 * DE QUOI JUGER UNE PARTIE : le compte, le minimum, et surtout l'écart. Un
 * élève qui finit en dix-neuf coups au lieu de quinze n'a pas échoué — il a
 * fait quatre détours, et c'est un nombre qu'on peut regarder ensemble.
 */
export function qualiteBrahma(n, joues) {
    const mini = minimumBrahma(n);
    return { n, mini, joues, detours: Math.max(0, joues - mini), parfait: joues === mini };
}
