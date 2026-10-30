// PLUS PETIT, PLUS GRAND… OU ÉGAL — sixième, bloc 3.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, dans sa progression de sixième : l'inégalité LARGE ou STRICTE, et
// encadrer un nombre. Rien n'existait à ce niveau — le logiciel savait
// comparer deux nombres (« Duel de Décimaux »), c'est-à-dire choisir entre
// `<`, `=` et `>`, mais jamais distinguer `<` de `⩽`.
//
// ── CE QUI SE JOUE ICI, ET QUI N'EST PAS UNE QUESTION DE VOCABULAIRE ───────
//
// « 7 ⩽ 7 » est VRAI. C'est la phrase qui fait trébucher toute une classe, et
// elle n'est pas un détail de notation : tout le collège s'appuie dessus —
// un intervalle fermé, une condition d'arrêt, un encadrement. L'élève qui lit
// `⩽` comme « strictement plus petit, ou alors je ne sais pas » se trompera
// sur chacun.
//
// ET ENCADRER, C'EST ÉCRIRE DEUX INÉGALITÉS À LA FOIS. « 3 < 3,7 < 4 » se lit
// de gauche à droite comme une seule phrase ; l'écrire à l'envers — « 4 > 3,7
// > 3 » — est juste mais ne se fait pas, et surtout, l'erreur ordinaire est
// d'encadrer par les mauvais voisins : entre deux DIZAINES quand on demandait
// deux entiers, ou l'inverse.
//
// ── LES QUATRE ERREURS ENCODÉES ────────────────────────────────────────────
//
//   1. `⩽` lu comme `<` — « 7 ⩽ 7 » jugé faux.
//   2. Le sens de l'inégalité retourné — « 9 ⩽ 4 » jugé vrai.
//   3. L'encadrement au mauvais rang : 47 entre 40 et 50 quand on demandait
//      deux entiers consécutifs, ou entre 46 et 48.
//   4. L'encadrement qui ENCADRE DE TRAVERS : les deux bornes du même côté.

import { makeItem, finalizeChoices } from '../items.js';
import {
    paramMarches, marchesCochees, marcheAuRang, conseilProgression, totalDe
} from '../progression.js';

const COMPETENCE = 'num.dec.compare';

/** Écriture française d'un décimal, sans traîne de virgule flottante. */
const fr = (x) => String(Number(x.toFixed(4))).replace('.', ',');

const MARCHES = [
    { id: 'large-strict', nom: 'Vrai ou faux : < et ⩽' },
    { id: 'encadrer-entier', nom: 'Encadrer entre deux entiers' },
    { id: 'encadrer-dizaine', nom: 'Encadrer entre deux dizaines, deux centaines' },
    { id: 'encadrer-dixieme', nom: 'Encadrer entre deux dixièmes' }
];
const TEMPS = {};
const MOT = 'palier';
const ANCIEN = { cle: 'palier' };

/**
 * UNE AFFIRMATION À JUGER, et le cas qui compte le plus.
 *
 * UNE FOIS SUR TROIS, LES DEUX NOMBRES SONT ÉGAUX. C'est le seul cas où `<`
 * et `⩽` ne disent pas la même chose, donc le seul qui apprenne quelque
 * chose : avec deux nombres distincts, répondre au hasard sur le signe marche
 * une fois sur deux sans rien comprendre.
 */
function tirerAffirmation(rng) {
    const a = rng.int(2, 40);
    const egaux = rng.int(1, 3) === 1;
    const b = egaux ? a : (rng.int(1, 2) === 1 ? a + rng.int(1, 9) : a - rng.int(1, Math.min(9, a - 1)));
    const signe = ['<', '⩽', '>', '⩾'][rng.int(0, 3)];
    const vrai = signe === '<' ? a < b
        : signe === '⩽' ? a <= b
            : signe === '>' ? a > b : a >= b;
    return { a, b, signe, vrai, egaux };
}

/** Le mot qui dit pourquoi, et il nomme l'erreur plutôt que la bonne réponse. */
function pourquoi({ a, b, signe, vrai, egaux }) {
    const nom = { '<': 'strictement plus petit que', '⩽': 'plus petit ou égal à',
        '>': 'strictement plus grand que', '⩾': 'plus grand ou égal à' }[signe];
    if (egaux) {
        return vrai
            ? `${a} et ${b} sont ÉGAUX, et « ${nom} » accepte l'égalité : la barre `
                + 'sous le signe veut dire « ou égal ».'
            : `${a} et ${b} sont ÉGAUX. « ${nom} » REFUSE l'égalité : il faudrait `
                + `${signe === '<' ? '⩽' : '⩾'} pour que ce soit vrai.`;
    }
    return `${a} est ${a < b ? 'plus petit' : 'plus grand'} que ${b}, donc `
        + `« ${a} ${signe} ${b} » est ${vrai ? 'vrai' : 'faux'}.`;
}

/**
 * UN ENCADREMENT, AU RANG DEMANDÉ.
 *
 * `pas` est le rang : 1 pour deux entiers consécutifs, 10 pour deux dizaines,
 * 0,1 pour deux dixièmes. Le nombre encadré ne tombe JAMAIS sur une borne —
 * « 40 < 40 < 50 » n'a pas de sens, et c'est le tirage qui doit l'empêcher,
 * pas une explication.
 */
function tirerEncadrement(rng, pas) {
    for (let essai = 0; essai < 60; essai++) {
        const valeur = pas === 10 ? rng.int(12, 980)
            : pas === 1 ? Number((rng.int(2, 40) + rng.int(1, 9) / 10).toFixed(1))
                : Number((rng.int(1, 20) + rng.int(1, 99) / 100).toFixed(2));
        // ON CALCULE EN CENTIÈMES, ET C'EST UNE CORRECTION.
        //
        // `Math.floor(16.7 / 0.1)` rend 166 et non 167 : 16,7 ne s'écrit pas
        // exactement en virgule flottante. L'encadrement sortait alors
        // « 16,6 < 16,7 < 16,7 » — une borne ÉGALE au nombre encadré, c'est-
        // à-dire un énoncé sans réponse. Le garde qui l'a vu est dans
        // `tests/sixiemeBlocs3et8.test.mjs` ; à l'œil, sur un écran, cela
        // passait pour une question comme une autre.
        //
        // Tout devient entier, le reste suit.
        const C = 100;
        const v = Math.round(valeur * C);
        const p = Math.round(pas * C);
        const bas = Math.floor(v / p) * p;
        const haut = bas + p;
        if (v === bas || v === haut) continue;
        return { valeur, bas: bas / C, haut: haut / C, pas };
    }
    return { valeur: 47, bas: 40, haut: 50, pas: 10 };
}

const NOM_DU_RANG = {
    10: 'deux dizaines',
    1: 'deux entiers qui se suivent',
    0.1: 'deux dixièmes'
};

/**
 * LE MÊME RANG, DIT COURT — pour la feuille, et pour elle seule.
 *
 * Rémy, capture de la fiche à l'appui : « Et un énoncé du genre encadre à
 * l'unité ». « Encadre 31,6 entre deux entiers qui se suivent : » tenait sur
 * deux lignes, poussait les pointillés à la ligne suivante, et répétait dix
 * fois ce qu'une consigne dit une fois.
 *
 * ON GARDE LE RANG DANS L'ÉNONCÉ, et c'est volontaire : une même feuille mêle
 * les trois paliers — unité, dizaine, dixième —, donc la consigne de
 * l'exercice ne peut pas le dire pour toutes les questions. Trois mots par
 * ligne suffisent à le rappeler.
 */
const COURT_DU_RANG = { 10: 'à la dizaine', 1: 'à l\'unité', 0.1: 'au dixième' };

export const encadrementGenerator = {
    id: 'num.encadrement',
    label: 'Inégalité large ou stricte, et encadrement',
    skills: [COMPETENCE],
    answerKinds: ['choice'],
    ecrit: true,
    conseil: (p) => conseilProgression(marchesCochees(p, MARCHES, ANCIEN).length, 3),
    params: [paramMarches({ marches: MARCHES, groupes: TEMPS, mot: MOT, ancien: ANCIEN })],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const i = Number(ctx.index) || 0;
        const marche = marcheAuRang(i, marchesCochees(p, MARCHES, ANCIEN),
            totalDe(ctx, p), p, 3);

        if (marche === 'large-strict') {
            const aff = tirerAffirmation(rng);
            const phrase = `${aff.a} ${aff.signe} ${aff.b}`;

            // ── SUR LE PAPIER, C'EST LE SIGNE QU'ON ÉCRIT ────────────────
            //
            // RÉMY, capture de la fiche à l'appui : « Mets juste plutôt le
            // signe inégalité à compléter sur les exercices à imprimers. »
            //
            // « Vrai ou faux : 30 < 21 ……… » n'est pas un exercice de papier.
            // À l'écran, deux bulles VRAI/FAUX font le travail ; sur une
            // feuille, l'élève écrit « vrai » sur une ligne de points et
            // n'écrit AUCUN signe — alors que le signe EST le geste du
            // chapitre.
            //
            // LE GÉNÉRATEUR SAIT POUR QUI IL ÉCRIT (`ctx.papier`), donc ce
            // n'est pas le même énoncé rhabillé : c'en est un AUTRE, avec sa
            // propre réponse. C'est ce qui garde le corrigé honnête — changer
            // seulement le libellé aurait imprimé « vrai » sous une question
            // qui demande un signe, exactement le piège de la fiche des
            // formules (« la bonne réponse est =A1+B1 pas 17 »).
            //
            // CE QU'ON PERD, ET IL FAUT LE DIRE : la feuille ne distingue plus
            // `<` de `⩽`, puisqu'on complète par <, > ou =. L'écran garde
            // cette marche entière — c'est là qu'elle s'apprend, une question
            // sur trois portant sur deux nombres égaux —, et la feuille
            // entraîne la comparaison. C'est l'arbitrage de Rémy.
            if (ctx.papier) {
                const signe = aff.a < aff.b ? '<' : aff.a > aff.b ? '>' : '=';
                return makeItem({
                    seed: rng.seed,
                    generatorId: 'num.encadrement',
                    skillId: COMPETENCE,
                    answerKind: 'choice',
                    prompt: {
                        text: `Complète : ${aff.a} … ${aff.b}`,
                        papier: `${aff.a} ……… ${aff.b}`
                    },
                    answer: signe,
                    // LES TROIS SIGNES RESTENT OFFERTS quand la feuille est
                    // tirée en QCM : une question à compléter dont on ne
                    // donnerait pas les signes possibles n'aurait plus de
                    // version à choix.
                    choices: [
                        { value: '<', label: '<', correct: signe === '<' },
                        { value: '>', label: '>', correct: signe === '>' },
                        { value: '=', label: '=', correct: signe === '=' }
                    ],
                    explanation: aff.egaux
                        ? `${aff.a} et ${aff.b} sont ÉGAUX : on écrit =.`
                        : `${aff.a} est plus ${aff.a < aff.b ? 'petit' : 'grand'} que `
                            + `${aff.b} : on écrit ${signe}.`,
                    difficulty: aff.egaux ? 2 : 1,
                    meta: { marche, a: aff.a, b: aff.b, signe, egaux: aff.egaux,
                        theme: `signe-${signe}` }
                });
            }
            return makeItem({
                seed: rng.seed,
                generatorId: 'num.encadrement',
                skillId: COMPETENCE,
                answerKind: 'choice',
                prompt: {
                    text: `Vrai ou faux : ${phrase} ?`,
                    html: `<div class="game-question">Vrai ou faux&nbsp;?<br>`
                        + `<b style="font-size:1.6em">${phrase}</b></div>`,
                    papier: `Vrai ou faux : ${phrase}`
                },
                answer: aff.vrai ? 'vrai' : 'faux',
                choices: [
                    { value: 'vrai', label: 'Vrai', correct: aff.vrai,
                        why: aff.vrai ? undefined : pourquoi(aff) },
                    { value: 'faux', label: 'Faux', correct: !aff.vrai,
                        why: aff.vrai ? pourquoi(aff) : undefined }
                ],
                hints: [
                    'La barre SOUS le signe veut dire « ou égal » : ⩽ se lit '
                        + '« plus petit OU ÉGAL ».',
                    aff.egaux
                        ? `Ici les deux nombres sont égaux : tout se joue sur la barre.`
                        : `Commence par comparer ${aff.a} et ${aff.b}.`
                ],
                explanation: pourquoi(aff),
                difficulty: aff.egaux ? 2 : 1,
                meta: { marche, a: aff.a, b: aff.b, signe: aff.signe, egaux: aff.egaux,
                    theme: `vf-${aff.signe}-${aff.egaux}` }
            });
        }

        const pas = marche === 'encadrer-dizaine' ? 10
            : marche === 'encadrer-dixieme' ? 0.1 : 1;
        const e = tirerEncadrement(rng, pas);
        const ecrire = (b, h) => `${fr(b)} < ${fr(e.valeur)} < ${fr(h)}`;
        const bonne = ecrire(e.bas, e.haut);

        // LES TROIS ERREURS, et chacune a un nom. La dernière — les deux
        // bornes du même côté — n'est pas une faute de calcul mais de
        // LECTURE : l'élève a écrit son encadrement sans le relire.
        const leurres = [
            {
                v: ecrire(e.haut, e.haut + e.pas),
                why: `${fr(e.valeur)} n'est pas entre ${fr(e.haut)} et `
                    + `${fr(e.haut + e.pas)} : il est plus PETIT que ${fr(e.haut)}.`
            },
            {
                v: ecrire(e.bas - e.pas, e.bas),
                why: `${fr(e.valeur)} est plus GRAND que ${fr(e.bas)} : l'encadrement `
                    + 'est d\'un cran trop bas.'
            },
            {
                v: ecrire(e.haut, e.bas),
                why: 'Les deux bornes sont inversées : un encadrement se lit de '
                    + 'gauche à droite, du plus petit au plus grand.'
            }
        ];

        return makeItem({
            seed: rng.seed,
            generatorId: 'num.encadrement',
            skillId: COMPETENCE,
            answerKind: 'choice',
            prompt: {
                text: `Encadre ${fr(e.valeur)} entre ${NOM_DU_RANG[e.pas]}.`,
                html: `<div class="game-question">Encadre <b>${fr(e.valeur)}</b> `
                    + `entre ${NOM_DU_RANG[e.pas]}.</div>`,
                // L'ÉNONCÉ COURT SUR LA FEUILLE — voir `COURT_DU_RANG`.
                papier: `Encadre ${COURT_DU_RANG[e.pas]} : ……… < ${fr(e.valeur)} < ………`
            },
            answer: bonne,
            choices: finalizeChoices(rng, [
                { value: bonne, label: bonne, correct: true },
                ...leurres.map(l => ({ value: l.v, label: l.v, why: l.why }))
            ], { count: 4, filler: (r) => ecrire(e.bas - r.int(2, 4) * e.pas, e.haut) }),
            hints: [
                e.pas === 10
                    ? 'Une dizaine se termine par 0 : cherche celle qui vient juste '
                        + 'avant, puis la suivante.'
                    : 'Cherche le nombre juste en dessous, puis celui juste au-dessus.',
                `Le nombre encadré doit être STRICTEMENT entre les deux.`
            ],
            explanation: `${fr(e.bas)} et ${fr(e.haut)} sont ${NOM_DU_RANG[e.pas]} qui `
                + `entourent ${fr(e.valeur)} : on écrit ${bonne}.`,
            difficulty: e.pas === 0.1 ? 3 : 2,
            meta: { marche, valeur: e.valeur, bas: e.bas, haut: e.haut, pas: e.pas,
                theme: `enc-${e.pas}-${e.bas}` }
        });
    }
};
