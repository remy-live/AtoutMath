// LA VALEUR EXACTE D'UNE EXPRESSION NUMÉRIQUE — (n/d)√r, et rien d'autre.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « oui fais les » — le pas à pas pour les racines carrées, le calcul
// de fractions et le calcul avec des puissances.
//
// LES TROIS CHAPITRES ONT BESOIN DE LA MÊME CHOSE, et c'est ce module. Juger
// une ligne tapée demande de savoir si elle VAUT la ligne attendue ; le juge
// du calcul littéral (`maths/etapes.js`) compare des POLYNÔMES, ce qui ne dit
// rien de √80 ni de 7/12.
//
// POURQUOI (n/d)√r SUFFIT POUR LES TROIS. Un rationnel est le cas r = 1 : les
// fractions et les puissances de 10 y entrent sans rien ajouter. Une racine
// carrée du programme de Seconde est exactement de cette forme. Et la forme
// est CLOSE par les quatre opérations tant que les radicandes s'accordent —
// une somme comme √2 + √3 ne s'écrit pas ainsi, et l'on rend alors `null`
// plutôt qu'une approximation : mieux vaut dire « je ne sais pas lire » que
// compter faux une réponse qu'on n'a pas comprise.
//
// ON NE COMPARE JAMAIS DES FLOTTANTS. √2 × √2 vaut 2 exactement, et le calcul
// en virgule flottante rendrait 2.0000000000000004. Une comparaison à epsilon
// près marche presque toujours, et « presque » est le pire des états pour un
// juge : la question qui échoue est rare, donc invisible, et elle compte faux
// une réponse juste. Les entiers, eux, sont égaux ou ne le sont pas.
//
// CE MODULE A ÉTÉ EXTRAIT DE `generators/racines.js`, où il vivait seul. Ni
// DOM ni horloge : tout se teste sous Node.

const pgcd = (a, b) => (b ? pgcd(b, a % b) : Math.abs(a));

/**
 * Construit (n/d)√r SOUS SA FORME RÉDUITE : les carrés de r sortent, la
 * fraction se simplifie.
 *
 * Toute la leçon du chapitre des racines tient dans cette boucle : on
 * décompose r en facteurs premiers, chaque PAIRE sort un facteur, chaque
 * facteur seul reste dedans. √72 = √(2×2×2×3×3) : la paire de 2 sort un 2, la
 * paire de 3 sort un 3, le 2 restant demeure — 2 × 3 × √2 = 6√2.
 */
export function rac(n, d, r) {
    if (d === 0 || r <= 0 || !Number.isInteger(r)) return null;
    if (!Number.isInteger(n) || !Number.isInteger(d)) return null;
    let dehors = 1, dedans = 1, m = r;
    for (let p = 2; p * p <= m; p++) {
        let e = 0;
        while (m % p === 0) { m /= p; e++; }
        dehors *= Math.pow(p, Math.floor(e / 2));
        if (e % 2) dedans *= p;
    }
    if (m > 1) dedans *= m;
    n *= dehors;
    if (d < 0) { n = -n; d = -d; }
    const g = pgcd(Math.abs(n), d) || 1;
    return { n: n / g, d: d / g, r: dedans };
}

export const entier = (v) => rac(v, 1, 1);
export const racineDe = (v) => rac(1, 1, v);
export const foisR = (a, b) => (a && b ? rac(a.n * b.n, a.d * b.d, a.r * b.r) : null);
/** Somme : elle n'a de sens que si les deux radicandes sont les mêmes. */
export const plusR = (a, b) =>
    (!a || !b || a.r !== b.r ? null : rac(a.n * b.d + b.n * a.d, a.d * b.d, a.r));
export const moinsR = (a, b) =>
    (!a || !b || a.r !== b.r ? null : rac(a.n * b.d - b.n * a.d, a.d * b.d, a.r));
/**
 * Quotient — et c'est lui qui « rend le dénominateur entier ».
 *
 * (n₁/d₁)√r₁ ÷ (n₂/d₂)√r₂ : on multiplie en haut et en bas par √r₂, ce qui
 * fait sortir r₂ du dénominateur. C'est exactement le geste du cours.
 */
export const surR = (a, b) => (!a || !b || b.n === 0 ? null
    : rac(a.n * b.d, a.d * b.n * b.r, a.r * b.r));
export const opposeR = (a) => (a ? rac(-a.n, a.d, a.r) : null);

/** La valeur décimale — pour trier et comparer des grandeurs, JAMAIS pour juger. */
export const valeur = (x) => (x.n / x.d) * Math.sqrt(x.r);
/** L'égalité EXACTE, celle qui sert à juger. */
export const memeR = (a, b) => !!a && !!b && a.n === b.n && a.d === b.d && a.r === b.r;

/** Un entier sans carré dans ses facteurs : 5, 6, 10 oui ; 8, 12, 45 non. */
export function sansCarre(n) {
    if (!Number.isInteger(n) || n < 1) return false;
    let m = n;
    for (let p = 2; p * p <= m; p++) {
        let e = 0;
        while (m % p === 0) { m /= p; e++; }
        if (e >= 2) return false;
    }
    return true;
}

/**
 * LA VALEUR EXACTE D'UN ARBRE DE FORMULE.
 *
 * Rend `null` dès qu'une branche sort de la forme (n/d)√r — une racine de
 * racine, une lettre, une somme de radicandes différents. C'est voulu : ce
 * module juge des lignes d'élève, et il vaut mieux refuser de lire que lire à
 * peu près.
 */
export function valeurDe(n) {
    if (!n || typeof n !== 'object') return null;
    switch (n.sorte) {
        case 'groupe': return valeurDe(n.dedans);
        // L'ANALYSEUR REND LES NOMBRES EN TEXTE — `{sorte:'nombre', v:'7'}`.
        // C'est cohérent de son côté (il rend ce qu'il a lu) et c'est le
        // genre de détail qui fait rendre `null` à tout un module sans un
        // mot : `Number.isInteger('7')` est faux.
        case 'nombre': {
            const v = Number(n.v);
            return Number.isInteger(v) ? entier(v) : null;
        }
        case 'oppose': return opposeR(valeurDe(n.x));
        case 'somme': {
            // UNE SOMME SE RANGE PAR RADICANDE, elle ne s'accumule pas.
            //
            // Ma première écriture partait de `entier(0)` et ajoutait terme à
            // terme. Or `plusR` exige des radicandes ÉGAUX, et zéro porte
            // r = 1 : « 0 + √5 » était donc refusé, et « √5 − √5 » aussi,
            // alors que le second vaut zéro et que le premier vaut √5. Mon
            // propre banc l'a dit avant que ça parte.
            //
            // On range donc les termes par radicande, on additionne les
            // rationnels de chaque tas, et l'on jette les tas nuls — c'est
            // ainsi qu'un √5 − √5 disparaît. S'il reste deux tas, la somme
            // n'est pas de la forme (n/d)√r et l'on rend `null`.
            const tas = new Map();
            for (const x of n.termes) {
                const v = valeurDe(x);
                if (!v) return null;
                const acc = tas.get(v.r);
                tas.set(v.r, acc
                    ? rac(acc.n * v.d + v.n * acc.d, acc.d * v.d, 1)
                    : rac(v.n, v.d, 1));
            }
            const vivants = [...tas.entries()].filter(([, c]) => c && c.n !== 0);
            if (!vivants.length) return entier(0);
            if (vivants.length > 1) return null;
            const [r, c] = vivants[0];
            return rac(c.n, c.d, r);
        }
        case 'produit': {
            let t = entier(1);
            for (const x of n.facteurs) t = foisR(t, valeurDe(x));
            return t;
        }
        case 'division': case 'quotient': return surR(valeurDe(n.haut), valeurDe(n.bas));
        case 'racine': {
            const sous = valeurDe(n.sous);
            // √ d'un rationnel seulement, et d'un entier : √(9/16) sort du
            // programme de ce module tant que personne ne l'a demandé.
            if (!sous || sous.r !== 1 || sous.d !== 1 || sous.n < 0) return null;
            return racineDe(sous.n);
        }
        case 'puissance': {
            const base = valeurDe(n.base);
            const e = n.exposant;
            // L'EXPOSANT NÉGATIF S'ÉCRIT `oppose`, PAS `nombre`. 10⁻² est le
            // cœur de la notation scientifique : le manquer rendait `null`
            // sur tout le chapitre des puissances.
            const lireExposant = (x) => {
                if (typeof x === 'number') return x;
                if (!x || typeof x !== 'object') return null;
                if (x.sorte === 'groupe') return lireExposant(x.dedans);
                if (x.sorte === 'nombre') return Number(x.v);
                if (x.sorte === 'oppose') {
                    const v = lireExposant(x.x);
                    return v === null ? null : -v;
                }
                return null;
            };
            const k = lireExposant(e);
            if (!base || k === null || !Number.isInteger(k)) return null;
            if (k < 0) return surR(entier(1), puissanceDe(base, -k));
            return puissanceDe(base, k);
        }
        default: return null;
    }
}

function puissanceDe(base, k) {
    let t = entier(1);
    for (let i = 0; i < k; i++) t = foisR(t, base);
    return t;
}

/**
 * LIRE UNE LIGNE TAPÉE. Les mêmes libertés d'écriture que partout ailleurs :
 * le trait d'union pour le moins, `sqrt` pour √, les espaces libres.
 */
export function lireExacte(texte, fx) {
    const t = String(texte == null ? '' : texte).replace(/\s+/g, '');
    if (!t) return null;
    try { return valeurDe(fx.analyser(t)); } catch (e) { return null; }
}

/**
 * LES RADICANDES TELS QU'ILS SONT ÉCRITS — et non tels qu'ils valent.
 *
 * C'EST LA MESURE DE « ON A SORTI LES CARRÉS ». √20 et 2√5 ont la même
 * valeur exacte : `rac` les ramène toutes deux à (2/1)√5, puisque la
 * réduction est dans le constructeur. Une étape qui demande d'extraire les
 * carrés serait donc sautable — elle passerait pour faite avant qu'on l'ait
 * faite, ce qui est exactement le défaut que `poidsEcrit` corrige du côté des
 * polynômes.
 *
 * On regarde donc ce qui est ÉCRIT sous les barres.
 */
export function radicandesEcrits(arbre) {
    const out = [];
    const voir = (x) => {
        if (!x || typeof x !== 'object') return;
        if (x.sorte === 'racine') {
            const v = valeurDe(x.sous);
            out.push(v && v.r === 1 && v.d === 1 ? v.n : null);
            return;   // on ne descend pas : √(4 × 5) compte pour un radicande
        }
        Object.values(x).forEach(v => {
            if (Array.isArray(v)) v.forEach(voir); else voir(v);
        });
    };
    voir(arbre);
    return out;
}

/** Combien de termes la ligne écrit, au premier niveau. */
export const termesEcrits = (arbre) => {
    const x = arbre && arbre.sorte === 'groupe' ? arbre.dedans : arbre;
    return x && x.sorte === 'somme' ? x.termes.length : 1;
};
