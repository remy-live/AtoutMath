// LA VALEUR MANQUANTE — les exercices 15 à 21 de la fiche de Rémy.
//
// Une figure, un angle donné, un angle à trouver. Ce n'est pas un calcul : la
// réponse EST la relation, et le nombre n'en est que la conséquence. C'est
// pour cela que l'explication dit toujours la règle avant le résultat.
//
// LES NIVEAUX SONT CEUX DE LA FICHE, dans le même ordre — c'est une
// progression éprouvée en classe, pas un classement inventé :
//
//   0. OPPOSÉS PAR LE SOMMET. Deux droites, quatre angles, et l'égalité se
//      voit. Aucun calcul : on recopie la mesure.
//   0. PARALLÈLES. Correspondants ou alternes-internes : même chose, mais il
//      faut d'abord repérer les deux droites parallèles.
//   1. COMPLÉMENTAIRES (90°), SUPPLÉMENTAIRES (180°), AUTOUR D'UN POINT
//      (360°). Une soustraction, et surtout le bon total à choisir.
//   2. LA CHAÎNE. Deux pas : d'abord un supplémentaire, puis un correspondant.
//      C'est là que le chapitre devient un raisonnement.

import { makeItem, finalizeChoices } from '../items.js';
import {
    RELATIONS, figureSecantes, figurePartage, figureParalleles, mesureArc, pencheEtale
} from '../anglesRemarquables.js';
import { figureAnglesSvg } from '../anglesRemarquablesSvg.js';
import { figure as encadrer } from '../figures.js';

/** Les familles tirables, chacune avec son niveau et sa fabrique de figure. */
const FAMILLES = [
    {
        id: 'opposes', niveau: 0, relation: 'opposes',
        // Ni trop plat ni trop pointu : entre 25 et 75 degrés, les quatre
        // angles se distinguent d'un coup d'œil et l'on voit lesquels sont
        // opposés. À 5°, on ne voit qu'une croix.
        tirer: (rng) => rng.int(25, 75) + (rng.bool() ? 0 : 90),
        figure: (a, penche) => figureSecantes({ angle: a, penche })
    },
    {
        id: 'correspondants', niveau: 0, relation: 'correspondants',
        tirer: (rng) => rng.int(30, 75),
        figure: (a, penche) => figureParalleles({ angle: a, penche, relation: 'correspondants' })
    },
    {
        id: 'alternes', niveau: 0, relation: 'alternes',
        tirer: (rng) => rng.int(30, 75),
        figure: (a, penche) => figureParalleles({ angle: a, penche, relation: 'alternes' })
    },
    {
        id: 'complementaires', niveau: 1, relation: 'complementaires',
        // On évite 45° : la réponse serait la mesure donnée, et l'élève ne
        // saurait pas s'il a compris ou recopié.
        tirer: (rng) => { const a = rng.int(10, 80); return a === 45 ? 44 : a; },
        figure: (a, penche) => figurePartage({ ouverture: 90, angle: a, penche })
    },
    {
        id: 'supplementaires', niveau: 1, relation: 'supplementaires',
        tirer: (rng) => { const a = rng.int(15, 165); return a === 90 ? 89 : a; },
        figure: (a, penche) => figurePartage({ ouverture: 180, angle: a, penche })
    },
    {
        id: 'plein', niveau: 1, relation: 'plein',
        // Une part d'angle plein se lit mal en dessous de soixante degrés, et
        // au-delà de trois cents il ne reste plus rien à montrer.
        tirer: (rng) => rng.int(60, 300),
        figure: (a, penche) => figurePartage({ ouverture: 360, angle: a, penche })
    }
];

/** Les deux pas de la chaîne : un supplémentaire, puis un correspondant. */
const CHAINE = { id: 'chaine', niveau: 2 };

const familleDe = (id) => FAMILLES.find(f => f.id === id);

/**
 * Trois mesures voisines de la bonne, chacune avec l'erreur qu'elle dénonce.
 * Ce sont LES fautes du chapitre : prendre l'égalité pour un complément,
 * soustraire à 90 quand il fallait 180, ou lire l'angle d'à côté.
 */
function voisines(relation, donne, bon) {
    const dehors = [
        { v: donne, why: `${donne}° est l'angle DONNÉ. Ces deux angles-là ne sont pas égaux.` },
        { v: 90 - donne, why: `90° − ${donne}°, c'est le complémentaire : la somme ne vaut 90° que dans un angle DROIT.` },
        { v: 180 - donne, why: `180° − ${donne}°, c'est le supplémentaire : la somme ne vaut 180° que dans un angle PLAT.` },
        { v: 360 - donne, why: `360° − ${donne}°, c'est le tour complet : la somme ne vaut 360° qu'AUTOUR d'un point.` }
    ];
    return dehors
        .filter(c => c.v !== bon && c.v > 0 && c.v < 360)
        .map(c => ({ value: `${c.v}°`, label: `${c.v}°`, why: c.why }));
}

/** Une figure de chaîne : deux parallèles, un angle donné qui n'est pas voisin. */
function figureChaine(angle, penche) {
    // On donne l'angle du sommet du haut, rang 1 — celui qui est
    // SUPPLÉMENTAIRE de celui qu'on cherche au même sommet — puis on descend
    // par les correspondants au sommet du bas.
    const f = figureParalleles({ angle, penche, relation: 'correspondants' });
    // Le rang 1 du sommet du haut : entre la parallèle et la sécante opposée.
    const haut = f.arcs[0];
    const donne = {
        x: haut.x, y: haut.y,
        de: haut.a, a: haut.de + 180, role: 'donne', pas: 1
    };
    const cherche = { ...f.arcs[1], role: 'cherche', pas: 2 };
    // Le pas intermédiaire reste VISIBLE mais muet : c'est le numéro ① qui dit
    // par où passer, exactement comme sur la fiche.
    const relais = { ...f.arcs[0], role: 'relais', pas: 1 };
    return { traits: f.traits, arcs: [donne, relais, cherche] };
}

export const anglesManquantsGenerator = {
    id: 'geo.angles-manquants',
    label: 'La valeur manquante — angles remarquables',
    skills: ['geo.angles.relations'],
    answerKinds: ['numeric', 'choice'],
    ecrit: true,
    params: [
        {
            id: 'niveau', type: 'select', label: 'Difficulté', default: 'melange',
            aide: 'Le niveau 0 ne demande aucun calcul : les deux angles sont ÉGAUX, et tout '
                + 'l\'exercice est de voir lesquels. Le niveau 1 ajoute la soustraction — et '
                + 'le vrai choix, c\'est le total : 90, 180 ou 360. La chaîne enchaîne deux '
                + 'relations : c\'est le raisonnement du chapitre.',
            options: [
                { value: '0', label: '0 — Des angles égaux, rien à calculer' },
                { value: '1', label: '1 — Une soustraction : 90°, 180° ou 360°' },
                { value: '2', label: '2 — La chaîne : deux relations à la suite' },
                { value: 'melange', label: 'Mélangés, du plus simple au plus dur' }
            ]
        },
        {
            id: 'familles', type: 'multiselect', label: 'Les relations travaillées',
            aide: 'Une série qui ne travaille QUE les supplémentaires s\'installe dans la '
                + 'tête ; mélangée, elle oblige à choisir le bon total à chaque figure. Ce ne '
                + 'sont pas les mêmes moments de la séance.',
            options: FAMILLES.map(f => ({ value: f.id, label: RELATIONS[f.relation].nom })),
            default: FAMILLES.map(f => f.id)
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const choisies = (Array.isArray(p.familles) && p.familles.length
            ? p.familles.filter(id => familleDe(id)) : FAMILLES.map(f => f.id));
        const liste = (choisies.length ? choisies : FAMILLES.map(f => f.id)).map(familleDe);

        const niveau = ['0', '1', '2'].includes(String(p.niveau)) ? String(p.niveau) : 'melange';
        // MÉLANGÉ VEUT DIRE « DANS L'ORDRE », pas « au hasard » : une fiche
        // commence par ce qui se voit et finit par ce qui se raisonne.
        const i = Number(ctx.index) || 0;
        const voulu = niveau === 'melange' ? [0, 0, 1, 1, 1, 2][i % 6] : Number(niveau);

        if (voulu === 2) return itemChaine(rng);
        const pool = liste.filter(f => f.niveau === voulu);
        const f = rng.pick(pool.length ? pool : liste);
        return itemSimple(rng, f);
    }
};

/** Un item à une relation : la figure, l'angle donné, la mesure à trouver. */
function itemSimple(rng, f) {
    const rel = RELATIONS[f.relation];
    const donne = f.tirer(rng);
    // LA FIGURE EST PENCHÉE N'IMPORTE COMMENT, sur un tour entier. Inclinée de
    // quelques degrés seulement, un angle droit reste un coin de page : on le
    // reconnaît à sa forme sans jamais regarder ses côtés — le piège de tous
    // les manuels — et il n'occupe qu'un quart du bloc. Tourné au hasard, il
    // remplit la place et il faut le LIRE.
    const figure = pencheEtale((p) => f.figure(donne, p), rng.int(0, 359));
    // La mesure réellement dessinée fait foi : c'est elle que l'élève lit.
    const mDonne = mesureArc(figure.arcs.find(a => a.role === 'donne'));
    const bon = rel.de(mDonne);
    // UNE QUESTION D'UNE LIGNE. « Quelle est la mesure de l'angle vert ? » en
    // prend deux sur un téléphone, et ces trente pixels-là se prennent sur la
    // figure — la seule chose qu'il y ait vraiment à regarder.
    const enonce = 'Combien mesure l\'angle vert ?';
    return makeItem({
        seed: rng.seed,
        generatorId: 'geo.angles-manquants',
        skillId: 'geo.angles.relations',
        answerKind: 'numeric',
        prompt: {
            text: enonce,
            papier: enonce,
            html: `<div class="game-question">${enonce}</div>`
                + encadrer(figureAnglesSvg(figure))
        },
        answer: bon,
        unite: '°',
        choices: finalizeChoices(rng, [
            { value: `${bon}°`, label: `${bon}°`, correct: true },
            ...voisines(f.relation, mDonne, bon)
        ], { count: 4 }),
        hints: [
            'Regarde d\'abord COMMENT les deux angles sont placés l\'un par rapport à l\'autre.',
            `Ces deux angles sont ${rel.nom} : ${rel.pourquoi}.`
        ],
        explanation: `Ces deux angles sont ${rel.nom} : ${rel.pourquoi}. `
            + `Donc ${rel.calcul(mDonne)}.`,
        difficulty: f.niveau + 1,
        meta: {
            famille: f.id, relation: f.relation, niveau: f.niveau,
            donne: mDonne, reponse: bon, figure,
            theme: `${f.id}-${mDonne}`
        }
    });
}

/** Un item en deux pas : supplémentaire, puis correspondant. */
function itemChaine(rng) {
    const angle = rng.int(30, 75);
    const figure = pencheEtale((p) => figureChaine(angle, p), rng.int(0, 359));
    const mDonne = mesureArc(figure.arcs.find(a => a.role === 'donne'));
    const relais = 180 - mDonne;              // supplémentaires au même sommet
    const bon = relais;                       // puis correspondants : égaux
    const enonce = 'Combien mesure l\'angle vert ? Passe par l\'angle ①.';
    return makeItem({
        seed: rng.seed,
        generatorId: 'geo.angles-manquants',
        skillId: 'geo.angles.relations',
        answerKind: 'numeric',
        prompt: {
            text: enonce,
            papier: enonce,
            html: `<div class="game-question">${enonce}</div>`
                + encadrer(figureAnglesSvg(figure))
        },
        answer: bon,
        unite: '°',
        choices: finalizeChoices(rng, [
            { value: `${bon}°`, label: `${bon}°`, correct: true },
            { value: `${mDonne}°`, label: `${mDonne}°`, why: `${mDonne}° est l'angle donné : il faut d'abord passer par son supplémentaire.` },
            { value: `${90 - (mDonne % 90)}°`, label: `${90 - (mDonne % 90)}°`, why: 'Ici le total n\'est pas 90° : les deux premiers angles forment un angle PLAT.' },
            { value: `${Math.max(1, 360 - mDonne)}°`, label: `${Math.max(1, 360 - mDonne)}°`, why: 'Le tour complet ne sert que pour des angles AUTOUR d\'un point.' }
        ], { count: 4 }),
        hints: [
            'Deux pas. Le premier se fait au sommet du haut, sans changer de droite.',
            `① L'angle donné et son voisin sont supplémentaires : 180° − ${mDonne}° = ${relais}°.`,
            '② Cet angle-là et l\'angle vert sont correspondants : ils sont égaux.'
        ],
        explanation: `① L'angle donné et l'angle ① sont supplémentaires : 180° − ${mDonne}° = ${relais}°. `
            + `② L'angle ① et l'angle vert sont correspondants, donc égaux : ${bon}°.`,
        difficulty: 3,
        meta: {
            famille: 'chaine', relation: 'chaine', niveau: CHAINE.niveau,
            donne: mDonne, relais, reponse: bon, figure,
            theme: `chaine-${mDonne}`
        }
    });
}
