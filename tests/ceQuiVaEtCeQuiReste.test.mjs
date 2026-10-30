// CE QUI A ÉTÉ BIEN, ET CE QUI RESTE À RETRAVAILLER.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « est ce que dans le bilan pour l'élève à la fin de l'épreuve, tu
// pourrais en une phrase lui dire ce qui a été bien et ce qui doit être
// retravaillé ».
//
// L'APPRÉCIATION DISAIT DÉJÀ QUELQUE CHOSE, et ce n'était pas la même chose :
// « Objectif atteint. Quelques points restent à consolider. » donne le NIVEAU.
// Elle serait identique pour un élève qui tient les priorités et bute sur les
// signes et pour celui qui fait exactement l'inverse. Le bilan par compétence,
// lui, porte le détail — sous forme de quatre barres colorées qu'un élève de
// cinquième ne lit pas en sortant d'une évaluation.
//
// LA PHRASE NOMME DONC LES NOTIONS, et c'est tout ce qu'elle fait de plus.
//
// MESURÉ dans un vrai navigateur, sur un bilan à deux compétences (5 sur 5 et
// 2 sur 5) :
//   « Objectif atteint. Quelques points restent à consolider. »
//   « Priorités opératoires : c'est acquis. Règle des signes : à retravailler. »
//
// ── CE QUE CE FICHIER GARDE SURTOUT : LES REFUS ─────────────────────────────
//
// Une phrase qui parle toujours finit par ne plus rien vouloir dire, et une
// phrase qui félicite à moitié apprend à ne pas croire l'écran. Les trois
// silences comptent donc autant que les trois phrases.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ceQuiVaEtCeQuiReste } from '../js/core/grading.js';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const c = (label, taux, questions) => ({ label, taux, questions });
const dire = (...competences) => ceQuiVaEtCeQuiReste({ parCompetence: competences });

test('ELLE NOMME LES DEUX CÔTÉS — ce que Rémy a demandé, mot pour mot', () => {
    assert.equal(
        dire(c('Priorités opératoires', 1, 5), c('Règle des signes', 0.4, 5)),
        'Priorités opératoires : c\'est acquis. Règle des signes : à retravailler.');
});

test('UN SEUL CÔTÉ QUAND IL N\'Y EN A QU\'UN', () => {
    assert.equal(dire(c('Additionner des entiers', 1, 4)),
        'Additionner des entiers : c\'est acquis.');
    assert.equal(dire(c('Sudoku', 0.2, 3)), 'Sudoku : à retravailler.');
});

test('UNE QUESTION N\'EST PAS UNE PREUVE', () => {
    // Juste du premier coup par chance, ou ratée sur une étourderie : une
    // compétence vue une seule fois ne dit rien, et prononcer un verdict
    // dessus, c'est apprendre à l'élève que l'écran parle à tort et à travers.
    assert.equal(dire(c('Table de 7', 1, 1)), '');
    assert.equal(dire(c('Table de 7', 0, 1)), '');
    // Deux suffisent.
    assert.equal(dire(c('Table de 7', 1, 2)), 'Table de 7 : c\'est acquis.');
});

test('ON NE FÉLICITE PAS À MOITIÉ', () => {
    // LE REFUS LE PLUS IMPORTANT. Sur un bilan entièrement raté, nommer « le
    // moins mauvais » comme une réussite serait le genre d'encouragement qui
    // apprend à ne pas croire l'écran — et c'est exactement le défaut qu'on
    // vient de corriger sur « Sans faute ».
    const phrase = dire(c('Presque', 0.45, 6), c('Pas du tout', 0.1, 6));
    assert.ok(!phrase.includes('acquis'), `félicitation imméritée : « ${phrase} »`);
    assert.equal(phrase, 'Pas du tout et Presque : à retravailler.');
    // 79 % n'est pas acquis, 80 % l'est. Le seuil se tient.
    assert.equal(dire(c('Juste en dessous', 0.79, 10)), '');
    assert.equal(dire(c('Juste au-dessus', 0.8, 10)), 'Juste au-dessus : c\'est acquis.');
});

test('QUAND IL N\'Y A RIEN DE NET À DIRE, ELLE SE TAIT', () => {
    // Un bilan où tout est entre 50 et 80 % n'a ni réussite franche ni trou
    // franc. L'appréciation globale suffit : « En cours d'acquisition ».
    assert.equal(dire(c('Diviser (quotient exact)', 0.65, 6)), '');
    assert.equal(dire(c('A', 0.6, 4), c('B', 0.7, 4), c('C', 0.55, 4)), '');
    // Et sans compétence du tout — un jeu, une partie libre — il n'y a rien.
    assert.equal(dire(), '');
    assert.equal(ceQuiVaEtCeQuiReste({}), '');
    assert.equal(ceQuiVaEtCeQuiReste(null), '');
});

test('DEUX NOTIONS AU PLUS DE CHAQUE CÔTÉ — au-delà, ce n\'est plus une phrase', () => {
    const phrase = dire(
        c('A', 1, 4), c('B', 0.95, 4), c('C', 0.9, 4), c('D', 0.85, 4),
        c('E', 0.1, 4), c('F', 0.2, 4), c('G', 0.3, 4));
    // Les MEILLEURES d'un côté, les PIRES de l'autre : si l'on doit en nommer
    // deux, ce sont celles-là qui apprennent quelque chose.
    assert.equal(phrase, 'A et B : c\'est acquis. E et F : à retravailler.');
    assert.ok(!phrase.includes('C') && !phrase.includes('G'));
});

test('AUCUN ACCORD DE GENRE NI DE NOMBRE À DEVINER', () => {
    // Les intitulés n'ont ni genre ni nombre prévisibles : « Sudoku », « Sens
    // de la multiplication », « Diviser (quotient exact) ». Toute tournure qui
    // les accorde finit par écrire « Sudoku sont acquises ». Celle-ci place
    // la notion AVANT les deux points, et n'accorde rien.
    ['Sudoku', 'Sens de la multiplication', 'Diviser (quotient exact)',
        'Additionner des entiers', 'Hashi — les ponts'].forEach(label => {
        const p = dire(c(label, 1, 3));
        assert.equal(p, `${label} : c'est acquis.`);
        assert.ok(!/acquises|acquise\b|acquis\s+sont/.test(p), `accord deviné : « ${p} »`);
    });
});

test('UN BILAN ABÎMÉ NE FAIT PAS TOMBER L\'ÉCRAN DE FIN', () => {
    // Le bilan vient de `gradeRun`, qui le recalcule depuis le journal. Une
    // exception ici remplacerait l'écran de fin de l'élève par du vide, au
    // moment précis où il vient de finir son évaluation.
    assert.doesNotThrow(() => ceQuiVaEtCeQuiReste({ parCompetence: null }));
    assert.doesNotThrow(() => ceQuiVaEtCeQuiReste({ parCompetence: [null, undefined] }));
    assert.doesNotThrow(() => ceQuiVaEtCeQuiReste({ parCompetence: [{ taux: 1 }] }));
    assert.equal(dire({ label: '', taux: 1, questions: 9 }), '',
        'une compétence sans nom ne se nomme pas');
});

test('ELLE S\'AFFICHE SOUS L\'APPRÉCIATION, ET DISPARAÎT QUAND ELLE SE TAIT', () => {
    const UI = lire('js/ui/reportUI.js');
    // L'ORDRE COMPTE : l'une donne le niveau, l'autre l'adresse.
    const i = UI.indexOf('class="report-appreciation"');
    // L'APPEL, PAS LA DÉFINITION : `function nomsDesNotions(bilan)` est écrit
    // AU-DESSUS de `reportHtml`, et le chercher sans ses accolades de gabarit
    // trouvait la déclaration — donc un rang qui ne dit rien de l'ordre à
    // l'écran. L'épreuve tombait sur elle-même.
    const j = UI.indexOf('${nomsDesNotions(bilan)}');
    assert.ok(i > 0 && j > i, 'la phrase passe avant l\'appréciation');
    // UN PARAGRAPHE VIDE LAISSERAIT UN BLANC de deux lignes sous la note :
    // quand il n'y a rien à dire, il n'y a pas de balise.
    assert.match(UI, /return phrase \? `<p class="report-notions">\$\{escapeHtml\(phrase\)\}<\/p>` : '';/);
    // ET ELLE EST ÉCHAPPÉE : les intitulés viennent du catalogue, mais un
    // professeur peut nommer sa propre compétence un jour.
    assert.ok(UI.includes('escapeHtml(phrase)'));
});
