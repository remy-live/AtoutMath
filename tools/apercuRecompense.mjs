// L'APERÇU D'UNE ÉTAPE MONTRE L'ÉTAPE — le geste de Rémy, refait à l'écran.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/apercuRecompense.mjs
//
// RÉMY, 31 octobre : « quand on met role de l'étape jeu de récompense et que je
// mets l'apercu (en mode professeur), il me montre le monde avec tous les
// exercices et non le jeu ».
//
// CE QUE L'ÉPREUVE NE PEUT PAS DIRE. `tests/apercuRecompense.test.mjs` éprouve
// la RÈGLE — l'accesseur `avecCarte` — et c'est elle qui portait le défaut.
// Mais une règle juste ne garantit pas l'écran : entre la décision et le jeu
// il y a le bouton d'aperçu, le parcours courant, et la couche de jeu. On
// clique donc le bouton, et l'on demande à la page ce qu'elle montre.

import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const s = await ouvrirSonde({ largeur: 1280, hauteur: 900 });
await s.identifier();
let fautes = 0;
const dire = (q, ok, d = '') => { if (!ok) fautes++;
    console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${q}${d ? ' — ' + d : ''}`); };

// UN PARCOURS COMME LE SIEN : du travail, puis un jeu de récompense. C'est la
// présence de la récompense qui forçait la carte, donc le parcours doit en
// porter une — un parcours ordinaire n'aurait rien mesuré.
await s.page.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    state.currentPathId = null;
    state.currentPath = {
        id: 'path_essai_recompense', version: 2, name: 'Essai récompense',
        policy: {}, steps: [
            { exerciseId: 'calc-add', nbItems: 3 },
            { exerciseId: 'calc-sub', nbItems: 3 },
            { exerciseId: 'logi-pentaminos', nbItems: 1, bonus: true, facultatif: true }
        ]
    };
    // ET L'ON REDESSINE LA LISTE : poser `currentPath` ne redessine rien, et
    // une sonde qui ne voit pas les boutons se replie sur un appel interne —
    // c'est-à-dire qu'elle cesse de mesurer le chemin de Rémy au moment précis
    // où elle croit le mesurer.
    const { renderTeacherPath } = await import('./js/ui/builder.js');
    renderTeacherPath();
});
await dormir(500);

const ecran = () => s.page.evaluate(() => {
    const couche = document.getElementById('game-layer');
    const dedans = (sel) => couche ? couche.querySelectorAll(sel).length : 0;
    return {
        // La carte du parcours : ses étapes sont des cartes cliquables.
        carte: dedans('.run-map, .run-map-step, [data-carte]'),
        // L'étape elle-même : une question, un plateau, une aire de jeu.
        etape: dedans('.game-question, .pn-layout, canvas, .game-area'),
        titre: ((couche && couche.textContent) || '').replace(/\s+/g, ' ').trim().slice(0, 90)
    };
});

// ON CLIQUE LE BOUTON D'APERÇU DE LA TROISIÈME ÉTAPE, et non une fonction
// interne : c'est ce bouton-là que Rémy presse.
const boutons = await s.page.$$('.path-step [data-apercu], .path-step .path-step-preview,'
    + ' .path-step button[title*="perçu"], .path-step button[aria-label*="perçu"]');
console.log(`boutons d'aperçu à l'écran : ${boutons.length}`);
if (boutons.length >= 3) {
    await boutons[2].click();
} else {
    // Repli explicite, et dit : si le bouton n'est pas là, on mesure quand même
    // le chemin, mais on sait qu'on n'a pas mesuré le bouton.
    console.log('  (le bouton n\'a pas été trouvé : on passe par `testStep`)');
    await s.page.evaluate(async () => {
        const { Runner } = await import('./js/core/runner.js');
        const { state } = await import('./js/core/state.js');
        new Runner({ path: state.currentPath, startIndex: 2,
            allowStepNavigation: true, apercuDUneEtape: true }).start();
    });
}
await dormir(1600);

const vu = await ecran();
console.log(`   écran : carte=${vu.carte}, étape=${vu.etape}`);
console.log(`   texte : « ${vu.titre} »`);
dire('l\'aperçu de la récompense n\'ouvre PAS le monde', vu.carte === 0,
    vu.carte ? `${vu.carte} morceau(x) de carte` : '');
dire('et il ouvre bien le jeu', vu.etape > 0,
    vu.etape ? '' : 'rien d\'une activité à l\'écran');
await s.page.screenshot({ path: 'tools/tmp/apercu-recompense.png' });

console.log(`\nerreurs de page : ${s.erreurs.length}, fenêtres natives : ${s.fenetresNatives.length}`);
s.erreurs.slice(0, 3).forEach(e => console.log('  ! ' + e));
fautes += s.erreurs.length + s.fenetresNatives.length;
console.log(fautes ? `\n${fautes} chose(s) à regarder.` : '\nTOUT PASSE.');
await s.fermer();
process.exitCode = fautes ? 1 : 0;
