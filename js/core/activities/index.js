// Déclaration de toutes les briques : générateurs et activités.
//
// C'est le seul endroit où l'on énumère ce qui existe. Ajouter une notion =
// écrire un générateur et l'inscrire ici ; ajouter un jeu = écrire un
// `mount()` et l'inscrire ici. La compatibilité entre les deux se déduit des
// manifestes, elle ne se code pas.

import { registerGenerator, registerActivity } from '../registry.js';

import {
    additionGenerator, soustractionGenerator, multFactGenerator,
    multMissingGenerator, divisionGenerator, prioriteGenerator, mixteGenerator
} from '../generators/calcul.js';
import { fracCompareGenerator, fracAddGenerator, decCompareGenerator } from '../generators/fractions.js';
import { fracEgaliteGenerator, fracSommeProgressiveGenerator } from '../generators/fractionsEquivalentes.js';
import { repereGenerator, perimetreGenerator, aireGenerator } from '../generators/geometrie.js';
import {
    chiffreRangGenerator, partiesGenerator, zerosGenerator, conversionGenerator,
    decompositionGenerator, lettresGenerator, ordreGrandeurGenerator,
    egypteGenerator, complementGenerator, pariteGenerator
} from '../generators/numeration.js';
import { kenkenGenerator } from '../generators/kenken.js';
import { binairoGenerator } from '../generators/binairo.js';
import { garamGenerator } from '../generators/garam.js';
import { sudokuGenerator } from '../generators/sudoku.js';
import { anglesGenerator } from '../generators/angles.js';
import { scratchGenerator } from '../generators/scratch.js';
import { horlogeGenerator } from '../generators/horloge.js';
import { relatifsGenerator } from '../generators/relatifs.js';
import { relatifsAdditionGenerator } from '../generators/relatifsAddition.js';
import { redactionGenerator } from '../generators/redaction.js';
import { CONSIGNES } from '../geoConstruction.js';
import { logigrammeGenerator } from '../generators/logigramme.js';
import { dominosGenerator } from '../generators/dominos.js';
import { pythagoreGenerator } from '../generators/pythagore.js';
import { vitesseGenerator } from '../generators/vitesse.js';
import { vocabulaireGenerator } from '../generators/vocabulaire.js';
import { notationGenerator } from '../generators/notation.js';
import { graduationsGenerator } from '../generators/graduations.js';
import { transfoQuadrillageGenerator } from '../generators/transfoQuadrillage.js';
import { pavageGenerator } from '../generators/pavage.js';
import { carreMagiqueGenerator } from '../generators/carreMagique.js';
import { futoshikiGenerator } from '../generators/futoshiki.js';
import { relierGenerator } from '../generators/relier.js';
import { solidesGenerator } from '../generators/solides.js';
import { repereFicheGenerator } from '../generators/repereFiche.js';
import { slitherlinkGenerator } from '../generators/slitherlink.js';
import { virguleFicheGenerator } from '../generators/virguleFiche.js';
import { problemesFicheGenerator } from '../generators/problemesFiche.js';
import { pizzaFicheGenerator } from '../generators/pizzaFiche.js';
import { proportionFicheGenerator } from '../generators/proportionFiche.js';
import { pairesFicheGenerator } from '../generators/pairesFiche.js';
import { rectangleFicheGenerator } from '../generators/rectangleFiche.js';
import { motsCachesFicheGenerator } from '../generators/motsCachesFiche.js';
import { plateauxPapierGenerator } from '../generators/plateauxFiche.js';
import { anagrammesFicheGenerator } from '../generators/anagrammesFiche.js';
import { motsCroisesFicheGenerator } from '../generators/motsCroisesFiche.js';
import { tableurFicheGenerator } from '../generators/tableurFiche.js';
import { chatFicheGenerator } from '../generators/chatFiche.js';
import { echecsFicheGenerator } from '../generators/echecsFiche.js';
import { matFicheGenerator } from '../generators/matFiche.js';
import { prioritesFicheGenerator } from '../generators/prioritesFiche.js';
import { poserFicheGenerator } from '../generators/poserFiche.js';
import { conversionFicheGenerator } from '../generators/conversionFiche.js';
import { tangramFicheGenerator } from '../generators/tangramFiche.js';
import { memoryFicheGenerator } from '../generators/memoryFiche.js';
import {
    compteFicheGenerator, pointAPointFicheGenerator, dedaleFicheGenerator,
    egypteFicheGenerator
} from '../generators/jeuxFiche.js';

// --- Générateurs ------------------------------------------------------------

[
    additionGenerator, soustractionGenerator, multFactGenerator,
    multMissingGenerator, divisionGenerator, prioriteGenerator, mixteGenerator,
    fracCompareGenerator, fracAddGenerator, decCompareGenerator,
    fracEgaliteGenerator, fracSommeProgressiveGenerator,
    repereGenerator, perimetreGenerator, aireGenerator,
    // Chapitre « Nombres entiers et décimaux » (6ᵉ)
    chiffreRangGenerator, partiesGenerator, zerosGenerator, conversionGenerator,
    decompositionGenerator, lettresGenerator, ordreGrandeurGenerator,
    egypteGenerator, complementGenerator, pariteGenerator,
    kenkenGenerator, binairoGenerator, garamGenerator, sudokuGenerator,
    anglesGenerator, scratchGenerator, horlogeGenerator, relatifsGenerator,
    relatifsAdditionGenerator, redactionGenerator, logigrammeGenerator, dominosGenerator,
    pythagoreGenerator, vitesseGenerator, vocabulaireGenerator, notationGenerator,
    graduationsGenerator, transfoQuadrillageGenerator, pavageGenerator,
    carreMagiqueGenerator, futoshikiGenerator,
    slitherlinkGenerator, relierGenerator, solidesGenerator, repereFicheGenerator,
    virguleFicheGenerator, problemesFicheGenerator, pizzaFicheGenerator,
    proportionFicheGenerator, pairesFicheGenerator, rectangleFicheGenerator,
    motsCachesFicheGenerator, plateauxPapierGenerator, anagrammesFicheGenerator,
    motsCroisesFicheGenerator, tableurFicheGenerator, chatFicheGenerator,
    echecsFicheGenerator, matFicheGenerator, prioritesFicheGenerator,
    poserFicheGenerator, conversionFicheGenerator,
    tangramFicheGenerator, memoryFicheGenerator,
    compteFicheGenerator, pointAPointFicheGenerator, dedaleFicheGenerator,
    egypteFicheGenerator
].forEach(registerGenerator);

// --- Activités pilotées par un générateur -----------------------------------

const choiceModule = () => import('./choice.js');

// L'AIDE À LA RÉPONSE : un réglage devant, deux vis derrière.
//
// Réglage d'ACTIVITÉ, pas de générateur : il ne dit rien du CONTENU des
// questions, seulement de la façon d'y répondre. Rémy : « à la fin de
// l'exercice, demander la réponse », et « on pourrait proposer à l'élève de
// donner sa proposition au bout de la moitié ». Reconnaître 42 parmi trois
// nombres n'est pas produire 42 — on peut éliminer, deviner, revenir. Mais
// commencer au clavier ferme la porte à qui hésite.
//
// C'est la progressivité qui ne dépend d'aucune notion — combien de
// propositions, et quand on passe au clavier — donc elle vit sur l'ACTIVITÉ et
// profite d'un coup à tous les exercices à propositions, au lieu d'être
// réécrite dans chacun des soixante-six générateurs.
//
// Le professeur pressé n'a qu'une ligne à lire, et son défaut est déjà le bon.
// Celui qui sait où il va ouvre « Affiner… » et pose lui-même les deux valeurs
// que le préréglage posait pour lui. Voir `core/aide.js` pour les règles.
const PARAM_AIDE = [{
    id: 'aide', type: 'select', label: 'L\'aide', default: 'progressive', papier: false,
    aide: 'En progressif, l\'exercice monte tout seul : d\'abord deux propositions '
        + '— la bonne réponse contre l\'erreur classique —, puis quatre, puis on tape '
        + 'la réponse au pavé. Une question dont la réponse n\'est pas un nombre '
        + 'reste en propositions.',
    options: [
        { value: 'progressive', label: 'Progressive (recommandé)' },
        { value: 'propositions', label: 'Toujours 4 propositions' },
        { value: 'deux', label: 'Toujours 2 propositions' },
        { value: 'clavier', label: 'Directement au clavier' }
    ]
}, {
    id: 'propositions', type: 'select', label: 'Nombre de propositions', default: 'auto', papier: false,
    affiner: true,
    aide: 'Fixe le nombre de propositions, quel que soit le rang de la question. '
        + '« Automatique » laisse le réglage « L\'aide » décider.',
    options: [
        { value: 'auto', label: 'Automatique' },
        { value: 2, label: '2' }, { value: 3, label: '3' },
        { value: 4, label: '4' }, { value: 6, label: '6' },
        { value: 'toutes', label: 'Toutes celles de l\'exercice' }
    ]
}, {
    id: 'saisie', type: 'select', label: 'Passage au clavier', default: 'auto', papier: false,
    affiner: true,
    aide: 'À partir de quand l\'élève tape sa réponse au lieu de la choisir.',
    options: [
        { value: 'auto', label: 'Automatique' },
        { value: 'jamais', label: 'Jamais — des propositions du début à la fin' },
        { value: 'tiers', label: 'Après le premier tiers' },
        { value: 'moitie', label: 'À la moitié de l\'exercice' },
        { value: 'quart', label: 'Sur le dernier quart' },
        { value: 'toujours', label: 'Dès la première question' }
    ]
}];

registerActivity({
    id: 'bubbles',
    label: 'Bulles',
    accepts: ['choice', 'numeric'],
    supports: { timed: true, autonomous: false, demo: true },
    params: PARAM_AIDE,
    load: choiceModule,
    mountOptions: { variant: 'bubbles' }
});

registerActivity({
    id: 'digicode',
    label: 'Digicode',
    accepts: ['choice'],
    supports: { timed: true, autonomous: false, demo: true },
    params: PARAM_AIDE,
    load: choiceModule,
    mountOptions: { variant: 'digicode' }
});

registerActivity({
    id: 'buttons',
    label: 'Boutons',
    accepts: ['choice'],
    supports: { timed: true, autonomous: false, demo: true },
    params: PARAM_AIDE,
    load: choiceModule,
    mountOptions: { variant: 'buttons' }
});

registerActivity({
    id: 'signs',
    label: 'Comparaison (< = >)',
    accepts: ['choice'],
    supports: { timed: true, autonomous: false, demo: true },
    params: PARAM_AIDE,
    load: choiceModule,
    // Le signe se glisse dans l'emplacement vide de l'inégalité ; le clic
    // reste possible pour qui préfère (et pour le clavier).
    mountOptions: { variant: 'signs', dragToSlot: true }
});

// Table de Pythagore INVERSÉE : le résultat est donné, la table est vide,
// l'élève clique une case dont ligne × colonne fait ce résultat — toutes les
// décompositions valides sont acceptées.
registerActivity({
    id: 'pythagore',
    label: 'Table de Pythagore',
    accepts: ['choice'],
    requiresMeta: ['t', 'm'],
    supports: { timed: true, autonomous: false, demo: true },
    load: () => import('./pythagore.js')
});

registerActivity({
    id: 'numpad',
    label: 'Pavé numérique',
    accepts: ['numeric', 'choice'],
    supports: { timed: true, autonomous: false, demo: true },
    load: () => import('./numeric.js')
});

// Placer un point : le repère est rendu en SVG et chaque nœud est cliquable.
registerActivity({
    id: 'repere',
    label: 'Repère du plan',
    accepts: ['point'],
    supports: { timed: true, autonomous: false, demo: true },
    load: () => import('./repere.js')
});

// Lire des coordonnées : même compétence, question inverse. Le repère devient
// un support visuel affiché au-dessus des propositions, comme la table de
// Pythagore — d'où la réutilisation de l'activité de choix.
registerActivity({
    id: 'repere-lecture',
    label: 'Lecture de coordonnées',
    accepts: ['choice'],
    supports: { timed: true, autonomous: false, demo: true },
    params: PARAM_AIDE,
    load: choiceModule,
    mountOptions: { variant: 'coords' }
});

registerActivity({
    id: 'moles',
    label: 'Chasse aux taupes',
    accepts: ['choice'],
    supports: { timed: true, autonomous: false, demo: true },
    load: () => import('./moles.js')
});

// Grilles logiques : genre de réponse 'grid' — l'élève construit un état
// complet, validé d'un bloc, au lieu de répondre coup par coup.
registerActivity({
    id: 'kenken',
    unite: 'grille',
    parDefaut: 3,
    label: 'Mathdoku',
    accepts: ['grid'],
    supports: { timed: true, autonomous: false, demo: true },
    load: () => import('./kenken.js')
});

registerActivity({
    id: 'binairo',
    unite: 'grille',
    parDefaut: 3,
    label: 'Binairo',
    accepts: ['grid'],
    supports: { timed: true, autonomous: false, demo: true },
    load: () => import('./binairo.js')
});

registerActivity({
    id: 'garam',
    unite: 'grille',
    parDefaut: 3,
    label: 'Garam',
    accepts: ['grid'],
    supports: { timed: true, autonomous: false, demo: true },
    load: () => import('./garam.js')
});

registerActivity({
    id: 'sudoku',
    unite: 'grille',
    parDefaut: 3,
    label: 'Sudoku',
    accepts: ['grid'],
    supports: { timed: true, autonomous: false, demo: true },
    load: () => import('./sudoku.js')
});

// « Par rapport à quoi ? » : genre de réponse 'element' — la réponse est une
// DROITE ou un POINT du quadrillage, et l'élève le désigne de trois façons de
// plus en plus exigeantes : en le choisissant, en le cliquant, en l'écrivant.
registerActivity({
    id: 'symetrie-element',
    label: 'Par rapport à quoi ?',
    accepts: ['element'],
    supports: { timed: true, autonomous: false, demo: true },
    params: [{
        id: 'reponse', type: 'select', label: 'Comment on répond', default: 'progressive',
        papier: false,
        options: [
            { value: 'progressive', label: 'Progressif : choisir, puis cliquer, puis écrire' },
            { value: 'choisir', label: 'Choisir parmi les noms tracés' },
            { value: 'cliquer', label: 'Cliquer l\'élément sur le dessin' },
            { value: 'ecrire', label: 'Écrire son équation ou ses coordonnées' }
        ],
        aide: 'Choisir, c\'est reconnaître parmi quatre ; cliquer, c\'est désigner sans nom ; '
            + 'écrire, c\'est en plus savoir le lire dans le repère. En progressif, '
            + 'l\'exercice monte tout seul : un tiers de chaque.'
    }],
    load: () => import('./symetrieElement.js')
});

// Colorier l'image d'une figure sur un quadrillage : genre de réponse 'grid'
// aussi — l'élève pose sa figure entière, puis la soumet, comme il rendrait
// une feuille. Corriger au fil des clics en ferait un jeu de chaud-froid.
registerActivity({
    id: 'quadrillage',
    unite: 'figure',
    parDefaut: 6,
    label: 'Tracer sur le quadrillage',
    accepts: ['grid'],
    supports: { timed: true, autonomous: false, demo: true },
    load: () => import('./quadrillage.js')
});

// Rapporteur interactif : genre de réponse 'angle' — l'élève mesure ou
// construit un angle en manœuvrant l'outil, puis valide en degrés.
registerActivity({
    id: 'angles',
    label: 'Rapporteur (Angle Master)',
    accepts: ['angle'],
    supports: { timed: true, autonomous: false, demo: true },
    load: () => import('./angles.js')
});

// Blocs façon Scratch : genre de réponse 'scratch' — l'élève écrit un
// programme et c'est le TRACÉ obtenu qui est jugé, pas la forme du code.
registerActivity({
    id: 'scratch',
    label: 'Le Chat Géomètre (blocs)',
    accepts: ['scratch'],
    supports: { timed: false, autonomous: false, demo: true },
    load: () => import('./scratchBlocs.js')
});

// Pendule à aiguilles : genre de réponse 'heure' — l'élève lit l'heure
// affichée, ou place les aiguilles sur une heure donnée.
registerActivity({
    id: 'horloge',
    label: 'Pendule (lire l\'heure)',
    accepts: ['heure'],
    supports: { timed: true, autonomous: false, demo: true },
    load: () => import('./horloge.js')
});

// Nombres relatifs : ascenseur, thermomètre, pastilles, droite graduée. Le
// genre de réponse est 'numeric' (ou 'choice' au choix du professeur) — mais
// c'est le DÉPLACEMENT animé qui porte l'apprentissage, pas la saisie.
registerActivity({
    id: 'relatifs',
    label: 'Nombres relatifs (droite graduée)',
    accepts: ['numeric', 'choice'],
    supports: { timed: true, autonomous: false, demo: true },
    load: () => import('./relatifs.js')
});

// Additionner des relatifs : le tableau de pastilles à deux colonnes et
// l'écriture qui se simplifie. Là où l'activité précédente montre ce QU'EST un
// nombre négatif, celle-ci montre comment on l'ÉCRIT et pourquoi une
// soustraction apparaît.
registerActivity({
    id: 'add-relatifs',
    label: 'Additionner des relatifs (pastilles)',
    accepts: ['numeric', 'choice'],
    supports: { timed: true, autonomous: false, demo: true },
    load: () => import('./addRelatifs.js')
});

// LES BANDES DE FRACTIONS. Rémy, à propos de l'addition progressive :
// « comment rendre cela visuel ? » — par deux bandes de même longueur qu'on
// recoupe. Le dénominateur commun tapé par l'élève recoupe les bandes sous ses
// yeux : les traits tombent juste, ou ils tombent en rouge à côté.
//
// Deux exercices, un seul écran : compléter une égalité, et additionner par
// marches. La règle est la même — multiplier haut et bas par le même nombre —,
// donc le dessin aussi.
registerActivity({
    id: 'fraction-egalite',
    label: 'Compléter une égalité (bandes)',
    accepts: ['numeric'],
    requiresMeta: ['egalite'],
    supports: { timed: true, autonomous: false, demo: true },
    load: () => import('./fractionsBandes.js'),
    mountOptions: { variante: 'egalite' }
});

registerActivity({
    id: 'fraction-somme',
    unite: 'addition',
    label: 'Additionner des fractions (bandes)',
    accepts: ['text'],
    requiresMeta: ['somme'],
    supports: { timed: true, autonomous: false, demo: true },
    load: () => import('./fractionsBandes.js'),
    mountOptions: { variante: 'somme' }
});

// L'ATELIER DE GÉOMÉTRIE : règle, équerre, compas et rapporteur, empruntés au
// projet GéoMaster et montés dans un cadre. Activité autonome — elle porte sa
// propre consigne et son propre jugement — mais déclarée à part des jeux
// historiques parce qu'elle a des réglages : le professeur choisit ce qu'il a
// enseigné.
registerActivity({
    id: 'geometrie',
    label: 'Atelier de géométrie (instruments)',
    accepts: [],
    supports: { timed: false, autonomous: true, demo: true },
    params: [
        {
            id: 'consigne', label: 'Construction demandée', type: 'select',
            default: 'aleatoire',
            options: [
                { value: 'aleatoire', label: 'Au hasard parmi toutes' },
                ...CONSIGNES.map(c => ({ value: c.id, label: c.titre }))
            ]
        }
    ],
    legacyModule: '../../games/geometrie.js',
    legacyExport: 'engineGeometrie',
    load: () => import('../../games/geometrie.js')
});

// --- Activités autonomes ----------------------------------------------------
// Ces jeux portent leur propre logique de contenu (plateau, physique,
// progression interne). Ils ne se combinent pas avec un générateur, mais
// remontent leurs tentatives via le même `state.recordAttempt`, donc ils
// alimentent identiquement statistiques, carnet d'erreurs et notes.

const legacy = [
    ['shooter', 'Météorites', 'arcade_shooter', 'engineArcadeShooter'],
    ['memory', 'Memory', 'math_memory', 'engineMathMemory', 'paire', 12],
    ['labyrinthe', 'Labyrinthe', 'labyrinthe', 'engineLabyrinthe'],
    ['course', 'Course', 'course', 'engineCourse'],
    ['tetris', 'Math Tetris', 'tetris', 'engineTetris'],
    ['crush', 'Math Crush', 'math_crush', 'engineMathCrush'],
    ['vault', 'Le Coffre-Fort', 'vault', 'engineVault'],
    ['galactic', 'Galactic : Tir aux Angles', 'galactic', 'engineGalactic'],
    ['samurai', 'Le Samouraï des Fractions', 'fractions_samurai', 'engineFracSamurai'],
    ['tableur', 'L\'École du Tableur', 'spreadsheet', 'engineTableur', 'formule', 8],
    ['ninja', 'Ninja des Nombres', 'ninja', 'engineNinja'],
    ['escadrille', 'Escadrille des Tables', 'escadrille', 'engineEscadrille'],
    ['nova', 'Nova', 'nova', 'engineNova'],
    ['demineur', 'Le Démineur', 'demineur', 'engineDemineur', 'grille', 3],
    ['chantier', 'Le Chantier des Blocs', 'chantier', 'engineChantier', 'chantier', 4],
    ['motscaches', 'Mots Cachés Mathématiques', 'motsCaches', 'engineMotsCaches', 'mot', 12],
    ['anagrammes', 'Anagrammes du vocabulaire', 'anagrammes', 'engineAnagrammes', 'mot'],
    ['mots-croises', 'Mots croisés du vocabulaire', 'motsCroises', 'engineMotsCroises', 'mot', 12],
    ['pipopipette', 'La Pipopipette (à deux)', 'jeuxDeux', 'enginePipopipette', 'partie', 1],
    ['puissance4', 'Puissance 4 (à deux)', 'jeuxDeux', 'enginePuissance4', 'partie', 1],
    ['sim', 'Le Sim (à deux)', 'jeuxDeux', 'engineSim', 'partie', 1],
    ['diviseurs', 'Le Chasseur de Diviseurs', 'diviseurs', 'engineDiviseurs'],
    ['arpenteurs', 'Les Arpenteurs (à deux)', 'arpenteurs', 'engineArpenteurs', 'parcelle', 12],
    ['ninja', 'Trancher et tirer', 'ninja', 'engineNinja'],
    ['dictee', 'Dictée de nombres', 'dictee', 'engineDictee'],
    ['redaction', 'Rédiger un raisonnement', 'redaction', 'engineRedaction', 'rédaction', 4],
    ['logigramme', 'Logigramme', 'logigramme', 'engineLogigramme', 'grille', 3],
    ['dominos', 'Dominos mathématiques', 'dominos', 'engineDominos', 'domino'],
    ['dix', 'Les Amis de Dix (paires)', 'dix', 'engineDix', 'paire', 24],
    ['pythagore-theoreme', 'Le Théorème de Pythagore', 'pythagore_theoreme', 'enginePythagoreTheoreme'],
    ['deuxmille', '2048 (doublements)', 'deuxmille', 'engineDeuxMille'],
    ['carre-magique', 'Le Carré Magique', 'carreMagique', 'engineCarreMagique', 'grille', 4],
    ['futoshiki', 'Futoshiki', 'futoshiki', 'engineFutoshiki', 'grille', 3],
    ['hexagrille', 'L\'Hexagrille (1 à 9, sommes fléchées)', 'hexagrille', 'engineHexagrille', 'grille', 3],
    ['jezzball', 'JezzBall (conquête d\'aire)', 'jezzball', 'engineJezzBall'],
    ['canon', 'Le Canon des Compléments', 'canon', 'engineCanon'],
    ['skweek', 'Le Peintre (repeindre le sol)', 'skweek', 'engineSkweek'],
    ['priorites', 'Priorités : la réécriture', 'priorites', 'enginePriorites'],
    ['compte-est-bon', 'Le Compte est Bon', 'compteEstBon', 'engineCompteEstBon', 'tirage', 5],
    ['conversion', 'Le tableau de conversion', 'conversion', 'engineConversion'],
    ['poser-operation', 'Poser une opération', 'poserOperation', 'enginePoserOperation', 'opération', 6],
    ['slitherlink', 'Slitherlink (la boucle unique)', 'slitherlink', 'engineSlitherlink', 'grille', 3],
    ['tangram', 'Le Tangram (aires et pièces)', 'tangram', 'engineTangram', 'figure', 3],
    ['solides', 'Compter sur un solide', 'solides', 'engineSolides'],
    ['relier', 'Relier les points', 'relier', 'engineRelier', 'figure', 3],
    ['duel', 'Duel des Tables (à deux)', 'duel', 'engineDuel', 'échange', 40],
    ['ville', 'Le Plan de Ville', 'ville', 'engineVille', 'trajet', 6],
    ['course-vecteurs', 'Course de Vecteurs', 'courseVecteurs', 'engineCourseVecteurs', 'course', 3],
    ['pizza', 'La Pizzeria des Fractions', 'pizza', 'enginePizza', 'commande', 6],
    ['othello', 'Othello', 'plateau', 'engineOthello', 'partie', 1],
    ['dames', 'Jeu de Dames', 'plateau', 'engineDames', 'partie', 1],
    ['echecs', 'Échecs', 'plateau', 'engineEchecs', 'partie', 1],
    ['automate', 'L\'Automate (exécuter un programme)', 'automate', 'engineAutomate', 'programme', 6],
    ['problemes', 'Histoires en Pagaille', 'problemes', 'engineProblemes', 'problème', 6],
    ['proportion', 'Tableau de Proportionnalité', 'proportion', 'engineProportion', 'tableau', 6],
    ['virgule', 'La Virgule qui ne bouge pas', 'virgule', 'engineVirgule'],
    ['dedale', 'Les Dédales', 'dedale', 'engineDedale', 'dédale', 5],
    ['point-a-point', 'Le Point à Point', 'pointAPoint', 'enginePointAPoint', 'dessin', 3],
    ['poser-multiplication', 'Poser une multiplication', 'poserLongue', 'enginePoserMultiplication', 'opération', 6],
    ['poser-division', 'Poser une division', 'poserLongue', 'enginePoserDivision', 'opération', 6]
];

legacy.forEach(([id, label, file, fn, unite, parDefaut]) => {
    registerActivity({
        id, label,
        // L'UNITÉ DE TRAVAIL, quand ce n'est pas « une question ». Voir
        // `unite` dans le registre : c'est la réponse à « est-ce qu'on a
        // répondu à une question quand on a relié deux cartes ? ».
        ...(unite ? { unite } : {}),
        ...(parDefaut ? { parDefaut } : {}),
        accepts: [],
        supports: { timed: true, autonomous: true, demo: true },
        legacyModule: `../../games/${file}.js`,
        legacyExport: fn,
        load: () => import(`../../games/${file}.js`)
    });
});

