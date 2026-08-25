// LE TASUKO — sur le papier.
//
// C'est sa forme la plus naturelle : une grille de chiffres et un crayon pour
// entourer. Rien à adapter — l'écran ne fait qu'y ajouter la vérification.
//
// LE CORRIGÉ IMPRIME LES CAPSULES, pas une liste d'additions. Une liste
// « 3 + 4 = 7 ; 5 + 1 = 6 ; … » ne se compare à rien : sur une recherche de
// mots, ce qu'on veut voir, c'est OÙ ils étaient. Les additions sont quand même
// écrites dans le bloc d'explication, pour la correction au tableau.

import { makeItem } from '../items.js';
import { creerTasuko, qualiteTasuko, additionDe, TAILLES_TASUKO } from '../tasuko.js';

export const tasukoFicheGenerator = {
    id: 'log.tasuko-fiche',
    label: 'Tasuko — les additions cachées',
    skills: ['num.logique.tasuko'],
    answerKinds: ['grid'],
    params: [
        {
            id: 'taille', type: 'select', label: 'Taille de la grille', default: 'moyenne',
            aide: 'La difficulté ne vient pas du calcul — les additions tiennent sur un '
                + 'chiffre — mais du nombre de PIÈGES : des additions parfaitement justes qui '
                + 'volent un chiffre à une autre. Plus la grille est grande, plus il y en a.',
            options: Object.values(TAILLES_TASUKO).map(t => ({ value: t.id, label: t.label }))
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const taille = TAILLES_TASUKO[p.taille] ? p.taille : 'moyenne';
        const g = creerTasuko({ taille, rng }) || creerTasuko({ taille: 'moyenne', rng });
        const q = qualiteTasuko(g);

        return makeItem({
            seed: rng.seed,
            generatorId: 'log.tasuko-fiche',
            skillId: 'num.logique.tasuko',
            answerKind: 'grid',
            prompt: {
                text: `Tasuko ${g.l} × ${g.h} : ${q.additions} additions à retrouver.`,
                papier: 'Tasuko — entoure les additions.',
                html: `<div class="game-question">Tasuko ${g.l} × ${g.h}</div>`
            },
            answer: q.lignes.join(' ; '),
            explanation: `${q.additions} additions : ${q.lignes.join(' ; ')}. `
                + `La grille en laissait lire ${q.additions + q.pieges}, `
                + `donc ${q.pieges} pièges — des additions justes qui prenaient un chiffre `
                + 'dont une autre avait besoin.',
            difficulty: { petite: 1, moyenne: 2, grande: 2, geante: 3 }[taille] || 2,
            meta: {
                taille, l: g.l, h: g.h,
                grille: g.grille,
                // Le corrigé n'a besoin que des trois cases de chaque addition :
                // c'est ce qui se dessine, et cela évite d'embarquer les pièges.
                solution: g.solution.map(id => {
                    const a = additionDe(g, id);
                    return { cases: a.cases, a: a.a, b: a.b, somme: a.somme };
                }),
                pieges: q.pieges
            }
        });
    }
};
