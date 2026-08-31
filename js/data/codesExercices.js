// La table des IDENTITÉS : deux lettres par exercice, figées une fois pour toutes.
//
// Rémy voulait un code dictable : « pourquoi pas 2 caractères, ça FAIT 26*26
// possibilités de jeu ». Deux caractères suffisent en effet — 23 lettres au
// carré font 529 places pour 139 exercices — mais deux caractères SEULS se
// trompent en silence : sur cette table, deux fois sur cinq, une lettre mal
// recopiée tombe sur un AUTRE exercice, qui s'ouvre sans un mot. D'où la forme
// retenue : deux lettres d'identité + une lettre de contrôle, calculée dans
// shortcodes.js, qui rejette toute faute d'une lettre.
//
// POURQUOI UNE TABLE ÉCRITE, ET NON UN CALCUL. Un code se note dans un carnet,
// se colle sur un cahier de textes, se dicte en fin d'heure. Il ne doit JAMAIS
// changer. Un code calculé à partir du titre changerait le jour où l'on
// reformule le titre ; un code calculé à partir du rang changerait le jour où
// l'on insère un exercice avant. Écrit ici, il ne change que si on le change.
//
// Les deux lettres viennent des initiales du titre — « Table de Pythagore » →
// TP, « Le Mot Codé » → CD — parce qu'un code qu'on devine à moitié se retient.
// Là où les initiales étaient déjà prises, on a pris la lettre suivante du
// premier mot ; le titre en commentaire dit ce que le code désigne.
//
// LES LETTRES I, O ET Q N'Y SONT PAS : recopiées à la main elles deviennent 1,
// 0 et O. L'alphabet retenu compte donc 23 lettres — et 23 est premier, ce qui
// est exactement ce qui rend le caractère de contrôle démontrable.
//
// AJOUTER UN EXERCICE, c'est ajouter sa ligne ici. Un test le rappelle : il
// échoue tant qu'un exercice du catalogue n'a pas son identité.

export const CODES_EXERCICES = {
    'num-lettres':                'LC',   // Des Lettres aux Chiffres
    'num-rang':                   'CC',   // Chasse au Chiffre
    'num-parties':                'ED',   // Entière ou Décimale ?
    'num-zeros':                  'CZ',   // La Chasse aux Zéros
    'num-decomposition':          'DR',   // Décomposer, Recomposer
    'num-conversion':             'DC',   // Dizaines, Centaines, Milliers
    'num-egypte':                 'NP',   // Les Nombres des Pharaons
    'num-egypte-qcm':             'HE',   // Hiéroglyphes Express
    'num-ordre-grandeur':         'PP',   // À Peu Près
    'num-graduations':            'LD',   // La Loupe sur la Droite
    'num-vocabulaire':            'MJ',   // Le Mot Juste
    'num-complement-10':          'AM',   // Amis de 10
    'num-amis-de-dix':            'AD',   // Les Amis de Dix
    'num-canon-complements':      'CA',   // Le Canon des Compléments
    'num-complement-100':         'AS',   // Amis de 100 et 1000
    'num-parite':                 'PM',   // Pair ou Impair
    'num-relatifs':               'NR',   // Nombres Relatifs
    'num-dictee':                 'DG',   // Dictée de Grands Nombres
    'num-ninja':                  'NN',   // Ninja des Nombres
    'num-relatifs-addition':      'AR',   // Additionner des Relatifs, pas à pas
    'num-relatifs-produit':       'MR',   // Multiplier des Relatifs, pas à pas
    'num-litteral-reduire':       'SR',   // Simplifier et Réduire
    'num-litteral-puissances':    'CR',   // Carrés, Cubes et Réduction
    'num-virgule':                'VD',   // La Virgule qui se décale
    'num-puissances-reconnaitre': 'PR',   // Puissances de 10 — reconnaître
    'num-puissances-transformer': 'PE',   // Puissances de 10 — écriture scientifique
    'num-puissances-prefixes':    'KM',   // Kilo, Méga, Giga, Micro, Nano
    'num-puissances-calcul':      'CP',   // Calculer avec des Puissances
    'calc-add':                   'AT',   // Additions Mystères
    'calc-sub':                   'SE',   // Soustractions Éclair
    'calc-mult-flash':            'FM',   // Flash Mult
    'calc-pythagore':             'TP',   // Table de Pythagore
    'calc-mult-missing':          'FA',   // Facteur Manquant
    'calc-division':              'DV',   // Divisions Express
    'calc-prio':                  'PB',   // Prio-Bot Express
    'calc-prio-parentheses':      'BT',   // Prio-Bot Parenthèses
    'calc-prio-resultat':         'PC',   // Prio-Bot Calcul
    'calc-prio-cascade':          'PL',   // Priorités : ligne par ligne
    'calc-compte-est-bon':        'CB',   // Le Compte est Bon
    'calc-poser':                 'PS',   // Poser une opération
    'calc-poser-multiplication':  'MU',   // Poser une multiplication
    'calc-poser-division':        'PD',   // Poser une division
    'calc-arcade-sprint':         'SC',   // Sprint Chrono
    'calc-arcade-moles':          'CT',   // Chasse aux Taupes
    'calc-moles-tables':          'TT',   // Taupes des Tables
    'calc-arcade-shooter':        'MM',   // Météorites Mathématiques
    'calc-math-memory':           'MT',   // Memory des Tables
    'calc-labyrinthe':            'LM',   // Labyrinthe Mathématique
    'calc-mathodu':               'MA',   // Mathdoku
    'calc-binairo':               'BN',   // Binairo
    'calc-nova':                  'NV',   // Nova
    'calc-escadrille':            'ET',   // Escadrille des Tables
    'calc-sudoku':                'SU',   // Sudoku
    'calc-garam':                 'GA',   // Garam
    'calc-course':                'CM',   // Course Mathématique
    'calc-tetris':                'MH',   // Math Tetris
    'calc-vault':                 'CF',   // Le Coffre-Fort
    'calc-duel':                  'DT',   // Duel des Tables (à deux)
    'calc-arpenteurs':            'AP',   // Les Arpenteurs
    'voc-anagrammes':             'AV',   // Anagrammes du Vocabulaire
    'voc-mots-croises':           'MC',   // Mots Croisés Mathématiques
    'log-tasuko':                 'TA',   // Tasuko
    'calc-pyramide-nombres':      'PN',   // La Pyramide des Nombres
    'log-mastermind':             'MS',   // Mastermind
    'voc-pyramide':               'PY',   // La Pyramide des Mots
    'voc-mot-code':               'CD',   // Le Mot Codé
    'calc-diviseurs':             'CH',   // Le Chasseur de Diviseurs
    'logi-pipopipette':           'PT',   // La Pipopipette
    'logi-puissance4':            'PU',   // Puissance 4
    'logi-sim':                   'SM',   // Le Sim
    'voc-mots-caches':            'CE',   // Mots Cachés Mathématiques
    'calc-chantier':              'CN',   // Le Chantier des Blocs
    'logi-othello':               'TH',   // Othello
    'logi-dames':                 'JD',   // Jeu de Dames
    'logi-echecs':                'EC',   // Échecs
    'logi-logigramme':            'LG',   // Le Logigramme
    'calc-skweek':                'PA',   // Le Peintre
    'logi-hashi':                 'HA',   // Le Hashi
    'logi-slitherlink':           'SL',   // Le Slitherlink
    'logi-futoshiki':             'FU',   // Le Futoshiki
    'logi-carre-magique':         'MG',   // Le Carré Magique
    'logi-hexagrille':            'HX',   // L'Hexagrille
    'calc-bons-chemins':          'BC',   // Les Bons Chemins
    'calc-2048':                  'XA',   // 2048
    'logi-dominos':               'DM',   // Les Dominos
    'logi-demineur':              'DE',   // Le Démineur
    'calc-math-crush':            'CU',   // Math Crush
    'num-problemes':              'HP',   // Histoires en Pagaille
    'num-proportion-tableau':     'TB',   // Tableau de Proportionnalité
    'calc-point-a-point':         'PF',   // Le Point à Point
    'jeu-petites-ailes':          'AL',   // Les Petites Ailes
    'frac-compare':               'DF',   // Duel de Fractions
    'frac-add':                   'AF',   // Addition de Fractions
    'frac-egalite':               'EG',   // L'Égalité à Compléter
    'frac-somme-posee':           'AN',   // Poser une Addition de Fractions
    'frac-probleme':              'HF',   // Histoires de Fractions
    'frac-samurai':               'SF',   // Le Samouraï des Fractions
    'frac-pizza':                 'PZ',   // La Pizzeria des Fractions
    'dec-compare':                'DD',   // Décimaux en Duel
    'geo-angles-manquants':       'VM',   // La Valeur Manquante
    'geo-angles-nommer':          'NA',   // Le Nom des Angles
    'geo-notation':               'SD',   // Segment, Droite ou Demi-droite ?
    'geo-redaction':              'RJ',   // Rédiger une Justification
    'geo-pythagore':              'TE',   // Le Théorème de Pythagore
    'geo-atelier-instruments':    'AG',   // Atelier de Géométrie : Règle, Équerre et Compas
    'geo-repere-placer':          'PG',   // Placer un Point
    'geo-repere-lire':            'LR',   // Lire des Coordonnées
    'geo-symetrie-quadrillage':   'SY',   // Le Symétrique aux Carreaux
    'geo-transfo-quadrillage':    'TM',   // Tracer l'Image d'une Figure
    'geo-course-vecteurs':        'CV',   // La Course de Vecteurs
    'geo-pavage':                 'ST',   // Symétrique par Rapport à Quoi ?
    'geo-angles':                 'AE',   // Angle Master
    'geo-chat-geometre':          'CG',   // Le Chat Géomètre
    'geo-chat-libre':             'GE',   // Le Chat Géomètre — atelier libre
    'geo-galactic':               'GT',   // Galactic : Tir aux Angles
    'geo-ville':                  'PV',   // Le Plan de Ville
    'geo-coder-figure':           'FG',   // Code la figure
    'geo-laby-nombres':           'LN',   // Le labyrinthe des nombres
    'geo-chemin-numerote':        'NU',   // Le chemin numéroté
    'geo-relier-points':          'RP',   // Relie les points
    'geo-cubes-compter':          'CS',   // Combien de Cubes ?
    'geo-solides-denombrer':      'CL',   // Compter sur un solide
    'geo-automate':               'AU',   // L'Automate
    'geo-dedale-forme':           'DA',   // Les Dédales
    'geo-mat-echecs':             'EM',   // Échecs : mat en un, mat en deux
    'geo-thales':                 'TR',   // Le Théorème de Thalès
    'mes-perimetre':              'TU',   // Le Tour du Rectangle
    'mes-perimetre-qcm':          'PH',   // Périmètre : à toi de choisir
    'mes-aire':                   'CX',   // Carreaux et Surfaces
    'mes-conversion':             'TC',   // Le Tableau de Conversion
    'mes-vitesse':                'TD',   // Temps, Distance, Vitesse
    'mes-jezzball':               'JE',   // JezzBall
    'geo-tangram':                'TN',   // Le Tangram
    'mes-heure':                  'UH',   // Quelle heure est-il ?
    'don-tableur':                'EL',   // L'École du Tableur
    'defi-tour-brahma':           'HN',   // La Tour de Hanoï (Tour de Brahma)
    'defi-grenouilles':           'GR',   // Les Grenouilles
    'defi-parking':               'PK',   // Le Parking
    'defi-embouteillage':         'EB',   // L'Embouteillage
    'defi-pousseur':              'PJ',   // Le Pousseur
};

/** L'exercice que désignent ces deux lettres, ou undefined. */
export const EXERCICE_PAR_IDENTITE = new Map(
    Object.entries(CODES_EXERCICES).map(([id, identite]) => [identite, id])
);
