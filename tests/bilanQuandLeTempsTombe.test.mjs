// LE BILAN QUAND LA SONNERIE TOMBE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « y a-t-il un bilan de fin de séance quand on a fini, pour dire ce qui
// a été réussi et ce qui doit être revu ? »
//
// OUI — et il est riche : note ou taux de réussite, quatre tuiles, « Bilan par
// compétence », « À retravailler » question par question avec la réponse
// donnée et la réponse attendue, et un bouton « Rejouer ces questions ».
//
// MAIS IL NE S'AFFICHAIT PAS QUAND LE CHRONOMÈTRE TOMBAIT À ZÉRO.
//
// `leMoment.js` promettait, dans son commentaire, « il enregistre ce qui a été
// fait, PUIS AFFICHE SON BILAN ». Or il appelait `finish(true)`, et `finish`
// sortait sur `if (aborted) return;` deux lignes avant le bilan. Le commentaire
// disait l'intention, le code faisait autre chose, et personne ne voyait rien
// — l'écran se refermait, c'est tout.
//
// DEUX INTERRUPTIONS QUI NE SE RESSEMBLENT PAS, et c'est pour ça que le
// `return` avait raison la plupart du temps :
//   · l'élève FERME son exercice — il a choisi de partir, lui montrer un bilan
//     serait le retenir ;
//   · le CHRONOMÈTRE tombe — il n'a rien choisi, et c'est l'instant où il a le
//     plus besoin de savoir ce qu'il a réussi.
//
// Le journal garde `aborted: true` dans les deux cas : le parcours n'est pas
// allé au bout, et le professeur compte les séances terminées. On ne ment pas
// au journal pour faire apparaître un écran.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const R = lire('js/core/runner.js');
const M = lire('js/ui/leMoment.js');
const UI = lire('js/ui/reportUI.js');

test('LE CHRONOMÈTRE DEMANDE LE BILAN — IL NE L\'ESPÈRE PLUS', () => {
    assert.match(M, /meneur\.finish\(true, \{\s*\n\s*bilanQuandMeme:/);
    assert.match(M, /Le temps est écoulé\. Voici ce que tu as fait/);
    // Et la phrase ne le laisse pas croire qu'il a échoué : il a été arrêté.
    assert.match(M, /ce n\\'est pas une séance ratée, c\\'est une/);
});

test('ET `finish` SAIT LA DIFFÉRENCE ENTRE PARTIR ET ÊTRE ARRÊTÉ', () => {
    assert.match(R, /finish\(aborted = false, \{ bilanQuandMeme = '' \} = \{\}\) \{/);
    assert.match(R, /if \(aborted && !bilanQuandMeme\) return;/);
    assert.match(R, /enTete: bilanQuandMeme/);
});

test('LE JOURNAL, LUI, DIT TOUJOURS LA VÉRITÉ', () => {
    // `aborted` part au journal AVANT le garde : un parcours arrêté par la
    // sonnerie reste un parcours arrêté, même si l'élève en voit le bilan.
    // Mentir ici ferait compter au professeur une séance terminée qui ne
    // l'est pas.
    const bloc = R.slice(R.indexOf('journal.emit(EventTypes.RUN_FINISHED'),
        R.indexOf('if (aborted && !bilanQuandMeme) return;'));
    assert.match(bloc, /aborted,/);
});

test('CELUI QUI FERME SON EXERCICE NE VOIT TOUJOURS RIEN', () => {
    // C'est l'autre moitié : sans argument, le comportement d'avant.
    // `abort()` et les fermetures ordinaires appellent `finish(true)` tout
    // court, donc le garde les retient encore.
    const abandons = [...R.matchAll(/\.finish\(true\)/g)];
    assert.ok(abandons.length >= 1, 'les abandons ordinaires passent toujours par finish(true)');
});

test('LA PHRASE SE POSE AU-DESSUS DES CHIFFRES, ET ELLE EST ÉCHAPPÉE', () => {
    // Avant les tuiles, sinon elle explique après coup un « 3 questions,
    // 2 réussies » déjà lu comme un échec.
    assert.match(UI, /export function showRunReport\(bilan, \{ onClose, enTete = '' \} = \{\}\)/);
    assert.match(UI, /enTete \? `<p class="report-entete">\$\{escapeHtml\(enTete\)\}<\/p>` : ''\}\$\{reportHtml\(bilan\)\}/);
    assert.match(lire('css/components.css'), /\.report-entete \{/);
});

// ── CE QUI EXISTAIT DÉJÀ, ET QU'ON GARDE SOUS SURVEILLANCE ──────────────────

test('LE BILAN DIT CE QUI EST RÉUSSI ET CE QUI EST À REVOIR', () => {
    // La réponse à la question de Rémy : oui, et depuis longtemps.
    assert.match(UI, /Bilan par compétence/);
    assert.match(UI, /À retravailler/);
    assert.match(UI, /Rejouer ces questions/);
});

test('ET L\'ÉLÈVE RETROUVE TOUT CHEZ LUI', () => {
    // Le carnet d'erreurs et « À réviser » sont des projections de TOUT le
    // journal, sans filtre séance/libre : ce qu'il rate en classe l'attend à
    // la maison, et se synchronise entre ses appareils.
    assert.match(lire('js/core/state.js'), /computeErrors\(journal\.all\(\)\)/);
    assert.match(lire('index.html'), /À réviser/);
    assert.match(lire('js/core/sync.js'), /journal\.merge\(/);
});
