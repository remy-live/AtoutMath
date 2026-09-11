// THALÈS : LA RÉDACTION, SUR PAPIER.
//
// Rémy : « et pour l'impression, il faut aussi proposer un exercice de
// rédaction ».
//
// CE QUI SE PASSE À L'ÉCRAN NE SE TRANSPOSE PAS, ET C'EST TANT MIEUX. Devant la
// tablette, l'élève CHOISIT ses hypothèses parmi six, POSE des étiquettes pour
// écrire l'égalité, CHOISIT la bonne forme du produit en croix : la machine
// l'empêche d'écrire une bêtise et lui explique chaque refus. C'est un
// échafaudage, et il est là pour être retiré.
//
// Sur la feuille il n'y a plus d'échafaudage. Trois cadres — Je sais que, Or,
// Donc —, des lignes, et rien d'autre. C'est exactement ce qui l'attend au
// contrôle, et c'est le seul endroit où l'on vérifie qu'il sait encore le faire
// sans qu'on lui tende les morceaux. La fiche n'est donc pas une version dégradée
// de l'exercice : c'est l'épreuve dont l'exercice est l'entraînement.
//
// LES LIGNES SONT DIMENSIONNÉES SUR LA RÉDACTION ATTENDUE. Deux hypothèses, une
// phrase d'annonce, deux égalités de fractions, trois lignes de calcul. Un cadre
// trop court fait écrire en petit dans la marge, un cadre trop long fait croire
// qu'il manque quelque chose. On compte donc les lignes plutôt que de partager
// la page en trois.
//
// ET LA FIGURE EST CELLE DE L'ÉCRAN, au trait près : elle se calcule dans
// `figureThalesElements`, une seule fois, et se trace en SVG ici ou au PDF
// là-bas. Un élève qui a l'exercice sur la tablette et la feuille sous les yeux
// doit reconnaître la même figure — sans quoi ce sont deux leçons.

import { makeItem } from '../items.js';
import { creerThales, longueurTexte } from '../thales.js';
import { figureThalesElements } from './thales.js';
import { trio, redactionComplete } from '../thalesRedaction.js';

/** Les trois longueurs qu'on peut demander : celles du petit triangle. */
const CHERCHABLES = ['AD', 'AE', 'DE'];

/**
 * COMBIEN DE LIGNES DANS CHAQUE CADRE — comptées par Rémy, sur ses copies.
 *
 * « Pour le DONC du Thalès sur le poly il suffit d'une ligne, 3 lignes pour le
 * JE SAIS QUE et 5 lignes pour le OR. »
 *
 * J'avais compté à l'envers pour deux cadres sur trois, et c'est la même erreur
 * dans les deux sens : j'avais compté des LIGNES DE RÉDACTION là où il faut
 * compter des LIGNES DE COPIE.
 *
 *  · JE SAIS QUE — j'en donnais deux, une par hypothèse. Mais une hypothèse
 *    s'écrit « Les droites (DE) et (CB) sont parallèles » : à la main, dans un
 *    cadre qui fait un tiers de la largeur d'une feuille, cela déborde. Trois.
 *  · OR — cinq, et c'est le seul que j'avais juste : l'annonce, l'égalité des
 *    trois rapports, puis la même chiffrée, et une égalité de fractions écrite
 *    à la main occupe deux interlignes.
 *  · DONC — j'en donnais trois : le produit en croix, le calcul, la conclusion.
 *    Rémy en veut UNE. Sur une copie, cela s'écrit « AD = (4 × 10) ÷ 8 = 5 cm »
 *    et tient sur une ligne. Les trois lignes que je réservais laissaient un
 *    grand blanc au bas de la feuille, et un blanc dans un cadre fait croire
 *    qu'il manque quelque chose.
 */
export const LIGNES_CADRE = { sais: 3, or: 5, donc: 1 };

export const thalesRedactionFicheGenerator = {
    id: 'geo.thales.redaction.fiche',
    label: 'Thalès : la rédaction (fiche)',
    skills: ['geo.thales'],
    answerKinds: ['figure'],
    params: [
        {
            id: 'config', type: 'select', label: 'Configuration', default: 'melange',
            aide: 'Le papillon est le même théorème avec le point A entre les deux '
                + 'parallèles. La rédaction y est mot pour mot la même — et c\'est '
                + 'justement ce qu\'il faut voir.',
            options: [
                { value: 'melange', label: 'Les deux, mélangées' },
                { value: 'emboites', label: 'Triangles emboîtés seulement' },
                { value: 'papillon', label: 'Papillon seulement' }
            ]
        },
        {
            // Rémy : « De base sur le poly mets 3 colonnes par défaut ou la
            // possibilité de mettre la rédaction à droite de la figure. »
            id: 'mise', type: 'select', label: 'Où va la rédaction', default: 'auto',
            aide: 'Automatique : à droite de la figure quand le bloc est assez large '
                + 'pour écrire à la main, dessous quand on serre trois démonstrations '
                + 'par feuille. Les deux autres forcent la mise en page.',
            options: [
                { value: 'auto', label: 'Selon la place' },
                { value: 'droite', label: 'À droite de la figure' },
                { value: 'dessous', label: 'Sous la figure' }
            ]
        },
        {
            id: 'rappel', type: 'checkbox', label: 'Rappeler le plan en trois parties',
            default: true,
            aide: 'Coché, une phrase grise rappelle ce qu\'on attend dans chaque cadre : '
                + 'l\'énoncé, le cours, la déduction. Décoché, les cadres ne portent que leur '
                + 'titre — c\'est la version de contrôle.'
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const config = (p.config && p.config !== 'melange')
            ? p.config : rng.pick(['emboites', 'papillon']);

        let f = null;
        for (let essai = 0; essai < 30 && !f; essai++) f = creerThales({ config, rng });
        if (!f) return null;

        const cherche = rng.pick(CHERCHABLES);
        const donnees = trio(cherche);

        // LA FIGURE NE PORTE QUE LES LONGUEURS DONNÉES. Y écrire aussi celle
        // qu'on cherche répondrait à la question ; n'en écrire aucune la rendrait
        // insoluble. Ce sont les trois du trio, et elles seules.
        const figure = figureThalesElements(f, donnees);

        const enonce = `(DE) // (CB). On donne ${donnees.map(n =>
            `${n} = ${longueurTexte(f[n])} cm`).join(', ')}. Calcule ${cherche}.`;

        return makeItem({
            seed: rng.seed,
            generatorId: 'geo.thales.redaction.fiche',
            skillId: 'geo.thales',
            answerKind: 'figure',
            prompt: { text: enonce, papier: enonce },
            // La réponse écrite au journal : la longueur cherchée. La vraie
            // correction est la feuille de solutions, qui redonne les trois
            // parties mot pour mot.
            answer: `${cherche} = ${longueurTexte(calculeCherche(f, cherche))} cm`,
            explanation: 'Trois parties, et chacune a sa source : JE SAIS QUE vient de '
                + 'l\'énoncé, OR vient du cours, DONC est ce qu\'on en déduit. C\'est cette '
                + 'séparation qui rapporte les points, pas le nombre final.',
            difficulty: 4,
            meta: {
                f, cherche, donnees, figure, enonce,
                rappel: p.rappel !== false,
                mise: ['droite', 'dessous'].includes(p.mise) ? p.mise : 'auto',
                redaction: redactionComplete(f, cherche)
            }
        });
    }
};

/** La longueur cherchée, par le produit en croix — voir `calculEcrit`. */
function calculeCherche(f, cherche) {
    const [a, b, c] = trio(cherche);
    return (f[a] * f[c]) / f[b];
}
