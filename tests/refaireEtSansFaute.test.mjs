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

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EventTypes as E } from '../js/core/journal.js';
import { computeAssignedPath } from '../js/core/projections.js';

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

test('LE SANS-FAUTE A SON PROPRE ÉCRAN', () => {
    assert.match(RUNNER, /const sansFaute = passed && posees > 0 && solved >= posees;/);
    assert.match(RUNNER, /sansFaute \? '🏆'/);
    assert.match(RUNNER, /sansFaute \? 'Sans faute !'/);
    // Et il dit AUTRE CHOSE que « 3 bonnes réponses sur 4 » : sans cela, seule
    // l'icône changerait et le message resterait le même.
    assert.match(RUNNER, /Tout juste, du premier coup/);
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
