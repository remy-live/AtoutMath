// Générateurs du domaine numérique.
//
// Chaque générateur est une fonction pure (params, ctx) -> Item. Aucun DOM,
// aucun accès à l'état global : le tirage aléatoire vient de `ctx.rng`, qui
// est ensemencé, donc une question est intégralement reproductible à partir
// de sa graine (rejeu à l'identique pour le plan de révisions, et côté
// serveur pour vérifier une évaluation).
//
// Point didactique important : les distracteurs ne sont pas du bruit. Chacun
// porte un `why` décrivant l'erreur qu'il piège. C'est ce qui permet de
// remplacer « Faux ! » par « tu as additionné au lieu de multiplier ».

import { makeItem, finalizeChoices } from '../items.js';

// --- Addition ---------------------------------------------------------------

export const additionGenerator = {
    id: 'calc.addition',
    label: 'Addition de deux entiers',
    skills: ['num.add.entiers'],
    answerKinds: ['choice', 'numeric'],
    ecrit: true,
    params: [
        { id: 'max', type: 'number', label: 'Plus grand terme', default: 10, min: 5, max: 100 },
        { id: 'retenue', type: 'select', label: 'Retenue', options: ['libre', 'avec', 'sans'], default: 'libre' }
    ],
    generate(params, ctx) {
        const rng = ctx.rng;
        const max = params.max || 10;
        let a, b, guard = 0;
        do {
            a = rng.int(1, max);
            b = rng.int(1, max);
            guard++;
        } while (guard < 50 && !retenueOk(a, b, params.retenue));

        const target = a + b;
        const choices = finalizeChoices(rng, [
            { value: target, correct: true },
            { value: target - 1, why: 'Il manque 1 : vérifie ton comptage.' },
            { value: target + 1, why: 'Un de trop : attention en comptant sur les doigts.' },
            { value: Math.abs(a - b), why: 'Tu as soustrait au lieu d\'additionner.' }
        ], { count: 4, filler: r => target + r.int(2, 6) });

        return makeItem({
            seed: rng.seed, generatorId: 'calc.addition', skillId: 'num.add.entiers',
            answerKind: 'choice',
            prompt: { text: `${a} + ${b} = ?`, html: `<div class="game-question">${a} + ${b} = ?</div>` },
            answer: target,
            choices,
            hints: [
                `Décompose : ${a} + ${b}, c'est ${a} puis on avance de ${b}.`,
                b >= 5 ? `Passe par 10 : ${a} + ${10 - a} = 10, il reste ${b - (10 - a)} à ajouter.`
                    : `Compte à partir de ${a} : ${Array.from({ length: Math.min(b, 5) }, (_, i) => a + i + 1).join(', ')}…`
            ],
            explanation: `${a} + ${b} = ${target}.`,
            difficulty: max > 20 ? 3 : 1,
            meta: { a, b }
        });
    }
};

function retenueOk(a, b, mode) {
    if (!mode || mode === 'libre') return true;
    const hasRetenue = (a % 10) + (b % 10) >= 10;
    return mode === 'avec' ? hasRetenue : !hasRetenue;
}

// --- Soustraction -----------------------------------------------------------

export const soustractionGenerator = {
    id: 'calc.soustraction',
    label: 'Soustraction de deux entiers',
    skills: ['num.sub.entiers'],
    answerKinds: ['choice', 'numeric'],
    ecrit: true,
    params: [
        { id: 'max', type: 'number', label: 'Plus grand nombre', default: 20, min: 10, max: 100 }
    ],
    generate(params, ctx) {
        const rng = ctx.rng;
        const max = params.max || 20;
        const a = rng.int(Math.floor(max / 2), max);
        const b = rng.int(1, a);
        const target = a - b;

        const choices = finalizeChoices(rng, [
            { value: target, correct: true },
            { value: a + b, why: 'Tu as additionné au lieu de soustraire.' },
            { value: target + 1, why: 'Un de trop : recompte l\'écart.' },
            { value: target - 1, why: 'Il manque 1 : recompte l\'écart.' }
        ].filter(c => c.correct || c.value >= 0), { count: 4, filler: r => target + r.int(2, 8) });

        return makeItem({
            seed: rng.seed, generatorId: 'calc.soustraction', skillId: 'num.sub.entiers',
            answerKind: 'choice',
            prompt: { text: `${a} − ${b} = ?`, html: `<div class="game-question">${a} − ${b} = ?</div>` },
            answer: target,
            choices,
            hints: [
                `Cherche ce qu'il faut ajouter à ${b} pour atteindre ${a}.`,
                `${b} + ? = ${a}`
            ],
            explanation: `${a} − ${b} = ${target}, car ${b} + ${target} = ${a}.`,
            difficulty: 2,
            meta: { a, b }
        });
    }
};

// --- Fait multiplicatif -----------------------------------------------------

export const multFactGenerator = {
    id: 'calc.mult.fact',
    label: 'Table de multiplication',
    skills: ['num.mult.table.*'],
    answerKinds: ['choice', 'numeric'],
    ecrit: true,
    params: [
        { id: 'tables', type: 'multiselect', label: 'Tables à travailler', options: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], default: [2, 3, 4, 5, 6, 7, 8, 9, 10] },
        { id: 'maxFacteur', type: 'number', label: 'Facteur maximum', default: 10, min: 5, max: 12 }
    ],
    generate(params, ctx) {
        const rng = ctx.rng;
        const allowed = (params.tables && params.tables.length) ? params.tables : [2, 3, 4, 5, 6, 7, 8, 9, 10];
        const t = pickWeighted(rng, allowed, ctx.weakTables || []);
        const m = rng.int(1, params.maxFacteur || 10);
        const ans = t * m;

        // Distracteurs typés : chacun correspond à une erreur classique.
        const choices = finalizeChoices(rng, [
            { value: ans, correct: true },
            { value: t * (m + 1), why: `Tu as compté une fois de trop : c'est ${m} fois ${t}, pas ${m + 1}.` },
            { value: t * (m - 1), why: `Il manque un ${t} : c'est ${m} fois ${t}.` },
            { value: t + m, why: 'Tu as additionné au lieu de multiplier.' }
        ].filter(c => c.correct || c.value > 0), { count: 4, filler: r => t * r.int(1, 10) });

        return makeItem({
            seed: rng.seed, generatorId: 'calc.mult.fact', skillId: `num.mult.table.${t}`,
            answerKind: 'choice',
            prompt: { text: `${t} × ${m} = ?`, html: `<div class="game-question">${t} &times; ${m} = ?</div>` },
            answer: ans,
            choices,
            hints: [
                `${t} × ${m}, c'est ${m} paquets de ${t}.`,
                m > 1 ? `Appuie-toi sur ${t} × ${m - 1} = ${t * (m - 1)}, puis ajoute ${t}.`
                    : `Multiplier par 1 ne change rien.`,
                `${t} × ${m} = ${ans}.`
            ],
            explanation: `${t} × ${m} = ${ans}.`,
            difficulty: t >= 6 && m >= 6 ? 3 : 2,
            meta: { t, m, ans }
        });
    }
};

// Biaise le tirage vers les tables que l'élève rate (renforcement ciblé),
// tout en gardant du hasard pour ne pas enfermer l'élève dans ses échecs.
function pickWeighted(rng, allowed, weak) {
    const usable = weak.filter(t => allowed.includes(t));
    if (usable.length > 0 && rng.bool(0.6)) return rng.pick(usable);
    return rng.pick(allowed);
}

// --- Facteur manquant -------------------------------------------------------

export const multMissingGenerator = {
    id: 'calc.mult.missing',
    label: 'Facteur manquant',
    skills: ['num.mult.facteur-manquant'],
    answerKinds: ['choice', 'numeric'],
    ecrit: true,
    params: [
        { id: 'tables', type: 'multiselect', label: 'Tables à travailler', options: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], default: [2, 3, 4, 5, 6, 7, 8, 9, 10] }
    ],
    generate(params, ctx) {
        const rng = ctx.rng;
        const allowed = (params.tables && params.tables.length) ? params.tables : [2, 3, 4, 5, 6, 7, 8, 9, 10];
        const known = pickWeighted(rng, allowed, ctx.weakTables || []);
        const missing = rng.int(2, 10);
        const product = known * missing;
        const firstMissing = rng.bool();
        const eq = firstMissing ? `? × ${known} = ${product}` : `${known} × ? = ${product}`;

        // Le digicode affiche 12 cases : les distracteurs typés d'abord, puis
        // les valeurs restantes de 1 à 12 pour remplir la grille.
        let next = 0;
        const choices = finalizeChoices(rng, [
            { value: missing, correct: true },
            { value: product - known, why: 'Tu as soustrait : ici il faut diviser.' },
            { value: missing + 1, why: `Un de trop : ${known} × ${missing + 1} = ${known * (missing + 1)}.` },
            { value: missing - 1, why: `Trop petit : ${known} × ${missing - 1} = ${known * (missing - 1)}.` }
        ].filter(c => c.correct || (c.value >= 1 && c.value <= 12)), {
            count: 12,
            filler: () => (next < 12 ? ++next : null)
        });

        return makeItem({
            seed: rng.seed, generatorId: 'calc.mult.missing', skillId: 'num.mult.facteur-manquant',
            answerKind: 'choice',
            prompt: {
                text: eq.replace('?', '...'),
                html: `<div class="game-question" style="margin-bottom:0;">Facteur Manquant</div>
                       <div style="font-size:2.2rem; font-weight:bold; color:var(--primary);">${eq}</div>`
            },
            answer: missing,
            choices,
            hints: [
                `Combien de fois ${known} tient-il dans ${product} ?`,
                `Calcule ${product} ÷ ${known}.`,
                `${known} × ${missing} = ${product}.`
            ],
            explanation: `${product} ÷ ${known} = ${missing}, donc ${known} × ${missing} = ${product}.`,
            difficulty: 3,
            meta: { known, missing, product, firstMissing }
        });
    }
};

// --- Division ---------------------------------------------------------------

export const divisionGenerator = {
    id: 'calc.division',
    label: 'Division (quotient exact)',
    skills: ['num.div.quotient'],
    answerKinds: ['choice', 'numeric'],
    ecrit: true,
    params: [
        { id: 'tables', type: 'multiselect', label: 'Diviseurs', options: [2, 3, 4, 5, 6, 7, 8, 9, 10], default: [2, 3, 4, 5, 6, 7, 8, 9, 10] }
    ],
    generate(params, ctx) {
        const rng = ctx.rng;
        const allowed = (params.tables && params.tables.length) ? params.tables : [2, 3, 4, 5, 6, 7, 8, 9, 10];
        const d = pickWeighted(rng, allowed, ctx.weakTables || []);
        const q = rng.int(2, 10);
        const n = d * q;

        return makeItem({
            seed: rng.seed, generatorId: 'calc.division', skillId: 'num.div.quotient',
            answerKind: 'choice',
            prompt: { text: `${n} ÷ ${d} = ?`, html: `<div class="game-question">${n} ÷ ${d} = ?</div>` },
            answer: q,
            choices: finalizeChoices(rng, [
                { value: q, correct: true },
                { value: n - d, why: 'Tu as soustrait au lieu de diviser.' },
                { value: q + 1, why: `Trop grand : ${d} × ${q + 1} = ${d * (q + 1)}.` },
                { value: q - 1, why: `Trop petit : ${d} × ${q - 1} = ${d * (q - 1)}.` }
            ].filter(c => c.correct || c.value >= 1), { count: 4, filler: r => q + r.int(2, 9) }),
            hints: [
                `Combien de paquets de ${d} peut-on faire avec ${n} ?`,
                `Cherche dans la table de ${d} : ${d} × ? = ${n}.`
            ],
            explanation: `${n} ÷ ${d} = ${q}, car ${d} × ${q} = ${n}.`,
            difficulty: 3,
            meta: { n, d, q }
        });
    }
};

// --- Priorités opératoires --------------------------------------------------

const PRIORITY_TEMPLATES = [
    (a, b, c) => ({ eq: `${a} + ${b} × ${c}`, right: `${b} × ${c}`, wrong: `${a} + ${b}`, value: a + b * c }),
    (a, b, c) => ({ eq: `${a} × ${b} + ${c}`, right: `${a} × ${b}`, wrong: `${b} + ${c}`, value: a * b + c }),
    (a, b, c) => ({ eq: `${a} - ${b} × ${c}`, right: `${b} × ${c}`, wrong: `${a} - ${b}`, value: a - b * c }),
    (a, b, c) => ({ eq: `${a} × ${b} - ${c}`, right: `${a} × ${b}`, wrong: `${b} - ${c}`, value: a * b - c })
];

export const prioriteGenerator = {
    id: 'calc.priorites',
    label: 'Priorités opératoires',
    skills: ['num.prio'],
    answerKinds: ['choice'],
    ecrit: true,
    params: [
        { id: 'mode', type: 'select', label: 'Question posée', options: ['operation', 'resultat'], default: 'operation' }
    ],
    generate(params, ctx) {
        const rng = ctx.rng;
        const a = rng.int(2, 9), b = rng.int(2, 9), c = rng.int(2, 9);
        const tpl = PRIORITY_TEMPLATES[rng.int(0, PRIORITY_TEMPLATES.length - 1)](a, b, c);

        // Deux façons d'interroger la même compétence : identifier l'opération
        // prioritaire, ou calculer le résultat. La seconde est plus exigeante.
        if (params.mode === 'resultat') {
            const naive = evalLeftToRight(tpl.eq);
            return makeItem({
                seed: rng.seed, generatorId: 'calc.priorites', skillId: 'num.prio',
                answerKind: 'choice',
                prompt: { text: `${tpl.eq} = ?`, html: `<div class="game-question">${tpl.eq} = ?</div>` },
                answer: tpl.value,
                choices: finalizeChoices(rng, [
                    { value: tpl.value, correct: true },
                    { value: naive, why: 'Tu as calculé de gauche à droite : la multiplication passe avant.' },
                    { value: tpl.value + b }
                ], { count: 3, filler: r => tpl.value + r.int(2, 12) }),
                hints: [`Commence par ${tpl.right}.`, `${tpl.right} = ${evalSimple(tpl.right)}.`],
                explanation: `On calcule d'abord ${tpl.right} = ${evalSimple(tpl.right)}, donc ${tpl.eq} = ${tpl.value}.`,
                difficulty: 4,
                meta: tpl
            });
        }

        return makeItem({
            seed: rng.seed, generatorId: 'calc.priorites', skillId: 'num.prio',
            answerKind: 'choice',
            prompt: {
                text: `Quelle opération est prioritaire dans ${tpl.eq} ?`,
                html: `<div class="game-question">Priorité ?<br><span style="color:var(--primary)">${tpl.eq}</span></div>`
            },
            answer: tpl.right,
            choices: finalizeChoices(rng, [
                { value: tpl.right, correct: true },
                { value: tpl.wrong, why: 'On ne calcule pas de gauche à droite : la multiplication est prioritaire.' }
            ], { count: 2 }),
            hints: ['Cherche la multiplication ou la division.', `C'est ${tpl.right}.`],
            explanation: `La multiplication est prioritaire sur l'addition et la soustraction : on calcule d'abord ${tpl.right}.`,
            difficulty: 3,
            meta: tpl
        });
    }
};

// --- Générateur composite ---------------------------------------------------
// Certains jeux (arcade) veulent alterner les opérations dans une même partie.
// Plutôt que de recoder ce mélange dans chaque jeu — ce que faisait l'ancien
// code — on compose les générateurs existants. La compétence tracée reste
// celle de la question réellement posée.

const MIXTE_SOURCES = {
    '+': additionGenerator,
    '-': soustractionGenerator,
    '*': multFactGenerator,
    '/': divisionGenerator
};

export const mixteGenerator = {
    id: 'calc.mixte',
    label: 'Calcul mental varié',
    skills: ['num.add.entiers', 'num.sub.entiers', 'num.div.quotient', 'num.mult.table.*'],
    answerKinds: ['choice', 'numeric'],
    ecrit: true,
    params: [
        { id: 'operations', type: 'multiselect', label: 'Opérations', options: [
            // Le SYMBOLE seul, et le nom en infobulle. Écrits en toutes
            // lettres, les quatre opérations prenaient deux rangées à elles
            // seules et repoussaient les tables hors de l'écran. « + − × ÷ »
            // sont les signes que l'élève lit dans l'exercice : ils n'ont
            // besoin d'aucune traduction.
            { value: '+', label: '+', aide: 'Addition' },
            { value: '-', label: '−', aide: 'Soustraction' },
            { value: '*', label: '×', aide: 'Multiplication' },
            { value: '/', label: '÷', aide: 'Division' }
        ], default: ['+', '-'] },
        { id: 'tables', type: 'multiselect', label: 'Tables (si × ou ÷)', options: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], default: [2, 3, 4, 5, 6, 7, 8, 9, 10] },
        { id: 'max', type: 'number', label: 'Plus grand terme (si + ou −)', default: 20, min: 5, max: 100 }
    ],
    generate(params, ctx) {
        const ops = (params.operations && params.operations.length) ? params.operations : ['+', '-'];
        const op = ctx.rng.pick(ops);
        const source = MIXTE_SOURCES[op] || additionGenerator;
        const item = source.generate(params, ctx);
        // On conserve l'identité du générateur composite pour la configuration,
        // mais la compétence reste celle de la question posée.
        return { ...item, generatorId: 'calc.mixte', meta: { ...item.meta, op } };
    }
};

function evalSimple(expr) {
    const m = /^(\d+)\s*([+\-×*])\s*(\d+)$/.exec(expr.replace(/\s+/g, ' ').trim());
    if (!m) return NaN;
    const [, x, op, y] = m;
    const a = Number(x), b = Number(y);
    if (op === '+') return a + b;
    if (op === '-') return a - b;
    return a * b;
}

// Résultat qu'obtiendrait un élève qui ignore les priorités : c'est le
// distracteur le plus instructif, il révèle exactement la règle manquante.
function evalLeftToRight(eq) {
    const tokens = eq.split(' ');
    let acc = Number(tokens[0]);
    for (let i = 1; i < tokens.length; i += 2) {
        const op = tokens[i], v = Number(tokens[i + 1]);
        if (op === '+') acc += v;
        else if (op === '-') acc -= v;
        else acc *= v;
    }
    return acc;
}
