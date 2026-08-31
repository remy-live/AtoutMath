// UN REPÈRE, PLUSIEURS POINTS — la fiche.
//
// À l'écran, un exercice de repérage pose UN point à la fois : c'est ce qu'il
// faut pour corriger tout de suite. Sur le papier, un repère qui ne porte
// qu'un point gâche une demi-page — et l'élève passe son temps à retracer des
// axes au lieu de placer des points.
//
// La fiche donne donc un repère et SIX points, dans les deux sens :
//
//   PLACER — les coordonnées sont écrites sous le repère, le quadrillage est
//     vide, l'élève trace les croix.
//   LIRE   — les croix sont tracées et nommées, l'élève écrit les couples.
//
// LES POINTS SE MARQUENT D'UNE CROIX, pas d'un rond. Un rond a un intérieur :
// on ne sait plus si le point est son centre ou son bord, et à l'intersection
// de deux graduations la différence se voit. La croix, elle, désigne
// exactement son centre — c'est la convention du cahier, et celle du tableau.

import { makeItem } from '../items.js';

const ETIQUETTES = 'ABCDEFGHJKLMNP';

export const repereFicheGenerator = {
    id: 'geo.repere-fiche',
    label: 'Repère : plusieurs points',
    // Le référentiel nomme `geo.repere.coord` et `geo.repere.relatifs`, et la
    // fiche sert les deux selon son réglage.
    skills: ['geo.repere.*'],
    answerKinds: ['grid'],
    params: [
        {
            id: 'mode', type: 'select', label: 'Ce qu\'on demande', default: 'lire',
            options: [
                { value: 'lire', label: 'Lire les coordonnées des points tracés' },
                { value: 'placer', label: 'Placer les points donnés' }
            ]
        },
        {
            id: 'relatifs', type: 'select', label: 'Le repère', default: 'positives',
            options: [
                { value: 'positives', label: 'Un seul quadrant (positifs)' },
                { value: 'relatives', label: 'Quatre quadrants (relatifs)' }
            ]
        },
        { id: 'points', type: 'number', label: 'Points par repère', default: 6, min: 3, max: 10 },
        { id: 'max', type: 'number', label: 'Graduation maximale', default: 5, min: 3, max: 10 }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const relatifs = p.relatifs === 'relatives';
        const max = Math.max(3, Math.min(10, Number(p.max) || 5));
        const combien = Math.max(3, Math.min(10, Number(p.points) || 6));
        const mode = p.mode === 'placer' ? 'placer' : 'lire';

        const mini = relatifs ? -max : 0;
        const vus = new Set();
        const points = [];
        for (let essai = 0; points.length < combien && essai < 200; essai++) {
            const x = rng.int(mini, max);
            const y = rng.int(mini, max);
            // L'ORIGINE ET LES AXES SONT ÉCARTÉS. Un point sur un axe a une
            // coordonnée nulle : c'est un cas particulier qui se travaille à
            // part, pas au milieu de six lectures ordinaires.
            if (x === 0 || y === 0) continue;
            const clef = `${x},${y}`;
            if (vus.has(clef)) continue;
            vus.add(clef);
            points.push({ label: ETIQUETTES[points.length], x, y });
        }

        const liste = points.map(pt => `${pt.label} (${pt.x} ; ${pt.y})`).join(', ');
        return makeItem({
            seed: rng.seed,
            generatorId: 'geo.repere-fiche',
            skillId: 'geo.repere.coord',
            answerKind: 'grid',
            prompt: {
                text: mode === 'placer'
                    ? `Place les points : ${liste}.`
                    : 'Lis les coordonnées des points tracés.',
                html: `<div class="game-question">Repère — ${points.length} points</div>`
            },
            answer: points.map(pt => `${pt.x};${pt.y}`).join('|'),
            explanation: mode === 'placer'
                ? 'On lit d\'abord l\'abscisse sur l\'axe horizontal, puis on monte (ou on '
                    + 'descend) jusqu\'à l\'ordonnée. Le premier nombre dit toujours de combien '
                    + 'on avance À DROITE, le second de combien on monte.'
                : `Coordonnées : ${liste}.`,
            difficulty: relatifs ? 2 : 1,
            meta: { mode, relatifs, max, points }
        });
    }
};
