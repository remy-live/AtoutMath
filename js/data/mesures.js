import { TAGS } from './tags.js';

// Grandeurs et mesures : deux notions posées avec le pavé numérique, où
// l'élève produit la réponse au lieu de la reconnaître. Le même générateur
// sait aussi fournir des choix (`answerKinds: ['numeric','choice']`), d'où la
// variante QCM ci-dessous — utile en début d'apprentissage.

export const mesuresExercises = [
    {
        id: 'mes-perimetre', title: 'Le Tour du Rectangle',
        generatorId: 'mes.perimetre', activityId: 'numpad',
        params: { max: 12, unite: 'cm' },
        tags: { chemin: [TAGS.DOMAINE.GRANDEURS, TAGS.SOUS_DOMAINE.PERIMETRE_AIRE], niveaux: [TAGS.NIVEAU.SIXIEME] },
        instruction: "Calcule le périmètre du rectangle et saisis ta réponse."
    },
    {
        id: 'mes-perimetre-qcm', title: 'Périmètre : à toi de choisir',
        generatorId: 'mes.perimetre', activityId: 'bubbles',
        params: { max: 10, unite: 'cm' },
        tags: { chemin: [TAGS.DOMAINE.GRANDEURS, TAGS.SOUS_DOMAINE.PERIMETRE_AIRE], niveaux: [TAGS.NIVEAU.SIXIEME] },
        instruction: "Choisis le bon périmètre parmi les propositions."
    },
    {
        id: 'mes-aire', title: 'Carreaux et Surfaces',
        generatorId: 'mes.aire', activityId: 'numpad',
        params: { max: 10, unite: 'cm' },
        tags: { chemin: [TAGS.DOMAINE.GRANDEURS, TAGS.SOUS_DOMAINE.PERIMETRE_AIRE], niveaux: [TAGS.NIVEAU.SIXIEME] },
        instruction: "Calcule l'aire du rectangle et saisis ta réponse."
    }
];
