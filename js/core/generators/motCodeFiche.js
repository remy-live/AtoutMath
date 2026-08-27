// LE MOT CODÉ — sur le papier.
//
// C'est là qu'il est né : Rémy les fabrique à la main pour ses fiches, et il
// nous en a montré un. Une grille où chaque case porte un numéro, une clé sous
// la grille où l'on note la lettre trouvée pour chaque numéro, et deux ou trois
// lettres offertes pour amorcer.
//
// LA GRILLE EST UN ANNEAU — c'est ainsi que Rémy les fabrique, et j'ai fini par
// décoder sa photo case par case : un cadre de quatre bandes par côté, le centre
// laissé vide, et des mots qui ne se croisent jamais. Voir `core/anneauMots.js`.
// Sur le papier surtout, cette forme compte : le centre vide est la place de la
// consigne, et l'anneau se découpe d'un coup de ciseaux.
//
// LA CLÉ EST LA MOITIÉ DE L'EXERCICE. Sans elle, l'élève retient de tête que
// le 14 est un E et se trompe trois lignes plus bas ; avec elle, il écrit une
// fois et relit vingt fois. C'est aussi ce qui rend la correction lisible d'un
// coup d'œil pour le professeur : la clé juste, la grille l'est forcément.

import { makeItem } from '../items.js';
import { creerMotCode, qualiteCode, THEMES, FORMATS_CODE, PART_OFFERTE } from '../motCode.js';
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
            aide: 'La grille est un ANNEAU : un cadre de bandes, le centre laissé vide. '
                + 'Ce qu\'on règle, c\'est le nombre de bandes par côté — donc le nombre de '
                + 'mots, et la largeur de l\'alphabet à retrouver.',
            options: [
                { value: 'petite', label: 'Petite — 8 mots', court: 'Petite' },
                { value: 'moyenne', label: 'Moyenne — 12 mots', court: 'Moyenne' },
                { value: 'grande', label: 'Grande — 16 mots', court: 'Grande' }
            ]
        },
        {
            id: 'niveauMax', type: 'select', label: 'Difficulté du vocabulaire', default: 3,
            options: [
                { value: 1, label: 'Les mots les plus courants' },
                { value: 2, label: 'Courants et intermédiaires' },
                { value: 3, label: 'Tout le vocabulaire' }
            ]
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const theme = THEMES[p.theme] ? p.theme : 'angles';
        const taille = FORMATS_CODE[p.taille] ? p.taille : 'moyenne';
        const niveauMax = [1, 2, 3].includes(Number(p.niveauMax)) ? Number(p.niveauMax) : 3;

        // COMBIEN DE LETTRES ON OFFRE — voir `PART_OFFERTE` dans le noyau. Sur
        // papier, l'enjeu est le même qu'à l'écran : une grille aux deux tiers
        // remplie n'est plus un exercice, c'est une correction.
        const aide = PART_OFFERTE[p.aide] !== undefined ? p.aide : 'normale';

        const m = creerMotCode({
            theme, niveauMax, taille, aide, rng, essais: 12,
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
                + (q.cle ? ` La clé commence par ${q.cle}.` : ''),
            difficulty: niveauMax,
            meta: {
                largeur: m.largeur, hauteur: m.hauteur,
                cases: m.cases, numeros: m.numeros, fleches: m.fleches,
                lettres: m.lettres, code: m.code, parNumero: m.parNumero,
                donnees: m.donnees, enClair: m.enClair, motCle: m.motCle,
                mots: m.mots, theme
            }
        });
    }
};
