// Générateur du RAYON ET DES MIROIRS.
//
// Rémy, capture à l'appui : « j'aimerai bien un jeu dans ce style avec des
// lasers et des miroirs, je ne connais pas le nom. C'est un exercice bonus
// comme le sudoku. »
//
// « COMME LE SUDOKU » DIT DEUX CHOSES, et elles commandent tout ce fichier.
// D'abord que c'est un jeu de raisonnement et non une leçon : il n'entre donc
// pas dans la révision (`sansRevision` au catalogue), parce qu'une grille ne se
// repose pas — « le miroir en haut à droite » n'a aucun sens ailleurs. Ensuite
// qu'une grille est une QUESTION LONGUE : on en pose une par niveau, pas dix.
//
// Le générateur ne fait presque rien : il choisit le niveau et tire la grille.
// Tout le reste — où va le rayon, s'il arrive — se recalcule à chaque geste
// dans core/lasers.js, sur la grille telle qu'elle est à l'écran. Rien n'est
// mémorisé qui puisse se désynchroniser.

import { makeItem } from '../items.js';
import { MARCHES_LASER, tirerNiveau, tracer, CONSIGNE } from '../lasers.js';
import {
    paramMarches, marchesCochees, marcheAuRang, conseilProgression, totalDe
} from '../progression.js';

const SKILL = 'geo.transfo.reflexion';
const MOT = 'niveau';

/** Une grille par niveau : une grille est une question longue. */
const PAR_MARCHE = 1;

export const lasersGenerator = {
    id: 'logique.lasers',
    label: 'Le rayon et les miroirs',
    skills: [SKILL],
    answerKinds: ['grid'],
    // Pas de fiche papier : le jeu tient dans un geste — poser un miroir, voir
    // le rayon se déplacer aussitôt — qu'aucune feuille ne rend. Voir l'en-tête
    // de printSheet.js : on n'imprime que ce qui se travaille au crayon.
    conseil: (p) => conseilProgression(marchesCochees(p, MARCHES_LASER).length, PAR_MARCHE),
    params: [
        paramMarches({ marches: MARCHES_LASER, mot: MOT })
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const id = marcheAuRang(ctx.index ?? 0, marchesCochees(params, MARCHES_LASER),
            totalDe(ctx, params), params, PAR_MARCHE);
        const marche = MARCHES_LASER.find(m => m.id === id) || MARCHES_LASER[0];

        // LE TIRAGE PEUT RATER, ET C'EST ASSUMÉ : dessiner un trajet à quatre
        // virages dans une grille de sept sort parfois du cadre. On réessaie
        // sur un niveau plus court plutôt que de compliquer le tirage — un
        // algorithme qui ne rate jamais coûterait dix fois le prix du repli.
        let g = tirerNiveau(rng, marche);
        let replie = null;
        for (let k = MARCHES_LASER.indexOf(marche) - 1; !g && k >= 0; k--) {
            replie = MARCHES_LASER[k];
            g = tirerNiveau(rng, replie);
        }
        const vrai = replie || marche;

        const combien = g.budget;
        const consigne = combien === 1
            ? 'Pose LE miroir qui amène le rayon sur la cible.'
            : `Pose tes ${combien} miroirs pour amener le rayon sur la cible.`;

        return makeItem({
            seed: rng.seed,
            generatorId: 'logique.lasers',
            skillId: SKILL,
            answerKind: 'grid',
            prompt: {
                text: consigne,
                html: `<div class="game-question la-consigne">${combien === 1
                    ? 'Pose <b>le miroir</b> qui amène le rayon sur la cible.'
                    : `Pose tes <b>${combien} miroirs</b> pour amener le rayon sur la cible.`}</div>`
            },
            // LA RÉPONSE EST UN ÉTAT, PAS UNE GRILLE PARTICULIÈRE.
            //
            // Une même cible s'atteint souvent par plusieurs trajets, et refuser
            // celui de l'élève parce qu'il n'est pas celui qu'on avait tiré
            // serait incompréhensible pour lui. C'est donc l'activité qui
            // soumet ce mot-là, et seulement quand `tracer` dit que le rayon
            // arrive. La règle vit dans core/lasers.js, où elle se teste sans
            // écran.
            answer: 'rayon-arrive',
            hints: [
                'Suis le rayon du doigt depuis sa source : à quel endroit faudrait-il qu’il tourne ?',
                'Un miroir « / » envoie vers le haut ce qui allait à droite ; « \\ » l’envoie vers le bas.',
                'Regarde la cible : par où le rayon peut-il y arriver — par la gauche, par le bas ?'
            ],
            explanation: `Le rayon part vers ${enToutesLettres(g.source.sens)} et doit tourner `
                + `${combien} fois : chaque miroir lui fait faire un quart de tour.`,
            difficulty: 1 + MARCHES_LASER.indexOf(vrai),
            meta: {
                marche: vrai.id, titre: vrai.nom,
                n: g.n, depart: g.cases, solution: g.solution, fixes: g.fixes,
                source: g.source, cible: g.cible, budget: combien,
                // Le trajet de la solution, en clair : c'est la seule
                // description lisible d'une grille, pour les tests et l'aperçu.
                trajet: tracer({ ...g, cases: g.solution }).chemin.map(c => `${c.x},${c.y}`)
            }
        });
    }
};

const MOTS = { E: 'la droite', O: 'la gauche', N: 'le haut', S: 'le bas' };
const enToutesLettres = (s) => MOTS[s] || s;
