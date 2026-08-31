// LES BONS CHEMINS COMME ITEM — pour la feuille.
//
// C'est la forme d'origine : Rémy est parti d'une fiche photocopiée. Une grille
// par bloc, la cible écrite dessous, et la page des solutions trace le chemin.
//
// UNE DIFFÉRENCE ASSUMÉE AVEC LA FICHE D'ORIGINE. Elle répétait SIX FOIS la
// même grille sous six cibles différentes. C'est astucieux — on apprend la
// grille une fois, puis on la fouille — mais cela suppose que les six blocs se
// parlent, alors que chaque bloc de nos fiches est tiré indépendamment. On tire
// donc une grille par bloc : l'élève lit six grilles au lieu d'une, ce qui
// travaille davantage la lecture et rend chaque bloc autonome (le professeur
// peut en garder trois, en changer un, les mélanger à autre chose).
//
// La grille entière voyage dans `meta` : ses nombres, sa cible et sa solution.
// Le rendu n'a rien à recalculer, et la feuille montre exactement l'écran.

import { makeItem } from '../items.js';
import { genererGrille, PALIERS, CONSIGNE, facteurs } from '../bonsChemins.js';

export const bonsCheminsFicheGenerator = {
    id: 'logique.bons-chemins',
    label: 'Les bons chemins',
    skills: ['num.arith.decomposition'],
    answerKinds: ['grid'],
    params: [
        {
            id: 'palier', type: 'select', label: 'La difficulté', default: 'moyen',
            options: Object.entries(PALIERS).map(([value, p]) => ({ value, label: p.label }))
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const palier = PALIERS[(params || {}).palier] ? params.palier : 'moyen';
        // Une grille manquée ne doit pas rendre un item vide : on retombe sur
        // le palier le plus facile, qui aboutit toujours.
        const g = genererGrille({ rng, palier }) || genererGrille({ rng, palier: 'facile' });
        const chemin = facteurs(g, g.solution);
        return makeItem({
            seed: rng.seed,
            generatorId: 'logique.bons-chemins',
            skillId: 'num.arith.decomposition',
            answerKind: 'grid',
            prompt: {
                text: `Trouve le chemin de D à A dont le produit vaut ${g.cible}.`,
                html: `<div class="game-question">Trouve ${g.cible}</div>`
            },
            answer: chemin.join(' × '),
            explanation: `${chemin.join(' × ')} = ${g.cible}. ${CONSIGNE}`,
            // La longueur du chemin est ce qui fait la difficulté, pas la
            // taille de la grille : deux facteurs se voient, six se cherchent.
            difficulty: Math.max(1, Math.min(4, chemin.length - 1)),
            meta: {
                l: g.l, h: g.h,
                cases: g.cases.map(ligne => [...ligne]),
                cible: g.cible,
                solution: g.solution.map(c => [c[0], c[1]]),
                nbChemins: g.nbChemins
            }
        });
    }
};
