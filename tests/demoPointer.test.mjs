// LA BARRE DU ROBOT, ET LES DEUX FAÇONS DE LE TUER EN SILENCE.
//
// Cinq démonstrations — le Compte est Bon, le tableau de conversion, les
// priorités et les deux poses d'opération — étaient mortes sans un mot :
//
//   · elles appelaient `gate.wait(...)`, une méthode qui n'existait pas ;
//   · et elles lui passaient « 2500 * DEMO_SPEED », qui vaut NaN puisque
//     DEMO_SPEED est un tableau de durées nommées, pas un facteur.
//
// Chacune était enveloppée dans un `catch` muet. À l'écran : rien. En
// console : rien. On ne pouvait qu'en conclure, comme Rémy, que « le robot ne
// fonctionne pas ». Ces vérifications tiennent les deux portes fermées.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import './helpers.mjs';
import { createDemoGate, DEMO_SPEED, setDemoMuet } from '../js/core/demoPointer.js';

test('la barre du robot sait attendre', async () => {
    setDemoMuet(true);   // sans DOM : la barre muette, qui a la même interface
    const gate = createDemoGate(null);
    assert.equal(typeof gate.wait, 'function', 'gate.wait doit exister');
    assert.equal(typeof gate.waitTurn, 'function');
    assert.equal(typeof gate.destroy, 'function');
    const t0 = Date.now();
    await gate.wait(60);
    assert.ok(Date.now() - t0 >= 45, 'l\'attente doit réellement attendre');
    gate.destroy();
    setDemoMuet(false);
});

test('DEMO_SPEED est un tableau de durées, jamais un facteur', () => {
    // C'est la nature même de DEMO_SPEED qui a piégé cinq jeux : le multiplier
    // donne NaN. Si un jour il devenait un nombre, ce test le dirait — et les
    // appels « ms * DEMO_SPEED » redeviendraient légitimes.
    assert.equal(typeof DEMO_SPEED, 'object');
    for (const [nom, v] of Object.entries(DEMO_SPEED)) {
        assert.ok(Number.isFinite(v), `DEMO_SPEED.${nom} doit être un nombre`);
    }
});

test('aucun jeu ne multiplie une durée par DEMO_SPEED', () => {
    // La faute exacte, cherchée dans tout le code : « quelque chose * DEMO_SPEED »
    // sans nommer l'une de ses durées.
    const dossiers = ['js/games', 'js/core/activities'];
    const fautes = [];
    for (const d of dossiers) {
        for (const f of fs.readdirSync(d)) {
            if (!f.endsWith('.js')) continue;
            const texte = fs.readFileSync(path.join(d, f), 'utf8');
            texte.split('\n').forEach((ligne, i) => {
                if (/\*\s*DEMO_SPEED\s*(?![.\w])/.test(ligne)) fautes.push(`${d}/${f}:${i + 1}`);
            });
        }
    }
    assert.deepEqual(fautes, [], `DEMO_SPEED multiplié tel quel : ${fautes.join(', ')}`);
});
