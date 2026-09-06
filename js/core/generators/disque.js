// Générateur du PÉRIMÈTRE ET DE L'AIRE DU DISQUE.
//
// Rémy : « un exercice sur le périmètre et l'aire du disque : au départ on
// donne la valeur exacte, faire des QCM après. Et après on a le droit à la
// calculatrice pour pouvoir calculer la valeur approchée. »
//
// SIX ÉTAPES, ET LA COUPURE EST AU MILIEU. Les quatre premières demandent une
// valeur EXACTE — « 25π cm² » —, et ne se répondent qu'en propositions : un
// pavé numérique ne sait pas écrire π. Les deux dernières demandent une valeur
// ARRONDIE, et c'est là que la calculatrice sert.
//
// LE GÉNÉRATEUR IMPOSE LE GENRE DE RÉPONSE SUR LES QUATRE PREMIÈRES, et c'est
// la seule fois où il passe devant le professeur. Ce n'est pas un choix
// pédagogique qu'on lui retire : c'est qu'aucun clavier de chiffres ne permet
// de taper « 25π ». Le réglage « Réponse » gouverne donc les deux étapes
// arrondies, et son aide le dit.

import { makeItem } from '../items.js';
import { figure } from '../figures.js';
import {
    MARCHES_DISQUE, ETAPES_EXACTES, tirerDisque, enonceDe, reponseDe, uniteDe,
    expliquer, indicesDe, leurresDe, figureDisqueSvg, ecrireNombre
} from '../disque.js';
import {
    paramMarches, marchesCochees, marcheAuRang, conseilProgression, totalDe,
    valeurParMarche
} from '../progression.js';

const SKILL_PERIMETRE = 'mes.perimetre.disque';
const SKILL_AIRE = 'mes.aire.disque';
const MOT = 'étape';

const DIFFICULTE = {
    formule: 1, 'perimetre-exact': 2, 'aire-exacte': 2,
    diametre: 3, 'perimetre-arrondi': 3, 'aire-arrondie': 4
};

export const disqueGenerator = {
    id: 'mes.disque',
    label: 'Périmètre et aire du disque',
    skills: [SKILL_PERIMETRE, SKILL_AIRE],
    answerKinds: ['numeric', 'choice'],
    ecrit: true,
    conseil: (p) => conseilProgression(marchesCochees(p, MARCHES_DISQUE).length),
    params: [
        paramMarches({ marches: MARCHES_DISQUE, mot: MOT }),
        {
            id: 'reponse', type: 'select', label: 'Réponse', papier: false,
            parMarche: true,
            aide: 'Ne vaut que pour les deux étapes arrondies. Une valeur exacte porte un π : '
                + 'elle ne se tape pas au pavé, et reste toujours en propositions.',
            options: [
                { value: 'saisie', label: 'À saisir (clavier de nombres)', court: 'Clavier', clavier: true },
                { value: 'choix', label: 'À choisir parmi quatre', court: '4' }
            ],
            default: 'saisie'
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const id = marcheAuRang(ctx.index ?? 0, marchesCochees(params, MARCHES_DISQUE),
            totalDe(ctx, params), params);
        const t = tirerDisque(rng, id);

        const juste = reponseDe(t);
        const unite = uniteDe(t);
        // Voir l'en-tête : « 25π » ne se tape pas. Les étapes exactes restent en
        // propositions, quel que soit le réglage.
        const auChoix = ETAPES_EXACTES.includes(id)
            || valeurParMarche(params, 'reponse', id, 'saisie') === 'choix';
        const etiquette = (v) => (typeof v === 'number' ? `${ecrireNombre(v)} ${unite}` : String(v));

        const enonce = enonceDe(t);
        const figureSvg = figureDisqueSvg(t);

        return makeItem({
            seed: rng.seed,
            generatorId: 'mes.disque',
            skillId: t.surLAire ? SKILL_AIRE : SKILL_PERIMETRE,
            answerKind: auChoix ? 'choice' : 'numeric',
            prompt: {
                text: enonce,
                papier: enonce,
                html: `<div class="game-question dsq-question">${enonce}</div>${figure(figureSvg)}`
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
                marche: id, titre: (MARCHES_DISQUE.find(m => m.id === id) || {}).nom,
                r: t.r, d: t.d, coefficient: t.coefficient, surLAire: t.surLAire,
                exact: t.exact, arrondi: t.arrondi, decimales: t.decimales,
                // LE PAVÉ MONTRE L'UNITÉ, ET LA VIRGULE QUAND ELLE SERT : au
                // dixième pour un périmètre, jamais pour une aire qu'on arrondit
                // à l'unité.
                unit: unite,
                decimal: !ETAPES_EXACTES.includes(id) && t.decimales > 0,
                figure: figureSvg
            }
        });
    }
};
