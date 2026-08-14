// LA PIZZERIA DES FRACTIONS — sur le papier.
//
// La pizza est déjà partagée en parts égales : c'est le PPCM des
// dénominateurs, et c'est tout le travail du chapitre. L'élève reçoit la
// commande — « la moitié aux champignons, le tiers aux olives » — et colorie
// les parts qui reviennent à chaque garniture.
//
// SUR LE PAPIER, LA FRACTION SE CONVERTIT AVANT DE SE COLORIER. « La moitié
// d'une pizza en 6 parts, c'est 3 parts » : ce passage est invisible à l'écran,
// où l'on tape sur des secteurs jusqu'à ce que le compte tombe juste. Ici il
// faut l'écrire, et la fiche laisse la place pour le faire.

import { makeItem } from '../items.js';
import { tirerCommande, INGREDIENTS, direFraction } from '../pizza.js';

const NIVEAUX = {
    facile: { nbFractions: 2, denominateurs: [2, 3, 4] },
    moyen: { nbFractions: 2, denominateurs: [2, 3, 4, 6] },
    difficile: { nbFractions: 3, denominateurs: [2, 3, 4, 6, 8] }
};

const nomDe = (id) => (INGREDIENTS.find(i => i.id === id) || {}).nom || id;

export const pizzaFicheGenerator = {
    id: 'frac.pizza-fiche',
    label: 'Fractions d\'une pizza à colorier',
    skills: ['num.frac.parts'],
    answerKinds: ['grid'],
    params: [
        {
            id: 'niveau', type: 'select', label: 'Difficulté', default: 'moyen',
            options: [
                { value: 'facile', label: '2 fractions · moitiés, tiers, quarts' },
                { value: 'moyen', label: '2 fractions · jusqu\'aux sixièmes' },
                { value: 'difficile', label: '3 fractions · jusqu\'aux huitièmes' }
            ]
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const n = NIVEAUX[(params || {}).niveau] || NIVEAUX.moyen;
        const c = tirerCommande({ rng, ...n });
        // Un filet : sans commande tirable, la fiche ne doit pas rester vide.
        const commande = c || tirerCommande({ rng, nbFractions: 2, denominateurs: [2, 4] });

        const liste = commande.fractions
            .map(f => `${direFraction(f.num, f.den)} de ${nomDe(f.ingredient)}`).join(', ');
        return makeItem({
            seed: rng.seed,
            generatorId: 'frac.pizza-fiche',
            skillId: 'num.frac.parts',
            answerKind: 'grid',
            prompt: {
                text: `Colorie : ${liste}.`,
                papier: `Colorie : ${liste}.`,
                html: `<div class="game-question">Pizza en ${commande.parts} parts</div>`
            },
            answer: commande.fractions
                .map(f => `${f.ingredient}:${commande.cible[f.ingredient]}`).join('|'),
            explanation: commande.fractions.map(f =>
                `${f.num}/${f.den} de ${commande.parts} parts = ${commande.cible[f.ingredient]} parts `
                + `de ${nomDe(f.ingredient)}`).join(' ; ') + '.',
            difficulty: commande.fractions.length > 2 ? 3 : (commande.parts > 6 ? 2 : 1),
            meta: {
                parts: commande.parts,
                cible: commande.cible,
                fractions: commande.fractions.map(f => ({
                    num: f.num, den: f.den, ingredient: f.ingredient, nom: nomDe(f.ingredient)
                }))
            }
        });
    }
};
