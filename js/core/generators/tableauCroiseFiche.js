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
import { genererTableau, PALIERS, totalGeneral, consigneDe } from '../tableauCroise.js';

export const tableauCroiseFicheGenerator = {
    id: 'donnees.tableau-croise',
    label: 'Tableau à double entrée',
    skills: ['don.tableau.croise'],
    answerKinds: ['grid'],
    params: [
        {
            id: 'palier', type: 'select', label: 'La difficulté', default: 'facile',
            options: Object.entries(PALIERS).map(([value, p]) => ({ value, label: p.label }))
        },
        {
            id: 'depart', type: 'select', label: 'D\'où viennent les nombres', default: 'tableau',
            options: [
                { value: 'tableau', label: 'Écrits dans le tableau' },
                { value: 'enonce', label: 'Dits dans l\'énoncé — le tableau part vide' }
            ]
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const palier = PALIERS[(params || {}).palier] ? params.palier : 'facile';
        // `ctx.index` est le numéro du bloc sur la feuille : le noyau s'en sert
        // pour tourner dans la liste des énoncés au lieu de tirer, et deux
        // blocs voisins ne se répètent plus.
        const depart = (params || {}).depart === 'enonce' ? 'enonce' : 'tableau';
        const t = genererTableau({ rng, palier, depart, tour: ctx.index });
        return makeItem({
            seed: rng.seed,
            generatorId: 'donnees.tableau-croise',
            skillId: 'don.tableau.croise',
            answerKind: 'grid',
            prompt: {
                text: t.depart === 'enonce'
                    ? `${t.phrase} Reporte ces informations dans le tableau, puis complète-le.`
                    : `${t.phrase} Complète les valeurs manquantes.`,
                html: `<div class="game-question">${t.titre}</div>`
            },
            answer: `${totalGeneral(t)} ${t.unite} en tout`,
            explanation: consigneDe(t),
            // La difficulté suit la taille du tableau à balayer : c'est elle qui
            // décide combien de lignes il faut relire pour trouver la suivante.
            difficulty: Math.max(1, Math.min(4, t.R + t.C - 4)),
            meta: {
                titre: t.titre, phrase: t.phrase, unite: t.unite,
                lignes: t.lignes, colonnes: t.colonnes,
                R: t.R, C: t.C,
                valeurs: t.valeurs.map(l => [...l]),
                connus: [...t.connus],
                // EN MODE « ÉNONCÉ », LE TABLEAU IMPRIMÉ EST VIDE et les
                // nombres sont dans la liste au-dessus : c'est le rendu qui
                // lit `depart` pour savoir lequel des deux il dessine.
                depart: t.depart,
                donnees: t.donnees ? t.donnees.map(d => ({ ...d })) : null
            }
        });
    }
};
