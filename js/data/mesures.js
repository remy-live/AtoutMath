import { TAGS } from './tags.js';
import { STATUS } from './status.js';

// Grandeurs et mesures : deux notions posées avec le pavé numérique, où
// l'élève produit la réponse au lieu de la reconnaître. Le même générateur
// sait aussi fournir des choix (`answerKinds: ['numeric','choice']`), d'où la
// variante QCM ci-dessous — utile en début d'apprentissage.

export const mesuresExercises = [
    {
        id: 'mes-perimetre', title: 'Le Tour du Rectangle',
        cree: '2026-07-28',
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
        cree: '2026-07-28',
        generatorId: 'mes.perimetre', activityId: 'bubbles',
        // SUR LE PAPIER, MÊME FEUILLE QUE SON JUMEAU : le rectangle dessiné,
        // coté et colorié. Choisir entre trois nombres est un geste d'écran ;
        // sur une feuille, ce qu'on regarde c'est la figure — et une fiche de
        // périmètre sans figure n'apprend pas que le périmètre fait le tour.
        printable: 'rectangle', printGeneratorId: 'mes.rectangle-fiche',
        printParams: { quoi: 'perimetre', max: 10, unite: 'cm' },
        consignePapier: "Écris le calcul, puis le résultat avec son unité.",
        params: { max: 10, unite: 'cm' },
        tags: { chemin: [TAGS.DOMAINE.GRANDEURS, TAGS.SOUS_DOMAINE.PERIMETRE_AIRE], niveaux: [TAGS.NIVEAU.SIXIEME] },
        instruction: "Choisis le bon périmètre parmi les propositions."
    },
    {
        id: 'mes-aire', title: 'Carreaux et Surfaces',
        cree: '2026-07-28',
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
        id: 'mes-conversion', title: 'Le Tableau de Conversion',
        cree: '2026-08-14',
        activityId: 'conversion',
        // SUR LE PAPIER : le tableau des cahiers, une ligne par conversion.
        // Les en-têtes se donnent ou se laissent vides — donnés, on travaille
        // la conversion ; à remplir, on travaille l'ordre des unités, et c'est
        // là qu'on se trompe.
        printable: 'conversion', printGeneratorId: 'mes.conversion-fiche',
        printParams: { famille: 'longueur', lignes: 8, entetes: true, ecart: 3, tableau: true },
        consignePapier: 'Complète le tableau et effectue les conversions.',
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
        cree: '2026-08-12',
        revisions: [
            {
                date: '2026-08-20',
                quoi: 'La calculatrice, en petite fenêtre qu\'on pose à côté de l\'énoncé. '
                    + 'Ce qui s\'apprend ici est la formule d = v × t et le choix de '
                    + 'l\'opération : diviser 132 par 2,2 à la main ne le vérifie pas.'
            }
        ],
        consignePapier: "Écris la formule, remplace, calcule, et n'oublie pas l'unité.",
        colonnesPapier: 1,
        // DEUX LIGNES POUR RÉDIGER : le calcul, puis la phrase réponse.
        //
        // Rémy : « pour le temps distance vitesse, mets deux lignes, pour le
        // calcul et la phrase réponse. » Il y en avait trois — on comptait la
        // formule, le remplacement et le calcul chacun pour une ligne. En
        // classe, la formule et le remplacement s'écrivent sur la MÊME ligne
        // (« d = v × t = 120 × 2 = 240 »), et la troisième ne servait qu'à
        // faire tenir quatre questions par page au lieu de six.
        lignesReponsePapier: 2,
        title: 'Temps, Distance, Vitesse',
        // LA CALCULATRICE EST OFFERTE ICI, et c'est le premier exercice à
        // l'avoir. Ce qui s'apprend est la formule d = v × t et le choix de
        // l'opération ; poser 132 ÷ 2,2 à la main ne vérifie rien de plus et
        // mange le temps qu'on voulait passer à raisonner. Ailleurs — sur les
        // tables, sur le calcul mental — elle répondrait à la place de l'élève,
        // d'où le réglage exercice par exercice.
        calculatrice: true,
        generatorId: 'mes.vitesse', activityId: 'numpad',
        params: { chercher: 'melange', difficulte: 1 },
        tags: { chemin: [TAGS.DOMAINE.GRANDEURS, TAGS.SOUS_DOMAINE.DUREES], niveaux: [TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME, TAGS.NIVEAU.QUATRIEME] },
        instruction: "Tout vient d'une seule formule : d = v × t. Écris-la, entoure ce que l'énoncé te donne, et la question te dit quoi calculer — multiplier pour la distance, diviser pour la vitesse ou la durée. Attention aux durées : 1 h 30, c'est 1,5 h."
    },
    {
        // JEZZBALL. Le casse-brique territorial : des balles rebondissent, on
        // coupe le terrain, toute région fermée sans balle est conquise. Le
        // score EST un pourcentage d'aire, et c'est ce qu'il enseigne.
        id: 'mes-jezzball', title: 'JezzBall',
        cree: '2026-08-12',
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
        cree: '2026-08-13',
        activityId: 'tangram',
        // SUR LE PAPIER : le carré à découper une fois, puis les silhouettes à
        // remplir avec les pièces découpées. C'est ainsi que le tangram vit en
        // classe, et l'écran ne remplace pas le geste de tourner une pièce
        // entre ses doigts pour voir si elle rentre.
        printable: 'tangram', printGeneratorId: 'geo.tangram-fiche',
        // À la MÊME ÉCHELLE par défaut : c'est la seule façon que les pièces
        // découpées dans le carré recouvrent vraiment les silhouettes.
        printParams: { depart: 'decouper', echelle: 'commune' },
        sansRevision: true,
        skills: ['geo.aires.tangram'],
        params: {},
        tags: { chemin: [TAGS.DOMAINE.GRANDEURS, TAGS.SOUS_DOMAINE.PERIMETRE_AIRE], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Remplis la SILHOUETTE avec les sept pi\u00e8ces, sans trou ni chevauchement. Prends une pi\u00e8ce au doigt, tourne-la avec \u21bb (ou la touche R), et approche-la du bon endroit : elle se cale toute seule. Seul le parall\u00e9logramme se retourne, avec \u21c4. Si tu bloques, \u00ab Aide-moi \u00bb pose une pi\u00e8ce \u2014 mais la figure ne montre jamais o\u00f9 vont les autres. \u00c0 la fin, une question sur les aires : retiens que le carr\u00e9 et le triangle moyen couvrent la m\u00eame surface."
    },
    // LA PENDULE À AIGUILLES, en un exercice. Lire et placer sont deux gestes
    // différents et le professeur doit pouvoir donner l'un sans l'autre — c'est
    // exactement ce que fait le réglage « Question », qui offre en prime
    // l'alternance des deux. Les trois entrées d'avant portaient un
    // `paramSchema` écrit à la main qui ne montrait QUE les nombres des
    // minutes : le niveau et le type de question, pourtant déclarés sur le
    // générateur, restaient hors d'atteinte. En le retirant, les trois
    // réglages remontent d'eux-mêmes.
    {
        id: 'mes-heure', title: 'Quelle heure est-il ?',
        cree: '2026-08-06',
        generatorId: 'mes.horloge', activityId: 'horloge',
        printable: 'horloge',
        params: { niveau: 'progressif', question: 'lire', reperes: 'auto' },
        motsClefs: ['pendule', 'aiguilles', 'placer', 'régler', '24 heures', 'après-midi'],
        tags: { chemin: [TAGS.DOMAINE.GRANDEURS, TAGS.SOUS_DOMAINE.DUREES], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME] },
        instruction: "Lis l'heure sur la pendule : la petite aiguille donne les heures, la grande les minutes. Le réglage « Question » passe au geste inverse — tirer les aiguilles pour afficher une heure donnée — ou fait alterner les deux. Le réglage « Niveau » mène jusqu'au tour de midi : la pendule ne compte que jusqu'à 12, l'après-midi il faut ajouter 12 pour donner l'heure en 24 heures."
    }
];
