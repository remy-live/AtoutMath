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
        famille: 'cotes', theme: 'cotesOpposes', propriete: 'opposesParalleles',
        piege: 'Le parallélogramme n\'ajoute pas des côtés égaux : il ajoute le '
            + 'PARALLÉLISME des deux paires de côtés opposés. Les longueurs suivent toutes '
            + 'seules.'
    },
    {
        de: 'quadrilatere', vers: 'parallelogramme', voie: 0,
        ajoute: 'Qui a ses côtés opposés égaux', court: 'côtés opposés égaux',
        famille: 'cotes', theme: 'cotesOpposes', propriete: 'cotesOpposesEgaux',
        piege: 'Deux paires de côtés opposés de même longueur suffisent : le parallélisme '
            + 'suit. Attention, il faut bien les côtés OPPOSÉS — deux côtés consécutifs '
            + 'égaux ne donnent rien du tout dans un quadrilatère quelconque.'
    },
    {
        de: 'quadrilatere', vers: 'parallelogramme', voie: 1,
        ajoute: 'Qui a ses diagonales se croisant en leur milieu', court: 'diagonales : même milieu',
        famille: 'diagonales', theme: 'diagonales', propriete: 'diagonalesMilieu',
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
        theme: 'sixieme',
        piege: 'Trois suffisent : la somme des angles d\'un quadrilatère vaut 360°, donc le '
            + 'quatrième est droit lui aussi. C\'est la définition du rectangle qu\'on donne '
            + 'en sixième, sans passer par le parallélogramme.'
    },
    {
        // Et son symétrique s'incurve vers le bas, par-dessous.
        de: 'quadrilatere', vers: 'losange', voie: 1,
        ajoute: 'Qui a 4 côtés égaux', court: '4 côtés égaux',
        famille: 'raccourci', theme: 'sixieme', propriete: 'quatreCotesEgaux',
        piege: 'QUATRE côtés égaux, pas deux : c\'est la définition du losange, et elle part '
            + 'directement du quadrilatère quelconque. Dans un parallélogramme, deux côtés '
            + 'consécutifs auraient suffi.'
    },

    // --- Du parallélogramme au rectangle : deux chemins -----------------------
    {
        de: 'parallelogramme', vers: 'rectangle', voie: -1,
        ajoute: 'Qui a deux côtés consécutifs perpendiculaires', court: 'un angle droit',
        famille: 'cotes', theme: 'consecutifs', propriete: 'unAngleDroit',
        piege: 'Un seul angle droit suffit dans un parallélogramme : les trois autres le '
            + 'deviennent forcément.'
    },
    {
        de: 'parallelogramme', vers: 'rectangle', voie: 1,
        ajoute: 'Qui a ses diagonales de même longueur', court: 'diagonales égales',
        famille: 'diagonales', theme: 'diagonales', propriete: 'diagonalesEgales',
        piege: 'Des diagonales de MÊME LONGUEUR font le rectangle ; des diagonales '
            + 'PERPENDICULAIRES font le losange. C\'est la paire qu\'on échange le plus '
            + 'souvent.'
    },

    // --- Du parallélogramme au losange : deux chemins -------------------------
    {
        de: 'parallelogramme', vers: 'losange', voie: -1,
        ajoute: 'Qui a deux côtés consécutifs de même longueur', court: '2 côtés consécutifs égaux',
        famille: 'cotes', theme: 'consecutifs',
        piege: 'Dans un parallélogramme, deux côtés CONSÉCUTIFS de même longueur suffisent : '
            + 'les côtés opposés étaient déjà égaux.'
    },
    {
        de: 'parallelogramme', vers: 'losange', voie: 1,
        ajoute: 'Qui a ses diagonales perpendiculaires', court: 'diagonales perpendiculaires',
        famille: 'diagonales', theme: 'diagonales', propriete: 'diagonalesPerpendiculaires',
        piege: 'Des diagonales PERPENDICULAIRES font le losange ; des diagonales de même '
            + 'LONGUEUR font le rectangle. C\'est la paire qu\'on échange le plus souvent.'
    },

    // --- Et le carré, par les deux côtés --------------------------------------
    {
        de: 'rectangle', vers: 'carre', voie: -1,
        ajoute: 'Qui a deux côtés consécutifs de même longueur', court: '2 côtés consécutifs égaux',
        famille: 'cotes', theme: 'consecutifs',
        piege: 'Au rectangle il manque les longueurs ; au losange il manque l\'angle droit. '
            + 'Ce n\'est pas la même carte qui les complète.'
    },
    {
        de: 'rectangle', vers: 'carre', voie: 1,
        ajoute: 'Qui a ses diagonales perpendiculaires', court: 'diagonales perpendiculaires',
        famille: 'diagonales', theme: 'diagonales', propriete: 'diagonalesPerpendiculaires',
        piege: 'Au rectangle, les diagonales sont déjà de même longueur : ce qui lui manque, '
            + 'c\'est qu\'elles soient PERPENDICULAIRES.'
    },
    {
        de: 'losange', vers: 'carre', voie: -1,
        ajoute: 'Qui a deux côtés consécutifs perpendiculaires', court: 'un angle droit',
        famille: 'cotes', theme: 'consecutifs', propriete: 'unAngleDroit',
        piege: 'Au losange il manque l\'angle droit ; au rectangle il manque les longueurs. '
            + 'Ce n\'est pas la même carte qui les complète.'
    },
    {
        de: 'losange', vers: 'carre', voie: 1,
        ajoute: 'Qui a ses diagonales de même longueur', court: 'diagonales égales',
        famille: 'diagonales', theme: 'diagonales', propriete: 'diagonalesEgales',
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
    PROPRIETES: 'proprietes',  // placer les CONDITIONS sur les flèches
    ASSEMBLAGE: 'assemblage',  // poser les FIGURES CODÉES, puis les relier
    QUESTIONS: 'questions'     // une série de questions, la carte à portée
};

export const PALIERS = {
    decouverte: { label: 'Placer trois noms', mode: MODES.FAMILLES, trous: 3 },
    noms: { label: 'Placer tous les noms', mode: MODES.FAMILLES, trous: 5 },
    // LES CONDITIONS SE POSENT ÉTAPE PAR ÉTAPE, et les deux paliers ne diffèrent
    // que par le nombre d'INTRUS mêlés aux bonnes cartes. Voir `ETAPES`.
    conditions: { label: 'Construire l\'organigramme, étape par étape', mode: MODES.PROPRIETES, intrus: 1 },
    tout: { label: 'Étape par étape, avec des intrus', mode: MODES.PROPRIETES, intrus: 3 },
    // LA DEUXIÈME QUESTION DE RÉMY : l'organigramme VIDE, à remonter en entier.
    assembler: { label: 'Reconstruire l\'organigramme entier', mode: MODES.ASSEMBLAGE },
    // LA TROISIÈME QUESTION DE RÉMY : « ce sera une série de questions où on
    // peut rappeler l'organigramme pour voir. »
    questions: { label: 'Une série de questions (la carte à portée)', mode: MODES.QUESTIONS, combien: 8 }
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

/**
 * La case d'une figure : le dessin, et SOUS lui un bandeau qui porte le nom.
 *
 * Rémy a renvoyé sa fiche : chez lui le nom n'est pas dans la case, il est sur
 * une bande collée dessous, d'une autre couleur. C'est ce qui fait qu'on lit
 * la figure d'abord et son nom ensuite — dans cet ordre-là, qui est celui du
 * raisonnement — et c'est aussi ce qui permet de laisser la bande VIDE quand
 * on demande à l'élève de nommer lui-même.
 */
export const CASE_L = 30;
export const CASE_H = 22;
/** La part de la case que prend le bandeau du nom, sous le dessin. */
export const BANDE_NOM = 0.27;

/** La case d'une condition : large et basse, elle porte une phrase. */
export const COND_L = 42;
export const COND_H = 14;

/**
 * LES COULEURS SONT CELLES DE LA FICHE DE RÉMY, relevées dans son PDF.
 *
 * « Celui que je t'ai donné était plus joli. » Il l'était, et pas seulement par
 * goût : chez lui le fond est SATURÉ et le texte BLANC pour ce qui parle des
 * diagonales et pour les deux raccourcis, tandis que les côtés portent un bleu
 * pâle et un texte noir. Trois familles, trois contrastes — on les distingue
 * d'un coup d'œil à trois mètres, ce qu'un camaïeu de pastels ne fait pas.
 *
 * ET CELA PHOTOCOPIE. C'était l'objection à sa fiche, et elle tombe : les trois
 * fonds ont des clartés très écartées (193, 142, 98 sur 255), donc trois gris
 * bien séparés — et la lettre s'écrit dans un carré BLANC posé au milieu de la
 * case, pas sur l'aplat.
 *
 * Le noyau les porte pour que l'écran et le papier ne puissent pas diverger.
 */
/**
 * LES TEINTES DE LA FEUILLE — PASTEL, PARCE QU'ON ÉCRIT DEDANS.
 *
 * Rémy : « ne mets pas les carrés d'écriture dans les propriétés, car l'élève
 * écrira dans les cases qui ont une couleur pastel. »
 *
 * ELLES ÉTAIENT SATURÉES, et c'était juste tant qu'un carré blanc au milieu
 * portait la réponse : le fond disait la famille, le carré recevait la lettre.
 * Le carré parti, le fond devient la surface d'écriture — et personne n'écrit
 * au crayon gris sur un rouge vif. Les trois teintes s'éclaircissent donc, et
 * gardent leur écart : bleu, rose, mauve, chacune reconnaissable à un mètre.
 *
 * L'ÉCRAN, LUI, GARDE SES COULEURS FRANCHES (voir `.qd-cond--*` dans le jeu), et
 * ce n'est pas une divergence oubliée : là-bas, la case est REMPLIE — on la lit
 * — et un fond saturé la sépare de ses voisines à trois mètres, ce qu'un
 * camaïeu de pastels ne fait pas. Ici, la case est VIDE : on y écrit. Deux
 * usages, deux réglages.
 */
export const COULEURS_FAMILLE = {
    cotes: { fond: '#d7e5f4', encre: '#123055' },
    diagonales: { fond: '#fbd8d8', encre: '#7a1616' },
    raccourci: { fond: '#ecdcf1', encre: '#4a2358' }
};

/** La figure est DESSINÉE ET REMPLIE, et son nom est sur un bandeau clair. */
export const COULEUR_FIGURE = '#ccd0f7';
export const COULEUR_BANDE = '#fff5cc';

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
/**
 * LES DEUX RACCOURCIS MONTENT DANS LES COINS, et c'est la disposition de Rémy.
 *
 * Sur sa fiche, « Qui a 3 ou 4 angles droits » et « Qui a 4 côtés égaux » ne
 * sont pas dans la rangée sous le quadrilatère : ils sont À CÔTÉ de lui, tout
 * en haut, l'un à gauche l'autre à droite, et leur trait descend le long du
 * bord jusqu'au rectangle et au losange. Deux raisons, et les deux comptent :
 *
 *  · CE SONT DES CHEMINS À PART. Les trois conditions du milieu mènent au
 *    parallélogramme ; ces deux-là court-circuitent. Les mêler aux autres dans
 *    une rangée de cinq laissait croire à cinq portes vers la même case.
 *  · LA RANGÉE DU MILIEU RESPIRE. Trois cases au lieu de cinq, sur la même
 *    largeur : chacune passe de trente-quatre unités à quarante-deux, et
 *    « diagonales perpendiculaires » cesse d'être le mot qui décide de la
 *    taille de toute la figure.
 */
export const POSITIONS_CONDITIONS = [
    { x: 50, y: 34 },   // quadrilatère → parallélogramme : côtés opposés parallèles
    { x: 150, y: 34 },  // quadrilatère → parallélogramme : côtés opposés égaux
    { x: 100, y: 34 },  // quadrilatère → parallélogramme : diagonales, même milieu
    { x: 30, y: 16 },   // raccourci : 3 ou 4 angles droits → rectangle
    { x: 170, y: 16 },  // raccourci : 4 côtés égaux → losange
    { x: 27, y: 76 },   // parallélogramme → rectangle : côtés consécutifs perpendiculaires
    { x: 76, y: 76 },   // parallélogramme → rectangle : diagonales de même longueur
    { x: 124, y: 76 },  // parallélogramme → losange : côtés consécutifs de même longueur
    { x: 173, y: 76 },  // parallélogramme → losange : diagonales perpendiculaires
    { x: 27, y: 118 },  // rectangle → carré : côtés consécutifs de même longueur
    { x: 76, y: 118 },  // rectangle → carré : diagonales perpendiculaires
    { x: 124, y: 118 }, // losange → carré : côtés consécutifs perpendiculaires
    { x: 173, y: 118 }  // losange → carré : diagonales de même longueur
];

/** Les couloirs latéraux, où passent les traits des raccourcis. */
export const COULOIR_G = 2;
export const COULOIR_D = 198;

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

    // CÔTE À CÔTE : ON SORT PAR LE FLANC.
    //
    // Depuis que les deux raccourcis sont montés dans les coins, ils sont à la
    // MÊME HAUTEUR que le quadrilatère : le trait qui les relie ne descend pas,
    // il traverse. Le tracé orthogonal habituel sortait alors par le HAUT de la
    // case de départ pour redescendre dans celle d'arrivée — et son segment
    // horizontal passait au travers du quadrilatère qu'il quitte.
    if (b.y1 < a.y2 && a.y1 < b.y2) {
        const versLaDroite = b.x1 >= a.x2;
        const sortie = { x: versLaDroite ? a.x2 : a.x1, y: a.y };
        const entree = { x: versLaDroite ? b.x1 : b.x2, y: b.y };
        if (Math.abs(sortie.y - entree.y) < 0.5) return [sortie, entree];
        // Un décalage de hauteur se rattrape à mi-chemin, comme ailleurs.
        const milieu = (sortie.x + entree.x) / 2;
        return [sortie, { x: milieu, y: sortie.y }, { x: milieu, y: entree.y }, entree];
    }

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
/**
 * LE RAYON DES VIRAGES D'UNE FLÈCHE, en unités de plan.
 *
 * Rémy, deux fois : « améliore les flèches, c'est pas beau une flèche en
 * escaliers ; tu n'as qu'à arrondir le dernier virage » — puis, devant le PDF :
 * « j'aimerais des flèches arrondies ». L'écran a été corrigé le premier ; la
 * feuille, elle, traçait encore ses angles droits. Le rayon vit donc ICI, dans
 * le noyau, et non dans l'un des deux rendus : c'est la même carte, dessinée sur
 * deux supports, et un chiffre recopié finit toujours par diverger.
 */
export const RAYON_VIRAGE = 5;

/**
 * UNE POLYLIGNE DONT LES COINS SONT ARRONDIS, en unités de plan.
 *
 * Rendue en POINTS et non en courbe, parce que les deux supports ne savent pas
 * dessiner la même chose : le navigateur prend un « Q » de SVG, le PDF veut des
 * courbes de Bézier cubiques et sait surtout tracer des segments. Un virage
 * découpé en huit segments ne se distingue d'une vraie courbe ni à l'écran ni
 * sur le papier — la corde d'un arc de cinq unités vaut alors deux dixièmes
 * d'unité, c'est-à-dire un dixième de millimètre sur une feuille A4.
 *
 * Le rayon se réduit tout seul quand le segment est court : sans cela, deux
 * virages voisins se mangeraient l'un l'autre et le trait ferait un nœud.
 *
 * @param {Array<{x,y}>} pts   - la ligne brisée
 * @param {number} rayon       - en unités de plan
 * @param {number} parVirage   - segments par virage
 */
export function coinsArrondis(pts, rayon = RAYON_VIRAGE, parVirage = 8) {
    if (!pts || pts.length < 3) return (pts || []).slice();
    const vers = (a, b, d) => {
        const dx = b.x - a.x, dy = b.y - a.y;
        const l = Math.hypot(dx, dy) || 1;
        const t = Math.min(d, l / 2) / l;
        return { x: a.x + dx * t, y: a.y + dy * t };
    };
    const out = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) {
        const avant = pts[i - 1], coin = pts[i], apres = pts[i + 1];
        const r = Math.min(rayon,
            Math.hypot(coin.x - avant.x, coin.y - avant.y) / 2.2,
            Math.hypot(apres.x - coin.x, apres.y - coin.y) / 2.2);
        const a = vers(coin, avant, r), b = vers(coin, apres, r);
        out.push(a);
        // La quadratique de contrôle `coin`, échantillonnée.
        for (let k = 1; k < parVirage; k++) {
            const t = k / parVirage, u = 1 - t;
            out.push({
                x: u * u * a.x + 2 * u * t * coin.x + t * t * b.x,
                y: u * u * a.y + 2 * u * t * coin.y + t * t * b.y
            });
        }
        out.push(b);
    }
    out.push(pts[pts.length - 1]);
    return out;
}

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

/**
 * CODER LA FIGURE QU'ON VIENT D'ATTEINDRE.
 *
 * Rémy : « On part du quadrilatère pour aller au parallélogramme. Si l'élève se
 * trompe, on recommence. Ensuite, on lui demande de coder le parallélogramme.
 * Puis on passe au rectangle. […] On code le rectangle puis après on met les
 * vignettes. »
 *
 * ON CODE D'ABORD, ON NOMME ENSUITE — et c'est Rémy qui a remis l'ordre à
 * l'endroit : « tu affiches le quadrilatère et le parallélogramme. Tu ouvres
 * une modale pour dire que l'on va coder le parallélogramme. On code le
 * parallélogramme avec les diagonales. Une fois fait, dans l'organigramme, on a
 * le parallélogramme avec le codage, et là seulement on met les vignettes. »
 *
 * La première version faisait l'inverse, et c'était moins bon : on demandait
 * « qu'est-ce qu'un parallélogramme a de plus qu'un quadrilatère ? » à un élève
 * qui n'avait encore rien regardé de la figure. En codant d'abord, il TROUVE
 * les propriétés sur le dessin — deux paires de côtés égaux, des diagonales qui
 * se coupent en leur milieu —, et les vignettes ne font plus que mettre un nom
 * sur ce qu'il vient de voir. La figure codée reste ensuite dans sa case : la
 * réponse est sous ses yeux pendant qu'il choisit.
 *
 * AVEC LES DIAGONALES, puisque c'est d'elles que parle la moitié des
 * conditions : « diagonales qui se croisent en leur milieu », « diagonales de
 * même longueur », « diagonales perpendiculaires ». Les coder d'abord, c'est
 * les avoir déjà mesurées quand la vignette arrive.
 *
 * LES DIMENSIONS SONT FIXES, et c'est voulu : ce sont celles de la case de
 * l'organigramme, à peu de chose près. L'élève doit reconnaître la MÊME figure
 * qu'il vient de voir apparaître, pas une autre du même nom.
 *
 * ET ELLES SONT VÉRIFIÉES, parce qu'un chiffre au hasard PIÈGE. Dans un
 * parallélogramme de base 12, hauteur 8 et décalage 4 — mon premier choix —, un
 * côté mesure exactement la même chose qu'une demi-diagonale : le codage juste
 * demanderait alors la même marque sur les deux, ce qui est vrai par
 * coïncidence de mesures et faux comme propriété de la famille. C'est le même
 * piège que refuse le générateur de « Coder la figure », et un test le vérifie
 * ici : quatre paquets de longueurs pour le parallélogramme, trois pour le
 * rectangle et le losange, deux pour le carré.
 */
export const DIMS_CODAGE = {
    parallelogramme: { base: 12, hauteur: 8, decalage: 5 },
    rectangle: { L: 13, l: 8 },
    losange: { p: 16, q: 11 },
    carre: { cote: 11 }
};

/**
 * LES INTRUS SE CHOISISSENT, ILS NE SE TIRENT PLUS AU HASARD.
 *
 * DEUX DÉFAUTS, ET LE PREMIER EST GRAVE.
 *
 * ① ON PROPOSAIT DES CARTES VRAIES. Le tirage prenait n'importe quelle autre
 * condition de l'organigramme. Or deux d'entre elles — « 3 ou 4 angles droits »
 * et « 4 côtés égaux », celles de sixième — restent VRAIES bien plus bas que
 * leur flèche : un parallélogramme qui a trois angles droits est bel et bien un
 * rectangle. Mesuré sur les sept étapes : SIX couples (étape, intrus) sur
 * cinquante, soit 12 %, étaient des cartes justes. `contreExemple` le disait
 * déjà — « ce n'est pas faux, c'est TROP FORT » — mais `verifierEtape`
 * répondait « faux » quand même : l'élève était compté en erreur et renvoyé au
 * début pour avoir dit quelque chose de vrai. On ne les propose plus.
 *
 * ② LES INTRUS RESTANTS ÉTAIENT TROP LOIN. Mesuré aussi : l'intrus tombait sur
 * une JUMELLE — une condition qui parle de la même chose et diverge sur la
 * propriété — 29 % du temps seulement. Les sept autres fois sur dix, l'élève
 * écartait une carte sans rapport, sans réfléchir. Or les jumelles sont
 * exactement les confusions que les textes de `piege` nomment une par une :
 * « des diagonales de MÊME LONGUEUR font le rectangle ; des diagonales
 * PERPENDICULAIRES font le losange — c'est la paire qu'on échange le plus
 * souvent ». C'est à quoi sert `theme` : ce dont la condition PARLE, et non la
 * famille de couleur à laquelle elle appartient (`famille` réunit sous
 * « cotes » les côtés opposés et les côtés consécutifs, qui ne se confondent
 * pas entre eux).
 *
 * On préfère donc les jumelles, puis le reste s'il en faut davantage — le
 * palier « avec des intrus » en demande trois.
 */
function tirerIntrus(rng, etape, bonnes, ailleurs, combien) {
    // ON NE PIÈGE PAS AVEC UNE VÉRITÉ.
    const honnetes = ailleurs.filter(t => !estTropFort(etape.de, etape.vers, t));
    const themes = new Set(bonnes.map(themeDe));
    const jumelles = honnetes.filter(t => themes.has(themeDe(t)));
    const lointaines = honnetes.filter(t => !themes.has(themeDe(t)));
    return rng.shuffle(jumelles.slice())
        .concat(rng.shuffle(lointaines.slice()))
        .slice(0, combien);
}

/** Ce dont une condition parle — « les diagonales », « les côtés opposés »… */
export const themeDe = (texte) => {
    const f = FLECHES.find(x => x.ajoute === texte);
    return (f && f.theme) || null;
};

/**
 * Cette condition est-elle VRAIE sur cette flèche, sans être son étiquette ?
 *
 * C'est la question que `contreExemple` tranche déjà, et l'on ne la retranche
 * pas ici : une seule définition de « trop fort » dans l'application.
 */
export const estTropFort = (de, vers, texte) =>
    contreExemple(de, vers, texte).genre === 'trop-fort';

/**
 * COMBIEN DE FIGURES ON CODE — Rémy : « et pourquoi faire 4 fois la même
 * chose ».
 *
 * Ce n'est pas tout à fait la même : le parallélogramme code ses côtés opposés
 * et ses diagonales, le rectangle y ajoute les angles droits, le losange les
 * quatre côtés égaux, et le carré réunit les deux. Chaque codage prépare
 * précisément les vignettes qui suivent — c'est là qu'on TROUVE les propriétés
 * avant de les nommer.
 *
 * MAIS LE GESTE, LUI, SE RÉPÈTE, et quatre fois dans un même exercice, c'est
 * long. Le premier codage porte l'essentiel de la leçon ; les suivants
 * l'appliquent. On règle donc, et le défaut devient « le premier seulement » —
 * c'est ce que Rémy demande en le demandant.
 */
export const CODAGES = { tous: 'tous', premier: 'premier', aucun: 'aucun' };

const veutCoder = (reglage, deja) => {
    if (reglage === false || reglage === 'aucun' || reglage === 'non') return false;
    if (reglage === true || reglage === 'tous') return true;
    return deja === 0;                    // « premier » : seulement le premier
};

export function genererProgressif({ rng, palier = 'conditions', codage = 'premier' } = {}) {
    const P = PALIERS[palier] || PALIERS.conditions;
    const intrus = P.intrus === undefined ? 1 : P.intrus;
    let numero = 0;

    const cartes = ETAPES.map((e, rang) => {
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
        const faux = tirerIntrus(rng, e, bonnes, ailleurs, intrus);
        // LA CARTE PORTE LES DEUX ÉCRITURES. `court` est ce qu'on lit sur la
        // vignette et sur la flèche ; `texte` reste la phrase entière, celle
        // qui juge, celle du carnet et celle qu'on relit. Une seule des deux
        // tient sur un trait, l'autre seule fait une leçon.
        const cartes = rng.shuffle(bonnes.concat(faux).map(texte => ({
            id: 'c' + (numero++), texte, court: vignetteDe(texte),
            juste: bonnes.includes(texte)
        })));
        return {
            genre: 'condition',
            rang, de: e.de, vers: e.vers,
            cles: fleches.map(cleFleche),
            bonnes, cartes,
            vues: casesVisibles(rang),
            titre: `${familleDe(e.de).nom} → ${familleDe(e.vers).nom}`
        };
    });

    // L'ALTERNANCE : la case apparaît, on code la figure, puis on pose les
    // vignettes qui y mènent. Une figure ne se code qu'UNE fois — les deux
    // raccourcis de sixième arrivent sur une case déjà codée, et redemander le
    // même codage une troisième fois n'apprendrait rien.
    const etapes = [];
    const codees = new Set();
    cartes.forEach(e => {
        if (veutCoder(codage, codees.size) && !codees.has(e.vers) && DIMS_CODAGE[e.vers]) {
            codees.add(e.vers);
            etapes.push({
                // `de` : la case d'où l'on vient. Elle ne sert pas au codage
                // lui-même mais à la MISE EN SCÈNE — on cadre sur les deux
                // cases, celle qu'on connaît et celle qui vient d'arriver, pour
                // que la nouvelle apparaisse quelque part et non nulle part.
                genre: 'codage', figure: e.vers, de: e.de, dims: DIMS_CODAGE[e.vers],
                rang: e.rang, vues: e.vues,
                // Les quatre figures codables sont masculines : « le
                // parallélogramme », « le rectangle », « le losange », « le carré ».
                titre: `Coder le ${familleDe(e.vers).nom.toLowerCase()}`
            });
        }
        etapes.push(e);
    });
    etapes.forEach((e, i) => { e.numero = i; });
    return { mode: MODES.PROPRIETES, palier, progressif: true, etapes };
}

/**
 * RECONSTRUIRE L'ORGANIGRAMME ENTIER — la deuxième question.
 *
 * Rémy : « pour le suivant, l'organigramme vide où il faut juste placer les
 * figures codées dans un premier temps (on se fiche que le rectangle soit à
 * gauche ou à droite dans l'organigramme). Et dans un second temps, on glisse
 * les vignettes (une vignette peut se glisser plusieurs fois) pour relier les
 * figures. »
 *
 * CE QUE ÇA TRAVAILLE, ET QUI N'EST PAS DANS LA PREMIÈRE QUESTION. L'étape par
 * étape guide : à chaque instant, deux cases et une question. Ici, rien n'est
 * guidé — on a cinq figures sans nom, treize flèches vides, et il faut
 * retrouver la CARTE. C'est la différence entre suivre un raisonnement et le
 * refaire ; c'est aussi ce qu'on demande en contrôle.
 *
 * ET LES FIGURES SONT CODÉES, SANS LEUR NOM. C'est là que le codage de la
 * première question sert : on reconnaît un losange à ses quatre marques
 * identiques et à son angle droit au centre, pas à l'étiquette. Un élève qui a
 * codé quatre figures sait les lire ; l'autre s'en aperçoit ici.
 *
 * « ON SE FICHE QUE LE RECTANGLE SOIT À GAUCHE OU À DROITE » — et ce n'est pas
 * une tolérance, c'est la vérité mathématique : les deux cases du milieu ont le
 * même RANG dans la hiérarchie, aucune n'est avant l'autre. Une case accepte
 * donc toute figure de son rang, et les conditions qui en partent se recalculent
 * sur la figure qu'on y a POSÉE — sans quoi l'élève qui a mis le losange à
 * gauche verrait ses bonnes réponses refusées.
 */
export function genererAssemblage({ rng } = {}) {
    return {
        mode: MODES.ASSEMBLAGE, palier: 'assembler', assemblage: true,
        // Les cinq figures à poser, dans le désordre.
        figures: rng.shuffle(FAMILLES.map(f => f.id)),
        // LES VIGNETTES NE S'ÉPUISENT PAS. Rémy : « une vignette peut se glisser
        // plusieurs fois ». C'est le fond de l'affaire : « un angle droit » sert
        // du parallélogramme au rectangle ET du losange au carré, « diagonales
        // perpendiculaires » deux fois aussi. Une palette qui se vide
        // enseignerait le contraire — que chaque condition n'a qu'une place.
        vignettes: rng.shuffle([...new Set(FLECHES.map(f => f.ajoute))])
    };
}

/** Les cases de figure qui acceptent cette famille : celles de même rang. */
export const casesDuRang = (familleId) =>
    FAMILLES.filter(f => f.rang === familleDe(familleId).rang).map(f => f.id);

/**
 * La figure posée dans une case, ou la famille de la case si rien n'est posé.
 * C'est par là que passent toutes les vérifications de la deuxième question :
 * l'organigramme qu'on relie est celui que l'élève a CONSTRUIT.
 */
export const figureDansCase = (placement, caseId) => (placement && placement[caseId]) || caseId;

/**
 * Les conditions attendues sur la flèche qui relie deux CASES, en tenant compte
 * de ce que l'élève y a posé.
 */
export function conditionsDeCases(placement, caseDe, caseVers) {
    return conditionsDe(figureDansCase(placement, caseDe), figureDansCase(placement, caseVers));
}

/**
 * UNE SÉRIE DE QUESTIONS, LA CARTE À PORTÉE — la troisième question.
 *
 * Rémy : « pour la 3ème question, ce sera une série de questions où on peut
 * rappeler l'organigramme pour voir. »
 *
 * ET LE DROIT DE REGARDER N'EST PAS UNE FAIBLESSE, c'est le geste qu'on veut
 * installer. Un organigramme sert à ÊTRE CONSULTÉ : l'élève qui ne sait plus
 * s'il faut des diagonales égales ou perpendiculaires doit apprendre à aller
 * voir sur la carte, pas à deviner. Les deux premières questions l'ont fait
 * construire ; celle-ci lui apprend à s'en servir.
 *
 * TROIS GENRES, ET TOUS SE DÉDUISENT DE L'ORGANIGRAMME — rien n'est écrit à la
 * main, donc rien ne peut mentir si une flèche change :
 *
 *   · LA FIGURE OBTENUE — « un parallélogramme qui a ses diagonales
 *     perpendiculaires est un … ? » C'est la question de Rémy, mot pour mot,
 *     et c'est celle du contrôle.
 *   · LA CONDITION À AJOUTER — « que faut-il ajouter à un rectangle pour qu'il
 *     soit un carré ? » La même flèche, lue à l'envers.
 *   · L'EMBOÎTEMENT — « est-ce que tout carré est un rectangle ? » La question
 *     qui départage ceux qui ont compris, et l'on tire autant de « oui » que de
 *     « non » : sans quoi on apprend à répondre toujours pareil.
 */
export function genererQuestions({ rng, combien = 8 } = {}) {
    const genres = ['figure', 'condition', 'toujours'];
    const faire = { figure: questionFigure, condition: questionCondition, toujours: questionToujours };
    const out = [];
    for (let i = 0; out.length < combien && i < combien * 8; i++) {
        const q = faire[genres[out.length % genres.length]](rng);
        if (q && !out.some(x => x.texte === q.texte)) out.push(q);
    }
    return { mode: MODES.QUESTIONS, palier: 'questions', questions: out };
}

/** « Un parallélogramme qui a ses diagonales perpendiculaires est un … ? » */
function questionFigure(rng) {
    const f = rng.pick(FLECHES);
    const dite = f.ajoute.replace(/^Qui a /, '');
    return {
        genre: 'figure',
        texte: `Un ${familleDe(f.de).nom.toLowerCase()} qui a ${dite} est un… ?`,
        choix: FAMILLES.map(x => ({ valeur: x.id, dit: x.nom })),
        bonnes: [f.vers],
        pourquoi: `${f.piege || ''} C'est la flèche qui mène du `
            + `${familleDe(f.de).nom.toLowerCase()} au ${familleDe(f.vers).nom.toLowerCase()}.`
    };
}

/** « Que faut-il ajouter à un rectangle pour qu'il soit un carré ? » */
function questionCondition(rng) {
    const e = rng.pick(ETAPES);
    const bonnes = conditionsDe(e.de, e.vers).map(f => f.ajoute);
    return {
        genre: 'condition',
        texte: `Que faut-il ajouter à un ${familleDe(e.de).nom.toLowerCase()} pour qu'il soit `
            + `un ${familleDe(e.vers).nom.toLowerCase()} ?`,
        choix: [...new Set(FLECHES.map(f => f.ajoute))]
            .map(t => ({ valeur: t, dit: vignetteDe(t) })),
        bonnes,
        pourquoi: bonnes.length > 1
            ? `Il y a ${bonnes.length} réponses justes : ${bonnes.map(t => `« ${vignetteDe(t)} »`)
                .join(', ')}. La même case s'atteint de plusieurs façons.`
            : `Une seule réponse : « ${vignetteDe(bonnes[0])} ».`
    };
}

/** « Est-ce que tout carré est un rectangle ? » */
function questionToujours(rng) {
    // ON TIRE LA RÉPONSE D'ABORD, puis un couple qui la donne : tirer le couple
    // au hasard rendrait « non » trois fois plus souvent que « oui », et l'élève
    // apprendrait à répondre non.
    const veutOui = rng.bool();
    const couples = [];
    FAMILLES.forEach(a => FAMILLES.forEach(b => {
        if (a.id !== b.id && estToujours(a.id, b.id) === veutOui) couples.push([a.id, b.id]);
    }));
    const [a, b] = rng.pick(couples);
    return {
        genre: 'toujours',
        texte: `Est-ce que tout ${familleDe(a).nom.toLowerCase()} est un `
            + `${familleDe(b).nom.toLowerCase()} ?`,
        choix: [{ valeur: 'oui', dit: 'Oui' }, { valeur: 'non', dit: 'Non' }],
        bonnes: [veutOui ? 'oui' : 'non'],
        pourquoi: veutOui
            ? `Oui : dans l'organigramme, on descend du ${familleDe(b).nom.toLowerCase()} au `
                + `${familleDe(a).nom.toLowerCase()} en ajoutant des conditions. Tout ce qui est `
                + 'en bas est aussi tout ce qui est au-dessus.'
            : `Non : le ${familleDe(a).nom.toLowerCase()} n'est pas sous le `
                + `${familleDe(b).nom.toLowerCase()} dans l'organigramme. Il faudrait remonter `
                + 'une flèche à l\'envers, et une flèche ne se lit que dans un sens.'
    };
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
    // « PAS FAUX, MAIS TROP FORT » N'EST PAS UNE ERREUR, ET NE DOIT PLUS EN
    // ÊTRE COMPTÉE UNE. Le refus le disait déjà avec les bons mots ; la
    // conséquence, elle, disait le contraire — carnet d'erreurs, et retour au
    // début de l'organigramme. Deux messages contradictoires pour un élève qui
    // vient d'énoncer une vérité, c'est la pire des corrections.
    if (estTropFort(etape.de, etape.vers, carte.texte)) {
        return { ok: false, tropFort: true, raison: refusEtape(etape, carte.texte) };
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
 * LE CONTRE-EXEMPLE — pourquoi cette condition ne suffit pas, EN FIGURE.
 *
 * Rémy : « pour l'organigramme, si l'élève se trompe, il faudrait lui montrer
 * un contre-exemple et lui dire qu'il va recommencer. »
 *
 * IL SE CALCULE, IL NE S'ÉCRIT PAS. On aurait pu ranger treize contre-exemples
 * dans un tableau ; ils auraient vieilli tout seuls, et ils auraient menti dès
 * qu'une flèche aurait changé. Or l'organigramme SAIT déjà tout ce qu'il faut :
 * une condition mène quelque part (`FLECHES`), et l'on sait dire si une famille
 * est toujours une autre (`estToujours`). Le contre-exemple est donc la figure
 * où la condition posée est vraie et où la famille visée est fausse.
 *
 * Exemple : l'élève pose « diagonales perpendiculaires » entre le
 * parallélogramme et le rectangle. Cette condition mène au LOSANGE ; un losange
 * n'est pas toujours un rectangle ; on lui montre donc un losange, et l'on dit :
 * « il a bien ses diagonales perpendiculaires, et ce n'est pourtant pas un
 * rectangle. »
 *
 * ET QUAND IL N'Y A PAS DE CONTRE-EXEMPLE, ON NE FAIT PAS SEMBLANT. Poser
 * « 3 ou 4 angles droits » entre le quadrilatère et le parallélogramme n'est pas
 * FAUX — un quadrilatère à trois angles droits est bel et bien un
 * parallélogramme. C'est TROP FORT : cette condition mène directement au
 * rectangle, et il n'existe aucun contre-exemple à montrer. On le dit
 * autrement, parce que ce n'est pas la même erreur.
 *
 * @returns {{genre:'contre'|'trop-fort', figure?:string, dit:string}}
 */
export function contreExemple(de, vers, texte) {
    // « Qui a ses diagonales perpendiculaires » se lit sur une carte ; dans une
    // phrase, « il a bien qui a ses diagonales… » ne se lit pas. On rend la
    // condition à sa forme parlée.
    const dite = texte.replace(/^Qui a /, '');
    const A = familleDe(de).nom.toLowerCase();
    const B = familleDe(vers).nom.toLowerCase();
    const chemins = FLECHES.filter(f => f.ajoute === texte);

    // ① UN VRAI CONTRE-EXEMPLE, et l'on n'en montre pas d'autre. Il lui faut
    // DEUX qualités, et la première a failli être oubliée : le témoin doit être
    // un A — sinon il ne dit rien de la flèche qu'on discute — et ne pas être
    // toujours un B. Une famille d'arrivée de la condition possède bien la
    // condition : c'est ce que « mène à » veut dire.
    const temoin = chemins.find(f => estToujours(f.vers, de) && !estToujours(f.vers, vers));
    if (temoin) {
        const T = familleDe(temoin.vers).nom.toLowerCase();
        return {
            genre: 'contre',
            figure: temoin.vers,
            dit: `Regarde ce ${T} : c'est bien un ${A}, il a bien ${dite}, et ce n'est `
                + `pourtant pas un ${B}. La condition ne suffit donc pas pour passer du `
                + `${A} au ${B}.`
        };
    }

    // ② TROP FORT, ET C'EST VRAI, PAS UNE FORMULE DE POLITESSE. Poser « 3 ou 4
    // angles droits » entre le quadrilatère et le parallélogramme n'est pas
    // faux : un quadrilatère à trois angles droits EST un parallélogramme.
    // C'est seulement plus que ce qu'il fallait. On ne le dit que quand les
    // deux choses sont démontrées : la condition part bien d'ici, et tout ce à
    // quoi elle mène est un B.
    const partDIci = chemins.some(f => estToujours(de, f.de));
    if (partDIci && chemins.every(f => estToujours(f.vers, vers))) {
        return {
            genre: 'trop-fort',
            dit: `Ce n'est pas faux : un ${A} qui a ${dite} EST un ${B}. Mais c'est TROP `
                + `FORT pour cette flèche — cette condition mène directement `
                + `${chemins.map(f => `au ${familleDe(f.vers).nom.toLowerCase()}`)
                    .filter((x, i, t) => t.indexOf(x) === i).join(' et ')}.`
        };
    }

    // ③ ELLE NE SE LIT PAS AU DÉPART D'ICI. « Deux côtés consécutifs
    // perpendiculaires » posé entre le quadrilatère et le parallélogramme : ce
    // n'est ni suffisant ni trop fort, c'est une condition qui se lit AU DÉPART
    // d'un parallélogramme. Le dire ainsi est la seule chose exacte — et
    // inventer un contre-exemple pour faire joli serait enseigner un faux.
    const dits = chemins
        .map(f => `du ${familleDe(f.de).nom.toLowerCase()} au ${familleDe(f.vers).nom.toLowerCase()}`)
        .filter((x, i, t) => t.indexOf(x) === i);
    return {
        genre: 'ailleurs',
        dit: `Cette condition ne se lit pas au départ d'un ${A} : c'est elle qui fait passer `
            + `${dits.length > 1 ? `${dits.slice(0, -1).join(', ')} et ${dits[dits.length - 1]}`
                : dits[0]}. Chaque condition dit ce qu'on ajoute À PARTIR d'une famille précise.`
    };
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
