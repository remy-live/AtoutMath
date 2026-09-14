// RELIER SANS CROISER COMME ITEM — pour la feuille.
//
// C'est la forme d'origine : Rémy est parti d'une image de fiche. Un cadre, des
// carrés étiquetés, et rien d'autre — le tracé se fait au crayon, et l'on
// gomme. La page des solutions montre un tracé qui marche.
//
// « UN tracé qui marche », et non « LE » : ces figures ont presque toujours
// plusieurs solutions, qui ne se ressemblent même pas. La correction dit donc
// ce qu'elle est — une réponse possible — pour qu'un élève dont le tracé
// diffère ne croie pas s'être trompé.

import { makeItem } from '../items.js';
import { genererFigure, PALIERS, CONSIGNE, croisementsDroits } from '../sansCroiser.js';

export const sansCroiserFicheGenerator = {
    id: 'logique.sans-croiser',
    label: 'Relier sans croiser',
    skills: ['geo.espace.reperage'],
    answerKinds: ['figure'],
    params: [
        {
            id: 'palier', type: 'select', label: 'La difficulté', default: 'moyen',
            options: Object.entries(PALIERS).map(([value, p]) => ({ value, label: p.label }))
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const palier = PALIERS[(params || {}).palier] ? params.palier : 'moyen';
        // Une figure manquée ne doit pas rendre un item vide : on retombe sur
        // le palier de la fiche, qui aboutit toujours.
        const fig = genererFigure({ rng, palier }) || genererFigure({ rng, palier: 'moyen' });
        return makeItem({
            seed: rng.seed,
            generatorId: 'logique.sans-croiser',
            skillId: 'geo.espace.reperage',
            answerKind: 'figure',
            prompt: {
                text: `Relie les ${fig.lettres.length} paires sans croiser.`,
                html: `<div class="game-question">${fig.lettres.join(' · ')}</div>`
            },
            answer: fig.lettres.join(' '),
            explanation: CONSIGNE,
            // La difficulté suit le nombre de paires ET l'entrelacement : deux
            // paires bien enchevêtrées valent trois paires posées côte à côte.
            difficulty: Math.max(1, Math.min(4, fig.lettres.length - 1)),
            meta: {
                cadre: fig.cadre, cote: fig.cote,
                bornes: fig.bornes.map(b => ({ x: b.x, y: b.y, lettre: b.lettre, bout: b.bout })),
                lettres: fig.lettres,
                solution: fig.solution.map(t => ({ lettre: t.lettre, points: t.points.map(p => ({ x: p.x, y: p.y })) })),
                croisements: croisementsDroits(fig)
            }
        });
    }
};
