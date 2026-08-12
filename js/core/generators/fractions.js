// Générateurs fractions et décimaux.
//
// Ces notions n'existaient dans aucun jeu. Elles sont ajoutées ici sans
// toucher à une seule ligne des moteurs de jeu : c'est précisément ce que le
// contrat Item permet. Elles deviennent immédiatement jouables dans les bulles,
// le pavé numérique, les taupes, etc.

import { makeItem, finalizeChoices } from '../items.js';

function gcd(a, b) {
    return b === 0 ? a : gcd(b, a % b);
}

function fracHtml(n, d) {
    return `<span class="fraction"><span class="fraction-num">${n}</span><span class="fraction-den">${d}</span></span>`;
}

// --- Comparer deux fractions ------------------------------------------------

export const fracCompareGenerator = {
    id: 'frac.compare',
    label: 'Comparer deux fractions',
    skills: ['num.frac.compare'],
    answerKinds: ['choice'],
    ecrit: true,
    // Sur le papier, une fraction s'écrit EN COLONNE — numérateur sur
    // dénominateur, séparés d'un trait. La barre oblique est une commodité
    // d'écran ; ce n'est pas ce qu'on demande d'écrire à l'élève.
    fractions: true,
    params: [
        { id: 'memeDenominateur', type: 'select', label: 'Dénominateurs', options: ['identiques', 'differents', 'libre'], default: 'libre' },
        { id: 'maxDen', type: 'number', label: 'Dénominateur maximum', default: 12, min: 3, max: 20 }
    ],
    generate(params, ctx) {
        const rng = ctx.rng;
        const maxDen = params.maxDen || 12;
        const mode = params.memeDenominateur || 'libre';
        const wantSame = mode === 'identiques' || (mode === 'libre' && rng.bool(0.5));

        let n1, d1, n2, d2;
        if (wantSame) {
            d1 = d2 = rng.int(3, maxDen);
            n1 = rng.int(1, d1 - 1);
            do { n2 = rng.int(1, d1 - 1); } while (n2 === n1);
        } else {
            d1 = rng.int(2, maxDen);
            // Tirer d2 indépendamment pouvait redonner d1 : on annonçait alors
            // « mets au même dénominateur 121 » sur 10/11 et 6/11, où comparer
            // les numérateurs est justement la bonne méthode. On garantit donc
            // des dénominateurs réellement différents.
            do { d2 = rng.int(2, maxDen); } while (d2 === d1 && maxDen > 2);
            n1 = rng.int(1, d1);
            n2 = rng.int(1, d2);
            // On évite l'égalité, qui rendrait la question ambiguë.
            if (n1 * d2 === n2 * d1) n2 = Math.max(1, n2 - 1);
        }

        // La suite s'appuie sur la situation RÉELLE, pas sur l'intention de
        // tirage : c'est elle qui détermine la méthode à enseigner.
        const same = d1 === d2;
        const v1 = n1 / d1, v2 = n2 / d2;
        const answer = v1 > v2 ? '>' : (v1 < v2 ? '<' : '=');

        // Le distracteur central : comparer les numérateurs en ignorant les
        // dénominateurs. C'est LA erreur classique sur les fractions.
        const naive = n1 > n2 ? '>' : (n1 < n2 ? '<' : '=');
        const choices = ['<', '=', '>'].map(sign => ({
            value: sign,
            label: sign,
            correct: sign === answer,
            why: sign !== answer && sign === naive && !same
                ? 'Tu as comparé seulement les numérateurs. Avec des dénominateurs différents, il faut les mettre au même dénominateur.'
                : undefined
        }));

        const common = same ? d1 : d1 * d2;
        return makeItem({
            seed: rng.seed, generatorId: 'frac.compare', skillId: 'num.frac.compare',
            answerKind: 'choice',
            prompt: {
                text: `${n1}/${d1} … ${n2}/${d2}`,
                // Une ligne d'égalité à compléter, avec un emplacement vide
                // explicite : l'élève voit ce qu'on lui demande de produire.
                html: `<div class="compare-line">
                        ${fracHtml(n1, d1)}
                        <span class="compare-slot" aria-label="signe à choisir"></span>
                        ${fracHtml(n2, d2)}
                       </div>`
            },
            answer,
            choices,
            hints: same
                ? ['Même dénominateur : compare simplement les numérateurs.']
                : [
                    'Les dénominateurs sont différents : on ne peut pas comparer directement.',
                    `Mets au même dénominateur ${common} : ${n1}/${d1} = ${n1 * (common / d1)}/${common} et ${n2}/${d2} = ${n2 * (common / d2)}/${common}.`
                ],
            explanation: same
                ? `Même dénominateur ${d1} : ${n1} ${answer} ${n2}, donc ${n1}/${d1} ${answer} ${n2}/${d2}.`
                : `Au dénominateur commun ${common} : ${n1 * (common / d1)}/${common} ${answer} ${n2 * (common / d2)}/${common}.`,
            difficulty: same ? 2 : 4,
            meta: { n1, d1, n2, d2, same }
        });
    }
};

// --- Additionner deux fractions de même dénominateur ------------------------

export const fracAddGenerator = {
    id: 'frac.add',
    label: 'Additionner des fractions (même dénominateur)',
    skills: ['num.frac.add-meme-denom'],
    answerKinds: ['choice'],
    ecrit: true,
    fractions: true,
    params: [
        { id: 'maxDen', type: 'number', label: 'Dénominateur maximum', default: 12, min: 3, max: 20 }
    ],
    generate(params, ctx) {
        const rng = ctx.rng;
        const d = rng.int(3, params.maxDen || 12);
        const n1 = rng.int(1, d - 1);
        const n2 = rng.int(1, d - 1);
        const sum = n1 + n2;

        const label = (n, dd) => `${n}/${dd}`;
        let extra = 1;
        const choices = finalizeChoices(rng, [
            { value: label(sum, d), label: fracHtml(sum, d), correct: true },
            {
                value: label(sum, d * 2), label: fracHtml(sum, d * 2),
                why: 'On n\'additionne pas les dénominateurs : ils restent identiques.'
            },
            {
                value: label(n1 * n2, d), label: fracHtml(n1 * n2, d),
                why: 'Tu as multiplié les numérateurs au lieu de les additionner.'
            },
            {
                value: label(sum - 1, d), label: fracHtml(sum - 1, d),
                why: 'Erreur de calcul sur les numérateurs.'
            }
        ], {
            count: 4,
            // Les propositions sont des chaînes "n/d" : le remplissage doit
            // produire des fractions, pas des nombres.
            filler: () => label(sum + (++extra), d)
        }).map(c => (typeof c.label === 'number' || /^\d+\/\d+$/.test(String(c.label)))
            ? { ...c, label: fracHtml(...String(c.value).split('/')) }
            : c);

        const g = gcd(sum, d);
        const simplified = g > 1 && sum % d !== 0 ? ` (soit ${sum / g}/${d / g} simplifié)` : '';

        return makeItem({
            seed: rng.seed, generatorId: 'frac.add', skillId: 'num.frac.add-meme-denom',
            answerKind: 'choice',
            prompt: {
                text: `${n1}/${d} + ${n2}/${d} = ?`,
                html: `<div class="compare-line">
                        ${fracHtml(n1, d)} <span class="compare-op">+</span> ${fracHtml(n2, d)}
                        <span class="compare-op">=</span> <span class="compare-slot"></span>
                       </div>`
            },
            answer: label(sum, d),
            choices,
            hints: [
                'Les dénominateurs sont identiques : on additionne seulement les numérateurs.',
                `${n1} + ${n2} = ${sum}, sur ${d}.`
            ],
            explanation: `${n1}/${d} + ${n2}/${d} = ${sum}/${d}${simplified}. Le dénominateur ne change pas.`,
            difficulty: 3,
            meta: { n1, n2, d, sum }
        });
    }
};

// --- Comparer deux décimaux -------------------------------------------------

export const decCompareGenerator = {
    id: 'dec.compare',
    label: 'Comparer deux nombres décimaux',
    skills: ['num.dec.compare'],
    answerKinds: ['choice'],
    ecrit: true,
    params: [
        { id: 'decimales', type: 'select', label: 'Nombre de décimales', options: [1, 2, 3], default: 2 }
    ],
    generate(params, ctx) {
        const rng = ctx.rng;
        const nbDec = params.decimales || 2;
        const fmt = v => v.toFixed(nbDec).replace(/0+$/, '').replace(/\.$/, '').replace('.', ',');

        // Cas piégeux volontaire : même partie entière, nombre de décimales
        // différent (2,5 vs 2,45) — l'élève qui compare "45 > 5" se trompe.
        let a, b, sa, sb, piege, guard = 0;
        do {
            const entier = rng.int(0, 9);
            piege = rng.bool(0.5);
            a = entier + rng.int(1, 9) / 10;
            b = piege
                ? entier + rng.int(10, 99) / 100
                : entier + rng.int(1, 9) / 10 + (nbDec > 1 ? rng.int(0, 9) / 100 : 0);
            sa = fmt(a); sb = fmt(b);
        } while (sa === sb && guard++ < 20);

        const answer = a > b ? '>' : '<';
        const naiveA = sa.split(',')[1] || '';
        const naiveB = sb.split(',')[1] || '';
        const naive = Number(naiveA) > Number(naiveB) ? '>' : '<';

        return makeItem({
            seed: rng.seed, generatorId: 'dec.compare', skillId: 'num.dec.compare',
            answerKind: 'choice',
            prompt: {
                text: `${sa} … ${sb}`,
                html: `<div class="compare-line">
                        <span class="compare-value">${sa}</span>
                        <span class="compare-slot" aria-label="signe à choisir"></span>
                        <span class="compare-value">${sb}</span>
                       </div>`
            },
            answer,
            choices: ['<', '>'].map(sign => ({
                value: sign, label: sign, correct: sign === answer,
                why: sign !== answer && sign === naive
                    ? 'Tu as comparé la partie décimale comme un entier. 2,5 vaut 2,50 : on compare rang par rang.'
                    : undefined
            })),
            hints: [
                'Compare d\'abord les parties entières.',
                'Si elles sont égales, compare les dixièmes, puis les centièmes.',
                `${sa} = ${a.toFixed(3)} et ${sb} = ${b.toFixed(3)}.`
            ],
            explanation: `${sa} ${answer} ${sb} : on compare rang par rang (dixièmes, puis centièmes).`,
            difficulty: piege ? 4 : 2,
            meta: { a, b }
        });
    }
};
