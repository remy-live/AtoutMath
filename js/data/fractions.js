import { TAGS } from './tags.js';
import { STATUS } from './status.js';

// Domaine entièrement nouveau, ajouté sans écrire un seul moteur de jeu :
// trois générateurs et trois lignes de catalogue. C'est la démonstration
// concrète de ce que le contrat Item apporte — auparavant, chaque notion
// impliquait un fichier de jeu dédié.

export const fractionsExercises = [
    {
        // Le réglage « Dénominateurs » EST la progression : identiques d'abord
        // (on compare les numérateurs, rien d'autre), puis différents. C'était
        // deux entrées de catalogue pour ce seul mot ; on part du plus facile,
        // et le professeur ouvre quand la classe est prête.
        id: 'frac-compare',
        cree: '2026-07-28',
        consignePapier: "Compare : écris <, = ou >.",
        colonnesPapier: 5,
        title: 'Duel de Fractions',
        generatorId: 'frac.compare', activityId: 'signs',
        params: { memeDenominateur: 'identiques', maxDen: 10 },
        motsClefs: ['même dénominateur', 'comparer', 'numérateur'],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.FRACTIONS], niveaux: [TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME, TAGS.NIVEAU.QUATRIEME] },
        instruction: "Compare les deux fractions et choisis le bon signe : <, = ou >. "
            + "Tant que les dénominateurs sont identiques, il suffit de comparer les numérateurs ; "
            + "le réglage « Dénominateurs » fait passer aux dénominateurs différents."
    },
    {
        id: 'frac-add',
        cree: '2026-07-28',
        consignePapier: "Additionne les fractions.",
        colonnesPapier: 4,
        title: 'Addition de Fractions',
        generatorId: 'frac.add', activityId: 'bubbles',
        params: { maxDen: 12 },
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.FRACTIONS], niveaux: [TAGS.NIVEAU.CINQUIEME] },
        instruction: "Additionne les deux fractions et choisis le bon résultat."
    },
    {
        // « 3/2 = 33/… » — l'exemple est de Rémy, et il est bien choisi : la
        // fraction est IMPROPRE, donc la bande dépasse l'unité, et le facteur
        // (11) n'est pas dans les petites tables. On ne s'en tire pas de tête.
        //
        // L'écran montre DEUX BANDES DE MÊME LONGUEUR, l'une coupée, l'autre
        // voilée : « même longueur, mais coupée en combien ? ». La découpe se
        // dévoile quand la réponse tombe — c'est la récompense, et c'est aussi
        // la démonstration.
        id: 'frac-egalite', status: STATUS.TEST, title: 'L\'Égalité à Compléter',
        cree: '2026-08-20',
        consignePapier: 'Complète l\'égalité entre les deux fractions.',
        colonnesPapier: 4,
        generatorId: 'frac.egalite', activityId: 'fraction-egalite',
        // De petits dénominateurs de départ et un facteur dans les tables : la
        // bande reste LISIBLE. À 9 × 12, on tombe sur 14/9 = 126/81, où les
        // traits se serrent au point de ne plus rien montrer — et où l'exercice
        // n'est plus la règle des fractions mais une multiplication à deux
        // chiffres. Le professeur peut ouvrir, le défaut reste montrable.
        params: { sens: 'agrandir', trou: 'les-deux', maxFacteur: 10, maxBase: 6 },
        motsClefs: ['fractions égales', 'fraction équivalente', 'produit en croix', 'simplifier'],
        tags: {
            chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.FRACTIONS],
            niveaux: [TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME]
        },
        instruction: 'Trouve le nombre qui manque pour que les deux fractions soient égales. '
            + 'Regarde le côté où les deux nombres sont écrits : il te donne le facteur, et '
            + 'l\'autre étage suit. Le réglage « Dans quel sens » fait passer de la '
            + 'multiplication à la division — c\'est la même règle, mais il faut alors '
            + 'chercher le facteur au lieu de le lire.'
    },
    {
        // « Un exercice d'addition de fractions progressif. Avec d'abord des
        // dénominateurs multiples puis après trouver le PPCM. » Quatre marches,
        // et chacune n'ajoute qu'UNE difficulté — le noyau vérifie la propriété
        // de chaque marche au tirage, au lieu d'espérer qu'elle tombe.
        //
        // « Comment rendre cela visuel ? » : l'élève tape un dénominateur
        // commun et les deux bandes se recoupent sous ses yeux. 12 pour des
        // tiers et des quarts : tout s'aligne. 5 : les traits s'affichent en
        // rouge, sans rencontrer un seul trait existant. La bande lui répond
        // avant l'écran.
        id: 'frac-somme-bandes', status: STATUS.TEST, title: 'Additionner les Bandes',
        cree: '2026-08-20',
        consignePapier: 'Additionne les deux fractions et simplifie le résultat.',
        colonnesPapier: 3,
        generatorId: 'frac.somme-progressive', activityId: 'fraction-somme',
        params: { niveau: 'progressif', maxDen: 12 },
        motsClefs: ['PPCM', 'dénominateur commun', 'additionner', 'même dénominateur'],
        tags: {
            chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.FRACTIONS],
            niveaux: [TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME, TAGS.NIVEAU.QUATRIEME]
        },
        instruction: 'Additionne les deux fractions. Elles ne se rassemblent que si leurs parts '
            + 'ont la même taille : tape un dénominateur commun et regarde les bandes se '
            + 'recouper — si les traits tombent à côté, ils s\'affichent en rouge. L\'exercice '
            + 'monte tout seul : même dénominateur, puis un multiple de l\'autre, puis premiers '
            + 'entre eux, et enfin le vrai PPCM.'
    },
    {
        id: 'frac-samurai', status: STATUS.TEST, title: 'Le Samouraï des Fractions',
        cree: '2026-08-04',
        activityId: 'samurai',
        params: { startLevel: 1, goal: 4 },
        paramSchema: [
            {
                id: 'startLevel', type: 'number', label: 'Difficulté de départ', min: 1, max: 5, default: 1,
                aide: "Le samouraï monte en grade au fil de la partie. Rang 1 : petites fractions, "
                    + "un seul facteur commun évident (6/8). Rang 5 : grands nombres et pièges. "
                    + "Commencer plus haut, c'est sauter l'échauffement."
            },
            {
                id: 'goal', type: 'number', label: 'Fractions à réussir par rang', min: 2, max: 8, default: 4,
                aide: "Combien de fractions il faut simplifier correctement avant de passer au rang suivant. "
                    + "Plus le nombre est grand, plus on s'entraîne longtemps à chaque difficulté."
            }
        ],
        skills: ['num.frac.simplification'],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.FRACTIONS], niveaux: [TAGS.NIVEAU.CINQUIEME, TAGS.NIVEAU.QUATRIEME] },
        instruction: "Rends la fraction irréductible ! Décompose le numérateur et le dénominateur (36/48 = 12×3 / 12×4), puis barre le facteur commun d'un coup de sabre. Attention aux pièges : si rien ne se simplifie, lève le bouclier 🛡️."
    },
    {
        // LE PPCM RENDU MANGEABLE. Deux fractions de dénominateurs différents
        // ne se posent pas sur la même pizza tant qu'on n'a pas trouvé le
        // découpage commun. L'élève ne calcule pas une fraction équivalente sur
        // une feuille : il compte des parts, et le nombre trouvé EST le
        // numérateur.
        id: 'frac-pizza', title: 'La Pizzeria des Fractions',
        cree: '2026-08-11',
        activityId: 'pizza',
        // Sur le papier, la fraction se CONVERTIT avant de se colorier : « la
        // moitié d'une pizza en 6 parts, c'est 3 parts ». Ce passage est
        // invisible à l'écran, où l'on tape sur des secteurs jusqu'à ce que le
        // compte tombe juste.
        printable: 'pizza', printGeneratorId: 'frac.pizza-fiche',
        params: { niveau: 'moyen' },
        paramSchema: [
            {
                id: 'niveau', type: 'select', label: 'Difficulté',
                aide: 'Le nombre de fractions à poser et les dénominateurs tirés. Plus ils sont variés, plus le PPCM devient grand — et plus la pizza compte de parts.',
                options: [
                    { value: 'facile', label: '2 fractions · moitiés, tiers, quarts' },
                    { value: 'moyen', label: '2 fractions · jusqu\'aux sixièmes' },
                    { value: 'difficile', label: '3 fractions · jusqu\'aux huitièmes' }
                ],
                default: 'moyen'
            }
        ],
        skills: ['num.frac.denominateur-commun'],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.FRACTIONS], niveaux: [TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Une commande arrive : « les deux tiers de champignons et le quart de sauce tomate ». Les deux dénominateurs ne sont pas les mêmes, alors la pizza est coupée en autant de parts que leur PPCM — douze pour 3 et 4. À toi de trouver combien de parts font les deux tiers, et combien font le quart. Choisis un ingrédient et tape les parts (tu peux balayer pour en garnir plusieurs), ou fais glisser l'ingrédient depuis la caisse. Puis au four !"
    },
    {
        id: 'dec-compare',
        cree: '2026-07-28',
        consignePapier: "Compare : écris <, = ou >.",
        colonnesPapier: 4,
        title: 'Décimaux en Duel',
        generatorId: 'dec.compare', activityId: 'signs',
        params: { decimales: 2 },
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.DECIMAUX], niveaux: [TAGS.NIVEAU.SIXIEME] },
        instruction: "Compare les deux nombres décimaux rang par rang."
    }
];
