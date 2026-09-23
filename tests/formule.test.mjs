// ÉCRIRE UNE FORMULE — les propriétés qu'on ne veut plus jamais reperdre.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// Rémy : « les racines carrées sont très moches » puis « je veux pouvoir écrire
// des formules SANS BIBLIOTHÈQUE et avec la police que je veux ».
//
// Ce fichier garde les trois promesses que `js/core/maths/formule.js` fait, et
// chacune a déjà été enfreinte une fois :
//
//   1. AUCUN SYMBOLE N'EST UN CARACTÈRE. Mesuré dans le navigateur : la police
//      Outfit ne contient AUCUN glyphe √. Le signe affiché venait d'une police
//      de secours choisie par le système — donc différent sur un Mac, un
//      Chromebook, un iPad. La contrainte de Rémy était déjà enfreinte avant
//      qu'il la formule, et aucun réglage CSS ne pouvait la tenir.
//   2. L'ÉCRAN ET LE PAPIER DISENT LA MÊME CHOSE, parce qu'ils lisent le même
//      arbre. Le chapitre des racines avait fait diverger les deux, affichant
//      « 5√3 ÷ √3 » quand la fiche disait « √75 ÷ √3 ».
//   3. LE BALISAGE RESTE CELUI QUE L'APPLICATION RECONNAÎT DÉJÀ. `choice.js`
//      identifie une fraction par une expression régulière ancrée sur le début
//      du libellé : des classes neuves, ou un simple conteneur autour, et les
//      propositions repartent en cartes au lieu de ronds.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as fx from '../js/core/maths/formule.js';

const { analyser, html, texte, formule, formuleTexte } = fx;

// Le corpus : ce que les chapitres écrivent réellement, plus les cas qui ont
// déjà cassé quelque chose.
const CORPUS = [
    '√49', '√49 × √36', '√(9 + 16)', '6√2', '2√8 + √18', '√225',
    '3√7/7', '3/√7', '√(9/16)', '22/7', '−3/4', '1,5 × 2', '2 × 3',
    '(x − 3)(x + 3)', 'x^2 − y^2', '2x^2 + 3x − 5', '5(x + 1)',
    '(2/3)/(5/7)', '(x + 1)^2', '7(4 − 9/7)', '2(√5 + 1)', '√75 ÷ √3',
    'x² − 36', '(2x + 6)² − 16', '3x³ + 2x²'
];

// ── 1. AUCUN SYMBOLE N'EST UN CARACTÈRE ─────────────────────────────────────

test('le HTML ne contient aucun glyphe mathématique — tout est dessiné', () => {
    for (const src of CORPUS) {
        const h = formule(src);
        // Le √ est la raison d'être du module : Outfit n'en a pas.
        assert.ok(!h.includes('√'),
            `« ${src} » écrit un caractère √ au lieu de le dessiner : ${h}`);
        // Les exposants en petit caractère : Outfit n'a que ¹ ² ³, pas au-delà.
        // Une mise en page fonctionne à tout exposant, un caractère non.
        for (const c of ['⁰', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹']) {
            assert.ok(!h.includes(c), `« ${src} » utilise l'exposant ${c}, absent d'Outfit`);
        }
    }
});

test('un radical porte toujours son crochet ET sa barre', () => {
    const h = formule('√49');
    assert.match(h, /fx-crochet/, 'pas de crochet');
    assert.match(h, /fx-sous/, 'pas de barre');
    // Le tracé et la barre lisent la MÊME variable : c'est ce qui garantit
    // qu'ils ont la même épaisseur et se rejoignent. Si quelqu'un écrit une
    // valeur en dur ici, le raccord redevient un réglage à la main.
    assert.ok(!/stroke-width="/.test(h),
        'l\'épaisseur du trait est écrite dans le balisage au lieu de venir du CSS');
});

// LE DÉFAUT QUI GRANDISSAIT AVEC LA TAILLE DU TEXTE.
//
// Rémy : « sur ton banc les radicaux ont-ils une ligne de la même épaisseur ».
// Mesurée sur l'encre : non. Et la cause n'était pas celle que je croyais.
//
// `vector-effect` NE S'HÉRITE PAS. Il était déclaré sur le `<svg>`, donc il ne
// touchait pas le `<path>` : le trait était mis à l'échelle par le viewBox,
// exactement comme si la règle n'existait pas. `stroke-width`, lui, s'hérite
// bien — ce qui rendait l'ensemble vraisemblable.
//
// Conséquence mesurée : 4,2 px peints là où 2,4 étaient demandés à 32 px de
// corps, et 47 px à 104 px, où le crochet devenait un pâté noir. Le défaut
// croissait avec la taille du texte, donc il restait invisible aux tailles où
// l'on regarde d'habitude.
test('les réglages de trait sont portés par le TRACÉ, pas par le conteneur', () => {
    const css = readFileSync(new URL('../css/components.css', import.meta.url), 'utf8');
    const regle = css.match(/\.fx-crochet path[\s\S]*?\{([\s\S]*?)\}/);
    assert.ok(regle, 'aucune règle ne vise « .fx-crochet path »');
    for (const prop of ['vector-effect', 'stroke-width', 'stroke']) {
        assert.match(regle[1], new RegExp(prop),
            `« ${prop} » n'est pas posé sur le tracé : il ne s'héritera pas`);
    }
});

// ── 2. L'ÉCRAN ET LE PAPIER NE PEUVENT PLUS DIVERGER ────────────────────────

// LA PROPRIÉTÉ LA PLUS FORTE DU MODULE, et elle se teste par un aller-retour :
// le texte de la fiche, RELU par l'analyseur, doit redonner exactement le
// dessin de l'écran. Cela prouve d'un coup que le texte est une écriture
// fidèle — pas une approximation — et que les deux sorties portent la même
// formule.
test('le texte de la fiche, relu, redonne le dessin de l\'écran', () => {
    for (const src of CORPUS) {
        const arbre = analyser(src);
        const plat = texte(arbre);
        assert.equal(html(analyser(plat)), html(arbre),
            `« ${src} » s'écrit « ${plat} », qui ne se relit pas à l'identique.`);
    }
});

test('le texte ne contient jamais de balise — la fiche la jetterait', () => {
    // `js/ui/printQuestions.js` écarte tout libellé contenant < ou > et retombe
    // sur la valeur interne. C'est ce qui faisait imprimer « faux0 · ok ».
    for (const src of CORPUS) {
        assert.ok(!/[<>]/.test(formuleTexte(src)),
            `« ${src} » met du balisage dans le texte`);
    }
});

// ── 3. LE BALISAGE QUE L'APPLICATION RECONNAÎT DÉJÀ ─────────────────────────

// La MÊME expression régulière que js/core/activities/choice.js. Recopiée ici
// volontairement : si elle change là-bas, ce test doit tomber pour qu'on s'en
// aperçoive, plutôt que de découvrir en classe des propositions en cartes.
const FRACTION_SEULE = /^\s*<span class="fraction">\s*<span class="fraction-num">([^<]*)<\/span>\s*<span class="fraction-den">([^<]*)<\/span>\s*<\/span>\s*$/;

test('une fraction simple reste reconnue par choice.js', () => {
    for (const src of ['22/7', '3/4', '−3/4']) {
        assert.ok(FRACTION_SEULE.test(formule(src)),
            `« ${src} » n'est plus reconnue comme une fraction : ${formule(src)}`);
    }
    // Et une fraction composée ne l'est pas — c'est correct, elle EST longue.
    assert.ok(!FRACTION_SEULE.test(formule('3√7/7')));
});

test('aucun conteneur n\'enveloppe le rendu', () => {
    // Un `<span class="fx">` enveloppant mettrait en échec l'expression
    // régulière ci-dessus, qui est ancrée sur le DÉBUT du libellé.
    assert.ok(!formule('22/7').startsWith('<span class="fx">'));
});

// ── L'ANALYSEUR ─────────────────────────────────────────────────────────────

test('× et ÷ ne sont pas lus comme des lettres', () => {
    // LE PIÈGE DU LATIN-1 : « × » est U+00D7 et « ÷ » est U+00F7, tous deux à
    // l'intérieur de la plage À-ɏ qui sert à reconnaître les lettres
    // accentuées. Ce sont les deux seuls caractères de ce bloc à ne pas être
    // des lettres. Avec le test des lettres placé avant celui des opérateurs,
    // « √49 × √36 » devenait un produit implicite de TROIS facteurs dont le
    // deuxième était une variable nommée « × », et le texte rendu — « √49×√36 »
    // — avait l'air presque juste.
    assert.equal(formuleTexte('√49 × √36'), '√49 × √36');
    assert.equal(formuleTexte('√75 ÷ √3'), '√75 ÷ √3');
    assert.equal(formuleTexte('2 × 3'), '2 × 3');
    for (const a of [analyser('2 × 3'), analyser('2 ÷ 3')]) {
        const lettres = JSON.stringify(a).match(/"sorte":"lettre"/g) || [];
        assert.equal(lettres.length, 0, 'un opérateur a été lu comme une variable');
    }
});

test('la multiplication implicite s\'écrit sans signe, sauf entre deux chiffres', () => {
    assert.equal(formuleTexte('6√2'), '6√2');
    assert.equal(formuleTexte('2x'), '2x');
    // Celui-ci a été faux : la règle regardait la SORTE du facteur et oubliait
    // `puissance`, si bien que « 2x² + 3x » sortait « 2 × x² + 3x » — deux
    // produits identiques écrits de deux façons dans la même ligne.
    assert.equal(formuleTexte('2x^2 + 3x'), '2x² + 3x');
    assert.equal(formuleTexte('5(x + 1)'), '5(x + 1)');
});

test('x² et x^2 sont la même chose', () => {
    assert.deepEqual(analyser('x² − 36'), analyser('x^2 − 36'));
    assert.deepEqual(analyser('3x³'), analyser('3x^3'));
});

test('les parenthèses écrites sont celles qu\'il FAUT, pas celles qu\'on a tapées', () => {
    // Superflues : la barre du radical groupe déjà.
    assert.equal(formuleTexte('√(49)'), '√49');
    // Nécessaires : sans elles, l'expression dirait autre chose.
    assert.equal(formuleTexte('(x + 1)^2'), '(x + 1)²');
    assert.equal(formuleTexte('2 × (x + 1)'), '2 × (x + 1)');
    // Et sous une barre de fraction, aucune parenthèse à l'écran — mais il en
    // faut à plat, où la barre ne groupe plus.
    assert.ok(!formule('(2 + 3)/5').includes('fx-paren'));
    assert.equal(formuleTexte('(2 + 3)/5'), '(2 + 3)/5');
});

test('une parenthèse ne se dessine que si son contenu est haut', () => {
    // Autour d'une fraction empilée, une parenthèse de texte ne couvrait que
    // 54 % de la hauteur — mesuré. Or le barreau où elle sert le plus est
    // celui dont la leçon est « le 5 multiplie TOUTE la parenthèse ».
    assert.match(formule('7(4 − 9/7)'), /fx-par-trait/, 'parenthèse haute non dessinée');
    assert.match(formule('2(√5 + 1)'), /fx-par-trait/, 'parenthèse autour d\'une racine');
    // Et pas ailleurs : la parenthèse de la police s'aligne mieux sur le texte.
    assert.ok(!formule('5(x + 1)').includes('fx-par-trait'));
});

test('le signe moins est toujours U+2212, jamais le trait d\'union', () => {
    for (const src of ['-3', '−3', '5 - 2', 'x^2 - y^2']) {
        const t = formuleTexte(src);
        assert.ok(!t.includes('-'), `« ${src} » garde un trait d'union : ${t}`);
        assert.ok(t.includes('−'), `« ${src} » n'écrit aucun moins : ${t}`);
    }
});

test('un numérateur signé ne prend pas de parenthèses', () => {
    // « (−3)/4 » est juste, mais c'est l'écriture d'un élève qui se méfie. La
    // permission est sûre parce qu'elle est réversible : relu, « −3/4 » redonne
    // le même arbre.
    assert.equal(formuleTexte('−3/4'), '−3/4');
    assert.deepEqual(analyser(formuleTexte('−3/4')), analyser('−3/4'));
});

test('une formule illisible lève une erreur claire, elle ne rend pas du faux', () => {
    for (const mauvais of ['√', '(2 + 3', '2 +', '3 @ 4', '']) {
        assert.throws(() => analyser(mauvais), /formule/,
            `« ${mauvais} » aurait dû être refusée`);
    }
});

// ── LA SÉCURITÉ ─────────────────────────────────────────────────────────────

test('le texte libre est échappé — une formule ne pose pas de balise', () => {
    // `texteBrut` est le seul nœud qui accepte du texte arbitraire. Le projet a
    // déjà payé une injection par le prénom d'un élève : on n'en refait pas une
    // par une unité de mesure.
    const h = html(fx.texteBrut('<img src=x onerror=alert(1)>'));
    assert.ok(!h.includes('<img'), 'une balise est passée dans le rendu');
    assert.ok(h.includes('&lt;img'), 'le texte n\'a pas été échappé');
});
