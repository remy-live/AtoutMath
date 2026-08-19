// LES NOUVEAUTÉS — déduites des dates portées par les exercices eux-mêmes.
//
// L'ancienne version tenait une liste à part, et il fallait un test rien que
// pour vérifier que la copie ne mentait pas. La date vit maintenant SUR
// l'exercice : elle ne peut plus se désynchroniser, et ce qui reste à vérifier
// est la seule chose qui compte — que les dates soient vraies et bien formées,
// et que le classement dise ce qu'il prétend dire.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    JOURNEES_MONTREES, dateDeReference, direLaDate, quoiDeNeuf, vaguesDuCatalogue
} from '../js/data/nouveautes.js';
import { exercices } from '../js/data/catalog.js';

const ISO = /^\d{4}-\d{2}-\d{2}$/;

// --- Les dates du catalogue ---------------------------------------------------

test('CHAQUE EXERCICE PORTE SA DATE DE CRÉATION', () => {
    // Sans elle, il n'apparaîtrait jamais dans les nouveautés — et un exercice
    // qu'on livre sans que Rémy le voie passer est un exercice perdu.
    exercices.forEach(e => {
        assert.ok(ISO.test(e.cree || ''), `« ${e.id} » n'a pas de date de création valable`);
    });
});

test('aucune date n\'est dans le futur, ni antérieure au projet', () => {
    const aujourdhui = new Date().toISOString().slice(0, 10);
    exercices.forEach(e => {
        assert.ok(e.cree <= aujourdhui, `« ${e.id} » est daté du futur : ${e.cree}`);
        assert.ok(e.cree >= '2026-07-01', `« ${e.id} » est daté d'avant le projet : ${e.cree}`);
    });
});

test('les révisions sont datées, expliquées, et jamais antérieures à la création', () => {
    exercices.forEach(e => {
        (e.revisions || []).forEach(r => {
            assert.ok(ISO.test(r.date || ''), `${e.id} : révision mal datée`);
            assert.ok(r.date >= e.cree, `${e.id} : révision (${r.date}) avant la création (${e.cree})`);
            // Une révision sans phrase n'apprend rien : autant ne pas la noter.
            assert.ok(r.quoi && r.quoi.length > 30, `${e.id} : révision sans explication utile`);
        });
    });
});

// --- Le classement ------------------------------------------------------------

test('UNE RÉVISION REND L\'EXERCICE PLUS RÉCENT QUE SA CRÉATION', () => {
    const vieux = { id: 'x', cree: '2026-07-01' };
    assert.equal(dateDeReference(vieux), '2026-07-01');
    const revu = { id: 'x', cree: '2026-07-01', revisions: [{ date: '2026-08-19', quoi: 'z' }] };
    assert.equal(dateDeReference(revu), '2026-08-19');
    // Et c'est la DERNIÈRE révision qui compte, pas la première.
    const deuxFois = {
        id: 'x', cree: '2026-07-01',
        revisions: [{ date: '2026-08-01', quoi: 'a' }, { date: '2026-08-19', quoi: 'b' }]
    };
    assert.equal(dateDeReference(deuxFois), '2026-08-19');
});

test('une révision antérieure à la création ne rajeunit rien', () => {
    const bancal = { id: 'x', cree: '2026-08-10', revisions: [{ date: '2026-07-01', quoi: 'a' }] };
    assert.equal(dateDeReference(bancal), '2026-08-10');
});

test('une date absente ou mal formée ne classe pas', () => {
    assert.equal(dateDeReference({ id: 'x' }), null);
    assert.equal(dateDeReference({ id: 'x', cree: 'hier' }), null);
    assert.equal(dateDeReference(null), null);
    assert.equal(quoiDeNeuf({ id: 'x' }), null);
});

test('« revu » porte la phrase qui dit ce qui a changé, « nouveau » n\'en a pas', () => {
    const neuf = quoiDeNeuf({ id: 'x', cree: '2026-08-19' });
    assert.equal(neuf.revise, false);
    assert.equal(neuf.quoi, null);
    const revu = quoiDeNeuf({
        id: 'x', cree: '2026-07-01',
        revisions: [{ date: '2026-08-19', quoi: 'la question change' }]
    });
    assert.equal(revu.revise, true);
    assert.equal(revu.quoi, 'la question change');
});

// --- Les vagues ---------------------------------------------------------------

test('les vagues sont des JOURNÉES, de la plus récente à la plus ancienne', () => {
    const vagues = vaguesDuCatalogue();
    assert.ok(vagues.length, 'aucune vague');
    const dates = vagues.map(v => v.date);
    assert.deepEqual(dates, [...dates].sort().reverse(), 'les journées ne sont pas dans l\'ordre');
    assert.ok(vagues.length <= JOURNEES_MONTREES);
});

test('UNE JOURNÉE RASSEMBLE TOUT CE QUI A ÉTÉ LIVRÉ CE JOUR-LÀ', () => {
    // Par jour et non par version : une même vague de travail se termine
    // souvent en plusieurs versions, et Rémy reçoit des journées.
    const faux = [
        { id: 'a', cree: '2026-08-19', title: 'A', tags: {} },
        { id: 'b', cree: '2026-08-19', title: 'B', tags: {} },
        { id: 'c', cree: '2026-08-18', title: 'C', tags: {} }
    ];
    const v = vaguesDuCatalogue(faux, 5);
    assert.equal(v.length, 2);
    assert.equal(v[0].date, '2026-08-19');
    assert.equal(v[0].entrees.length, 2);
    assert.equal(v[1].entrees.length, 1);
});

test('dans une journée, les exercices REVUS passent devant', () => {
    // Eux seuls portent une phrase qui dit ce qui a changé, et c'est elle
    // qu'on est venu lire.
    const faux = [
        { id: 'a', cree: '2026-08-19', title: 'Neuf', tags: {} },
        { id: 'b', cree: '2026-07-01', title: 'Revu', tags: {}, revisions: [{ date: '2026-08-19', quoi: 'x' }] }
    ];
    const v = vaguesDuCatalogue(faux, 5);
    assert.equal(v[0].entrees[0].exo.title, 'Revu');
    assert.equal(v[0].entrees[0].revise, true);
});

test('un exercice sans date ne fait pas planter le classement, il est ignoré', () => {
    const faux = [
        { id: 'a', cree: '2026-08-19', title: 'A', tags: {} },
        { id: 'b', title: 'Sans date', tags: {} }
    ];
    const v = vaguesDuCatalogue(faux, 5);
    assert.equal(v.length, 1);
    assert.equal(v[0].entrees.length, 1);
});

test('LES NOUVEAUTÉS SE DÉDUISENT DU CATALOGUE — rien à tenir à jour à côté', () => {
    // Le test qui remplace l'ancien « chaque identifiant cité existe » : la
    // question ne se pose plus, puisque les entrées SONT des exercices.
    const connus = new Set(exercices);
    vaguesDuCatalogue().forEach(v => {
        v.entrees.forEach(e => assert.ok(connus.has(e.exo), `${e.exo.id} hors catalogue`));
    });
});

// --- L'écriture des dates -----------------------------------------------------

test('une date se lit en français', () => {
    assert.equal(direLaDate('2026-08-18'), '18 août 2026');
    assert.equal(direLaDate('2026-08-01'), '1er août 2026');
    assert.equal(direLaDate('2026-01-31'), '31 janvier 2026');
    assert.equal(direLaDate('2026-12-25'), '25 décembre 2026');
});

test('une date illisible ne rend rien plutôt qu\'un charabia', () => {
    assert.equal(direLaDate(''), '');
    assert.equal(direLaDate('hier'), '');
    assert.equal(direLaDate(null), '');
    assert.equal(direLaDate('2026-13-01'), '');
});
