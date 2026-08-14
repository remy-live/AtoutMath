// LES DÉDALES — le noyau : la forme, les murs, et le dessin caché.
//
// Deux labyrinthes différents vivent ici, et c'est le second qui a commandé le
// module.
//
//   · LE DÉDALE DE FORME. La grille n'est plus un rectangle : un cœur, une
//     étoile, un rond. On creuse un arbre couvrant sur les cases retenues par
//     le masque, ce qui donne un labyrinthe PARFAIT — entre deux cases, un
//     chemin et un seul.
//
//   · LE DÉDALE QUI DESSINE. Le chemin de la sortie N'EST PAS quelconque :
//     c'est un dessin, tracé d'un seul trait. On le creuse d'abord, puis on
//     greffe des impasses tout autour. Le labyrinthe reste parfait, donc la
//     solution est unique — et cette solution unique EST le dessin. L'élève ne
//     peut pas le voir en arrivant : il apparaît sous ses pas.
//
// L'INVARIANT QUI FAIT TOUT TENIR : le graphe des passages est un ARBRE. Pas
// de cycle, donc pas de second chemin, donc le dessin ne peut pas être raté
// par un raccourci. Chaque fonction de creusement le préserve, et les tests le
// vérifient case par case plutôt que de le supposer.
//
// LE DESSIN NE SE CROISE JAMAIS LUI-MÊME. Un trait qui repasse sur une case
// déjà tracée créerait un cycle : le labyrinthe cesserait d'être un arbre, la
// solution ne serait plus unique, et l'on pourrait « finir » sans avoir
// dessiné. C'est vérifié à la fabrication, pas espéré.

export const cle = (x, y) => `${x},${y}`;
export const VOISINS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** L'arête entre deux cases, écrite pareil dans les deux sens. */
export function arete(a, b) {
    const [p, q] = [cle(a[0], a[1]), cle(b[0], b[1])].sort();
    return `${p}|${q}`;
}

// --- Les formes ---------------------------------------------------------------
//
// Un masque dit quelles cases font partie du dédale. Les coordonnées sont
// ramenées à [-1, 1] pour que la même formule marche à toutes les tailles.

export const FORMES = {
    rectangle: {
        id: 'rectangle', nom: 'Rectangle', masque: () => true
    },
    rond: {
        id: 'rond', nom: 'Rond',
        masque: (u, v) => u * u + v * v <= 1.02
    },
    coeur: {
        id: 'coeur', nom: 'Cœur',
        // La cardioïde d'école : (x² + y² − 1)³ ≤ x² y³, avec y retourné
        // puisque l'écran descend.
        masque: (u, v) => {
            const y = -v * 1.15, x = u * 1.15;
            const t = x * x + y * y - 1;
            return t * t * t - x * x * y * y * y <= 0;
        }
    },
    losange: {
        id: 'losange', nom: 'Losange',
        masque: (u, v) => Math.abs(u) + Math.abs(v) <= 1.02
    },
    croix: {
        id: 'croix', nom: 'Croix',
        masque: (u, v) => Math.abs(u) <= 0.38 || Math.abs(v) <= 0.38
    },
    etoile: {
        id: 'etoile', nom: 'Étoile',
        // Une étoile à cinq branches : le rayon admis oscille avec l'angle.
        masque: (u, v) => {
            const r = Math.hypot(u, v);
            if (r < 0.01) return true;
            const a = Math.atan2(v, u);
            const dent = Math.cos(5 * a - Math.PI / 2);
            return r <= 0.42 + 0.58 * Math.max(0, dent);
        }
    }
};

export const NOMS_FORMES = Object.keys(FORMES);

/** Les cases retenues par une forme, pour une grille donnée. */
export function cellulesDeForme(forme, cols, lignes) {
    const f = FORMES[forme] || FORMES.rectangle;
    const dedans = new Set();
    for (let y = 0; y < lignes; y++) {
        for (let x = 0; x < cols; x++) {
            // Le centre de la case, ramené à [-1, 1].
            const u = ((x + 0.5) / cols) * 2 - 1;
            const v = ((y + 0.5) / lignes) * 2 - 1;
            if (f.masque(u, v)) dedans.add(cle(x, y));
        }
    }
    return plusGrandeRegion(dedans);
}

/**
 * La plus grande partie d'un seul tenant.
 *
 * Une étoile ou une croix peut laisser des îlots que le masque retient mais
 * qu'aucun chemin n'atteint : un labyrinthe avec des cases inaccessibles n'est
 * pas un labyrinthe, c'est un bogue qu'on découvre en jouant.
 */
function plusGrandeRegion(dedans) {
    const vus = new Set();
    let meilleure = new Set();
    for (const k of dedans) {
        if (vus.has(k)) continue;
        const region = new Set([k]);
        const pile = [k.split(',').map(Number)];
        vus.add(k);
        while (pile.length) {
            const [x, y] = pile.pop();
            for (const [dx, dy] of VOISINS) {
                const n = cle(x + dx, y + dy);
                if (!dedans.has(n) || vus.has(n)) continue;
                vus.add(n); region.add(n);
                pile.push([x + dx, y + dy]);
            }
        }
        if (region.size > meilleure.size) meilleure = region;
    }
    return meilleure;
}

// --- Le creusement ---------------------------------------------------------------

/**
 * Creuse un arbre couvrant sur `dedans`, en partant de `racine`.
 *
 * Parcours en profondeur au hasard : c'est ce qui donne des couloirs longs et
 * sinueux plutôt que l'aspect brouillon d'un Kruskal. On n'ouvre JAMAIS vers
 * une case déjà atteinte — c'est ainsi que l'absence de cycle est garantie par
 * construction, et non vérifiée après coup.
 */
export function creuser(dedans, racine, rng, passages = new Set()) {
    const vus = new Set([cle(racine[0], racine[1])]);
    const pile = [racine];
    while (pile.length) {
        const [x, y] = pile[pile.length - 1];
        const libres = rng.shuffle(VOISINS.slice())
            .map(([dx, dy]) => [x + dx, y + dy])
            .filter(n => dedans.has(cle(n[0], n[1])) && !vus.has(cle(n[0], n[1])));
        if (!libres.length) { pile.pop(); continue; }
        const n = libres[0];
        passages.add(arete([x, y], n));
        vus.add(cle(n[0], n[1]));
        pile.push(n);
    }
    return { passages, vus };
}

/** Peut-on passer d'une case à sa voisine ? */
export const ouvert = (etat, a, b) => etat.passages.has(arete(a, b));

/** Les cases où l'on peut aller depuis ici. */
export function sorties(etat, [x, y]) {
    return VOISINS
        .map(([dx, dy]) => [x + dx, y + dy])
        .filter(n => etat.dans.has(cle(n[0], n[1])) && ouvert(etat, [x, y], n));
}

/**
 * L'unique chemin d'une case à une autre.
 * Dans un arbre il n'y en a qu'un : le trouver, c'est le prouver.
 */
export function chemin(etat, depart, arrivee) {
    const but = cle(arrivee[0], arrivee[1]);
    const vus = new Set([cle(depart[0], depart[1])]);
    const pile = [[depart]];
    while (pile.length) {
        const route = pile.pop();
        const ici = route[route.length - 1];
        if (cle(ici[0], ici[1]) === but) return route;
        for (const n of sorties(etat, ici)) {
            const k = cle(n[0], n[1]);
            if (vus.has(k)) continue;
            vus.add(k);
            pile.push(route.concat([n]));
        }
    }
    return null;
}

/** La case la plus éloignée d'une autre, et sa distance. */
export function laPlusLoin(etat, depart) {
    const vus = new Map([[cle(depart[0], depart[1]), 0]]);
    let file = [depart], loin = depart, d = 0;
    while (file.length) {
        const suite = [];
        d++;
        for (const c of file) {
            for (const n of sorties(etat, c)) {
                const k = cle(n[0], n[1]);
                if (vus.has(k)) continue;
                vus.set(k, d);
                loin = n;
                suite.push(n);
            }
        }
        file = suite;
    }
    return { case: loin, distance: vus.get(cle(loin[0], loin[1])) };
}

/**
 * Un dédale d'une forme donnée.
 *
 * Le départ et l'arrivée sont les DEUX CASES LES PLUS ÉLOIGNÉES du dédale (on
 * cherche le plus loin d'un point quelconque, puis le plus loin de celui-là :
 * le diamètre d'un arbre s'obtient ainsi). Les tirer au hasard donnerait un
 * jour deux cases voisines, et un labyrinthe qui se finit en un pas.
 */
export function creerDedale({ rng, forme = 'rond', cols = 15, lignes = 15 } = {}) {
    const dans = cellulesDeForme(forme, cols, lignes);
    const premiere = [...dans][0].split(',').map(Number);
    const { passages } = creuser(dans, premiere, rng);
    const etat = { cols, lignes, forme, dans, passages };
    const a = laPlusLoin(etat, premiere).case;
    const b = laPlusLoin(etat, a).case;
    etat.depart = a;
    etat.arrivee = b;
    etat.solution = chemin(etat, a, b);
    etat.dessin = null;
    return etat;
}

// --- Les dessins d'un seul trait ---------------------------------------------------
//
// Chaque dessin est un programme de tortue : un départ, puis des segments
// « direction, longueur ». Écrire les cases une à une serait illisible et
// intenable ; ici l'adjacence est garantie par construction, et il ne reste
// qu'à vérifier que le trait ne se recoupe pas.

const D = { d: [1, 0], g: [-1, 0], h: [0, -1], b: [0, 1] };

export const DESSINS = {
    marches: {
        id: 'marches', nom: 'Un escalier',
        depart: [1, 11], trace: [['h', 2], ['d', 2], ['h', 2], ['d', 2], ['h', 2],
            ['d', 2], ['h', 2], ['d', 2]]
    },
    creneau: {
        id: 'creneau', nom: 'Un château',
        depart: [1, 9], trace: [['h', 4], ['d', 2], ['b', 2], ['d', 2], ['h', 2],
            ['d', 2], ['b', 2], ['d', 2], ['h', 2], ['d', 2], ['b', 4]]
    },
    zigzag: {
        id: 'zigzag', nom: 'L\'éclair',
        depart: [2, 1], trace: [['b', 3], ['d', 3], ['b', 3], ['g', 3], ['b', 3],
            ['d', 4], ['h', 2]]
    },
    peigne: {
        id: 'peigne', nom: 'Le peigne',
        depart: [1, 11], trace: [['h', 8], ['d', 2], ['b', 8], ['d', 2], ['h', 8],
            ['d', 2], ['b', 8], ['d', 2], ['h', 8]]
    },
    spirale: {
        id: 'spirale', nom: 'La spirale',
        depart: [7, 6], trace: [['d', 2], ['b', 2], ['g', 4], ['h', 4], ['d', 6],
            ['b', 6], ['g', 8]]
    },
    serpent: {
        id: 'serpent', nom: 'Le serpent',
        depart: [1, 1], trace: [['d', 10], ['b', 3], ['g', 10], ['b', 3], ['d', 10],
            ['b', 3], ['g', 10]]
    }
};

export const NOMS_DESSINS = Object.keys(DESSINS);

/** Les cases d'un dessin, dans l'ordre du tracé. */
export function cellulesDeDessin(dessin) {
    const d = DESSINS[dessin] || DESSINS.marches;
    const cases = [d.depart.slice()];
    let [x, y] = d.depart;
    for (const [sens, n] of d.trace) {
        const [dx, dy] = D[sens];
        for (let k = 0; k < n; k++) {
            x += dx; y += dy;
            cases.push([x, y]);
        }
    }
    return cases;
}

/** Le trait se recoupe-t-il ? Un dessin fautif casserait l'unicité. */
export function traitSimple(dessin) {
    const cases = cellulesDeDessin(dessin);
    return new Set(cases.map(c => cle(c[0], c[1]))).size === cases.length;
}

/** L'encombrement d'un dessin, pour dimensionner la grille. */
export function boiteDessin(dessin) {
    const cases = cellulesDeDessin(dessin);
    const xs = cases.map(c => c[0]), ys = cases.map(c => c[1]);
    return {
        x0: Math.min(...xs), x1: Math.max(...xs),
        y0: Math.min(...ys), y1: Math.max(...ys)
    };
}

/**
 * UN DÉDALE DONT LA SOLUTION EST UN DESSIN.
 *
 * On creuse d'abord le trait — il devient un couloir sans embranchement — puis
 * on greffe l'arbre couvrant du reste EN PARTANT DE CE COULOIR. Les branches
 * ajoutées ne peuvent donc que pendre du chemin : ce sont des impasses, et le
 * chemin du départ à l'arrivée reste le trait, tout le trait, rien que lui.
 *
 * `marge` : les cases autour du dessin, celles qui portent les impasses. Sans
 * elles, le dessin serait le labyrinthe entier et se lirait d'un coup d'œil.
 */
export function creerDedaleDessin({ rng, dessin = 'marches', marge = 2 } = {}) {
    const trait = cellulesDeDessin(dessin);
    const b = boiteDessin(dessin);
    // On recale le dessin dans le coin, puis on ajoute la marge tout autour.
    const decale = trait.map(([x, y]) => [x - b.x0 + marge, y - b.y0 + marge]);
    const cols = (b.x1 - b.x0 + 1) + marge * 2;
    const lignes = (b.y1 - b.y0 + 1) + marge * 2;

    const dans = new Set();
    for (let y = 0; y < lignes; y++) for (let x = 0; x < cols; x++) dans.add(cle(x, y));

    // 1. Le couloir du dessin.
    const passages = new Set();
    for (let i = 1; i < decale.length; i++) passages.add(arete(decale[i - 1], decale[i]));

    // 2. Les impasses, greffées depuis le couloir. On lance le parcours en
    //    déclarant TOUTES les cases du trait déjà atteintes : aucune arête ne
    //    pourra donc relier deux points du couloir, et l'arbre reste un arbre.
    const vus = new Set(decale.map(c => cle(c[0], c[1])));
    const pile = decale.slice();
    while (pile.length) {
        const i = rng.int(0, pile.length - 1);
        const [x, y] = pile[i];
        const libres = rng.shuffle(VOISINS.slice())
            .map(([dx, dy]) => [x + dx, y + dy])
            .filter(n => dans.has(cle(n[0], n[1])) && !vus.has(cle(n[0], n[1])));
        if (!libres.length) { pile.splice(i, 1); continue; }
        const n = libres[0];
        passages.add(arete([x, y], n));
        vus.add(cle(n[0], n[1]));
        pile.push(n);
    }

    const etat = {
        cols, lignes, forme: 'rectangle', dans, passages,
        depart: decale[0], arrivee: decale[decale.length - 1],
        dessin: { id: dessin, nom: (DESSINS[dessin] || DESSINS.marches).nom, cases: decale }
    };
    etat.solution = chemin(etat, etat.depart, etat.arrivee);
    return etat;
}

// --- Le déplacement --------------------------------------------------------------

/**
 * Un pas dans une direction, si le mur le permet.
 * @returns {{ok:boolean, position:number[], arrive?:boolean}}
 */
export function avancer(etat, position, sens) {
    const d = D[sens];
    if (!d) return { ok: false, position };
    const n = [position[0] + d[0], position[1] + d[1]];
    if (!etat.dans.has(cle(n[0], n[1])) || !ouvert(etat, position, n)) {
        return { ok: false, position, mur: true };
    }
    return {
        ok: true, position: n,
        arrive: n[0] === etat.arrivee[0] && n[1] === etat.arrivee[1]
    };
}

/** La part du dessin déjà parcourue — ce qui apparaît sous les pas. */
export function partDessin(etat, visitees) {
    if (!etat.dessin) return 0;
    const faites = etat.dessin.cases.filter(c => visitees.has(cle(c[0], c[1]))).length;
    return Math.round((faites / etat.dessin.cases.length) * 100);
}
