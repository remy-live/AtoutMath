// LES TRANSVASEMENTS — mesurer une quantité en versant d'un bidon dans l'autre.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 29 octobre : « j'aime bien les transvasements […] il faudra faire du
// drag drop plutôt ».
//
// CE QUE L'ÉLÈVE TRAVAILLE. Avec 5 L et 3 L on obtient tout ; avec 6 L et 4 L
// on n'obtiendra jamais 3 L, et l'on peut verser une heure. La frontière a un
// nom — les multiples du PGCD — et le jeu la fait RENCONTRER avant que le
// cours ne la nomme. Le niveau 2 sert exprès des bidons dont le PGCD vaut 2 ou
// 3 : les cibles impaires n'y existent pas, et l'élève finit par s'en douter.
//
// LE NIVEAU 3 CHANGE DE PROBLÈME. Trois bidons, aucun robinet, et tout le
// liquide est là au départ : rien ne se perd, on PARTAGE au lieu de mesurer.
// C'est le vieux problème des huit litres à couper en deux.

import { makeItem } from '../items.js';
import { NIVEAUX, tirerEnigme } from '../transvasements.js';

const SKILL = 'num.logique.transvasements';

/** « le bidon de 5 L », ou « le grand », « le moyen », « le petit » à trois. */
export function nommerLesBidons(caps) {
    if (caps.length === 3) return ['le grand', 'le moyen', 'le petit'];
    return caps.map(c => `le bidon de ${c} L`);
}

export const transvasementsGenerator = {
    id: 'logique.transvasements',
    label: 'Les Transvasements',
    skills: [SKILL],
    answerKinds: ['grid'],
    params: [
        {
            id: 'niveau', type: 'select', label: 'L\'énigme', default: '1',
            aide: 'Au niveau 2, certains bidons ne permettent PAS toutes les cibles — '
                + 'c\'est voulu, et c\'est la première rencontre avec le PGCD.',
            options: Object.entries(NIVEAUX).map(([value, n]) => ({ value, label: n.nom }))
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const niveau = NIVEAUX[p.niveau] ? Number(p.niveau) : 1;
        const e = tirerEnigme(rng, niveau, ctx.index || 0);
        const noms = nommerLesBidons(e.caps);

        // UNE ESPACE INSÉCABLE ENTRE LE NOMBRE ET SON UNITÉ : sur un téléphone,
        // « bidons de 7 L et 5 L » coupait la ligne entre le 5 et le L, et l'élève
        // lisait « 5 » puis « L » sur la ligne d'après. Vu sur la capture.
        const liste = e.caps.map(c => `${c} L`).join(' et ');
        const consigne = e.famille === 'partage'
            ? `Le grand bidon est plein. Avec ${liste}, mesure exactement ${e.cible} L — `
                + 'il n\'y a ni robinet ni évier.'
            : `Avec des bidons de ${liste}, mesure exactement ${e.cible} L.`;

        return makeItem({
            seed: rng.seed,
            generatorId: 'logique.transvasements',
            skillId: SKILL,
            answerKind: 'grid',
            prompt: {
                text: consigne,
                papier: consigne,
                html: `<div class="game-question ts-consigne">${consigne}</div>`
            },
            // LA RÉPONSE EST LA CIBLE ATTEINTE. L'écran l'envoie dès qu'un bidon
            // la contient : il existe plusieurs chemins, et compter faux une
            // suite de gestes juste parce qu'elle n'est pas la plus courte
            // serait punir celui qui a cherché.
            answer: String(e.cible),
            hints: [
                e.famille === 'partage'
                    ? 'Rien n\'entre et rien ne sort : la somme des trois bidons ne change '
                        + 'jamais. Regarde ce que chaque versement DÉPLACE.'
                    : `Remplis ${noms[0]}, verse-le dans ${noms[1]} : il te reste `
                        + `${e.caps[0] - e.caps[1]} L dans le premier. C'est le début de tout.`,
                'Un versement s\'arrête tout seul — soit le premier est vide, soit le second '
                    + 'est plein. Il n\'y a jamais de demi-mesure à estimer.',
                `La plus courte solution tient en ${e.minimum} gestes. Si tu en as fait le `
                    + 'double, ce n\'est pas grave : c\'est la même énigme résolue.'
            ],
            explanation: `${e.cible} L s'obtient en ${e.minimum} gestes avec des bidons de `
                + `${liste}.`,
            difficulty: niveau,
            meta: {
                caps: e.caps, famille: e.famille, cible: e.cible,
                minimum: e.minimum, depart: e.depart, pgcd: e.pgcd,
                noms,
                titreCourt: 'Transvasements',
                texteLecon: 'Ce qu\'on peut mesurer, ce sont les multiples du PGCD des '
                    + 'deux bidons.'
            }
        });
    }
};

export default transvasementsGenerator;
