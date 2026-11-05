// BUMPY — la balle qui ne s'arrête jamais de rebondir.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 5 novembre : « quand j'étais jeune, je jouais à un jeu Bumpy, je
// l'adorai, c'est un chouette jeu pour ceux qui vont vite et ca fait les
// réflexes ». Puis, devant les deux formes proposées : « le A seulement, le 3
// j'aimais tout ».
//
// Bumpy, Loriciels, 1989. Une balle rebondit toute seule ; on ne la dirige
// qu'à GAUCHE et à DROITE. Il faut ramasser tous les objets d'un tableau pour
// que la sortie s'ouvre. Certaines plateformes se cassent sous le rebond,
// d'autres brûlent — et la goutte d'eau est le seul moyen de les traverser.
//
// ── CE N'EST PAS UN EXERCICE DE MATHÉMATIQUES, ET C'EST ÉCRIT ──────────────
//
// « le A seulement » : pas de nombres sur les plateformes. C'est une
// RÉCRÉATION, rangée comme Les Petites Ailes dans « Défis → Adresse et
// réflexes », sans compétence et hors progression. Lui en accrocher une
// mentirait deux fois : à l'élève, qui croirait travailler quelque chose, et au
// professeur, dont le bilan se remplirait de lignes qui ne mesurent rien.
//
// Rémy l'avait déjà tranché le 2 novembre, sur Les Petites Ailes : « n'en fais
// pas un jeu mathématiques […] c'est plus un jeu de réflexe ».
//
// ── POURQUOI LE MONDE VIT ICI ET NON DANS LE JEU ───────────────────────────
//
// `avancer` est une fonction : un état, une durée, une touche, et elle rend
// l'état suivant plus la liste de ce qui vient d'arriver. Elle ne connaît ni
// toile, ni clavier, ni minuteur — donc elle s'éprouve sous Node, à la
// milliseconde près, sans navigateur. C'est la seule façon de garantir qu'une
// balle ne traverse pas un mur : à l'œil, on ne voit que les fois où elle le
// fait sous nos yeux.

/** Les tuiles d'un tableau, telles qu'on les écrit. */
export const TUILE = {
    VIDE: '.', MUR: '#', CASSABLE: '=', FEU: '~',
    OBJET: 'o', EAU: 'w', SORTIE: 'E', DEPART: 'B'
};

/** Un côté de case, en pixels. Tout le reste en découle. */
export const CASE = 32;

/** Le rayon de la balle. Un peu moins d'une demi-case : elle doit passer dans
 *  un couloir d'une case sans frotter les deux bords à la fois. */
export const RAYON = 11;

/**
 * LA PHYSIQUE, ET POURQUOI CES TROIS NOMBRES-LÀ.
 *
 * `REBOND` est une VITESSE, pas un coefficient de restitution : la balle
 * repart toujours à la même vitesse vers le haut, quelle que soit celle avec
 * laquelle elle est arrivée. C'est ce qui fait Bumpy — le rebond est une
 * constante du monde, pas une conséquence de la chute. Avec un coefficient,
 * la balle s'amortit, finit par ramper, et le jeu meurt ; avec une vitesse
 * fixe, elle rebondit éternellement à la même hauteur et l'on peut compter
 * dessus. MESURÉ : 420 px/s sous 1500 px/s² donnent un saut de 59 px, soit
 * presque deux cases — la hauteur qu'on franchit d'un rebond.
 *
 * `VX` EST DIRECTE, et c'est la seconde moitié du jeu : on ne pousse pas la
 * balle, on la DIRIGE, en l'air comme au sol. Une inertie horizontale rendrait
 * le pilotage mou et les couloirs d'une case infranchissables.
 */
export const GRAVITE = 1500;
export const REBOND = 420;
export const VX = 190;

/**
 * LES TABLEAUX. Vingt cases sur quatorze — la proportion d'un écran de 1989,
 * et surtout un plateau qu'on embrasse d'un coup d'œil : Bumpy ne défile pas,
 * tout le tableau est là, et c'est ce qui permet de prévoir où l'on retombe.
 *
 * ILS SONT ÉCRITS À LA MAIN, et ce n'est pas de la paresse : un tableau tiré au
 * hasard est soit facile, soit injouable, et l'on ne sait jamais lequel avant
 * d'y avoir joué. Le plaisir de Bumpy tient à ce qu'un humain a posé chaque
 * plateforme en sachant d'où l'on viendrait.
 */
export const NIVEAUX = [
    {
        nom: 'Les premiers rebonds',
        lignes: [
            '####################',
            '#..................#',
            '#.......o..........#',
            '#....########......#',
            '#..................#',
            '#..o...........o...#',
            '#.####.......####..#',
            '#..................#',
            '#.........B........#',
            '#......#######.....#',
            '#..................#',
            '#.o..............E.#',
            '#.####.........#####',
            '####################'
        ]
    },
    {
        nom: 'Le plancher qui cède',
        lignes: [
            '####################',
            '#..................#',
            '#...o.........o....#',
            '#..====......====..#',
            '#..................#',
            '#........B.........#',
            '#.....########.....#',
            '#..................#',
            '#.o..............o.#',
            '#.===..........===.#',
            '#..................#',
            '#........E.........#',
            '#......#######.....#',
            '####################'
        ]
    },
    {
        nom: 'La goutte et le feu',
        lignes: [
            '####################',
            '#..................#',
            '#..w..........o....#',
            '#.####.......####..#',
            '#..................#',
            '#.......B..........#',
            '#....#########.....#',
            '#..................#',
            '#..o..........o....#',
            '#.####.......####..#',
            '#..................#',
            '#........E.........#',
            '#.....~~~#~~~~.....#',
            '####################'
        ]
    },
    {
        nom: 'Le puits',
        lignes: [
            '####################',
            '#...o..........o...#',
            '#..###........###..#',
            '#..................#',
            '#.......B..........#',
            '#....=======.......#',
            '#..................#',
            '#..w...............#',
            '#.###.......####...#',
            '#..................#',
            '#......o......o....#',
            '#....~~~~....~~~~..#',
            '#.........E........#',
            '####################'
        ]
    }
];

/** Lit un tableau écrit en lignes et rend un monde jouable. */
export function lireNiveau(def) {
    const lignes = def.lignes.map(l => l.split(''));
    const hauteur = lignes.length, largeur = lignes[0].length;
    let depart = null, sortie = null;
    let objets = 0;
    for (let r = 0; r < hauteur; r++) {
        for (let c = 0; c < largeur; c++) {
            const t = lignes[r][c];
            if (t === TUILE.DEPART) { depart = { c, r }; lignes[r][c] = TUILE.VIDE; }
            if (t === TUILE.SORTIE) sortie = { c, r };
            if (t === TUILE.OBJET) objets++;
        }
    }
    return { nom: def.nom, largeur, hauteur, cases: lignes, depart, sortie, objets };
}

/** L'état de départ : la balle au point marqué, immobile et sans goutte. */
export function etatInitial(niveau) {
    return {
        x: (niveau.depart.c + 0.5) * CASE,
        y: (niveau.depart.r + 0.5) * CASE,
        vx: 0, vy: 0,
        restants: niveau.objets,
        eau: false,
        ouverte: niveau.objets === 0,
        fini: false, mort: false
    };
}

const tuileA = (n, c, r) => (
    (r < 0 || r >= n.hauteur || c < 0 || c >= n.largeur) ? TUILE.MUR : n.cases[r][c]);

/** Une tuile arrête-t-elle la balle ? Le feu arrête aussi — il tue au contact. */
const solide = (t) => t === TUILE.MUR || t === TUILE.CASSABLE || t === TUILE.FEU;

/** Les cases que le disque de la balle touche à (x, y). */
function casesTouchees(n, x, y) {
    const c0 = Math.floor((x - RAYON) / CASE), c1 = Math.floor((x + RAYON) / CASE);
    const r0 = Math.floor((y - RAYON) / CASE), r1 = Math.floor((y + RAYON) / CASE);
    const out = [];
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) out.push({ c, r, t: tuileA(n, c, r) });
    return out;
}

/**
 * UN PAS DU MONDE.
 *
 * ── POURQUOI ON DÉPLACE EN DEUX TEMPS, X PUIS Y ────────────────────────────
 *
 * Déplacer en diagonale et corriger ensuite colle la balle dans les angles :
 * elle entre d'un pixel dans le coin d'une plateforme, on la repousse dans
 * l'axe le plus profond, et selon l'arrondi elle est renvoyée tantôt de côté,
 * tantôt vers le haut. En traitant X d'abord, puis Y, chaque axe a sa propre
 * réponse et il n'y a plus d'angle ambigu. C'est le remède classique, et il
 * tient en deux boucles.
 *
 * ── ET LE PAS EST BORNÉ ────────────────────────────────────────────────────
 *
 * Un onglet remis au premier plan rend un `dt` d'une seconde ou plus ; la
 * balle avancerait alors de quatre cases d'un coup et traverserait un mur sans
 * le voir. On plafonne à 25 ms : le monde ralentit plutôt que de se trouer.
 *
 * @param {object} etat
 * @param {object} n       le niveau lu
 * @param {number} dt      en secondes
 * @param {number} entree  -1 à gauche, +1 à droite, 0 immobile
 * @returns {{etat:object, faits:string[]}}
 */
export function avancer(etat, n, dt, entree) {
    const faits = [];
    if (etat.fini || etat.mort) return { etat, faits };
    const pas = Math.min(dt, 0.025);
    const e = { ...etat };

    e.vx = (entree || 0) * VX;
    e.vy += GRAVITE * pas;

    // ── X ──
    e.x += e.vx * pas;
    for (const { c, r, t } of casesTouchees(n, e.x, e.y)) {
        if (!solide(t)) continue;
        if (t === TUILE.FEU && !e.eau) { e.mort = true; faits.push('feu'); return { etat: e, faits }; }
        if (t === TUILE.FEU) continue;
        e.x = e.vx > 0 ? (c * CASE) - RAYON - 0.01 : ((c + 1) * CASE) + RAYON + 0.01;
        e.vx = 0;
    }

    // ── Y ──
    e.y += e.vy * pas;
    for (const { c, r, t } of casesTouchees(n, e.x, e.y)) {
        if (!solide(t)) continue;
        if (t === TUILE.FEU && !e.eau) { e.mort = true; faits.push('feu'); return { etat: e, faits }; }
        if (t === TUILE.FEU) continue;
        if (e.vy > 0) {
            e.y = (r * CASE) - RAYON - 0.01;
            // LE REBOND EST UNE CONSTANTE DU MONDE : la balle repart toujours
            // à la même vitesse, quelle que soit celle avec laquelle elle est
            // arrivée. Voir `REBOND`.
            e.vy = -REBOND;
            faits.push('rebond');
            if (t === TUILE.CASSABLE) {
                n.cases[r][c] = TUILE.VIDE;
                faits.push('casse');
            }
        } else {
            e.y = ((r + 1) * CASE) + RAYON + 0.01;
            e.vy = 0;
        }
    }

    // ── CE QU'ON RAMASSE EN PASSANT ──
    for (const { c, r, t } of casesTouchees(n, e.x, e.y)) {
        if (t === TUILE.OBJET) {
            n.cases[r][c] = TUILE.VIDE;
            e.restants--;
            faits.push('objet');
            if (e.restants <= 0 && !e.ouverte) { e.ouverte = true; faits.push('ouverte'); }
        } else if (t === TUILE.EAU) {
            n.cases[r][c] = TUILE.VIDE;
            e.eau = true;
            faits.push('eau');
        } else if (t === TUILE.SORTIE && e.ouverte) {
            e.fini = true;
            faits.push('sortie');
        }
    }
    return { etat: e, faits };
}
