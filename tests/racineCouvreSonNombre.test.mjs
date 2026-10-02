// LA RACINE CARRÉE COUVRE SON NOMBRE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, capture d'écran de « Racines carrées pas à pas » à l'appui : « la
// racine carrée ne va pas au dessus du nombre ». Son champ affichait « 3√9 » —
// le caractère posé à côté du 9, sans la barre qui le couvre.
//
// ET LE MODULE QUI SAIT LE DESSINER EXISTE DEPUIS LONGTEMPS. L'énoncé, la
// correction et la fiche papier passent tous par `maths/formule.js` et portent
// un vrai radical, tracé en SVG — il a été écrit pour ça, après une autre
// capture de Rémy : « les racines carrées sont très moches ». Seule la LIGNE
// QUE L'ÉLÈVE ÉCRIT restait du texte brut. C'est-à-dire la seule qu'il regarde
// en écrivant, et celle sur laquelle il apprend à quoi ressemble une racine.
//
// MESURÉ APRÈS, dans un vrai navigateur, en tapant « 3 », « √ », « 9 » sur le
// pavé comme l'élève : un `.fx-rac`, un tracé `.fx-crochet`, et la barre
// par-dessus le 9 sur la photo (tools/tmp/racine.png).
//
// ── CE QUE CE FICHIER GARDE SURTOUT ─────────────────────────────────────────
//
// Pas le dessin : LE REFUS. `formuleSiElleTient` dit non bien plus souvent
// qu'elle ne dit oui, et c'est ce qui rend ce branchement sûr. Les deux refus
// comptent autant l'un que l'autre :
//
//   · une saisie EN COURS n'est presque jamais une formule — « 3√ », « 3√9 = » ;
//   · et surtout, l'analyseur NORMALISE : il écrit « 3 × 9 » là où l'élève a
//     tapé « 3*9 ». Afficher cela corrigerait l'élève à son insu pendant qu'il
//     tape, et l'on ne saurait plus si une faute vient de lui ou de nous.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { formuleSiElleTient } from '../js/core/maths/formule.js';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('LA LIGNE DE RÉMY SE DESSINE : « 3√9 »', () => {
    const h = formuleSiElleTient('3√9');
    assert.ok(h, 'la ligne exacte de sa capture ne se dessine pas');
    // LE RADICAL EST UN TRACÉ, pas un caractère posé à côté d'un trait : c'est
    // la raison d'être de `maths/formule.js`, et ce qui fait que la barre
    // COUVRE le nombre au lieu de flotter à côté.
    assert.match(h, /class="fx-rac"/);
    assert.match(h, /class="fx-crochet"/);
    assert.match(h, /<svg/);
    // Et le 3 reste devant, en facteur.
    assert.match(h, /^3</);
});

test('UNE SAISIE EN COURS NE SE DESSINE PAS — et c\'est normal', () => {
    // À chaque touche, la ligne passe par des états qui n'ont aucun sens. On
    // rend `null` sans se plaindre, et le champ garde son texte.
    ['3√', '√', '3√9 =', '3√9 = 3×', '√(', '3√9)'].forEach(s =>
        assert.equal(formuleSiElleTient(s), null, `« ${s} » ne devrait pas se dessiner`));
});

test('L\'ÉLÈVE LIT CE QU\'IL A TAPÉ, PAS CE QU\'ON EN COMPREND', () => {
    // LE REFUS LE PLUS IMPORTANT DU FICHIER. L'analyseur accepte l'astérisque
    // et le rend en « × » : la formule serait parfaitement dessinable, et elle
    // dirait autre chose que ce que l'élève vient de taper. Le champ le
    // corrigerait à son insu, pendant qu'il écrit.
    assert.equal(formuleSiElleTient('3*√9'), null,
        'le champ réécrit la ligne de l\'élève');
    // Mais les ESPACES, eux, ne changent rien à ce qu'il a voulu écrire.
    assert.ok(formuleSiElleTient('3 × √9'), 'une ligne espacée est la même ligne');
    assert.ok(formuleSiElleTient('3×√9'), 'et sans espaces aussi');
});

test('SANS RACINE, ON NE TOUCHE À RIEN', () => {
    // Vingt chapitres n'ont pas de racine, et leur ligne s'écrit déjà bien en
    // texte. Redessiner ce qui n'en a pas besoin, c'est prendre un risque pour
    // rien — et c'est ainsi qu'on casse ce qui marchait.
    ['2x+1', '(x − 3)(x + 3)', '3² + 4²', '', '7'].forEach(s =>
        assert.equal(formuleSiElleTient(s), null, `« ${s} » n'a rien à redessiner`));
});

test('UNE SAISIE ABSURDE NE FAIT PAS TOMBER LE CHAMP', () => {
    // La saisie vient des doigts d'un élève de seconde. Une exception ici
    // viderait sa ligne au moment où il écrit.
    [null, undefined, '√√√√', '√)(', '√' .repeat(200)].forEach(s =>
        assert.doesNotThrow(() => formuleSiElleTient(s)));
    assert.equal(formuleSiElleTient(null), null);
});

test('LE CHAMP DE SAISIE PASSE PAR LE MODULE, ET GARDE SON TEXTE EN REPLI', () => {
    const SRC = lire('js/core/activities/litteralSaisie.js');
    const i = SRC.indexOf('const redessiner = () => {');
    assert.ok(i > 0, 'le redessin du champ a disparu');
    const bloc = SRC.slice(i, SRC.indexOf('const taper =', i));
    assert.ok(bloc.length > 200, 'tranche vide : le test ne vérifierait rien');

    // LE TEXTE EST POSÉ D'ABORD, le dessin ne vient qu'ENSUITE et seulement
    // s'il tient. Dans l'autre ordre, un refus laisserait le champ vide —
    // c'est-à-dire la ligne de l'élève effacée pendant qu'il écrit.
    const iTexte = bloc.indexOf('texteEl.textContent = saisie;');
    const iDessin = bloc.indexOf('formuleSiElleTient(saisie)');
    assert.ok(iTexte > 0 && iDessin > iTexte,
        'le dessin passe avant le texte : un refus viderait la ligne');
    assert.match(bloc, /if \(dessinee\) texteEl\.innerHTML = dessinee;/);
});
