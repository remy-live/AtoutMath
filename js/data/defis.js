import { TAGS } from './tags.js';
import { STATUS } from './status.js';

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
        // LA TOUR DE BRAHMA — la tour de Hanoï, sous le nom que lui a donné
        // Édouard Lucas en 1883.
        //
        // C'EST LA PREMIÈRE RÉCURSION QU'UN ÉLÈVE RENCONTRE, et il la rencontre
        // avec les mains. Pour déplacer quatre boules, il faut d'abord déplacer
        // les trois du dessus ailleurs : le problème se ramène à lui-même, une
        // boule de moins. Et le compte suit — 1, 3, 7, 15, 31 —, le double plus
        // un à chaque fois. On ne lui demande pas de le démontrer ; on lui
        // demande de le CONSTATER, ce qui est déjà beaucoup.
        id: 'defi-tour-brahma', status: STATUS.TEST, title: 'La Tour de Brahma',
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
    }
];
