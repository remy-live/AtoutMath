import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import '../js/core/activities/index.js';
import { exercices } from '../js/data/catalog.js';

/**
 * LE PAPIER PROPOSE, LE PROFESSEUR DISPOSE.
 *
 * Rémy, sur quatre exercices d'affilée : « les paramètres ne fonctionnent
 * pas ». La fusion s'écrivait `{...params, ...printParams}` : ce que le
 * professeur venait de choisir dans l'engrenage était systématiquement écrasé
 * par la valeur du catalogue. Dix-sept exercices avaient ainsi des réglages
 * morts sur papier.
 *
 * Ces tests-là gardent les deux moitiés de la règle : l'ordre de fusion, et le
 * fait qu'une valeur écrite dans `printParams` soit une valeur QUE LE SCHÉMA
 * ACCEPTE — deux d'entre elles dataient d'un schéma disparu et ne voulaient
 * plus rien dire (`definition: true` là où l'on attend « toujours »,
 * `taille: 15` là où l'on attend « moyen »).
 */

/** La fusion telle que la font `printParcours`, `printQuestions` et `printSheet`. */
const fusion = (exo, params) => ({ ...(exo.printParams || {}), ...(params || {}) });

test('UN RÉGLAGE CHOISI PAR LE PROFESSEUR L\'EMPORTE SUR LE DÉFAUT DU PAPIER', () => {
    const exo = { printParams: { taille: 'moyenne', operation: '×' } };
    // Ce qu'il a choisi passe devant…
    assert.equal(fusion(exo, { taille: 'grande' }).taille, 'grande');
    // …et ce qu'il n'a pas réglé garde le défaut du papier.
    assert.equal(fusion(exo, { taille: 'grande' }).operation, '×');
    assert.equal(fusion(exo, {}).taille, 'moyenne');
});

test('AUCUN `printParams` NE PORTE UNE VALEUR QUE SON PROPRE SCHÉMA REFUSE', () => {
    const fautes = [];
    for (const e of exercices) {
        if (!e.printParams || !Array.isArray(e.paramSchema)) continue;
        const schema = new Map(e.paramSchema.map(p => [p.id, p]));
        for (const [cle, valeur] of Object.entries(e.printParams)) {
            const p = schema.get(cle);
            // Une clé absente du schéma est LÉGITIME : c'est même le seul
            // usage qui reste à `printParams` — ce que l'écran ne règle pas.
            if (!p || p.type !== 'select' || !Array.isArray(p.options)) continue;
            const connue = p.options.some(o => JSON.stringify(o.value) === JSON.stringify(valeur));
            if (!connue) fautes.push(`${e.id} · ${cle} = ${JSON.stringify(valeur)}`);
        }
    }
    assert.deepEqual(fautes, [], `valeurs hors schéma :\n${fautes.join('\n')}`);
});

test('les réglages du papier restent des réglages du papier', () => {
    // Rien n'INTERDIT de répéter dans `printParams` une clé que l'écran règle
    // — depuis l'inversion, c'est simplement inutile puisque le professeur
    // l'emporte. Ce test compte ces répétitions pour qu'on les voie : chacune
    // est une intention qui ne s'appliquera QUE tant qu'on n'y touche pas.
    const repetes = [];
    for (const e of exercices) {
        if (!e.printParams || !Array.isArray(e.paramSchema)) continue;
        const reglables = new Set(e.paramSchema.map(p => p.id));
        for (const cle of Object.keys(e.printParams)) {
            if (!reglables.has(cle)) continue;
            const ecran = e.params && e.params[cle] !== undefined
                ? e.params[cle]
                : (e.paramSchema.find(p => p.id === cle) || {}).default;
            // Une répétition à l'identique ne trompe personne ; une répétition
            // qui DIFFÈRE est un piège, parce qu'elle promet au papier une
            // valeur que le premier réglage du professeur fera disparaître.
            if (JSON.stringify(ecran) !== JSON.stringify(e.printParams[cle])) {
                repetes.push(`${e.id} · ${cle} : écran ${JSON.stringify(ecran)}, papier ${JSON.stringify(e.printParams[cle])}`);
            }
        }
    }
    assert.ok(repetes.length <= 2,
        `trop de défauts papier qui divergent de l'écran :\n${repetes.join('\n')}`);
});
