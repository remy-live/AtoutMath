// QUELS JEUX ONT DU CONTENU SOUS LA FENÊTRE, SANS RIEN QUI L'ANNONCE ?
//
// NÉ D'UNE MESURE QUI AVAIT CRIÉ AU LOUP. Le balayage du 27 septembre annonçait
// dix-sept boutons « SOUS LA FENÊTRE » ; les dix-sept étaient atteignables en
// défilant, et la sonde a été corrigée. Mais la correction a laissé une vraie
// question sans réponse : ATTEIGNABLE N'EST PAS VISIBLE. Un élève de sixième
// qui ne voit pas de bouton ne se dit pas « il doit être plus bas » ; il attend.
//
// CET OUTIL NE CHERCHE DONC PAS UN DÉFAUT DE MISE EN PAGE. Il cherche les
// écrans où le geste de défiler est NÉCESSAIRE pour répondre, et où rien ne le
// suggère. C'est une question d'information, pas de place.
//
// LA TAILLE EST CELLE D'UN TÉLÉPHONE, AU DOIGT. Sous 768 px, `hasTouch` et
// `isMobile` sont obligatoires — sans eux le navigateur annonce un pointeur
// FIN, et la moitié des règles du dépôt ne s'appliquent pas.
//
//   node tools/quiDefileSansLeDire.mjs
//   node tools/quiDefileSansLeDire.mjs --bavard
//   node tools/quiDefileSansLeDire.mjs calc-add,don-tableur
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as attendre } from 'node:timers/promises';

const BAVARD = process.argv.includes('--bavard');
const CHOISIS = (process.argv.slice(2).find(a => !a.startsWith('--')) || '')
    .split(',').map(s => s.trim()).filter(Boolean);

const PORT = String(9200 + Math.floor(Math.random() * 300));
const srv = spawn('php', ['tools/siteEssai.php', PORT], { stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((ok, ko) => { const t = setTimeout(() => ko(new Error('site d\'essai muet')), 30000);
    srv.stdout.on('data', d => { if (String(d).includes('"port"')) { clearTimeout(t); ok(); } }); srv.on('error', ko); });
await attendre(400);

const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await nav.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
    hasTouch: true, isMobile: true    // SOUS 768 px, C'EST OBLIGATOIRE.
});
const p = await ctx.newPage();
const soucis = [];
p.on('pageerror', e => soucis.push(String(e).slice(0, 120)));
await p.goto(`http://127.0.0.1:${PORT}/index.html`);
await p.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
await p.evaluate(async () => {
    const { identifierProf } = await import('./js/core/verrouProf.js');
    try { await identifierProf('remy@essai.test', 'motdepassetreslong'); } catch (e) {}
});
await p.reload();
await p.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
await attendre(500);

const ids = CHOISIS.length ? CHOISIS : await p.evaluate(async () => {
    const { exercices } = await import('./js/data/catalog.js');
    return exercices.map(e => e.id);
});
console.log(`${ids.length} exercice(s), 390 × 844, au doigt\n`);

const defilent = [];
let ouverts = 0;
for (const id of ids) {
    const monte = await p.evaluate(async (exoId) => {
        if (window.__sonde) { try { window.__sonde.exit(); } catch (e) {} }
        await new Promise(ok => setTimeout(ok, 260));
        const { getExerciseById } = await import('./js/data/catalog.js');
        const exo = getExerciseById(exoId);
        if (!exo) return 'inconnu';
        const { makeStep, makePath } = await import('./js/core/path.js');
        const { politiquePerso } = await import('./js/core/mesExercices.js');
        const { Runner } = await import('./js/core/runner.js');
        const pas = makeStep(exo.id, {}, { stepId: 's1', nbItems: 8, threshold: 0 });
        window.__sonde = new Runner({ path: makePath('Sonde', [pas], politiquePerso()), deviceMode: 'none' });
        window.__sonde.start();
        return null;
    }, id).catch(e => 'erreur: ' + String(e).slice(0, 60));
    if (monte) { if (BAVARD) console.log(`  ${id} : ${monte}`); continue; }
    await attendre(1500);
    // Les jeux à canevas s'ouvrent sur un écran « JOUER ».
    await p.evaluate(() => {
        const b = [...document.querySelectorAll('#game-layer button')]
            .filter(x => x.getBoundingClientRect().width > 0)
            .find(x => /^(jouer|commencer|c'est parti|démarrer|go)/i.test((x.textContent || '').trim()));
        if (b) b.click();
    });
    await attendre(1100);
    ouverts++;

    const vu = await p.evaluate(() => {
        // TOUT CADRE QUI DÉFILE, et pas seulement `.canvas-area` : chaque jeu
        // porte le sien (`.dm-wrap`, `.eq-wrap`, `.thr-wrap`…), et c'est
        // précisément ce que le balayage précédent avait ignoré.
        const couche = document.getElementById('game-layer');
        if (!couche) return null;
        const cadres = [couche, ...couche.querySelectorAll('*')].filter(e => {
            const s = getComputedStyle(e);
            if (!/(auto|scroll)/.test(s.overflowY)) return false;
            const r = e.getBoundingClientRect();
            return r.width > 40 && r.height > 60;
        });
        const qui = [];
        for (const e of cadres) {
            const reste = e.scrollHeight - e.clientHeight;
            if (reste <= 8) continue;      // un ou deux pixels ne sont rien
            // CE QUI EST CACHÉ EST-IL UTILE ? Un cadre qui déborde de son
            // pied de page ne demande rien à personne ; un cadre qui cache un
            // BOUTON oblige à défiler pour répondre.
            const bas = e.getBoundingClientRect().bottom;
            const caches = [...e.querySelectorAll('button, input, select, [role="button"], .bubble, .choice-carte')]
                .filter(x => { const r = x.getBoundingClientRect();
                    return r.width > 0 && r.height > 0 && r.top >= bas - 4; });
            qui.push({
                quoi: e.id ? '#' + e.id : '.' + String(e.className || '').split(' ')[0],
                reste: Math.round(reste),
                cachesUtiles: caches.length,
                exemple: caches.length ? (caches[0].textContent || '').trim().slice(0, 24) : ''
            });
        }
        return qui;
    });
    if (!vu || !vu.length) { if (BAVARD) console.log(`  ok   ${id}`); continue; }
    const dur = vu.filter(x => x.cachesUtiles > 0);
    if (dur.length) {
        defilent.push({ id, cadres: dur });
        console.log(`  DÉFILE  ${id.padEnd(30)} `
            + dur.map(c => `${c.quoi} : ${c.reste} px cachés, ${c.cachesUtiles} commande(s)`
                + (c.exemple ? ` (« ${c.exemple} »)` : '')).join(' · '));
    } else if (BAVARD) {
        console.log(`  (déborde sans rien cacher d'utile) ${id} : `
            + vu.map(c => `${c.quoi} ${c.reste}px`).join(', '));
    }
}

console.log(`\n${ouverts} exercice(s) ouverts · ${defilent.length} cachent une commande sous leur cadre`);
console.log('erreurs de page : ' + soucis.length);
soucis.slice(0, 4).forEach(x => console.log('    ' + x));
await nav.close(); srv.kill();
