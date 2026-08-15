// LE LOGIGRAMME — déduire, et n'écrire que ce qu'on a le droit d'écrire.
//
// Quatre enfants, quatre parfums de glace, quatre âges, et une poignée
// d'indices : « Léa n'a pas pris la vanille », « celui qui a pris le chocolat
// a neuf ans ». On remplit une grille de croix et de ronds jusqu'à ce que tout
// soit déterminé. C'est le premier exercice de logique formelle qu'un élève de
// cycle 3 peut mener SEUL de bout en bout, et c'est pour ça qu'il compte : à
// aucun moment on n'a le droit de deviner, et à aucun moment on n'en a besoin.
//
// TROIS EXIGENCES ONT COMMANDÉ TOUT LE MODULE.
//
//   1. UNE SEULE SOLUTION, et atteignable SANS ESSAI-ERREUR. C'est la même
//      exigence : on ajoute des indices tant que la propagation logique ne
//      suffit pas à tout déterminer. Si le solveur y arrive par déduction
//      pure, alors la solution est unique — et un élève peut la trouver.
//   2. LE MINIMUM D'INDICES. Une fois le puzzle résoluble, on retire un à un
//      les indices dont on peut se passer. Un indice de trop, c'est une
//      déduction volée à l'élève.
//   3. AUCUN ÉNONCÉ GLAUQUE. Pas de vol, pas de disparition, pas d'enquête
//      policière — les thèmes sont un goûter, une médiathèque, un potager. Un
//      exercice de logique n'a pas besoin d'un cadavre pour être intéressant,
//      et une classe de sixième n'a pas besoin qu'on le lui raconte.
//
// Le solveur rend aussi le JOURNAL de ses déductions, dans l'ordre, avec la
// raison de chacune : c'est lui qui permet au robot d'expliquer, et à l'élève
// bloqué de recevoir l'indication suivante — pas la réponse, la déduction.

// --- Les thèmes -------------------------------------------------------------
//
// Une catégorie porte de quoi écrire des phrases correctes : le verbe à
// l'affirmative ET à la négative (le français ne les déduit pas l'un de
// l'autre), et, pour les catégories ordonnées, les comparatifs.

const PRENOMS = ['Léa', 'Tom', 'Inès', 'Noé', 'Jade', 'Malo', 'Zoé', 'Adam'];

export const THEMES = [
    {
        id: 'gouter',
        titre: 'Le goûter d\'anniversaire',
        decor: 'Quatre amis fêtent un anniversaire.',
        sujet: { id: 'enfant', label: 'Enfant', valeurs: PRENOMS },
        attributs: [
            {
                id: 'glace', label: 'Parfum',
                verbe: 'a pris', verbeNeg: 'n\'a pas pris',
                valeurs: ['la glace à la vanille', 'la glace au chocolat', 'la glace à la fraise',
                    'la glace au citron', 'la glace à la pistache'],
                courts: ['vanille', 'chocolat', 'fraise', 'citron', 'pistache']
            },
            {
                id: 'age', label: 'Âge', ordonnee: true,
                verbe: 'a', verbeNeg: 'n\'a pas',
                nombres: [8, 9, 10, 11, 12], unite: 'ans',
                comparatif: { moins: 'est plus jeune que', plus: 'est plus âgé que' },
                ecart: (d) => `a ${d} an${d > 1 ? 's' : ''} de plus que`
            }
        ]
    },
    {
        id: 'mediatheque',
        titre: 'À la médiathèque',
        decor: 'Des élèves empruntent chacun un livre.',
        sujet: { id: 'eleve', label: 'Élève', valeurs: PRENOMS },
        attributs: [
            {
                id: 'livre', label: 'Livre',
                verbe: 'a emprunté', verbeNeg: 'n\'a pas emprunté',
                valeurs: ['le roman', 'la bande dessinée', 'le documentaire',
                    'le recueil de poèmes', 'l\'atlas'],
                courts: ['roman', 'BD', 'documentaire', 'poèmes', 'atlas']
            },
            {
                id: 'pages', label: 'Pages', ordonnee: true,
                verbe: 'a lu', verbeNeg: 'n\'a pas lu',
                nombres: [20, 40, 60, 80, 100], unite: 'pages',
                comparatif: { moins: 'a lu moins de pages que', plus: 'a lu plus de pages que' },
                ecart: (d) => `a lu ${d} pages de plus que`
            }
        ]
    },
    {
        id: 'potager',
        titre: 'Le potager de l\'école',
        decor: 'Chacun s\'occupe d\'une planche du potager.',
        sujet: { id: 'jardinier', label: 'Jardinier', valeurs: PRENOMS },
        attributs: [
            {
                id: 'legume', label: 'Légume',
                verbe: 'cultive', verbeNeg: 'ne cultive pas',
                valeurs: ['des radis', 'des carottes', 'des haricots', 'des courgettes', 'des salades'],
                valeursNeg: ['de radis', 'de carottes', 'de haricots', 'de courgettes', 'de salades'],
                courts: ['radis', 'carottes', 'haricots', 'courgettes', 'salades']
            },
            {
                id: 'plants', label: 'Plants', ordonnee: true,
                verbe: 'a planté', verbeNeg: 'n\'a pas planté',
                nombres: [4, 6, 8, 10, 12], unite: 'plants',
                comparatif: { moins: 'a planté moins que', plus: 'a planté plus que' },
                ecart: (d) => `a planté ${d} plants de plus que`
            }
        ]
    },
    {
        id: 'kermesse',
        titre: 'La kermesse',
        decor: 'Chacun tient un stand de la kermesse.',
        sujet: { id: 'eleve', label: 'Élève', valeurs: PRENOMS },
        attributs: [
            {
                id: 'stand', label: 'Stand',
                verbe: 'tient', verbeNeg: 'ne tient pas',
                valeurs: ['la pêche aux canards', 'le chamboule-tout', 'la barbe à papa',
                    'le stand de maquillage', 'la loterie'],
                courts: ['canards', 'chamboule-tout', 'barbe à papa', 'maquillage', 'loterie']
            },
            {
                id: 'tickets', label: 'Tickets', ordonnee: true,
                verbe: 'a vendu', verbeNeg: 'n\'a pas vendu',
                nombres: [10, 15, 20, 25, 30], unite: 'tickets',
                comparatif: { moins: 'a vendu moins de tickets que', plus: 'a vendu plus de tickets que' },
                ecart: (d) => `a vendu ${d} tickets de plus que`
            }
        ]
    },
    {
        id: 'anniversaire',
        titre: 'Les cadeaux d\'anniversaire',
        decor: 'Chacun a reçu un cadeau et a soufflé ses bougies.',
        sujet: { id: 'enfant', label: 'Enfant', valeurs: PRENOMS },
        attributs: [
            {
                id: 'cadeau', label: 'Cadeau',
                verbe: 'a reçu', verbeNeg: 'n\'a pas reçu',
                valeurs: ['un ballon', 'un puzzle', 'un jeu de cartes', 'une bande dessinée', 'une trottinette'],
                valeursNeg: ['de ballon', 'de puzzle', 'de jeu de cartes', 'de bande dessinée', 'de trottinette'],
                courts: ['ballon', 'puzzle', 'cartes', 'BD', 'trottinette']
            },
            {
                id: 'bougies', label: 'Bougies', ordonnee: true,
                verbe: 'a soufflé', verbeNeg: 'n\'a pas soufflé',
                nombres: [7, 8, 9, 10, 11], unite: 'bougies',
                comparatif: { moins: 'a soufflé moins de bougies que', plus: 'a soufflé plus de bougies que' },
                ecart: (d) => `a soufflé ${d} bougie${d > 1 ? 's' : ''} de plus que`
            }
        ]
    },
    {
        id: 'musique',
        titre: 'L\'école de musique',
        decor: 'Chacun apprend un instrument.',
        sujet: { id: 'eleve', label: 'Élève', valeurs: PRENOMS },
        attributs: [
            {
                id: 'instrument', label: 'Instrument',
                verbe: 'joue', verbeNeg: 'ne joue pas',
                valeurs: ['de la guitare', 'du piano', 'de la flûte', 'du violon', 'de la batterie'],
                valeursNeg: ['de guitare', 'de piano', 'de flûte', 'de violon', 'de batterie'],
                courts: ['guitare', 'piano', 'flûte', 'violon', 'batterie']
            },
            {
                id: 'morceaux', label: 'Morceaux', ordonnee: true,
                verbe: 'a appris', verbeNeg: 'n\'a pas appris',
                nombres: [2, 3, 4, 5, 6], unite: 'morceaux',
                comparatif: { moins: 'a appris moins de morceaux que', plus: 'a appris plus de morceaux que' },
                ecart: (d) => `a appris ${d} morceau${d > 1 ? 'x' : ''} de plus que`
            }
        ]
    },
    {
        id: 'voyage',
        titre: 'La sortie scolaire',
        decor: 'Chacun a visité un endroit différent pendant la sortie.',
        sujet: { id: 'eleve', label: 'Élève', valeurs: PRENOMS },
        attributs: [
            {
                id: 'lieu', label: 'Visite',
                verbe: 'a visité', verbeNeg: 'n\'a pas visité',
                valeurs: ['le musée', 'le château', 'la ferme', 'l\'aquarium', 'l\'observatoire'],
                courts: ['musée', 'château', 'ferme', 'aquarium', 'observatoire']
            },
            {
                id: 'photos', label: 'Photos', ordonnee: true,
                verbe: 'a pris', verbeNeg: 'n\'a pas pris',
                nombres: [5, 10, 15, 20, 25], unite: 'photos',
                comparatif: { moins: 'a pris moins de photos que', plus: 'a pris plus de photos que' },
                ecart: (d) => `a pris ${d} photos de plus que`
            }
        ]
    },
    {
        id: 'boulangerie',
        titre: 'À la boulangerie',
        decor: 'Chacun est reparti avec une viennoiserie.',
        sujet: { id: 'client', label: 'Client', valeurs: PRENOMS },
        attributs: [
            {
                id: 'viennoiserie', label: 'Achat',
                verbe: 'a choisi', verbeNeg: 'n\'a pas choisi',
                valeurs: ['le croissant', 'le pain au chocolat', 'la brioche', 'le chausson aux pommes', 'l\'éclair'],
                courts: ['croissant', 'pain choco', 'brioche', 'chausson', 'éclair']
            },
            {
                id: 'prix', label: 'Prix', ordonnee: true,
                verbe: 'a payé', verbeNeg: 'n\'a pas payé',
                nombres: [1, 2, 3, 4, 5], unite: '€',
                comparatif: { moins: 'a payé moins cher que', plus: 'a payé plus cher que' },
                ecart: (d) => `a payé ${d} € de plus que`
            }
        ]
    },
    {
        id: 'club',
        titre: 'Le club du mercredi',
        decor: 'Chacun s\'est inscrit à une activité.',
        sujet: { id: 'eleve', label: 'Élève', valeurs: PRENOMS },
        attributs: [
            {
                id: 'activite', label: 'Activité',
                verbe: 'fait', verbeNeg: 'ne fait pas',
                valeurs: ['de la natation', 'du judo', 'de l\'escalade', 'du théâtre', 'de la danse'],
                valeursNeg: ['de natation', 'de judo', 'd\'escalade', 'de théâtre', 'de danse'],
                courts: ['natation', 'judo', 'escalade', 'théâtre', 'danse']
            },
            {
                id: 'duree', label: 'Durée', ordonnee: true,
                verbe: 's\'entraîne', verbeNeg: 'ne s\'entraîne pas',
                nombres: [30, 45, 60, 75, 90], unite: 'minutes', prefixe: 'pendant ',
                comparatif: { moins: 's\'entraîne moins longtemps que', plus: 's\'entraîne plus longtemps que' },
                ecart: (d) => `s'entraîne ${d} minutes de plus que`
            }
        ]
    },
    {
        id: 'cantine',
        titre: 'À la cantine',
        decor: 'Chacun a choisi son dessert.',
        sujet: { id: 'eleve', label: 'Élève', valeurs: PRENOMS },
        attributs: [
            {
                id: 'dessert', label: 'Dessert',
                verbe: 'a choisi', verbeNeg: 'n\'a pas choisi',
                valeurs: ['la compote', 'le yaourt', 'la tarte aux pommes', 'la salade de fruits', 'le gâteau au chocolat'],
                courts: ['compote', 'yaourt', 'tarte', 'salade', 'gâteau']
            },
            {
                id: 'attente', label: 'Attente', ordonnee: true,
                verbe: 'a attendu', verbeNeg: 'n\'a pas attendu',
                nombres: [2, 4, 6, 8, 10], unite: 'minutes',
                comparatif: { moins: 'a attendu moins longtemps que', plus: 'a attendu plus longtemps que' },
                ecart: (d) => `a attendu ${d} minutes de plus que`
            }
        ]
    },
    {
        id: 'recreation',
        titre: 'La récréation',
        decor: 'Chacun a occupé la cour à sa façon.',
        sujet: { id: 'eleve', label: 'Élève', valeurs: PRENOMS },
        attributs: [
            {
                id: 'jeu', label: 'Jeu',
                verbe: 'a joué', verbeNeg: 'n\'a pas joué',
                valeurs: ['à la marelle', 'au ballon', 'aux billes', 'à la corde à sauter', 'au loup'],
                courts: ['marelle', 'ballon', 'billes', 'corde', 'loup']
            },
            {
                id: 'parties', label: 'Parties', ordonnee: true,
                verbe: 'a fait', verbeNeg: 'n\'a pas fait',
                nombres: [2, 3, 4, 5, 6], unite: 'parties',
                comparatif: { moins: 'a fait moins de parties que', plus: 'a fait plus de parties que' },
                ecart: (d) => `a fait ${d} partie${d > 1 ? 's' : ''} de plus que`
            }
        ]
    },
    {
        id: 'ferme',
        titre: 'La journée à la ferme',
        decor: 'Chacun s\'est occupé d\'un enclos.',
        sujet: { id: 'eleve', label: 'Élève', valeurs: PRENOMS },
        attributs: [
            {
                id: 'animal', label: 'Animaux',
                verbe: 'a nourri', verbeNeg: 'n\'a pas nourri',
                valeurs: ['les poules', 'les lapins', 'les chèvres', 'les canards', 'les moutons'],
                courts: ['poules', 'lapins', 'chèvres', 'canards', 'moutons']
            },
            {
                id: 'seaux', label: 'Seaux', ordonnee: true,
                verbe: 'a rempli', verbeNeg: 'n\'a pas rempli',
                nombres: [1, 2, 3, 4, 5], unite: 'seaux',
                comparatif: { moins: 'a rempli moins de seaux que', plus: 'a rempli plus de seaux que' },
                ecart: (d) => `a rempli ${d} seau${d > 1 ? 'x' : ''} de plus que`
            }
        ]
    },
    {
        id: 'patisserie',
        titre: 'L\'atelier pâtisserie',
        decor: 'Chacun a préparé une recette.',
        sujet: { id: 'eleve', label: 'Élève', valeurs: PRENOMS },
        attributs: [
            {
                id: 'recette', label: 'Recette',
                verbe: 'a préparé', verbeNeg: 'n\'a pas préparé',
                valeurs: ['le cake au citron', 'les madeleines', 'la tarte aux poires', 'les cookies', 'le flan'],
                valeursNeg: ['de cake au citron', 'de madeleines', 'de tarte aux poires', 'de cookies', 'de flan'],
                courts: ['cake', 'madeleines', 'tarte', 'cookies', 'flan']
            },
            {
                id: 'oeufs', label: 'Œufs', ordonnee: true,
                verbe: 'a cassé', verbeNeg: 'n\'a pas cassé',
                nombres: [2, 3, 4, 5, 6], unite: 'œufs',
                comparatif: { moins: 'a cassé moins d\'œufs que', plus: 'a cassé plus d\'œufs que' },
                ecart: (d) => `a cassé ${d} œuf${d > 1 ? 's' : ''} de plus que`
            }
        ]
    },
    {
        id: 'peinture',
        titre: 'L\'atelier de peinture',
        decor: 'Chacun a peint dans une seule couleur.',
        sujet: { id: 'eleve', label: 'Élève', valeurs: PRENOMS },
        attributs: [
            {
                id: 'couleur', label: 'Couleur',
                verbe: 'a peint', verbeNeg: 'n\'a pas peint',
                valeurs: ['en bleu', 'en rouge', 'en jaune', 'en vert', 'en violet'],
                courts: ['bleu', 'rouge', 'jaune', 'vert', 'violet']
            },
            {
                id: 'pinceaux', label: 'Pinceaux', ordonnee: true,
                verbe: 'a pris', verbeNeg: 'n\'a pas pris',
                nombres: [1, 2, 3, 4, 5], unite: 'pinceaux',
                comparatif: { moins: 'a pris moins de pinceaux que', plus: 'a pris plus de pinceaux que' },
                ecart: (d) => `a pris ${d} pinceau${d > 1 ? 'x' : ''} de plus que`
            }
        ]
    },
    {
        id: 'marche',
        titre: 'Au marché',
        decor: 'Chacun revient avec un panier de fruits.',
        sujet: { id: 'client', label: 'Client', valeurs: PRENOMS },
        attributs: [
            {
                id: 'fruit', label: 'Fruits',
                verbe: 'a acheté', verbeNeg: 'n\'a pas acheté',
                valeurs: ['des pommes', 'des poires', 'des bananes', 'des fraises', 'des cerises'],
                valeursNeg: ['de pommes', 'de poires', 'de bananes', 'de fraises', 'de cerises'],
                courts: ['pommes', 'poires', 'bananes', 'fraises', 'cerises']
            },
            {
                id: 'depense', label: 'Dépense', ordonnee: true,
                verbe: 'a dépensé', verbeNeg: 'n\'a pas dépensé',
                nombres: [2, 3, 4, 5, 6], unite: '€',
                comparatif: { moins: 'a dépensé moins que', plus: 'a dépensé plus que' },
                ecart: (d) => `a dépensé ${d} € de plus que`
            }
        ]
    },
    {
        id: 'plage',
        titre: 'Au bord de la mer',
        decor: 'Chacun rentre avec ce qu\'il a trouvé sur la plage.',
        sujet: { id: 'enfant', label: 'Enfant', valeurs: PRENOMS },
        attributs: [
            {
                id: 'trouvaille', label: 'Trouvaille',
                verbe: 'a ramassé', verbeNeg: 'n\'a pas ramassé',
                valeurs: ['des coquillages', 'des galets', 'des étoiles de mer', 'du bois flotté', 'des algues'],
                valeursNeg: ['de coquillages', 'de galets', 'd\'étoiles de mer', 'de bois flotté', 'd\'algues'],
                courts: ['coquillages', 'galets', 'étoiles', 'bois flotté', 'algues']
            },
            {
                id: 'chateaux', label: 'Châteaux', ordonnee: true,
                verbe: 'a construit', verbeNeg: 'n\'a pas construit',
                nombres: [1, 2, 3, 4, 5], unite: 'châteaux',
                comparatif: { moins: 'a construit moins de châteaux que', plus: 'a construit plus de châteaux que' },
                ecart: (d) => `a construit ${d} château${d > 1 ? 'x' : ''} de plus que`
            }
        ]
    },
    {
        id: 'randonnee',
        titre: 'La randonnée',
        decor: 'Chacun a suivi un sentier différent.',
        sujet: { id: 'marcheur', label: 'Marcheur', valeurs: PRENOMS },
        attributs: [
            {
                id: 'sentier', label: 'Sentier',
                verbe: 'a suivi', verbeNeg: 'n\'a pas suivi',
                valeurs: ['le sentier du lac', 'le sentier de la cascade', 'le sentier du refuge',
                    'le sentier des marmottes', 'le sentier de la crête'],
                courts: ['lac', 'cascade', 'refuge', 'marmottes', 'crête']
            },
            {
                id: 'montee', label: 'Montée', ordonnee: true,
                verbe: 'a grimpé', verbeNeg: 'n\'a pas grimpé',
                nombres: [100, 200, 300, 400, 500], unite: 'mètres',
                comparatif: { moins: 'a moins grimpé que', plus: 'a plus grimpé que' },
                ecart: (d) => `a grimpé ${d} mètres de plus que`
            }
        ]
    },
    {
        id: 'velo',
        titre: 'La sortie à vélo',
        decor: 'Chacun a choisi son circuit.',
        sujet: { id: 'cycliste', label: 'Cycliste', valeurs: PRENOMS },
        attributs: [
            {
                id: 'circuit', label: 'Circuit',
                verbe: 'a suivi', verbeNeg: 'n\'a pas suivi',
                valeurs: ['le circuit vert', 'le circuit bleu', 'le circuit rouge',
                    'le circuit jaune', 'le circuit orange'],
                courts: ['vert', 'bleu', 'rouge', 'jaune', 'orange']
            },
            {
                id: 'distance', label: 'Distance', ordonnee: true,
                verbe: 'a roulé', verbeNeg: 'n\'a pas roulé',
                nombres: [5, 10, 15, 20, 25], unite: 'km',
                comparatif: { moins: 'a roulé moins loin que', plus: 'a roulé plus loin que' },
                ecart: (d) => `a roulé ${d} km de plus que`
            }
        ]
    },
    {
        id: 'theatre',
        titre: 'Le spectacle de fin d\'année',
        decor: 'Chacun tient un rôle dans la pièce.',
        sujet: { id: 'acteur', label: 'Acteur', valeurs: PRENOMS },
        attributs: [
            {
                id: 'role', label: 'Rôle',
                verbe: 'joue', verbeNeg: 'ne joue pas',
                valeurs: ['le roi', 'la fée', 'le marchand', 'le jardinier', 'le narrateur'],
                courts: ['roi', 'fée', 'marchand', 'jardinier', 'narrateur']
            },
            {
                id: 'repliques', label: 'Répliques', ordonnee: true,
                verbe: 'a', verbeNeg: 'n\'a pas',
                nombres: [4, 6, 8, 10, 12], unite: 'répliques',
                comparatif: { moins: 'a moins de répliques que', plus: 'a plus de répliques que' },
                ecart: (d) => `a ${d} réplique${d > 1 ? 's' : ''} de plus que`
            }
        ]
    },
    {
        id: 'chorale',
        titre: 'La chorale',
        decor: 'Chacun a appris un chant.',
        sujet: { id: 'choriste', label: 'Choriste', valeurs: PRENOMS },
        attributs: [
            {
                id: 'chant', label: 'Chant',
                verbe: 'a appris', verbeNeg: 'n\'a pas appris',
                valeurs: ['la berceuse', 'la marche', 'la valse', 'la comptine', 'le canon'],
                courts: ['berceuse', 'marche', 'valse', 'comptine', 'canon']
            },
            {
                id: 'repetitions', label: 'Répét.', ordonnee: true,
                verbe: 'a fait', verbeNeg: 'n\'a pas fait',
                nombres: [2, 3, 4, 5, 6], unite: 'répétitions',
                comparatif: { moins: 'a fait moins de répétitions que', plus: 'a fait plus de répétitions que' },
                ecart: (d) => `a fait ${d} répétition${d > 1 ? 's' : ''} de plus que`
            }
        ]
    },
    {
        id: 'etoiles',
        titre: 'La nuit des étoiles',
        decor: 'Chacun a pointé la lunette vers un astre.',
        sujet: { id: 'observateur', label: 'Observateur', valeurs: PRENOMS },
        attributs: [
            {
                id: 'astre', label: 'Astre',
                verbe: 'a observé', verbeNeg: 'n\'a pas observé',
                valeurs: ['Mars', 'Vénus', 'Jupiter', 'Saturne', 'la Lune'],
                courts: ['Mars', 'Vénus', 'Jupiter', 'Saturne', 'Lune']
            },
            {
                id: 'filantes', label: 'Filantes', ordonnee: true,
                verbe: 'a compté', verbeNeg: 'n\'a pas compté',
                nombres: [3, 6, 9, 12, 15], unite: 'étoiles filantes',
                comparatif: { moins: 'a compté moins d\'étoiles que', plus: 'a compté plus d\'étoiles que' },
                ecart: (d) => `a compté ${d} étoiles de plus que`
            }
        ]
    },
    {
        id: 'dessin',
        titre: 'Le concours de dessin',
        decor: 'Chacun a rendu un dessin.',
        sujet: { id: 'eleve', label: 'Élève', valeurs: PRENOMS },
        attributs: [
            {
                id: 'sujet', label: 'Sujet',
                verbe: 'a dessiné', verbeNeg: 'n\'a pas dessiné',
                valeurs: ['un paysage', 'un portrait', 'un animal', 'une maison', 'un bateau'],
                valeursNeg: ['de paysage', 'de portrait', 'd\'animal', 'de maison', 'de bateau'],
                courts: ['paysage', 'portrait', 'animal', 'maison', 'bateau']
            },
            {
                id: 'crayons', label: 'Crayons', ordonnee: true,
                verbe: 'a utilisé', verbeNeg: 'n\'a pas utilisé',
                nombres: [3, 4, 5, 6, 7], unite: 'crayons',
                comparatif: { moins: 'a utilisé moins de crayons que', plus: 'a utilisé plus de crayons que' },
                ecart: (d) => `a utilisé ${d} crayon${d > 1 ? 's' : ''} de plus que`
            }
        ]
    },
    {
        id: 'societe',
        titre: 'Le club de jeux',
        decor: 'Chacun s\'est installé à une table.',
        sujet: { id: 'joueur', label: 'Joueur', valeurs: PRENOMS },
        attributs: [
            {
                id: 'jeu', label: 'Jeu',
                verbe: 'a joué', verbeNeg: 'n\'a pas joué',
                valeurs: ['aux dames', 'aux échecs', 'au memory', 'au tangram', 'aux dominos'],
                courts: ['dames', 'échecs', 'memory', 'tangram', 'dominos']
            },
            {
                id: 'victoires', label: 'Victoires', ordonnee: true,
                verbe: 'a gagné', verbeNeg: 'n\'a pas gagné',
                nombres: [1, 2, 3, 4, 5], unite: 'parties',
                comparatif: { moins: 'a gagné moins de parties que', plus: 'a gagné plus de parties que' },
                ecart: (d) => `a gagné ${d} partie${d > 1 ? 's' : ''} de plus que`
            }
        ]
    },
    {
        id: 'correspondance',
        titre: 'Les correspondants',
        decor: 'Chacun écrit à un correspondant étranger.',
        sujet: { id: 'eleve', label: 'Élève', valeurs: PRENOMS },
        attributs: [
            {
                id: 'pays', label: 'Pays',
                verbe: 'correspond avec', verbeNeg: 'ne correspond pas avec',
                valeurs: ['l\'Espagne', 'l\'Italie', 'le Portugal', 'l\'Irlande', 'la Grèce'],
                courts: ['Espagne', 'Italie', 'Portugal', 'Irlande', 'Grèce']
            },
            {
                id: 'lettres', label: 'Lettres', ordonnee: true,
                verbe: 'a envoyé', verbeNeg: 'n\'a pas envoyé',
                nombres: [1, 2, 3, 4, 5], unite: 'lettres',
                comparatif: { moins: 'a envoyé moins de lettres que', plus: 'a envoyé plus de lettres que' },
                ecart: (d) => `a envoyé ${d} lettre${d > 1 ? 's' : ''} de plus que`
            }
        ]
    },
    {
        id: 'sciences',
        titre: 'Le coin sciences',
        decor: 'Chacun a monté une expérience.',
        sujet: { id: 'eleve', label: 'Élève', valeurs: PRENOMS },
        attributs: [
            {
                id: 'experience', label: 'Expérience',
                verbe: 'a monté', verbeNeg: 'n\'a pas monté',
                valeurs: ['l\'expérience de l\'aimant', 'l\'expérience du prisme', 'l\'expérience de la graine',
                    'l\'expérience de la boussole', 'l\'expérience du levier'],
                courts: ['aimant', 'prisme', 'graine', 'boussole', 'levier']
            },
            {
                id: 'observations', label: 'Notes', ordonnee: true,
                verbe: 'a noté', verbeNeg: 'n\'a pas noté',
                nombres: [2, 3, 4, 5, 6], unite: 'observations',
                comparatif: { moins: 'a noté moins d\'observations que', plus: 'a noté plus d\'observations que' },
                ecart: (d) => `a noté ${d} observation${d > 1 ? 's' : ''} de plus que`
            }
        ]
    },
    {
        id: 'bricolage',
        titre: 'L\'atelier bricolage',
        decor: 'Chacun a fabriqué un objet en bois.',
        sujet: { id: 'eleve', label: 'Élève', valeurs: PRENOMS },
        attributs: [
            {
                id: 'objet', label: 'Objet',
                verbe: 'a fabriqué', verbeNeg: 'n\'a pas fabriqué',
                valeurs: ['un moulin', 'un cadre', 'une boîte', 'une maquette', 'un mobile'],
                valeursNeg: ['de moulin', 'de cadre', 'de boîte', 'de maquette', 'de mobile'],
                courts: ['moulin', 'cadre', 'boîte', 'maquette', 'mobile']
            },
            {
                id: 'clous', label: 'Clous', ordonnee: true,
                verbe: 'a planté', verbeNeg: 'n\'a pas planté',
                nombres: [4, 6, 8, 10, 12], unite: 'clous',
                comparatif: { moins: 'a planté moins de clous que', plus: 'a planté plus de clous que' },
                ecart: (d) => `a planté ${d} clou${d > 1 ? 's' : ''} de plus que`
            }
        ]
    },
    {
        id: 'fleurs',
        titre: 'Les fleurs du jardin',
        decor: 'Chacun a semé une variété.',
        sujet: { id: 'jardinier', label: 'Jardinier', valeurs: PRENOMS },
        attributs: [
            {
                id: 'fleur', label: 'Fleur',
                verbe: 'a semé', verbeNeg: 'n\'a pas semé',
                valeurs: ['des tulipes', 'des marguerites', 'des tournesols', 'des pensées', 'des bleuets'],
                valeursNeg: ['de tulipes', 'de marguerites', 'de tournesols', 'de pensées', 'de bleuets'],
                courts: ['tulipes', 'marguerites', 'tournesols', 'pensées', 'bleuets']
            },
            {
                id: 'graines', label: 'Graines', ordonnee: true,
                verbe: 'a mis', verbeNeg: 'n\'a pas mis',
                nombres: [5, 10, 15, 20, 25], unite: 'graines',
                comparatif: { moins: 'a mis moins de graines que', plus: 'a mis plus de graines que' },
                ecart: (d) => `a mis ${d} graines de plus que`
            }
        ]
    },
    {
        id: 'tournoi',
        titre: 'Le tournoi de l\'école',
        decor: 'Chacun a disputé un tournoi.',
        sujet: { id: 'eleve', label: 'Élève', valeurs: PRENOMS },
        attributs: [
            {
                id: 'sport', label: 'Tournoi',
                verbe: 'a disputé', verbeNeg: 'n\'a pas disputé',
                valeurs: ['le tournoi de basket', 'le tournoi de handball', 'le tournoi de tennis',
                    'le tournoi de badminton', 'le tournoi de rugby'],
                courts: ['basket', 'handball', 'tennis', 'badminton', 'rugby']
            },
            {
                id: 'points', label: 'Points', ordonnee: true,
                verbe: 'a marqué', verbeNeg: 'n\'a pas marqué',
                nombres: [4, 6, 8, 10, 12], unite: 'points',
                comparatif: { moins: 'a marqué moins de points que', plus: 'a marqué plus de points que' },
                ecart: (d) => `a marqué ${d} point${d > 1 ? 's' : ''} de plus que`
            }
        ]
    },
    {
        id: 'informatique',
        titre: 'Le club informatique',
        decor: 'Chacun a programmé une animation.',
        sujet: { id: 'eleve', label: 'Élève', valeurs: PRENOMS },
        attributs: [
            {
                id: 'programme', label: 'Programme',
                verbe: 'a programmé', verbeNeg: 'n\'a pas programmé',
                valeurs: ['un labyrinthe', 'une horloge', 'un jeu de balle', 'une animation', 'un quiz'],
                valeursNeg: ['de labyrinthe', 'd\'horloge', 'de jeu de balle', 'd\'animation', 'de quiz'],
                courts: ['labyrinthe', 'horloge', 'jeu de balle', 'animation', 'quiz']
            },
            {
                id: 'blocs', label: 'Blocs', ordonnee: true,
                verbe: 'a empilé', verbeNeg: 'n\'a pas empilé',
                nombres: [6, 8, 10, 12, 14], unite: 'blocs',
                comparatif: { moins: 'a empilé moins de blocs que', plus: 'a empilé plus de blocs que' },
                ecart: (d) => `a empilé ${d} blocs de plus que`
            }
        ]
    },
    {
        id: 'collection',
        titre: 'Les collections',
        decor: 'Chacun collectionne quelque chose.',
        sujet: { id: 'eleve', label: 'Élève', valeurs: PRENOMS },
        attributs: [
            {
                id: 'objet', label: 'Collection',
                verbe: 'collectionne', verbeNeg: 'ne collectionne pas',
                valeurs: ['les timbres', 'les cartes postales', 'les billes', 'les porte-clés', 'les cailloux'],
                courts: ['timbres', 'cartes', 'billes', 'porte-clés', 'cailloux']
            },
            {
                id: 'pieces', label: 'Pièces', ordonnee: true,
                verbe: 'a rangé', verbeNeg: 'n\'a pas rangé',
                nombres: [10, 20, 30, 40, 50], unite: 'pièces',
                comparatif: { moins: 'a rangé moins de pièces que', plus: 'a rangé plus de pièces que' },
                ecart: (d) => `a rangé ${d} pièces de plus que`
            }
        ]
    },
    {
        id: 'gouters',
        titre: 'Le petit déjeuner',
        decor: 'Chacun a pris une boisson au réveil.',
        sujet: { id: 'enfant', label: 'Enfant', valeurs: PRENOMS },
        attributs: [
            {
                id: 'boisson', label: 'Boisson',
                verbe: 'a bu', verbeNeg: 'n\'a pas bu',
                valeurs: ['du chocolat chaud', 'du jus d\'orange', 'du lait', 'de la tisane', 'du jus de pomme'],
                valeursNeg: ['de chocolat chaud', 'de jus d\'orange', 'de lait', 'de tisane', 'de jus de pomme'],
                courts: ['chocolat', 'jus d\'orange', 'lait', 'tisane', 'jus de pomme']
            },
            {
                id: 'tartines', label: 'Tartines', ordonnee: true,
                verbe: 'a mangé', verbeNeg: 'n\'a pas mangé',
                nombres: [1, 2, 3, 4, 5], unite: 'tartines',
                comparatif: { moins: 'a mangé moins de tartines que', plus: 'a mangé plus de tartines que' },
                ecart: (d) => `a mangé ${d} tartine${d > 1 ? 's' : ''} de plus que`
            }
        ]
    }
];

// --- Les niveaux ------------------------------------------------------------
//
// La difficulté d'un logigramme tient à trois choses, et à elles seules : le
// nombre de lignes de la grille, le nombre de catégories à croiser, et le type
// des indices. On les fait donc monter dans cet ordre — la taille en dernier,
// parce qu'une grille 5×5 avec des indices faciles reste longue mais simple,
// alors qu'une 3×3 avec des indices croisés fait déjà réfléchir.

export const NIVEAUX = [
    {
        id: 1, label: 'Découverte',
        entites: 3, categories: 2,
        types: ['egal', 'different'],
        aide: 'Une croix dans une case veut dire « ce n\'est pas lui ». Un rond veut dire « c\'est lui » — '
            + 'et alors toute la ligne et toute la colonne se remplissent de croix.'
    },
    {
        id: 2, label: 'Trois amis, deux listes',
        entites: 3, categories: 3,
        types: ['egal', 'different', 'lien'],
        aide: 'Un indice peut relier deux colonnes sans nommer personne : « celui qui a pris le chocolat a neuf ans ».'
    },
    {
        id: 3, label: 'Quatre à croiser',
        entites: 4, categories: 3,
        types: ['different', 'lien'],
        aide: 'Sans aucun indice qui donne directement une réponse : tout se déduit par élimination.'
    },
    {
        id: 4, label: 'Plus grand, plus petit',
        entites: 4, categories: 3,
        types: ['different', 'lien', 'ordre'],
        aide: 'Un indice de comparaison élimine des deux côtés : le plus jeune ne peut pas être le plus âgé, '
            + 'et celui qu\'on dépasse ne peut pas être le premier.'
    },
    {
        id: 5, label: 'L\'écart exact',
        entites: 4, categories: 3,
        types: ['different', 'lien', 'ordre', 'ecart'],
        aide: 'Un écart chiffré est l\'indice le plus fort : il ne laisse que les couples qui tombent juste.'
    },
    {
        id: 6, label: 'Cinq, et rien de donné',
        entites: 5, categories: 3,
        types: ['different', 'lien', 'ordre', 'ecart', 'parmi'],
        aide: 'Un « soit… soit… » ne donne rien tout seul : il faut d\'abord éliminer l\'une des deux branches.'
    }
];

export const niveauDe = (n) => NIVEAUX.find(x => x.id === Number(n)) || NIVEAUX[0];

// --- L'état de la grille ----------------------------------------------------
//
// Une case par couple de valeurs, pour chaque couple de catégories. Trois
// états, et c'est exactement ce qu'on écrit sur le papier : rien, une croix
// (impossible), un rond (certain).

export const INCONNU = 0, OUI = 1, NON = -1;

export const clefPaire = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

export function creerEtats(nbCategories, n) {
    const etats = {};
    for (let a = 0; a < nbCategories; a++) {
        for (let b = a + 1; b < nbCategories; b++) {
            etats[clefPaire(a, b)] = Array.from({ length: n }, () => new Array(n).fill(INCONNU));
        }
    }
    return etats;
}

/** Lit l'état du couple (catégorie a, valeur i) × (catégorie b, valeur j). */
export function lire(etats, a, i, b, j) {
    const m = etats[clefPaire(a, b)];
    if (!m) return INCONNU;
    return a < b ? m[i][j] : m[j][i];
}

function ecrire(etats, a, i, b, j, val) {
    const m = etats[clefPaire(a, b)];
    if (!m) return false;
    if (a < b) {
        if (m[i][j] === val) return false;
        if (m[i][j] !== INCONNU) throw new Error('contradiction');
        m[i][j] = val;
    } else {
        if (m[j][i] === val) return false;
        if (m[j][i] !== INCONNU) throw new Error('contradiction');
        m[j][i] = val;
    }
    return true;
}

// --- La propagation ---------------------------------------------------------

/**
 * Résout autant que la LOGIQUE PURE le permet, et raconte comment.
 *
 * Aucun essai-erreur, aucun retour en arrière : si cette fonction termine sur
 * une grille pleine, c'est qu'un élève peut y arriver en ne posant que des
 * déductions certaines. C'est le critère qui définit un bon logigramme, et
 * c'est pour cela que le générateur s'en sert comme juge.
 *
 * @returns {{complet:boolean, etats:Object, etapes:Array, contradiction:boolean}}
 */
export function resoudre(puzzle, opts = {}) {
    const { categories, indices } = puzzle;
    const n = categories[0].valeurs.length;
    const nc = categories.length;
    const etats = opts.etats || creerEtats(nc, n);
    const etapes = [];
    let contradiction = false;

    const poser = (a, i, b, j, val, raison) => {
        if (!ecrire(etats, a, i, b, j, val)) return false;
        etapes.push({ a, i, b, j, val, raison });
        return true;
    };

    try {
        let bouge = true;
        let tours = 0;
        while (bouge && tours < 200) {
            bouge = false;
            tours++;

            // 1. Un « oui » vide sa ligne et sa colonne.
            for (let a = 0; a < nc; a++) for (let b = a + 1; b < nc; b++) {
                for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
                    if (lire(etats, a, i, b, j) !== OUI) continue;
                    for (let k = 0; k < n; k++) {
                        if (k !== j && poser(a, i, b, k, NON,
                            'une valeur ne sert qu\'une fois : le reste de la ligne est éliminé')) bouge = true;
                        if (k !== i && poser(a, k, b, j, NON,
                            'une valeur ne sert qu\'une fois : le reste de la colonne est éliminé')) bouge = true;
                    }
                }
            }

            // 2. S'il ne reste qu'une case possible dans une ligne (ou une
            //    colonne), c'est elle. C'est LA déduction du logigramme.
            for (let a = 0; a < nc; a++) for (let b = a + 1; b < nc; b++) {
                for (let i = 0; i < n; i++) {
                    const libres = [];
                    let deja = false;
                    for (let j = 0; j < n; j++) {
                        const v = lire(etats, a, i, b, j);
                        if (v === OUI) deja = true;
                        if (v === INCONNU) libres.push(j);
                    }
                    if (!deja && libres.length === 1
                        && poser(a, i, b, libres[0], OUI, 'toutes les autres cases de la ligne sont barrées')) bouge = true;
                }
                for (let j = 0; j < n; j++) {
                    const libres = [];
                    let deja = false;
                    for (let i = 0; i < n; i++) {
                        const v = lire(etats, a, i, b, j);
                        if (v === OUI) deja = true;
                        if (v === INCONNU) libres.push(i);
                    }
                    if (!deja && libres.length === 1
                        && poser(a, libres[0], b, j, OUI, 'toutes les autres cases de la colonne sont barrées')) bouge = true;
                }
            }

            // 3. La transitivité : c'est elle qui fait qu'un logigramme n'est
            //    pas trois grilles côte à côte mais UNE seule énigme.
            for (let a = 0; a < nc; a++) for (let b = 0; b < nc; b++) for (let c = 0; c < nc; c++) {
                if (a === b || b === c || a === c) continue;
                for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
                    if (lire(etats, a, i, b, j) !== OUI) continue;
                    for (let k = 0; k < n; k++) {
                        const v = lire(etats, b, j, c, k);
                        if (v === INCONNU) continue;
                        if (poser(a, i, c, k, v,
                            v === OUI
                                ? 'les deux sont la même personne : ce qui vaut pour l\'une vaut pour l\'autre'
                                : 'les deux sont la même personne : ce qui est impossible pour l\'une l\'est pour l\'autre')) bouge = true;
                    }
                }
            }

            // 4. Les indices qui ne sont pas de simples faits : comparaisons,
            //    écarts, alternatives. On les repasse à chaque tour, car ils
            //    déduisent d'autant plus que la grille se remplit.
            for (const ind of indices) {
                if (appliquerIndice(ind, { etats, categories, n, poser })) bouge = true;
            }
        }
    } catch (e) {
        if (e.message !== 'contradiction') throw e;
        contradiction = true;
    }

    return { complet: !contradiction && estComplet(etats, nc, n), etats, etapes, contradiction };
}

function estComplet(etats, nc, n) {
    for (let a = 0; a < nc; a++) for (let b = a + 1; b < nc; b++) {
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
            if (lire(etats, a, i, b, j) === INCONNU) return false;
        }
    }
    return true;
}

/** Les valeurs encore possibles pour (catégorie a, valeur i) dans la catégorie o. */
function possibles(etats, a, i, o, n) {
    if (a === o) return [i];
    const out = [];
    for (let p = 0; p < n; p++) if (lire(etats, a, i, o, p) !== NON) out.push(p);
    return out;
}

function appliquerIndice(ind, ctx) {
    const { etats, categories, n, poser } = ctx;
    switch (ind.type) {
        case 'egal':
            return poser(ind.a, ind.i, ind.b, ind.j, OUI, 'l\'indice le dit directement');
        case 'different':
        case 'lien-non':
            return poser(ind.a, ind.i, ind.b, ind.j, NON, 'l\'indice l\'exclut');
        case 'lien':
            return poser(ind.a, ind.i, ind.b, ind.j, OUI, 'l\'indice relie ces deux colonnes');

        // « X est plus jeune que Y » : X ne peut pas prendre les âges les plus
        // élevés qui restent à Y, et Y ne peut pas prendre les plus bas de X.
        case 'ordre': {
            const o = ind.o;
            const nbs = categories[o].nombres;
            // On ramène toujours la comparaison à « le petit, puis le grand » :
            // sans cette normalisation, « X est plus âgé que Y » était propagé
            // comme « X est plus jeune que Y » — et la grille se remplissait à
            // l'envers, en silence.
            const [pa1, pi1, pb1, pj1] = ind.sens === '>'
                ? [ind.b, ind.j, ind.a, ind.i]
                : [ind.a, ind.i, ind.b, ind.j];
            const pa = possibles(etats, pa1, pi1, o, n);
            const pb = possibles(etats, pb1, pj1, o, n);
            if (!pa.length || !pb.length) return false;
            const maxB = Math.max(...pb.map(p => nbs[p]));
            const minA = Math.min(...pa.map(p => nbs[p]));
            let bouge = false;
            for (const p of pa) {
                if (nbs[p] >= maxB && poser(pa1, pi1, o, p, NON,
                    'la comparaison interdit cette valeur : elle serait trop grande')) bouge = true;
            }
            for (const p of pb) {
                if (nbs[p] <= minA && poser(pb1, pj1, o, p, NON,
                    'la comparaison interdit cette valeur : elle serait trop petite')) bouge = true;
            }
            return bouge;
        }

        // « A a 2 ans de plus que B » : ne restent que les couples qui tombent
        // exactement juste.
        case 'ecart': {
            const o = ind.o;
            const nbs = categories[o].nombres;
            const pa = possibles(etats, ind.a, ind.i, o, n);
            const pb = possibles(etats, ind.b, ind.j, o, n);
            let bouge = false;
            for (const p of pa) {
                if (!pb.some(q => nbs[p] === nbs[q] + ind.d)
                    && poser(ind.a, ind.i, o, p, NON, 'aucune valeur ne donnerait l\'écart annoncé')) bouge = true;
            }
            for (const q of pb) {
                if (!pa.some(p => nbs[p] === nbs[q] + ind.d)
                    && poser(ind.b, ind.j, o, q, NON, 'aucune valeur ne donnerait l\'écart annoncé')) bouge = true;
            }
            return bouge;
        }

        // « C'est soit l'un, soit l'autre » : ne sert que lorsqu'il n'en reste
        // qu'un — et c'est justement ce qui le rend difficile.
        case 'parmi': {
            const vivantes = ind.options.filter(op => lire(etats, ind.a, ind.i, op.b, op.j) !== NON);
            if (vivantes.length !== 1) return false;
            const seule = vivantes[0];
            return poser(ind.a, ind.i, seule.b, seule.j, OUI,
                'des deux possibilités annoncées, une seule tient encore');
        }
        default:
            return false;
    }
}

// --- Écrire les indices en français ----------------------------------------

/** Comment on désigne (catégorie a, valeur i) dans une phrase. */
function nommer(categories, a, i) {
    const cat = categories[a];
    if (a === 0) return cat.valeurs[i];
    return `celui qui ${cat.verbe} ${valeurTexte(cat, i)}`;
}

// « a mangé 1 tartines » : au singulier, l'unité suit. La règle vaut pour tous
// les mots de l'unité — « 1 étoile filante », pas « 1 étoiles filante ».
const singulier = (unite) => String(unite).split(' ')
    .map(m => (m.length > 2 ? m.replace(/[sx]$/, '') : m)).join(' ');

function valeurTexte(cat, i, negatif) {
    if (cat.nombres) {
        const v = cat.nombres[i];
        return `${cat.prefixe || ''}${v} ${v === 1 ? singulier(cat.unite) : cat.unite}`;
    }
    // « fait de la natation » mais « ne fait pas de natation » : après une
    // négation, le partitif tombe. Le français ne le déduit pas tout seul, on
    // le range donc avec la valeur.
    if (negatif && cat.valeursNeg) return cat.valeursNeg[i];
    return cat.valeurs[i];
}

/** Le libellé court d'une valeur, pour les en-têtes de la grille. */
export function etiquette(cat, i) {
    if (cat.nombres) return String(cat.nombres[i]);
    return (cat.courts && cat.courts[i]) || cat.valeurs[i];
}

export function direIndice(ind, categories) {
    const cats = categories;
    switch (ind.type) {
        case 'egal':
        case 'lien': {
            const sujet = nommer(cats, ind.a, ind.i);
            const cat = cats[ind.b];
            return majuscule(`${sujet} ${cat.verbe} ${valeurTexte(cat, ind.j)}.`);
        }
        case 'different':
        case 'lien-non': {
            const sujet = nommer(cats, ind.a, ind.i);
            const cat = cats[ind.b];
            return majuscule(`${sujet} ${cat.verbeNeg} ${valeurTexte(cat, ind.j, true)}.`);
        }
        case 'ordre': {
            const cat = cats[ind.o];
            const verbe = ind.sens === '<' ? cat.comparatif.moins : cat.comparatif.plus;
            return majuscule(`${nommer(cats, ind.a, ind.i)} ${verbe} ${nommer(cats, ind.b, ind.j)}.`);
        }
        case 'ecart': {
            const cat = cats[ind.o];
            return majuscule(`${nommer(cats, ind.a, ind.i)} ${cat.ecart(ind.d)} ${nommer(cats, ind.b, ind.j)}.`);
        }
        case 'parmi': {
            const cat = cats[ind.options[0].b];
            const liste = ind.options.map(op => valeurTexte(cat, op.j));
            return majuscule(`${nommer(cats, ind.a, ind.i)} ${cat.verbe} soit ${liste.join(', soit ')}.`);
        }
        default:
            return '';
    }
}

// « plus âgé que Adam » ne s'écrit pas : on élide, comme on le dirait.
const elider = (t) => t
    .replace(/\bque ([aeiouyâàéèêîôùûAEIOUYÀÂÉÈÊÎÔÙÛ])/g, 'qu\'$1')
    .replace(/\s+/g, ' ');

const majuscule = (t) => {
    const s = elider(t);
    return s.charAt(0).toUpperCase() + s.slice(1);
};

// --- La fabrication ---------------------------------------------------------

/** Tous les indices VRAIS pour cette solution, du type demandé. */
function candidats(categories, solution, types, n, rng) {
    const nc = categories.length;
    const out = [];
    const memeEntite = (a, i, b, j) => solution.findIndex(e => e[a] === i) === solution.findIndex(e => e[b] === j);

    for (let a = 0; a < nc; a++) for (let b = 0; b < nc; b++) {
        if (a === b) continue;
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
            const ensemble = memeEntite(a, i, b, j);
            if (a === 0 && ensemble && types.includes('egal')) out.push({ type: 'egal', a, i, b, j });
            if (a === 0 && !ensemble && types.includes('different')) out.push({ type: 'different', a, i, b, j });
            if (a > 0 && b > 0 && ensemble && types.includes('lien')) out.push({ type: 'lien', a, i, b, j });
            if (a > 0 && b > 0 && !ensemble && types.includes('lien')) out.push({ type: 'lien-non', a, i, b, j });
        }
    }

    const o = categories.findIndex(c => c.ordonnee);
    if (o > 0) {
        const valeurDe = (a, i) => {
            const e = solution.find(x => x[a] === i);
            return categories[o].nombres[e[o]];
        };
        for (let a = 0; a < nc; a++) for (let b = 0; b < nc; b++) {
            if (a === o || b === o || a === b) continue;
            for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
                if (a === b && i === j) continue;
                const va = valeurDe(a, i), vb = valeurDe(b, j);
                if (va === vb) continue;
                if (types.includes('ordre')) {
                    out.push({ type: 'ordre', a, i, b, j, o, sens: va < vb ? '<' : '>' });
                }
                if (types.includes('ecart') && va > vb) {
                    out.push({ type: 'ecart', a, i, b, j, o, d: va - vb });
                }
            }
        }
    }

    if (types.includes('parmi')) {
        // « X a soit ceci soit cela » : une vraie et une fausse, dans le désordre.
        for (let b = 1; b < nc; b++) {
            for (let i = 0; i < n; i++) {
                const vrai = solution[i][b];
                const faux = [...Array(n).keys()].filter(j => j !== vrai);
                const autre = rng.pick(faux);
                const options = rng.shuffle([{ b, j: vrai }, { b, j: autre }]);
                out.push({ type: 'parmi', a: 0, i, options });
            }
        }
    }
    return out;
}

/**
 * Fabrique un logigramme résoluble par déduction pure, avec le minimum
 * d'indices.
 *
 * @param {Object} params  { niveau, theme }
 * @param {Object} rng     tirage reproductible
 */
export function genererLogigramme(params = {}, rng) {
    const niv = niveauDe(params.niveau);
    // Sur une fiche, on ne veut pas trois fois la boulangerie : l'appelant dit
    // ce qui a déjà servi, et on tire dans ce qui reste. Réserve vide, on
    // repart du tout — mieux vaut un thème qui revient que pas de grille.
    const exclus = params.themesExclus || [];
    const reste = THEMES.filter(t => !exclus.includes(t.id));
    const theme = params.theme
        ? (THEMES.find(t => t.id === params.theme) || THEMES[0])
        : rng.pick(reste.length ? reste : THEMES);
    const n = niv.entites;

    // Les catégories retenues : le sujet, puis autant d'attributs que demandé.
    const attributs = theme.attributs.slice(0, niv.categories - 1);
    const categories = [
        { ...theme.sujet, valeurs: rng.shuffle(theme.sujet.valeurs).slice(0, n) },
        ...attributs.map(at => ({
            ...at,
            valeurs: at.valeurs ? at.valeurs.slice(0, n) : null,
            courts: at.courts ? at.courts.slice(0, n) : null,
            nombres: at.nombres ? at.nombres.slice(0, n) : null
        }))
    ];

    // La solution : chaque entité reçoit une valeur de chaque catégorie.
    const perms = categories.map((c, k) => k === 0
        ? [...Array(n).keys()]
        : rng.shuffle([...Array(n).keys()]));
    const solution = [...Array(n).keys()].map(i => perms.map(p => p[i]));

    // On ajoute des indices jusqu'à ce que la déduction pure suffise…
    const pool = rng.shuffle(candidats(categories, solution, niv.types, n, rng));
    const indices = [];
    let bilan = resoudre({ categories, indices });
    for (const cand of pool) {
        if (bilan.complet) break;
        indices.push(cand);
        bilan = resoudre({ categories, indices });
        if (bilan.contradiction) { indices.pop(); bilan = resoudre({ categories, indices }); }
    }
    if (!bilan.complet) return genererLogigramme({ ...params, theme: theme.id }, rng);

    // … puis on retire tout ce dont on peut se passer : un indice de trop est
    // une déduction volée à l'élève.
    for (let k = indices.length - 1; k >= 0; k--) {
        const sans = indices.filter((_, x) => x !== k);
        if (resoudre({ categories, indices: sans }).complet) indices.splice(k, 1);
    }

    const final = resoudre({ categories, indices });
    return {
        theme: theme.id, titre: theme.titre, decor: theme.decor,
        niveau: niv.id, categories, solution,
        indices: indices.map(ind => ({ ...ind, texte: direIndice(ind, categories) })),
        etapes: final.etapes,
        etats: final.etats
    };
}

/**
 * La saisie de l'élève est-elle juste ? On ne compare qu'aux « ronds » : une
 * croix oubliée n'est pas une faute, c'est une case qu'on n'a pas eu besoin de
 * remplir.
 */
export function verifierSaisie(puzzle, saisie) {
    const { categories, solution } = puzzle;
    const n = categories[0].valeurs.length;
    const nc = categories.length;
    const attendu = (a, i, b, j) => {
        const ea = solution.findIndex(e => e[a] === i);
        const eb = solution.findIndex(e => e[b] === j);
        return ea === eb;
    };
    const fautes = [];
    let poses = 0;
    for (let a = 0; a < nc; a++) for (let b = a + 1; b < nc; b++) {
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
            const v = lire(saisie, a, i, b, j);
            if (v === INCONNU) continue;
            const vrai = attendu(a, i, b, j);
            if ((v === OUI) !== vrai) fautes.push({ a, i, b, j, mis: v });
            else if (v === OUI) poses++;
        }
    }
    // Il faut avoir posé TOUS les ronds : sinon la grille n'est pas finie.
    const attendus = (nc * (nc - 1) / 2) * n;
    return { ok: !fautes.length && poses === attendus, fautes, poses, attendus };
}
