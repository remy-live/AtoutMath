// RÉDUIRE AVEC DES PUISSANCES — les dix marches.
//
// Rémy : « j'aimerais bien un exercice pour simplifier une expression littérale
// du genre 3x² + 2x − 12x etc., mets des boutons carrés voire cube. On essaie
// d'être progressif. »
//
// « ON ESSAIE D'ÊTRE PROGRESSIF » COMMANDE LA FORME DE CE FICHIER. Poser
// « 3x² + 2x − 12x » à un élève qui n'a jamais écrit x² ne lui apprend rien :
// il échoue sur l'écriture avant d'arriver à la règle. La progression sépare
// donc les trois obstacles, un par un, et ne les réunit qu'à la fin :
//
//   1-2. ÉCRIRE une puissance. x × x s'écrit x², 3 × x² s'écrit 3x². Rien à
//        regrouper : on apprend une notation.
//   3-4. REGROUPER CE QUI SE REGROUPE. 2x² + 5x² = 7x². Même degré, on ajoute
//        les coefficients — et l'exposant, lui, NE BOUGE PAS.
//   5-6. NE PAS REGROUPER CE QUI NE SE REGROUPE PAS. 3x² + 2x est déjà réduit.
//        C'est la marche la plus importante des dix, et la seule façon de la
//        travailler est de poser la question dont la réponse est « on ne peut
//        pas aller plus loin ».
//   7-10. LES DEUX À LA FOIS — l'exemple de Rémy, puis les cubes, puis tout.
//
// LES PIÈGES SONT LES DEUX FAUTES DU CHAPITRE, jamais du bruit : tout
// regrouper (« 3x² + 2x = 5x² »), et ajouter les exposants (« x² + x² = x⁴ »).
// Voir `core/reductionPuissances.js`, où elles sont fabriquées.
//
// Module pur : ni DOM, ni horloge.

import { makeItem } from '../items.js';
import {
    paramMarches, marchesCochees, marcheAuRang, conseilProgression, totalDe
} from '../progression.js';
import {
    ecrireSomme, reduire, fauteToutRegrouper, fauteAjouterExposants, partDeDegre, MOINS
} from '../reductionPuissances.js';

const SKILL = 'num.litteral.puissances';
const LETTRES = ['x', 'a', 'y', 'n', 't'];

export const ETAPES = [
    { id: 'ecrire-carre', titre: 'La lettre fois elle-même', degreMax: 2 },
    { id: 'coef-carre', titre: 'Un nombre fois un carré', degreMax: 2 },
    { id: 'somme-carres', titre: 'Deux carrés à regrouper', degreMax: 2 },
    { id: 'difference-carres', titre: 'Une soustraction de carrés', degreMax: 2 },
    { id: 'deja-reduite', titre: 'Quand on ne peut pas regrouper', degreMax: 2 },
    { id: 'carre-et-lettre', titre: 'Un carré et des lettres', degreMax: 2 },
    { id: 'trois-termes', titre: 'Trois termes, deux sacs', degreMax: 2 },
    { id: 'avec-nombre', titre: 'Avec un nombre tout seul', degreMax: 2 },
    { id: 'cubes', titre: 'Les cubes', degreMax: 3 },
    { id: 'complet', titre: 'Cube, carré, lettre et nombre', degreMax: 3 }
];

/** Le plus grand degré qu'une marche fait apparaître : le clavier s'y règle. */
export const degreDe = (etapeId) =>
    (ETAPES.find(e => e.id === etapeId) || ETAPES[0]).degreMax;

/**
 * UNE QUESTION D'UNE MARCHE.
 *
 * @returns {{termes, enonce, reponse, dejaReduite, pieges, pourquoi}}
 */
export function question(etape, rng) {
    const l = rng.pick(LETTRES);
    const n = (a = 2, b = 9) => rng.int(a, b);
    // Deux coefficients dont la somme n'est pas nulle : « 3x² − 3x² = 0 » est
    // une question juste, mais pas une question de RÉDUCTION — elle
    // n'apprendrait qu'à écrire zéro.
    const paire = () => {
        let a = n(), b = n();
        while (a === b) b = n();
        return [a, b];
    };

    const finir = (termes, ordre, pourquoi, dejaReduite = false) => {
        const enonceTermes = ordre || termes;
        const reduits = reduire(termes);
        const pieges = [];
        const tout = fauteToutRegrouper(termes, l);
        const exposants = fauteAjouterExposants(termes, l);
        const juste = ecrireSomme(reduits, l);
        if (tout !== juste) {
            pieges.push({
                value: tout,
                why: `On ne peut pas mettre ${partDeDegre(l, 2)} et ${l} dans le même sac : `
                    + `si ${l} vaut 5, alors ${l} vaut 5 et ${partDeDegre(l, 2)} en vaut 25.`
            });
        }
        if (exposants && exposants !== juste) {
            pieges.push({
                value: exposants,
                why: 'Les exposants s\'ajoutent quand on MULTIPLIE, pas quand on additionne. '
                    + `${partDeDegre(l, 2)} + ${partDeDegre(l, 2)} = 2${partDeDegre(l, 2)}, `
                    + `et non ${partDeDegre(l, 4)}.`
            });
        }
        return {
            termes, lettre: l,
            enonce: ecrireSomme(enonceTermes, l),
            reponse: juste,
            dejaReduite,
            pieges,
            pourquoi
        };
    };

    switch (etape.id) {
        case 'ecrire-carre': {
            // Pas une réduction : une NOTATION. On l'isole, parce qu'un élève
            // qui ne sait pas écrire x² échouera sur tout le reste sans qu'on
            // sache si c'est la règle ou l'écriture qui lui manque.
            return {
                termes: [{ coef: 1, degre: 2 }], lettre: l,
                enonce: `${l} × ${l}`,
                reponse: partDeDegre(l, 2),
                dejaReduite: false,
                pieges: [
                    { value: `2${l}`, why: `${l} × ${l} n'est pas ${l} + ${l}. Multiplier, c'est ${partDeDegre(l, 2)}.` },
                    { value: `${l}${l}`, why: `On note le nombre de facteurs en exposant : ${partDeDegre(l, 2)}.` }
                ],
                pourquoi: `${l} × ${l} s'écrit ${partDeDegre(l, 2)} : l'exposant compte COMBIEN DE FOIS `
                    + `la lettre est facteur. Ici deux fois, donc l'exposant est 2.`
            };
        }
        case 'coef-carre': {
            const a = n();
            return {
                termes: [{ coef: a, degre: 2 }], lettre: l,
                enonce: `${a} × ${l} × ${l}`,
                reponse: `${a}${partDeDegre(l, 2)}`,
                dejaReduite: false,
                pieges: [
                    { value: `${partDeDegre(l, 2)}${a}`, why: `Le nombre s'écrit DEVANT : ${a}${partDeDegre(l, 2)}.` },
                    { value: `${a * 2}${l}`, why: `On ne multiplie pas ${a} par 2 : les deux ${l} font ${partDeDegre(l, 2)}.` },
                    { value: `${a}${partDeDegre(l, 3)}`, why: `Il n'y a que DEUX ${l} : l'exposant est 2.` }
                ],
                pourquoi: `Les deux ${l} font ${partDeDegre(l, 2)}, et le nombre se range devant : `
                    + `${a}${partDeDegre(l, 2)}.`
            };
        }
        case 'somme-carres': {
            const [a, b] = paire();
            return finir(
                [{ coef: a, degre: 2 }, { coef: b, degre: 2 }], null,
                `${a}${partDeDegre(l, 2)} et ${b}${partDeDegre(l, 2)} portent la MÊME partie `
                + `littérale : on ajoute les nombres devant, ${a} + ${b} = ${a + b}, et `
                + `l'exposant NE BOUGE PAS.`);
        }
        case 'difference-carres': {
            const a = n(5, 12), b = n(2, 4);
            return finir(
                [{ coef: a, degre: 2 }, { coef: -b, degre: 2 }], null,
                `Même partie littérale, donc on calcule ${a} ${MOINS} ${b} = ${a - b} et l'on garde `
                + `${partDeDegre(l, 2)}.`);
        }
        case 'deja-reduite': {
            const a = n(), b = n();
            // LA MARCHE LA PLUS IMPORTANTE. Elle n'a qu'un piège, mais c'est
            // LE piège : celui qui consiste à répondre quelque chose plutôt
            // que de reconnaître qu'il n'y a rien à faire.
            return finir(
                [{ coef: a, degre: 2 }, { coef: b, degre: 1 }], null,
                `${a}${partDeDegre(l, 2)} et ${b}${l} n'ont pas la même partie littérale : `
                + `on ne peut PAS les regrouper. L'expression est déjà réduite.`,
                true);
        }
        case 'carre-et-lettre': {
            const [a, b] = paire();
            const c = n();
            return finir(
                [{ coef: a, degre: 1 }, { coef: c, degre: 2 }, { coef: b, degre: 1 }],
                null,
                `On range par sacs : les ${l} ensemble (${a} + ${b} = ${a + b}), le `
                + `${partDeDegre(l, 2)} tout seul. On écrit le plus haut degré d'abord.`);
        }
        case 'trois-termes': {
            // L'EXEMPLE DE RÉMY, mot pour mot : 3x² + 2x − 12x.
            const a = n(2, 5), b = n(2, 6), c = b + n(3, 8);
            return finir(
                [{ coef: a, degre: 2 }, { coef: b, degre: 1 }, { coef: -c, degre: 1 }],
                null,
                `Deux sacs : le ${partDeDegre(l, 2)} reste seul, et les ${l} se regroupent — `
                + `${b} ${MOINS} ${c} = ${MOINS}${c - b}. Donc ${a}${partDeDegre(l, 2)} `
                + `${MOINS} ${c - b}${l}.`);
        }
        case 'avec-nombre': {
            const [a, b] = paire();
            const c = n(), d = n();
            return finir(
                [{ coef: a, degre: 2 }, { coef: c, degre: 0 }, { coef: b, degre: 2 }, { coef: d, degre: 0 }],
                null,
                `Les ${partDeDegre(l, 2)} d'un côté (${a} + ${b} = ${a + b}), les nombres tout `
                + `seuls de l'autre (${c} + ${d} = ${c + d}). Un nombre sans lettre ne rejoint `
                + `jamais un terme en ${l}.`);
        }
        case 'cubes': {
            const [a, b] = paire();
            const c = n();
            return finir(
                [{ coef: a, degre: 3 }, { coef: c, degre: 1 }, { coef: b, degre: 3 }],
                null,
                `${partDeDegre(l, 3)}, c'est ${l} × ${l} × ${l}. Deux termes en `
                + `${partDeDegre(l, 3)} se regroupent : ${a} + ${b} = ${a + b}. Le ${l} reste seul.`);
        }
        default: {
            const [a, b] = paire();
            const c = n(), d = n(), e = n();
            return finir(
                [{ coef: a, degre: 3 }, { coef: c, degre: 2 }, { coef: -d, degre: 1 },
                    { coef: b, degre: 3 }, { coef: e, degre: 0 }],
                null,
                `Quatre sacs, un par degré : ${partDeDegre(l, 3)}, ${partDeDegre(l, 2)}, ${l}, `
                + `et les nombres. On additionne DANS chaque sac, jamais entre deux sacs, et `
                + `l'on écrit du plus haut degré au plus bas.`);
        }
    }
}

// LES MARCHES TELLES QUE LE PANNEAU LES COCHE, dans l'ordre de la leçon.
// Rémy : « il faudrait pouvoir choisir les niveaux par checkbox ».
const LISTE_MARCHES = ETAPES.map((e, i) => ({ id: e.id, nom: `${i + 1}. ${e.titre}`, groupe: null }));
const TEMPS = {};
const MOT = 'marche';
/** Le réglage d'avant les cases, pour relire un parcours enregistré. */
const ANCIEN = { cle: 'etape' };

export const litteralPuissancesGenerator = {
    id: 'num.litteral.puissances',
    label: 'Réduire avec des puissances',
    skills: [SKILL],
    answerKinds: ['text'],
    ecrit: true,
    // IL MANQUAIT ICI, ET LA PROGRESSION SE COUPAIT EN DEUX. Dix marches à deux
    // questions en demandent vingt ; le défaut de dix n'en montrait que cinq, et
    // la marche décisive — celle où l'on apprend à NE PAS regrouper x² avec x —
    // n'arrivait jamais. Le générateur dit maintenant ce qu'il lui faut, comme
    // ses voisins. Voir core/duree.js.
    conseil: (p) => conseilProgression(marchesCochees(p, LISTE_MARCHES, ANCIEN).length),
    params: [
        // PLUS DE BOUTON « AUTORISER LES CUBES ». Il filtrait la liste des
        // marches pour n'en garder que les degrés 2 : les cases le disent
        // maintenant en toutes lettres, et mieux — on peut garder « Cube,
        // carré, lettre et nombre » sans « Les cubes », ce que le booléen ne
        // savait pas faire. Le clavier, lui, n'a jamais lu ce réglage : il
        // suit le `degreMax` de la QUESTION posée (meta plus bas), donc le
        // bouton x³ continue d'apparaître exactement quand il sert.
        paramMarches({
            marches: LISTE_MARCHES, groupes: TEMPS, mot: MOT, ancien: ANCIEN
        })
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const index = ctx.index ?? 0;
        // LES MARCHES COCHÉES SE PARTAGENT LES QUESTIONS — voir
        // core/progression.js. Le nombre de questions se règle à part.
        const id = marcheAuRang(ctx.index ?? 0, marchesCochees(params, LISTE_MARCHES, ANCIEN),
            totalDe(ctx, params), params);
        const etape = ETAPES.find(e => e.id === id) || ETAPES[0];
        const q = question(etape, rng);
        const rangGlobal = ETAPES.findIndex(e => e.id === etape.id);

        const consigne = etape.id === 'ecrire-carre' || etape.id === 'coef-carre'
            ? 'Écris cette expression plus simplement'
            : 'Réduis cette expression';

        return makeItem({
            seed: rng.seed,
            generatorId: 'num.litteral.puissances',
            skillId: SKILL,
            answerKind: 'text',
            prompt: {
                text: `${consigne} : ${q.enonce}`,
                papier: `${q.enonce} =`,
                html: `<div class="game-question"><span class="lit-consigne">${consigne}</span>`
                    + `<span class="lit-expr">${q.enonce}</span></div>`
            },
            answer: q.reponse,
            hints: [
                'Range chaque terme dans son SAC : les ' + partDeDegre(q.lettre, 2) + ' avec les '
                + partDeDegre(q.lettre, 2) + ', les ' + q.lettre + ' avec les ' + q.lettre + ', '
                + 'les nombres avec les nombres.',
                q.dejaReduite
                    ? 'Regarde bien les deux termes : ont-ils vraiment la même partie littérale ?'
                    : 'Dans un sac, on ADDITIONNE les nombres de devant. L\'exposant, lui, ne '
                    + 'bouge jamais.'
            ],
            explanation: q.pourquoi,
            difficulty: rangGlobal < 2 ? 1 : rangGlobal < 6 ? 2 : 3,
            meta: {
                etape: etape.id, titre: etape.titre,
                marche: rangGlobal + 1, marches: ETAPES.length,
                lettre: q.lettre,
                // LE CLAVIER SE RÈGLE SUR LA QUESTION. Offrir un bouton x³ sur
                // une marche qui n'en veut pas, c'est proposer une réponse
                // qu'on sait fausse — et l'élève le sent, ce qui abîme la
                // confiance qu'il a dans les outils qu'on lui donne.
                degreMax: etape.degreMax,
                dejaReduite: !!q.dejaReduite,
                // Les fautes attendues voyagent avec l'item : l'activité s'en
                // sert pour NOMMER l'erreur au lieu de dire « non ».
                pieges: q.pieges
            }
        });
    }
};

export default litteralPuissancesGenerator;
