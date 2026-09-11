// RÉDUIRE AVEC DES PUISSANCES.
//
// Rémy : « j'aimerais bien un exercice pour simplifier une expression littérale
// du genre 3x² + 2x − 12x etc., mets des boutons carrés voire cube. On essaie
// d'être progressif. »
//
// Son exemple est toute la leçon, et c'est lui qu'on met en premier : trois
// termes, et deux seulement se regroupent.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import {
    ecrireTerme, ecrireSomme, reduire, normaliser, memeReponse,
    fauteToutRegrouper, fauteAjouterExposants, partDeDegre, MOINS
} from '../js/core/reductionPuissances.js';
import { ETAPES, question } from '../js/core/generators/litteralPuissances.js';

test('L\'EXEMPLE DE RÉMY : 3x² + 2x − 12x donne 3x² − 10x', () => {
    const termes = [{ coef: 3, degre: 2 }, { coef: 2, degre: 1 }, { coef: -12, degre: 1 }];
    assert.equal(ecrireSomme(termes, 'x'), `3x² + 2x ${MOINS} 12x`);
    assert.equal(ecrireSomme(reduire(termes), 'x'), `3x² ${MOINS} 10x`);
});

test('ON NE REGROUPE QUE LE MÊME DEGRÉ — et « déjà réduit » est une réponse', () => {
    // La marche décisive de la progression. Si x vaut 5, alors x vaut 5 et x²
    // en vaut 25 : les additionner reviendrait à ajouter des mètres à des
    // mètres carrés.
    const dejaReduite = [{ coef: 3, degre: 2 }, { coef: 2, degre: 1 }];
    assert.equal(ecrireSomme(reduire(dejaReduite), 'x'), '3x² + 2x');
    // Et les degrés sortent TOUJOURS du plus haut au plus bas, quel que soit
    // l'ordre de l'énoncé : une réponse canonique est ce qui permet de
    // corriger sans discuter.
    const melange = [{ coef: 4, degre: 0 }, { coef: 2, degre: 3 }, { coef: 5, degre: 1 }];
    assert.deepEqual(reduire(melange).map(t => t.degre), [3, 1, 0]);
    assert.equal(ecrireSomme(reduire(melange), 'x'), '2x³ + 5x + 4');
});

test('les conventions d\'écriture d\'un terme', () => {
    assert.equal(ecrireTerme(1, 'x', 2), 'x²');       // le coefficient 1 ne s'écrit pas
    assert.equal(ecrireTerme(-1, 'x', 2), MOINS + 'x²');
    assert.equal(ecrireTerme(0, 'x', 2), '0');
    assert.equal(ecrireTerme(7, 'x', 0), '7');        // pas de x⁰ dans un cahier
    assert.equal(ecrireTerme(3, 'x', 1), '3x');
    assert.equal(partDeDegre('a', 3), 'a³');
    // Un terme négatif devient une SOUSTRACTION : on n'écrit jamais « + −10x ».
    assert.equal(ecrireSomme([{ coef: 3, degre: 2 }, { coef: -10, degre: 1 }], 'x'),
        `3x² ${MOINS} 10x`);
    // Tout s'annule : on écrit zéro, pas rien.
    assert.equal(ecrireSomme([{ coef: 3, degre: 1 }, { coef: -3, degre: 1 }].filter(t => t.coef !== 0)
        .slice(0, 0), 'x'), '0');
    assert.equal(ecrireSomme(reduire([{ coef: 3, degre: 1 }, { coef: -3, degre: 1 }]), 'x'), '0');
});

test('ON CORRIGE LES MATHÉMATIQUES, PAS LE CLAVIER', () => {
    // Sur une tablette, ² et ³ n'existent pas ; sur un ordinateur, ils
    // demandent une combinaison que personne ne connaît. Refuser « 3x^2-10x »
    // parce qu'il manque un espace serait corriger le clavier.
    for (const ecrit of [
        '3x² − 10x', '3x²-10x', '3x^2 - 10x', '3x2-10x', '3X²−10X', ' 3 x ² - 10 x ',
        '3x**2-10x', '3×x²−10×x'
    ]) {
        assert.ok(memeReponse(ecrit, `3x² ${MOINS} 10x`), `refusé : ${ecrit}`);
    }
    // L'exposant 1 écrit à la main n'est pas une faute de mathématiques.
    assert.ok(memeReponse('5x1', '5x'));
    // MAIS L'ORDRE ET LA RÉDUCTION, EUX, COMPTENT. Ranger par degrés
    // décroissants fait partie de ce qu'on apprend, et rendre l'énoncé tel
    // quel n'est évidemment pas le réduire.
    assert.equal(memeReponse(`${MOINS}10x + 3x²`, `3x² ${MOINS} 10x`), false);
    assert.equal(memeReponse('3x² + 2x − 12x', `3x² ${MOINS} 10x`), false);
    assert.equal(memeReponse('', '3x²'), false);
    assert.equal(memeReponse(null, '3x²'), false);
    // Et deux expressions vraiment différentes ne se confondent pas.
    assert.equal(memeReponse('3x²', '3x³'), false);
    assert.equal(normaliser('x²') === normaliser('x³'), false);
});

test('LES DEUX FAUTES DU CHAPITRE se fabriquent, pour être nommées', () => {
    const termes = [{ coef: 3, degre: 2 }, { coef: 2, degre: 1 }, { coef: -12, degre: 1 }];
    // Tout mettre dans le même sac : 3 + 2 − 12 = −7, et le degré du plus gros.
    assert.equal(fauteToutRegrouper(termes, 'x'), `${MOINS}7x²`);
    // Ajouter les exposants : deux termes en x → x², avec les coefficients
    // quand même additionnés — c'est le mélange des deux règles qui fait la
    // faute.
    assert.equal(fauteAjouterExposants(termes, 'x'), `3x² ${MOINS} 10x²`);
    // Sans deux termes de même degré à confondre, ce piège-là n'existe pas :
    // on ne fabrique pas un distracteur qui n'a aucun sens.
    assert.equal(fauteAjouterExposants([{ coef: 3, degre: 2 }, { coef: 2, degre: 1 }], 'x'), null);
});

test('LES DIX MARCHES TIENNENT DEBOUT, sur mille tirages', () => {
    // Le contrôle qu'on ne peut pas faire à l'œil : chaque marche, cent fois,
    // avec des graines différentes.
    for (const etape of ETAPES) {
        for (let i = 0; i < 100; i++) {
            const q = question(etape, makeRng(`lp-${etape.id}-${i}`));
            assert.ok(q.enonce && q.reponse, `${etape.id} : énoncé ou réponse vide`);
            // UN PIÈGE QUI VAUT LA BONNE RÉPONSE N'EN EST PAS UN : la question
            // aurait alors deux bonnes réponses.
            for (const p of q.pieges) {
                assert.notEqual(normaliser(p.value), normaliser(q.reponse),
                    `${etape.id} : le piège « ${p.value} » est la bonne réponse`);
                assert.ok(p.why && p.why.length > 20, `${etape.id} : piège sans explication`);
            }
            // ON N'ÉCRIT JAMAIS « + − » NI « 0x » : ce sont les deux marques
            // d'une expression fabriquée à la va-vite.
            for (const t of [q.enonce, q.reponse]) {
                assert.ok(!/\+\s*[−-]/.test(t), `${etape.id} : « ${t} » écrit un plus-moins`);
                assert.ok(!/(^|[^\d])0[a-z]/.test(t), `${etape.id} : « ${t} » garde un terme nul`);
                // « 11t² » porte le coefficient onze, pas un : le 1 fautif est
                // celui qui n'a pas de chiffre devant lui.
                assert.ok(!/(^|[^0-9])1[a-z]/.test(t),
                    `${etape.id} : « ${t} » écrit le coefficient 1`);
            }
            // La réponse d'une expression déjà réduite EST l'énoncé rangé : la
            // marche n'aurait aucun sens si le générateur pouvait la réduire.
            if (q.dejaReduite) {
                assert.equal(reduire(q.termes).length, q.termes.length,
                    `${etape.id} : annoncée déjà réduite, mais elle se réduit`);
            }
            assert.ok(q.pourquoi && q.pourquoi.length > 30, `${etape.id} : explication trop courte`);
        }
    }
});

test('LE CUBE NE SORT QUE DES MARCHES QUI EN VEULENT', () => {
    // Le clavier lit `degreMax` pour décider s'il montre la touche x³. Offrir
    // une touche dont on sait qu'elle donnera une réponse fausse, c'est tendre
    // un piège avec l'outil qu'on prête.
    for (const etape of ETAPES) {
        for (let i = 0; i < 40; i++) {
            const q = question(etape, makeRng(`cube-${etape.id}-${i}`));
            if (etape.degreMax < 3) {
                assert.ok(!/³/.test(q.enonce + q.reponse),
                    `${etape.id} annonce degré ${etape.degreMax} mais sort un cube`);
            }
        }
    }
});
