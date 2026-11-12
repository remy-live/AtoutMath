// MULTIPLIER PAR UNE PUISSANCE DE 10 — cinq marches, dans l'ordre.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, en préparant son chapitre : « je ne crois pas qu'il y ait des calculs
// du genre 5 × 10² ou 6 × 10⁻⁵ etc. »
//
// IL AVAIT RAISON, ET C'EST MESURÉ. Le chapitre portait quatre exercices —
// reconnaître, transformer, les préfixes, les règles de calcul — et aucun ne
// pose ce calcul-là :
//
//   · `num.puissances-transformer` demande « écris 3,47 × 10⁴ sans puissance
//     de 10 ». C'est le même geste, mais il tire TOUJOURS deux ou trois
//     chiffres significatifs : jamais « 5 × 10² », jamais un entier seul. Et
//     il le présente comme un changement d'ÉCRITURE, pas comme un calcul ;
//   · `num.puissances-calcul` travaille 10⁵ × 10³ = 10⁸ — des puissances
//     SEULES, sans nombre devant. Le jour où il y en a un, l'élève ne sait pas
//     quoi en faire.
//
// ── CE QUE CET EXERCICE AJOUTE, ET POURQUOI DANS CET ORDRE ────────────────
//
// 1. EFFECTUER, exposant positif. 5 × 10² = 500. Le geste minimal, celui qui
//    doit devenir un réflexe avant tout le reste.
// 2. EFFECTUER, exposant négatif. 6 × 10⁻⁵ = 0,000 06. Séparé du premier parce
//    que c'est là que tout se joue : l'élève qui a compris « on ajoute des
//    zéros » en ajoute au mauvais bout.
// 3. RETROUVER L'EXPOSANT. 4 500 = 4,5 × 10… ? Le chemin inverse, qui est
//    celui qu'on fait vraiment en physique quand on lit une mesure.
// 4. LE PRODUIT DE DEUX ÉCRITURES. (3 × 10⁴) × (2 × 10⁻⁶). C'est le « etc. »
//    de Rémy : le moment où les deux règles — celle des nombres et celle des
//    exposants — se rencontrent, et où l'on voit qui a compris laquelle.
// 5. LE QUOTIENT. (6 × 10⁵) ÷ (3 × 10²).
//
// ── LA FAUTE QU'ON FABRIQUE EXPRÈS, À CHAQUE MARCHE ───────────────────────
//
// Aux marches 1 et 2, le distracteur principal déplace la virgule DANS LE
// MAUVAIS SENS : c'est la faute de l'élève qui a retenu « exposant négatif,
// donc nombre négatif » ou « on ajoute toujours des zéros à droite ».
// Aux marches 4 et 5, il APPLIQUE L'OPÉRATION AUX EXPOSANTS — 10⁴ × 10⁻⁶ qui
// donnerait 10⁻²⁴ — parce que le signe × est écrit sous les yeux de l'élève et
// qu'il l'applique à ce qu'il voit. C'est la même faute que le chapitre
// voisin documente, et elle mérite d'être piégée deux fois.

import { makeItem, finalizeChoices } from '../items.js';
import {
    paramMarches, marchesCochees, marcheAuRang, conseilProgression, totalDe
} from '../progression.js';
import {
    puissanceTexte, decimaleDe, scientifiqueTexte, mantisseTexte,
    versScientifique, grouper
} from '../puissances.js';

/** Tout ce qui s'AFFICHE passe par là : 0,00006 se lit 0,000 06. */
const aff = grouper;

/** Combien de questions par marche avant de monter, sauf réglage contraire. */
const PAR_MARCHE = 3;

/** Les cinq marches, dans l'ordre où elles se travaillent. */
export const MARCHES_PRODUIT = [
    { id: 'effectuerGrand', nom: '1. Effectuer : 5 × 10²' },
    { id: 'effectuerPetit', nom: '2. Effectuer : 6 × 10⁻⁵' },
    { id: 'retrouver', nom: '3. Retrouver l\'exposant' },
    { id: 'produit', nom: '4. Le produit de deux écritures' },
    { id: 'quotient', nom: '5. Le quotient de deux écritures' }
];

/**
 * UNE MANTISSE QUI RESSEMBLE À CELLES DE RÉMY : « 5 », « 6 », « 4,5 ».
 *
 * UN CHIFFRE LE PLUS SOUVENT, ET C'EST TOUT L'OBJET DE L'EXERCICE : son
 * reproche portait sur « 5 × 10² », pas sur « 3,47 × 10⁴ » que l'exercice
 * voisin tire déjà. Une mantisse à deux chiffres revient une fois sur trois,
 * pour que le cas ne disparaisse pas non plus.
 */
function tirerMantisse(rng) {
    return rng.bool(0.34)
        ? `${rng.int(1, 9)}${rng.int(1, 9)}`
        : String(rng.int(2, 9));
}

/**
 * UN NOMBRE RELATIF ÉCRIT AVEC LE VRAI SIGNE MOINS.
 *
 * `${-6}` rend « -6 » avec un tiret de clavier, et le dépôt a une épreuve qui
 * le refuse dans un énoncé — à juste titre : le tiret et le signe moins ne se
 * ressemblent qu'à l'écran d'un adulte. MESURÉ : mon explication écrivait
 * « 10^(-6 + (−5)) », avec les DEUX signes dans la même parenthèse, ce qui est
 * exactement ce que cette épreuve existe pour empêcher.
 */
const relatif = (n) => (n < 0 ? `\u2212${-n}` : String(n));

/** Les exposants qu'on rencontre vraiment : ni 10¹, ni 10¹⁵. */
const GRANDS = [2, 3, 4, 5, 6];
const PETITS = [-2, -3, -4, -5, -6];

// --- Marches 1 et 2 : effectuer -----------------------------------------------

function etapeEffectuer(rng, positif) {
    const chiffres = tirerMantisse(rng);
    const n = rng.pick(positif ? GRANDS : PETITS);
    const ecriture = scientifiqueTexte(chiffres, n);
    const bonne = decimaleDe(chiffres, 1, n);
    return {
        prompt: `Calcule ${ecriture}.`,
        html: `<div class="game-question">Calcule <span class="nb-highlight">${ecriture}</span>.</div>`,
        answer: bonne,
        choices: [
            { value: bonne, correct: true },
            // LA VIRGULE PART DU MAUVAIS CÔTÉ : la faute de celui qui a retenu
            // un sens et pas l'autre. C'est le distracteur qui compte.
            { value: decimaleDe(chiffres, 1, -n),
                why: `L'exposant vaut ${n} : la virgule va vers la ${
                    positif ? 'DROITE' : 'GAUCHE'}, donc le nombre devient plus ${
                    positif ? 'grand' : 'petit'}.` },
            { value: decimaleDe(chiffres, 1, n + (positif ? 1 : -1)),
                why: 'Un rang de trop : recompte les déplacements de la virgule.' },
            { value: decimaleDe(chiffres, 1, n + (positif ? -1 : 1)),
                why: 'Un rang de trop peu : recompte les déplacements de la virgule.' }
        ],
        explanation: `${ecriture} = ${aff(bonne)}. Multiplier par ${puissanceTexte(n)}, `
            + `c'est déplacer la virgule de ${Math.abs(n)} rangs vers la `
            + `${positif ? 'droite' : 'gauche'}, en complétant par des zéros.`,
        hints: [
            `${puissanceTexte(n)} déplace la virgule de ${Math.abs(n)} rangs.`,
            positif
                ? 'Exposant positif : le nombre GRANDIT, la virgule va à droite.'
                : 'Exposant négatif : le nombre RAPETISSE, la virgule va à gauche. '
                  + 'Attention : il ne devient pas négatif pour autant.'
        ],
        difficulty: positif ? 1 : 2
    };
}

// --- Marche 3 : retrouver l'exposant -----------------------------------------

function etapeRetrouver(rng) {
    const chiffres = tirerMantisse(rng);
    const n = rng.pick(rng.bool() ? GRANDS : PETITS);
    const decimal = decimaleDe(chiffres, 1, n);
    const gauche = `${aff(decimal)} = ${mantisseTexte(chiffres)} × 10`;
    return {
        prompt: `${aff(decimal)} = ${mantisseTexte(chiffres)} × 10 puissance combien ?`,
        html: `<div class="game-question">${gauche}<sup>?</sup></div>`,
        answer: puissanceTexte(n),
        choices: [
            { value: puissanceTexte(n), correct: true },
            { value: puissanceTexte(-n),
                why: `${aff(decimal)} est plus ${n > 0 ? 'grand' : 'petit'} que `
                    + `${mantisseTexte(chiffres)} : l'exposant est donc `
                    + `${n > 0 ? 'positif' : 'négatif'}.` },
            { value: puissanceTexte(n + 1), why: 'Un rang de trop : recompte.' },
            { value: puissanceTexte(n - 1), why: 'Un rang de trop peu : recompte.' }
        ],
        explanation: `${aff(decimal)} = ${scientifiqueTexte(chiffres, n)}. `
            + `Pour passer de ${mantisseTexte(chiffres)} à ${aff(decimal)}, la virgule `
            + `se déplace de ${Math.abs(n)} rangs vers la ${n > 0 ? 'droite' : 'gauche'}.`,
        hints: ['Compte les rangs entre la virgule de départ et celle d\'arrivée.',
            'Le nombre a-t-il grandi ou rapetissé ? C\'est cela qui donne le SIGNE.'],
        difficulty: 2
    };
}

// --- Marches 4 et 5 : produit et quotient ------------------------------------

/**
 * LE PRODUIT ET LE QUOTIENT DE DEUX ÉCRITURES.
 *
 * ON NE RÉÉCRIT PAS LE RÉSULTAT EN SCIENTIFIQUE DE FORCE. Les nombres sont
 * choisis pour que la mantisse du résultat reste entre 1 et 10 — 3 × 2 = 6,
 * 6 ÷ 3 = 2 — et la réponse attendue est donc toujours « a × 10ⁿ » avec un
 * seul chiffre devant. C'est volontaire : ce qu'on travaille ici, c'est que
 * les NOMBRES se multiplient entre eux et les EXPOSANTS s'ajoutent, pas la
 * remise en forme, qui a son exercice à elle.
 */
/**
 * QUATRE CHOIX, QUOI QU'IL ARRIVE.
 *
 * Les fautes types se ressemblent parfois au point de tomber sur la même
 * valeur, ou sur la bonne réponse. On les dédoublonne, puis on complète par
 * des exposants voisins — toujours distincts, et plausibles : c'est la faute
 * de celui qui a compté un rang de travers.
 */
function completerQuatre(liste, mantisse, exposant) {
    const vus = new Set();
    const out = [];
    for (const c of liste) {
        const cle = String(c.value);
        if (vus.has(cle)) continue;
        vus.add(cle);
        out.push(c);
    }
    for (const d of [1, -1, 2, -2, 3, -3]) {
        if (out.length >= 4) break;
        const v = scientifiqueTexte(String(mantisse), exposant + d);
        if (vus.has(v)) continue;
        vus.add(v);
        out.push({ value: v, why: 'Un rang de travers : recompte les exposants.' });
    }
    return out;
}

function etapeCombiner(rng, produit) {
    // DES MANTISSES QUI TOMBENT JUSTE, pour que le calcul ne soit jamais le
    // sujet : c'est la RÈGLE qu'on regarde.
    // [2, 2] A ÉTÉ RETIRÉE DES PAIRES DU PRODUIT, et c'est une vraie
    // correction : 2 + 2 et 2 × 2 font tous les deux 4, donc le distracteur
    // « il a additionné les nombres de devant » valait la bonne réponse et se
    // faisait écarter. Il restait trois choix, dont la bonne.
    const paires = produit
        ? [[2, 3], [2, 4], [3, 3], [4, 2], [3, 2], [2, 5]]
        : [[6, 3], [8, 2], [9, 3], [8, 4], [6, 2], [4, 2]];
    const [a, b] = rng.pick(paires);
    const na = rng.pick(GRANDS.concat(PETITS));
    const nb = rng.pick(GRANDS.concat(PETITS).filter(x => x !== na));
    const mantisse = produit ? a * b : a / b;
    const exposant = produit ? na + nb : na - nb;
    const signe = produit ? '×' : '÷';
    const ecriture = `(${a} × ${puissanceTexte(na)}) ${signe} (${b} × ${puissanceTexte(nb)})`;
    const bonne = scientifiqueTexte(String(mantisse), exposant);
    return {
        prompt: `Calcule ${ecriture}, et donne le résultat sous la forme a × 10ⁿ.`,
        // SUR LE PAPIER, LA CONSIGNE NE SE RÉPÈTE PAS NEUF FOIS.
        //
        // MESURÉ SUR LA FICHE : « et donne le résultat sous la forme a × 10ⁿ »
        // occupait DEUX des trois lignes de chaque question, neuf fois de
        // suite, et le calcul à faire se perdait dedans. C'est exactement ce
        // que Rémy avait dit de l'exercice voisin — « mets juste calcule ».
        // La forme attendue est donc dans la consigne de l'exercice, en tête,
        // là où on la lit une fois.
        papier: ecriture,
        html: `<div class="game-question">Calcule <span class="nb-highlight">${ecriture}</span>`
            + '<br><small>Donne le résultat sous la forme a × 10<sup>n</sup>.</small></div>',
        answer: bonne,
        // ── TROIS FAUTES TYPES, PUIS UN COMPLÉMENT QUI NE COLLAPSE PAS ───
        //
        // MESURÉ AVANT DE L'ÉCRIRE : sur (4 × 10⁴) ÷ (2 × 10²), deux des
        // distracteurs valaient la BONNE RÉPONSE — 4 ÷ 2 et 4 − 2 font tous
        // les deux 2 — et le garde-fou les écartait tous les deux. L'élève
        // recevait un QCM à DEUX choix, dont le bon : une chance sur deux sans
        // rien savoir. Un exercice qui se laisse deviner n'évalue rien.
        //
        // On garde donc les fautes types quand elles se distinguent, et l'on
        // complète par des exposants voisins, qui sont toujours distincts.
        choices: completerQuatre([
            { value: bonne, correct: true },
            // LA FAUTE UNIVERSELLE : on applique aux exposants l'opération
            // qu'on voit écrite entre les deux nombres.
            { value: scientifiqueTexte(String(mantisse), produit ? na * nb : na),
                why: produit
                    ? 'Le signe × porte sur les NOMBRES. Un produit de puissances AJOUTE '
                      + 'les exposants, il ne les multiplie pas.'
                    : 'On ne garde pas l\u2019exposant du premier : un quotient de puissances '
                      + 'SOUSTRAIT les exposants.' },
            { value: scientifiqueTexte(String(produit ? a + b : a * b), exposant),
                why: `Les nombres de devant se ${produit ? 'multiplient' : 'divisent'} : `
                    + `${a} ${signe} ${b} = ${mantisse}.` },
            { value: scientifiqueTexte(String(mantisse), produit ? na - nb : na + nb),
                why: produit
                    ? 'Un PRODUIT de puissances ajoute les exposants, il ne les soustrait pas.'
                    : 'Un QUOTIENT de puissances soustrait les exposants, il ne les ajoute pas.' }
        ], mantisse, exposant),
        // L'EXPOSANT S'ÉCRIT ENTRE PARENTHÈSES QUAND IL EST NÉGATIF, et ce
        // n'est pas de la coquetterie : « 10^(-3 + -5) » ne se lit pas, et un
        // élève qui recopie une correction illisible recopie une faute.
        explanation: `${ecriture} = (${a} ${signe} ${b}) × (${puissanceTexte(na)} ${signe} `
            + `${puissanceTexte(nb)}) = ${mantisse} × 10^(${relatif(na)} ${produit ? '+' : '−'} `
            + `${nb < 0 ? `(${relatif(nb)})` : nb}) = ${bonne}.`,
        hints: ['Range d\'un côté les nombres, de l\'autre les puissances de 10.',
            produit ? 'Produit de puissances : on AJOUTE les exposants.'
                    : 'Quotient de puissances : on SOUSTRAIT les exposants.'],
        difficulty: 3
    };
}

const MARCHES = {
    effectuerGrand: (rng) => etapeEffectuer(rng, true),
    effectuerPetit: (rng) => etapeEffectuer(rng, false),
    retrouver: etapeRetrouver,
    produit: (rng) => etapeCombiner(rng, true),
    quotient: (rng) => etapeCombiner(rng, false)
};

const RANG = Object.fromEntries(MARCHES_PRODUIT.map((m, i) => [m.id, i + 1]));

/** La marche à travailler pour la question numéro `index`. */
export function marchePour(params, index, total = 0) {
    return marcheAuRang(index, marchesCochees(params, MARCHES_PRODUIT), total, params, PAR_MARCHE);
}

export const puissancesProduitGenerator = {
    id: 'num.puissances-produit',
    label: 'Multiplier par une puissance de 10',
    skills: ['num.puissances.scientifique'],
    answerKinds: ['choice'],
    ecrit: true,
    conseil: (p) => conseilProgression(marchesCochees(p, MARCHES_PRODUIT).length, PAR_MARCHE),
    params: [paramMarches({ marches: MARCHES_PRODUIT, mot: 'marche' })],

    generate(params, ctx) {
        const rng = ctx.rng;
        const p = params || {};
        const marche = marchePour(p, ctx.index, totalDe(ctx, p));
        const q = MARCHES[marche](rng);
        // LES CHOIX PUREMENT NUMÉRIQUES S'AFFICHENT GROUPÉS — 0,000 06 se
        // compte d'un coup d'œil, 0,00006 non —, mais leur `value` reste
        // brute : c'est elle qui sert à comparer la réponse.
        const choix = q.choices
            // UN DISTRACTEUR NE DOIT JAMAIS VALOIR LA BONNE RÉPONSE. Aux
            // marches 4 et 5, deux de nos fautes types peuvent tomber sur le
            // même résultat quand les exposants s'y prêtent ; la chaîne, elle,
            // est la même, donc une comparaison de texte suffit ici.
            .filter(c => c.correct || String(c.value) !== String(q.answer))
            .map(c => (c.label === undefined && /^\d+(,\d+)?$/.test(String(c.value))
                ? { ...c, label: aff(c.value) } : c));
        return makeItem({
            seed: rng.seed,
            generatorId: 'num.puissances-produit',
            skillId: 'num.puissances.scientifique',
            answerKind: 'choice',
            prompt: { text: q.prompt, html: q.html, papier: q.papier || q.prompt },
            answer: q.answer,
            choices: finalizeChoices(rng, choix, { count: 4 }),
            hints: q.hints,
            explanation: q.explanation,
            difficulty: q.difficulty,
            meta: { etape: marche, rang: RANG[marche] }
        });
    }
};
