import { TAGS } from './tags.js';

export const calculExercises = [
    { 
        id: "calc-math-crush", title: "Math Crush", gameType: "math_crush", 
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL], niveaux: [TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME, TAGS.NIVEAU.QUATRIEME] },
        configurable: true,
        defaultParams: { mode: 'addition', difficulty: 'progressive' },
        paramSchema: [
            { id: 'mode', type: 'select', label: 'Opération', options: ['addition', 'multiplication'], default: 'addition' },
            { id: 'difficulty', type: 'select', label: 'Difficulté', options: ['progressive', 'difficile'], default: 'progressive' }
        ],
        instruction: "Glisse ton doigt sur les blocs adjacents pour atteindre la Cible."
    },
    { 
        id: "calc-add", title: "Additions Mystères", gameType: "mental", 
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL], niveaux: [TAGS.NIVEAU.SIXIEME] },
        instruction: "Trouve la somme des deux nombres affichés et sélectionne la bonne bulle."
    },
    { 
        id: "calc-prio", title: "Prio-Bot Express", gameType: "priority", 
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.PRIORITES], niveaux: [TAGS.NIVEAU.CINQUIEME] },
        instruction: "Sélectionne l'opération qui doit être effectuée en premier selon les règles de priorité."
    },
    { 
        id: "calc-mult-flash", title: "Flash Mult", gameType: "mult_flash", 
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL], niveaux: [TAGS.NIVEAU.SIXIEME] },
        configurable: true,
        defaultParams: { tables: [2, 3, 4, 5, 6, 7, 8, 9, 10] },
        paramSchema: [
            { id: 'tables', type: 'multiselect', label: 'Tables à travailler', options: [1,2,3,4,5,6,7,8,9,10], default: [2, 3, 4, 5, 6, 7, 8, 9, 10] }
        ],
        instruction: "Choisis la bulle qui contient le résultat correct de la multiplication."
    },
    { 
        id: "calc-mult-missing", title: "Facteur Manquant", gameType: "mult_missing", 
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL], niveaux: [TAGS.NIVEAU.CINQUIEME] },
        configurable: true,
        defaultParams: { tables: [2, 3, 4, 5, 6, 7, 8, 9, 10] },
        paramSchema: [
            { id: 'tables', type: 'multiselect', label: 'Tables à travailler', options: [1,2,3,4,5,6,7,8,9,10], default: [2, 3, 4, 5, 6, 7, 8, 9, 10] }
        ],
        instruction: "Trouve le nombre manquant dans l'équation et sélectionne-le sur le digicode."
    },
    {
        id: "calc-arcade-sprint", title: "Sprint Chrono", gameType: "arcade_sprint",
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL], niveaux: [TAGS.NIVEAU.SIXIEME] },
        configurable: true,
        defaultParams: { timeLimit: 60, minScore: 10, operations: ['+', '-'] },
        paramSchema: [
            { id: 'timeLimit', type: 'number', label: 'Chronomètre (secondes)', default: 60 },
            { id: 'minScore', type: 'number', label: 'Score minimum requis', default: 10 },
            { id: 'operations', type: 'multiselect', label: 'Opérations', options: ['+', '-', '*'], default: ['+', '-'] },
            { id: 'tables', type: 'multiselect', label: 'Tables (si multiplication)', options: [1,2,3,4,5,6,7,8,9,10], default: [2,3,4,5,6,7,8,9,10] }
        ],
        instruction: "Réponds au plus d'équations possibles avant la fin du temps imparti !"
    },
    {
        id: "calc-arcade-moles", title: "Chasse aux Taupes", gameType: "arcade_moles",
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL], niveaux: [TAGS.NIVEAU.SIXIEME] },
        configurable: true,
        defaultParams: { timeLimit: 60, minScore: 10, operations: ['+', '-'] },
        paramSchema: [
            { id: 'timeLimit', type: 'number', label: 'Chronomètre (secondes)', default: 60 },
            { id: 'minScore', type: 'number', label: 'Score minimum requis', default: 10 },
            { id: 'operations', type: 'multiselect', label: 'Opérations', options: ['+', '-', '*'], default: ['+', '-'] },
            { id: 'tables', type: 'multiselect', label: 'Tables (si multiplication)', options: [1,2,3,4,5,6,7,8,9,10], default: [2,3,4,5,6,7,8,9,10] }
        ],
        instruction: "Tape sur la taupe qui tient le bon résultat de l'équation affichée !"
    },
    {
        id: "calc-arcade-shooter", title: "Météorites Mathématiques", gameType: "arcade_shooter",
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL], niveaux: [TAGS.NIVEAU.SIXIEME] },
        configurable: true,
        defaultParams: { tables: [2, 3, 4, 5, 6, 7, 8, 9, 10], difficulty: 'medium' },
        paramSchema: [
            { id: 'tables', type: 'multiselect', label: 'Tables à travailler', options: [1,2,3,4,5,6,7,8,9,10], default: [2,3,4,5,6,7,8,9,10] },
            { id: 'difficulty', type: 'select', label: 'Difficulté', options: ['easy', 'medium', 'hard'], default: 'medium' }
        ],
        instruction: "Détruis la météorite qui contient le bon résultat en cliquant dessus !"
    },
    {
        id: "calc-math-memory", title: "Memory des Tables", gameType: "math_memory",
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL], niveaux: [TAGS.NIVEAU.SIXIEME] },
        configurable: true,
        defaultParams: { tables: [2, 3, 4, 5, 6, 7, 8, 9, 10], pairs: 6 },
        paramSchema: [
            { id: 'tables', type: 'multiselect', label: 'Tables à travailler', options: [1,2,3,4,5,6,7,8,9,10], default: [2,3,4,5,6,7,8,9,10] },
            { id: 'pairs', type: 'select', label: 'Nombre de paires', options: [4, 6, 8, 10], default: 6 }
        ],
        instruction: "Associe l'opération avec son résultat pour nettoyer le plateau !"
    },
    {
        id: "calc-labyrinthe", title: "Labyrinthe Mathématique", gameType: "labyrinthe",
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL], niveaux: [TAGS.NIVEAU.SIXIEME] },
        configurable: true,
        defaultParams: { timeLimit: 60, timeReduction: 5, operations: ['*'] },
        paramSchema: [
            { id: 'timeLimit', type: 'number', label: 'Temps initial (s)', default: 60 },
            { id: 'timeReduction', type: 'number', label: 'Temps perdu par niveau (s)', default: 5 },
            { id: 'operations', type: 'multiselect', label: 'Opérations', options: ['+', '-', '*', '/'], default: ['*'] },
            { id: 'tables', type: 'multiselect', label: 'Tables (si multiplication)', options: [1,2,3,4,5,6,7,8,9,10], default: [2,3,4,5,6,7,8,9,10] }
        ],
        instruction: "Déplace-toi vers la case contenant la bonne réponse. Atteins la porte pour passer au niveau suivant !"
    },
    {
        id: "calc-course", title: "Course Mathématique", gameType: "course",
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL], niveaux: [TAGS.NIVEAU.SIXIEME] },
        configurable: true,
        internalStudentConfig: true,
        defaultParams: { mode: 'survival', lanes: 3, speed: 3, operations: ['mul'] },
        paramSchema: [
            { id: 'mode', type: 'select', label: 'Mode de jeu', options: ['survival', 'chrono', 'sprint'], default: 'survival' },
            { id: 'lanes', type: 'number', label: 'Nombre de voies', default: 3 },
            { id: 'speed', type: 'number', label: 'Vitesse', default: 3 },
            { id: 'operations', type: 'multiselect', label: 'Opérations', options: ['+9', 'mul', 'c10', 'div', 'rel', 'dec'], default: ['mul'] }
        ],
        instruction: "Dirige le véhicule vers la bonne réponse pour continuer la course !"
    },
    {
        id: "calc-pythagore", title: "Table de Pythagore", gameType: "pythagore",
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL, TAGS.THEME.TABLES], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME] },
        configurable: true,
        defaultParams: { tables: [2, 3, 4, 5, 6, 7, 8, 9, 10] },
        paramSchema: [
            { id: 'tables', type: 'multiselect', label: 'Tables à travailler', options: [1,2,3,4,5,6,7,8,9,10], default: [2, 3, 4, 5, 6, 7, 8, 9, 10] }
        ],
        instruction: "Repère la ligne et la colonne surlignées dans la table de Pythagore, puis clique sur le bon résultat."
    },
    {
        id: "calc-tetris", title: "Math Tetris", gameType: "tetris",
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL], niveaux: [TAGS.NIVEAU.SIXIEME] },
        configurable: true,
        defaultParams: { tables: [2,3,4,5,6,7,8,9,10], speed: 1000 },
        paramSchema: [
            { id: 'tables', type: 'multiselect', label: 'Tables', options: [1,2,3,4,5,6,7,8,9,10], default: [2,3,4,5,6,7,8,9,10] },
            { id: 'speed', type: 'number', label: 'Vitesse de chute (ms)', default: 1000 }
        ],
        instruction: "Combine les blocs pour que leur produit donne la cible demandée !"
    }
];
