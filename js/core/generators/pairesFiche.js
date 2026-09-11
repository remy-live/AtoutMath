// LES AMIS DE DIX — sur le papier : relier les paires.
//
// À l'écran, on tape 3 puis 7 et les deux cartes s'envolent. Sur la feuille, on
// TRACE le trait — et c'est un autre exercice, plus proche de ce qu'on demande
// en évaluation : deux colonnes, un nombre à gauche, son complément à droite,
// mélangés.
//
// LES COMPLÉMENTS SONT DANS LE DÉSORDRE, évidemment ; mais surtout, aucun
// nombre n'apparaît deux fois dans une colonne. Deux « 3 » à gauche donneraient
// deux traits également justes vers le même 7, et l'on ne saurait plus corriger.

import { makeItem } from '../items.js';

const CIBLES = { 10: 1, 100: 10, 1000: 100 };

export const pairesFicheGenerator = {
    id: 'num.paires-fiche',
    label: 'Relier les compléments',
    skills: ['num.complement'],
    answerKinds: ['grid'],
    params: [
        {
            id: 'cible', type: 'select', label: 'Compléter à', default: 10,
            options: [
                { value: 10, label: '10' },
                { value: 100, label: '100 (dizaines rondes)' },
                { value: 1000, label: '1000 (centaines rondes)' }
            ]
        },
        { id: 'paires', type: 'number', label: 'Paires par grille', default: 6, min: 4, max: 9 }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const cible = CIBLES[Number(p.cible)] ? Number(p.cible) : 10;
        const pas = CIBLES[cible];
        const combien = Math.max(4, Math.min(9, Number(p.paires) || 6));

        // Les valeurs possibles : de un pas au complément d'un pas. On en tire
        // des DISTINCTES, et l'on écarte la moitié exacte (5 pour 10) : elle
        // serait son propre complément, donc deux fois le même nombre dans les
        // deux colonnes.
        const toutes = [];
        for (let v = pas; v < cible; v += pas) if (v * 2 !== cible) toutes.push(v);
        const gauche = rng.shuffle(toutes).slice(0, Math.min(combien, toutes.length));
        const droite = rng.shuffle(gauche.map(v => cible - v));

        return makeItem({
            seed: rng.seed,
            generatorId: 'num.paires-fiche',
            skillId: 'num.complement',
            answerKind: 'grid',
            prompt: {
                text: `Relie chaque nombre à son complément à ${cible}.`,
                papier: `Relie chaque nombre à son complément à ${cible}.`,
                html: `<div class="game-question">Amis de ${cible}</div>`
            },
            answer: gauche.map(v => `${v}+${cible - v}`).join('|'),
            explanation: gauche.map(v => `${v} + ${cible - v} = ${cible}`).join(' ; ') + '.',
            difficulty: cible === 10 ? 1 : (cible === 100 ? 2 : 3),
            meta: {
                cible, gauche, droite,
                // Pour chaque nombre de gauche, la place de son complément à
                // droite : c'est ce que la fiche trace en solution.
                lien: gauche.map(v => droite.indexOf(cible - v))
            }
        });
    }
};
