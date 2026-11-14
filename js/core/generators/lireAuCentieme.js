// L'AXE AU CENTIÈME — les deux précisions sur la même droite.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, après avoir essayé « La Cascade de Loupes » : « Cascade de loupe, on
// comprend pas trop en fait. » Et, dans le même souffle, ce qu'il voudrait :
//
// > « on peut faire un exercice où on a un axe qui va de 8 à 9 donc 10
// > séparations et entre chaque dixième encore dix séparations (avec un trait
// > rouge pour les milieux) et on place un point et il faut lire, il faut
// > évidemment qu'il y ait de la place en largeur »
//
// Puis, en le voyant : « ne mets pas la croix au dessus, il faut qu'elle soit
// sur l'axe et tu peux mettre plusieurs points et aussi des axe qui commence à
// 3,5 et finissent à 3,6 pour faire des millièmes ».
//
// ── CE QUE LA CASCADE RATAIT, ET QU'IL A NOMMÉ ─────────────────────────────
//
// Elle racontait le zoom EN TROIS TEMPS, et l'élève regardait quelqu'un d'autre
// zoomer. Ici il n'y a pas de zoom : les deux précisions sont là, ensemble, sur
// une seule droite. Lire 8,47, c'est aller au grand trait d'après 8,4 puis
// compter sept petits — un seul geste, visible en entier.
//
// ── LES DEUX ÉCHELLES SONT LE MÊME DESSIN, UN CRAN PLUS FIN ────────────────
//
//   · de 8 à 9    : un grand trait vaut un DIXIÈME, un petit un CENTIÈME ;
//   · de 3,5 à 3,6 : un grand trait vaut un CENTIÈME, un petit un MILLIÈME.
//
// Et c'est précisément ce que ce chapitre doit faire comprendre : la règle ne
// change pas, seul le nom des traits change. Un élève qui a lu 8,47 sait lire
// 3,547 — s'il a compris que « dix fois plus fin » ne veut pas dire « nouveau ».
//
// ── LES TROIS MARCHES SONT TROIS DISTANCES AU REPÈRE ───────────────────────
//
// Ce qui rend une lecture difficile ici n'est pas le nombre, c'est le NOMBRE DE
// PETITS TRAITS À COMPTER. Un repère est un grand trait ou le trait rouge du
// milieu ; entre deux repères il n'y a que quatre petits traits, donc aucun
// point n'est à plus de DEUX traits d'un repère. D'où :
//
//   1. SUR un repère — rien à compter, on nomme ce qu'on voit ;
//   2. JUSTE À CÔTÉ — un trait, d'un côté ou de l'autre ;
//   3. ENTRE DEUX REPÈRES — deux traits, aussi loin de l'un que de l'autre.
//
// Le générateur est PUR : le dessin vit dans `figures.js`.

import { makeItem, finalizeChoices } from '../items.js';
import { axeCentiemesSvg, figure } from '../figures.js';
import {
    paramMarches, marchesCochees, marcheAuRang, conseilProgression, totalDe
} from '../progression.js';

const SKILL = 'num.dec.graduations';

const LETTRES = ['A', 'B', 'C'];

/** Un nombre à la française, sans zéro inutile à la fin. */
const fr = (v, rang) => v.toFixed(rang)
    .replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '').replace('.', ',');

/**
 * LES DEUX ÉCHELLES.
 *
 * `rang` est le nombre de décimales de la réponse, `unite` ce que vaut UN PETIT
 * TRAIT. Le reste du générateur ne connaît que ces deux nombres — ajouter un
 * jour les dix-millièmes n'y changerait pas une ligne.
 */
const ECHELLES = {
    entiers: {
        nom: 'Des entiers (8 à 9) — on lit des centièmes',
        rang: 2, unite: 0.01, grand: 'dixième', petit: 'centième'
    },
    dixiemes: {
        nom: 'Des dixièmes (3,5 à 3,6) — on lit des millièmes',
        rang: 3, unite: 0.001, grand: 'centième', petit: 'millième'
    }
};

const MARCHES = [
    { id: 'reperes', nom: '1. Sur un grand trait ou sur le rouge' },
    { id: 'cote', nom: '2. Juste à côté d’un repère' },
    { id: 'entre', nom: '3. Entre deux repères' }
];
const LISTE = MARCHES.map(m => ({ id: m.id, nom: m.nom }));
const marcheDe = (id) => MARCHES.find(m => m.id === id) || MARCHES[1];

/**
 * LE CRAN D'UN POINT, selon la marche — en nombre de petits traits depuis le
 * bout gauche, de 1 à 99.
 *
 * LE REPÈRE SE CHOISIT ENTRE 5 ET 95, ET C'EST UNE ÉPREUVE QUI L'A VOULU. Pris
 * entre 0 et 100, le repère 100 plus deux traits donnait 102, rogné à 99 — qui
 * est à UN trait du repère 100, pas deux. Le rognage cassait silencieusement
 * l'invariant que la marche promet.
 */
function tirerLeCran(rng, marche) {
    if (marche === 'reperes') return rng.int(1, 19) * 5;
    const repere = rng.int(1, 19) * 5;
    const ecart = (marche === 'cote' ? 1 : 2) * (rng.int(0, 1) ? 1 : -1);
    return repere + ecart;
}

/**
 * PLUSIEURS POINTS SUR LE MÊME AXE — Rémy : « tu peux mettre plusieurs points ».
 *
 * DIX CRANS D'ÉCART AU MOINS, et ce n'est pas une marge de confort : la croix
 * fait quatorze unités de large et sa lettre autant, pour un cran de 8,6
 * unités. À cinq crans, deux croix se touchent ; à trois, les lettres se
 * recouvrent et l'on ne sait plus laquelle va avec laquelle.
 */
function tirerLesCrans(rng, marche, combien) {
    for (let essai = 0; essai < 200; essai++) {
        const crans = [];
        for (let i = 0; i < combien * 4 && crans.length < combien; i++) {
            const c = tirerLeCran(rng, marche);
            if (crans.every(x => Math.abs(x - c) >= 10)) crans.push(c);
        }
        if (crans.length === combien) return crans;
    }
    // LE FILET, et il ne devrait jamais servir : trois points à dix crans
    // d'écart tiennent largement sur cent. Mais un générateur qui rend une
    // liste trop courte casse la question sans rien dire.
    return Array.from({ length: combien }, (_, i) => 10 + i * 30);
}

export const lireAuCentiemeGenerator = {
    id: 'num.lire-au-centieme',
    label: 'L’Axe au Centième',
    skills: [SKILL],
    // `numeric` POUR LA RÉPONSE TAPÉE : le pavé, et la virgule dessus.
    // `choice` existe pour les défis, où l'on ne tape pas.
    answerKinds: ['numeric', 'choice'],
    ecrit: true,
    conseil: (p) => conseilProgression(marchesCochees(p, LISTE).length, 3),
    params: [
        paramMarches({ marches: LISTE, mot: 'marche' }),
        {
            id: 'echelle', type: 'select', label: 'L’échelle de la droite',
            default: 'entiers',
            aide: 'C’est le cœur de l’exercice : la règle ne change pas d’une '
                + 'échelle à l’autre, seul le nom des traits change.',
            options: [
                { value: 'entiers', label: ECHELLES.entiers.nom },
                { value: 'dixiemes', label: ECHELLES.dixiemes.nom },
                { value: 'melange', label: 'Les deux, en alternance' }
            ]
        },
        {
            id: 'points', type: 'select', label: 'Combien de points à lire',
            default: '1',
            options: [
                { value: '1', label: 'Un seul' },
                { value: '2', label: 'Deux (A et B)' },
                { value: '3', label: 'Trois (A, B et C)' }
            ]
        }
    ],

    generate(params = {}, ctx = {}) {
        const rng = ctx.rng;
        const p = params || {};
        const marche = marcheDe(marcheAuRang(Number(ctx.index) || 0,
            marchesCochees(p, LISTE), totalDe(ctx, p), p, 3));

        // L'ÉCHELLE ALTERNE SUR LE RANG quand on demande « les deux » : une
        // feuille de six droites doit en montrer trois de chaque, et non six
        // tirages indépendants dont cinq tomberaient du même côté.
        const cle = p.echelle === 'melange'
            ? ((Number(ctx.index) || 0) % 2 ? 'dixiemes' : 'entiers')
            : (ECHELLES[p.echelle] ? p.echelle : 'entiers');
        const ech = ECHELLES[cle];
        const combien = Math.max(1, Math.min(3, Number(p.points) || 1));

        // LE BOUT GAUCHE. Jamais zéro en partie entière : un axe de 0 à 1 ferait
        // écrire « 0,47 », où le zéro de tête est un piège d'ÉCRITURE qui n'a
        // rien à voir avec la lecture d'une graduation — et qui se juge au pavé.
        const entier = rng.int(1, 9);
        const debut = cle === 'entiers' ? entier
            : Number((entier + rng.int(0, 9) / 10).toFixed(1));
        const fin = Number((debut + ech.unite * 100).toFixed(ech.rang));

        const crans = tirerLesCrans(rng, marche.id, combien);
        const points = crans.map((cran, k) => ({
            lettre: combien > 1 ? LETTRES[k] : '',
            cran,
            valeur: Number((debut + cran * ech.unite).toFixed(ech.rang))
        }));

        const reponses = points.map(pt => fr(pt.valeur, ech.rang));
        const reponse = reponses.join('|');

        const enonce = combien > 1
            ? `La droite va de ${fr(debut, ech.rang)} à ${fr(fin, ech.rang)}. `
                + `Écris l’abscisse de chaque point.`
            : `La droite va de ${fr(debut, ech.rang)} à ${fr(fin, ech.rang)}. `
                + `Quelle est l’abscisse de la croix ?`;

        // ── LES TROIS FAUTES DE CETTE LECTURE ─────────────────────────────
        //
        //   1. ON S'ARRÊTE AU GRAND TRAIT : 8,47 devient 8,4 — on lit le
        //      dixième et l'on oublie de compter les petits.
        //   2. ON COMPTE DEPUIS LA DROITE : au lieu de compter sept petits
        //      traits après 8,4, on en compte trois avant 8,5.
        //   3. ON OUBLIE OÙ COMMENCE L'AXE : « 0,47 » au lieu de « 8,47 ».
        //
        // Elles ne valent QUE pour un seul point : à plusieurs, la réponse est
        // une suite de nombres et les propositions n'ont plus de sens — le
        // QCM ne sert alors pas cet exercice, et `finalizeChoices` ne reçoit
        // rien à fabriquer.
        const un = points[0];
        const arrondiGrand = Number((debut + Math.floor(un.cran / 10) * 10 * ech.unite)
            .toFixed(ech.rang));
        const parLaDroite = Number((debut
            + (Math.ceil(un.cran / 10) * 10 - (un.cran % 10 || 10)) * ech.unite)
            .toFixed(ech.rang));
        const sansLeDebut = Number((un.cran * ech.unite).toFixed(ech.rang));
        const leurres = combien > 1 ? [] : [
            { value: fr(arrondiGrand, ech.rang), label: fr(arrondiGrand, ech.rang),
                why: `C’est le grand trait d’avant la croix : tu t’es arrêté `
                    + `au ${ech.grand} sans compter les petits traits.` },
            { value: fr(parLaDroite, ech.rang), label: fr(parLaDroite, ech.rang),
                why: 'Tu as compté les petits traits en partant de la DROITE. On compte '
                    + 'toujours depuis le trait de gauche, celui du plus petit nombre.' },
            { value: fr(sansLeDebut, ech.rang), label: fr(sansLeDebut, ech.rang),
                why: `Tu as lu la graduation, mais oublié où commence l’axe : il part `
                    + `de ${fr(debut, ech.rang)}, pas de 0.` }
        ].filter(l => l.value !== reponse);

        const reste = un.cran % 10;
        const pluriel = reste > 1 ? 's' : '';

        return makeItem({
            seed: rng.seed,
            generatorId: 'num.lire-au-centieme',
            skillId: SKILL,
            answerKind: 'numeric',
            prompt: {
                text: enonce,
                html: `<div class="game-question">${enonce}</div>`
                    + figure(axeCentiemesSvg({
                        gauche: fr(debut, ech.rang), droite: fr(fin, ech.rang),
                        points, cases: true
                    }), 'figure-wrap--cent'),
                papier: combien > 1
                    ? 'Écris l’abscisse de chaque point.'
                    : 'Écris l’abscisse de chaque croix.'
            },
            answer: reponse,
            reponsePapier: combien > 1
                ? points.map((pt, k) => `${LETTRES[k]} = ${reponses[k]}`).join(' · ')
                : reponses[0],
            choices: combien > 1 ? undefined : finalizeChoices(rng, [
                { value: reponse, label: reponse, correct: true },
                ...leurres
            ], {
                count: 4,
                filler: (r) => {
                    const d = r.int(1, 9) * (r.int(0, 1) ? 1 : -1);
                    const c = Math.min(99, Math.max(1, un.cran + d));
                    const v = fr(Number((debut + c * ech.unite).toFixed(ech.rang)), ech.rang);
                    return { value: v, label: v };
                }
            }),
            hints: [
                `Trouve d’abord le GRAND trait juste à gauche de la croix : il donne le `
                    + `${ech.grand}.`,
                `Puis compte les petits traits depuis ce grand trait — chacun vaut un `
                    + `${ech.petit}. Le trait ROUGE est au milieu : il en vaut cinq, et `
                    + `t’évite de compter plus loin.`,
                combien > 1
                    ? `Prends les points un par un, dans l’ordre des lettres.`
                    : `La croix est après ${fr(arrondiGrand, ech.rang)}, à ${reste} `
                        + `petit${pluriel} trait${pluriel} : ${reponses[0]}.`
            ],
            explanation: `Un grand trait vaut un ${ech.grand}, un petit trait vaut un `
                + `${ech.petit}. ${combien > 1
                    ? points.map((pt, k) => `${LETTRES[k]} = ${reponses[k]}`).join(', ')
                    : `La croix est ${reste === 0
                        ? `sur le grand trait ${reponses[0]}`
                        : `à ${reste} petit${pluriel} trait${pluriel} après `
                            + `${fr(arrondiGrand, ech.rang)}`} : ${reponses[0]}.`}`,
            difficulty: (marche.id === 'reperes' ? 1 : marche.id === 'cote' ? 2 : 3)
                + (cle === 'dixiemes' ? 1 : 0),
            meta: {
                marche: marche.id,
                echelle: cle,
                rang: ech.rang,
                decimal: true,
                cases: combien,
                debut, fin, points,
                theme: `${marche.id}-${cle}-${entier}`
            }
        });
    }
};

export default lireAuCentiemeGenerator;
