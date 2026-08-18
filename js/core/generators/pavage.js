// LE PAVAGE : QUELLE PIÈCE EST L'IMAGE DE QUELLE AUTRE, ET PAR QUOI ?
//
// C'est l'exercice ⑨ de la fiche de 4ᵉ de Rémy — le damier —, généralisé à
// n'importe quel pavage : « la pièce D est l'image de la pièce B par quelle
// transformation ? » Rémy : « reconnaître quelle pièce par quelle
// transformation dans un pavage ».
//
// L'EXERCICE INVERSE DE « TRACER L'IMAGE », ET C'EST TOUT SON INTÉRÊT. Tracer,
// c'est appliquer une règle qu'on vous donne ; reconnaître, c'est la retrouver
// — et cela demande de savoir ce que chaque transformation FAIT, pas seulement
// comment elle se calcule. Un élève peut tracer une symétrie centrale sans
// jamais avoir vu qu'elle retourne la figure dans les deux sens à la fois.
//
// UNE SEULE RÉPONSE, TOUJOURS. C'est la difficulté du sujet, et elle est
// mathématique, pas informatique : deux carrés voisins sont l'image l'un de
// l'autre par une translation ET par une symétrie ; une pièce qui a elle-même
// un axe de symétrie brouille tout. Une question à deux réponses justes en
// compterait une fausse, et l'élève aurait raison contre la machine. Le noyau
// sait énumérer TOUTES les transformations qui mènent d'une pièce à l'autre
// (`genresEntre`) : on n'accepte une paire que s'il n'en trouve qu'une seule.
//
// Ce filtre est la SEULE garantie, et il suffit : on n'a pas besoin d'écarter
// les motifs symétriques par précaution. Un motif qui a un axe ou un centre de
// symétrie donne simplement moins de paires utilisables — le tri les écarte
// une à une, sans qu'on ait à deviner d'avance lesquelles.

import { makeItem, finalizeChoices } from '../items.js';
import {
    GESTES, NOMS, decrire, genresEntre, imageFigure, memeFigure,
    transfosEntre
} from '../transformations.js';
import { quadrillageSvg } from '../quadrillageSvg.js';
import { figure } from '../figures.js';

/** Les lettres des pièces : on saute le I et le O, qui se lisent 1 et 0. */
const LETTRES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

const TAILLES = {
    petit: { l: 8, h: 8, cases: 3, pieces: 4 },
    moyen: { l: 10, h: 10, cases: 4, pieces: 5 },
    grand: { l: 12, h: 12, cases: 4, pieces: 6 }
};

// --- Le motif -----------------------------------------------------------------

/**
 * Les motifs de départ : des formes anguleuses, celles des pavages de fiches.
 *
 * Trois d'entre elles ont une symétrie propre — le coin a un axe oblique, le S
 * et l'escalier ont un centre —, et c'est sans conséquence : une pièce
 * symétrique se correspond à elle-même par plusieurs transformations, donc les
 * paires qu'elle formerait sont ambiguës, et `pairesSures` les écarte. On perd
 * quelques paires, jamais la justesse.
 */
export const MOTIFS = [
    [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],                    // le coin
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }],    // le S
    [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 }],    // le L
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 1 }],    // le J couché
    [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 2 }]     // l'escalier
];

/** Un motif a-t-il un axe ou un centre de symétrie ? */
export function estSymetrique(motif) {
    // On se compare à soi-même : si une transformation autre que l'identité
    // laisse la figure en place, elle est symétrique.
    return transfosEntre(motif, motif, { quarts: true })
        .some(t => !(t.genre === 'translation' && !t.vecteur.x && !t.vecteur.y));
}

const cle = (p) => `${p.x}|${p.y}`;

const decale = (f, dx, dy) => f.map(p => ({ x: p.x + dx, y: p.y + dy }));

const dansLaGrille = (f, l, h) =>
    f.every(p => Number.isInteger(p.x) && Number.isInteger(p.y)
        && p.x >= 0 && p.x < l && p.y >= 0 && p.y < h);

// --- Poser les pièces ---------------------------------------------------------

/**
 * Les transformations dont on se sert pour ENGENDRER le pavage.
 *
 * Elles ne sont pas la réponse : ce qui relie deux pièces quelconques du
 * pavage est recalculé après coup par le noyau, et vaut souvent tout autre
 * chose que ce qui a servi à les poser. On veut seulement de la variété.
 */
function transfoDeGeneration(rng, l, h) {
    const genre = rng.pick(['axiale', 'axiale', 'centrale', 'translation', 'rotation']);
    if (genre === 'axiale') {
        const type = rng.pick(['v', 'h']);
        return { genre, axe: { type, a: rng.int(0, (type === 'v' ? l : h) - 1) + rng.pick([0, 0.5]) } };
    }
    if (genre === 'centrale') {
        return { genre, centre: { x: rng.int(0, l - 1) + rng.pick([0, 0.5]), y: rng.int(0, h - 1) + rng.pick([0, 0.5]) } };
    }
    if (genre === 'translation') {
        return { genre, vecteur: { x: rng.int(-4, 4), y: rng.int(-4, 4) } };
    }
    return { genre, centre: { x: rng.int(0, l - 1), y: rng.int(0, h - 1) }, quarts: rng.pick([1, 3]) };
}

/**
 * Un pavage : des pièces toutes superposables, aucune ne chevauchant l'autre.
 * Rend `null` si ce tirage-là n'aboutit pas — l'appelant retente.
 */
export function poserLePavage(rng, { l, h, cases, pieces }) {
    const motif = rng.pick(MOTIFS.filter(m => m.length === cases || cases === 0));
    if (!motif) return null;

    const base = decale(motif, rng.int(1, l - 4), rng.int(1, h - 4));
    if (!dansLaGrille(base, l, h)) return null;

    const posees = [base];
    const prises = new Set(base.map(cle));

    let garde = 0;
    while (posees.length < pieces && garde++ < 300) {
        const source = rng.pick(posees);
        const t = transfoDeGeneration(rng, l, h);
        const img = imageFigure(source, t);
        if (!dansLaGrille(img, l, h)) continue;
        if (img.some(p => prises.has(cle(p)))) continue;
        // Une pièce identique à une pièce déjà posée n'apporte rien, et deux
        // pièces au même endroit sont impossibles à désigner.
        if (posees.some(q => memeFigure(q, img))) continue;
        img.forEach(p => prises.add(cle(p)));
        posees.push(img);
    }
    return posees.length >= pieces ? posees : null;
}

/**
 * Les paires du pavage qui n'ont QU'UNE SEULE réponse.
 *
 * @returns {Array<{de: number, vers: number, genre: string, transfo: Object}>}
 */
export function pairesSures(pieces, genresVoulus) {
    const out = [];
    for (let i = 0; i < pieces.length; i++) {
        for (let j = 0; j < pieces.length; j++) {
            if (i === j) continue;
            const genres = genresEntre(pieces[i], pieces[j]);
            // EXACTEMENT UN GENRE. Zéro : les deux pièces ne se correspondent
            // par rien de ce qu'on enseigne. Deux ou plus : la question aurait
            // plusieurs bonnes réponses, et la correction en refuserait une.
            if (genres.length !== 1) continue;
            if (genresVoulus && !genresVoulus.includes(genres[0])) continue;
            const transfo = transfosEntre(pieces[i], pieces[j])[0];
            out.push({ de: i, vers: j, genre: genres[0], transfo });
        }
    }
    return out;
}

// --- Les mots -----------------------------------------------------------------

/** Pourquoi ce n'est PAS celle-là — l'erreur que chaque proposition dénonce. */
const POURQUOI = {
    axiale: 'La symétrie axiale RETOURNE la figure, comme dans un miroir : '
        + 'un détail qui était à gauche se retrouve à droite.',
    centrale: 'La symétrie centrale est un DEMI-TOUR : la figure se retrouve à '
        + 'l\'envers dans les deux sens à la fois, mais elle n\'est pas retournée.',
    translation: 'La translation fait GLISSER sans rien tourner ni retourner : '
        + 'la figure garde exactement son allure.',
    rotation: 'La rotation d\'un quart de tour fait BASCULER la figure : '
        + 'ce qui était couché se met debout.'
};

/** La méthode, en trois questions — c'est elle qu'on veut voir passer. */
function indices(genre) {
    return [
        'Regarde d\'abord si la figure a été RETOURNÉE, comme dans un miroir. '
        + 'Si oui, c\'est une symétrie axiale : c\'est la seule des quatre qui retourne.',
        'Si elle n\'est pas retournée, est-elle restée DROITE, dans la même position ? '
        + 'Alors elle a seulement glissé : c\'est une translation.',
        genre === 'centrale'
            ? 'Sinon elle a tourné. D\'un demi-tour : c\'est une symétrie centrale.'
            : 'Sinon elle a tourné. D\'un quart de tour seulement : c\'est une rotation.'
    ];
}

// --- Le générateur ------------------------------------------------------------

export const pavageGenerator = {
    id: 'geo.transfo.pavage',
    label: 'Reconnaître la transformation dans un pavage',
    skills: ['geo.transfo.reconnaitre'],
    answerKinds: ['choice'],
    params: [
        {
            id: 'genres', type: 'multiselect', label: 'Transformations attendues',
            default: ['axiale', 'centrale', 'translation', 'rotation'],
            options: Object.keys(NOMS).map(g => ({ value: g, label: NOMS[g] }))
        },
        {
            id: 'taille', type: 'select', label: 'Le pavage', default: 'moyen',
            options: [
                { value: 'petit', label: '8 × 8 — quatre pièces' },
                { value: 'moyen', label: '10 × 10 — cinq pièces' },
                { value: 'grand', label: '12 × 12 — six pièces' }
            ]
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        // Même prudence qu'au quadrillage : un réglage peut arriver sous forme
        // de chaîne, et un générateur ne doit pas disparaître pour une virgule.
        const brut = Array.isArray(p.genres) ? p.genres
            : (typeof p.genres === 'string' ? p.genres.split(',') : []);
        const voulus = brut.map(g => String(g).trim()).filter(g => NOMS[g]);
        const t = TAILLES[p.taille] || TAILLES.moyen;

        let pieces = null, paire = null;
        for (let i = 0; i < 80 && !paire; i++) {
            pieces = poserLePavage(rng, t);
            if (!pieces) continue;
            const sures = pairesSures(pieces, voulus.length ? voulus : null);
            if (sures.length) paire = rng.pick(sures);
        }
        // Faute de trouver une paire du genre demandé, on en accepte une de
        // n'importe quel genre : mieux vaut une question hors réglage qu'un
        // écran vide devant un élève.
        for (let i = 0; i < 60 && !paire; i++) {
            pieces = poserLePavage(rng, t);
            if (!pieces) continue;
            const sures = pairesSures(pieces, null);
            if (sures.length) paire = rng.pick(sures);
        }
        if (!paire) return secours(rng);

        const noms = pieces.map((_, i) => LETTRES[i]);
        const svg = quadrillageSvg({
            largeur: t.l, hauteur: t.h,
            figures: pieces.map((cases, i) => ({
                cases, etiquette: noms[i],
                classe: `qd-piece qd-piece-${i % 6}`
                    + (i === paire.de ? ' qd-piece--source' : '')
                    + (i === paire.vers ? ' qd-piece--cible' : '')
            }))
        });

        const question = `Par quelle transformation la pièce ${noms[paire.vers]} `
            + `est-elle l'image de la pièce ${noms[paire.de]} ?`;

        const choix = finalizeChoices(rng, Object.keys(NOMS).map(g => ({
            value: NOMS[g],
            correct: g === paire.genre,
            why: g === paire.genre ? undefined : POURQUOI[g]
        })), { count: 4 });

        return makeItem({
            seed: rng.seed,
            generatorId: 'geo.transfo.pavage',
            skillId: 'geo.transfo.reconnaitre',
            answerKind: 'choice',
            prompt: {
                text: question,
                html: `<div class="game-question">${question}</div>${figure(svg)}`,
                papier: question
            },
            answer: NOMS[paire.genre],
            choices: choix,
            hints: indices(paire.genre),
            // « une », et non « la » : les quatre noms sont féminins, et
            // « C'est rotation » ne se dit pas.
            explanation: `C'est une ${NOMS[paire.genre]} — ${GESTES[paire.genre]}. `
                + `Précisément : ${decrire(paire.transfo)}.`,
            // Sur la feuille, l'élève n'a pas les propositions sous les yeux :
            // la correction doit se suffire à elle-même.
            explicationPapier: `${noms[paire.vers]} est l'image de ${noms[paire.de]} par `
                + `${decrire(paire.transfo)}.`,
            difficulty: paire.genre === 'rotation' ? 4 : (paire.genre === 'centrale' ? 3 : 2),
            meta: {
                largeur: t.l, hauteur: t.h,
                pieces, noms, de: paire.de, vers: paire.vers,
                genre: paire.genre, transfo: paire.transfo
            }
        });
    }
};

/**
 * Le dernier recours : un pavage écrit à la main, dont on sait qu'il tient.
 * Un item vide bloquerait l'élève ; celui-ci est modeste mais juste.
 */
function secours(rng) {
    const motif = [{ x: 1, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 2 }];
    const t = { genre: 'translation', vecteur: { x: 4, y: 0 } };
    const pieces = [motif, imageFigure(motif, t)];
    const noms = ['A', 'B'];
    const svg = quadrillageSvg({
        largeur: 8, hauteur: 8,
        figures: pieces.map((cases, i) => ({ cases, etiquette: noms[i], classe: `qd-piece qd-piece-${i}` }))
    });
    const question = 'Par quelle transformation la pièce B est-elle l\'image de la pièce A ?';
    return makeItem({
        seed: rng.seed,
        generatorId: 'geo.transfo.pavage',
        skillId: 'geo.transfo.reconnaitre',
        answerKind: 'choice',
        prompt: { text: question, html: `<div class="game-question">${question}</div>${figure(svg)}`, papier: question },
        answer: NOMS.translation,
        choices: finalizeChoices(rng, Object.keys(NOMS).map(g => ({
            value: NOMS[g], correct: g === 'translation',
            why: g === 'translation' ? undefined : POURQUOI[g]
        })), { count: 4 }),
        hints: indices('translation'),
        explanation: `C'est une ${NOMS.translation} — ${GESTES.translation}. Précisément : ${decrire(t)}.`,
        difficulty: 2,
        meta: { largeur: 8, hauteur: 8, pieces, noms, de: 0, vers: 1, genre: 'translation', transfo: t }
    });
}


