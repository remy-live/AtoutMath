// LE PAVAGE : reconnaître la transformation entre deux pièces.
//
// Un seul défaut compte ici, et il est rédhibitoire : une question à DEUX
// bonnes réponses. Deux carrés voisins sont l'image l'un de l'autre par une
// translation ET par une symétrie ; une pièce qui a son propre axe brouille
// tout. Si une telle paire passait, la machine donnerait tort à un élève qui a
// raison — et il n'aurait aucun moyen de le savoir.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import {
    MOTIFS, estSymetrique, pairesSures, pavageGenerator as G, poserLePavage
} from '../js/core/generators/pavage.js';
import { NOMS, genresEntre, imageFigure, memeFigure } from '../js/core/transformations.js';
import { caseCentrale } from '../js/core/quadrillageSvg.js';

const TIRAGES = 100;

// --- Le pavage lui-même -------------------------------------------------------

test('les pièces ne se chevauchent jamais', () => {
    for (let i = 0; i < 60; i++) {
        const pieces = poserLePavage(makeRng('p' + i), { l: 10, h: 10, cases: 4, pieces: 5 });
        if (!pieces) continue;
        const vues = new Set();
        pieces.flat().forEach(c => {
            assert.ok(!vues.has(`${c.x}|${c.y}`), 'deux pièces sur la même case');
            vues.add(`${c.x}|${c.y}`);
        });
    }
});

test('toutes les pièces tiennent dans le pavage et sont superposables', () => {
    for (let i = 0; i < 60; i++) {
        const pieces = poserLePavage(makeRng('q' + i), { l: 10, h: 10, cases: 4, pieces: 5 });
        if (!pieces) continue;
        pieces.forEach(f => {
            assert.equal(f.length, pieces[0].length, 'des pièces de tailles différentes');
            f.forEach(c => {
                assert.ok(Number.isInteger(c.x) && Number.isInteger(c.y));
                assert.ok(c.x >= 0 && c.x < 10 && c.y >= 0 && c.y < 10, 'pièce hors du pavage');
            });
        });
    }
});

test('deux pièces ne sont jamais posées au même endroit', () => {
    for (let i = 0; i < 40; i++) {
        const pieces = poserLePavage(makeRng('r' + i), { l: 10, h: 10, cases: 4, pieces: 5 });
        if (!pieces) continue;
        for (let a = 0; a < pieces.length; a++) {
            for (let b = a + 1; b < pieces.length; b++) {
                assert.ok(!memeFigure(pieces[a], pieces[b]), 'deux pièces identiques');
            }
        }
    }
});

// --- LA GARANTIE : UNE SEULE RÉPONSE ------------------------------------------

test('UNE QUESTION POSÉE N\'A JAMAIS DEUX BONNES RÉPONSES', () => {
    for (let i = 0; i < TIRAGES; i++) {
        const m = G.generate({}, { rng: makeRng('u' + i), index: i }).meta;
        const genres = genresEntre(m.pieces[m.de], m.pieces[m.vers]);
        assert.equal(genres.length, 1,
            `la pièce ${m.noms[m.de]} → ${m.noms[m.vers]} admet ${genres.length} réponses : ${genres}`);
        assert.equal(genres[0], m.genre);
    }
});

test('pairesSures écarte les paires ambiguës, pas les autres', () => {
    // Deux carrés côte à côte : translation ET symétrie axiale. Rien à en tirer.
    const carre = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }];
    const voisin = carre.map(p => ({ x: p.x + 2, y: p.y }));
    assert.ok(genresEntre(carre, voisin).length > 1, 'le cas de référence a changé');
    assert.equal(pairesSures([carre, voisin]).length, 0);

    // Un L et son image par un quart de tour : une seule lecture possible.
    const L = [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 }];
    const tourne = imageFigure(L, { genre: 'rotation', centre: { x: 6, y: 6 }, quarts: 1 });
    const sures = pairesSures([L, tourne]);
    assert.ok(sures.length >= 1, 'aucune paire retenue là où il y en a une');
    sures.forEach(s => assert.equal(genresEntre(s.de === 0 ? L : tourne, s.vers === 0 ? L : tourne).length, 1));
});

test('le réglage des transformations est respecté quand il peut l\'être', () => {
    for (const genre of ['axiale', 'centrale', 'translation', 'rotation']) {
        let obtenus = 0, total = 0;
        for (let i = 0; i < 20; i++) {
            total++;
            if (G.generate({ genres: [genre] }, { rng: makeRng(genre + i), index: i }).meta.genre === genre) obtenus++;
        }
        // On tolère le repli — mieux vaut une question hors réglage qu'un écran
        // vide — mais il doit rester marginal.
        assert.ok(obtenus >= total * 0.8,
            `${genre} : ${obtenus}/${total} seulement, le repli est trop fréquent`);
    }
});

// --- L'item -------------------------------------------------------------------

test('la bonne réponse figure parmi les propositions, et une seule fois', () => {
    for (let i = 0; i < TIRAGES; i++) {
        const it = G.generate({}, { rng: makeRng('c' + i), index: i });
        const justes = it.choices.filter(c => c.correct);
        assert.equal(justes.length, 1, 'plus d\'une proposition correcte');
        assert.equal(String(justes[0].value), String(it.answer));
        assert.equal(it.choices.length, 4);
        // Les quatre transformations, et rien d'autre : ce sont elles qu'on
        // apprend à distinguer, pas des mots inventés.
        const valeurs = new Set(it.choices.map(c => String(c.value)));
        assert.equal(valeurs.size, 4);
        Object.values(NOMS).forEach(n => assert.ok(valeurs.has(n), `${n} manque`));
    }
});

test('chaque mauvaise proposition dit POURQUOI ce n\'est pas elle', () => {
    for (let i = 0; i < 30; i++) {
        const it = G.generate({}, { rng: makeRng('w' + i), index: i });
        it.choices.filter(c => !c.correct).forEach(c => {
            assert.ok(c.why && c.why.length > 30, `« ${c.value} » sans explication`);
        });
    }
});

test('la question désigne deux pièces distinctes, par leur lettre', () => {
    for (let i = 0; i < 40; i++) {
        const it = G.generate({}, { rng: makeRng('n' + i), index: i });
        const m = it.meta;
        assert.notEqual(m.de, m.vers);
        assert.match(it.prompt.text, new RegExp(`pièce ${m.noms[m.vers]} `));
        assert.match(it.prompt.text, new RegExp(`pièce ${m.noms[m.de]} `));
        assert.equal(new Set(m.noms).size, m.noms.length, 'deux pièces portent la même lettre');
    }
});

test('la correction nomme la transformation ET la décrit', () => {
    for (let i = 0; i < 30; i++) {
        const it = G.generate({}, { rng: makeRng('e' + i), index: i });
        assert.match(it.explanation, /^C'est une /, 'tournure fautive : « C\'est rotation »');
        assert.match(it.explanation, /Précisément : /);
        // Sur la feuille, l'élève n'a pas les propositions : la correction
        // papier doit se suffire à elle-même.
        assert.match(it.explicationPapier, /est l'image de/);
    }
});

test('l\'énoncé porte le pavage dessiné, avec ses lettres', () => {
    const it = G.generate({}, { rng: makeRng('svg'), index: 0 });
    assert.match(it.prompt.html, /figure-wrap/);
    assert.match(it.prompt.html, /qd-piece/);
    assert.match(it.prompt.html, /qd-etiquette/);
    // Les deux pièces de la question sont mises en évidence : sur cinq pièces
    // éparpillées, les retrouver prendrait plus de temps que de répondre.
    assert.match(it.prompt.html, /qd-piece--source/);
    assert.match(it.prompt.html, /qd-piece--cible/);
});

test('une même graine redonne exactement la même question', () => {
    const a = G.generate({}, { rng: makeRng('idem'), index: 0 });
    const b = G.generate({}, { rng: makeRng('idem'), index: 0 });
    assert.equal(a.prompt.text, b.prompt.text);
    assert.equal(a.answer, b.answer);
});

// --- Les motifs ---------------------------------------------------------------

test('estSymetrique reconnaît une figure qui se retrouve sur elle-même', () => {
    const carre = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }];
    assert.equal(estSymetrique(carre), true);
    const L = [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 }];
    assert.equal(estSymetrique(L), false);
});

test('les motifs symétriques ne cassent rien — ils donnent juste moins de paires', () => {
    // Trois des cinq motifs ont une symétrie propre. On ne les écarte pas :
    // c'est `pairesSures` qui garantit l'unicité, pas le choix du motif.
    assert.ok(MOTIFS.some(estSymetrique), 'le jeu de motifs a changé');
    for (let i = 0; i < 40; i++) {
        const m = G.generate({}, { rng: makeRng('s' + i), index: i }).meta;
        assert.equal(genresEntre(m.pieces[m.de], m.pieces[m.vers]).length, 1);
    }
});

// --- L'étiquette --------------------------------------------------------------

test('LA LETTRE SE POSE SUR UNE CASE DE LA PIÈCE, jamais dans son creux', () => {
    // Le centre de gravité d'un L tombe en dehors de la figure : la lettre
    // serait allée s'écrire sur la pièce voisine.
    const L = [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 }];
    const c = caseCentrale(L);
    assert.ok(L.some(p => p.x === c.x && p.y === c.y), 'la lettre tombe hors de la pièce');

    for (let i = 0; i < 30; i++) {
        const m = G.generate({}, { rng: makeRng('l' + i), index: i }).meta;
        m.pieces.forEach(f => {
            const k = caseCentrale(f);
            assert.ok(f.some(p => p.x === k.x && p.y === k.y));
        });
    }
});
