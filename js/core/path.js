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

export const PATH_VERSION = 2;

export function makeStep(exerciseId, overrides = {}, opts = {}) {
    return {
        stepId: opts.stepId || 's_' + shortId(6),
        exerciseId,
        overrides: { ...overrides },
        nbItems: opts.nbItems || 10,
        threshold: opts.threshold !== undefined ? opts.threshold : null, // null => tout réussir
        weight: opts.weight || 1,
        timeLimit: opts.timeLimit || null,
        // Rejeu exact d'une question passée : la graine suffit à la régénérer,
        // on n'a donc jamais besoin de stocker son contenu.
        forceSeed: opts.forceSeed || null
    };
}

export function makePath(name = 'Nouveau parcours', steps = [], policy = null) {
    return {
        id: 'path_' + shortId(8),
        version: PATH_VERSION,
        name,
        policy: policy || defaultPolicy(),
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
        return { ...raw, policy: resolvePolicy(raw.policy), steps: (raw.steps || []).map(normalizeStep) };
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
        forceQuestion: p.forceQuestion || null
    };
}

function normalizeStep(s) {
    return {
        weight: 1, nbItems: 10, threshold: null, timeLimit: null,
        ...s,
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

/** Total des poids, pour afficher la répartition du barème dans l'éditeur. */
export function totalWeight(path) {
    return (path.steps || []).reduce((s, st) => s + (st.weight || 1), 0) || 1;
}

/** Nombre total de questions d'un parcours. */
export function totalItems(path) {
    return (path.steps || []).reduce((s, st) => s + (st.nbItems || 0), 0);
}
