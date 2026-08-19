import { TAGS } from './tags.js';
import { STATUS } from './status.js';

// Domaine « Organisation de données » : ouvert par l'École du Tableur,
// portée de l'ancien projet. D'autres exercices (lecture de tableaux, de
// graphiques…) viendront s'y ranger.

export const donneesExercises = [
    {
        id: 'don-tableur', status: STATUS.TEST, title: "L'École du Tableur",
        cree: '2026-08-04',
        activityId: 'tableur',
        // SUR LE PAPIER, RIEN NE CALCULE À LA PLACE DE L'ÉLÈVE. Devant le
        // tableur, taper « =12+15 » donne 27 et le logiciel dit oui : la faute
        // passe. Sur la feuille, la seule chose demandée est justement celle
        // qu'il avait sautée — écrire =B2+B3.
        printable: 'tableur', printGeneratorId: 'don.tableur-fiche',
        printParams: { quoi: 'melange', plages: true },
        consignePapier: "Écris le nom exact, avec la majuscule de la colonne.",
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
