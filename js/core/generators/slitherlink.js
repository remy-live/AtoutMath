// LE SLITHERLINK COMME ITEM — pour la feuille.
//
// Comme le futoshiki ou le carré magique : c'est un puzzle de papier, et le
// générateur ne sert qu'à l'impression. La grille entière voyage dans `meta`
// — chiffres, dedans, et les segments de la solution.

import { makeItem } from '../items.js';
import { genererSlitherlink } from '../slitherlink.js';

export const slitherlinkGenerator = {
    id: 'logique.slitherlink',
    label: 'Slitherlink',
    skills: ['num.logique.slitherlink'],
    answerKinds: ['grid'],
    params: [
        {
            id: 'taille', type: 'select', label: 'Taille', default: 'moyen',
            options: [
                { value: 'petit', label: '5 × 5' },
                { value: 'moyen', label: '7 × 7' },
                { value: 'grand', label: '10 × 8' }
            ]
        },
        {
            id: 'difficulte', type: 'select', label: 'Difficulté', default: 'moyen',
            options: [
                { value: 'facile', label: 'Facile (beaucoup de chiffres)' },
                { value: 'moyen', label: 'Moyen' },
                { value: 'difficile', label: 'Difficile (peu de chiffres)' }
            ]
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = genererSlitherlink(params || {}, rng);
        return makeItem({
            seed: rng.seed,
            generatorId: 'logique.slitherlink',
            skillId: 'num.logique.slitherlink',
            answerKind: 'grid',
            prompt: {
                text: `Slitherlink ${p.cols} × ${p.lignes} : trace une seule boucle fermée.`,
                html: `<div class="game-question">Slitherlink ${p.cols} × ${p.lignes}</div>`
            },
            answer: Array.from(p.interieur).join(''),
            explanation: `Boucle unique autour de ${Array.from(p.interieur)
                .filter(Boolean).length} cases.`,
            difficulty: p.difficulte === 'facile' ? 1 : p.difficulte === 'moyen' ? 2 : 3,
            meta: {
                cols: p.cols, lignes: p.lignes,
                indices: Array.from(p.indices),
                interieur: Array.from(p.interieur),
                solution: { h: Array.from(p.solution.h), v: Array.from(p.solution.v) },
                taille: p.taille, difficulte: p.difficulte, donnes: p.donnes
            }
        });
    }
};
