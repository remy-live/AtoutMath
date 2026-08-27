// COMBIEN DE QUESTIONS, ET COMBIEN IL FAUT EN RÉUSSIR.
//
// Rémy : « il ne peut pas y avoir plus de bonnes réponses exigées que de
// questions. Quand on est en mode évaluation, pas besoin de bonne réponse
// exigée. On pourrait mettre un double slider ? »
//
// LE PANNEAU POSAIT DEUX RAILS INDÉPENDANTS, de 1 à 50 chacun. Rien n'empêchait
// « 30 bonnes réponses exigées » sous « 10 questions » : le panneau acceptait
// l'absurdité, et le code la rattrapait en douce au moment d'enregistrer, par
// un `Math.min`. Le professeur voyait donc 30, l'étape en gardait 10, et
// personne ne lui disait qu'il venait d'écrire une chose impossible.
//
// LES DEUX POIGNÉES SUR UN SEUL RAIL RÈGLENT CELA PAR LA FORME, pas par une
// vérification. Les deux valeurs se comptent dans la même unité — des questions
// — donc elles vivent sur le même axe, et l'ordre des poignées EST la règle :
// la poignée « exigées » ne peut pas dépasser la poignée « questions », il n'y
// a plus d'état interdit à représenter. C'est aussi ce qu'on lit d'un coup
// d'œil : le segment coloré, c'est ce qu'il faut réussir ; le reste du rail,
// la marge d'erreur laissée à l'élève.
//
// EN ÉVALUATION, IL N'Y A PAS DE SEUIL DU TOUT. Une interrogation ne se
// « valide » pas question par question : elle se note. Exiger 7 sur 10 y
// signifierait « en dessous de 7, tu recommences », ce qui n'existe pas dans un
// devoir surveillé. Le seuil vaut alors `null` — aucune exigence — et la
// deuxième poignée disparaît au lieu de proposer un réglage sans effet.
//
// Module pur : ni DOM, ni état.

import { MAX_QUESTIONS } from './duree.js';

/** Une étape sans question n'existe pas. */
export const MIN_ETAPE = 1;

/** Le maximum du rail : celui du nombre de questions. */
export const MAX_ETAPE = MAX_QUESTIONS;

/**
 * LE NOMBRE DE BONNES RÉPONSES RÉELLEMENT EXIGÉ PAR UNE ÉTAPE.
 *
 * Une seule lecture, partagée par le meneur, la barre de progression et
 * l'abandon — ils écrivaient chacun leur `Math.min(step.threshold,
 * step.nbItems)`, ce qui marchait tant que personne ne changeait d'avis sur ce
 * que vaut un seuil absent.
 *
 * `null` ou `undefined` valent ZÉRO EXIGENCE, et pas « tout réussir » : c'est
 * ce que fait le code depuis toujours (`Math.min(null, n)` vaut 0) et c'est ce
 * dont l'évaluation a besoin. Le commentaire de `makeStep` disait l'inverse.
 */
export function seuilRequis(step) {
    if (!step) return 0;
    const n = Math.max(0, Math.floor(Number(step.nbItems) || 0));
    if (step.threshold === null || step.threshold === undefined) return 0;
    const t = Math.floor(Number(step.threshold) || 0);
    return Math.max(0, Math.min(t, n));
}

/**
 * LES DEUX POIGNÉES APRÈS UN GESTE, toujours dans un état possible.
 *
 * `bouge` dit LAQUELLE des deux le professeur vient de tirer, et c'est ce qui
 * décide qui cède :
 *
 *   · il tire « exigées » vers la droite → elle bute contre « questions ».
 *     Monter le seuil ne doit pas allonger le devoir en douce.
 *   · il tire « questions » vers la gauche, sous le seuil → le seuil SUIT.
 *     Le bloquer laisserait la poignée basse derrière la haute, c'est-à-dire
 *     exactement l'état qu'on veut rendre impossible.
 *
 * @param {{questions:number, exigees:number, bouge?:('questions'|'exigees'), max?:number}} p
 * @returns {{questions:number, exigees:number}}
 */
export function ajusterDuo({ questions, exigees, bouge = 'questions', max = MAX_ETAPE }) {
    const haut = Math.max(MIN_ETAPE, Math.floor(Number(max) || MAX_ETAPE));
    let q = Math.max(MIN_ETAPE, Math.min(haut, Math.floor(Number(questions) || MIN_ETAPE)));
    let e = Math.max(MIN_ETAPE, Math.min(haut, Math.floor(Number(exigees) || MIN_ETAPE)));
    if (e > q) {
        if (bouge === 'questions') e = q;   // le devoir raccourcit, l'exigence suit
        else e = q;                          // l'exigence bute contre le devoir
    }
    return { questions: q, exigees: e };
}

/**
 * CE QU'ON ÉCRIT DANS L'ÉTAPE, selon le mode du parcours.
 *
 * En évaluation, `threshold` vaut `null` : c'est l'absence d'exigence, et non
 * un seuil de zéro que quelqu'un pourrait relire comme « réglé à 0 ».
 */
export function seuilPourMode({ questions, exigees, evaluation = false, max = MAX_ETAPE }) {
    const duo = ajusterDuo({ questions, exigees, max });
    return { nbItems: duo.questions, threshold: evaluation ? null : duo.exigees };
}

/**
 * LA PHRASE SOUS LE RAIL. C'est elle qui rend le double curseur lisible : deux
 * poignées sans légende se lisent comme un intervalle (« de 7 à 10 »), ce qui
 * n'est pas du tout ce qu'elles disent.
 */
export function phraseDuo({ questions, exigees, evaluation = false }) {
    const q = Math.max(MIN_ETAPE, Math.floor(Number(questions) || MIN_ETAPE));
    if (evaluation) {
        return `${q} question${q > 1 ? 's' : ''} — notées, sans seuil à franchir.`;
    }
    const duo = ajusterDuo({ questions: q, exigees });
    if (duo.exigees >= duo.questions) {
        return `${duo.questions} question${duo.questions > 1 ? 's' : ''} — il faut TOUT réussir.`;
    }
    const rate = duo.questions - duo.exigees;
    return `${duo.exigees} bonne${duo.exigees > 1 ? 's' : ''} réponse${duo.exigees > 1 ? 's' : ''} `
        + `exigée${duo.exigees > 1 ? 's' : ''} sur ${duo.questions} — `
        + `${rate} erreur${rate > 1 ? 's' : ''} tolérée${rate > 1 ? 's' : ''}.`;
}
