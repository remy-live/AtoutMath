// CALCULER AVEC DES DURÉES — sixième, bloc 8.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, dans sa progression de sixième. La pendule se lit déjà dans le
// logiciel ; rien n'y faisait ADDITIONNER 1 h 45 et 2 h 30.
//
// ── POURQUOI C'EST UN CHAPITRE À PART, ET NON UNE ADDITION DE PLUS ─────────
//
// PARCE QUE LA RETENUE NE VAUT PLUS DIX. 45 + 30 = 75, et 75 minutes ne
// s'écrivent pas : c'est 1 h 15. L'élève qui a passé cinq ans à retenir
// « au-delà de 9, je retiens 1 » applique la même règle et répond « 3 h 75 »,
// ou pire, « 4 h 15 » en retenant un au mauvais moment.
//
// C'EST DONC UN CHAPITRE DE BASE SOIXANTE, déguisé en chapitre d'horloge. Et
// c'est le seul endroit du programme où l'on calcule dans une base qui n'est
// pas dix : ce qui y est appris sert ensuite aux angles, puis aux
// coordonnées géographiques.
//
// ── LES QUATRE ERREURS ENCODÉES ────────────────────────────────────────────
//
//   1. LES MINUTES QUI DÉPASSENT SOIXANTE et qu'on laisse telles quelles :
//      « 3 h 75 ».
//   2. LA RETENUE À DIX au lieu de soixante : 45 + 30 = 75 → « on retient 7,
//      il reste 5 ».
//   3. LA SOUSTRACTION OÙ L'ON EMPRUNTE DIX au lieu de soixante.
//   4. LA CONVERSION QUI MULTIPLIE PAR CENT : 2 h 15 écrit « 215 minutes ».

import { makeItem, finalizeChoices } from '../items.js';
import {
    paramMarches, marchesCochees, marcheAuRang, conseilProgression, totalDe
} from '../progression.js';

const COMPETENCE = 'mes.duree.calcul';

const MARCHES = [
    { id: 'somme', nom: 'Additionner deux durées' },
    { id: 'difference', nom: 'Soustraire deux durées' },
    { id: 'vers-minutes', nom: 'En minutes seulement' },
    { id: 'vers-heures', nom: 'Des minutes vers heures et minutes' }
];
const TEMPS = {};
const MOT = 'palier';
const ANCIEN = { cle: 'palier' };

/** « 2 h 05 » — les minutes s'écrivent sur DEUX chiffres, comme sur une pendule. */
export function ecrireDuree(totalMinutes) {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h} h`;
    return `${h} h ${String(m).padStart(2, '0')}`;
}

/** Une durée en minutes, dont les minutes ne sont jamais rondes par hasard. */
function tirerDuree(rng, hMax = 4) {
    const h = rng.int(0, hMax);
    const m = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55][rng.int(0, 11)];
    return h * 60 + (h === 0 && m === 0 ? 30 : m);
}

export const dureesGenerator = {
    id: 'mes.durees',
    label: 'Calculer avec des durées',
    skills: [COMPETENCE],
    answerKinds: ['choice'],
    ecrit: true,
    conseil: (p) => conseilProgression(marchesCochees(p, MARCHES, ANCIEN).length, 3),
    params: [paramMarches({ marches: MARCHES, groupes: TEMPS, mot: MOT, ancien: ANCIEN })],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const i = Number(ctx.index) || 0;
        const marche = marcheAuRang(i, marchesCochees(p, MARCHES, ANCIEN),
            totalDe(ctx, p), p, 3);
        const commun = {
            seed: rng.seed,
            generatorId: 'mes.durees',
            skillId: COMPETENCE,
            answerKind: 'choice'
        };

        if (marche === 'somme' || marche === 'difference') {
            const somme = marche === 'somme';
            let x = tirerDuree(rng, 3), y = tirerDuree(rng, 2);
            if (!somme && y >= x) { const t = x; x = y + 30; y = t; }
            const total = somme ? x + y : x - y;
            const mx = x % 60, my = y % 60;
            // LES MINUTES DÉPASSENT-ELLES SOIXANTE ? C'est tout le sujet : sans
            // retenue, la question se répond sans rien avoir compris.
            const deborde = somme ? (mx + my >= 60) : (mx < my);

            // L'ERREUR N° 1 : les minutes laissées au-delà de soixante.
            const brut = somme
                ? `${Math.floor(x / 60) + Math.floor(y / 60)} h ${String(mx + my).padStart(2, '0')}`
                : `${Math.floor(x / 60) - Math.floor(y / 60)} h ${String(Math.abs(mx - my)).padStart(2, '0')}`;
            // L'ERREUR N° 2 : la retenue de DIX au lieu de SOIXANTE.
            const dix = somme ? total + 50 : total - 50;

            const leurres = [
                { v: brut, why: deborde
                    ? `Les minutes dépassent 60 : ${mx} + ${my} = ${mx + my}, c'est-à-dire `
                        + `1 h ${String((mx + my) - 60).padStart(2, '0')}. On reporte cette heure.`
                    : 'Les heures ne se retiennent pas ici — relis le calcul des minutes.' },
                { v: ecrireDuree(Math.max(0, dix)), why: 'La retenue d\'une heure vaut SOIXANTE '
                    + 'minutes, pas dix : une pendule ne compte pas en base dix.' },
                { v: ecrireDuree(somme ? total + 60 : Math.max(0, total - 60)),
                    why: 'Une heure de trop (ou de moins) : la retenue a été comptée deux fois.' }
            ];
            const bonne = ecrireDuree(total);
            return makeItem({
                ...commun,
                prompt: {
                    text: `${ecrireDuree(x)} ${somme ? '+' : '−'} ${ecrireDuree(y)} = ?`,
                    html: `<div class="game-question">${ecrireDuree(x)} `
                        + `${somme ? '+' : '−'} ${ecrireDuree(y)} =&nbsp;?</div>`,
                    papier: `${ecrireDuree(x)} ${somme ? '+' : '−'} ${ecrireDuree(y)} =`
                },
                answer: bonne,
                choices: finalizeChoices(rng, [
                    { value: bonne, label: bonne, correct: true },
                    ...leurres.filter(l => l.v !== bonne)
                        .map(l => ({ value: l.v, label: l.v, why: l.why }))
                ], { count: 4, filler: (r) => ecrireDuree(Math.max(5, total + r.int(1, 3) * 15)) }),
                hints: [
                    'Additionne les heures d\'un côté, les minutes de l\'autre.',
                    'Puis regarde les minutes : au-delà de 60, elles font une heure de plus.'
                ],
                explanation: deborde
                    ? `${mx} ${somme ? '+' : '−'} ${my} minutes ${somme ? 'font' : 'demandent'} `
                        + `une retenue de SOIXANTE minutes, pas de dix. Le résultat est ${bonne}.`
                    : `Les heures entre elles, les minutes entre elles : ${bonne}.`,
                difficulty: deborde ? 3 : 1,
                meta: { marche, x, y, total, deborde, theme: `${marche}-${deborde}` }
            });
        }

        if (marche === 'vers-minutes') {
            const d = tirerDuree(rng, 4) || 95;
            const h = Math.floor(d / 60), m = d % 60;
            const bonne = `${d} min`;
            const leurres = [
                { v: `${h * 100 + m} min`, why: 'Une heure vaut 60 minutes, pas 100 : '
                    + `${h} h ${String(m).padStart(2, '0')} ne s'écrit pas ${h}${String(m).padStart(2, '0')}.` },
                { v: `${h * 60} min`, why: 'Les minutes de la durée ont été oubliées.' },
                { v: `${d + 60} min`, why: 'Une heure de trop.' }
            ];
            return makeItem({
                ...commun,
                prompt: {
                    text: `Combien de minutes font ${ecrireDuree(d)} ?`,
                    html: `<div class="game-question">Combien de minutes font `
                        + `<b>${ecrireDuree(d)}</b>&nbsp;?</div>`,
                    papier: `${ecrireDuree(d)} = …… min`
                },
                answer: bonne,
                choices: finalizeChoices(rng, [
                    { value: bonne, label: bonne, correct: true },
                    ...leurres.filter(l => l.v !== bonne)
                        .map(l => ({ value: l.v, label: l.v, why: l.why }))
                ], { count: 4, filler: (r) => `${d + r.int(1, 5) * 10} min` }),
                hints: ['Une heure vaut 60 minutes.', `${h} × 60 = ${h * 60}, puis on ajoute ${m}.`],
                explanation: `${h} h = ${h * 60} min, plus ${m} min : ${d} minutes en tout.`,
                difficulty: 2,
                meta: { marche, d, theme: `min-${d}` }
            });
        }

        // DES MINUTES VERS HEURES ET MINUTES — c'est la division euclidienne
        // par 60, et il vaut la peine de le dire : le quotient donne les
        // heures, le reste les minutes.
        const total = rng.int(70, 400);
        const bonne = ecrireDuree(total);
        const leurres = [
            { v: `${Math.round(total / 60)} h`, why: 'On ne garde pas que les heures : '
                + 'il reste des minutes, et elles comptent.' },
            { v: ecrireDuree(total + 60), why: 'Une heure de trop.' },
            { v: `${Math.floor(total / 100)} h ${String(total % 100).padStart(2, '0')}`,
                why: 'On divise par 60, pas par 100 : une heure vaut soixante minutes.' }
        ];
        return makeItem({
            ...commun,
            prompt: {
                text: `Écris ${total} minutes en heures et minutes.`,
                html: `<div class="game-question">Écris <b>${total} minutes</b> en heures `
                    + 'et minutes.</div>',
                papier: `${total} min = …… h …… min`
            },
            answer: bonne,
            choices: finalizeChoices(rng, [
                { value: bonne, label: bonne, correct: true },
                ...leurres.filter(l => l.v !== bonne)
                    .map(l => ({ value: l.v, label: l.v, why: l.why }))
            ], { count: 4, filler: (r) => ecrireDuree(total + r.int(1, 4) * 15) }),
            hints: [
                'Divise par 60 : le quotient donne les heures.',
                'Et le RESTE de cette division donne les minutes.'
            ],
            explanation: `${total} = 60 × ${Math.floor(total / 60)} + ${total % 60}, `
                + `donc ${total} min = ${bonne}. C'est une division euclidienne par 60 : `
                + 'le quotient compte les heures, le reste les minutes.',
            difficulty: 2,
            meta: { marche, total, theme: `h-${total}` }
        });
    }
};
