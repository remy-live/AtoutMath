// LA PIPOPIPETTE — les règles, sans une ligne de DOM.
//
// Rémy : « j'aimerai bien le jeu pipopipette ». Le jeu de Lucas (1889), qu'on
// appelle aussi « les petits carrés » : on trace un trait entre deux points
// voisins, et celui qui ferme un carré le marque À SON NOM et REJOUE.
//
// Ce n'est pas un jeu de hasard déguisé, c'est un jeu de PARITÉ. Passé la
// moitié de la partie, le plateau se découpe en chaînes de carrés ouverts ;
// celui qui doit entamer une chaîne la donne tout entière à l'adversaire. La
// stratégie consiste donc à compter — combien de chaînes, de quelle longueur,
// à qui revient d'ouvrir — et c'est exactement le genre de dénombrement qu'on
// veut voir chez un élève. Le fameux « double croix » (laisser deux carrés
// plutôt que d'en prendre quatre pour garder la main) est la première fois que
// beaucoup d'enfants renoncent à un gain immédiat par calcul.
//
// LE CONTRAT est celui de `core/ia.js` : coups, jouer, terminee, evaluer. Les
// états ne sont jamais modifiés — `jouer` en rend un nouveau.

export const TAILLES = {
    petit: { cols: 3, rows: 3 },
    moyen: { cols: 5, rows: 4 },
    grand: { cols: 7, rows: 6 }
};

/** Une partie neuve. Les traits sont `false`, les carrés sans propriétaire. */
export function creerPartie(options = {}) {
    const t = TAILLES[options.taille] || TAILLES.moyen;
    const cols = options.cols || t.cols;
    const rows = options.rows || t.rows;
    return {
        cols, rows,
        // Traits horizontaux : (rows + 1) rangées de `cols` traits.
        h: Array.from({ length: rows + 1 }, () => new Array(cols).fill(false)),
        // Traits verticaux : `rows` rangées de (cols + 1) traits.
        v: Array.from({ length: rows }, () => new Array(cols + 1).fill(false)),
        // Le propriétaire de chaque carré, ou null.
        cases: Array.from({ length: rows }, () => new Array(cols).fill(null)),
        trait: options.trait === 'N' ? 'N' : 'B',
        score: { B: 0, N: 0 },
        // Le dernier trait posé, pour l'animation et pour l'explication.
        dernier: null
    };
}

const copie = (t) => t.map(l => l.slice());

/** Une copie profonde : l'IA explore sans jamais abîmer la partie en cours. */
function cloner(p) {
    return {
        ...p,
        h: copie(p.h), v: copie(p.v), cases: copie(p.cases),
        score: { ...p.score }
    };
}

/** Les quatre traits d'un carré. */
export function cotesDe(p, x, y) {
    return [
        { t: 'h', x, y },          // haut
        { t: 'h', x, y: y + 1 },   // bas
        { t: 'v', x, y },          // gauche
        { t: 'v', x: x + 1, y }    // droite
    ];
}

const pose = (p, c) => (c.t === 'h' ? p.h[c.y][c.x] : p.v[c.y][c.x]);

/** Combien de côtés d'un carré sont déjà tracés. */
export function cotesPoses(p, x, y) {
    return cotesDe(p, x, y).filter(c => pose(p, c)).length;
}

/** Tous les traits encore libres. */
export function coups(p) {
    const out = [];
    for (let y = 0; y <= p.rows; y++) {
        for (let x = 0; x < p.cols; x++) if (!p.h[y][x]) out.push({ t: 'h', x, y });
    }
    for (let y = 0; y < p.rows; y++) {
        for (let x = 0; x <= p.cols; x++) if (!p.v[y][x]) out.push({ t: 'v', x, y });
    }
    return out;
}

/** Les carrés que ce trait fermerait (zéro, un ou deux). */
export function fermerait(p, coup) {
    const voisins = coup.t === 'h'
        ? [{ x: coup.x, y: coup.y - 1 }, { x: coup.x, y: coup.y }]
        : [{ x: coup.x - 1, y: coup.y }, { x: coup.x, y: coup.y }];
    return voisins.filter(c =>
        c.x >= 0 && c.y >= 0 && c.x < p.cols && c.y < p.rows
        && p.cases[c.y][c.x] === null
        && cotesPoses(p, c.x, c.y) === 3);
}

/**
 * Poser un trait.
 *
 * QUI FERME REJOUE : c'est toute la saveur du jeu, et c'est aussi ce qui rend
 * les fins de partie si contre-intuitives — enchaîner les carrés oblige à
 * rouvrir soi-même la chaîne suivante.
 */
export function jouer(p, coup) {
    const n = cloner(p);
    if (coup.t === 'h') {
        if (n.h[coup.y][coup.x]) return n;
        n.h[coup.y][coup.x] = true;
    } else {
        if (n.v[coup.y][coup.x]) return n;
        n.v[coup.y][coup.x] = true;
    }
    n.dernier = { ...coup, par: p.trait };
    const fermes = fermerait(p, coup);
    fermes.forEach(c => { n.cases[c.y][c.x] = p.trait; });
    n.score[p.trait] += fermes.length;
    n.fermes = fermes;
    // On ne passe la main que si l'on n'a rien fermé.
    if (!fermes.length) n.trait = p.trait === 'B' ? 'N' : 'B';
    return n;
}

/** La partie est finie quand tous les carrés ont un propriétaire. */
export function terminee(p) {
    const total = p.cols * p.rows;
    if (p.score.B + p.score.N < total) return null;
    if (p.score.B === p.score.N) return { gagnant: null, raison: 'égalité' };
    return { gagnant: p.score.B > p.score.N ? 'B' : 'N', raison: 'carrés' };
}

/**
 * L'ÉVALUATION, du point de vue du joueur au trait.
 *
 * Le score des carrés d'abord — c'est lui qui compte à la fin. Puis DEUX
 * corrections qui font toute la différence entre une IA qui joue au hasard et
 * une IA qui joue à la pipopipette :
 *
 *   · les carrés à TROIS côtés sont des cadeaux : celui qui a la main les
 *     prend tous. On les compte pour celui qui joue.
 *   · les carrés à DEUX côtés sont des pièges : y poser un trait offre le
 *     carré. Un plateau qui n'en a plus que ceux-là force la main.
 */
export function evaluer(p) {
    const moi = p.trait, lui = moi === 'B' ? 'N' : 'B';
    let cadeaux = 0, pieges = 0;
    for (let y = 0; y < p.rows; y++) {
        for (let x = 0; x < p.cols; x++) {
            if (p.cases[y][x] !== null) continue;
            const c = cotesPoses(p, x, y);
            if (c === 3) cadeaux++;
            else if (c === 2) pieges++;
        }
    }
    return (p.score[moi] - p.score[lui]) * 10 + cadeaux * 6 - pieges * 0.6;
}

/**
 * L'ordre d'exploration : les coups qui ferment un carré d'abord, ceux qui en
 * offrent un ensuite. L'élagage alpha-bêta ne vaut que par cet ordre-là.
 */
export function ordonner(liste, p) {
    if (!p) return liste;
    return liste.slice().sort((a, b) => note(p, b) - note(p, a));
}

function note(p, coup) {
    const ferme = fermerait(p, coup).length;
    if (ferme) return 100 + ferme;
    // Un trait qui porte un carré à trois côtés l'offre à l'adversaire.
    const voisins = coup.t === 'h'
        ? [{ x: coup.x, y: coup.y - 1 }, { x: coup.x, y: coup.y }]
        : [{ x: coup.x - 1, y: coup.y }, { x: coup.x, y: coup.y }];
    const offre = voisins.filter(c =>
        c.x >= 0 && c.y >= 0 && c.x < p.cols && c.y < p.rows
        && p.cases[c.y][c.x] === null && cotesPoses(p, c.x, c.y) === 2).length;
    return -offre * 10;
}

/**
 * Le jeu, tel que `core/ia.js` l'attend.
 *
 * `trait` est ce qui compte ici : celui qui ferme un carré REJOUE, donc la
 * main ne tourne pas à tous les coups, et l'IA doit le savoir — sans quoi elle
 * joue contre elle-même un coup sur deux.
 */
export const JEU = {
    coups,
    jouer,
    terminee,
    evaluer,
    trait: (p) => p.trait,
    ordonner
};

/** Combien de carrés restent à prendre : sert au bandeau et à l'explication. */
export function restants(p) {
    return p.cols * p.rows - p.score.B - p.score.N;
}

/**
 * LA CHAÎNE OUVERTE PAR UN TRAIT — ce qu'un joueur donne vraiment.
 *
 * Poser un trait sur un carré à deux côtés n'offre pas UN carré : il offre
 * toute la file de carrés qui s'enchaînent derrière. C'est le calcul que le
 * jeu demande, et l'explication de fin de partie s'en sert pour dire pourquoi
 * un coup a coûté cher.
 */
export function longueurChaine(p, coup) {
    let etat = jouer(p, coup);
    // L'adversaire (ou soi-même) ramasse tant qu'il y a des carrés à 3 côtés.
    let pris = 0;
    for (let garde = 0; garde < p.cols * p.rows + 2; garde++) {
        const gratuit = coups(etat).find(c => fermerait(etat, c).length > 0);
        if (!gratuit) break;
        const avant = etat.score.B + etat.score.N;
        etat = jouer(etat, gratuit);
        pris += etat.score.B + etat.score.N - avant;
    }
    return pris;
}
