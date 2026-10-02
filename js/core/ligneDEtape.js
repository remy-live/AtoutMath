// LA PETITE LIGNE SOUS UNE ÉTAPE DU PARCOURS.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// Deux vues montrent le même parcours — la CARTE, avec ses pastilles de 124 px,
// et la LISTE, qui a toute la largeur. Elles écrivaient chacune leur version de
// la même ligne, et elles divergeaient : « 14 q. • 4 pts » sur la carte,
// « 14 questions • sur 4 pts » en liste.
//
// RÉMY : « sur le plan ca écrite 14 q. par exemple écris 14 questions ».
//
// L'abréviation gagnait six caractères sous la pastille — et c'est exactement
// le genre d'économie qu'on fait sans y penser, puis qu'on ne revoit plus. Le
// mot entier tient : mesuré, « 14 questions » occupe environ 75 px des 124 de
// la pastille, qui laisse de toute façon la ligne passer à la suivante.
//
// ET LA RÉUSSITE S'Y ÉCRIT MAINTENANT. Rémy, dans la foulée : « on pourrait
// écrire la réussite aussi non ? ». Une étape TERMINÉE n'a plus à annoncer ce
// qu'il y avait à faire : l'élève le sait, il vient de le faire. Elle dit ce
// qu'il en a fait.
//
// ON LA SORT DES DEUX VUES parce qu'une phrase écrite à deux endroits finit
// toujours par être deux phrases — et parce qu'ici, elle devient mesurable sans
// navigateur.

import { direBareme } from './grading.js';

/**
 * @param {Object} step    l'étape (nbItems, timeLimit, stepId)
 * @param {Object} opts    `bareme` (Map) et `resultats` ({[stepId]: {...}})
 * @param {Object} [forme] `sur: true` écrit « sur 4 pts » au lieu de « 4 pts »
 * @returns {string}
 */
/** Un nombre de points sans son unité : « 3,4 », « 4 ». */
const nombre = (n) => String(Math.round(n * 10) / 10).replace('.', ',');

export function sousLaPastille(step, opts = {}, forme = {}) {
    const resultat = opts.resultats ? opts.resultats[step.stepId] : null;

    // ── L'ÉTAPE EST FAITE : ON DIT CE QU'IL EN A FAIT ────────────────────────
    //
    // `questions` est le nombre RÉELLEMENT posé, pas celui qui était prévu : un
    // chronomètre peut arrêter l'étape plus tôt, et « 8 sur 14 » sous une étape
    // où l'on n'a eu le temps de voir que huit questions se lirait comme six
    // erreurs. C'est le même piège que le bilan de fin d'étape, qui compare
    // `solved` à ce qui a été POSÉ.
    if (resultat && Number(resultat.questions) > 0) {
        const posees = Number(resultat.questions);
        const trouvees = Math.max(0, Math.min(posees, Number(resultat.solved) || 0));
        const mots = [`${trouvees} sur ${posees}`];
        // LE BARÈME ET LE CHRONOMÈTRE S'EFFACENT ALORS. Annoncer « sur 4 pts »
        // sous une étape finie, c'est annoncer une épreuve qui n'aura pas lieu ;
        // et une durée qui ne court plus n'apprend rien à personne.
        const pts = opts.bareme && opts.bareme.get(step.stepId);
        if (pts) {
            // LA NOTE OBTENUE, PAS LE BARÈME. Elle se calcule sur ce qui a été
            // posé — c'est la seule proportion qui ait un sens quand le
            // chronomètre a raccourci l'étape.
            //
            // ET L'UNITÉ NE SE DIT QU'UNE FOIS. Mesuré à l'écran : « 4 pts sur
            // 4 pts » prenait deux lignes sous une pastille de 92 px et se
            // lisait deux fois plus lentement que « 4 sur 4 pts ».
            const obtenus = Math.round((pts * trouvees / posees) * 10) / 10;
            mots.push(`${nombre(obtenus)} sur ${direBareme(pts)}`);
        }
        return mots.join(' • ');
    }

    // ── ELLE EST DEVANT LUI : ON DIT CE QU'IL Y A À FAIRE ────────────────────
    const mots = [`${step.nbItems} question${step.nbItems > 1 ? 's' : ''}`];
    if (step.timeLimit) mots.push(`${step.timeLimit}s`);
    // `null` hors évaluation notée — une étape d'entraînement n'a pas de points,
    // et en afficher serait mentir.
    const pts = opts.bareme && opts.bareme.get(step.stepId);
    if (pts) mots.push(forme.sur ? `sur ${direBareme(pts)}` : direBareme(pts));
    return mots.join(' • ');
}
