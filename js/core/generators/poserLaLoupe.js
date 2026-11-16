// POSE LA LOUPE — on fait glisser le verre jusqu'à la croix, et on lit.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, après avoir essayé la cascade de loupes : « Cascade de loupe, on
// comprend pas trop en fait. » Et, quand on lui a demandé par quoi la
// remplacer, deux idées — l'axe à double graduation, qui est fait, puis
// celle-ci :
//
// > « pour le zoom, il faudrait que ce soit l'élève qui pose la loupe et gère
// > le zoom quand il se rend compte que ca ne tombe pas encore juste. »
//
// Puis, en voyant la première version, où l'intervalle choisi s'étirait jusqu'à
// remplir la droite :
//
// > « je trouve la disposition mauvais. Je préfèrerai que l'élève puisse avoir
// > une loupe et que ce soit pas un étirement vertical qui déforme la croix »
//
// ── CE QUE LA CASCADE RATAIT, ET QU'IL A DIAGNOSTIQUÉ ──────────────────────
//
// Les trois axes y étaient DONNÉS : l'élève lisait un raisonnement déjà fait,
// et regardait quelqu'un d'autre zoomer. Ici c'est lui qui promène le verre —
// « la croix est par là, je regarde » — et le geste devient le sien.
//
// ── LA LOUPE EST UN OUTIL, PAS LA RÉPONSE ──────────────────────────────────
//
// On ne demande pas où il a posé le verre, ni combien de fois. On demande
// L'ABSCISSE. La loupe est là pour rendre le nombre lisible, exactement comme
// une vraie loupe sur une vraie règle : elle ne fait pas le travail, elle le
// permet. C'est aussi ce qui autorise à la poser n'importe où et à la reposer
// — « il se rend compte que ça ne tombe pas encore juste » suppose qu'il PUISSE
// se tromper sans être puni.
//
// ── ON S'ARRÊTE AUX CENTIÈMES, ET C'EST UN ÉCHANGE ─────────────────────────
//
// La version d'avant descendait aux millièmes en zoomant deux fois. Une loupe
// ne zoome pas deux fois : elle a une puissance, et elle l'a une fois pour
// toutes. On perd donc les millièmes ici — et on les garde ailleurs : « L'Axe
// au Centième » a un réglage `echelle` qui les sert, sur une droite qui va de
// 3,5 à 3,6. Deux exercices, deux gestes, et aucun des deux n'est amputé.
//
// ── LES TROIS MARCHES SONT TROIS DISTANCES À UN REPÈRE ─────────────────────
//
// Sous le verre, trois sortes de traits : les grands, qui portent un nombre
// (les dixièmes), le rouge du milieu (cinq centièmes), et les petits. Compter
// est facile près d'un trait qui dit quelque chose, et difficile loin de tout.
// Les marches sont donc la distance, en crans, du plus proche repère :
//
//     1. zéro cran   — le centième est 5, la croix est PILE sur le trait rouge
//     2. un cran     — 1, 4, 6 ou 9 : un seul petit trait sépare la croix d'un
//                      grand trait ou du rouge
//     3. jusqu'à deux — 2, 3, 7 et 8 entrent, et c'est là qu'il faut vraiment
//                      compter, sans pouvoir s'appuyer sur un repère voisin
//
// DEUX CRANS EST LE PLUS LOIN QU'ON PUISSE ÊTRE, ET CE N'EST PAS UNE OPINION :
// avec un repère tous les cinq centièmes, la distance maximale au plus proche
// vaut 2, atteinte par 2, 3, 7 et 8. La première écriture de ces marches
// annonçait « trois crans pour 3 et 7 » ; `epreuveTombe.mjs` a refusé de voir
// l'épreuve tomber en remettant 3 dans la deuxième marche — parce que 3 est à
// deux crans du trait rouge, et que la marche à trois crans n'existe pas.
// Un fait DÉDUIT, et faux.
//
// LE CENTIÈME N'EST JAMAIS ZÉRO, à aucune marche : la croix tomberait alors sur
// un grand trait, qui porte déjà son nombre écrit — il n'y aurait plus rien à
// lire, et la question se résoudrait en se posant.
//
// ── PAS DE FICHE PAPIER, ET CE N'EST PAS UN OUBLI ──────────────────────────
//
// Une feuille ne glisse pas. Imprimer cet exercice-là donnerait un axe et une
// croix à lire — c'est-à-dire « L'Axe au Centième », qui existe et qui est fait
// pour ça. Un exercice dont le geste EST l'écran n'a pas de version papier
// honnête ; en fabriquer une serait imprimer un autre exercice sous son nom.
//
// Le générateur est PUR : l'écran vit dans `activities/poserLaLoupe.js`.

import { makeItem, finalizeChoices } from '../items.js';
import {
    paramMarches, marchesCochees, marcheAuRang, conseilProgression, totalDe
} from '../progression.js';

const SKILL = 'num.dec.graduations';

const fr = (v, rang) => v.toFixed(rang)
    .replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '').replace('.', ',');

/**
 * LES CENTIÈMES AUTORISÉS À CHAQUE MARCHE — voir l'en-tête.
 *
 * `loin` dit à quelle distance d'un repère on peut se trouver ; il n'est pas
 * employé par le code, il est là pour qu'on n'ait pas à recompter les listes
 * pour comprendre dans quel ordre elles vont.
 */
const MARCHES = [
    { id: 'repere', nom: '1. Pile sur le trait rouge', loin: 0, chiffres: [5] },
    { id: 'pres', nom: '2. À un cran d’un repère', loin: 1,
        chiffres: [1, 4, 6, 9] },
    { id: 'partout', nom: '3. N’importe où entre deux dixièmes', loin: 2,
        chiffres: [1, 2, 3, 4, 5, 6, 7, 8, 9] }
];
const LISTE = MARCHES.map(m => ({ id: m.id, nom: m.nom }));
const marcheDe = (id) => MARCHES.find(m => m.id === id) || MARCHES[0];

export const poserLaLoupeGenerator = {
    id: 'num.poser-la-loupe',
    label: 'Pose la Loupe',
    skills: [SKILL],
    // `text` : l'activité a son propre pavé et envoie une chaîne.
    answerKinds: ['text', 'choice'],
    // PAS DE FICHE PAPIER — voir l'en-tête. `ecrit` reste faux, et c'est la
    // seule façon de ne pas promettre une feuille qu'on ne sait pas écrire.
    ecrit: false,
    conseil: (p) => conseilProgression(marchesCochees(p, LISTE).length, 3),
    params: [
        paramMarches({ marches: LISTE, mot: 'marche' })
    ],

    generate(params = {}, ctx = {}) {
        const rng = ctx.rng;
        const marche = marcheDe(marcheAuRang(Number(ctx.index) || 0,
            marchesCochees(params, LISTE), totalDe(ctx, params), params, 3));

        const entier = rng.int(1, 9);
        const dixieme = rng.int(0, 9);
        const centieme = marche.chiffres[rng.int(0, marche.chiffres.length - 1)];
        const croix = dixieme * 10 + centieme;          // en centièmes, de 1 à 99
        const valeur = Number((entier + croix / 100).toFixed(2));
        const reponse = fr(valeur, 2);

        // L'ÉNONCÉ DIT « ENVOIE » ET NON « FAIS GLISSER » : depuis qu'une tape
        // suffit, « fais glisser » ne nommerait qu'un des deux gestes — et ce
        // serait le plus difficile des deux qu'on nommerait.
        const enonce = 'Envoie la loupe sur la croix, puis écris son abscisse.';

        // ── LES FAUTES QU'ON PROPOSE EN DÉFI ──────────────────────────────
        //
        // L'exercice se joue au pavé ; le QCM n'existe que pour les défis, où
        // l'on ne peut rien faire glisser. On y met donc les fautes de LECTURE,
        // les seules qui aient un sens quand la loupe n'est pas là.
        //
        // LA DEUXIÈME EST LA PLUS INSTRUCTIVE : compter les petits traits en
        // partant du grand trait de DROITE. C'est une faute qu'on voit en
        // classe, et elle donne un nombre parfaitement crédible.
        const auDixieme = Number((entier + dixieme / 10).toFixed(1));
        const aLEnvers = Number((entier + (dixieme + 1) / 10 - centieme / 100).toFixed(2));
        const sansEntier = Number((croix / 100).toFixed(2));
        const leurres = [
            { value: fr(auDixieme, 1), label: fr(auDixieme, 1),
                why: 'Tu as lu le grand trait, pas la croix : elle est un peu plus '
                    + 'loin, et ce sont les petits traits qui le disent.' },
            { value: fr(aLEnvers, 2), label: fr(aLEnvers, 2),
                why: `Tu as compté les petits traits en partant du grand trait de `
                    + `DROITE. On compte toujours depuis celui de gauche, en avançant.` },
            { value: fr(sansEntier, 2), label: fr(sansEntier, 2),
                why: `Tu as lu les décimales, mais oublié la partie entière : la droite `
                    + `part de ${entier}, pas de 0.` }
        ].filter(l => l.value !== reponse);

        return makeItem({
            seed: rng.seed,
            generatorId: 'num.poser-la-loupe',
            skillId: SKILL,
            answerKind: 'text',
            prompt: {
                text: `${enonce} (droite de ${entier} à ${entier + 1})`,
                html: `<div class="game-question">${enonce}</div>`
            },
            answer: reponse,
            reponsePapier: reponse,
            choices: finalizeChoices(rng, [
                { value: reponse, label: reponse, correct: true },
                ...leurres
            ], {
                count: 4,
                filler: (r) => {
                    const d = r.int(1, 9) * (r.int(0, 1) ? 1 : -1);
                    const v = fr(Number((valeur + d / 100).toFixed(2)), 2);
                    return { value: v, label: v };
                }
            }),
            hints: [
                'Touche la droite à l’endroit de la croix : la loupe s’y rend toute '
                    + 'seule. Tu peux aussi l’attraper et la faire glisser.',
                'Sous le verre, repère le grand trait qui porte un nombre, puis compte '
                    + 'les petits traits jusqu’à la croix : chacun vaut un centième.',
                `La croix est à ${reponse}.`
            ],
            explanation: `La croix est à ${reponse} : c’est ${fr(auDixieme, 1)} `
                + `et ${centieme} centième${centieme > 1 ? 's' : ''} de plus.`,
            difficulty: MARCHES.indexOf(marche) + 1,
            meta: {
                marche: marche.id,
                decimal: true,
                entier, dixieme, centieme, valeur,
                // OÙ EST LA CROIX, EN CENTIÈMES DE LA DROITE (0 à 100) : c'est
                // ce que reçoivent le dessin ET le robot de démonstration. Une
                // seule unité pour les deux, sinon le verre se pose à côté.
                croix,
                theme: `${marche.id}-${entier}`
            }
        });
    }
};

export default poserLaLoupeGenerator;
