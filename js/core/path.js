// Modèle de parcours, version 2.
//
// Avant : une étape était une COPIE PROFONDE de l'exercice du catalogue
// (titre, consigne, tags, schéma de paramètres…), figée au moment du
// glisser-déposer. Trois problèmes : les parcours pesaient lourd, ils ne
// bénéficiaient jamais des corrections apportées au catalogue, et ils étaient
// impossibles à représenter proprement en base de données.
//
// Maintenant : une étape est une RÉFÉRENCE + des surcharges.
//   { stepId, exerciseId, overrides, nbItems, threshold, weight }
// Elle est « hydratée » au lancement en fusionnant avec le catalogue courant.
// Un parcours devient un petit document JSON, versionnable et synchronisable.

import { getExerciseById } from '../data/catalog.js';
import { resolvePolicy, defaultPolicy } from './policy.js';
import { shortId } from './ids.js';
import { questionsConseillees } from './duree.js';
import { getGenerator } from './registry.js';
import { SEUIL_DEFAUT } from './recompenses.js';

export const PATH_VERSION = 2;

/**
 * Le nombre de questions que CET exercice conseille.
 *
 * La même règle vivait déjà dans `shortcodes.js`, sous le nom `telQuel` : deux
 * copies d'un même défaut finissent toujours par diverger, et celle-ci décidait
 * de ce qu'un élève verrait.
 */
export function questionsConseilleesDe(exerciseId) {
    const exo = getExerciseById(exerciseId);
    if (!exo) return 10;
    return questionsConseillees(
        exo.generatorId ? getGenerator(exo.generatorId) : null,
        exo.params || {}, { activite: exo.activityId });
}

export function makeStep(exerciseId, overrides = {}, opts = {}) {
    return {
        stepId: opts.stepId || 's_' + shortId(6),
        exerciseId,
        overrides: { ...overrides },
        // LE COMPTE NATUREL DE L'EXERCICE, PAS DIX POUR TOUT LE MONDE.
        //
        // Rémy : « par défaut propose 20 questions lorsque ce sont des
        // calculs ». C'était déjà le cas quand on passait par le bouton
        // « ajouter », qui calculait le conseil et le passait ici — mais
        // partout ailleurs (un parcours importé, un code élève, une étape
        // fabriquée par du code) le dix en dur reprenait la main. Et comme dix
        // est une valeur VRAIE, le repli `step.nbItems || conseil` du panneau
        // ne se déclenchait jamais : il n'y avait aucun moyen de distinguer
        // « dix, parce que le professeur l'a voulu » de « dix, faute de mieux ».
        //
        // Le conseil vit dans l'exercice : vingt pour un réflexe de calcul,
        // douze pour une grille de mots croisés, quarante pour un duel. On le
        // demande donc ici, une fois pour toutes.
        nbItems: opts.nbItems || questionsConseilleesDe(exerciseId),
        // `null` = AUCUNE EXIGENCE, et non « tout réussir » : c'est ce que le
        // meneur en fait depuis toujours (`seuilRequis` rend 0), et c'est ce dont
        // l'évaluation et les jeux de récompense ont besoin — ils se notent ou se
        // gagnent, ils ne se valident pas. Voir core/seuilEtape.js.
        threshold: opts.threshold !== undefined ? opts.threshold : null,
        weight: opts.weight || 1,
        timeLimit: opts.timeLimit || null,
        // Rejeu exact d'une question passée : la graine suffit à la régénérer,
        // on n'a donc jamais besoin de stocker son contenu.
        forceSeed: opts.forceSeed || null,
        // LE TEMPS BORNE, PAS LE NOMBRE. Posé par les exercices que l'élève se
        // donne « pour cinq minutes » : le nombre de questions n'est alors
        // qu'un garde-fou interne, et l'en-tête ne doit pas l'annoncer comme
        // un total à atteindre. Voir `updateProgress` dans le meneur.
        sansTotal: !!opts.sansTotal,
        // UNE ÉTAPE-JEU n'est pas du travail : elle ne compte ni dans les
        // exercices à faire, ni dans la note, et elle ne s'ouvre qu'une fois
        // le travail qui la précède réussi. Voir core/recompenses.js.
        bonus: !!opts.bonus
    };
}

export function makePath(name = 'Nouveau parcours', steps = [], policy = null) {
    return {
        id: 'path_' + shortId(8),
        version: PATH_VERSION,
        name,
        policy: policy || defaultPolicy(),
        // Le niveau de réussite qui ouvre les jeux de récompense du parcours.
        bonusSeuil: SEUIL_DEFAUT,
        steps
    };
}

/**
 * Convertit un parcours de n'importe quelle version vers la v2.
 * Les anciens parcours (tableau d'exercices copiés) restent utilisables.
 */
export function normalizePath(raw, name = 'Parcours') {
    if (!raw) return makePath(name);

    // Ancien format : un simple tableau d'étapes-copies.
    if (Array.isArray(raw)) {
        return {
            id: 'path_' + shortId(8),
            version: PATH_VERSION,
            name,
            policy: defaultPolicy(),
            steps: raw.map((s, i) => legacyStep(s, i))
        };
    }

    if (raw.version === PATH_VERSION) {
        return {
            bonusSeuil: SEUIL_DEFAUT,
            ...raw,
            policy: resolvePolicy(raw.policy),
            steps: (raw.steps || []).map(normalizeStep)
        };
    }

    // Objet { name, data: [...] } tel que stocké par l'ancien navigateur de parcours.
    const steps = Array.isArray(raw.data) ? raw.data : (raw.steps || []);
    return {
        id: raw.id || 'path_' + shortId(8),
        version: PATH_VERSION,
        name: raw.name || name,
        policy: resolvePolicy(raw.policy),
        steps: steps.map((s, i) => legacyStep(s, i))
    };
}

function legacyStep(s, i) {
    const p = s.currentParams || s.params || {};
    return {
        stepId: s.stepId || `s_legacy_${i}`,
        exerciseId: s.exerciseId || s.exoId || s.id,
        overrides: stripRuntimeKeys(p),
        nbItems: p.nbQuestions || 10,
        threshold: p.successThreshold !== undefined ? p.successThreshold : null,
        weight: s.weight || 1,
        timeLimit: p.timeLimit || null,
        forceSeed: p.forceSeed || null,
        forceQuestion: p.forceQuestion || null,
        bonus: !!s.bonus
    };
}

function normalizeStep(s) {
    return {
        weight: 1, nbItems: 10, threshold: null, timeLimit: null, bonus: false,
        ...s,
        bonus: !!s.bonus,
        overrides: s.overrides || {}
    };
}

// nbQuestions / successThreshold / timeLimit sont des réglages de déroulement,
// pas des paramètres de contenu : ils vivent au niveau de l'étape.
function stripRuntimeKeys(params) {
    const { nbQuestions, successThreshold, timeLimit, minScore, forceQuestion, forceSeed, ...rest } = params || {};
    return rest;
}

/**
 * Hydrate un parcours : chaque étape est fusionnée avec l'exercice du
 * catalogue pour produire un objet directement exécutable par le runner.
 * Les étapes dont l'exercice a disparu sont écartées (et signalées).
 * @returns {{path:Object, steps:Array, missing:string[]}}
 */
export function hydratePath(path) {
    const normalized = normalizePath(path);
    const missing = [];
    const steps = [];

    for (const step of normalized.steps) {
        const exo = getExerciseById(step.exerciseId);
        if (!exo) {
            missing.push(step.exerciseId);
            continue;
        }
        steps.push({
            ...step,
            exercise: exo,
            title: exo.title,
            params: { ...(exo.params || {}), ...(step.overrides || {}) },
            threshold: step.threshold === null ? step.nbItems : step.threshold
        });
    }

    return { path: normalized, steps, missing };
}

/**
 * Total des poids, pour afficher la répartition du barème dans l'éditeur.
 * Les jeux de récompense en sont exclus : on ne note pas une récompense.
 */
export function totalWeight(path) {
    return (path.steps || []).filter(st => !st.bonus)
        .reduce((s, st) => s + (st.weight || 1), 0) || 1;
}

/** Nombre total de questions d'un parcours — hors jeux de récompense. */
export function totalItems(path) {
    return (path.steps || []).filter(st => !st.bonus)
        .reduce((s, st) => s + (st.nbItems || 0), 0);
}
