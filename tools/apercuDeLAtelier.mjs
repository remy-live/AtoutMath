// L'ATELIER : SES VOLETS SUIVENT-ILS LE CHOIX D'APPAREIL DU PROFESSEUR ?
//
// Rémy : « j'avais mis l'aperçu en mode ordinateur, quand j'ai cliqué sur le
// robot, l'aperçu est passé en mode téléphone » — dans l'Atelier.
//
// CE QUE LA MESURE A TROUVÉ, et c'était plus large que le robot : page mère à
// « desktop », les DEUX volets à « mobile ». Chaque volet est un CADRE, avec
// son propre `core/state.js` ; `cadreDe()` y lit `previewDeviceMode`, qui vaut
// « mobile » au démarrage, et personne ne clique les boutons d'aperçu DANS le
// cadre. Le choix ne pouvait pas voyager. Il passe maintenant par l'adresse.
//
// ON GARDE CET OUTIL parce qu'un cadre dans un cadre se re-cassera : c'est le
// genre de lien qu'une refonte de l'Atelier emporte sans qu'aucune épreuve de
// `npm test` ne s'en aperçoive — elles ne montent pas de navigateur.
//
//   node tools/apercuDeLAtelier.mjs            (ordinateur)
//   node tools/apercuDeLAtelier.mjs mobile
//   node tools/apercuDeLAtelier.mjs tablet
//
// CE QU'IL DIT : la largeur de la couche de jeu dans chaque volet. Trois
// mesures apprises à leurs dépens sont encodées ici — lire le MENEUR et non le
// réglage, attendre la LARGEUR et non la présence de `#game-layer` (qui est
// dans le document dès le départ, à zéro pixel), et ne pas compter les
// secondes.
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const s = await ouvrirSonde({ largeur: 1440, hauteur: 900 });
await s.identifier();
const p = s.page;

// LE CHOIX EST UN PARAMÈTRE DE LA MESURE : un volet qui serait TOUJOURS en
// plein écran passerait le premier essai sans suivre quoi que ce soit.
const QUOI = process.argv[2] || 'desktop';
const choisi = await p.evaluate((q) => {
    const b = document.getElementById('preview-mode-' + q);
    if (!b) return 'bouton absent : ' + q;
    b.click();
    return null;
}, QUOI);
if (choisi) { console.log('  ' + choisi); }
await dormir(200);
console.log(`  le professeur choisit : ${QUOI}`);
const dansLaMere = await p.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    return { mode: state.previewDeviceMode, prof: !!state.isTeacherMode };
});
console.log(`  page mère : previewDeviceMode = ${JSON.stringify(dansLaMere.mode)}`
    + ` · mode professeur : ${dansLaMere.prof}`);

// 2. On ouvre l'Atelier sur un exercice.
const ouvert = await p.evaluate(async () => {
    const m = await import('./js/ui/atelier.js');
    if (!m.ouvrirAtelier) return 'ouvrirAtelier absent';
    m.ouvrirAtelier('calc-add');
    return null;
});
if (ouvert) { console.log('  ' + ouvert); await s.fermer(); process.exit(1); }
await dormir(4500);

// 3. Que voit-on dans chaque volet ?
//
// ON MESURE CE QUE L'OEIL VOIT : la largeur de la couche de jeu à l'intérieur
// du cadre. Deux sondes précédentes ont échoué à lire l'état du module dans le
// cadre — l'une lisait le mauvais réglage, l'autre tombait sur un volet pas
// encore monté une fois sur trois. La largeur, elle, est ce que Rémy voit, et
// `frameLocator` attend que l'élément existe au lieu de compter les secondes.
for (const [sel, nom] of [['#atl-jeu', 'le jeu'], ['#atl-robot', 'le robot']]) {
    const cadre = p.frameLocator(sel);
    const couche = cadre.locator('#game-layer');
    let large = null, fenetre = null;
    // `#game-layer` EST DANS LE DOCUMENT DÈS LE DÉPART, largeur nulle tant
    // qu'aucun jeu n'est monté. Attendre sa PRÉSENCE rendait donc la main
    // immédiatement, et l'on mesurait zéro à tous les coups. On attend sa
    // LARGEUR — c'est-à-dire la chose même qu'on est venu mesurer.
    for (let essai = 0; essai < 60 && !large; essai++) {
        try {
            const m = await couche.evaluate((el) => ({
                couche: Math.round(el.getBoundingClientRect().width),
                fenetre: Math.round(window.innerWidth)
            }));
            if (m.couche > 0) { large = m.couche; fenetre = m.fenetre; break; }
        } catch (e) { /* le cadre n'est pas encore là */ }
        await dormir(300);
    }
    if (large === null) { console.log(`  ${nom.padEnd(9)} volet non monté`); continue; }
    const cadreInterieur = large > 0 && large < fenetre - 8;
    console.log(`  ${nom.padEnd(9)} couche ${large} px dans un cadre de ${fenetre} px`
        + `  →  ${cadreInterieur ? 'un cadre d\'appareil est posé dedans' : 'plein écran'}`);
}

console.log(`\nerreurs de page : ${s.erreurs.length}`);
s.erreurs.slice(0, 3).forEach(x => console.log('    ' + x));
await s.fermer();
