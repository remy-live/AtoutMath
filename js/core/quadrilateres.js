// L'ORGANIGRAMME DES QUADRILATÈRES — la hiérarchie, et ce qu'elle enseigne.
//
// Rémy : « des exercices pour comprendre comment on passe d'un quadrilatère à
// un parallélogramme. J'aime l'organigramme avec les cartes à replacer. Il faut
// des choses visuelles quitte à avoir des animations. »
//
// CE QUE L'ORGANIGRAMME DIT, ET QU'UNE LISTE DE DÉFINITIONS NE DIT PAS. Un
// élève apprend cinq définitions séparées et croit avoir cinq familles côte à
// côte. Or elles s'EMBOÎTENT : un carré est un rectangle, un rectangle est un
// parallélogramme. « Est-ce qu'un carré est un rectangle ? » est la question
// qui départage ceux qui ont compris.
//
// PAS DE TRAPÈZE. Rémy : « enlève le trapèze, ce n'est pas au programme ». Il
// y était, en haut de l'arbre, parce que la hiérarchie mathématique complète le
// place là — et c'est exactement la raison de l'enlever : ce logiciel enseigne
// le programme du collège, pas la hiérarchie complète. Une case de plus à
// apprendre, qui ne sera demandée nulle part, coûte à l'élève sans rien lui
// rendre. Le quadrilatère quelconque descend donc DIRECTEMENT au
// parallélogramme.
//
// ET LE CARRÉ SE REJOINT PAR DEUX CHEMINS. C'est le cœur de la figure, et sa
// beauté : on descend au carré depuis le rectangle en ajoutant « deux côtés
// consécutifs de même longueur », ou depuis le losange en ajoutant « un angle
// droit ». Chaque chemin apporte la propriété que l'AUTRE avait déjà. Un élève
// qui voit cela ne confondra plus jamais un losange et un carré.
//
// CHAQUE FLÈCHE PORTE UNE SEULE PROPRIÉTÉ, ET C'EST LA RÈGLE DU JEU : descendre
// d'un cran, c'est ajouter exactement une condition. Un organigramme dont les
// flèches porteraient deux conditions n'apprendrait rien — on ne saurait pas
// laquelle a fait la différence.

/**
 * Les cinq familles. `figure` est le contour à dessiner, dans un carré de 100 ;
 * `quoi` est la définition telle qu'on la dit en classe.
 */
export const FAMILLES = [
    {
        id: 'quadrilatere', nom: 'Quadrilatère', rang: 0,
        quoi: 'quatre côtés, et rien de plus',
        figure: [[10, 22], [86, 10], [92, 62], [24, 78]]
    },
    {
        id: 'parallelogramme', nom: 'Parallélogramme', rang: 1,
        quoi: 'les côtés opposés sont parallèles deux à deux',
        figure: [[26, 20], [92, 20], [74, 72], [8, 72]]
    },
    {
        id: 'rectangle', nom: 'Rectangle', rang: 2,
        quoi: 'un parallélogramme qui a un angle droit — donc quatre',
        figure: [[12, 24], [88, 24], [88, 68], [12, 68]]
    },
    {
        id: 'losange', nom: 'Losange', rang: 2,
        quoi: 'un parallélogramme dont les quatre côtés sont de même longueur',
        figure: [[50, 12], [90, 46], [50, 80], [10, 46]]
    },
    {
        id: 'carre', nom: 'Carré', rang: 3,
        quoi: 'à la fois rectangle ET losange',
        figure: [[24, 24], [76, 24], [76, 76], [24, 76]]
    }
];

/**
 * LES TREIZE CONDITIONS, ET LES SEPT CHEMINS QU'ELLES OUVRENT.
 *
 * Rémy, sur sa fiche : cinq cases de figures, treize cartes de conditions, et
 * PLUSIEURS FLÈCHES QUI ARRIVENT SUR LA MÊME CASE.
 *
 * C'est un organigramme plus riche que le premier, et le gain n'est pas
 * décoratif. Le premier ne portait qu'UNE condition par flèche, et il laissait
 * croire qu'il n'y a qu'une façon d'être un parallélogramme. Or il y en a
 * trois, et elles ne se ressemblent pas : des côtés PARALLÈLES, des côtés
 * ÉGAUX, des DIAGONALES qui se coupent en leur milieu. Un élève qui n'a vu que
 * la première ne reconnaît pas un parallélogramme quand on lui donne la
 * troisième — et c'est pourtant celle des exercices.
 *
 * DEUX CHEMINS DIRECTS S'AJOUTENT, ceux qui court-circuitent le
 * parallélogramme : « trois ou quatre angles droits » fait un rectangle d'un
 * quadrilatère quelconque, « quatre côtés égaux » en fait un losange. Ils sont
 * sur la fiche de Rémy, et ils sont utiles : ce sont les définitions qu'on
 * donne en sixième, avant même de parler de parallélogramme.
 *
 * « TROIS OU QUATRE » N'EST PAS UNE APPROXIMATION. Trois angles droits forcent
 * le quatrième — la somme des angles d'un quadrilatère vaut 360°. On écrit donc
 * les deux, parce que c'est ainsi que la propriété se rencontre, et parce que
 * la remarque vaut d'être faite.
 *
 * `court` EST LA VIGNETTE, et c'est ce qui a changé en dernier.
 *
 * Rémy : « pour l'organigramme, j'aimerais aussi inclure les vignettes de
 * propriétés. Exemple : on part du quadrilatère et pour aller au
 * parallélogramme, on glisse la vignette côtés opposés parallèles. »
 *
 * Une PHRASE ne tient pas sur une flèche. « Les côtés opposés sont parallèles
 * deux à deux » fait quarante-cinq caractères : posée au milieu d'un trait,
 * elle recouvre les deux cases qu'il relie. C'est pourquoi les réponses
 * atterrissaient jusqu'ici dans des bandes SOUS le schéma — et l'on perdait
 * alors ce que l'exercice enseigne : que cette condition-là est portée par
 * CETTE flèche-là. La vignette, elle, tient sur le trait.
 *
 * ET C'EST LA VIGNETTE DE L'AUTRE EXERCICE. `propriete` renvoie à `PROPRIETES`
 * dans core/quadriMorph.js : la carte qu'on glisse sur une figure pour la
 * déformer, dans « Le Quadrilatère qui se Transforme », porte exactement les
 * mêmes mots que celle qu'on pose sur une flèche ici. Deux exercices, un seul
 * vocabulaire — sans quoi l'élève apprend deux listes au lieu d'une notion.
 * Un test le vérifie ; l'écart entre deux listes recopiées est justement le
 * genre de chose qui se défait toute seule.
 *
 * DEUX FLÈCHES N'ONT PAS DE VIGNETTE ÉQUIVALENTE, et c'est normal :
 * « 3 ou 4 angles droits » et « 2 côtés consécutifs égaux » ne servent qu'ici.
 * L'autre exercice n'a pas de trapèze ni de raccourci de sixième à montrer.
 *
 * `ajoute` est ce qu'on écrit SUR la flèche. `piege` est ce qu'on répond à
 * l'élève qui place cette carte au mauvais endroit — c'est la phrase qui
 * enseigne, et c'est pour elle que ce tableau existe plutôt qu'une liste de
 * chaînes.
 *
 * `voie` dit par où passe le trait, quand plusieurs relient les deux mêmes
 * cases : voir `traceFleche` plus bas. La géométrie vit ici, avec le reste,
 * pour que l'écran et le papier dessinent le MÊME organigramme.
 */
export const FLECHES = [
    // --- Du quadrilatère quelconque au parallélogramme : trois chemins --------
    {
        de: 'quadrilatere', vers: 'parallelogramme', voie: -1,
        ajoute: 'Qui a ses côtés opposés parallèles', court: 'côtés opposés parallèles',
        famille: 'cotes', propriete: 'opposesParalleles',
        piege: 'Le parallélogramme n\'ajoute pas des côtés égaux : il ajoute le '
            + 'PARALLÉLISME des deux paires de côtés opposés. Les longueurs suivent toutes '
            + 'seules.'
    },
    {
        de: 'quadrilatere', vers: 'parallelogramme', voie: 0,
        ajoute: 'Qui a ses côtés opposés égaux', court: 'côtés opposés égaux',
        famille: 'cotes', propriete: 'cotesOpposesEgaux',
        piege: 'Deux paires de côtés opposés de même longueur suffisent : le parallélisme '
            + 'suit. Attention, il faut bien les côtés OPPOSÉS — deux côtés consécutifs '
            + 'égaux ne donnent rien du tout dans un quadrilatère quelconque.'
    },
    {
        de: 'quadrilatere', vers: 'parallelogramme', voie: 1,
        ajoute: 'Qui a ses diagonales se croisant en leur milieu', court: 'diagonales : même milieu',
        famille: 'diagonales', propriete: 'diagonalesMilieu',
        piege: 'C\'est la troisième façon d\'être un parallélogramme, et la plus oubliée. '
            + 'Les diagonales se coupent en leur MILIEU — qu\'elles se coupent tout court '
            + 'n\'apprend rien, tout quadrilatère non croisé le fait.'
    },

    // --- Les deux raccourcis, ceux de la sixième ------------------------------
    {
        // LA VOIE ÉCARTE LE RACCOURCI DE LA CASE DU MILIEU. Mesuré sur le trait
        // droit : il frôlait le parallélogramme à 2,5 unités, soit six pixels
        // sur un écran d'ordinateur — assez pour qu'on croie qu'il s'y arrête.
        // Incurvé vers le haut, il passe à 22 unités.
        de: 'quadrilatere', vers: 'rectangle', voie: -1,
        ajoute: 'Qui a 3 ou 4 angles droits', court: '3 ou 4 angles droits', famille: 'raccourci',
        piege: 'Trois suffisent : la somme des angles d\'un quadrilatère vaut 360°, donc le '
            + 'quatrième est droit lui aussi. C\'est la définition du rectangle qu\'on donne '
            + 'en sixième, sans passer par le parallélogramme.'
    },
    {
        // Et son symétrique s'incurve vers le bas, par-dessous.
        de: 'quadrilatere', vers: 'losange', voie: 1,
        ajoute: 'Qui a 4 côtés égaux', court: '4 côtés égaux',
        famille: 'raccourci', propriete: 'quatreCotesEgaux',
        piege: 'QUATRE côtés égaux, pas deux : c\'est la définition du losange, et elle part '
            + 'directement du quadrilatère quelconque. Dans un parallélogramme, deux côtés '
            + 'consécutifs auraient suffi.'
    },

    // --- Du parallélogramme au rectangle : deux chemins -----------------------
    {
        de: 'parallelogramme', vers: 'rectangle', voie: -1,
        ajoute: 'Qui a deux côtés consécutifs perpendiculaires', court: 'un angle droit',
        famille: 'cotes', propriete: 'unAngleDroit',
        piege: 'Un seul angle droit suffit dans un parallélogramme : les trois autres le '
            + 'deviennent forcément.'
    },
    {
        de: 'parallelogramme', vers: 'rectangle', voie: 1,
        ajoute: 'Qui a ses diagonales de même longueur', court: 'diagonales égales',
        famille: 'diagonales', propriete: 'diagonalesEgales',
        piege: 'Des diagonales de MÊME LONGUEUR font le rectangle ; des diagonales '
            + 'PERPENDICULAIRES font le losange. C\'est la paire qu\'on échange le plus '
            + 'souvent.'
    },

    // --- Du parallélogramme au losange : deux chemins -------------------------
    {
        de: 'parallelogramme', vers: 'losange', voie: -1,
        ajoute: 'Qui a deux côtés consécutifs de même longueur', court: '2 côtés consécutifs égaux',
        famille: 'cotes',
        piege: 'Dans un parallélogramme, deux côtés CONSÉCUTIFS de même longueur suffisent : '
            + 'les côtés opposés étaient déjà égaux.'
    },
    {
        de: 'parallelogramme', vers: 'losange', voie: 1,
        ajoute: 'Qui a ses diagonales perpendiculaires', court: 'diagonales perpendiculaires',
        famille: 'diagonales', propriete: 'diagonalesPerpendiculaires',
        piege: 'Des diagonales PERPENDICULAIRES font le losange ; des diagonales de même '
            + 'LONGUEUR font le rectangle. C\'est la paire qu\'on échange le plus souvent.'
    },

    // --- Et le carré, par les deux côtés --------------------------------------
    {
        de: 'rectangle', vers: 'carre', voie: -1,
        ajoute: 'Qui a deux côtés consécutifs de même longueur', court: '2 côtés consécutifs égaux',
        famille: 'cotes',
        piege: 'Au rectangle il manque les longueurs ; au losange il manque l\'angle droit. '
            + 'Ce n\'est pas la même carte qui les complète.'
    },
    {
        de: 'rectangle', vers: 'carre', voie: 1,
        ajoute: 'Qui a ses diagonales perpendiculaires', court: 'diagonales perpendiculaires',
        famille: 'diagonales', propriete: 'diagonalesPerpendiculaires',
        piege: 'Au rectangle, les diagonales sont déjà de même longueur : ce qui lui manque, '
            + 'c\'est qu\'elles soient PERPENDICULAIRES.'
    },
    {
        de: 'losange', vers: 'carre', voie: -1,
        ajoute: 'Qui a deux côtés consécutifs perpendiculaires', court: 'un angle droit',
        famille: 'cotes', propriete: 'unAngleDroit',
        piege: 'Au losange il manque l\'angle droit ; au rectangle il manque les longueurs. '
            + 'Ce n\'est pas la même carte qui les complète.'
    },
    {
        de: 'losange', vers: 'carre', voie: 1,
        ajoute: 'Qui a ses diagonales de même longueur', court: 'diagonales égales',
        famille: 'diagonales', propriete: 'diagonalesEgales',
        piege: 'Au losange, les diagonales sont déjà perpendiculaires : ce qui lui manque, '
            + 'c\'est qu\'elles aient la MÊME LONGUEUR.'
    }
];

export const familleDe = (id) => FAMILLES.find(f => f.id === id) || null;

/**
 * TOUT CE QU'UN QUADRILATÈRE EST AUSSI — en remontant les flèches.
 *
 * C'est la question qui départage : « un carré est-il un rectangle ? ». Oui, et
 * un losange, et un parallélogramme, et un quadrilatère.
 */
export function ancetres(id) {
    const out = new Set();
    const marche = (courant) => {
        FLECHES.filter(f => f.vers === courant).forEach(f => {
            if (out.has(f.de)) return;
            out.add(f.de);
            marche(f.de);
        });
    };
    marche(id);
    return [...out];
}

/** Est-ce que TOUT `a` est un `b` ? (« tout carré est un rectangle » : vrai) */
export const estToujours = (a, b) => a === b || ancetres(a).includes(b);

export const MODES = {
    FAMILLES: 'familles',      // placer les NOMS dans les cases
    PROPRIETES: 'proprietes'   // placer les CONDITIONS sur les flèches
};

export const PALIERS = {
    decouverte: { label: 'Placer trois noms', mode: MODES.FAMILLES, trous: 3 },
    noms: { label: 'Placer tous les noms', mode: MODES.FAMILLES, trous: 5 },
    // LES CONDITIONS SE POSENT ÉTAPE PAR ÉTAPE, et les deux paliers ne diffèrent
    // que par le nombre d'INTRUS mêlés aux bonnes cartes. Voir `ETAPES`.
    conditions: { label: 'Construire l\'organigramme, étape par étape', mode: MODES.PROPRIETES, intrus: 1 },
    tout: { label: 'Étape par étape, avec des intrus', mode: MODES.PROPRIETES, intrus: 3 }
};

/**
 * LES SEPT ÉTAPES — l'organigramme se construit, il ne s'affiche pas.
 *
 * Rémy : « il faut le faire apparaître au fur et à mesure : on part du
 * quadrilatère puis le parallélogramme, et on cherche les liens entre les deux
 * en posant les cartes ; puis parallélogramme au rectangle, puis parallélogramme
 * au losange, puis losange au carré, puis rectangle au carré. Ça ne fait qu'un
 * exercice. »
 *
 * CE QUE LA PROGRESSION CHANGE, ET CE N'EST PAS QU'UNE QUESTION DE PLACE. La
 * version précédente montrait les cinq cases et les treize flèches d'un coup :
 * l'élève cherchait où poser une carte parmi treize trous, ce qui est un
 * problème de rangement. Ici on lui pose UNE question à la fois — « qu'est-ce
 * qu'un rectangle a de plus qu'un parallélogramme ? » — et c'est une question
 * de géométrie. La carte se construit sous ses yeux comme on la construit au
 * tableau.
 *
 * ET LES SLOTS D'UNE ÉTAPE SONT INTERCHANGEABLES. Les trois façons d'être un
 * parallélogramme sont trois flèches distinctes, mais aucune n'est « la
 * première » : exiger un ordre aurait inventé une difficulté qui n'existe pas
 * en mathématiques. On demande l'ENSEMBLE des conditions qui mènent de A à B ;
 * peu importe laquelle on écrit d'abord.
 *
 * LES DEUX RACCOURCIS ONT LEUR PROPRE ÉTAPE, glissée juste après celle qui fait
 * apparaître leur case d'arrivée — c'est le premier moment où l'on peut les
 * poser. Ce sont les définitions de sixième, celles qu'on donne avant même de
 * parler de parallélogramme : « trois ou quatre angles droits » fait un
 * rectangle, « quatre côtés égaux » fait un losange, directement. Les passer
 * sous silence aurait laissé croire qu'on ne peut atteindre le rectangle qu'en
 * passant par le parallélogramme, ce qui est faux.
 */
export const ETAPES = [
    { de: 'quadrilatere', vers: 'parallelogramme' },
    { de: 'parallelogramme', vers: 'rectangle' },
    { de: 'quadrilatere', vers: 'rectangle' },
    { de: 'parallelogramme', vers: 'losange' },
    { de: 'quadrilatere', vers: 'losange' },
    { de: 'losange', vers: 'carre' },
    { de: 'rectangle', vers: 'carre' }
];

/**
 * Un organigramme à compléter.
 *
 * ON NE VIDE JAMAIS LE HAUT EN PREMIER. « Quadrilatère » tout en haut est le
 * seul nom qu'un élève de sixième pose sans réfléchir ; le retirer d'abord
 * rendrait l'exercice trivial pour commencer et dur pour finir, exactement à
 * l'envers. On perce donc EN PARTANT DU BAS — carré, losange, rectangle — là
 * où les distinctions se jouent.
 *
 * @returns {Object} { mode, trous, cartes, solution }
 */
export function genererOrganigramme({ rng, palier = 'noms' } = {}) {
    // LES PALIERS DE CONDITIONS NE PASSENT PLUS PAR ICI : ils se jouent étape
    // par étape, et c'est `genererProgressif` qui les fabrique. Un appel avec un
    // de ces paliers est une erreur d'aiguillage ; on retombe sur le palier de
    // noms le plus proche plutôt que de rendre un organigramme sans trous.
    const demande = PALIERS[palier];
    const P = (demande && demande.mode === MODES.FAMILLES) ? demande : PALIERS.noms;
    if (P.mode === MODES.FAMILLES) {
        const ordre = [...FAMILLES].sort((a, b) => b.rang - a.rang);
        const trous = ordre.slice(0, Math.min(P.trous, ordre.length)).map(f => f.id);
        return {
            mode: P.mode, palier,
            trous,
            // Les cartes sont MÉLANGÉES, mais ce sont exactement les cases à
            // remplir : pas de carte en trop. Un intrus transformerait un
            // exercice de classement en exercice d'élimination.
            cartes: rng.shuffle(trous.map(id => ({ id, texte: familleDe(id).nom }))),
            solution: Object.fromEntries(trous.map(id => [id, id]))
        };
    }
    // Les conditions : on perce les flèches du bas vers le haut, pour la même
    // raison — c'est en bas que « angle droit » et « côtés égaux » s'échangent.
    const ordre = [...FLECHES].reverse();
    const trous = ordre.slice(0, Math.min(P.trous, ordre.length)).map(cleFleche);
    return {
        mode: P.mode, palier,
        trous,
        cartes: rng.shuffle(trous.map(cle => {
            const f = flecheDe(cle);
            return { id: cle, texte: f.ajoute };
        })),
        solution: Object.fromEntries(trous.map(cle => [cle, cle]))
    };
}

/**
 * LA FIGURE DE RÉMY, REPRISE TELLE QUELLE.
 *
 * Il a envoyé sa fiche : l'organigramme rempli, le même vide, et la planche de
 * vignettes à découper. « Je ne suis pas satisfait de l'organigramme. » Il
 * avait raison, et sur trois points qui ne sont pas des détails.
 *
 * 1. UNE CONDITION EST UNE CASE, PAS UNE ÉTIQUETTE DE FLÈCHE. Sur sa fiche, on
 *    lit « Un quadrilatère → [Qui a ses côtés opposés parallèles] →
 *    Parallélogramme ». La condition est une ÉTAPE du chemin, avec sa boîte,
 *    ses deux flèches, sa place. C'est ce qui permet de la découper, de la
 *    poser, de la déplacer — et c'est ce que « cartes à replacer » veut dire.
 *    Une étiquette collée sur un trait n'est pas une carte.
 *
 * 2. LA LECTURE VA DE HAUT EN BAS. J'avais couché la figure pour faire tenir
 *    des libellés de quarante caractères sur des flèches horizontales. Le
 *    problème était réel, mais la solution attaquait le mauvais bout : dès que
 *    la condition a sa propre case, la largeur ne manque plus, et l'on retrouve
 *    le sens naturel — on DESCEND vers le plus particulier. Le carré est en
 *    bas, sous ses deux parents, et l'on voit d'un coup d'œil qu'on l'atteint
 *    des deux côtés.
 *
 * 3. LA COULEUR DIT LA FAMILLE DE LA PROPRIÉTÉ. Bleu, ce qui parle des CÔTÉS ;
 *    rouge, ce qui parle des DIAGONALES ; mauve, les deux raccourcis qui
 *    descendent directement du quadrilatère. Ce n'est pas de la décoration :
 *    l'élève qui cherche « ce qui manque au rectangle pour être un carré » sait
 *    qu'il y a une réponse bleue et une rouge, et les deux disent la même
 *    chose autrement. C'est l'idée de Rémy, et elle vaut mieux qu'un long
 *    discours.
 *
 * LE REPÈRE VA DE 0 À 100 EN X ET EN Y, y vers le bas. Les cases de figures
 * sont carrées, les cases de conditions sont larges et basses : ce sont deux
 * objets différents, et ils ne doivent pas se confondre.
 */
export const POSITIONS = {
    quadrilatere: { x: 100, y: 13 },
    parallelogramme: { x: 100, y: 55 },
    rectangle: { x: 56, y: 97 },
    losange: { x: 144, y: 97 },
    carre: { x: 100, y: 139 }
};

/**
 * LE PLAN S'ÉTALE, ET C'EST CE QUI LE REND LISIBLE.
 *
 * Rémy : « je suis un peu déçu de l'organigramme, celui que je t'ai donné était
 * plus joli. » Le plan faisait cent de large sur cent quarante de haut, donc
 * plus haut que large — et il s'affiche dans une scène qui, elle, est toujours
 * plus large que haute. Mesuré sur un écran d'ordinateur : le plan occupait
 * 445 pixels de large dans une scène qui en offrait 1400. Mille pixels de blanc
 * de chaque côté, pendant que « diagonales perpendiculaires » se rognait dans
 * une case de soixante-dix.
 *
 * Ce n'est pas la taille des cases qu'il fallait discuter, c'est le FORMAT du
 * plan : la largeur d'une case, en pixels, vaut sa largeur de plan divisée par
 * la HAUTEUR du plan, multipliée par la hauteur offerte. Un plan haut et étroit
 * ne peut donc pas avoir de grandes cases, quelle que soit la place disponible
 * à côté. En l'étalant — deux cents de large — chaque case DOUBLE, et rien
 * d'autre ne change : mêmes huit rangées, même ordre, mêmes chemins.
 *
 * SUR LE PAPIER AUSSI. La feuille est en A4 portrait, mais le plan y était
 * dessiné dans un tiers de sa largeur, avec cinquante millimètres de blanc de
 * chaque côté. Étalé, il prend la feuille et la liste se range dessous.
 */
export const PLAN_L = 200;
export const PLAN_H = 150;

/** La case d'une figure : elle porte un dessin et un nom sous lui. */
export const CASE_L = 30;
export const CASE_H = 22;

/** La case d'une condition : large et basse, elle porte une phrase. */
export const COND_L = 34;
export const COND_H = 14;

/**
 * OÙ SE POSE CHAQUE CONDITION, dans l'ordre de `FLECHES`.
 *
 * Quatre rangées, exactement celles de la fiche : les trois chemins vers le
 * parallélogramme au milieu et les deux raccourcis à leurs côtés ; les quatre
 * chemins du parallélogramme ; les quatre chemins vers le carré.
 *
 * LES DEUX COULOIRS DU BORD, à x = 3 et x = 97, ne portent aucune case : ils
 * sont réservés aux traits des raccourcis, qui descendent de tout en haut à
 * tout en bas. Un raccourci qui couperait au plus court traverserait quatre
 * autres boîtes — mesuré, et c'est ce que Rémy a évité en les faisant longer
 * l'extérieur.
 */
export const POSITIONS_CONDITIONS = [
    { x: 64, y: 34 },   // quadrilatère → parallélogramme : côtés opposés parallèles
    { x: 136, y: 34 },  // quadrilatère → parallélogramme : côtés opposés égaux
    { x: 100, y: 34 },  // quadrilatère → parallélogramme : diagonales, même milieu
    { x: 28, y: 34 },   // raccourci : 3 ou 4 angles droits → rectangle
    { x: 172, y: 34 },  // raccourci : 4 côtés égaux → losange
    { x: 24, y: 76 },   // parallélogramme → rectangle : côtés consécutifs perpendiculaires
    { x: 74, y: 76 },   // parallélogramme → rectangle : diagonales de même longueur
    { x: 126, y: 76 },  // parallélogramme → losange : côtés consécutifs de même longueur
    { x: 176, y: 76 },  // parallélogramme → losange : diagonales perpendiculaires
    { x: 24, y: 118 },  // rectangle → carré : côtés consécutifs de même longueur
    { x: 74, y: 118 },  // rectangle → carré : diagonales perpendiculaires
    { x: 126, y: 118 }, // losange → carré : côtés consécutifs perpendiculaires
    { x: 176, y: 118 }  // losange → carré : diagonales de même longueur
];

/** Les couloirs latéraux, où passent les traits des raccourcis. */
export const COULOIR_G = 4;
export const COULOIR_D = 196;

/** L'identifiant d'une condition : sa place dans `FLECHES`, et rien d'autre. */
export const cleFleche = (f) => `${f.de}>${f.vers}#${FLECHES.indexOf(f)}`;

/** Retrouver une condition par sa clef. */
export const flecheDe = (cle) => FLECHES[Number(String(cle).split('#')[1])] || null;

/** La position d'une condition, par son rang dans `FLECHES`. */
export const posCondition = (f) => POSITIONS_CONDITIONS[FLECHES.indexOf(f)] || { x: 50, y: 50 };

/** Le rectangle occupé par une case, centré sur sa position. */
const boite = (p, l, h) => ({
    x1: p.x - l / 2, x2: p.x + l / 2,
    y1: p.y - h / 2, y2: p.y + h / 2
});

export const boiteFigure = (id) => boite(POSITIONS[id], CASE_L, CASE_H);
export const boiteCondition = (f) => boite(posCondition(f), COND_L, COND_H);

/**
 * LE TRAIT D'UNE FIGURE À UNE CONDITION, ou d'une condition à une figure.
 *
 * ORTHOGONAL, EN TROIS SEGMENTS, comme sur la fiche : on sort par le bas (ou le
 * haut), on se décale à l'horizontale à mi-chemin, on entre par le haut (ou le
 * bas). Un trait oblique traverserait les cases voisines — sur une figure aussi
 * dense, c'est ce qui la rend illisible.
 *
 * LES RACCOURCIS LONGENT LE BORD. « 3 ou 4 angles droits » est en haut à gauche
 * et doit rejoindre le rectangle, tout en bas : passer tout droit traverserait
 * la moitié de l'organigramme. Le trait descend donc le long du bord extérieur,
 * comme Rémy l'a tracé.
 *
 * @returns {Array<{x, y}>} la polyligne, du départ vers l'arrivée
 */
export function traceLien(depart, arrivee, { bord = 0 } = {}) {
    const a = depart, b = arrivee;
    // Le sens : on descend presque toujours, mais un raccourci peut remonter.
    const versLeBas = b.y1 >= a.y2;
    const sortie = { x: a.x, y: versLeBas ? a.y2 : a.y1 };
    const entree = { x: b.x, y: versLeBas ? b.y1 : b.y2 };

    if (bord) {
        // LE CHEMIN DU BORD : on sort sur le côté, on longe le couloir, on entre
        // par le côté. Le couloir ne porte aucune case — voir POSITIONS_CONDITIONS.
        const aGauche = bord < 0;
        const xBord = aGauche ? COULOIR_G : COULOIR_D;
        return [
            { x: aGauche ? a.x1 : a.x2, y: a.y },
            { x: xBord, y: a.y },
            { x: xBord, y: b.y },
            { x: aGauche ? b.x1 : b.x2, y: b.y }
        ];
    }

    if (Math.abs(sortie.x - entree.x) < 0.5) return [sortie, entree];
    const milieu = (sortie.y + entree.y) / 2;
    return [sortie, { x: sortie.x, y: milieu }, { x: entree.x, y: milieu }, entree];
}

/**
 * LA POINTE D'UNE FLÈCHE : où elle se pose, et vers où elle regarde.
 *
 * Rémy : « celui que je t'ai donné était plus joli. » Un organigramme dessiné
 * avec des TRAITS n'est pas un organigramme — c'est un treillis. Ce qui se lit
 * d'un coup d'œil sur sa fiche, c'est le SENS : on descend du général au
 * particulier, et chaque trait le dit par sa pointe. Sans elles, il faut
 * deviner qui descend vers qui, et l'on perd la seule chose que la figure
 * enseigne.
 *
 * La pointe se pose au bout du dernier segment, et son sens est celui de ce
 * segment — vertical presque partout, horizontal pour les deux raccourcis qui
 * longent le bord. On rend un vecteur unitaire plutôt qu'un nom de direction :
 * l'écran, l'aperçu et le PDF n'ont plus qu'à le multiplier par la taille
 * qu'ils veulent donner à la pointe.
 */
export function pointeDe(polyligne) {
    const n = polyligne.length;
    if (n < 2) return null;
    const fin = polyligne[n - 1], avant = polyligne[n - 2];
    const dx = fin.x - avant.x, dy = fin.y - avant.y;
    const d = Math.hypot(dx, dy) || 1;
    return { x: fin.x, y: fin.y, ux: dx / d, uy: dy / d };
}

/** Les deux traits d'une condition : ce qui y entre, et ce qui en sort. */
export function traitsDeCondition(f) {
    const dep = { ...boiteFigure(f.de), x: POSITIONS[f.de].x, y: POSITIONS[f.de].y };
    const arr = { ...boiteFigure(f.vers), x: POSITIONS[f.vers].x, y: POSITIONS[f.vers].y };
    const c = posCondition(f);
    const cond = { ...boiteCondition(f), x: c.x, y: c.y };
    // LES RACCOURCIS SORTENT PAR LE CÔTÉ et longent le bord — voir `traceLien`.
    const bord = f.famille === 'raccourci' ? (c.x < 50 ? -1 : 1) : 0;
    return {
        entrant: traceLien(dep, cond, { bord: bord && 0 }),
        sortant: traceLien(cond, arr, { bord })
    };
}

/** Les conditions d'un même chemin, dans l'ordre où elles se lisent. */
export function conditionsDe(de, vers) {
    return FLECHES.filter(f => f.de === de && f.vers === vers);
}

/**
 * OÙ SE POSE L'ÉTIQUETTE D'UNE CONDITION : dans sa case, évidemment.
 *
 * La fonction reste, parce que la fiche papier et l'écran l'appellent tous les
 * deux — et parce qu'ils doivent dessiner le MÊME organigramme.
 */
export function posEtiquette(f) {
    const c = posCondition(f);
    return { x: c.x, y: c.y, bord: false };
}

/**
 * Une carte posée sur une case : est-ce juste ?
 *
 * DEUX FLÈCHES PORTENT LE MÊME TEXTE, et ce n'est pas un défaut — c'est le
 * chapitre. « Un angle droit » mène du parallélogramme au rectangle ET du
 * losange au carré. Une carte qui porte ce texte est donc juste aux DEUX
 * endroits : refuser l'une des deux enseignerait le contraire de ce que
 * l'organigramme montre.
 */
export function verifierDepot(org, caseId, carte) {
    if (org.mode === MODES.FAMILLES) {
        return { ok: carte.id === caseId, raison: carte.id === caseId ? '' : mauvaiseFamille(caseId, carte.id) };
    }
    const attendue = flecheDe(caseId);
    const posee = flecheDe(carte.id);
    if (!attendue || !posee) return { ok: false, raison: '' };
    if (posee.ajoute === attendue.ajoute) return { ok: true, texteJuste: memeTexte(attendue) };
    return { ok: false, raison: attendue.piege };
}

/** Quand deux flèches portent la même condition, on le DIT : c'est la leçon. */
function memeTexte(fleche) {
    const jumelles = FLECHES.filter(f => f.ajoute === fleche.ajoute);
    if (jumelles.length < 2) return '';
    const autre = jumelles.find(f => cleFleche(f) !== cleFleche(fleche));
    return `Et la même condition sert aussi de ${familleDe(autre.de).nom.toLowerCase()} `
        + `à ${familleDe(autre.vers).nom.toLowerCase()} : c'est pour cela qu'on arrive au carré `
        + 'par deux chemins.';
}

function mauvaiseFamille(attendu, propose) {
    const a = familleDe(attendu), p = familleDe(propose);
    if (!a || !p) return '';
    if (estToujours(p.id, a.id)) {
        return `Tout ${p.nom.toLowerCase()} est bien un ${a.nom.toLowerCase()} — mais ici on `
            + `veut la case la plus GÉNÉRALE, celle où l'on n'a pas encore ajouté de condition.`;
    }
    if (estToujours(a.id, p.id)) {
        return `Attention au sens : tout ${a.nom.toLowerCase()} est un ${p.nom.toLowerCase()}, `
            + 'et non l\'inverse. Les cases du bas sont les plus particulières.';
    }
    return `${p.nom} et ${a.nom} ne sont pas au même niveau : on descend en ajoutant une `
        + 'condition à la fois.';
}

/**
 * L'ORGANIGRAMME PROGRESSIF : sept étapes, treize conditions, un seul exercice.
 *
 * Chaque étape apporte ses bonnes cartes MÊLÉES À DES INTRUS. Sans intrus, une
 * étape à deux fentes et deux cartes se remplirait sans réfléchir : la dernière
 * carte tomberait toute seule. Les intrus sont pris parmi les autres conditions
 * de l'organigramme, jamais inventés — ce sont précisément celles qu'on
 * confond, et le refus les renvoie à leur vraie place.
 *
 * @returns {{mode, palier, etapes: Array}}
 */
/** La vignette d'une condition, à partir de sa phrase entière. */
export const vignetteDe = (texte) => {
    const f = FLECHES.find(x => x.ajoute === texte);
    return (f && f.court) || texte;
};

export function genererProgressif({ rng, palier = 'conditions' } = {}) {
    const P = PALIERS[palier] || PALIERS.conditions;
    const intrus = P.intrus === undefined ? 1 : P.intrus;
    let numero = 0;

    const etapes = ETAPES.map((e, rang) => {
        const fleches = conditionsDe(e.de, e.vers);
        const bonnes = fleches.map(f => f.ajoute);
        // Les intrus : d'autres conditions de la figure, jamais le même texte
        // qu'une bonne réponse — « un angle droit » sert deux fois, et il serait
        // juste ici comme là.
        const ailleurs = [];
        FLECHES.forEach(f => {
            if (bonnes.includes(f.ajoute) || ailleurs.includes(f.ajoute)) return;
            ailleurs.push(f.ajoute);
        });
        const faux = rng.shuffle(ailleurs.slice()).slice(0, intrus);
        // LA CARTE PORTE LES DEUX ÉCRITURES. `court` est ce qu'on lit sur la
        // vignette et sur la flèche ; `texte` reste la phrase entière, celle
        // qui juge, celle du carnet et celle qu'on relit. Une seule des deux
        // tient sur un trait, l'autre seule fait une leçon.
        const cartes = rng.shuffle(bonnes.concat(faux).map(texte => ({
            id: 'c' + (numero++), texte, court: vignetteDe(texte),
            juste: bonnes.includes(texte)
        })));
        return {
            rang, de: e.de, vers: e.vers,
            cles: fleches.map(cleFleche),
            bonnes, cartes,
            titre: `${familleDe(e.de).nom} → ${familleDe(e.vers).nom}`
        };
    });
    return { mode: MODES.PROPRIETES, palier, progressif: true, etapes };
}

/** Les cases visibles quand on aborde l'étape numéro `rang`. */
export function casesVisibles(rang) {
    const vues = new Set(['quadrilatere']);
    for (let i = 0; i <= rang && i < ETAPES.length; i++) {
        vues.add(ETAPES[i].de);
        vues.add(ETAPES[i].vers);
    }
    return [...vues];
}

/** La carte posée convient-elle à cette étape ? */
export function verifierEtape(etape, carte) {
    if (!carte) return { ok: false, raison: '' };
    if (etape.bonnes.includes(carte.texte)) {
        return { ok: true, texteJuste: memeTexte(FLECHES.find(f => f.ajoute === carte.texte)) };
    }
    return { ok: false, raison: refusEtape(etape, carte.texte) };
}

/**
 * POURQUOI CETTE CARTE N'EST PAS ICI — et où elle est vraiment.
 *
 * Le refus ne dit jamais « non » tout court : il nomme la flèche à laquelle la
 * condition appartient, puis reprend le `piege` de cette flèche, qui est la
 * phrase écrite pour cette confusion-là. Un élève qui pose « les diagonales
 * sont perpendiculaires » entre le parallélogramme et le rectangle apprend, au
 * moment où il se trompe, que c'est la paire qu'on échange le plus souvent.
 */
export function refusEtape(etape, texte) {
    const A = familleDe(etape.de).nom.toLowerCase();
    const B = familleDe(etape.vers).nom.toLowerCase();
    const maisons = FLECHES.filter(f => f.ajoute === texte);
    if (!maisons.length) return `« ${texte} » ne fait pas passer du ${A} au ${B}.`;
    const ou = maisons.map(f => `du ${familleDe(f.de).nom.toLowerCase()} au `
        + familleDe(f.vers).nom.toLowerCase());
    const liste = ou.length > 1 ? `${ou.slice(0, -1).join(', ')} et ${ou[ou.length - 1]}` : ou[0];
    return `« ${texte} » ne fait pas passer du ${A} au ${B} : c'est la condition qui mène `
        + `${liste}. ${maisons[0].piege}`;
}

/**
 * L'AIDE D'UNE ÉTAPE NE DONNE PAS LA RÉPONSE : elle donne les trois registres.
 *
 * Une condition de cet organigramme se dit toujours par les CÔTÉS, par les
 * ANGLES ou par les DIAGONALES — il n'y a pas de quatrième façon. L'élève qui
 * bloque a presque toujours trouvé un registre et oublié les deux autres ;
 * c'est cela qu'il faut lui rendre, pas le mot qui manque.
 */
export function conseilEtape(etape, posees = 0) {
    const reste = etape.bonnes.length - posees;
    const A = familleDe(etape.de).nom.toLowerCase();
    const B = familleDe(etape.vers).nom.toLowerCase();
    return (reste > 1
        ? `Il reste ${reste} conditions à trouver — et il y en a bien plusieurs : `
        : 'Il reste une condition à trouver : ')
        + `demande-toi ce qu'un ${B} a de plus qu'un ${A}. Une réponse se dit toujours `
        + 'd\'une de ces trois façons : par les CÔTÉS, par les ANGLES, ou par les DIAGONALES.';
}

/** L'organigramme est-il complet et juste ? */
export function verifierOrganigramme(org, poses) {
    for (const caseId of org.trous) {
        const carte = poses[caseId];
        if (!carte) return { fini: false, manque: caseId };
        if (!verifierDepot(org, caseId, carte).ok) return { fini: false, faux: caseId };
    }
    return { fini: true };
}

/** Le conseil écrit : il rappelle la règle, jamais la case. */
export function conseil(org, poses) {
    const reste = org.trous.filter(t => !poses[t]);
    if (!reste.length) return 'Tout est posé — relis chaque flèche : descendre d\'un cran, c\'est ajouter UNE condition.';
    if (org.mode === MODES.FAMILLES) {
        return 'Commence par le bas : la case la plus basse est la plus PARTICULIÈRE, celle '
            + 'qui a le plus de conditions. Chaque fois qu\'on monte, on en enlève une.';
    }
    return 'Chaque flèche ajoute UNE SEULE condition. Demande-toi ce qui manque encore à la '
        + 'figure du dessus pour devenir celle du dessous — et rien de plus.';
}
