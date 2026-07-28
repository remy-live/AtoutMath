// Façade d'état de l'application.
//
// `state` n'est plus le propriétaire des données : c'est une vue pratique
// au-dessus de trois couches distinctes, qu'il ne faut plus confondre.
//
//   session  — état d'interface, jamais persisté (navStack, recherche, mode…)
//   progrès  — dérivé du journal d'événements, jamais écrit directement
//   contenu  — documents du professeur (parcours, dossiers), persistés tels quels
//
// Les propriétés de progression (`score`, `errorHistory`, `attemptHistory`,
// `badges`, `timeSpent*`, `studentPath`) sont des GETTERS calculés à la volée
// et mémoïsés jusqu'au prochain événement. Écrire `state.score = 10` n'a donc
// aucun effet : il faut émettre un événement.

import { LocalStore } from './store.js';
import { journal, EventTypes } from './journal.js';
import { initIdentity, getActiveProfileId, getDeviceId, namespaceFor } from './profile.js';
import {
    computeScore, computeTime, computeBadges, computeAttempts, computeErrors,
    countCorrect, computeAssignedPath, errorKeyOf
} from './projections.js';
import { computeMastery } from './mastery.js';
import { conceptToSkill, deriveSkillFromLegacy } from './compat.js';

let profileStore = null;

// --- Mémoïsation des projections -------------------------------------------
// Recalculer les projections à chaque lecture serait correct mais coûteux :
// `state.score` est lu à chaque rendu. On invalide sur événement.
const cache = new Map();
function memo(key, fn) {
    if (!cache.has(key)) cache.set(key, fn());
    return cache.get(key);
}
function invalidate() {
    cache.clear();
}
document.addEventListener('journal_appended', invalidate);
document.addEventListener('journal_merged', invalidate);

export const state = {
    // --- Session (transitoire, non persisté) ---
    // Parcours en cours d'édition (format v2 : étapes = références + surcharges).
    currentPath: { id: null, version: 2, name: 'Mon Parcours', policy: null, steps: [] },
    currentPathId: null,
    isTeacherMode: false,
    isMobileView: false,
    activeExo: null,
    activeSequenceRunner: null,
    previewDeviceMode: 'mobile',
    deviceMode: 'desktop',
    navStack: [],
    searchQuery: '',
    // Filtre d'état de publication du catalogue : 'tout' | 'valide' | 'test'
    // | 'brouillon'. Outil d'auteur, persisté par confort entre deux sessions.
    catalogFilter: 'tout',
    /**
     * Contexte de la question en cours, posé par le moteur de parcours avant
     * chaque item. Il permet aux jeux historiques — qui appellent encore
     * `state.celebrate()` / `state.logError()` sans rien savoir du parcours —
     * de produire des tentatives correctement rattachées au run, à l'étape et
     * à la compétence travaillée.
     */
    attemptContext: null,

    // --- Contenu professeur (persisté tel quel) ---
    teacherPaths: [],
    teacherFolders: [],
    selectedNiveaux: [],

    // --- Progression (dérivée du journal, lecture seule) ---
    get score() { return memo('score', () => computeScore(journal.all())); },
    get badges() { return memo('badges', () => computeBadges(journal.all())); },
    get attemptHistory() { return memo('attempts', () => computeAttempts(journal.all())); },
    get errorHistory() {
        // Forme compatible avec l'ancien carnet d'erreurs consommé par l'UI.
        return memo('errors', () => computeErrors(journal.all()).map(e => ({
            id: e.key,
            exoId: e.exerciseId,
            exoTitle: e.exerciseTitle,
            skillId: e.skillId,
            timestamp: e.lastTs,
            corrected: e.corrected,
            count: e.count,
            userAnswer: e.given,
            questionData: {
                isStandardized: true,
                questionText: e.questionText,
                input: e.given,
                expected: e.expected,
                customMessage: e.explanation || '',
                misconception: e.misconception,
                skillId: e.skillId,
                itemSeed: e.itemSeed,
                generatorId: e.generatorId
            }
        })));
    },
    get masteryMap() { return memo('mastery', () => computeMastery(this.attemptHistory)); },
    get timeSpentTotal() { return memo('time', () => computeTime(journal.all())).total; },
    get timeSpentPerGame() { return memo('time', () => computeTime(journal.all())).perExercise; },
    get studentPath() { return memo('assigned', () => computeAssignedPath(journal.all())); },
    get correctCount() { return memo('correct', () => countCorrect(journal.all())); },

    // --- Cycle de vie -------------------------------------------------------

    async load() {
        const { profileId, deviceId } = await initIdentity();
        profileStore = new LocalStore(namespaceFor(profileId));

        await journal.load(profileStore, { profileId, deviceId });

        // Migration unique de l'ancien stockage global.
        const alreadyMigrated = await profileStore.get('migratedFrom');
        if (!alreadyMigrated) {
            const { hasLegacyData, buildMigrationEvents } = await import('./migrate.js');
            if (await hasLegacyData()) {
                const { events, content } = await buildMigrationEvents(profileId, deviceId);
                journal.merge(events.map(e => ({ ...e, synced: false })));
                if (content.teacherPaths.length) await profileStore.set('teacherPaths', content.teacherPaths);
                if (content.teacherFolders.length) await profileStore.set('teacherFolders', content.teacherFolders);
                if (content.selectedNiveaux.length) await profileStore.set('selectedNiveaux', content.selectedNiveaux);
                console.info(`[migration] ${events.length} événements repris depuis l'ancien stockage.`);
            }
            await profileStore.set('migratedFrom', { at: Date.now(), version: 1 });
        }

        this.teacherPaths = (await profileStore.get('teacherPaths', [])) || [];
        this.teacherFolders = (await profileStore.get('teacherFolders', [])) || [];
        this.selectedNiveaux = (await profileStore.get('selectedNiveaux', [])) || [];
        this.catalogFilter = (await profileStore.get('catalogFilter', 'tout')) || 'tout';

        journal.compact();
        invalidate();
        this._announce();
    },

    _announce() {
        ['score_updated', 'badges_updated', 'errors_updated', 'attempts_updated',
            'teacherPaths_updated', 'teacherFolders_updated', 'time_updated',
            'studentPath_updated'].forEach(evt => document.dispatchEvent(new CustomEvent(evt)));
    },

    getStore() {
        return profileStore;
    },

    /** Recharge tout après un changement de profil. */
    async switchProfile(profileId) {
        const { setActiveProfile } = await import('./profile.js');
        await journal.flush();
        if (!(await setActiveProfile(profileId))) return false;
        cache.clear();
        await this.load();
        return true;
    },

    // --- Écritures : tout passe par un événement ----------------------------

    /**
     * Enregistre une tentative. C'est LE point d'entrée de la progression :
     * score, carnet d'erreurs, maîtrise et notes en découlent tous.
     * @param {Object} a
     * @param {boolean} a.correct
     * @param {string} [a.skillId]
     * @param {number} [a.points]
     * @param {number} [a.attemptIndex] - 0 pour le premier essai sur l'item
     */
    recordAttempt(a) {
        const ctx = this.attemptContext || {};
        const exo = this.activeExo;
        const payload = {
            runId: ctx.runId || null,
            stepId: ctx.stepId || null,
            exerciseId: a.exerciseId || ctx.exerciseId || (exo ? exo.id : null),
            exerciseTitle: a.exerciseTitle || ctx.exerciseTitle || (exo ? exo.title : ''),
            generatorId: a.generatorId || ctx.generatorId || null,
            activityId: a.activityId || ctx.activityId || null,
            skillId: a.skillId || ctx.skillId || null,
            itemSeed: a.itemSeed || ctx.itemSeed || null,
            questionText: a.questionText !== undefined ? a.questionText : (ctx.questionText || ''),
            given: a.given,
            expected: a.expected !== undefined ? a.expected : ctx.expected,
            correct: !!a.correct,
            attemptIndex: a.attemptIndex || 0,
            msElapsed: a.msElapsed || (ctx.startedAt ? Date.now() - ctx.startedAt : 0),
            hintsUsed: a.hintsUsed || ctx.hintsUsed || 0,
            misconception: a.misconception || null,
            explanation: a.explanation || '',
            points: a.points || 0
        };
        journal.emit(EventTypes.ATTEMPT, payload);
        invalidate();
        document.dispatchEvent(new CustomEvent('attempts_updated'));
        if (payload.points) document.dispatchEvent(new CustomEvent('score_updated'));
        if (!payload.correct) document.dispatchEvent(new CustomEvent('errors_updated'));

        // Le moteur de parcours suit la progression de l'étape en cours.
        const runner = this.activeSequenceRunner;
        if (runner) {
            if (typeof runner.onAttempt === 'function') runner.onAttempt(payload);
            else if (typeof runner.onGameAction === 'function') runner.onGameAction(payload.correct);
        }
        return payload;
    },

    /** Points hors question (récompense, migration). */
    addScore(points) {
        if (!points) return;
        journal.emit(EventTypes.BONUS, { points, reason: 'bonus' });
        invalidate();
        document.dispatchEvent(new CustomEvent('score_updated'));
    },

    addTime(exerciseId, seconds) {
        if (!seconds || seconds <= 0) return;
        journal.emit(EventTypes.TIME_SPENT, { exerciseId, seconds });
        invalidate();
        document.dispatchEvent(new CustomEvent('time_updated'));
    },

    grantBadge(badgeId) {
        if (this.badges[badgeId]) return;
        journal.emit(EventTypes.BADGE_GRANTED, { badgeId });
        invalidate();
        document.dispatchEvent(new CustomEvent('badges_updated'));
        document.dispatchEvent(new CustomEvent('badge_unlocked', { detail: badgeId }));
    },

    noteHintUsed() {
        if (this.attemptContext) {
            this.attemptContext.hintsUsed = (this.attemptContext.hintsUsed || 0) + 1;
        }
        journal.emit(EventTypes.HINT_USED, {
            runId: this.attemptContext ? this.attemptContext.runId : null,
            skillId: this.attemptContext ? this.attemptContext.skillId : null
        });
        invalidate();
    },

    async setSelectedNiveaux(niveaux) {
        this.selectedNiveaux = niveaux;
        if (profileStore) await profileStore.set('selectedNiveaux', niveaux);
    },

    async setCatalogFilter(filter) {
        this.catalogFilter = filter;
        if (profileStore) await profileStore.set('catalogFilter', filter);
    },

    // --- Parcours assigné ---------------------------------------------------

    setStudentPath(steps, meta = {}) {
        const pathId = meta.pathId || 'path_' + Date.now();
        journal.emit(EventTypes.PATH_ASSIGNED, {
            pathId,
            name: meta.name || 'Parcours assigné',
            code: meta.code || null,
            policy: meta.policy || null,
            steps: steps.map((s, i) => ({ ...s, stepId: s.stepId || `${pathId}_s${i}` }))
        });
        invalidate();
        document.dispatchEvent(new CustomEvent('studentPath_updated'));
    },

    markStudentPathStepCompleted(stepId, extra = {}) {
        const path = this.studentPath;
        if (!path || (path.completed || []).includes(stepId)) return;
        journal.emit(EventTypes.STEP_COMPLETED, { pathId: path.pathId, stepId, ...extra });
        invalidate();
        document.dispatchEvent(new CustomEvent('studentPath_updated'));
    },

    // --- Carnet d'erreurs ---------------------------------------------------

    markErrorCorrected(errorKey) {
        journal.emit(EventTypes.ERROR_RESOLVED, { errorKey });
        invalidate();
        document.dispatchEvent(new CustomEvent('errors_updated'));
        document.dispatchEvent(new CustomEvent('error_corrected', { detail: errorKey }));
    },

    removeError(errorKey) {
        journal.emit(EventTypes.ERROR_DISMISSED, { errorKey });
        invalidate();
        document.dispatchEvent(new CustomEvent('errors_updated'));
    },

    saveErrors() { /* conservé pour compatibilité : plus rien à sauvegarder */ },

    // --- Compatibilité avec les moteurs de jeu historiques ------------------

    showFeedback(msg, isError = true) {
        document.dispatchEvent(new CustomEvent('game_feedback', { detail: { msg, isError } }));
    },

    /**
     * Ancien point d'entrée « bonne réponse ». Ne fait plus de DOM : l'effet
     * visuel est rendu par js/ui/gameFeedbackUI.js, seul responsable de l'UI.
     */
    celebrate(element, points = 10, concept = null) {
        const skillId = conceptToSkill(concept);
        this.recordAttempt({ correct: true, points, skillId, given: undefined });
        document.dispatchEvent(new CustomEvent('game_feedback', {
            detail: { kind: 'success', points, element }
        }));
    },

    /** Ancien point d'entrée « mauvaise réponse ». */
    logError(exo, questionData, userAnswer) {
        const qd = questionData || {};
        this.recordAttempt({
            correct: false,
            exerciseId: exo ? exo.id : undefined,
            exerciseTitle: exo ? exo.title : undefined,
            skillId: deriveSkillFromLegacy(qd),
            questionText: qd.questionText,
            given: qd.input !== undefined ? qd.input : userAnswer,
            expected: qd.expected,
            explanation: qd.customMessage || '',
            misconception: qd.misconception || null
        });
    },

    /** Ancien point d'entrée statistiques. */
    logAttempt(correct, concept = null) {
        this.recordAttempt({ correct, skillId: conceptToSkill(concept) });
    },

    // --- Contenu professeur -------------------------------------------------
    // Les parcours et dossiers ne sont pas de la progression : ce sont des
    // documents éditables. Ils restent stockés tels quels (namespacés par
    // profil), et non dans le journal.

    saveTeacherPath(name, pathData, folderId = 'root') {
        const newPath = {
            id: 'path_' + Date.now(),
            name,
            data: pathData,
            folderId,
            timestamp: Date.now()
        };
        this.teacherPaths.unshift(newPath);
        this.saveTeacherPaths();
        return newPath;
    },

    updateTeacherPath(id, name, pathData) {
        const p = this.teacherPaths.find(x => x.id === id);
        if (!p) return;
        if (name) p.name = name;
        if (pathData) p.data = pathData;
        p.timestamp = Date.now();
        this.saveTeacherPaths();
    },

    moveTeacherPath(pathId, folderId) {
        const p = this.teacherPaths.find(x => x.id === pathId);
        if (!p) return;
        p.folderId = folderId;
        p.timestamp = Date.now();
        this.saveTeacherPaths();
    },

    removeTeacherPath(id) {
        this.teacherPaths = this.teacherPaths.filter(p => p.id !== id);
        this.saveTeacherPaths();
    },

    saveTeacherPaths() {
        if (profileStore) profileStore.set('teacherPaths', this.teacherPaths);
        document.dispatchEvent(new CustomEvent('teacherPaths_updated'));
    },

    addTeacherFolder(name) {
        const folder = { id: 'folder_' + Date.now(), name, timestamp: Date.now() };
        this.teacherFolders.push(folder);
        this.saveTeacherFolders();
        return folder;
    },

    renameTeacherFolder(id, name) {
        const f = this.teacherFolders.find(x => x.id === id);
        if (!f) return;
        f.name = name;
        f.timestamp = Date.now();
        this.saveTeacherFolders();
    },

    removeTeacherFolder(id) {
        this.teacherFolders = this.teacherFolders.filter(f => f.id !== id);
        this.teacherPaths.forEach(p => { if (p.folderId === id) p.folderId = 'root'; });
        this.saveTeacherFolders();
        this.saveTeacherPaths();
    },

    saveTeacherFolders() {
        if (profileStore) profileStore.set('teacherFolders', this.teacherFolders);
        document.dispatchEvent(new CustomEvent('teacherFolders_updated'));
    }
};

// Exposé pour le débogage en console ; aucun code applicatif ne doit s'en servir.
if (typeof window !== 'undefined') {
    window.__atoutmath = { state, journal, errorKeyOf, getActiveProfileId, getDeviceId };
}
