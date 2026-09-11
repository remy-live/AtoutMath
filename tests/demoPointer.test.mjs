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

// --- LA BANDE DU ROBOT NE DÉSORGANISE PLUS L'EN-TÊTE -------------------------
//
// Rémy, capture d'un aperçu sur son téléphone : « Quand le robot est en route
// les boutons en haut c'est l'anarchie. »
//
// Mesuré sur un 393 × 660, en mode professeur : les commandes du robot
// occupaient une rangée, les quatre boutons de droite une autre — deux bandes
// désalignées, l'une collée à gauche, l'autre à droite, et un en-tête de
// 101 pixels. Pourtant les commandes font 133 pixels et les boutons 170 : ils
// tiennent côte à côte sur 393. La rangée en trop venait de ce que la règle
// regardait la LARGEUR ÉTIRÉE du conteneur, pas celle de son contenu.
//
// Et sur 320 pixels, les commandes passaient PAR-DESSUS les boutons de droite
// — de 8 à 141 contre 124 à 312 — parce que la barre porte « flex-shrink: 0 »,
// ce qui vaut sous le plateau et empêchait ici le défilement de servir.
test('L\'EN-TÊTE DU ROBOT TIENT SUR UNE SEULE RANGÉE', async () => {
    const { readFileSync } = await import('node:fs');
    const mod = readFileSync(new URL('../css/modules.css', import.meta.url), 'utf8');
    const jeux = readFileSync(new URL('../css/games.css', import.meta.url), 'utf8');

    // Une rangée partout : téléphone, simulateurs, et avec la navigation du prof.
    const bloc = mod.slice(mod.indexOf('.jeu--demo#game-layer.avec-nav-prof #game-header'),
        mod.indexOf('.demo-ctrl-signe'));
    assert.match(bloc, /grid-template-areas:\s*"robot actions"/,
        'les commandes du robot ont encore une rangée à elles');
    assert.ok(!/grid-template-areas:\s*"robot" "actions"/.test(mod),
        'il reste un en-tête de démonstration à deux rangées');

    // La barre peut rétrécir dans l'en-tête : sans quoi elle recouvre la croix.
    const entete = jeux.slice(jeux.indexOf('#game-header #demo-controls-host .demo-controls {'),
        jeux.indexOf('#game-header #demo-controls-host .demo-ctrl-btn'));
    assert.match(entete, /flex-shrink:\s*1/, 'la barre ne peut pas rétrécir');
    assert.match(entete, /overflow-x:\s*auto/, 'et elle ne défile pas non plus');

    // Sous 360 pixels, les quatre signes se resserrent au lieu de défiler.
    assert.match(mod, /@media \(max-width: 360px\)[\s\S]{0,220}\.jeu--demo #game-header \.demo-ctrl-btn/,
        'rien ne resserre les commandes sur un écran de 320');
});
