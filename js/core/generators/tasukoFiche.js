// LE TASUKO — sur le papier.
//
// C'est sa forme la plus naturelle : une grille de chiffres et un crayon pour
// entourer les paires. Rien à adapter — l'écran n'y ajoute que la vérification
// et la liste des sommes qui restent.
//
// LA LISTE DES SOMMES S'IMPRIME AVEC LA GRILLE, et ce n'est pas une décoration.
// À l'écran, elle s'éteint toute seule au fur et à mesure ; sur le papier,
// c'est l'élève qui barre — et il lui faut donc de quoi barrer. Sans cette
// bande, il perd le fil au bout de six paires et recompte tout depuis le début.
//
// LE CORRIGÉ IMPRIME LES CAPSULES, pas une liste. Une liste « 3 + 4 = 7 ;
// 5 + 1 = 6 ; … » ne se compare à rien : ce qu'on veut voir en corrigeant,
// c'est OÙ elles étaient. Les additions restent écrites dans le bloc
// d'explication, pour la correction au tableau.

import { makeItem } from '../items.js';
import { creerTasuko, qualiteTasuko, paireDe, TAILLES_TASUKO } from '../tasuko.js';

export const tasukoFicheGenerator = {
    id: 'log.tasuko-fiche',
    label: 'Tasuko — les sommes cachées',
    skills: ['num.logique.tasuko'],
    answerKinds: ['grid'],
    params: [
        {
            id: 'taille', type: 'select', label: 'Taille de la grille', default: 'moyenne',
            aide: 'La difficulté ne vient pas du calcul — les chiffres sont minuscules — mais '
                + 'du nombre de PIÈGES : des paires parfaitement justes qui volent un chiffre '
                + 'à une autre, ou qui refont une somme déjà employée.',
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
                text: `Tasuko ${g.l} × ${g.h} : les sommes de 1 à ${g.n}.`,
                papier: 'Tasuko — relie les paires.',
                html: `<div class="game-question">Tasuko ${g.l} × ${g.h}</div>`
            },
            answer: q.lignes.join(' ; '),
            explanation: `Les ${q.additions} sommes, de 1 à ${g.n} : ${q.lignes.join(' ; ')}. `
                + `La grille laissait relier ${q.additions + q.pieges} paires de voisines, `
                + `donc ${q.pieges} pièges — des additions justes qui prenaient un chiffre `
                + 'dont une autre avait besoin, ou qui refaisaient une somme déjà employée.',
            difficulty: { petite: 1, moyenne: 2, grande: 2, geante: 3 }[taille] || 2,
            meta: {
                taille, l: g.l, h: g.h, n: g.n,
                grille: g.grille,
                // Le corrigé n'a besoin que des deux cases de chaque paire :
                // c'est ce qui se dessine, et cela évite d'embarquer les pièges.
                solution: g.solution.map(id => {
                    const paire = paireDe(g, id);
                    return { cases: paire.cases, a: paire.a, b: paire.b, somme: paire.somme };
                }),
                pieges: q.pieges
            }
        });
    }
};
