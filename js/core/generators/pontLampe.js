// LE PONT ET LA LAMPE — l'énigme servie, avec son minimum et son piège.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 4 novembre : « Oui super et il faut que ce soit joli », puis « le A » —
// la nuit, la lanterne, les randonneurs.
//
// CE FICHIER NE CALCULE RIEN : tout est dans `core/pontLampe.js`, qui ne
// connaît ni l'écran ni le catalogue et qui s'éprouve sous Node. Ici on habille
// — les prénoms, la consigne, les indices —, et l'on range dans `meta` ce que
// l'activité et la feuille iront y chercher.
//
// ── LA RÉPONSE EST UN NOMBRE DE MINUTES, ET NON UN CHEMIN ──────────────────
//
// Plusieurs chemins coûtent 17 minutes sur l'énigme des livres, et compter faux
// celui qui n'est pas le nôtre serait absurde. Ce qui se juge, c'est le TOTAL :
// l'élève a réussi quand tout le monde est passé dans le temps minimal. C'est
// la différence exacte avec La Traversée, où l'on ne jugeait que l'arrivée.

import { makeItem } from '../items.js';
import { direLeTrajet, enigmeDuPont, PALIERS, PLACES } from '../pontLampe.js';

const SKILL = 'num.logique.pont';

/** Les trois paliers, dans l'ordre où ils s'apprennent. */
export const NIVEAUX = [
    { value: '1', label: 'Trois marcheurs — on apprend la règle' },
    { value: '2', label: 'Quatre marcheurs — l\'énigme des livres' },
    { value: '3', label: 'Cinq marcheurs — vitesses tirées au sort' }
];

/**
 * LA CONSIGNE DIT LES TROIS RÈGLES, ET RIEN D'AUTRE.
 *
 * Deux au plus, la lampe traverse avec, le groupe va au rythme du plus lent.
 * Celle qu'on oublie toujours est la deuxième : sans elle, l'élève fait passer
 * tout le monde d'un coup et ne comprend pas pourquoi on lui parle de retours.
 */
function consigneDe(e) {
    // CENT SOIXANTE SIGNES AU PLUS, et c'est une règle du dépôt que
    // `tests/enoncesCourts.test.mjs` garde : un énoncé qui déborde se lit
    // comme une leçon, et l'élève le saute. Le premier jet en faisait DEUX
    // CENT QUATRE-VINGT-DIX-NEUF — il récitait les trois règles.
    //
    // LES RÈGLES NE SONT PAS DANS L'ÉNONCÉ, elles sont dans l'instruction de
    // l'exercice, que l'élève ouvre quand il veut — et surtout elles sont dans
    // l'ÉCRAN : la lampe se voit, le pont refuse le troisième, et le message
    // du bas dit pourquoi. Ce que l'énoncé doit porter est ce que l'écran ne
    // dit pas : le but et son objectif chiffré.
    return `Il fait nuit, et il n'y a qu'une lampe. Fais passer les `
        + `${e.marcheurs.length} marcheurs en ${e.minutes} minutes — `
        + `${PLACES} au plus sur le pont, et la lampe doit revenir.`;
}

/**
 * LES INDICES, DU PLUS DOUX AU PLUS FRANC.
 *
 * LE DERNIER NE DONNE PAS LA SOLUTION, il donne L'IDÉE : « fais traverser les
 * deux plus lents ensemble ». Dire le premier coup priverait l'élève du seul
 * moment qui compte — celui où il voit que payer 10 minutes une fois vaut mieux
 * que de les payer deux fois.
 */
function indicesDe(e) {
    const lents = [...e.marcheurs].sort((a, b) => b.minutes - a.minutes).slice(0, 2);
    return [
        'La lampe doit revenir : après chaque traversée, quelqu\'un repart en arrière. '
            + 'Compte ces retours, ils coûtent aussi des minutes.',
        `Si le plus rapide accompagne chacun et revient à chaque fois, cela fait `
            + `${e.navette} minutes. C'est honnête, et ce n'est pas le mieux.`,
        `Essaie de faire traverser ${lents[0].nom} et ${lents[1].nom} ENSEMBLE. Leurs `
            + 'deux lenteurs ne comptent alors qu\'une seule fois — c\'est toute l\'énigme.'
    ];
}

export const pontLampeGenerator = {
    id: 'logique.pontLampe',
    label: 'Le Pont et la lampe',
    skills: [SKILL],
    answerKinds: ['grid'],
    params: [
        {
            id: 'niveau', type: 'select', label: 'Niveau', default: '2',
            aide: 'Le premier palier n\'a pas de piège : à trois marcheurs, la stratégie '
                + 'qui vient toute seule EST la meilleure, et l\'on y apprend la règle.',
            options: NIVEAUX
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const palier = Number((params || {}).niveau) || 2;
        // `ctx.index` DÉCIDE SI L'ON SERT L'ÉNIGME DE RÉFÉRENCE OU UNE VARIANTE :
        // la première est celle du livre, les suivantes sont tirées. Sans cela,
        // une feuille de quatre énigmes en imprimait quatre fois la même.
        const e = enigmeDuPont(PALIERS[palier] ? palier : 2, rng, ctx.index || 0);
        const consigne = consigneDe(e);
        return makeItem({
            seed: rng.seed,
            generatorId: 'logique.pontLampe',
            skillId: SKILL,
            answerKind: 'grid',
            prompt: {
                text: consigne,
                // LA CONSIGNE IMPRIMÉE EST GÉNÉRIQUE : la feuille prend `papier`
                // du PREMIER item et le pose en tête, alors qu'une feuille de
                // quatre énigmes en porte quatre. Les vitesses de chacune sont
                // écrites dans son propre bloc.
                papier: 'Deux au plus sur le pont, et la lampe doit revenir. Deux qui '
                    + 'traversent vont au rythme du plus lent. Écris les traversées et le total.',
                html: `<div class="game-question pl-consigne">${consigne}</div>`
            },
            // LE TOTAL, ET NON LE CHEMIN : plusieurs chemins coûtent 17 minutes.
            answer: String(e.minutes),
            hints: indicesDe(e),
            explanation: e.trajets.map(t => direLeTrajet(t, e.marcheurs)).join(' · ')
                + ` — ${e.minutes} minutes en tout.`,
            difficulty: palier,
            meta: {
                nom: e.nom,
                marcheurs: e.marcheurs,
                minutes: e.minutes,
                navette: e.navette,
                places: PLACES,
                trajets: e.trajets,
                // LA SOLUTION EN PHRASES, pour « Montre-moi » et pour le corrigé
                // de la feuille. Elle se fabrique ICI parce que c'est ici qu'on
                // a les prénoms ; l'activité n'aurait qu'à les recoller.
                solution: e.trajets.map(t => direLeTrajet(t, e.marcheurs))
            }
        });
    }
};
