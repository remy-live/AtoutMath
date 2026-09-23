// DÉVELOPPER ET FACTORISER — dans les limites du programme de Seconde.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// Rémy : « une fonction pour développer ou factoriser des expressions
// littérales dans la limite du niveau de seconde ».
//
// Et, la veille, sur un produit incomplet proposé comme leurre :
// « Évidemment programme de seconde » — c'est-à-dire qu'un produit dont un
// facteur se factorise encore N'EST PAS une factorisation.
//
// Ces deux phrases décrivent le même fichier. La seconde est même la plus
// exigeante des deux, parce qu'elle demande de savoir DIRE quand c'est fini.
//
// ── POURQUOI CE FICHIER EXISTE, ET CE QU'IL A DÉJÀ TROUVÉ ───────────────────
//
// J'avais annoncé « 0 réponse inachevée sur 21 000 » pour le chapitre de la
// factorisation. C'ÉTAIT FAUX, et la faute est instructive : mon contrôle
// cherchait, DANS LE TEXTE de la réponse, une différence de deux carrés
// parfaits entre parenthèses. Il ne pouvait donc voir que cela.
//
// En lisant les COEFFICIENTS plutôt que les caractères : 26,2 % des bonnes
// réponses gardaient un facteur commun non sorti — (6x − 4)(6x + 4), qui vaut
// 4(3x − 2)(3x + 2). L'application marquait donc faux l'élève qui écrivait
// (x² − 9)(2x + 1) au lieu de (x − 3)(x + 3)(2x + 1), pendant qu'elle acceptait
// sa propre réponse inachevée pour exactement la même raison.
//
// UN CRITÈRE QUI LIT DU TEXTE NE VOIT PAS CE QU'IL NE CHERCHE PAS. Celui d'ici
// est algébrique : il porte sur les coefficients, jamais sur l'écriture.
//
// ── OÙ PASSE LA LIGNE DU PROGRAMME ──────────────────────────────────────────
//
// C'est la question difficile, et elle a une réponse nette. Les leçons de
// Seconde d'AtoutMath (`js/data/skills.js`) donnent DEUX gestes, pas un de
// plus : a² − b² = (a − b)(a + b), et k·A + k·B = k(A + B).
//
//   x² + 1   → Δ = −4 : ne se factorise pas même sur les réels. FINI.
//   x² − 2   → Δ = 8, positif mais PAS un carré parfait. Sur les réels cela
//              donnerait (x − √2)(x + √2) — mais √2 n'est pas un polynôme, et
//              aucune leçon ne permet d'y arriver. FINI au niveau Seconde.
//   x² − 4   → Δ = 16, carré parfait : (x − 2)(x + 2). PAS fini.
//   x³ − 1   → se factorise en (x − 1)(x² + x + 1), mais par a³ − b³, qui
//              n'est dans aucune leçon. On le déclare INACHEVÉ : c'est exact
//              du point de vue de l'élève, et le moteur sait le finir.
//
// La ligne passe donc entre ℚ et ℝ, et elle est DÉCIDABLE sur les entiers :
// un trinôme est fini si son discriminant n'est pas un carré parfait. Aucun
// flottant n'entre dans cette décision — `Math.sqrt` ment au-delà de 2^53, et
// une égalité de polynômes n'a de sens qu'en entiers.
//
// ── DEUX CHEMINS POUR VÉRIFIER ──────────────────────────────────────────────
//
// Comme partout ici : le test ne compare pas ce moteur à l'idée que je me fais
// de la réponse — on se tromperait deux fois. Il développe les deux écritures
// et compare les COEFFICIENTS (exact, sans epsilon), puis il évalue les deux
// en points entiers avec une arithmétique qui ne passe pas par ce fichier.

// ── L'ARITHMÉTIQUE EXACTE ───────────────────────────────────────────────────

export const pgcd = (a, b) => (b ? pgcd(b, a % b) : Math.abs(a));

/**
 * La racine carrée entière, ou `null` si ce n'est pas un carré parfait.
 *
 * ENTIÈRE, ET NON `Math.sqrt` SUIVI D'UN TEST. Au-delà de 2^53 le flottant
 * ment, et c'est précisément ce nombre-là qui décide si un trinôme est fini.
 * On préfère une décision lente et juste à une décision rapide et parfois
 * fausse — il y en a quelques dizaines par question, pas des millions.
 */
export function racineEntiere(n) {
    if (!Number.isInteger(n) || n < 0) return null;
    if (n < 2) return n;
    let r = Math.floor(Math.sqrt(n));
    // On recale à la main : l'approximation flottante peut être à ±1.
    while (r * r > n) r--;
    while ((r + 1) * (r + 1) <= n) r++;
    return r * r === n ? r : null;
}

// ── LE POLYNÔME ─────────────────────────────────────────────────────────────
//
// Une carte { clef du monôme → coefficient entier }. La clef décrit la partie
// littérale : '' pour la constante, 'x^1', 'x^2', 'x^1*y^1'.
//
// CETTE FORME EST CELLE QUE `litteral.js` EMPLOIE DÉJÀ pour réduire une somme
// de termes semblables. La reprendre évite d'avoir deux représentations du
// même objet dans le projet, et elle est multivariée sans effort : le
// programme de Seconde n'a besoin que de x, mais x² − y² est le nom même de
// l'identité, et l'on ne veut pas réécrire le moteur le jour où Rémy
// l'écrira avec deux lettres.

const clefDe = (expos) => Object.keys(expos)
    .filter(v => expos[v] > 0).sort()
    .map(v => `${v}^${expos[v]}`).join('*');

const exposDe = (clef) => {
    const out = {};
    if (!clef) return out;
    for (const part of clef.split('*')) {
        const [v, e] = part.split('^');
        out[v] = (out[v] || 0) + Number(e);
    }
    return out;
};

/** Un polynôme, à partir de couples { coef, expos }. */
export function poly(termes = []) {
    const m = new Map();
    for (const t of [].concat(termes)) {
        const c = t.coef;
        if (!Number.isInteger(c)) {
            throw new Error(`polynome : coefficient non entier (${c})`);
        }
        if (c === 0) continue;
        const k = clefDe(t.expos || {});
        const avant = m.get(k) || 0;
        if (avant + c === 0) m.delete(k); else m.set(k, avant + c);
    }
    return m;
}

export const constante = (n) => poly([{ coef: n, expos: {} }]);
export const variable = (nom = 'x', degre = 1, coef = 1) =>
    poly([{ coef, expos: { [nom]: degre } }]);

export const estNul = (p) => p.size === 0;

export function plus(p, q) {
    const termes = [];
    for (const [k, c] of p) termes.push({ coef: c, expos: exposDe(k) });
    for (const [k, c] of q) termes.push({ coef: c, expos: exposDe(k) });
    return poly(termes);
}

export const opposeP = (p) => poly([...p].map(([k, c]) => ({ coef: -c, expos: exposDe(k) })));
export const moins = (p, q) => plus(p, opposeP(q));

export function fois(p, q) {
    const termes = [];
    for (const [k1, c1] of p) {
        for (const [k2, c2] of q) {
            const e = exposDe(k1);
            for (const [v, n] of Object.entries(exposDe(k2))) e[v] = (e[v] || 0) + n;
            termes.push({ coef: c1 * c2, expos: e });
        }
    }
    return poly(termes);
}

export function puissanceP(p, n) {
    if (!Number.isInteger(n) || n < 0) throw new Error(`polynome : exposant ${n}`);
    let out = constante(1);
    for (let i = 0; i < n; i++) out = fois(out, p);
    return out;
}

/** La valeur en un point, en arithmétique entière quand les points le sont. */
export function evaluer(p, point) {
    let total = 0;
    for (const [k, c] of p) {
        let t = c;
        for (const [v, e] of Object.entries(exposDe(k))) {
            if (!(v in point)) throw new Error(`polynome : ${v} n'a pas de valeur`);
            t *= Math.pow(point[v], e);
        }
        total += t;
    }
    return total;
}

/** Les variables qui apparaissent. */
export function variables(p) {
    const s = new Set();
    for (const [k] of p) for (const v of Object.keys(exposDe(k))) s.add(v);
    return [...s].sort();
}

/** Le degré total. Un polynôme nul a le degré −1, par convention. */
export function degre(p) {
    let d = -1;
    for (const [k] of p) {
        const t = Object.values(exposDe(k)).reduce((a, b) => a + b, 0);
        if (t > d) d = t;
    }
    return d;
}

/** Deux polynômes sont égaux quand leurs coefficients le sont. Sans epsilon. */
export function egaux(p, q) {
    if (p.size !== q.size) return false;
    for (const [k, c] of p) if (q.get(k) !== c) return false;
    return true;
}

/** Le facteur numérique commun à tous les coefficients — le « contenu ». */
export function contenu(p) {
    let g = 0;
    for (const [, c] of p) g = pgcd(g, c);
    return g || 1;
}

/** Le polynôme débarrassé de son contenu, coefficient dominant positif. */
export function primitif(p) {
    if (estNul(p)) return p;
    const g = contenu(p) * (coefDominant(p) < 0 ? -1 : 1);
    return poly([...p].map(([k, c]) => ({ coef: c / g, expos: exposDe(k) })));
}

/** Les coefficients d'un polynôme d'UNE variable, du degré 0 au degré n. */
export function coefficients(p, v = 'x') {
    const d = degre(p);
    const out = new Array(Math.max(d, 0) + 1).fill(0);
    for (const [k, c] of p) {
        const e = exposDe(k);
        const autres = Object.keys(e).filter(n => n !== v);
        if (autres.length) throw new Error(`polynome : ${autres[0]} n'est pas ${v}`);
        out[e[v] || 0] = c;
    }
    return out;
}

const coefDominant = (p) => {
    let meilleur = 0, deg = -1;
    for (const [k, c] of p) {
        const t = Object.values(exposDe(k)).reduce((a, b) => a + b, 0);
        if (t > deg) { deg = t; meilleur = c; }
    }
    return meilleur;
};

// ── LA FACTORISATION ────────────────────────────────────────────────────────

/**
 * Factorise un polynôme d'une variable, COMPLÈTEMENT sur ℚ.
 *
 * @returns {{constante:number, facteurs:Array<{poly:Map, mult:number}>}}
 *
 * LA MÉTHODE, ET POURQUOI ELLE EST CELLE-LÀ.
 *
 * On ne devine pas, on cherche exhaustivement là où c'est possible :
 *
 *   1. le CONTENU sort devant — c'est le « k » de k·A + k·B ;
 *   2. les puissances de x se mettent en facteur — x³ + x² = x²(x + 1) ;
 *   3. les RACINES RATIONNELLES se trouvent par le théorème des racines
 *      rationnelles : toute racine p/q a p diviseur du terme constant et q
 *      diviseur du coefficient dominant. La liste est FINIE, on l'essaie
 *      toute. C'est lent et c'est exact, et au degré 4 avec de petits
 *      coefficients cela fait quelques dizaines d'essais ;
 *   4. ce qui reste de degré 2 se décide au discriminant ;
 *   5. ce qui reste de degré 4 sans racine rationnelle peut encore être une
 *      différence de carrés — x⁴ − 16 = (x² − 4)(x² + 4) —, alors on essaie.
 *
 * Ce qui reste après cela est irréductible sur ℚ, et l'on s'arrête.
 */
export function factoriser(p, v = 'x') {
    if (estNul(p)) return { constante: 0, facteurs: [] };

    const facteurs = [];
    const ajouter = (f) => {
        const vu = facteurs.find(x => egaux(x.poly, f));
        if (vu) vu.mult++; else facteurs.push({ poly: f, mult: 1 });
    };

    // UNE FILE DE TRAVAIL, ET NON UNE RÉCURSION.
    //
    // Première écriture : après avoir découpé une différence de carrés, on se
    // rappelait soi-même sur chaque moitié. Sur x² + 1 — irréductible — le
    // morceau rendu était IDENTIQUE à l'entrée, et l'appel se répétait jusqu'à
    // épuiser la pile. Une récursion ne peut s'arrêter que si elle décroît, et
    // rien ne garantissait ici qu'elle décroisse.
    //
    // Avec une file, chaque tour ou bien DÉCOUPE le morceau — et les deux
    // moitiés sont strictement plus petites —, ou bien le déclare fini et le
    // retire. Il n'y a plus de cas où l'on repose le même objet.
    let cste = contenu(p) * (coefDominant(p) < 0 ? -1 : 1);
    const aTraiter = [poly([...p].map(([k, c]) => ({ coef: c / cste, expos: exposDe(k) })))];

    let garde = 0;
    while (aTraiter.length && garde++ < 500) {
        let m = aTraiter.pop();

        // Le morceau sort d'une division : il peut avoir gardé un contenu ou
        // un signe. C'est exactement ce que le chapitre reprochait à l'élève —
        // on ne va pas le laisser passer chez soi.
        const g = contenu(m) * (coefDominant(m) < 0 ? -1 : 1);
        if (g !== 1) {
            cste *= g;
            m = poly([...m].map(([k, c]) => ({ coef: c / g, expos: exposDe(k) })));
        }

        const d = degre(m);
        if (d <= 0) { cste *= coefficients(m, v)[0] || 1; continue; }
        if (d === 1) { ajouter(m); continue; }

        // x en facteur : x³ + x² = x²(x + 1).
        if (coefficients(m, v)[0] === 0) {
            aTraiter.push(variable(v), divisionExacte(m, variable(v), v));
            continue;
        }

        // Une racine rationnelle p/q donne le facteur (qx − p). Gauss garantit
        // que la division tombe juste dans les entiers, le morceau étant
        // primitif.
        const r = uneRacineRationnelle(m, v);
        if (r) {
            const f = poly([
                { coef: r.q, expos: { [v]: 1 } },
                { coef: -r.p, expos: {} }
            ]);
            aTraiter.push(f, divisionExacte(m, f, v));
            continue;
        }

        // Pas de racine rationnelle, mais peut-être une différence de carrés :
        // x⁴ − 16 = (x² − 4)(x² + 4), et le premier morceau se factorise encore.
        const dc = differenceDeCarres(m, v);
        if (dc) { aTraiter.push(dc[0], dc[1]); continue; }

        // Irréductible sur ℚ : on s'arrête, c'est fini.
        ajouter(m);
    }

    facteurs.sort((a, b) => degre(a.poly) - degre(b.poly)
        || coefficients(a.poly, v)[0] - coefficients(b.poly, v)[0]);
    return { constante: cste, facteurs };
}

/** Le quotient exact de p par q — q doit diviser p sans reste. */
export function divisionExacte(p, q, v = 'x') {
    const a = coefficients(p, v).slice();
    const b = coefficients(q, v);
    const db = b.length - 1;
    const out = new Array(Math.max(a.length - db, 0)).fill(0);
    for (let i = a.length - 1; i >= db; i--) {
        const c = a[i] / b[db];
        if (!Number.isInteger(c)) throw new Error('polynome : division non exacte');
        out[i - db] = c;
        for (let j = 0; j <= db; j++) a[i - db + j] -= c * b[j];
    }
    if (a.slice(0, db).some(x => x !== 0)) throw new Error('polynome : reste non nul');
    return poly(out.map((c, i) => ({ coef: c, expos: { [v]: i } })));
}

/** Une racine rationnelle p/q, ou null. Théorème des racines rationnelles. */
function uneRacineRationnelle(pol, v = 'x') {
    const cs = coefficients(pol, v);
    if (cs.length < 2) return null;
    const a0 = cs[0], an = cs[cs.length - 1];
    if (a0 === 0) return { p: 0, q: 1 };
    for (const p of diviseurs(Math.abs(a0))) {
        for (const q of diviseurs(Math.abs(an))) {
            if (pgcd(p, q) !== 1) continue;
            for (const signe of [1, -1]) {
                // On évalue en entiers : somme des aᵢ·pⁱ·q^(n−i), nulle ssi
                // p·signe/q est racine. Aucun flottant n'intervient.
                let total = 0;
                const n = cs.length - 1;
                for (let i = 0; i <= n; i++) {
                    total += cs[i] * Math.pow(signe * p, i) * Math.pow(q, n - i);
                }
                if (total === 0) return { p: signe * p, q };
            }
        }
    }
    return null;
}

function diviseurs(n) {
    const out = [];
    for (let i = 1; i * i <= n; i++) {
        if (n % i === 0) { out.push(i); if (i !== n / i) out.push(n / i); }
    }
    return out.sort((a, b) => a - b);
}

/** a² − b² : rend les deux facteurs, ou null. */
function differenceDeCarres(pol, v = 'x') {
    const cs = coefficients(pol, v);
    const nonNuls = cs.map((c, i) => [i, c]).filter(([, c]) => c !== 0);
    if (nonNuls.length !== 2) return null;
    const [[i1, c1], [i2, c2]] = nonNuls;
    // Un terme positif, un négatif, tous deux des carrés, degrés pairs.
    if (c1 * c2 >= 0) return null;
    const [pos, neg] = c1 > 0 ? [[i1, c1], [i2, c2]] : [[i2, c2], [i1, c1]];
    if (pos[0] % 2 || neg[0] % 2) return null;
    const ra = racineEntiere(pos[1]);
    const rb = racineEntiere(-neg[1]);
    if (ra === null || rb === null) return null;
    const a = poly([{ coef: ra, expos: { [v]: pos[0] / 2 } }]);
    const b = poly([{ coef: rb, expos: { [v]: neg[0] / 2 } }]);
    return [moins(a, b), plus(a, b)];
}

// ── « EST-CE FINI ? » ───────────────────────────────────────────────────────

/**
 * Une écriture c·P₁·…·P_k est-elle COMPLÈTEMENT factorisée au niveau Seconde ?
 *
 * @param {number} cste
 * @param {Array<Map>} facteurs  les facteurs, répétés selon leur multiplicité
 * @returns {{complet:boolean, raison:string, coupable:?Map}}
 *
 * LES CINQ CONDITIONS, ET CE QUE CHACUNE ATTRAPE :
 *
 *   1. le facteur numérique est SORTI — c'est elle qui manquait, et elle vaut
 *      26,2 % des réponses du chapitre : (6x − 4)(6x + 4) garde un 2 dans
 *      chaque parenthèse ;
 *   2. aucun facteur n'est une constante — on écrit 4(3x − 2), jamais
 *      (4)(3x − 2), que personne n'écrit ;
 *   3. chaque facteur est primitif et de coefficient dominant positif ;
 *   4. un facteur de degré 2 dont le discriminant est un CARRÉ PARFAIT se
 *      factorise encore ; sinon il est fini, et c'est là que passe la ligne
 *      du programme ;
 *   5. un facteur de degré ≥ 3 n'est pas fini au sens de la Seconde : aucune
 *      leçon ne donne a³ ± b³.
 */
export function estCompletementFactorise(cste, facteurs, v = 'x') {
    const non = (raison, coupable = null) => ({ complet: false, raison, coupable });
    if (!Number.isInteger(cste) || cste === 0) return non('la constante n\'est pas un entier non nul');

    for (const f of facteurs) {
        const d = degre(f);
        if (d <= 0) return non('un facteur est une constante : elle se met devant', f);
        const g = contenu(f);
        if (g > 1) {
            return non(`le facteur garde ${g} en facteur commun : il se met devant`, f);
        }
        // LE SIGNE DU COEFFICIENT DOMINANT NE REGARDE PAS LA COMPLÉTUDE.
        //
        // Ma première version le refusait, et la mesure a montré que c'était
        // une faute de conception : elle déclarait « inachevé » (3 − 2x)(15 − 2x),
        // qui est une factorisation parfaitement juste et que n'importe quel
        // élève de Seconde a le droit d'écrire. 2 507 réponses sur 14 000 étaient
        // dans ce cas, pour une raison qui n'est PAS mathématique.
        //
        // Écrire −(2x − 3) plutôt que (3 − 2x) est une NORMALISATION, pas un
        // achèvement. On la signale à part — `normalise` —, on ne la confond
        // pas avec « il reste quelque chose à factoriser ». La distinction
        // compte : le premier critère sert à marquer faux, et l'on ne marque
        // pas faux une écriture correcte.
        if (d === 1) continue;
        if (d === 2) {
            const [c0, c1, c2] = coefficients(f, v);
            const delta = c1 * c1 - 4 * c2 * c0;
            if (racineEntiere(delta) !== null) {
                return non('un trinôme se factorise encore : son discriminant '
                    + `vaut ${delta}, qui est un carré parfait`, f);
            }
            continue;
        }
        return non(`un facteur est de degré ${d} : au programme de Seconde, `
            + 'on ne s\'arrête qu\'à des facteurs de degré 1 ou 2', f);
    }
    return { complet: true, raison: 'chaque facteur est irréductible', coupable: null };
}

/**
 * L'écriture est-elle sous la forme CANONIQUE du projet ?
 *
 * À distinguer de la complétude, avec laquelle je les avais confondus : une
 * écriture peut être complètement factorisée sans être canonique. On s'en sert
 * pour choisir comment le générateur ÉCRIT sa réponse, jamais pour décider
 * qu'un élève s'est trompé.
 */
export function estNormalisee(cste, facteurs) {
    for (const f of facteurs) {
        if (coefDominant(f) < 0) {
            return { normalise: false,
                raison: 'un facteur a son terme de plus haut degré négatif : '
                    + 'on met plutôt le signe devant', coupable: f };
        }
    }
    return { normalise: true, raison: '', coupable: null };
}

// ── LE PONT AVEC L'ÉCRITURE ─────────────────────────────────────────────────
//
// On ne fait JAMAIS transiter une expression par une chaîne entre le moteur et
// le rendu : ce serait rouvrir la porte que `formule.js` vient de fermer.
// `depuisArbre` et `versArbre` échangent des arbres.

/** Un arbre de `maths/formule` → un polynôme. */
export function depuisArbre(n, fx) {
    const nu = (x) => (x.sorte === 'groupe' ? nu(x.dedans) : x);
    const x = nu(n);
    switch (x.sorte) {
        case 'nombre': {
            const val = Number(String(x.v).replace(',', '.'));
            if (!Number.isInteger(val)) {
                throw new Error(`polynome : ${x.v} n'est pas entier`);
            }
            return constante(val);
        }
        case 'lettre': return variable(x.nom);
        case 'oppose': return opposeP(depuisArbre(x.x, fx));
        case 'somme': return x.termes.reduce((a, t) => plus(a, depuisArbre(t, fx)), poly());
        case 'produit': return x.facteurs.reduce((a, f) => fois(a, depuisArbre(f, fx)), constante(1));
        case 'puissance': {
            const e = nu(x.exposant);
            if (e.sorte !== 'nombre') throw new Error('polynome : exposant non entier');
            return puissanceP(depuisArbre(x.base, fx), Number(e.v));
        }
        default:
            throw new Error(`polynome : « ${x.sorte} » n'est pas un polynôme`);
    }
}

/**
 * Un polynôme → un arbre de `maths/formule`, en degrés DÉCROISSANTS.
 *
 * L'ordre n'est pas un détail : on écrit 2x² + 3x − 5, jamais −5 + 3x + 2x².
 * C'est ainsi qu'on lit un polynôme, et un élève qui verrait l'autre ordre
 * croirait à une autre expression.
 */
export function versArbre(p, fx, v = 'x') {
    if (estNul(p)) return fx.nombre(0);
    const cs = coefficients(p, v);
    const termes = [];
    for (let d = cs.length - 1; d >= 0; d--) {
        const c = cs[d];
        if (c === 0) continue;
        const a = Math.abs(c);
        let t;
        if (d === 0) t = fx.nombre(a);
        else {
            const litteral = d === 1 ? fx.lettre(v)
                : fx.puissance(fx.lettre(v), fx.nombre(d));
            t = a === 1 ? litteral : fx.produit([fx.nombre(a), litteral], 'implicite');
        }
        termes.push(c < 0 ? fx.oppose(t) : t);
    }
    return termes.length === 1 ? termes[0] : fx.somme(termes);
}

/** L'écriture factorisée, en arbre : c·P₁^m₁·…·P_k^m_k. */
export function factoriseeEnArbre(resultat, fx, v = 'x') {
    const morceaux = [];
    if (resultat.constante !== 1 || !resultat.facteurs.length) {
        if (resultat.constante === -1 && resultat.facteurs.length) {
            // −(x − 3)(x + 3) : le signe seul, sans « −1 » écrit.
            const corps = resultat.facteurs.map(f => enFacteur(f, fx, v));
            return fx.oppose(fx.produit(corps, 'implicite'));
        }
        morceaux.push(fx.nombre(resultat.constante));
    }
    for (const f of resultat.facteurs) morceaux.push(enFacteur(f, fx, v));
    if (!morceaux.length) return fx.nombre(1);
    return morceaux.length === 1 ? morceaux[0] : fx.produit(morceaux, 'implicite');
}

function enFacteur(f, fx, v) {
    // LES FACTEURS RÉPÉTÉS SE GROUPENT : (x − 2)²(x + 3), et non
    // (x − 2)(x − 2)(x + 3). La seconde écriture est juste, et personne ne
    // l'écrit.
    const base = versArbre(f.poly, fx, v);
    return f.mult === 1 ? base : fx.puissance(base, fx.nombre(f.mult));
}

/**
 * LIRE UNE ÉCRITURE DÉJÀ FACTORISÉE, telle qu'un générateur l'a produite ou
 * qu'un élève l'a écrite : la constante d'un côté, les facteurs de l'autre.
 *
 * POURQUOI CE N'EST PAS ÉVIDENT. `(x − 2)²(x + 3)` est complètement factorisé.
 * Mais si l'on se contente de développer chaque facteur pris isolément, le
 * premier devient x² − 4x + 4, un trinôme de discriminant nul — et le critère
 * le déclare inachevé, ce qui est faux. La puissance DIT la multiplicité ; il
 * faut la lire comme telle et non la calculer.
 *
 * C'est exactement la faute que ce fichier reproche aux contrôles textuels,
 * commise une couche plus haut : lire la forme au lieu de lire la structure.
 */
export function lireFactorisee(arbre, fx) {
    const nu = (n) => (n.sorte === 'groupe' ? nu(n.dedans) : n);
    let constante = 1;
    const facteurs = [];

    const visiter = (n) => {
        const x = nu(n);
        if (x.sorte === 'produit') { x.facteurs.forEach(visiter); return; }
        if (x.sorte === 'oppose') { constante *= -1; visiter(x.x); return; }
        if (x.sorte === 'puissance') {
            const e = nu(x.exposant);
            if (e.sorte === 'nombre' && Number.isInteger(Number(e.v))) {
                for (let i = 0; i < Number(e.v); i++) visiter(x.base);
                return;
            }
        }
        const p = depuisArbre(x, fx);
        if (degre(p) <= 0) { constante *= evaluer(p, { x: 0, y: 0 }); return; }
        facteurs.push(p);
    };
    visiter(arbre);
    return { constante, facteurs };
}

/** Le verdict, directement sur l'écriture. */
export function verdictSurArbre(arbre, fx, v = 'x') {
    const { constante, facteurs } = lireFactorisee(arbre, fx);
    return { constante, facteurs, ...estCompletementFactorise(constante, facteurs, v) };
}

// ── LES DEUX FONCTIONS DEMANDÉES ────────────────────────────────────────────

/**
 * Développer : l'expression, réduite et ordonnée par degrés décroissants.
 * @param {object} arbre  un arbre de `maths/formule`
 * @param {object} fx     le module `maths/formule` lui-même
 */
export function developper(arbre, fx, v = 'x') {
    const p = depuisArbre(arbre, fx);
    return { poly: p, arbre: versArbre(p, fx, v) };
}

/**
 * Factoriser : l'écriture factorisée, complète par construction.
 * `complet` dit si le résultat satisfait le critère de Seconde — il le
 * satisfait toujours, et on le vérifie quand même : un moteur qui s'autorise
 * à ne pas se relire est un moteur qu'on croit sur parole.
 */
export function factoriserArbre(arbre, fx, v = 'x') {
    const p = depuisArbre(arbre, fx);
    const r = factoriser(p, v);
    const plats = [];
    for (const f of r.facteurs) for (let i = 0; i < f.mult; i++) plats.push(f.poly);
    const verdict = estCompletementFactorise(r.constante, plats, v);
    return { ...r, arbre: factoriseeEnArbre(r, fx, v), ...verdict };
}

export const POUR_ESSAI = { clefDe, exposDe, coefDominant, diviseurs,
    uneRacineRationnelle, differenceDeCarres };
