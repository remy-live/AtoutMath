// |x − a| EST UNE DISTANCE, ET TOUT LE RESTE EN DÉCOULE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, photo d'une feuille à l'appui : « j'aimerai ce style d'exercice ».
//
//     1. Dans chaque cas, représenter l'ensemble des nombres réels x tels que
//        a. |x − 2| = 5        c. |x − 3| ⩽ 1,5
//        b. |x + 4| = 1        d. |x + 2| < 4,5
//
// LA SEULE IDÉE DU CHAPITRE TIENT EN UNE PHRASE : |x − a| est la DISTANCE entre
// x et a. Un élève qui l'a comprise lit les quatre lignes sans calculer :
//
//   · |x − 2| = 5   — les nombres à distance 5 de 2 : il y en a DEUX, −3 et 7 ;
//   · |x − 3| ⩽ 1,5 — ceux à distance au plus 1,5 de 3 : tout le segment
//                     [1,5 ; 4,5], centré sur 3 et de rayon 1,5.
//
// Un élève qui ne l'a pas comprise résout deux équations, se trompe d'un signe
// et n'a aucun moyen de le voir. C'est pourquoi le PREMIER barreau ne demande
// pas de résoudre : il demande de LIRE. Le centre et le rayon d'abord ; le
// dessin ensuite tombe tout seul.
//
// ── LE PIÈGE DU PLUS, ET POURQUOI IL A SON BARREAU ──────────────────────────
//
// |x + 4| n'est pas « la distance entre x et 4 ». C'est |x − (−4)| : la
// distance entre x et −4. La feuille de Rémy le met en b. et en d., et ce
// n'est pas un hasard — c'est LA faute du chapitre. On lui donne donc un
// barreau à lui, après que la lecture de |x − a| est acquise, et jamais avant.
//
// ── CE QUI EST TIRÉ ICI, ET CE QUI NE L'EST PAS ─────────────────────────────
//
// Ce module ne dessine rien et ne connaît aucun écran : il tire une condition,
// en donne l'ensemble solution, et nomme les fautes qu'on fait à sa place. Le
// dessin sur la droite graduée vient de `generators/intervalles.js`, qui le
// faisait déjà pour le chapitre des intervalles — on n'en réécrit pas un
// second, sans quoi deux axes du même logiciel n'auraient pas la même tête.

/** Le signe moins de la typographie, pas le trait d'union du clavier. */
export const nb = (v) => String(v).replace('.', ',').replace('-', '−');

const LE = '⩽';   // celui du programme français, pas le ≤ anglo-saxon
const GE = '⩾';

/**
 * LES HUIT BARREAUX, ET CHACUN N'AJOUTE QU'UNE CHOSE.
 *
 * Rémy, pour la factorisation : « je veux que ce soit hyper progressif ». La
 * règle qu'on s'était donnée alors vaut ici : un barreau qui ajouterait deux
 * difficultés à la fois ne dit plus laquelle a fait trébucher.
 *
 * L'identifiant dit ce qu'on travaille, jamais le rang : renuméroter l'échelle
 * ne doit pas périmer les parcours déjà enregistrés.
 */
export const MARCHES = [
    { id: 'lire', nom: '1. Lire la distance : |x − 2|' },
    { id: 'egal', nom: '2. |x − 2| = 5 : deux nombres' },
    { id: 'large', nom: '3. |x − 3| ⩽ 2 : l\'intervalle fermé' },
    { id: 'strict', nom: '4. |x − 3| < 2 : le crochet ouvert' },
    { id: 'plus', nom: '5. Le piège du plus : |x + 4|' },
    { id: 'decimal', nom: '6. Avec des décimaux : |x − 3| ⩽ 1,5' },
    { id: 'superieur', nom: '7. |x − 2| ⩾ 3 : deux morceaux' },
    { id: 'inverse', nom: '8. De l\'axe vers |x − a|' }
];

/** Ce que chaque barreau autorise. Lu par le tirage, et par les épreuves. */
const REGLE = {
    lire:      { relations: ['='],            plus: false, decimal: false },
    egal:      { relations: ['='],            plus: false, decimal: false },
    large:     { relations: [LE],             plus: false, decimal: false },
    strict:    { relations: ['<'],            plus: false, decimal: false },
    // LE PIÈGE DU PLUS SE TRAVAILLE SUR TOUT CE QUI PRÉCÈDE. L'isoler sur la
    // seule égalité laisserait croire qu'il ne concerne qu'elle ; la feuille de
    // Rémy le met justement une fois en = et une fois en <.
    plus:      { relations: ['=', LE, '<'],   plus: true,  decimal: false },
    decimal:   { relations: ['=', LE, '<'],   plus: null,  decimal: true },
    superieur: { relations: [GE, '>'],        plus: null,  decimal: false },
    inverse:   { relations: ['=', LE, '<'],   plus: null,  decimal: false }
};

/** Les rayons décimaux : ceux de la feuille, et leurs voisins au demi. */
const RAYONS_DECIMAUX = [0.5, 1.5, 2.5, 3.5, 4.5];

/**
 * Tire une condition du barreau demandé.
 *
 * @param {object} o
 * @param {object} o.rng - le tireur (`makeRng`) : `.int`, `.bool`, `.pick`
 * @param {string} [o.marche='egal'] - l'identifiant d'un barreau de MARCHES
 */
export function tirerValeurAbsolue({ rng, marche = 'egal' }) {
    const regle = REGLE[marche] || REGLE.egal;
    const relation = regle.relations[rng.int(0, regle.relations.length - 1)];
    // `plus: null` veut dire « au choix » : le barreau ne travaille pas le
    // signe, mais il ne doit pas non plus faire oublier qu'il existe.
    const ecritPlus = regle.plus === null ? rng.bool(0.4) : regle.plus;

    const rayon = regle.decimal
        ? RAYONS_DECIMAUX[rng.int(0, RAYONS_DECIMAUX.length - 1)]
        : rng.int(1, 5);
    // LE CENTRE RESTE DANS UNE FENÊTRE LISIBLE. L'axe se cadre sur les bornes
    // et garde toujours zéro : un centre à 40 donnerait une droite graduée de
    // quarante-cinq traits, où l'on ne lit plus rien.
    //
    // ET UN BARREAU QUI N'A PAS ENCORE VU LE PIÈGE DU PLUS N'EN TIRE PAS.
    // `plus: false` ne dit pas seulement « n'écris pas |x + 4| » : il dit que
    // le centre est POSITIF. Un centre tiré dans [−4 ; 6] aurait sorti |x + 3|
    // au barreau 2, soit la difficulté du barreau 5, quatre crans trop tôt —
    // et l'échelle n'aurait plus rien promis.
    const centre = regle.plus === false ? rng.int(1, 6)
        : (ecritPlus ? -rng.int(1, 6) : rng.int(-4, 6));

    return {
        marche,
        centre, rayon, relation, ecritPlus,
        enonce: enonceTexte(centre, rayon, relation, ecritPlus),
        barres: barresTexte(centre, ecritPlus),
        distance: distanceTexte(centre),
        solution: solutionDe(centre, rayon, relation)
    };
}

/** `|x − 2| = 5`, `|x + 4| ⩽ 1,5` */
export function enonceTexte(centre, rayon, relation, ecritPlus) {
    return `${barresTexte(centre, ecritPlus)} ${relation} ${nb(rayon)}`;
}

/** `|x − 2|`, `|x + 4|` — l'écriture seule, sans la relation. */
export function barresTexte(centre, ecritPlus) {
    // ON N'ÉCRIT JAMAIS |x − −4|. Un centre négatif s'écrit avec un plus, et
    // c'est bien ce qui fait le piège : la feuille de Rémy écrit |x + 4|.
    if (ecritPlus || centre < 0) return `|x + ${nb(-centre)}|`;
    if (centre === 0) return '|x|';
    return `|x − ${nb(centre)}|`;
}

/** « la distance entre x et −4 » — la phrase qui résout tout le chapitre. */
export function distanceTexte(centre) {
    return `la distance entre x et ${nb(centre)}`;
}

/**
 * L'ENSEMBLE SOLUTION, dans la forme que sait dessiner `axeHtml`.
 *
 *   · `points`     — deux nombres isolés (l'égalité) ;
 *   · `intervalle` — un segment centré (⩽ et <) ;
 *   · `exterieur`  — deux demi-droites (⩾ et >), et c'est le seul cas où
 *                    l'ensemble n'est PAS d'un seul tenant.
 */
export function solutionDe(centre, rayon, relation) {
    const g = centre - rayon, d = centre + rayon;
    if (relation === '=') return { sorte: 'points', valeurs: [g, d] };
    if (relation === LE || relation === '<') {
        const ferme = relation === LE;
        return { sorte: 'intervalle', I: { a: g, b: d, ea: ferme, eb: ferme } };
    }
    const ferme = relation === GE;
    return { sorte: 'exterieur', parts: [
        { a: null, b: g, ea: false, eb: ferme },
        { a: d, b: null, ea: ferme, eb: false }
    ] };
}

/** L'ensemble solution, écrit : `{−3 ; 7}`, `[1,5 ; 4,5]`, `]−∞ ; −1] ∪ [5 ; +∞[`. */
export function solutionTexte(sol) {
    if (sol.sorte === 'points') return `{${sol.valeurs.map(nb).join(' ; ')}}`;
    if (sol.sorte === 'intervalle') return crochets(sol.I);
    return sol.parts.map(crochets).join(' ∪ ');
}

function crochets(I) {
    const g = I.a === null ? ']−∞' : `${I.ea ? '[' : ']'}${nb(I.a)}`;
    const d = I.b === null ? '+∞[' : `${nb(I.b)}${I.eb ? ']' : '['}`;
    return `${g} ; ${d}`;
}

/** Les parties à dessiner sur l'axe, et les points à y poser. */
export function dessinDe(sol) {
    if (sol.sorte === 'points') return { parts: [], points: sol.valeurs };
    if (sol.sorte === 'intervalle') return { parts: [sol.I], points: [] };
    return { parts: sol.parts, points: [] };
}

/**
 * LES FAUTES QU'ON FAIT VRAIMENT, chacune avec la phrase qui la nomme.
 *
 * On ne fabrique pas des leurres au hasard. Quatre erreurs reviennent sur les
 * copies, et chacune se voit sur le dessin — c'est tout l'intérêt de demander
 * un dessin plutôt qu'un calcul :
 *
 *   · UNE SEULE SOLUTION. |x − 2| = 5 donne 7 et l'on s'arrête. Une distance
 *     se compte des DEUX côtés ; l'élève qui ne pose qu'un point l'a oublié.
 *   · LE CENTRE DU MAUVAIS SIGNE. |x + 4| lu comme la distance à 4 : tout le
 *     dessin glisse de 8 unités. C'est la faute que le barreau 5 travaille.
 *   · LE CROCHET. ⩽ prend la borne, < la laisse — la faute du chapitre
 *     précédent, qui revient intacte dans celui-ci.
 *   · LE DEDANS POUR LE DEHORS. ⩾ garde ce qui est LOIN du centre, donc deux
 *     morceaux. L'élève dessine le segment, qui est exactement le contraire.
 *
 * @returns {{sol:object, why:string}[]}
 */
export function fautesValeurAbsolue(q) {
    const { centre, rayon, relation } = q;
    const l = [];
    const autreCentre = -centre;

    if (relation === '=') {
        l.push({ sol: { sorte: 'points', valeurs: [centre + rayon] },
            why: 'Une seule solution : une distance se compte des DEUX côtés. '
                + `${nb(centre - rayon)} est à ${nb(rayon)} de ${nb(centre)} lui aussi.` });
        l.push({ sol: solutionDe(centre, rayon, LE),
            why: 'C\'est le signe = , pas ⩽ : on cherche les nombres qui sont '
                + 'EXACTEMENT à cette distance, pas ceux qui sont plus près.' });
    } else if (relation === LE || relation === '<') {
        l.push({ sol: solutionDe(centre, rayon, relation === LE ? '<' : LE),
            why: relation === LE
                ? 'Le crochet : ⩽ prend la borne, il se tourne vers l\'intérieur.'
                : 'Le crochet : < laisse la borne dehors, il se tourne vers l\'extérieur.' });
        l.push({ sol: solutionDe(centre, rayon, relation === LE ? GE : '>'),
            why: 'C\'est le DEHORS. Une distance PLUS PETITE que le rayon, '
                + 'ce sont les nombres PROCHES du centre : le segment, d\'un seul tenant.' });
    } else {
        l.push({ sol: solutionDe(centre, rayon, relation === GE ? LE : '<'),
            why: 'C\'est le dedans. Une distance PLUS GRANDE que le rayon, ce sont '
                + 'les nombres LOIN du centre : deux morceaux, et rien au milieu.' });
        l.push({ sol: solutionDe(centre, rayon, relation === GE ? '>' : GE),
            why: 'Le crochet : ⩾ prend la borne, > la laisse.' });
    }

    // LE CENTRE DU MAUVAIS SIGNE, toujours — c'est la faute du chapitre. On
    // l'écarte quand le centre est nul, où elle ne se distinguerait de rien.
    if (centre !== 0) {
        l.push({ sol: solutionDe(autreCentre, rayon, relation),
            // ON RELIT L'ÉCRITURE, ON NE LA DÉCOUPE PAS. Ma première version
            // prenait `q.enonce.split(' ')[0]`, ce qui rend « |x » : l'énoncé
            // porte des espaces autour du moins, et la phrase de correction
            // commençait par un caractère orphelin.
            why: `${barresTexte(centre, q.ecritPlus)} se lit « ${distanceTexte(centre)} ». `
                + `Le dessin est centré sur ${nb(centre)}, pas sur ${nb(autreCentre)}.` });
    }
    // LE RAYON PRIS POUR UNE BORNE : l'élève pose le centre et le rayon au lieu
    // du centre moins et du centre plus. Le dessin est deux fois trop court.
    l.push({ sol: solutionDe(centre + rayon / 2, rayon / 2, relation),
        why: `Le rayon est ${nb(rayon)} DE PART ET D'AUTRE de ${nb(centre)} : `
            + `de ${nb(centre - rayon)} à ${nb(centre + rayon)}.` });
    return l;
}

/** Ce qu'il faut avoir compris, dit en une phrase — pour l'explication. */
export function pourquoiTexte(q) {
    const { centre, rayon, relation, solution } = q;
    const lecture = `${q.enonce} se lit : ${distanceTexte(centre)} `
        + `${relation === '=' ? 'vaut' : 'est'} `
        + `${MOT_RELATION[relation]} ${nb(rayon)}.`;
    if (solution.sorte === 'points') {
        return `${lecture} Il y a DEUX nombres à cette distance de ${nb(centre)} : `
            + `${nb(centre)} − ${nb(rayon)} = ${nb(centre - rayon)} et `
            + `${nb(centre)} + ${nb(rayon)} = ${nb(centre + rayon)}. `
            + `L'ensemble est ${solutionTexte(solution)}.`;
    }
    if (solution.sorte === 'intervalle') {
        return `${lecture} Ce sont les nombres PROCHES de ${nb(centre)} : le segment `
            + `centré sur ${nb(centre)} et de rayon ${nb(rayon)}, soit `
            + `${solutionTexte(solution)}.`;
    }
    return `${lecture} Ce sont les nombres LOIN de ${nb(centre)} : deux morceaux, `
        + `et rien entre ${nb(centre - rayon)} et ${nb(centre + rayon)}. `
        + `L'ensemble est ${solutionTexte(solution)}.`;
}

const MOT_RELATION = {
    '=': 'exactement', [LE]: 'au plus', '<': 'strictement inférieure à',
    [GE]: 'au moins', '>': 'strictement supérieure à'
};

export const SIGNES = { LE, GE };
