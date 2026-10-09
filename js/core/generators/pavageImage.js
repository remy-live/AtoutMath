// « QUELLE EST L'IMAGE DE LA PIÈCE 5 PAR LA SYMÉTRIE D'AXE (GJ) ? »
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « je sais que l'on a déjà un exercice sur les transformations mais tu
// pourrais refaire ce pavage et poser différentes questions et si l'élève se
// trompe, lui compter faux mais aussi montrer la transformation ».
//
// CE QUE CET EXERCICE FAIT TRAVAILLER, et qui n'est PAS ce que fait déjà
// « Tracer l'image sur le quadrillage » :
//
//   · là-bas, l'élève a une figure, une transformation, et il TRACE ;
//   · ici, il a une mosaïque entière, une transformation, et il doit SUIVRE la
//     pièce des yeux pour dire où elle tombe.
//
// La différence est celle entre produire et lire, et la seconde est plus
// difficile : il faut tenir dans sa tête une figure, un centre et un sens à la
// fois, sans pouvoir s'aider du crayon. C'est aussi ce qu'un contrôle demande.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// LES QUESTIONS NE SONT PAS INVENTÉES, ELLES SONT LUES.
//
// Chaque pavage de `js/data/pavages.js` a été CONSTRUIT par ses
// transformations : on sait donc, pour chacune, quelle pièce tombe sur quelle
// pièce — ce n'est pas une recherche qui peut se tromper, c'est le geste qui a
// servi à bâtir la mosaïque. Le générateur ne fait que choisir laquelle poser.
//
// LE PIÈGE QU'ON ÉVITE AINSI : chercher après coup « quelles pièces sont images
// l'une de l'autre » trouve aussi des coïncidences — deux pièces de même forme
// posées au bon endroit sans que la transformation annoncée les relie. L'élève
// aurait alors « faux » en ayant raison, ce qui est la pire chose qu'un
// logiciel d'exercices puisse faire.

import { makeItem } from '../items.js';
import { MOSAIQUES } from '../../data/mosaiques.js';
import { direTransformation } from '../mosaique.js';
import { NOMS } from '../transformations.js';

/** Les genres, du plus abordable au plus coriace — l'ordre du collège. */
export const GENRES = ['axiale', 'centrale', 'translation', 'rotation'];

export const DIFFICULTE = { axiale: 1, centrale: 2, translation: 2, rotation: 3 };

/**
 * LE RÉGLAGE, QUELLE QUE SOIT LA FORME SOUS LAQUELLE IL ARRIVE.
 *
 * Un réglage à choix multiples vaut normalement un tableau ; il n'en vaut pas
 * toujours un, et un générateur ne doit pas tomber pour autant (le piège est
 * documenté dans `generators/transfoQuadrillage.js`, où il avait fait
 * disparaître l'exercice entier sans un message).
 */
function listeDeGenres(brut) {
    const liste = Array.isArray(brut) ? brut
        : (typeof brut === 'string' ? brut.split(',') : []);
    const propres = liste.map(s => String(s).trim()).filter(g => GENRES.includes(g));
    return propres.length ? propres : GENRES;
}

/** Les cases d'une pièce, en points — le fichier de données les range à plat. */
const enPoints = (cases) => cases.map(([x, y]) => ({ x, y }));

/** Un pavage, relu sous la forme que le noyau manipule. */
export function lireMosaique(brut) {
    return {
        ...brut,
        pieces: brut.pieces.map(p => ({ n: p.n, cases: enPoints(p.cases) }))
    };
}

export const generator = {
    id: 'geo.transfo.pavageImage',
    label: 'La mosaïque des transformations',
    skills: ['geo.transfo.axiale', 'geo.transfo.centrale', 'geo.transfo.translation', 'geo.transfo.rotation'],
    answerKinds: ['piece'],
    params: [
        {
            id: 'genres', type: 'multiselect', label: 'Transformations', default: [...GENRES],
            options: GENRES.map(g => ({ value: g, label: NOMS[g] }))
        },
        {
            // LE RÉGLAGE QUE RÉMY A DEMANDÉ, et son défaut est le sien :
            // montrer QUAND L'ÉLÈVE S'EST TROMPÉ. Une animation systématique
            // donnerait la réponse avant qu'il ait cherché ; ne jamais l'animer
            // reviendrait à lui dire « faux » sans lui montrer pourquoi.
            id: 'montrer', type: 'select', label: 'Montrer le trajet de la pièce',
            default: 'si-faux',
            options: [
                { value: 'si-faux', label: 'Quand l\'élève se trompe' },
                { value: 'toujours', label: 'À chaque question (découverte)' }
            ],
            aide: 'Le trajet est une ANIMATION : la pièce quitte sa place, passe de l\'autre '
                + 'côté de l\'axe ou tourne autour du centre, et se pose. C\'est la seule '
                + 'correction qui dise quelque chose sur une transformation.'
        }
    ],

    /**
     * @param {Object} params
     *   `genres`   les transformations qu'on accepte de demander
     *   `montrer`  'toujours' | 'si-faux' — quand la transformation s'anime.
     *              Par défaut `si-faux` : c'est la demande de Rémy, et c'est
     *              aussi le bon réglage pédagogique — une animation systématique
     *              donnerait la réponse avant que l'élève ait cherché.
     */
    generate(params, ctx) {
        const rng = ctx.rng;
        params = params || {};
        const genres = listeDeGenres(params.genres);

        // ON CHOISIT LE PAVAGE PARMI CEUX QUI PEUVENT RÉPONDRE. Tirer un pavage
        // puis chercher une question du bon genre dedans échouerait sur les
        // mosaïques qui n'en ont pas, et le générateur rendrait alors une
        // question d'un genre que le professeur avait décoché.
        const possibles = MOSAIQUES.filter(p => p.relations.some(r => genres.includes(r.t.genre)));
        const brut = possibles.length
            ? possibles[rng.int(0, possibles.length - 1)]
            : MOSAIQUES[rng.int(0, MOSAIQUES.length - 1)];
        const mosaique = lireMosaique(brut);

        const candidates = mosaique.relations.filter(r => genres.includes(r.t.genre));
        const liste = candidates.length ? candidates : mosaique.relations;
        const q = liste[rng.int(0, liste.length - 1)];

        const dit = direTransformation(q.t);
        const consigne = `Quelle est l'image de la pièce ${q.depuis} par ${dit} ?`;

        return makeItem({
            seed: rng.seed,
            generatorId: 'geo.transfo.pavageImage',
            skillId: `geo.transfo.${q.t.genre}`,
            answerKind: 'piece',
            prompt: {
                text: consigne,
                // LE DESSIN EST MONTÉ PAR L'ACTIVITÉ, pas ici. Un pavage se
                // touche du doigt — c'est l'activité qui sait quelle pièce
                // l'élève a désignée, et c'est elle qui anime la transformation
                // quand il se trompe. Le générateur, lui, reste pur.
                papier: consigne
            },
            answer: String(q.vers),
            hints: indices(q.t),
            explanation: explication(q),
            difficulty: DIFFICULTE[q.t.genre] || 2,
            meta: {
                mosaique: brut.graine,
                boite: mosaique.boite,
                pieces: mosaique.pieces,
                sommets: mosaique.sommets,
                depuis: q.depuis,
                vers: q.vers,
                transfo: q.t,
                genre: q.t.genre,
                montrer: params.montrer === 'toujours' ? 'toujours' : 'si-faux'
            }
        });
    }
};

/**
 * LES INDICES — ils disent la MÉTHODE, jamais la réponse.
 *
 * Un indice qui nomme la pièce d'arrivée fait l'exercice à la place de l'élève.
 * Ceux-ci rappellent le geste, et le premier est toujours le même : commencer
 * par UN point. C'est la seule manière de suivre une transformation de tête, et
 * c'est exactement ce qu'un élève en difficulté n'essaie pas — il regarde la
 * pièce entière et renonce.
 */
function indices(t) {
    const premier = 'Ne suis pas la pièce entière : choisis UN de ses coins, et cherche où il tombe.';
    if (t.genre === 'axiale') {
        return [premier,
            `Compte les carreaux qui séparent ton coin de l'axe (${t.nomAxe}), et reporte-les de l'autre côté.`,
            'L\'image est à la même distance de l\'axe, de l\'autre côté : c\'est un reflet, pas un glissement.'];
    }
    if (t.genre === 'centrale') {
        return [premier,
            `Trace mentalement la droite qui va de ton coin jusqu'au point ${t.nomCentre}, et prolonge-la d'autant.`,
            'Une symétrie de centre est un demi-tour : la pièce arrive à l\'envers.'];
    }
    if (t.genre === 'translation') {
        return [premier,
            `Le vecteur ${t.nomVecteur} dit un DÉPLACEMENT : compte combien de carreaux à droite ou à gauche, et combien vers le haut ou le bas.`,
            'Dans une translation la pièce ne tourne pas et ne se retourne pas : elle glisse.'];
    }
    return [premier,
        `Pose ton doigt sur le centre ${t.nomCentre} et fais tourner la figure d'un quart de tour.`,
        'Un quart de tour change l\'orientation de la pièce : ce qui était large devient haut.'];
}

function explication(q) {
    const nom = NOMS[q.t.genre] || 'transformation';
    return `Par ${direTransformation(q.t)}, la pièce ${q.depuis} se pose exactement sur la pièce ${q.vers}. `
        + `C'est une ${nom} : la pièce garde sa forme et ses dimensions, seule sa place change`
        + (q.t.genre === 'translation' ? ' — et son orientation ne change pas.' : '.');
}
