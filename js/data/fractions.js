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
        // ON COMPTE D'ABORD, ON MULTIPLIE ENSUITE. Rémy : « tu peux mettre les
        // bandes l'une en dessous de l'autre et découper la seconde bande,
        // l'élève aura juste à compter dans un premier temps (2-3 questions),
        // et après tu les enlèves pour qu'il multiplie ». Les deux longueurs
        // coloriées s'arrêtent alors à la même abscisse : l'élève CONSTATE que
        // 1/3 et 4/12 sont la même chose avant qu'on lui demande de le
        // démontrer. Puis les bandes s'en vont, et il ne reste que les deux
        // flèches de multiplication, en haut et en bas, portant le même
        // facteur — la notation du cahier.
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
        params: { sens: 'agrandir', trou: 'les-deux', maxFacteur: 10, maxBase: 6, bandes: 3 },
        motsClefs: ['fractions égales', 'fraction équivalente', 'produit en croix', 'simplifier'],
        tags: {
            chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.FRACTIONS],
            niveaux: [TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME]
        },
        revisions: [{
            date: '2026-08-20',
            quoi: 'Les bandes sont l\'une AU-DESSUS de l\'autre et la seconde est découpée : '
                + 'les deux longueurs coloriées s\'arrêtent à la même abscisse, et les premières '
                + 'questions se répondent en COMPTANT. Après trois questions (réglable) les '
                + 'bandes s\'en vont et il ne reste que les deux flèches de multiplication, en '
                + 'haut et en bas, qui portent le même facteur.'
        }],
        instruction: 'Les trois premières questions se répondent en COMPTANT : les deux bandes '
            + 'font la même longueur, le coloriage s\'arrête au même endroit, et la seconde est '
            + 'juste coupée plus fin. Ensuite les bandes disparaissent et il reste les deux '
            + 'flèches : le facteur se lit du côté où les deux nombres sont écrits, et la flèche '
            + 'd\'en face dit qu\'on applique le MÊME de l\'autre côté. Le réglage « Questions '
            + 'avec les bandes » allonge ou supprime la phase du comptage ; « Dans quel sens » '
            + 'fait passer de la multiplication à la division.'
    },
    {
        // « UN EXERCICE D'ADDITION DE FRACTIONS PROGRESSIF », puis, après essai
        // des bandes : « je ne suis pas convaincu par les bandes pour les
        // fractions, on va proposer l'addition de fraction sans support visuel,
        // car on peut tomber sur des choses incohérentes ». Il a raison : passé
        // une vingtaine de parts, le dessin devient une hachure — une image qui
        // cesse de montrer au moment où le calcul devient difficile n'aide
        // personne.
        //
        // L'addition se POSE donc, ligne par ligne, sur le modèle qu'il a écrit
        // lui-même : le dénominateur commun, par quoi multiplier chaque
        // fraction, les deux fractions converties, puis le calcul. Chaque ligne
        // se valide avant que la suivante s'ouvre.
        //
        // L'AIDE EST LA TABLE DE PYTHAGORE — son idée : la ligne des 4 et celle
        // des 3 se rencontrent en 12, et le premier rendez-vous est le
        // dénominateur commun. C'est aussi pour elle que les dénominateurs
        // restent entre 2 et 10.
        id: 'frac-somme-posee', status: STATUS.TEST, title: 'Poser une Addition de Fractions',
        cree: '2026-08-20',
        consignePapier: 'Mets au même dénominateur, puis calcule.',
        colonnesPapier: 3,
        generatorId: 'frac.somme-progressive', activityId: 'fraction-somme',
        // « Pas besoin de simplifier dans un premier temps » : le résultat brut
        // suffit, et mettre au même dénominateur est déjà tout l'exercice.
        params: { niveau: 'progressif', operation: 'somme', simplifier: 'non', maxDen: 10 },
        motsClefs: ['PPCM', 'dénominateur commun', 'additionner', 'soustraire',
            'même dénominateur', 'table de Pythagore'],
        tags: {
            chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.FRACTIONS],
            niveaux: [TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME, TAGS.NIVEAU.QUATRIEME]
        },
        instruction: 'On ne peut additionner que des parts de MÊME taille. Le calcul s\'écrit '
            + 'ligne par ligne, comme au cahier : d\'abord le dénominateur commun — le bouton '
            + '« Voir la table de Pythagore » ouvre la table et allume la LIGNE de chaque '
            + 'dénominateur ; les nombres coloriés en vert sont dans les deux tables, et le plus '
            + 'petit est celui qu\'on cherche —, puis par quoi '
            + 'multiplier chaque fraction (le MÊME facteur en haut et en bas), puis les deux '
            + 'fractions converties, puis le calcul. Le réglage « L\'opération » ajoute les '
            + 'soustractions : le résultat reste toujours positif.'
    },
    {
        // « On propose un exercice où il y a des énoncés très simples où on
        // additionne ou soustrait des fractions. » TRÈS SIMPLES est la
        // consigne, et c'est la difficile : un énoncé ajoute une lecture, et la
        // lecture ne doit pas devenir l'exercice. Une phrase, deux fractions,
        // une question — et un contexte où la fraction se VOIT (une tarte, un
        // bidon, un trajet), jamais un habillage posé sur un calcul.
        //
        // Le calcul se pose ensuite exactement comme dans l'exercice d'à côté :
        // c'est la même compétence, on ne la réapprend pas parce qu'elle arrive
        // dans une histoire.
        id: 'frac-probleme', status: STATUS.TEST, title: 'Histoires de Fractions',
        cree: '2026-08-20',
        consignePapier: 'Lis l\'énoncé, pose le calcul et réponds par une phrase.',
        colonnesPapier: 2,
        // UNE LIGNE POUR LA PHRASE RÉPONSE. Rémy : « laisse une ligne de
        // pointillés en dessous pour faire une phrase réponse. » Un problème
        // ne se répond pas par une fraction posée au bout des pointillés du
        // calcul : « il lui reste 4/5 du mur à peindre » est la réponse, et
        // c'est elle qu'on note.
        lignesReponsePapier: 1,
        generatorId: 'frac.probleme', activityId: 'fraction-somme',
        params: {
            niveau: 'progressif', operation: 'les-deux', simplifier: 'non',
            complements: 3, maxDen: 10
        },
        revisions: [{
            date: '2026-08-20',
            quoi: 'Les trois premières questions sont des COMPLÉMENTS À UN — « il a parcouru '
                + '4/9 du trajet, combien lui reste-t-il ? » —, posés en deux lignes : 1 = 9/9, '
                + 'puis 9/9 − 4/9 = 5/9. Un seul dénominateur, aucun PPCM : c\'est le cas le '
                + 'plus facile, et pourtant celui qui fait buter. Dix contextes de plus, tous '
                + 'concrets (chocolat, billes, puzzle, livre, bouteille, argent de poche), et '
                + 'les fractions s\'écrivent en colonnes jusque dans la phrase.'
        }],
        motsClefs: ['problème', 'énoncé', 'fractions', 'additionner', 'soustraire', 'part',
            'complément à un', 'combien reste-t-il'],
        tags: {
            chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.FRACTIONS],
            niveaux: [TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME, TAGS.NIVEAU.QUATRIEME]
        },
        instruction: 'Une phrase, une question, et un calcul à poser. On commence par le plus '
            + 'facile : « il a parcouru 4/9 du trajet, combien lui reste-t-il ? » — un seul '
            + 'dénominateur, mais il faut voir que le TOUT s\'écrit en neuvièmes : 1 = 9/9, '
            + 'puis 9/9 − 4/9 = 5/9. Viennent ensuite les problèmes à deux fractions, où il '
            + 'faut trouver le dénominateur commun ; le travail est alors le même que dans '
            + '« Poser une Addition de Fractions », et c\'est l\'histoire qui dit si l\'on '
            + 'ajoute ou si l\'on retire. Le réglage « Questions combien reste-t-il ? » allonge '
            + 'ou supprime la première phase.'
    },
    {
        id: 'frac-samurai', status: STATUS.TEST, title: 'Le Samouraï des Fractions',
        cree: '2026-08-04',
        revisions: [{
            date: '2026-08-20',
            quoi: 'L\'égalité finale s\'écrit EN COLONNES — la fraction de départ pâlie, la '
                + 'simplifiée en vert — au lieu d\'une phrase à barres obliques, la seule écriture '
                + 'qu\'on demande à l\'élève de ne pas employer. Et l\'exercice ne saute plus à la '
                + 'fraction suivante au bout d\'une seconde et demie : un bouton « Fraction '
                + 'suivante » laisse le temps de regarder ce qu\'on vient de fabriquer.'
        }],
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
