// LE MÉNAGE, MESURÉ EN REMETTANT LE PROBLÈME.
//
// On recrée les deux fichiers qu'une mise à jour ne peut pas effacer — c'est
// exactement l'état du serveur de Rémy après avoir déposé v885 —, puis on
// ouvre l'administration et l'on appuie sur le bouton.
import { chromium } from 'playwright';
import { writeFileSync, existsSync, rmSync } from 'node:fs';

const B = `http://127.0.0.1:${process.argv[2] || 8391}`;
let ratés = 0;
const dire = (q, ok, d = '') => { if (!ok) ratés++;
    console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${q}${d ? ' — ' + d : ''}`); };

// L'ÉTAT D'APRÈS UNE MISE À JOUR : les deux pages sont restées.
const morts = ['api/admin/classe.php', 'api/admin/eleves.php'];
for (const f of morts) writeFileSync(f, '<?php // version précédente, restée là\n');

const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await nav.newPage({ viewport: { width: 1100, height: 900 } });
const erreurs = [];
p.on('pageerror', (e) => erreurs.push(String(e)));
await p.goto(`${B}/api/admin/index.php`, { waitUntil: 'domcontentloaded' });
await p.fill('input[name=email]', 'remy@essai.test');
await p.fill('input[name=mdp]', 'motdepassetreslong');
await p.click('button');
await p.waitForLoadState('domcontentloaded');

const lire = () => p.evaluate(() => {
    const s = document.getElementById('sante');
    return { texte: s ? s.innerText : '(pas de section santé)',
             etiquette: (document.querySelector('#sante .etiquette') || {}).textContent || '',
             bouton: !!document.querySelector('#sante button.rouge') };
});
let v = await lire();
dire('la santé signale les fichiers restés', /version précédente/i.test(v.texte),
    (v.texte.match(/Fichiers d'une version précédente[^\n]*\n[^\n]*/) || ['(rien)'])[0].replace(/\n/g, ' · '));
dire('elle les NOMME', morts.every(f => v.texte.includes(f)));
dire('et elle explique pourquoi une mise à jour ne les efface pas',
    /n'en efface aucun/.test(v.texte));
dire('un bouton les retire', v.bouton);

if (v.bouton) {
    await p.click('#sante button.rouge');
    await p.waitForLoadState('domcontentloaded');
    dire('les fichiers sont partis du disque', morts.every(f => !existsSync(f)),
        morts.filter(f => existsSync(f)).join(' ') || 'aucun ne reste');
    const apres = await lire();
    dire('et la santé le dit', /aucun/.test(apres.texte));
    dire('le bouton a disparu avec eux', !apres.bouton);
}

console.log(`\nerreurs de page : ${erreurs.length}`);
if (erreurs.length) { ratés++; erreurs.slice(0, 3).forEach(e => console.log('   ' + e)); }
for (const f of morts) rmSync(f, { force: true });
console.log(ratés ? `\n\x1b[31m${ratés} raté(s)\x1b[0m` : '\n\x1b[32mLE MÉNAGE SE FAIT DEPUIS LA PAGE\x1b[0m');
await nav.close();
