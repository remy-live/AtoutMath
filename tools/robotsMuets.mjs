// QUEL ROBOT EXPLIQUE UN GESTE QUE PERSONNE NE VOIT FAIRE ?
//
// Rémy, capture d'iPhone sur « Le Canon des Compléments » : « bug avec le
// robot ». Terrain noir et vide, « Niveau undefined », aucun cœur — pendant que
// le robot expliquait « un boulet approche, je cherche son complément à 100 ».
//
// LA CAUSE EST UNE LIGNE DE `BaseGame`, ET ELLE EST EXCLUSIVE :
//
//     if (this.isDemo) this.runDemoSequence();
//     else this.startGameLoop();
//
// Un robot qui n'appelle pas `startGameLoop` lui-même parle donc devant un
// décor mort, avec les champs que cette méthode aurait posés restés vides. RIEN
// N'ÉCHOUE : pas d'erreur, pas de page blanche, juste une leçon qui ne montre
// rien. C'est exactement le genre de défaut qu'aucun essai unitaire ne voit et
// qu'un élève ne signalera pas — il croira que c'est normal.
//
//   node tools/robotsMuets.mjs                    (tous les jeux qui ont un robot)
//   node tools/robotsMuets.mjs calc-nova num-ninja
//
// ─────────────────────────────────────────────────────────────────────────────
//
// DEUX SIGNES, ET UN SEUL EST UN VERDICT. C'est la leçon de la première
// version, qui a crié au loup sur quatre jeux sains :
//
//   · LE TEXTE — un « undefined » ou un « NaN » à l'écran est une certitude :
//     un champ que personne n'a posé. C'est LUI qui décide.
//   · LE MOUVEMENT — compté en mutations du DOM. Il se lit, il ne juge pas,
//     et il a DEUX angles morts qu'il faut connaître pour ne pas se tromper :
//
//       · UN JEU PEINT SUR UN <canvas> NE MUTE RIEN. « L'Escadrille » affichait
//         1 mutation en neuf secondes et son robot marche parfaitement : tout
//         se passe dans un contexte 2D, invisible au DOM. Une mesure qui ne sait
//         pas ce qu'elle regarde compte zéro et conclut « figé » ;
//       · UNE DÉMONSTRATION DE CLICS sur une grille immobile — le démineur,
//         les diviseurs — ne bouge presque pas non plus, et c'est normal :
//         le curseur du robot vit sur <body>, hors du plateau observé.
//
// Le chiffre est donc imprimé pour qu'on aille regarder, jamais pour condamner.

import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const CHOISIS = process.argv.slice(2).filter(a => !a.startsWith('--'));
/** En dessous, on invite à aller voir de ses yeux — on n'accuse pas. */
const PEU = 12;

const s = await ouvrirSonde({ largeur: 390, hauteur: 844 });
await s.identifier();

const liste = await s.page.evaluate(async (choisis) => {
    const { exercices } = await import('./js/data/catalog.js');
    const tous = exercices.map(e => e.id);
    return choisis.length ? tous.filter(id => choisis.includes(id)) : tous;
}, CHOISIS);

console.log(`${liste.length} exercice(s) · le robot de chacun, neuf secondes\n`);
let fautifs = 0, regarder = 0, sansRobot = 0;

for (const id of liste) {
    const ouvert = await s.page.evaluate(async (exoId) => {
        const { getExerciseById } = await import('./js/data/catalog.js');
        const { openDemo } = await import('./js/games/engine.js');
        // ON ÉTEINT LE ROBOT PRÉCÉDENT AVANT D'EN ALLUMER UN AUTRE.
        //
        // Sans cela, ses minuteurs continuent de tourner et écrivent dans des
        // éléments que la démonstration suivante vient de remplacer : « Cannot
        // set properties of null (setting 'textContent') ». MESURÉ — l'erreur
        // n'apparaissait qu'en série, jamais en ouvrant un seul robot, ce qui
        // la désignait clairement comme un défaut de la SONDE et non du
        // logiciel. On a failli la rapporter comme un bogue du produit.
        const { clearEngines } = await import('./js/core/timers.js');
        const { destroyAllDemoCursors } = await import('./js/core/demoPointer.js');
        try { clearEngines(); destroyAllDemoCursors(); } catch (e) { /* rien à éteindre */ }
        await new Promise(ok => setTimeout(ok, 220));
        const exo = getExerciseById(exoId);
        if (!exo) return false;
        openDemo(exo);
        return true;
    }, id);
    if (!ouvert) { sansRobot++; continue; }

    await dormir(900);
    await s.page.evaluate(() => {
        window.__mut = 0;
        const c = document.querySelector('#game-layer .canvas-area')
            || document.getElementById('game-layer');
        window.__obs = new MutationObserver(ms => { window.__mut += ms.length; });
        window.__obs.observe(c, { childList: true, subtree: true, attributes: true });
    });
    await dormir(9000);

    const v = await s.page.evaluate(() => {
        if (window.__obs) window.__obs.disconnect();
        const t = (document.getElementById('game-layer') || {}).innerText || '';
        // LE <canvas> SE DÉCLARE : on ne compare pas un jeu peint à un jeu écrit.
        const canevas = !!document.querySelector('#game-layer canvas');
        return {
            mut: window.__mut,
            canevas,
            trou: (t.match(/[^\n]*(undefined|NaN)[^\n]*/) || [null])[0]
        };
    });

    if (v.trou) {
        fautifs++;
        console.log(`  \x1b[31mUN TROU\x1b[0m  ${id.padEnd(24)} « ${v.trou.trim().slice(0, 46)} »`);
    } else if (!v.canevas && v.mut < PEU) {
        regarder++;
        console.log(`  \x1b[33mà voir \x1b[0m  ${id.padEnd(24)} ${String(v.mut).padStart(5)} mutations`
            + ' — clics sur une grille immobile, ou robot figé : il faut regarder');
    }
}

console.log(`\n${liste.length - sansRobot} robot(s) ouverts`);
console.log(`${fautifs} montrent un champ jamais posé — c'est un défaut, pas un doute`);
console.log(`${regarder} bougent peu SANS être un canevas — à regarder de ses yeux`);
console.log(`erreurs de page : ${s.erreurs.length}`);
if (s.erreurs.length) s.erreurs.slice(0, 4).forEach(e => console.log('    ' + e));
await s.fermer();
process.exit(fautifs ? 1 : 0);
