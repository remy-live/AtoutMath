// Générateurs fractions et décimaux.
//
// Ces notions n'existaient dans aucun jeu. Elles sont ajoutées ici sans
// toucher à une seule ligne des moteurs de jeu : c'est précisément ce que le
// contrat Item permet. Elles deviennent immédiatement jouables dans les bulles,
// le pavé numérique, les taupes, etc.

import { makeItem, finalizeChoices } from '../items.js';
import {
    tirerProduit, etapesProduit, corrigeProduit, reduire, memeValeur
} from '../fractionsProduit.js';

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

// --- Multiplier deux fractions ----------------------------------------------
//
// Rémy : « on fait les multiplications de fractions avec et sans
// décomposition ».
//
// LA RÈGLE EST LA PLUS FACILE DU CHAPITRE, ET C'EST LE PIÈGE. Pour additionner
// il faut un dénominateur commun ; pour multiplier, on multiplie les
// numérateurs entre eux et les dénominateurs entre eux, et c'est tout. Ce que
// l'élève ne sait pas faire, c'est s'ARRÊTER avant de calculer — et c'est
// exactement ce que le réglage sépare. Le détail du raisonnement, avec les
// deux chemins, vit dans core/fractionsProduit.js.
//
// LES QUATRE PROPOSITIONS SONT QUATRE CONFUSIONS, pas quatre nombres.
// Additionner au lieu de multiplier, multiplier en croix (ce qui est la
// DIVISION), retourner le résultat : ce sont les trois façons dont un chapitre
// où l'on vient d'apprendre trois opérations sur les fractions se mélange.
//
// ET AUCUNE PROPOSITION NE VAUT LA BONNE RÉPONSE. C'est plus délicat ici
// qu'ailleurs : 24/36 et 2/3 sont deux ÉCRITURES du même nombre, et l'élève
// qui choisit la première a raison. On compare donc des valeurs, jamais des
// chaînes — d'où `memeValeur` dans le noyau.

export const fracProduitGenerator = {
    id: 'frac.produit',
    label: 'Multiplier deux fractions',
    skills: ['num.frac.multiplication'],
    answerKinds: ['choice'],
    ecrit: true,
    fractions: true,
    params: [
        {
            id: 'decomposition', type: 'select', label: 'Décomposer avant de calculer',
            default: 'sans',
            aide: 'Sans décomposition, rien ne se croise entre les deux fractions : on '
                + 'multiplie en haut, on multiplie en bas, c\'est fini. Avec, un facteur du '
                + 'haut se retrouve en bas — 3/4 × 8/9 — et il faut le barrer AVANT de '
                + 'calculer. C\'est le même résultat par les deux chemins ; l\'un fait '
                + 'chercher que 24 et 36 ont 12 en commun, l\'autre non.',
            options: [
                { value: 'sans', label: 'Sans — rien ne se simplifie' },
                { value: 'avec', label: 'Avec — il faut barrer en diagonale' },
                { value: 'les-deux', label: 'Les deux mélangés' }
            ]
        },
        {
            id: 'maxDen', type: 'number', label: 'Dénominateur maximum', default: 9, min: 2, max: 12
        },
        {
            id: 'maxNum', type: 'number', label: 'Numérateur maximum', default: 10, min: 1, max: 12,
            aide: 'Les fractions peuvent dépasser 1 : 9/4 × 5/9 est un produit comme un '
                + 'autre, et s\'interdire les fractions impropres ferait croire qu\'une '
                + 'fraction est toujours un morceau de gâteau.'
        }
    ],
    generate(params, ctx) {
        const rng = ctx.rng;
        const p = tirerProduit(rng, {
            decomposition: params.decomposition || 'sans',
            maxDen: Number(params.maxDen) || 9,
            maxNum: Number(params.maxNum) || 10
        });

        const ecrire = (f) => `${f.n}/${f.d}`;
        const bonne = p.reponse;

        // LES TROIS CONFUSIONS DU CHAPITRE. On les garde sous la forme où
        // l'élève les AURAIT ÉCRITES — non simplifiée —, parce que c'est celle
        // qu'il cherchera des yeux dans la liste.
        const pieges = [
            {
                f: { n: p.a + p.c, d: p.b + p.d },
                why: 'On n’additionne ni les numérateurs ni les dénominateurs. Cette règle-là '
                    + 'n’existe pour aucune opération sur les fractions.'
            },
            {
                f: { n: p.a * p.d, d: p.b * p.c },
                why: `Multiplier en croix, c’est DIVISER par la seconde fraction : `
                    + `${p.a}/${p.b} ÷ ${p.c}/${p.d}. Pour multiplier, on reste tout droit — `
                    + 'numérateurs avec numérateurs, dénominateurs avec dénominateurs.'
            },
            {
                f: { n: bonne.d, d: bonne.n },
                why: 'Le calcul est bon, mais le résultat est à l’envers : le haut est resté '
                    + 'en bas.'
            }
        ];

        // AUCUNE PROPOSITION NE DOIT VALOIR LA BONNE, ni une autre : deux
        // écritures du même nombre, et l'élève qui prend la « mauvaise » a
        // raison. On compare donc les valeurs réduites.
        const vues = [reduire(bonne.n, bonne.d)];
        const gardes = [];
        for (const pi of pieges) {
            if (pi.f.n < 1 || pi.f.d < 1) continue;
            // PAS DE « 6/1 » DANS LA LISTE. L'inverse d'un résultat inférieur à
            // 1 est un entier, et un entier écrit sur 1 ne s'écrit pas : dans
            // une liste de fractions, il se repère du premier coup d'œil sans
            // qu'on ait rien calculé.
            if (pi.f.d === 1) continue;
            const r = reduire(pi.f.n, pi.f.d);
            if (vues.some(v => memeValeur(v, r))) continue;
            vues.push(r);
            gardes.push(pi);
        }

        let ecart = 0;
        const choices = finalizeChoices(rng, [
            { value: ecrire(bonne), label: fracHtml(bonne.n, bonne.d), correct: true },
            ...gardes.map(pi => ({ value: ecrire(pi.f), label: fracHtml(pi.f.n, pi.f.d), why: pi.why }))
        ], {
            count: 4,
            // Le remplissage doit sortir des FRACTIONS, pas des nombres — et
            // aucune qui vaille l'une des précédentes.
            filler: () => {
                for (let i = 0; i < 40; i++) {
                    ecart += 1;
                    const f = { n: bonne.n + ecart, d: bonne.d };
                    const r = reduire(f.n, f.d);
                    if (!vues.some(v => memeValeur(v, r))) { vues.push(r); return ecrire(f); }
                }
                return ecrire({ n: bonne.n + 100, d: bonne.d });
            }
        }).map(c => (/^\d+\/\d+$/.test(String(c.label))
            ? { ...c, label: fracHtml(...String(c.value).split('/')) } : c));

        return makeItem({
            seed: rng.seed, generatorId: 'frac.produit', skillId: 'num.frac.multiplication',
            answerKind: 'choice',
            prompt: {
                text: `${p.a}/${p.b} × ${p.c}/${p.d} = ?`,
                html: `<div class="compare-line">
                        ${fracHtml(p.a, p.b)} <span class="compare-op">×</span> ${fracHtml(p.c, p.d)}
                        <span class="compare-op">=</span> <span class="compare-slot"></span>
                       </div>`,
                // Sur le papier, la feuille empile les `a/b` toute seule.
                papier: `${p.a}/${p.b} × ${p.c}/${p.d} =`
            },
            answer: ecrire(bonne),
            choices,
            hints: etapesProduit(p),
            explanation: corrigeProduit(p),
            // Barrer en diagonale demande de VOIR un facteur qui n'est pas
            // écrit ; multiplier tout droit ne demande que les tables.
            difficulty: p.croise ? 4 : 2,
            meta: {
                a: p.a, b: p.b, c: p.c, d: p.d,
                croise: p.croise, g1: p.g1, g2: p.g2,
                produit: p.produit, reponse: p.reponse,
                theme: p.croise ? 'avec-decomposition' : 'sans-decomposition'
            }
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
