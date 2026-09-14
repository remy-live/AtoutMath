// CODER UNE FIGURE — le générateur.
//
// Il tire une figure d'une des quatre familles, et rien d'autre : tout ce qui
// se corrige se déduit ensuite des coordonnées (voir core/codage.js). Sa seule
// vraie responsabilité est de ne pas tirer de dimensions PIÈGES.
//
// Le piège : dans un rectangle de côtés L et l, la demi-diagonale vaut
// racine(L² + l²) / 2, et elle égale l exactement quand L = l racine(3). Un tel
// rectangle demanderait la même marque sur un côté et sur une demi-diagonale —
// c'est juste, mais c'est une coïncidence de mesures, pas une propriété du
// rectangle. On la refuse : l'exercice porte sur ce que la FAMILLE impose.

import { makeItem } from '../items.js';
import {
    TYPES_CODAGE, NOM_TYPE, PROPRIETES, construireFigure, classesDeLongueur,
    codageAttendu, segmentsDe, pointsAngleDe
} from '../codage.js';

/** Combien de paquets de longueurs chaque famille doit montrer, diagonales comprises. */
const PAQUETS_ATTENDUS = { carre: 2, rectangle: 3, losange: 3, parallelogramme: 4 };

const FAMILLES = {
    toutes: TYPES_CODAGE,
    droites: ['carre', 'rectangle'],
    obliques: ['losange', 'parallelogramme'],
    carre: ['carre'], rectangle: ['rectangle'],
    losange: ['losange'], parallelogramme: ['parallelogramme']
};

/** Des dimensions au hasard, refusées tant qu'elles font mentir la figure. */
function tirerFigure(type, rng, penchee) {
    for (let essai = 0; essai < 40; essai++) {
        const dims = tirerDims(type, rng);
        const rotation = penchee ? (rng.int(12, 40) * Math.PI) / 180 * (rng.bool() ? 1 : -1) : 0;
        const fig = construireFigure(type, dims, rotation);
        if (classesDeLongueur(fig).length === PAQUETS_ATTENDUS[type]) return fig;
    }
    // Repli sûr : des dimensions dont on sait qu'elles ne collisionnent pas.
    const secours = { carre: { cote: 10 }, rectangle: { L: 12, l: 5 },
        losange: { p: 16, q: 12 }, parallelogramme: { base: 12, hauteur: 6, decalage: 4 } };
    return construireFigure(type, secours[type], 0);
}

function tirerDims(type, rng) {
    if (type === 'carre') return { cote: rng.int(6, 12) };
    if (type === 'rectangle') {
        const l = rng.int(4, 8);
        return { L: l + rng.int(3, 8), l };
    }
    if (type === 'losange') {
        const p = rng.int(8, 18);
        // Deux diagonales franchement différentes : un losange presque carré
        // ne se distingue plus à l'œil, et l'exercice devient un piège visuel.
        const q = rng.bool() ? p - rng.int(4, 7) : p + rng.int(4, 7);
        return { p, q: Math.max(5, q) };
    }
    return {
        base: rng.int(9, 14),
        hauteur: rng.int(5, 8),
        decalage: rng.int(3, 7)
    };
}

/** L'indice, gradué, et taillé pour la famille tirée. */
function indices(type, avecDiagonales) {
    const liste = [
        'Commence par les côtés. Fais le tour de la figure et demande-toi lesquels '
        + 'ont la même longueur : ceux-là porteront la même marque.'
    ];
    if (type === 'carre' || type === 'losange') {
        liste.push('Les quatre côtés sont égaux : une seule et même marque sur les quatre.');
    } else {
        liste.push('Les côtés opposés sont égaux deux à deux : une marque pour une paire, '
            + 'une autre marque pour l\'autre. Deux paires, deux marques différentes.');
    }
    if (avecDiagonales) {
        liste.push('Les diagonales se coupent en leur milieu : chacune donne donc deux '
            + 'demi-diagonales égales. Restent à comparer les deux diagonales entre elles — '
            + (type === 'carre' || type === 'rectangle'
                ? 'ici elles ont la même longueur, donc les quatre demi-diagonales sont égales.'
                : 'ici elles n\'ont pas la même longueur, donc les demi-diagonales vont deux par deux.'));
    }
    liste.push(anglesDits(type, avecDiagonales));
    return liste;
}

function anglesDits(type, avecDiagonales) {
    if (type === 'carre') {
        return avecDiagonales
            ? 'Les angles : les quatre sommets sont droits, et les diagonales se croisent '
                + 'aussi à angle droit. Cinq petits carrés en tout.'
            : 'Les angles : les quatre sommets sont droits.';
    }
    if (type === 'rectangle') {
        return avecDiagonales
            ? 'Les angles : les quatre sommets sont droits — mais les diagonales, elles, '
                + 'ne se coupent PAS à angle droit.'
            : 'Les angles : les quatre sommets sont droits.';
    }
    if (type === 'losange') {
        return avecDiagonales
            ? 'Les angles : les sommets ne sont pas droits, mais les diagonales se croisent '
                + 'perpendiculairement. Un seul petit carré, au centre.'
            : 'Les angles : aucun sommet n\'est droit dans un losange.';
    }
    return 'Les angles : aucun n\'est droit dans un parallélogramme quelconque — '
        + 'ni aux sommets, ni au croisement des diagonales.';
}

export const codageGenerator = {
    id: 'geo.codage',
    label: 'Coder une figure',
    skills: ['geo.figures.coder'],
    answerKinds: ['grid'],
    params: [
        {
            id: 'familles', type: 'select', label: 'Les figures', default: 'toutes',
            aide: 'Les quatre familles ne demandent pas le même travail : le carré et le '
                + 'rectangle vivent d\'angles droits, le losange et le parallélogramme '
                + 'd\'égalités de longueurs.',
            options: [
                { value: 'toutes', label: 'Les quatre familles' },
                { value: 'droites', label: 'Carré et rectangle' },
                { value: 'obliques', label: 'Losange et parallélogramme' },
                { value: 'carre', label: 'Carré seulement' },
                { value: 'rectangle', label: 'Rectangle seulement' },
                { value: 'losange', label: 'Losange seulement' },
                { value: 'parallelogramme', label: 'Parallélogramme seulement' }
            ]
        },
        {
            id: 'diagonales', type: 'checkbox', label: 'Tracer les diagonales', default: true,
            aide: 'Sans les diagonales, on ne code que les côtés et les angles des sommets : '
                + 'c\'est la première marche, dès le CM2. Avec, l\'exercice porte aussi sur '
                + 'les demi-diagonales et sur leur point de croisement.'
        },
        {
            id: 'penchee', type: 'select', label: 'Figures penchées', default: 'parfois',
            aide: 'Une figure posée bien droite se reconnaît à sa silhouette. Penchée, il '
                + 'faut la LIRE — et c\'est là qu\'on voit qui a compris.',
            options: [
                { value: 'jamais', label: 'Jamais — toujours posées droites' },
                { value: 'parfois', label: 'Une fois sur deux' },
                { value: 'toujours', label: 'Toujours penchées' }
            ]
        }
    ],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const familles = FAMILLES[p.familles] || FAMILLES.toutes;
        const type = rng.pick(familles);
        const avecDiagonales = p.diagonales !== false;
        const penchee = p.penchee === 'toujours' ? true
            : (p.penchee === 'jamais' ? false : rng.bool());

        const fig = tirerFigure(type, rng, penchee);
        const ids = segmentsDe(avecDiagonales);
        const pts = pointsAngleDe(avecDiagonales);

        const nom = NOM_TYPE[type];
        const texte = `Code ${nom} ABCD : même marque pour les segments de même longueur, `
            + 'et le petit carré sur les angles droits.';

        return makeItem({
            seed: rng.seed,
            generatorId: 'geo.codage',
            skillId: 'geo.figures.coder',
            answerKind: 'grid',
            prompt: {
                text: texte,
                html: `<div class="game-question">Code ${nom} <b>ABCD</b></div>`
            },
            answer: codageAttendu(fig, ids, pts),
            hints: indices(type, avecDiagonales),
            explanation: `Dans ${nom} : ${PROPRIETES[type].join(' ; ')}.`,
            difficulty: { carre: 1, rectangle: 2, losange: 3, parallelogramme: 4 }[type]
                + (penchee ? 1 : 0),
            meta: {
                type, dims: fig.dims, rotation: fig.rotation,
                avecDiagonales, segments: ids, points: pts
            }
        });
    }
};
