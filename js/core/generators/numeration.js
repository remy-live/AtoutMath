// Générateurs du chapitre « Nombres entiers et décimaux » (6ᵉ).
//
// Construits à partir de la fiche de cours : rang des chiffres, parties
// entière et décimale, zéros inutiles, décomposition, conversions de rang,
// écriture en lettres, ordre de grandeur, numération égyptienne.
//
// Comme partout, les distracteurs sont typés : sur ce chapitre les erreurs
// sont très stéréotypées (confondre dizaines et dixièmes, compter les rangs
// depuis la gauche, supprimer un zéro significatif), et les nommer vaut mieux
// que de signaler « faux ».

import { makeItem, finalizeChoices } from '../items.js';
import {
    spellInteger, spellDecimalRank, valueOfRank,
    digitAtRank, RANK_NAMES, formatFr, stripUselessZeros
} from '../numberWords.js';
import { egyptianSvg, figure } from '../figures.js';

// --- Outils communs ---------------------------------------------------------

/** Décimal aléatoire dont on maîtrise exactement les chiffres. */
function randomDecimal(rng, { intDigits = 4, decDigits = 2 } = {}) {
    const intPart = rng.int(10 ** (intDigits - 1), 10 ** intDigits - 1);
    const decPart = decDigits > 0 ? rng.int(1, 10 ** decDigits - 1) : 0;
    const value = Number(`${intPart}.${String(decPart).padStart(decDigits, '0')}`);
    return { value, intPart, decPart };
}

// --- 1. Chiffre d'un rang ---------------------------------------------------

const RANKS_ENTIER = [0, 1, 2, 3];
const RANKS_DECIMAL = [-1, -2, -3];

export const chiffreRangGenerator = {
    id: 'num.chiffre-rang',
    label: 'Chiffre d\'un rang donné',
    skills: ['num.numeration.rang'],
    answerKinds: ['choice', 'numeric'],
    ecrit: true,
    params: [
        { id: 'partie', type: 'select', label: 'Rangs interrogés', options: ['entière', 'décimale', 'les deux'], default: 'les deux' },
        { id: 'decimales', type: 'number', label: 'Nombre de décimales', default: 3, min: 1, max: 3 }
    ],
    generate(params, ctx) {
        const rng = ctx.rng;
        const decDigits = params.decimales || 3;
        const { value } = randomDecimal(rng, { intDigits: 4, decDigits });

        const pool = params.partie === 'entière' ? RANKS_ENTIER
            : params.partie === 'décimale' ? RANKS_DECIMAL
                : [...RANKS_ENTIER, ...RANKS_DECIMAL.slice(0, decDigits)];
        const rank = rng.pick(pool);
        const answer = digitAtRank(value, rank);
        const affiche = formatFr(value, decDigits);

        // Le rang « miroir » : dizaines ↔ dixièmes, centaines ↔ centièmes.
        // C'est LA confusion du chapitre, celle que le tableau de numération
        // sert justement à lever.
        const miroir = rank > 0 ? -rank : (rank < 0 ? -rank : null);
        const chiffreMiroir = miroir !== null ? digitAtRank(value, miroir) : null;
        // Compter les rangs depuis la gauche au lieu de la droite.
        const parLaGauche = digitAtRank(value, 3 - Math.min(rank, 3));

        return makeItem({
            seed: rng.seed, generatorId: 'num.chiffre-rang', skillId: 'num.numeration.rang',
            answerKind: 'choice',
            prompt: {
                text: `Quel est le chiffre des ${RANK_NAMES[rank]} de ${affiche} ?`,
                html: `<div class="game-question">Chiffre des <b>${RANK_NAMES[rank]}</b> de
                       <span class="nb-highlight">${affiche}</span> ?</div>`
            },
            answer,
            choices: finalizeChoices(rng, [
                { value: answer, correct: true },
                chiffreMiroir !== null && chiffreMiroir !== answer
                    ? {
                        value: chiffreMiroir,
                        why: `Attention : ${RANK_NAMES[rank]} et ${RANK_NAMES[miroir]}, ce n'est pas le même rang. Les dizaines sont à gauche de la virgule, les dixièmes juste à droite.`
                    }
                    : null,
                { value: parLaGauche, why: 'Les rangs se comptent à partir de la virgule, pas depuis le début du nombre.' }
            ].filter(Boolean), { count: 4, filler: r => r.int(0, 9) }),
            hints: [
                'Place le nombre dans le tableau de numération, colonne par colonne.',
                rank >= 0
                    ? 'Les unités sont juste à gauche de la virgule, puis dizaines, centaines…'
                    : 'Juste à droite de la virgule : dixièmes, puis centièmes, puis millièmes.'
            ],
            explanation: `Dans ${affiche}, le chiffre des ${RANK_NAMES[rank]} est ${answer}.`,
            difficulty: rank < 0 ? 3 : 2,
            meta: { value, rank, decimal: false }
        });
    }
};

// --- 2. Partie entière / partie décimale ------------------------------------

export const partiesGenerator = {
    id: 'num.parties',
    label: 'Partie entière et partie décimale',
    skills: ['num.decimal.parties'],
    answerKinds: ['choice'],
    ecrit: true,
    params: [],
    generate(params, ctx) {
        const rng = ctx.rng;
        const decDigits = rng.int(2, 3);
        const { value, intPart, decPart } = randomDecimal(rng, { intDigits: rng.int(2, 3), decDigits });
        const cherchePartieEntiere = rng.bool();

        const decStr = `0,${String(decPart).padStart(decDigits, '0')}`;
        const answer = cherchePartieEntiere ? String(intPart) : decStr;
        const affiche = formatFr(value, decDigits);

        return makeItem({
            seed: rng.seed, generatorId: 'num.parties', skillId: 'num.decimal.parties',
            answerKind: 'choice',
            prompt: {
                text: `Quelle est la partie ${cherchePartieEntiere ? 'entière' : 'décimale'} de ${affiche} ?`,
                html: `<div class="game-question">Partie <b>${cherchePartieEntiere ? 'entière' : 'décimale'}</b> de
                       <span class="nb-highlight">${affiche}</span> ?</div>`
            },
            answer,
            choices: finalizeChoices(rng, [
                { value: answer, correct: true },
                cherchePartieEntiere
                    ? { value: decStr, why: 'C\'est la partie décimale : celle qui est APRÈS la virgule.' }
                    : { value: String(intPart), why: 'C\'est la partie entière : celle qui est AVANT la virgule.' },
                cherchePartieEntiere
                    ? { value: String(decPart), why: 'La partie décimale commence par « 0, » : elle est plus petite que 1.' }
                    : { value: String(decPart), why: 'Il manque le « 0, » : la partie décimale est plus petite que 1.' },
                { value: affiche, why: 'C\'est le nombre entier, pas seulement l\'une de ses deux parties.' }
            ], { count: 4 }),
            hints: [
                'La virgule sépare les deux parties.',
                'La partie décimale s\'écrit avec un 0 devant la virgule : 0,16.'
            ],
            explanation: `Pour ${affiche} : ${intPart} est la partie entière et ${decStr} la partie décimale.`,
            difficulty: 2,
            meta: { value, intPart, decStr }
        });
    }
};

// --- 3. Zéros inutiles ------------------------------------------------------

export const zerosGenerator = {
    id: 'num.zeros',
    label: 'Supprimer les zéros inutiles',
    skills: ['num.decimal.zeros'],
    answerKinds: ['numeric', 'choice'],
    ecrit: true,
    params: [],
    generate(params, ctx) {
        const rng = ctx.rng;
        // On fabrique un nombre propre, puis on l'habille de zéros inutiles.
        const base = rng.bool()
            ? `${rng.int(1, 99)},${rng.int(1, 99)}`
            : String(rng.int(2, 400));
        const zerosGauche = '0'.repeat(rng.int(1, 3));
        const zerosDroite = base.includes(',') ? '0'.repeat(rng.int(1, 2)) : '';
        const affiche = `${zerosGauche}${base}${zerosDroite}`;
        const answer = stripUselessZeros(affiche);

        // Distracteurs : supprimer un zéro qui compte, ou n'en retirer qu'une partie.
        const trop = answer.includes(',')
            ? answer.replace(/0/g, '') || '0'
            : answer.replace(/0+$/, '') || '0';

        return makeItem({
            seed: rng.seed, generatorId: 'num.zeros', skillId: 'num.decimal.zeros',
            answerKind: 'numeric',
            prompt: {
                text: `Écris ${affiche} sans les zéros inutiles.`,
                html: `<div class="game-question">Enlève les zéros inutiles<br>
                       <span class="nb-highlight nb-highlight--lg">${affiche}</span></div>`
            },
            answer,
            choices: finalizeChoices(rng, [
                { value: answer, correct: true },
                trop !== answer ? { value: trop, why: 'Tu en as enlevé un qui compte : on ne supprime que les zéros tout à gauche de la partie entière et tout à droite de la partie décimale.' } : null,
                { value: `${zerosGauche}${base}`.replace(/^0+/, '') === answer ? null : `${base}${zerosDroite}`, why: 'Il reste des zéros inutiles à la fin.' }
            ].filter(c => c && c.value), { count: 3, filler: () => null }),
            hints: [
                'Un zéro tout à gauche de la partie entière ne change rien : 032,12 = 32,12.',
                'Un zéro tout à droite de la partie décimale ne change rien non plus : 3,470 = 3,47.',
                'Mais un zéro entre deux chiffres compte : 17,070 garde son zéro du milieu.'
            ],
            explanation: `${affiche} = ${answer}.`,
            difficulty: 3,
            meta: { affiche, decimal: answer.includes(',') }
        });
    }
};

// --- 4. Conversion de rang (785 centaines = 78 500) -------------------------

const CONVERSIONS = [
    { label: 'dizaines', factor: 10 },
    { label: 'centaines', factor: 100 },
    { label: 'unités de mille', factor: 1000 },
    { label: 'dizaines de mille', factor: 10000 },
    { label: 'dixièmes', factor: 0.1 },
    { label: 'centièmes', factor: 0.01 }
];

export const conversionGenerator = {
    id: 'num.conversion',
    label: 'Convertir des unités de numération',
    skills: ['num.numeration.conversion'],
    answerKinds: ['numeric', 'choice'],
    ecrit: true,
    params: [
        { id: 'decimaux', type: 'select', label: 'Inclure dixièmes et centièmes', options: ['oui', 'non'], default: 'non' }
    ],
    generate(params, ctx) {
        const rng = ctx.rng;
        const pool = params.decimaux === 'oui' ? CONVERSIONS : CONVERSIONS.filter(c => c.factor >= 1);
        const conv = rng.pick(pool);
        const count = rng.int(2, conv.factor >= 1000 ? 40 : 900);
        const answer = Number((count * conv.factor).toFixed(3));

        return makeItem({
            seed: rng.seed, generatorId: 'num.conversion', skillId: 'num.numeration.conversion',
            answerKind: 'numeric',
            prompt: {
                text: `${count} ${conv.label} = ?`,
                html: `<div class="game-question"><span class="nb-highlight">${formatFr(count)}</span> ${conv.label} = ?</div>`
            },
            answer,
            choices: finalizeChoices(rng, [
                { value: answer, correct: true },
                { value: count, why: `Il faut multiplier par ${formatFr(conv.factor)} : une ${conv.label.replace(/s$/, '')} vaut ${formatFr(conv.factor)} unités.` },
                { value: Number((answer * 10).toFixed(3)), why: 'Un rang de trop : recompte les zéros.' },
                { value: Number((answer / 10).toFixed(3)), why: 'Un rang de moins : recompte les zéros.' }
            ], { count: 4 }),
            hints: [
                `Une ${conv.label.replace(/s$/, '')} vaut ${formatFr(conv.factor)} unité${conv.factor > 1 ? 's' : ''}.`,
                `Calcule ${formatFr(count)} × ${formatFr(conv.factor)}.`
            ],
            explanation: `${formatFr(count)} ${conv.label} = ${formatFr(count)} × ${formatFr(conv.factor)} = ${formatFr(answer)}.`,
            difficulty: conv.factor < 1 ? 4 : 3,
            meta: { count, conv: conv.label, decimal: conv.factor < 1 }
        });
    }
};

// --- 5. Décomposition additive ----------------------------------------------

export const decompositionGenerator = {
    id: 'num.decomposition',
    label: 'Décomposer un nombre',
    skills: ['num.numeration.decomposition'],
    answerKinds: ['numeric', 'choice'],
    ecrit: true,
    params: [
        { id: 'sens', type: 'select', label: 'Sens', options: ['recomposer', 'terme manquant', 'libre'], default: 'libre' }
    ],
    generate(params, ctx) {
        const rng = ctx.rng;
        // Trois à quatre rangs non nuls, comme dans les exercices de la fiche.
        const rangs = rng.shuffle([1, 10, 100, 1000, 10000]).slice(0, rng.int(3, 4)).sort((a, b) => b - a);
        const termes = rangs.map(r => rng.int(1, 9) * r);
        const total = termes.reduce((s, t) => s + t, 0);

        const mode = params.sens === 'libre' ? rng.pick(['recomposer', 'terme manquant']) : params.sens;

        if (mode === 'recomposer') {
            return makeItem({
                seed: rng.seed, generatorId: 'num.decomposition', skillId: 'num.numeration.decomposition',
                answerKind: 'numeric',
                prompt: {
                    text: `${termes.map(t => formatFr(t)).join(' + ')} = ?`,
                    html: `<div class="game-question">${termes.map(t => formatFr(t)).join(' + ')} = ?</div>`
                },
                answer: total,
                hints: ['Chaque terme donne le chiffre d\'un rang.', `Le plus grand terme est ${formatFr(termes[0])}.`],
                explanation: `${termes.map(t => formatFr(t)).join(' + ')} = ${formatFr(total)}.`,
                difficulty: 3,
                meta: { total, termes }
            });
        }

        const cache = rng.int(0, termes.length - 1);
        const affichés = termes.map((t, i) => (i === cache ? '?' : formatFr(t)));
        return makeItem({
            seed: rng.seed, generatorId: 'num.decomposition', skillId: 'num.numeration.decomposition',
            answerKind: 'numeric',
            prompt: {
                text: `${formatFr(total)} = ${affichés.join(' + ')}`,
                html: `<div class="game-question"><span class="nb-highlight">${formatFr(total)}</span> =
                       ${affichés.map(t => t === '?' ? '<span class="nb-slot">?</span>' : t).join(' + ')}</div>`
            },
            answer: termes[cache],
            hints: [
                'Repère le rang qui manque dans la décomposition.',
                `Additionne les termes affichés, puis compare à ${formatFr(total)}.`
            ],
            explanation: `${formatFr(total)} = ${termes.map(t => formatFr(t)).join(' + ')}.`,
            difficulty: 3,
            meta: { total, termes, cache }
        });
    }
};

// --- 6. Écriture en lettres -------------------------------------------------

export const lettresGenerator = {
    id: 'num.lettres',
    label: 'Écriture en lettres',
    skills: ['num.ecriture.lettres'],
    answerKinds: ['numeric', 'choice'],
    ecrit: true,
    params: [
        { id: 'max', type: 'select', label: 'Jusqu\'à', options: [1000, 100000, 1000000], default: 100000 },
        { id: 'decimaux', type: 'select', label: 'Rangs décimaux', options: ['non', 'parfois', 'toujours'], default: 'non' }
    ],
    generate(params, ctx) {
        const rng = ctx.rng;

        // Variante « trois dixièmes = 0,3 » de l'exercice 19. « toujours »
        // existe pour qu'un exercice intitulé « Dixièmes et centièmes » ne
        // serve pas un entier une fois sur deux.
        const veutDecimal = params.decimaux === 'toujours'
            || ((params.decimaux === 'oui' || params.decimaux === 'parfois') && rng.bool(0.5));
        if (veutDecimal) {
            const rank = rng.int(1, 2);
            const count = rng.int(2, rank === 1 ? 9 : 250);
            const answer = valueOfRank(count, rank);
            const mots = spellDecimalRank(count, rank);
            return makeItem({
                seed: rng.seed, generatorId: 'num.lettres', skillId: 'num.ecriture.lettres',
                answerKind: 'numeric',
                prompt: {
                    text: `Écris en chiffres : ${mots}`,
                    html: `<div class="game-question">Écris en chiffres<br><span class="nb-words">${mots}</span></div>`
                },
                answer,
                hints: [
                    rank === 1 ? 'Un dixième s\'écrit 0,1.' : 'Un centième s\'écrit 0,01.',
                    `Calcule ${count} × ${rank === 1 ? '0,1' : '0,01'}.`
                ],
                explanation: `${mots} = ${count} × ${rank === 1 ? '0,1' : '0,01'} = ${formatFr(answer)}.`,
                difficulty: 4,
                meta: { decimal: true }
            });
        }

        const max = Number(params.max) || 100000;
        const n = rng.int(21, max);
        const mots = spellInteger(n);

        return makeItem({
            seed: rng.seed, generatorId: 'num.lettres', skillId: 'num.ecriture.lettres',
            answerKind: 'numeric',
            prompt: {
                text: `Écris en chiffres : ${mots}`,
                html: `<div class="game-question">Écris en chiffres<br><span class="nb-words">${mots}</span></div>`
            },
            answer: n,
            choices: finalizeChoices(rng, [
                { value: n, label: formatFr(n), correct: true },
                { value: n * 10, label: formatFr(n * 10), why: 'Un rang de trop : recompte les zéros.' },
                { value: Math.floor(n / 10), label: formatFr(Math.floor(n / 10)), why: 'Un rang de moins : recompte les zéros.' }
            ], { count: 3 }),
            hints: [
                'Découpe la phrase par tranches : millions, milliers, puis unités.',
                'Écris le nombre par tranches de 3 chiffres en partant de la droite.'
            ],
            explanation: `${mots} s'écrit ${formatFr(n)}.`,
            difficulty: n > 10000 ? 4 : 3,
            meta: { n, decimal: false }
        });
    }
};

// --- 7. Ordre de grandeur ---------------------------------------------------

export const ordreGrandeurGenerator = {
    id: 'num.ordre-grandeur',
    label: 'Ordre de grandeur',
    skills: ['num.ordre-grandeur'],
    answerKinds: ['choice'],
    ecrit: true,
    params: [
        { id: 'decimaux', type: 'select', label: 'Nombres décimaux', options: ['oui', 'non'], default: 'non' }
    ],
    generate(params, ctx) {
        const rng = ctx.rng;
        const avecDecimales = params.decimaux === 'oui' && rng.bool();

        let affiche, answer, voisin;
        if (avecDecimales) {
            const entier = rng.int(1, 99);
            const proche = rng.bool();          // proche de l'entier du dessus
            const value = proche ? entier + 1 - rng.int(1, 4) / 100 : entier + rng.int(1, 4) / 100;
            affiche = formatFr(Number(value.toFixed(3)));
            answer = Math.round(value);
            voisin = answer + (proche ? -1 : 1);
        } else {
            const puissance = rng.pick([100, 1000, 10000]);
            const proche = rng.bool();
            const value = proche ? puissance - rng.int(1, 4) : puissance + rng.int(1, 4);
            affiche = formatFr(value);
            answer = puissance;
            voisin = proche ? puissance - 10 : puissance + 10;
        }

        return makeItem({
            seed: rng.seed, generatorId: 'num.ordre-grandeur', skillId: 'num.ordre-grandeur',
            answerKind: 'choice',
            prompt: {
                text: `${affiche} ≈ ?`,
                html: `<div class="game-question"><span class="nb-highlight">${affiche}</span> &asymp; ?</div>`
            },
            answer,
            choices: finalizeChoices(rng, [
                { value: answer, label: formatFr(answer), correct: true },
                { value: voisin, label: formatFr(voisin), why: 'Ce n\'est pas le nombre rond le plus proche : regarde de quel côté il penche.' },
                { value: answer * 10, label: formatFr(answer * 10), why: 'Attention au nombre de zéros.' }
            ], { count: 3 }),
            hints: [
                'Un ordre de grandeur, c\'est le nombre rond le plus proche.',
                'Il sert à vérifier qu\'on n\'a pas fait une erreur grossière.'
            ],
            explanation: `${affiche} ≈ ${formatFr(answer)}.`,
            difficulty: 2,
            meta: { affiche, answer }
        });
    }
};

// --- 8. Numération égyptienne -----------------------------------------------

export const EGYPTE = [
    { value: 1, nom: 'bâton' },
    { value: 10, nom: 'anse' },
    { value: 100, nom: 'corde enroulée' },
    { value: 1000, nom: 'fleur de lotus' },
    { value: 10000, nom: 'doigt' }
];

export const egypteGenerator = {
    id: 'num.egypte',
    label: 'Numération égyptienne',
    skills: ['num.numeration.egypte'],
    answerKinds: ['numeric', 'choice'],
    params: [
        { id: 'max', type: 'select', label: 'Jusqu\'à', options: [1000, 10000, 50000], default: 10000 }
    ],
    generate(params, ctx) {
        const rng = ctx.rng;
        const max = Number(params.max) || 10000;
        const symboles = EGYPTE.filter(s => s.value <= max);

        // On compose un nombre à partir de 2 ou 3 rangs, avec peu de symboles
        // par rang : un nombre égyptien se lit en comptant, il ne doit pas
        // devenir un exercice de dénombrement.
        const choisis = rng.shuffle(symboles).slice(0, rng.int(2, 3));
        const compte = choisis.map(s => ({ ...s, n: rng.int(1, 4) }));
        const total = compte.reduce((sum, s) => sum + s.value * s.n, 0);
        const ordonne = [...compte].sort((a, b) => b.value - a.value);

        // Erreur classique : compter les symboles au lieu de les additionner.
        const nbSymboles = compte.reduce((s, c) => s + c.n, 0);

        return makeItem({
            seed: rng.seed, generatorId: 'num.egypte', skillId: 'num.numeration.egypte',
            answerKind: 'numeric',
            prompt: {
                text: `Quel nombre les Égyptiens écrivaient-ils ainsi ?`,
                html: `<div class="game-question">Quel nombre est écrit ici ?</div>
                       ${figure(egyptianSvg(ordonne))}`
            },
            answer: total,
            choices: finalizeChoices(rng, [
                { value: total, label: formatFr(total), correct: true },
                { value: nbSymboles, label: String(nbSymboles), why: 'Tu as compté les symboles. Chaque symbole a sa propre valeur : un bâton vaut 1, une anse 10, une corde 100…' },
                { value: total * 10, label: formatFr(total * 10), why: 'Attention à la valeur de chaque symbole.' }
            ], { count: 3 }),
            hints: [
                'Chaque symbole a une valeur : bâton 1, anse 10, corde 100, lotus 1 000, doigt 10 000.',
                `Additionne : ${ordonne.map(s => `${s.n} × ${formatFr(s.value)}`).join(' + ')}.`
            ],
            explanation: `${ordonne.map(s => `${s.n} × ${formatFr(s.value)}`).join(' + ')} = ${formatFr(total)}.`,
            difficulty: 3,
            meta: { total, symboles: ordonne, decimal: false }
        });
    }
};

// --- 9. Compléments à 10, 100, 1000 -----------------------------------------

export const complementGenerator = {
    id: 'num.complement',
    label: 'Compléments à 10, 100, 1000',
    skills: ['num.complement'],
    answerKinds: ['numeric', 'choice'],
    ecrit: true,
    params: [
        { id: 'cible', type: 'multiselect', label: 'Compléter à', options: [10, 100, 1000], default: [10, 100] }
    ],
    generate(params, ctx) {
        const rng = ctx.rng;
        const cibles = (params.cible && params.cible.length) ? params.cible : [10, 100];
        const cible = rng.pick(cibles);
        // À 100 et 1000, on reste sur des dizaines rondes : c'est le calcul
        // mental visé par la fiche, pas une soustraction posée.
        const pas = cible === 10 ? 1 : 10;
        const a = rng.int(1, cible / pas - 1) * pas;
        const answer = cible - a;

        return makeItem({
            seed: rng.seed, generatorId: 'num.complement', skillId: 'num.complement',
            answerKind: 'numeric',
            prompt: {
                text: `${a} + ? = ${cible}`,
                html: `<div class="game-question">${a} + <span class="nb-slot">?</span> = ${cible}</div>`
            },
            answer,
            choices: finalizeChoices(rng, [
                { value: answer, correct: true },
                { value: cible + a, why: 'Tu as additionné : ici il faut chercher ce qu\'il manque.' },
                { value: answer + pas, why: 'Un pas de trop : recompte.' },
                { value: Math.max(0, answer - pas), why: 'Un pas de moins : recompte.' }
            ], { count: 4 }),
            hints: [
                `Cherche ce qu'il faut ajouter à ${a} pour atteindre ${cible}.`,
                cible === 10 ? 'Appuie-toi sur ta table d\'addition.' : `${a} + ? = ${cible}, raisonne par dizaines.`
            ],
            explanation: `${a} + ${answer} = ${cible}.`,
            difficulty: cible === 10 ? 1 : 2,
            meta: { a, cible, decimal: false }
        });
    }
};

// --- 10. Pair ou impair -----------------------------------------------------

export const pariteGenerator = {
    id: 'num.parite',
    label: 'Pair ou impair',
    skills: ['num.parite'],
    answerKinds: ['choice'],
    ecrit: true,
    params: [
        { id: 'max', type: 'number', label: 'Nombre maximum', default: 99, min: 20, max: 999 }
    ],
    generate(params, ctx) {
        const rng = ctx.rng;
        const n = rng.int(2, params.max || 99);
        const pair = n % 2 === 0;

        return makeItem({
            seed: rng.seed, generatorId: 'num.parite', skillId: 'num.parite',
            answerKind: 'choice',
            prompt: {
                text: `${n} est-il pair ou impair ?`,
                html: `<div class="game-question"><span class="nb-highlight nb-highlight--lg">${n}</span><br>pair ou impair ?</div>`
            },
            answer: pair ? 'pair' : 'impair',
            choices: rng.shuffle([
                { value: 'pair', label: 'Pair', correct: pair },
                {
                    value: 'impair', label: 'Impair', correct: !pair,
                    why: pair ? 'Regarde seulement le chiffre des unités : 0, 2, 4, 6 ou 8 signifie pair.' : undefined
                }
            ].map(c => (c.correct ? { ...c, why: undefined } : c))),
            hints: [
                'Seul le chiffre des unités compte.',
                'Un nombre est pair s\'il se termine par 0, 2, 4, 6 ou 8.'
            ],
            explanation: `${n} se termine par ${n % 10}, donc il est ${pair ? 'pair' : 'impair'}.`,
            difficulty: 1,
            meta: { n }
        });
    }
};
