import { TAGS } from './tags.js';

// Domaine entièrement nouveau, ajouté sans écrire un seul moteur de jeu :
// trois générateurs et trois lignes de catalogue. C'est la démonstration
// concrète de ce que le contrat Item apporte — auparavant, chaque notion
// impliquait un fichier de jeu dédié.

export const fractionsExercises = [
    {
        id: 'frac-compare', title: 'Duel de Fractions',
        generatorId: 'frac.compare', activityId: 'signs',
        params: { memeDenominateur: 'libre', maxDen: 12 },
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.FRACTIONS], niveaux: [TAGS.NIVEAU.CINQUIEME, TAGS.NIVEAU.QUATRIEME] },
        instruction: "Compare les deux fractions et choisis le bon signe : <, = ou >."
    },
    {
        id: 'frac-compare-facile', title: 'Fractions : même dénominateur',
        generatorId: 'frac.compare', activityId: 'signs',
        params: { memeDenominateur: 'identiques', maxDen: 10 },
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.FRACTIONS], niveaux: [TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Les dénominateurs sont identiques : compare les numérateurs."
    },
    {
        id: 'frac-add', title: 'Addition de Fractions',
        generatorId: 'frac.add', activityId: 'bubbles',
        params: { maxDen: 12 },
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.FRACTIONS], niveaux: [TAGS.NIVEAU.CINQUIEME] },
        instruction: "Additionne les deux fractions et choisis le bon résultat."
    },
    {
        id: 'dec-compare', title: 'Décimaux en Duel',
        generatorId: 'dec.compare', activityId: 'signs',
        params: { decimales: 2 },
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.DECIMAUX], niveaux: [TAGS.NIVEAU.SIXIEME] },
        instruction: "Compare les deux nombres décimaux rang par rang."
    }
];
