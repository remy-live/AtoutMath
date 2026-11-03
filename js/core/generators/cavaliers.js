// L'ÉNIGME DES CAVALIERS — échanger les cavaliers sur un petit damier.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 31 octobre, avec la photo d'un livre : « j'aimeri bien aussi cette
// enigme ». C'est le problème de Guarini, 1512.
//
// CE QUE L'ÉLÈVE TRAVAILLE. Pas le calcul : le RAISONNEMENT SUR UN GRAPHE,
// avec les mains. Sur un damier 3 × 3, la case du milieu ne sert à rien et les
// huit autres forment un seul collier — chaque case n'a que deux voisines au
// saut du cavalier. Les cavaliers y tournent comme des perles et ne peuvent
// jamais se dépasser. Échanger deux paires, c'est donc faire tourner tout le
// monde d'un quart de tour : seize coups, et c'est le minimum.
//
// LE NIVEAU 3 CHANGE DE PROBLÈME, exprès. Sur un 3 × 4 le milieu n'est plus
// mort, le graphe n'est plus un cycle, et les cavaliers peuvent enfin se
// croiser : ce qui marchait ne marche plus, et c'est ainsi qu'on apprend que
// la forme du graphe était la vraie question.

import { makeItem } from '../items.js';
import { NIVEAUX, tirerEnigme } from '../cavaliers.js';

const SKILL = 'num.logique.cavaliers';

export const cavaliersGenerator = {
    id: 'logique.cavaliers',
    label: 'L\'énigme des cavaliers',
    skills: [SKILL],
    answerKinds: ['grid'],
    params: [
        {
            id: 'niveau', type: 'select', label: 'Le damier', default: '2',
            aide: 'Le niveau 2 est l\'énigme de 1512, en seize coups. Le niveau 1 '
                + 'la fait rencontrer avec deux cavaliers seulement.',
            options: Object.entries(NIVEAUX).map(([value, n]) => ({ value, label: n.nom }))
        }
    ],

    generate(params, ctx) {
        const p = params || {};
        const niveau = NIVEAUX[p.niveau] ? Number(p.niveau) : 2;
        // LE RANG FAIT TOURNER LE DAMIER d'un quart de tour. Le niveau 2 n'a
        // qu'une énigme — c'est celle de 1512, et c'est voulu —, mais une
        // feuille de deux blocs en montrait DEUX FOIS la même figure. Vu sur
        // l'image. Tourner ne change ni l'énigme ni son compte de coups ; la
        // main, elle, cherche autrement.
        const e = tirerEnigme(niveau, ctx.index || 0);
        const combien = e.depart.filter(Boolean).length;

        // UNE ESPACE INSÉCABLE ENTRE LE NOMBRE ET SON NOM : sur un téléphone,
        // « 16 coups » coupait la ligne entre le nombre et le mot. Même piège
        // que « 5 L » sur les Transvasements, même correction.
        const consigne = combien === 2
            ? 'Échange les deux cavaliers. Un cavalier saute en L : deux cases '
                + 'd\'un côté, une de l\'autre.'
            : 'Échange les cavaliers rouges et les bleus. Un cavalier saute en L : '
                + 'deux cases d\'un côté, une de l\'autre.';

        return makeItem({
            seed: ctx.rng.seed,
            generatorId: 'logique.cavaliers',
            skillId: SKILL,
            answerKind: 'grid',
            prompt: {
                text: consigne,
                papier: consigne,
                html: `<div class="game-question cv-consigne">${consigne}</div>`
            },
            // LA RÉPONSE EST « échangé ». L'écran l'envoie dès que chaque case
            // porte la couleur demandée : il y a plusieurs chemins, et compter
            // faux une suite de coups juste parce qu'elle n'est pas la plus
            // courte serait punir celui qui a cherché.
            answer: 'echange',
            hints: [
                'Compte les cases où un cavalier peut aller depuis là où il est. '
                    + 'Tu en trouveras toujours DEUX, jamais une de plus.',
                'Deux voisines par case : les cases forment donc un anneau, et les '
                    + 'cavaliers y tournent sans jamais pouvoir se dépasser.',
                e.minimum
                    ? `Tourne tout le monde dans le MÊME sens. La plus courte solution `
                        + `tient en ${e.minimum} coups ; si tu en as fait le double, `
                        + `ce n'est pas grave : c'est la même énigme résolue.`
                    : 'Tourne tout le monde dans le même sens.'
            ],
            explanation: e.collier
                ? `Les ${e.collier.length} cases utiles forment un seul anneau : chacune `
                    + `n'a que deux voisines. Il faut donc faire tourner les cavaliers, `
                    + `tous dans le même sens — ${e.minimum} coups.`
                : `Ici le damier n'est plus un anneau : les cavaliers peuvent se croiser, `
                    + `et ${e.minimum} coups suffisent.`,
            difficulty: niveau,
            meta: {
                colonnes: e.colonnes, lignes: e.lignes, mortes: e.mortes,
                depart: e.depart, arrivee: e.arrivee,
                collier: e.collier, minimum: e.minimum, solution: e.solution,
                titreCourt: 'Cavaliers',
                texteLecon: 'Sur un damier 3 × 3, les huit cases utiles forment un seul '
                    + 'anneau : les cavaliers y tournent et ne se dépassent jamais.'
            }
        });
    }
};

export default cavaliersGenerator;
