// Les chapitres du professeur.
//
// CE FICHIER EST LA PROGRESSION DE RÉMY, pas une nomenclature officielle. Les
// noms sont exactement ceux de ses dossiers — « Ordre », « Temps »,
// « Éléments de géométrie » — et l'ordre est le sien : alphabétique, parce
// qu'il n'a pas demandé de chronologie (« je n'ai pas besoin de progression
// chronologique, juste le fait que ce soit trié »). Trois dossiers ont été
// écartés à sa demande : Révisions, Rappels et Arsène — ce ne sont pas des
// chapitres de notions.
//
// UN CHAPITRE EST UN SAC DE COMPÉTENCES, ET NON UNE ÉTIQUETTE COLLÉE SUR DES
// EXERCICES. C'est ce qui rend la progression modulable : renommer un
// chapitre, en scinder un, déplacer une notion de la 6ᵉ à la 5ᵉ, tout cela se
// fait ici, en déplaçant des identifiants de compétences — et les cent
// exercices du catalogue suivent sans qu'on en touche un seul. Si les
// exercices pointaient vers les chapitres, réorganiser la progression
// demanderait de recocher cent cases chaque année.
//
// UN CHAPITRE SANS COMPÉTENCE N'EST PAS UNE ERREUR : c'est un chapitre
// qu'AtoutMath ne couvre pas encore. « Probabilités », « Symétrie axiale »,
// « Quadrilatères » sont dans la progression et n'ont aucun exercice — le
// tableau de classement les montre vides, et c'est précisément l'information
// utile : elle dit où il manque du contenu.
//
// Les motifs `num.mult.table.*` sont résolus par `matchSkills` : une seule
// ligne couvre les dix tables.

import { TAGS } from './tags.js';

const { CM2, SIXIEME, CINQUIEME, QUATRIEME } = TAGS.NIVEAU;

export const CHAPITRES = [

    // --- 6ᵉ -----------------------------------------------------------------
    {
        id: '6-additions-soustractions', niveau: SIXIEME, nom: 'Additions et soustractions',
        skills: [
            'num.add.entiers', 'num.sub.entiers', 'num.complement',
            'num.vocabulaire.resultat', 'num.vocabulaire.nombres',
            'num.probleme.composition', 'num.probleme.transformation',
            'num.probleme.comparaison'
        ]
    },
    {
        id: '6-aires-perimetres', niveau: SIXIEME, nom: 'Aires et périmètres',
        skills: ['mes.perimetre.rectangle', 'mes.aire.rectangle', 'mes.aire.proportion', 'geo.aires.tangram']
    },
    {
        id: '6-conversion', niveau: SIXIEME, nom: 'Conversion',
        skills: ['num.conversion', 'num.numeration.conversion']
    },
    {
        id: '6-divisions', niveau: SIXIEME, nom: 'Divisions',
        skills: ['num.div.quotient', 'num.vocabulaire.division', 'num.probleme.division']
    },
    {
        id: '6-elements-geometrie', niveau: SIXIEME, nom: 'Éléments de géométrie',
        skills: [
            'geo.notation.ecrire', 'geo.notation.lire', 'geo.notation.dire',
            'geo.construire.instruments', 'geo.figure.programme', 'geo.repere.coord'
        ]
    },
    {
        id: '6-fractions', niveau: SIXIEME, nom: 'Fractions',
        skills: ['num.frac.sens', 'num.frac.denominateur-commun', 'num.probleme.fraction']
    },
    {
        id: '6-angles', niveau: SIXIEME, nom: 'Les angles',
        skills: ['geo.angles.mesure', 'geo.angles.construire']
    },
    {
        id: '6-solides', niveau: SIXIEME, nom: 'Les solides',
        skills: ['geo.espace.denombrer', 'geo.espace.orientation']
    },
    {
        // Rien encore : les triangles de 6ᵉ ne sont pas couverts.
        id: '6-triangles', niveau: SIXIEME, nom: 'Les triangles', skills: []
    },
    {
        id: '6-multiplications', niveau: SIXIEME, nom: 'Multiplications',
        skills: [
            'num.mult.sens', 'num.mult.facteur-manquant', 'num.mult.table.*',
            'num.dec.puissances10', 'num.calc.doublements',
            'num.vocabulaire.multiples', 'num.probleme.multiplication'
        ]
    },
    {
        id: '6-nombres-entiers-decimaux', niveau: SIXIEME, nom: 'Nombres entiers et décimaux',
        skills: [
            'num.ecriture.lettres', 'num.numeration.rang', 'num.decimal.parties',
            'num.decimal.zeros', 'num.numeration.decomposition', 'num.numeration.egypte',
            'num.parite', 'num.calc.decomposition'
        ]
    },
    {
        id: '6-ordre', niveau: SIXIEME, nom: 'Ordre',
        skills: ['num.dec.compare', 'num.dec.graduations', 'num.ordre-grandeur', 'num.logique.dichotomie']
    },
    {
        id: '6-paralleles-perpendiculaires', niveau: SIXIEME, nom: 'Parallèles et perpendiculaires',
        skills: ['geo.para-perp']
    },
    {
        id: '6-priorites', niveau: SIXIEME, nom: 'Priorités opératoires',
        skills: ['num.prio']
    },
    { id: '6-probabilites', niveau: SIXIEME, nom: 'Probabilités', skills: [] },
    {
        id: '6-proportionnalite', niveau: SIXIEME, nom: 'Proportionnalité',
        skills: ['num.proportion.tableau', 'num.probleme.proportion']
    },
    { id: '6-quadrilateres', niveau: SIXIEME, nom: 'Quadrilatères', skills: [] },
    { id: '6-symetrie-axiale', niveau: SIXIEME, nom: 'Symétrie axiale', skills: [] },
    {
        id: '6-temps', niveau: SIXIEME, nom: 'Temps',
        skills: ['mes.heure.lire', 'mes.heure.placer', 'mes.vitesse', 'num.probleme.duree']
    },

    // --- 5ᵉ -----------------------------------------------------------------
    {
        id: '5-aires-perimetres', niveau: CINQUIEME, nom: 'Aires et périmètres',
        skills: ['mes.perimetre.rectangle', 'mes.aire.rectangle', 'mes.aire.proportion', 'geo.aires.tangram']
    },
    { id: '5-calcul-litteral', niveau: CINQUIEME, nom: 'Calcul littéral', skills: [] },
    {
        id: '5-divisions', niveau: CINQUIEME, nom: 'Divisions',
        skills: ['num.div.quotient', 'num.vocabulaire.division', 'num.probleme.division']
    },
    {
        id: '5-fractions', niveau: CINQUIEME, nom: 'Fractions',
        skills: [
            'num.frac.sens', 'num.frac.compare', 'num.frac.add-meme-denom',
            'num.frac.denominateur-commun', 'num.frac.simplification', 'num.probleme.fraction'
        ]
    },
    {
        id: '5-angles', niveau: CINQUIEME, nom: 'Les angles',
        skills: ['geo.angles.mesure', 'geo.angles.construire']
    },
    {
        id: '5-mediatrices', niveau: CINQUIEME, nom: 'Médiatrices',
        skills: ['geo.construire.instruments']
    },
    { id: '5-parallelogramme', niveau: CINQUIEME, nom: 'Parallélogramme', skills: [] },
    {
        id: '5-proportionnalite', niveau: CINQUIEME, nom: 'Proportionnalité',
        skills: ['num.proportion.tableau', 'num.probleme.proportion']
    },
    {
        id: '5-relatifs', niveau: CINQUIEME, nom: 'Relatifs',
        skills: ['num.relatifs.sens', 'num.relatifs.somme']
    },
    {
        id: '5-solides', niveau: CINQUIEME, nom: 'Solides',
        skills: ['geo.espace.denombrer', 'geo.espace.orientation']
    },
    { id: '5-transformations', niveau: CINQUIEME, nom: 'Transformations', skills: [] },
    {
        id: '5-triangles', niveau: CINQUIEME, nom: 'Triangles',
        skills: ['geo.figure.programme']
    },

    // --- 4ᵉ -----------------------------------------------------------------
    { id: '4-calcul-litteral', niveau: QUATRIEME, nom: 'Calcul littéral', skills: [] },
    { id: '4-equations', niveau: QUATRIEME, nom: 'Équations', skills: [] },
    {
        id: '4-fractions', niveau: QUATRIEME, nom: 'Fractions',
        skills: ['num.frac.compare', 'num.frac.simplification']
    },
    {
        id: '4-grandeurs-composees', niveau: QUATRIEME, nom: 'Grandeurs composées',
        skills: ['mes.vitesse']
    },
    { id: '4-fonctions', niveau: QUATRIEME, nom: 'Les fonctions', skills: [] },
    { id: '4-solides', niveau: QUATRIEME, nom: 'Les solides', skills: [] },
    { id: '4-probabilite', niveau: QUATRIEME, nom: 'Probabilité', skills: [] },
    {
        id: '4-produits-relatifs', niveau: QUATRIEME, nom: 'Produits de relatifs',
        skills: ['num.relatifs.somme']
    },
    {
        id: '4-proportionnalite', niveau: QUATRIEME, nom: 'Proportionnalité',
        skills: ['num.proportion.tableau', 'num.probleme.proportion']
    },
    { id: '4-puissances', niveau: QUATRIEME, nom: 'Puissances', skills: [] },
    {
        id: '4-reperage', niveau: QUATRIEME, nom: 'Repérage',
        skills: ['geo.repere.coord', 'geo.repere.relatifs']
    },
    {
        id: '4-statistiques', niveau: QUATRIEME, nom: 'Statistiques',
        skills: ['don.tableur.reperage', 'don.tableur.formules']
    },
    { id: '4-transformations', niveau: QUATRIEME, nom: 'Transformations', skills: [] },
    {
        id: '4-triangles-rectangles', niveau: QUATRIEME, nom: 'Triangles rectangles',
        skills: ['geo.pythagore']
    },
    { id: '4-triangles-semblables', niveau: QUATRIEME, nom: 'Triangles semblables', skills: [] }
];

/** Les niveaux qui ont une progression, dans l'ordre de la scolarité. */
export const NIVEAUX_AVEC_CHAPITRES = [CM2, SIXIEME, CINQUIEME, QUATRIEME]
    .filter(n => CHAPITRES.some(c => c.niveau === n));
