// LA PYRAMIDE — sur le papier.
//
// C'est là qu'elle vit : Rémy en publie une par semaine dans son « Coin des
// jeux mathématiques ». Une colonne de définitions à gauche, un escalier de
// cases à droite, et un crayon.
//
// SA FICHE EN PORTE DEUX, et ce n'est pas pour remplir la page : la première
// est « l'Extrait », déjà commencée, et la seconde « En direct », toute vide.
// C'est un exemple travaillé suivi de l'exercice — la façon la plus courte
// d'expliquer une règle qui tient en une phrase mais ne se comprend qu'en la
// voyant faire. Le réglage « Lignes déjà écrites » sert exactement à cela : un
// bloc à 3, un bloc à 0, et la fiche s'explique toute seule.

import { makeItem } from '../items.js';
import { creerPyramide, qualitePyramide, DIFFICULTES } from '../pyramide.js';

/** Les hauteurs proposées : au-delà de sept, le lexique n'a plus de sommet. */
const HAUTEURS = [
    { value: 4, label: '4 lignes — pour découvrir' },
    { value: 5, label: '5 lignes' },
    { value: 6, label: '6 lignes — comme dans la revue' },
    { value: 7, label: '7 lignes — la grande' }
];

export const pyramideFicheGenerator = {
    id: 'voc.pyramide-fiche',
    label: 'La Pyramide des mots',
    skills: ['voc.anagramme'],
    answerKinds: ['grid'],
    params: [
        {
            id: 'hauteur', type: 'select', label: 'Hauteur de la pyramide', default: 6,
            aide: 'Ce n\'est pas la hauteur qui fait la difficulté, c\'est le nombre de lignes '
                + 'À TROUVER : une pyramide de sept lignes dont quatre sont écrites est plus '
                + 'facile qu\'une de quatre lignes toute vide.',
            options: HAUTEURS
        },
        {
            id: 'difficulte', type: 'select', label: 'Lignes déjà écrites', default: 'moyen',
            aide: 'La fiche de la revue en met deux côte à côte : une commencée — « l\'Extrait » '
                + '— et une toute vide — « En direct ». C\'est un exemple travaillé suivi de '
                + 'l\'exercice, et cela explique la règle mieux qu\'une consigne.',
            options: Object.values(DIFFICULTES).map(d => ({ value: d.id, label: d.label }))
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const hauteur = HAUTEURS.some(h => h.value === Number(p.hauteur))
            ? Number(p.hauteur) : 6;
        const difficulte = DIFFICULTES[p.difficulte] ? p.difficulte : 'moyen';

        // `rang` fait tourner la lettre de départ d'un bloc à l'autre : sur
        // une fiche, deux pyramides qui commencent par la même lettre se lisent
        // comme un doublon.
        const py = creerPyramide({ hauteur, difficulte, rng, rang: Number(ctx.index) || 0 });
        const q = qualitePyramide(py);

        return makeItem({
            seed: rng.seed,
            generatorId: 'voc.pyramide-fiche',
            skillId: 'voc.anagramme',
            answerKind: 'grid',
            prompt: {
                text: `Pyramide de ${hauteur} lignes : ${q.aTrouver} mots à trouver.`,
                papier: 'Pyramide — une lettre de plus à chaque ligne.',
                html: `<div class="game-question">Pyramide de ${hauteur} lignes</div>`
            },
            answer: q.mots.join(' → '),
            // LE CORRIGÉ DIT LA LETTRE GAGNÉE À CHAQUE MARCHE, pas seulement le
            // mot : c'est ce qu'on montre au tableau quand un élève bloque, et
            // c'est la seule chose qui fasse comprendre pourquoi ça marchait.
            explanation: py.barreaux.slice(1)
                .map((b, i) => `${py.barreaux[i].mot} + ${q.ajouts[i]} = ${b.mot}`)
                .join(' ; ') + '.',
            difficulty: Math.max(1, Math.min(3, Math.round(q.aTrouver / 2))),
            meta: {
                hauteur,
                difficulte,
                barreaux: py.barreaux,
                donnes: py.donnes,
                mots: q.mots,
                ajouts: q.ajouts,
                aTrouver: q.aTrouver
            }
        });
    }
};
