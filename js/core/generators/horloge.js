// Générateur « Lire l'heure » — la pendule à aiguilles.
//
// Une compétence qui se perd : les écrans affichent 14:37 et plus personne
// n'a besoin de savoir que la petite aiguille entre le 2 et le 3 veut dire
// « 2 heures passées ». Or c'est un exercice de mathématiques complet — deux
// lectures simultanées sur le même cadran, une graduation en 12 pour les
// heures et une graduation en 60 pour les minutes, avec un facteur 5 entre
// les deux — et c'est le premier endroit où l'on rencontre une base qui
// n'est pas 10.
//
// La progression est écrite à la main, pas tirée au sort, parce que la
// difficulté ne vient pas du nombre mais de CE QU'IL FAUT LIRE :
//   1. heures pile      — la grande aiguille sur le 12, on ne lit qu'une chose
//   2. demi-heures      — la grande sur le 6 ; la petite a déjà bougé, et
//                         c'est LÀ que se joue la difficulté du niveau
//   3. quarts d'heure   — et quart, et demie, moins le quart : le vocabulaire
//   4. de cinq en cinq  — la table de 5 devient une lecture
//   5. à la minute      — il faut compter les petites graduations
//   6. l'après-midi     — la même pendule, mais 3 h de l'après-midi se dit
//                         aussi 15 h : le tour complet vaut 12 heures
//
// Deux questions sur le même cadran, et elles ne s'apprennent pas ensemble :
// LIRE l'heure affichée, et PLACER les aiguilles sur une heure donnée. La
// seconde est plus dure — il faut décider où va la petite aiguille — et c'est
// elle qui révèle qu'on a compris.

import { makeItem } from '../items.js';

const SKILL_LIRE = 'mes.heure.lire';
const SKILL_PLACER = 'mes.heure.placer';

/**
 * Les niveaux, dans l'ordre. `minutes(rng)` tire les minutes autorisées ;
 * c'est tout ce qui change vraiment d'un niveau à l'autre.
 */
export const NIVEAUX = [
    {
        id: 'heures', titre: 'Les heures pile',
        minutes: () => 0,
        reperes: true, difficulte: 1,
        aide: 'La grande aiguille est sur le 12 : il est une heure PILE. Il ne reste que la petite aiguille à lire.'
    },
    {
        id: 'demies', titre: 'Les demi-heures',
        minutes: (rng) => (rng.bool() ? 0 : 30),
        reperes: true, difficulte: 2,
        aide: 'La grande aiguille sur le 6, c\'est la moitié du tour : 30 minutes. Attention, la petite aiguille est alors ENTRE deux nombres — on garde le plus petit.'
    },
    {
        id: 'quarts', titre: 'Les quarts d\'heure',
        minutes: (rng) => [0, 15, 30, 45][rng.int(0, 3)],
        reperes: true, difficulte: 2,
        aide: 'Un quart de tour vaut 15 minutes : sur le 3 « et quart », sur le 6 « et demie », sur le 9 « moins le quart ».'
    },
    {
        id: 'cinq', titre: 'De cinq en cinq',
        minutes: (rng) => rng.int(0, 11) * 5,
        reperes: true, difficulte: 3,
        aide: 'Chaque nombre du cadran vaut 5 minutes pour la grande aiguille : sur le 7, c\'est 7 × 5 = 35 minutes.'
    },
    {
        id: 'minute', titre: 'À la minute près',
        minutes: (rng) => rng.int(0, 59),
        reperes: false, difficulte: 4,
        aide: 'On part du dernier nombre franchi par la grande aiguille (× 5) et on compte les petites graduations une par une.'
    },
    {
        id: 'apresmidi', titre: 'L\'après-midi (24 heures)',
        minutes: (rng) => rng.int(0, 11) * 5,
        apresmidi: true, reperes: false, difficulte: 5,
        aide: 'La pendule ne compte que jusqu\'à 12 : l\'après-midi, on ajoute 12 à ce qu\'elle montre. 3 h de l\'après-midi, c\'est 15 h.'
    }
];

const NOMS = ['minuit', 'une', 'deux', 'trois', 'quatre', 'cinq', 'six',
    'sept', 'huit', 'neuf', 'dix', 'onze', 'midi'];

const deuxChiffres = (n) => String(n).padStart(2, '0');

/** « 7:35 » — la forme canonique de la réponse, heures sur 0-23. */
export function cleHeure(h, m) {
    return `${h}:${deuxChiffres(m)}`;
}

/**
 * L'heure dite à la française : « trois heures et quart », « huit heures
 * moins le quart ». C'est la formulation ORALE, celle qu'on entend et qu'on
 * doit savoir traduire en position d'aiguilles.
 */
export function direHeure(h, m) {
    const h12 = ((h % 12) + 12) % 12;
    const nom = h12 === 0 ? (h === 0 ? 'minuit' : 'midi') : NOMS[h12];
    const unite = (h12 === 0) ? '' : (h12 === 1 ? ' heure' : ' heures');
    if (m === 0) return nom + unite;
    if (m === 15) return `${nom}${unite} et quart`;
    if (m === 30) return `${nom}${unite} et demie`;
    if (m === 45) {
        const suivant = (h + 1) % 24;
        const s12 = ((suivant % 12) + 12) % 12;
        const nomS = s12 === 0 ? (suivant === 0 ? 'minuit' : 'midi') : NOMS[s12];
        const uniteS = (s12 === 0) ? '' : (s12 === 1 ? ' heure' : ' heures');
        return `${nomS}${uniteS} moins le quart`;
    }
    return `${nom}${unite} ${m}`;
}

/**
 * Le détail de la lecture, en toutes lettres : c'est l'explication qu'on
 * relit après une erreur, donc elle doit refaire le raisonnement — pas
 * annoncer le résultat.
 */
export function expliquerLecture(h, m, apresmidi) {
    const h12 = ((h % 12) + 12) % 12 || 12;
    const suivant = h12 === 12 ? 1 : h12 + 1;
    const petite = m === 0
        ? `La petite aiguille est pile sur le ${h12} : il est ${h12} heures.`
        : `La petite aiguille est entre le ${h12} et le ${suivant} : on garde le plus petit, il est ${h12} heures passées.`;
    const grande = m === 0
        ? 'La grande aiguille est sur le 12 : 0 minute.'
        : (m % 5 === 0
            ? `La grande aiguille est sur le ${m / 5} : ${m / 5} × 5 = ${m} minutes.`
            : `La grande aiguille a dépassé le ${Math.floor(m / 5)} (${Math.floor(m / 5) * 5} minutes) de ${m % 5} petite${m % 5 > 1 ? 's' : ''} graduation${m % 5 > 1 ? 's' : ''} : ${Math.floor(m / 5) * 5} + ${m % 5} = ${m} minutes.`);
    const conclusion = apresmidi
        ? `C'est l'après-midi : on ajoute 12, il est donc ${h} h ${deuxChiffres(m)}.`
        : `Il est ${h12} h ${deuxChiffres(m)}.`;
    return `${petite} ${grande} ${conclusion}`;
}

export const horlogeGenerator = {
    id: 'mes.horloge',
    label: 'Lire l\'heure sur une pendule',
    skills: [SKILL_LIRE, SKILL_PLACER],
    answerKinds: ['heure'],
    // Six niveaux a deux questions, comme les relatifs : douze questions pour
    // aller de « l'heure pile » au tour de midi.
    conseil: (p) => (p && p.niveau === 'progressif') ? NIVEAUX.length * 2 : 10,
    params: [
        {
            id: 'niveau', type: 'select', label: 'Niveau',
            options: [
                { value: 'progressif', label: 'Progressif (les 6 niveaux à la suite)' },
                ...NIVEAUX.map((n, i) => ({ value: n.id, label: `${i + 1}. ${n.titre}` }))
            ],
            default: 'progressif'
        },
        {
            id: 'question', type: 'select', label: 'Question',
            options: [
                { value: 'lire', label: 'Lire l\'heure affichée' },
                { value: 'placer', label: 'Placer les aiguilles' },
                { value: 'mixte', label: 'Les deux en alternance' }
            ],
            default: 'lire'
        },
        {
            id: 'reperes', type: 'select', label: 'Nombres des minutes',
            options: [
                { value: 'auto', label: 'Selon le niveau (recommandé)' },
                { value: 'toujours', label: 'Toujours affichés' },
                { value: 'jamais', label: 'Jamais (pendule ordinaire)' }
            ],
            default: 'auto'
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const choix = params?.niveau || 'progressif';
        // En progressif, on monte d'un cran toutes les deux questions : le
        // temps de s'installer dans un niveau avant d'en changer.
        const rang = choix === 'progressif'
            ? Math.min(NIVEAUX.length - 1, Math.floor((ctx.index ?? 0) / 2))
            : Math.max(0, NIVEAUX.findIndex(n => n.id === choix));
        const niveau = NIVEAUX[rang];

        const mode = params?.question === 'mixte'
            ? (rng.bool() ? 'lire' : 'placer')
            : (params?.question || 'lire');

        const m = niveau.minutes(rng);
        // 12 h et 0 h se lisent « midi » et « minuit » : de vraies heures,
        // mais elles brouillent l'apprentissage de la petite aiguille. On les
        // garde pour le niveau 24 heures, où elles ont un sens.
        const h = niveau.apresmidi ? rng.int(13, 23) : rng.int(1, 12);

        const reperes = params?.reperes === 'toujours' ? true
            : params?.reperes === 'jamais' ? false
                : niveau.reperes;

        const h12 = ((h % 12) + 12) % 12 || 12;
        // PLACER se joue toujours sur le cadran de 12 : une pendule à
        // aiguilles ne distingue pas 3 h de 15 h. Demander « place 15 h 20 »
        // et attendre les aiguilles de 3 h 20 n'est pas un détour — c'est
        // exactement la conversion qu'on veut faire travailler.
        const cle = mode === 'placer' ? cleHeure(h12, m) : cleHeure(h, m);
        const dit = direHeure(h, m);
        const explication = expliquerLecture(h, m, !!niveau.apresmidi);

        const aides = mode === 'lire'
            ? [
                'La PETITE aiguille (bleue) donne les heures, la GRANDE (rouge) donne les minutes.',
                niveau.aide,
                explication
            ]
            : [
                'Commence par la GRANDE aiguille : elle se place sur les minutes.',
                `${m === 0 ? 'La grande aiguille va sur le 12.' : m % 5 === 0 ? `${m} minutes, c'est ${m} ÷ 5 = ${m / 5} : la grande aiguille va sur le ${m / 5}.` : `${m} minutes : la grande aiguille dépasse le ${Math.floor(m / 5)} de ${m % 5} graduation${m % 5 > 1 ? 's' : ''}.`}`,
                `Puis la petite aiguille sur le ${h12}${m ? ' — elle se décalera toute seule vers le nombre suivant, c\'est normal' : ''}.`
            ];

        const enonce = mode === 'lire'
            ? (niveau.apresmidi ? 'Quelle heure est-il ? (c\'est l\'après-midi)' : 'Quelle heure est-il ?')
            : `Place les aiguilles sur ${h} h ${deuxChiffres(m)}`;

        return makeItem({
            seed: rng.seed,
            generatorId: 'mes.horloge',
            skillId: mode === 'lire' ? SKILL_LIRE : SKILL_PLACER,
            answerKind: 'heure',
            prompt: {
                text: enonce,
                html: `<div class="game-question">${enonce}</div>`
            },
            answer: cle,
            hints: aides,
            explanation: mode === 'lire'
                ? `${explication} On dit « ${dit} ».`
                : `${explication} Sur la pendule, ${h} h ${deuxChiffres(m)} se lit « ${dit} ».`,
            difficulty: niveau.difficulte,
            meta: {
                mode, h, m, h12,
                niveau: niveau.id, titre: niveau.titre,
                rang: rang + 1, total: NIVEAUX.length,
                apresmidi: !!niveau.apresmidi,
                reperes, dit
            }
        });
    }
};
