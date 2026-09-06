// POSER UN PRODUIT DE FRACTIONS — décomposer, barrer, puis calculer.
//
// Rémy, après avoir essayé le QCM : « je trouve que multiplier des fractions en
// barrant en diagonale n'est pas clair, il faut pouvoir décomposer les nombres,
// mais un QCM ce n'est pas terrible. »
//
//     On écrit la multiplication, on a : 33/22 × 45/25
//     On clique sur le 33 et il apparaît  (… × …)/22 × 45/25
//     On a un bouton décomposer ou barrer ; barrer permet de barrer les mêmes
//     nombres en haut et en bas. Dans un premier temps, on peut appeler la
//     table de Pythagore pour chercher le nombre. On peut décomposer chaque
//     nombre présent.
//
// IL AVAIT RAISON, ET LE DÉFAUT ÉTAIT DE FOND. Le QCM demandait le RÉSULTAT :
// l'élève pouvait le trouver en multipliant tout puis en simplifiant à la fin,
// c'est-à-dire par la méthode qu'on voulait justement lui faire abandonner.
// « Barrer en diagonale » n'était qu'un conseil dans un corrigé qu'on lit après
// coup. Ici, décomposer et barrer sont les seuls gestes disponibles : la
// méthode n'est plus racontée, elle est FAITE.
//
// ET LES FRACTIONS NE SONT PLUS IRRÉDUCTIBLES. L'exemple de Rémy — 33/22 —
// se simplifie déjà tout seul, avant même qu'on multiplie. C'est voulu : dans
// un produit posé, on ne distingue plus « simplifier dans une fraction » de
// « simplifier en diagonale ». Il n'y a qu'un seul numérateur, un seul
// dénominateur, et des facteurs qui se barrent où qu'ils soient. C'est
// exactement ce que la barre de fraction veut dire, et le QCM le cachait.
//
// TROIS INVARIANTS TIENNENT TOUT LE MODULE :
//
//   1. LA VALEUR NE CHANGE JAMAIS. Décomposer 33 en 3 × 11 ne change pas le
//      produit ; barrer un 11 en haut et un 11 en bas non plus, puisque c'est
//      diviser le haut et le bas par le même nombre. Un test le vérifie après
//      chaque geste : c'est la promesse mathématique de l'atelier.
//   2. BARRER N'EFFACE PAS. Le nombre reste écrit, rayé — c'est le geste du
//      cahier, et c'est ce qui permet de relire son calcul. Il vaut 1 dans le
//      produit, il ne disparaît pas de la page.
//   3. ON N'IMPOSE PAS LA DÉCOMPOSITION « ATTENDUE ». 45 = 5 × 9 et 45 = 3 × 15
//      sont tous deux justes ; refuser le second parce qu'il sort de la table
//      de Pythagore compterait faux un élève qui a raison. La table est une
//      aide, pas une contrainte.
//
// Module pur : ni DOM, ni horloge.

import { pgcd } from './fractionsEquivalentes.js';

/** La table de Pythagore s'arrête là. Rémy : « va jusque 11 dans un premier
 *  temps ». C'est la table du cahier, et 11 × 9 = 99 tient sur deux chiffres. */
export const PYTHAGORE_MAX = 11;

let compteur = 0;
const jeton = (v) => ({ id: `t${++compteur}`, v, barre: false });

/**
 * L'ÉTAT DE DÉPART : deux fractions, un facteur par étage.
 *
 * On garde les fractions SÉPARÉES pour le dessin — l'élève doit reconnaître
 * l'énoncé qu'il vient de lire — alors que le calcul, lui, traite tout comme
 * un seul quotient. C'est la même chose, et c'est justement ce qu'on enseigne :
 * la barre de fraction ne sépare pas deux mondes.
 */
export function etatInitial({ a, b, c, d }) {
    return {
        fractions: [
            { haut: [jeton(a)], bas: [jeton(b)] },
            { haut: [jeton(c)], bas: [jeton(d)] }
        ]
    };
}

/** Une copie profonde — l'état ne se modifie jamais en place. */
const copier = (etat) => ({
    fractions: etat.fractions.map(f => ({
        haut: f.haut.map(t => ({ ...t })),
        bas: f.bas.map(t => ({ ...t }))
    }))
});

/** Tous les jetons du haut, toutes fractions confondues. */
export const tousHaut = (etat) => etat.fractions.flatMap(f => f.haut);
export const tousBas = (etat) => etat.fractions.flatMap(f => f.bas);
export const tousJetons = (etat) => [...tousHaut(etat), ...tousBas(etat)];

const trouver = (etat, id) => tousJetons(etat).find(t => t.id === id) || null;

/** Où vit ce jeton : quelle fraction, quel étage. */
function situer(etat, id) {
    for (let i = 0; i < etat.fractions.length; i++) {
        for (const etage of ['haut', 'bas']) {
            const k = etat.fractions[i][etage].findIndex(t => t.id === id);
            if (k >= 0) return { i, etage, k };
        }
    }
    return null;
}

/** Le produit des jetons NON barrés — un nombre barré vaut 1. */
const produitVivant = (jetons) => jetons.filter(t => !t.barre)
    .reduce((p, t) => p * t.v, 1);

/** La fraction que l'expression vaut EN L'ÉTAT, barrages compris. */
export function resultat(etat) {
    return { n: produitVivant(tousHaut(etat)), d: produitVivant(tousBas(etat)) };
}

/**
 * LA VALEUR DE L'EXPRESSION, barrages IGNORÉS.
 *
 * C'est l'invariant : elle doit être la même avant et après chaque geste. Un
 * barrage divise le haut et le bas par le même nombre, donc il ne change pas
 * le quotient — mais il change `resultat`, qui est l'écriture courante. Les
 * deux ne mesurent pas la même chose, et c'est pour cela qu'il en faut deux.
 */
export function valeur(etat) {
    const n = tousHaut(etat).reduce((p, t) => p * t.v, 1);
    const d = tousBas(etat).reduce((p, t) => p * t.v, 1);
    const g = pgcd(n, d) || 1;
    return { n: n / g, d: d / g };
}

/**
 * DÉCOMPOSER UN NOMBRE EN DEUX FACTEURS.
 *
 * @returns {{ok:true, etat}|{ok:false, pourquoi:string}}
 */
export function decomposer(etat, id, x, y) {
    const t = trouver(etat, id);
    if (!t) return { ok: false, pourquoi: 'Ce nombre n’est plus là.' };
    if (t.barre) return { ok: false, pourquoi: 'Ce nombre est déjà barré : il vaut 1.' };
    const a = Math.round(Number(x)), b = Math.round(Number(y));
    if (!Number.isFinite(a) || !Number.isFinite(b) || a < 1 || b < 1) {
        return { ok: false, pourquoi: 'Écris deux nombres entiers.' };
    }
    // DÉCOMPOSER PAR 1 N'EST PAS DÉCOMPOSER. « 33 = 1 × 33 » est vrai et ne
    // fait rien avancer : on tournerait en rond sans que rien ne l'arrête.
    if (a === 1 || b === 1) {
        return { ok: false, pourquoi: 'Multiplier par 1 ne décompose rien : cherche deux '
            + 'nombres plus grands que 1.' };
    }
    if (a * b !== t.v) {
        return { ok: false, pourquoi: `${a} × ${b} = ${a * b}, et pas ${t.v}.` };
    }
    const out = copier(etat);
    const ou = situer(out, id);
    out.fractions[ou.i][ou.etage].splice(ou.k, 1, jeton(a), jeton(b));
    return { ok: true, etat: out };
}

/**
 * BARRER LE MÊME NOMBRE EN HAUT ET EN BAS.
 *
 * On exige l'ÉGALITÉ STRICTE, pas un facteur commun : barrer 6 avec 3 sous
 * prétexte que 3 divise 6 escamote la moitié du geste — il resterait un 2 en
 * haut que personne n'a écrit. Pour barrer, il faut d'abord décomposer, et
 * c'est toute la leçon.
 */
export function barrer(etat, idHaut, idBas) {
    const h = tousHaut(etat).find(t => t.id === idHaut);
    const b = tousBas(etat).find(t => t.id === idBas);
    if (!h || !b) return { ok: false, pourquoi: 'Choisis un nombre en haut et un en bas.' };
    if (h.barre || b.barre) return { ok: false, pourquoi: 'Ce nombre est déjà barré.' };
    if (h.v !== b.v) {
        const g = pgcd(h.v, b.v);
        return {
            ok: false,
            pourquoi: g > 1
                ? `${h.v} et ${b.v} ne sont pas le même nombre. Ils ont ${g} en commun : `
                    + 'décompose-les d’abord, et tu pourras barrer.'
                : `${h.v} et ${b.v} n’ont rien en commun : on ne peut pas les barrer.`
        };
    }
    const out = copier(etat);
    tousHaut(out).find(t => t.id === idHaut).barre = true;
    tousBas(out).find(t => t.id === idBas).barre = true;
    return { ok: true, etat: out };
}

/** Rien ne se simplifie plus : l'écriture courante est irréductible. */
export function estFini(etat) {
    const r = resultat(etat);
    return pgcd(r.n, r.d) === 1;
}

/**
 * RESTE-T-IL UN BARRAGE À FAIRE SANS RIEN DÉCOMPOSER ?
 *
 * Sert à l'indice, et à savoir si l'élève est bloqué parce qu'il lui manque une
 * décomposition — c'est le moment où la table de Pythagore rend service.
 */
export function barragePossible(etat) {
    const hauts = tousHaut(etat).filter(t => !t.barre);
    const bas = tousBas(etat).filter(t => !t.barre);
    for (const h of hauts) {
        const b = bas.find(x => x.v === h.v);
        if (b) return { haut: h, bas: b };
    }
    return null;
}

/**
 * LES DÉCOMPOSITIONS D'UN NOMBRE, telles que la table les montre.
 *
 * Elle ne sert qu'à ALLUMER des cases : on n'oblige personne à choisir dans
 * cette liste — 45 = 3 × 15 est juste, et refuser une réponse juste parce
 * qu'elle sort du cadre du dessin serait un défaut, pas une exigence.
 */
export function decompositions(v, max = PYTHAGORE_MAX) {
    const out = [];
    for (let x = 2; x <= Math.min(max, v); x++) {
        const y = v / x;
        if (Number.isInteger(y) && y >= 2 && y <= max) out.push([x, y]);
    }
    return out;
}

// --- LE TIRAGE DES NOMBRES -------------------------------------------------
//
// QUATRE MARCHES, et ce qui monte est le NOMBRE DE GESTES, pas la difficulté
// du calcul. Barrer un facteur déjà écrit se voit ; le même facteur caché dans
// un produit demande de le chercher. C'est le seul escalier qui compte ici.

export const MARCHES_POSE = [
    {
        id: 'barrer', titre: 'Barrer ce qui est déjà écrit',
        decompositions: 0,
        aide: 'Le même nombre est écrit en haut et en bas : il n’y a qu’à le barrer.'
    },
    {
        id: 'un', titre: 'Un nombre à décomposer',
        decompositions: 1,
        aide: 'Un seul nombre cache le facteur commun. Décompose-le, puis barre.'
    },
    {
        id: 'deux', titre: 'Deux nombres à décomposer',
        decompositions: 2,
        aide: 'Les deux diagonales se simplifient, et chacune demande une décomposition.'
    },
    {
        id: 'tout', titre: 'Tout se décompose',
        decompositions: 4,
        aide: 'Les quatre nombres sont des produits, et deux facteurs se barrent. '
            + 'C’est l’exemple de Rémy : 33/22 × 45/25.'
    }
];

const marcheDe = (id) => MARCHES_POSE.find(m => m.id === id) || MARCHES_POSE[0];

/**
 * UN PRODUIT À POSER.
 *
 * Les nombres sont CONSTRUITS à partir de leurs facteurs, jamais tirés puis
 * testés : c'est la seule façon de garantir qu'une marche demande exactement
 * le nombre de décompositions qu'elle annonce.
 *
 * @returns {{a,b,c,d, marche, reponse, gestes}}
 */
export function tirerProduitPose(rng, opts = {}) {
    const { marche = 'barrer', maxFacteur = PYTHAGORE_MAX } = opts;
    const m = marcheDe(marche);
    const petit = () => rng.int(2, Math.min(9, maxFacteur));
    const facteur = () => rng.int(2, maxFacteur);

    for (let essai = 0; essai < 400; essai++) {
        let a, b, c, d, attendu;
        if (m.id === 'barrer') {
            // Le facteur commun est écrit tel quel, en haut à gauche et en bas
            // à droite : 3/4 × 5/3.
            const p = facteur();
            a = p; b = petit(); c = petit(); d = p; attendu = p;
        } else if (m.id === 'un') {
            // Il est caché dans un seul produit : 3/4 × 5/6, où 6 = 3 × 2.
            const p = facteur();
            a = p; b = petit(); c = petit(); d = p * petit(); attendu = p;
        } else if (m.id === 'deux') {
            // Une diagonale par décomposition : 3/4 × 8/9, où 8 = 4 × 2 et
            // 9 = 3 × 3.
            const p = facteur(), q = facteur();
            a = p; b = q; c = q * petit(); d = p * petit(); attendu = p * q;
        } else {
            // Les quatre nombres sont des produits — l'exemple de Rémy.
            const p = facteur(), q = facteur();
            a = p * petit(); b = p * petit(); c = q * petit(); d = q * petit();
            attendu = p * q;
        }

        // DEUX CHIFFRES AU PLUS. Au-delà, l'élève ne cherche plus un facteur,
        // il fait une division — et la table de Pythagore ne l'y aide plus.
        if ([a, b, c, d].some(v => v < 2 || v > 99)) continue;
        // UNE FRACTION QUI VAUT 1 N'EST PAS UNE QUESTION. Le tirage sortait
        // « 4/4 × 9/32 » et « 60/60 × 55/66 » : l'élève barre, il a raison, et
        // il n'a rien appris.
        if (a === b || c === d) continue;
        const n = a * c, den = b * d;
        const g = pgcd(n, den);
        // LA MARCHE NE DOIT PAS MENTIR, et c'est le garde-fou qui compte.
        //
        // Construire les nombres à partir d'un facteur partagé ne suffit pas :
        // le tirage sortait « 3/6 × 8/3 » sur la marche « barrer ce qui est
        // déjà écrit ». On barre bien les deux 3 — et il reste 8/6, qui se
        // simplifie encore, par une décomposition que la marche promettait de
        // ne pas demander. Le hasard avait ajouté un facteur commun par
        // accident (6 et 8 ont 2 en commun).
        //
        // On exige donc que TOUTE la simplification soit exactement celle
        // qu'on a construite : ni plus, ni moins.
        if (g !== attendu) continue;
        // Et le résultat reste une fraction : « = 3 » n'a plus de barre à
        // simplifier, et l'atelier se terminerait sur une écriture qu'on
        // n'écrit pas.
        if (den / g === 1 || n / g === 1) continue;
        // Deux fractions identiques ne posent pas deux fois la même question.
        if (a === c && b === d) continue;

        return {
            a, b, c, d, marche: m.id, titre: m.titre,
            reponse: { n: n / g, d: den / g },
            brut: { n, d: den },
            gestes: m.decompositions
        };
    }
    // Repli : l'exemple de Rémy, qui marche toujours.
    return {
        a: 33, b: 22, c: 45, d: 25, marche: m.id, titre: m.titre,
        reponse: { n: 27, d: 10 }, brut: { n: 1485, d: 550 }, gestes: 4
    };
}

/** Le raisonnement, dans l'ordre où on le fait — jamais le résultat. */
export function etapesPose(p) {
    return [
        'Une multiplication de fractions n’a qu’UN numérateur et qu’UN '
            + 'dénominateur : tout ce qui est en haut se multiplie, tout ce qui est '
            + 'en bas aussi. La barre du milieu ne sépare pas deux mondes.',
        'Un nombre qui se trouve en haut ET en bas se barre : le diviser en haut '
            + 'et en bas par lui-même ne change pas la fraction.',
        p.gestes === 0
            ? 'Ici le nombre est déjà écrit des deux côtés — regarde bien.'
            : 'Aucun nombre n’est écrit deux fois ? Alors décompose : cherche celui '
                + 'qui se cache dans un produit. La table de Pythagore te dit dans '
                + 'quelles multiplications il apparaît.'
    ];
}
