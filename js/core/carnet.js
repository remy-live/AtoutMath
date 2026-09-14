// LE CARNET D'ERREURS : SEIZE FOIS LA MÊME QUESTION N'EST PAS SEIZE ERREURS.
//
// Rémy, capture à l'appui : le carnet affichait seize cartes identiques, toutes
// « 2 + 3 × 4 — ta réponse : 20, attendu : 14 », l'une sous l'autre, et la
// pastille du carnet annonçait « 26 à revoir ».
//
// D'OÙ VIENT LE DOUBLON. Le journal identifie une erreur par
// `exerciceId | graine`, et c'est le bon choix pour REJOUER une question : la
// graine refabrique l'énoncé au caractère près. Mais un générateur qui tire au
// hasard produit « 2 + 3 × 4 » sous seize graines différentes. Seize clés,
// seize entrées, un seul apprentissage à faire.
//
// CE N'ÉTAIT PAS QU'UN PROBLÈME DE PLACE. « Réviser 10 questions » construisait
// dix étapes à partir des dix premières clés ouvertes — c'est-à-dire, ici, dix
// fois le même calcul. L'élève révisait une chose en croyant en réviser dix.
//
// LA RÈGLE. Deux entrées sont la même question si elles viennent du même
// exercice, portent le MÊME ÉNONCÉ et attendent la MÊME RÉPONSE. Les trois
// ensemble, pas deux : « Quel est le périmètre ? » se répète d'une figure à
// l'autre, mais rarement avec le même résultat.
//
// ET SANS ÉNONCÉ, ON NE FUSIONNE PAS. Les questions qui ne vivent que dans leur
// dessin — un angle à mesurer, une figure à nommer — ont un `questionText` vide
// ou générique ; deux d'entre elles peuvent être aussi différentes que leurs
// figures. En l'absence de texte, chaque graine reste une erreur distincte.
//
// Module pur : ni DOM, ni journal. On lui passe des entrées, il les regroupe.

/**
 * L'IDENTITÉ D'UNE QUESTION, indépendante de la graine qui l'a tirée.
 *
 * Accepte les deux formes en circulation : celle du carnet
 * (`{exoId, questionData:{questionText, expected}}`) et celle des projections
 * (`{exerciseId, questionText, expected}`).
 *
 * @returns {string|null} `null` quand on ne peut pas conclure — sans énoncé,
 *   deux erreurs ne sont pas déclarées identiques.
 */
export function cleQuestion(err) {
    if (!err) return null;
    const q = err.questionData || err;
    const texte = String(q.questionText == null ? '' : q.questionText).trim();
    if (!texte) return null;
    const exo = err.exoId || err.exerciseId || '?';
    const attendu = q.expected == null ? '' : String(q.expected);
    return `${exo}|${texte}|${attendu}`;
}

/** La clé de journal d'une entrée, quelle que soit la forme reçue. */
export function idDe(err) {
    return (err && (err.id != null ? err.id : err.key)) || null;
}

/**
 * FUSIONNE LES ENTRÉES QUI POSENT LA MÊME QUESTION.
 *
 * Chaque entrée rendue garde la forme reçue, plus deux champs :
 *   `count` — combien de fois la question a été ratée, toutes graines confondues ;
 *   `ids`   — les clés de journal fusionnées, pour pouvoir toutes les corriger.
 *
 * On montre la réponse la PLUS RÉCENTE : c'est celle que l'élève reconnaîtra.
 * Et il suffit qu'une seule des entrées soit encore ouverte pour que la
 * question le reste — avoir réussi la version d'hier ne solde pas celle de ce
 * matin.
 */
export function fusionnerDoublons(erreurs) {
    const sortie = [];
    const index = new Map();
    (erreurs || []).forEach(err => {
        if (!err) return;
        const n = err.count || 1;
        const cle = cleQuestion(err);
        const deja = cle ? index.get(cle) : null;
        if (!deja) {
            const copie = { ...err, count: n, ids: [idDe(err)].filter(x => x != null) };
            if (cle) index.set(cle, copie);
            sortie.push(copie);
            return;
        }
        deja.count += n;
        const id = idDe(err);
        if (id != null) deja.ids.push(id);
        deja.corrected = !!deja.corrected && !!err.corrected;
        const quand = err.timestamp || err.lastTs || 0;
        if (quand > (deja.timestamp || deja.lastTs || 0)) {
            deja.timestamp = err.timestamp;
            deja.lastTs = err.lastTs;
            deja.userAnswer = err.userAnswer;
            deja.given = err.given;
            deja.questionData = err.questionData;
            deja.itemSeed = err.itemSeed;
        }
    });
    return sortie;
}

/**
 * LE CARNET, RANGÉ PAR EXERCICE.
 *
 * Rémy : « comme tu les encadres, tu pourrais mettre un bouton Réviser ce
 * chapitre ». Le cadre existait déjà mais ne servait qu'à décorer : il devient
 * une unité de travail, avec son compte et son bouton.
 *
 * `aReviser` ne retient qu'UNE clé par question — celle qu'on rejouera — quand
 * `toutesLesCles` les porte toutes, pour que réussir la révision solde aussi
 * les quinze graines jumelles.
 */
export function grouperParExercice(erreurs) {
    const map = new Map();
    fusionnerDoublons(erreurs).forEach(err => {
        const titre = err.exoTitle || err.exerciseTitle || 'Autre';
        if (!map.has(titre)) {
            map.set(titre, {
                titre,
                exoId: err.exoId || err.exerciseId || null,
                ouvertes: [], corrigees: []
            });
        }
        const g = map.get(titre);
        (err.corrected ? g.corrigees : g.ouvertes).push(err);
    });
    return [...map.values()].map(g => ({
        ...g,
        // Les familles : une par question ouverte, chacune avec toutes ses clés.
        familles: g.ouvertes.map(e => e.ids).filter(f => f.length)
    }));
}

/** Les questions encore ouvertes, doublons fusionnés — le seul compte honnête. */
export function questionsOuvertes(erreurs) {
    return fusionnerDoublons(erreurs).filter(e => !e.corrected);
}
