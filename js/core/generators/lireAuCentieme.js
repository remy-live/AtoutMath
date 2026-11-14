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
// ── CE QUE LA CASCADE RATAIT, ET QU'IL A NOMMÉ ─────────────────────────────
//
// Elle racontait le zoom EN TROIS TEMPS, et l'élève regardait quelqu'un d'autre
// zoomer. Ici il n'y a pas de zoom : les deux précisions sont là, ensemble, sur
// une seule droite. Lire 8,47, c'est aller au grand trait d'après 8,4 puis
// compter sept petits — un seul geste, visible en entier.
//
// ── LES TROIS MARCHES SONT TROIS DISTANCES AU REPÈRE ───────────────────────
//
// Ce qui rend une lecture difficile ici n'est pas le nombre, c'est le NOMBRE DE
// PETITS TRAITS À COMPTER. On gradue donc la difficulté là-dessus, et non sur la
// taille du nombre :
//
//   1. le point tombe SUR un repère — un grand trait ou le trait rouge du
//      milieu. Rien à compter : on nomme ce qu'on voit (8,4 ; 8,45).
//   2. le point est à un ou deux petits traits d'un repère. On compte « un,
//      deux » depuis le rouge ou depuis le grand trait.
//   3. n'importe quel centième. Le trait rouge sert alors vraiment : sans lui,
//      il faudrait compter jusqu'à neuf sans se tromper.
//
// ── POURQUOI LE PREMIER CHIFFRE N'EST JAMAIS ZÉRO ──────────────────────────
//
// Un axe de 0 à 1 donnerait des réponses comme « 0,47 », où le zéro de tête est
// un piège d'écriture qui n'a rien à voir avec la lecture d'une graduation —
// et qui se juge au pavé (« ,47 » refusé). On tire donc le départ entre 1 et 9.
//
// Le générateur est PUR : le dessin vit dans `figures.js`.

import { makeItem, finalizeChoices } from '../items.js';
import { axeCentiemesSvg, figure } from '../figures.js';
import {
    paramMarches, marchesCochees, marcheAuRang, conseilProgression, totalDe
} from '../progression.js';

const SKILL = 'num.dec.graduations';

const fr = (v) => v.toFixed(2).replace(/0+$/, '').replace(/\.$/, '').replace('.', ',');

const MARCHES = [
    { id: 'reperes', nom: '1. Sur un grand trait ou sur le rouge' },
    { id: 'cote', nom: '2. Juste à côté d’un repère' },
    { id: 'entre', nom: '3. Entre deux repères' }
];
const LISTE = MARCHES.map(m => ({ id: m.id, nom: m.nom }));
const marcheDe = (id) => MARCHES.find(m => m.id === id) || MARCHES[1];

/**
 * LE CENTIÈME QU'ON VA FAIRE LIRE, selon la marche.
 *
 * On raisonne en NOMBRE DE PETITS TRAITS depuis le bout gauche — de 0 à 100 —
 * et non en décimales : c'est ainsi que l'élève compte, et c'est ainsi que les
 * trois difficultés se décrivent sans détour.
 */
function tirerLeCran(rng, marche) {
    // UN REPÈRE EST UN MULTIPLE DE CINQ : grand trait (×10) ou trait rouge du
    // milieu (×10 + 5). Entre deux repères il n'y a donc que QUATRE petits
    // traits, et aucun centième n'est à plus de DEUX traits d'un repère.
    //
    // C'EST CE COMPTE QUI A CORRIGÉ LA PROGRESSION. Les trois marches étaient
    // d'abord « sur un repère », « à un ou deux traits », « n'importe où » — et
    // une épreuve a montré que les deux dernières demandaient le MÊME travail :
    // « n'importe où » est toujours à un ou deux traits, par construction. Une
    // marche qui n'est pas plus difficile que la précédente est un décor.
    if (marche === 'reperes') {
        // Sur un repère : rien à compter, on nomme ce qu'on voit. Ni 0 ni 100,
        // où la croix se poserait sur un nombre déjà écrit.
        return rng.int(1, 19) * 5;
    }
    // LE REPÈRE SE CHOISIT ENTRE 5 ET 95, ET C'EST UNE ÉPREUVE QUI L'A VOULU.
    // Pris entre 0 et 100, le repère 100 plus deux traits donnait 102, rogné à
    // 99 — qui est à UN trait du repère 100, pas deux. Le rognage cassait
    // silencieusement l'invariant que la marche promet. On choisit donc un
    // repère qui laisse toujours la place à l'écart, et l'on ne rogne plus
    // rien.
    const repere = rng.int(1, 19) * 5;
    // À CÔTÉ : un seul trait à compter, d'un côté ou de l'autre.
    // ENTRE : deux traits, et c'est le seul cas où l'on hésite vraiment — la
    // croix est au milieu de l'intervalle entre deux repères, aussi loin de
    // l'un que de l'autre.
    const ecart = (marche === 'cote' ? 1 : 2) * (rng.int(0, 1) ? 1 : -1);
    return repere + ecart;
}

export const lireAuCentiemeGenerator = {
    id: 'num.lire-au-centieme',
    label: 'L’Axe au Centième',
    skills: [SKILL],
    // `numeric` POUR LA RÉPONSE TAPÉE : une seule case, et la virgule au pavé.
    // `choice` existe pour les défis, où l'on ne tape pas.
    answerKinds: ['numeric', 'choice'],
    ecrit: true,
    conseil: (p) => conseilProgression(marchesCochees(p, LISTE).length, 3),
    params: [
        paramMarches({ marches: LISTE, mot: 'marche' })
    ],

    generate(params = {}, ctx = {}) {
        const rng = ctx.rng;
        const marche = marcheDe(marcheAuRang(Number(ctx.index) || 0,
            marchesCochees(params, LISTE), totalDe(ctx, params), params, 3));

        const debut = rng.int(1, 9);
        const cran = tirerLeCran(rng, marche.id);
        const valeur = Number((debut + cran / 100).toFixed(2));
        const reponse = fr(valeur);

        // L'ÉNONCÉ NOMME LES DEUX BOUTS, et ce n'est pas une redite : sur un
        // écran étroit la figure glisse dans sa boîte, et les deux nombres des
        // bouts peuvent se trouver hors du cadre au moment où l'on regarde la
        // croix. Sur un grand écran, la phrase ne coûte rien.
        const enonce = `La droite va de ${debut} à ${debut + 1}. `
            + 'Quelle est l’abscisse de la croix ?';

        // ── LES TROIS FAUTES DE CETTE LECTURE ─────────────────────────────
        //
        //   1. ON LIT LE DIXIÈME POUR LE CENTIÈME : 8,47 devient 8,4 — on
        //      s'arrête au grand trait sans compter les petits.
        //   2. ON COMPTE DEPUIS LE MAUVAIS CÔTÉ : au lieu de compter sept
        //      petits traits après 8,4, on en compte trois avant 8,5.
        //   3. ON OUBLIE LA PARTIE ENTIÈRE : « 0,47 » au lieu de « 8,47 ».
        //      C'est l'élève qui lit la graduation et non l'axe.
        const dixieme = Number((debut + Math.floor(cran / 10) / 10).toFixed(2));
        const depuisLaDroite = Number(
            (debut + (Math.ceil(cran / 10) * 10 - (cran % 10 || 10)) / 100).toFixed(2));
        const sansEntier = Number((cran / 100).toFixed(2));

        const joli = (v) => fr(v);
        const leurres = [
            { value: joli(dixieme), label: joli(dixieme),
                why: 'C’est le grand trait d’avant la croix : tu t’es arrêté au '
                    + 'dixième sans compter les petits traits.' },
            { value: joli(depuisLaDroite), label: joli(depuisLaDroite),
                why: 'Tu as compté les petits traits en partant de la DROITE. On compte '
                    + 'toujours depuis le trait de gauche, celui du plus petit nombre.' },
            { value: joli(sansEntier), label: joli(sansEntier),
                why: `Tu as lu la graduation, mais oublié où commence l’axe : il part `
                    + `de ${debut}, pas de 0.` }
        ].filter(l => l.value !== reponse);

        return makeItem({
            seed: rng.seed,
            generatorId: 'num.lire-au-centieme',
            skillId: SKILL,
            answerKind: 'numeric',
            prompt: {
                text: enonce,
                html: `<div class="game-question">${enonce}</div>`
                    // PAS DE CASE DESSINÉE AU BOUT DE L'AXE, et c'est une
                    // mesure qui l'a décidé. Le pavé n'allume son mécanisme de
                    // cases qu'à partir de DEUX trous (`aTrous = trous.length >
                    // 1`, dans `activities/numeric.js`) : une case unique posée
                    // dans la figure restait décorative — on cliquait dessus,
                    // on tapait, et le « ? » ne bougeait pas. Une case qui ne
                    // se remplit jamais est pire qu'une absence de case.
                    //
                    // Ici il n'y a qu'un nombre à écrire : le pavé a son propre
                    // afficheur, et c'est lui qui le montre.
                    + figure(axeCentiemesSvg({ debut, point: valeur }),
                        'figure-wrap--cent'),
                papier: 'Écris l’abscisse de chaque croix.'
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
                    const v = fr(Number((debut + Math.min(99, Math.max(1, cran + d)) / 100)
                        .toFixed(2)));
                    return { value: v, label: v };
                }
            }),
            hints: [
                `Trouve d’abord le GRAND trait juste à gauche de la croix : il donne le `
                    + `dixième.`,
                'Puis compte les petits traits depuis ce grand trait. Le trait ROUGE est au '
                    + 'milieu : il en vaut cinq, et t’évite de compter plus loin.',
                `La croix est après ${fr(dixieme)}, à ${cran % 10} petit${cran % 10 > 1 ? 's' : ''} `
                    + `trait${cran % 10 > 1 ? 's' : ''} : ${reponse}.`
            ],
            explanation: `Un grand trait vaut un dixième, un petit trait un centième. La croix `
                + `est ${cran % 10 === 0 ? `sur le grand trait ${reponse}`
                    : `à ${cran % 10} petit${cran % 10 > 1 ? 's' : ''} trait${
                        cran % 10 > 1 ? 's' : ''} après ${fr(dixieme)}`} : ${reponse}.`,
            difficulty: marche.id === 'reperes' ? 1 : marche.id === 'cote' ? 2 : 3,
            meta: {
                marche: marche.id,
                decimal: true,
                debut, cran, valeur,
                theme: `${marche.id}-${debut}`
            }
        });
    }
};

export default lireAuCentiemeGenerator;
