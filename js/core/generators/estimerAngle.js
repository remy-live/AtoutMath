// « À VUE D'ŒIL » — deviner la mesure d'un angle, sans rapporteur.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 5 novembre : « j'aimerai bien un exercice où l'élève doit deviner la
// mesure d'un angle et plus il est proche, plus il a de points […] Il faut que
// ce soit joli et fun ».
//
// ── POURQUOI CET EXERCICE MANQUE AU CATALOGUE ──────────────────────────────
//
// On y MESURE les angles au rapporteur (`geo-angles`), on les NOMME
// (`geo-angles-nommer`), on en CALCULE de manquants (`geo-angles-manquants`).
// On ne les ESTIME jamais. Or c'est l'estimation qui rend les trois autres
// sûrs : un élève qui sait qu'un angle « fait dans les 60° » voit tout de
// suite qu'une lecture à 120° est fausse — il a lu la mauvaise graduation du
// rapporteur. Sans repères, il recopie ce qu'il lit et ne peut rien vérifier.
//
// ── CE QUE LE GÉNÉRATEUR DÉCIDE, ET CE QU'IL NE DÉCIDE PAS ─────────────────
//
// Il donne l'angle et sa direction de départ ; il ne dit rien du BARÈME. Les
// points se comptent dans l'activité, parce qu'ils dépendent de l'écart —
// c'est-à-dire de la réponse, que le générateur ne connaît pas. La tolérance,
// elle, est ici : c'est une donnée de la question, et c'est elle qui décide si
// la COMPÉTENCE est acquise. Les deux sont séparées exprès :
//
//   · LES POINTS sont continus, et c'est ce qui rend le jeu motivant ;
//   · LA COMPÉTENCE est franche, à ±5° par défaut, comme tout le reste du
//     logiciel. Un barème continu n'est pas une maîtrise, et un bilan de
//     professeur rempli de demi-réussites ne se lit pas.
//
// ── LE PREMIER CÔTÉ N'EST PAS TOUJOURS HORIZONTAL ──────────────────────────
//
// RÉMY : « le premier trait peut ne pas être horizontal (ca peut être un
// réglage) ». Et il a raison sur le fond : UN ANGLE DONT UN CÔTÉ EST HORIZONTAL
// SE LIT SUR LES REPÈRES DU MONDE — on le compare au bord de la table, au bas
// de l'écran. Dès que les deux côtés sont obliques, il n'y a plus de repère
// extérieur, et c'est l'angle LUI-MÊME qu'on estime. Ce sont deux exercices
// différents, et le second est le vrai ; d'où un réglage, et non un niveau.

import { makeItem } from '../items.js';

/**
 * LES ANGLES REMARQUABLES, ceux sur lesquels on se construit des repères.
 *
 * Le premier niveau ne tire que dans ce sac, à quelques degrés près : on
 * n'apprend pas à estimer en tombant sur 83° ou 117°, on l'apprend en
 * reconnaissant « c'est un peu plus qu'un droit » puis en l'affinant.
 */
export const REPERES = [30, 45, 60, 90, 120, 135, 150];

export const estimerAngleGenerator = {
    id: 'geo.estimerAngle',
    label: 'Estimer un angle à vue d\'œil',
    skills: ['geo.angles.estimer'],
    answerKinds: ['angle'],
    params: [
        {
            id: 'niveau', type: 'select', label: 'Angles proposés',
            options: [
                { value: '1', label: 'Niveau 1 — autour des repères (30, 45, 60, 90…)' },
                { value: '2', label: 'Niveau 2 — n\'importe quel angle saillant' },
                { value: '3', label: 'Niveau 3 — jusqu\'aux angles rentrants' }
            ],
            default: '1'
        },
        {
            // LE RÉGLAGE DE RÉMY. Par défaut le premier côté est horizontal au
            // niveau 1 — on se donne d'abord des repères — et libre ensuite ;
            // « toujours » et « jamais » forcent la main au professeur qui
            // sait ce qu'il veut faire travailler.
            id: 'premierCote', type: 'select', label: 'Premier côté',
            options: [
                { value: 'auto', label: 'Horizontal au niveau 1, libre ensuite' },
                { value: 'horizontal', label: 'Toujours horizontal' },
                { value: 'libre', label: 'Toujours incliné au hasard' }
            ],
            default: 'auto'
        },
        // `papier: false` : l'écart toléré n'a de sens que si quelqu'un
        // compare, c'est-à-dire à l'écran. Sur une feuille, c'est le
        // professeur qui corrige, avec son propre œil.
        {
            id: 'tolerance', type: 'number', label: 'Réussite à ± (°)',
            default: 5, min: 2, max: 15, papier: false
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const niveau = String(params.niveau || '1');
        const tolerance = params.tolerance !== undefined ? Number(params.tolerance) : 5;

        let angle;
        if (niveau === '1') {
            // AUTOUR D'UN REPÈRE, à huit degrés près au plus : assez pour que
            // la réponse ne soit pas « 45 » récité, trop peu pour qu'on perde
            // le repère.
            const base = REPERES[rng.int(0, REPERES.length - 1)];
            angle = base + rng.int(-8, 8);
        } else if (niveau === '2') {
            angle = rng.int(12, 168);
        } else {
            // LES RENTRANTS SONT LE VRAI SAUT. Un angle de 250° se lit comme
            // son complément à 360 si l'on n'y prend pas garde, et c'est
            // justement l'erreur qu'on veut faire rencontrer.
            angle = rng.bool() ? rng.int(12, 168) : rng.int(195, 340);
        }
        angle = Math.max(10, Math.min(350, angle));

        const regle = params.premierCote || 'auto';
        const horizontal = regle === 'horizontal'
            || (regle === 'auto' && niveau === '1');
        // LE CÔTÉ DE DÉPART, EN DEGRÉS TRIGONOMÉTRIQUES. Quand il est libre on
        // tire n'importe quelle direction, par pas de 5° : au degré près, deux
        // questions se ressembleraient sans qu'on sache dire en quoi elles
        // diffèrent.
        const depart = horizontal ? 0 : rng.int(0, 71) * 5;

        const hints = [
            'Cherche d\'abord l\'angle droit : est-ce plus ouvert, ou moins ?',
            angle < 90
                ? 'Il est plus fermé qu\'un angle droit. Compare-le à la moitié d\'un droit, qui fait 45°.'
                : angle === 90
                    ? 'Regarde bien : les deux côtés forment un coin de feuille.'
                    : angle <= 180
                        ? 'Il est plus ouvert qu\'un angle droit. Un angle plat en fait 180 : en es-tu loin ?'
                        : 'Il dépasse l\'angle plat. Mesure plutôt ce qui MANQUE pour faire un tour entier.',
            `Il est entre ${Math.floor(angle / 10) * 10}° et ${Math.floor(angle / 10) * 10 + 10}°.`
        ];

        return makeItem({
            generatorId: 'geo.estimerAngle',
            skillId: 'geo.angles.estimer',
            answerKind: 'angle',
            prompt: {
                text: 'Combien mesure cet angle ? Estime-le à vue d\'œil.',
                html: '<div class="game-question">Combien mesure cet angle ?</div>'
            },
            answer: String(angle),
            hints,
            explanation: `L'angle mesure ${angle}°.`
                + (angle > 180 ? ` C'est un angle rentrant : il lui manque ${360 - angle}° `
                    + 'pour faire un tour entier.' : ''),
            difficulty: niveau === '1' ? 1 : niveau === '2' ? 2 : 3,
            meta: { angle, depart, tolerance, niveau, horizontal }
        });
    }
};
