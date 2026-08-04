import { TAGS } from './tags.js';
import { STATUS } from './status.js';

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
    },

    // --- Angle Master : le rapporteur interactif ---
    {
        id: 'geo-angles-mesurer', status: STATUS.TEST, title: 'Angle Master : Mesurer',
        generatorId: 'geo.angles', activityId: 'angles',
        params: { mode: 'mesurer', plage: 'tous', tolerance: 3 },
        tags: { chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.ANGLES], niveaux: [TAGS.NIVEAU.SIXIEME] },
        instruction: "Estime d'abord si l'angle est aigu ou obtus, puis mesure-le : déplace le rapporteur sur le sommet, tourne-le par ses poignées pour aligner le zéro, et saisis la valeur lue."
    },
    {
        id: 'geo-angles-construire', status: STATUS.TEST, title: 'Angle Master : Construire',
        generatorId: 'geo.angles', activityId: 'angles',
        params: { mode: 'construire', plage: 'tous', tolerance: 3 },
        tags: { chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.ANGLES], niveaux: [TAGS.NIVEAU.SIXIEME] },
        instruction: "Construis l'angle demandé : place le rapporteur, repère la graduation, puis amène le côté rouge dessus en tirant sa poignée."
    },
    {
        id: 'geo-galactic', status: STATUS.TEST, title: 'Galactic : Tir aux Angles',
        activityId: 'galactic',
        params: { startLevel: 1, lives: 3 },
        paramSchema: {
            startLevel: { type: 'number', label: 'Niveau de départ', min: 1, max: 6, default: 1 },
            lives: { type: 'number', label: 'Vies', min: 1, max: 5, default: 3 }
        },
        tags: { chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.ANGLES], niveaux: [TAGS.NIVEAU.SIXIEME] },
        instruction: "Un ennemi apparaît au-dessus d'un rapporteur géant : lis l'angle sur la bonne échelle, tape-le au clavier et tire ! Attention aux niveaux à échelle inversée où le canon tire à 180 − x, aux astéroïdes qui bloquent les tirs, et aux cibles mouvantes."
    }
];
