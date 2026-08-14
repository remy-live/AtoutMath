// LA VIRGULE QUI SE DÉCALE — sur le papier.
//
// À l'écran, l'exercice se joue en trois temps : on fait GLISSER la virgule
// dans un tableau de numération, puis on choisit parmi quatre, puis on écrit.
// Le premier temps est une manipulation — il n'a pas d'équivalent papier, et
// il n'a pas à en avoir un : c'est justement ce que l'écran apporte.
//
// Reste ce qui s'écrit, et qui s'écrit très bien : « 4,52 × 10 = …… ». Une
// colonne de ces égalités est l'entraînement classique du chapitre, et le
// piège reste le même sur les deux supports — LE NOMBRE DE DÉPART A TOUJOURS
// UNE PARTIE DÉCIMALE. Avec un entier, la règle fausse « ×10, on ajoute un
// zéro » tomberait juste et sortirait renforcée de l'exercice.

import { makeItem } from '../items.js';
import { tirerQuestion, expliquer } from '../virgule.js';

export const virguleFicheGenerator = {
    id: 'num.virgule-fiche',
    label: 'Multiplier et diviser par 10, 100, 1000',
    skills: ['num.dec.puissances10'],
    answerKinds: ['numeric'],
    ecrit: true,
    params: [
        {
            id: 'niveau', type: 'select', label: 'Difficulté', default: 'facile',
            options: [
                { value: 'facile', label: '× 10 et × 100 seulement' },
                { value: 'moyen', label: '× et ÷ par 10, 100, 1000' },
                { value: 'difficile', label: 'Idem, jusqu\'aux millièmes' }
            ]
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const q = tirerQuestion((params || {}).niveau || 'facile', rng);
        const enonce = `${q.depart} ${q.op} ${q.facteur}`;
        return makeItem({
            seed: rng.seed,
            generatorId: 'num.virgule-fiche',
            skillId: 'num.dec.puissances10',
            answerKind: 'numeric',
            prompt: {
                text: `${enonce} = ?`,
                // Sur le papier, l'égalité s'écrit en entier : c'est la ligne
                // que l'élève complète, et celle qu'il relira.
                papier: `${enonce} =`,
                html: `<div class="game-question">${enonce} = ?</div>`
            },
            answer: q.resultat,
            explanation: expliquer(q).join(' '),
            difficulty: q.facteur === 1000 ? 3 : (q.op === '÷' ? 2 : 1),
            meta: { depart: q.depart, op: q.op, facteur: q.facteur, rangs: q.rangs }
        });
    }
};
