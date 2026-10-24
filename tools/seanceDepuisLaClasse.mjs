// AJOUTER ET RETIRER UN EXERCICE SANS QUITTER L'ÉCRAN DE LA CLASSE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// Rémy : « il faut vraiment que pour la séance ce soit facile d'ajouter et
// d'enlever un exercice et surtout que ça s'actualise chez un élève. »
//
// « FACILE » NE SE LIT PAS DANS LE CODE : il se compte en gestes, sur l'écran
// où le professeur se trouve déjà. Cet outil parcourt le chemin entier —
// ouvrir sa classe, l'onglet des séances, le bouton, la fenêtre, le choix — et
// recompte les étapes de la séance À LA SOURCE, côté serveur. Un bouton qui
// ouvre une fenêtre et ne change rien passerait pour un succès à l'œil nu.
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const s = await ouvrirSonde({ largeur: 1400, hauteur: 950 });
await s.identifier();
await dormir(900);

const classeId = await s.page.evaluate(async () => {
    const { mesClasses } = await import('./js/core/espaceProf.js');
    const liste = await mesClasses();
    const c = (Array.isArray(liste) ? liste : []).find((x) => /6e B/.test(x.name || ''));
    return c ? c.id : null;
});

// Une séance de deux exercices, donnée à la classe.
await s.page.evaluate(async ([cid]) => {
    const { donnerAuServeur } = await import('./js/core/parcoursServeur.js');
    const { state } = await import('./js/core/state.js');
    const p = { id: 'x', name: 'Séance du lundi', version: 2, steps: [
        { stepId: 's0', exerciseId: 'calc-add', overrides: {}, nbItems: 4, threshold: 3 },
        { stepId: 's1', exerciseId: 'calc-sub', overrides: {}, nbItems: 4, threshold: 3 }] };
    const saved = state.saveTeacherPath(p.name, p);
    p.id = saved.id;
    await donnerAuServeur(p, cid);
}, [classeId]);

/** Ce que le SERVEUR dit de la séance — pas ce que l'écran affiche. */
const auServeur = () => s.page.evaluate(async ([cid]) => {
    const { seancesDeLaClasse } = await import('./js/core/espaceProf.js');
    const r = await seancesDeLaClasse(cid);
    const x = (r.seances || []).find((y) => /Séance du lundi/.test(y.nom || ''));
    return x ? { etapes: x.etapes, exercices: x.exercices } : null;
}, [classeId]);

const cl = (m) => s.page.evaluate((x) => {
    const re = new RegExp(x, 'i');
    const b = [...document.querySelectorAll('button, [role="button"], a')]
        .find((e) => re.test((e.textContent || '').trim()));
    if (b) b.click();
}, m);

await cl('^la classe$'); await dormir(2500);
await s.page.evaluate(() => {
    const c = [...document.querySelectorAll('*')].find((e) => e.children.length === 0
        && /^6e B$/.test((e.textContent || '').trim()));
    if (c) (c.closest('button, [role="button"], article, li, .card') || c).click();
});
await dormir(1800);
await cl('^les séances$'); await dormir(2200);

console.log('\x1b[1mAVANT\x1b[0m : ' + JSON.stringify(await auServeur()));

// ─── AJOUTER ────────────────────────────────────────────────────────────────
const vuAjout = await s.page.evaluate(() => !!document.querySelector('[data-seance-ajouter]'));
console.log('\n\x1b[1mAJOUTER\x1b[0m  bouton visible : ' + (vuAjout ? 'oui' : '\x1b[31mNON\x1b[0m'));
if (vuAjout) {
    await s.page.click('[data-seance-ajouter]');
    await dormir(700);
    await s.page.click('#ec-choix-q');
    await s.page.keyboard.type('multiplication');
    await dormir(600);
    const propositions = await s.page.evaluate(() =>
        [...document.querySelectorAll('#ec-choix-liste [data-choix]')]
            .map((b) => b.textContent.replace(/\s+/g, ' ').trim().slice(0, 48)));
    console.log('   propositions : ' + propositions.length);
    propositions.slice(0, 3).forEach((p) => console.log('     · ' + p));
    await s.page.keyboard.press('Enter');
    await dormir(3500);
    // CE QUE LE LOGICIEL A DIT : un bouton qui échoue le dit dans un avis, et
    // une sonde qui ne les lit pas conclut « rien n'a changé » sans savoir
    // pourquoi. C'est la deuxième fois ce soir que cela me coûte un tour.
    const avis = await s.page.evaluate(() => [...document.querySelectorAll('#toast-container > *')]
        .map((t) => (t.textContent || '').trim()).filter(Boolean));
    console.log('   avis affiché : ' + JSON.stringify(avis));
}
const apresAjout = await auServeur();
console.log('\x1b[1mAPRÈS AJOUT\x1b[0m : ' + JSON.stringify(apresAjout));
console.log(apresAjout && apresAjout.etapes === 3
    ? '   \x1b[32m→ LA SÉANCE A UN EXERCICE DE PLUS, AU SERVEUR.\x1b[0m'
    : '   \x1b[31m→ RIEN N\'A CHANGÉ AU SERVEUR.\x1b[0m');

// ─── RETIRER ────────────────────────────────────────────────────────────────
await dormir(800);
const vuRetrait = await s.page.evaluate(() => !!document.querySelector('[data-seance-retirer]'));
console.log('\n\x1b[1mRETIRER\x1b[0m  bouton visible : ' + (vuRetrait ? 'oui' : '\x1b[31mNON\x1b[0m'));
if (vuRetrait) {
    await s.page.click('[data-seance-retirer]');
    await dormir(700);
    const offerts = await s.page.evaluate(() =>
        [...document.querySelectorAll('[data-choix]')].map((b) => b.textContent.trim()));
    console.log('   on propose : ' + offerts.join(' · '));
    await s.page.evaluate(() => {
        const b = document.querySelector('[data-choix]');
        if (b) b.click();
    });
    await dormir(2500);
}
const reglages = await s.page.evaluate(async ([cid]) => {
    const { lesReglages } = await import('./js/core/espaceProf.js');
    const r = await lesReglages(cid);
    return (r.reglages || []).map((x) => `${x.mode} ${x.exerciseId || x.exercice || ''}`);
}, [classeId]);
console.log('   réglages en vigueur : ' + JSON.stringify(reglages));
console.log(reglages.some((r) => /^retire/.test(r))
    ? '   \x1b[32m→ L\'EXERCICE EST RETIRÉ POUR LA CLASSE.\x1b[0m'
    : '   \x1b[31m→ AUCUN RETRAIT ENREGISTRÉ.\x1b[0m');

// ET LA SÉANCE N'A PAS ÉTÉ RÉÉCRITE : le retrait passe par la dispense, donc
// le parcours garde ses trois étapes et le bilan de ceux qui l'ont faite reste
// lisible.
const apresRetrait = await auServeur();
console.log('\n   le parcours garde ses étapes : '
    + (apresRetrait && apresRetrait.etapes === 3 ? '\x1b[32moui\x1b[0m' : '\x1b[31mNON\x1b[0m')
    + '  ' + JSON.stringify(apresRetrait));

await s.photo('body', 'tools/tmp/seance-gestes.png', 0);
console.log('\nerreurs de page : ' + s.erreurs.length + ' · fenêtres natives : ' + s.fenetresNatives.length);
s.erreurs.slice(0, 4).forEach((e) => console.log('   ' + e));
await s.fermer();
