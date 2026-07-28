// Modèle de maîtrise et planification des révisions.
//
// L'ancien calcul (taux de réussite brut sur tout l'historique) traitait une
// notion travaillée il y a trois mois exactement comme celle d'hier. Deux
// corrections ici :
//
//  1. PONDÉRATION TEMPORELLE : chaque tentative pèse exp(-Δt / demi-vie).
//     Une notion non revue s'estompe, ce qui reflète l'oubli réel et évite
//     d'afficher "acquis" sur des acquis périmés.
//
//  2. BOÎTES DE LEITNER : chaque compétence avance d'une boîte à chaque série
//     de réussites, recule en cas d'échec. La boîte donne l'intervalle avant
//     la prochaine révision — c'est ce qui alimente les séances proposées
//     dans "Mon Parcours".
//
// Fonctions pures : (attempts, now) -> valeur. Testées dans tests/.

import { SKILLS, prereqChain } from '../data/skills.js';

export const HALF_LIFE_DAYS = 21;
export const RELIABLE_MIN_ATTEMPTS = 5;

// Intervalles de révision par boîte, en jours.
export const LEITNER_INTERVALS = [0, 1, 3, 7, 16, 35];
export const MAX_BOX = LEITNER_INTERVALS.length - 1;

export const LEVELS = {
    NA: { key: 'NA', label: 'Non acquis', short: 'NA', color: 'var(--danger)', min: 0 },
    EC: { key: 'EC', label: 'En cours d\'acquisition', short: 'EC', color: 'var(--warning)', min: 0.4 },
    A: { key: 'A', label: 'Acquis', short: 'A', color: 'var(--success)', min: 0.7 },
    E: { key: 'E', label: 'Expert', short: 'E', color: 'var(--primary)', min: 0.9 }
};

export function levelFor(mastery) {
    if (mastery >= LEVELS.E.min) return LEVELS.E;
    if (mastery >= LEVELS.A.min) return LEVELS.A;
    if (mastery >= LEVELS.EC.min) return LEVELS.EC;
    return LEVELS.NA;
}

const DAY = 86400000;

function decayWeight(ageMs) {
    return Math.pow(0.5, ageMs / (HALF_LIFE_DAYS * DAY));
}

/**
 * @param {Array} attempts - sortie de projections.computeAttempts()
 * @param {number} [now]
 * @returns {Map<string, Object>} skillId -> indicateurs
 */
export function computeMastery(attempts, now = Date.now()) {
    const map = new Map();

    const sorted = [...attempts].filter(a => a.skillId).sort((a, b) => a.ts - b.ts);

    for (const a of sorted) {
        const id = a.skillId;
        if (!map.has(id)) {
            map.set(id, {
                skillId: id,
                attempts: 0, correct: 0,
                wSum: 0, wCorrect: 0,
                streak: 0, box: 0,
                firstTs: a.ts, lastTs: a.ts,
                exerciseIds: new Set(),
                avgMs: 0, _msSum: 0, _msCount: 0
            });
        }
        const e = map.get(id);
        const w = decayWeight(now - a.ts);

        e.attempts++;
        e.wSum += w;
        // Seule une réussite du premier coup compte pleinement : réussir après
        // deux essais et l'élimination d'un distracteur n'est pas la même chose.
        const credit = a.correct ? (a.attemptIndex > 0 ? 0.5 : 1) : 0;
        if (a.correct) e.correct++;
        e.wCorrect += w * credit;

        if (a.correct && a.attemptIndex === 0) {
            e.streak++;
            e.box = Math.min(MAX_BOX, e.box + 1);
        } else if (!a.correct) {
            e.streak = 0;
            e.box = Math.max(0, e.box - 1); // on redescend d'un cran, pas à zéro
        }

        e.lastTs = a.ts;
        if (a.exerciseId) e.exerciseIds.add(a.exerciseId);
        if (a.msElapsed > 0) { e._msSum += a.msElapsed; e._msCount++; }
    }

    for (const e of map.values()) {
        e.exerciseIds = [...e.exerciseIds];
        e.successRate = e.attempts > 0 ? e.correct / e.attempts : 0;
        e.weightedRate = e.wSum > 0 ? e.wCorrect / e.wSum : 0;
        e.avgMs = e._msCount > 0 ? Math.round(e._msSum / e._msCount) : 0;
        delete e._msSum; delete e._msCount;

        // La confiance croît avec le nombre de tentatives récentes : avec deux
        // essais, on ne déclare pas une notion acquise.
        const confidence = Math.min(1, e.wSum / RELIABLE_MIN_ATTEMPTS);
        e.mastery = e.weightedRate * confidence;
        e.reliable = e.wSum >= RELIABLE_MIN_ATTEMPTS;
        e.level = levelFor(e.mastery);
        e.dueAt = e.lastTs + LEITNER_INTERVALS[e.box] * DAY;
        e.due = e.dueAt <= now;
        e.staleness = (now - e.lastTs) / DAY;
    }

    return map;
}

export function masteryOf(masteryMap, skillId) {
    const e = masteryMap.get(skillId);
    return e ? e.mastery : 0;
}

/** Compétences à réviser maintenant, les plus urgentes d'abord. */
export function dueSkills(masteryMap, now = Date.now(), limit = 8) {
    return [...masteryMap.values()]
        .filter(e => e.due && e.attempts > 0 && e.mastery < LEVELS.E.min)
        .sort((a, b) => (a.mastery - b.mastery) || (a.dueAt - b.dueAt))
        .slice(0, limit);
}

export function weakSkills(masteryMap, limit = 5) {
    return [...masteryMap.values()]
        .filter(e => e.reliable && e.mastery < LEVELS.A.min)
        .sort((a, b) => a.mastery - b.mastery)
        .slice(0, limit);
}

export function strongSkills(masteryMap, limit = 5) {
    return [...masteryMap.values()]
        .filter(e => e.reliable && e.mastery >= LEVELS.A.min)
        .sort((a, b) => b.mastery - a.mastery)
        .slice(0, limit);
}

/** Tables de multiplication à renforcer (biaise le tirage des générateurs). */
export function weakTables(masteryMap, limit = 3) {
    return weakSkills(masteryMap, 20)
        .map(e => /^num\.mult\.table\.(\d+)$/.exec(e.skillId))
        .filter(Boolean)
        .map(m => parseInt(m[1], 10))
        .slice(0, limit);
}

/**
 * Prochaine compétence à travailler. Deux cas, dans l'ordre :
 *  1. un prérequis non maîtrisé d'une notion en échec => remédiation en amont ;
 *  2. sinon, une notion dont tous les prérequis sont acquis => progression.
 * @returns {Array<{skillId, reason: 'remediation'|'revision'|'nouveau', score:number}>}
 */
export function recommendSkills(masteryMap, { niveaux = [], limit = 5 } = {}) {
    const out = [];
    const seen = new Set();
    const inScope = (s) => niveaux.length === 0 || (s.niveaux || []).some(n => niveaux.includes(n));
    const ACQUIS = LEVELS.A.min;

    // 1. Remédiation : on échoue sur X, un prérequis de X est fragile.
    for (const e of weakSkills(masteryMap, 20)) {
        for (const pid of prereqChain(e.skillId)) {
            const pm = masteryOf(masteryMap, pid);
            if (pm < ACQUIS && !seen.has(pid)) {
                seen.add(pid);
                out.push({ skillId: pid, reason: 'remediation', score: 1 - pm });
            }
        }
    }

    // 2. Révisions dues.
    for (const e of dueSkills(masteryMap, Date.now(), 20)) {
        if (seen.has(e.skillId)) continue;
        seen.add(e.skillId);
        out.push({ skillId: e.skillId, reason: 'revision', score: 0.9 - e.mastery });
    }

    // 3. Nouveautés dont les prérequis sont acquis.
    for (const s of Object.values(SKILLS)) {
        if (seen.has(s.id) || !inScope(s)) continue;
        const already = masteryMap.get(s.id);
        if (already && already.attempts > 0) continue;
        const ready = (s.prereqs || []).every(p => masteryOf(masteryMap, p) >= ACQUIS);
        if (!ready) continue;
        seen.add(s.id);
        out.push({ skillId: s.id, reason: 'nouveau', score: 0.5 });
    }

    return out.sort((a, b) => b.score - a.score).slice(0, limit);
}
