import { TAGS } from './tags.js';
import { STATUS } from './status.js';

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
    {
        // JEZZBALL. Le casse-brique territorial : des balles rebondissent, on
        // coupe le terrain, toute région fermée sans balle est conquise. Le
        // score EST un pourcentage d'aire, et c'est ce qu'il enseigne.
        id: 'mes-jezzball', status: STATUS.TEST, title: 'JezzBall',
        activityId: 'jezzball',
        sansRevision: true,
        skills: ['mes.aire.proportion'],
        params: { vies: 4 },
        paramSchema: [
            {
                id: 'vies', type: 'select', label: 'Vies',
                options: [
                    { value: 3, label: '3 vies' },
                    { value: 4, label: '4 vies' },
                    { value: 6, label: '6 vies' }
                ],
                default: 4
            }
        ],
        tags: { chemin: [TAGS.DOMAINE.GRANDEURS, TAGS.SOUS_DOMAINE.PERIMETRE_AIRE], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Touche le terrain pour lancer un mur — il pousse des deux côtés. Si une balle le touche avant qu'il soit fini, il est perdu (et une vie avec). Toute région fermée SANS balle est conquise. Objectif : 75 % de l'aire. Le bouton sous le terrain change le sens du mur."
    },
    {
        // LE TANGRAM. Sept pièces, une figure — et surtout la découverte que
        // deux formes différentes peuvent couvrir la même surface. Chaque
        // pièce porte sa fraction de la figure, et la figure terminée pose une
        // question d'aire : sans elle, il ne resterait qu'un casse-tête.
        id: 'geo-tangram', status: STATUS.TEST, title: 'Le Tangram',
        activityId: 'tangram',
        sansRevision: true,
        skills: ['geo.aires.tangram'],
        params: {},
        tags: { chemin: [TAGS.DOMAINE.GRANDEURS, TAGS.SOUS_DOMAINE.PERIMETRE_AIRE], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Remplis la SILHOUETTE avec les sept pi\u00e8ces, sans trou ni chevauchement. Prends une pi\u00e8ce au doigt, tourne-la avec \u21bb (ou la touche R), et approche-la du bon endroit : elle se cale toute seule. Seul le parall\u00e9logramme se retourne, avec \u21c4. Si tu bloques, \u00ab Aide-moi \u00bb pose une pi\u00e8ce \u2014 mais la figure ne montre jamais o\u00f9 vont les autres. \u00c0 la fin, une question sur les aires : retiens que le carr\u00e9 et le triangle moyen couvrent la m\u00eame surface."
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
