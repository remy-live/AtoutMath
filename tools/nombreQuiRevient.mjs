// LE NOMBRE DE QUESTIONS QUI « REVIENT À 15 » — un champ d'une AUTRE fenêtre.
//
//   node tools/nombreQuiRevient.mjs
//
// Rémy, 26 novembre : « je change le nombre de questions et dans le parcours ça
// revient à 15 alors que j'avais mis à 9, ça le fait pour plein d'exercices ».
// Chrome, boutons « + » et « − », en fermant la fenêtre. Sa ligne disait
// « ✔ 7/15 » : l'exigence (7) suivait bien les 9 questions, le nombre non.
//
// Douze gestes essayés sur une page NEUVE ne le reproduisaient pas. Ce qui
// manquait à la sonde, c'est ce qu'un professeur a fait avant : lancer un
// exercice depuis le catalogue. La fenêtre « avant de jouer » se CACHE en se
// refermant, elle ne se vide pas — et son champ s'appelle, lui aussi,
// `cfg-nbitems`. Le panneau d'étape relisait par `getElementById`, qui rend le
// PREMIER du document : celui de la fenêtre cachée.
//
// La sonde fait donc le geste d'avant, puis celui de Rémy, au clic.

import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const s = await ouvrirSonde({ largeur: 1440, hauteur: 900 });
const echecs = [];
const exiger = (vrai, quoi) => { if (!vrai) echecs.push(quoi); };

try {
    await s.identifier();

    // 1. LE GESTE D'AVANT : un exercice lancé depuis le catalogue, à 15
    //    questions, puis « Annuler ». La fenêtre se cache, son champ reste.
    await s.page.evaluate(async () => {
        const { getExerciseById } = await import('./js/data/catalog.js');
        const { ouvrirReglagesAvantPartie } = await import('./js/games/configUI.js');
        ouvrirReglagesAvantPartie(getExerciseById('calc-add'), () => {});
    });
    await dormir(600);
    await s.page.evaluate(() => {
        const c = document.querySelector('#student-config-content #cfg-nbitems');
        c.value = '15';
        c.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await s.page.click('#btn-student-config-cancel');
    await dormir(400);

    // 2. LE GESTE DE RÉMY : une étape à 15, ses réglages, six « − », la croix.
    await s.page.evaluate(async () => {
        const { state } = await import('./js/core/state.js');
        const { makePath, makeStep } = await import('./js/core/path.js');
        const { defaultPolicy } = await import('./js/core/policy.js');
        const { renderTeacherPath } = await import('./js/ui/builder.js');
        state.currentPathId = null;
        state.currentPath = makePath('Revient à 15',
            [makeStep('calc-sub', {}, { nbItems: 15, threshold: 11 })], defaultPolicy());
        renderTeacherPath();
    });
    await dormir(700);
    await s.page.click('.path-step');
    await dormir(1400);
    // LA fenêtre d'étape, par ce qu'elle seule contient : le panneau d'étape.
    const fen = '[id^="re-config-"]';
    const moins = `${fen} .cfg-stepper--bout .cfg-step[data-step="-1"]`;
    await s.doitExister(moins);
    for (let i = 0; i < 6; i++) { await s.page.click(moins); await dormir(150); }
    const affiche = await s.page.evaluate(() =>
        document.querySelector('[id^="re-config-"] #cfg-nbitems').value);
    console.log(`À l'écran, dans la fenêtre : ${affiche} questions`);
    const croix = '.modal-overlay:has([id^="re-config-"]) .modal-close-btn';
    await s.doitExister(croix);
    await s.page.click(croix);
    await dormir(800);

    const lu = await s.page.evaluate(async () => {
        const { state } = await import('./js/core/state.js');
        const e = state.currentPath.steps[0];
        const ligne = document.querySelector('.path-step');
        return { nb: e.nbItems, seuil: e.threshold, ligne: ligne ? ligne.textContent.replace(/\s+/g, ' ') : '' };
    });
    console.log(`Enregistré : ${lu.nb} questions, ${lu.seuil} exigées`);
    exiger(Number(affiche) === 9, `six « − » depuis 15 devaient afficher 9, on lit ${affiche}`);
    exiger(lu.nb === 9, `l'étape porte ${lu.nb} questions au lieu de 9 — le champ relu est celui d'une autre fenêtre`);
    exiger(!s.erreurs.length, `erreurs de page : ${s.erreurs.join(' | ')}`);
    exiger(!s.fenetresNatives.length, 'fenêtre native ouverte');
} finally { await s.fermer(); }

if (echecs.length) {
    console.log('\nÉCHEC :');
    echecs.forEach((e) => console.log('  ✘', e));
    process.exit(1);
}
console.log('\nLE NOMBRE DE QUESTIONS EST CELUI DE LA FENÊTRE QU\'ON A SOUS LES YEUX.');
