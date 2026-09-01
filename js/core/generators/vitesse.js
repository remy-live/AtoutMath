// TEMPS, DISTANCE, VITESSE — la formule dans les trois sens.
//
// d = v × t, et c'est TOUT : les deux autres formules s'en déduisent, et c'est
// exactement ce que l'élève doit comprendre au lieu d'apprendre trois formules
// par cœur. Chaque énoncé est une petite situation (un vélo, un train, un
// randonneur…), et la question tourne : tantôt la distance, tantôt la vitesse,
// tantôt la durée.
//
// LES NOMBRES TOMBENT JUSTE, PAR CONSTRUCTION. On tire la vitesse et la durée,
// et la distance en découle — jamais l'inverse. Les durées fractionnaires
// (une demi-heure, un quart d'heure) n'apparaissent qu'au niveau 2, et
// toujours en minutes converties rondes : l'obstacle « 1 h 30 = 1,5 h » est un
// vrai obstacle du chapitre, il arrive quand la formule est en place.

import { makeItem } from '../items.js';
import { schemaVitesseSvg, formulesVitesseHtml } from '../vitesseSchema.js';

// Chaque véhicule borne ses vitesses vraisemblables : un randonneur à 90 km/h
// ou un TGV à 12 km/h feraient douter l'élève qui vérifie son ordre de
// grandeur — et vérifier l'ordre de grandeur est exactement ce qu'on veut
// qu'il fasse.
const MOBILES = [
    { sujet: 'Un randonneur', verbe: 'marche', vitesses: [4, 5, 6] },
    { sujet: 'Un cycliste', verbe: 'roule', vitesses: [12, 15, 18, 20, 24] },
    { sujet: 'Une voiture', verbe: 'roule', vitesses: [60, 80, 90, 110, 130] },
    { sujet: 'Un train', verbe: 'roule', vitesses: [120, 160, 200, 300] },
    { sujet: 'Un bateau', verbe: 'navigue', vitesses: [10, 20, 30, 40] },
    { sujet: 'Un coureur', verbe: 'court', vitesses: [8, 10, 12, 15] }
];

// Les durées : rondes au niveau 1, fractionnaires simples au niveau 2. Le
// texte dit « 1 h 30 », le calcul veut 1,5 : c'est LE piège du chapitre, et il
// est corrigé en toutes lettres.
const DUREES_RONDES = [1, 2, 3, 4, 5];
const DUREES_FRACTION = [
    { texte: '30 minutes', h: 0.5, dit: '30 minutes = 0,5 h' },
    { texte: '1 h 30', h: 1.5, dit: '1 h 30 = 1,5 h' },
    { texte: '2 h 30', h: 2.5, dit: '2 h 30 = 2,5 h' },
    { texte: '15 minutes', h: 0.25, dit: '15 minutes = 0,25 h' },
    { texte: '45 minutes', h: 0.75, dit: '45 minutes = 0,75 h' }
];

const formatFr = (x) => String(x).replace('.', ',');

/** La durée, dite comme on la dit : « 2 heures », « 1 h 30 ». */
const direDuree = (h) => {
    const connu = DUREES_FRACTION.find(d => d.h === h);
    if (connu) return connu.texte;
    return h === 1 ? '1 heure' : `${formatFr(h)} heures`;
};

export const vitesseGenerator = {
    id: 'mes.vitesse',
    label: 'Temps, distance, vitesse',
    skills: ['mes.vitesse'],
    answerKinds: ['numeric'],
    ecrit: true,
    params: [
        {
            id: 'chercher', type: 'select', label: 'Chercher', default: 'melange',
            options: [
                { value: 'distance', label: 'La distance (d = v × t)' },
                { value: 'vitesse', label: 'La vitesse (v = d ÷ t)' },
                { value: 'duree', label: 'La durée (t = d ÷ v)' },
                { value: 'melange', label: 'Mélangé' }
            ]
        },
        {
            id: 'difficulte', type: 'select', label: 'Durées', default: 1,
            options: [
                { value: 1, label: 'Heures entières' },
                { value: 2, label: 'Avec demi-heures et quarts d\'heure' }
            ]
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const quoi = (params && params.chercher && params.chercher !== 'melange')
            ? params.chercher : rng.pick(['distance', 'vitesse', 'duree']);
        const dur2 = Number(params && params.difficulte) === 2;

        const mobile = rng.pick(MOBILES);
        const v = rng.pick(mobile.vitesses);
        // La durée fractionnaire ne sert que si le produit reste entier :
        // 15 × 1,5 = 22,5 se corrige mal en calcul mental de ce niveau.
        const candidates = dur2
            ? [...DUREES_RONDES, ...DUREES_FRACTION.map(d => d.h)].filter(h => Number.isInteger(v * h))
            : DUREES_RONDES;
        const t = rng.pick(candidates.length ? candidates : DUREES_RONDES);
        const d = v * t;
        const conversion = DUREES_FRACTION.find(x => x.h === t);

        const debut = `${mobile.sujet} ${mobile.verbe} à ${v} km/h pendant ${direDuree(t)}.`;
        let texte, reponse, unite, formule, correction;
        if (quoi === 'distance') {
            texte = `${debut} Quelle distance parcourt-il ?`;
            reponse = d; unite = 'km';
            formule = 'd = v × t';
            correction = `d = ${v} × ${formatFr(t)} = ${d} km`;
        } else if (quoi === 'vitesse') {
            texte = `${mobile.sujet} parcourt ${d} km en ${direDuree(t)}. Quelle est sa vitesse moyenne ?`;
            reponse = v; unite = 'km/h';
            formule = 'v = d ÷ t';
            correction = `v = ${d} ÷ ${formatFr(t)} = ${v} km/h`;
        } else {
            texte = `${mobile.sujet} ${mobile.verbe} à ${v} km/h et parcourt ${d} km. Combien de temps lui faut-il ?`;
            reponse = t; unite = 'h';
            formule = 't = d ÷ v';
            correction = `t = ${d} ÷ ${v} = ${formatFr(t)} h`
                + (conversion ? `, c'est-à-dire ${conversion.texte}` : '');
        }

        return makeItem({
            seed: rng.seed,
            generatorId: 'mes.vitesse',
            skillId: 'mes.vitesse',
            answerKind: 'numeric',
            prompt: {
                text: `${texte} (en ${unite})`,
                papier: `${texte} Réponds en ${unite}.`
            },
            answer: reponse,
            // LES TROIS FORMULES, L'UNE SOUS L'AUTRE. Rémy : « donne les 3
            // formules, n'hésite pas à revenir à la ligne ». Elles ne sont
            // qu'une seule formule retournée trois fois, et c'est justement ce
            // qu'on veut faire voir — écrites à la file dans un paragraphe,
            // elles se lisent comme une phrase et ne se retiennent pas ;
            // empilées, on les compare d'un coup d'œil et l'on choisit la
            // bonne selon ce qu'on cherche.
            hints: [
                'Tout vient d\'une seule formule, écrite de trois façons :\n'
                    + 'd = v × t   (la distance)\n'
                    + 'v = d ÷ t   (la vitesse)\n'
                    + 't = d ÷ v   (le temps)\n'
                    + 'Écris celle qui donne ce qu\'on cherche, puis entoure ce que tu connais.',
                `Ici on cherche ${quoi === 'distance' ? 'la distance :\nd = v × t' : quoi === 'vitesse' ? 'la vitesse :\nv = d ÷ t' : 'le temps :\nt = d ÷ v'}.`
                    + (conversion ? `\nAttention : ${conversion.dit}.` : '')
            ],
            explanation: `${formule} : ${correction}.`
                + (conversion && quoi !== 'duree' ? ` (${conversion.dit}.)` : ''),
            difficulty: dur2 ? 3 : 2,
            meta: {
                quoi, v, t, d, mobile: mobile.sujet,
                conversion: conversion ? conversion.dit : null,
                // LES DEUX BOUTONS DE RÉMY. « On pourrait avoir un bouton
                // schéma et un bouton formule (mais pas valable tout le
                // temps) » : c'est l'item qui les déclare, donc ils
                // n'apparaissent que là où ils veulent dire quelque chose.
                // Aucun des deux ne donne la réponse — la grandeur cherchée y
                // porte un « ? », et les trois formules sont montrées sans
                // qu'on désigne la bonne : choisir EST l'exercice.
                outils: [
                    { id: 'schema', label: '📐 Voir le schéma', html: schemaVitesseSvg({
                        quoi, direV: `${v} km/h`, direD: `${d} km`, direT: `${formatFr(t)} h`
                    }) },
                    { id: 'formule', label: '🧮 Les formules', html: formulesVitesseHtml() }
                ]
            }
        });
    }
};
