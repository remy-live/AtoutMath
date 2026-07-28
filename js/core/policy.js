// Politique pédagogique d'un parcours.
//
// Une seule mécanique de jeu, deux usages radicalement différents :
//
//   ENTRAÎNEMENT — plusieurs essais, aides disponibles, correction immédiate,
//                  tirage adaptatif vers les notions fragiles, pas de note.
//   ÉVALUATION   — un seul essai, pas d'aide, correction différée à la fin,
//                  tirage neutre, note et bilan par compétence.
//
// Faire porter cette différence par des données (et non par du code dupliqué)
// évite d'avoir deux moteurs à maintenir, et rend le choix explicite pour le
// professeur au moment de construire son parcours.

export const MODES = {
    ENTRAINEMENT: 'entrainement',
    EVALUATION: 'evaluation'
};

export function defaultPolicy() {
    return {
        mode: MODES.ENTRAINEMENT,
        hints: true,
        maxAttemptsPerItem: 2,
        showCorrection: true,   // correction affichée juste après la réponse
        adaptive: true,         // biaise le tirage vers les notions faibles
        shuffleSteps: false,
        allowRetryStep: true,   // réessayer une étape ratée
        pointsPerItem: 10,
        hintPenalty: 0.25,      // part de points perdue par aide utilisée
        grading: null           // pas de note en entraînement
    };
}

export function evaluationPolicy(overrides = {}) {
    return {
        ...defaultPolicy(),
        mode: MODES.EVALUATION,
        hints: false,
        maxAttemptsPerItem: 1,
        showCorrection: false,
        adaptive: false,
        allowRetryStep: false,
        grading: {
            scale: 20,              // note sur 20 ; null => compétences seules
            rule: 'firstTry',       // 'firstTry' | 'ratio' | 'ponderee'
            penalties: { hint: 0.25, retry: 0.5 },
            arrondi: 0.5,           // arrondi au demi-point
            showCalculation: true   // montre à l'élève d'où sort sa note
        },
        ...overrides
    };
}

/** Complète une politique partielle (stockée dans un parcours) avec les défauts. */
export function resolvePolicy(policy) {
    if (!policy) return defaultPolicy();
    const base = policy.mode === MODES.EVALUATION ? evaluationPolicy() : defaultPolicy();
    const merged = { ...base, ...policy };
    if (policy.grading) merged.grading = { ...(base.grading || {}), ...policy.grading };
    return merged;
}

export function isEvaluation(policy) {
    return !!policy && policy.mode === MODES.EVALUATION;
}

/** Libellé court affiché à l'élève avant de démarrer. */
export function describePolicy(policy) {
    const p = resolvePolicy(policy);
    if (isEvaluation(p)) {
        const note = p.grading && p.grading.scale ? ` Noté sur ${p.grading.scale}.` : '';
        return `Évaluation : une seule réponse par question, sans aide.${note}`;
    }
    const essais = p.maxAttemptsPerItem > 1 ? `${p.maxAttemptsPerItem} essais par question` : 'un essai par question';
    return `Entraînement : ${essais}, aides disponibles, correction immédiate.`;
}
