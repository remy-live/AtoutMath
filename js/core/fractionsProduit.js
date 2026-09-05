// MULTIPLIER DEUX FRACTIONS — avec et sans décomposition.
//
// Rémy : « on fait les multiplications de fractions avec et sans
// décomposition ».
//
// LA RÈGLE EST LA PLUS FACILE DU CHAPITRE, ET C'EST LE PIÈGE. Pour additionner
// il faut un dénominateur commun ; pour multiplier, on multiplie les
// numérateurs entre eux et les dénominateurs entre eux, et c'est tout. Un
// élève l'applique dès la première question. Ce qu'il ne sait pas faire, c'est
// s'arrêter avant de calculer.
//
//     3/4 × 8/9 = (3 × 8)/(4 × 9) = 24/36 = 2/3
//
// La ligne du milieu est celle qui coûte : il faut ensuite CHERCHER que 24 et
// 36 ont 12 en commun. En décomposant d'abord, on ne la calcule jamais :
//
//     3/4 × 8/9 = (3 × 8)/(4 × 9)
//               = (3 × 4×2)/(4 × 3×3)      ← 8 = 4 × 2 et 9 = 3 × 3
//               = 2/3                       ← on barre 3 avec 3, 4 avec 4
//
// C'est le même calcul, et ce n'est pas le même travail : à droite on cherche
// un PGCD sur des nombres à deux chiffres, à gauche on reconnaît des facteurs
// qui sont déjà écrits. La deuxième méthode est la seule qui tienne quand les
// nombres grandissent — et c'est pour cela qu'on l'apprend avant d'en avoir
// besoin.
//
// LES DEUX CAS SE CONSTRUISENT, ILS NE SE TIRENT PAS AU HASARD. Un produit pris
// au hasard tombe presque toujours du même côté, et le réglage ne voudrait plus
// rien dire. Ici :
//
//   SANS DÉCOMPOSITION : rien ne se croise (pgcd(a,d) = pgcd(b,c) = 1), donc le
//     produit est déjà irréductible. On multiplie, on a fini.
//   AVEC DÉCOMPOSITION : quelque chose se croise, et c'est TOUT ce qui se
//     simplifie — puisque chaque fraction est donnée irréductible, a n'a rien à
//     partager avec b. La simplification vient donc forcément d'une diagonale,
//     ce qui est exactement l'idée qu'on enseigne.
//
// Module pur : ni DOM, ni horloge.

import { pgcd, estIrreductible } from './fractionsEquivalentes.js';

/** Au-delà, le calcul n'est plus la règle des fractions mais une multiplication. */
const PRODUIT_MAX = 100;
const produitTropGros = (n, d) => n > PRODUIT_MAX || d > PRODUIT_MAX;

/** La fraction réduite, sous forme de couple — pour comparer des VALEURS. */
export function reduire(n, d) {
    const g = pgcd(Math.abs(n), Math.abs(d)) || 1;
    return { n: n / g, d: d / g };
}

/** Deux écritures désignent-elles le même nombre ? `8/12` et `2/3`, oui. */
export function memeValeur(a, b) {
    return a.n * b.d === b.n * a.d;
}

/**
 * UN PRODUIT DE DEUX FRACTIONS, du côté demandé.
 *
 * @param {Object} rng
 * @param {Object} [opts]
 * @param {string} [opts.decomposition] - 'sans' | 'avec' | 'les-deux'
 * @param {number} [opts.maxDen]  - plus grand dénominateur des deux facteurs
 * @param {number} [opts.maxNum]  - plus grand numérateur des deux facteurs
 * @returns {{a,b,c,d, produit, reponse, croise, g1, g2, ap, bp, cp, dp}}
 *   `g1` croise le numérateur de gauche avec le dénominateur de droite, `g2`
 *   l'inverse ; `ap`…`dp` sont les quatre nombres une fois barrés. `croise` dit
 *   si la question demande de décomposer.
 */
export function tirerProduit(rng, opts = {}) {
    const { decomposition = 'sans', maxDen = 10, maxNum = 12, eviter = [] } = opts;

    for (let essai = 0; essai < 200; essai++) {
        const b = rng.int(2, Math.max(2, maxDen));
        const d = rng.int(2, Math.max(2, maxDen));
        const a = rng.int(1, Math.max(1, maxNum));
        const c = rng.int(1, Math.max(1, maxNum));

        // CHAQUE FACTEUR EST DONNÉ IRRÉDUCTIBLE, comme dans un énoncé. Sans
        // cela, « 2/4 × 5/7 » se simplifierait DANS une fraction avant même
        // qu'on ait multiplié : ce serait une question de simplification, pas
        // de produit, et le réglage « sans décomposition » deviendrait faux.
        if (!estIrreductible(a, b) || !estIrreductible(c, d)) continue;
        // 1/1 et 3/1 ne sont pas des fractions à multiplier.
        if (b === 1 || d === 1) continue;
        // Deux fois la même : « 2/3 × 2/3 » se répond par un carré, pas par la
        // règle qu'on travaille.
        if (a === c && b === d) continue;

        const g1 = pgcd(a, d);   // le numérateur de gauche avec le dénominateur de droite
        const g2 = pgcd(c, b);   // et l'autre diagonale
        const croise = g1 > 1 || g2 > 1;

        const veut = decomposition === 'les-deux' ? rng.bool()
            : decomposition === 'avec';
        if (croise !== veut) continue;

        const ap = a / g1, dp = d / g1, cp = c / g2, bp = b / g2;
        const produit = { n: a * c, d: b * d };

        const reponse = { n: ap * cp, d: bp * dp };

        // ON RESTE DANS LES TABLES. Sans plafond sur le PRODUIT, « 12/5 × 12/7 »
        // sort 144/35 : la règle des fractions y tient en une ligne et tout le
        // reste est une multiplication à deux chiffres. On plafonne le résultat
        // brut plutôt que chaque nombre, pour garder les 11 et les 12 quand ils
        // tombent en face d'un petit.
        if (produitTropGros(a * c, b * d)) continue;
        // LE RÉSULTAT NE DOIT PAS ÊTRE UN ENTIER DÉGUISÉ. « 3/4 × 4/3 = 1 »
        // est juste, mais la réponse « 1/1 » ne s'écrit pas et « 1 » n'est plus
        // une fraction à comparer aux autres propositions.
        if (reponse.d === 1) continue;
        // Ni le produit d'une fraction par elle-même une fois barrée.
        const clef = `${a}/${b}x${c}/${d}`;
        if (eviter.includes(clef)) continue;

        return { a, b, c, d, produit, reponse, croise, g1, g2, ap, bp, cp, dp, clef };
    }
    // Repli : un produit toujours valable, plutôt que rien.
    return decomposition === 'avec'
        ? {
            a: 3, b: 4, c: 8, d: 9, produit: { n: 24, d: 36 }, reponse: { n: 2, d: 3 },
            croise: true, g1: 3, g2: 4, ap: 1, bp: 1, cp: 2, dp: 3, clef: '3/4x8/9'
        }
        : {
            a: 2, b: 3, c: 5, d: 7, produit: { n: 10, d: 21 }, reponse: { n: 10, d: 21 },
            croise: false, g1: 1, g2: 1, ap: 2, bp: 3, cp: 5, dp: 7, clef: '2/3x5/7'
        };
}

/**
 * LE RAISONNEMENT, dans l'ordre où on l'écrit au tableau.
 *
 * Il ne donne pas le résultat : il s'arrête sur ce qu'il reste à faire. Un
 * troisième indice qui annoncerait « 2/3 » ferait de l'aide un bouton
 * « donne-moi le point ».
 */
export function etapesProduit(p) {
    const debut = [
        'Pour multiplier deux fractions, il n’y a rien à mettre au même '
            + 'dénominateur : on multiplie les numérateurs entre eux, et les '
            + 'dénominateurs entre eux.',
        `Ici, cela fait (${p.a} × ${p.c}) en haut et (${p.b} × ${p.d}) en bas.`
    ];
    if (!p.croise) {
        return [...debut,
            'Rien ne se simplifie entre les deux fractions : pose les deux '
                + 'multiplications, et c’est fini.'];
    }
    // « 5 ET 5 ONT 5 EN COMMUN » NE SE DIT PAS. Quand les deux nombres de la
    // diagonale sont égaux, ce n'est plus un facteur commun à chercher : c'est
    // le même nombre en haut et en bas, et un professeur dit « le 5 se barre
    // avec le 5 ». La phrase générale, ici, est plus savante que la chose.
    const commun = (x, y, g) => (x === y
        ? `le ${x} du haut se barre avec le ${y} du bas`
        : `${x} et ${y} ont ${g} en commun`);
    const barres = [];
    if (p.g1 > 1) barres.push(commun(p.a, p.d, p.g1));
    if (p.g2 > 1) barres.push(commun(p.c, p.b, p.g2));
    return [...debut,
        `Avant de calculer, regarde EN DIAGONALE : ${barres.join(', et ')}. `
            + 'Un facteur qui se trouve en haut et en bas se barre — et tu n’auras '
            + 'jamais à simplifier un nombre à deux chiffres.'];
}

/**
 * LE CALCUL ÉCRIT EN ENTIER, pour le corrigé.
 *
 * Il montre les DEUX chemins quand ils diffèrent : décomposer d'abord, ou
 * multiplier puis simplifier. Rémy demande les deux, et c'est en les voyant
 * l'un sous l'autre qu'on comprend pourquoi le premier est le bon — la
 * question n'est pas « lequel est juste », ils le sont tous les deux, mais
 * « lequel te fait chercher un PGCD ».
 */
export function corrigeProduit(p) {
    const gauche = `${p.a}/${p.b} × ${p.c}/${p.d}`;
    if (!p.croise) {
        return `${gauche} = (${p.a} × ${p.c})/(${p.b} × ${p.d}) = `
            + `${p.produit.n}/${p.produit.d}. Rien n’est à simplifier : ${p.a} et ${p.d} `
            + `n’ont aucun facteur commun, ${p.c} et ${p.b} non plus.`;
    }
    const barre = (x, y, g) => (x === y ? `le ${x} avec le ${y}` : `${x} et ${y} par ${g}`);
    const barres = [];
    if (p.g1 > 1) barres.push(barre(p.a, p.d, p.g1));
    if (p.g2 > 1) barres.push(barre(p.c, p.b, p.g2));
    const total = pgcd(p.produit.n, p.produit.d);
    return `${gauche} = (${p.a} × ${p.c})/(${p.b} × ${p.d}). En décomposant d’abord, `
        + `on simplifie en diagonale — ${barres.join(', ')} — et il reste `
        + `(${p.ap} × ${p.cp})/(${p.bp} × ${p.dp}) = ${p.reponse.n}/${p.reponse.d}. `
        + `L’autre chemin donne le même résultat : ${p.produit.n}/${p.produit.d}, `
        + `qu’il faut alors simplifier par ${total}. C’est ce ${total}-là qu’on `
        + `s’épargne en barrant avant de calculer.`;
}
