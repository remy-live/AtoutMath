// CALCULER AVEC DES FRACTIONS — NEUF BARREAUX POUR ARRIVER AU DEVOIR LIBRE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, photo du Devoir libre n°1 : « et pareil, des exercices très progressifs
// pour savoir calculer cela. »
//
// LA CIBLE, C'EST-À-DIRE SON EXERCICE 1. « Dans chacun des cas suivants,
// calculer puis préciser le plus petit ensemble auquel appartient le
// résultat » :
//
//   A = 5(2 − 7/3) − 25/6 × 2/5              = −10/3   → ℚ
//   B = 12/7 × 2/9 × 21/8                    = 1       → ℕ
//   C = (1/2 + 7/5) ÷ (4/3 − 10/9)           = 171/20  → 𝔻
//   D = (25/3 − 5/2)(8/5 + 1)                = 91/6    → ℚ
//
// DEUX CHOSES SONT DEMANDÉES, ET LA SECONDE EXISTE DÉJÀ. Calculer, puis
// nommer l'ensemble — c'est l'exercice `sec-ensembles` du même chapitre. Le
// neuvième barreau les remet ensemble, et c'est exactement la question du
// devoir : l'expression est donnée, la réponse est un ENSEMBLE, et l'on ne
// peut pas y répondre sans avoir calculé.
//
// LES NEUF BARREAUX, ET CE QU'ON AJOUTE À CHACUN :
//
//   1. 1/2 + 3/4               un dénominateur est multiple de l'autre
//   2. 2/3 + 3/5               dénominateurs quelconques
//   3. 12/7 × 2/9 × 21/8       produit : simplifier AVANT de multiplier  ← B
//   4. 3/4 ÷ 5/6               diviser, c'est multiplier par l'inverse
//   5. 5(2 − 7/3)              un entier devant une parenthèse
//   6. 5(2 − 7/3) − 25/6 × 2/5 les priorités                             ← A
//   7. (1/2 + 7/5) ÷ (4/3 − 10/9)  une fraction de fractions             ← C
//   8. (25/3 − 5/2)(8/5 + 1)   produit de deux parenthèses               ← D
//   9. … et le plus petit ensemble du résultat                 ← la question
//
// ── L'ARITHMÉTIQUE EST EXACTE, ET CE N'EST PAS UN DÉTAIL ────────────────────
//
// Tout se calcule en rationnels — numérateur et dénominateur entiers, réduits
// à chaque étape. Un calcul mené en nombres à virgule donnerait 0,30000000004
// au lieu de 3/10, et surtout il ne saurait PAS répondre à la question du
// devoir : 1/3 et 0,333… ne sont pas dans le même ensemble, et c'est
// justement ce qu'on demande de distinguer.

import { makeItem, finalizeChoices } from '../items.js';

const M = '−';
const nb = (v) => (v < 0 ? M + Math.abs(v) : String(v));

// ── LES RATIONNELS ──────────────────────────────────────────────────────────

const pgcd = (a, b) => (b ? pgcd(b, a % b) : Math.abs(a));

/** Une fraction TOUJOURS réduite, le signe porté par le numérateur. */
function fr(n, d = 1) {
    if (d === 0) return null;                 // on ne divise pas par zéro
    if (d < 0) { n = -n; d = -d; }
    const g = pgcd(Math.abs(n), d) || 1;
    return { n: n / g, d: d / g };
}
const plus = (a, b) => fr(a.n * b.d + b.n * a.d, a.d * b.d);
const moins = (a, b) => fr(a.n * b.d - b.n * a.d, a.d * b.d);
const fois = (a, b) => fr(a.n * b.n, a.d * b.d);
const sur = (a, b) => (b.n === 0 ? null : fr(a.n * b.d, a.d * b.n));
const memeF = (a, b) => !!a && !!b && a.n === b.n && a.d === b.d;

/** `3/4`, `−5`, `2` — pour le papier et pour les mots. */
const txt = (f) => (f.d === 1 ? nb(f.n) : `${nb(f.n)}/${f.d}`);

/**
 * La fraction EMPILÉE, comme au tableau.
 *
 * Le signe reste DEVANT la barre, jamais au numérateur : « −3/4 » s'écrit un
 * moins puis la fraction, parce que c'est ainsi qu'on le lit et qu'un moins
 * collé en haut se confond avec une soustraction dans l'expression.
 */
function fracHtml(f) {
    if (f.d === 1) return nb(f.n);
    const signe = f.n < 0 ? M + ' ' : '';
    return `${signe}<span class="fraction"><span class="fraction-num">${Math.abs(f.n)}</span>`
        + `<span class="fraction-den">${f.d}</span></span>`;
}

/**
 * LE PLUS PETIT ENSEMBLE — la seconde question du devoir.
 *
 * Elle se calcule, et c'est pour cela que l'arithmétique doit être exacte :
 * une fraction réduite dont le dénominateur ne contient que des 2 et des 5 a
 * une écriture décimale qui S'ARRÊTE ; sinon elle ne s'arrête jamais. 7/20
 * est décimal, 1/3 ne l'est pas — et aucun calcul en virgule flottante ne
 * saurait faire la différence.
 */
function plusPetitEnsemble(f) {
    if (f.d === 1) return f.n >= 0 ? 'N' : 'Z';
    let d = f.d;
    while (d % 2 === 0) d /= 2;
    while (d % 5 === 0) d /= 5;
    return d === 1 ? 'D' : 'Q';
}

const ENSEMBLES = {
    N: { nom: 'ℕ', label: 'ℕ — les entiers naturels' },
    Z: { nom: 'ℤ', label: 'ℤ — les entiers relatifs' },
    D: { nom: '\u{1D53B}', label: '\u{1D53B} — les décimaux' },
    Q: { nom: 'ℚ', label: 'ℚ — les rationnels' }
};
const RANG_ENS = { N: 0, Z: 1, D: 2, Q: 3 };

/**
 * Une fraction de dénominateur EXACTEMENT `d` — qui ne se réduira pas.
 *
 * LE BARREAU 1 NE TENAIT PLUS SA PROMESSE, et c'est `fr()` qui le cassait :
 * il tire un dénominateur d puis un multiple d×k, mais la réduction ramenait
 * 2/6 à 1/3 — et l'élève recevait « 1/4 + 2/3 », deux dénominateurs sans
 * aucun rapport, sur un exercice dont tout l'intérêt était que l'un soit
 * multiple de l'autre. Le barreau annonçait une chose et en travaillait une
 * autre.
 *
 * On choisit donc le numérateur PREMIER AVEC le dénominateur : la fraction
 * est déjà réduite, et le dénominateur reste celui qu'on a voulu.
 */
/**
 * UNE VRAIE FRACTION — dont le dénominateur survit à la réduction.
 *
 * MESURÉ, ET C'EST LA MÊME FAUTE RÉPÉTÉE DANS QUATRE BARREAUX : écrire
 * `fr(rng.int(2, 9), rng.int(2, 7))` paraît tirer une fraction, mais `fr`
 * RÉDUIT — fr(4, 2) vaut 2. Un opérande sur quatre était donc un entier, et
 * le barreau posait « 5(2 − 1) », « 1 ÷ 2 », « (5 − 1)(5/6 + 1) » : des
 * questions sans fraction dans un chapitre sur les fractions. Ce n'est pas
 * une marche facile, c'est une marche absente.
 *
 * `fracBrute` tire un numérateur premier avec le dénominateur : celui-ci
 * survit donc, et la valeur n'est jamais un entier.
 */
function vraieFraction(rng, dMin = 2, dMax = 9) {
    return fracBrute(rng, rng.int(dMin, dMax));
}

function fracBrute(rng, d) {
    const possibles = [];
    for (let n = 1; n < d * 2; n++) if (pgcd(n, d) === 1) possibles.push(n);
    return fr(possibles[rng.int(0, possibles.length - 1)], d);
}

// ── LES QUATORZE BARREAUX ───────────────────────────────────────────────────
//
// Rémy : « pour ton calcul de fractions il faut être plus progressif ».
//
// Il avait raison, et la mesure le disait : l'échelle commençait à DEUX gestes
// — le premier barreau posait déjà « 5/3 − 13/9 », une conversion ET une
// soustraction — puis sautait à quatre au troisième, qui demandait d'un coup
// de multiplier, de simplifier avant, de gérer trois facteurs et de mêler
// entiers et fractions.
//
// Quatre marches manquaient au bas de l'escalier, et ce sont justement celles
// où se jouent les fautes :
//
//   · MÊME DÉNOMINATEUR. La marche zéro, et la plus importante : c'est là que
//     se décide si l'élève additionnera un jour les dénominateurs. Elle
//     n'existait pas du tout ;
//   · FRACTION × ENTIER, avant fraction × fraction ;
//   · FRACTION × FRACTION, avant le produit de trois facteurs mêlés ;
//   · DIVISER PAR UN ENTIER, avant diviser par une fraction.
//
// L'ordre du haut change aussi : le PRODUIT de deux parenthèses passe avant
// leur QUOTIENT, parce qu'un produit est plus simple qu'une division — et
// parce que le quotient demande en plus de retourner ce qu'on vient de
// calculer.

/**
 * MÊME DÉNOMINATEUR — la marche zéro, celle qui manquait.
 *
 * On n'ajoute QUE les numérateurs, et le dénominateur ne bouge pas. Tout le
 * chapitre repose là-dessus : la faute reine — additionner aussi les
 * dénominateurs — se prend ici ou ne se prend plus.
 */
function barreauMeme(rng) {
    const d = rng.int(3, 12);
    const moinsCi = rng.bool(0.45);
    // DEUX NUMÉRATEURS DISTINCTS, et le plus grand devant quand on retranche :
    // une différence nulle ne travaille rien, et un résultat négatif n'est pas
    // le sujet de ce barreau-ci.
    // DES NUMÉRATEURS PREMIERS AVEC d, pour que les deux fractions soient déjà
    // réduites. Sans cela le barreau écrivait « 14/10 + 18/10 » — juste, et
    // que personne n'écrit : un professeur pose 7/10, pas 14/10.
    const possibles = [];
    for (let n = 1; n <= d * 2; n++) if (pgcd(n, d) === 1) possibles.push(n);
    let n1 = possibles[rng.int(0, possibles.length - 1)];
    const restants = possibles.filter(n => n !== n1);
    let n2 = restants[rng.int(0, restants.length - 1)];
    if (moinsCi && n2 > n1) [n1, n2] = [n2, n1];
    const a = { n: n1, d }, b = { n: n2, d };
    const v = moinsCi ? moins(a, b) : plus(a, b);
    return {
        html: `${fracHtml(a)} ${moinsCi ? M : '+'} ${fracHtml(b)}`,
        texte: `${txt(a)} ${moinsCi ? M : '+'} ${txt(b)}`,
        valeur: v,
        etapes: `Les deux fractions sont déjà sur ${d} : on ${moinsCi ? 'retire' : 'ajoute'} `
            + `les numérateurs, et le dénominateur NE BOUGE PAS. `
            + `${n1} ${moinsCi ? M : '+'} ${n2} = ${moinsCi ? n1 - n2 : n1 + n2}, sur ${d}.`,
        leurres: [
            // LA FAUTE REINE, et c'est ici qu'elle se joue.
            { valeur: fr(moinsCi ? n1 - n2 : n1 + n2, d + d),
                why: `Le dénominateur NE BOUGE PAS : il reste ${d}. On n'ajoute jamais les `
                    + `dénominateurs entre eux.` },
            { valeur: fr(moinsCi ? n1 - n2 : n1 + n2, d * d),
                why: `Les dénominateurs ne se multiplient pas non plus : ils sont déjà `
                    + `les mêmes, il n'y a rien à convertir.` },
            { valeur: moinsCi ? plus(a, b) : moins(a, b),
                why: `C'est l'autre opération : relis le signe du milieu.` }
        ]
    };
}

/**
 * FRACTION × ENTIER — la multiplication au plus simple.
 *
 * Un seul geste : le nombre entier multiplie le NUMÉRATEUR. La faute visée est
 * celle de l'élève qui vient de passer une heure sur l'addition et multiplie
 * le dénominateur aussi, « pour rester cohérent ».
 */
function barreauFoisEntier(rng) {
    const d = rng.int(2, 9);
    const f = fracBrute(rng, d);
    const k = rng.int(2, 9);
    const v = fois(f, fr(k));
    return {
        html: `${fracHtml(f)} × ${k}`,
        texte: `${txt(f)} × ${k}`,
        valeur: v,
        etapes: `${k} multiplie le NUMÉRATEUR seulement : ${f.n} × ${k} = ${f.n * k}, `
            + `toujours sur ${f.d}. Puis on simplifie s'il y a lieu : ${txt(v)}.`,
        leurres: [
            { valeur: fr(f.n * k, f.d * k),
                why: `Multiplier le haut ET le bas par ${k} ne change rien du tout : `
                    + `on retombe sur ${txt(f)}. Seul le numérateur est multiplié.` },
            { valeur: fr(f.n, f.d * k),
                why: `C'est le NUMÉRATEUR que ${k} multiplie, pas le dénominateur — `
                    + `multiplier le bas rendrait la fraction plus PETITE.` },
            { valeur: fr(f.n + k, f.d),
                why: `${k} multiplie, il ne s'ajoute pas : ${f.n} × ${k}, et non `
                    + `${f.n} + ${k}.` }
        ]
    };
}

/**
 * FRACTION × FRACTION — et l'on simplifie AVANT.
 *
 * Deux facteurs seulement : le barreau suivant en mettra trois. On fabrique
 * une simplification croisée franche, pour que « simplifier avant » se voie.
 */
function barreauFoisFraction(rng) {
    // DEUX VRAIES FRACTIONS. Le premier jet laissait `fr` réduire, et le
    // barreau posait « 2 × 5/12 » ou « 5 × 2/3 » — c'est-à-dire l'exercice du
    // barreau 4, une marche plus bas. On tire donc les deux fractions, puis on
    // croise un facteur commun pour que « simplifier avant » ait un sens.
    const c = rng.int(2, 7);          // le facteur qui se croise
    let a = vraieFraction(rng, 2, 5);
    let b = vraieFraction(rng, 2, 5);
    a = fr(a.n * c, a.d);
    b = fr(b.n, b.d * c);
    const v = fois(a, b);
    return {
        html: `${fracHtml(a)} × ${fracHtml(b)}`,
        texte: `${txt(a)} × ${txt(b)}`,
        valeur: v,
        etapes: `On multiplie les numérateurs entre eux et les dénominateurs entre eux. `
            + `Mais on SIMPLIFIE d'abord — sans cela on écrit ${a.n * b.n} sur `
            + `${a.d * b.d} et l'on cherche encore. Résultat : ${txt(v)}.`,
        leurres: [
            { valeur: fr(a.n * b.d, a.d * b.n),
                why: `Rien ne se retourne dans un PRODUIT : c'est la division qui `
                    + `renverse la seconde fraction.` },
            { valeur: fr(a.n + b.n, a.d + b.d),
                why: `On ne multiplie pas « en croix » et l'on n'additionne rien : `
                    + `haut × haut, bas × bas.` },
            { valeur: fr(a.n * b.n, a.d + b.d),
                why: `Les dénominateurs se MULTIPLIENT eux aussi : ${a.d} × ${b.d}.` }
        ]
    };
}

/**
 * DIVISER PAR UN ENTIER — la division au plus simple.
 *
 * Diviser par 3, c'est multiplier par 1/3 : le dénominateur grandit. C'est la
 * marche qui manquait avant « diviser par une fraction », où il faut EN PLUS
 * retourner la seconde.
 */
function barreauSurEntier(rng) {
    const d = rng.int(2, 9);
    const f = fracBrute(rng, d);
    const k = rng.int(2, 9);
    const v = sur(f, fr(k));
    return {
        html: `${fracHtml(f)} ÷ ${k}`,
        texte: `${txt(f)} ÷ ${k}`,
        valeur: v,
        etapes: `Diviser par ${k}, c'est multiplier par ${txt(fr(1, k))}. Le dénominateur `
            + `est donc multiplié par ${k} : ${f.d} × ${k} = ${f.d * k}. Résultat ${txt(v)}.`,
        leurres: [
            { valeur: fr(f.n * k, f.d),
                why: `Diviser rend plus PETIT : c'est le dénominateur qui est multiplié `
                    + `par ${k}, pas le numérateur.` },
            { valeur: fr(f.n, f.d + k),
                why: `${k} multiplie le dénominateur, il ne s'y ajoute pas : `
                    + `${f.d} × ${k}, et non ${f.d} + ${k}.` },
            { valeur: fois(f, fr(k)),
                why: `Le signe est un ÷, pas un × : le résultat doit être plus petit `
                    + `que ${txt(f)}.` }
        ]
    };
}

// ── LES BARREAUX DU HAUT ────────────────────────────────────────────────────
//
// Chacun rend : l'énoncé (empilé pour l'écran, plat pour le papier), la
// valeur EXACTE, les étapes de la correction, et les leurres avec la faute
// que chacun représente.

/** Deux fractions dont l'une a un dénominateur multiple de l'autre. */
function barreau1(rng) {
    const d = rng.int(2, 6);
    const k = rng.int(2, 4);
    const a = fracBrute(rng, d);
    const b = fracBrute(rng, d * k);
    const moinsCi = rng.bool(0.4);
    const v = moinsCi ? moins(a, b) : plus(a, b);
    return {
        html: `${fracHtml(a)} ${moinsCi ? M : '+'} ${fracHtml(b)}`,
        texte: `${txt(a)} ${moinsCi ? M : '+'} ${txt(b)}`,
        valeur: v,
        etapes: `${b.d} est un multiple de ${a.d} : on met tout sur ${b.d}. `
            + `${txt(a)} = ${txt(fr(a.n * k, a.d * k))}, et l'on ${moinsCi ? 'retire' : 'ajoute'} `
            + `les numérateurs.`,
        leurres: [
            // LA FAUTE REINE, et elle survit très loin : additionner les
            // numérateurs ET les dénominateurs.
            { valeur: fr(moinsCi ? a.n - b.n : a.n + b.n, a.d + b.d),
                why: `On n'additionne JAMAIS les dénominateurs. ${txt(a)} ${moinsCi ? M : '+'} `
                    + `${txt(b)} ne fait pas ${a.n}${moinsCi ? M : '+'}${b.n} sur ${a.d}+${b.d}.` },
            { valeur: fr(moinsCi ? a.n - b.n : a.n + b.n, b.d),
                why: `Le dénominateur est bon, mais ${txt(a)} n'a pas été converti : `
                    + `${txt(a)} = ${txt(fr(a.n * k, a.d * k))}.` },
            { valeur: moinsCi ? plus(a, b) : moins(a, b),
                why: `C'est l'autre opération : relis le signe du milieu.` }
        ]
    };
}

/** Dénominateurs quelconques — il faut vraiment chercher le commun. */
function barreau2(rng) {
    const d1 = rng.int(2, 7);
    // ON CHOISIT d2 DANS CE QUI CONVIENT — cinquième fois que le raccourci
    // « si ça ne va pas, je décale » me piège dans ce projet. Ici le décalage
    // « d1 + 3 » retombait sur un multiple une fois sur treize, et le barreau
    // 2 servait alors l'exercice du barreau 1 : l'élève croit monter d'un
    // cran et refait le précédent.
    const possibles = [];
    for (let v = 2; v <= 9; v++) {
        if (v !== d1 && v % d1 !== 0 && d1 % v !== 0) possibles.push(v);
    }
    const d2 = possibles[rng.int(0, possibles.length - 1)];
    // Même raison qu'au barreau 1 : si les fractions se réduisent, les
    // dénominateurs ne sont plus ceux qu'on a choisis et le barreau peut
    // retomber sur le cas « l'un est multiple de l'autre », déjà travaillé.
    const a = fracBrute(rng, d1);
    const b = fracBrute(rng, d2);
    const moinsCi = rng.bool(0.45);
    const v = moinsCi ? moins(a, b) : plus(a, b);
    return {
        html: `${fracHtml(a)} ${moinsCi ? M : '+'} ${fracHtml(b)}`,
        texte: `${txt(a)} ${moinsCi ? M : '+'} ${txt(b)}`,
        valeur: v,
        etapes: `Ni ${d1} ni ${d2} n'est multiple de l'autre : on prend ${d1 * d2}. `
            + `${txt(a)} = ${txt(fr(a.n * d2, d1 * d2))} et ${txt(b)} = ${txt(fr(b.n * d1, d1 * d2))}.`,
        leurres: [
            { valeur: fr(moinsCi ? a.n - b.n : a.n + b.n, d1 + d2),
                why: `On n'additionne jamais les dénominateurs : il faut un dénominateur `
                    + `COMMUN, et ${d1} + ${d2} n'en est pas un.` },
            { valeur: fr(moinsCi ? a.n - b.n : a.n + b.n, d1 * d2),
                why: `Le dénominateur commun est bon, mais les numérateurs n'ont pas été `
                    + `convertis : ${a.n} devient ${a.n * d2}, et ${b.n} devient ${b.n * d1}.` },
            { valeur: moinsCi ? plus(a, b) : moins(a, b),
                why: `C'est l'autre opération : relis le signe du milieu.` }
        ]
    };
}

/** Un produit de trois fractions — on simplifie AVANT de multiplier. */
/**
 * LES TIRAGES VALABLES DU PRODUIT À TROIS FACTEURS, CALCULÉS UNE FOIS.
 *
 * Le produit est bâti pour se simplifier beaucoup — comme celui de la feuille,
 * 12/7 × 2/9 × 21/8 = 1 —, mais `fr` réduit chaque facteur au moment où on le
 * construit : selon les nombres tirés, les trois pouvaient devenir entiers et
 * le barreau posait une multiplication d'entiers. MESURÉ : 0,6 % des
 * questions, soit une sur cent soixante-dix, sans aucune fraction dans un
 * chapitre sur les fractions.
 *
 * On ne tire donc pas pour rattraper ensuite — c'est le motif qui a déjà piégé
 * ce projet cinq fois. On énumère les quintuplets qui donnent au moins DEUX
 * vraies fractions, et l'on tire dedans.
 */
const TIRAGES_TROIS = (() => {
    const out = [];
    for (let p = 2; p <= 6; p++) {
        for (let q = 2; q <= 5; q++) {
            for (let r = 3; r <= 7; r++) {
                for (let k = 2; k <= 3; k++) {
                    for (let m = 2; m <= 5; m++) {
                        const a = fr(p * q, r), b = fr(r, p * k), c = fr(m, q);
                        const vraies = [a, b, c].filter(f => f.d > 1).length;
                        if (vraies >= 2) out.push({ p, q, r, k, m });
                    }
                }
            }
        }
    }
    return out;
})();

function barreau3(rng) {
    const t = TIRAGES_TROIS[rng.int(0, TIRAGES_TROIS.length - 1)];
    const { p, q, r } = t;
    const a = fr(p * q, r);
    const b = fr(r, p * t.k);
    const c = fr(t.m, q);
    const v = fois(fois(a, b), c);
    return {
        html: `${fracHtml(a)} × ${fracHtml(b)} × ${fracHtml(c)}`,
        texte: `${txt(a)} × ${txt(b)} × ${txt(c)}`,
        valeur: v,
        etapes: `On multiplie les numérateurs entre eux et les dénominateurs entre eux — `
            + `mais on SIMPLIFIE d'abord : ${r} est en haut et en bas, ${q} aussi. `
            + `Sans cela on manipule ${a.n * b.n * c.n} sur ${a.d * b.d * c.d}.`,
        leurres: [
            { valeur: fois(a, b),
                why: `Le troisième facteur a été oublié.` },
            { valeur: fois(fois(a, { n: b.d, d: b.n }), c),
                why: `Pour un PRODUIT on ne retourne rien : c'est la division qui `
                    + `renverse la seconde fraction.` },
            { valeur: sur(fois(a, b), c),
                why: `Les trois sont multipliées : le dernier signe est un ×, pas un ÷.` }
        ]
    };
}

/** Diviser, c'est multiplier par l'inverse. */
function barreau4(rng) {
    // DEUX VRAIES FRACTIONS : `fr(rng.int(1, 9), rng.int(2, 8))` se réduisait
    // en entier, et le barreau posait « 1 ÷ 2 » — une division d'entiers là où
    // l'on veut apprendre à retourner la seconde fraction.
    const a = vraieFraction(rng, 2, 8);
    const b = vraieFraction(rng, 2, 8);
    const v = sur(a, b);
    const inv = fr(b.d, b.n);
    return {
        html: `${fracHtml(a)} ÷ ${fracHtml(b)}`,
        texte: `${txt(a)} ÷ ${txt(b)}`,
        valeur: v,
        etapes: `Diviser par ${txt(b)}, c'est multiplier par son inverse ${txt(inv)}. `
            + `Donc ${txt(a)} × ${txt(inv)} = ${txt(v)}.`,
        leurres: [
            { valeur: fois(a, b),
                why: `La seconde fraction doit être RETOURNÉE : ${txt(b)} devient ${txt(inv)}.` },
            { valeur: sur(b, a),
                why: `C'est ${txt(b)} ÷ ${txt(a)} : la division n'est pas commutative.` },
            { valeur: fr(a.n * b.d, a.d * b.n + 1),
                why: `Une erreur de calcul dans le produit croisé : ${a.n} × ${b.d} sur `
                    + `${a.d} × ${b.n}.` }
        ]
    };
}

/** Un entier devant une parenthèse : 5(2 − 7/3). */
function barreau5(rng) {
    const k = rng.int(2, 7);
    const e = rng.int(1, 4);
    // UNE VRAIE FRACTION, ET UNE PARENTHÈSE NON NULLE.
    //
    // MESURÉ : `fr(rng.int(2, 9), rng.int(2, 7))` se réduisait en entier une
    // fois sur quatre — fr(4, 2) vaut 2 —, et le barreau posait alors
    // « 5(2 − 1) » ou « 4(3 − 3) » : 25,2 % de questions SANS AUCUNE FRACTION
    // dans un chapitre sur les fractions, et 6,1 % de réponses nulles. Ce
    // n'est pas une marche facile, c'est une marche absente.
    //
    // `fracBrute` tire un numérateur premier avec le dénominateur : la
    // fraction survit donc à la réduction. Et l'on écarte le cas où elle vaut
    // exactement l'entier, qui viderait la parenthèse.
    const possibles = [];
    for (let den = 2; den <= 7; den++) {
        const cand = fracBrute(rng, den);
        if (cand.d > 1 && !memeF(cand, fr(e))) possibles.push(cand);
    }
    const f = possibles[rng.int(0, possibles.length - 1)];
    const dedans = moins(fr(e), f);
    const v = fois(fr(k), dedans);
    return {
        html: `${k}(${e} ${M} ${fracHtml(f)})`,
        texte: `${k}(${e} ${M} ${txt(f)})`,
        valeur: v,
        etapes: `On calcule d'abord la parenthèse : ${e} ${M} ${txt(f)} = ${txt(dedans)}. `
            + `Puis ${k} × ${txt(dedans)} = ${txt(v)}.`,
        leurres: [
            { valeur: moins(fr(k * e), f),
                why: `Le ${k} multiplie TOUTE la parenthèse : il faut aussi le distribuer `
                    + `sur ${txt(f)}, ou bien calculer la parenthèse d'abord.` },
            { valeur: fois(fr(k), plus(fr(e), f)),
                why: `Le signe dans la parenthèse est un moins.` },
            { valeur: fois(fr(k), fr(f.d - f.n, f.d)),
                why: `${e} ${M} ${txt(f)} ne se calcule pas en retirant le numérateur au `
                    + `dénominateur : on écrit ${e} sur ${f.d}.` }
        ]
    };
}

/** Les priorités : k(e − f) − g × h. La forme de A(x). */
function barreau6(rng) {
    const k = rng.int(2, 6);
    const e = rng.int(1, 3);
    // Trois VRAIES fractions, et une parenthèse qui ne s'annule pas : le
    // barreau écrivait « 6(1 − 1) − 3/5 × 1 », où ni la parenthèse ni la
    // multiplication ne demandent quoi que ce soit.
    const candidats = [];
    for (let i = 0; i < 6; i++) {
        const c = vraieFraction(rng, 2, 6);
        if (!memeF(c, fr(e))) candidats.push(c);
    }
    const f = candidats[rng.int(0, candidats.length - 1)];
    const g = vraieFraction(rng, 2, 7);
    const h = vraieFraction(rng, 2, 6);
    const dedans = moins(fr(e), f);
    const gauche = fois(fr(k), dedans);
    const droite = fois(g, h);
    const v = moins(gauche, droite);
    return {
        html: `${k}(${e} ${M} ${fracHtml(f)}) ${M} ${fracHtml(g)} × ${fracHtml(h)}`,
        texte: `${k}(${e} ${M} ${txt(f)}) ${M} ${txt(g)} × ${txt(h)}`,
        valeur: v,
        etapes: `Parenthèse d'abord : ${e} ${M} ${txt(f)} = ${txt(dedans)}, donc la gauche `
            + `vaut ${txt(gauche)}. Puis la multiplication : ${txt(g)} × ${txt(h)} = `
            + `${txt(droite)}. Et seulement alors la soustraction.`,
        leurres: [
            { valeur: fois(moins(gauche, g), h),
                why: `La multiplication passe AVANT la soustraction : on calcule `
                    + `${txt(g)} × ${txt(h)} d'abord, on ne soustrait pas ${txt(g)} puis on `
                    + `multiplie.` },
            { valeur: plus(gauche, droite),
                why: `Le signe du milieu est un moins.` },
            { valeur: moins(moins(fr(k * e), f), droite),
                why: `Le ${k} multiplie toute la parenthèse, pas seulement le ${e}.` }
        ]
    };
}

/** Une fraction de fractions : (a + b) ÷ (c − d). La forme de C. */
function barreau7(rng) {
    const a = fr(rng.int(1, 5), rng.int(2, 6));
    const b = fr(rng.int(1, 7), rng.int(2, 7));
    const c = fr(rng.int(3, 9), rng.int(2, 5));

    // ON CHOISIT d DANS CE QUI CONVIENT — on ne rattrape pas après coup.
    //
    // TROISIÈME FOIS QUE LE MÊME RACCOURCI ME PIÈGE, et c'est assez pour
    // l'écrire ici. J'avais posé « si la valeur ne va pas, je fais +1 » :
    // avec c = 2 et d = 1, le bas vaut 1, la garde se déclenche, d passe à 2 —
    // et le bas devient ZÉRO. Le rattrapage fabriquait précisément le cas
    // qu'il devait éviter, et l'application tombait sur une division par zéro.
    //
    // Deux conditions sur le bas : non nul (sinon on divise par zéro) et
    // différent de 1 (sinon la division est invisible et le barreau ne
    // travaille plus rien).
    const candidats = [];
    for (let dn = 1; dn <= 8; dn++) {
        for (let dd = 3; dd <= 9; dd++) {
            const essai = fr(dn, dd);
            const bas0 = moins(c, essai);
            if (bas0.n !== 0 && !memeF(bas0, fr(1))) candidats.push(essai);
        }
    }
    const d = candidats[rng.int(0, candidats.length - 1)];
    const haut = plus(a, b);
    const bas = moins(c, d);
    const v = sur(haut, bas);
    return {
        html: `<span class="fraction fraction--grande">`
            + `<span class="fraction-num">${fracHtml(a)} + ${fracHtml(b)}</span>`
            + `<span class="fraction-den">${fracHtml(c)} ${M} ${fracHtml(d)}</span></span>`,
        texte: `(${txt(a)} + ${txt(b)}) ÷ (${txt(c)} ${M} ${txt(d)})`,
        valeur: v,
        etapes: `La grande barre est une DIVISION. On calcule le haut : `
            + `${txt(a)} + ${txt(b)} = ${txt(haut)}. Puis le bas : ${txt(c)} ${M} ${txt(d)} = `
            + `${txt(bas)}. Et l'on divise : ${txt(haut)} ÷ ${txt(bas)} = ${txt(v)}.`,
        leurres: [
            { valeur: fois(haut, bas),
                why: `La grande barre divise : ${txt(haut)} ÷ ${txt(bas)}, donc on multiplie `
                    + `par l'inverse du bas.` },
            { valeur: sur(bas, haut),
                why: `C'est le HAUT divisé par le bas, pas l'inverse.` },
            { valeur: sur(fr(a.n + b.n, a.d + b.d), bas),
                why: `Le haut se calcule avec un dénominateur commun : on n'additionne `
                    + `pas les dénominateurs.` }
        ]
    };
}

/** Produit de deux parenthèses : (a − b)(c + d). La forme de D. */
function barreau8(rng) {
    // CHAQUE PARENTHÈSE CONTIENT UNE VRAIE FRACTION, et aucune ne s'annule.
    // Le premier jet posait explicitement `fr(1)` une fois sur deux et
    // laissait `fr` réduire les autres : on obtenait « (5 − 1)(5/6 + 1) », où
    // la première parenthèse ne travaille rien, ou « (5/2 − 5/2)(...) », qui
    // vaut zéro quoi qu'il y ait à droite.
    const a = fr(vraieFraction(rng, 2, 5).n + rng.int(2, 6) * 2, 2);
    const b = vraieFraction(rng, 2, 4);
    const c = vraieFraction(rng, 2, 6);
    const d = vraieFraction(rng, 2, 4);
    const gauche = moins(a, b);
    const droite = plus(c, d);
    const v = fois(gauche, droite);
    return {
        html: `(${fracHtml(a)} ${M} ${fracHtml(b)})(${fracHtml(c)} + ${fracHtml(d)})`,
        texte: `(${txt(a)} ${M} ${txt(b)})(${txt(c)} + ${txt(d)})`,
        valeur: v,
        etapes: `Deux parenthèses collées : c'est un produit. On calcule chacune — `
            + `${txt(a)} ${M} ${txt(b)} = ${txt(gauche)} et ${txt(c)} + ${txt(d)} = `
            + `${txt(droite)} — puis on multiplie.`,
        leurres: [
            { valeur: plus(gauche, droite),
                why: `Deux parenthèses collées se MULTIPLIENT : il n'y a pas de + entre `
                    + `elles.` },
            { valeur: fois(fr(a.n - b.n, a.d - b.d || 1), droite),
                why: `La première parenthèse se calcule avec un dénominateur commun, pas `
                    + `en soustrayant les dénominateurs.` },
            { valeur: fois(gauche, plus(c, fr(1))),
                why: `Une erreur dans la seconde parenthèse : relis ce qu'on y ajoute.` }
        ]
    };
}

// L'ÉCHELLE, DU PLUS SIMPLE AU PLUS COMPOSÉ — chaque barreau n'ajoute qu'une
// chose à celui d'avant. Les quatre premiers sont l'addition, du cas où il n'y
// a rien à convertir au cas où il faut tout convertir ; viennent ensuite la
// multiplication en trois marches, la division en deux, puis les expressions
// composées.
const BARREAUX = {
    1: { faire: barreauMeme, nom: 'Même dénominateur' },
    2: { faire: barreau1, nom: 'Dénominateur multiple de l\'autre' },
    3: { faire: barreau2, nom: 'Dénominateurs quelconques' },
    4: { faire: barreauFoisEntier, nom: 'Fraction × entier' },
    5: { faire: barreauFoisFraction, nom: 'Fraction × fraction' },
    6: { faire: barreau3, nom: 'Plusieurs facteurs, simplifier avant' },
    7: { faire: barreauSurEntier, nom: 'Diviser par un entier' },
    8: { faire: barreau4, nom: 'Diviser par une fraction' },
    9: { faire: barreau5, nom: 'Un entier devant une parenthèse' },
    10: { faire: barreau6, nom: 'Les priorités' },
    // LE PRODUIT AVANT LE QUOTIENT : deux parenthèses qu'on multiplie
    // demandent moins qu'un quotient, où il faut en plus retourner ce qu'on
    // vient de calculer.
    11: { faire: barreau8, nom: 'Produit de deux parenthèses' },
    12: { faire: barreau7, nom: 'Une fraction de fractions' }
};

/**
 * DES LEURRES DE SECOURS, ET POURQUOI IL EN FAUT.
 *
 * Chaque barreau propose trois fautes ciblées — additionner les
 * dénominateurs, oublier de retourner la seconde fraction, ignorer les
 * priorités. Mais deux fautes différentes tombent parfois sur le MÊME nombre,
 * ou sur le bon : on les écarte alors, et il n'en reste que deux, voire une.
 *
 * MESURÉ sur 3 300 questions engendrées : 8 n'avaient plus qu'UNE proposition
 * — la bonne réponse toute seule — et 150 n'en avaient que deux. Une question
 * à une proposition n'est pas une question difficile, c'est une question
 * cassée, et rien ne le signalait.
 *
 * Ceux-ci ne visent aucune faute précise : ce sont des voisins du résultat.
 * Leur `why` le dit honnêtement plutôt que d'inventer un diagnostic. Ils ne
 * paraissent que lorsque les fautes ciblées n'ont pas suffi.
 */
function leurresDeSecours(v) {
    const out = [];
    const vus = new Set([txt(v)]);
    const pousser = (n, d, why) => {
        const f = fr(n, d);
        if (!f || f.n === 0 || vus.has(txt(f))) return;
        vus.add(txt(f));
        out.push({ valeur: f, why });
    };
    pousser(v.d, v.n,
        `C'est l'INVERSE du résultat — ${txt(v)} retourné. Vérifie le sens de la `
        + `division, ou refais le dernier produit.`);
    pousser(-v.n, v.d,
        `Le résultat est juste au signe près : reprends les signes de chaque soustraction.`);
    pousser(v.n * 2, v.d,
        `Deux fois trop grand : un facteur a été compté deux fois, ou une `
        + `simplification a été oubliée.`);
    // ON BALAIE ASSEZ LARGE POUR QU'IL EN RESTE TOUJOURS TROIS. Les voisins se
    // télescopent entre eux aussi — MESURÉ : avec cinq candidats seulement,
    // 45 questions sur 4 400 n'avaient encore que deux ou trois propositions.
    for (let k = 1; k <= 5; k++) {
        pousser(v.n + k, v.d,
            `Il s'en faut de ${k} au numérateur : refais l'addition une fois le `
            + `dénominateur commun posé.`);
        pousser(v.n - k, v.d,
            `Il s'en faut de ${k} au numérateur : refais l'addition une fois le `
            + `dénominateur commun posé.`);
        pousser(v.n, v.d + k,
            `Le numérateur est juste, le dénominateur non : c'est le dénominateur `
            + `COMMUN qu'il faut garder, pas un voisin.`);
    }
    return out;
}

// ── LE GÉNÉRATEUR ───────────────────────────────────────────────────────────

export const calculFractionsGenerator = {
    id: 'nb.calculFractions',
    label: 'Calculer avec des fractions, jusqu\'aux expressions du devoir',
    skills: ['nb.fractions.calculer', 'nb.ensembles.appartenance'],
    answerKinds: ['choice'],
    ecrit: true,
    fractions: true,
    params: [
        {
            id: 'barreau', type: 'select', label: 'Quel barreau', default: '1',
            aide: 'Un barreau ajoute UNE chose au précédent. La progression se fait '
                + 'en posant plusieurs de ces exercices à la suite dans une séance.',
            options: [
                { value: '1', label: '1 — même dénominateur' },
                { value: '2', label: '2 — un dénominateur multiple de l\'autre' },
                { value: '3', label: '3 — dénominateurs quelconques' },
                { value: '4', label: '4 — fraction × entier' },
                { value: '5', label: '5 — fraction × fraction' },
                { value: '6', label: '6 — plusieurs facteurs, simplifier avant' },
                { value: '7', label: '7 — diviser par un entier' },
                { value: '8', label: '8 — diviser par une fraction' },
                { value: '9', label: '9 — un entier devant une parenthèse' },
                { value: '10', label: '10 — les priorités' },
                { value: '11', label: '11 — produit de deux parenthèses' },
                { value: '12', label: '12 — une fraction de fractions' },
                { value: 'ensemble', label: 'Calculer, puis dire l\'ensemble' },
                { value: 'revision', label: 'Révision — les quatre opérations' },
                { value: 'toutes', label: 'Tout mélangé' }
            ]
        }
    ],
    generate(params, ctx) {
        const rng = ctx.rng;
        const choix = String(params.barreau || '1');

        // LE NEUVIÈME BARREAU EST LA QUESTION DU DEVOIR : on calcule, et l'on
        // nomme l'ensemble. La réponse n'est plus un nombre mais un ensemble —
        // et l'on ne peut pas y répondre sans avoir calculé, ce qui est tout
        // l'intérêt de la poser ainsi.
        if (choix === 'ensemble') return questionEnsemble(rng);

        // « Révision » couvre LES QUATRE OPÉRATIONS une fois montées, c'est-
        // à-dire les huit premiers barreaux : additionner dans les trois cas
        // de dénominateurs, multiplier dans les trois cas de facteurs, diviser
        // dans les deux. La question n'est alors plus « comment » mais
        // « laquelle » — celle d'un contrôle.
        const possibles = choix === 'toutes' ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
            : (choix === 'revision' ? [1, 2, 3, 4, 5, 6, 7, 8] : [Number(choix) || 1]);
        // UN BARREAU INCONNU NE DOIT PAS FAIRE TOMBER LE GÉNÉRATEUR.
        //
        // `Number('9') || 1` vaut 9, et il n'y a pas de neuvième barreau :
        // `BARREAUX[9].faire` levait alors une erreur, c'est-à-dire un
        // exercice qui ne s'ouvre pas du tout. Aucun chemin de l'application ne
        // produit cette valeur aujourd'hui — les réglages viennent d'une liste
        // fermée — mais un parcours enregistré l'an dernier, ou un barreau
        // retiré du catalogue, suffirait. On retombe sur le premier barreau, ce
        // qui donne une question juste au lieu d'un écran vide.
        const tire = possibles[rng.int(0, possibles.length - 1)];
        const rang = BARREAUX[tire] ? tire : 1;
        const q = BARREAUX[rang].faire(rng);

        // ON DÉDOUBLONNE SUR LA VALEUR ET SUR L'ÉTIQUETTE. Deux fautes
        // différentes peuvent donner le même nombre — et un leurre qui vaut la
        // bonne réponse serait une SECONDE bonne réponse, marquée fausse.
        const faux = [];
        const dejaVu = new Set([txt(q.valeur)]);
        // Les fautes ciblées d'abord, les voisins ensuite — et seulement si
        // les premières n'ont pas suffi.
        for (const l of [...q.leurres, ...leurresDeSecours(q.valeur)]) {
            if (faux.length >= 3) break;
            if (!l.valeur || dejaVu.has(txt(l.valeur))) continue;
            dejaVu.add(txt(l.valeur));
            faux.push(l);
        }

        const brutes = [
            // LE CHAMP `texte`, ET LA FICHE PAPIER EN DÉPEND ENTIÈREMENT.
            //
            // MESURÉ : la feuille de ce chapitre imprimait « −2 · faux1 ·
            // faux0 · 2 ». `js/ui/printQuestions.js` écrit `texte` s'il
            // existe ; sinon le libellé, mais seulement s'il ne contient
            // aucune balise. Une fraction en contient — deux span empilés —,
            // une réponse entière n'en contient pas : d'où une feuille où
            // certaines propositions étaient justes et d'autres remplacées par
            // leur clef interne. Le mélange rendait le défaut plus difficile à
            // voir qu'une panne franche.
            { value: 'ok', label: fracHtml(q.valeur), texte: txt(q.valeur), correct: true },
            ...faux.map((l, i) => ({
                value: 'faux' + i, label: fracHtml(l.valeur), texte: txt(l.valeur),
                correct: false, why: l.why
            }))
        ];
        // ON PASSE PAR `finalizeChoices`, COMME TOUS LES AUTRES QCM DE L'APPLI.
        // Il mélange, mais il NOTE AUSSI le rang d'origine de chaque leurre —
        // et c'est ce rang que `reduireChoix` lit pour choisir lequel survit
        // quand l'échelle d'aide ouvre une séance à deux propositions. Sans cet
        // appel, `rang` restait indéfini, le tri devenait neutre, et le leurre
        // gardé était celui que le mélange avait mis devant : un au hasard.
        // Les trois chapitres de Seconde avaient le même trou.
        const choices = finalizeChoices(rng, brutes, { count: 4 });

        const ens = plusPetitEnsemble(q.valeur);
        return makeItem({
            seed: rng.seed,
            generatorId: 'nb.calculFractions',
            skillId: 'nb.fractions.calculer',
            answerKind: 'choice',
            prompt: {
                text: `Calcule : ${q.texte}`,
                html: '<div class="game-question cf-consigne">Calcule cette expression.</div>'
                    + `<div class="cf-expression">${q.html}</div>`,
                papier: `Calculer : ${q.texte}`
            },
            answer: 'ok',
            choices,
            hints: [
                rang <= 2 ? 'Il faut un dénominateur COMMUN avant d\'additionner.'
                    : 'Calcule un morceau à la fois, et écris chaque résultat avant de continuer.',
                q.etapes
            ],
            explanation: `${q.texte} = ${txt(q.valeur)}. ${q.etapes} `
                + `Le plus petit ensemble qui le contient est ${ENSEMBLES[ens].nom}.`,
            difficulty: Math.min(5, 1 + Math.floor(rang / 2)),
            meta: { barreau: rang, nomDuBarreau: BARREAUX[rang].nom, ensemble: ens }
        });
    }
};

/**
 * LE NEUVIÈME BARREAU : calculer, puis nommer l'ensemble.
 *
 * C'est mot pour mot la consigne du devoir — « calculer puis préciser le plus
 * petit ensemble auquel appartient le résultat ». On tire l'expression dans
 * les barreaux qui produisent les formes de la feuille, et la réponse est un
 * ensemble.
 *
 * ON NE PEUT PAS Y RÉPONDRE SANS AVOIR CALCULÉ, et c'est voulu : les quatre
 * ensembles sont proposés, mais aucun ne se devine à la forme de l'énoncé.
 */
function questionEnsemble(rng) {
    const formes = [3, 5, 6, 7, 8];
    const rang = formes[rng.int(0, formes.length - 1)];
    const q = BARREAUX[rang].faire(rng);
    const bon = plusPetitEnsemble(q.valeur);

    // LES LEURRES SONT LES ENSEMBLES VOISINS — on répond ℚ pour un décimal, 𝔻
    // pour un rationnel. Les quatre sont toujours là : c'est la question du
    // devoir, et elle ne se réduit pas selon le résultat.
    const ordre = ['N', 'Z', 'D', 'Q'];
    const pourquoi = {
        N: 'le résultat est un entier positif',
        Z: 'le résultat est un entier négatif',
        D: 'le dénominateur réduit ne contient que des 2 et des 5, donc l\'écriture '
            + 'décimale s\'arrête',
        Q: 'le dénominateur réduit contient un autre facteur, donc l\'écriture décimale '
            + 'ne s\'arrête jamais'
    };
    const brutes = ordre.map(id => ({
        value: id, label: ENSEMBLES[id].label, correct: id === bon,
        why: id === bon ? undefined
            : (RANG_ENS[id] > RANG_ENS[bon]
                ? `${ENSEMBLES[id].nom} contient bien ${txt(q.valeur)}, mais ce n'est pas le `
                    + `PLUS PETIT : ${pourquoi[bon]}.`
                : `${txt(q.valeur)} n'est pas dans ${ENSEMBLES[id].nom} — ${pourquoi[bon]}.`)
    }));
    // Même raison qu'au-dessus, et ici le rang porte un sens : les ensembles
    // sont écrits du plus petit au plus grand, si bien que le leurre conservé à
    // deux propositions est le VOISIN du bon — la vraie question (« est-ce le
    // plus petit ? ») plutôt qu'un ensemble lointain qu'on écarte sans
    // réfléchir. `count: 4` : les quatre ensembles restent tous proposés, comme
    // le dit le commentaire ci-dessus.
    const choices = finalizeChoices(rng, brutes, { count: 4 });

    return makeItem({
        seed: rng.seed,
        generatorId: 'nb.calculFractions',
        skillId: 'nb.ensembles.appartenance',
        answerKind: 'choice',
        prompt: {
            text: `Calcule ${q.texte}, puis dis à quel ensemble appartient le résultat.`,
            html: '<div class="game-question cf-consigne">Calcule, puis donne le plus petit '
                + 'ensemble auquel le résultat appartient.</div>'
                + `<div class="cf-expression">${q.html}</div>`,
            papier: `Calculer ${q.texte}, puis préciser le plus petit ensemble auquel `
                + `le résultat appartient.`
        },
        answer: bon,
        choices,
        hints: [
            'Calcule d\'abord. L\'ensemble se lit ensuite sur le RÉSULTAT, pas sur l\'énoncé.',
            `Une fois réduite, une fraction est décimale si son dénominateur ne contient `
                + `que des 2 et des 5. Sinon son écriture décimale ne s'arrête jamais.`
        ],
        explanation: `${q.texte} = ${txt(q.valeur)}, donc ${ENSEMBLES[bon].nom} : `
            + `${pourquoi[bon]}. ${q.etapes}`,
        difficulty: 5,
        meta: { barreau: 9, nomDuBarreau: 'Et le plus petit ensemble', ensemble: bon }
    });
}

// Exportés pour le test, qui recalcule TOUT en rationnels exacts et vérifie
// qu'aucun leurre ne vaut la bonne réponse.
export const POUR_ESSAI = { BARREAUX, fr, plus, moins, fois, sur, txt, plusPetitEnsemble };
