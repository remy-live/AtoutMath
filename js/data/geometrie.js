import { TAGS } from './tags.js';
import { STATUS } from './status.js';

// Les anciens exercices « grille » (cases à cliquer dans un quadrillage) sont
// remplacés par un vrai repère du plan : axes fléchés, origine, graduations
// entières. Deux questions symétriques sur la même compétence — placer un
// point, lire des coordonnées — et une déclinaison en nombres relatifs.

export const geometrieExercises = [
    // --- La notation des objets de base (fiche 4ᵉ § G) ---
    // [AB], (AB), [AB) : une notation ne se devine pas, et c'est pour cela
    // qu'on la perd. Des points partent chaque année sur « (AB) » écrit à la
    // place de « [AB] », dans des copies où la construction est juste.
    {
        id: 'geo-notation',
        title: 'Segment, Droite ou Demi-droite ?',
        consignePapier: "Réponds.",
        colonnesPapier: 2,
        generatorId: 'geo.notation', activityId: 'bubbles',
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
        activityId: 'redaction',
        // Le générateur ne sert PAS à l'écran (l'activité est autonome) : il
        // sert au papier. Rédiger une justification, c'est écrire à la main —
        // c'est l'exercice qui gagne le plus à sortir de l'écran.
        generatorId: 'geo.redaction', printable: 'redaction',
        params: { propriete: 'para-perp' },
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
        activityId: 'pythagore-theoreme',
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
        id: 'geo-symetrie-quadrillage', title: 'Le Symétrique aux Carreaux',
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
        id: 'geo-transfo-quadrillage', title: 'Tracer l\'Image d\'une Figure',
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

    // --- Angle Master : le rapporteur interactif ---
    {
        // Mesurer et construire sont les deux sens du même geste, et le
        // générateur les offre depuis toujours dans son réglage « Question » —
        // qui propose même de les ALTERNER, ce qu'aucune des deux entrées
        // séparées ne permettait d'atteindre.
        id: 'geo-angles', status: STATUS.TEST, title: 'Angle Master',
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
        id: 'geo-ville', status: STATUS.TEST, title: 'Le Plan de Ville',
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
        // RELIER LES POINTS. Le jeu de liens, avec sa règle complète : les
        // chemins ne se croisent pas ET aucune case ne reste vide. C'est la
        // seconde moitié qui fait le raisonnement — relier deux points est
        // facile, les relier de façon que tous les autres puissent encore
        // passer ne l'est pas. La grille est tirée d'un chemin qui couvre
        // déjà toute la surface : elle est donc résoluble par construction.
        id: 'geo-relier-points', status: STATUS.TEST, title: 'Relie les points',
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
        // DÉNOMBRER SUR UN SOLIDE. L'exercice a l'air simple et ne l'est pas :
        // sur une perspective cavalière, une partie du solide est derrière, et
        // l'élève qui compte ce qu'il voit trouve toujours trop peu. Le jeu
        // donne le geste qui manque sur le papier — toucher ce qu'on compte —
        // et la correction montre CE QU'ON A OUBLIÉ plutôt que d'annoncer un
        // nombre.
        id: 'geo-solides-denombrer', status: STATUS.TEST,
        title: 'Compter sur un solide',
        activityId: 'solides',
        // Sur le papier, on compte au crayon et l'on écrit trois nombres dans
        // un tableau : c'est l'exercice que l'écran ne sait pas donner, où le
        // compte s'efface avec la marque.
        generatorId: 'geo.solides', printable: 'solides',
        params: { niveau: 'tous', aspect: 'tous', numeros: 'progressif', facesColorees: true },
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
                aide: 'Le numéro qui s\'inscrit sur la marque fait la moitié du travail : l\'élève LIT son total au lieu de le compter. Il sert à installer la méthode — marquer une par une, ne pas repasser — puis il gêne. Par défaut, il disparaît après trois questions réussies.',
                options: [
                    { value: 'progressif', label: 'Il disparaît après 3 réussites' },
                    { value: 'toujours', label: 'Toujours affiché' },
                    { value: 'jamais', label: 'Jamais affiché' }
                ],
                default: 'progressif'
            },
            {
                id: 'facesColorees', type: 'checkbox', label: 'Colorer les faces comptées',
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
        id: 'geo-dedale-forme', status: STATUS.TEST, title: 'Les Dédales',
        activityId: 'dedale',
        // SUR LE PAPIER : le dédale imprimé, à parcourir au crayon. C'est
        // l'exercice d'origine — l'écran n'y ajoutait que le fil qui se
        // rembobine.
        printable: 'dedale', printGeneratorId: 'geo.dedale-fiche',
        printParams: { forme: 'rond', taille: 15 },
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
        id: 'geo-mat-echecs', status: STATUS.TEST, title: 'Échecs : mat en un, mat en deux',
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
    }
];
