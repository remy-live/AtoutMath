// BUMPY — la balle qui saute en colonnes et casse ce sur quoi elle retombe.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 5 novembre : « quand j'étais jeune, je jouais à un jeu Bumpy, je
// l'adorai, c'est un chouette jeu pour ceux qui vont vite et ca fait les
// réflexes ». Puis « le A seulement, le 3 j'aimais tout ».
//
// ── CE QUE J'AVAIS ÉCRIT N'ÉTAIT PAS BUMPY ────────────────────────────────
//
// Première version : une balle à physique continue qui ramassait des
// pastilles. Elle marchait, elle était mesurée, et ce n'était pas le jeu. Sa
// correction, en voyant l'écran :
//
//   « bumpy ca cassait des blocs et ca sautait en colonnes »
//   « et il y avait des pics des bonus »
//
// Puis, sur la maquette : « Oui, c'est ça », et le but du tableau est
// D'ATTEINDRE LA SORTIE — les blocs et les bonus ne sont que des moyens.
//
// AUCUNE DE MES ÉPREUVES NE POUVAIT TROUVER CELA. Elles gardaient que le jeu
// que j'avais écrit fonctionnait, pas qu'il fût le bon jeu. La seule parade
// est de montrer une image avant d'écrire.
//
// ── LES TROIS RÈGLES, ET CE QU'ELLES FONT ENSEMBLE ─────────────────────────
//
//   1. UN REBOND = UNE COLONNE. La balle se pose sur la colonne de gauche, la
//      même, ou celle de droite. Rien entre les deux : on VOIT son coup avant
//      de le jouer, et c'est ce qui rend le jeu décidable plutôt que subi.
//   2. ON RETOMBE POUR CASSER. Le bloc sous la balle disparaît à
//      l'atterrissage. On ne peut donc pas se déplacer sans détruire : le sol
//      se dérobe derrière soi, et un trou qu'on vient de faire ne se retraverse
//      plus comme avant.
//   3. UN REBOND NE MONTE QUE DE DEUX CASES. Donc DESCENDRE EST UN
//      ENGAGEMENT : à trois cases de fond, les parois du puits qu'on vient de
//      creuser interdisent de changer de colonne. Le jeu se joue AVANT de
//      creuser — on lit la masse, on repère les pics, on choisit sa colonne.
//
// ── POURQUOI LE MONDE VIT ICI ET NON DANS LE JEU ───────────────────────────
//
// `coup` est une fonction : un état, un tableau, une direction, et elle rend
// l'état suivant, ce qui vient d'arriver, et LE CHEMIN PARCOURU case par case.
// Elle ne connaît ni toile, ni clavier, ni minuteur — donc elle s'éprouve sous
// Node, et `tools/bumpyJouable.mjs` peut chercher, pour chaque tableau, une
// suite de coups qui atteint la sortie. C'est la seule façon de savoir qu'un
// tableau dessiné à la main est finissable : à l'œil, on ne voit que les fois
// où l'on y arrive.

/** Les tuiles d'un tableau, telles qu'on les écrit. */
export const TUILE = {
    VIDE: '.', ROCHE: '#', BLOC: '=', PIC: '^',
    BONUS: '*', SORTIE: 'E', DEPART: 'B'
};

/** Un côté de case, en pixels. Tout le dessin en découle. */
export const CASE = 36;

/**
 * DE COMBIEN DE CASES UN REBOND ÉLÈVE LA BALLE.
 *
 * C'est le nombre le plus important du jeu, et il vaut deux parce que deux est
 * ce qu'il faut pour sortir d'un trou qu'on vient de faire, et pas assez pour
 * sortir d'un puits de trois. Avec trois, on remonte toujours et plus rien
 * n'engage ; avec un, on tombe dans son premier trou et l'on n'en sort plus.
 */
export const MONTEE = 2;

/**
 * LES TABLEAUX. Vingt colonnes sur quatorze lignes.
 *
 * ILS SONT ÉCRITS À LA MAIN, et ce n'est pas de la paresse : un tableau tiré
 * au hasard est soit trivial, soit injouable, et l'on ne sait jamais lequel
 * avant d'y avoir joué. `tools/bumpyJouable.mjs` dit lequel.
 *
 * LA MASSE REPOSE SUR UNE LIGNE DE PICS, et c'est une décision de sûreté, pas
 * de décor : une balle qui creuserait jusqu'à un sol incassable rebondirait
 * sur place pour l'éternité, sans mourir et sans pouvoir remonter. UN
 * CUL-DE-SAC EST PIRE QU'UNE MORT — la mort rend une vie et dit pourquoi.
 */
export const NIVEAUX = [
    {
        nom: 'Le premier puits',
        // LA BALLE PART PILE AU-DESSUS DE LA PORTE, et c'est une décision.
        //
        // Mesuré à l'écran : en ne touchant à rien, elle creuse sa colonne et
        // atteint les pics du fond en huit rebonds, soit cinq secondes. Un
        // élève qui découvre le jeu n'a pas lu le plateau en cinq secondes —
        // il meurt trois fois sans rien comprendre, et la partie est finie
        // avant d'avoir commencé.
        //
        // Ici, ne rien faire GAGNE : la balle descend, la porte s'ouvre sous
        // elle, et l'on a vu les trois choses du jeu — ça creuse, ça descend,
        // la porte est le but. Le deuxième tableau demande le premier choix.
        lignes: [
            '####################',
            '#..................#',
            '#....*...*....*....#',
            '#........B.........#',
            '#..................#',
            '#..==============..#',
            '#..==============..#',
            '#..==============..#',
            '#..==============..#',
            '#..======E=======..#',
            '#..==============..#',
            '#..==============..#',
            '#..^^^^^^^^^^^^^^..#',
            '####################'
        ]
    },
    {
        nom: 'Les pics',
        // Deux lignes de pics : la colonne de la sortie est la seule qui les
        // évite toutes les deux, et cela se LIT avant de creuser.
        lignes: [
            '####################',
            '#..................#',
            '#..*....*.....*....#',
            '#.......B..........#',
            '#..................#',
            '#..==============..#',
            '#..=^====^====^==..#',
            '#..==============..#',
            '#..====^===^=====..#',
            '#..==============..#',
            '#..=======E======..#',
            '#..==============..#',
            '#..^^^^^^^^^^^^^^..#',
            '####################'
        ]
    },
    {
        nom: 'Le bonus qui ment',
        // LE PLUS GROS TAS DE BONUS EST AU-DESSUS D'UNE COLONNE PIÉGÉE. C'est
        // le seul tableau qui demande de renoncer à quelque chose, et c'est
        // pour cela qu'il est là.
        lignes: [
            '####################',
            '#......***.........#',
            '#..................#',
            '#..........B.......#',
            '#..................#',
            '#..==============..#',
            '#..==^^^^===^^^==..#',
            '#..==============..#',
            '#..=^^===^^^===^=..#',
            '#..==============..#',
            '#..=============E..#',
            '#..==============..#',
            '#..^^^^^^^^^^^^^^..#',
            '####################'
        ]
    },
    {
        nom: 'Le damier',
        // Les pics en quinconce : il faut chercher des yeux la colonne qui
        // traverse les trois lignes, pas la chercher avec la balle.
        lignes: [
            '####################',
            '#..................#',
            '#..*...*....*...*..#',
            '#....B.............#',
            '#..................#',
            '#..==============..#',
            '#..^=^=^=^=^=^=^=..#',
            '#..==============..#',
            '#..=^=^=^==^=^=^=..#',
            '#..==============..#',
            '#..^=^=^=^=^=^=^=..#',
            '#..=========E====..#',
            '#..^^^^^^^^^^^^^^..#',
            '####################'
        ]
    }
];

/** Lit un tableau écrit en lignes et rend un monde jouable. */
export function lireNiveau(def) {
    const lignes = def.lignes.map(l => l.split(''));
    const hauteur = lignes.length, largeur = lignes[0].length;
    let depart = null, sortie = null, bonus = 0, blocs = 0;
    for (let r = 0; r < hauteur; r++) {
        for (let c = 0; c < largeur; c++) {
            const t = lignes[r][c];
            if (t === TUILE.DEPART) { depart = { c, r }; lignes[r][c] = TUILE.VIDE; }
            if (t === TUILE.SORTIE) sortie = { c, r };
            if (t === TUILE.BONUS) bonus++;
            if (t === TUILE.BLOC) blocs++;
        }
    }
    return { nom: def.nom, largeur, hauteur, cases: lignes, depart, sortie, bonus, blocs };
}

const tuileA = (n, c, r) => (
    (r < 0 || r >= n.hauteur || c < 0 || c >= n.largeur) ? TUILE.ROCHE : n.cases[r][c]);

/**
 * Une tuile arrête-t-elle la balle ?
 *
 * LES PICS NE SONT PAS SOLIDES, ET C'EST VOULU : on tombe DEDANS, on ne se
 * pose pas dessus. Un pic solide serait une plateforme qui tue au toucher,
 * c'est-à-dire une règle à deux temps ; un pic traversant est une règle à un
 * temps — n'y entre pas.
 */
const solide = (t) => t === TUILE.ROCHE || t === TUILE.BLOC;

/** L'état de départ : la balle posée au point marqué, et rien de cassé. */
export function etatInitial(niveau) {
    const e = {
        c: niveau.depart.c, r: niveau.depart.r,
        bonus: 0, fini: false, mort: false
    };
    // ELLE TOMBE D'ABORD, SANS RIEN CASSER : la poser en l'air ferait croire
    // qu'on flotte, et la faire casser au départ offrirait un coup gratuit.
    while (e.r < niveau.hauteur - 1 && !solide(tuileA(niveau, e.c, e.r + 1))) {
        e.r++;
        if (tuileA(niveau, e.c, e.r) === TUILE.PIC) { e.mort = true; break; }
    }
    return e;
}

/**
 * UN COUP : un rebond, et une colonne.
 *
 * ── CE QUE FAIT LA BALLE, DANS L'ORDRE ─────────────────────────────────────
 *
 *   1. ELLE MONTE de `MONTEE` cases dans sa colonne — ou moins, si elle se
 *      cogne la tête.
 *   2. ELLE SE DÉCALE d'une colonne, si la case visée est libre. Sinon elle
 *      reste : on ne traverse pas un mur, et l'on ne perd pas son tour.
 *   3. ELLE RETOMBE jusqu'à trouver du solide sous elle.
 *   4. ELLE CASSE le bloc sur lequel elle vient de se poser.
 *
 * TOUT CE QU'ELLE TRAVERSE COMPTE : un bonus se ramasse au vol, un pic tue au
 * vol, et la sortie se franchit au vol. C'est ce qui permet de gagner en
 * passant, et c'est plus généreux que d'exiger de s'y poser.
 *
 * @param {object} etat
 * @param {object} n    le niveau lu (MODIFIÉ : les blocs cassés disparaissent)
 * @param {number} d    -1 à gauche, 0 tout droit, +1 à droite
 * @returns {{etat:object, faits:string[], chemin:Array<{c:number,r:number}>}}
 */
export function coup(etat, n, d) {
    const faits = [];
    const chemin = [];
    if (etat.fini || etat.mort) return { etat, faits, chemin };
    const e = { ...etat };

    /** Entre dans une case, et dit si le coup s'arrête là. */
    const passer = (c, r) => {
        chemin.push({ c, r });
        const t = tuileA(n, c, r);
        if (t === TUILE.PIC) { e.mort = true; faits.push('pic'); return true; }
        if (t === TUILE.BONUS) {
            n.cases[r][c] = TUILE.VIDE;
            e.bonus++;
            faits.push('bonus');
        }
        if (t === TUILE.SORTIE) { e.fini = true; faits.push('sortie'); return true; }
        return false;
    };

    chemin.push({ c: e.c, r: e.r });

    // ── 1. ELLE MONTE ──
    let sommet = e.r;
    for (let i = 0; i < MONTEE; i++) {
        if (solide(tuileA(n, e.c, sommet - 1))) break;   // elle se cogne la tête
        sommet--;
        if (passer(e.c, sommet)) { e.r = sommet; return { etat: e, faits, chemin }; }
    }
    e.r = sommet;

    // ── 2. ELLE SE DÉCALE ──
    if (d) {
        if (solide(tuileA(n, e.c + d, sommet))) {
            faits.push('mur');
        } else {
            e.c += d;
            if (passer(e.c, sommet)) return { etat: e, faits, chemin };
        }
    }

    // ── 3. ELLE RETOMBE ──
    while (e.r < n.hauteur - 1 && !solide(tuileA(n, e.c, e.r + 1))) {
        e.r++;
        if (passer(e.c, e.r)) return { etat: e, faits, chemin };
    }

    // ── 4. ELLE CASSE ──
    if (tuileA(n, e.c, e.r + 1) === TUILE.BLOC) {
        n.cases[e.r + 1][e.c] = TUILE.VIDE;
        faits.push('casse');
    } else {
        faits.push('roche');
    }
    return { etat: e, faits, chemin };
}
