// FACTORISER — SEPT BARREAUX POUR ARRIVER À L'EXERCICE DE LA FEUILLE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, photo d'une feuille d'exercices à l'appui : « peux-tu faire des
// exercices du type seconde avec factorisation de x² − y² ? Je veux que ce
// soit hyper progressif pour arriver à cela en photo. »
//
// LA CIBLE, C'EST-À-DIRE L'EXERCICE 2 DE SA FEUILLE :
//
//   A(x) = (6 − 5x)² − 1
//   B(x) = (x² − 1)(7x + 1) − (x − 1)(x + 2) − (x − 1)²
//   C(x) = (x − 3)²x − 4x + 12 + 3(x − 3)x
//   D(x) = (3x − 2)² − (x + 4)²
//
// « HYPER PROGRESSIF » NE SE RÈGLE PAS DANS UN GÉNÉRATEUR, et c'est la
// première chose à dire. Un curseur « difficulté » qui mélangerait tout ne
// serait pas une progression : ce serait une loterie, où l'élève tombe sur le
// barreau 6 avant d'avoir monté le 2. La progression, dans cette application,
// c'est le PARCOURS — sept exercices que le professeur pose dans l'ordre, et
// dont chacun ne travaille qu'UNE chose de plus que le précédent.
//
// LES SEPT BARREAUX, ET CE QU'ON AJOUTE À CHACUN :
//
//   1. x² − 36                        reconnaître a² − b², b est un nombre
//   2. 9x² − 16                       le coefficient est DANS le carré
//   3. (6 − 5x)² − 1                  a devient une parenthèse      ← A
//   4. (3x − 2)² − (x + 4)²           b aussi                       ← D
//   5. (x−3)(x+1) + (x−3)(2x−5)       facteur commun VISIBLE
//   6. (x²−9)(2x+1) − (x−3)(x+4)      facteur commun CACHÉ : il faut
//                                     factoriser un morceau pour le voir
//   7. trois termes                                                 ← B, C
//
// Du 1 au 4 on apprend UNE identité ; du 5 au 7 on apprend à la mettre au
// service d'autre chose — et c'est le vrai saut de la Seconde.
//
// ── COMMENT ON SAIT QUE C'EST JUSTE ────────────────────────────────────────
//
// Une factorisation se VÉRIFIE, et on ne s'en prive pas. Chaque question porte
// deux fonctions — l'énoncé et la réponse — et le test les évalue en une
// trentaine de points : si elles ne coïncident pas partout, la question est
// fausse et le test le dit. Même chose pour les leurres, à l'envers : un
// leurre qui coïnciderait avec la réponse ne serait pas un leurre, ce serait
// une SECONDE bonne réponse, et l'élève qui la choisit aurait raison tout en
// étant marqué faux. C'est la faute qu'on ne voit jamais à la relecture.

import { makeItem, finalizeChoices } from '../items.js';

// LE SIGNE MOINS, ET NON LE TRAIT D'UNION DU CLAVIER — comme dans le chapitre
// des intervalles. `-3` et `−3` ne sont pas le même caractère, et les deux se
// côtoieraient dans le même chapitre de Seconde.
const M = '−';
const nb = (v) => (v < 0 ? M + Math.abs(v) : String(v));

/** `x`, `−x`, `3x`, `−5x` */
function monome(a) {
    if (a === 1) return 'x';
    if (a === -1) return M + 'x';
    return `${nb(a)}x`;
}

/**
 * `3x − 2`, `6 − 5x`, `x + 4`.
 *
 * `constDAbord` MET LA CONSTANTE DEVANT, et ce n'est pas de la coquetterie :
 * la feuille de Rémy écrit `(6 − 5x)²`, pas `(−5x + 6)²`. Un élève qui n'a
 * jamais vu la constante en tête croit que c'est une autre sorte d'expression.
 */
function lineaire(a, b, constDAbord = false) {
    if (a === 0) return nb(b);
    if (b === 0) return monome(a);
    if (constDAbord) return `${nb(b)} ${a < 0 ? M : '+'} ${monome(Math.abs(a))}`;
    return `${monome(a)} ${b < 0 ? M : '+'} ${Math.abs(b)}`;
}

/**
 * Un entier de `min` à `max`, jamais nul, et jamais dans `interdits`.
 *
 * ÉCRIT APRÈS DEUX BÊTISES DE SUITE, toutes deux venues du même raccourci :
 * « je tire, et si la valeur ne va pas je fais +1 ». Le +1 tombait sur zéro —
 * et avec u = 0 l'un des leurres du barreau 5 devenait la BONNE RÉPONSE,
 * proposée deux fois, l'une marquée fausse. Puis un second +1 rattrapait le
 * premier et recréait la condition qu'on fuyait.
 *
 * On ne rattrape donc plus : on tire dans ce qui reste.
 */
function tirerSauf(rng, min, max, interdits = []) {
    const possibles = [];
    for (let v = min; v <= max; v++) {
        if (v !== 0 && !interdits.includes(v)) possibles.push(v);
    }
    return possibles[rng.int(0, possibles.length - 1)];
}

// ── LES SEPT BARREAUX ───────────────────────────────────────────────────────
//
// Chacun rend : l'énoncé et sa fonction, la réponse et la sienne, ce qui joue
// le rôle de `a` et de `b` (c'est le support visuel), les leurres avec leur
// fonction à eux, et la phrase de correction.

function barreau1(rng) {
    const n = rng.int(2, 12);
    const A = `x² ${M} ${n * n}`;
    return {
        enonce: A, evaluer: (x) => x * x - n * n,
        reponse: `(x ${M} ${n})(x + ${n})`,
        evaluerReponse: (x) => (x - n) * (x + n),
        a: 'x', b: String(n),
        explication: `${n * n} est le carré de ${n}, donc ${A} s'écrit x² ${M} ${n}². `
            + `C'est a² ${M} b² avec a = x et b = ${n}.`,
        leurres: [
            { texte: `(x ${M} ${n})²`, evaluer: (x) => (x - n) * (x - n),
                why: `C'est l'autre identité : (a ${M} b)² = a² ${M} 2ab + b². Elle a un `
                    + `double produit, pas celle-ci. a² ${M} b² donne deux facteurs DIFFÉRENTS.` },
            { texte: `(x ${M} ${n * n})(x + ${n * n})`, evaluer: (x) => (x - n * n) * (x + n * n),
                why: `${n * n}, c'est b² — pas b. Dans les parenthèses on met la RACINE, `
                    + `c'est-à-dire ${n}.` },
            { texte: `(x + ${n})²`, evaluer: (x) => (x + n) * (x + n),
                why: `Il y a un moins entre les deux carrés : les deux facteurs ne peuvent `
                    + `pas être identiques.` },
            { texte: `x(x ${M} ${n * n})`, evaluer: (x) => x * (x - n * n),
                why: `${n * n} n'a pas de x : on ne peut pas mettre x en facteur.` }
        ],
        visuel: 'carres', carres: { a: 5, b: 2 }
    };
}

function barreau2(rng) {
    const p = rng.int(2, 7);
    const n = rng.int(2, 9);
    const A = `${p * p}x² ${M} ${n * n}`;
    return {
        enonce: A, evaluer: (x) => p * p * x * x - n * n,
        reponse: `(${p}x ${M} ${n})(${p}x + ${n})`,
        evaluerReponse: (x) => (p * x - n) * (p * x + n),
        a: `${p}x`, b: String(n),
        explication: `${p * p}x² est le carré de ${p}x, et ${n * n} celui de ${n}. `
            + `C'est donc a² ${M} b² avec a = ${p}x et b = ${n}.`,
        leurres: [
            { texte: `(${p * p}x ${M} ${n})(${p * p}x + ${n})`,
                evaluer: (x) => (p * p * x - n) * (p * p * x + n),
                why: `${p * p} est déjà le CARRÉ du coefficient. Ce qu'on met dans la `
                    + `parenthèse, c'est ${p}, puisque (${p}x)² = ${p * p}x².` },
            { texte: `(${p}x ${M} ${n})²`, evaluer: (x) => (p * x - n) * (p * x - n),
                why: `C'est l'identité du carré, qui a un double produit. Ici les deux `
                    + `facteurs sont différents : un moins, un plus.` },
            { texte: `(${p}x ${M} ${n * n})(${p}x + ${n * n})`,
                evaluer: (x) => (p * x - n * n) * (p * x + n * n),
                why: `${n * n} est b². Dans les parenthèses on met b, c'est-à-dire ${n}.` },
            { texte: `${p}x(${p}x ${M} ${n * n})`, evaluer: (x) => p * x * (p * x - n * n),
                why: `${n * n} n'a pas de x : ${p}x ne se met pas en facteur.` }
        ],
        visuel: 'identite'
    };
}

function barreau3(rng) {
    // On tire n entre 1 et 6 : n = 1 donne exactement la forme de A(x).
    const n = rng.int(1, 6);
    const a = rng.bool(0.5) ? -rng.int(2, 6) : rng.int(2, 6);
    // b > n, ET C'EST CE QUI PERMET D'ÉCRIRE COMME LA FEUILLE.
    //
    // Les deux facteurs portent b − n et b + n. Si b ≤ n, le premier devient
    // nul ou négatif : nul, la réponse s'écrit « (−2x)(10 − 2x) » ; négatif,
    // on ne peut plus mettre la constante en tête et l'énoncé sort en
    // « (−6x + 4)² » au lieu de « (4 − 6x)² ». En imposant b > n, les deux
    // constantes restent positives — l'énoncé ET les deux facteurs s'écrivent
    // donc tous dans la forme du manuel.
    //
    // A(x) = (6 − 5x)² − 1 reste atteignable : n = 1, b = 6.
    const b = rng.int(n + 1, 9);
    // La constante devant quand le coefficient est négatif — c'est ainsi que
    // la feuille écrit (6 − 5x). `b > n` ci-dessus garantit que toutes les
    // constantes restent positives, donc que cette forme tient partout.
    const ordre = a < 0;
    const A = lineaire(a, b, ordre);
    const enonce = `(${A})² ${M} ${n * n}`;
    return {
        enonce, evaluer: (x) => Math.pow(a * x + b, 2) - n * n,
        reponse: `(${lineaire(a, b - n, ordre)})(${lineaire(a, b + n, ordre)})`,
        evaluerReponse: (x) => (a * x + b - n) * (a * x + b + n),
        a: A, b: String(n),
        explication: `a = ${A} et b = ${n}. Donc a ${M} b = ${lineaire(a, b - n, ordre)} `
            + `et a + b = ${lineaire(a, b + n, ordre)} — on réduit chaque facteur.`,
        leurres: [
            { texte: `(${lineaire(a, b - n, ordre)})²`,
                evaluer: (x) => Math.pow(a * x + b - n, 2),
                why: `Tu as retiré ${n} DEUX fois. a² ${M} b² = (a ${M} b)(a + b) : on `
                    + `retire d'un côté, on ajoute de l'autre.` },
            // CE LEURRE N'EXISTE QUE SI n ≠ 1, et c'est une correction, pas une
            // précaution. Il dit « tu as pris b² au lieu de b » — mais quand
            // b = 1, b² vaut 1 aussi : le leurre devient la BONNE RÉPONSE,
            // proposée deux fois, l'une marquée fausse. MESURÉ sur 840
            // questions : six cas, tous au barreau 3, tous avec n = 1 — et
            // n = 1 est justement la valeur qui donne (6 − 5x)² − 1, la forme
            // de la feuille. L'élève qui choisissait la bonne réponse avait
            // une chance sur deux d'être marqué faux.
            // `b !== n * n` POUR LA MÊME RAISON QUE `n !== 1` : quand b vaut b²,
            // le premier facteur perd sa constante et le leurre s'écrit
            // « (2x)(2x + 18) ». Un leurre qui ne ressemble à rien se repère
            // sans comprendre, et n'enseigne donc rien.
            ...(n === 1 || b === n * n ? [] : [{
                texte: `(${lineaire(a, b - n * n, ordre)})(${lineaire(a, b + n * n, ordre)})`,
                evaluer: (x) => (a * x + b - n * n) * (a * x + b + n * n),
                why: `${n * n} est b². C'est b = ${n} qu'on retire et qu'on ajoute.` }]),
            // Ce leurre disparaît quand il dégénère : avec a = n, le facteur
            // devient « (7) », un nombre seul entre parenthèses, que personne
            // n'écrirait et qui se repère comme faux sans rien comprendre.
            ...(a - n === 0 || a + n === 0 ? [] : [{
                texte: `(${lineaire(a - n, b, ordre)})(${lineaire(a + n, b, ordre)})`,
                evaluer: (x) => (a * x - n * x + b) * (a * x + n * x + b),
                why: `Tu as touché au coefficient de x. b = ${n} est un NOMBRE : il se `
                    + `retire de la constante, pas du terme en x.` }]),
            // `(${A})²` ET NON `${A}²` : sans la parenthèse, « 6 − 5x » suivi
            // d'un carré s'affiche « 6 − 5x² », qui n'est pas la même
            // expression. Une option de QCM qui ne veut pas dire ce qu'on
            // croit est pire qu'un mauvais leurre.
            // UN LEURRE QUI NE DÉGÉNÈRE JAMAIS, et il est là pour une raison
            // de comptage : deux des leurres de ce barreau s'effacent selon
            // les valeurs tirées (n = 1, a = n, b = n²). MESURÉ : il arrivait
            // qu'il n'en reste que DEUX — le QCM affichait alors trois
            // propositions au lieu de quatre, sans que rien ne le signale.
            // Celui-ci est toujours valide : il inverse le signe du facteur
            // qui prend b, ce qui est la faute la plus banale du chapitre.
            { texte: `(${lineaire(a, b + n, ordre)})(${lineaire(a, b + n, ordre)})`,
                evaluer: (x) => Math.pow(a * x + b + n, 2),
                why: `Les deux facteurs de a² ${M} b² ne sont jamais égaux : l'un porte `
                    + `${M} b, l'autre + b.` },
            { texte: `(${A})² ${M} ${n}²`, evaluer: (x) => Math.pow(a * x + b, 2) - n * n,
                why: `C'est vrai, mais ce n'est pas factorisé : il n'y a toujours pas de `
                    + `produit. On veut deux facteurs multipliés.`, memeValeur: true }
        ],
        visuel: 'identite'
    };
}

function barreau4(rng) {
    // (ax + b)² − (cx + d)², avec a ≠ ±c pour que le résultat reste de degré 1.
    const a = rng.int(2, 5);
    let c = rng.int(1, 4);
    if (c === a) c = a === 4 ? 1 : a + 1;
    const b = rng.bool(0.5) ? -rng.int(1, 6) : rng.int(1, 6);
    // ON ÉVITE QUE LES CONSTANTES S'ANNULENT. Avec b + d = 0 la réponse
    // devient `(x − 4)(9x)` : juste, mais un facteur sans constante entre
    // parenthèses se lit mal, et l'élève se demande s'il a raté un morceau.
    let d = rng.bool(0.5) ? -rng.int(1, 6) : rng.int(1, 6);
    if (b + d === 0 || b - d === 0) d = d > 0 ? d + 1 : d - 1;
    const G = lineaire(a, b), D = lineaire(c, d);
    const enonce = `(${G})² ${M} (${D})²`;
    return {
        enonce, evaluer: (x) => Math.pow(a * x + b, 2) - Math.pow(c * x + d, 2),
        reponse: `(${lineaire(a - c, b - d)})(${lineaire(a + c, b + d)})`,
        evaluerReponse: (x) => ((a - c) * x + b - d) * ((a + c) * x + b + d),
        a: G, b: D,
        explication: `a = ${G} et b = ${D}. a ${M} b = ${lineaire(a - c, b - d)} — attention, `
            + `le moins change les DEUX signes de la seconde parenthèse. `
            + `a + b = ${lineaire(a + c, b + d)}.`,
        leurres: [
            { texte: `(${lineaire(a - c, b + d)})(${lineaire(a + c, b + d)})`,
                evaluer: (x) => ((a - c) * x + b + d) * ((a + c) * x + b + d),
                why: `Le moins devant la parenthèse change les DEUX termes : `
                    + `${M}(${D}) donne ${lineaire(-c, -d)}, pas ${lineaire(-c, d)}.` },
            { texte: `(${lineaire(a - c, b - d)})²`,
                evaluer: (x) => Math.pow((a - c) * x + b - d, 2),
                why: `a² ${M} b² n'est pas un carré : ses deux facteurs sont a ${M} b ET a + b.` },
            // ON NE PROPOSE PAS LA FORME NON RÉDUITE comme leurre, et c'est un
            // choix : (a − b)(a + b) sans réduire EST une factorisation juste.
            // La marquer fausse serait donner tort à un élève qui a raison —
            // la consigne dit « factorise », pas « réduis ». Au barreau 3 le
            // leurre du même genre est gardé parce que, lui, n'est pas
            // factorisé du tout : c'est encore une différence, pas un produit.
            { texte: `(${lineaire(a - c, b - d)})(${lineaire(a - c, b + d)})`,
                evaluer: (x) => ((a - c) * x + b - d) * ((a - c) * x + b + d),
                why: `Le second facteur doit porter a + b, donc ${lineaire(a + c, b + d)} : `
                    + `les coefficients de x s'ADDITIONNENT aussi.` },
            { texte: `(${lineaire(a + c, b + d)})(${lineaire(a + c, b + d)})`,
                evaluer: (x) => Math.pow((a + c) * x + b + d, 2),
                why: `Les deux facteurs d'une différence de carrés ne sont jamais égaux.` }
        ],
        visuel: 'identite'
    };
}

function barreau5(rng) {
    // Le facteur commun est SOUS LES YEUX : il est écrit deux fois.
    const r = rng.int(1, 6);
    const s = rng.bool(0.5) ? -rng.int(1, 6) : rng.int(1, 6);
    const t = rng.int(2, 5);
    // s + u SERT À LA RÉPONSE, s − u À UN LEURRE : ni l'un ni l'autre ne doit
    // s'annuler, sinon un facteur perd sa constante et s'écrit « (4x) ». Et u
    // lui-même ne doit pas être nul, sinon les deux coïncident et le leurre
    // devient la bonne réponse.
    const u = tirerSauf(rng, -6, 6, [-s, s]);
    const C = `x ${M} ${r}`;
    const enonce = `(${C})(${lineaire(1, s)}) + (${C})(${lineaire(t, u)})`;
    return {
        enonce,
        evaluer: (x) => (x - r) * (x + s) + (x - r) * (t * x + u),
        reponse: `(${C})(${lineaire(1 + t, s + u)})`,
        evaluerReponse: (x) => (x - r) * ((1 + t) * x + s + u),
        a: C, b: null, commun: C,
        explication: `${C} est écrit dans les DEUX termes : c'est le facteur commun. `
            + `On le sort, et il reste ${lineaire(1, s)} + ${lineaire(t, u)} = `
            + `${lineaire(1 + t, s + u)}.`,
        leurres: [
            { texte: `(${C})(${lineaire(1 + t, s - u)})`,
                evaluer: (x) => (x - r) * ((1 + t) * x + s - u),
                why: `Les deux termes sont ADDITIONNÉS : dans le crochet, on additionne `
                    + `aussi. ${lineaire(1, s)} + ${lineaire(t, u)} = ${lineaire(1 + t, s + u)}.` },
            { texte: `(${C})(${lineaire(t, s + u)})`,
                evaluer: (x) => (x - r) * (t * x + s + u),
                why: `Le premier terme apporte un x, qu'il ne faut pas oublier : `
                    + `x + ${monome(t)} = ${monome(1 + t)}.` },
            { texte: `(${C})²(${lineaire(1 + t, s + u)})`,
                evaluer: (x) => Math.pow(x - r, 2) * ((1 + t) * x + s + u),
                why: `On sort le facteur commun UNE fois, pas deux — c'est justement ce `
                    + `que veut dire « mettre en facteur ».` },
            { texte: `(${lineaire(1, s)})(${lineaire(t, u)})`,
                evaluer: (x) => (x + s) * (t * x + u),
                why: `Tu as effacé le facteur commun au lieu de le sortir.` }
        ],
        visuel: 'commun'
    };
}

function barreau6(rng) {
    // LE FACTEUR COMMUN NE SE VOIT PAS ENCORE : il faut d'abord factoriser un
    // morceau. Deux mécanismes, ceux de B et de C sur la feuille.
    if (rng.bool(0.5)) {
        // Mécanisme de B : x² − n² cache (x − n).
        const n = rng.int(2, 7);
        const p = rng.int(2, 5);
        // q ≠ 1 : le troisième facteur de la réponse porte q − 1, et avec
        // q = 1 il perdait sa constante — « (x − 5)(x + 5)(3x) ». Juste, mais
        // on écrirait 3x(x − 5)(x + 5), et une bonne réponse qui ne ressemble
        // pas à une bonne réponse se fait éliminer par qui avait raison.
        // q ∉ {0, 1, −1} : la réponse porte q − 1 et un leurre porte q + 1.
        // L'un ou l'autre nul, le facteur se réduit à « (4x) », et l'on
        // écrirait alors 4x(x − 6)(x + 6). Même raison des deux côtés.
        const q = tirerSauf(rng, -6, 6, [1, -1]);
        const C = `x ${M} ${n}`;
        const enonce = `(x² ${M} ${n * n})(${lineaire(p, q)}) ${M} (${C})(${lineaire(1, n)})`;
        // (x−n)[(x+n)(px+q) − (x+n)] = (x−n)(x+n)(px+q−1)
        return {
            enonce,
            evaluer: (x) => (x * x - n * n) * (p * x + q) - (x - n) * (x + n),
            reponse: `(${C})(${lineaire(1, n)})(${lineaire(p, q - 1)})`,
            evaluerReponse: (x) => (x - n) * (x + n) * (p * x + q - 1),
            a: null, b: null, commun: C,
            etapePrealable: `x² ${M} ${n * n} = (${C})(${lineaire(1, n)})`,
            explication: `x² ${M} ${n * n} se factorise en (${C})(${lineaire(1, n)}) : `
                + `le facteur (${C}) apparaît alors dans les deux termes. On le sort, `
                + `puis (${lineaire(1, n)}) aussi, et il reste ${lineaire(p, q)} ${M} 1.`,
            leurres: [
                { texte: `(${C})(${lineaire(1, n)})(${lineaire(p, q + 1)})`,
                    evaluer: (x) => (x - n) * (x + n) * (p * x + q + 1),
                    why: `Le second terme est SOUSTRAIT : on retire 1, on ne l'ajoute pas.` },
                { texte: `(${C})(${lineaire(p, q - 1)})`,
                    evaluer: (x) => (x - n) * (p * x + q - 1),
                    why: `Il reste un facteur (${lineaire(1, n)}) : les deux termes le `
                        + `contiennent aussi, une fois x² ${M} ${n * n} factorisé.` },
                // CE LEURRE VAUT LA BONNE RÉPONSE, et c'est assumé — d'où
                // `memeValeur`, qui le dit au test qui vérifie les leurres.
                //
                // (x² − n²)(px + q − 1) EST un produit, et il est égal à la
                // réponse. Mais « factoriser » en Seconde veut dire aller
                // jusqu'au bout : tant qu'un facteur est lui-même une
                // différence de carrés, il se factorise encore.
                //
                // J'AVAIS SIGNALÉ LE CAS COMME DISCUTABLE — l'élève qui répond
                // cela n'écrit pas quelque chose de FAUX, il écrit quelque
                // chose d'INACHEVÉ — et proposé de l'accepter. Rémy a tranché :
                // « Évidemment programme de seconde. » C'est donc faux, et le
                // leurre reste.
                //
                // LA RÈGLE VAUT AUSSI POUR CELUI QUI LA POSE. Si l'inachevé est
                // faux, alors la BONNE réponse doit, elle, aller jusqu'au bout
                // partout — sans quoi le générateur marquerait faux l'élève qui
                // a fini le travail. Vérifié sur 21 000 questions des sept
                // barreaux : aucune réponse ne laisse de différence de carrés
                // non factorisée. Un test le garde.
                //
                // `enDernier` : voir `generate`. Il est juste, il est subtil,
                // il ne se pose pas en première question.
                { texte: `(x² ${M} ${n * n})(${lineaire(p, q - 1)})`, memeValeur: true,
                    enDernier: true,
                    evaluer: (x) => (x * x - n * n) * (p * x + q - 1),
                    why: `C'est bien un produit, mais x² ${M} ${n * n} se factorise `
                        + `encore : tant qu'il reste une différence de carrés, la `
                        + `factorisation n'est pas finie.` },
                { texte: `(${C})(${lineaire(1, n)})(${lineaire(p, q)})`,
                    evaluer: (x) => (x - n) * (x + n) * (p * x + q),
                    why: `Le second terme a disparu. Le sortir en facteur laisse un 1 `
                        + `derrière lui, il ne s'efface pas.` }
            ],
            visuel: 'commun'
        };
    }
    // Mécanisme de C : −kx + kr cache −k(x − r).
    const r = rng.int(2, 6);
    const k = rng.int(2, 6);
    const p = rng.int(1, 4);
    // NI LA RÉPONSE NI LES LEURRES NE DOIVENT PERDRE LEUR CONSTANTE.
    //
    // La réponse porte q − k, un leurre porte q + k : les deux s'annulent
    // pour q = k et q = −k. Dans les deux cas le facteur se réduit à « x » et
    // s'écrit « (x − 3)(x) » — juste, et que personne n'écrit ainsi : on
    // écrirait x(x − 3). Une bonne réponse qui ne ressemble pas à une bonne
    // réponse se fait éliminer par un élève qui avait raison ; un leurre qui
    // ne ressemble à rien se repère sans comprendre, et n'enseigne rien.
    const q = tirerSauf(rng, -6, 6, [k, -k]);
    const C = `x ${M} ${r}`;
    const enonce = `(${C})(${lineaire(p, q)}) ${M} ${monome(k)} + ${k * r}`;
    return {
        enonce,
        evaluer: (x) => (x - r) * (p * x + q) - k * x + k * r,
        reponse: `(${C})(${lineaire(p, q - k)})`,
        evaluerReponse: (x) => (x - r) * (p * x + q - k),
        a: null, b: null, commun: C,
        etapePrealable: `${M}${monome(k)} + ${k * r} = ${M}${k}(${C})`,
        explication: `${M}${monome(k)} + ${k * r} = ${M}${k}(${C}) — c'est là que le facteur `
            + `commun se cache. On sort (${C}) des deux termes, et il reste `
            + `${lineaire(p, q)} ${M} ${k} = ${lineaire(p, q - k)}.`,
        leurres: [
            { texte: `(${C})(${lineaire(p, q + k)})`,
                evaluer: (x) => (x - r) * (p * x + q + k),
                why: `Le terme ${M}${monome(k)} est NÉGATIF : en facteur il donne ${M}${k}, `
                    + `donc on retire ${k}.` },
            { texte: `(${C})(${lineaire(p, q)}) ${M} ${k}`,
                evaluer: (x) => (x - r) * (p * x + q) - k,
                why: `${M}${monome(k)} + ${k * r} ne vaut pas ${M}${k} : il vaut `
                    + `${M}${k}(${C}), et c'est ce (${C}) qui se met en facteur.` },
            { texte: `(${C})(${lineaire(p, q)})`,
                evaluer: (x) => (x - r) * (p * x + q),
                why: `Les deux derniers termes ont disparu. Ils ne s'annulent pas : ils `
                    + `se factorisent.` },
            { texte: `${M}${k}(${C})(${lineaire(p, q)})`,
                evaluer: (x) => -k * (x - r) * (p * x + q),
                why: `${M}${k} n'est pas en facteur de TOUT : il ne vient que du second `
                    + `morceau. Ce qui est commun, c'est (${C}).` }
        ],
        visuel: 'commun'
    };
}

function barreau7(rng) {
    // TROIS TERMES — la forme exacte de la feuille de Rémy.
    if (rng.bool(0.5)) {
        // B(x) = (x² − 1)(7x + 1) − (x − 1)(x + 2) − (x − 1)²
        const n = rng.int(1, 4);
        const p = rng.int(2, 7);
        const q = rng.int(1, 5);
        const c = rng.int(1, 5);
        const C = `x ${M} ${n}`;
        const enonce = `(x² ${M} ${n * n})(${lineaire(p, q)}) ${M} (${C})(${lineaire(1, c)}) `
            + `${M} (${C})²`;
        // (x−n)[ (x+n)(px+q) − (x+c) − (x−n) ]
        //      = (x−n)[ px² + (pn+q)x + qn − x − c − x + n ]
        //      = (x−n)[ px² + (pn+q−2)x + (qn − c + n) ]
        const B2 = p, B1 = p * n + q - 2, B0 = q * n - c + n;
        const crochet = `${B2 === 1 ? '' : B2}x²`
            + `${B1 === 0 ? '' : ` ${B1 < 0 ? M : '+'} ${monome(Math.abs(B1))}`}`
            + `${B0 === 0 ? '' : ` ${B0 < 0 ? M : '+'} ${Math.abs(B0)}`}`;
        return {
            enonce,
            evaluer: (x) => (x * x - n * n) * (p * x + q)
                - (x - n) * (x + c) - Math.pow(x - n, 2),
            reponse: `(${C})(${crochet})`,
            evaluerReponse: (x) => (x - n) * (B2 * x * x + B1 * x + B0),
            a: null, b: null, commun: C,
            etapePrealable: `x² ${M} ${n * n} = (${C})(${lineaire(1, n)})`,
            explication: `On factorise d'abord x² ${M} ${n * n} = (${C})(${lineaire(1, n)}). `
                + `Alors (${C}) est dans les TROIS termes. On le sort, et le crochet se `
                + `réduit : (${lineaire(1, n)})(${lineaire(p, q)}) ${M} (${lineaire(1, c)}) `
                + `${M} (${C}) = ${crochet}.`,
            leurres: [
                { texte: `(${C})(${lineaire(1, n)})(${lineaire(p, q)})`,
                    evaluer: (x) => (x - n) * (x + n) * (p * x + q),
                    why: `Les deux termes soustraits ont disparu. Sortir (${C}) d'un terme `
                        + `laisse ce qui restait derrière lui, ça ne l'efface pas.` },
                // LE LEURRE « SIGNES INVERSÉS » N'EXISTE QUE S'IL INVERSE
                // QUELQUE CHOSE. Il remplace B1 et B0 par leurs valeurs
                // absolues — mais quand les deux sont DÉJÀ positifs, il rend
                // la bonne réponse, proposée deux fois, l'une marquée fausse.
                // MESURÉ : six cas sur 840 questions, tous ici.
                ...(B1 >= 0 && B0 >= 0 ? [] : [{
                    texte: `(${C})(${B2 === 1 ? '' : B2}x²`
                        + `${B1 === 0 ? '' : ` + ${monome(Math.abs(B1))}`}`
                        + `${B0 === 0 ? '' : ` + ${Math.abs(B0)}`})`,
                    evaluer: (x) => (x - n) * (B2 * x * x + Math.abs(B1) * x + Math.abs(B0)),
                    why: `Les deux derniers termes sont SOUSTRAITS : dans le crochet, `
                        + `leurs signes changent.` }]),
                { texte: `(${C})²(${crochet})`,
                    evaluer: (x) => Math.pow(x - n, 2) * (B2 * x * x + B1 * x + B0),
                    why: `On ne sort le facteur commun qu'UNE fois, même s'il apparaît `
                        + `au carré dans un terme.` },
                { texte: `(x² ${M} ${n * n})(${crochet})`,
                    evaluer: (x) => (x * x - n * n) * (B2 * x * x + B1 * x + B0),
                    why: `Le facteur commun est (${C}), pas x² ${M} ${n * n} : le `
                        + `deuxième terme ne contient pas (${lineaire(1, n)}).` }
            ],
            visuel: 'commun'
        };
    }
    // C(x) = (x − 3)²x − 4x + 12 + 3(x − 3)x
    const r = rng.int(2, 6);
    const k = rng.int(2, 6);
    // m ≠ r : un leurre porte x − r + m, qui doit se réduire en quelque chose
    // de non nul. Avec m = r il s'écrivait « (x − 4 + 4) », non réduit — et
    // une proposition non réduite se repère comme fausse sans qu'on ait rien
    // compris au facteur commun, qui est pourtant le sujet.
    const m = tirerSauf(rng, 2, 5, [r]);
    const C = `x ${M} ${r}`;
    const enonce = `(${C})²x ${M} ${monome(k)} + ${k * r} + ${m}(${C})x`;
    // (x−r)[ (x−r)x − k + m x ] = (x−r)( x² + (m−r)x − k )
    const B1 = m - r;
    const crochet = `x²`
        + `${B1 === 0 ? '' : ` ${B1 < 0 ? M : '+'} ${monome(Math.abs(B1))}`}`
        + ` ${M} ${k}`;
    return {
        enonce,
        evaluer: (x) => Math.pow(x - r, 2) * x - k * x + k * r + m * (x - r) * x,
        reponse: `(${C})(${crochet})`,
        evaluerReponse: (x) => (x - r) * (x * x + B1 * x - k),
        a: null, b: null, commun: C,
        etapePrealable: `${M}${monome(k)} + ${k * r} = ${M}${k}(${C})`,
        explication: `Le deuxième et le troisième terme cachent (${C}) : `
            + `${M}${monome(k)} + ${k * r} = ${M}${k}(${C}). Les trois termes le contiennent `
            + `alors, on le sort, et le crochet vaut ${crochet}.`,
        leurres: [
            { texte: `(${C})(x² ${B1 === 0 ? '' : `+ ${monome(Math.abs(B1))} `}+ ${k})`,
                evaluer: (x) => (x - r) * (x * x + Math.abs(B1) * x + k),
                why: `${M}${monome(k)} + ${k * r} = ${M}${k}(${C}) : c'est ${M}${k} qui `
                    + `reste dans le crochet, pas +${k}.` },
            { texte: `(${C})²(${crochet})`,
                evaluer: (x) => Math.pow(x - r, 2) * (x * x + B1 * x - k),
                why: `Le premier terme porte (${C})², mais on ne sort le facteur commun `
                    + `qu'une fois — il en reste un dans le crochet.` },
            { texte: `(${C})(${lineaire(1, m - r)})x`,
                evaluer: (x) => (x - r) * (x - r + m) * x,
                why: `Les termes ${M}${monome(k)} + ${k * r} ont été oubliés.` },
            // Quand m = r, `lineaire(1, 0)` rend « x » et le leurre s'écrivait
            // « x(x − 4)(x) » — juste, mais personne n'écrit deux fois un
            // facteur au lieu de le mettre au carré.
            ...(m === r ? [] : [{
                texte: `x(${C})(${lineaire(1, m - r)})`,
                evaluer: (x) => x * (x - r) * (x + m - r),
                why: `x n'est pas commun aux trois termes : ${k * r} n'en a pas.` }])
        ],
        visuel: 'commun'
    };
}

const BARREAUX = {
    1: { faire: barreau1, nom: 'Reconnaître a² − b²' },
    2: { faire: barreau2, nom: 'Le coefficient est dans le carré' },
    3: { faire: barreau3, nom: 'a devient une parenthèse' },
    4: { faire: barreau4, nom: 'Deux parenthèses au carré' },
    5: { faire: barreau5, nom: 'Facteur commun visible' },
    6: { faire: barreau6, nom: 'Facteur commun caché' },
    7: { faire: barreau7, nom: 'Trois termes' }
};

// ── LE SUPPORT VISUEL ───────────────────────────────────────────────────────

/**
 * LE CARRÉ ÉCHANCRÉ : pourquoi a² ${M} b² = (a ${M} b)(a + b).
 *
 * C'est la démonstration géométrique, et elle vaut mieux qu'une règle apprise :
 * on retire un petit carré d'un grand, on découpe ce qui reste en deux
 * rectangles, on les recolle — et l'on obtient un rectangle de côtés (a + b)
 * et (a ${M} b). L'élève qui a vu ce découpage une fois ne confond plus jamais
 * a² ${M} b² avec (a ${M} b)².
 */
function carresHtml(a, b) {
    const k = 26, m = 14;
    const A = a * k, B = b * k;
    return `<svg class="fa-figure" viewBox="0 0 ${A + m * 2 + 150} ${A + m * 2}" role="img"
        aria-label="Un carré de côté a dont on retire un carré de côté b"
        style="max-width:100%;height:auto">
        <rect x="${m}" y="${m}" width="${A}" height="${A}" fill="var(--primary,#4f46e5)"
              fill-opacity=".14" stroke="currentColor" stroke-width="1.4"/>
        <rect x="${m + A - B}" y="${m}" width="${B}" height="${B}" fill="#fff"
              stroke="currentColor" stroke-width="1.4" stroke-dasharray="4 3"/>
        <text x="${m - 6}" y="${m + A / 2}" font-size="13" font-style="italic"
              text-anchor="end" fill="currentColor">a</text>
        <text x="${m + A / 2}" y="${m + A + 12}" font-size="13" font-style="italic"
              text-anchor="middle" fill="currentColor">a</text>
        <text x="${m + A - B / 2}" y="${m - 4}" font-size="13" font-style="italic"
              text-anchor="middle" fill="currentColor">b</text>
        <text x="${A + m * 2 + 6}" y="${m + A / 2 - 6}" font-size="13" fill="currentColor">
            aire = a² ${M} b²</text>
        <text x="${A + m * 2 + 6}" y="${m + A / 2 + 14}" font-size="13" fill="currentColor"
              font-weight="700">= (a ${M} b)(a + b)</text>
    </svg>`;
}

/** L'IDENTIFICATION : qui joue le rôle de a, qui joue celui de b. */
function identiteHtml(aTexte, bTexte) {
    return `<div class="fa-identite">
        <div class="fa-regle">a² ${M} b² = (a ${M} b)(a + b)</div>
        <div class="fa-roles">
            <span class="fa-role"><i>a</i> = ${aTexte}</span>
            <span class="fa-role fa-role--b"><i>b</i> = ${bTexte}</span>
        </div>
    </div>`;
}

/** LE FACTEUR COMMUN, MONTRÉ : ce qui est écrit dans chaque terme. */
function communHtml(commun, prealable) {
    return `<div class="fa-identite">
        ${prealable ? `<div class="fa-prealable">${prealable}</div>` : ''}
        <div class="fa-roles">
            <span class="fa-role">facteur commun : <b>${commun}</b></span>
        </div>
        <div class="fa-regle">k·A + k·B = k(A + B)</div>
    </div>`;
}

// ── LE GÉNÉRATEUR ───────────────────────────────────────────────────────────

export const factorisationGenerator = {
    id: 'lit.factorisation',
    label: 'Factoriser : a² − b² et facteur commun',
    skills: ['lit.factoriser.identite', 'lit.factoriser.commun'],
    answerKinds: ['choice'],
    ecrit: true,
    params: [
        {
            id: 'barreau', type: 'select', label: 'Quel barreau', default: '1',
            // ≤ 200 caractères, comme tous les `aide` du projet.
            aide: 'Un barreau ajoute UNE chose au précédent. La progression se fait '
                + 'en posant plusieurs de ces exercices à la suite dans une séance.',
            options: [
                { value: '1', label: '1 — x² − 36' },
                { value: '2', label: '2 — 9x² − 16' },
                { value: '3', label: '3 — (6 − 5x)² − 1' },
                { value: '4', label: '4 — (3x − 2)² − (x + 4)²' },
                { value: '5', label: '5 — facteur commun visible' },
                { value: '6', label: '6 — facteur commun caché' },
                { value: '7', label: '7 — trois termes' },
                { value: 'revision', label: 'Révision — les barreaux 1 à 4' },
                { value: 'toutes', label: 'Tout mélangé' }
            ]
        }
    ],
    generate(params, ctx) {
        const rng = ctx.rng;
        const choix = String(params.barreau || '1');
        const possibles = choix === 'toutes' ? [1, 2, 3, 4, 5, 6, 7]
            : (choix === 'revision' ? [1, 2, 3, 4] : [Number(choix) || 1]);
        const rang = possibles[rng.int(0, possibles.length - 1)];
        const q = BARREAUX[rang].faire(rng);

        // LE SUPPORT VISUEL, TOUJOURS — la contrainte de Rémy, tenue ici par
        // trois dessins selon ce qu'il y a à montrer : le découpage du carré
        // quand a et b sont des nombres, l'identification des rôles quand ce
        // sont des expressions, et le facteur commun quand c'est lui le sujet.
        const dessin = q.visuel === 'carres' ? carresHtml(q.carres.a, q.carres.b)
            : (q.visuel === 'commun' ? communHtml(q.commun, q.etapePrealable)
                : identiteHtml(q.a, q.b));

        const faux = [...q.leurres];
        for (let i = faux.length - 1; i > 0; i--) {
            const j = rng.int(0, i);
            [faux[i], faux[j]] = [faux[j], faux[i]];
        }
        // LE LEURRE LE PLUS FIN NE SE POSE PAS EN PREMIÈRE QUESTION.
        //
        // L'échelle d'aide ouvre une séance à DEUX propositions pour mettre en
        // confiance, et `reduireChoix` ne garde alors que le premier leurre de
        // cette liste. Le tirage ci-dessus pouvait donc y placer celui du
        // barreau 6 — (x² − 9)(4x + 1) contre (x − 3)(x + 3)(4x + 1) : deux
        // produits ÉGAUX, dont l'un est seulement moins fini. MESURÉ : 355
        // questions sur 21 000, toutes au barreau 6, où c'était le seul leurre
        // offert. La discrimination la plus subtile du chapitre, demandée au
        // moment où l'élève a le moins d'appuis.
        //
        // Il reste faux — Rémy : « Évidemment programme de seconde » —, mais il
        // n'apparaît qu'au QCM complet, une fois la factorisation acquise.
        //
        // ON NE LE PLACE PAS DANS LA LISTE : ON LE SERT APRÈS. Deux essais ont
        // échoué avant celui-ci, et chacun pour une raison qui mérite d'être
        // écrite.
        //
        // Le premier le renvoyait en FIN de liste. Comme on ne retient que
        // TROIS leurres sur les quatre du barreau, il tombait alors toujours —
        // et le défaut mesuré passait à zéro exactement comme s'il avait été
        // corrigé. Repousser un leurre et le supprimer ne se distinguent pas
        // dans ce chiffre-là ; seul le contrôle « apparaît-il encore quand le
        // QCM est complet ? » l'a montré, et il disait zéro lui aussi.
        //
        // Le second le plaçait TROISIÈME dans la liste. Mais la sélection
        // écarte au passage les leurres qui s'écrivent comme un autre, si bien
        // qu'un doublon parmi les premiers le faisait remonter — jusqu'en tête
        // dans les cas où deux ordinaires tombaient ensemble. Une position dans
        // une liste qu'on filtre ensuite ne garantit rien.
        //
        // D'où la forme retenue : on sert DEUX leurres ordinaires d'abord, le
        // subtil ensuite, et l'on complète avec ce qui reste. Le rang n'est
        // plus une espérance, c'est une conséquence.
        //
        // L'AUTRE `memeValeur` DU CHAPITRE N'EST PAS CONCERNÉ, et c'est la
        // différence qui compte : « (6 − 5x)² − 1² » n'est pas un produit DU
        // TOUT. Reconnaître un produit d'une différence est la première leçon
        // du chapitre, pas la dernière — ce leurre-là a sa place en ouverture.
        const ordinaires = faux.filter(f => !f.enDernier);
        const subtils = faux.filter(f => f.enDernier);
        // ON DÉDOUBLONNE SUR CE QUE L'ÉLÈVE VOIT, pas sur la formule.
        //
        // Deux leurres construits différemment peuvent s'écrire pareil selon
        // les valeurs tirées — MESURÉ : neuf cas sur 4 200 questions. Deux
        // propositions identiques dans un QCM, c'est une question à trois
        // choix qui prétend en avoir quatre.
        //
        // La bonne réponse est dans l'ensemble de départ : un leurre qui
        // s'écrirait comme elle serait une seconde bonne réponse, marquée
        // fausse — la faute qu'on ne voit jamais à la relecture.
        const dejaVu = new Set([q.reponse]);
        const choisis = [];
        const servir = (liste, jusqua) => {
            for (const f of liste) {
                if (choisis.length >= jusqua) break;
                if (dejaVu.has(f.texte)) continue;
                dejaVu.add(f.texte);
                choisis.push(f);
            }
        };
        servir(ordinaires, 2);   // deux ordinaires d'abord, quoi qu'il arrive
        servir(subtils, 3);      // puis le subtil, s'il y en a un
        servir(ordinaires, 3);   // et l'on complète avec le reste
        const brutes = [
            // `texte` EXPLICITE, même si les libellés de ce chapitre sont déjà
            // du texte pur. La fiche papier ne retombe sur le libellé que s'il
            // ne contient aucune balise ; aujourd'hui c'est le cas, mais le
            // jour où une expression portera un exposant dessiné, la feuille se
            // mettrait à imprimer « faux0 » sans prévenir — ce qui est arrivé
            // aux deux autres chapitres de Seconde.
            { value: 'ok', label: q.reponse, texte: q.reponse, correct: true },
            ...choisis.map((f, i) => ({
                value: 'faux' + i, label: f.texte, texte: f.texte,
                correct: false, why: f.why
            }))
        ];
        // ON PASSE PAR `finalizeChoices`, COMME TOUS LES AUTRES QCM DE L'APPLI.
        //
        // Ces trois chapitres de Seconde mélangeaient leurs propositions à la
        // main. Le mélange était juste — mais `finalizeChoices` ne fait pas que
        // mélanger : il NOTE AU PASSAGE le rang d'origine de chaque leurre,
        // et c'est ce rang que `reduireChoix` lit pour décider lequel survit
        // quand l'échelle d'aide ouvre une séance à deux propositions.
        //
        // Faute de l'appeler, `rang` restait indéfini ; `reduireChoix` retombe
        // alors sur `?? 99` pour tous, le tri devient neutre, et le leurre
        // conservé est simplement le premier du mélange — c'est-à-dire un
        // leurre au hasard. Le principe « le distracteur le plus instructif est
        // celui qui reste quand il n'en reste qu'un » ne s'appliquait donc à
        // AUCUN des trois chapitres, sans que rien ne le signale : le QCM était
        // bien formé, les quatre propositions étaient là, seul l'ordre mentait.
        //
        // Trouvé en cherchant pourquoi le leurre inachevé du barreau 6 tombait
        // encore en première question après avoir été rangé en fin de liste.
        const choices = finalizeChoices(rng, brutes, { count: 4 });

        return makeItem({
            seed: rng.seed,
            generatorId: 'lit.factorisation',
            skillId: rang <= 4 ? 'lit.factoriser.identite' : 'lit.factoriser.commun',
            answerKind: 'choice',
            prompt: {
                text: `Factorise : ${q.enonce}`,
                html: '<div class="game-question fa-consigne">Factorise cette expression.</div>'
                    + `<div class="fa-expression">${q.enonce}</div>` + dessin,
                papier: `Factoriser : ${q.enonce}`
            },
            answer: 'ok',
            choices,
            hints: [
                rang <= 4
                    ? `a² ${M} b² = (a ${M} b)(a + b). Cherche ce qui est au carré des deux côtés du moins.`
                    : 'Cherche ce qui est écrit dans TOUS les termes — quitte à en factoriser un d\'abord.',
                q.explication
            ],
            schemas: ['', dessin],
            explanation: `${q.enonce} = ${q.reponse}. ${q.explication}`,
            difficulty: Math.min(5, 1 + Math.floor(rang / 1.6)),
            meta: { barreau: rang, nomDuBarreau: BARREAUX[rang].nom }
        });
    }
};

// Exporté pour le test, qui vérifie NUMÉRIQUEMENT que chaque question est
// juste : l'énoncé et la réponse doivent coïncider en tout point, et chaque
// leurre doit s'en écarter quelque part.
export const BARREAUX_POUR_ESSAI = BARREAUX;
