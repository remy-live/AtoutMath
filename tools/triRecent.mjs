// LE TRI « RÉCENT » DE « MES PARCOURS » — ouvrir n'est pas modifier.
//
//   node tools/triRecent.mjs
//
// Rémy : « dans le tri, le récent n'est pas forcément le plus récent ».
// MESURÉ le 26 novembre : « Tri A » puis « Tri B » enregistrés, B en tête ; on
// OUVRE A sans rien y toucher, et A passait devant — l'enregistrement
// automatique, qui part à chaque redessin du constructeur, remettait sa date à
// l'heure de l'ouverture.
//
// La sonde exige :
//   · qu'ouvrir A sans rien changer laisse B en tête, et la date de A intacte ;
//   · qu'une VRAIE modification de A (son nombre de questions) le remonte en tête.

import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const s = await ouvrirSonde({ largeur: 1440, hauteur: 900 });
const echecs = [];
const exiger = (vrai, quoi) => { if (!vrai) echecs.push(quoi); };
const liste = () => s.page.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    const { renderPathBrowser } = await import('./js/ui/builder.js');
    renderPathBrowser();
    await new Promise((r) => setTimeout(r, 300));
    const ordre = [...document.querySelectorAll('.path-browser-item')]
        .map((e) => (e.textContent.match(/Tri [AB]/) || [''])[0]).filter(Boolean);
    const dates = Object.fromEntries(state.teacherPaths.filter((p) => /^Tri [AB]$/.test(p.name))
        .map((p) => [p.name, p.timestamp]));
    return { ordre, dates };
});

try {
    await s.identifier();
    await s.page.evaluate(async () => {
        const { state } = await import('./js/core/state.js');
        const { makePath, makeStep } = await import('./js/core/path.js');
        for (const n of ['Tri A', 'Tri B']) {
            state.saveTeacherPath(n, makePath(n, [makeStep('calc-add', {})]));
            await new Promise((r) => setTimeout(r, 1200));
        }
    });
    const avant = await liste();
    console.log(`A puis B enregistrés : ${avant.ordre.join(', ')}`);
    exiger(avant.ordre[0] === 'Tri B', 'B, le dernier enregistré, n\'est pas en tête');

    await s.page.evaluate(() => [...document.querySelectorAll('.path-browser-item')]
        .find((e) => e.textContent.includes('Tri A')).click());
    await dormir(1500);
    const ouvert = await liste();
    console.log(`A ouvert, rien changé : ${ouvert.ordre.join(', ')}`);
    exiger(ouvert.ordre[0] === 'Tri B', 'ouvrir A sans rien changer l\'a remonté en tête');
    exiger(ouvert.dates['Tri A'] === avant.dates['Tri A'], 'ouvrir A a changé sa date');

    // Une VRAIE modification : le nombre de questions de sa première étape.
    await s.page.evaluate(() => document.querySelector('.path-step').click());
    await dormir(1400);
    await s.page.click('#cfg-nbitems', { clickCount: 3 });
    await s.page.keyboard.type('12');
    await dormir(800);
    await s.page.keyboard.press('Escape');
    await dormir(800);
    const modifie = await liste();
    console.log(`A modifié : ${modifie.ordre.join(', ')}`);
    exiger(modifie.ordre[0] === 'Tri A', 'une vraie modification de A ne l\'a pas remonté en tête');
    exiger(!s.erreurs.length, `erreurs de page : ${s.erreurs.join(' | ')}`);
} finally { await s.fermer(); }

if (echecs.length) {
    console.log('\nÉCHEC :');
    echecs.forEach((e) => console.log('  ✘', e));
    process.exit(1);
}
console.log('\n« RÉCENT » VEUT DIRE MODIFIÉ, PAS OUVERT.');
