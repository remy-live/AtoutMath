// COMPTER SUR UN SOLIDE — la fiche.
//
// L'écran fait compter en TOUCHANT ; le papier fait compter avec un crayon, et
// c'est un autre exercice. On imprime donc plusieurs solides et, sous chacun,
// un tableau à trois cases : sommets, arêtes, faces. L'élève écrit trois
// nombres et peut se relire — c'est exactement ce qui manque à l'écran, où le
// compte s'efface avec la marque.
//
// La perspective est celle du cours (core/solides.js) : fuyantes à 45°,
// réduites de moitié, arêtes cachées en pointillés. Ce sont les pointillés qui
// font l'exercice : sans eux on compte ce qu'on voit, et l'on se trompe.

import { makeItem } from '../items.js';
import { construire, famillesDe, compter, euler, expliquer, ASPECTS } from '../solides.js';

export const solidesGenerator = {
    id: 'geo.solides',
    label: 'Compter sur un solide',
    skills: ['geo.espace.denombrer'],
    answerKinds: ['grid'],
    params: [
        {
            id: 'niveau', type: 'select', label: 'Les solides', default: 'tous',
            options: [
                { value: 'facile', label: 'Les solides usuels' },
                { value: 'moyen', label: 'Jusqu\'aux bases pentagonales' },
                { value: 'tous', label: 'Tous, octaèdre compris' }
            ]
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const choix = famillesDe((params || {}).niveau || 'tous');
        const solide = construire(rng.pick(choix));
        const e = euler(solide);
        return makeItem({
            seed: rng.seed,
            generatorId: 'geo.solides',
            skillId: 'geo.espace.denombrer',
            answerKind: 'grid',
            prompt: {
                text: `Compte les sommets, les arêtes et les faces de ${solide.nom}.`,
                papier: `${solide.nom.charAt(0).toUpperCase()}${solide.nom.slice(1)}`,
                html: `<div class="game-question">${solide.nom}</div>`
            },
            answer: `${e.S}-${e.A}-${e.F}`,
            explanation: ASPECTS.map(a => expliquer(solide, a.id)).join(' '),
            difficulty: solide.famille === 'autre' ? 3 : (solide.n <= 4 ? 1 : 2),
            meta: {
                id: solide.id, nom: solide.nom, famille: solide.famille, n: solide.n,
                sommets: solide.sommets, faces: solide.faces, aretes: solide.aretes,
                compte: { S: e.S, A: e.A, F: e.F }
            }
        });
    }
};
