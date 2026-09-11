// Générateur des POURCENTAGES — la progression de Rémy, dans son ordre.
//
// Sept étapes, et le pivot est au milieu : augmenter de 20 %, c'est multiplier
// par 1,20 ; réduire de 20 %, c'est multiplier par 0,80. Les quatre étapes qui
// suivent — la réduction, le prix soldé, le prix augmenté, la TVA — sont la
// même multiplication appliquée à des phrases différentes. Le générateur ne
// fait donc presque rien : il tire, il habille, et il explique. Tout le calcul
// vit dans core/pourcentages.js, où il se teste sans écran.
//
// LA FAÇON DE RÉPONDRE SE RÈGLE ÉTAPE PAR ÉTAPE (`parMarche`), et c'est ici que
// ça sert le plus : « augmenter de 20 %, c'est multiplier par combien ? » se
// pose très bien parmi quatre propositions — le coefficient est un objet qu'on
// RECONNAÎT avant de savoir le produire —, alors que le prix d'un jean soldé se
// tape. Un seul réglage pour les sept étapes obligerait à choisir le moins
// mauvais compromis ; le professeur choisit maintenant par étape.

import { makeItem } from '../items.js';
import {
    MARCHES_POURCENTAGE, tirerPourcentage, enonceDe, reponseDe, uniteDe,
    expliquer, leurresDe, ecrireNombre, ecrireEuros, ecrireCoefficient
} from '../pourcentages.js';
import {
    paramMarches, marchesCochees, marcheAuRang, conseilProgression, totalDe,
    valeurParMarche
} from '../progression.js';

const SKILL_PART = 'num.pourcentage.part';
const SKILL_COEF = 'num.pourcentage.coefficient';
const SKILL_VARIATION = 'num.pourcentage.variation';

/** Quelle compétence travaille chaque étape. */
const SKILL_DE = {
    part: SKILL_PART,
    'hausse-coef': SKILL_COEF,
    'baisse-coef': SKILL_COEF,
    reduction: SKILL_VARIATION,
    'prix-reduit': SKILL_VARIATION,
    'prix-augmente': SKILL_VARIATION,
    taxe: SKILL_VARIATION
};

/** L'étape monte : la première se fait de tête, la dernière demande le coefficient. */
const DIFFICULTE = {
    part: 1, 'hausse-coef': 2, 'baisse-coef': 2,
    reduction: 2, 'prix-reduit': 3, 'prix-augmente': 3, taxe: 4
};

const MOT = 'étape';

export const pourcentagesGenerator = {
    id: 'num.pourcentages',
    label: 'Pourcentages : réductions, augmentations, TVA',
    skills: [SKILL_PART, SKILL_COEF, SKILL_VARIATION],
    answerKinds: ['numeric', 'choice'],
    // Sur papier, l'exercice est un devoir de chapitre tout prêt : sept
    // familles de questions, des nombres qui tombent juste, et un corrigé qui
    // tient en deux lignes par question.
    ecrit: true,
    conseil: (p) => conseilProgression(marchesCochees(p, MARCHES_POURCENTAGE).length),
    params: [
        paramMarches({ marches: MARCHES_POURCENTAGE, mot: MOT }),
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
        const id = marcheAuRang(ctx.index ?? 0, marchesCochees(params, MARCHES_POURCENTAGE),
            totalDe(ctx, params), params);
        const t = tirerPourcentage(rng, id);

        const enonce = enonceDe(t);
        const juste = reponseDe(t);
        const unite = uniteDe(t);
        const auChoix = valeurParMarche(params, 'reponse', id, 'saisie') === 'choix';

        // L'ÉTIQUETTE D'UNE PROPOSITION PORTE SON UNITÉ, la réponse tapée non.
        // « 156 » et « 156 € » sont la même réponse au clavier — `sameAnswer`
        // ne compare que des nombres —, mais dans une liste de quatre prix,
        // l'euro dit de quoi on parle.
        // UN COEFFICIENT S'ÉCRIT « 1,20 », UN POURCENTAGE « 120 ». Le leurre qui
        // propose le pourcentage total au lieu du coefficient s'affichait
        // « 120,00 » : les deux décimales le déguisaient en coefficient, et le
        // piège perdait ce qui le rend instructif. Au-delà de 10, ce n'est plus
        // un coefficient.
        const etiquette = (v) => (unite ? ecrireEuros(v)
            : (Math.abs(v) < 10 ? ecrireCoefficient(v) : ecrireNombre(v)));

        const choix = auChoix ? [
            { value: juste, label: etiquette(juste), correct: true },
            ...leurresDe(t).slice(0, 3).map(l => ({
                value: l.value, label: etiquette(l.value), correct: false, why: l.why
            }))
        ] : null;

        return makeItem({
            seed: rng.seed,
            generatorId: 'num.pourcentages',
            skillId: SKILL_DE[id] || SKILL_VARIATION,
            answerKind: auChoix ? 'choice' : 'numeric',
            prompt: {
                text: enonce,
                html: `<div class="game-question">${enonce}</div>`
            },
            answer: juste,
            choices: choix,
            // LES INDICES MONTENT D'UN CRAN, ET AUCUN NE DONNE LA RÉPONSE. Le
            // premier rappelle ce qu'est un pourcentage, le deuxième nomme le
            // coefficient, le troisième pose le calcul sans le faire.
            hints: indicesDe(t),
            explanation: expliquer(t),
            difficulty: DIFFICULTE[id] || 2,
            meta: {
                marche: id, titre: (MARCHES_POURCENTAGE.find(m => m.id === id) || {}).nom,
                p: t.p, sens: t.sens, coef: t.coef, unite,
                // LES DEUX ÉTAPES DU COEFFICIENT N'ONT NI PRIX NI OBJET, et un
                // `meta` ne porte pas de trous : `objet: undefined` finit
                // affiché tel quel le jour où un écran s'en sert, comme le
                // « Étape function rang(n) {…} » de l'ascenseur. On ne pose que
                // ce qui existe — c'est un test du dépôt qui l'a rappelé.
                ...(t.montant === undefined ? {} : {
                    montant: t.montant, part: t.part, final: t.final
                }),
                ...(t.objet === undefined ? {} : { objet: t.objet }),
                // CE QUE LE PAVÉ NUMÉRIQUE DOIT MONTRER. L'euro se pose à côté
                // de l'écran : sans lui, l'élève se demande s'il doit taper
                // « 66 » ou « 66 € ». Et la virgule n'apparaît que là où elle
                // sert — sur les deux étapes du coefficient. Une touche
                // inutilisable n'est pas neutre : elle laisse croire qu'on
                // attend des décimales.
                unit: unite,
                decimal: !unite
            }
        });
    }
};

/**
 * TROIS INDICES, DU SENS VERS LE CALCUL.
 *
 * Rémy : « il faut les explications très simples ». Un indice qui explique la
 * proportionnalité avant de dire quoi faire n'aide personne : on commence par
 * le mot, on finit par l'opération, et on ne pose jamais le résultat.
 */
// « LE CALCUL : … », PAS « POSE LE CALCUL : … ».
//
// Le dernier indice est aussi ce que le robot dit juste avant de taper — voir
// `phraseCalcul` dans `core/activities/numeric.js`. À l'impératif, il mélangeait
// deux voix dans une même bulle : « Pose le calcul : 140 × 0,6. Je tape 84. »
// Le groupe nominal se lit dans les deux bouches, celle de l'aide comme celle
// du robot, et il dit exactement la même chose.
function indicesDe(t) {
    const c = ecrireCoefficient(t.coef);
    switch (t.marche) {
    case 'part':
        return [
            `${t.p} %, c’est ${t.p} sur 100.`,
            `On multiplie par ${t.p}, puis on divise par 100.`,
            `Le calcul : ${ecrireNombre(t.montant)} × ${t.p} ÷ 100.`
        ];
    case 'hausse-coef':
        return [
            'Le prix de départ, c’est 100 %.',
            `On y ajoute ${t.p} % : cela fait ${100 + t.p} % en tout.`,
            `${100 + t.p} % s’écrit ${100 + t.p} ÷ 100.`
        ];
    case 'baisse-coef':
        return [
            'Le prix de départ, c’est 100 %.',
            `On enlève ${t.p} % : il reste ${100 - t.p} %.`,
            `${100 - t.p} % s’écrit ${100 - t.p} ÷ 100.`
        ];
    case 'reduction':
        return [
            'On cherche ce qu’on ENLÈVE, pas ce qu’on paie.',
            `Il faut ${t.p} % de ${ecrireNombre(t.montant)}.`,
            `Le calcul : ${ecrireNombre(t.montant)} × ${ecrireNombre(t.p / 100)}.`
        ];
    case 'prix-reduit':
        return [
            `On enlève ${t.p} %, donc il reste ${100 - t.p} % du prix.`,
            `${100 - t.p} %, c’est le coefficient ${c}.`,
            `Le calcul : ${ecrireNombre(t.montant)} × ${c}.`
        ];
    case 'prix-augmente':
        return [
            `On ajoute ${t.p} %, donc on paie ${100 + t.p} % du prix.`,
            `${100 + t.p} %, c’est le coefficient ${c}.`,
            `Le calcul : ${ecrireNombre(t.montant)} × ${c}.`
        ];
    case 'taxe':
        return [
            'La TVA s’AJOUTE au prix hors taxes.',
            `On paie donc ${100 + t.p} % du prix, soit le coefficient ${c}.`,
            `Le calcul : ${ecrireNombre(t.montant)} × ${c}.`
        ];
    default:
        return [];
    }
}
