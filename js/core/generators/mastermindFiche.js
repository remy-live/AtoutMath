// LE MASTERMIND — sur le papier.
//
// UNE FEUILLE NE RÉPOND PAS. On ne peut donc pas y jouer coup par coup : ce
// qu'on imprime, c'est LA PARTIE DÉJÀ JOUÉE — des essais, et pour chacun le
// nombre de jetons bien placés et mal placés —, et l'on demande le code.
//
// Le jeu devient alors un exercice de logique pure, comme un logigramme, et
// c'est très exactement sous cette forme que les revues le publient. Il y gagne
// même quelque chose : à l'écran on peut s'en tirer en tâtonnant, sur le papier
// il faut RAISONNER, parce qu'on n'a droit à aucun essai supplémentaire.
//
// LE NOYAU GARANTIT L'UNIQUE SOLUTION ET L'ABSENCE DE LIGNE INUTILE (voir
// core/mastermind.js) : sans la première, deux élèves rendent deux réponses
// justes et différentes ; sans la seconde, on cherche dans une ligne qui
// n'apprend rien et l'on finit par douter de celles qui servent.

import { makeItem } from '../items.js';
import { creerDeduction, qualiteMastermind, FORMATS } from '../mastermind.js';

export const mastermindFicheGenerator = {
    id: 'log.mastermind-fiche',
    label: 'Mastermind — retrouve le code',
    skills: ['num.logique.mastermind'],
    answerKinds: ['grid'],
    params: [
        {
            id: 'format', type: 'select', label: 'Taille du code', default: 'moyen',
            aide: 'C\'est la PALETTE qui fait la difficulté, pas le nombre de cases : quatre '
                + 'cases et quatre couleurs font 256 codes possibles, quatre cases et six '
                + 'couleurs en font 1296, cinq cases et huit couleurs 32 768.',
            options: Object.values(FORMATS).map(f => ({ value: f.id, label: f.label }))
        },
        {
            id: 'repetitions', type: 'boolean', label: 'Une couleur peut se répéter',
            default: true,
            aide: 'Sans répétition, l\'exercice est nettement plus facile — et il perd sa '
                + 'subtilité la plus intéressante : quand une couleur paraît deux fois dans la '
                + 'proposition mais une seule dans le code, elle ne compte qu\'une fois.'
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const format = FORMATS[p.format] ? p.format : 'moyen';
        const repetitions = p.repetitions !== false;

        const g = creerDeduction({ format, repetitions, rng });
        // Le noyau réessaie déjà quarante fois ; s'il ne rend rien, c'est que le
        // format est impossible (par exemple cinq cases sans répétition dans une
        // palette de quatre). On retombe alors sur le format qui marche
        // toujours, plutôt que de rendre un bloc vide.
        const grille = g || creerDeduction({ format: 'moyen', repetitions: true, rng });
        const q = qualiteMastermind(grille);

        return makeItem({
            seed: rng.seed,
            generatorId: 'log.mastermind-fiche',
            skillId: 'num.logique.mastermind',
            answerKind: 'grid',
            prompt: {
                text: `Retrouve le code : ${grille.longueur} cases, `
                    + `${grille.couleurs.length} couleurs, ${grille.lignes.length} essais connus.`,
                papier: 'Mastermind — retrouve le code.',
                html: `<div class="game-question">Mastermind ${grille.longueur} × `
                    + `${grille.couleurs.length}</div>`
            },
            answer: q.secret,
            // LE CORRIGÉ MONTRE LA DESCENTE, pas seulement le code : « 1296 codes
            // au départ, 62 après le premier essai, 4 après le deuxième, 1 ».
            // C'est ce qu'on écrit au tableau, et c'est la leçon du jeu — on
            // n'a pas deviné, on a éliminé.
            explanation: `Le code est ${grille.secret.join(' ')}. `
                + `Au départ ${q.depart} codes possibles ; `
                + q.etapes.map(e => `après ${e.code}, il en reste ${e.apres}`).join(' ; ') + '.',
            difficulty: { facile: 1, moyen: 2, difficile: 3 }[grille.format] || 2,
            meta: {
                format: grille.format,
                longueur: grille.longueur,
                repetitions: grille.repetitions,
                couleurs: grille.couleurs,
                lignes: grille.lignes,
                secret: grille.secret,
                depart: q.depart,
                etapes: q.etapes
            }
        });
    }
};
