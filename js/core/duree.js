// COMBIEN DE QUESTIONS FAUT-IL POUR QUE L'EXERCICE TIENNE SA PROMESSE ?
//
// Rémy : « selon le nombre de marches, il faut adapter le nombre de questions.
// 20 questions avec 3 QCM à 2, ce n'est pas déconnant ». C'est exactement le
// bon angle, et le défaut qu'il pressent est bien réel — il est même plus large
// que l'escalier de l'aide.
//
// LE DÉFAUT DE DIX TRONQUAIT TOUTES LES PROGRESSIONS.
//
// Un exercice réglé sur « progressif » annonce une suite de marches. Le nombre
// de questions, lui, valait dix quoi qu'il arrive. Résultat :
//
//   · « Nombres Relatifs », 6 niveaux à 2 questions → il en fallait 12 ;
//     l'élève en voyait 5 sur 6, et ne rencontrait jamais l'écriture.
//   · « Quelle heure est-il ? », même compte, même troncature.
//   · « Additionner des Relatifs », 12 marches à 2 questions → il en fallait
//     24 ; l'élève en voyait 5 sur 12. Le commentaire du générateur dit
//     pourtant, mot pour mot : « Douze marches, deux questions chacune ».
//
// Personne ne le voyait : l'exercice se déroulait normalement, il s'arrêtait
// simplement avant la fin de ce qu'il promettait.
//
// Un générateur qui pose une progression déclare donc ce qu'il lui faut
// (`conseil(params)`), et c'est ce nombre que le panneau propose.

/** Ce que vaut un exercice ordinaire, sans progression déclarée. */
export const QUESTIONS_PAR_DEFAUT = 10;

/**
 * Le minimum pour que l'escalier de l'AIDE ait le temps de monter : trois
 * preuves pour quitter les deux propositions, deux pour quitter les quatre, et
 * au moins deux questions au clavier — sinon on n'aura jamais rien produit
 * soi-même, ce qui était pourtant le but de la montée.
 */
export const MINIMUM_ESCALIER = 7;

/** Bornes du réglage : au-delà, ce n'est plus un exercice, c'est une punition. */
export const MIN_QUESTIONS = 3;
export const MAX_QUESTIONS = 50;

/**
 * Le nombre de questions à proposer par défaut.
 *
 * C'est un CONSEIL, pas une contrainte : le professeur reste libre de mettre
 * cinq questions sur une progression de douze marches — il verra les cinq
 * premières, et c'est un choix légitime pour une reprise de cinq minutes. Ce
 * qui n'était pas légitime, c'est que ce choix se fasse à son insu.
 *
 * @param {Object} generateur  définition du registre (peut déclarer `conseil`)
 * @param {Object} params      réglages courants de l'exercice
 * @param {Object} [opts]      `{ aide: true }` pour garantir aussi l'escalier de l'aide
 */
export function questionsConseillees(generateur, params = {}, opts = {}) {
    let n = QUESTIONS_PAR_DEFAUT;
    if (generateur && typeof generateur.conseil === 'function') {
        const dit = Number(generateur.conseil(params || {}));
        if (Number.isFinite(dit) && dit > 0) n = Math.max(n, Math.round(dit));
    }
    if (opts.aide !== false) n = Math.max(n, MINIMUM_ESCALIER);
    return Math.max(MIN_QUESTIONS, Math.min(MAX_QUESTIONS, n));
}

/**
 * Combien de marches l'élève verra RÉELLEMENT avec ce nombre de questions.
 * Sert au panneau de réglages, pour dire « 5 des 12 marches » plutôt que de
 * laisser croire qu'on les parcourt toutes.
 */
export function marchesVues(marches, parMarche, nbQuestions) {
    const m = Math.max(1, Number(marches) || 1);
    const p = Math.max(1, Number(parMarche) || 1);
    const n = Math.max(1, Number(nbQuestions) || QUESTIONS_PAR_DEFAUT);
    return Math.max(1, Math.min(m, Math.ceil(n / p)));
}
