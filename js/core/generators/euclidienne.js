// LA DIVISION EUCLIDIENNE — sixième, bloc 8.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, dans sa progression de sixième. Le logiciel savait poser une division,
// et il savait les fractions ; il ne savait pas ce qui les RELIE — le reste.
//
// ── CE QUI SE JOUE, ET POURQUOI LE RESTE EST LE CŒUR ───────────────────────
//
// 47 ÷ 6 n'a pas de réponse entière, et c'est précisément le sujet : il y a un
// quotient ET un reste, liés par une égalité qu'on peut VÉRIFIER —
//
//     47 = 6 × 7 + 5,     avec 0 ⩽ 5 < 6
//
// La condition sur le reste n'est pas une formalité d'adulte : c'est elle qui
// rend le couple unique, et c'est elle qui attrape l'erreur la plus fréquente
// — un quotient trop petit laisse un reste PLUS GRAND que le diviseur, et
// l'élève qui écrit « 47 = 6 × 6 + 11 » n'a pas fini sa division.
//
// ET C'EST LÀ QUE LA FRACTION PREND SON SENS. 47/6 n'est pas « 7 et des
// poussières » : c'est 7 + 5/6, exactement. L'élève qui a vu les deux
// écritures côte à côte comprend pourquoi une fraction peut être plus grande
// que 1 — ce que le chapitre des fractions, seul, n'explique jamais.
//
// ── LES QUATRE ERREURS ENCODÉES ────────────────────────────────────────────
//
//   1. LE RESTE PLUS GRAND QUE LE DIVISEUR — la division n'est pas finie.
//   2. LE QUOTIENT ARRONDI AU PLUS PROCHE au lieu d'être pris par défaut :
//      47 ÷ 6 ≈ 7,8 donne 8, et 8 × 6 = 48 dépasse 47.
//   3. DIVISEUR ET QUOTIENT ÉCHANGÉS dans l'égalité.
//   4. LE RESTE OUBLIÉ : « 47 = 6 × 7 », qui est faux de cinq.

import { makeItem, finalizeChoices } from '../items.js';
import {
    paramMarches, marchesCochees, marcheAuRang, conseilProgression, totalDe
} from '../progression.js';

const COMPETENCE = 'num.div.quotient';

const MARCHES = [
    { id: 'quotient', nom: 'Le quotient' },
    { id: 'reste', nom: 'Le reste' },
    { id: 'egalite', nom: 'L\'égalité a = b × q + r' },
    { id: 'fraction', nom: 'Le lien avec les fractions' }
];
const TEMPS = {};
const MOT = 'palier';
const ANCIEN = { cle: 'palier' };

/** Une division qui ne tombe PAS juste : sans reste, il n'y a rien à apprendre. */
function tirerDivision(rng) {
    for (let essai = 0; essai < 40; essai++) {
        const b = rng.int(3, 9);
        const q = rng.int(3, 15);
        const r = rng.int(1, b - 1);
        const a = b * q + r;
        if (a > 99) continue;
        return { a, b, q, r };
    }
    return { a: 47, b: 6, q: 7, r: 5 };
}

const fractionHtml = (num, den) =>
    `<span class="fraction"><span class="fraction-num">${num}</span>`
    + `<span class="fraction-den">${den}</span></span>`;

export const euclidienneGenerator = {
    id: 'num.euclidienne',
    label: 'Division euclidienne : quotient et reste',
    skills: [COMPETENCE],
    answerKinds: ['choice'],
    ecrit: true,
    // SUR LE PAPIER, UNE FRACTION S'ÉCRIT EN COLONNE. La marche du lien avec
    // les fractions écrit « 47/6 » dans son énoncé : la barre oblique est une
    // commodité d'écran, et une feuille qui l'imprime enseigne le contraire du
    // cours. Ce drapeau dit au rendu d'EMPILER — et une épreuve de la maison
    // le vérifie sur tout le catalogue ; elle a trouvé cet oubli-ci.
    fractions: true,
    conseil: (p) => conseilProgression(marchesCochees(p, MARCHES, ANCIEN).length, 3),
    params: [paramMarches({ marches: MARCHES, groupes: TEMPS, mot: MOT, ancien: ANCIEN })],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const i = Number(ctx.index) || 0;
        const marche = marcheAuRang(i, marchesCochees(p, MARCHES, ANCIEN),
            totalDe(ctx, p), p, 3);
        const { a, b, q, r } = tirerDivision(rng);
        const egalite = `${a} = ${b} × ${q} + ${r}`;
        const commun = {
            seed: rng.seed,
            generatorId: 'num.euclidienne',
            skillId: COMPETENCE,
            answerKind: 'choice',
            difficulty: marche === 'fraction' ? 3 : (marche === 'egalite' ? 2 : 1),
            meta: { marche, a, b, q, r, theme: `${marche}-${a}-${b}` }
        };

        if (marche === 'quotient' || marche === 'reste') {
            const cherche = marche === 'quotient' ? q : r;
            const mot = marche === 'quotient' ? 'quotient' : 'reste';
            const leurres = marche === 'quotient'
                ? [
                    { v: q + 1, why: `${q + 1} × ${b} = ${(q + 1) * b}, c'est PLUS que ${a} : `
                        + 'le quotient est le plus grand nombre de fois qu\'on peut retirer '
                        + `${b}, sans dépasser.` },
                    { v: q - 1, why: `Il reste alors ${a - (q - 1) * b}, qui est plus GRAND `
                        + `que ${b} : on peut encore retirer un ${b}.` },
                    { v: r, why: 'C\'est le RESTE, pas le quotient.' }
                ]
                : [
                    { v: b - r, why: 'C\'est ce qu\'il manque pour atteindre le multiple '
                        + 'suivant, pas ce qui reste.' },
                    { v: r + b, why: `Un reste est toujours PLUS PETIT que le diviseur : `
                        + `${r + b} est plus grand que ${b}, la division n'est pas finie.` },
                    { v: q, why: 'C\'est le QUOTIENT, pas le reste.' }
                ];
            return makeItem({
                ...commun,
                prompt: {
                    text: `Division euclidienne de ${a} par ${b} : quel est le ${mot} ?`,
                    html: `<div class="game-question">Division euclidienne de <b>${a}</b> `
                        + `par <b>${b}</b> : quel est le ${mot}&nbsp;?</div>`,
                    // PAS DE POINTILLÉS DANS L'ÉNONCÉ : la feuille pose
                    // elle-même la place où l'on écrit. Mesuré sur la première
                    // impression — on lisait « le quotient est ⸺ … », deux
                    // emplacements de réponse pour une seule question.
                    papier: `${a} divisé par ${b} : le ${mot} est`
                },
                answer: cherche,
                choices: finalizeChoices(rng, [
                    { value: cherche, label: String(cherche), correct: true },
                    ...leurres.filter(l => l.v !== cherche && l.v >= 0)
                        .map(l => ({ value: l.v, label: String(l.v), why: l.why }))
                ], { count: 4, filler: (rr) => rr.int(1, Math.max(4, q + 3)) }),
                hints: [
                    `Combien de fois ${b} tient-il dans ${a}, sans dépasser ?`,
                    `${b} × ${q} = ${b * q}, et il reste ${r}.`
                ],
                explanation: `${egalite}, et ${r} est bien plus petit que ${b}. `
                    + `Le quotient est ${q}, le reste est ${r}.`
            });
        }

        if (marche === 'egalite') {
            const leurres = [
                { v: `${a} = ${b} × ${q + 1} + ${r}`,
                    why: `${b} × ${q + 1} + ${r} = ${b * (q + 1) + r}, et non ${a}.` },
                { v: `${a} = ${q} × ${b} + ${b}`,
                    why: `Le reste vaut ${b}, c'est-à-dire le diviseur lui-même : `
                        + 'on peut encore retirer un paquet, la division n\'est pas finie.' },
                { v: `${a} = ${b} × ${q}`,
                    why: `Le reste est oublié : ${b} × ${q} = ${b * q}, il manque ${r}.` }
            ];
            return makeItem({
                ...commun,
                prompt: {
                    text: `Quelle égalité traduit la division euclidienne de ${a} par ${b} ?`,
                    html: `<div class="game-question">Quelle égalité traduit la division `
                        + `euclidienne de <b>${a}</b> par <b>${b}</b>&nbsp;?</div>`,
                    // L'ÉGALITÉ S'ÉCRIT EN ENTIER SUR LA LIGNE DE RÉPONSE.
                    // Premier jet : « 38 = ……… × ……… + ……… » dans l'énoncé.
                    // Mesuré sur la feuille : la ligne débordait, le « × »
                    // partait seul au bord droit et le « + ……… » tombait à la
                    // ligne suivante. Trois emplacements à trous ne tiennent
                    // pas dans un énoncé numéroté.
                    papier: `Écris l'égalité de la division euclidienne de ${a} par ${b}`
                },
                answer: egalite,
                choices: finalizeChoices(rng, [
                    { value: egalite, label: egalite, correct: true },
                    ...leurres.map(l => ({ value: l.v, label: l.v, why: l.why }))
                ], { count: 4, filler: () => `${a} = ${b} × ${q} + ${b + 1}` }),
                hints: [
                    'L\'égalité s\'écrit « dividende = diviseur × quotient + reste ».',
                    `Et le reste doit être plus PETIT que le diviseur ${b}.`
                ],
                explanation: `${egalite}, avec 0 ⩽ ${r} < ${b} : c'est cette dernière `
                    + 'condition qui rend le couple unique.'
            });
        }

        // LE LIEN AVEC LES FRACTIONS. C'est la marche qui donne son sens à tout
        // le reste : 47/6 n'est pas « 7 et des poussières », c'est 7 + 5/6.
        const bonne = `${q} + ${r}/${b}`;
        const etiq = (n, d, entier) => (entier === undefined
            ? fractionHtml(n, d)
            : `${entier} + ${fractionHtml(n, d)}`);
        const leurres = [
            { v: `${q} + ${b}/${r}`, html: etiq(b, r, q),
                why: 'Le reste et le diviseur sont échangés : c\'est le RESTE qui passe '
                    + 'au numérateur, et le diviseur reste en bas.' },
            { v: `${r} + ${q}/${b}`, html: etiq(q, b, r),
                why: 'Le quotient et le reste sont échangés.' },
            { v: `${q} + ${r}/${a}`, html: etiq(r, a, q),
                why: `Le dénominateur est le DIVISEUR (${b}), pas le dividende.` }
        ];
        return makeItem({
            ...commun,
            prompt: {
                text: `Écris ${a}/${b} sous la forme « entier + fraction ».`,
                html: `<div class="game-question">Écris ${fractionHtml(a, b)} sous la `
                    + 'forme «&nbsp;entier + fraction&nbsp;».</div>',
                papier: `Écris ${a}/${b} sous la forme « un entier plus une fraction »`
            },
            answer: bonne,
            choices: finalizeChoices(rng, [
                { value: bonne, label: etiq(r, b, q), correct: true },
                ...leurres.map(l => ({ value: l.v, label: l.html, why: l.why }))
            ], { count: 4, filler: () => `${q + 1} + ${r}/${b}` }),
            hints: [
                `Fais d'abord la division euclidienne : ${egalite}.`,
                `${a} paquets de ${b}, c'est ${q} entiers, et il reste ${r} sur ${b}.`
            ],
            explanation: `${egalite}, donc ${a}/${b} = ${q} + ${r}/${b}. `
                + 'Le quotient devient la partie entière, le reste le numérateur, '
                + 'et le diviseur reste au dénominateur.'
        });
    }
};
