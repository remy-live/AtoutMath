// TROIS JEUX QUI PASSENT SUR LE PAPIER : le compte est bon, le point à point,
// le dédale.
//
// Rémy les demande tous les trois, et ce sont les trois cas où l'écran ne
// remplace pas la feuille : on cherche un compte au brouillon, on relie des
// points au crayon, on suit un couloir du doigt puis on trace. Ces
// exercices-là existaient sur papier bien avant l'écran ; c'est l'écran qui
// était en trop.
//
// Aucun de ces trois modules ne calcule quoi que ce soit : les tirages
// viennent des noyaux du jeu — core/compteEstBon.js, core/pointAPoint.js,
// core/dedale.js — pour que la feuille et l'écran ne disent jamais deux choses
// différentes.

import { makeItem } from '../items.js';
import { tirerPartie } from '../compteEstBon.js';
import { tirerPointAPoint, NOMS_DESSINS, NOMS_FAMILLES } from '../pointAPoint.js';

const SIGNE = { '+': '+', '-': '−', '*': '×', '/': '÷', '×': '×', '÷': '÷' };

// --- LE COMPTE EST BON ------------------------------------------------------

export const compteFicheGenerator = {
    id: 'calc.compte-fiche',
    label: 'Le compte est bon (fiche)',
    answerKinds: ['numeric'],
    skills: ['calc.mixte'],
    params: [
        {
            id: 'operations', type: 'select', label: 'Étapes de la solution', default: 3,
            aide: 'C\'est la longueur de la solution qui existe — l\'élève peut en '
                + 'trouver une autre, plus courte ou plus longue.',
            options: [
                { value: 2, label: '2 opérations' }, { value: 3, label: '3 opérations' },
                { value: 4, label: '4 opérations' }, { value: 5, label: '5 opérations' }
            ]
        },
        {
            id: 'grands', type: 'select', label: 'Grandes plaques', default: 1,
            aide: '25, 50, 75 et 100 : ce sont leurs multiples qui font approcher le but.',
            options: [{ value: 0, label: 'Aucune' }, { value: 1, label: 'Une' }, { value: 2, label: 'Deux' }]
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        params = params || {};
        const p = tirerPartie({
            rng,
            operations: Math.max(2, Math.min(5, Number(params.operations) || 3)),
            grands: Math.max(0, Math.min(2, Number(params.grands) ?? 1))
        });
        const etapes = (p.solution || []).map(e =>
            `${e.a} ${SIGNE[e.op] || e.op} ${e.b} = ${e.resultat}`);

        return makeItem({
            seed: rng.seed,
            generatorId: 'calc.compte-fiche',
            skillId: 'calc.mixte',
            answerKind: 'numeric',
            prompt: {
                text: `Atteins ${p.but} avec ${p.plaques.join(', ')}`,
                papier: `Le compte : ${p.but}`,
                html: `<div class="game-question">Atteins <b>${p.but}</b></div>`
            },
            answer: p.but,
            explanation: etapes.join(' ; '),
            explicationPapier: etapes.join(' ; '),
            difficulty: Math.min(5, p.operations),
            meta: {
                but: p.but, plaques: p.plaques, etapes,
                // Autant de lignes vides que la solution a d'étapes, plus une :
                // une solution plus longue est parfaitement recevable, et une
                // feuille qui n'en laisse pas la place dit le contraire.
                lignes: Math.max(3, etapes.length + 1),
                theme: `${p.but}|${p.plaques.join(',')}`
            }
        });
    }
};

// --- LE POINT À POINT -------------------------------------------------------

export const pointAPointFicheGenerator = {
    id: 'calc.point-a-point-fiche',
    label: 'Le point à point (fiche)',
    answerKinds: ['numeric'],
    skills: ['calc.mixte'],
    params: [
        {
            id: 'dessin', type: 'select', label: 'Image cachée', default: '',
            aide: 'Laisse « au hasard » : la surprise fait partie de l\'exercice.',
            options: [{ value: '', label: 'Au hasard' },
                ...NOMS_DESSINS.map(d => ({ value: d, label: d }))]
        },
        {
            id: 'famille', type: 'select', label: 'Calculs', default: 'melange',
            options: NOMS_FAMILLES.map(f => ({ value: f, label: f }))
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        params = params || {};
        const dessin = NOMS_DESSINS.includes(params.dessin)
            ? params.dessin : rng.pick(NOMS_DESSINS);
        const e = tirerPointAPoint({
            rng, dessin,
            famille: NOMS_FAMILLES.includes(params.famille) ? params.famille : 'melange'
        });

        return makeItem({
            seed: rng.seed,
            generatorId: 'calc.point-a-point-fiche',
            skillId: 'calc.mixte',
            answerKind: 'numeric',
            prompt: {
                text: 'Relie les points dans l\'ordre des résultats',
                papier: 'Relie les points dans l\'ordre',
                html: '<div class="game-question">Relie les points dans l\'ordre</div>'
            },
            answer: e.total,
            explanation: `Le dessin caché : ${e.nom}.`,
            explicationPapier: `Le dessin caché : ${e.nom}.`,
            difficulty: 2,
            meta: {
                nom: e.nom, ferme: e.ferme, total: e.total,
                points: e.points.map(p => ({ x: p.x, y: p.y, ordre: p.ordre, texte: p.texte })),
                segments: e.segments,
                theme: e.dessin
            }
        });
    }
};
