// AUCUN APERÇU NE DOIT ÊTRE VIDE.
//
// Rémy : « thalès n'a pas d'aperçu ». La cause : `start()` appelle
// `runDemoSequence()` À LA PLACE de `startGameLoop()`, et cette
// démonstration-là ne posait pas son plateau avant de parler. Le robot
// expliquait une figure qui n'existait pas.
//
// RIEN NE L'AURAIT DIT. Une vignette vide ne lève aucune erreur : elle se
// monte, elle se mesure, elle s'affiche — vide. Aucun test hors navigateur ne
// peut la voir, puisqu'il n'y a ni exception ni valeur fausse, seulement un
// cadre blanc. On ouvre donc l'aperçu de CHAQUE activité autonome, et l'on
// compte ce qui s'y trouve.
//
// LA RÈGLE DE DÉCISION, et elle a demandé une deuxième passe. Compter les
// nœuds ne suffit pas : Math Crush dessine tout son monde dans UN canevas et
// n'a qu'un nœud — c'est un aperçu parfaitement plein. Ce qui trahit le trou
// de Thalès, c'est la conjonction : aucune surface de dessin ET presque rien
// dans le DOM. Mesuré avant correction : 11 nœuds, 0 dessin. Après : 57 et 1.
//
//   node tools/apercusVides.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as attendre } from 'node:timers/promises';
const PORT = String(9630 + Math.floor(Math.random() * 40));
const srv = spawn('php', ['tools/siteEssai.php', PORT], { stdio: ['ignore', 'pipe', 'pipe'] });
const info = JSON.parse(await new Promise((ok) => {
    srv.stdout.on('data', d => { const s = String(d); if (s.includes('"port"')) ok(s.trim()); });
}));
await attendre(600);
const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await (await nav.newContext({ viewport: { width: 1280, height: 950 } })).newPage();
const err = [];
p.on('pageerror', e => err.push(String(e).slice(0, 160)));
await p.goto(`http://127.0.0.1:${info.port}/index.html`);
await p.waitForFunction(() => window.__atoutmathPret === true, { timeout: 20000 });
await p.evaluate(async () => {
    const { identifierProf } = await import('./js/core/verrouProf.js');
    await identifierProf('remy@essai.test', 'motdepassetreslong');
});
await p.reload();
await p.waitForFunction(() => window.__atoutmathPret === true, { timeout: 20000 });
await attendre(1200);

const ids = await p.evaluate(async () => {
    const { exercices } = await import('./js/data/catalog.js');
    await import('./js/core/activities/index.js');
    const { getActivity } = await import('./js/core/registry.js');
    // Un exercice par ACTIVITÉ autonome : c'est l'activité qui dessine.
    const vus = new Set();
    return exercices.filter(e => {
        const a = e.activityId ? getActivity(e.activityId) : null;
        if (!a || !a.supports || !a.supports.autonomous) return false;
        if (vus.has(e.activityId)) return false;
        vus.add(e.activityId);
        return true;
    }).map(e => e.id);
});
console.log(`${ids.length} activités autonomes à ouvrir…\n`);

const maigres = [];
for (const id of ids) {
    const vu = await p.evaluate(async (exoId) => {
        document.querySelectorAll('#sonde').forEach(e => e.remove());
        const hote = document.createElement('div');
        hote.id = 'sonde';
        hote.style.cssText = 'width:620px;height:420px';
        document.body.appendChild(hote);
        const { getExerciseById } = await import('./js/data/catalog.js');
        const { launchPreview } = await import('./js/games/engine.js');
        const exo = getExerciseById(exoId);
        let erreur = '';
        try { await launchPreview(exo, hote, null, { muet: true }); }
        catch (e) { erreur = String(e).slice(0, 120); }
        await new Promise(r => setTimeout(r, 1400));
        // CE QU'ON COMPTE : les nœuds qui ne sont ni du style ni du script, et
        // les surfaces de dessin. Une feuille de style seule n'est pas un
        // aperçu — c'est exactement ce que Thalès montrait.
        const utiles = [...hote.querySelectorAll('*')]
            .filter(e => !/^(STYLE|SCRIPT)$/.test(e.tagName)).length;
        const out = { exo: exoId, activite: exo.activityId, utiles, erreur,
            dessin: hote.querySelectorAll('svg, canvas').length };
        hote.remove();
        return out;
    }, id);
    // NI DESSIN NI CONTENU : c'est la signature d'un aperçu qui n'a rien
    // posé. Un canevas seul (Crush, Nova, l'Escadrille) est un aperçu plein.
    if (!vu.dessin && vu.utiles < 20) maigres.push(vu);
    console.log(`  ${String(vu.utiles).padStart(4)} nœuds · ${vu.dessin} dessin  ${vu.activite}`
        + (vu.erreur ? '  ⚠ ' + vu.erreur : ''));
}
console.log(`\naperçus VIDES (aucun dessin et moins de 20 nœuds) : ${maigres.length}`);
maigres.forEach(m => console.log('   ', JSON.stringify(m)));
console.log('erreurs de page :', err.length, err.slice(0, 3));
await nav.close();
srv.kill();
process.exit(maigres.length || err.length ? 1 : 0);
