// LE CARRÉ MAGIQUE COMME ITEM — pour la feuille.
//
// C'est un exercice de papier par excellence : une grille, un crayon, et
// trente soustractions à trous qui se donnent la main. Le générateur porte le
// puzzle entier dans `meta` ; la fiche le dessine, la correction pose le
// carré plein.

import { makeItem } from '../items.js';
import { genererCarreMagique } from '../carreMagique.js';

export const carreMagiqueGenerator = {
    id: 'logique.carre-magique',
    label: 'Carré magique',
    skills: ['num.logique.carre-magique'],
    answerKinds: ['grid'],
    params: [
        {
            id: 'taille', type: 'select', label: 'Taille', default: 3,
            options: [
                { value: 3, label: '3 × 3' },
                { value: 4, label: '4 × 4' }
            ]
        },
        {
            id: 'difficulte', type: 'select', label: 'Difficulté', default: 'normal',
            options: [
                { value: 'normal', label: 'Normale — petits nombres' },
                { value: 'difficile', label: 'Difficile — plus de trous, plus grands nombres' }
            ]
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = genererCarreMagique(params || {}, rng);
        return makeItem({
            seed: rng.seed,
            generatorId: 'logique.carre-magique',
            skillId: 'num.logique.carre-magique',
            answerKind: 'grid',
            prompt: {
                text: `Carré magique — toutes les lignes, colonnes et diagonales font ${p.somme}.`,
                html: `<div class="game-question">Complète le carré magique (somme : ${p.somme})</div>`
            },
            answer: p.cases,
            explanation: Array.from({ length: p.n }, (_, r) =>
                p.cases.slice(r * p.n, (r + 1) * p.n).join(' · ')).join(' ; '),
            difficulty: p.n === 4 ? 3 : 2,
            meta: p
        });
    }
};
