// Le raisonnement du robot, écrit une seule fois.
//
// Ce que le robot doit dire est déjà dans l'item, et il y est pour TOUS les
// générateurs — présents et à venir — parce que le contrat `Item` l'exige et
// qu'un test le vérifie :
//
//   item.hints        les aides graduées : c'est la méthode, de la plus légère
//                     à la plus explicite. Autrement dit, le raisonnement.
//   choice.why        pourquoi on choisit ce distracteur : c'est l'erreur à
//                     écarter, et la raison de l'écarter.
//   item.explanation  la conclusion.
//
// Un nouveau générateur devient donc commenté sans écrire une ligne ici. Une
// nouvelle activité n'a qu'à fournir ses cases et son geste.

import { DEMO_SPEED } from './demoPointer.js';

/** Une phrase et sa cible : de quoi commenter sans coder deux fois. */
const PONT = 'Donc c\'est celle-ci.';

/**
 * Démonstration commentée d'une question à propositions.
 *
 * @param {Object} cfg
 * @param {Object} cfg.narrateur   - null pour une démonstration muette (vignette)
 * @param {Object} cfg.cursor
 * @param {Object} cfg.item
 * @param {Element[]} cfg.cellules - une par proposition, dans l'ordre de item.choices
 * @param {Element} [cfg.question] - l'énoncé, ancre des premières phrases
 * @param {Element} [cfg.versEmplacement] - glisser jusque-là au lieu d'appuyer
 * @param {(el:Element)=>void} [cfg.apresChoix]
 * @returns {Promise<boolean>} false si la démonstration a été interrompue
 */
export async function demoChoix(cfg) {
    const { narrateur, cursor, item, cellules = [], question = null,
        versEmplacement = null, apresChoix = null } = cfg;

    const iBon = (item.choices || []).findIndex(c => c.correct);
    const bonneCase = cellules[iBon];
    if (!bonneCase) return false;

    if (!await cursor.pause(narrateur ? 350 : 600)) return false;

    if (narrateur) {
        // 1. La méthode, avant tout geste. Deux aides au plus : la dernière
        // donne en général la réponse, et elle servira de conclusion.
        for (const aide of (item.hints || []).slice(0, 2)) {
            if (!await narrateur.dire(aide, question)) return false;
        }

        // 2. Écarter une erreur, en la désignant. C'est la moitié du travail
        // d'un élève, et la seule partie qu'une démonstration muette n'a
        // jamais montrée.
        const iFaux = (item.choices || []).findIndex(c => !c.correct && c.why);
        if (iFaux >= 0 && cellules[iFaux]) {
            if (!await cursor.moveTo(cellules[iFaux])) return false;
            cellules[iFaux].classList.add('demo-ecarte');
            if (!await narrateur.dire(item.choices[iFaux].why, cellules[iFaux])) return false;
        }

        if (!await narrateur.dire(PONT, bonneCase)) return false;
    }

    // 3. Le geste, montré comme on l'attend de l'élève.
    const fait = versEmplacement
        ? await cursor.dragFromTo(bonneCase, versEmplacement)
        : await cursor.tap(bonneCase);
    if (!fait) return false;

    bonneCase.classList.add('demo-target');
    if (apresChoix) apresChoix(bonneCase);

    // 4. La conclusion, sur la case retenue.
    if (narrateur && item.explanation) {
        if (!await narrateur.dire(item.explanation, bonneCase)) return false;
        return true;
    }
    return cursor.pause(DEMO_SPEED.between);
}

/**
 * Commente une question sans proposition à cliquer (grille à remplir, pavé
 * numérique, repère). L'activité garde son geste ; seule la parole est
 * partagée.
 *
 * @returns {Promise<boolean>}
 */
export async function direLaMethode(narrateur, item, ancre = null, combien = 2) {
    if (!narrateur) return true;
    for (const aide of (item.hints || []).slice(0, combien)) {
        if (!await narrateur.dire(aide, ancre)) return false;
    }
    return true;
}

/** La conclusion, une fois la réponse posée. */
export async function direLaConclusion(narrateur, item, ancre = null) {
    if (!narrateur || !item.explanation) return true;
    return narrateur.dire(item.explanation, ancre);
}
