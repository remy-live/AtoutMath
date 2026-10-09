// Le logigramme comme ITEM : de quoi le poser sur une feuille.
//
// L'exercice à l'écran mène son propre jeu (il a sa grille cliquable et son
// robot), mais un logigramme est d'abord un exercice de PAPIER : on le fait au
// crayon, en rayant, en revenant en arrière. Ce générateur ne sert donc qu'à
// l'impression — c'est lui qui met l'énigme dans la fiche du professeur.

import { makeItem } from '../items.js';
import { genererLogigramme, niveauDe } from '../logigramme.js';
import {
    paramMarches, marchesCochees, marcheAuRang, conseilProgression, totalDe
} from '../progression.js';

// ── LA PROGRESSION, EN CASES À COCHER ───────────────────────────────────────
//
// Rémy : « il y a pas mal de jeux où ce sont des étapes, et il faudrait
// pouvoir faire les check box comme pour le calcul littéral, tu ne penses
// pas ? — fais tout, ce serait le plus cohérent non ? »
//
// LES SIX NIVEAUX ÉTAIENT UN MENU, et une feuille de six grilles restait
// donc au même niveau du début à la fin. Cochés, ils se partagent la page :
// on découvre sur la première, on croise quatre listes sur la dernière.
//
// LA LISTE S'EXPORTE, PARCE QUE TROIS ENDROITS EN VIVENT : le générateur du
// papier (ici), le jeu de l'écran (games/logigramme.js) et la carte du
// catalogue, qui réécrit son propre panneau. Elle y était recopiée à la main,
// avec des libellés plus riches que ceux d'ici — et deux listes qui ne disent
// pas tout à fait la même chose finissent toujours par diverger. On garde les
// libellés les plus complets, et il n'y a plus qu'une liste.
export const LISTE_MARCHES = [
    { id: '1', nom: '1. Découverte · 3 lignes, 2 listes' },
    { id: '2', nom: '2. Trois amis, deux listes · indices croisés' },
    { id: '3', nom: '3. Quatre à croiser · plus rien de donné' },
    { id: '4', nom: '4. Plus grand, plus petit · comparaisons' },
    { id: '5', nom: "5. L'écart exact · différences chiffrées" },
    { id: '6', nom: '6. Cinq, et rien de donné · avec des « soit… soit… »' }
];
/** Le réglage d'avant les cases — voir `marchesCochees`. */
export const ANCIEN = { cle: 'niveau' };
/** Le réglage tout fait, pour la carte comme pour le générateur. */
export const casesDeNiveau = () =>
    paramMarches({ marches: LISTE_MARCHES, mot: 'niveau', ancien: ANCIEN });

export const logigrammeGenerator = {
    id: 'logique.logigramme',
    label: 'Logigramme',
    skills: ['num.logique.logigramme'],
    answerKinds: ['grid'],
    conseil: (p) => conseilProgression(marchesCochees(p, LISTE_MARCHES, ANCIEN).length),
    params: [
        casesDeNiveau()
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        // LES NIVEAUX COCHÉS SE PARTAGENT LES GRILLES, dans l'ordre — voir
        // core/progression.js.
        const niv = niveauDe(marcheAuRang(ctx.index ?? 0,
            marchesCochees(params, LISTE_MARCHES, ANCIEN),
            totalDe(ctx, params), params));
        // Une fiche porte plusieurs logigrammes : la feuille dit lesquels sont
        // déjà servis pour qu'on change d'histoire à chaque grille.
        const p = genererLogigramme({
            niveau: niv.id,
            theme: params && params.theme,
            themesExclus: ctx.themesExclus
        }, rng);
        return makeItem({
            seed: rng.seed,
            generatorId: 'logique.logigramme',
            skillId: 'num.logique.logigramme',
            answerKind: 'grid',
            prompt: {
                text: `${p.titre} — ${p.decor}`,
                html: `<div class="game-question">${p.titre}</div>`
            },
            answer: p.solution,
            explanation: p.solution.map(e =>
                e.map((v, k) => k === 0 ? p.categories[0].valeurs[v]
                    : (p.categories[k].nombres ? p.categories[k].nombres[v] : p.categories[k].courts[v])
                ).join(' · ')).join(' ; '),
            difficulty: niv.id,
            meta: { ...p, marche: String(niv.id) }
        });
    }
};
