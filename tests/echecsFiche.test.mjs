import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import {
    echecsFicheGenerator as G, nomCaseEchecs, caseDepuisNom, direPiece, PIECES
} from '../js/core/generators/echecsFiche.js';

test('une case se nomme comme un point : la lettre, puis le chiffre', () => {
    // Le coin en bas à gauche est a1 ; la ligne 8 est tout en haut (y = 0).
    assert.equal(nomCaseEchecs(0, 7), 'a1');
    assert.equal(nomCaseEchecs(7, 0), 'h8');
    assert.equal(nomCaseEchecs(4, 4), 'e4');
    for (let x = 0; x < 8; x++) {
        for (let y = 0; y < 8; y++) {
            assert.deepEqual(caseDepuisNom(nomCaseEchecs(x, y)), { x, y });
        }
    }
});

test('le genre suit la pièce, pas la couleur', () => {
    assert.equal(direPiece('R', true), 'la tour noire');
    assert.equal(direPiece('R', false), 'la tour blanche');
    assert.equal(direPiece('N', true), 'le cavalier noir');
    assert.equal(direPiece('Q', false), 'la dame blanche');
});

test('les pièces posées sont sur des cases distinctes et de types distincts', () => {
    for (let i = 0; i < 200; i++) {
        const m = G.generate({ quoi: 'nommer', pieces: 5 }, { rng: makeRng('er' + i) }).meta;
        const cases = m.posees.map(p => p.case);
        assert.equal(new Set(cases).size, cases.length, `deux pièces sur ${cases}`);
        // Les cinq types sont différents : sans cela, deux lignes de réponse
        // « C (noir) : …… » désigneraient la même chose et la correction
        // deviendrait impossible.
        const types = m.posees.map(p => p.type);
        assert.equal(new Set(types).size, types.length, `deux fois le même type : ${types}`);
        m.posees.forEach(p => {
            assert.deepEqual(caseDepuisNom(p.case), { x: p.x, y: p.y });
            assert.equal(p.lettre, PIECES[p.type].lettre);
            // Un pion ne peut pas être sur la première ni la dernière rangée.
            if (p.type === 'P') assert.ok(p.y !== 0 && p.y !== 7, `pion en ${p.case}`);
        });
    }
});

test('les cases atteignables sont celles du moteur, obstacles compris', async () => {
    const { fenVersEtat, coups } = await import('../js/core/echecs.js');
    for (let i = 0; i < 150; i++) {
        const m = G.generate({ quoi: 'deplacements' }, { rng: makeRng('ed' + i) }).meta;
        if (m.quoi !== 'deplacements') continue;          // le filet de secours
        assert.ok(m.cibles.length >= 4 && m.cibles.length <= 16,
            `${m.nom} : ${m.cibles.length} cases`);
        // Aucune case atteignable n'est occupée par la pièce elle-même, et
        // toutes tiennent sur l'échiquier.
        m.cibles.forEach(c => {
            assert.ok(c.x >= 0 && c.x < 8 && c.y >= 0 && c.y < 8);
            assert.notEqual(nomCaseEchecs(c.x, c.y), m.depart);
        });
        assert.deepEqual(m.noms, m.cibles.map(c => nomCaseEchecs(c.x, c.y)).sort());
        // Les obstacles sont noirs : on peut les prendre, pas les traverser.
        m.posees.slice(1).forEach(p => assert.equal(p.noir, true));
    }
});

test('le cavalier saute en L, la tour en ligne, le fou en diagonale', () => {
    for (let i = 0; i < 200; i++) {
        const m = G.generate({ quoi: 'deplacements' }, { rng: makeRng('eg' + i) }).meta;
        if (m.quoi !== 'deplacements') continue;
        const d = caseDepuisNom(m.depart);
        m.cibles.forEach(c => {
            const dx = Math.abs(c.x - d.x), dy = Math.abs(c.y - d.y);
            if (m.type === 'N') assert.ok((dx === 1 && dy === 2) || (dx === 2 && dy === 1),
                `cavalier de ${m.depart} vers ${nomCaseEchecs(c.x, c.y)}`);
            if (m.type === 'R') assert.ok(dx === 0 || dy === 0,
                `tour de ${m.depart} vers ${nomCaseEchecs(c.x, c.y)}`);
            if (m.type === 'B') assert.equal(dx, dy,
                `fou de ${m.depart} vers ${nomCaseEchecs(c.x, c.y)}`);
        });
    }
});

test('« mélange » sert bien les trois exercices', () => {
    const vus = new Set();
    for (let i = 0; i < 150; i++) vus.add(G.generate({}, { rng: makeRng('em' + i) }).meta.quoi);
    assert.deepEqual([...vus].sort(), ['deplacements', 'nommer', 'placer']);
});
