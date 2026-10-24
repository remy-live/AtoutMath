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
 * LA QUESTION, REFABRIQUÉE DEPUIS SA GRAINE — ou `null`.
 *
 * L'énoncé refait doit être CELUI QU'ON A ENREGISTRÉ. Sinon la graine a
 * rencontré d'autres réglages — le professeur a retouché l'exercice dans son
 * parcours — et tout ce qu'on en tirerait illustrerait une AUTRE question.
 */
function refaireLItem(q, exerciseId) {
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
    if (normaliserEnonce(item.prompt.text) !== normaliserEnonce(q.questionText)) return null;
    return { gen, item };
}

/**
 * Refabrique la question d'une erreur et rend son visuel.
 *
 * @param {Object} q - le `questionData` d'une entrée du carnet
 * @param {string} [exerciseId] - pour retrouver les réglages du catalogue
 * @returns {{html: string, exact: boolean} | null}
 */
export function visuelDe(q, exerciseId) {
    const refait = refaireLItem(q, exerciseId);
    if (!refait) return null;
    const figures = figuresDe(refait.item.prompt.html);
    if (!figures) return null;
    return { html: figures, exact: true };
}

/**
 * LA CORRECTION, DESSINÉE — et la réponse, en français.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * RÉMY, capture du carnet d'un élève de 4e : « c'est pas clair pour les
 * transformations, il faut montrer la figure de base et la solutions. […] Il
 * faut que tant que faire se peut que ce soit visuel pour les explications. »
 *
 * La carte montrait la figure de la QUESTION, et sous elle deux chaînes :
 * « ta réponse : point:0.5:4.5, attendu : point:4.5:4.5 ». Pour comprendre ce
 * qu'il avait raté, l'élève devait convertir des coordonnées de machine en
 * points de la figure — c'est-à-dire refaire l'exercice à l'envers, sans la
 * figure.
 *
 * ── POURQUOI LE CARNET NE SAIT PAS FAIRE ÇA TOUT SEUL ──────────────────────
 *
 * Parce que la clé qui juge n'a de sens que pour le générateur qui l'a écrite :
 * « point:4.5:4.5 » est un centre en coordonnées de CASE, « 7|3/8|3 » est une
 * liste de cases comptées à partir de zéro. Une table de traduction dans
 * l'interface serait à refaire à chaque exercice, et elle se tromperait d'un
 * demi-carreau le jour où l'on y penserait le moins — c'est exactement la
 * faute que `core/elementSymetrie.js` annonce en tête de fichier.
 *
 * DEUX FONCTIONS FACULTATIVES, ET LE CARNET N'EN SAIT PAS PLUS :
 *
 *   `gen.lireUneReponse(cle, item)` → { objet, dit }
 *   `gen.figureCorrigee(item, { donne })` → le HTML de la figure corrigée
 *
 * Un générateur qui n'en a pas laisse la carte telle qu'elle était.
 *
 * ET CELA RÉPARE LE PASSÉ, ce qui est tout l'intérêt : le carnet rejoue ce qui
 * a été écrit LE JOUR de l'erreur, et les quatre-vingts erreurs déjà
 * enregistrées de cet élève portent la forme canonique. Les corriger à la
 * source ne les aurait pas touchées.
 *
 * @returns {{html: string, given: string, expected: string} | null}
 */
export function corrigeDe(q, exerciseId) {
    const refait = refaireLItem(q, exerciseId);
    if (!refait) return null;
    const { gen, item } = refait;
    if (typeof gen.figureCorrigee !== 'function') return null;

    const lu = (cle) => (typeof gen.lireUneReponse === 'function'
        ? gen.lireUneReponse(String(cle ?? ''), item) : null);
    const donne = lu(q.input);
    const bon = lu(q.expected);

    let html = '';
    try {
        html = gen.figureCorrigee(item, { donne: donne ? donne.objet : null });
    } catch (e) {
        return null;
    }
    if (!html) return null;

    return {
        html,
        given: donne ? donne.dit : '',
        expected: bon ? bon.dit : ''
    };
}
