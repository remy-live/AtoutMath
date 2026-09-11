// DEUX CENTS BLAGUES DE MATHÉMATIQUES, TRÈS COURTES.
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
//
// DEUX CENTS, ET NON CENT. Rémy : « je peux aussi faire un retour sur les
// proverbes, blagues et autres, car il y en a à supprimer, mets-en alors deux
// cents et un clic oui ou non et je te l'envoie. » C'est la bonne façon de
// faire : on ne devine pas ce qui fera rire une classe de cinquième, on le lui
// soumet. Deux cents laissent de quoi en jeter la moitié et garder une année
// entière — le banc d'essai porte les boutons ✓ et ✕ pour cela.

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
    { texte: 'Un professeur de maths ne vieillit pas : il change simplement d\'ordre de grandeur.', quoi: 'metier' },

    // --- Deuxième centaine : vocabulaire et généralités ----------------------------------
    { texte: 'Pourquoi le théorème est-il si sûr de lui ? Parce qu\'il a toujours une démonstration derrière lui.', quoi: 'vocabulaire' },
    { texte: 'Que dit une conjecture à un théorème ? « Toi au moins, on te croit. »', quoi: 'vocabulaire' },
    { texte: 'Pourquoi les maths n\'ont-elles jamais tort ? Parce qu\'elles ne disent que ce qu\'elles peuvent prouver.', quoi: 'vocabulaire' },
    { texte: 'Quel est le comble pour un axiome ? Qu\'on lui demande pourquoi.', quoi: 'vocabulaire' },
    { texte: 'Pourquoi le contre-exemple est-il craint ? Un seul suffit à tout casser.', quoi: 'vocabulaire' },
    { texte: 'Que dit un mathématicien perdu ? « Je suis dans un cas particulier. »', quoi: 'vocabulaire' },
    { texte: 'Pourquoi l\'énoncé est-il si important ? Parce que la moitié des erreurs sont des lectures.', quoi: 'vocabulaire' },
    { texte: 'Quel est le mot préféré du professeur de maths ? « Donc. »', quoi: 'vocabulaire' },
    { texte: 'Pourquoi la règle de trois s\'appelle-t-elle ainsi ? Parce qu\'à la quatrième, elle donne la réponse.', quoi: 'proportion' },
    { texte: 'Que dit un problème résolu ? « Enfin tranquille. »', quoi: 'vocabulaire' },
    { texte: 'Pourquoi le brouillon est-il l\'ami du mathématicien ? Parce qu\'il a le droit de se tromper.', quoi: 'vocabulaire' },
    { texte: 'Quel est le comble pour un exercice ? De ne pas avoir de solution — et d\'être quand même juste.', quoi: 'vocabulaire' },
    { texte: 'Que dit la copie à l\'élève ? « Écris ton raisonnement, pas seulement le résultat. »', quoi: 'vocabulaire' },

    // --- Deuxième centaine : nombres -----------------------------------------------------
    { texte: 'Pourquoi 1 est-il si seul ? Parce qu\'il n\'est ni premier ni composé.', quoi: 'nombres' },
    { texte: 'Que dit un nombre premier à un autre ? « Nous n\'avons rien en commun, à part 1. »', quoi: 'nombres' },
    { texte: 'Pourquoi 13 fait-il peur ? Parce qu\'il est premier, et qu\'il n\'a peur de rien.', quoi: 'nombres' },
    { texte: 'Que dit 2 aux autres nombres premiers ? « Je suis le seul pair du club. »', quoi: 'nombres' },
    { texte: 'Pourquoi le nombre π ne s\'arrête-t-il jamais ? Parce qu\'il n\'a jamais trouvé la sortie.', quoi: 'nombres' },
    { texte: 'Que fait un nombre négatif à la piscine ? Il plonge sous zéro.', quoi: 'relatifs' },
    { texte: 'Pourquoi les nombres pairs s\'entendent-ils bien ? Ils se partagent toujours en deux.', quoi: 'nombres' },
    { texte: 'Que dit 100 à 99 ? « Tu vois, il suffisait d\'un peu plus. »', quoi: 'nombres' },
    { texte: 'Pourquoi le zéro est-il un bon gardien ? Parce que rien ne passe.', quoi: 'nombres' },
    { texte: 'Que dit un grand nombre à un petit ? « Ne t\'en fais pas, tout est relatif. »', quoi: 'relatifs' },
    { texte: 'Pourquoi 9 est-il fatigué ? Parce qu\'à chaque table il finit par revenir à lui-même.', quoi: 'nombres' },
    { texte: 'Que dit un nombre décimal à un entier ? « Moi au moins, je suis précis. »', quoi: 'decimaux' },

    // --- Deuxième centaine : opérations --------------------------------------------------
    { texte: 'Pourquoi la division est-elle honnête ? Elle avoue toujours son reste.', quoi: 'operations' },
    { texte: 'Que dit la soustraction à l\'addition ? « Toi tu donnes, moi je reprends. »', quoi: 'operations' },
    { texte: 'Pourquoi le zéro est-il dangereux en division ? Parce qu\'il fait tout disparaître, y compris la question.', quoi: 'operations' },
    { texte: 'Que dit un facteur à un autre ? « Peu importe l\'ordre, on obtient la même chose. »', quoi: 'operations' },
    { texte: 'Pourquoi la retenue s\'appelle-t-elle ainsi ? Parce qu\'on la retient — et souvent on l\'oublie.', quoi: 'operations' },
    { texte: 'Que dit une opération à parenthèses ? « Moi d\'abord. »', quoi: 'priorites' },
    { texte: 'Pourquoi la multiplication est-elle pressée ? Parce qu\'elle fait en une fois ce que l\'addition fait dix fois.', quoi: 'operations' },
    { texte: 'Quel est le comble pour une calculatrice ? De ne pas savoir compter sur ses doigts.', quoi: 'operations' },
    { texte: 'Que dit le signe égal ? « Des deux côtés, la même chose — sinon je n\'ai rien à faire ici. »', quoi: 'equations' },
    { texte: 'Pourquoi la puissance est-elle impatiente ? Parce qu\'elle multiplie tout de suite plusieurs fois.', quoi: 'puissances' },

    // --- Deuxième centaine : fractions ---------------------------------------------------
    { texte: 'Pourquoi la fraction est-elle bavarde ? Parce qu\'elle raconte toujours deux choses à la fois.', quoi: 'fractions' },
    { texte: 'Que dit le numérateur au dénominateur ? « Sans toi, je ne vaux rien. »', quoi: 'fractions' },
    { texte: 'Pourquoi les fractions se disputent-elles ? Parce qu\'elles n\'ont pas le même dénominateur.', quoi: 'fractions' },
    { texte: 'Comment réconcilier deux fractions ? On leur trouve un dénominateur commun.', quoi: 'fractions' },
    { texte: 'Pourquoi une demie et deux quarts s\'entendent-elles si bien ? Elles sont d\'accord sur tout.', quoi: 'fractions' },
    { texte: 'Que dit une fraction simplifiée ? « Je me sens plus légère. »', quoi: 'fractions' },
    { texte: 'Pourquoi un tiers est-il modeste ? Parce qu\'il ne se prend jamais pour un entier.', quoi: 'fractions' },
    { texte: 'Que dit le pourcentage à la fraction ? « Toi tu es exacte, moi je suis lisible. »', quoi: 'fractions' },

    // --- Deuxième centaine : géométrie ---------------------------------------------------
    { texte: 'Pourquoi le cercle est-il si détendu ? Il n\'a aucun angle.', quoi: 'geometrie' },
    { texte: 'Que dit le carré au rectangle ? « Nous sommes de la même famille, mais moi je suis régulier. »', quoi: 'geometrie' },
    { texte: 'Pourquoi le triangle rectangle est-il célèbre ? Parce qu\'il a un théorème à son nom.', quoi: 'pythagore' },
    { texte: 'Que dit l\'hypoténuse aux deux autres côtés ? « À vous deux, vous me valez — au carré. »', quoi: 'pythagore' },
    { texte: 'Pourquoi les droites parallèles sont-elles tristes ? Elles ne se rencontreront jamais.', quoi: 'geometrie' },
    { texte: 'Que dit la médiatrice ? « Je ne prends parti pour personne : je suis à égale distance. »', quoi: 'geometrie' },
    { texte: 'Pourquoi le losange est-il fier ? Ses quatre côtés sont égaux, et il ne s\'en cache pas.', quoi: 'geometrie' },
    { texte: 'Que dit un angle plat ? « Je me suis complètement étalé : 180 degrés. »', quoi: 'angles' },
    { texte: 'Pourquoi la sphère n\'a-t-elle pas d\'amis ? Elle n\'a aucun sommet où les recevoir.', quoi: 'geometrie' },
    { texte: 'Que dit le compas à la règle ? « Toi tu vas tout droit, moi je tourne en rond. »', quoi: 'geometrie' },
    { texte: 'Que dit un angle aigu à un angle obtus ? « Toi tu t\'étales, moi je vais droit au but. »', quoi: 'angles' },
    { texte: 'Que dit une diagonale ? « Je coupe à travers, c\'est plus court. »', quoi: 'geometrie' },
    { texte: 'Pourquoi le cube est-il carré ? Parce que six fois, il ne peut pas se tromper.', quoi: 'geometrie' },
    { texte: 'Que dit le cylindre au cône ? « Toi tu finis en pointe, moi je reste égal à moi-même. »', quoi: 'geometrie' },

    // --- Deuxième centaine : mesures et proportions --------------------------------------
    { texte: 'Pourquoi le mètre est-il si sûr de lui ? Il sert d\'étalon à tout le monde.', quoi: 'mesures' },
    { texte: 'Que dit le litre au décimètre cube ? « On est le même, habillés autrement. »', quoi: 'mesures' },
    { texte: 'Pourquoi le gramme est-il discret ? Parce qu\'il faut mille de ses amis pour faire un kilo.', quoi: 'mesures' },
    { texte: 'Que dit l\'échelle d\'une carte ? « Je réduis tout, sauf les distances entre les gens. »', quoi: 'proportion' },
    { texte: 'Pourquoi la vitesse moyenne est-elle trompeuse ? Parce qu\'elle ne dit rien des embouteillages.', quoi: 'proportion' },
    { texte: 'Que dit un pourcentage de réduction à un autre ? « Ne t\'additionne pas à moi, on va se tromper. »', quoi: 'proportion' },
    { texte: 'Pourquoi le kilomètre-heure et le mètre-seconde ne s\'entendent-ils pas ? Il y a un facteur 3,6 entre eux.', quoi: 'proportion' },

    // --- Deuxième centaine : statistiques et hasard --------------------------------------
    { texte: 'Pourquoi la moyenne est-elle mal aimée ? Parce qu\'elle ne ressemble à personne.', quoi: 'statistiques' },
    { texte: 'Que dit la médiane à la moyenne ? « Moi au moins, un cas extrême ne me fait pas bouger. »', quoi: 'statistiques' },
    { texte: 'Pourquoi le dé n\'a-t-il pas de mémoire ? Parce qu\'à chaque lancer, il repart à zéro.', quoi: 'probabilites' },
    { texte: 'Que dit un joueur malchanceux ? « Ça va tourner. » Que dit le dé ? Rien : il n\'écoute pas.', quoi: 'probabilites' },
    { texte: 'Pourquoi l\'étendue est-elle si simple ? Elle ne regarde que les deux extrêmes.', quoi: 'statistiques' },
    { texte: 'Que dit un sondage sur mille personnes ? « Je parle de soixante millions, et parfois j\'ai raison. »', quoi: 'statistiques' },

    // --- Deuxième centaine : calcul littéral et équations --------------------------------
    { texte: 'Pourquoi l\'inconnue se cache-t-elle ? Parce qu\'une fois trouvée, l\'exercice est fini.', quoi: 'litteral' },
    { texte: 'Que dit x à y ? « Nous ne pouvons pas nous additionner, arrête d\'essayer. »', quoi: 'litteral' },
    { texte: 'Pourquoi x² ne veut-il pas s\'asseoir à côté de x ? Ils n\'ont pas le même degré.', quoi: 'litteral' },
    { texte: 'Que dit une équation à celui qui la résout ? « Fais la même chose des deux côtés, et tout se passera bien. »', quoi: 'equations' },
    { texte: 'Pourquoi le coefficient 1 ne s\'écrit-il pas ? Parce qu\'il est trop modeste.', quoi: 'litteral' },
    { texte: 'Que dit le signe × devant une lettre ? Rien : il a disparu.', quoi: 'litteral' },
    { texte: 'Pourquoi l\'inconnue s\'appelle-t-elle ainsi ? Parce qu\'à la fin de l\'exercice, on la connaît.', quoi: 'equations' },
    { texte: 'Que dit une identité remarquable ? « Apprends-moi une fois, je te servirai cent fois. »', quoi: 'litteral' },

    // --- Deuxième centaine : la classe ---------------------------------------------------
    { texte: 'Pourquoi l\'élève a-t-il rendu une copie vide ? Il attendait un énoncé plus clair.', quoi: 'classe' },
    { texte: 'Que dit le professeur devant une réponse sans calcul ? « Et le chemin, tu l\'as perdu ? »', quoi: 'classe' },
    { texte: 'Pourquoi le cahier de brouillon est-il le plus utile ? Parce que c\'est là que les idées naissent.', quoi: 'classe' },
    { texte: 'Que dit un contrôle bien préparé ? « Tiens, je te reconnais. »', quoi: 'classe' },
    { texte: 'Pourquoi le tableau est-il patient ? Parce qu\'on peut toujours l\'effacer.', quoi: 'classe' },
    { texte: 'Que dit la calculatrice à l\'élève ? « Je réponds vite, mais c\'est toi qui dois savoir quoi demander. »', quoi: 'classe' },
    { texte: 'Pourquoi l\'erreur est-elle utile ? Parce qu\'elle montre exactement où l\'on a cessé de comprendre.', quoi: 'classe' },
    { texte: 'Que dit un exercice refait une deuxième fois ? « Cette fois, tu as compris. »', quoi: 'classe' },
    { texte: 'Pourquoi le compas troue-t-il les copies ? Parce qu\'il appuie là où ça compte.', quoi: 'classe' },
    { texte: 'Que dit la règle graduée ? « Je mesure tout, sauf les progrès. »', quoi: 'classe' },
    { texte: 'Pourquoi la leçon est-elle courte ? Parce que l\'essentiel tient en peu de mots — le reste, c\'est de l\'entraînement.', quoi: 'classe' },
    { texte: 'Que dit l\'élève qui a compris ? « En fait, c\'était logique. »', quoi: 'classe' },
    { texte: 'Pourquoi un problème résolu ensemble vaut-il mieux que dix copiés ? Parce qu\'on se souvient de ce qu\'on a cherché.', quoi: 'classe' },
    { texte: 'Que dit le manuel fermé ? « Ouvre-moi avant le contrôle, pas pendant. »', quoi: 'classe' },
    { texte: 'Pourquoi le devoir maison est-il redouté ? Parce qu\'on ne peut pas dire qu\'on n\'a pas eu le temps.', quoi: 'classe' },
    { texte: 'Que dit la sonnerie au milieu d\'une démonstration ? Elle ne dit rien, mais tout le monde l\'entend.', quoi: 'classe' },
    { texte: 'Pourquoi le professeur sourit-il devant une erreur ? Parce qu\'il sait ce qu\'elle va faire comprendre.', quoi: 'classe' },
    { texte: 'Que dit une bonne question ? « Je vaux mieux qu\'une bonne réponse. »', quoi: 'classe' },
    { texte: 'Pourquoi les maths se font-elles au crayon ? Pour que l\'erreur ne soit jamais définitive.', quoi: 'classe' },
    { texte: 'Que dit le résultat sans unité ? Rien de compréhensible.', quoi: 'classe' },
    { texte: 'Pourquoi la démonstration se termine-t-elle par un petit carré ? Parce qu\'après, il n\'y a plus rien à dire.', quoi: 'vocabulaire' },
    { texte: 'Que dit l\'unité oubliée dans un résultat ? « Sans moi, ton nombre ne veut rien dire. »', quoi: 'mesures' }
];
