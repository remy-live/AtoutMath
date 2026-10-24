// LES JARDINS, COMPOSÉS D'AVANCE.
//
// RÉMY : « j'adore le jeu rows garden qui était souvent sur world of puzzles,
// on pourrait le faire en français avec des mots de math ».
//
// CE FICHIER EST ENGENDRÉ — on ne le modifie pas à la main :
//
//     node tools/fabriquerJardins.mjs --forme=grand --combien=16 --ecrire
//
// POURQUOI D'AVANCE. Mesuré avec les mots du dépôt : un jardin demande de deux
// à dix secondes à composer. On ne fait pas attendre une classe devant un écran
// blanc, et c'est ainsi que font les magazines dont Rémy parle — un Rows Garden
// est composé, puis imprimé.
//
// CHAQUE JARDIN PORTE : les cases (repère axial « q,r »), les rangées avec
// leurs réponses dans l'ordre, et les fleurs avec leur mot, le pétale par
// lequel il commence (`depart`, que l'élève ne voit pas) et leur couleur.

/** @type {Array<Object>} */
export const JARDINS = [
 {
  "id": "jardin-01",
  "cases": [
   "0,0",
   "1,0",
   "2,0",
   "3,0",
   "4,0",
   "5,0",
   "6,0",
   "0,1",
   "1,1",
   "2,1",
   "3,1",
   "4,1",
   "5,1",
   "6,1",
   "7,1",
   "-1,2",
   "0,2",
   "1,2",
   "2,2",
   "3,2",
   "4,2",
   "5,2",
   "6,2",
   "7,2",
   "-1,3",
   "0,3",
   "1,3",
   "2,3",
   "3,3",
   "4,3",
   "5,3",
   "6,3",
   "-2,4",
   "-1,4",
   "0,4",
   "1,4",
   "2,4",
   "3,4",
   "4,4",
   "5,4",
   "6,4",
   "-2,5",
   "-1,5",
   "0,5",
   "1,5",
   "2,5",
   "3,5",
   "4,5",
   "5,5",
   "-3,6",
   "-2,6",
   "-1,6",
   "0,6",
   "1,6",
   "2,6",
   "3,6",
   "4,6",
   "5,6",
   "-3,7",
   "-2,7",
   "-1,7",
   "0,7",
   "1,7",
   "2,7",
   "3,7",
   "4,7",
   "-4,8",
   "-3,8",
   "-2,8",
   "-1,8",
   "0,8",
   "1,8",
   "2,8",
   "3,8",
   "4,8",
   "-4,9",
   "-3,9",
   "-2,9",
   "-1,9",
   "0,9",
   "1,9",
   "2,9",
   "3,9",
   "-5,10",
   "-4,10",
   "-3,10",
   "-2,10",
   "-1,10",
   "0,10",
   "1,10"
  ],
  "rangees": [
   {
    "cles": [
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0",
     "6,0"
    ],
    "reponses": [
     {
      "mot": "CUISINE",
      "def": "La pièce où l'on prépare les repas."
     }
    ]
   },
   {
    "cles": [
     "0,1",
     "1,1",
     "2,1",
     "3,1",
     "4,1",
     "5,1",
     "6,1",
     "7,1"
    ],
    "reponses": [
     {
      "mot": "ERE",
      "def": "Une très longue période de l'histoire."
     },
     {
      "mot": "SALLE",
      "def": "La grande pièce où la classe se réunit."
     }
    ]
   },
   {
    "cles": [
     "-1,2",
     "0,2",
     "1,2",
     "2,2",
     "3,2",
     "4,2",
     "5,2",
     "6,2",
     "7,2"
    ],
    "reponses": [
     {
      "mot": "SEPT",
      "def": "Le nombre 7, en toutes lettres."
     },
     {
      "mot": "CYCLE",
      "def": "Ce qui revient toujours au même point."
     }
    ]
   },
   {
    "cles": [
     "-1,3",
     "0,3",
     "1,3",
     "2,3",
     "3,3",
     "4,3",
     "5,3",
     "6,3"
    ],
    "reponses": [
     {
      "mot": "NEZ",
      "def": "Il sert à sentir."
     },
     {
      "mot": "PLUIE",
      "def": "L'eau qui tombe du ciel."
     }
    ]
   },
   {
    "cles": [
     "-2,4",
     "-1,4",
     "0,4",
     "1,4",
     "2,4",
     "3,4",
     "4,4",
     "5,4",
     "6,4"
    ],
    "reponses": [
     {
      "mot": "PAS",
      "def": "Ce qu'on fait en marchant."
     },
     {
      "mot": "BALLON",
      "def": "On le shoote au football."
     }
    ]
   },
   {
    "cles": [
     "-2,5",
     "-1,5",
     "0,5",
     "1,5",
     "2,5",
     "3,5",
     "4,5",
     "5,5"
    ],
    "reponses": [
     {
      "mot": "DES",
      "def": "On les lance pour avancer au jeu de l'oie."
     },
     {
      "mot": "PERLE",
      "def": "La petite bille qu'on enfile en collier."
     }
    ]
   },
   {
    "cles": [
     "-3,6",
     "-2,6",
     "-1,6",
     "0,6",
     "1,6",
     "2,6",
     "3,6",
     "4,6",
     "5,6"
    ],
    "reponses": [
     {
      "mot": "NAGE",
      "def": "Ce qu'on fait dans la piscine."
     },
     {
      "mot": "VOILE",
      "def": "Le tissu qui prend le vent sur le bateau."
     }
    ]
   },
   {
    "cles": [
     "-3,7",
     "-2,7",
     "-1,7",
     "0,7",
     "1,7",
     "2,7",
     "3,7",
     "4,7"
    ],
    "reponses": [
     {
      "mot": "ARETE",
      "def": "Le segment où deux faces d'un solide se rencontrent."
     },
     {
      "mot": "TOT",
      "def": "Le contraire de tard."
     }
    ]
   },
   {
    "cles": [
     "-4,8",
     "-3,8",
     "-2,8",
     "-1,8",
     "0,8",
     "1,8",
     "2,8",
     "3,8",
     "4,8"
    ],
    "reponses": [
     {
      "mot": "ETE",
      "def": "La saison des vacances."
     },
     {
      "mot": "CAHIER",
      "def": "On y écrit ses leçons."
     }
    ]
   },
   {
    "cles": [
     "-4,9",
     "-3,9",
     "-2,9",
     "-1,9",
     "0,9",
     "1,9",
     "2,9",
     "3,9"
    ],
    "reponses": [
     {
      "mot": "ANE",
      "def": "Il a de longues oreilles et porte des sacs."
     },
     {
      "mot": "OUTIL",
      "def": "Le marteau et la pince en sont."
     }
    ]
   },
   {
    "cles": [
     "-5,10",
     "-4,10",
     "-3,10",
     "-2,10",
     "-1,10",
     "0,10",
     "1,10"
    ],
    "reponses": [
     {
      "mot": "DOS",
      "def": "On s'y allonge pour regarder le ciel."
     },
     {
      "mot": "PIED",
      "def": "Il est au bout de la jambe."
     }
    ]
   }
  ],
  "fleurs": [
   {
    "centre": "-2,6",
    "petales": [
     "-1,5",
     "-1,6",
     "-2,7",
     "-3,7",
     "-3,6",
     "-2,5"
    ],
    "mot": "GRANDE",
    "def": "De belle taille, au féminin.",
    "maths": false,
    "depart": 1,
    "couleur": "claire"
   },
   {
    "centre": "4,2",
    "petales": [
     "5,1",
     "5,2",
     "4,3",
     "3,3",
     "3,2",
     "4,1"
    ],
    "mot": "CALCUL",
    "def": "Ce qu'on fait avec des nombres pour trouver un résultat.",
    "maths": true,
    "depart": 4,
    "couleur": "moyenne"
   },
   {
    "centre": "-2,8",
    "petales": [
     "-1,7",
     "-1,8",
     "-2,9",
     "-3,9",
     "-3,8",
     "-2,7"
    ],
    "mot": "CENTRE",
    "def": "Le point du milieu, à égale distance de tout le bord.",
    "maths": true,
    "depart": 1,
    "couleur": "foncee"
   },
   {
    "centre": "0,2",
    "petales": [
     "1,1",
     "1,2",
     "0,3",
     "-1,3",
     "-1,2",
     "0,1"
    ],
    "mot": "PENSER",
    "def": "Se servir de sa tête.",
    "maths": false,
    "depart": 1,
    "couleur": "claire"
   },
   {
    "centre": "2,6",
    "petales": [
     "3,5",
     "3,6",
     "2,7",
     "1,7",
     "1,6",
     "2,5"
    ],
    "mot": "VERITE",
    "def": "Ce qui est exact, par opposition au mensonge.",
    "maths": false,
    "depart": 4,
    "couleur": "moyenne"
   },
   {
    "centre": "4,6",
    "petales": [
     "5,5",
     "5,6",
     "4,7",
     "3,7",
     "3,6",
     "4,5"
    ],
    "mot": "ETOILE",
    "def": "Elle brille la nuit, très loin.",
    "maths": false,
    "depart": 1,
    "couleur": "foncee"
   }
  ],
  "signature": "CALCUL CENTRE ETOILE GRANDE PENSER VERITE"
 },
 {
  "id": "jardin-02",
  "cases": [
   "0,0",
   "1,0",
   "2,0",
   "3,0",
   "4,0",
   "5,0",
   "6,0",
   "0,1",
   "1,1",
   "2,1",
   "3,1",
   "4,1",
   "5,1",
   "6,1",
   "7,1",
   "-1,2",
   "0,2",
   "1,2",
   "2,2",
   "3,2",
   "4,2",
   "5,2",
   "6,2",
   "7,2",
   "-1,3",
   "0,3",
   "1,3",
   "2,3",
   "3,3",
   "4,3",
   "5,3",
   "6,3",
   "-2,4",
   "-1,4",
   "0,4",
   "1,4",
   "2,4",
   "3,4",
   "4,4",
   "5,4",
   "6,4",
   "-2,5",
   "-1,5",
   "0,5",
   "1,5",
   "2,5",
   "3,5",
   "4,5",
   "5,5",
   "-3,6",
   "-2,6",
   "-1,6",
   "0,6",
   "1,6",
   "2,6",
   "3,6",
   "4,6",
   "5,6",
   "-3,7",
   "-2,7",
   "-1,7",
   "0,7",
   "1,7",
   "2,7",
   "3,7",
   "4,7",
   "-4,8",
   "-3,8",
   "-2,8",
   "-1,8",
   "0,8",
   "1,8",
   "2,8",
   "3,8",
   "4,8",
   "-4,9",
   "-3,9",
   "-2,9",
   "-1,9",
   "0,9",
   "1,9",
   "2,9",
   "3,9",
   "-5,10",
   "-4,10",
   "-3,10",
   "-2,10",
   "-1,10",
   "0,10",
   "1,10"
  ],
  "rangees": [
   {
    "cles": [
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0",
     "6,0"
    ],
    "reponses": [
     {
      "mot": "DIZAINE",
      "def": "Un paquet de dix unités."
     }
    ]
   },
   {
    "cles": [
     "0,1",
     "1,1",
     "2,1",
     "3,1",
     "4,1",
     "5,1",
     "6,1",
     "7,1"
    ],
    "reponses": [
     {
      "mot": "AGE",
      "def": "Ce qu'on fête chaque année."
     },
     {
      "mot": "TIERS",
      "def": "Une part sur trois."
     }
    ]
   },
   {
    "cles": [
     "-1,2",
     "0,2",
     "1,2",
     "2,2",
     "3,2",
     "4,2",
     "5,2",
     "6,2",
     "7,2"
    ],
    "reponses": [
     {
      "mot": "GAZ",
      "def": "Ni solide ni liquide."
     },
     {
      "mot": "DROITE",
      "def": "Illimitée des deux côtés, elle n'a ni début ni fin."
     }
    ]
   },
   {
    "cles": [
     "-1,3",
     "0,3",
     "1,3",
     "2,3",
     "3,3",
     "4,3",
     "5,3",
     "6,3"
    ],
    "reponses": [
     {
      "mot": "RAIE",
      "def": "Un trait, ou le poisson tout plat."
     },
     {
      "mot": "AUBE",
      "def": "Le tout début du jour."
     }
    ]
   },
   {
    "cles": [
     "-2,4",
     "-1,4",
     "0,4",
     "1,4",
     "2,4",
     "3,4",
     "4,4",
     "5,4",
     "6,4"
    ],
    "reponses": [
     {
      "mot": "CHEVEU",
      "def": "Il pousse sur la tête."
     },
     {
      "mot": "EAU",
      "def": "Elle coule du robinet."
     }
    ]
   },
   {
    "cles": [
     "-2,5",
     "-1,5",
     "0,5",
     "1,5",
     "2,5",
     "3,5",
     "4,5",
     "5,5"
    ],
    "reponses": [
     {
      "mot": "ENFIN",
      "def": "Le mot de celui qui attendait depuis longtemps."
     },
     {
      "mot": "DUC",
      "def": "Un seigneur, juste en dessous du prince."
     }
    ]
   },
   {
    "cles": [
     "-3,6",
     "-2,6",
     "-1,6",
     "0,6",
     "1,6",
     "2,6",
     "3,6",
     "4,6",
     "5,6"
    ],
    "reponses": [
     {
      "mot": "RAT",
      "def": "Le rongeur gris des égouts."
     },
     {
      "mot": "OISEAU",
      "def": "Il a des plumes et un bec."
     }
    ]
   },
   {
    "cles": [
     "-3,7",
     "-2,7",
     "-1,7",
     "0,7",
     "1,7",
     "2,7",
     "3,7",
     "4,7"
    ],
    "reponses": [
     {
      "mot": "TEMPS",
      "def": "Les heures qui passent."
     },
     {
      "mot": "SOL",
      "def": "Ce sur quoi on marche — ou la note après fa."
     }
    ]
   },
   {
    "cles": [
     "-4,8",
     "-3,8",
     "-2,8",
     "-1,8",
     "0,8",
     "1,8",
     "2,8",
     "3,8",
     "4,8"
    ],
    "reponses": [
     {
      "mot": "ETOILE",
      "def": "Elle brille la nuit, très loin."
     },
     {
      "mot": "TRI",
      "def": "Ce qu'on fait des déchets avant de les jeter."
     }
    ]
   },
   {
    "cles": [
     "-4,9",
     "-3,9",
     "-2,9",
     "-1,9",
     "0,9",
     "1,9",
     "2,9",
     "3,9"
    ],
    "reponses": [
     {
      "mot": "LUNE",
      "def": "Elle tourne autour de la Terre."
     },
     {
      "mot": "SITE",
      "def": "L'endroit où l'on s'installe."
     }
    ]
   },
   {
    "cles": [
     "-5,10",
     "-4,10",
     "-3,10",
     "-2,10",
     "-1,10",
     "0,10",
     "1,10"
    ],
    "reponses": [
     {
      "mot": "VOYAGES",
      "def": "Les départs au loin, au pluriel."
     }
    ]
   }
  ],
  "fleurs": [
   {
    "centre": "2,4",
    "petales": [
     "3,3",
     "3,4",
     "2,5",
     "1,5",
     "1,4",
     "2,3"
    ],
    "mot": "NIVEAU",
    "def": "La hauteur à laquelle une chose se trouve.",
    "maths": false,
    "depart": 2,
    "couleur": "claire"
   },
   {
    "centre": "2,8",
    "petales": [
     "3,7",
     "3,8",
     "2,9",
     "1,9",
     "1,8",
     "2,7"
    ],
    "mot": "SORTIE",
    "def": "Par où l'on quitte le bâtiment.",
    "maths": false,
    "depart": 5,
    "couleur": "moyenne"
   },
   {
    "centre": "2,2",
    "petales": [
     "3,1",
     "3,2",
     "2,3",
     "1,3",
     "1,2",
     "2,1"
    ],
    "mot": "TREIZE",
    "def": "Le nombre 13, en toutes lettres.",
    "maths": true,
    "depart": 0,
    "couleur": "foncee"
   },
   {
    "centre": "-2,8",
    "petales": [
     "-1,7",
     "-1,8",
     "-2,9",
     "-3,9",
     "-3,8",
     "-2,7"
    ],
    "mot": "MINUTE",
    "def": "Soixante secondes.",
    "maths": true,
    "depart": 0,
    "couleur": "claire"
   },
   {
    "centre": "-2,6",
    "petales": [
     "-1,5",
     "-1,6",
     "-2,7",
     "-3,7",
     "-3,6",
     "-2,5"
    ],
    "mot": "TRENTE",
    "def": "Le nombre 30, en toutes lettres.",
    "maths": true,
    "depart": 3,
    "couleur": "moyenne"
   },
   {
    "centre": "2,6",
    "petales": [
     "3,5",
     "3,6",
     "2,7",
     "1,7",
     "1,6",
     "2,5"
    ],
    "mot": "DESSIN",
    "def": "Ce qu'on trace au crayon sur la feuille.",
    "maths": false,
    "depart": 0,
    "couleur": "foncee"
   }
  ],
  "signature": "DESSIN MINUTE NIVEAU SORTIE TREIZE TRENTE"
 },
 {
  "id": "jardin-03",
  "cases": [
   "0,0",
   "1,0",
   "2,0",
   "3,0",
   "4,0",
   "5,0",
   "6,0",
   "0,1",
   "1,1",
   "2,1",
   "3,1",
   "4,1",
   "5,1",
   "6,1",
   "7,1",
   "-1,2",
   "0,2",
   "1,2",
   "2,2",
   "3,2",
   "4,2",
   "5,2",
   "6,2",
   "7,2",
   "-1,3",
   "0,3",
   "1,3",
   "2,3",
   "3,3",
   "4,3",
   "5,3",
   "6,3",
   "-2,4",
   "-1,4",
   "0,4",
   "1,4",
   "2,4",
   "3,4",
   "4,4",
   "5,4",
   "6,4",
   "-2,5",
   "-1,5",
   "0,5",
   "1,5",
   "2,5",
   "3,5",
   "4,5",
   "5,5",
   "-3,6",
   "-2,6",
   "-1,6",
   "0,6",
   "1,6",
   "2,6",
   "3,6",
   "4,6",
   "5,6",
   "-3,7",
   "-2,7",
   "-1,7",
   "0,7",
   "1,7",
   "2,7",
   "3,7",
   "4,7",
   "-4,8",
   "-3,8",
   "-2,8",
   "-1,8",
   "0,8",
   "1,8",
   "2,8",
   "3,8",
   "4,8",
   "-4,9",
   "-3,9",
   "-2,9",
   "-1,9",
   "0,9",
   "1,9",
   "2,9",
   "3,9",
   "-5,10",
   "-4,10",
   "-3,10",
   "-2,10",
   "-1,10",
   "0,10",
   "1,10"
  ],
  "rangees": [
   {
    "cles": [
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0",
     "6,0"
    ],
    "reponses": [
     {
      "mot": "CHAMBRE",
      "def": "La pièce où l'on dort."
     }
    ]
   },
   {
    "cles": [
     "0,1",
     "1,1",
     "2,1",
     "3,1",
     "4,1",
     "5,1",
     "6,1",
     "7,1"
    ],
    "reponses": [
     {
      "mot": "BLE",
      "def": "On en fait la farine du pain."
     },
     {
      "mot": "OMBRE",
      "def": "Le sombre que fait un objet au soleil."
     }
    ]
   },
   {
    "cles": [
     "-1,2",
     "0,2",
     "1,2",
     "2,2",
     "3,2",
     "4,2",
     "5,2",
     "6,2",
     "7,2"
    ],
    "reponses": [
     {
      "mot": "RUSE",
      "def": "Le tour habile qu'on invente pour réussir."
     },
     {
      "mot": "PLEIN",
      "def": "Le contraire de vide."
     }
    ]
   },
   {
    "cles": [
     "-1,3",
     "0,3",
     "1,3",
     "2,3",
     "3,3",
     "4,3",
     "5,3",
     "6,3"
    ],
    "reponses": [
     {
      "mot": "ZOO",
      "def": "Le parc où l'on regarde les animaux."
     },
     {
      "mot": "PETIT",
      "def": "Le contraire de grand."
     }
    ]
   },
   {
    "cles": [
     "-2,4",
     "-1,4",
     "0,4",
     "1,4",
     "2,4",
     "3,4",
     "4,4",
     "5,4",
     "6,4"
    ],
    "reponses": [
     {
      "mot": "SOEUR",
      "def": "La fille des mêmes parents."
     },
     {
      "mot": "GANT",
      "def": "Il couvre la main l'hiver."
     }
    ]
   },
   {
    "cles": [
     "-2,5",
     "-1,5",
     "0,5",
     "1,5",
     "2,5",
     "3,5",
     "4,5",
     "5,5"
    ],
    "reponses": [
     {
      "mot": "POT",
      "def": "On y met la confiture."
     },
     {
      "mot": "ORDRE",
      "def": "Le rangement, ou ce qu'un chef commande."
     }
    ]
   },
   {
    "cles": [
     "-3,6",
     "-2,6",
     "-1,6",
     "0,6",
     "1,6",
     "2,6",
     "3,6",
     "4,6",
     "5,6"
    ],
    "reponses": [
     {
      "mot": "RIRE",
      "def": "Ce qu'on fait quand c'est drôle."
     },
     {
      "mot": "METAL",
      "def": "Le fer et le cuivre en sont."
     }
    ]
   },
   {
    "cles": [
     "-3,7",
     "-2,7",
     "-1,7",
     "0,7",
     "1,7",
     "2,7",
     "3,7",
     "4,7"
    ],
    "reponses": [
     {
      "mot": "ETE",
      "def": "La saison des vacances."
     },
     {
      "mot": "BOITE",
      "def": "On y range les crayons."
     }
    ]
   },
   {
    "cles": [
     "-4,8",
     "-3,8",
     "-2,8",
     "-1,8",
     "0,8",
     "1,8",
     "2,8",
     "3,8",
     "4,8"
    ],
    "reponses": [
     {
      "mot": "DESSIN",
      "def": "Ce qu'on trace au crayon sur la feuille."
     },
     {
      "mot": "GAI",
      "def": "De bonne humeur."
     }
    ]
   },
   {
    "cles": [
     "-4,9",
     "-3,9",
     "-2,9",
     "-1,9",
     "0,9",
     "1,9",
     "2,9",
     "3,9"
    ],
    "reponses": [
     {
      "mot": "FENETRES",
      "def": "On les ouvre pour aérer, au pluriel."
     }
    ]
   },
   {
    "cles": [
     "-5,10",
     "-4,10",
     "-3,10",
     "-2,10",
     "-1,10",
     "0,10",
     "1,10"
    ],
    "reponses": [
     {
      "mot": "MONT",
      "def": "Un relief élevé, que l'on gravit."
     },
     {
      "mot": "AIL",
      "def": "La gousse qui parfume le gigot."
     }
    ]
   }
  ],
  "fleurs": [
   {
    "centre": "4,6",
    "petales": [
     "5,5",
     "5,6",
     "4,7",
     "3,7",
     "3,6",
     "4,5"
    ],
    "mot": "LETTRE",
    "def": "A, B ou C — ou ce qu'on met à la poste.",
    "maths": false,
    "depart": 1,
    "couleur": "claire"
   },
   {
    "centre": "2,4",
    "petales": [
     "3,3",
     "3,4",
     "2,5",
     "1,5",
     "1,4",
     "2,3"
    ],
    "mot": "GROUPE",
    "def": "Plusieurs ensemble.",
    "maths": false,
    "depart": 1,
    "couleur": "moyenne"
   },
   {
    "centre": "-2,6",
    "petales": [
     "-1,5",
     "-1,6",
     "-2,7",
     "-3,7",
     "-3,6",
     "-2,5"
    ],
    "mot": "PORTER",
    "def": "Tenir une charge en se déplaçant.",
    "maths": false,
    "depart": 5,
    "couleur": "foncee"
   },
   {
    "centre": "6,2",
    "petales": [
     "7,1",
     "7,2",
     "6,3",
     "5,3",
     "5,2",
     "6,1"
    ],
    "mot": "ENTIER",
    "def": "Un nombre sans virgule : 0, 1, 2, 3…",
    "maths": true,
    "depart": 0,
    "couleur": "claire"
   },
   {
    "centre": "0,6",
    "petales": [
     "1,5",
     "1,6",
     "0,7",
     "-1,7",
     "-1,6",
     "0,5"
    ],
    "mot": "TOMBER",
    "def": "Aller par terre sans le vouloir.",
    "maths": false,
    "depart": 5,
    "couleur": "moyenne"
   },
   {
    "centre": "2,2",
    "petales": [
     "3,1",
     "3,2",
     "2,3",
     "1,3",
     "1,2",
     "2,1"
    ],
    "mot": "OPPOSE",
    "def": "Même distance à zéro, de l'autre côté : −5 et 5.",
    "maths": true,
    "depart": 0,
    "couleur": "foncee"
   }
  ],
  "signature": "ENTIER GROUPE LETTRE OPPOSE PORTER TOMBER"
 },
 {
  "id": "jardin-04",
  "cases": [
   "0,0",
   "1,0",
   "2,0",
   "3,0",
   "4,0",
   "5,0",
   "6,0",
   "0,1",
   "1,1",
   "2,1",
   "3,1",
   "4,1",
   "5,1",
   "6,1",
   "7,1",
   "-1,2",
   "0,2",
   "1,2",
   "2,2",
   "3,2",
   "4,2",
   "5,2",
   "6,2",
   "7,2",
   "-1,3",
   "0,3",
   "1,3",
   "2,3",
   "3,3",
   "4,3",
   "5,3",
   "6,3",
   "-2,4",
   "-1,4",
   "0,4",
   "1,4",
   "2,4",
   "3,4",
   "4,4",
   "5,4",
   "6,4",
   "-2,5",
   "-1,5",
   "0,5",
   "1,5",
   "2,5",
   "3,5",
   "4,5",
   "5,5",
   "-3,6",
   "-2,6",
   "-1,6",
   "0,6",
   "1,6",
   "2,6",
   "3,6",
   "4,6",
   "5,6",
   "-3,7",
   "-2,7",
   "-1,7",
   "0,7",
   "1,7",
   "2,7",
   "3,7",
   "4,7",
   "-4,8",
   "-3,8",
   "-2,8",
   "-1,8",
   "0,8",
   "1,8",
   "2,8",
   "3,8",
   "4,8",
   "-4,9",
   "-3,9",
   "-2,9",
   "-1,9",
   "0,9",
   "1,9",
   "2,9",
   "3,9",
   "-5,10",
   "-4,10",
   "-3,10",
   "-2,10",
   "-1,10",
   "0,10",
   "1,10"
  ],
  "rangees": [
   {
    "cles": [
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0",
     "6,0"
    ],
    "reponses": [
     {
      "mot": "ARRIVEE",
      "def": "Le bout de la course."
     }
    ]
   },
   {
    "cles": [
     "0,1",
     "1,1",
     "2,1",
     "3,1",
     "4,1",
     "5,1",
     "6,1",
     "7,1"
    ],
    "reponses": [
     {
      "mot": "HIER",
      "def": "Le jour d'avant aujourd'hui."
     },
     {
      "mot": "GARE",
      "def": "On y prend le train."
     }
    ]
   },
   {
    "cles": [
     "-1,2",
     "0,2",
     "1,2",
     "2,2",
     "3,2",
     "4,2",
     "5,2",
     "6,2",
     "7,2"
    ],
    "reponses": [
     {
      "mot": "NATURE",
      "def": "Les arbres, les bêtes et les rivières."
     },
     {
      "mot": "RAT",
      "def": "Le rongeur gris des égouts."
     }
    ]
   },
   {
    "cles": [
     "-1,3",
     "0,3",
     "1,3",
     "2,3",
     "3,3",
     "4,3",
     "5,3",
     "6,3"
    ],
    "reponses": [
     {
      "mot": "MUSEE",
      "def": "On y regarde les tableaux."
     },
     {
      "mot": "DUO",
      "def": "Deux musiciens qui jouent ensemble."
     }
    ]
   },
   {
    "cles": [
     "-2,4",
     "-1,4",
     "0,4",
     "1,4",
     "2,4",
     "3,4",
     "4,4",
     "5,4",
     "6,4"
    ],
    "reponses": [
     {
      "mot": "PARENT",
      "def": "Le père ou la mère."
     },
     {
      "mot": "DIX",
      "def": "Le nombre 10, en toutes lettres."
     }
    ]
   },
   {
    "cles": [
     "-2,5",
     "-1,5",
     "0,5",
     "1,5",
     "2,5",
     "3,5",
     "4,5",
     "5,5"
    ],
    "reponses": [
     {
      "mot": "POIL",
      "def": "Le chat en est couvert."
     },
     {
      "mot": "LIEN",
      "def": "Ce qui attache deux choses ensemble."
     }
    ]
   },
   {
    "cles": [
     "-3,6",
     "-2,6",
     "-1,6",
     "0,6",
     "1,6",
     "2,6",
     "3,6",
     "4,6",
     "5,6"
    ],
    "reponses": [
     {
      "mot": "TROU",
      "def": "Le creux dans la chaussette usée."
     },
     {
      "mot": "ECRIT",
      "def": "Tracé sur le papier."
     }
    ]
   },
   {
    "cles": [
     "-3,7",
     "-2,7",
     "-1,7",
     "0,7",
     "1,7",
     "2,7",
     "3,7",
     "4,7"
    ],
    "reponses": [
     {
      "mot": "ACTE",
      "def": "Une partie d'une pièce de théâtre."
     },
     {
      "mot": "COTE",
      "def": "Le bord de la mer."
     }
    ]
   },
   {
    "cles": [
     "-4,8",
     "-3,8",
     "-2,8",
     "-1,8",
     "0,8",
     "1,8",
     "2,8",
     "3,8",
     "4,8"
    ],
    "reponses": [
     {
      "mot": "NOIR",
      "def": "La couleur de la nuit sans lune."
     },
     {
      "mot": "DEBUT",
      "def": "Le contraire de la fin."
     }
    ]
   },
   {
    "cles": [
     "-4,9",
     "-3,9",
     "-2,9",
     "-1,9",
     "0,9",
     "1,9",
     "2,9",
     "3,9"
    ],
    "reponses": [
     {
      "mot": "DENT",
      "def": "On s'en sert pour mâcher."
     },
     {
      "mot": "NOTE",
      "def": "Le chiffre du devoir, ou le son de la musique."
     }
    ]
   },
   {
    "cles": [
     "-5,10",
     "-4,10",
     "-3,10",
     "-2,10",
     "-1,10",
     "0,10",
     "1,10"
    ],
    "reponses": [
     {
      "mot": "CHEMISE",
      "def": "Le vêtement à boutons et à col."
     }
    ]
   }
  ],
  "fleurs": [
   {
    "centre": "6,2",
    "petales": [
     "7,1",
     "7,2",
     "6,3",
     "5,3",
     "5,2",
     "6,1"
    ],
    "mot": "RETOUR",
    "def": "Le chemin du soir, après l'aller.",
    "maths": false,
    "depart": 5,
    "couleur": "claire"
   },
   {
    "centre": "4,6",
    "petales": [
     "5,5",
     "5,6",
     "4,7",
     "3,7",
     "3,6",
     "4,5"
    ],
    "mot": "TRENTE",
    "def": "Le nombre 30, en toutes lettres.",
    "maths": true,
    "depart": 3,
    "couleur": "moyenne"
   },
   {
    "centre": "2,2",
    "petales": [
     "3,1",
     "3,2",
     "2,3",
     "1,3",
     "1,2",
     "2,1"
    ],
    "mot": "RESTER",
    "def": "Ne pas bouger de l'endroit où l'on est.",
    "maths": false,
    "depart": 1,
    "couleur": "foncee"
   },
   {
    "centre": "0,6",
    "petales": [
     "1,5",
     "1,6",
     "0,7",
     "-1,7",
     "-1,6",
     "0,5"
    ],
    "mot": "ETOILE",
    "def": "Elle brille la nuit, très loin.",
    "maths": false,
    "depart": 2,
    "couleur": "claire"
   },
   {
    "centre": "0,8",
    "petales": [
     "1,7",
     "1,8",
     "0,9",
     "-1,9",
     "-1,8",
     "0,7"
    ],
    "mot": "CENTRE",
    "def": "Le point du milieu, à égale distance de tout le bord.",
    "maths": true,
    "depart": 0,
    "couleur": "moyenne"
   },
   {
    "centre": "4,2",
    "petales": [
     "5,1",
     "5,2",
     "4,3",
     "3,3",
     "3,2",
     "4,1"
    ],
    "mot": "GARDER",
    "def": "Ne pas lâcher ce qu'on a.",
    "maths": false,
    "depart": 5,
    "couleur": "foncee"
   }
  ],
  "signature": "CENTRE ETOILE GARDER RESTER RETOUR TRENTE"
 },
 {
  "id": "jardin-05",
  "cases": [
   "0,0",
   "1,0",
   "2,0",
   "3,0",
   "4,0",
   "5,0",
   "6,0",
   "0,1",
   "1,1",
   "2,1",
   "3,1",
   "4,1",
   "5,1",
   "6,1",
   "7,1",
   "-1,2",
   "0,2",
   "1,2",
   "2,2",
   "3,2",
   "4,2",
   "5,2",
   "6,2",
   "7,2",
   "-1,3",
   "0,3",
   "1,3",
   "2,3",
   "3,3",
   "4,3",
   "5,3",
   "6,3",
   "-2,4",
   "-1,4",
   "0,4",
   "1,4",
   "2,4",
   "3,4",
   "4,4",
   "5,4",
   "6,4",
   "-2,5",
   "-1,5",
   "0,5",
   "1,5",
   "2,5",
   "3,5",
   "4,5",
   "5,5",
   "-3,6",
   "-2,6",
   "-1,6",
   "0,6",
   "1,6",
   "2,6",
   "3,6",
   "4,6",
   "5,6",
   "-3,7",
   "-2,7",
   "-1,7",
   "0,7",
   "1,7",
   "2,7",
   "3,7",
   "4,7",
   "-4,8",
   "-3,8",
   "-2,8",
   "-1,8",
   "0,8",
   "1,8",
   "2,8",
   "3,8",
   "4,8",
   "-4,9",
   "-3,9",
   "-2,9",
   "-1,9",
   "0,9",
   "1,9",
   "2,9",
   "3,9",
   "-5,10",
   "-4,10",
   "-3,10",
   "-2,10",
   "-1,10",
   "0,10",
   "1,10"
  ],
  "rangees": [
   {
    "cles": [
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0",
     "6,0"
    ],
    "reponses": [
     {
      "mot": "COURAGE",
      "def": "Ce qu'il faut pour affronter le danger."
     }
    ]
   },
   {
    "cles": [
     "0,1",
     "1,1",
     "2,1",
     "3,1",
     "4,1",
     "5,1",
     "6,1",
     "7,1"
    ],
    "reponses": [
     {
      "mot": "HUIT",
      "def": "Le nombre 8, en toutes lettres."
     },
     {
      "mot": "COTE",
      "def": "Le bord de la mer."
     }
    ]
   },
   {
    "cles": [
     "-1,2",
     "0,2",
     "1,2",
     "2,2",
     "3,2",
     "4,2",
     "5,2",
     "6,2",
     "7,2"
    ],
    "reponses": [
     {
      "mot": "TROU",
      "def": "Le creux dans la chaussette usée."
     },
     {
      "mot": "ETUDE",
      "def": "Le travail qu'on fait pour apprendre."
     }
    ]
   },
   {
    "cles": [
     "-1,3",
     "0,3",
     "1,3",
     "2,3",
     "3,3",
     "4,3",
     "5,3",
     "6,3"
    ],
    "reponses": [
     {
      "mot": "BORDS",
      "def": "Les limites extérieures d'une surface."
     },
     {
      "mot": "ROC",
      "def": "Une grosse pierre très dure."
     }
    ]
   },
   {
    "cles": [
     "-2,4",
     "-1,4",
     "0,4",
     "1,4",
     "2,4",
     "3,4",
     "4,4",
     "5,4",
     "6,4"
    ],
    "reponses": [
     {
      "mot": "LITTERALE",
      "def": "Se dit d'un calcul où des lettres remplacent des nombres."
     }
    ]
   },
   {
    "cles": [
     "-2,5",
     "-1,5",
     "0,5",
     "1,5",
     "2,5",
     "3,5",
     "4,5",
     "5,5"
    ],
    "reponses": [
     {
      "mot": "CAR",
      "def": "Il emmène la classe en sortie."
     },
     {
      "mot": "CHANT",
      "def": "Ce qu'on fait avec sa voix en musique."
     }
    ]
   },
   {
    "cles": [
     "-3,6",
     "-2,6",
     "-1,6",
     "0,6",
     "1,6",
     "2,6",
     "3,6",
     "4,6",
     "5,6"
    ],
    "reponses": [
     {
      "mot": "AGE",
      "def": "Ce qu'on fête chaque année."
     },
     {
      "mot": "MOTEUR",
      "def": "Il fait tourner les roues de la voiture."
     }
    ]
   },
   {
    "cles": [
     "-3,7",
     "-2,7",
     "-1,7",
     "0,7",
     "1,7",
     "2,7",
     "3,7",
     "4,7"
    ],
    "reponses": [
     {
      "mot": "VASE",
      "def": "On y met les fleurs."
     },
     {
      "mot": "PUCE",
      "def": "Le minuscule insecte qui saute."
     }
    ]
   },
   {
    "cles": [
     "-4,8",
     "-3,8",
     "-2,8",
     "-1,8",
     "0,8",
     "1,8",
     "2,8",
     "3,8",
     "4,8"
    ],
    "reponses": [
     {
      "mot": "PENTE",
      "def": "L'inclinaison d'une côte."
     },
     {
      "mot": "ECHO",
      "def": "La voix que la montagne renvoie."
     }
    ]
   },
   {
    "cles": [
     "-4,9",
     "-3,9",
     "-2,9",
     "-1,9",
     "0,9",
     "1,9",
     "2,9",
     "3,9"
    ],
    "reponses": [
     {
      "mot": "ECRIT",
      "def": "Tracé sur le papier."
     },
     {
      "mot": "VER",
      "def": "Il n'a pas de pattes et vit dans la terre."
     }
    ]
   },
   {
    "cles": [
     "-5,10",
     "-4,10",
     "-3,10",
     "-2,10",
     "-1,10",
     "0,10",
     "1,10"
    ],
    "reponses": [
     {
      "mot": "GAZ",
      "def": "Ni solide ni liquide."
     },
     {
      "mot": "MIDI",
      "def": "Douze heures."
     }
    ]
   }
  ],
  "fleurs": [
   {
    "centre": "2,2",
    "petales": [
     "3,1",
     "3,2",
     "2,3",
     "1,3",
     "1,2",
     "2,1"
    ],
    "mot": "DROITE",
    "def": "Illimitée des deux côtés, elle n'a ni début ni fin.",
    "maths": true,
    "depart": 2,
    "couleur": "claire"
   },
   {
    "centre": "6,2",
    "petales": [
     "7,1",
     "7,2",
     "6,3",
     "5,3",
     "5,2",
     "6,1"
    ],
    "mot": "ECOUTE",
    "def": "Ce qu'on fait avec les oreilles, attentivement.",
    "maths": false,
    "depart": 1,
    "couleur": "moyenne"
   },
   {
    "centre": "0,8",
    "petales": [
     "1,7",
     "1,8",
     "0,9",
     "-1,9",
     "-1,8",
     "0,7"
    ],
    "mot": "PETITE",
    "def": "De taille réduite, au féminin.",
    "maths": false,
    "depart": 0,
    "couleur": "foncee"
   },
   {
    "centre": "4,6",
    "petales": [
     "5,5",
     "5,6",
     "4,7",
     "3,7",
     "3,6",
     "4,5"
    ],
    "mot": "CENTRE",
    "def": "Le point du milieu, à égale distance de tout le bord.",
    "maths": true,
    "depart": 3,
    "couleur": "claire"
   },
   {
    "centre": "4,2",
    "petales": [
     "5,1",
     "5,2",
     "4,3",
     "3,3",
     "3,2",
     "4,1"
    ],
    "mot": "COURSE",
    "def": "On la gagne en arrivant le premier.",
    "maths": false,
    "depart": 5,
    "couleur": "moyenne"
   },
   {
    "centre": "2,8",
    "petales": [
     "3,7",
     "3,8",
     "2,9",
     "1,9",
     "1,8",
     "2,7"
    ],
    "mot": "CHEVEU",
    "def": "Il pousse sur la tête.",
    "maths": false,
    "depart": 0,
    "couleur": "foncee"
   }
  ],
  "signature": "CENTRE CHEVEU COURSE DROITE ECOUTE PETITE"
 },
 {
  "id": "jardin-06",
  "cases": [
   "0,0",
   "1,0",
   "2,0",
   "3,0",
   "4,0",
   "5,0",
   "6,0",
   "0,1",
   "1,1",
   "2,1",
   "3,1",
   "4,1",
   "5,1",
   "6,1",
   "7,1",
   "-1,2",
   "0,2",
   "1,2",
   "2,2",
   "3,2",
   "4,2",
   "5,2",
   "6,2",
   "7,2",
   "-1,3",
   "0,3",
   "1,3",
   "2,3",
   "3,3",
   "4,3",
   "5,3",
   "6,3",
   "-2,4",
   "-1,4",
   "0,4",
   "1,4",
   "2,4",
   "3,4",
   "4,4",
   "5,4",
   "6,4",
   "-2,5",
   "-1,5",
   "0,5",
   "1,5",
   "2,5",
   "3,5",
   "4,5",
   "5,5",
   "-3,6",
   "-2,6",
   "-1,6",
   "0,6",
   "1,6",
   "2,6",
   "3,6",
   "4,6",
   "5,6",
   "-3,7",
   "-2,7",
   "-1,7",
   "0,7",
   "1,7",
   "2,7",
   "3,7",
   "4,7",
   "-4,8",
   "-3,8",
   "-2,8",
   "-1,8",
   "0,8",
   "1,8",
   "2,8",
   "3,8",
   "4,8",
   "-4,9",
   "-3,9",
   "-2,9",
   "-1,9",
   "0,9",
   "1,9",
   "2,9",
   "3,9",
   "-5,10",
   "-4,10",
   "-3,10",
   "-2,10",
   "-1,10",
   "0,10",
   "1,10"
  ],
  "rangees": [
   {
    "cles": [
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0",
     "6,0"
    ],
    "reponses": [
     {
      "mot": "BOL",
      "def": "On y verse le chocolat du matin."
     },
     {
      "mot": "LOUP",
      "def": "Il hurle à la lune et vit en meute."
     }
    ]
   },
   {
    "cles": [
     "0,1",
     "1,1",
     "2,1",
     "3,1",
     "4,1",
     "5,1",
     "6,1",
     "7,1"
    ],
    "reponses": [
     {
      "mot": "ILE",
      "def": "De la terre entourée d'eau."
     },
     {
      "mot": "CHIEN",
      "def": "Il aboie et remue la queue."
     }
    ]
   },
   {
    "cles": [
     "-1,2",
     "0,2",
     "1,2",
     "2,2",
     "3,2",
     "4,2",
     "5,2",
     "6,2",
     "7,2"
    ],
    "reponses": [
     {
      "mot": "VELO",
      "def": "Le deux-roues à pédales."
     },
     {
      "mot": "ECRIT",
      "def": "Tracé sur le papier."
     }
    ]
   },
   {
    "cles": [
     "-1,3",
     "0,3",
     "1,3",
     "2,3",
     "3,3",
     "4,3",
     "5,3",
     "6,3"
    ],
    "reponses": [
     {
      "mot": "SEC",
      "def": "Sans une goutte d'eau."
     },
     {
      "mot": "RESTE",
      "def": "Ce qui n'a pas pu être partagé dans une division."
     }
    ]
   },
   {
    "cles": [
     "-2,4",
     "-1,4",
     "0,4",
     "1,4",
     "2,4",
     "3,4",
     "4,4",
     "5,4",
     "6,4"
    ],
    "reponses": [
     {
      "mot": "HERBE",
      "def": "Le vert qui pousse dans le pré."
     },
     {
      "mot": "NOTE",
      "def": "Le chiffre du devoir, ou le son de la musique."
     }
    ]
   },
   {
    "cles": [
     "-2,5",
     "-1,5",
     "0,5",
     "1,5",
     "2,5",
     "3,5",
     "4,5",
     "5,5"
    ],
    "reponses": [
     {
      "mot": "ZOO",
      "def": "Le parc où l'on regarde les animaux."
     },
     {
      "mot": "MONDE",
      "def": "Tout ce qui existe sur la Terre."
     }
    ]
   },
   {
    "cles": [
     "-3,6",
     "-2,6",
     "-1,6",
     "0,6",
     "1,6",
     "2,6",
     "3,6",
     "4,6",
     "5,6"
    ],
    "reponses": [
     {
      "mot": "ROSE",
      "def": "La fleur à épines."
     },
     {
      "mot": "MAIRE",
      "def": "Il dirige la commune."
     }
    ]
   },
   {
    "cles": [
     "-3,7",
     "-2,7",
     "-1,7",
     "0,7",
     "1,7",
     "2,7",
     "3,7",
     "4,7"
    ],
    "reponses": [
     {
      "mot": "BUT",
      "def": "Ce qu'on vise — ou ce qu'on marque au football."
     },
     {
      "mot": "ELEVE",
      "def": "Celui qui apprend, assis à sa table."
     }
    ]
   },
   {
    "cles": [
     "-4,8",
     "-3,8",
     "-2,8",
     "-1,8",
     "0,8",
     "1,8",
     "2,8",
     "3,8",
     "4,8"
    ],
    "reponses": [
     {
      "mot": "GAI",
      "def": "De bonne humeur."
     },
     {
      "mot": "CAMION",
      "def": "Il transporte les marchandises."
     }
    ]
   },
   {
    "cles": [
     "-4,9",
     "-3,9",
     "-2,9",
     "-1,9",
     "0,9",
     "1,9",
     "2,9",
     "3,9"
    ],
    "reponses": [
     {
      "mot": "BAR",
      "def": "On y commande à boire, debout au comptoir."
     },
     {
      "mot": "POULE",
      "def": "Elle pond les œufs."
     }
    ]
   },
   {
    "cles": [
     "-5,10",
     "-4,10",
     "-3,10",
     "-2,10",
     "-1,10",
     "0,10",
     "1,10"
    ],
    "reponses": [
     {
      "mot": "FER",
      "def": "Le métal de l'aimant, et celui qui repasse."
     },
     {
      "mot": "HIER",
      "def": "Le jour d'avant aujourd'hui."
     }
    ]
   }
  ],
  "fleurs": [
   {
    "centre": "2,2",
    "petales": [
     "3,1",
     "3,2",
     "2,3",
     "1,3",
     "1,2",
     "2,1"
    ],
    "mot": "CERCLE",
    "def": "Tous ses points sont à la même distance du centre.",
    "maths": true,
    "depart": 0,
    "couleur": "claire"
   },
   {
    "centre": "2,4",
    "petales": [
     "3,3",
     "3,4",
     "2,5",
     "1,5",
     "1,4",
     "2,3"
    ],
    "mot": "NOMBRE",
    "def": "Ce qui dit une quantité.",
    "maths": true,
    "depart": 1,
    "couleur": "moyenne"
   },
   {
    "centre": "2,8",
    "petales": [
     "3,7",
     "3,8",
     "2,9",
     "1,9",
     "1,8",
     "2,7"
    ],
    "mot": "VOLUME",
    "def": "La place occupée dans l'espace.",
    "maths": true,
    "depart": 0,
    "couleur": "foncee"
   },
   {
    "centre": "6,2",
    "petales": [
     "7,1",
     "7,2",
     "6,3",
     "5,3",
     "5,2",
     "6,1"
    ],
    "mot": "TRENTE",
    "def": "Le nombre 30, en toutes lettres.",
    "maths": true,
    "depart": 3,
    "couleur": "claire"
   },
   {
    "centre": "0,6",
    "petales": [
     "1,5",
     "1,6",
     "0,7",
     "-1,7",
     "-1,6",
     "0,5"
    ],
    "mot": "SOMMET",
    "def": "Le point où deux côtés se rejoignent.",
    "maths": true,
    "depart": 4,
    "couleur": "moyenne"
   },
   {
    "centre": "0,2",
    "petales": [
     "1,1",
     "1,2",
     "0,3",
     "-1,3",
     "-1,2",
     "0,1"
    ],
    "mot": "VILLES",
    "def": "Beaucoup de rues et de maisons, au pluriel.",
    "maths": false,
    "depart": 4,
    "couleur": "foncee"
   }
  ],
  "signature": "CERCLE NOMBRE SOMMET TRENTE VILLES VOLUME"
 },
 {
  "id": "jardin-07",
  "cases": [
   "0,0",
   "1,0",
   "2,0",
   "3,0",
   "4,0",
   "5,0",
   "6,0",
   "0,1",
   "1,1",
   "2,1",
   "3,1",
   "4,1",
   "5,1",
   "6,1",
   "7,1",
   "-1,2",
   "0,2",
   "1,2",
   "2,2",
   "3,2",
   "4,2",
   "5,2",
   "6,2",
   "7,2",
   "-1,3",
   "0,3",
   "1,3",
   "2,3",
   "3,3",
   "4,3",
   "5,3",
   "6,3",
   "-2,4",
   "-1,4",
   "0,4",
   "1,4",
   "2,4",
   "3,4",
   "4,4",
   "5,4",
   "6,4",
   "-2,5",
   "-1,5",
   "0,5",
   "1,5",
   "2,5",
   "3,5",
   "4,5",
   "5,5",
   "-3,6",
   "-2,6",
   "-1,6",
   "0,6",
   "1,6",
   "2,6",
   "3,6",
   "4,6",
   "5,6",
   "-3,7",
   "-2,7",
   "-1,7",
   "0,7",
   "1,7",
   "2,7",
   "3,7",
   "4,7",
   "-4,8",
   "-3,8",
   "-2,8",
   "-1,8",
   "0,8",
   "1,8",
   "2,8",
   "3,8",
   "4,8",
   "-4,9",
   "-3,9",
   "-2,9",
   "-1,9",
   "0,9",
   "1,9",
   "2,9",
   "3,9",
   "-5,10",
   "-4,10",
   "-3,10",
   "-2,10",
   "-1,10",
   "0,10",
   "1,10"
  ],
  "rangees": [
   {
    "cles": [
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0",
     "6,0"
    ],
    "reponses": [
     {
      "mot": "PRE",
      "def": "Le champ d'herbe où broutent les vaches."
     },
     {
      "mot": "CLOU",
      "def": "On l'enfonce au marteau."
     }
    ]
   },
   {
    "cles": [
     "0,1",
     "1,1",
     "2,1",
     "3,1",
     "4,1",
     "5,1",
     "6,1",
     "7,1"
    ],
    "reponses": [
     {
      "mot": "LAC",
      "def": "De l'eau dormante entourée de terre."
     },
     {
      "mot": "BALLE",
      "def": "On la lance et on la rattrape."
     }
    ]
   },
   {
    "cles": [
     "-1,2",
     "0,2",
     "1,2",
     "2,2",
     "3,2",
     "4,2",
     "5,2",
     "6,2",
     "7,2"
    ],
    "reponses": [
     {
      "mot": "PONT",
      "def": "Il enjambe la rivière."
     },
     {
      "mot": "CYCLE",
      "def": "Ce qui revient toujours au même point."
     }
    ]
   },
   {
    "cles": [
     "-1,3",
     "0,3",
     "1,3",
     "2,3",
     "3,3",
     "4,3",
     "5,3",
     "6,3"
    ],
    "reponses": [
     {
      "mot": "ETE",
      "def": "La saison des vacances."
     },
     {
      "mot": "PLUIE",
      "def": "L'eau qui tombe du ciel."
     }
    ]
   },
   {
    "cles": [
     "-2,4",
     "-1,4",
     "0,4",
     "1,4",
     "2,4",
     "3,4",
     "4,4",
     "5,4",
     "6,4"
    ],
    "reponses": [
     {
      "mot": "CARTE",
      "def": "On la consulte pour trouver son chemin."
     },
     {
      "mot": "SEVE",
      "def": "Le liquide qui monte dans l'arbre au printemps."
     }
    ]
   },
   {
    "cles": [
     "-2,5",
     "-1,5",
     "0,5",
     "1,5",
     "2,5",
     "3,5",
     "4,5",
     "5,5"
    ],
    "reponses": [
     {
      "mot": "AMOUR",
      "def": "Le sentiment qui attache deux êtres."
     },
     {
      "mot": "ERE",
      "def": "Une très longue période de l'histoire."
     }
    ]
   },
   {
    "cles": [
     "-3,6",
     "-2,6",
     "-1,6",
     "0,6",
     "1,6",
     "2,6",
     "3,6",
     "4,6",
     "5,6"
    ],
    "reponses": [
     {
      "mot": "COIN",
      "def": "L'endroit où deux murs se rencontrent."
     },
     {
      "mot": "BANDE",
      "def": "Une longue étroite — ou un groupe de copains."
     }
    ]
   },
   {
    "cles": [
     "-3,7",
     "-2,7",
     "-1,7",
     "0,7",
     "1,7",
     "2,7",
     "3,7",
     "4,7"
    ],
    "reponses": [
     {
      "mot": "NOIR",
      "def": "La couleur de la nuit sans lune."
     },
     {
      "mot": "MOIS",
      "def": "Janvier en est un."
     }
    ]
   },
   {
    "cles": [
     "-4,8",
     "-3,8",
     "-2,8",
     "-1,8",
     "0,8",
     "1,8",
     "2,8",
     "3,8",
     "4,8"
    ],
    "reponses": [
     {
      "mot": "LITTERALE",
      "def": "Se dit d'un calcul où des lettres remplacent des nombres."
     }
    ]
   },
   {
    "cles": [
     "-4,9",
     "-3,9",
     "-2,9",
     "-1,9",
     "0,9",
     "1,9",
     "2,9",
     "3,9"
    ],
    "reponses": [
     {
      "mot": "TAS",
      "def": "Beaucoup de choses entassées."
     },
     {
      "mot": "PARIS",
      "def": "La capitale de la France."
     }
    ]
   },
   {
    "cles": [
     "-5,10",
     "-4,10",
     "-3,10",
     "-2,10",
     "-1,10",
     "0,10",
     "1,10"
    ],
    "reponses": [
     {
      "mot": "VITESSE",
      "def": "La distance parcourue en un temps donné."
     }
    ]
   }
  ],
  "fleurs": [
   {
    "centre": "4,4",
    "petales": [
     "5,3",
     "5,4",
     "4,5",
     "3,5",
     "3,4",
     "4,3"
    ],
    "mot": "SUIVRE",
    "def": "Aller derrière, sans perdre de vue.",
    "maths": false,
    "depart": 4,
    "couleur": "claire"
   },
   {
    "centre": "0,2",
    "petales": [
     "1,1",
     "1,2",
     "0,3",
     "-1,3",
     "-1,2",
     "0,1"
    ],
    "mot": "PLANTE",
    "def": "Elle pousse et a besoin d'eau.",
    "maths": false,
    "depart": 4,
    "couleur": "moyenne"
   },
   {
    "centre": "0,4",
    "petales": [
     "1,3",
     "1,4",
     "0,5",
     "-1,5",
     "-1,4",
     "0,3"
    ],
    "mot": "TOMATE",
    "def": "Le fruit rouge de la salade.",
    "maths": false,
    "depart": 1,
    "couleur": "foncee"
   },
   {
    "centre": "4,2",
    "petales": [
     "5,1",
     "5,2",
     "4,3",
     "3,3",
     "3,2",
     "4,1"
    ],
    "mot": "CALCUL",
    "def": "Ce qu'on fait avec des nombres pour trouver un résultat.",
    "maths": true,
    "depart": 4,
    "couleur": "claire"
   },
   {
    "centre": "-2,6",
    "petales": [
     "-1,5",
     "-1,6",
     "-2,7",
     "-3,7",
     "-3,6",
     "-2,5"
    ],
    "mot": "CAMION",
    "def": "Il transporte les marchandises.",
    "maths": false,
    "depart": 4,
    "couleur": "moyenne"
   },
   {
    "centre": "2,6",
    "petales": [
     "3,5",
     "3,6",
     "2,7",
     "1,7",
     "1,6",
     "2,5"
    ],
    "mot": "NOMBRE",
    "def": "Ce qui dit une quantité.",
    "maths": true,
    "depart": 1,
    "couleur": "foncee"
   }
  ],
  "signature": "CALCUL CAMION NOMBRE PLANTE SUIVRE TOMATE"
 },
 {
  "id": "jardin-08",
  "cases": [
   "0,0",
   "1,0",
   "2,0",
   "3,0",
   "4,0",
   "5,0",
   "6,0",
   "0,1",
   "1,1",
   "2,1",
   "3,1",
   "4,1",
   "5,1",
   "6,1",
   "7,1",
   "-1,2",
   "0,2",
   "1,2",
   "2,2",
   "3,2",
   "4,2",
   "5,2",
   "6,2",
   "7,2",
   "-1,3",
   "0,3",
   "1,3",
   "2,3",
   "3,3",
   "4,3",
   "5,3",
   "6,3",
   "-2,4",
   "-1,4",
   "0,4",
   "1,4",
   "2,4",
   "3,4",
   "4,4",
   "5,4",
   "6,4",
   "-2,5",
   "-1,5",
   "0,5",
   "1,5",
   "2,5",
   "3,5",
   "4,5",
   "5,5",
   "-3,6",
   "-2,6",
   "-1,6",
   "0,6",
   "1,6",
   "2,6",
   "3,6",
   "4,6",
   "5,6",
   "-3,7",
   "-2,7",
   "-1,7",
   "0,7",
   "1,7",
   "2,7",
   "3,7",
   "4,7",
   "-4,8",
   "-3,8",
   "-2,8",
   "-1,8",
   "0,8",
   "1,8",
   "2,8",
   "3,8",
   "4,8",
   "-4,9",
   "-3,9",
   "-2,9",
   "-1,9",
   "0,9",
   "1,9",
   "2,9",
   "3,9",
   "-5,10",
   "-4,10",
   "-3,10",
   "-2,10",
   "-1,10",
   "0,10",
   "1,10"
  ],
  "rangees": [
   {
    "cles": [
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0",
     "6,0"
    ],
    "reponses": [
     {
      "mot": "ECUS",
      "def": "Les boucliers des chevaliers."
     },
     {
      "mot": "LOT",
      "def": "Ce qu'on gagne à la tombola."
     }
    ]
   },
   {
    "cles": [
     "0,1",
     "1,1",
     "2,1",
     "3,1",
     "4,1",
     "5,1",
     "6,1",
     "7,1"
    ],
    "reponses": [
     {
      "mot": "CHAMP",
      "def": "Le terrain que cultive le paysan."
     },
     {
      "mot": "PUR",
      "def": "Sans aucun mélange."
     }
    ]
   },
   {
    "cles": [
     "-1,2",
     "0,2",
     "1,2",
     "2,2",
     "3,2",
     "4,2",
     "5,2",
     "6,2",
     "7,2"
    ],
    "reponses": [
     {
      "mot": "RADIO",
      "def": "On l'écoute, elle ne se regarde pas."
     },
     {
      "mot": "FOUR",
      "def": "On y cuit le gâteau."
     }
    ]
   },
   {
    "cles": [
     "-1,3",
     "0,3",
     "1,3",
     "2,3",
     "3,3",
     "4,3",
     "5,3",
     "6,3"
    ],
    "reponses": [
     {
      "mot": "CRU",
      "def": "Qui n'est pas passé par la casserole."
     },
     {
      "mot": "RESTE",
      "def": "Ce qui n'a pas pu être partagé dans une division."
     }
    ]
   },
   {
    "cles": [
     "-2,4",
     "-1,4",
     "0,4",
     "1,4",
     "2,4",
     "3,4",
     "4,4",
     "5,4",
     "6,4"
    ],
    "reponses": [
     {
      "mot": "DEUX",
      "def": "Le nombre 2, en toutes lettres."
     },
     {
      "mot": "OUTIL",
      "def": "Le marteau et la pince en sont."
     }
    ]
   },
   {
    "cles": [
     "-2,5",
     "-1,5",
     "0,5",
     "1,5",
     "2,5",
     "3,5",
     "4,5",
     "5,5"
    ],
    "reponses": [
     {
      "mot": "SEL",
      "def": "Le blanc qui sale la soupe."
     },
     {
      "mot": "CIBLE",
      "def": "Ce qu'on vise avec la flèche."
     }
    ]
   },
   {
    "cles": [
     "-3,6",
     "-2,6",
     "-1,6",
     "0,6",
     "1,6",
     "2,6",
     "3,6",
     "4,6",
     "5,6"
    ],
    "reponses": [
     {
      "mot": "COU",
      "def": "Entre la tête et les épaules."
     },
     {
      "mot": "RAPIDE",
      "def": "Qui va vite."
     }
    ]
   },
   {
    "cles": [
     "-3,7",
     "-2,7",
     "-1,7",
     "0,7",
     "1,7",
     "2,7",
     "3,7",
     "4,7"
    ],
    "reponses": [
     {
      "mot": "CYCLE",
      "def": "Ce qui revient toujours au même point."
     },
     {
      "mot": "POT",
      "def": "On y met la confiture."
     }
    ]
   },
   {
    "cles": [
     "-4,8",
     "-3,8",
     "-2,8",
     "-1,8",
     "0,8",
     "1,8",
     "2,8",
     "3,8",
     "4,8"
    ],
    "reponses": [
     {
      "mot": "REPOS",
      "def": "Ce qu'on prend quand on est fatigué."
     },
     {
      "mot": "SORT",
      "def": "Ce que le destin réserve."
     }
    ]
   },
   {
    "cles": [
     "-4,9",
     "-3,9",
     "-2,9",
     "-1,9",
     "0,9",
     "1,9",
     "2,9",
     "3,9"
    ],
    "reponses": [
     {
      "mot": "PLACE",
      "def": "L'endroit où une chose doit être."
     },
     {
      "mot": "ETE",
      "def": "La saison des vacances."
     }
    ]
   },
   {
    "cles": [
     "-5,10",
     "-4,10",
     "-3,10",
     "-2,10",
     "-1,10",
     "0,10",
     "1,10"
    ],
    "reponses": [
     {
      "mot": "DIXSEPT",
      "def": "Le nombre 17, en toutes lettres."
     }
    ]
   }
  ],
  "fleurs": [
   {
    "centre": "6,2",
    "petales": [
     "7,1",
     "7,2",
     "6,3",
     "5,3",
     "5,2",
     "6,1"
    ],
    "mot": "RETOUR",
    "def": "Le chemin du soir, après l'aller.",
    "maths": false,
    "depart": 1,
    "couleur": "claire"
   },
   {
    "centre": "4,2",
    "petales": [
     "5,1",
     "5,2",
     "4,3",
     "3,3",
     "3,2",
     "4,1"
    ],
    "mot": "OPPOSE",
    "def": "Même distance à zéro, de l'autre côté : −5 et 5.",
    "maths": true,
    "depart": 4,
    "couleur": "moyenne"
   },
   {
    "centre": "0,6",
    "petales": [
     "1,5",
     "1,6",
     "0,7",
     "-1,7",
     "-1,6",
     "0,5"
    ],
    "mot": "CALCUL",
    "def": "Ce qu'on fait avec des nombres pour trouver un résultat.",
    "maths": true,
    "depart": 0,
    "couleur": "foncee"
   },
   {
    "centre": "0,8",
    "petales": [
     "1,7",
     "1,8",
     "0,9",
     "-1,9",
     "-1,8",
     "0,7"
    ],
    "mot": "ECOLES",
    "def": "On y apprend, au pluriel.",
    "maths": false,
    "depart": 2,
    "couleur": "claire"
   },
   {
    "centre": "2,8",
    "petales": [
     "3,7",
     "3,8",
     "2,9",
     "1,9",
     "1,8",
     "2,7"
    ],
    "mot": "PORTES",
    "def": "On les ouvre pour entrer, au pluriel.",
    "maths": false,
    "depart": 5,
    "couleur": "moyenne"
   },
   {
    "centre": "4,6",
    "petales": [
     "5,5",
     "5,6",
     "4,7",
     "3,7",
     "3,6",
     "4,5"
    ],
    "mot": "ETOILE",
    "def": "Elle brille la nuit, très loin.",
    "maths": false,
    "depart": 1,
    "couleur": "foncee"
   }
  ],
  "signature": "CALCUL ECOLES ETOILE OPPOSE PORTES RETOUR"
 },
 {
  "id": "jardin-09",
  "cases": [
   "0,0",
   "1,0",
   "2,0",
   "3,0",
   "4,0",
   "5,0",
   "6,0",
   "0,1",
   "1,1",
   "2,1",
   "3,1",
   "4,1",
   "5,1",
   "6,1",
   "7,1",
   "-1,2",
   "0,2",
   "1,2",
   "2,2",
   "3,2",
   "4,2",
   "5,2",
   "6,2",
   "7,2",
   "-1,3",
   "0,3",
   "1,3",
   "2,3",
   "3,3",
   "4,3",
   "5,3",
   "6,3",
   "-2,4",
   "-1,4",
   "0,4",
   "1,4",
   "2,4",
   "3,4",
   "4,4",
   "5,4",
   "6,4",
   "-2,5",
   "-1,5",
   "0,5",
   "1,5",
   "2,5",
   "3,5",
   "4,5",
   "5,5",
   "-3,6",
   "-2,6",
   "-1,6",
   "0,6",
   "1,6",
   "2,6",
   "3,6",
   "4,6",
   "5,6",
   "-3,7",
   "-2,7",
   "-1,7",
   "0,7",
   "1,7",
   "2,7",
   "3,7",
   "4,7",
   "-4,8",
   "-3,8",
   "-2,8",
   "-1,8",
   "0,8",
   "1,8",
   "2,8",
   "3,8",
   "4,8",
   "-4,9",
   "-3,9",
   "-2,9",
   "-1,9",
   "0,9",
   "1,9",
   "2,9",
   "3,9",
   "-5,10",
   "-4,10",
   "-3,10",
   "-2,10",
   "-1,10",
   "0,10",
   "1,10"
  ],
  "rangees": [
   {
    "cles": [
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0",
     "6,0"
    ],
    "reponses": [
     {
      "mot": "TRAVAIL",
      "def": "Ce qu'on fait pour gagner sa vie."
     }
    ]
   },
   {
    "cles": [
     "0,1",
     "1,1",
     "2,1",
     "3,1",
     "4,1",
     "5,1",
     "6,1",
     "7,1"
    ],
    "reponses": [
     {
      "mot": "FILS",
      "def": "L'enfant mâle de la famille."
     },
     {
      "mot": "DAME",
      "def": "La pièce la plus forte aux échecs."
     }
    ]
   },
   {
    "cles": [
     "-1,2",
     "0,2",
     "1,2",
     "2,2",
     "3,2",
     "4,2",
     "5,2",
     "6,2",
     "7,2"
    ],
    "reponses": [
     {
      "mot": "MAISON",
      "def": "On y habite, elle a un toit."
     },
     {
      "mot": "GAI",
      "def": "De bonne humeur."
     }
    ]
   },
   {
    "cles": [
     "-1,3",
     "0,3",
     "1,3",
     "2,3",
     "3,3",
     "4,3",
     "5,3",
     "6,3"
    ],
    "reponses": [
     {
      "mot": "MIEL",
      "def": "Le sucré que font les abeilles."
     },
     {
      "mot": "CENT",
      "def": "Le nombre 100, en toutes lettres."
     }
    ]
   },
   {
    "cles": [
     "-2,4",
     "-1,4",
     "0,4",
     "1,4",
     "2,4",
     "3,4",
     "4,4",
     "5,4",
     "6,4"
    ],
    "reponses": [
     {
      "mot": "TROU",
      "def": "Le creux dans la chaussette usée."
     },
     {
      "mot": "JAMBE",
      "def": "Elle va de la hanche au pied."
     }
    ]
   },
   {
    "cles": [
     "-2,5",
     "-1,5",
     "0,5",
     "1,5",
     "2,5",
     "3,5",
     "4,5",
     "5,5"
    ],
    "reponses": [
     {
      "mot": "PARC",
      "def": "Le jardin public aux grands arbres."
     },
     {
      "mot": "LIEN",
      "def": "Ce qui attache deux choses ensemble."
     }
    ]
   },
   {
    "cles": [
     "-3,6",
     "-2,6",
     "-1,6",
     "0,6",
     "1,6",
     "2,6",
     "3,6",
     "4,6",
     "5,6"
    ],
    "reponses": [
     {
      "mot": "MANGER",
      "def": "Porter la nourriture à sa bouche."
     },
     {
      "mot": "RAT",
      "def": "Le rongeur gris des égouts."
     }
    ]
   },
   {
    "cles": [
     "-3,7",
     "-2,7",
     "-1,7",
     "0,7",
     "1,7",
     "2,7",
     "3,7",
     "4,7"
    ],
    "reponses": [
     {
      "mot": "AIRE",
      "def": "La mesure de la surface : le nombre de carreaux dedans."
     },
     {
      "mot": "TETE",
      "def": "Elle porte les yeux et les oreilles."
     }
    ]
   },
   {
    "cles": [
     "-4,8",
     "-3,8",
     "-2,8",
     "-1,8",
     "0,8",
     "1,8",
     "2,8",
     "3,8",
     "4,8"
    ],
    "reponses": [
     {
      "mot": "POMME",
      "def": "Le fruit rond du verger."
     },
     {
      "mot": "SAGE",
      "def": "Qui se tient tranquille."
     }
    ]
   },
   {
    "cles": [
     "-4,9",
     "-3,9",
     "-2,9",
     "-1,9",
     "0,9",
     "1,9",
     "2,9",
     "3,9"
    ],
    "reponses": [
     {
      "mot": "TRI",
      "def": "Ce qu'on fait des déchets avant de les jeter."
     },
     {
      "mot": "MOYEN",
      "def": "La façon dont on s'y prend."
     }
    ]
   },
   {
    "cles": [
     "-5,10",
     "-4,10",
     "-3,10",
     "-2,10",
     "-1,10",
     "0,10",
     "1,10"
    ],
    "reponses": [
     {
      "mot": "LAC",
      "def": "De l'eau dormante entourée de terre."
     },
     {
      "mot": "SOIE",
      "def": "Le tissu fin que fait le ver."
     }
    ]
   }
  ],
  "fleurs": [
   {
    "centre": "2,4",
    "petales": [
     "3,3",
     "3,4",
     "2,5",
     "1,5",
     "1,4",
     "2,3"
    ],
    "mot": "CALCUL",
    "def": "Ce qu'on fait avec des nombres pour trouver un résultat.",
    "maths": true,
    "depart": 0,
    "couleur": "claire"
   },
   {
    "centre": "-2,8",
    "petales": [
     "-1,7",
     "-1,8",
     "-2,9",
     "-3,9",
     "-3,8",
     "-2,7"
    ],
    "mot": "MIROIR",
    "def": "On s'y voit tel qu'on est.",
    "maths": false,
    "depart": 1,
    "couleur": "moyenne"
   },
   {
    "centre": "0,8",
    "petales": [
     "1,7",
     "1,8",
     "0,9",
     "-1,9",
     "-1,8",
     "0,7"
    ],
    "mot": "SOMMET",
    "def": "Le point où deux côtés se rejoignent.",
    "maths": true,
    "depart": 1,
    "couleur": "foncee"
   },
   {
    "centre": "4,6",
    "petales": [
     "5,5",
     "5,6",
     "4,7",
     "3,7",
     "3,6",
     "4,5"
    ],
    "mot": "TRENTE",
    "def": "Le nombre 30, en toutes lettres.",
    "maths": true,
    "depart": 3,
    "couleur": "claire"
   },
   {
    "centre": "4,2",
    "petales": [
     "5,1",
     "5,2",
     "4,3",
     "3,3",
     "3,2",
     "4,1"
    ],
    "mot": "CODAGE",
    "def": "Le petit arc, ou le petit carré, qui marque un angle sur la figure.",
    "maths": true,
    "depart": 3,
    "couleur": "moyenne"
   },
   {
    "centre": "2,2",
    "petales": [
     "3,1",
     "3,2",
     "2,3",
     "1,3",
     "1,2",
     "2,1"
    ],
    "mot": "SOLEIL",
    "def": "Il se lève à l'est et chauffe la journée.",
    "maths": false,
    "depart": 0,
    "couleur": "foncee"
   }
  ],
  "signature": "CALCUL CODAGE MIROIR SOLEIL SOMMET TRENTE"
 },
 {
  "id": "jardin-10",
  "cases": [
   "0,0",
   "1,0",
   "2,0",
   "3,0",
   "4,0",
   "5,0",
   "6,0",
   "0,1",
   "1,1",
   "2,1",
   "3,1",
   "4,1",
   "5,1",
   "6,1",
   "7,1",
   "-1,2",
   "0,2",
   "1,2",
   "2,2",
   "3,2",
   "4,2",
   "5,2",
   "6,2",
   "7,2",
   "-1,3",
   "0,3",
   "1,3",
   "2,3",
   "3,3",
   "4,3",
   "5,3",
   "6,3",
   "-2,4",
   "-1,4",
   "0,4",
   "1,4",
   "2,4",
   "3,4",
   "4,4",
   "5,4",
   "6,4",
   "-2,5",
   "-1,5",
   "0,5",
   "1,5",
   "2,5",
   "3,5",
   "4,5",
   "5,5",
   "-3,6",
   "-2,6",
   "-1,6",
   "0,6",
   "1,6",
   "2,6",
   "3,6",
   "4,6",
   "5,6",
   "-3,7",
   "-2,7",
   "-1,7",
   "0,7",
   "1,7",
   "2,7",
   "3,7",
   "4,7",
   "-4,8",
   "-3,8",
   "-2,8",
   "-1,8",
   "0,8",
   "1,8",
   "2,8",
   "3,8",
   "4,8",
   "-4,9",
   "-3,9",
   "-2,9",
   "-1,9",
   "0,9",
   "1,9",
   "2,9",
   "3,9",
   "-5,10",
   "-4,10",
   "-3,10",
   "-2,10",
   "-1,10",
   "0,10",
   "1,10"
  ],
  "rangees": [
   {
    "cles": [
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0",
     "6,0"
    ],
    "reponses": [
     {
      "mot": "BOUT",
      "def": "L'extrémité d'une chose."
     },
     {
      "mot": "ECU",
      "def": "Le bouclier du chevalier."
     }
    ]
   },
   {
    "cles": [
     "0,1",
     "1,1",
     "2,1",
     "3,1",
     "4,1",
     "5,1",
     "6,1",
     "7,1"
    ],
    "reponses": [
     {
      "mot": "OIE",
      "def": "Un gros oiseau de ferme au long cou."
     },
     {
      "mot": "POINT",
      "def": "Le plus petit signe qu'on puisse tracer."
     }
    ]
   },
   {
    "cles": [
     "-1,2",
     "0,2",
     "1,2",
     "2,2",
     "3,2",
     "4,2",
     "5,2",
     "6,2",
     "7,2"
    ],
    "reponses": [
     {
      "mot": "RETOUR",
      "def": "Le chemin du soir, après l'aller."
     },
     {
      "mot": "EPI",
      "def": "La tige où poussent les grains du blé."
     }
    ]
   },
   {
    "cles": [
     "-1,3",
     "0,3",
     "1,3",
     "2,3",
     "3,3",
     "4,3",
     "5,3",
     "6,3"
    ],
    "reponses": [
     {
      "mot": "DES",
      "def": "On les lance pour avancer au jeu de l'oie."
     },
     {
      "mot": "GENRE",
      "def": "La sorte, l'espèce à laquelle on appartient."
     }
    ]
   },
   {
    "cles": [
     "-2,4",
     "-1,4",
     "0,4",
     "1,4",
     "2,4",
     "3,4",
     "4,4",
     "5,4",
     "6,4"
    ],
    "reponses": [
     {
      "mot": "ODE",
      "def": "Un poème qui chante les louanges de quelque chose."
     },
     {
      "mot": "ACCORD",
      "def": "Ce qui met tout le monde d'avis semblable."
     }
    ]
   },
   {
    "cles": [
     "-2,5",
     "-1,5",
     "0,5",
     "1,5",
     "2,5",
     "3,5",
     "4,5",
     "5,5"
    ],
    "reponses": [
     {
      "mot": "MAL",
      "def": "Le contraire du bien."
     },
     {
      "mot": "DOUZE",
      "def": "Le nombre 12, en toutes lettres."
     }
    ]
   },
   {
    "cles": [
     "-3,6",
     "-2,6",
     "-1,6",
     "0,6",
     "1,6",
     "2,6",
     "3,6",
     "4,6",
     "5,6"
    ],
    "reponses": [
     {
      "mot": "SORT",
      "def": "Ce que le destin réserve."
     },
     {
      "mot": "DEBUT",
      "def": "Le contraire de la fin."
     }
    ]
   },
   {
    "cles": [
     "-3,7",
     "-2,7",
     "-1,7",
     "0,7",
     "1,7",
     "2,7",
     "3,7",
     "4,7"
    ],
    "reponses": [
     {
      "mot": "IDEE",
      "def": "Ce qui vient à l'esprit quand on réfléchit."
     },
     {
      "mot": "ELAN",
      "def": "La course qu'on prend avant de sauter."
     }
    ]
   },
   {
    "cles": [
     "-4,8",
     "-3,8",
     "-2,8",
     "-1,8",
     "0,8",
     "1,8",
     "2,8",
     "3,8",
     "4,8"
    ],
    "reponses": [
     {
      "mot": "AILE",
      "def": "L'oiseau en a deux pour voler."
     },
     {
      "mot": "BORDS",
      "def": "Les limites extérieures d'une surface."
     }
    ]
   },
   {
    "cles": [
     "-4,9",
     "-3,9",
     "-2,9",
     "-1,9",
     "0,9",
     "1,9",
     "2,9",
     "3,9"
    ],
    "reponses": [
     {
      "mot": "MONDE",
      "def": "Tout ce qui existe sur la Terre."
     },
     {
      "mot": "PIN",
      "def": "L'arbre à aiguilles et à pommes."
     }
    ]
   },
   {
    "cles": [
     "-5,10",
     "-4,10",
     "-3,10",
     "-2,10",
     "-1,10",
     "0,10",
     "1,10"
    ],
    "reponses": [
     {
      "mot": "COQ",
      "def": "Il chante au lever du jour."
     },
     {
      "mot": "RIRE",
      "def": "Ce qu'on fait quand c'est drôle."
     }
    ]
   }
  ],
  "fleurs": [
   {
    "centre": "6,2",
    "petales": [
     "7,1",
     "7,2",
     "6,3",
     "5,3",
     "5,2",
     "6,1"
    ],
    "mot": "ENTIER",
    "def": "Un nombre sans virgule : 0, 1, 2, 3…",
    "maths": true,
    "depart": 4,
    "couleur": "claire"
   },
   {
    "centre": "2,4",
    "petales": [
     "3,3",
     "3,4",
     "2,5",
     "1,5",
     "1,4",
     "2,3"
    ],
    "mot": "CODAGE",
    "def": "Le petit arc, ou le petit carré, qui marque un angle sur la figure.",
    "maths": true,
    "depart": 1,
    "couleur": "moyenne"
   },
   {
    "centre": "0,4",
    "petales": [
     "1,3",
     "1,4",
     "0,5",
     "-1,5",
     "-1,4",
     "0,3"
    ],
    "mot": "SALADE",
    "def": "Les feuilles vertes qu'on assaisonne.",
    "maths": false,
    "depart": 0,
    "couleur": "foncee"
   },
   {
    "centre": "2,6",
    "petales": [
     "3,5",
     "3,6",
     "2,7",
     "1,7",
     "1,6",
     "2,5"
    ],
    "mot": "DOUBLE",
    "def": "Deux fois plus.",
    "maths": true,
    "depart": 4,
    "couleur": "claire"
   },
   {
    "centre": "-2,6",
    "petales": [
     "-1,5",
     "-1,6",
     "-2,7",
     "-3,7",
     "-3,6",
     "-2,5"
    ],
    "mot": "MARDIS",
    "def": "Les jours après lundi, au pluriel.",
    "maths": false,
    "depart": 5,
    "couleur": "moyenne"
   },
   {
    "centre": "0,2",
    "petales": [
     "1,1",
     "1,2",
     "0,3",
     "-1,3",
     "-1,2",
     "0,1"
    ],
    "mot": "DROITE",
    "def": "Illimitée des deux côtés, elle n'a ni début ni fin.",
    "maths": true,
    "depart": 3,
    "couleur": "foncee"
   }
  ],
  "signature": "CODAGE DOUBLE DROITE ENTIER MARDIS SALADE"
 },
 {
  "id": "jardin-11",
  "cases": [
   "0,0",
   "1,0",
   "2,0",
   "3,0",
   "4,0",
   "5,0",
   "6,0",
   "0,1",
   "1,1",
   "2,1",
   "3,1",
   "4,1",
   "5,1",
   "6,1",
   "7,1",
   "-1,2",
   "0,2",
   "1,2",
   "2,2",
   "3,2",
   "4,2",
   "5,2",
   "6,2",
   "7,2",
   "-1,3",
   "0,3",
   "1,3",
   "2,3",
   "3,3",
   "4,3",
   "5,3",
   "6,3",
   "-2,4",
   "-1,4",
   "0,4",
   "1,4",
   "2,4",
   "3,4",
   "4,4",
   "5,4",
   "6,4",
   "-2,5",
   "-1,5",
   "0,5",
   "1,5",
   "2,5",
   "3,5",
   "4,5",
   "5,5",
   "-3,6",
   "-2,6",
   "-1,6",
   "0,6",
   "1,6",
   "2,6",
   "3,6",
   "4,6",
   "5,6",
   "-3,7",
   "-2,7",
   "-1,7",
   "0,7",
   "1,7",
   "2,7",
   "3,7",
   "4,7",
   "-4,8",
   "-3,8",
   "-2,8",
   "-1,8",
   "0,8",
   "1,8",
   "2,8",
   "3,8",
   "4,8",
   "-4,9",
   "-3,9",
   "-2,9",
   "-1,9",
   "0,9",
   "1,9",
   "2,9",
   "3,9",
   "-5,10",
   "-4,10",
   "-3,10",
   "-2,10",
   "-1,10",
   "0,10",
   "1,10"
  ],
  "rangees": [
   {
    "cles": [
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0",
     "6,0"
    ],
    "reponses": [
     {
      "mot": "DEUX",
      "def": "Le nombre 2, en toutes lettres."
     },
     {
      "mot": "VIN",
      "def": "La boisson tirée du raisin."
     }
    ]
   },
   {
    "cles": [
     "0,1",
     "1,1",
     "2,1",
     "3,1",
     "4,1",
     "5,1",
     "6,1",
     "7,1"
    ],
    "reponses": [
     {
      "mot": "TETE",
      "def": "Elle porte les yeux et les oreilles."
     },
     {
      "mot": "SAGE",
      "def": "Qui se tient tranquille."
     }
    ]
   },
   {
    "cles": [
     "-1,2",
     "0,2",
     "1,2",
     "2,2",
     "3,2",
     "4,2",
     "5,2",
     "6,2",
     "7,2"
    ],
    "reponses": [
     {
      "mot": "NOTE",
      "def": "Le chiffre du devoir, ou le son de la musique."
     },
     {
      "mot": "ARETE",
      "def": "Le segment où deux faces d'un solide se rencontrent."
     }
    ]
   },
   {
    "cles": [
     "-1,3",
     "0,3",
     "1,3",
     "2,3",
     "3,3",
     "4,3",
     "5,3",
     "6,3"
    ],
    "reponses": [
     {
      "mot": "ERE",
      "def": "Une très longue période de l'histoire."
     },
     {
      "mot": "ECRAN",
      "def": "On y regarde le film."
     }
    ]
   },
   {
    "cles": [
     "-2,4",
     "-1,4",
     "0,4",
     "1,4",
     "2,4",
     "3,4",
     "4,4",
     "5,4",
     "6,4"
    ],
    "reponses": [
     {
      "mot": "GRIS",
      "def": "Entre le blanc et le noir."
     },
     {
      "mot": "TOILE",
      "def": "Le tissu du peintre, ou celui de l'araignée."
     }
    ]
   },
   {
    "cles": [
     "-2,5",
     "-1,5",
     "0,5",
     "1,5",
     "2,5",
     "3,5",
     "4,5",
     "5,5"
    ],
    "reponses": [
     {
      "mot": "FEVE",
      "def": "On la cache dans la galette des rois."
     },
     {
      "mot": "LIRE",
      "def": "Suivre des yeux ce qui est écrit."
     }
    ]
   },
   {
    "cles": [
     "-3,6",
     "-2,6",
     "-1,6",
     "0,6",
     "1,6",
     "2,6",
     "3,6",
     "4,6",
     "5,6"
    ],
    "reponses": [
     {
      "mot": "AIGU",
      "def": "Plus petit qu'un angle droit."
     },
     {
      "mot": "PLEIN",
      "def": "Le contraire de vide."
     }
    ]
   },
   {
    "cles": [
     "-3,7",
     "-2,7",
     "-1,7",
     "0,7",
     "1,7",
     "2,7",
     "3,7",
     "4,7"
    ],
    "reponses": [
     {
      "mot": "FIN",
      "def": "Le dernier mot du livre."
     },
     {
      "mot": "ECRIT",
      "def": "Tracé sur le papier."
     }
    ]
   },
   {
    "cles": [
     "-4,8",
     "-3,8",
     "-2,8",
     "-1,8",
     "0,8",
     "1,8",
     "2,8",
     "3,8",
     "4,8"
    ],
    "reponses": [
     {
      "mot": "EPI",
      "def": "La tige où poussent les grains du blé."
     },
     {
      "mot": "SALADE",
      "def": "Les feuilles vertes qu'on assaisonne."
     }
    ]
   },
   {
    "cles": [
     "-4,9",
     "-3,9",
     "-2,9",
     "-1,9",
     "0,9",
     "1,9",
     "2,9",
     "3,9"
    ],
    "reponses": [
     {
      "mot": "BAL",
      "def": "La soirée où l'on danse."
     },
     {
      "mot": "SALLE",
      "def": "La grande pièce où la classe se réunit."
     }
    ]
   },
   {
    "cles": [
     "-5,10",
     "-4,10",
     "-3,10",
     "-2,10",
     "-1,10",
     "0,10",
     "1,10"
    ],
    "reponses": [
     {
      "mot": "ARRIVEE",
      "def": "Le bout de la course."
     }
    ]
   }
  ],
  "fleurs": [
   {
    "centre": "0,2",
    "petales": [
     "1,1",
     "1,2",
     "0,3",
     "-1,3",
     "-1,2",
     "0,1"
    ],
    "mot": "TRENTE",
    "def": "Le nombre 30, en toutes lettres.",
    "maths": true,
    "depart": 1,
    "couleur": "claire"
   },
   {
    "centre": "0,4",
    "petales": [
     "1,3",
     "1,4",
     "0,5",
     "-1,5",
     "-1,4",
     "0,3"
    ],
    "mot": "VERRES",
    "def": "On y boit, au pluriel.",
    "maths": false,
    "depart": 2,
    "couleur": "moyenne"
   },
   {
    "centre": "2,4",
    "petales": [
     "3,3",
     "3,4",
     "2,5",
     "1,5",
     "1,4",
     "2,3"
    ],
    "mot": "ECOLES",
    "def": "On y apprend, au pluriel.",
    "maths": false,
    "depart": 5,
    "couleur": "foncee"
   },
   {
    "centre": "4,6",
    "petales": [
     "5,5",
     "5,6",
     "4,7",
     "3,7",
     "3,6",
     "4,5"
    ],
    "mot": "ENTIER",
    "def": "Un nombre sans virgule : 0, 1, 2, 3…",
    "maths": true,
    "depart": 0,
    "couleur": "claire"
   },
   {
    "centre": "-2,8",
    "petales": [
     "-1,7",
     "-1,8",
     "-2,9",
     "-3,9",
     "-3,8",
     "-2,7"
    ],
    "mot": "LAPINS",
    "def": "Ils ont de longues oreilles, au pluriel.",
    "maths": false,
    "depart": 2,
    "couleur": "moyenne"
   },
   {
    "centre": "0,8",
    "petales": [
     "1,7",
     "1,8",
     "0,9",
     "-1,9",
     "-1,8",
     "0,7"
    ],
    "mot": "CLASSE",
    "def": "Le groupe d'élèves, ou la salle où ils sont.",
    "maths": false,
    "depart": 0,
    "couleur": "foncee"
   }
  ],
  "signature": "CLASSE ECOLES ENTIER LAPINS TRENTE VERRES"
 },
 {
  "id": "jardin-12",
  "cases": [
   "0,0",
   "1,0",
   "2,0",
   "3,0",
   "4,0",
   "5,0",
   "6,0",
   "0,1",
   "1,1",
   "2,1",
   "3,1",
   "4,1",
   "5,1",
   "6,1",
   "7,1",
   "-1,2",
   "0,2",
   "1,2",
   "2,2",
   "3,2",
   "4,2",
   "5,2",
   "6,2",
   "7,2",
   "-1,3",
   "0,3",
   "1,3",
   "2,3",
   "3,3",
   "4,3",
   "5,3",
   "6,3",
   "-2,4",
   "-1,4",
   "0,4",
   "1,4",
   "2,4",
   "3,4",
   "4,4",
   "5,4",
   "6,4",
   "-2,5",
   "-1,5",
   "0,5",
   "1,5",
   "2,5",
   "3,5",
   "4,5",
   "5,5",
   "-3,6",
   "-2,6",
   "-1,6",
   "0,6",
   "1,6",
   "2,6",
   "3,6",
   "4,6",
   "5,6",
   "-3,7",
   "-2,7",
   "-1,7",
   "0,7",
   "1,7",
   "2,7",
   "3,7",
   "4,7",
   "-4,8",
   "-3,8",
   "-2,8",
   "-1,8",
   "0,8",
   "1,8",
   "2,8",
   "3,8",
   "4,8",
   "-4,9",
   "-3,9",
   "-2,9",
   "-1,9",
   "0,9",
   "1,9",
   "2,9",
   "3,9",
   "-5,10",
   "-4,10",
   "-3,10",
   "-2,10",
   "-1,10",
   "0,10",
   "1,10"
  ],
  "rangees": [
   {
    "cles": [
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0",
     "6,0"
    ],
    "reponses": [
     {
      "mot": "LOSANGE",
      "def": "Quatre côtés de même longueur, sans angle droit obligatoire."
     }
    ]
   },
   {
    "cles": [
     "0,1",
     "1,1",
     "2,1",
     "3,1",
     "4,1",
     "5,1",
     "6,1",
     "7,1"
    ],
    "reponses": [
     {
      "mot": "AGE",
      "def": "Ce qu'on fête chaque année."
     },
     {
      "mot": "DUREE",
      "def": "Le temps écoulé entre deux instants."
     }
    ]
   },
   {
    "cles": [
     "-1,2",
     "0,2",
     "1,2",
     "2,2",
     "3,2",
     "4,2",
     "5,2",
     "6,2",
     "7,2"
    ],
    "reponses": [
     {
      "mot": "BALLON",
      "def": "On le shoote au football."
     },
     {
      "mot": "RAT",
      "def": "Le rongeur gris des égouts."
     }
    ]
   },
   {
    "cles": [
     "-1,3",
     "0,3",
     "1,3",
     "2,3",
     "3,3",
     "4,3",
     "5,3",
     "6,3"
    ],
    "reponses": [
     {
      "mot": "DEBUT",
      "def": "Le contraire de la fin."
     },
     {
      "mot": "ERE",
      "def": "Une très longue période de l'histoire."
     }
    ]
   },
   {
    "cles": [
     "-2,4",
     "-1,4",
     "0,4",
     "1,4",
     "2,4",
     "3,4",
     "4,4",
     "5,4",
     "6,4"
    ],
    "reponses": [
     {
      "mot": "SAMEDI",
      "def": "Le jour avant dimanche."
     },
     {
      "mot": "EPI",
      "def": "La tige où poussent les grains du blé."
     }
    ]
   },
   {
    "cles": [
     "-2,5",
     "-1,5",
     "0,5",
     "1,5",
     "2,5",
     "3,5",
     "4,5",
     "5,5"
    ],
    "reponses": [
     {
      "mot": "COURT",
      "def": "Le contraire de long."
     },
     {
      "mot": "PAS",
      "def": "Ce qu'on fait en marchant."
     }
    ]
   },
   {
    "cles": [
     "-3,6",
     "-2,6",
     "-1,6",
     "0,6",
     "1,6",
     "2,6",
     "3,6",
     "4,6",
     "5,6"
    ],
    "reponses": [
     {
      "mot": "CAMP",
      "def": "On y plante les tentes."
     },
     {
      "mot": "ECOLE",
      "def": "On y apprend à lire et à compter."
     }
    ]
   },
   {
    "cles": [
     "-3,7",
     "-2,7",
     "-1,7",
     "0,7",
     "1,7",
     "2,7",
     "3,7",
     "4,7"
    ],
    "reponses": [
     {
      "mot": "VENT",
      "def": "L'air qui se déplace."
     },
     {
      "mot": "LUNE",
      "def": "Elle tourne autour de la Terre."
     }
    ]
   },
   {
    "cles": [
     "-4,8",
     "-3,8",
     "-2,8",
     "-1,8",
     "0,8",
     "1,8",
     "2,8",
     "3,8",
     "4,8"
    ],
    "reponses": [
     {
      "mot": "ARETE",
      "def": "Le segment où deux faces d'un solide se rencontrent."
     },
     {
      "mot": "AMIE",
      "def": "Celle qu'on est content de voir."
     }
    ]
   },
   {
    "cles": [
     "-4,9",
     "-3,9",
     "-2,9",
     "-1,9",
     "0,9",
     "1,9",
     "2,9",
     "3,9"
    ],
    "reponses": [
     {
      "mot": "ETE",
      "def": "La saison des vacances."
     },
     {
      "mot": "ELEVE",
      "def": "Celui qui apprend, assis à sa table."
     }
    ]
   },
   {
    "cles": [
     "-5,10",
     "-4,10",
     "-3,10",
     "-2,10",
     "-1,10",
     "0,10",
     "1,10"
    ],
    "reponses": [
     {
      "mot": "BON",
      "def": "Le contraire de mauvais."
     },
     {
      "mot": "IDEE",
      "def": "Ce qui vient à l'esprit quand on réfléchit."
     }
    ]
   }
  ],
  "fleurs": [
   {
    "centre": "2,8",
    "petales": [
     "3,7",
     "3,8",
     "2,9",
     "1,9",
     "1,8",
     "2,7"
    ],
    "mot": "NIVEAU",
    "def": "La hauteur à laquelle une chose se trouve.",
    "maths": false,
    "depart": 0,
    "couleur": "claire"
   },
   {
    "centre": "2,2",
    "petales": [
     "3,1",
     "3,2",
     "2,3",
     "1,3",
     "1,2",
     "2,1"
    ],
    "mot": "DOUBLE",
    "def": "Deux fois plus.",
    "maths": true,
    "depart": 0,
    "couleur": "moyenne"
   },
   {
    "centre": "4,2",
    "petales": [
     "5,1",
     "5,2",
     "4,3",
     "3,3",
     "3,2",
     "4,1"
    ],
    "mot": "RETOUR",
    "def": "Le chemin du soir, après l'aller.",
    "maths": false,
    "depart": 1,
    "couleur": "foncee"
   },
   {
    "centre": "2,6",
    "petales": [
     "3,5",
     "3,6",
     "2,7",
     "1,7",
     "1,6",
     "2,5"
    ],
    "mot": "POULET",
    "def": "Le jeune coq qu'on fait rôtir.",
    "maths": false,
    "depart": 0,
    "couleur": "claire"
   },
   {
    "centre": "-2,8",
    "petales": [
     "-1,7",
     "-1,8",
     "-2,9",
     "-3,9",
     "-3,8",
     "-2,7"
    ],
    "mot": "TRENTE",
    "def": "Le nombre 30, en toutes lettres.",
    "maths": true,
    "depart": 3,
    "couleur": "moyenne"
   },
   {
    "centre": "4,4",
    "petales": [
     "5,3",
     "5,4",
     "4,5",
     "3,5",
     "3,4",
     "4,3"
    ],
    "mot": "PAPIER",
    "def": "On y écrit, il vient du bois.",
    "maths": false,
    "depart": 1,
    "couleur": "foncee"
   }
  ],
  "signature": "DOUBLE NIVEAU PAPIER POULET RETOUR TRENTE"
 },
 {
  "id": "jardin-13",
  "cases": [
   "0,0",
   "1,0",
   "2,0",
   "3,0",
   "4,0",
   "5,0",
   "6,0",
   "0,1",
   "1,1",
   "2,1",
   "3,1",
   "4,1",
   "5,1",
   "6,1",
   "7,1",
   "-1,2",
   "0,2",
   "1,2",
   "2,2",
   "3,2",
   "4,2",
   "5,2",
   "6,2",
   "7,2",
   "-1,3",
   "0,3",
   "1,3",
   "2,3",
   "3,3",
   "4,3",
   "5,3",
   "6,3",
   "-2,4",
   "-1,4",
   "0,4",
   "1,4",
   "2,4",
   "3,4",
   "4,4",
   "5,4",
   "6,4",
   "-2,5",
   "-1,5",
   "0,5",
   "1,5",
   "2,5",
   "3,5",
   "4,5",
   "5,5",
   "-3,6",
   "-2,6",
   "-1,6",
   "0,6",
   "1,6",
   "2,6",
   "3,6",
   "4,6",
   "5,6",
   "-3,7",
   "-2,7",
   "-1,7",
   "0,7",
   "1,7",
   "2,7",
   "3,7",
   "4,7",
   "-4,8",
   "-3,8",
   "-2,8",
   "-1,8",
   "0,8",
   "1,8",
   "2,8",
   "3,8",
   "4,8",
   "-4,9",
   "-3,9",
   "-2,9",
   "-1,9",
   "0,9",
   "1,9",
   "2,9",
   "3,9",
   "-5,10",
   "-4,10",
   "-3,10",
   "-2,10",
   "-1,10",
   "0,10",
   "1,10"
  ],
  "rangees": [
   {
    "cles": [
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0",
     "6,0"
    ],
    "reponses": [
     {
      "mot": "COUR",
      "def": "On y joue pendant la récréation."
     },
     {
      "mot": "FIL",
      "def": "On le passe dans le chas de l'aiguille."
     }
    ]
   },
   {
    "cles": [
     "0,1",
     "1,1",
     "2,1",
     "3,1",
     "4,1",
     "5,1",
     "6,1",
     "7,1"
    ],
    "reponses": [
     {
      "mot": "ALTERNES",
      "def": "De part et d'autre de la sécante, et de deux droites différentes."
     }
    ]
   },
   {
    "cles": [
     "-1,2",
     "0,2",
     "1,2",
     "2,2",
     "3,2",
     "4,2",
     "5,2",
     "6,2",
     "7,2"
    ],
    "reponses": [
     {
      "mot": "CYCLE",
      "def": "Ce qui revient toujours au même point."
     },
     {
      "mot": "CAMP",
      "def": "On y plante les tentes."
     }
    ]
   },
   {
    "cles": [
     "-1,3",
     "0,3",
     "1,3",
     "2,3",
     "3,3",
     "4,3",
     "5,3",
     "6,3"
    ],
    "reponses": [
     {
      "mot": "LUNE",
      "def": "Elle tourne autour de la Terre."
     },
     {
      "mot": "ABRI",
      "def": "L'endroit où l'on se met quand il pleut."
     }
    ]
   },
   {
    "cles": [
     "-2,4",
     "-1,4",
     "0,4",
     "1,4",
     "2,4",
     "3,4",
     "4,4",
     "5,4",
     "6,4"
    ],
    "reponses": [
     {
      "mot": "PARIS",
      "def": "La capitale de la France."
     },
     {
      "mot": "MIEL",
      "def": "Le sucré que font les abeilles."
     }
    ]
   },
   {
    "cles": [
     "-2,5",
     "-1,5",
     "0,5",
     "1,5",
     "2,5",
     "3,5",
     "4,5",
     "5,5"
    ],
    "reponses": [
     {
      "mot": "SEVE",
      "def": "Le liquide qui monte dans l'arbre au printemps."
     },
     {
      "mot": "MONT",
      "def": "Un relief élevé, que l'on gravit."
     }
    ]
   },
   {
    "cles": [
     "-3,6",
     "-2,6",
     "-1,6",
     "0,6",
     "1,6",
     "2,6",
     "3,6",
     "4,6",
     "5,6"
    ],
    "reponses": [
     {
      "mot": "DUC",
      "def": "Un seigneur, juste en dessous du prince."
     },
     {
      "mot": "SOLEIL",
      "def": "Il se lève à l'est et chauffe la journée."
     }
    ]
   },
   {
    "cles": [
     "-3,7",
     "-2,7",
     "-1,7",
     "0,7",
     "1,7",
     "2,7",
     "3,7",
     "4,7"
    ],
    "reponses": [
     {
      "mot": "NOTE",
      "def": "Le chiffre du devoir, ou le son de la musique."
     },
     {
      "mot": "DOUX",
      "def": "Agréable à toucher."
     }
    ]
   },
   {
    "cles": [
     "-4,8",
     "-3,8",
     "-2,8",
     "-1,8",
     "0,8",
     "1,8",
     "2,8",
     "3,8",
     "4,8"
    ],
    "reponses": [
     {
      "mot": "SORT",
      "def": "Ce que le destin réserve."
     },
     {
      "mot": "ARETE",
      "def": "Le segment où deux faces d'un solide se rencontrent."
     }
    ]
   },
   {
    "cles": [
     "-4,9",
     "-3,9",
     "-2,9",
     "-1,9",
     "0,9",
     "1,9",
     "2,9",
     "3,9"
    ],
    "reponses": [
     {
      "mot": "RADIO",
      "def": "On l'écoute, elle ne se regarde pas."
     },
     {
      "mot": "SEL",
      "def": "Le blanc qui sale la soupe."
     }
    ]
   },
   {
    "cles": [
     "-5,10",
     "-4,10",
     "-3,10",
     "-2,10",
     "-1,10",
     "0,10",
     "1,10"
    ],
    "reponses": [
     {
      "mot": "FAIM",
      "def": "Ce qu'on a quand on veut manger."
     },
     {
      "mot": "SUD",
      "def": "Le contraire du nord."
     }
    ]
   }
  ],
  "fleurs": [
   {
    "centre": "4,4",
    "petales": [
     "5,3",
     "5,4",
     "4,5",
     "3,5",
     "3,4",
     "4,3"
    ],
    "mot": "NOMBRE",
    "def": "Ce qui dit une quantité.",
    "maths": true,
    "depart": 2,
    "couleur": "claire"
   },
   {
    "centre": "2,8",
    "petales": [
     "3,7",
     "3,8",
     "2,9",
     "1,9",
     "1,8",
     "2,7"
    ],
    "mot": "ROUTES",
    "def": "Les voitures y roulent, au pluriel.",
    "maths": false,
    "depart": 4,
    "couleur": "moyenne"
   },
   {
    "centre": "0,4",
    "petales": [
     "1,3",
     "1,4",
     "0,5",
     "-1,5",
     "-1,4",
     "0,3"
    ],
    "mot": "NIVEAU",
    "def": "La hauteur à laquelle une chose se trouve.",
    "maths": false,
    "depart": 0,
    "couleur": "foncee"
   },
   {
    "centre": "0,2",
    "petales": [
     "1,1",
     "1,2",
     "0,3",
     "-1,3",
     "-1,2",
     "0,1"
    ],
    "mot": "CALCUL",
    "def": "Ce qu'on fait avec des nombres pour trouver un résultat.",
    "maths": true,
    "depart": 4,
    "couleur": "claire"
   },
   {
    "centre": "0,8",
    "petales": [
     "1,7",
     "1,8",
     "0,9",
     "-1,9",
     "-1,8",
     "0,7"
    ],
    "mot": "DROITE",
    "def": "Illimitée des deux côtés, elle n'a ni début ni fin.",
    "maths": true,
    "depart": 0,
    "couleur": "moyenne"
   },
   {
    "centre": "-2,6",
    "petales": [
     "-1,5",
     "-1,6",
     "-2,7",
     "-3,7",
     "-3,6",
     "-2,5"
    ],
    "mot": "SECOND",
    "def": "Celui qui suit le premier.",
    "maths": false,
    "depart": 5,
    "couleur": "foncee"
   }
  ],
  "signature": "CALCUL DROITE NIVEAU NOMBRE ROUTES SECOND"
 },
 {
  "id": "jardin-14",
  "cases": [
   "0,0",
   "1,0",
   "2,0",
   "3,0",
   "4,0",
   "5,0",
   "6,0",
   "0,1",
   "1,1",
   "2,1",
   "3,1",
   "4,1",
   "5,1",
   "6,1",
   "7,1",
   "-1,2",
   "0,2",
   "1,2",
   "2,2",
   "3,2",
   "4,2",
   "5,2",
   "6,2",
   "7,2",
   "-1,3",
   "0,3",
   "1,3",
   "2,3",
   "3,3",
   "4,3",
   "5,3",
   "6,3",
   "-2,4",
   "-1,4",
   "0,4",
   "1,4",
   "2,4",
   "3,4",
   "4,4",
   "5,4",
   "6,4",
   "-2,5",
   "-1,5",
   "0,5",
   "1,5",
   "2,5",
   "3,5",
   "4,5",
   "5,5",
   "-3,6",
   "-2,6",
   "-1,6",
   "0,6",
   "1,6",
   "2,6",
   "3,6",
   "4,6",
   "5,6",
   "-3,7",
   "-2,7",
   "-1,7",
   "0,7",
   "1,7",
   "2,7",
   "3,7",
   "4,7",
   "-4,8",
   "-3,8",
   "-2,8",
   "-1,8",
   "0,8",
   "1,8",
   "2,8",
   "3,8",
   "4,8",
   "-4,9",
   "-3,9",
   "-2,9",
   "-1,9",
   "0,9",
   "1,9",
   "2,9",
   "3,9",
   "-5,10",
   "-4,10",
   "-3,10",
   "-2,10",
   "-1,10",
   "0,10",
   "1,10"
  ],
  "rangees": [
   {
    "cles": [
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0",
     "6,0"
    ],
    "reponses": [
     {
      "mot": "ROBE",
      "def": "Le vêtement d'une seule pièce."
     },
     {
      "mot": "VIN",
      "def": "La boisson tirée du raisin."
     }
    ]
   },
   {
    "cles": [
     "0,1",
     "1,1",
     "2,1",
     "3,1",
     "4,1",
     "5,1",
     "6,1",
     "7,1"
    ],
    "reponses": [
     {
      "mot": "CAVE",
      "def": "La pièce sous la maison."
     },
     {
      "mot": "TRAC",
      "def": "La peur juste avant de monter sur scène."
     }
    ]
   },
   {
    "cles": [
     "-1,2",
     "0,2",
     "1,2",
     "2,2",
     "3,2",
     "4,2",
     "5,2",
     "6,2",
     "7,2"
    ],
    "reponses": [
     {
      "mot": "ANIMAL",
      "def": "Le chien, le chat et l'oiseau en sont."
     },
     {
      "mot": "ROI",
      "def": "Il porte une couronne."
     }
    ]
   },
   {
    "cles": [
     "-1,3",
     "0,3",
     "1,3",
     "2,3",
     "3,3",
     "4,3",
     "5,3",
     "6,3"
    ],
    "reponses": [
     {
      "mot": "MENU",
      "def": "La liste des plats — ou tout petit."
     },
     {
      "mot": "BIEN",
      "def": "Le contraire du mal."
     }
    ]
   },
   {
    "cles": [
     "-2,4",
     "-1,4",
     "0,4",
     "1,4",
     "2,4",
     "3,4",
     "4,4",
     "5,4",
     "6,4"
    ],
    "reponses": [
     {
      "mot": "ECHO",
      "def": "La voix que la montagne renvoie."
     },
     {
      "mot": "BLANC",
      "def": "La couleur de la neige."
     }
    ]
   },
   {
    "cles": [
     "-2,5",
     "-1,5",
     "0,5",
     "1,5",
     "2,5",
     "3,5",
     "4,5",
     "5,5"
    ],
    "reponses": [
     {
      "mot": "BANDE",
      "def": "Une longue étroite — ou un groupe de copains."
     },
     {
      "mot": "PIN",
      "def": "L'arbre à aiguilles et à pommes."
     }
    ]
   },
   {
    "cles": [
     "-3,6",
     "-2,6",
     "-1,6",
     "0,6",
     "1,6",
     "2,6",
     "3,6",
     "4,6",
     "5,6"
    ],
    "reponses": [
     {
      "mot": "CLASSE",
      "def": "Le groupe d'élèves, ou la salle où ils sont."
     },
     {
      "mot": "SUD",
      "def": "Le contraire du nord."
     }
    ]
   },
   {
    "cles": [
     "-3,7",
     "-2,7",
     "-1,7",
     "0,7",
     "1,7",
     "2,7",
     "3,7",
     "4,7"
    ],
    "reponses": [
     {
      "mot": "FIN",
      "def": "Le dernier mot du livre."
     },
     {
      "mot": "CHOSE",
      "def": "N'importe quel objet dont on ne dit pas le nom."
     }
    ]
   },
   {
    "cles": [
     "-4,8",
     "-3,8",
     "-2,8",
     "-1,8",
     "0,8",
     "1,8",
     "2,8",
     "3,8",
     "4,8"
    ],
    "reponses": [
     {
      "mot": "AMOUR",
      "def": "Le sentiment qui attache deux êtres."
     },
     {
      "mot": "PIED",
      "def": "Il est au bout de la jambe."
     }
    ]
   },
   {
    "cles": [
     "-4,9",
     "-3,9",
     "-2,9",
     "-1,9",
     "0,9",
     "1,9",
     "2,9",
     "3,9"
    ],
    "reponses": [
     {
      "mot": "PETIT",
      "def": "Le contraire de grand."
     },
     {
      "mot": "POT",
      "def": "On y met la confiture."
     }
    ]
   },
   {
    "cles": [
     "-5,10",
     "-4,10",
     "-3,10",
     "-2,10",
     "-1,10",
     "0,10",
     "1,10"
    ],
    "reponses": [
     {
      "mot": "PERE",
      "def": "Il a des enfants."
     },
     {
      "mot": "DUR",
      "def": "Le contraire de mou."
     }
    ]
   }
  ],
  "fleurs": [
   {
    "centre": "2,2",
    "petales": [
     "3,1",
     "3,2",
     "2,3",
     "1,3",
     "1,2",
     "2,1"
    ],
    "mot": "NIVEAU",
    "def": "La hauteur à laquelle une chose se trouve.",
    "maths": false,
    "depart": 3,
    "couleur": "claire"
   },
   {
    "centre": "-2,8",
    "petales": [
     "-1,7",
     "-1,8",
     "-2,9",
     "-3,9",
     "-3,8",
     "-2,7"
    ],
    "mot": "MINUTE",
    "def": "Soixante secondes.",
    "maths": true,
    "depart": 4,
    "couleur": "moyenne"
   },
   {
    "centre": "2,8",
    "petales": [
     "3,7",
     "3,8",
     "2,9",
     "1,9",
     "1,8",
     "2,7"
    ],
    "mot": "OPPOSE",
    "def": "Même distance à zéro, de l'autre côté : −5 et 5.",
    "maths": true,
    "depart": 2,
    "couleur": "foncee"
   },
   {
    "centre": "6,2",
    "petales": [
     "7,1",
     "7,2",
     "6,3",
     "5,3",
     "5,2",
     "6,1"
    ],
    "mot": "RACINE",
    "def": "L'opération qui revient du carré à la longueur.",
    "maths": true,
    "depart": 4,
    "couleur": "claire"
   },
   {
    "centre": "4,6",
    "petales": [
     "5,5",
     "5,6",
     "4,7",
     "3,7",
     "3,6",
     "4,5"
    ],
    "mot": "DESSIN",
    "def": "Ce qu'on trace au crayon sur la feuille.",
    "maths": false,
    "depart": 1,
    "couleur": "moyenne"
   },
   {
    "centre": "2,4",
    "petales": [
     "3,3",
     "3,4",
     "2,5",
     "1,5",
     "1,4",
     "2,3"
    ],
    "mot": "DOUBLE",
    "def": "Deux fois plus.",
    "maths": true,
    "depart": 3,
    "couleur": "foncee"
   }
  ],
  "signature": "DESSIN DOUBLE MINUTE NIVEAU OPPOSE RACINE"
 },
 {
  "id": "jardin-15",
  "cases": [
   "0,0",
   "1,0",
   "2,0",
   "3,0",
   "4,0",
   "5,0",
   "6,0",
   "0,1",
   "1,1",
   "2,1",
   "3,1",
   "4,1",
   "5,1",
   "6,1",
   "7,1",
   "-1,2",
   "0,2",
   "1,2",
   "2,2",
   "3,2",
   "4,2",
   "5,2",
   "6,2",
   "7,2",
   "-1,3",
   "0,3",
   "1,3",
   "2,3",
   "3,3",
   "4,3",
   "5,3",
   "6,3",
   "-2,4",
   "-1,4",
   "0,4",
   "1,4",
   "2,4",
   "3,4",
   "4,4",
   "5,4",
   "6,4",
   "-2,5",
   "-1,5",
   "0,5",
   "1,5",
   "2,5",
   "3,5",
   "4,5",
   "5,5",
   "-3,6",
   "-2,6",
   "-1,6",
   "0,6",
   "1,6",
   "2,6",
   "3,6",
   "4,6",
   "5,6",
   "-3,7",
   "-2,7",
   "-1,7",
   "0,7",
   "1,7",
   "2,7",
   "3,7",
   "4,7",
   "-4,8",
   "-3,8",
   "-2,8",
   "-1,8",
   "0,8",
   "1,8",
   "2,8",
   "3,8",
   "4,8",
   "-4,9",
   "-3,9",
   "-2,9",
   "-1,9",
   "0,9",
   "1,9",
   "2,9",
   "3,9",
   "-5,10",
   "-4,10",
   "-3,10",
   "-2,10",
   "-1,10",
   "0,10",
   "1,10"
  ],
  "rangees": [
   {
    "cles": [
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0",
     "6,0"
    ],
    "reponses": [
     {
      "mot": "VILLAGE",
      "def": "Un groupe de maisons, plus petit qu'une ville."
     }
    ]
   },
   {
    "cles": [
     "0,1",
     "1,1",
     "2,1",
     "3,1",
     "4,1",
     "5,1",
     "6,1",
     "7,1"
    ],
    "reponses": [
     {
      "mot": "TETE",
      "def": "Elle porte les yeux et les oreilles."
     },
     {
      "mot": "LENT",
      "def": "Qui met du temps."
     }
    ]
   },
   {
    "cles": [
     "-1,2",
     "0,2",
     "1,2",
     "2,2",
     "3,2",
     "4,2",
     "5,2",
     "6,2",
     "7,2"
    ],
    "reponses": [
     {
      "mot": "SORTIR",
      "def": "Quitter la maison."
     },
     {
      "mot": "EPI",
      "def": "La tige où poussent les grains du blé."
     }
    ]
   },
   {
    "cles": [
     "-1,3",
     "0,3",
     "1,3",
     "2,3",
     "3,3",
     "4,3",
     "5,3",
     "6,3"
    ],
    "reponses": [
     {
      "mot": "ERE",
      "def": "Une très longue période de l'histoire."
     },
     {
      "mot": "VOTRE",
      "def": "Ce qui appartient à vous."
     }
    ]
   },
   {
    "cles": [
     "-2,4",
     "-1,4",
     "0,4",
     "1,4",
     "2,4",
     "3,4",
     "4,4",
     "5,4",
     "6,4"
    ],
    "reponses": [
     {
      "mot": "POIL",
      "def": "Le chat en est couvert."
     },
     {
      "mot": "ANNEE",
      "def": "Douze mois d'affilée."
     }
    ]
   },
   {
    "cles": [
     "-2,5",
     "-1,5",
     "0,5",
     "1,5",
     "2,5",
     "3,5",
     "4,5",
     "5,5"
    ],
    "reponses": [
     {
      "mot": "VUE",
      "def": "Le sens de l'œil."
     },
     {
      "mot": "PIECE",
      "def": "La monnaie ronde, ou la salle de la maison."
     }
    ]
   },
   {
    "cles": [
     "-3,6",
     "-2,6",
     "-1,6",
     "0,6",
     "1,6",
     "2,6",
     "3,6",
     "4,6",
     "5,6"
    ],
    "reponses": [
     {
      "mot": "PONTS",
      "def": "Ils enjambent les rivières."
     },
     {
      "mot": "VOIX",
      "def": "Elle sort de la bouche quand on parle."
     }
    ]
   },
   {
    "cles": [
     "-3,7",
     "-2,7",
     "-1,7",
     "0,7",
     "1,7",
     "2,7",
     "3,7",
     "4,7"
    ],
    "reponses": [
     {
      "mot": "POMME",
      "def": "Le fruit rond du verger."
     },
     {
      "mot": "ETE",
      "def": "La saison des vacances."
     }
    ]
   },
   {
    "cles": [
     "-4,8",
     "-3,8",
     "-2,8",
     "-1,8",
     "0,8",
     "1,8",
     "2,8",
     "3,8",
     "4,8"
    ],
    "reponses": [
     {
      "mot": "CHAMP",
      "def": "Le terrain que cultive le paysan."
     },
     {
      "mot": "TARD",
      "def": "Le contraire de tôt."
     }
    ]
   },
   {
    "cles": [
     "-4,9",
     "-3,9",
     "-2,9",
     "-1,9",
     "0,9",
     "1,9",
     "2,9",
     "3,9"
    ],
    "reponses": [
     {
      "mot": "REPOS",
      "def": "Ce qu'on prend quand on est fatigué."
     },
     {
      "mot": "NEZ",
      "def": "Il sert à sentir."
     }
    ]
   },
   {
    "cles": [
     "-5,10",
     "-4,10",
     "-3,10",
     "-2,10",
     "-1,10",
     "0,10",
     "1,10"
    ],
    "reponses": [
     {
      "mot": "YEUX",
      "def": "On s'en sert pour voir."
     },
     {
      "mot": "VOL",
      "def": "Ce que fait l'oiseau dans le ciel."
     }
    ]
   }
  ],
  "fleurs": [
   {
    "centre": "6,2",
    "petales": [
     "7,1",
     "7,2",
     "6,3",
     "5,3",
     "5,2",
     "6,1"
    ],
    "mot": "ENTIER",
    "def": "Un nombre sans virgule : 0, 1, 2, 3…",
    "maths": true,
    "depart": 4,
    "couleur": "claire"
   },
   {
    "centre": "2,8",
    "petales": [
     "3,7",
     "3,8",
     "2,9",
     "1,9",
     "1,8",
     "2,7"
    ],
    "mot": "TRENTE",
    "def": "Le nombre 30, en toutes lettres.",
    "maths": true,
    "depart": 0,
    "couleur": "moyenne"
   },
   {
    "centre": "0,2",
    "petales": [
     "1,1",
     "1,2",
     "0,3",
     "-1,3",
     "-1,2",
     "0,1"
    ],
    "mot": "RESTER",
    "def": "Ne pas bouger de l'endroit où l'on est.",
    "maths": false,
    "depart": 2,
    "couleur": "foncee"
   },
   {
    "centre": "0,8",
    "petales": [
     "1,7",
     "1,8",
     "0,9",
     "-1,9",
     "-1,8",
     "0,7"
    ],
    "mot": "SOMMET",
    "def": "Le point où deux côtés se rejoignent.",
    "maths": true,
    "depart": 2,
    "couleur": "claire"
   },
   {
    "centre": "4,2",
    "petales": [
     "5,1",
     "5,2",
     "4,3",
     "3,3",
     "3,2",
     "4,1"
    ],
    "mot": "ETOILE",
    "def": "Elle brille la nuit, très loin.",
    "maths": false,
    "depart": 1,
    "couleur": "moyenne"
   },
   {
    "centre": "4,4",
    "petales": [
     "5,3",
     "5,4",
     "4,5",
     "3,5",
     "3,4",
     "4,3"
    ],
    "mot": "CENTRE",
    "def": "Le point du milieu, à égale distance de tout le bord.",
    "maths": true,
    "depart": 2,
    "couleur": "foncee"
   }
  ],
  "signature": "CENTRE ENTIER ETOILE RESTER SOMMET TRENTE"
 },
 {
  "id": "jardin-16",
  "cases": [
   "0,0",
   "1,0",
   "2,0",
   "3,0",
   "4,0",
   "5,0",
   "6,0",
   "0,1",
   "1,1",
   "2,1",
   "3,1",
   "4,1",
   "5,1",
   "6,1",
   "7,1",
   "-1,2",
   "0,2",
   "1,2",
   "2,2",
   "3,2",
   "4,2",
   "5,2",
   "6,2",
   "7,2",
   "-1,3",
   "0,3",
   "1,3",
   "2,3",
   "3,3",
   "4,3",
   "5,3",
   "6,3",
   "-2,4",
   "-1,4",
   "0,4",
   "1,4",
   "2,4",
   "3,4",
   "4,4",
   "5,4",
   "6,4",
   "-2,5",
   "-1,5",
   "0,5",
   "1,5",
   "2,5",
   "3,5",
   "4,5",
   "5,5",
   "-3,6",
   "-2,6",
   "-1,6",
   "0,6",
   "1,6",
   "2,6",
   "3,6",
   "4,6",
   "5,6",
   "-3,7",
   "-2,7",
   "-1,7",
   "0,7",
   "1,7",
   "2,7",
   "3,7",
   "4,7",
   "-4,8",
   "-3,8",
   "-2,8",
   "-1,8",
   "0,8",
   "1,8",
   "2,8",
   "3,8",
   "4,8",
   "-4,9",
   "-3,9",
   "-2,9",
   "-1,9",
   "0,9",
   "1,9",
   "2,9",
   "3,9",
   "-5,10",
   "-4,10",
   "-3,10",
   "-2,10",
   "-1,10",
   "0,10",
   "1,10"
  ],
  "rangees": [
   {
    "cles": [
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0",
     "6,0"
    ],
    "reponses": [
     {
      "mot": "DES",
      "def": "On les lance pour avancer au jeu de l'oie."
     },
     {
      "mot": "CIEL",
      "def": "Ce qu'on voit en levant la tête dehors."
     }
    ]
   },
   {
    "cles": [
     "0,1",
     "1,1",
     "2,1",
     "3,1",
     "4,1",
     "5,1",
     "6,1",
     "7,1"
    ],
    "reponses": [
     {
      "mot": "COUP",
      "def": "Ce qu'on donne avec le poing."
     },
     {
      "mot": "LENT",
      "def": "Qui met du temps."
     }
    ]
   },
   {
    "cles": [
     "-1,2",
     "0,2",
     "1,2",
     "2,2",
     "3,2",
     "4,2",
     "5,2",
     "6,2",
     "7,2"
    ],
    "reponses": [
     {
      "mot": "VOISIN",
      "def": "Celui qui habite juste à côté."
     },
     {
      "mot": "EPI",
      "def": "La tige où poussent les grains du blé."
     }
    ]
   },
   {
    "cles": [
     "-1,3",
     "0,3",
     "1,3",
     "2,3",
     "3,3",
     "4,3",
     "5,3",
     "6,3"
    ],
    "reponses": [
     {
      "mot": "PIC",
      "def": "Le sommet pointu d'une montagne."
     },
     {
      "mot": "VOTRE",
      "def": "Ce qui appartient à vous."
     }
    ]
   },
   {
    "cles": [
     "-2,4",
     "-1,4",
     "0,4",
     "1,4",
     "2,4",
     "3,4",
     "4,4",
     "5,4",
     "6,4"
    ],
    "reponses": [
     {
      "mot": "RECTANGLE",
      "def": "Quatre angles droits, les côtés opposés égaux."
     }
    ]
   },
   {
    "cles": [
     "-2,5",
     "-1,5",
     "0,5",
     "1,5",
     "2,5",
     "3,5",
     "4,5",
     "5,5"
    ],
    "reponses": [
     {
      "mot": "POCHE",
      "def": "On y glisse ses mains, dans le pantalon."
     },
     {
      "mot": "FOI",
      "def": "Ce qu'on a quand on croit sans preuve."
     }
    ]
   },
   {
    "cles": [
     "-3,6",
     "-2,6",
     "-1,6",
     "0,6",
     "1,6",
     "2,6",
     "3,6",
     "4,6",
     "5,6"
    ],
    "reponses": [
     {
      "mot": "TAUX",
      "def": "Le nombre pour cent qu'on applique."
     },
     {
      "mot": "ECOLE",
      "def": "On y apprend à lire et à compter."
     }
    ]
   },
   {
    "cles": [
     "-3,7",
     "-2,7",
     "-1,7",
     "0,7",
     "1,7",
     "2,7",
     "3,7",
     "4,7"
    ],
    "reponses": [
     {
      "mot": "ELEVE",
      "def": "Celui qui apprend, assis à sa table."
     },
     {
      "mot": "CLE",
      "def": "Elle ouvre la porte."
     }
    ]
   },
   {
    "cles": [
     "-4,8",
     "-3,8",
     "-2,8",
     "-1,8",
     "0,8",
     "1,8",
     "2,8",
     "3,8",
     "4,8"
    ],
    "reponses": [
     {
      "mot": "PENSER",
      "def": "Se servir de sa tête."
     },
     {
      "mot": "SEL",
      "def": "Le blanc qui sale la soupe."
     }
    ]
   },
   {
    "cles": [
     "-4,9",
     "-3,9",
     "-2,9",
     "-1,9",
     "0,9",
     "1,9",
     "2,9",
     "3,9"
    ],
    "reponses": [
     {
      "mot": "ACIER",
      "def": "Le métal dur dont on fait les rails."
     },
     {
      "mot": "ECU",
      "def": "Le bouclier du chevalier."
     }
    ]
   },
   {
    "cles": [
     "-5,10",
     "-4,10",
     "-3,10",
     "-2,10",
     "-1,10",
     "0,10",
     "1,10"
    ],
    "reponses": [
     {
      "mot": "CLOU",
      "def": "On l'enfonce au marteau."
     },
     {
      "mot": "SOL",
      "def": "Ce sur quoi on marche — ou la note après fa."
     }
    ]
   }
  ],
  "fleurs": [
   {
    "centre": "0,6",
    "petales": [
     "1,5",
     "1,6",
     "0,7",
     "-1,7",
     "-1,6",
     "0,5"
    ],
    "mot": "CHEVEU",
    "def": "Il pousse sur la tête.",
    "maths": false,
    "depart": 5,
    "couleur": "claire"
   },
   {
    "centre": "2,8",
    "petales": [
     "3,7",
     "3,8",
     "2,9",
     "1,9",
     "1,8",
     "2,7"
    ],
    "mot": "CERCLE",
    "def": "Tous ses points sont à la même distance du centre.",
    "maths": true,
    "depart": 2,
    "couleur": "moyenne"
   },
   {
    "centre": "0,8",
    "petales": [
     "1,7",
     "1,8",
     "0,9",
     "-1,9",
     "-1,8",
     "0,7"
    ],
    "mot": "VERRES",
    "def": "On y boit, au pluriel.",
    "maths": false,
    "depart": 5,
    "couleur": "foncee"
   },
   {
    "centre": "6,2",
    "petales": [
     "7,1",
     "7,2",
     "6,3",
     "5,3",
     "5,2",
     "6,1"
    ],
    "mot": "ENTIER",
    "def": "Un nombre sans virgule : 0, 1, 2, 3…",
    "maths": true,
    "depart": 4,
    "couleur": "claire"
   },
   {
    "centre": "4,2",
    "petales": [
     "5,1",
     "5,2",
     "4,3",
     "3,3",
     "3,2",
     "4,1"
    ],
    "mot": "ETOILE",
    "def": "Elle brille la nuit, très loin.",
    "maths": false,
    "depart": 1,
    "couleur": "moyenne"
   },
   {
    "centre": "-2,6",
    "petales": [
     "-1,5",
     "-1,6",
     "-2,7",
     "-3,7",
     "-3,6",
     "-2,5"
    ],
    "mot": "POULET",
    "def": "Le jeune coq qu'on fait rôtir.",
    "maths": false,
    "depart": 5,
    "couleur": "foncee"
   }
  ],
  "signature": "CERCLE CHEVEU ENTIER ETOILE POULET VERRES"
 }
];
