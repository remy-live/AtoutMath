import { TAGS } from './tags.js';

// Chapitre « Nombres entiers et décimaux » (6ᵉ), d'après la fiche de cours.
//
// Chaque exercice reprend une activité de la fiche. Les mêmes générateurs
// servent plusieurs exercices avec des paramètres différents : c'est ce qui
// permet d'avoir une progression (entiers seuls, puis décimaux) sans écrire
// de code supplémentaire.

const D = TAGS.DOMAINE.NUMERIQUE;
const NUM = TAGS.SOUS_DOMAINE.NUMERATION;
const DEC = TAGS.SOUS_DOMAINE.DECIMAUX;

/**
 * LES RÉGLAGES DU NINJA, PARTAGÉS PAR SES DEUX ENTRÉES.
 *
 * Le jeu a trois règles pour un seul geste, et deux portes d'entrée au
 * catalogue — une par rubrique. Recopier quarante lignes de réglages donnerait
 * deux listes qui divergeraient au premier ajout ; on les fabrique donc, et
 * seul le mode par DÉFAUT change.
 */
const NINJA_REGLAGES = (mode) => ([

            {
                id: 'mode', type: 'select', label: 'Ce qu\'on coupe', default: mode,
                // LE POURQUOI VA ICI, PAS DANS L'AIDE : une aide de réglage
                // tient en deux phrases courtes, et une épreuve le garde.
                // « Sommes ET produits » est le seul mode où l'élève doit
                // CHOISIR sa règle avant de l'appliquer — et appliquer celle
                // du produit à une somme est l'erreur reine de la 4ᵉ.
                aide: 'Cinq règles pour le même geste. « Zéros inutiles » travaille l\'écriture décimale ; les autres, le signe d\'un calcul de relatifs — et « sommes ET produits » fait CHOISIR la règle.',
                options: [
                    { value: 'negatifs', label: 'Les sommes négatives' },
                    { value: 'positifs', label: 'Les sommes positives (au tir)' },
                    { value: 'produits', label: 'Les produits négatifs' },
                    { value: 'meles', label: 'Les résultats négatifs — sommes ET produits' },
                    { value: 'zeros', label: 'Les zéros inutiles' }
                ]
            },
            {
                id: 'vitesse', type: 'select', label: 'Allure', default: 'normale',
                aide: 'Le temps de vol, pas la difficulté du calcul. « Posée » laisse un tiers de temps en plus pour lire et décider — c\'est souvent ce qu\'il faut la première fois.',
                options: [
                    // UN CRAN DE PLUS QUE « Tranquille ». Rémy : « il faudrait
                    // aussi pour les exercices à chrono rajouter encore une
                    // option qui est plus lente que le plus bas ». Le facteur
                    // vit dans `core/allure.js` ; cette liste n'est que le
                    // menu, et les deux doivent offrir les mêmes crans.
                    { value: 'ralenti', label: 'Au ralenti — deux fois et demie le temps' },
                    { value: 'tranquille', label: 'Tranquille — tout le temps de réfléchir' },
                    { value: 'posee', label: 'Posée — un tiers de temps en plus' },
                    { value: 'normale', label: 'Normale' },
                    { value: 'rapide', label: 'Rapide — pour ceux qui s\'ennuient' }
                ]
            },
            {
                id: 'vies', type: 'select', label: 'Vies',
                options: [{ value: 1, label: '1 vie' }, { value: 3, label: '3 vies' }, { value: 5, label: '5 vies' }],
                default: 3
            },
            {
                id: 'parVague', type: 'select', label: 'Objets par vague',
                options: [{ value: 3, label: '3' }, { value: 5, label: '5' }, { value: 7, label: '7' }],
                default: 5
            }
]);

const REL = TAGS.SOUS_DOMAINE.RELATIFS;
const MENTAL = TAGS.SOUS_DOMAINE.CALCUL_MENTAL;
const LITT = TAGS.SOUS_DOMAINE.LITTERAL;
const SIXIEME = TAGS.NIVEAU.SIXIEME;
const CM2 = TAGS.NIVEAU.CM2;
const CINQUIEME = TAGS.NIVEAU.CINQUIEME;
const QUATRIEME = TAGS.NIVEAU.QUATRIEME;
const TROISIEME = TAGS.NIVEAU.TROISIEME;
// Le chapitre « développer » enjambe le collège et le lycée : la double
// distributivité se voit en 3ème et se réutilise en Seconde pour factoriser.
const SECONDE = TAGS.NIVEAU.SECONDE;

export const numerationExercises = [
    // --- Écriture des nombres (fiche § 1, 2, 3, 19) ---
    // Un seul exercice, et non trois. « Les Grands Nombres » et « Dixièmes et
    // Centièmes » n'étaient pas d'autres exercices : c'était CELUI-CI avec
    // `max` poussé au million et `decimaux` sur « toujours » — deux réglages
    // que le générateur offrait déjà et que personne ne pouvait atteindre,
    // faute d'être exposés. Les anciens titres passent en mots-clefs pour que
    // la recherche continue de mener ici.
    {
        id: 'num-lettres',
        cree: '2026-07-29',
        consignePapier: "Écris en chiffres.",
        colonnesPapier: 2,
        title: 'Des Lettres aux Chiffres',
        generatorId: 'num.lettres', activityId: 'numpad',
        params: { max: 1000, decimaux: 'non' },
        motsClefs: ['grands nombres', 'millions', 'milliers', 'dixièmes', 'centièmes', 'décimaux'],
        tags: { chemin: [D, NUM], niveaux: [CM2, SIXIEME] },
        instruction: "Lis le nombre écrit en toutes lettres et saisis-le en chiffres. "
            + "Le réglage « Jusqu'à » monte jusqu'au million ; « Rangs décimaux » ajoute les dixièmes et les centièmes."
    },

    // --- Rang des chiffres (fiche § 17, 27) ---
    {
        id: 'num-rang',
        cree: '2026-07-29',
        consignePapier: "",
        title: 'Chasse au Chiffre',
        generatorId: 'num.chiffre-rang', activityId: 'bubbles',
        params: { partie: 'entière', decimales: 2 },
        motsClefs: ['rang', 'dizaines', 'dixièmes', 'centièmes', 'partie décimale'],
        tags: { chemin: [D, NUM], niveaux: [CM2, SIXIEME] },
        instruction: "Trouve le chiffre qui occupe le rang demandé. "
            + "Passe « Rangs interrogés » sur « les deux » pour affronter le piège du chapitre : "
            + "dizaines et dixièmes ne sont pas le même rang."
    },

    // --- La fraction décimale (demandée après une séance) ---
    //
    // RÉMY : « on a fait des exercices où il faut convertir 3,5 en 35/10 etc
    // et inversement ».
    //
    // LE CATALOGUE N'AVAIT RIEN, et c'est la lacune la plus surprenante du
    // chapitre : neuf exercices de fractions, cinq de décimaux, et pas un seul
    // qui dise que ce sont les MÊMES nombres. L'élève apprenait les deux
    // écritures côte à côte sans qu'on les lui montre jamais égales.
    {
        id: 'num-fraction-decimale', title: 'Virgule ou Fraction ?',
        cree: '2026-10-13',
        // LA FICHE, AVEC UN VRAI TRAIT DE FRACTION — Rémy : « Faire le pdf
        // pour … Virgule ou fractions ». L'exercice s'imprimait déjà, mais en
        // LIGNE DE TEXTE : « 441/100 = … » écrit à plat demande exactement ce
        // que cet exercice existe pour empêcher — lire une fraction comme deux
        // nombres séparés par une barre. Voir `fractionDecimale` dans
        // `js/ui/fiches/nombres.js`.
        printable: 'fractionDecimale',
        consignePapier: 'Complète l\'égalité entre l\'écriture à virgule et la fraction.',
        colonnesPapier: 3,
        generatorId: 'num.fraction-decimale', activityId: 'numpad',
        // LES DEUX SENS, ET LES DEUX TROUS, DÈS LE DÉPART. Un réglage par
        // défaut qui ne poserait qu'un seul sens enseignerait une recette —
        // c'est précisément ce que cet exercice existe pour empêcher. Le
        // professeur peut les figer pour une remédiation de dix minutes.
        // LES TROIS RANGS COCHÉS, MILLIÈMES COMPRIS — arbitrage de Rémy, le
        // 13 octobre : « cocher par défaut ». Les millièmes existaient dès le
        // premier jour mais partaient décochés, si bien qu'un élève n'en
        // voyait AUCUN tant que le professeur ne les demandait pas. Un rang
        // disponible et jamais tiré est un rang absent.
        params: { sens: 'les-deux', trou: 'les-deux',
            rangs: ['dixiemes', 'centiemes', 'milliemes'], maxEntier: 9, piegeZero: true },
        motsClefs: ['fraction décimale', 'dixièmes', 'centièmes', 'millièmes',
            'écriture à virgule', 'numérateur', 'dénominateur'],
        tags: { chemin: [D, NUM], niveaux: [CM2, SIXIEME] },
        instruction: 'Un nombre à virgule EST une fraction décimale : 3,5 = 35/10. '
            + 'Le numérateur est le nombre écrit sans sa virgule, et le dénominateur '
            + 'porte autant de zéros qu\'il y a de chiffres après la virgule. '
            + 'Attention au zéro qui tient le rang : 7/100 fait 0,07, pas 0,7.'
    },

    // --- Décimaux (fiche § 5, 6) ---
    {
        id: 'num-parties',
        colonnesPapier: 2,
        cree: '2026-07-29',
        consignePapier: "",
        title: 'Entière ou Décimale ?',
        generatorId: 'num.parties', activityId: 'bubbles',
        params: {},
        tags: { chemin: [D, DEC], niveaux: [SIXIEME] },
        instruction: "La virgule sépare les deux parties du nombre. Laquelle te demande-t-on ?"
    },
    {
        id: 'num-zeros',
        cree: '2026-07-29',
        consignePapier: "Enlève les zéros inutiles.",
        colonnesPapier: 3,
        title: 'La Chasse aux Zéros',
        generatorId: 'num.zeros', activityId: 'numpad',
        params: {},
        tags: { chemin: [D, DEC], niveaux: [SIXIEME] },
        instruction: "Enlève les zéros inutiles — mais seulement ceux qui ne changent rien !"
    },

    {
        // COMPTER L'ARGENT — Rémy : « j'aimerai bien aussi un exercice où il
        // faut compter l'argent et par exemple si j'ai 7 centimes, il faut
        // marquer 0,07 ».
        //
        // CE N'EST PAS UN EXERCICE SUR L'ARGENT, C'EST L'EXERCICE SUR LES
        // RANGS DÉCIMAUX — et l'euro en est le meilleur support qui existe :
        // il a exactement deux décimales, la pièce de 1 centime EST le
        // centième, et l'élève a déjà tenu ces pièces dans sa main.
        //
        // IL FAUT TAPER LA RÉPONSE, ET C'EST LE SUJET. Un QCM où l'on choisit
        // entre 0,07 et 0,7 pose une question VOISINE mais pas celle-là : « il
        // faut marquer 0,07 » demande d'ÉCRIRE le zéro qui tient le rang. D'où
        // le pavé numérique, et sa virgule (`meta.decimal`).
        id: 'num-argent',
        cree: '2026-10-15',
        consignePapier: 'Écris le prix en euros.',
        colonnesPapier: 3,
        title: 'Compter l\'Argent',
        generatorId: 'num.argent', activityId: 'numpad',
        motsClefs: ['argent', 'euros', 'centimes', 'prix', 'monnaie', 'pièces',
            'billets', 'centièmes', 'dixièmes', 'virgule'],
        tags: { chemin: [D, DEC], niveaux: [CM2, SIXIEME] },
        instruction: "Neuf marches, en trois temps. On écrit d'abord des centimes seuls (7 centimes, c'est 0,07 € — le zéro des dixièmes n'est pas décoratif), puis des dizaines de centimes, qui sont le piège INVERSE (70 centimes, c'est 0,70 € et non 0,07 €), puis des euros ET des centimes. LE DERNIER TEMPS COMPTE DE VRAIES PIÈCES : un tas est dessiné, à sa vraie taille et dans son vrai métal, et il faut trouver le total — c'est la seule façon de rencontrer les pièces de 20 et de 2 centimes. Le deuxième indice est un tableau de rangs qui montre où va chaque chiffre."
    },

    {
        // LES PETITS PROBLÈMES D'ARGENT — Rémy : « et après tu peux faire des
        // petits problèmes avec calcul », puis « Dans la même catégorie que
        // les billets, l'argent et les prix ».
        //
        // POURQUOI UN EXERCICE DE PLUS, ALORS QUE « HISTOIRES EN PAGAILLE »
        // EXISTE. Vérifié avant d'écrire : ses onze familles travaillent des
        // prix ENTIERS. Or la monnaie rendue sur un billet de 10 € pour un
        // article à 7,40 € est exactement l'endroit où un élève de sixième
        // écrit 3,60 au lieu de 2,60 — ou 2,6 au lieu de 2,60. C'est le rang
        // décimal de « Compter l'Argent », mais dans un problème.
        id: 'num-argent-problemes',
        cree: '2026-10-15',
        consignePapier: 'Lis bien, écris ton calcul, puis la réponse avec son unité.',
        lignesReponsePapier: 2,
        colonnesPapier: 1,
        title: 'Histoires d\'Argent',
        generatorId: 'num.argent-problemes', activityId: 'numpad',
        motsClefs: ['problème', 'argent', 'monnaie', 'euros', 'prix', 'rendre la monnaie',
            'acheter', 'payer', 'reste', 'combien'],
        tags: { chemin: [D, DEC], niveaux: [CM2, SIXIEME] },
        instruction: "Huit situations qu'on rencontre vraiment à une caisse. On commence par une seule opération — le total de deux achats, ce qu'il reste, la monnaie rendue —, puis on multiplie et on partage : plusieurs articles identiques, le prix d'un seul, et combien on peut en acheter avec ce qu'on a. Les deux dernières demandent DEUX calculs : payer deux choses avec un billet, et savoir combien il manque. Les prix sont des décimaux, et c'est tout le sujet : la monnaie rendue sur un billet de 10 € est l'endroit où l'on écrit 3,60 au lieu de 2,60."
    },

    // ── DÉCOMPOSER, PGCD ET PPCM — LE CHAPITRE DE TROISIÈME ────────────────
    //
    // RÉMY : « J'aimerai bien des exercices pour décomposer un nombre et pgcd
    // et ppcm niveau 3ème. Des exercices d'application direct et des petits
    // problèmes ».
    //
    // DEUX ENTRÉES, ET C'EST SA DEMANDE MOT POUR MOT. Le même générateur, deux
    // portes : l'une ouvre sur les marches de technique, l'autre sur les
    // problèmes seuls. Un seul exercice portant les dix marches aurait obligé
    // à décocher sept cases pour donner un travail de problèmes — c'est-à-dire
    // à faire à la main, chaque fois, ce qu'une seconde entrée fait une fois.
    {
        id: 'num-pgcd-ppcm',
        cree: '2026-10-20',
        consignePapier: 'Décompose, puis réponds.',
        colonnesPapier: 2,
        title: 'Décomposer, PGCD et PPCM',
        generatorId: 'num.pgcd-ppcm', activityId: 'numpad',
        // DIX-SEPT MARCHES, ET LE PETIT BAIN D'ABORD. Rémy, une heure après la
        // première version : « le décomposer pgcd et ppcm est bien trop
        // difficile ! ». Les sept marches d'alors étaient toutes au niveau d'un
        // exercice de fin de chapitre, et la première était la plus dure — « 91
        // est-il premier ? ».
        //
        // ON NE DÉCOUPE PAS EN DEUX EXERCICES pour autant : `decoupeMarches`
        // partage les questions DANS L'ORDRE de la progression, et en donne une
        // chacune aux PREMIÈRES quand il y en a moins que de marches. Dix
        // questions sur dix-sept marches jouent donc les dix premières, c'est-à-
        // dire le petit bain, sans aucun réglage ; et le temps C se coche d'un
        // geste quand on veut le haut de l'escalier.
        params: { marches: ['divisible', 'qui-divise', 'liste-diviseurs', 'premier-petit',
            'par-quoi', 'le-quotient', 'decomposer-petit', 'premier', 'decomposer',
            'recomposer', 'pgcd-liste', 'ppcm-liste', 'exposant', 'pgcd', 'ppcm',
            'entre-eux', 'irreductible'] },
        motsClefs: ['pgcd', 'ppcm', 'décomposition', 'facteurs premiers', 'premier',
            'diviseur', 'multiple', 'irréductible', 'premiers entre eux', 'arithmétique',
            'divisibilité', 'critère', 'troisième', '3ème'],
        tags: { chemin: [D, MENTAL], niveaux: [TROISIEME] },
        instruction: "Dix-sept marches, et un escalier qui commence en bas. Le temps A se répond SANS MÉTHODE, par les tables : divisible ou non, lequel divise, la liste des diviseurs, premier ou non sous trente. Le temps B décompose, et en deux gestes d'abord — par quel premier commencer, puis la première division — avant de demander l'écriture entière. Le temps C calcule le PGCD et le PPCM, et là encore il commence par le SENS : les deux listes de diviseurs sont écrites, on y cherche le plus grand commun ; les deux listes de multiples aussi, on y cherche le premier commun. La règle des exposants ne vient qu'après, et une marche la fait LIRE avant qu'on l'applique. Les deux dernières sont les deux usages du PGCD en troisième : « premiers entre eux ? » et la fraction irréductible. Un parcours court joue les premières marches : il suffit de régler le nombre de questions."
    },
    {
        id: 'num-pgcd-ppcm-problemes',
        cree: '2026-10-20',
        consignePapier: 'Lis bien, écris ton calcul, puis la réponse.',
        lignesReponsePapier: 2,
        colonnesPapier: 1,
        title: 'Problèmes de PGCD et de PPCM',
        generatorId: 'num.pgcd-ppcm', activityId: 'numpad',
        params: { marches: ['melange'] },
        motsClefs: ['problème', 'pgcd', 'ppcm', 'paquets', 'bouquets', 'ensemble',
            'carrelage', 'dalles', 'troisième', '3ème'],
        tags: { chemin: [D, MENTAL], niveaux: [TROISIEME] },
        instruction: "Trois situations, et elles sont MÉLANGÉES exprès : savoir calculer les deux ne sert à rien si l'on ne sait pas lequel l'énoncé demande, et c'est là que le contrôle se joue. La règle tient en une phrase : on PARTAGE en parts égales sans reste, donc on cherche un diviseur commun, donc le PGCD — et la réponse est plus PETITE que les nombres de départ ; on ATTEND que deux rythmes se retrouvent, ou l'on AGRANDIT jusqu'à ce que ça tombe juste, donc un multiple commun, donc le PPCM — et la réponse est plus GRANDE. Un élève dont la réponse est du mauvais côté s'est trompé de notion, pas de calcul."
    },

    // --- Décomposition et conversions (fiche § 10, 11, 18, 20, 21) ---
    {
        id: 'num-decomposition',
        cree: '2026-07-29',
        consignePapier: "Complète.",
        title: 'Décomposer, Recomposer',
        generatorId: 'num.decomposition', activityId: 'numpad',
        params: { sens: 'libre' },
        motsClefs: ['décomposition'],
        tags: { chemin: [D, NUM], niveaux: [SIXIEME] },
        instruction: "Retrouve le nombre, ou le terme qui manque dans sa décomposition."
    },
    {
        id: 'num-conversion', title: 'Dizaines, Centaines, Milliers',
        cree: '2026-07-29',
        generatorId: 'num.conversion', activityId: 'numpad',
        params: { decimaux: 'non' },
        motsClefs: ['conversions décimales', 'dixièmes', 'centièmes'],
        tags: { chemin: [D, NUM], niveaux: [SIXIEME] },
        instruction: "Combien font 785 centaines ? Convertis en unités. "
            + "Le réglage « Nombres décimaux » ajoute les dixièmes et les centièmes."
    },

    // --- Numération égyptienne (fiche § 8, 9) ---
    {
        id: 'num-egypte', title: 'Les Nombres des Pharaons',
        colonnesPapier: 3,
        cree: '2026-07-29',
        generatorId: 'num.egypte', activityId: 'numpad',
        // SUR LE PAPIER : les glyphes tracés au PDF, à partir du dessin de
        // Rémy. Deux sens — lire les symboles, ou les écrire ; c'est en les
        // CHOISISSANT qu'on découvre que leur position ne compte pas.
        printable: 'egypte', printGeneratorId: 'num.egypte-fiche',
        printParams: { max: 10000, sens: 'lire' },
        consignePapier: 'Quel nombre est écrit ?',
        params: { max: 10000 },
        motsClefs: ['égypte', 'hiéroglyphes'],
        tags: { chemin: [D, NUM], niveaux: [SIXIEME] },
        instruction: "Bâton = 1, anse = 10, corde = 100, lotus = 1 000, doigt = 10 000. Additionne !"
    },
    {
        id: 'num-egypte-qcm', title: 'Hiéroglyphes Express',
        cree: '2026-07-29',
        generatorId: 'num.egypte', activityId: 'bubbles',
        // SUR LE PAPIER : les glyphes tracés au PDF, à partir du dessin de
        // Rémy. Deux sens — lire les symboles, ou les écrire ; c'est en les
        // CHOISISSANT qu'on découvre que leur position ne compte pas.
        printable: 'egypte', printGeneratorId: 'num.egypte-fiche',
        printParams: { max: 10000, sens: 'ecrire' },
        consignePapier: 'Écris chaque nombre en hiéroglyphes.',
        params: { max: 1000 },
        motsClefs: ['égypte', 'hiéroglyphes'],
        tags: { chemin: [D, NUM], niveaux: [CM2, SIXIEME] },
        instruction: "Lis le nombre égyptien et choisis la bonne réponse."
    },

    // --- Ordre de grandeur (fiche § 23, 24) ---
    {
        id: 'num-ordre-grandeur',
        cree: '2026-07-29',
        consignePapier: "Donne l'ordre de grandeur.",
        colonnesPapier: 3,
        title: 'À Peu Près',
        generatorId: 'num.ordre-grandeur', activityId: 'bubbles',
        params: { decimaux: 'non' },
        motsClefs: ['virgule', 'arrondi', 'entier le plus proche'],
        tags: { chemin: [D, MENTAL], niveaux: [SIXIEME] },
        instruction: "Donne le nombre rond le plus proche : c'est l'ordre de grandeur. "
            + "Avec « Nombres décimaux », on cherche l'entier le plus proche : 7,98 est presque 8."
    },

    // --- La valeur approchée : par défaut, par excès, arrondie ---
    //
    // Rémy, au bout d'une remarque sur le disque : « D'ailleurs tu feras un
    // exercice d'arrondi avec valeur par excès, valeur par défaut, valeur
    // approchée (au dixième, centième, millième). » Il l'a demandé LÀ, et ce
    // n'est pas un hasard : l'erreur d'arrondi du disque est celle-ci, et elle
    // n'a rien à voir avec les disques.
    //
    // « À PEU PRÈS » EST À CÔTÉ, ET CE N'EST PAS LE MÊME EXERCICE. L'ordre de
    // grandeur cherche le nombre ROND le plus proche pour vérifier un calcul ;
    // ici on cherche une valeur au RANG demandé, et l'on distingue trois mots
    // que l'ordre de grandeur confond exprès.
    {
        id: 'num-arrondi',
        cree: '2026-09-07',
        title: 'Par Défaut, par Excès, Arrondi',
        generatorId: 'num.arrondi', activityId: 'numpad',
        consignePapier: 'Donne la valeur demandée. Tu peux écrire l\'encadrement au brouillon.',
        // UNE SEULE COLONNE — Rémy, après relecture du polycopié : « par
        // défaut : 1 colonne ». J'en donnais deux, en me disant qu'un nombre à
        // recopier laissait la place d'écrire la valeur en face. C'est vrai du
        // NOMBRE et faux de la QUESTION : « 3,478 arrondi au centième » tient
        // sur une demi-largeur, mais « la valeur approchée par excès au
        // dixième de 12,0649 » n'y tient pas, et la question se coupait en
        // deux au milieu d'un mot.
        colonnesPapier: 1,
        // LES CINQ ÉTAPES SONT COCHÉES AU DÉPART, l'unité comprise. Rémy a
        // nommé le dixième, le centième et le millième ; l'unité est la marche
        // d'avant, celle où l'on voit l'encadrement sans virgule du tout, et
        // elle prépare les trois autres en deux minutes. Le professeur la
        // décoche s'il l'a déjà passée.
        //
        // ET ON NE LA RETIRE PAS PAR `params` : la fiche ne lit pas `params`,
        // elle lit `printParams` — l'écran et le papier auraient alors deux
        // progressions différentes sans que rien ne le dise.
        motsClefs: ['arrondi', 'valeur approchée', 'par défaut', 'par excès', 'troncature',
            'encadrement', 'dixième', 'centième', 'millième', 'décimal'],
        tags: { chemin: [D, NUM], niveaux: [SIXIEME, CINQUIEME] },
        instruction: 'Un nombre décimal est toujours pris ENTRE DEUX voisins du rang qu\'on '
            + 'demande : au centième, 3,1416 est entre 3,14 et 3,15. La valeur approchée par '
            + 'DÉFAUT est celle du dessous — on garde les chiffres jusqu\'au rang, on coupe le '
            + 'reste. La valeur approchée par EXCÈS est celle du dessus. La valeur ARRONDIE est '
            + 'celle des deux dont on est le plus PROCHE : on regarde le chiffre qui SUIT le '
            + 'rang, et lui seul — 5 ou plus, on monte ; moins de 5, on reste en dessous. '
            + 'ARRONDIR N\'EST PAS COUPER, et c\'est là que tout se joue : les deux donnent le '
            + 'même résultat une fois sur deux, ce qui laisse croire longtemps qu\'on sait faire.'
    },

    // --- La loupe sur la droite graduée (fiche 4ᵉ § C) ---
    // Entre 3 et 4 les dixièmes, entre 3,5 et 3,6 les centièmes : le même
    // geste à deux échelles. C'est ainsi qu'on installe l'idée qu'entre deux
    // décimaux il y en a toujours d'autres — le tableau de numération, lui,
    // ne la donne jamais.
    {
        id: 'num-graduations',
        cree: '2026-08-17',
        consignePapier: "Écris l'abscisse du point.",
        colonnesPapier: 2,
        title: 'La Loupe sur la Droite',
        // SUR LE PAPIER, L'AXE SE DESSINE. Sans rendu imprimé, la feuille
        // sortait la question toute seule — « Sur l'axe ci-dessus, écris
        // l'abscisse du point » — au-dessus de rien. Elle était donc, mot pour
        // mot, impossible à faire.
        printable: 'graduation',
        generatorId: 'num.graduations', activityId: 'numpad',

        motsClefs: ['graduation', 'abscisse', 'décimaux', 'intercaler', 'axe', 'centièmes', 'loupe'],
        tags: { chemin: [D, DEC], niveaux: [CM2, SIXIEME, CINQUIEME, QUATRIEME] },
        instruction: "Entre les deux grands traits, l'axe est coupé en DIX. On compte les INTERVALLES depuis le trait de gauche, jamais les traits. Puis on recommence un cran plus bas : entre 3,5 et 3,6, il y a encore dix intervalles, et un intervalle vaut 0,01. Le réglage « Le pas de la graduation » permet de rester aux centièmes du début à la fin."
    },

    // --- Le vocabulaire du calcul (fiche 4ᵉ § 4, 5, 6, N) ---
    // Le seul chapitre où la bonne réponse ne se déduit de rien : elle se sait.
    // Un élève qui ignore « différence » rate une soustraction qu'il savait
    // faire — c'est un exercice de lecture déguisé en exercice de calcul.
    {
        id: 'num-vocabulaire',
        cree: '2026-08-17',
        consignePapier: "Complète.",
        colonnesPapier: 1,
        title: 'Le Mot Juste',
        generatorId: 'num.vocabulaire', activityId: 'bubbles',
        params: { volets: ['resultat', 'nombres', 'phrase-vers-calcul', 'calcul-vers-phrase', 'multiples', 'posee'] },
        motsClefs: ['somme', 'différence', 'produit', 'quotient', 'termes', 'facteurs',
            'dividende', 'vocabulaire', 'double', 'triple', 'moitié', 'traduire', 'phrase'],
        tags: { chemin: [D, MENTAL], niveaux: [SIXIEME, CINQUIEME, QUATRIEME] },
        instruction: "Somme, différence, produit, quotient : ces mots nomment le RÉSULTAT d'une opération, pas l'opération elle-même. Les nombres, eux, s'appellent les termes dans une addition et les facteurs dans une multiplication. Attention au petit mot de liaison : la somme de 3 ET 2, mais le produit de 3 PAR 2. Le réglage « Ce qu'on demande » permet de ne garder que la traduction phrase ↔ calcul."
    },

    // --- Questions flash (fiche § E, F, 29) ---
    {
        id: 'num-complement-10',
        cree: '2026-07-29',
        consignePapier: "Complète.",
        colonnesPapier: 4,
        title: 'Amis de 10',
        generatorId: 'num.complement', activityId: 'bubbles',
        params: { cible: [10] },
        tags: { chemin: [D, MENTAL], niveaux: [CM2, SIXIEME] },
        instruction: "Combien faut-il ajouter pour faire 10 ?"
    },
    {
        // LES PAIRES. Le complément est un réflexe, et un réflexe se construit
        // en CHERCHANT des paires, pas en répondant à des questions : une
        // table de cartes, on tape 3 puis 7, elles s'envolent. La table vidée,
        // une plus grande arrive.
        id: 'num-amis-de-dix',
        jeu: false, title: 'Les Amis de Dix',
        cree: '2026-08-12',
        activityId: 'dix',
        // Sur le papier, on TRACE le trait au lieu de taper deux cartes : c'est
        // la forme qu'on retrouve en évaluation.
        printable: 'paires', printGeneratorId: 'num.paires-fiche',
        sansRevision: true,
        skills: ['num.complement'],
        params: { cible: [10], vies: 3, mouvement: 'apres' },
        paramSchema: [
            {
                id: 'cible', type: 'multiselect', label: 'Compléter à',
                options: [10, 100, 1000], default: [10]
            },
            {
                id: 'vies', type: 'select', label: 'Vies',
                options: [
                    { value: 3, label: '3 vies' },
                    { value: 5, label: '5 vies' }
                ],
                default: 3
            },
            {
                id: 'mouvement', type: 'select', label: 'Les cartes qui bougent', default: 'apres',
                aide: 'Sur une table immobile, l\'élève retient où sont les cartes au lieu de '
                    + 'calculer. Dès qu\'elles dérivent, il ne reste que « quel nombre va avec '
                    + 'celui-là ». La dérive commence après deux tables.',
                options: [
                    { value: 'apres', label: 'Après deux tables vidées' },
                    { value: 'jamais', label: 'Jamais — table immobile' },
                    { value: 'toujours', label: 'Dès la première table' }
                ]
            }
        ],
        tags: { chemin: [D, MENTAL], niveaux: [CM2, SIXIEME] },
        instruction: "Toutes les cartes sont visibles, et chacune a son amie : tape deux cartes dont la somme fait la cible. Ne cherche pas au hasard — choisis UNE carte, calcule ce qui lui manque, puis cherche ce nombre des yeux. Au bout de deux tables vidées, les cartes se mettent à DÉRIVER : on ne peut plus retenir où elles sont, il faut vraiment calculer."
    },
    {
        // LE CANON. Le complément se PRÉPARE avant de tirer : un boulet
        // ennemi porte 23, la cible est 100, on charge 77 au pavé, on touche
        // le boulet, et le nôtre part à sa rencontre. Somme juste : explosion.
        // Fausse : l'ennemi continue sa route. Le calcul précède le geste.
        id: 'num-canon-complements',
        jeu: false, title: 'Le Canon des Compléments',
        cree: '2026-08-12',
        activityId: 'canon',
        sansRevision: true,
        skills: ['num.complement'],
        params: { cible: 100, vies: 3, vitesse: 'normale' },
        paramSchema: [
            {
                id: 'vitesse', type: 'select', label: 'Allure',
                aide: 'Le temps de descente d\'un astéroïde, pas la difficulté du calcul. « Tranquille » laisse presque le double de temps — c\'est souvent ce qu\'il faut pour découvrir les compléments à 100.',
                options: [
                    // Voir `core/allure.js` : le cran le plus lent n'était pas
                    // assez lent, et c'est la troisième fois qu'on l'entend.
                    { value: 'ralenti', label: 'Au ralenti — deux fois et demie le temps' },
                    { value: 'tranquille', label: 'Tranquille — tout le temps de calculer' },
                    { value: 'posee', label: 'Posée — un quart de temps en plus' },
                    { value: 'normale', label: 'Normale' },
                    { value: 'rapide', label: 'Rapide — pour ceux qui s\'ennuient' }
                ],
                default: 'normale'
            },
            {
                id: 'cible', type: 'select', label: 'Compléter à',
                options: [
                    { value: 10, label: '10 — une voie' },
                    { value: 100, label: '100 — deux voies' },
                    { value: 1000, label: '1 000 — trois voies' }
                ],
                default: 100
            },
            {
                id: 'vies', type: 'select', label: 'Vies',
                options: [
                    { value: 3, label: '3 vies' },
                    { value: 5, label: '5 vies' }
                ],
                default: 3
            }
        ],
        tags: { chemin: [D, MENTAL], niveaux: [CM2, SIXIEME] },
        instruction: "Des astéroïdes foncent sur ton canon orbital, chacun porte un nombre. PRÉPARE ta charge au pavé — un 23 approche et la cible est 100 : charge 77 — puis touche l'astéroïde visé. Si la somme fait la cible, il éclate ; sinon il continue sa route. Le calcul d'abord, le tir ensuite. Au fil des niveaux ils arrivent de plus en plus nombreux, sur plusieurs voies à la fois : c'est là qu'il faut choisir lequel traiter d'abord."
    },
    {
        id: 'num-complement-100',
        cree: '2026-07-29',
        consignePapier: "Complète.",
        colonnesPapier: 3,
        title: 'Amis de 100 et 1000',
        generatorId: 'num.complement', activityId: 'moles',
        params: { cible: [100, 1000], timeLimit: 60, minScore: 10 },
        tags: { chemin: [D, MENTAL], niveaux: [SIXIEME] },
        instruction: "Touche le disque qui porte le complément à 100 ou à 1 000 — avant qu'il ne redescende !"
    },
    {
        id: 'num-parite', title: 'Pair ou Impair',
        cree: '2026-07-29',
        generatorId: 'num.parite', activityId: 'buttons',
        params: { max: 99 },
        tags: { chemin: [D, NUM], niveaux: [CM2, SIXIEME] },
        instruction: "Regarde seulement le chiffre des unités."
    },

    // --- Nombres relatifs ---------------------------------------------------
    // Quatre portes d'entrée sur la même notion, et donc UN exercice : le
    // réglage « Niveau » choisit le modèle. En progressif on traverse
    // l'ascenseur, le thermomètre, les pastilles puis l'écriture ; en fixant un
    // niveau on REVIENT sur le modèle où l'élève bloque. C'était déjà exactement
    // ce que faisaient les quatre entrées séparées, à ceci près qu'aucune ne
    // laissait passer d'un modèle à l'autre sans ressortir de l'exercice.
    {
        id: 'num-relatifs', title: 'Nombres Relatifs',
        cree: '2026-08-07',
        consignePapier: "Calcule.",
        colonnesPapier: 2,
        generatorId: 'num.relatifs', activityId: 'relatifs',
        params: { reponse: 'saisie' },
        motsClefs: ['thermomètre', 'ascenseur', 'pastilles', 'températures',
            'sommes de relatifs', 'négatifs', 'la montée'],
        tags: { chemin: [D, REL], niveaux: [CINQUIEME, QUATRIEME] },
        instruction: "Un nombre relatif, c'est une POSITION. L'addition, c'est un DÉPLACEMENT : compte les crans, n'additionne pas les distances. Le réglage « Niveau » choisit le modèle — l'ascenseur, le thermomètre, les pastilles qui s'annulent, ou l'écriture (+3) + (−5) — ou les enchaîne tous."
    },
    {
        id: 'num-dictee',
        jeu: false, title: 'Dictée de Grands Nombres',
        cree: '2026-08-10',
        activityId: 'dictee', skills: ['num.ecriture.lettres'],
        params: { palier: 'grands' },
        paramSchema: [
            {
                id: 'palier', type: 'select', label: 'Taille des nombres',
                options: [
                    { value: 'milliers', label: 'Jusqu\'à 99 999' },
                    { value: 'grands', label: 'Jusqu\'à 999 999' },
                    { value: 'millions', label: 'Jusqu\'aux millions' }
                ],
                default: 'grands'
            }
        ],
        tags: { chemin: [D, NUM], niveaux: [CM2, SIXIEME] },
        instruction: "Le nombre n'est pas écrit : il est DIT. Appuie sur le haut-parleur, écoute, puis écris-le en chiffres. On peut réécouter autant de fois qu'on veut, et ralentir la voix. La correction affiche le nombre en lettres à côté des chiffres : c'est là qu'on voit ce qu'on avait mal entendu. Si l'appareil n'a pas de voix, le nombre s'affiche en lettres."
    },
    {
        // LE MÊME JEU, TROIS RÈGLES — donc un exercice, et non quatre.
        //
        // Le geste est identique dans tous les cas : des objets traversent
        // l'écran, on décide de chacun. Seule la RÈGLE change, et elle tenait
        // déjà dans le paramètre `mode` que le jeu lisait. Les quatre entrées
        // séparées cachaient d'ailleurs un défaut : « Ninja des Nombres »
        // réglait `cibleMax` et `lives`, deux noms que rien dans le code ne
        // lisait, et ne disait pas son mode — il servait donc les résultats
        // négatifs, à l'identique du « Ninja des Résultats Négatifs », avec
        // deux curseurs sans effet.
        id: 'num-ninja', title: 'Ninja des Relatifs',
        cree: '2026-08-10',
        // Trois règles pour le même geste : les zéros inutiles d'un côté, le
        // signe d'une somme de relatifs de l'autre. Les deux sont déclarées.
        activityId: 'ninja', skills: ['num.decimal.zeros', 'num.relatifs.somme'],
        // Un objet raté est une erreur de règle, pas une erreur de calcul : on
        // l'affiche tout de suite, mais on ne surcharge pas le carnet avec les
        // ratés de vitesse.
        sansRevision: true,
        params: { vitesse: 'normale', mode: 'negatifs', vies: 3, parVague: 5 },
        paramSchema: NINJA_REGLAGES('negatifs'),
        motsClefs: ['zéros inutiles', 'décimaux', 'relatifs', 'négatifs', 'positifs', 'tir', 'trancher'],
        tags: { chemin: [D, REL], niveaux: [CM2, SIXIEME, CINQUIEME, QUATRIEME] },
        instruction: "Des objets traversent l'écran, chacun porte un nombre ou un calcul, et la règle est écrite en haut du début à la fin. Coupe ceux qu'elle désigne, laisse filer les autres : se tromper coûte une vie, laisser passer aussi — ne rien faire n'est pas une stratégie. Le réglage « Ce qu'on coupe » change la règle : les résultats négatifs, les résultats positifs (on tire au lieu de trancher), ou les zéros inutiles d'une écriture décimale."
    },
    // LE MÊME JEU, UNE AUTRE RUBRIQUE — Rémy : « y a plus le jeu où on coupe
    // les zéros », puis « un exercice peut appartenir à plusieurs catégories
    // mais avec un paramètre qui lui permet d'être dans une rubrique et un
    // autre paramètre dans l'ordre ».
    //
    // C'EST EXACTEMENT LE CAS DU NINJA, ET C'EST LE SEUL DU CATALOGUE. Audité
    // sur les 153 exercices : quatre sont à cheval sur deux rubriques, mais
    // trois le sont EN PERMANENCE — les Arpenteurs multiplient et calculent des
    // aires à chaque partie — et les chapitres, qui se rangent par compétence,
    // les placent déjà des deux côtés. Le Ninja est le seul dont un RÉGLAGE
    // change ce qu'on travaille : « zéros inutiles » relève de l'écriture
    // décimale, « résultats négatifs » des relatifs.
    //
    // Quatre entrées avaient été fusionnées en une, et la fusion corrigeait un
    // vrai défaut — deux d'entre elles servaient la même chose avec des
    // curseurs sans effet. Mais elle a coûté la VISIBILITÉ des zéros : le mode
    // survivait dans un réglage d'un exercice qui porte le nom d'autre chose,
    // et Rémy l'a cherché en vain. Deux entrées, donc, une par rubrique — même
    // activité, même écran, un défaut de réglage différent. On garde le menu
    // complet dans les deux : ce n'est pas une amputation, c'est une porte
    // d'entrée de plus.
    {
        id: 'num-ninja-zeros', title: 'Ninja des Zéros',
        cree: '2026-09-04',
        activityId: 'ninja', skills: ['num.decimal.zeros'],
        sansRevision: true,
        params: { vitesse: 'normale', mode: 'zeros', vies: 3, parVague: 5 },
        paramSchema: NINJA_REGLAGES('zeros'),
        motsClefs: ['zéros inutiles', 'décimaux', 'écriture décimale', 'trancher', 'ninja',
            'barrer les zéros', 'zéro'],
        tags: { chemin: [D, DEC], niveaux: [CM2, SIXIEME] },
        instruction: "Des nombres traversent l'écran et tu tranches LES ZÉROS INUTILES, ceux qu'on peut effacer sans changer le nombre. Un zéro est inutile s'il est DEVANT le nombre — 048 s'écrit 48 — ou tout à la FIN après la virgule : 2,90 s'écrit 2,9. Les autres tiennent la place d'un rang et doivent rester : dans 4,08 le zéro dit qu'il n'y a pas de dixième, et dans 250 qu'il n'y a pas d'unité. Attention, laisser filer un zéro inutile coûte une vie, comme trancher un zéro utile : ne rien faire n'est pas une stratégie."
    },
    {
        // LE NINJA DES DEUX RÈGLES — « et aussi des jeux en rapport avec cela ».
        //
        // LE MOTEUR SAVAIT DÉJÀ TRIER DES CALCULS ; il ne savait tirer que des
        // SOMMES. Deux modes de plus dans `js/core/tri.js`, et le jeu qui
        // existait depuis août devient celui de la règle des signes.
        //
        // UNE PORTE À PART, ET NON UN RÉGLAGE DE PLUS. Les deux modes sont
        // accessibles depuis « Ninja des Relatifs » en changeant « ce qu'on
        // coupe » — mais un réglage que personne ne déplie n'existe pas : 87
        // exercices portent un dessin sous leurs indices que personne ne voit,
        // on connaît la leçon. Celui-ci s'ouvre déjà réglé sur « mêlés », qui
        // est le seul mode où l'élève doit CHOISIR sa règle avant de
        // l'appliquer.
        id: 'num-ninja-relatifs-meles', title: 'Le Ninja des Deux Règles',
        cree: '2026-10-15',
        activityId: 'ninja', skills: ['num.relatifs.somme', 'num.relatifs.produit'],
        sansRevision: true,
        params: { vitesse: 'posee', mode: 'meles', vies: 3, parVague: 5 },
        paramSchema: NINJA_REGLAGES('meles'),
        motsClefs: ['règle des signes', 'relatifs', 'somme', 'produit', 'négatif',
            'trancher', 'ninja', 'arcade'],
        tags: { chemin: [D, REL], niveaux: [QUATRIEME] },
        instruction: "Des bulles traversent l'écran, et chacune porte une somme OU un produit de relatifs. Tu coupes celles dont le résultat est négatif. Le piège est tout le chapitre : dans une somme, c'est le nombre le plus éloigné de zéro qui donne le signe ; dans un produit, ce sont les signes des deux facteurs. Regarde l'opération AVANT les signes. L'allure part en « posée » — un tiers de temps en plus — parce qu'ici il faut d'abord CHOISIR la règle."
    },
    {
        id: 'num-relatifs-addition',
        cree: '2026-08-10',
        consignePapier: "Simplifie et calcule.",
        colonnesPapier: 3,
        title: 'Additionner des Relatifs, pas à pas',
        generatorId: 'num.relatifs.addition', activityId: 'add-relatifs',
        params: { reponse: 'saisie' },
        motsClefs: ['signes différents', 'pastilles', 'simplifier', 'écriture'],
        tags: { chemin: [D, REL], niveaux: [CINQUIEME, QUATRIEME] },
        instruction: "Douze marches, deux questions chacune. D'abord des pastilles toutes de la même couleur — il n'y a qu'à compter, et on apprend l'écriture. Puis des pastilles des DEUX couleurs : une rouge et une bleue valent zéro ensemble, on les élimine par paires, et la soustraction apparaît toute seule. Ensuite on simplifie les écritures, et on finit avec une virgule. Le réglage « Étape » permet de se poser sur le passage difficile — (+7) + (−3) — et d'y rester."
    },
    {
        // MULTIPLIER DES RELATIFS. Rémy : « j'aimerais bien des exercices sur
        // les produits de nombres relatifs ».
        //
        // LA PREMIÈRE MARCHE NE DEMANDE PAS DE CALCULER, elle demande le SIGNE.
        // C'est là que se joue le contresens du chapitre : l'élève qui vient
        // d'apprendre que (−3) + (−4) = −7 écrit tout naturellement
        // (−3) × (−4) = −12. Séparer les deux gestes — trouver le signe, puis
        // multiplier les distances à zéro — est ce qui permet de travailler
        // celui qui coince sans le noyer dans l'autre.
        id: 'num-relatifs-produit',
        cree: '2026-08-27',
        consignePapier: "Compte d'abord les facteurs négatifs : leur nombre décide du signe.",
        colonnesPapier: 3,
        title: 'Multiplier des Relatifs, pas à pas',
        generatorId: 'num.relatifs.produit', activityId: 'bubbles',
        motsClefs: ['règle des signes', 'produit', 'multiplication', 'négatif', 'positif',
            'facteurs', 'carré', 'opposé'],
        tags: { chemin: [D, REL], niveaux: [QUATRIEME] },
        instruction: "Douze marches, deux questions chacune. LES CINQ PREMIÈRES NE DEMANDENT PAS DE CALCULER : seulement de dire si le produit sera positif ou négatif. C'est le vrai sujet du chapitre — (−3) + (−4) fait −7, mais (−3) × (−4) fait +12, et ce n'est pas la même règle. Ensuite on calcule, d'abord avec les parenthèses puis sans. Les trois dernières marches passent à plusieurs facteurs : on ne récite plus une règle, on COMPTE les facteurs négatifs, et leur parité décide. La dernière garde les cas à part : le zéro, le 1, le −1, et le carré d'un négatif — (−4)² vaut +16, mais −4² vaut −16."
    },
    {
        // SOMME OU PRODUIT ? — celui qui fait CHOISIR la règle.
        //
        // RÉMY : « en ce moment avec mes 4ᵉ, je fais les additions,
        // soustractions, simplification et multiplications de nombres
        // relatifs, c'est pas simple pour eux. Quel type d'exercice
        // pourrait-on faire pour bien les entraîner ».
        //
        // NEUF EXERCICES TOUCHAIENT DÉJÀ LES RELATIFS, et le calcul était
        // couvert. Le trou : chacun ANNONCE son opération. On entre dans
        // « Multiplier », donc on multiplie. Or l'erreur reine de la 4ᵉ n'est
        // pas d'ignorer une règle, c'est d'appliquer celle du produit à une
        // somme — « moins et moins font plus », donc −3 − 5 = 8. Un élève qui
        // ne rencontre jamais les deux opérations dans la même minute
        // s'entraîne à appliquer celle qu'on lui a annoncée.
        //
        // ET LE RÉSULTAT VIENT APRÈS LE SIGNE, Rémy : « et après on peut aussi
        // demander le résultat ».
        id: 'num-relatifs-melange',
        cree: '2026-10-15',
        consignePapier: 'Regarde l’opération AVANT les signes : la règle n’est pas la même.',
        colonnesPapier: 3,
        title: 'Somme ou Produit ?',
        generatorId: 'num.relatifs.melange', activityId: 'buttons',
        motsClefs: ['règle des signes', 'somme', 'produit', 'addition', 'multiplication',
            'négatif', 'positif', 'confusion'],
        tags: { chemin: [D, REL], niveaux: [QUATRIEME] },
        instruction: "Onze marches. LES TROIS PREMIÈRES MONTRENT LES DEUX ÉCRITURES CÔTE À CÔTE : les mêmes deux nombres, avec + et avec ×, et une seule question — lequel donne un résultat positif ? On ne calcule rien, on choisit la règle. Ensuite le signe d’une seule expression, somme ou produit au hasard, puis sans les parenthèses — c’est là que −3 − 5 et −3 × (−5) se ressemblent le plus. Les quatre dernières demandent le résultat, et le premier piège y est toujours le résultat de L’AUTRE opération."
    },
    {
        // LE RÉFLEXE DU SIGNE, CONTRE LA MONTRE.
        //
        // RÉMY, juste après avoir choisi l'exercice d'apprentissage : « et
        // puis après viser des automatismes, au début on applique, comment
        // après rendre cela un peu ludique et vraiment ancrer les réflexes ».
        //
        // RIEN À ÉCRIRE POUR ÇA, ET C'EST LE POINT : un exercice, dans ce
        // logiciel, est un GÉNÉRATEUR plus une ACTIVITÉ. Le même générateur
        // rejoué en contre-la-montre devient l'entraînement au réflexe, et il
        // garde tout — les pièges qui nomment la confusion, l'explication, le
        // carnet d'erreurs. C'est déjà ce que font « Sprint des Notations » et
        // « Attrape le Résultat ».
        //
        // ET SEULEMENT LES MARCHES DU SIGNE. Un chronomètre sur un calcul
        // mental demande deux choses à la fois ; ce qu'on veut ancrer ici, et
        // qui doit devenir instantané, c'est « quelle règle s'applique ? ».
        id: 'num-relatifs-melange-sprint',
        cree: '2026-10-15',
        consignePapier: 'Donne le SIGNE du résultat, sans calculer.',
        colonnesPapier: 4,
        title: 'Réflexe des Signes',
        generatorId: 'num.relatifs.melange', activityId: 'sprint',
        params: { marches: ['signe-somme', 'signe-produit', 'signe-melange', 'signe-simple'] },
        motsClefs: ['règle des signes', 'automatisme', 'réflexe', 'chrono', 'somme', 'produit'],
        tags: { chemin: [D, REL], niveaux: [QUATRIEME] },
        instruction: "Le même travail que « Somme ou Produit ? », mais contre la montre et sur le SIGNE seul. On ne calcule rien : on regarde l'opération, et l'on répond. C'est l'étape d'après celle où l'on applique la règle — celle où elle doit devenir instantanée."
    },
    {
        // LE MÊME, EN ARCADE — « un peu ludique », demandé le même jour.
        //
        // ICI ON CALCULE, et c'est voulu : la taupe apporte le jeu, donc la
        // question peut redemander un résultat sans que la séance devienne un
        // contrôle. Les marches mêlées seulement : attraper le bon nombre
        // quand la série alterne sommes et produits, c'est exactement le
        // réflexe qu'on cherche, avec la main en plus.
        //
        // LE TITRE MENTAIT, ET RÉMY L'A DIT AUTREMENT : « il faut aussi faire
        // faire des calculs pas que le signe ». Cette porte-ci DEMANDE le
        // résultat depuis le premier jour — ses marches sont `calcul-melange`
        // et `calcul-simple` — mais elle s'appelait « Attrape le Bon Signe ».
        // Un professeur qui la prenait pour travailler le signe recevait du
        // calcul mental ; un titre qui ment coûte une séance.
        id: 'num-relatifs-melange-arcade',
        cree: '2026-10-15',
        consignePapier: 'Calcule. Attention : somme ou produit, ce n’est pas la même règle.',
        colonnesPapier: 4,
        title: 'Attrape le Résultat Relatif',
        generatorId: 'num.relatifs.melange', activityId: 'moles',
        params: { marches: ['calcul-melange', 'calcul-simple'] },
        motsClefs: ['règle des signes', 'automatisme', 'arcade', 'somme', 'produit',
            'calcul mental', 'résultat'],
        tags: { chemin: [D, REL], niveaux: [QUATRIEME] },
        instruction: "Les sommes et les produits se suivent sans prévenir, et l'on attrape le bon résultat. Le piège est toujours là : la proposition la plus tentante est le résultat de L'AUTRE opération."
    },
    {
        // LE CALCUL CONTRE LA MONTRE — ET C'EST UN ARBITRAGE DE RÉMY QUI
        // RENVERSE LE MIEN.
        //
        // J'avais écrit, en montant « Réflexe des Signes » : « un chronomètre
        // sur un calcul mental demande deux choses à la fois, et n'ancre ni
        // l'une ni l'autre » — et noté dans les remarques « à revoir si Rémy
        // constate le contraire en classe ». Il l'a constaté : « pour les
        // sommes et produits il faut aussi faire faire des calculs pas que le
        // signe ».
        //
        // LES DEUX PORTES RESTENT, ET ELLES NE FONT PAS DOUBLON : l'une ancre
        // le CHOIX de la règle, l'autre son APPLICATION. C'est l'ordre dans
        // lequel on les prend qui compte — le signe d'abord, le résultat
        // ensuite.
        id: 'num-relatifs-melange-calcul',
        cree: '2026-10-15',
        consignePapier: 'Calcule. Regarde l’opération AVANT les signes.',
        colonnesPapier: 4,
        title: 'Calcul Express des Relatifs',
        generatorId: 'num.relatifs.melange', activityId: 'sprint',
        params: { marches: ['calcul-somme', 'calcul-produit', 'calcul-melange', 'calcul-simple'] },
        motsClefs: ['règle des signes', 'calcul mental', 'chrono', 'automatisme',
            'somme', 'produit', 'résultat'],
        tags: { chemin: [D, REL], niveaux: [QUATRIEME] },
        instruction: "Le RÉSULTAT, contre la montre. On commence par des sommes seules, puis des produits seuls, puis les deux mêlés, et enfin sans les parenthèses — c'est là que −3 − 5 et −3 × (−5) se ressemblent le plus. À prendre APRÈS « Réflexe des Signes » : tant que la règle ne se choisit pas toute seule, la chronométrer fait deux choses à la fois."
    },
    {
        // LE DÉTOUR PAR LE NOMBRE ROND.
        //
        // RÉMY : « j'aimerai bien des exercices de calcul mentaux du genre
        // 76 + 9 ou 76 + 99 ou 156 − 9 ou 156 − 99, il faut que l'élève
        // comprenne qu'on retire un et qu'on ajoute 10 (en tout cas pour le
        // 9), etc, et qu'on en fasse des ludiques, voire des challenges
        // vitesse mais facultatif ».
        //
        // CE QU'IL DEMANDE N'EST PAS « CALCULE 76 + 9 » : c'est la STRATÉGIE.
        // Le résultat n'est que la preuve qu'on l'a employée — un exercice qui
        // ne demanderait que lui laisserait l'élève poser son addition en
        // colonne dans sa tête, ce qu'il fait déjà.
        //
        // ET LA DIFFICULTÉ EST À UN POINT PRÉCIS : la compensation change de
        // sens avec l'opération. 76 + 9 = 76 + 10 − 1, mais 156 − 9 =
        // 156 − 10 + 1. Les marches 2 et 3 ne travaillent que ce renversement,
        // et sans aucun calcul.
        id: 'calc-detour-rond',
        cree: '2026-10-15',
        consignePapier: 'Passe par le nombre rond, puis fais le petit pas qui reste.',
        colonnesPapier: 4,
        title: 'Le Détour par le Nombre Rond',
        generatorId: 'calc.detour', activityId: 'buttons',
        // LES NOMBRES SONT DES MOTS-CLEFS, et c'est Rémy qui l'a vu : « le nom
        // Détour Express n'est pas évident car si je tape 99 dans la barre de
        // recherche, j'aurai pu espérer tomber dessus ».
        //
        // MESURÉ AVANT DE CORRIGER : « 99 » rendait ZÉRO résultat, « 101 » et
        // « 19 » aussi. L'exercice existe précisément pour 76 + 99, et le
        // nombre 99 n'était écrit nulle part de cherchable — ni dans le
        // titre, ni dans les mots-clefs, ni dans la consigne. Seuls 9, 8 et 98
        // se trouvaient, et par accident : ils figuraient dans une phrase
        // d'exemple.
        //
        // UNE GARDE LES TIENT À LA TABLE `VOISINS` du générateur : ajouter un
        // voisin sans ajouter son nombre ici fait rougir l'épreuve.
        motsClefs: ['calcul mental', 'ajouter 9', 'retirer 9', 'compensation',
            'nombre rond', 'dizaine', 'centaine', 'astuce',
            '9', '99', '8', '98', '11', '101', '19', '21'],
        tags: { chemin: [D, MENTAL], niveaux: [CM2, SIXIEME, CINQUIEME] },
        instruction: "Dix marches. LES TROIS PREMIÈRES NE DEMANDENT AUCUN CALCUL : trouver le nombre rond caché (9 c'est 10 − 1, 98 c'est 100 − 2), puis dire ce qu'on fait APRÈS le grand saut. C'est là qu'est le piège du chapitre : pour ajouter 9 on ajoute 10 puis on retire 1, mais pour RETIRER 9 on retire 10 puis on AJOUTE 1. Ensuite on écrit la ligne du milieu — 76 + 10 − 1 —, et seulement après on calcule. Le deuxième indice est un dessin : le grand saut, puis le petit pas en arrière."
    },
    {
        // LE MÊME, CONTRE LA MONTRE — « voire des challenges vitesse mais
        // facultatif ». Facultatif : c'est un exercice à part, que Rémy met
        // dans une séance ou n'y met pas. L'apprentissage ne dépend pas de lui.
        id: 'calc-detour-sprint',
        cree: '2026-10-15',
        consignePapier: 'Calcule de tête, en passant par le nombre rond.',
        colonnesPapier: 5,
        title: 'Détour Express',
        generatorId: 'calc.detour', activityId: 'sprint',
        params: { marches: ['calcul-plus', 'calcul-moins', 'calcul-melange', 'calcul-voisins'] },
        // LES MÊMES NOMBRES QUE LA PORTE D'APPRENTISSAGE : c'est cette
        // porte-ci que Rémy cherchait en tapant « 99 ».
        motsClefs: ['calcul mental', 'chrono', 'automatisme', 'ajouter 9', 'retirer 9',
            '9', '99', '8', '98', '11', '101', '19', '21'],
        tags: { chemin: [D, MENTAL], niveaux: [CM2, SIXIEME, CINQUIEME] },
        instruction: "Le même calcul, contre la montre. On ne travaille plus la méthode — on vérifie qu'elle est devenue automatique. À prendre quand les trois premières marches du « Détour » sont acquises, pas avant."
    },
    {
        // ET EN ARCADE — « qu'on en fasse des ludiques ».
        id: 'calc-detour-arcade',
        cree: '2026-10-15',
        consignePapier: 'Attrape le bon résultat.',
        colonnesPapier: 5,
        title: 'Attrape le Détour',
        generatorId: 'calc.detour', activityId: 'moles',
        params: { marches: ['calcul-melange', 'calcul-voisins'] },
        motsClefs: ['calcul mental', 'arcade', 'ajouter 9', 'retirer 9', 'compensation',
            '9', '99', '8', '98', '11', '101', '19', '21'],
        tags: { chemin: [D, MENTAL], niveaux: [CM2, SIXIEME, CINQUIEME] },
        instruction: "Les additions et les soustractions se suivent sans prévenir. Le piège est toujours le même : le nombre où l'on s'arrête quand on a sauté sans revenir."
    },
    {
        // LE SERPENT LITTÉRAL. Rémy : « Quel jeu sympa comme Nova ou le
        // Peintre pourrait-on mettre en place ? »
        //
        // CE QUE CES DEUX JEUX ONT EN COMMUN, et qui commande tout : LE CALCUL
        // EST LE MOUVEMENT. On ne pose pas une question entre deux tirs — c'est
        // le déplacement lui-même qui est le calcul. Un « shoot'em up où l'on
        // répond à un QCM entre deux vagues » n'aurait été ni l'un ni l'autre.
        //
        // ET LE CHOIX DU CHAPITRE EST MESURÉ, pas deviné : la 4e comptait SIX
        // jeux d'arcade contre vingt-sept en 6e, et cinq de ces six étaient du
        // calcul mental. Le calcul littéral n'en avait aucun.
        //
        // LA TROUVAILLE : LE CORPS DU SERPENT EST L'EXPRESSION. Chaque anneau
        // porte un terme, dans l'ordre où on l'a ramassé, et deux anneaux
        // VOISINS qui se ressemblent fusionnent — le serpent raccourcit.
        // Ramasser 2x, 3x, puis 5 donne deux anneaux ; ramasser 2x, 5, puis 3x
        // en donne trois, parce que le 5 s'est glissé entre les deux x.
        //
        // L'ORDRE DE RAMASSAGE EST DONC L'ORDRE DE RÉDUCTION. « On regroupe les
        // termes semblables » cesse d'être une consigne à retenir : c'est ce
        // qui garde en vie. Un élève qui croit que 2x + 3 se réduit ramasse
        // dans le désordre, s'allonge, et se mord — sans qu'on lui ait rien
        // dit, et c'est le but.
        //
        // ON NE DIT JAMAIS « FAUX ». Ramasser un terme qui ne se regroupe avec
        // rien est un choix légitime, parfois le seul possible. Il coûte un
        // anneau, et l'anneau se voit. La sanction est dans la mécanique.
        id: 'num-serpent',
        cree: '2026-09-04',
        title: 'Le Serpent Littéral',
        activityId: 'serpent',
        skills: ['num.litteral.reduire'],
        sansRevision: true,
        params: { depuis: 0, vies: 3 },
        paramSchema: [
            {
                id: 'depuis', type: 'select', label: 'Commencer au terrain',
                options: [
                    { value: 0, label: '1 — Des x et des nombres' },
                    { value: 1, label: '2 — Plus de termes' },
                    { value: 2, label: '3 — Les carrés arrivent' },
                    { value: 3, label: '4 — Carrés et cubes' },
                    { value: 4, label: '5 — Les négatifs' },
                    { value: 5, label: '6 — Tout à la fois' }
                ],
                default: 0,
                aide: 'Les six terrains s\'enchaînent, chacun ajoutant une chose : les carrés, les '
                    + 'cubes, puis les coefficients négatifs. Démarrer plus haut sert à reprendre '
                    + 'un point qui coince.'
            },
            {
                id: 'vies', type: 'number', label: 'Nombre de vies', default: 3, min: 1, max: 9,
                aide: 'Une vie perdue rejoue LE MÊME terrain : recommencer ailleurs '
                    + 'punirait sans laisser retenter le rangement qu\'on vient de rater.'
            }
        ],
        motsClefs: ['calcul littéral', 'réduire', 'termes semblables', 'expression',
            'serpent', 'regrouper', 'coefficient', 'carré', 'cube', 'arcade'],
        tags: { chemin: [D, LITT], niveaux: [CINQUIEME, QUATRIEME] },
        instruction: "Tu es un serpent, et CHAQUE ANNEAU DE TON CORPS PORTE UN TERME — dans l'ordre où tu l'as ramassé. Deux anneaux VOISINS qui se ressemblent fusionnent aussitôt, et tu raccourcis. C'est là tout le jeu. Ramasse 2x, puis 3x, puis 5 : les deux x se touchent, ils fusionnent, il te reste deux anneaux. Ramasse 2x, puis 5, puis 3x : le 5 s'est glissé entre les deux x, plus rien ne fusionne, et te voilà à trois anneaux. L'ordre dans lequel tu ramasses EST l'ordre dans lequel tu réduis. Un serpent long est un serpent qui se mord, alors ramasse les termes semblables À LA SUITE. La couleur t'aide : même couleur, même famille. Et deux opposés — 3x puis −3x — ne laissent pas un anneau à zéro : ils ne laissent RIEN, l'anneau disparaît. C'est le meilleur coup du jeu. Flèches du clavier, ZQSD, ou glisse le doigt sur le terrain."
    },
    {
        // LA BALANCE — parce que le chapitre « Équations » de 4e était VIDE.
        //
        // Pas « à venir » : structurellement inatteignable. Onze chapitres de la
        // progression ne déclaraient aucune compétence, et `chapitresDe`
        // associe PAR compétence — un chapitre à la liste vide ne peut donc
        // s'accrocher à rien, quel qu'en soit le contenu. Rémy a choisi ce
        // chapitre-là parmi les onze, et c'est le plus lourd : celui où le plus
        // d'élèves décrochent.
        //
        // POURQUOI UNE BALANCE PLUTÔT QU'UNE SUITE DE RÈGLES. « On fait la même
        // chose des deux côtés » est la phrase que tout le monde récite et que
        // presque personne ne comprend : elle énonce le résultat, elle
        // n'explique rien. Sur une balance il n'y a rien à expliquer — retirer
        // trois poids d'un seul plateau fait pencher le fléau, et la seule
        // façon de le redresser est de retirer les trois autres.
        //
        // ON LAISSE DONC FAIRE LA FAUTE. Le geste porte sur UN plateau, la
        // balance penche pour de bon, l'égalité cesse d'être vraie, et l'écran
        // attend le geste jumeau. Appliquer chaque geste aux deux côtés à la
        // fois aurait été plus simple à écrire et aurait tout gâché : l'élève
        // n'aurait jamais vu ce qu'il évite.
        //
        // ET L'ORDRE DES GESTES S'APPREND PAR UN REFUS. « 2x + 5 = 17 » ne se
        // partage pas en deux — 5 et 17 sont impairs —, et le bouton le dit.
        // C'est exactement pourquoi on retire les poids AVANT de diviser :
        // la règle n'est pas récitée, elle est rencontrée.
        // --- Tester, et les programmes de calcul : le trou de la quatrième ---
        //
        // RÉMY : « Equations (tester et retour - Résolution et programme de
        // calcul (Exercices type de brevet)) ». Mesuré avant d'écrire : la
        // Balance RÉSOUT, et ne fait ni l'un ni l'autre des deux autres.
        id: 'alg-equations',
        cree: '2026-10-20',
        title: 'Tester, Programmes et Équations',
        generatorId: 'alg.equations', activityId: 'numpad',
        consignePapier: 'Remplace, déroule, ou résous — selon ce qu\'on demande.',
        colonnesPapier: 1,
        lignesReponsePapier: 2,
        params: { marches: ['tester', 'lequel', 'programme-direct', 'programme-retour',
            'programme-ecrire', 'resoudre', 'probleme'] },
        motsClefs: ['équation', 'solution', 'tester', 'programme de calcul', 'inconnue',
            'brevet', 'quatrième', '4ème'],
        tags: {
            chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.LITTERAL],
            niveaux: [TAGS.NIVEAU.QUATRIEME, TAGS.NIVEAU.TROISIEME]
        },
        instruction: "Sept marches, et les deux premières ne résolvent rien. TESTER n'est pas une petite résolution : résoudre demande d'isoler l'inconnue, avec un ordre de gestes à respecter ; tester ne demande que de remplacer, calculer, comparer. C'est le petit bain parfait — et c'est aussi le geste qui VÉRIFIE une résolution, celui qu'on ne fait jamais et qui attrape l'erreur de signe. Viennent ensuite les programmes de calcul, et tout le chapitre tient dans une confusion : « multiplie par 3 puis ajoute 4 » s'écrit 3x + 4, « ajoute 4 puis multiplie par 3 » s'écrit 3(x + 4). Les deux se ressemblent et ne valent jamais la même chose. La marche qui demande l'expression propose donc toujours les quatre programmes possibles avec les MÊMES nombres : rien d'autre que l'ordre des lignes ne départage les réponses. Les deux dernières résolvent, puis posent l'équation à partir d'un énoncé — l'exercice du brevet."
    },
    {
        id: 'alg-balance',
        jeu: false,
        cree: '2026-09-04',
        title: 'La Balance des Équations',
        activityId: 'balance',
        skills: ['alg.equation.resoudre'],
        // LE POLYCOPIÉ D'ÉQUATIONS. Rémy : « Tu peux faire un polycopé
        // d'équations. Plusieurs colonnes et 3 lignes de pointillés en
        // dessous. » La balance n'a pas de générateur — elle a une activité —,
        // donc la fiche en reçoit un à elle, qui tire les MÊMES treize formes.
        //
        // QUATRE COLONNES, ET TROIS LIGNES. Rémy, sur la fiche imprimée :
        // « par défaut 4 colonnes ».
        //
        // J'en donnais deux, et j'avais écrit pourquoi : les trois lignes sous
        // chaque équation sont la rédaction — l'équation, le geste porté sur
        // les deux membres, « x = … » —, et l'on n'écrit pas cela dans cinq
        // centimètres. Ce raisonnement compte la largeur d'une LIGNE
        // D'ÉCRITURE ; il oublie que les trois lignes sont l'une SOUS l'autre.
        // Un élève qui rédige n'a pas besoin de la largeur d'une équation
        // entière par ligne : il écrit « 5x − 5 = 2x + 10 », puis « 3x = 15 »
        // en dessous, puis « x = 5 ». Ce sont des lignes courtes, et une
        // feuille de quatre colonnes en porte quatre fois plus.
        printGeneratorId: 'alg.equation-fiche',
        consignePapier: 'Résous chaque équation. Écris chaque étape, en faisant '
            + 'la même chose des deux côtés.',
        colonnesPapier: 4,
        lignesReponsePapier: 3,
        // LE CORRIGÉ DONNE LE CHEMIN, PAS LE NOMBRE. « x = 6 » ne dit pas si
        // l'élève a rassemblé les boîtes avant de partager — et c'est cela
        // qu'on lui a demandé d'écrire sur les trois lignes.
        solutionsPapier: 'detaille',
        params: { symboles: 'toujours' },
        paramSchema: [
            {
                id: 'familles', type: 'multiselect', deroulant: true, tout: 'familles',
                label: 'Les gestes disponibles',
                default: ['unites', 'partage', 'deuxTemps', 'deuxCotes', 'negatifs'],
                aide: 'Coche ce que la classe a déjà vu : les niveaux qui réclameraient un geste '
                    + 'absent disparaissent. Avec les seuls poids, il reste les deux premiers '
                    + 'niveaux.',
                options: [
                    { value: 'unites', label: 'Enlever des poids (x + 3 = 8)' },
                    { value: 'partage', label: 'Partager en parts égales (3x = 12)' },
                    { value: 'deuxTemps', label: 'Enlever puis partager (2x + 5 = 17)' },
                    { value: 'deuxCotes', label: 'Des boîtes des deux côtés (4x + 2 = x + 14)' },
                    { value: 'negatifs', label: 'Des poids qui manquent (5x − 5 = 2x + 10)' }
                ]
            },
            {
                id: 'symboles', type: 'select', label: 'La ligne d\'algèbre',
                options: ['toujours', 'jamais'], default: 'toujours',
                aide: 'Affichée, l\'équation change en même temps que les poids : c\'est le pont '
                    + 'entre la balance et le cahier. Coupée, il ne reste que la manipulation.'
            }
        ],
        motsClefs: ['équation', 'balance', 'équilibre', 'inconnue', 'résoudre', 'x',
            'premier degré', 'membre', 'isoler', 'même chose des deux côtés'],
        tags: {
            chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.LITTERAL],
            niveaux: [TAGS.NIVEAU.QUATRIEME, TAGS.NIVEAU.TROISIEME]
        },
        instruction: "Une équation est une balance en équilibre : les deux plateaux pèsent pareil. La boîte bleue cache un nombre — le même dans toutes les boîtes —, et les jetons dorés valent 1. DEUX FAÇONS DE JOUER, et elles disent la même chose. Tu peux cliquer un jeton pour l'enlever d'un seul plateau : la balance PENCHE, l'égalité est cassée, et le seul geste qui la répare est d'enlever la même chose en face — c'est toute la règle du chapitre, vue plutôt que récitée. Ou tu peux utiliser les boutons « − x », « + x », « − 1 », « + 1 », qui agissent sur LES DEUX MEMBRES d'un coup : c'est le geste qu'on écrit au cahier, et le journal de bord l'écrit pour toi, ligne après ligne. LES JETONS ROUGES SONT DES POIDS QUI MANQUENT : « x − 5 » veut dire qu'il manque cinq poids, et pour les faire disparaître il faut en AJOUTER cinq, pas en enlever. Ton but : amener une seule boîte, seule, sur un plateau — ce qui reste en face est sa valeur. Et si tu ne sais pas par où commencer, le curseur « et si x valait… » te laisse essayer un nombre : la balance penche tant que ce n'est pas le bon, et s'équilibre quand tu tombes juste. C'est exactement ce que veut dire le mot SOLUTION. L'ORDRE COMPTE, et un refus te l'apprendra mieux qu'une consigne : « 2x + 5 = 17 » ne se partage pas en deux parts égales tant que le 5 est là, parce que 5 et 17 sont impairs. On rassemble donc les boîtes, PUIS on règle les jetons, ET SEULEMENT ENSUITE on partage."
    },
    {
        // LES FONCTIONS. Rémy : « et des exercices sur les fonctions ».
        //
        // CE CHAPITRE SE JOUE SUR DEUX MOTS. « f(3) = 11 » se lit « 11 est
        // l'IMAGE de 3 », et donc « 3 est un ANTÉCÉDENT de 11 ». Les élèves les
        // échangent, et ce n'est pas de l'étourderie : rien dans l'écriture ne
        // dit lequel est lequel, il faut avoir compris que la fonction PART de
        // x et ARRIVE à f(x). Tout le reste — tableaux, courbes, programmes de
        // calcul — s'écroule si ces deux mots ne sont pas tenus.
        //
        // D'OÙ UN TYPE DE QUESTION QUI NE CALCULE RIEN : « f(3) = 11, quelle
        // est l'image de 3 ? » La réponse est écrite dans l'énoncé ; la seule
        // question est de la lire dans le bon sens. C'est là que les points se
        // perdent, et le mélange la fait revenir aussi souvent que les autres.
        //
        // ET CHERCHER UN ANTÉCÉDENT, C'EST REMONTER LE PROGRAMME À L'ENVERS —
        // les mêmes opérations, dans l'ordre inverse, chacune remplacée par son
        // contraire. C'est la seconde idée du chapitre, et l'explication la
        // déroule étape par étape plutôt que de poser une équation.
        id: 'alg-fonctions',
        cree: '2026-09-01',
        title: 'Les Fonctions : Image et Antécédent',
        generatorId: 'alg.fonctions', activityId: 'numpad',
        consignePapier: 'Écris le calcul, puis la réponse. Pour un antécédent, remonte le programme à l\'envers et vérifie.',
        colonnesPapier: 2,
        lignesReponsePapier: 2,
        skills: ['alg.fonction.image', 'alg.fonction.antecedent'],
        params: { quoi: ['lire', 'phrase', 'image', 'programme', 'tableau', 'tableau-complet', 'antecedent'] },
        motsClefs: ['fonction', 'image', 'antécédent', 'programme de calcul',
            'tableau de valeurs', 'notation'],
        tags: {
            chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.LITTERAL],
            niveaux: [TAGS.NIVEAU.QUATRIEME, TAGS.NIVEAU.TROISIEME]
        },
        instruction: "Une fonction est une machine : on lui donne un nombre, elle en rend un autre. « f(3) = 11 » se lit « 11 est l'IMAGE de 3 », et donc aussi « 3 est un ANTÉCÉDENT de 11 ». Retiens le sens de la marche : on PART du nombre entre parenthèses, on ARRIVE au résultat — c'est le seul moyen de ne pas inverser les deux mots. Pour calculer une image, tu REMPLACES x par le nombre donné, puis tu calcules. Pour chercher un antécédent, tu fais le chemin INVERSE : tu reprends le programme de calcul et tu le défais en commençant par la fin, chaque opération remplacée par son contraire. Et tu vérifies toujours en recalculant l'image — c'est gratuit, et cela attrape l'erreur d'ordre, qui est la plus fréquente."
    },
    {
        // TRACER UNE FONCTION — et la réponse de Rémy tient le fichier.
        //
        // Bloc 12 de sa progression de quatrième : « Tracé de fonction ». La
        // question que je lui ai posée touchait LA LIGNE ROUGE — l'écran a-t-il
        // le droit de faire placer un point, ou le tracé doit-il rester sur la
        // feuille ? SA RÉPONSE : « les deux ».
        //
        // D'OÙ DEUX MOITIÉS QUI NE SE RECOUVRENT PAS. À l'écran, l'élève CALCULE
        // une image et CLIQUE un nœud du repère : ni règle, ni compas, ni tracé
        // à la souris — « Placer un Point » fait déjà ce geste depuis la
        // sixième. Sur la feuille (`printable`), il complète un tableau de
        // valeurs, marque ses croix et TIRE LA DROITE À LA RÈGLE. Le logiciel
        // n'en trace aucune.
        id: 'alg-fonction-repere',
        cree: '2026-10-20',
        title: 'Tracer une Fonction',
        generatorId: 'alg.fonction-repere', activityId: 'repere',
        // LA FEUILLE A SON PROPRE GÉNÉRATEUR, et ce n'est pas un détail de
        // mise en page : l'écran pose UNE question par point, la feuille en
        // pose CINQ sur le même repère — en imprimer un par question gâcherait
        // la page et ferait retracer des axes au lieu de tracer des droites.
        printable: 'fonction', printGeneratorId: 'alg.fonction-fiche',
        printParams: { max: 6 },
        // LES SIX MARCHES SONT ÉCRITES ICI, et ce n'est pas une redite du
        // générateur : les gardes du catalogue tirent marche par marche EN LES
        // LISANT. Sans cette ligne elles n'en voient qu'un échantillon, et
        // celle des deux signes moins a laissé passer « l'abscisse est -2 »
        // dans la première marche. C'est aussi ce que le professeur voit
        // coché en ouvrant le panneau.
        params: { marches: ['image', 'image-relatifs', 'ordonnee-origine', 'le-pas',
            'antecedent', 'zero'] },
        motsClefs: ['fonction', 'affine', 'droite', 'repère', 'coefficient',
            'ordonnée à l\'origine', 'tracer', 'graphique'],
        tags: {
            chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.LITTERAL],
            niveaux: [TAGS.NIVEAU.QUATRIEME, TAGS.NIVEAU.TROISIEME]
        },
        instruction: "Une fonction affine se DESSINE, et son écriture dit tout du dessin. Les points de coordonnées (x ; f(x)) sont ALIGNÉS : ils forment une DROITE. Ici on en place un à la fois — on calcule d'abord, on clique ensuite, et le premier nombre est toujours l'ABSCISSE. Les deux marches du milieu sont celles qui font gagner du temps toute l'année : dans « f(x) = 2x − 3 », le nombre tout seul (−3) est l'endroit où la droite coupe l'axe VERTICAL — on le lit, on ne le calcule pas ; et le nombre devant le x (2) est un PAS — un carreau vers la droite, deux carreaux vers le haut. Avec ces deux-là, une droite se trace en dix secondes et sans tableau. Les deux dernières marches font le chemin inverse : on donne la hauteur, on cherche où aller sur l'axe horizontal. Et sur l'axe horizontal l'ordonnée est NULLE, ce qui transforme la question en équation : on résout f(x) = 0. Sur la feuille imprimée, c'est toi qui traces la droite à la règle — vérifie que tes points sont alignés avant de poser la règle, un point hors de la ligne signale un calcul faux."
    },
    {
        // SIMPLIFIER ET RÉDUIRE. Rémy : « j'aimerais bien un exercice qui
        // entraîne à simplifier et à réduire des expressions littérales
        // (d'abord 2*x = 2x) — ATTENTION ON UTILISE LE SIGNE FOIS. »
        //
        // La majuscule est de lui, et elle commande l'exercice : l'énoncé écrit
        // « 2 × x », jamais « 2x ». C'est précisément le signe qu'on apprend à
        // faire disparaître, et l'exercice n'aurait plus d'objet si la question
        // l'avait déjà supprimé.
        id: 'num-litteral-reduire',
        cree: '2026-08-27',
        consignePapier: "Écris chaque expression le plus simplement possible.",
        colonnesPapier: 3,
        title: 'Simplifier et Réduire',
        generatorId: 'num.litteral.reduire', activityId: 'bubbles',
        motsClefs: ['calcul littéral', 'expression', 'réduire', 'simplifier', 'lettre',
            'coefficient', 'terme', 'facteur', 'signe fois'],
        tags: { chemin: [D, LITT], niveaux: [CINQUIEME, QUATRIEME] },
        instruction: "Treize marches, deux questions chacune, et TROIS GESTES qu'on confond tout le temps. D'abord on ENLÈVE le signe × : 3 × x s'écrit 3x, et le nombre se range devant la lettre — rien n'est calculé, c'est une convention. Ensuite on REGROUPE des facteurs : 3 × x × 4 = 12x, et là les nombres se multiplient. Enfin on RÉDUIT une somme : 2x + 3x = 5x, et là on ajoute — c'est le contraire du geste précédent, et c'est là qu'on se trompe. Deux pièges à retenir : x + x = 2x mais x × x = x², et « 2x + 3 » ne se réduit pas du tout."
    },
    {
        // LA SUITE DIRECTE DU PRÉCÉDENT, et Rémy l'a demandée en ces termes :
        // « j'aimerais bien un exercice pour simplifier une expression
        // littérale du genre 3x² + 2x − 12x etc., mets des boutons carrés voire
        // cube. On essaie d'être progressif. »
        //
        // SON EXEMPLE EST TOUTE LA LEÇON : trois termes, et deux seulement se
        // regroupent. C'est la faute la plus tenace du chapitre, et elle ne se
        // travaille qu'en posant des questions dont la réponse est parfois
        // « on ne peut pas aller plus loin ».
        //
        // ET LA RÉPONSE SE TAPE. « Mets des boutons carrés voire cube » est une
        // demande d'ÉCRITURE : reconnaître « 3x² − 10x » parmi quatre lignes ne
        // prouve pas qu'on sache l'écrire, et c'est écrire qu'on demandera au
        // contrôle. D'où l'activité `litteral-saisie` et son clavier, où ² et ³
        // sont des touches — sur une tablette, elles n'existent nulle part
        // ailleurs.
        id: 'num-litteral-puissances',
        cree: '2026-08-28',
        consignePapier: "Réduis chaque expression. Attention : on ne regroupe que ce qui a le même exposant.",
        colonnesPapier: 3,
        title: 'Carrés, Cubes et Réduction',
        generatorId: 'num.litteral.puissances', activityId: 'litteral-saisie',

        motsClefs: ['calcul littéral', 'puissance', 'carré', 'cube', 'exposant', 'degré',
            'réduire', 'terme', 'expression'],
        tags: { chemin: [D, LITT], niveaux: [QUATRIEME] },
        instruction: "Dix marches, deux questions chacune, et une seule règle : on ne regroupe QUE ce qui a le même exposant. On apprend d'abord à écrire une puissance (x × x, c'est x²), puis à regrouper ce qui se regroupe (2x² + 5x² = 7x², et l'exposant ne bouge pas), puis — c'est la marche décisive — à NE PAS regrouper ce qui ne se regroupe pas : 3x² + 2x est déjà réduit. Si x vaut 5, alors x vaut 5 et x² en vaut 25 ; les additionner reviendrait à ajouter des mètres à des mètres carrés. La réponse s'écrit, avec des touches x, x² et x³."
    },
    // ── DÉVELOPPER : ONZE BARREAUX, ET UNE AIRE À CHACUN ────────────────────
    //
    // Rémy : « j'aimerais bien des exercices très progressifs et visuels sur le
    // développement simple et double développement ».
    //
    // LE CHAPITRE MANQUAIT ENTRE LES DEUX QUI ENCADRENT CETTE PLACE : réduire
    // une expression est juste au-dessus, factoriser est en Seconde, et rien
    // n'apprenait à ouvrir une parenthèse. C'est pourtant le geste dont la
    // factorisation est l'inverse, et celui par lequel on la VÉRIFIE.
    //
    // ── DÉVELOPPER : UN EXERCICE, ONZE BARREAUX À COCHER ────────────────────
    //
    // RÉMY : « on a quand même beaucoup d'exercices pour la même chose ».
    //
    // Quinze cartes ici — onze barreaux, deux révisions, deux pas à pas — pour
    // deux réglages qui existaient déjà. La progression n'est pas perdue, elle
    // change de place : elle était dans l'ordre où l'on posait les cartes, elle
    // est maintenant dans les cases cochées. Les onze barreaux se plient en
    // deux temps — la distributivité simple, la double —, et cocher un temps
    // entier fait exactement ce que faisaient « dev-simple » et « dev-double ».
    {
        id: 'dev',
        cree: '2026-09-25',
        title: 'Développer : distributivité simple et double',
        consignePapier: 'Développer et réduire les expressions suivantes.',
        colonnesPapier: 2,
        generatorId: 'lit.developpement', activityId: 'buttons',
        params: {},
        motsClefs: ['développer', 'développement', 'distributivité', 'parenthèse',
            'calcul littéral', 'identité remarquable', 'aire', 'rectangle',
            'double distributivité', 'carré', 'progression'],
        tags: { chemin: [D, LITT], niveaux: [QUATRIEME, TROISIEME, SECONDE] },
        instruction: "Onze barreaux en deux temps, et tu choisis ceux que la classe "
            + "travaille. La distributivité simple d'abord — 3(x + 2), puis le moins "
            + "dans la parenthèse, le coefficient devant la lettre, le facteur négatif, "
            + "deux distributions à réunir. Puis la double : (x + 2)(x + 3) jusqu'au "
            + "carré (x + 4)² et à la différence (x − 5)(x + 5), qu'on relira à "
            + "l'envers pour factoriser."
    },
    // ── ET LA MÊME CHOSE, LIGNE À LIGNE ─────────────────────────────────────
    //
    // RÉMY : « on peut proposer une ligne pour pouvoir le taper », puis
    // « c'est génial ton idée de carte "pas à pas" prête ».
    //
    // C'est la ligne que les flèches dessinent : les produits ÉCRITS avant
    // d'être calculés. Celui qui la saute est celui qui oublie les deux
    // produits du milieu, et un « faux » sur la réponse entière ne dit pas
    // lequel des quatre a manqué.
    //
    // LE PAS À PAS RESTE UN RÉGLAGE, disponible sur les onze barreaux ; cette
    // carte-ci est ce réglage déjà posé, pour qu'on l'attrape sans ouvrir le
    // panneau quand on prépare une remédiation.
    {
        id: 'dev-pas',
        cree: '2026-09-25',
        title: 'Développer pas à pas',
        consignePapier: 'Développer et réduire les expressions suivantes.',
        colonnesPapier: 2,
        generatorId: 'lit.developpement', activityId: 'buttons',
        params: { etapes: 'oui' },
        motsClefs: ['développer', 'pas à pas', 'étapes', 'étape', 'détaillé', 'méthode',
            'distributivité', 'double distributivité', 'parenthèse', 'calcul littéral'],
        tags: { chemin: [D, LITT], niveaux: [QUATRIEME, TROISIEME, SECONDE] },
        instruction: "Les mêmes questions, écrites ligne à ligne : les produits "
            + "d'abord, sans les calculer, puis on calcule, puis on réunit. Le champ "
            + "montre la FORME attendue, et seule la dernière ligne compte pour la "
            + "séance — les autres sont l'écriture du raisonnement."
    },
    {
        // TROIS TEMPS, ET L'ORDRE EST LE SUJET. « ×10, on ajoute un zéro » est
        // une règle qui marche pour les entiers et casse dès la première
        // décimale. On ne la déloge pas en la contredisant : on la déloge en
        // faisant MANIPULER ce qui se passe — la virgule se décale d'un rang
        // vers la droite — assez longtemps pour que l'image remplace la
        // formule. Ensuite seulement on demande de choisir, puis d'écrire.
        // On dit « la virgule se décale » et non « les chiffres glissent » :
        // les deux lectures sont vraies et donnent le même nombre, mais c'est
        // la première que l'élève entend en classe, et l'exercice ne doit pas
        // dire le contraire du professeur.
        id: 'num-virgule',
        jeu: false, title: 'La Virgule qui se décale',
        cree: '2026-08-11',
        activityId: 'virgule',
        // Sur le papier, le glissement dans le tableau de numération n'a pas
        // d'équivalent — c'est justement ce que l'écran apporte. Reste
        // l'égalité à compléter, qui est l'entraînement classique du chapitre.
        printGeneratorId: 'num.virgule-fiche',
        consignePapier: "Complète. Attention : « ×10, on ajoute un zéro » est faux dès qu'il y a une virgule.",
        colonnesPapier: 3,
        params: { niveau: 'facile', parPhase: 3 },
        paramSchema: [
            {
                id: 'niveau', type: 'select', label: 'Difficulté',
                aide: 'En facile, on ne fait que multiplier, par 10 ou par 100 : on installe le '
                    + 'sens du décalage avant d\'ajouter la division. Le nombre de départ a toujours '
                    + 'une partie décimale.',
                options: [
                    { value: 'facile', label: '× 10 et × 100 seulement' },
                    { value: 'moyen', label: '× et ÷ par 10, 100, 1000' },
                    { value: 'difficile', label: 'Idem, jusqu\'aux millièmes' }
                ],
                default: 'facile'
            },
            {
                id: 'parPhase', type: 'number', label: 'Réussites par temps', min: 1, max: 8, default: 3,
                aide: "Combien de fois il faut réussir avant de passer au temps suivant : d'abord faire glisser, puis choisir parmi quatre, puis écrire de tête."
            }
        ],
        skills: ['num.dec.puissances10'],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.DECIMAUX], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Trois temps. D'abord tu DÉCALES LA VIRGULE dans le tableau de numération avec les flèches : × 10 la pousse d'un rang vers la DROITE, ÷ 10 d'un rang vers la gauche. Les chiffres, eux, ne bougent pas — et c'est ce qui rend la règle visible : le chiffre qui valait des dixièmes se retrouve à gauche de la virgule, il vaut maintenant des unités. Ensuite on te demandera de choisir le résultat parmi quatre, puis de l'écrire toi-même. Attention au piège : « multiplier par 10, on ajoute un zéro » est faux dès qu'il y a une virgule — 2,5 et 2,50 sont le même nombre."
    },
    {
        // LES PUISSANCES DE 10 — PREMIER TEMPS : RECONNAÎTRE.
        //
        // Rémy : « Des exercices sur les puissances de 10 dont l'écriture
        // scientifique, hyper progressif : déjà reconnaître puis transformer. »
        // Ce sont ses deux mots qui font les deux exercices, et c'est le bon
        // découpage : la faute de quatrième n'est pas de mal calculer, c'est
        // d'écrire 34 × 10³ et de croire que c'est une écriture scientifique.
        // L'élève transforme avant de savoir ce qu'il doit obtenir.
        //
        // QUATRE MARCHES ICI, et la dernière est la plus précieuse : « dis
        // POURQUOI ce n'en est pas une ». Tant qu'un élève ne sait pas nommer
        // le défaut — trop grand, ou trop petit —, il déplace sa virgule au
        // hasard et tombe juste une fois sur deux.
        id: 'num-puissances-reconnaitre',        title: 'Puissances de 10 — reconnaître',
        cree: '2026-08-25',
        // Rémy : « mets juste calcule ». L'`instruction` ci-dessous explique
        // les quatre marches à l'écran, où l'on a le temps de lire ; sur le
        // papier, elle faisait neuf cents caractères en tête d'exercice.
        consignePapier: 'Calcule.',
        colonnesPapier: 3,
        generatorId: 'num.puissances-reconnaitre', activityId: 'buttons',
        skills: ['num.puissances.dix'],
        motsClefs: ['puissances', 'puissance de 10', 'exposant', 'écriture scientifique',
            'notation scientifique', 'reconnaître', 'grands nombres', 'petits nombres'],
        tags: {
            chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.DECIMAUX],
            niveaux: [TAGS.NIVEAU.QUATRIEME, TAGS.NIVEAU.TROISIEME]
        },
        instruction: "Quatre marches, dans l'ordre, et l'on monte tout seul toutes les trois questions. D'abord LIRE une puissance de 10 : 10⁴ vaut 10 000, un 1 suivi de quatre zéros, et 10⁻³ vaut 0,001 — le 1 descend au troisième rang après la virgule. Attention au piège du signe : un exposant négatif ne donne JAMAIS un nombre négatif, il donne un nombre tout petit mais positif. Ensuite l'inverse : 1 000, c'est 10 puissance combien ? Puis on aborde l'écriture scientifique, mais SANS RIEN TRANSFORMER : on apprend d'abord à la reconnaître. Elle s'écrit a × 10ⁿ avec un seul chiffre avant la virgule, et ce chiffre n'est pas zéro — 34 × 10³ n'en est pas une, 0,34 × 10⁵ non plus. Enfin la marche qui compte vraiment : dire POURQUOI. Le nombre devant est-il trop grand, ou trop petit ? Les deux ne se corrigent pas dans le même sens, et tant qu'on ne les distingue pas, on déplace sa virgule au hasard."
    },
    {
        // LES PUISSANCES DE 10 — SECOND TEMPS : TRANSFORMER.
        //
        // Trois marches : fabriquer l'écriture scientifique, revenir au
        // décimal, comparer deux écritures. La dernière porte un piège qu'on
        // fabrique EXPRÈS une fois sur deux — deux exposants égaux — parce
        // qu'un élève qui a bien retenu « le plus grand exposant gagne » cesse
        // aussitôt de regarder le nombre de devant.
        id: 'num-puissances-transformer',        title: 'Puissances de 10 — écriture scientifique',
        cree: '2026-08-25',
        // Trois marches — fabriquer, revenir au décimal, comparer — et un seul
        // verbe qui les couvre toutes les trois.
        consignePapier: 'Complète.',
        colonnesPapier: 2,
        generatorId: 'num.puissances-transformer', activityId: 'buttons',
        skills: ['num.puissances.scientifique'],
        motsClefs: ['écriture scientifique', 'notation scientifique', 'puissances de 10',
            'exposant', 'transformer', 'comparer', 'ordre de grandeur', 'mantisse'],
        tags: {
            chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.DECIMAUX],
            niveaux: [TAGS.NIVEAU.QUATRIEME, TAGS.NIVEAU.TROISIEME]
        },
        instruction: "Maintenant on transforme, et il n'y a que deux gestes à faire, toujours les mêmes. Un : place la virgule juste après le PREMIER chiffre qui n'est pas zéro — 34 000 donne 3,4, et 0,0052 donne 5,2. Deux : compte de combien de rangs elle a bougé. Et surtout, VÉRIFIE le signe au lieu de le retenir : le nombre de départ est-il plus grand ou plus petit que 1 ? Plus grand, l'exposant est positif ; plus petit, il est négatif. 34 000 = 3,4 × 10⁴, et 0,0052 = 5,2 × 10⁻³. Ensuite on fait le chemin inverse, puis on compare. Pour comparer, regarde l'EXPOSANT d'abord : 2,1 × 10⁵ bat 9,8 × 10⁴, et le 9,8 n'y peut rien — le nombre de devant reste toujours entre 1 et 10, il ne rattrapera jamais un rang entier. Mais si les deux exposants sont égaux, alors c'est le nombre de devant qui décide, et c'est précisément le cas qu'on oublie."
    },
    {
        // LES PRÉFIXES. Rémy : « je ne veux pour l'instant que des exercices
        // sur les puissances sur les préfixes ». Sa fiche en fait une colonne
        // entière — pico à trillion —, puis les remet en jeu sur les codes
        // couleur des résistances et dans le devoir : « un cheveu fait 50 µm,
        // exprime-le en mètres », « 8 To = 8 × 10¹² ».
        //
        // TROIS CHOSES DIFFÉRENTES, ET ON LES CONFOND : le symbole qu'on lit
        // (M), le préfixe qu'on prononce (méga), la puissance avec laquelle on
        // calcule (10⁶). Un élève sait presque toujours dire « méga, c'est un
        // million » et reste bloqué sur « 3 Mo = … octets », faute d'avoir fait
        // le troisième pas.
        id: 'num-puissances-prefixes',        title: 'Kilo, Méga, Giga, Micro, Nano',
        cree: '2026-08-27',
        generatorId: 'num.puissances-prefixes', activityId: 'buttons',
        skills: ['num.puissances.prefixes'],
        // LE RAPPEL DOIT COUVRIR TOUT CE QUE LA FEUILLE DEMANDE. Il n'en
        // nommait que six, et les questions tiraient aussi téra et centi :
        // l'élève lisait la consigne, cherchait « c », et ne le trouvait pas.
        // « centi » est mis à part parce qu'il EST à part — la seule marche
        // qui ne soit pas de trois, héritée du centimètre.
        consignePapier: "Complète. Les préfixes vont de trois en trois : kilo 10³, méga 10⁶, giga 10⁹, téra 10¹² ; milli 10⁻³, micro 10⁻⁶, nano 10⁻⁹. Seul « centi » fait exception : c'est 10⁻², comme dans centimètre.",
        colonnesPapier: 3,
        motsClefs: ['préfixe', 'kilo', 'méga', 'giga', 'téra', 'milli', 'micro', 'nano',
            'pico', 'symbole', 'unité', 'conversion', 'octet', 'watt', 'micromètre'],
        tags: {
            chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.DECIMAUX],
            niveaux: [TAGS.NIVEAU.QUATRIEME, TAGS.NIVEAU.TROISIEME]
        },
        instruction: "Six marches, et l'on monte tout seul toutes les trois questions. On commence par LIRE un symbole — M, µ, n, T — parce que c'est ce qu'on trouve sur un emballage. Puis on passe du préfixe à la puissance (méga = 10⁶), et de la puissance au préfixe. Les préfixes vont de TROIS EN TROIS dans les deux sens, et c'est la seule chose à retenir : kilo 10³, méga 10⁶, giga 10⁹, téra 10¹² ; milli 10⁻³, micro 10⁻⁶, nano 10⁻⁹. Une seule exception, centi (10⁻²), héritée du centimètre. La quatrième marche est un piège qui vaut un milliard : « m » minuscule est MILLI, « M » majuscule est MÉGA. Les deux dernières font ce à quoi tout cela sert : convertir. 50 µm = 50 × 10⁻⁶ m, et 3 Go = 3 000 Mo."
    },
    {
        // CALCULER AVEC DES PUISSANCES. Trois règles, et une seule raison
        // derrière les trois : une puissance COMPTE des facteurs. Le produit
        // ajoute les exposants, le quotient les soustrait, la puissance de
        // puissance les multiplie.
        //
        // LA FAUTE UNIVERSELLE — 10⁵ × 10³ = 10¹⁵ — n'est pas de
        // l'étourderie : le signe × est écrit sous les yeux de l'élève, et il
        // l'applique à ce qu'il voit. C'est donc le distracteur de CHAQUE
        // question de la marche du produit.
        id: 'num-puissances-calcul',        title: 'Calculer avec des Puissances',
        cree: '2026-08-27',
        generatorId: 'num.puissances-calcul', activityId: 'buttons',
        skills: ['num.puissances.regles'],
        // TROIS SORTES DE RÉPONSES, ET LA CONSIGNE DOIT LES ANNONCER TOUTES.
        // « Sous la forme d'une seule puissance » était juste pour 10⁴ × 10⁸,
        // faux pour 2⁵ — dont on attend 32 — et piégeur pour 3⁴ × 5³, dont la
        // bonne réponse est qu'il n'y en a pas. Un élève qui lit une consigne
        // et à qui l'on reproche de l'avoir suivie n'apprend rien.
        consignePapier: "Écris le résultat le plus simple : sa valeur quand elle se calcule (2⁵ = 32), une seule puissance sinon (10⁴ × 10⁸ = 10¹²). Si c'est impossible, écris-le. Tu écriras le calcul !",
        colonnesPapier: 4,
        motsClefs: ['puissances', 'exposant', 'produit', 'quotient', 'multiplier', 'diviser',
            'puissance de puissance', 'règles de calcul', 'même base', 'inverse', 'carré'],
        tags: {
            chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.DECIMAUX],
            niveaux: [TAGS.NIVEAU.QUATRIEME, TAGS.NIVEAU.TROISIEME]
        },
        instruction: "Neuf marches, en trois temps. D'ABORD CE QU'EST UNE PUISSANCE : 2⁵ n'est pas 2 × 5, c'est 2 × 2 × 2 × 2 × 2. Et (−3)² vaut +9 quand −3² vaut −9 : la parenthèse dit si le signe fait partie du nombre qu'on élève au carré. ENSUITE LES DEUX RÈGLES QU'ON ÉCHANGE TOUT LE TEMPS. Le produit AJOUTE les exposants — 10⁵ × 10³ = 10⁸, parce que cinq dix suivis de trois dix font huit dix. Le quotient les SOUSTRAIT — 10⁸ ÷ 10³ = 10⁵. Le signe de l'opération n'est PAS celui qu'on fait sur les exposants, et c'est la faute la plus fréquente du chapitre. ENFIN la puissance de puissance, qui les MULTIPLIE — (10⁴)³ = 10¹², trois paquets de quatre dix —, l'inverse qui change le signe de l'exposant, et la condition qu'on oublie : il faut la MÊME base. 2³ × 5³ ne s'écrit pas sous la forme d'une seule puissance."
    },
    // ── LES PUISSANCES, LIGNE À LIGNE ───────────────────────────────────────
    //
    // RÉMY, EN ROUGE SUR SA FICHE DE QUATRIÈME : « TU ÉCRIRAS LE CALCUL ! »
    //
    // C'est écrit sur chacun de ses exercices, et c'est la demande de cette
    // carte : il ne veut pas le résultat, il veut voir 10³ × 10² = 10³⁺² = 10⁵.
    // La ligne du milieu est celle où la règle se montre — et celle où l'on
    // voit, quand elle est fausse, que l'élève a appliqué le signe de
    // l'opération aux exposants.
    {
        id: 'num-puissances-calcul-pas',
        title: 'Calculer avec des Puissances, pas à pas',
        cree: '2026-09-25',
        generatorId: 'num.puissances-calcul', activityId: 'buttons',
        skills: ['num.puissances.regles'],
        params: { etapes: 'oui' },
        consignePapier: "Écris le résultat le plus simple. Tu écriras le calcul !",
        colonnesPapier: 4,
        motsClefs: ['puissances', 'exposant', 'pas à pas', 'étapes', 'étape', 'détaillé',
            'méthode', 'produit', 'quotient', 'règles de calcul', 'écrire le calcul'],
        tags: {
            chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.DECIMAUX],
            niveaux: [TAGS.NIVEAU.QUATRIEME, TAGS.NIVEAU.TROISIEME]
        },
        instruction: "Les mêmes questions, avec la ligne du milieu : 10⁵ × 10² = 10^(5 + 2) = 10⁷. L'exposant se tape avec la touche ^, parce qu'un exposant qui est une SOMME ne s'écrit pas en petits chiffres. Seule la dernière ligne compte pour la séance ; les autres sont la trace qu'on demande sur la copie."
    }
];
