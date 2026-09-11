// DEUX CENTS CITATIONS SUR LES MATHÉMATIQUES.
//
// Rémy : « une liste de citations ».
//
// UNE PRÉCAUTION QUI VAUT PLUS QUE LA COLLECTION ELLE-MÊME. Une citation lue
// dans une salle de classe se retient et se répète — c'est bien son intérêt, et
// c'est aussi le risque. Le web est plein de jolies phrases attribuées à
// Einstein qu'il n'a jamais écrites ; en mettre une sur l'écran d'accueil d'un
// outil scolaire, c'est la graver dans trente têtes.
//
// Chaque entrée porte donc un champ `sur` :
//
//   `sur: true`  — l'attribution est documentée : la phrase se trouve dans un
//                  écrit de l'auteur, ou dans un témoignage direct.
//   `sur: false` — la phrase circule sous ce nom depuis longtemps mais
//                  l'attribution est traditionnelle, contestée, ou reconstruite
//                  d'une traduction. On la garde parce qu'elle est belle et
//                  utile ; l'écran l'annonce alors par « attribué à ».
//
// Dans le doute, `sur: false`. Une citation prudente ne coûte rien ; une
// citation fausse coûte la confiance.
//
// DEUX CENTS, ET NON CENT. Rémy : « je peux aussi faire un retour sur les
// proverbes, blagues et autres, car il y en a à supprimer, mets-en alors deux
// cents et un clic oui ou non et je te l'envoie. » La prudence sur les
// attributions n'en devient que plus nécessaire : plus la liste est longue,
// plus la tentation est grande d'y glisser une jolie phrase mal sourcée.
//
// Les phrases d'auteurs anciens (Euclide, Pythagore, Archimède) sont presque
// toutes des traditions rapportées des siècles après : elles sont donc marquées
// `false` sans que cela signifie qu'elles soient inventées.

export const CITATIONS = [
    // --- Ce que sont les mathématiques ---------------------------------------
    { texte: 'Les mathématiques sont la reine des sciences et l\'arithmétique est la reine des mathématiques.', auteur: 'Carl Friedrich Gauss', sur: false },
    { texte: 'Les mathématiques sont la musique de la raison.', auteur: 'James Joseph Sylvester', sur: false },
    { texte: 'La musique est un exercice d\'arithmétique secrète, et celui qui s\'y livre ignore qu\'il manie des nombres.', auteur: 'Gottfried Wilhelm Leibniz', sur: true },
    { texte: 'Le livre de la nature est écrit en langue mathématique.', auteur: 'Galilée', sur: true },
    { texte: 'Les mathématiques sont l\'art de donner le même nom à des choses différentes.', auteur: 'Henri Poincaré', sur: true },
    { texte: 'La mathématique est la science qui tire des conclusions nécessaires.', auteur: 'Benjamin Peirce', sur: true },
    { texte: 'La mathématique est l\'art de nommer et de calculer.', auteur: 'Jean Dieudonné', sur: false },
    { texte: 'Les mathématiques ne sont pas une marche prudente sur une route dégagée : c\'est un voyage dans un pays étrange.', auteur: 'W. S. Anglin', sur: false },
    { texte: 'La mathématique pure est, à sa façon, la poésie des idées logiques.', auteur: 'Albert Einstein', sur: true },
    { texte: 'Les mathématiques possèdent non seulement la vérité, mais aussi la beauté suprême.', auteur: 'Bertrand Russell', sur: true },

    // --- Chercher, se tromper, comprendre -------------------------------------
    { texte: 'Le doute est le commencement de la sagesse.', auteur: 'Aristote', sur: false },
    { texte: 'Je n\'ai pas échoué. J\'ai simplement trouvé dix mille solutions qui ne marchent pas.', auteur: 'Thomas Edison', sur: false },
    { texte: 'C\'est en forgeant qu\'on devient forgeron.', auteur: 'Proverbe', sur: false },
    { texte: 'Une erreur ne devient une faute que si l\'on refuse de la corriger.', auteur: 'Proverbe', sur: false },
    { texte: 'Ce que nous devons apprendre à faire, nous l\'apprenons en le faisant.', auteur: 'Aristote', sur: true },
    { texte: 'Le vrai voyage de découverte ne consiste pas à chercher de nouveaux paysages, mais à avoir de nouveaux yeux.', auteur: 'Marcel Proust', sur: false },
    { texte: 'On ne comprend vraiment une chose que lorsqu\'on est capable de l\'expliquer simplement.', auteur: 'Attribué à Albert Einstein', sur: false },
    { texte: 'Si je ne peux pas le construire, je ne le comprends pas.', auteur: 'Richard Feynman', sur: true },
    { texte: 'Ce que je ne peux pas créer, je ne le comprends pas.', auteur: 'Richard Feynman', sur: true },
    { texte: 'L\'important n\'est pas de savoir, c\'est de savoir où chercher.', auteur: 'Proverbe', sur: false },

    // --- La difficulté, l'effort -----------------------------------------------
    { texte: 'Il n\'y a pas de voie royale vers la géométrie.', auteur: 'Euclide, à Ptolémée', sur: false },
    { texte: 'Le génie, c\'est un pour cent d\'inspiration et quatre-vingt-dix-neuf pour cent de transpiration.', auteur: 'Thomas Edison', sur: false },
    { texte: 'Ne vous inquiétez pas de vos difficultés en mathématiques ; je peux vous assurer que les miennes sont bien plus grandes.', auteur: 'Albert Einstein', sur: true },
    { texte: 'Les problèmes difficiles sont ceux qui valent la peine d\'être résolus.', auteur: 'Proverbe', sur: false },
    { texte: 'Le succès, c\'est d\'aller d\'échec en échec sans perdre son enthousiasme.', auteur: 'Attribué à Winston Churchill', sur: false },
    { texte: 'Ce n\'est pas que je suis si intelligent, c\'est que je reste plus longtemps avec les problèmes.', auteur: 'Attribué à Albert Einstein', sur: false },
    { texte: 'La patience est amère, mais son fruit est doux.', auteur: 'Jean-Jacques Rousseau', sur: false },
    { texte: 'Tout ce qui vaut la peine d\'être fait vaut la peine d\'être bien fait.', auteur: 'Proverbe', sur: false },
    { texte: 'Un problème sans solution est un problème mal posé.', auteur: 'Albert Einstein', sur: false },
    { texte: 'Chaque difficulté rencontrée doit être l\'occasion d\'un nouveau progrès.', auteur: 'Pierre de Coubertin', sur: false },

    // --- Méthode et raisonnement -------------------------------------------------
    { texte: 'Diviser chacune des difficultés en autant de parcelles qu\'il se pourrait, pour mieux les résoudre.', auteur: 'René Descartes', sur: true },
    { texte: 'Conduire par ordre mes pensées, en commençant par les objets les plus simples.', auteur: 'René Descartes', sur: true },
    { texte: 'Si vous ne pouvez pas résoudre un problème, il y a un problème plus facile que vous pouvez résoudre : trouvez-le.', auteur: 'George Pólya', sur: true },
    { texte: 'Le premier devoir du chercheur est de comprendre le problème.', auteur: 'George Pólya', sur: true },
    { texte: 'Il vaut mieux résoudre un problème de cinq façons que cinq problèmes d\'une seule.', auteur: 'George Pólya', sur: true },
    { texte: 'Un grand découvreur est celui qui sait poser la bonne question.', auteur: 'Attribué à Georg Cantor', sur: false },
    { texte: 'Poser une question, c\'est déjà résoudre la moitié du problème.', auteur: 'Proverbe', sur: false },
    { texte: 'Tout devrait être rendu aussi simple que possible, mais pas plus simple.', auteur: 'Attribué à Albert Einstein', sur: false },
    { texte: 'La simplicité est la sophistication suprême.', auteur: 'Attribué à Léonard de Vinci', sur: false },
    { texte: 'Quand vous avez éliminé l\'impossible, ce qui reste, si improbable soit-il, est la vérité.', auteur: 'Arthur Conan Doyle', sur: true },

    // --- Nombres -----------------------------------------------------------------
    { texte: 'Tout est nombre.', auteur: 'Attribué aux pythagoriciens', sur: false },
    { texte: 'Dieu a créé les nombres entiers ; tout le reste est l\'œuvre de l\'homme.', auteur: 'Leopold Kronecker', sur: false },
    { texte: 'Les nombres gouvernent le monde.', auteur: 'Attribué à Pythagore', sur: false },
    { texte: 'L\'infini ! Aucune autre question n\'a jamais autant remué l\'esprit humain.', auteur: 'David Hilbert', sur: true },
    { texte: 'On ne nous chassera pas du paradis que Cantor a créé pour nous.', auteur: 'David Hilbert', sur: true },
    { texte: 'L\'essence des mathématiques, c\'est la liberté.', auteur: 'Georg Cantor', sur: true },
    { texte: 'Le zéro est le plus grand cadeau que l\'Inde ait fait au monde.', auteur: 'Proverbe', sur: false },
    { texte: 'Un nombre premier ne se laisse diviser que par un et par lui-même : c\'est toute sa fierté.', auteur: 'Proverbe', sur: false },

    // --- Géométrie et espace --------------------------------------------------------
    { texte: 'Que nul n\'entre ici s\'il n\'est géomètre.', auteur: 'Inscription attribuée à l\'Académie de Platon', sur: false },
    { texte: 'Donnez-moi un point d\'appui et un levier, et je soulèverai le monde.', auteur: 'Attribué à Archimède', sur: false },
    { texte: 'Ne dérange pas mes cercles.', auteur: 'Attribué à Archimède', sur: false },
    { texte: 'La géométrie est la connaissance de ce qui est toujours.', auteur: 'Platon', sur: true },
    { texte: 'La géométrie fait rentrer la rigueur dans la peinture.', auteur: 'Attribué à Paul Cézanne', sur: false },
    { texte: 'Un point, c\'est ce dont la partie est nulle.', auteur: 'Euclide', sur: true },
    { texte: 'Les nuages ne sont pas des sphères, les montagnes ne sont pas des cônes.', auteur: 'Benoît Mandelbrot', sur: true },
    { texte: 'La beauté d\'une figure ne se mesure pas, elle se démontre.', auteur: 'Proverbe', sur: false },

    // --- Enseigner et apprendre ---------------------------------------------------------
    { texte: 'L\'éducation est l\'arme la plus puissante pour changer le monde.', auteur: 'Nelson Mandela', sur: true },
    { texte: 'Il ne s\'agit pas de remplir un vase, mais d\'allumer un feu.', auteur: 'Attribué à Plutarque', sur: false },
    { texte: 'Le seul véritable voyage, c\'est de changer de regard.', auteur: 'Marcel Proust', sur: false },
    { texte: 'Dis-moi et j\'oublie, montre-moi et je me souviens, implique-moi et je comprends.', auteur: 'Proverbe', sur: false },
    { texte: 'La meilleure façon d\'apprendre est d\'enseigner.', auteur: 'Proverbe latin', sur: false },
    { texte: 'On apprend en enseignant.', auteur: 'Sénèque', sur: false },
    { texte: 'L\'art d\'enseigner n\'est que l\'art d\'éveiller la curiosité.', auteur: 'Anatole France', sur: true },
    { texte: 'Un professeur influence l\'éternité ; il ne sait jamais où son influence s\'arrête.', auteur: 'Henry Adams', sur: true },
    { texte: 'Ce que l\'on conçoit bien s\'énonce clairement, et les mots pour le dire arrivent aisément.', auteur: 'Nicolas Boileau', sur: true },
    { texte: 'Instruire, c\'est construire.', auteur: 'Proverbe', sur: false },

    // --- Le plaisir de chercher ------------------------------------------------------------
    { texte: 'Le mathématicien ne se contente pas de trouver : il aime chercher.', auteur: 'Proverbe', sur: false },
    { texte: 'La joie de voir et de comprendre est le plus beau don de la nature.', auteur: 'Albert Einstein', sur: true },
    { texte: 'Les mathématiques sont une gymnastique de l\'esprit.', auteur: 'Proverbe', sur: false },
    { texte: 'La curiosité est la mèche de la chandelle du savoir.', auteur: 'William Arthur Ward', sur: false },
    { texte: 'L\'imagination est plus importante que le savoir.', auteur: 'Albert Einstein', sur: true },
    { texte: 'On ne trouve que ce que l\'on cherche, mais on cherche rarement ce qu\'on trouve.', auteur: 'Proverbe', sur: false },
    { texte: 'Le hasard ne favorise que les esprits préparés.', auteur: 'Louis Pasteur', sur: true },
    { texte: 'La science ne connaît pas de frontières, parce que le savoir appartient à l\'humanité.', auteur: 'Louis Pasteur', sur: false },

    // --- Rigueur et démonstration ----------------------------------------------------------
    { texte: 'Ce qui est affirmé sans preuve peut être nié sans preuve.', auteur: 'Euclide', sur: false },
    { texte: 'Un exemple n\'est pas une démonstration.', auteur: 'Proverbe mathématique', sur: false },
    { texte: 'Un seul contre-exemple suffit à détruire mille exemples.', auteur: 'Proverbe mathématique', sur: false },
    { texte: 'En mathématiques, on ne comprend pas les choses : on s\'y habitue.', auteur: 'John von Neumann', sur: false },
    { texte: 'La preuve est une idole devant laquelle le mathématicien se torture lui-même.', auteur: 'Arthur Eddington', sur: false },
    { texte: 'Nous devons savoir, nous saurons.', auteur: 'David Hilbert', sur: true },
    { texte: 'Ce qu\'on ne peut pas démontrer, on ne peut pas l\'affirmer.', auteur: 'Proverbe mathématique', sur: false },
    { texte: 'La rigueur n\'est pas l\'ennemie de l\'intuition : elle en est le garde-fou.', auteur: 'Proverbe mathématique', sur: false },

    // --- Mathématiques et monde ------------------------------------------------------------------
    { texte: 'Les mathématiques sont le langage dans lequel Dieu a écrit l\'univers.', auteur: 'Attribué à Galilée', sur: false },
    { texte: 'Comment se fait-il que la mathématique, produit de la pensée humaine, s\'accorde si admirablement aux objets de la réalité ?', auteur: 'Albert Einstein', sur: true },
    { texte: 'L\'efficacité déraisonnable des mathématiques dans les sciences de la nature reste un mystère.', auteur: 'Eugene Wigner', sur: true },
    { texte: 'Toute science exacte est dominée par l\'idée d\'approximation.', auteur: 'Bertrand Russell', sur: true },
    { texte: 'Les mathématiques sont partout : dans un flocon, dans une coquille, dans un horaire de train.', auteur: 'Proverbe', sur: false },
    { texte: 'La nature aime la géométrie.', auteur: 'Proverbe', sur: false },
    { texte: 'Compter, mesurer, comparer : trois gestes qui ont fait l\'humanité.', auteur: 'Proverbe', sur: false },

    // --- Femmes de science -----------------------------------------------------------------------
    { texte: 'On ne doit pas craindre les choses, mais seulement les comprendre.', auteur: 'Marie Curie', sur: false },
    { texte: 'Soyez moins curieux des gens que des idées.', auteur: 'Marie Curie', sur: true },
    { texte: 'Dans la vie, rien n\'est à craindre, tout est à comprendre.', auteur: 'Marie Curie', sur: false },
    { texte: 'La machine analytique tisse des motifs algébriques comme le métier de Jacquard tisse des fleurs.', auteur: 'Ada Lovelace', sur: true },
    { texte: 'L\'imagination est la faculté de découvrir.', auteur: 'Ada Lovelace', sur: true },
    { texte: 'Les mathématiques sont la porte et la clé des sciences.', auteur: 'Roger Bacon', sur: true },
    { texte: 'Personne ne peut vous faire sentir inférieur sans votre consentement.', auteur: 'Eleanor Roosevelt', sur: false },
    { texte: 'J\'aime compter. Tout ce que l\'on peut compter, je l\'ai compté.', auteur: 'Katherine Johnson', sur: false },

    // --- Persévérance -------------------------------------------------------------------------------
    { texte: 'Le succès n\'est pas final, l\'échec n\'est pas fatal : c\'est le courage de continuer qui compte.', auteur: 'Attribué à Winston Churchill', sur: false },
    { texte: 'La chance sourit aux audacieux.', auteur: 'Virgile', sur: false },
    { texte: 'Ne dites pas « je ne sais pas », dites « je ne sais pas encore ».', auteur: 'Proverbe', sur: false },
    { texte: 'Un pas après l\'autre, et l\'on gravit la montagne.', auteur: 'Proverbe', sur: false },
    { texte: 'Le plus long des voyages commence par un premier pas.', auteur: 'Lao Tseu', sur: false },
    { texte: 'Petit à petit, l\'oiseau fait son nid.', auteur: 'Proverbe', sur: false },
    { texte: 'La goutte d\'eau finit par creuser la pierre, non par sa force mais par sa constance.', auteur: 'Ovide', sur: false },
    { texte: 'Tomber sept fois, se relever huit.', auteur: 'Proverbe japonais', sur: false },

    // --- Deuxième centaine : chercher, se tromper, recommencer ---------------------
    { texte: 'Le seul moyen d\'apprendre les mathématiques, c\'est de faire des mathématiques.', auteur: 'Paul Halmos', sur: true },
    { texte: 'Ce n\'est pas assez de savoir : il faut aussi appliquer.', auteur: 'Proverbe', sur: false },
    { texte: 'Une erreur n\'est pas une faute tant qu\'on ne refuse pas de la corriger.', auteur: 'Proverbe', sur: false },
    { texte: 'Ne t\'inquiète pas de tes difficultés en mathématiques : je peux t\'assurer que les miennes sont plus grandes encore.', auteur: 'Albert Einstein', sur: false },
    { texte: 'Un problème bien posé est à moitié résolu.', auteur: 'Proverbe', sur: false },
    { texte: 'Ce qui se conçoit bien s\'énonce clairement, et les mots pour le dire arrivent aisément.', auteur: 'Nicolas Boileau', sur: true },
    { texte: 'Je n\'ai pas échoué : j\'ai simplement trouvé mille façons qui ne marchent pas.', auteur: 'Thomas Edison', sur: false },
    { texte: 'Le nombre est le lien qui unit toutes les sciences.', auteur: 'Proverbe', sur: false },
    { texte: 'On ne comprend vraiment une chose que lorsqu\'on peut l\'expliquer à sa grand-mère.', auteur: 'Albert Einstein', sur: false },
    { texte: 'Le plus grand plaisir en mathématiques, c\'est de découvrir qu\'on avait tort.', auteur: 'Proverbe', sur: false },
    { texte: 'La rigueur n\'est pas l\'ennemie de l\'imagination : elle en est la condition.', auteur: 'Proverbe', sur: false },
    { texte: 'Cherche, et tu trouveras — mais cherche vraiment.', auteur: 'Proverbe', sur: false },

    // --- Deuxième centaine : la beauté et la nature des mathématiques --------------
    { texte: 'Les grandes découvertes commencent par « tiens, c\'est bizarre ».', auteur: 'Attribué à Isaac Asimov', sur: false },
    { texte: 'La géométrie est la connaissance de ce qui est éternel.', auteur: 'Platon', sur: false },
    { texte: 'Un mathématicien qui n\'a rien du poète ne sera jamais un mathématicien complet.', auteur: 'Karl Weierstrass', sur: false },
    { texte: 'Un raisonnement juste sur des données fausses donne une réponse fausse.', auteur: 'Proverbe', sur: false },
    { texte: 'On mesure la difficulté d\'un problème au plaisir qu\'on a de l\'avoir résolu.', auteur: 'Proverbe', sur: false },
    { texte: 'Ce n\'est pas la réponse qui éclaire, mais la question.', auteur: 'Eugène Ionesco', sur: true },
    { texte: 'Il faut apprendre à compter, mais aussi à savoir ce qu\'on compte.', auteur: 'Proverbe', sur: false },
    { texte: 'La difficulté attire l\'homme de caractère, car c\'est en l\'étreignant qu\'il se réalise lui-même.', auteur: 'Charles de Gaulle', sur: true },
    { texte: 'Une chose n\'est pas vraie parce qu\'elle est écrite ; elle est écrite parce qu\'elle est vraie.', auteur: 'Proverbe', sur: false },
    { texte: 'Les figures sont les mots de la géométrie.', auteur: 'Proverbe', sur: false },
    { texte: 'Ce que l\'on obtient sans effort ne se garde pas longtemps.', auteur: 'Proverbe', sur: false },
    { texte: 'Le raisonnement se vérifie, l\'intuition se cultive.', auteur: 'Proverbe', sur: false },

    // --- Deuxième centaine : comprendre plutôt que retenir -------------------------
    { texte: 'Toute science commence par une classification.', auteur: 'Proverbe', sur: false },
    { texte: 'L\'important n\'est pas de tout savoir, mais de savoir où chercher.', auteur: 'Proverbe', sur: false },
    { texte: 'Un esprit bien fait vaut mieux qu\'un esprit bien plein.', auteur: 'Michel de Montaigne', sur: true },
    { texte: 'L\'enseignement n\'est pas le remplissage d\'un seau, mais l\'allumage d\'un feu.', auteur: 'Attribué à William Butler Yeats', sur: false },
    { texte: 'Dis-le-moi et j\'oublierai ; montre-le-moi et je m\'en souviendrai ; implique-moi et je comprendrai.', auteur: 'Proverbe chinois', sur: false },
    { texte: 'Le savoir qu\'on n\'a pas cherché ne tient pas.', auteur: 'Proverbe', sur: false },
    { texte: 'Celui qui pose une question est bête cinq minutes ; celui qui n\'en pose pas l\'est toute sa vie.', auteur: 'Proverbe chinois', sur: false },
    { texte: 'Le hasard a ses lois, et ce sont des mathématiques.', auteur: 'Proverbe', sur: false },
    { texte: 'Il vaut mieux savoir peu de choses solidement que beaucoup à moitié.', auteur: 'Proverbe', sur: false },
    { texte: 'Rien ne s\'oublie plus vite qu\'une règle qu\'on n\'a pas comprise.', auteur: 'Proverbe', sur: false },

    // --- Deuxième centaine : le calcul et la démonstration -------------------------
    { texte: 'Ce qui peut être compté ne compte pas forcément, et ce qui compte ne peut pas toujours être compté.', auteur: 'Attribué à William Bruce Cameron', sur: false },
    { texte: 'Un bon calcul commence par une bonne estimation.', auteur: 'Proverbe', sur: false },
    { texte: 'Une démonstration convainc parce qu\'elle n\'a pas de trou, pas parce qu\'elle est longue.', auteur: 'Proverbe', sur: false },
    { texte: 'La logique est l\'hygiène du mathématicien.', auteur: 'André Weil', sur: false },
    { texte: 'Un contre-exemple vaut mille discussions.', auteur: 'Proverbe', sur: false },
    { texte: 'Le calcul est au raisonnement ce que la marche est au voyage : nécessaire, mais ce n\'est pas le but.', auteur: 'Proverbe', sur: false },
    { texte: 'Il faut mesurer ce qui est mesurable, et rendre mesurable ce qui ne l\'est pas.', auteur: 'Attribué à Galilée', sur: false },
    { texte: 'Toute vérité passe par trois stades : d\'abord elle est ridiculisée, ensuite elle est violemment combattue, enfin elle est acceptée comme une évidence.', auteur: 'Attribué à Arthur Schopenhauer', sur: false },
    { texte: 'Ce qui est simple est toujours faux ; ce qui ne l\'est pas est inutilisable.', auteur: 'Paul Valéry', sur: true },

    // --- Deuxième centaine : le travail et le temps --------------------------------
    { texte: 'Comprendre, c\'est pouvoir refaire seul.', auteur: 'Proverbe', sur: false },
    { texte: 'Un long calcul juste vaut moins qu\'une courte idée.', auteur: 'Proverbe', sur: false },
    { texte: 'La goutte d\'eau creuse la pierre, non par sa force mais par sa constance.', auteur: 'Proverbe latin', sur: false },
    { texte: 'Rien ne sert de courir, il faut partir à point.', auteur: 'Jean de La Fontaine', sur: true },
    { texte: 'Ce qui est fait n\'est plus à faire.', auteur: 'Proverbe', sur: false },
    { texte: 'Un voyage de mille lieues commence toujours par un premier pas.', auteur: 'Lao Tseu', sur: false },
    { texte: 'Le temps qu\'on passe à aiguiser la hache n\'est jamais perdu.', auteur: 'Proverbe', sur: false },
    { texte: 'Qui veut voyager loin ménage sa monture.', auteur: 'Jean Racine', sur: true },
    { texte: 'À force de forger, on devient forgeron.', auteur: 'Proverbe', sur: false },
    { texte: 'Demain est souvent le jour le plus chargé de la semaine.', auteur: 'Proverbe espagnol', sur: false },

    // --- Deuxième centaine : la curiosité et le doute ------------------------------
    { texte: 'Je ne cherche pas à connaître les réponses, je cherche à comprendre les questions.', auteur: 'Attribué à Confucius', sur: false },
    { texte: 'L\'important est de ne pas cesser de se poser des questions.', auteur: 'Albert Einstein', sur: false },
    { texte: 'La science consiste à passer d\'un étonnement à un autre.', auteur: 'Aristote', sur: false },
    { texte: 'Ce que nous savons est une goutte d\'eau ; ce que nous ignorons est un océan.', auteur: 'Isaac Newton', sur: false },
    { texte: 'Si j\'ai vu plus loin, c\'est en montant sur les épaules de géants.', auteur: 'Isaac Newton', sur: true },
    { texte: 'Il n\'y a pas de question bête, il n\'y a que des questions qu\'on n\'ose pas poser.', auteur: 'Proverbe', sur: false },
    { texte: 'Le commencement de toutes les sciences, c\'est l\'étonnement.', auteur: 'Aristote', sur: false },
    { texte: 'Douter de tout ou tout croire, ce sont deux solutions également commodes qui dispensent de réfléchir.', auteur: 'Henri Poincaré', sur: true },

    // --- Deuxième centaine : mathématiques et monde --------------------------------
    { texte: 'Les mathématiques sont l\'alphabet avec lequel Dieu a écrit l\'univers.', auteur: 'Attribué à Galilée', sur: false },
    { texte: 'Il n\'y a pas de progrès sans erreur corrigée.', auteur: 'Proverbe', sur: false },
    { texte: 'La nature ne fait rien en vain.', auteur: 'Aristote', sur: false },
    { texte: 'Donnez-moi un point d\'appui et je soulèverai le monde.', auteur: 'Archimède', sur: false },
    { texte: 'La géométrie apprend à voir, l\'algèbre à écrire.', auteur: 'Proverbe', sur: false },
    { texte: 'Ce qui compte n\'est pas d\'aller vite, mais de ne pas s\'arrêter.', auteur: 'Proverbe', sur: false },
    { texte: 'Une carte n\'est pas le territoire.', auteur: 'Alfred Korzybski', sur: true },
    { texte: 'Tous les modèles sont faux, mais certains sont utiles.', auteur: 'George Box', sur: true },
    { texte: 'Compter n\'est pas comprendre.', auteur: 'Proverbe', sur: false },

    // --- Deuxième centaine : la classe et le partage -------------------------------
    { texte: 'Seul on va plus vite, ensemble on va plus loin.', auteur: 'Proverbe africain', sur: false },
    { texte: 'Ce que l\'on comprend bien s\'explique bien.', auteur: 'Proverbe', sur: false },
    { texte: 'Une classe où l\'on ose se tromper est une classe où l\'on apprend.', auteur: 'Proverbe', sur: false },
    { texte: 'Il faut tout un village pour élever un enfant.', auteur: 'Proverbe africain', sur: false },
    { texte: 'Le maître ouvre la porte : c\'est à toi d\'entrer.', auteur: 'Proverbe chinois', sur: false },
    { texte: 'On ne peut rien enseigner à autrui, on ne peut que l\'aider à le découvrir en lui-même.', auteur: 'Galilée', sur: false },
    { texte: 'La meilleure façon d\'apprendre est d\'expliquer.', auteur: 'Proverbe', sur: false },
    { texte: 'Qui aide un camarade apprend deux fois.', auteur: 'Proverbe', sur: false },
    { texte: 'Un élève n\'est pas un vase qu\'on remplit, mais un feu qu\'on allume.', auteur: 'Proverbe', sur: false },
    { texte: 'Le respect du travail des autres commence par le soin qu\'on met au sien.', auteur: 'Proverbe', sur: false },

    // --- Deuxième centaine : dernières ---------------------------------------------
    { texte: 'Le meilleur moment pour planter un arbre était il y a vingt ans ; le deuxième meilleur moment est maintenant.', auteur: 'Proverbe chinois', sur: false },
    { texte: 'On ne se baigne jamais deux fois dans le même fleuve.', auteur: 'Héraclite', sur: false },
    { texte: 'Connais-toi toi-même.', auteur: 'Inscription du temple de Delphes', sur: true },
    { texte: 'Rien de grand ne s\'est accompli dans le monde sans passion.', auteur: 'Georg Wilhelm Friedrich Hegel', sur: true },
    { texte: 'Il n\'y a que ceux qui ne font rien qui ne se trompent jamais.', auteur: 'Proverbe', sur: false },
    { texte: 'La perfection est atteinte non quand il n\'y a plus rien à ajouter, mais quand il n\'y a plus rien à retirer.', auteur: 'Antoine de Saint-Exupéry', sur: true },
    { texte: 'Ce que l\'on fait avec plaisir se fait bien.', auteur: 'Proverbe', sur: false },
    { texte: 'Une définition précise épargne dix minutes de discussion.', auteur: 'Proverbe', sur: false },
    { texte: 'Un jour sans avoir rien appris est un jour perdu.', auteur: 'Proverbe', sur: false },
    { texte: 'La montagne se gravit pas à pas, jamais d\'un bond.', auteur: 'Proverbe', sur: false },
    { texte: 'Le courage, c\'est de continuer quand on ne comprend pas encore.', auteur: 'Proverbe', sur: false },
    { texte: 'On ne démontre pas ce qu\'on voit ; on voit ce qu\'on a démontré.', auteur: 'Proverbe', sur: false },
    { texte: 'Il n\'est pas de vent favorable pour celui qui ne sait où il va.', auteur: 'Sénèque', sur: false },
    { texte: 'La mesure de l\'intelligence est la capacité à changer.', auteur: 'Albert Einstein', sur: false },
    { texte: 'On ne résout pas un problème avec les modes de pensée qui l\'ont engendré.', auteur: 'Albert Einstein', sur: false },
    { texte: 'Ce n\'est pas parce que les choses sont difficiles que nous n\'osons pas ; c\'est parce que nous n\'osons pas qu\'elles sont difficiles.', auteur: 'Sénèque', sur: false }
];
