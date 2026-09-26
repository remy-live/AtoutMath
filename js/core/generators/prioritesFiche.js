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
import {
    paramMarches, marchesCochees, marcheAuRang, totalDe
} from '../progression.js';

// ── LES QUATRE DIFFICULTÉS, EN CASES À COCHER ───────────────────────────────
//
// Rémy : « fais tout, ce serait le plus cohérent non ? » — et sur une feuille
// ce n'est pas seulement de la cohérence. Le menu donnait UNE difficulté pour
// les douze expressions de la page ; les cases donnent une feuille qui MONTE,
// ce qui est la forme ordinaire d'un exercice d'entraînement sur papier : on
// commence par deux calculs simples et l'on finit sur les deux durs.
const MARCHES_PRIO = [
    { id: '1', nom: '1. Deux opérations, sans parenthèses' },
    { id: '2', nom: '2. Jusqu\'à trois opérations' },
    { id: '3', nom: '3. Les parenthèses arrivent' },
    { id: '4', nom: '4. Deux groupes de parenthèses' }
];
/** Le réglage d'avant les cases — voir `marchesCochees`. */
const ANCIEN_PRIO = { cle: 'niveau' };

export const prioritesFicheGenerator = {
    id: 'calc.priorites-fiche',
    label: 'Priorités : la cascade sur le papier',
    answerKinds: ['numeric'],
    skills: ['num.prio', 'num.prio.relatifs'],
    params: [
        paramMarches({ marches: MARCHES_PRIO, mot: 'niveau', ancien: ANCIEN_PRIO }),
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
            aide: 'Ajoute une ou deux puissances dans les expressions. Elles se calculent après '
                  + 'les parenthèses et avant les multiplications.'
        }
    ],

    // Les réglages d'abord, le contexte ensuite : c'est la signature du
    // registre. L'inverser produit « rng.int is not a function » au premier
    // appel réel, et seul le test d'invariant du catalogue le voit.
    generate(params, ctx) {
        const rng = ctx.rng;
        params = params || {};
        // LES NIVEAUX COCHÉS SE PARTAGENT LES CALCULS DE LA PAGE, dans
        // l'ordre — voir core/progression.js. `ctx.total` est le nombre de
        // blocs de la feuille ; sans lui (une vignette) on retombe sur deux
        // calculs par niveau, ce que faisait l'écran avant les cases.
        const coches = marchesCochees(params, MARCHES_PRIO, ANCIEN_PRIO);
        const niveau = Math.max(1, Math.min(4, Number(marcheAuRang(ctx.index ?? 0,
            coches, totalDe(ctx, params), params)) || 2));
        // ET LE PLUS HAUT NIVEAU COCHÉ, pour la hauteur des lignes — voir
        // `etapesMax` plus bas. Le prendre sur CETTE expression-là donnerait à
        // chaque calcul la hauteur de sa propre cascade, c'est-à-dire la
        // réponse en creux : trois lignes vides diraient « il reste trois
        // opérations », et le calcul d'à côté n'en aurait que deux.
        const niveauMax = coches.reduce((m, x) => Math.max(m, Number(x.id) || 0), 1);
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
                etapesMax: etapesMax({ niveau: niveauMax, parentheses, puissances }),
                resultat: e.resultat,
                niveau,
                marche: String(niveau),
                // Ce que la fiche exclura pour le bloc suivant.
                theme: e.texte
            }
        });
    }
};
