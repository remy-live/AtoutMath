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
    { texte: 'Que fait un mathématicien quand il a froid ? Il se met dans un coin, parce que c\'est 90 degrés.', quoi: 'angles' },
    { texte: 'Pourquoi le zéro a-t-il quitté le nombre ? Parce qu\'il ne comptait pour rien.', quoi: 'nombres' },
    { texte: 'Comment appelle-t-on un ami qui aime les maths ? Un algébriste — les autres, on les additionne.', quoi: 'vocabulaire' },
    { texte: 'Que dit un zéro à un huit ? « Jolie ceinture ! »', quoi: 'nombres' },

    // --- Opérations ------------------------------------------------------------
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
    { texte: 'Pourquoi l\'addition est-elle patiente ? Parce qu\'elle passe toujours en dernier.', quoi: 'priorites' },
    { texte: 'Que crie la puissance dans une file d\'attente ? « Je passe avant la multiplication ! »', quoi: 'puissances' },

    // --- Fractions ----------------------------------------------------------------
    { texte: 'Pourquoi les fractions se disputent-elles ? Elles n\'arrivent jamais à trouver un dénominateur commun.', quoi: 'fractions' },
    { texte: 'Que dit le numérateur au dénominateur ? « Arrête de me diviser. »', quoi: 'fractions' },
    { texte: 'Pourquoi 1/2 est-il optimiste ? Parce qu\'il voit toujours le verre à moitié plein.', quoi: 'fractions' },
    { texte: 'Que dit une fraction devant un miroir ? « Tiens, mon inverse. »', quoi: 'fractions' },
    { texte: 'Deux fractions se rencontrent. « Tu vas où ? — Au même dénominateur, comme tout le monde. »', quoi: 'fractions' },
    { texte: 'Pourquoi la pizza est-elle le meilleur professeur de fractions ? Parce qu\'on retient mieux ce qu\'on mange.', quoi: 'fractions' },

    // --- Géométrie : figures --------------------------------------------------------
    { texte: 'Pourquoi le cercle est-il si sûr de lui ? Parce qu\'il n\'a aucun angle mort.', quoi: 'geometrie' },
    { texte: 'Que dit le losange au carré ? « On a les mêmes côtés, mais toi tu te tiens droit. »', quoi: 'geometrie' },
    { texte: 'Pourquoi le trapèze est-il jaloux ? Parce qu\'il n\'a que deux côtés parallèles.', quoi: 'geometrie' },
    { texte: 'Pourquoi l\'hexagone est-il l\'ami des abeilles ? Parce qu\'il remplit sans laisser de vide.', quoi: 'geometrie' },
    { texte: 'Quel est le comble pour un cercle ? Ne pas boucler la boucle.', quoi: 'geometrie' },
    { texte: 'Pourquoi le cube ne prend-il jamais de vacances ? Parce qu\'il est toujours à six faces.', quoi: 'solides' },
    { texte: 'Que dit la sphère au cube ? « Toi, au moins, tu tiens en place. »', quoi: 'solides' },

    // --- Géométrie : droites et angles ---------------------------------------------------
    { texte: 'Pourquoi deux droites parallèles ne se disputent-elles jamais ? Parce qu\'elles ne se rencontrent pas.', quoi: 'droites' },
    { texte: 'Que se disent deux droites perpendiculaires ? « On se croise, mais on ne se ressemble pas. »', quoi: 'droites' },
    { texte: 'Pourquoi la médiatrice est-elle juste ? Parce qu\'elle ne favorise aucun des deux points.', quoi: 'droites' },
    { texte: 'Pourquoi l\'angle plat est-il fatigué ? Parce qu\'il est allongé toute la journée.', quoi: 'angles' },
    { texte: 'Que dit l\'angle aigu à l\'angle obtus ? « Tu prends toute la place. »', quoi: 'angles' },
    { texte: 'Pourquoi l\'angle droit est-il sérieux ? Parce qu\'il ne penche ni d\'un côté ni de l\'autre.', quoi: 'angles' },
    { texte: 'Que fait un angle nul ? Rien, justement.', quoi: 'angles' },
    { texte: 'Deux angles complémentaires se retrouvent : « À nous deux, on est parfaitement droits. »', quoi: 'angles' },

    // --- Pythagore et Thalès -----------------------------------------------------------
    { texte: 'Pourquoi Pythagore n\'a-t-il jamais eu de problème avec ses murs ? Ils étaient toujours d\'équerre.', quoi: 'pythagore' },
    { texte: 'Pourquoi Thalès aimait-il l\'ombre ? Parce qu\'elle lui a donné la hauteur des pyramides.', quoi: 'thales' },

    // --- Aires, périmètres, volumes -----------------------------------------------------
    { texte: 'Quelle différence entre le périmètre et l\'aire ? L\'un fait le tour, l\'autre reste dedans.', quoi: 'mesures' },
    { texte: 'Pourquoi le périmètre est-il bavard ? Parce qu\'il fait toujours le tour de la question.', quoi: 'mesures' },
    { texte: 'Pourquoi le kilomètre est-il fatigué ? Il vient de faire mille mètres.', quoi: 'mesures' },

    // --- Nombres particuliers -------------------------------------------------------------
    { texte: 'Que dit un nombre pair à un nombre impair ? « Toi, tu es toujours à côté. »', quoi: 'nombres' },
    { texte: 'Pourquoi le nombre 13 se plaint-il ? Parce qu\'on l\'accuse toujours de porter malheur alors qu\'il est premier.', quoi: 'nombres' },

    // --- Puissances et grands nombres ---------------------------------------------------------

    // --- Algèbre -----------------------------------------------------------------------------
    { texte: 'Pourquoi x est-il si populaire ? Parce que tout le monde le cherche.', quoi: 'litteral' },
    { texte: 'Que dit une équation à l\'autre ? « Sois équilibrée, comme moi. »', quoi: 'litteral' },
    { texte: 'Pourquoi ne peut-on pas ajouter 3x et 2 ? Parce qu\'on n\'ajoute pas des pommes et des poires.', quoi: 'litteral' },
    { texte: 'Que fait un facteur commun ? Il sort de la parenthèse et attend dehors.', quoi: 'litteral' },

    // --- Statistiques et probabilités -------------------------------------------------------------
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
    { texte: 'Un mathématicien dort mal : il compte les moutons, puis il vérifie sa somme.', quoi: 'metier' },
    { texte: 'Que répond un mathématicien à « ça va ? » ? « Ça dépend des hypothèses. »', quoi: 'metier' },

    // --- Deuxième centaine : vocabulaire et généralités ----------------------------------
    { texte: 'Que dit une conjecture à un théorème ? « Toi au moins, on te croit. »', quoi: 'vocabulaire' },
    { texte: 'Pourquoi le contre-exemple est-il craint ? Un seul suffit à tout casser.', quoi: 'vocabulaire' },
    { texte: 'Que dit un mathématicien perdu ? « Je suis dans un cas particulier. »', quoi: 'vocabulaire' },
    { texte: 'Pourquoi la règle de trois s\'appelle-t-elle ainsi ? Parce qu\'à la quatrième, elle donne la réponse.', quoi: 'proportion' },
    { texte: 'Que dit un problème résolu ? « Enfin tranquille. »', quoi: 'vocabulaire' },
    { texte: 'Pourquoi le brouillon est-il l\'ami du mathématicien ? Parce qu\'il a le droit de se tromper.', quoi: 'vocabulaire' },
    { texte: 'Quel est le comble pour un exercice ? De ne pas avoir de solution — et d\'être quand même juste.', quoi: 'vocabulaire' },
    { texte: 'Que dit la copie à l\'élève ? « Écris ton raisonnement, pas seulement le résultat. »', quoi: 'vocabulaire' },

    // --- Deuxième centaine : nombres -----------------------------------------------------
    { texte: 'Que dit un nombre premier à un autre ? « Nous n\'avons rien en commun, à part 1. »', quoi: 'nombres' },
    { texte: 'Pourquoi 13 fait-il peur ? Parce qu\'il est premier, et qu\'il n\'a peur de rien.', quoi: 'nombres' },
    { texte: 'Que dit 2 aux autres nombres premiers ? « Je suis le seul pair du club. »', quoi: 'nombres' },
    { texte: 'Que fait un nombre négatif à la piscine ? Il plonge sous zéro.', quoi: 'relatifs' },
    { texte: 'Pourquoi les nombres pairs s\'entendent-ils bien ? Ils se partagent toujours en deux.', quoi: 'nombres' },
    { texte: 'Que dit un grand nombre à un petit ? « Ne t\'en fais pas, tout est relatif. »', quoi: 'relatifs' },

    // --- Deuxième centaine : opérations --------------------------------------------------
    { texte: 'Pourquoi la division est-elle honnête ? Elle avoue toujours son reste.', quoi: 'operations' },
    { texte: 'Que dit la soustraction à l\'addition ? « Toi tu donnes, moi je reprends. »', quoi: 'operations' },
    { texte: 'Pourquoi le zéro est-il dangereux en division ? Parce qu\'il fait tout disparaître, y compris la question.', quoi: 'operations' },
    { texte: 'Pourquoi la retenue s\'appelle-t-elle ainsi ? Parce qu\'on la retient — et souvent on l\'oublie.', quoi: 'operations' },
    { texte: 'Que dit une opération à parenthèses ? « Moi d\'abord. »', quoi: 'priorites' },
    { texte: 'Quel est le comble pour une calculatrice ? De ne pas savoir compter sur ses doigts.', quoi: 'operations' },
    { texte: 'Que dit le signe égal ? « Des deux côtés, la même chose — sinon je n\'ai rien à faire ici. »', quoi: 'equations' },

    // --- Deuxième centaine : fractions ---------------------------------------------------
    { texte: 'Que dit le numérateur au dénominateur ? « Sans toi, je ne vaux rien. »', quoi: 'fractions' },
    { texte: 'Pourquoi les fractions se disputent-elles ? Parce qu\'elles n\'ont pas le même dénominateur.', quoi: 'fractions' },
    { texte: 'Comment réconcilier deux fractions ? On leur trouve un dénominateur commun.', quoi: 'fractions' },
    { texte: 'Pourquoi une demie et deux quarts s\'entendent-elles si bien ? Elles sont d\'accord sur tout.', quoi: 'fractions' },
    { texte: 'Que dit une fraction simplifiée ? « Je me sens plus légère. »', quoi: 'fractions' },
    { texte: 'Que dit le pourcentage à la fraction ? « Toi tu es exacte, moi je suis lisible. »', quoi: 'fractions' },

    // --- Deuxième centaine : géométrie ---------------------------------------------------
    { texte: 'Que dit l\'hypoténuse aux deux autres côtés ? « À vous deux, vous me valez — au carré. »', quoi: 'pythagore' },
    { texte: 'Pourquoi les droites parallèles sont-elles tristes ? Elles ne se rencontreront jamais.', quoi: 'geometrie' },
    { texte: 'Que dit la médiatrice ? « Je ne prends parti pour personne : je suis à égale distance. »', quoi: 'geometrie' },
    { texte: 'Que dit un angle plat ? « Je me suis complètement étalé : 180 degrés. »', quoi: 'angles' },
    { texte: 'Que dit le compas à la règle ? « Toi tu vas tout droit, moi je tourne en rond. »', quoi: 'geometrie' },
    { texte: 'Que dit une diagonale ? « Je coupe à travers, c\'est plus court. »', quoi: 'geometrie' },
    { texte: 'Que dit le cylindre au cône ? « Toi tu finis en pointe, moi je reste égal à moi-même. »', quoi: 'geometrie' },

    // --- Deuxième centaine : mesures et proportions --------------------------------------
    { texte: 'Que dit le litre au décimètre cube ? « On est le même, habillés autrement. »', quoi: 'mesures' },
    { texte: 'Pourquoi le gramme est-il discret ? Parce qu\'il faut mille de ses amis pour faire un kilo.', quoi: 'mesures' },
    { texte: 'Pourquoi la vitesse moyenne est-elle trompeuse ? Parce qu\'elle ne dit rien des embouteillages.', quoi: 'proportion' },
    { texte: 'Que dit un pourcentage de réduction à un autre ? « Ne t\'additionne pas à moi, on va se tromper. »', quoi: 'proportion' },

    // --- Deuxième centaine : statistiques et hasard --------------------------------------
    { texte: 'Pourquoi la moyenne est-elle mal aimée ? Parce qu\'elle ne ressemble à personne.', quoi: 'statistiques' },
    { texte: 'Pourquoi le dé n\'a-t-il pas de mémoire ? Parce qu\'à chaque lancer, il repart à zéro.', quoi: 'probabilites' },
    { texte: 'Que dit un joueur malchanceux ? « Ça va tourner. » Que dit le dé ? Rien : il n\'écoute pas.', quoi: 'probabilites' },
    { texte: 'Pourquoi l\'étendue est-elle si simple ? Elle ne regarde que les deux extrêmes.', quoi: 'statistiques' },

    // --- Deuxième centaine : calcul littéral et équations --------------------------------
    { texte: 'Pourquoi l\'inconnue se cache-t-elle ? Parce qu\'une fois trouvée, l\'exercice est fini.', quoi: 'litteral' },
    { texte: 'Que dit x à y ? « Nous ne pouvons pas nous additionner, arrête d\'essayer. »', quoi: 'litteral' },
    { texte: 'Pourquoi x² ne veut-il pas s\'asseoir à côté de x ? Ils n\'ont pas le même degré.', quoi: 'litteral' },
    { texte: 'Que dit une équation à celui qui la résout ? « Fais la même chose des deux côtés, et tout se passera bien. »', quoi: 'equations' },
    { texte: 'Que dit le signe × devant une lettre ? Rien : il a disparu.', quoi: 'litteral' },
    { texte: 'Pourquoi l\'inconnue s\'appelle-t-elle ainsi ? Parce qu\'à la fin de l\'exercice, on la connaît.', quoi: 'equations' },
    { texte: 'Que dit une identité remarquable ? « Apprends-moi une fois, je te servirai cent fois. »', quoi: 'litteral' },

    // --- Deuxième centaine : la classe ---------------------------------------------------
    { texte: 'Pourquoi l\'élève a-t-il rendu une copie vide ? Il attendait un énoncé plus clair.', quoi: 'classe' },
    { texte: 'Que dit le professeur devant une réponse sans calcul ? « Et le chemin, tu l\'as perdu ? »', quoi: 'classe' },
    { texte: 'Pourquoi le cahier de brouillon est-il le plus utile ? Parce que c\'est là que les idées naissent.', quoi: 'classe' },
    { texte: 'Pourquoi le tableau est-il patient ? Parce qu\'on peut toujours l\'effacer.', quoi: 'classe' },
    { texte: 'Que dit la calculatrice à l\'élève ? « Je réponds vite, mais c\'est toi qui dois savoir quoi demander. »', quoi: 'classe' },
    { texte: 'Pourquoi l\'erreur est-elle utile ? Parce qu\'elle montre exactement où l\'on a cessé de comprendre.', quoi: 'classe' },
    { texte: 'Que dit un exercice refait une deuxième fois ? « Cette fois, tu as compris. »', quoi: 'classe' },
    { texte: 'Que dit la règle graduée ? « Je mesure tout, sauf les progrès. »', quoi: 'classe' },
    { texte: 'Pourquoi la leçon est-elle courte ? Parce que l\'essentiel tient en peu de mots — le reste, c\'est de l\'entraînement.', quoi: 'classe' },
    { texte: 'Que dit l\'élève qui a compris ? « En fait, c\'était logique. »', quoi: 'classe' },
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
