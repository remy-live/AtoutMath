// DÉVELOPPER, FACTORISER, ET SAVOIR QUAND C'EST FINI.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// LE PRINCIPE DE CE FICHIER. On ne compare pas le moteur à l'idée que je me
// fais de la réponse — on se tromperait deux fois. Chaque propriété se vérifie
// par un chemin qui ne passe pas par le code testé :
//
//   · une factorisation est juste si, REDÉVELOPPÉE, elle redonne le polynôme
//     de départ, coefficient par coefficient et sans epsilon ;
//   · et si les deux écritures prennent la MÊME VALEUR en des points entiers,
//     calculée par des fonctions écrites ici, à la main, qui n'appellent pas
//     le moteur.
//
// Un polynôme de degré d est déterminé par d + 1 points : vingt et un points
// entiers suffisent largement, et l'arithmétique y reste exacte.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fx from '../js/core/maths/formule.js';
import * as P from '../js/core/maths/polynome.js';

// ── L'ÉVALUATION INDÉPENDANTE ───────────────────────────────────────────────
//
// Écrite ici, et n'empruntant rien au moteur : elle lit l'ARBRE, pas le
// polynôme. C'est le second chemin.

function valeurDeLArbre(n, x) {
    const nu = (v) => (v.sorte === 'groupe' ? nu(v.dedans) : v);
    const t = nu(n);
    switch (t.sorte) {
        case 'nombre': return Number(String(t.v).replace(',', '.'));
        case 'lettre': return x;
        case 'oppose': return -valeurDeLArbre(t.x, x);
        case 'somme': return t.termes.reduce((a, u) => a + valeurDeLArbre(u, x), 0);
        case 'produit': return t.facteurs.reduce((a, u) => a * valeurDeLArbre(u, x), 1);
        case 'puissance': return Math.pow(valeurDeLArbre(t.base, x),
            valeurDeLArbre(t.exposant, x));
        case 'quotient': return valeurDeLArbre(t.haut, x) / valeurDeLArbre(t.bas, x);
        default: throw new Error('valeurDeLArbre : ' + t.sorte);
    }
}

const POINTS = Array.from({ length: 21 }, (_, i) => i - 10);

function memeFonction(a, b, quoi) {
    for (const x of POINTS) {
        // `+ 0` NORMALISE LE ZÉRO NÉGATIF. `assert.equal` en mode strict
        // compare comme `Object.is`, pour qui −0 et 0 sont DIFFÉRENTS — et
        // −(x − 2)(x + 2) évalué en x = 2 donne −0 quand x² − 4 donne 0.
        // C'est une distinction de la machine, pas des mathématiques : les
        // deux écritures valent bien le même nombre.
        const va = valeurDeLArbre(a, x) + 0, vb = valeurDeLArbre(b, x) + 0;
        assert.equal(va, vb,
            `${quoi} : en x = ${x}, l'un vaut ${va} et l'autre ${vb}`);
    }
}

// Le corpus : tout ce qu'un élève de Seconde rencontre dans ce projet.
const EXPRESSIONS = [
    'x² − 36', '4x² − 16', '36x² − 16', 'x² + 1', 'x² − 2', 'x³ − 1',
    'x⁴ − 16', 'x⁴ − 1', '2x² + 3x − 5', 'x² + x − 6', '6x² − 24',
    'x³ + x²', '(2x + 6)² − 16', '−x² + 4', '2x + 2', '12', 'x',
    '(x − 3)(x + 3)', '(x + 1)(x − 2)(x + 3)', '(3x − 2)²',
    'x(x + 1) − 2(x + 1)', '5(x + 1)', '(x − 1)(x² + x + 1)',
    'x² − 9x', '9x² − 6x + 1', '(x + 5)² − (x − 2)²'
];

// ── DÉVELOPPER ──────────────────────────────────────────────────────────────

test('développer ne change pas la fonction', () => {
    for (const src of EXPRESSIONS) {
        const a = fx.analyser(src);
        const d = P.developper(a, fx);
        memeFonction(a, d.arbre, `développer « ${src} »`);
    }
});

test('la forme développée est ordonnée par degrés décroissants', () => {
    // On écrit 2x² + 3x − 5, jamais −5 + 3x + 2x². Un élève qui verrait
    // l'autre ordre croirait à une autre expression.
    assert.equal(fx.texte(P.developper(fx.analyser('−5 + 3x + 2x²'), fx).arbre),
        '2x² + 3x − 5');
    assert.equal(fx.texte(P.developper(fx.analyser('(x − 3)(x + 3)'), fx).arbre),
        'x² − 9');
});

test('développer réduit vraiment : plus aucun terme semblable', () => {
    const p = P.developper(fx.analyser('x(x + 1) − 2(x + 1)'), fx).poly;
    assert.deepEqual(P.coefficients(p), [-2, -1, 1]);   // −2 − x + x²
});

// ── FACTORISER ──────────────────────────────────────────────────────────────

test('factoriser ne change pas la fonction', () => {
    for (const src of EXPRESSIONS) {
        const a = fx.analyser(src);
        const r = P.factoriserArbre(a, fx);
        memeFonction(a, r.arbre, `factoriser « ${src} »`);
    }
});

test('factoriser, puis redévelopper, redonne les mêmes COEFFICIENTS', () => {
    // Le chemin exact, sans aucun flottant : c'est lui qui fait foi.
    for (const src of EXPRESSIONS) {
        const depart = P.depuisArbre(fx.analyser(src), fx);
        const r = P.factoriserArbre(fx.analyser(src), fx);
        const retour = P.depuisArbre(r.arbre, fx);
        assert.ok(P.egaux(depart, retour),
            `« ${src} » : ${fx.texte(r.arbre)} ne redonne pas le polynôme de départ`);
    }
});

test('ce que factoriser rend est TOUJOURS complet — le moteur se relit', () => {
    for (const src of EXPRESSIONS) {
        const r = P.factoriserArbre(fx.analyser(src), fx);
        assert.ok(r.complet,
            `« ${src} » → ${fx.texte(r.arbre)} : ${r.raison}`);
    }
});

test('les cas d\'école, un par un', () => {
    const cas = {
        'x² − 36': '(x − 6)(x + 6)',
        '36x² − 16': '4(3x − 2)(3x + 2)',
        '6x² − 24': '6(x − 2)(x + 2)',
        'x³ + x²': 'x²(x + 1)',
        'x⁴ − 16': '(x − 2)(x + 2)(x² + 4)',
        '(2x + 6)² − 16': '4(x + 1)(x + 5)',
        '2x + 2': '2(x + 1)'
    };
    for (const [src, attendu] of Object.entries(cas)) {
        assert.equal(fx.texte(P.factoriserArbre(fx.analyser(src), fx).arbre), attendu,
            `« ${src} »`);
    }
});

test('les facteurs répétés se groupent en puissance', () => {
    // (x − 2)²(x + 3), et non (x − 2)(x − 2)(x + 3) : la seconde écriture est
    // juste, et personne ne l'écrit.
    const r = P.factoriserArbre(fx.analyser('(x − 2)(x − 2)(x + 3)'), fx);
    assert.equal(fx.texte(r.arbre), '(x − 2)²(x + 3)');
});

// ── OÙ PASSE LA LIGNE DU PROGRAMME ──────────────────────────────────────────
//
// C'est la partie la plus délicate du fichier, et celle qui décide si un élève
// est marqué juste ou faux. Chaque ligne ci-dessous est une décision.

test('on s\'arrête sur ℚ, jamais sur ℝ', () => {
    // x² + 1 : Δ = −4, ne se factorise pas même sur les réels.
    assert.equal(fx.texte(P.factoriserArbre(fx.analyser('x² + 1'), fx).arbre), 'x² + 1');
    // x² − 2 : Δ = 8, positif mais PAS un carré parfait. Sur les réels cela
    // donnerait (x − √2)(x + √2) — mais √2 n'est pas un polynôme, et aucune
    // leçon de Seconde ne permet d'y arriver.
    assert.equal(fx.texte(P.factoriserArbre(fx.analyser('x² − 2'), fx).arbre), 'x² − 2');
    // x² − 4 : Δ = 16, carré parfait. Celui-là se factorise.
    assert.equal(fx.texte(P.factoriserArbre(fx.analyser('x² − 4'), fx).arbre),
        '(x − 2)(x + 2)');
});

test('le discriminant se décide en ENTIERS, jamais en flottants', () => {
    // `Math.sqrt` ment au-delà de 2^53, et c'est ce nombre-là qui décide si un
    // trinôme est fini. Deux voisins d'un grand carré : l'un l'est, l'autre non.
    assert.equal(P.racineEntiere(94906265 * 94906265), 94906265);
    assert.equal(P.racineEntiere(94906265 * 94906265 - 1), null);
    assert.equal(P.racineEntiere(-4), null);
    assert.equal(P.racineEntiere(0), 0);
});

test('« est-ce fini ? » lit la structure, pas l\'écriture', () => {
    const verdict = (s) => P.verdictSurArbre(fx.analyser(s), fx);

    // INACHEVÉ — un facteur garde un facteur commun. C'est le cas qui vaut
    // 29,6 % des réponses du chapitre, et qu'aucun contrôle textuel ne voyait :
    // il n'y a aucun carré parfait à repérer dans « 6x − 4 ».
    assert.equal(verdict('(6x − 4)(6x + 4)').complet, false);
    assert.equal(verdict('4(3x − 2)(3x + 2)').complet, true);

    // INACHEVÉ — un trinôme se factorise encore.
    assert.equal(verdict('(x² − 9)(2x + 1)').complet, false);
    assert.equal(verdict('(x − 3)(x + 3)(2x + 1)').complet, true);

    // FINI — la puissance DIT la multiplicité. Développer (x − 2)² donnerait un
    // trinôme de discriminant nul, que le critère déclarerait inachevé : il
    // faut lire la structure et non la calculer. C'est exactement la faute que
    // ce moteur reproche aux contrôles textuels, commise une couche plus haut.
    assert.equal(verdict('(x − 2)²(x + 3)').complet, true);

    // FINI — irréductible au sens de la Seconde.
    assert.equal(verdict('(x − 1)(x² + x + 1)').complet, true);
    assert.equal(verdict('(x − 1)(x² + 1)').complet, true);
});

test('un coefficient dominant négatif n\'est PAS un inachèvement', () => {
    // MA PREMIÈRE VERSION LE REFUSAIT, et c'était une faute de conception :
    // elle déclarait inachevé (3 − 2x)(15 − 2x), qui est une factorisation
    // parfaitement juste et que n'importe quel élève a le droit d'écrire —
    // 2 507 réponses sur 14 000 étaient dans ce cas, pour une raison qui n'est
    // pas mathématique. Écrire −(2x − 3) plutôt que (3 − 2x) est une
    // NORMALISATION, pas un achèvement, et l'on ne marque pas faux une
    // écriture correcte.
    const v = P.verdictSurArbre(fx.analyser('(3 − 2x)(15 − 2x)'), fx);
    assert.equal(v.complet, true, v.raison);
    const n = P.estNormalisee(v.constante, v.facteurs);
    assert.equal(n.normalise, false, 'la non-canonicité doit quand même se dire');
});

test('la raison nomme le coupable, pour que la correction soit utile', () => {
    const v = P.verdictSurArbre(fx.analyser('(6x − 4)(6x + 4)'), fx);
    assert.match(v.raison, /facteur commun/);
    assert.ok(v.coupable, 'aucun facteur désigné');
    assert.equal(fx.texte(P.versArbre(v.coupable, fx)), '6x − 4');
});

// ── L'ARITHMÉTIQUE ──────────────────────────────────────────────────────────

test('les polynômes se comparent sur leurs coefficients, sans epsilon', () => {
    const a = P.depuisArbre(fx.analyser('(x + 1)(x − 1)'), fx);
    const b = P.depuisArbre(fx.analyser('x² − 1'), fx);
    assert.ok(P.egaux(a, b));
    assert.ok(!P.egaux(a, P.depuisArbre(fx.analyser('x² + 1'), fx)));
});

test('un coefficient non entier est refusé, pas arrondi', () => {
    assert.throws(() => P.depuisArbre(fx.analyser('1,5x'), fx), /entier/);
    assert.throws(() => P.poly([{ coef: 0.5, expos: {} }]), /entier/);
});

test('ce qui n\'est pas un polynôme est refusé', () => {
    assert.throws(() => P.depuisArbre(fx.analyser('√x'), fx), /polynome/);
    assert.throws(() => P.depuisArbre(fx.analyser('1/x'), fx), /polynome/);
});

test('la division exacte refuse un reste plutôt que de le perdre', () => {
    const p = P.depuisArbre(fx.analyser('x² + 1'), fx);
    const q = P.depuisArbre(fx.analyser('x − 1'), fx);
    assert.throws(() => P.divisionExacte(p, q), /polynome/);
});

// ── LE PONT AVEC L'ÉCRITURE ─────────────────────────────────────────────────

test('rien ne transite par une chaîne entre le moteur et le rendu', () => {
    // `depuisArbre` et `versArbre` échangent des ARBRES. Faire passer une
    // expression par du texte rouvrirait la porte que `formule.js` ferme :
    // deux écritures fabriquées séparément finissent par diverger.
    const a = fx.analyser('2x² + 3x − 5');
    const p = P.depuisArbre(a, fx);
    const retour = P.versArbre(p, fx);
    assert.ok(P.egaux(p, P.depuisArbre(retour, fx)));
    memeFonction(a, retour, 'aller-retour par l\'arbre');
});
