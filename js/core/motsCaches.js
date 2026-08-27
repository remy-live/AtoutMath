// MOTS CACHÉS MATHÉMATIQUES — la grille, sans une ligne de DOM.
//
// Une grille de lettres, des mots du vocabulaire mathématique à retrouver dans
// les huit directions. Ce qui en fait autre chose qu'un passe-temps : chaque
// mot trouvé donne sa DÉFINITION. On ne cherche pas des lettres, on relit le
// lexique — et « hypoténuse », « quotient », « médiatrice » sont précisément
// les mots qu'un élève reconnaît sans savoir les dire.
//
// Le placement est un remplissage par essais successifs : on tente un mot à un
// endroit et dans une direction tirés au hasard, on vérifie que chaque lettre
// tombe sur une case vide OU sur la même lettre — c'est cette seconde
// possibilité qui produit les croisements, donc les grilles qui ressemblent à
// des mots cachés plutôt qu'à des lignes parallèles.

import { makeRng } from './ids.js';

export const DIRECTIONS = [
    { dx: 1, dy: 0, nom: 'horizontale' },
    { dx: 0, dy: 1, nom: 'verticale' },
    { dx: 1, dy: 1, nom: 'diagonale' },
    { dx: 1, dy: -1, nom: 'diagonale' },
    { dx: -1, dy: 0, nom: 'horizontale à l\'envers' },
    { dx: 0, dy: -1, nom: 'verticale à l\'envers' },
    { dx: -1, dy: -1, nom: 'diagonale à l\'envers' },
    { dx: -1, dy: 1, nom: 'diagonale à l\'envers' }
];

const ALPHABET = 'AABCDEEFGHIIJKLMNOOPQRSTUUVXYZ';

/**
 * Le lexique. `theme` sert au tri, `niveau` au filtrage par classe.
 * Les définitions sont écrites pour être lues par l'élève qui vient de
 * trouver le mot — courtes, et sans employer le mot qu'elles définissent.
 */
export const LEXIQUE = [
    // --- Géométrie ---
    { mot: 'CARRE', theme: 'geometrie', niveau: 1, def: 'Quatre côtés de même longueur et quatre angles droits.' },
    { mot: 'CERCLE', theme: 'geometrie', niveau: 1, def: 'Tous ses points sont à la même distance du centre.' },
    { mot: 'RAYON', theme: 'geometrie', niveau: 1, def: 'Du centre du cercle jusqu\'au bord.' },
    { mot: 'DIAMETRE', theme: 'geometrie', niveau: 1, def: 'Traverse le cercle en passant par le centre : deux rayons.' },
    { mot: 'ANGLE', theme: 'geometrie', niveau: 1, aussi: ['angles'], def: 'L\'écartement entre deux demi-droites de même origine.' },
    { mot: 'DROITE', theme: 'geometrie', niveau: 1, def: 'Illimitée des deux côtés, elle n\'a ni début ni fin.' },
    { mot: 'SEGMENT', theme: 'geometrie', niveau: 1, def: 'Une portion de droite, limitée par deux points.' },
    { mot: 'SOMMET', theme: 'geometrie', niveau: 1, aussi: ['angles'], def: 'Le point où deux côtés se rejoignent.' },
    { mot: 'TRIANGLE', theme: 'geometrie', niveau: 1, def: 'Trois côtés, trois sommets, trois angles.' },
    { mot: 'LOSANGE', theme: 'geometrie', niveau: 2, def: 'Quatre côtés de même longueur, sans angle droit obligatoire.' },
    { mot: 'RECTANGLE', theme: 'geometrie', niveau: 1, def: 'Quatre angles droits, les côtés opposés égaux.' },
    { mot: 'PARALLELE', theme: 'geometrie', niveau: 2, def: 'Deux droites qui ne se croisent jamais, même très loin.' },
    { mot: 'PERPENDICULAIRE', theme: 'geometrie', niveau: 2, aussi: ['angles'], def: 'Deux droites qui se croisent en formant un angle droit.' },
    { mot: 'MEDIATRICE', theme: 'geometrie', niveau: 3, def: 'Coupe un segment en son milieu, perpendiculairement.' },
    { mot: 'BISSECTRICE', theme: 'geometrie', niveau: 3, aussi: ['angles'], def: 'Partage un angle en deux angles égaux.' },
    { mot: 'HYPOTENUSE', theme: 'geometrie', niveau: 3, def: 'Le plus long côté d\'un triangle rectangle, face à l\'angle droit.' },
    { mot: 'SYMETRIE', theme: 'geometrie', niveau: 2, def: 'Comme le reflet dans un miroir, de part et d\'autre d\'un axe.' },
    { mot: 'CUBE', theme: 'geometrie', niveau: 1, def: 'Six faces carrées identiques.' },
    { mot: 'PYRAMIDE', theme: 'geometrie', niveau: 2, def: 'Une base, et des faces triangulaires qui montent vers un sommet.' },
    { mot: 'ARETE', theme: 'geometrie', niveau: 2, def: 'Le segment où deux faces d\'un solide se rencontrent.' },
    { mot: 'FACE', theme: 'geometrie', niveau: 1, def: 'Une des parties planes qui ferment un solide.' },
    { mot: 'CENTRE', theme: 'geometrie', niveau: 1, def: 'Le point du milieu, à égale distance de tout le bord.' },

    // --- Nombres ---
    { mot: 'ENTIER', theme: 'nombres', niveau: 1, def: 'Un nombre sans virgule : 0, 1, 2, 3…' },
    { mot: 'DECIMAL', theme: 'nombres', niveau: 1, def: 'Un nombre à virgule, comme 3,14.' },
    { mot: 'FRACTION', theme: 'nombres', niveau: 2, def: 'Un nombre écrit comme un partage : 3 sur 4.' },
    { mot: 'NUMERATEUR', theme: 'nombres', niveau: 2, def: 'Le nombre du HAUT dans une fraction.' },
    { mot: 'DENOMINATEUR', theme: 'nombres', niveau: 2, def: 'Le nombre du BAS : en combien de parts on partage.' },
    { mot: 'RELATIF', theme: 'nombres', niveau: 3, def: 'Un nombre qui peut être négatif, comme −7.' },
    { mot: 'NEGATIF', theme: 'nombres', niveau: 3, def: 'Plus petit que zéro : il est à sa gauche sur la droite graduée.' },
    { mot: 'OPPOSE', theme: 'nombres', niveau: 3, def: 'Même distance à zéro, de l\'autre côté : −5 et 5.' },
    { mot: 'CHIFFRE', theme: 'nombres', niveau: 1, def: 'Un des dix symboles de 0 à 9 : les nombres s\'écrivent avec.' },
    { mot: 'DIZAINE', theme: 'nombres', niveau: 1, def: 'Un paquet de dix unités.' },
    { mot: 'CENTAINE', theme: 'nombres', niveau: 1, def: 'Un paquet de cent unités, soit dix dizaines.' },
    { mot: 'DIXIEME', theme: 'nombres', niveau: 1, def: 'Le premier chiffre après la virgule : une unité coupée en dix.' },
    { mot: 'PAIR', theme: 'nombres', niveau: 1, def: 'Se partage en deux parts égales, sans reste.' },
    { mot: 'PREMIER', theme: 'nombres', niveau: 3, def: 'Ne se divise que par 1 et par lui-même.' },
    { mot: 'MULTIPLE', theme: 'nombres', niveau: 2, def: 'S\'obtient en multipliant : 12 est un de ceux de 3.' },
    { mot: 'DIVISEUR', theme: 'nombres', niveau: 2, def: 'Le divise sans rien laisser : 3 en est un de 12.' },

    // --- Calcul ---
    { mot: 'SOMME', theme: 'calcul', niveau: 1, def: 'Le résultat d\'une addition.' },
    { mot: 'DIFFERENCE', theme: 'calcul', niveau: 1, def: 'Le résultat d\'une soustraction.' },
    { mot: 'PRODUIT', theme: 'calcul', niveau: 1, def: 'Le résultat d\'une multiplication.' },
    { mot: 'QUOTIENT', theme: 'calcul', niveau: 2, def: 'Le résultat d\'une division.' },
    { mot: 'RESTE', theme: 'calcul', niveau: 2, def: 'Ce qui n\'a pas pu être partagé dans une division.' },
    { mot: 'FACTEUR', theme: 'calcul', niveau: 1, def: 'Un des nombres que l\'on multiplie.' },
    { mot: 'TERME', theme: 'calcul', niveau: 1, def: 'Un des nombres que l\'on additionne.' },
    { mot: 'DOUBLE', theme: 'calcul', niveau: 1, def: 'Deux fois plus.' },
    { mot: 'MOITIE', theme: 'calcul', niveau: 1, def: 'Deux fois moins.' },
    { mot: 'PRIORITE', theme: 'calcul', niveau: 2, def: 'La règle qui dit quelle opération faire en premier.' },
    { mot: 'PARENTHESE', theme: 'calcul', niveau: 2, def: 'Ce qui est dedans se calcule avant tout le reste.' },
    { mot: 'EGALITE', theme: 'calcul', niveau: 1, def: 'Deux écritures qui valent la même chose.' },

    // --- Les angles ---
    // Rémy : « par exemple un mot croisé sur le vocabulaire d'angle ». C'est
    // un vocabulaire à part : on l'apprend en une leçon, il se récite, et il
    // se confond très vite — aigu/obtus, complémentaires/supplémentaires,
    // alternes-internes/correspondants.
    { mot: 'AIGU', theme: 'angles', niveau: 1, def: 'Plus petit qu\'un angle droit.' },
    { mot: 'OBTUS', theme: 'angles', niveau: 1, def: 'Plus grand qu\'un angle droit, mais pas plat.' },
    { mot: 'PLAT', theme: 'angles', niveau: 1, def: 'Cent quatre-vingts degrés : ses deux côtés forment une droite.' },
    { mot: 'NUL', theme: 'angles', niveau: 1, def: 'Zéro degré : ses deux côtés sont confondus.' },
    { mot: 'SAILLANT', theme: 'angles', niveau: 2, def: 'Mesure moins de cent quatre-vingts degrés.' },
    { mot: 'RENTRANT', theme: 'angles', niveau: 2, def: 'Mesure plus de cent quatre-vingts degrés : il rentre vers l\'intérieur.' },
    { mot: 'ADJACENTS', theme: 'angles', niveau: 2, def: 'Côte à côte : même sommet, un côté commun, et pas de recouvrement.' },
    { mot: 'OPPOSES', theme: 'angles', niveau: 2, def: 'De part et d\'autre du point où deux droites se croisent ; ils sont égaux.' },
    { mot: 'COMPLEMENTAIRES', theme: 'angles', niveau: 3, def: 'Ensemble, ils font un angle droit.' },
    { mot: 'SUPPLEMENTAIRES', theme: 'angles', niveau: 3, def: 'Ensemble, ils font un angle plat.' },
    { mot: 'ALTERNES', theme: 'angles', niveau: 3, def: 'De part et d\'autre de la sécante, et de deux droites différentes.' },
    { mot: 'CORRESPONDANTS', theme: 'angles', niveau: 3, def: 'Du même côté de la sécante, à la même place sur chaque droite.' },
    { mot: 'SECANTE', theme: 'angles', niveau: 3, def: 'La droite qui coupe les deux autres.' },
    { mot: 'CODAGE', theme: 'angles', niveau: 2, def: 'Le petit arc, ou le petit carré, qui marque un angle sur la figure.' },

    // --- Les opérations ---
    // « Ou mot croisé sur le vocabulaire des opérations. » Le nom du calcul,
    // le nom de son résultat, et le nom de ce qu'on y met : trois choses
    // différentes qu'on mélange constamment.
    { mot: 'ADDITION', theme: 'calcul', niveau: 1, def: 'L\'opération qui met ensemble : son signe est le plus.' },
    { mot: 'SOUSTRACTION', theme: 'calcul', niveau: 1, def: 'L\'opération qui retire : son signe est le moins.' },
    { mot: 'MULTIPLICATION', theme: 'calcul', niveau: 1, def: 'L\'opération qui répète : son signe est la croix.' },
    { mot: 'DIVISION', theme: 'calcul', niveau: 1, def: 'L\'opération qui partage en parts égales.' },
    { mot: 'DIVIDENDE', theme: 'calcul', niveau: 2, def: 'Le nombre que l\'on partage dans une division.' },
    { mot: 'RETENUE', theme: 'calcul', niveau: 1, def: 'Le petit chiffre qu\'on reporte sur la colonne d\'à côté.' },
    { mot: 'DECOMPOSER', theme: 'calcul', niveau: 2, def: 'Réécrire un nombre comme un produit ou une somme plus simple.' },
    { mot: 'PUISSANCE', theme: 'calcul', niveau: 3, def: 'Écriture courte d\'un produit de facteurs tous égaux.' },
    { mot: 'EXPOSANT', theme: 'calcul', niveau: 3, def: 'Le petit nombre en haut à droite : il dit combien de fois on multiplie.' },
    { mot: 'RACINE', theme: 'calcul', niveau: 3, def: 'L\'opération qui revient du carré à la longueur.' },
    { mot: 'POURCENTAGE', theme: 'calcul', niveau: 3, def: 'Une proportion écrite sur cent.' },

    // --- Grandeurs et mesures ---
    { mot: 'PERIMETRE', theme: 'mesures', niveau: 1, def: 'La longueur du tour d\'une figure.' },
    { mot: 'AIRE', theme: 'mesures', niveau: 1, def: 'La mesure de la surface : le nombre de carreaux dedans.' },
    { mot: 'VOLUME', theme: 'mesures', niveau: 2, def: 'La place occupée dans l\'espace.' },
    { mot: 'LONGUEUR', theme: 'mesures', niveau: 1, def: 'Se mesure en mètres, en centimètres…' },
    { mot: 'MASSE', theme: 'mesures', niveau: 1, def: 'Se mesure en grammes et en kilogrammes.' },
    { mot: 'DUREE', theme: 'mesures', niveau: 1, def: 'Le temps écoulé entre deux instants.' },
    { mot: 'MINUTE', theme: 'mesures', niveau: 1, def: 'Soixante secondes.' },
    { mot: 'DEGRE', theme: 'mesures', niveau: 2, aussi: ['angles'], def: 'L\'unité qui mesure les angles.' },
    { mot: 'LITRE', theme: 'mesures', niveau: 1, def: 'L\'unité des contenances.' },
    { mot: 'RAPPORTEUR', theme: 'mesures', niveau: 2, aussi: ['angles'], def: 'L\'instrument demi-rond qui mesure les angles.' },
    { mot: 'ECHELLE', theme: 'mesures', niveau: 3, def: 'Le rapport entre le dessin et la réalité.' },
    { mot: 'VITESSE', theme: 'mesures', niveau: 3, def: 'La distance parcourue en un temps donné.' },

    // --- Le calcul littéral ---
    // Rémy a fabriqué à la main un mot codé sur ce chapitre : INCONNUE,
    // NUMÉRIQUE, LETTRES, SOMME, DÉVELOPPER, ÉCRITURE, NOMBRE, EXPRESSION,
    // ADDITION, CALCUL, LITTÉRALE, DIVISER. Le lexique lui manquait ; il ne
    // manque plus.
    { mot: 'EXPRESSION', theme: 'litteral', niveau: 3, def: 'Une suite de nombres, de lettres et d\'opérations.' },
    { mot: 'LITTERALE', theme: 'litteral', niveau: 3, def: 'Se dit d\'un calcul où des lettres remplacent des nombres.' },
    { mot: 'NUMERIQUE', theme: 'litteral', niveau: 3, def: 'Se dit d\'un calcul qui ne contient que des nombres.' },
    { mot: 'INCONNUE', theme: 'litteral', niveau: 3, def: 'La lettre dont on cherche la valeur.' },
    { mot: 'VARIABLE', theme: 'litteral', niveau: 3, def: 'Une lettre qui peut prendre plusieurs valeurs.' },
    { mot: 'DEVELOPPER', theme: 'litteral', niveau: 3, def: 'Transformer un produit en somme, en enlevant les parenthèses.' },
    { mot: 'FACTORISER', theme: 'litteral', niveau: 3, def: 'Transformer une somme en produit, en mettant en facteur.' },
    { mot: 'REDUIRE', theme: 'litteral', niveau: 3, def: 'Regrouper ce qui va ensemble pour raccourcir l\'écriture.' },
    { mot: 'SIMPLIFIER', theme: 'litteral', niveau: 3, def: 'Écrire la même chose, en plus court.' },
    { mot: 'SUBSTITUER', theme: 'litteral', niveau: 3, def: 'Remplacer la lettre par la valeur qu\'on lui donne.' },
    { mot: 'COEFFICIENT', theme: 'litteral', niveau: 3, def: 'Le nombre écrit devant la lettre.' },
    { mot: 'EQUATION', theme: 'litteral', niveau: 3, def: 'Une égalité où il faut retrouver la valeur de la lettre.' },
    { mot: 'SOLUTION', theme: 'litteral', niveau: 3, def: 'La valeur qui rend l\'égalité vraie.' },
    { mot: 'IDENTITE', theme: 'litteral', niveau: 3, def: 'Une égalité vraie quelle que soit la valeur de la lettre.' },
    { mot: 'PROGRAMME', theme: 'litteral', niveau: 2, def: 'Une suite d\'instructions de calcul, à appliquer à un nombre.' },
    { mot: 'CALCUL', theme: 'litteral', niveau: 1, aussi: ['calcul'], def: 'Ce qu\'on fait avec des nombres pour trouver un résultat.' },
    { mot: 'LETTRES', theme: 'litteral', niveau: 2, def: 'Ce qui remplace les nombres qu\'on ne connaît pas.' },
    { mot: 'NOMBRE', theme: 'litteral', niveau: 1, aussi: ['nombres'], def: 'Ce qui dit une quantité.' },
    { mot: 'ECRITURE', theme: 'litteral', niveau: 2, def: 'La façon de noter un calcul ou un nombre.' },
    { mot: 'DIVISER', theme: 'litteral', niveau: 1, aussi: ['calcul'], def: 'Partager en parts égales.' },
    { mot: 'MULTIPLIER', theme: 'litteral', niveau: 1, aussi: ['calcul'], def: 'Répéter une addition du même nombre.' },
    { mot: 'SOUSTRAIRE', theme: 'litteral', niveau: 1, aussi: ['calcul'], def: 'Retirer une quantité d\'une autre.' },
    { mot: 'DISTRIBUER', theme: 'litteral', niveau: 3, def: 'Multiplier le facteur par CHAQUE terme de la parenthèse.' },
    { mot: 'POSITIF', theme: 'nombres', niveau: 3, def: 'Plus grand que zéro : il est à sa droite sur la droite graduée.' },
    { mot: 'SIGNE', theme: 'nombres', niveau: 3, def: 'Le plus ou le moins écrit devant un nombre relatif.' },
    { mot: 'ABSCISSE', theme: 'nombres', niveau: 3, def: 'Le nombre qui repère un point sur une droite graduée.' },

    // --- LES NOMBRES ÉCRITS EN TOUTES LETTRES : des bouchons, pas du lexique.
    // Rémy s'en sert exactement pour cela dans sa grille — DEUX, TROIS, CINQ,
    // SEPT, TRENTE bouchent les bandes courtes de l'anneau, celles de quatre ou
    // cinq cases où aucun mot de vocabulaire ne rentre. Ils ne sont PAS du
    // vocabulaire à faire découvrir : `bouchon` les tient hors des mots cachés
    // et des mots croisés, où « trouve QUARANTE » ne serait pas une leçon.
    { mot: 'DIX', theme: 'nombres', niveau: 1, bouchon: true, def: 'Le nombre 10, en toutes lettres.' },
    { mot: 'SIX', theme: 'nombres', niveau: 1, bouchon: true, def: 'Le nombre 6, en toutes lettres.' },
    { mot: 'DEUX', theme: 'nombres', niveau: 1, bouchon: true, def: 'Le nombre 2, en toutes lettres.' },
    { mot: 'CINQ', theme: 'nombres', niveau: 1, bouchon: true, def: 'Le nombre 5, en toutes lettres.' },
    { mot: 'SEPT', theme: 'nombres', niveau: 1, bouchon: true, def: 'Le nombre 7, en toutes lettres.' },
    { mot: 'HUIT', theme: 'nombres', niveau: 1, bouchon: true, def: 'Le nombre 8, en toutes lettres.' },
    { mot: 'NEUF', theme: 'nombres', niveau: 1, bouchon: true, def: 'Le nombre 9, en toutes lettres.' },
    { mot: 'ONZE', theme: 'nombres', niveau: 1, bouchon: true, def: 'Le nombre 11, en toutes lettres.' },
    { mot: 'CENT', theme: 'nombres', niveau: 1, bouchon: true, def: 'Le nombre 100, en toutes lettres.' },
    { mot: 'ZERO', theme: 'nombres', niveau: 1, bouchon: true, def: 'Le nombre 0, en toutes lettres.' },
    { mot: 'TROIS', theme: 'nombres', niveau: 1, bouchon: true, def: 'Le nombre 3, en toutes lettres.' },
    { mot: 'QUATRE', theme: 'nombres', niveau: 1, bouchon: true, def: 'Le nombre 4, en toutes lettres.' },
    { mot: 'DOUZE', theme: 'nombres', niveau: 1, bouchon: true, def: 'Le nombre 12, en toutes lettres.' },
    { mot: 'SEIZE', theme: 'nombres', niveau: 1, bouchon: true, def: 'Le nombre 16, en toutes lettres.' },
    { mot: 'VINGT', theme: 'nombres', niveau: 1, bouchon: true, def: 'Le nombre 20, en toutes lettres.' },
    { mot: 'MILLE', theme: 'nombres', niveau: 1, bouchon: true, def: 'Le nombre 1 000, en toutes lettres.' },
    { mot: 'TREIZE', theme: 'nombres', niveau: 1, bouchon: true, def: 'Le nombre 13, en toutes lettres.' },
    { mot: 'QUINZE', theme: 'nombres', niveau: 1, bouchon: true, def: 'Le nombre 15, en toutes lettres.' },
    { mot: 'TRENTE', theme: 'nombres', niveau: 1, bouchon: true, def: 'Le nombre 30, en toutes lettres.' },
    { mot: 'QUATORZE', theme: 'nombres', niveau: 1, bouchon: true, def: 'Le nombre 14, en toutes lettres.' },
    { mot: 'DIXSEPT', theme: 'nombres', niveau: 1, bouchon: true, def: 'Le nombre 17, en toutes lettres.' },
    { mot: 'SOIXANTE', theme: 'nombres', niveau: 1, bouchon: true, def: 'Le nombre 60, en toutes lettres.' },
    { mot: 'QUARANTE', theme: 'nombres', niveau: 1, bouchon: true, def: 'Le nombre 40, en toutes lettres.' },
    { mot: 'MILLIARD', theme: 'nombres', niveau: 1, bouchon: true, def: 'Le nombre 1 000 000 000, en toutes lettres.' },
    { mot: 'CINQUANTE', theme: 'nombres', niveau: 1, bouchon: true, def: 'Le nombre 50, en toutes lettres.' },
    { mot: 'DIXHUIT', theme: 'nombres', niveau: 1, bouchon: true, def: 'Le nombre 18, en toutes lettres.' },
    { mot: 'MILLION', theme: 'nombres', niveau: 1, bouchon: true, def: 'Le nombre 1 000 000, en toutes lettres.' }
];

export const THEMES = {
    tout: 'Tout le vocabulaire',
    geometrie: 'Géométrie',
    angles: 'Le vocabulaire des angles',
    nombres: 'Les nombres',
    calcul: 'Les opérations',
    litteral: 'Le calcul littéral',
    mesures: 'Grandeurs et mesures'
};

/**
 * Les mots disponibles pour un thème et un niveau donnés.
 *
 * UN MOT PEUT APPARTENIR À DEUX RUBRIQUES sans être écrit deux fois. Le
 * rapporteur est un instrument de mesure ET du vocabulaire des angles ; la
 * bissectrice est de la géométrie ET des angles. Les inscrire deux fois les
 * ferait sortir en double dès qu'on demande « tout le vocabulaire » — une
 * grille de mots cachés avec deux fois BISSECTRICE, ou un mot croisé qui se
 * croise avec lui-même. `aussi` porte donc les rubriques secondaires.
 */
export function motsDisponibles({ theme = 'tout', niveauMax = 3, bouchons = false } = {}) {
    return LEXIQUE.filter(m => m.niveau <= niveauMax
        // LES BOUCHONS NE SORTENT QUE SI ON LES DEMANDE. Les nombres écrits en
        // toutes lettres remplissent les bandes courtes d'un mot codé ; ils
        // n'ont rien à faire dans une grille de mots cachés, où « trouve
        // QUARANTE » n'apprend rien à personne.
        && (bouchons || !m.bouchon)
        && (theme === 'tout' || m.theme === theme || (m.aussi || []).includes(theme)));
}

/**
 * Les mots d'UNE grille : un tirage, pas tout le lexique.
 *
 * `creerGrille` pose les mots les plus longs d'abord — c'est la bonne règle,
 * un « PERPENDICULAIRE » ne rentre plus dans une grille déjà garnie — mais si
 * on lui donne le lexique entier, il s'arrête au dixième mot posé : ce sont
 * toujours les dix mots les plus longs, et ni CARRE, ni RAYON, ni SOMME ne
 * paraissent jamais. On tire donc d'abord, on place ensuite.
 *
 * Quelques mots de rab : certains ne rentreront pas, et une grille à sept mots
 * quand on en demandait dix se remarque.
 */
export function tirerMots({ theme = 'tout', niveauMax = 3, nbMots = 10, rng } = {}) {
    const dispo = motsDisponibles({ theme, niveauMax });
    return (rng ? rng.shuffle(dispo) : dispo).slice(0, nbMots + 5);
}

const cle = (x, y) => `${x},${y}`;

/** Les cases qu'occuperait ce mot, ou null si ça ne passe pas. */
function essayer(cases, taille, mot, x, y, dir) {
    const out = [];
    for (let i = 0; i < mot.length; i++) {
        const cx = x + dir.dx * i, cy = y + dir.dy * i;
        if (cx < 0 || cy < 0 || cx >= taille || cy >= taille) return null;
        const dejaLa = cases[cle(cx, cy)];
        // Une case déjà occupée ne convient que si c'est LA MÊME lettre : c'est
        // toute la différence entre une grille croisée et un empilement.
        if (dejaLa && dejaLa !== mot[i]) return null;
        out.push({ x: cx, y: cy, lettre: mot[i] });
    }
    return out;
}

/**
 * Construit une grille.
 *
 * @param {Object} o
 * @param {number} o.taille       - côté de la grille
 * @param {Array}  o.mots         - entrées du lexique, dans l'ordre de préférence
 * @param {number} o.nbMots       - combien en placer au maximum
 * @param {Object} o.rng          - le tirage du projet (makeRng), pour des grilles rejouables
 * @param {boolean} [o.diagonales] - autoriser les diagonales
 * @param {boolean} [o.envers]     - autoriser les mots écrits à l'envers
 */
export function creerGrille({ taille = 12, mots = [], nbMots = 10, rng = makeRng(), diagonales = true, envers = false }) {
    const dirs = DIRECTIONS.filter(d =>
        (diagonales || d.dx === 0 || d.dy === 0) &&
        (envers || (d.dx >= 0 && d.dy >= 0) || (d.dx === 1 && d.dy === -1)));

    const cases = {};
    const places = [];
    // COMBIEN DE FOIS CHAQUE SENS A SERVI. Sans ce compte, une grille sur
    // quatre sortait avec ses dix mots dans le même sens : le croisement est
    // rare (il faut la même lettre au point de rencontre), donc la plupart des
    // candidats valent zéro, et le hasard suit alors le sens qui offre le plus
    // de positions. Une grille où tout se lit de gauche à droite n'est plus un
    // mot caché, c'est une liste.
    const usages = {};
    const cleDir = (d) => `${d.dx},${d.dy}`;
    // Les mots longs d'abord : placer « PERPENDICULAIRE » en dernier dans une
    // grille déjà pleine échoue presque toujours, et c'est justement le mot
    // qu'on voulait faire lire.
    const candidats = mots.filter(m => m.mot.length <= taille)
        .sort((a, b) => b.mot.length - a.mot.length);

    for (const entree of candidats) {
        if (places.length >= nbMots) break;

        // On ne prend pas la PREMIÈRE position libre : on en récolte plusieurs
        // et on préfère celles qui CROISENT un mot déjà posé. Sans ce tri, le
        // hasard tombe presque toujours sur des cases vides — on obtient des
        // mots posés côte à côte, repérables d'un coup d'œil, et une grille qui
        // n'a de mots cachés que le nom. Le croisement est ce qui oblige à
        // vraiment lire les lettres.
        // LES SENS LES MOINS SERVIS SONT ESSAYÉS EN PREMIER. Trier au moment
        // du choix ne suffisait pas : quand le meilleur croisement n'existe
        // que dans un seul sens, c'est ce sens qui gagne, et de proche en
        // proche toute la grille bascule. En tirant les positions dans les
        // sens rares, on récolte des candidats à départager.
        const moindre = Math.min(...dirs.map(d => usages[cleDir(d)] || 0));
        const rares = dirs.filter(d => (usages[cleDir(d)] || 0) === moindre);
        const trouvees = [];
        for (let essai = 0; essai < 260 && trouvees.length < 24; essai++) {
            // Les deux tiers des essais dans les sens rares, le reste partout :
            // un mot qui ne rentre QUE dans le sens déjà servi doit pouvoir y
            // rentrer quand même, plutôt que d'être abandonné.
            const dir = rng.pick(essai % 3 === 2 ? dirs : rares);
            const x = rng.int(0, taille - 1);
            const y = rng.int(0, taille - 1);
            const cellules = essayer(cases, taille, entree.mot, x, y, dir);
            if (!cellules) continue;
            // On refuse un mot posé exactement sur un autre déjà placé.
            if (places.some(p => p.x === x && p.y === y && p.dx === dir.dx && p.dy === dir.dy)) continue;
            const croisements = cellules.filter(c => cases[cle(c.x, c.y)]).length;
            trouvees.push({ cellules, x, y, dir, croisements });
        }
        if (!trouvees.length) continue;
        const meilleur = Math.max(...trouvees.map(t => t.croisements));
        const bonnes = trouvees.filter(t => t.croisements === meilleur);
        // À CROISEMENTS ÉGAUX, LE SENS LE MOINS SERVI. Le croisement reste
        // prioritaire — c'est lui qui fait la grille — mais entre deux
        // placements aussi bons, on varie.
        const rare = Math.min(...bonnes.map(t => usages[cleDir(t.dir)] || 0));
        const variees = bonnes.filter(t => (usages[cleDir(t.dir)] || 0) === rare);
        const pose = variees[rng.int(0, variees.length - 1)];
        usages[cleDir(pose.dir)] = (usages[cleDir(pose.dir)] || 0) + 1;
        pose.cellules.forEach(c => { cases[cle(c.x, c.y)] = c.lettre; });
        places.push({
            mot: entree.mot, def: entree.def, theme: entree.theme,
            x: pose.x, y: pose.y, dx: pose.dir.dx, dy: pose.dir.dy,
            longueur: entree.mot.length, direction: pose.dir.nom
        });
    }

    // Le remplissage : des lettres au hasard, mais tirées d'un alphabet qui
    // sur-représente les voyelles — sans quoi la grille est un mur de
    // consonnes où les mots se repèrent à l'œil sans être cherchés.
    const grille = [];
    // COMBIEN DE LETTRES SONT DU BRUIT. Rémy le veut écrit sur la feuille : dans
    // une grille serrée, savoir qu'il ne reste que douze lettres au hasard
    // change la façon de chercher — on sait que presque tout ce qu'on voit fait
    // partie d'un mot. C'est une information de jeu, pas une statistique.
    let aleatoires = 0;
    for (let y = 0; y < taille; y++) {
        const ligne = [];
        for (let x = 0; x < taille; x++) {
            const posee = cases[cle(x, y)];
            if (!posee) aleatoires++;
            ligne.push(posee || rng.pick(ALPHABET));
        }
        grille.push(ligne);
    }

    return {
        taille, grille, aleatoires,
        mots: places.sort((a, b) => a.mot.localeCompare(b.mot))
    };
}

/**
 * LA PLUS PETITE GRILLE QUI TIENNE LES MOTS.
 *
 * Rémy : « option grille la plus petite possible ». Seize sur seize pour huit
 * mots courts, c'est deux cents lettres au hasard autour de quarante lettres
 * utiles : on cherche une aiguille dans une meule de foin qu'on a soi-même
 * construite. On essaie donc les tailles en montant et l'on s'arrête à la
 * première qui les place TOUS — celle où la grille est pleine de mots, ce qui
 * est aussi la plus difficile à lire, et la plus intéressante.
 */
export function grilleLaPlusPetite(opts) {
    const mots = opts.mots || [];
    const voulus = Math.min(Number(opts.nbMots) || mots.length, mots.length);
    const plancher = Math.max(6, ...mots.slice(0, voulus).map(m => m.mot.length));
    let secours = null;
    for (let n = plancher; n <= 16; n++) {
        // TROIS ESSAIS PAR TAILLE. Le placement est aléatoire : une grille de
        // dix qui échoue une fois peut réussir à la deuxième, et se rabattre
        // sur douze pour un seul mauvais tirage, ce sont cent lettres de bruit
        // en plus. La graine est REJOUÉE à chaque essai — sans cela, deux
        // essais de suite consommeraient le même flux et la grille retenue ne
        // serait pas celle qu'on vient de mesurer.
        for (let essai = 0; essai < 3; essai++) {
            const g = creerGrille({
                ...opts, taille: n, rng: makeRng(`${opts.graine || 'auto'}-${n}-${essai}`)
            });
            if (g.mots.length >= voulus) return g;
            if (!secours || g.mots.length > secours.mots.length) secours = g;
        }
    }
    return secours || creerGrille({ ...opts, taille: 16 });
}

/** Les cases traversées par un glissement, si la ligne est droite. */
export function segment(x1, y1, x2, y2) {
    const dx = Math.sign(x2 - x1), dy = Math.sign(y2 - y1);
    const lx = Math.abs(x2 - x1), ly = Math.abs(y2 - y1);
    // Seules les huit directions comptent : horizontale, verticale, diagonale
    // à 45°. Tout le reste n'est pas une sélection, c'est un geste raté.
    if (lx !== ly && lx !== 0 && ly !== 0) return null;
    const n = Math.max(lx, ly);
    const out = [];
    for (let i = 0; i <= n; i++) out.push({ x: x1 + dx * i, y: y1 + dy * i });
    return out;
}

/** Le mot lu le long d'un segment. */
export function lire(etat, cases) {
    return cases.map(c => etat.grille[c.y][c.x]).join('');
}

/**
 * Le glissement désigne-t-il un mot de la liste ? On accepte les deux sens de
 * lecture : l'élève qui repère « ETNEIUQO » a bien trouvé QUOTIENT, et lui
 * refuser parce qu'il a glissé de droite à gauche n'apprendrait rien.
 */
export function motTrouve(etat, cases) {
    if (!cases || cases.length < 2) return null;
    const lu = lire(etat, cases);
    const envers = [...lu].reverse().join('');
    return etat.mots.find(m => m.mot === lu || m.mot === envers) || null;
}

export function toutTrouve(etat, trouves) {
    return etat.mots.every(m => trouves.includes(m.mot));
}
