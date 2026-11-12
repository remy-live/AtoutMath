// CE QUE RÉMY TROUVE QUAND IL CHERCHE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « il n'y a pas d'addition de fraction avec dénominateur multiple ou
// ppcm non ? »
//
// IL Y EN AVAIT. Le logiciel savait le faire depuis août. Mais en tapant
// « addition de fractions » dans la fenêtre de choix, le PREMIER résultat est
// « Addition de Fractions », qui ne faisait alors que le même dénominateur ;
// celui qui va jusqu'au PPCM s'appelle « Poser une Addition de Fractions » et
// arrivait en troisième — et son titre s'entend comme une variante de
// présentation, pas comme un champ plus large.
//
// UN EXERCICE QU'ON NE TROUVE PAS N'EXISTE PAS. C'est une question que ni
// `npm test` ni le bout en bout ne posent : ils vérifient que le catalogue est
// juste, pas qu'il est TROUVABLE. Elle se pose à chaque fois qu'on ajoute un
// exercice, qu'on en élargit un, ou que Rémy demande si quelque chose existe.
//
//     node tools/trouverUnExercice.mjs ppcm "addition de fractions"
//     node tools/trouverUnExercice.mjs            # quelques mots de fractions
import { ouvrirSonde } from './sonde.mjs';

const mots = process.argv.slice(2).filter(Boolean);
const AChercher = mots.length ? mots : [
    'addition de fractions', 'ppcm', 'dénominateur commun', 'même dénominateur'
];

const s = await ouvrirSonde({ largeur: 1280, hauteur: 900 });
await s.identifier();

// LA FENÊTRE DE CHOIX PAR SA PORTE, SINON PAR SON MODULE. Les deux boutons qui
// l'ouvrent (`#btn-choisir-exo` et celui de l'état vide) ne sont pas toujours
// dans l'écran courant ; le module, lui, l'est toujours.
await s.page.evaluate(() => {
    const b = document.querySelector('#btn-choisir-exo, #btn-choisir-exo-vide');
    if (b) b.click();
});
await s.page.waitForTimeout(400);
if (!await s.page.evaluate(() => !!document.querySelector('.cx2-recherche'))) {
    await s.page.evaluate(async () => {
        const m = await import('/js/ui/choisirExercice.js?v=' + Date.now());
        m.ouvrirChoixExercice({ ajouter: () => {} });
    });
    await s.page.waitForTimeout(700);
}
await s.doitExister('.cx2-recherche');

for (const mot of AChercher) {
    await s.page.fill('.cx2-recherche', mot);
    // La liste se refait au fil de la frappe : on lui laisse le temps.
    await s.page.waitForTimeout(350);
    const titres = await s.page.evaluate(() => [...document.querySelectorAll('.cx2-item')]
        .map(li => li.querySelector('.cx2-titre')?.textContent?.trim()).filter(Boolean));
    console.log(`\n« ${mot} » → ${titres.length} exercice(s)`);
    titres.slice(0, 10).forEach((t, i) => console.log(`  ${i + 1}. ${t}`));
    if (titres.length > 10) console.log(`  … et ${titres.length - 10} autres`);
}

console.log(`\nerreurs de page : ${s.erreurs.length} · fenêtres natives : ${s.fenetresNatives.length}`);
for (const e of s.erreurs.slice(0, 4)) console.log('  !', e);
await s.fermer();
