// L'ARITHMÉTIQUE DE TROISIÈME — décomposer, PGCD, PPCM.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « J'aimerai bien des exercices pour décomposer un nombre et pgcd et
// ppcm niveau 3ème. Des exercices d'application direct et des petits
// problèmes ».
//
// ── POURQUOI CE MODULE EXISTE, ALORS QUE `pgcd` EST DÉJÀ ÉCRIT SIX FOIS ────
//
// Vérifié avant d'écrire une ligne : `pgcd` existe dans `core/pizza.js`,
// `core/thales.js`, `core/maths/polynome.js`, `core/maths/valeurExacte.js`,
// `generators/calculFractions.js`, `generators/racines.js` et
// `generators/lireUneFraction.js`. Sept copies de trois lignes — ce qui ne
// coûtait rien tant que `pgcd` n'était qu'un OUTIL pour simplifier une
// fraction au passage.
//
// IL DEVIENT ICI LE SUJET. Le PGCD n'est plus la façon de rendre 84/120
// présentable, c'est ce qu'on demande à l'élève de trouver — et avec lui
// arrivent la décomposition en facteurs premiers, le PPCM, et surtout le
// RAISONNEMENT qui dit lequel des deux un problème appelle. Cela mérite un
// endroit nommé, pur, et éprouvé pour lui-même. `core/pizza.js` réexporte
// donc d'ici plutôt que d'en garder une copie : une de moins.
//
// Pur : ni DOM, ni hasard, ni couleur. Tout s'éprouve sous Node.

/**
 * PLUS GRAND COMMUN DIVISEUR, par l'algorithme d'Euclide.
 *
 * `|| 1` : PGCD(0 ; 0) N'EXISTE PAS, et rendre 0 ferait diviser par zéro chez
 * l'appelant. Un diviseur commun qui vaut 1 est toujours vrai, et ne casse
 * rien en aval.
 */
export function pgcd(a, b) {
    a = Math.abs(Math.round(a)); b = Math.abs(Math.round(b));
    while (b) { [a, b] = [b, a % b]; }
    return a || 1;
}

/**
 * PLUS PETIT COMMUN MULTIPLE.
 *
 * ON DIVISE AVANT DE MULTIPLIER — `(a / pgcd) * b` et non `(a * b) / pgcd` —
 * parce que le produit de deux nombres de six chiffres dépasse la précision
 * entière de JavaScript avant la division. Les nombres d'un exercice de
 * troisième n'y arriveront jamais ; la règle, elle, se perd si on ne l'écrit
 * pas au moment où elle ne coûte rien.
 */
export function ppcm(a, b) {
    a = Math.abs(Math.round(a)); b = Math.abs(Math.round(b));
    if (!a || !b) return 0;
    return (a / pgcd(a, b)) * b;
}

/** Le plus petit multiple commun à toute une liste. */
export const ppcmListe = (liste) => liste.reduce((m, d) => ppcm(m, d), 1);

/**
 * UN NOMBRE EST-IL PREMIER ?
 *
 * ON S'ARRÊTE À LA RACINE, et c'est la raison pour laquelle 91 est le piège du
 * chapitre : qui essaie 2, 3, 5 et s'arrête là le déclare premier. Il faut
 * aller jusqu'à 9 — et 7 × 13 = 91 tombe en route.
 */
export function estPremier(n) {
    n = Math.abs(Math.round(n));
    if (n < 2) return false;
    if (n % 2 === 0) return n === 2;
    for (let d = 3; d * d <= n; d += 2) {
        if (n % d === 0) return false;
    }
    return true;
}

/**
 * LA DÉCOMPOSITION, FACTEUR PAR FACTEUR : 360 → [2, 2, 2, 3, 3, 5].
 *
 * Avec les répétitions, et dans l'ordre croissant — c'est la forme qu'on écrit
 * au tableau quand on descend l'escalier des divisions.
 */
export function facteursPremiers(n) {
    n = Math.abs(Math.round(n));
    const out = [];
    if (n < 2) return out;
    for (let d = 2; d * d <= n; d += (d === 2 ? 1 : 2)) {
        while (n % d === 0) { out.push(d); n /= d; }
    }
    if (n > 1) out.push(n);
    return out;
}

/**
 * TOUS LES DIVISEURS, DANS L'ORDRE : 12 → [1, 2, 3, 4, 6, 12].
 *
 * ON MONTE JUSQU'À LA RACINE ET L'ON RANGE LES DEUX BOUTS À LA FOIS, parce que
 * c'est exactement ce qu'on apprend à l'élève : les diviseurs vont PAR PAIRES,
 * 12 = 1 × 12 = 2 × 6 = 3 × 4, et l'on s'arrête quand les deux membres de la
 * paire se croisent. Une boucle de 1 à n rendrait la même liste et
 * n'enseignerait rien.
 *
 * `d * d === n` est le cas du carré parfait : 36 = 6 × 6, et 6 ne doit figurer
 * qu'une fois. Sans ce test, 36 rendrait deux « 6 » — et la question « combien
 * de diviseurs ? » deviendrait fausse sur les carrés, c'est-à-dire sur les
 * nombres qu'on choisit exprès pour ce chapitre.
 */
export function diviseurs(n) {
    n = Math.abs(Math.round(n));
    if (n < 1) return [];
    const petits = [], grands = [];
    for (let d = 1; d * d <= n; d++) {
        if (n % d) continue;
        petits.push(d);
        if (d * d !== n) grands.push(n / d);
    }
    return petits.concat(grands.reverse());
}

/**
 * LA MÊME, GROUPÉE : 360 → [{ p: 2, e: 3 }, { p: 3, e: 2 }, { p: 5, e: 1 }].
 *
 * C'est sous cette forme que le PGCD et le PPCM se LISENT — le plus petit
 * exposant pour l'un, le plus grand pour l'autre —, et c'est elle qu'on montre
 * dans la correction. Les deux formes servent, et aucune ne remplace l'autre :
 * l'escalier des divisions se lit à plat, la règle des exposants se lit groupée.
 */
export function facteursGroupes(n) {
    const out = [];
    for (const p of facteursPremiers(n)) {
        const dernier = out[out.length - 1];
        if (dernier && dernier.p === p) dernier.e++;
        else out.push({ p, e: 1 });
    }
    return out;
}

/**
 * LA DÉCOMPOSITION ÉCRITE, avec des exposants en caractères Unicode.
 *
 * `2³ × 3² × 5` ET NON `2^3 * 3^2 * 5`. L'accent circonflexe et l'étoile sont
 * de la notation de machine : un élève de troisième écrit des exposants, et la
 * feuille imprimée les porte. Les chiffres en exposant sont dans la table des
 * polices du PDF (voir `HORS_TABLE` dans ui/ficheRendu.js) — ⁰¹²³⁴⁵⁶⁷⁸⁹ y
 * passent intacts, ce qui n'est pas vrai de tous les symboles.
 */
const EXPOSANTS = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
export const enExposant = (n) => String(n).split('').map(c => EXPOSANTS[+c] || c).join('');

export function ecrireDecomposition(n) {
    const g = facteursGroupes(n);
    if (!g.length) return String(n);
    return g.map(({ p, e }) => (e === 1 ? String(p) : `${p}${enExposant(e)}`)).join(' × ');
}

/** La décomposition à plat, comme on la pose au tableau : « 2 × 2 × 2 × 3 × 3 × 5 ». */
export const ecrireAPlat = (n) => facteursPremiers(n).join(' × ') || String(n);

/**
 * DEUX NOMBRES SONT-ILS PREMIERS ENTRE EUX ?
 *
 * ATTENTION AU MOT : ni l'un ni l'autre n'a besoin d'être premier. 8 et 9 sont
 * premiers entre eux et aucun des deux n'est premier — c'est exactement la
 * confusion que la question travaille.
 */
export const premiersEntreEux = (a, b) => pgcd(a, b) === 1;

/**
 * LA FRACTION RENDUE IRRÉDUCTIBLE : [84, 120] → [7, 10].
 *
 * C'est l'usage que le programme de troisième donne au PGCD, et le seul où
 * l'élève le rencontre sans qu'on le lui demande explicitement.
 */
export function irreductible(num, den) {
    const d = pgcd(num, den);
    return [num / d, den / d];
}

/**
 * LE PGCD LU SUR LES DEUX DÉCOMPOSITIONS : les facteurs communs, au plus
 * PETIT exposant. C'est la méthode du cours — on la rend pour l'EXPLIQUER, pas
 * pour la calculer : `pgcd` ci-dessus est plus rapide et toujours juste.
 *
 * `{ commun: [{p, e}], ecrit: '2² × 3' }` — et `ecrit` vaut « 1 » quand il n'y
 * a aucun facteur commun, parce que c'est la réponse, et qu'une chaîne vide
 * laisserait l'écran dire « PGCD = ».
 */
export function pgcdExplique(a, b) {
    const ga = facteursGroupes(a), gb = facteursGroupes(b);
    const commun = [];
    for (const { p, e } of ga) {
        const chez = gb.find(x => x.p === p);
        if (chez) commun.push({ p, e: Math.min(e, chez.e) });
    }
    return {
        commun,
        ecrit: commun.length
            ? commun.map(({ p, e }) => (e === 1 ? String(p) : `${p}${enExposant(e)}`)).join(' × ')
            : '1'
    };
}

/**
 * LE PPCM LU SUR LES DEUX DÉCOMPOSITIONS : TOUS les facteurs, au plus GRAND
 * exposant. L'autre moitié de la règle, et celle qu'on oublie — un élève qui
 * ne garde que les facteurs communs calcule un PGCD en croyant faire un PPCM.
 */
export function ppcmExplique(a, b) {
    const tous = new Map();
    for (const { p, e } of [...facteursGroupes(a), ...facteursGroupes(b)]) {
        tous.set(p, Math.max(tous.get(p) || 0, e));
    }
    const liste = [...tous.entries()].sort((x, y) => x[0] - y[0]).map(([p, e]) => ({ p, e }));
    return {
        tous: liste,
        ecrit: liste.length
            ? liste.map(({ p, e }) => (e === 1 ? String(p) : `${p}${enExposant(e)}`)).join(' × ')
            : '1'
    };
}
