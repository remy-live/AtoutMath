// Statistiques de progression.
//
// Ce module ne calcule plus rien lui-même : il expose le modèle de maîtrise
// (js/core/mastery.js) sous la forme attendue par l'interface, en lisant les
// tentatives projetées depuis le journal. Il ne fait aucune écriture.
//
// La différence avec l'ancienne version : le taux affiché est pondéré par la
// date (une notion non revue s'estompe) et une compétence n'est jamais
// qualifiée tant que les tentatives récentes sont trop peu nombreuses.

import { state } from './state.js';
import { skillLabel } from '../data/skills.js';
import {
    computeMastery, weakSkills, strongSkills, weakTables, dueSkills,
    recommendSkills, RELIABLE_MIN_ATTEMPTS, LEVELS, levelFor
} from './mastery.js';

export { RELIABLE_MIN_ATTEMPTS, LEVELS, levelFor };

function currentMastery() {
    return state.masteryMap;
}

/** Vue à plat, triée par volume, pour l'affichage du profil. */
export function computeSkillStats() {
    return [...currentMastery().values()]
        .map(e => ({
            key: e.skillId,
            skillId: e.skillId,
            label: skillLabel(e.skillId),
            attempts: e.attempts,
            correct: e.correct,
            successRate: e.successRate,
            weightedRate: e.weightedRate,
            mastery: e.mastery,
            level: e.level,
            reliable: e.reliable,
            lastTimestamp: e.lastTs,
            avgMs: e.avgMs,
            due: e.due,
            box: e.box,
            exoIds: e.exerciseIds
        }))
        .sort((a, b) => b.attempts - a.attempts);
}

export function getWeakSkills(limit = 5) {
    return weakSkills(currentMastery(), limit).map(toLegacyShape);
}

export function getStrongSkills(limit = 5) {
    return strongSkills(currentMastery(), limit).map(toLegacyShape);
}

export function getDueSkills(limit = 8) {
    return dueSkills(currentMastery(), Date.now(), limit).map(toLegacyShape);
}

export function getRecommendations(options = {}) {
    return recommendSkills(currentMastery(), options);
}

/**
 * Tables de multiplication à renforcer. Appelée par les générateurs pour
 * biaiser le tirage vers ce que l'élève rate.
 */
export function getWeakTables(limit = 3) {
    return weakTables(currentMastery(), limit);
}

export function getTotalCorrectCount() {
    return state.correctCount;
}

function toLegacyShape(e) {
    return {
        key: e.skillId,
        skillId: e.skillId,
        label: skillLabel(e.skillId),
        attempts: e.attempts,
        correct: e.correct,
        successRate: e.successRate,
        mastery: e.mastery,
        level: e.level,
        reliable: e.reliable,
        due: e.due,
        exoIds: e.exerciseIds
    };
}
