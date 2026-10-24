// LES MINUTEURS QU'ON ENREGISTRE POUR POUVOIR LES ARRÊTER.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// `js/core/timers.js` fait vingt lignes et c'est le filet de sécurité de tout
// le logiciel : chaque `setTimeout` et chaque `setInterval` d'un exercice passe
// par `regTimeout` / `regInterval`, et `clearEngines()` les arrête TOUS quand
// on quitte l'exercice.
//
// CE QU'IL SE PASSE SANS LUI, et ce n'est pas une hypothèse — c'est le défaut
// que ce module existe pour empêcher : un élève quitte le jeu du canon, le
// minuteur du canon continue de tourner, et deux exercices plus loin un boulet
// apparaît par-dessus une leçon de fractions. Ou bien le robot de démonstration
// « parle dans le vide pendant les deux secondes de son dernier délai », comme
// le dit `demoPointer.js`.
//
// UN PIÈGE DANS CES VINGT LIGNES, ET C'EST LUI QU'ON GARDE. Les deux tableaux
// sont exportés avec `export let`, et `clearEngines` les REMPLACE :
//
//     activeTimeouts = [];
//
// Un module qui ferait `import { activeTimeouts }` puis en garderait une copie
// locale (`const liste = activeTimeouts`) regarderait ensuite l'ANCIEN tableau
// pour toujours. C'est la raison pour laquelle on relit l'export à chaque fois,
// et c'est ce que mesure la dernière épreuve d'ici.

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import * as minuteurs from '../js/core/timers.js';
import { regTimeout, regInterval, clearEngines } from '../js/core/timers.js';

/** Un petit répit, pour laisser une chance à un minuteur de se déclencher. */
const souffler = (ms = 30) => new Promise(r => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────────────────────
// UNE ÉPREUVE QUI GÈLE LE HARNAIS EN ÉCHOUANT NE PEUT PAS ÊTRE VUE ÉCHOUER.
//
// Mesuré ici même : en retirant `activeIntervals.forEach(clearInterval)` du
// code pour vérifier que l'épreuve tombe, les répétitions survivaient à
// l'épreuve, Node ne sortait jamais, et `epreuveTombe.mjs` restait pendu
// jusqu'au délai du harnais — sans rien dire. Deux minutes perdues, et la
// réponse qu'on cherchait jamais obtenue.
//
// C'est le propre de ce module : les épreuves qui le gardent CRÉENT ce que le
// code sous épreuve est censé arrêter. On garde donc toutes les poignées de
// notre côté, et on les arrête à la vraie fin du fichier, avec le
// `clearInterval` du système — celui-là ne peut pas être cassé par la mutation
// qu'on mesure.
// ─────────────────────────────────────────────────────────────────────────────

const poignees = [];
const repetition = (fn, ms) => { const p = regInterval(fn, ms); poignees.push(p); return p; };
after(() => { poignees.forEach(clearInterval); });

test('UN MINUTEUR ENREGISTRÉ SE DÉCLENCHE NORMALEMENT', async () => {
    clearEngines();
    let appels = 0;
    regTimeout(() => { appels++; }, 5);
    await souffler();
    assert.equal(appels, 1, 'enregistrer un minuteur ne doit pas l\'empêcher de servir');
    clearEngines();
});

test('clearEngines ARRÊTE UN MINUTEUR QUI N\'A PAS ENCORE SONNÉ', async () => {
    // LE DÉFAUT QUE CE MODULE EXISTE POUR EMPÊCHER : un élève quitte le jeu,
    // et le jeu continue de jouer par-dessus l'exercice suivant.
    clearEngines();
    let appels = 0;
    regTimeout(() => { appels++; }, 20);
    clearEngines();
    await souffler(60);
    assert.equal(appels, 0, 'un exercice quitté ne doit plus rien faire');
});

test('clearEngines ARRÊTE AUSSI LES RÉPÉTITIONS', async () => {
    // Un `setInterval` oublié est pire qu'un `setTimeout` oublié : il ne
    // s'épuise jamais. C'est lui qui fait tourner un ventilateur de portable
    // pendant tout le cours.
    //
    // ON GARDE LA POIGNÉE ET ON L'ARRÊTE DANS UN `finally`, pour une raison
    // apprise ici même : quand cette épreuve TOMBE — c'est-à-dire quand
    // `clearInterval` manque dans le code —, la répétition survit à l'épreuve,
    // Node ne sort jamais, et `epreuveTombe.mjs` reste pendu sans rien dire. Une
    // épreuve doit pouvoir être vue échouer ; celle qui gèle le harnais en
    // échouant ne peut pas l'être.
    clearEngines();
    let appels = 0;
    repetition(() => { appels++; }, 5);
    await souffler(30);
    const pendant = appels;
    assert.ok(pendant >= 2, `la répétition doit avoir servi (${pendant} appels)`);
    clearEngines();
    await souffler(40);
    assert.equal(appels, pendant, 'et s\'arrêter net');
});

test('UN MINUTEUR RENDU PEUT ÊTRE ARRÊTÉ À LA MAIN', () => {
    // Plusieurs jeux gardent la poignée pour annuler un seul délai sans tout
    // arrêter — le compte à rebours d'une question, par exemple.
    clearEngines();
    const t = regTimeout(() => { }, 1000);   // non enregistré ailleurs : clearEngines suffit
    assert.ok(t !== undefined && t !== null, 'la poignée doit être rendue');
    clearTimeout(t);
    clearEngines();
});

test('LES TABLEAUX SE VIDENT, SINON ILS GROSSISSENT TOUT LE COURS', async () => {
    // Une heure de classe, c'est des milliers de minuteurs. S'ils
    // s'accumulaient, `clearEngines` finirait par parcourir une liste de
    // poignées mortes à chaque question — et la mémoire ne serait jamais rendue.
    clearEngines();
    for (let i = 0; i < 50; i++) regTimeout(() => { }, 1000);
    for (let i = 0; i < 10; i++) repetition(() => { }, 1000);
    assert.equal(minuteurs.activeTimeouts.length, 50);
    assert.equal(minuteurs.activeIntervals.length, 10);

    clearEngines();
    assert.equal(minuteurs.activeTimeouts.length, 0);
    assert.equal(minuteurs.activeIntervals.length, 0);
});

test('APRÈS clearEngines, LES NOUVEAUX MINUTEURS SONT TOUJOURS ENREGISTRÉS', async () => {
    // LE PIÈGE DE `export let`. `clearEngines` REMPLACE les tableaux au lieu de
    // les vider sur place. Lu au travers de l'espace de noms du module, on voit
    // bien le nouveau — mais un appelant qui aurait gardé une référence locale
    // sur l'ancien enregistrerait dans le vide, et son exercice ne s'arrêterait
    // plus jamais. On vérifie donc qu'après remplacement l'enregistrement
    // marche encore, et surtout que l'ARRÊT marche encore.
    clearEngines();
    let appels = 0;
    regTimeout(() => { appels++; }, 20);
    assert.equal(minuteurs.activeTimeouts.length, 1,
        'le nouveau tableau doit être celui que regTimeout remplit');
    clearEngines();
    await souffler(60);
    assert.equal(appels, 0, 'un second cycle doit s\'arrêter aussi bien que le premier');
});
