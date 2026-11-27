// LE DÉFI NE COMPTE QU'UNE FOIS UNE BONNE RÉPONSE, MÊME CLIQUÉE DEUX FOIS.
//
//   node tools/defiDoubleClic.mjs
//
// Rémy, 27 novembre : « pour le défi de la classe, si on clique deux fois sur
// la bonne réponse on a deux points ». La question suivante n'arrive que
// 260 ms après la réponse ; pendant ce temps, le bouton restait à l'écran et
// chaque appui repassait par `repondre`.
//
// La sonde fait le geste de l'élève — un DOUBLE CLIC, vrai, de la souris, sur
// la bonne proposition d'une addition — trois fois, et lit le compteur de
// l'ardoise. Elle exige un point par question, pas deux.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as dormir } from 'node:timers/promises';

const PORT = String(9700 + Math.floor(Math.random() * 200));
const serveur = spawn('php', ['tools/siteEssai.php', PORT], { stdio: ['ignore', 'pipe', 'inherit'] });
let info = null;
for await (const bout of serveur.stdout) {
    const l = String(bout).split('\n').find(x => x.trim().startsWith('{'));
    if (l) { info = JSON.parse(l); break; }
}
const BASE = `http://127.0.0.1:${PORT}`;
const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const erreurs = [];
const echecs = [];
const page = async (qui) => {
    const p = await nav.newPage({ viewport: { width: 1100, height: 820 } });
    p.on('pageerror', e => erreurs.push(`${qui}: ${String(e).slice(0, 150)}`));
    await p.goto(`${BASE}/index.html`);
    await p.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
    return p;
};

try {
    const prof = await page('prof');
    await prof.evaluate(async ([e, m]) => {
        const { identifierProf } = await import('./js/core/verrouProf.js');
        await identifierProf(e, m);
    }, [info.email, info.mdp]);
    await prof.reload();
    await prof.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
    const classe = await prof.evaluate(async () => {
        const { creerClasse, apercuDeListe, importerListe, listeDeClasse } = await import('./js/core/espaceProf.js');
        const c = await creerClasse('4D', '4e');
        const ap = await apercuDeListe(c.id, 'Double Clic\n', '');
        await importerListe(c.id, ap.apercu.texte);
        const l = await listeDeClasse(c.id);
        return { id: c.id, eleve: (l.eleves || [])[0] };
    });
    const eleve = await page('eleve');
    await eleve.evaluate(async ({ e, base }) => {
        const { loginEleve } = await import('./js/core/sync.js');
        await loginEleve({ apiUrl: base + '/api', login: e.login, code: e.code });
    }, { e: classe.eleve, base: BASE });
    await eleve.reload();
    await eleve.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });

    await prof.evaluate(async (cid) => {
        const { lancerLeDefi } = await import('./js/core/espaceProf.js');
        return lancerLeDefi(cid, 'calc-add', 60, 'qcm');
    }, classe.id);
    await eleve.waitForSelector('.defi-reponses .defi-choix', { timeout: 40000 });

    for (let tour = 1; tour <= 3; tour++) {
        const avant = Number(await eleve.textContent('[data-bonnes]'));
        const bonne = await eleve.evaluate(() => {
            const q = (document.querySelector('[data-question]')?.textContent || '').replace(/\s+/g, '');
            const m = q.match(/(\d+)\+(\d+)/);
            if (!m) return null;
            const somme = String(Number(m[1]) + Number(m[2]));
            const i = [...document.querySelectorAll('.defi-reponses .defi-choix')]
                .findIndex(b => b.textContent.replace(/\s+/g, '') === somme);
            return i < 0 ? null : i;
        });
        if (bonne === null) { echecs.push(`tour ${tour} : pas trouvé la bonne proposition`); break; }
        await eleve.locator('.defi-reponses .defi-choix').nth(bonne).dblclick();
        await dormir(900);
        const apres = Number(await eleve.textContent('[data-bonnes]'));
        console.log(`  tour ${tour} : double clic sur la bonne réponse, compteur ${avant} → ${apres}`);
        if (apres - avant !== 1) echecs.push(`tour ${tour} : ${apres - avant} point(s) pour une seule bonne réponse`);
    }
    if (erreurs.length) echecs.push(`erreurs de page : ${erreurs.join(' | ')}`);
} catch (e) {
    echecs.push(`la sonde n'a pas pu aller au bout : ${e.message.split('\n')[0]}`);
} finally {
    await nav.close();
    serveur.kill();
}
if (echecs.length) { console.log('\nÉCHEC :'); echecs.forEach(e => console.log('  ✘', e)); process.exit(1); }
console.log('\nUNE BONNE RÉPONSE, UN POINT — MÊME CLIQUÉE DEUX FOIS.');
