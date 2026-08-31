// LE TABLEAU À DOUBLE ENTRÉE COMME ITEM — pour la feuille.
//
// C'est la forme d'origine : Rémy est parti d'une fiche. Un énoncé, un tableau
// à trous, et sous le tout l'astuce qui EST la méthode. La page des solutions
// remplit les cases manquantes en gris.
//
// LE TABLEAU ENTIER VOYAGE DANS `meta` : ses libellés, ses valeurs et la liste
// des cases données. Le rendu ne recalcule rien, donc la feuille ne peut pas
// diverger de l'écran — et la correction ne peut pas mentir.

import { makeItem } from '../items.js';
import { genererTableau, PALIERS, ASTUCE, totalGeneral } from '../tableauCroise.js';

export const tableauCroiseFicheGenerator = {
    id: 'donnees.tableau-croise',
    label: 'Tableau à double entrée',
    skills: ['don.tableau.croise'],
    answerKinds: ['grid'],
    params: [
        {
            id: 'palier', type: 'select', label: 'La difficulté', default: 'facile',
            options: Object.entries(PALIERS).map(([value, p]) => ({ value, label: p.label }))
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const palier = PALIERS[(params || {}).palier] ? params.palier : 'facile';
        // `ctx.index` est le numéro du bloc sur la feuille : le noyau s'en sert
        // pour tourner dans la liste des énoncés au lieu de tirer, et deux
        // blocs voisins ne se répètent plus.
        const t = genererTableau({ rng, palier, tour: ctx.index });
        return makeItem({
            seed: rng.seed,
            generatorId: 'donnees.tableau-croise',
            skillId: 'don.tableau.croise',
            answerKind: 'grid',
            prompt: {
                text: `${t.phrase} Complète les valeurs manquantes.`,
                html: `<div class="game-question">${t.titre}</div>`
            },
            answer: `${totalGeneral(t)} ${t.unite} en tout`,
            explanation: ASTUCE,
            // La difficulté suit la taille du tableau à balayer : c'est elle qui
            // décide combien de lignes il faut relire pour trouver la suivante.
            difficulty: Math.max(1, Math.min(4, t.R + t.C - 4)),
            meta: {
                titre: t.titre, phrase: t.phrase, unite: t.unite,
                lignes: t.lignes, colonnes: t.colonnes,
                R: t.R, C: t.C,
                valeurs: t.valeurs.map(l => [...l]),
                connus: [...t.connus]
            }
        });
    }
};
