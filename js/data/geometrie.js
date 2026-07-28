import { TAGS } from './tags.js';

// Les anciens exercices « grille » (cases à cliquer dans un quadrillage) sont
// remplacés par un vrai repère du plan : axes fléchés, origine, graduations
// entières. Deux questions symétriques sur la même compétence — placer un
// point, lire des coordonnées — et une déclinaison en nombres relatifs.

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
    }
];
