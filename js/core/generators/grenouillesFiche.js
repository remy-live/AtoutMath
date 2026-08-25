// LES GRENOUILLES — la fiche à découper.
//
// Le générateur n'a presque rien à tirer au sort : un jeu à découper est
// TOUJOURS le même, et c'est bien ainsi — on ne fabrique pas une énigme
// différente à chaque élève, on fabrique un jeu. Ce qu'il porte, c'est la
// taille choisie et le nombre de coups qu'il faut, parce que c'est ce que le
// bloc imprimé et le corrigé doivent savoir.

import { makeItem } from '../items.js';
import { TAILLES_GRENOUILLES, minimumGrenouilles } from '../grenouilles.js';

export const grenouillesFicheGenerator = {
    id: 'defi.grenouilles-fiche',
    label: 'Les Grenouilles — jeu à découper',
    skills: ['defi.grenouilles'],
    answerKinds: ['grid'],
    params: [
        {
            id: 'taille', type: 'select', label: 'Grenouilles de chaque couleur', default: 'quatre',
            aide: 'Le minimum vaut n² + 2n, et il se démontre : n × n sauts — un par croisement — plus 2n glissades, une par grenouille.',
            options: Object.values(TAILLES_GRENOUILLES).map(t => ({ value: t.id, label: t.label }))
        }
    ],

    generate(params, ctx) {
        const p = params || {};
        const t = TAILLES_GRENOUILLES[p.taille] || TAILLES_GRENOUILLES.quatre;
        const mini = minimumGrenouilles(t.n);
        return makeItem({
            seed: ctx.rng.seed,
            generatorId: 'defi.grenouilles-fiche',
            skillId: 'defi.grenouilles',
            answerKind: 'grid',
            prompt: {
                text: `Les grenouilles, ${t.n} contre ${t.n} — ${mini} coups au minimum.`,
                papier: 'Les grenouilles — jeu à découper.',
                html: `<div class="game-question">Les grenouilles, ${t.n} contre ${t.n} — ${mini} coups au minimum.</div>`
            },
            answer: `${mini} coups`,
            explanation: `Le minimum est ${mini} coups, et il se démontre : chaque verte doit dépasser chaque `
                + `rouge, ce qui fait ${t.n} × ${t.n} = ${t.n * t.n} sauts, et chaque grenouille glisse `
                + `une fois, ce qui fait ${2 * t.n} glissades. Total : ${t.n}² + 2 × ${t.n} = ${mini}.`,
            difficulty: Math.min(3, Math.max(1, t.n - 2)),
            meta: { taille: t.id, n: t.n, mini }
        });
    }
};
