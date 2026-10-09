// LA RACINE CARRÉE DOIT RECOUVRIR SON RADICANDE, SUR LA FEUILLE AUSSI.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, quatre fois dans la même revue du catalogue :
//
//   · `rc-7`      « racine carré qui ne recouvre pas tout »
//   · `rc-8`      « version imprimé : racine carrée qui ne recouvre pas tout »
//   · `rc-pas`    « attention au racine carré pour le mode imprimable qui ne
//                   recouvre pas le nombre »
//   · `rc-revision` « la racine carré ne recouvre pas bien le nombre sur la
//                   version imprimé »
//
// ── CE N'ÉTAIT PAS UNE BARRE PERDUE : IL N'Y EN AVAIT JAMAIS EU ────────────
//
// L'écran dessine le radical avec sa barre (`core/maths/formule.js`). La
// FEUILLE, elle, reçoit la forme TEXTE de la même formule — et à plat, un
// radical s'écrit « √64 ». La feuille imprimait donc fidèlement ce qu'on lui
// donnait.
//
// ET CE N'EST PAS COSMÉTIQUE. Sans barre :
//
//   · « √64 » ne dit pas si l'on prend la racine de 64 ou la racine de 6
//     multipliée par 4 ;
//   · « √81 × √49 » ne se distingue plus de « √(81 × 49) » — or tout
//     l'exercice `rc-5` est là pour apprendre que ce sont deux écritures de la
//     MÊME chose, ce qui ne s'enseigne pas sur une feuille où elles s'écrivent
//     pareil ;
//   · et sur `rc-7`, dont le titre est « la racine ne traverse pas une
//     addition », « √9 + 16 » sans barre est exactement le piège que l'exercice
//     combat, imprimé par nos soins.
//
// ── POURQUOI CETTE ÉPREUVE PORTE SUR `morceauxLigne` ──────────────────────
//
// Parce que c'est la seule pièce que les TROIS lecteurs partagent : l'aperçu
// HTML, le PDF, et la mesure des colonnes. Son commentaire le dit déjà — une
// sorte de morceau ajoutée sans faire le tour des trois se compose sur une
// largeur et s'imprime sur une autre. L'épreuve tient donc le découpage ; le
// rendu, lui, se regarde au navigateur (`tools/ficheRacines.mjs`).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { morceauxLigne } from '../js/ui/ficheRendu.js';

/** Les radicandes d'une ligne, dans l'ordre. */
const racines = (ligne) => morceauxLigne(ligne, false)
    .filter(m => m.racine !== undefined).map(m => m.racine);

test('UN RADICAL SORT DE LA LIGNE AVEC SON RADICANDE', () => {
    // Les deux formes que `core/maths/formule.js` produit, et rien d'autre.
    assert.deepEqual(racines('Simplifier : √64'), ['64']);
    assert.deepEqual(racines('Simplifier : √(9 + 16)'), ['9 + 16']);
});

test('DEUX RACINES NE SE CONFONDENT PAS AVEC UNE SEULE', () => {
    // C'est la distinction que tout le chapitre enseigne : √81 × √49 et
    // √(81 × 49) valent la même chose, et ne s'écrivent pas pareil. Sans deux
    // morceaux distincts, la feuille les écrirait de façon identique.
    assert.deepEqual(racines('√81 × √49'), ['81', '49']);
    assert.deepEqual(racines('√(81 × 49)'), ['81 × 49']);
});

test('LA BARRE S\'ARRÊTE OÙ LE RADICANDE S\'ARRÊTE', () => {
    // « √2 + 3 » : la racine ne couvre QUE le 2. Un motif qui tenterait de
    // deviner la fin d'un radicande non parenthésé mettrait la barre sur toute
    // l'addition — et imprimerait une égalité fausse.
    assert.deepEqual(racines('√2 + 3'), ['2']);
    const m = morceauxLigne('√2 + 3', false);
    assert.equal(m[0].racine, '2');
    assert.match(m[1].texte, /^ \+ 3$/, 'le reste de la ligne demeure du texte ordinaire');
});

test('le reste de la ligne n\'est pas abîmé', () => {
    const m = morceauxLigne('Simplifier : √64 puis conclure', false);
    assert.equal(m.length, 3);
    assert.equal(m[0].texte, 'Simplifier : ');
    assert.equal(m[1].racine, '64');
    assert.equal(m[2].texte, ' puis conclure');
});

test('UNE LIGNE SANS RACINE N\'EST PAS TOUCHÉE', () => {
    // Deux cent vingt-quatre exercices passent par ce découpage ; celui qui
    // n'a pas de racine doit en ressortir exactement comme avant.
    const m = morceauxLigne('Combien vaut 12 × 7 ?', false);
    assert.deepEqual(m, [{ texte: 'Combien vaut 12 × 7 ?' }]);
});

test('LES QUATRE AUTRES SORTES DE MORCEAUX SURVIVENT À LA CINQUIÈME', () => {
    // L'ajout d'une sorte est exactement ce qui a déjà cassé ce découpage une
    // fois — « 3a² + 2a² » sortait en « 3a undefined/undefined ». On vérifie
    // donc les quatre anciennes en même temps que la neuve.
    assert.ok(morceauxLigne('x ≈ 3', false).some(m => m.presque), 'le ≈');
    assert.ok(morceauxLigne('2π', false).some(m => m.pi), 'le π');
    assert.ok(morceauxLigne('3a²', false).some(m => m.haut), 'l\'exposant');
    assert.ok(morceauxLigne('3/4', true).some(m => m.num !== undefined), 'la fraction');
    // Et les deux ensemble, qui est le cas que le motif pourrait mélanger :
    // dans « √(a/b) » la fraction ne doit pas attraper le radicande toute seule
    // en laissant un « √( » orphelin.
    const melange = morceauxLigne('√(3/4)', true);
    assert.equal(melange.length, 1);
    assert.equal(melange[0].racine, '3/4');
});
