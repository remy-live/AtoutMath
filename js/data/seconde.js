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
const FRAC = TAGS.SOUS_DOMAINE.FRACTIONS;
const RAC = TAGS.SOUS_DOMAINE.RACINES;
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
    ...[
        ['cf-1', '1. Même dénominateur',
            "La marche zéro, et la plus importante : les deux fractions sont déjà "
            + "sur le même dénominateur. On ajoute les NUMÉRATEURS, et le dénominateur "
            + "ne bouge pas. C'est ici que se décide si l'on additionnera un jour les "
            + "dénominateurs."],
        ['cf-2', '2. Un dénominateur multiple de l\'autre',
            "L'un des deux dénominateurs est déjà un multiple de l'autre : on ne "
            + "convertit qu'UNE fraction, et l'on retombe sur le cas précédent."],
        ['cf-3', '3. Dénominateurs quelconques',
            "Ni l'un ni l'autre n'est multiple : on prend leur produit comme "
            + "dénominateur commun, on convertit LES DEUX, et alors seulement on "
            + "additionne les numérateurs."],
        ['cf-4', '4. Fraction × entier',
            "La multiplication au plus simple : l'entier multiplie le NUMÉRATEUR "
            + "seulement. Multiplier le haut et le bas ne changerait rien du tout."],
        ['cf-5', '5. Fraction × fraction',
            "Haut × haut, bas × bas. Mais on SIMPLIFIE d'abord : sinon on manipule "
            + "des nombres à quatre chiffres pour rien."],
        ['cf-6', '6. Plusieurs facteurs, simplifier avant',
            "Trois facteurs, entiers et fractions mêlés. La simplification croisée "
            + "n'est plus un confort : sans elle, le calcul devient impraticable."],
        ['cf-7', '7. Diviser par un entier',
            "La division au plus simple : diviser par 3, c'est multiplier par 1/3. "
            + "C'est le DÉNOMINATEUR qui grandit — le résultat est plus petit."],
        ['cf-8', '8. Diviser par une fraction',
            "Diviser par une fraction, c'est multiplier par son inverse. On retourne "
            + "la SECONDE, jamais la première : la division n'est pas commutative."],
        ['cf-9', '9. Un entier devant une parenthèse',
            "5(2 − 7/3) : le 5 multiplie TOUTE la parenthèse. On calcule la "
            + "parenthèse d'abord, ou l'on distribue sur les deux termes — pas sur un "
            + "seul."],
        ['cf-10', '10. Les priorités',
            "Une multiplication passe avant une soustraction, même quand elle est "
            + "écrite après. On repère les morceaux, on les calcule séparément, et "
            + "l'on assemble à la fin."],
        ['cf-11', '11. Produit de deux parenthèses',
            "Deux parenthèses collées se multiplient : il n'y a pas de signe entre "
            + "elles parce qu'il est sous-entendu. On calcule chacune, puis on "
            + "multiplie."],
        ['cf-12', '12. Une fraction de fractions',
            "La grande barre est une DIVISION. On calcule le haut, puis le bas, puis "
            + "on divise l'un par l'autre — c'est-à-dire qu'on multiplie par "
            + "l'inverse du bas. C'est le barreau le plus haut : il demande tout ce "
            + "qui précède."]
    ].map(([id, titre, instruction], i) => ({
        id,
        cree: '2026-09-23',
        title: titre,
        consignePapier: 'Calculer et donner le résultat sous forme réduite.',
        colonnesPapier: 1,
        generatorId: 'nb.calculFractions', activityId: 'buttons',
        params: { barreau: String(i + 1) },
        motsClefs: ['fraction', 'fractions', 'calcul', 'dénominateur commun',
            'priorités', 'inverse', 'seconde', 'lycée', 'devoir'],
        tags: { chemin: [D, FRAC], niveaux: [SECONDE] },
        instruction
    })),
    {
        // LA QUESTION DU DEVOIR, EN ENTIER — et elle a son identifiant propre
        // plutôt qu'un numéro de barreau : elle ne monte pas d'un cran sur la
        // précédente, elle demande autre chose. Un numéro l'aurait rangée dans
        // l'échelle, où elle n'est pas.
        id: 'cf-ensemble',
        cree: '2026-09-23',
        title: 'Calculer, puis dire l\'ensemble',
        consignePapier: 'Calculer, puis préciser le plus petit ensemble auquel '
            + 'appartient le résultat.',
        colonnesPapier: 1,
        generatorId: 'nb.calculFractions', activityId: 'buttons',
        params: { barreau: 'ensemble' },
        motsClefs: ['fraction', 'ensemble', 'décimal', 'rationnel', 'seconde', 'devoir'],
        tags: { chemin: [D, FRAC], niveaux: [SECONDE] },
        instruction: "La question du devoir, en entier. On calcule, et l'on range le "
            + "RÉSULTAT dans le plus petit ensemble qui le contient. Une fraction "
            + "réduite est décimale si son dénominateur ne garde que des 2 et des 5."
    },
    {
        id: 'cf-revision',
        cree: '2026-09-23',
        title: 'Fractions : les quatre opérations',
        consignePapier: 'Calculer et donner le résultat sous forme réduite.',
        colonnesPapier: 2,
        generatorId: 'nb.calculFractions', activityId: 'buttons',
        params: { barreau: 'revision' },
        motsClefs: ['fraction', 'révision', 'calcul', 'seconde'],
        tags: { chemin: [D, FRAC], niveaux: [SECONDE] },
        instruction: "Les huit premiers barreaux mélangés — les quatre opérations, "
            + "chacune dans tous ses cas. La question n'est plus « comment » mais "
            + "« laquelle » : regarde le signe avant de commencer."
    },
    ...[
        ['rc-1', '1. Les carrés parfaits',
            "Avant tout le reste : reconnaître un carré. √81, c'est le nombre qui, "
            + "multiplié par lui-même, donne 81 — et le dessin le dit autrement : "
            + "c'est le côté d'un carré d'aire 81."],
        ['rc-2', '2. √a × √b, quand tout tombe juste',
            "La racine traverse un produit : √4 × √25 = √100. Ici les deux sont des "
            + "carrés parfaits, donc rien ne reste dessous — on installe la règle sur "
            + "des nombres où l'on peut tout vérifier."],
        ['rc-3', '3. Sortir un carré, en un seul pas',
            "√8 = √(4 × 2) = 2√2. On cherche le carré caché dans le nombre, on le sort, "
            + "et ce qui n'est pas un carré reste dessous. C'est le geste de base, sur "
            + "des nombres où il n'y a qu'un carré à trouver."],
        ['rc-4', '4. Le plus grand carré, ou plusieurs fois de suite',
            "√72 = 6√2 — l'exercice de la photo. Deux carrés sont cachés dedans : on "
            + "peut les sortir d'un coup, ou sortir le premier puis recommencer sur ce "
            + "qui reste. Les deux chemins donnent la même réponse ; ce qui compte, "
            + "c'est de ne pas s'arrêter avant la fin. 3√8 est exact et pas terminé."],
        ['rc-5', '5. Multiplier deux racines',
            "3√2 × 5√6 : les nombres devant se multiplient entre eux, les racines entre "
            + "elles. Et l'on simplifie APRÈS, car le produit des deux radicandes cache "
            + "souvent un carré que ni l'un ni l'autre ne contenait."],
        ['rc-6', '6. Additionner : simplifier d\'abord',
            "2√8 + √18 ne s'additionne pas tel quel : on n'ajoute que des racines "
            + "SEMBLABLES. On simplifie les deux — 4√2 et 3√2 —, et alors seulement on "
            + "ajoute les nombres devant. Le √2 ne bouge pas, comme un x."],
        ['rc-7', '7. La racine ne traverse pas une addition',
            "√(9 + 16) vaut 5, et non 3 + 4. C'est le piège du haut de la page : la "
            + "barre couvre TOUTE la somme, on calcule donc ce qui est dessous avant "
            + "d'en prendre la racine. Et l'on a toujours √(a + b) < √a + √b."],
        ['rc-8', '8. Diviser, et le dénominateur qu\'on rend entier',
            "√50 ÷ √2 = √25 = 5 : la racine traverse le quotient comme le produit. Puis "
            + "la règle d'écriture du lycée : on ne laisse pas de racine en bas d'une "
            + "fraction, on multiplie en haut ET en bas par cette racine."]
    ].map(([id, titre, instruction], i) => ({
        id,
        cree: '2026-09-23',
        title: titre,
        consignePapier: 'Écrire sous la forme la plus simple.',
        colonnesPapier: 2,
        generatorId: 'nb.racines', activityId: 'buttons',
        params: { barreau: String(i + 1) },
        motsClefs: ['racine', 'racines', 'racine carrée', 'radical', 'simplifier',
            'facteurs premiers', 'seconde', 'lycée'],
        tags: { chemin: [D, RAC], niveaux: [SECONDE] },
        instruction
    })),
    {
        id: 'rc-revision',
        cree: '2026-09-23',
        title: 'Racines : les quatre premiers barreaux',
        consignePapier: 'Écrire sous la forme la plus simple.',
        colonnesPapier: 2,
        generatorId: 'nb.racines', activityId: 'buttons',
        params: { barreau: 'revision' },
        motsClefs: ['racine', 'racine carrée', 'révision', 'simplifier', 'seconde'],
        tags: { chemin: [D, RAC], niveaux: [SECONDE] },
        instruction: "Les quatre premiers barreaux mélangés. La question n'est plus "
            + "« comment » mais « combien de carrés y a-t-il là-dedans » : un, deux, ou "
            + "le nombre entier en est un."
    },
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
