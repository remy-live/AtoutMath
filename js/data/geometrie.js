import { TAGS } from './tags.js';
import { STATUS } from './status.js';

// Les anciens exercices « grille » (cases à cliquer dans un quadrillage) sont
// remplacés par un vrai repère du plan : axes fléchés, origine, graduations
// entières. Deux questions symétriques sur la même compétence — placer un
// point, lire des coordonnées — et une déclinaison en nombres relatifs.

export const geometrieExercises = [
    {
        id: 'geo-redaction-para-perp', status: STATUS.TEST, title: 'Rédiger : Parallèles et Perpendiculaires',
        activityId: 'redaction',
        // Le générateur ne sert PAS à l'écran (l'activité est autonome) : il
        // sert au papier. Rédiger une justification, c'est écrire à la main —
        // c'est l'exercice qui gagne le plus à sortir de l'écran.
        generatorId: 'geo.redaction', printable: 'redaction',
        params: { propriete: 'para-perp' },
        tags: { chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.REPERAGE], niveaux: [TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Une justification de géométrie a toujours trois lignes : JE SAIS QUE, OR, DONC. On les écrit une par une. D'abord tu remets la propriété du cours dans l'ordre, puis tu lis la figure — les droites en POINTILLÉS sont parallèles — puis la propriété s'écrit pendant que la figure montre de quoi elle parle, et enfin tu conclus."
    },
    {
        // LA RÉCIPROQUE. Même figure, même rédaction en trois lignes, mais on
        // part des DEUX angles droits pour conclure un parallélisme. C'est la
        // confusion la plus fréquente en sixième : l'élève qui n'a qu'une
        // propriété en tête écrit la première pour justifier un parallélisme.
        id: 'geo-redaction-perp-perp', status: STATUS.TEST,
        title: 'Rédiger : Deux Perpendiculaires à une Même Droite',
        activityId: 'redaction',
        generatorId: 'geo.redaction', printable: 'redaction',
        params: { propriete: 'perp-perp' },
        tags: { chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.REPERAGE], niveaux: [TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Les deux angles droits sont DONNÉS sur la figure : c'est de là qu'on part. La propriété permet alors de conclure que les deux droites sont parallèles — attention à ne pas la confondre avec celle qui part de deux parallèles."
    },
    {
        // PYTHAGORE, TRÈS PROGRESSIVEMENT. Six niveaux, six marches : montrer
        // l'hypoténuse du doigt, remettre la phrase du cours dans l'ordre,
        // écrire l'égalité pour SON triangle, calculer l'hypoténuse, calculer
        // un côté (on soustrait), rédiger en entier. On ne demande jamais deux
        // choses nouvelles à la fois — le modèle des exercices de rédaction.
        id: 'geo-pythagore', status: STATUS.TEST, title: 'Le Théorème de Pythagore',
        activityId: 'pythagore-theoreme',
        // Le générateur sert au PAPIER : les énoncés de calcul, avec la
        // correction en trois lignes.
        generatorId: 'geo.pythagore', printable: null,
        sansRevision: true,
        skills: ['geo.pythagore'],
        params: { niveau: 1 },
        paramSchema: [
            {
                id: 'niveau', type: 'select', label: 'Niveau',
                options: [
                    { value: 1, label: '1 — Montrer l\'hypoténuse' },
                    { value: 2, label: '2 — La phrase du théorème' },
                    { value: 3, label: '3 — Écrire l\'égalité' },
                    { value: 4, label: '4 — Calculer l\'hypoténuse' },
                    { value: 5, label: '5 — Calculer un côté de l\'angle droit' },
                    { value: 6, label: '6 — Rédiger en entier' }
                ],
                default: 1
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
        title: 'Atelier de Géométrie : Règle, Équerre et Compas',
        activityId: 'geometrie',
        params: { consigne: 'aleatoire' },
        skills: ['geo.construire.instruments'],
        tags: { chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.REPERAGE], niveaux: [TAGS.NIVEAU.SIXIEME, TAGS.NIVEAU.CINQUIEME] },
        instruction: "Les quatre instruments sont en haut de la feuille : règle, équerre, compas, rapporteur. On les prend, on les pose, on les tourne — à la souris comme au doigt — et on trace le long de leur bord. La figure de départ est déjà placée : lis la consigne, construis, puis appuie sur « Valider ma construction ». C'est la figure obtenue qui est jugée, pas l'outil choisi : la médiatrice au compas et la médiatrice à l'équerre valent pareil."
    },
    {
        id: 'geo-repere-placer', title: 'Placer un Point',
        generatorId: 'geo.repere', activityId: 'repere',
        params: { relatifs: 'positives', max: 5, mode: 'placer' },
        tags: { chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.REPERAGE], niveaux: [TAGS.NIVEAU.SIXIEME] },
        instruction: "Clique dans le repère à l'endroit indiqué par les coordonnées. On lit l'abscisse en premier."
    },
    {
        id: 'geo-repere-lire', title: 'Lire des Coordonnées',
        generatorId: 'geo.repere', activityId: 'repere-lecture',
        params: { relatifs: 'positives', max: 5, mode: 'lire' },
        tags: { chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.REPERAGE], niveaux: [TAGS.NIVEAU.SIXIEME] },
        instruction: "Lis les coordonnées du point tracé et choisis le bon couple."
    },
    {
        id: 'geo-repere-relatifs', title: 'Repère et Nombres Relatifs',
        generatorId: 'geo.repere', activityId: 'repere',
        params: { relatifs: 'relatives', max: 5, mode: 'placer' },
        tags: { chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.REPERAGE], niveaux: [TAGS.NIVEAU.CINQUIEME] },
        instruction: "Le repère va maintenant dans les négatifs : attention aux signes de l'abscisse et de l'ordonnée."
    },
    {
        id: 'geo-repere-relatifs-lire', title: 'Coordonnées Négatives',
        generatorId: 'geo.repere', activityId: 'repere-lecture',
        params: { relatifs: 'relatives', max: 5, mode: 'lire' },
        tags: { chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.REPERAGE], niveaux: [TAGS.NIVEAU.CINQUIEME] },
        instruction: "Lis les coordonnées du point, sans oublier les signes."
    },

    // --- Angle Master : le rapporteur interactif ---
    {
        id: 'geo-angles-mesurer', status: STATUS.TEST, title: 'Angle Master : Mesurer',
        generatorId: 'geo.angles', activityId: 'angles',
        params: { mode: 'mesurer', plage: 'tous', tolerance: 3 },
        tags: { chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.ANGLES], niveaux: [TAGS.NIVEAU.SIXIEME] },
        instruction: "Estime d'abord si l'angle est aigu ou obtus, puis mesure-le : déplace le rapporteur sur le sommet, tourne-le par ses poignées pour aligner le zéro, et saisis la valeur lue."
    },
    {
        id: 'geo-angles-construire', status: STATUS.TEST, title: 'Angle Master : Construire',
        generatorId: 'geo.angles', activityId: 'angles',
        params: { mode: 'construire', plage: 'tous', tolerance: 3 },
        tags: { chemin: [TAGS.DOMAINE.GEOMETRIQUE, TAGS.SOUS_DOMAINE.ANGLES], niveaux: [TAGS.NIVEAU.SIXIEME] },
        instruction: "Construis l'angle demandé : place le rapporteur, repère la graduation, puis amène le côté rouge dessus en tirant sa poignée."
    },
    {
        id: 'geo-chat-geometre', status: STATUS.TEST, title: 'Le Chat Géomètre',
        generatorId: 'geo.scratch', activityId: 'scratch',
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
        id: 'geo-galactic', status: STATUS.TEST, title: 'Galactic : Tir aux Angles',
        activityId: 'galactic',
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
        id: 'geo-ville', status: STATUS.TEST, title: 'Le Plan de Ville',
        activityId: 'ville',
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
        // LE RENVERSEMENT : on n'écrit pas le programme, on l'EXÉCUTE. Un élève
        // qui empile des blocs jusqu'à ce que « ça marche » peut réussir sans
        // avoir jamais compris ce que fait la machine. Du côté de la machine,
        // trois choses deviennent inévitables : il y a un endroit du programme
        // où l'on se trouve, la boucle y REMONTE, et la gauche est celle du
        // robot.
        id: 'geo-automate', status: STATUS.TEST, title: 'L\'Automate',
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
    }
];
