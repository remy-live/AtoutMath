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
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME] },
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
        id: 'calc-chantier', status: STATUS.TEST, title: 'Le Chantier des Blocs',
        activityId: 'chantier',
        params: { depart: 'ch1' },
        paramSchema: [
            {
                id: 'depart', type: 'select', label: 'Commencer au niveau',
                aide: 'Les six niveaux s\'enchaînent tout seuls ; ce réglage sert à reprendre plus loin ou à montrer directement le niveau à deux résultats identiques.',
                options: [
                    { value: 'ch1', label: '1 · Le premier bloc' },
                    { value: 'ch2', label: '2 · Glisser jusqu\'au coin' },
                    { value: 'ch3', label: '3 · Chacun sa dalle' },
                    { value: 'ch4', label: '4 · Le bloc devient un mur' },
                    { value: 'ch5', label: '5 · Deux façons de faire 16' },
                    { value: 'ch6', label: '6 · Le chantier' }
                ],
                default: 'ch1'
            }
        ],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL, TAGS.THEME.TABLES], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Chaque bloc porte une multiplication, chaque dalle creuse porte un résultat. Un bloc poussé GLISSE jusqu'au premier obstacle : s'il s'arrête sur la dalle qui porte son résultat, il se pose — et devient lui-même un mur. Touche un bloc, puis la case d'arrivée (ou balaye du doigt). Sur les derniers niveaux, deux blocs valent la même chose : le calcul ne suffit plus, il faut choisir lequel va où."
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
    }
];
