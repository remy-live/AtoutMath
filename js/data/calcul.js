import { TAGS } from './tags.js';
import { STATUS } from './status.js';
import { NIVEAUX as NIVEAUX_CHANTIER } from '../core/chantier.js';
// Les dominos empruntent leurs questions aux autres notions : la liste des
// sources est tenue là où elle est vérifiée, pas recopiée ici.
import { SOURCES as SOURCES_DOMINOS } from '../core/generators/dominos.js';

// `status` absent = validé. Ne sont marqués que les exercices qui ne le sont
// pas encore — ici les jeux autonomes, qui n'ont pas été portés sur le contrat
// Item : ils n'ont ni aides graduées ni distracteurs expliqués.

// Un exercice n'est plus du code : c'est un assemblage déclaratif
//   générateur (quelle question)  ×  activité (comment on y répond)
// plus des paramètres. Aucun `gameType` pointant vers un fichier, aucun
// `paramSchema` recopié : le schéma de configuration est déduit du registre
// (voir js/games/configUI.js).
//
// Conséquence : proposer « les fractions dans le jeu des taupes » ne demande
// aucun développement, seulement une ligne de plus dans ce fichier.

export const calculExercises = [
    {
        id: 'calc-add',
        cree: '2026-07-26',
        consignePapier: "Calcule.",
        colonnesPapier: 4,
        title: 'Additions Mystères',
        generatorId: 'calc.addition', activityId: 'bubbles',
        params: { max: 10 },
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME] },
        instruction: "Trouve la somme des deux nombres affichés et sélectionne la bonne bulle."
    },
    {
        id: 'calc-sub',
        cree: '2026-07-28',
        consignePapier: "Calcule.",
        colonnesPapier: 4,
        title: 'Soustractions Éclair',
        generatorId: 'calc.soustraction', activityId: 'bubbles',
        // La seconde moitié se répond au pavé : reconnaître 13 parmi trois
        // nombres n'est pas produire 13.
        params: { max: 20 },
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME] },
        instruction: "Calcule la différence et clique sur la bonne bulle."
    },
    {
        id: 'calc-mult-flash',
        cree: '2026-07-26',
        consignePapier: "Calcule.",
        colonnesPapier: 4,
        title: 'Flash Mult',
        generatorId: 'calc.mult.fact', activityId: 'bubbles',
        params: { tables: [2, 3, 4, 5, 6, 7, 8, 9, 10] },
        motsClefs: ['tables', 'multiplication'],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME] },
        instruction: "Choisis la bulle qui contient le résultat correct de la multiplication."
    },
    {
        id: 'calc-pythagore',
        cree: '2026-07-26',
        consignePapier: "Calcule.",
        colonnesPapier: 3,
        title: 'Table de Pythagore',
        generatorId: 'calc.mult.fact', activityId: 'pythagore',
        params: { tables: [2, 3, 4, 5, 6, 7, 8, 9, 10] },
        motsClefs: ['tables', 'multiplication'],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME] },
        instruction: "Le résultat est donné, la table est vide : clique une case dont ligne × colonne fait ce résultat. Toutes les décompositions justes sont acceptées (6×7 comme 7×6)."
    },
    {
        id: 'calc-mult-missing',
        cree: '2026-07-26',
        revisions: [
            {
                date: '2026-08-19',
                quoi: 'Des bulles comme tous les autres exercices à propositions : il était le '
                    + 'seul à porter de petites cases carrées, héritées d\'un digicode qui '
                    + 'n\'avait plus de clavier à montrer.'
            }
        ],
        consignePapier: "Complète.",
        colonnesPapier: 4,
        title: 'Facteur Manquant',
        // DES BULLES, COMME SES DIX-HUIT VOISINS. Rémy : « la présentation
        // avec les bulles ou rectangle de choix n'est pas la même ». Il était
        // le SEUL exercice à propositions à sortir du lot, avec la variante
        // « digicode » — de petites cases blanches carrées là où Flash Mult,
        // Divisions Express et Sprint Chrono posent tous de grandes bulles.
        //
        // La métaphore du digicode se tenait quand la grille montrait tout un
        // clavier de chiffres, comme un code de porte. Elle ne se tient plus
        // depuis que l'aide progressive n'affiche que deux propositions puis
        // quatre : deux petits carrés ne sont pas un digicode, ce sont deux
        // boutons ratés.
        generatorId: 'calc.mult.missing', activityId: 'bubbles',
        params: { tables: [2, 3, 4, 5, 6, 7, 8, 9, 10] },
        motsClefs: ['tables', 'multiplication'],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL], niveaux: [TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Trouve le nombre manquant dans l'égalité, puis choisis-le parmi les propositions. "
            + "Pour y arriver, on ne multiplie pas au hasard : on DIVISE. Le facteur cherché, "
            + "c'est le résultat divisé par le facteur connu — et c'est ce raccourci qu'on veut "
            + "voir s'installer, parce qu'il est la table lue à l'envers."
    },
    {
        id: 'calc-division',
        cree: '2026-07-28',
        consignePapier: "Calcule.",
        colonnesPapier: 4,
        title: 'Divisions Express',
        generatorId: 'calc.division', activityId: 'bubbles',
        params: { tables: [2, 3, 4, 5, 6, 7, 8, 9, 10] },
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL], niveaux: [TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Trouve le quotient exact de la division affichée."
    },
    {
        id: 'calc-prio',
        cree: '2026-07-26',
        consignePapier: "Quelle opération faut-il effectuer en premier ?",
        colonnesPapier: 2,
        title: 'Prio-Bot Express',
        generatorId: 'calc.priorites', activityId: 'buttons',
        // Le niveau et la taille des nombres se règlent : les expressions
        // venaient de quatre gabarits fixes, à trois nombres de moins de dix.
        params: { mode: 'operation', niveau: 2, parentheses: false, grands: false },
        paramSchema: [
            {
                id: 'niveau', type: 'select', label: 'Difficulté', default: 2,
                options: [
                    { value: 1, label: '1 — Trois nombres, deux opérations' },
                    { value: 2, label: '2 — Jusqu\'à quatre nombres' },
                    { value: 3, label: '3 — Les parenthèses arrivent' },
                    { value: 4, label: '4 — Deux groupes de parenthèses' }
                ]
            },
            {
                id: 'grands', type: 'checkbox', label: 'Des calculs plus grands', default: false,
                aide: 'Les nombres montent jusqu\'à 20 : la règle est la même, mais '
                    + 'elle ne se devine plus de tête.'
            },
            {
                id: 'parentheses', type: 'checkbox', label: 'Avec des parenthèses', default: false,
                aide: 'Elles n\'apparaissent qu\'à partir de la difficulté 3.'
            }
        ],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.PRIORITES], niveaux: [TAGS.NIVEAU.CINQUIEME] },
        instruction: "Sélectionne l'opération à effectuer en premier selon les règles de priorité."
    },
    {
        // LES PARENTHÈSES, À PART. Rémy : « tu m'en fais un autre avec des
        // parenthèses ». C'est bien un autre exercice, et non un réglage caché
        // du premier : la règle change de nature. « × et ÷ avant + et − » se
        // décide en regardant les SIGNES ; « les parenthèses d'abord » se
        // décide en regardant la FORME, avant même de lire les signes. Un
        // élève peut tenir la seconde et rater la première, ou l'inverse — et
        // c'est ce qu'on veut voir séparément.
        id: 'calc-prio-parentheses',
        cree: '2026-08-15',
        consignePapier: "Quelle opération faut-il effectuer en premier ?",
        colonnesPapier: 2,
        title: 'Prio-Bot Parenthèses',
        generatorId: 'calc.priorites', activityId: 'buttons',
        params: { mode: 'operation', niveau: 3, parentheses: true, grands: false },
        paramSchema: [
            {
                id: 'niveau', type: 'select', label: 'Difficulté', default: 3,
                options: [
                    { value: 3, label: '3 — Un groupe de parenthèses' },
                    { value: 4, label: '4 — Deux groupes, ou un groupe de trois nombres' }
                ]
            },
            {
                id: 'grands', type: 'checkbox', label: 'Des calculs plus grands', default: false,
                aide: 'Les nombres montent jusqu\'à 20.'
            }
        ],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.PRIORITES], niveaux: [TAGS.NIVEAU.CINQUIEME, TAGS.NIVEAU.QUATRIEME] },
        instruction: "Les parenthèses passent AVANT tout le reste — avant même les multiplications. "
            + "S'il y en a plusieurs, on commence par le groupe le plus intérieur. Sélectionne "
            + "l'opération à effectuer en premier."
    },
    {
        id: 'calc-prio-resultat',
        cree: '2026-07-28',
        consignePapier: "Calcule en respectant les priorités, et détaille.",
        colonnesPapier: 2,
        title: 'Prio-Bot Calcul',
        generatorId: 'calc.priorites', activityId: 'bubbles',
        params: { mode: 'resultat', niveau: 2, progressif: true },
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.PRIORITES], niveaux: [TAGS.NIVEAU.CINQUIEME, TAGS.NIVEAU.QUATRIEME] },
        instruction: "Calcule l'expression en respectant les priorités opératoires."
    },
    {
        // LA RÉÉCRITURE LIGNE À LIGNE. Les deux exercices ci-dessus posent la
        // question en QCM : quelle opération, ou quel résultat. Celui-ci fait
        // ÉCRIRE la suite du calcul — et c'est là qu'apparaît la faute qui
        // coûte vraiment des points : calculer 4 × 5 juste, puis oublier le
        // « − 2 » en passant à la ligne. Un QCM ne la voit jamais.
        id: 'calc-prio-cascade', status: STATUS.TEST, title: 'Priorités : ligne par ligne',
        cree: '2026-08-14',
        activityId: 'priorites',
        // Sur le papier, c'est le MÊME exercice en plus exigeant : à l'écran
        // la machine recopie le reste de la ligne, sur la feuille personne ne
        // le fait à la place de l'élève — et c'est là qu'on perd ses points.
        printable: 'priorites', printGeneratorId: 'calc.priorites-fiche',
        printParams: { niveau: 2, parentheses: true },
        consignePapier: 'Calcule en respectant les priorités, écris les calculs.',
        skills: ['num.prio'],
        params: { niveau: 2, parentheses: true },
        paramSchema: [
            {
                id: 'niveau', type: 'select', label: 'Difficulté',
                options: [
                    { value: 1, label: '1 — Deux opérations, sans parenthèses' },
                    { value: 2, label: '2 — Jusqu\'à trois opérations' },
                    { value: 3, label: '3 — Les parenthèses arrivent' },
                    { value: 4, label: '4 — Deux groupes de parenthèses' }
                ],
                default: 2
            },
            {
                id: 'parentheses', type: 'checkbox', label: 'Avec des parenthèses',
                aide: 'Sans elles, seule la règle « × et ÷ avant + et − » est en jeu — et le tirage garantit qu\'un calcul de gauche à droite donne toujours faux.',
                default: true
            }
        ],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.PRIORITES], niveaux: [TAGS.NIVEAU.CINQUIEME, TAGS.NIVEAU.QUATRIEME] },
        instruction: "Clique sur l'opération qu'il faut faire EN PREMIER : elle se souligne. Donne son résultat dans le trou, et la ligne suivante s'écrit — en RECOPIANT tout le reste. C'est la recopie qui coûte des points en contrôle, pas la règle : on calcule 4 × 5 correctement, et on oublie le « − 2 »."
    },
    {
        // LE COMPTE EST BON. Le tirage est fabriqué à l'endroit : le compte est
        // donc toujours atteignable, et l'on sait en combien d'opérations —
        // c'est le réglage de difficulté. Les grandes plaques sont garanties :
        // 25, 50, 75 et 100 sont celles dont les multiples doivent devenir des
        // réflexes.
        id: 'calc-compte-est-bon', status: STATUS.TEST, title: 'Le Compte est Bon',
        cree: '2026-08-14',
        activityId: 'compte-est-bon',
        // SUR LE PAPIER, c'est l'exercice d'origine : on cherche au crayon,
        // on rature, on recommence — ce que l'écran ne remplace pas.
        printable: 'compte', printGeneratorId: 'calc.compte-fiche',
        printParams: { operations: 3, grands: 1 },
        consignePapier: 'Trouve le compte. Une opération par ligne.',
        skills: ['num.calc.tri'],
        // DEUX OPÉRATIONS PAR DÉFAUT, pas trois. Le compte est bon est un jeu
        // d'adultes : à trois opérations, l'élève de CM2 cherche à l'aveugle et
        // renonce avant d'avoir rien calculé. À deux, il voit le chemin, il le
        // pose, il gagne — et c'est en gagnant qu'on accepte d'en faire trois.
        params: { operations: 2, tous: false, grands: 1 },
        paramSchema: [
            {
                id: 'operations', type: 'select', label: 'Opérations pour y arriver',
                aide: 'C\'est le vrai réglage de difficulté : chaque opération de plus multiplie le nombre de chemins à essayer.',
                options: [
                    { value: 2, label: '2 — pour commencer' },
                    { value: 3, label: '3' },
                    { value: 4, label: '4' },
                    { value: 5, label: '5 — le tirage complet' }
                ],
                default: 2
            },
            {
                id: 'tous', type: 'checkbox', label: 'Utiliser TOUTES les plaques',
                aide: 'Atteindre le compte ne suffit plus : il ne doit rien rester sur la table. Cela impose cinq opérations, et transforme « trouve un chemin » en « trouve LE chemin ».',
                default: false
            },
            {
                id: 'grands', type: 'select', label: 'Grandes plaques (25, 50, 75, 100)',
                options: [
                    { value: 1, label: 'Une au moins' },
                    { value: 2, label: 'Deux au moins' }
                ],
                default: 1
            }
        ],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Touche une plaque, un signe, une seconde plaque — puis ÉCRIS le résultat toi-même : la machine ne calcule jamais à ta place. Deux règles seulement : jamais de nombre négatif, et une division doit tomber juste. Une plaque ne sert qu'une fois, et le résultat obtenu revient sur la table."
    },
    {
        // UN SEUL « POSER », le signe est un réglage. Le geste enseigné est le
        // même — aligner les nombres, puis descendre colonne par colonne — et
        // c'est justement ce qu'on veut faire sentir : ce qui change entre + et
        // −, ce n'est pas la méthode, c'est l'endroit où se note la retenue.
        // Les deux règles sont dites dans la consigne, l'une après l'autre.
        id: 'calc-poser', status: STATUS.TEST, title: 'Poser une opération',
        cree: '2026-08-14',
        revisions: [
            {
                date: '2026-08-19',
                quoi: 'À l\'addition, l\'ordre des lignes est libre : 47 + 128 et 128 + 47 sont la '
                    + 'même opération posée. La soustraction, elle, garde son ordre.'
            }
        ],
        activityId: 'poser-operation',
        // SUR LE PAPIER, c'est le même exercice sans l'alignement : la fiche
        // imprime les nombres déjà en colonnes et laisse toute la place
        // d'écrire les retenues. « Pose et effectue » est l'exercice le plus
        // banal d'une feuille de calcul — et il manquait.
        //
        // `printParams` ÉCRASE les réglages de l'écran (`{...params,
        // ...printParams}` dans printSheet.js) : tout ce qu'on y répète devient
        // un réglage sans effet sur la feuille. On n'y laisse donc QUE ce que
        // l'écran ne règle pas — l'opération, la taille et le nombre de termes
        // viennent maintenant du panneau, comme on s'y attend en le réglant.
        printable: 'pose', printGeneratorId: 'calc.poser-fiche',
        printParams: { retenue: true },
        consignePapier: 'Effectue ces opérations posées.',
        skills: ['num.add.entiers'],
        params: { operation: '+', decimales: false, chiffres: 3, termes: 2 },
        paramSchema: [
            {
                id: 'operation', type: 'select', label: 'Opération',
                options: [
                    { value: '+', label: 'Addition' },
                    { value: '-', label: 'Soustraction' }
                ],
                default: '+'
            },
            {
                id: 'decimales', type: 'checkbox', label: 'Nombres à virgule',
                aide: 'C\'est là que tout se joue : on aligne sur la VIRGULE, pas sur le bord droit.',
                default: false
            },
            {
                id: 'chiffres', type: 'select', label: 'Taille des nombres',
                options: [
                    { value: 2, label: '2 chiffres' },
                    { value: 3, label: '3 chiffres' },
                    { value: 4, label: '4 chiffres' }
                ],
                default: 3
            },
            {
                id: 'termes', type: 'select', label: 'Combien de nombres',
                aide: 'À trois nombres, la retenue peut valoir 2 — et le petit rond le sait. Sans effet sur une soustraction.',
                options: [
                    { value: 2, label: 'Deux' },
                    { value: 3, label: 'Trois' }
                ],
                default: 2
            }
        ],
        motsClefs: ['addition posée', 'soustraction posée', 'retenue', 'colonnes', 'aligner'],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME] },
        instruction: "D'abord ALIGNER : fais glisser chaque NOMBRE ENTIER dans la grille. Attrape-le par n'importe lequel de ses chiffres — celui que tu tiens tombe dans la colonne que tu survoles, et les autres suivent. Un fantôme te montre où il tomberait avant que tu lâches. Les unités sous les unités : c'est la virgule qui aligne, pas le bord droit. Puis calculer, colonne par colonne, en partant de la droite. Dans une ADDITION, la retenue s'écrit dans le petit rond EN HAUT de la colonne suivante — à deux nombres elle vaut 0 ou 1, à trois elle peut valoir 2. Dans une SOUSTRACTION, quand le chiffre du haut est trop petit, on lui ajoute dix — et pour ne rien changer, on ajoute un au chiffre du BAS de la colonne suivante : la retenue se note contre le nombre du dessous."
    },
    {
        // POSER UNE MULTIPLICATION. Une LIGNE par chiffre du multiplicateur,
        // décalée d'un rang à chaque fois, puis l'addition des lignes. Et une
        // retenue qui ne se comporte pas comme celle de l'addition : elle
        // s'ajoute APRÈS le produit, jamais au chiffre avant de multiplier.
        // C'est l'erreur qu'on ne voit pas si l'on ne fait écrire que le total.
        id: 'calc-poser-multiplication', status: STATUS.TEST, title: 'Poser une multiplication',
        cree: '2026-08-14',
        revisions: [
            {
                date: '2026-08-19',
                quoi: 'Une touche ⌫ pour reprendre le dernier chiffre — il n\'y en avait aucune — '
                    + 'et le libre qui s\'ouvre à qui vient de poser une multiplication entière '
                    + 'sans une faute.'
            }
        ],
        activityId: 'poser-multiplication',
        // SUR LE PAPIER, c'est le même exercice sans l'alignement : la fiche
        // imprime les nombres déjà en colonnes et laisse toute la place
        // d'écrire les retenues. « Pose et effectue » est l'exercice le plus
        // banal d'une feuille de calcul — et il manquait.
        printable: 'pose', printGeneratorId: 'calc.poser-fiche',
        printParams: { operation: '×', chiffres: 3, nombres: 2, retenue: true },
        consignePapier: 'Effectue ces multiplications posées.',
        skills: ['num.mult.sens'],
        params: { chiffres: 3, chiffresB: 2, decimales: false, verification: 'merite' },
        paramSchema: [
            {
                id: 'chiffres', type: 'select', label: 'Taille du premier nombre',
                options: [
                    { value: 2, label: '2 chiffres' },
                    { value: 3, label: '3 chiffres' },
                    { value: 4, label: '4 chiffres' }
                ],
                default: 3
            },
            {
                id: 'chiffresB', type: 'select', label: 'Taille du multiplicateur',
                aide: 'À un chiffre, il n\'y a qu\'une ligne et aucune addition : c\'est par là qu\'on commence. Chaque chiffre de plus ajoute une ligne, et un décalage.',
                options: [
                    { value: 1, label: '1 chiffre — une seule ligne' },
                    { value: 2, label: '2 chiffres — deux lignes' },
                    { value: 3, label: '3 chiffres — trois lignes' }
                ],
                default: 2
            },
            {
                id: 'decimales', type: 'checkbox', label: 'Nombres à virgule',
                aide: 'La virgule ne sert à RIEN pendant le calcul : on multiplie les entiers, et on la place à la fin en comptant les décimales des deux facteurs. C\'est une étape de plus à l\'écran.',
                default: false
            },
            {
                id: 'verification', type: 'select', label: 'Quand corriger', default: 'merite',
                aide: 'Refuser un chiffre faux à l\'instant où il est tapé évite de construire sur '
                    + 'une erreur, et c\'est le seul régime qui dise OÙ ça coince — mais on ne pose '
                    + 'plus une multiplication : sur le cahier, on écrit la ligne ENTIÈRE puis on la '
                    + 'relit, et c\'est ce regard-là qu\'il faut apprendre. Le réglage par défaut '
                    + 'enchaîne les deux : on est guidé, et le libre s\'ouvre à qui vient de poser '
                    + 'une multiplication entière sans une faute. Une faute le referme — non pour '
                    + 'punir, mais parce que c\'est justement là qu\'on a besoin d\'être repris '
                    + 'colonne par colonne.',
                options: [
                    { value: 'merite', label: 'Guidé, puis libre quand c\'est réussi' },
                    { value: 'fin', label: 'Toujours libre : à la fin de chaque ligne' },
                    { value: 'immediate', label: 'Toujours guidé : à chaque chiffre tapé' }
                ]
            }
        ],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Une ligne par chiffre du multiplicateur, en commençant par les unités. Attention à la retenue : elle s'ajoute APRÈS le produit — 2 × 4 + 2, et jamais (2 + 2) × 4. Écris-la dans le petit rond, elle doit se voir. Chaque ligne suivante se DÉCALE d'une colonne, parce que son chiffre vaut des dizaines, puis des centaines : les points marquent les colonnes sautées. On additionne enfin les lignes, et s'il y a des virgules, on les compte à la toute fin."
    },
    {
        // POSER UNE DIVISION. La potence, et la même étape recommencée :
        // j'abaisse, je cherche combien de fois, je multiplie, je soustrais.
        // Le rang du chiffre abaissé donne le rang du chiffre du quotient —
        // d'où la virgule du quotient, qu'on récite d'ordinaire sans la
        // comprendre.
        id: 'calc-poser-division', status: STATUS.TEST, title: 'Poser une division',
        cree: '2026-08-14',
        activityId: 'poser-division',
        // SUR LE PAPIER, c'est le même exercice sans l'alignement : la fiche
        // imprime les nombres déjà en colonnes et laisse toute la place
        // d'écrire les retenues. « Pose et effectue » est l'exercice le plus
        // banal d'une feuille de calcul — et il manquait.
        printable: 'pose', printGeneratorId: 'calc.poser-fiche',
        printParams: { operation: '÷', chiffres: 3, nombres: 2, retenue: true },
        consignePapier: 'Effectue ces divisions posées.',
        skills: ['num.div.quotient'],
        params: { chiffres: 3, diviseurMax: 9, decimalesQuotient: 0 },
        paramSchema: [
            {
                id: 'chiffres', type: 'select', label: 'Taille du dividende',
                options: [
                    { value: 2, label: '2 chiffres' },
                    { value: 3, label: '3 chiffres' },
                    { value: 4, label: '4 chiffres' }
                ],
                default: 3
            },
            {
                id: 'diviseurMax', type: 'select', label: 'Diviseur',
                aide: 'Jusqu\'à 9, tout se lit dans les tables. Au-delà, il faut estimer — c\'est un autre travail, et il vient plus tard.',
                options: [
                    { value: 5, label: 'Jusqu\'à 5' },
                    { value: 9, label: 'Jusqu\'à 9 — dans les tables' },
                    { value: 25, label: 'Jusqu\'à 25 — à deux chiffres' }
                ],
                default: 9
            },
            {
                id: 'decimalesQuotient', type: 'select', label: 'Quotient décimal',
                aide: 'À zéro, la division tombe juste et l\'on s\'arrête au quotient entier. Sinon on continue en abaissant des zéros — et la virgule du quotient tombe pile quand on abaisse celle du dividende.',
                options: [
                    { value: 0, label: 'Non — division exacte' },
                    { value: 1, label: 'Un chiffre après la virgule' },
                    { value: 2, label: 'Deux chiffres après la virgule' }
                ],
                default: 0
            }
        ],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "La potence, et toujours la même étape : j'abaisse un chiffre, je cherche combien de fois le diviseur tient dedans, je multiplie, je soustrais. Trois réponses par étape, dans cet ordre. La vérification qui ne trompe pas : le reste est TOUJOURS plus petit que le diviseur — s'il est plus grand, c'est que le chiffre du quotient était trop petit. Et le chiffre du quotient se place à la colonne du chiffre qu'on vient d'abaisser : c'est pour cela que la virgule du quotient tombe pile quand on abaisse celle du dividende."
    },


    // --- Arcade : mêmes notions, autre présentation ---
    {
        id: 'calc-arcade-sprint',
        cree: '2026-07-26',
        consignePapier: "Calcule.",
        colonnesPapier: 4,
        title: 'Sprint Chrono',
        generatorId: 'calc.mixte', activityId: 'bubbles',
        params: { operations: ['+', '-'], max: 20, timeLimit: 60, minScore: 10 },
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL], niveaux: [TAGS.NIVEAU.SIXIEME] },
        instruction: "Réponds au plus grand nombre de calculs possible avant la fin du chronomètre !"
    },
    {
        id: 'calc-arcade-moles',
        cree: '2026-07-26',
        consignePapier: "Calcule.",
        colonnesPapier: 3,
        title: 'Chasse aux Taupes',
        generatorId: 'calc.mixte', activityId: 'moles',
        params: { operations: ['+', '-'], max: 20, timeLimit: 60, minScore: 10 },
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL], niveaux: [TAGS.NIVEAU.SIXIEME] },
        instruction: "Tape sur la taupe qui porte le bon résultat !"
    },
    {
        id: 'calc-moles-tables',
        cree: '2026-07-28',
        consignePapier: "Calcule.",
        colonnesPapier: 3,
        title: 'Taupes des Tables',
        generatorId: 'calc.mult.fact', activityId: 'moles',
        params: { tables: [6, 7, 8, 9], timeLimit: 60, minScore: 10 },
        motsClefs: ['tables', 'multiplication'],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL], niveaux: [TAGS.NIVEAU.SIXIEME] },
        instruction: "Tape sur la taupe qui porte le bon produit !"
    },

    // --- Jeux autonomes : logique de plateau propre, contenu interne ---
    //
    // UN JEU AUSSI DIT CE QU'IL TRAVAILLE. Sans générateur pour la porter, la
    // compétence se déclare ici, à la main. Elle ne change rien au bilan — une
    // tentative est rattachée à la compétence de SA question, pas à celle de
    // l'exercice — mais elle décide de trois choses : la leçon que le mode
    // Apprentissage propose avant de jouer, la présence du jeu dans « des
    // exercices pour cette compétence », et sa place dans la remédiation.
    //
    // Les jeux qui ne travaillent aucune notion du programme — Othello, les
    // Dames, les Échecs — le disent par `horsProgression: true`. C'est le seul
    // autre choix possible : un exercice muet est refusé par les tests.
    {
        id: 'calc-arcade-shooter', status: STATUS.TEST, title: 'Météorites Mathématiques',
        cree: '2026-07-26',
        activityId: 'shooter', skills: ['num.mult.table.*'],
        params: { tables: [2, 3, 4, 5, 6, 7, 8, 9, 10], difficulty: 'medium', leurres: 3 },
        paramSchema: [
            { id: 'tables', type: 'multiselect', label: 'Tables à travailler', options: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], default: [2, 3, 4, 5, 6, 7, 8, 9, 10] },
            {
                // « easy / medium / hard » s'affichait tel quel, en anglais, et
                // ne disait pas de QUOI il s'agissait : ce réglage ne change
                // pas les tables, il change la vitesse d'approche.
                id: 'difficulty', type: 'select', label: 'Vitesse des météorites', default: 'medium',
                aide: 'C\'est le temps qu\'on a pour calculer avant de tirer. Trop rapide, l\'élève vise ce qui arrive au lieu de viser ce qui est faux.',
                options: [
                    { value: 'tres-lente', label: 'Très lente — tout le temps de calculer' },
                    { value: 'easy', label: 'Lente' },
                    { value: 'medium', label: 'Normale' },
                    { value: 'hard', label: 'Rapide' }
                ]
            },
            {
                id: 'leurres', type: 'select', label: 'Météorites par question', default: 3,
                options: [
                    { value: 2, label: '3 météorites' },
                    { value: 3, label: '4 météorites' },
                    { value: 4, label: '5 météorites' },
                    { value: 5, label: '6 météorites' }
                ]
            }
        ],
        motsClefs: ['tables', 'multiplication'],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL], niveaux: [TAGS.NIVEAU.SIXIEME] },
        instruction: "Ton vaisseau suit ta souris (ou ton doigt). Tire sur toutes les météorites qui portent un MAUVAIS résultat, et attrape la BONNE réponse avec ton vaisseau !"
    },
    {
        id: 'calc-math-memory', status: STATUS.TEST, title: 'Memory des Tables',
        cree: '2026-07-26',
        activityId: 'memory', skills: ['num.mult.table.*'],
        // SUR LE PAPIER, ON FABRIQUE LE JEU. Page 1 : les cartes, une paire par
        // bloc — le calcul et son résultat. Page 2 : les dos, aux mêmes
        // emplacements. On découpe, on colle dos à dos (ou l'on imprime en
        // recto-verso), et le paquet resservira toute l'année.
        printable: 'memory', printGeneratorId: 'calc.memory-fiche',
        printParams: { tables: [2, 3, 4, 5, 6, 7, 8, 9, 10], maxFacteur: 10 },
        params: { tables: [2, 3, 4, 5, 6, 7, 8, 9, 10], pairs: 6 },
        paramSchema: [
            { id: 'tables', type: 'multiselect', label: 'Tables à travailler', options: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], default: [2, 3, 4, 5, 6, 7, 8, 9, 10] },
            { id: 'pairs', type: 'select', label: 'Nombre de paires', options: [4, 6, 8, 10], default: 6 }
        ],
        motsClefs: ['tables', 'multiplication'],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL], niveaux: [TAGS.NIVEAU.SIXIEME] },
        instruction: "Associe chaque opération à son résultat pour nettoyer le plateau !"
    },
    {
        id: 'calc-labyrinthe', status: STATUS.TEST, title: 'Labyrinthe Mathématique',
        cree: '2026-07-26',
        activityId: 'labyrinthe', skills: ['num.mult.table.*'],
        params: { timeLimit: 60, timeReduction: 5, operations: ['*'], tables: [2, 3, 4, 5, 6, 7, 8, 9, 10] },
        paramSchema: [
            { id: 'timeLimit', type: 'number', label: 'Temps initial (s)', default: 60 },
            { id: 'timeReduction', type: 'number', label: 'Temps perdu par niveau (s)', default: 5 },
            { id: 'operations', type: 'multiselect', label: 'Opérations', options: [{ value: '+', label: '+ addition' }, { value: '-', label: '− soustraction' }, { value: '*', label: '× multiplication' }, { value: '/', label: '÷ division' }], default: ['*'] },
            { id: 'tables', type: 'multiselect', label: 'Tables (si multiplication)', options: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], default: [2, 3, 4, 5, 6, 7, 8, 9, 10] }
        ],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL], niveaux: [TAGS.NIVEAU.SIXIEME] },
        instruction: "Déplace-toi vers la case contenant la bonne réponse pour atteindre la sortie."
    },
    {
        id: 'calc-mathodu', status: STATUS.TEST, title: 'Mathdoku',
        cree: '2026-07-30',
        generatorId: 'logique.mathodu', activityId: 'kenken',
        // Une erreur de placement dans une grille ne se révise pas : « case B3 »
        // n'est pas une question qu'on peut reposer hors de SA grille. Comme le
        // sudoku et le binairo, le Mathdoku entraîne le raisonnement, pas une
        // connaissance ; ses entrées noyaient un carnet qui doit se lire vite.
        sansRevision: true,
        // Fiche imprimable : des grilles à raturer, pour travailler sur papier.
        printable: 'mathdoku',
        // 3 grilles par défaut : une grille est une « question » longue, dix
        // seraient une punition.
        params: { nbQuestions: 3, chiffres: '1-4', operations: ['add', 'sub'], difficulte: 'facile' },
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.LOGIQUE], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Remplis la grille : chaque chiffre une fois par ligne et par colonne, et chaque zone doit donner le résultat écrit dans son coin."
    },
    {
        id: 'calc-binairo', status: STATUS.TEST, title: 'Binairo',
        cree: '2026-07-30',
        generatorId: 'logique.binairo', activityId: 'binairo',
        sansRevision: true,
        printable: 'binairo',
        params: { nbQuestions: 3, taille: 6, difficulte: 'facile' },
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.LOGIQUE], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Remplis la grille avec des 0 et des 1 : autant de chaque sur chaque ligne et chaque colonne, jamais trois identiques à la suite."
    },
    {
        id: 'calc-nova', status: STATUS.TEST, title: 'Nova',
        cree: '2026-08-06',
        activityId: 'nova', skills: ['num.mult.table.*'],
        params: { tables: [2, 3, 4, 5, 6, 7, 8, 9, 10], lives: 3, entrePortes: 18 },
        paramSchema: [
            { id: 'tables', type: 'multiselect', label: 'Tables des portes', options: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], default: [2, 3, 4, 5, 6, 7, 8, 9, 10] },
            { id: 'lives', type: 'number', label: 'Vies', min: 1, max: 5, default: 3 },
            { id: 'entrePortes', type: 'number', label: 'Secondes entre deux murs', min: 8, max: 40, default: 18 }
        ],
        motsClefs: ['tables', 'multiplication'],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME] },
        instruction: "Un shoot'em up : glisse pour piloter, le canon tire tout seul — doigt posé pour charger le rayon lourd, double tape pour la bombe NOVA. Deux épreuves de calcul alternent : les MURS (franchis la porte du bon résultat) et les CONVOIS (place-toi sous le transporteur du bon résultat pour l'abattre). Chaque bonne porte ouvre le secteur suivant, plus dur : chasseurs, plongeurs kamikazes, blindés, tireurs d'élite — et tout ce qui te touche fait mal."
    },
    {
        id: 'calc-escadrille', status: STATUS.TEST, title: 'Escadrille des Tables',
        cree: '2026-08-05',
        activityId: 'escadrille', skills: ['num.mult.table.*'],
        params: { table: 7, lives: 3, rythme: 'lent' },
        paramSchema: [
            {
                id: 'table', type: 'select', label: 'Table à défendre', default: 7,
                options: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => ({ value: n, label: `Table de ${n}` }))
            },
            { id: 'lives', type: 'number', label: 'Vies', min: 1, max: 5, default: 3 },
            {
                id: 'rythme', type: 'select', label: 'Rythme', default: 'lent',
                options: [
                    { value: 'lent', label: 'Lent (temps de calculer)' },
                    { value: 'normal', label: 'Normal' },
                    { value: 'rapide', label: 'Rapide' }
                ]
            }
        ],
        motsClefs: ['tables', 'multiplication'],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME] },
        instruction: "Une escadrille descend, chaque appareil portant un nombre. Abats tout ce qui n'est PAS dans la table choisie et laisse passer les multiples — ce sont des amis. Glisse pour piloter, tape pour tirer. Tirer sur un ami coûte une vie ; laisser un intrus atteindre la base aussi."
    },
    {
        id: 'calc-sudoku', status: STATUS.TEST, title: 'Sudoku',
        cree: '2026-08-04',
        generatorId: 'logique.sudoku', activityId: 'sudoku',
        // Le sudoku se fait très bien sur papier — c'est même là qu'il est né.
        printable: 'sudoku',
        sansRevision: true,
        params: { nbQuestions: 2, taille: 6, difficulte: 'facile' },
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.LOGIQUE], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Chaque chiffre ne doit apparaître qu'une seule fois par ligne, par colonne et par bloc. Commence par les cases où un seul chiffre est encore possible : chacune en débloque d'autres."
    },
    {
        id: 'calc-garam', status: STATUS.TEST, title: 'Garam',
        cree: '2026-07-30',
        generatorId: 'logique.garam', activityId: 'garam',
        sansRevision: true,
        printable: 'garam',
        params: { nbQuestions: 2, taille: 'complet', operations: ['add', 'sub', 'mul'], difficulte: 'facile' },
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.LOGIQUE], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Le Garam des fiches officielles : quatre blocs d'égalités reliés par des ponts. Complète les cases avec des chiffres pour que TOUTES les égalités soient vraies, horizontales comme verticales. Une égalité verticale dépasse toujours dix : son résultat s'écrit sur deux cases empilées, dizaines au-dessus, unités en dessous — et la case du bas sert aussi à l'égalité horizontale."
    },
    {
        id: 'calc-course', status: STATUS.TEST, title: 'Course Mathématique',
        cree: '2026-07-26',
        activityId: 'course', skills: ['num.mult.table.*'],
        // Plus de `internalStudentConfig` : les réglages du jeu (voies, calculs)
        // étaient définis dans le schéma mais inatteignables — ni l'élève ni le
        // professeur ne pouvaient les changer, le jeu démarrait toujours sur
        // trois voies de tables de multiplication.
        params: { mode: 'survival', lanes: 3, speed: 3, operations: ['mul'] },
        paramSchema: [
            {
                id: 'mode', type: 'select', label: 'Mode de jeu', default: 'survival',
                options: [
                    { value: 'survival', label: 'Survie (3 vies)' },
                    { value: 'chrono', label: 'Contre la montre (60 s)' },
                    { value: 'sprint', label: 'Sprint (20 questions)' }
                ]
            },
            { id: 'lanes', type: 'number', label: 'Nombre de voies', default: 3, min: 2, max: 5 },
            { id: 'speed', type: 'number', label: 'Vitesse de départ', default: 3, min: 2, max: 8 },
            {
                // Les puces portent l'OPÉRATION, pas son nom. « Tables de
                // multiplication » tient sur toute une ligne et se lit moins
                // vite que « 7 × 8 » : un exemple dit le type de calcul en
                // trois caractères, et six réglages tiennent alors sur deux
                // rangées au lieu de quatre.
                id: 'operations', type: 'multiselect', label: 'Types de calcul', default: ['mul'],
                options: [
                    { value: 'mul', label: '7 × 8', aide: 'Tables de multiplication' },
                    { value: 'div', label: '56 ÷ 7', aide: 'Divisions' },
                    { value: '+9', label: '+9 / −9', aide: 'Ajouter ou retirer 9' },
                    { value: 'c10', label: '? + 3 = 10', aide: 'Compléments à 10' },
                    { value: 'rel', label: '−3 + 5', aide: 'Nombres relatifs' },
                    { value: 'dec', label: '× 10 / × 0,1', aide: 'Multiplier par 10 ou par 0,1' }
                ]
            }
        ],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL], niveaux: [TAGS.NIVEAU.SIXIEME] },
        instruction: "Dirige le véhicule vers la bonne réponse pour continuer la course !"
    },
    {
        id: 'calc-tetris', status: STATUS.TEST, title: 'Math Tetris',
        cree: '2026-07-26',
        activityId: 'tetris', skills: ['num.mult.table.*'],
        params: { tables: [2, 3, 4, 5, 6, 7, 8, 9, 10], speed: 1000 },
        paramSchema: [
            { id: 'tables', type: 'multiselect', label: 'Tables', options: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], default: [2, 3, 4, 5, 6, 7, 8, 9, 10] },
            { id: 'speed', type: 'number', label: 'Vitesse de chute (ms)', default: 1000 }
        ],
        motsClefs: ['tables', 'multiplication'],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL], niveaux: [TAGS.NIVEAU.SIXIEME] },
        instruction: "Combine les blocs pour que leur produit donne la cible demandée !"
    },
    {
        id: 'calc-vault', status: STATUS.TEST, title: 'Le Coffre-Fort',
        cree: '2026-08-04',
        // « Propose toujours le milieu de la zone possible » : c'est la
        // dichotomie, et le jeu ne fait que ça.
        activityId: 'vault', skills: ['num.logique.dichotomie'],
        params: { maxNumber: 100, attempts: 10 },
        paramSchema: [
            { id: 'maxNumber', type: 'select', label: 'Code entre 1 et…', options: [50, 100, 200, 500, 1000], default: 100 },
            { id: 'attempts', type: 'number', label: 'Essais par coffre', default: 10, min: 4, max: 15 }
        ],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.LOGIQUE], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME] },
        instruction: "Trouve le code secret ! À chaque essai, le coffre répond « c'est plus » ou « c'est moins ». Astuce de champion : propose toujours le milieu de la zone possible."
    },
    {
        id: 'calc-duel', status: STATUS.TEST, title: 'Duel des Tables (à deux)',
        cree: '2026-08-07',
        revisions: [{
            date: '2026-08-19',
            quoi: 'Un renvoi réussi se VOIT — anneau d\'impact et camp qui flashe ; la brique porte '
                + 'la couleur de celui qui l\'a envoyée ; le rythme se règle (tranquille par défaut) ; '
                + 'et un mode où chacun compose son calcul au clavier avant de le lancer.'
        }],
        activityId: 'duel', skills: ['num.mult.table.*'],
        params: {
            tables: [2, 3, 4, 5, 6, 7, 8, 9, 10], cible: 7, operations: 'mul',
            envoi: 'auto', rythme: 'tranquille'
        },
        paramSchema: [
            { id: 'tables', type: 'multiselect', label: 'Tables jouables', options: [2, 3, 4, 5, 6, 7, 8, 9, 10], default: [2, 3, 4, 5, 6, 7, 8, 9, 10] },
            { id: 'cible', type: 'select', label: 'Partie en', options: [5, 7, 11], default: 7 },
            {
                id: 'envoi', type: 'select', label: 'Qui fabrique le calcul ?',
                aide: 'En automatique, la machine tire un produit de la table annoncée : le duel va vite, et c\'est du calcul pur. En composé, celui qui frappe TAPE son calcul — « tiens, je te mets du 7 × 8 » — on voit la brique se préparer, puis il la lance. Choisir ce qu\'on envoie, c\'est déjà savoir lesquels sont durs, et c\'est là qu\'est le chambrage. L\'un des deux facteurs doit rester dans les tables travaillées.',
                options: [
                    { value: 'auto', label: 'La machine tire le calcul' },
                    { value: 'compose', label: 'Le joueur compose sa brique' }
                ],
                default: 'auto'
            },
            {
                id: 'rythme', type: 'select', label: 'Rythme de la balle',
                aide: 'Ce qui change n\'est pas seulement la vitesse de départ : c\'est aussi le plancher — jusqu\'où la balle accélère — et la pente. Un départ lent suivi d\'une accélération brutale redonne exactement le sentiment d\'aller trop vite. Tranquille laisse le temps de lire, calculer et taper ; Rapide s\'adresse à qui connaît déjà ses tables.',
                options: [
                    { value: 'tranquille', label: 'Tranquille — on a le temps de penser' },
                    { value: 'normal', label: 'Normal' },
                    { value: 'rapide', label: 'Rapide — pour qui sait ses tables' }
                ],
                default: 'tranquille'
            },
            {
                id: 'operations', type: 'select', label: 'Opérations',
                aide: 'Sans effet en mode composé : on n\'y compose que des multiplications.',
                options: [
                    { value: 'mul', label: 'Multiplications seules' },
                    { value: 'muldiv', label: 'Multiplications et divisions' }
                ],
                default: 'mul'
            }
        ],
        motsClefs: ['tables', 'multiplication'],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        deuxJoueurs: true,
        instruction: "À DEUX, sur une tablette posée à plat entre vous. Le serveur choisit une table, puis la balle fait des allers-retours : celui qui la reçoit tape le résultat avant qu'elle n'atteigne sa ligne. Elle accélère à chaque renvoi. Rien n'est enregistré dans le carnet — c'est un duel."
    },
    {
        id: 'calc-arpenteurs', status: STATUS.TEST, title: 'Les Arpenteurs',
        cree: '2026-08-10',
        // Clôturer une parcelle rectangulaire, c'est lire un produit comme une
        // aire : les deux compétences travaillent ensemble, sur le même geste.
        activityId: 'arpenteurs', skills: ['num.mult.table.*', 'mes.aire.rectangle'],
        deuxJoueurs: true,
        // À deux sur un seul compte : attribuer les coups de l'un aux
        // statistiques de l'autre ne voudrait rien dire. Rien n'est enregistré,
        // comme pour le Duel des Tables.
        sansRevision: true,
        params: { terrain: 'moyen', table: 10, bandes: false, joueurs: 2, forceIA: 'normal' },
        paramSchema: [
            {
                id: 'joueurs', type: 'select', label: 'Qui joue ?',
                aide: 'Contre l\'ordinateur, la machine cherche les parcelles qui abîment le moins le terrain — celles qui se collent à un bord ou à une clôture déjà posée. C\'est exactement le raisonnement qu\'on veut voir chez l\'élève, et il peut le rattraper. Seul, on clôture jusqu\'à ce que plus rien ne rentre, et la partie se juge à la surface conquise.',
                options: [
                    { value: 2, label: 'À deux, sur la même tablette' },
                    { value: 'ia', label: 'Contre l\'ordinateur' },
                    { value: 1, label: 'Seul, contre le terrain' }
                ],
                default: 2
            },
            {
                id: 'forceIA', type: 'select', label: 'Force de l\'ordinateur', default: 'normal',
                aide: 'Débutant pose au hasard parmi les coups valables : on le bat en réfléchissant, ce qui est le but. Normal choisit la parcelle qui touche le plus de bords et de clôtures, avec un peu de désordre. Fort prend toujours la meilleure. N\'a d\'effet que contre l\'ordinateur.',
                options: [
                    { value: 'debutant', label: 'Débutant — joue au hasard' },
                    { value: 'normal', label: 'Normal' },
                    { value: 'fort', label: 'Fort — ne laisse rien' }
                ]
            },
            {
                id: 'terrain', type: 'select', label: 'Taille du terrain',
                options: [
                    { value: 'petit', label: '18 × 12 — partie rapide' },
                    { value: 'moyen', label: '24 × 16' },
                    { value: 'grand', label: '30 × 20 — partie longue' }
                ],
                default: 'moyen'
            },
            {
                id: 'table', type: 'select', label: 'Nombres tirés',
                aide: 'Les nombres viennent de la table de Pythagore. En s\'arrêtant à 7, les parcelles restent petites et la partie plus longue.',
                options: [
                    { value: 7, label: 'Jusqu\'à 7 × 7' },
                    { value: 10, label: 'Toute la table (jusqu\'à 10 × 10)' }
                ],
                default: 10
            },
            {
                id: 'bandes', type: 'checkbox', label: 'Autoriser les bandes d\'une case',
                aide: 'Une bande de 1 case de large reste presque toujours posable : la fin de partie devient un remplissage mécanique, sans plus rien à décomposer.',
                default: false
            }
        ],
        motsClefs: ['tables', 'multiplication'],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "À DEUX sur la même tablette, ou CONTRE L'ORDINATEUR. Un nombre de la table de Pythagore tombe — 36 — et celui dont c'est le tour clôture une parcelle de 36 cases : 6 × 6, 4 × 9, 3 × 12, comme il veut, où il veut. Glisse le doigt d'un coin à l'autre : l'aire s'affiche pendant le tracé. Le premier qui ne peut plus poser a perdu. Rien n'est enregistré dans le profil : c'est un duel."
    },
    {
        // LES ANAGRAMMES DU VOCABULAIRE. Rémy : « j'aimerais bien aussi un
        // anagramme de mot mathématique, par exemple RACER est l'anagramme de
        // CARRE. » Les mots cachés font chercher des LETTRES dans une grille ;
        // ici on a déjà toutes les lettres, et c'est le MOT DU COURS qu'on
        // cherche — celui que la définition décrit. Deux exercices voisins,
        // deux travaux différents, un seul lexique.
        id: 'voc-anagrammes', status: STATUS.TEST, title: 'Anagrammes du Vocabulaire',
        cree: '2026-08-19',
        activityId: 'anagrammes', skills: ['voc.mathematique'],
        // Un mot cherché puis trouvé n'a rien à réviser : ce qui compte est de
        // l'avoir rencontré. Les essais restent au compteur de la séance.
        sansRevision: true,
        params: { theme: 'tout', niveauMax: 3, longueurMin: 4, definition: 'toujours' },
        paramSchema: [
            {
                id: 'theme', type: 'select', label: 'Vocabulaire',
                options: [
                    { value: 'tout', label: 'Tout le vocabulaire' },
                    { value: 'geometrie', label: 'Géométrie' },
                    { value: 'angles', label: 'Le vocabulaire des angles' },
                    { value: 'nombres', label: 'Les nombres' },
                    { value: 'calcul', label: 'Les opérations' },
                    { value: 'mesures', label: 'Grandeurs et mesures' }
                ],
                default: 'tout'
            },
            {
                id: 'definition', type: 'select', label: 'La définition',
                aide: 'Affichée d\'emblée, elle fait de l\'exercice un travail de vocabulaire : on lit, on reconnaît le mot du cours, on le compose. Différée, il faut d\'abord chercher DANS LES LETTRES — c\'est le vrai jeu d\'anagramme, et c\'est nettement plus difficile.',
                options: [
                    { value: 'toujours', label: 'Donnée tout de suite' },
                    { value: 'apres', label: 'Après un premier essai' },
                    { value: 'jamais', label: 'Jamais — les lettres seules' }
                ],
                default: 'toujours'
            },
            {
                id: 'longueurMin', type: 'select', label: 'Longueur des mots',
                aide: 'Les mots courts se retrouvent en essayant ; à partir de sept lettres, on ne peut plus procéder au hasard — il faut avoir le mot en tête.',
                options: [
                    { value: 4, label: 'À partir de 4 lettres' },
                    { value: 6, label: 'À partir de 6 lettres' },
                    { value: 8, label: 'À partir de 8 lettres — les mots longs' }
                ],
                default: 4
            },
            {
                id: 'niveauMax', type: 'select', label: 'Jusqu\'à quel niveau',
                options: [
                    { value: 1, label: 'Le vocabulaire de base' },
                    { value: 2, label: 'Jusqu\'au cycle 3' },
                    { value: 3, label: 'Tout, collège compris' }
                ],
                default: 3
            }
        ],
        motsClefs: ['anagramme', 'vocabulaire', 'lettres', 'mots', 'lexique'],
        tags: {
            chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.LOGIQUE],
            niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME, TAGS.NIVEAU.QUATRIEME]
        },
        instruction: "Les lettres d'un mot de mathématiques, dans le désordre — RACER, c'est CARRE. Elles y sont TOUTES, et chacune une seule fois : le tas se vide exactement quand le mot est écrit. Lis la définition, puis pose les lettres une à une ; touche une lettre déjà posée pour la reprendre. L'indice découvre le début du mot, jamais une lettre au milieu — on ne saurait pas où la rattacher."
    },
    {
        // LES MOTS CROISÉS. Rémy : « des mots croisés — par exemple sur le
        // vocabulaire d'angle. Il faut que la grille soit optimisée. Ou sur le
        // vocabulaire des opérations. » Une grille où les mots ne se touchent
        // presque pas est une liste de définitions déguisée : on répond dans
        // le désordre et rien n'aide rien. Le générateur fabrique donc une
        // dizaine de grilles et garde la plus SERRÉE — c'est le chaînage qui
        // fait l'exercice.
        id: 'voc-mots-croises', status: STATUS.TEST, title: 'Mots Croisés Mathématiques',
        cree: '2026-08-19',
        activityId: 'mots-croises', skills: ['voc.mathematique'],
        sansRevision: true,
        params: { theme: 'angles', niveauMax: 3, nbMots: 10 },
        paramSchema: [
            {
                id: 'theme', type: 'select', label: 'Vocabulaire',
                aide: 'Une grille sur UN chapitre vaut mieux qu\'une grille sur tout : les mots se ressemblent, se croisent mieux, et la révision porte sur une leçon précise.',
                options: [
                    { value: 'angles', label: 'Le vocabulaire des angles' },
                    { value: 'calcul', label: 'Les opérations' },
                    { value: 'geometrie', label: 'Géométrie' },
                    { value: 'nombres', label: 'Les nombres' },
                    { value: 'mesures', label: 'Grandeurs et mesures' },
                    { value: 'tout', label: 'Tout le vocabulaire' }
                ],
                default: 'angles'
            },
            {
                id: 'nbMots', type: 'select', label: 'Nombre de mots',
                aide: 'Plus il y a de mots, plus la grille est grande — et plus elle se croise. Six mots tiennent sur un téléphone ; quatorze demandent une tablette.',
                options: [
                    { value: 6, label: '6 mots — grille courte' },
                    { value: 10, label: '10 mots' },
                    { value: 14, label: '14 mots — grille de journal' }
                ],
                default: 10
            },
            {
                id: 'niveauMax', type: 'select', label: 'Jusqu\'à quel niveau',
                options: [
                    { value: 1, label: 'Le vocabulaire de base' },
                    { value: 2, label: 'Jusqu\'au cycle 3' },
                    { value: 3, label: 'Tout, collège compris' }
                ],
                default: 3
            }
        ],
        motsClefs: ['mots croisés', 'vocabulaire', 'définitions', 'grille', 'lexique', 'angles'],
        tags: {
            chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.LOGIQUE],
            niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME, TAGS.NIVEAU.QUATRIEME]
        },
        instruction: "Une grille de mots croisés dont toutes les définitions portent sur le même chapitre. Touche une case pour viser le mot qui passe par elle ; touche-la une seconde fois pour passer à l'autre sens. Les lettres se tapent sur le pavé du bas — une case fait une lettre, et le clavier de la tablette recouvrirait la grille. On ne répond pas dans l'ordre des numéros : on commence par le mot dont on est sûr, et chaque lettre posée en donne d'autres aux mots qui le croisent. « Vérifier » ne montre que les lettres FAUSSES."
    },
    {
        // LA PIPOPIPETTE. Rémy : « j'aimerai bien le jeu pipopipette ». Le jeu
        // d'Édouard Lucas (1889) — et un vrai problème de PARITÉ : passé la
        // moitié de la partie, le plateau se découpe en chaînes de carrés, et
        // celui qui doit en ouvrir une la donne tout entière. Le « double
        // croix » — laisser deux carrés au lieu d'en prendre quatre, pour
        // garder la main — est souvent la première fois qu'un enfant renonce à
        // un gain immédiat par calcul.
        id: 'logi-pipopipette', status: STATUS.TEST, title: 'La Pipopipette',
        cree: '2026-08-19',
        activityId: 'pipopipette', horsProgression: true, sansRevision: true,
        deuxJoueurs: true,
        params: { mode: 'ia', niveau: 'moyen', taille: 'moyen' },
        paramSchema: [
            {
                id: 'mode', type: 'select', label: 'Ce qu\'on fait',
                options: [
                    { value: 'ia', label: 'Une partie contre l\'ordinateur' },
                    { value: 'deux', label: 'Une partie à deux sur le même écran' }
                ],
                default: 'ia'
            },
            {
                id: 'niveau', type: 'select', label: 'Niveau de l\'ordinateur',
                aide: 'Deux réglages en un : jusqu\'où l\'ordinateur calcule, et sa part de coups joués au hasard — c\'est elle qui le rend battable.',
                options: [
                    { value: 'facile', label: 'Débutant — il se trompe souvent' },
                    { value: 'moyen', label: 'Moyen' },
                    { value: 'fort', label: 'Fort — il ne se trompe plus' }
                ],
                default: 'moyen'
            },
            {
                id: 'taille', type: 'select', label: 'Taille du plateau',
                aide: 'Un petit plateau se finit en cinq minutes et laisse déjà voir les chaînes ; le grand est une vraie partie.',
                options: [
                    { value: 'petit', label: '3 × 3 carrés — partie rapide' },
                    { value: 'moyen', label: '5 × 4 carrés' },
                    { value: 'grand', label: '7 × 6 carrés — partie longue' }
                ],
                default: 'moyen'
            }
        ],
        motsClefs: ['pipopipette', 'petits carrés', 'lucas', 'parité', 'deux joueurs'],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.LOGIQUE], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME, TAGS.NIVEAU.QUATRIEME] },
        instruction: "Trace un trait entre deux points voisins. Celui qui pose le QUATRIÈME côté d'un carré le marque à son nom — et il REJOUE. Tout le jeu est là : poser le troisième côté d'un carré l'offre à l'adversaire, et comme il rejoue, il prend toute la file derrière. En fin de partie, il ne reste que des chaînes, et celui qui doit en ouvrir une la donne entièrement : on compte donc les chaînes avant de poser."
    },
    {
        // LE PUISSANCE 4. « Et aussi le puissance 4. » Le jeton TOMBE : on ne
        // choisit pas la case, on choisit la colonne — et poser sous une case
        // gagnante la donne à l'adversaire.
        id: 'logi-puissance4', status: STATUS.TEST, title: 'Puissance 4',
        cree: '2026-08-19',
        activityId: 'puissance4', horsProgression: true, sansRevision: true,
        deuxJoueurs: true,
        params: { mode: 'ia', niveau: 'moyen' },
        paramSchema: [
            {
                id: 'mode', type: 'select', label: 'Ce qu\'on fait',
                options: [
                    { value: 'ia', label: 'Une partie contre l\'ordinateur' },
                    { value: 'deux', label: 'Une partie à deux sur le même écran' }
                ],
                default: 'ia'
            },
            {
                id: 'niveau', type: 'select', label: 'Niveau de l\'ordinateur',
                aide: 'Deux réglages en un : jusqu\'où l\'ordinateur calcule, et sa part de coups joués au hasard — c\'est elle qui le rend battable.',
                options: [
                    { value: 'facile', label: 'Débutant — il se trompe souvent' },
                    { value: 'moyen', label: 'Moyen' },
                    { value: 'fort', label: 'Fort — il ne se trompe plus' }
                ],
                default: 'moyen'
            }
        ],
        motsClefs: ['puissance 4', 'aligner', 'quatre', 'deux joueurs', 'connect'],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.LOGIQUE], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME, TAGS.NIVEAU.QUATRIEME] },
        instruction: "Touche une colonne : ton jeton tombe au fond. Le premier qui en aligne QUATRE gagne — en ligne, en colonne ou en diagonale. Ce qui rend le jeu difficile est la gravité : on ne choisit pas la case, et poser un jeton sous une case gagnante la donne à l'adversaire. Le centre vaut plus que les bords, parce que c'est par là que passent le plus d'alignements possibles."
    },
    {
        // LE SIM. « Et le sim. » Un jeu qu'on ne gagne pas, qu'on ÉVITE de
        // perdre — et surtout une illustration jouable du théorème de Ramsey :
        // R(3,3) = 6, donc sur les quinze arêtes d'un hexagone complet
        // coloriées de deux couleurs, un triangle monochrome est INÉVITABLE.
        // Le match nul n'existe pas, et c'est démontrable.
        id: 'logi-sim', status: STATUS.TEST, title: 'Le Sim',
        cree: '2026-08-19',
        activityId: 'sim', horsProgression: true, sansRevision: true,
        deuxJoueurs: true,
        params: { mode: 'ia', niveau: 'moyen' },
        paramSchema: [
            {
                id: 'mode', type: 'select', label: 'Ce qu\'on fait',
                options: [
                    { value: 'ia', label: 'Une partie contre l\'ordinateur' },
                    { value: 'deux', label: 'Une partie à deux sur le même écran' }
                ],
                default: 'ia'
            },
            {
                id: 'niveau', type: 'select', label: 'Niveau de l\'ordinateur',
                aide: 'Deux réglages en un : jusqu\'où l\'ordinateur calcule, et sa part de coups joués au hasard — c\'est elle qui le rend battable.',
                options: [
                    { value: 'facile', label: 'Débutant — il se trompe souvent' },
                    { value: 'moyen', label: 'Moyen' },
                    { value: 'fort', label: 'Fort — il ne se trompe plus' }
                ],
                default: 'moyen'
            }
        ],
        motsClefs: ['sim', 'triangle', 'ramsey', 'graphe', 'deux joueurs', 'hexagone'],
        tags: { chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.LOGIQUE], niveaux: [TAGS.NIVEAU.CINQUIEME, TAGS.NIVEAU.QUATRIEME, TAGS.NIVEAU.TROISIEME] },
        instruction: "Six points, et les quinze segments qui les relient tous. Chacun son tour, on colorie un segment de SA couleur — et celui qui forme le premier un triangle de sa propre couleur A PERDU. On ne cherche donc pas à construire, on cherche à ne pas construire, ce qui est déroutant. Et l'on ne peut pas y couper indéfiniment : sur quinze segments de deux couleurs, un triangle d'une seule couleur est inévitable. C'est un théorème (Ramsey, R(3,3) = 6), et il se vérifie à la main."
    },
    {
        id: 'voc-mots-caches', status: STATUS.TEST, title: 'Mots Cachés Mathématiques',
        cree: '2026-08-10',
        activityId: 'motscaches', skills: ['voc.mathematique'],
        // SUR LE PAPIER, PERSONNE NE VALIDE : il faut entourer, donc être sûr.
        // Et la fiche sait faire ce que l'écran ne fait pas — ne donner que les
        // DÉFINITIONS, et laisser retrouver le mot du cours avant de le
        // chercher dans la grille.
        printable: 'motscaches', printGeneratorId: 'voc.mots-caches-fiche',
        printParams: { theme: 'tout', taille: 12, nbMots: 10, indices: 'mots', diagonales: true },
        // Les erreurs n'ont rien à réviser ici : un tracé raté est un essai, pas
        // une faute, et le jeu n'en enregistre aucun.
        sansRevision: true,
        params: { theme: 'tout', taille: 12, nbMots: 10, diagonales: true, envers: false },
        paramSchema: [
            {
                id: 'theme', type: 'select', label: 'Vocabulaire',
                options: [
                    { value: 'tout', label: 'Tout le vocabulaire' },
                    { value: 'geometrie', label: 'Géométrie' },
                    { value: 'angles', label: 'Le vocabulaire des angles' },
                    { value: 'nombres', label: 'Les nombres' },
                    { value: 'calcul', label: 'Les opérations' },
                    { value: 'mesures', label: 'Grandeurs et mesures' }
                ],
                default: 'tout'
            },
            {
                id: 'taille', type: 'select', label: 'Taille de la grille',
                options: [
                    { value: 10, label: '10 × 10' },
                    { value: 12, label: '12 × 12' },
                    { value: 14, label: '14 × 14' },
                    { value: 16, label: '16 × 16 — pour les mots longs' }
                ],
                default: 12
            },
            {
                id: 'nbMots', type: 'select', label: 'Nombre de mots',
                options: [
                    { value: 6, label: '6 mots' },
                    { value: 10, label: '10 mots' },
                    { value: 14, label: '14 mots' }
                ],
                default: 10
            },
            {
                id: 'diagonales', type: 'checkbox', label: 'Mots en diagonale',
                aide: 'Sans les diagonales, la grille se lit uniquement en lignes et en colonnes — nettement plus facile.',
                default: true
            },
            {
                id: 'envers', type: 'checkbox', label: 'Mots écrits à l\'envers',
                aide: 'De droite à gauche et de bas en haut : à réserver aux élèves qui trouvent la grille trop rapide.',
                default: false
            }
        ],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.LOGIQUE], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME, TAGS.NIVEAU.QUATRIEME] },
        instruction: "Glisse ton doigt de la première à la dernière lettre pour tracer un mot. Chaque mot trouvé affiche SA DÉFINITION : c'est le vocabulaire que ton cours emploie sans toujours l'expliquer. Le bouton 💡 fait l'inverse — il donne la définition, à toi de retrouver le mot."
    },
    {
        id: 'calc-chantier', status: STATUS.TEST, title: 'Le Chantier des Blocs',
        cree: '2026-08-10',
        activityId: 'chantier', skills: ['num.mult.table.*'],
        params: { depart: 'ch1' },
        paramSchema: [
            {
                id: 'depart', type: 'select', label: 'Commencer au niveau',
                aide: 'Les niveaux s\'enchaînent tout seuls, du plus court au plus long ; ce réglage sert à reprendre plus loin ou à montrer directement un niveau à deux résultats identiques.',
                // La liste se CONSTRUIT depuis les niveaux, et chaque ligne
                // porte sa longueur de solution : cent titres dans un menu
                // déroulant ne se choisissent pas sans savoir lequel demande
                // trois poussées et lequel en demande douze. Recopiée à la
                // main, la liste avait déjà divergé une fois.
                options: NIVEAUX_CHANTIER.map((n, i) => ({ value: n.id, label: `${i + 1} · ${n.titre} — ${n.coups} coup${n.coups > 1 ? 's' : ''}` })),
                default: 'ch1'
            }
        ],
        motsClefs: ['tables', 'multiplication'],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Chaque bloc porte une multiplication, chaque dalle creuse porte un résultat. Un bloc poussé GLISSE jusqu'au premier obstacle : s'il s'arrête sur la dalle qui porte son résultat, il se pose — et devient lui-même un mur. Touche un bloc, puis la case d'arrivée (ou balaye du doigt). Sur les derniers niveaux, deux blocs valent la même chose : le calcul ne suffit plus, il faut choisir lequel va où."
    },
    {
        // Trois jeux de plateau, un seul moteur d'affichage (games/plateau.js)
        // et une seule IA (core/ia.js). Les règles, testées sans navigateur,
        // vivent chacune dans leur module — les échecs validés au perft.
        //
        // HORS PROGRESSION, ET ASSUMÉ. Othello, les Dames et les Échecs
        // n'entraînent aucune notion du programme : ce sont des jeux de la
        // réserve, ceux qu'on donne en récompense ou en fin d'heure. Le
        // déclarer est obligatoire — un exercice qui ne dit rien est refusé.
        id: 'logi-othello', status: STATUS.TEST, title: 'Othello',
        cree: '2026-08-11',
        activityId: 'othello', horsProgression: true,
        params: { mode: 'ia', niveau: 'moyen', depart: 'debut' },
        paramSchema: [
            {
                id: 'mode', type: 'select', label: 'Ce qu\'on fait',
                aide: 'Le mode EXERCICE ne joue pas de partie : il pose une position figée et demande le mat. Cent neuf positions rangées du plus simple au plus difficile, toutes vérifiées par le solveur — une solution, et une seule.',
                options: [
                    { value: 'ia', label: "Une partie contre l'ordinateur" },
                    { value: 'deux', label: 'Une partie à deux sur le même écran' },
                    { value: 'exercice', label: 'Exercices : mat en un, mat en deux' }
                ],
                default: 'ia'
            },
            {
                id: 'depart', type: 'select', label: 'Où commencer les exercices',
                aide: 'La progression est dans le matériel : on commence par une dame qui fait tout le travail, on finit par deux tours qui doivent se coordonner en deux coups.',
                options: [
                    { value: 'debut', label: 'Au début — la dame qui mate seule' },
                    { value: 'milieu', label: 'Plus loin — tours et cavaliers' },
                    { value: 'deux', label: 'Directement aux mats en deux coups' }
                ],
                default: 'debut'
            },
            {
                id: 'niveau', type: 'select', label: "Niveau de l'ordinateur",
                aide: "Deux réglages en un : jusqu'où l'ordinateur calcule, et sa part de coups joués au hasard — c'est elle qui le rend battable.",
                options: [
                    { value: 'facile', label: 'Débutant — il se trompe souvent' },
                    { value: 'moyen', label: 'Moyen' },
                    { value: 'fort', label: 'Fort — il ne se trompe plus' }
                ],
                default: 'moyen'
            }
        ],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.LOGIQUE], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME, TAGS.NIVEAU.QUATRIEME] },
        instruction: "Un pion posé ENCADRE : tous les pions adverses pris entre lui et un autre de tes pions se retournent. On ne joue que là où l'on retourne au moins un pion — les cases allumées te les montrent. À la fin, celui qui a le plus de pions gagne. Les coins ne se reprennent jamais : vise-les, et méfie-toi des cases qui les touchent."
    },
    {
        id: 'logi-dames', status: STATUS.TEST, title: 'Jeu de Dames',
        cree: '2026-08-11',
        activityId: 'dames', horsProgression: true,
        params: { mode: 'ia', niveau: 'moyen', depart: 'debut' },
        paramSchema: [
            {
                id: 'mode', type: 'select', label: 'Ce qu\'on fait',
                aide: 'Le mode EXERCICE ne joue pas de partie : il pose une position figée et demande le mat. Cent neuf positions rangées du plus simple au plus difficile, toutes vérifiées par le solveur — une solution, et une seule.',
                options: [
                    { value: 'ia', label: "Une partie contre l'ordinateur" },
                    { value: 'deux', label: 'Une partie à deux sur le même écran' },
                    { value: 'exercice', label: 'Exercices : mat en un, mat en deux' }
                ],
                default: 'ia'
            },
            {
                id: 'depart', type: 'select', label: 'Où commencer les exercices',
                aide: 'La progression est dans le matériel : on commence par une dame qui fait tout le travail, on finit par deux tours qui doivent se coordonner en deux coups.',
                options: [
                    { value: 'debut', label: 'Au début — la dame qui mate seule' },
                    { value: 'milieu', label: 'Plus loin — tours et cavaliers' },
                    { value: 'deux', label: 'Directement aux mats en deux coups' }
                ],
                default: 'debut'
            },
            {
                id: 'niveau', type: 'select', label: "Niveau de l'ordinateur",
                aide: "Deux réglages en un : jusqu'où l'ordinateur calcule, et sa part de coups joués au hasard — c'est elle qui le rend battable.",
                options: [
                    { value: 'facile', label: 'Débutant — il se trompe souvent' },
                    { value: 'moyen', label: 'Moyen' },
                    { value: 'fort', label: 'Fort — il ne se trompe plus' }
                ],
                default: 'moyen'
            }
        ],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.LOGIQUE], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME, TAGS.NIVEAU.QUATRIEME] },
        instruction: "Les vraies règles françaises, sur le damier 10 × 10 : la prise est OBLIGATOIRE, et quand plusieurs rafles sont possibles, on joue celle qui prend le PLUS de pièces — compte avant de bouger. Le pion avance tout droit mais prend aussi en arrière ; arrivé au bout, il devient dame, et la dame vole sur toute la diagonale. Touche une pièce : ses coups s'allument."
    },
    {
        id: 'logi-echecs', status: STATUS.TEST, title: 'Échecs',
        cree: '2026-08-11',
        // La partie elle-même n'est pas au programme. Le REPÉRAGE l'est, et
        // c'est l'exercice « mat en un » qui le travaille, pas celui-ci.
        activityId: 'echecs', horsProgression: true,
        // L'ÉCHIQUIER EST UN REPÈRE. « e4 » n'est pas du jargon : c'est une
        // lettre de colonne et un chiffre de ligne, la même chose qu'un couple
        // de coordonnées — et qu'un B3 de tableur.
        printable: 'echiquier', printGeneratorId: 'logi.echecs-fiche',
        printParams: { quoi: 'melange', pieces: 4 },
        consignePapier: "La lettre d'abord, le chiffre ensuite : e4.",
        params: { mode: 'ia', niveau: 'moyen', depart: 'debut' },
        paramSchema: [
            {
                id: 'mode', type: 'select', label: 'Ce qu\'on fait',
                aide: 'Le mode EXERCICE ne joue pas de partie : il pose une position figée et demande le mat. Cent neuf positions rangées du plus simple au plus difficile, toutes vérifiées par le solveur — une solution, et une seule.',
                options: [
                    { value: 'ia', label: "Une partie contre l'ordinateur" },
                    { value: 'deux', label: 'Une partie à deux sur le même écran' },
                    { value: 'exercice', label: 'Exercices : mat en un, mat en deux' }
                ],
                default: 'ia'
            },
            {
                id: 'depart', type: 'select', label: 'Où commencer les exercices',
                aide: 'La progression est dans le matériel : on commence par une dame qui fait tout le travail, on finit par deux tours qui doivent se coordonner en deux coups.',
                options: [
                    { value: 'debut', label: 'Au début — la dame qui mate seule' },
                    { value: 'milieu', label: 'Plus loin — tours et cavaliers' },
                    { value: 'deux', label: 'Directement aux mats en deux coups' }
                ],
                default: 'debut'
            },
            {
                id: 'niveau', type: 'select', label: "Niveau de l'ordinateur",
                aide: "Deux réglages en un : jusqu'où l'ordinateur calcule, et sa part de coups joués au hasard — c'est elle qui le rend battable.",
                options: [
                    { value: 'facile', label: 'Débutant — il se trompe souvent' },
                    { value: 'moyen', label: 'Moyen' },
                    { value: 'fort', label: 'Fort — il ne se trompe plus' }
                ],
                default: 'moyen'
            }
        ],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.LOGIQUE], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME, TAGS.NIVEAU.QUATRIEME, TAGS.NIVEAU.TROISIEME] },
        instruction: "Trois usages. UNE PARTIE, contre l'ordinateur ou à deux : touche une pièce, ses coups s'allument, touche la case d'arrivée. Toutes les règles y sont, roque et prise en passant compris. Ou bien les EXERCICES : cent neuf positions figées où les Blancs jouent et matent, rangées du plus simple au plus difficile. Un mat, c'est un échec dont le roi ne peut pas sortir — ni fuir, ni parer en s'interposant, ni prendre la pièce qui attaque. Quand ton coup n'est pas le bon, on ne te donne pas la réponse : on te dit ce qui manque. Et méfie-toi du PAT — les Noirs sans coup mais SANS être en échec, c'est une partie nulle, pas une victoire."
    },
    {
        // LE LOGIGRAMME. Un seul exercice, six niveaux : c'est la MÊME grille de
        // déduction qui grandit, et l'élève retrouve à chaque fois les deux
        // règles qu'il connaît déjà. Un exercice par niveau aurait éparpillé
        // dans le catalogue ce qui est une seule progression.
        id: 'logi-logigramme', status: STATUS.TEST, title: 'Le Logigramme',
        cree: '2026-08-12',
        activityId: 'logigramme',
        // Le générateur ne sert PAS à l'écran (l'activité mène son propre jeu) :
        // il sert au PAPIER. Un logigramme se fait d'abord au crayon, en rayant
        // et en revenant en arrière — c'est un des exercices qui gagnent le
        // plus à sortir de l'écran.
        generatorId: 'logique.logigramme', printable: 'logigramme',
        sansRevision: true,
        skills: ['num.logique.logigramme'],
        params: { niveau: 1, auto: false },
        paramSchema: [
            {
                id: 'niveau', type: 'select', label: 'Niveau',
                options: [
                    { value: 1, label: '1 — Découverte · 3 lignes, 2 listes' },
                    { value: 2, label: '2 — Trois amis, deux listes · indices croisés' },
                    { value: 3, label: '3 — Quatre à croiser · plus rien de donné' },
                    { value: 4, label: '4 — Plus grand, plus petit · comparaisons' },
                    { value: 5, label: '5 — L\'écart exact · différences chiffrées' },
                    { value: 6, label: '6 — Cinq, et rien de donné · avec des « soit… soit… »' }
                ],
                default: 1
            },
            {
                id: 'auto', type: 'bool', label: 'Barrer la ligne automatiquement',
                default: false
            },
            {
                id: 'theme', type: 'select', label: 'Histoire',
                options: [
                    { value: '', label: 'Au hasard' },
                    { value: 'gouter', label: 'Le goûter d\'anniversaire' },
                    { value: 'mediatheque', label: 'À la médiathèque' },
                    { value: 'potager', label: 'Le potager de l\'école' },
                    { value: 'kermesse', label: 'La kermesse' },
                    { value: 'club', label: 'Le club du mercredi' }
                ],
                default: ''
            }
        ],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.LOGIQUE], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME, TAGS.NIVEAU.QUATRIEME, TAGS.NIVEAU.TROISIEME] },
        instruction: "On croise des listes : chaque personne a UNE valeur dans chaque colonne, et chaque valeur ne sert qu'une fois. Clique une case pour la barrer (impossible), clique encore pour la cocher (certain). Deux règles suffisent : dès qu'une case est cochée, sa ligne et sa colonne se barrent ; et s'il ne reste qu'une case non barrée dans une ligne, c'est elle. On ne devine JAMAIS — si rien ne s'impose, c'est qu'un indice n'a pas encore été relu."
    },
    {
        // LE PEINTRE. D'après Skweek, le jeu de Loriciels : une bête rose
        // repeint le sol en marchant dessus. Ici chaque dalle porte un calcul
        // et le niveau annonce sa règle : marcher sur une dalle qui la vérifie
        // la repeint, marcher sur une autre la fait s'effriter. Soixante
        // dalles, soixante calculs — et l'élève TRIE en se déplaçant au lieu
        // de répondre.
        //
        // L'identifiant reste « calc-skweek » : le renommer effacerait les
        // statistiques et les parcours déjà enregistrés sous ce nom.
        id: 'calc-skweek', status: STATUS.TEST, title: 'Le Peintre',
        cree: '2026-08-12',
        activityId: 'skweek',
        sansRevision: true,
        skills: ['num.calc.tri'],
        params: { niveau: 1, vies: 3, ennemis: 'non' },
        paramSchema: [
            {
                id: 'niveau', type: 'select', label: 'Niveau de départ',
                options: [
                    { value: 1, label: '1 — Les résultats pairs' },
                    { value: 2, label: '2 — Les multiples de 3' },
                    { value: 3, label: '3 — Les multiples de 5' },
                    { value: 4, label: '4 — Plus grands que 30' },
                    { value: 5, label: '5 — Les multiples de 4' },
                    { value: 6, label: '6 — Entre 20 et 40' }
                ],
                default: 1
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
                id: 'ennemis', type: 'select', label: 'Les blobs verts',
                aide: 'Au doigt, esquiver un blob pendant qu\'on décide si 7 × 4 est pair fait un jeu d\'adresse là où l\'on voulait un jeu de calcul — et l\'adresse, sur un écran de téléphone, est celle du matériel plutôt que celle de l\'élève. Ils sont retirés par défaut ; au clavier, ils rendent les derniers niveaux plus vifs.',
                options: [
                    { value: 'non', label: 'Pas de blobs — que du calcul' },
                    { value: 'oui', label: 'Avec les blobs, à partir du niveau 2' }
                ],
                default: 'non'
            }
        ],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "La règle est écrite en haut : repeins SEULEMENT les dalles dont le calcul la vérifie. Marcher sur une bonne dalle la repeint en rose ; marcher sur une autre la fait s'effriter et tu perds du terrain. Lis avant d'avancer ! Flèches du clavier, croix tactile ou glissé sur le terrain. Les blobs verts sont retirés par défaut — le réglage les rend, et alors le bouton TIR les élimine, tandis que le bouton 🎯 (ou MAJ + flèche au clavier) tourne la tête SANS avancer : on vise un blob sans repeindre au passage une dalle qu'on n'avait pas choisie."
    },
    {
        // LE SLITHERLINK. Une seule boucle fermée sur un quadrillage de points,
        // dictée par des chiffres qui comptent les côtés. Deux règles suffisent
        // — le chiffre et le point — et jamais besoin de deviner : la grille
        // est fabriquée pour se déduire par propagation pure.
        id: 'logi-slitherlink', status: STATUS.TEST, title: 'Le Slitherlink',
        cree: '2026-08-13',
        activityId: 'slitherlink',
        generatorId: 'logique.slitherlink', printable: 'slitherlink',
        sansRevision: true,
        skills: ['num.logique.slitherlink'],
        params: { taille: 'moyen', difficulte: 'moyen' },
        paramSchema: [
            {
                id: 'taille', type: 'select', label: 'Taille de la grille',
                options: [
                    { value: 'petit', label: '5 \u00d7 5' },
                    { value: 'moyen', label: '7 \u00d7 7' },
                    { value: 'grand', label: '10 \u00d7 8' }
                ],
                default: 'moyen'
            },
            {
                id: 'difficulte', type: 'select', label: 'Difficult\u00e9',
                options: [
                    { value: 'facile', label: 'Facile \u2014 beaucoup de chiffres' },
                    { value: 'moyen', label: 'Moyen' },
                    { value: 'difficile', label: 'Difficile \u2014 peu de chiffres' }
                ],
                default: 'moyen'
            }
        ],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.LOGIQUE], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Trace UNE seule boucle ferm\u00e9e qui ne se croise ni ne se touche. Chaque chiffre dit combien des quatre c\u00f4t\u00e9s de sa case font partie de la boucle ; une case sans chiffre ne dit rien. Touche un segment pour le tracer, encore une fois pour le barrer d'une croix, encore une fois pour l'effacer \u2014 et glisse le doigt pour encha\u00eener. Un point porte toujours deux segments ou aucun."
    },
    {
        // LE FUTOSHIKI. Un carré latin sous inégalités : le puzzle qui fait de
        // la COMPARAISON un outil de déduction. Généré à solution unique,
        // résoluble par propagation pure — jamais d'essai-erreur.
        id: 'logi-futoshiki', status: STATUS.TEST, title: 'Le Futoshiki',
        cree: '2026-08-12',
        activityId: 'futoshiki',
        generatorId: 'logique.futoshiki', printable: 'futoshiki',
        sansRevision: true,
        skills: ['num.logique.futoshiki'],
        params: { taille: 4, difficulte: 'facile' },
        paramSchema: [
            {
                id: 'taille', type: 'select', label: 'Taille',
                options: [
                    { value: 4, label: '4 \u00d7 4' },
                    { value: 5, label: '5 \u00d7 5' },
                    { value: 6, label: '6 \u00d7 6' }
                ],
                default: 4
            },
            {
                id: 'difficulte', type: 'select', label: 'Difficult\u00e9',
                aide: "En \u00ab facile \u00bb, un tiers des cases est d\u00e9j\u00e0 rempli : l'\u00e9l\u00e8ve a de quoi accrocher avant de se servir des signes. En \u00ab difficile \u00bb, il ne reste que les indices strictement n\u00e9cessaires \u2014 c'est le vrai futoshiki, et c'est beaucoup plus dur.",
                options: [
                    { value: 'facile', label: 'Facile \u2014 des chiffres pour commencer' },
                    { value: 'moyen', label: 'Moyen' },
                    { value: 'difficile', label: 'Difficile \u2014 le strict n\u00e9cessaire' }
                ],
                default: 'facile'
            }
        ],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.LOGIQUE], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Chaque chiffre une fois par ligne et par colonne, comme un sudoku — mais les signes < et > entre les cases doivent être respectés. Un signe ÉLIMINE : la case du petit côté ne peut pas porter le plus grand chiffre. Pour écrire : touche une case et son chiffre monte (1, 2, 3… puis vide), ou glisse un chiffre du pavé dessus."
    },
    {
        // LE CARRÉ MAGIQUE. Trente soustractions à trous qui se donnent la
        // main : on cherche la ligne où il ne manque qu'une case, on soustrait
        // de la somme magique, et chaque case écrite en débloque d'autres. Le
        // générateur garantit la résolubilité par déduction pure.
        id: 'logi-carre-magique', status: STATUS.TEST, title: 'Le Carré Magique',
        cree: '2026-08-12',
        activityId: 'carre-magique',
        generatorId: 'logique.carre-magique', printable: 'carre-magique',
        sansRevision: true,
        skills: ['num.logique.carre-magique'],
        params: { taille: 3, difficulte: 'normal' },
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.LOGIQUE], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Toutes les lignes, colonnes ET diagonales font la même somme — elle est affichée. Cherche une ligne où il ne manque qu'une case : additionne ce que tu connais, soustrais de la somme magique, écris. Chaque case trouvée en débloque d'autres. On ne devine jamais."
    },
    {
        // L'HEXAGRILLE. À côté du carré magique, elle apporte ce qu'il n'a
        // pas : des files de LONGUEURS DIFFÉRENTES, chacune avec sa propre
        // somme. Une somme de 3 sur deux cases ne laisse aucun choix, et c'est
        // par là qu'on entre. On ne récite pas une somme magique, on croise
        // des décompositions.
        id: 'logi-hexagrille', status: STATUS.TEST, title: 'L\'Hexagrille',
        cree: '2026-08-17',
        revisions: [{
            date: '2026-08-19',
            quoi: 'Les flèches vont maintenant du nombre jusqu\'au bord de la première case, '
                + 'le total courant « déjà 8 » a disparu — il rendait la soustraction gratuite — '
                + 'et un appui sur un nombre éclaire la file qu\'il désigne.'
        }],
        activityId: 'hexagrille',
        sansRevision: true,
        skills: ['num.logique.hexagrille'],
        params: { niveau: 'facile' },
        paramSchema: [
            {
                id: 'niveau', type: 'select', label: 'Difficulté', default: 'facile',
                aide: 'La difficulté ne tient pas aux calculs — ils restent des additions de un chiffre — '
                    + 'mais au nombre d\'appuis : combien de cases sont déjà écrites, et combien de flèches '
                    + 'sont données. Chaque grille reste résoluble par déduction pure, sans jamais deviner.',
                options: [
                    { value: 'facile', label: 'Trois cases données' },
                    { value: 'moyen', label: 'Une seule case donnée' },
                    { value: 'difficile', label: 'Aucune case donnée' }
                ]
            }
        ],
        motsClefs: ['hexagrille', 'sommes', 'logique', 'addition'],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.LOGIQUE], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME, TAGS.NIVEAU.QUATRIEME] },
        instruction: "Les neuf cases portent les chiffres de 1 à 9, chacun une seule fois. Chaque flèche donne la somme de la file qu'elle désigne. On ne devine jamais : on cherche une file où il ne manque QU'UNE case, on additionne ce qu'on y a déjà, et on soustrait de la somme visée. Les files courtes sont les plus bavardes — une somme de 3 sur deux cases, c'est 1 et 2, et rien d'autre."
    },
    {
        // 2048. Un jeu de puissances de deux qui n'a pas besoin d'être
        // déguisé : chaque fusion est un doublement énoncé, et chaque coup
        // s'anticipe. Le robot montre la seule chose qui compte : on ne glisse
        // pas au hasard, on cherche AVANT quelles tuiles vont se retrouver.
        id: 'calc-2048', status: STATUS.TEST, title: '2048',
        cree: '2026-08-12',
        activityId: 'deuxmille',
        sansRevision: true,
        skills: ['num.calc.doublements'],
        params: { objectif: 2048 },
        paramSchema: [
            {
                id: 'objectif', type: 'select', label: 'Objectif',
                options: [
                    { value: 256, label: 'La tuile 256 — partie courte' },
                    { value: 512, label: 'La tuile 512' },
                    { value: 1024, label: 'La tuile 1024' },
                    { value: 2048, label: 'La tuile 2048 — le vrai défi' }
                ],
                default: 2048
            }
        ],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Glisse la grille dans une des quatre directions : tout se tasse, et deux tuiles égales fusionnent en leur double. Chaque tuile ne fusionne qu'une fois par coup. Ne joue pas au hasard : avant de glisser, cherche quelles tuiles vont se retrouver — c'est du calcul mental déguisé en réflexe."
    },
    {
        // LES DOMINOS. Le jeu ne fabrique aucune question : il emprunte une
        // notion du catalogue et en fait une chaîne. Un seul exercice, dix-sept
        // jeux de dominos — et le jour où l'on ajoute un générateur qui écrit
        // ses questions, il suffit de l'inscrire dans la liste des sources.
        id: 'logi-dominos', status: STATUS.TEST, title: 'Les Dominos',
        cree: '2026-08-12',
        activityId: 'dominos',
        // Le générateur sert au PAPIER : la planche de pièces à découper, qui
        // est l'usage historique de ce jeu en classe.
        generatorId: 'jeu.dominos', printable: 'dominos',
        sansRevision: true,
        skills: ['num.logique.dominos'],
        params: { source: 'calc.mult.fact', pieces: 9 },
        paramSchema: [
            {
                id: 'source', type: 'select', label: 'Notion',
                options: SOURCES_DOMINOS.map(s => ({ value: s.id, label: s.label })),
                default: 'calc.mult.fact'
            },
            {
                id: 'pieces', type: 'select', label: 'Longueur de la chaîne',
                options: [
                    { value: 7, label: '7 dominos — 6 calculs' },
                    { value: 9, label: '9 dominos — 8 calculs' },
                    { value: 11, label: '11 dominos — 10 calculs' },
                    { value: 13, label: '13 dominos — 12 calculs' }
                ],
                default: 9
            }
        ],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.LOGIQUE], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Une pièce porte une question à droite et la réponse d'une AUTRE question à gauche. On lit le bout ouvert de la chaîne, on calcule dans sa tête, et on cherche ce résultat à gauche d'une pièce de la réserve — il n'y en a qu'une, car deux questions n'ont jamais la même réponse. Quand la dernière pièce porte ARRIVÉE et que la réserve est vide, tout est juste : personne n'a besoin de te le dire."
    },
    {
        id: 'logi-demineur', status: STATUS.TEST, title: 'Le Démineur',
        cree: '2026-08-07',
        activityId: 'demineur', skills: ['num.logique.demineur'],
        sansRevision: true,
        params: { niveau: 'debutant', vies: 3 },
        paramSchema: [
            {
                id: 'vies', type: 'select', label: 'Vies',
                options: [
                    { value: 1, label: '1 — à l\'ancienne, une mine et c\'est fini' },
                    { value: 3, label: '3 vies' },
                    { value: 5, label: '5 vies' }
                ],
                default: 3
            },
            {
                id: 'niveau', type: 'select', label: 'Grille',
                options: [
                    { value: 'debutant', label: 'Débutant · 9 × 9 · 10 mines' },
                    { value: 'confirme', label: 'Confirmé · 12 × 12 · 22 mines' },
                    { value: 'expert', label: 'Expert · 16 × 16 · 46 mines' }
                ],
                default: 'debutant'
            }
        ],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.LOGIQUE], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Les règles du démineur d'origine. Chaque chiffre compte les mines des 8 cases voisines : appui long (ou clic droit) pour poser un drapeau, 💡 pour faire expliquer la prochaine déduction certaine."
    },
    {
        id: 'calc-math-crush', status: STATUS.TEST, title: 'Math Crush',
        cree: '2026-07-26',
        // Le réglage par défaut est l'addition ; la table est là dès qu'on
        // bascule le mode, et les deux compétences se valent pour la leçon.
        activityId: 'crush', skills: ['num.add.entiers', 'num.mult.table.*'],
        params: { mode: 'addition', difficulty: 'progressive' },
        paramSchema: [
            { id: 'mode', type: 'select', label: 'Opération', options: ['addition', 'multiplication'], default: 'addition' },
            { id: 'difficulty', type: 'select', label: 'Difficulté', options: ['progressive', 'difficile'], default: 'progressive' }
        ],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL], niveaux: [TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME, TAGS.NIVEAU.QUATRIEME] },
        instruction: "Glisse ton doigt sur les blocs adjacents pour atteindre la cible."
    },
    {
        // LE BOUTON SCHÉMA EST L'EXERCICE. Un problème ne se rate presque
        // jamais faute de savoir calculer : il se rate faute de savoir QUELLE
        // opération faire. Alors l'élève attrape un mot — « en tout », « de
        // plus » — et le mot décide à sa place. Le schéma est la seule chose
        // qui puisse reprendre cette décision : il est donc gratuit, sans
        // pénalité et sans condition. Le cacher derrière un coût apprendrait à
        // s'en passer, exactement l'inverse du but.
        // « Histoires en pagaille » et non « atelier des problèmes » : les
        // élèves ont bien assez de problèmes comme ça, et le mot suffit à
        // fermer la porte avant d'avoir lu la première ligne. Ce sont des
        // histoires — courtes, mélangées, et c'est justement le mélange qui
        // empêche de reconnaître l'opération sans lire.
        id: 'num-problemes', status: STATUS.TEST, title: 'Histoires en Pagaille',
        cree: '2026-08-11',
        activityId: 'problemes',
        // C'est l'exercice qui appelle le plus la feuille : un problème se
        // relit, se souligne, se schématise dans la marge. Sur le papier on
        // ÉCRIT la réponse — reconnaître la bonne dans une liste de quatre
        // n'est pas la trouver.
        printGeneratorId: 'num.problemes-fiche',
        consignePapier: "Lis chaque énoncé, écris ton calcul, puis la réponse avec son unité.",
        colonnesPapier: 1,
        params: { niveau: 'tout', familles: [] },
        paramSchema: [
            {
                id: 'niveau', type: 'select', label: 'Familles proposées',
                aide: "Filtre les types de situations selon le niveau. « Toutes » brasse les onze familles : c'est ce qui empêche l'élève de reconnaître l'opération à la place de l'énoncé.",
                options: [
                    { value: 'tout', label: 'Toutes les familles' },
                    { value: 'CM2', label: 'CM2 — réunir, changer, comparer, grouper' },
                    { value: '6ème', label: '6ème' },
                    { value: '5ème', label: '5ème — proportionnalité, durées, deux étapes' }
                ],
                default: 'tout'
            },
            {
                id: 'familles', type: 'multiselect', deroulant: true, tout: 'familles',
                label: 'Familles précises (facultatif)',
                aide: "Pour cibler une difficulté : coche les familles à travailler. Aucune cochée = toutes. L'opération demandée est rappelée entre parenthèses — c'est souvent par elle qu'on choisit, quand on veut faire travailler la division ou les deux étapes. Le réglage du dessus limite déjà au niveau ; celui-ci sert à isoler, par exemple, les seuls problèmes de durée.",
                options: [
                    { value: 'composition', label: 'Réunir deux quantités (+)' },
                    { value: 'complement', label: 'Trouver la part qui manque (−)' },
                    { value: 'transformation', label: 'Un changement (gagner, perdre, dépenser) (+ ou −)' },
                    { value: 'comparaison', label: 'Comparer deux quantités (−)' },
                    { value: 'groupes', label: 'Des groupes tous pareils (×)' },
                    { value: 'partage', label: 'Partager équitablement (÷)' },
                    { value: 'quotition', label: 'Combien de paquets, et le reste (÷ et reste)' },
                    { value: 'proportion', label: 'Le prix de plusieurs articles (×)' },
                    { value: 'fraction', label: 'Une fraction d\'une quantité (÷ puis ×)' },
                    { value: 'duree', label: 'Des horaires et des durées (+ ou −)' },
                    { value: 'deuxEtapes', label: 'Deux étapes : la monnaie rendue (× puis −)' }
                ],
                default: []
            }
        ],
        skills: ['num.probleme.composition', 'num.probleme.transformation',
            'num.probleme.comparaison', 'num.probleme.multiplication',
            'num.probleme.division', 'num.probleme.proportion',
            'num.probleme.fraction', 'num.probleme.duree', 'num.probleme.etapes'],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.PROBLEMES], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Lis l'histoire, puis la question — ce sont deux lectures différentes, et c'est la question qu'on oublie. Les nombres de l'énoncé sont en gras : ce sont les données. Si tu hésites sur l'opération, appuie sur « Voir le schéma » : il est fait pour ça, il ne coûte rien, et c'est lui qui doit décider — pas le mot « en tout » ni le mot « de plus ». Chaque mauvaise réponse te dit quelle erreur elle correspond."
    },
    {
        // « DANS UN TABLEAU DE PROPORTIONNALITÉ, ON MULTIPLIE TOUJOURS PAR LE
        // MÊME NOMBRE. » Tant que cette phrase n'est pas installée, l'élève
        // complète en AJOUTANT l'écart de la colonne voisine — et ça donne
        // juste assez souvent pour ne pas l'alerter. Le bouton « Montrer le
        // lien » existe pour que chercher le coefficient devienne le premier
        // geste, pas le dernier recours.
        id: 'num-proportion-tableau', status: STATUS.TEST, title: 'Tableau de Proportionnalité',
        cree: '2026-08-11',
        activityId: 'proportion',
        // Le seul de ces exercices qui se photocopie tel quel : deux lignes,
        // des cases vides, et le lien à retrouver.
        printable: 'proportion', printGeneratorId: 'num.proportion-fiche',
        params: { niveau: 'facile' },
        paramSchema: [
            {
                id: 'niveau', type: 'select', label: 'Difficulté',
                aide: "Le coefficient et le sens de lecture. En « facile » il est entier et on ne complète que la ligne du bas : on apprend à multiplier avant d'apprendre à diviser. Aux niveaux suivants, le tableau se complète aussi vers le haut, et le coefficient peut être décimal ou plus petit que 1 — ce qui casse l'idée fausse que « multiplier, ça fait plus grand ».",
                options: [
                    { value: 'facile', label: 'Coefficient entier, 2 cases en bas' },
                    { value: 'moyen', label: 'Coefficient décimal, 3 cases dans les deux sens' },
                    { value: 'difficile', label: '5 colonnes, 4 cases, coefficients difficiles' }
                ],
                default: 'facile'
            }
        ],
        skills: ['num.proportion.tableau'],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.PROBLEMES], niveaux: [TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME, TAGS.NIVEAU.QUATRIEME] },
        instruction: "Touche une case bleue, tape le nombre au pavé, puis ✓. La colonne surlignée en jaune est complète : c'est elle qui donne le lien entre les deux lignes. Le piège à éviter : compléter en ajoutant l'écart d'une colonne à l'autre. Dans un tableau de proportionnalité, on passe d'une ligne à l'autre en MULTIPLIANT, toujours par le même nombre. Appuie sur « Montrer le lien » pour faire apparaître ce coefficient — et la valeur pour 1, qui est l'autre chemin."
    },
    {
        // LE POINT À POINT. Les pastilles ne portent pas de numéro : elles
        // portent un CALCUL, et son résultat donne le rang. Chercher « celui
        // qui vaut 13 » retourne le geste habituel — on part du résultat et
        // l'on balaie les opérations — et l'élève calcule vingt fois de tête
        // sans qu'on le lui demande, parce qu'il veut voir l'image.
        id: 'calc-point-a-point', status: STATUS.TEST, title: 'Le Point à Point',
        cree: '2026-08-14',
        activityId: 'point-a-point',
        // SUR LE PAPIER, c'est l'exercice d'origine : on cherche au crayon,
        // on rature, on recommence — ce que l'écran ne remplace pas.
        printable: 'pointapoint', printGeneratorId: 'calc.point-a-point-fiche',
        printParams: { dessin: '', famille: 'melange' },
        consignePapier: 'Relie les points dans l’ordre des résultats.',
        sansRevision: true,
        skills: ['num.calc.recherche'],
        params: { dessin: '', famille: 'melange', verification: 'immediate' },
        paramSchema: [
            {
                id: 'famille', type: 'select', label: 'Calculs sur les points',
                options: [
                    { value: 'melange', label: 'Mélange — les quatre opérations' },
                    { value: 'addition', label: 'Additions' },
                    { value: 'soustraction', label: 'Soustractions' },
                    { value: 'tables', label: 'Tables de multiplication' },
                    { value: 'doubles', label: 'Doubles et moitiés' }
                ],
                default: 'melange'
            },
            {
                id: 'dessin', type: 'select', label: 'Image à faire apparaître',
                options: [
                    { value: '', label: 'Au hasard — surprise' },
                    { value: 'maison', label: 'La maison (11 points)' },
                    { value: 'poisson', label: 'Le poisson (9 points)' },
                    { value: 'etoile', label: 'L\'étoile (10 points)' },
                    { value: 'voilier', label: 'Le voilier (12 points)' },
                    { value: 'fusee', label: 'La fusée (11 points)' },
                    { value: 'chat', label: 'Le chat (12 points)' },
                    { value: 'cle', label: 'La clé (16 points)' }
                ],
                default: ''
            },
            {
                id: 'verification', type: 'select', label: 'Correction',
                aide: 'Au fur et à mesure, un mauvais point est refusé tout de suite et l\'image ne peut pas se déformer — sans jamais dire quel point il fallait. À la fin, tout passe et les fautes se découvrent au bout : c\'est un contrôle.',
                options: [
                    { value: 'immediate', label: 'Au fur et à mesure' },
                    { value: 'fin', label: 'À la fin — plus difficile' }
                ],
                default: 'immediate'
            }
        ],
        tags: { chemin: [TAGS.DOMAINE.NUMERIQUE, TAGS.SOUS_DOMAINE.CALCUL_MENTAL], niveaux: [TAGS.NIVEAU.CM2, TAGS.NIVEAU.SIXIEME] },
        instruction: "Les points ne sont pas numérotés : chacun porte un calcul, et son résultat donne son rang. Cherche le calcul qui vaut 1, clique dessus ; puis celui qui vaut 2, et ainsi de suite. Le truc, c'est de ne pas calculer les vingt étiquettes une par une : demande-toi d'abord ce que le nombre cherché peut être — 12, c'est 3 × 4, le double de 6, 10 + 2 — puis balaie le dessin. À la fin, les calculs s'effacent et l'image reste."
    }
];
