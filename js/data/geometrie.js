import { TAGS } from './tags.js';
import { STATUS } from './status.js';

// Les anciens exercices « grille » (cases à cliquer dans un quadrillage) sont
// remplacés par un vrai repère du plan : axes fléchés, origine, graduations
// entières. Deux questions symétriques sur la même compétence — placer un
// point, lire des coordonnées — et une déclinaison en nombres relatifs.

// La leçon des notations, partagée par les deux exercices qui la travaillent :
// on apprend la même chose, qu'on la révise au calme ou contre la montre. Les
// deux premiers paliers passent par la version tranquille — découvrir une
// écriture avec un chronomètre sur le dos, c'est la découvrir mal.
const NOTATIONS_APPRENTISSAGE = {
    intro: "Quatre écritures, deux points. Tout tient dans une idée : un crochet FERME la ligne, une parenthèse la laisse FILER.",
    regles: [
        {
            titre: 'Le segment : [AB]',
            texte: "Deux crochets, donc fermé des deux côtés : la ligne s'arrête en A et en B.",
            figure: { type: 'notation', objet: 'segment' }
        },
        {
            titre: 'La droite : (AB)',
            texte: "Deux parenthèses, donc ouverte des deux côtés : la ligne passe par A et B et se prolonge sans fin.",
            figure: { type: 'notation', objet: 'droite' }
        },
        {
            titre: 'La demi-droite : [AB)',
            texte: "Un crochet, une parenthèse : elle part de A et file au-delà de B. L'ORIGINE S'ÉCRIT EN PREMIER — [BA) serait l'autre demi-droite, celle qui part de B.",
            figure: { type: 'notation', objet: 'demi_pq' }
        },
        {
            titre: 'La longueur : AB',
            texte: "Sans crochet ni parenthèse, AB n'est pas une ligne : c'est un NOMBRE, la longueur du segment [AB]. On l'écrit avec une unité : AB = 5 cm.",
            exemple: '<span class="lec-calcul">AB = 5 cm</span>'
        }
    ],
    paliers: [
        { titre: 'Reconnaître', exerciseId: 'geo-notations', overrides: { sens: 'lecture', longueur: 'non' }, nbItems: 4 },
        { titre: 'Lire une figure', exerciseId: 'geo-notations', overrides: { sens: 'figure', longueur: 'oui' }, nbItems: 5 },
        { titre: 'Défi contre la montre', exerciseId: 'geo-notations-sprint', overrides: { sens: 'mixte', longueur: 'oui' }, nbItems: 6 }
    ]
};

export const geometrieExercises = [
    {
        id: 'geo-repere-placer', title: 'Placer un Point',
        generatorId: 'geo.repere', activityId: 'repere',
        params: { relatifs: 'positives', max: 5, mode: 'placer' },
        tags: { chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.REPERAGE], niveaux: [TAGS.NIVEAU.SIXIEME] },
        instruction: "Clique dans le repère à l'endroit indiqué par les coordonnées. On lit l'abscisse en premier."
    },
    {
        id: 'geo-repere-lire', title: 'Lire des Coordonnées',
        generatorId: 'geo.repere', activityId: 'repere-lecture',
        params: { relatifs: 'positives', max: 5, mode: 'lire' },
        tags: { chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.REPERAGE], niveaux: [TAGS.NIVEAU.SIXIEME] },
        instruction: "Lis les coordonnées du point tracé et choisis le bon couple."
    },
    {
        id: 'geo-repere-relatifs', title: 'Repère et Nombres Relatifs',
        generatorId: 'geo.repere', activityId: 'repere',
        params: { relatifs: 'relatives', max: 5, mode: 'placer' },
        tags: { chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.REPERAGE], niveaux: [TAGS.NIVEAU.CINQUIEME] },
        instruction: "Le repère va maintenant dans les négatifs : attention aux signes de l'abscisse et de l'ordonnée."
    },
    {
        id: 'geo-repere-relatifs-lire', title: 'Coordonnées Négatives',
        generatorId: 'geo.repere', activityId: 'repere-lecture',
        params: { relatifs: 'relatives', max: 5, mode: 'lire' },
        tags: { chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.REPERAGE], niveaux: [TAGS.NIVEAU.CINQUIEME] },
        instruction: "Lis les coordonnées du point, sans oublier les signes."
    },
    {
        // La même notion, au calme : on apprend une écriture sans chronomètre.
        // C'est aussi ce que le mode apprentissage du sprint utilise pour ses
        // deux premiers paliers — la difficulté d'un apprentissage n'est pas
        // seulement dans les réglages, elle est dans le jeu qu'on affronte.
        id: 'geo-notations', status: STATUS.TEST, title: 'Segment, Droite, Demi-droite',
        generatorId: 'geo.notations', activityId: 'buttons',
        params: { sens: 'mixte', longueur: 'oui' },
        tags: { chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.NOTATIONS], niveaux: [TAGS.NIVEAU.SIXIEME] },
        instruction: "Un crochet ferme la ligne, une parenthèse la laisse filer. L'origine d'une demi-droite s'écrit toujours en premier.",
        apprentissage: NOTATIONS_APPRENTISSAGE
    },
    {
        id: 'geo-notations-sprint', status: STATUS.TEST, title: 'Sprint des Notations',
        generatorId: 'geo.notations', activityId: 'sprint',
        params: { sens: 'mixte', longueur: 'oui' },
        tags: { chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.NOTATIONS], niveaux: [TAGS.NIVEAU.SIXIEME] },
        instruction: "Crochet = la ligne s'arrête, parenthèse = elle continue. Réponds avant que la jauge ne se vide : elle se remplit de moins en moins longtemps à mesure que tu enchaînes.",
        apprentissage: NOTATIONS_APPRENTISSAGE
    }
];
