// REFAIRE POUR S'AMÉLIORER, ET LE SANS-FAUTE QUI SE DIT.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « lorsque l'on transmet un code aux élèves, ils font leurs exercices,
// on peut leur proposer de recommencer l'exercice lorsqu'ils l'ont terminé pour
// essayer de s'améliorer ou leur dire que c'est bien s'ils ont eu bon partout ».
//
// CE QUE L'ÉLÈVE VOYAIT. L'écran de fin d'étape avait trois états, et deux
// seulement étaient servis :
//
//   ratée    « Presque… Tu as 1 bonne réponse, il en faut 2. » → [Réessayer]
//   validée  « Étape validée ! 3 bonnes réponses sur 4. »      → [Continuer]
//   parfaite « Étape validée ! 4 bonnes réponses sur 4. »      → [Continuer]
//
// Les deux dernières lignes sont le défaut, et il tient en un mot : la même.
// Dix sur dix et sept sur dix recevaient le même titre, la même icône, la même
// phrase à un chiffre près. L'élève qui n'avait rien raté ne l'apprenait pas,
// et celui qui avait trois fautes n'avait aucun moyen de les reprendre.
//
// MESURÉ dans une vraie séance jouée (`tools/tmp/finEtape.mjs`), un parcours
// lancé comme `studentCodeUI` le fait pour un élève arrivé par un code :
//
//   4 / 4 en entraînement  🏆 « Sans faute ! »       [Voir mon bilan]
//   3 / 4 en entraînement  🎉 « Étape validée ! »    [Voir mon bilan] [Refaire pour m'améliorer]
//   3 / 4 en évaluation    🎉 « Étape validée ! »    [Voir mon bilan]
//
// ─────────────────────────────────────────────────────────────────────────────
//
// PUIS UNE ÉLÈVE A DIT LE CONTRAIRE DE L'ÉCRAN, ET ELLE AVAIT RAISON.
//
// RÉMY, la rapportant : « une élève m'a dit qu'elle avait fait une faute mais
// qu'il lui avait dit qu'il avait tout bon ; en fait elle a eu bon au deuxième
// essai a une question ».
//
// Le sans-faute se décidait sur `solved >= posees`. Or `solved` compte les
// questions FINALEMENT trouvées : en entraînement l'élève a deux essais, donc
// une question ratée puis corrigée y entrait comme une question juste du
// premier coup. L'écran annonçait alors « Tout juste, DU PREMIER COUP » à
// quelqu'un qui savait le contraire — et c'est la pire sorte de défaut, celui
// où l'élève a raison et le logiciel lui dit qu'elle a tort. Elle ne peut pas
// s'être trompée sur ce qu'elle vient de vivre : elle cesse donc de croire
// l'écran, et plus rien de ce qu'il annoncera ne vaudra.
//
// On compte désormais `itemsPremierCoup` à part, et l'écran a TROIS issues là
// où il en avait deux — parce que tout trouver en se reprenant est une bonne
// nouvelle elle aussi, mais ce n'est pas la même.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import './helpers.mjs';
import { EventTypes as E } from '../js/core/journal.js';
import { computeAssignedPath } from '../js/core/projections.js';
import { Runner } from '../js/core/runner.js';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const RUNNER = lire('js/core/runner.js');

/**
 * Le code seul, sans les commentaires.
 *
 * TROISIÈME FOIS CETTE SEMAINE qu'un test accuse son propre correctif : il
 * cherchait `openGameLayer` pour vérifier qu'il n'y est PAS, et le trouvait
 * dans le commentaire qui explique justement pourquoi on ne l'appelle pas.
 * Un test qui lit les commentaires mesure ce qu'on raconte, pas ce qu'on fait.
 */
const codeSeul = (src) => src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n').map(l => l.replace(/^\s*\/\/.*$/, '')).join('\n');

/**
 * UNE ÉTAPE JOUÉE POUR DE VRAI, puis l'écran de fin, et l'on lit ce que
 * l'élève lit.
 *
 * ON NE RECOPIE PAS LA RÈGLE DANS L'ÉPREUVE. C'est la raison d'être de ce
 * harnais : les tentatives passent par le VRAI `onAttempt`, qui remplit les
 * trois ensembles de comptage, et le verdict sort du VRAI `showStepResult`.
 * Une épreuve qui recalculerait « du premier coup » de son côté aurait validé
 * le défaut de l'élève de Rémy aussi sereinement que le code le portait.
 *
 * `reponses` : un tableau d'une entrée par question, `true` = juste du premier
 * coup, `'reprise'` = fausse puis juste, `false` = jamais trouvée.
 */
function ecranApresAvoirJoue(reponses, { mode = 'entrainement', required = 1 } = {}) {
    const r = Object.create(Runner.prototype);
    const step = { stepId: 's1', title: 'Étape', nbItems: reponses.length, exercise: { id: 'x' }, params: {} };
    r.steps = [step];
    r.step = step;
    r.session = null;
    r.policy = { mode, maxAttemptsPerItem: 2 };
    r.itemsResolved = new Set();
    r.itemsSolved = new Set();
    r.itemsPremierCoup = new Set();
    r.autonomousCounter = 0;
    r.etapeClose = false;
    r.currentTimeLimit = null;
    r.timerScope = 'etape';
    r.updateProgress = () => { };
    // On ne veut pas de la fin d'étape automatique : c'est nous qui appelons
    // l'écran, avec les chiffres que le meneur en aurait tirés.
    r.endStep = () => { };

    reponses.forEach((quoi, i) => {
        const itemSeed = `q${i}`;
        if (quoi === true) {
            Runner.prototype.onAttempt.call(r, { correct: true, attemptIndex: 0, itemSeed });
        } else if (quoi === 'reprise') {
            Runner.prototype.onAttempt.call(r, { correct: false, attemptIndex: 0, itemSeed });
            Runner.prototype.onAttempt.call(r, { correct: true, attemptIndex: 1, itemSeed });
        } else {
            Runner.prototype.onAttempt.call(r, { correct: false, attemptIndex: 0, itemSeed });
            Runner.prototype.onAttempt.call(r, { correct: false, attemptIndex: 1, itemSeed });
        }
    });

    const solved = r.itemsSolved.size;
    const passed = solved >= required;
    // L'étape est franchie : on est au bilan. `avecCarte` et `canvas` sont des
    // ACCESSEURS du prototype — on ne les écrase pas, on leur donne de quoi
    // répondre : `avecCarte` rend `false` dès qu'il n'y a qu'une étape, et
    // `canvas` va chercher `game-board` dans le document.
    r.index = 1;
    r.filDesEtapes = () => '';
    r.runStep = () => { };
    r.showPathMap = () => { };

    // Un seul faux élément pour tout le monde : le plateau où l'écran s'écrit,
    // et les deux boutons dont `showStepResult` branche le clic — le DOM de
    // `helpers.mjs` rend `null`, ce qui lèverait. On ne mesure pas les clics
    // ici, on mesure la PHRASE.
    const plateau = { innerHTML: '' };
    const avant = globalThis.document.getElementById;
    globalThis.document.getElementById = () => plateau;
    try {
        Runner.prototype.showStepResult.call(r, passed, solved, required, null, step);
    } finally {
        globalThis.document.getElementById = avant;
    }
    return { html: plateau.innerHTML, solved, premierCoup: r.itemsPremierCoup.size };
}

test('REFAIRE NE PEUT PAS NUIRE — c\'est ce qui rend le bouton acceptable', () => {
    // LE TEST LE PLUS IMPORTANT DU FICHIER, et celui qu'il fallait écrire
    // AVANT le bouton. Si une seconde tentative écrasait la première, on
    // tendrait un piège aux élèves les plus consciencieux : celui qui retente
    // pour mieux faire, et qui fait moins bien, perdrait ce qu'il avait.
    //
    // `computeAssignedPath` garde la MEILLEURE tentative. On le prouve plutôt
    // que de le lire.
    const ev = (t, p, ts) => ({ type: t, payload: p, ts });
    const base = [ev(E.PATH_ASSIGNED, { pathId: 'p1', steps: [{ stepId: 's1' }] }, 1000)];
    const essai = (solved, ts) => ev(E.STEP_COMPLETED,
        { pathId: 'p1', stepId: 's1', solved, required: 2, questions: 4, passed: true }, ts);
    const score = (evts) => {
        const r = computeAssignedPath([...base, ...evts]);
        return r.resultats.s1.solved;
    };
    assert.equal(score([essai(3, 2000)]), 3);
    // Il refait et fait MOINS bien : rien ne bouge.
    assert.equal(score([essai(3, 2000), essai(1, 3000)]), 3);
    // Il refait et fait MIEUX : ça monte.
    assert.equal(score([essai(3, 2000), essai(1, 3000), essai(4, 4000)]), 4);
});

test('L\'ÉLÈVE DE RÉMY : une reprise, et l\'écran ne dit plus « du premier coup »', () => {
    // LE DÉFAUT, REJOUÉ. Quatre questions, toutes trouvées, dont une au second
    // essai — exactement ce que son élève a vécu. L'écran annonçait « Sans
    // faute ! » et « Tout juste, du premier coup ».
    const { html, solved, premierCoup } = ecranApresAvoirJoue([true, true, 'reprise', true]);

    // D'abord les chiffres, pour que l'épreuve dise LAQUELLE des deux mesures
    // a bougé si elle tombe un jour.
    assert.equal(solved, 4, 'les quatre questions sont bien finalement trouvées');
    assert.equal(premierCoup, 3, 'trois seulement l\'étaient du premier coup');

    assert.ok(!html.includes('Sans faute'), 'une faute a été faite : l\'écran l\'annonce quand même');
    assert.ok(!html.includes('du premier coup'),
        'l\'écran affirme « du premier coup » à une élève qui s\'est reprise');
    assert.ok(!html.includes('🏆'), 'le trophée du sans-faute est servi à tort');

    // ET IL DIT LA BONNE NOUVELLE QUI RESTE : elle a bien tout trouvé.
    assert.match(html, /Tout trouvé/);
    assert.match(html, /4 sur 4/);
    assert.match(html, /1 rattrapée/);
});

test('LE SANS-FAUTE RESTE UN SANS-FAUTE quand il n\'y a eu aucune reprise', () => {
    // L'autre moitié du correctif, et celle qu'on casse en corrigeant la
    // première : à force de se méfier, on finit par ne plus jamais féliciter.
    const { html, premierCoup } = ecranApresAvoirJoue([true, true, true, true]);
    assert.equal(premierCoup, 4);
    assert.match(html, /Sans faute !/);
    assert.match(html, /Tout juste, du premier coup/);
    assert.match(html, /🏆/);
    // Et on ne lui propose pas de refaire : ce serait dire « pas encore assez ».
    assert.ok(!html.includes('btn-run-refaire'), 'refaire proposé après un sans-faute');
});

test('« TOUT TROUVÉ » PEUT SE REFAIRE — c\'est même le cas où ça sert le plus', () => {
    // Elle a tout trouvé, mais pas du premier coup : refaire l'étape est
    // précisément ce qui lui permettrait d'y arriver. Et cela ne peut pas lui
    // nuire, le premier test de ce fichier le prouve.
    const { html } = ecranApresAvoirJoue([true, 'reprise', true]);
    assert.ok(html.includes('btn-run-refaire'), 'le seul écran où refaire a tout son sens');
    assert.match(html, /Refaire pour m'améliorer/);
});

test('L\'ÉTAPE RATÉE GARDE SON ÉCRAN, elle ne devient pas « tout trouvé »', () => {
    // `toutTrouve` et `sansFaute` portent tous deux `passed` ; sans lui, une
    // étape ratée dont les rares questions posées étaient justes aurait reçu
    // un titre de félicitations.
    const { html } = ecranApresAvoirJoue([true, false, false], { required: 3 });
    assert.match(html, /Presque…/);
    assert.ok(!html.includes('Tout trouvé'), 'une étape ratée félicitée');
    assert.ok(!html.includes('Sans faute'), 'une étape ratée félicitée');
});

test('ON NE DIT PAS « au second essai » : le nombre d\'essais n\'est pas toujours deux', () => {
    // La remédiation en laisse trois (`js/core/remediation.js`), le mode libre
    // quatre-vingt-dix-neuf, et les réglages d'un exercice jusqu'à cinq. Dire
    // « au second essai » serait le même genre de petit mensonge que celui que
    // ce fichier corrige.
    const nu = codeSeul(RUNNER);
    const i = nu.indexOf('const duPremierCoup');
    assert.ok(i > 0, 'le compte du premier coup a disparu');
    const bloc = nu.slice(i, nu.indexOf('const detailJeu', i));
    assert.ok(bloc.length > 200, 'tranche vide : le test ne vérifierait rien');
    assert.ok(!/second essai|deuxième essai/.test(bloc),
        'le verdict nomme un numéro d\'essai que la politique ne garantit pas');
});

test('LE COMPTE DU PREMIER COUP SE FAIT DANS onAttempt, pas dans l\'écran', () => {
    // Où la mesure se prend décide si elle est juste. `showStepResult` ne reçoit
    // que des totaux : le numéro d'essai n'y parvient jamais, et c'est pour cela
    // que le défaut a pu vivre si longtemps. Un correctif qui aurait tenté de
    // deviner la reprise depuis le bilan aurait redevine n'importe quoi.
    const nu = codeSeul(RUNNER);
    const debut = nu.indexOf('onAttempt(payload) {');
    const bloc = nu.slice(debut, nu.indexOf('this.updateProgress();', debut));
    assert.ok(bloc.length > 100, 'tranche vide : le test ne vérifierait rien');
    assert.match(bloc, /itemsPremierCoup\.add\(key\)/);
    assert.match(bloc, /attemptIndex/);
    // ET L'ENSEMBLE SE REMET À ZÉRO AVEC LES AUTRES : oublié, le sans-faute de
    // l'étape 1 se dirait encore à l'étape 4.
    assert.match(nu, /this\.itemsSolved = new Set\(\);\s*\n\s*this\.itemsPremierCoup = new Set\(\);/);
});

test('« REFAIRE » NE PARAÎT QUE LÀ OÙ IL A UN SENS', () => {
    const cond = /const peutRefaire = passed && !sansFaute && !jeu\s*\n\s*&& this\.policy\.mode !== 'evaluation' && rang >= 0;/;
    assert.match(RUNNER, cond, 'les conditions du bouton ont changé');

    // Les quatre, nommément — parce que chacune répare ou évite une bêtise :
    // · `passed`     : une étape ratée offre déjà « Réessayer ».
    // · `!sansFaute` : proposer d'améliorer un sans-faute, c'est dire
    //                  « ce n'était pas encore assez ».
    // · `!evaluation`: Rémy — « en mode interrogation, il ne faut pas proposer
    //                  à la fin de refaire l'exercice ». Une note qu'on
    //                  recommence jusqu'à ce qu'elle tombe juste ne mesure
    //                  plus rien.
    // · `rang >= 0`  : sans l'étape, on ne sait pas où revenir.
    ['passed', '!sansFaute', "this.policy.mode !== 'evaluation'", 'rang >= 0']
        .forEach(c => assert.ok(RUNNER.includes(c), `condition perdue : ${c}`));
});

test('EN ÉVALUATION, ON NE REFAIT PAS — même après une reprise', () => {
    // Mesuré sur l'écran, pas seulement lu dans la condition : une note qu'on
    // recommence jusqu'à ce qu'elle tombe juste ne mesure plus rien.
    const { html } = ecranApresAvoirJoue([true, 'reprise'], { mode: 'evaluation' });
    assert.ok(!html.includes('btn-run-refaire'), 'refaire proposé en évaluation');
    // Mais la phrase, elle, reste honnête : c'est une autre affaire.
    assert.match(html, /Tout trouvé/);
});

test('ET IL REVIENT SUR L\'ÉTAPE, IL NE ROUVRE PAS L\'EXERCICE SEUL', () => {
    // C'est la différence avec le bilan de fin d'exercice, qui appelle
    // `openGameLayer` : dans une séance, cela sortirait l'élève de son
    // parcours et le laisserait dans un exercice isolé, sans carte, sans
    // suite et sans retour. Ici l'index recule et `runStep` rejoue l'étape.
    const nu = codeSeul(RUNNER);
    // La fin se cherche APRÈS le début : `startTimer(` apparaît aussi plus
    // haut dans le fichier, et la tranche partait à l'envers — donc vide,
    // donc un test qui passait sur du néant aurait pu tout aussi bien mentir
    // dans l'autre sens.
    const debut = nu.indexOf('const refaire = document.getElementById');
    assert.ok(debut > 0, 'le branchement du bouton a disparu');
    const bloc = nu.slice(debut, nu.indexOf('startTimer(', debut));
    assert.ok(bloc.length > 40, 'tranche vide : le test ne vérifierait rien');
    assert.match(bloc, /this\.index = rang;/);
    assert.match(bloc, /this\.runStep\(\);/);
    assert.ok(!/openGameLayer/.test(bloc), 'le bouton sort l\'élève de sa séance');
});

test('LE BOUTON PRINCIPAL RESTE LE CHEMIN NORMAL', () => {
    // Deux boutons de même poids poseraient une question là où il n'y en a
    // pas : l'étape est validée, la suite est le chemin normal. Le second est
    // une offre, pas une consigne.
    assert.match(RUNNER, /id="btn-run-refaire"[\s\S]{0,160}run-screen-btn--doux/);
    const CSS = lire('css/modules.css');
    assert.match(CSS, /\.run-screen-btn--doux \{[^}]*font-size: 1rem;/);
    // Le principal garde sa classe `active`, qui est ce qui le met en avant.
    assert.match(RUNNER, /id="btn-run-next" class="btn-toggle active run-screen-btn"/);
});
