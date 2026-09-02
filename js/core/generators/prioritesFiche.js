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
import { tirerExpression, etapes, etapesMax } from '../priorites.js';

export const prioritesFicheGenerator = {
    id: 'calc.priorites-fiche',
    label: 'Priorités : la cascade sur le papier',
    answerKinds: ['numeric'],
    skills: ['num.prio', 'num.prio.relatifs'],
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
        },
        {
            // LE MÊME COUPLAGE QU'À L'ÉCRAN. La feuille de l'exercice
            // « Prio-Bot Relatifs » sort par ce générateur : sans ce réglage,
            // elle imprimait des priorités sans un seul négatif, c'est-à-dire
            // un autre exercice que celui qu'on venait de faire.
            id: 'relatifs', type: 'checkbox', label: 'Avec des nombres relatifs', default: false,
            aide: 'Les nombres peuvent être négatifs, et le résultat aussi. La règle de '
                + 'priorité désigne l\'opération, la règle des signes la calcule — deux '
                + 'gestes dans cet ordre, et ils se ratent séparément.'
        },
        {
            id: 'puissances', type: 'checkbox', label: 'Avec des puissances', default: false,
            aide: 'Une ou deux puissances tombent dans l\'expression : 3 + 4² × 2. Elles se '
                + 'calculent APRÈS les parenthèses et AVANT les multiplications. La feuille '
                + 'réserve alors une ligne de plus par calcul, puisqu\'il y a une étape de plus.'
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
        const puissances = !!params.puissances;
        const relatifs = !!params.relatifs;

        // `themesExclus` arrive par le CONTEXTE, pas par les réglages : le lire
        // au mauvais endroit ne casse rien de visible, la fiche imprime
        // simplement plusieurs fois la même expression.
        const dejaVus = new Set(ctx.themesExclus || []);
        let e = null;
        for (let essai = 0; essai < 40; essai++) {
            const tire = tirerExpression({ rng, niveau, parentheses, puissances, relatifs });
            if (!dejaVus.has(tire.texte)) { e = tire; break; }
            e = e || tire;
        }

        const lignes = (e.lignes || etapes(e.jetons, { relatifs })).map(l => l.texte);

        return makeItem({
            seed: rng.seed,
            generatorId: 'calc.priorites-fiche',
            // LA COMPÉTENCE SUIT LE RÉGLAGE : une feuille de priorités avec
            // des relatifs ne travaille pas la même chose, et ne doit pas se
            // ranger au même endroit du bilan.
            skillId: relatifs ? 'num.prio.relatifs' : 'num.prio',
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
                // ET LE MAXIMUM DU RÉGLAGE, pour que tous les calculs de la
                // feuille aient la MÊME hauteur. Donner à chacun le compte
                // exact de ses étapes écrit la réponse en creux : trois lignes
                // vides disent « il reste trois opérations ».
                etapesMax: etapesMax({ niveau, parentheses, puissances }),
                resultat: e.resultat,
                niveau,
                // Ce que la fiche exclura pour le bloc suivant.
                theme: e.texte
            }
        });
    }
};
