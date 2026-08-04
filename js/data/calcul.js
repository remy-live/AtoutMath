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
        instruction: "Repère la ligne et la colonne surlignées dans la table, puis clique sur le bon résultat."
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
            { id: 'operations', type: 'multiselect', label: 'Opérations', options: ['+', '-', '*', '/'], default: ['*'] },
            { id: 'tables', type: 'multiselect', label: 'Tables (si multiplication)', options: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], default: [2, 3, 4, 5, 6, 7, 8, 9, 10] }
        ],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL], niveaux: [TAGS.NIVEAU.SIXIEME] },
        instruction: "Déplace-toi vers la case contenant la bonne réponse pour atteindre la sortie."
    },
    {
        id: 'calc-mathodu', status: STATUS.TEST, title: 'Mathdoku',
        generatorId: 'logique.mathodu', activityId: 'kenken',
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
        printable: 'binairo',
        params: { nbQuestions: 3, taille: 6, difficulte: 'facile' },
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.LOGIQUE], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Remplis la grille avec des 0 et des 1 : autant de chaque sur chaque ligne et chaque colonne, jamais trois identiques à la suite."
    },
    {
        id: 'calc-sudoku', status: STATUS.TEST, title: 'Sudoku',
        generatorId: 'logique.sudoku', activityId: 'sudoku',
        params: { nbQuestions: 2, taille: 6, difficulte: 'facile' },
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.LOGIQUE], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Chaque chiffre ne doit apparaître qu'une seule fois par ligne, par colonne et par bloc. Commence par les cases où un seul chiffre est encore possible : chacune en débloque d'autres."
    },
    {
        id: 'calc-garam', status: STATUS.TEST, title: 'Garam',
        generatorId: 'logique.garam', activityId: 'garam',
        printable: 'garam',
        params: { nbQuestions: 3, taille: 'petit', operations: ['add', 'sub', 'mul'], difficulte: 'facile' },
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.LOGIQUE], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Complète les cases pour que toutes les égalités soient vraies. Deux cases collées forment un nombre à deux chiffres."
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
                id: 'operations', type: 'multiselect', label: 'Types de calcul', default: ['mul'],
                options: [
                    { value: 'mul', label: 'Tables de multiplication' },
                    { value: 'div', label: 'Divisions' },
                    { value: '+9', label: 'Ajouter / retirer 9' },
                    { value: 'c10', label: 'Compléments à 10' },
                    { value: 'rel', label: 'Nombres relatifs' },
                    { value: 'dec', label: 'Multiplier par 10 ou 0,1' }
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
