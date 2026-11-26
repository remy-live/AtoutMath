// L'ÉCRITURE SCIENTIFIQUE EN DEUX TEMPS — les questions, par marches.
//
// RÉMY, 26 novembre : « on a 134 × 10⁵, on met d'abord 134 sous forme
// scientifique en laissant le 10⁵, puis après on applique la règle des
// puissances pour avoir à la fin 1,34 × 10⁷ ».
//
// Les règles — fabriquer, juger, nommer la faute — sont dans
// `core/scientifiqueDeuxTemps.js`. Ici, on en fait des questions : cinq
// marches, trois questions par marche, dans l'ordre de la progression.
//
// LA RÉPONSE EST UNE ÉCRITURE, PAS UN NOMBRE : « 1,34|2|7 » — la mantisse, ce
// que la virgule a fabriqué, l'exposant final. 1,34 × 10⁷ écrit d'un coup
// vaut le même nombre, mais ne répond pas à la question posée, qui est de
// montrer le premier temps.

import { makeItem } from '../items.js';
import {
    paramMarches, marchesCochees, marcheAuRang, conseilProgression, totalDe
} from '../progression.js';
import {
    MARCHES_DEUX_TEMPS, fabriquer, departTexte, chaineTexte, reponseDe, indices
} from '../scientifiqueDeuxTemps.js';
import { dessinerExposants, grouper, puissanceTexte, TROU_EN_EXPOSANT } from '../puissances.js';

/** Combien de questions par marche avant de monter, sauf réglage contraire. */
const PAR_MARCHE = 3;

const RANG = Object.fromEntries(MARCHES_DEUX_TEMPS.map((m, i) => [m.id, i + 1]));

/** La marche à travailler pour la question numéro `index`. */
export function marchePour(params, index, total = 0) {
    return marcheAuRang(index, marchesCochees(params, MARCHES_DEUX_TEMPS), total, params, PAR_MARCHE);
}

export const puissancesDeuxTempsGenerator = {
    id: 'num.puissances-deux-temps',
    label: 'Écriture scientifique en deux temps',
    skills: ['num.puissances.scientifique'],
    answerKinds: ['text'],
    ecrit: true,
    conseil: (p) => conseilProgression(marchesCochees(p, MARCHES_DEUX_TEMPS).length, PAR_MARCHE),
    params: [paramMarches({ marches: MARCHES_DEUX_TEMPS, mot: 'marche' })],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const marche = marchePour(p, ctx.index, totalDe(ctx, p)) || 'entier';
        const q = fabriquer(rng, marche);
        const depart = departTexte(q);
        const prompt = `Écris ${depart} en écriture scientifique, en deux temps.`;
        // SUR LA FEUILLE, LES DEUX TEMPS, case pour case comme à l'écran — et
        // le 10ⁿ de départ déjà écrit au milieu : « en laissant le 10⁵ ».
        // L'EXPOSANT À TROUVER EST EN HAUT. Rémy : « juste quelques
        // pointillés en exposant ». Regardé sur la fiche (`ficheEnPdf`) : un
        // trou ordinaire après le 10 se dessinait SUR la ligne, et « × 10 ____ »
        // se lisait comme un produit.
        const t = TROU_EN_EXPOSANT;
        const papier = `${depart} = ………… × 10${t} × ${puissanceTexte(q.n)} = ………… × 10${t}`;
        return makeItem({
            seed: rng.seed,
            generatorId: 'num.puissances-deux-temps',
            skillId: 'num.puissances.scientifique',
            answerKind: 'text',
            ecritureExacte: true,
            prompt: {
                text: prompt,
                html: `<div class="game-question">Écris <span class="nb-highlight">${dessinerExposants(depart)}</span> en écriture scientifique, <b>en deux temps</b>.</div>`,
                papier
            },
            answer: reponseDe(q),
            // LE CORRIGÉ DE LA FEUILLE, et la largeur de ses trous : la fiche
            // taille chaque trou sur la réponse. « 1,34|2|7 » faisait des trous
            // où « 1,34 × 10² » ne tenait pas — regardé sur la fiche.
            reponsePapier: `${q.mantisse} × ${puissanceTexte(q.p)} × ${puissanceTexte(q.n)} = ${q.mantisse} × ${puissanceTexte(q.final)}`,
            hints: indices(q),
            explanation: chaineTexte(q),
            difficulty: RANG[marche],
            // LE TROU DU NOMBRE DE DEVANT se taille sur lui seul : « 3,5937 » et
            // trois caractères de marge, pas sur le corrigé entier.
            meta: {
                deuxTemps: { ...q, aGroupe: grouper(q.a) }, etape: marche, rang: RANG[marche],
                trouPapier: q.mantisse.length + 5
            }
        });
    }
};
