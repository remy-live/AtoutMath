import { TAGS } from './tags.js';

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
        id: 'num-lettres-mille', title: 'Des Lettres aux Chiffres',
        generatorId: 'num.lettres', activityId: 'numpad',
        params: { max: 1000, decimaux: 'non' },
        tags: { chemin: [D, NUM], niveaux: [CM2, SIXIEME] },
        instruction: "Lis le nombre écrit en toutes lettres et saisis-le en chiffres."
    },
    {
        id: 'num-lettres-grands', title: 'Les Grands Nombres',
        generatorId: 'num.lettres', activityId: 'numpad',
        params: { max: 1000000, decimaux: 'non' },
        tags: { chemin: [D, NUM], niveaux: [SIXIEME] },
        instruction: "Attention aux tranches : millions, milliers, puis unités."
    },
    {
        id: 'num-lettres-decimaux', title: 'Dixièmes et Centièmes',
        generatorId: 'num.lettres', activityId: 'numpad',
        params: { max: 100000, decimaux: 'toujours' },
        tags: { chemin: [D, DEC], niveaux: [SIXIEME] },
        instruction: "« Trois dixièmes », « deux cent douze centièmes »… écris-les en chiffres."
    },

    // --- Rang des chiffres (fiche § 17, 27) ---
    {
        id: 'num-rang-entier', title: 'Chasse au Chiffre',
        generatorId: 'num.chiffre-rang', activityId: 'bubbles',
        params: { partie: 'entière', decimales: 2 },
        tags: { chemin: [D, NUM], niveaux: [CM2, SIXIEME] },
        instruction: "Trouve le chiffre qui occupe le rang demandé, à gauche de la virgule."
    },
    {
        id: 'num-rang-decimal', title: 'Dizaines ou Dixièmes ?',
        generatorId: 'num.chiffre-rang', activityId: 'bubbles',
        params: { partie: 'les deux', decimales: 3 },
        tags: { chemin: [D, NUM], niveaux: [SIXIEME] },
        instruction: "Le piège classique : dizaines et dixièmes ne sont pas le même rang."
    },

    // --- Décimaux (fiche § 5, 6) ---
    {
        id: 'num-parties', title: 'Entière ou Décimale ?',
        generatorId: 'num.parties', activityId: 'bubbles',
        params: {},
        tags: { chemin: [D, DEC], niveaux: [SIXIEME] },
        instruction: "La virgule sépare les deux parties du nombre. Laquelle te demande-t-on ?"
    },
    {
        id: 'num-zeros', title: 'La Chasse aux Zéros',
        generatorId: 'num.zeros', activityId: 'numpad',
        params: {},
        tags: { chemin: [D, DEC], niveaux: [SIXIEME] },
        instruction: "Enlève les zéros inutiles — mais seulement ceux qui ne changent rien !"
    },

    // --- Décomposition et conversions (fiche § 10, 11, 18, 20, 21) ---
    {
        id: 'num-decomposition', title: 'Décomposer, Recomposer',
        generatorId: 'num.decomposition', activityId: 'numpad',
        params: { sens: 'libre' },
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
        params: { max: 10000 },
        tags: { chemin: [D, NUM], niveaux: [SIXIEME] },
        instruction: "Bâton = 1, anse = 10, corde = 100, lotus = 1 000, doigt = 10 000. Additionne !"
    },
    {
        id: 'num-egypte-qcm', title: 'Hiéroglyphes Express',
        generatorId: 'num.egypte', activityId: 'bubbles',
        params: { max: 1000 },
        tags: { chemin: [D, NUM], niveaux: [CM2, SIXIEME] },
        instruction: "Lis le nombre égyptien et choisis la bonne réponse."
    },

    // --- Ordre de grandeur (fiche § 23, 24) ---
    {
        id: 'num-ordre-grandeur', title: 'À Peu Près',
        generatorId: 'num.ordre-grandeur', activityId: 'bubbles',
        params: { decimaux: 'non' },
        tags: { chemin: [D, MENTAL], niveaux: [SIXIEME] },
        instruction: "Donne le nombre rond le plus proche : c'est l'ordre de grandeur."
    },
    {
        id: 'num-ordre-grandeur-dec', title: 'À Peu Près, avec Virgule',
        generatorId: 'num.ordre-grandeur', activityId: 'bubbles',
        params: { decimaux: 'oui' },
        tags: { chemin: [D, MENTAL], niveaux: [SIXIEME] },
        instruction: "7,98 est presque 8. Trouve l'entier le plus proche."
    },

    // --- Questions flash (fiche § E, F, 29) ---
    {
        id: 'num-complement-10', title: 'Amis de 10',
        generatorId: 'num.complement', activityId: 'bubbles',
        params: { cible: [10] },
        tags: { chemin: [D, MENTAL], niveaux: [CM2, SIXIEME] },
        instruction: "Combien faut-il ajouter pour faire 10 ?"
    },
    {
        id: 'num-complement-100', title: 'Amis de 100 et 1000',
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
        id: 'num-relatifs-thermometre', title: 'Le Thermomètre',
        generatorId: 'num.relatifs', activityId: 'relatifs',
        params: { niveau: 'thermometre', reponse: 'saisie' },
        tags: { chemin: [D, REL], niveaux: [CINQUIEME] },
        instruction: "La température monte ou baisse : compte les graduations, le zéro n'arrête rien."
    },
    {
        id: 'num-relatifs-pastilles', title: 'Les Pastilles qui s\'annulent',
        generatorId: 'num.relatifs', activityId: 'relatifs',
        params: { niveau: 'pastilles', reponse: 'saisie' },
        tags: { chemin: [D, REL], niveaux: [CINQUIEME] },
        instruction: "Une pastille bleue et une rouge forment une paire qui vaut 0. Barre les paires : ce qui reste est la réponse."
    },
    {
        id: 'num-relatifs-ecriture', title: 'Sommes de Relatifs',
        generatorId: 'num.relatifs', activityId: 'relatifs',
        params: { niveau: 'ecriture', reponse: 'saisie' },
        tags: { chemin: [D, REL], niveaux: [CINQUIEME, QUATRIEME] },
        instruction: "Même signe : on ajoute et on garde le signe. Signes différents : on soustrait, et on garde le signe du plus éloigné de zéro."
    }
];
