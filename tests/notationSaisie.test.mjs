import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    SYMBOLES, GAUCHES, DROITES, composer, decouper, diagnostic, verifier, toutesLesEcritures
} from '../js/core/notationSaisie.js';

test('les quatre symboles se rangent par extrémité', () => {
    assert.deepEqual(GAUCHES, ['[', '(']);
    assert.deepEqual(DROITES, [']', ')']);
    assert.equal(SYMBOLES.length, 4);
    // Chacun dit ce qu'il fait : c'est ce texte qu'on affiche sous le bouton.
    SYMBOLES.forEach(s => assert.ok(s.dit && s.dit.length > 5, `${s.s} ne dit rien`));
});

test('composer et découper sont l\'aller-retour l\'un de l\'autre', () => {
    assert.equal(composer('[', 'A', 'B', ']'), '[AB]');
    assert.equal(composer('(', 'M', 'N', ')'), '(MN)');
    assert.equal(composer('[', 'R', 'S', ')'), '[RS)');
    assert.deepEqual(decouper('[AB]'), { gauche: '[', a: 'A', b: 'B', droite: ']' });
    assert.deepEqual(decouper('[RS)'), { gauche: '[', a: 'R', b: 'S', droite: ')' });
});

test('une écriture incomplète ou fantaisiste ne se devine pas', () => {
    for (const mauvais of ['', 'AB', '[AB', 'AB]', '[A]', '[ABC]', '[12]', null, undefined, '?AB?']) {
        assert.equal(decouper(mauvais), null, `« ${mauvais} » a été accepté`);
    }
    // Une composition à moitié faite s'affiche, mais ne se découpe pas.
    assert.equal(composer(null, 'A', 'B', ']'), '?AB]');
});

test('les quatre combinaisons sont formables — y compris celle qui n\'existe pas', () => {
    const toutes = toutesLesEcritures('A', 'B');
    assert.equal(toutes.length, 4);
    assert.ok(toutes.includes('[AB]'), 'le segment');
    assert.ok(toutes.includes('(AB)'), 'la droite');
    assert.ok(toutes.includes('[AB)'), 'la demi-droite');
    // Celle-ci se compose et ne veut rien dire : c'est justement pour pouvoir
    // la former, et se la voir refuser, que le composeur vaut mieux qu'un QCM.
    assert.ok(toutes.includes('(AB]'), 'l\'écriture bâtarde doit rester formable');
});

// --- Le diagnostic : la moitié juste se dit ----------------------------------

test('une écriture juste est juste, sans commentaire', () => {
    for (const bon of ['[AB]', '(AB)', '[AB)']) {
        const d = diagnostic(bon, bon);
        assert.equal(d.juste, true, bon);
        assert.equal(d.message, '', `${bon} : un message alors que tout va bien`);
        assert.ok(verifier(bon, bon));
    }
});

test('une extrémité juste sur deux est NOMMÉE, pas noyée', () => {
    // Attendu [AB) — la demi-droite. L'élève ferme les deux : le crochet de
    // gauche est bon, c'est la fin qui manque le passage.
    const d = diagnostic('[AB]', '[AB)');
    assert.equal(d.juste, false);
    assert.equal(d.gaucheJuste, true);
    assert.equal(d.droiteJuste, false);
    assert.match(d.message, /début est juste/i);
    assert.match(d.message, /parenthèse/i);
    assert.match(d.message, /\bB\b/, 'le message ne dit pas de quelle extrémité il parle');

    // L'inverse : la fin est juste, le début non.
    const e = diagnostic('(AB)', '[AB)');
    assert.equal(e.gaucheJuste, false);
    assert.equal(e.droiteJuste, true);
    assert.match(e.message, /fin est juste/i);
    assert.match(e.message, /crochet/i);
});

test('les deux extrémités fausses donnent les deux règles', () => {
    const d = diagnostic('(AB]', '[AB)');
    assert.equal(d.gaucheJuste, false);
    assert.equal(d.droiteJuste, false);
    assert.match(d.message, /crochet/);
    assert.match(d.message, /parenthèse/);
});

test('une composition inachevée le dit simplement', () => {
    const d = diagnostic('?AB]', '[AB]');
    assert.equal(d.juste, false);
    assert.match(d.message, /manque/i);
});

test('l\'écriture bâtarde est refusée', () => {
    assert.equal(verifier('(AB]', '[AB]'), false);
    assert.equal(verifier('(AB]', '(AB)'), false);
    assert.equal(verifier('(AB]', '[AB)'), false);
});

test('la demi-droite retournée est refusée — le premier point est l\'origine', () => {
    // [BA) n'est pas [AB) : c'est LE piège du chapitre, et le composeur ne
    // doit pas l'avaler sous prétexte que les symboles sont les bons.
    assert.equal(verifier('[BA)', '[AB)'), false);
});
