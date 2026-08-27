// CENT PETITES ÉNIGMES, UNE PAR JOUR.
//
// Rémy : « et une série de petites énigmes très courtes qu'on pourrait
// suggérer chaque jour ».
//
// TROIS RÈGLES.
//
//   1. TRÈS COURTE. Deux phrases. Une énigme du jour se lit debout, entre deux
//      cours ; si elle demande un paragraphe de mise en situation, elle ne sera
//      pas lue.
//
//   2. RÉSOLUBLE DE TÊTE, OU PRESQUE. Le but n'est pas de faire un exercice de
//      plus — il y en a cent trente-huit dans le catalogue —, c'est de donner
//      envie de réfléchir cinq minutes. Une énigme qui exige une feuille et un
//      quart d'heure est un devoir déguisé.
//
//   3. UN INDICE QUI NE DONNE PAS LA RÉPONSE. C'est la règle du projet depuis
//      le début : l'indice dit la PREMIÈRE CHOSE À REGARDER. « Compte les
//      poignées de main deux fois » n'est pas la réponse, c'est la méthode.
//
// `niveau` sert au professeur, pas à l'élève : il n'est pas affiché. Il permet
// de repérer au banc d'essai celles qu'on peut poser en sixième et celles qu'on
// garde pour la troisième.

export const ENIGMES = [
    // --- Compter, dénombrer ---------------------------------------------------
    { texte: 'Dans une pièce, 6 personnes se serrent toutes la main une fois. Combien de poignées de main en tout ?', reponse: '15', indice: 'Chaque personne en donne 5 — mais chaque poignée est comptée deux fois.', niveau: 5 },
    { texte: 'Combien de fois écrit-on le chiffre 9 en écrivant tous les nombres de 1 à 100 ?', reponse: '20', indice: 'Sépare les unités des dizaines, et n\'oublie pas 99.', niveau: 6 },
    { texte: 'Un escalier a 10 marches. Tu montes de 1 ou 2 marches à la fois. Combien de façons d\'arriver en haut ?', reponse: '89', indice: 'Le nombre de façons pour 10 est la somme de celles pour 9 et pour 8.', niveau: 3 },
    { texte: 'Combien de rectangles peut-on voir dans une grille de 2 cases sur 3 ?', reponse: '18', indice: 'Choisis deux lignes horizontales parmi 3, et deux verticales parmi 4.', niveau: 3 },
    { texte: 'Dans une classe de 30 élèves, chacun a au moins un frère ou une sœur dans le collège. Est-ce que deux élèves sont forcément de la même famille ?', reponse: 'Non', indice: 'Rien n\'interdit à trente familles différentes d\'avoir chacune deux enfants.', niveau: 6 },
    { texte: 'Combien de diagonales a un octogone ?', reponse: '20', indice: 'Chaque sommet en envoie vers tous les autres sauf ses deux voisins — et tu comptes chaque diagonale deux fois.', niveau: 4 },
    { texte: 'Je coupe une ficelle en 5 morceaux. Combien de coups de ciseaux ai-je donnés ?', reponse: '4', indice: 'Dessine la ficelle et marque les coupures.', niveau: 6 },
    { texte: 'Un livre a ses pages numérotées de 1 à 100. Combien de chiffres ont été imprimés ?', reponse: '192', indice: 'Neuf pages à un chiffre, quatre-vingt-dix à deux, une à trois.', niveau: 5 },
    { texte: 'Combien y a-t-il de nombres à trois chiffres dont tous les chiffres sont pairs ?', reponse: '100', indice: 'Attention au premier chiffre : il ne peut pas être zéro.', niveau: 4 },
    { texte: 'Combien de carrés (de toutes tailles) dans un échiquier 3 × 3 ?', reponse: '14', indice: 'Neuf de côté 1, quatre de côté 2, un de côté 3.', niveau: 6 },

    // --- Âges et partages -------------------------------------------------------
    { texte: 'J\'ai deux fois l\'âge que tu avais quand j\'avais ton âge. Ensemble nous avons 35 ans. Quel âge as-tu ?', reponse: '14 ans', indice: 'Appelle x ton âge : l\'écart entre nous ne change jamais.', niveau: 3 },
    { texte: 'Dans 5 ans, Léa aura le double de l\'âge qu\'elle avait il y a 5 ans. Quel âge a-t-elle ?', reponse: '15 ans', indice: 'Écris l\'équation : x + 5 = 2 × (x − 5).', niveau: 4 },
    { texte: 'Un père a 40 ans, son fils 10. Dans combien d\'années le père aura-t-il le triple de l\'âge du fils ?', reponse: '5 ans', indice: '40 + n = 3 × (10 + n).', niveau: 4 },
    { texte: 'Trois amis se partagent 60 billes proportionnellement à 1, 2 et 3. Combien en a le dernier ?', reponse: '30', indice: 'En tout, cela fait six parts égales.', niveau: 5 },
    { texte: 'Une somme de 100 € est partagée entre deux personnes, l\'une reçoit 20 € de plus que l\'autre. Combien reçoit la plus chanceuse ?', reponse: '60 €', indice: 'Enlève d\'abord les 20 € d\'écart, puis partage ce qui reste.', niveau: 6 },
    { texte: 'Deux nombres ont pour somme 20 et pour différence 4. Quels sont-ils ?', reponse: '12 et 8', indice: 'La moitié de la somme, plus ou moins la moitié de la différence.', niveau: 5 },
    { texte: 'La moitié de mon âge plus sept ans donne mon âge. Quel âge ai-je ?', reponse: '14 ans', indice: 'Sept ans, c\'est donc exactement l\'autre moitié.', niveau: 5 },

    // --- Logique ----------------------------------------------------------------
    { texte: 'Une balle et une raquette coûtent 1,10 € ensemble. La raquette coûte 1 € de plus que la balle. Combien coûte la balle ?', reponse: '0,05 €', indice: 'Ce n\'est pas 10 centimes : vérifie l\'écart.', niveau: 4 },
    { texte: 'Si 5 machines mettent 5 minutes à faire 5 objets, combien de temps mettent 100 machines pour 100 objets ?', reponse: '5 minutes', indice: 'Combien de temps met UNE machine pour UN objet ?', niveau: 4 },
    { texte: 'Un nénuphar double de surface chaque jour et couvre l\'étang en 48 jours. Quand couvre-t-il la moitié ?', reponse: 'Le 47ᵉ jour', indice: 'Remonte d\'un jour depuis la fin.', niveau: 4 },
    { texte: 'Tous les Zibs sont des Zabs. Certains Zabs sont verts. Les Zibs sont-ils verts ?', reponse: 'On ne peut pas savoir', indice: 'Dessine deux patates l\'une dans l\'autre.', niveau: 5 },
    { texte: 'Trois interrupteurs, une ampoule dans une autre pièce. Une seule visite. Comment savoir lequel commande l\'ampoule ?', reponse: 'Chauffer une ampoule', indice: 'Une ampoule allumée longtemps garde quelque chose même éteinte.', niveau: 4 },
    { texte: 'Un escargot monte de 3 m le jour et glisse de 2 m la nuit. Le puits fait 10 m. En combien de jours sort-il ?', reponse: '8 jours', indice: 'Le dernier jour, il ne redescend pas.', niveau: 5 },
    { texte: 'J\'ai 12 billes dont une plus lourde. Avec une balance, combien de pesées au minimum pour la trouver ?', reponse: '3', indice: 'Une pesée sépare en trois groupes, pas en deux.', niveau: 3 },
    { texte: 'Deux pères et deux fils vont à la pêche. Ils rapportent 3 poissons, un chacun. Comment ?', reponse: 'Ils sont trois', indice: 'Celui du milieu est à la fois père et fils.', niveau: 6 },
    { texte: 'Un mot de passe fait 3 chiffres, tous différents, et se termine par 7. Combien de possibilités ?', reponse: '72', indice: 'Le premier chiffre a neuf choix, le deuxième huit.', niveau: 3 },

    // --- Calcul mental et astuces --------------------------------------------------
    { texte: 'Combien font 1 + 2 + 3 + … + 100 ?', reponse: '5050', indice: 'Associe le premier au dernier : 1 + 100, 2 + 99…', niveau: 5 },
    { texte: 'Quel est le chiffre des unités de 7 × 7 × 7 × 7 ?', reponse: '1', indice: 'Les unités des puissances de 7 tournent : 7, 9, 3, 1.', niveau: 4 },
    { texte: 'Combien font 99 × 99 ?', reponse: '9801', indice: '99 × 99 = 99 × 100 − 99.', niveau: 5 },
    { texte: 'Quelle est la somme des nombres de 1 à 10, multipliée par zéro, plus 5 ?', reponse: '5', indice: 'Regarde bien où tombe la multiplication par zéro.', niveau: 6 },
    { texte: 'Un nombre multiplié par lui-même donne 1 de plus que 5 fois ce nombre plus 5. Lequel ? (Il est entier et positif.)', reponse: '6', indice: 'Essaie les entiers un par un à partir de 5.', niveau: 3 },
    { texte: 'De combien 2⁵ dépasse-t-il 5² ?', reponse: '7', indice: '32 d\'un côté, 25 de l\'autre.', niveau: 4 },
    { texte: 'Quel est le plus petit nombre divisible par 1, 2, 3, 4, 5 et 6 ?', reponse: '60', indice: 'Cherche le plus petit commun multiple, pas le produit.', niveau: 5 },
    { texte: 'Quelle est la moitié de deux tiers ?', reponse: 'Un tiers', indice: 'Prendre la moitié, c\'est multiplier par 1/2.', niveau: 5 },
    { texte: 'Combien de zéros à la fin de 10 × 20 × 30 × 40 ?', reponse: '5', indice: 'Compte les facteurs 10, puis regarde ce que 20 × 40 fabrique en plus.', niveau: 3 },
    { texte: 'Un pull coûte 80 €. On augmente de 10 %, puis on baisse de 10 %. Combien coûte-t-il ?', reponse: '79,20 €', indice: 'Les 10 % ne portent pas sur le même prix.', niveau: 4 },

    // --- Fractions et proportions ------------------------------------------------------
    { texte: 'Une bouteille est remplie au tiers. J\'en bois la moitié. Quelle fraction reste-t-il ?', reponse: 'Un sixième', indice: 'La moitié d\'un tiers.', niveau: 5 },
    { texte: 'Trois quarts d\'un nombre valent 27. Quel est ce nombre ?', reponse: '36', indice: 'Un quart vaut donc 9.', niveau: 5 },
    { texte: 'Un gâteau est partagé en 8 parts. Il en reste 3. Quel pourcentage a été mangé ?', reponse: '62,5 %', indice: 'Cinq parts sur huit.', niveau: 4 },
    { texte: 'Si 4 stylos coûtent 6 €, combien coûtent 10 stylos ?', reponse: '15 €', indice: 'Trouve d\'abord le prix d\'un seul, ou passe par deux.', niveau: 6 },
    { texte: 'Une recette pour 4 personnes demande 300 g de farine. Combien pour 6 personnes ?', reponse: '450 g', indice: 'Six, c\'est quatre plus la moitié de quatre.', niveau: 6 },
    { texte: 'Un article baisse de 25 %, puis de 20 %. Quelle est la baisse totale ?', reponse: '40 %', indice: '0,75 × 0,80 — ce n\'est pas 45 %.', niveau: 4 },
    { texte: 'La moitié d\'un quart d\'un dixième de 800, combien ça fait ?', reponse: '10', indice: 'Divise successivement par 2, par 4, par 10.', niveau: 5 },

    // --- Géométrie ------------------------------------------------------------------------
    { texte: 'Un carré a un périmètre de 36 cm. Quelle est son aire ?', reponse: '81 cm²', indice: 'Trouve d\'abord la longueur d\'un côté.', niveau: 6 },
    { texte: 'Un rectangle a 24 cm de périmètre. Quelle est sa plus grande aire possible avec des côtés entiers ?', reponse: '36 cm²', indice: 'Essaie 1 × 11, 2 × 10, 3 × 9… et regarde où ça monte.', niveau: 5 },
    { texte: 'Combien de côtés a un polygone dont la somme des angles vaut 720° ?', reponse: '6', indice: 'La somme vaut (n − 2) × 180°.', niveau: 4 },
    { texte: 'Un triangle a deux angles de 40° et 65°. Quel est le troisième ?', reponse: '75°', indice: 'Les trois angles d\'un triangle font 180°.', niveau: 6 },
    { texte: 'Si je double le côté d\'un carré, par combien son aire est-elle multipliée ?', reponse: '4', indice: 'L\'aire dépend du côté deux fois.', niveau: 5 },
    { texte: 'Un cube de 3 cm d\'arête est peint puis découpé en cubes de 1 cm. Combien n\'ont aucune face peinte ?', reponse: '1', indice: 'Seul celui du centre est caché.', niveau: 4 },
    { texte: 'Un triangle rectangle a des côtés de 3 et 4. Quelle est l\'hypoténuse ?', reponse: '5', indice: 'Additionne les carrés des deux côtés, puis cherche la racine.', niveau: 4 },
    { texte: 'Quelle est l\'aire d\'un triangle de base 10 cm et de hauteur 6 cm ?', reponse: '30 cm²', indice: 'La moitié du rectangle qui l\'entoure.', niveau: 6 },
    { texte: 'Combien d\'arêtes a un cube ?', reponse: '12', indice: 'Quatre en haut, quatre en bas, quatre debout.', niveau: 6 },
    { texte: 'Peut-on tracer un triangle avec des côtés de 3, 4 et 8 cm ?', reponse: 'Non', indice: 'Compare le plus grand côté à la somme des deux autres.', niveau: 5 },
    { texte: 'Un cercle a un rayon de 5 cm. Quel est son diamètre, et son périmètre approché ?', reponse: '10 cm et ≈ 31,4 cm', indice: 'Le périmètre vaut π fois le diamètre.', niveau: 6 },

    // --- Nombres et divisibilité --------------------------------------------------------------
    { texte: 'Quel est le plus petit nombre à trois chiffres divisible par 7 ?', reponse: '105', indice: 'Cherche le premier multiple de 7 après 99.', niveau: 5 },
    { texte: 'Je suis un nombre à deux chiffres. La somme de mes chiffres vaut 9 et je suis divisible par 4. Qui suis-je ? (Il y a deux réponses.)', reponse: '36 et 72', indice: 'Liste les nombres dont les chiffres font 9, puis teste la division par 4.', niveau: 5 },
    { texte: 'Combien de nombres premiers y a-t-il entre 1 et 20 ?', reponse: '8', indice: '2, 3, 5, 7… continue.', niveau: 5 },
    { texte: 'Quel est le plus grand diviseur commun de 24 et 36 ?', reponse: '12', indice: 'Décompose les deux en facteurs.', niveau: 4 },
    { texte: 'Un nombre est divisible par 3 et par 5. Par quel autre nombre l\'est-il forcément ?', reponse: '15', indice: 'Trois et cinq n\'ont aucun facteur commun.', niveau: 4 },
    { texte: 'Quelle est la somme des dix premiers nombres impairs ?', reponse: '100', indice: 'La somme des n premiers impairs vaut n².', niveau: 4 },
    { texte: 'Je suis un nombre de deux chiffres. Si j\'échange mes chiffres, je diminue de 27. Donne un exemple.', reponse: '41 (par exemple)', indice: 'L\'écart entre les deux chiffres vaut 3.', niveau: 3 },
    { texte: 'Quel est le seul nombre premier pair ?', reponse: '2', indice: 'Tous les autres pairs se divisent par 2.', niveau: 5 },
    { texte: 'Le produit de deux nombres consécutifs vaut 132. Quels sont-ils ?', reponse: '11 et 12', indice: 'Cherche autour de la racine carrée de 132.', niveau: 4 },

    // --- Temps, vitesse, mesures ---------------------------------------------------------------
    { texte: 'Un train part à 14 h 35 et arrive à 16 h 20. Combien dure le trajet ?', reponse: '1 h 45', indice: 'Va d\'abord jusqu\'à 15 h.', niveau: 6 },
    { texte: 'Je marche à 4 km/h. Combien de temps pour faire 6 km ?', reponse: '1 h 30', indice: 'Une heure et demie, pas 1,5 h en minutes décimales.', niveau: 5 },
    { texte: 'Une horloge sonne 6 coups en 5 secondes. En combien de temps sonne-t-elle 12 coups ?', reponse: '11 secondes', indice: 'Compte les INTERVALLES, pas les coups.', niveau: 4 },
    { texte: 'Combien de secondes dans une journée ?', reponse: '86 400', indice: '60 × 60 × 24.', niveau: 6 },
    { texte: 'Quelle est la mesure de l\'angle entre les aiguilles d\'une horloge à 3 h pile ?', reponse: '90°', indice: 'Un quart de tour.', niveau: 6 },
    { texte: 'Combien de fois par jour les aiguilles d\'une horloge se superposent-elles ?', reponse: '22', indice: 'Pas 24 : entre 11 h et 13 h, cela n\'arrive qu\'une fois.', niveau: 3 },
    { texte: 'Un bassin se remplit en 3 h avec un robinet, en 6 h avec un autre. Avec les deux ensemble ?', reponse: '2 h', indice: 'Raisonne sur ce que chacun remplit en une heure.', niveau: 3 },
    { texte: 'Combien de litres dans un cube de 10 cm de côté ?', reponse: '1 litre', indice: 'Un décimètre cube.', niveau: 5 },
    { texte: 'Combien de minutes dans un tiers d\'heure ?', reponse: '20', indice: 'Soixante divisé par trois.', niveau: 6 },

    // --- Suites et régularités ----------------------------------------------------------------------
    { texte: 'Quelle est la suite : 2, 4, 8, 16, … ?', reponse: '32', indice: 'Chaque terme est le double du précédent.', niveau: 6 },
    { texte: 'Quelle est la suite : 1, 1, 2, 3, 5, 8, … ?', reponse: '13', indice: 'Chaque terme est la somme des deux précédents.', niveau: 5 },
    { texte: 'Quelle est la suite : 1, 4, 9, 16, 25, … ?', reponse: '36', indice: 'Ce sont des carrés.', niveau: 5 },
    { texte: 'Quelle est la suite : 3, 6, 11, 18, 27, … ?', reponse: '38', indice: 'Regarde les écarts : 3, 5, 7, 9…', niveau: 4 },
    { texte: 'Quelle est la suite : 1, 3, 6, 10, 15, … ?', reponse: '21', indice: 'On ajoute 2, puis 3, puis 4…', niveau: 5 },
    { texte: 'Combien de grains de riz sur la 10ᵉ case si l\'on double à chaque case en partant de 1 ?', reponse: '512', indice: 'C\'est 2 à la puissance 9.', niveau: 4 },
    { texte: 'Quelle est la suite : 100, 50, 25, … ?', reponse: '12,5', indice: 'On divise par deux à chaque fois — et on a le droit aux décimaux.', niveau: 5 },

    // --- Probabilités ----------------------------------------------------------------------------------
    { texte: 'Je lance un dé. Quelle est la probabilité d\'obtenir un nombre pair ?', reponse: 'Une chance sur deux', indice: 'Trois faces paires sur six.', niveau: 5 },
    { texte: 'Dans un sac : 3 billes rouges et 5 bleues. Quelle est la probabilité de tirer une rouge ?', reponse: '3 sur 8', indice: 'Compte d\'abord le total.', niveau: 5 },
    { texte: 'Je lance deux pièces. Quelle est la probabilité d\'obtenir deux fois pile ?', reponse: 'Une sur quatre', indice: 'Liste les quatre résultats possibles.', niveau: 4 },
    { texte: 'Quelle est la somme la plus probable avec deux dés ?', reponse: '7', indice: 'Compte de combien de façons on peut faire chaque somme.', niveau: 4 },
    { texte: 'Dans une classe de 30 élèves, deux ont-ils forcément leur anniversaire le même mois ?', reponse: 'Oui', indice: 'Trente élèves, douze mois.', niveau: 5 },

    // --- Un peu de tout ---------------------------------------------------------------------------------
    { texte: 'Quel est le seul nombre qui s\'écrit avec autant de lettres que sa valeur, en français ?', reponse: 'Trois', indice: 'Compte les lettres de chaque petit nombre.', niveau: 6 },
    { texte: 'J\'ai des billets de 5 € et de 10 €, 8 billets en tout, pour 55 €. Combien de billets de 10 ?', reponse: '3', indice: 'Si tous étaient des 5, tu aurais 40 € : il manque 15 €.', niveau: 4 },
    { texte: 'Un fermier a des poules et des lapins : 20 têtes, 56 pattes. Combien de lapins ?', reponse: '8', indice: 'Si toutes étaient des poules, il y aurait 40 pattes.', niveau: 4 },
    { texte: 'Quel nombre est le seul à rester inchangé quand on le multiplie par lui-même, à part 1 ?', reponse: 'Zéro', indice: '0 × 0 = 0, et 1 × 1 = 1. Y en a-t-il d\'autres ?', niveau: 5 },
    { texte: 'Quel nombre ne change pas quand on l\'ajoute à lui-même ?', reponse: 'Zéro', indice: 'Quel nombre vaut son propre double ?', niveau: 6 },
    { texte: 'Je pense à un nombre, je le double, j\'ajoute 10, je divise par 2, j\'enlève mon nombre. Que reste-t-il ?', reponse: '5', indice: 'Essaie avec trois nombres différents : tu trouveras toujours pareil.', niveau: 5 },
    { texte: 'Un livre de 300 pages : combien pèse-t-il en feuilles ?', reponse: '150 feuilles', indice: 'Une feuille porte deux pages.', niveau: 6 },
    { texte: 'Une pastèque de 1 kg contient 99 % d\'eau. Après séchage elle n\'en contient que 98 %. Combien pèse-t-elle ?', reponse: '500 g', indice: 'Raisonne sur ce qui n\'est PAS de l\'eau : 10 g, qui passent de 1 % à 2 %.', niveau: 3 },
    { texte: 'Combien de fois peut-on plier une feuille de papier en deux ?', reponse: 'Six ou sept, en pratique', indice: 'À chaque pli, l\'épaisseur double.', niveau: 5 },
    { texte: 'Quel est le plus grand nombre qu\'on puisse écrire avec trois 9 ?', reponse: '9^(9^9)', indice: 'Pense aux puissances, pas à la concaténation.', niveau: 3 },
    { texte: 'Dans un tournoi à élimination directe avec 64 joueurs, combien de matchs sont joués en tout ?', reponse: '63', indice: 'Chaque match élimine exactement un joueur.', niveau: 4 },
    { texte: 'Je multiplie mon âge par 4, j\'ajoute 8, je divise par 4 : j\'obtiens 15. Quel âge ai-je ?', reponse: '13 ans', indice: 'Remonte le calcul à l\'envers, en partant de 15.', niveau: 5 },
    { texte: 'Une piscine rectangulaire de 25 m sur 10 m est bordée d\'un chemin d\'un mètre. Quelle est l\'aire du chemin ?', reponse: '74 m²', indice: 'Calcule le grand rectangle, puis retire la piscine.', niveau: 4 },
    { texte: 'Combien y a-t-il de nombres entre 1 et 1000 qui se lisent pareil à l\'endroit et à l\'envers ?', reponse: '108', indice: 'Compte séparément ceux à un, deux et trois chiffres.', niveau: 3 },
    { texte: 'Trois boîtes : « pommes », « poires », « mélange ». Toutes les étiquettes sont fausses. Combien de fruits faut-il sortir pour tout remettre en ordre ?', reponse: 'Un seul', indice: 'Commence par la boîte étiquetée « mélange ».', niveau: 3 },
    { texte: 'La somme de trois nombres entiers consécutifs vaut 72. Quel est le plus petit ?', reponse: '23', indice: 'Celui du milieu vaut le tiers de la somme.', niveau: 5 }
];
