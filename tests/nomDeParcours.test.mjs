// NOMMER UN PARCOURS TOUT SEUL — pour que la bibliothèque cesse d'être illisible.
//
// Mesuré par l'audit : deux cycles « Nouveau parcours » et deux exercices
// chacun, et le tiroir « Mes parcours » affiche DEUX LIGNES STRICTEMENT
// IDENTIQUES — même nom, même sous-titre « aujourd'hui · 2 exercices ·
// 20 questions ». Rien ne dit lequel est l'essai de mardi et lequel est la
// séance de jeudi. Au bout d'une semaine il y en a huit.
//
// « Nouveau parcours » décrit l'ÉTAT du parcours, pas son CONTENU. L'état change
// à la seconde qui suit ; le contenu reste.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nomPropose, nomDonne, themeDominant } from '../js/core/nomDeParcours.js';

/** Des thèmes par exercice, comme le catalogue les donne. */
const THEMES = {
    'frac-add': ['Fractions'],
    'frac-compare': ['Fractions'],
    'frac-produit': ['Fractions'],
    'calc-add': ['Calcul mental'],
    'geo-angles': ['Angles', 'Géométrie'],
    'sans-theme': []
};
const themesDe = (id) => THEMES[id] || [];
const parcours = (nom, ...ids) => ({ name: nom, steps: ids.map(exerciseId => ({ exerciseId })) });

test('ON NE TOUCHE JAMAIS À UN NOM ÉCRIT À LA MAIN', () => {
    // Renommer le travail de quelqu'un sans le lui demander est le genre de
    // service qu'on ne rend pas — même si le nom est moche.
    assert.equal(nomPropose(parcours('Devoir du mardi', 'frac-add'), themesDe), '');
    assert.equal(nomPropose(parcours('zzz', 'frac-add'), themesDe), '');
    assert.equal(nomDonne('Devoir du mardi'), true);
    assert.equal(nomDonne('Nouveau parcours'), false);
    assert.equal(nomDonne('  '), false);
});

test('UN PARCOURS QUI PARLE DE FRACTIONS S\'APPELLE FRACTIONS', () => {
    assert.equal(nomPropose(parcours('Nouveau parcours', 'frac-add', 'frac-compare'), themesDe),
        'Fractions — 2 exercices');
    assert.equal(nomPropose(parcours('Mon Parcours', 'frac-add'), themesDe),
        'Fractions — 1 exercice');
});

test('LA MAJORITÉ DÉCIDE, PAS LE PREMIER', () => {
    // Un parcours qui commence par un jeu d'échauffement et continue sur trois
    // fractions parle de fractions.
    assert.equal(
        nomPropose(parcours('Nouveau parcours',
            'calc-add', 'frac-add', 'frac-compare', 'frac-produit'), themesDe),
        'Fractions — 4 exercices');
});

test('UN PARCOURS QUI PIOCHE PARTOUT N\'A PAS DE SUJET — et on ne lui en invente pas', () => {
    // Moins de la moitié sur un même thème : lui donner un nom de chapitre
    // serait mentir sur son contenu. On dit alors ce qu'on sait, et rien de plus.
    assert.equal(nomPropose(parcours('Nouveau parcours', 'frac-add', 'calc-add', 'geo-angles'),
        themesDe), '3 exercices');
});

test('UN EXERCICE À TROIS ÉTIQUETTES NE DÉCIDE PAS POUR TROIS', () => {
    // Sans ce partage, l'exercice le plus étiqueté imposerait son thème à tout
    // le parcours : deux exercices « Fractions » perdraient contre un seul
    // exercice qui porte « Angles » ET « Géométrie ».
    assert.equal(themeDominant([['Fractions'], ['Fractions'], ['Angles', 'Géométrie']]),
        'Fractions');
});

test('à égalité, l\'ordre alphabétique tranche', () => {
    // Deux parcours de même contenu doivent recevoir le même nom, quelle que
    // soit la façon dont on les a construits.
    assert.equal(themeDominant([['Angles'], ['Fractions']]),
        themeDominant([['Fractions'], ['Angles']]));
});

test('un parcours vide ne se nomme pas', () => {
    assert.equal(nomPropose(parcours('Nouveau parcours'), themesDe), '');
    assert.equal(nomPropose(null, themesDe), '');
    assert.equal(nomPropose({ name: 'Nouveau parcours', steps: [{}] }, themesDe), '');
});

test('des exercices sans thème donnent quand même un repère', () => {
    // « 2 exercices » n'est pas un beau nom, mais il distingue deux lignes que
    // « Nouveau parcours » confondait — et c'est tout ce qu'on lui demande.
    assert.equal(nomPropose(parcours('Nouveau parcours', 'sans-theme', 'sans-theme'), themesDe),
        '2 exercices');
});

test('LE NOM SUIT LE CONTENU tant que c\'est NOUS qui l\'avons écrit', () => {
    // Mesuré au navigateur : un parcours de deux exercices s'appelait
    // « Fractions — 1 exercice », parce que le premier ajout avait posé un nom,
    // lequel n'était plus un défaut et ne se remettait donc plus à jour. Un nom
    // qui annonce un exercice pour six est PIRE que « Nouveau parcours » : il
    // ment au lieu de se taire.
    assert.equal(nomDonne('Fractions — 1 exercice'), false, 'c\'est notre forme');
    assert.equal(nomDonne('3 exercices'), false);
    assert.equal(
        nomPropose(parcours('Fractions — 1 exercice', 'frac-add', 'frac-compare'), themesDe),
        'Fractions — 2 exercices');
});

test('…mais une forme voisine écrite à la main reste intouchable', () => {
    assert.equal(nomDonne('Fractions — 3 exercices difficiles'), true);
    assert.equal(nomDonne('Révisions : 3 exercices'), true);
    assert.equal(
        nomPropose(parcours('Fractions — 3 exercices difficiles', 'frac-add'), themesDe), '');
});
