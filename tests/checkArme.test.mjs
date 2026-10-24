// LE ✓ ET LE ✗ DE LA BARRE DU PROFESSEUR SE COCHENT ; LE ❯ LES APPLIQUE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, d'abord :
//
//   « Dans ce qui permet de passer la question, tu as un check vert et une
//     croix. il faudrait qu'il soit persistant d'une question sur l'autre.
//     Comme cela je peux passer rapidement en voyant ce que ça fait d'être
//     bon. »
//
// J'AI LU « PERSISTANT » ET J'AI ENTENDU « AUTOMATIQUE ». La première version
// répondait toute seule, question après question. Sa précision, le lendemain :
//
//   « en fait je voulais juste que ce soit sélectionné et que quand on appuie
//     suivant, ca passe à la question suivante en ayant bon (si on a coché
//     vert) ou en ayant faux (si on a coché rouge) »
//
// Ce n'est pas la même chose : il garde la MAIN sur l'avancement — un appui
// sur ❯ par question — et dit seulement d'avance COMMENT la question sera
// comptée. Répondre tout seul lui retirait précisément ce qu'il demandait.
//
// ── CE QUE CETTE ÉPREUVE GARDE ─────────────────────────────────────────────
//
// Pas les boutons, qui se voient. Les quatre décisions qui ne se voient pas :
//
//   · cocher ne répond pas et n'avance pas ;
//   · le ❯ passe par le mécanisme qui compte VRAIMENT la question ;
//   · le choix survit au rechargement du volet ;
//   · et la dernière question reste atteignable.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sansCommentaires } from './helpers.mjs';

const R = sansCommentaires(readFileSync(new URL('../js/core/runner.js', import.meta.url), 'utf8'));
const CSS = readFileSync(new URL('../css/modules.css', import.meta.url), 'utf8');

test('LE CHOIX EST RANGÉ DANS LE NAVIGATEUR, PAS EN MÉMOIRE', () => {
    // L'Atelier RECHARGE son volet à chaque changement d'exercice : un choix
    // gardé en mémoire s'éteindrait justement au moment où l'on passe à
    // l'exercice suivant, c'est-à-dire là où « persistant » sert.
    assert.match(R, /const CLE_AUTO = 'mathbox-apercu-auto';/);
    assert.match(R, /function regimeAuto\(\)/);
    assert.match(R, /localStorage\.getItem\(CLE_AUTO\)/);
    assert.match(R, /localStorage\.removeItem\(CLE_AUTO\)/);
});

test('COCHER NE RÉPOND PAS, ET N\'AVANCE PAS', () => {
    // C'EST TOUTE LA CORRECTION DU 24 OCTOBRE, et elle tient en l'absence de
    // deux lignes : `basculerAuto` ne doit NI répondre NI faire avancer.
    const debut = R.indexOf('basculerAuto(juste)');
    const corps = R.slice(debut, R.indexOf('peindreAuto() {', debut));
    assert.match(corps, /const neuf = regimeAuto\(\) === juste \? null : juste;/);
    assert.match(corps, /armerAuto\(neuf\);/);
    assert.ok(!/repondrePour|showNext|sauterQuestion/.test(corps),
        'cocher ne doit rien déclencher : c\'est une sélection');
    // ET PLUS RIEN NE PART TOUT SEUL : la version d'avant répondait sur un
    // minuteur, ce qui retirait à Rémy le contrôle du rythme.
    assert.ok(!/repondreToutSeul/.test(R), 'la réponse automatique doit avoir disparu');
    assert.ok(!/repondrePour\s*\(/.test(R),
        'le chemin « je réponds à la place de l\'élève » n\'est plus appelé');
});

test('C\'EST LE ❯ QUI APPLIQUE CE QUI EST COCHÉ', () => {
    const debut = R.indexOf('goToQuestion(sens) {');
    const corps = R.slice(debut, debut + 900);
    assert.match(corps, /const regime = regimeAuto\(\);/);
    // ON PASSE PAR `sauterQuestion`, et c'est mesuré, pas choisi par goût :
    // par le chemin de l'élève, le vert marchait (+10 points, 1/12 → 2/12)
    // mais le rouge s'arrêtait sur une carte d'erreur à fermer, et la question
    // n'était pas comptée même une fois la carte fermée.
    assert.match(corps,
        /if \(sens > 0 && regime !== null && this\.sauterQuestion\(regime\)\) return;/);
    // RIEN COCHÉ : le ❯ garde son ancien métier, sauter sans rien enregistrer.
    assert.match(corps, /if \(sens > 0 && this\.handle\.showNext\) this\.handle\.showNext\(\);/);
});

test('LA DERNIÈRE QUESTION RESTE ATTEIGNABLE', () => {
    // Le ❯ s'éteignait sur la dernière : il ne savait que SAUTER, et il n'y a
    // rien après la dernière. Depuis qu'un régime coché lui fait COMPTER la
    // question, l'éteindre là voudrait dire que la douzième d'un exercice de
    // douze n'est jamais comptée — celle qui conclut l'étape, montre le bilan
    // et valide le palier, c'est-à-dire l'écran qu'on vient voir.
    assert.match(R,
        /nextQ\.disabled = vue >= total && !\(regimeAuto\(\) !== null && dispo\);/);
});

test('ET L\'ÉTAT COCHÉ SE VOIT', () => {
    // Un choix qui DURE doit se voir, sinon on enchaîne vingt questions sans
    // comprendre pourquoi elles sont comptées — c'est la même raison qui a
    // fait colorer le régime de saut de la palette d'auteur.
    assert.match(R, /b\.classList\.toggle\('preview-arme', arme\);/);
    assert.match(R, /b\.setAttribute\('aria-pressed', String\(arme\)\);/);
    // ET L'INFOBULLE DIT CE QUE LE ❯ FERA, pas ce que le bouton ferait.
    assert.match(R, /comptera la question/);
    assert.match(CSS, /\.game-icon-btn--ok\.preview-arme \{[^}]*background: #1f7a4d/);
    assert.match(CSS, /\.game-icon-btn--ko\.preview-arme \{[^}]*background: #b83a2c/);
    // ET LE SURVOL RESTE DANS SON MÉDIA : aucune règle de survol ne s'applique
    // sur un téléphone, et la maison le garde partout.
    const survol = /\.game-icon-btn--ok\.preview-arme:hover/.exec(CSS);
    assert.ok(survol, 'la règle de survol doit exister');
    assert.match(CSS.slice(0, survol.index).slice(-120), /@media \(hover: hover\) \{/);
});
