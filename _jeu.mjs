import { chromium } from 'playwright';
const SC = '/tmp/claude-0/-home-user-AtoutMath/c6f13149-d2cf-58fc-b989-0fe8ce4406d6/scratchpad';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1470, height: 760 } });
p.on('pageerror', e => console.log('ERREUR PAGE:', e.message));
p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE:', m.text()); });
await p.goto('http://localhost:8123/index.html');
await p.waitForTimeout(2400);
await p.evaluate(async () => {
    const { state } = await import('/js/core/state.js');
    state.isTeacherMode = true; state.previewDeviceMode = 'desktop';
    window.showGameConfigUI = null;
    document.querySelectorAll('[id$="-modal"]').forEach(m => { m.style.display = 'none'; });
});
const act = process.argv[2];
const r = await p.evaluate(async (act) => {
    const { exercices, getExerciseById } = await import('/js/data/catalog.js');
    const { openGameLayer } = await import('/js/games/engine.js');
    const exo = getExerciseById(act) || exercices.find(e => e.activityId === act);
    if (!exo) return 'introuvable';
    openGameLayer(exo);
    return exo.id;
}, act);
console.log('lancé', r);
await p.waitForTimeout(2200);
await p.screenshot({ path: `${SC}/jeu-${act}.png` });
if (process.argv[3]) console.log(JSON.stringify(await p.evaluate(process.argv[3])));
await b.close();
