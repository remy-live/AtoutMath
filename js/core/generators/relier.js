// RELIER LES POINTS COMME ITEM — pour la feuille.
//
// Comme le slitherlink ou le futoshiki : c'est un puzzle de papier autant
// qu'un jeu d'écran, et le générateur sert à l'impression. La grille entière
// voyage dans `meta` — les bornes, leur marque, et la solution.
//
// La MARQUE d'une paire est double, et ce n'est pas une commodité : sur un
// polycopié photocopié, ou pour un élève qui distingue mal le rouge du vert,
// la couleur ne dit plus rien. Le symbole, lui, survit à tout — et c'est lui
// qui rend la feuille utilisable telle quelle en noir et blanc.

import { makeItem } from '../items.js';
import { genererGrille, CONSIGNE } from '../relier.js';

const TAILLES = {
    petit: { l: 5, h: 5, paires: 3 },
    moyen: { l: 6, h: 6, paires: 4 },
    grand: { l: 7, h: 7, paires: 5 },
    geant: { l: 8, h: 8, paires: 6 }
};

export const relierGenerator = {
    id: 'logique.relier',
    label: 'Relier les points',
    skills: ['geo.espace.reperage'],
    answerKinds: ['grid'],
    params: [
        {
            id: 'taille', type: 'select', label: 'Taille', default: 'moyen',
            options: [
                { value: 'petit', label: '5 × 5 — trois paires' },
                { value: 'moyen', label: '6 × 6 — quatre paires' },
                { value: 'grand', label: '7 × 7 — cinq paires' },
                { value: 'geant', label: '8 × 8 — six paires' }
            ]
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const t = TAILLES[(params || {}).taille] || TAILLES.moyen;
        // Une grille manquée ne doit pas rendre un item vide : on retente, et
        // l'on retombe sur la plus petite taille, qui aboutit toujours.
        const g = genererGrille({ ...t, rng })
            || genererGrille({ ...TAILLES.petit, rng });
        return makeItem({
            seed: rng.seed,
            generatorId: 'logique.relier',
            skillId: 'geo.espace.reperage',
            answerKind: 'grid',
            prompt: {
                text: `Relie les ${g.paires.length} paires sur la grille ${g.l} × ${g.h}, `
                    + 'sans croiser et sans laisser de case vide.',
                html: `<div class="game-question">Relier les points — ${g.l} × ${g.h}</div>`
            },
            answer: g.paires.map(p => p.solution.length).join('-'),
            explanation: CONSIGNE,
            difficulty: g.paires.length <= 3 ? 1 : (g.paires.length <= 4 ? 2 : 3),
            meta: {
                l: g.l, h: g.h,
                paires: g.paires.map(p => ({
                    id: p.id, a: p.a, b: p.b,
                    couleur: p.couleur, symbole: p.symbole, solution: p.solution
                }))
            }
        });
    }
};
