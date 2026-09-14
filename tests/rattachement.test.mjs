// L'ÉLÈVE ET SA CLASSE — le maillon qui manquait.
//
// Ce qu'on vérifie ici tient en une phrase : un élève ne doit JAMAIS voir le
// travail d'un autre, et il doit TOUJOURS voir le sien. Les deux moitiés
// coûtent aussi cher : montrer la séance des huit du groupe de rattrapage aux
// vingt autres, ou cacher sa séance à celui qui l'attend, sont deux façons de
// rendre l'application inutilisable un mardi matin.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { creerClasse, poserEleve } from '../js/core/classes.js';
import { donnerSeance, clore, retirer, poserMot } from '../js/core/seances.js';
import {
    cleEleve, candidats, suggestions, rattacher, detacher, rattachementDe,
    retrouver, mesSeances, maSeance, monMot, etatDeMaSeance
} from '../js/core/rattachement.js';

const H = 3600000;
const T0 = Date.parse('2026-03-10T08:00:00Z');

const parcours = (id, nom, n = 3) => ({
    id, name: nom,
    steps: Array.from({ length: n }, (_, i) => ({ stepId: `${id}_${i}`, exerciseId: 'calc-prio' }))
});

function classeDe(nom, niveau, noms) {
    let c = creerClasse(nom, niveau);
    for (const n of noms) c = poserEleve(c, n);
    return c;
}

// --- La clé d'un élève ------------------------------------------------------

test('la clé se lit comme un élève l\'écrit', () => {
    assert.equal(cleEleve('Emma Durand'), 'emma.durand');
    assert.equal(cleEleve('  ÉMMA   DURAND '), 'emma.durand');
    assert.equal(cleEleve('emma.durand'), 'emma.durand');
    // Le prénom composé garde son trait d'union : sans lui, on ne saurait plus
    // où commence le nom.
    assert.equal(cleEleve('Jean-Luc Martin'), 'jean-luc.martin');
    assert.equal(cleEleve(''), '');
});

test('deux homonymes dans deux classes ne se confondent pas', () => {
    const a = classeDe('5e A', '5e', ['Emma Durand', 'Léo Petit']);
    const b = classeDe('5e B', '5e', ['Emma Durand']);
    const trouves = candidats([a, b], 'emma.durand');
    assert.equal(trouves.length, 2);
    assert.deepEqual(trouves.map(t => t.classe.nom), ['5e A', '5e B']);
    // Et l'on ne choisit pas à leur place : c'est une liste, pas un élève.
    assert.equal(candidats([a, b], 'Léo Petit').length, 1);
    assert.equal(candidats([a, b], 'personne').length, 0);
});

test('on propose ce qui commence pareil, et rien quand il y en a trop', () => {
    const a = classeDe('5e A', '5e', ['Emma Durand', 'Emma Dupont', 'Léo Petit']);
    const s = suggestions([a], 'emma');
    assert.deepEqual(s.map(x => x.eleve.nom).sort(), ['Emma Dupont', 'Emma Durand']);
    // Une lettre ne suffit pas : l'élève n'a pas fini d'écrire.
    assert.deepEqual(suggestions([a], 'e'), []);
    // Au-delà d'une poignée, une liste n'aide personne.
    const grande = classeDe('6e A', '6e',
        Array.from({ length: 12 }, (_, i) => `Marie Dupont${i}`));
    assert.deepEqual(suggestions([grande], 'marie'), []);
});

// --- Le lien ----------------------------------------------------------------

test('le lien se pose, se relit et se défait', () => {
    const c = classeDe('5e A', '5e', ['Emma Durand']);
    const emma = c.eleves[0];
    let liens = rattacher({}, 'p_1', c, emma);
    const lien = rattachementDe(liens, 'p_1');
    assert.equal(lien.classeId, c.id);
    assert.equal(lien.eleveId, emma.id);
    // Le nom est recopié : c'est ce qui permet de dire à qui l'on est rattaché
    // même quand la classe n'est pas sur cet appareil.
    assert.equal(lien.nom, 'Emma Durand');
    assert.equal(lien.classeNom, '5e A');
    assert.deepEqual(retrouver([c], lien).eleve, emma);
    liens = detacher(liens, 'p_1');
    assert.equal(rattachementDe(liens, 'p_1'), null);
});

test('deux profils sur la même tablette vivent dans deux classes', () => {
    const a = classeDe('5e A', '5e', ['Emma Durand']);
    const b = classeDe('4e C', '4e', ['Léo Petit']);
    let liens = rattacher({}, 'p_emma', a, a.eleves[0]);
    liens = rattacher(liens, 'p_leo', b, b.eleves[0]);
    assert.equal(rattachementDe(liens, 'p_emma').classeNom, '5e A');
    assert.equal(rattachementDe(liens, 'p_leo').classeNom, '4e C');
});

test('un lien qui ne désigne plus personne se dit franchement', () => {
    const c = classeDe('5e A', '5e', ['Emma Durand']);
    const lien = rattachementDe(rattacher({}, 'p_1', c, c.eleves[0]), 'p_1');
    // La classe a été effacée.
    assert.equal(retrouver([], lien), null);
    // L'élève n'y est plus.
    assert.equal(retrouver([{ ...c, eleves: [] }], lien), null);
});

// --- La séance que je dois voir ---------------------------------------------

function scene() {
    const c = classeDe('5e A', '5e', ['Emma Durand', 'Léo Petit', 'Nour Amrani']);
    const lien = rattachementDe(rattacher({}, 'p_1', c, c.eleves[0]), 'p_1');
    return { c, lien, emma: c.eleves[0], leo: c.eleves[1] };
}

test('la séance du moment est celle qui est ouverte', () => {
    const { c, lien } = scene();
    const vieille = donnerSeance(c, parcours('p_a', 'Les fractions'));
    vieille.donneeLe = T0 - 5 * 24 * H;
    const recente = donnerSeance(c, parcours('p_b', 'Les priorités'));
    recente.donneeLe = T0 - H;
    const s = maSeance([vieille, recente], lien, T0);
    assert.equal(s.path.name, 'Les priorités');
});

test('une séance À VENIR n\'est pas encore la mienne', () => {
    const { c, lien } = scene();
    const ouverte = donnerSeance(c, parcours('p_a', 'Les fractions'));
    ouverte.donneeLe = T0 - 5 * H;
    const demain = donnerSeance(c, parcours('p_b', 'Demain'), { ouvreLe: T0 + 24 * H });
    demain.donneeLe = T0;
    assert.equal(maSeance([ouverte, demain], lien, T0).path.name, 'Les fractions');
    assert.deepEqual(mesSeances([ouverte, demain], lien, T0).map(s => s.path.name),
        ['Les fractions']);
    // Le lendemain, elle est là.
    assert.equal(maSeance([ouverte, demain], lien, T0 + 25 * H).path.name, 'Demain');
});

test('une séance CLOSE reste proposée quand il n\'y a rien d\'autre', () => {
    // Clore ferme la fenêtre notée, pas l'exercice : l'élève absent ce jour-là
    // doit pouvoir la faire.
    const { c, lien } = scene();
    const s = clore(donnerSeance(c, parcours('p_a', 'Les fractions')), T0 - H);
    s.donneeLe = T0 - 3 * H;
    const vue = maSeance([s], lien, T0);
    assert.equal(vue.path.name, 'Les fractions');
    assert.equal(etatDeMaSeance(vue, lien, null, T0).close, true);
});

test('une séance RETIRÉE disparaît de l\'écran de l\'élève', () => {
    const { c, lien } = scene();
    const s = retirer(donnerSeance(c, parcours('p_a', 'Les fractions')), T0);
    assert.equal(maSeance([s], lien, T0), null);
    assert.deepEqual(mesSeances([s], lien, T0), []);
});

test('LA SÉANCE D\'UN GROUPE NE REGARDE PAS LES AUTRES', () => {
    // C'est la différenciation : « ces huit-là refont les fractions pendant que
    // les autres avancent ». Montrer ce rattrapage à toute la classe le rendrait
    // impossible à donner.
    const { c, lien, leo } = scene();
    const rattrapage = donnerSeance(c, parcours('p_r', 'Rattrapage'), { eleveIds: [leo.id] });
    assert.equal(maSeance([rattrapage], lien, T0), null);
    const lienLeo = rattachementDe(rattacher({}, 'p_2', c, leo), 'p_2');
    assert.equal(maSeance([rattrapage], lienLeo, T0).path.name, 'Rattrapage');
});

test('la séance d\'une AUTRE classe ne me concerne pas', () => {
    const { lien } = scene();
    const autre = classeDe('4e C', '4e', ['Sacha Roux']);
    const s = donnerSeance(autre, parcours('p_a', 'Thalès'));
    assert.equal(maSeance([s], lien, T0), null);
});

test('sans rattachement, il n\'y a rien à montrer', () => {
    const { c } = scene();
    const s = donnerSeance(c, parcours('p_a', 'Les fractions'));
    assert.equal(maSeance([s], null, T0), null);
    assert.deepEqual(mesSeances([s], null, T0), []);
    assert.equal(etatDeMaSeance(s, null, null, T0), null);
});

// --- Ce qu'on affiche -------------------------------------------------------

test('l\'avancement vient du parcours chargé, jamais d\'un second compteur', () => {
    const { c, lien } = scene();
    const p = parcours('p_a', 'Les priorités', 3);
    const s = donnerSeance(c, p);
    // Aucun parcours chargé : zéro, et c'est vrai.
    let e = etatDeMaSeance(s, lien, null, T0);
    assert.equal(e.total, 3);
    assert.equal(e.faites, 0);
    assert.equal(e.commence, false);
    // Un AUTRE parcours chargé ne compte pas pour celui-ci.
    e = etatDeMaSeance(s, lien, { id: 'p_z', completed: ['p_a_0', 'p_a_1'] }, T0);
    assert.equal(e.faites, 0);
    // Le bon parcours, deux étapes faites.
    e = etatDeMaSeance(s, lien, { id: s.path.id, completed: ['p_a_0', 'p_a_1'] }, T0);
    assert.equal(e.faites, 2);
    assert.equal(e.fini, false);
    e = etatDeMaSeance(s, lien, { id: s.path.id, completed: ['p_a_0', 'p_a_1', 'p_a_2'] }, T0);
    assert.equal(e.fini, true);
});

test('le mot du professeur arrive à SON destinataire, et à lui seul', () => {
    const { c, lien, emma, leo } = scene();
    let s = donnerSeance(c, parcours('p_a', 'Les fractions'));
    s = poserMot(s, emma.id, 'Reprends les priorités avec moi lundi.');
    s = poserMot(s, leo.id, 'Beau travail.');
    assert.equal(monMot(s, lien), 'Reprends les priorités avec moi lundi.');
    const lienLeo = rattachementDe(rattacher({}, 'p_2', c, leo), 'p_2');
    assert.equal(monMot(s, lienLeo), 'Beau travail.');
    const lienNour = rattachementDe(rattacher({}, 'p_3', c, c.eleves[2]), 'p_3');
    assert.equal(monMot(s, lienNour), '');
    assert.equal(etatDeMaSeance(s, lien, null, T0).mot,
        'Reprends les priorités avec moi lundi.');
});
