// Politique pédagogique d'un parcours.
//
// Une seule mécanique de jeu, trois usages radicalement différents :
//
//   APPRENTISSAGE — pour DÉCOUVRIR une notion : leçon et démonstration du
//                   robot avant de jouer, essais illimités, aides gratuites,
//                   bouton « Montre-moi » qui révèle et explique. Sans enjeu.
//   ENTRAÎNEMENT  — plusieurs essais, aides disponibles, correction immédiate,
//                   tirage adaptatif vers les notions fragiles, pas de note.
//   ÉVALUATION    — un seul essai, pas d'aide, correction différée à la fin,
//                   tirage neutre, note et bilan par compétence.
//
// Faire porter cette différence par des données (et non par du code dupliqué)
// évite d'avoir trois moteurs à maintenir, et rend le choix explicite pour le
// professeur au moment de construire son parcours.

export const MODES = {
    APPRENTISSAGE: 'apprentissage',
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
        // « Montre-moi » disponible aussi en entraînement : il consomme les
        // indices (donc réduit les points), alors qu'en apprentissage il est
        // gratuit. En évaluation, il est coupé ci-dessous.
        showMe: true,
        grading: null           // pas de note en entraînement
    };
}

export function apprentissagePolicy(overrides = {}) {
    return {
        ...defaultPolicy(),
        mode: MODES.APPRENTISSAGE,
        hints: true,
        // « Illimité » en pratique : personne n'épuise 99 essais, et garder un
        // nombre évite de traiter Infinity partout dans les calculs d'essais.
        maxAttemptsPerItem: 99,
        hintPenalty: 0,          // les aides ne coûtent rien : on apprend
        showCorrection: true,
        adaptive: true,
        allowRetryStep: true,
        // Écran d'accueil de chaque étape : leçon + démonstration du robot.
        guided: true,
        // Bouton « Montre-moi » dans l'exercice : révèle la réponse et
        // l'explique, puis l'élève fait le geste lui-même.
        showMe: true,
        grading: null,
        ...overrides
    };
}

export function evaluationPolicy(overrides = {}) {
    return {
        ...defaultPolicy(),
        mode: MODES.EVALUATION,
        hints: false,
        showMe: false,
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
    const base = policy.mode === MODES.EVALUATION ? evaluationPolicy()
        : policy.mode === MODES.APPRENTISSAGE ? apprentissagePolicy()
            : defaultPolicy();
    const merged = { ...base, ...policy };
    if (policy.grading) merged.grading = { ...(base.grading || {}), ...policy.grading };
    return merged;
}

export function isEvaluation(policy) {
    return !!policy && policy.mode === MODES.EVALUATION;
}

export function isApprentissage(policy) {
    return !!policy && policy.mode === MODES.APPRENTISSAGE;
}

/** Libellé court affiché à l'élève avant de démarrer. */
export function describePolicy(policy) {
    const p = resolvePolicy(policy);
    if (isEvaluation(p)) {
        const note = p.grading && p.grading.scale ? ` Noté sur ${p.grading.scale}.` : '';
        return `Évaluation : une seule réponse par question, sans aide.${note}`;
    }
    if (isApprentissage(p)) {
        return 'Apprentissage : leçon et robot pour découvrir, essais illimités, aides gratuites.';
    }
    const essais = p.maxAttemptsPerItem > 1 ? `${p.maxAttemptsPerItem} essais par question` : 'un essai par question';
    return `Entraînement : ${essais}, aides disponibles, correction immédiate.`;
}
