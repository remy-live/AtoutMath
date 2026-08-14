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
        // Sur le papier, le rectangle est DESSINÉ : c'est en le regardant qu'on
        // comprend que le périmètre fait le tour.
        printable: 'rectangle', printGeneratorId: 'mes.rectangle-fiche',
        printParams: { quoi: 'perimetre', max: 12, unite: 'cm' },
        consignePapier: "Écris le calcul, puis le résultat avec son unité.",
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
        // La fiche demande les DEUX sur la même figure : c'est la confusion du
        // périmètre et de l'aire qui coûte le plus cher, et on ne la lève qu'en
        // les faisant cohabiter.
        printable: 'rectangle', printGeneratorId: 'mes.rectangle-fiche',
        printParams: { quoi: 'les-deux', max: 10, unite: 'cm' },
        consignePapier: "Écris le calcul, puis le résultat avec son unité.",
        params: { max: 10, unite: 'cm' },
        tags: { chemin: [TAGS.DOMAINE.GRANDEURS, TAGS.SOUS_DOMAINE.PERIMETRE_AIRE], niveaux: [TAGS.NIVEAU.SIXIEME] },
        instruction: "Calcule l'aire du rectangle et saisis ta réponse."
    },
    {
        // LE TABLEAU DE CONVERSION, en trois temps. Chaque \u00e9tape isole une
        // erreur : l'ordre des unit\u00e9s, le rang du nombre, la place de la
        // virgule. Les m\u00e9langer, c'est ne jamais savoir laquelle a co\u00fbt\u00e9 la
        // r\u00e9ponse.
        id: 'mes-conversion', status: STATUS.TEST, title: 'Le Tableau de Conversion',
        activityId: 'conversion',
        skills: ['num.conversion'],
        params: { famille: 'longueur', ecart: 3, decimales: false },
        paramSchema: [
            {
                id: 'famille', type: 'select', label: 'Unit\u00e9s',
                options: [
                    { value: 'longueur', label: 'Longueurs (km \u2192 mm)' },
                    { value: 'masse', label: 'Masses (kg \u2192 mg)' },
                    { value: 'capacite', label: 'Contenances (hL \u2192 mL)' }
                ],
                default: 'longueur'
            },
            {
                id: 'ecart', type: 'select', label: '\u00c9cart entre les unit\u00e9s',
                aide: 'Une seule colonne d\'\u00e9cart pour commencer : m \u2192 dm. Trois colonnes, c\'est d\u00e9j\u00e0 m \u2192 km.',
                options: [
                    { value: 1, label: '1 colonne \u2014 pour commencer' },
                    { value: 2, label: 'Jusqu\'\u00e0 2 colonnes' },
                    { value: 3, label: 'Jusqu\'\u00e0 3 colonnes' },
                    { value: 6, label: 'Tout le tableau' }
                ],
                default: 3
            },
            {
                id: 'decimales', type: 'checkbox', label: 'Nombres \u00e0 virgule au d\u00e9part',
                aide: 'Sans cela, on part toujours d\'un entier \u2014 la virgule n\'appara\u00eet qu\'\u00e0 l\'arriv\u00e9e.',
                default: false
            }
        ],
        tags: { chemin: [TAGS.DOMAINE.GRANDEURS, TAGS.SOUS_DOMAINE.PERIMETRE_AIRE], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Trois \u00e9tapes, et chacune sert \u00e0 quelque chose. D'abord tu ranges les unit\u00e9s dans les colonnes \u2014 une seule fois, le tableau reste ensuite. Puis tu fais glisser le nombre : le chiffre des unit\u00e9s va dans la colonne de SON unit\u00e9, et le fant\u00f4me te montre o\u00f9 il tomberait. Enfin tu poses la virgule apr\u00e8s la colonne demand\u00e9e, tu combles de z\u00e9ros les cases vides qui la pr\u00e9c\u00e8dent, et tu lis la r\u00e9ponse."
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
        printable: 'horloge',
        params: { niveau: 'progressif', question: 'lire', reperes: 'auto' },
        // Les réglages de l'écran valent aussi pour la fiche : « avec ou sans
        // les nombres des minutes » est une AIDE qu'on retire quand la lecture
        // est acquise, sur le papier comme à l'écran.
        paramSchema: [
            {
                id: 'reperes', type: 'select', label: 'Nombres des minutes',
                aide: 'La couronne rouge des multiples de cinq aide à lire la grande aiguille. On la retire quand la lecture est acquise.',
                options: [
                    { value: 'auto', label: 'Selon le niveau (recommandé)' },
                    { value: 'toujours', label: 'Toujours affichés' },
                    { value: 'jamais', label: 'Jamais (pendule ordinaire)' }
                ],
                default: 'auto'
            }
        ],

        tags: { chemin: [TAGS.DOMAINE.GRANDEURS, TAGS.SOUS_DOMAINE.DUREES], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME] },
        instruction: "Lis l'heure sur la pendule : la petite aiguille donne les heures, la grande les minutes."
    },
    {
        id: 'mes-heure-placer', title: 'Règle la pendule',
        generatorId: 'mes.horloge', activityId: 'horloge',
        printable: 'horloge',
        params: { niveau: 'progressif', question: 'placer', reperes: 'auto' },
        // Les réglages de l'écran valent aussi pour la fiche : « avec ou sans
        // les nombres des minutes » est une AIDE qu'on retire quand la lecture
        // est acquise, sur le papier comme à l'écran.
        paramSchema: [
            {
                id: 'reperes', type: 'select', label: 'Nombres des minutes',
                aide: 'La couronne rouge des multiples de cinq aide à lire la grande aiguille. On la retire quand la lecture est acquise.',
                options: [
                    { value: 'auto', label: 'Selon le niveau (recommandé)' },
                    { value: 'toujours', label: 'Toujours affichés' },
                    { value: 'jamais', label: 'Jamais (pendule ordinaire)' }
                ],
                default: 'auto'
            }
        ],

        tags: { chemin: [TAGS.DOMAINE.GRANDEURS, TAGS.SOUS_DOMAINE.DUREES], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME] },
        instruction: "Tire les aiguilles pour afficher l'heure demandée."
    },
    {
        id: 'mes-heure-24', title: 'Le tour de midi (24 heures)',
        generatorId: 'mes.horloge', activityId: 'horloge',
        printable: 'horloge',
        params: { niveau: 'apresmidi', question: 'mixte', reperes: 'jamais' },
        tags: { chemin: [TAGS.DOMAINE.GRANDEURS, TAGS.SOUS_DOMAINE.DUREES], niveaux: [TAGS.NIVEAU.SIXIEME] },
        instruction: "La pendule ne compte que jusqu'à 12 : l'après-midi, ajoute 12 pour donner l'heure en 24 heures."
    }
];
