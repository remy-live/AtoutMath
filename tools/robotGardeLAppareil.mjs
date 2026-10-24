// LE ROBOT NE CHANGE PAS D'APPAREIL EN COURS DE ROUTE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « je suis dans la zone prof, j'ai mis aperçu en ordinateur, je
// commence à faire l'exercice, je clique sur le robot et là ça se met en mode
// téléphone ».
//
// MESURÉ, DANS LE VOLET DE L'ATELIER, AVANT CORRECTION :
//
//   appareil=none    exercice 1400 px → robot  400 px
//   appareil=tablet  exercice  768 px → robot  400 px
//   appareil=mobile  exercice  400 px → robot  400 px
//
// TROIS PAS, ET LE RÉGLAGE SE PERDAIT AU DEUXIÈME :
//
//   1. le volet lance l'exercice avec `apercuAppareil`, que `cadreDe()`
//      respecte avant tout le reste — l'écran est juste ;
//   2. le Runner démarre et fait `state.activeExo = step.exercise`, l'entrée
//      BRUTE du catalogue : la copie portant l'appareil est remplacée, et rien
//      ne le signale tant qu'on ne redemande pas le cadre ;
//   3. le robot appelle `openDemo(state.activeExo)` et retombe sur
//      `state.previewDeviceMode` — qui vaut « mobile » au démarrage, et
//      personne ne clique les boutons d'aperçu DANS un cadre.
//
// POURQUOI CETTE SONDE RESTE. Le défaut ne se voit QUE sur ce chemin-là : trois
// pas, deux pages, et un réglage qui doit survivre au second. Aucune épreuve
// sans navigateur ne le reproduit — `tests/robotAppareil.test.mjs` garde le
// câblage, celle-ci garde le résultat.
//
//   node tools/robotGardeLAppareil.mjs
//
import { ouvrirSonde } from '../tools/sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const vert = (t) => `\x1b[32m${t}\x1b[0m`;
const rouge = (t) => `\x1b[31m${t}\x1b[0m`;
const gris = (t) => `\x1b[90m${t}\x1b[0m`;
let ratés = 0;

const s = await ouvrirSonde({ largeur: 1400, hauteur: 900 });
await s.identifier();
const racine = (await s.page.url()).split('?')[0];

for (const appareil of ['none', 'tablet', 'mobile']) {
    await s.page.goto(`${racine}?atelier=jeu&exo=calc-oppose-enlever&appareil=${appareil}`);
    await dormir(2500);
    const avant = await s.page.evaluate(async () => {
        const { state } = await import('./js/core/state.js');
        const gl = document.getElementById('game-layer');
        return {
            reglage: state.previewDeviceMode,
            classes: gl ? gl.className : '',
            l: gl ? Math.round(gl.getBoundingClientRect().width) : 0
        };
    });
    // Le bouton vit dans l'en-tête du jeu ; on déclenche son gestionnaire.
    await s.page.evaluate(() => {
        const b = document.getElementById('btn-toggle-demo');
        if (b) b.click();
    });
    await dormir(2000);
    const apres = await s.page.evaluate(() => {
        const gl = document.getElementById('game-layer');
        return {
            classes: gl ? gl.className : '',
            l: gl ? Math.round(gl.getBoundingClientRect().width) : 0,
            enDemo: !!(document.getElementById('demo-overlay-banner') || {}).offsetParent
        };
    });
    const ok = avant.l > 0 && avant.l === apres.l;
    if (!ok) ratés++;
    console.log(`${ok ? vert('✓') : rouge('✗')} appareil=${appareil.padEnd(7)}`
        + ` · le volet règle « ${avant.reglage} »`
        + ` · exercice ${String(avant.l).padStart(4)} px → robot ${String(apres.l).padStart(4)} px`
        + gris(`   ${apres.classes}`));
}

if (s.erreurs.length || s.fenetresNatives.length) ratés++;
console.log(`\nerreurs de page : ${s.erreurs.length} · fenêtres natives : ${s.fenetresNatives.length}`);
s.erreurs.slice(0, 4).forEach((e) => console.log(gris('   ' + e)));
await s.fermer();
console.log(ratés ? rouge(`\n${ratés} raté(s).`) : vert('\nLE ROBOT JOUE DANS L\'APPAREIL CHOISI.'));
process.exit(ratés ? 1 : 0);
