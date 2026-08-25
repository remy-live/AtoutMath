// LE THÉORÈME DE THALÈS — deux configurations, une seule idée.
//
// Rémy : « Un exercice sur le théorème de Thalès. »
//
// L'IDÉE TIENT EN UNE PHRASE, ET LES ÉLÈVES N'EN RETIENNENT QUE LES LETTRES.
// Deux droites sécantes en A, coupées par deux parallèles : les trois rapports
// AM/AB, AN/AC et MN/BC sont ÉGAUX. Tout le reste — la configuration en
// triangles emboîtés, celle en papillon, l'ordre des lettres — n'est que la
// même phrase vue sous deux angles.
//
// LA FAUTE ORDINAIRE N'EST PAS UN CALCUL, C'EST UN APPARIEMENT. L'élève écrit
// AM/MB au lieu de AM/AB : il prend le petit morceau sur le RESTE au lieu du
// TOUT. Aucun calcul ne le rattrapera, parce que le calcul, lui, tombe juste.
// C'est pour cela que l'exercice fait choisir l'ÉGALITÉ avant de faire
// calculer quoi que ce soit : tant que le rapport est mal écrit, la suite est
// du travail perdu.
//
// LES DEUX CONFIGURATIONS, EN COORDONNÉES :
//
//   EMBOÎTÉS            PAPILLON
//        A                  M-----N
//       / \                  \   /
//      M---N                   A
//     /     \                 / \
//    B-------C               B---C
//
//   M = A + k(B−A)      M = A − k(B−A)
//   N = A + k(C−A)      N = A − k(C−A)
//
// Un seul signe les sépare, et c'est exactement ce que dit le cours : le
// papillon, ce sont les emboîtés avec un rapport négatif. On l'écrit donc une
// fois, avec un signe en paramètre.
//
// LES LONGUEURS TOMBENT JUSTE PARCE QU'ON PART DU RAPPORT. On choisit d'abord
// k = p/q, puis des longueurs multiples de q : les images sont alors entières
// ou à une décimale, jamais 7,333333. Un énoncé de géométrie qui demande
// d'arrondir n'enseigne plus Thalès, il enseigne la calculatrice.
//
// Module pur : ni DOM, ni hasard propre.

/** Les deux configurations, et comment on les nomme en classe. */
export const CONFIGURATIONS = {
    emboites: {
        id: 'emboites', signe: 1,
        label: 'Triangles emboîtés',
        aide: 'Les deux petits segments partent du même côté du point A : le petit '
            + 'triangle est DANS le grand.'
    },
    papillon: {
        id: 'papillon', signe: -1,
        label: 'Configuration papillon',
        aide: 'Le point A est ENTRE les deux parallèles : les deux triangles se font '
            + 'face, pointe contre pointe.'
    }
};

/** Les rapports possibles, choisis pour que les longueurs restent lisibles. */
const RAPPORTS = [
    { p: 1, q: 2 }, { p: 1, q: 3 }, { p: 2, q: 3 }, { p: 1, q: 4 }, { p: 3, q: 4 },
    { p: 2, q: 5 }, { p: 3, q: 5 }, { p: 4, q: 5 }, { p: 5, q: 6 }
];

/** Une longueur telle qu'on l'écrit : entière, ou à une décimale. */
export function longueurTexte(v) {
    const arrondi = Math.round(v * 10) / 10;
    return Number.isInteger(arrondi) ? String(arrondi) : String(arrondi).replace('.', ',');
}

/**
 * UNE FIGURE DE THALÈS COMPLÈTE : les six longueurs et les coordonnées.
 *
 * On tire le rapport d'abord, les longueurs ensuite — multiples de q — pour que
 * les trois images tombent juste. `BC` n'est pas libre : dans un vrai triangle
 * il est contraint par AB et AC (inégalité triangulaire), et une figure
 * impossible se voit tout de suite quand on la dessine.
 */
export function creerThales({ config = 'emboites', rng }) {
    const c = CONFIGURATIONS[config] || CONFIGURATIONS.emboites;
    const r = rng.pick(RAPPORTS);
    const k = r.p / r.q;

    // AB et AC multiples de q, et assez différents pour que la figure ne soit
    // pas isocèle — un triangle isocèle laisse croire que Thalès parle de
    // symétrie.
    const m1 = rng.int(2, 4), m2 = rng.int(2, 4);
    const AB = r.q * m1 * (rng.bool() ? 1 : 2);
    let AC = r.q * m2 * (rng.bool() ? 1 : 2);
    if (AC === AB) AC = AB + r.q;
    // BC doit rester un vrai côté : entre |AB−AC| et AB+AC, exclus. On le prend
    // multiple de q lui aussi pour que MN tombe juste.
    const bas = Math.floor(Math.abs(AB - AC) / r.q) + 1;
    const haut = Math.ceil((AB + AC) / r.q) - 1;
    if (haut < bas) return null;
    const BC = r.q * rng.int(bas, haut);

    const AM = AB * k, AN = AC * k, MN = BC * k;
    return {
        config: c.id, signe: c.signe, p: r.p, q: r.q, k,
        AB, AC, BC, AM, AN, MN,
        // Les morceaux « restants », ceux avec lesquels on confond le tout.
        MB: AB - AM, NC: AC - AN,
        points: pointsThales(c.signe, k)
    };
}

/**
 * LES COORDONNÉES DE LA FIGURE, dans un carré de 100 sur 100.
 *
 * On ne dessine pas à l'échelle des longueurs de l'énoncé — c'est volontaire, et
 * c'est ce que font tous les manuels : une figure à l'échelle se mesure à la
 * règle, et l'élève n'applique plus le théorème. Seul le RAPPORT est respecté,
 * parce que c'est lui qu'on doit voir.
 */
export function pointsThales(signe, kB, kC = kB) {
    const A = { x: 50, y: 50 };
    const B = { x: 8, y: 50 + 42 };
    const C = { x: 96, y: 50 + 36 };
    // LE RAPPORT DESSINÉ N'EST PAS LE RAPPORT CALCULÉ, et c'est la même
    // décision que « pas à l'échelle », poussée jusqu'au bout. À un quart, le
    // petit triangle d'un papillon devient un timbre et les lettres A, M, N se
    // superposent : la figure cesse d'être lisible sans rien gagner en
    // vérité, puisqu'elle n'était déjà pas à l'échelle. On étale donc les
    // rapports dans une bande confortable, par une transformation AFFINE — le
    // même étirement pour les deux côtés, donc l'ordre et l'égalité éventuelle
    // sont conservés. Une figure de réciproque reste ainsi honnête : deux
    // rapports différents le restent, deux rapports égaux aussi.
    const etaler = (k) => 0.34 + 0.36 * Math.max(0, Math.min(1, k));
    const vers = (P, k) => ({
        x: A.x + signe * etaler(k) * (P.x - A.x),
        y: A.y + signe * etaler(k) * (P.y - A.y)
    });
    return { A, B, C, M: vers(B, kB), N: vers(C, kC) };
}

/**
 * LA FIGURE D'UNE RÉCIPROQUE NE DOIT PAS MENTIR.
 *
 * Sur les trois premières marches, (MN) EST parallèle à (BC) : un seul rapport
 * suffit. Sur la quatrième, on demande justement si elle l'est — et si l'on
 * dessinait quand même M et N au même rapport, la figure affirmerait le
 * contraire de la réponse attendue. On la redessine donc avec les DEUX
 * rapports réellement donnés. Ils sont assez proches pour que l'œil ne
 * tranche pas — il faut calculer, ce qui est tout l'exercice — mais le dessin,
 * lui, reste honnête.
 */
export const pointsReels = (f) =>
    pointsThales(f.signe, f.AM / f.AB, f.AN / f.AC);

/**
 * L'ÉGALITÉ DE THALÈS, ÉCRITE COMME AU TABLEAU.
 *
 * Les trois rapports, dans l'ordre où on les pose : les deux droites d'abord,
 * la parallèle ensuite. C'est cet ordre qui rend la suite mécanique.
 */
export const egaliteThales = () => 'AM/AB = AN/AC = MN/BC';

/**
 * LES FAUSSES ÉGALITÉS, ET CE QU'ELLES TRAHISSENT.
 *
 * Chacune est une confusion précise, pas un brouillage : c'est ce qui permet
 * au carnet d'erreurs de dire à l'élève ce qu'il a fait, et pas seulement
 * qu'il s'est trompé.
 */
export const FAUSSES_EGALITES = [
    {
        texte: 'AM/MB = AN/NC = MN/BC',
        pourquoi: 'Tu as pris le RESTE (MB) au lieu du TOUT (AB). Thalès compare chaque '
            + 'petit segment au grand segment ENTIER qui le contient, pas au morceau '
            + 'qui reste.'
    },
    {
        texte: 'AM/AB = AC/AN = MN/BC',
        pourquoi: 'Le deuxième rapport est à l\'envers. Les trois rapports vont tous dans '
            + 'le même sens : petit sur grand, ou grand sur petit, mais jamais mélangés.'
    },
    {
        texte: 'AM/AB = AN/AC = BC/MN',
        pourquoi: 'Le rapport des parallèles est retourné. MN est le petit segment, il '
            + 'doit rester au NUMÉRATEUR comme AM et AN.'
    },
    {
        texte: 'AM/AN = AB/AC = MN/BC',
        pourquoi: 'Là tu compares les deux droites entre elles au lieu de comparer chaque '
            + 'droite à elle-même. Un rapport de Thalès ne mélange jamais les deux '
            + 'demi-droites issues de A.'
    }
];

/**
 * LA RÉCIPROQUE : les deux droites sont-elles parallèles ?
 *
 * On compare AM/AB et AN/AC — et l'on compare des FRACTIONS, pas des nombres
 * décimaux : 1/3 et 0,333 ne sont pas égaux, et une comparaison flottante
 * déclarerait parallèle ce qui ne l'est pas.
 */
export function sontParalleles({ AM, AB, AN, AC }) {
    return AM * AC === AN * AB;
}

/**
 * DE COMBIEN ON MANQUE, quand ce n'est pas parallèle — pour l'expliquer.
 * On rend les deux rapports sous forme réduite, ce qui se lit tout seul.
 */
export function rapportsCompares({ AM, AB, AN, AC }) {
    const reduire = (a, b) => {
        const pgcd = (x, y) => (y ? pgcd(y, x % y) : x);
        // Les longueurs peuvent porter une décimale : on passe en dixièmes.
        const [na, nb] = [Math.round(a * 10), Math.round(b * 10)];
        const g = pgcd(na, nb) || 1;
        return `${na / g}/${nb / g}`;
    };
    return { premier: reduire(AM, AB), second: reduire(AN, AC) };
}

/**
 * LA LONGUEUR MANQUANTE, et les trois lignes du cahier pour l'obtenir.
 *
 * On rend le calcul ÉCRIT, pas seulement le résultat : sur une copie, Thalès se
 * note sur la démarche — l'égalité posée, le produit en croix, la valeur.
 *
 * @param {object} f la figure
 * @param {'AN'|'AM'|'MN'|'BC'|'AB'|'AC'} cherche la longueur demandée
 */
export function calculThales(f, cherche) {
    // Chaque inconnue se tire d'une égalité de deux rapports : on nomme les
    // trois autres longueurs qui interviennent.
    const TRIOS = {
        AN: ['AM', 'AB', 'AC'],   // AN = AM × AC / AB
        AM: ['AN', 'AC', 'AB'],
        MN: ['AM', 'AB', 'BC'],
        BC: ['MN', 'AM', 'AB'],   // BC = MN × AB / AM
        AB: ['AM', 'AN', 'AC'],
        AC: ['AN', 'AM', 'AB']
    };
    const [a, b, c] = TRIOS[cherche];
    const inverse = cherche === 'BC' || cherche === 'AB' || cherche === 'AC';
    const valeur = inverse ? (f[a] * f[c]) / f[b] : (f[a] * f[c]) / f[b];
    const L = longueurTexte;
    return {
        cherche,
        valeur: Math.round(valeur * 100) / 100,
        donnees: [a, b, c],
        lignes: [
            `Les droites (MN) et (BC) sont parallèles, donc ${egaliteThales()}.`,
            `Donc ${cherche} = ${a} × ${c} / ${b} = ${L(f[a])} × ${L(f[c])} / ${L(f[b])}.`,
            `${cherche} = ${L(valeur)} cm.`
        ]
    };
}
