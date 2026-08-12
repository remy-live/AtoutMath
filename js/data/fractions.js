import { TAGS } from './tags.js';
import { STATUS } from './status.js';

// Domaine entièrement nouveau, ajouté sans écrire un seul moteur de jeu :
// trois générateurs et trois lignes de catalogue. C'est la démonstration
// concrète de ce que le contrat Item apporte — auparavant, chaque notion
// impliquait un fichier de jeu dédié.

export const fractionsExercises = [
    {
        id: 'frac-compare',
        consignePapier: "Compare : écris <, = ou >.",
        colonnesPapier: 5,
        title: 'Duel de Fractions',
        generatorId: 'frac.compare', activityId: 'signs',
        params: { memeDenominateur: 'libre', maxDen: 12 },
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.FRACTIONS], niveaux: [TAGS.NIVEAU.CINQUIEME, TAGS.NIVEAU.QUATRIEME] },
        instruction: "Compare les deux fractions et choisis le bon signe : <, = ou >."
    },
    {
        id: 'frac-compare-facile',
        consignePapier: "Compare : écris <, = ou >.",
        colonnesPapier: 6,
        title: 'Fractions : même dénominateur',
        generatorId: 'frac.compare', activityId: 'signs',
        params: { memeDenominateur: 'identiques', maxDen: 10 },
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.FRACTIONS], niveaux: [TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Les dénominateurs sont identiques : compare les numérateurs."
    },
    {
        id: 'frac-add',
        consignePapier: "Additionne les fractions.",
        colonnesPapier: 4,
        title: 'Addition de Fractions',
        generatorId: 'frac.add', activityId: 'bubbles',
        params: { maxDen: 12 },
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.FRACTIONS], niveaux: [TAGS.NIVEAU.CINQUIEME] },
        instruction: "Additionne les deux fractions et choisis le bon résultat."
    },
    {
        id: 'frac-samurai', status: STATUS.TEST, title: 'Le Samouraï des Fractions',
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
        id: 'frac-pizza', status: STATUS.TEST, title: 'La Pizzeria des Fractions',
        activityId: 'pizza',
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
        consignePapier: "Compare : écris <, = ou >.",
        colonnesPapier: 4,
        title: 'Décimaux en Duel',
        generatorId: 'dec.compare', activityId: 'signs',
        params: { decimales: 2 },
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.DECIMAUX], niveaux: [TAGS.NIVEAU.SIXIEME] },
        instruction: "Compare les deux nombres décimaux rang par rang."
    }
];
