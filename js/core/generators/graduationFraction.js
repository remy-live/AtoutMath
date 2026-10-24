// LA FRACTION SUR LA DROITE GRADUÉE — sixième, bloc 10.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, dans sa progression de sixième. « La Loupe sur la Droite » existait
// déjà, mais elle ne place que des DÉCIMAUX, et son axe écrit ses graduations
// en décimaux : lire 3/4 dessus était impossible.
//
// ── POURQUOI UN EXERCICE À PART, ET NON UN RÉGLAGE DE PLUS ─────────────────
//
// Trois choses changent en même temps, et aucune n'est un réglage :
//
//   · L'AXE N'A PLUS DIX INTERVALLES mais autant que le dénominateur — deux,
//     trois, quatre. « Coupé en dix » était écrit en dur dans le dessin, à
//     l'écran comme sur la feuille.
//   · L'ÉTIQUETTE N'EST PLUS UN NOMBRE mais une fraction EMPILÉE, numérateur
//     sur dénominateur. L'écrire « 3/4 » sur une ligne serait plus simple et
//     faux à lire : ce n'est pas l'écriture du tableau, et c'est justement
//     celle qu'on apprend.
//   · LA RÉPONSE NE SE TAPE PAS AU PAVÉ NUMÉRIQUE. On la CHOISIT parmi quatre
//     fractions écrites comme au tableau — ce qui fait de la lecture de
//     l'écriture une partie de l'exercice, et non un obstacle à le passer.
//
// ── CE QUE L'ÉLÈVE DOIT COMPRENDRE, ET LES TROIS ERREURS ENCODÉES ──────────
//
// Une fraction est un PARTAGE : 3/4, c'est couper l'unité en 4 et en prendre
// 3. Sur la droite, l'unité est le segment de 0 à 1, le dénominateur dit en
// combien on l'a coupé, le numérateur combien d'intervalles on a parcourus.
//
//   1. COMPTER LES TRAITS AU LIEU DES INTERVALLES — l'erreur de la droite
//      graduée, ici aussi : on trouve un numérateur d'un de trop ou d'un de
//      moins.
//   2. ÉCHANGER NUMÉRATEUR ET DÉNOMINATEUR — 4/3 pour 3/4. Elle est très
//      fréquente, et la droite la dément toute seule : 4/3 est au-delà de 1.
//   3. COMPTER LES TRAITS POUR LE DÉNOMINATEUR. Quatre intervalles font CINQ
//      traits : l'élève qui compte les traits écrit 3/5.
//
// Le générateur est pur. Le dessin de l'axe vit dans figures.js, partagé avec
// la fiche imprimée.

import { makeItem, finalizeChoices } from '../items.js';
import { axeSvg, figure } from '../figures.js';
import {
    paramMarches, marchesCochees, marcheAuRang, conseilProgression, totalDe
} from '../progression.js';

/**
 * Les trois paliers du chapitre.
 *
 * `dens` : les dénominateurs tirés. `unites` : combien d'unités porte l'axe —
 * une seule (de 0 à 1) tant qu'on apprend le partage ; deux dès qu'il s'agit
 * de voir qu'une fraction peut DÉPASSER 1, ce que beaucoup d'élèves croient
 * impossible.
 */
const PALIERS = [
    {
        id: 'moities', nom: 'Entre 0 et 1, dénominateurs simples',
        dens: [2, 3, 4], unites: 1
    },
    {
        id: 'jusqua10', nom: 'Entre 0 et 1, jusqu\'aux dixièmes',
        dens: [5, 6, 8, 10], unites: 1
    },
    {
        id: 'audela', nom: 'Au-delà de 1 — les fractions supérieures à l\'unité',
        dens: [2, 3, 4, 5], unites: 2
    }
];

const palierDe = (id) => PALIERS.find(p => p.id === id) || PALIERS[0];

const LISTE_MARCHES = PALIERS.map(p => ({ id: p.id, nom: p.nom, groupe: null }));
const TEMPS = {};
const MOT = 'palier';
const ANCIEN = { cle: 'palier' };

/** « 3/4 » pour l'énoncé parlé, et pour le corrigé du papier. */
const texteFraction = (num, den) => `${num}/${den}`;

/**
 * UNE FRACTION EMPILÉE, EN HTML, pour les quatre propositions.
 *
 * LE BALISAGE N'EST PAS LIBRE, ET J'AI PAYÉ POUR L'APPRENDRE. J'en avais
 * inventé un — trois `<span>` à moi — et les propositions sont sorties en
 * CARTES, une par ligne, au lieu de quatre ronds sur la même ligne.
 *
 * La cause est écrite en toutes lettres dans `core/activities/choice.js`, au-
 * dessus de `FRACTION_SEULE` : le texte nu d'un balisage inconnu donne
 * « 2 3 », espace compris, et l'activité classe alors la proposition avec
 * « 17 billes rouges ». Elle RECONNAÎT en revanche ce balisage-ci, et mesure
 * ses deux étages séparément.
 *
 * C'est le même que celui de `calculFractions.js`. Une fraction s'écrit d'une
 * seule façon dans ce logiciel.
 */
export function fractionHtml(num, den) {
    return `<span class="fraction"><span class="fraction-num">${num}</span>`
        + `<span class="fraction-den">${den}</span></span>`;
}

/** Le plus grand diviseur commun — pour ne pas proposer deux fois la même. */
function pgcd(a, b) { return b === 0 ? Math.abs(a) : pgcd(b, a % b); }

export const graduationFractionGenerator = {
    id: 'frac.graduation',
    label: 'Lire une fraction sur une droite graduée',
    skills: ['num.frac.sens'],
    answerKinds: ['choice'],
    ecrit: true,
    conseil: (p) => conseilProgression(marchesCochees(p, LISTE_MARCHES, ANCIEN).length, 3),
    params: [
        paramMarches({ marches: LISTE_MARCHES, groupes: TEMPS, mot: MOT, ancien: ANCIEN })
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const i = Number(ctx.index) || 0;
        const palier = palierDe(marcheAuRang(i, marchesCochees(p, LISTE_MARCHES, ANCIEN),
            totalDe(ctx, p), p, 3));

        const den = palier.dens[rng.int(0, palier.dens.length - 1)];
        const crans = den * palier.unites;
        // JAMAIS SUR UN TRAIT D'UNITÉ : « lis le point posé sur 1 » ne demande
        // pas de compter, et sa réponse n'est pas une fraction à lire.
        let num = rng.int(1, crans - 1);
        for (let essai = 0; num % den === 0 && essai < 20; essai++) num = rng.int(1, crans - 1);

        const valeur = num / den;
        // LES ÉTIQUETTES SONT LES ENTIERS, ET EUX SEULS. Écrire les fractions
        // sous chaque trait donnerait la réponse ; ne rien écrire du tout ne
        // dirait pas où est l'unité.
        const etiquettes = [];
        for (let u = 0; u <= palier.unites; u++) etiquettes.push({ i: u * den, texte: String(u) });

        const dessin = axeSvg({
            debut: 0, fin: palier.unites, pas: 1 / den, rang: 0,
            intervalles: crans, grandsTous: den,
            etiquettes, point: { i: num }
        });

        // LES TROIS ERREURS, chacune nommée.
        //
        // J'AVAIS ÉCRIT UNE QUATRIÈME GARDE ICI — « une proposition qui vaut la
        // bonne fraction après simplification est un doublon, on l'écarte » —
        // et `epreuveTombe.mjs` a refusé l'épreuve qui prétendait la tenir :
        // elle restait verte, la ligne retirée, sur cent tirages. En cherchant
        // pourquoi, la raison est nette. Les trois leurres ont soit le MÊME
        // dénominateur (et le doublon exact est déjà écarté juste au-dessus),
        // soit `den/num` — qui vaudrait `num/den` seulement si num = den, ce
        // que le tirage interdit —, soit `num/(den+1)`, qui ne peut jamais
        // l'égaler. La ligne ne rejetait rien, jamais.
        //
        // L'ÉPREUVE, ELLE, RESTE : elle garde la PROPRIÉTÉ — aucune mauvaise
        // proposition ne vaut la bonne —, et c'est elle qui tombera le jour où
        // l'on ajoutera un leurre moins prudent.
        const leurres = [];
        const poser = (n, d, why) => {
            if (n <= 0 || d <= 0) return;
            if (d === den && n === num) return;
            if (leurres.some(l => l.n === n && l.d === d)) return;
            leurres.push({ n, d, why });
        };
        poser(num - 1, den, 'Un intervalle de moins : compte les INTERVALLES depuis 0, '
            + 'jamais les traits — le premier intervalle commence AU trait de 0.');
        poser(num + 1, den, 'Un intervalle de trop : le trait de 0 ne compte pas pour un.');
        poser(den, num, 'Numérateur et dénominateur sont échangés. Le dénominateur dit en '
            + 'COMBIEN on a coupé l\'unité ; le numérateur, combien on en prend.');
        poser(num, den + 1, 'Le dénominateur compte les INTERVALLES de l\'unité, pas les '
            + `traits : il y en a ${den + 1} mais seulement ${den} intervalles.`);

        const choix = [
            { value: texteFraction(num, den), label: fractionHtml(num, den), correct: true },
            ...leurres.map(l => ({
                value: texteFraction(l.n, l.d), label: fractionHtml(l.n, l.d), why: l.why
            }))
        ];

        const reduite = pgcd(num, den) > 1
            ? ` (c'est-à-dire ${texteFraction(num / pgcd(num, den), den / pgcd(num, den))})`
            : '';

        return makeItem({
            seed: rng.seed,
            generatorId: 'frac.graduation',
            skillId: 'num.frac.sens',
            answerKind: 'choice',
            prompt: {
                text: `Quelle fraction est marquée par la croix rouge ?`,
                html: '<div class="game-question">Quelle fraction est marquée '
                    + 'par la croix rouge&nbsp;?</div>' + figure(dessin),
                papier: 'Écris la fraction marquée par chaque croix.'
            },
            answer: texteFraction(num, den),
            choices: finalizeChoices(rng, choix, {
                count: 4,
                filler: (r) => texteFraction(r.int(1, crans - 1), den)
            }),
            hints: [
                `L'unité — de 0 à 1 — est coupée en ${den} intervalles égaux : `
                    + `chaque intervalle vaut donc 1/${den}.`,
                'Compte les intervalles depuis 0 jusqu\'à la croix : c\'est le numérateur.'
            ],
            explanation: `L'unité est coupée en ${den} parts égales, donc un intervalle vaut `
                + `1/${den}. La croix est ${num} intervalles après 0 : son abscisse est `
                + `${texteFraction(num, den)}${reduite}.`,
            difficulty: palier.unites > 1 ? 3 : (den > 4 ? 2 : 1),
            meta: {
                // `marche`, ET NON `palier`. C'est le nom que pose la frise de
                // progression, et une épreuve de la maison le vérifie : avec
                // un autre nom, elle déclare les trois marches « jamais
                // jouées » — ce qu'elle a fait, et elle avait raison.
                marche: palier.id, den, num, crans, unites: palier.unites,
                // CE QUE LA FEUILLE DESSINE. `intervalles` et `etiquettes`
                // remplacent les dix intervalles codés en dur du rendu des
                // décimaux ; `fractions` lui dit d'écrire les réponses en
                // fractions empilées plutôt qu'en nombres à virgule.
                fractions: true, intervalles: crans, grandsTous: den, etiquettes,
                valeur, debut: 0, fin: palier.unites,
                theme: `${palier.id}-${den}`,
                points: pointsPapier(rng, ctx, den, crans, num)
            }
        });
    }
};

/**
 * PLUSIEURS POINTS SUR LE MÊME AXE, sur le papier et sur lui seul.
 *
 * C'est la règle que Rémy a posée pour la droite des décimaux — « pour un MÊME
 * axe, mets plusieurs lettres et demande A(....) B(...) » — et elle vaut
 * exactement pareil ici : un axe prend toute la largeur d'un bloc, et une
 * croix par axe gâche du papier. Lire trois points sur le même axe n'est pas
 * trois fois la même question : l'échelle est posée une fois et réutilisée.
 */
const LETTRES = ['A', 'B', 'C'];

function pointsPapier(rng, ctx, den, crans, numA) {
    if (!ctx || !ctx.papier) return null;
    const pris = new Set([numA]);
    const combien = Math.min(crans - 1, rng.int(2, 3));
    for (let essai = 0; pris.size < combien && essai < 40; essai++) {
        const n = rng.int(1, crans - 1);
        if (n % den !== 0) pris.add(n);
    }
    return [...pris].sort((a, b) => a - b).map((n, i) => ({
        lettre: LETTRES[i] || String.fromCharCode(68 + i - 3),
        crans: n, num: n, den,
        valeur: n / den,
        texte: texteFraction(n, den)
    }));
}
