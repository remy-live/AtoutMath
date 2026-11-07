// QUELLE PRÉSENTATION — le téléphone ou le réglage mémorisé.
//
// RÉMY, capture d'un iPhone : « quand j'ouvre le menu de gauche c'est le bazar
// en haut et surtout je n'arrive plus à le fermer. » La cause n'était pas dans
// le menu : son téléphone était épinglé en présentation « ordinateur » par le
// bouton 📱 de la palette de test, et TOUT le tiroir — la feuille, la poignée,
// le voile, les deux rangées de la barre — vit sous `body.mobile-view`.
//
// CE QUE CETTE ÉPREUVE GARDE, ET POURQUOI ELLE EXISTE : la règle est
// ASYMÉTRIQUE exprès, et une réécriture qui la rendrait symétrique paraîtrait
// plus propre. Elle retirerait alors, sans bruit, le seul usage du bouton.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { presentationMobile } from '../js/core/presentation.js';

test('SANS RÉGLAGE, C\'EST L\'APPAREIL QUI DIT', () => {
    assert.equal(presentationMobile(null, true), true);
    assert.equal(presentationMobile(null, false), false);
    assert.equal(presentationMobile(undefined, true), true);
    assert.equal(presentationMobile('', false), false);
});

test('« MOBILE » DEMANDÉ EST TOUJOURS HONORÉ — c\'est l\'usage du bouton', () => {
    // Regarder la présentation du téléphone sans téléphone : c'est pour cela
    // que le réglage existe, et le retirer ne se verrait pas avant longtemps.
    assert.equal(presentationMobile('mobile', false), true);
    assert.equal(presentationMobile('mobile', true), true);
});

test('« ORDINATEUR » NE DÉPOUILLE PLUS UN TÉLÉPHONE', () => {
    // MESURÉ avant la correction, 390 × 844, tactile, professeur : menu
    // 250 px, page 140 px, aucune poignée, et le ☰ ne refermait rien. Le
    // téléphone garde donc SA présentation, c'est-à-dire `true`.
    assert.equal(presentationMobile('desktop', true), true,
        'un téléphone en portrait garde la présentation dont il a besoin');
    // ET LE RÉGLAGE N'EST PAS EFFACÉ POUR AUTANT : sur un écran qui peut le
    // porter — un ordinateur, une tablette, le même téléphone en paysage —
    // « ordinateur » reste ce qu'on obtient.
    assert.equal(presentationMobile('desktop', false), false);
});

test('ET LA RÈGLE N\'EST PAS SYMÉTRIQUE, ce qui est tout son objet', () => {
    // CE QUE L'ASYMÉTRIE VEUT DIRE, EXACTEMENT — et je l'ai d'abord écrit à
    // l'envers, ce que `epreuveTombe` a refusé avant que je le croie :
    //
    //   · sur un GRAND ÉCRAN, les deux réglages s'opposent : « mobile »
    //     impose la présentation du téléphone, « ordinateur » laisse celle du
    //     bureau. C'est là que le bouton sert.
    //   · sur un TÉLÉPHONE, ils donnent la MÊME chose : « ordinateur » n'a
    //     plus aucun pouvoir. C'est cela, la correction.
    assert.notEqual(presentationMobile('mobile', false), presentationMobile('desktop', false),
        'sur un grand écran, le réglage doit faire une différence');
    assert.equal(presentationMobile('mobile', true), presentationMobile('desktop', true),
        'sur un téléphone, « ordinateur » ne doit plus rien pouvoir');
    // Une réécriture « propre » qui traiterait les deux pareil —
    // `if (choix) return choix === 'mobile'` — rend la seconde ligne fausse.
});

test('UN RÉGLAGE INCONNU NE FAIT PAS BASCULER L\'ÉCRAN', () => {
    // Une valeur restée d'une version précédente, ou écrite à la main : on
    // retombe sur ce que dit l'appareil, jamais sur une présentation tirée au
    // hasard.
    for (const bizarre of ['tablette', 'MOBILE', ' mobile', 'true', '1']) {
        assert.equal(presentationMobile(bizarre, true), true, bizarre);
        assert.equal(presentationMobile(bizarre, false), false, bizarre);
    }
});
