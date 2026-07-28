// Remédiation : transformer un constat d'échec en séance de travail.
//
// Quatre points d'entrée, tous produisant un parcours d'entraînement classique
// (donc joué par le même moteur, tracé de la même façon) :
//
//   startRemediation(questions)  — rejouer les questions ratées d'un bilan
//   startErrorReview()           — le carnet d'erreurs complet
//   startSkillSession(skillId)   — travailler une compétence précise
//   startRecommendedSession()    — la séance conseillée par le modèle de maîtrise
//
// Le principe commun : chaque question ratée est rejouée À L'IDENTIQUE grâce à
// sa graine, puis suivie d'une question du même type. Refaire exactement la
// question ratée est ce qui permet à l'élève de constater qu'il sait faire ;
// enchaîner sur une variante est ce qui vérifie qu'il a compris, et pas retenu.

import { state } from './state.js';
import { makePath, makeStep } from './path.js';
import { defaultPolicy } from './policy.js';
import { exercisesForSkill, getExerciseById } from '../data/catalog.js';
import { openErrors } from './projections.js';
import { journal } from './journal.js';
import { skillLabel, prereqChain } from '../data/skills.js';
import { getRecommendations } from './stats.js';

const REVISION_POLICY = {
    ...defaultPolicy(),
    maxAttemptsPerItem: 3,   // en remédiation, on laisse plus de place à l'essai
    hints: true,
    showCorrection: true,
    adaptive: true
};

async function run(path, opts = {}) {
    if (!path.steps.length) return false;
    const { Runner } = await import('./runner.js');
    const runner = new Runner({ path, deviceMode: 'none', ...opts });
    return runner.start();
}

/** Rejoue les questions ratées d'un bilan, à l'identique puis en variante. */
export function startRemediation(questions) {
    const steps = [];
    for (const q of (questions || []).slice(0, 8)) {
        const exoId = exerciseForQuestion(q);
        if (!exoId) continue;
        steps.push(makeStep(exoId, {}, {
            nbItems: 2,        // la question ratée, puis une similaire
            threshold: 2,
            forceSeed: q.seed || null
        }));
    }
    const path = makePath('Remédiation', steps, REVISION_POLICY);
    return run(path);
}

/** Séance à partir du carnet d'erreurs (bouton « Plan de révisions »). */
export function startErrorReview(limit = 6) {
    const errors = openErrors(journal.all()).slice(0, limit);
    const steps = errors.map(err => {
        const exoId = err.exerciseId && getExerciseById(err.exerciseId)
            ? err.exerciseId
            : firstExerciseForSkill(err.skillId);
        if (!exoId) return null;
        return makeStep(exoId, {}, { nbItems: 2, threshold: 2, forceSeed: err.itemSeed || null });
    }).filter(Boolean);

    if (!steps.length) return Promise.resolve(false);

    const path = makePath('Plan de révisions', steps, REVISION_POLICY);
    // Une erreur rejouée avec succès sort du carnet.
    return run(path, {
        onExit: () => {
            errors.forEach(err => {
                const fixed = state.attemptHistory.some(a =>
                    a.itemSeed && a.itemSeed === err.itemSeed && a.correct && a.attemptIndex === 0);
                if (fixed) state.markErrorCorrected(err.key);
            });
            import('../ui/navigation.js').then(m => m.setTopNavMode('profile'));
        }
    });
}

/**
 * Travaille une compétence. Si elle est très fragile, on insère d'abord son
 * prérequis le plus faible : c'est la différence entre « refaire la même chose
 * en espérant que ça rentre » et remonter à la cause.
 */
export function startSkillSession(skillId, { includePrereq = true } = {}) {
    const steps = [];

    if (includePrereq) {
        const chain = prereqChain(skillId);
        const weakest = chain
            .map(id => ({ id, m: masteryValue(id) }))
            .filter(x => x.m < 0.7)
            .sort((a, b) => a.m - b.m)[0];
        if (weakest) {
            const exoId = firstExerciseForSkill(weakest.id);
            if (exoId) steps.push(makeStep(exoId, {}, { nbItems: 5, threshold: 4 }));
        }
    }

    const exoId = firstExerciseForSkill(skillId);
    if (exoId) steps.push(makeStep(exoId, {}, { nbItems: 8, threshold: 6 }));

    if (!steps.length) return Promise.resolve(false);
    return run(makePath(`Réviser : ${skillLabel(skillId)}`, steps, REVISION_POLICY));
}

/** Séance du jour, construite à partir du modèle de maîtrise. */
export function startRecommendedSession(limit = 3) {
    const recos = getRecommendations({ niveaux: state.selectedNiveaux, limit });
    const steps = recos.map(r => {
        const exoId = firstExerciseForSkill(r.skillId);
        if (!exoId) return null;
        const nb = r.reason === 'nouveau' ? 6 : 5;
        return makeStep(exoId, {}, { nbItems: nb, threshold: Math.ceil(nb * 0.7) });
    }).filter(Boolean);

    if (!steps.length) return Promise.resolve(false);
    return run(makePath('Séance conseillée', steps, REVISION_POLICY));
}

export function buildRecommendedPreview(limit = 3) {
    return getRecommendations({ niveaux: state.selectedNiveaux, limit })
        .filter(r => firstExerciseForSkill(r.skillId))
        .map(r => ({
            ...r,
            label: skillLabel(r.skillId),
            exerciseId: firstExerciseForSkill(r.skillId),
            motif: { remediation: 'Prérequis à consolider', revision: 'À revoir', nouveau: 'Nouveau' }[r.reason]
        }));
}

// --- Utilitaires ------------------------------------------------------------

function masteryValue(skillId) {
    const e = state.masteryMap.get(skillId);
    return e ? e.mastery : 0;
}

function firstExerciseForSkill(skillId) {
    if (!skillId) return null;
    const list = exercisesForSkill(skillId);
    if (!list.length) return null;
    // On privilégie un exercice non chronométré : en remédiation, la pression
    // temporelle nuit à la compréhension.
    const calm = list.find(e => !(e.params && e.params.timeLimit));
    return (calm || list[0]).id;
}

function exerciseForQuestion(q) {
    if (q.exerciseId && getExerciseById(q.exerciseId)) return q.exerciseId;
    return firstExerciseForSkill(q.skillId);
}
