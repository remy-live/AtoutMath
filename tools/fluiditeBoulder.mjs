// BOULDER DASH : LE CLAVIER EST-IL LABORIEUX ?
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « je trouve que boulder dash pour les touches c'est laborieux et peu
// fluide ».
//
// DEUX CHOSES SE MESURENT, ET ELLES NE SE DEVINENT PAS :
//
//   1. LA LATENCE DU PREMIER PAS. Le monde avance par tics ; une touche
//      pressée juste après un tic attend le suivant. C'est la sensation de
//      lourdeur : on appuie, et il ne se passe rien pendant un instant.
//   2. LA CADENCE TOUCHE TENUE. Combien de cases par seconde quand on ne lâche
//      pas la flèche.
//
// ON LIT L'ÉTAT DU JEU, pas les pixels : `s.etatDuJeu(['etat.c', 'etat.r'])`
// dit où est le joueur, au moment où on le demande.
//
//     node tools/fluiditeBoulder.mjs
import { ouvrirSonde } from './sonde.mjs';

const s = await ouvrirSonde({ largeur: 1280, hauteur: 900 });
await s.identifier();
await s.ouvrirExercice('jeu-boulder-dash');
await s.doitExister('.bd-toile');

const ou = async () => {
    const e = await s.etatDuJeu(['etat.c', 'etat.r']);
    return e ? { c: e['etat.c'], r: e['etat.r'] } : null;
};

const depart = await ou();
console.log('le joueur est en', JSON.stringify(depart));
if (!depart) { console.log('PAS D’ÉTAT LISIBLE'); await s.fermer(); process.exit(1); }

// ── 1. LA LATENCE DU PREMIER PAS ────────────────────────────────────────────
//
// On appuie, puis on regarde toutes les 8 ms jusqu'à ce que la case change.
// On recommence plusieurs fois : la latence dépend de l'instant où l'on tombe
// dans le tic, et c'est la PIRE qui se sent.
const latences = [];
for (let i = 0; i < 8; i++) {
    const avant = await ou();
    const t0 = Date.now();
    await s.page.keyboard.down('ArrowRight');
    let bouge = null;
    while (Date.now() - t0 < 700) {
        const p = await ou();
        if (p.c !== avant.c || p.r !== avant.r) { bouge = Date.now() - t0; break; }
        await s.page.waitForTimeout(8);
    }
    await s.page.keyboard.up('ArrowRight');
    await s.page.waitForTimeout(120);
    if (bouge !== null) latences.push(bouge);
    // On revient sur ses pas pour ne pas sortir du tableau.
    await s.page.keyboard.down('ArrowLeft');
    await s.page.waitForTimeout(200);
    await s.page.keyboard.up('ArrowLeft');
    await s.page.waitForTimeout(120);
}
latences.sort((a, b) => a - b);
console.log(`\nlatence du premier pas, sur ${latences.length} essais :`);
console.log(`  la plus courte ${latences[0]} ms · médiane ${latences[Math.floor(latences.length / 2)]} ms`
    + ` · LA PIRE ${latences[latences.length - 1]} ms`);

// ── 2. LA CADENCE TOUCHE TENUE ──────────────────────────────────────────────
// ON COMPTE LES CHANGEMENTS DE CASE, PAS LA DISTANCE PARCOURUE. Première
// version : la distance entre le départ et l'arrivée — et elle plafonnait au
// MUR. Le mineur butait contre le bord après dix cases, et la mesure annonçait
// la vieille cadence quoi qu'on règle. Un aller-retour, lui, ne bute jamais.
let pas = 0;
let avantP = await ou();
const t1 = Date.now();
for (const sens of ['ArrowRight', 'ArrowLeft', 'ArrowRight', 'ArrowLeft']) {
    await s.page.keyboard.down(sens);
    const jusqua = Date.now() + 380;
    while (Date.now() < jusqua) {
        const p = await ou();
        if (p.c !== avantP.c || p.r !== avantP.r) { pas++; avantP = p; }
        await s.page.waitForTimeout(8);
    }
    await s.page.keyboard.up(sens);
}
const ms = Date.now() - t1;
console.log(`\ncadence touche tenue : ${pas} pas en ${ms} ms`
    + ` \u2192 ${(pas / (ms / 1000)).toFixed(1)} cases par seconde`
    + ` (un pas toutes les ${Math.round(ms / Math.max(1, pas))} ms)`);

console.log('\nerreurs de page :', s.erreurs.length, '· fenêtres natives :', s.fenetresNatives.length);
await s.fermer();
