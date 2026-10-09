// L'HEXAGRILLE, SUR LE PAPIER.
//
// Rémy, banc d'essai : « Pas de pdf ». L'exercice n'avait pas de version
// imprimée, alors qu'il en est un bon candidat : neuf cases, huit sommes, et
// aucune manipulation — tout se fait au crayon, et l'on rature.
//
// LA FEUILLE NE DONNE PAS LE PLATEAU DU JEU, ELLE DONNE LA MÊME GRILLE. Le
// puzzle vient de `core/hexagrille.js`, celui de l'écran, avec sa garantie
// d'UNICITÉ : on tire une grille, on calcule ses sommes, on retire des indices
// tant que la solution reste seule. Une hexagrille à deux solutions se
// « résout » par un coup de chance et n'apprend rien — ce serait vrai sur le
// papier comme à l'écran.
//
// CE QUE L'ÉLÈVE ÉCRIT, c'est la grille entière : neuf chiffres de 1 à 9, un
// par case, chaque file tombant sur sa somme. La réponse enregistrée est donc
// la suite des neuf chiffres dans l'ordre de lecture — c'est elle que le
// corrigé imprime, et c'est celle que le solveur a vérifiée unique.

import { makeItem } from '../items.js';
import { genererHexagrille, CASES } from '../hexagrille.js';
import {
    paramMarches, marchesCochees, marcheAuRang, conseilProgression, totalDe
} from '../progression.js';

const NIVEAUX = {
    facile: 'Trois cases données',
    moyen: 'Une seule case donnée',
    difficile: 'Aucune case donnée'
};

// ── LA PROGRESSION, EN CASES À COCHER ───────────────────────────────────────
//
// Rémy : « il y a pas mal de jeux où ce sont des étapes, et il faudrait
// pouvoir faire les check box comme pour le calcul littéral, tu ne penses
// pas ? — fais tout, ce serait le plus cohérent non ? »
//
// LA DIFFICULTÉ TIENT AU NOMBRE D'APPUIS — trois cases données, une, aucune.
// C'est une échelle, et une feuille de six grilles restait pourtant sur un
// seul barreau. Cochés, les trois se partagent la page.
const LISTE_MARCHES = Object.entries(NIVEAUX)
    .map(([id, nom], i) => ({ id, nom: `${i + 1}. ${nom}` }));
/** Le réglage d'avant les cases — voir `marchesCochees`. */
const ANCIEN = { cle: 'niveau' };

export const hexagrilleFicheGenerator = {
    id: 'logi.hexagrille-fiche',
    label: 'Hexagrille (fiche)',
    answerKinds: ['grid'],
    skills: ['num.logique.hexagrille'],
    // Une grille se dessine : la fiche a son propre rendu, elle n'écrit pas
    // une ligne de texte.
    grille: true,
    params: [
        paramMarches({ marches: LISTE_MARCHES, mot: 'niveau', ancien: ANCIEN })
    ],
    conseil: (p) => conseilProgression(marchesCochees(p, LISTE_MARCHES, ANCIEN).length),

    generate(params, ctx) {
        const rng = ctx.rng;
        const tire = String(marcheAuRang(ctx.index ?? 0,
            marchesCochees(params, LISTE_MARCHES, ANCIEN),
            totalDe(ctx, params), params));
        const niveau = NIVEAUX[tire] ? tire : 'facile';
        const puzzle = genererHexagrille(rng, { niveau });
        const solution = puzzle.solution.join(' ');

        return makeItem({
            seed: rng.seed,
            generatorId: 'logi.hexagrille-fiche',
            skillId: 'num.logique.hexagrille',
            answerKind: 'grid',
            prompt: {
                text: 'Place les chiffres de 1 à 9, un par case, pour que chaque file '
                    + 'donne la somme indiquée.',
                papier: 'Place les chiffres de 1 à 9, un par case.',
                html: '<div class="game-question">Hexagrille</div>'
            },
            answer: solution,
            // LE CORRIGÉ SE LIT COMME LA GRILLE, pas comme une liste : on dit
            // chaque case par sa position, sinon le professeur doit recompter
            // les rangées pour savoir à qui appartient le troisième chiffre.
            explanation: CASES.map(({ c, r, i }) =>
                `colonne ${c + 1} rangée ${r + 1} : ${puzzle.solution[i]}`).join(' · '),
            difficulty: niveau === 'facile' ? 2 : niveau === 'moyen' ? 3 : 4,
            meta: { puzzle, niveau, solution: puzzle.solution, marche: niveau }
        });
    }
};
