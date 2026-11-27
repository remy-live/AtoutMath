// LE PLATEAU EN CLASSE : chacun ses tirages, et les autres glissent.
//
// Rémy, 27 novembre : « tous les élèves ont eu le chiffre 5 […] ce n'est pas du
// tout fluide ». Le chemin des ardoises est gardé par
// `node tools/plateauEnClasse.mjs` (vu tomber avec l'ancien écran : « 2 et 2 »
// partout, 3 places en 38 relevés) ; ce fichier garde les deux règles.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleDesTirages, positionGlissee, SAUT_SANS_GLISSER, NOMBRES } from '../js/core/plateau.js';
import { makeRng } from '../js/core/ids.js';

test('TRENTE ÉLÈVES SUR LA MÊME GRAINE NE TIRENT PAS TOUS LE MÊME NOMBRE', () => {
    const premiers = Array.from({ length: 30 }, (_, i) =>
        makeRng(cleDesTirages('AB12CD', `eleve-${i}`)).pick(NOMBRES));
    const differents = new Set(premiers).size;
    assert.ok(differents >= 5, `seulement ${differents} nombre(s) différent(s) sur trente ardoises`);
    // Et c'est stable : la même ardoise rechargée retrouve le même tirage.
    assert.equal(makeRng(cleDesTirages('AB12CD', 'eleve-3')).pick(NOMBRES), premiers[3]);
    // En démonstration, sans élève, la graine seule rejoue la même partie.
    assert.equal(cleDesTirages('AB12CD'), 'partie-AB12CD');
});

test('UN ROND DISTANT GLISSE D\'UN BATTEMENT À L\'AUTRE, SANS SAUTER', () => {
    const de = { x: 2, y: 3 }, vers = { x: 4, y: 3 };
    assert.deepEqual(positionGlissee(de, vers, 0, 1000), { x: 2, y: 3 });
    assert.deepEqual(positionGlissee(de, vers, 500, 1000), { x: 3, y: 3 });
    assert.deepEqual(positionGlissee(de, vers, 1000, 1000), { x: 4, y: 3 });
    assert.deepEqual(positionGlissee(de, vers, 5000, 1000), { x: 4, y: 3 }, 'il ne dépasse pas sa place');
    // Un grand saut (une page rechargée) ne traverse pas le plateau.
    const loin = { x: 2 + SAUT_SANS_GLISSER + 1, y: 3 };
    assert.deepEqual(positionGlissee(de, loin, 100, 1000), loin);
    assert.deepEqual(positionGlissee(null, vers, 100, 1000), vers);
});
