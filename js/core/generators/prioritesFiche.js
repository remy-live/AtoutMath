// LES PRIORITÉS OPÉRATOIRES, SUR LE PAPIER.
//
// À l'écran, l'élève clique l'opération prioritaire et remplit un trou : la
// machine recopie le reste pour lui. Sur la feuille, PERSONNE NE RECOPIE À SA
// PLACE — et c'est précisément la faute qu'on traque :
//
//     7 × 5 × 4 − 7
//     35 × 4 − 7          ← on a fait 7 × 5 et RECOPIÉ « × 4 − 7 »
//     140 − 7
//     133
//
// L'élève qui « sait » que la multiplication passe d'abord perd quand même ses
// points parce qu'il oublie le « − 7 » en passant à la ligne. La fiche donne
// donc l'expression, puis AUTANT DE LIGNES VIDES QUE LE CALCUL A D'ÉTAPES : ni
// une de plus (ce serait un piège), ni une de moins (il faudrait tasser).
//
// La solution imprimée est la cascade complète, la même que celle de l'écran :
// elle vient de core/priorites.js, jamais d'un calcul refait ici.

import { makeItem } from '../items.js';
import { tirerExpression, etapes } from '../priorites.js';

export const prioritesFicheGenerator = {
    id: 'calc.priorites-fiche',
    label: 'Priorités : la cascade sur le papier',
    answerKinds: ['numeric'],
    skills: ['num.prio'],
    params: [
        {
            id: 'niveau', type: 'select', label: 'Difficulté', default: 2,
            options: [
                { value: 1, label: '1 — Deux opérations, sans parenthèses' },
                { value: 2, label: '2 — Jusqu\'à trois opérations' },
                { value: 3, label: '3 — Les parenthèses arrivent' },
                { value: 4, label: '4 — Deux groupes de parenthèses' }
            ]
        },
        {
            id: 'parentheses', type: 'checkbox', label: 'Avec des parenthèses', default: true,
            aide: 'Sans elles, seule la règle « × et ÷ avant + et − » est en jeu — et le '
                + 'tirage garantit qu\'un calcul mené de gauche à droite donne toujours faux.'
        }
    ],

    // Les réglages d'abord, le contexte ensuite : c'est la signature du
    // registre. L'inverser produit « rng.int is not a function » au premier
    // appel réel, et seul le test d'invariant du catalogue le voit.
    generate(params, ctx) {
        const rng = ctx.rng;
        params = params || {};
        const niveau = Math.max(1, Math.min(4, Number(params.niveau) || 2));
        const parentheses = params.parentheses !== false;

        // `themesExclus` arrive par le CONTEXTE, pas par les réglages : le lire
        // au mauvais endroit ne casse rien de visible, la fiche imprime
        // simplement plusieurs fois la même expression.
        const dejaVus = new Set(ctx.themesExclus || []);
        let e = null;
        for (let essai = 0; essai < 40; essai++) {
            const tire = tirerExpression({ rng, niveau, parentheses });
            if (!dejaVus.has(tire.texte)) { e = tire; break; }
            e = e || tire;
        }

        const lignes = (e.lignes || etapes(e.jetons)).map(l => l.texte);

        return makeItem({
            seed: rng.seed,
            generatorId: 'calc.priorites-fiche',
            skillId: 'num.prio',
            answerKind: 'numeric',
            prompt: {
                text: e.texte,
                papier: `${e.texte} =`,
                html: `<div class="game-question">${e.texte}</div>`
            },
            answer: e.resultat,
            explanation: lignes.join(' → '),
            difficulty: Math.min(5, 1 + e.etapes),
            meta: {
                texte: e.texte,
                // La cascade complète, première ligne comprise : c'est elle
                // qu'on imprime sur la page des solutions.
                lignes,
                // Autant de lignes vides que d'étapes — la première ligne est
                // déjà écrite, il reste donc « etapes » lignes à remplir.
                etapes: e.etapes,
                resultat: e.resultat,
                niveau,
                // Ce que la fiche exclura pour le bloc suivant.
                theme: e.texte
            }
        });
    }
};
