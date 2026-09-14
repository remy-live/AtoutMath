// Le logigramme comme ITEM : de quoi le poser sur une feuille.
//
// L'exercice à l'écran mène son propre jeu (il a sa grille cliquable et son
// robot), mais un logigramme est d'abord un exercice de PAPIER : on le fait au
// crayon, en rayant, en revenant en arrière. Ce générateur ne sert donc qu'à
// l'impression — c'est lui qui met l'énigme dans la fiche du professeur.

import { makeItem } from '../items.js';
import { genererLogigramme, niveauDe } from '../logigramme.js';

export const logigrammeGenerator = {
    id: 'logique.logigramme',
    label: 'Logigramme',
    skills: ['num.logique.logigramme'],
    answerKinds: ['grid'],
    params: [
        {
            id: 'niveau', type: 'select', label: 'Niveau', default: 1,
            options: [
                { value: 1, label: '1 — Découverte · 3 lignes, 2 listes' },
                { value: 2, label: '2 — Trois amis, deux listes' },
                { value: 3, label: '3 — Quatre à croiser' },
                { value: 4, label: '4 — Plus grand, plus petit' },
                { value: 5, label: '5 — L\'écart exact' },
                { value: 6, label: '6 — Cinq, et rien de donné' }
            ]
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const niv = niveauDe(params && params.niveau);
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
            meta: p
        });
    }
};
