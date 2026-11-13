// L'EXERCICE RÉCOMPENSE SE PRÉSENTE, ET DIT QU'ON PEUT LE LAISSER.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 13 novembre : « j'aimerai aussi quand il y a un exercice récompense
// qu'on ait une popup qui explique que c'est un exercice récompense et qu'il
// est facultatif et qu'on peut passer au suivant sans le réussir ».
//
// TROIS CHOSES À DIRE, ET LA TROISIÈME EST LA VRAIE. Qu'il s'agisse d'une
// récompense se devine au cadeau posé sur la carte. Qu'elle soit facultative se
// devine à peine. Mais QU'ON PUISSE PASSER SANS LA RÉUSSIR ne se devine pas du
// tout — et c'est elle qui compte : un élève qui bloque sur un jeu bonus et
// croit qu'il barre la route s'arrête là, ce qui est exactement le contraire de
// ce qu'une récompense est censée faire.
//
// ── ET LA PORTE DOIT EXISTER ──────────────────────────────────────────────
//
// Une fenêtre qui annonce qu'on peut partir, sur une étape d'où l'on ne peut
// pas partir, est pire que pas de fenêtre : l'élève a lu qu'il pouvait, il
// cherche, il ne trouve rien, et il en conclut que le logiciel lui a menti.
// Le bouton « Passer » s'ouvre donc de lui-même sur une récompense, sans que le
// professeur ait rien à accorder.
//
// ── CE QUE CETTE ÉPREUVE NE PEUT PAS DIRE ─────────────────────────────────
//
// Que la fenêtre s'AFFICHE. Cela demande un meneur, un jeu monté et un écran :
// c'est `tools/laRecompenseSePresente.mjs` qui le mesure, et qui vérifie aussi
// qu'elle ne s'ouvre PAS sur un exercice ordinaire — une fenêtre qui s'ouvre
// partout n'annonce plus rien.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import './helpers.mjs';

import { estRecompense, prochaineObligatoire } from '../js/core/recompenses.js';
import { makeStep } from '../js/core/path.js';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const RUNNER = lire('js/core/runner.js');

test('LA FENÊTRE DIT LES TROIS CHOSES, ET LA TROISIÈME EN TOUTES LETTRES', () => {
    const i = RUNNER.indexOf('montrerLaRecompense(step) {');
    assert.notEqual(i, -1, 'la fenêtre a disparu');
    const corps = RUNNER.slice(i, RUNNER.indexOf('\n    }', i));
    assert.match(corps, /récompense/i, 'elle doit dire que c’est une récompense');
    assert.match(corps, /n’es pas obligé|pas obligé/i, 'et qu’elle est facultative');
    assert.match(corps, /passer au suivant/i,
        'et surtout qu’on peut PASSER AU SUIVANT — c’est la phrase qui compte, et '
        + 'c’est celle qui ne se devine pas');
});

test('ELLE NE S’OUVRE QUE SUR UNE RÉCOMPENSE', () => {
    // Une fenêtre qui s'ouvre sur chaque étape n'annonce plus rien : au
    // troisième exercice, l'élève la ferme sans la lire.
    assert.match(RUNNER, /if \(estRecompense\(step\)\) this\.montrerLaRecompense\(step\);/,
        'l’ouverture doit être gardée par `estRecompense`');
    assert.match(RUNNER, /estRecompense\s*\n?\s*\} from '\.\/recompenses\.js'|estRecompense[,\s]/,
        'et `estRecompense` doit venir de là où la règle est écrite');
});

test('ET ELLE NE REVIENT PAS SUR LA MÊME ÉTAPE', () => {
    // Un élève qui refait l'étape — le bouton « Recommencer », une navigation
    // arrière — reverrait la même fenêtre à chaque fois. Une fenêtre déjà lue
    // est une fenêtre qu'on ferme sans la lire, et c'est ainsi qu'on apprend à
    // fermer toutes les autres.
    const i = RUNNER.indexOf('montrerLaRecompense(step) {');
    const corps = RUNNER.slice(i, RUNNER.indexOf('\n    }', i));
    assert.match(corps, /_recompensesDites/, 'la fenêtre doit retenir ce qu’elle a déjà présenté');
    assert.match(corps, /if \(id && this\._recompensesDites\.has\(id\)\) return;/,
        'et sortir sans rien faire la deuxième fois');
});

test('LE BOUTON « PASSER » S’OUVRE SUR UNE RÉCOMPENSE, SANS RIEN DEMANDER', () => {
    // C'EST LA MOITIÉ QUI COMPTE. Les deux autres portes du bouton sont des
    // décisions du professeur — il accorde le saut à un élève qui bute, ou il
    // retire l'exercice. Celle-ci est dans la NATURE de l'étape.
    const i = RUNNER.indexOf('majBoutonPasser(step, annoncer = false) {');
    assert.notEqual(i, -1, 'le bouton « Passer » a disparu');
    const corps = RUNNER.slice(i, i + 3000);
    assert.match(corps, /const estUnCadeau = estRecompense\(step\);/,
        'la nature de l’étape doit être lue');
    assert.match(corps, /peutSauter\(exoId\) \|\| retireMaintenant \|\| estUnCadeau/,
        'et elle doit ouvrir le bouton : une promesse sans porte est un mensonge '
        + 'que l’élève découvre tout seul, en cherchant');
});

test('ET CE N’EST PAS UNE INVENTION : UNE RÉCOMPENSE NE BARRE DÉJÀ LA ROUTE DE PERSONNE', () => {
    // La fenêtre ne crée pas une permission, elle DIT une règle qui existait.
    // `prochaineObligatoire` saute déjà les récompenses quand il compte ce qui
    // reste à faire — le bouton ne faisait que ne pas le dire.
    const travail = makeStep('calc-add', {}, { stepId: 't1' });
    const cadeau = makeStep('calc-add', {}, { stepId: 'c1' });
    cadeau.bonus = true;
    const fin = makeStep('calc-add', {}, { stepId: 't2' });
    assert.equal(estRecompense(cadeau), true);
    assert.equal(estRecompense(travail), false);
    // Travail fait, récompense NON faite : la prochaine obligatoire est la
    // dernière étape de travail, pas le cadeau.
    assert.equal(
        prochaineObligatoire([travail, cadeau, fin], new Set(['t1'])), 2,
        'une récompense non faite ne doit pas être « la prochaine à faire »');
    // Et tout le travail fait : le parcours est fini, cadeau ou pas.
    assert.equal(
        prochaineObligatoire([travail, cadeau, fin], new Set(['t1', 't2'])), -1,
        'un parcours dont tout le TRAVAIL est fait est fini, même si le cadeau ne '
        + 'l’est pas — c’est ce que la fenêtre annonce à l’élève');
});
