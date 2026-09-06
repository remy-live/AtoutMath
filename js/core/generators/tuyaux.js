// Générateur du CIRCUIT D'EAU — la grille de tuyaux à remettre d'aplomb.
//
// Rémy : « j'aimerais bien avoir un jeu dans ce style-là, il faut tourner des
// tuyaux pour faire un chemin. » Et, sur ce qu'il en attend : le jeu de base
// reste libre, et une marche de plus COMPTE les quarts de tour.
//
// C'EST LA MÊME GRILLE QUI PORTE LES DEUX, ET C'EST VOULU. Un jeu qui devient
// un exercice quand on coche une case ne demande à l'élève aucun apprentissage
// nouveau : il connaît déjà les gestes, il découvre seulement qu'ils se
// comptent. Un exercice séparé, avec son propre dessin et ses propres règles,
// aurait coûté deux fois plus cher à écrire et une fois de plus à apprendre.
//
// Ce que le générateur produit tient en deux listes : la grille MÉLANGÉE que
// l'élève reçoit, et la SOLUTION dont elle est tirée. Le reste — où va l'eau,
// où ça fuit, si c'est gagné — se recalcule à chaque geste dans core/tuyaux.js,
// sur la grille telle qu'elle est à l'écran. Rien n'est mémorisé qui puisse se
// désynchroniser.

import { makeItem } from '../items.js';
import { tirerReseau, melanger, coutMinimum, compterBras, formeDe } from '../tuyaux.js';
import {
    paramMarches, marchesCochees, marcheAuRang, conseilProgression, totalDe
} from '../progression.js';

const SKILL = 'geo.transfo.quart-tour';

// LES NIVEAUX, DU PLUS PETIT AU PLUS EXIGEANT.
//
// La taille fait presque toute la difficulté : neuf pièces se remettent
// d'aplomb en suivant l'eau, vingt-cinq demandent qu'on s'organise. Le
// quatrième niveau change de nature — c'est celui où les quarts de tour se
// comptent — et il repart d'une petite grille : compter trente gestes n'est
// pas plus mathématique que d'en compter six, c'est seulement plus long.
export const LISTE_MARCHES = [
    { id: 'petit', nom: '1. Le petit circuit', lignes: 3, colonnes: 3 },
    { id: 'moyen', nom: '2. Le circuit', lignes: 4, colonnes: 4 },
    { id: 'grand', nom: '3. Le grand circuit', lignes: 5, colonnes: 5 },
    {
        id: 'comptes', nom: '4. Les quarts de tour comptés',
        lignes: 4, colonnes: 4,
        // QUATRE PIÈCES DE TRAVERS, PAS SEIZE. Un budget se planifie ou ne sert
        // à rien : devant vingt quarts de tour on tourne au jugé et l'on compte
        // après, devant six on regarde chaque pièce et l'on choisit son sens.
        // C'est exactement la différence entre jouer et faire des maths.
        derangees: 4, comptes: true
    }
];

const MOT = 'niveau';

/** Une grille par niveau : une grille est une question longue. */
const PAR_MARCHE = 1;

/**
 * LE BUDGET ANNONCÉ : le coût de la solution dont la grille est tirée.
 *
 * ON DIT « AU PLUS », ET C'EST HONNÊTE. Un circuit peut avoir plusieurs
 * solutions — deux tuyaux droits qui se croisent, une branche symétrique — et
 * l'une d'elles peut coûter moins cher que celle qu'on a tirée. Promettre le
 * minimum absolu demanderait de les explorer toutes ; promettre un budget
 * ATTEIGNABLE ne demande rien et ne peut pas mentir. L'élève qui fait mieux a
 * gagné aussi.
 */
const budgetDe = (melangee, solution) => coutMinimum(melangee.cases, solution);

export const tuyauxGenerator = {
    id: 'logique.tuyaux',
    label: 'Le circuit d’eau',
    skills: [SKILL],
    answerKinds: ['grid'],
    // Pas de fiche papier : le jeu tient tout entier dans un geste qu'on ne
    // peut pas faire sur une feuille. Voir l'en-tête de printSheet.js — on
    // n'imprime que ce qui se travaille au crayon.
    conseil: (p) => conseilProgression(marchesCochees(p, LISTE_MARCHES).length, PAR_MARCHE),
    params: [
        paramMarches({ marches: LISTE_MARCHES, mot: MOT })
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const id = marcheAuRang(ctx.index ?? 0, marchesCochees(params, LISTE_MARCHES),
            totalDe(ctx, params), params, PAR_MARCHE);
        const niveau = LISTE_MARCHES.find(m => m.id === id) || LISTE_MARCHES[0];

        const solution = tirerReseau(rng, niveau);
        const melangee = melanger(rng, solution,
            { combien: niveau.derangees === undefined ? Infinity : niveau.derangees });
        const budget = budgetDe(melangee, solution.cases);

        // Ce qu'il y a À FAIRE, en toutes lettres : le nombre de pièces qui ne
        // sont pas déjà en place. C'est ce que l'élève voit d'un coup d'œil sur
        // une petite grille, et ce qu'il ne peut pas compter sur une grande.
        const aTourner = melangee.cases.filter((d, i) => d !== solution.cases[i]).length;

        const consigne = niveau.comptes
            ? `Relie tout le circuit en ${budget} quart${budget > 1 ? 's' : ''} de tour au plus.`
            : 'Tourne les tuyaux pour que l’eau atteigne toutes les cases, sans une seule fuite.';

        return makeItem({
            seed: rng.seed,
            generatorId: 'logique.tuyaux',
            skillId: SKILL,
            answerKind: 'grid',
            prompt: {
                text: consigne,
                html: `<div class="game-question tu-consigne">${niveau.comptes
                    ? `Relie tout le circuit en <b>${budget} quart${budget > 1 ? 's' : ''} de tour</b> au plus.`
                    : 'Tourne les tuyaux : l’eau doit atteindre <b>toutes les cases</b>, sans une seule <b>fuite</b>.'
}</div>`
            },
            // LA RÉPONSE N'EST PAS UNE GRILLE PARTICULIÈRE, C'EST UN ÉTAT.
            //
            // Comparer à la solution tirée refuserait un circuit qui marche
            // sous prétexte qu'il n'est pas celui qu'on avait en tête — or il y
            // en a souvent plusieurs, et l'élève n'a aucun moyen de deviner
            // lequel on préfère. C'est donc l'activité qui soumet ce mot-là, et
            // seulement quand `etatReseau` dit que tout est mouillé sans fuite.
            // La règle vit dans core/tuyaux.js, où elle se teste sans écran.
            answer: 'circuit-relie',
            hints: [
                'Pars de la source et suis l’eau : la première pièce qui fuit est celle à tourner.',
                niveau.comptes
                    ? 'Trois quarts de tour dans un sens, c’est un seul quart de tour dans l’autre. Choisis le plus court.'
                    : 'Un tuyau droit n’a que deux positions : couché ou debout. Inutile de le tourner quatre fois.',
                'La pièce à tourner est entourée, et la flèche dit dans quel sens.'
            ],
            explanation: niveau.comptes
                ? `Il fallait remettre ${aTourner} pièce${aTourner > 1 ? 's' : ''} d’aplomb, `
                    + `et ${budget} quart${budget > 1 ? 's' : ''} de tour suffisaient : à chaque pièce, `
                    + `le sens le plus court est celui qui coûte un quart de tour plutôt que trois.`
                : `L’eau doit atteindre les ${solution.cases.length} cases sans fuir : `
                    + `chaque bras de tuyau doit en trouver un autre en face.`,
            difficulty: niveau.comptes ? 3 : 1 + LISTE_MARCHES.findIndex(m => m.id === niveau.id),
            meta: {
                marche: niveau.id, titre: niveau.nom,
                lignes: solution.lignes, colonnes: solution.colonnes, source: solution.source,
                depart: melangee.cases, solution: solution.cases,
                comptes: !!niveau.comptes, budget, aTourner,
                // Les formes, pour la feuille de route de l'aperçu et pour les
                // tests : c'est la seule description lisible d'une grille.
                formes: solution.cases.map(formeDe),
                bras: solution.cases.map(compterBras)
            }
        });
    }
};
