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
    anglesGenerator
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

// Variante « table de Pythagore » : même activité de choix, plus un support
// visuel construit à partir des métadonnées de l'item.
registerActivity({
    id: 'pythagore',
    label: 'Table de Pythagore',
    accepts: ['choice'],
    requiresMeta: ['t', 'm'],
    supports: { timed: true, autonomous: false, demo: true },
    load: choiceModule,
    mountOptions: {
        variant: 'bubbles',
        context: (item) => pythagoreTable(item.meta.m, item.meta.t)
    }
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
    ['tableur', 'L\'École du Tableur', 'spreadsheet', 'engineTableur']
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

// --- Support visuel de la table de Pythagore --------------------------------

function pythagoreTable(row, col) {
    let html = '<div class="pytha-table" role="presentation">';
    html += '<div class="pytha-cell pytha-cell--corner">×</div>';
    for (let c = 1; c <= 10; c++) {
        html += `<div class="pytha-cell pytha-cell--header${c === col ? ' pytha-cell--highlight' : ''}">${c}</div>`;
    }
    for (let r = 1; r <= 10; r++) {
        html += `<div class="pytha-cell pytha-cell--header${r === row ? ' pytha-cell--highlight' : ''}">${r}</div>`;
        for (let c = 1; c <= 10; c++) {
            html += (r === row && c === col)
                ? '<div class="pytha-cell pytha-cell--target">?</div>'
                : `<div class="pytha-cell">${r * c}</div>`;
        }
    }
    return html + '</div>';
}
