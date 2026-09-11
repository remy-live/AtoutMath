// Générateur du PÉRIMÈTRE DU TRIANGLE.
//
// Rémy : « j'aimerais bien faire un exercice sur le périmètre du triangle. »
//
// Quatre étapes qui se cochent, et la dernière retourne la question : on donne
// le périmètre, on cherche un côté. C'est là qu'on voit si « le périmètre,
// c'est le tour » a été compris ou seulement récité — celui qui n'a retenu
// qu'une addition ne sait pas quoi faire d'une soustraction.
//
// LA FIGURE EST DESSINÉE À CHAQUE QUESTION, à l'échelle et codée. Le calcul
// vit dans core/perimetreTriangle.js, le tracé aussi : ici on ne fait
// qu'habiller.

import { makeItem } from '../items.js';
import { figure } from '../figures.js';
import {
    MARCHES_TRIANGLE, tirerTriangle, enonceDe, reponseDe, expliquer, leurresDe,
    figureTriangleSvg, ecrireNombre
} from '../perimetreTriangle.js';
import {
    paramMarches, marchesCochees, marcheAuRang, conseilProgression, totalDe,
    valeurParMarche
} from '../progression.js';

const SKILL = 'mes.perimetre.triangle';
const MOT = 'étape';

const DIFFICULTE = { quelconque: 1, isocele: 2, equilateral: 2, manquant: 3 };

export const perimetreTriangleGenerator = {
    id: 'mes.perimetre-triangle',
    label: 'Périmètre du triangle',
    skills: [SKILL],
    answerKinds: ['numeric', 'choice'],
    ecrit: true,
    conseil: (p) => conseilProgression(marchesCochees(p, MARCHES_TRIANGLE).length),
    params: [
        paramMarches({ marches: MARCHES_TRIANGLE, mot: MOT }),
        {
            id: 'max', type: 'number', label: 'Côté le plus long', min: 6, max: 30, default: 12,
            aide: 'La plus grande longueur qu’un côté peut avoir. Douze garde les additions de '
                + 'tête ; au-delà, on pose le calcul.'
        },
        {
            id: 'unite', type: 'select', label: 'Unité', default: 'cm',
            options: [
                { value: 'cm', label: 'centimètres (cm)' },
                { value: 'm', label: 'mètres (m)' },
                { value: 'mm', label: 'millimètres (mm)' }
            ],
            aide: 'L’unité écrite sur la figure et attendue dans la réponse. Elle ne change rien '
                + 'au calcul.'
        },
        {
            id: 'reponse', type: 'select', label: 'Réponse', papier: false,
            parMarche: true,
            options: [
                { value: 'saisie', label: 'À saisir (clavier de nombres)', court: 'Clavier', clavier: true },
                { value: 'choix', label: 'À choisir parmi quatre', court: '4' }
            ],
            default: 'saisie'
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const id = marcheAuRang(ctx.index ?? 0, marchesCochees(params, MARCHES_TRIANGLE),
            totalDe(ctx, params), params);
        const unite = ['cm', 'm', 'mm'].includes(params.unite) ? params.unite : 'cm';
        const t = tirerTriangle(rng, id, { max: params.max, unite });

        const juste = reponseDe(t);
        const auChoix = valeurParMarche(params, 'reponse', id, 'saisie') === 'choix';
        const etiquette = (v) => `${ecrireNombre(v)} ${unite}`;

        const enonce = enonceDe(t);
        const figureSvg = figureTriangleSvg(t);

        return makeItem({
            seed: rng.seed,
            generatorId: 'mes.perimetre-triangle',
            skillId: SKILL,
            answerKind: auChoix ? 'choice' : 'numeric',
            prompt: {
                text: enonce,
                // SUR LE PAPIER, LA FIGURE EST DANS L'ÉNONCÉ : une fiche de
                // périmètre sans figure n'apprend pas que le périmètre fait le
                // tour — c'est la leçon retenue du rectangle.
                papier: enonce,
                html: `<div class="game-question tri-question">${enonce}</div>${figure(figureSvg)}`
            },
            answer: juste,
            choices: auChoix ? [
                { value: juste, label: etiquette(juste), correct: true },
                ...leurresDe(t).slice(0, 3).map(l => ({
                    value: l.value, label: etiquette(l.value), correct: false, why: l.why
                }))
            ] : null,
            hints: indicesDe(t),
            explanation: expliquer(t),
            difficulty: DIFFICULTE[id] || 2,
            meta: {
                marche: id, titre: (MARCHES_TRIANGLE.find(m => m.id === id) || {}).nom,
                a: t.a, b: t.b, c: t.c, rot: t.rot, perimetre: t.perimetre, cache: t.cache || '',
                unit: unite, decimal: false, figure: figureSvg
            }
        });
    }
};

/** Trois indices : le sens, la lecture de la figure, puis le calcul posé. */
function indicesDe(t) {
    switch (t.marche) {
    case 'equilateral':
        return [
            'Équilatéral veut dire que les trois côtés sont égaux.',
            'Les trois marques sur la figure disent que les trois côtés ont la même longueur.',
            `Pose le calcul : ${ecrireNombre(t.a)} × 3.`
        ];
    case 'isocele':
        return [
            'Isocèle en A veut dire que [AB] et [AC] ont la même longueur.',
            'Les deux marques de la figure disent lequel des côtés vaut autant que l’autre.',
            `Pose le calcul : ${ecrireNombre(t.c)} + ${ecrireNombre(t.c)} + ${ecrireNombre(t.a)}.`
        ];
    case 'manquant':
        return [
            'Le périmètre, c’est le tour : les trois côtés mis bout à bout.',
            'Deux côtés sont connus ; le troisième est ce qui reste du tour.',
            `Pose le calcul : ${ecrireNombre(t.perimetre)} − les deux côtés écrits sur la figure.`
        ];
    default:
        return [
            'Le périmètre, c’est le tour de la figure.',
            'Fais le tour du triangle en ajoutant les trois côtés.',
            `Pose le calcul : ${ecrireNombre(t.c)} + ${ecrireNombre(t.a)} + ${ecrireNombre(t.b)}.`
        ];
    }
}
