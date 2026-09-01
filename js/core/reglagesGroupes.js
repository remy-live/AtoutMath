// RÉGLER PLUSIEURS ÉTAPES D'UN COUP.
//
// Rémy : « quand on a sélectionné les exercices, on peut mettre un seuil commun
// de réussite minimal (ex 70 %, ça règle tous les curseurs des exercices
// sélectionnés) et même on peut régler le nombre de questions et le mode par
// défaut — en fait on essaie de faire des réglages globaux. Rends cela simple. »
//
// UN SEUL GESTE POUR TOUTE LA SÉLECTION, et c'est là toute la difficulté : les
// étapes sélectionnées n'ont pas forcément le même nombre de questions. Un
// seuil « 70 % » n'est donc PAS un nombre qu'on recopie partout — c'est une
// PART, et chaque étape la traduit dans son propre total. Sept sur dix et
// quatorze sur vingt sont le même réglage ; écrire « 7 » dans les deux aurait
// donné 70 % ici et 35 % là, sans que rien ne le dise.
//
// C'est pour cela que ce module existe plutôt qu'une boucle dans l'interface :
// la traduction est une règle, elle se teste, et elle ne doit exister qu'une
// fois.
//
// Aucun DOM ici. On reçoit des étapes, on rend des étapes.

import { ajusterDuo, MIN_ETAPE, MAX_ETAPE } from './seuilEtape.js';

/** Une part en pourcentage, ramenée dans [0, 100]. */
function partValide(pourcent) {
    const v = Number(pourcent);
    if (!Number.isFinite(v)) return null;
    return Math.max(0, Math.min(100, v));
}

/**
 * LE SEUIL D'UNE ÉTAPE POUR UNE PART DONNÉE.
 *
 * On arrondit VERS LE HAUT, comme `seuilConseille` : sur six questions, 70 %
 * font 4,2, donc cinq — quatre serait 67 %, en dessous de ce qu'on annonce.
 * Et 0 % veut dire « aucune exigence », c'est-à-dire `null` : c'est ce que le
 * reste du code entend par là, un seuil de zéro se relirait comme un réglage.
 */
export function seuilPourPart(nbItems, pourcent) {
    const part = partValide(pourcent);
    if (part === null) return undefined;
    const n = Math.max(MIN_ETAPE, Math.floor(Number(nbItems) || MIN_ETAPE));
    if (part === 0) return null;
    return Math.max(1, Math.min(n, Math.ceil((n * part) / 100)));
}

/** La part exigée par une étape, en pourcentage entier — null si aucune. */
export function partDe(step) {
    if (!step) return null;
    if (step.threshold === null || step.threshold === undefined) return null;
    const n = Math.max(MIN_ETAPE, Math.floor(Number(step.nbItems) || MIN_ETAPE));
    return Math.round((Math.min(n, Number(step.threshold) || 0) / n) * 100);
}

/**
 * CE QUE LA SÉLECTION A DÉJÀ EN COMMUN — pour remplir les champs.
 *
 * Une valeur commune s'affiche ; des valeurs différentes n'affichent RIEN.
 * Montrer celle de la première étape serait un mensonge tranquille : le
 * professeur croirait lire l'état de sa sélection, et le moindre passage dans
 * le champ l'imposerait aux autres sans qu'il l'ait voulu.
 *
 * @returns {{questions: number|null, part: number|null}}
 */
export function communDe(steps) {
    const lot = (steps || []).filter(Boolean);
    if (!lot.length) return { questions: null, part: null };
    const memeChose = (f) => {
        const v = f(lot[0]);
        return lot.every(s => f(s) === v) ? v : null;
    };
    return {
        questions: memeChose(s => Math.floor(Number(s.nbItems) || 0)),
        part: memeChose(s => partDe(s))
    };
}

/**
 * APPLIQUER UN RÉGLAGE À UNE SÉLECTION.
 *
 * `quoi` ne porte que ce qu'on change : `{questions}`, `{part}`, ou les deux.
 * Ce qui n'y est pas n'est pas touché — un professeur qui règle le seuil ne
 * s'attend pas à voir la longueur de ses étapes bouger.
 *
 * L'ORDRE COMPTE : on pose d'abord le nombre de questions, puis on traduit la
 * part DANS CE NOUVEAU TOTAL. L'inverse aurait recalculé un seuil sur l'ancien
 * total, puis l'aurait fait raboter par `ajusterDuo` — « 20 questions à 70 % »
 * aurait donné 7 sur 20, soit 35 %.
 *
 * @param {Array} steps  toutes les étapes du parcours
 * @param {Set<string>} choisies  les stepId sélectionnés
 * @param {{questions?:number, part?:number}} quoi
 * @returns {Array} un nouveau tableau d'étapes
 */
export function appliquerAuxEtapes(steps, choisies, quoi = {}) {
    const veutQuestions = quoi.questions !== undefined && quoi.questions !== null
        && quoi.questions !== '';
    const veutPart = quoi.part !== undefined && quoi.part !== null && quoi.part !== '';
    if (!veutQuestions && !veutPart) return (steps || []).slice();

    return (steps || []).map(s => {
        if (!s || !choisies.has(s.stepId)) return s;
        const suite = { ...s };

        if (veutQuestions) {
            const duo = ajusterDuo({
                questions: quoi.questions,
                exigees: (s.threshold === null || s.threshold === undefined)
                    ? quoi.questions : s.threshold,
                bouge: 'questions',
                max: MAX_ETAPE
            });
            suite.nbItems = duo.questions;
            // LE SEUIL SUIT LA LONGUEUR, EN GARDANT SA PART. Passer de 10 à 20
            // questions sans y toucher aurait laissé « 7 sur 20 » : le
            // professeur a rallongé son étape, il n'a pas divisé son exigence
            // par deux. Une étape sans exigence, elle, n'en gagne pas.
            if (s.threshold !== null && s.threshold !== undefined) {
                suite.threshold = seuilPourPart(duo.questions, partDe(s));
            }
        }

        if (veutPart) suite.threshold = seuilPourPart(suite.nbItems, quoi.part);

        // UN JEU DE RÉCOMPENSE NE SE VALIDE PAS : il garde sa longueur, jamais
        // d'exigence. Lui en poser une par un réglage global le transformerait
        // en exercice sans que la ligne le dise.
        if (suite.bonus) suite.threshold = null;
        return suite;
    });
}
