// Générateur « Angle Master » : mesurer et construire des angles.
//
// Porté depuis un projet antérieur du même nom. Le générateur ne produit que
// la DONNÉE de la question — l'angle cible, son orientation, la tolérance —
// et laisse le rapporteur interactif à l'activité `angles`. Deux questions
// symétriques sur le même outil : LIRE un angle tracé avec le rapporteur, et
// CONSTRUIRE un angle demandé en manœuvrant le côté mobile.
//
// La réponse est un nombre de degrés (`answerKind: 'angle'`), avec une
// tolérance : mesurer 62° pour un angle de 61° est une lecture juste, pas une
// faute. C'est l'ACTIVITÉ qui applique la tolérance avant de soumettre — le
// verdict de la session reste une comparaison exacte.

import { makeItem } from '../items.js';

export const anglesGenerator = {
    id: 'geo.angles',
    label: 'Angles au rapporteur',
    skills: ['geo.angles.mesure', 'geo.angles.construire'],
    answerKinds: ['angle'],
    params: [
        {
            id: 'mode', type: 'select', label: 'Question',
            options: [
                { value: 'mesurer', label: 'Mesurer un angle' },
                { value: 'construire', label: 'Construire un angle' },
                { value: 'mixte', label: 'Les deux en alternance' }
            ],
            default: 'mesurer'
        },
        {
            id: 'plage', type: 'select', label: 'Angles proposés',
            options: [
                { value: 'tous', label: 'Aigus et obtus' },
                { value: 'aigus', label: 'Aigus seulement' },
                { value: 'obtus', label: 'Obtus seulement' }
            ],
            default: 'tous'
        },
        // `papier: false` : l'écart toléré entre l'angle lu et l'angle vrai
        // n'a de sens que si quelqu'un compare — c'est-à-dire à l'écran. Sur
        // une feuille, c'est le professeur qui corrige, avec son propre œil.
        { id: 'tolerance', type: 'number', label: 'Tolérance (°)', default: 3, min: 0, max: 10, papier: false }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const mode = params.mode === 'mixte'
            ? (rng.bool() ? 'mesurer' : 'construire')
            : (params.mode || 'mesurer');

        // Angle cible : jamais trop proche de 0°, 90° ou 180° — un angle
        // quasi plat ou quasi droit s'estime sans mesurer, et un 89° rend
        // l'estimation aigu/obtus injuste.
        let target;
        const plage = params.plage || 'tous';
        do {
            if (plage === 'aigus') target = rng.int(15, 80);
            else if (plage === 'obtus') target = rng.int(100, 165);
            else target = rng.int(15, 165);
        } while (Math.abs(target - 90) < 8);

        const aigu = target < 90;
        const tolerance = params.tolerance !== undefined ? params.tolerance : 3;
        // Orientation du côté fixe : la question ne se présente jamais deux
        // fois pareil, et l'élève apprend à tourner son rapporteur.
        const baseDeg = rng.int(0, 359);

        const nature = aigu ? 'aigu (moins de 90°)' : 'obtus (plus de 90°)';
        const hints = mode === 'mesurer'
            ? [
                'Place le centre du rapporteur (la croix rouge) exactement sur le sommet de l\'angle.',
                'Fais tourner le rapporteur pour aligner son zéro avec un des deux côtés de l\'angle.',
                `L'angle est ${nature} : entre les deux graduations croisées, choisis celle qui correspond.`
            ]
            : [
                'Place le centre du rapporteur sur le sommet, et son zéro sur le côté noir.',
                `Repère la graduation ${target} en partant du zéro qui est sur le côté noir.`,
                `Amène le côté rouge exactement sur la graduation ${target}.`
            ];

        const explanation = mode === 'mesurer'
            ? `L'angle mesure ${target}°. Centre du rapporteur sur le sommet, zéro sur un côté : `
            + `l'autre côté croise la graduation ${target} (l'angle est ${nature}, on ne lit pas ${180 - target}).`
            : `Pour construire ${target}° : centre sur le sommet, zéro sur le côté noir, `
            + `et le côté rouge s'arrête sur la graduation ${target}.`;

        return makeItem({
            seed: rng.seed,
            generatorId: 'geo.angles',
            skillId: mode === 'mesurer' ? 'geo.angles.mesure' : 'geo.angles.construire',
            answerKind: 'angle',
            prompt: {
                text: mode === 'mesurer'
                    ? 'Mesure l\'angle avec le rapporteur.'
                    : `Construis un angle de ${target}°.`,
                html: `<div class="game-question">${mode === 'mesurer'
                    ? 'Mesure l\'angle avec le rapporteur'
                    : `Construis un angle de <b>${target}°</b>`}</div>`
            },
            answer: String(target),
            hints,
            explanation,
            difficulty: aigu ? 2 : 3,
            meta: { mode, target, baseDeg, tolerance, aigu }
        });
    }
};
