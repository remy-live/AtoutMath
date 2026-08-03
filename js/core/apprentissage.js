// Mode apprentissage : on explique, puis on monte.
//
// Tous les exercices n'en ont pas besoin. Une addition n'a pas de règle à
// apprendre : on sait ce qu'on demande dès qu'on l'a lu. Mais un Binairo, un
// Mathdoku ou les notations de géométrie ne s'improvisent pas — les jeter à un
// élève sans un mot, c'est lui demander de deviner la règle en même temps que
// la réponse, et c'est ainsi qu'on fabrique du dégoût.
//
// Un mode apprentissage n'est donc PAS un nouveau moteur : c'est une leçon,
// puis un parcours à paliers. Le moteur de parcours sait déjà enchaîner des
// étapes aux réglages différents, compter les réussites et laisser rejouer une
// étape ratée ; il n'y avait rien à réécrire.
//
// L'exercice le déclare dans le catalogue :
//
//   apprentissage: {
//     intro: 'une phrase qui dit à quoi on joue',
//     regles: [{ titre, texte, exemple?, figure? }],
//     paliers: [{ titre, overrides, nbItems, exerciseId? }]
//   }
//
// `exerciseId` permet à un palier de passer par un AUTRE exercice : on apprend
// les notations au calme, on ne les révise contre la montre qu'au dernier
// palier. La difficulté d'un mode apprentissage n'est pas seulement dans les
// réglages, elle est aussi dans le jeu qu'on affronte.

import { makePath, makeStep } from './path.js';
import { defaultPolicy } from './policy.js';

export function aApprentissage(exo) {
    const a = exo && exo.apprentissage;
    return !!(a && Array.isArray(a.paliers) && a.paliers.length);
}

/**
 * Politique du mode apprentissage : on est là pour comprendre, pas pour être
 * jugé. Plusieurs essais, aides disponibles, correction immédiate, aucune note
 * — et un tirage neutre, car cibler les fragilités d'un élève sur une notion
 * qu'il découvre n'a pas de sens.
 */
function politiqueApprentissage() {
    return {
        ...defaultPolicy(),
        maxAttemptsPerItem: 3,
        hints: true,
        showCorrection: true,
        adaptive: false,
        grading: null
    };
}

/**
 * Combien de réussites pour valider un palier.
 *
 * Le droit à l'erreur est ici une règle, pas une tolérance : renvoyer un élève
 * au début d'un palier pour UNE inattention sur une notion qu'il découvre est
 * la meilleure façon de le faire abandonner. Tant qu'il y a plus d'une
 * question, on en laisse toujours passer une — même au dernier palier, qui
 * exige seulement une proportion plus haute.
 */
function seuilDe(nbItems, dernier) {
    if (nbItems <= 1) return 1;
    const vise = Math.ceil(nbItems * (dernier ? 0.8 : 0.6));
    return Math.min(nbItems - 1, Math.max(1, vise));
}

/**
 * Construit le parcours d'apprentissage d'un exercice.
 * @returns {{path:Object, lecon:Object}|null}
 */
export function construireApprentissage(exo) {
    if (!aApprentissage(exo)) return null;
    const { intro, regles = [], paliers } = exo.apprentissage;

    const steps = paliers.map((palier, i) => makeStep(
        palier.exerciseId || exo.id,
        palier.overrides || {},
        {
            nbItems: palier.nbItems || 4,
            threshold: palier.threshold !== undefined
                ? palier.threshold
                : seuilDe(palier.nbItems || 4, i === paliers.length - 1),
            titre: palier.titre || null
        }
    ));

    return {
        path: makePath(`Apprendre : ${exo.title}`, steps, politiqueApprentissage()),
        lecon: {
            titre: exo.title,
            intro: intro || exo.instruction || '',
            regles,
            paliers: paliers.map(p => p.titre).filter(Boolean)
        }
    };
}
