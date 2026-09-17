// LES NOMS DE RANGEMENT S'ÉCRIVENT EN FRANÇAIS.
//
// « Calcul Mental », « Nombres Décimaux », « Priorités Opératoires » : c'est la
// capitale anglaise, celle des titres de journaux américains. Le français ne
// met la majuscule qu'au premier mot et aux noms propres — les programmes de
// collège écrivent « Calcul mental » et « Résolution de problèmes ». Une
// dizaine de rubriques sur vingt-trois étaient dans ce cas, ce qui donnait au
// catalogue deux orthographes pour une même sorte de chose.
//
// Les trois dernières rubriques ajoutées — « Casse-tête », « Stratégie et
// raisonnement », « Adresse et réflexes » — étaient déjà écrites ainsi : la
// règle n'est pas nouvelle, elle est simplement appliquée partout.
//
// LES TITRES D'EXERCICES NE SONT PAS CONCERNÉS : « Additions Mystères », « La
// Balance des Équations » sont des noms d'œuvres, pas des rubriques, et c'est
// leur auteur qui les orthographie.

export const TAGS = {
    DOMAINE: {
        // DEUX ADJECTIFS AU MILIEU DE TROIS GROUPES NOMINAUX.
        //
        // « Défis et énigmes », « Grandeurs et mesures », « Organisation de
        // données » nomment des CHOSES ; « Numérique » et « Géométrique »
        // qualifiaient un nom absent. Cinq rubriques de même rang, trois
        // grammaires — et l'œil qui parcourt la colonne bute sans savoir sur
        // quoi.
        //
        // On prend les mots des PROGRAMMES DE COLLÈGE, qui nomment ces deux
        // thèmes « Nombres et calculs » et « Espace et géométrie ». Ce ne sont
        // pas des synonymes choisis au hasard : c'est le vocabulaire que Rémy
        // écrit déjà dans ses progressions, et celui que les élèves voient sur
        // leurs manuels.
        NUMERIQUE: "Nombres et calculs",
        GEOMETRIQUE: "Espace et géométrie",
        GRANDEURS: "Grandeurs et mesures",
        DONNEES: "Organisation de données",
        // RÉMY : « j'aimerai ces deux jeux là en catégorie défi ou énigme ».
        // Un cinquième domaine, et il ne double aucun des quatre autres : la
        // tour de Brahma n'est ni du numérique ni de la géométrie, c'est un
        // problème qu'on résout — le raisonnement y est le sujet, pas l'outil.
        DEFIS: "Défis et énigmes"
    },
    SOUS_DOMAINE: {
        CALCUL_MENTAL: "Calcul mental",
        NUMERATION: "Numération",
        FRACTIONS: "Fractions",
        DECIMAUX: "Nombres décimaux",
        RELATIFS: "Nombres relatifs",
        // Le chapitre où le nombre laisse la place à la lettre. Rangé sous
        // « Calcul mental », il aurait disparu au milieu des tables — c'est
        // pourtant l'entrée en algèbre, et elle se travaille pour elle-même.
        LITTERAL: "Calcul littéral",
        REPERAGE: "Repérage",
        // La symétrie axiale ouvre la sixième, la centrale la cinquième, la
        // translation et la rotation la quatrième : quatre chapitres qui se
        // suivent d'une année sur l'autre et se répondent. Rangés sous
        // « Repérage », ils disparaissaient au milieu des coordonnées.
        TRANSFORMATIONS: "Transformations",
        ANGLES: "Angles",
        NOTATIONS: "Notations et vocabulaire",
        PRIORITES: "Priorités opératoires",
        LOGIQUE: "Logique",
        PERIMETRE_AIRE: "Périmètre et aire",
        ESPACE: "Géométrie dans l'espace",
        TABLEUR: "Tableur",
        DUREES: "Heures et durées",
        PROBLEMES: "Résolution de problèmes",
        // Les deux familles de défis, et elles ne se mélangent pas : un
        // casse-tête se cherche seul et se gagne en un nombre de coups, une
        // énigme se raconte et se démontre.
        CASSE_TETE: "Casse-tête",
        STRATEGIE: "Stratégie et raisonnement",
        // ET UNE TROISIÈME FAMILLE, QUI N'EST PAS DES MATHS DU TOUT. Rémy, sur
        // Les Petites Ailes : « n'en fais pas un jeu mathématiques […] c'est
        // plus un jeu de réflexe ». Le ranger sous « Calcul mental » était le
        // mensonge d'avant : il n'y a rien à calculer, il y a un geste à
        // sentir. Une récréation assumée se range à sa place plutôt que de se
        // déguiser en exercice.
        ADRESSE: "Adresse et réflexes"
    },
    // Le troisième niveau de chemin a été retiré : « Tables de Multiplication »
    // coupait le calcul mental en deux dans l'arbre, et l'on ne trouvait plus
    // les tables sous « Calcul mental ». C'est devenu un MOT-CLEF, qui se
    // cherche et ne range rien.
    NIVEAU: {
        CM2: "CM2",
        SIXIEME: "6ème",
        CINQUIEME: "5ème",
        QUATRIEME: "4ème",
        TROISIEME: "3ème"
    }
};
