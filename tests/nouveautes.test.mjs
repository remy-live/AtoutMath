// LES NOUVEAUTÉS — la liste ne doit jamais mentir.
//
// C'est une liste écrite à la main, donc elle peut se désynchroniser du
// catalogue : un exercice renommé, retiré, ou dont l'identifiant change, et le
// bouton « Essayer » ne mène plus nulle part. Ces tests sont là pour que cela
// casse la suite au lieu de casser l'outil de Rémy.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { NOUVEAUTES, VAGUES_MONTREES, idsDesNouveautes } from '../js/data/nouveautes.js';
import { exercices, getExerciseById } from '../js/data/catalog.js';
import { vaguesAffichables } from '../js/ui/nouveautesUI.js';

test('CHAQUE EXERCICE CITÉ EXISTE DANS LE CATALOGUE', () => {
    idsDesNouveautes().forEach(id => {
        assert.ok(getExerciseById(id),
            `« ${id} » est annoncé comme nouveauté mais n'est pas au catalogue`);
    });
});

test('un même exercice n\'est annoncé qu\'une fois', () => {
    // Deux fois le même dans deux vagues donnerait deux cartes identiques, et
    // l'on ne saurait plus laquelle est la bonne.
    const ids = idsDesNouveautes();
    assert.equal(new Set(ids).size, ids.length, 'un exercice apparaît dans deux vagues');
});

test('chaque vague dit ce qu\'elle apporte, et d\'où elle vient', () => {
    NOUVEAUTES.forEach(v => {
        assert.match(v.version, /^v\d+$/, `version mal formée : ${v.version}`);
        assert.ok(v.quoi && v.quoi.length > 40, `« ${v.version} » sans explication utile`);
        assert.ok(Array.isArray(v.exos) && v.exos.length, `« ${v.version} » ne cite aucun exercice`);
    });
});

test('les vagues sont rangées de la plus récente à la plus ancienne', () => {
    const nums = NOUVEAUTES.map(v => Number(v.version.slice(1)));
    const triees = [...nums].sort((a, b) => b - a);
    assert.deepEqual(nums, triees, 'les vagues ne sont pas dans l\'ordre');
});

test('on n\'en montre qu\'une poignée : au-delà ce ne sont plus des nouveautés', () => {
    assert.ok(vaguesAffichables().length <= VAGUES_MONTREES);
});

test('UNE VAGUE DONT PLUS AUCUN EXERCICE N\'EXISTE DISPARAÎT', () => {
    // Plutôt qu'un bloc vide, ou pire, un bouton qui ne lance rien.
    const faux = [
        { version: 'v999', quoi: 'x'.repeat(50), exos: ['nexiste-pas', 'non-plus'] },
        { version: 'v998', quoi: 'y'.repeat(50), exos: ['geo-pavage'] }
    ];
    const vues = vaguesAffichables(faux, getExerciseById);
    assert.equal(vues.length, 1);
    assert.equal(vues[0].version, 'v998');
});

test('une vague à moitié valable garde ce qui existe encore', () => {
    const melange = [{ version: 'v997', quoi: 'z'.repeat(50), exos: ['geo-pavage', 'disparu'] }];
    const vues = vaguesAffichables(melange, getExerciseById);
    assert.equal(vues[0].fiches.length, 1);
    assert.equal(vues[0].fiches[0].id, 'geo-pavage');
});

test('les nouveautés annoncées sont visibles par le professeur', () => {
    // Un exercice qu'on propose d'essayer doit se trouver dans le catalogue
    // que le professeur voit — sinon le bouton l'ouvre sans qu'il puisse le
    // retrouver ensuite.
    const connus = new Set(exercices.map(e => e.id));
    idsDesNouveautes().forEach(id => assert.ok(connus.has(id), `${id} hors catalogue`));
});
