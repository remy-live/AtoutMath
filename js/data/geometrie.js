import { TAGS } from './tags.js';
import { STATUS } from './status.js';
// Les paliers du quadrilatère qui se transforme viennent du noyau : deux listes
// d'options qui se répondent finissent toujours par diverger.
import { PALIERS as MORPH_PALIERS } from '../core/quadriMorph.js';

// Les anciens exercices « grille » (cases à cliquer dans un quadrillage) sont
// remplacés par un vrai repère du plan : axes fléchés, origine, graduations
// entières. Deux questions symétriques sur la même compétence — placer un
// point, lire des coordonnées — et une déclinaison en nombres relatifs.

export const geometrieExercises = [
    // --- Les angles remarquables (fiche 5ᵉ « Les angles ») ---
    //
    // Rémy, sa fiche en main : « j'aimerais bien des exercices comme le 8 et du
    // 15 au 21 ». C'est LE chapitre où la géométrie cesse d'être du dessin :
    // on ne mesure plus, on DÉDUIT. Une figure, un angle donné, et la relation
    // qui donne l'autre.
    {
        id: 'geo-angles-manquants',
        cree: '2026-08-25',
        title: 'La Valeur Manquante',
        generatorId: 'geo.angles-manquants', activityId: 'numpad',
        printable: 'anglesManquants',
        consignePapier: 'Trouve la mesure de l\'angle vert. Les droites en pointillés sont parallèles.',
        params: { niveau: 'melange' },
        skills: ['geo.angles.relations'],
        motsClefs: ['angles', 'opposés par le sommet', 'correspondants', 'alternes-internes',
            'complémentaires', 'supplémentaires', 'parallèles', 'sécante'],
        tags: {
            chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.ANGLES],
            niveaux: [TAGS.NIVEAU.CINQUIEME, TAGS.NIVEAU.QUATRIEME]
        },
        // LE PARALLÉLISME S'ÉCRIT, IL NE SE CODE PLUS SUR LE TRAIT. Rémy, deux
        // fois : « je ne comprends pas pourquoi tu mets des flèches », puis
        // « ne mets pas de flèche sur les tracés ». Le chevron est pourtant le
        // codage des manuels — mais posé sur une droite qui s'arrête au bord du
        // cadre, il se lit comme une pointe, et un codage qu'on lit de travers
        // est pire que pas de codage. Le POINTILLÉ distingue les deux
        // parallèles de la sécante, et la phrase dit le reste.
        instruction: 'Un angle est donné, un autre est à trouver. Cherche d\'abord COMMENT '
            + 'les deux sont placés : c\'est la relation qui donne la réponse. Les deux '
            + 'droites tracées EN POINTILLÉS sont PARALLÈLES ; celle qui les coupe est la '
            + 'sécante. C\'est de là que tout part.'
    },

    // L'AUTRE MOITIÉ DU CHAPITRE, et la première dans l'ordre : l'exercice 8,
    // « Classe les angles ». On ne calcule rien, on NOMME — et un élève qui ne
    // sait pas nommer ne peut pas calculer.
    {
        id: 'geo-angles-nommer',
        cree: '2026-08-25',
        title: 'Le Nom des Angles',
        generatorId: 'geo.angles-nommer', activityId: 'buttons',
        printable: 'anglesNommer',
        consignePapier: 'Comment s\'appellent les angles 1 et 2 ? Donne le nom le plus '
            + 'précis. Les droites en pointillés sont parallèles.',
        skills: ['geo.angles.relations'],
        motsClefs: ['angles', 'adjacents', 'opposés par le sommet', 'correspondants',
            'alternes-internes', 'complémentaires', 'supplémentaires', 'nommer', 'vocabulaire'],
        tags: {
            chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.ANGLES],
            niveaux: [TAGS.NIVEAU.CINQUIEME, TAGS.NIVEAU.QUATRIEME]
        },
        instruction: 'Rien à mesurer : tout est dans la POSITION des deux angles l\'un '
            + 'par rapport à l\'autre. Commence toujours par le sommet.'
    },

    // --- Les familles de quadrilatères ---
    // Rémy : « des exercices pour comprendre comment on passe d'un
    // quadrilatère à un parallélogramme. J'aime l'organigramme avec les cartes
    // à replacer. Il faut des choses visuelles quitte à avoir des animations. »
    //
    // CE QUE L'ORGANIGRAMME DIT, ET QU'UNE LISTE DE DÉFINITIONS NE DIT PAS :
    // les familles s'EMBOÎTENT. Un élève qui apprend six définitions séparées
    // croit avoir six familles côte à côte, et bute sur « est-ce qu'un carré
    // est un rectangle ? » — la question qui départage.
    //
    // ET LE CARRÉ SE REJOINT PAR DEUX CHEMINS. C'est le cœur de la figure :
    // depuis le rectangle en ajoutant les longueurs égales, depuis le losange
    // en ajoutant l'angle droit. Chaque chemin apporte ce que l'autre avait
    // déjà. Le plateau les met côte à côte pour qu'on ne puisse pas ne pas le
    // voir.
    //
    // L'ANIMATION N'EST PAS UN ORNEMENT : quand le nom tombe juste, le contour
    // du quadrilatère SE TRACE dans sa case, côté après côté. L'élève voit ce
    // qu'il vient de nommer. Et les cases vides montrent déjà leur figure en
    // pointillé — sans quoi l'exercice serait un jeu de mémoire, six mots pour
    // six trous, au lieu d'un raisonnement sur ce qu'on voit.
    {
        // LE QUADRILATÈRE QUI SE TRANSFORME — l'organigramme pris à l'envers.
        //
        // Rémy : « on a un quadrilatère qui n'a rien de particulier, et on a
        // des vignettes que l'on peut faire glisser sur le quadrilatère du
        // genre côté opposé parallèle, et on voit le quadrilatère se
        // transformer en absorbant la nouvelle propriété et on doit deviner ce
        // que ça va devenir. »
        //
        // L'AUTRE EXERCICE FAIT CLASSER, CELUI-CI FAIT CONSTRUIRE. Une
        // propriété n'y est plus une étiquette, c'est une CONTRAINTE — et
        // l'élève voit de ses yeux qu'ajouter une contrainte rétrécit la
        // famille. C'est l'idée que les élèves n'ont pas, et qu'aucun manuel ne
        // peut montrer parce qu'il faudrait que la figure bouge. Il vient donc
        // AVANT l'organigramme dans la progression, pas après.
        id: 'geo-quadri-morph', status: STATUS.TEST,
        title: 'Le Quadrilatère qui se Transforme',
        cree: '2026-09-01',
        activityId: 'quadri-morph',
        sansRevision: true,
        params: { palier: 'decouverte' },
        paramSchema: [
            {
                id: 'palier', type: 'select', label: 'Jusqu\'où on descend', default: 'decouverte',
                aide: 'Une seule propriété montre déjà l\'essentiel : la famille rétrécit. '
                    + 'Deux à la suite font descendre l\'arbre — et c\'est là qu\'on découvre '
                    + 'qu\'un angle droit posé sur un parallélogramme ne fait pas la même chose '
                    + 'que posé sur un quadrilatère quelconque. Les diagonales, elles, disent '
                    + 'les mêmes choses autrement.',
                options: Object.entries(MORPH_PALIERS).map(([value, p]) => ({ value, label: p.label }))
            }
        ],
        skills: ['geo.quadrilateres.familles'],
        motsClefs: ['quadrilatère', 'parallélogramme', 'losange', 'rectangle', 'carré',
            'propriété', 'diagonales', 'côtés parallèles', 'transformation'],
        tags: {
            chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.ESPACE],
            niveaux: [TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME]
        },
        instruction: "Tu pars d'une figure — souvent un quadrilatère qui n'a rien de particulier, parfois un parallélogramme déjà rangé — et son nom est écrit dessous. Tu travailles en DEUX TEMPS. 1. Tu poses une vignette sur la figure, et elle se déforme AUSSITÔT pour respecter la propriété : tu vois les sommets glisser. 2. Tu dis ce qu'elle est DEVENUE, et pour cela tu lis son codage — les chevrons marquent les côtés parallèles, les petits traits les longueurs égales, le petit carré l'angle droit. Le nom ne réapparaît qu'après ta réponse. Chaque vignette porte une PROPRIÉTÉ : la figure se déforme pour la respecter — c'est là qu'est le travail, l'animation n'est que la correction. Une propriété n'est pas une étiquette qu'on colle : c'est une contrainte, et chaque contrainte en plus RÉTRÉCIT la famille. Attention : certaines ne disent rien toutes seules. Des diagonales perpendiculaires dans un quadrilatère quelconque ne donnent aucune figure du cours ; les mêmes dans un parallélogramme font un losange. Et plusieurs chemins mènent au même endroit — côtés opposés parallèles, côtés opposés égaux, diagonales qui se coupent en leur milieu : trois propriétés différentes, un seul parallélogramme."
    },
    // LE PROGRAMME DE CONSTRUCTION — Rémy : « j'aimerais bien un exercice où on
    // a un tracé (points, segments, cercle) et il faut faire le programme de
    // construction. »
    //
    // ON JUGE LA FIGURE, PAS LA RÉDACTION : le programme s'exécute, et l'on
    // compare le dessin obtenu à celui qu'on montre. C'est la même règle que le
    // Chat Géomètre (« c'est le tracé obtenu qui compte ») et que l'atelier
    // d'instruments (« c'est la figure obtenue qui est jugée »). Voir
    // core/programmeConstruction.js.
    {
        id: 'geo-programme-construction',
        status: STATUS.TEST,
        title: 'Écris le programme de construction',
        cree: '2026-09-04',
        activityId: 'programme-construction',
        // LA FEUILLE NE FAIT PAS LE MÊME TRAVAIL QUE L'ÉCRAN. À l'écran on POSE
        // des blocs qui portent la phrase toute faite ; sur le papier on l'ÉCRIT.
        // C'est l'exercice du contrôle, et c'est le seul endroit où l'élève doit
        // produire la tournure lui-même. Voir generators/programmeConstructionFiche.js.
        printGeneratorId: 'geo.construction.programme.fiche',
        printable: 'programme-construction',
        skills: ['geo.construction.programme'],
        params: { familles: ['points', 'traits', 'cercles', 'milieux', 'perpendiculaires', 'paralleles', 'intersections'], depuis: 0, modeles: true },
        paramSchema: [
            {
                id: 'familles', type: 'multiselect', deroulant: true, tout: 'familles',
                label: 'Les blocs disponibles',
                default: ['points', 'traits', 'cercles', 'milieux', 'perpendiculaires', 'paralleles', 'intersections'],
                aide: 'Coche ce que la classe a déjà vu : la palette suit, et les niveaux dont '
                    + 'la solution réclamerait un bloc absent disparaissent — un exercice sans '
                    + 'réponse ne se propose pas. Avec les seuls SEGMENTS ET DROITES il reste '
                    + 'les deux premiers niveaux, ce qui est exactement ce qu\'on donne en '
                    + 'début de sixième.',
                options: [
                    { value: 'points', label: 'Placer des points' },
                    { value: 'traits', label: 'Segments et droites' },
                    { value: 'cercles', label: 'Cercles' },
                    { value: 'milieux', label: 'Milieu et médiatrice' },
                    { value: 'perpendiculaires', label: 'Perpendiculaires' },
                    { value: 'paralleles', label: 'Parallèles' },
                    { value: 'intersections', label: 'Points d\'intersection' }
                ]
            },
            {
                id: 'modeles', type: 'checkbox', label: 'Proposer les débuts de phrase', default: true,
                aide: 'Des boutons qui posent le début d\'une phrase dans la zone d\'écriture — '
                    + '« Trace le segment [ » — et laissent l\'élève taper les lettres. C\'est '
                    + 'un tremplin, pas une réponse : quel objet, à partir de quels points, '
                    + 'reste entièrement à décider. Décoché, il rédige de mémoire.'
            },
            {
                id: 'depuis', type: 'select', label: 'Commencer au niveau', default: 0,
                echelle: true,
                aide: 'On entre au milieu de l\'échelle quand les premiers ont été faits en '
                    + 'classe. Les niveaux s\'enchaînent ensuite jusqu\'au dernier disponible.',
                options: [
                    { value: 0, label: '1 — Un point', court: '1' },
                    { value: 3, label: '4 — Un segment', court: '4' },
                    { value: 5, label: '6 — Un cercle', court: '6' },
                    { value: 8, label: '9 — Une médiatrice', court: '9' },
                    { value: 12, label: '13 — Un triangle équilatéral', court: '13' }
                ]
            }
        ],
        motsClefs: ['programme de construction', 'construire', 'segment', 'droite', 'cercle',
            'milieu', 'médiatrice', 'perpendiculaire', 'parallèle', 'intersection', 'rédiger'],
        tags: { chemin: ['Géométrique', 'Repérage'], niveaux: ['6ème', '5ème'] },
        instruction: 'Une figure est dessinée : à toi d\'écrire le PROGRAMME qui la construit. '
            + 'Tu poses des blocs — « trace le segment [AB] », « trace le cercle de centre A '
            + 'passant par B », « trace la perpendiculaire à (AB) passant par C » — et '
            + 'l\'ordinateur les EXÉCUTE : ta figure se dessine à côté du modèle, et tu vois '
            + 'tout de suite ce qui manque. DEUX CHOSES À RETENIR. D\'abord la NOTATION : [AB] '
            + 'est le segment, (AB) la droite, AB la longueur — les blocs l\'écrivent pour toi, '
            + 'lis-la. Ensuite l\'ORDRE : on ne trace pas [AB] avant d\'avoir A et B, on ne '
            + 'prend pas le milieu d\'un segment qui n\'existe pas. Un bloc dont il manque un '
            + 'objet ne s\'exécute pas et te dit lequel. Il y a souvent PLUSIEURS programmes '
            + 'justes pour la même figure : c\'est le dessin obtenu qui compte, pas la façon de '
            + 'l\'écrire. Et tes traits de construction ont le droit de rester — les deux '
            + 'cercles qui donnent un triangle équilatéral sont la preuve de ton travail.'
    },

    {
        id: 'geo-quadrilateres',
        cree: '2026-09-01',
        title: 'L\'Organigramme des Quadrilatères',
        activityId: 'quadrilateres',
        sansRevision: true,
        // LA FICHE PAPIER A SON PROPRE GÉNÉRATEUR. Rémy l'a demandée pour son
        // PDF : c'est la feuille qu'on colle dans le cahier de leçons. À
        // l'écran on glisse des cartes, sur le papier on reporte une lettre —
        // découper treize étiquettes n'est pas une leçon de géométrie.
        printGeneratorId: 'geo.quadrilateres.organigramme',
        printable: 'organigramme-quadri',
        skills: ['geo.quadrilateres.familles'],
        // LE DÉFAUT EST L'ÉTAPE PAR ÉTAPE, ET NON L'ORGANIGRAMME ENTIER.
        //
        // Rémy, devant la carte complète : « c'est carrément illisible ».
        // Mesuré, et il a raison : sur un écran d'ordinateur, le plan de
        // l'organigramme ne fait que 400 px de large, chacune de ses treize
        // cases en fait 62, et huit d'entre elles ne peuvent pas contenir leur
        // phrase — « diagonales perpendiculaires » n'y tient à aucune taille
        // lisible. Ce n'est pas un défaut de police : treize conditions et cinq
        // figures ne se lisent pas d'un coup sur un écran.
        //
        // L'étape par étape, elle, zoome sur DEUX figures et trois cases : la
        // même leçon, une question à la fois, et tout tient en grand. C'est
        // aussi ce que Rémy décrit : « tu as un quadrilatère et le
        // parallélogramme et les 3 cases vides pour le transformer ».
        // LES PARTIES SE COCHENT, ELLES NE SE CHOISISSENT PLUS.
        //
        // Rémy : « pour les paramètres, on a l'étape organigramme que l'on peut
        // mettre ou non et après celle où il faut compléter les propriétés.
        // Dans les paramètres, il faut pouvoir paramétrer les exercices à
        // étape. »
        //
        // Les six paliers n'étaient pas six exercices : ce sont six MOMENTS de
        // la même leçon. Le menu déroulant obligeait à n'en donner qu'un, donc
        // à créer quatre entrées de catalogue pour donner une leçon entière —
        // ou à les lancer à la main l'un après l'autre. Le défaut ne change
        // pas : une seule case cochée, la construction étape par étape.
        // UN SEUL ORGANIGRAMME, COMPLET. Rémy : « ne fais qu'un seul organigramme
        // au complet. » Le compte par défaut en donnait trois — et trois fois la
        // MÊME carte : c'est une hiérarchie, elle ne se tire pas au sort. La
        // construire une fois demande déjà onze étapes ; la refaire à
        // l'identique deux fois de plus n'apprend rien et fait passer pour une
        // punition ce qui est une leçon.
        params: { parties: ['conditions'], codage: 'premier', reprise: 'debut', nbQuestions: 1 },
        paramSchema: [
            {
                id: 'parties', type: 'multiselect', deroulant: true, tout: 'parties',
                label: 'Les parties de la leçon', default: ['conditions'],
                aide: 'Coche ce que l\'élève traversera, dans l\'ordre de la leçon — les '
                    + 'parties s\'enchaînent, elles ne se remplacent pas. Placer les NOMS '
                    + 'travaille la hiérarchie : qui contient qui, dans un organigramme déjà '
                    + 'tracé. CONSTRUIRE l\'organigramme travaille les définitions, et se joue '
                    + 'en sept étapes : à chacune, deux cases et une seule question — '
                    + 'qu\'est-ce que celle de droite a de plus que celle de gauche ? Les deux '
                    + 'paliers de construction ne diffèrent que par le nombre de cartes-intrus '
                    + 'mêlées aux bonnes. RECONSTRUIRE ne guide plus du tout : l\'organigramme '
                    + 'est vide, les cinq figures sont données sans leur nom — on les reconnaît '
                    + 'à leur codage — et il faut d\'abord les ranger, puis relier chaque '
                    + 'flèche. C\'est ce qu\'on demande en contrôle. La SÉRIE DE QUESTIONS, '
                    + 'enfin, ne construit rien : elle vérifie, la carte à portée de main.',
                options: [
                    { value: 'decouverte', label: 'Placer trois noms' },
                    { value: 'noms', label: 'Placer tous les noms' },
                    { value: 'conditions', label: 'Construire l\'organigramme, étape par étape' },
                    { value: 'tout', label: 'Étape par étape, avec des intrus' },
                    { value: 'assembler', label: 'Reconstruire l\'organigramme entier' },
                    { value: 'questions', label: 'Une série de questions (la carte à portée)' }
                ]
            },
            // CODER LA FIGURE ENTRE DEUX ÉTAPES. Rémy : « ensuite, on lui
            // demande de coder le parallélogramme. Puis on passe au rectangle
            // […]. On code le rectangle puis après on met les vignettes. »
            {
                id: 'codage', type: 'select', label: 'Coder les figures', default: 'premier',
                echelle: true,
                aide: 'Quand une case apparaît, l\'élève CODE la figure : mêmes marques sur '
                    + 'les côtés de même longueur, petit carré sur les angles droits. Dire la '
                    + 'propriété et l\'écrire sur un dessin ne sont pas le même travail, et '
                    + 'c\'est le second qui se voit en contrôle. Les quatre codages ne sont '
                    + 'pas identiques — le rectangle ajoute les angles droits, le losange les '
                    + 'quatre côtés égaux — mais le GESTE se répète, et quatre fois dans une '
                    + 'même séance c\'est long. Le premier porte l\'essentiel ; les suivants '
                    + 'l\'appliquent. Ne concerne que l\'étape par étape.',
                options: [
                    { value: 'aucun', label: 'Aucun — on passe directement aux vignettes', court: 'Aucun' },
                    { value: 'premier', label: 'Le premier seulement', court: 'Premier' },
                    { value: 'tous', label: 'Toutes les figures', court: 'Toutes' }
                ]
            },
            {
                id: 'reprise', type: 'select', label: 'Quand on se trompe', default: 'debut',
                aide: 'L\'organigramme est une chaîne : chaque case se lit sur celles du '
                    + 'dessus. Tout reprendre, c\'est tout relire — et c\'est ainsi qu\'on le '
                    + 'retient. Refaire la seule étape ratée est plus doux, et convient à un '
                    + 'élève qui découvre.',
                options: [
                    { value: 'debut', label: 'On recommence depuis le début' },
                    { value: 'etape', label: 'On refait seulement l\'étape' }
                ]
            }
        ],
        motsClefs: ['quadrilatère', 'parallélogramme', 'rectangle', 'losange',
            'carré', 'organigramme', 'familles', 'propriétés'],
        tags: {
            chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.REPERAGE],
            niveaux: [TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME]
        },
        instruction: "Les quadrilatères ne sont pas cinq familles côte à côte : elles s'EMBOÎTENT. On part du quadrilatère quelconque, à gauche, et chaque flèche avance d'un cran en ajoutant UNE SEULE condition. Les côtés opposés parallèles donnent le parallélogramme ; un angle droit donne alors le rectangle ; deux côtés consécutifs de même longueur donnent le losange. Et attention : on peut atteindre la même case de PLUSIEURS façons. Il y a trois manières d'être un parallélogramme — par les côtés parallèles, par les côtés égaux, ou par les diagonales qui se coupent en leur milieu — et un élève qui n'en connaît qu'une ne reconnaît pas les deux autres dans un exercice. Regarde enfin la droite : on arrive au carré PAR DEUX CHEMINS, et chacun ajoute ce que l'autre avait déjà. C'est pour cela que tout carré est un rectangle, et aussi un losange — alors qu'un rectangle n'est pas forcément un carré."
    },

    // --- Le vocabulaire du cercle ---
    // Rémy : « j'aimerai bien un exercice sur le vocabulaire du cercle ».
    //
    // CE CHAPITRE NE SE RATE PAS PAR MANQUE DE MÉMOIRE, il se rate par
    // VOISINAGE. Le diamètre EST une corde — celle qui passe par le centre ;
    // l'arc et la corde joignent les deux mêmes points, l'un courbe et l'autre
    // droit ; la tangente et la sécante ne diffèrent que par le nombre de
    // points de contact. Et par-dessus tout, le CERCLE est une ligne quand le
    // DISQUE est une surface. Chaque mot porte donc ce qu'on répond à l'élève
    // qui l'a choisi par erreur : c'est cette phrase-là qui enseigne.
    //
    // « LE PLUS PRÉCISÉMENT POSSIBLE » EST DANS LA QUESTION, et ce n'est pas
    // une formule : devant un diamètre, « une corde » n'est pas faux, c'est
    // moins précis. Sans ce mot, l'exercice serait injuste — et l'élève qui
    // répond « corde » s'entend dire qu'il a raison, avant qu'on lui donne le
    // nom exact.
    {
        id: 'geo-cercle-vocabulaire',
        cree: '2026-09-01',
        title: 'Le Vocabulaire du Cercle',
        generatorId: 'geo.cercle-vocabulaire', activityId: 'cercle-element',
        printable: 'cercleVocabulaire',
        consignePapier: 'Complète : réponds à la question posée sous chaque figure.',
        skills: ['geo.cercle.vocabulaire'],
        params: {
            mots: ['centre', 'rayon', 'diametre', 'corde', 'arc', 'cercle', 'disque'],
            sens: 'les-deux', reponse: 'progressive'
        },
        motsClefs: ['cercle', 'disque', 'rayon', 'diamètre', 'corde', 'arc', 'tangente',
            'sécante', 'centre', 'vocabulaire'],
        tags: {
            chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.REPERAGE],
            niveaux: [TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME, TAGS.NIVEAU.QUATRIEME]
        },
        instruction: 'Deux questions différentes reviennent en alternance : dire ce que REPRÉSENTE un objet nommé — « que représente le segment [OA] ? » —, et TROUVER lequel des tracés porte le nom demandé. La seconde est la plus dure, parce que la corde et le diamètre sont alors sous les yeux en même temps. Pour t\'y retrouver, pose-toi toujours les deux mêmes questions : OÙ commence et où finit le tracé (au centre ? sur le cercle ? de part et d\'autre ?), et est-il DROIT ou COURBE. Et donne toujours le nom le plus précis : un diamètre est bien une corde, mais on l\'appelle un diamètre.'
    },

    // --- La notation des objets de base (fiche 4ᵉ § G) ---
    // [AB], (AB), [AB) : une notation ne se devine pas, et c'est pour cela
    // qu'on la perd. Des points partent chaque année sur « (AB) » écrit à la
    // place de « [AB] », dans des copies où la construction est juste.
    {
        id: 'geo-notation',
        cree: '2026-08-17',
        title: 'Segment, Droite ou Demi-droite ?',
        generatorId: 'geo.notation', activityId: 'bubbles',
        // SUR LE PAPIER, C'EST UNE FIGURE. « Comment note-t-on ceci ? » n'a
        // aucun sens sans le trait qu'on montre : la feuille écrite ne sait
        // poser que du texte, et l'élève lisait « Note la figure ci-dessus »
        // au-dessus de rien. Le bloc dessine le schéma des trois sens.
        printable: 'notation',
        params: {
            objets: ['segment', 'droite', 'demi-droite'],
            sens: ['ecrire', 'dessin', 'dire']
        },
        motsClefs: ['segment', 'droite', 'demi-droite', 'notation', 'crochet'],
        tags: {
            chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.REPERAGE],
            niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME]
        },
        instruction: "Le crochet est un mur, la parenthèse laisse filer. [AB] s'arrête aux deux points, (AB) ne s'arrête jamais, [AB) part de A et continue au-delà de B. Attention à la demi-droite : le PREMIER point nommé est l'origine, donc [AB) et [BA) ne sont pas la même chose. "
            + "Pour commencer, on peut retirer la demi-droite dans le réglage « Objets » : elle seule a une origine, et l'on ne comprend pas ce que code un crochet en découvrant en même temps qu'il y a un sens de parcours."
    },
    {
        // UNE PROPRIÉTÉ ET SA RÉCIPROQUE, dans le même exercice. Même figure,
        // même rédaction en trois lignes ; ce qui change est le sens de la
        // déduction — partir de deux parallèles, ou partir de deux angles
        // droits. C'est la confusion la plus fréquente en sixième, et la
        // séparer en deux entrées la rendait invisible : chacune s'annonçait
        // dans son titre, donc il n'y avait plus rien à discriminer. Le
        // réglage « Propriété travaillée » les offre côte à côte.
        id: 'geo-redaction', status: STATUS.TEST, title: 'Rédiger une Justification',
        cree: '2026-08-11',
        activityId: 'redaction',
        // Le générateur ne sert PAS à l'écran (l'activité est autonome) : il
        // sert au papier. Rédiger une justification, c'est écrire à la main —
        // c'est l'exercice qui gagne le plus à sortir de l'écran.
        generatorId: 'geo.redaction', printable: 'redaction',
        params: { propriete: 'para-perp' },
        printParams: { propriete: 'para-perp', miseEnPage: 'empile' },
        motsClefs: ['parallèles', 'perpendiculaires', 'réciproque', 'je sais que', 'or', 'donc'],
        tags: { chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.REPERAGE], niveaux: [TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Une justification de géométrie a toujours trois lignes : JE SAIS QUE, OR, DONC. On les écrit une par une. D'abord tu remets la propriété du cours dans l'ordre, puis tu lis la figure — les droites en POINTILLÉS sont parallèles — puis la propriété s'écrit pendant que la figure montre de quoi elle parle, et enfin tu conclus. Le réglage « Propriété travaillée » choisit le sens : partir de deux parallèles pour conclure un angle droit, ou partir de deux angles droits pour conclure un parallélisme."
    },
    {
        // PYTHAGORE, TRÈS PROGRESSIVEMENT. Six niveaux, six marches : montrer
        // l'hypoténuse du doigt, remettre la phrase du cours dans l'ordre,
        // écrire l'égalité pour SON triangle, calculer l'hypoténuse, calculer
        // un côté (on soustrait), rédiger en entier. On ne demande jamais deux
        // choses nouvelles à la fois — le modèle des exercices de rédaction.
        id: 'geo-pythagore', status: STATUS.TEST, title: 'Le Théorème de Pythagore',
        cree: '2026-08-12',
        revisions: [{
            date: '2026-08-19',
            quoi: 'Les deux lignes du milieu ne sont plus des cases d\'un chiffre entre des « ² » '
                + 'imprimés d\'avance : l\'élève écrit la ligne entière, carrés compris, sur un pavé '
                + 'qui porte la touche x².'
        }],
        activityId: 'pythagore-theoreme',
        // LA CALCULATRICE EST OFFERTE ICI. Rémy : « La calculatrice n'a pas à
        // être dans les exercices autre que Pythagore, et le problème de temps
        // distance vitesse. » Ce qui s'apprend est la rédaction — je sais que,
        // or, donc — et le choix entre additionner et soustraire les carrés ;
        // extraire à la main la racine de 1 156 ne vérifie rien de plus et
        // mange le temps qu'on voulait passer à raisonner.
        calculatrice: true,
        // Le générateur sert au PAPIER : les énoncés de calcul, avec la
        // correction en trois lignes.
        // Le générateur sert au PAPIER, et la feuille porte la RÉDACTION :
        // énoncé à gauche — en toutes lettres ou en figure codée —, puis « Je
        // sais que / Or / Donc » et la place d'écrire. Une fiche de Pythagore
        // qui se corrige par un nombre n'apprend pas ce qu'on note.
        generatorId: 'geo.pythagore', printable: 'pythagore',
        sansRevision: true,
        skills: ['geo.pythagore'],
        params: { niveau: 'progressif' },
        paramSchema: [
            {
                id: 'niveau', type: 'select', label: 'Niveau',
                aide: 'En progressif, les six marches s\'enchaînent au fil de l\'exercice — '
                    + 'c\'est l\'escalier qui enseigne. Choisir une marche précise sert à '
                    + 'reprendre un point qui coince.',
                options: [
                    { value: 'progressif', label: 'Progressif — les 6 marches à la suite' },
                    { value: 1, label: '1 — Montrer l\'hypoténuse' },
                    { value: 2, label: '2 — La phrase du théorème' },
                    { value: 3, label: '3 — Écrire l\'égalité' },
                    { value: 4, label: '4 — Calculer l\'hypoténuse' },
                    { value: 5, label: '5 — Calculer un côté de l\'angle droit' },
                    { value: 6, label: '6 — Rédiger en entier' }
                ],
                default: 'progressif'
            }
        ],
        tags: { chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.REPERAGE], niveaux: [TAGS.NIVEAU.QUATRIEME, TAGS.NIVEAU.TROISIEME] },
        instruction: "Tout part de l'angle droit : le côté d'en face est l'hypoténuse. Son carré vaut la somme des carrés des deux autres côtés. Chaque niveau ajoute UNE seule chose : d'abord montrer l'hypoténuse du doigt, puis la phrase du cours, puis l'égalité, puis les calculs — additionner pour l'hypoténuse, soustraire pour un côté — et enfin la rédaction complète. La racine carrée est la dernière marche : le calcul donne un carré, pas une longueur."
    },
    {
        // L'ATELIER : les vrais instruments, à l'écran. La consigne est posée
        // par l'application (le segment [AB] est déjà là), la construction est
        // libre — compas, équerre, règle, peu importe — et c'est la FIGURE
        // obtenue qui est jugée, pas la méthode employée.
        id: 'geo-atelier-instruments', status: STATUS.TEST,
        cree: '2026-08-12',
        title: 'Atelier de Géométrie : Règle, Équerre et Compas',
        activityId: 'geometrie',
        params: { consigne: 'aleatoire' },
        skills: ['geo.construire.instruments'],
        tags: { chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.REPERAGE], niveaux: [TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Les quatre instruments sont en haut de la feuille : règle, équerre, compas, rapporteur. On les prend, on les pose, on les tourne — à la souris comme au doigt — et on trace le long de leur bord. La figure de départ est déjà placée : lis la consigne, construis, puis appuie sur « Valider ma construction ». C'est la figure obtenue qui est jugée, pas l'outil choisi : la médiatrice au compas et la médiatrice à l'équerre valent pareil."
    },
    // DEUX EXERCICES, ET NON QUATRE. Placer et lire sont bien deux gestes —
    // deux activités, qui n'acceptent même pas le même type de réponse — mais
    // « avec des négatifs » n'en est pas un troisième : c'est le réglage
    // « Coordonnées ». `printParams` ne le répète plus, sans quoi la feuille
    // imprimée restait dans les positifs quoi qu'on ait choisi à l'écran.
    {
        id: 'geo-repere-placer', title: 'Placer un Point',
        cree: '2026-07-28',
        generatorId: 'geo.repere',
        // Sur le papier, UN repère porte SIX points : retracer des axes à
        // chaque question n'apprend rien, et gâche la moitié de la page.
        printable: 'repere', printGeneratorId: 'geo.repere-fiche',
        printParams: { mode: 'placer', points: 6 }, activityId: 'repere',
        params: { relatifs: 'positives', max: 5, mode: 'placer' },
        motsClefs: ['relatifs', 'négatifs', 'abscisse', 'ordonnée', 'coordonnées'],
        tags: { chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.REPERAGE], niveaux: [TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Clique dans le repère à l'endroit indiqué par les coordonnées. On lit l'abscisse en premier. "
            + "Le réglage « Coordonnées » fait passer le repère dans les négatifs : attention alors aux signes."
    },
    {
        id: 'geo-repere-lire', title: 'Lire des Coordonnées',
        cree: '2026-07-28',
        generatorId: 'geo.repere',
        // Sur le papier, UN repère porte SIX points : retracer des axes à
        // chaque question n'apprend rien, et gâche la moitié de la page.
        printable: 'repere', printGeneratorId: 'geo.repere-fiche',
        printParams: { mode: 'lire', points: 6 }, activityId: 'repere-lecture',
        params: { relatifs: 'positives', max: 5, mode: 'lire' },
        motsClefs: ['relatifs', 'négatifs', 'abscisse', 'ordonnée', 'coordonnées'],
        tags: { chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.REPERAGE], niveaux: [TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Lis les coordonnées du point tracé et choisis le bon couple. "
            + "Avec « Coordonnées » sur les relatives, il ne faut plus oublier les signes."
    },

    // --- Les transformations, aux carreaux (fiche 4ᵉ) ---
    //
    // Rémy : « je ne suis pas très chaud pour la géométrie [aux instruments],
    // il faut les manipuler en vrai, pas à l'ordi. Je suis pour le
    // quadrillage. » Le partage est juste, et c'est déjà celui de sa fiche :
    // la moitié de ses exercices se font aux carreaux, l'autre au compas.
    //
    // DEUX ENTRÉES, PARCE QUE CE SONT DEUX CHAPITRES. « Symétrie axiale »
    // ouvre la sixième et ne connaît qu'un miroir ; « Transformations » arrive
    // en cinquième puis en quatrième et en compte quatre. Un exercice unique
    // réglé au cas par cas les aurait fondus l'un dans l'autre, et le rangement
    // par chapitre n'aurait plus rien eu à ranger.
    {
        id: 'geo-symetrie-quadrillage',
        revisions: [
            {
                date: '2026-08-19',
                quoi: 'Le sens de rotation était annoncé À L\'ENVERS du calcul — consigne et '
                    + 'flèche —, il est corrigé et se dit maintenant « sens direct » ou '
                    + '« indirect ». L\'axe et le centre tombent sur les traits du quadrillage, '
                    + 'et la figure ne pousse plus « Valider » hors de l\'écran en paysage.'
            }
        ], title: 'Le Symétrique aux Carreaux',
        cree: '2026-08-18',
        consignePapier: 'Colorie l\'image de la figure grise par la symétrie d\'axe (d).',
        generatorId: 'geo.transfo.quadrillage', activityId: 'quadrillage',
        printable: 'quadrillage',
        skills: ['geo.transfo.axiale'],
        // Pas d'obliques en sixième : devant une diagonale à 45°, on ne compte
        // plus ni lignes ni colonnes, et la méthode qu'on vient d'apprendre ne
        // sert plus. C'est un autre exercice, et il se règle d'une case.
        params: { genres: ['axiale'], obliques: false, taille: 'moyen' },
        motsClefs: ['symétrie', 'axe', 'miroir', 'quadrillage', 'carreaux', 'image'],
        tags: {
            chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.TRANSFORMATIONS],
            niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME]
        },
        instruction: "Clique sur les cases pour colorier l'image ; reclique pour effacer. "
            + "La méthode est toujours la même : UNE case à la fois. Pour chacune, compte les "
            + "carreaux qui la séparent de l'axe rouge, puis reporte le même nombre de l'autre côté. "
            + "Quand ta figure est complète, appuie sur « Valider » — rien n'est jugé avant. "
            + "Le réglage « axes obliques » ajoute les diagonales à 45° : gardez-le décoché tant "
            + "que le miroir droit n'est pas acquis, car on n'y compte plus ni lignes ni colonnes."
    },
    {
        id: 'geo-transfo-quadrillage',
        revisions: [
            {
                date: '2026-08-19',
                quoi: 'Le sens de rotation était annoncé À L\'ENVERS du calcul — consigne et '
                    + 'flèche —, il est corrigé et se dit maintenant « sens direct » ou '
                    + '« indirect ». L\'axe et le centre tombent sur les traits du quadrillage, '
                    + 'et la figure ne pousse plus « Valider » hors de l\'écran en paysage.'
            },
            {
                date: '2026-08-20',
                quoi: 'Quand les phrases d\'aide sont épuisées, le bouton d\'indice devient '
                    + '« Trace une case » et POSE une case de l\'image, dans l\'ordre de lecture. '
                    + 'L\'élève qui bloque ne bloque pas sur la règle mais sur le premier report, '
                    + 'celui qui n\'a aucun repère avant lui ; une case donnée, et tout le reste se '
                    + 'compte à partir d\'elle. Elle compte dans la figure, mais garde un liseré '
                    + 'orange : on doit distinguer ce qu\'on a trouvé de ce qu\'on a reçu.'
            }
        ], title: 'Tracer l\'Image d\'une Figure',
        cree: '2026-08-18',
        consignePapier: 'Colorie l\'image de la figure grise par la transformation indiquée.',
        generatorId: 'geo.transfo.quadrillage', activityId: 'quadrillage',
        printable: 'quadrillage',
        skills: ['geo.transfo.axiale', 'geo.transfo.centrale', 'geo.transfo.translation', 'geo.transfo.rotation'],
        params: { genres: ['axiale', 'translation', 'centrale', 'rotation'], obliques: true, taille: 'moyen' },
        motsClefs: ['symétrie', 'centrale', 'translation', 'rotation', 'quart de tour',
            'transformation', 'quadrillage', 'pavage'],
        tags: {
            chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.TRANSFORMATIONS],
            niveaux: [TAGS.NIVEAU.CINQUIEME, TAGS.NIVEAU.QUATRIEME, TAGS.NIVEAU.TROISIEME]
        },
        instruction: "Les quatre transformations du collège, sur le même quadrillage. Ce qui est "
            + "en rouge est la DONNÉE : l'axe (d), le centre O, ou la flèche du vecteur. "
            + "Le réglage « Transformations » choisit lesquelles tomberont — n'en laissez qu'une "
            + "pour travailler un chapitre, toutes les quatre pour une révision, car c'est alors "
            + "de reconnaître laquelle qu'il s'agit. La symétrie centrale et le quart de tour "
            + "se confondent souvent : le demi-tour est une symétrie centrale, jamais une rotation."
    },

    {
        // LA TRANSLATION SEULE, ET LA FLÈCHE QUI SE DÉPLACE.
        //
        // Rémy : « j'aimerais bien un exercice juste avec les translations où la
        // flèche démarre d'un sommet de la figure puis après à un autre endroit. »
        //
        // C'est un exercice à part, et non un réglage de « Tracer l'Image » :
        // les deux poses de la flèche forment une PROGRESSION qui n'a de sens
        // que sur la translation. Partant d'un sommet, la flèche montre où va ce
        // sommet-là — on suit la pointe, on pose la première case, le reste se
        // recopie. Posée ailleurs, elle ne touche plus rien, et il faut avoir
        // compris qu'un vecteur est un DÉPLACEMENT, pas un trajet entre deux
        // points donnés. C'est précisément la marche que les élèves ratent, et
        // elle méritait sa propre porte d'entrée.
        id: 'geo-translation-fleche',
        title: 'La Flèche qui Glisse',
        cree: '2026-09-01',
        consignePapier: 'Colorie l\'image de la figure grise par la translation que montre la flèche.',
        generatorId: 'geo.transfo.quadrillage', activityId: 'quadrillage',
        printable: 'quadrillage',
        skills: ['geo.transfo.translation'],
        // L'alternance par défaut : une question sur deux part d'un sommet.
        // C'est en voyant les deux poses se suivre qu'on comprend ce que la
        // seconde enlève.
        params: { genres: ['translation'], fleche: 'melange', motsDuVecteur: false, taille: 'moyen' },
        motsClefs: ['translation', 'vecteur', 'flèche', 'glisser', 'quadrillage',
            'carreaux', 'déplacement'],
        tags: {
            chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.TRANSFORMATIONS],
            niveaux: [TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME, TAGS.NIVEAU.QUATRIEME]
        },
        instruction: "La translation, et elle seule. La flèche rouge donne le déplacement : "
            + "toutes les cases font EXACTEMENT le même, sans tourner ni se retourner. "
            + "Le réglage « D'où part la flèche » est la vraie progression de l'exercice. "
            + "Partant d'un sommet de la figure, elle montre où va ce sommet-là, et il n'y a "
            + "qu'à la suivre. Posée ailleurs sur le quadrillage, elle ne touche plus rien : "
            + "il faut alors avoir compris qu'un vecteur est un déplacement, et non un trajet "
            + "entre deux points précis. Commencez par les sommets, passez au mélange, "
            + "finissez par « posée ailleurs »."
    },

    {
        // LA COURSE DE VECTEURS, demandée par Rémy : « j'aimerais bien le jeu
        // course de vecteur Vector Racer / Racetrack ».
        //
        // Le jeu de course sur papier quadrillé, avec sa règle en une phrase :
        // la voiture GARDE sa vitesse d'un tour sur l'autre, et l'on ne choisit
        // que comment la changer — d'une case au plus sur chaque axe. Un
        // déplacement d'un tour est donc exactement une translation de vecteur
        // (vx ; vy), et le tour suivant ajoute l'accélération à ce vecteur.
        // Toute la leçon sur les vecteurs est dans le jeu, et personne n'a
        // besoin qu'on la lui récite après y avoir joué deux fois.
        //
        // À DEUX SUR LA MÊME TABLETTE, ou contre le robot — qui, lui, cherche
        // vraiment le plus court chemin (parcours en largeur sur position ET
        // vitesse), et qu'on peut rendre « mou » pour laisser une chance.
        id: 'geo-course-vecteurs', status: STATUS.TEST, title: 'La Course de Vecteurs',
        cree: '2026-08-20',
        activityId: 'course-vecteurs',
        // UNE QUESTION, C'EST UNE COURSE. Le meneur compte les tentatives pour
        // arrêter l'étape : à dix, la série se terminait au dixième virage,
        // avant la ligne d'arrivée. Trois courses font une séance honnête.
        params: { piste: 'echauffement', adversaire: 'seul', robot: 'moyen', nbQuestions: 3 },
        paramSchema: [
            {
                id: 'piste', type: 'select', label: 'La piste', default: 'echauffement',
                aide: 'L\'Échauffement est une ligne droite et un virage : de quoi comprendre '
                    + 'que la vitesse se conserve. La Chicane enchaîne deux virages en sens '
                    + 'contraire. Le Grand Tour ajoute un couloir étroit, où arriver vite ne '
                    + 'sert à rien si l\'on n\'arrive pas placé.',
                options: [
                    { value: 'echauffement', label: 'L\'Échauffement — un seul virage' },
                    { value: 'chicane', label: 'La Chicane — deux virages opposés' },
                    { value: 'circuit', label: 'Le Grand Tour — trois virages' },
                    { value: 'toutes', label: 'Au hasard' }
                ]
            },
            {
                id: 'adversaire', type: 'select', label: 'Contre qui', default: 'seul',
                aide: 'Seul, on court après le record théorique de la piste — le nombre de tours '
                    + 'du meilleur parcours possible, calculé et affiché. À deux, on joue sur la '
                    + 'même tablette, chacun son tour.',
                options: [
                    { value: 'seul', label: 'Seul, contre le record' },
                    { value: 'robot', label: 'Contre le robot' },
                    { value: 'deux', label: 'À deux sur la même tablette' }
                ]
            },
            {
                id: 'robot', type: 'select', label: 'Le robot', default: 'moyen',
                aide: 'Un robot parfait gagne toujours, et un jeu qu\'on ne peut pas gagner ne '
                    + 'se joue pas deux fois. « Facile » et « moyen » lui font perdre des tours '
                    + 'exprès, sans jamais le faire sortir de la piste.',
                options: [
                    { value: 'facile', label: 'Facile — il flâne' },
                    { value: 'moyen', label: 'Moyen' },
                    { value: 'fort', label: 'Sans pitié — le parcours parfait' }
                ]
            }
        ],
        skills: ['geo.transfo.translation', 'geo.repere.coord'],
        motsClefs: ['vecteur', 'translation', 'coordonnées', 'course', 'quadrillage',
            'vitesse', 'accélération', 'relatifs'],
        tags: {
            chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.TRANSFORMATIONS],
            niveaux: [TAGS.NIVEAU.CINQUIEME, TAGS.NIVEAU.QUATRIEME, TAGS.NIVEAU.TROISIEME]
        },
        instruction: 'La voiture garde sa vitesse d\'un tour sur l\'autre : tu ne choisis que '
            + 'comment la changer, d\'une case au plus vers la gauche ou la droite, et d\'une '
            + 'case au plus vers le haut ou le bas. Les neuf points montrent où tu arriverais '
            + 'pour chacun des neuf choix — ceux qui sont barrés en rouge t\'enverraient dans le '
            + 'décor. Au clavier, le pavé numérique EST le carré des neuf points. Le piège est '
            + 'toujours le même : il faut freiner AVANT le virage, jamais dedans.'
    },

    {
        // L'EXERCICE INVERSE DU PRÉCÉDENT, et c'est tout son intérêt. Tracer,
        // c'est appliquer une règle qu'on vous donne ; reconnaître, c'est la
        // retrouver. Encore faut-il demander la bonne chose : une première
        // version demandait le GENRE de transformation, ce que Rémy a jugé
        // « pas terrible » — et il avait raison. Nommer la famille ne demande
        // que de reconnaître une allure ; trouver L'ÉLÉMENT — cette droite-là,
        // ce point-là — demande de savoir qu'il passe au MILIEU de chaque paire
        // de points correspondants. C'est la définition, et c'est elle qu'on
        // travaille.
        id: 'geo-pavage', title: 'Symétrique par Rapport à Quoi ?',
        cree: '2026-08-18',
        // UNE RÉVISION SE NOTE QUAND L'EXERCICE CHANGE DE NATURE, jamais pour
        // une faute d'orthographe : sinon la liste devient un journal de
        // commits, et l'on ne voit plus ce qui compte.
        revisions: [
            {
                date: '2026-08-19',
                quoi: 'La question change : au lieu de nommer la famille de la transformation, '
                    + 'on cherche PAR RAPPORT À QUOI. Trois façons de répondre — choisir le nom, '
                    + 'cliquer la droite sur le dessin, écrire son équation.'
            }
        ],
        consignePapier: 'Écris par rapport à quelle droite ou à quel point les deux pièces sont symétriques.',
        generatorId: 'geo.transfo.pavage', activityId: 'symetrie-element',
        printable: 'pavage',
        skills: ['geo.transfo.reconnaitre'],
        params: { especes: ['axe', 'point'], taille: 'moyen' },
        motsClefs: ['pavage', 'symétrie', 'axe', 'centre', 'par rapport à',
            'reconnaître', 'médiatrice', 'milieu', 'damier'],
        tags: {
            chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.TRANSFORMATIONS],
            niveaux: [TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME, TAGS.NIVEAU.QUATRIEME]
        },
        instruction: "Plusieurs droites et plusieurs points sont tracés sur le pavage, tous de la "
            + "même façon : un seul envoie la première pièce sur la seconde. La méthode tient en "
            + "deux gestes. D'abord, la figure a-t-elle été RETOURNÉE, comme dans un miroir ? "
            + "Si oui, cherche une droite ; sinon, elle a fait un demi-tour, cherche un point. "
            + "Ensuite, prends UN point et son image : ce que tu cherches est au MILIEU des deux. "
            + "Le réglage « Comment on répond » donne trois marches — choisir parmi les noms, "
            + "cliquer l'élément sur le dessin, écrire son équation. En progressif, l'exercice "
            + "les monte tout seul. Aucune question n'a deux réponses : les paires reliées par "
            + "plusieurs éléments sont écartées avant d'être posées."
    },

    // --- Angle Master : le rapporteur interactif ---
    {
        // Mesurer et construire sont les deux sens du même geste, et le
        // générateur les offre depuis toujours dans son réglage « Question » —
        // qui propose même de les ALTERNER, ce qu'aucune des deux entrées
        // séparées ne permettait d'atteindre.
        id: 'geo-angles', status: STATUS.TEST, title: 'Angle Master',
        cree: '2026-08-04',
        revisions: [{
            date: '2026-08-19',
            quoi: 'Un seul doigt posé à côté du rapporteur tire la feuille (le pinch reste), '
                + 'la loupe bloque ce déplacement, et la mesure se tape sur un pavé en page — '
                + 'le clavier de la tablette recouvrait la figure qu\'on est en train de mesurer.'
        }, {
            date: '2026-08-20',
            quoi: 'Le pavé de chiffres passe AVANT la barre d\'aide : posé après, ses quarante-cinq '
                + 'pixels suffisaient à pousser hors de l\'écran la rangée qui porte le 0 et le OK. '
                + 'La figure devient élastique au lieu d\'avoir une hauteur fixe, et tout tient '
                + 'jusque sur un écran de 320 × 568 — indice et « Montre-moi » côte à côte compris.'
        }],
        generatorId: 'geo.angles', activityId: 'angles',
        // C'est l'exercice qu'un écran ne remplace pas : le rapporteur de
        // plastique se pose de travers, et c'est en le redressant qu'on
        // comprend à quoi sert son repère central.
        printable: 'angles',
        params: { mode: 'mesurer', plage: 'tous', tolerance: 3 },
        motsClefs: ['mesurer', 'construire', 'rapporteur', 'aigu', 'obtus', 'degrés'],
        tags: { chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.ANGLES], niveaux: [TAGS.NIVEAU.SIXIEME] },
        instruction: "Estime d'abord si l'angle est aigu ou obtus, puis mesure-le : déplace le rapporteur sur le sommet, tourne-le par ses poignées pour aligner le zéro, et saisis la valeur lue. Le réglage « Question » passe à la construction — placer le rapporteur, repérer la graduation, amener le côté rouge dessus — ou fait alterner les deux."
    },
    {
        id: 'geo-chat-geometre', status: STATUS.TEST, title: 'Le Chat Géomètre',
        cree: '2026-08-05',
        generatorId: 'geo.scratch', activityId: 'scratch',
        // SUR LE PAPIER, ON RENVERSE L'EXERCICE : le programme est donné, la
        // figure est à tracer. Tant qu'on peut lancer, on ne prévoit pas ; ici
        // rien ne s'exécute, et c'est exactement le « programme de
        // construction » du brevet.
        printable: 'chat', printGeneratorId: 'geo.chat-fiche',
        printParams: { quoi: 'melange', niveau: 'moyen' },
        consignePapier: "Trace au crayon, côté par côté, en comptant les carreaux.",
        params: { depart: 1, saisie: 'auto' },
        tags: { chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.ANGLES], niveaux: [TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Programme le chat pour qu'il repasse la figure : pose des blocs « avancer » et « tourner », puis lance. Douze niveaux, du trait unique à la rosace — c'est le tracé obtenu qui compte, pas la forme du programme."
    },
    {
        // La même activité, sans figure à repasser ni correction : l'atelier.
        // Les douze figures apprennent l'angle, elles n'apprennent pas
        // l'envie ; c'est en essayant « répéter 36 fois » pour voir ce que ça
        // donne qu'on découvre le cercle.
        id: 'geo-chat-libre', status: STATUS.TEST, title: 'Le Chat Géomètre — atelier libre',
        cree: '2026-08-06',
        generatorId: 'geo.scratch', activityId: 'scratch',
        // Un ATELIER, pas un exercice : rien à régler avant d'entrer (le
        // panneau demandait un nombre de questions et un niveau de départ pour
        // quelque chose qui n'a ni l'un ni l'autre), pas de barre de
        // progression, pas d'indice. On ouvre et on dessine.
        atelier: true, internalStudentConfig: true,
        params: { mode: 'libre', saisie: 'auto', nbQuestions: 1 },
        tags: { chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.ANGLES], niveaux: [TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "L'atelier libre : toute la palette, aucune figure imposée, rien à valider. Programme le chat et regarde ce qu'il dessine."
    },
    {
        id: 'geo-galactic', title: 'Galactic : Tir aux Angles',
        cree: '2026-08-04',
        activityId: 'galactic', skills: ['geo.angles.mesure'],
        params: { startLevel: 1, lives: 3 },
        paramSchema: [
            { id: 'startLevel', type: 'number', label: 'Niveau de départ', min: 1, max: 6, default: 1 },
            { id: 'lives', type: 'number', label: 'Vies', min: 1, max: 5, default: 3 }
        ],
        tags: { chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.ANGLES], niveaux: [TAGS.NIVEAU.SIXIEME] },
        instruction: "Un ennemi apparaît au-dessus d'un rapporteur géant : lis l'angle sur la bonne échelle, tape-le au clavier et tire ! Attention aux niveaux à échelle inversée où le canon tire à 180 − x, aux astéroïdes qui bloquent les tirs, et aux cibles mouvantes."
    },
    {
        // LE PLAN NE BOUGE PAS, LA VOITURE TOURNE. Toute la difficulté est là :
        // quand la voiture descend, sa gauche est à DROITE de l'écran. Un plan
        // qui pivoterait avec le véhicule — comme un GPS — supprimerait
        // l'exercice au lieu de l'aider.
        id: 'geo-ville', title: 'Le Plan de Ville',
        cree: '2026-08-11',
        activityId: 'ville', skills: ['geo.espace.deplacement', 'geo.espace.orientation'],
        params: { taille: 'moyen', capNord: false },
        paramSchema: [
            {
                id: 'taille', type: 'select', label: 'Taille de la ville',
                aide: 'Plus la ville est grande, plus il y a de virages à enchaîner sans se tromper.',
                options: [
                    { value: 'petit', label: '4 × 4 — deux virages' },
                    { value: 'moyen', label: '5 × 5 — trois virages' },
                    { value: 'grand', label: '6 × 5 — quatre virages' }
                ],
                default: 'moyen'
            },
            {
                id: 'capNord', type: 'checkbox', label: 'Toujours partir vers le haut',
                aide: 'Départ vers le haut du plan : tant que la voiture monte, sa gauche est celle de l\'écran. À décocher dès que le mécanisme est compris — c\'est en descendant qu\'on apprend.',
                default: false
            }
        ],
        tags: { chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.ESPACE], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME] },
        instruction: "Conduis la voiture jusqu'au lieu demandé en suivant la feuille de route : « prends la deuxième à gauche », « puis la première à droite ». Les trois boutons — et les flèches du clavier — sont ceux du CONDUCTEUR : quand la voiture descend, sa gauche est à droite de l'écran. Avant chaque virage, demande-toi dans quel sens elle roule. Et « la deuxième à gauche » compte les rues qui partent à gauche, pas les carrefours."
    },
    {
        // CODER LA FIGURE. L'exercice que Rémy a décrit : un quadrilatère, ses
        // diagonales, et des marques à poser dessus.
        //
        // Ce n'est pas un exercice de reconnaissance — la figure est NOMMÉE
        // dans la consigne. C'est un exercice de PROPRIÉTÉS : savoir qu'un
        // losange est nommé losange ne sert à rien tant qu'on ne sait pas ce
        // que cela oblige. Le codage force à le dire, segment par segment, et
        // il ne pardonne pas l'à-peu-près : une marque de plus affirme une
        // égalité fausse, une marque de moins en oublie une vraie.
        id: 'geo-coder-figure', title: 'Code la figure',
        cree: '2026-08-24',
        activityId: 'codage',
        // La même figure à l'écran et sur la feuille : le codage se fait au
        // crayon depuis toujours, et c'est l'exercice qu'on photocopie.
        generatorId: 'geo.codage', printable: 'codage',
        params: { familles: 'toutes', diagonales: true, penchee: 'parfois' },
        skills: ['geo.figures.coder'],
        tags: {
            chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.REPERAGE],
            niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME]
        },
        instruction: "Code la figure : pose la MÊME marque sur les segments qui ont la même longueur, et le petit carré sur les angles droits. Glisse un symbole depuis la palette, ou touche directement un segment — la marque défile alors : un trait, deux traits, trois traits, la croix, rien. Les diagonales comptent pour deux segments chacune, coupés au point O. Commence par faire le tour des côtés, puis compare les deux diagonales entre elles, et finis par les angles. Attention : une marque n'est pas une décoration, elle AFFIRME une égalité — deux segments de longueurs différentes ne peuvent pas porter la même."
    },
    {
        // LE LABYRINTHE DES NOMBRES. La seconde image envoyée par Rémy : la
        // couverture d'un recueil de « number mazes ».
        //
        // Le nombre d'une case n'est pas une étiquette, c'est un ORDRE : sur
        // un 3, on saute de trois cases. Les murs n'existent pas — ce qui
        // bloque, c'est l'arithmétique. Une case portant 4 au milieu d'une
        // grille de cinq est une impasse, non parce qu'on l'a fermée, mais
        // parce que quatre cases dans n'importe quelle direction tombent hors
        // du plateau. C'est ce qui le distingue des deux autres labyrinthes du
        // logiciel, où l'on bute sur des cloisons.
        id: 'geo-laby-nombres', title: 'Le labyrinthe des nombres',
        cree: '2026-08-24',
        activityId: 'laby-nombres',
        generatorId: 'logique.laby-nombres', printable: 'laby-nombres',
        params: { taille: 'moyen', montrerSauts: true },
        paramSchema: [
            {
                id: 'taille', type: 'select', label: 'La grille',
                aide: 'Plus la grille est grande, plus les sauts sont longs et plus il faut anticiper : un saut mène vite dans un coin d\'où plus rien ne part.',
                options: [
                    { value: 'petit', label: '5 × 5 — pour découvrir' },
                    { value: 'moyen', label: '6 × 6 — la taille habituelle' },
                    { value: 'grand', label: '7 × 7 — il faut anticiper' },
                    { value: 'geant', label: '8 × 8 — pour ceux qui aiment ça' }
                ],
                default: 'moyen'
            },
            {
                id: 'montrerSauts', type: 'checkbox', label: 'Montrer les sauts possibles',
                // Rien ne s'éclaire en vert sur une photocopie : c'est une aide
                // de l'écran, et l'aide ci-dessous le dit déjà.
                papier: false,
                aide: 'Les quatre cases atteignables depuis la case courante s\'éclairent en vert. Au début, cela APPREND à compter juste ; ensuite c\'est une béquille, et le labyrinthe redevient celui du livre une fois décoché. Le bouton de la barre le bascule aussi en cours de partie.',
                default: true
            }
        ],
        skills: ['geo.espace.reperage'],
        tags: { chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.ESPACE], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Le nombre écrit dans ta case dit DE COMBIEN DE CASES tu sautes : sur un 3, tu sautes de trois cases. Tu choisis la direction — haut, bas, gauche ou droite — mais pas la distance, et jamais la diagonale. Touche la case où tu veux atterrir ; si ce n'est pas un saut valable, le logiciel te dit pourquoi. Le but est l'étoile. L'erreur la plus fréquente est de compter la case où l'on est : la première case comptée est celle juste à côté. Et méfie-toi des impasses — une case dont tous les sauts sortent de la grille ne mène nulle part."
    },
    {
        // LE CHEMIN NUMÉROTÉ. Le jeu de la capture d'écran envoyée par Rémy
        // (« Zip Master : Number Path Puzzle »). La règle tient en une phrase
        // et le raisonnement est réel : ce n'est pas un jeu de vitesse, c'est
        // un jeu de PLACE — il faut prévoir, revenir, et comprendre qu'une
        // case de coin n'a que deux voisines, donc que le chemin y est presque
        // toujours forcé.
        //
        // Même famille que « relier les points », et le même geste : on pose
        // le doigt et l'on glisse. Un élève qui sait jouer à l'un sait jouer à
        // l'autre sans qu'on lui explique.
        id: 'geo-chemin-numerote', title: 'Le chemin numéroté',
        cree: '2026-08-24',
        activityId: 'chemin-numerote',
        // La même grille à l'écran et sur la feuille : Rémy est parti d'un
        // LIVRE de labyrinthes de nombres, le papier est la forme d'origine.
        generatorId: 'logique.chemin', printable: 'chemin',
        params: { taille: 'moyen' },
        paramSchema: [
            {
                id: 'taille', type: 'select', label: 'La grille',
                aide: 'En 4 × 4, le chemin se voit presque d\'un coup d\'œil ; en 7 × 7, il faut vraiment commencer par les coins et compter les voisines. Plus la grille est grande, plus il y a de nombres pour guider — mais aussi plus de cases à ne pas oublier.',
                options: [
                    { value: 'petit', label: '4 × 4 — pour découvrir' },
                    { value: 'moyen', label: '5 × 5 — la taille habituelle' },
                    { value: 'grand', label: '6 × 6 — il faut prévoir' },
                    { value: 'geant', label: '7 × 7 — pour ceux qui aiment ça' }
                ],
                default: 'moyen'
            }
        ],
        skills: ['geo.espace.reperage'],
        tags: { chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.ESPACE], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Trace UN SEUL chemin qui part du 1, passe par 2, 3, 4… dans l'ordre, et remplit TOUTES les cases. Pose le doigt sur le 1 et glisse : le chemin suit les cases, sans diagonale. Pour effacer, reviens en arrière ; pour couper, touche une case du milieu de ton chemin. La règle qu'on oublie est la seconde : il ne doit rester aucune case en dehors du chemin. Commence par regarder les COINS — un coin n'a que deux voisines, donc si le chemin ne le prend pas en passant, il ne pourra plus jamais y aller."
    },
    {
        // RELIER SANS CROISER. Rémy : « j'aime bien aussi ce genre d'exercice,
        // où il faut relier sans croiser et sans sortir ni passer sur le
        // carré », avec une image : un cadre, six carrés étiquetés A, B, C —
        // deux de chaque — et rien d'autre.
        //
        // CE N'EST PAS « RELIER LES POINTS » EN PLUS PETIT. Là-bas on avance de
        // case en case et il faut REMPLIR toute la grille ; ici on trace à main
        // levée, il n'y a pas de grille, et le troisième interdit change tout :
        // un carré est un OBSTACLE, pas une étiquette, et il bouche des
        // passages qu'on croyait libres.
        //
        // CE QUE ÇA TRAVAILLE. Rien de numérique : anticiper, se représenter
        // l'espace, comprendre qu'un trait posé DIVISE le cadre en deux régions
        // et que ce qui est d'un côté ne rejoindra plus jamais l'autre. C'est
        // le raisonnement du théorème de Jordan, dix ans avant de le
        // rencontrer.
        //
        // UNE FIGURE PROPOSÉE EST RÉSOLUBLE ET N'EST PAS TRIVIALE — et les deux
        // ensemble ont demandé de refaire le générateur. Tracer des chemins
        // séparés puis poser les carrés à leurs bouts garantissait la solution
        // mais donnait des figures nulles : mesuré, zéro croisement sur
        // quatre-vingts figures, chaque paire dans son coin. On pose donc les
        // carrés d'abord, on les apparie au hasard — c'est cela qui les
        // entrelace — et l'on CHERCHE un routage sans croisement.
        id: 'geo-sans-croiser', title: 'Relier sans Croiser',
        cree: '2026-09-01',
        activityId: 'sans-croiser',
        // SUR LE PAPIER AUSSI, et c'est sa forme d'origine : un cadre, des
        // carrés, on trace au crayon et l'on gomme.
        printable: 'sans-croiser', printGeneratorId: 'logique.sans-croiser',
        consignePapier: 'Relie chaque lettre à sa jumelle sans croiser, sans sortir, sans passer sur un carré.',
        sansRevision: true,
        skills: ['geo.espace.reperage'],
        params: { palier: 'moyen' },
        paramSchema: [
            {
                id: 'palier', type: 'select', label: 'La difficulté', default: 'moyen',
                aide: 'Ce n\'est pas le nombre de paires qui compte, c\'est leur ENTRELACEMENT : '
                    + 'le générateur ne garde que les figures où relier à la règle échoue quelque '
                    + 'part. Deux paires bien enchevêtrées valent trois paires posées côte à côte.',
                options: [
                    { value: 'facile', label: '3 paires — pour comprendre la règle' },
                    { value: 'moyen', label: '4 paires — comme sur la fiche, en plus dense' },
                    { value: 'difficile', label: '5 paires — il faut vraiment prévoir' },
                    { value: 'expert', label: '6 paires — le cadre est plein' }
                ]
            }
        ],
        motsClefs: ['relier', 'croiser', 'traits', 'obstacle', 'topologie', 'logique', 'espace'],
        tags: { chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.ESPACE], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME, TAGS.NIVEAU.QUATRIEME] },
        instruction: "Relie chaque lettre à sa jumelle. Trois interdits : les traits ne se croisent jamais (ni entre eux, ni eux-mêmes), ils ne sortent pas du cadre, et ils ne passent pas sur un carré — pas même sur les tiens, sauf pour en partir et y arriver. C'est ce troisième qu'on oublie : un carré n'est pas une étiquette posée là, c'est un obstacle. Regarde bien AVANT de tracer, parce qu'un trait posé coupe le cadre en deux : tout ce qui est d'un côté ne pourra plus jamais rejoindre l'autre. Commence par la paire qui a le MOINS de chemins possibles — souvent celle qui est coincée dans un coin ou derrière un carré — et pas par la plus proche. Si un trait te gêne, touche-le : il s'efface."
    },
    {
        // RELIER LES POINTS. Le jeu de liens, avec sa règle complète : les
        // chemins ne se croisent pas ET aucune case ne reste vide. C'est la
        // seconde moitié qui fait le raisonnement — relier deux points est
        // facile, les relier de façon que tous les autres puissent encore
        // passer ne l'est pas. La grille est tirée d'un chemin qui couvre
        // déjà toute la surface : elle est donc résoluble par construction.
        id: 'geo-relier-points', title: 'Relie les points',
        cree: '2026-08-14',
        activityId: 'relier',
        // La même grille sert à l'écran et sur le papier : le générateur la
        // fabrique, l'activité la joue, le rendu l'imprime.
        generatorId: 'logique.relier', printable: 'relier',
        params: { taille: 'moyen', marques: 'les-deux' },
        paramSchema: [
            {
                id: 'taille', type: 'select', label: 'La grille',
                aide: 'Plus la grille est grande, plus les chemins doivent se céder la place. En 5×5 à trois paires, on voit la solution ; en 8×8 à six paires, il faut vraiment commencer par les coins.',
                options: [
                    { value: 'petit', label: '5 × 5 — trois paires' },
                    { value: 'moyen', label: '6 × 6 — quatre paires' },
                    { value: 'grand', label: '7 × 7 — cinq paires' },
                    { value: 'geant', label: '8 × 8 — six paires' }
                ],
                default: 'moyen'
            },
            {
                id: 'marques', type: 'select', label: 'Comment les paires se distinguent',
                // « Symboles seuls » EST le polycopié, comme l'explique l'aide :
                // la feuille imprimée porte toujours les symboles, et le choix
                // ne concerne donc que l'écran.
                papier: false,
                aide: 'La couleur seule exclut les élèves qui distinguent mal le rouge du vert — et disparaît sur une photocopie. Les symboles marchent partout. « Couleurs + symboles » convient à tout le monde ; « symboles seuls » donne à l\'écran ce que donnera le polycopié en noir et blanc.',
                options: [
                    { value: 'les-deux', label: 'Couleurs et symboles' },
                    { value: 'couleurs', label: 'Couleurs seules' },
                    { value: 'symboles', label: 'Symboles seuls' }
                ],
                default: 'les-deux'
            }
        ],
        skills: ['geo.espace.reperage'],
        tags: { chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.ESPACE], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Relie les deux points qui portent la m\u00eame marque par un chemin qui suit les cases, sans diagonale. Pose le doigt sur un point et glisse ; pour effacer, reviens en arri\u00e8re ou touche le milieu d'un chemin. Deux r\u00e8gles, et c'est la seconde qui fait chercher : les chemins ne se croisent JAMAIS, et \u00e0 la fin il ne doit rester AUCUNE case vide. Commence par les coins : un coin n'a que deux voisines, le chemin qui y passe est donc presque toujours oblig\u00e9."
    },
    {
        // COMBIEN DE CUBES ? Rémy : « j'aimerais un exercice de comptage de
        // cube ». C'est l'exercice où l'on apprend qu'un dessin CACHE : on voit
        // dix cubes, il y en a seize, parce que six sont derrière et dessous.
        //
        // Et c'est la première rencontre honnête avec le volume. L'élève qui a
        // compté une fois un pavé plein colonne par colonne, puis vu que
        // 4 × 3 × 3 donnait le même nombre, n'apprendra pas L × p × h comme une
        // formule tombée du ciel : il l'aura vérifiée.
        id: 'geo-cubes-compter', cree: '2026-08-25',
        title: 'Combien de Cubes ?',
        generatorId: 'geo.cubes', activityId: 'numpad',
        printable: 'cubes',
        consignePapier: 'Compte les cubes de chaque empilement. Attention : certains cubes '
            + 'sont cachés derrière ou dessous — ils comptent aussi.',
        params: { taille: 'moyen', formes: ['pave', 'couche', 'escalier', 'creux'], question: 'total' },
        skills: ['geo.espace.cubes'],
        motsClefs: ['cubes', 'empilement', 'compter', 'dénombrer', 'volume', 'pavé',
            'perspective', 'cachés', 'solide'],
        tags: {
            chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.ESPACE],
            niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME]
        },
        instruction: 'Ne compte pas les cubes un par un : compte les COLONNES. Chaque case du '
            + 'sol porte une pile ; additionne les hauteurs et rien ne t\'échappe. Si c\'est un '
            + 'pavé plein, c\'est encore plus court : longueur × profondeur × hauteur.'
    },
    {
        // DÉNOMBRER SUR UN SOLIDE. L'exercice a l'air simple et ne l'est pas :
        // sur une perspective cavalière, une partie du solide est derrière, et
        // l'élève qui compte ce qu'il voit trouve toujours trop peu. Le jeu
        // donne le geste qui manque sur le papier — toucher ce qu'on compte —
        // et la correction montre CE QU'ON A OUBLIÉ plutôt que d'annoncer un
        // nombre.
        id: 'geo-solides-denombrer', cree: '2026-08-13',
        revisions: [{
            date: '2026-08-19',
            quoi: 'Les aides s\'effacent en deux temps : le numéro sur la marque après trois '
                + 'réussites, puis la marque elle-même après six — on compte alors des yeux, '
                + 'comme sur une feuille.'
        }],
        title: 'Compter sur un solide',
        activityId: 'solides',
        // Sur le papier, on compte au crayon et l'on écrit trois nombres dans
        // un tableau : c'est l'exercice que l'écran ne sait pas donner, où le
        // compte s'efface avec la marque.
        generatorId: 'geo.solides', printable: 'solides',
        params: { niveau: 'tous', aspect: 'tous', numeros: 'progressif', marques: 'progressif', facesColorees: true },
        paramSchema: [
            {
                id: 'niveau', type: 'select', label: 'Les solides proposés',
                aide: 'Les solides usuels d\'abord — cube, pavé, prisme triangulaire, pyramide. Les bases à cinq et six côtés obligent à raisonner par familles plutôt qu\'à retenir des nombres ; l\'octaèdre, lui, ne se range dans aucune des deux et force à vraiment regarder le dessin.',
                options: [
                    { value: 'facile', label: 'Les solides usuels' },
                    { value: 'moyen', label: 'Jusqu\'aux bases pentagonales' },
                    { value: 'tous', label: 'Tous, octaèdre compris' }
                ],
                default: 'tous'
            },
            {
                id: 'aspect', type: 'select', label: 'Ce qu\'on demande de compter',
                // LA FEUILLE DEMANDE TOUJOURS LES TROIS, dans un tableau : c'est
                // justement l'exercice que l'écran ne sait pas donner, celui où
                // le compte s'efface avec la marque. Le choix reste à l'écran.
                papier: false,
                aide: 'On ne demande jamais les trois d\'un coup : l\'élève qui se trompe saurait seulement qu\'il s\'est trompé quelque part, et la correction ne pourrait plus rien montrer. Fixer une seule catégorie sert à travailler un point précis — les arêtes sont les plus difficiles, parce que ce sont elles qu\'on oublie derrière.',
                options: [
                    { value: 'tous', label: 'Les trois, en alternance' },
                    { value: 'sommets', label: 'Les sommets seulement' },
                    { value: 'aretes', label: 'Les arêtes seulement' },
                    { value: 'faces', label: 'Les faces seulement' }
                ],
                default: 'tous'
            },
            {
                id: 'numeros', type: 'select', label: 'Le numéro sur chaque marque',
                papier: false,
                aide: 'Le numéro qui s\'inscrit sur la marque fait la moitié du travail : l\'élève LIT son total au lieu de le compter. Il sert à installer la méthode — marquer une par une, ne pas repasser — puis il gêne. Par défaut, il disparaît après trois questions réussies.',
                options: [
                    { value: 'progressif', label: 'Il disparaît après 3 réussites' },
                    { value: 'toujours', label: 'Toujours affiché' },
                    { value: 'jamais', label: 'Jamais affiché' }
                ],
                default: 'progressif'
            },
            {
                id: 'marques', type: 'select', label: 'Marquer ce qu\'on compte',
                // « sur le papier, il n'y aura ni marque ni compteur » — l'aide
                // le disait déjà ; le réglage le dit maintenant au programme.
                papier: false,
                aide: 'Marquer une par une installe la méthode — n\'oublier personne, ne compter personne deux fois. Mais tant qu\'on marque, la machine additionne à notre place ; sur le papier, il n\'y aura ni marque ni compteur. Par défaut, les marques disparaissent après six réussites, et l\'on compte des yeux.',
                options: [
                    { value: 'progressif', label: 'Elles disparaissent après 6 réussites' },
                    { value: 'toujours', label: 'Toujours possibles' },
                    { value: 'jamais', label: 'Jamais — on compte des yeux' }
                ],
                default: 'progressif'
            },
            {
                id: 'facesColorees', type: 'checkbox', label: 'Colorer les faces comptées',
                papier: false,
                aide: 'Une face comptée se remplit d\'un vert transparent au lieu de porter une simple pastille : on voit d\'un coup d\'œil celles qui restent, et les arêtes continuent de se lire dessous.',
                default: true
            }
        ],
        skills: ['geo.espace.denombrer'],
        tags: { chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.ESPACE], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Le solide est dessiné en perspective cavali\u00e8re : les traits en POINTILL\u00c9S sont les ar\u00eates de derri\u00e8re, celles qu'on ne voit pas mais qui existent. Touche ce qu'on te demande de compter, une par une : chaque marque porte son num\u00e9ro, tu ne comptes donc jamais deux fois la m\u00eame et tu vois ce qu'il te reste \u00e0 prendre. \u00c9cris ensuite ton total. Si tu te trompes, ce que tu as oubli\u00e9 se met \u00e0 clignoter. Et pour v\u00e9rifier tout seul : sommets \u2212 ar\u00eates + faces = 2, toujours."
    },
    {
        // LE RENVERSEMENT : on n'écrit pas le programme, on l'EXÉCUTE. Un élève
        // qui empile des blocs jusqu'à ce que « ça marche » peut réussir sans
        // avoir jamais compris ce que fait la machine. Du côté de la machine,
        // trois choses deviennent inévitables : il y a un endroit du programme
        // où l'on se trouve, la boucle y REMONTE, et la gauche est celle du
        // robot.
        id: 'geo-automate', status: STATUS.TEST, title: 'L\'Automate',
        cree: '2026-08-11',
        activityId: 'automate',
        params: { niveau: 'moyen', mode: 'progressif' },
        paramSchema: [
            {
                id: 'niveau', type: 'select', label: 'Le programme',
                aide: 'Ce qu\'il y a dans le programme. La boucle apparaît au niveau moyen : c\'est elle qui fait tout l\'intérêt, et toute la difficulté. Ce réglage est IGNORÉ en mode progressif, où chaque étape apporte sa forme de programme.',
                options: [
                    { value: 'decouverte', label: 'Deux ou trois blocs, sans boucle' },
                    { value: 'facile', label: 'Sans boucle — 3 ou 4 blocs' },
                    { value: 'poser', label: 'Sans boucle, avec des pastilles à poser' },
                    { value: 'boucleSimple', label: 'Une boucle, et rien d\'autre' },
                    { value: 'moyen', label: 'Une boucle de 2 blocs' },
                    { value: 'long', label: 'Une boucle de 3 blocs, programme long' },
                    { value: 'difficile', label: 'Une boucle de 3 blocs, grande grille' },
                    { value: 'deuxBoucles', label: 'DEUX boucles dans le même programme' }
                ],
                default: 'moyen'
            },
            {
                id: 'mode', type: 'select', label: 'Comment on exécute',
                aide: 'Le surligneur montre où en est le programme. Le retirer, c\'est demander à l\'élève de tenir lui-même le compte des tours — c\'est là que la boucle devient une vraie notion. La prédiction, elle, demande de tout dérouler dans sa tête. En mode progressif, le jeu retire les aides lui-même, une par une, en annonçant chaque changement.',
                options: [
                    { value: 'progressif', label: 'Progressif — sept étapes, annoncées' },
                    { value: 'guide', label: 'Guidé — le bloc en cours s\'allume' },
                    { value: 'seul', label: 'Sans surligneur — je suis le fil moi-même' },
                    { value: 'arrivee', label: 'Prédiction — je dis seulement où il arrive' }
                ],
                default: 'progressif'
            }
        ],
        skills: ['geo.espace.programme'],
        tags: { chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.ESPACE], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Le programme est déjà écrit : c'est toi l'ordinateur. Exécute-le bloc après bloc. Pour « avancer de 3 », touche la case où le robot arrive — trois cases droit devant LUI, pas devant toi. Pour tourner, utilise les boutons (ou les flèches du clavier). Le bloc allumé dit où on en est dans le programme : quand la boucle arrive au bout de son corps, il REMONTE, et le compteur passe au tour suivant. C'est ça, répéter."
    },
    {
        // LES DÉDALES DE FORME. Un labyrinthe PARFAIT — un seul chemin entre
        // deux cases — creusé dans un cœur, une étoile, un rond. Se déplacer
        // dans un plan sans le voir d'en haut, c'est la compétence ; la forme,
        // elle, est là pour qu'on ait envie de la traverser.
        id: 'geo-dedale-forme', title: 'Les Dédales',
        cree: '2026-08-14',
        activityId: 'dedale',
        // SUR LE PAPIER : le dédale imprimé, à parcourir au crayon. C'est
        // l'exercice d'origine — l'écran n'y ajoutait que le fil qui se
        // rembobine.
        printable: 'dedale', printGeneratorId: 'geo.dedale-fiche',
        // `taille: 15` datait d'un schéma où c'était un nombre de cases ; le
        // réglage est devenu un choix ('petit', 'moyen', 'grand') et personne
        // ne comprenait plus 15. `forme`, lui, se règle à l'écran : depuis que
        // le panneau du professeur l'emporte, le répéter ici ne servirait qu'à
        // le figer une fois sur deux.
        printParams: {},
        consignePapier: 'Va du rond au carré sans traverser de mur.',
        sansRevision: true,
        skills: ['geo.espace.deplacement'],
        params: { mode: 'forme', forme: '', taille: 'moyen', trace: 'fil' },
        paramSchema: [
            {
                id: 'forme', type: 'select', label: 'Forme du dédale',
                options: [
                    { value: '', label: 'Au hasard, une forme différente à chaque fois' },
                    { value: 'rectangle', label: 'Rectangle' },
                    { value: 'rond', label: 'Rond' },
                    { value: 'coeur', label: 'Cœur' },
                    { value: 'losange', label: 'Losange' },
                    { value: 'croix', label: 'Croix' },
                    { value: 'etoile', label: 'Étoile' }
                ],
                default: ''
            },
            {
                id: 'taille', type: 'select', label: 'Taille',
                aide: 'Le départ et l\'arrivée sont toujours les deux cases LES PLUS ÉLOIGNÉES du dédale : une grande grille est vraiment plus longue, pas seulement plus large.',
                options: [
                    { value: 'petit', label: '11 × 11 — pour commencer' },
                    { value: 'moyen', label: '15 × 15' },
                    { value: 'grand', label: '21 × 21 — long' }
                ],
                default: 'moyen'
            },
            {
                id: 'trace', type: 'select', label: 'La trace laissée derrière soi',
                aide: 'Le fil se rembobine quand on revient sur ses pas : il ne montre donc que la route qu\'on garde. Tout garder aide à ne pas tourner en rond ; ne rien laisser oblige à retenir où l\'on est passé.',
                options: [
                    { value: 'fil', label: 'Le fil d\'Ariane — il se rembobine' },
                    { value: 'tout', label: 'Tout ce que j\'ai exploré reste marqué' },
                    { value: 'rien', label: 'Aucune trace' }
                ],
                default: 'fil'
            }
        ],
        tags: { chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.ESPACE], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME] },
        instruction: "Va du rond vert à l'étoile. Flèches du clavier, croix tactile, ou promène ton doigt sur le dédale — on ne traverse jamais un mur. Entre deux cases il n'existe qu'un seul chemin : si tu tournes en rond, c'est que tu es dans une impasse, et il faut revenir. Le fil rose derrière toi se rembobine quand tu reviens sur tes pas : ce qui reste tracé est toujours la route que tu tiens."
    },
    {
        // MAT EN UN, MAT EN DEUX. Un problème d'échecs, ce n'est pas jouer :
        // c'est CHERCHER, dans une position figée, le coup qui ne laisse aucune
        // issue. On y raisonne exactement comme sur une figure — j'énumère les
        // cases, j'élimine celles qui sont couvertes, je conclus — et l'on
        // vérifie une propriété (« aucun coup légal ET en échec ») au lieu de
        // deviner.
        //
        // Chaque position est passée au solveur par les tests : une solution,
        // et une seule. Un problème à deux solutions donnerait tort à l'élève
        // qui trouve l'autre.
        id: 'geo-mat-echecs', title: 'Échecs : mat en un, mat en deux',
        cree: '2026-08-14',
        // C'EST LE JEU D'ÉCHECS LUI-MÊME, en mode exercice. Un second écran
        // aurait redemandé à l'élève d'apprendre un damier, des pièces et des
        // gestes qu'il connaît déjà — et il aurait fallu les tenir à jour deux
        // fois.
        activityId: 'echecs',
        // Sur le papier, c'est le MÊME problème, en plus exigeant : devant
        // l'écran on essaie et l'on voit ; sur la feuille il faut tout prévoir
        // avant d'écrire le coup.
        generatorId: 'logi.mat-fiche', printable: 'mat',
        consignePapier: 'Les Blancs jouent et matent. Écris le coup en notation.',
        sansRevision: true,
        skills: ['geo.espace.reperage'],
        params: { mode: 'exercice', depart: 'debut', niveau: 'moyen' },
        paramSchema: [
            {
                id: 'depart', type: 'select', label: 'Où commencer',
                aide: 'La progression est dans le MATÉRIEL : on commence par une dame qui fait tout le travail, on passe aux tours qui ont besoin du roi, et l\'on finit par deux tours à coordonner en deux coups. Cent neuf positions, toutes vérifiées : une solution, et une seule.',
                options: [
                    { value: 'debut', label: 'Au début — la dame qui mate seule' },
                    { value: 'milieu', label: 'Plus loin — tours et cavaliers' },
                    { value: 'deux', label: 'Directement aux mats en deux coups' }
                ],
                default: 'debut'
            }
        ],
        tags: { chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.ESPACE], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Les Blancs jouent et matent. Clique une pièce blanche : ses cases d'arrivée s'allument, un point pour une case vide, un anneau pour une prise. Un mat, c'est un échec dont le roi ne peut pas sortir — ni FUIR, ni PARER en s'interposant, ni PRENDRE la pièce qui attaque. Quand ton coup n'est pas le bon, on ne te donne pas la réponse : on te dit ce qui manque, par exemple « le roi s'échappe en g7 ». Attention au PAT : les Noirs sans coup mais SANS être en échec, c'est une partie nulle, pas une victoire."
    },
    {
        // LE THÉORÈME DE THALÈS. Rémy : « Un exercice sur le théorème de
        // Thalès. »
        //
        // MÊME PRINCIPE QUE PYTHAGORE, ET POUR LA MÊME RAISON : on ne commence
        // pas par le calcul. La faute ordinaire de quatrième n'est pas une
        // erreur de calcul, c'est un APPARIEMENT — on écrit AD/DC au lieu de
        // AD/AC, le petit morceau sur le RESTE au lieu du TOUT. Le produit en
        // croix qui suit tombe alors parfaitement juste sur une égalité
        // fausse, et rien ne prévient l'élève. D'où l'ordre : reconnaître la
        // configuration, choisir l'égalité, calculer, puis la réciproque.
        //
        // LA FIGURE N'EST PAS À L'ÉCHELLE, et c'est ce que font tous les
        // manuels : une figure à l'échelle se mesure à la règle, et l'élève
        // cesse d'appliquer le théorème. Seul le rapport est respecté.
        id: 'geo-thales', status: STATUS.TEST, title: 'Le Théorème de Thalès',
        cree: '2026-08-25',
        generatorId: 'geo.thales', activityId: 'buttons',
        // LA FICHE PORTE LA FIGURE : sans elle, « quelle est la configuration
        // de cette figure ? » n'est pas une question, c'est une devinette.
        printable: 'thales', sansRevision: true,
        skills: ['geo.thales'],
        params: { etape: 'progressif', config: 'melange' },
        motsClefs: ['thalès', 'thales', 'triangles emboîtés', 'papillon', 'rapports',
            'proportionnalité', 'parallèles', 'réciproque', 'longueur manquante',
            'agrandissement', 'réduction'],
        tags: {
            chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.PERIMETRE_AIRE],
            niveaux: [TAGS.NIVEAU.QUATRIEME, TAGS.NIVEAU.TROISIEME]
        },
        instruction: "Trois marches, dans l'ordre, et l'on monte tout seul toutes les trois questions. UNE : écrire l'égalité, et c'est la marche qui compte. AD/AC = AE/AB = DE/BC. Chaque petit segment se compare au segment ENTIER qui le contient — AD avec AC, jamais avec DC. C'est LÀ qu'on se trompe, et le calcul qui suit ne le rattrapera pas : il tombera parfaitement juste sur une égalité fausse. DEUX : calculer, par produit en croix. TROIS : la réciproque, qui est une autre question — on ne part plus de « les droites sont parallèles », on le DÉMONTRE en comparant AD/AC et AE/AB. Compare des fractions, pas des valeurs arrondies : 1/3 n'est pas 0,33, et un arrondi déclarerait parallèle ce qui ne l'est pas. La figure prend deux formes — triangles emboîtés quand A est en dehors des deux parallèles, papillon quand il est entre les deux —, mais le théorème s'y écrit pareil : un seul signe les sépare, et il n'y a rien à reconnaître de plus."
    },

    {
        // THALÈS : LA RÉDACTION — un exercice à part, et Rémy l'a demandé deux
        // fois. « On va rédiger en 3 parties dans la progression de
        // l'exercice », puis « tu n'as toujours pas fait l'exercice de
        // rédaction ». Il en avait donné le plan ligne à ligne, jusqu'au
        // « (on remplace par les valeurs <- ne le note pas) » et au
        // « calculatrice autorisée ».
        //
        // POURQUOI UN EXERCICE SÉPARÉ, et non une marche de plus. Les trois
        // marches du Théorème de Thalès sont des QUESTIONS : une figure, une
        // réponse, on passe à la suivante. Rédiger n'est pas une question,
        // c'est une page qu'on remplit de haut en bas et dont chaque partie
        // dépend de la précédente. Les deux formes ne tiennent pas dans le
        // même moule, et forcer la seconde dans le premier aurait donné quatre
        // questions sans rapport apparent au lieu d'une démonstration.
        id: 'geo-thales-redaction', status: STATUS.TEST,
        title: 'Thalès : la Rédaction', cree: '2026-09-01',
        activityId: 'thales-redaction', sansRevision: true,
        // LA FICHE PAPIER A SON PROPRE GÉNÉRATEUR. Rémy : « et pour
        // l'impression, il faut aussi proposer un exercice de rédaction ».
        //
        // À l'écran l'élève CHOISIT ses hypothèses parmi six et POSE des
        // étiquettes pour écrire l'égalité : la machine l'empêche d'écrire une
        // bêtise et lui explique chaque refus. C'est un échafaudage, fait pour
        // être retiré. Sur la feuille il n'y a plus que trois cadres et des
        // lignes — c'est ce qui l'attend au contrôle, et le seul endroit où
        // l'on vérifie qu'il sait encore le faire seul.
        printGeneratorId: 'geo.thales.redaction.fiche',
        printable: 'thales-redaction',
        skills: ['geo.thales'],
        params: { config: 'melange' },
        paramSchema: [
            {
                id: 'config', type: 'select', label: 'Configuration', default: 'melange',
                aide: 'Le papillon est le même théorème avec le point A entre les deux '
                    + 'parallèles. La rédaction y est mot pour mot la même — et c\'est '
                    + 'justement ce qu\'il faut voir.',
                options: [
                    { value: 'melange', label: 'Les deux, mélangées' },
                    { value: 'emboites', label: 'Triangles emboîtés seulement' },
                    { value: 'papillon', label: 'Papillon seulement' }
                ]
            }
        ],
        // LA CALCULATRICE EST AUTORISÉE : Rémy l'a écrit. La dernière ligne est
        // une division, et ce n'est pas elle qu'on évalue.
        calculatrice: true,
        motsClefs: ['thalès', 'thales', 'rédaction', 'démonstration', 'je sais que',
            'produit en croix', 'justifier', 'rédiger', 'parallèles'],
        tags: {
            chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.PERIMETRE_AIRE],
            niveaux: [TAGS.NIVEAU.QUATRIEME, TAGS.NIVEAU.TROISIEME]
        },
        instruction: "On ne cherche pas seulement le nombre, on écrit la DÉMONSTRATION, en trois parties — c'est elle qui rapporte les points sur une copie. JE SAIS QUE : ce qui vient de l'énoncé, et rien d'autre. Thalès n'exige que deux choses : deux droites sécantes en A, et deux droites parallèles. Une hypothèse vraie mais inutile n'a pas sa place. OR : ce qui vient du cours. Tu écris toi-même l'égalité des trois rapports, chaque petit segment sur le segment ENTIER qui le contient — AD avec AC, jamais avec DC. DONC : ce que tu en déduis. On isole l'inconnue par le produit en croix, on pose le calcul, on conclut avec l'unité. La ligne où l'on remplace par les valeurs ne se recopie pas : c'est un geste de tête, pas une ligne de copie. La calculatrice est autorisée."
    },

    // --- Trigonométrie : repérer les côtés ---
    // Rémy : « On va commencer un exercice sur la trigonométrie où il faut
    // repérer le côté adjacent, l'opposé et l'hypoténuse ».
    //
    // « COMMENCER » EST LE MOT. Avant sinus, cosinus et tangente, avant la
    // moindre formule, il y a un travail de LECTURE : sur cette figure-là,
    // quel côté porte quel nom. Un élève qui se trompe de côté applique une
    // formule juste à des longueurs fausses, et rien dans son calcul ne le
    // prévient — la calculatrice rend un nombre, l'angle est plausible, la
    // copie est fausse. C'est pour cela que ce repérage mérite un exercice à
    // lui seul, et pas trois lignes d'introduction au chapitre suivant.
    {
        id: 'geo-trigo-cotes', status: STATUS.TEST,
        title: 'Hypoténuse, Opposé, Adjacent',
        // LA FEUILLE N'EST PAS L'ÉCRAN. À l'écran on CLIQUE le côté ; sur le
        // papier on l'ÉCRIT — le premier palier n'a pas de traduction papier,
        // et la fiche part donc du second. Voir generators/trigoCotes.js.
        printGeneratorId: 'geo.trigo.cotes',
        printable: 'trigo-cotes',
        cree: '2026-09-02',
        activityId: 'trigo-cotes',
        // PAS DE RÉVISION ESPACÉE : ce n'est pas un fait à retenir, c'est une
        // lecture à refaire à chaque figure. On le reverra dans le chapitre
        // qui s'en sert, pas dans une pile de rappels.
        sansRevision: true,
        skills: ['geo.trigo.cotes'],
        params: { palier: 'reperer', tourner: true },
        paramSchema: [
            {
                // TROIS PALIERS, LE MÊME TRIANGLE. Rémy : « tu peux aussi poser
                // une question quel est le côté opposé à G […] et il peut aussi
                // l'écrire avec les crochets. On pourrait y inclure l'écriture
                // des formules, en aidant au départ. »
                id: 'palier', type: 'select', label: 'Ce qu\'on demande',
                default: 'reperer', echelle: true,
                aide: 'Montrer prouve qu\'on a LU la figure ; écrire prouve en plus '
                    + 'qu\'on sait NOMMER un segment par ses deux extrémités — et c\'est '
                    + 'cette écriture-là qui servira dans une formule. Le troisième palier '
                    + 'fait écrire cos, sin ou tan : le rapport est rappelé sur les deux '
                    + 'premières figures, puis il faut le savoir.',
                options: [
                    { value: 'reperer', label: 'Cliquer le côté sur la figure', court: 'Cliquer' },
                    { value: 'ecrire', label: 'Écrire le nom du côté — [AB]', court: 'Écrire' },
                    { value: 'formule', label: 'Écrire la formule — cos(G) = …', court: 'Formule' }
                ]
            },
            {
                id: 'tourner', type: 'boolean', label: 'Faire tourner la figure', default: true,
                aide: 'Un triangle toujours posé l\'angle droit en bas à gauche enseigne une '
                    + 'règle fausse — « adjacent = horizontal » — qui s\'effondre au premier '
                    + 'contrôle. On peut la figer le temps de la découverte, mais il faut la '
                    + 'faire tourner ensuite : c\'est là qu\'on vérifie que l\'élève lit la '
                    + 'figure et ne récite pas une position.'
            }
        ],
        motsClefs: ['trigonométrie', 'trigo', 'hypoténuse', 'opposé', 'adjacent',
            'triangle rectangle', 'côté', 'sinus', 'cosinus', 'tangente', 'sohcahtoa'],
        tags: {
            chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.REPERAGE],
            niveaux: [TAGS.NIVEAU.QUATRIEME, TAGS.NIVEAU.TROISIEME]
        },
        instruction: "Trois côtés, trois noms, et un ordre pour les trouver. COMMENCE PAR L'HYPOTÉNUSE : c'est le côté en face de l'ANGLE DROIT, le plus long, et le seul qui ne change jamais de nom quel que soit l'angle qu'on regarde — c'est ton point d'appui. Les deux autres, eux, DÉPENDENT DE L'ANGLE marqué sur la figure. Le côté OPPOSÉ est celui qui ne le touche pas, celui d'en face. Le côté ADJACENT est celui qui le touche ET qui touche aussi l'angle droit. ATTENTION, C'EST LÀ QU'ON SE TROMPE : l'hypoténuse touche l'angle elle aussi, et « adjacent » veut dire « à côté de » — beaucoup la donnent donc pour adjacente. Un seul mot les sépare : l'adjacent touche AUSSI l'angle droit. Et la figure TOURNE d'une question à l'autre : « adjacent » n'est pas « horizontal ». Si tu apprends une position au lieu d'une définition, le premier triangle penché du contrôle te le fera payer. SELON LE RÉGLAGE, on te demandera de CLIQUER le côté, de l'ÉCRIRE — deux lettres, celles de ses extrémités, et les crochets si tu les connais : [AB] est le SEGMENT, (AB) la droite, AB la longueur — ou d'écrire la FORMULE. Pour la formule, deux gestes dans cet ordre, et ils se ratent séparément : d'abord LE RAPPORT (CAH SOH TOA : cosinus = adjacent sur hypoténuse, sinus = opposé sur hypoténuse, tangente = opposé sur adjacent), ensuite LA FIGURE (quel côté joue ce rôle pour l'angle marqué). Se tromper de rapport et se tromper de côté ne sont pas la même faute, et ne se rattrapent pas de la même façon."
    }
];
