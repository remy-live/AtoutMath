// LES FICHES DES JEUX — anagrammes, mots croisés, puissance 4, sim.
//
// Rémy les a demandées une par une en revue : « tu pourrais faire un pdf »,
// « on pourrait avoir un pdf de grille vide », « un pdf de jeu vide ».
//
// Ce qu'on vérifie ici, c'est le CONTENU de la fiche — ce que le générateur
// met dans `meta`, et dont le dessin dépend entièrement. Le dessin lui-même se
// regarde à l'écran ; ce qui se teste, c'est qu'une anagramme ne rende jamais
// le mot lui-même, que la grille de mots croisés soit cohérente avec ses
// définitions, et qu'un plateau vide reste vide.

import test from 'node:test';
import assert from 'node:assert/strict';

import '../js/core/activities/index.js';
import { getGenerator, aUneFichePapier } from '../js/core/registry.js';
import { makeRng } from '../js/core/ids.js';
import { exercices } from '../js/data/catalog.js';
import { memesLettres } from '../js/core/anagrammes.js';

const engendrer = (id, params = {}, graine = 'fiche') =>
    getGenerator(id).generate(params, { rng: makeRng(graine), weakTables: [], index: 0 });

// --- Les anagrammes ---------------------------------------------------------

test('la fiche d\'anagrammes rend autant de lignes qu\'on en demande', () => {
    const it = engendrer('voc.anagrammes-fiche', { nbMots: 6 });
    assert.equal(it.meta.lignes.length, 6);
});

test('chaque mélange porte exactement les lettres du mot, et n\'est pas le mot', () => {
    for (const graine of ['a', 'b', 'c', 'd']) {
        const it = engendrer('voc.anagrammes-fiche', { nbMots: 10 }, graine);
        it.meta.lignes.forEach(l => {
            assert.ok(memesLettres(l.melange, l.mot), `${l.melange} ≠ les lettres de ${l.mot}`);
            assert.notEqual(l.melange, l.mot, `${l.mot} n'est pas mélangé`);
        });
    }
});

test('aucun mot ne dépasse douze lettres : la ligne doit garder sa définition', () => {
    for (const graine of ['x', 'y', 'z']) {
        engendrer('voc.anagrammes-fiche', { nbMots: 16 }, graine)
            .meta.lignes.forEach(l => assert.ok(l.mot.length <= 12, l.mot));
    }
});

test('deux fois le même mot sur une feuille n\'arrive pas', () => {
    const l = engendrer('voc.anagrammes-fiche', { nbMots: 12 }).meta.lignes;
    assert.equal(new Set(l.map(x => x.mot)).size, l.length);
});

test('la correction relie chaque mélange à son mot', () => {
    const it = engendrer('voc.anagrammes-fiche', { nbMots: 5 });
    it.meta.lignes.forEach(l => assert.ok(it.explanation.includes(`${l.melange} → ${l.mot}`)));
});

// --- Les mots croisés -------------------------------------------------------

test('la grille de mots croisés a ses définitions dans les deux sens', () => {
    const m = engendrer('voc.mots-croises-fiche', { theme: 'angles', nbMots: 10 }).meta;
    assert.equal(m.horizontales.length + m.verticales.length, m.mots.length);
    assert.ok(m.horizontales.length > 0 && m.verticales.length > 0);
});

test('chaque définition annonce la vraie longueur de son mot', () => {
    const m = engendrer('voc.mots-croises-fiche', { nbMots: 12 }).meta;
    [...m.horizontales, ...m.verticales].forEach(d => {
        assert.equal(d.longueur, d.mot.length, d.mot);
    });
});

test('les numéros sont rangés par case, prêts à être lus un par un', () => {
    const m = engendrer('voc.mots-croises-fiche', { nbMots: 10 }).meta;
    assert.ok(!Array.isArray(m.numeros), 'un tableau obligerait à le parcourir case par case');
    m.mots.forEach(mot => {
        assert.equal(m.numeros[`${mot.x},${mot.y}`], mot.num, mot.mot);
    });
});

test('la grille dessinée porte bien les lettres des mots', () => {
    const m = engendrer('voc.mots-croises-fiche', { nbMots: 10 }).meta;
    m.mots.forEach(mot => {
        for (let i = 0; i < mot.mot.length; i++) {
            const x = mot.dir === 'h' ? mot.x + i : mot.x;
            const y = mot.dir === 'h' ? mot.y : mot.y + i;
            assert.equal(m.cases[y][x], mot.mot[i], `${mot.mot} en ${x},${y}`);
        }
    });
});

test('les lettres offertes sont de vraies lettres de la grille', () => {
    const m = engendrer('voc.mots-croises-fiche', { nbMots: 10, lettresDonnees: 4 }).meta;
    assert.equal(m.offertes.length, 4);
    m.offertes.forEach(o => assert.equal(m.cases[o.y][o.x], o.lettre));
});

test('sans demande, aucune lettre n\'est offerte', () => {
    assert.deepEqual(engendrer('voc.mots-croises-fiche', {}).meta.offertes, []);
});

// --- Les plateaux vides -----------------------------------------------------

test('la grille de puissance 4 fait sept colonnes sur six rangées par défaut', () => {
    const m = engendrer('jeux.plateaux-fiche', { jeu: 'puissance4' }).meta;
    assert.equal(m.cols, 7);
    assert.equal(m.rows, 6);
});

test('les dimensions se règlent, et restent dans des bornes jouables', () => {
    assert.equal(engendrer('jeux.plateaux-fiche', { jeu: 'puissance4', colonnes: 99 }).meta.cols, 10);
    assert.equal(engendrer('jeux.plateaux-fiche', { jeu: 'puissance4', colonnes: 1 }).meta.cols, 5);
});

test('un plateau vide n\'a pas de réponse — il n\'y a rien à corriger', () => {
    ['puissance4', 'sim'].forEach(jeu => {
        assert.equal(engendrer('jeux.plateaux-fiche', { jeu }).answer, '');
    });
});

test('la règle du jeu voyage avec le plateau : c\'est elle qui sert de consigne', () => {
    assert.match(engendrer('jeux.plateaux-fiche', { jeu: 'sim' }).meta.regle, /triangle/i);
    assert.match(engendrer('jeux.plateaux-fiche', { jeu: 'puissance4' }).meta.regle, /COLONNE/);
});

// --- Le branchement sur le catalogue ---------------------------------------

test('les quatre exercices proposent bien une fiche papier', () => {
    ['voc-anagrammes', 'voc-mots-croises', 'logi-puissance4', 'logi-sim'].forEach(id => {
        const exo = exercices.find(e => e.id === id);
        assert.ok(exo, id);
        assert.ok(aUneFichePapier(exo), `${id} n'offre pas de fiche`);
        assert.ok(getGenerator(exo.printGeneratorId), `${id} : générateur de fiche introuvable`);
    });
});

test('chaque fiche s\'engendre avec les réglages du descripteur', () => {
    ['voc-anagrammes', 'voc-mots-croises', 'logi-puissance4', 'logi-sim'].forEach(id => {
        const exo = exercices.find(e => e.id === id);
        const it = getGenerator(exo.printGeneratorId)
            .generate({ ...(exo.printParams || {}) }, { rng: makeRng(id), weakTables: [], index: 0 });
        assert.ok(it && it.meta, id);
        assert.ok(it.prompt && it.prompt.papier, `${id} : pas d'intitulé papier`);
    });
});
