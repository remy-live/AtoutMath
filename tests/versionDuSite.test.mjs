// SAVOIR CE QU'ON EXÉCUTE.
//
// Rien n'affichait le numéro de version, et cela a coûté une demi-journée :
// Rémy regardait un écran, je lui décrivais un bouton, et le bouton n'y était
// pas — son serveur servait encore la version d'avant. Il a fallu le déduire
// d'un détail de mise en page.
//
// Le numéro n'est recopié nulle part : on lit le `?v=` que porte la page,
// c'est-à-dire ce que le SERVEUR a réellement envoyé à ce navigateur-là. Une
// constante écrite à la main mentirait au premier oubli.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { versionDuSite, versionLisible } from '../js/core/versionDuSite.js';

/** Un faux document : deux méthodes, c'est tout ce que la fonction demande. */
function page(hrefs) {
    return {
        querySelectorAll: () => hrefs.map(h => ({ getAttribute: () => h }))
    };
}

test('le numéro se lit sur la feuille de style', () => {
    assert.equal(versionDuSite(page(['css/base.css?v=689'])), '689');
    assert.equal(versionLisible(page(['css/base.css?v=689'])), 'v689');
});

test('la première feuille numérotée suffit, même précédée d\'une autre', () => {
    assert.equal(versionDuSite(page(['vendor/outfit/outfit.css', 'css/base.css?v=42'])), '42');
});

test('un paramètre qui suit un autre est trouvé aussi', () => {
    assert.equal(versionDuSite(page(['css/base.css?a=1&v=700'])), '700');
});

test('ON NE MONTRE RIEN PLUTÔT QU\'UN « v » TOUT SEUL', () => {
    // Une page sans numéro — un développement local, une feuille servie sans
    // paramètre — ne doit pas afficher un moignon. Mieux vaut le silence
    // qu'une information à moitié fausse : c'est justement en se fiant à une
    // demi-information qu'on perd une demi-journée.
    assert.equal(versionDuSite(page(['css/base.css'])), '');
    assert.equal(versionLisible(page(['css/base.css'])), '');
    assert.equal(versionDuSite(page([])), '');
    assert.equal(versionLisible(page([])), '');
});

test('sans document du tout, on ne casse pas', () => {
    assert.equal(versionDuSite(null), '');
    assert.equal(versionLisible(null), '');
    assert.equal(versionDuSite({}), '');
});

test('un « v » non numérique n\'est pas une version', () => {
    assert.equal(versionDuSite(page(['css/base.css?v=abc'])), '');
});
