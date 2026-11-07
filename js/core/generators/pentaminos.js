// LES PENTAMINOS — faire tenir des pièces de cinq cases dans un rectangle.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 29 octobre : « les penamios, ca me va », sur la maquette qui montrait
// quatre pièces dans un 4 × 5.
//
// LE NIVEAU EST LA TAILLE DU RECTANGLE, et rien d'autre. Quatre pièces, cinq,
// six : c'est le nombre de pièces à tenir en tête qui fait la difficulté, pas
// leur forme. Les douze pentaminos dans un 6 × 10 — le puzzle classique — ne
// sont pas au catalogue et ne le seront pas : une demi-heure de tâtonnement
// n'est pas un exercice de mathématiques, c'est de la patience.
//
// CE QUE L'ÉLÈVE TRAVAILLE : l'aire, d'abord — chaque pièce vaut cinq cases,
// donc le rectangle a une aire multiple de cinq et le nombre de pièces s'en
// déduit. Puis la SYMÉTRIE : le X ne tourne pas, le I n'a que deux
// orientations, le F en a huit, et l'on s'en aperçoit en appuyant sur
// « Tourner » sans que rien ne change.

import { makeItem } from '../items.js';
import { NIVEAUX, tirerPuzzle } from '../pentaminos.js';

const SKILL = 'num.logique.pentaminos';

export const pentaminosGenerator = {
    id: 'logique.pentaminos',
    label: 'Les Pentaminos',
    skills: [SKILL],
    answerKinds: ['grid'],
    params: [
        {
            id: 'niveau', type: 'select', label: 'La taille du rectangle', default: '1',
            aide: 'C\'est le NOMBRE de pièces qui fait la difficulté, pas leur forme : '
                + 'quatre pièces se posent presque de tête, six demandent de revenir en '
                + 'arrière.',
            options: Object.entries(NIVEAUX).map(([value, n]) => ({ value, label: n.nom }))
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const niveau = NIVEAUX[p.niveau] ? Number(p.niveau) : 1;
        const jeu = tirerPuzzle(rng, niveau);

        const consigne = `Fais tenir les ${jeu.combien} pièces dans le rectangle, `
            + 'sans trou et sans chevauchement.';

        return makeItem({
            seed: rng.seed,
            generatorId: 'logique.pentaminos',
            skillId: SKILL,
            answerKind: 'grid',
            prompt: {
                text: consigne,
                papier: consigne,
                html: `<div class="game-question pn-consigne">${consigne}</div>`
            },
            // LA RÉPONSE EST LE RECTANGLE PLEIN. L'écran n'envoie que cela : il
            // existe souvent plusieurs pavages, et compter faux une solution
            // juste parce qu'elle n'est pas CELLE du générateur serait le pire
            // défaut possible dans un jeu de placement.
            answer: 'plein',
            hints: [
                `${jeu.largeur} × ${jeu.hauteur} = ${jeu.largeur * jeu.hauteur} cases, et `
                    + `chaque pièce en vaut 5 : il en faut donc ${jeu.combien}.`,
                'Commence par un COIN : une case de coin ne se remplit que de deux façons, '
                    + 'alors qu\'une case du milieu s\'en offre huit.',
                'Si une case se retrouve seule, entourée de pièces, aucune ne pourra plus '
                    + 'la prendre : recule d\'un cran plutôt que de continuer.'
            ],
            explanation: `Un pavage possible : ${jeu.solution
                .map(s => `${s.id} en (${s.x + 1}, ${s.y + 1})`).join(', ')}.`,
            difficulty: niveau,
            meta: {
                largeur: jeu.largeur, hauteur: jeu.hauteur, combien: jeu.combien,
                pieces: jeu.pieces, solution: jeu.solution,
                titreCourt: 'Pentaminos',
                texteLecon: 'Chaque pièce vaut cinq cases : l\'aire du rectangle donne '
                    + 'le nombre de pièces.'
            }
        });
    }
};

export default pentaminosGenerator;
