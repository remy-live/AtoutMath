// LE LEXIQUE DE LA PYRAMIDE — des mots qui s'emboîtent.
//
// Rémy : « Deux jeux dans ces styles », avec la page de son « Coin des jeux
// mathématiques » : une pyramide où « à chaque ligne, tu rajoutes une lettre
// pour faire un nouveau mot », et où « les lettres peuvent être mélangées ».
//
// CE N'EST PAS UNE LISTE DE VOCABULAIRE, C'EST UN GRAPHE. Un mot de n + 1
// lettres est le fils d'un mot de n lettres quand il a exactement ses lettres,
// plus une. O → ON → NOM → MONT → MONTE → MONTRE. Le noyau (core/pyramide.js)
// explore ce graphe et fabrique les pyramides tout seul : on n'écrit pas ici
// des pyramides, on écrit les BARREAUX, et toutes celles qu'ils permettent
// existent d'un coup.
//
// POURQUOI DU VOCABULAIRE GÉNÉRAL, ET NON CELUI DES MATHS. On aurait aimé une
// pyramide ANGLE → … : elle n'existe pas. La contrainte est terrible — il faut
// un mot à chaque longueur, et chacun anagramme du précédent —, et le lexique
// des mathématiques est bien trop petit pour la satisfaire. La pyramide de
// Rémy est d'ailleurs elle-même en français courant (RAYON y arrive par
// hasard, entre NOYA et CRAYON). C'est un jeu de lettres dans une revue de
// maths, et c'est très bien ainsi : ce qu'il travaille, c'est l'anagramme —
// donc le dénombrement des arrangements, qu'on retrouvera en troisième.
//
// LES MOTS SONT EN MAJUSCULES SANS ACCENT. C'est ce que l'élève écrit dans les
// cases, et c'est ce qui permet de comparer des lettres sans se demander si É
// et E sont la même. La définition, elle, est en français normal.
//
// LES DÉFINITIONS SE LISENT SANS LE MOT. « Elle donne l'heure » et non « une
// montre est un objet qui… » : c'est une devinette, pas un dictionnaire.

/** @typedef {{mot: string, def: string}} MotPyramide */

/** @type {MotPyramide[]} */
export const LEXIQUE_PYRAMIDE = [
    // --- Deux lettres ---------------------------------------------------------
    { mot: 'AS', def: 'La plus forte carte du jeu.' },
    { mot: 'AN', def: 'Douze mois.' },
    { mot: 'ON', def: 'Pronom indéfini.' },
    { mot: 'OR', def: 'Le métal jaune et précieux.' },
    { mot: 'DO', def: 'Note de musique.' },
    { mot: 'SE', def: 'Pronom : il … lave.' },
    { mot: 'ET', def: 'Petit mot qui relie deux choses.' },
    { mot: 'EN', def: 'Il vit … France.' },
    { mot: 'IL', def: 'Pronom : … court.' },
    { mot: 'SI', def: 'La septième note de la gamme.' },
    { mot: 'TA', def: 'À toi : … règle.' },
    { mot: 'MA', def: 'À moi : … gomme.' },
    { mot: 'OS', def: 'On en a plus de deux cents dans le corps.' },
    { mot: 'RE', def: 'La note juste après le do.' },
    { mot: 'UN', def: 'Le premier des nombres entiers.' },
    { mot: 'LE', def: 'Article défini masculin.' },
    { mot: 'DU', def: 'Il vient … marché.' },
    { mot: 'NE', def: 'Il … dort pas.' },

    // --- Trois lettres --------------------------------------------------------
    { mot: 'SAC', def: 'On y met ses affaires pour partir.' },
    { mot: 'NOM', def: 'Ce qui te désigne, avec ton prénom.' },
    { mot: 'NOA', def: 'Prénom masculin.' },
    { mot: 'ODE', def: 'Poème lyrique.' },
    { mot: 'SEL', def: 'On en met dans l’eau des pâtes.' },
    { mot: 'LIT', def: 'Pour dormir.' },
    { mot: 'ART', def: 'La peinture, la musique, la danse…' },
    { mot: 'SOL', def: 'Ce sur quoi on marche — et une note.' },
    { mot: 'MAL', def: 'Le contraire du bien.' },
    { mot: 'MER', def: 'Grande étendue d’eau salée.' },
    { mot: 'ROI', def: 'Il porte une couronne.' },
    { mot: 'SOI', def: 'Chacun pour …' },
    { mot: 'TES', def: 'À toi : … cahiers.' },
    { mot: 'ANE', def: 'Il a de longues oreilles et il est têtu.' },
    { mot: 'NEZ', def: 'Au milieu du visage.' },
    { mot: 'NUL', def: 'Un score de zéro à zéro : un match …' },
    { mot: 'EAU', def: 'On la boit, et elle bout à 100 °C.' },
    { mot: 'AMI', def: 'On l’invite à son anniversaire.' },
    { mot: 'TAS', def: 'Un gros paquet en désordre.' },
    { mot: 'CAS', def: 'Une situation, un exemple à étudier.' },
    { mot: 'ILE', def: 'Une terre entourée d’eau.' },
    { mot: 'DUR', def: 'Le contraire de mou.' },
    { mot: 'ELU', def: 'Choisi par un vote.' },
    { mot: 'MUR', def: 'Il sépare deux pièces.' },
    { mot: 'RUE', def: 'On y marche, entre les maisons.' },
    { mot: 'SUD', def: 'Le contraire du nord.' },

    // --- Quatre lettres -------------------------------------------------------
    { mot: 'CASE', def: 'Un carré du quadrillage.' },
    { mot: 'MONT', def: 'Une montagne.' },
    { mot: 'CODE', def: 'Pour ouvrir un cadenas.' },
    { mot: 'ILES', def: 'Des terres entourées d’eau.' },
    { mot: 'LITS', def: 'Il y en a deux dans la chambre.' },
    { mot: 'RATS', def: 'Ils rongent tout dans la cave.' },
    { mot: 'SOLE', def: 'Un poisson tout plat.' },
    { mot: 'LAME', def: 'Le tranchant du couteau.' },
    { mot: 'ZONE', def: 'Une région, une portion d’espace.' },
    { mot: 'LAIT', def: 'Blanc, il vient de la vache.' },
    { mot: 'SOIR', def: 'Après l’après-midi.' },
    { mot: 'ANSE', def: 'La poignée du panier.' },
    { mot: 'TRES', def: 'Beaucoup : il est … grand.' },
    { mot: 'MERE', def: 'Elle est la maman.' },
    { mot: 'LUNE', def: 'Elle tourne autour de la Terre.' },
    { mot: 'NOYA', def: 'Verbe se noyer, au passé simple.' },
    { mot: 'AIRE', def: 'La mesure d’une surface.' },
    { mot: 'NOTE', def: 'Do, ré, mi… ou le résultat du contrôle.' },
    { mot: 'ROSE', def: 'Une fleur à épines, et une couleur.' },
    { mot: 'AILE', def: 'L’oiseau en a deux.' },
    { mot: 'MOTS', def: 'On en met bout à bout pour faire une phrase.' },
    { mot: 'CODES', def: 'Plusieurs suites secrètes de chiffres.' },

    // --- Cinq lettres ---------------------------------------------------------
    { mot: 'CASER', def: 'Ranger, mettre à sa place.' },
    { mot: 'MONTE', def: 'Il grimpe l’escalier : il …' },
    { mot: 'CORDE', def: 'Elle relie deux points d’un cercle.' },
    { mot: 'PILES', def: 'Elles donnent du courant à la télécommande.' },
    { mot: 'LISTE', def: 'Une énumération, l’une sous l’autre.' },
    { mot: 'ASTRE', def: 'Une étoile, un corps du ciel.' },
    { mot: 'SOCLE', def: 'Le support sur lequel pose la statue.' },
    { mot: 'LAMES', def: 'Les tranchants des couteaux.' },
    { mot: 'LATIN', def: 'La langue des Romains.' },
    { mot: 'SORTI', def: 'Il est … de la maison.' },
    { mot: 'SANTE', def: 'Le médecin s’en occupe.' },
    { mot: 'RITES', def: 'Des cérémonies qu’on répète.' },
    { mot: 'TERME', def: 'Chaque nombre d’une somme.' },
    { mot: 'RAYON', def: 'Moitié d’un diamètre.' },
    { mot: 'CORDES', def: 'Le violon en a quatre.' },

    // --- Six lettres ----------------------------------------------------------
    { mot: 'CARTES', def: 'Il y en a cinquante-deux dans le jeu.' },
    { mot: 'MONTRE', def: 'Elle donne l’heure au poignet.' },
    { mot: 'DECORS', def: 'Les paysages peints du théâtre.' },
    { mot: 'SIMPLE', def: 'Pas compliqué du tout.' },
    { mot: 'TOILES', def: 'Les tableaux du peintre.' },
    { mot: 'ANTRES', def: 'Des cavernes, des repaires.' },
    { mot: 'CLONES', def: 'Des copies parfaitement identiques.' },
    { mot: 'CALMES', def: 'Tranquilles, sans agitation.' },
    { mot: 'SORTIE', def: 'La porte par où l’on s’en va.' },
    { mot: 'TRISTE', def: 'Le contraire de gai.' },
    { mot: 'METIER', def: 'Le travail qu’on fait pour vivre.' },
    { mot: 'CRAYON', def: 'Il te sert maintenant.' },

    // --- Sept lettres ---------------------------------------------------------
    // Le sommet de la plus haute pyramide. Il en faut peu : à ce niveau, chaque
    // mot est atteint par une dizaine de chemins différents.
    { mot: 'ETOILES', def: 'Elles brillent la nuit.' },
    { mot: 'PARENTS', def: 'Ton père et ta mère.' },
    { mot: 'CRAYONS', def: 'Ceux de la trousse.' },
    { mot: 'METIERS', def: 'Les professions.' },
    { mot: 'MONTRES', def: 'Plusieurs pendules de poignet.' }
];
