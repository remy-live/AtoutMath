// L'ÉCRAN À PROJETER — on mesure le contraste SUR LES PIXELS.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/contrasteDesBillets.mjs
//
// RÉMY, 3 novembre : « pour l'écran ton idenfiant ton code, le contraste une
// ligne sur deux n'est pas fort, que pourrait-on faire ? »
//
// IL AVAIT RAISON, ET LE CHIFFRE LE DIT : 1,07 entre une ligne et la suivante,
// quand 1,00 est « deux couleurs identiques ». Une teinte « un peu plus
// foncée » choisie à l'œil ne se contrôle pas — c'est exactement comme cela
// qu'on arrive à 1,07 en croyant faire une zébrure.
//
// ON LIT LES COULEURS CALCULÉES PAR LE NAVIGATEUR, pas celles du CSS : une
// transparence, un fond hérité ou un thème les changent, et c'est ce que
// l'élève voit qui compte.

import { chromium } from 'playwright';
import { htmlDesBillets } from '../js/ui/billets.js';

const lin = (c) => { const x = c / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
const L = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const contraste = (a, b) => {
    const [x, y] = [L(a), L(b)];
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

const eleves = Array.from({ length: 24 }, (_, i) => ({
    login: `eleve.numero${String(i + 1).padStart(2, '0')}`,
    code: `C${String(1000 + i)}`
}));

const navigateur = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await navigateur.newPage({ viewport: { width: 1280, height: 800 } });
await page.setContent(htmlDesBillets({ eleves, nom: '6e B', origine: 'atout-math.fr' }));
await page.waitForTimeout(300);

const mesure = await page.evaluate(() => {
    const lire = (el) => getComputedStyle(el).backgroundColor
        .match(/\d+/g).slice(0, 3).map(Number);
    const lignes = [...document.querySelectorAll('.pr-bloc--1 .pr-ligne')];
    const bords = lignes.map(l => {
        const s = getComputedStyle(l);
        return { largeur: s.borderBottomWidth, couleur: s.borderBottomColor };
    });
    return {
        combien: lignes.length,
        fonds: lignes.slice(0, 6).map(lire),
        encre: getComputedStyle(document.querySelector('.pr-bloc--1 .pr-code'))
            .color.match(/\d+/g).slice(0, 3).map(Number),
        bords: bords.slice(0, 6)
    };
});

console.log(`${mesure.combien} lignes dans le premier bloc`);
for (let i = 1; i < mesure.fonds.length; i++) {
    console.log(`  ligne ${i} / ligne ${i + 1} : `
        + contraste(mesure.fonds[i - 1], mesure.fonds[i]).toFixed(2));
}
console.log('  le code sur le fond teinté : '
    + contraste(mesure.encre, mesure.fonds[0]).toFixed(2));
console.log('  le code sur le fond blanc  : '
    + contraste(mesure.encre, mesure.fonds[1]).toFixed(2));
console.log('\n  les traits, ligne par ligne :');
mesure.bords.forEach((b, i) => console.log(`    ligne ${i + 1} : ${b.largeur} ${b.couleur}`));

// LE VERDICT, et ses deux seuils :
//   · 1,30 entre deux lignes — en dessous, la zébrure se délave au projecteur ;
//   · 4,50 pour le code sur son fond — c'est le texte qu'on recopie.
const zebre = Math.min(...mesure.fonds.slice(1).map((f, i) => contraste(mesure.fonds[i], f)));
const lisible = Math.min(contraste(mesure.encre, mesure.fonds[0]),
    contraste(mesure.encre, mesure.fonds[1]));
const cinq = mesure.bords.filter(b => parseFloat(b.largeur) >= 2).length;
let fautes = 0;
const dire = (q, ok, d) => { if (!ok) fautes++; console.log(`  ${ok ? '✓' : '✗'} ${q} — ${d}`); };
console.log('');
dire('la zébrure se voit', zebre >= 1.3, `${zebre.toFixed(2)} (seuil 1,30)`);
dire('le code reste lisible', lisible >= 4.5, `${lisible.toFixed(2)} (seuil 4,50)`);
dire('un trait franc tous les cinq', cinq >= 1, `${cinq} trait(s) épais sur six lignes`);
// ON BASCULE SUR L'ÉCRAN À PROJETER AVANT DE LE REGARDER : la page s'ouvre
// sur les billets à découper, et une capture de l'onglet d'à côté ne montre
// pas ce qu'on vient de corriger.
// LES ONGLETS SONT BRANCHÉS PAR LA FENÊTRE MÈRE (`brancherLesBoutons`), que
// cette sonde n'a pas : cliquer ne fait rien. On pose donc l'attribut que ces
// boutons posent — `data-vue` sur le `body` —, ce qui est exactement l'état
// qu'on veut regarder, obtenu par le même chemin que l'application.
await page.evaluate(() => { document.body.dataset.vue = 'projection'; });
await page.waitForTimeout(300);
const visible = await page.evaluate(() => {
    const p = document.querySelector('.projection');
    return p ? getComputedStyle(p).display !== 'none' : false;
});
if (!visible) console.log('  (la projection reste masquée : capture inutilisable)');
await page.screenshot({ path: 'tools/tmp/billets-projection.png', fullPage: true });
await navigateur.close();
console.log(fautes ? `\n${fautes} chose(s) à regarder.` : '\nTOUT PASSE.');
process.exitCode = fautes ? 1 : 0;
