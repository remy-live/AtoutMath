// REPRÉSENTER {x ∈ ℝ | |x − a| ⋈ r} — LA FEUILLE DE RÉMY, HUIT BARREAUX.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, photo d'une feuille de Seconde : « j'aimerai ce style d'exercice ».
//
//     1. Dans chaque cas, représenter l'ensemble des nombres réels x tels que
//        a. |x − 2| = 5        c. |x − 3| ⩽ 1,5
//        b. |x + 4| = 1        d. |x + 2| < 4,5
//
// CE QU'ON RÉUTILISE, ET POURQUOI ON NE RÉÉCRIT RIEN.
//
//   · LE DESSIN vient de `generators/intervalles.js`. Cet axe-là porte déjà
//     tout ce qu'on a mesuré avec Rémy — l'épaisseur du trait (« les
//     intervalles font grossier »), la couleur (« pourquoi le trait est au
//     dessus, fais-le d'une autre couleur »), la hauteur du crochet (« ça
//     recouvre les chiffres »). Un second axe dessiné à la main les aurait
//     tous perdus, et deux droites graduées du même logiciel n'auraient pas eu
//     la même tête.
//
//   · LE QCM vient de l'activité `buttons`, comme le chapitre des intervalles.
//     Rémy, la dernière fois que je l'avais oublié : « pourquoi n'utilises tu
//     pas le système de QCM, pourquoi as tu tout refait ».
//
//   · LES MARCHES viennent de `core/progression.js` — les cases à cocher,
//     « convenu de manière globale », et non un menu de difficulté.
//
//   · LES MATHÉMATIQUES viennent de `core/valeursAbsolues.js`, éprouvées
//     seules et sans navigateur.
//
// ── POURQUOI LA RÉPONSE EST UN DESSIN ───────────────────────────────────────
//
// Parce que c'est la consigne : « REPRÉSENTER l'ensemble ». Et parce que c'est
// là que la faute se voit. Un élève qui écrit « x = −3 ou x = 7 » peut l'avoir
// obtenu en résolvant deux équations sans jamais comprendre qu'il s'agit d'une
// distance ; le même, devant quatre droites graduées, doit reconnaître DEUX
// POINTS symétriques autour de 2 — et s'il a lu |x + 4| comme la distance à 4,
// son dessin est à huit unités de là, ce qui ne se rattrape par aucun calcul.
//
// CE N'EST PAS UNE CONSTRUCTION. La ligne rouge — « je ne veux pas de
// construction géométrique avec des outils virtuels » — vise les instruments
// de tracé : le compas qu'on fait tourner, l'équerre qu'on pose. Ici l'élève
// ne trace rien : il RECONNAÎT parmi quatre dessins, exactement comme le
// chapitre des intervalles le fait depuis septembre. Et la feuille imprimable
// garde l'exercice au crayon, où il se trace pour de bon.

import { makeItem } from '../items.js';
import { axeHtml } from './intervalles.js';
import {
    MARCHES, tirerValeurAbsolue, dessinDe, solutionTexte, fautesValeurAbsolue,
    pourquoiTexte, barresTexte, distanceTexte, nb
} from '../valeursAbsolues.js';
import {
    paramMarches, marchesCochees, marcheAuRang, conseilProgression, totalDe
} from '../progression.js';

const COMPETENCE_LIRE = 'nb.valeur-absolue.distance';
const COMPETENCE_REPRESENTER = 'nb.valeur-absolue.representer';
const MOT = 'barreau';

/** Le dessin d'un ensemble solution, prêt pour l'énoncé ou pour un choix. */
function axeDe(sol, titre) {
    const d = dessinDe(sol);
    return axeHtml(d.parts, { points: d.points, titre });
}

/**
 * BARREAU 1 — ON NE RÉSOUT PAS, ON LIT.
 *
 * « |x − 2| se lit : ... ». C'est le barreau qui porte tout le chapitre, et
 * c'est pour cela qu'il vient seul et en premier : celui qui répond « la
 * distance entre x et 2 » n'aura plus jamais à résoudre d'équation ici.
 *
 * LES TROIS LEURRES SONT LES TROIS LECTURES FAUSSES, et la deuxième est celle
 * qui coûte le chapitre entier — lire |x + 4| comme « la distance à 4 ».
 */
function itemLire(rng, q) {
    const c = q.centre;
    const choix = [
        { value: 'ok', label: distanceTexte(c), correct: true },
        { value: 'signe', label: distanceTexte(-c), correct: false,
            why: `Attention au signe. ${barresTexte(c, q.ecritPlus)} s'écrit aussi `
                + `|x − (${nb(c)})| : c'est ${nb(c)} qui est le centre.` },
        { value: 'zero', label: `la distance entre x et 0`, correct: false,
            why: `|x| serait la distance à 0. Ici le nombre ${nb(c)} est dans les barres.` },
        { value: 'calcul', label: `la valeur de x moins ${nb(c)}`, correct: false,
            why: 'Une valeur absolue n\'est jamais négative : ce n\'est pas une '
                + 'soustraction, c\'est la LONGUEUR qui sépare les deux nombres.' }
    ];
    for (let i = choix.length - 1; i > 0; i--) {
        const j = rng.int(0, i);
        [choix[i], choix[j]] = [choix[j], choix[i]];
    }
    const barres = barresTexte(c, q.ecritPlus);
    return makeItem({
        seed: rng.seed,
        generatorId: 'nb.valeur-absolue',
        skillId: COMPETENCE_LIRE,
        answerKind: 'choice',
        prompt: {
            text: `${barres} se lit : ?`,
            html: `<div class="game-question">Comment se lit <b>${barres}</b> ?</div>`,
            papier: `${barres} se lit : ………………………………`
        },
        answer: 'ok',
        choices: choix,
        hints: [
            'Deux barres autour d\'une différence, c\'est une DISTANCE : |7 − 2| = 5, '
                + 'et 5 est bien ce qui sépare 2 de 7 sur la droite graduée.',
            `Ici la différence est x − (${nb(c)}).`
        ],
        explanation: `${barres} = |x − (${nb(c)})| est ${distanceTexte(c)}. `
            + 'C\'est la seule chose à retenir de ce chapitre : tout le reste en découle.',
        difficulty: 1,
        meta: { marche: 'lire' }
    });
}

/**
 * BARREAU 8 — L'AUTRE SENS : on montre l'ensemble, on demande la condition.
 *
 * C'est la question que la feuille ne pose pas et que le contrôle pose. Elle
 * ne s'invente pas à partir de la précédente : savoir dessiner [1,5 ; 4,5] à
 * partir de |x − 3| ⩽ 1,5 n'apprend pas à voir, devant ce segment, que son
 * CENTRE est 3 et son RAYON 1,5. C'est pourtant le geste utile — celui qui
 * sert ensuite pour les encadrements et les valeurs approchées.
 */
function itemInverse(rng, q) {
    const bonne = q.enonce;
    const faux = fautesValeurAbsolue(q).slice(0, 3).map((f, i) => ({
        value: 'faux' + i,
        // LA CONDITION QUI DONNERAIT CE DESSIN-LÀ : on retourne le leurre. Un
        // leurre écrit au hasard s'écarterait du dessin sans rien apprendre ;
        // celui-ci dit « tu as lu CE dessin », et son `why` nomme l'écart.
        label: conditionDe(f.sol, q),
        correct: false,
        why: f.why
    })).filter((c) => c.label && c.label !== bonne);

    const choix = [{ value: 'ok', label: bonne, correct: true }, ...faux];
    for (let i = choix.length - 1; i > 0; i--) {
        const j = rng.int(0, i);
        [choix[i], choix[j]] = [choix[j], choix[i]];
    }
    return makeItem({
        seed: rng.seed,
        generatorId: 'nb.valeur-absolue',
        skillId: COMPETENCE_REPRESENTER,
        answerKind: 'choice',
        prompt: {
            text: `Quelle condition décrit l'ensemble dessiné ? (${solutionTexte(q.solution)})`,
            html: '<div class="game-question">Quelle condition sur x décrit '
                + 'l\'ensemble dessiné ?</div>'
                + axeDe(q.solution, `l'ensemble ${solutionTexte(q.solution)}`),
            // SUR LE PAPIER, L'ENSEMBLE EST DESSINÉ À DROITE, pas écrit en
            // crochets dans la question. C'est tout le barreau 8 : lire un AXE
            // et en déduire la condition. Écrire « [1 ; 5] » dans l'énoncé
            // donnait la moitié du travail — il n'y avait plus qu'à traduire
            // deux crochets, sans jamais regarder un dessin.
            papier: 'Écris la condition sur x qui décrit l’ensemble dessiné :'
        },
        answer: 'ok',
        choices: choix,
        hints: [
            'Cherche le CENTRE du dessin — le milieu des deux bornes — puis le RAYON, '
                + 'la distance du centre à chaque borne.',
            `Le centre est ${nb(q.centre)} et le rayon ${nb(q.rayon)}.`
        ],
        explanation: pourquoiTexte(q),
        difficulty: 3,
        // `solution` POUR QUE LA FICHE PUISSE LE DESSINER, et `donnee` pour
        // qu'elle sache que ce tracé est l'ÉNONCÉ et non la réponse : sur ce
        // barreau-là, l'axe est tracé sur les DEUX feuilles. Sans ce drapeau,
        // la feuille de l'élève sortait un axe vide sous « décris l'ensemble
        // dessiné » — une question dont on a effacé la donnée, c'est-à-dire
        // insoluble.
        meta: { marche: 'inverse', solution: q.solution, donnee: true,
            reponse: q.enonce }
    });
}

/** La condition |x − a| ⋈ r qui donnerait cet ensemble-là, ou '' si aucune. */
function conditionDe(sol, modele) {
    if (sol.sorte === 'points') {
        // Un ensemble réduit à UN point ne s'écrit pas |x − a| = r avec r > 0 :
        // ce leurre-là n'a pas d'écriture, et on le laisse tomber plutôt que
        // d'en inventer une fausse.
        if (sol.valeurs.length !== 2) return '';
        const [g, d] = sol.valeurs;
        return enonceDepuis((g + d) / 2, (d - g) / 2, '=', modele);
    }
    const I = sol.sorte === 'intervalle' ? sol.I : null;
    if (I) {
        if (I.a === null || I.b === null) return '';
        return enonceDepuis((I.a + I.b) / 2, (I.b - I.a) / 2, I.ea ? '⩽' : '<', modele);
    }
    const [g, d] = sol.parts;
    return enonceDepuis((g.b + d.a) / 2, (d.a - g.b) / 2, g.eb ? '⩾' : '>', modele);
}

function enonceDepuis(centre, rayon, relation, modele) {
    if (!(rayon > 0)) return '';
    // On arrondit au centième : les demi-rayons tombent juste, mais une
    // moyenne de décimaux peut traîner un 2,9999999999999996.
    const r = Math.round(rayon * 100) / 100;
    const c = Math.round(centre * 100) / 100;
    return `${barresTexte(c, modele.ecritPlus && c < 0)} ${relation} ${nb(r)}`;
}

/**
 * BARREAUX 2 À 7 — REPRÉSENTER, en choisissant parmi quatre droites graduées.
 */
function itemRepresenter(rng, q) {
    const faux = fautesValeurAbsolue(q).slice(0, 3);
    const choix = [
        { value: 'ok', label: axeDe(q.solution, solutionTexte(q.solution)), correct: true },
        ...faux.map((f, i) => ({
            value: 'faux' + i,
            label: axeDe(f.sol, 'proposition'),
            correct: false,
            why: f.why
        }))
    ];
    for (let i = choix.length - 1; i > 0; i--) {
        const j = rng.int(0, i);
        [choix[i], choix[j]] = [choix[j], choix[i]];
    }
    return makeItem({
        seed: rng.seed,
        generatorId: 'nb.valeur-absolue',
        skillId: COMPETENCE_REPRESENTER,
        answerKind: 'choice',
        prompt: {
            text: `Représenter l'ensemble des réels x tels que ${q.enonce}`,
            html: '<div class="game-question">Représente l\'ensemble des nombres réels '
                + `x tels que <b>${q.enonce}</b>.</div>`,
            papier: `${q.enonce}`
        },
        answer: 'ok',
        choices: choix,
        hints: [
            `${q.enonce} se lit : ${q.distance} ${MOT_RELATION[q.relation]} ${nb(q.rayon)}.`,
            q.solution.sorte === 'points'
                ? `Deux nombres sont à ${nb(q.rayon)} de ${nb(q.centre)} : un de chaque côté.`
                : `Place ${nb(q.centre)} sur l'axe, puis compte ${nb(q.rayon)} à gauche `
                    + 'et à droite.'
        ],
        // LE SCHÉMA DE LA CORRECTION EST LE BON DESSIN : après un échec, c'est
        // lui qu'il faut avoir sous les yeux, pas une phrase de plus.
        schemas: ['', axeDe(q.solution, solutionTexte(q.solution))],
        explanation: pourquoiTexte(q),
        difficulty: q.solution.sorte === 'exterieur' ? 3 : 2,
        // LA SOLUTION VOYAGE AVEC L'ITEM, et c'est ce qui rend la feuille
        // dessinable. RÉMY : « tu peux dessiner l'axe avec ou sans valeur pour
        // l'impression ». Le papier ne sait pas lire le SVG du schéma — il
        // dessine en traits —, il lui faut l'ensemble sous forme de BORNES.
        meta: { marche: q.marche, solution: q.solution, centre: q.centre, rayon: q.rayon }
    });
}

const MOT_RELATION = {
    '=': 'vaut exactement', '⩽': 'est au plus', '<': 'est strictement inférieure à',
    '⩾': 'est au moins', '>': 'est strictement supérieure à'
};

// PAS DE RÉGLAGE D'AVANT LES CASES : cet exercice naît avec elles, aucun
// parcours enregistré ne porte d'ancien « niveau » à traduire. On ne passe donc
// RIEN à `marchesCochees`, et surtout pas `null` — voir ci-dessous.
//
// `null` N'EST PAS `undefined`, ET CELA A COÛTÉ L'EXERCICE ENTIER. Une valeur
// par défaut de paramètre ne s'applique qu'à `undefined` : `marchesCochees(p,
// M, null)` reçoit bien `null`, lit `ancien.cle` et lève « Cannot read
// properties of null ». L'écran restait à « 0 / 8 questions », sans une
// proposition — et AUCUNE épreuve ne le voyait, parce qu'elles cochaient
// toutes un barreau explicitement. Une sonde qui ne joue que les réglages
// qu'elle pose ne joue jamais le réglage par défaut, qui est pourtant celui
// que le professeur reçoit en ouvrant l'exercice.

export const valeurAbsolueGenerator = {
    id: 'nb.valeur-absolue',
    label: 'Valeur absolue : représenter sur un axe',
    skills: [COMPETENCE_LIRE, COMPETENCE_REPRESENTER],
    answerKinds: ['choice'],
    ecrit: true,
    // La longueur suit le nombre de barreaux cochés — voir core/duree.js.
    conseil: (p) => conseilProgression(marchesCochees(p, MARCHES).length),
    params: [
        paramMarches({ marches: MARCHES, mot: MOT })
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        // LE BARREAU VIENT DU RANG DE LA QUESTION, pas d'un réglage figé :
        // c'est ce qui fait monter l'élève au fil de la série, dans les
        // barreaux que le professeur a cochés et selon le partage qu'il a tiré.
        const marche = marcheAuRang(ctx.index ?? 0,
            marchesCochees(params, MARCHES), totalDe(ctx, params), params);
        const q = tirerValeurAbsolue({ rng, marche });
        // LE BARREAU 1 NE S'IMPRIME PAS SUR UNE FICHE D'AXES.
        //
        // « |x − 5| se lit : ? » est un choix de vocabulaire entre quatre
        // phrases ; sa réponse n'est pas un dessin. Sur la fiche demandée par
        // Rémy — l'énoncé à gauche, la droite graduée à droite —, cette
        // question sortait une ligne dont la moitié droite était BLANCHE :
        // mesuré, premier bloc de la feuille, zéro trait.
        //
        // Une ligne qu'on ne peut pas remplir occupe quand même sa place. On
        // rend donc la question du barreau suivant, qui travaille la même
        // notion avec un dessin. Le barreau coché par le professeur reste
        // servi À L'ÉCRAN, où ses quatre phrases existent.
        if (marche === 'lire' && ctx.papier) return itemRepresenter(rng, q);
        if (marche === 'lire') return itemLire(rng, q);
        if (marche === 'inverse') return itemInverse(rng, q);
        return itemRepresenter(rng, q);
    }
};
