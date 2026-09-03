// HYPOTÉNUSE, OPPOSÉ, ADJACENT — SUR PAPIER.
//
// Rémy, quand je lui ai demandé quels exercices manquaient de fiche :
// « Hypoténuse, Opposé, Adjacent, et Les Fonctions : Image et Antécédent ».
//
// À L'ÉCRAN ON CLIQUE UN CÔTÉ ; SUR LE PAPIER ON ÉCRIT SON NOM. C'est le même
// travail et ce n'est pas le même geste : cliquer prouve qu'on a LU la figure,
// écrire « [AB] » prouve en plus qu'on sait nommer un segment par ses deux
// extrémités — et c'est cette écriture-là qui servira dans une formule. Le
// premier palier de l'exercice (« cliquer le côté ») n'a donc pas de traduction
// papier : il devient le palier « écrire », qui est son voisin immédiat.
//
// LA FIGURE TOURNE, ET C'EST TOUT LE SUJET. Un triangle toujours posé l'angle
// droit en bas à gauche enseigne « adjacent = horizontal », une règle fausse qui
// s'effondre au premier contrôle. Sur une feuille c'est PIRE qu'à l'écran :
// l'élève a les huit figures sous les yeux en même temps, et si elles se
// ressemblent toutes, il répond à la deuxième sans regarder. On tire donc une
// orientation par figure — et l'on peut la figer le temps de la découverte.
//
// LE MÊME TRIANGLE, DEUX ANGLES. Une même figure posée deux fois avec l'angle
// marqué à l'autre sommet change les DEUX réponses sans changer le dessin : ce
// piège-là ne se tend qu'en série, donc sur une feuille.

import { makeItem } from '../items.js';
import {
    tirerTriangle, rolesDe, sommetVise, sommetDroit,
    ROLES, COURTS, ORDRE_FONCTIONS, formuleDe, MEMO
} from '../trigonometrie.js';

/** Ce qu'on demande sur la feuille, dans l'ordre où on l'enseigne. */
const ROLES_ATTENDUS = [ROLES.HYPOTENUSE, ROLES.OPPOSE, ROLES.ADJACENT];

export const trigoCotesGenerator = {
    id: 'geo.trigo.cotes',
    label: 'Hypoténuse, opposé, adjacent',
    skills: ['geo.trigo.cotes'],
    answerKinds: ['figure'],
    params: [
        {
            id: 'quoi', type: 'select', label: 'Ce qu\'on demande', default: 'noms',
            echelle: true,
            aide: 'Nommer les trois côtés est le travail de base, et il suffit à occuper '
                + 'une feuille entière. La formule demande DEUX choses à la fois — le '
                + 'rapport (CAH SOH TOA) et la lecture de la figure —, et ces deux-là se '
                + 'ratent séparément : on ne la donne qu\'une fois la première acquise.',
            options: [
                { value: 'noms', label: 'Nommer les trois côtés', court: 'Noms' },
                { value: 'formule', label: 'Écrire la formule — cos(G) = …', court: 'Formule' }
            ]
        },
        {
            id: 'tourner', type: 'checkbox', label: 'Faire tourner les figures', default: true,
            aide: 'Décoché, toutes les figures ont l\'angle droit au même endroit : la '
                + 'feuille se remplit sans la lire. C\'est utile UNE fois, à la découverte, '
                + 'et nuisible ensuite — « adjacent » n\'est pas une position.'
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const t = tirerTriangle(rng, { tourner: p.tourner !== false });
        const r = rolesDe(t);
        const A = sommetVise(t), D = sommetDroit(t);
        const formule = p.quoi === 'formule';

        // LA FONCTION TIRÉE, ET LES TROIS À PARTS ÉGALES. Le cosinus est le seul
        // qu'on révise spontanément ; la tangente est celle qu'on rate, parce
        // qu'elle est la seule où l'hypoténuse ne figure pas.
        const cle = formule ? rng.pick(ORDRE_FONCTIONS) : null;
        const f = cle ? formuleDe(t, cle) : null;

        const consigne = formule
            ? 'ÉCRIS LA FORMULE demandée sous chaque figure. Deux gestes, dans cet ordre : '
                + 'le RAPPORT d\'abord (CAH SOH TOA), la FIGURE ensuite — quel côté joue ce '
                + 'rôle pour l\'angle marqué. Nomme chaque côté par ses deux extrémités.'
            : 'POUR CHAQUE FIGURE, NOMME LES TROIS CÔTÉS par leurs deux extrémités. '
                + 'Commence par l\'HYPOTÉNUSE : elle est en face de l\'angle droit, et elle '
                + 'ne change pas de nom quel que soit l\'angle. Les deux autres dépendent de '
                + 'l\'angle marqué : l\'OPPOSÉ ne le touche pas, l\'ADJACENT le touche ET '
                + 'touche l\'angle droit. Attention : les figures sont TOURNÉES, « adjacent » '
                + 'n\'est pas « horizontal ».';

        const attendu = formule
            ? `${f.gauche} = [${f.attenduHaut}] / [${f.attenduBas}]`
            : ROLES_ATTENDUS.map(role => `${COURTS[role]} : [${r[role]}]`).join(' ; ');

        return makeItem({
            seed: rng.seed,
            generatorId: 'geo.trigo.cotes',
            skillId: 'geo.trigo.cotes',
            answerKind: 'figure',
            prompt: { text: consigne, papier: consigne },
            answer: attendu,
            explanation: formule
                ? `${f.fonction.memo} : ${f.rappel}. Sur cette figure, l'angle marqué est en `
                    + `${A} et l'angle droit en ${D} — donc ${f.gauche} = [${f.attenduHaut}] `
                    + `sur [${f.attenduBas}].`
                : `L'angle droit est en ${D}, l'angle marqué en ${A}. L'hypoténuse est en `
                    + `face de l'angle droit : ${r[ROLES.HYPOTENUSE]}. Le côté opposé ne `
                    + `touche pas ${A} : ${r[ROLES.OPPOSE]}. L'adjacent touche ${A} ET `
                    + `${D} : ${r[ROLES.ADJACENT]}.`,
            difficulty: formule ? 4 : 3,
            meta: {
                triangle: t,
                quoi: formule ? 'formule' : 'noms',
                // Le dessin et la correction se refont d'ici sans relire le noyau.
                angle: A, droit: D,
                roles: r,
                lignes: formule
                    ? [{ etiquette: `${f.gauche} =`, solution: `[${f.attenduHaut}] / [${f.attenduBas}]` }]
                    : ROLES_ATTENDUS.map(role => ({
                        // « Le côté opposé À L'ANGLE  » : l'étiquette rappelle de quel angle
                        // on parle, sinon la feuille se lit comme si « opposé » était une
                        // propriété du côté.
                        etiquette: role === ROLES.HYPOTENUSE
                            ? 'Hypoténuse' : `Côté ${COURTS[role]} à l'angle ${A}`,
                        solution: `[${r[role]}]`
                    })),
                memo: formule ? MEMO : null,
                rappel: f ? f.rappel : null
            }
        });
    }
};
