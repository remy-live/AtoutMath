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
    // Un seul exercice, et non trois. « Les Grands Nombres » et « Dixièmes et
    // Centièmes » n'étaient pas d'autres exercices : c'était CELUI-CI avec
    // `max` poussé au million et `decimaux` sur « toujours » — deux réglages
    // que le générateur offrait déjà et que personne ne pouvait atteindre,
    // faute d'être exposés. Les anciens titres passent en mots-clefs pour que
    // la recherche continue de mener ici.
    {
        id: 'num-lettres',
        consignePapier: "Écris en chiffres.",
        colonnesPapier: 2,
        title: 'Des Lettres aux Chiffres',
        generatorId: 'num.lettres', activityId: 'numpad',
        params: { max: 1000, decimaux: 'non' },
        motsClefs: ['grands nombres', 'millions', 'milliers', 'dixièmes', 'centièmes', 'décimaux'],
        tags: { chemin: [D, NUM], niveaux: [CM2, SIXIEME] },
        instruction: "Lis le nombre écrit en toutes lettres et saisis-le en chiffres. "
            + "Le réglage « Jusqu'à » monte jusqu'au million ; « Rangs décimaux » ajoute les dixièmes et les centièmes."
    },

    // --- Rang des chiffres (fiche § 17, 27) ---
    {
        id: 'num-rang',
        consignePapier: "",
        title: 'Chasse au Chiffre',
        generatorId: 'num.chiffre-rang', activityId: 'bubbles',
        params: { partie: 'entière', decimales: 2 },
        motsClefs: ['rang', 'dizaines', 'dixièmes', 'centièmes', 'partie décimale'],
        tags: { chemin: [D, NUM], niveaux: [CM2, SIXIEME] },
        instruction: "Trouve le chiffre qui occupe le rang demandé. "
            + "Passe « Rangs interrogés » sur « les deux » pour affronter le piège du chapitre : "
            + "dizaines et dixièmes ne sont pas le même rang."
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
        motsClefs: ['conversions décimales', 'dixièmes', 'centièmes'],
        tags: { chemin: [D, NUM], niveaux: [SIXIEME] },
        instruction: "Combien font 785 centaines ? Convertis en unités. "
            + "Le réglage « Nombres décimaux » ajoute les dixièmes et les centièmes."
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
        motsClefs: ['virgule', 'arrondi', 'entier le plus proche'],
        tags: { chemin: [D, MENTAL], niveaux: [SIXIEME] },
        instruction: "Donne le nombre rond le plus proche : c'est l'ordre de grandeur. "
            + "Avec « Nombres décimaux », on cherche l'entier le plus proche : 7,98 est presque 8."
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
        motsClefs: ['graduation', 'abscisse', 'décimaux', 'intercaler', 'axe', 'centièmes', 'loupe'],
        tags: { chemin: [D, DEC], niveaux: [CM2, SIXIEME, CINQUIEME, QUATRIEME] },
        instruction: "Entre les deux grands traits, l'axe est coupé en DIX. On compte les INTERVALLES depuis le trait de gauche, jamais les traits. Puis on recommence un cran plus bas : entre 3,5 et 3,6, il y a encore dix intervalles, et un intervalle vaut 0,01. Le réglage « Le pas de la graduation » permet de rester aux centièmes du début à la fin."
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
        motsClefs: ['somme', 'différence', 'produit', 'quotient', 'termes', 'facteurs',
            'dividende', 'vocabulaire', 'double', 'triple', 'moitié', 'traduire', 'phrase'],
        tags: { chemin: [D, MENTAL], niveaux: [SIXIEME, CINQUIEME, QUATRIEME] },
        instruction: "Somme, différence, produit, quotient : ces mots nomment le RÉSULTAT d'une opération, pas l'opération elle-même. Les nombres, eux, s'appellent les termes dans une addition et les facteurs dans une multiplication. Attention au petit mot de liaison : la somme de 3 ET 2, mais le produit de 3 PAR 2. Le réglage « Ce qu'on demande » permet de ne garder que la traduction phrase ↔ calcul."
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
    // Quatre portes d'entrée sur la même notion, et donc UN exercice : le
    // réglage « Niveau » choisit le modèle. En progressif on traverse
    // l'ascenseur, le thermomètre, les pastilles puis l'écriture ; en fixant un
    // niveau on REVIENT sur le modèle où l'élève bloque. C'était déjà exactement
    // ce que faisaient les quatre entrées séparées, à ceci près qu'aucune ne
    // laissait passer d'un modèle à l'autre sans ressortir de l'exercice.
    {
        id: 'num-relatifs', title: 'Nombres Relatifs',
        consignePapier: "Calcule.",
        colonnesPapier: 3,
        generatorId: 'num.relatifs', activityId: 'relatifs',
        params: { niveau: 'progressif', reponse: 'saisie' },
        motsClefs: ['thermomètre', 'ascenseur', 'pastilles', 'températures',
            'sommes de relatifs', 'négatifs', 'la montée'],
        tags: { chemin: [D, REL], niveaux: [CINQUIEME, QUATRIEME] },
        instruction: "Un nombre relatif, c'est une POSITION. L'addition, c'est un DÉPLACEMENT : compte les crans, n'additionne pas les distances. Le réglage « Niveau » choisit le modèle — l'ascenseur, le thermomètre, les pastilles qui s'annulent, ou l'écriture (+3) + (−5) — ou les enchaîne tous."
    },
    {
        id: 'num-dictee', status: STATUS.TEST, title: 'Dictée de Grands Nombres',
        activityId: 'dictee', skills: ['num.ecriture.lettres'],
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
        // LE MÊME JEU, TROIS RÈGLES — donc un exercice, et non quatre.
        //
        // Le geste est identique dans tous les cas : des objets traversent
        // l'écran, on décide de chacun. Seule la RÈGLE change, et elle tenait
        // déjà dans le paramètre `mode` que le jeu lisait. Les quatre entrées
        // séparées cachaient d'ailleurs un défaut : « Ninja des Nombres »
        // réglait `cibleMax` et `lives`, deux noms que rien dans le code ne
        // lisait, et ne disait pas son mode — il servait donc les résultats
        // négatifs, à l'identique du « Ninja des Résultats Négatifs », avec
        // deux curseurs sans effet.
        id: 'num-ninja', status: STATUS.TEST, title: 'Ninja des Nombres',
        // Trois règles pour le même geste : les zéros inutiles d'un côté, le
        // signe d'une somme de relatifs de l'autre. Les deux sont déclarées.
        activityId: 'ninja', skills: ['num.decimal.zeros', 'num.relatifs.somme'],
        // Un objet raté est une erreur de règle, pas une erreur de calcul : on
        // l'affiche tout de suite, mais on ne surcharge pas le carnet avec les
        // ratés de vitesse.
        sansRevision: true,
        params: { vitesse: 'normale', mode: 'negatifs', vies: 3, parVague: 5 },
        paramSchema: [
            {
                id: 'mode', type: 'select', label: 'Ce qu\'on coupe', default: 'negatifs',
                aide: 'Trois règles pour le même geste. « Zéros inutiles » travaille l\'écriture décimale ; les deux autres, le signe d\'une somme de relatifs — l\'un en tranchant, l\'autre en tirant.',
                options: [
                    { value: 'negatifs', label: 'Les résultats négatifs' },
                    { value: 'positifs', label: 'Les résultats positifs (au tir)' },
                    { value: 'zeros', label: 'Les zéros inutiles' }
                ]
            },
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
                id: 'parVague', type: 'select', label: 'Objets par vague',
                options: [{ value: 3, label: '3' }, { value: 5, label: '5' }, { value: 7, label: '7' }],
                default: 5
            }
        ],
        motsClefs: ['zéros inutiles', 'décimaux', 'relatifs', 'négatifs', 'positifs', 'tir', 'trancher'],
        tags: { chemin: [D, REL], niveaux: [CM2, SIXIEME, CINQUIEME, QUATRIEME] },
        instruction: "Des objets traversent l'écran, chacun porte un nombre ou un calcul, et la règle est écrite en haut du début à la fin. Coupe ceux qu'elle désigne, laisse filer les autres : se tromper coûte une vie, laisser passer aussi — ne rien faire n'est pas une stratégie. Le réglage « Ce qu'on coupe » change la règle : les résultats négatifs, les résultats positifs (on tire au lieu de trancher), ou les zéros inutiles d'une écriture décimale."
    },
    {
        id: 'num-relatifs-addition',
        consignePapier: "Simplifie et calcule.",
        colonnesPapier: 3,
        title: 'Additionner des Relatifs, pas à pas',
        generatorId: 'num.relatifs.addition', activityId: 'add-relatifs',
        params: { etape: 'progressif', reponse: 'saisie' },
        motsClefs: ['signes différents', 'pastilles', 'simplifier', 'écriture'],
        tags: { chemin: [D, REL], niveaux: [CINQUIEME, QUATRIEME] },
        instruction: "Douze marches, deux questions chacune. D'abord des pastilles toutes de la même couleur — il n'y a qu'à compter, et on apprend l'écriture. Puis des pastilles des DEUX couleurs : une rouge et une bleue valent zéro ensemble, on les élimine par paires, et la soustraction apparaît toute seule. Ensuite on simplifie les écritures, et on finit avec une virgule. Le réglage « Étape » permet de se poser sur le passage difficile — (+7) + (−3) — et d'y rester."
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
