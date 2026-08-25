// LE HASHI — sur le papier.
//
// C'est un puzzle de journal : des îles, des chiffres, et de la place pour
// tirer des traits à la règle. Il n'a besoin de rien d'autre qu'une feuille, et
// c'est pour cela qu'il vient bien en fin d'heure ou en autonomie.
//
// LA FEUILLE NE DONNE AUCUNE AIDE, et n'en a pas besoin : la grille est
// fabriquée pour se déduire (voir core/hashi.js). Le corrigé, lui, trace la
// solution entière — c'est la seule chose que le professeur ait à regarder.

import { makeItem } from '../items.js';
import { creerHashi, qualiteHashi, TAILLES_HASHI } from '../hashi.js';

export const hashiFicheGenerator = {
    id: 'logique.hashi-fiche',
    label: 'Hashi — les ponts',
    skills: ['num.logique.hashi'],
    answerKinds: ['grid'],
    params: [
        {
            id: 'taille', type: 'select', label: 'Taille de la grille', default: 'moyen',
            aide: 'Une petite grille se fait en cinq minutes, une grande occupe un quart '
                + 'd\'heure. C\'est le nombre d\'îles qui compte, pas le nombre de cases.',
            options: [
                { value: 'petit', label: '7 × 7 — 9 îles' },
                { value: 'moyen', label: '9 × 9 — 14 îles' },
                { value: 'grand', label: '12 × 12 — 18 îles' }
            ]
        },
        {
            id: 'difficulte', type: 'select', label: 'Difficulté', default: 'moyen',
            aide: 'La difficulté est une DENSITÉ de ponts. Plus il y en a, plus il y a de '
                + 'contraintes, et plus la grille se déduit vite : une île qui demande six '
                + 'ponts sur trois arêtes ne laisse aucun choix. En difficile, la grille est '
                + 'clairsemée et il faut se servir de la règle « tout d\'un seul tenant » — '
                + 'celle que personne n\'utilise avant d\'y être forcé.',
            options: [
                { value: 'facile', label: 'Facile — beaucoup de ponts' },
                { value: 'moyen', label: 'Moyen' },
                { value: 'difficile', label: 'Difficile — il faut raisonner sur l\'ensemble' }
            ]
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const taille = TAILLES_HASHI[p.taille] ? p.taille : 'moyen';
        const difficulte = ['facile', 'moyen', 'difficile'].includes(p.difficulte)
            ? p.difficulte : 'moyen';
        const g = creerHashi({ taille, difficulte, rng });
        const q = qualiteHashi(g);

        return makeItem({
            seed: rng.seed,
            generatorId: 'logique.hashi-fiche',
            skillId: 'num.logique.hashi',
            answerKind: 'grid',
            prompt: {
                text: `Hashi ${g.largeur} × ${g.hauteur} — ${q.iles} îles.`,
                papier: `Hashi — ${q.iles} îles.`,
                html: `<div class="game-question">Hashi — ${g.largeur} × ${g.hauteur}</div>`
            },
            answer: `${q.ponts} ponts`,
            explanation: `${q.ponts} ponts en tout, dont ${q.doubles} doubles.`,
            difficulty: { facile: 1, moyen: 2, difficile: 3 }[difficulte],
            meta: {
                largeur: g.largeur, hauteur: g.hauteur,
                iles: g.iles, aretes: g.aretes, solution: g.solution,
                taille, difficulte, deductible: g.deductible
            }
        });
    }
};
