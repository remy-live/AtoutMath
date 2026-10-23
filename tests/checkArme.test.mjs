// LE ✓ ET LE ✗ DE LA BARRE DU PROFESSEUR RESTENT ARMÉS.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY :
//
//   « Dans ce qui permet de passer la question, tu as un check vert et une
//     croix. il faudrait qu'il soit persistant d'une question sur l'autre.
//     Comme cela je peux passer rapidement en voyant ce que ça fait d'être
//     bon. »
//
// UN CLIC RÉPONDAIT, PUIS RENDAIT LA MAIN. Pour voir douze bonnes réponses
// d'affilée — c'est-à-dire ce que l'élève verra —, il fallait douze clics, et
// l'on regarde son doigt au lieu de l'écran.
//
// ── CE QUE CETTE ÉPREUVE GARDE ─────────────────────────────────────────────
//
// Pas le bouton, qui se voit. Les trois décisions qu'on ne voit pas et qui
// font tomber l'outil en silence :
//
//   · le régime survit au rechargement du volet ;
//   · répondre ENCHAÎNE, sinon rien n'avance ;
//   · et le verrou de rang, sans lequel la même question serait répondue
//     douze fois et le profil enregistrerait des tentatives imaginaires.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sansCommentaires } from './helpers.mjs';

const R = sansCommentaires(readFileSync(new URL('../js/core/runner.js', import.meta.url), 'utf8'));
const CSS = readFileSync(new URL('../css/modules.css', import.meta.url), 'utf8');

test('LE RÉGIME EST RANGÉ DANS LE NAVIGATEUR, PAS EN MÉMOIRE', () => {
    // L'Atelier RECHARGE son volet à chaque changement d'exercice : un régime
    // gardé en mémoire s'éteindrait justement au moment où l'on passe à
    // l'exercice suivant, c'est-à-dire là où « persistant » sert.
    assert.match(R, /const CLE_AUTO = 'mathbox-apercu-auto';/);
    assert.match(R, /function regimeAuto\(\)/);
    assert.match(R, /localStorage\.getItem\(CLE_AUTO\)/);
    assert.match(R, /localStorage\.removeItem\(CLE_AUTO\)/);
});

test('UN CLIC ARME ET RÉPOND, LE SECOND ARRÊTE', () => {
    const corps = R.slice(R.indexOf('basculerAuto(juste)'), R.indexOf('peindreAuto() {'));
    assert.match(corps, /const neuf = regimeAuto\(\) === juste \? null : juste;/);
    // DÉSARMER NE RÉPOND PAS : si le second clic répondait encore, on ne
    // pourrait jamais s'arrêter sur une question.
    assert.match(corps, /if \(neuf !== null\) this\.repondrePour\(juste, \{ enchainer: true \}\);/);
});

test('RÉPONDRE ENCHAÎNE, SINON RIEN N\'AVANCE', () => {
    // LE DÉFAUT MESURÉ AVANT D'ÉCRIRE UNE LIGNE DE PLUS : le compteur restait
    // sur 1/12 neuf secondes après un clic sur le ✓ armé. `repondrePour`
    // appelle `session.submit` directement, sans passer par le clic de
    // l'élève : l'activité ne l'apprend jamais, et c'est ELLE qui enchaîne.
    const corps = R.slice(R.indexOf('repondrePour(juste, options = {})'),
        R.indexOf('goToStep(index) {'));
    assert.match(corps, /if \(options\.enchainer && result && result\.dismissed\)/);
    assert.match(corps, /this\.handle\.showNext\(\)/);
    // ON ATTEND LA FERMETURE DU RETOUR, PAS UN MINUTEUR : c'est le contrat de
    // `announce` — une réussite s'efface seule, une erreur attend qu'on la
    // ferme. Le ✗ s'arrête donc sur le message d'erreur, et c'est voulu :
    // c'est lui qu'on vient lire.
    assert.ok(!/setTimeout\([^)]*showNext/.test(corps),
        'l\'enchaînement ne doit pas dépendre d\'un minuteur');
});

test('LE RANG SERT DE VERROU — une question n\'est répondue qu\'une fois', () => {
    // `updateStepNavigation` est appelée une douzaine de fois par question —
    // après chaque soumission, chaque rendu, chaque changement d'étape. Sans
    // verrou, la même question partirait douze fois au journal, et le profil
    // de l'élève enregistrerait des tentatives qui n'ont pas eu lieu.
    const corps = R.slice(R.indexOf('repondreToutSeul(dispo)'),
        R.indexOf('setupStepNavigation() {'));
    assert.match(corps, /if \(this\.__autoRang === rang\) return;/);
    assert.match(corps, /this\.__autoRang = rang;/);
    // ET LE RANG PORTE L'ÉTAPE : deux étapes d'un même parcours repassent par
    // la question n° 1, et un rang nu les confondrait.
    assert.match(corps, /\$\{this\.index\}:\$\{this\.session\.history\.length\}/);
    // ON RELIT LE RÉGIME APRÈS L'ATTENTE : une demi-seconde suffit à cliquer
    // « arrêter », et répondre quand même serait une réponse qu'on a refusée.
    assert.match(corps, /if \(regimeAuto\(\) === null\) return;/);
});

test('ET L\'ÉTAT ARMÉ SE VOIT', () => {
    // Un régime qui DURE doit se voir, sinon on enchaîne vingt questions sans
    // comprendre pourquoi elles se répondent — c'est la même raison qui a fait
    // colorer le régime de saut de la palette d'auteur.
    assert.match(R, /b\.classList\.toggle\('preview-arme', arme\);/);
    assert.match(R, /b\.setAttribute\('aria-pressed', String\(arme\)\);/);
    assert.match(CSS, /\.game-icon-btn--ok\.preview-arme \{[^}]*background: #1f7a4d/);
    assert.match(CSS, /\.game-icon-btn--ko\.preview-arme \{[^}]*background: #b83a2c/);
    // ET LE SURVOL RESTE DANS SON MÉDIA : aucune règle de survol ne s'applique
    // sur un téléphone, et la maison le garde partout.
    const survol = /\.game-icon-btn--ok\.preview-arme:hover/.exec(CSS);
    assert.ok(survol, 'la règle de survol doit exister');
    const avant = CSS.slice(0, survol.index);
    assert.match(avant.slice(-120), /@media \(hover: hover\) \{/);
});
