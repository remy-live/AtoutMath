// Générateurs géométrie et grandeurs.
//
// Le repérage se fait dans un vrai repère du plan — axes fléchés, origine,
// graduations entières, traits de rappel — et non dans un quadrillage de cases
// à colorier. C'est l'objet mathématique du programme, et il autorise les
// coordonnées négatives, donc la continuité avec les nombres relatifs.
//
// Deux questions distinctes sur la même compétence, symétriques et toutes deux
// nécessaires : PLACER un point à partir de ses coordonnées, et LIRE les
// coordonnées d'un point tracé. Le générateur choisit selon le genre de
// réponse attendu par l'activité.

import { makeItem, finalizeChoices } from '../items.js';
import { repereSvg, rectangleSvg, figure } from '../figures.js';

// --- Repérage dans le plan --------------------------------------------------

export const repereGenerator = {
    id: 'geo.repere',
    label: 'Repérage dans le plan',
    skills: ['geo.repere.coord', 'geo.repere.relatifs'],
    answerKinds: ['point', 'choice'],
    params: [
        { id: 'relatifs', type: 'select', label: 'Coordonnées', options: ['positives', 'relatives'], default: 'positives' },
        { id: 'max', type: 'number', label: 'Graduation maximale', default: 5, min: 3, max: 8 },
        { id: 'mode', type: 'select', label: 'Question', options: ['auto', 'placer', 'lire'], default: 'auto' }
    ],
    generate(params, ctx) {
        const rng = ctx.rng;
        const relatifs = params.relatifs === 'relatives';
        const max = Math.min(params.max || 5, relatifs ? 6 : 8);
        const min = relatifs ? -max : 0;
        const skillId = relatifs ? 'geo.repere.relatifs' : 'geo.repere.coord';

        // On évite l'origine et, en mode positif, les points sur les axes :
        // ils rendent la question triviale et n'exercent pas la lecture d'un
        // couple.
        let x, y, guard = 0;
        do {
            x = rng.int(min, max);
            y = rng.int(min, max);
        } while (guard++ < 40 && ((x === 0 && y === 0) || (!relatifs && (x === 0 || y === 0))));

        const label = rng.pick(['A', 'B', 'C', 'D', 'E', 'M', 'P']);
        const coord = `(${x} ; ${y})`;

        // Le mode dépend de ce que l'activité sait afficher, sauf choix explicite.
        const mode = params.mode && params.mode !== 'auto'
            ? params.mode
            : (ctx.preferredKind === 'choice' ? 'lire' : 'placer');

        const hints = relatifs
            ? [
                'L\'abscisse se lit sur l\'axe horizontal : négative à gauche de l\'origine.',
                'L\'ordonnée se lit sur l\'axe vertical : négative en dessous de l\'origine.',
                `Ici, on avance de ${x} horizontalement puis de ${y} verticalement.`
            ]
            : [
                'On lit toujours l\'abscisse (horizontale) en premier.',
                `Avance de ${x} vers la droite, puis monte de ${y}.`
            ];

        if (mode === 'lire') {
            // Distracteurs : le couple inversé (l'erreur n°1) et les erreurs de signe.
            const fmt = (a, b) => `(${a} ; ${b})`;
            const choices = finalizeChoices(rng, [
                { value: fmt(x, y), correct: true },
                { value: fmt(y, x), why: 'Tu as inversé les deux nombres : l\'abscisse (horizontale) se lit en premier.' },
                relatifs
                    ? { value: fmt(-x, y), why: 'Attention au signe de l\'abscisse : à gauche de l\'origine, elle est négative.' }
                    : { value: fmt(x + 1, y), why: 'Recompte les graduations sur l\'axe horizontal.' },
                relatifs
                    ? { value: fmt(x, -y), why: 'Attention au signe de l\'ordonnée : sous l\'origine, elle est négative.' }
                    : { value: fmt(x, y + 1), why: 'Recompte les graduations sur l\'axe vertical.' }
            ], { count: 4, filler: r => fmt(r.int(min, max), r.int(min, max)) });

            return makeItem({
                seed: rng.seed, generatorId: 'geo.repere', skillId,
                answerKind: 'choice',
                prompt: {
                    text: `Quelles sont les coordonnées du point ${label} ?`,
                    html: `<div class="game-question">Coordonnées du point ${label} ?</div>
                           ${figure(repereSvg({ max, relatifs, point: { x, y, label } }))}`
                },
                answer: fmt(x, y),
                choices,
                hints,
                explanation: `Le point ${label} a pour coordonnées ${coord} : abscisse ${x}, ordonnée ${y}.`,
                difficulty: relatifs ? 3 : 2,
                meta: { x, y, max, relatifs, mode, label }
            });
        }

        return makeItem({
            seed: rng.seed, generatorId: 'geo.repere', skillId,
            answerKind: 'point',
            prompt: {
                text: `Place le point ${label} ${coord}`,
                html: `<div class="game-question">Place le point ${label} <span class="coord-badge">${coord}</span></div>`
            },
            answer: `${x},${y}`,
            hints,
            explanation: `${label} ${coord} : ${x} sur l'axe horizontal, ${y} sur l'axe vertical.`,
            difficulty: relatifs ? 3 : 2,
            meta: { x, y, max, relatifs, mode, label }
        });
    }
};

// --- Périmètre d'un rectangle -----------------------------------------------

export const perimetreGenerator = {
    id: 'mes.perimetre',
    label: 'Périmètre d\'un rectangle',
    skills: ['mes.perimetre.rectangle'],
    answerKinds: ['numeric', 'choice'],
    params: [
        { id: 'max', type: 'number', label: 'Dimension maximale', default: 12, min: 3, max: 40 },
        { id: 'unite', type: 'select', label: 'Unité', options: ['cm', 'm'], default: 'cm' }
    ],
    generate(params, ctx) {
        const rng = ctx.rng;
        const u = params.unite || 'cm';
        const L = rng.int(3, params.max || 12);
        const l = rng.int(1, Math.max(1, L - 1));
        const p = 2 * (L + l);

        return makeItem({
            seed: rng.seed, generatorId: 'mes.perimetre', skillId: 'mes.perimetre.rectangle',
            answerKind: 'numeric',
            prompt: {
                text: `Périmètre d'un rectangle de ${L} ${u} sur ${l} ${u} ?`,
                html: `<div class="game-question">Périmètre de ce rectangle ?</div>${figure(rectangleSvg(L, l, u))}`
            },
            answer: p,
            choices: finalizeChoices(rng, [
                { value: p, label: `${p} ${u}`, correct: true },
                { value: L * l, label: `${L * l} ${u}`, why: 'Tu as calculé l\'aire (L × l), pas le périmètre.' },
                { value: L + l, label: `${L + l} ${u}`, why: 'Tu n\'as fait qu\'un demi-tour : il faut compter les 4 côtés.' },
                { value: 2 * L + l, label: `${2 * L + l} ${u}`, why: 'Il manque une largeur.' }
            ], { count: 4, filler: r => p + r.int(2, 9) })
                .map(c => (typeof c.label === 'number' ? { ...c, label: `${c.value} ${u}` } : c)),
            hints: [
                'Le périmètre, c\'est le tour de la figure.',
                'Périmètre = 2 × (Longueur + largeur).',
                `2 × (${L} + ${l}) = 2 × ${L + l} = ${p}.`
            ],
            explanation: `Périmètre = 2 × (${L} + ${l}) = ${p} ${u}.`,
            difficulty: 3,
            meta: { L, l, unite: u, unit: u }
        });
    }
};

// --- Aire d'un rectangle ----------------------------------------------------

export const aireGenerator = {
    id: 'mes.aire',
    label: 'Aire d\'un rectangle',
    skills: ['mes.aire.rectangle'],
    answerKinds: ['numeric', 'choice'],
    params: [
        { id: 'max', type: 'number', label: 'Dimension maximale', default: 10, min: 3, max: 20 },
        { id: 'unite', type: 'select', label: 'Unité', options: ['cm', 'm'], default: 'cm' }
    ],
    generate(params, ctx) {
        const rng = ctx.rng;
        const u = params.unite || 'cm';
        const L = rng.int(3, params.max || 10);
        const l = rng.int(2, Math.max(2, L));
        const aire = L * l;

        return makeItem({
            seed: rng.seed, generatorId: 'mes.aire', skillId: 'mes.aire.rectangle',
            answerKind: 'numeric',
            prompt: {
                text: `Aire d'un rectangle de ${L} ${u} sur ${l} ${u} ?`,
                html: `<div class="game-question">Aire de ce rectangle ?</div>${figure(rectangleSvg(L, l, u))}`
            },
            answer: aire,
            choices: finalizeChoices(rng, [
                { value: aire, label: `${aire} ${u}²`, correct: true },
                { value: 2 * (L + l), label: `${2 * (L + l)} ${u}²`, why: 'Tu as calculé le périmètre (le tour), pas l\'aire (la surface).' },
                { value: L + l, label: `${L + l} ${u}²`, why: 'Tu as additionné : l\'aire est un produit.' },
                { value: aire + L, label: `${aire + L} ${u}²` }
            ], { count: 4, filler: r => aire + r.int(2, 12) })
                .map(c => (typeof c.label === 'number' ? { ...c, label: `${c.value} ${u}²` } : c)),
            hints: [
                'L\'aire, c\'est la surface : le nombre de carreaux à l\'intérieur.',
                'Aire = Longueur × largeur.',
                `${L} × ${l} = ${aire}.`
            ],
            explanation: `Aire = ${L} × ${l} = ${aire} ${u}².`,
            difficulty: 3,
            // L'unité affichée à côté de la saisie est celle du résultat : une
            // aire s'exprime en cm², pas en cm.
            meta: { L, l, unite: u, unit: `${u}²` }
        });
    }
};
