// OUBLIER UNE SÉANCE, SUR ORDRE DU PROFESSEUR.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « j'ai créé un élève virtuel dans la classe puis je réinitialise la
// séance depuis mon poste comme s'il ne l'avait jamais commencée ».
//
// ── POURQUOI CETTE RÈGLE VIT DANS SON PROPRE MODULE ────────────────────────
//
// C'est le SEUL endroit du logiciel qui décide de retirer des événements. Tout
// le reste n'en ajoute jamais que. Une règle qui efface se relit, s'éprouve
// sans navigateur, et se garde par des épreuves qu'on a vues tomber — pas une
// condition glissée au milieu d'une fonction de synchronisation.
//
// ── CE QU'IL FAUT OUBLIER, ET QUI NE SE DEVINE PAS D'UN COUP D'ŒIL ────────
//
// Un `step_completed` porte le parcours. Une TENTATIVE, non : elle ne porte que
// son `runId`. Oublier « ce qui porte ce parcours » laisserait donc derrière
// soi toutes les réponses de l'élève — son carnet d'erreurs continuerait de
// citer des questions d'une séance qu'il n'a « jamais commencée ».
//
// ON PROCÈDE DONC EN DEUX TEMPS, exactement comme le serveur :
//   1. quels RUNS appartiennent à ce parcours ? (`run_started` les nomme)
//   2. on oublie ces runs entiers, PLUS ce qui cite le parcours directement.
//
// ── ET LA BORNE DE TEMPS ──────────────────────────────────────────────────
//
// Chaque ordre porte l'heure à laquelle il a été donné. On n'oublie que ce qui
// la PRÉCÈDE : un élève remis à zéro à 9 h 10 qui recommence à 9 h 12 garde son
// nouveau travail, même si l'ordre lui parvient à 9 h 15. Sans cette borne, un
// ordre rejoué effacerait le travail qu'il venait de faire.

import { EventTypes } from './journal.js';

/**
 * LES ÉVÉNEMENTS À RETIRER DU JOURNAL.
 *
 * @param {Array} evenements  le journal complet
 * @param {Array<{pathId: string, le: number}>} oublis  les ordres du serveur
 * @returns {Set<string>} les identifiants d'événements à oublier
 */
export function evenementsAOublier(evenements, oublis) {
    const ordres = (Array.isArray(oublis) ? oublis : [])
        .filter(o => o && o.pathId)
        // LE PLUS RÉCENT L'EMPORTE pour un même parcours : deux remises à zéro
        // ne se contredisent pas, la seconde englobe la première.
        .reduce((m, o) => {
            const le = Number(o.le) || 0;
            if (!m.has(o.pathId) || m.get(o.pathId) < le) m.set(o.pathId, le);
            return m;
        }, new Map());
    if (!ordres.size) return new Set();

    const liste = Array.isArray(evenements) ? evenements : [];

    // 1. LES RUNS DE CES PARCOURS, et jusqu'à quelle heure on les oublie.
    const runs = new Map();
    for (const e of liste) {
        if (!e || e.type !== EventTypes.RUN_STARTED) continue;
        const p = e.payload || {};
        if (!p.runId || !ordres.has(p.pathId)) continue;
        // ON BORNE SUR LE DÉBUT DU RUN, et non sur chacun de ses événements :
        // un run commencé à 9 h 05 et fini à 9 h 20, remis à zéro à 9 h 10,
        // s'oublie ENTIER. Garder la moitié d'un run donnerait un bilan qui
        // compte des réponses sans la séance qui les a posées.
        if ((Number(e.ts) || 0) <= ordres.get(p.pathId)) runs.set(p.runId, true);
    }

    // 2. CE QUI APPARTIENT À CES RUNS, plus ce qui cite le parcours lui-même.
    const aOublier = new Set();
    for (const e of liste) {
        if (!e || !e.id) continue;
        const p = e.payload || {};
        if (p.runId && runs.has(p.runId)) { aOublier.add(e.id); continue; }
        if (p.pathId && ordres.has(p.pathId)
            && (Number(e.ts) || 0) <= ordres.get(p.pathId)) {
            aOublier.add(e.id);
        }
    }
    return aOublier;
}

/**
 * APPLIQUE LES ORDRES AU JOURNAL.
 *
 * @returns {number} combien d'événements ont été oubliés
 */
export function appliquerLesOublis(journal, oublis) {
    if (!journal || typeof journal.oublier !== 'function') return 0;
    const ids = evenementsAOublier(journal.all(), oublis);
    if (!ids.size) return 0;
    return journal.oublier(e => ids.has(e.id));
}
