// TABLEAU DE PROPORTIONNALITÉ — sur le papier.
//
// C'est le seul de tous ces exercices qui se photocopie tel quel : deux lignes,
// quelques colonnes, des cases vides. Le noyau (core/proportion.js) garantit
// déjà les deux propriétés sans lesquelles l'exercice serait injuste — au moins
// une colonne entièrement connue, et jamais les deux cases d'une même colonne —
// donc la fiche n'a rien à réinventer, seulement à dessiner.

import { makeItem } from '../items.js';
import { tirerTableau, attendu, ecrire } from '../proportion.js';
import {
    paramMarches, marchesCochees, marcheAuRang, conseilProgression, totalDe
} from '../progression.js';

// ── LA PROGRESSION, EN CASES À COCHER ───────────────────────────────────────
//
// Rémy : « il y a pas mal de jeux où ce sont des étapes, et il faudrait
// pouvoir faire les check box comme pour le calcul littéral, tu ne penses
// pas ? — fais tout, ce serait le plus cohérent non ? »
//
// DOUZE TABLEAUX SUR UNE FEUILLE, ET TOUS AU MÊME CRAN : le menu ne
// savait dire que cela. Cochés, les trois crans se partagent la page — le
// coefficient entier d'abord, les cinq colonnes à la fin.
const LISTE_MARCHES = [
    { id: 'facile', nom: '1. Coefficient entier, 2 cases en bas' },
    { id: 'moyen', nom: '2. Coefficient décimal, 3 cases dans les deux sens' },
    { id: 'difficile', nom: '3. 5 colonnes, 4 cases, coefficients difficiles' }
];
/** Le réglage d'avant les cases — voir `marchesCochees`. */
const ANCIEN = { cle: 'niveau' };

export const proportionFicheGenerator = {
    id: 'num.proportion-fiche',
    label: 'Tableaux de proportionnalité',
    skills: ['num.proportion.tableau'],
    answerKinds: ['grid'],
    conseil: (p) => conseilProgression(marchesCochees(p, LISTE_MARCHES, ANCIEN).length),
    params: [
        paramMarches({ marches: LISTE_MARCHES, mot: 'niveau', ancien: ANCIEN })
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const niveau = String(marcheAuRang(ctx.index ?? 0,
            marchesCochees(params, LISTE_MARCHES, ANCIEN),
            totalDe(ctx, params), params) || 'facile');
        // DOUZE TABLEAUX SUR UNE FEUILLE, ET TROIS QUI PARLENT DE MENTHE À
        // L'EAU : l'élève ne lit plus la situation, il reconnaît la ligne. On
        // retire donc tant que le contexte a déjà servi sur cette fiche — la
        // réserve est finie, alors on s'arrête au bout de quelques essais
        // plutôt que de boucler.
        const deja = new Set(ctx.themesExclus || []);
        let t = tirerTableau(niveau, rng);
        for (let i = 0; i < 30 && deja.has(t.contexte.sujet); i++) t = tirerTableau(niveau, rng);
        const reponses = t.trous.map(trou => ecrire(attendu(t, trou)));
        return makeItem({
            seed: rng.seed,
            generatorId: 'num.proportion-fiche',
            skillId: 'num.proportion.tableau',
            answerKind: 'grid',
            prompt: {
                text: `Complète le tableau de proportionnalité (${t.contexte.sujet}).`,
                papier: `Complète le tableau (${t.contexte.sujet}).`,
                html: `<div class="game-question">${t.contexte.sujet}</div>`
            },
            answer: reponses.join('|'),
            // Le coefficient est DIT : c'est la seule chose à trouver, et celui
            // qui corrige doit pouvoir vérifier une case sans refaire le tableau.
            explanation: `On passe de « ${t.contexte.a} » à « ${t.contexte.b} » en multipliant `
                + `par ${ecrire(t.coef)}.`,
            difficulty: t.niveau === 'difficile' ? 3 : (t.niveau === 'moyen' ? 2 : 1),
            meta: {
                contexte: t.contexte, coef: t.coef,
                a: t.a, b: t.b, trous: t.trous, niveau: t.niveau,
                marche: niveau,
                // Le canal par lequel la fiche dit ce qu'elle a déjà servi.
                theme: t.contexte.sujet
            }
        });
    }
};
