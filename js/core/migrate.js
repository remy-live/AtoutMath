// Migration de l'ancien stockage (clés globales `atoutmath_*`, agrégats
// mutables) vers le journal d'événements namespacé par profil.
//
// Exécutée une seule fois par profil : un marqueur `migratedFrom` est posé
// dans le store du profil. Les anciennes clés ne sont PAS supprimées, pour
// pouvoir revenir en arrière si besoin.

import { EventTypes } from './journal.js';
import { uuid } from './ids.js';
import { deriveSkillFromLegacy } from './compat.js';

const LEGACY_KEYS = [
    'atoutmath_score', 'atoutmath_badges', 'atoutmath_errors', 'atoutmath_attempts',
    'atoutmath_teacherPaths', 'atoutmath_teacherFolders', 'atoutmath_timeTotal',
    'atoutmath_timePerGame', 'atoutmath_selectedNiveaux', 'atoutmath_studentPath'
];

async function readLegacy(key) {
    try {
        if (typeof localforage !== 'undefined') return await localforage.getItem(key);
        const raw = window.localStorage.getItem(key);
        return raw === null ? null : JSON.parse(raw);
    } catch (e) {
        return null;
    }
}

export async function hasLegacyData() {
    for (const k of LEGACY_KEYS) {
        const v = await readLegacy(k);
        if (v !== null && v !== undefined) return true;
    }
    return false;
}

/**
 * Convertit les anciens agrégats en événements et les renvoie.
 * @returns {Promise<{events: Array, content: Object}>}
 */
export async function buildMigrationEvents(profileId, deviceId) {
    const events = [];
    const push = (type, payload, ts) => events.push({
        id: uuid(), type, ts: ts || Date.now(), profileId, deviceId, payload, synced: false, migrated: true
    });

    const attempts = (await readLegacy('atoutmath_attempts')) || [];
    const errors = (await readLegacy('atoutmath_errors')) || [];
    const badges = (await readLegacy('atoutmath_badges')) || {};
    const score = parseInt(await readLegacy('atoutmath_score'), 10) || 0;
    const timeTotal = (await readLegacy('atoutmath_timeTotal')) || 0;
    const timePerGame = (await readLegacy('atoutmath_timePerGame')) || {};

    // Tentatives : conservées une à une, c'est l'historique le plus précieux.
    for (const a of attempts) {
        push(EventTypes.ATTEMPT, {
            exerciseId: a.exoId || null,
            skillId: deriveSkillFromLegacy(a) || (a.concept ? deriveSkillFromLegacy({ concept: a.concept }) : null),
            correct: !!a.correct,
            attemptIndex: 0,
            points: 0, // le score global est réinjecté séparément (voir plus bas)
            legacy: true
        }, a.timestamp);
    }

    // Erreurs : re-jouées comme des tentatives fausses, avec leur contexte.
    for (const err of errors) {
        const qd = err.questionData || {};
        push(EventTypes.ATTEMPT, {
            exerciseId: err.exoId || null,
            exerciseTitle: err.exoTitle || '',
            skillId: deriveSkillFromLegacy(qd),
            questionText: qd.questionText || '',
            given: qd.input !== undefined ? qd.input : err.userAnswer,
            expected: qd.expected,
            correct: false,
            attemptIndex: 0,
            points: 0,
            legacy: true
        }, err.timestamp);
        if (err.corrected) {
            push(EventTypes.ERROR_RESOLVED, {
                errorKey: `${err.exoId || '?'}|${qd.questionText || '?'}`
            }, (err.timestamp || Date.now()) + 1);
        }
    }

    for (const [badgeId, ts] of Object.entries(badges)) {
        push(EventTypes.BADGE_GRANTED, { badgeId }, typeof ts === 'number' ? ts : Date.now());
    }

    for (const [exerciseId, seconds] of Object.entries(timePerGame)) {
        if (seconds > 0) push(EventTypes.TIME_SPENT, { exerciseId, seconds }, Date.now());
    }
    const accounted = Object.values(timePerGame).reduce((s, v) => s + (v || 0), 0);
    if (timeTotal > accounted) {
        push(EventTypes.TIME_SPENT, { exerciseId: null, seconds: timeTotal - accounted }, Date.now());
    }

    // Le score n'est pas reconstituable tentative par tentative (les anciens
    // points n'étaient pas historisés) : on le réinjecte en un bonus unique.
    if (score > 0) {
        push(EventTypes.BONUS, { points: score, reason: 'migration', label: 'Progression antérieure' }, Date.now());
    }

    const content = {
        teacherPaths: (await readLegacy('atoutmath_teacherPaths')) || [],
        teacherFolders: (await readLegacy('atoutmath_teacherFolders')) || [],
        selectedNiveaux: (await readLegacy('atoutmath_selectedNiveaux')) || []
    };

    const studentPath = await readLegacy('atoutmath_studentPath');
    if (studentPath && Array.isArray(studentPath.steps) && studentPath.steps.length) {
        const pathId = 'legacy_' + uuid();
        push(EventTypes.PATH_ASSIGNED, {
            pathId,
            name: 'Parcours assigné',
            steps: studentPath.steps,
            policy: null,
            legacy: true
        }, Date.now() - 1000);
        for (const stepId of studentPath.completed || []) {
            push(EventTypes.STEP_COMPLETED, { pathId, stepId, legacy: true }, Date.now());
        }
    }

    events.sort((a, b) => a.ts - b.ts);
    return { events, content };
}
