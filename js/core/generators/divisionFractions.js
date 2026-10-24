// DIVISER PAR UNE FRACTION — niveau quatrième.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, progression de quatrième : « Multiplication et division de fraction ».
// Mesuré avant d'écrire : multiplier existe (« Multiplier des Fractions »,
// « Poser un Produit de Fractions »), DIVISER n'existe qu'en SECONDE, dans la
// leçon « 8. Diviser par une fraction » du calcul fractionnaire. Rien pour la
// quatrième, qui est pourtant l'année où la règle s'apprend.
//
// Puis : « il faut que ce soit simple beau progressif et qu on puisse
// imprimer ». Les quatre mots commandent ce fichier.
//
// ── SIMPLE : UNE QUESTION POSE UNE CHOSE ───────────────────────────────────
//
// Diviser par une fraction demande DEUX gestes : retourner le diviseur, puis
// multiplier. Un élève qui se trompe rate presque toujours le premier — il
// retourne la mauvaise fraction, ou il retourne les deux. Le temps A ne fait
// donc QUE retourner, sans diviser une seule fois.
//
// ── PROGRESSIF : L'INVERSE D'UN ENTIER EST UNE MARCHE À LUI SEUL ───────────
//
// « L'inverse de 4 » est le piège du chapitre. L'élève qui sait retourner 3/5
// bloque devant 4, parce qu'il ne voit pas de fraction à retourner — il faut
// d'abord LIRE 4 comme 4/1. C'est une idée, pas une technique, et elle mérite
// sa marche.
//
// ── ET AUCUN RÉSULTAT NE SE SIMPLIFIE ──────────────────────────────────────
//
// Même décision que pour les probabilités, et pour la même raison : 8/12 et
// 2/3 sont tous les deux justes, le logiciel doit en choisir un, et quel que
// soit son choix la moitié des élèves qui ont raison seraient comptés faux.
// Les divisions sont donc ÉCRITES, et chacune a été vérifiée irréductible —
// une épreuve le revérifie, parce qu'une liste écrite à la main se corrige un
// jour sans qu'on y repense.
//
// Pur : aucune dépendance au DOM, il se teste sous Node.

import { makeItem, finalizeChoices } from '../items.js';
import {
    paramMarches, marchesCochees, marcheAuRang, conseilProgression, totalDe
} from '../progression.js';
import { pgcd } from '../arithmetique.js';

const S_DIVISION = 'num.frac.division';
const S_INVERSE = 'num.frac.inverse';

const choisir = (liste, rng) => liste[rng.int(0, liste.length - 1)];

/** Une case à remplir — voir `aTrous` dans core/activities/numeric.js. */
const trou = (i) => `<u class="np-trou" data-trou="${i}">&nbsp;?&nbsp;</u>`;

/** Une fraction empilée, écrite : jamais à la barre oblique à l'écran. */
const fraction = (n, d) => '<span class="fraction frac-dans-texte">'
    + `<span class="fraction-num">${n}</span>`
    + `<span class="fraction-den">${d}</span></span>`;

/** La fraction à remplir, numérateur sur dénominateur. */
const fractionATrous = (i = 0) => '<span class="fraction fraction--grande">'
    + `<span class="fraction-num">${trou(i)}</span>`
    + `<span class="fraction-den">${trou(i + 1)}</span></span>`;

/**
 * LA LIGNE ENTIÈRE, DE LA DIVISION AU RÉSULTAT — ET C'EST RÉMY QUI L'A
 * DEMANDÉE.
 *
 * « Il faudrait forcer l'élève quand on fait 3/4 : 5/6 à aller à la ligne et
 * que l'on puisse écrire 3/4 * 6/5. »
 *
 * IL A RAISON, ET LA RAISON EST DE MÉTIER : le geste du chapitre est la
 * TRANSFORMATION, pas le résultat. Un élève qui écrit directement 18/20 a
 * peut-être retourné la bonne fraction — ou les deux, ou la mauvaise — et on
 * ne le saura jamais. La ligne « 3/4 × 6/5 » EST la réponse qu'on évalue ;
 * celle d'après n'est plus qu'un produit, qu'il sait faire depuis la cinquième.
 *
 * SIX CASES, et c'est le prix. La première fraction se RECOPIE — c'est elle
 * qu'on ne retourne pas, et la recopier est une décision, pas une corvée.
 */
const ligneDeDivision = (a, b, c, d) =>
    '<span class="pp-ligne-division">'
    + `${fraction(a, b)} ÷ ${fraction(c, d)} = ${fractionATrous(0)}`
    + ` × ${fractionATrous(2)} = ${fractionATrous(4)}</span>`;

// ── LES NOMBRES, ÉCRITS ET NON TIRÉS ───────────────────────────────────────
//
// Chaque quadruplet [a, b, c, d] donne (a/b) ÷ (c/d) dont le résultat est
// IRRÉDUCTIBLE. Ils ont été calculés puis recopiés ici, et une épreuve les
// revérifie : une liste écrite à la main se corrige un jour sans qu'on y
// repense, et le jour où un résultat se simplifiera, deux écritures seront
// justes.
//
// LES DEUX FRACTIONS SONT INFÉRIEURES À 1, et c'est la surprise du chapitre :
// diviser par un nombre plus petit que 1 rend un résultat PLUS GRAND que le
// dividende. Un élève qui trouve plus petit s'est trompé de sens.
export const DIVISIONS = [
    [2, 3, 3, 4],   // 2/3 ÷ 3/4 = 8/9
    [2, 3, 3, 5],   // 2/3 ÷ 3/5 = 10/9
    [2, 3, 3, 7],   // 2/3 ÷ 3/7 = 14/9
    [2, 3, 5, 7],   // 2/3 ÷ 5/7 = 14/15
    [2, 3, 5, 8],   // 2/3 ÷ 5/8 = 16/15
    [2, 3, 7, 8],   // 2/3 ÷ 7/8 = 16/21
    [2, 5, 5, 6],   // 2/5 ÷ 5/6 = 12/25
    [2, 5, 5, 9],   // 2/5 ÷ 5/9 = 18/25
    [2, 5, 7, 9],   // 2/5 ÷ 7/9 = 18/35
    [3, 4, 2, 3],   // 3/4 ÷ 2/3 = 9/8
    [3, 4, 2, 5],   // 3/4 ÷ 2/5 = 15/8
    [3, 4, 2, 7],   // 3/4 ÷ 2/7 = 21/8
    [3, 4, 4, 5],   // 3/4 ÷ 4/5 = 15/16
    [3, 4, 4, 7],   // 3/4 ÷ 4/7 = 21/16
    [3, 4, 8, 9],   // 3/4 ÷ 8/9 = 27/32
    [5, 6, 6, 7],   // 5/6 ÷ 6/7 = 35/36
    [4, 5, 3, 4],   // 4/5 ÷ 3/4 = 16/15
    [5, 8, 2, 3],   // 5/8 ÷ 2/3 = 15/16
    [7, 9, 2, 5]    // 7/9 ÷ 2/5 = 35/18
];

/** (a/b) ÷ n = a / (b×n) — et le résultat ne se simplifie pas non plus. */
export const PAR_UN_ENTIER = [
    [3, 4, 5],   // 3/4 ÷ 5 = 3/20
    [2, 3, 5],   // 2/3 ÷ 5 = 2/15
    [5, 6, 7],   // 5/6 ÷ 7 = 5/42
    [5, 8, 3],   // 5/8 ÷ 3 = 5/24
    [7, 9, 2],   // 7/9 ÷ 2 = 7/18
    [4, 5, 3],   // 4/5 ÷ 3 = 4/15
    [2, 7, 3],   // 2/7 ÷ 3 = 2/21
    [5, 7, 2],   // 5/7 ÷ 2 = 5/14
    [3, 8, 5],   // 3/8 ÷ 5 = 3/40
    [7, 8, 3]    // 7/8 ÷ 3 = 7/24
];

/**
 * n ÷ (c/d) = n×d/c, et LE RÉSULTAT EST UN ENTIER.
 *
 * C'est la marche qui fait voir la règle : on divise, et le résultat est plus
 * GRAND que le nombre de départ. Un entier au bout rend la surprise lisible —
 * « 6 divisé par quelque chose fait 9 » se retient.
 */
export const ENTIER_PAR = [
    [6, 2, 3],   // 6 ÷ 2/3 = 9
    [8, 2, 5],   // 8 ÷ 2/5 = 20
    [10, 2, 7],  // 10 ÷ 2/7 = 35
    [12, 3, 5],  // 12 ÷ 3/5 = 20
    [6, 3, 4],   // 6 ÷ 3/4 = 8
    [8, 4, 7],   // 8 ÷ 4/7 = 14
    [9, 3, 2],   // 9 ÷ 3/2 = 6
    [15, 5, 4],  // 15 ÷ 5/4 = 12
    [10, 5, 3],  // 10 ÷ 5/3 = 6
    [12, 4, 3]   // 12 ÷ 4/3 = 9
];

/** Des fractions irréductibles, pour la marche « quel est l'inverse ? ». */
export const A_RETOURNER = [
    [2, 3], [3, 5], [4, 7], [5, 6], [3, 8], [7, 9], [2, 9], [5, 4], [7, 3], [9, 2]
];

// ── LES HABILLAGES DU PROBLÈME ─────────────────────────────────────────────
//
// « Combien de parts de a/b dans n ? » est LE problème qui justifie la
// division par une fraction, et c'est celui qu'on ne reconnaît pas : on y
// cherche spontanément une multiplication, parce que le résultat est plus
// grand. Trois habillages, pour qu'on apprenne le raisonnement et non le mot.
// CHAQUE PHRASE REÇOIT SA FAÇON D'ÉCRIRE LA FRACTION, et c'est la seule façon
// de tenir la règle de Rémy — « écris TOUJOURS les fractions en colonne » —
// sans mettre du HTML dans le texte nu. Le même habillage sert deux fois : à
// l'écran avec la fraction empilée, sur le papier et à la lecture à voix haute
// avec la barre oblique, que le rendu de la feuille sait empiler tout seul.
const PARTAGES = [
    { quoi: 'bouteilles', unite: 'L', matiere: 'de jus', verbe: 'remplir',
        phrase: (n, f) => `On veut remplir des bouteilles de ${f} de litre `
            + `avec ${n} litres de jus.` },
    { quoi: 'morceaux', unite: 'm', matiere: 'de ruban', verbe: 'couper',
        phrase: (n, f) => `Un ruban de ${n} mètres est coupé en morceaux de `
            + `${f} de mètre.` },
    // « sachets » ET NON « parts » : le mot de la correction doit être celui
    // de l'énoncé. Lu sur la sortie : « On range 6 kilogrammes de farine en
    // SACHETS […] 6 ÷ 3/4 = 8 PARTS ».
    { quoi: 'sachets', unite: 'kg', matiere: 'de farine', verbe: 'faire',
        phrase: (n, f) => `On range ${n} kilogrammes de farine en sachets de `
            + `${f} de kilogramme.` }
];

// ── LES SEPT MARCHES ───────────────────────────────────────────────────────

export const ETAPES = [
    { id: 'inverse', temps: 'A', titre: 'L\'inverse d\'une fraction', skill: S_INVERSE },
    { id: 'inverse-entier', temps: 'A', titre: 'L\'inverse d\'un entier', skill: S_INVERSE },
    { id: 'produit-un', temps: 'A', titre: 'Le produit qui fait 1', skill: S_INVERSE },
    { id: 'par-un-entier', temps: 'B', titre: 'Diviser par un entier', skill: S_DIVISION },
    { id: 'par-une-fraction', temps: 'B', titre: 'Diviser par une fraction', skill: S_DIVISION },
    { id: 'entier-par', temps: 'B', titre: 'Un entier divisé par une fraction', skill: S_DIVISION },
    { id: 'probleme', temps: 'C', titre: 'Problème : combien de parts ?', skill: S_DIVISION }
];

const TEMPS = {
    A: 'A — retourner, sans diviser',
    B: 'B — diviser',
    C: 'C — s\'en servir'
};

/**
 * SUR LE PAPIER, ON ÉCRIT LA LIGNE À COMPLÉTER — pas une question suivie
 * de deux lignes vides.
 *
 * RÉMY, carnet du 24 octobre :
 *
 *   « Pour la feuille à imrpimer écris juste inverse de 7/3 : ..../....
 *     Pas deux lignes en dessous.
 *     Pour une division simple tu écris :
 *     3/2 : 6/7 = .../... * .../.... = »
 *
 * CE QUE LA FEUILLE FAISAIT : « Quel est l'inverse de 9/2 ? » et, dessous,
 * deux longues lignes de pointillés. Deux lignes ne demandent pas une
 * fraction, elles demandent une phrase — et l'élève y écrit « 2/9 » en
 * travers, ou pire, un nombre à virgule. LA FORME DE LA PLACE À REMPLIR
 * ENSEIGNE CE QU'ON ATTEND : c'est la même leçon que la droite graduée,
 * le même jour, dans le même carnet.
 *
 * COMMENT ON L'ÉCRIT : « …/… » suffit. La mise en page reconnaît un étage
 * de fraction vide (voir ETAGE dans core/fiche.js) et empile les deux
 * cases sous une barre. On ne dessine rien ici, on écrit la ligne.
 *
 * L'ÉCRAN NE BOUGE PAS. Il pose la question en toutes lettres et offre un
 * pavé : c'est sa forme à lui, et elle est juste.
 */

/** Une question d'une marche : l'énoncé, la réponse, la correction. */
export function question(etape, rng) {

    // ── TEMPS A : RETOURNER, SANS DIVISER ──────────────────────────────────

    if (etape.id === 'inverse') {
        const [a, b] = choisir(A_RETOURNER, rng);
        return {
            question: `Quel est l'inverse de ${a}/${b} ?`,
            questionHtml: `Quel est l'inverse de ${fraction(a, b)} ?`,
            papier: `Inverse de ${a}/${b} : …/…`,
            htmlReponse: fractionATrous(),
            kind: 'numeric', reponse: `${b}|${a}`, cases: 2,
            pourquoi: `On RETOURNE la fraction : l'inverse de ${a}/${b} est ${b}/${a}. `
                + `Pour vérifier, on multiplie : ${a}/${b} × ${b}/${a} = ${a * b}/${a * b} = 1.`,
            aide: 'L\'inverse d\'une fraction se lit à l\'envers : le numérateur passe en bas, '
                + 'le dénominateur passe en haut. Rien d\'autre ne change — ni les nombres, '
                + 'ni le signe.'
        };
    }

    if (etape.id === 'inverse-entier') {
        // LE PIÈGE DU CHAPITRE, ET IL A SA MARCHE. L'élève qui retourne 3/5
        // sans hésiter bloque devant 4 : il ne voit pas de fraction à
        // retourner. Il faut d'abord LIRE 4 comme 4/1, et c'est une idée, pas
        // une technique.
        const n = rng.int(2, 9);
        return {
            question: `Quel est l'inverse de ${n} ?`,
            papier: `Inverse de ${n} : …/…`,
            htmlReponse: fractionATrous(),
            kind: 'numeric', reponse: `1|${n}`, cases: 2,
            pourquoi: `${n} s'écrit ${n}/1 — tout nombre entier est une fraction de `
                + `dénominateur 1. On la retourne : l'inverse de ${n} est 1/${n}. `
                + `Et ${n} × 1/${n} = 1.`,
            aide: 'IL Y A BIEN UNE FRACTION À RETOURNER, même si on ne la voit pas : tout '
                + 'entier n s\'écrit n/1. Son inverse est donc 1/n.'
        };
    }

    if (etape.id === 'produit-un') {
        // POURQUOI ON L'APPELLE « INVERSE ». Deux nombres sont inverses l'un
        // de l'autre quand leur produit vaut 1 — c'est la définition, et elle
        // explique pourquoi retourner une fraction sert à diviser.
        const [a, b] = choisir(A_RETOURNER, rng);
        return {
            enonce: '',
            question: `Par quelle fraction faut-il multiplier ${a}/${b} pour obtenir 1 ?`,
            questionHtml: `Par quelle fraction faut-il multiplier ${fraction(a, b)} `
                + 'pour obtenir 1 ?',
            // SUR LE PAPIER, LA QUESTION EST L'ÉGALITÉ. « Par quelle fraction
            // faut-il multiplier 2/3 pour obtenir 1 ? » tient en deux lignes et
            // demande une phrase ; « 2/3 × …/… = 1 » tient en une et demande
            // exactement ce qu'on veut lire.
            papier: `${a}/${b} × …/… = 1`,
            htmlReponse: fractionATrous(),
            kind: 'numeric', reponse: `${b}|${a}`, cases: 2,
            pourquoi: `${a}/${b} × ${b}/${a} = ${a * b}/${a * b} = 1. Deux nombres dont le `
                + 'produit vaut 1 sont dits INVERSES l\'un de l\'autre — c\'est de là que '
                + 'vient le mot.',
            aide: 'On multiplie les numérateurs entre eux et les dénominateurs entre eux. '
                + 'Pour que le haut et le bas soient égaux, il faut que la seconde fraction '
                + 'soit la première à l\'envers.'
        };
    }

    // ── TEMPS B : DIVISER ──────────────────────────────────────────────────

    if (etape.id === 'par-un-entier') {
        const [a, b, n] = choisir(PAR_UN_ENTIER, rng);
        return {
            question: `Calcule ${a}/${b} ÷ ${n}.`,
            questionHtml: `Calcule ${fraction(a, b)} ÷ ${n}.`,
            papier: `${a}/${b} ÷ ${n} = …/…`,
            htmlReponse: fractionATrous(),
            kind: 'numeric', reponse: `${a}|${b * n}`, cases: 2,
            pourquoi: `Diviser par ${n}, c'est multiplier par 1/${n} : `
                + `${a}/${b} × 1/${n} = ${a}/${b * n}.`,
            aide: 'DIVISER PAR UN NOMBRE, C\'EST MULTIPLIER PAR SON INVERSE. L\'inverse de '
                + 'l\'entier n est 1/n : seul le dénominateur change.'
        };
    }

    if (etape.id === 'par-une-fraction') {
        const [a, b, c, d] = choisir(DIVISIONS, rng);
        const n = a * d, m = b * c;
        return {
            // ON ÉCRIT LA LIGNE ENTIÈRE, ET L'ON NE PEUT PAS LA SAUTER. Rémy :
            // « Il faudrait forcer l'élève […] à aller à la ligne et que l'on
            // puisse écrire 3/4 * 6/5. » Les deux premières fractions à
            // remplir SONT la transformation — la première recopiée, la
            // seconde retournée —, et c'est elle qu'on évalue : le produit qui
            // suit, il sait le faire depuis la cinquième.
            question: `Calcule ${a}/${b} ÷ ${c}/${d}. Écris d'abord la multiplication `
                + 'qui la remplace.',
            questionHtml: `Calcule ${fraction(a, b)} ÷ ${fraction(c, d)}. `
                + 'Écris d\'abord la multiplication qui la remplace.',
            // LA LIGNE QU'IL A ÉCRITE DANS SON CARNET, mot pour mot :
            // « 3/2 : 6/7 = .../... * .../.... = ». Les trois fractions vides
            // sont les trois cases de la réponse — la première recopiée, la
            // seconde retournée, le résultat — et c'est la transformation
            // qu'on évalue, pas le produit.
            papier: `${a}/${b} ÷ ${c}/${d} = …/… × …/… = …/…`,
            htmlReponse: ligneDeDivision(a, b, c, d),
            kind: 'numeric', reponse: `${a}|${b}|${d}|${c}|${n}|${m}`,
            pourquoi: `On garde la première et l'on multiplie par l'INVERSE de la seconde : `
                + `${a}/${b} ÷ ${c}/${d} = ${a}/${b} × ${d}/${c} = ${n}/${m}.`,
            aide: 'ON NE RETOURNE QUE LA SECONDE. La première se RECOPIE telle quelle — la '
                + 'retourner, ou retourner les deux, sont les deux fautes du chapitre. '
                + 'Écris la multiplication en entier AVANT de calculer : c\'est elle qu\'on '
                + 'regarde.'
        };
    }

    if (etape.id === 'entier-par') {
        const [n, c, d] = choisir(ENTIER_PAR, rng);
        const r = (n * d) / c;
        const plusGrand = c < d;
        return {
            question: `Calcule ${n} ÷ ${c}/${d}.`,
            questionHtml: `Calcule ${n} ÷ ${fraction(c, d)}.`,
            kind: 'numeric', reponse: r,
            pourquoi: `${n} ÷ ${c}/${d} = ${n} × ${d}/${c} = ${n * d}/${c} = ${r}. `
                + (plusGrand
                    ? `Et le résultat est PLUS GRAND que ${n} : c'est normal, on a divisé par `
                        + `un nombre plus petit que 1.`
                    : `Et le résultat est plus petit que ${n} : on a divisé par un nombre plus `
                        + `grand que 1.`),
            aide: 'DIVISER NE REND PAS TOUJOURS PLUS PETIT. Quand on divise par un nombre '
                + 'inférieur à 1, le résultat est plus GRAND — « combien de demis dans 3 ? » '
                + 'en fait six.'
        };
    }

    // 'probleme'
    const h = choisir(PARTAGES, rng);
    const [n, c, d] = choisir(ENTIER_PAR.filter(([, cc, dd]) => cc < dd), rng);
    const r = (n * d) / c;
    return {
        enonce: h.phrase(n, `${c}/${d}`),
        enonceHtml: h.phrase(n, fraction(c, d)),
        question: `Combien peut-on en ${h.verbe} ?`,
        kind: 'numeric', reponse: r,
        pourquoi: `On cherche combien de fois ${c}/${d} tient dans ${n} : c'est une DIVISION. `
            + `${n} ÷ ${c}/${d} = ${n} × ${d}/${c} = ${r} ${h.quoi}.`,
        aide: 'LA QUESTION « COMBIEN DE FOIS CECI TIENT-IL DANS CELA ? » EST UNE DIVISION, '
            + 'même quand la réponse est plus grande que le nombre de départ. C\'est ce qui '
            + 'trompe : on cherche une multiplication parce que le résultat grandit.'
    };
}

const MOT = 'marche';
const LISTE_MARCHES = ETAPES.map((e, i) => ({ id: e.id, nom: `${i + 1}. ${e.titre}`, groupe: e.temps }));
const DIFFICULTE = { A: 1, B: 2, C: 3 };

export const divisionFractionsGenerator = {
    id: 'frac.division',
    label: 'Diviser par une fraction',
    skills: [S_INVERSE, S_DIVISION],
    answerKinds: ['numeric'],
    ecrit: true,
    // SUR LE PAPIER, UNE FRACTION S'EMPILE — numérateur sur dénominateur. Sans
    // ce drapeau la feuille écrirait « 3/4 ÷ 2/3 » à la barre oblique, ce qui
    // est l'écriture d'écran et non celle du cahier.
    fractions: true,
    conseil: (p) => conseilProgression(marchesCochees(p, LISTE_MARCHES).length),
    params: [paramMarches({ marches: LISTE_MARCHES, groupes: TEMPS, mot: MOT })],

    generate(params, ctx) {
        const rng = ctx.rng;
        const id = marcheAuRang(ctx.index ?? 0, marchesCochees(params, LISTE_MARCHES),
            totalDe(ctx, params), params);
        const etape = ETAPES.find(e => e.id === id) || ETAPES[0];
        const q = question(etape, rng);
        const choix = q.kind === 'choice'
            ? finalizeChoices(rng, q.choix.map(c => ({
                value: c, label: String(c), correct: c === q.reponse
            })), { count: q.choix.length })
            : null;

        const enonce = q.enonce || '';
        return makeItem({
            seed: rng.seed,
            generatorId: 'frac.division',
            skillId: etape.skill,
            answerKind: q.kind,
            prompt: {
                // L'ÉNONCÉ FINIT PAR UN POINT : sur la feuille il est collé à la
                // question, et sans lui le dernier nombre se lirait comme le
                // premier mot de la question.
                text: `${enonce} ${q.question}`.trim(),
                papier: `${enonce} ${q.papier || q.question}`.trim(),
                html: '<div class="game-question ap-probleme">'
                    + (enonce
                        ? `<span class="ap-situation">${q.enonceHtml || enonce}</span>` : '')
                    + `<span class="ap-question">${q.questionHtml || q.question}</span>`
                    + (q.htmlReponse ? `<span class="pp-reponse">${q.htmlReponse}</span>` : '')
                    + '</div>'
            },
            answer: q.reponse,
            choices: choix,
            hints: [
                q.aide,
                'Écris la division en deux temps : d\'abord le produit par l\'inverse, '
                    + 'ensuite seulement le calcul. Tout faire d\'un coup, c\'est se tromper '
                    + 'de fraction à retourner.'
            ],
            explanation: q.pourquoi,
            difficulty: DIFFICULTE[etape.temps] || 2,
            meta: {
                marche: etape.id, temps: etape.temps, titre: etape.titre,
                decimal: false,
                ...(q.cases ? { cases: q.cases } : {})
            }
        });
    }
};

export default divisionFractionsGenerator;
