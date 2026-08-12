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
    },
    {
        // TEMPS, DISTANCE, VITESSE. Une seule formule (d = v × t), la question
        // qui tourne, et les nombres qui tombent juste par construction : on
        // tire la vitesse et la durée, la distance en découle.
        id: 'mes-vitesse',
        consignePapier: "Réponds en indiquant l'unité demandée.",
        colonnesPapier: 1,
        title: 'Temps, Distance, Vitesse',
        generatorId: 'mes.vitesse', activityId: 'numpad',
        params: { chercher: 'melange', difficulte: 1 },
        tags: { chemin: [TAGS.DOMAINE.GRANDEURS, TAGS.SOUS_DOMAINE.DUREES], niveaux: [TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME, TAGS.NIVEAU.QUATRIEME] },
        instruction: "Tout vient d'une seule formule : d = v × t. Écris-la, entoure ce que l'énoncé te donne, et la question te dit quoi calculer — multiplier pour la distance, diviser pour la vitesse ou la durée. Attention aux durées : 1 h 30, c'est 1,5 h."
    },
    // La pendule à aiguilles. Trois entrées plutôt qu'une : lire et placer
    // sont deux gestes différents, et le professeur doit pouvoir donner l'un
    // sans l'autre. La progression complète reste l'entrée principale.
    {
        id: 'mes-heure-lire', title: 'Quelle heure est-il ?',
        generatorId: 'mes.horloge', activityId: 'horloge',
        params: { niveau: 'progressif', question: 'lire', reperes: 'auto' },
        tags: { chemin: [TAGS.DOMAINE.GRANDEURS, TAGS.SOUS_DOMAINE.DUREES], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME] },
        instruction: "Lis l'heure sur la pendule : la petite aiguille donne les heures, la grande les minutes."
    },
    {
        id: 'mes-heure-placer', title: 'Règle la pendule',
        generatorId: 'mes.horloge', activityId: 'horloge',
        params: { niveau: 'progressif', question: 'placer', reperes: 'auto' },
        tags: { chemin: [TAGS.DOMAINE.GRANDEURS, TAGS.SOUS_DOMAINE.DUREES], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME] },
        instruction: "Tire les aiguilles pour afficher l'heure demandée."
    },
    {
        id: 'mes-heure-24', title: 'Le tour de midi (24 heures)',
        generatorId: 'mes.horloge', activityId: 'horloge',
        params: { niveau: 'apresmidi', question: 'mixte', reperes: 'jamais' },
        tags: { chemin: [TAGS.DOMAINE.GRANDEURS, TAGS.SOUS_DOMAINE.DUREES], niveaux: [TAGS.NIVEAU.SIXIEME] },
        instruction: "La pendule ne compte que jusqu'à 12 : l'après-midi, ajoute 12 pour donner l'heure en 24 heures."
    }
];
