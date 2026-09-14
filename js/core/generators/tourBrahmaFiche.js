// LA TOUR DE BRAHMA — la fiche à découper.
//
// Le générateur n'a presque rien à tirer au sort : un jeu à découper est
// TOUJOURS le même, et c'est bien ainsi — on ne fabrique pas une énigme
// différente à chaque élève, on fabrique un jeu. Ce qu'il porte, c'est la
// taille choisie et le nombre de coups qu'il faut, parce que c'est ce que le
// bloc imprimé et le corrigé doivent savoir.

import { makeItem } from '../items.js';
import { TAILLES_BRAHMA, minimumBrahma } from '../tourBrahma.js';

export const tourBrahmaFicheGenerator = {
    id: 'defi.tour-brahma-fiche',
    label: 'La Tour de Brahma — jeu à découper',
    skills: ['defi.recursion'],
    answerKinds: ['grid'],
    params: [
        {
            id: 'taille', type: 'select', label: 'Nombre de boules', default: 'quatre',
            aide: 'Chaque boule ajoutée DOUBLE le travail, plus un coup : 7, 15, 31, 63. Trois boules se font de tête ; six demandent une méthode.',
            options: Object.values(TAILLES_BRAHMA).map(t => ({ value: t.id, label: t.label }))
        }
    ],

    generate(params, ctx) {
        const p = params || {};
        const t = TAILLES_BRAHMA[p.taille] || TAILLES_BRAHMA.quatre;
        const mini = minimumBrahma(t.n);
        return makeItem({
            seed: ctx.rng.seed,
            generatorId: 'defi.tour-brahma-fiche',
            skillId: 'defi.recursion',
            answerKind: 'grid',
            prompt: {
                text: `Tour de Brahma à ${t.n} boules — ${mini} coups au minimum.`,
                papier: 'Tour de Brahma — jeu à découper.',
                html: `<div class="game-question">Tour de Brahma à ${t.n} boules — ${mini} coups au minimum.</div>`
            },
            answer: `${mini} coups`,
            explanation: `Le minimum est ${mini} coups pour ${t.n} boules : chaque boule ajoutée double le `
                + `travail et ajoute un coup, donc 2^${t.n} − 1. Pour déplacer ${t.n} boules, il faut `
                + `d'abord déplacer les ${t.n - 1} du dessus ailleurs, poser la plus grosse, puis `
                + `ramener les ${t.n - 1}.`,
            difficulty: Math.min(3, Math.max(1, t.n - 2)),
            meta: { taille: t.id, n: t.n, mini }
        });
    }
};
