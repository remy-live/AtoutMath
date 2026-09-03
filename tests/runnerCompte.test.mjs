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

// --- LE SAUT D'AUTEUR SUR UN EXERCICE À ÉTAPES ---------------------------------
//
// Rémy : « j'aimerais qu'avec le "suivant" de la barre de debug on passe à
// l'étape suivante — par exemple pour l'organigramme, on doit coder le
// parallélogramme ; si j'appuie sur suivant avec le check validé, eh bien ça
// passe à la suite. »
//
// Le saut a trois régimes : neutre (rien n'est enregistré), compté juste,
// compté faux. Seul le neutre consultait `sauterEtape` ; les deux autres
// appelaient `showNext()`, qui pour ces jeux-là relance l'exercice ENTIER
// depuis sa première étape. Mesuré au navigateur sur l'organigramme, quatre
// appuis : en neutre on montait de l'étape 1 à l'étape 5 ; avec le ✓ ou le ✗
// on restait sur l'étape 1, et au quatrième appui l'exercice s'achevait sur
// « 3 bonnes réponses sur 3 ».

/** Un runner de saut : la poignée d'un jeu qui mène ses propres étapes. */
function faussaireSaut(avecEtapes, restantes = 3) {
    const r = faussaireRunner(3);
    r.journal = [];
    r.etapesFranchies = 0;
    r.showNextAppele = 0;
    r.handle = {
        showNext: () => { r.showNextAppele++; },
        ...(avecEtapes ? {
            sauterEtape: () => {
                if (r.etapesFranchies >= restantes) return false;
                r.etapesFranchies++;
                return true;
            }
        } : {})
    };
    r.updateStepNavigation = () => { };
    return r;
}

test('LE SAUT COMPTÉ JUSTE AVANCE D\'UNE ÉTAPE, comme le saut neutre', async () => {
    const { state } = await import('../js/core/state.js');
    const vues = [];
    const vrai = state.recordAttempt;
    state.recordAttempt = (a) => { vues.push(a); return a; };
    try {
        const r = faussaireSaut(true, 5);
        for (let i = 0; i < 3; i++) Runner.prototype.sauterQuestion.call(r, true);
        assert.equal(r.etapesFranchies, 3, 'trois étapes franchies');
        assert.equal(r.showNextAppele, 0, 'on ne relance PAS l\'exercice entier');
        // UNE ÉTAPE N'EST PAS UNE QUESTION : la tentative part au journal — c'est
        // ce que le régime promet — mais marquée `partiel`, sinon le meneur
        // arrêterait l'exercice à la troisième étape sur onze.
        assert.equal(vues.length, 3);
        vues.forEach(a => {
            assert.equal(a.correct, true);
            assert.equal(a.partiel, true, 'une étape comptée comme une question');
        });
    } finally { state.recordAttempt = vrai; }
});

test('sans étape à franchir, le saut compté reste une QUESTION', async () => {
    const { state } = await import('../js/core/state.js');
    const vues = [];
    const vrai = state.recordAttempt;
    state.recordAttempt = (a) => { vues.push(a); return a; };
    try {
        // Un exercice ordinaire : aucune poignée `sauterEtape`.
        const r = faussaireSaut(false);
        Runner.prototype.sauterQuestion.call(r, true);
        assert.equal(r.showNextAppele, 1, 'on passe bien à la question suivante');
        assert.equal(vues[0].partiel, false, 'et elle compte comme une question');
        // Et un jeu à étapes qui n'en a plus retombe sur le même chemin.
        const r2 = faussaireSaut(true, 0);
        Runner.prototype.sauterQuestion.call(r2, false);
        assert.equal(r2.showNextAppele, 1);
        assert.equal(vues[1].partiel, false);
        assert.equal(vues[1].correct, false);
    } finally { state.recordAttempt = vrai; }
});

// --- LA LIGNE DES ÉTAPES -------------------------------------------------------
//
// Rémy : « c'est où l'exercice sur "un parallélogramme qui a deux côtés
// consécutifs perpendiculaires est un…" ? Où je l'ai loupé quelque part ? On
// pourrait avoir dans la barre de debug un bouton qui fait apparaître une ligne
// sur les étapes. »

/** Un jeu à étapes de pacotille : il sait où il en est, avancer et reculer. */
function faussaireJeu(nEtapes) {
    const jeu = { ou: 0 };
    const r = faussaireRunner(3);
    r.updateStepNavigation = () => { };
    r.handle = {
        planEtapes: () => ({
            courante: jeu.ou,
            liste: Array.from({ length: nEtapes }, (_, i) => `Étape ${i + 1}`)
        }),
        // Elles REMPLISSENT et VIDENT : c'est pour cela qu'on passe par elles
        // plutôt que de poser le jeu directement sur l'étape voulue.
        sauterEtape: () => (jeu.ou < nEtapes - 1 ? (jeu.ou++, true) : false),
        revenirEtape: () => (jeu.ou > 0 ? (jeu.ou--, true) : false)
    };
    return { r, jeu };
}

test('LE PLAN DIT CE QUE L\'EXERCICE CONTIENT, et où l\'on en est', () => {
    const { r } = faussaireJeu(11);
    const p = Runner.prototype.planEtapes.call(r);
    assert.equal(p.liste.length, 11);
    assert.equal(p.courante, 0);
    // Un exercice ordinaire n'en a pas : on rend `null` plutôt qu'une liste
    // vide, pour que la palette puisse le DIRE au lieu d'ouvrir un cadre blanc.
    const nu = faussaireRunner(3);
    nu.handle = { showNext: () => { } };
    assert.equal(Runner.prototype.planEtapes.call(nu), null);
});

test('ON VA À UNE ÉTAPE PAR LES DEUX CHEMINS ÉPROUVÉS, dans les deux sens', () => {
    const { r, jeu } = faussaireJeu(11);
    assert.equal(Runner.prototype.allerAEtape.call(r, 3), true);
    assert.equal(jeu.ou, 3, 'quatre étapes plus loin, remplies une par une');
    assert.equal(Runner.prototype.allerAEtape.call(r, 1), true);
    assert.equal(jeu.ou, 1, 'et l\'on revient en les vidant');
    // Rester où l'on est ne « bouge » pas — le bouton ne doit pas prétendre
    // avoir fait quelque chose.
    assert.equal(Runner.prototype.allerAEtape.call(r, 1), false);
    // Les bornes tiennent, dans les deux sens.
    Runner.prototype.allerAEtape.call(r, 99);
    assert.equal(jeu.ou, 10);
    Runner.prototype.allerAEtape.call(r, -5);
    assert.equal(jeu.ou, 0);
});

test('un jeu qui rendrait toujours « vrai » ne fait pas tourner la boucle sans fin', () => {
    // La garde n'est pas décorative : sans elle, un `sauterEtape` mal écrit —
    // qui avance sans jamais changer `courante` — bloquerait l'onglet.
    const r = faussaireRunner(3);
    r.updateStepNavigation = () => { };
    let appels = 0;
    r.handle = {
        planEtapes: () => ({ courante: 0, liste: ['a', 'b', 'c', 'd'] }),
        sauterEtape: () => { appels++; return true; },
        revenirEtape: () => true
    };
    Runner.prototype.allerAEtape.call(r, 3);
    assert.ok(appels <= 5, `la boucle a tourné ${appels} fois`);
});
