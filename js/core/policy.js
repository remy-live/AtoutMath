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

// --- CE QUE L'INTERROGATION FAIT APRÈS CHAQUE RÉPONSE -------------------------
//
// Rémy : « il faut un mode où l'ordinateur montre la bonne réponse ou bien
// juste passe à la question suivante », et « je pense que si c'est en mode
// interrogation il faut une explication de la part du robot ».
//
// Ce sont trois régimes distincts, et le choix n'est pas cosmétique : il décide
// de ce que l'interrogation MESURE.
//
//   'aucune'  — on enchaîne sans rien dire. C'est le devoir surveillé : l'élève
//               ne peut pas se corriger en cours de route, la note mesure ce
//               qu'il savait en entrant.
//   'reponse' — la bonne réponse s'affiche, sans commentaire. On apprend un peu
//               en composant, et surtout on ne repart pas avec une erreur en
//               tête pendant une heure.
//   'robot'   — la bonne réponse ET l'explication. C'est le devoir formatif :
//               on note, mais on enseigne à chaque question.
export const CORRECTIONS = { AUCUNE: 'aucune', REPONSE: 'reponse', ROBOT: 'robot' };

// --- ET CE QU'ELLE FAIT DE LA NOTE À LA FIN -----------------------------------
//
// Rémy : « à la fin on a une option pour donner la note ou non ».
//
//   'affichee'    — l'élève voit sa note. Le cas ordinaire.
//   'enregistree' — la note est calculée et gardée pour le professeur, mais
//                   l'élève ne la voit pas. Utile quand on veut mesurer sans
//                   décourager, ou rendre les copies en classe d'abord.
//   'aucune'      — on ne note pas du tout : l'interrogation ne sert qu'au
//                   bilan par compétence.
export const NOTES = { AFFICHEE: 'affichee', ENREGISTREE: 'enregistree', AUCUNE: 'aucune' };

export function defaultPolicy() {
    return {
        mode: MODES.ENTRAINEMENT,
        hints: true,
        maxAttemptsPerItem: 2,
        showCorrection: true,   // correction affichée juste après la réponse
        adaptive: true,         // biaise le tirage vers les notions faibles
        shuffleSteps: false,
        // L'ORDRE DES ÉTAPES EST-IL IMPOSÉ ?
        //
        // Rémy, sur l'écran de départ d'un parcours : « on peut appuyer sur le
        // bouton c'est parti ou sur le premier élément, ou sur les éléments
        // disponibles s'il n'y a pas d'obligation d'ordre. »
        //
        // Par défaut on impose l'ordre : le professeur a composé sa séance
        // dans celui où il veut qu'elle se fasse, et c'est aussi lui qui donne
        // leur sens aux jeux de récompense — « quatre exercices PUIS un jeu »
        // n'a plus de règle si l'on peut commencer par la fin. Mais un plan de
        // travail, une séance d'atelier ou une révision libre se choisissent :
        // le réglage existe, il est simplement décoché.
        ordreLibre: false,
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
        // CE QUI SE PASSE APRÈS CHAQUE RÉPONSE : voir CORRECTIONS ci-dessus.
        // Par défaut on montre la bonne réponse — c'est le régime le plus
        // fréquent en classe, et celui qui laisse le moins d'élèves repartir
        // avec une erreur installée.
        correction: CORRECTIONS.REPONSE,
        // `showCorrection` reste la forme booléenne que lit `itemSession` :
        // elle se déduit du réglage ci-dessus (voir `resolvePolicy`).
        showCorrection: true,
        adaptive: false,
        // ON NE REFAIT PAS UNE INTERROGATION. Rémy : « en mode interrogation,
        // il ne faut pas proposer à la fin de refaire l'exercice ». Une
        // évaluation qu'on recommence jusqu'à ce qu'elle tombe juste ne mesure
        // plus rien — et l'élève qui voit le bouton comprend, à juste titre,
        // que sa note ne comptait pas.
        allowRetryStep: false,
        grading: {
            scale: 20,              // note sur 20 ; null => compétences seules
            rule: 'firstTry',       // 'firstTry' | 'ratio' | 'ponderee'
            penalties: { hint: 0.25, retry: 0.5 },
            arrondi: 0.5,           // arrondi au demi-point
            showCalculation: true,  // montre à l'élève d'où sort sa note
            // À qui la note est-elle montrée : voir NOTES ci-dessus.
            note: NOTES.AFFICHEE
        },
        ...overrides
    };
}

/** L'interrogation explique-t-elle après chaque réponse ? */
export const corrigeAvecRobot = (policy) =>
    !!policy && policy.correction === CORRECTIONS.ROBOT;

/** La note doit-elle être MONTRÉE à l'élève à la fin ? */
export function noteVisible(policy) {
    const p = resolvePolicy(policy);
    if (!p.grading || !p.grading.scale) return false;
    return (p.grading.note || NOTES.AFFICHEE) === NOTES.AFFICHEE;
}

/** La note doit-elle être CALCULÉE (pour le professeur, même si cachée) ? */
export function noteCalculee(policy) {
    const p = resolvePolicy(policy);
    if (!p.grading || !p.grading.scale) return false;
    return (p.grading.note || NOTES.AFFICHEE) !== NOTES.AUCUNE;
}

/** Complète une politique partielle (stockée dans un parcours) avec les défauts. */
export function resolvePolicy(policy) {
    if (!policy) return defaultPolicy();
    const base = policy.mode === MODES.EVALUATION ? evaluationPolicy()
        : policy.mode === MODES.APPRENTISSAGE ? apprentissagePolicy()
            : defaultPolicy();
    const merged = { ...base, ...policy };
    if (policy.grading) merged.grading = { ...(base.grading || {}), ...policy.grading };
    // `correction` COMMANDE `showCorrection`, et non l'inverse : le réglage
    // qu'on écrit dans un parcours est le mot ('aucune' / 'reponse' / 'robot'),
    // le booléen n'est que la forme qu'attend `itemSession`. Les deux ne
    // peuvent donc pas se contredire — un parcours enregistré avant ce réglage
    // n'a pas de `correction` et garde son booléen tel quel.
    if (merged.correction) {
        merged.showCorrection = merged.correction !== CORRECTIONS.AUCUNE;
    }
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
