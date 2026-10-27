// LES DESSINS GRADUÉS — le noyau : des droites, des points, et une image.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 27 octobre, quatre captures d'une publication de collègues :
// « Tu pourrais créer ce genre d'exercice pour vec des dessins simplifiées
// pour téléphone portable et évidemment on peut relier les points etc… »
//
// L'EXERCICE : une pile de droites graduées, CHACUNE AVEC SON ÉCHELLE — 0 à
// 10, 0 à 1, 10 à 30, 100 à 150 —, un tableau qui dit pour chaque point sa
// droite et son abscisse, et un dessin qui apparaît quand on a tout placé.
//
// ── CE QUE ÇA TRAVAILLE, ET POURQUOI C'EST BIEN PLUS QU'UN COLORIAGE ────────
//
// Placer 0,4 sur une droite de 0 à 1 et 40 sur une droite de 0 à 100, c'est
// LE MÊME GESTE et deux nombres différents. C'est exactement ce qu'un élève de
// sixième ne voit pas tout seul : il croit lire « le quatrième trait », alors
// qu'il lit une FRACTION de l'intervalle. Empiler des échelles différentes
// force à relire l'échelle à chaque ligne, et c'est tout l'exercice.
//
// Et la même abscisse se demande de six façons — « 0,4 », « quatre
// dixièmes », « 4/10 », « 2 + 2 », « le double de 0,2 », « quatre dizaines »
// sur une autre échelle. Le nombre ne change pas, son habit change.
//
// ── POURQUOI UNE GRILLE, ET NON DES COORDONNÉES LIBRES ──────────────────────
//
// Un dessin gradué se construit à l'envers de ce qu'on croit : on ne choisit
// pas des abscisses pour voir ce qu'elles dessinent, on DESSINE d'abord sur
// une grille, puis on traduit chaque sommet en abscisse sur l'échelle de sa
// ligne. Les dessins vivent donc ici en colonnes (0 à 10) et en lignes, et
// l'échelle est posée par-dessus. Changer les échelles ne change pas le
// dessin — seulement les nombres à lire, c'est-à-dire la difficulté.
//
// ── « DES DESSINS SIMPLIFIÉS POUR TÉLÉPHONE PORTABLE » ──────────────────────
//
// Les modèles de la publication ont neuf à douze droites et quarante points.
// Sur 390 px, une droite touchable demande ses 44 px de haut et ses
// graduations ne peuvent pas être à trente pixels l'une de l'autre. Les
// dessins d'ici ont donc SIX LIGNES AU PLUS, DIX INTERVALLES, et de six à
// douze points — pensés pour cette taille, pas rétrécis depuis une feuille.

/** Les colonnes d'un dessin : de 0 à 10, soit onze positions. */
export const COLONNES = 10;

/**
 * LES DESSINS. Chacun : ses sommets en (colonne, ligne), ses formes à
 * colorier dans l'ordre où on les peint, et ses traits simples.
 *
 * L'ORDRE DES FORMES EST L'ORDRE DE PEINTURE : la porte se peint APRÈS le mur,
 * sinon le mur la recouvre. C'est la seule subtilité du format.
 */
export const DESSINS = {
    fusee: {
        nom: 'La fusée',
        lignes: 6,
        // ELLE A REMPLACÉ UN POISSON. Le poisson avait été dessiné deux fois
        // et ne se lisait toujours pas sur la planche : sa queue, large de
        // deux colonnes pour six lignes, faisait une écharde et l'ensemble
        // tenait du cerf-volant. La fusée, elle, remplit ses six lignes
        // naturellement — nez, épaules, hublot, bas du corps, ailerons — et
        // c'est la forme qui se reconnaît le plus vite de toutes.
        points: {
            A: [5, 1], B: [3, 2], C: [7, 2], D: [3, 5], E: [7, 5],
            F: [4, 3], G: [6, 3], H: [5, 4],
            I: [1, 6], J: [3, 6], K: [7, 6], L: [9, 6]
        },
        formes: [
            { sommets: 'BCED', couleur: 'corps' },
            { sommets: 'ABC', couleur: 'toit' },
            { sommets: 'DIJ', couleur: 'toit' },
            { sommets: 'ELK', couleur: 'toit' },
            { sommets: 'FGH', couleur: 'detail' }
        ],
        traits: []
    },
    maison: {
        nom: 'La maison',
        lignes: 4,
        points: {
            A: [5, 1], B: [1, 2], C: [9, 2], D: [1, 4], E: [9, 4],
            F: [4, 4], G: [4, 3], H: [6, 3], I: [6, 4]
        },
        formes: [
            { sommets: 'BCED', couleur: 'corps' },
            { sommets: 'ABC', couleur: 'toit' },
            { sommets: 'FGHI', couleur: 'detail' }
        ],
        traits: []
    },
    bateau: {
        nom: 'Le bateau',
        lignes: 5,
        points: {
            A: [0, 4], B: [10, 4], C: [8, 5], D: [2, 5],
            E: [5, 4], F: [5, 1], G: [9, 2], H: [9, 3]
        },
        formes: [
            { sommets: 'ABCD', couleur: 'corps' },
            { sommets: 'FGHE', couleur: 'toit' }
        ],
        traits: [['E', 'F']]
    },
    sapin: {
        nom: 'Le sapin',
        lignes: 5,
        points: {
            A: [5, 1], B: [2, 3], C: [8, 3],
            D: [5, 2], E: [1, 4], F: [9, 4],
            G: [4, 4], H: [6, 4], I: [6, 5], J: [4, 5]
        },
        formes: [
            { sommets: 'DEF', couleur: 'corps' },
            { sommets: 'ABC', couleur: 'corps' },
            { sommets: 'GHIJ', couleur: 'detail' }
        ],
        traits: []
    },
    chat: {
        nom: 'Le chat',
        lignes: 5,
        points: {
            A: [2, 2], B: [8, 2], C: [8, 5], D: [2, 5],
            E: [3, 1], F: [4, 2], G: [6, 2], H: [7, 1],
            I: [4, 3], J: [6, 3], K: [5, 4]
        },
        formes: [
            { sommets: 'AEF', couleur: 'toit' },
            { sommets: 'GHB', couleur: 'toit' },
            { sommets: 'ABCD', couleur: 'corps' },
            { sommets: 'IJK', couleur: 'detail' }
        ],
        traits: []
    }
};

/**
 * LES JEUX D'ÉCHELLES, du plus simple au plus retors.
 *
 * `pas` est l'écart entre deux graduations ; `max` vaut toujours
 * `min + 10 × pas`, pour que les dix intervalles du dessin tombent
 * exactement sur les graduations.
 */
export const ECHELLES = {
    entiers: {
        nom: 'Des entiers de 0 à 10',
        lignes: [
            { min: 0, pas: 1 }, { min: 0, pas: 1 }, { min: 0, pas: 1 },
            { min: 0, pas: 1 }, { min: 0, pas: 1 }, { min: 0, pas: 1 }
        ]
    },
    decimaux: {
        nom: 'Des décimaux, une échelle par ligne',
        lignes: [
            { min: 0, pas: 1 },      // 0 → 10
            { min: 0, pas: 0.1 },    // 0 → 1
            { min: 1, pas: 0.1 },    // 1 → 2
            { min: 0, pas: 10 },     // 0 → 100
            { min: 10, pas: 2 },     // 10 → 30
            { min: 3, pas: 0.1 }     // 3 → 4
        ]
    },
    larges: {
        nom: 'Grandes et petites échelles mêlées',
        lignes: [
            { min: 0, pas: 100 },    // 0 → 1000
            { min: 0, pas: 0.01 },   // 0 → 0,1
            { min: 100, pas: 5 },    // 100 → 150
            { min: 0, pas: 0.1 },    // 0 → 1
            { min: 19, pas: 0.1 },   // 19 → 20
            { min: 0, pas: 10 }      // 0 → 100
        ]
    }
};

/** Le nombre, écrit à la française, sans traîner de zéros. */
export function nombreFr(v) {
    // ON ARRONDIT AVANT D'ÉCRIRE. 0,1 × 3 vaut 0.30000000000000004 en virgule
    // flottante, et « 0,30000000000000004 dixièmes » n'est une abscisse pour
    // personne. Six décimales suffisent : nos pas vont au centième.
    const arrondi = Math.round(v * 1e6) / 1e6;
    return String(arrondi).replace('.', ',');
}

/** L'abscisse d'un point : le minimum de sa ligne, plus sa colonne de pas. */
export function abscisseDe(colonne, ligne, echelle) {
    const e = echelle.lignes[(ligne - 1) % echelle.lignes.length];
    return Math.round((e.min + colonne * e.pas) * 1e6) / 1e6;
}

/** Le maximum d'une ligne : dix intervalles après son minimum. */
export const maxDeLaLigne = (e) => Math.round((e.min + COLONNES * e.pas) * 1e6) / 1e6;

const UNITES = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept',
    'huit', 'neuf', 'dix'];

/**
 * LES HABITS D'UN MÊME NOMBRE.
 *
 * Chacun rend `null` quand il ne s'applique pas — « quatre dizaines » ne veut
 * rien dire pour 0,23 —, et l'appelant choisit parmi ceux qui ont répondu.
 * C'est plus sûr qu'une liste de conditions à l'entrée : la règle qui dit
 * quand un habit va est écrite À CÔTÉ de l'habit, et nulle part ailleurs.
 */
export const HABITS = {
    /** « 0,4 » — l'écriture nue, toujours possible. */
    chiffre: (v) => nombreFr(v),

    /** « 4/10 » — seulement si le nombre tombe juste en dixièmes. */
    fraction: (v) => {
        const d = Math.round(v * 10);
        if (Math.abs(d / 10 - v) > 1e-9 || d <= 0 || d % 10 === 0) return null;
        return `${d}/10`;
    },

    /** « quatre dixièmes » — même condition, et le mot s'écrit en lettres. */
    dixiemes: (v) => {
        const d = Math.round(v * 10);
        if (Math.abs(d / 10 - v) > 1e-9 || d <= 0 || d >= 10) return null;
        return `${UNITES[d]} dixième${d > 1 ? 's' : ''}`;
    },

    /** « quatre dizaines » — pour 40, 70, 120… */
    dizaines: (v) => {
        if (!Number.isInteger(v) || v < 10 || v % 10 !== 0) return null;
        const d = v / 10;
        if (d > 10) return null;
        // « UNE dizaine », pas « un dizaine » : dizaine est féminin, et le
        // premier jet servait la faute à l'élève. Vu en relisant les énoncés
        // produits, jamais dans un chiffre.
        return `${d === 1 ? 'une' : UNITES[d]} dizaine${d > 1 ? 's' : ''}`;
    },

    /** « le double de 3 » — pour les entiers pairs, et les décimaux pairs. */
    double: (v) => {
        const moitie = Math.round(v * 500) / 1000;
        if (Math.abs(moitie * 2 - v) > 1e-9 || v <= 0) return null;
        // LA MOITIÉ NE DOIT PAS ÊTRE PLUS DURE QUE LE NOMBRE. Premier jet :
        // « le double de 0,005 » pour 0,01, et « le double de 0,045 » pour
        // 0,09 — un habit plus difficile que le vêtu, ce qui est exactement
        // l'inverse du but. On s'arrête à deux décimales.
        const apres = (String(moitie).split('.')[1] || '').length;
        if (apres > 2) return null;
        return `le double de ${nombreFr(moitie)}`;
    },

    /**
     * « 3 + 4 », « 120 + 10 » — une somme d'entiers.
     *
     * LE PREMIER TERME EST ROND dès que le nombre dépasse la vingtaine :
     * « 91 + 39 » pour 130 est une somme juste et une addition pénible, qui
     * demande de poser l'opération au lieu de lire la droite. Lu sur les
     * énoncés produits, pas sur un compteur.
     */
    somme: (v, rng) => {
        if (!Number.isInteger(v) || v < 2) return null;
        if (v >= 20) {
            const dizaines = Math.floor(v / 10);
            const a = (rng ? rng.int(1, dizaines - 1) : Math.floor(dizaines / 2)) * 10;
            return `${a} + ${v - a}`;
        }
        const a = rng ? rng.int(1, v - 1) : Math.floor(v / 2);
        return `${a} + ${v - a}`;
    },

    /** « 3 × 4 » — seulement si le nombre se factorise sans 1. */
    produit: (v) => {
        if (!Number.isInteger(v) || v < 4) return null;
        for (let a = 2; a * a <= v; a++) {
            if (v % a === 0 && v / a <= 100) return `${a} × ${v / a}`;
        }
        return null;
    }
};

/** Les habits qui vont à ce nombre, dans l'ordre du relevé. */
export function habitsPossibles(v, rng) {
    return Object.entries(HABITS)
        .map(([nom, f]) => ({ nom, texte: f(v, rng) }))
        .filter(h => h.texte !== null);
}

/**
 * L'ÉNONCÉ D'UN POINT : son habit, choisi parmi ceux qui lui vont.
 *
 * `varie` à faux rend toujours l'écriture nue — c'est le premier niveau, où
 * l'on apprend à lire une droite graduée et rien d'autre. Un élève qui bute
 * à la fois sur l'échelle ET sur « sept unités et trois centièmes » ne sait
 * pas sur quoi il bute, et nous non plus.
 */
export function ecrireAbscisse(v, { varie = false, rng = null } = {}) {
    if (!varie) return nombreFr(v);
    const possibles = habitsPossibles(v, rng);
    if (possibles.length <= 1) return nombreFr(v);
    const i = rng ? rng.int(0, possibles.length - 1) : 0;
    return possibles[i].texte;
}

/**
 * LA GÉOMÉTRIE DU PLAN, EN PIXELS, POUR UNE LARGEUR DONNÉE.
 *
 * Elle est ici, dans le noyau, et non dans l'activité : elle ne touche pas au
 * DOM, et c'est la seule façon de la mesurer sans ouvrir un navigateur.
 *
 * ELLE REND DES PIXELS, PAS DES UNITÉS À METTRE À L'ÉCHELLE. Premier jet :
 * un `viewBox` fixe de mille unités, réduit par le CSS. Sur un téléphone de
 * 390 px, le plan rend 358 px de large — une unité vaut donc 0,36 pixel, et
 * une borne écrite en vingt unités sort à sept pixels de haut. Toutes les
 * mesures chiffrées étaient vertes : le nombre ÉTAIT là, dans le DOM, à sa
 * place. Il était illisible.
 *
 * `gauche` ne garde que la pastille du numéro de droite : les deux bornes
 * s'écrivent SOUS les crans des bouts, jamais à côté. À côté, elles mangent
 * quatre-vingts pixels de largeur sur un téléphone — soit huit pixels par
 * colonne, le quart de l'écart entre deux graduations.
 */
export function geometrie(largeur, { lignes = 4, dispo = 0 } = {}) {
    const l = Math.max(280, Math.round(largeur || 0) || 360);
    const gauche = 30, droite = 16;
    const haut = 34, bas = 36;
    const n = Math.max(1, Math.round(lignes) || 1);
    // L'ÉCART ENTRE DEUX DROITES SUIT LA LARGEUR, ENTRE 48 ET 96 PIXELS.
    const parLaLargeur = Math.min(96, Math.max(48, l / 5.2));
    // ET IL SE RESSERRE POUR QUE TOUTES LES DROITES TIENNENT DANS L'ÉCRAN.
    //
    // Rémy, 27 octobre : « tous les axes doivent apparaitre à l'écran ». Sur
    // sa capture, un dessin de six droites en montrait quatre et la suite se
    // trouvait sous le bord de la fenêtre — on place un point en se souvenant
    // d'une droite qu'on ne voit plus. `dispo` est la hauteur mesurée sous le
    // plan ; quand elle vaut zéro — hors navigateur, dans une épreuve — elle
    // ne contraint rien.
    const parLaHauteur = (n > 1 && dispo > 0)
        ? (dispo - haut - bas) / (n - 1) : Infinity;
    // LE PLANCHER EST À 48 PIXELS, ET IL EST DESCENDU DE 58.
    //
    // 58 était le plus petit écart où deux droites voisines restent deux
    // cibles séparées au doigt, et c'était le bon chiffre tant que le plan
    // avait le droit de déborder de l'écran. Il ne l'a plus : entre « tout
    // voir » et « viser large », Rémy a tranché pour « tout voir », et 48 px
    // reste la taille d'une cible tactile. Sous ce plancher, on cesse de
    // resserrer et le plan défile — mieux vaut défiler que des droites
    // collées.
    // ON ARRONDIT VERS LE BAS, jamais au plus près : à 62,5 px d'écart pour
    // cinq droites, arrondir à 63 fait un plan de 322 px dans une place de
    // 320 — deux pixels, et la dernière droite repasse sous le bord. L'épreuve
    // l'a dit avant l'écran.
    const pas = Math.floor(Math.max(48, Math.min(parLaLargeur, parLaHauteur)));
    return {
        l, x0: gauche, x1: l - droite, pas, haut, bas,
        // LA BORNE S'ÉCRIT SOUS LE CRAN ET SOUS LE JETON : onze pixels de cran,
        // douze de jeton, donc jamais moins de vingt-trois.
        souscran: Math.round(Math.max(23, Math.min(26, pas * 0.3))),
        colonne: (l - gauche - droite) / COLONNES
    };
}
