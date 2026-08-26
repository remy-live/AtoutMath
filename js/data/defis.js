import { TAGS } from './tags.js';
import { STATUS } from './status.js';
// Les cinquante paliers du Pousseur viennent du noyau : ils y sont calculés,
// et les recopier ici serait la promesse d'une liste qui vieillit toute seule.
import { NIVEAUX_POUSSEUR } from '../core/pousseur.js';

// DOMAINE « DÉFIS ET ÉNIGMES ».
//
// Rémy, en montrant deux pages de son « Coin des jeux mathématiques » :
// « J'aimerai ces deux jeux là en catégorie défi ou énigme, je ne sais pas trop. »
//
// UN CINQUIÈME DOMAINE, ET IL NE DOUBLE AUCUN DES QUATRE AUTRES. La tour de
// Brahma n'est ni du numérique ni de la géométrie : le raisonnement y est le
// SUJET, pas l'outil. Rangée sous « calcul mental », elle aurait laissé croire
// qu'on y révise les additions ; sous « logique », qu'elle est un sudoku de
// plus. Elle n'est ni l'un ni l'autre — c'est un problème qu'on résout, et
// c'est exactement le rangement que Rémy cherchait sans le nommer.
//
// CE QU'ON Y ÉVALUE N'EST PAS UNE RÉPONSE, C'EST UN NOMBRE DE COUPS. Un défi ne
// se rate pas : on le finit, plus ou moins bien. D'où le minimum affiché en
// permanence, et l'écart à ce minimum — la seule note qui ait un sens ici.
//
// LES DEUX SONT DES JEUX À DÉCOUPER. C'est leur forme d'origine, celle de la
// revue : une feuille, un plateau, des pièces, un pointillé entre les deux.
// L'écran ne les remplace pas — il compte, il dit quand c'est perdu, et il
// montre l'idée. Le carton, lui, se manipule à deux sur une table.

export const defisExercises = [
    {
        // LA TOUR DE HANOÏ.
        //
        // Rémy : « Tu me fais les tours de Hanoï aussi en défi. » Elle y était
        // déjà — sous le nom de « Tour de Brahma », celui qu'Édouard Lucas lui
        // a donné en 1883 en l'accompagnant de sa légende des soixante-quatre
        // disques. C'est le même jeu, exactement, et j'avais choisi le nom
        // savant : personne ne la cherche sous celui-là. On l'appelle donc
        // comme tout le monde l'appelle, et Brahma reste en sous-titre, parce
        // que la légende vaut d'être racontée.
        //
        // C'EST LA PREMIÈRE RÉCURSION QU'UN ÉLÈVE RENCONTRE, et il la rencontre
        // avec les mains. Pour déplacer quatre boules, il faut d'abord déplacer
        // les trois du dessus ailleurs : le problème se ramène à lui-même, une
        // boule de moins. Et le compte suit — 1, 3, 7, 15, 31 —, le double plus
        // un à chaque fois. On ne lui demande pas de le démontrer ; on lui
        // demande de le CONSTATER, ce qui est déjà beaucoup.
        id: 'defi-tour-brahma', status: STATUS.TEST,
        title: 'La Tour de Hanoï (Tour de Brahma)',
        cree: '2026-08-25',
        activityId: 'tour-brahma', skills: ['defi.recursion'],
        sansRevision: true,
        printable: 'tourBrahma', printGeneratorId: 'defi.tour-brahma-fiche',
        printParams: { taille: 'quatre' },
        params: { taille: 'quatre' },
        paramSchema: [
            {
                id: 'taille', type: 'select', label: 'Nombre de boules',
                aide: 'Chaque boule ajoutée DOUBLE le travail, plus un coup : 7, 15, 31, 63. Trois boules se font de tête en une minute ; six demandent une méthode, et c\'est là que le défi commence.',
                options: [
                    { value: 'trois', label: '3 boules — 7 coups' },
                    { value: 'quatre', label: '4 boules — 15 coups' },
                    { value: 'cinq', label: '5 boules — 31 coups' },
                    { value: 'six', label: '6 boules — 63 coups' }
                ],
                default: 'quatre'
            }
        ],
        motsClefs: ['tour', 'brahma', 'hanoï', 'hanoi', 'boules', 'récursion', 'défi',
            'casse-tête', 'puissances de deux', 'lucas'],
        tags: {
            chemin: [TAGS.DOMAINE.DEFIS, TAGS.SOUS_DOMAINE.CASSE_TETE],
            niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME, TAGS.NIVEAU.QUATRIEME]
        },
        instruction: "Passe toutes les boules sur le conduit de DROITE. Touche un conduit pour prendre sa boule du dessus, puis un autre pour l'y poser. On ne déplace qu'une boule à la fois, et la seule règle est qu'une boule ne se pose jamais que sur une boule PLUS GROSSE. Ne cherche pas le premier coup : demande-toi ce qu'il faut AVANT de pouvoir déplacer la plus grosse — il faut que les autres soient ailleurs, et te voilà avec le même problème, une boule de moins. C'est cela qui fait doubler le compte à chaque boule ajoutée : 1, 3, 7, 15, 31. Le jeu affiche en permanence combien de coups il te reste au plus court : si ce nombre monte après ton coup, tu viens de faire un détour."
    },
    {
        // LES GRENOUILLES — le saut de grenouille, ou « Toads and Frogs ».
        //
        // UN CASSE-TÊTE SANS RETOUR EN ARRIÈRE, et c'est ce qui le rend
        // précieux : il ne se perd pas, il se BLOQUE. Deux grenouilles de la
        // même couleur l'une derrière l'autre et la partie est finie depuis le
        // troisième coup — sauf qu'il reste des coups possibles, et qu'on peut
        // s'acharner un quart d'heure sans le savoir. Apprendre à regarder ce
        // qu'un coup REND IMPOSSIBLE, et pas seulement ce qu'il fait gagner,
        // est une leçon qui ressert bien au-delà des grenouilles.
        id: 'defi-grenouilles', status: STATUS.TEST, title: 'Les Grenouilles',
        cree: '2026-08-25',
        activityId: 'grenouilles', skills: ['defi.grenouilles'],
        sansRevision: true,
        printable: 'grenouilles', printGeneratorId: 'defi.grenouilles-fiche',
        printParams: { taille: 'quatre' },
        params: { taille: 'quatre' },
        paramSchema: [
            {
                id: 'taille', type: 'select', label: 'Grenouilles de chaque couleur',
                aide: 'Le minimum vaut n² + 2n, et il se démontre : n × n sauts — un par croisement, puisque chaque verte doit dépasser chaque rouge — plus 2n glissades, une par grenouille. Deux contre deux : 8 coups. Quatre contre quatre : 24.',
                options: [
                    { value: 'deux', label: '2 contre 2 — 8 coups' },
                    { value: 'trois', label: '3 contre 3 — 15 coups' },
                    { value: 'quatre', label: '4 contre 4 — 24 coups' },
                    { value: 'cinq', label: '5 contre 5 — 35 coups' }
                ],
                default: 'quatre'
            }
        ],
        motsClefs: ['grenouilles', 'nénuphars', 'saut', 'échange', 'défi', 'casse-tête',
            'blocage', 'toads and frogs'],
        tags: {
            chemin: [TAGS.DOMAINE.DEFIS, TAGS.SOUS_DOMAINE.CASSE_TETE],
            niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME]
        },
        instruction: "Échange les grenouilles vertes et les rouges. Touche une grenouille : elle bouge toute seule, car elle n'a jamais qu'un seul coup possible — elle glisse sur le nénuphar voisin s'il est libre, ou elle saute par-dessus UNE grenouille. Les vertes ne vont qu'à droite, les rouges qu'à gauche, et on ne revient JAMAIS en arrière. C'est là tout le piège : le jeu ne se perd pas, il se bloque. Fais avancer deux grenouilles de la même couleur l'une derrière l'autre, et plus personne ne passera — un saut ne franchit qu'une bête. La règle qui sauve : ALTERNE les couleurs, une verte, une rouge, une verte. Le jeu te prévient dès que la position devient perdue, et « Annuler » te ramène en arrière."
    },
    {
        // LE PARKING — « le jeu de fin de semaine » de la revue.
        //
        // C'EST LE CONTRAIRE DES GRENOUILLES, ET C'EST POUR CELA QU'IL Y A LES
        // DEUX. Chez les grenouilles, on ne revient jamais en arrière : le
        // piège est l'irréversible. Ici tout se défait — une voiture recule si
        // elle veut — et pourtant c'est bien plus long, parce que ce qui manque
        // n'est pas le droit de reculer mais la PLACE. Huit voitures, quatre
        // cases libres, et une voie où l'on ne se double pas.
        //
        // LA CASE SOUS LA VOIE EST TOUT LE PROBLÈME. On peut pousser des
        // voitures une demi-heure sans la remarquer, et ne jamais finir. Un
        // élève qui comprend pourquoi elle est là a compris le jeu ; le reste
        // n'est que de la patience.
        id: 'defi-parking', status: STATUS.TEST, title: 'Le Parking',
        cree: '2026-08-25',
        activityId: 'parking', skills: ['defi.parking'],
        sansRevision: true,
        printable: 'parking', printGeneratorId: 'defi.parking-fiche',
        printParams: { taille: 'moyen' },
        params: { taille: 'moyen' },
        paramSchema: [
            {
                id: 'taille', type: 'select', label: 'Voitures de chaque côté',
                aide: 'Le nombre de coups grimpe très vite — 36, 62, 104, 146 — parce que chaque croisement coûte un aller-retour par la place de dégagement. Commencer à 2 contre 2 pour comprendre le mécanisme, puis passer au plateau de la revue.',
                options: [
                    { value: 'minuscule', label: '2 contre 2 — pour découvrir (36 coups)' },
                    { value: 'petit', label: '3 contre 3 (62 coups)' },
                    { value: 'moyen', label: '4 contre 4 — le jeu de la revue (104 coups)' },
                    { value: 'grand', label: '5 contre 5 — le grand parking (146 coups)' }
                ],
                default: 'moyen'
            }
        ],
        motsClefs: ['parking', 'voitures', 'garage', 'déplacement', 'défi', 'casse-tête',
            'croisement', 'place de dégagement', 'fin de semaine'],
        tags: {
            chemin: [TAGS.DOMAINE.DEFIS, TAGS.SOUS_DOMAINE.CASSE_TETE],
            niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME, TAGS.NIVEAU.QUATRIEME]
        },
        instruction: "Les voitures de gauche doivent toutes se retrouver à droite, et celles de droite à gauche. Touche une voiture : si elle n'a qu'une sortie, elle y va toute seule ; sinon, touche ensuite la case libre où l'envoyer. Une voiture avance ou recule d'UNE case à la fois, et ne saute JAMAIS par-dessus une autre. Tout doit donc passer par la voie du milieu, qui ne fait qu'une case de large — et deux voitures qui s'y croisent en sens contraires sont coincées pour de bon. Regarde bien la case qui dépasse sous la voie : c'est la seule où l'on peut se ranger pour laisser passer, et sans elle le jeu serait impossible. Ne demande pas « qui avance ? » mais « qui doit se ranger ? ». Le compteur affiche en permanence combien de coups il reste au plus court : s'il monte après ton coup, tu viens de faire un détour."
    },
    {
        // L'EMBOUTEILLAGE — « façon rush hour », et progressif.
        //
        // Rémy : « J'aimerai un jeu façon rush hour et un jeu façon sokoban. Il
        // faut que ce soit progressif. »
        //
        // CE N'EST PAS LE COUSIN DU PARKING, ET C'EST POUR CELA QUE LES DEUX
        // COEXISTENT. Au Parking, toutes les voitures vont partout et ce qui
        // manque est la place. Ici chacune est prisonnière d'un axe : ce qui
        // manque n'est pas l'espace, c'est le DEGRÉ DE LIBERTÉ. Une case libre
        // au-dessus d'une voiture couchée ne lui sert à rien.
        //
        // LA PROGRESSION EST MESURÉE, PAS ESTIMÉE. Chaque parking est exploré
        // en entier avant d'être posé, et le départ est choisi à une distance
        // voulue de la sortie. Le niveau monte tout seul à chaque victoire.
        id: 'defi-embouteillage', status: STATUS.TEST, title: 'L\'Embouteillage',
        cree: '2026-08-25',
        activityId: 'embouteillage', skills: ['defi.embouteillage'],
        sansRevision: true,
        params: { niveau: 1 },
        paramSchema: [
            {
                id: 'niveau', type: 'select', label: 'Niveau de départ',
                aide: 'Le niveau se mesure en COUPS MINIMUM, pas en nombre de voitures : un parking très encombré peut se résoudre en quatre coups. Il monte tout seul à chaque parking résolu, alors commencer au niveau 1 n\'est pas une perte de temps.',
                options: [
                    { value: 1, label: 'Niveau 1 — pour comprendre (4 à 6 coups)' },
                    { value: 2, label: 'Niveau 2 (7 à 9 coups)' },
                    { value: 3, label: 'Niveau 3 (10 à 12 coups)' },
                    { value: 4, label: 'Niveau 4 (13 à 15 coups)' },
                    { value: 5, label: 'Niveau 5 (16 à 19 coups)' },
                    { value: 6, label: 'Niveau 6 — expert (20 coups et plus)' }
                ],
                default: 1
            }
        ],
        motsClefs: ['embouteillage', 'rush hour', 'parking', 'voitures', 'blocage',
            'casse-tête', 'défi', 'glisser', 'sortie', 'planification'],
        tags: {
            chemin: [TAGS.DOMAINE.DEFIS, TAGS.SOUS_DOMAINE.CASSE_TETE],
            niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME, TAGS.NIVEAU.QUATRIEME]
        },
        instruction: "Fais sortir la voiture ROUGE par la droite. Chaque véhicule ne glisse que dans SON axe : ceux qui sont couchés vont à gauche et à droite, ceux qui sont debout montent et descendent — jamais l'inverse, et jamais par-dessus un autre. Touche une voiture : si elle n'a qu'une sortie, elle y va toute seule ; sinon, touche la case où l'amener. NE POUSSE PAS LA ROUGE, elle est bloquée : demande-toi QUI la bloque, puis qui bloque celle-là, et remonte la chaîne jusqu'à une voiture qui peut bouger tout de suite. C'est par elle qu'il faut commencer. Le compteur affiche un minimum CALCULÉ — l'ordinateur a exploré toutes les positions du plateau, personne ne peut faire mieux. S'il monte après ton coup, ce n'est pas une faute : c'est un détour, et « Annuler » existe. Le niveau monte d'un cran à chaque parking résolu."
    },
    {
        // LE POUSSEUR — un sokoban, et il se fabrique à l'envers.
        //
        // Rémy : « J'aimerai […] un jeu façon sokoban. Il faut que ce soit
        // progressif. »
        //
        // ON NE POSE PAS DES CAISSES AU HASARD : neuf grilles sur dix seraient
        // insolubles, et rien ne le dirait avant d'avoir tout essayé. On part
        // de la position GAGNANTE et l'on remonte le temps en TIRANT les
        // caisses. Toute position atteinte ainsi est résoluble par
        // construction, et sa profondeur est le nombre minimum de poussées.
        //
        // ET C'EST CE QUI PERMET DE DIRE « C'EST PERDU ». Une caisse dans un
        // coin n'en sortira plus, mais le jeu continue de proposer des coups :
        // sur un carton, on s'acharne. Ici, la table sait exactement quelles
        // positions restent résolubles, et le jeu le dit tout de suite.
        id: 'defi-pousseur', status: STATUS.TEST, title: 'Le Pousseur',
        cree: '2026-08-25',
        activityId: 'pousseur', skills: ['defi.pousseur'],
        sansRevision: true,
        params: { niveau: 1 },
        paramSchema: [
            {
                id: 'niveau', type: 'select', label: 'Niveau de départ',
                aide: 'Le niveau se mesure en POUSSÉES minimum, et il monte tout seul à chaque entrepôt rangé. Les deux premiers niveaux tiennent en deux caisses : c\'est assez pour rencontrer le piège du coin, qui est toute la leçon.',
                // CINQUANTE PALIERS, DONC UNE GLISSIÈRE ET NON UN MENU. Rémy :
                // « Il faut au moins 50 niveaux ». Une liste déroulante de
                // cinquante lignes ne se choisit pas, elle se subit ; et c'est
                // exactement une échelle — voir `core/echelle.js`. Les libellés
                // viennent du noyau, pour qu'ils ne puissent pas mentir sur le
                // nombre de caisses.
                echelle: true,
                options: NIVEAUX_POUSSEUR.map(n => ({
                    value: n.id,
                    label: `${n.label} (${n.caisses} caisses)`
                })),
                default: 1
            }
        ],
        motsClefs: ['pousseur', 'sokoban', 'caisses', 'entrepôt', 'pousser', 'coin',
            'irréversible', 'casse-tête', 'défi', 'blocage'],
        tags: {
            chemin: [TAGS.DOMAINE.DEFIS, TAGS.SOUS_DOMAINE.CASSE_TETE],
            niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME, TAGS.NIVEAU.QUATRIEME]
        },
        instruction: "Range toutes les caisses sur les ronds verts. Touche une case libre pour y emmener le pousseur, ou touche une caisse pour la pousser ; les quatre flèches et celles du clavier marchent aussi. LA RÈGLE QUI FAIT TOUT : on POUSSE, on ne tire JAMAIS. Une caisse plaquée contre un mur ne pourra plus s'en éloigner — elle ne glissera que le long de ce mur — et dans un coin, elle ne bougera plus du tout. Si elle n'est pas sur un but à ce moment-là, c'est perdu. Alors avant chaque poussée, ne te demande pas « est-ce que ça avance ? » mais « est-ce que je pourrai revenir ? ». Le jeu te prévient dès que la position devient perdue, et « Annuler » te ramène en arrière — mais l'exercice est de le voir AVANT. Deux réflexes qui sauvent : ne colle pas une caisse contre un mur sans y être obligé, et commence par celles qui sont près d'un coin. On compte les POUSSÉES, pas les pas : marcher ne coûte rien."
    }
];
