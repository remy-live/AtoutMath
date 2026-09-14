// LES RÉGLAGES QUI FORMENT UNE ÉCHELLE, et ceux qui n'en forment pas.
//
// Le vrai risque de cette fonctionnalité n'est pas qu'une glissière soit laide :
// c'est qu'elle apparaisse là où il n'y a pas d'ordre. « Opération : + − × ÷ »
// posé sur un rail dirait que la division est « plus » que l'addition, et le
// professeur croirait régler une difficulté. Ces tests gardent la frontière.

import test from 'node:test';
import assert from 'node:assert/strict';

import { echelleDe, rangDans, CRANS_MAX } from '../js/core/echelle.js';
import { paliersAide, rangsEnMots, palierEnMots } from '../js/core/apercuAide.js';
import { getActivity } from '../js/core/registry.js';
import '../js/core/activities/index.js';

// --- Ce qui devient une glissière -------------------------------------------

test('un nombre borné est une échelle par nature', () => {
    const e = echelleDe({ type: 'number', min: 3, max: 10 });
    assert.ok(e);
    assert.equal(e.nombre, true);
    assert.deepEqual(e.valeurs, [3, 4, 5, 6, 7, 8, 9, 10]);
    assert.deepEqual(e.libelles, ['3', '4', '5', '6', '7', '8', '9', '10']);
});

test('un nombre sans bornes garde son champ', () => {
    assert.equal(echelleDe({ type: 'number', default: 60 }), null);
    assert.equal(echelleDe({ type: 'number', min: 5 }), null);
});

test('un nombre à plage trop vaste garde son champ', () => {
    // 20 à 999 : un cran vaudrait moins d'un pixel de rail.
    assert.equal(echelleDe({ type: 'number', min: 20, max: 999 }), null);
    assert.ok(echelleDe({ type: 'number', min: 0, max: CRANS_MAX }));
    assert.equal(echelleDe({ type: 'number', min: 0, max: CRANS_MAX + 1 }), null);
});

test('deux valeurs, ce n\'est pas une échelle mais un interrupteur', () => {
    assert.equal(echelleDe({ type: 'number', min: 1, max: 2 }), null);
    assert.ok(echelleDe({ type: 'number', min: 1, max: 3 }));
});

test('une liste ne devient une échelle que si elle le DÉCLARE', () => {
    const operations = {
        type: 'select', options: [
            { value: '+', label: '+' }, { value: '-', label: '−' },
            { value: '*', label: '×' }, { value: '/', label: '÷' }]
    };
    assert.equal(echelleDe(operations), null, 'quatre opérations n\'ont aucun ordre');
    assert.ok(echelleDe({ ...operations, echelle: true }));
});

test('une échelle de deux options est refusée : un rail à deux crans ne dit rien', () => {
    assert.equal(echelleDe({
        type: 'select', echelle: true,
        options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]
    }), null);
});

test('les listes à cocher ne sont jamais des échelles', () => {
    assert.equal(echelleDe({ type: 'multiselect', echelle: true, options: [1, 2, 3, 4] }), null);
});

test('l\'échelle rend les valeurs D\'ORIGINE, avec leur type', () => {
    const e = echelleDe({
        type: 'select', echelle: true,
        options: [{ value: 'auto', label: 'Automatique' }, { value: 2, label: '2' },
            { value: 4, label: '4' }]
    });
    assert.deepEqual(e.valeurs, ['auto', 2, 4]);
    assert.equal(typeof e.valeurs[1], 'number', 'le DOM rendrait « 2 » en texte');
});

// --- Où se pose le curseur ---------------------------------------------------

test('le curseur se pose sur la valeur courante', () => {
    const e = echelleDe({ type: 'select', echelle: true, options: ['a', 'b', 'c'] });
    assert.equal(rangDans(e, 'b'), 1);
    assert.equal(rangDans(e, 'c'), 2);
});

test('une valeur inconnue ne colle pas le curseur au minimum par accident', () => {
    // Un nombre hors bornes rejoint le cran le plus proche ; une valeur de
    // liste disparue retombe au premier cran, faute de mieux.
    const nb = echelleDe({ type: 'number', min: 5, max: 15 });
    assert.equal(rangDans(nb, 99), 10, '15, le dernier cran');
    assert.equal(rangDans(nb, 0), 0);
    assert.equal(rangDans(nb, 9), 4);
    const liste = echelleDe({ type: 'select', echelle: true, options: ['a', 'b', 'c'] });
    assert.equal(rangDans(liste, 'disparue'), 0);
});

test('le rang tolère la valeur rendue par le DOM, qui est du texte', () => {
    const e = echelleDe({
        type: 'select', echelle: true,
        options: [{ value: 'auto', label: 'Auto' }, { value: 2, label: '2' }, { value: 4, label: '4' }]
    });
    assert.equal(rangDans(e, '2'), 1);
});

// --- Les échelles réellement déclarées dans l'application --------------------

test('les réglages d\'aide à échelle sont des échelles jouables', () => {
    // UN RÉGLAGE CACHÉ N'A PAS D'ÉCHELLE, ET C'EST NORMAL. La répartition se
    // règle sur la frise, en cliquant ses zones — elle n'a aucun champ à elle,
    // donc aucun rail à graduer. Voir `cache` dans `fieldHtml`.
    //
    // ET UN OUI/NON NON PLUS. « Autoriser le clavier » est une case à cocher :
    // lui chercher une graduation n'aurait aucun sens. Le test ne vise donc que
    // ce qui se DÉCLARE comme échelle, au lieu de supposer que tout l'est.
    const params = getActivity('bubbles').params.filter(p => !p.cache && p.echelle);
    params.forEach(p => {
        const e = echelleDe(p);
        assert.ok(e, `« ${p.label} » devrait être une échelle`);
        assert.ok(e.valeurs.length >= 3);
        // Le défaut doit être SUR l'échelle, sinon le curseur ouvre ailleurs
        // que là où le réglage se trouve.
        assert.ok(e.valeurs.some(v => String(v) === String(p.default)),
            `le défaut « ${p.default} » de « ${p.label} » n'est pas sur son échelle`);
    });
});

test('l\'échelle de l\'aide va bien du plus porté au plus nu', () => {
    const aide = getActivity('bubbles').params.find(p => p.id === 'aide');
    assert.deepEqual(aide.options.map(o => o.value),
        ['deux', 'propositions', 'progressive', 'clavier']);
});

test('LE CLAVIER S\'AUTORISE, ET IL EST AUTORISÉ PAR DÉFAUT', () => {
    // Ce qui remplace l'ancien « Passage au clavier » et ses six crans. Rémy :
    // « les sliders nombre de propositions et passage au clavier n'ont pas
    // d'intérêt » — restait la seule question que la frise ne peut pas poser,
    // parce qu'elle ne parle que du mode adaptatif : jusqu'où l'échelle a-t-elle
    // le droit de monter ?
    const clavier = getActivity('bubbles').params.find(p => p.id === 'clavier');
    assert.ok(clavier, 'le réglage « Autoriser le clavier » existe');
    assert.equal(clavier.type, 'bool');
    // AUTORISÉ PAR DÉFAUT : produire soi-même la réponse est le but de
    // l'escalier, pas une option qu'on ajouterait.
    assert.equal(clavier.default, true);
    assert.equal(clavier.papier, false);
    // Et les deux vis d'avant ont bien disparu — c'est la moitié du point.
    const ids = getActivity('bubbles').params.map(p => p.id);
    assert.ok(!ids.includes('propositions'), '« Nombre de propositions » doit avoir disparu');
    assert.ok(!ids.includes('saisie'), '« Passage au clavier » doit avoir disparu');
});

// --- L'aperçu : ce que le réglage PRODUIT -----------------------------------

test('« progressive » sur dix questions donne trois paliers', () => {
    const p = paliersAide({ aide: 'progressive' }, 10);
    assert.equal(p.length, 3);
    assert.deepEqual(p[0], { de: 1, a: 3, propositions: 2, clavier: false });
    assert.deepEqual(p[1], { de: 4, a: 8, propositions: 4, clavier: false });
    assert.equal(p[2].de, 9);
    assert.equal(p[2].a, 10);
    assert.equal(p[2].clavier, true);
});

test('un réglage fixe donne UN palier, et l\'aperçu dit alors qu\'il ne se passe rien', () => {
    const p = paliersAide({ aide: 'propositions' }, 10);
    assert.equal(p.length, 1);
    assert.deepEqual(p[0], { de: 1, a: 10, propositions: 4, clavier: false });
});

test('« directement au clavier » ne se découpe pas en deux vignettes identiques', () => {
    // Le préréglage change de nombre de propositions au rang 4 ; au clavier ce
    // nombre n'existe plus, donc c'est le même palier.
    const p = paliersAide({ aide: 'clavier' }, 10);
    assert.equal(p.length, 1);
    assert.equal(p[0].clavier, true);
});

test('les paliers couvrent l\'exercice entier, sans trou ni recouvrement', () => {
    for (const aide of ['deux', 'propositions', 'progressive', 'clavier']) {
        for (const total of [1, 2, 3, 5, 10, 24, 50]) {
            const p = paliersAide({ aide }, total);
            assert.equal(p[0].de, 1, `${aide}/${total}`);
            assert.equal(p[p.length - 1].a, total, `${aide}/${total}`);
            p.forEach((x, i) => {
                assert.ok(x.de <= x.a);
                if (i) assert.equal(x.de, p[i - 1].a + 1, `${aide}/${total} : trou au palier ${i}`);
            });
        }
    }
});

test('l\'aperçu suit les réglages fins, pas seulement le préréglage', () => {
    const p = paliersAide({ aide: 'progressive', propositions: 6, saisie: 'jamais' }, 10);
    assert.equal(p.length, 1);
    assert.equal(p[0].propositions, 6);
    assert.equal(p[0].clavier, false);
});

test('l\'aperçu accepte les valeurs telles que le DOM les rend', () => {
    // Les contrôles rendent du texte : « 6 » et non 6. L'aperçu lit les
    // contrôles eux-mêmes, il doit donc s'en accommoder.
    const p = paliersAide({ aide: 'progressive', propositions: '6', saisie: 'jamais' }, 10);
    assert.equal(p.length, 1);
    assert.equal(p[0].propositions, 6);
});

test('les rangs se disent en français, et une question seule est au singulier', () => {
    assert.equal(rangsEnMots({ de: 1, a: 10 }, 10), 'Les 10 questions');
    assert.equal(rangsEnMots({ de: 9, a: 9 }, 10), 'Question 9');
    assert.equal(rangsEnMots({ de: 4, a: 8 }, 10), 'Questions 4 à 8');
});

test('chaque palier se dit en une ligne', () => {
    assert.match(palierEnMots({ clavier: true }), /clavier/);
    assert.match(palierEnMots({ propositions: 2, clavier: false }), /^2 propositions/);
    assert.equal(palierEnMots({ propositions: 4, clavier: false }), '4 propositions');
    assert.match(palierEnMots({ propositions: null, clavier: false }), /toutes/i);
});
