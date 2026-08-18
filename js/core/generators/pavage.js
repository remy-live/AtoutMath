// LE PAVAGE : PAR RAPPORT À QUOI CES DEUX PIÈCES SONT-ELLES SYMÉTRIQUES ?
//
// Rémy, après une première version qui demandait le GENRE de transformation :
// « je préférerais comme mon exercice avec des points, et on demande c'est
// symétrique par rapport à quoi ». Il a raison, et l'écart entre les deux
// questions est tout l'exercice.
//
// NOMMER LA FAMILLE NE DEMANDE QUE DE RECONNAÎTRE UNE ALLURE. « C'est une
// symétrie axiale » se devine au coup d'œil : la figure est retournée, donc
// c'est un miroir. On n'a rien cherché.
//
// TROUVER L'ÉLÉMENT DEMANDE DE LE CHERCHER. Quelle droite, exactement ? Il faut
// avoir compris qu'elle passe au MILIEU de chaque paire de points
// correspondants, et qu'elle leur est perpendiculaire — c'est la définition, et
// c'est elle qu'on travaille. Pour un centre, même chose : il est le milieu du
// segment qui joint un point et son image.
//
// C'EST POURQUOI PLUSIEURS CANDIDATS SONT TRACÉS, tous de la même façon. Si le
// bon se distinguait par sa couleur ou son épaisseur, il n'y aurait plus rien à
// chercher ; s'il était seul, la réponse serait donnée avec la question. Ils ne
// diffèrent que par leur nom — (d₁), (d₂), O₁ — et l'un d'eux seulement
// transforme la première pièce en la seconde.
//
// LES CANDIDATS TOMBENT SUR LES LIGNES ET LES NŒUDS DU QUADRILLAGE, jamais au
// milieu d'une case. Ce n'est pas cosmétique : c'est ce qui fait que leurs
// coordonnées sont des ENTIERS — « x = 4 », « (4 ; 7) » — au lieu de « x = 3,5 ».
// On aurait sinon ajouté à l'exercice une difficulté de lecture décimale qui
// n'a rien à voir avec la symétrie.
//
// PAS D'AXE OBLIQUE. Son équation n'a pas le même statut au collège que x = 4,
// et l'élève de cinquième qui découvre la symétrie centrale n'a pas à trancher
// entre les deux. L'oblique reste dans « Tracer l'image », où il se règle.

import { makeItem, finalizeChoices } from '../items.js';
import { imageFigure, memeFigure, parAxe, parCentre } from '../transformations.js';
import { quadrillageSvg } from '../quadrillageSvg.js';
import {
    cleElement, ecrireElement, memeElement, nommerCandidat
} from '../elementSymetrie.js';
import { figure } from '../figures.js';

/** Les lettres des pièces : on saute le I et le O, qui se lisent 1 et 0. */
const LETTRES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

const TAILLES = {
    petit: { l: 8, h: 8, cases: 3, pieces: 3, candidats: 3 },
    moyen: { l: 10, h: 10, cases: 4, pieces: 4, candidats: 4 },
    grand: { l: 12, h: 12, cases: 4, pieces: 5, candidats: 5 }
};

/** Les motifs de départ : les formes anguleuses des pavages de fiches. */
export const MOTIFS = [
    [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
    [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 }],
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 1 }],
    [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 2 }]
];

const cle = (p) => `${p.x}|${p.y}`;
const decale = (f, dx, dy) => f.map(p => ({ x: p.x + dx, y: p.y + dy }));

const dansLaGrille = (f, l, h) =>
    f.every(p => Number.isInteger(p.x) && Number.isInteger(p.y)
        && p.x >= 0 && p.x < l && p.y >= 0 && p.y < h);

// --- Les éléments de symétrie -------------------------------------------------

/** Applique un élément à une figure : c'est ce qu'on demande de reconnaître. */
export function parElement(f, el) {
    if (!el) return f;
    return el.genre === 'axe'
        ? f.map(p => parAxe(p, el.axe))
        : f.map(p => parCentre(p, el.centre));
}

/**
 * Tous les éléments possibles d'un quadrillage, posés sur les lignes et les
 * nœuds. L'ensemble est modeste — quelques dizaines —, donc on l'ÉNUMÈRE au
 * lieu de tirer au hasard et d'espérer : c'est ce qui permet d'affirmer qu'un
 * élément est le seul possible, et non seulement qu'on n'en a pas trouvé
 * d'autre.
 */
export function tousLesElements(l, h) {
    const out = [];
    for (let a = 0.5; a < l - 1; a += 1) out.push({ genre: 'axe', axe: { type: 'v', a } });
    for (let a = 0.5; a < h - 1; a += 1) out.push({ genre: 'axe', axe: { type: 'h', a } });
    for (let x = 0.5; x < l - 1; x += 1) {
        for (let y = 0.5; y < h - 1; y += 1) out.push({ genre: 'point', centre: { x, y } });
    }
    return out;
}

/**
 * L'élément qui envoie `a` sur `b`, s'il en existe UN SEUL.
 *
 * Rend `null` dès qu'il y en a deux : la question aurait alors deux bonnes
 * réponses, et la correction en refuserait une. C'est exactement ce qui arrive
 * avec une pièce symétrique — un carré, un T —, et c'est pour cela qu'on
 * vérifie au lieu de faire confiance à la façon dont le pavage a été construit.
 */
export function elementUnique(a, b, l, h) {
    const trouves = tousLesElements(l, h).filter(el => memeFigure(parElement(a, el), b));
    return trouves.length === 1 ? trouves[0] : null;
}

// --- Poser les pièces ---------------------------------------------------------

/**
 * Un pavage : des pièces toutes superposables, aucune ne chevauchant l'autre,
 * engendrées par des symétries — ce sont elles qu'on demandera de retrouver.
 */
export function poserLePavage(rng, { l, h, cases, pieces }) {
    const motif = rng.pick(MOTIFS.filter(m => m.length === cases));
    if (!motif) return null;

    const base = decale(motif, rng.int(1, l - 4), rng.int(1, h - 4));
    if (!dansLaGrille(base, l, h)) return null;

    const posees = [base];
    const prises = new Set(base.map(cle));
    // L'ESPÈCE SE TIRE AVANT L'ÉLÉMENT. Un quadrillage porte l × h centres
    // possibles contre l + h axes : tirer uniformément dans le tas engendrait
    // des pavages presque uniquement centrés, et deux questions sur trois
    // portaient sur un centre. Or l'axe s'apprend en premier — il ne peut pas
    // être le cas rare.
    const parEspece = ['axe', 'point'].map(g => tousLesElements(l, h).filter(el => el.genre === g));

    let garde = 0;
    while (posees.length < pieces && garde++ < 300) {
        const source = rng.pick(posees);
        const img = parElement(source, rng.pick(rng.pick(parEspece)));
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
 * Les leurres : des éléments qui NE conviennent pas, mais qui ont l'air d'y
 * prétendre.
 *
 * On les prend dans le voisinage du bon — une ligne plus loin, un nœud à côté —
 * parce qu'un axe posé à l'autre bout du quadrillage s'élimine sans réfléchir.
 * Un bon leurre est celui qui oblige à VÉRIFIER.
 *
 * ET AU MOINS UN DE L'AUTRE ESPÈCE : si tous les candidats étaient des droites,
 * la question « axe ou centre ? » ne se poserait plus — or c'est la première
 * chose à trancher, et celle qui distingue la symétrie axiale de la centrale.
 */
export function leurres(rng, bon, pieces, de, vers, { l, h }, combien) {
    const disponibles = tousLesElements(l, h)
        .filter(el => !memeElement(el, bon))
        // Un leurre qui marcherait aussi serait une seconde bonne réponse.
        .filter(el => !memeFigure(parElement(pieces[de], el), pieces[vers]));

    const pointDe = (el) => (el.genre === 'axe'
        ? { x: el.axe.type === 'v' ? el.axe.a : l / 2, y: el.axe.type === 'h' ? el.axe.a : h / 2 }
        : el.centre);
    const ref = pointDe(bon);
    const loin = (el) => {
        const p = pointDe(el);
        return Math.abs(p.x - ref.x) + Math.abs(p.y - ref.y);
    };

    // DEUX CANDIDATS NE DOIVENT PAS SE TOUCHER. Pris seulement « au plus près
    // du bon », trois centres tombaient dans le même carreau : les trois croix
    // se chevauchaient et leurs noms formaient un nœud illisible. On ne
    // demandait plus de chercher un point, mais de démêler un dessin.
    const separes = (a, b) => distanceEntre(a, b, l, h) >= ECART_MINIMAL;

    const proches = (liste) => rng.shuffle(liste.sort((x, y) => loin(x) - loin(y)).slice(0, 14));
    const autreEspece = proches(disponibles.filter(el => el.genre !== bon.genre));
    const memeEspece = proches(disponibles.filter(el => el.genre === bon.genre));

    const choisis = [];
    const tenter = (liste, max) => {
        for (const el of liste) {
            if (choisis.length >= max) break;
            if (choisis.some(c => memeElement(c, el))) continue;
            if (![bon, ...choisis].every(c => separes(c, el))) continue;
            choisis.push(el);
        }
    };
    // AU MOINS UN DE L'AUTRE ESPÈCE, puis on complète.
    tenter(autreEspece, 1);
    tenter(memeEspece, combien);
    tenter(autreEspece, combien);
    // En dernier ressort, on relâche l'écart plutôt que de rendre moins de
    // candidats que promis : une question à deux propositions reste une
    // question, un dessin illisible n'en est plus une — mais mieux vaut les
    // deux que rien.
    for (const el of [...memeEspece, ...autreEspece]) {
        if (choisis.length >= combien) break;
        if (!choisis.some(c => memeElement(c, el))) choisis.push(el);
    }
    return choisis.slice(0, combien);
}

/** L'écart minimal entre deux candidats, en carreaux. */
export const ECART_MINIMAL = 1.5;

/**
 * À quelle distance deux éléments se dessinent-ils l'un de l'autre ?
 *
 * Deux droites perpendiculaires se croisent : elles ne se confondent jamais,
 * quel que soit l'endroit. Deux parallèles se jugent sur l'écart de leurs
 * équations, un point et une droite sur la distance du point à la droite, et
 * deux points sur la distance qui les sépare.
 */
export function distanceEntre(a, b, l, h) {
    if (a.genre === 'axe' && b.genre === 'axe') {
        return a.axe.type === b.axe.type ? Math.abs(a.axe.a - b.axe.a) : Infinity;
    }
    if (a.genre === 'point' && b.genre === 'point') {
        return Math.hypot(a.centre.x - b.centre.x, a.centre.y - b.centre.y);
    }
    const [pt, dr] = a.genre === 'point' ? [a, b] : [b, a];
    void l; void h;
    return dr.axe.type === 'v'
        ? Math.abs(pt.centre.x - dr.axe.a)
        : Math.abs(pt.centre.y - dr.axe.a);
}

// --- Les mots -----------------------------------------------------------------

/** Ce qu'un mauvais candidat enseigne, quand on le choisit. */
function pourquoiPas(el, bon) {
    if (el.genre !== bon.genre) {
        return bon.genre === 'axe'
            ? 'Ce n\'est pas un point : la figure a été RETOURNÉE, comme dans un miroir. '
            + 'Cherche une droite — elle passe au milieu de chaque paire de points correspondants.'
            : 'Ce n\'est pas une droite : la figure n\'est pas retournée, elle a fait un DEMI-TOUR. '
            + 'Cherche un point — il est le milieu du segment qui joint un point et son image.';
    }
    return el.genre === 'axe'
        ? 'Bonne idée, mauvaise droite. Prends UN point et son image : la droite cherchée passe '
        + 'exactement au milieu des deux. Vérifie ensuite sur un second point.'
        : 'Bon type d\'élément, mauvais point. Le centre est le MILIEU du segment qui joint un '
        + 'point à son image : vérifie-le sur deux points, pas sur un seul.';
}

/** La méthode, pas la réponse — sauf au dernier indice, qui la donne. */
function indices(bon, hauteur) {
    return [
        'Repère d\'abord si la figure a été RETOURNÉE, comme dans un miroir. '
        + 'Si oui, cherche une droite ; sinon, cherche un point.',
        'Prends UN point de la première pièce et le point qui lui correspond dans la seconde. '
        + 'Ce que tu cherches est au MILIEU de ces deux-là.',
        bon.genre === 'axe'
            ? 'La droite passe au milieu des deux points ET leur est perpendiculaire. '
            + `Ici, c'est ${ecrireElement(hauteur, bon)}.`
            : `Le centre est le milieu du segment. Ici, c'est le point ${ecrireElement(hauteur, bon)}.`
    ];
}

// --- Le générateur ------------------------------------------------------------

export const pavageGenerator = {
    id: 'geo.transfo.pavage',
    label: 'Par rapport à quoi ces pièces sont-elles symétriques ?',
    skills: ['geo.transfo.reconnaitre'],
    // 'element' : la réponse est une DROITE ou un POINT du quadrillage. Ni un
    // nombre ni un mot — d'où une activité qui sait le faire choisir, cliquer
    // ou écrire, les trois façons de désigner la même chose.
    answerKinds: ['element'],
    params: [
        {
            id: 'especes', type: 'multiselect', label: 'Ce qu\'on cherche',
            default: ['axe', 'point'],
            options: [
                { value: 'axe', label: 'des axes de symétrie' },
                { value: 'point', label: 'des centres de symétrie' }
            ]
        },
        {
            id: 'taille', type: 'select', label: 'Le pavage', default: 'moyen',
            options: [
                { value: 'petit', label: '8 × 8 — trois pièces, trois candidats' },
                { value: 'moyen', label: '10 × 10 — quatre pièces, quatre candidats' },
                { value: 'grand', label: '12 × 12 — cinq pièces, cinq candidats' }
            ]
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        // Un réglage peut arriver en chaîne si le panneau a rendu un champ de
        // texte : un générateur ne doit pas disparaître pour une virgule.
        const brut = Array.isArray(p.especes) ? p.especes
            : (typeof p.especes === 'string' ? p.especes.split(',') : []);
        const demandees = brut.map(e => String(e).trim()).filter(e => e === 'axe' || e === 'point');
        const especes = demandees.length ? demandees : ['axe', 'point'];
        const t = TAILLES[p.taille] || TAILLES.moyen;

        const trouve = chercher(rng, t, especes)
            || chercher(rng, t, ['axe', 'point'])
            || secours();
        const { pieces, de, vers, bon } = trouve;

        const noms = pieces.map((_, i) => LETTRES[i]);
        const faux = leurres(rng, bon, pieces, de, vers, t, t.candidats - 1);

        // LES CANDIDATS SONT MÉLANGÉS AVANT D'ÊTRE NOMMÉS. Nommés d'abord, le
        // bon aurait toujours porté le même indice, et (d₁) serait devenu la
        // réponse à tout.
        const candidats = rng.shuffle([bon, ...faux]).map((el, i) => ({
            ...el, id: `el${i}`, nom: nommerCandidat(el.genre, i)
        }));
        const juste = candidats.find(c => memeElement(c, bon));

        const svg = quadrillageSvg({
            largeur: t.l, hauteur: t.h, repere: true,
            figures: pieces.map((cases, i) => ({
                cases, etiquette: noms[i],
                classe: `qd-piece qd-piece-${i % 6}`
                    + (i === de ? ' qd-piece--source' : '')
                    + (i === vers ? ' qd-piece--cible' : '')
            })),
            elements: candidats
        });

        const question = `Par rapport à quoi la pièce ${noms[vers]} `
            + `est-elle le symétrique de la pièce ${noms[de]} ?`;

        return makeItem({
            seed: rng.seed,
            generatorId: 'geo.transfo.pavage',
            skillId: 'geo.transfo.reconnaitre',
            answerKind: 'element',
            prompt: {
                text: question,
                html: `<div class="game-question">${question}</div>${figure(svg)}`,
                papier: question
            },
            // LA RÉPONSE EST L'ÉLÉMENT, PAS SON NOM. Le nom change d'une
            // question à l'autre — (d₁) ici, (d₃) là — et deux élèves qui
            // désignent la même droite doivent être comptés pareil, qu'ils
            // l'aient choisie, cliquée ou écrite.
            answer: cleElement(bon),
            choices: finalizeChoices(rng, candidats.map(c => ({
                value: c.nom,
                correct: memeElement(c, bon),
                why: memeElement(c, bon) ? undefined : pourquoiPas(c, bon)
            })), { count: candidats.length }),
            hints: indices(bon, t.h),
            explanation: `C'est ${juste.nom}, ${bon.genre === 'axe' ? 'la droite' : 'le point'} `
                + `${ecrireElement(t.h, bon)}. `
                + (bon.genre === 'axe'
                    ? 'Chaque point et son image sont à la même distance de cette droite, de part et d\'autre.'
                    : 'Ce point est le milieu de chaque segment joignant un point à son image.'),
            explicationPapier: `${noms[vers]} est le symétrique de ${noms[de]} par rapport à `
                + `${bon.genre === 'axe' ? 'la droite' : 'le point'} ${ecrireElement(t.h, bon)} — ${juste.nom}.`,
            difficulty: bon.genre === 'point' ? 4 : 3,
            meta: {
                largeur: t.l, hauteur: t.h,
                pieces, noms, de, vers,
                candidats, bon, idJuste: juste.id,
                genre: bon.genre
            }
        });
    }
};

/** Un pavage et une paire dont l'élément est unique — ou `null`. */
function chercher(rng, t, especes) {
    for (let i = 0; i < 60; i++) {
        const pieces = poserLePavage(rng, t);
        if (!pieces) continue;
        const paires = [];
        for (let a = 0; a < pieces.length; a++) {
            for (let b = 0; b < pieces.length; b++) {
                if (a === b) continue;
                const el = elementUnique(pieces[a], pieces[b], t.l, t.h);
                if (el && especes.includes(el.genre)) paires.push({ de: a, vers: b, bon: el });
            }
        }
        if (!paires.length) continue;
        // ON TIRE L'ESPÈCE AVANT LA PAIRE. Il y a beaucoup plus de centres
        // possibles que d'axes sur un quadrillage — l × h contre l + h —, si
        // bien qu'un tirage uniforme parmi les paires donnait deux questions
        // sur trois portant sur un centre. Or l'axe est celui qui s'apprend en
        // premier : il ne peut pas être le cas rare.
        const parEspece = especes
            .map(g => paires.filter(p => p.bon.genre === g))
            .filter(liste => liste.length);
        return { pieces, ...rng.pick(rng.pick(parEspece)) };
    }
    return null;
}

/**
 * Le dernier recours, entièrement déterministe : deux pièces et un axe dont on
 * sait qu'ils tiennent. Un item vide bloquerait l'élève.
 */
function secours() {
    const motif = [{ x: 1, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 2 }];
    const bon = { genre: 'axe', axe: { type: 'v', a: 3.5 } };
    return {
        pieces: [motif, imageFigure(motif, { genre: 'axiale', axe: bon.axe })],
        de: 0, vers: 1, bon
    };
}
