// JezzBall : les murs poussent, les régions se ferment, le pourcentage dit vrai.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    creerPartie, avancerBalle, lancerMur, pousserMur, murTouche, casserMur,
    fermerRegions, pourcentage
} from '../js/core/jezzball.js';
import { makeRng } from '../js/core/ids.js';

test('les balles restent dans le terrain, quoi qu\'il arrive', () => {
    const p = creerPartie(20, 14, 4, makeRng('b'));
    for (let t = 0; t < 4000; t++) p.balles.forEach(b => avancerBalle(p, b));
    p.balles.forEach(b => {
        assert.ok(b.x > 0 && b.x < 20 && b.y > 0 && b.y < 14, `balle sortie : ${b.x}, ${b.y}`);
    });
});

test('un mur pousse des deux côtés et se fige au contact des bords', () => {
    const p = creerPartie(9, 7, 1, makeRng('m'));
    p.balles[0].x = 1.5; p.balles[0].y = 1.5;    // qu'elle ne gêne pas
    const mur = lancerMur(p, 4, 3, true);
    assert.ok(mur);
    let etat = 'pousse', garde = 0;
    while (etat === 'pousse' && garde++ < 20) etat = pousserMur(p, mur);
    assert.equal(etat, 'fini');
    // La colonne 4 entière est pleine.
    for (let y = 0; y < 7; y++) assert.equal(p.cellules[y * 9 + 4], 1, `case (4,${y})`);
    // Un seul mur à la fois : le suivant part, mais pas tant qu'un pousse.
    const deux = lancerMur(p, 2, 2, false);
    assert.ok(deux);
    assert.equal(lancerMur(p, 6, 2, false), null);
});

test('fermer un mur enferme la région sans balle', () => {
    const p = creerPartie(9, 7, 1, makeRng('r'));
    p.balles[0].x = 2.5; p.balles[0].y = 3.5;    // à GAUCHE de la future coupe
    const mur = lancerMur(p, 5, 3, true);
    while (pousserMur(p, mur) === 'pousse');
    // Tout ce qui est à droite de la colonne 5 est conquis.
    for (let y = 0; y < 7; y++) for (let x = 6; x < 9; x++) {
        assert.equal(p.cellules[y * 9 + x], 1, `case (${x},${y}) devrait être conquise`);
    }
    // Et la gauche, où vit la balle, est restée libre.
    assert.equal(p.cellules[3 * 9 + 2], 0);
    const pc = pourcentage(p);
    // 4 colonnes conquises sur 9 (le mur + les trois de droite) : 4/9 ≈ 44 %.
    assert.equal(pc, Math.floor(100 * (4 * 7) / (9 * 7)));
});

test('le pourcentage est exactement la proportion de cases pleines', () => {
    const p = creerPartie(10, 10, 1, makeRng('pc'));
    for (let i = 0; i < 25; i++) p.cellules[i] = 1;
    assert.equal(pourcentage(p), 25);
    for (let i = 25; i < 60; i++) p.cellules[i] = 1;
    assert.equal(pourcentage(p), 60);
});

test('une balle qui touche le mur en construction le fait casser', () => {
    const p = creerPartie(9, 7, 1, makeRng('t'));
    p.balles[0].x = 4.5; p.balles[0].y = 3.5;
    const mur = lancerMur(p, 4, 3, true);
    assert.ok(murTouche(p, mur), 'la balle est dessus');
    casserMur(p, mur);
    assert.equal(p.murs.length, 0);
    assert.equal(p.cellules[3 * 9 + 4], 0, 'les cases du mur cassé restent libres');
});

test('fermerRegions ne mange jamais la région d\'une balle', () => {
    const p = creerPartie(12, 8, 3, makeRng('f'));
    fermerRegions(p);
    p.balles.forEach(b => {
        assert.equal(p.cellules[Math.floor(b.y) * 12 + Math.floor(b.x)], 0);
    });
});
