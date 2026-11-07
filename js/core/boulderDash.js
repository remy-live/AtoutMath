// BOULDER DASH — on creuse, les rochers tombent, et il faut les voir venir.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 5 novembre : « et j'adorai aussi boulder dash ». Puis, devant les deux
// formes proposées : « B — la partie ».
//
// ── CE N'EST PAS LA MÊME FAMILLE QUE BUMPY, ET C'EST ÉCRIT ─────────────────
//
// Bumpy est un jeu de RÉFLEXE : on ne peut pas s'arrêter, la balle retombe,
// il faut avoir décidé avant. Boulder Dash est un jeu d'ANTICIPATION : on
// creuse, un rocher perd son appui, et il nous écrase trois secondes plus
// tard — à l'endroit où l'on a eu l'idée d'aller. Il faut se représenter ce
// qui va arriver AVANT de le déclencher.
//
// RÉMY A CHOISI LA PARTIE, PAS L'ÉNIGME : grand tableau, chronomètre, trois
// vies, rien de noté. C'est la récréation de 1984, rangée comme Bumpy et Les
// Petites Ailes en « Défis → Adresse et réflexes ». Lui accrocher une
// compétence mentirait deux fois : à l'élève, qui croirait travailler quelque
// chose, et au professeur, dont le bilan se remplirait de lignes qui ne
// mesurent rien.
//
// ── POURQUOI LE MONDE VIT ICI ET NON DANS LE JEU ───────────────────────────
//
// `avancer` est une fonction : un état, une direction, et elle rend l'état
// suivant plus la liste de ce qui vient d'arriver. Elle ne connaît ni toile,
// ni clavier, ni minuteur — donc `tools/boulderJouable.mjs` peut faire jouer
// un robot et dire si un tableau se finit. C'est la seule façon de savoir
// qu'un tableau dessiné à la main est jouable : à l'œil, on ne voit que les
// fois où l'on y arrive.

/** Les tuiles d'un tableau, telles qu'on les écrit. */
export const TUILE = {
    VIDE: ' ', TERRE: '.', ROCHE: '#', ROCHER: 'o',
    DIAMANT: 'd', SORTIE: 'E', DEPART: 'P'
};

/** Un côté de case, en pixels. Tout le dessin en découle. */
export const CASE = 36;

/** Un pas du monde, en millisecondes. Le joueur avance d'une case par pas. */
export const TIC_MS = 150;

/**
 * LES TABLEAUX.
 *
 * `diamants` est le nombre qu'il faut ramasser pour que la porte s'ouvre — il
 * y en a toujours DAVANTAGE sur le plateau. C'est ce qui rend le tableau
 * jouable de plusieurs façons : on prend les faciles, on laisse ceux qui sont
 * sous un rocher, et l'on choisit. Exiger tous les diamants ferait de chaque
 * tableau un chemin unique à retrouver.
 *
 * `secondes` est le temps accordé. Il est large : le chronomètre est là pour
 * empêcher de rester immobile, pas pour départager au dixième.
 */
export const NIVEAUX = [
    {
        nom: 'La mine', diamants: 5, secondes: 90,
        // Peu de rochers, et aucun au-dessus d'un diamant : on apprend à
        // creuser, à ramasser, et à voir qu'un rocher privé d'appui tombe.
        lignes: [
            '####################',
            '#P...d......o.....E#',
            '#.....#....d.......#',
            '#..d..#......o.....#',
            '#.....#............#',
            '#..o..####...d.....#',
            '#..................#',
            '#....d....o........#',
            '#......#####.......#',
            '#..d...............#',
            '#......o......d....#',
            '#..................#',
            '#...d.......o......#',
            '####################'
        ]
    },
    {
        nom: 'Les rochers', diamants: 6, secondes: 100,
        // DES DIAMANTS SOUS DES ROCHERS. Les prendre par en dessous fait
        // tomber la pierre sur la tête : il faut creuser à côté, laisser le
        // rocher descendre, puis passer. C'est la leçon du jeu.
        lignes: [
            '####################',
            '#P.....o...o......E#',
            '#...o..d...d..o....#',
            '#...d.........d....#',
            '#.....####.........#',
            '#..o....d....o.....#',
            '#..d.........d.....#',
            '#........###.......#',
            '#...o......o...o...#',
            '#...d......d...d...#',
            '#..................#',
            '#.....o.....o......#',
            '#.....d.....d......#',
            '####################'
        ]
    },
    {
        nom: 'Le couloir', diamants: 6, secondes: 110,
        // ON POUSSE LES ROCHERS. Un couloir d'une case bouché par une pierre
        // ne se contourne pas : il se pousse, et seulement si la case d'après
        // est libre. Un rocher poussé dans un cul-de-sac ferme le passage pour
        // de bon — d'où le second couloir, qui laisse une seconde chance.
        lignes: [
            '####################',
            '#P....#d....#.....E#',
            '#..o..#.....#..o...#',
            '#.....#..d..#......#',
            '#..####...####..####',
            '#....o.......o.....#',
            '#....d...d...d.....#',
            '####..#######..#####',
            '#....o.......o.....#',
            '#..d.....d.....d...#',
            '#....####.####.....#',
            '#..o.....d.....o...#',
            '#...d.........d....#',
            '####################'
        ]
    }
];

/** Lit un tableau écrit en lignes et rend un monde jouable. */
export function lireNiveau(def) {
    const lignes = def.lignes.map(l => l.split(''));
    const hauteur = lignes.length, largeur = lignes[0].length;
    let depart = null, sortie = null, diamants = 0;
    for (let r = 0; r < hauteur; r++) {
        for (let c = 0; c < largeur; c++) {
            const t = lignes[r][c];
            if (t === TUILE.DEPART) { depart = { c, r }; lignes[r][c] = TUILE.VIDE; }
            if (t === TUILE.SORTIE) sortie = { c, r };
            if (t === TUILE.DIAMANT) diamants++;
        }
    }
    return {
        nom: def.nom, largeur, hauteur, cases: lignes, depart, sortie,
        diamants, ilEnFaut: def.diamants, secondes: def.secondes
    };
}

const tuileA = (n, c, r) => (
    (r < 0 || r >= n.hauteur || c < 0 || c >= n.largeur) ? TUILE.ROCHE : n.cases[r][c]);

/** Ce qui tombe : les rochers et les diamants. */
const tombe = (t) => t === TUILE.ROCHER || t === TUILE.DIAMANT;

/** Ce sur quoi une pierre ROULE : le rond, pas le carré. */
const rond = (t) => t === TUILE.ROCHER || t === TUILE.DIAMANT;

/** L'état de départ. */
export function etatInitial(niveau) {
    return {
        c: niveau.depart.c, r: niveau.depart.r,
        pris: 0, ouverte: false, fini: false, mort: false,
        // CE QUI TOMBE DÉJÀ, en clés « colonne,ligne ». Une pierre qui vient
        // de se mettre en route écrase ; une pierre posée, non — et c'est
        // toute la différence entre « passer sous un rocher » et « creuser
        // dessous ».
        enChute: []
    };
}

/**
 * UN PAS DU MONDE.
 *
 * ── L'ORDRE COMPTE, ET IL EST CELUI-CI ─────────────────────────────────────
 *
 *   1. LE JOUEUR BOUGE. Il creuse la terre, ramasse un diamant, pousse un
 *      rocher si la case d'après est libre, ou ne bouge pas.
 *   2. LES PIERRES TOMBENT, du bas vers le haut — sinon une pierre qui vient
 *      de descendre serait réexaminée dans le même pas et tomberait de deux
 *      cases d'un coup.
 *   3. UNE PIERRE QUI TOMBE ET QUI ARRIVE SUR LE JOUEUR L'ÉCRASE. Une pierre
 *      POSÉE, non : on passe dessous sans crainte. C'est cette distinction qui
 *      fait tout le jeu — le danger n'est jamais la pierre, c'est le moment où
 *      on lui retire son appui.
 *
 * @param {object} etat
 * @param {object} n     le niveau lu (MODIFIÉ)
 * ── ET L'ON DIT QUELLES PIERRES ONT BOUGÉ ──────────────────────────────────
 *
 * `mouvements` donne, pour chaque pierre, d'où elle vient et où elle va. Ce
 * n'est pas du confort : sans cette liste, l'écran ne peut que redessiner la
 * grille, et les rochers SAUTENT d'une case à l'autre. On a déjà payé cette
 * leçon sur le Pont et la lampe — Rémy : « il faudrait peut être voir les
 * animations ». Le monde sait ce qui a bougé ; le dessin ne peut pas le
 * deviner sans ambiguïté. Il le dit donc.
 *
 * @param {{dc:number,dr:number}|null} dir
 * @returns {{etat:object, faits:string[], mouvements:Array}}
 */
export function avancer(etat, n, dir) {
    const faits = [];
    const mouvements = [];
    if (etat.fini || etat.mort) return { etat, faits, mouvements };
    const e = { ...etat, enChute: etat.enChute.slice() };

    // ── 1. LE JOUEUR ──
    if (dir && (dir.dc || dir.dr)) {
        const c = e.c + dir.dc, r = e.r + dir.dr;
        const t = tuileA(n, c, r);
        if (t === TUILE.TERRE || t === TUILE.VIDE) {
            if (t === TUILE.TERRE) faits.push('creuse');
            n.cases[r][c] = TUILE.VIDE;
            e.c = c; e.r = r;
        } else if (t === TUILE.DIAMANT) {
            n.cases[r][c] = TUILE.VIDE;
            e.c = c; e.r = r;
            e.pris++;
            faits.push('diamant');
            if (e.pris >= n.ilEnFaut && !e.ouverte) { e.ouverte = true; faits.push('ouverte'); }
        } else if (t === TUILE.ROCHER && dir.dr === 0) {
            // ON NE POUSSE QU'À L'HORIZONTALE : pousser vers le haut n'a pas
            // de sens, et pousser vers le bas reviendrait à se faire tomber
            // une pierre sur la tête volontairement.
            const apres = tuileA(n, c + dir.dc, r);
            if (apres === TUILE.VIDE) {
                n.cases[r][c + dir.dc] = TUILE.ROCHER;
                n.cases[r][c] = TUILE.VIDE;
                e.c = c; e.r = r;
                faits.push('pousse');
            } else faits.push('bloque');
        } else if (t === TUILE.SORTIE && e.ouverte) {
            e.c = c; e.r = r;
            e.fini = true;
            faits.push('sortie');
            return { etat: e, faits, mouvements };
        } else faits.push('bloque');
    }

    // ── 2. LES PIERRES ──
    //
    // ── LE JOUEUR N'EST PAS DANS LA GRILLE, ET IL FAUT S'EN SOUVENIR ───────
    //
    // `n.cases` ne contient que le décor : la case où se tient le joueur y est
    // VIDE. Une pierre POSÉE au-dessus de lui y tombait donc, et il se
    // retrouvait À L'INTÉRIEUR du rocher — vivant, et dans la pierre.
    // MESURÉ avant correction : grille « #..o...# » sur la ligne du joueur.
    //
    // LA RÈGLE EST CELLE DE 1984, ET ELLE EST TOUT LE JEU : tant qu'on est
    // dessous, c'est NOUS qui retenons la pierre ; dès qu'on s'en va, elle
    // tombe dans la case qu'on quitte. Une pierre DÉJÀ EN ROUTE, elle, ne se
    // retient pas — et c'est elle qui écrase. Le danger n'est jamais la
    // pierre : c'est le moment où on lui retire son appui.
    const chutes = new Set(e.enChute);
    const neuves = new Set();
    /** La case est-elle occupée par le joueur ? */
    const auJoueur = (c, r) => c === e.c && r === e.r && !e.mort;
    for (let r = n.hauteur - 2; r >= 0; r--) {
        for (let c = 0; c < n.largeur; c++) {
            const t = n.cases[r][c];
            if (!tombe(t)) continue;
            const dessous = tuileA(n, c, r + 1);
            const etaitEnChute = chutes.has(`${c},${r}`);
            const retenue = auJoueur(c, r + 1) && !etaitEnChute;
            if (dessous === TUILE.VIDE && !retenue) {
                n.cases[r][c] = TUILE.VIDE;
                n.cases[r + 1][c] = t;
                neuves.add(`${c},${r + 1}`);
                mouvements.push({ t, de: { c, r }, vers: { c, r: r + 1 } });
                if (e.c === c && e.r === r + 1 && etaitEnChute) {
                    e.mort = true;
                    faits.push('ecrase');
                }
                continue;
            }
            // ELLE ROULE sur une autre pierre, à gauche d'abord puis à droite,
            // et seulement si la case de côté ET celle en diagonale sont
            // libres — sinon elle se coincerait à mi-chemin.
            //
            // ET JAMAIS SUR LE JOUEUR : une pierre qui roule arrive de côté,
            // et mourir d'un coup venu de côté, sans l'avoir déclenché, serait
            // une mort qu'on ne peut pas anticiper. Elle attend qu'il parte.
            if (rond(dessous)) {
                for (const dc of [-1, 1]) {
                    if (tuileA(n, c + dc, r) === TUILE.VIDE
                        && tuileA(n, c + dc, r + 1) === TUILE.VIDE
                        && !auJoueur(c + dc, r) && !auJoueur(c + dc, r + 1)) {
                        n.cases[r][c] = TUILE.VIDE;
                        n.cases[r][c + dc] = t;
                        neuves.add(`${c + dc},${r}`);
                        mouvements.push({ t, de: { c, r }, vers: { c: c + dc, r } });
                        break;
                    }
                }
            }
        }
    }
    e.enChute = [...neuves];
    // ET UNE PIERRE QUI S'ARRÊTE SUR LE JOUEUR NE L'ÉCRASE PAS : il n'y a pas
    // de case où elle puisse arriver qui soit la sienne sans qu'elle tombe.
    return { etat: e, faits, mouvements };
}

/** Les quatre directions, nommées comme les touches. */
export const DIRECTIONS = {
    gauche: { dc: -1, dr: 0 }, droite: { dc: 1, dr: 0 },
    haut: { dc: 0, dr: -1 }, bas: { dc: 0, dr: 1 }
};
