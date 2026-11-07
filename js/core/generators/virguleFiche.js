// LA VIRGULE QUI SE DÉCALE — sur le papier.
//
// À l'écran, l'exercice se joue en trois temps : on fait GLISSER la virgule
// dans un tableau de numération, puis on choisit parmi quatre, puis on écrit.
// Le premier temps est une manipulation — il n'a pas d'équivalent papier, et
// il n'a pas à en avoir un : c'est justement ce que l'écran apporte.
//
// Reste ce qui s'écrit, et qui s'écrit très bien : « 4,52 × 10 = …… ». Une
// colonne de ces égalités est l'entraînement classique du chapitre, et le
// piège reste le même sur les deux supports — LE NOMBRE DE DÉPART A TOUJOURS
// UNE PARTIE DÉCIMALE. Avec un entier, la règle fausse « ×10, on ajoute un
// zéro » tomberait juste et sortirait renforcée de l'exercice.

import { makeItem } from '../items.js';
import { tirerQuestion, expliquer } from '../virgule.js';
import { espacerMilliers } from '../nombres.js';
import {
    paramMarches, marchesCochees, marcheAuRang, conseilProgression, totalDe
} from '../progression.js';

// ── LA PROGRESSION, EN CASES À COCHER ───────────────────────────────────────
//
// Rémy : « il y a pas mal de jeux où ce sont des étapes, et il faudrait
// pouvoir faire les check box comme pour le calcul littéral, tu ne penses
// pas ? — fais tout, ce serait le plus cohérent non ? »
//
// LES TROIS CRANS SE CONTIENNENT, et une feuille de douze calculs restait
// pourtant sur un seul. Cochés, ils se partagent la page : on commence par
// « × 10 », on finit sur les millièmes.
const LISTE_MARCHES = [
    { id: 'facile', nom: '1. × 10 et × 100 seulement' },
    { id: 'moyen', nom: '2. × et ÷ par 10, 100, 1000' },
    { id: 'difficile', nom: "3. Idem, jusqu'aux millièmes" }
];
/** Le réglage d'avant les cases — voir `marchesCochees`. */
const ANCIEN = { cle: 'niveau' };

export const virguleFicheGenerator = {
    id: 'num.virgule-fiche',
    label: 'Multiplier et diviser par 10, 100, 1000',
    skills: ['num.dec.puissances10'],
    answerKinds: ['numeric'],
    ecrit: true,
    conseil: (p) => conseilProgression(marchesCochees(p, LISTE_MARCHES, ANCIEN).length),
    params: [
        paramMarches({ marches: LISTE_MARCHES, mot: 'niveau', ancien: ANCIEN })
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const cran = String(marcheAuRang(ctx.index ?? 0,
            marchesCochees(params, LISTE_MARCHES, ANCIEN),
            totalDe(ctx, params), params) || 'facile');
        const q = tirerQuestion(cran, rng);
        // LES MILLIERS SE GROUPENT DANS L'ÉNONCÉ AUSSI : « 4 500 × 1 000 » se
        // lit, « 4500 × 1000 » se compte du doigt.
        const enonce = `${espacerMilliers(q.depart)} ${q.op} ${espacerMilliers(String(q.facteur))}`;
        return makeItem({
            seed: rng.seed,
            generatorId: 'num.virgule-fiche',
            skillId: 'num.dec.puissances10',
            answerKind: 'numeric',
            prompt: {
                text: `${enonce} = ?`,
                // Sur le papier, l'égalité s'écrit en entier : c'est la ligne
                // que l'élève complète, et celle qu'il relira.
                papier: `${enonce} =`,
                html: `<div class="game-question">${enonce} = ?</div>`
            },
            answer: q.resultat,
            explanation: expliquer(q).join(' '),
            difficulty: q.facteur === 1000 ? 3 : (q.op === '÷' ? 2 : 1),
            meta: {
                depart: q.depart, op: q.op, facteur: q.facteur, rangs: q.rangs,
                marche: cran
            }
        });
    }
};
