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
import { creerDedale, NOMS_FORMES, ouvert, cle } from '../dedale.js';
import { EGYPTE } from './numeration.js';

const SIGNE = { '+': '+', '-': '−', '*': '×', '/': '÷', '×': '×', '÷': '÷' };

// --- LE COMPTE EST BON ------------------------------------------------------

export const compteFicheGenerator = {
    id: 'calc.compte-fiche',
    label: 'Le compte est bon (fiche)',
    answerKinds: ['numeric'],
    // `calc.mixte` n'existe pas. Ces fiches mélangent les quatre opérations :
    // on les déclare toutes les quatre, ce qui est aussi ce qu'elles font.
    skills: ['num.add.entiers', 'num.sub.entiers', 'num.mult.sens', 'num.div.quotient'],
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
            // Un item mélange les quatre opérations : aucune compétence unique
            // ne le décrit. On note la plus élémentaire — elle est prérequis des
            // trois autres — et c'est le générateur qui les déclare toutes.
            skillId: 'num.add.entiers',
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
    // `calc.mixte` n'existe pas. Ces fiches mélangent les quatre opérations :
    // on les déclare toutes les quatre, ce qui est aussi ce qu'elles font.
    skills: ['num.add.entiers', 'num.sub.entiers', 'num.mult.sens', 'num.div.quotient'],
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
            // Un item mélange les quatre opérations : aucune compétence unique
            // ne le décrit. On note la plus élémentaire — elle est prérequis des
            // trois autres — et c'est le générateur qui les déclare toutes.
            skillId: 'num.add.entiers',
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

// --- LE DÉDALE --------------------------------------------------------------

export const dedaleFicheGenerator = {
    id: 'geo.dedale-fiche',
    label: 'Le dédale (fiche)',
    answerKinds: ['numeric'],
    skills: ['geo.espace.deplacement'],
    params: [
        {
            id: 'forme', type: 'select', label: 'Forme du dédale', default: 'rond',
            options: NOMS_FORMES.map(f => ({ value: f, label: f }))
        },
        {
            id: 'taille', type: 'select', label: 'Taille', default: 15,
            aide: 'Sur une feuille, au-delà de vingt et une cases les couloirs '
                + 'deviennent trop fins pour y passer un crayon.',
            options: [
                { value: 11, label: '11 × 11 — court' },
                { value: 15, label: '15 × 15' },
                { value: 21, label: '21 × 21 — long' }
            ]
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        params = params || {};
        const n = Math.max(11, Math.min(21, Number(params.taille) || 15));
        const d = creerDedale({
            rng,
            forme: NOMS_FORMES.includes(params.forme) ? params.forme : 'rond',
            cols: n, lignes: n
        });

        // LES MURS, CALCULÉS UNE FOIS ICI. Le rendu ne doit pas rejouer
        // l'algorithme : deux dessins du même dédale qui ne s'accorderaient
        // pas, c'est un labyrinthe sans solution sur la photocopie.
        const murs = [];
        for (const k of d.dans) {
            const [x, y] = k.split(',').map(Number);
            // Le mur de DROITE et celui du BAS suffisent : celui de gauche est
            // le mur de droite du voisin.
            for (const [dx, dy] of [[1, 0], [0, 1]]) {
                const v = [x + dx, y + dy];
                const dedans = d.dans.has(cle(v[0], v[1]));
                if (!dedans || !ouvert(d, [x, y], v)) murs.push([x, y, dx, dy]);
            }
            // Et les bords : à gauche et en haut, si le voisin est hors forme.
            for (const [dx, dy] of [[-1, 0], [0, -1]]) {
                if (!d.dans.has(cle(x + dx, y + dy))) murs.push([x, y, dx, dy]);
            }
        }

        return makeItem({
            seed: rng.seed,
            generatorId: 'geo.dedale-fiche',
            skillId: 'geo.espace.deplacement',
            answerKind: 'numeric',
            prompt: {
                text: 'Va du rond au carré sans traverser de mur',
                papier: 'Va du rond au carré',
                html: '<div class="game-question">Va du rond au carré</div>'
            },
            answer: d.solution.length,
            explanation: `Le chemin fait ${d.solution.length} cases.`,
            explicationPapier: `Le chemin fait ${d.solution.length} cases.`,
            difficulty: n >= 21 ? 4 : 2,
            meta: {
                cols: d.cols, lignes: d.lignes, forme: d.forme,
                cases: [...d.dans].map(k => k.split(',').map(Number)),
                murs,
                depart: d.depart, arrivee: d.arrivee,
                solution: d.solution,
                theme: `${d.forme}-${d.depart.join(',')}-${d.arrivee.join(',')}`
            }
        });
    }
};

// --- LES NOMBRES DES PHARAONS -----------------------------------------------

export const egypteFicheGenerator = {
    id: 'num.egypte-fiche',
    label: 'Les nombres des pharaons (fiche)',
    answerKinds: ['numeric'],
    skills: ['num.numeration.egypte'],
    params: [
        {
            id: 'max', type: 'select', label: 'Jusqu\'à', default: 10000,
            options: [
                { value: 1000, label: '1 000' }, { value: 10000, label: '10 000' },
                { value: 100000, label: '100 000' }, { value: 1000000, label: '1 000 000' }
            ]
        },
        {
            id: 'sens', type: 'select', label: 'Dans quel sens', default: 'lire',
            aide: 'Lire, c\'est additionner les symboles ; écrire, c\'est les choisir — '
                + 'et c\'est là qu\'on comprend que la position ne compte pas.',
            options: [
                { value: 'lire', label: 'Lire : les glyphes sont donnés' },
                { value: 'ecrire', label: 'Écrire : le nombre est donné' }
            ]
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        params = params || {};
        const max = Number(params.max) || 10000;
        const sens = params.sens === 'ecrire' ? 'ecrire' : 'lire';
        const dispo = EGYPTE.filter(s => s.value <= max);

        // Deux ou trois rangs, peu de symboles par rang : un nombre égyptien
        // se lit en comptant, il ne doit pas devenir un dénombrement.
        const choisis = rng.shuffle(dispo).slice(0, rng.int(2, 3));
        const compte = choisis.map(s => ({ value: s.value, nom: s.nom, n: rng.int(1, 4) }))
            .sort((a, b) => b.value - a.value);
        const total = compte.reduce((s, c) => s + c.value * c.n, 0);
        const detail = compte.map(c => `${c.n} × ${c.value}`).join(' + ');

        return makeItem({
            seed: rng.seed,
            generatorId: 'num.egypte-fiche',
            skillId: 'num.numeration.egypte',
            answerKind: 'numeric',
            prompt: {
                text: sens === 'lire' ? 'Quel nombre est écrit ici ?' : `Écris ${total} en hiéroglyphes`,
                papier: sens === 'lire' ? 'Quel nombre ?' : `${total}`,
                html: `<div class="game-question">${sens === 'lire'
                    ? 'Quel nombre est écrit ici ?' : `Écris ${total} en hiéroglyphes`}</div>`
            },
            answer: total,
            explanation: `${detail} = ${total}.`,
            explicationPapier: `${detail} = ${total}.`,
            difficulty: 3,
            meta: { total, symboles: compte, sens, detail, theme: String(total) }
        });
    }
};
