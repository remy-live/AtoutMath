import { TAGS } from './tags.js';
import { STATUS } from './status.js';

// Domaine « Organisation de données » : ouvert par l'École du Tableur,
// portée de l'ancien projet. D'autres exercices (lecture de tableaux, de
// graphiques…) viendront s'y ranger.

export const donneesExercises = [
    {
        // LE TABLEAU À DOUBLE ENTRÉE. Rémy est parti d'une fiche : « Voilà un
        // tableau concernant les élèves du collège. Complète les valeurs
        // manquantes », et sous le tableau l'astuce qui EST la méthode —
        // « essaie à chaque fois de trouver la ligne ou la colonne où il ne
        // manque qu'une seule information ».
        //
        // CETTE ASTUCE N'EST PAS UN CONSEIL, C'EST LA DÉFINITION. Un tableau
        // croisé se remplit par PROPAGATION, jamais en devinant. Le générateur
        // ne perce donc aucun trou sans vérifier que le tableau se finit encore
        // de proche en proche.
        //
        // ET ON NE PEUT PAS CACHER PLUS DE R + C + 1 CASES : le tableau est
        // entièrement déterminé par ses R × C cases intérieures, et il en compte
        // (R+1) × (C+1). Au-delà, plusieurs tableaux répondraient. Le générateur
        // atteint ce maximum ; pour durcir l'exercice, on agrandit le tableau.
        //
        // La calculatrice est là pour les premiers paliers — Rémy : « avec
        // utilisation pour le début de la calculatrice » — puis elle s'éteint :
        // l'obstacle est le raisonnement, pas l'addition, jusqu'au moment où
        // c'est justement l'addition en colonne qu'on veut faire travailler.
        id: 'don-tableau-croise', title: 'Le Tableau à Double Entrée',
        cree: '2026-08-31',
        activityId: 'tableau-croise',
        printable: 'tableau-croise', printGeneratorId: 'donnees.tableau-croise',
        consignePapier: 'Complète les valeurs manquantes de chaque tableau.',
        sansRevision: true,
        skills: ['don.tableau.croise'],
        params: { palier: 'facile' },
        paramSchema: [
            {
                id: 'palier', type: 'select', label: 'La difficulté', default: 'facile',
                aide: 'La difficulté ne tient pas aux calculs — ce sont des additions et des '
                    + 'soustractions — mais au nombre de lignes qu\'il faut relire pour trouver la '
                    + 'prochaine à un seul trou. La calculatrice accompagne les premiers paliers, '
                    + 'puis elle s\'éteint.',
                options: [
                    { value: 'decouverte', label: 'Petit tableau, peu de trous — avec la calculatrice' },
                    { value: 'facile', label: 'Comme sur la fiche — 2 lignes, 4 colonnes' },
                    { value: 'moyen', label: '3 lignes, 4 colonnes — tous les totaux cachés' },
                    { value: 'difficile', label: '4 lignes, 4 colonnes — sans calculatrice' }
                ]
            }
        ],
        motsClefs: ['tableau', 'double entrée', 'totaux', 'effectifs', 'données', 'croisé'],
        tags: { chemin: [TAGS.DOMAINE.DONNEES, TAGS.SOUS_DOMAINE.TABLEUR], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Complète les cases vides du tableau. Ne commence pas par la première case venue : cherche à chaque fois la LIGNE ou la COLONNE où il ne manque qu'une seule information — celle-là, tu peux la boucler tout de suite. Si la case qui manque est un total, tu additionnes toute la ligne ; si elle est dans le corps du tableau, tu pars du total et tu retires ce qui est déjà écrit. Le nombre que tu viens d'écrire en ouvre alors d'autres, et de proche en proche tout se remplit. On n'a jamais besoin de deviner."
    },
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
