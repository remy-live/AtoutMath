// LES PROBLÈMES DE MAT, SUR LE PAPIER.
//
// Un problème d'échecs se cherche très bien crayon en main — mieux, même :
// devant l'écran on essaie, on voit, on recommence ; sur la feuille il faut
// TOUT prévoir dans sa tête avant d'écrire. C'est le même exercice, en plus
// exigeant.
//
// Ce que l'élève écrit, c'est LE COUP en notation : « Ta8 ». Pas une case, pas
// une phrase : la notation d'échecs est un couple lettre-chiffre précédé de
// l'initiale de la pièce, et c'est exactement le repérage du cours.
//
// Les positions viennent de la même bibliothèque que l'écran (core/mat.js), et
// leurs solutions sont trouvées par le même solveur. Une fiche ne peut donc pas
// annoncer un mat qui n'existe pas, ni une solution unique qui ne l'est pas :
// les tests le vérifient position par position.

import { makeItem } from '../items.js';
import { preparer, piecesDe } from '../mat.js';
import { POSITIONS_MAT, FAMILLES_MAT } from '../../data/matProblemes.js';

export const matFicheGenerator = {
    id: 'logi.mat-fiche',
    label: 'Échecs : mat en un, mat en deux',
    answerKinds: ['text'],
    skills: ['geo.espace.reperage'],
    params: [
        {
            id: 'coups', type: 'select', label: 'Longueur du problème', default: 1,
            options: [
                { value: 1, label: 'Mat en un coup' },
                { value: 2, label: 'Mat en deux coups' }
            ]
        }
    ],
    // La signature du registre : les réglages d'abord, le contexte (dont le
    // tirage) ensuite. L'inverser produit un « rng.int is not a function » au
    // premier appel réel — et seul le test d'invariant du catalogue le voyait.
    generate(params, ctx) {
        const rng = ctx.rng;
        params = params || {};
        const n = Number(params.coups) === 2 ? 2 : 1;
        // LA FICHE PUISE DANS LA MÊME BIBLIOTHÈQUE QUE L'ÉCRAN : cent neuf
        // positions vérifiées, au lieu d'une petite liste à part qui aurait
        // divergé au premier ajout.
        const utiles = POSITIONS_MAT.filter(p => p.coups === n);
        // `themesExclus` est le canal par lequel la fiche dit au générateur ce
        // qu'elle a déjà tiré — et il arrive par le CONTEXTE, pas par les
        // réglages. Le lire au mauvais endroit ne casse rien de visible dans
        // les tests : la fiche imprime simplement trois fois la même position.
        const dejaVus = new Set(ctx.themesExclus || []);
        const libres = utiles.filter(p => !dejaVus.has(p.id));
        const pool = libres.length ? libres : utiles;
        const choisi = pool[rng.int(0, pool.length - 1)];
        const famille = FAMILLES_MAT[choisi.famille];
        // On repasse la position au solveur plutôt que de croire le fichier :
        // c'est gratuit, et une fiche ne doit jamais annoncer une solution
        // qu'elle n'a pas vérifiée.
        const p = preparer({ ...choisi, theme: famille.titre, lecon: famille.lecon });
        const solution = p.notations[0];

        return makeItem({
            seed: rng.seed,
            generatorId: 'logi.mat-fiche',
            skillId: 'geo.espace.reperage',
            answerKind: 'text',
            prompt: {
                text: `Les Blancs jouent et matent en ${n} coup${n > 1 ? 's' : ''}.`,
                papier: `Les Blancs jouent et matent en ${n} coup${n > 1 ? 's' : ''}.`,
                html: `<div class="game-question">Mat en ${n}</div>`
            },
            answer: solution,
            explanation: `${solution} — ${famille.titre}. ${famille.lecon}`,
            difficulty: n === 1 ? 2 : 4,
            meta: {
                probleme: choisi.id,
                theme: choisi.id,           // ce que la fiche exclura ensuite
                titre: famille.titre,
                coups: n,
                fen: choisi.fen,
                solution,
                pieces: piecesDe(p.etat)
            }
        });
    }
};
