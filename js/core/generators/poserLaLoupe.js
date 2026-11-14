// POSE LA LOUPE — c'est l'élève qui zoome.
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
// ── CE QUE LA CASCADE RATAIT, ET QU'IL A DIAGNOSTIQUÉ ──────────────────────
//
// Les trois axes y étaient DONNÉS : l'élève lisait un raisonnement déjà fait,
// et regardait quelqu'un d'autre zoomer. Ici c'est lui qui décide — « la croix
// est entre 8,2 et 8,3, je zoome LÀ » — et le geste devient le sien.
//
// ── LE ZOOM EST UN OUTIL, PAS LA RÉPONSE ───────────────────────────────────
//
// On ne demande pas combien de fois il a zoomé, ni où. On demande L'ABSCISSE.
// La loupe est là pour rendre le nombre lisible, exactement comme une vraie
// loupe sur une vraie règle : elle ne fait pas le travail, elle le permet.
// C'est aussi ce qui autorise à zoomer trop, ou pas assez, et à revenir — « il
// se rend compte que ça ne tombe pas encore juste » suppose qu'il puisse se
// tromper sans être puni.
//
// ── À CHAQUE ZOOM, UNE DÉCIMALE DE PLUS, ET ELLE EST ÉCRITE ────────────────
//
// Les deux bouts seuls portent leur nombre : 8 et 9, puis 8,2 et 8,3, puis 8,24
// et 8,25. L'élève VOIT la décimale apparaître, et il la voit apparaître PARCE
// QU'IL A CHOISI l'intervalle. C'est toute la leçon du chapitre, et elle se lit
// dans les deux étiquettes.
//
// ── PAS DE FICHE PAPIER, ET CE N'EST PAS UN OUBLI ──────────────────────────
//
// Une feuille ne zoome pas. Imprimer cet exercice-là donnerait un axe et une
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
 * LES TROIS MARCHES SONT TROIS PROFONDEURS — et la troisième est la vraie.
 *
 * Aux deux premières, l'élève sait d'avance combien de fois zoomer : toutes les
 * questions ont la même profondeur. À la troisième, il ne le sait pas, et doit
 * donc REGARDER si la croix est tombée juste. C'est mot pour mot ce que Rémy
 * décrit : « quand il se rend compte que ça ne tombe pas encore juste ».
 */
const MARCHES = [
    { id: 'un', nom: '1. Un zoom (des centièmes)', zooms: [1] },
    { id: 'deux', nom: '2. Deux zooms (des millièmes)', zooms: [2] },
    { id: 'melange', nom: '3. Un ou deux — à toi de voir', zooms: [1, 2] }
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

        // LA PROFONDEUR : un zoom donne des centièmes, deux des millièmes.
        const zooms = marche.zooms[rng.int(0, marche.zooms.length - 1)];
        const rang = zooms + 1;

        // LES CHIFFRES DE LA DESCENTE. Le dernier n'est JAMAIS zéro : à 8,40 la
        // croix tomberait sur une graduation dès le premier zoom, et il n'y
        // aurait plus rien à zoomer — la question se résoudrait en se posant.
        const entier = rng.int(1, 9);
        const chiffres = [];
        for (let i = 0; i < rang; i++) {
            chiffres.push(i === rang - 1 ? rng.int(1, 9) : rng.int(0, 9));
        }
        const valeur = Number((entier + chiffres
            .reduce((acc, c, i) => acc + c / Math.pow(10, i + 1), 0)).toFixed(rang));
        const reponse = fr(valeur, rang);

        const enonce = 'Zoome jusqu’à ce que la croix tombe sur une graduation, '
            + 'puis écris son abscisse.';

        // ── LES FAUTES QU'ON PROPOSE EN DÉFI ──────────────────────────────
        //
        // L'exercice se joue au pavé ; le QCM n'existe que pour les défis, où
        // l'on ne peut pas zoomer. On y met donc les fautes de LECTURE, les
        // seules qui aient un sens quand la loupe n'est pas là.
        const tropTot = Number((entier + chiffres.slice(0, -1)
            .reduce((acc, c, i) => acc + c / Math.pow(10, i + 1), 0)).toFixed(rang - 1));
        const sansEntier = Number(chiffres
            .reduce((acc, c, i) => acc + c / Math.pow(10, i + 1), 0).toFixed(rang));
        const leurres = [
            { value: fr(tropTot, rang - 1), label: fr(tropTot, rang - 1),
                why: 'Tu t’es arrêté un zoom trop tôt : à ce niveau-là, la croix ne '
                    + 'tombait pas encore sur une graduation.' },
            { value: fr(sansEntier, rang), label: fr(sansEntier, rang),
                why: `Tu as lu les décimales, mais oublié la partie entière : l’axe `
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
                    const v = fr(Number((valeur + d / Math.pow(10, rang)).toFixed(rang)), rang);
                    return { value: v, label: v };
                }
            }),
            hints: [
                'Regarde entre quelles DEUX graduations la croix se trouve, et touche cet '
                    + 'intervalle-là : il devient la droite entière.',
                'À chaque zoom, les deux nombres des bouts gagnent une décimale. Quand la '
                    + 'croix tombe PILE sur une graduation, tu peux lire son abscisse.',
                `Il faut ${zooms} zoom${zooms > 1 ? 's' : ''} ici, et la réponse est `
                    + `${reponse}.`
            ],
            explanation: `La croix est à ${reponse}. ${zooms === 1
                ? `Un seul zoom suffisait : entre ${fr(tropTot, rang - 1)} et `
                    + `${fr(Number((tropTot + Math.pow(10, -(rang - 1))).toFixed(rang - 1)),
                        rang - 1)}, elle tombe sur une graduation.`
                : `Il fallait zoomer ${zooms} fois : chaque zoom ajoute une décimale aux `
                    + `nombres des bouts.`}`,
            difficulty: zooms,
            meta: {
                marche: marche.id,
                decimal: true,
                entier, rang, zooms, valeur,
                // LA PLACE DE LA CROIX SUR LE PREMIER AXE, de 0 à 10. L'activité
                // la recalcule à chaque zoom ; celle-ci est le point de départ.
                place: Number(((valeur - entier) * 10).toFixed(rang)),
                theme: `${marche.id}-${entier}`
            }
        });
    }
};

export default poserLaLoupeGenerator;
