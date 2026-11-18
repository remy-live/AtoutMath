// LES PETITES AILES SUR LE CHEMIN DE L'ÉLÈVE — le vide, la chute, l'appui.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 18 novembre : « Dans le jeu tiny wings quand on changeait de monde, il
// fallait faire un long vol plané car le monde d'avant se terminait et le monde
// d'après commençait plus loin et il était plus réactif. Là même en ne faisant
// rien, on gagne quand même et l'appui donnait vraiment une accélération ».
//
// ── POURQUOI UNE SONDE, ALORS QUE `tests/petitesAiles.test.mjs` MESURE DÉJÀ ──
//
// Les épreuves simulent `pas()` en boucle : elles disent que la PHYSIQUE est
// juste. Elles ne peuvent rien dire des trois choses que Rémy a vues, parce
// qu'aucune ne vit dans la physique :
//
//   · le vide se VOIT — il y a une mer au fond, dessinée par `dessiner`, et un
//     relief découpé autour ; une boucle de simulation ne regarde pas l'écran ;
//   · la chute se DIT — « Tu es tombé dans le vide », avec son remède en une
//     phrase ; c'est `terminer('chute')`, dans le jeu, pas dans le noyau ;
//   · l'appui s'enfonce avec le DOIGT ou la BARRE D'ESPACE, et ce chemin-là
//     passe par `surTouche`, `demarre`, la boucle d'animation et le canevas.
//
// Et surtout : « ne rien faire » n'a de sens que sur le chemin de l'élève. Dans
// une boucle, c'est `() => false` ; sur une tablette, c'est un élève qui pose
// le doigt une fois pour lancer la partie, puis le retire — et c'est CELA qu'il
// faut perdre.
//
//     node tools/volPlaneDesAiles.mjs
//     node tools/volPlaneDesAiles.mjs --photos
//
// ── CE QU'ON NE MESURE PAS ICI, ET POURQUOI ────────────────────────────────
//
// Le « bon geste » (plonger dans la descente, lâcher avant la crête) demande de
// connaître la pente sous l'oiseau, que l'écran ne donne pas. Il est mesuré là
// où il peut l'être, dans `tests/petitesAiles.test.mjs` et
// `tools/volDesAiles.mjs`. Ici on mesure les deux gestes qu'un élève peut
// faire SANS rien savoir : ne rien faire, et appuyer sans arrêt.

import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const photos = process.argv.includes('--photos');
let rates = 0;
const dire = (quoi, bon, detail = '') => {
    if (!bon) rates++;
    console.log(`  ${bon ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${quoi}`
        + (detail ? ` \x1b[2m— ${detail}\x1b[0m` : ''));
};

const s = await ouvrirSonde({ largeur: 1180, hauteur: 820 });
await s.identifier();

/** Les mètres affichés au tableau de bord — c'est ce que l'élève lit. */
const metres = () => s.page.evaluate(() => {
    const t = (document.getElementById('pa-score') || {}).textContent || '';
    const m = t.match(/(-?\d+)\s*m/);
    return m ? Number(m[1]) : null;
});

/** Le titre de l'écran de fin, s'il est affiché. */
const finVue = () => s.page.evaluate(() => {
    const el = document.getElementById('pa-fin');
    if (!el || !el.classList.contains('pa-fin--vu')) return null;
    return {
        titre: (document.getElementById('pa-fin-titre') || {}).textContent || '',
        texte: (document.getElementById('pa-fin-texte') || {}).textContent || ''
    };
});

/**
 * Une partie neuve.
 *
 * ON RELANCE PAR « REJOUER », PAS EN RÉOUVRANT L'EXERCICE : c'est le bouton de
 * l'élève, et il remet l'état à zéro sans recharger la page — donc sans perdre
 * les erreurs de page qu'on compte depuis le début.
 */
async function nouvellePartie(premiere) {
    if (premiere) {
        // ── ON LAISSE LE COMPTE DE QUESTIONS DU CATALOGUE ────────────────
        //
        // MESURÉ : avec `{ questions: 1 }`, la traversée du premier monde
        // SUFFIT à solder l'étape, et le meneur recouvre l'écran de fin du jeu
        // une seconde après la chute — l'élève lit « 🏆 Sans faute ! » là où il
        // vient de tomber à la mer, et le remède qu'on vient d'écrire n'est
        // jamais lu. Huit parties, c'est ce que le catalogue demande, et c'est
        // le chemin de l'élève.
        const ennui = await s.ouvrirExercice('jeu-petites-ailes');
        if (ennui) { dire('l\'exercice s\'ouvre', false, String(ennui)); return false; }
        await s.doitExister('#pa-toile');
        await s.doitExister('#pa-score');
    } else {
        await s.doitExister('#pa-rejouer');
        await s.page.click('#pa-rejouer');
    }
    await s.page.waitForTimeout(500);
    return true;
}

/** LE PREMIER APPUI LANCE LA PARTIE — c'est le même que celui qui fait plonger. */
async function lancer() {
    await s.page.keyboard.down('Space');
    await s.page.waitForTimeout(90);
    await s.page.keyboard.up('Space');
}

console.log('\n\x1b[1mNE RIEN FAIRE DOIT FAIRE PERDRE, ET SE VOIR\x1b[0m');
if (!await nouvellePartie(true)) { await s.fermer(); process.exit(1); }
await lancer();
// ON ATTEND LA FIN, ET L'ON COMPTE LES SECONDES : Rémy a reposé la tablette en
// disant « on ne perd pas ». Une défaite qui arrive au bout de quatre-vingt-dix
// secondes n'est pas une défaite, c'est une rumeur.
let fin = null, attendu = 0;
for (let i = 0; i < 70 && !fin; i++) {
    await dormir(500); attendu += 0.5;
    fin = await finVue();
}
dire('la partie se termine toute seule', !!fin, `au bout de ${attendu.toFixed(1)} s`);
dire('et assez vite pour qu\'un élève le voie', !!fin && attendu < 40,
    `${attendu.toFixed(1)} s, pour 40 de patience`);
if (fin) {
    // LA CAUSE SE DIT, ET C'EST LE VIDE. « on gagne quand même » : il n'y avait
    // rien à manquer. Maintenant il y a un trou, et c'est lui qui gagne.
    dire('on perd DANS LE VIDE, et l\'écran le nomme', /vide/i.test(fin.titre),
        `« ${fin.titre} »`);
    // ET LE REMÈDE EST LÀ : un écran qui dit « perdu » sans dire quoi faire
    // laisse l'élève croire qu'il a manqué de chance.
    dire('et il dit quoi faire la prochaine fois',
        /tremplin/i.test(fin.texte) && /plonge/i.test(fin.texte),
        `« ${fin.texte.slice(0, 120)} »`);
}
// ── ET L'ÉCRAN DE FIN RESTE ASSEZ LONGTEMPS POUR ÊTRE LU ─────────────────
//
// Un remède en une phrase qui disparaît en une seconde n'est pas un remède.
// C'est mesuré parce que c'est arrivé : avec une étape d'une seule question, le
// meneur recouvre cet écran au bout d'une seconde.
if (fin) {
    await dormir(3000);
    const encore = await finVue();
    dire('l\'écran de fin reste à l\'écran le temps de le lire',
        !!encore && /vide/i.test(encore.titre), encore ? '3 s plus tard, toujours là'
            : 'il a disparu au bout de 3 s');
}
if (photos) await s.photo('#pa-toile', 'tools/tmp/ailes-chute.png');

console.log('\n\x1b[1mL\'APPUI EST UNE VRAIE ACCÉLÉRATION\x1b[0m');
// ── LA MESURE QUI DISCRIMINE, ET LE PIÈGE QU'ELLE ÉVITE ───────────────────
//
// On compare deux parties sur le MÊME paysage et la MÊME durée : doigt levé
// contre doigt posé. Comparer deux instants d'une seule partie ne dirait rien —
// l'oiseau accélère dans les descentes de toute façon.
//
// ET L'ON MESURE AVANT LE PREMIER VIDE : au-delà, celui qui ne fait rien tombe
// à la mer, et l'on comparerait un vivant à un noyé.
const DUREE = 6;
const course = async (appuie) => {
    await nouvellePartie(false);
    await lancer();
    if (appuie) await s.page.keyboard.down('Space');
    await dormir(DUREE * 1000);
    const m = await metres();
    if (appuie) await s.page.keyboard.up('Space');
    return m;
};
const sansRien = await course(false);
const enAppuyant = await course(true);
dire('le tableau de bord compte les mètres',
    Number.isFinite(sansRien) && Number.isFinite(enAppuyant),
    `${sansRien} m contre ${enAppuyant} m`);
// LE SEUIL EST À 1,2, ET IL VIENT DE LA MESURE : dans le premier monde, la
// simulation donne 476 px/s à qui appuie sans arrêt contre 298 à qui ne touche
// à rien, soit 1,6 (`node tools/allureDesMondes.mjs`). On demande moins que
// cela — le chemin de l'élève passe par une image à 60 Hz qui peut sauter —,
// mais on demande que ce soit VISIBLE : un cinquième de distance en plus.
dire('et appuyer mène VISIBLEMENT plus loin, à durée égale',
    Number.isFinite(sansRien) && Number.isFinite(enAppuyant)
        && enAppuyant > sansRien * 1.2,
    `${enAppuyant} m contre ${sansRien} m en ${DUREE} s, soit `
    + `${(enAppuyant / Math.max(1, sansRien)).toFixed(2)} fois`);
if (photos) await s.photo('#pa-toile', 'tools/tmp/ailes-appui.png');

console.log('\n\x1b[1mET RIEN NE CASSE\x1b[0m');
dire('aucune erreur de page', s.erreurs.length === 0, s.erreurs.slice(0, 2).join(' | '));
dire('aucune fenêtre native', s.fenetresNatives.length === 0,
    s.fenetresNatives.slice(0, 2).join(' | '));

await s.fermer();
console.log('\n' + '─'.repeat(64));
console.log(rates ? `\n${rates} POINT(S) À REVOIR.`
    : '\nLE VIDE SE VOIT, NE RIEN FAIRE PERD, ET L\'APPUI POUSSE.');
process.exit(rates ? 1 : 0);
