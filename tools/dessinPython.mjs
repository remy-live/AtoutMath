// LE SEUIL DE RESSEMBLANCE, MESURÉ SUR DE VRAIS DESSINS.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 19 novembre : « aussi des fonctions et du dessin ».
//
// Dire si la figure d'un élève est celle du modèle est LA décision de cet
// exercice : trop sévère, on refuse une figure juste tracée un pixel à côté —
// la pire chose qu'un exercice de programmation puisse faire ; trop large, on
// accepte un pentagone pour un hexagone et l'exercice ne mesure plus rien.
//
// CE SEUIL NE SE CHOISIT PAS À LA RÉFLEXION. Il se lit sur un tableau : la
// même figure écrite autrement d'un côté, les fautes qu'un élève fait de
// l'autre, et un trou entre les deux. Ce fichier imprime ce tableau.
//
//     node tools/dessinPython.mjs
//
// Il sert aussi de garde-fou quand on touche à la grille, à la taille de la
// planche, ou à `ressemblance` : si le trou se referme, le seuil ne veut plus
// rien dire, et il vaut mieux le savoir ici que sur la copie d'un élève.

import { ouvrirSonde } from './sonde.mjs';
import { ressemblance, SEUIL } from '../js/core/python/dessin.js';

const EN_TETE = 'import turtle\nt = turtle.Turtle()\nt.speed(0)\n';

/** Les paires : un modèle, un essai, et ce qu'on attend du verdict. */
const PAIRES = [
    ['la même, écrite autrement',
        'for i in range(4):\n    t.forward(120)\n    t.left(90)',
        't.forward(120)\nt.left(90)\nt.forward(120)\nt.left(90)\n'
        + 't.forward(120)\nt.left(90)\nt.forward(120)\nt.left(90)', true],
    // ── CE QUE LA MESURE M'A APPRIS, ET QUI N'ÉTAIT PAS MON IDÉE ────────
    //
    // J'attendais « la même figure » pour un carré tracé en tournant à
    // DROITE : c'est bien un carré de côté 120. La mesure rend 0,385, et elle
    // a raison — il est tracé DE L'AUTRE CÔTÉ du point de départ.
    //
    // ON GARDE DONC LA POSITION DANS LA FIGURE, et c'est une décision : le
    // modèle est MONTRÉ à l'élève, à côté de son dessin. Deux carrés qui ne
    // se superposent pas ne se ressemblent pas à l'œil, et lui répondre « la
    // même » devant deux images différentes serait incompréhensible. Il voit
    // immédiatement pourquoi, ce qui est la meilleure des corrections.
    ['un carré, mais tracé de l’autre côté',
        'for i in range(4):\n    t.forward(120)\n    t.left(90)',
        'for i in range(4):\n    t.forward(120)\n    t.right(90)', false],
    ['un côté plus long de quatre pixels',
        'for i in range(4):\n    t.forward(120)\n    t.left(90)',
        'for i in range(4):\n    t.forward(124)\n    t.left(90)', true],
    ['un côté trop court d’un quart',
        'for i in range(4):\n    t.forward(120)\n    t.left(90)',
        'for i in range(4):\n    t.forward(90)\n    t.left(90)', false],
    ['un côté sur deux oublié',
        'for i in range(4):\n    t.forward(120)\n    t.left(90)',
        'for i in range(2):\n    t.forward(120)\n    t.left(90)', false],
    ['un triangle au lieu d’un carré',
        'for i in range(4):\n    t.forward(120)\n    t.left(90)',
        'for i in range(3):\n    t.forward(120)\n    t.left(120)', false],
    ['un pentagone au lieu d’un hexagone',
        'for i in range(6):\n    t.forward(80)\n    t.left(60)',
        'for i in range(5):\n    t.forward(80)\n    t.left(72)', false],
    ['rien du tout',
        'for i in range(4):\n    t.forward(120)\n    t.left(90)',
        'x = 1', false],
    // ET CELUI-CI AUSSI M'A REPRIS : mon premier « trait en trop » repassait
    // sur le côté du carré, et ne dépassait que de trente pixels. La mesure
    // rendait 0,937 — presque juste, et elle avait raison : le dessin était
    // presque le même. On ajoute donc un trait qui va VRAIMENT ailleurs.
    ['le modèle, plus une diagonale en trop',
        'for i in range(4):\n    t.forward(120)\n    t.left(90)',
        'for i in range(4):\n    t.forward(120)\n    t.left(90)\n'
        + 't.left(45)\nt.forward(150)', false],
    ['le même escalier, écrit avec une fonction',
        't.forward(60)\nt.left(90)\nt.forward(60)\nt.right(90)\n'
        + 't.forward(60)\nt.left(90)\nt.forward(60)\nt.right(90)',
        'def marche():\n    t.forward(60)\n    t.left(90)\n    t.forward(60)\n'
        + '    t.right(90)\n\nmarche()\nmarche()', true]
];

const s = await ouvrirSonde({ largeur: 900, hauteur: 1100 });
await s.identifier();
await s.ouvrirExercice('algo-python-ecrire', {}, { questions: 3 });
await s.doitExister('[data-code]');
await s.page.waitForTimeout(3500);

const grille = (source) => s.page.evaluate(async (src) => {
    const { dessiner } = await import('./js/core/python/executer.js');
    const r = await dessiner(src, { largeur: 400, hauteur: 400 });
    return r.ok ? r.grille : 'ERREUR ' + (r.dire || r.erreur || '?');
}, EN_TETE + source);

let rates = 0;
let plancherDesJustes = 1, plafondDesFausses = 0;
console.log('\n\x1b[1mCE QUE LA RESSEMBLANCE REND, SUR DE VRAIS DESSINS\x1b[0m');
for (const [quoi, modele, essai, attendu] of PAIRES) {
    const a = await grille(modele);
    const b = await grille(essai);
    if (String(a).startsWith('ERREUR') || String(b).startsWith('ERREUR')) {
        rates++;
        console.log(`  \x1b[31m✗\x1b[0m ${quoi} — ${a.slice(0, 40)} / ${b.slice(0, 40)}`);
        continue;
    }
    const r = ressemblance(a, b);
    const juge = r >= SEUIL;
    const bon = juge === attendu;
    if (!bon) rates++;
    if (attendu) plancherDesJustes = Math.min(plancherDesJustes, r);
    else plafondDesFausses = Math.max(plafondDesFausses, r);
    console.log(`  ${bon ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${quoi.padEnd(44)}`
        + ` ${r.toFixed(3)}  → ${juge ? 'la même' : 'une autre'}`
        + `  \x1b[2m(attendu : ${attendu ? 'la même' : 'une autre'})\x1b[0m`);
}

console.log('\n' + '─'.repeat(70));
console.log(`  la plus BASSE des figures justes : ${plancherDesJustes.toFixed(3)}`);
console.log(`  la plus HAUTE des figures fausses : ${plafondDesFausses.toFixed(3)}`);
console.log(`  seuil employé : ${SEUIL}`);
const trou = plancherDesJustes - plafondDesFausses;
console.log(trou > 0.05
    ? `  \x1b[32mle trou fait ${trou.toFixed(3)} : le seuil tient.\x1b[0m`
    : `  \x1b[31mle trou ne fait que ${trou.toFixed(3)} : le seuil ne sépare plus rien.\x1b[0m`);
if (trou <= 0.05) rates++;

await s.fermer();
process.exit(rates ? 1 : 0);
