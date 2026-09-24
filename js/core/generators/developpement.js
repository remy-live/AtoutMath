// DÉVELOPPER — la distributivité simple, puis la double, et toujours une aire.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// Rémy : « j'aimerais bien des exercices très progressifs et visuels sur le
// développement simple et double développement ».
//
// LE CHAPITRE MANQUAIT VRAIMENT. L'application savait réduire une expression
// (5ème-4ème, `num.litteral.reduire`), elle savait factoriser (Seconde), et
// entre les deux il n'y avait rien : aucun exercice n'apprenait à ouvrir une
// parenthèse. C'est pourtant le geste dont la factorisation est l'inverse, et
// celui par lequel on VÉRIFIE une factorisation.
//
// ── LE SUPPORT VISUEL : UNE AIRE, ET RIEN D'AUTRE ───────────────────────────
//
// Rémy demande un visuel, et ici il n'y a pas à chercher : la distributivité
// EST une aire. 3(x + 2) est un rectangle de hauteur 3 et de largeur x + 2 ;
// le découper en deux donne 3x et 6, et leur somme est l'aire entière parce
// qu'on a découpé, pas changé la figure. Le dessin ne fait pas qu'illustrer
// la règle : il la démontre.
//
// Pour la double distributivité, le même rectangle se coupe dans les DEUX
// sens, et les quatre morceaux sont les quatre produits. Un élève qui oublie
// les termes croisés — la faute reine, (x + 2)(x + 3) = x² + 6 — voit
// immédiatement les deux rectangles qu'il a laissés vides.
//
// DEUX DESSINS, PAS UN, et c'est la règle déjà tenue aux chapitres des racines
// et de la factorisation : celui de l'ÉNONCÉ montre le découpage et ses
// dimensions, celui de l'INDICE montre les aires calculées. Le premier pose la
// question, le second la résout — les confondre reviendrait à donner la
// réponse dans l'énoncé.
//
// ── CE QUI EST CALCULÉ, ET PAR QUI ──────────────────────────────────────────
//
// Rien n'est écrit à la main ici. Les expressions sont des ARBRES de
// `maths/formule`, les réponses viennent de `maths/polynome.developper`, et
// les leurres sont des polynômes eux aussi — jamais des chaînes bricolées.
// C'est ce qui garantit que l'écran et la fiche papier posent la même
// question, et que la réponse est juste par construction plutôt que par
// relecture.

import { makeItem, finalizeChoices } from '../items.js';
import * as fx from '../maths/formule.js';
import * as P from '../maths/polynome.js';

const M = '−';

// ── LES TERMES, ET COMMENT ON LES ÉCRIT ─────────────────────────────────────
//
// Un terme est `{ c, deg }` : le coefficient et le degré. C'est tout ce dont
// ce chapitre a besoin — on ne dépasse pas le premier degré dans les facteurs.

const terme = (c, deg = 0) => ({ c, deg });

/** L'arbre d'un terme, signe NON compris : c'est la somme qui le porte. */
function arbreTerme(t) {
    const a = Math.abs(t.c);
    if (t.deg === 0) return fx.nombre(a);
    const lettre = fx.lettre('x');
    return a === 1 ? lettre : fx.produit([fx.nombre(a), lettre], 'implicite');
}

/** L'arbre d'une somme de termes, chacun avec son signe. */
function arbreSomme(termes) {
    const dedans = termes.map((t, i) => {
        const base = arbreTerme(t);
        return t.c < 0 ? fx.oppose(base) : base;
    });
    return dedans.length === 1 ? dedans[0] : fx.somme(dedans);
}

/** Ce qu'on écrit dans une case ou sur un bord : « 3 », « 2x », « −5 ». */
function etiquette(t) {
    const a = Math.abs(t.c);
    const corps = t.deg === 0 ? String(a)
        : (t.deg === 1 ? (a === 1 ? 'x' : `${a}x`) : (a === 1 ? 'x²' : `${a}x²`));
    return (t.c < 0 ? M + ' ' : '') + corps;
}

const produitDeTermes = (a, b) => terme(a.c * b.c, a.deg + b.deg);

/**
 * UN NOMBRE SIGNÉ, EN ARBRE.
 *
 * `fx.nombre(M + 6)` paraît marcher — l'écran affiche bien « −6 » — mais le
 * nœud porte alors la CHAÎNE « −6 », dont le moins est U+2212 : `Number()` y
 * répond NaN, et `polynome` refusait l'expression avec « −6 n'est pas
 * entier ». Le signe est une structure de l'arbre, pas un caractère du nombre.
 */
const arbreNombre = (n) => (n < 0 ? fx.oppose(fx.nombre(Math.abs(n))) : fx.nombre(n));

// ── LE DESSIN ───────────────────────────────────────────────────────────────
//
// LES LARGEURS SONT PROPORTIONNELLES, mais à une valeur CONVENUE pour x.
//
// Un rectangle de largeur « x + 2 » ne peut pas être à l'échelle : x est
// inconnu. On convient donc que x vaut à peu près trois unités et demie, ce
// qui donne au dessin des proportions crédibles — le morceau « x » est plus
// large que le morceau « 2 », comme l'élève l'imagine — sans prétendre mesurer
// quoi que ce soit. C'est un schéma, et il se lit comme tel.
// x VAUT PLUS QUE N'IMPORTE QUELLE CONSTANTE DU CHAPITRE, qui montent à 9.
// Avec une valeur plus basse, « 7(x + 8) » dessinait le morceau « 8 » PLUS
// LARGE que le morceau « x » : c'est cohérent avec la convention, et cela
// contredit l'image que l'élève se fait d'une inconnue. Un schéma qui heurte
// l'intuition demande qu'on l'explique, donc il ne sert plus de support.
const X_CONVENU = 11;
// UNE RACINE, POUR COMPRIMER L'ÉCART. Les largeurs proportionnelles aux
// valeurs donnaient un rapport de 11 contre 2 entre « x » et « 2 » : la ligne
// des constantes devenait un filet où l'étiquette ne tenait plus. La racine
// garde l'ORDRE — x reste le plus large, 5 reste plus large que 2 — en
// ramenant le rapport à 2,4 contre 1. C'est un schéma : il doit être juste
// dans ses rapports de grandeur, pas dans ses mesures.
const poids = (t) => Math.max(1.6, Math.sqrt(Math.abs(t.c) * (t.deg ? X_CONVENU : 1)));

const echapper = (s) => String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * LE RECTANGLE DE LA DISTRIBUTIVITÉ SIMPLE : k(a + b).
 *
 * Hauteur k, largeur découpée en autant de morceaux que de termes. Les
 * dimensions sont écrites DEHORS, les aires DEDANS — et les aires n'existent
 * que dans le dessin de l'indice.
 *
 * UN TERME NÉGATIF EST UN MORCEAU QU'ON RETIRE. On le dessine hachuré, à la
 * suite, avec son signe : 3(x − 2) est la bande de hauteur 3 et de largeur x,
 * DIMINUÉE d'un bout de largeur 2. C'est ainsi qu'on l'explique au tableau, et
 * c'est ce qui rend le signe du résultat évident.
 */
function rectangleSvg(k, termes, resolu) {
    const H = 66, MG = 34, MH = 26, L = 250;
    const total = termes.reduce((s, t) => s + poids(t), 0);
    let x = MG;
    const parts = [];
    for (const t of termes) {
        const w = (L * poids(t)) / total;
        const neg = t.c < 0;
        parts.push(`<rect x="${x.toFixed(1)}" y="${MH}" width="${w.toFixed(1)}" height="${H}"
            class="dv-case${neg ? ' dv-case--retire' : ''}"/>`
            // La dimension, au-dessus du morceau.
            + `<text x="${(x + w / 2).toFixed(1)}" y="${MH - 8}" class="dv-dim">`
            + `${echapper(etiquette(t))}</text>`
            + (resolu
                ? `<text x="${(x + w / 2).toFixed(1)}" y="${MH + H / 2 + 6}" class="dv-aire">`
                    + `${echapper(etiquette(produitDeTermes(terme(k), t)))}</text>`
                : ''));
        x += w;
    }
    return `<div class="dv-figure"><svg viewBox="0 0 ${MG + L + 14} ${MH + H + 16}"
        role="img" aria-label="Un rectangle de hauteur ${k}, découpé en ${termes.length} morceaux."
        class="dv-svg">
        <text x="${MG - 12}" y="${MH + H / 2 + 6}" class="dv-dim dv-dim--gauche">${
            k < 0 ? M + ' ' + Math.abs(k) : k}</text>
        ${parts.join('')}
    </svg></div>`;
}

/**
 * LA BOÎTE DE LA DOUBLE DISTRIBUTIVITÉ : (a + b)(c + d).
 *
 * Le même rectangle, coupé dans les DEUX sens. Les quatre morceaux sont les
 * quatre produits — et l'élève qui oublie les termes croisés voit les deux
 * cases qu'il a laissées vides. C'est la faute reine du chapitre, et c'est le
 * dessin qui la rend visible plutôt qu'un rappel de la règle.
 */
function boiteSvg(gauche, droite, resolu) {
    const MG = 46, MH = 28, L = 236, H = 116;
    const tl = droite.reduce((s, t) => s + poids(t), 0);
    const th = gauche.reduce((s, t) => s + poids(t), 0);
    const parts = [];
    let y = MH;
    for (const g of gauche) {
        const h = (H * poids(g)) / th;
        let x = MG;
        parts.push(`<text x="${MG - 12}" y="${(y + h / 2 + 5).toFixed(1)}"
            class="dv-dim dv-dim--gauche">${echapper(etiquette(g))}</text>`);
        for (const d of droite) {
            const w = (L * poids(d)) / tl;
            const p = produitDeTermes(g, d);
            // LA COULEUR NE DIT LE SIGNE QUE DANS LE DESSIN DE L'INDICE.
            //
            // Le signe d'une case est le PRODUIT de ses deux bords : c'est un
            // calcul, donc une part de la réponse. Colorée dès l'énoncé, elle
            // annonçait à l'élève lesquelles des quatre cases sont négatives —
            // précisément ce qu'il doit trouver au barreau 8, où les deux
            // bords sont négatifs et où le piège est que leur produit ne l'est
            // pas.
            //
            // Au rectangle simple c'est différent, et la distinction est
            // nette : là, le signe est celui d'une DIMENSION, écrite dans
            // l'énoncé. Le montrer ne révèle rien, cela traduit en image ce
            // que l'expression dit déjà.
            parts.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}"
                width="${w.toFixed(1)}" height="${h.toFixed(1)}"
                class="dv-case${resolu && p.c < 0 ? ' dv-case--retire' : ''}"/>`
                + (resolu
                    ? `<text x="${(x + w / 2).toFixed(1)}" y="${(y + h / 2 + 5).toFixed(1)}"
                        class="dv-aire">${echapper(etiquette(p))}</text>`
                    : ''));
            x += w;
        }
        y += h;
    }
    const entetes = [];
    let x = MG;
    for (const d of droite) {
        const w = (L * poids(d)) / tl;
        entetes.push(`<text x="${(x + w / 2).toFixed(1)}" y="${MH - 9}" class="dv-dim">`
            + `${echapper(etiquette(d))}</text>`);
        x += w;
    }
    return `<div class="dv-figure"><svg viewBox="0 0 ${MG + L + 14} ${MH + H + 16}"
        role="img" aria-label="Un rectangle coupé dans les deux sens, en quatre morceaux."
        class="dv-svg">${entetes.join('')}${parts.join('')}</svg></div>`;
}

// ── LES BARREAUX ────────────────────────────────────────────────────────────
//
// Onze marches, et chacune n'ajoute qu'une chose à la précédente :
//
//   1. 3(x + 2)          la distributivité, tout positif
//   2. 3(x − 2)          un signe moins dans la parenthèse
//   3. 3(2x + 5)         un coefficient devant la lettre
//   4. −2(x + 5)         le facteur est négatif — le piège du chapitre
//   5. 2(x+1) + 3(x−2)   deux distributions, puis on réduit
//   6. (x + 2)(x + 3)    la double, tout positif
//   7. (x + 2)(x − 3)    un moins
//   8. (x − 2)(x − 3)    deux moins
//   9. (2x + 3)(3x − 1)  des coefficients partout
//  10. (x + 4)²          le carré — et le piège x² + 16
//  11. (x − 5)(x + 5)    la différence de carrés, qui ouvre la factorisation

/**
 * L'AIRE NE SE DESSINE QUE SI TOUTES LES LONGUEURS SONT POSITIVES.
 *
 * RÉMY : « pour le double développement, ta figure pour (x−6)(x−2) n'a pas
 * sens, idem pour du genre (x−a)(x+a), ne la mets pas. »
 *
 * Il a raison, et la raison est exactement celle qui rend le dessin bon
 * ailleurs. Le modèle de l'aire explique la distributivité parce qu'il
 * TRADUIT le calcul : un côté est une longueur, une case est une aire, et
 * l'aire totale est la somme des cases. Chaque trait du dessin dit quelque
 * chose de vrai.
 *
 * Dès qu'un terme est négatif, plus rien ne tient : un côté de longueur −6
 * n'existe pas, et la case (−6)(−2) se dessinait comme une aire POSITIVE à
 * l'intérieur d'un rectangle dont les deux côtés étaient négatifs. Le dessin
 * ne traduit plus le calcul, il le contredit — et l'élève qui essaie d'y lire
 * quelque chose y apprend une chose fausse.
 *
 * Ce n'est donc pas « un dessin moins joli » : c'est un dessin qui ment. On ne
 * le pose que là où il dit vrai — les barreaux 1, 6 et 10, où tout est
 * positif. Ailleurs, la leçon reste dans `etapes`, en mots.
 */
const longueursPositives = (...listes) =>
    listes.every(l => l.every(t => t.c > 0));

const nn = (rng, min, max, sauf = []) => {
    const ok = [];
    for (let v = min; v <= max; v++) if (v !== 0 && !sauf.includes(v)) ok.push(v);
    return ok[rng.int(0, ok.length - 1)];
};

/** k(a x + b) — le cœur de la distributivité simple. */
function simple(rng, { kNeg = false, coefX = false, moins = false } = {}) {
    const k = (kNeg ? -1 : 1) * nn(rng, 2, 8, [1]);
    const a = coefX ? nn(rng, 2, 6) : 1;
    const b = (moins ? -1 : 1) * nn(rng, 2, 9);
    const dedans = [terme(a, 1), terme(b, 0)];
    return {
        k, dedans,
        enonce: fx.produit([arbreNombre(k),
            { sorte: 'groupe', dedans: arbreSomme(dedans) }], 'implicite'),
        // Voir `longueursPositives` : un rectangle de hauteur négative, ou
        // découpé en un morceau de largeur négative, ne traduit plus le
        // calcul — il le contredit.
        figure: (resolu) => (longueursPositives([terme(k, 0)], dedans)
            ? rectangleSvg(k, dedans, resolu) : '')
    };
}

function barreauSimple(rng, opts, nom) {
    const q = simple(rng, opts);
    const { k, dedans } = q;
    const vrai = P.depuisArbre(q.enonce, fx);
    const kx = k * dedans[0].c, kb = k * dedans[1].c;
    return {
        enonce: q.enonce,
        poly: vrai,
        structure: q.figure(false),
        visuel: q.figure(true),
        // L'EXPLICATION NE PARLE D'UN RECTANGLE QUE S'IL Y EN A UN. Décrire
        // une aire sous un énoncé sans dessin renverrait l'élève à une image
        // qu'il n'a pas — et ce serait l'image fausse, justement retirée.
        etapes: longueursPositives([terme(k, 0)], dedans)
            ? `Le rectangle a pour hauteur ${k} et se découpe en deux morceaux. `
                + `Le premier vaut ${etiquette(terme(kx, 1))}, le second `
                + `${etiquette(terme(kb, 0))} : l'aire totale est leur somme.`
            : `${k < 0 ? `(${M}${Math.abs(k)})` : k} multiplie CHAQUE terme de la `
                + `parenthèse : ${etiquette(terme(kx, 1))} d'un côté, `
                + `${etiquette(terme(kb, 0))} de l'autre. Le signe de chaque produit se `
                + `calcule à part.`,
        leurres: [
            // ── LE RACCOURCI QU'IL FALLAIT FERMER ────────────────────────
            //
            // RÉMY : « tes solutions en QCM sont évidentes. On trouve tout de
            // suite ce qui ne va pas. »
            //
            // MESURÉ, et il avait raison plus précisément qu'il ne le disait :
            // sur les barreaux 1 à 4, le TERME CONSTANT À LUI SEUL tranchait
            // 98 à 100 % des questions. Aucun leurre ne portait la bonne
            // constante — trois des trois se repéraient donc en calculant
            // k × b, c'est-à-dire la MOITIÉ de l'exercice. Un chapitre qui
            // enseigne « le facteur multiplie CHAQUE terme » laissait répondre
            // en n'en multipliant qu'un.
            //
            // Ce leurre est l'exact MIROIR du suivant : l'un distribue sur le
            // x et oublie le nombre, l'autre distribue sur le nombre et oublie
            // le x. Ils portent la même faute des deux côtés, et ensemble ils
            // obligent à regarder les deux termes.
            { poly: P.poly([{ coef: dedans[0].c, expos: { x: 1 } },
                { coef: kb, expos: {} }]),
                why: `Le ${k < 0 ? `(${M}${Math.abs(k)})` : k} multiplie aussi le terme `
                    + `en x : ${k < 0 ? `(${M}${Math.abs(k)})` : k} × `
                    + `${etiquette(dedans[0])} vaut ${etiquette(terme(kx, 1))}.` },
            // LA FAUTE REINE DE LA DISTRIBUTIVITÉ SIMPLE : n'ouvrir qu'à
            // moitié. Le facteur multiplie TOUT ce qui est dans la parenthèse.
            { poly: P.poly([{ coef: kx, expos: { x: 1 } },
                { coef: dedans[1].c, expos: {} }]),
                why: `Le ${k < 0 ? `(${M}${Math.abs(k)})` : k} multiplie TOUT ce qui est `
                    + `dans la parenthèse, le second terme aussi : le rectangle a deux `
                    + `morceaux, pas un.` },
            // Le signe : c'est le piège quand k est négatif.
            { poly: P.poly([{ coef: kx, expos: { x: 1 } }, { coef: -kb, expos: {} }]),
                why: `Attention au signe du second morceau : `
                    + `${k < 0 ? `(${M}${Math.abs(k)})` : k} × ${etiquette(dedans[1])} `
                    + `vaut ${etiquette(terme(kb, 0))}.` },
            // Additionner au lieu de multiplier.
            { poly: P.poly([{ coef: k + dedans[0].c, expos: { x: 1 } },
                { coef: k + dedans[1].c, expos: {} }]),
                why: `Le facteur MULTIPLIE chaque morceau, il ne s'y ajoute pas.` }
        ],
        nom
    };
}

/** Deux distributions à enchaîner, puis on réduit. */
function barreauDeux(rng) {
    const a = simple(rng, {});
    const b = simple(rng, { moins: rng.bool(0.6) });
    const enonce = fx.somme([a.enonce, b.enonce]);
    const poly = P.depuisArbre(enonce, fx);
    const pa = P.depuisArbre(a.enonce, fx), pb = P.depuisArbre(b.enonce, fx);
    return {
        enonce,
        poly,
        // LES DEUX RECTANGLES, OU AUCUN. Le barreau 5 pose deux produits ; si
        // l'un porte un terme négatif, sa figure est retirée (voir
        // `longueursPositives`) et il ne restait qu'UN rectangle sous un
        // énoncé qui en annonce deux. L'élève cherche alors ce qu'il a raté.
        structure: (a.figure(false) && b.figure(false))
            ? a.figure(false) + b.figure(false) : '',
        visuel: (a.figure(true) && b.figure(true))
            ? a.figure(true) + b.figure(true) : '',
        etapes: (a.figure(true) && b.figure(true))
            ? `On ouvre CHAQUE parenthèse — c'est deux rectangles — puis on réunit ce `
                + `qui va ensemble : les x avec les x, les nombres avec les nombres.`
            : `On ouvre CHAQUE parenthèse séparément, puis on réunit ce qui va `
                + `ensemble : les x avec les x, les nombres avec les nombres.`,
        leurres: [
            { poly: P.plus(pa, P.constante(0)),
                why: `La seconde parenthèse a été oubliée : il y a deux rectangles.` },
            { poly: P.moins(pa, pb),
                why: `Les deux expressions s'AJOUTENT : relis le signe entre les deux `
                    + `parenthèses.` },
            { poly: P.poly([...P.coefficients(poly).entries()].map(([d, c]) =>
                ({ coef: d === 0 ? c : c + 1, expos: d ? { x: d } : {} }))),
                why: `Une erreur en regroupant les termes en x : on additionne les `
                    + `coefficients, sans oublier le signe.` },
            // ET LE MIROIR, SUR LES NOMBRES. Mesuré : au barreau 5, le TERME
            // EN X à lui seul tranchait 100 % des questions — les trois
            // leurres se repéraient sans jamais regarder les constantes. Celui
            // -ci porte le bon terme en x et se trompe sur les nombres, ce qui
            // est la faute symétrique et tout aussi courante.
            { poly: P.poly([...P.coefficients(poly).entries()].map(([d, c]) =>
                ({ coef: d === 0 ? c + (c > 0 ? -1 : 1) * 2 : c,
                    expos: d ? { x: d } : {} }))),
                why: `Une erreur en regroupant les NOMBRES : ils s'additionnent eux `
                    + `aussi, avec leur signe.` }
        ],
        nom: 'Deux distributions, puis réduire'
    };
}

/** (a x + b)(c x + d) — la double distributivité. */
function barreauDouble(rng, { signeD = 1, signeB = 1, coefs = false,
    carre = false, conjugue = false } = {}) {
    const a = coefs ? nn(rng, 2, 4) : 1;
    const c = coefs ? nn(rng, 2, 4) : 1;
    const b = signeB * nn(rng, 2, 7);
    const d = carre ? b : (conjugue ? -b : signeD * nn(rng, 2, 7));
    const gauche = [terme(a, 1), terme(b, 0)];
    const droite = [terme(carre || conjugue ? a : c, 1), terme(d, 0)];
    const gA = { sorte: 'groupe', dedans: arbreSomme(gauche) };
    const dA = { sorte: 'groupe', dedans: arbreSomme(droite) };
    const enonce = carre
        ? fx.puissance(gA, fx.nombre(2))
        : fx.produit([gA, dA], 'implicite');
    const poly = P.depuisArbre(enonce, fx);
    const croises = gauche[0].c * droite[1].c + gauche[1].c * droite[0].c;
    return {
        enonce,
        poly,
        // Voir `longueursPositives`. (x − 6)(x − 2) et (x − 5)(x + 5) sont
        // les deux cas que Rémy a nommés : dans le premier les deux côtés
        // sont négatifs, dans le second l'un des deux l'est.
        structure: longueursPositives(gauche, droite)
            ? boiteSvg(gauche, droite, false) : '',
        visuel: longueursPositives(gauche, droite)
            ? boiteSvg(gauche, droite, true) : '',
        etapes: !longueursPositives(gauche, droite)
            // SANS DESSIN, ON DÉCRIT LE CALCUL, PAS L'IMAGE. Voir
            // `longueursPositives` : ici le rectangle mentirait, donc il n'y
            // en a pas, et l'expliquer par des cases renverrait à une image
            // absente.
            ? `Chaque terme de la première parenthèse multiplie chaque terme de la `
                + `seconde : quatre produits. Le signe de chacun se calcule à part, et `
                + `les deux termes en x se réunissent.`
            : (carre
                ? `(${etiquette(gauche[0])} + ${etiquette(gauche[1])})², c'est le rectangle `
                    + `multiplié par LUI-MÊME : quatre cases, dont deux identiques au `
                    + `milieu. C'est ce double produit qu'on oublie.`
                : `Le rectangle est coupé dans les deux sens : quatre morceaux, donc `
                    + `quatre produits. Les deux du milieu portent le même x et se `
                    + `réunissent.`),
        leurres: [
            // LA FAUTE REINE DE LA DOUBLE : ne multiplier que les extrêmes,
            // c'est-à-dire ne remplir que deux cases sur quatre.
            { poly: P.poly([{ coef: gauche[0].c * droite[0].c, expos: { x: 2 } },
                { coef: gauche[1].c * droite[1].c, expos: {} }]),
                why: `Il manque les deux morceaux du MILIEU. Le rectangle a quatre cases, `
                    + `pas deux : ${etiquette(gauche[0])} × ${etiquette(droite[1])} et `
                    + `${etiquette(gauche[1])} × ${etiquette(droite[0])} comptent aussi.` },
            { poly: P.poly([{ coef: gauche[0].c * droite[0].c, expos: { x: 2 } },
                { coef: -croises, expos: { x: 1 } },
                { coef: gauche[1].c * droite[1].c, expos: {} }]),
                why: `Le signe du terme en x est faux : chaque case prend le signe du `
                    + `produit de ses deux bords.` },
            { poly: P.poly([{ coef: gauche[0].c * droite[0].c, expos: { x: 2 } },
                { coef: croises, expos: { x: 1 } },
                { coef: -gauche[1].c * droite[1].c, expos: {} }]),
                why: `Le signe du dernier morceau est faux : `
                    + `${etiquette(gauche[1])} × ${etiquette(droite[1])} vaut `
                    + `${etiquette(produitDeTermes(gauche[1], droite[1]))}.` },
            // LA CONFUSION PROPRE AUX DEUX DERNIERS BARREAUX : prendre l'un
            // pour l'autre. (x − 5)(x + 5) n'est pas (x − 5)², et le dessin le
            // dit — dans le premier les deux cases du milieu s'annulent, dans
            // le second elles s'ajoutent.
            ...(conjugue || carre ? [{
                poly: P.poly([{ coef: gauche[0].c * droite[0].c, expos: { x: 2 } },
                    { coef: conjugue ? -2 * Math.abs(b) * a : 0, expos: { x: 1 } },
                    { coef: b * b, expos: {} }]),
                why: conjugue
                    ? `C'est le développement de (x ${M} ${Math.abs(b)})². Ici les `
                        + `deux cases du milieu ont des signes CONTRAIRES : elles `
                        + `s'annulent, et il ne reste aucun terme en x.`
                    : `Les deux cases du milieu s'AJOUTENT — elles sont identiques. `
                        + `C'est le double produit, et c'est lui qu'on oublie.`
            }] : [])
        ],
        nom: carre ? 'Le carré d\'une somme' : (conjugue ? 'La différence de carrés' : 'Double distributivité')
    };
}

const BARREAUX = {
    1: { faire: (r) => barreauSimple(r, {}, 'Distributivité simple') },
    2: { faire: (r) => barreauSimple(r, { moins: true }, 'Un moins dans la parenthèse') },
    3: { faire: (r) => barreauSimple(r, { coefX: true, moins: r.bool(0.4) },
        'Un coefficient devant la lettre') },
    4: { faire: (r) => barreauSimple(r, { kNeg: true, moins: r.bool(0.5) },
        'Le facteur est négatif') },
    5: { faire: barreauDeux },
    6: { faire: (r) => barreauDouble(r, {}) },
    7: { faire: (r) => barreauDouble(r, { signeD: -1 }) },
    8: { faire: (r) => barreauDouble(r, { signeB: -1, signeD: -1 }) },
    9: { faire: (r) => barreauDouble(r, { coefs: true, signeD: r.bool(0.5) ? -1 : 1 }) },
    10: { faire: (r) => barreauDouble(r, { carre: true }) },
    11: { faire: (r) => barreauDouble(r, { conjugue: true }) }
};

// ── LE GÉNÉRATEUR ───────────────────────────────────────────────────────────

/** Des leurres de secours, pour que le compte soit toujours de quatre. */
function secours(poly) {
    const cs = P.coefficients(poly);
    const out = [];
    for (const [d, delta] of [[1, 1], [1, -1], [0, 1], [0, -1], [2, 1]]) {
        const copie = cs.slice();
        while (copie.length <= d) copie.push(0);
        copie[d] += delta;
        out.push({
            poly: P.poly(copie.map((c, i) => ({ coef: c, expos: i ? { x: i } : {} }))),
            why: 'Un coefficient est faux : recompte les morceaux du rectangle, '
                + 'chacun avec son signe.'
        });
    }
    return out;
}

export const developpementGenerator = {
    id: 'lit.developpement',
    label: 'Développer : distributivité simple et double',
    skills: ['lit.developper.simple', 'lit.developper.double'],
    answerKinds: ['choice'],
    ecrit: true,
    params: [
        {
            id: 'barreau', type: 'select', label: 'Quel barreau', default: '1',
            aide: 'Un barreau ajoute UNE chose au précédent. La progression se fait en '
                + 'posant plusieurs de ces exercices à la suite dans une séance.',
            options: [
                { value: '1', label: '1 — 3(x + 2)' },
                { value: '2', label: '2 — 3(x − 2)' },
                { value: '3', label: '3 — 3(2x + 5)' },
                { value: '4', label: '4 — −2(x + 5), le facteur négatif' },
                { value: '5', label: '5 — deux distributions, puis réduire' },
                { value: '6', label: '6 — (x + 2)(x + 3)' },
                { value: '7', label: '7 — (x + 2)(x − 3)' },
                { value: '8', label: '8 — (x − 2)(x − 3)' },
                { value: '9', label: '9 — (2x + 3)(3x − 1)' },
                { value: '10', label: '10 — (x + 4)², le carré' },
                { value: '11', label: '11 — (x − 5)(x + 5)' },
                { value: 'simple', label: 'Révision — la distributivité simple' },
                { value: 'double', label: 'Révision — la double distributivité' },
                { value: 'toutes', label: 'Tout mélangé' }
            ]
        }
    ],
    generate(params, ctx) {
        const rng = ctx.rng;
        const choix = String(params.barreau || '1');
        const possibles = choix === 'toutes' ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
            : (choix === 'simple' ? [1, 2, 3, 4, 5]
                : (choix === 'double' ? [6, 7, 8, 9, 10, 11] : [Number(choix) || 1]));
        const tire = possibles[rng.int(0, possibles.length - 1)];
        const rang = BARREAUX[tire] ? tire : 1;
        const q = BARREAUX[rang].faire(rng);

        const enonceTexte = fx.texte(q.enonce);
        const reponse = P.versArbre(q.poly, fx);
        const repTexte = fx.texte(reponse);

        // ON DÉDOUBLONNE SUR L'ÉCRITURE, et la bonne réponse est dans
        // l'ensemble de départ : un leurre qui s'écrirait comme elle serait une
        // seconde bonne réponse, marquée fausse.
        // ON CONSTITUE LE VIVIER ENTIER, PUIS ON CHOISIT DEDANS.
        //
        // L'ancienne boucle s'arrêtait à trois leurres — `if (faux.length >= 3)
        // break` — et le vivier n'existait donc jamais : les leurres écrits
        // après le troisième n'étaient pas « rarement servis », ils n'étaient
        // JAMAIS construits. J'ai passé une demi-heure à chercher pourquoi ma
        // garantie ne garantissait rien, en la cherchant du mauvais côté : le
        // leurre qu'elle allait chercher n'avait pas été fabriqué.
        //
        // Couper au plus tôt économisait quelques `versArbre` ; cela coûtait
        // la possibilité même de choisir.
        const vivier = [];
        const vus = new Set([repTexte]);
        for (const l of [...q.leurres, ...secours(q.poly)]) {
            if (!l.poly || P.estNul(l.poly)) continue;
            const t = fx.texte(P.versArbre(l.poly, fx));
            if (vus.has(t)) continue;
            vus.add(t);
            vivier.push({ ...l, texte: t });
        }
        // ── ON CHOISIT TROIS LEURRES, SOUS DEUX CONTRAINTES ─────────────
        //
        // RÉMY : « tes solutions en QCM sont évidentes. On trouve tout de
        // suite ce qui ne va pas. »
        //
        // MESURÉ, et plus précisément qu'il ne le disait : sur les barreaux 1
        // à 4, le TERME CONSTANT à lui seul tranchait 98 à 100 % des
        // questions ; au barreau 5, c'était le TERME EN x, à 100 %. La moitié
        // du calcul suffisait — et c'est justement la moitié que le chapitre
        // enseigne à ne pas oublier.
        //
        // Il faut donc qu'AU MOINS UN leurre porte la bonne constante, et au
        // moins un le bon terme en x. J'ai d'abord écrit cela comme deux
        // échanges successifs ; le second défaisait le premier, et la mesure
        // passait de 100 % sur le terme en x à 99 % sur la constante. Deux
        // contraintes ne se satisfont pas l'une après l'autre : on les pose
        // d'abord, on complète ensuite.
        const bonsCoefs = P.coefficients(q.poly);
        const memeDegre = (p, d) => (P.coefficients(p)[d] || 0) === (bonsCoefs[d] || 0);
        const garde = [];
        for (const d of [0, 1]) {
            if (garde.some(l => memeDegre(l.poly, d))) continue;
            const jumeau = vivier.find(l => !garde.includes(l) && memeDegre(l.poly, d));
            if (jumeau) garde.push(jumeau);
        }
        for (const l of vivier) {
            if (garde.length >= 3) break;
            if (!garde.includes(l)) garde.push(l);
        }
        // ON REMET L'ORDRE D'ÉCRITURE. Les leurres sont rangés du plus
        // instructif au plus anodin, et `reduireChoix` lit ce rang pour
        // décider lequel survit à deux propositions — voir `finalizeChoices`.
        // Les avoir choisis dans un autre ordre ne doit pas le changer.
        const faux = garde.slice(0, 3).sort((a2, b2) =>
            vivier.indexOf(a2) - vivier.indexOf(b2));

        const brutes = [
            { value: 'ok', label: fx.html(reponse), texte: repTexte, correct: true },
            ...faux.map((l, i) => ({
                value: 'faux' + i, poly: l.poly,
                label: fx.html(P.versArbre(l.poly, fx)),
                texte: l.texte, correct: false, why: l.why
            }))
        ];
        // ── UN LEURRE DOIT PORTER LA BONNE CONSTANTE, ET UN AUTRE LE BON
        //    TERME EN x ────────────────────────────────────────────────────
        //
        // RÉMY : « tes solutions en QCM sont évidentes. On trouve tout de
        // suite ce qui ne va pas. »
        //
        // MESURÉ : sur les barreaux 1 à 4, le TERME CONSTANT à lui seul
        // tranchait 98 à 100 % des questions ; au barreau 5, c'était le TERME
        // EN x, à 100 %. Autrement dit : la moitié du calcul suffisait, et
        // c'est exactement la moitié que le chapitre enseigne à ne pas
        // oublier.
        //
        // Les leurres qui ferment ces deux raccourcis sont écrits plus haut.
        // Mais on n'en garde que TROIS, et l'ordre de la liste décidait
        // lesquels : le mien était le dernier, donc jamais servi. Une
        // propriété qu'on veut vraie à chaque question ne se confie pas à un
        // ordre — on la garantit.
        // ON RAISONNE SUR LES TROIS QUI SURVIVRONT, pas sur la liste entière.
        //
        // `finalizeChoices` garde QUATRE propositions : la bonne et les TROIS
        // PREMIERS leurres. Ma première version échangeait le dernier de la
        // liste — c'est-à-dire un leurre que la troncature allait de toute
        // façon jeter. La garantie ne garantissait rien, et la mesure le
        // disait : le barreau 5 restait à 100 %.
        const choices = finalizeChoices(rng, brutes, { count: 4 });

        return makeItem({
            seed: rng.seed,
            generatorId: 'lit.developpement',
            skillId: rang <= 5 ? 'lit.developper.simple' : 'lit.developper.double',
            answerKind: 'choice',
            prompt: {
                text: `Développe et réduis : ${enonceTexte}`,
                html: '<div class="game-question dv-consigne">Développe cette expression, '
                    + 'puis réduis-la.</div>'
                    + `<div class="dv-expression">${fx.html(q.enonce)}</div>`
                    + q.structure,
                papier: `Développer et réduire : ${enonceTexte}`
            },
            answer: 'ok',
            // Voir factorisation.js : `answer` est une sentinelle de QCM ; ce
            // qui s'écrit, se tape et s'imprime, c'est l'expression réduite.
            reponsePapier: repTexte,
            choices,
            hints: [
                rang <= 5
                    ? 'Le facteur multiplie CHAQUE terme de la parenthèse — le rectangle a '
                        + 'autant de morceaux qu'.concat('il y a de termes.')
                    : 'Quatre morceaux, donc quatre produits. Les deux du milieu portent '
                        + 'le même x et se réunissent.',
                q.etapes
            ],
            schemas: ['', q.visuel],
            // ON PEUT TAPER LA RÉPONSE, et c'est une demande de Rémy : « on ne
            // peut jamais taper la réponse, c'est toujours un QCM, quel
            // dommage ». `composable: 'litteral'` ouvre la route du clavier
            // dans `choice.js`, que l'échelle d'aide emprunte quand l'élève a
            // montré qu'il savait reconnaître.
            //
            // ON COMPARE DES POLYNÔMES, PAS DES CHAÎNES. « 3x + 2x² − 5 » dit
            // la même chose que « 2x² + 3x − 5 » ; l'ordre des termes n'est pas
            // une faute de mathématiques, et le compter faux apprendrait à
            // recopier une forme plutôt qu'à calculer.
            verifieTexte: (saisie) => {
                const lu = P.lireSaisie(saisie, fx);
                if (!lu) {
                    return { juste: false,
                        pourquoi: 'Je n\'arrive pas à lire cette expression. '
                            + 'Écris-la avec les touches, par exemple 2x² + 3x − 5.' };
                }
                if (!P.egaux(lu, q.poly)) return { juste: false };
                // « PUIS RÉDUIS-LA » EST LA MOITIÉ DE LA CONSIGNE, et l'égalité
                // seule ne la vérifie pas : `lireSaisie` regroupe les termes
                // semblables en chemin, si bien que 2x + 4x + 30 rentrait
                // comme 6x + 30 et passait pour juste. L'élève avait bien
                // développé — c'est justement la moitié qu'il a faite.
                //
                // On compte donc les termes ÉCRITS et on les compare aux
                // monômes du polynôme : plus de termes que de monômes, c'est
                // qu'il en reste deux à réunir. (Le pavé n'ayant pas de
                // parenthèses ici, il n'y a rien d'autre à démêler.)
                let ecrits;
                try {
                    const a = fx.analyser(String(saisie).replace(/\s+/g, '')
                        .replace(/(x)(\d)/g, '$1^$2'));
                    ecrits = a.sorte === 'somme' ? a.termes.length : 1;
                } catch (e) { ecrits = 0; }
                if (ecrits > lu.size) {
                    return { juste: false,
                        pourquoi: 'C\'est bien égal, mais ce n\'est pas réduit : '
                            + 'deux termes portent la même puissance de x et se '
                            + 'réunissent en un seul.' };
                }
                return { juste: true };
            },
            explanation: `${enonceTexte} = ${repTexte}. ${q.etapes}`,
            difficulty: Math.min(5, 1 + Math.floor(rang / 2.5)),
            meta: { barreau: rang, nomDuBarreau: q.nom,
                // Le clavier littéral : x et x², pas de parenthèses — une
                // expression développée n'en a jamais.
                composable: 'litteral', lettre: 'x', degreMax: 2 }
        });
    }
};

export const POUR_ESSAI = { BARREAUX, terme, etiquette, rectangleSvg, boiteSvg, arbreSomme };
