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
        ajoute: 'les côtés opposés sont parallèles deux à deux', court: 'côtés opposés parallèles', propriete: 'opposesParalleles',
        piege: 'Le parallélogramme n\'ajoute pas des côtés égaux : il ajoute le '
            + 'PARALLÉLISME des deux paires de côtés opposés. Les longueurs suivent toutes '
            + 'seules.'
    },
    {
        de: 'quadrilatere', vers: 'parallelogramme', voie: 0,
        ajoute: 'les côtés opposés sont égaux deux à deux', court: 'côtés opposés égaux', propriete: 'cotesOpposesEgaux',
        piege: 'Deux paires de côtés opposés de même longueur suffisent : le parallélisme '
            + 'suit. Attention, il faut bien les côtés OPPOSÉS — deux côtés consécutifs '
            + 'égaux ne donnent rien du tout dans un quadrilatère quelconque.'
    },
    {
        de: 'quadrilatere', vers: 'parallelogramme', voie: 1,
        ajoute: 'les diagonales se coupent en leur milieu', court: 'diagonales : même milieu', propriete: 'diagonalesMilieu',
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
        ajoute: 'trois ou quatre angles droits', court: '3 ou 4 angles droits',
        piege: 'Trois suffisent : la somme des angles d\'un quadrilatère vaut 360°, donc le '
            + 'quatrième est droit lui aussi. C\'est la définition du rectangle qu\'on donne '
            + 'en sixième, sans passer par le parallélogramme.'
    },
    {
        // Et son symétrique s'incurve vers le bas, par-dessous.
        de: 'quadrilatere', vers: 'losange', voie: 1,
        ajoute: 'quatre côtés égaux', court: '4 côtés égaux', propriete: 'quatreCotesEgaux',
        piege: 'QUATRE côtés égaux, pas deux : c\'est la définition du losange, et elle part '
            + 'directement du quadrilatère quelconque. Dans un parallélogramme, deux côtés '
            + 'consécutifs auraient suffi.'
    },

    // --- Du parallélogramme au rectangle : deux chemins -----------------------
    {
        de: 'parallelogramme', vers: 'rectangle', voie: -1,
        ajoute: 'un angle droit', court: 'un angle droit', propriete: 'unAngleDroit',
        piege: 'Un seul angle droit suffit dans un parallélogramme : les trois autres le '
            + 'deviennent forcément.'
    },
    {
        de: 'parallelogramme', vers: 'rectangle', voie: 1,
        ajoute: 'les diagonales ont la même longueur', court: 'diagonales égales', propriete: 'diagonalesEgales',
        piege: 'Des diagonales de MÊME LONGUEUR font le rectangle ; des diagonales '
            + 'PERPENDICULAIRES font le losange. C\'est la paire qu\'on échange le plus '
            + 'souvent.'
    },

    // --- Du parallélogramme au losange : deux chemins -------------------------
    {
        de: 'parallelogramme', vers: 'losange', voie: -1,
        ajoute: 'deux côtés consécutifs égaux', court: '2 côtés consécutifs égaux',
        piege: 'Dans un parallélogramme, deux côtés CONSÉCUTIFS de même longueur suffisent : '
            + 'les côtés opposés étaient déjà égaux.'
    },
    {
        de: 'parallelogramme', vers: 'losange', voie: 1,
        ajoute: 'les diagonales sont perpendiculaires', court: 'diagonales perpendiculaires', propriete: 'diagonalesPerpendiculaires',
        piege: 'Des diagonales PERPENDICULAIRES font le losange ; des diagonales de même '
            + 'LONGUEUR font le rectangle. C\'est la paire qu\'on échange le plus souvent.'
    },

    // --- Et le carré, par les deux côtés --------------------------------------
    {
        de: 'rectangle', vers: 'carre', voie: -1,
        ajoute: 'deux côtés consécutifs égaux', court: '2 côtés consécutifs égaux',
        piege: 'Au rectangle il manque les longueurs ; au losange il manque l\'angle droit. '
            + 'Ce n\'est pas la même carte qui les complète.'
    },
    {
        de: 'rectangle', vers: 'carre', voie: 1,
        ajoute: 'les diagonales sont perpendiculaires', court: 'diagonales perpendiculaires', propriete: 'diagonalesPerpendiculaires',
        piege: 'Au rectangle, les diagonales sont déjà de même longueur : ce qui lui manque, '
            + 'c\'est qu\'elles soient PERPENDICULAIRES.'
    },
    {
        de: 'losange', vers: 'carre', voie: -1,
        ajoute: 'un angle droit', court: 'un angle droit', propriete: 'unAngleDroit',
        piege: 'Au losange il manque l\'angle droit ; au rectangle il manque les longueurs. '
            + 'Ce n\'est pas la même carte qui les complète.'
    },
    {
        de: 'losange', vers: 'carre', voie: 1,
        ajoute: 'les diagonales ont la même longueur', court: 'diagonales égales', propriete: 'diagonalesEgales',
        piege: 'Au losange, les diagonales sont déjà perpendiculaires : ce qui lui manque, '
            + 'c\'est qu\'elles aient la MÊME LONGUEUR.'
    }
];

export const familleDe = (id) => FAMILLES.find(f => f.id === id) || null;

/**
 * LES POSITIONS DE L'ORGANIGRAMME, dans un repère de 100 × 100.
 *
 * Le losange et le rectangle sont côte à côte, et le carré SOUS LES DEUX : la
 * figure doit montrer qu'on y arrive des deux côtés. Une hiérarchie dessinée en
 * simple colonne perdrait exactement ce qu'elle a d'intéressant.
 */
// L'ORGANIGRAMME SE LIT DE GAUCHE À DROITE. Rémy, devant la version en
// colonne : « illisible. Il faut faire mieux, on peut imaginer le lire à
// l'horizontal ». Il avait raison, et pas seulement pour le confort : une
// condition s'écrit en quarante caractères, et quarante caractères ne tiennent
// pas dans la largeur d'une case. Empilés entre deux cases superposées, les
// libellés se marchaient dessus ; posés le long d'une flèche HORIZONTALE, ils
// ont toute la largeur de la page.
//
// Et la place se répartit autrement : le quadrilatère à gauche, le carré à
// droite, le rectangle et le losange l'un au-dessus de l'autre au milieu. Les
// deux chemins qui mènent au carré restent visibles d'un coup d'œil — c'est la
// leçon de la figure —, et les deux raccourcis de sixième (du quadrilatère
// directement au rectangle, ou au losange) passent enfin en ligne droite, très
// au-dessus et très au-dessous de la case du parallélogramme. En colonne il
// fallait les faire contourner par le bord.
export const POSITIONS = {
    quadrilatere: { x: 0, y: 50 },
    parallelogramme: { x: 32, y: 50 },
    rectangle: { x: 65, y: 2 },
    losange: { x: 65, y: 98 },
    carre: { x: 100, y: 50 }
};

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
 * LA CLEF D'UNE FLÈCHE PORTE SA VOIE, et il le faut : depuis que trois
 * conditions relient le quadrilatère au parallélogramme, « quadrilatere >
 * parallelogramme » désigne trois flèches différentes. Sans la voie, poser une
 * carte sur l'une les remplissait toutes les trois.
 */
export const cleFleche = (f) => `${f.de}>${f.vers}#${f.voie === undefined ? 0 : f.voie}`;
export const flecheDe = (cle) => FLECHES.find(f => cleFleche(f) === cle) || null;

/**
 * OÙ PASSE LE TRAIT D'UNE CONDITION, dans le repère de 100 × 100 des positions.
 *
 * La géométrie vit ICI, et non dans le jeu ni dans la fiche, pour une raison
 * simple : l'écran et le papier doivent dessiner LE MÊME organigramme. Un élève
 * qui a la feuille sous les yeux et l'exercice à l'écran ne doit pas voir deux
 * figures différentes.
 *
 * UN TRAIT PAR CONDITION, ET NON UN PAR CHEMIN. La version en colonne faisait
 * l'inverse : une seule flèche du quadrilatère au parallélogramme, et les trois
 * conditions échelonnées dessus. Il le fallait, faute de place. Couché, le plan
 * en a : les trois façons d'être un parallélogramme deviennent TROIS FLÈCHES,
 * et l'élève compte du regard combien de portes mènent d'une case à l'autre.
 * C'est exactement ce que l'exercice lui demande de trouver.
 *
 * Les voies s'écartent perpendiculairement au segment, de part et d'autre : la
 * voie 0 va tout droit, les voies -1 et +1 s'incurvent de chaque côté.
 *
 * @returns {{points: Array<{x,y}>, contourne: boolean}}
 */
// UNE CASE OCCUPE 16 % DE LA LARGEUR DU PLAN ET 22 % DE SA HAUTEUR, à l'écran
// comme sur le papier. Sa position la CENTRE, donc le plan s'étend en réalité
// d'une demi-case au-delà de 0 et de 100 : c'est ce qui permet au quadrilatère
// d'être à x = 0 et au carré à x = 100 sans rien couper.
//
// SEIZE ET NON DIX-NEUF. Mesuré à dix-neuf : entre le quadrilatère et le
// parallélogramme il ne restait que huit unités, soit trente-six pixels, pour
// loger trois flèches parallèles — et le mot « Parallélogramme », plus large
// que sa case, débordait sur celle d'à côté. À seize, l'intervalle passe à
// treize unités et les noms tiennent.
export const CASE_L = 16;   // largeur d'une case, en % de la largeur du plan
export const CASE_H = 22;   // hauteur d'une case, en % de la hauteur du plan

/** La demi-case, ramenée aux unités du plan — celles des POSITIONS. */
export const DEMI_X = (CASE_L / 2) / (100 - CASE_L) * 100;
export const DEMI_Y = (CASE_H / 2) / (100 - CASE_H) * 100;

const ECART = 10; // l'écartement de deux voies voisines

/**
 * OÙ LA DROITE (p → q) SORT DE LA CASE CENTRÉE EN c.
 *
 * La case est un RECTANGLE, et le calcul le prend pour tel. Une ellipse
 * inscrite aurait été plus courte à écrire, mais elle rentre dans les coins :
 * mesuré, les voies obliques et les voies décalées repartaient de l'INTÉRIEUR
 * de la case, et l'on voyait le trait sourdre sous le dessin du quadrilatère.
 */
function sortie(c, p, q) {
    const dx = q.x - p.x, dy = q.y - p.y;
    // Un point de départ déjà hors de la case : le trait part de là.
    if (Math.abs(p.x - c.x) > DEMI_X || Math.abs(p.y - c.y) > DEMI_Y) return { x: p.x, y: p.y };
    const borne = (demi, ecart, d) =>
        (d === 0 ? Infinity : Math.max((-demi - ecart) / d, (demi - ecart) / d));
    const t = Math.min(borne(DEMI_X, p.x - c.x, dx), borne(DEMI_Y, p.y - c.y, dy));
    if (!(t > 0) || t > 1) return { x: p.x, y: p.y };
    return { x: p.x + dx * t, y: p.y + dy * t };
}

/**
 * OÙ PASSE LE TRAIT D'UNE CONDITION, dans le repère de 100 × 100 des positions.
 *
 * La géométrie vit ICI, et non dans le jeu ni dans la fiche, pour une raison
 * simple : l'écran et le papier doivent dessiner LE MÊME organigramme. Un élève
 * qui a la feuille sous les yeux et l'exercice à l'écran ne doit pas voir deux
 * figures différentes.
 *
 * UN TRAIT PAR CONDITION, ET NON UN PAR CHEMIN. La version en colonne faisait
 * l'inverse : une seule flèche du quadrilatère au parallélogramme, et les trois
 * conditions échelonnées dessus. Il le fallait, faute de place. Couché, le plan
 * en a : les trois façons d'être un parallélogramme deviennent TROIS FLÈCHES,
 * et l'élève compte du regard combien de portes mènent d'une case à l'autre.
 * C'est exactement ce que l'exercice lui demande de trouver.
 *
 * LES VOIES SONT PARALLÈLES, ELLES NE SE BOMBENT PAS. Le premier jet les
 * faisait passer par un point de passage écarté du milieu : entre deux cases
 * voisines l'intervalle mesure treize unités et l'écartement dix, si bien que
 * les trois voies du parallélogramme dessinaient un losange au lieu de trois
 * flèches. Décalées sur toute leur longueur, elles se lisent pour ce qu'elles
 * sont — trois chemins parallèles d'une case à l'autre.
 *
 * @returns {{points: Array<{x,y}>, contourne: boolean}}
 */
export function traceFleche(f) {
    const a = POSITIONS[f.de], b = POSITIONS[f.vers];
    const voie = f.voie === undefined ? 0 : f.voie;
    const dx = b.x - a.x, dy = b.y - a.y;
    const n = Math.hypot(dx, dy) || 1;
    const ox = (-dy / n) * ECART * voie, oy = (dx / n) * ECART * voie;
    const p = { x: a.x + ox, y: a.y + oy }, q = { x: b.x + ox, y: b.y + oy };
    return { points: [sortie(a, p, q), sortie(b, q, p)], contourne: false };
}

/** Les conditions d'un même chemin, dans l'ordre où elles se lisent. */
export function conditionsDe(de, vers) {
    return FLECHES.filter(f => f.de === de && f.vers === vers);
}

/**
 * OÙ SE POSE L'ÉTIQUETTE D'UNE CONDITION : au point de passage de sa voie.
 *
 * Chaque condition a désormais son propre trait, donc son propre endroit — il
 * n'y a plus à échelonner plusieurs libellés le long d'une même flèche, ni à
 * les écarter du trait pour qu'ils ne tombent pas sur une case. C'est le gain
 * de la disposition couchée, et c'est pour cela qu'elle a été faite.
 */
export function posEtiquette(f) {
    const [d, a] = traceFleche(f).points;
    return { x: (d.x + a.x) / 2, y: (d.y + a.y) / 2, bord: false };
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
