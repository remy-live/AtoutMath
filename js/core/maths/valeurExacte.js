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
    // AU-DELÀ DE 2⁵³, UN ENTIER N'EST PLUS UN ENTIER. 10¹⁸ ne se représente
    // pas exactement en virgule flottante, et tout ce module repose sur le
    // fait que deux entiers sont égaux ou ne le sont pas. Mesuré : le chapitre
    // des puissances pose 10⁶ × 10⁸, dont le produit vaut 10¹⁴ — mais ses
    // exposants vont jusqu'à 9 + 9, c'est-à-dire 10¹⁸.
    //
    // On rend `null` plutôt qu'une valeur approchée : un juge qui ne sait pas
    // doit le dire. Le chapitre des puissances compare donc ses EXPOSANTS —
    // voir `commePuissance` plus bas —, ce qui est de toute façon ce qu'un
    // professeur regarde.
    const GRAND = Number.MAX_SAFE_INTEGER;
    if (Math.abs(n) > GRAND || Math.abs(d) > GRAND || r > GRAND) return null;
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
            // L'EXPOSANT EST UNE EXPRESSION, PAS UN CHIFFRE. Rémy, en rouge
            // sur sa fiche de quatrième : « TU ÉCRIRAS LE CALCUL ! » — il veut
            // voir 10³ × 10² = 10³⁺² = 10⁵. La ligne du milieu porte donc une
            // SOMME en exposant, et ma première écriture ne savait lire qu'un
            // nombre ou son opposé : elle rendait `null` sur la ligne même que
            // le chapitre enseigne.
            const lireExposant = (x) => {
                if (typeof x === 'number') return Number.isInteger(x) ? x : null;
                const v = valeurDe(x);
                if (!v || v.r !== 1 || v.d !== 1) return null;
                return v.n;
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


/**
 * UNE ÉCRITURE VUE COMME UNE PUISSANCE : `{ base, exposant }`.
 *
 * RÉMY, en rouge sur sa fiche de quatrième : « TU ÉCRIRAS LE CALCUL ! » Il ne
 * veut pas le résultat, il veut voir 10³ × 10² = 10³⁺² = 10⁵.
 *
 * ON NE PEUT PAS JUGER CES LIGNES-LÀ SUR LEUR VALEUR : 10⁹ × 10⁹ vaut 10¹⁸,
 * qui dépasse 2⁵³ et cesse d'être un entier exact. On compare donc ce que le
 * professeur compare — la base et l'exposant.
 *
 * Reconnaît `10⁸`, `10^(3+2)`, `(10^4)^3`, `1/10^7`, `(2 × 5)^5`, et tout
 * produit ou quotient de puissances de MÊME base. Rend `null` sinon — deux
 * bases différentes ne se réunissent pas, et c'est justement la dernière
 * marche du chapitre.
 */
export function commePuissance(n) {
    if (!n || typeof n !== 'object') return null;
    const combiner = (a, b, signe) => {
        if (!a || !b) return null;
        // Un facteur ENTIER se laisse absorber s'il est une puissance de la
        // base : 100 × 10³ = 10⁵. Sinon les deux bases diffèrent.
        if (a.base !== b.base) return null;
        return { base: a.base, exposant: a.exposant + signe * b.exposant };
    };
    switch (n.sorte) {
        case 'groupe': return commePuissance(n.dedans);
        case 'nombre': {
            const v = Number(n.v);
            if (!Number.isInteger(v) || v <= 0) return null;
            if (v === 1) return { base: null, exposant: 0 };   // neutre
            return canoniser({ base: v, exposant: 1 });
        }
        case 'produit': {
            let t = { base: null, exposant: 0 };
            for (const f of n.facteurs) {
                const p = commePuissance(f);
                if (!p) return null;
                if (t.base === null) { t = { base: p.base, exposant: p.exposant }; continue; }
                if (p.base === null) continue;
                const c = combiner(t, p, 1);
                if (!c) return null;
                t = c;
            }
            return t.base === null ? null : t;
        }
        case 'quotient': case 'division': {
            const h = commePuissance(n.haut), b = commePuissance(n.bas);
            if (!h || !b) return null;
            // 1 / 10⁷ : le haut est neutre, la base vient du bas.
            if (h.base === null) return { base: b.base, exposant: -b.exposant };
            return combiner(h, b, -1);
        }
        case 'puissance': {
            // LA BASE SE LIT COMME UN NOMBRE, pas comme une puissance : la
            // dernière marche du chapitre écrit (2 × 5)⁵, dont la base vaut
            // 10. Lue comme une puissance, elle était « deux bases
            // différentes » et la ligne se faisait refuser.
            const b = valeurDe(n.base);
            const e = valeurDe(n.exposant);
            if (!b || b.r !== 1 || b.d !== 1 || b.n < 2) return null;
            if (!e || e.r !== 1 || e.d !== 1) return null;
            return canoniser({ base: b.n, exposant: e.n });
        }
        default: return null;
    }
}

/**
 * LA MÊME PUISSANCE, SOUS SA PLUS PETITE BASE.
 *
 * (10⁴)³ et 10¹² sont le même nombre, et 10000³ aussi. Sans cette réduction,
 * le juge comparerait (10000, 3) à (10, 12) et refuserait une ligne juste.
 *
 * On décompose la base en facteurs premiers et l'on sort le PGCD des
 * exposants : 10000 = 2⁴ × 5⁴ donne 10, avec quatre fois plus d'exposant.
 */
function canoniser(p) {
    if (!p || !Number.isInteger(p.base) || p.base < 2) return p;
    let m = p.base;
    const exp = [];
    const prem = [];
    for (let d = 2; d * d <= m; d++) {
        let e = 0;
        while (m % d === 0) { m /= d; e++; }
        if (e) { prem.push(d); exp.push(e); }
    }
    if (m > 1) { prem.push(m); exp.push(1); }
    if (!exp.length) return p;
    const pg = (a, b) => (b ? pg(b, a % b) : a);
    const g = exp.reduce(pg);
    if (g <= 1) return p;
    let racineBase = 1;
    prem.forEach((d, i) => { racineBase *= Math.pow(d, exp[i] / g); });
    return { base: racineBase, exposant: p.exposant * g };
}

/** Les deux écritures disent-elles la même puissance ? */
export const memePuissance = (a, b) => !!a && !!b
    && a.base === b.base && a.exposant === b.exposant;

/** La même, lue depuis un texte tapé. */
export function lirePuissance(texte, fx) {
    const t = String(texte == null ? '' : texte).replace(/\s+/g, '');
    if (!t) return null;
    try { return commePuissance(fx.analyser(t)); } catch (e) { return null; }
}
