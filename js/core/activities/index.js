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
import { carreMagiqueGenerator } from '../generators/carreMagique.js';
import { futoshikiGenerator } from '../generators/futoshiki.js';
import { relierGenerator } from '../generators/relier.js';
import { solidesGenerator } from '../generators/solides.js';
import { repereFicheGenerator } from '../generators/repereFiche.js';
import { slitherlinkGenerator } from '../generators/slitherlink.js';
import { virguleFicheGenerator } from '../generators/virguleFiche.js';
import { problemesFicheGenerator } from '../generators/problemesFiche.js';

// --- Générateurs ------------------------------------------------------------

[
    additionGenerator, soustractionGenerator, multFactGenerator,
    multMissingGenerator, divisionGenerator, prioriteGenerator, mixteGenerator,
    fracCompareGenerator, fracAddGenerator, decCompareGenerator,
    repereGenerator, perimetreGenerator, aireGenerator,
    // Chapitre « Nombres entiers et décimaux » (6ᵉ)
    chiffreRangGenerator, partiesGenerator, zerosGenerator, conversionGenerator,
    decompositionGenerator, lettresGenerator, ordreGrandeurGenerator,
    egypteGenerator, complementGenerator, pariteGenerator,
    kenkenGenerator, binairoGenerator, garamGenerator, sudokuGenerator,
    anglesGenerator, scratchGenerator, horlogeGenerator, relatifsGenerator,
    relatifsAdditionGenerator, redactionGenerator, logigrammeGenerator, dominosGenerator,
    pythagoreGenerator, vitesseGenerator, carreMagiqueGenerator, futoshikiGenerator,
    slitherlinkGenerator, relierGenerator, solidesGenerator, repereFicheGenerator,
    virguleFicheGenerator, problemesFicheGenerator
].forEach(registerGenerator);

// --- Activités pilotées par un générateur -----------------------------------

const choiceModule = () => import('./choice.js');

registerActivity({
    id: 'bubbles',
    label: 'Bulles',
    accepts: ['choice', 'numeric'],
    supports: { timed: true, autonomous: false, demo: true },
    load: choiceModule,
    mountOptions: { variant: 'bubbles' }
});

registerActivity({
    id: 'digicode',
    label: 'Digicode',
    accepts: ['choice'],
    supports: { timed: true, autonomous: false, demo: true },
    load: choiceModule,
    mountOptions: { variant: 'digicode' }
});

registerActivity({
    id: 'buttons',
    label: 'Boutons',
    accepts: ['choice'],
    supports: { timed: true, autonomous: false, demo: true },
    load: choiceModule,
    mountOptions: { variant: 'buttons' }
});

registerActivity({
    id: 'signs',
    label: 'Comparaison (< = >)',
    accepts: ['choice'],
    supports: { timed: true, autonomous: false, demo: true },
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
    label: 'Mathdoku',
    accepts: ['grid'],
    supports: { timed: true, autonomous: false, demo: true },
    load: () => import('./kenken.js')
});

registerActivity({
    id: 'binairo',
    label: 'Binairo',
    accepts: ['grid'],
    supports: { timed: true, autonomous: false, demo: true },
    load: () => import('./binairo.js')
});

registerActivity({
    id: 'garam',
    label: 'Garam',
    accepts: ['grid'],
    supports: { timed: true, autonomous: false, demo: true },
    load: () => import('./garam.js')
});

registerActivity({
    id: 'sudoku',
    label: 'Sudoku',
    accepts: ['grid'],
    supports: { timed: true, autonomous: false, demo: true },
    load: () => import('./sudoku.js')
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
    ['memory', 'Memory', 'math_memory', 'engineMathMemory'],
    ['labyrinthe', 'Labyrinthe', 'labyrinthe', 'engineLabyrinthe'],
    ['course', 'Course', 'course', 'engineCourse'],
    ['tetris', 'Math Tetris', 'tetris', 'engineTetris'],
    ['crush', 'Math Crush', 'math_crush', 'engineMathCrush'],
    ['vault', 'Le Coffre-Fort', 'vault', 'engineVault'],
    ['galactic', 'Galactic : Tir aux Angles', 'galactic', 'engineGalactic'],
    ['samurai', 'Le Samouraï des Fractions', 'fractions_samurai', 'engineFracSamurai'],
    ['tableur', 'L\'École du Tableur', 'spreadsheet', 'engineTableur'],
    ['ninja', 'Ninja des Nombres', 'ninja', 'engineNinja'],
    ['escadrille', 'Escadrille des Tables', 'escadrille', 'engineEscadrille'],
    ['nova', 'Nova', 'nova', 'engineNova'],
    ['demineur', 'Le Démineur', 'demineur', 'engineDemineur'],
    ['chantier', 'Le Chantier des Blocs', 'chantier', 'engineChantier'],
    ['motscaches', 'Mots Cachés Mathématiques', 'motsCaches', 'engineMotsCaches'],
    ['arpenteurs', 'Les Arpenteurs (à deux)', 'arpenteurs', 'engineArpenteurs'],
    ['ninja', 'Trancher et tirer', 'ninja', 'engineNinja'],
    ['dictee', 'Dictée de nombres', 'dictee', 'engineDictee'],
    ['redaction', 'Rédiger un raisonnement', 'redaction', 'engineRedaction'],
    ['logigramme', 'Logigramme', 'logigramme', 'engineLogigramme'],
    ['dominos', 'Dominos mathématiques', 'dominos', 'engineDominos'],
    ['dix', 'Les Amis de Dix (paires)', 'dix', 'engineDix'],
    ['pythagore-theoreme', 'Le Théorème de Pythagore', 'pythagore_theoreme', 'enginePythagoreTheoreme'],
    ['deuxmille', '2048 (doublements)', 'deuxmille', 'engineDeuxMille'],
    ['carre-magique', 'Le Carré Magique', 'carreMagique', 'engineCarreMagique'],
    ['futoshiki', 'Futoshiki', 'futoshiki', 'engineFutoshiki'],
    ['jezzball', 'JezzBall (conquête d\'aire)', 'jezzball', 'engineJezzBall'],
    ['canon', 'Le Canon des Compléments', 'canon', 'engineCanon'],
    ['skweek', 'Skweek (repeindre le sol)', 'skweek', 'engineSkweek'],
    ['slitherlink', 'Slitherlink (la boucle unique)', 'slitherlink', 'engineSlitherlink'],
    ['tangram', 'Le Tangram (aires et pièces)', 'tangram', 'engineTangram'],
    ['solides', 'Compter sur un solide', 'solides', 'engineSolides'],
    ['relier', 'Relier les points', 'relier', 'engineRelier'],
    ['duel', 'Duel des Tables (à deux)', 'duel', 'engineDuel'],
    ['ville', 'Le Plan de Ville', 'ville', 'engineVille'],
    ['pizza', 'La Pizzeria des Fractions', 'pizza', 'enginePizza'],
    ['othello', 'Othello', 'plateau', 'engineOthello'],
    ['dames', 'Jeu de Dames', 'plateau', 'engineDames'],
    ['echecs', 'Échecs', 'plateau', 'engineEchecs'],
    ['automate', 'L\'Automate (exécuter un programme)', 'automate', 'engineAutomate'],
    ['problemes', 'Histoires en Pagaille', 'problemes', 'engineProblemes'],
    ['proportion', 'Tableau de Proportionnalité', 'proportion', 'engineProportion'],
    ['virgule', 'La Virgule qui ne bouge pas', 'virgule', 'engineVirgule']
];

legacy.forEach(([id, label, file, fn]) => {
    registerActivity({
        id, label,
        accepts: [],
        supports: { timed: true, autonomous: true, demo: true },
        legacyModule: `../../games/${file}.js`,
        legacyExport: fn,
        load: () => import(`../../games/${file}.js`)
    });
});

