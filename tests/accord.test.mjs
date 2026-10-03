// LES PHRASES QUE L'INTERFACE FABRIQUE SONT EN FRANÇAIS.
//
// La même faute est apparue deux fois, à deux ans de code d'écart, et pour la
// même raison : un mot vient d'un réglage, le programme y colle un « s », et
// personne ne relit la phrase obtenue. L'en-tête d'une séance annonçait
// « 0 / 4 tableaus » ; le panneau de réglages titrait « Les barreaus
// travaillés », « Les niveaus travaillés », et — accord cette fois — « Les
// figures travaillés ».
//
// Ce sont des phrases que lisent un professeur de mathématiques et ses élèves
// de sixième. Une faute d'orthographe dans un logiciel scolaire décrédibilise
// tout le reste, et elle ne se voit dans aucun test qui compare des
// identifiants — c'est bien pour cela qu'elle a tenu si longtemps.
//
// ON NE TESTE DONC PAS LA FONCTION TOUTE SEULE : on relit les phrases de TOUS
// les exercices du catalogue, celles que Rémy a réellement sous les yeux.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { pluriel, feminin, accorde } from '../js/core/accord.js';
import { motsDeCoupe, decoupeMarches } from '../js/core/progression.js';

test('LE PLURIEL FRANÇAIS N\'EST PAS TOUJOURS UN « S »', () => {
    // Les mots qui ont produit la faute.
    assert.equal(pluriel('barreau'), 'barreaux');
    assert.equal(pluriel('niveau'), 'niveaux');
    assert.equal(pluriel('tableau'), 'tableaux');
    // Le reste de la règle.
    assert.equal(pluriel('marche'), 'marches');
    assert.equal(pluriel('figure'), 'figures');
    assert.equal(pluriel('jeu'), 'jeux');
    assert.equal(pluriel('journal'), 'journaux');
    // Invariables : on ne double pas la marque.
    assert.equal(pluriel('cas'), 'cas');
    assert.equal(pluriel('croix'), 'croix');
    assert.equal(pluriel('nez'), 'nez');
    // Les exceptions nommées.
    assert.equal(pluriel('pneu'), 'pneus');
    assert.equal(pluriel('bleu'), 'bleus');
    // Et rien du tout ne casse rien.
    assert.equal(pluriel(''), '');
    assert.equal(pluriel(null), '');
});

test('LE GENRE SE DÉCLARE, IL NE SE DEVINE PAS', () => {
    assert.equal(feminin('marche'), true);
    assert.equal(feminin('étape'), true);
    // « figure » manquait, et le Chat Géomètre titrait « Les figures
    // travaillés ».
    assert.equal(feminin('figure'), true);
    assert.equal(feminin('niveau'), false);
    assert.equal(feminin('palier'), false);
    assert.equal(accorde('travaillé', 'figure'), 'travaillées');
    assert.equal(accorde('travaillé', 'niveau'), 'travaillés');
    assert.equal(accorde('coché', 'marche', false), 'cochée');
});

test('AUCUN PANNEAU DU CATALOGUE N\'ÉCRIT DE FAUTE', async () => {
    const { exercices, paramSchemaOf } = await import('../js/data/catalog.js');
    await import('../js/core/activities/index.js');
    const fautes = [];
    // UN MOT EN -AU OU -EAU SUIVI D'UN « S » : c'est exactement la faute, et
    // elle se cherche dans la phrase rendue, pas dans le code qui la fabrique.
    const suspect = (t) => /\b\w*(?:eau|au)s\b/i.test(t)
        || /\bfigures travaillés\b/i.test(t);
    for (const e of exercices) {
        const m = (paramSchemaOf(e) || []).find(p => p.type === 'marches');
        if (!m) continue;
        const coupe = decoupeMarches(m.marches, 10, {});
        [m.label, m.aide, motsDeCoupe(coupe, m.mot),
            motsDeCoupe(decoupeMarches(m.marches, 2, {}), m.mot)]
            .filter(Boolean)
            .forEach(t => { if (suspect(t)) fautes.push(`${e.id} · ${t}`); });
    }
    assert.deepEqual(fautes, [], `phrases fautives :\n  ${fautes.join('\n  ')}`);
});

test('« CHACUN » SUIT LE MOT, PAS LA QUESTION', () => {
    const trois = (mot) => motsDeCoupe(decoupeMarches(
        ['a', 'b', 'c'].map(id => ({ id, nom: id })), 9, {}), mot);
    // La phrase parle de ce que reçoit chaque marche, donc elle s'accorde
    // avec elle. Elle annonçait « chacune » partout.
    assert.match(trois('niveau'), /3 questions chacun\./);
    assert.match(trois('marche'), /3 questions chacune\./);
    assert.match(trois('niveau'), /pour 3 niveaux/);
    assert.match(trois('barreau'), /pour 3 barreaux/);
});
