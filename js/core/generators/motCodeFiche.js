// LE MOT CODÉ — sur le papier.
//
// C'est là qu'il est né : Rémy les fabrique à la main pour ses fiches, et il
// nous en a montré un. Une grille où chaque case porte un numéro, une clé sous
// la grille où l'on note la lettre trouvée pour chaque numéro, et deux ou trois
// lettres offertes pour amorcer.
//
// LA GRILLE EST UN RECTANGLE ET L'ON PART D'UN MOT — c'est ainsi que Rémy les
// fabrique : « moi ça tenait sur une grille rectangulaire et je partais d'un mot
// et il fallait compléter ». Sur le papier surtout, le rectangle compte : une
// croix de mots croisés perdue au milieu d'une page A4 a l'air d'un accident
// d'impression, là où un pavé noir et blanc a l'air d'une grille.
//
// LA CLÉ EST LA MOITIÉ DE L'EXERCICE. Sans elle, l'élève retient de tête que
// le 14 est un E et se trompe trois lignes plus bas ; avec elle, il écrit une
// fois et relit vingt fois. C'est aussi ce qui rend la correction lisible d'un
// coup d'œil pour le professeur : la clé juste, la grille l'est forcément.

import { makeItem } from '../items.js';
import { creerMotCode, qualiteCode, THEMES, FORMATS_CODE } from '../motCode.js';
import { makeRng } from '../ids.js';

export const motCodeFicheGenerator = {
    id: 'voc.mot-code-fiche',
    label: 'Mot codé du vocabulaire',
    skills: ['voc.mathematique'],
    answerKinds: ['grid'],
    params: [
        {
            id: 'theme', type: 'select', label: 'Vocabulaire', default: 'angles',
            aide: 'Un mot codé sur UN chapitre se décode par le sens autant que par les '
                + 'croisements : l\'élève reconnaît « BISSECTRICE » à trois lettres près parce '
                + 'qu\'il sait de quoi la fiche parle. Mélangé, il ne reste que la déduction.',
            options: Object.entries(THEMES).map(([value, label]) => ({ value, label }))
        },
        {
            id: 'taille', type: 'select', label: 'Taille de la grille', default: 'moyenne',
            echelle: true,
            aide: 'La grille est un RECTANGLE qu\'on cherche à remplir : ce n\'est pas le '
                + 'nombre de mots qu\'on règle, c\'est la place. Plus le rectangle est grand, '
                + 'plus l\'alphabet à retrouver est large.',
            options: [
                { value: 'petite', label: 'Petite — 9 × 7' },
                { value: 'moyenne', label: 'Moyenne — 11 × 9' },
                { value: 'grande', label: 'Grande — 13 × 11' }
            ]
        },
        {
            id: 'niveauMax', type: 'select', label: 'Difficulté du vocabulaire', default: 3,
            options: [
                { value: 1, label: 'Les mots les plus courants' },
                { value: 2, label: 'Courants et intermédiaires' },
                { value: 3, label: 'Tout le vocabulaire' }
            ]
        },
        {
            id: 'motsOfferts', type: 'select', label: 'Mots donnés au départ', default: 1,
            echelle: true,
            aide: 'On part d\'un MOT ENTIER, écrit en clair dans la grille : l\'élève le lit, '
                + 'reconnaît le chapitre, et ses lettres sont déjà posées partout ailleurs. '
                + 'C\'est le mot du thème qui porte le plus de lettres différentes qui est '
                + 'choisi. À zéro, il ne reste que la déduction pure.',
            options: [
                { value: 0, label: 'Aucun — casse-tête' },
                { value: 1, label: 'Un mot' },
                { value: 2, label: 'Deux mots — pour découvrir' }
            ]
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const theme = THEMES[p.theme] ? p.theme : 'angles';
        const taille = FORMATS_CODE[p.taille] ? p.taille : 'moyenne';
        const niveauMax = [1, 2, 3].includes(Number(p.niveauMax)) ? Number(p.niveauMax) : 3;
        const motsOfferts = Math.max(0, Math.min(3,
            p.motsOfferts === undefined ? 1 : Number(p.motsOfferts) || 0));

        const m = creerMotCode({
            theme, niveauMax, taille, motsOfferts, rng, essais: 14,
            // Chaque essai a SA graine : deux essais partageant un générateur
            // construiraient la même grille.
            rngPour: (i) => makeRng(`${rng.seed}-mcode-${i}`)
        });
        const q = qualiteCode(m);

        return makeItem({
            seed: rng.seed,
            generatorId: 'voc.mot-code-fiche',
            skillId: 'voc.mathematique',
            answerKind: 'grid',
            prompt: {
                text: `Mot codé de ${q.mots} mots, ${q.alphabet} lettres à retrouver.`,
                papier: `Mot codé — ${THEMES[theme]}.`,
                html: `<div class="game-question">Mot codé — ${m.largeur} × ${m.hauteur}</div>`
            },
            answer: m.lettres.map(l => `${m.code[l]}=${l}`).join(' '),
            explanation: m.lettres.map(l => `${m.code[l]} = ${l}`).join(' ; ')
                + `. Les mots : ${m.mots.map(w => w.mot).join(', ')}.`
                + (q.depart.length ? ` Départ donné : ${q.depart.join(', ')}.` : ''),
            difficulty: niveauMax,
            meta: {
                largeur: m.largeur, hauteur: m.hauteur,
                cases: m.cases, numeros: m.numeros,
                lettres: m.lettres, code: m.code, parNumero: m.parNumero,
                donnees: m.donnees, mots: m.mots, depart: m.depart, theme
            }
        });
    }
};
