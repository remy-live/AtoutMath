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
// LA RÈGLE DE DÉCISION, et elle a demandé TROIS passes. Compter les nœuds ne
// suffit pas : Math Crush dessine tout son monde dans UN canevas et n'a qu'un
// nœud — c'est un aperçu parfaitement plein. La deuxième règle cherchait donc
// la conjonction « aucune surface de dessin ET presque rien dans le DOM ».
// Mesuré sur Thalès avant correction : 11 nœuds, 0 dessin ; après : 57 et 1.
//
// ELLE CRIAIT AU LOUP SUR HUIT APERÇUS PLEINS, et je l'ai crue. Vérification
// faite en REGARDANT les images, un soir de septembre :
//
//   · `frac-samurai` montre la fraction 8/12, sa consigne et son bouton
//     « Couper » — dix-huit nœuds, aucun dessin, et rien à corriger ;
//   · `geo-patrons` montre le cube plié en trois dimensions, fait de DIV et de
//     transformations CSS, sans le moindre canevas ;
//   · `geo-atelier-instruments` charge son plan dans une IFRAME — 1409 nœuds et
//     159 dessins DEDANS, qu'un `querySelectorAll` du document hôte ne voit pas ;
//   · `calc-deux-nombres`, quatorze nœuds, montre la ligne de chiffres, les deux
//     fenêtres et « Vérifier ».
//
// UN OUTIL QUI REND HUIT FAUSSES PISTES FAIT PERDRE PLUS DE TEMPS QU'IL N'EN
// GAGNE — c'est la leçon déjà écrite en tête de `nouvelExercice.mjs`, et je
// viens de la repayer. Pire : j'ai rapporté ces trois-là à Rémy comme des
// défauts à corriger, sur la foi d'un compte de nœuds.
//
// LA TROISIÈME RÈGLE NE COMPTE PLUS : ELLE REGARDE. Un aperçu est vide quand il
// n'a NI surface de dessin (canevas, SVG, iframe), NI rien à lire. C'est la
// définition d'un cadre blanc, et c'est exactement ce que Thalès montrait.
//
// ET ON A VÉRIFIÉ QU'ELLE ATTRAPE ENCORE. Une règle qui ne signale plus rien
// peut être juste, ou simplement aveugle, et rien ne les distingue de
// l'extérieur. On a donc RECRÉÉ la panne de Thalès — l'aperçu de la Tour de
// Hanoï ne posant plus qu'une feuille de style — et relancé : « aperçus VIDES
// (ni dessin, ni rien à lire) : 1 · defi-tour-brahma (tour-brahma) — 0 nœuds,
// RIEN À LIRE ». Puis la panne a été retirée.
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
        // CE QU'IL Y A À VOIR, ET CE QU'IL Y A À LIRE.
        //
        // L'IFRAME COMPTE COMME UNE SURFACE DE DESSIN : `geo-atelier-instruments`
        // charge son plan dedans, et le document hôte n'en voit rien — 1409
        // nœuds et 159 dessins invisibles à un `querySelectorAll` d'ici.
        //
        // Et le TEXTE compte autant : un jeu de nombres n'a aucune raison de
        // poser un canevas pour écrire « Trouve un diviseur commun ».
        const out = { exo: exoId, activite: exo.activityId, utiles, erreur,
            dessin: hote.querySelectorAll('svg, canvas, iframe').length,
            lire: (hote.innerText || '').replace(/\s+/g, ' ').trim() };
        hote.remove();
        return out;
    }, id);
    // NI DESSIN NI TEXTE : c'est la définition d'un cadre blanc, et c'est
    // exactement ce que Thalès montrait. Un canevas seul (Crush, Nova,
    // l'Escadrille) est un aperçu plein ; une phrase seule aussi.
    //
    // VINGT-CINQ SIGNES, et le seuil se justifie : un aperçu qui n'a posé
    // qu'une étiquette de score — « 0 / 4 » — n'a pas posé sa question. Toutes
    // les consignes du catalogue en font davantage.
    if (!vu.dessin && vu.lire.length < 25) maigres.push(vu);
    console.log(`  ${String(vu.utiles).padStart(4)} nœuds · ${vu.dessin} dessin`
        + ` · ${String(vu.lire.length).padStart(3)} signes  ${vu.activite}`
        + (vu.erreur ? '  ⚠ ' + vu.erreur : ''));
}
console.log(`\naperçus VIDES (ni dessin, ni rien à lire) : ${maigres.length}`);
// ON IMPRIME DE QUOI VÉRIFIER SOI-MÊME. Un outil qui accuse doit donner la
// pièce : ce qu'il a trouvé à lire, et l'erreur s'il y en a une. Sans cela on
// le croit sur parole — ce qui vient de coûter trois fausses réparations.
maigres.forEach(m => console.log(`    ${m.exo} (${m.activite}) — ${m.utiles} nœuds, `
    + `« ${m.lire || 'RIEN À LIRE'} »` + (m.erreur ? ` ⚠ ${m.erreur}` : '')));
console.log('erreurs de page :', err.length, err.slice(0, 3));
await nav.close();
srv.kill();
process.exit(maigres.length || err.length ? 1 : 0);
