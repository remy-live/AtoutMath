import { TAGS } from './tags.js';

// Chapitre « Ensembles et intervalles » — le premier de Seconde.
//
// Rémy : « on va faire des exercices de seconde. Premier type : placer des
// nombres dans le bon ensemble de nombres et aussi sur les intervalles, sur un
// axe, avec inégalité, union et intersection, il faut toujours un support
// visuel. » Puis : « il faut faire toutes les possibilités et aussi savoir
// écrire avec les signes inférieurs ou égal et le bon côté du crochet. »
//
// TROIS ENTRÉES POUR UN SEUL GÉNÉRATEUR, et c'est la façon de faire de la
// maison : les mêmes questions, réglées différemment. « Toutes les
// traductions » est celle qu'on donne en classe — c'est le mélange qui fait
// comprendre que l'inégalité, le dessin et l'intervalle sont trois écritures
// d'une même chose. Les deux autres existent pour le jour où l'on veut ne
// travailler qu'un geste : celui qui lit l'axe sans hésiter écrit encore
// ]2 ; 5[ pour [2 ; 5[.

const D = TAGS.DOMAINE.NUMERIQUE;
const ENS = TAGS.SOUS_DOMAINE.ENSEMBLES;
const LIT = TAGS.SOUS_DOMAINE.LITTERAL;
const SECONDE = TAGS.NIVEAU.SECONDE;

// ── FACTORISER : SEPT BARREAUX, ET LA PROGRESSION EST LE PARCOURS ──────────
//
// Rémy, photo d'une feuille à l'appui : « peux-tu faire des exercices du type
// seconde avec factorisation de x² − y² ? Je veux que ce soit hyper progressif
// pour arriver à cela en photo. »
//
// SEPT EXERCICES ET NON UN SEUL À SEPT NIVEAUX, et c'est la réponse à « hyper
// progressif ». Un curseur de difficulté qui mélangerait tout ne serait pas
// une progression : ce serait une loterie où l'élève tombe sur le barreau 6
// avant d'avoir monté le 2. Ici, le professeur pose les sept dans une séance,
// dans l'ordre, et chacun ne travaille QU'UNE chose de plus que le précédent.
//
// Les quatre premiers montent l'identité a² − b² ; les trois derniers
// apprennent à s'en servir pour autre chose, et c'est le vrai saut de la
// Seconde. Les barreaux 3, 4 et 7 produisent exactement les formes A(x),
// D(x), B(x) et C(x) de la feuille.
const BARREAUX = [
    ['fac-1', 'FB', '1. Différence de deux carrés',
        'x² − 36 : reconnaître a² − b² quand b est un nombre.',
        "Un carré moins un carré se factorise TOUJOURS : a² − b² = (a − b)(a + b). "
        + "Le dessin montre pourquoi — on découpe le grand carré et on recolle."],
    ['fac-2', 'FC', '2. Le coefficient est dans le carré',
        '9x² − 16 : a n\'est plus x tout seul.',
        "9x² est le carré de 3x, pas de 9x. C'est la RACINE qu'on écrit dans les "
        + "parenthèses, et c'est là que tout le monde se trompe la première fois."],
    ['fac-3', 'FD', '3. a devient une parenthèse',
        '(6 − 5x)² − 1 : a est une expression entière.',
        "Rien ne change à la règle : a vaut 6 − 5x, b vaut 1. On écrit (a − b)(a + b), "
        + "puis on réduit chaque parenthèse."],
    ['fac-4', 'FF', '4. Deux parenthèses au carré',
        '(3x − 2)² − (x + 4)² : b aussi est une expression.',
        "Le moins devant la seconde parenthèse change SES DEUX signes. C'est la faute "
        + "numéro un de ce barreau, et elle ne pardonne pas."],
    ['fac-5', 'FH', '5. Facteur commun visible',
        'Ce qui est écrit dans les deux termes se met devant.',
        "k·A + k·B = k(A + B). Ici le facteur commun est écrit deux fois, sous les yeux : "
        + "il suffit de le sortir, et de garder ce qui restait derrière."],
    ['fac-6', 'FJ', '6. Facteur commun caché',
        'Il faut factoriser un morceau pour le faire apparaître.',
        "x² − 9 cache (x − 3), et −4x + 12 cache −4(x − 3). On factorise d'abord le "
        + "morceau qui dissimule le facteur commun — ensuite c'est le barreau 5."],
    ['fac-7', 'FL', '7. Trois termes',
        'Les expressions de la feuille : B(x) et C(x).',
        "Trois termes, un facteur commun caché dans deux d'entre eux. C'est l'exercice "
        + "de la feuille : on ne fait rien de nouveau, on fait tout à la fois."]
];

export const secondeExercises = [
    {
        id: 'sec-intervalles',
        cree: '2026-09-22',
        title: 'Intervalles : les trois écritures',
        consignePapier: 'Entoure la bonne réponse.',
        colonnesPapier: 1,
        generatorId: 'nb.intervalles', activityId: 'buttons',
        params: { sens: 'toutes', forme: 'les-deux' },
        motsClefs: ['intervalle', 'crochet', 'inégalité', 'droite graduée', 'axe',
            'borne', 'infini', 'inclus', 'exclu', 'seconde', 'lycée'],
        tags: { chemin: [D, ENS], niveaux: [SECONDE] },
        instruction: "Un même ensemble de nombres s'écrit de trois façons : une inégalité, "
            + "un dessin sur la droite graduée, un intervalle. On te montre l'une, tu "
            + "reconnais l'autre — dans les six sens."
    },
    {
        id: 'sec-intervalles-ecrire',
        cree: '2026-09-22',
        title: 'Le bon côté du crochet',
        consignePapier: 'Écris l\'intervalle correspondant.',
        colonnesPapier: 1,
        generatorId: 'nb.intervalles', activityId: 'buttons',
        // C'est la demande précise de Rémy : « savoir écrire […] le bon côté du
        // crochet ». On ne demande QUE l'écriture, et les leurres sont les
        // quatre fautes de crochet — c'est l'exercice de remédiation.
        params: { sens: 'intervalle', forme: 'les-deux' },
        motsClefs: ['crochet', 'intervalle', 'inclus', 'exclu', 'borne', 'seconde'],
        tags: { chemin: [D, ENS], niveaux: [SECONDE] },
        instruction: "Écris l'intervalle. Le crochet TOURNÉ VERS L'INTÉRIEUR prend la "
            + "borne ; tourné vers l'extérieur, il la laisse dehors." 
    },
    {
        id: 'sec-intervalles-demi',
        cree: '2026-09-22',
        title: 'Demi-droites et infini',
        consignePapier: 'Entoure la bonne réponse.',
        colonnesPapier: 1,
        generatorId: 'nb.intervalles', activityId: 'buttons',
        // LES DEMI-DROITES SEULES, parce que la faute qu'on y fait n'est pas la
        // même : ce n'est plus « quel crochet pour 5 ? », c'est « le crochet de
        // l'infini ». Mélangée aux intervalles bornés, elle passe une fois sur
        // trois et ne se travaille jamais.
        params: { sens: 'toutes', forme: 'demi' },
        motsClefs: ['infini', 'demi-droite', 'intervalle', 'crochet', 'seconde'],
        tags: { chemin: [D, ENS], niveaux: [SECONDE] },
        instruction: "Les demi-droites, celles qui vont jusqu'à l'infini. Le crochet de "
            + "l'infini est toujours ouvert : on ne l'atteint jamais." 
    },
    {
        id: 'sec-ensembles',
        cree: '2026-09-22',
        title: 'Le plus petit ensemble de nombres',
        consignePapier: 'Entoure le plus petit ensemble auquel le nombre appartient.',
        colonnesPapier: 2,
        generatorId: 'nb.ensembles', activityId: 'buttons',
        // LE PIÈGE N'EST PAS LA DÉFINITION, C'EST LE CALCUL. √64 n'est pas un
        // irrationnel : il vaut 8. −18/3 n'est pas une fraction : il vaut −6.
        // L'élève qui répond à la forme ÉCRITE au lieu de la VALEUR se trompe
        // presque à tous les coups — et c'est exactement ce que le manuel de
        // Rémy (exercices 45 à 47) cherche à déclencher.
        params: { portee: 'tous' },
        motsClefs: ['ensemble', 'entier', 'naturel', 'relatif', 'décimal', 'rationnel',
            'réel', 'irrationnel', 'racine', 'fraction', 'seconde', 'lycée'],
        tags: { chemin: [D, ENS], niveaux: [SECONDE] },
        instruction: "Calcule d'abord, classe ensuite. √64 n'est pas un irrationnel : "
            + "il vaut 8, c'est un entier. Le dessin des cadres emboîtés rappelle que "
            + "chaque ensemble contient le précédent."
    },
    {
        id: 'sec-union-inter',
        cree: '2026-09-22',
        title: 'Union et intersection d\'intervalles',
        consignePapier: 'Écris l\'ensemble demandé.',
        colonnesPapier: 1,
        generatorId: 'nb.intervalles.ensemblistes', activityId: 'buttons',
        params: { operation: 'toutes', cas: 'tous' },
        motsClefs: ['union', 'intersection', 'intervalle', 'réunion', 'commun',
            'vide', 'crochet', 'seconde', 'lycée'],
        tags: { chemin: [D, ENS], niveaux: [SECONDE] },
        instruction: "Deux intervalles dessinés l'un sous l'autre, sur la même "
            + "graduation. ∩ garde ce qui est dans les DEUX, ∪ ce qui est dans l'un OU "
            + "l'autre. Regarde où les deux traits se superposent."
    },
    {
        id: 'sec-union-inter-vide',
        cree: '2026-09-22',
        title: 'Quand l\'intersection est vide',
        consignePapier: 'Écris l\'ensemble demandé.',
        colonnesPapier: 1,
        generatorId: 'nb.intervalles.ensemblistes', activityId: 'buttons',
        // LES DEUX CAS QU'ON NE VOIT JAMAIS VENIR, isolés pour être travaillés.
        // Mélangés aux autres ils sortent une fois sur cinq, et l'élève n'a
        // jamais l'occasion d'y réfléchir deux fois de suite : il répond « il
        // n'y a pas de réponse » ou bouche le trou, et passe à la suivante.
        params: { operation: 'toutes', cas: 'separes' },
        motsClefs: ['vide', 'ensemble vide', 'union', 'intersection', 'disjoint',
            'intervalle', 'seconde'],
        tags: { chemin: [D, ENS], niveaux: [SECONDE] },
        instruction: "Deux intervalles qui ne se croisent pas, ou qui se touchent "
            + "juste. L'intersection peut être VIDE — cela s'écrit ∅ — et l'union peut "
            + "rester en deux morceaux : on ne bouche pas le trou."
    },
    ...BARREAUX.map(([id, , titre, resume, instruction], i) => ({
        id,
        cree: '2026-09-23',
        title: titre,
        consignePapier: 'Factoriser les expressions suivantes.',
        colonnesPapier: 1,
        generatorId: 'lit.factorisation', activityId: 'buttons',
        params: { barreau: String(i + 1) },
        motsClefs: ['factoriser', 'factorisation', 'identité remarquable',
            'différence de carrés', 'facteur commun', 'calcul littéral', 'seconde',
            'lycée', resume.split(' ')[0].replace(/[^\wxÀ-ÿ²−]/g, '')],
        tags: { chemin: [D, LIT], niveaux: [SECONDE] },
        instruction
    })),
    {
        id: 'fac-revision',
        cree: '2026-09-23',
        title: 'Factoriser : les quatre premiers barreaux',
        consignePapier: 'Factoriser les expressions suivantes.',
        colonnesPapier: 1,
        generatorId: 'lit.factorisation', activityId: 'buttons',
        // LE MÉLANGE VIENT APRÈS LA MONTÉE, jamais à la place. Tant qu'on
        // travaille un barreau, l'élève sait ce qu'on lui demande et peut se
        // concentrer sur COMMENT. Mélangés, les quatre posent une question de
        // plus, qui est la vraie question d'un contrôle : LEQUEL est-ce ?
        params: { barreau: 'revision' },
        motsClefs: ['factoriser', 'révision', 'identité remarquable', 'seconde'],
        tags: { chemin: [D, LIT], niveaux: [SECONDE] },
        instruction: "Les quatre premiers barreaux mélangés. La question n'est plus "
            + "« comment » mais « lequel » : repère d'abord ce qui joue le rôle de a et "
            + "ce qui joue celui de b."
    }
];
