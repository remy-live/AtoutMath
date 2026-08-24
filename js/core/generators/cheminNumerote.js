// LE CHEMIN NUMÉROTÉ COMME ITEM — pour la feuille.
//
// Comme « relier les points » : c'est un puzzle de papier autant qu'un jeu
// d'écran, et le générateur sert à l'impression. Rémy est d'ailleurs parti
// d'un LIVRE — la couverture qu'il a envoyée est un recueil de labyrinthes de
// nombres. Une grille par bloc, six par page, et la page des solutions montre
// le chemin.
//
// La grille entière voyage dans `meta` : ses repères et sa solution. Le rendu
// n'a rien à recalculer, et la feuille montre exactement l'écran.

import { makeItem } from '../items.js';
import { genererParcours, TAILLES, CONSIGNE } from '../cheminNumerote.js';

export const cheminNumeroteGenerator = {
    id: 'logique.chemin',
    label: 'Le chemin numéroté',
    skills: ['geo.espace.reperage'],
    answerKinds: ['grid'],
    params: [
        {
            id: 'taille', type: 'select', label: 'La grille', default: 'moyen',
            options: [
                { value: 'petit', label: '4 × 4 — pour découvrir' },
                { value: 'moyen', label: '5 × 5 — la taille habituelle' },
                { value: 'grand', label: '6 × 6 — il faut prévoir' },
                { value: 'geant', label: '7 × 7 — pour ceux qui aiment ça' }
            ]
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const t = TAILLES[(params || {}).taille] || TAILLES.moyen;
        // Une grille manquée ne doit pas rendre un item vide : on retombe sur
        // la plus petite taille, qui aboutit toujours.
        const g = genererParcours({ ...t, rng }) || genererParcours({ ...TAILLES.petit, rng });
        return makeItem({
            seed: rng.seed,
            generatorId: 'logique.chemin',
            skillId: 'geo.espace.reperage',
            answerKind: 'grid',
            prompt: {
                text: `Trace le chemin sur la grille ${g.l} × ${g.h}, du 1 jusqu'au ${g.reperes.length}.`,
                html: `<div class="game-question">Le chemin numéroté — ${g.l} × ${g.h}</div>`
            },
            answer: g.solution.map(c => c.join('')).join('-'),
            explanation: CONSIGNE,
            difficulty: g.l <= 4 ? 1 : (g.l === 5 ? 2 : (g.l === 6 ? 3 : 4)),
            meta: {
                l: g.l, h: g.h,
                reperes: g.reperes.map(r => ({ n: r.n, x: r.x, y: r.y })),
                solution: g.solution.map(c => [c[0], c[1]])
            }
        });
    }
};
