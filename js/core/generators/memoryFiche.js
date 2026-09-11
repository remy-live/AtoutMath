// LE MEMORY DES TABLES, À DÉCOUPER.
//
// Rémy : « on va permettre de créer un jeu de memory que l'utilisateur pourra
// découper et coller, tu t'occupes du recto et du verso ». C'est un jeu de
// classe, pas un jeu d'écran : on imprime, on découpe, on colle dos à dos (ou
// l'on imprime en recto-verso), et le paquet resservira toute l'année.
//
// UN BLOC DE LA FEUILLE = UNE PAIRE : le calcul d'un côté, son résultat de
// l'autre. Les deux cartes voisines se découpent d'un même coup de ciseaux, et
// l'on mélange après — la position sur la feuille n'a aucune importance.
//
// LES PRODUITS SONT TOUS DIFFÉRENTS. Deux cartes « 56 » dans le même paquet
// rendraient le memory insoluble : « 7 × 8 » pourrait s'associer à l'une ou à
// l'autre, et l'élève aurait raison en ayant tort. Le canal `themesExclus` de
// la fiche — celui par lequel elle dit ce qu'elle a déjà tiré — sert exactement
// à cela.

import { makeItem } from '../items.js';

const TOUTES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export const memoryFicheGenerator = {
    id: 'calc.memory-fiche',
    label: 'Memory des tables (fiche)',
    answerKinds: ['numeric'],
    skills: ['num.mult.table.*'],
    params: [
        {
            id: 'tables', type: 'multiselect', label: 'Tables à travailler',
            options: TOUTES, default: [2, 3, 4, 5, 6, 7, 8, 9, 10]
        },
        {
            id: 'maxFacteur', type: 'number', label: 'Facteur maximum',
            default: 10, min: 5, max: 12
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const tables = (Array.isArray(p.tables) && p.tables.length ? p.tables : TOUTES.slice(1))
            .map(Number).filter(n => n >= 1 && n <= 10);
        const maxF = Math.max(2, Math.min(12, Number(p.maxFacteur) || 10));
        const exclus = new Set((ctx.themesExclus || []).map(String));

        let t = tables[0] || 2, m = 2, produit = t * m;
        for (let essai = 0; essai < 200; essai++) {
            t = rng.pick(tables);
            m = rng.int(2, maxF);
            produit = t * m;
            if (!exclus.has(String(produit))) break;
        }

        return makeItem({
            seed: rng.seed,
            generatorId: 'calc.memory-fiche',
            skillId: `num.mult.table.${t}`,
            answerKind: 'numeric',
            prompt: { text: `${t} × ${m} = ?`, papier: `${t} × ${m}` },
            answer: produit,
            explanation: `${t} × ${m} = ${produit}.`,
            difficulty: t >= 6 && m >= 6 ? 3 : 2,
            meta: {
                calcul: `${t} × ${m}`, resultat: String(produit), t, m,
                // Ce que la fiche exclura pour la paire suivante : un produit
                // déjà distribué ne peut pas revenir.
                theme: String(produit)
            }
        });
    }
};
