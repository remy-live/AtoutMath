// LA FRACTION SUR LA DROITE GRADUÉE — sixième, bloc 10.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// « La Loupe sur la Droite » existait, mais elle ne place que des DÉCIMAUX et
// son axe écrit ses graduations en décimaux. Trois choses changent ici, et
// aucune n'est un réglage : l'axe n'a plus dix intervalles mais autant que le
// dénominateur, l'étiquette est une fraction EMPILÉE, et la réponse se
// choisit au lieu de se taper.
//
// ── CE QUE CETTE ÉPREUVE GARDE ─────────────────────────────────────────────
//
// Les trois pièges qui ne se voient pas en relisant le code : le point placé
// par sa VALEUR plutôt que par son rang de cran (1/3 ne s'écrit pas
// exactement en virgule flottante), le balisage de fraction inventé au lieu de
// celui que l'activité reconnaît, et les dix intervalles codés en dur dans le
// rendu imprimé.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sansCommentaires } from './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import { axeSvg } from '../js/core/figures.js';
import { graduationFractionGenerator as gen, fractionHtml }
    from '../js/core/generators/graduationFraction.js';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const compter = (texte, motif) => (texte.match(motif) || []).length;

test('L\'AXE A AUTANT D\'INTERVALLES QUE LE DÉNOMINATEUR', () => {
    // DIX ÉTAIT CODÉ EN DUR, et c'est ce qui rendait cet exercice impossible à
    // dessiner : pour lire 3/4, l'axe est coupé en QUATRE.
    // `intervalles` ET `pas` SE CONTREDISENT EXPRÈS ICI, et c'est la seule
    // façon de prouver lequel compte. Avec `pas: 0,1`, l'ancien calcul —
    // `(fin − debut) / pas` — donnerait DIX traits ; l'axe doit en donner
    // CINQ, parce que `intervalles` vaut quatre.
    const svg = axeSvg({
        debut: 0, fin: 1, pas: 0.1, rang: 0, intervalles: 4, grandsTous: 4,
        etiquettes: [{ i: 0, texte: '0' }, { i: 4, texte: '1' }], point: { i: 3 }
    });
    assert.equal(compter(svg, /class="ax-cran/g), 5, 'quatre intervalles font CINQ traits');
    assert.equal(compter(svg, /ax-cran--bout/g), 2);
    // ET LES TRAITS D'UNITÉ SONT PLUS LONGS, sans quoi un axe de 0 à 2 en
    // quarts montre huit traits identiques et personne ne voit où tombe le 1.
    const deuxUnites = axeSvg({
        debut: 0, fin: 2, pas: 1 / 4, rang: 0, intervalles: 8, grandsTous: 4,
        etiquettes: [{ i: 0, texte: '0' }, { i: 4, texte: '1' }, { i: 8, texte: '2' }],
        point: { i: 5 }
    });
    assert.equal(compter(deuxUnites, /class="ax-cran/g), 9);
    assert.equal(compter(deuxUnites, /ax-cran--bout/g), 3, '0, 1 et 2 portent un grand trait');
});

test('LA CROIX TOMBE SUR UN TRAIT, ET SUR LE BON', () => {
    // LES TRAITS ET LA CROIX DOIVENT SE CALCULER PAREIL, sans quoi la croix
    // flotte « entre deux traits » et la question n'a plus de réponse. On les
    // met en désaccord exprès — `pas` dit dix intervalles, `intervalles` en
    // dit quatre — et l'on vérifie que la croix est exactement sur le trait
    // du troisième cran.
    const svg = axeSvg({
        debut: 0, fin: 1, pas: 0.1, rang: 0, intervalles: 4, grandsTous: 4,
        etiquettes: [{ i: 0, texte: '0' }, { i: 4, texte: '1' }], point: { i: 3 }
    });
    const traits = [...svg.matchAll(/class="ax-cran[^"]*"\s+x1="([\d.]+)"/g)]
        .map(m => Number(m[1]));
    const croix = /ax-point[\s\S]*?x1="([\d.]+)"/.exec(svg);
    assert.ok(croix, 'la croix n\'est pas dessinée');
    // La croix est centrée sur le cran : son bras gauche est à 6 px avant.
    assert.equal(Number(croix[1]) + 6, traits[3],
        'la croix ne tombe pas sur le trait du troisième cran');
});

test('LES ÉTIQUETTES PEUVENT ÊTRE DES FRACTIONS EMPILÉES', () => {
    const svg = axeSvg({
        debut: 0, fin: 1, pas: 1 / 4, rang: 0, intervalles: 4,
        etiquettes: [{ i: 1, num: 1, den: 4 }], point: { i: 1 }
    });
    assert.match(svg, /ax-barre/, 'la barre de fraction manque : « 1 4 » se lirait quatorze');
    assert.equal(compter(svg, /class="ax-nb"/g), 2, 'le numérateur ET le dénominateur');
});

test('LA FRACTION LUE EST LA BONNE, ET LE POINT N\'EST JAMAIS SUR UN ENTIER', () => {
    for (const graine of ['a', 'b', 'c', 'd', 'e']) {
        for (let i = 0; i < 12; i++) {
            const it = gen.generate({}, { rng: makeRng(graine + i), index: i });
            const m = it.meta;
            assert.equal(it.answer, `${m.num}/${m.den}`);
            assert.equal(m.crans, m.den * m.unites);
            // JAMAIS SUR UN TRAIT D'UNITÉ : « lis le point posé sur 1 » ne
            // demande pas de compter, et sa réponse n'est pas une fraction.
            assert.notEqual(m.num % m.den, 0,
                `${it.answer} tombe sur un entier`);
            assert.ok(m.num >= 1 && m.num <= m.crans - 1);
        }
    }
});

test('LES LEURRES SONT LES TROIS ERREURS DU CHAPITRE, ET AUCUN N\'EST JUSTE', () => {
    // SUR CENT TIRAGES, ET NON SUR UN. « 2/4 » contre « 1/2 » n'arrive qu'à
    // certaines graines : une épreuve qui n'en regarde qu'une passe au vert
    // le jour où le garde disparaît. `epreuveTombe` me l'a dit sur cette
    // épreuve-ci — elle tenait avec le garde retiré.
    for (const graine of ['a', 'b', 'c', 'd', 'e']) {
        for (let i = 0; i < 20; i++) {
            const it = gen.generate({}, { rng: makeRng(graine + i), index: i });
            const m = it.meta;
            const bonne = `${m.num}/${m.den}`;
            const valeurs = it.choices.map(c => c.value);
            assert.equal(new Set(valeurs).size, valeurs.length,
                `deux propositions identiques (${valeurs.join(' ')})`);
            assert.equal(valeurs.filter(v => v === bonne).length, 1);
            // AUCUNE PROPOSITION FAUSSE NE VAUT LA BONNE. « 2/4 » proposé
            // contre « 1/2 » serait compté faux alors qu'il est juste : c'est
            // le pire des leurres, celui qui punit l'élève qui a raison.
            for (const c of it.choices) {
                if (c.correct) continue;
                const [n, d] = c.value.split('/').map(Number);
                assert.notEqual(n / d, m.num / m.den,
                    `${c.value} vaut la bonne réponse ${bonne}`);
            }
        }
    }
});

test('LE BALISAGE D\'UNE FRACTION EST CELUI QUE L\'ACTIVITÉ RECONNAÎT', () => {
    // LA LEÇON EST ÉCRITE DANS `choice.js`, AU-DESSUS DE `FRACTION_SEULE`, et
    // je l'ai payée quand même : avec un balisage à moi, le texte nu donnait
    // « 2 3 » — espace compris — et les propositions sortaient en CARTES, une
    // par ligne, au lieu de quatre ronds. Mesuré à l'écran.
    const html = fractionHtml(3, 4);
    const MOTIF = /^\s*<span class="fraction">\s*<span class="fraction-num">([^<]*)<\/span>\s*<span class="fraction-den">([^<]*)<\/span>\s*<\/span>\s*$/;
    assert.match(html, MOTIF, 'le balisage n\'est plus celui que choice.js sait mesurer');
    // Et c'est bien CE motif que l'activité cherche : si elle en change, cette
    // épreuve doit tomber plutôt que de laisser la mise en page se dégrader.
    const C = lire('js/core/activities/choice.js');
    assert.ok(C.includes('const FRACTION_SEULE = ' + String(MOTIF)),
        'choice.js ne cherche plus ce motif : les propositions repasseront en cartes');
});

test('LE RENDU IMPRIMÉ NE COMPTE PLUS DIX INTERVALLES EN DUR', () => {
    const N = sansCommentaires(lire('js/ui/fiches/nombres.js'));
    assert.match(N, /const nb = Math\.max\(1, Number\(m\.intervalles\) \|\| 10\);/,
        'la feuille redessine dix intervalles : une droite de quarts y sortirait '
        + 'en dixièmes, et toutes les croix à côté de leur trait');
    assert.ok(!/for \(let i = 0; i <= 10; i\+\+\)/.test(N),
        'il reste une boucle à dix intervalles codée en dur');
    // ET LA POINTE DE LA FLÈCHE NE DÉPASSE PLUS D'UN DEMI-INTERVALLE : sur une
    // droite de demis, cela sortait de la feuille.
    assert.equal(compter(N, /Math\.min\(g\.pas \* 0\.5, 6\)/g), 2,
        'l\'aperçu et le PDF doivent borner la pointe de la même façon');
});

test('LE TITRE DE LA FEUILLE DIT CE QU\'ELLE DEMANDE', () => {
    // LE MÊME RENDU SERT DEUX EXERCICES. « La loupe sur la droite graduée »
    // au-dessus d'une feuille de fractions annonce autre chose que ce qui suit.
    const N = lire('js/ui/fiches/nombres.js');
    assert.match(N, /\? 'La fraction sur la droite graduée'/);
    const P = sansCommentaires(lire('js/ui/printSheet.js'));
    assert.match(P, /typeof rendu\.titre === 'function'/,
        'l\'entête imprimerait « (items) => … » en haut de la feuille');
});
