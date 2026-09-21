// LA NOTE COMPTE DES QUESTIONS, ET SAIT COMBIEN D'ESSAIS ELLES ONT COÛTÉ.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « comment juges-tu un exercice comme l'organigramme des quadrilatères
// en mode évaluation ? Ma question générale est : est-ce que tous les exercices
// sont vraiment évaluables ? »
//
// Sa question a fait sortir deux défauts, tous deux dans le même angle mort :
// ce qui se passe entre le jeu et le barème.
//
// PREMIER DÉFAUT — LES ESSAIS N'ÉTAIENT PAS COMPTÉS.
// La règle par défaut d'une évaluation est « juste DU PREMIER COUP », lue dans
// `attemptIndex`. MESURÉ : 79 des 80 modules qui remontent des réponses ne le
// renseignent jamais, et `state.recordAttempt` mettait 0 faute de mieux. Les
// exercices à générateur s'en tiraient — `itemSession` compte pour eux — mais
// pas les 78 activités. Même élève, mêmes réponses :
//
//     exercice à générateur   note 14/20 — premier essai : 7/10
//     jeu autonome            note 20/20 — premier essai : 10/10
//
// SECOND DÉFAUT — LE BARÈME COMPTAIT DES MORCEAUX.
// `partiel` veut dire « aux statistiques et au carnet, pas au compteur de
// questions ». `runner.js` le respectait, `grading.js` l'ignorait : l'élève
// lisait « 1 organigramme » en haut, et sa note se calculait sur les onze
// morceaux traversés — un nombre qui changeait avec ses erreurs.
//
// ET UNE CONFUSION SOUS LES DEUX : reprendre une question (deuxième essai) et
// retomber sur le même fait plus tard (autre question) se groupaient pareil,
// par énoncé. Chaque OCCURRENCE a maintenant son identité.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { gradeRun } from '../js/core/grading.js';
import { evaluationPolicy, defaultPolicy } from '../js/core/policy.js';
import { journal, EventTypes } from '../js/core/journal.js';
import { state } from '../js/core/state.js';
import { readFileSync, readdirSync } from 'node:fs';

// On capte les tentatives à la sortie de l'entonnoir. C'est LUI qu'on teste :
// écrire les tentatives à la main mesurerait ce qu'on croit, pas ce qui part.
const sorties = [];
journal.emit = (type, payload) => { if (type === EventTypes.ATTEMPT) sorties.push(payload); };

function jouer(stepId, suite) {
    sorties.length = 0;
    state.attemptContext = { runId: 'r', stepId, exerciseId: 'jeu', startedAt: Date.now() };
    suite();
    return sorties.slice();
}
const graines = (t) => new Set(t.map(p => p.itemSeed)).size;
const essais = (t) => t.map(p => p.attemptIndex).join('');

test('UN JEU AUTONOME EST NOTÉ COMME UN EXERCICE À GÉNÉRATEUR', () => {
    const t = jouer('s1', () => {
        for (let i = 1; i <= 10; i++) {
            if (i <= 3) state.recordAttempt({ correct: false, questionText: `Q${i}`, skillId: 'k' });
            state.recordAttempt({ correct: true, questionText: `Q${i}`, skillId: 'k' });
        }
    });
    const b = gradeRun({ attempts: t, policy: evaluationPolicy() }, evaluationPolicy());
    assert.equal(t.length, 13);
    assert.equal(b.totalQuestions, 10, 'treize tentatives, dix questions');
    assert.equal(b.premierEssai, 7, 'trois ont coûté un second essai');
    assert.equal(b.note, 14, 'et non 20 — c\'est tout le défaut');
});

test('REPRENDRE UNE QUESTION N\'EST PAS EN RETROUVER UNE AUTRE', () => {
    // LA CONFUSION QUI ÉTAIT À LA RACINE. « 7 × 8 » qui revient à la troisième
    // minute d'une partie est une nouvelle question ; « 9 × 7 » repris
    // aussitôt après une erreur est le même.
    const tard = jouer('s2', () => {
        state.recordAttempt({ correct: true, questionText: '7 × 8' });
        state.recordAttempt({ correct: true, questionText: '6 × 9' });
        state.recordAttempt({ correct: true, questionText: '7 × 8' });
    });
    assert.equal(graines(tard), 3, 'trois bonnes réponses, trois questions');
    assert.equal(essais(tard), '000');

    const aussitot = jouer('s2', () => {
        state.recordAttempt({ correct: false, questionText: '9 × 7' });
        state.recordAttempt({ correct: true, questionText: '9 × 7' });
    });
    assert.equal(graines(aussitot), 1, 'une question, deux essais');
    assert.equal(essais(aussitot), '01');
});

test('LA MÊME QUESTION À DEUX ÉTAPES FAIT DEUX QUESTIONS', () => {
    // `grading.js` groupe sur la SEULE graine, sans regarder l'étape : deux
    // étapes du même jeu se seraient fondues en une.
    sorties.length = 0;
    state.attemptContext = { runId: 'r', stepId: 'etapeA', startedAt: Date.now() };
    state.recordAttempt({ correct: true, questionText: '5 × 5' });
    state.attemptContext = { runId: 'r', stepId: 'etapeB', startedAt: Date.now() };
    state.recordAttempt({ correct: true, questionText: '5 × 5' });
    assert.equal(graines(sorties), 2);
});

test('ON NE TOUCHE À RIEN QUAND L\'APPELANT SAIT DÉJÀ', () => {
    // `itemSession` donne sa graine et compte ses essais, et il a raison :
    // lui seul sait qu'une question est posée deux fois de suite exprès.
    const t = jouer('s4', () => {
        state.recordAttempt({ correct: false, itemSeed: 'g1', attemptIndex: 0, questionText: 'x' });
        state.recordAttempt({ correct: true, itemSeed: 'g1', attemptIndex: 1, questionText: 'x' });
    });
    assert.deepEqual(t.map(p => `${p.itemSeed}/${p.attemptIndex}`), ['g1/0', 'g1/1']);
});

test('UN JEU SANS ÉNONCÉ COMPTE QUAND MÊME SES BONNES RÉPONSES', () => {
    // Tetris annonce ses réussites sans texte de question. Chaque bonne
    // réponse doit rester une question — sinon le compteur du haut se fige.
    const t = jouer('s5', () => {
        for (let i = 0; i < 5; i++) state.recordAttempt({ correct: true });
    });
    assert.equal(graines(t), 5);
});

test('LES MORCEAUX NE FONT PAS LA NOTE, MAIS FONT LE CARNET', () => {
    // L'organigramme des quadrilatères : onze morceaux marqués `partiel`, puis
    // une seule vraie question — celle que le compteur affiche.
    const t = jouer('s6', () => {
        state.recordAttempt({ correct: true, partiel: true, skillId: 'geo.quadri', questionText: 'coder le carré' });
        state.recordAttempt({ correct: false, partiel: true, skillId: 'geo.quadri', questionText: 'coder le losange' });
        state.recordAttempt({ correct: true, partiel: true, skillId: 'geo.quadri', questionText: 'coder le losange' });
        state.recordAttempt({ correct: true, skillId: 'geo.quadri', questionText: 'organigramme complet' });
    });
    const b = gradeRun({ attempts: t, policy: evaluationPolicy() }, evaluationPolicy());
    assert.equal(b.totalQuestions, 1, 'une question, comme le compteur l\'annonce');
    // Les compétences, elles, ont vu les TROIS morceaux — le losange raté puis
    // repris n'en fait qu'un, puisque c'est le même morceau. C'est ce que
    // `partiel` promet depuis le début : « aux statistiques et au carnet ».
    assert.equal(b.parCompetence[0].questions, 3);
    assert.equal(b.parCompetence[0].reussies, 3, 'tous finis, mais pas tous du premier coup');
    // Et le carnet garde le codage raté, qui est justement ce qu'on veut lire.
    assert.ok(b.aRetravailler.some(x => x.questionText === 'coder le losange'),
        'le morceau raté doit rester au carnet d\'erreurs');
});

test('UNE QUESTION N\'EST UN MORCEAU QUE SI TOUTES SES TENTATIVES LE SONT', () => {
    // La multiplication posée : les chiffres sont des morceaux, l'opération
    // finie est la question. Si les deux portaient la même clef, une seule
    // tentative non partielle doit suffire à en faire une question.
    const t = jouer('s7', () => {
        state.recordAttempt({ correct: false, partiel: true, questionText: '24 × 13' });
        state.recordAttempt({ correct: true, questionText: '24 × 13' });
    });
    const b = gradeRun({ attempts: t, policy: evaluationPolicy() }, evaluationPolicy());
    assert.equal(b.totalQuestions, 1);
    assert.equal(b.premierEssai, 0, 'le chiffre raté a bien coûté un essai');
});

test('LE DÉFAUT NE PEUT PLUS REVENIR PAR LA PORTE D\'OÙ IL EST SORTI', () => {
    // Il tenait en un `|| 0` : la ligne qui inventait « premier essai » pour
    // tout le monde. Et en un filtre manquant dans le barème.
    const st = readFileSync(new URL('../js/core/state.js', import.meta.url), 'utf8');
    assert.ok(!/attemptIndex: a\.attemptIndex \|\| 0,/.test(st),
        'l\'entonnoir ne doit plus inventer le numéro d\'essai');
    assert.match(st, /const identite = identifierLaQuestion\(a, ctx\);/);
    const gr = readFileSync(new URL('../js/core/grading.js', import.meta.url), 'utf8');
    assert.match(gr, /const itemList = tousLesItems\.filter\(it => !it\.partiel\);/);
});

test('COMBIEN DE MODULES COMPTENT ENCORE LEURS ESSAIS EUX-MÊMES', () => {
    // Ce test ne défend pas un chiffre, il défend une RAISON : si un jour
    // beaucoup de jeux se mettent à renseigner `attemptIndex`, c'est qu'on a
    // recommencé à le faire à la main dans chaque module — et l'entonnoir
    // n'aura plus rien à corriger, ce qui n'est pas ce qu'on veut.
    const dossiers = ['js/games/', 'js/core/activities/'];
    let comptent = 0, total = 0;
    for (const d of dossiers) {
        const dossier = new URL('../' + d, import.meta.url);
        for (const f of readdirSync(dossier).filter(x => x.endsWith('.js'))) {
            const s = readFileSync(new URL(f, dossier), 'utf8');
            if (!/onCorrectAnswer\(|onWrongAnswer\(|recordAttempt\(/.test(s)) continue;
            total++;
            if (/attemptIndex\s*:/.test(s)) comptent++;
        }
    }
    assert.ok(total > 70, `${total} modules remontent des réponses`);
    assert.ok(comptent <= 3,
        `${comptent} modules comptent leurs essais à la main — l'entonnoir est là pour ça`);
});

test('LE RÉGIME D\'ENTRAÎNEMENT N\'EST PAS TOUCHÉ', () => {
    // En entraînement, la règle n'est pas « du premier coup » : une question
    // reprise reste acquise. Un élève qui se trompe puis se reprend doit y
    // garder tous ses points — c'est le sens du mot entraînement.
    const t = jouer('s8', () => {
        state.recordAttempt({ correct: false, questionText: 'A' });
        state.recordAttempt({ correct: true, questionText: 'A' });
        state.recordAttempt({ correct: true, questionText: 'B' });
    });
    const p = { ...defaultPolicy(), grading: { scale: 20, rule: 'ratio', arrondi: 0.5 } };
    const b = gradeRun({ attempts: t, policy: p }, p);
    assert.equal(b.totalQuestions, 2);
    assert.equal(b.note, 20, 'résolue = acquise, quel que soit le nombre d\'essais');
});

test('DANS UN JEU D\'ARCADE, « ESSAIS AUTORISÉS » FIXE LE PRIX D\'UNE ERREUR', () => {
    // RÉMY : « non non on garde les jeux d'arcade tel quel. » Les quinze jeux
    // d'arcade ne reposent jamais la question ratée — la météorite explose, on
    // passe à la suivante —, et c'est voulu : leur tension vient de là.
    //
    // Ce test existe pour qu'on ne « corrige » pas cette décision par
    // distraction, en croyant réparer un réglage sans effet. Il en a un, et
    // MESURÉ au navigateur sur une étape de Tetris, après une question ratée :
    //     essais = 1 → 1 question comptée, 0 juste    (l'erreur coûte la question)
    //     essais = 2 → 0 question comptée             (l'erreur ne coûte rien)
    // Le réglage commande le PRIX de l'erreur, pas le droit de la refaire.
    const base = readFileSync(new URL('../js/core/BaseGame.js', import.meta.url), 'utf8');
    assert.match(base, /PAS DE REPRISE DANS LES JEUX D'ARCADE — RÉMY A TRANCHÉ/);
    // Et ce qui produit ce prix : la ligne du moteur qui clôt une question dès
    // que les essais sont épuisés.
    const run = readFileSync(new URL('../js/core/runner.js', import.meta.url), 'utf8');
    assert.match(run, /const resolved = payload\.correct \|\| \(payload\.attemptIndex \+ 1\) >= maxTries;/);
});
