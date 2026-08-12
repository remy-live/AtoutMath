// Projections : vues dérivées du journal d'événements.
//
// Toutes les fonctions de ce module sont PURES (events -> valeur). Aucune
// lecture d'état global, aucune écriture. Trois conséquences :
//  - elles sont testables sans navigateur (voir tests/) ;
//  - elles sont rejouables : même journal => même résultat, toujours ;
//  - elles peuvent être réimplémentées à l'identique en PHP, ce qui permet au
//    serveur de recalculer score et notes sans faire confiance au client.

import { EventTypes } from './journal.js';

const A = EventTypes;

// Le score est la somme des points portés par les événements : points gagnés
// question par question (ATTEMPT), bonus explicites (BONUS) et total replié
// lors d'un compactage (SNAPSHOT). Il n'est jamais stocké.
export function computeScore(events) {
    let score = 0;
    for (const e of events) {
        score += (e.payload && e.payload.points) || 0;
    }
    return score;
}

export function computeTime(events) {
    let total = 0;
    const perExercise = {};
    for (const e of events) {
        if (e.type === A.TIME_SPENT) {
            const s = e.payload.seconds || 0;
            total += s;
            const id = e.payload.exerciseId || 'inconnu';
            perExercise[id] = (perExercise[id] || 0) + s;
        } else if (e.type === A.SNAPSHOT) {
            total += e.payload.seconds || 0;
        }
    }
    return { total, perExercise };
}

export function computeBadges(events) {
    const badges = {};
    for (const e of events) {
        if (e.type === A.BADGE_GRANTED && !badges[e.payload.badgeId]) {
            badges[e.payload.badgeId] = e.ts;
        }
    }
    return badges;
}

/** Toutes les tentatives, à plat, dans l'ordre chronologique. */
export function computeAttempts(events) {
    return events
        .filter(e => e.type === A.ATTEMPT)
        .map(e => ({ ...e.payload, ts: e.ts, eventId: e.id }));
}

export function countCorrect(events) {
    let n = 0;
    for (const e of events) {
        if (e.type === A.ATTEMPT && e.payload.correct) n++;
        else if (e.type === A.SNAPSHOT) n += e.payload.correct || 0;
    }
    return n;
}

/**
 * Compteurs d'exploits : ce qu'il faut savoir pour décerner les médailles.
 *
 * Rassemblés en une seule passe plutôt que calculés badge par badge : le
 * journal peut compter des dizaines de milliers d'événements, et le moteur de
 * médailles est appelé à chaque réponse.
 *
 * `serie` est la plus longue suite de bonnes réponses consécutives — la seule
 * mesure qui distingue « répond juste la moitié du temps » de « ne se trompe
 * plus ». `rapides` ne compte que les réponses justes obtenues en moins de
 * trois secondes : la vitesse sans la justesse ne vaut rien.
 */
export function computeExploits(events) {
    const jours = new Set(), exercices = new Set();
    let rapides = 0, serie = 0, courante = 0;
    for (const e of events) {
        if (e.type !== A.ATTEMPT) continue;
        const p = e.payload;
        jours.add(new Date(e.ts).toISOString().slice(0, 10));
        if (p.exerciseId) exercices.add(p.exerciseId);
        if (p.correct) {
            courante++;
            if (courante > serie) serie = courante;
            if (p.msElapsed > 0 && p.msElapsed < 3000) rapides++;
        } else courante = 0;
    }
    return { jours: jours.size, exercices: exercices.size, rapides, serie };
}

// Clé d'identité d'une question, pour regrouper les erreurs répétées sur le
// même item et savoir laquelle a été corrigée.
export function errorKeyOf(p) {
    return `${p.exerciseId || p.generatorId || '?'}|${p.itemSeed || p.questionText || '?'}`;
}

/**
 * Carnet d'erreurs : une entrée par question ratée, avec son statut.
 * Une erreur est "corrigée" si un ERROR_RESOLVED la vise, ou si l'élève a
 * depuis répondu juste à la même question du premier coup.
 */
export function computeErrors(events) {
    const map = new Map();
    const resolved = new Set();
    const dismissed = new Set();

    for (const e of events) {
        if (e.type === A.ERROR_RESOLVED) resolved.add(e.payload.errorKey);
        else if (e.type === A.ERROR_DISMISSED) dismissed.add(e.payload.errorKey);
    }

    for (const e of events) {
        if (e.type !== A.ATTEMPT) continue;
        const p = e.payload;
        const key = errorKeyOf(p);

        if (!p.correct) {
            const existing = map.get(key);
            if (existing) {
                existing.count++;
                existing.lastTs = e.ts;
                existing.given = p.given;
                existing.corrected = false; // une nouvelle faute rouvre l'erreur
            } else {
                map.set(key, {
                    key,
                    exerciseId: p.exerciseId,
                    exerciseTitle: p.exerciseTitle || p.exerciseId,
                    skillId: p.skillId || null,
                    generatorId: p.generatorId || null,
                    itemSeed: p.itemSeed || null,
                    questionText: p.questionText || '',
                    given: p.given,
                    expected: p.expected,
                    misconception: p.misconception || null,
                    explanation: p.explanation || '',
                    count: 1,
                    firstTs: e.ts,
                    lastTs: e.ts,
                    corrected: false
                });
            }
        } else if (map.has(key) && p.attemptIndex === 0) {
            // Réussie du premier coup après coup : l'erreur est réputée corrigée.
            map.get(key).corrected = true;
        }
    }

    return [...map.values()]
        .filter(err => !dismissed.has(err.key))
        .map(err => ({ ...err, corrected: err.corrected || resolved.has(err.key) }))
        .sort((a, b) => b.lastTs - a.lastTs);
}

export function openErrors(events) {
    return computeErrors(events).filter(e => !e.corrected);
}

/**
 * Reconstitue les sessions de travail (runs) et leurs tentatives, pour la
 * notation et le tableau de bord professeur.
 * @returns {Array<{runId, pathId, pathName, mode, startedAt, finishedAt, policy, attempts, steps}>}
 */
export function computeRuns(events) {
    const runs = new Map();
    const ensure = (runId) => {
        if (!runs.has(runId)) {
            runs.set(runId, {
                runId, pathId: null, pathName: '', mode: 'entrainement',
                startedAt: null, finishedAt: null, policy: null,
                attempts: [], steps: [], aborted: false
            });
        }
        return runs.get(runId);
    };

    for (const e of events) {
        const p = e.payload || {};
        if (e.type === A.RUN_STARTED) {
            const r = ensure(p.runId);
            r.pathId = p.pathId || null;
            r.pathName = p.pathName || '';
            r.mode = p.mode || 'entrainement';
            r.policy = p.policy || null;
            r.startedAt = e.ts;
        } else if (e.type === A.RUN_FINISHED) {
            const r = ensure(p.runId);
            r.finishedAt = e.ts;
            r.aborted = !!p.aborted;
        } else if (e.type === A.ATTEMPT && p.runId) {
            ensure(p.runId).attempts.push({ ...p, ts: e.ts });
        } else if (e.type === A.STEP_COMPLETED && p.runId) {
            ensure(p.runId).steps.push({ ...p, ts: e.ts });
        } else if (e.type === A.HINT_USED && p.runId) {
            const r = ensure(p.runId);
            const last = r.attempts[r.attempts.length - 1];
            if (last) last.hintsUsed = (last.hintsUsed || 0) + 1;
        }
    }

    return [...runs.values()].sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
}

export function latestFinishedRun(events, pathId = null) {
    return computeRuns(events).find(r => r.finishedAt && !r.aborted && (!pathId || r.pathId === pathId)) || null;
}

/** Parcours actuellement assigné à l'élève (dernier PATH_ASSIGNED gagne). */
export function computeAssignedPath(events) {
    let assigned = null;
    for (const e of events) {
        if (e.type === A.PATH_ASSIGNED) assigned = { ...e.payload, assignedAt: e.ts };
    }
    if (!assigned) return null;

    const done = new Set();
    // Le DÉTAIL de chaque étape, pas seulement « faite » : les jeux de
    // récompense s'ouvrent sur un TAUX de réussite, et « terminée » ne dit pas
    // à quel point. On garde le meilleur passage de chaque étape — un élève
    // qui recommence pour se rattraper doit voir son rattrapage compter.
    const resultats = {};
    for (const e of events) {
        if (e.type !== A.STEP_COMPLETED || e.payload.pathId !== assigned.pathId) continue;
        const { stepId, solved = 0, required = 1, passed } = e.payload;
        // `passed` absent = l'ancien marqueur « étape validée », émis par
        // state.markStudentPathStepCompleted et seulement quand elle l'est.
        // Seul un `passed: false` explicite — le runner sur un échec — ne
        // valide pas l'étape.
        if (passed !== false) done.add(stepId);
        const ancien = resultats[stepId];
        const taux = solved / Math.max(1, required);
        if (!ancien || taux > ancien.solved / Math.max(1, ancien.required)) {
            resultats[stepId] = { solved, required, passed: !!passed };
        }
    }
    return { ...assigned, completed: [...done], resultats };
}
