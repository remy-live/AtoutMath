// LES SERPENTS SUR LE PAPIER — la grille, les étiquettes, et les contours.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, dans sa revue du catalogue : les Serpents n'avaient pas de version
// imprimée. C'est un jeu qu'on fait au crayon bien plus volontiers qu'à la
// souris — on gomme, on recommence, et la grille supporte les repentirs.
//
// C'EST UN GÉNÉRATEUR À PART (`printGeneratorId`) parce que le jeu n'existe
// qu'à l'écran : il n'a pas de générateur du tout, il a une activité. Le
// catalogue sait déjà lire ce cas — la balance fait exactement pareil.
//
// ── LA GRILLE EST CELLE DU JEU, PAS UNE AUTRE ─────────────────────────────
//
// `genererSerpents` est le même tirage des deux côtés de l'écran : mêmes
// paliers, mêmes longueurs, et surtout la même garantie — un serpent est un
// CHEMIN et ne remplit jamais un carré de quatre cases. Écrire un second
// tirage « pour le papier » aurait fait deux exercices qui se ressemblent au
// lieu d'un exercice avec deux faces. C'est la leçon déjà payée trois fois
// dans ce dépôt, la dernière sur le radical.
//
// ── CE QUI CHANGE ENTRE L'ÉCRAN ET LA FEUILLE : LA COULEUR ────────────────
//
// À l'écran, l'élève COLORIE : chaque serpent prend une teinte, et c'est ainsi
// qu'on les distingue. Sur une feuille photocopiée, les teintes deviennent des
// gris qui se ressemblent — et de toute façon l'élève n'a pas sept crayons.
//
// Le corrigé trace donc le CONTOUR de chaque serpent : un trait épais le long
// de ses bords extérieurs. On le suit comme on suit un ruisseau de Strimko, et
// cela se lit en noir et blanc. Le calcul de ce contour est ici, pas dans le
// rendu : c'est de la géométrie pure, elle se tient sous Node, et une épreuve
// peut la garder.

import { makeItem } from '../items.js';
import {
    PALIERS_SERPENTS, genererSerpents, ecrireLaLongueur
} from '../serpents.js';

const SKILL = 'num.logique.serpents';

/**
 * LE CONTOUR D'UN SERPENT, en segments de la grille.
 *
 * Un bord appartient au contour quand il sépare une case DU serpent d'une case
 * qui n'en est pas — le bord de la grille comptant comme « pas du serpent ».
 * C'est la définition entière, et elle suffit : les bords intérieurs, qui
 * séparent deux cases du même serpent, ne sont jamais tracés, et c'est ce qui
 * fait apparaître le chemin d'un seul tenant.
 *
 * @param {number[]} cases indices des cases, en ligne d'abord
 * @returns {{x1:number,y1:number,x2:number,y2:number}[]} en unités de case
 */
export function contourDuSerpent(cases, lignes, colonnes) {
    const dedans = new Set(cases);
    const estDedans = (r, c) =>
        r >= 0 && c >= 0 && r < lignes && c < colonnes && dedans.has(r * colonnes + c);
    const bords = [];
    for (const i of cases) {
        const r = Math.floor(i / colonnes), c = i % colonnes;
        if (!estDedans(r - 1, c)) bords.push({ x1: c, y1: r, x2: c + 1, y2: r });
        if (!estDedans(r + 1, c)) bords.push({ x1: c, y1: r + 1, x2: c + 1, y2: r + 1 });
        if (!estDedans(r, c - 1)) bords.push({ x1: c, y1: r, x2: c, y2: r + 1 });
        if (!estDedans(r, c + 1)) bords.push({ x1: c + 1, y1: r, x2: c + 1, y2: r + 1 });
    }
    return bords;
}

export const serpentsFicheGenerator = {
    id: 'logique.serpents-fiche',
    label: 'Les Serpents (fiche)',
    skills: [SKILL],
    answerKinds: ['grid'],
    // PAS DE `ecrit` : cette fiche n'est pas une colonne de questions écrites,
    // c'est une GRILLE à dessiner. C'est `printable` qui lui donne son rendu.
    params: [],

    generate(params, ctx) {
        const rng = ctx.rng;
        const palier = PALIERS_SERPENTS[(params || {}).palier]
            ? (params || {}).palier : 'facile';
        const etiquettes = (params || {}).etiquettes === 'calculs' ? 'calculs' : 'nombres';
        const g = genererSerpents({ rng, ...PALIERS_SERPENTS[palier] });
        // `genererSerpents` rend `null` après quatre cents essais ratés. Sur une
        // feuille, un bloc vide vaut mieux qu'une exception qui emporte la page
        // entière — mais il ne faut pas qu'il passe inaperçu, d'où le palier de
        // repli plutôt qu'un `return null` silencieux.
        const grille = g || genererSerpents({ rng, ...PALIERS_SERPENTS.decouverte });

        const serpents = grille.serpents.map(s => ({
            cases: s.cases,
            longueur: s.longueur,
            tete: s.tete,
            // L'ÉTIQUETTE EST TIRÉE UNE FOIS, à la fabrication. La tirer au
            // moment du dessin la ferait changer entre l'aperçu et le PDF —
            // « 2 × 3 » ici, « 4 + 2 » là, pour le même serpent.
            etiquette: ecrireLaLongueur(s.longueur, etiquettes, rng),
            contour: contourDuSerpent(s.cases, grille.lignes, grille.colonnes)
        }));

        return makeItem({
            seed: rng.seed,
            generatorId: 'logique.serpents-fiche',
            skillId: SKILL,
            answerKind: 'grid',
            prompt: {
                text: `Trace les serpents de la grille de ${grille.lignes} sur ${grille.colonnes}.`
            },
            answer: serpents.map(s => s.cases.join('.')).join('|'),
            hints: [
                'Commence par les serpents les plus COURTS : une case qui n\'a qu\'une '
                    + 'voisine libre ne laisse pas le choix.',
                'Un serpent ne remplit JAMAIS un carré de quatre cases. C\'est la règle '
                    + 'qu\'on oublie, et c\'est souvent elle qui tranche.'
            ],
            explanation: 'Chaque case appartient à un serpent et un seul, et toutes les '
                + 'cases sont prises : s\'il en reste une, c\'est qu\'un serpent est mal placé.',
            difficulty: { decouverte: 2, facile: 3, moyen: 4, difficile: 5 }[palier] || 3,
            meta: {
                lignes: grille.lignes, colonnes: grille.colonnes,
                serpents, palier, etiquettes
            }
        });
    }
};
