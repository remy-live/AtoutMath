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
        instruction: "Détruis la météorite qui porte le bon résultat en cliquant dessus !"
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
        instruction: "Remplis la grille : chaque chiffre une fois par ligne et par colonne, et chaque zone doit donner le résultat écrit dans son coin.",
        apprentissage: {
            intro: "Une grille de Mathdoku se remplit sans jamais deviner : chaque case se déduit.",
            regles: [
                {
                    titre: 'Chaque chiffre une seule fois par ligne et par colonne',
                    texte: "Dans une grille 4 × 4, chaque ligne contient 1, 2, 3 et 4 — une fois chacun. Idem pour chaque colonne.",
                    exemple: '<span class="lec-suite"><b>1</b><b>3</b><b>4</b><b>2</b></span>'
                },
                {
                    titre: 'Chaque zone donne le résultat écrit dans son coin',
                    texte: "Le petit calcul en haut à gauche d'une zone porte sur TOUTES ses cases. Une zone marquée 7+ sur deux cases, ce sont deux chiffres dont la somme fait 7.",
                    exemple: '<span class="lec-suite"><b class="lec-coin" data-coin="7+">3</b><b>4</b></span>'
                },
                {
                    titre: 'Un même chiffre peut revenir dans une zone',
                    texte: "À condition qu'il ne soit ni sur la même ligne, ni sur la même colonne. C'est la question que tout le monde pose : la réponse est oui.",
                    exemple: '<span class="lec-suite"><b>2</b><b class="lec-vide">·</b></span><span class="lec-suite"><b class="lec-vide">·</b><b>2</b></span>'
                }
            ],
            paliers: [
                { titre: 'Découverte', overrides: { chiffres: '1-3', operations: ['add'], difficulte: 'facile' }, nbItems: 2 },
                { titre: 'On s\'entraîne', overrides: { chiffres: '1-4', operations: ['add', 'sub'], difficulte: 'facile' }, nbItems: 3 },
                { titre: 'Défi', overrides: { chiffres: '1-4', operations: ['add', 'sub', 'mul'], difficulte: 'moyen' }, nbItems: 3 }
            ]
        }
    },
    {
        id: 'calc-binairo', status: STATUS.TEST, title: 'Binairo',
        generatorId: 'logique.binairo', activityId: 'binairo',
        printable: 'binairo',
        params: { nbQuestions: 3, taille: 6, difficulte: 'facile' },
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.LOGIQUE], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Remplis la grille avec des 0 et des 1 : autant de chaque sur chaque ligne et chaque colonne, jamais trois identiques à la suite.",
        apprentissage: {
            intro: "Deux règles suffisent à remplir toute la grille. Aucune ne demande de calculer : on observe, et on déduit.",
            regles: [
                {
                    titre: 'Des 0 et des 1, rien d\'autre',
                    texte: "Chaque case reçoit un 0 ou un 1. Certaines sont déjà données : ce sont elles qui lancent le raisonnement.",
                    exemple: '<span class="lec-suite"><b>0</b><b>1</b><b class="lec-vide">·</b><b>1</b></span>'
                },
                {
                    titre: 'Jamais trois identiques à la suite',
                    texte: "Ni sur une ligne, ni sur une colonne. C'est la règle qui fait tout le travail : dès que deux chiffres pareils se suivent, la case d'à côté est forcée.",
                    exemple: '<span class="lec-suite"><b>0</b><b>0</b><b class="lec-ko">0</b></span>'
                        + '<span class="lec-fleche" aria-hidden="true">→</span>'
                        + '<span class="lec-suite"><b>0</b><b>0</b><b class="lec-ok">1</b></span>'
                },
                {
                    titre: 'Autant de 0 que de 1',
                    texte: "Sur chaque ligne et sur chaque colonne. Dans une grille 6 × 6, cela fait trois 0 et trois 1 par ligne — dès que les trois 0 sont posés, tout le reste de la ligne est des 1.",
                    exemple: '<span class="lec-suite"><b>0</b><b>1</b><b>1</b><b>0</b><b>1</b><b>0</b></span>'
                }
            ],
            paliers: [
                { titre: 'Découverte', overrides: { taille: 4, difficulte: 'facile' }, nbItems: 2 },
                { titre: 'On s\'entraîne', overrides: { taille: 6, difficulte: 'facile' }, nbItems: 3 },
                { titre: 'Défi', overrides: { taille: 6, difficulte: 'moyen' }, nbItems: 3 }
            ]
        }
    },
    {
        id: 'calc-garam', status: STATUS.TEST, title: 'Garam',
        generatorId: 'logique.garam', activityId: 'garam',
        printable: 'garam',
        params: { nbQuestions: 3, taille: 'petit', operations: ['add', 'sub', 'mul'], difficulte: 'facile' },
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.LOGIQUE], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Complète les cases pour que toutes les égalités soient vraies. Deux cases collées forment un nombre à deux chiffres.",
        apprentissage: {
            intro: "Le Garam est un treillis d'égalités : chaque case appartient à deux calculs à la fois, et c'est ce croisement qui donne la solution.",
            regles: [
                {
                    titre: 'Toutes les égalités doivent être vraies',
                    texte: "On lit chaque ligne et chaque colonne de chiffres comme un calcul complet. Commence par celles auxquelles il ne manque qu'une case.",
                    exemple: '<span class="lec-calcul">7 − <b class="lec-vide">?</b> = 3</span>'
                        + '<span class="lec-fleche" aria-hidden="true">→</span>'
                        + '<span class="lec-calcul">7 − <b class="lec-ok">4</b> = 3</span>'
                },
                {
                    titre: 'Chaque case sert deux fois',
                    texte: "Une case appartient à une égalité horizontale ET à une égalité verticale. Ce qu'une case t'apprend d'un côté, tu le réutilises de l'autre.",
                    exemple: ''
                },
                {
                    titre: 'Deux cases collées font un nombre à deux chiffres',
                    texte: "Quand deux cases se touchent sans signe entre elles, elles s'écrivent l'une après l'autre : un 1 et un 2 côte à côte, cela fait 12, pas 3.",
                    exemple: '<span class="lec-suite"><b>1</b><b>2</b></span><span class="lec-fleche" aria-hidden="true">=</span><span class="lec-calcul">12</span>'
                }
            ],
            paliers: [
                { titre: 'Découverte', overrides: { taille: 'petit', operations: ['add'], difficulte: 'facile' }, nbItems: 1 },
                { titre: 'On s\'entraîne', overrides: { taille: 'petit', operations: ['add', 'sub'], difficulte: 'facile' }, nbItems: 2 },
                { titre: 'Défi', overrides: { taille: 'petit', operations: ['add', 'sub', 'mul'], difficulte: 'moyen' }, nbItems: 2 }
            ]
        }
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
