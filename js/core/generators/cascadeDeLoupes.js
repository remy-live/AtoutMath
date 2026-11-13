// LA CASCADE DE LOUPES — on descend DANS le même nombre.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, page « Ordre · Axe », exercice 14 : 0–4, puis on zoome entre 2 et 3,
// puis entre 2,7 et 2,8, puis entre 2,72 et 2,73.
//
// ── CE QUE « LA LOUPE SUR LA DROITE » NE POUVAIT PAS FAIRE ────────────────
//
// Elle change d'échelle d'une question à l'autre, et c'est déjà beaucoup. Mais
// chaque axe y est INDÉPENDANT : rien ne montre qu'on descend dans le même
// nombre. Un élève peut lire 2,73 sur un axe des centièmes sans avoir jamais vu
// que ce 2,73 est quelque part dans l'intervalle [2 ; 3] du premier.
//
// ICI LES TROIS AXES SONT LE MÊME AXE, et deux traits obliques le disent : ils
// partent des deux bouts de l'intervalle qu'on ouvre et rejoignent les deux
// bouts de l'axe du dessous. On VOIT l'intervalle s'écarter.
//
// ── CE QU'ON FAIT ÉCRIRE, ET POURQUOI C'EST JUSTE ────────────────────────
//
// Une case par étage : la graduation JUSTE À GAUCHE de la croix. Au dernier
// étage, la croix tombe DESSUS — c'est l'abscisse exacte.
//
// C'est, mot pour mot, un encadrement de plus en plus serré : 2 < A < 3, puis
// 2,7 < A < 2,8, puis A = 2,73. On n'écrit donc pas « l'abscisse lue sur
// l'axe 1 », qui serait faux : l'abscisse de A est 2,73 et elle ne change pas
// d'un étage à l'autre. Ce qui change, c'est la précision avec laquelle on
// peut l'encadrer.
//
// ── CHAQUE CHIFFRE EST NON NUL, ET C'EST UNE DÉCISION ────────────────────
//
// Avec un dixième à zéro, l'axe du dessous commencerait là où commence celui du
// dessus — « 2 » puis « 2 » dans deux cases voisines —, et la croix du dernier
// étage tomberait sur le bord gauche. Trois cases qui disent la même chose
// n'enseignent rien, et une croix sur un bord ne se lit pas. On y perd les
// nombres comme 2,05 ; on y gagne un dessin qui dit ce qu'il montre.
//
// Le générateur est PUR : le dessin vit dans `figures.js`.

import { makeItem, finalizeChoices } from '../items.js';
import { cascadeSvg, figure } from '../figures.js';
import {
    paramMarches, marchesCochees, marcheAuRang, conseilProgression, totalDe
} from '../progression.js';

const SKILL = 'num.dec.graduations';

const fr = (x, rang) => x.toFixed(rang)
    .replace(/(\.\d*?)0+$/, '$1')
    .replace(/\.$/, '')
    .replace('.', ',');

/**
 * LES TROIS MARCHES SONT TROIS PROFONDEURS DE DESCENTE.
 *
 * Deux étages pour commencer — l'unité puis le dixième —, parce que la cascade
 * se comprend d'abord sur un seul emboîtement. Quatre pour finir, qui est le
 * cas de sa fiche.
 */
const MARCHES = [
    { id: 'deux', nom: '1. Deux étages (jusqu\'au dixième)', etages: 2 },
    { id: 'trois', nom: '2. Trois étages (jusqu\'au centième)', etages: 3 },
    { id: 'quatre', nom: '4 étages (jusqu\'au millième)', etages: 4 }
];
// Le nom de la troisième se lit mal dans la liste du professeur : on le pose
// ici, numéroté comme les deux autres.
MARCHES[2].nom = '3. Quatre étages (jusqu\'au millième)';

const LISTE = MARCHES.map(m => ({ id: m.id, nom: m.nom }));
const marcheDe = (id) => MARCHES.find(m => m.id === id) || MARCHES[1];

export const cascadeDeLoupesGenerator = {
    id: 'num.cascade-loupes',
    label: 'La cascade de loupes',
    skills: [SKILL],
    // `numeric` SEULEMENT POUR LA RÉPONSE TAPÉE : avec `choice`, le pavé laisse
    // la place aux propositions et les cases deviennent inutilisables — c'est le
    // défaut mesuré sur « Graduer un Axe », et il vaut ici aussi.
    answerKinds: ['choice', 'numeric'],
    ecrit: true,
    conseil: (p) => conseilProgression(marchesCochees(p, LISTE).length, 3),
    params: [
        paramMarches({ marches: LISTE, mot: 'marche' })
    ],

    generate(params = {}, ctx = {}) {
        const rng = ctx.rng;
        const marche = marcheDe(marcheAuRang(Number(ctx.index) || 0,
            marchesCochees(params, LISTE), totalDe(ctx, params), params, 3));
        const n = marche.etages;

        // LES CHIFFRES DE LA DESCENTE : l'unité, puis un chiffre par étage.
        // Chacun est non nul — voir l'en-tête.
        const chiffres = [rng.int(1, 9)];
        for (let k = 1; k < n; k++) chiffres.push(rng.int(1, 9));

        // LA VALEUR EXACTE, et les bornes gauches de chaque étage. On les
        // construit en montant le nombre chiffre à chiffre, ce qui évite
        // d'arrondir : 2 ; 2,7 ; 2,73 ; 2,734 sont des TRONCATURES, et les
        // calculer par soustraction ferait apparaître des 2,7299999.
        const bornes = [];
        let acc = 0;
        chiffres.forEach((c, k) => {
            acc += c / Math.pow(10, k);
            bornes.push(Number(acc.toFixed(k)));
        });
        const valeur = bornes[n - 1];
        const rangDe = (k) => k;

        // LES ÉTAGES DU DESSIN. Le premier va de 0 à 10 — dix intervalles,
        // comme tous les autres : c'est la règle que ce chapitre enseigne, et
        // en changer au premier étage demanderait de la réapprendre.
        const etages = bornes.map((b, k) => ({
            // CE QUE LA CASE DE CET ÉTAGE CONTIENDRA, en nombre de signes : c'est
            // ce qui la taille, et ce qui élargit la figure quand on descend.
            signes: fr(b, k).length,
            debut: k === 0 ? 0 : bornes[k - 1],
            fin: k === 0 ? 10 : Number((bornes[k - 1] + Math.pow(10, -(k - 1))).toFixed(k - 1)),
            rang: rangDe(k === 0 ? 0 : k - 1),
            point: valeur,
            cran: chiffres[k]
        }));
        // LE DERNIER ÉTAGE N'OUVRE RIEN : pas de loupe sous lui.
        etages[n - 1] = { ...etages[n - 1], cran: null };
        // ET SON AXE PORTE LE BON RANG : il est gradué d'un cran plus fin que
        // ses bouts ne le montrent.
        etages.forEach((e, k) => { e.rang = k === 0 ? 0 : k - 1; });

        const label = (k) => fr(bornes[k], k);
        const reponse = bornes.map((b, k) => fr(b, k)).join('|');

        // L'ÉNONCÉ TIENT EN UNE PHRASE, ET C'EST UNE MESURE QUI L'A VOULU.
        //
        // Il en faisait trois. Sur une tablette de 768 × 1024, relevé enfant par
        // enfant : l'énoncé prenait 211 px — PLUS QUE LE DESSIN (200 px) —, le
        // contexte montait à 433 là où 316 sont disponibles au-dessus du pavé,
        // et LE PAVÉ SORTAIT DE L'ÉCRAN DE 75 PIXELS. On cherchait le coupable
        // du côté de la figure ; c'était le texte.
        //
        // Ce qu'il disait de plus — que la croix est le même point partout, que
        // la dernière tombe sur une graduation — est dit par le DESSIN, par les
        // deux indices, et par l'explication d'après-coup. Cinq lignes de texte
        // au-dessus d'une figure écrasée enseignent moins qu'une ligne au-dessus
        // d'une figure lisible.
        //
        // ET IL NE DIT PAS LA RÉPONSE. Il la disait : `text` portait « (le point
        // vaut 8,2) », c'est-à-dire MOT POUR MOT ce que la dernière case demande
        // — et ce texte part dans le journal de l'élève et dans la vue en direct
        // du professeur. Le dessin est la question.
        const enonce = 'À chaque étage, écris la graduation juste à GAUCHE de la croix.';

        // ── LES FAUTES DE LA CASCADE ──────────────────────────────────────
        //
        //   1. ON NE DESCEND PAS : on relit le même nombre d'un étage à
        //      l'autre, sans ajouter le chiffre nouveau.
        //   2. LE CHIFFRE SUIVANT : on lit la graduation à DROITE de la croix,
        //      c'est-à-dire la borne haute de l'encadrement.
        //   3. LE DÉPART OUBLIÉ : on écrit 0,7 puis 0,73 au lieu de 2,7 et
        //      2,73 — l'étage du dessus n'est plus là.
        const fauxPlat = bornes.map(() => fr(bornes[0], 0)).join('|');
        const fauxDroite = bornes.map((b, k) =>
            fr(Number((b + Math.pow(10, -k)).toFixed(k)), k)).join('|');
        const fauxDepart = bornes.map((b, k) =>
            fr(Number((chiffres[k] / Math.pow(10, k)).toFixed(k)), k)).join('|');
        const joli = (s) => s.split('|').join(' · ');

        return makeItem({
            seed: rng.seed,
            generatorId: 'num.cascade-loupes',
            skillId: SKILL,
            answerKind: 'numeric',
            prompt: {
                text: enonce,
                html: `<div class="game-question">${enonce}</div>`
                    + figure(cascadeSvg({ etages, cases: true }), 'figure-wrap--casc'),
                papier: 'Complète l\'encadrement de la croix, étage par étage.'
            },
            answer: reponse,
            reponsePapier: bornes.map((b, k) => fr(b, k)).join(' · '),
            choices: finalizeChoices(rng, [
                { value: reponse, label: joli(reponse), correct: true },
                { value: fauxDroite, label: joli(fauxDroite),
                    why: 'C\'est la graduation à DROITE de la croix : celle-là ferme '
                        + 'l\'encadrement, elle ne l\'ouvre pas.' },
                { value: fauxPlat, label: joli(fauxPlat),
                    why: 'On ne descend pas : chaque loupe ajoute UN chiffre au nombre '
                        + 'de l\'étage du dessus.' },
                { value: fauxDepart, label: joli(fauxDepart),
                    why: `L'axe du dessous ne repart pas de zéro : il commence à `
                        + `${label(0)}, et ce ${label(0)} reste devant.` }
            ], {
                count: 4,
                filler: (r) => {
                    const d = r.int(1, 8);
                    const v = bornes.map((b, k) =>
                        fr(Number((b + d * Math.pow(10, -k)).toFixed(k)), k)).join('|');
                    return { value: v, label: joli(v) };
                }
            }),
            hints: [
                'Commence par le haut : entre quelles deux graduations la croix '
                    + 'tombe-t-elle ? C\'est la GAUCHE qu\'on écrit.',
                'Puis descends d\'un étage : l\'axe du dessous est cet intervalle-là, '
                    + 'ouvert en dix. Le nombre du dessus reste devant, et un chiffre '
                    + 's\'ajoute derrière.',
                // CE QUE L'ÉNONCÉ NE DIT PLUS, parce qu'il tenait cinq lignes et
                // poussait le pavé hors de l'écran d'une tablette. Un indice le
                // dit mieux : on le lit quand on en a besoin.
                'Au DERNIER étage, la croix ne tombe plus entre deux graduations : '
                    + 'elle tombe DESSUS. Ce nombre-là est son abscisse exacte.'
            ],
            explanation: `La croix est à ${fr(valeur, n - 1)}. Étage par étage, on la serre `
                + `de plus en plus près : ${bornes.map((b, k) => fr(b, k)).join(', puis ')}. `
                + 'Chaque loupe ouvre en dix l\'intervalle du dessus, et ajoute donc un '
                + 'chiffre après la virgule.',
            difficulty: n - 1,
            meta: {
                marche: marche.id,
                cases: n,
                decimal: true,
                etages, bornes, valeur, chiffres,
                theme: `${marche.id}-${chiffres[0]}`
            }
        });
    }
};
