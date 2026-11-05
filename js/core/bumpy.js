// BUMPY — la balle qui ne s'arrête jamais de rebondir.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 5 novembre : « quand j'étais jeune, je jouais à un jeu Bumpy, je
// l'adorai, c'est un chouette jeu pour ceux qui vont vite et ca fait les
// réflexes ».
//
// ── TROIS VERSIONS, ET CE QUE CHACUNE A APPRIS ─────────────────────────────
//
// 1. Une balle à physique continue qui ramassait des pastilles. Elle marchait,
//    elle était mesurée, et ce n'était pas le jeu.
// 2. Rémy : « bumpy ca cassait des blocs et ca sautait en colonnes ». J'ai lu
//    « en colonnes » comme une MÉCANIQUE et j'ai écrit un saut case par case.
// 3. Il envoie alors les captures du vrai jeu : « tu peux pas faire comme le
//    jeu original mais avec un design moderne, ce que tu proposes ne va pas ».
//
// LES CAPTURES DISENT QUE LA PREMIÈRE VERSION ÉTAIT LA PLUS PROCHE. « Ça
// sautait en colonnes » ne décrivait pas le rebond : cela décrivait UN NIVEAU,
// celui dont le plateau est fait de barres verticales. La leçon est chère et
// elle vaut pour la suite : UNE CORRECTION DE RÉMY SE LIT COMME UN INDICE, PAS
// COMME UNE SPÉCIFICATION. On lui montre une image avant d'écrire.
//
// La physique continue qui suit est donc celle de la première version, avec sa
// correction mesurée (voir `avancer`), et le monde autour est celui des
// captures : plateformes courtes, barres verticales, parois cassables HAUTES,
// clés, porte, fruits, pics.
//
// ── CE QUE RÉMY A PRÉCISÉ SUR LA MAQUETTE ──────────────────────────────────
//
//   « les parois cassable de bumpy sont grosses en hauteur, il faut bien voir
//     le rebond, tu pense aussi au porte »
//
//   · LES PAROIS SONT DES BARRES VERTICALES de trois ou quatre cases. Une
//     barre haute se lit comme un mur qu'on doit abattre ; des cubes empilés
//     se lisent comme un sol.
//   · LE REBOND DOIT SE VOIR : 600 px/s sous 1500 px/s² donnent 120 px, soit
//     3,33 cases. C'est ample, et c'est la seule information sur laquelle
//     l'élève décide.
//   · LES CLÉS OUVRENT LA PORTE. C'est elle, le but du tableau — et c'est ce
//     qui donne un sens au comptage du panneau latéral.

/** Les tuiles d'un tableau, telles qu'on les écrit. */
export const TUILE = {
    VIDE: '.', ROCHE: '#', PLATEFORME: '=', BARRE: '|',
    PAROI_R: 'R', PAROI_J: 'J', PAROI_V: 'V',
    PIC: '^', CLE: 'c', PORTE: 'P', DEPART: 'B'
};

/** Les cinq fruits. Ce sont les points, et ils n'ont pas d'autre rôle. */
export const FRUITS = ['1', '2', '3', '4', '5'];

/** Un côté de case, en pixels. Tout le dessin en découle. */
export const CASE = 36;

/** Le rayon de la balle. Assez petit pour passer un couloir d'une case. */
export const RAYON = 13;

/**
 * LA PHYSIQUE, ET POURQUOI CES TROIS NOMBRES-LÀ.
 *
 * `REBOND` est une VITESSE, pas un coefficient de restitution : la balle
 * repart toujours à la même vitesse vers le haut, quelle que soit celle avec
 * laquelle elle est arrivée. C'est ce qui fait Bumpy — le rebond est une
 * constante du monde, pas une conséquence de la chute. Avec un coefficient,
 * la balle s'amortit, finit par ramper, et le jeu meurt.
 *
 * RÉMY : « il faut bien voir le rebond ». MESURÉ : 600 px/s sous 1500 px/s²
 * élèvent la balle de 120 px, soit 3,33 cases de 36. Une marche de deux cases
 * (72 px) passe largement, une marche de trois (108 px) passe avec douze
 * pixels de marge — c'est le geste adroit qu'on récompense, et l'on n'en met
 * aucune sur le chemin obligé. Le vol dure 2 × 600 / 1500 = 0,8 s, pendant
 * lesquelles on parcourt 200 × 0,8 = 160 px, soit quatre cases et demie.
 *
 * `VX` EST DIRECTE, et c'est la seconde moitié du jeu : on ne pousse pas la
 * balle, on la DIRIGE, en l'air comme au sol. Une inertie horizontale rendrait
 * le pilotage mou et les couloirs d'une case infranchissables.
 */
export const GRAVITE = 1500;
export const REBOND = 600;
export const VX = 200;

/**
 * LES TABLEAUX. Vingt colonnes sur quatorze lignes.
 *
 * ILS SONT ÉCRITS À LA MAIN, et ce n'est pas de la paresse : un tableau tiré
 * au hasard est soit trivial, soit injouable, et l'on ne sait jamais lequel
 * avant d'y avoir joué. `tools/bumpyJouable.mjs` le dit.
 *
 * LES PAROIS CASSABLES SONT ÉCRITES EN COLONNES DE TROIS OU QUATRE : c'est la
 * demande de Rémy, et c'est ce qui les rend lisibles comme des MURS. La balle
 * en abat une case par rebond, par le haut — on ne casse pas de côté.
 */
export const NIVEAUX = [
    {
        nom: 'Les deux clés', clefs: 2,
        lignes: [
            '####################',
            '#....1...B....2....#',
            '#..===....c...===..#',
            '#.........R........#',
            '#..c......R...===..#',
            '#.===.....R........#',
            '#.........R....3...#',
            '#..............===.#',
            '#.....===..........#',
            '#............4.....#',
            '#.==^^==.....===...#',
            '#..................#',
            '#.=========....PP..#',
            '####################'
        ]
    },
    {
        nom: 'Les barres', clefs: 3,
        // LES BARRES NE TOUCHENT NI LE HAUT NI LE BAS, et c'est la correction
        // qui a rendu ce tableau jouable : une barre pleine hauteur coupe le
        // plateau EN DEUX, et la porte se retrouve dans une moitié où la balle
        // n'entre jamais. Le chercheur l'a dit en deux secondes, le dessin des
        // cases atteintes le montrait d'un coup d'œil.
        lignes: [
            '####################',
            '#..1.....B....c....#',
            '#.===.......===....#',
            '#......|..J........#',
            '#..c...|..J...2....#',
            '#.===..|..J..===...#',
            '#......|..J........#',
            '#..3...|...........#',
            '#.===..|.....===...#',
            '#......|...........#',
            '#..V...............#',
            '#..V......c........#',
            '#..V..PP..===....4.#',
            '####################'
        ]
    },
    {
        nom: 'La descente', clefs: 3,
        // LA LIGNE DE PICS NE LAISSE QUE TROIS PASSAGES — les colonnes 1, 2 et
        // 18 —, et la porte est sous le premier. C'est tout le tableau : il
        // faut descendre, mais pas n'importe où.
        lignes: [
            '####################',
            '#.c......B.......c.#',
            '#.===....1.....===.#',
            '#..................#',
            '#..R...===....R....#',
            '#..R..........R....#',
            '#..R..2....3..R....#',
            '#..R..===..===R....#',
            '#........c.........#',
            '#..===^^^===^^^===.#',
            '#..................#',
            '#....4.......5.....#',
            '#.PP=====.=======..#',
            '####################'
        ]
    }
];

/** Lit un tableau écrit en lignes et rend un monde jouable. */
export function lireNiveau(def) {
    const lignes = def.lignes.map(l => l.split(''));
    const hauteur = lignes.length, largeur = lignes[0].length;
    let depart = null, porte = null, clefs = 0, fruits = 0;
    for (let r = 0; r < hauteur; r++) {
        for (let c = 0; c < largeur; c++) {
            const t = lignes[r][c];
            if (t === TUILE.DEPART) { depart = { c, r }; lignes[r][c] = TUILE.VIDE; }
            if (t === TUILE.PORTE && !porte) porte = { c, r };
            if (t === TUILE.CLE) clefs++;
            if (FRUITS.includes(t)) fruits++;
        }
    }
    // LE DÉPART EST ÉCRIT DANS CHAQUE TABLEAU, et c'est une correction : laissé
    // au milieu par défaut, il tombait pile sur la paroi cassable du premier
    // tableau, que la balle abattait donc gratuitement avant qu'on ait touché
    // une touche. Le repli reste, pour un tableau qu'on écrirait sans « B ».
    if (!depart) depart = { c: Math.floor(largeur / 2), r: 1 };
    return {
        nom: def.nom, largeur, hauteur, cases: lignes, depart, porte,
        clefs, fruits, ilEnFaut: def.clefs
    };
}

/** L'état de départ : la balle en l'air, rien ramassé, la porte fermée. */
export function etatInitial(niveau) {
    return {
        x: (niveau.depart.c + 0.5) * CASE,
        y: (niveau.depart.r + 0.5) * CASE,
        vx: 0, vy: 0,
        clefs: 0, fruits: 0,
        ouverte: niveau.ilEnFaut === 0,
        fini: false, mort: false
    };
}

const tuileA = (n, c, r) => (
    (r < 0 || r >= n.hauteur || c < 0 || c >= n.largeur) ? TUILE.ROCHE : n.cases[r][c]);

/** Les parois de couleur, celles qui se cassent. */
export const estParoi = (t) =>
    t === TUILE.PAROI_R || t === TUILE.PAROI_J || t === TUILE.PAROI_V;

/**
 * Une tuile arrête-t-elle la balle ?
 *
 * LA PORTE FERMÉE EST SOLIDE, ET C'EST TOUT SON INTÉRÊT : tant qu'il manque
 * une clé, elle est un mur comme un autre. Une porte qu'on traverserait sans
 * clé ne compterait rien.
 */
const solide = (t, ouverte) => t === TUILE.ROCHE || t === TUILE.PLATEFORME
    || t === TUILE.BARRE || estParoi(t) || t === TUILE.PIC
    || (t === TUILE.PORTE && !ouverte);

/**
 * UN PAS DU MONDE.
 *
 * ── ON NE RÉSOUT QUE LA LIGNE OÙ LE BORD AVANT ENTRE ───────────────────────
 *
 * La toute première version parcourait TOUTES les cases que le disque touche
 * et résolvait chacune. C'est le défaut qui rendait le jeu injouable, et il ne
 * se voyait pas à l'œil : une balle à cheval sur deux cases de sol — ce qui
 * arrive aux deux tiers des abscisses — était résolue deux fois. Au premier
 * tour `vy` devenait négative (le rebond), au second elle n'était donc plus
 * positive : on tombait dans la branche « plafond » et la balle était
 * repoussée SOUS le sol. MESURÉ, sol à y = 128 : elle oscillait entre 171 et
 * 149, enterrée. La sonde d'écran ne pouvait pas le dire : elle voyait bien
 * une balle, qui bougeait bien.
 *
 * ── ET LE PAS EST BORNÉ ────────────────────────────────────────────────────
 *
 * Un onglet remis au premier plan rend un `dt` d'une seconde ou plus ; la
 * balle avancerait alors de quatre cases d'un coup et traverserait un mur sans
 * le voir. On plafonne à 25 ms : le monde ralentit plutôt que de se trouer.
 *
 * @param {object} etat
 * @param {object} n       le niveau lu (MODIFIÉ : ce qu'on casse disparaît)
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
    if (e.vx !== 0) {
        const col = Math.floor((e.vx > 0 ? e.x + RAYON : e.x - RAYON) / CASE);
        const r0 = Math.floor((e.y - RAYON) / CASE), r1 = Math.floor((e.y + RAYON) / CASE);
        let bute = false;
        for (let r = r0; r <= r1; r++) {
            const t = tuileA(n, col, r);
            if (t === TUILE.PIC) { e.mort = true; faits.push('pic'); return { etat: e, faits }; }
            if (solide(t, e.ouverte)) bute = true;
        }
        if (bute) {
            e.x = e.vx > 0 ? (col * CASE) - RAYON - 0.01 : ((col + 1) * CASE) + RAYON + 0.01;
            e.vx = 0;
        }
    }

    // ── Y ──
    e.y += e.vy * pas;
    if (e.vy !== 0) {
        const lig = Math.floor((e.vy > 0 ? e.y + RAYON : e.y - RAYON) / CASE);
        const c0 = Math.floor((e.x - RAYON) / CASE), c1 = Math.floor((e.x + RAYON) / CASE);
        let bute = false;
        const aCasser = [];
        for (let c = c0; c <= c1; c++) {
            const t = tuileA(n, c, lig);
            if (t === TUILE.PIC) { e.mort = true; faits.push('pic'); return { etat: e, faits }; }
            if (!solide(t, e.ouverte)) continue;
            bute = true;
            if (estParoi(t)) aCasser.push(c);
        }
        if (bute && e.vy > 0) {
            e.y = (lig * CASE) - RAYON - 0.01;
            // LE REBOND EST UNE CONSTANTE DU MONDE : la balle repart toujours
            // à la même vitesse, quelle que soit celle avec laquelle elle est
            // arrivée. Voir `REBOND`.
            e.vy = -REBOND;
            faits.push('rebond');
            // ON N'ABAT QU'UNE CASE PAR REBOND, ET PAR LE HAUT. Une paroi
            // s'use donc du sommet vers le bas, ce qui se voit : le mur baisse.
            for (const c of aCasser) { n.cases[lig][c] = TUILE.VIDE; faits.push('casse'); }
        } else if (bute) {
            e.y = ((lig + 1) * CASE) + RAYON + 0.01;
            e.vy = 0;
        }
    }

    // ── CE QU'ON RAMASSE EN PASSANT ──
    const c0 = Math.floor((e.x - RAYON) / CASE), c1 = Math.floor((e.x + RAYON) / CASE);
    const r0 = Math.floor((e.y - RAYON) / CASE), r1 = Math.floor((e.y + RAYON) / CASE);
    for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
            const t = tuileA(n, c, r);
            if (t === TUILE.CLE) {
                n.cases[r][c] = TUILE.VIDE;
                e.clefs++;
                faits.push('cle');
                if (e.clefs >= n.ilEnFaut && !e.ouverte) {
                    e.ouverte = true;
                    faits.push('ouverte');
                }
            } else if (FRUITS.includes(t)) {
                n.cases[r][c] = TUILE.VIDE;
                e.fruits++;
                faits.push('fruit');
            } else if (t === TUILE.PORTE && e.ouverte) {
                e.fini = true;
                faits.push('porte');
            }
        }
    }
    return { etat: e, faits };
}
