// LES IMAGES PAR SECONDE QUE LES PETITES AILES TIENNENT — sur le vrai chemin.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// ── POURQUOI ON NE CHRONOMÈTRE PLUS `dessiner()` ───────────────────────────
//
// Premier essai : `performance.now()` autour de deux cents appels. Il rendait
// 0,15 ms par image — c'est-à-dire le temps d'ENREGISTRER les ordres de dessin,
// pas de les peindre : le canevas les exécute plus tard, en bloc. Deuxième
// essai : forcer la peinture par un `getImageData` à chaque image. Il rendait
// 15 ms — c'est-à-dire le coût d'une synchronisation que le jeu ne fait jamais.
// Les deux mesures étaient fausses dans les deux sens, à un facteur cent.
//
// CE QUI NE MENT PAS, c'est de laisser tourner le jeu comme l'élève le voit et
// de compter les images qu'il a réellement peintes en quatre secondes. Dans ce
// conteneur sans carte graphique, il en tient 47 à 54 selon la charge.
//
//     node tools/imagesDesAiles.mjs

import { ouvrirSonde } from './sonde.mjs';
const s = await ouvrirSonde({ largeur: 1320, hauteur: 900 });
await s.identifier();
await s.page.evaluate(async () => {
    const d = document.createElement('div');
    d.id = 'plateau-aile';
    d.style.cssText = 'position:fixed;top:0;left:0;width:1280px;height:760px;z-index:9999';
    document.body.appendChild(d);
    const m = await import('./js/games/petitesAiles.js');
    window.__jeu = m.enginePetitesAiles(d, false, { seed: 'remy' });
    window.__jeu.demarre = true;
});
const r = await s.page.evaluate(() => new Promise((ok) => {
    const j = window.__jeu;
    const dessiner = j.dessiner.bind(j);
    let n = 0, pire = 0;
    j.dessiner = () => { const t = performance.now(); dessiner(); pire = Math.max(pire, performance.now() - t); n++; };
    const t0 = performance.now();
    setTimeout(() => ok({ fps: n / ((performance.now() - t0) / 1000), pire }), 4000);
}));
console.log(`images par seconde tenues : ${r.fps.toFixed(1)} · pire image (JS) : ${r.pire.toFixed(2)} ms`);
await s.fermer();
