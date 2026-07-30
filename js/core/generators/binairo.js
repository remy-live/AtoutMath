// Générateur de Binairo (Takuzu).
//
// Une grille N×N (N pair) à remplir de 0 et de 1 avec deux règles :
//  - autant de 0 que de 1 sur chaque ligne et chaque colonne ;
//  - jamais trois chiffres identiques qui se suivent.
// Variante collège : la règle « deux lignes identiques interdites » du Takuzu
// officiel est volontairement écartée — elle complique la consigne sans rien
// apporter aux petites tailles, et l'unicité est garantie autrement.
//
// Même principe que le Mathdoku : on construit d'abord une grille COMPLÈTE
// valide, puis on la creuse case par case dans un ordre aléatoire ; un retrait
// n'est conservé que si le solveur confirme que la solution reste unique. La
// difficulté est la profondeur du creusage : une grille facile garde plus de
// cases données. Tout est semé — une grille = une graine.

import { makeItem } from '../items.js';

// Part de cases données visée après creusage. Le creusage s'arrête au seuil
// (facile, moyen) ou continue tant qu'un retrait préserve l'unicité
// (difficile — le seuil bas n'est alors pas toujours atteignable, on s'en
// approche autant que la grille le permet).
const CIBLES_DONNEES = { facile: 0.55, moyen: 0.44, difficile: 0.30 };
const DIFFICULTE_ITEM = { facile: 1, moyen: 3, difficile: 4 };

// --- Solveur ----------------------------------------------------------------

/**
 * Compte les solutions d'une grille partielle (`givens` : 0, 1 ou null), en
 * s'arrêtant à `limite`. Exporté pour les tests — c'est lui qui prouve
 * l'unicité. Parcours case par case avec élagage : les compteurs de ligne et
 * de colonne ne dépassent jamais N/2 (l'égalité finale en découle, chaque
 * ligne étant pleine), et un chiffre ne peut suivre deux exemplaires de
 * lui-même, en ligne comme en colonne.
 */
export function compterSolutionsBinairo(n, givens, limite = 2, sorties = null) {
    const moitie = n / 2;
    const g = Array.from({ length: n }, () => Array(n).fill(-1));
    const lignes = [Array(n).fill(0), Array(n).fill(0)];     // lignes[v][r]
    const colonnes = [Array(n).fill(0), Array(n).fill(0)];   // colonnes[v][c]
    let count = 0;

    const place = (i) => {
        if (count >= limite) return;
        if (i === n * n) {
            count++;
            if (sorties) sorties.push(g.map(ligne => [...ligne]));
            return;
        }
        const r = Math.floor(i / n), c = i % n;
        const impose = givens[r][c];
        for (const v of (impose === null ? [0, 1] : [impose])) {
            if (lignes[v][r] >= moitie || colonnes[v][c] >= moitie) continue;
            if (c >= 2 && g[r][c - 1] === v && g[r][c - 2] === v) continue;
            if (r >= 2 && g[r - 1][c] === v && g[r - 2][c] === v) continue;
            g[r][c] = v; lignes[v][r]++; colonnes[v][c]++;
            place(i + 1);
            g[r][c] = -1; lignes[v][r]--; colonnes[v][c]--;
        }
    };
    place(0);
    return count;
}

/** Une grille complète valide, tirée du rng (candidats mélangés par case). */
function grilleNeuve(rng, n) {
    const moitie = n / 2;
    const g = Array.from({ length: n }, () => Array(n).fill(-1));
    const lignes = [Array(n).fill(0), Array(n).fill(0)];
    const colonnes = [Array(n).fill(0), Array(n).fill(0)];

    const remplir = (i) => {
        if (i === n * n) return true;
        const r = Math.floor(i / n), c = i % n;
        for (const v of rng.shuffle([0, 1])) {
            if (lignes[v][r] >= moitie || colonnes[v][c] >= moitie) continue;
            if (c >= 2 && g[r][c - 1] === v && g[r][c - 2] === v) continue;
            if (r >= 2 && g[r - 1][c] === v && g[r - 2][c] === v) continue;
            g[r][c] = v; lignes[v][r]++; colonnes[v][c]++;
            if (remplir(i + 1)) return true;
            g[r][c] = -1; lignes[v][r]--; colonnes[v][c]--;
        }
        return false;
    };
    remplir(0);
    return g;
}

// --- Générateur -------------------------------------------------------------

export const binairoGenerator = {
    id: 'logique.binairo',
    label: 'Binairo',
    skills: ['num.logique.binairo'],
    answerKinds: ['grid'],
    params: [
        {
            id: 'taille', type: 'select', label: 'Taille de la grille', default: 6,
            options: [
                { value: 4, label: '4 × 4' },
                { value: 6, label: '6 × 6' },
                { value: 8, label: '8 × 8' }
            ]
        },
        {
            id: 'difficulte', type: 'select', label: 'Difficulté', default: 'facile',
            options: [
                { value: 'facile', label: 'Facile (plus de cases données)' },
                { value: 'moyen', label: 'Moyen' },
                { value: 'difficile', label: 'Difficile (le minimum de cases)' }
            ]
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const n = [4, 6, 8].includes(Number(params.taille)) ? Number(params.taille) : 6;
        const difficulte = CIBLES_DONNEES[params.difficulte] ? params.difficulte : 'facile';

        const sol = grilleNeuve(rng, n);

        // Creusage : chaque case retirée doit laisser la solution unique,
        // sinon elle revient. L'ordre aléatoire fait la variété des grilles.
        const givens = sol.map(ligne => [...ligne]);
        let restantes = n * n;
        const cible = Math.round(CIBLES_DONNEES[difficulte] * n * n);
        for (const idx of rng.shuffle(Array.from({ length: n * n }, (_, i) => i))) {
            if (restantes <= cible) break;
            const r = Math.floor(idx / n), c = idx % n;
            const memo = givens[r][c];
            givens[r][c] = null;
            if (compterSolutionsBinairo(n, givens) > 1) givens[r][c] = memo;
            else restantes--;
        }

        return makeItem({
            seed: rng.seed,
            generatorId: 'logique.binairo',
            skillId: 'num.logique.binairo',
            answerKind: 'grid',
            prompt: {
                text: `Autant de 0 que de 1 sur chaque ligne et chaque colonne — jamais trois chiffres identiques qui se suivent.`,
                html: `<div class="game-question kenken-consigne">Autant de <b>0</b> que de <b>1</b> par ligne et par colonne — jamais <b>trois identiques</b> qui se suivent.</div>`
            },
            // Préfixe « g » : voir kenken.js — sans lui, seule la première
            // ligne comptait dans la comparaison.
            answer: 'g' + sol.map(ligne => ligne.join('')).join('/'),
            hints: [
                'Observe les cases entourées en orange : deux chiffres identiques côte à côte forcent leurs voisines.',
                'Une case a été remplie pour toi. Regarde ce qu\'elle impose sur sa ligne et sa colonne.'
            ],
            explanation: `Chaque ligne et chaque colonne contient exactement ${n / 2} zéros et ${n / 2} uns, sans jamais trois chiffres identiques à la suite.`,
            difficulty: DIFFICULTE_ITEM[difficulte] + (n === 8 ? 1 : 0),
            meta: { n, givens, solution: sol, nbDonnees: restantes }
        });
    }
};
