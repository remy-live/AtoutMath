import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import '../js/core/activities/index.js';
import { exercices, filterByStatus, statusOf, countByStatus, STATUS } from '../js/data/catalog.js';

const ex = (id, status) => (status ? { id, status } : { id });
const LOT = [ex('a'), ex('b', STATUS.VALIDE), ex('c', STATUS.TEST), ex('d', STATUS.BROUILLON)];

test('un exercice sans statut déclaré est validé', () => {
    assert.equal(statusOf({ id: 'x' }), STATUS.VALIDE);
    assert.equal(statusOf({ id: 'x', status: STATUS.TEST }), STATUS.TEST);
});

test('un élève ne voit ni les brouillons ni les exercices en test', () => {
    const vus = filterByStatus(LOT, { teacher: false }).map(e => e.id);
    assert.deepEqual(vus, ['a', 'b']);
});

test('le professeur voit aussi les exercices en test, jamais les brouillons', () => {
    const vus = filterByStatus(LOT, { teacher: true }).map(e => e.id);
    assert.deepEqual(vus, ['a', 'b', 'c']);
});

test('un filtre explicite isole un seul état, brouillon compris', () => {
    assert.deepEqual(filterByStatus(LOT, { only: STATUS.TEST }).map(e => e.id), ['c']);
    assert.deepEqual(filterByStatus(LOT, { only: STATUS.BROUILLON }).map(e => e.id), ['d']);
    assert.deepEqual(filterByStatus(LOT, { only: STATUS.VALIDE }).map(e => e.id), ['a', 'b']);
    assert.equal(filterByStatus(LOT, { only: 'tout' }).length, 2, '« tout » applique les règles de visibilité');
});

test('le comptage couvre l\'intégralité du catalogue', () => {
    const c = countByStatus(exercices);
    assert.equal(c.valide + c.test + c.brouillon, exercices.length);
    assert.ok(c.test > 0, 'des exercices sont marqués en test');
});

test('aucun exercice ne porte un statut inconnu', () => {
    const connus = Object.values(STATUS);
    const fautifs = exercices.filter(e => e.status && !connus.includes(e.status));
    assert.deepEqual(fautifs.map(e => e.id), []);
});

test('chaque exercice est rangé dans un chemin entièrement nommé', () => {
    // Un segment `undefined` (constante TAGS mal orthographiée) crée un
    // dossier « undefined » dans le catalogue — c'est arrivé, un élève l'a vu.
    const fautifs = exercices.filter(e => {
        const c = e.tags && e.tags.chemin;
        return !Array.isArray(c) || c.length === 0
            || c.some(s => typeof s !== 'string' || !s.trim());
    });
    assert.deepEqual(fautifs.map(e => e.id), []);
});
