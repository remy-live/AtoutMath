// LA TRADUCTION D'UN TRACÉ SVG EN SEGMENTS DE PDF.
//
// Les hiéroglyphes de Rémy sont des chemins SVG : le navigateur les dessine,
// jsPDF non — il ne connaît que des segments donnés EN RELATIF. Une erreur ici
// ne se voit pas : le glyphe sort tordu, ou pas du tout, et sur une photocopie
// personne ne remarque qu'un dessin manque.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sousChemins, boiteChemin } from '../js/core/cheminSvg.js';

test('une droite absolue devient un déplacement relatif', () => {
    const c = sousChemins('M 10,20 L 30,50');
    assert.equal(c.length, 1);
    assert.deepEqual(c[0].depart, [10, 20]);
    assert.deepEqual(c[0].segments, [[20, 30]]);
    assert.equal(c[0].ferme, false);
});

test('« Z » ferme le sous-chemin et ramène au départ', () => {
    const c = sousChemins('M 0,0 L 10,0 L 10,10 Z');
    assert.equal(c[0].ferme, true);
    assert.deepEqual(c[0].segments, [[10, 0], [0, 10]]);
});

test('une cubique donne six nombres, relatifs au point courant', () => {
    const c = sousChemins('M 100,100 C 110,100 120,110 120,120');
    assert.deepEqual(c[0].segments, [[10, 0, 20, 10, 20, 20]]);
});

test('les paramètres se répètent sans répéter la lettre', () => {
    // « C a…f g…l » vaut deux courbes : c'est ce qu'écrit LibreOffice, et
    // c'est ce qu'on trouve dans les hiéroglyphes.
    const c = sousChemins('M 0,0 C 1,0 2,1 3,3 4,4 5,5 6,6');
    assert.equal(c[0].segments.length, 2);
    assert.deepEqual(c[0].segments[1], [1, 1, 2, 2, 3, 3]);
});

test('les paires qui suivent un « M » sont des droites', () => {
    const c = sousChemins('M 0,0 5,5 10,5');
    assert.deepEqual(c[0].segments, [[5, 5], [5, 0]]);
});

test('plusieurs sous-chemins restent séparés', () => {
    const c = sousChemins('M 0,0 L 1,1 Z M 10,10 L 11,11 Z');
    assert.equal(c.length, 2);
    assert.deepEqual(c[1].depart, [10, 10]);
});

test('les commandes relatives sont acceptées', () => {
    const abs = sousChemins('M 10,10 L 20,30');
    const rel = sousChemins('M 10,10 l 10,20');
    assert.deepEqual(rel[0].segments, abs[0].segments);
});

test('une commande non gérée le dit, au lieu de dessiner faux', () => {
    // Un arc à moitié tracé sur une photocopie ne se remarque pas ; une
    // exception, si.
    assert.throws(() => sousChemins('M 0,0 A 5,5 0 0 1 10,10'), /non gérée/);
    assert.throws(() => sousChemins('M 0,0 Q 5,5 10,10'), /non gérée/);
});

test('la boîte englobante encadre le tracé', () => {
    const b = boiteChemin('M 10,20 L 40,20 L 40,60 Z');
    assert.deepEqual(b, { x: 10, y: 20, w: 30, h: 40 });
    assert.equal(boiteChemin(''), null);
});

test('un vrai glyphe de Rémy se relit sans erreur', () => {
    // Le bâton des unités, tel qu'il sort de son dessin.
    const d = 'M 10493,12904 C 10493,13018 10493,13302 10493,13415 10493,13425 '
        + '10444,13425 10444,13415 10444,13302 10444,13018 10444,12904 10444,12895 '
        + '10493,12895 10493,12904 Z ';
    const c = sousChemins(d);
    assert.equal(c.length, 1);
    assert.equal(c[0].ferme, true);
    assert.equal(c[0].segments.length, 4);
    const b = boiteChemin(d);
    // Un bâton : beaucoup plus haut que large.
    assert.ok(b.h > b.w * 5, `${b.w} × ${b.h}`);
});
