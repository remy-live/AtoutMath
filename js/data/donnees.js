import { TAGS } from './tags.js';
import { STATUS } from './status.js';

// Domaine « Organisation de données » : ouvert par l'École du Tableur,
// portée de l'ancien projet. D'autres exercices (lecture de tableaux, de
// graphiques…) viendront s'y ranger.

export const donneesExercises = [
    {
        id: 'don-tableur', status: STATUS.TEST, title: "L'École du Tableur",
        activityId: 'tableur',
        params: { startLevel: 1, goal: 3 },
        paramSchema: [
            { id: 'startLevel', type: 'number', label: 'Leçon de départ', min: 1, max: 9, default: 1 },
            { id: 'goal', type: 'number', label: 'Réussites par leçon', min: 2, max: 6, default: 3 }
        ],
        skills: ['don.tableur.reperage', 'don.tableur.formules'],
        tags: { chemin: [TAGS.DOMAINE.DONNEES, TAGS.SOUS_DOMAINE.TABLEUR], niveaux: [TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Neuf leçons pour devenir un pro du tableur : nommer les cases (B3), sélectionner des plages (A1:B2), dessiner en pixel art, saisir des données, puis calculer avec des formules — =A1+B1, =SOMME(), =MOYENNE() — jusqu'à la facture finale. Règle d'or : une formule utilise les références des cases, jamais les nombres recopiés !"
    }
];
