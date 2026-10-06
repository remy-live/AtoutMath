// CENT DINGBATS — soixante de mathématiques, quarante de culture générale.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « j'aimerais bien un jeu de dingbats, idéalement dans le thème
// mathématique mais dans les réglages on peut avoir le choix. Une centaine
// serait bien. Classe aussi par niveau. »
//
// ── POURQUOI LES MATHÉMATIQUES S'Y PRÊTENT SI BIEN ─────────────────────────
//
// PARCE QUE LE VOCABULAIRE DE LA GÉOMÉTRIE EST DÉJÀ SPATIAL. « Périmètre » veut
// dire « la mesure AUTOUR », « diamètre » « la mesure À TRAVERS », « médiatrice »
// « celle qui coupe AU MILIEU ». Ces mots ne sont pas des étiquettes à retenir :
// ce sont des POSITIONS, et c'est exactement ce qu'un dingbat sait écrire.
//
// Un élève qui a vu MÈTRE faire le tour d'un carré ne confondra plus périmètre
// et aire. C'est la raison d'être de ce fichier, et c'est pourquoi le thème
// mathématique est celui par défaut.
//
// ── LES QUATRE NIVEAUX, ET CE QUI LES SÉPARE ───────────────────────────────
//
//   1. LE GESTE SE VOIT, LE MOT EST CONNU. Deux droites alignées, « parallèles ».
//   2. LE GESTE SE VOIT, LE MOT EST À CHERCHER. Le tour d'un carré, « périmètre ».
//   3. IL FAUT LIRE À VOIX HAUTE pour entendre. « POUR » sur « CENT ».
//   4. IL FAUT DEUX LECTURES. La disposition dit une chose, le mot en dit une
//      autre, et c'est leur rencontre qui donne la réponse.
//
// ── CE QUI EST ÉCRIT ICI, ET CE QUI NE L'EST PAS ───────────────────────────
//
// AUCUN HTML DANS CE FICHIER. Une énigme déclare sa DISPOSITION — `sur`, `dans`,
// `autour`, `miroir`… — et `core/dingbat.js` la dessine. Cent morceaux de HTML
// écrits à la main auraient été impossibles à relire et à éprouver, et le jour
// où une couleur change il aurait fallu les reprendre un par un.
//
// LES VARIANTES SONT CELLES QU'UN ÉLÈVE ÉCRIT VRAIMENT. Le juge enlève déjà les
// accents, les articles et les pluriels (voir `normaliser`) : on ne liste donc
// ici que les vraies autres façons de dire — « un demi » et « une demie », pas
// « LA RACINE CARREE ».

export const DINGBATS = [

    // ═══ MATHÉMATIQUES — NIVEAU 1 ═══════════════════════════════════════════
    //
    // Le geste saute aux yeux et le mot est au programme depuis l'école.

    {
        id: 'dg-paralleles', theme: 'maths', niveau: 1,
        forme: 'paralleles', mots: ['DROITE'],
        reponse: 'droites parallèles', variantes: ['parallèles', 'deux droites parallèles'],
        aide: 'Deux fois le même mot. Regarde comment ils sont posés l\'un par rapport à l\'autre.',
        explication: 'Deux droites écrites l\'une sous l\'autre, exactement alignées : '
            + 'elles gardent partout le même écart. Ce sont des droites PARALLÈLES.'
    },
    {
        id: 'dg-perpendiculaires', theme: 'maths', niveau: 1,
        forme: 'croisent', mots: ['DROITE', 'DROITE'],
        reponse: 'droites perpendiculaires', variantes: ['perpendiculaires'],
        aide: 'Deux droites, et l\'angle qu\'elles font en se croisant.',
        explication: 'Elles se croisent en formant un angle droit : elles sont '
            + 'PERPENDICULAIRES. Deux droites qui se croisent sans angle droit sont '
            + 'seulement SÉCANTES.'
    },
    {
        id: 'dg-racine-carree', theme: 'maths', niveau: 1,
        forme: 'dans', mots: ['RACINE'], cadre: 'carre',
        reponse: 'racine carrée',
        aide: 'Lis le mot, puis dis à voix haute DANS QUOI il est écrit.',
        explication: 'Une racine dans un carré : la RACINE CARRÉE. Et ce n\'est pas '
            + 'qu\'un jeu de mots — √9 = 3 parce que c\'est le côté du carré d\'aire 9.'
    },
    {
        id: 'dg-trois-quarts', theme: 'maths', niveau: 1,
        forme: 'repete', mots: ['QUART'], combien: 3,
        reponse: 'trois quarts', variantes: ['3 quarts', '3/4'],
        aide: 'Compte.',
        explication: 'Trois fois un quart : TROIS QUARTS, c\'est-à-dire 3/4.'
    },
    {
        id: 'dg-deux-tiers', theme: 'maths', niveau: 1,
        forme: 'repete', mots: ['TIERS'], combien: 2,
        reponse: 'deux tiers', variantes: ['2 tiers', '2/3'],
        aide: 'Compte.',
        explication: 'Deux fois un tiers : DEUX TIERS, c\'est-à-dire 2/3.'
    },
    {
        id: 'dg-symetrie-axiale', theme: 'maths', niveau: 1,
        forme: 'miroir', mots: ['FIGURE'],
        reponse: 'symétrie axiale', variantes: ['symétrie par rapport à une droite', 'symétrie orthogonale'],
        aide: 'Le trait entre les deux mots est un axe.',
        explication: 'La figure s\'est retournée de l\'autre côté d\'un axe, comme dans '
            + 'un miroir : c\'est une SYMÉTRIE AXIALE.'
    },
    {
        id: 'dg-symetrie-centrale', theme: 'maths', niveau: 1,
        forme: 'demiTour', mots: ['FIGURE'],
        reponse: 'symétrie centrale', variantes: ['symétrie par rapport à un point', 'demi-tour'],
        aide: 'Le petit point au milieu est un centre.',
        explication: 'La figure a fait un demi-tour autour d\'un point : c\'est une '
            + 'SYMÉTRIE CENTRALE. Elle n\'est pas retournée comme dans un miroir — elle '
            + 'a tourné.'
    },
    {
        id: 'dg-translation', theme: 'maths', niveau: 1,
        forme: 'glisse', mots: ['FIGURE'],
        reponse: 'translation', variantes: ['glissement'],
        aide: 'La figure n\'a ni tourné ni changé de taille.',
        explication: 'Elle a seulement GLISSÉ : même sens, même taille, même direction. '
            + 'C\'est une TRANSLATION.'
    },
    {
        id: 'dg-rotation', theme: 'maths', niveau: 1,
        forme: 'tourne', mots: ['FIGURE'],
        reponse: 'rotation',
        aide: 'Elle n\'a pas glissé : elle a fait autre chose.',
        explication: 'La figure a TOURNÉ d\'un quart de tour : c\'est une ROTATION.'
    },
    {
        id: 'dg-reduction', theme: 'maths', niveau: 1,
        forme: 'tailles', mots: ['FIGURE'], sens: 'reduction',
        reponse: 'réduction', variantes: ['rétrécissement'],
        aide: 'Regarde le sens de la flèche, et les deux tailles.',
        explication: 'La figure devient plus petite en gardant ses proportions : c\'est '
            + 'une RÉDUCTION.'
    },
    {
        id: 'dg-agrandissement', theme: 'maths', niveau: 1,
        forme: 'tailles', mots: ['FIGURE'], sens: 'agrandissement',
        reponse: 'agrandissement',
        aide: 'Le contraire de l\'énigme précédente.',
        explication: 'La figure devient plus grande en gardant ses proportions : c\'est '
            + 'un AGRANDISSEMENT.'
    },
    {
        id: 'dg-un-demi', theme: 'maths', niveau: 1,
        forme: 'sur', mots: ['1', '2'],
        reponse: 'un demi', variantes: ['une demie', 'un sur deux', '1/2', 'la moitié'],
        aide: 'C\'est une fraction : lis-la à voix haute.',
        explication: 'Un sur deux s\'écrit 1/2 et se dit UN DEMI.'
    },
    {
        id: 'dg-au-carre', theme: 'maths', niveau: 1,
        forme: 'exposant', mots: ['X', '2'],
        reponse: 'x au carré', variantes: ['au carré', 'x carré', 'le carré de x'],
        aide: 'Le petit 2 est écrit en haut : comment se lit-il ?',
        explication: 'Un 2 en exposant se lit « AU CARRÉ » : x² = x × x.'
    },
    {
        id: 'dg-angle-droit', theme: 'maths', niveau: 1,
        forme: 'dans', mots: ['ANGLE'], cadre: 'coin',
        reponse: 'angle droit',
        aide: 'La forme qui entoure le mot est un coin. Lequel ?',
        explication: 'Le mot est posé dans un coin d\'équerre : c\'est un ANGLE DROIT, '
            + 'celui qui mesure 90°.'
    },
    {
        id: 'dg-centre', theme: 'maths', niveau: 1,
        forme: 'dans', mots: ['POINT'], cadre: 'cercle',
        reponse: 'centre', variantes: ['le centre du cercle'],
        aide: 'Où est ce point par rapport au cercle ?',
        explication: 'Le point est au milieu du cercle : c\'est son CENTRE. Tous les '
            + 'points du cercle en sont à la même distance — le rayon.'
    },

    // ═══ MATHÉMATIQUES — NIVEAU 2 ═══════════════════════════════════════════
    //
    // Le geste se voit encore, mais le mot est précisément celui qu'on travaille.

    {
        id: 'dg-perimetre', theme: 'maths', niveau: 2,
        forme: 'autour', mots: ['MÈTRE'], cadre: 'carre',
        reponse: 'périmètre', variantes: ['le périmètre'],
        aide: 'Le mot fait le tour. En grec, « péri » veut dire « autour ».',
        explication: 'La mesure AUTOUR d\'une figure, c\'est son PÉRIMÈTRE. Celle de '
            + 'l\'intérieur, c\'est l\'aire — et c\'est pour cela qu\'on ne doit pas les '
            + 'confondre : l\'une se parcourt, l\'autre se remplit.'
    },
    {
        id: 'dg-diametre', theme: 'maths', niveau: 2,
        forme: 'traverse', mots: ['MÈTRE'], cadre: 'cercle',
        reponse: 'diamètre', variantes: ['le diamètre'],
        aide: 'Le mot traverse le cercle de part en part, en passant par le centre.',
        explication: 'La mesure À TRAVERS le cercle en passant par son centre : le '
            + 'DIAMÈTRE. Il vaut deux fois le rayon.'
    },
    {
        id: 'dg-diagonale', theme: 'maths', niveau: 2,
        forme: 'traverse', mots: ['TRAIT'], cadre: 'carre', biais: true,
        reponse: 'diagonale', variantes: ['la diagonale'],
        aide: 'Le trait traverse le carré — mais pas à plat.',
        explication: 'Un trait qui joint deux sommets opposés : la DIAGONALE. Elle ne '
            + 'passe pas par les côtés, elle coupe la figure en deux.'
    },
    {
        id: 'dg-milieu', theme: 'maths', niveau: 2,
        forme: 'entre', mots: ['POINT', 'A', 'B'],
        reponse: 'milieu', variantes: ['le milieu du segment', 'le milieu'],
        aide: 'Ce point est à égale distance de A et de B.',
        explication: 'Le point qui partage [AB] en deux parts égales est son MILIEU.'
    },
    {
        id: 'dg-pourcentage', theme: 'maths', niveau: 2,
        forme: 'sur', mots: ['POUR', 'CENT'],
        // PAS DE « % » DANS LES VARIANTES, et l'épreuve me l'a appris : le juge
        // ramène tout aux LETTRES (voir `normaliser`), donc « % » devient une
        // chaîne vide et serait refusé. Une variante qu'on liste et que le juge
        // rejette est pire qu'une variante absente : elle promet une tolérance
        // qui n'existe pas.
        reponse: 'pourcentage', variantes: ['pour cent', 'pourcent'],
        aide: 'Lis de haut en bas, à voix haute.',
        explication: 'POUR écrit sur CENT se lit « pour cent » : un POURCENTAGE. 25 %, '
            + 'c\'est 25 pour cent, c\'est-à-dire 25 sur 100.'
    },
    {
        id: 'dg-nombre-premier', theme: 'maths', niveau: 2,
        forme: 'rang', mots: ['NOMBRE', 'nombre', 'nombre', 'nombre'], ou: 0,
        reponse: 'nombre premier', variantes: ['premier'],
        aide: 'À quelle place est le mot mis en avant ?',
        explication: 'Il est le PREMIER de la file : un NOMBRE PREMIER. Ce sont ceux qui '
            + 'n\'ont que deux diviseurs, 1 et eux-mêmes — 2, 3, 5, 7, 11…'
    },
    {
        id: 'dg-bissectrice', theme: 'maths', niveau: 2,
        forme: 'coupe', mots: ['AN', 'GLE'],
        reponse: 'bissectrice', variantes: ['la bissectrice'],
        aide: 'Le mot ANGLE est coupé — et coupé en deux parts égales.',
        explication: 'La droite qui coupe un angle en deux angles égaux est sa '
            + 'BISSECTRICE. « Bi » comme deux, « sectrice » comme couper.'
    },
    {
        id: 'dg-mediatrice', theme: 'maths', niveau: 2,
        forme: 'croisent', mots: ['SEGMENT', 'MILIEU'],
        reponse: 'médiatrice', variantes: ['la médiatrice'],
        aide: 'Une droite qui passe par le MILIEU d\'un segment, et qui lui est perpendiculaire.',
        explication: 'Perpendiculaire au segment ET passant par son milieu : c\'est la '
            + 'MÉDIATRICE. Ses points sont à égale distance des deux extrémités.'
    },
    {
        id: 'dg-fraction', theme: 'maths', niveau: 2,
        forme: 'sur', mots: ['NOMBRE', 'NOMBRE'],
        reponse: 'fraction', variantes: ['une fraction'],
        aide: 'Un nombre écrit sur un autre.',
        explication: 'Un nombre sur un autre, séparés par une barre : une FRACTION. '
            + 'Celui du haut est le numérateur, celui du bas le dénominateur.'
    },
    {
        id: 'dg-exposant', theme: 'maths', niveau: 2,
        forme: 'exposant', mots: ['10', 'n'],
        // CETTE ÉNIGME DEMANDE LE NOM DU PETIT NOMBRE, pas celui de l'écriture
        // entière : « exposant ». L'épreuve a trouvé qu'elle acceptait aussi
        // « puissance », que l'énigme `dg-puissance-repetee` demande — deux
        // énigmes dont l'une accepte la réponse de l'autre, et l'élève a raison
        // sans le savoir.
        reponse: 'exposant', variantes: ['un exposant', 'l\u2019exposant'],
        aide: 'Le petit nombre écrit EN HAUT porte un nom à lui.',
        explication: 'Le petit nombre écrit en haut est l\'EXPOSANT, et 10ⁿ est une '
            + 'PUISSANCE de dix : il dit combien de fois on multiplie 10 par lui-même.'
    },
    {
        id: 'dg-indice', theme: 'maths', niveau: 2,
        forme: 'indice', mots: ['u', 'n'],
        reponse: 'indice', variantes: ['un indice', 'terme de rang n'],
        aide: 'Le petit n n\'est pas en haut cette fois.',
        explication: 'Écrit EN BAS, il s\'appelle un INDICE : uₙ désigne le terme de '
            + 'rang n d\'une suite. En haut on multiplie, en bas on numérote.'
    },
    {
        id: 'dg-ecart', theme: 'maths', niveau: 2,
        forme: 'ecarte', mots: ['NOMBRES'],
        reponse: 'écart', variantes: ['un écart', 'étendue'],
        aide: 'Les lettres ne se touchent plus.',
        explication: 'La distance entre deux valeurs est leur ÉCART. Entre le plus grand '
            + 'et le plus petit d\'une série, c\'est l\'ÉTENDUE.'
    },
    {
        id: 'dg-encadrement', theme: 'maths', niveau: 2,
        forme: 'entre', mots: ['NOMBRE', '3', '4'],
        reponse: 'encadrement', variantes: ['encadrer', 'un encadrement'],
        aide: 'Le nombre est pris entre deux autres.',
        explication: 'Dire que 3 < n < 4, c\'est faire un ENCADREMENT : on enferme le '
            + 'nombre entre deux bornes sans donner sa valeur exacte.'
    },
    {
        id: 'dg-desordre-stat', theme: 'maths', niveau: 2,
        forme: 'desordre', mots: ['SERIE'], melange: 'IESRE',
        reponse: 'série désordonnée', variantes: ['désordre', 'série en désordre', 'ranger la série'],
        aide: 'Les lettres sont bien là. C\'est leur ORDRE qui ne va pas.',
        explication: 'Avant de lire une série statistique, il faut la RANGER : la '
            + 'médiane et l\'étendue ne se lisent que sur une série ordonnée.'
    },
    {
        id: 'dg-moyenne', theme: 'maths', niveau: 2,
        forme: 'entre', mots: ['MOYENNE', 'PETIT', 'GRAND'],
        reponse: 'moyenne', variantes: ['la moyenne'],
        aide: 'Elle se place toujours entre le plus petit et le plus grand.',
        explication: 'La MOYENNE tombe forcément entre la plus petite et la plus grande '
            + 'des valeurs. Si elle en sort, c\'est qu\'on s\'est trompé — c\'est le '
            + 'meilleur contrôle qui soit.'
    },
    {
        id: 'dg-arrondi', theme: 'maths', niveau: 2,
        forme: 'tailles', mots: ['3,7'], sens: 'reduction',
        reponse: 'arrondi', variantes: ['arrondir', 'un arrondi'],
        aide: 'Le nombre se simplifie, il perd de la précision.',
        explication: 'On garde moins de chiffres : c\'est un ARRONDI. 3,7 arrondi à '
            + 'l\'unité donne 4 — on va vers le plus proche.'
    },
    {
        id: 'dg-serre-decimal', theme: 'maths', niveau: 2,
        forme: 'serre', mots: ['3,14159'],
        reponse: 'troncature', variantes: ['tronquer', 'valeur approchée'],
        aide: 'Les chiffres sont tassés : il va falloir en couper.',
        explication: 'Couper les chiffres après un certain rang sans regarder le suivant, '
            + 'c\'est TRONQUER. 3,14159 tronqué au centième donne 3,14 — alors que '
            + 'l\'arrondi, lui, regarde le chiffre d\'après.'
    },

    // ═══ MATHÉMATIQUES — NIVEAU 3 ═══════════════════════════════════════════
    //
    // Il faut lire à voix haute, ou regarder deux fois.

    {
        id: 'dg-sous-ensemble', theme: 'maths', niveau: 3,
        forme: 'sur', mots: ['ENSEMBLE', 'ENSEMBLE'],
        reponse: 'sous-ensemble', variantes: ['sous ensemble', 'partie'],
        aide: 'Il y en a un au-dessus, et un en dessous. C\'est celui du bas qu\'on nomme.',
        explication: 'Un ensemble entièrement contenu dans un autre est un SOUS-ENSEMBLE.'
    },
    {
        id: 'dg-cercle-circonscrit', theme: 'maths', niveau: 3,
        forme: 'autour', mots: ['CERCLE'], cadre: 'triangle',
        reponse: 'cercle circonscrit', variantes: ['circonscrit'],
        aide: 'Le cercle fait le tour du triangle, et passe par ses trois sommets.',
        explication: 'Le cercle qui passe par les trois sommets d\'un triangle est son '
            + 'CERCLE CIRCONSCRIT. Son centre est le point de rencontre des trois '
            + 'médiatrices.'
    },
    {
        id: 'dg-cercle-inscrit', theme: 'maths', niveau: 3,
        forme: 'dans', mots: ['CERCLE'], cadre: 'triangle',
        reponse: 'cercle inscrit', variantes: ['inscrit'],
        aide: 'Cette fois le cercle est DEDANS, et touche les trois côtés.',
        explication: 'Le cercle posé à l\'intérieur et tangent aux trois côtés est le '
            + 'CERCLE INSCRIT. Son centre est le point de rencontre des bissectrices.'
    },
    {
        id: 'dg-valeur-absolue', theme: 'maths', niveau: 3,
        forme: 'entre', mots: ['−5', '|', '|'],
        reponse: 'valeur absolue', variantes: ['la valeur absolue'],
        aide: 'Les deux barres droites autour du nombre ont un nom.',
        explication: 'Entre deux barres, on lit la VALEUR ABSOLUE : la distance à zéro. '
            + '|−5| = 5, parce qu\'on ne garde que l\'éloignement, pas le sens.'
    },
    {
        id: 'dg-oppose', theme: 'maths', niveau: 3,
        forme: 'miroir', mots: ['7'],
        reponse: 'opposé', variantes: ['nombres opposés', 'l\'opposé'],
        aide: 'De l\'autre côté de l\'axe — et sur une droite graduée, l\'axe est le zéro.',
        explication: 'Deux nombres à la même distance de zéro, de part et d\'autre, sont '
            + 'OPPOSÉS : 7 et −7. Leur somme vaut 0.'
    },
    {
        id: 'dg-inverse', theme: 'maths', niveau: 3,
        forme: 'sur', mots: ['1', 'NOMBRE'],
        reponse: 'inverse', variantes: ['l\'inverse', 'nombre inverse'],
        aide: 'Un sur le nombre.',
        explication: 'L\'INVERSE de n est 1/n. Leur produit vaut 1 — à ne pas confondre '
            + 'avec l\'opposé, dont la somme vaut 0.'
    },
    {
        id: 'dg-developper', theme: 'maths', niveau: 3,
        forme: 'ecarte', mots: ['PRODUIT'],
        reponse: 'développer', variantes: ['développement', 'développe'],
        aide: 'Ce qui était serré s\'étale. En algèbre, on part d\'un produit.',
        explication: 'Passer d\'un produit à une somme, c\'est DÉVELOPPER : '
            + '3(x + 2) = 3x + 6. Le chemin inverse s\'appelle factoriser.'
    },
    {
        id: 'dg-factoriser', theme: 'maths', niveau: 3,
        forme: 'serre', mots: ['SOMME'],
        reponse: 'factoriser', variantes: ['factorisation', 'factorise'],
        aide: 'Ce qui était étalé se resserre. En algèbre, on part d\'une somme.',
        explication: 'Passer d\'une somme à un produit, c\'est FACTORISER : '
            + '3x + 6 = 3(x + 2).'
    },
    {
        id: 'dg-decimale', theme: 'maths', niveau: 3,
        forme: 'rang', mots: ['3', ',', '1', '4'], ou: 2,
        reponse: 'partie décimale', variantes: ['décimale', 'chiffre des dixièmes', 'dixième'],
        aide: 'Le chiffre mis en avant est juste après la virgule.',
        explication: 'Le premier chiffre après la virgule est celui des DIXIÈMES : il '
            + 'ouvre la PARTIE DÉCIMALE du nombre.'
    },
    {
        id: 'dg-chiffre-dizaines', theme: 'maths', niveau: 3,
        forme: 'rang', mots: ['4', '5', '6'], ou: 1,
        reponse: 'chiffre des dizaines', variantes: ['dizaines', 'les dizaines'],
        aide: 'Dans 456, quelle place occupe le 5 ?',
        explication: 'Deuxième en partant de la gauche dans un nombre à trois chiffres, '
            + 'mais surtout DEUXIÈME EN PARTANT DE LA VIRGULE : c\'est le CHIFFRE DES '
            + 'DIZAINES.'
    },
    {
        id: 'dg-multiple', theme: 'maths', niveau: 3,
        forme: 'repete', mots: ['7'], combien: 4,
        reponse: 'multiple', variantes: ['un multiple de 7', 'multiple de sept'],
        aide: 'Sept, pris plusieurs fois.',
        explication: '7 + 7 + 7 + 7 = 28, et 28 est un MULTIPLE de 7 : il est dans sa '
            + 'table.'
    },
    {
        id: 'dg-puissance-repetee', theme: 'maths', niveau: 3,
        forme: 'repete', mots: ['2'], combien: 5,
        reponse: 'puissance de deux', variantes: ['deux puissance cinq', '2 puissance 5',
            'une puissance de deux'],
        aide: 'Cinq fois le même facteur — pas une addition cette fois.',
        explication: '2 × 2 × 2 × 2 × 2 s\'écrit 2⁵ : une PUISSANCE. L\'exposant compte '
            + 'les facteurs, pas les termes.'
    },
    {
        id: 'dg-hauteur', theme: 'maths', niveau: 3,
        forme: 'croisent', mots: ['BASE', 'HAUTEUR'],
        reponse: 'hauteur', variantes: ['la hauteur', 'hauteur d\'un triangle'],
        aide: 'Elle tombe perpendiculairement sur la base.',
        explication: 'La HAUTEUR part d\'un sommet et tombe perpendiculairement sur la '
            + 'base opposée. C\'est elle qui entre dans l\'aire du triangle.'
    },
    {
        id: 'dg-quotient', theme: 'maths', niveau: 3,
        forme: 'sur', mots: ['DIVIDENDE', 'DIVISEUR'],
        reponse: 'quotient', variantes: ['le quotient'],
        aide: 'Le résultat de ce qui est écrit.',
        explication: 'Le dividende sur le diviseur donne le QUOTIENT. Dans une division '
            + 'euclidienne, il reste en plus… le reste.'
    },
    {
        id: 'dg-proportionnalite', theme: 'maths', niveau: 3,
        forme: 'paralleles', mots: ['×3'],
        reponse: 'proportionnalité', variantes: ['tableau de proportionnalité', 'proportionnel'],
        aide: 'Le même coefficient, sur deux lignes, sans exception.',
        explication: 'Quand on passe d\'une ligne à l\'autre en multipliant TOUJOURS par '
            + 'le même nombre, il y a PROPORTIONNALITÉ. Une seule case qui échappe à la '
            + 'règle, et ce n\'en est plus.'
    },
    {
        id: 'dg-symetrie-figure', theme: 'maths', niveau: 3,
        forme: 'miroir', mots: ['AXE'],
        reponse: 'axe de symétrie', variantes: ['axe'],
        aide: 'Le trait vertical, entre les deux moitiés.',
        explication: 'La droite qui partage une figure en deux moitiés superposables est '
            + 'son AXE DE SYMÉTRIE. Un carré en a quatre, un cercle une infinité.'
    },
    {
        id: 'dg-aire', theme: 'maths', niveau: 3,
        forme: 'dans', mots: ['MESURE'], cadre: 'rectangle',
        reponse: 'aire', variantes: ['l\'aire', 'surface'],
        aide: 'La mesure est DEDANS, pas autour.',
        explication: 'La mesure de l\'INTÉRIEUR d\'une figure est son AIRE, et elle se '
            + 'compte en carreaux. Le tour, lui, c\'est le périmètre.'
    },

    // ═══ MATHÉMATIQUES — NIVEAU 4 ═══════════════════════════════════════════
    //
    // Deux lectures : la disposition dit une chose, le mot en dit une autre.

    {
        id: 'dg-pi', theme: 'maths', niveau: 4,
        forme: 'rang', mots: ['3', '1', '4', '1', '5'], ou: 0,
        // NI « π » NI AUCUN SYMBOLE DANS LES VARIANTES : le juge ramène tout
        // aux lettres et aux chiffres, donc « π » deviendrait une chaîne vide et
        // serait refusé — une tolérance promise et non tenue. « 3,14 » passe,
        // lui : les chiffres restent.
        reponse: 'pi', variantes: ['le nombre pi', '3,14'],
        aide: 'Lis les chiffres à la suite, et place la virgule après le premier.',
        explication: '3,1415… est le début de PI, le rapport entre le périmètre d\'un '
            + 'cercle et son diamètre. Il ne s\'arrête jamais et ne se répète jamais.'
    },
    {
        id: 'dg-infini', theme: 'maths', niveau: 4,
        forme: 'repete', mots: ['…'], combien: 4,
        reponse: 'infini', variantes: ['l\'infini', 'une infinité'],
        aide: 'Ça continue, et ça ne s\'arrête pas.',
        explication: 'Ce qui n\'a pas de fin est INFINI. Il y a une infinité de nombres '
            + 'entiers, et déjà une infinité de décimaux entre 0 et 1.'
    },
    {
        id: 'dg-racine-cubique', theme: 'maths', niveau: 4,
        forme: 'dans', mots: ['RACINE'], cadre: 'cube',
        reponse: 'racine cubique', variantes: ['racine cube'],
        aide: 'Cette fois la forme n\'est pas plate.',
        explication: 'La racine dans un cube : la RACINE CUBIQUE. ∛8 = 2, parce que '
            + 'c\'est l\'arête du cube de volume 8.'
    },
    {
        id: 'dg-equation', theme: 'maths', niveau: 4,
        forme: 'entre', mots: ['=', 'GAUCHE', 'DROITE'],
        reponse: 'équation', variantes: ['une équation', 'égalité'],
        aide: 'Deux membres, et un signe entre les deux.',
        explication: 'Deux expressions reliées par un signe égal : une ÉQUATION. Résoudre, '
            + 'c\'est trouver les valeurs qui rendent l\'égalité vraie.'
    },
    {
        id: 'dg-inequation', theme: 'maths', niveau: 4,
        forme: 'entre', mots: ['<', 'GAUCHE', 'DROITE'],
        reponse: 'inéquation', variantes: ['une inéquation', 'inégalité'],
        aide: 'Le signe du milieu n\'est pas un égal.',
        explication: 'Avec un < ou un >, ce n\'est plus une équation mais une INÉQUATION. '
            + 'Sa solution n\'est pas un nombre, c\'est un intervalle.'
    },
    {
        id: 'dg-intervalle', theme: 'maths', niveau: 4,
        forme: 'entre', mots: ['x', '[2', '5]'],
        reponse: 'intervalle', variantes: ['un intervalle'],
        aide: 'Entre deux crochets, tout ce qu\'il y a au milieu.',
        explication: 'L\'ensemble de tous les nombres compris entre deux bornes est un '
            + 'INTERVALLE. Le crochet dit si la borne est prise ou non.'
    },
    {
        id: 'dg-abscisse', theme: 'maths', niveau: 4,
        forme: 'rang', mots: ['(', '3', ';', '5', ')'], ou: 1,
        reponse: 'abscisse', variantes: ['l\'abscisse'],
        aide: 'Dans un couple de coordonnées, le premier des deux nombres.',
        explication: 'Le premier nombre d\'un couple est l\'ABSCISSE : on se déplace '
            + 'd\'abord horizontalement. Le second est l\'ORDONNÉE.'
    },
    {
        id: 'dg-ordonnee', theme: 'maths', niveau: 4,
        forme: 'rang', mots: ['(', '3', ';', '5', ')'], ou: 3,
        reponse: 'ordonnée', variantes: ['l\'ordonnée'],
        aide: 'Le second des deux nombres du couple.',
        explication: 'Le second nombre d\'un couple est l\'ORDONNÉE : on monte ensuite. '
            + 'On lit toujours dans cet ordre — abscisse, puis ordonnée.'
    },
    {
        id: 'dg-hypotenuse', theme: 'maths', niveau: 4,
        forme: 'traverse', mots: ['CÔTÉ'], cadre: 'triangle', biais: true,
        reponse: 'hypoténuse', variantes: ['l\'hypoténuse'],
        aide: 'Dans un triangle rectangle, le côté qui ne touche pas l\'angle droit.',
        explication: 'Le côté opposé à l\'angle droit est l\'HYPOTÉNUSE, et c\'est '
            + 'toujours le plus long. C\'est celui qui est seul d\'un côté du théorème '
            + 'de Pythagore.'
    },
    {
        id: 'dg-divisible', theme: 'maths', niveau: 4,
        forme: 'coupe', mots: ['12', '3'],
        reponse: 'divisible', variantes: ['divisibilité', 'division', 'diviseur'],
        aide: 'Le premier nombre se coupe en parts du second, sans qu\'il reste rien.',
        explication: '12 se partage exactement en parts de 3 : 12 est DIVISIBLE par 3. '
            + 'Autrement dit, 3 est un diviseur de 12.'
    },
    {
        id: 'dg-reste', theme: 'maths', niveau: 4,
        forme: 'manque', mots: ['PARTAGE'], ou: 6,
        reponse: 'reste', variantes: ['le reste', 'division euclidienne'],
        aide: 'Après le partage, quelque chose n\'est pas parti.',
        explication: 'Ce qui ne se partage pas est le RESTE de la division euclidienne, '
            + 'et il est toujours plus petit que le diviseur.'
    },
    {
        id: 'dg-pair', theme: 'maths', niveau: 4,
        forme: 'paralleles', mots: ['2'],
        reponse: 'nombre pair', variantes: ['pair', 'les nombres pairs'],
        aide: 'Deux à deux, sans qu\'il en reste un seul tout seul.',
        explication: 'Un nombre qui se range exactement par deux est PAIR : il se termine '
            + 'par 0, 2, 4, 6 ou 8.'
    },
    {
        id: 'dg-impair', theme: 'maths', niveau: 4,
        forme: 'rang', mots: ['2', '2', '2', '1'], ou: 3,
        reponse: 'nombre impair', variantes: ['impair', 'les nombres impairs'],
        aide: 'On range par deux, et il en reste un.',
        explication: 'Quand il reste un élément seul, le nombre est IMPAIR.'
    },
    {
        id: 'dg-suite', theme: 'maths', niveau: 4,
        forme: 'rang', mots: ['2', '4', '6', '8'], ou: 3,
        reponse: 'suite', variantes: ['une suite', 'suite de nombres', 'suite arithmétique'],
        aide: 'Des nombres qui se suivent selon une règle. Laquelle ?',
        explication: 'Chaque terme s\'obtient du précédent en ajoutant 2 : c\'est une '
            + 'SUITE ARITHMÉTIQUE de raison 2.'
    },
    {
        id: 'dg-symetrie-translation', theme: 'maths', niveau: 4,
        forme: 'glisse', mots: ['PAVÉ'],
        reponse: 'pavage', variantes: ['un pavage', 'frise'],
        aide: 'Un motif qu\'on fait glisser encore et encore, sans trou ni recouvrement.',
        explication: 'Un motif répété par translation qui recouvre le plan sans trou ni '
            + 'chevauchement : un PAVAGE. C\'est exactement ce que fait la Mosaïque des '
            + 'Transformations.'
    },
    {
        id: 'dg-volume', theme: 'maths', niveau: 4,
        forme: 'dans', mots: ['MESURE'], cadre: 'cube',
        reponse: 'volume', variantes: ['le volume'],
        aide: 'La mesure est dedans — mais la forme n\'est pas plate.',
        explication: 'La mesure de l\'intérieur d\'un SOLIDE est son VOLUME, et il se '
            + 'compte en cubes. L\'aire se compte en carreaux, le volume en cubes.'
    },
    {
        id: 'dg-echelle', theme: 'maths', niveau: 4,
        forme: 'sur', mots: ['PLAN', 'RÉEL'],
        reponse: 'échelle', variantes: ['une échelle', 'l\'échelle d\'un plan'],
        aide: 'La mesure sur le plan, divisée par la mesure réelle.',
        explication: 'L\'ÉCHELLE est le quotient de la longueur sur le plan par la '
            + 'longueur réelle. Au 1/25000, un centimètre représente 250 mètres.'
    },
    {
        id: 'dg-vitesse', theme: 'maths', niveau: 4,
        forme: 'sur', mots: ['DISTANCE', 'TEMPS'],
        reponse: 'vitesse', variantes: ['la vitesse'],
        aide: 'Une distance divisée par une durée.',
        explication: 'Distance sur temps : la VITESSE. C\'est une grandeur COMPOSÉE, et '
            + 'c\'est pour cela qu\'elle s\'écrit avec un trait de fraction : km/h.'
    },
    {
        id: 'dg-densite', theme: 'maths', niveau: 4,
        forme: 'sur', mots: ['HABITANTS', 'KM²'],
        reponse: 'densité', variantes: ['densité de population', 'la densité'],
        aide: 'Un nombre d\'habitants divisé par une surface.',
        explication: 'Habitants sur kilomètres carrés : la DENSITÉ de population. Encore '
            + 'une grandeur composée, comme la vitesse.'
    },
    {
        id: 'dg-probabilite', theme: 'maths', niveau: 4,
        forme: 'sur', mots: ['FAVORABLES', 'POSSIBLES'],
        reponse: 'probabilité', variantes: ['une probabilité', 'proba'],
        aide: 'Les cas qui nous arrangent, sur tous les cas.',
        explication: 'Cas favorables sur cas possibles : la PROBABILITÉ. Elle est '
            + 'toujours comprise entre 0 et 1 — un quotient dont le haut ne dépasse '
            + 'jamais le bas.'
    },

    // ═══ CULTURE GÉNÉRALE — NIVEAU 1 ════════════════════════════════════════
    //
    // Les dingbats classiques, ceux qu'on trouve dans les magazines. Ils ne
    // servent pas le cours : ils apprennent à LIRE une disposition, et c'est ce
    // qui rend les autres accessibles.

    {
        id: 'dg-chat-boite', theme: 'general', niveau: 1,
        forme: 'dans', mots: ['CHAT'], cadre: 'carre',
        reponse: 'chat en boîte', variantes: ['un chat dans une boîte', 'chat dans une boite'],
        aide: 'Qu\'est-ce qui entoure le mot ?',
        explication: 'Le chat est enfermé dans une boîte : « CHAT EN BOÎTE ».'
    },
    {
        id: 'dg-mise-au-point', theme: 'general', niveau: 1,
        forme: 'sur', mots: ['MISE', 'POINT'],
        reponse: 'mise au point',
        aide: 'Lis de haut en bas en ajoutant un petit mot.',
        explication: 'MISE posée sur POINT : une « MISE AU POINT ».'
    },
    {
        id: 'dg-sous-entendu', theme: 'general', niveau: 1,
        forme: 'sur', mots: ['ENTENDU', 'ENTENDU'],
        reponse: 'sous-entendu', variantes: ['sous entendu'],
        aide: 'Le second est SOUS le premier.',
        explication: 'Un « entendu » écrit sous un autre : un SOUS-ENTENDU.'
    },
    {
        id: 'dg-mot-a-mot', theme: 'general', niveau: 1,
        forme: 'repete', mots: ['MOT'], combien: 2,
        reponse: 'mot à mot', variantes: ['mot pour mot'],
        aide: 'Deux mots côte à côte, et rien d\'autre.',
        explication: 'MOT à côté de MOT : « MOT À MOT ».'
    },
    {
        id: 'dg-tete-en-bas', theme: 'general', niveau: 1,
        forme: 'demiTour', mots: ['TÊTE'],
        reponse: 'tête en bas', variantes: ['la tête en bas', 'cul par-dessus tête'],
        aide: 'Dans quel sens est le second mot ?',
        explication: 'La tête a fait un demi-tour : elle est EN BAS.'
    },
    {
        id: 'dg-grand-ecart', theme: 'general', niveau: 1,
        forme: 'ecarte', mots: ['ECART'],
        reponse: 'grand écart', variantes: ['le grand écart'],
        aide: 'Le mot lui-même dit la moitié de la réponse. L\'autre moitié se voit.',
        explication: 'Les lettres d\'ÉCART sont très écartées : c\'est le GRAND ÉCART.'
    },
    {
        id: 'dg-entre-deux', theme: 'general', niveau: 1,
        forme: 'entre', mots: ['DEUX', 'A', 'B'],
        reponse: 'entre deux', variantes: ['un entre-deux'],
        aide: 'Regarde la place du mot du milieu.',
        explication: 'DEUX écrit entre deux choses : un « ENTRE-DEUX ».'
    },
    {
        id: 'dg-trois-petits-points', theme: 'general', niveau: 1,
        forme: 'repete', mots: ['.'], combien: 3,
        reponse: 'trois petits points', variantes: ['points de suspension'],
        aide: 'Compte-les.',
        explication: 'Trois points à la suite : les « TROIS PETITS POINTS », ou points de '
            + 'suspension.'
    },

    // ═══ CULTURE GÉNÉRALE — NIVEAU 2 ════════════════════════════════════════

    {
        id: 'dg-tour-de-france', theme: 'general', niveau: 2,
        forme: 'autour', mots: ['FRANCE'], cadre: 'cercle',
        reponse: 'tour de France', variantes: ['le tour de france'],
        aide: 'Le mot fait le tour.',
        explication: 'FRANCE écrit tout autour : le « TOUR DE FRANCE ».'
    },
    {
        id: 'dg-coup-de-pied', theme: 'general', niveau: 2,
        forme: 'dans', mots: ['PIED'], cadre: 'cercle',
        reponse: 'coup de pied', variantes: ['un coup de pied'],
        aide: 'Un pied, et un ballon.',
        explication: 'Le pied est dans le ballon : un « COUP DE PIED ».'
    },
    {
        id: 'dg-haut-les-mains', theme: 'general', niveau: 2,
        forme: 'sur', mots: ['MAINS', 'HAUT'],
        reponse: 'haut les mains', variantes: ['les mains en l\'air'],
        aide: 'Les mains sont au-dessus.',
        explication: 'MAINS posé au-dessus de HAUT : « HAUT LES MAINS ».'
    },
    {
        id: 'dg-mise-en-abyme', theme: 'general', niveau: 2,
        forme: 'dans', mots: ['IMAGE'], cadre: 'rectangle',
        reponse: 'mise en abyme', variantes: ['image dans l\'image', 'mise en abîme'],
        aide: 'Une image dans un cadre, et le cadre est lui-même une image.',
        explication: 'Une image contenue dans elle-même : une MISE EN ABYME.'
    },
    {
        id: 'dg-renverse', theme: 'general', niveau: 2,
        forme: 'miroir', mots: ['SENS'],
        reponse: 'sens inverse', variantes: ['à contresens', 'en sens inverse'],
        aide: 'Le second mot part dans l\'autre direction.',
        explication: 'Le mot SENS retourné : on va en SENS INVERSE.'
    },
    {
        id: 'dg-mots-croises', theme: 'general', niveau: 2,
        forme: 'croisent', mots: ['MOTS', 'MOTS'],
        reponse: 'mots croisés', variantes: ['les mots croisés'],
        aide: 'Deux fois le même mot, et ils se croisent.',
        explication: 'Des mots qui se croisent : les MOTS CROISÉS.'
    },
    {
        id: 'dg-double-sens', theme: 'general', niveau: 2,
        forme: 'paralleles', mots: ['SENS'],
        reponse: 'double sens', variantes: ['un double sens'],
        aide: 'Il y en a deux, pareils.',
        explication: 'Deux fois SENS : un « DOUBLE SENS ».'
    },
    {
        id: 'dg-coupe-du-monde', theme: 'general', niveau: 2,
        forme: 'coupe', mots: ['MON', 'DE'],
        reponse: 'coupe du monde', variantes: ['la coupe du monde'],
        aide: 'Le mot MONDE est coupé en deux.',
        explication: 'MONDE coupé : la « COUPE DU MONDE ».'
    },
    {
        id: 'dg-fin-du-monde', theme: 'general', niveau: 2,
        forme: 'rang', mots: ['MONDE', 'MONDE', 'MONDE'], ou: 2,
        reponse: 'fin du monde', variantes: ['la fin du monde'],
        aide: 'Celui qui est mis en avant est le dernier.',
        explication: 'Le dernier MONDE de la file : la « FIN DU MONDE ».'
    },
    {
        id: 'dg-sous-sol', theme: 'general', niveau: 2,
        forme: 'sur', mots: ['MAISON', 'SOL'],
        reponse: 'sous-sol', variantes: ['sous sol'],
        aide: 'Ce qui est écrit en dessous.',
        explication: 'SOL écrit sous la maison : le SOUS-SOL.'
    },
    {
        id: 'dg-passe-partout', theme: 'general', niveau: 2,
        forme: 'traverse', mots: ['PASSE'], cadre: 'carre',
        reponse: 'passe-partout', variantes: ['passe partout'],
        aide: 'Le mot traverse la forme de part en part.',
        explication: 'PASSE qui traverse tout : un « PASSE-PARTOUT ».'
    },
    {
        id: 'dg-tete-a-tete', theme: 'general', niveau: 2,
        forme: 'miroir', mots: ['TÊTE'],
        reponse: 'tête-à-tête', variantes: ['tete a tete', 'un tête-à-tête'],
        aide: 'Deux têtes qui se font face.',
        explication: 'Deux TÊTE face à face : un TÊTE-À-TÊTE.'
    },

    // ═══ CULTURE GÉNÉRALE — NIVEAU 3 ════════════════════════════════════════

    {
        id: 'dg-chateau-en-espagne', theme: 'general', niveau: 3,
        forme: 'dans', mots: ['CHÂTEAU'], cadre: 'nuage',
        reponse: 'château en Espagne', variantes: ['châteaux en Espagne', 'un chateau en espagne'],
        aide: 'Un château posé dans les nuages : un rêve impossible.',
        explication: 'Un projet irréalisable est un « CHÂTEAU EN ESPAGNE ».'
    },
    {
        id: 'dg-mettre-les-points', theme: 'general', niveau: 3,
        forme: 'manque', mots: ['I'], ou: 0,
        reponse: 'mettre les points sur les i', variantes: ['les points sur les i'],
        aide: 'Il manque quelque chose au-dessus de cette lettre.',
        explication: '« METTRE LES POINTS SUR LES I », c\'est dire les choses jusqu\'au '
            + 'bout, sans laisser d\'ambiguïté.'
    },
    {
        id: 'dg-avoir-un-mot', theme: 'general', niveau: 3,
        forme: 'manque', mots: ['MOT'], ou: 1,
        reponse: 'avoir un mot sur le bout de la langue', variantes: ['mot manquant', 'un mot qui manque'],
        aide: 'Une lettre du mot s\'efface.',
        explication: 'Le mot est là, presque entier, et il échappe : on l\'a « SUR LE '
            + 'BOUT DE LA LANGUE ».'
    },
    {
        id: 'dg-revenir-sur-terre', theme: 'general', niveau: 3,
        forme: 'sur', mots: ['PIEDS', 'TERRE'],
        reponse: 'avoir les pieds sur terre', variantes: ['les pieds sur terre', 'pieds sur terre'],
        aide: 'Les pieds sont posés sur quelque chose.',
        explication: 'Être réaliste, c\'est « AVOIR LES PIEDS SUR TERRE ».'
    },
    {
        id: 'dg-pierre-deux-coups', theme: 'general', niveau: 3,
        forme: 'rang', mots: ['PIERRE', 'COUP', 'COUP'], ou: 0,
        reponse: 'faire d\'une pierre deux coups', variantes: ['d\'une pierre deux coups', 'une pierre deux coups'],
        aide: 'Une seule pierre, et deux coups derrière.',
        explication: 'Obtenir deux résultats d\'un seul geste : « FAIRE D\'UNE PIERRE '
            + 'DEUX COUPS ».'
    },
    {
        id: 'dg-quart-dheure', theme: 'general', niveau: 3,
        forme: 'repete', mots: ['HEURE'], combien: 4,
        reponse: 'quatre heures', variantes: ['4 heures', 'le goûter'],
        aide: 'Compte-les.',
        explication: 'Quatre fois HEURE : « QUATRE HEURES », l\'heure du goûter.'
    },
    {
        id: 'dg-couper-cheveu', theme: 'general', niveau: 3,
        forme: 'coupe', mots: ['CHEV', 'EU'],
        reponse: 'couper les cheveux en quatre', variantes: ['couper le cheveu en quatre', 'couper les cheveux'],
        aide: 'Le cheveu est coupé.',
        explication: 'Chercher des subtilités inutiles : « COUPER LES CHEVEUX EN QUATRE ».'
    },
    {
        id: 'dg-mise-en-page', theme: 'general', niveau: 3,
        forme: 'dans', mots: ['TEXTE'], cadre: 'rectangle',
        reponse: 'mise en page', variantes: ['la mise en page'],
        aide: 'Le texte est placé dans une page.',
        explication: 'Disposer un texte dans une page : la MISE EN PAGE.'
    },
    {
        id: 'dg-tourner-en-rond', theme: 'general', niveau: 3,
        forme: 'autour', mots: ['TOURNER'], cadre: 'cercle',
        reponse: 'tourner en rond', variantes: ['on tourne en rond'],
        aide: 'Le mot fait le tour d\'un rond.',
        explication: 'Ne pas avancer malgré l\'effort : « TOURNER EN ROND ».'
    },
    {
        id: 'dg-mot-de-passe', theme: 'general', niveau: 3,
        forme: 'traverse', mots: ['MOT'], cadre: 'carre',
        reponse: 'mot de passe', variantes: ['un mot de passe'],
        aide: 'Le mot passe à travers.',
        explication: 'Celui qui laisse passer : un MOT DE PASSE.'
    },

    // ═══ CULTURE GÉNÉRALE — NIVEAU 4 ════════════════════════════════════════

    {
        id: 'dg-chercher-midi', theme: 'general', niveau: 4,
        forme: 'rang', mots: ['12', '14'], ou: 1,
        reponse: 'chercher midi à quatorze heures', variantes: ['midi à quatorze heures'],
        aide: 'Midi, et l\'heure qu\'on regarde à la place.',
        explication: 'Compliquer inutilement les choses : « CHERCHER MIDI À QUATORZE '
            + 'HEURES ».'
    },
    {
        id: 'dg-trente-six-chandelles', theme: 'general', niveau: 4,
        forme: 'exposant', mots: ['6', '2'],
        reponse: 'trente-six chandelles', variantes: ['voir trente-six chandelles', '36 chandelles'],
        aide: 'Calcule d\'abord ce qui est écrit, puis cherche l\'expression.',
        explication: '6² = 36 : « VOIR TRENTE-SIX CHANDELLES », c\'est être étourdi par '
            + 'un choc.'
    },
    {
        id: 'dg-quatre-vingts', theme: 'general', niveau: 4,
        forme: 'repete', mots: ['20'], combien: 4,
        reponse: 'quatre-vingts', variantes: ['80', 'quatre vingts'],
        aide: 'Quatre fois vingt.',
        explication: '4 × 20 = 80, et c\'est exactement ce que dit le mot : QUATRE-VINGTS. '
            + 'Le français compte encore par vingtaines à cet endroit-là.'
    },
    {
        id: 'dg-sens-dessus-dessous', theme: 'general', niveau: 4,
        forme: 'sur', mots: ['DESSOUS', 'DESSUS'],
        reponse: 'sens dessus dessous', variantes: ['sans dessus dessous'],
        aide: 'DESSOUS est au-dessus, et DESSUS est en dessous.',
        explication: 'Tout est inversé : « SENS DESSUS DESSOUS ».'
    },
    {
        id: 'dg-entre-quatre-yeux', theme: 'general', niveau: 4,
        forme: 'entre', mots: ['SECRET', 'YEUX', 'YEUX'],
        reponse: 'entre quatre yeux', variantes: ['entre quat\'z\'yeux'],
        aide: 'Deux paires d\'yeux, et quelque chose au milieu.',
        explication: 'Une conversation à deux, sans témoin : « ENTRE QUATRE YEUX ».'
    },
    {
        id: 'dg-un-mot-deux-sens', theme: 'general', niveau: 4,
        forme: 'miroir', mots: ['RADAR'],
        reponse: 'palindrome', variantes: ['un palindrome'],
        aide: 'Lis le mot à l\'endroit, puis à l\'envers.',
        explication: 'RADAR se lit pareil dans les deux sens : c\'est un PALINDROME. '
            + '« Ressasser » et « kayak » aussi.'
    },
    {
        id: 'dg-sans-dessus', theme: 'general', niveau: 4,
        forme: 'manque', mots: ['PARFAIT'], ou: 3,
        reponse: 'presque parfait', variantes: ['imparfait', 'pas tout à fait parfait'],
        aide: 'Il manque une lettre à un mot qui prétend ne rien manquer.',
        explication: 'Un « parfait » auquel il manque quelque chose n\'est que PRESQUE '
            + 'PARFAIT.'
    },
    {
        id: 'dg-lettre-ouverte', theme: 'general', niveau: 4,
        forme: 'ecarte', mots: ['LETTRE'],
        reponse: 'lettre ouverte', variantes: ['une lettre ouverte'],
        aide: 'Les lettres du mot s\'ouvrent.',
        explication: 'Un texte public adressé à quelqu\'un : une LETTRE OUVERTE.'
    },
    {
        id: 'dg-jeu-de-mots', theme: 'general', niveau: 4,
        forme: 'desordre', mots: ['MOTS'], melange: 'TMOS',
        reponse: 'jeu de mots', variantes: ['un jeu de mots', 'anagramme'],
        aide: 'Les lettres jouent entre elles.',
        explication: 'Des lettres qu\'on remue pour en faire autre chose : un JEU DE MOTS '
            + '— ici, une ANAGRAMME.'
    },
    {
        id: 'dg-premier-de-cordee', theme: 'general', niveau: 4,
        forme: 'rang', mots: ['1', '2', '3', '4'], ou: 0,
        // PAS DE « premier » TOUT SEUL : l'énigme de maths `dg-nombre-premier`
        // l'attend déjà, et deux énigmes dont l'une accepte la réponse de l'autre
        // donnent raison à un élève qui n'a pas trouvé. L'épreuve l'a vu.
        reponse: 'premier de cordée', variantes: ['le premier de cordée'],
        aide: 'Celui qui ouvre la file, et qui tire les autres.',
        explication: 'En montagne, celui qui ouvre la voie est le PREMIER DE CORDÉE.'
    }
];

/** Le compte, par thème et par niveau — lu par l'épreuve et par l'écran. */
export function compter(liste = DINGBATS) {
    const out = {};
    for (const d of liste) {
        out[d.theme] = out[d.theme] || { total: 0 };
        out[d.theme].total++;
        out[d.theme][d.niveau] = (out[d.theme][d.niveau] || 0) + 1;
    }
    return out;
}
