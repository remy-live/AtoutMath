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

// --- La fiche papier : une seule question, une seule réponse ------------------

test('un exercice qui déclare un générateur de fiche a bien une fiche', async () => {
    const { generateurDeFiche, aUneFichePapier } = await import('../js/core/registry.js');
    await import('../js/core/activities/index.js');
    for (const exo of exercices) {
        if (!exo.printGeneratorId) continue;
        const g = generateurDeFiche(exo);
        assert.ok(g, `${exo.id} : générateur de fiche « ${exo.printGeneratorId} » introuvable`);
        // Le bouton « travailler sur papier » se décide avec cette fonction :
        // sans elle, un exercice sans `generatorId` — parce qu'il n'existe qu'à
        // l'écran — n'aurait jamais proposé sa fiche.
        assert.ok(aUneFichePapier(exo), `${exo.id} : sa fiche ne serait pas proposée`);
    }
});

test('tout exercice imprimable sait produire des items pour sa fiche', async () => {
    const { generateurDeFiche, aUneFichePapier } = await import('../js/core/registry.js');
    const { makeRng } = await import('../js/core/ids.js');
    await import('../js/core/activities/index.js');
    for (const exo of exercices) {
        if (!aUneFichePapier(exo)) continue;
        const g = generateurDeFiche(exo);
        if (!g) continue;                       // grille dessinée sans générateur propre
        const reglages = { ...(exo.params || {}), ...(exo.printParams || {}) };
        for (let i = 0; i < 3; i++) {
            const item = g.generate(reglages, { rng: makeRng(`${exo.id}#${i}`), index: i });
            assert.ok(item && item.prompt, `${exo.id} : item sans énoncé`);
            assert.ok(item.answer !== undefined && item.answer !== null,
                `${exo.id} : item sans réponse — la page des solutions serait vide`);
        }
    }
});

test('un générateur qui écrit des fractions le déclare', async () => {
    // SUR LE PAPIER, UNE FRACTION S'ÉCRIT EN COLONNE — numérateur sur
    // dénominateur, séparés d'un trait. La barre oblique est une commodité
    // d'écran, et une feuille qui l'imprime enseigne le contraire du cours.
    // Le rendu sait empiler ; encore faut-il qu'il sache qu'il y a une
    // fraction, et c'est ce drapeau qui le lui dit.
    const { generateurDeFiche } = await import('../js/core/registry.js');
    const { makeRng } = await import('../js/core/ids.js');
    await import('../js/core/activities/index.js');
    const fautifs = [];
    for (const exo of exercices) {
        const g = generateurDeFiche(exo);
        if (!g || !g.ecrit || g.fractions) continue;
        const reglages = { ...(exo.params || {}), ...(exo.printParams || {}) };
        for (let i = 0; i < 25; i++) {
            let it;
            try { it = g.generate(reglages, { rng: makeRng(`fr_${exo.id}_${i}`), index: i }); }
            catch { break; }
            const texte = (it.prompt && (it.prompt.papier || it.prompt.text)) || '';
            // « 3/4 » entre deux chiffres : c'est une fraction, pas une date.
            if (/\d\s*\/\s*\d/.test(texte)) { fautifs.push(`${g.id} : « ${texte} »`); break; }
        }
    }
    assert.deepEqual(fautifs, []);
});
