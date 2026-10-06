// LES JARDINS, COMPOSÉS D'AVANCE.
//
// RÉMY : « j'adore le jeu rows garden qui était souvent sur world of puzzles,
// on pourrait le faire en français avec des mots de math ».
//
// CE FICHIER EST ENGENDRÉ — on ne le modifie pas à la main :
//
//     node tools/fabriquerJardins.mjs --forme=petit --combien=18 --ecrire
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
   "7,0",
   "8,0",
   "0,1",
   "1,1",
   "2,1",
   "3,1",
   "4,1",
   "5,1",
   "6,1",
   "7,1",
   "8,1",
   "9,1",
   "-1,2",
   "0,2",
   "1,2",
   "2,2",
   "3,2",
   "4,2",
   "5,2",
   "6,2",
   "7,2",
   "8,2",
   "9,2",
   "-1,3",
   "0,3",
   "1,3",
   "2,3",
   "3,3",
   "4,3",
   "5,3",
   "6,3",
   "7,3",
   "8,3",
   "9,3",
   "10,3",
   "-2,4",
   "-1,4",
   "0,4",
   "1,4",
   "2,4",
   "3,4",
   "4,4",
   "5,4",
   "6,4",
   "7,4",
   "8,4",
   "-2,5",
   "-1,5",
   "0,5",
   "1,5",
   "2,5",
   "3,5",
   "4,5",
   "5,5",
   "6,5",
   "7,5",
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
  "rangees": [
   {
    "cles": [
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0",
     "6,0",
     "7,0",
     "8,0"
    ],
    "reponses": [
     {
      "mot": "ARGENT",
      "def": "Le métal blanc — ou ce qu'on met dans son porte-monnaie."
     },
     {
      "mot": "COU",
      "def": "Entre la tête et les épaules."
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
     "7,1",
     "8,1",
     "9,1"
    ],
    "reponses": [
     {
      "mot": "ETAT",
      "def": "La situation dans laquelle une chose se trouve."
     },
     {
      "mot": "MOTEUR",
      "def": "Il fait tourner les roues de la voiture."
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
     "7,2",
     "8,2",
     "9,2"
    ],
    "reponses": [
     {
      "mot": "MUSEE",
      "def": "On y regarde les tableaux."
     },
     {
      "mot": "SIMPLE",
      "def": "Pas compliqué du tout."
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
     "6,3",
     "7,3",
     "8,3",
     "9,3",
     "10,3"
    ],
    "reponses": [
     {
      "mot": "MOI",
      "def": "Celui qui parle, quand il parle de lui."
     },
     {
      "mot": "LITTERALE",
      "def": "Se dit d'un calcul où des lettres remplacent des nombres."
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
     "6,4",
     "7,4",
     "8,4"
    ],
    "reponses": [
     {
      "mot": "ARC",
      "def": "On y tend une corde pour lancer une flèche."
     },
     {
      "mot": "RACONTER",
      "def": "Dire une histoire du début à la fin."
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
     "5,5",
     "6,5",
     "7,5"
    ],
    "reponses": [
     {
      "mot": "SIMPLIFIER",
      "def": "Écrire la même chose, en plus court."
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
      "mot": "MAL",
      "def": "Le contraire du bien."
     },
     {
      "mot": "DEVANT",
      "def": "Le contraire de derrière."
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
    "mot": "PETITE",
    "def": "De taille réduite, au féminin.",
    "maths": false,
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
    "mot": "MIROIR",
    "def": "On s'y voit tel qu'on est.",
    "maths": false,
    "depart": 2,
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
    "mot": "SOMMET",
    "def": "Le point où deux côtés se rejoignent.",
    "maths": true,
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
    "mot": "MOITIE",
    "def": "Deux fois moins.",
    "maths": true,
    "depart": 5,
    "couleur": "moyenne"
   }
  ],
  "signature": "MIROIR MOITIE PETITE SOMMET"
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
   "7,0",
   "8,0",
   "0,1",
   "1,1",
   "2,1",
   "3,1",
   "4,1",
   "5,1",
   "6,1",
   "7,1",
   "8,1",
   "9,1",
   "-1,2",
   "0,2",
   "1,2",
   "2,2",
   "3,2",
   "4,2",
   "5,2",
   "6,2",
   "7,2",
   "8,2",
   "9,2",
   "-1,3",
   "0,3",
   "1,3",
   "2,3",
   "3,3",
   "4,3",
   "5,3",
   "6,3",
   "7,3",
   "8,3",
   "9,3",
   "10,3",
   "-2,4",
   "-1,4",
   "0,4",
   "1,4",
   "2,4",
   "3,4",
   "4,4",
   "5,4",
   "6,4",
   "7,4",
   "8,4",
   "-2,5",
   "-1,5",
   "0,5",
   "1,5",
   "2,5",
   "3,5",
   "4,5",
   "5,5",
   "6,5",
   "7,5",
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
  "rangees": [
   {
    "cles": [
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0",
     "6,0",
     "7,0",
     "8,0"
    ],
    "reponses": [
     {
      "mot": "TRAC",
      "def": "La peur juste avant de monter sur scène."
     },
     {
      "mot": "VOTRE",
      "def": "Ce qui appartient à vous."
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
     "7,1",
     "8,1",
     "9,1"
    ],
    "reponses": [
     {
      "mot": "LEVIER",
      "def": "La barre qui aide à soulever."
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
     "7,2",
     "8,2",
     "9,2"
    ],
    "reponses": [
     {
      "mot": "CYCLE",
      "def": "Ce qui revient toujours au même point."
     },
     {
      "mot": "GROUPE",
      "def": "Plusieurs ensemble."
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
     "6,3",
     "7,3",
     "8,3",
     "9,3",
     "10,3"
    ],
    "reponses": [
     {
      "mot": "RETENUE",
      "def": "Le petit chiffre qu'on reporte sur la colonne d'à côté."
     },
     {
      "mot": "POCHE",
      "def": "On y glisse ses mains, dans le pantalon."
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
     "6,4",
     "7,4",
     "8,4"
    ],
    "reponses": [
     {
      "mot": "ETE",
      "def": "La saison des vacances."
     },
     {
      "mot": "RENTRANT",
      "def": "Mesure plus de cent quatre-vingts degrés : il rentre vers l'intérieur."
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
     "5,5",
     "6,5",
     "7,5"
    ],
    "reponses": [
     {
      "mot": "ANE",
      "def": "Il a de longues oreilles et porte des sacs."
     },
     {
      "mot": "REPONSE",
      "def": "Ce qu'on dit après la question."
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
      "mot": "FER",
      "def": "Le métal de l'aimant, et celui qui repasse."
     },
     {
      "mot": "FERMER",
      "def": "Le contraire d'ouvrir."
     }
    ]
   }
  ],
  "fleurs": [
   {
    "centre": "8,2",
    "petales": [
     "9,1",
     "9,2",
     "8,3",
     "7,3",
     "7,2",
     "8,1"
    ],
    "mot": "ECOUTE",
    "def": "Ce qu'on fait avec les oreilles, attentivement.",
    "maths": false,
    "depart": 1,
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
    "mot": "COUPER",
    "def": "Séparer en deux avec un ciseau.",
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
    "mot": "CERCLE",
    "def": "Tous ses points sont à la même distance du centre.",
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
    "mot": "TRENTE",
    "def": "Le nombre 30, en toutes lettres.",
    "maths": true,
    "depart": 0,
    "couleur": "moyenne"
   }
  ],
  "signature": "CERCLE COUPER ECOUTE TRENTE"
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
   "7,0",
   "8,0",
   "0,1",
   "1,1",
   "2,1",
   "3,1",
   "4,1",
   "5,1",
   "6,1",
   "7,1",
   "8,1",
   "9,1",
   "-1,2",
   "0,2",
   "1,2",
   "2,2",
   "3,2",
   "4,2",
   "5,2",
   "6,2",
   "7,2",
   "8,2",
   "9,2",
   "-1,3",
   "0,3",
   "1,3",
   "2,3",
   "3,3",
   "4,3",
   "5,3",
   "6,3",
   "7,3",
   "8,3",
   "9,3",
   "10,3",
   "-2,4",
   "-1,4",
   "0,4",
   "1,4",
   "2,4",
   "3,4",
   "4,4",
   "5,4",
   "6,4",
   "7,4",
   "8,4",
   "-2,5",
   "-1,5",
   "0,5",
   "1,5",
   "2,5",
   "3,5",
   "4,5",
   "5,5",
   "6,5",
   "7,5",
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
  "rangees": [
   {
    "cles": [
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0",
     "6,0",
     "7,0",
     "8,0"
    ],
    "reponses": [
     {
      "mot": "DEVOIR",
      "def": "Le travail à rendre au professeur."
     },
     {
      "mot": "PIC",
      "def": "Le sommet pointu d'une montagne."
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
     "7,1",
     "8,1",
     "9,1"
    ],
    "reponses": [
     {
      "mot": "GLACE",
      "def": "De l'eau devenue dure, ou le dessert froid."
     },
     {
      "mot": "MILLE",
      "def": "Le nombre 1 000, en toutes lettres."
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
     "7,2",
     "8,2",
     "9,2"
    ],
    "reponses": [
     {
      "mot": "MARDI",
      "def": "Le jour après lundi."
     },
     {
      "mot": "MOTEUR",
      "def": "Il fait tourner les roues de la voiture."
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
     "6,3",
     "7,3",
     "8,3",
     "9,3",
     "10,3"
    ],
    "reponses": [
     {
      "mot": "IDENTITE",
      "def": "Une égalité vraie quelle que soit la valeur de la lettre."
     },
     {
      "mot": "DEUX",
      "def": "Le nombre 2, en toutes lettres."
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
     "6,4",
     "7,4",
     "8,4"
    ],
    "reponses": [
     {
      "mot": "BEBE",
      "def": "Il ne sait pas encore marcher."
     },
     {
      "mot": "MILLION",
      "def": "Le nombre 1 000 000, en toutes lettres."
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
     "5,5",
     "6,5",
     "7,5"
    ],
    "reponses": [
     {
      "mot": "CHANT",
      "def": "Ce qu'on fait avec sa voix en musique."
     },
     {
      "mot": "DEBUT",
      "def": "Le contraire de la fin."
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
      "mot": "VOYAGE",
      "def": "On part loin, et on revient."
     },
     {
      "mot": "JUS",
      "def": "On le presse de l'orange."
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
    "mot": "ETOILE",
    "def": "Elle brille la nuit, très loin.",
    "maths": false,
    "depart": 2,
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
    "mot": "RACINE",
    "def": "L'opération qui revient du carré à la longueur.",
    "maths": true,
    "depart": 4,
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
    "mot": "MOITIE",
    "def": "Deux fois moins.",
    "maths": true,
    "depart": 0,
    "couleur": "claire"
   },
   {
    "centre": "6,4",
    "petales": [
     "7,3",
     "7,4",
     "6,5",
     "5,5",
     "5,4",
     "6,3"
    ],
    "mot": "DOUBLE",
    "def": "Deux fois plus.",
    "maths": true,
    "depart": 0,
    "couleur": "moyenne"
   }
  ],
  "signature": "DOUBLE ETOILE MOITIE RACINE"
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
   "7,0",
   "8,0",
   "0,1",
   "1,1",
   "2,1",
   "3,1",
   "4,1",
   "5,1",
   "6,1",
   "7,1",
   "8,1",
   "9,1",
   "-1,2",
   "0,2",
   "1,2",
   "2,2",
   "3,2",
   "4,2",
   "5,2",
   "6,2",
   "7,2",
   "8,2",
   "9,2",
   "-1,3",
   "0,3",
   "1,3",
   "2,3",
   "3,3",
   "4,3",
   "5,3",
   "6,3",
   "7,3",
   "8,3",
   "9,3",
   "10,3",
   "-2,4",
   "-1,4",
   "0,4",
   "1,4",
   "2,4",
   "3,4",
   "4,4",
   "5,4",
   "6,4",
   "7,4",
   "8,4",
   "-2,5",
   "-1,5",
   "0,5",
   "1,5",
   "2,5",
   "3,5",
   "4,5",
   "5,5",
   "6,5",
   "7,5",
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
  "rangees": [
   {
    "cles": [
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0",
     "6,0",
     "7,0",
     "8,0"
    ],
    "reponses": [
     {
      "mot": "FOUR",
      "def": "On y cuit le gâteau."
     },
     {
      "mot": "VINGT",
      "def": "Le nombre 20, en toutes lettres."
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
     "7,1",
     "8,1",
     "9,1"
    ],
    "reponses": [
     {
      "mot": "TITRE",
      "def": "Le nom en haut du livre."
     },
     {
      "mot": "NOIRE",
      "def": "De la couleur de la nuit sans lune."
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
     "7,2",
     "8,2",
     "9,2"
    ],
    "reponses": [
     {
      "mot": "ENTENDRE",
      "def": "Recevoir un son par l'oreille."
     },
     {
      "mot": "TAS",
      "def": "Beaucoup de choses entassées."
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
     "6,3",
     "7,3",
     "8,3",
     "9,3",
     "10,3"
    ],
    "reponses": [
     {
      "mot": "PENSER",
      "def": "Se servir de sa tête."
     },
     {
      "mot": "DEVANT",
      "def": "Le contraire de derrière."
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
     "6,4",
     "7,4",
     "8,4"
    ],
    "reponses": [
     {
      "mot": "CHOSE",
      "def": "N'importe quel objet dont on ne dit pas le nom."
     },
     {
      "mot": "CAMION",
      "def": "Il transporte les marchandises."
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
     "5,5",
     "6,5",
     "7,5"
    ],
    "reponses": [
     {
      "mot": "METAL",
      "def": "Le fer et le cuivre en sont."
     },
     {
      "mot": "ROULE",
      "def": "Qui avance en tournant sur lui-même."
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
      "mot": "PLANTE",
      "def": "Elle pousse et a besoin d'eau."
     },
     {
      "mot": "ILE",
      "def": "De la terre entourée d'eau."
     }
    ]
   }
  ],
  "fleurs": [
   {
    "centre": "6,4",
    "petales": [
     "7,3",
     "7,4",
     "6,5",
     "5,5",
     "5,4",
     "6,3"
    ],
    "mot": "VOLUME",
    "def": "La place occupée dans l'espace.",
    "maths": true,
    "depart": 0,
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
    "mot": "DROITE",
    "def": "Illimitée des deux côtés, elle n'a ni début ni fin.",
    "maths": true,
    "depart": 3,
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
    "mot": "CLASSE",
    "def": "Le groupe d'élèves, ou la salle où ils sont.",
    "maths": false,
    "depart": 1,
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
    "mot": "PETITE",
    "def": "De taille réduite, au féminin.",
    "maths": false,
    "depart": 3,
    "couleur": "moyenne"
   }
  ],
  "signature": "CLASSE DROITE PETITE VOLUME"
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
   "7,0",
   "8,0",
   "0,1",
   "1,1",
   "2,1",
   "3,1",
   "4,1",
   "5,1",
   "6,1",
   "7,1",
   "8,1",
   "9,1",
   "-1,2",
   "0,2",
   "1,2",
   "2,2",
   "3,2",
   "4,2",
   "5,2",
   "6,2",
   "7,2",
   "8,2",
   "9,2",
   "-1,3",
   "0,3",
   "1,3",
   "2,3",
   "3,3",
   "4,3",
   "5,3",
   "6,3",
   "7,3",
   "8,3",
   "9,3",
   "10,3",
   "-2,4",
   "-1,4",
   "0,4",
   "1,4",
   "2,4",
   "3,4",
   "4,4",
   "5,4",
   "6,4",
   "7,4",
   "8,4",
   "-2,5",
   "-1,5",
   "0,5",
   "1,5",
   "2,5",
   "3,5",
   "4,5",
   "5,5",
   "6,5",
   "7,5",
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
  "rangees": [
   {
    "cles": [
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0",
     "6,0",
     "7,0",
     "8,0"
    ],
    "reponses": [
     {
      "mot": "PERIMETRE",
      "def": "La longueur du tour d'une figure."
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
     "7,1",
     "8,1",
     "9,1"
    ],
    "reponses": [
     {
      "mot": "POINT",
      "def": "Le plus petit signe qu'on puisse tracer."
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
     "7,2",
     "8,2",
     "9,2"
    ],
    "reponses": [
     {
      "mot": "POCHE",
      "def": "On y glisse ses mains, dans le pantalon."
     },
     {
      "mot": "SOURIS",
      "def": "Le petit rongeur gris — ou celle de l'ordinateur."
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
     "6,3",
     "7,3",
     "8,3",
     "9,3",
     "10,3"
    ],
    "reponses": [
     {
      "mot": "QUARANTE",
      "def": "Le nombre 40, en toutes lettres."
     },
     {
      "mot": "CUBE",
      "def": "Six faces carrées identiques."
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
     "6,4",
     "7,4",
     "8,4"
    ],
    "reponses": [
     {
      "mot": "AIR",
      "def": "On le respire sans le voir."
     },
     {
      "mot": "ESCALIER",
      "def": "On le monte marche après marche."
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
     "5,5",
     "6,5",
     "7,5"
    ],
    "reponses": [
     {
      "mot": "ARRIVEE",
      "def": "Le bout de la course."
     },
     {
      "mot": "CRU",
      "def": "Qui n'est pas passé par la casserole."
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
      "mot": "CAHIER",
      "def": "On y écrit ses leçons."
     },
     {
      "mot": "DIX",
      "def": "Le nombre 10, en toutes lettres."
     }
    ]
   }
  ],
  "fleurs": [
   {
    "centre": "8,2",
    "petales": [
     "9,1",
     "9,2",
     "8,3",
     "7,3",
     "7,2",
     "8,1"
    ],
    "mot": "SUCREE",
    "def": "Au goût de miel, au féminin.",
    "maths": false,
    "depart": 1,
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
    "mot": "RACINE",
    "def": "L'opération qui revient du carré à la longueur.",
    "maths": true,
    "depart": 2,
    "couleur": "moyenne"
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
    "mot": "RETOUR",
    "def": "Le chemin du soir, après l'aller.",
    "maths": false,
    "depart": 1,
    "couleur": "claire"
   },
   {
    "centre": "6,4",
    "petales": [
     "7,3",
     "7,4",
     "6,5",
     "5,5",
     "5,4",
     "6,3"
    ],
    "mot": "CERCLE",
    "def": "Tous ses points sont à la même distance du centre.",
    "maths": true,
    "depart": 0,
    "couleur": "moyenne"
   }
  ],
  "signature": "CERCLE RACINE RETOUR SUCREE"
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
   "7,0",
   "8,0",
   "0,1",
   "1,1",
   "2,1",
   "3,1",
   "4,1",
   "5,1",
   "6,1",
   "7,1",
   "8,1",
   "9,1",
   "-1,2",
   "0,2",
   "1,2",
   "2,2",
   "3,2",
   "4,2",
   "5,2",
   "6,2",
   "7,2",
   "8,2",
   "9,2",
   "-1,3",
   "0,3",
   "1,3",
   "2,3",
   "3,3",
   "4,3",
   "5,3",
   "6,3",
   "7,3",
   "8,3",
   "9,3",
   "10,3",
   "-2,4",
   "-1,4",
   "0,4",
   "1,4",
   "2,4",
   "3,4",
   "4,4",
   "5,4",
   "6,4",
   "7,4",
   "8,4",
   "-2,5",
   "-1,5",
   "0,5",
   "1,5",
   "2,5",
   "3,5",
   "4,5",
   "5,5",
   "6,5",
   "7,5",
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
  "rangees": [
   {
    "cles": [
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0",
     "6,0",
     "7,0",
     "8,0"
    ],
    "reponses": [
     {
      "mot": "FERMER",
      "def": "Le contraire d'ouvrir."
     },
     {
      "mot": "DUC",
      "def": "Un seigneur, juste en dessous du prince."
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
     "7,1",
     "8,1",
     "9,1"
    ],
    "reponses": [
     {
      "mot": "TRAC",
      "def": "La peur juste avant de monter sur scène."
     },
     {
      "mot": "ARGENT",
      "def": "Le métal blanc — ou ce qu'on met dans son porte-monnaie."
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
     "7,2",
     "8,2",
     "9,2"
    ],
    "reponses": [
     {
      "mot": "MARDI",
      "def": "Le jour après lundi."
     },
     {
      "mot": "CALCUL",
      "def": "Ce qu'on fait avec des nombres pour trouver un résultat."
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
     "6,3",
     "7,3",
     "8,3",
     "9,3",
     "10,3"
    ],
    "reponses": [
     {
      "mot": "TRENTE",
      "def": "Le nombre 30, en toutes lettres."
     },
     {
      "mot": "DOUBLE",
      "def": "Deux fois plus."
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
     "6,4",
     "7,4",
     "8,4"
    ],
    "reponses": [
     {
      "mot": "ACTE",
      "def": "Une partie d'une pièce de théâtre."
     },
     {
      "mot": "DIZAINE",
      "def": "Un paquet de dix unités."
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
     "5,5",
     "6,5",
     "7,5"
    ],
    "reponses": [
     {
      "mot": "BUS",
      "def": "Il s'arrête à chaque arrêt."
     },
     {
      "mot": "RETENUE",
      "def": "Le petit chiffre qu'on reporte sur la colonne d'à côté."
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
      "mot": "FAIM",
      "def": "Ce qu'on a quand on veut manger."
     },
     {
      "mot": "TEMPS",
      "def": "Les heures qui passent."
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
    "mot": "RACINE",
    "def": "L'opération qui revient du carré à la longueur.",
    "maths": true,
    "depart": 4,
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
    "mot": "CODAGE",
    "def": "Le petit arc, ou le petit carré, qui marque un angle sur la figure.",
    "maths": true,
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
    "mot": "ENTIER",
    "def": "Un nombre sans virgule : 0, 1, 2, 3…",
    "maths": true,
    "depart": 4,
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
    "mot": "SUCREE",
    "def": "Au goût de miel, au féminin.",
    "maths": false,
    "depart": 2,
    "couleur": "moyenne"
   }
  ],
  "signature": "CODAGE ENTIER RACINE SUCREE"
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
   "7,0",
   "8,0",
   "0,1",
   "1,1",
   "2,1",
   "3,1",
   "4,1",
   "5,1",
   "6,1",
   "7,1",
   "8,1",
   "9,1",
   "-1,2",
   "0,2",
   "1,2",
   "2,2",
   "3,2",
   "4,2",
   "5,2",
   "6,2",
   "7,2",
   "8,2",
   "9,2",
   "-1,3",
   "0,3",
   "1,3",
   "2,3",
   "3,3",
   "4,3",
   "5,3",
   "6,3",
   "7,3",
   "8,3",
   "9,3",
   "10,3",
   "-2,4",
   "-1,4",
   "0,4",
   "1,4",
   "2,4",
   "3,4",
   "4,4",
   "5,4",
   "6,4",
   "7,4",
   "8,4",
   "-2,5",
   "-1,5",
   "0,5",
   "1,5",
   "2,5",
   "3,5",
   "4,5",
   "5,5",
   "6,5",
   "7,5",
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
  "rangees": [
   {
    "cles": [
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0",
     "6,0",
     "7,0",
     "8,0"
    ],
    "reponses": [
     {
      "mot": "QUINZE",
      "def": "Le nombre 15, en toutes lettres."
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
     "7,1",
     "8,1",
     "9,1"
    ],
    "reponses": [
     {
      "mot": "MENU",
      "def": "La liste des plats — ou tout petit."
     },
     {
      "mot": "POULET",
      "def": "Le jeune coq qu'on fait rôtir."
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
     "7,2",
     "8,2",
     "9,2"
    ],
    "reponses": [
     {
      "mot": "DOIGT",
      "def": "La main en a cinq."
     },
     {
      "mot": "FERMES",
      "def": "Les maisons du paysan, au pluriel."
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
     "6,3",
     "7,3",
     "8,3",
     "9,3",
     "10,3"
    ],
    "reponses": [
     {
      "mot": "SYMETRIE",
      "def": "Comme le reflet dans un miroir, de part et d'autre d'un axe."
     },
     {
      "mot": "MOTO",
      "def": "Le deux-roues à moteur."
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
     "6,4",
     "7,4",
     "8,4"
    ],
    "reponses": [
     {
      "mot": "DOUZE",
      "def": "Le nombre 12, en toutes lettres."
     },
     {
      "mot": "RAISON",
      "def": "Ce qui explique, ou le fait d'avoir juste."
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
     "5,5",
     "6,5",
     "7,5"
    ],
    "reponses": [
     {
      "mot": "LUMIERE",
      "def": "Elle vient du soleil ou de la lampe."
     },
     {
      "mot": "TIR",
      "def": "Ce qu'on fait avec un arc ou un ballon."
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
      "mot": "ENFIN",
      "def": "Le mot de celui qui attendait depuis longtemps."
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
    "centre": "6,4",
    "petales": [
     "7,3",
     "7,4",
     "6,5",
     "5,5",
     "5,4",
     "6,3"
    ],
    "mot": "MOITIE",
    "def": "Deux fois moins.",
    "maths": true,
    "depart": 0,
    "couleur": "claire"
   },
   {
    "centre": "8,2",
    "petales": [
     "9,1",
     "9,2",
     "8,3",
     "7,3",
     "7,2",
     "8,1"
    ],
    "mot": "SOMMET",
    "def": "Le point où deux côtés se rejoignent.",
    "maths": true,
    "depart": 1,
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
    "mot": "MINUTE",
    "def": "Soixante secondes.",
    "maths": true,
    "depart": 3,
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
    "mot": "TREIZE",
    "def": "Le nombre 13, en toutes lettres.",
    "maths": true,
    "depart": 0,
    "couleur": "moyenne"
   }
  ],
  "signature": "MINUTE MOITIE SOMMET TREIZE"
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
   "7,0",
   "8,0",
   "0,1",
   "1,1",
   "2,1",
   "3,1",
   "4,1",
   "5,1",
   "6,1",
   "7,1",
   "8,1",
   "9,1",
   "-1,2",
   "0,2",
   "1,2",
   "2,2",
   "3,2",
   "4,2",
   "5,2",
   "6,2",
   "7,2",
   "8,2",
   "9,2",
   "-1,3",
   "0,3",
   "1,3",
   "2,3",
   "3,3",
   "4,3",
   "5,3",
   "6,3",
   "7,3",
   "8,3",
   "9,3",
   "10,3",
   "-2,4",
   "-1,4",
   "0,4",
   "1,4",
   "2,4",
   "3,4",
   "4,4",
   "5,4",
   "6,4",
   "7,4",
   "8,4",
   "-2,5",
   "-1,5",
   "0,5",
   "1,5",
   "2,5",
   "3,5",
   "4,5",
   "5,5",
   "6,5",
   "7,5",
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
  "rangees": [
   {
    "cles": [
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0",
     "6,0",
     "7,0",
     "8,0"
    ],
    "reponses": [
     {
      "mot": "CALCUL",
      "def": "Ce qu'on fait avec des nombres pour trouver un résultat."
     },
     {
      "mot": "SEL",
      "def": "Le blanc qui sale la soupe."
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
     "7,1",
     "8,1",
     "9,1"
    ],
    "reponses": [
     {
      "mot": "AIRE",
      "def": "La mesure de la surface : le nombre de carreaux dedans."
     },
     {
      "mot": "PETITE",
      "def": "De taille réduite, au féminin."
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
     "7,2",
     "8,2",
     "9,2"
    ],
    "reponses": [
     {
      "mot": "MOTS",
      "def": "Ils forment la phrase."
     },
     {
      "mot": "CONTENT",
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
     "6,3",
     "7,3",
     "8,3",
     "9,3",
     "10,3"
    ],
    "reponses": [
     {
      "mot": "FENETRE",
      "def": "On l'ouvre pour aérer la pièce."
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
     "6,4",
     "7,4",
     "8,4"
    ],
    "reponses": [
     {
      "mot": "EGALITE",
      "def": "Deux écritures qui valent la même chose."
     },
     {
      "mot": "QUAI",
      "def": "Le bord où le train s'arrête."
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
     "5,5",
     "6,5",
     "7,5"
    ],
    "reponses": [
     {
      "mot": "ACIER",
      "def": "Le métal dur dont on fait les rails."
     },
     {
      "mot": "AUTRE",
      "def": "Celui qui n'est pas celui-là."
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
      "mot": "TOT",
      "def": "Le contraire de tard."
     },
     {
      "mot": "MANGER",
      "def": "Porter la nourriture à sa bouche."
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
    "depart": 3,
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
    "mot": "CENTRE",
    "def": "Le point du milieu, à égale distance de tout le bord.",
    "maths": true,
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
    "mot": "LETTRE",
    "def": "A, B ou C — ou ce qu'on met à la poste.",
    "maths": false,
    "depart": 4,
    "couleur": "claire"
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
    "mot": "QUATRE",
    "def": "Le nombre 4, en toutes lettres.",
    "maths": true,
    "depart": 1,
    "couleur": "moyenne"
   }
  ],
  "signature": "CENTRE ENTIER LETTRE QUATRE"
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
   "7,0",
   "8,0",
   "0,1",
   "1,1",
   "2,1",
   "3,1",
   "4,1",
   "5,1",
   "6,1",
   "7,1",
   "8,1",
   "9,1",
   "-1,2",
   "0,2",
   "1,2",
   "2,2",
   "3,2",
   "4,2",
   "5,2",
   "6,2",
   "7,2",
   "8,2",
   "9,2",
   "-1,3",
   "0,3",
   "1,3",
   "2,3",
   "3,3",
   "4,3",
   "5,3",
   "6,3",
   "7,3",
   "8,3",
   "9,3",
   "10,3",
   "-2,4",
   "-1,4",
   "0,4",
   "1,4",
   "2,4",
   "3,4",
   "4,4",
   "5,4",
   "6,4",
   "7,4",
   "8,4",
   "-2,5",
   "-1,5",
   "0,5",
   "1,5",
   "2,5",
   "3,5",
   "4,5",
   "5,5",
   "6,5",
   "7,5",
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
  "rangees": [
   {
    "cles": [
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0",
     "6,0",
     "7,0",
     "8,0"
    ],
    "reponses": [
     {
      "mot": "BORDS",
      "def": "Les limites extérieures d'une surface."
     },
     {
      "mot": "RAME",
      "def": "On s'en sert pour faire avancer la barque."
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
     "7,1",
     "8,1",
     "9,1"
    ],
    "reponses": [
     {
      "mot": "PUCE",
      "def": "Le minuscule insecte qui saute."
     },
     {
      "mot": "COUDRE",
      "def": "Assembler deux tissus avec du fil."
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
     "7,2",
     "8,2",
     "9,2"
    ],
    "reponses": [
     {
      "mot": "CENTAINE",
      "def": "Un paquet de cent unités, soit dix dizaines."
     },
     {
      "mot": "BON",
      "def": "Le contraire de mauvais."
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
     "6,3",
     "7,3",
     "8,3",
     "9,3",
     "10,3"
    ],
    "reponses": [
     {
      "mot": "TRAVAIL",
      "def": "Ce qu'on fait pour gagner sa vie."
     },
     {
      "mot": "AMOUR",
      "def": "Le sentiment qui attache deux êtres."
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
     "6,4",
     "7,4",
     "8,4"
    ],
    "reponses": [
     {
      "mot": "CERCLE",
      "def": "Tous ses points sont à la même distance du centre."
     },
     {
      "mot": "USAGE",
      "def": "La façon dont on se sert d'une chose."
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
     "5,5",
     "6,5",
     "7,5"
    ],
    "reponses": [
     {
      "mot": "ANIMAL",
      "def": "Le chien, le chat et l'oiseau en sont."
     },
     {
      "mot": "ONDE",
      "def": "Ce qui se propage à la surface de l'eau."
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
      "mot": "FEU",
      "def": "Il brûle, et il est rouge au carrefour."
     },
     {
      "mot": "PARTIR",
      "def": "Quitter l'endroit où l'on est."
     }
    ]
   }
  ],
  "fleurs": [
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
    "mot": "RACINE",
    "def": "L'opération qui revient du carré à la longueur.",
    "maths": true,
    "depart": 5,
    "couleur": "claire"
   },
   {
    "centre": "8,2",
    "petales": [
     "9,1",
     "9,2",
     "8,3",
     "7,3",
     "7,2",
     "8,1"
    ],
    "mot": "NOMBRE",
    "def": "Ce qui dit une quantité.",
    "maths": true,
    "depart": 1,
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
    "mot": "AVANCE",
    "def": "Le contraire du retard.",
    "maths": false,
    "depart": 1,
    "couleur": "claire"
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
    "mot": "SOLEIL",
    "def": "Il se lève à l'est et chauffe la journée.",
    "maths": false,
    "depart": 1,
    "couleur": "moyenne"
   }
  ],
  "signature": "AVANCE NOMBRE RACINE SOLEIL"
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
   "7,0",
   "8,0",
   "0,1",
   "1,1",
   "2,1",
   "3,1",
   "4,1",
   "5,1",
   "6,1",
   "7,1",
   "8,1",
   "9,1",
   "-1,2",
   "0,2",
   "1,2",
   "2,2",
   "3,2",
   "4,2",
   "5,2",
   "6,2",
   "7,2",
   "8,2",
   "9,2",
   "-1,3",
   "0,3",
   "1,3",
   "2,3",
   "3,3",
   "4,3",
   "5,3",
   "6,3",
   "7,3",
   "8,3",
   "9,3",
   "10,3",
   "-2,4",
   "-1,4",
   "0,4",
   "1,4",
   "2,4",
   "3,4",
   "4,4",
   "5,4",
   "6,4",
   "7,4",
   "8,4",
   "-2,5",
   "-1,5",
   "0,5",
   "1,5",
   "2,5",
   "3,5",
   "4,5",
   "5,5",
   "6,5",
   "7,5",
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
  "rangees": [
   {
    "cles": [
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0",
     "6,0",
     "7,0",
     "8,0"
    ],
    "reponses": [
     {
      "mot": "TASSE",
      "def": "On y boit le thé."
     },
     {
      "mot": "ECUS",
      "def": "Les boucliers des chevaliers."
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
     "7,1",
     "8,1",
     "9,1"
    ],
    "reponses": [
     {
      "mot": "POCHE",
      "def": "On y glisse ses mains, dans le pantalon."
     },
     {
      "mot": "PLEIN",
      "def": "Le contraire de vide."
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
     "7,2",
     "8,2",
     "9,2"
    ],
    "reponses": [
     {
      "mot": "FERMES",
      "def": "Les maisons du paysan, au pluriel."
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
     "6,3",
     "7,3",
     "8,3",
     "9,3",
     "10,3"
    ],
    "reponses": [
     {
      "mot": "DIAMETRE",
      "def": "Traverse le cercle en passant par le centre : deux rayons."
     },
     {
      "mot": "ARME",
      "def": "L'épée et le fusil en sont."
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
     "6,4",
     "7,4",
     "8,4"
    ],
    "reponses": [
     {
      "mot": "COEUR",
      "def": "Il bat dans la poitrine."
     },
     {
      "mot": "VERITE",
      "def": "Ce qui est exact, par opposition au mensonge."
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
     "5,5",
     "6,5",
     "7,5"
    ],
    "reponses": [
     {
      "mot": "EAU",
      "def": "Elle coule du robinet."
     },
     {
      "mot": "LOSANGE",
      "def": "Quatre côtés de même longueur, sans angle droit obligatoire."
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
      "mot": "MATIN",
      "def": "La première partie de la journée."
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
    "mot": "MARCHE",
    "def": "On y achète les légumes — ou on la monte.",
    "maths": false,
    "depart": 2,
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
    "mot": "VOLUME",
    "def": "La place occupée dans l'espace.",
    "maths": true,
    "depart": 1,
    "couleur": "moyenne"
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
    "mot": "CERCLE",
    "def": "Tous ses points sont à la même distance du centre.",
    "maths": true,
    "depart": 1,
    "couleur": "claire"
   },
   {
    "centre": "8,2",
    "petales": [
     "9,1",
     "9,2",
     "8,3",
     "7,3",
     "7,2",
     "8,1"
    ],
    "mot": "RACINE",
    "def": "L'opération qui revient du carré à la longueur.",
    "maths": true,
    "depart": 2,
    "couleur": "moyenne"
   }
  ],
  "signature": "CERCLE MARCHE RACINE VOLUME"
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
   "7,0",
   "8,0",
   "0,1",
   "1,1",
   "2,1",
   "3,1",
   "4,1",
   "5,1",
   "6,1",
   "7,1",
   "8,1",
   "9,1",
   "-1,2",
   "0,2",
   "1,2",
   "2,2",
   "3,2",
   "4,2",
   "5,2",
   "6,2",
   "7,2",
   "8,2",
   "9,2",
   "-1,3",
   "0,3",
   "1,3",
   "2,3",
   "3,3",
   "4,3",
   "5,3",
   "6,3",
   "7,3",
   "8,3",
   "9,3",
   "10,3",
   "-2,4",
   "-1,4",
   "0,4",
   "1,4",
   "2,4",
   "3,4",
   "4,4",
   "5,4",
   "6,4",
   "7,4",
   "8,4",
   "-2,5",
   "-1,5",
   "0,5",
   "1,5",
   "2,5",
   "3,5",
   "4,5",
   "5,5",
   "6,5",
   "7,5",
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
  "rangees": [
   {
    "cles": [
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0",
     "6,0",
     "7,0",
     "8,0"
    ],
    "reponses": [
     {
      "mot": "SORTIR",
      "def": "Quitter la maison."
     },
     {
      "mot": "BUT",
      "def": "Ce qu'on vise — ou ce qu'on marque au football."
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
     "7,1",
     "8,1",
     "9,1"
    ],
    "reponses": [
     {
      "mot": "CORDE",
      "def": "On la tend, on l'attache, on grimpe dessus."
     },
     {
      "mot": "ROULE",
      "def": "Qui avance en tournant sur lui-même."
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
     "7,2",
     "8,2",
     "9,2"
    ],
    "reponses": [
     {
      "mot": "VENDREDI",
      "def": "Le jour avant samedi."
     },
     {
      "mot": "BAS",
      "def": "Le contraire de haut."
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
     "6,3",
     "7,3",
     "8,3",
     "9,3",
     "10,3"
    ],
    "reponses": [
     {
      "mot": "GRAIN",
      "def": "Le petit du blé, ou celui du sable."
     },
     {
      "mot": "RELATIF",
      "def": "Un nombre qui peut être négatif, comme −7."
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
     "6,4",
     "7,4",
     "8,4"
    ],
    "reponses": [
     {
      "mot": "ANIMAUX",
      "def": "Le chien et le cheval, au pluriel."
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
     "5,5",
     "6,5",
     "7,5"
    ],
    "reponses": [
     {
      "mot": "FORET",
      "def": "Beaucoup d'arbres ensemble."
     },
     {
      "mot": "TABLE",
      "def": "On y pose son cahier."
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
      "mot": "LEVIER",
      "def": "La barre qui aide à soulever."
     },
     {
      "mot": "FOU",
      "def": "La pièce des échecs qui va en diagonale."
     }
    ]
   }
  ],
  "fleurs": [
   {
    "centre": "8,2",
    "petales": [
     "9,1",
     "9,2",
     "8,3",
     "7,3",
     "7,2",
     "8,1"
    ],
    "mot": "TABLES",
    "def": "On y pose les cahiers, au pluriel.",
    "maths": false,
    "depart": 2,
    "couleur": "claire"
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
    "mot": "NATURE",
    "def": "Les arbres, les bêtes et les rivières.",
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
    "mot": "MINUTE",
    "def": "Soixante secondes.",
    "maths": true,
    "depart": 4,
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
    "mot": "DOUBLE",
    "def": "Deux fois plus.",
    "maths": true,
    "depart": 4,
    "couleur": "moyenne"
   }
  ],
  "signature": "DOUBLE MINUTE NATURE TABLES"
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
   "7,0",
   "8,0",
   "0,1",
   "1,1",
   "2,1",
   "3,1",
   "4,1",
   "5,1",
   "6,1",
   "7,1",
   "8,1",
   "9,1",
   "-1,2",
   "0,2",
   "1,2",
   "2,2",
   "3,2",
   "4,2",
   "5,2",
   "6,2",
   "7,2",
   "8,2",
   "9,2",
   "-1,3",
   "0,3",
   "1,3",
   "2,3",
   "3,3",
   "4,3",
   "5,3",
   "6,3",
   "7,3",
   "8,3",
   "9,3",
   "10,3",
   "-2,4",
   "-1,4",
   "0,4",
   "1,4",
   "2,4",
   "3,4",
   "4,4",
   "5,4",
   "6,4",
   "7,4",
   "8,4",
   "-2,5",
   "-1,5",
   "0,5",
   "1,5",
   "2,5",
   "3,5",
   "4,5",
   "5,5",
   "6,5",
   "7,5",
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
  "rangees": [
   {
    "cles": [
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0",
     "6,0",
     "7,0",
     "8,0"
    ],
    "reponses": [
     {
      "mot": "MOIS",
      "def": "Janvier en est un."
     },
     {
      "mot": "SABLE",
      "def": "Les grains fins de la plage."
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
     "7,1",
     "8,1",
     "9,1"
    ],
    "reponses": [
     {
      "mot": "SOIR",
      "def": "Il vient après l'après-midi."
     },
     {
      "mot": "GROUPE",
      "def": "Plusieurs ensemble."
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
     "7,2",
     "8,2",
     "9,2"
    ],
    "reponses": [
     {
      "mot": "VENDREDI",
      "def": "Le jour avant samedi."
     },
     {
      "mot": "BOA",
      "def": "Le grand serpent qui étouffe sa proie."
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
     "6,3",
     "7,3",
     "8,3",
     "9,3",
     "10,3"
    ],
    "reponses": [
     {
      "mot": "PERLE",
      "def": "La petite bille qu'on enfile en collier."
     },
     {
      "mot": "RELATIF",
      "def": "Un nombre qui peut être négatif, comme −7."
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
     "6,4",
     "7,4",
     "8,4"
    ],
    "reponses": [
     {
      "mot": "PIECE",
      "def": "La monnaie ronde, ou la salle de la maison."
     },
     {
      "mot": "CHEMIN",
      "def": "Le petit sentier qu'on suit à pied."
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
     "5,5",
     "6,5",
     "7,5"
    ],
    "reponses": [
     {
      "mot": "CHAR",
      "def": "Le véhicule blindé, ou celui du carnaval."
     },
     {
      "mot": "ECOUTE",
      "def": "Ce qu'on fait avec les oreilles, attentivement."
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
      "mot": "DROIT",
      "def": "Sans aucun virage — ou ce que la loi permet."
     },
     {
      "mot": "ROSE",
      "def": "La fleur à épines."
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
    "mot": "CERCLE",
    "def": "Tous ses points sont à la même distance du centre.",
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
    "mot": "CAHIER",
    "def": "On y écrit ses leçons.",
    "maths": false,
    "depart": 1,
    "couleur": "moyenne"
   },
   {
    "centre": "6,4",
    "petales": [
     "7,3",
     "7,4",
     "6,5",
     "5,5",
     "5,4",
     "6,3"
    ],
    "mot": "LAITUE",
    "def": "La salade aux feuilles tendres.",
    "maths": false,
    "depart": 5,
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
    "mot": "DOUBLE",
    "def": "Deux fois plus.",
    "maths": true,
    "depart": 4,
    "couleur": "moyenne"
   }
  ],
  "signature": "CAHIER CERCLE DOUBLE LAITUE"
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
   "7,0",
   "8,0",
   "0,1",
   "1,1",
   "2,1",
   "3,1",
   "4,1",
   "5,1",
   "6,1",
   "7,1",
   "8,1",
   "9,1",
   "-1,2",
   "0,2",
   "1,2",
   "2,2",
   "3,2",
   "4,2",
   "5,2",
   "6,2",
   "7,2",
   "8,2",
   "9,2",
   "-1,3",
   "0,3",
   "1,3",
   "2,3",
   "3,3",
   "4,3",
   "5,3",
   "6,3",
   "7,3",
   "8,3",
   "9,3",
   "10,3",
   "-2,4",
   "-1,4",
   "0,4",
   "1,4",
   "2,4",
   "3,4",
   "4,4",
   "5,4",
   "6,4",
   "7,4",
   "8,4",
   "-2,5",
   "-1,5",
   "0,5",
   "1,5",
   "2,5",
   "3,5",
   "4,5",
   "5,5",
   "6,5",
   "7,5",
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
  "rangees": [
   {
    "cles": [
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0",
     "6,0",
     "7,0",
     "8,0"
    ],
    "reponses": [
     {
      "mot": "PERIMETRE",
      "def": "La longueur du tour d'une figure."
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
     "7,1",
     "8,1",
     "9,1"
    ],
    "reponses": [
     {
      "mot": "POULET",
      "def": "Le jeune coq qu'on fait rôtir."
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
     "7,2",
     "8,2",
     "9,2"
    ],
    "reponses": [
     {
      "mot": "COURT",
      "def": "Le contraire de long."
     },
     {
      "mot": "GROUPE",
      "def": "Plusieurs ensemble."
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
     "6,3",
     "7,3",
     "8,3",
     "9,3",
     "10,3"
    ],
    "reponses": [
     {
      "mot": "MATINEE",
      "def": "Toute la première partie du jour."
     },
     {
      "mot": "POCHE",
      "def": "On y glisse ses mains, dans le pantalon."
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
     "6,4",
     "7,4",
     "8,4"
    ],
    "reponses": [
     {
      "mot": "FAIM",
      "def": "Ce qu'on a quand on veut manger."
     },
     {
      "mot": "CUISINE",
      "def": "La pièce où l'on prépare les repas."
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
     "5,5",
     "6,5",
     "7,5"
    ],
    "reponses": [
     {
      "mot": "BUT",
      "def": "Ce qu'on vise — ou ce qu'on marque au football."
     },
     {
      "mot": "ETOILES",
      "def": "Elles brillent la nuit, au pluriel."
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
      "mot": "HUIT",
      "def": "Le nombre 8, en toutes lettres."
     },
     {
      "mot": "BRUIT",
      "def": "Le son qui dérange."
     }
    ]
   }
  ],
  "fleurs": [
   {
    "centre": "8,2",
    "petales": [
     "9,1",
     "9,2",
     "8,3",
     "7,3",
     "7,2",
     "8,1"
    ],
    "mot": "ECOUTE",
    "def": "Ce qu'on fait avec les oreilles, attentivement.",
    "maths": false,
    "depart": 1,
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
    "mot": "COUPER",
    "def": "Séparer en deux avec un ciseau.",
    "maths": false,
    "depart": 5,
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
    "mot": "TRENTE",
    "def": "Le nombre 30, en toutes lettres.",
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
    "mot": "MINUTE",
    "def": "Soixante secondes.",
    "maths": true,
    "depart": 4,
    "couleur": "moyenne"
   }
  ],
  "signature": "COUPER ECOUTE MINUTE TRENTE"
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
   "7,0",
   "8,0",
   "0,1",
   "1,1",
   "2,1",
   "3,1",
   "4,1",
   "5,1",
   "6,1",
   "7,1",
   "8,1",
   "9,1",
   "-1,2",
   "0,2",
   "1,2",
   "2,2",
   "3,2",
   "4,2",
   "5,2",
   "6,2",
   "7,2",
   "8,2",
   "9,2",
   "-1,3",
   "0,3",
   "1,3",
   "2,3",
   "3,3",
   "4,3",
   "5,3",
   "6,3",
   "7,3",
   "8,3",
   "9,3",
   "10,3",
   "-2,4",
   "-1,4",
   "0,4",
   "1,4",
   "2,4",
   "3,4",
   "4,4",
   "5,4",
   "6,4",
   "7,4",
   "8,4",
   "-2,5",
   "-1,5",
   "0,5",
   "1,5",
   "2,5",
   "3,5",
   "4,5",
   "5,5",
   "6,5",
   "7,5",
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
  "rangees": [
   {
    "cles": [
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0",
     "6,0",
     "7,0",
     "8,0"
    ],
    "reponses": [
     {
      "mot": "CRI",
      "def": "Ce qu'on pousse quand on a peur."
     },
     {
      "mot": "BATEAU",
      "def": "Il flotte et porte des voyageurs."
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
     "7,1",
     "8,1",
     "9,1"
    ],
    "reponses": [
     {
      "mot": "SOEUR",
      "def": "La fille des mêmes parents."
     },
     {
      "mot": "AUTRE",
      "def": "Celui qui n'est pas celui-là."
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
     "7,2",
     "8,2",
     "9,2"
    ],
    "reponses": [
     {
      "mot": "CAHIER",
      "def": "On y écrit ses leçons."
     },
     {
      "mot": "PARIS",
      "def": "La capitale de la France."
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
     "6,3",
     "7,3",
     "8,3",
     "9,3",
     "10,3"
    ],
    "reponses": [
     {
      "mot": "PERE",
      "def": "Il a des enfants."
     },
     {
      "mot": "DIAMETRE",
      "def": "Traverse le cercle en passant par le centre : deux rayons."
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
     "6,4",
     "7,4",
     "8,4"
    ],
    "reponses": [
     {
      "mot": "VOITURE",
      "def": "Elle a quatre roues et un volant."
     },
     {
      "mot": "MOTS",
      "def": "Ils forment la phrase."
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
     "5,5",
     "6,5",
     "7,5"
    ],
    "reponses": [
     {
      "mot": "ABRI",
      "def": "L'endroit où l'on se met quand il pleut."
     },
     {
      "mot": "OPPOSE",
      "def": "Même distance à zéro, de l'autre côté : −5 et 5."
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
      "mot": "DIX",
      "def": "Le nombre 10, en toutes lettres."
     },
     {
      "mot": "CLASSE",
      "def": "Le groupe d'élèves, ou la salle où ils sont."
     }
    ]
   }
  ],
  "fleurs": [
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
    "mot": "RAPIDE",
    "def": "Qui va vite.",
    "maths": false,
    "depart": 5,
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
    "mot": "DROITE",
    "def": "Illimitée des deux côtés, elle n'a ni début ni fin.",
    "maths": true,
    "depart": 0,
    "couleur": "moyenne"
   },
   {
    "centre": "6,4",
    "petales": [
     "7,3",
     "7,4",
     "6,5",
     "5,5",
     "5,4",
     "6,3"
    ],
    "mot": "SOMMET",
    "def": "Le point où deux côtés se rejoignent.",
    "maths": true,
    "depart": 2,
    "couleur": "claire"
   },
   {
    "centre": "8,2",
    "petales": [
     "9,1",
     "9,2",
     "8,3",
     "7,3",
     "7,2",
     "8,1"
    ],
    "mot": "RESTER",
    "def": "Ne pas bouger de l'endroit où l'on est.",
    "maths": false,
    "depart": 5,
    "couleur": "moyenne"
   }
  ],
  "signature": "DROITE RAPIDE RESTER SOMMET"
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
   "7,0",
   "8,0",
   "0,1",
   "1,1",
   "2,1",
   "3,1",
   "4,1",
   "5,1",
   "6,1",
   "7,1",
   "8,1",
   "9,1",
   "-1,2",
   "0,2",
   "1,2",
   "2,2",
   "3,2",
   "4,2",
   "5,2",
   "6,2",
   "7,2",
   "8,2",
   "9,2",
   "-1,3",
   "0,3",
   "1,3",
   "2,3",
   "3,3",
   "4,3",
   "5,3",
   "6,3",
   "7,3",
   "8,3",
   "9,3",
   "10,3",
   "-2,4",
   "-1,4",
   "0,4",
   "1,4",
   "2,4",
   "3,4",
   "4,4",
   "5,4",
   "6,4",
   "7,4",
   "8,4",
   "-2,5",
   "-1,5",
   "0,5",
   "1,5",
   "2,5",
   "3,5",
   "4,5",
   "5,5",
   "6,5",
   "7,5",
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
  "rangees": [
   {
    "cles": [
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0",
     "6,0",
     "7,0",
     "8,0"
    ],
    "reponses": [
     {
      "mot": "FOU",
      "def": "La pièce des échecs qui va en diagonale."
     },
     {
      "mot": "MOTEUR",
      "def": "Il fait tourner les roues de la voiture."
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
     "7,1",
     "8,1",
     "9,1"
    ],
    "reponses": [
     {
      "mot": "VOISIN",
      "def": "Celui qui habite juste à côté."
     },
     {
      "mot": "ONZE",
      "def": "Le nombre 11, en toutes lettres."
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
     "7,2",
     "8,2",
     "9,2"
    ],
    "reponses": [
     {
      "mot": "AGNEAU",
      "def": "Le petit du mouton."
     },
     {
      "mot": "DOIGT",
      "def": "La main en a cinq."
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
     "6,3",
     "7,3",
     "8,3",
     "9,3",
     "10,3"
    ],
    "reponses": [
     {
      "mot": "PERIMETRE",
      "def": "La longueur du tour d'une figure."
     },
     {
      "mot": "RAT",
      "def": "Le rongeur gris des égouts."
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
     "6,4",
     "7,4",
     "8,4"
    ],
    "reponses": [
     {
      "mot": "ENFANTS",
      "def": "Les petits, au pluriel."
     },
     {
      "mot": "RAME",
      "def": "On s'en sert pour faire avancer la barque."
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
     "5,5",
     "6,5",
     "7,5"
    ],
    "reponses": [
     {
      "mot": "PIC",
      "def": "Le sommet pointu d'une montagne."
     },
     {
      "mot": "FENETRE",
      "def": "On l'ouvre pour aérer la pièce."
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
      "mot": "OURS",
      "def": "Il dort tout l'hiver dans sa grotte."
     },
     {
      "mot": "ACIER",
      "def": "Le métal dur dont on fait les rails."
     }
    ]
   }
  ],
  "fleurs": [
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
    "mot": "RACINE",
    "def": "L'opération qui revient du carré à la longueur.",
    "maths": true,
    "depart": 0,
    "couleur": "claire"
   },
   {
    "centre": "8,2",
    "petales": [
     "9,1",
     "9,2",
     "8,3",
     "7,3",
     "7,2",
     "8,1"
    ],
    "mot": "TREIZE",
    "def": "Le nombre 13, en toutes lettres.",
    "maths": true,
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
    "mot": "TRENTE",
    "def": "Le nombre 30, en toutes lettres.",
    "maths": true,
    "depart": 0,
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
    "mot": "DEMAIN",
    "def": "Le jour après aujourd'hui.",
    "maths": false,
    "depart": 1,
    "couleur": "moyenne"
   }
  ],
  "signature": "DEMAIN RACINE TREIZE TRENTE"
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
   "7,0",
   "8,0",
   "0,1",
   "1,1",
   "2,1",
   "3,1",
   "4,1",
   "5,1",
   "6,1",
   "7,1",
   "8,1",
   "9,1",
   "-1,2",
   "0,2",
   "1,2",
   "2,2",
   "3,2",
   "4,2",
   "5,2",
   "6,2",
   "7,2",
   "8,2",
   "9,2",
   "-1,3",
   "0,3",
   "1,3",
   "2,3",
   "3,3",
   "4,3",
   "5,3",
   "6,3",
   "7,3",
   "8,3",
   "9,3",
   "10,3",
   "-2,4",
   "-1,4",
   "0,4",
   "1,4",
   "2,4",
   "3,4",
   "4,4",
   "5,4",
   "6,4",
   "7,4",
   "8,4",
   "-2,5",
   "-1,5",
   "0,5",
   "1,5",
   "2,5",
   "3,5",
   "4,5",
   "5,5",
   "6,5",
   "7,5",
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
  "rangees": [
   {
    "cles": [
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0",
     "6,0",
     "7,0",
     "8,0"
    ],
    "reponses": [
     {
      "mot": "PUISSANCE",
      "def": "Écriture courte d'un produit de facteurs tous égaux."
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
     "7,1",
     "8,1",
     "9,1"
    ],
    "reponses": [
     {
      "mot": "OIE",
      "def": "Un gros oiseau de ferme au long cou."
     },
     {
      "mot": "RELATIF",
      "def": "Un nombre qui peut être négatif, comme −7."
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
     "7,2",
     "8,2",
     "9,2"
    ],
    "reponses": [
     {
      "mot": "RAT",
      "def": "Le rongeur gris des égouts."
     },
     {
      "mot": "IMMOBILE",
      "def": "Qui ne bouge pas du tout."
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
     "6,3",
     "7,3",
     "8,3",
     "9,3",
     "10,3"
    ],
    "reponses": [
     {
      "mot": "DENOMINATEUR",
      "def": "Le nombre du BAS : en combien de parts on partage."
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
     "6,4",
     "7,4",
     "8,4"
    ],
    "reponses": [
     {
      "mot": "ARETE",
      "def": "Le segment où deux faces d'un solide se rencontrent."
     },
     {
      "mot": "BATEAU",
      "def": "Il flotte et porte des voyageurs."
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
     "5,5",
     "6,5",
     "7,5"
    ],
    "reponses": [
     {
      "mot": "ETE",
      "def": "La saison des vacances."
     },
     {
      "mot": "REPONSE",
      "def": "Ce qu'on dit après la question."
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
      "mot": "FEUX",
      "def": "Ils règlent la circulation au carrefour."
     },
     {
      "mot": "PIECE",
      "def": "La monnaie ronde, ou la salle de la maison."
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
    "mot": "TOMBER",
    "def": "Aller par terre sans le vouloir.",
    "maths": false,
    "depart": 4,
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
    "mot": "MONTER",
    "def": "Aller vers le haut.",
    "maths": false,
    "depart": 1,
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
    "mot": "DROITE",
    "def": "Illimitée des deux côtés, elle n'a ni début ni fin.",
    "maths": true,
    "depart": 3,
    "couleur": "moyenne"
   }
  ],
  "signature": "DROITE MONTER TOMBER TRENTE"
 },
 {
  "id": "jardin-17",
  "cases": [
   "0,0",
   "1,0",
   "2,0",
   "3,0",
   "4,0",
   "5,0",
   "6,0",
   "7,0",
   "8,0",
   "0,1",
   "1,1",
   "2,1",
   "3,1",
   "4,1",
   "5,1",
   "6,1",
   "7,1",
   "8,1",
   "9,1",
   "-1,2",
   "0,2",
   "1,2",
   "2,2",
   "3,2",
   "4,2",
   "5,2",
   "6,2",
   "7,2",
   "8,2",
   "9,2",
   "-1,3",
   "0,3",
   "1,3",
   "2,3",
   "3,3",
   "4,3",
   "5,3",
   "6,3",
   "7,3",
   "8,3",
   "9,3",
   "10,3",
   "-2,4",
   "-1,4",
   "0,4",
   "1,4",
   "2,4",
   "3,4",
   "4,4",
   "5,4",
   "6,4",
   "7,4",
   "8,4",
   "-2,5",
   "-1,5",
   "0,5",
   "1,5",
   "2,5",
   "3,5",
   "4,5",
   "5,5",
   "6,5",
   "7,5",
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
  "rangees": [
   {
    "cles": [
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0",
     "6,0",
     "7,0",
     "8,0"
    ],
    "reponses": [
     {
      "mot": "PERIMETRE",
      "def": "La longueur du tour d'une figure."
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
     "7,1",
     "8,1",
     "9,1"
    ],
    "reponses": [
     {
      "mot": "LETTRE",
      "def": "A, B ou C — ou ce qu'on met à la poste."
     },
     {
      "mot": "SORT",
      "def": "Ce que le destin réserve."
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
     "7,2",
     "8,2",
     "9,2"
    ],
    "reponses": [
     {
      "mot": "ANCIENNE",
      "def": "D'autrefois, au féminin."
     },
     {
      "mot": "AMI",
      "def": "Celui qu'on est content de voir."
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
     "6,3",
     "7,3",
     "8,3",
     "9,3",
     "10,3"
    ],
    "reponses": [
     {
      "mot": "CHAPITRE",
      "def": "Une partie du livre, entre deux autres."
     },
     {
      "mot": "PRIX",
      "def": "Ce qu'il faut payer."
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
     "6,4",
     "7,4",
     "8,4"
    ],
    "reponses": [
     {
      "mot": "DEMAIN",
      "def": "Le jour après aujourd'hui."
     },
     {
      "mot": "DEBUT",
      "def": "Le contraire de la fin."
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
     "5,5",
     "6,5",
     "7,5"
    ],
    "reponses": [
     {
      "mot": "DUEL",
      "def": "Le combat à deux, autrefois à l'épée."
     },
     {
      "mot": "SECOND",
      "def": "Celui qui suit le premier."
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
      "mot": "MIDI",
      "def": "Douze heures."
     },
     {
      "mot": "PUITS",
      "def": "On y descend un seau pour tirer l'eau."
     }
    ]
   }
  ],
  "fleurs": [
   {
    "centre": "8,2",
    "petales": [
     "9,1",
     "9,2",
     "8,3",
     "7,3",
     "7,2",
     "8,1"
    ],
    "mot": "PARTIR",
    "def": "Quitter l'endroit où l'on est.",
    "maths": false,
    "depart": 3,
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
    "mot": "LAPINS",
    "def": "Ils ont de longues oreilles, au pluriel.",
    "maths": false,
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
    "mot": "CENTRE",
    "def": "Le point du milieu, à égale distance de tout le bord.",
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
    "mot": "ENTIER",
    "def": "Un nombre sans virgule : 0, 1, 2, 3…",
    "maths": true,
    "depart": 0,
    "couleur": "moyenne"
   }
  ],
  "signature": "CENTRE ENTIER LAPINS PARTIR"
 },
 {
  "id": "jardin-18",
  "cases": [
   "0,0",
   "1,0",
   "2,0",
   "3,0",
   "4,0",
   "5,0",
   "6,0",
   "7,0",
   "8,0",
   "0,1",
   "1,1",
   "2,1",
   "3,1",
   "4,1",
   "5,1",
   "6,1",
   "7,1",
   "8,1",
   "9,1",
   "-1,2",
   "0,2",
   "1,2",
   "2,2",
   "3,2",
   "4,2",
   "5,2",
   "6,2",
   "7,2",
   "8,2",
   "9,2",
   "-1,3",
   "0,3",
   "1,3",
   "2,3",
   "3,3",
   "4,3",
   "5,3",
   "6,3",
   "7,3",
   "8,3",
   "9,3",
   "10,3",
   "-2,4",
   "-1,4",
   "0,4",
   "1,4",
   "2,4",
   "3,4",
   "4,4",
   "5,4",
   "6,4",
   "7,4",
   "8,4",
   "-2,5",
   "-1,5",
   "0,5",
   "1,5",
   "2,5",
   "3,5",
   "4,5",
   "5,5",
   "6,5",
   "7,5",
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
  "rangees": [
   {
    "cles": [
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0",
     "6,0",
     "7,0",
     "8,0"
    ],
    "reponses": [
     {
      "mot": "AIR",
      "def": "On le respire sans le voir."
     },
     {
      "mot": "COURSE",
      "def": "On la gagne en arrivant le premier."
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
     "7,1",
     "8,1",
     "9,1"
    ],
    "reponses": [
     {
      "mot": "BOA",
      "def": "Le grand serpent qui étouffe sa proie."
     },
     {
      "mot": "CHEMISE",
      "def": "Le vêtement à boutons et à col."
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
     "7,2",
     "8,2",
     "9,2"
    ],
    "reponses": [
     {
      "mot": "MARDI",
      "def": "Le jour après lundi."
     },
     {
      "mot": "DONNER",
      "def": "Le contraire de prendre."
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
     "6,3",
     "7,3",
     "8,3",
     "9,3",
     "10,3"
    ],
    "reponses": [
     {
      "mot": "PRENDRE",
      "def": "Saisir avec la main."
     },
     {
      "mot": "REPOS",
      "def": "Ce qu'on prend quand on est fatigué."
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
     "6,4",
     "7,4",
     "8,4"
    ],
    "reponses": [
     {
      "mot": "BEC",
      "def": "L'oiseau s'en sert pour manger."
     },
     {
      "mot": "ANCIENNE",
      "def": "D'autrefois, au féminin."
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
     "5,5",
     "6,5",
     "7,5"
    ],
    "reponses": [
     {
      "mot": "GATEAU",
      "def": "On souffle les bougies dessus."
     },
     {
      "mot": "SITE",
      "def": "L'endroit où l'on s'installe."
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
      "mot": "ODE",
      "def": "Un poème qui chante les louanges de quelque chose."
     },
     {
      "mot": "VERRES",
      "def": "On y boit, au pluriel."
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
    "mot": "RACINE",
    "def": "L'opération qui revient du carré à la longueur.",
    "maths": true,
    "depart": 4,
    "couleur": "claire"
   },
   {
    "centre": "8,2",
    "petales": [
     "9,1",
     "9,2",
     "8,3",
     "7,3",
     "7,2",
     "8,1"
    ],
    "mot": "PENSER",
    "def": "Se servir de sa tête.",
    "maths": false,
    "depart": 2,
    "couleur": "moyenne"
   },
   {
    "centre": "6,4",
    "petales": [
     "7,3",
     "7,4",
     "6,5",
     "5,5",
     "5,4",
     "6,3"
    ],
    "mot": "ENTIER",
    "def": "Un nombre sans virgule : 0, 1, 2, 3…",
    "maths": true,
    "depart": 0,
    "couleur": "claire"
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
    "mot": "SUCREE",
    "def": "Au goût de miel, au féminin.",
    "maths": false,
    "depart": 2,
    "couleur": "moyenne"
   }
  ],
  "signature": "ENTIER PENSER RACINE SUCREE"
 }
];
