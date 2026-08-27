import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { Runner } from '../js/core/runner.js';

/**
 * Un Runner réduit à ce que `onAttempt` regarde : l'étape en cours, les
 * ensembles de comptage, la politique. On appelle la vraie méthode dessus —
 * recopier sa logique dans le test ne la vérifierait pas, il la répéterait.
 *
 * `updateProgress` et `endStep` touchent au DOM et au minuteur : on les neutre,
 * en notant si `endStep` a été programmée.
 */
function faussaireRunner(nbItems = 3) {
    const r = Object.create(Runner.prototype);
    r.step = { nbItems, stepId: 's1', exercise: { id: 'x' }, params: {} };
    r.session = null;                   // un jeu AUTONOME n'en a pas : c'est tout le sujet
    r.policy = { maxAttemptsPerItem: 2 };
    r.itemsResolved = new Set();
    r.itemsSolved = new Set();
    r.autonomousCounter = 0;
    r.etapeClose = false;
    r.currentTimeLimit = null;
    r.timerScope = 'etape';
    r.updateProgress = () => { };
    r.endStep = () => { r.finiAppelee = (r.finiAppelee || 0) + 1; };
    return r;
}

/** Une victoire de jeu autonome : ni graine d'item, ni caractère partiel. */
const victoire = () => ({ correct: true, attemptIndex: 0 });

test('UNE ÉTAPE FINIE NE COMPTE PLUS RIEN, même sans session', () => {
    // Rémy, capture à l'appui : « 3 / 3 entrepôts » en haut du Pousseur et
    // « 4 bonnes réponses sur 4 » dans le bilan. « pas très logique ».
    //
    // Les jeux autonomes enchaînent d'eux-mêmes — le Pousseur prépare
    // l'entrepôt suivant deux secondes après la victoire — alors que la
    // conclusion, elle, est différée d'une seconde et demie. Dans cet
    // entre-deux, une partie de plus se terminait et s'ajoutait au compte.
    //
    // Le garde-fou existait, mais il était posé sur `session.termine` — et une
    // session, seuls les exercices à GÉNÉRATEUR en ont. Les jeux autonomes,
    // ceux-là mêmes qui posent le problème, n'en ont aucune : la garde ne
    // gardait rien pour eux. D'où ce test, qui pose `session = null`.
    const r = faussaireRunner(3);
    for (let i = 0; i < 3; i++) Runner.prototype.onAttempt.call(r, victoire());
    assert.equal(r.itemsResolved.size, 3, 'trois entrepôts rangés, trois comptés');
    assert.equal(r.etapeClose, true, 'l\'étape doit se fermer à la question décisive');

    // La partie de trop, celle que le jeu a lancée tout seul.
    Runner.prototype.onAttempt.call(r, victoire());
    assert.equal(r.itemsResolved.size, 3, 'quatre entrepôts sur trois : le compte a débordé');
    assert.equal(r.itemsSolved.size, 3, 'le bilan annoncerait « 4 bonnes réponses sur 4 »');
});

test('la fin d\'étape ne se déclenche qu\'une fois', async () => {
    // Sans quoi le bilan s'afficherait deux fois, ou l'étape suivante
    // démarrerait pendant qu'on lit la précédente. La conclusion est différée
    // d'une seconde et demie pour laisser lire la dernière question : on
    // attend donc vraiment, c'est le seul moyen de voir combien de fois elle
    // a été programmée.
    const r = faussaireRunner(2);
    for (let i = 0; i < 5; i++) Runner.prototype.onAttempt.call(r, victoire());
    await new Promise(f => setTimeout(f, 1700));
    assert.equal(r.finiAppelee, 1, `fin d'étape programmée ${r.finiAppelee} fois`);
});

test('une partie terminée ferme l\'étape tout de suite, elle aussi', () => {
    // `partieTerminee` diffère le bilan de presque deux secondes : un jeu qui
    // enchaîne tout seul a le temps d'y glisser une partie de plus.
    const r = faussaireRunner(3);
    Runner.prototype.onAttempt.call(r, victoire());
    Runner.prototype.partieTerminee.call(r, { gagne: true });
    assert.equal(r.etapeClose, true);
    Runner.prototype.onAttempt.call(r, victoire());
    assert.equal(r.itemsResolved.size, 1, 'une partie d\'après-coup a été comptée');
});

test('une tentative PARTIELLE ne compte toujours pas comme une question', () => {
    // Un chiffre posé dans une multiplication est une tentative — elle va aux
    // statistiques et au carnet d'erreurs — mais ce n'est pas une question de
    // la série : sinon on annonçait « 6 opérations sur 6 » pour une opération
    // et demie. On vérifie que la nouvelle garde n'a rien cassé de celle-là.
    const r = faussaireRunner(3);
    for (let i = 0; i < 8; i++) {
        Runner.prototype.onAttempt.call(r, { correct: true, attemptIndex: 0, partiel: true });
    }
    assert.equal(r.itemsResolved.size, 0);
    assert.equal(r.etapeClose, false);
});

test('une question ratée jusqu\'au bout compte comme faite, pas comme réussie', () => {
    const r = faussaireRunner(2);
    // Deux essais autorisés : le second échec résout la question sans la réussir.
    Runner.prototype.onAttempt.call(r, { correct: false, attemptIndex: 0, itemSeed: 'a' });
    assert.equal(r.itemsResolved.size, 0, 'un premier échec laisse une seconde chance');
    Runner.prototype.onAttempt.call(r, { correct: false, attemptIndex: 1, itemSeed: 'a' });
    assert.equal(r.itemsResolved.size, 1);
    assert.equal(r.itemsSolved.size, 0);
});
