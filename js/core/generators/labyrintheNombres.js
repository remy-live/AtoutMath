// LE LABYRINTHE DES NOMBRES COMME ITEM — pour la feuille.
//
// C'est sa forme d'origine : Rémy est parti d'un LIVRE. Une grille par bloc,
// six par page, et la page des solutions montre le chemin des sauts.

import { makeItem } from '../items.js';
import { genererLabyrinthe, TAILLES, CONSIGNE } from '../labyrintheNombres.js';

export const labyNombresGenerator = {
    id: 'logique.laby-nombres',
    label: 'Le labyrinthe des nombres',
    skills: ['geo.espace.reperage'],
    answerKinds: ['grid'],
    params: [
        {
            id: 'taille', type: 'select', label: 'La grille', default: 'moyen',
            options: [
                { value: 'petit', label: '5 × 5 — pour découvrir' },
                { value: 'moyen', label: '6 × 6 — la taille habituelle' },
                { value: 'grand', label: '7 × 7 — il faut anticiper' },
                { value: 'geant', label: '8 × 8 — pour ceux qui aiment ça' }
            ]
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const t = TAILLES[(params || {}).taille] || TAILLES.moyen;
        const laby = genererLabyrinthe({ ...t, rng })
            || genererLabyrinthe({ ...TAILLES.petit, rng });
        return makeItem({
            seed: rng.seed,
            generatorId: 'logique.laby-nombres',
            skillId: 'geo.espace.reperage',
            answerKind: 'grid',
            prompt: {
                text: `Va du départ à l'étoile en sautant, sur la grille ${laby.l} × ${laby.h}.`,
                html: `<div class="game-question">Labyrinthe des nombres — ${laby.l} × ${laby.h}</div>`
            },
            answer: laby.solution.map(c => c.join('')).join('-'),
            explanation: CONSIGNE,
            difficulty: laby.l <= 5 ? 1 : (laby.l === 6 ? 2 : (laby.l === 7 ? 3 : 4)),
            meta: {
                l: laby.l, h: laby.h,
                grille: laby.grille.map(ligne => ligne.slice()),
                depart: laby.depart, sortie: laby.sortie,
                solution: laby.solution.map(c => [c[0], c[1]]),
                longueur: laby.longueur
            }
        });
    }
};
