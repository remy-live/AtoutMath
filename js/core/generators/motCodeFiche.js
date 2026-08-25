// LE MOT CODÉ — sur le papier.
//
// C'est là qu'il est né : Rémy les fabrique à la main pour ses fiches, et il
// nous en a montré un. Une grille où chaque case porte un numéro, une clé sous
// la grille où l'on note la lettre trouvée pour chaque numéro, et deux ou trois
// lettres offertes pour amorcer.
//
// LA CLÉ EST LA MOITIÉ DE L'EXERCICE. Sans elle, l'élève retient de tête que
// le 14 est un E et se trompe trois lignes plus bas ; avec elle, il écrit une
// fois et relit vingt fois. C'est aussi ce qui rend la correction lisible d'un
// coup d'œil pour le professeur : la clé juste, la grille l'est forcément.

import { makeItem } from '../items.js';
import { creerMotCode, qualiteCode, THEMES } from '../motCode.js';
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
            id: 'nbMots', type: 'select', label: 'Nombre de mots', default: 10,
            options: [
                { value: 7, label: '7 mots — grille courte' },
                { value: 10, label: '10 mots' },
                { value: 14, label: '14 mots — grille de journal' }
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
            id: 'offertes', type: 'number', label: 'Lettres offertes', default: 3, min: 0, max: 8,
            aide: 'Ce sont les lettres les PLUS FRÉQUENTES de la grille qui sont données : une '
                + 'lettre offerte qui ne paraît qu\'une fois ne débloque rien. À zéro, la grille '
                + 'devient un vrai casse-tête — pour ceux qui en redemandent.'
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const theme = THEMES[p.theme] ? p.theme : 'angles';
        const nbMots = Math.max(5, Math.min(16, Number(p.nbMots) || 10));
        const niveauMax = [1, 2, 3].includes(Number(p.niveauMax)) ? Number(p.niveauMax) : 3;
        const offertes = Math.max(0, Math.min(8,
            p.offertes === undefined ? 3 : Number(p.offertes) || 0));

        const m = creerMotCode({
            theme, niveauMax, nbMots, offertes, rng, essais: 10,
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
                + `. Les mots : ${m.mots.map(w => w.mot).join(', ')}.`,
            difficulty: niveauMax,
            meta: {
                largeur: m.largeur, hauteur: m.hauteur,
                cases: m.cases, numeros: m.numeros,
                lettres: m.lettres, code: m.code, parNumero: m.parNumero,
                donnees: m.donnees, mots: m.mots, theme
            }
        });
    }
};
