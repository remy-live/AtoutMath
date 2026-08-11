import { TAGS } from './tags.js';
import { STATUS } from './status.js';

// `status` absent = validé. Ne sont marqués que les exercices qui ne le sont
// pas encore — ici les jeux autonomes, qui n'ont pas été portés sur le contrat
// Item : ils n'ont ni aides graduées ni distracteurs expliqués.

// Un exercice n'est plus du code : c'est un assemblage déclaratif
//   générateur (quelle question)  ×  activité (comment on y répond)
// plus des paramètres. Aucun `gameType` pointant vers un fichier, aucun
// `paramSchema` recopié : le schéma de configuration est déduit du registre
// (voir js/games/configUI.js).
//
// Conséquence : proposer « les fractions dans le jeu des taupes » ne demande
// aucun développement, seulement une ligne de plus dans ce fichier.

export const calculExercises = [
    {
        id: 'calc-add', title: 'Additions Mystères',
        generatorId: 'calc.addition', activityId: 'bubbles',
        params: { max: 10 },
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME] },
        instruction: "Trouve la somme des deux nombres affichés et sélectionne la bonne bulle."
    },
    {
        id: 'calc-sub', title: 'Soustractions Éclair',
        generatorId: 'calc.soustraction', activityId: 'bubbles',
        params: { max: 20 },
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME] },
        instruction: "Calcule la différence et clique sur la bonne bulle."
    },
    {
        id: 'calc-mult-flash', title: 'Flash Mult',
        generatorId: 'calc.mult.fact', activityId: 'bubbles',
        params: { tables: [2, 3, 4, 5, 6, 7, 8, 9, 10] },
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL, TAGS.THEME.TABLES], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME] },
        instruction: "Choisis la bulle qui contient le résultat correct de la multiplication."
    },
    {
        id: 'calc-pythagore', title: 'Table de Pythagore',
        generatorId: 'calc.mult.fact', activityId: 'pythagore',
        params: { tables: [2, 3, 4, 5, 6, 7, 8, 9, 10] },
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL, TAGS.THEME.TABLES], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME] },
        instruction: "Le résultat est donné, la table est vide : clique une case dont ligne × colonne fait ce résultat. Toutes les décompositions justes sont acceptées (6×7 comme 7×6)."
    },
    {
        id: 'calc-mult-missing', title: 'Facteur Manquant',
        generatorId: 'calc.mult.missing', activityId: 'digicode',
        params: { tables: [2, 3, 4, 5, 6, 7, 8, 9, 10] },
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL, TAGS.THEME.TABLES], niveaux: [TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Trouve le nombre manquant dans l'égalité et sélectionne-le sur le digicode."
    },
    {
        id: 'calc-division', title: 'Divisions Express',
        generatorId: 'calc.division', activityId: 'bubbles',
        params: { tables: [2, 3, 4, 5, 6, 7, 8, 9, 10] },
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL], niveaux: [TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Trouve le quotient exact de la division affichée."
    },
    {
        id: 'calc-prio', title: 'Prio-Bot Express',
        generatorId: 'calc.priorites', activityId: 'buttons',
        params: { mode: 'operation' },
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.PRIORITES], niveaux: [TAGS.NIVEAU.CINQUIEME] },
        instruction: "Sélectionne l'opération à effectuer en premier selon les règles de priorité."
    },
    {
        id: 'calc-prio-resultat', title: 'Prio-Bot Calcul',
        generatorId: 'calc.priorites', activityId: 'bubbles',
        params: { mode: 'resultat' },
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.PRIORITES], niveaux: [TAGS.NIVEAU.CINQUIEME, TAGS.NIVEAU.QUATRIEME] },
        instruction: "Calcule l'expression en respectant les priorités opératoires."
    },

    // --- Arcade : mêmes notions, autre présentation ---
    {
        id: 'calc-arcade-sprint', title: 'Sprint Chrono',
        generatorId: 'calc.mixte', activityId: 'bubbles',
        params: { operations: ['+', '-'], max: 20, timeLimit: 60, minScore: 10 },
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL], niveaux: [TAGS.NIVEAU.SIXIEME] },
        instruction: "Réponds au plus grand nombre de calculs possible avant la fin du chronomètre !"
    },
    {
        id: 'calc-arcade-moles', title: 'Chasse aux Taupes',
        generatorId: 'calc.mixte', activityId: 'moles',
        params: { operations: ['+', '-'], max: 20, timeLimit: 60, minScore: 10 },
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL], niveaux: [TAGS.NIVEAU.SIXIEME] },
        instruction: "Tape sur la taupe qui porte le bon résultat !"
    },
    {
        id: 'calc-moles-tables', title: 'Taupes des Tables',
        generatorId: 'calc.mult.fact', activityId: 'moles',
        params: { tables: [6, 7, 8, 9], timeLimit: 60, minScore: 10 },
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL, TAGS.THEME.TABLES], niveaux: [TAGS.NIVEAU.SIXIEME] },
        instruction: "Tape sur la taupe qui porte le bon produit !"
    },

    // --- Jeux autonomes : logique de plateau propre, contenu interne ---
    {
        id: 'calc-arcade-shooter', status: STATUS.TEST, title: 'Météorites Mathématiques',
        activityId: 'shooter',
        params: { tables: [2, 3, 4, 5, 6, 7, 8, 9, 10], difficulty: 'medium' },
        paramSchema: [
            { id: 'tables', type: 'multiselect', label: 'Tables à travailler', options: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], default: [2, 3, 4, 5, 6, 7, 8, 9, 10] },
            { id: 'difficulty', type: 'select', label: 'Difficulté', options: ['easy', 'medium', 'hard'], default: 'medium' }
        ],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL, TAGS.THEME.TABLES], niveaux: [TAGS.NIVEAU.SIXIEME] },
        instruction: "Ton vaisseau suit ta souris (ou ton doigt). Tire sur toutes les météorites qui portent un MAUVAIS résultat, et attrape la BONNE réponse avec ton vaisseau !"
    },
    {
        id: 'calc-math-memory', status: STATUS.TEST, title: 'Memory des Tables',
        activityId: 'memory',
        params: { tables: [2, 3, 4, 5, 6, 7, 8, 9, 10], pairs: 6 },
        paramSchema: [
            { id: 'tables', type: 'multiselect', label: 'Tables à travailler', options: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], default: [2, 3, 4, 5, 6, 7, 8, 9, 10] },
            { id: 'pairs', type: 'select', label: 'Nombre de paires', options: [4, 6, 8, 10], default: 6 }
        ],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL, TAGS.THEME.TABLES], niveaux: [TAGS.NIVEAU.SIXIEME] },
        instruction: "Associe chaque opération à son résultat pour nettoyer le plateau !"
    },
    {
        id: 'calc-labyrinthe', status: STATUS.TEST, title: 'Labyrinthe Mathématique',
        activityId: 'labyrinthe',
        params: { timeLimit: 60, timeReduction: 5, operations: ['*'], tables: [2, 3, 4, 5, 6, 7, 8, 9, 10] },
        paramSchema: [
            { id: 'timeLimit', type: 'number', label: 'Temps initial (s)', default: 60 },
            { id: 'timeReduction', type: 'number', label: 'Temps perdu par niveau (s)', default: 5 },
            { id: 'operations', type: 'multiselect', label: 'Opérations', options: [{ value: '+', label: '+ addition' }, { value: '-', label: '− soustraction' }, { value: '*', label: '× multiplication' }, { value: '/', label: '÷ division' }], default: ['*'] },
            { id: 'tables', type: 'multiselect', label: 'Tables (si multiplication)', options: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], default: [2, 3, 4, 5, 6, 7, 8, 9, 10] }
        ],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL], niveaux: [TAGS.NIVEAU.SIXIEME] },
        instruction: "Déplace-toi vers la case contenant la bonne réponse pour atteindre la sortie."
    },
    {
        id: 'calc-mathodu', status: STATUS.TEST, title: 'Mathdoku',
        generatorId: 'logique.mathodu', activityId: 'kenken',
        // Une erreur de placement dans une grille ne se révise pas : « case B3 »
        // n'est pas une question qu'on peut reposer hors de SA grille. Comme le
        // sudoku et le binairo, le Mathdoku entraîne le raisonnement, pas une
        // connaissance ; ses entrées noyaient un carnet qui doit se lire vite.
        sansRevision: true,
        // Fiche imprimable : des grilles à raturer, pour travailler sur papier.
        printable: 'mathdoku',
        // 3 grilles par défaut : une grille est une « question » longue, dix
        // seraient une punition.
        params: { nbQuestions: 3, chiffres: '1-4', operations: ['add', 'sub'], difficulte: 'facile' },
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.LOGIQUE], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Remplis la grille : chaque chiffre une fois par ligne et par colonne, et chaque zone doit donner le résultat écrit dans son coin."
    },
    {
        id: 'calc-binairo', status: STATUS.TEST, title: 'Binairo',
        generatorId: 'logique.binairo', activityId: 'binairo',
        sansRevision: true,
        printable: 'binairo',
        params: { nbQuestions: 3, taille: 6, difficulte: 'facile' },
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.LOGIQUE], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Remplis la grille avec des 0 et des 1 : autant de chaque sur chaque ligne et chaque colonne, jamais trois identiques à la suite."
    },
    {
        id: 'calc-nova', status: STATUS.TEST, title: 'Nova',
        activityId: 'nova',
        params: { tables: [2, 3, 4, 5, 6, 7, 8, 9, 10], lives: 3, entrePortes: 18 },
        paramSchema: [
            { id: 'tables', type: 'multiselect', label: 'Tables des portes', options: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], default: [2, 3, 4, 5, 6, 7, 8, 9, 10] },
            { id: 'lives', type: 'number', label: 'Vies', min: 1, max: 5, default: 3 },
            { id: 'entrePortes', type: 'number', label: 'Secondes entre deux murs', min: 8, max: 40, default: 18 }
        ],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL, TAGS.THEME.TABLES], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME] },
        instruction: "Un shoot'em up : glisse pour piloter, le canon tire tout seul — doigt posé pour charger le rayon lourd, double tape pour la bombe NOVA. Deux épreuves de calcul alternent : les MURS (franchis la porte du bon résultat) et les CONVOIS (place-toi sous le transporteur du bon résultat pour l'abattre). Chaque bonne porte ouvre le secteur suivant, plus dur : chasseurs, plongeurs kamikazes, blindés, tireurs d'élite — et tout ce qui te touche fait mal."
    },
    {
        id: 'calc-escadrille', status: STATUS.TEST, title: 'Escadrille des Tables',
        activityId: 'escadrille',
        params: { table: 7, lives: 3, rythme: 'lent' },
        paramSchema: [
            {
                id: 'table', type: 'select', label: 'Table à défendre', default: 7,
                options: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => ({ value: n, label: `Table de ${n}` }))
            },
            { id: 'lives', type: 'number', label: 'Vies', min: 1, max: 5, default: 3 },
            {
                id: 'rythme', type: 'select', label: 'Rythme', default: 'lent',
                options: [
                    { value: 'lent', label: 'Lent (temps de calculer)' },
                    { value: 'normal', label: 'Normal' },
                    { value: 'rapide', label: 'Rapide' }
                ]
            }
        ],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL, TAGS.THEME.TABLES], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME] },
        instruction: "Une escadrille descend, chaque appareil portant un nombre. Abats tout ce qui n'est PAS dans la table choisie et laisse passer les multiples — ce sont des amis. Glisse pour piloter, tape pour tirer. Tirer sur un ami coûte une vie ; laisser un intrus atteindre la base aussi."
    },
    {
        id: 'calc-ninja', status: STATUS.TEST, title: 'Ninja des Nombres',
        activityId: 'ninja',
        params: { cibleMax: 20, lives: 3, rythme: 'lent' },
        paramSchema: [
            { id: 'cibleMax', type: 'number', label: 'Cible jusqu\'à', min: 8, max: 60, default: 20 },
            { id: 'lives', type: 'number', label: 'Vies', min: 1, max: 5, default: 3 },
            {
                id: 'rythme', type: 'select', label: 'Rythme', default: 'lent',
                options: [
                    { value: 'lent', label: 'Lent (temps de calculer)' },
                    { value: 'normal', label: 'Normal' },
                    { value: 'rapide', label: 'Rapide' }
                ]
            }
        ],
        skills: ['num.calc.decomposition'],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME] },
        instruction: "Un nombre cible s'affiche : tranche d'un geste tous les fruits dont le calcul fait EXACTEMENT ce nombre — et laisse retomber les autres. Calcule avant de trancher !"
    },
    {
        id: 'calc-sudoku', status: STATUS.TEST, title: 'Sudoku',
        generatorId: 'logique.sudoku', activityId: 'sudoku',
        sansRevision: true,
        params: { nbQuestions: 2, taille: 6, difficulte: 'facile' },
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.LOGIQUE], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Chaque chiffre ne doit apparaître qu'une seule fois par ligne, par colonne et par bloc. Commence par les cases où un seul chiffre est encore possible : chacune en débloque d'autres."
    },
    {
        id: 'calc-garam', status: STATUS.TEST, title: 'Garam',
        generatorId: 'logique.garam', activityId: 'garam',
        sansRevision: true,
        printable: 'garam',
        params: { nbQuestions: 2, taille: 'complet', operations: ['add', 'sub', 'mul'], difficulte: 'facile' },
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.LOGIQUE], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Le Garam des fiches officielles : quatre blocs d'égalités reliés par des ponts. Complète les cases avec des chiffres pour que TOUTES les égalités soient vraies, horizontales comme verticales. Une égalité verticale dépasse toujours dix : son résultat s'écrit sur deux cases empilées, dizaines au-dessus, unités en dessous — et la case du bas sert aussi à l'égalité horizontale."
    },
    {
        id: 'calc-course', status: STATUS.TEST, title: 'Course Mathématique',
        activityId: 'course',
        // Plus de `internalStudentConfig` : les réglages du jeu (voies, calculs)
        // étaient définis dans le schéma mais inatteignables — ni l'élève ni le
        // professeur ne pouvaient les changer, le jeu démarrait toujours sur
        // trois voies de tables de multiplication.
        params: { mode: 'survival', lanes: 3, speed: 3, operations: ['mul'] },
        paramSchema: [
            {
                id: 'mode', type: 'select', label: 'Mode de jeu', default: 'survival',
                options: [
                    { value: 'survival', label: 'Survie (3 vies)' },
                    { value: 'chrono', label: 'Contre la montre (60 s)' },
                    { value: 'sprint', label: 'Sprint (20 questions)' }
                ]
            },
            { id: 'lanes', type: 'number', label: 'Nombre de voies', default: 3, min: 2, max: 5 },
            { id: 'speed', type: 'number', label: 'Vitesse de départ', default: 3, min: 2, max: 8 },
            {
                // Les puces portent l'OPÉRATION, pas son nom. « Tables de
                // multiplication » tient sur toute une ligne et se lit moins
                // vite que « 7 × 8 » : un exemple dit le type de calcul en
                // trois caractères, et six réglages tiennent alors sur deux
                // rangées au lieu de quatre.
                id: 'operations', type: 'multiselect', label: 'Types de calcul', default: ['mul'],
                options: [
                    { value: 'mul', label: '7 × 8', aide: 'Tables de multiplication' },
                    { value: 'div', label: '56 ÷ 7', aide: 'Divisions' },
                    { value: '+9', label: '+9 / −9', aide: 'Ajouter ou retirer 9' },
                    { value: 'c10', label: '? + 3 = 10', aide: 'Compléments à 10' },
                    { value: 'rel', label: '−3 + 5', aide: 'Nombres relatifs' },
                    { value: 'dec', label: '× 10 / × 0,1', aide: 'Multiplier par 10 ou par 0,1' }
                ]
            }
        ],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL], niveaux: [TAGS.NIVEAU.SIXIEME] },
        instruction: "Dirige le véhicule vers la bonne réponse pour continuer la course !"
    },
    {
        id: 'calc-tetris', status: STATUS.TEST, title: 'Math Tetris',
        activityId: 'tetris',
        params: { tables: [2, 3, 4, 5, 6, 7, 8, 9, 10], speed: 1000 },
        paramSchema: [
            { id: 'tables', type: 'multiselect', label: 'Tables', options: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], default: [2, 3, 4, 5, 6, 7, 8, 9, 10] },
            { id: 'speed', type: 'number', label: 'Vitesse de chute (ms)', default: 1000 }
        ],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL, TAGS.THEME.TABLES], niveaux: [TAGS.NIVEAU.SIXIEME] },
        instruction: "Combine les blocs pour que leur produit donne la cible demandée !"
    },
    {
        id: 'calc-vault', status: STATUS.TEST, title: 'Le Coffre-Fort',
        activityId: 'vault',
        params: { maxNumber: 100, attempts: 10 },
        paramSchema: [
            { id: 'maxNumber', type: 'select', label: 'Code entre 1 et…', options: [50, 100, 200, 500, 1000], default: 100 },
            { id: 'attempts', type: 'number', label: 'Essais par coffre', default: 10, min: 4, max: 15 }
        ],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.LOGIQUE], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME] },
        instruction: "Trouve le code secret ! À chaque essai, le coffre répond « c'est plus » ou « c'est moins ». Astuce de champion : propose toujours le milieu de la zone possible."
    },
    {
        id: 'calc-duel', status: STATUS.TEST, title: 'Duel des Tables (à deux)',
        activityId: 'duel',
        params: { tables: [2, 3, 4, 5, 6, 7, 8, 9, 10], cible: 7, operations: 'mul' },
        paramSchema: [
            { id: 'tables', type: 'multiselect', label: 'Tables jouables', options: [2, 3, 4, 5, 6, 7, 8, 9, 10], default: [2, 3, 4, 5, 6, 7, 8, 9, 10] },
            { id: 'cible', type: 'select', label: 'Partie en', options: [5, 7, 11], default: 7 },
            {
                id: 'operations', type: 'select', label: 'Opérations',
                options: [
                    { value: 'mul', label: 'Multiplications seules' },
                    { value: 'muldiv', label: 'Multiplications et divisions' }
                ],
                default: 'mul'
            }
        ],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL, TAGS.THEME.TABLES], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        deuxJoueurs: true,
        instruction: "À DEUX, sur une tablette posée à plat entre vous. Le serveur choisit une table, puis la balle fait des allers-retours : celui qui la reçoit tape le résultat avant qu'elle n'atteigne sa ligne. Elle accélère à chaque renvoi. Rien n'est enregistré dans le carnet — c'est un duel."
    },
    {
        id: 'calc-arpenteurs', status: STATUS.TEST, title: 'Les Arpenteurs',
        activityId: 'arpenteurs',
        deuxJoueurs: true,
        // À deux sur un seul compte : attribuer les coups de l'un aux
        // statistiques de l'autre ne voudrait rien dire. Rien n'est enregistré,
        // comme pour le Duel des Tables.
        sansRevision: true,
        params: { terrain: 'moyen', table: 10, bandes: false },
        paramSchema: [
            {
                id: 'terrain', type: 'select', label: 'Taille du terrain',
                options: [
                    { value: 'petit', label: '18 × 12 — partie rapide' },
                    { value: 'moyen', label: '24 × 16' },
                    { value: 'grand', label: '30 × 20 — partie longue' }
                ],
                default: 'moyen'
            },
            {
                id: 'table', type: 'select', label: 'Nombres tirés',
                aide: 'Les nombres viennent de la table de Pythagore. En s\'arrêtant à 7, les parcelles restent petites et la partie plus longue.',
                options: [
                    { value: 7, label: 'Jusqu\'à 7 × 7' },
                    { value: 10, label: 'Toute la table (jusqu\'à 10 × 10)' }
                ],
                default: 10
            },
            {
                id: 'bandes', type: 'checkbox', label: 'Autoriser les bandes d\'une case',
                aide: 'Une bande de 1 case de large reste presque toujours posable : la fin de partie devient un remplissage mécanique, sans plus rien à décomposer.',
                default: false
            }
        ],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL, TAGS.THEME.TABLES], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "À DEUX sur la même tablette. Un nombre de la table de Pythagore tombe — 36 — et celui dont c'est le tour clôture une parcelle de 36 cases : 6 × 6, 4 × 9, 3 × 12, comme il veut, où il veut. Glisse le doigt d'un coin à l'autre : l'aire s'affiche pendant le tracé. Le premier qui ne peut plus poser a perdu. Rien n'est enregistré dans le profil : c'est un duel."
    },
    {
        id: 'voc-mots-caches', status: STATUS.TEST, title: 'Mots Cachés Mathématiques',
        activityId: 'motscaches',
        // Les erreurs n'ont rien à réviser ici : un tracé raté est un essai, pas
        // une faute, et le jeu n'en enregistre aucun.
        sansRevision: true,
        params: { theme: 'tout', taille: 12, nbMots: 10, diagonales: true, envers: false },
        paramSchema: [
            {
                id: 'theme', type: 'select', label: 'Vocabulaire',
                options: [
                    { value: 'tout', label: 'Tout le vocabulaire' },
                    { value: 'geometrie', label: 'Géométrie' },
                    { value: 'nombres', label: 'Les nombres' },
                    { value: 'calcul', label: 'Le calcul' },
                    { value: 'mesures', label: 'Grandeurs et mesures' }
                ],
                default: 'tout'
            },
            {
                id: 'taille', type: 'select', label: 'Taille de la grille',
                options: [
                    { value: 10, label: '10 × 10' },
                    { value: 12, label: '12 × 12' },
                    { value: 14, label: '14 × 14' },
                    { value: 16, label: '16 × 16 — pour les mots longs' }
                ],
                default: 12
            },
            {
                id: 'nbMots', type: 'select', label: 'Nombre de mots',
                options: [
                    { value: 6, label: '6 mots' },
                    { value: 10, label: '10 mots' },
                    { value: 14, label: '14 mots' }
                ],
                default: 10
            },
            {
                id: 'diagonales', type: 'checkbox', label: 'Mots en diagonale',
                aide: 'Sans les diagonales, la grille se lit uniquement en lignes et en colonnes — nettement plus facile.',
                default: true
            },
            {
                id: 'envers', type: 'checkbox', label: 'Mots écrits à l\'envers',
                aide: 'De droite à gauche et de bas en haut : à réserver aux élèves qui trouvent la grille trop rapide.',
                default: false
            }
        ],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.LOGIQUE], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME, TAGS.NIVEAU.QUATRIEME] },
        instruction: "Glisse ton doigt de la première à la dernière lettre pour tracer un mot. Chaque mot trouvé affiche SA DÉFINITION : c'est le vocabulaire que ton cours emploie sans toujours l'expliquer. Le bouton 💡 fait l'inverse — il donne la définition, à toi de retrouver le mot."
    },
    {
        id: 'calc-chantier', status: STATUS.TEST, title: 'Le Chantier des Blocs',
        activityId: 'chantier',
        params: { depart: 'ch1' },
        paramSchema: [
            {
                id: 'depart', type: 'select', label: 'Commencer au niveau',
                aide: 'Les vingt-cinq niveaux s\'enchaînent tout seuls, du plus court au plus long ; ce réglage sert à reprendre plus loin ou à montrer directement un niveau à deux résultats identiques.',
                options: [
                    { value: 'ch1', label: '1 · Le premier bloc' },
                    { value: 'ch2', label: '2 · Glisser jusqu\'au coin' },
                    { value: 'ch3', label: '3 · Chacun sa dalle' },
                    { value: 'ch4', label: '4 · Le bloc devient un mur' },
                    { value: 'ch5', label: '5 · Deux façons de faire 16' },
                    { value: 'ch6', label: '6 · Trente-six des deux côtés' },
                    { value: 'ch7', label: '7 · Les deux couloirs' },
                    { value: 'ch8', label: '8 · Le coude' },
                    { value: 'ch9', label: '9 · Soixante-quatre en double' },
                    { value: 'ch10', label: '10 · Le chantier encombré' },
                    { value: 'ch11', label: '11 · Cinquante-six, deux fois' },
                    { value: 'ch12', label: '12 · Le chantier' },
                    { value: 'ch13', label: '13 · La longue traversée' },
                    { value: 'ch14', label: '14 · Quatre à la fois' },
                    { value: 'ch15', label: '15 · L\'ordre décide' },
                    { value: 'ch16', label: '16 · Le détour obligé' },
                    { value: 'ch17', label: '17 · Le grand chantier' },
                    { value: 'ch18', label: '18 · La cour ouverte' },
                    { value: 'ch19', label: '19 · Soixante-quatre, encore' },
                    { value: 'ch20', label: '20 · Le fond du couloir' },
                    { value: 'ch21', label: '21 · Deux blocs, dix coups' },
                    { value: 'ch22', label: '22 · Le chantier en étage' },
                    { value: 'ch23', label: '23 · Le grand tour' },
                    { value: 'ch24', label: '24 · Soixante-douze en double' },
                    { value: 'ch25', label: '25 · La grande cour' }
                ],
                default: 'ch1'
            }
        ],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL, TAGS.THEME.TABLES], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Chaque bloc porte une multiplication, chaque dalle creuse porte un résultat. Un bloc poussé GLISSE jusqu'au premier obstacle : s'il s'arrête sur la dalle qui porte son résultat, il se pose — et devient lui-même un mur. Touche un bloc, puis la case d'arrivée (ou balaye du doigt). Sur les derniers niveaux, deux blocs valent la même chose : le calcul ne suffit plus, il faut choisir lequel va où."
    },
    {
        // Trois jeux de plateau, un seul moteur d'affichage (games/plateau.js)
        // et une seule IA (core/ia.js). Les règles, testées sans navigateur,
        // vivent chacune dans leur module — les échecs validés au perft.
        id: 'logi-othello', status: STATUS.TEST, title: 'Othello',
        activityId: 'othello',
        params: { mode: 'ia', niveau: 'moyen' },
        paramSchema: [
            {
                id: 'mode', type: 'select', label: 'Adversaire',
                options: [
                    { value: 'ia', label: "Contre l'ordinateur" },
                    { value: 'deux', label: 'À deux sur le même écran' }
                ],
                default: 'ia'
            },
            {
                id: 'niveau', type: 'select', label: "Niveau de l'ordinateur",
                aide: "Deux réglages en un : jusqu'où l'ordinateur calcule, et sa part de coups joués au hasard — c'est elle qui le rend battable.",
                options: [
                    { value: 'facile', label: 'Débutant — il se trompe souvent' },
                    { value: 'moyen', label: 'Moyen' },
                    { value: 'fort', label: 'Fort — il ne se trompe plus' }
                ],
                default: 'moyen'
            }
        ],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.LOGIQUE], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME, TAGS.NIVEAU.QUATRIEME] },
        instruction: "Un pion posé ENCADRE : tous les pions adverses pris entre lui et un autre de tes pions se retournent. On ne joue que là où l'on retourne au moins un pion — les cases allumées te les montrent. À la fin, celui qui a le plus de pions gagne. Les coins ne se reprennent jamais : vise-les, et méfie-toi des cases qui les touchent."
    },
    {
        id: 'logi-dames', status: STATUS.TEST, title: 'Jeu de Dames',
        activityId: 'dames',
        params: { mode: 'ia', niveau: 'moyen' },
        paramSchema: [
            {
                id: 'mode', type: 'select', label: 'Adversaire',
                options: [
                    { value: 'ia', label: "Contre l'ordinateur" },
                    { value: 'deux', label: 'À deux sur le même écran' }
                ],
                default: 'ia'
            },
            {
                id: 'niveau', type: 'select', label: "Niveau de l'ordinateur",
                aide: "Deux réglages en un : jusqu'où l'ordinateur calcule, et sa part de coups joués au hasard — c'est elle qui le rend battable.",
                options: [
                    { value: 'facile', label: 'Débutant — il se trompe souvent' },
                    { value: 'moyen', label: 'Moyen' },
                    { value: 'fort', label: 'Fort — il ne se trompe plus' }
                ],
                default: 'moyen'
            }
        ],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.LOGIQUE], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME, TAGS.NIVEAU.QUATRIEME] },
        instruction: "Les vraies règles françaises, sur le damier 10 × 10 : la prise est OBLIGATOIRE, et quand plusieurs rafles sont possibles, on joue celle qui prend le PLUS de pièces — compte avant de bouger. Le pion avance tout droit mais prend aussi en arrière ; arrivé au bout, il devient dame, et la dame vole sur toute la diagonale. Touche une pièce : ses coups s'allument."
    },
    {
        id: 'logi-echecs', status: STATUS.TEST, title: 'Échecs',
        activityId: 'echecs',
        params: { mode: 'ia', niveau: 'moyen' },
        paramSchema: [
            {
                id: 'mode', type: 'select', label: 'Adversaire',
                options: [
                    { value: 'ia', label: "Contre l'ordinateur" },
                    { value: 'deux', label: 'À deux sur le même écran' }
                ],
                default: 'ia'
            },
            {
                id: 'niveau', type: 'select', label: "Niveau de l'ordinateur",
                aide: "Deux réglages en un : jusqu'où l'ordinateur calcule, et sa part de coups joués au hasard — c'est elle qui le rend battable.",
                options: [
                    { value: 'facile', label: 'Débutant — il se trompe souvent' },
                    { value: 'moyen', label: 'Moyen' },
                    { value: 'fort', label: 'Fort — il ne se trompe plus' }
                ],
                default: 'moyen'
            }
        ],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.LOGIQUE], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME, TAGS.NIVEAU.QUATRIEME] },
        instruction: "Les règles complètes : roque, prise en passant, promotion (à la dame), pat. Le but n'est pas de tout prendre — c'est le roi adverse. Touche une pièce pour voir ses coups ; ton roi s'allume en rouge quand il est en échec. Contre l'ordinateur, commence en Débutant : il voit un coup devant lui et se trompe souvent, c'est fait pour."
    },
    {
        id: 'logi-demineur', status: STATUS.TEST, title: 'Le Démineur',
        activityId: 'demineur',
        sansRevision: true,
        params: { niveau: 'debutant', vies: 3 },
        paramSchema: [
            {
                id: 'vies', type: 'select', label: 'Vies',
                options: [
                    { value: 1, label: '1 — à l\'ancienne, une mine et c\'est fini' },
                    { value: 3, label: '3 vies' },
                    { value: 5, label: '5 vies' }
                ],
                default: 3
            },
            {
                id: 'niveau', type: 'select', label: 'Grille',
                options: [
                    { value: 'debutant', label: 'Débutant · 9 × 9 · 10 mines' },
                    { value: 'confirme', label: 'Confirmé · 12 × 12 · 22 mines' },
                    { value: 'expert', label: 'Expert · 16 × 16 · 46 mines' }
                ],
                default: 'debutant'
            }
        ],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.LOGIQUE], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Les règles du démineur d'origine. Chaque chiffre compte les mines des 8 cases voisines : appui long (ou clic droit) pour poser un drapeau, 💡 pour faire expliquer la prochaine déduction certaine."
    },
    {
        id: 'calc-math-crush', status: STATUS.TEST, title: 'Math Crush',
        activityId: 'crush',
        params: { mode: 'addition', difficulty: 'progressive' },
        paramSchema: [
            { id: 'mode', type: 'select', label: 'Opération', options: ['addition', 'multiplication'], default: 'addition' },
            { id: 'difficulty', type: 'select', label: 'Difficulté', options: ['progressive', 'difficile'], default: 'progressive' }
        ],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL], niveaux: [TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME, TAGS.NIVEAU.QUATRIEME] },
        instruction: "Glisse ton doigt sur les blocs adjacents pour atteindre la cible."
    },
    {
        // LE BOUTON SCHÉMA EST L'EXERCICE. Un problème ne se rate presque
        // jamais faute de savoir calculer : il se rate faute de savoir QUELLE
        // opération faire. Alors l'élève attrape un mot — « en tout », « de
        // plus » — et le mot décide à sa place. Le schéma est la seule chose
        // qui puisse reprendre cette décision : il est donc gratuit, sans
        // pénalité et sans condition. Le cacher derrière un coût apprendrait à
        // s'en passer, exactement l'inverse du but.
        // « Histoires en pagaille » et non « atelier des problèmes » : les
        // élèves ont bien assez de problèmes comme ça, et le mot suffit à
        // fermer la porte avant d'avoir lu la première ligne. Ce sont des
        // histoires — courtes, mélangées, et c'est justement le mélange qui
        // empêche de reconnaître l'opération sans lire.
        id: 'num-problemes', status: STATUS.TEST, title: 'Histoires en Pagaille',
        activityId: 'problemes',
        params: { niveau: 'tout', familles: [] },
        paramSchema: [
            {
                id: 'niveau', type: 'select', label: 'Familles proposées',
                aide: "Filtre les types de situations selon le niveau. « Toutes » brasse les onze familles : c'est ce qui empêche l'élève de reconnaître l'opération à la place de l'énoncé.",
                options: [
                    { value: 'tout', label: 'Toutes les familles' },
                    { value: 'CM2', label: 'CM2 — réunir, changer, comparer, grouper' },
                    { value: '6ème', label: '6ème' },
                    { value: '5ème', label: '5ème — proportionnalité, durées, deux étapes' }
                ],
                default: 'tout'
            },
            {
                id: 'familles', type: 'multiselect', deroulant: true, tout: 'familles',
                label: 'Familles précises (facultatif)',
                aide: "Pour cibler une difficulté : coche les familles à travailler. Aucune cochée = toutes. Le réglage du dessus limite déjà au niveau ; celui-ci sert à isoler, par exemple, les seuls problèmes de durée.",
                options: [
                    { value: 'composition', label: 'Réunir deux quantités' },
                    { value: 'complement', label: 'Trouver la part qui manque' },
                    { value: 'transformation', label: 'Un changement (gagner, perdre, dépenser)' },
                    { value: 'comparaison', label: 'Comparer deux quantités' },
                    { value: 'groupes', label: 'Des groupes tous pareils' },
                    { value: 'partage', label: 'Partager équitablement' },
                    { value: 'quotition', label: 'Combien de paquets, et le reste' },
                    { value: 'proportion', label: 'Le prix de plusieurs articles' },
                    { value: 'fraction', label: 'Une fraction d\'une quantité' },
                    { value: 'duree', label: 'Des horaires et des durées' },
                    { value: 'deuxEtapes', label: 'Deux étapes : la monnaie rendue' }
                ],
                default: []
            }
        ],
        skills: ['num.probleme.composition', 'num.probleme.transformation',
            'num.probleme.comparaison', 'num.probleme.multiplication',
            'num.probleme.division', 'num.probleme.proportion',
            'num.probleme.fraction', 'num.probleme.duree', 'num.probleme.etapes'],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.PROBLEMES], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Lis l'histoire, puis la question — ce sont deux lectures différentes, et c'est la question qu'on oublie. Les nombres de l'énoncé sont en gras : ce sont les données. Si tu hésites sur l'opération, appuie sur « Voir le schéma » : il est fait pour ça, il ne coûte rien, et c'est lui qui doit décider — pas le mot « en tout » ni le mot « de plus ». Chaque mauvaise réponse te dit quelle erreur elle correspond."
    },
    {
        // « DANS UN TABLEAU DE PROPORTIONNALITÉ, ON MULTIPLIE TOUJOURS PAR LE
        // MÊME NOMBRE. » Tant que cette phrase n'est pas installée, l'élève
        // complète en AJOUTANT l'écart de la colonne voisine — et ça donne
        // juste assez souvent pour ne pas l'alerter. Le bouton « Montrer le
        // lien » existe pour que chercher le coefficient devienne le premier
        // geste, pas le dernier recours.
        id: 'num-proportion-tableau', status: STATUS.TEST, title: 'Tableau de Proportionnalité',
        activityId: 'proportion',
        params: { niveau: 'facile' },
        paramSchema: [
            {
                id: 'niveau', type: 'select', label: 'Difficulté',
                aide: "Le coefficient et le sens de lecture. En « facile » il est entier et on ne complète que la ligne du bas : on apprend à multiplier avant d'apprendre à diviser. Aux niveaux suivants, le tableau se complète aussi vers le haut, et le coefficient peut être décimal ou plus petit que 1 — ce qui casse l'idée fausse que « multiplier, ça fait plus grand ».",
                options: [
                    { value: 'facile', label: 'Coefficient entier, 2 cases en bas' },
                    { value: 'moyen', label: 'Coefficient décimal, 3 cases dans les deux sens' },
                    { value: 'difficile', label: '5 colonnes, 4 cases, coefficients difficiles' }
                ],
                default: 'facile'
            }
        ],
        skills: ['num.proportion.tableau'],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.PROBLEMES], niveaux: [TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME, TAGS.NIVEAU.QUATRIEME] },
        instruction: "Touche une case bleue, tape le nombre au pavé, puis ✓. La colonne surlignée en jaune est complète : c'est elle qui donne le lien entre les deux lignes. Le piège à éviter : compléter en ajoutant l'écart d'une colonne à l'autre. Dans un tableau de proportionnalité, on passe d'une ligne à l'autre en MULTIPLIANT, toujours par le même nombre. Appuie sur « Montrer le lien » pour faire apparaître ce coefficient — et la valeur pour 1, qui est l'autre chemin."
    }
];
