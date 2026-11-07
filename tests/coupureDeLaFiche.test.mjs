// UNE COUPURE QUI CASSE UN CALCUL, ET UNE QUI NE CASSE RIEN.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « pour diviser par 2 fractions, par défaut mets 2 colonnes pour
// l'impression ».
//
// LE CATALOGUE LE DISAIT DÉJÀ — `colonnesPapier: 2` — et la feuille sortait en
// UNE colonne. Forcer le réglage à 2, puis à 3, ne changeait rien : mesuré sur
// l'aperçu, qui écrit lui-même ce qu'il a posé (« 20 questions · 2 pages ·
// 1 colonne »).
//
// D'OÙ ÇA VENAIT : la mise en page retire une colonne dès qu'une cellule à
// fraction ou à trou tient sur plus de lignes qu'on ne lui en a demandé. La
// règle a raison quand elle vise ce qu'elle vise — « 5/6 + 2/6 = ..... » coupé
// après le « + » laisse la seconde fraction sous la première. Mais elle
// frappait AUSSI les huit problèmes rédigés de fin de fiche, qui passent à la
// ligne comme toute phrase : deux pages, la moitié droite blanche.
//
// MESURÉ SUR TOUT LE CATALOGUE avant d'y toucher, puis après
// (`tools/colonnesDuCatalogue.mjs`) : QUATRE fiches sur 166 changent, et les
// quatre vont vers le chiffre que le catalogue demandait —
// « Quotient et Reste » 1 → 2, « Par Combien ? » 3 → 4, « Segment, droite ou
// demi-droite » 2 → 4, « Diviser par une Fraction » 1 → 2. Aucune ne recule.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { readFileSync } from 'node:fs';
import { coupureCasseUneExpression } from '../js/core/fiche.js';

const lire = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

test('UNE PHRASE QUI PASSE À LA LIGNE NE CASSE RIEN', () => {
    // Les huit derniers énoncés de « Diviser par une Fraction », mot pour mot.
    assert.equal(coupureCasseUneExpression([
        'Un ruban de 10 mètres est coupé en',
        'morceaux de 2/7 de mètre. Combien peut-on',
        'en couper ?'
    ]), false);
    assert.equal(coupureCasseUneExpression([
        'On veut remplir des bouteilles de 2/7 de litre',
        'avec 10 litres de jus. Combien peut-on en',
        'remplir ?'
    ]), false);
    // UNE SEULE LIGNE NE SE COUPE NULLE PART.
    assert.equal(coupureCasseUneExpression(['3/4 ÷ 2/3 = …/…']), false);
});

test('MAIS UN CALCUL COUPÉ EN DEUX, OUI', () => {
    // LE CAS QUE LA RÈGLE EXISTE POUR ATTRAPER : la seconde fraction vient se
    // poser sous la première, et l'on ne sait plus ce qu'on compare.
    assert.equal(coupureCasseUneExpression(['5/6 +', '2/6 = …/…']), true);
    assert.equal(coupureCasseUneExpression(['660 + … =', '1 000']), true);
    // ET LE « = » QUI RESTE SEUL DEVANT SON RÉSULTAT.
    assert.equal(coupureCasseUneExpression(['3/4 ÷ 2/3 = …/… × …/…', '= …/…']), true);
});

test('ET UNE LIGNE NE FINIT PAS SUR UN BLANC À REMPLIR', () => {
    // MESURÉ SUR « HEURES ET MINUTES » à trois colonnes : « 119 min = ..... h
    // ..... min » tombait en deux lignes, le blanc des minutes au bout de la
    // première et son unité toute seule dessous. Le trou s'écrit en ESPACES
    // (voir `texteImprime`) : découpé en mots, il disparaît — c'est la ligne
    // brute qu'il faut regarder.
    assert.equal(coupureCasseUneExpression(['119 min =      h      ', 'min']), true);
    // Une ligne qui finit sur un mot, elle, ne cache aucun blanc.
    assert.equal(coupureCasseUneExpression(['119 min = beaucoup', 'de minutes']), false);
});

test('ET LA DIVISION DE FRACTIONS POSE SA MULTIPLICATION À LA LIGNE', () => {
    // 85 mm mesurés sur une seule ligne, pour une colonne de 78 : l'énoncé
    // débordait, et la feuille reculait de deux colonnes à une pour le sauver.
    // Trois lignes VOULUES ne coûtent rien (voir `lignesVoulues`) — et c'est
    // aussi ce que l'élève écrit au tableau.
    const src = lire('js/core/generators/divisionFractions.js');
    const ligne = /papier: `\$\{a\}\/\$\{b\} ÷ \$\{c\}\/\$\{d\} =([^`]*)`/.exec(src);
    assert.ok(ligne, 'l\'énoncé papier de « par une fraction » a changé de forme');
    assert.equal((ligne[1].match(/\\n/g) || []).length, 2,
        'la multiplication et son résultat doivent tenir sur deux lignes de plus');
});
