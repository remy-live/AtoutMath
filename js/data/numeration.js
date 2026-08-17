import { TAGS } from './tags.js';
import { STATUS } from './status.js';

// Chapitre « Nombres entiers et décimaux » (6ᵉ), d'après la fiche de cours.
//
// Chaque exercice reprend une activité de la fiche. Les mêmes générateurs
// servent plusieurs exercices avec des paramètres différents : c'est ce qui
// permet d'avoir une progression (entiers seuls, puis décimaux) sans écrire
// de code supplémentaire.

const D = TAGS.DOMAINE.NUMERIQUE;
const NUM = TAGS.SOUS_DOMAINE.NUMERATION;
const DEC = TAGS.SOUS_DOMAINE.DECIMAUX;
const REL = TAGS.SOUS_DOMAINE.RELATIFS;
const MENTAL = TAGS.SOUS_DOMAINE.CALCUL_MENTAL;
const SIXIEME = TAGS.NIVEAU.SIXIEME;
const CM2 = TAGS.NIVEAU.CM2;
const CINQUIEME = TAGS.NIVEAU.CINQUIEME;
const QUATRIEME = TAGS.NIVEAU.QUATRIEME;

export const numerationExercises = [
    // --- Écriture des nombres (fiche § 1, 2, 3, 19) ---
    {
        id: 'num-lettres-mille',
        consignePapier: "Écris en chiffres.",
        colonnesPapier: 2,
        title: 'Des Lettres aux Chiffres',
        generatorId: 'num.lettres', activityId: 'numpad',
        params: { max: 1000, decimaux: 'non' },
        tags: { chemin: [D, NUM], niveaux: [CM2, SIXIEME] },
        instruction: "Lis le nombre écrit en toutes lettres et saisis-le en chiffres."
    },
    {
        id: 'num-lettres-grands',
        consignePapier: "Écris en chiffres.",
        colonnesPapier: 1,
        title: 'Les Grands Nombres',
        generatorId: 'num.lettres', activityId: 'numpad',
        params: { max: 1000000, decimaux: 'non' },
        tags: { chemin: [D, NUM], niveaux: [SIXIEME] },
        instruction: "Attention aux tranches : millions, milliers, puis unités."
    },
    {
        id: 'num-lettres-decimaux',
        consignePapier: "Écris en chiffres.",
        colonnesPapier: 2,
        title: 'Dixièmes et Centièmes',
        generatorId: 'num.lettres', activityId: 'numpad',
        params: { max: 100000, decimaux: 'toujours' },
        tags: { chemin: [D, DEC], niveaux: [SIXIEME] },
        instruction: "« Trois dixièmes », « deux cent douze centièmes »… écris-les en chiffres."
    },

    // --- Rang des chiffres (fiche § 17, 27) ---
    {
        id: 'num-rang-entier',
        consignePapier: "",
        title: 'Chasse au Chiffre',
        generatorId: 'num.chiffre-rang', activityId: 'bubbles',
        params: { partie: 'entière', decimales: 2 },
        tags: { chemin: [D, NUM], niveaux: [CM2, SIXIEME] },
        instruction: "Trouve le chiffre qui occupe le rang demandé, à gauche de la virgule."
    },
    {
        id: 'num-rang-decimal',
        consignePapier: "",
        title: 'Rang dans un nombre',
        generatorId: 'num.chiffre-rang', activityId: 'bubbles',
        params: { partie: 'les deux', decimales: 3 },
        tags: { chemin: [D, NUM], niveaux: [SIXIEME] },
        instruction: "Le piège classique : dizaines et dixièmes ne sont pas le même rang."
    },

    // --- Décimaux (fiche § 5, 6) ---
    {
        id: 'num-parties',
        consignePapier: "",
        title: 'Entière ou Décimale ?',
        generatorId: 'num.parties', activityId: 'bubbles',
        params: {},
        tags: { chemin: [D, DEC], niveaux: [SIXIEME] },
        instruction: "La virgule sépare les deux parties du nombre. Laquelle te demande-t-on ?"
    },
    {
        id: 'num-zeros',
        consignePapier: "Enlève les zéros inutiles.",
        colonnesPapier: 3,
        title: 'La Chasse aux Zéros',
        generatorId: 'num.zeros', activityId: 'numpad',
        params: {},
        tags: { chemin: [D, DEC], niveaux: [SIXIEME] },
        instruction: "Enlève les zéros inutiles — mais seulement ceux qui ne changent rien !"
    },

    // --- Décomposition et conversions (fiche § 10, 11, 18, 20, 21) ---
    {
        id: 'num-decomposition',
        consignePapier: "Complète.",
        title: 'Décomposer, Recomposer',
        generatorId: 'num.decomposition', activityId: 'numpad',
        params: { sens: 'libre' },
        motsClefs: ['décomposition'],
        tags: { chemin: [D, NUM], niveaux: [SIXIEME] },
        instruction: "Retrouve le nombre, ou le terme qui manque dans sa décomposition."
    },
    {
        id: 'num-conversion', title: 'Dizaines, Centaines, Milliers',
        generatorId: 'num.conversion', activityId: 'numpad',
        params: { decimaux: 'non' },
        tags: { chemin: [D, NUM], niveaux: [SIXIEME] },
        instruction: "Combien font 785 centaines ? Convertis en unités."
    },
    {
        id: 'num-conversion-dec', title: 'Conversions Décimales',
        generatorId: 'num.conversion', activityId: 'numpad',
        params: { decimaux: 'oui' },
        tags: { chemin: [D, DEC], niveaux: [SIXIEME] },
        instruction: "Les dixièmes et les centièmes se convertissent aussi."
    },

    // --- Numération égyptienne (fiche § 8, 9) ---
    {
        id: 'num-egypte', title: 'Les Nombres des Pharaons',
        generatorId: 'num.egypte', activityId: 'numpad',
        // SUR LE PAPIER : les glyphes tracés au PDF, à partir du dessin de
        // Rémy. Deux sens — lire les symboles, ou les écrire ; c'est en les
        // CHOISISSANT qu'on découvre que leur position ne compte pas.
        printable: 'egypte', printGeneratorId: 'num.egypte-fiche',
        printParams: { max: 10000, sens: 'lire' },
        consignePapier: 'Quel nombre est écrit ?',
        params: { max: 10000 },
        motsClefs: ['égypte', 'hiéroglyphes'],
        tags: { chemin: [D, NUM], niveaux: [SIXIEME] },
        instruction: "Bâton = 1, anse = 10, corde = 100, lotus = 1 000, doigt = 10 000. Additionne !"
    },
    {
        id: 'num-egypte-qcm', title: 'Hiéroglyphes Express',
        generatorId: 'num.egypte', activityId: 'bubbles',
        // SUR LE PAPIER : les glyphes tracés au PDF, à partir du dessin de
        // Rémy. Deux sens — lire les symboles, ou les écrire ; c'est en les
        // CHOISISSANT qu'on découvre que leur position ne compte pas.
        printable: 'egypte', printGeneratorId: 'num.egypte-fiche',
        printParams: { max: 10000, sens: 'ecrire' },
        consignePapier: 'Écris chaque nombre en hiéroglyphes.',
        params: { max: 1000 },
        motsClefs: ['égypte', 'hiéroglyphes'],
        tags: { chemin: [D, NUM], niveaux: [CM2, SIXIEME] },
        instruction: "Lis le nombre égyptien et choisis la bonne réponse."
    },

    // --- Ordre de grandeur (fiche § 23, 24) ---
    {
        id: 'num-ordre-grandeur',
        consignePapier: "Donne l'ordre de grandeur.",
        colonnesPapier: 3,
        title: 'À Peu Près',
        generatorId: 'num.ordre-grandeur', activityId: 'bubbles',
        params: { decimaux: 'non' },
        tags: { chemin: [D, MENTAL], niveaux: [SIXIEME] },
        instruction: "Donne le nombre rond le plus proche : c'est l'ordre de grandeur."
    },
    {
        id: 'num-ordre-grandeur-dec',
        consignePapier: "Donne l'entier le plus proche.",
        colonnesPapier: 3,
        title: 'À Peu Près, avec Virgule',
        generatorId: 'num.ordre-grandeur', activityId: 'bubbles',
        params: { decimaux: 'oui' },
        tags: { chemin: [D, MENTAL], niveaux: [SIXIEME] },
        instruction: "7,98 est presque 8. Trouve l'entier le plus proche."
    },

    // --- La loupe sur la droite graduée (fiche 4ᵉ § C) ---
    // Entre 3 et 4 les dixièmes, entre 3,5 et 3,6 les centièmes : le même
    // geste à deux échelles. C'est ainsi qu'on installe l'idée qu'entre deux
    // décimaux il y en a toujours d'autres — le tableau de numération, lui,
    // ne la donne jamais.
    {
        id: 'num-graduations',
        consignePapier: "Écris l'abscisse du point.",
        colonnesPapier: 1,
        title: 'La Loupe sur la Droite',
        generatorId: 'num.graduations', activityId: 'numpad',
        params: { zoom: 'progressif' },
        motsClefs: ['graduation', 'abscisse', 'décimaux', 'intercaler', 'axe'],
        tags: { chemin: [D, DEC], niveaux: [CM2, SIXIEME, CINQUIEME] },
        instruction: "Entre les deux grands traits, l'axe est coupé en DIX. On compte les INTERVALLES depuis le trait de gauche, jamais les traits. Puis on recommence un cran plus bas : entre 3,5 et 3,6, il y a encore dix intervalles, et un intervalle vaut 0,01."
    },
    {
        id: 'num-graduations-centiemes',
        consignePapier: "Écris l'abscisse du point.",
        colonnesPapier: 1,
        title: 'La Loupe : les Centièmes',
        generatorId: 'num.graduations', activityId: 'numpad',
        params: { zoom: 'centiemes' },
        motsClefs: ['graduation', 'centièmes', 'décimaux', 'intercaler'],
        tags: { chemin: [D, DEC], niveaux: [SIXIEME, CINQUIEME, QUATRIEME] },
        instruction: "On zoome entre deux dixièmes voisins : entre 3,5 et 3,6, l'axe est encore coupé en dix, et chaque intervalle vaut 0,01."
    },

    // --- Le vocabulaire du calcul (fiche 4ᵉ § 4, 5, 6, N) ---
    // Le seul chapitre où la bonne réponse ne se déduit de rien : elle se sait.
    // Un élève qui ignore « différence » rate une soustraction qu'il savait
    // faire — c'est un exercice de lecture déguisé en exercice de calcul.
    {
        id: 'num-vocabulaire',
        consignePapier: "Complète.",
        colonnesPapier: 1,
        title: 'Le Mot Juste',
        generatorId: 'num.vocabulaire', activityId: 'bubbles',
        params: { volets: ['resultat', 'nombres', 'phrase-vers-calcul', 'calcul-vers-phrase', 'multiples', 'posee'] },
        motsClefs: ['somme', 'différence', 'produit', 'quotient', 'termes', 'facteurs', 'dividende', 'vocabulaire'],
        tags: { chemin: [D, MENTAL], niveaux: [SIXIEME, CINQUIEME, QUATRIEME] },
        instruction: "Somme, différence, produit, quotient : ces mots nomment le RÉSULTAT d'une opération, pas l'opération elle-même. Les nombres, eux, s'appellent les termes dans une addition et les facteurs dans une multiplication. Attention au petit mot de liaison : la somme de 3 ET 2, mais le produit de 3 PAR 2."
    },
    {
        id: 'num-vocabulaire-traduire',
        consignePapier: "Écris le calcul qui correspond à la phrase.",
        colonnesPapier: 2,
        title: 'De la Phrase au Calcul',
        generatorId: 'num.vocabulaire', activityId: 'bubbles',
        params: { volets: ['phrase-vers-calcul', 'calcul-vers-phrase', 'multiples'] },
        motsClefs: ['somme', 'produit', 'double', 'triple', 'moitié', 'traduire'],
        tags: { chemin: [D, MENTAL], niveaux: [SIXIEME, CINQUIEME, QUATRIEME] },
        instruction: "Dans les deux sens : la phrase donne le calcul, et le calcul se dit en toutes lettres. « Le double » veut dire × 2, « le tiers » veut dire ÷ 3 — ces mots ne s'ajoutent jamais."
    },

    // --- Questions flash (fiche § E, F, 29) ---
    {
        id: 'num-complement-10',
        consignePapier: "Complète.",
        colonnesPapier: 4,
        title: 'Amis de 10',
        generatorId: 'num.complement', activityId: 'bubbles',
        params: { cible: [10] },
        tags: { chemin: [D, MENTAL], niveaux: [CM2, SIXIEME] },
        instruction: "Combien faut-il ajouter pour faire 10 ?"
    },
    {
        // LES PAIRES. Le complément est un réflexe, et un réflexe se construit
        // en CHERCHANT des paires, pas en répondant à des questions : une
        // table de cartes, on tape 3 puis 7, elles s'envolent. La table vidée,
        // une plus grande arrive.
        id: 'num-amis-de-dix', status: STATUS.TEST, title: 'Les Amis de Dix',
        activityId: 'dix',
        // Sur le papier, on TRACE le trait au lieu de taper deux cartes : c'est
        // la forme qu'on retrouve en évaluation.
        printable: 'paires', printGeneratorId: 'num.paires-fiche',
        sansRevision: true,
        skills: ['num.complement'],
        params: { cible: [10], vies: 3, mouvement: 'apres' },
        paramSchema: [
            {
                id: 'cible', type: 'multiselect', label: 'Compléter à',
                options: [10, 100, 1000], default: [10]
            },
            {
                id: 'vies', type: 'select', label: 'Vies',
                options: [
                    { value: 3, label: '3 vies' },
                    { value: 5, label: '5 vies' }
                ],
                default: 3
            },
            {
                id: 'mouvement', type: 'select', label: 'Les cartes qui bougent', default: 'apres',
                aide: 'Sur une table immobile, un élève finit par ne plus calculer : il RETIENT où sont les cartes et cherche des yeux celle qu\'il a repérée tout à l\'heure. Dès qu\'elles dérivent, cette béquille disparaît, et il ne reste que « quel nombre va avec celui-là ». La dérive commence après deux tables vidées et s\'accélère très doucement.',
                options: [
                    { value: 'apres', label: 'Après deux tables vidées' },
                    { value: 'jamais', label: 'Jamais — table immobile' },
                    { value: 'toujours', label: 'Dès la première table' }
                ]
            }
        ],
        tags: { chemin: [D, MENTAL], niveaux: [CM2, SIXIEME] },
        instruction: "Toutes les cartes sont visibles, et chacune a son amie : tape deux cartes dont la somme fait la cible. Ne cherche pas au hasard — choisis UNE carte, calcule ce qui lui manque, puis cherche ce nombre des yeux. Au bout de deux tables vidées, les cartes se mettent à DÉRIVER : on ne peut plus retenir où elles sont, il faut vraiment calculer."
    },
    {
        // LE CANON. Le complément se PRÉPARE avant de tirer : un boulet
        // ennemi porte 23, la cible est 100, on charge 77 au pavé, on touche
        // le boulet, et le nôtre part à sa rencontre. Somme juste : explosion.
        // Fausse : l'ennemi continue sa route. Le calcul précède le geste.
        id: 'num-canon-complements', status: STATUS.TEST, title: 'Le Canon des Compléments',
        activityId: 'canon',
        sansRevision: true,
        skills: ['num.complement'],
        params: { cible: 100, vies: 3, vitesse: 'normale' },
        paramSchema: [
            {
                id: 'vitesse', type: 'select', label: 'Allure',
                aide: 'Le temps de descente d\'un astéroïde, pas la difficulté du calcul. « Tranquille » laisse presque le double de temps — c\'est souvent ce qu\'il faut pour découvrir les compléments à 100.',
                options: [
                    { value: 'tranquille', label: 'Tranquille — tout le temps de calculer' },
                    { value: 'posee', label: 'Posée — un quart de temps en plus' },
                    { value: 'normale', label: 'Normale' },
                    { value: 'rapide', label: 'Rapide — pour ceux qui s\'ennuient' }
                ],
                default: 'normale'
            },
            {
                id: 'cible', type: 'select', label: 'Compléter à',
                options: [
                    { value: 10, label: '10 — une voie' },
                    { value: 100, label: '100 — deux voies' },
                    { value: 1000, label: '1 000 — trois voies' }
                ],
                default: 100
            },
            {
                id: 'vies', type: 'select', label: 'Vies',
                options: [
                    { value: 3, label: '3 vies' },
                    { value: 5, label: '5 vies' }
                ],
                default: 3
            }
        ],
        tags: { chemin: [D, MENTAL], niveaux: [CM2, SIXIEME] },
        instruction: "Des astéroïdes foncent sur ton canon orbital, chacun porte un nombre. PRÉPARE ta charge au pavé — un 23 approche et la cible est 100 : charge 77 — puis touche l'astéroïde visé. Si la somme fait la cible, il éclate ; sinon il continue sa route. Le calcul d'abord, le tir ensuite. Au fil des niveaux ils arrivent de plus en plus nombreux, sur plusieurs voies à la fois : c'est là qu'il faut choisir lequel traiter d'abord."
    },
    {
        id: 'num-complement-100',
        consignePapier: "Complète.",
        colonnesPapier: 3,
        title: 'Amis de 100 et 1000',
        generatorId: 'num.complement', activityId: 'moles',
        params: { cible: [100, 1000], timeLimit: 60, minScore: 10 },
        tags: { chemin: [D, MENTAL], niveaux: [SIXIEME] },
        instruction: "Tape la taupe qui porte le complément à 100 ou à 1 000 !"
    },
    {
        id: 'num-parite', title: 'Pair ou Impair',
        generatorId: 'num.parite', activityId: 'buttons',
        params: { max: 99 },
        tags: { chemin: [D, NUM], niveaux: [CM2, SIXIEME] },
        instruction: "Regarde seulement le chiffre des unités."
    },

    // --- Nombres relatifs ---------------------------------------------------
    // Trois portes d'entrée sur la même notion. La progressive est celle qu'on
    // conseille : elle traverse l'ascenseur, le thermomètre, les pastilles,
    // puis l'écriture. Les deux autres servent à REVENIR sur un modèle précis
    // quand un élève bloque — c'est là que le professeur choisit.
    {
        id: 'num-relatifs-progressif', title: 'Nombres Relatifs : la montée',
        generatorId: 'num.relatifs', activityId: 'relatifs',
        params: { niveau: 'progressif', reponse: 'saisie' },
        tags: { chemin: [D, REL], niveaux: [CINQUIEME] },
        instruction: "Un nombre relatif, c'est une POSITION. L'addition, c'est un DÉPLACEMENT : compte les crans, n'additionne pas les distances."
    },
    {
        id: 'num-dictee', status: STATUS.TEST, title: 'Dictée de Grands Nombres',
        activityId: 'dictee',
        params: { palier: 'grands' },
        paramSchema: [
            {
                id: 'palier', type: 'select', label: 'Taille des nombres',
                options: [
                    { value: 'milliers', label: 'Jusqu\'à 99 999' },
                    { value: 'grands', label: 'Jusqu\'à 999 999' },
                    { value: 'millions', label: 'Jusqu\'aux millions' }
                ],
                default: 'grands'
            }
        ],
        tags: { chemin: [D, NUM], niveaux: [CM2, SIXIEME] },
        instruction: "Le nombre n'est pas écrit : il est DIT. Appuie sur le haut-parleur, écoute, puis écris-le en chiffres. On peut réécouter autant de fois qu'on veut, et ralentir la voix. La correction affiche le nombre en lettres à côté des chiffres : c'est là qu'on voit ce qu'on avait mal entendu. Si l'appareil n'a pas de voix, le nombre s'affiche en lettres."
    },
    {
        id: 'num-ninja-zeros', status: STATUS.TEST, title: 'Ninja des Zéros Inutiles',
        activityId: 'ninja',
        // Un objet raté est une erreur de règle, pas une erreur de calcul : on
        // l'affiche tout de suite, mais on ne surcharge pas le carnet avec les
        // ratés de vitesse.
        sansRevision: true,
        params: { vitesse: 'normale', mode: 'zeros', vies: 3 },
        paramSchema: [
            {
                id: 'vitesse', type: 'select', label: 'Allure', default: 'normale',
                aide: 'Le temps de vol, pas la difficulté du calcul. « Posée » laisse un tiers de temps en plus pour lire et décider — c\'est souvent ce qu\'il faut la première fois.',
                options: [
                    { value: 'tranquille', label: 'Tranquille — tout le temps de réfléchir' },
                    { value: 'posee', label: 'Posée — un tiers de temps en plus' },
                    { value: 'normale', label: 'Normale' },
                    { value: 'rapide', label: 'Rapide — pour ceux qui s\'ennuient' }
                ]
            },
            {
                id: 'vies', type: 'select', label: 'Vies',
                options: [{ value: 1, label: '1 vie' }, { value: 3, label: '3 vies' }, { value: 5, label: '5 vies' }],
                default: 3
            }
        ],
        tags: { chemin: [D, DEC], niveaux: [CM2, SIXIEME] },
        instruction: "Le nombre traverse l'écran d'un seul tenant. Tranche UNIQUEMENT ses zéros inutiles : ceux de devant, et ceux tout à la fin après la virgule. Le 0 de 1,05 tient un rang — y toucher coûte une vie. Laisser filer un zéro inutile en coûte une aussi : ne rien faire n'est pas une stratégie."
    },
    {
        id: 'num-relatifs-addition',
        consignePapier: "Simplifie et calcule.",
        colonnesPapier: 3,
        title: 'Additionner des Relatifs, pas à pas',
        generatorId: 'num.relatifs.addition', activityId: 'add-relatifs',
        params: { etape: 'progressif', reponse: 'saisie' },
        tags: { chemin: [D, REL], niveaux: [CINQUIEME, QUATRIEME] },
        instruction: "Douze marches, deux questions chacune. D'abord des pastilles toutes de la même couleur — il n'y a qu'à compter, et on apprend l'écriture. Puis des pastilles des DEUX couleurs : une rouge et une bleue valent zéro ensemble, on les élimine par paires, et la soustraction apparaît toute seule. Ensuite on simplifie les écritures, et on finit avec une virgule."
    },
    {
        id: 'num-relatifs-addition-b',
        consignePapier: "Simplifie et calcule.",
        colonnesPapier: 3,
        title: 'Relatifs : quand les signes diffèrent',
        generatorId: 'num.relatifs.addition', activityId: 'add-relatifs',
        params: { etape: 'B', reponse: 'saisie' },
        tags: { chemin: [D, REL], niveaux: [CINQUIEME, QUATRIEME] },
        instruction: "Le passage difficile du chapitre, et lui seul : (+7) + (−3). Les paires rouge-bleu s'éliminent une par une sous tes yeux, et c'est de là que vient la soustraction."
    },
    {
        id: 'num-ninja-negatifs', status: STATUS.TEST, title: 'Ninja des Résultats Négatifs',
        activityId: 'ninja',
        sansRevision: true,
        params: { vitesse: 'normale', mode: 'negatifs', vies: 3, parVague: 5 },
        paramSchema: [
            {
                id: 'vitesse', type: 'select', label: 'Allure', default: 'normale',
                aide: 'Le temps de vol, pas la difficulté du calcul. « Posée » laisse un tiers de temps en plus pour lire et décider — c\'est souvent ce qu\'il faut la première fois.',
                options: [
                    { value: 'tranquille', label: 'Tranquille — tout le temps de réfléchir' },
                    { value: 'posee', label: 'Posée — un tiers de temps en plus' },
                    { value: 'normale', label: 'Normale' },
                    { value: 'rapide', label: 'Rapide — pour ceux qui s\'ennuient' }
                ]
            },
            {
                id: 'vies', type: 'select', label: 'Vies',
                options: [{ value: 1, label: '1 vie' }, { value: 3, label: '3 vies' }, { value: 5, label: '5 vies' }],
                default: 3
            },
            {
                id: 'parVague', type: 'select', label: 'Bulles par vague',
                options: [{ value: 3, label: '3 bulles' }, { value: 5, label: '5 bulles' }, { value: 7, label: '7 bulles' }],
                default: 5
            }
        ],
        tags: { chemin: [D, REL], niveaux: [CINQUIEME, QUATRIEME] },
        instruction: "Des bulles portent un calcul simplifié : 3 − 7, −2 + 9… Coupe celles dont le RÉSULTAT est négatif, laisse filer les autres. Se tromper de bulle coûte une vie ; en laisser passer une qu'il fallait couper aussi."
    },
    {
        id: 'num-ninja-positifs', status: STATUS.TEST, title: 'Tir sur les Résultats Positifs',
        activityId: 'ninja',
        sansRevision: true,
        params: { vitesse: 'normale', mode: 'positifs', vies: 3, parVague: 5 },
        paramSchema: [
            {
                id: 'vitesse', type: 'select', label: 'Allure', default: 'normale',
                aide: 'Le temps de vol, pas la difficulté du calcul. « Posée » laisse un tiers de temps en plus pour lire et décider — c\'est souvent ce qu\'il faut la première fois.',
                options: [
                    { value: 'tranquille', label: 'Tranquille — tout le temps de réfléchir' },
                    { value: 'posee', label: 'Posée — un tiers de temps en plus' },
                    { value: 'normale', label: 'Normale' },
                    { value: 'rapide', label: 'Rapide — pour ceux qui s\'ennuient' }
                ]
            },
            {
                id: 'vies', type: 'select', label: 'Vies',
                options: [{ value: 1, label: '1 vie' }, { value: 3, label: '3 vies' }, { value: 5, label: '5 vies' }],
                default: 3
            },
            {
                id: 'parVague', type: 'select', label: 'Cibles par vague',
                options: [{ value: 3, label: '3 cibles' }, { value: 5, label: '5 cibles' }, { value: 7, label: '7 cibles' }],
                default: 5
            }
        ],
        tags: { chemin: [D, REL], niveaux: [CINQUIEME, QUATRIEME] },
        instruction: "Le jeu inverse du précédent : des cibles portent un calcul, tu tires sur celles dont le résultat est POSITIF et tu épargnes les autres. La consigne reste écrite en haut de l'écran du début à la fin."
    },
    {
        id: 'num-relatifs-thermometre',
        consignePapier: "",
        title: 'Le Thermomètre',
        generatorId: 'num.relatifs', activityId: 'relatifs',
        params: { niveau: 'thermometre', reponse: 'saisie' },
        tags: { chemin: [D, REL], niveaux: [CINQUIEME] },
        instruction: "La température monte ou baisse : compte les graduations, le zéro n'arrête rien."
    },
    {
        id: 'num-relatifs-pastilles',
        consignePapier: "",
        title: 'Les Pastilles qui s\'annulent',
        generatorId: 'num.relatifs', activityId: 'relatifs',
        params: { niveau: 'pastilles', reponse: 'saisie' },
        tags: { chemin: [D, REL], niveaux: [CINQUIEME] },
        instruction: "Une pastille rouge (+1) et une bleue (−1) forment une paire qui vaut 0. Barre les paires : ce qui reste est la réponse."
    },
    {
        id: 'num-relatifs-ecriture',
        consignePapier: "Calcule.",
        colonnesPapier: 3,
        title: 'Sommes de Relatifs',
        generatorId: 'num.relatifs', activityId: 'relatifs',
        params: { niveau: 'ecriture', reponse: 'saisie' },
        tags: { chemin: [D, REL], niveaux: [CINQUIEME, QUATRIEME] },
        instruction: "Même signe : on ajoute et on garde le signe. Signes différents : on soustrait, et on garde le signe du plus éloigné de zéro."
    },
    {
        // TROIS TEMPS, ET L'ORDRE EST LE SUJET. « ×10, on ajoute un zéro » est
        // une règle qui marche pour les entiers et casse dès la première
        // décimale. On ne la déloge pas en la contredisant : on la déloge en
        // faisant MANIPULER ce qui se passe — la virgule se décale d'un rang
        // vers la droite — assez longtemps pour que l'image remplace la
        // formule. Ensuite seulement on demande de choisir, puis d'écrire.
        // On dit « la virgule se décale » et non « les chiffres glissent » :
        // les deux lectures sont vraies et donnent le même nombre, mais c'est
        // la première que l'élève entend en classe, et l'exercice ne doit pas
        // dire le contraire du professeur.
        id: 'num-virgule', status: STATUS.TEST, title: 'La Virgule qui se décale',
        activityId: 'virgule',
        // Sur le papier, le glissement dans le tableau de numération n'a pas
        // d'équivalent — c'est justement ce que l'écran apporte. Reste
        // l'égalité à compléter, qui est l'entraînement classique du chapitre.
        printGeneratorId: 'num.virgule-fiche',
        consignePapier: "Complète. Attention : « ×10, on ajoute un zéro » est faux dès qu'il y a une virgule.",
        colonnesPapier: 3,
        params: { niveau: 'facile', parPhase: 3 },
        paramSchema: [
            {
                id: 'niveau', type: 'select', label: 'Difficulté',
                aide: "En « facile », on ne fait que multiplier, par 10 ou par 100 : on installe le sens du décalage avant d'ajouter la division. Le nombre de départ a TOUJOURS une partie décimale — avec un entier, la règle fausse « on ajoute un zéro » tomberait juste et sortirait renforcée.",
                options: [
                    { value: 'facile', label: '× 10 et × 100 seulement' },
                    { value: 'moyen', label: '× et ÷ par 10, 100, 1000' },
                    { value: 'difficile', label: 'Idem, jusqu\'aux millièmes' }
                ],
                default: 'facile'
            },
            {
                id: 'parPhase', type: 'number', label: 'Réussites par temps', min: 1, max: 8, default: 3,
                aide: "Combien de fois il faut réussir avant de passer au temps suivant : d'abord faire glisser, puis choisir parmi quatre, puis écrire de tête."
            }
        ],
        skills: ['num.dec.puissances10'],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.DECIMAUX], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Trois temps. D'abord tu DÉCALES LA VIRGULE dans le tableau de numération avec les flèches : × 10 la pousse d'un rang vers la DROITE, ÷ 10 d'un rang vers la gauche. Les chiffres, eux, ne bougent pas — et c'est ce qui rend la règle visible : le chiffre qui valait des dixièmes se retrouve à gauche de la virgule, il vaut maintenant des unités. Ensuite on te demandera de choisir le résultat parmi quatre, puis de l'écrire toi-même. Attention au piège : « multiplier par 10, on ajoute un zéro » est faux dès qu'il y a une virgule — 2,5 et 2,50 sont le même nombre."
    }
];
