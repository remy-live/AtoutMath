// LE BILAN D'UNE SÉANCE — ce qu'ils ont compris CETTE HEURE-LÀ.
//
// Rémy : « et donc pour le moment le bilan par classe, c'est tout ce qu'ils ont
// fait donc ça pourra être très lourd ».
//
// C'est exact, et ce n'est pas seulement une question de poids. `bilanClasse`
// lit tout le journal depuis toujours : en mai, une classe de vingt-six élèves
// affiche quarante colonnes de compétences mêlant octobre et avril. Le tableau
// devient illisible — mais surtout, il ne répond plus à la question qu'on se
// pose en sortant de la salle : « qu'est-ce qui n'est pas passé, aujourd'hui ? »
//
// UNE SÉANCE EST UNE FENÊTRE, ET LE JOURNAL SAIT DÉJÀ LA DÉCOUPER.
//
// La règle existait, elle n'était branchée que sur la note : `comptePourLaNote`
// dit si un horodatage tombe dans la fenêtre de la séance. Il suffisait de la
// faire servir aussi au bilan. On restreint donc sur DEUX critères, et pas un
// seul :
//
//   · LE PARCOURS — le `pathId` de la séance. Sans lui, l'élève qui s'entraîne
//     aux fractions pendant l'heure de géométrie ferait remonter une colonne
//     « fractions » dans le bilan de la séance.
//   · LA FENÊTRE — entre l'ouverture et la clôture. Sans elle, la révision de
//     mai viendrait se mélanger au contrôle d'octobre sur le même parcours.
//
// LE RUN EST L'UNITÉ, PAS L'ÉVÉNEMENT. On garde les événements d'un run, ou
// aucun — jamais la moitié. C'est ce qui permet à `computeRuns` de dire ensuite
// si l'élève est ALLÉ AU BOUT : un run amputé de son RUN_FINISHED se lit comme
// un abandon, et l'on afficherait « arrêté en chemin » à un élève qui a tout
// fini. Un découpage qui ment est pire qu'un tableau trop long.
//
// CE MODULE NE CALCULE PAS DE BILAN : il TAILLE une liste d'événements, puis
// passe le relais à `bilan.js`. Un seul calcul de maîtrise dans l'application,
// et c'est celui qui est déjà testé.

import { comptePourLaNote } from './seances.js';
import { bilanEleve, bilanClasse, signauxDe } from './bilan.js';
import { EventTypes as A } from './journal.js';

/** Les exercices que cette séance a réellement proposés. */
export function exercicesDe(seance) {
    const steps = (seance && seance.path && seance.path.steps) || [];
    return new Set(steps.map(s => s.exerciseId).filter(Boolean));
}

/**
 * LES RUNS QUI SONT CETTE SÉANCE — le parcours ET la fenêtre.
 *
 * On décide sur le RUN_STARTED : c'est lui qui porte le `pathId`, et c'est son
 * horodatage qui dit quand l'élève s'y est mis. Le reste du run suit, même si
 * l'élève finit après la clôture — il a bien travaillé pendant la séance, il a
 * seulement mis du temps. (La NOTE, elle, se ferme à la clôture : c'est une
 * autre règle, et elle vit dans `comptePourLaNote`.)
 */
export function runsDeLaSeance(seance, evenements = []) {
    if (!seance) return new Set();
    const pathId = seance.pathId || (seance.path && seance.path.id) || null;
    const gardes = new Set();
    for (const e of evenements) {
        if (e.type !== A.RUN_STARTED) continue;
        const p = e.payload || {};
        if (!p.runId) continue;
        if (pathId && p.pathId !== pathId) continue;
        if (!comptePourLaNote(seance, e.ts)) continue;
        gardes.add(p.runId);
    }
    return gardes;
}

/**
 * Les événements de cette séance, et rien d'autre.
 *
 * @param {Object} seance
 * @param {Array} evenements  le journal complet de l'élève
 */
export function evenementsDeLaSeance(seance, evenements = []) {
    const runs = runsDeLaSeance(seance, evenements);
    if (!runs.size) return [];
    return evenements.filter(e => e.payload && runs.has(e.payload.runId));
}

/** A-t-il seulement commencé ? La question qui décide d'afficher un lien bilan. */
export function aTravaille(seance, evenements = []) {
    return runsDeLaSeance(seance, evenements).size > 0;
}

/** Le bilan d'UN élève, borné à cette séance. */
export function bilanEleveSeance(seance, eleve, now = Date.now()) {
    const evts = evenementsDeLaSeance(seance, (eleve && eleve.evenements) || []);
    const b = bilanEleve(evts, now);
    return {
        id: eleve && eleve.id,
        nom: (eleve && eleve.nom) || '',
        ...b,
        signaux: signauxDe(b),
        // LE MOT DU PROFESSEUR VOYAGE AVEC LE BILAN. Rémy le pose pendant la
        // séance ; il n'aurait aucun intérêt à être rangé ailleurs que là où on
        // relit l'élève.
        mot: (seance && seance.mots && seance.mots[eleve && eleve.id]) || null
    };
}

/**
 * LE BILAN DE LA CLASSE POUR CETTE SÉANCE.
 *
 * On réutilise `bilanClasse` en lui passant une classe dont les journaux ont
 * été taillés : le calcul, le tri des compétences « à reprendre » et la phrase
 * de synthèse restent exactement ceux du bilan général. Une seule
 * implémentation, deux portées.
 *
 * ON N'INCLUT QUE LES ÉLÈVES CONCERNÉS. Une séance donnée à huit élèves sur
 * vingt-six ne doit pas afficher dix-huit lignes vides : elles feraient croire
 * à dix-huit absents.
 */
export function bilanSeance(seance, classe, now = Date.now()) {
    const tous = (classe && classe.eleves) || [];
    const vises = seance && seance.eleveIds && seance.eleveIds.length
        ? tous.filter(e => seance.eleveIds.includes(e.id))
        : tous;

    const eleves = vises.map(e => ({
        ...e,
        evenements: evenementsDeLaSeance(seance, e.evenements || [])
    }));

    const b = bilanClasse({ ...classe, eleves }, now);
    return {
        ...b,
        seanceId: seance && seance.id,
        titre: (seance && seance.titre) || b.nom,
        // COMBIEN ONT SEULEMENT OUVERT LA SÉANCE. Différent de `sansTravail`,
        // qui compte ceux qui n'ont répondu à aucune question : on peut avoir
        // commencé et n'avoir rien validé, et ce n'est pas la même situation.
        commences: eleves.filter(e => e.evenements.length).length,
        attendus: eleves.length,
        // Les exercices de la séance, dans l'ordre où ils ont été donnés : c'est
        // le plan de l'heure, et il tient sur une ligne.
        exercices: [...exercicesDe(seance)],
        eleves: b.eleves.map(e => ({
            ...e,
            mot: (seance && seance.mots && seance.mots[e.id]) || null
        }))
    };
}
