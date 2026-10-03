// UNE DÉMONSTRATION QUI NE MONTRE RIEN EXPLIQUE UN GESTE QUE PERSONNE NE VOIT.
//
// Rémy, capture d'iPhone sur « Le Canon des Compléments » : « bug avec le
// robot ». Sur son écran : « Niveau **undefined** », aucun cœur, un terrain
// noir et vide, « prépare… » qui ne bouge pas — pendant que le robot expliquait
// « un boulet approche, je cherche son complément à 100 ».
//
// LA CAUSE EST UNE SEULE LIGNE DE `BaseGame`, ET ELLE EST EXCLUSIVE :
//
//     if (this.isDemo) this.runDemoSequence();
//     else this.startGameLoop();
//
// Le robot n'appelait donc JAMAIS `startGameLoop`, et il en manquait trois
// choses à la fois :
//
//   · `this.niveau` jamais posé → « Niveau undefined », et
//     `direPalier(100, undefined)` tombe à travers toutes ses comparaisons
//     pour annoncer le palier le PLUS dur au premier niveau ;
//   · `this.vies` jamais posé → `'❤️'.repeat(Math.max(0, undefined))` vaut
//     `repeat(NaN)`, donc la chaîne vide : aucun cœur ;
//   · `this.boucle()` jamais lancée → AUCUN ASTÉROÏDE. Or ce robot n'a rien
//     d'autre à montrer.
//
// MESURÉ DANS UN NAVIGATEUR, téléphone de 390 px, relevés toutes les 4 s :
//
//                                    avant        après
//     niveau affiché ............... undefined    1
//     cœurs ........................ (aucun)      ❤️❤️❤️ jusqu'au bout
//     palier annoncé ............... quelconques  dizaines rondes
//     astéroïdes ................... 0            1 à la fois
//     tirs partis .................. 0            2, et 2 touches
//
// TROIS CORRECTIONS, ET AUCUNE N'EST DÉCORATIVE — chacune ferme un défaut que
// la précédente laissait voir :
//
//   1. le robot lance une vraie partie ;
//   2. il vise le plus JEUNE astéroïde, choisi APRÈS son tour de parole — sans
//      quoi sa cible a touché le canon pendant qu'il parlait ;
//   3. un seul astéroïde à la fois sous le robot, et le ciel reste vide
//      pendant sa phrase d'ouverture.
//
// RIEN N'EST ENREGISTRÉ POUR AUTANT : `onCorrectAnswer`, `onWrongAnswer` et
// `terminerPartie` rendent tous la main quand `isDemo` est vrai.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const JEU = readFileSync(new URL('../js/games/canon.js', import.meta.url), 'utf8');
const BASE = readFileSync(new URL('../js/core/BaseGame.js', import.meta.url), 'utf8');

/** Le corps de `runDemoSequence`, du nom jusqu'à la méthode suivante. */
function demo() {
    const i = JEU.indexOf('async runDemoSequence()');
    assert.ok(i > 0, 'la démonstration doit exister');
    const j = JEU.indexOf('\n    destroy()', i);
    return JEU.slice(i, j > 0 ? j : i + 4000);
}

test('LE ROBOT LANCE UNE VRAIE PARTIE', () => {
    assert.match(demo(), /^\s*this\.startGameLoop\(\);$/m,
        'sans elle, ni niveau, ni vies, ni astéroïdes : `BaseGame.start` appelle '
        + 'la démonstration OU la partie, jamais les deux');
    // LE CONTRÔLE DU CONTRÔLE : si un jour `start()` appelait les deux, cette
    // épreuve garderait une règle qui n'existe plus, et l'appel ci-dessus
    // deviendrait un doublon silencieux. On vérifie donc que l'exclusivité est
    // toujours ce qui rend cet appel nécessaire.
    assert.match(BASE, /if \(this\.isDemo\) this\.runDemoSequence\(\);\s*\n\s*else this\.startGameLoop\(\);/,
        'c\'est l\'exclusivité de ces deux lignes qui rend l\'appel obligatoire');
});

test('IL VISE LE PLUS JEUNE ASTÉROÏDE, PAS LE PREMIER', () => {
    // `boulets[0]` EST LE PLUS ANCIEN : celui qui va toucher le canon. C'est
    // exactement celui qu'il ne faut pas choisir quand on va passer cinq
    // secondes à expliquer ce qu'on fait.
    assert.match(JEU, /bouletDeLaDemo\(\) \{[\s\S]*?reduce\(\(a, b\) => \(b\.avancee < a\.avancee \? b : a\)\)/,
        'le plus petit `avancee` est le plus frais, donc celui qui laisse le '
        + 'temps de montrer le geste en entier');
    assert.doesNotMatch(demo(), /const ennemi = this\.boulets\[0\]/,
        'le premier de la liste est le plus avancé : il ne sera plus là au tir');
});

test('ET IL LE CHOISIT APRÈS SON TOUR DE PAROLE', () => {
    // `waitTurn` peut retenir le robot aussi longtemps que le professeur le
    // laisse en pause. Choisir avant, c'est choisir pour un tir qui n'aura lieu
    // qu'après cette attente — et la cible aura disparu.
    const d = demo();
    const iTour = d.indexOf('gate.waitTurn()', d.indexOf('for (let k = 0'));
    const iCible = d.indexOf('this.bouletDeLaDemo()');
    assert.ok(iTour > 0 && iCible > iTour,
        'la cible doit être choisie APRÈS `waitTurn`, pas avant');
});

test('ON NE TIRE PAS SUR UN FANTÔME', () => {
    // MESURÉ AVANT : le robot chargeait 80 pour le 20, puis 10 pour le 90 —
    // les deux compléments JUSTES — et pas un seul tir n'est jamais parti. Sa
    // cible avait touché le canon pendant qu'il parlait.
    const d = demo();
    const n = d.split('if (!this.boulets.includes(ennemi)) { k--; continue; }').length - 1;
    assert.equal(n, 2,
        'on vérifie que la cible vit encore DEUX fois : avant le déplacement du '
        + 'curseur, et après — le trajet dure presque une seconde');
});

test('UN SEUL ASTÉROÏDE À LA FOIS SOUS LE ROBOT', () => {
    // Le ciel qui se remplit est ce qu'on apprend à gérer APRÈS. Pendant
    // l'explication, il ne fait qu'une chose : atteindre le canon pendant que
    // le robot parle. MESURÉ : deux vies sur trois tombaient en quarante
    // secondes, et « 💥 Le 60 a atteint le canon ! » s'affichait sous une
    // leçon qui venait de réussir son tir.
    assert.match(JEU, /const simultanes = this\.isDemo \? 1\s*\n\s*: Math\.min\(/,
        'la démonstration montre UN geste');
});

test('ET LE CIEL RESTE VIDE PENDANT LA PHRASE D\'OUVERTURE', () => {
    const d = demo();
    assert.match(d, /this\.prochainBoulet = Infinity;/,
        'le premier astéroïde partait à la seconde zéro et atteignait le canon '
        + 'juste avant le premier tir : la démonstration commençait par un échec');
    assert.match(d, /this\.prochainBoulet = 0;/,
        'et c\'est le robot qui le relâche quand il a fini de parler');
    const iRetenu = d.indexOf('this.prochainBoulet = Infinity;');
    const iLache = d.indexOf('this.prochainBoulet = 0;');
    assert.ok(iRetenu > 0 && iLache > iRetenu, 'dans cet ordre, sans quoi rien n\'est retenu');
    // `Infinity` ET NON UN DÉLAI EN SECONDES : la durée de l'ouverture dépend
    // du facteur de vitesse, que le professeur règle lui-même. Un chiffre écrit
    // là serait juste à une allure et faux aux trois autres.
    assert.doesNotMatch(d, /this\.prochainBoulet = \d{3,};/,
        'un délai chiffré serait faux dès qu\'on change l\'allure du robot');
});

test('LA PARTIE SE FIGE QUAND L\'EXPLICATION EST FINIE', () => {
    // Sans cela, elle continuerait toute seule, personne aux commandes : les
    // astéroïdes atteindraient le canon l'un après l'autre sous une explication
    // terminée.
    assert.match(demo(), /this\.isDemo = 'fige';/,
        'le robot doit figer la partie avant de rendre la main');
    // `'fige'` N'EST PAS UN MOT NEUF : la boucle le teste depuis toujours, et
    // personne ne le posait. Le garde-fou était écrit, le câblage manquait.
    assert.match(JEU, /if \(!this\.isRunning \|\| this\.isDemo === 'fige'\) return;/,
        'et c\'est la boucle qui l\'observe');
});

test('AUCUN MINUTEUR NE SURVIT À L\'EXERCICE QUI L\'A POSÉ', () => {
    // `setTimeout` NU : rien ne l'annule. Perdre la partie puis quitter dans la
    // seconde et demie qui suit — ce qui est exactement le moment où l'on
    // quitte — faisait s'exécuter un rappel sur une couche de jeu déjà
    // remplacée : « Cannot set properties of null (setting 'textContent') ».
    //
    // MESURÉ : l'erreur n'apparaissait qu'en enchaînant plusieurs robots,
    // jamais en en ouvrant un seul. Elle a donc d'abord été prise pour un
    // défaut de la sonde — on a failli la classer sans la corriger.
    assert.match(JEU, /import \{ regTimeout \} from '\.\.\/core\/timers\.js';/,
        'le minuteur du dépôt, celui que `clearEngines()` sait annuler');
    const i = JEU.indexOf('    perdu() {');
    assert.ok(i > 0, 'la fin de partie doit exister');
    const bloc = JEU.slice(i, i + 1600);
    assert.match(bloc, /regTimeout\(\(\) => \{/,
        'la reprise après défaite passe par un minuteur annulable');
    assert.doesNotMatch(bloc, /[^g]setTimeout\(/,
        'et pas par un `setTimeout` nu, que rien n\'annule');
    // LA CEINTURE EN PLUS DES BRETELLES : annuler un minuteur demande que
    // quelqu'un y pense, et ce quelqu'un change avec les écrans. `majTete` est
    // appelée de cinq endroits ; la rendre incapable de lever est plus sûr que
    // de compter sur les cinq.
    const j = JEU.indexOf('    majTete() {');
    const tete = JEU.slice(j, j + 700);
    assert.match(tete, /if \(!vies \|\| !niv\) return;/,
        'et l\'en-tête ne lève plus quand son plateau a disparu');
});

test('UNE DÉMONSTRATION N\'ENREGISTRE RIEN', () => {
    // C'est ce qui rend acceptable de faire tourner une VRAIE partie sous le
    // robot. Si un seul de ces trois garde-fous tombait, le robot remplirait
    // le carnet d'erreurs de l'élève qui le regarde.
    for (const m of ['onCorrectAnswer', 'onWrongAnswer', 'terminerPartie']) {
        const i = BASE.indexOf(`    ${m}(`);
        assert.ok(i > 0, `${m} doit exister`);
        assert.match(BASE.slice(i, i + 200), /if \(this\.isDemo\) return;/,
            `${m} doit rendre la main en démonstration : le robot joue une vraie `
            + 'partie, et rien de ce qu\'il fait n\'appartient à l\'élève');
    }
});
