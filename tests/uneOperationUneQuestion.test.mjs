// UNE OPÉRATION POSÉE VAUT UNE QUESTION, PAS DEUX.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, après une séance en classe : « sur Poser une opération, les élèves ont
// fait 2 opérations (ou 3) et ont eu 5/5 ».
//
// MESURÉ, en espionnant `state.recordAttempt` pendant une partie : une seule
// opération déclarait DEUX questions — l'alignement sur la virgule, puis le
// résultat — et le meneur en retenait deux. Trois opérations en valaient donc
// six, et une étape de cinq se refermait avant la troisième. Deux opérations
// suivies du seul alignement d'une troisième suffisaient aussi : cinq.
//
// ── CE QUE GARDE CETTE ÉPREUVE ────────────────────────────────────────────
//
// Le jeu annonce deux réussites, et c'est VOULU : aligner sur la virgule est
// une vraie réussite — la moitié difficile de l'exercice — qui doit nourrir
// les statistiques et le carnet d'erreurs. Ce qu'elle ne doit pas faire, c'est
// avancer le compteur de questions.
//
// `core/BaseGame.js` dit la règle : « UNE ÉTAPE N'EST PAS UNE QUESTION […]
// c'est l'OPÉRATION qui compte, une fois finie ». `core/runner.js` l'applique
// en une ligne : `if (payload.partiel) return;`. Les deux existaient déjà ; ce
// jeu-ci n'avait jamais posé le drapeau.
//
// ── POURQUOI UNE ÉPREUVE DE SOURCE ────────────────────────────────────────
//
// Un `partiel: true` se retire sans que rien ne rougisse : l'écran est
// identique, le jeu se joue pareil, et c'est le BULLETIN qui ment — trois
// semaines plus tard, devant un parent. Aucune mesure d'affichage ne
// l'attrape.
//
// `node tools/comptesDesJeux.mjs` cherche la même forme dans les
// quatre-vingt-deux jeux du catalogue.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const SOURCE = 'js/games/poserOperation.js';
const source = readFileSync(SOURCE, 'utf8');

/**
 * La charge d'un appel à `onCorrectAnswer`, repérée par son énoncé.
 *
 * On cherche l'énoncé D'ABORD, puis on remonte à l'appel : c'est l'énoncé qui
 * distingue les deux moments, et deux appels se ressemblent trop pour qu'un
 * numéro de ligne tienne la route six mois.
 */
function chargeDeLAppel(marqueur) {
    const i = source.indexOf(marqueur);
    assert.notEqual(i, -1,
        `l'appel « ${marqueur} » a disparu de ${SOURCE} — cette épreuve ne garde plus rien.`);
    const debut = source.lastIndexOf('onCorrectAnswer', i);
    assert.notEqual(debut, -1, `« ${marqueur} » n'est plus dans un onCorrectAnswer.`);
    return source.slice(debut, source.indexOf('});', i));
}

test('L\'ALIGNEMENT EST UNE ÉTAPE, PAS UNE QUESTION', () => {
    const charge = chargeDeLAppel('questionText: `Aligner ${this.operandes');
    assert.match(charge, /partiel\s*:\s*true/,
        'aligner les nombres compte de nouveau comme une question de la série.\n'
        + 'Une opération en vaudra donc DEUX : trois opérations refermeront une\n'
        + 'étape de cinq, et le professeur lira 5/5 pour trois opérations posées.\n'
        + 'Rémy l\'a mesuré en classe : « ils ont fait 2 opérations et ont eu 5/5 ».');
});

test('LE RÉSULTAT, LUI, EST LA QUESTION', () => {
    // L'autre moitié, et celle qu'on oublie : tout marquer `partiel` ferait
    // une étape qui ne se termine JAMAIS. L'épreuve passerait au vert et
    // l'élève tournerait en rond.
    const charge = chargeDeLAppel('questionText: this.enonce()');
    assert.ok(!/partiel\s*:\s*true/.test(charge),
        'l\'opération finie ne compte plus comme une question : plus rien ne fera\n'
        + 'avancer la série, et l\'étape ne se terminera jamais.');
});

test('LE MENEUR ÉCARTE TOUJOURS LES ÉTAPES', () => {
    // Les deux épreuves ci-dessus ne valent que si le drapeau sert encore. Si
    // `runner.onAttempt` cessait de le lire, tous les `partiel` du dépôt
    // deviendraient décoratifs — et ces épreuves resteraient vertes en ne
    // gardant plus rien.
    const runner = readFileSync('js/core/runner.js', 'utf8');
    assert.match(runner, /if\s*\(payload\.partiel\)\s*return;/,
        'le meneur ne met plus les tentatives « partiel » de côté : toutes les\n'
        + 'étapes intermédiaires des jeux vont recompter comme des questions.');
});
