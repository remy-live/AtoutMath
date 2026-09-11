// LE VISUEL D'UNE QUESTION DÉJÀ POSÉE.
//
// Rémy, capture du carnet d'erreurs à l'appui : « quand il y a quelque chose de
// visuel, il faut afficher ce visuel ». La carte disait :
//
//     « Comment note-t-on cette figure ? — ta réponse : [AB), attendu : [BA] »
//
// …et il n'y avait pas de figure. La question désigne un dessin absent : elle
// est donc, mot pour mot, impossible à relire. C'est le même défaut que l'axe
// gradué imprimé au-dessus de rien.
//
// LE JOURNAL NE GARDE PAS D'IMAGES, ET C'EST TANT MIEUX : un carnet de deux
// cents erreurs pèserait des mégaoctets de SVG recopiés. Il garde la GRAINE —
// et une graine suffit à refabriquer la question à l'identique, puisque c'est
// exactement ce qui permet déjà au professeur de rejouer une question passée.
//
// ON NE MONTRE QUE CE QU'ON EST SÛR DE REFAIRE. Les réglages, eux, ne sont pas
// journalisés : si le professeur avait changé les paramètres de l'exercice dans
// son parcours, la question refabriquée serait UNE AUTRE question. On compare
// donc l'énoncé refait à l'énoncé enregistré, et l'on n'affiche le dessin que
// s'ils coïncident. Un dessin qui ne correspond pas à la question serait pire
// que pas de dessin du tout.

import { getGenerator } from './registry.js';
import { getExerciseById } from '../data/catalog.js';
import { makeRng } from './ids.js';

/** Le texte d'un énoncé, nettoyé de ce qui ne compte pas pour le comparer. */
export function normaliserEnonce(t) {
    return String(t ?? '')
        .replace(/\s+/g, ' ')
        .replace(/ /g, ' ')
        .trim();
}

/**
 * Les figures contenues dans un énoncé HTML.
 *
 * Un générateur enveloppe ses dessins dans `figure()` — un `div.figure-wrap`
 * autour d'un SVG. On ne rend QUE ces blocs : le reste du HTML est la phrase de
 * la question, que le carnet écrit déjà lui-même, et la réafficher la doublerait.
 *
 * @returns {string} le HTML des figures, ou une chaîne vide
 */
export function figuresDe(html) {
    const source = String(html ?? '');
    const blocs = source.match(/<div class="figure-wrap">[\s\S]*?<\/div>/g);
    if (blocs && blocs.length) return blocs.join('');
    // Un SVG posé sans enveloppe compte aussi : mieux vaut le montrer que de
    // le perdre parce qu'il manque un div.
    const svgs = source.match(/<svg[\s\S]*?<\/svg>/g);
    return svgs ? svgs.map(s => `<div class="figure-wrap">${s}</div>`).join('') : '';
}

/**
 * Refabrique la question d'une erreur et rend son visuel.
 *
 * @param {Object} q - le `questionData` d'une entrée du carnet
 * @param {string} [exerciseId] - pour retrouver les réglages du catalogue
 * @returns {{html: string, exact: boolean} | null}
 */
export function visuelDe(q, exerciseId) {
    if (!q || !q.generatorId || !q.itemSeed) return null;
    const gen = getGenerator(q.generatorId);
    if (!gen || typeof gen.generate !== 'function') return null;

    const exo = exerciseId ? getExerciseById(exerciseId) : null;
    const params = (exo && exo.params) || {};

    let item;
    try {
        item = gen.generate({ ...params }, { rng: makeRng(q.itemSeed), index: 0 });
    } catch (e) {
        // Un générateur qui refuse ces réglages-là ne doit pas emporter le
        // carnet avec lui : on se tait, et la carte reste en texte.
        return null;
    }
    if (!item || !item.prompt) return null;

    const figures = figuresDe(item.prompt.html);
    if (!figures) return null;

    // L'énoncé refait doit être CELUI QU'ON A ENREGISTRÉ. Sinon la graine a
    // rencontré d'autres réglages, et le dessin illustrerait une autre question.
    const exact = normaliserEnonce(item.prompt.text) === normaliserEnonce(q.questionText);
    if (!exact) return null;

    return { html: figures, exact: true };
}
