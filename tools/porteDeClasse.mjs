// LE PROFESSEUR VOIT-IL QUE SON CODE N'OUVRE RIEN ?
//
// Le piège, mesuré deux fois : l'écran du professeur affiche le code de chaque
// classe en gros, avec un bouton pour le copier — mais le champ pour le TAPER
// n'existe chez l'élève que si l'inscription libre est allumée, et elle est
// fermée par défaut. Le professeur dictait un code que personne ne pouvait
// écrire, et la réponse était un interrupteur dans un AUTRE écran.
//
// Cette sonde regarde les DEUX côtés du même interrupteur, ce qu'aucun essai
// unitaire ne peut faire : la carte du professeur porte fermée, puis ouverte, et
// le champ de l'élève qui apparaît.
//
//     node tools/porteDeClasse.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as attendre } from 'node:timers/promises';

const PORT = String(8300 + Math.floor(Math.random() * 90));
const srv = spawn('php', ['tools/siteEssai.php', PORT], { stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((ok, ko) => {
    const t = setTimeout(() => ko(new Error('pas démarré')), 30000);
    srv.stdout.on('data', d => { if (String(d).includes('"port"')) { clearTimeout(t); ok(); } });
    srv.on('error', ko);
});
await attendre(400);
const BASE = `http://127.0.0.1:${PORT}`;
const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const soucis = [];
const ok = (q, v, d = '') => { console.log((v ? '  ok   ' : '  NON  ') + q + (d ? '  — ' + d : '')); if (!v) process.exitCode = 1; };

const prof = await nav.newPage({ viewport: { width: 1400, height: 1000 } });
prof.on('pageerror', e => soucis.push('prof: ' + String(e).slice(0, 180)));
prof.on('dialog', async d => { soucis.push('FENÊTRE NATIVE: ' + d.message()); await d.dismiss(); });
await prof.goto(`${BASE}/index.html`);
await prof.waitForFunction(() => window.__atoutmathPret === true, { timeout: 20000 });
await prof.evaluate(async () => {
    const { identifierProf } = await import('./js/core/verrouProf.js');
    await identifierProf('remy@essai.test', 'motdepassetreslong');
});
await prof.reload();
await prof.waitForFunction(() => window.__atoutmathPret === true, { timeout: 20000 });
const cid = await prof.evaluate(async () => {
    const { creerClasse } = await import('./js/core/espaceProf.js');
    return (await creerClasse('5C', '5e')).id;
});
ok('une classe est créée', !!cid);

async function lireLaCarte() {
    await prof.click('#top-btn-classe');
    await prof.waitForSelector('.ec-carte', { timeout: 15000 });
    await prof.waitForTimeout(1600);
    return prof.evaluate(() => {
        const c = [...document.querySelectorAll('.ec-carte')].find(x => /5C/.test(x.textContent || ''));
        if (!c) return null;
        const code = c.querySelector('[data-copier]');
        const ouvrir = c.querySelector('[data-inscription-libre]');
        return {
            etiquette: (c.querySelector('.ec-code-eti') || {}).textContent || '',
            code: code ? code.textContent.trim() : '',
            infobulle: code ? code.getAttribute('title') : '',
            geste: ouvrir ? ouvrir.textContent.trim() : '',
            grise: !!c.querySelector('.ec-carte-code--ferme')
        };
    });
}

// ── PORTE FERMÉE (le réglage par défaut) ────────────────────────────────────
let v = await lireLaCarte();
console.log('\n  PORTE FERMÉE');
console.log('    étiquette :', v && v.etiquette);
console.log('    infobulle :', (v && v.infobulle || '').slice(0, 130));
ok('l\'étiquette dit que la porte est fermée', !!v && /ferm/i.test(v.etiquette), v && v.etiquette);
ok('l\'infobulle dit POURQUOI, là où le code est affiché',
    !!v && /n.OUVRE RIEN/i.test(v.infobulle || ''));
ok('le geste qui l\'ouvre est DANS la carte', !!v && v.geste === 'Ouvrir la porte', v && v.geste);
ok('et le code a perdu la couleur qui promettait', !!v && v.grise);

// ── ON CLIQUE « Ouvrir la porte » ───────────────────────────────────────────
await prof.evaluate(() => {
    const c = [...document.querySelectorAll('.ec-carte')].find(x => /5C/.test(x.textContent || ''));
    const b = c && c.querySelector('[data-inscription-libre]');
    if (b) b.click();
});
await prof.waitForTimeout(2600);
const ouEstOn = await prof.evaluate(() => document.querySelectorAll('.ec-carte').length > 0 ? 'liste' : 'ailleurs');
ok('CLIQUER LE GESTE N\'OUVRE PAS LA CLASSE PAR MÉGARDE', ouEstOn === 'liste', ouEstOn);

v = await lireLaCarte();
console.log('\n  PORTE OUVERTE');
console.log('    étiquette :', v && v.etiquette);
console.log('    infobulle :', (v && v.infobulle || '').slice(0, 130));
ok('l\'étiquette redevient « code de classe »', !!v && v.etiquette.trim() === 'code de classe', v && v.etiquette);
ok('le geste a disparu : il n\'y a plus rien à ouvrir', !!v && v.geste === '');
ok('et l\'infobulle dit OÙ l\'élève doit le taper',
    !!v && /Je n.ai pas de billet/.test(v.infobulle || ''));

// ── ET CHEZ L'ÉLÈVE, LA PORTE EXISTE MAINTENANT ─────────────────────────────
const el = await nav.newPage({ viewport: { width: 900, height: 900 } });
el.on('pageerror', e => soucis.push('élève: ' + String(e).slice(0, 180)));
el.on('dialog', async d => { soucis.push('FENÊTRE NATIVE: ' + d.message()); await d.dismiss(); });
await el.goto(`${BASE}/index.html`);
await el.waitForFunction(() => window.__atoutmathPret === true, { timeout: 20000 });
await el.waitForTimeout(2000);
const chezLEleve = await el.evaluate(() => ({
    champ: !!document.getElementById('portail-classe'),
    resume: [...document.querySelectorAll('summary')].map(s => s.textContent.trim())
}));
ok('LE CHAMP DU CODE DE CLASSE EXISTE CHEZ L\'ÉLÈVE',
    chezLEleve.champ, chezLEleve.resume.join(' · ') || '(aucun repli)');

console.log('\n────────────────────────────────────────────────────────');
console.log(`fenêtres natives et erreurs de page : ${soucis.length}`);
soucis.slice(0, 6).forEach(x => console.log('   · ' + x));
if (soucis.length) process.exitCode = 1;
await nav.close();
srv.kill();
