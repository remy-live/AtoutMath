// MOTS CACHÉS — sur le papier.
//
// À l'écran, on glisse le doigt d'un bout du mot à l'autre et le jeu dit si
// c'était le bon. Sur la feuille, personne ne valide : il faut ENTOURER, et
// pour entourer il faut être sûr. C'est le même vocabulaire, mais l'élève y
// engage sa réponse au lieu de l'essayer.
//
// TROIS FAÇONS DE DONNER LES INDICES, et ce choix change complètement
// l'exercice :
//   — la liste des mots : on cherche des lettres, c'est un jeu de patience ;
//   — les définitions seules : il faut D'ABORD retrouver le mot du cours, et
//     la grille ne sert plus qu'à vérifier — c'est là que se fait le travail ;
//   — les deux : la définition guide, le mot rassure. Le bon compromis pour
//     une classe où tout le monde n'en est pas au même point.

import { makeItem } from '../items.js';
import { tirerMots, creerGrille, grilleLaPlusPetite, THEMES } from '../motsCaches.js';

export const motsCachesFicheGenerator = {
    id: 'voc.mots-caches-fiche',
    label: 'Mots cachés du vocabulaire',
    skills: ['voc.mathematique'],
    answerKinds: ['grid'],
    params: [
        {
            id: 'theme', type: 'select', label: 'Vocabulaire', default: 'tout',
            options: Object.entries(THEMES).map(([value, label]) => ({ value, label }))
        },
        {
            id: 'taille', type: 'select', label: 'Taille de la grille', default: 12,
            aide: 'La plus petite possible serre les mots les uns contre les autres : '
                + 'il reste peu de lettres au hasard, et presque tout ce qu\'on voit '
                + 'fait partie d\'un mot.',
            options: [
                { value: 'auto', label: 'La plus petite possible' },
                { value: 10, label: '10 × 10' },
                { value: 12, label: '12 × 12' },
                { value: 14, label: '14 × 14' },
                { value: 16, label: '16 × 16 — pour les mots longs' }
            ]
        },
        { id: 'nbMots', type: 'number', label: 'Nombre de mots', default: 10, min: 4, max: 16 },
        {
            id: 'indices', type: 'select', label: 'Ce qu\'on donne à l\'élève', default: 'mots',
            options: [
                { value: 'mots', label: 'La liste des mots' },
                { value: 'definitions', label: 'Les définitions seules — il faut trouver le mot' },
                { value: 'les-deux', label: 'Les mots ET leur définition' }
            ]
        },
        {
            id: 'diagonales', type: 'checkbox', label: 'Mots en diagonale', default: true,
            aide: 'Sans les diagonales, la grille se lit uniquement en lignes et en colonnes — nettement plus facile.'
        },
        { id: 'envers', type: 'checkbox', label: 'Mots écrits à l\'envers', default: false }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const theme = THEMES[p.theme] ? p.theme : 'tout';
        const auto = String(p.taille) === 'auto';
        const taille = [10, 12, 14, 16].includes(Number(p.taille)) ? Number(p.taille) : 12;
        const nbMots = Math.max(4, Math.min(16, Number(p.nbMots) || 10));
        const indices = ['mots', 'definitions', 'les-deux'].includes(p.indices) ? p.indices : 'mots';

        const dispo = tirerMots({ theme, nbMots, rng });
        const reglages = {
            mots: dispo, nbMots, rng,
            diagonales: p.diagonales !== false, envers: p.envers === true
        };
        const g = auto
            ? grilleLaPlusPetite({ ...reglages, graine: rng.seed })
            : creerGrille({ ...reglages, taille });

        const liste = g.mots.map(m => m.mot).join(', ');
        return makeItem({
            seed: rng.seed,
            generatorId: 'voc.mots-caches-fiche',
            skillId: 'voc.mathematique',
            answerKind: 'grid',
            prompt: {
                text: `Retrouve ${g.mots.length} mots dans la grille.`,
                papier: `Retrouve ${g.mots.length} mots dans la grille.`,
                html: `<div class="game-question">Grille ${g.taille} × ${g.taille}</div>`
            },
            answer: liste,
            // La correction se lit sans la grille : le mot, sa case de départ
            // (colonne-ligne, comme sur un plan) et le sens dans lequel il part.
            explanation: g.mots
                .map(m => `${m.mot} (${m.x + 1}-${m.y + 1}, ${m.direction})`).join(' ; ') + '.',
            difficulty: indices === 'definitions' ? 3 : (p.envers ? 2 : 1),
            meta: {
                taille: g.taille, vocabulaire: theme, indices,
                // Combien de lettres, dans la grille, ne servent à rien : c'est
                // écrit sur la feuille, et ça change la façon de chercher.
                aleatoires: g.aleatoires,
                grille: g.grille, mots: g.mots,
                // Deux feuilles d'affilée ne servent pas la même grille : le
                // canal « theme » est celui par lequel la fiche dit ce qui a
                // déjà été tiré.
                theme: g.mots.map(m => m.mot).join('.')
            }
        });
    }
};
