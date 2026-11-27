// LE NOM DES SOLIDES — les questions, par marches.
//
// Rémy, 27 novembre : « il n'y a pas grand-chose sur les solides de manière
// générale […] cube, pavé droit, cylindre, prisme droit, pyramide, cône,
// sphère, boule ». La règle, les dessins et les énoncés sont dans
// `core/nomDesSolides.js` ; ici, on en fait des questions à choix.

import { makeItem, finalizeChoices } from '../items.js';
import {
    paramMarches, marchesCochees, marcheAuRang, conseilProgression, totalDe
} from '../progression.js';
import {
    MARCHES_SOLIDES, tirerQuestionDeSolide, indicesDe, nomDe, CE_QUI_LE_DIT
} from '../nomDesSolides.js';
import { figure as encadrer } from '../figures.js';

/** Combien de questions par marche avant de monter, sauf réglage contraire. */
const PAR_MARCHE = 3;
const RANG = Object.fromEntries(MARCHES_SOLIDES.map((m, i) => [m.id, i + 1]));

export const nomDesSolidesGenerator = {
    id: 'geo.solides-nommer',
    label: 'Le Nom des Solides',
    skills: ['geo.espace.nommer'],
    answerKinds: ['choice'],
    conseil: (p) => conseilProgression(marchesCochees(p, MARCHES_SOLIDES).length, PAR_MARCHE),
    params: [paramMarches({ marches: MARCHES_SOLIDES, mot: 'marche' })],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        let marche = marcheAuRang(ctx.index ?? 0, marchesCochees(p, MARCHES_SOLIDES),
            totalDe(ctx, p), p, PAR_MARCHE) || 'dessin';
        // SUR LE PAPIER, PAS DE DESSIN : la feuille n'imprime pas les solides
        // (les volumes non plus, et pour la même raison). Regardé sur la fiche :
        // cinq « Quel est ce solide ? » sans rien à regarder. Le dessin y devient
        // donc un objet du quotidien — la même question, posée avec des mots.
        if (ctx.papier && marche === 'dessin') marche = 'objet';
        const q = tirerQuestionDeSolide(rng, marche, ctx.themesExclus || []);
        const html = `<div class="game-question">${q.enonce}</div>`
            + (q.figure ? encadrer(q.figure) : '');
        return makeItem({
            seed: rng.seed,
            generatorId: 'geo.solides-nommer',
            skillId: 'geo.espace.nommer',
            answerKind: 'choice',
            prompt: { text: q.enonce, papier: q.enonce, html },
            answer: q.solide,
            // LA BONNE RÉPONSE EST LE SOLIDE DE LA QUESTION, pas la première de
            // la liste : la marche « sphère ou boule » propose toujours les
            // quatre mêmes, dans le même ordre. `i === 0` y marquait juste la
            // sphère même quand on décrivait une boule — vu par l'épreuve.
            choices: finalizeChoices(rng, q.choix.map((id) => ({
                value: id, label: nomDe(id), correct: id === q.solide
            })), { count: 4 }),
            hints: indicesDe(q),
            // L'EXPLICATION DIT CE QUI LE DÉFINIT, et pas seulement son nom :
            // c'est la phrase qui servira la prochaine fois, devant un solide
            // qu'on n'aura jamais vu dessiné ainsi.
            explanation: `C'est ${nomDe(q.solide)}. ${CE_QUI_LE_DIT[q.solide] || ''}`.trim(),
            difficulty: RANG[q.marche] || 1,
            // `theme` pour la feuille (`themesExclus`), `clef` pour l'écran
            // (`itemSession`) : les deux disent ce qui ne doit pas revenir.
            meta: { solide: q.solide, marche: q.marche, variante: q.variante || null,
                theme: q.cle, clef: q.cle }
        });
    }
};
