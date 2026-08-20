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

// DEUX NATURES D'EXERCICE, DEUX LONGUEURS — et dix était faux pour les deux.
//
// Rémy : « je pencherais pour 20 questions pour les calculs ; pour le théorème
// de Pythagore, montrer 20 fois l'hypoténuse n'a pas d'intérêt ». C'est la
// bonne coupure, et elle ne se déduit pas du nombre de marches :
//
//   · UN RÉFLEXE se construit par la RÉPÉTITION. « 8 + 7 » n'a rien à
//     enseigner de neuf à la douzième question — c'est justement le but : que
//     la réponse vienne sans calculer. Dix additions ne construisent aucun
//     automatisme ; vingt commencent à en construire un. Le commentaire des
//     « Amis de Dix » le dit déjà : « le complément à 10 ne se travaille pas
//     comme un calcul parmi d'autres, c'est un RÉFLEXE ».
//
//   · UNE PROGRESSION se construit par les MARCHES. Montrer l'hypoténuse vingt
//     fois n'apprend rien de plus que la montrer deux fois : ce qui compte est
//     de passer à la marche suivante. Sa longueur se calcule (`conseil`), elle
//     ne se choisit pas.
//
// Un générateur déclare donc sa nature (`duree: 'reflexe'`) ou sa progression
// (`conseil(params)`). Sans rien, c'est une notion ordinaire : dix questions.

import { parDefautDe, uniteDe } from './registry.js';

// UNE TROISIÈME SOURCE, ET C'EST CELLE QU'ON AVAIT OUBLIÉE : L'ACTIVITÉ.
//
// Rémy, dès que le bandeau s'est mis à nommer l'unité comptée : « mais du coup
// 10 paires c'est très court ». Il a raison, et le problème n'est pas la
// nouvelle étiquette — c'est qu'elle rend enfin VISIBLE un défaut qui traînait
// depuis toujours. Dix valait pour tout le monde tant que personne ne
// regardait ce qu'il comptait : dix paires font deux tables des Amis de Dix,
// dix grilles de sudoku font une heure et demie, dix parties d'échecs font une
// soirée.
//
// La nature de l'exercice (réflexe / notion) et sa progression viennent du
// GÉNÉRATEUR ; le compte naturel d'unités vient de l'ACTIVITÉ (`parDefaut`
// dans le registre). Quand l'activité ne compte pas des questions, c'est elle
// qui a le dernier mot sur le point de départ — une grille n'est pas une
// question rapide qu'on répéterait vingt fois.

/** Ce que vaut un exercice ordinaire, sans nature ni progression déclarée. */
export const QUESTIONS_PAR_DEFAUT = 10;

/** Les longueurs par nature d'exercice. */
export const DUREES = { reflexe: 20, notion: 10 };

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
 * @param {Object} [opts]      `{ aide: true }` pour garantir aussi l'escalier de
 *   l'aide, `{ activite: 'sudoku' }` pour partir du compte naturel de l'activité
 */
export function questionsConseillees(generateur, params = {}, opts = {}) {
    // Le compte naturel de l'activité l'emporte sur le défaut générique : une
    // grille, une partie, une course ne se comptent pas comme des questions.
    const naturel = opts.activite ? parDefautDe(opts.activite) : QUESTIONS_PAR_DEFAUT;
    let n = naturel !== QUESTIONS_PAR_DEFAUT
        ? naturel
        : ((generateur && DUREES[generateur.duree]) || QUESTIONS_PAR_DEFAUT);
    if (generateur && typeof generateur.conseil === 'function') {
        const dit = Number(generateur.conseil(params || {}));
        if (Number.isFinite(dit) && dit > 0) n = Math.max(n, Math.round(dit));
    }
    // L'ESCALIER DE L'AIDE NE CONCERNE QUE LES EXERCICES À QUESTIONS. Il
    // demande sept réponses pour avoir le temps de monter — ce qui n'a aucun
    // sens sur une partie d'échecs, et forcerait sept parties.
    const desQuestions = !opts.activite || uniteDe(opts.activite) === 'question';
    if (opts.aide !== false && desQuestions) n = Math.max(n, MINIMUM_ESCALIER);
    return Math.max(1, Math.min(MAX_QUESTIONS, Math.max(desQuestions ? MIN_QUESTIONS : 1, n)));
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
