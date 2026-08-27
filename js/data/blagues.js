// CENT BLAGUES DE MATHÉMATIQUES, TRÈS COURTES.
//
// Rémy : « une liste de blagues mathématiques très courte ».
//
// DEUX RÈGLES, ET LA SECONDE EST LA PLUS DURE À TENIR.
//
//   1. DEUX LIGNES AU MAXIMUM. Une blague qu'il faut faire défiler n'est plus
//      une blague, c'est une lecture. Le format est celui de la cour de
//      récréation : une question, une chute.
//
//   2. LE RESSORT EST MATHÉMATIQUE. « Pourquoi le livre de maths est-il
//      triste ? Il a trop de problèmes » repose sur le double sens de
//      « problème » — c'est un calembour, et c'est justement pour ça que les
//      élèves les retiennent : ils manipulent le VOCABULAIRE du chapitre. Une
//      blague où l'on aurait pu remplacer « maths » par « géographie » n'a rien
//      à faire ici.
//
// Elles sont classées par notion : c'est ce qui permet au professeur de repérer
// celles qu'il peut lancer le jour où il commence les fractions.

export const BLAGUES = [
    // --- Vocabulaire et généralités ------------------------------------------
    { texte: 'Pourquoi le livre de maths est-il toujours triste ? Parce qu\'il a trop de problèmes.', quoi: 'vocabulaire' },
    { texte: 'Que dit un mathématicien quand il ne sait pas quoi dire ? « Sans perte de généralité… »', quoi: 'vocabulaire' },
    { texte: 'Pourquoi les maths sont-elles fatigantes ? Parce qu\'il faut toujours tout démontrer.', quoi: 'vocabulaire' },
    { texte: 'Quel est le comble pour un professeur de maths ? Avoir des problèmes de calcul.', quoi: 'vocabulaire' },
    { texte: 'Que fait un mathématicien quand il a froid ? Il se met dans un coin, parce que c\'est 90 degrés.', quoi: 'angles' },
    { texte: 'Pourquoi le zéro a-t-il quitté le nombre ? Parce qu\'il ne comptait pour rien.', quoi: 'nombres' },
    { texte: 'Comment appelle-t-on un ami qui aime les maths ? Un algébriste — les autres, on les additionne.', quoi: 'vocabulaire' },
    { texte: 'Que dit un zéro à un huit ? « Jolie ceinture ! »', quoi: 'nombres' },
    { texte: 'Pourquoi 6 a-t-il peur de 7 ? Parce que 7 8 9.', quoi: 'nombres' },
    { texte: 'Que dit un mathématicien à la boulangerie ? « Une baguette, s\'il vous plaît — et démontrez-moi qu\'elle est fraîche. »', quoi: 'vocabulaire' },

    // --- Opérations ------------------------------------------------------------
    { texte: 'Pourquoi l\'addition est-elle sociable ? Parce qu\'elle passe son temps à rassembler.', quoi: 'operations' },
    { texte: 'Pourquoi la soustraction est-elle mal aimée ? Elle enlève toujours quelque chose à quelqu\'un.', quoi: 'operations' },
    { texte: 'Que dit la multiplication à l\'addition ? « Toi tu ajoutes, moi je répète. »', quoi: 'operations' },
    { texte: 'Pourquoi ne faut-il jamais diviser par zéro ? Parce que même la calculatrice fait semblant de ne pas comprendre.', quoi: 'operations' },
    { texte: 'Quel est le nombre le plus poli ? Le zéro : il ne s\'ajoute jamais à la conversation.', quoi: 'nombres' },
    { texte: 'Pourquoi le signe moins est-il discret ? Parce qu\'il se fait toujours oublier en recopiant.', quoi: 'relatifs' },
    { texte: 'Que se disent deux nombres opposés ? « À nous deux, on ne vaut rien. »', quoi: 'relatifs' },
    { texte: 'Pourquoi moins par moins fait-il plus ? Parce que l\'ennemi de mon ennemi est mon ami.', quoi: 'relatifs' },
    { texte: 'Que fait un nombre négatif à la piscine ? Il descend sous la surface.', quoi: 'relatifs' },
    { texte: 'Comment reconnaît-on une multiplication pressée ? Elle saute les parenthèses.', quoi: 'priorites' },

    // --- Priorités et parenthèses -----------------------------------------------
    { texte: 'Pourquoi les parenthèses passent-elles toujours en premier ? Parce qu\'elles ont un droit de priorité.', quoi: 'priorites' },
    { texte: 'Que dit la parenthèse fermante à l\'ouvrante ? « Ne t\'inquiète pas, je te retrouve toujours. »', quoi: 'priorites' },
    { texte: 'Quel est le drame de la parenthèse ouvrante oubliée ? Elle attend toute sa vie.', quoi: 'priorites' },
    { texte: 'Pourquoi l\'addition est-elle patiente ? Parce qu\'elle passe toujours en dernier.', quoi: 'priorites' },
    { texte: 'Que crie la puissance dans une file d\'attente ? « Je passe avant la multiplication ! »', quoi: 'puissances' },

    // --- Fractions ----------------------------------------------------------------
    { texte: 'Pourquoi les fractions se disputent-elles ? Elles n\'arrivent jamais à trouver un dénominateur commun.', quoi: 'fractions' },
    { texte: 'Que dit le numérateur au dénominateur ? « Arrête de me diviser. »', quoi: 'fractions' },
    { texte: 'Pourquoi 1/2 est-il optimiste ? Parce qu\'il voit toujours le verre à moitié plein.', quoi: 'fractions' },
    { texte: 'Comment appelle-t-on une fraction qui ne se simplifie pas ? Une fraction têtue.', quoi: 'fractions' },
    { texte: 'Que dit une fraction devant un miroir ? « Tiens, mon inverse. »', quoi: 'fractions' },
    { texte: 'Pourquoi 4/4 se sent-il complet ? Parce qu\'il vaut exactement un.', quoi: 'fractions' },
    { texte: 'Deux fractions se rencontrent. « Tu vas où ? — Au même dénominateur, comme tout le monde. »', quoi: 'fractions' },
    { texte: 'Pourquoi la pizza est-elle le meilleur professeur de fractions ? Parce qu\'on retient mieux ce qu\'on mange.', quoi: 'fractions' },

    // --- Géométrie : figures --------------------------------------------------------
    { texte: 'Pourquoi le cercle est-il si sûr de lui ? Parce qu\'il n\'a aucun angle mort.', quoi: 'geometrie' },
    { texte: 'Que dit le carré au rectangle ? « Moi au moins, j\'ai de la suite dans les idées. »', quoi: 'geometrie' },
    { texte: 'Pourquoi le triangle rectangle est-il fier ? Parce qu\'il a un théorème à son nom.', quoi: 'pythagore' },
    { texte: 'Que dit le losange au carré ? « On a les mêmes côtés, mais toi tu te tiens droit. »', quoi: 'geometrie' },
    { texte: 'Pourquoi le trapèze est-il jaloux ? Parce qu\'il n\'a que deux côtés parallèles.', quoi: 'geometrie' },
    { texte: 'Que fait un polygone régulier le dimanche ? Rien de particulier : tous ses côtés sont pareils.', quoi: 'geometrie' },
    { texte: 'Pourquoi l\'hexagone est-il l\'ami des abeilles ? Parce qu\'il remplit sans laisser de vide.', quoi: 'geometrie' },
    { texte: 'Quel est le comble pour un cercle ? Ne pas boucler la boucle.', quoi: 'geometrie' },
    { texte: 'Pourquoi le cube ne prend-il jamais de vacances ? Parce qu\'il est toujours à six faces.', quoi: 'solides' },
    { texte: 'Que dit la sphère au cube ? « Toi, au moins, tu tiens en place. »', quoi: 'solides' },

    // --- Géométrie : droites et angles ---------------------------------------------------
    { texte: 'Pourquoi deux droites parallèles ne se disputent-elles jamais ? Parce qu\'elles ne se rencontrent pas.', quoi: 'droites' },
    { texte: 'Que se disent deux droites perpendiculaires ? « On se croise, mais on ne se ressemble pas. »', quoi: 'droites' },
    { texte: 'Pourquoi la médiatrice est-elle juste ? Parce qu\'elle ne favorise aucun des deux points.', quoi: 'droites' },
    { texte: 'Quel est le comble pour une droite ? Être tordue.', quoi: 'droites' },
    { texte: 'Pourquoi l\'angle plat est-il fatigué ? Parce qu\'il est allongé toute la journée.', quoi: 'angles' },
    { texte: 'Que dit l\'angle aigu à l\'angle obtus ? « Tu prends toute la place. »', quoi: 'angles' },
    { texte: 'Pourquoi l\'angle droit est-il sérieux ? Parce qu\'il ne penche ni d\'un côté ni de l\'autre.', quoi: 'angles' },
    { texte: 'Que fait un angle nul ? Rien, justement.', quoi: 'angles' },
    { texte: 'Pourquoi le rapporteur est-il indispensable ? Parce que sans lui, tous les angles se ressemblent.', quoi: 'angles' },
    { texte: 'Deux angles complémentaires se retrouvent : « À nous deux, on est parfaitement droits. »', quoi: 'angles' },

    // --- Pythagore et Thalès -----------------------------------------------------------
    { texte: 'Pourquoi Pythagore n\'a-t-il jamais eu de problème avec ses murs ? Ils étaient toujours d\'équerre.', quoi: 'pythagore' },
    { texte: 'Que dit l\'hypoténuse aux deux autres côtés ? « Je suis plus longue, mais c\'est vous qui me faites. »', quoi: 'pythagore' },
    { texte: 'Pourquoi le théorème de Pythagore est-il si connu ? Parce qu\'il a du carré-actère.', quoi: 'pythagore' },
    { texte: 'Que dit Thalès à ses parallèles ? « Restez comme vous êtes, tout repose sur vous. »', quoi: 'thales' },
    { texte: 'Pourquoi Thalès aimait-il l\'ombre ? Parce qu\'elle lui a donné la hauteur des pyramides.', quoi: 'thales' },

    // --- Aires, périmètres, volumes -----------------------------------------------------
    { texte: 'Quelle différence entre le périmètre et l\'aire ? L\'un fait le tour, l\'autre reste dedans.', quoi: 'mesures' },
    { texte: 'Pourquoi le périmètre est-il bavard ? Parce qu\'il fait toujours le tour de la question.', quoi: 'mesures' },
    { texte: 'Que dit le mètre carré au mètre ? « Toi tu marches, moi je couvre. »', quoi: 'mesures' },
    { texte: 'Pourquoi le litre et le décimètre cube s\'entendent-ils si bien ? Parce qu\'ils sont exactement d\'accord.', quoi: 'mesures' },
    { texte: 'Quel est le comble pour un volume ? Manquer d\'espace.', quoi: 'mesures' },
    { texte: 'Pourquoi le kilomètre est-il fatigué ? Il vient de faire mille mètres.', quoi: 'mesures' },

    // --- Nombres particuliers -------------------------------------------------------------
    { texte: 'Pourquoi les nombres premiers sont-ils solitaires ? Ils ne se laissent diviser que par eux-mêmes.', quoi: 'nombres' },
    { texte: 'Pourquoi 2 est-il le nombre premier le plus étrange ? Parce que c\'est le seul qui soit pair.', quoi: 'nombres' },
    { texte: 'Que dit un nombre pair à un nombre impair ? « Toi, tu es toujours à côté. »', quoi: 'nombres' },
    { texte: 'Pourquoi 1 n\'est-il pas un nombre premier ? Parce qu\'il n\'a qu\'un seul diviseur, et le club en exige deux.', quoi: 'nombres' },
    { texte: 'Pourquoi le nombre 13 se plaint-il ? Parce qu\'on l\'accuse toujours de porter malheur alors qu\'il est premier.', quoi: 'nombres' },
    { texte: 'Que fait un multiple de 9 ? Il additionne ses chiffres et retombe sur 9.', quoi: 'nombres' },
    { texte: 'Pourquoi les nombres décimaux sont-ils précis ? Parce qu\'ils ne s\'arrêtent pas à l\'unité.', quoi: 'nombres' },
    { texte: 'Que dit la virgule au chiffre ? « Sans moi, tu vaudrais dix fois plus. »', quoi: 'nombres' },

    // --- Puissances et grands nombres ---------------------------------------------------------
    { texte: 'Pourquoi 2⁵ est-il vexé ? Parce qu\'on croit toujours qu\'il vaut 10.', quoi: 'puissances' },
    { texte: 'Que dit 10⁶ à 10³ ? « Toi tu es mille, moi je suis un million. »', quoi: 'puissances' },
    { texte: 'Pourquoi l\'exposant est-il petit ? Pour ne pas se faire confondre avec un facteur.', quoi: 'puissances' },
    { texte: 'Que fait un exposant négatif ? Il devient tout petit, mais il reste positif.', quoi: 'puissances' },
    { texte: 'Pourquoi 10⁰ vaut-il 1 ? Parce qu\'il faut bien commencer quelque part.', quoi: 'puissances' },
    { texte: 'Pourquoi les informaticiens confondent-ils Halloween et Noël ? Parce que 31 en octal fait 25 en décimal.', quoi: 'nombres' },

    // --- Algèbre -----------------------------------------------------------------------------
    { texte: 'Pourquoi x est-il si populaire ? Parce que tout le monde le cherche.', quoi: 'litteral' },
    { texte: 'Que dit une équation à l\'autre ? « Sois équilibrée, comme moi. »', quoi: 'litteral' },
    { texte: 'Pourquoi 2x n\'a-t-il pas besoin du signe fois ? Parce qu\'entre un nombre et une lettre, ça va de soi.', quoi: 'litteral' },
    { texte: 'Que dit une inconnue quand on la trouve ? « Bon, maintenant je suis connue. »', quoi: 'litteral' },
    { texte: 'Pourquoi ne peut-on pas ajouter 3x et 2 ? Parce qu\'on n\'ajoute pas des pommes et des poires.', quoi: 'litteral' },
    { texte: 'Que fait un facteur commun ? Il sort de la parenthèse et attend dehors.', quoi: 'litteral' },

    // --- Statistiques et probabilités -------------------------------------------------------------
    { texte: 'Pourquoi la moyenne est-elle rassurante ? Parce qu\'elle cache les extrêmes.', quoi: 'donnees' },
    { texte: 'Que dit la médiane à la moyenne ? « Toi tu te laisses influencer, moi je reste au milieu. »', quoi: 'donnees' },
    { texte: 'Un statisticien se noie dans une rivière d\'un mètre de profondeur moyenne.', quoi: 'donnees' },
    { texte: 'Pourquoi le dé est-il honnête ? Parce qu\'il a six faces et aucune préférence.', quoi: 'probabilites' },
    { texte: 'Quelle est la probabilité de croiser un dinosaure demain ? Une chance sur deux : on le croise, ou pas.', quoi: 'probabilites' },
    { texte: 'Pourquoi la pièce de monnaie hésite-t-elle ? Parce qu\'elle est à cinquante-cinquante.', quoi: 'probabilites' },

    // --- Proportionnalité et pourcentages ------------------------------------------------------------
    { texte: 'Pourquoi le pourcentage est-il modeste ? Parce qu\'il ramène toujours tout à cent.', quoi: 'proportion' },
    { texte: 'Que dit une réduction de 50 % ? « Prends-en deux, tu paieras comme un. »', quoi: 'proportion' },
    { texte: 'Pourquoi la règle de trois s\'appelle-t-elle ainsi ? Parce qu\'avec trois nombres, elle en trouve un quatrième.', quoi: 'proportion' },
    { texte: 'Deux grandeurs proportionnelles se promènent : quand l\'une double, l\'autre suit sans discuter.', quoi: 'proportion' },
    { texte: 'Quel est le comble pour une échelle ? Ne pas être à la hauteur.', quoi: 'proportion' },

    // --- Le métier ------------------------------------------------------------------------------------
    { texte: 'Combien faut-il de mathématiciens pour changer une ampoule ? Un — il la donne à trois physiciens, ce qui ramène au problème précédent.', quoi: 'metier' },
    { texte: 'Un mathématicien dort mal : il compte les moutons, puis il vérifie sa somme.', quoi: 'metier' },
    { texte: 'Pourquoi un mathématicien ne se perd jamais ? Il connaît toujours au moins une solution.', quoi: 'metier' },
    { texte: 'Que répond un mathématicien à « ça va ? » ? « Ça dépend des hypothèses. »', quoi: 'metier' },
    { texte: 'Pourquoi les mathématiciens aiment-ils la campagne ? Parce que les champs y sont naturels.', quoi: 'metier' },
    { texte: 'Un professeur de maths ne vieillit pas : il change simplement d\'ordre de grandeur.', quoi: 'metier' }
];
