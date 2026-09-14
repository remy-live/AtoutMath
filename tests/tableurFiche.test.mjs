import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import { tableurFicheGenerator as G, nomCase, nomPlage } from '../js/core/generators/tableurFiche.js';

test('une case et une plage ne s\'écrivent pas pareil', () => {
    assert.equal(nomCase(0, 0), 'A1');
    assert.equal(nomCase(2, 4), 'C5');
    assert.equal(nomPlage({ c1: 0, r1: 0, c2: 2, r2: 1 }), 'A1:C2');
});

test('la zone tirée tient dans la grille, et son nom la décrit', () => {
    for (let i = 0; i < 300; i++) {
        const it = G.generate({ quoi: 'nommer' }, { rng: makeRng('tz' + i) });
        const { cols, rows, zone, nom, seule, combien } = it.meta;
        assert.ok(zone.c1 >= 0 && zone.c2 < cols, `${nom} déborde en colonnes`);
        assert.ok(zone.r1 >= 0 && zone.r2 < rows, `${nom} déborde en lignes`);
        assert.ok(zone.c2 >= zone.c1 && zone.r2 >= zone.r1, `${nom} a ses coins inversés`);
        assert.equal(combien, (zone.c2 - zone.c1 + 1) * (zone.r2 - zone.r1 + 1));
        // UNE CASE SEULE N'EST PAS UNE PLAGE : « B3 », pas « B3:B3 ».
        assert.equal(seule, combien === 1);
        assert.equal(nom.includes(':'), !seule, `« ${nom} » ne correspond pas à sa forme`);
        assert.match(nom, /^[A-H]\d+(:[A-H]\d+)?$/);
    }
});

test('sans les plages, on ne demande que des cases isolées', () => {
    for (let i = 0; i < 60; i++) {
        const it = G.generate({ quoi: 'colorier', plages: false }, { rng: makeRng('tc' + i) });
        assert.equal(it.meta.combien, 1, `« ${it.meta.nom} » n'est pas une case seule`);
    }
});

test('la formule utilise des références, jamais les nombres du tableau', () => {
    for (let i = 0; i < 300; i++) {
        const it = G.generate({ quoi: 'formule' }, { rng: makeRng('tf' + i) });
        const m = it.meta;
        assert.match(m.formule, /^=/, 'une formule commence par =');
        // C'EST TOUT L'EXERCICE : aucun nombre du tableau ne doit apparaître
        // ailleurs que dans une référence de case.
        const sansRefs = m.formule.replace(/B\d+/g, '');
        m.valeurs.forEach(v => assert.ok(!new RegExp(`\\b${v}\\b`).test(sansRefs),
            `la valeur ${v} est recopiée dans « ${m.formule} »`));
        // Les références pointent bien sur les lignes de données.
        (m.formule.match(/B(\d+)/g) || []).forEach(ref => {
            const n = Number(ref.slice(1));
            assert.ok(n >= m.premiere && n <= m.derniere,
                `« ${m.formule} » désigne la ligne ${n}, hors des données`);
        });
    }
});

test('le résultat annoncé est celui de la formule annoncée', () => {
    const attendu = {
        SOMME: (v) => v.reduce((a, b) => a + b, 0),
        MOYENNE: (v) => Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10
    };
    for (let i = 0; i < 200; i++) {
        const m = G.generate({ quoi: 'formule' }, { rng: makeRng('tr' + i) }).meta;
        const fn = /SOMME/.test(m.formule) ? attendu.SOMME
            : (/MOYENNE/.test(m.formule) ? attendu.MOYENNE : null);
        if (fn) { assert.equal(m.resultat, fn(m.valeurs), m.formule); continue; }
        if (m.formule.includes('+')) assert.equal(m.resultat, m.valeurs[0] + m.valeurs[1]);
        else assert.equal(m.resultat, m.valeurs[m.valeurs.length - 1] - m.valeurs[0]);
    }
});

test('« mélange » sert bien les trois exercices', () => {
    const vus = new Set();
    for (let i = 0; i < 120; i++) {
        vus.add(G.generate({ quoi: 'melange' }, { rng: makeRng('tm' + i) }).meta.quoi);
    }
    assert.deepEqual([...vus].sort(), ['colorier', 'formule', 'nommer']);
});
