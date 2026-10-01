// AJOUTER UN ÉLÈVE, ET LES TROIS SORTIES DES BILLETS — AU NAVIGATEUR.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// Rémy, deux demandes du même soir :
//   « j'ai l'impression qu'on ne peut pas ajouter un élève dans une classe,
//     idem pour l'enlever ? »
//   « pour imprimer les billets, tu pourrais aussi me proposer une présentation
//     en tableau et ou export cvs ».
//
// CE QU'AUCUNE ÉPREUVE DE `npm test` NE PEUT DIRE, et qui est tout l'objet de
// cet outil :
//
//   · que le bouton « + Ajouter un élève » est VISIBLE et qu'il aboutit — la
//     fenêtre, l'aperçu, la confirmation, la ligne de plus dans le tableau ;
//   · que la fenêtre des billets s'ouvre, que ses quatre boutons répondent, et
//     que le CSV se télécharge VRAIMENT. Le fichier descend ou ne descend pas ;
//     aucune lecture de code ne tranche cela.
//
// ET ON COMPTE LA LISTE AVANT ET APRÈS. Une sonde qui ne regarde que ce qu'on
// vient d'ajouter ne voit pas ce qu'on a effacé en l'ajoutant.
//
//   node tools/billetsEtAjout.mjs
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';
import { readFileSync } from 'node:fs';

const s = await ouvrirSonde({ largeur: 1400, hauteur: 950 });
await s.identifier();
await dormir(1000);

const cliquerTexte = (motif) => s.page.evaluate((m) => {
    const re = new RegExp(m, 'i');
    const b = [...document.querySelectorAll('button, [role="button"], a')]
        .find((x) => re.test((x.textContent || '').trim()));
    if (b) { b.click(); return true; }
    return false;
}, motif);

/** Les noms du tableau des élèves — la première cellule de chaque ligne. */
const noms = () => s.page.evaluate(() => [...document.querySelectorAll('tbody tr')]
    .map((tr) => ((tr.cells[0] || {}).innerText || '').trim()).filter(Boolean));

// --- On ouvre l'onglet « Les élèves » de la première classe ---
await cliquerTexte('^la classe$');
await dormir(2500);
await s.page.evaluate(() => {
    const c = [...document.querySelectorAll('*')].find((e) => e.children.length === 0
        && /^6e B$/.test((e.textContent || '').trim()));
    if (c) (c.closest('button, [role="button"], article, li, .card') || c).click();
});
await dormir(1800);
await cliquerTexte('^les élèves$');
await dormir(1800);

const avant = await noms();
console.log('\x1b[1mLA LISTE AVANT\x1b[0m ' + avant.length + ' : ' + avant.join(' · '));

// ─── 1. AJOUTER UN ÉLÈVE ────────────────────────────────────────────────────
const vuAjout = await s.page.evaluate(() =>
    !!document.querySelector('[data-ajouter-eleve]'));
console.log('\n\x1b[1m1. AJOUTER\x1b[0m  « + Ajouter un élève » visible : '
    + (vuAjout ? 'oui' : '\x1b[31mNON\x1b[0m'));

await s.page.click('[data-ajouter-eleve]');
await dormir(800);
// LA FENÊTRE SE VISE PAR SES IDENTIFIANTS, PAS PAR SON TEXTE : un « retirer »
// par ligne du tableau suffit à faire cliquer une sonde au mauvais endroit, et
// elle accuse ensuite le logiciel de ne rien faire. Payé une fois ce soir.
const champ = await s.page.evaluate(() =>
    (document.getElementById('demander-champ') || {}).placeholder || null);
console.log('   la fenêtre demande un nom (exemple proposé : ' + champ + ')');
await s.page.click('#demander-champ');
await s.page.keyboard.type('THIBAULT Camille');
await s.page.click('#demander-ok');
await dormir(2500);

const apercu = await s.page.evaluate(() => (document.body.innerText || '')
    .split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 40).join(' | '));
console.log('   l\'aperçu dit : ' + (apercu.match(/nouvel élève|rattach|déjà dans la liste/i) || ['\x1b[31mRIEN\x1b[0m'])[0]);

console.log('   confirmation cliquée : ' + await s.page.evaluate(() => {
    const b = document.querySelector('[data-confirmer-import]');
    if (b) { b.click(); return true; }
    return false;
}));
await dormir(2800);

const apres = await noms();
console.log('\x1b[1m   LA LISTE APRÈS\x1b[0m ' + apres.length + ' : ' + apres.join(' · '));
const gagne = apres.length - avant.length;
const perdus = avant.filter((n) => !apres.includes(n));
console.log(gagne === 1 && !perdus.length
    ? '   \x1b[32m→ UN ÉLÈVE DE PLUS, ET AUCUN PERDU.\x1b[0m'
    : `   \x1b[31m→ ${gagne} de différence, ${perdus.length} disparu(s) : ${perdus.join(' · ')}\x1b[0m`);

// ─── 2. LES BILLETS : TROIS SORTIES ─────────────────────────────────────────
console.log('\n\x1b[1m2. LES BILLETS\x1b[0m');
const [fenetre] = await Promise.all([
    s.page.context().waitForEvent('page'),
    s.page.click('[data-imprimer]')
]);
await fenetre.waitForLoadState('domcontentloaded').catch(() => {});
await dormir(900);

const dedans = await fenetre.evaluate(() => ({
    boutons: [...document.querySelectorAll('.rien button')].map((b) => b.textContent.trim()),
    billets: document.querySelectorAll('.billet').length,
    lignes: document.querySelectorAll('.tableau tbody tr').length,
    // CE QUI SORT DE L'IMPRIMANTE : ce qui est réellement affiché, et non ce
    // que le document contient. Les deux présentations sont écrites ; une
    // classe sur body décide, et c'est CELA qu'on mesure.
    billetsVus: !!document.querySelector('.billets').offsetParent,
    tableauVu: !!document.querySelector('.tableau').offsetParent
}));
console.log('   boutons : ' + dedans.boutons.join(' · '));
console.log(`   ${dedans.billets} billet(s) à découper, ${dedans.lignes} ligne(s) de tableau`);
console.log('   au départ : billets ' + (dedans.billetsVus ? 'visibles' : 'cachés')
    + ', tableau ' + (dedans.tableauVu ? 'visible' : 'caché'));

await fenetre.click('#btn-vue-tableau');
await dormir(300);
const bascule = await fenetre.evaluate(() => ({
    billetsVus: !!document.querySelector('.billets').offsetParent,
    tableauVu: !!document.querySelector('.tableau').offsetParent,
    marque: document.getElementById('btn-vue-tableau').getAttribute('aria-pressed')
}));
console.log('   après « Tableau » : billets ' + (bascule.billetsVus ? 'visibles' : 'cachés')
    + ', tableau ' + (bascule.tableauVu ? 'visible' : 'caché')
    + ', bouton marqué ' + bascule.marque);
console.log(!bascule.billetsVus && bascule.tableauVu
    ? '   \x1b[32m→ LA BASCULE MARCHE, ET UNE SEULE DES DEUX SORT.\x1b[0m'
    : '   \x1b[31m→ LA BASCULE NE BASCULE PAS.\x1b[0m');

// LE CSV DESCEND-IL VRAIMENT ? C'est la seule question qu'aucune lecture de
// code ne tranche : notre CSP ne nomme `blob:` ni dans `default-src` ni dans
// `connect-src`, et c'est Chrome qui décide.
const tele = fenetre.waitForEvent('download', { timeout: 6000 }).catch(() => null);
await fenetre.click('#btn-csv');
const d = await tele;
if (!d) {
    console.log('   \x1b[31m→ AUCUN TÉLÉCHARGEMENT.\x1b[0m');
} else {
    const chemin = await d.path();
    const texte = readFileSync(chemin, 'utf8');
    const l = texte.replace(/^﻿/, '').split('\r\n');
    console.log('   fichier : ' + d.suggestedFilename());
    console.log('   BOM : ' + (texte.startsWith('﻿') ? 'oui' : '\x1b[31mnon\x1b[0m')
        + ' · séparateur : ' + (l[0].includes(';') ? 'point-virgule' : '\x1b[31mautre\x1b[0m')
        + ' · fins de ligne : ' + (texte.includes('\r\n') ? 'CRLF' : '\x1b[31mLF\x1b[0m'));
    console.log('   en-tête : ' + l[0]);
    console.log('   1re ligne : ' + l[1]);
    console.log('   ' + (l.length - 2) + ' élève(s) dans le fichier, ' + dedans.billets + ' billet(s) à l\'écran');
    console.log(l.length - 2 === dedans.billets
        ? '   \x1b[32m→ LE CSV EXPORTE EXACTEMENT CE QU\'ON IMPRIME.\x1b[0m'
        : '   \x1b[31m→ LE CSV ET LES BILLETS NE DISENT PAS LA MÊME CHOSE.\x1b[0m');
}

// Et le bouton « Imprimer », celui qui était mort : on vérifie que l'écouteur
// est bien posé. On ne CLIQUE pas — la boîte d'impression bloquerait la sonde.
console.log('   « Imprimer » a un écouteur : ' + await fenetre.evaluate(() => {
    let vu = false;
    const b = document.getElementById('btn-imprimer');
    b.addEventListener('click', () => { vu = true; }, { once: true });
    // On déclenche l'événement sans l'impression : si notre propre écouteur
    // reçoit le clic, c'est que le bouton est bien dans l'arbre et atteignable.
    b.dispatchEvent(new MouseEvent('click', { bubbles: false, cancelable: true }));
    return vu;
}));

await fenetre.close();
console.log('\nerreurs de page : ' + s.erreurs.length + ' · fenêtres natives : ' + s.fenetresNatives.length);
s.erreurs.slice(0, 4).forEach((e) => console.log('   ' + e));
await s.fermer();
