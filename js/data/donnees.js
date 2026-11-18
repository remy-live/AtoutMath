import { TAGS } from './tags.js';
// LES PALIERS DU TABLEAU CROISÉ VIENNENT DU NOYAU, on ne les recopie pas : les
// libellés affichés et les vrais réglages doivent dire la même chose, et deux
// listes jumelles finissent toujours par se contredire.
import { PALIERS, TAILLES } from '../core/tableauCroise.js';

// Domaine « Organisation de données » : ouvert par l'École du Tableur,
// portée de l'ancien projet. D'autres exercices (lecture de tableaux, de
// graphiques…) viendront s'y ranger.

export const donneesExercises = [
    {
        // LE TABLEAU À DOUBLE ENTRÉE. Rémy est parti d'une fiche : « Voilà un
        // tableau concernant les élèves du collège. Complète les valeurs
        // manquantes », et sous le tableau l'astuce qui EST la méthode —
        // « essaie à chaque fois de trouver la ligne ou la colonne où il ne
        // manque qu'une seule information ».
        //
        // CETTE ASTUCE N'EST PAS UN CONSEIL, C'EST LA DÉFINITION. Un tableau
        // croisé se remplit par PROPAGATION, jamais en devinant. Le générateur
        // ne perce donc aucun trou sans vérifier que le tableau se finit encore
        // de proche en proche.
        //
        // ET ON NE PEUT PAS CACHER PLUS DE R + C + 1 CASES : le tableau est
        // entièrement déterminé par ses R × C cases intérieures, et il en compte
        // (R+1) × (C+1). Au-delà, plusieurs tableaux répondraient. Le générateur
        // atteint ce maximum ; pour durcir l'exercice, on agrandit le tableau.
        //
        // La calculatrice est là pour les premiers paliers — Rémy : « avec
        // utilisation pour le début de la calculatrice » — puis elle s'éteint :
        // l'obstacle est le raisonnement, pas l'addition, jusqu'au moment où
        // c'est justement l'addition en colonne qu'on veut faire travailler.
        id: 'don-tableau-croise',
        jeu: false, title: 'Le Tableau à Double Entrée',
        cree: '2026-08-31',
        activityId: 'tableau-croise',
        printable: 'tableau-croise', printGeneratorId: 'donnees.tableau-croise',
        consignePapier: 'Complète les valeurs manquantes de chaque tableau.',
        sansRevision: true,
        skills: ['don.tableau.croise'],
        params: { palier: 'facile' },
        paramSchema: [
            {
                id: 'palier', type: 'select', label: 'La difficulté', default: 'facile',
                aide: 'Monte le tableau à balayer, et la taille des nombres — petits au '
                    + 'début. La calculatrice s\'éteint au dernier palier, où l\'addition en '
                    + 'colonne fait partie du travail.',
                options: Object.entries(PALIERS)
                    .map(([value, p]) => ({ value, label: p.label }))
            },
            {
                // DEUX DIFFICULTÉS INDÉPENDANTES, DEUX RÉGLAGES.
                //
                // RÉMY : « il faudrait que dans les premiers niveaux, les
                // calculs soient plus simples (dans les réglages) ».
                //
                // Les premiers paliers donnent maintenant ce que leur
                // étiquette promet — c'était un défaut, et il est corrigé dans
                // `bornesDuTirage`. Mais il reste une chose que le palier seul
                // ne permet pas : un GRAND tableau avec de PETITS nombres.
                // C'est pourtant l'exercice qu'on veut pour un élève qui
                // apprend la méthode et bute sur l'addition — et l'inverse,
                // pour celui qui maîtrise la méthode et doit s'entraîner à
                // additionner. Le tableau travaille le balayage ; les nombres
                // ne décident que de la charge de calcul.
                id: 'taille', type: 'select', label: 'La taille des nombres', default: 'auto',
                affiner: true,
                aide: 'Indépendante de la taille du tableau. « Selon le niveau » suit la '
                    + 'difficulté choisie — c\'est ce qui se passe si on n\'y touche pas.',
                options: Object.entries(TAILLES).map(([value, t]) => ({ value, label: t.label }))
            },
            {
                // CE QUE L'EXERCICE DEMANDE VRAIMENT. Rémy : « j'aimerais bien
                // aussi des exercices où on a un énoncé, le tableau est vide et
                // il faut remplir puis calculer et remplir ». Ce n'est pas une
                // variante d'affichage : quand les nombres sont dits au lieu
                // d'être écrits, le travail commence une étape plus tôt — il
                // faut comprendre chaque phrase et savoir où elle va. C'est
                // précisément le geste qu'on rate en évaluation.
                id: 'depart', type: 'select', label: 'D\'où viennent les nombres', default: 'tableau',
                affiner: true,
                aide: 'Dans le tableau, les nombres sont déjà écrits : il ne reste qu\'à compléter. '
                    + 'Dans l\'énoncé, ils sont en toutes lettres et le tableau part vide — c\'est là '
                    + 'que tout se joue.',
                options: [
                    { value: 'tableau', label: 'Écrits dans le tableau' },
                    { value: 'enonce', label: 'Dits dans l\'énoncé — le tableau part vide' }
                ]
            }
        ],
        motsClefs: ['tableau', 'double entrée', 'totaux', 'effectifs', 'données', 'croisé',
            'énoncé', 'lecture'],
        tags: { chemin: [TAGS.DOMAINE.DONNEES, TAGS.SOUS_DOMAINE.TABLEUR], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Complète les cases vides du tableau. Ne commence pas par la première case venue : cherche à chaque fois la LIGNE ou la COLONNE où il ne manque qu'une seule information — celle-là, tu peux la boucler tout de suite. Si la case qui manque est un total, tu additionnes toute la ligne ; si elle est dans le corps du tableau, tu pars du total et tu retires ce qui est déjà écrit. Le nombre que tu viens d'écrire en ouvre alors d'autres, et de proche en proche tout se remplit. On n'a jamais besoin de deviner."
    },
    {
        id: 'don-tableur',
        jeu: false, title: "L'École du Tableur",
        cree: '2026-08-04',
        activityId: 'tableur',
        // SUR LE PAPIER, RIEN NE CALCULE À LA PLACE DE L'ÉLÈVE. Devant le
        // tableur, taper « =12+15 » donne 27 et le logiciel dit oui : la faute
        // passe. Sur la feuille, la seule chose demandée est justement celle
        // qu'il avait sautée — écrire =B2+B3.
        printable: 'tableur', printGeneratorId: 'don.tableur-fiche',
        printParams: { quoi: 'melange', plages: true },
        consignePapier: "Écris le nom exact, avec la majuscule de la colonne.",
        params: { startLevel: 1, goal: 3 },
        paramSchema: [
            {
                // NEUF NUMÉROS NE DISENT RIEN. Le réglage demandait « Leçon de
                // départ » entre 1 et 9, et rien, nulle part, ne disait ce
                // qu'est la leçon 5. Un professeur qui vient de faire les
                // formules en classe veut commencer aux formules ; il devait
                // ouvrir le jeu neuf fois pour savoir laquelle c'est.
                // LES NOMS SONT CEUX DES CONSIGNES DU JEU, mot pour mot — voir
                // `js/games/spreadsheet.js`, la suite des `this.level === n`.
                // On garde le numéro devant : il reste la seule chose que
                // l'élève et le professeur voient en commun à l'écran.
                id: 'startLevel', type: 'select', label: 'Leçon de départ', default: 1,
                echelle: true,
                aide: 'Les neuf leçons s\'enchaînent ensuite jusqu\'à la dernière. '
                    + 'On entre au milieu quand le début a été fait en classe.',
                options: [
                    { value: 1, label: '1 — Cliquer sur une case (B3)', court: '1' },
                    { value: 2, label: '2 — Sélectionner une plage (A1:B2)', court: '2' },
                    { value: 3, label: '3 — Peindre des cases : le pixel art', court: '3' },
                    { value: 4, label: '4 — Écrire un nombre dans une case', court: '4' },
                    { value: 5, label: '5 — La formule qui additionne : =A1+B1', court: '5' },
                    { value: 6, label: '6 — La formule qui multiplie : =A2*B2', court: '6' },
                    { value: 7, label: '7 — =SOMME() sur une plage', court: '7' },
                    { value: 8, label: '8 — =MOYENNE() sur une plage', court: '8' },
                    { value: 9, label: '9 — La facture : plusieurs formules et le total', court: '9' }
                ]
            },
            { id: 'goal', type: 'number', label: 'Réussites par leçon', min: 2, max: 6, default: 3 }
        ],
        skills: ['don.tableur.reperage', 'don.tableur.formules'],
        tags: { chemin: [TAGS.DOMAINE.DONNEES, TAGS.SOUS_DOMAINE.TABLEUR], niveaux: [TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Neuf leçons pour devenir un pro du tableur : nommer les cases (B3), sélectionner des plages (A1:B2), dessiner en pixel art, saisir des données, puis calculer avec des formules — =A1+B1, =SOMME(), =MOYENNE() — jusqu'à la facture finale. Règle d'or : une formule utilise les références des cases, jamais les nombres recopiés !"
    },

    // --- Statistiques et probabilités : les deux chapitres qui manquaient ---
    //
    // RÉMY, progression de quatrième : « Statistique (Médiane, moyenne,
    // étendue, fréquence: listes) » et « Probabilités ». Mesuré avant d'écrire
    // une ligne : zéro exercice sur 238 pour l'un comme pour l'autre. Ce sont
    // les deux qu'il a mis en tête de sa liste de travail.
    {
        id: 'don-statistiques',
        cree: '2026-10-20',
        revisions: [
            {
                date: '2026-11-17',
                quoi: 'La moyenne s’ÉCRIT : « Écris le CALCUL de la moyenne, avec les '
                    + 'parenthèses » se répond sur un clavier à parenthèses, et 12+15+18/3 '
                    + 'y est refusé en nommant la faute — c’est LA faute du chapitre, et '
                    + 'elle est invisible tant qu’on ne demande que le résultat. Et la '
                    + 'moyenne PONDÉRÉE arrive, notes et coefficients en tableau. Demandé '
                    + 'par Rémy : « il faudrait que l’élève écrive le calcul (avec '
                    + 'parenthèses) et il faut de la moyenne pondérée ».'
            },
            {
                date: '2026-11-16',
                quoi: 'Trois marches « pas à pas » — l’étendue, la moyenne et la médiane y '
                    + 'demandent non pas un nombre mais TROIS, dans une phrase à trous. Une '
                    + 'question directe se répond juste ou faux, et l’élève qui rate ne sait '
                    + 'pas OÙ : dans la somme, dans le compte, ou dans la division. Ici c’est '
                    + 'la case fausse qui le dit. Demandé par Rémy : « les statistiques (par '
                    + 'étape) ».'
            }
        ],
        title: 'Moyenne, Médiane, Étendue',
        generatorId: 'don.statistiques', activityId: 'numpad',
        // LA CALCULATRICE EST OUVERTE, ET C'EST RÉMY QUI L'A DEMANDÉ.
        //
        // « Il faut pouvoir encourager le brouillon et autoriser la
        // calculatrice par défaut. »
        //
        // Il a raison, et la raison est de métier : UNE MOYENNE DE HUIT NOTES
        // NE SE FAIT PAS DE TÊTE. La faire faire de tête mesure le calcul
        // mental, pas la statistique — et un élève qui sait parfaitement ce
        // qu'est une moyenne se verrait compté faux pour une addition ratée.
        // Le chapitre travaille le SENS : ce qu'on additionne, par combien on
        // divise, et pourquoi la médiane ne se calcule pas du tout.
        calculatrice: true,
        consignePapier: 'Lis bien la série, puis réponds. RANGE d\'abord la série dans '
            + 'l\'ordre croissant quand on te demande la médiane. Calculatrice autorisée, '
            + 'et pose tes calculs au brouillon.',
        // UNE SEULE COLONNE SUR LE PAPIER. Une série de huit nombres plus sa
        // question ne tient pas dans une demi-largeur de page : coupée en
        // deux, la liste se lit en escalier et l'on ne voit plus où elle
        // s'arrête.
        colonnesPapier: 1,
        lignesReponsePapier: 2,
        // LES TROIS MARCHES « PAS À PAS » SONT COCHÉES PAR DÉFAUT, chacune
        // juste avant sa voisine directe. Rémy : « les statistiques (par
        // étape) ». On fait le chemin en trois temps, puis on le fait d'un
        // coup — et le professeur décroche l'un ou l'autre.
        params: { marches: ['effectif', 'etendue-etapes', 'etendue', 'moyenne-etapes',
            'moyenne', 'mediane-rangee', 'mediane-desordre', 'mediane-paire',
            'mediane-etapes', 'frequence', 'moyenne-manquante', 'comparer'] },
        motsClefs: ['statistiques', 'moyenne', 'médiane', 'étendue', 'fréquence',
            'effectif', 'série', 'pas à pas', 'par étape', 'quatrième', '4ème'],
        tags: {
            chemin: [TAGS.DOMAINE.DONNEES, TAGS.SOUS_DOMAINE.STATISTIQUES],
            niveaux: [TAGS.NIVEAU.QUATRIEME, TAGS.NIVEAU.TROISIEME]
        },
        instruction: "LA CALCULATRICE EST AUTORISÉE, et le brouillon est ton meilleur outil : une moyenne de huit notes ne se fait pas de tête, et ce chapitre ne mesure pas ton calcul mental. AVANT TOUTE MÉDIANE, RANGE LA SÉRIE DANS L'ORDRE CROISSANT au brouillon, puis barre les valeurs deux par deux — une à gauche, une à droite — jusqu'à ce qu'il n'en reste qu'une au milieu. Douze marches, et trois d'entre elles sont des médianes — ce n'est pas un hasard. TROIS AUTRES SE FONT PAS À PAS : l'étendue, la moyenne et la médiane y demandent non pas un nombre mais TROIS, dans une phrase à trous — « il y a ? valeurs, leur somme vaut ?, la moyenne vaut ? ». Une question directe se répond juste ou faux, et l'élève qui rate ne sait pas OÙ : dans la somme, dans le compte, ou dans la division. Ici c'est la case fausse qui le dit. On coche les deux versions, ou l'une des deux. La moyenne, l'étendue et la fréquence se CALCULENT : on additionne, on soustrait, on divise. La médiane, elle, se CHERCHE, et on la cherche mal de deux façons. D'abord en oubliant de RANGER la série : la médiane de 7 ; 2 ; 9 vaut 7, pas 2, et le terme du milieu de la liste telle qu'elle est écrite est juste un nombre de la série. Ensuite quand la série a un nombre PAIR de valeurs : il y a alors deux valeurs au milieu, la médiane est leur moyenne, et elle n'est pas dans la série. Une marche par piège, pour que le bilan dise lequel coince. La dernière question est celle qui compte : deux groupes de même moyenne, et c'est l'étendue qui les sépare."
    },
    // ── LA MÉDIANE AU DOIGT ────────────────────────────────────────────────
    //
    // RÉMY, 17 novembre : « et pour la médiane, on peut ranger dans l'ordre
    // croissant par drag drop », puis « et on peut sélectionner ou barrer des
    // valeurs qui s'affichent ».
    //
    // UN EXERCICE À PART, ET NON UNE MARCHE DE PLUS. Les médianes de
    // « Moyenne, Médiane, Étendue » se répondent au pavé : on tape un nombre.
    // Ici on range et on barre — c'est le même générateur, le même tirage, la
    // même réponse, et un chemin entièrement différent pour y arriver. Les
    // mélanger dans un seul exercice obligerait à changer de geste d'une
    // question à l'autre, et le réglage « quelles marches » perdrait son sens.
    //
    // LES TROIS MARCHES DE MÉDIANE, ET ELLES SEULES. « Pas à pas » demande
    // trois nombres dans une phrase à trous : ce n'est pas une médiane qu'on
    // isole en barrant, c'est un compte, une somme et une division.
    {
        id: 'don-mediane-doigt',
        cree: '2026-11-17',
        title: 'La Médiane au Doigt',
        generatorId: 'don.statistiques', activityId: 'medianeAuDoigt',
        // LA CALCULATRICE N'A RIEN À FAIRE ICI, et c'est le seul endroit du
        // chapitre où l'on peut l'écrire : une médiane ne se calcule pas. On
        // range, on barre, et le nombre qui reste EST la réponse. Le seul
        // calcul possible est la demi-somme des deux du milieu, qui se choisit
        // parmi trois propositions.
        calculatrice: false,
        consignePapier: 'RANGE la série dans l\'ordre croissant, puis barre les valeurs '
            + 'deux par deux — une à gauche, une à droite — jusqu\'au milieu.',
        colonnesPapier: 1,
        lignesReponsePapier: 2,
        params: { marches: ['mediane-rangee', 'mediane-desordre', 'mediane-paire'] },
        motsClefs: ['médiane', 'ranger', 'ordre croissant', 'barrer', 'au doigt',
            'statistiques', 'série', 'quatrième', '4ème'],
        tags: {
            chemin: [TAGS.DOMAINE.DONNEES, TAGS.SOUS_DOMAINE.STATISTIQUES],
            niveaux: [TAGS.NIVEAU.QUATRIEME, TAGS.NIVEAU.TROISIEME]
        },
        instruction: 'ON NE TAPE PAS LA MÉDIANE, ON LA FAIT APPARAÎTRE. L\'élève range '
            + 'la série en faisant glisser les nombres, puis barre le plus petit ET le '
            + 'plus grand, deux par deux, jusqu\'à ce qu\'il n\'en reste qu\'un. C\'est '
            + 'la méthode du papier, celle qui survit à une série de onze valeurs : '
            + 'compter « (n+1)/2 » est une formule, barrer deux par deux est un '
            + 'raisonnement — et il explique de lui-même pourquoi une série PAIRE n\'a '
            + 'pas de milieu. Quand il reste deux nombres, l\'exercice ne conclut pas à '
            + 'la place de l\'élève : il propose les deux survivants et leur moyenne. '
            + 'C\'est exactement l\'idée fausse à défaire — « la médiane est une valeur '
            + 'de la série » — et elle se joue devant les deux nombres qu\'il vient '
            + 'lui-même d\'isoler. Au pavé numérique, on ne sait pas s\'il a rangé, '
            + 'compté, ou deviné le milieu ; ici cela se voit.'
    },
    // ── LIRE UN DIAGRAMME ──────────────────────────────────────────────
    //
    // RÉMY, 18 novembre : « J'ai l'impression qu'AtoutMath est bien complet, tu
    // as d'autres idées ? Je le fais régulièrement avec mes élèves, ça
    // fonctionne bien ! »
    //
    // L'INVENTAIRE DU PROGRAMME RÉPONDAIT DEPUIS LE 16 : « Les diagrammes
    // statistiques — rien ». Remesuré le 18 sur les 284 exercices : chercher
    // « diagramme » dans le catalogue ne sortait RIEN. « Moyenne, Médiane,
    // Étendue » couvre les indicateurs ; LIRE une représentation, et choisir
    // laquelle convient, n'existait nulle part — c'est la moitié du chapitre,
    // et c'est au programme de la sixième à la troisième.
    //
    // ET LA LIGNE ROUGE NE S'Y OPPOSE PAS : « Je ne veux pas de construction
    // géométrique avec des outils virtuels. » On ne trace pas un diagramme ici,
    // on le LIT. Le tracé reste sur le cahier, où il doit être.
    //
    // QUATRE TEMPS, ONZE MARCHES, et l'ordre est celui des FAUTES et non celui
    // des objets — voir l'en-tête du générateur. La deuxième marche porte tout
    // l'exercice : un axe gradué de 5 en 5, où compter les traits donne 3 au
    // lieu de 15.
    {
        id: 'don-diagrammes',
        cree: '2026-11-18',
        title: 'Lire un Diagramme',
        generatorId: 'don.diagrammes', activityId: 'numpad',
        // LA CALCULATRICE EST OUVERTE, pour la raison de « Moyenne, Médiane,
        // Étendue » : les deux dernières marches des bâtons additionnent cinq
        // nombres, et celle du camembert prend un pourcentage d'un total. Ce
        // qu'on mesure est la LECTURE du diagramme, pas l'addition.
        calculatrice: true,
        consignePapier: 'Regarde d\'abord la GRADUATION de l\'axe : elle ne va pas '
            + 'toujours de 1 en 1.',
        // UNE SEULE COLONNE : un diagramme réduit à une demi-largeur de page
        // n'a plus d'axe lisible, et c'est l'axe qu'on demande de lire.
        colonnesPapier: 1,
        lignesReponsePapier: 1,
        params: { nbQuestions: 8,
            marches: ['batons-un', 'batons-echelle', 'batons-entre', 'batons-comparer',
                'batons-total', 'batons-record', 'circulaire-part', 'circulaire-effectif',
                'histogramme-classe', 'histogramme-cumul', 'choisir'] },
        motsClefs: ['diagramme', 'bâtons', 'barres', 'circulaire', 'camembert',
            'histogramme', 'graduation', 'axe', 'échelle', 'lire un graphique',
            'statistiques', 'effectif', 'classe', 'courbe', 'représentation',
            'sixième', '6ème', 'brevet'],
        tags: {
            chemin: [TAGS.DOMAINE.DONNEES, TAGS.SOUS_DOMAINE.STATISTIQUES],
            niveaux: [TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME,
                TAGS.NIVEAU.QUATRIEME, TAGS.NIVEAU.TROISIEME]
        },
        instruction: "ON LIT D'ABORD L'AXE, PAS LA BARRE. C'est toute la difficulté du chapitre, et elle est invisible tant que les axes vont de 1 en 1 : sur un axe gradué de 5 en 5, une barre qui dépasse trois traits vaut QUINZE et non trois. Une marche entière est faite pour cela, et une autre pour le cas où la barre s'arrête ENTRE deux graduations — là, compter ne marche plus du tout. Viennent ensuite les questions où la lecture n'est que la première étape : combien de plus que l'autre, combien en tout, laquelle est la plus haute. LE DIAGRAMME CIRCULAIRE NE DONNE JAMAIS UN EFFECTIF : il donne des PARTS — la moitié, le quart, le tiers —, et pour savoir combien d'élèves cela fait il faut le TOTAL, qui est écrit dans l'énoncé et nulle part sur le dessin. L'HISTOGRAMME, lui, a ses barres COLLÉES, et ce n'est pas une question de dessin : son axe est continu, chaque barre couvre un intervalle — « de 150 à 160 cm » — et non une valeur. La dernière marche est celle du brevet : quel diagramme pour quelle situation ? Trois questions suffisent — compare-t-on des catégories, partage-t-on un tout, ou groupe-t-on des mesures en classes ?"
    },
    {
        id: 'don-probabilites',
        cree: '2026-10-20',
        title: 'Les Probabilités',
        generatorId: 'don.probabilites', activityId: 'numpad',
        // LA FEUILLE DESSINE LE SAC ET LA ROUE — voir `ui/fiches/donnees.js`.
        //
        // Elle n'imprimait que le texte : « Une roue de loterie est partagée
        // en 9 secteurs TOUS DE MÊME TAILLE : 5 sont verts et 4 sont bleus. »
        // C'est la DESCRIPTION du dessin au lieu du dessin, c'est-à-dire
        // exactement le travail que le dessin existe pour épargner. Rémy, le
        // 24 octobre : « des illustrations avec des roues de couleurs, des
        // urnes etc. » — l'écran les avait, le papier non.
        printable: 'probabilites',
        // `colonnesPapier` ET `lignesReponsePapier` SONT PARTIS AVEC LA LISTE.
        //
        // Ils réglaient la fiche de QUESTIONS — une colonne, deux lignes de
        // pointillés sous chaque énoncé. La feuille est maintenant une grille
        // de blocs, et ces deux-là s'y battaient en silence : `colonnesPapier:
        // 1` imposait UNE colonne au calcul du compte par défaut, qui tombait
        // donc à une question par page. On demandait douze questions, on en
        // recevait une par feuille, sur douze feuilles.
        consignePapier: 'Compte les cas, puis écris la probabilité.',
        params: { marches: ['certain', 'echelle', 'sac', 'roue', 'pas-cette-couleur',
            'contraire', 'comparer'] },
        motsClefs: ['probabilité', 'hasard', 'certain', 'impossible', 'événement',
            'contraire', 'urne', 'dé', 'roue', 'quatrième', '4ème'],
        tags: {
            chemin: [TAGS.DOMAINE.DONNEES, TAGS.SOUS_DOMAINE.PROBABILITES],
            niveaux: [TAGS.NIVEAU.QUATRIEME, TAGS.NIVEAU.TROISIEME]
        },
        instruction: "Sept marches. On commence par ce qu'une probabilité peut VALOIR — certain, impossible, possible, et un nombre entre 0 et 1 : un élève qui trouve 8/3 n'a pas besoin de la correction pour savoir qu'il s'est trompé. On compte ensuite les cas favorables et les cas possibles, et c'est là qu'est la faute du chapitre : « 3 rouges et 5 bleues » donne 3/5 au lieu de 3/8, parce qu'on oublie de compter les rouges dans le total. Chaque énoncé dit donc combien il y a d'objets EN TOUT. Aucune fraction ne se simplifie ici, et c'est voulu : 3/6 et 1/2 sont tous les deux justes, et un logiciel qui en choisit un compte faux la moitié des élèves qui ont raison. Les situations sont donc fabriquées pour que la fraction soit déjà irréductible."
    }
];
