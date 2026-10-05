// LES JARDINS, COMPOSÉS D'AVANCE.
//
// RÉMY : « j'adore le jeu rows garden qui était souvent sur world of puzzles,
// on pourrait le faire en français avec des mots de math ».
//
// CE FICHIER EST ENGENDRÉ — on ne le modifie pas à la main :
//
//     node tools/fabriquerJardins.mjs --forme=2x3 --combien=20 --ecrire
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
   "1,-1",
   "1,0",
   "0,1",
   "-1,1",
   "-1,0",
   "0,-1",
   "1,2",
   "2,1",
   "2,2",
   "1,3",
   "0,3",
   "0,2",
   "1,1",
   "2,4",
   "3,3",
   "3,4",
   "2,5",
   "1,5",
   "1,4",
   "2,3",
   "3,-1",
   "4,-2",
   "4,-1",
   "3,0",
   "2,0",
   "2,-1",
   "3,-2",
   "4,1",
   "5,0",
   "5,1",
   "4,2",
   "3,2",
   "3,1",
   "4,0",
   "5,3",
   "6,2",
   "6,3",
   "5,4",
   "4,4",
   "4,3",
   "5,2"
  ],
  "rangees": [
   {
    "cles": [
     "0,-1",
     "1,-1",
     "2,-1",
     "3,-1",
     "4,-1"
    ],
    "reponses": [
     {
      "mot": "CHOSE",
      "def": "N'importe quel objet dont on ne dit pas le nom."
     }
    ]
   },
   {
    "cles": [
     "-1,0",
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0"
    ],
    "reponses": [
     {
      "mot": "ETAT",
      "def": "La situation dans laquelle une chose se trouve."
     },
     {
      "mot": "ERE",
      "def": "Une très longue période de l'histoire."
     }
    ]
   },
   {
    "cles": [
     "-1,1",
     "0,1",
     "1,1",
     "2,1",
     "3,1",
     "4,1",
     "5,1"
    ],
    "reponses": [
     {
      "mot": "SITE",
      "def": "L'endroit où l'on s'installe."
     },
     {
      "mot": "TON",
      "def": "La hauteur de la voix."
     }
    ]
   },
   {
    "cles": [
     "0,2",
     "1,2",
     "2,2",
     "3,2",
     "4,2",
     "5,2",
     "6,2"
    ],
    "reponses": [
     {
      "mot": "ACTE",
      "def": "Une partie d'une pièce de théâtre."
     },
     {
      "mot": "TOI",
      "def": "Celui à qui l'on parle."
     }
    ]
   },
   {
    "cles": [
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
      "mot": "MOTO",
      "def": "Le deux-roues à moteur."
     },
     {
      "mot": "RAT",
      "def": "Le rongeur gris des égouts."
     }
    ]
   },
   {
    "cles": [
     "1,4",
     "2,4",
     "3,4",
     "4,4",
     "5,4"
    ],
    "reponses": [
     {
      "mot": "ETUDE",
      "def": "Le travail qu'on fait pour apprendre."
     }
    ]
   }
  ],
  "fleurs": [
   {
    "centre": "0,0",
    "petales": [
     "1,-1",
     "1,0",
     "0,1",
     "-1,1",
     "-1,0",
     "0,-1"
    ],
    "mot": "CHAISE",
    "def": "On s'y assoit, elle a un dossier.",
    "maths": false,
    "depart": 5,
    "couleur": "claire"
   },
   {
    "centre": "1,2",
    "petales": [
     "2,1",
     "2,2",
     "1,3",
     "0,3",
     "0,2",
     "1,1"
    ],
    "mot": "TOMATE",
    "def": "Le fruit rouge de la salade.",
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
    "mot": "RETOUR",
    "def": "Le chemin du soir, après l'aller.",
    "maths": false,
    "depart": 3,
    "couleur": "foncee"
   },
   {
    "centre": "3,-1",
    "petales": [
     "4,-2",
     "4,-1",
     "3,0",
     "2,0",
     "2,-1",
     "3,-2"
    ],
    "mot": "ETOILE",
    "def": "Elle brille la nuit, très loin.",
    "maths": false,
    "depart": 2,
    "couleur": "claire"
   },
   {
    "centre": "4,1",
    "petales": [
     "5,0",
     "5,1",
     "4,2",
     "3,2",
     "3,1",
     "4,0"
    ],
    "mot": "TRENTE",
    "def": "Le nombre 30, en toutes lettres.",
    "maths": true,
    "depart": 4,
    "couleur": "moyenne"
   },
   {
    "centre": "5,3",
    "petales": [
     "6,2",
     "6,3",
     "5,4",
     "4,4",
     "4,3",
     "5,2"
    ],
    "mot": "DROITE",
    "def": "Illimitée des deux côtés, elle n'a ni début ni fin.",
    "maths": true,
    "depart": 3,
    "couleur": "foncee"
   }
  ],
  "signature": "CHAISE DROITE ETOILE RETOUR TOMATE TRENTE"
 },
 {
  "id": "jardin-02",
  "cases": [
   "0,0",
   "1,-1",
   "1,0",
   "0,1",
   "-1,1",
   "-1,0",
   "0,-1",
   "1,2",
   "2,1",
   "2,2",
   "1,3",
   "0,3",
   "0,2",
   "1,1",
   "2,4",
   "3,3",
   "3,4",
   "2,5",
   "1,5",
   "1,4",
   "2,3",
   "3,-1",
   "4,-2",
   "4,-1",
   "3,0",
   "2,0",
   "2,-1",
   "3,-2",
   "4,1",
   "5,0",
   "5,1",
   "4,2",
   "3,2",
   "3,1",
   "4,0",
   "5,3",
   "6,2",
   "6,3",
   "5,4",
   "4,4",
   "4,3",
   "5,2"
  ],
  "rangees": [
   {
    "cles": [
     "0,-1",
     "1,-1",
     "2,-1",
     "3,-1",
     "4,-1"
    ],
    "reponses": [
     {
      "mot": "TEMPS",
      "def": "Les heures qui passent."
     }
    ]
   },
   {
    "cles": [
     "-1,0",
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0"
    ],
    "reponses": [
     {
      "mot": "ART",
      "def": "La peinture, la musique et la sculpture en font partie."
     },
     {
      "mot": "MOTO",
      "def": "Le deux-roues à moteur."
     }
    ]
   },
   {
    "cles": [
     "-1,1",
     "0,1",
     "1,1",
     "2,1",
     "3,1",
     "4,1",
     "5,1"
    ],
    "reponses": [
     {
      "mot": "MOIS",
      "def": "Janvier en est un."
     },
     {
      "mot": "EPI",
      "def": "La tige où poussent les grains du blé."
     }
    ]
   },
   {
    "cles": [
     "0,2",
     "1,2",
     "2,2",
     "3,2",
     "4,2",
     "5,2",
     "6,2"
    ],
    "reponses": [
     {
      "mot": "DAME",
      "def": "La pièce la plus forte aux échecs."
     },
     {
      "mot": "LIT",
      "def": "On s'y couche pour dormir."
     }
    ]
   },
   {
    "cles": [
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
      "mot": "OUI",
      "def": "La réponse qui accepte."
     }
    ]
   },
   {
    "cles": [
     "1,4",
     "2,4",
     "3,4",
     "4,4",
     "5,4"
    ],
    "reponses": [
     {
      "mot": "TERME",
      "def": "Un des nombres que l'on additionne."
     }
    ]
   }
  ],
  "fleurs": [
   {
    "centre": "0,0",
    "petales": [
     "1,-1",
     "1,0",
     "0,1",
     "-1,1",
     "-1,0",
     "0,-1"
    ],
    "mot": "TOMATE",
    "def": "Le fruit rouge de la salade.",
    "maths": false,
    "depart": 1,
    "couleur": "claire"
   },
   {
    "centre": "1,2",
    "petales": [
     "2,1",
     "2,2",
     "1,3",
     "0,3",
     "0,2",
     "1,1"
    ],
    "mot": "MARDIS",
    "def": "Les jours après lundi, au pluriel.",
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
    "mot": "ENTIER",
    "def": "Un nombre sans virgule : 0, 1, 2, 3…",
    "maths": true,
    "depart": 2,
    "couleur": "foncee"
   },
   {
    "centre": "3,-1",
    "petales": [
     "4,-2",
     "4,-1",
     "3,0",
     "2,0",
     "2,-1",
     "3,-2"
    ],
    "mot": "SOMMET",
    "def": "Le point où deux côtés se rejoignent.",
    "maths": true,
    "depart": 1,
    "couleur": "claire"
   },
   {
    "centre": "4,1",
    "petales": [
     "5,0",
     "5,1",
     "4,2",
     "3,2",
     "3,1",
     "4,0"
    ],
    "mot": "ETOILE",
    "def": "Elle brille la nuit, très loin.",
    "maths": false,
    "depart": 4,
    "couleur": "moyenne"
   },
   {
    "centre": "5,3",
    "petales": [
     "6,2",
     "6,3",
     "5,4",
     "4,4",
     "4,3",
     "5,2"
    ],
    "mot": "MOITIE",
    "def": "Deux fois moins.",
    "maths": true,
    "depart": 3,
    "couleur": "foncee"
   }
  ],
  "signature": "ENTIER ETOILE MARDIS MOITIE SOMMET TOMATE"
 },
 {
  "id": "jardin-03",
  "cases": [
   "0,0",
   "1,-1",
   "1,0",
   "0,1",
   "-1,1",
   "-1,0",
   "0,-1",
   "1,2",
   "2,1",
   "2,2",
   "1,3",
   "0,3",
   "0,2",
   "1,1",
   "2,4",
   "3,3",
   "3,4",
   "2,5",
   "1,5",
   "1,4",
   "2,3",
   "3,-1",
   "4,-2",
   "4,-1",
   "3,0",
   "2,0",
   "2,-1",
   "3,-2",
   "4,1",
   "5,0",
   "5,1",
   "4,2",
   "3,2",
   "3,1",
   "4,0",
   "5,3",
   "6,2",
   "6,3",
   "5,4",
   "4,4",
   "4,3",
   "5,2"
  ],
  "rangees": [
   {
    "cles": [
     "0,-1",
     "1,-1",
     "2,-1",
     "3,-1",
     "4,-1"
    ],
    "reponses": [
     {
      "mot": "AMOUR",
      "def": "Le sentiment qui attache deux êtres."
     }
    ]
   },
   {
    "cles": [
     "-1,0",
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0"
    ],
    "reponses": [
     {
      "mot": "CRI",
      "def": "Ce qu'on pousse quand on a peur."
     },
     {
      "mot": "RIRE",
      "def": "Ce qu'on fait quand c'est drôle."
     }
    ]
   },
   {
    "cles": [
     "-1,1",
     "0,1",
     "1,1",
     "2,1",
     "3,1",
     "4,1",
     "5,1"
    ],
    "reponses": [
     {
      "mot": "NOTE",
      "def": "Le chiffre du devoir, ou le son de la musique."
     },
     {
      "mot": "TON",
      "def": "La hauteur de la voix."
     }
    ]
   },
   {
    "cles": [
     "0,2",
     "1,2",
     "2,2",
     "3,2",
     "4,2",
     "5,2",
     "6,2"
    ],
    "reponses": [
     {
      "mot": "ACTE",
      "def": "Une partie d'une pièce de théâtre."
     },
     {
      "mot": "TOI",
      "def": "Celui à qui l'on parle."
     }
    ]
   },
   {
    "cles": [
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
      "mot": "MOTO",
      "def": "Le deux-roues à moteur."
     },
     {
      "mot": "RAT",
      "def": "Le rongeur gris des égouts."
     }
    ]
   },
   {
    "cles": [
     "1,4",
     "2,4",
     "3,4",
     "4,4",
     "5,4"
    ],
    "reponses": [
     {
      "mot": "ETUDE",
      "def": "Le travail qu'on fait pour apprendre."
     }
    ]
   }
  ],
  "fleurs": [
   {
    "centre": "0,0",
    "petales": [
     "1,-1",
     "1,0",
     "0,1",
     "-1,1",
     "-1,0",
     "0,-1"
    ],
    "mot": "CAMION",
    "def": "Il transporte les marchandises.",
    "maths": false,
    "depart": 4,
    "couleur": "claire"
   },
   {
    "centre": "1,2",
    "petales": [
     "2,1",
     "2,2",
     "1,3",
     "0,3",
     "0,2",
     "1,1"
    ],
    "mot": "TOMATE",
    "def": "Le fruit rouge de la salade.",
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
    "mot": "RETOUR",
    "def": "Le chemin du soir, après l'aller.",
    "maths": false,
    "depart": 3,
    "couleur": "foncee"
   },
   {
    "centre": "3,-1",
    "petales": [
     "4,-2",
     "4,-1",
     "3,0",
     "2,0",
     "2,-1",
     "3,-2"
    ],
    "mot": "OUVRIR",
    "def": "Le contraire de fermer.",
    "maths": false,
    "depart": 4,
    "couleur": "claire"
   },
   {
    "centre": "4,1",
    "petales": [
     "5,0",
     "5,1",
     "4,2",
     "3,2",
     "3,1",
     "4,0"
    ],
    "mot": "TRENTE",
    "def": "Le nombre 30, en toutes lettres.",
    "maths": true,
    "depart": 4,
    "couleur": "moyenne"
   },
   {
    "centre": "5,3",
    "petales": [
     "6,2",
     "6,3",
     "5,4",
     "4,4",
     "4,3",
     "5,2"
    ],
    "mot": "DROITE",
    "def": "Illimitée des deux côtés, elle n'a ni début ni fin.",
    "maths": true,
    "depart": 3,
    "couleur": "foncee"
   }
  ],
  "signature": "CAMION DROITE OUVRIR RETOUR TOMATE TRENTE"
 },
 {
  "id": "jardin-04",
  "cases": [
   "0,0",
   "1,-1",
   "1,0",
   "0,1",
   "-1,1",
   "-1,0",
   "0,-1",
   "1,2",
   "2,1",
   "2,2",
   "1,3",
   "0,3",
   "0,2",
   "1,1",
   "2,4",
   "3,3",
   "3,4",
   "2,5",
   "1,5",
   "1,4",
   "2,3",
   "3,-1",
   "4,-2",
   "4,-1",
   "3,0",
   "2,0",
   "2,-1",
   "3,-2",
   "4,1",
   "5,0",
   "5,1",
   "4,2",
   "3,2",
   "3,1",
   "4,0",
   "5,3",
   "6,2",
   "6,3",
   "5,4",
   "4,4",
   "4,3",
   "5,2"
  ],
  "rangees": [
   {
    "cles": [
     "0,-1",
     "1,-1",
     "2,-1",
     "3,-1",
     "4,-1"
    ],
    "reponses": [
     {
      "mot": "TERME",
      "def": "Un des nombres que l'on additionne."
     }
    ]
   },
   {
    "cles": [
     "-1,0",
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0"
    ],
    "reponses": [
     {
      "mot": "NOTE",
      "def": "Le chiffre du devoir, ou le son de la musique."
     },
     {
      "mot": "CRI",
      "def": "Ce qu'on pousse quand on a peur."
     }
    ]
   },
   {
    "cles": [
     "-1,1",
     "0,1",
     "1,1",
     "2,1",
     "3,1",
     "4,1",
     "5,1"
    ],
    "reponses": [
     {
      "mot": "ERE",
      "def": "Une très longue période de l'histoire."
     },
     {
      "mot": "CENT",
      "def": "Le nombre 100, en toutes lettres."
     }
    ]
   },
   {
    "cles": [
     "0,2",
     "1,2",
     "2,2",
     "3,2",
     "4,2",
     "5,2",
     "6,2"
    ],
    "reponses": [
     {
      "mot": "SOL",
      "def": "Ce sur quoi on marche — ou la note après fa."
     },
     {
      "mot": "VENT",
      "def": "L'air qui se déplace."
     }
    ]
   },
   {
    "cles": [
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
      "mot": "SAIN",
      "def": "En bonne santé."
     },
     {
      "mot": "EPI",
      "def": "La tige où poussent les grains du blé."
     }
    ]
   },
   {
    "cles": [
     "1,4",
     "2,4",
     "3,4",
     "4,4",
     "5,4"
    ],
    "reponses": [
     {
      "mot": "OMBRE",
      "def": "Le sombre que fait un objet au soleil."
     }
    ]
   }
  ],
  "fleurs": [
   {
    "centre": "0,0",
    "petales": [
     "1,-1",
     "1,0",
     "0,1",
     "-1,1",
     "-1,0",
     "0,-1"
    ],
    "mot": "TRENTE",
    "def": "Le nombre 30, en toutes lettres.",
    "maths": true,
    "depart": 1,
    "couleur": "claire"
   },
   {
    "centre": "1,2",
    "petales": [
     "2,1",
     "2,2",
     "1,3",
     "0,3",
     "0,2",
     "1,1"
    ],
    "mot": "CLASSE",
    "def": "Le groupe d'élèves, ou la salle où ils sont.",
    "maths": false,
    "depart": 0,
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
    "mot": "BESOIN",
    "def": "Ce dont on ne peut pas se passer.",
    "maths": false,
    "depart": 1,
    "couleur": "foncee"
   },
   {
    "centre": "3,-1",
    "petales": [
     "4,-2",
     "4,-1",
     "3,0",
     "2,0",
     "2,-1",
     "3,-2"
    ],
    "mot": "CERCLE",
    "def": "Tous ses points sont à la même distance du centre.",
    "maths": true,
    "depart": 2,
    "couleur": "claire"
   },
   {
    "centre": "4,1",
    "petales": [
     "5,0",
     "5,1",
     "4,2",
     "3,2",
     "3,1",
     "4,0"
    ],
    "mot": "VERITE",
    "def": "Ce qui est exact, par opposition au mensonge.",
    "maths": false,
    "depart": 3,
    "couleur": "moyenne"
   },
   {
    "centre": "5,3",
    "petales": [
     "6,2",
     "6,3",
     "5,4",
     "4,4",
     "4,3",
     "5,2"
    ],
    "mot": "ENTIER",
    "def": "Un nombre sans virgule : 0, 1, 2, 3…",
    "maths": true,
    "depart": 4,
    "couleur": "foncee"
   }
  ],
  "signature": "BESOIN CERCLE CLASSE ENTIER TRENTE VERITE"
 },
 {
  "id": "jardin-05",
  "cases": [
   "0,0",
   "1,-1",
   "1,0",
   "0,1",
   "-1,1",
   "-1,0",
   "0,-1",
   "1,2",
   "2,1",
   "2,2",
   "1,3",
   "0,3",
   "0,2",
   "1,1",
   "2,4",
   "3,3",
   "3,4",
   "2,5",
   "1,5",
   "1,4",
   "2,3",
   "3,-1",
   "4,-2",
   "4,-1",
   "3,0",
   "2,0",
   "2,-1",
   "3,-2",
   "4,1",
   "5,0",
   "5,1",
   "4,2",
   "3,2",
   "3,1",
   "4,0",
   "5,3",
   "6,2",
   "6,3",
   "5,4",
   "4,4",
   "4,3",
   "5,2"
  ],
  "rangees": [
   {
    "cles": [
     "0,-1",
     "1,-1",
     "2,-1",
     "3,-1",
     "4,-1"
    ],
    "reponses": [
     {
      "mot": "ECRIT",
      "def": "Tracé sur le papier."
     }
    ]
   },
   {
    "cles": [
     "-1,0",
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0"
    ],
    "reponses": [
     {
      "mot": "SOL",
      "def": "Ce sur quoi on marche — ou la note après fa."
     },
     {
      "mot": "TETE",
      "def": "Elle porte les yeux et les oreilles."
     }
    ]
   },
   {
    "cles": [
     "-1,1",
     "0,1",
     "1,1",
     "2,1",
     "3,1",
     "4,1",
     "5,1"
    ],
    "reponses": [
     {
      "mot": "SAGE",
      "def": "Qui se tient tranquille."
     },
     {
      "mot": "ART",
      "def": "La peinture, la musique et la sculpture en font partie."
     }
    ]
   },
   {
    "cles": [
     "0,2",
     "1,2",
     "2,2",
     "3,2",
     "4,2",
     "5,2",
     "6,2"
    ],
    "reponses": [
     {
      "mot": "ARC",
      "def": "On y tend une corde pour lancer une flèche."
     },
     {
      "mot": "MONT",
      "def": "Un relief élevé, que l'on gravit."
     }
    ]
   },
   {
    "cles": [
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
      "mot": "DOS",
      "def": "On s'y allonge pour regarder le ciel."
     },
     {
      "mot": "TARD",
      "def": "Le contraire de tôt."
     }
    ]
   },
   {
    "cles": [
     "1,4",
     "2,4",
     "3,4",
     "4,4",
     "5,4"
    ],
    "reponses": [
     {
      "mot": "ELEVE",
      "def": "Celui qui apprend, assis à sa table."
     }
    ]
   }
  ],
  "fleurs": [
   {
    "centre": "0,0",
    "petales": [
     "1,-1",
     "1,0",
     "0,1",
     "-1,1",
     "-1,0",
     "0,-1"
    ],
    "mot": "CLASSE",
    "def": "Le groupe d'élèves, ou la salle où ils sont.",
    "maths": false,
    "depart": 0,
    "couleur": "claire"
   },
   {
    "centre": "1,2",
    "petales": [
     "2,1",
     "2,2",
     "1,3",
     "0,3",
     "0,2",
     "1,1"
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
    "mot": "RESTER",
    "def": "Ne pas bouger de l'endroit où l'on est.",
    "maths": false,
    "depart": 3,
    "couleur": "foncee"
   },
   {
    "centre": "3,-1",
    "petales": [
     "4,-2",
     "4,-1",
     "3,0",
     "2,0",
     "2,-1",
     "3,-2"
    ],
    "mot": "TRENTE",
    "def": "Le nombre 30, en toutes lettres.",
    "maths": true,
    "depart": 3,
    "couleur": "claire"
   },
   {
    "centre": "4,1",
    "petales": [
     "5,0",
     "5,1",
     "4,2",
     "3,2",
     "3,1",
     "4,0"
    ],
    "mot": "TOMATE",
    "def": "Le fruit rouge de la salade.",
    "maths": false,
    "depart": 1,
    "couleur": "moyenne"
   },
   {
    "centre": "5,3",
    "petales": [
     "6,2",
     "6,3",
     "5,4",
     "4,4",
     "4,3",
     "5,2"
    ],
    "mot": "DEVANT",
    "def": "Le contraire de derrière.",
    "maths": false,
    "depart": 1,
    "couleur": "foncee"
   }
  ],
  "signature": "CLASSE CODAGE DEVANT RESTER TOMATE TRENTE"
 },
 {
  "id": "jardin-06",
  "cases": [
   "0,0",
   "1,-1",
   "1,0",
   "0,1",
   "-1,1",
   "-1,0",
   "0,-1",
   "1,2",
   "2,1",
   "2,2",
   "1,3",
   "0,3",
   "0,2",
   "1,1",
   "2,4",
   "3,3",
   "3,4",
   "2,5",
   "1,5",
   "1,4",
   "2,3",
   "3,-1",
   "4,-2",
   "4,-1",
   "3,0",
   "2,0",
   "2,-1",
   "3,-2",
   "4,1",
   "5,0",
   "5,1",
   "4,2",
   "3,2",
   "3,1",
   "4,0",
   "5,3",
   "6,2",
   "6,3",
   "5,4",
   "4,4",
   "4,3",
   "5,2"
  ],
  "rangees": [
   {
    "cles": [
     "0,-1",
     "1,-1",
     "2,-1",
     "3,-1",
     "4,-1"
    ],
    "reponses": [
     {
      "mot": "TERRE",
      "def": "Notre planète, ou ce qu'on retourne au jardin."
     }
    ]
   },
   {
    "cles": [
     "-1,0",
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0"
    ],
    "reponses": [
     {
      "mot": "NOTE",
      "def": "Le chiffre du devoir, ou le son de la musique."
     },
     {
      "mot": "CRI",
      "def": "Ce qu'on pousse quand on a peur."
     }
    ]
   },
   {
    "cles": [
     "-1,1",
     "0,1",
     "1,1",
     "2,1",
     "3,1",
     "4,1",
     "5,1"
    ],
    "reponses": [
     {
      "mot": "ERE",
      "def": "Une très longue période de l'histoire."
     },
     {
      "mot": "VERT",
      "def": "La couleur de l'herbe."
     }
    ]
   },
   {
    "cles": [
     "0,2",
     "1,2",
     "2,2",
     "3,2",
     "4,2",
     "5,2",
     "6,2"
    ],
    "reponses": [
     {
      "mot": "DUO",
      "def": "Deux musiciens qui jouent ensemble."
     },
     {
      "mot": "VENT",
      "def": "L'air qui se déplace."
     }
    ]
   },
   {
    "cles": [
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
      "mot": "RIRE",
      "def": "Ce qu'on fait quand c'est drôle."
     },
     {
      "mot": "EPI",
      "def": "La tige où poussent les grains du blé."
     }
    ]
   },
   {
    "cles": [
     "1,4",
     "2,4",
     "3,4",
     "4,4",
     "5,4"
    ],
    "reponses": [
     {
      "mot": "DEGRE",
      "def": "L'unité qui mesure les angles."
     }
    ]
   }
  ],
  "fleurs": [
   {
    "centre": "0,0",
    "petales": [
     "1,-1",
     "1,0",
     "0,1",
     "-1,1",
     "-1,0",
     "0,-1"
    ],
    "mot": "TRENTE",
    "def": "Le nombre 30, en toutes lettres.",
    "maths": true,
    "depart": 1,
    "couleur": "claire"
   },
   {
    "centre": "1,2",
    "petales": [
     "2,1",
     "2,2",
     "1,3",
     "0,3",
     "0,2",
     "1,1"
    ],
    "mot": "DEVOIR",
    "def": "Le travail à rendre au professeur.",
    "maths": false,
    "depart": 4,
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
    "mot": "REGARD",
    "def": "Ce qu'on pose sur ce qu'on observe.",
    "maths": false,
    "depart": 5,
    "couleur": "foncee"
   },
   {
    "centre": "3,-1",
    "petales": [
     "4,-2",
     "4,-1",
     "3,0",
     "2,0",
     "2,-1",
     "3,-2"
    ],
    "mot": "CERCLE",
    "def": "Tous ses points sont à la même distance du centre.",
    "maths": true,
    "depart": 2,
    "couleur": "claire"
   },
   {
    "centre": "4,1",
    "petales": [
     "5,0",
     "5,1",
     "4,2",
     "3,2",
     "3,1",
     "4,0"
    ],
    "mot": "VERITE",
    "def": "Ce qui est exact, par opposition au mensonge.",
    "maths": false,
    "depart": 3,
    "couleur": "moyenne"
   },
   {
    "centre": "5,3",
    "petales": [
     "6,2",
     "6,3",
     "5,4",
     "4,4",
     "4,3",
     "5,2"
    ],
    "mot": "ENTIER",
    "def": "Un nombre sans virgule : 0, 1, 2, 3…",
    "maths": true,
    "depart": 4,
    "couleur": "foncee"
   }
  ],
  "signature": "CERCLE DEVOIR ENTIER REGARD TRENTE VERITE"
 },
 {
  "id": "jardin-07",
  "cases": [
   "0,0",
   "1,-1",
   "1,0",
   "0,1",
   "-1,1",
   "-1,0",
   "0,-1",
   "1,2",
   "2,1",
   "2,2",
   "1,3",
   "0,3",
   "0,2",
   "1,1",
   "2,4",
   "3,3",
   "3,4",
   "2,5",
   "1,5",
   "1,4",
   "2,3",
   "3,-1",
   "4,-2",
   "4,-1",
   "3,0",
   "2,0",
   "2,-1",
   "3,-2",
   "4,1",
   "5,0",
   "5,1",
   "4,2",
   "3,2",
   "3,1",
   "4,0",
   "5,3",
   "6,2",
   "6,3",
   "5,4",
   "4,4",
   "4,3",
   "5,2"
  ],
  "rangees": [
   {
    "cles": [
     "0,-1",
     "1,-1",
     "2,-1",
     "3,-1",
     "4,-1"
    ],
    "reponses": [
     {
      "mot": "ENTRE",
      "def": "Au milieu de deux choses."
     }
    ]
   },
   {
    "cles": [
     "-1,0",
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0"
    ],
    "reponses": [
     {
      "mot": "COTE",
      "def": "Le bord de la mer."
     },
     {
      "mot": "PUR",
      "def": "Sans aucun mélange."
     }
    ]
   },
   {
    "cles": [
     "-1,1",
     "0,1",
     "1,1",
     "2,1",
     "3,1",
     "4,1",
     "5,1"
    ],
    "reponses": [
     {
      "mot": "ERE",
      "def": "Une très longue période de l'histoire."
     },
     {
      "mot": "SOUS",
      "def": "Le contraire de sur."
     }
    ]
   },
   {
    "cles": [
     "0,2",
     "1,2",
     "2,2",
     "3,2",
     "4,2",
     "5,2",
     "6,2"
    ],
    "reponses": [
     {
      "mot": "LOT",
      "def": "Ce qu'on gagne à la tombola."
     },
     {
      "mot": "CENT",
      "def": "Le nombre 100, en toutes lettres."
     }
    ]
   },
   {
    "cles": [
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
      "mot": "BAIE",
      "def": "Un petit fruit rond, ou une échancrure de la côte."
     },
     {
      "mot": "EPI",
      "def": "La tige où poussent les grains du blé."
     }
    ]
   },
   {
    "cles": [
     "1,4",
     "2,4",
     "3,4",
     "4,4",
     "5,4"
    ],
    "reponses": [
     {
      "mot": "VERRE",
      "def": "On y boit, et il casse."
     }
    ]
   }
  ],
  "fleurs": [
   {
    "centre": "0,0",
    "petales": [
     "1,-1",
     "1,0",
     "0,1",
     "-1,1",
     "-1,0",
     "0,-1"
    ],
    "mot": "CENTRE",
    "def": "Le point du milieu, à égale distance de tout le bord.",
    "maths": true,
    "depart": 4,
    "couleur": "claire"
   },
   {
    "centre": "1,2",
    "petales": [
     "2,1",
     "2,2",
     "1,3",
     "0,3",
     "0,2",
     "1,1"
    ],
    "mot": "TABLES",
    "def": "On y pose les cahiers, au pluriel.",
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
    "mot": "LEVIER",
    "def": "La barre qui aide à soulever.",
    "maths": false,
    "depart": 2,
    "couleur": "foncee"
   },
   {
    "centre": "3,-1",
    "petales": [
     "4,-2",
     "4,-1",
     "3,0",
     "2,0",
     "2,-1",
     "3,-2"
    ],
    "mot": "PETITE",
    "def": "De taille réduite, au féminin.",
    "maths": false,
    "depart": 2,
    "couleur": "claire"
   },
   {
    "centre": "4,1",
    "petales": [
     "5,0",
     "5,1",
     "4,2",
     "3,2",
     "3,1",
     "4,0"
    ],
    "mot": "COURSE",
    "def": "On la gagne en arrivant le premier.",
    "maths": false,
    "depart": 3,
    "couleur": "moyenne"
   },
   {
    "centre": "5,3",
    "petales": [
     "6,2",
     "6,3",
     "5,4",
     "4,4",
     "4,3",
     "5,2"
    ],
    "mot": "ENTIER",
    "def": "Un nombre sans virgule : 0, 1, 2, 3…",
    "maths": true,
    "depart": 4,
    "couleur": "foncee"
   }
  ],
  "signature": "CENTRE COURSE ENTIER LEVIER PETITE TABLES"
 },
 {
  "id": "jardin-08",
  "cases": [
   "0,0",
   "1,-1",
   "1,0",
   "0,1",
   "-1,1",
   "-1,0",
   "0,-1",
   "1,2",
   "2,1",
   "2,2",
   "1,3",
   "0,3",
   "0,2",
   "1,1",
   "2,4",
   "3,3",
   "3,4",
   "2,5",
   "1,5",
   "1,4",
   "2,3",
   "3,-1",
   "4,-2",
   "4,-1",
   "3,0",
   "2,0",
   "2,-1",
   "3,-2",
   "4,1",
   "5,0",
   "5,1",
   "4,2",
   "3,2",
   "3,1",
   "4,0",
   "5,3",
   "6,2",
   "6,3",
   "5,4",
   "4,4",
   "4,3",
   "5,2"
  ],
  "rangees": [
   {
    "cles": [
     "0,-1",
     "1,-1",
     "2,-1",
     "3,-1",
     "4,-1"
    ],
    "reponses": [
     {
      "mot": "TERME",
      "def": "Un des nombres que l'on additionne."
     }
    ]
   },
   {
    "cles": [
     "-1,0",
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0"
    ],
    "reponses": [
     {
      "mot": "NOTE",
      "def": "Le chiffre du devoir, ou le son de la musique."
     },
     {
      "mot": "VER",
      "def": "Il n'a pas de pattes et vit dans la terre."
     }
    ]
   },
   {
    "cles": [
     "-1,1",
     "0,1",
     "1,1",
     "2,1",
     "3,1",
     "4,1",
     "5,1"
    ],
    "reponses": [
     {
      "mot": "ERE",
      "def": "Une très longue période de l'histoire."
     },
     {
      "mot": "CIEL",
      "def": "Ce qu'on voit en levant la tête dehors."
     }
    ]
   },
   {
    "cles": [
     "0,2",
     "1,2",
     "2,2",
     "3,2",
     "4,2",
     "5,2",
     "6,2"
    ],
    "reponses": [
     {
      "mot": "SOL",
      "def": "Ce sur quoi on marche — ou la note après fa."
     },
     {
      "mot": "VENT",
      "def": "L'air qui se déplace."
     }
    ]
   },
   {
    "cles": [
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
      "mot": "SAIN",
      "def": "En bonne santé."
     },
     {
      "mot": "EPI",
      "def": "La tige où poussent les grains du blé."
     }
    ]
   },
   {
    "cles": [
     "1,4",
     "2,4",
     "3,4",
     "4,4",
     "5,4"
    ],
    "reponses": [
     {
      "mot": "OMBRE",
      "def": "Le sombre que fait un objet au soleil."
     }
    ]
   }
  ],
  "fleurs": [
   {
    "centre": "0,0",
    "petales": [
     "1,-1",
     "1,0",
     "0,1",
     "-1,1",
     "-1,0",
     "0,-1"
    ],
    "mot": "TRENTE",
    "def": "Le nombre 30, en toutes lettres.",
    "maths": true,
    "depart": 1,
    "couleur": "claire"
   },
   {
    "centre": "1,2",
    "petales": [
     "2,1",
     "2,2",
     "1,3",
     "0,3",
     "0,2",
     "1,1"
    ],
    "mot": "CLASSE",
    "def": "Le groupe d'élèves, ou la salle où ils sont.",
    "maths": false,
    "depart": 0,
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
    "mot": "BESOIN",
    "def": "Ce dont on ne peut pas se passer.",
    "maths": false,
    "depart": 1,
    "couleur": "foncee"
   },
   {
    "centre": "3,-1",
    "petales": [
     "4,-2",
     "4,-1",
     "3,0",
     "2,0",
     "2,-1",
     "3,-2"
    ],
    "mot": "VERITE",
    "def": "Ce qui est exact, par opposition au mensonge.",
    "maths": false,
    "depart": 2,
    "couleur": "claire"
   },
   {
    "centre": "4,1",
    "petales": [
     "5,0",
     "5,1",
     "4,2",
     "3,2",
     "3,1",
     "4,0"
    ],
    "mot": "LEVIER",
    "def": "La barre qui aide à soulever.",
    "maths": false,
    "depart": 1,
    "couleur": "moyenne"
   },
   {
    "centre": "5,3",
    "petales": [
     "6,2",
     "6,3",
     "5,4",
     "4,4",
     "4,3",
     "5,2"
    ],
    "mot": "ENTIER",
    "def": "Un nombre sans virgule : 0, 1, 2, 3…",
    "maths": true,
    "depart": 4,
    "couleur": "foncee"
   }
  ],
  "signature": "BESOIN CLASSE ENTIER LEVIER TRENTE VERITE"
 },
 {
  "id": "jardin-09",
  "cases": [
   "0,0",
   "1,-1",
   "1,0",
   "0,1",
   "-1,1",
   "-1,0",
   "0,-1",
   "1,2",
   "2,1",
   "2,2",
   "1,3",
   "0,3",
   "0,2",
   "1,1",
   "2,4",
   "3,3",
   "3,4",
   "2,5",
   "1,5",
   "1,4",
   "2,3",
   "3,-1",
   "4,-2",
   "4,-1",
   "3,0",
   "2,0",
   "2,-1",
   "3,-2",
   "4,1",
   "5,0",
   "5,1",
   "4,2",
   "3,2",
   "3,1",
   "4,0",
   "5,3",
   "6,2",
   "6,3",
   "5,4",
   "4,4",
   "4,3",
   "5,2"
  ],
  "rangees": [
   {
    "cles": [
     "0,-1",
     "1,-1",
     "2,-1",
     "3,-1",
     "4,-1"
    ],
    "reponses": [
     {
      "mot": "TERRE",
      "def": "Notre planète, ou ce qu'on retourne au jardin."
     }
    ]
   },
   {
    "cles": [
     "-1,0",
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0"
    ],
    "reponses": [
     {
      "mot": "NOTE",
      "def": "Le chiffre du devoir, ou le son de la musique."
     },
     {
      "mot": "CRI",
      "def": "Ce qu'on pousse quand on a peur."
     }
    ]
   },
   {
    "cles": [
     "-1,1",
     "0,1",
     "1,1",
     "2,1",
     "3,1",
     "4,1",
     "5,1"
    ],
    "reponses": [
     {
      "mot": "ERE",
      "def": "Une très longue période de l'histoire."
     },
     {
      "mot": "SEPT",
      "def": "Le nombre 7, en toutes lettres."
     }
    ]
   },
   {
    "cles": [
     "0,2",
     "1,2",
     "2,2",
     "3,2",
     "4,2",
     "5,2",
     "6,2"
    ],
    "reponses": [
     {
      "mot": "LIT",
      "def": "On s'y couche pour dormir."
     },
     {
      "mot": "VERT",
      "def": "La couleur de l'herbe."
     }
    ]
   },
   {
    "cles": [
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
      "mot": "BAIE",
      "def": "Un petit fruit rond, ou une échancrure de la côte."
     },
     {
      "mot": "ODE",
      "def": "Un poème qui chante les louanges de quelque chose."
     }
    ]
   },
   {
    "cles": [
     "1,4",
     "2,4",
     "3,4",
     "4,4",
     "5,4"
    ],
    "reponses": [
     {
      "mot": "TEMPS",
      "def": "Les heures qui passent."
     }
    ]
   }
  ],
  "fleurs": [
   {
    "centre": "0,0",
    "petales": [
     "1,-1",
     "1,0",
     "0,1",
     "-1,1",
     "-1,0",
     "0,-1"
    ],
    "mot": "TRENTE",
    "def": "Le nombre 30, en toutes lettres.",
    "maths": true,
    "depart": 1,
    "couleur": "claire"
   },
   {
    "centre": "1,2",
    "petales": [
     "2,1",
     "2,2",
     "1,3",
     "0,3",
     "0,2",
     "1,1"
    ],
    "mot": "TABLES",
    "def": "On y pose les cahiers, au pluriel.",
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
    "mot": "MOITIE",
    "def": "Deux fois moins.",
    "maths": true,
    "depart": 1,
    "couleur": "foncee"
   },
   {
    "centre": "3,-1",
    "petales": [
     "4,-2",
     "4,-1",
     "3,0",
     "2,0",
     "2,-1",
     "3,-2"
    ],
    "mot": "CERCLE",
    "def": "Tous ses points sont à la même distance du centre.",
    "maths": true,
    "depart": 2,
    "couleur": "claire"
   },
   {
    "centre": "4,1",
    "petales": [
     "5,0",
     "5,1",
     "4,2",
     "3,2",
     "3,1",
     "4,0"
    ],
    "mot": "VERITE",
    "def": "Ce qui est exact, par opposition au mensonge.",
    "maths": false,
    "depart": 3,
    "couleur": "moyenne"
   },
   {
    "centre": "5,3",
    "petales": [
     "6,2",
     "6,3",
     "5,4",
     "4,4",
     "4,3",
     "5,2"
    ],
    "mot": "PORTES",
    "def": "On les ouvre pour entrer, au pluriel.",
    "maths": false,
    "depart": 3,
    "couleur": "foncee"
   }
  ],
  "signature": "CERCLE MOITIE PORTES TABLES TRENTE VERITE"
 },
 {
  "id": "jardin-10",
  "cases": [
   "0,0",
   "1,-1",
   "1,0",
   "0,1",
   "-1,1",
   "-1,0",
   "0,-1",
   "1,2",
   "2,1",
   "2,2",
   "1,3",
   "0,3",
   "0,2",
   "1,1",
   "2,4",
   "3,3",
   "3,4",
   "2,5",
   "1,5",
   "1,4",
   "2,3",
   "3,-1",
   "4,-2",
   "4,-1",
   "3,0",
   "2,0",
   "2,-1",
   "3,-2",
   "4,1",
   "5,0",
   "5,1",
   "4,2",
   "3,2",
   "3,1",
   "4,0",
   "5,3",
   "6,2",
   "6,3",
   "5,4",
   "4,4",
   "4,3",
   "5,2"
  ],
  "rangees": [
   {
    "cles": [
     "0,-1",
     "1,-1",
     "2,-1",
     "3,-1",
     "4,-1"
    ],
    "reponses": [
     {
      "mot": "HEURE",
      "def": "Soixante minutes."
     }
    ]
   },
   {
    "cles": [
     "-1,0",
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0"
    ],
    "reponses": [
     {
      "mot": "CAVE",
      "def": "La pièce sous la maison."
     },
     {
      "mot": "VIN",
      "def": "La boisson tirée du raisin."
     }
    ]
   },
   {
    "cles": [
     "-1,1",
     "0,1",
     "1,1",
     "2,1",
     "3,1",
     "4,1",
     "5,1"
    ],
    "reponses": [
     {
      "mot": "LAIT",
      "def": "Le blanc que donne la vache."
     },
     {
      "mot": "CLE",
      "def": "Elle ouvre la porte."
     }
    ]
   },
   {
    "cles": [
     "0,2",
     "1,2",
     "2,2",
     "3,2",
     "4,2",
     "5,2",
     "6,2"
    ],
    "reponses": [
     {
      "mot": "OUI",
      "def": "La réponse qui accepte."
     },
     {
      "mot": "ARME",
      "def": "L'épée et le fusil en sont."
     }
    ]
   },
   {
    "cles": [
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
      "mot": "MERE",
      "def": "Elle a mis ses enfants au monde."
     },
     {
      "mot": "MOT",
      "def": "Une suite de lettres qui veut dire quelque chose."
     }
    ]
   },
   {
    "cles": [
     "1,4",
     "2,4",
     "3,4",
     "4,4",
     "5,4"
    ],
    "reponses": [
     {
      "mot": "REPOS",
      "def": "Ce qu'on prend quand on est fatigué."
     }
    ]
   }
  ],
  "fleurs": [
   {
    "centre": "0,0",
    "petales": [
     "1,-1",
     "1,0",
     "0,1",
     "-1,1",
     "-1,0",
     "0,-1"
    ],
    "mot": "CHEVAL",
    "def": "On le monte, il galope.",
    "maths": false,
    "depart": 4,
    "couleur": "claire"
   },
   {
    "centre": "1,2",
    "petales": [
     "2,1",
     "2,2",
     "1,3",
     "0,3",
     "0,2",
     "1,1"
    ],
    "mot": "MOITIE",
    "def": "Deux fois moins.",
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
    "mot": "PIERRE",
    "def": "Le caillou dur du chemin.",
    "maths": false,
    "depart": 1,
    "couleur": "foncee"
   },
   {
    "centre": "3,-1",
    "petales": [
     "4,-2",
     "4,-1",
     "3,0",
     "2,0",
     "2,-1",
     "3,-2"
    ],
    "mot": "CHEVEU",
    "def": "Il pousse sur la tête.",
    "maths": false,
    "depart": 5,
    "couleur": "claire"
   },
   {
    "centre": "4,1",
    "petales": [
     "5,0",
     "5,1",
     "4,2",
     "3,2",
     "3,1",
     "4,0"
    ],
    "mot": "RACINE",
    "def": "L'opération qui revient du carré à la longueur.",
    "maths": true,
    "depart": 2,
    "couleur": "moyenne"
   },
   {
    "centre": "5,3",
    "petales": [
     "6,2",
     "6,3",
     "5,4",
     "4,4",
     "4,3",
     "5,2"
    ],
    "mot": "SOMMET",
    "def": "Le point où deux côtés se rejoignent.",
    "maths": true,
    "depart": 2,
    "couleur": "foncee"
   }
  ],
  "signature": "CHEVAL CHEVEU MOITIE PIERRE RACINE SOMMET"
 },
 {
  "id": "jardin-11",
  "cases": [
   "0,0",
   "1,-1",
   "1,0",
   "0,1",
   "-1,1",
   "-1,0",
   "0,-1",
   "1,2",
   "2,1",
   "2,2",
   "1,3",
   "0,3",
   "0,2",
   "1,1",
   "2,4",
   "3,3",
   "3,4",
   "2,5",
   "1,5",
   "1,4",
   "2,3",
   "3,-1",
   "4,-2",
   "4,-1",
   "3,0",
   "2,0",
   "2,-1",
   "3,-2",
   "4,1",
   "5,0",
   "5,1",
   "4,2",
   "3,2",
   "3,1",
   "4,0",
   "5,3",
   "6,2",
   "6,3",
   "5,4",
   "4,4",
   "4,3",
   "5,2"
  ],
  "rangees": [
   {
    "cles": [
     "0,-1",
     "1,-1",
     "2,-1",
     "3,-1",
     "4,-1"
    ],
    "reponses": [
     {
      "mot": "PORTE",
      "def": "On l'ouvre pour entrer."
     }
    ]
   },
   {
    "cles": [
     "-1,0",
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0"
    ],
    "reponses": [
     {
      "mot": "TOUT",
      "def": "La chose entière, sans rien laisser."
     },
     {
      "mot": "NID",
      "def": "La maison de l'oiseau."
     }
    ]
   },
   {
    "cles": [
     "-1,1",
     "0,1",
     "1,1",
     "2,1",
     "3,1",
     "4,1",
     "5,1"
    ],
    "reponses": [
     {
      "mot": "ELAN",
      "def": "La course qu'on prend avant de sauter."
     },
     {
      "mot": "PIE",
      "def": "L'oiseau noir et blanc qui vole ce qui brille."
     }
    ]
   },
   {
    "cles": [
     "0,2",
     "1,2",
     "2,2",
     "3,2",
     "4,2",
     "5,2",
     "6,2"
    ],
    "reponses": [
     {
      "mot": "LOT",
      "def": "Ce qu'on gagne à la tombola."
     },
     {
      "mot": "ARME",
      "def": "L'épée et le fusil en sont."
     }
    ]
   },
   {
    "cles": [
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
      "mot": "PERE",
      "def": "Il a des enfants."
     },
     {
      "mot": "MOT",
      "def": "Une suite de lettres qui veut dire quelque chose."
     }
    ]
   },
   {
    "cles": [
     "1,4",
     "2,4",
     "3,4",
     "4,4",
     "5,4"
    ],
    "reponses": [
     {
      "mot": "REPOS",
      "def": "Ce qu'on prend quand on est fatigué."
     }
    ]
   }
  ],
  "fleurs": [
   {
    "centre": "0,0",
    "petales": [
     "1,-1",
     "1,0",
     "0,1",
     "-1,1",
     "-1,0",
     "0,-1"
    ],
    "mot": "POULET",
    "def": "Le jeune coq qu'on fait rôtir.",
    "maths": false,
    "depart": 5,
    "couleur": "claire"
   },
   {
    "centre": "1,2",
    "petales": [
     "2,1",
     "2,2",
     "1,3",
     "0,3",
     "0,2",
     "1,1"
    ],
    "mot": "PLANTE",
    "def": "Elle pousse et a besoin d'eau.",
    "maths": false,
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
    "mot": "PIERRE",
    "def": "Le caillou dur du chemin.",
    "maths": false,
    "depart": 1,
    "couleur": "foncee"
   },
   {
    "centre": "3,-1",
    "petales": [
     "4,-2",
     "4,-1",
     "3,0",
     "2,0",
     "2,-1",
     "3,-2"
    ],
    "mot": "CENTRE",
    "def": "Le point du milieu, à égale distance de tout le bord.",
    "maths": true,
    "depart": 0,
    "couleur": "claire"
   },
   {
    "centre": "4,1",
    "petales": [
     "5,0",
     "5,1",
     "4,2",
     "3,2",
     "3,1",
     "4,0"
    ],
    "mot": "RAPIDE",
    "def": "Qui va vite.",
    "maths": false,
    "depart": 2,
    "couleur": "moyenne"
   },
   {
    "centre": "5,3",
    "petales": [
     "6,2",
     "6,3",
     "5,4",
     "4,4",
     "4,3",
     "5,2"
    ],
    "mot": "SOMMET",
    "def": "Le point où deux côtés se rejoignent.",
    "maths": true,
    "depart": 2,
    "couleur": "foncee"
   }
  ],
  "signature": "CENTRE PIERRE PLANTE POULET RAPIDE SOMMET"
 },
 {
  "id": "jardin-12",
  "cases": [
   "0,0",
   "1,-1",
   "1,0",
   "0,1",
   "-1,1",
   "-1,0",
   "0,-1",
   "1,2",
   "2,1",
   "2,2",
   "1,3",
   "0,3",
   "0,2",
   "1,1",
   "2,4",
   "3,3",
   "3,4",
   "2,5",
   "1,5",
   "1,4",
   "2,3",
   "3,-1",
   "4,-2",
   "4,-1",
   "3,0",
   "2,0",
   "2,-1",
   "3,-2",
   "4,1",
   "5,0",
   "5,1",
   "4,2",
   "3,2",
   "3,1",
   "4,0",
   "5,3",
   "6,2",
   "6,3",
   "5,4",
   "4,4",
   "4,3",
   "5,2"
  ],
  "rangees": [
   {
    "cles": [
     "0,-1",
     "1,-1",
     "2,-1",
     "3,-1",
     "4,-1"
    ],
    "reponses": [
     {
      "mot": "PARIS",
      "def": "La capitale de la France."
     }
    ]
   },
   {
    "cles": [
     "-1,0",
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0"
    ],
    "reponses": [
     {
      "mot": "RIRE",
      "def": "Ce qu'on fait quand c'est drôle."
     },
     {
      "mot": "FOI",
      "def": "Ce qu'on a quand on croit sans preuve."
     }
    ]
   },
   {
    "cles": [
     "-1,1",
     "0,1",
     "1,1",
     "2,1",
     "3,1",
     "4,1",
     "5,1"
    ],
    "reponses": [
     {
      "mot": "ELAN",
      "def": "La course qu'on prend avant de sauter."
     },
     {
      "mot": "RAT",
      "def": "Le rongeur gris des égouts."
     }
    ]
   },
   {
    "cles": [
     "0,2",
     "1,2",
     "2,2",
     "3,2",
     "4,2",
     "5,2",
     "6,2"
    ],
    "reponses": [
     {
      "mot": "LOT",
      "def": "Ce qu'on gagne à la tombola."
     },
     {
      "mot": "DENT",
      "def": "On s'en sert pour mâcher."
     }
    ]
   },
   {
    "cles": [
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
      "mot": "PERE",
      "def": "Il a des enfants."
     },
     {
      "mot": "EPI",
      "def": "La tige où poussent les grains du blé."
     }
    ]
   },
   {
    "cles": [
     "1,4",
     "2,4",
     "3,4",
     "4,4",
     "5,4"
    ],
    "reponses": [
     {
      "mot": "DEGRE",
      "def": "L'unité qui mesure les angles."
     }
    ]
   }
  ],
  "fleurs": [
   {
    "centre": "0,0",
    "petales": [
     "1,-1",
     "1,0",
     "0,1",
     "-1,1",
     "-1,0",
     "0,-1"
    ],
    "mot": "PARLER",
    "def": "Se servir de sa voix pour dire.",
    "maths": false,
    "depart": 5,
    "couleur": "claire"
   },
   {
    "centre": "1,2",
    "petales": [
     "2,1",
     "2,2",
     "1,3",
     "0,3",
     "0,2",
     "1,1"
    ],
    "mot": "PLANTE",
    "def": "Elle pousse et a besoin d'eau.",
    "maths": false,
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
    "mot": "REGARD",
    "def": "Ce qu'on pose sur ce qu'on observe.",
    "maths": false,
    "depart": 5,
    "couleur": "foncee"
   },
   {
    "centre": "3,-1",
    "petales": [
     "4,-2",
     "4,-1",
     "3,0",
     "2,0",
     "2,-1",
     "3,-2"
    ],
    "mot": "FERMES",
    "def": "Les maisons du paysan, au pluriel.",
    "maths": false,
    "depart": 2,
    "couleur": "claire"
   },
   {
    "centre": "4,1",
    "petales": [
     "5,0",
     "5,1",
     "4,2",
     "3,2",
     "3,1",
     "4,0"
    ],
    "mot": "DROITE",
    "def": "Illimitée des deux côtés, elle n'a ni début ni fin.",
    "maths": true,
    "depart": 3,
    "couleur": "moyenne"
   },
   {
    "centre": "5,3",
    "petales": [
     "6,2",
     "6,3",
     "5,4",
     "4,4",
     "4,3",
     "5,2"
    ],
    "mot": "ENTIER",
    "def": "Un nombre sans virgule : 0, 1, 2, 3…",
    "maths": true,
    "depart": 4,
    "couleur": "foncee"
   }
  ],
  "signature": "DROITE ENTIER FERMES PARLER PLANTE REGARD"
 },
 {
  "id": "jardin-13",
  "cases": [
   "0,0",
   "1,-1",
   "1,0",
   "0,1",
   "-1,1",
   "-1,0",
   "0,-1",
   "1,2",
   "2,1",
   "2,2",
   "1,3",
   "0,3",
   "0,2",
   "1,1",
   "2,4",
   "3,3",
   "3,4",
   "2,5",
   "1,5",
   "1,4",
   "2,3",
   "3,-1",
   "4,-2",
   "4,-1",
   "3,0",
   "2,0",
   "2,-1",
   "3,-2",
   "4,1",
   "5,0",
   "5,1",
   "4,2",
   "3,2",
   "3,1",
   "4,0",
   "5,3",
   "6,2",
   "6,3",
   "5,4",
   "4,4",
   "4,3",
   "5,2"
  ],
  "rangees": [
   {
    "cles": [
     "0,-1",
     "1,-1",
     "2,-1",
     "3,-1",
     "4,-1"
    ],
    "reponses": [
     {
      "mot": "TEMPS",
      "def": "Les heures qui passent."
     }
    ]
   },
   {
    "cles": [
     "-1,0",
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0"
    ],
    "reponses": [
     {
      "mot": "ART",
      "def": "La peinture, la musique et la sculpture en font partie."
     },
     {
      "mot": "MONT",
      "def": "Un relief élevé, que l'on gravit."
     }
    ]
   },
   {
    "cles": [
     "-1,1",
     "0,1",
     "1,1",
     "2,1",
     "3,1",
     "4,1",
     "5,1"
    ],
    "reponses": [
     {
      "mot": "MOI",
      "def": "Celui qui parle, quand il parle de lui."
     },
     {
      "mot": "TARD",
      "def": "Le contraire de tôt."
     }
    ]
   },
   {
    "cles": [
     "0,2",
     "1,2",
     "2,2",
     "3,2",
     "4,2",
     "5,2",
     "6,2"
    ],
    "reponses": [
     {
      "mot": "THE",
      "def": "La boisson chaude aux feuilles infusées."
     },
     {
      "mot": "VENT",
      "def": "L'air qui se déplace."
     }
    ]
   },
   {
    "cles": [
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
      "mot": "EPEE",
      "def": "L'arme longue et pointue du mousquetaire."
     },
     {
      "mot": "EPI",
      "def": "La tige où poussent les grains du blé."
     }
    ]
   },
   {
    "cles": [
     "1,4",
     "2,4",
     "3,4",
     "4,4",
     "5,4"
    ],
    "reponses": [
     {
      "mot": "LITRE",
      "def": "L'unité des contenances."
     }
    ]
   }
  ],
  "fleurs": [
   {
    "centre": "0,0",
    "petales": [
     "1,-1",
     "1,0",
     "0,1",
     "-1,1",
     "-1,0",
     "0,-1"
    ],
    "mot": "TOMATE",
    "def": "Le fruit rouge de la salade.",
    "maths": false,
    "depart": 1,
    "couleur": "claire"
   },
   {
    "centre": "1,2",
    "petales": [
     "2,1",
     "2,2",
     "1,3",
     "0,3",
     "0,2",
     "1,1"
    ],
    "mot": "PETITE",
    "def": "De taille réduite, au féminin.",
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
    "mot": "ETOILE",
    "def": "Elle brille la nuit, très loin.",
    "maths": false,
    "depart": 0,
    "couleur": "foncee"
   },
   {
    "centre": "3,-1",
    "petales": [
     "4,-2",
     "4,-1",
     "3,0",
     "2,0",
     "2,-1",
     "3,-2"
    ],
    "mot": "SOMMET",
    "def": "Le point où deux côtés se rejoignent.",
    "maths": true,
    "depart": 1,
    "couleur": "claire"
   },
   {
    "centre": "4,1",
    "petales": [
     "5,0",
     "5,1",
     "4,2",
     "3,2",
     "3,1",
     "4,0"
    ],
    "mot": "DEVANT",
    "def": "Le contraire de derrière.",
    "maths": false,
    "depart": 1,
    "couleur": "moyenne"
   },
   {
    "centre": "5,3",
    "petales": [
     "6,2",
     "6,3",
     "5,4",
     "4,4",
     "4,3",
     "5,2"
    ],
    "mot": "ENTIER",
    "def": "Un nombre sans virgule : 0, 1, 2, 3…",
    "maths": true,
    "depart": 4,
    "couleur": "foncee"
   }
  ],
  "signature": "DEVANT ENTIER ETOILE PETITE SOMMET TOMATE"
 },
 {
  "id": "jardin-14",
  "cases": [
   "0,0",
   "1,-1",
   "1,0",
   "0,1",
   "-1,1",
   "-1,0",
   "0,-1",
   "1,2",
   "2,1",
   "2,2",
   "1,3",
   "0,3",
   "0,2",
   "1,1",
   "2,4",
   "3,3",
   "3,4",
   "2,5",
   "1,5",
   "1,4",
   "2,3",
   "3,-1",
   "4,-2",
   "4,-1",
   "3,0",
   "2,0",
   "2,-1",
   "3,-2",
   "4,1",
   "5,0",
   "5,1",
   "4,2",
   "3,2",
   "3,1",
   "4,0",
   "5,3",
   "6,2",
   "6,3",
   "5,4",
   "4,4",
   "4,3",
   "5,2"
  ],
  "rangees": [
   {
    "cles": [
     "0,-1",
     "1,-1",
     "2,-1",
     "3,-1",
     "4,-1"
    ],
    "reponses": [
     {
      "mot": "TEMPS",
      "def": "Les heures qui passent."
     }
    ]
   },
   {
    "cles": [
     "-1,0",
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0"
    ],
    "reponses": [
     {
      "mot": "SUR",
      "def": "Certain de ce qu'on avance."
     },
     {
      "mot": "MOIS",
      "def": "Janvier en est un."
     }
    ]
   },
   {
    "cles": [
     "-1,1",
     "0,1",
     "1,1",
     "2,1",
     "3,1",
     "4,1",
     "5,1"
    ],
    "reponses": [
     {
      "mot": "ERE",
      "def": "Une très longue période de l'histoire."
     },
     {
      "mot": "COTE",
      "def": "Le bord de la mer."
     }
    ]
   },
   {
    "cles": [
     "0,2",
     "1,2",
     "2,2",
     "3,2",
     "4,2",
     "5,2",
     "6,2"
    ],
    "reponses": [
     {
      "mot": "LIEU",
      "def": "L'endroit où se passe quelque chose."
     },
     {
      "mot": "AIL",
      "def": "La gousse qui parfume le gigot."
     }
    ]
   },
   {
    "cles": [
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
      "mot": "CRI",
      "def": "Ce qu'on pousse quand on a peur."
     },
     {
      "mot": "SOIE",
      "def": "Le tissu fin que fait le ver."
     }
    ]
   },
   {
    "cles": [
     "1,4",
     "2,4",
     "3,4",
     "4,4",
     "5,4"
    ],
    "reponses": [
     {
      "mot": "ARETE",
      "def": "Le segment où deux faces d'un solide se rencontrent."
     }
    ]
   }
  ],
  "fleurs": [
   {
    "centre": "0,0",
    "petales": [
     "1,-1",
     "1,0",
     "0,1",
     "-1,1",
     "-1,0",
     "0,-1"
    ],
    "mot": "RESTER",
    "def": "Ne pas bouger de l'endroit où l'on est.",
    "maths": false,
    "depart": 2,
    "couleur": "claire"
   },
   {
    "centre": "1,2",
    "petales": [
     "2,1",
     "2,2",
     "1,3",
     "0,3",
     "0,2",
     "1,1"
    ],
    "mot": "CERCLE",
    "def": "Tous ses points sont à la même distance du centre.",
    "maths": true,
    "depart": 0,
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
    "mot": "CHAISE",
    "def": "On s'y assoit, elle a un dossier.",
    "maths": false,
    "depart": 2,
    "couleur": "foncee"
   },
   {
    "centre": "3,-1",
    "petales": [
     "4,-2",
     "4,-1",
     "3,0",
     "2,0",
     "2,-1",
     "3,-2"
    ],
    "mot": "SOMMET",
    "def": "Le point où deux côtés se rejoignent.",
    "maths": true,
    "depart": 1,
    "couleur": "claire"
   },
   {
    "centre": "4,1",
    "petales": [
     "5,0",
     "5,1",
     "4,2",
     "3,2",
     "3,1",
     "4,0"
    ],
    "mot": "OISEAU",
    "def": "Il a des plumes et un bec.",
    "maths": false,
    "depart": 4,
    "couleur": "moyenne"
   },
   {
    "centre": "5,3",
    "petales": [
     "6,2",
     "6,3",
     "5,4",
     "4,4",
     "4,3",
     "5,2"
    ],
    "mot": "ETOILE",
    "def": "Elle brille la nuit, très loin.",
    "maths": false,
    "depart": 2,
    "couleur": "foncee"
   }
  ],
  "signature": "CERCLE CHAISE ETOILE OISEAU RESTER SOMMET"
 },
 {
  "id": "jardin-15",
  "cases": [
   "0,0",
   "1,-1",
   "1,0",
   "0,1",
   "-1,1",
   "-1,0",
   "0,-1",
   "1,2",
   "2,1",
   "2,2",
   "1,3",
   "0,3",
   "0,2",
   "1,1",
   "2,4",
   "3,3",
   "3,4",
   "2,5",
   "1,5",
   "1,4",
   "2,3",
   "3,-1",
   "4,-2",
   "4,-1",
   "3,0",
   "2,0",
   "2,-1",
   "3,-2",
   "4,1",
   "5,0",
   "5,1",
   "4,2",
   "3,2",
   "3,1",
   "4,0",
   "5,3",
   "6,2",
   "6,3",
   "5,4",
   "4,4",
   "4,3",
   "5,2"
  ],
  "rangees": [
   {
    "cles": [
     "0,-1",
     "1,-1",
     "2,-1",
     "3,-1",
     "4,-1"
    ],
    "reponses": [
     {
      "mot": "TERRE",
      "def": "Notre planète, ou ce qu'on retourne au jardin."
     }
    ]
   },
   {
    "cles": [
     "-1,0",
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0"
    ],
    "reponses": [
     {
      "mot": "ART",
      "def": "La peinture, la musique et la sculpture en font partie."
     },
     {
      "mot": "AMIE",
      "def": "Celle qu'on est content de voir."
     }
    ]
   },
   {
    "cles": [
     "-1,1",
     "0,1",
     "1,1",
     "2,1",
     "3,1",
     "4,1",
     "5,1"
    ],
    "reponses": [
     {
      "mot": "MOIS",
      "def": "Janvier en est un."
     },
     {
      "mot": "VER",
      "def": "Il n'a pas de pattes et vit dans la terre."
     }
    ]
   },
   {
    "cles": [
     "0,2",
     "1,2",
     "2,2",
     "3,2",
     "4,2",
     "5,2",
     "6,2"
    ],
    "reponses": [
     {
      "mot": "DAME",
      "def": "La pièce la plus forte aux échecs."
     },
     {
      "mot": "LIT",
      "def": "On s'y couche pour dormir."
     }
    ]
   },
   {
    "cles": [
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
      "mot": "OUI",
      "def": "La réponse qui accepte."
     }
    ]
   },
   {
    "cles": [
     "1,4",
     "2,4",
     "3,4",
     "4,4",
     "5,4"
    ],
    "reponses": [
     {
      "mot": "TERME",
      "def": "Un des nombres que l'on additionne."
     }
    ]
   }
  ],
  "fleurs": [
   {
    "centre": "0,0",
    "petales": [
     "1,-1",
     "1,0",
     "0,1",
     "-1,1",
     "-1,0",
     "0,-1"
    ],
    "mot": "TOMATE",
    "def": "Le fruit rouge de la salade.",
    "maths": false,
    "depart": 1,
    "couleur": "claire"
   },
   {
    "centre": "1,2",
    "petales": [
     "2,1",
     "2,2",
     "1,3",
     "0,3",
     "0,2",
     "1,1"
    ],
    "mot": "MARDIS",
    "def": "Les jours après lundi, au pluriel.",
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
    "mot": "ENTIER",
    "def": "Un nombre sans virgule : 0, 1, 2, 3…",
    "maths": true,
    "depart": 2,
    "couleur": "foncee"
   },
   {
    "centre": "3,-1",
    "petales": [
     "4,-2",
     "4,-1",
     "3,0",
     "2,0",
     "2,-1",
     "3,-2"
    ],
    "mot": "MARCHE",
    "def": "On y achète les légumes — ou on la monte.",
    "maths": false,
    "depart": 2,
    "couleur": "claire"
   },
   {
    "centre": "4,1",
    "petales": [
     "5,0",
     "5,1",
     "4,2",
     "3,2",
     "3,1",
     "4,0"
    ],
    "mot": "LEVIER",
    "def": "La barre qui aide à soulever.",
    "maths": false,
    "depart": 2,
    "couleur": "moyenne"
   },
   {
    "centre": "5,3",
    "petales": [
     "6,2",
     "6,3",
     "5,4",
     "4,4",
     "4,3",
     "5,2"
    ],
    "mot": "MOITIE",
    "def": "Deux fois moins.",
    "maths": true,
    "depart": 3,
    "couleur": "foncee"
   }
  ],
  "signature": "ENTIER LEVIER MARCHE MARDIS MOITIE TOMATE"
 },
 {
  "id": "jardin-16",
  "cases": [
   "0,0",
   "1,-1",
   "1,0",
   "0,1",
   "-1,1",
   "-1,0",
   "0,-1",
   "1,2",
   "2,1",
   "2,2",
   "1,3",
   "0,3",
   "0,2",
   "1,1",
   "2,4",
   "3,3",
   "3,4",
   "2,5",
   "1,5",
   "1,4",
   "2,3",
   "3,-1",
   "4,-2",
   "4,-1",
   "3,0",
   "2,0",
   "2,-1",
   "3,-2",
   "4,1",
   "5,0",
   "5,1",
   "4,2",
   "3,2",
   "3,1",
   "4,0",
   "5,3",
   "6,2",
   "6,3",
   "5,4",
   "4,4",
   "4,3",
   "5,2"
  ],
  "rangees": [
   {
    "cles": [
     "0,-1",
     "1,-1",
     "2,-1",
     "3,-1",
     "4,-1"
    ],
    "reponses": [
     {
      "mot": "AMOUR",
      "def": "Le sentiment qui attache deux êtres."
     }
    ]
   },
   {
    "cles": [
     "-1,0",
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0"
    ],
    "reponses": [
     {
      "mot": "COIN",
      "def": "L'endroit où deux murs se rencontrent."
     },
     {
      "mot": "ERE",
      "def": "Une très longue période de l'histoire."
     }
    ]
   },
   {
    "cles": [
     "-1,1",
     "0,1",
     "1,1",
     "2,1",
     "3,1",
     "4,1",
     "5,1"
    ],
    "reponses": [
     {
      "mot": "NOIR",
      "def": "La couleur de la nuit sans lune."
     },
     {
      "mot": "TON",
      "def": "La hauteur de la voix."
     }
    ]
   },
   {
    "cles": [
     "0,2",
     "1,2",
     "2,2",
     "3,2",
     "4,2",
     "5,2",
     "6,2"
    ],
    "reponses": [
     {
      "mot": "ONDE",
      "def": "Ce qui se propage à la surface de l'eau."
     },
     {
      "mot": "TRI",
      "def": "Ce qu'on fait des déchets avant de les jeter."
     }
    ]
   },
   {
    "cles": [
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
      "mot": "VER",
      "def": "Il n'a pas de pattes et vit dans la terre."
     },
     {
      "mot": "LENT",
      "def": "Qui met du temps."
     }
    ]
   },
   {
    "cles": [
     "1,4",
     "2,4",
     "3,4",
     "4,4",
     "5,4"
    ],
    "reponses": [
     {
      "mot": "ELEVE",
      "def": "Celui qui apprend, assis à sa table."
     }
    ]
   }
  ],
  "fleurs": [
   {
    "centre": "0,0",
    "petales": [
     "1,-1",
     "1,0",
     "0,1",
     "-1,1",
     "-1,0",
     "0,-1"
    ],
    "mot": "CAMION",
    "def": "Il transporte les marchandises.",
    "maths": false,
    "depart": 4,
    "couleur": "claire"
   },
   {
    "centre": "1,2",
    "petales": [
     "2,1",
     "2,2",
     "1,3",
     "0,3",
     "0,2",
     "1,1"
    ],
    "mot": "DEVOIR",
    "def": "Le travail à rendre au professeur.",
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
    "mot": "LEVIER",
    "def": "La barre qui aide à soulever.",
    "maths": false,
    "depart": 0,
    "couleur": "foncee"
   },
   {
    "centre": "3,-1",
    "petales": [
     "4,-2",
     "4,-1",
     "3,0",
     "2,0",
     "2,-1",
     "3,-2"
    ],
    "mot": "NOMBRE",
    "def": "Ce qui dit une quantité.",
    "maths": true,
    "depart": 3,
    "couleur": "claire"
   },
   {
    "centre": "4,1",
    "petales": [
     "5,0",
     "5,1",
     "4,2",
     "3,2",
     "3,1",
     "4,0"
    ],
    "mot": "TRENTE",
    "def": "Le nombre 30, en toutes lettres.",
    "maths": true,
    "depart": 4,
    "couleur": "moyenne"
   },
   {
    "centre": "5,3",
    "petales": [
     "6,2",
     "6,3",
     "5,4",
     "4,4",
     "4,3",
     "5,2"
    ],
    "mot": "VERITE",
    "def": "Ce qui est exact, par opposition au mensonge.",
    "maths": false,
    "depart": 3,
    "couleur": "foncee"
   }
  ],
  "signature": "CAMION DEVOIR LEVIER NOMBRE TRENTE VERITE"
 },
 {
  "id": "jardin-17",
  "cases": [
   "0,0",
   "1,-1",
   "1,0",
   "0,1",
   "-1,1",
   "-1,0",
   "0,-1",
   "1,2",
   "2,1",
   "2,2",
   "1,3",
   "0,3",
   "0,2",
   "1,1",
   "2,4",
   "3,3",
   "3,4",
   "2,5",
   "1,5",
   "1,4",
   "2,3",
   "3,-1",
   "4,-2",
   "4,-1",
   "3,0",
   "2,0",
   "2,-1",
   "3,-2",
   "4,1",
   "5,0",
   "5,1",
   "4,2",
   "3,2",
   "3,1",
   "4,0",
   "5,3",
   "6,2",
   "6,3",
   "5,4",
   "4,4",
   "4,3",
   "5,2"
  ],
  "rangees": [
   {
    "cles": [
     "0,-1",
     "1,-1",
     "2,-1",
     "3,-1",
     "4,-1"
    ],
    "reponses": [
     {
      "mot": "TERME",
      "def": "Un des nombres que l'on additionne."
     }
    ]
   },
   {
    "cles": [
     "-1,0",
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0"
    ],
    "reponses": [
     {
      "mot": "NOTE",
      "def": "Le chiffre du devoir, ou le son de la musique."
     },
     {
      "mot": "CRI",
      "def": "Ce qu'on pousse quand on a peur."
     }
    ]
   },
   {
    "cles": [
     "-1,1",
     "0,1",
     "1,1",
     "2,1",
     "3,1",
     "4,1",
     "5,1"
    ],
    "reponses": [
     {
      "mot": "ERE",
      "def": "Une très longue période de l'histoire."
     },
     {
      "mot": "SEPT",
      "def": "Le nombre 7, en toutes lettres."
     }
    ]
   },
   {
    "cles": [
     "0,2",
     "1,2",
     "2,2",
     "3,2",
     "4,2",
     "5,2",
     "6,2"
    ],
    "reponses": [
     {
      "mot": "LIT",
      "def": "On s'y couche pour dormir."
     },
     {
      "mot": "VENT",
      "def": "L'air qui se déplace."
     }
    ]
   },
   {
    "cles": [
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
      "mot": "BAIE",
      "def": "Un petit fruit rond, ou une échancrure de la côte."
     },
     {
      "mot": "EPI",
      "def": "La tige où poussent les grains du blé."
     }
    ]
   },
   {
    "cles": [
     "1,4",
     "2,4",
     "3,4",
     "4,4",
     "5,4"
    ],
    "reponses": [
     {
      "mot": "VERRE",
      "def": "On y boit, et il casse."
     }
    ]
   }
  ],
  "fleurs": [
   {
    "centre": "0,0",
    "petales": [
     "1,-1",
     "1,0",
     "0,1",
     "-1,1",
     "-1,0",
     "0,-1"
    ],
    "mot": "TRENTE",
    "def": "Le nombre 30, en toutes lettres.",
    "maths": true,
    "depart": 1,
    "couleur": "claire"
   },
   {
    "centre": "1,2",
    "petales": [
     "2,1",
     "2,2",
     "1,3",
     "0,3",
     "0,2",
     "1,1"
    ],
    "mot": "TABLES",
    "def": "On y pose les cahiers, au pluriel.",
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
    "mot": "LEVIER",
    "def": "La barre qui aide à soulever.",
    "maths": false,
    "depart": 2,
    "couleur": "foncee"
   },
   {
    "centre": "3,-1",
    "petales": [
     "4,-2",
     "4,-1",
     "3,0",
     "2,0",
     "2,-1",
     "3,-2"
    ],
    "mot": "CERCLE",
    "def": "Tous ses points sont à la même distance du centre.",
    "maths": true,
    "depart": 2,
    "couleur": "claire"
   },
   {
    "centre": "4,1",
    "petales": [
     "5,0",
     "5,1",
     "4,2",
     "3,2",
     "3,1",
     "4,0"
    ],
    "mot": "VERITE",
    "def": "Ce qui est exact, par opposition au mensonge.",
    "maths": false,
    "depart": 3,
    "couleur": "moyenne"
   },
   {
    "centre": "5,3",
    "petales": [
     "6,2",
     "6,3",
     "5,4",
     "4,4",
     "4,3",
     "5,2"
    ],
    "mot": "ENTIER",
    "def": "Un nombre sans virgule : 0, 1, 2, 3…",
    "maths": true,
    "depart": 4,
    "couleur": "foncee"
   }
  ],
  "signature": "CERCLE ENTIER LEVIER TABLES TRENTE VERITE"
 },
 {
  "id": "jardin-18",
  "cases": [
   "0,0",
   "1,-1",
   "1,0",
   "0,1",
   "-1,1",
   "-1,0",
   "0,-1",
   "1,2",
   "2,1",
   "2,2",
   "1,3",
   "0,3",
   "0,2",
   "1,1",
   "2,4",
   "3,3",
   "3,4",
   "2,5",
   "1,5",
   "1,4",
   "2,3",
   "3,-1",
   "4,-2",
   "4,-1",
   "3,0",
   "2,0",
   "2,-1",
   "3,-2",
   "4,1",
   "5,0",
   "5,1",
   "4,2",
   "3,2",
   "3,1",
   "4,0",
   "5,3",
   "6,2",
   "6,3",
   "5,4",
   "4,4",
   "4,3",
   "5,2"
  ],
  "rangees": [
   {
    "cles": [
     "0,-1",
     "1,-1",
     "2,-1",
     "3,-1",
     "4,-1"
    ],
    "reponses": [
     {
      "mot": "CORDE",
      "def": "On la tend, on l'attache, on grimpe dessus."
     }
    ]
   },
   {
    "cles": [
     "-1,0",
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0"
    ],
    "reponses": [
     {
      "mot": "ROUE",
      "def": "Elle tourne sous la voiture."
     },
     {
      "mot": "CLE",
      "def": "Elle ouvre la porte."
     }
    ]
   },
   {
    "cles": [
     "-1,1",
     "0,1",
     "1,1",
     "2,1",
     "3,1",
     "4,1",
     "5,1"
    ],
    "reponses": [
     {
      "mot": "EPI",
      "def": "La tige où poussent les grains du blé."
     },
     {
      "mot": "LIRE",
      "def": "Suivre des yeux ce qui est écrit."
     }
    ]
   },
   {
    "cles": [
     "0,2",
     "1,2",
     "2,2",
     "3,2",
     "4,2",
     "5,2",
     "6,2"
    ],
    "reponses": [
     {
      "mot": "VELO",
      "def": "Le deux-roues à pédales."
     },
     {
      "mot": "TOI",
      "def": "Celui à qui l'on parle."
     }
    ]
   },
   {
    "cles": [
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
      "mot": "SEVE",
      "def": "Le liquide qui monte dans l'arbre au printemps."
     },
     {
      "mot": "RAT",
      "def": "Le rongeur gris des égouts."
     }
    ]
   },
   {
    "cles": [
     "1,4",
     "2,4",
     "3,4",
     "4,4",
     "5,4"
    ],
    "reponses": [
     {
      "mot": "ETUDE",
      "def": "Le travail qu'on fait pour apprendre."
     }
    ]
   }
  ],
  "fleurs": [
   {
    "centre": "0,0",
    "petales": [
     "1,-1",
     "1,0",
     "0,1",
     "-1,1",
     "-1,0",
     "0,-1"
    ],
    "mot": "COUPER",
    "def": "Séparer en deux avec un ciseau.",
    "maths": false,
    "depart": 5,
    "couleur": "claire"
   },
   {
    "centre": "1,2",
    "petales": [
     "2,1",
     "2,2",
     "1,3",
     "0,3",
     "0,2",
     "1,1"
    ],
    "mot": "VILLES",
    "def": "Beaucoup de rues et de maisons, au pluriel.",
    "maths": false,
    "depart": 4,
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
    "mot": "CHEVEU",
    "def": "Il pousse sur la tête.",
    "maths": false,
    "depart": 2,
    "couleur": "foncee"
   },
   {
    "centre": "3,-1",
    "petales": [
     "4,-2",
     "4,-1",
     "3,0",
     "2,0",
     "2,-1",
     "3,-2"
    ],
    "mot": "CERCLE",
    "def": "Tous ses points sont à la même distance du centre.",
    "maths": true,
    "depart": 2,
    "couleur": "claire"
   },
   {
    "centre": "4,1",
    "petales": [
     "5,0",
     "5,1",
     "4,2",
     "3,2",
     "3,1",
     "4,0"
    ],
    "mot": "ETOILE",
    "def": "Elle brille la nuit, très loin.",
    "maths": false,
    "depart": 1,
    "couleur": "moyenne"
   },
   {
    "centre": "5,3",
    "petales": [
     "6,2",
     "6,3",
     "5,4",
     "4,4",
     "4,3",
     "5,2"
    ],
    "mot": "DROITE",
    "def": "Illimitée des deux côtés, elle n'a ni début ni fin.",
    "maths": true,
    "depart": 3,
    "couleur": "foncee"
   }
  ],
  "signature": "CERCLE CHEVEU COUPER DROITE ETOILE VILLES"
 },
 {
  "id": "jardin-19",
  "cases": [
   "0,0",
   "1,-1",
   "1,0",
   "0,1",
   "-1,1",
   "-1,0",
   "0,-1",
   "1,2",
   "2,1",
   "2,2",
   "1,3",
   "0,3",
   "0,2",
   "1,1",
   "2,4",
   "3,3",
   "3,4",
   "2,5",
   "1,5",
   "1,4",
   "2,3",
   "3,-1",
   "4,-2",
   "4,-1",
   "3,0",
   "2,0",
   "2,-1",
   "3,-2",
   "4,1",
   "5,0",
   "5,1",
   "4,2",
   "3,2",
   "3,1",
   "4,0",
   "5,3",
   "6,2",
   "6,3",
   "5,4",
   "4,4",
   "4,3",
   "5,2"
  ],
  "rangees": [
   {
    "cles": [
     "0,-1",
     "1,-1",
     "2,-1",
     "3,-1",
     "4,-1"
    ],
    "reponses": [
     {
      "mot": "HERBE",
      "def": "Le vert qui pousse dans le pré."
     }
    ]
   },
   {
    "cles": [
     "-1,0",
     "0,0",
     "1,0",
     "2,0",
     "3,0",
     "4,0",
     "5,0"
    ],
    "reponses": [
     {
      "mot": "CAVE",
      "def": "La pièce sous la maison."
     },
     {
      "mot": "COU",
      "def": "Entre la tête et les épaules."
     }
    ]
   },
   {
    "cles": [
     "-1,1",
     "0,1",
     "1,1",
     "2,1",
     "3,1",
     "4,1",
     "5,1"
    ],
    "reponses": [
     {
      "mot": "LAIT",
      "def": "Le blanc que donne la vache."
     },
     {
      "mot": "TIR",
      "def": "Ce qu'on fait avec un arc ou un ballon."
     }
    ]
   },
   {
    "cles": [
     "0,2",
     "1,2",
     "2,2",
     "3,2",
     "4,2",
     "5,2",
     "6,2"
    ],
    "reponses": [
     {
      "mot": "OUIE",
      "def": "Le sens de l'oreille."
     },
     {
      "mot": "ROI",
      "def": "Il porte une couronne."
     }
    ]
   },
   {
    "cles": [
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
      "mot": "MERE",
      "def": "Elle a mis ses enfants au monde."
     },
     {
      "mot": "RAT",
      "def": "Le rongeur gris des égouts."
     }
    ]
   },
   {
    "cles": [
     "1,4",
     "2,4",
     "3,4",
     "4,4",
     "5,4"
    ],
    "reponses": [
     {
      "mot": "BANDE",
      "def": "Une longue étroite — ou un groupe de copains."
     }
    ]
   }
  ],
  "fleurs": [
   {
    "centre": "0,0",
    "petales": [
     "1,-1",
     "1,0",
     "0,1",
     "-1,1",
     "-1,0",
     "0,-1"
    ],
    "mot": "CHEVAL",
    "def": "On le monte, il galope.",
    "maths": false,
    "depart": 4,
    "couleur": "claire"
   },
   {
    "centre": "1,2",
    "petales": [
     "2,1",
     "2,2",
     "1,3",
     "0,3",
     "0,2",
     "1,1"
    ],
    "mot": "MOITIE",
    "def": "Deux fois moins.",
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
    "mot": "NOMBRE",
    "def": "Ce qui dit une quantité.",
    "maths": true,
    "depart": 1,
    "couleur": "foncee"
   },
   {
    "centre": "3,-1",
    "petales": [
     "4,-2",
     "4,-1",
     "3,0",
     "2,0",
     "2,-1",
     "3,-2"
    ],
    "mot": "CERCLE",
    "def": "Tous ses points sont à la même distance du centre.",
    "maths": true,
    "depart": 2,
    "couleur": "claire"
   },
   {
    "centre": "4,1",
    "petales": [
     "5,0",
     "5,1",
     "4,2",
     "3,2",
     "3,1",
     "4,0"
    ],
    "mot": "RETOUR",
    "def": "Le chemin du soir, après l'aller.",
    "maths": false,
    "depart": 2,
    "couleur": "moyenne"
   },
   {
    "centre": "5,3",
    "petales": [
     "6,2",
     "6,3",
     "5,4",
     "4,4",
     "4,3",
     "5,2"
    ],
    "mot": "DROITE",
    "def": "Illimitée des deux côtés, elle n'a ni début ni fin.",
    "maths": true,
    "depart": 3,
    "couleur": "foncee"
   }
  ],
  "signature": "CERCLE CHEVAL DROITE MOITIE NOMBRE RETOUR"
 }
];
