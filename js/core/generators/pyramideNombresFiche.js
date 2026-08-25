// LA PYRAMIDE DE NOMBRES — sur le papier.
//
// C'est sa forme naturelle : un triangle de cases, des trous, un crayon. Rien
// à porter à l'écran — le jeu de papier est complet, et il tient dans un coin
// de fiche.
//
// LE CORRIGÉ DONNE LA BASE, PAS LA PYRAMIDE ENTIÈRE. Les cinq nombres du bas
// suffisent à tout reconstruire, et c'est justement ce qu'on veut faire
// remarquer : une pyramide n'a que sa base pour degrés de liberté. Le reste
// s'écrit quand même dans le bloc corrigé, pour la correction au tableau.

import { makeItem } from '../items.js';
import { creerPyramideNombres, qualitePN, TAILLES_PN, DIFFICULTES_PN } from '../pyramideNombres.js';

export const pyramideNombresFicheGenerator = {
    id: 'calc.pyramide-nombres-fiche',
    label: 'La Pyramide des nombres',
    skills: ['num.pyramide-additive'],
    answerKinds: ['grid'],
    params: [
        {
            id: 'taille', type: 'select', label: 'Hauteur de la pyramide', default: 'moyenne',
            aide: 'Plus la pyramide est haute, plus le sommet est grand — et plus une erreur '
                + 'du bas se paie cher en haut. Les nombres de la base sont donc plus petits '
                + 'quand on monte : le travail doit rester du raisonnement, pas des retenues.',
            options: Object.values(TAILLES_PN).map(t => ({ value: t.id, label: t.label }))
        },
        {
            id: 'difficulte', type: 'select', label: 'Où sont les trous', default: 'melange',
            aide: 'C\'est CE réglage qui change la nature de l\'exercice, bien plus que la '
                + 'hauteur. La base donnée, on ne fait qu\'additionner vers le haut. Des trous '
                + 'en bas, et il faut soustraire pour redescendre — ce qui est exactement la '
                + 'leçon « soustraire, c\'est chercher ce qui manque ».',
            options: Object.values(DIFFICULTES_PN).map(d => ({ value: d.id, label: d.label }))
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const taille = TAILLES_PN[p.taille] ? p.taille : 'moyenne';
        const difficulte = DIFFICULTES_PN[p.difficulte] ? p.difficulte : 'melange';

        const py = creerPyramideNombres({ taille, difficulte, rng });
        const q = qualitePN(py);

        return makeItem({
            seed: rng.seed,
            generatorId: 'calc.pyramide-nombres-fiche',
            skillId: 'num.pyramide-additive',
            answerKind: 'grid',
            prompt: {
                text: `Pyramide de ${py.n} étages : ${q.aTrouver} cases à trouver.`,
                papier: 'Pyramide — chaque case est la somme des deux du dessous.',
                html: `<div class="game-question">Pyramide additive de ${py.n} étages</div>`
            },
            answer: String(q.sommet),
            explanation: `La base est ${q.base.join(' · ')}, et le sommet ${q.sommet}. `
                + (q.soustractions
                    ? `${q.soustractions} case${q.soustractions > 1 ? 's se remplissent' : ' se remplit'} `
                        + 'en SOUSTRAYANT : le dessus moins l\'une des deux du dessous.'
                    : 'Tout se remplit en additionnant, du bas vers le haut.'),
            difficulty: { petite: 1, moyenne: 2, grande: 3 }[taille] || 2,
            meta: {
                taille, difficulte, n: py.n,
                lignes: py.lignes, donnes: py.donnes,
                sommet: q.sommet, base: q.base,
                aTrouver: q.aTrouver, soustractions: q.soustractions
            }
        });
    }
};
