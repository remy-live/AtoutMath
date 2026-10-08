// L'ENQUÊTE SUR LE PAPIER — le plan, les indices, et la place pour déduire.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, dans sa revue du catalogue : l'Enquête n'avait pas de version imprimée.
// C'est pourtant l'exercice de la série qui se prête le mieux au papier — on
// relit les indices dix fois, on barre, on écrit un prénom au crayon dans une
// case et on l'efface. À l'écran, on clique et le logiciel refuse ; sur une
// feuille, on RATURE, et la rature est une trace du raisonnement.
//
// C'EST UN GÉNÉRATEUR À PART (`printGeneratorId`) parce que le jeu n'existe
// qu'à l'écran : il n'a pas de générateur du tout, il a une activité. Comme la
// balance et comme les Serpents.
//
// ── CE QUE LA FEUILLE DOIT PORTER, ET QU'UN ÉCRAN DONNE AUTREMENT ─────────
//
// À l'écran, les lieux sont des aplats de couleur et le survol dit leur nom.
// Sur le papier il faut que le plan se lise sans couleur et sans survol : les
// zones sont donc SÉPARÉES PAR UN TRAIT ÉPAIS et chacune porte son nom écrit.
// C'est le même calcul de contour que pour les Serpents — les bords extérieurs
// d'une zone, jamais ses bords intérieurs —, et c'est pour cela qu'il est
// partagé plutôt que réécrit.
//
// ── ET LE NOMBRE D'INDICES COMMANDE LA PLACE ──────────────────────────────
//
// Le noyau retire tous les indices dont on peut se passer : il en reste trois
// à sept selon le tirage. La fiche ne peut donc pas réserver une hauteur fixe —
// elle la demande au tirage, et c'est `meta.indices.length` qui la porte.

import { makeItem } from '../items.js';
import {
    SCENES, genererEnquete, phrasesDesIndices, laQuestion, lieuDe
} from '../enquete.js';
import { contourDuSerpent } from './serpentsFiche.js';

const SKILL = 'num.logique.enquete';

/**
 * LES ZONES DU PLAN, chacune avec son nom et son contour.
 *
 * Le plan d'une scène est une suite de chaînes — « CCP », « HHP »… — où chaque
 * lettre nomme un lieu. Deux cases portant la même lettre sont le même lieu, et
 * elles se touchent : la zone est donc un bloc de cases, exactement comme un
 * serpent, et son contour se calcule de la même façon.
 *
 * ON RÉEMPLOIE `contourDuSerpent` PLUTÔT QUE D'EN ÉCRIRE UN SECOND. Les deux
 * feuilles tracent le même objet — le bord extérieur d'un groupe de cases — et
 * deux descriptions de la même chose divergent au premier réglage. C'est la
 * leçon que ce dépôt a payée trois fois sur le radical.
 */
export function zonesDuPlan(scene) {
    const n = scene.taille;
    const parLettre = new Map();
    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            const L = scene.plan[r][c];
            if (!parLettre.has(L)) parLettre.set(L, []);
            parLettre.get(L).push(r * n + c);
        }
    }
    return [...parLettre].map(([lettre, cases]) => ({
        lettre,
        nom: scene.lieux[lettre],
        cases,
        contour: contourDuSerpent(cases, n, n),
        // L'ÉTIQUETTE VA DANS LA CASE LA PLUS HAUTE PUIS LA PLUS À GAUCHE.
        // Un nom posé au centre d'une zone en L tombe hors d'elle ; posé sur
        // sa première case, il est toujours dedans, et c'est ce qui compte.
        ancre: Math.min(...cases)
    }));
}

export const enqueteFicheGenerator = {
    id: 'logique.enquete-fiche',
    label: "L'Enquête (fiche)",
    skills: [SKILL],
    answerKinds: ['grid'],
    params: [],

    generate(params, ctx) {
        const rng = ctx.rng;
        const niveau = Math.min(SCENES.length, Math.max(1, Number((params || {}).niveau) || 1));
        const e = genererEnquete({ rng, niveau });
        const n = e.scene.taille;

        return makeItem({
            seed: rng.seed,
            generatorId: 'logique.enquete-fiche',
            skillId: SKILL,
            answerKind: 'grid',
            prompt: {
                text: laQuestion(e),
                papier: laQuestion(e)
            },
            answer: e.noms[e.coupable],
            hints: [
                'Commence par l\'indice qui parle d\'UNE SEULE personne : il la place '
                    + 'tout de suite, ou il ne lui laisse que deux cases.',
                'Deux personnes ne sont jamais sur la même rangée ni sur la même '
                    + 'colonne : chaque prénom placé en barre une entière.'
            ],
            explanation: `${e.noms[e.coupable]} était seul dans `
                + `${e.scene.lieux[e.lieuDeLObjet]}.`,
            difficulty: Math.min(5, 1 + niveau),
            meta: {
                taille: n,
                titre: e.scene.titre,
                question: laQuestion(e),
                indices: phrasesDesIndices(e),
                zones: zonesDuPlan(e.scene),
                reperes: e.scene.reperes || [],
                noms: e.noms,
                // La solution, UNE CASE PAR PRÉNOM, dans l'ordre des prénoms.
                solution: e.solution.map((cell, k) => ({
                    nom: e.noms[k], r: cell.r, c: cell.c,
                    lieu: e.scene.lieux[lieuDe(e.scene, cell)]
                })),
                coupable: e.noms[e.coupable],
                lieuDeLObjet: e.scene.lieux[e.lieuDeLObjet],
                niveau
            }
        });
    }
};
