// LE THÉORÈME DE THALÈS — deux configurations, une seule idée.
//
// Rémy : « Un exercice sur le théorème de Thalès. »
//
// LES LETTRES SONT CELLES DE RÉMY. Il a dessiné sa figure et écrit sa
// rédaction avec : A au sommet, D et E sur les côtés, C et B à la base — donc
// D entre A et C, E entre A et B. « Je sais que : [CD] et [EB] sont sécantes
// en A / (DE)//(CB) / Or : d'après le théorème de Thalès / AD/AC = AE/AB =
// DE/BC. » Les manuels écrivent plutôt M et N ; ce sont les mêmes points, et
// entre le manuel et le tableau du professeur qui s'en sert, c'est le tableau
// qui gagne : l'élève doit reconnaître à l'écran ce qu'il recopie en classe.
//
// L'IDÉE TIENT EN UNE PHRASE, ET LES ÉLÈVES N'EN RETIENNENT QUE LES LETTRES.
// Deux droites sécantes en A, coupées par deux parallèles : les trois rapports
// AD/AC, AE/AB et DE/BC sont ÉGAUX. Tout le reste — la configuration en
// triangles emboîtés, celle en papillon, l'ordre des lettres — n'est que la
// même phrase vue sous deux angles.
//
// LA FAUTE ORDINAIRE N'EST PAS UN CALCUL, C'EST UN APPARIEMENT. L'élève écrit
// AE/EB au lieu de AE/AB : il prend le petit morceau sur le RESTE au lieu du
// TOUT. Aucun calcul ne le rattrapera, parce que le calcul, lui, tombe juste.
// C'est pour cela que l'exercice fait choisir l'ÉGALITÉ avant de faire
// calculer quoi que ce soit : tant que le rapport est mal écrit, la suite est
// du travail perdu.
//
// LES DEUX CONFIGURATIONS, EN COORDONNÉES :
//
//   EMBOÎTÉS            PAPILLON
//        A                  E-----D
//       / \                  \   /
//      E---D                   A
//     /     \                 / \
//    B-------C               B---C
//
//   E = A + k(B−A)      E = A − k(B−A)
//   D = A + k(C−A)      D = A − k(C−A)
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
    // multiple de q lui aussi pour que DE tombe juste.
    const bas = Math.floor(Math.abs(AB - AC) / r.q) + 1;
    const haut = Math.ceil((AB + AC) / r.q) - 1;
    if (haut < bas) return null;
    const BC = r.q * rng.int(bas, haut);

    const AE = AB * k, AD = AC * k, DE = BC * k;
    return {
        config: c.id, signe: c.signe, p: r.p, q: r.q, k,
        AB, AC, BC, AE, AD, DE,
        // Les morceaux « restants », ceux avec lesquels on confond le tout.
        EB: AB - AE, DC: AC - AD,
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
    // petit triangle d'un papillon devient un timbre et les lettres A, E, D se
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
    return { A, B, C, E: vers(B, kB), D: vers(C, kC) };
}

/**
 * LA FIGURE D'UNE RÉCIPROQUE NE DOIT PAS MENTIR.
 *
 * Sur les trois premières marches, (DE) EST parallèle à (BC) : un seul rapport
 * suffit. Sur la quatrième, on demande justement si elle l'est — et si l'on
 * dessinait quand même E et D au même rapport, la figure affirmerait le
 * contraire de la réponse attendue. On la redessine donc avec les DEUX
 * rapports réellement donnés. Ils sont assez proches pour que l'œil ne
 * tranche pas — il faut calculer, ce qui est tout l'exercice — mais le dessin,
 * lui, reste honnête.
 */
export const pointsReels = (f) =>
    pointsThales(f.signe, f.AE / f.AB, f.AD / f.AC);

// --- OÙ POSER LES LETTRES ---------------------------------------------------
//
// Rémy : « Les lettres se supperpose aux trait. Ne met pas de rond pour le
// point. »
//
// LES DÉCALAGES ÉTAIENT ÉCRITS À LA MAIN — « A en haut à droite, B en bas à
// gauche » —, et ils étaient justes pour UNE figure. Or la figure bouge : le
// rapport change à chaque question, le papillon retourne tout, et la
// réciproque déplace E et D indépendamment. Un décalage fixe finit donc
// forcément posé sur un trait, et c'est ce que Rémy a vu.
//
// LE CRITÈRE JUSTE EST GÉOMÉTRIQUE, et il tient en une phrase : autour d'un
// point partent des segments ; entre deux segments voisins il y a un secteur
// vide ; on écrit la lettre au MILIEU DU PLUS GRAND de ces secteurs. Aucune
// figure ne peut prendre la fonction en défaut, parce qu'elle ne suppose rien
// de la figure — pas même qu'il y ait plus d'un segment.
//
// LE ROND DISPARAÎT AVEC. Un point d'une figure de géométrie se nomme, il ne
// se colorie pas : au crayon on trace deux traits qui se croisent, et c'est
// leur intersection, le point. Le disque noir était une béquille pour dire
// « c'est ici » quand la lettre tombait ailleurs.

/**
 * Les directions occupées autour de chaque point nommé.
 *
 * ON COMPTE LES DROITES, PAS LES SEGMENTS TRACÉS. En triangles emboîtés, E est
 * SUR le segment [AB] : la droite le traverse et continue vers B. Ne lister
 * que A et D pour E laissait donc croire que tout le bas était libre — et la
 * lettre E s'y posait, en plein sur (AB). En papillon, B est de l'autre côté
 * mais dans la même direction que A vu de E : l'ajouter ne coûte rien.
 */
const VOISINS_THALES = {
    A: ['B', 'C', 'E', 'D'], B: ['A', 'C'], C: ['A', 'B'],
    E: ['A', 'B', 'D'], D: ['A', 'C', 'E']
};

/**
 * La direction où écrire chaque lettre : un vecteur unitaire, dans le repère
 * du dessin (y vers le BAS, comme en SVG et comme sur une page).
 */
export function placeNoms(points) {
    const out = {};
    for (const [nom, voisins] of Object.entries(VOISINS_THALES)) {
        const p = points[nom];
        const angles = voisins
            .filter(v => points[v])
            .map(v => Math.atan2(points[v].y - p.y, points[v].x - p.x))
            .sort((a, b) => a - b);
        if (!angles.length) { out[nom] = { x: 0, y: -1 }; continue; }
        // Un seul segment : le secteur libre fait un tour complet, son milieu
        // est à l'opposé du segment. La boucle ci-dessous le trouve aussi,
        // puisque le seul « voisin suivant » du seul rayon est lui-même.
        let plusGrand = -1, milieu = angles[0] + Math.PI;
        for (let i = 0; i < angles.length; i++) {
            const suivant = i + 1 < angles.length ? angles[i + 1] : angles[0] + 2 * Math.PI;
            const secteur = suivant - angles[i];
            if (secteur > plusGrand) { plusGrand = secteur; milieu = angles[i] + secteur / 2; }
        }
        out[nom] = { x: Math.cos(milieu), y: Math.sin(milieu) };
    }
    return out;
}

/** De combien la lettre s'écarte du point, dans le carré de 100 de la figure. */
export const ECART_NOM = 6;

/**
 * Comment ancrer la lettre, sa direction en main : à gauche, à droite ou
 * centrée ; au-dessus, en dessous ou à mi-hauteur.
 *
 * Écrit ici et non dans chaque moteur de rendu : l'écran a `text-anchor`, le
 * PDF a `align`, et sans règle commune les deux dessins divergent au premier
 * ajustement — c'est exactement ce que la figure partagée cherche à éviter.
 *
 * @returns {{h: -1|0|1, v: -1|0|1}}
 */
export function ancrageNom(d) {
    return {
        h: d.x > 0.35 ? 1 : d.x < -0.35 ? -1 : 0,
        v: d.y > 0.35 ? 1 : d.y < -0.35 ? -1 : 0
    };
}

/**
 * L'ÉGALITÉ DE THALÈS, ÉCRITE COMME AU TABLEAU — celui de Rémy.
 *
 * Les trois rapports, dans l'ordre où on les pose : les deux droites d'abord,
 * la parallèle ensuite. C'est cet ordre qui rend la suite mécanique, et c'est
 * mot pour mot celui qu'il a écrit : « AD/AC = AE/AB = DE/BC ».
 */
export const egaliteThales = () => 'AD/AC = AE/AB = DE/BC';

/**
 * LES FAUSSES ÉGALITÉS, ET CE QU'ELLES TRAHISSENT.
 *
 * Chacune est une confusion précise, pas un brouillage : c'est ce qui permet
 * au carnet d'erreurs de dire à l'élève ce qu'il a fait, et pas seulement
 * qu'il s'est trompé.
 */
export const FAUSSES_EGALITES = [
    {
        texte: 'AD/DC = AE/EB = DE/BC',
        pourquoi: 'Tu as pris le RESTE (DC) au lieu du TOUT (AC). Thalès compare chaque '
            + 'petit segment au grand segment ENTIER qui le contient, pas au morceau '
            + 'qui reste.'
    },
    {
        texte: 'AD/AC = AB/AE = DE/BC',
        pourquoi: 'Le deuxième rapport est à l\'envers. Les trois rapports vont tous dans '
            + 'le même sens : petit sur grand, ou grand sur petit, mais jamais mélangés.'
    },
    {
        texte: 'AD/AC = AE/AB = BC/DE',
        pourquoi: 'Le rapport des parallèles est retourné. DE est le petit segment, il '
            + 'doit rester au NUMÉRATEUR comme AD et AE.'
    },
    {
        texte: 'AD/AE = AC/AB = DE/BC',
        pourquoi: 'Là tu compares les deux droites entre elles au lieu de comparer chaque '
            + 'droite à elle-même. Un rapport de Thalès ne mélange jamais les deux '
            + 'demi-droites issues de A.'
    }
];

/**
 * LA RÉCIPROQUE : les deux droites sont-elles parallèles ?
 *
 * On compare AE/AB et AD/AC — et l'on compare des FRACTIONS, pas des nombres
 * décimaux : 1/3 et 0,333 ne sont pas égaux, et une comparaison flottante
 * déclarerait parallèle ce qui ne l'est pas.
 */
export function sontParalleles({ AE, AB, AD, AC }) {
    return AE * AC === AD * AB;
}

/**
 * DE COMBIEN ON MANQUE, quand ce n'est pas parallèle — pour l'expliquer.
 * On rend les deux rapports sous forme réduite, ce qui se lit tout seul.
 */
export function rapportsCompares({ AE, AB, AD, AC }) {
    const reduire = (a, b) => {
        const pgcd = (x, y) => (y ? pgcd(y, x % y) : x);
        // Les longueurs peuvent porter une décimale : on passe en dixièmes.
        const [na, nb] = [Math.round(a * 10), Math.round(b * 10)];
        const g = pgcd(na, nb) || 1;
        return `${na / g}/${nb / g}`;
    };
    return { premier: reduire(AE, AB), second: reduire(AD, AC) };
}

/**
 * LA LONGUEUR MANQUANTE, et les trois lignes du cahier pour l'obtenir.
 *
 * On rend le calcul ÉCRIT, pas seulement le résultat : sur une copie, Thalès se
 * note sur la démarche — l'égalité posée, le produit en croix, la valeur.
 *
 * @param {object} f la figure
 * @param {'AD'|'AE'|'DE'|'BC'|'AB'|'AC'} cherche la longueur demandée
 */
export function calculThales(f, cherche) {
    // Chaque inconnue se tire d'une égalité de deux rapports : on nomme les
    // trois autres longueurs qui interviennent.
    const TRIOS = {
        AD: ['AE', 'AB', 'AC'],   // AD = AE × AC / AB
        AE: ['AD', 'AC', 'AB'],
        DE: ['AE', 'AB', 'BC'],
        BC: ['DE', 'AE', 'AB'],   // BC = DE × AB / AE
        AB: ['AE', 'AD', 'AC'],
        AC: ['AD', 'AE', 'AB']
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
            `Les droites (DE) et (BC) sont parallèles, donc ${egaliteThales()}.`,
            `Donc ${cherche} = ${a} × ${c} / ${b} = ${L(f[a])} × ${L(f[c])} / ${L(f[b])}.`,
            `${cherche} = ${L(valeur)} cm.`
        ]
    };
}
