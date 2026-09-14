// LE FUTOSHIKI COMME ITEM — pour la feuille.
//
// Comme le logigramme ou le carré magique : c'est un puzzle de papier, le
// générateur ne sert qu'à l'impression. Le puzzle entier voyage dans `meta`.

import { makeItem } from '../items.js';
import { genererFutoshiki } from '../futoshiki.js';

export const futoshikiGenerator = {
    id: 'logique.futoshiki',
    label: 'Futoshiki',
    skills: ['num.logique.futoshiki'],
    answerKinds: ['grid'],
    params: [
        {
            id: 'taille', type: 'select', label: 'Taille', default: 4,
            options: [
                { value: 4, label: '4 \u00d7 4' },
                { value: 5, label: '5 \u00d7 5' }
            ]
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = genererFutoshiki(params || {}, rng);
        return makeItem({
            seed: rng.seed,
            generatorId: 'logique.futoshiki',
            skillId: 'num.logique.futoshiki',
            answerKind: 'grid',
            prompt: {
                text: `Futoshiki ${p.n} \u00d7 ${p.n} : chaque chiffre une fois par ligne et colonne, en respectant les signes.`,
                html: `<div class="game-question">Futoshiki ${p.n} \u00d7 ${p.n}</div>`
            },
            answer: p.solution,
            explanation: Array.from({ length: p.n }, (_, r) =>
                p.solution.slice(r * p.n, (r + 1) * p.n).join(' \u00b7 ')).join(' ; '),
            difficulty: p.n - 2,
            meta: p
        });
    }
};
