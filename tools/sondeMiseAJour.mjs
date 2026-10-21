// QUE DEVIENT UNE TABLETTE PRÉPARÉE QUAND ON DÉPLOIE UNE NOUVELLE VERSION ?
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « Si je mets à jour atout math et que je réinstalle ça se met bien à
// jour ». On ne répond pas à cela en lisant `sw.js` — on prend le chemin de sa
// sœur, en entier :
//
//   1. une tablette NEUVE ouvre `?preparer` et attend le verdict
//   2. on compte ce qu'elle garde
//   3. ON DÉPLOIE : `node tools/version.mjs`, le rituel, le vrai
//   4. elle recharge — c'est tout ce qu'une tablette fait
//   5. on recompte, PLUSIEURS FOIS, puis on demande un jeu HORS LIGNE
//   6. on refait la préparation, et l'on redemande le même jeu hors ligne
//
// ── POURQUOI PLUSIEURS FOIS, ET PAS UNE ────────────────────────────────────
//
// C'est la friction que cette sonde existe pour ne plus payer. Au même
// rechargement, mesuré :
//
//     à  2 s   l'ANCIEN cache, 588 fichiers   (l'ancien worker tient encore)
//     à 10 s   le nouveau,      19 fichiers   (le NOYAU, et rien d'autre)
//     à 15 s   le nouveau,     257 fichiers   (le rattrapage de huit secondes)
//     à 40 s   le nouveau,     257 fichiers   (le palier)
//
// Trois réponses opposées à la même question. Une sonde qui ne prend qu'un
// point répond au hasard, et avec aplomb : la première version de celle-ci a
// mesuré 19 fichiers et conclu que l'application ne démarrait plus hors ligne
// après une mise à jour. C'est vrai pendant huit secondes.
//
// ── CE QU'ELLE RESTITUE EN PARTANT ─────────────────────────────────────────
//
// Elle DÉPLOIE pour de vrai, donc elle modifie `index.html`, `sw.js`,
// `.htaccess` et les pages à part. Elle les relit avant et les récrit à la
// fin, quoi qu'il arrive : un outil de mesure qui laisse l'arbre modifié est
// un piège, et celui-là se tend juste avant un commit.
//
// Usage :  node tools/sondeMiseAJour.mjs

import { ouvrirSonde } from './sonde.mjs';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const RACINE = new URL('..', import.meta.url).pathname;
const dormir = (ms) => new Promise(r => setTimeout(r, ms));
const dire = (...a) => console.log(...a);

// LES FICHIERS QUE LE RITUEL TOUCHE, relus AVANT d'y toucher. On ne liste pas
// à la main : `version.mjs` monte aussi les pages à part, et une liste écrite
// ici serait fausse au premier atelier ajouté.
const SOUS_LA_MAIN = ['index.html', 'sw.js', '.htaccess',
    ...readdirSync(RACINE).filter(f => /^atelier-.*\.html$/.test(f))];
const avantLeRituel = new Map(
    SOUS_LA_MAIN.map(f => [f, readFileSync(RACINE + f, 'utf8')]));
const remettre = () => {
    for (const [f, t] of avantLeRituel) {
        if (readFileSync(RACINE + f, 'utf8') !== t) writeFileSync(RACINE + f, t);
    }
};

/** Ce que le navigateur garde : les caches, leur contenu, et les jeux dedans. */
const etatDuCache = (page) => page.evaluate(async () => {
    const noms = await caches.keys();
    const detail = {};
    let jeux = 0;
    for (const n of noms) {
        const cles = await (await caches.open(n)).keys();
        detail[n] = cles.length;
        jeux += cles.filter(r => /\/js\/games\//.test(r.url)).length;
    }
    return { noms, detail, jeux };
});

const attendreLeVerdict = (page) => page.waitForFunction(() => {
    const v = document.querySelector('[data-verdict]');
    return v && v.textContent.trim().length > 0;
}, { timeout: 180000 });

const s = await ouvrirSonde({ largeur: 1100, hauteur: 900 });

try {
    // ── 1. UNE TABLETTE NEUVE, PRÉPARÉE ────────────────────────────────────
    await s.page.goto(`http://127.0.0.1:${s.port}/index.html?preparer`);
    await attendreLeVerdict(s.page);
    dire('VERDICT :', (await s.page.textContent('[data-verdict]')).replace(/\s+/g, ' ').trim());
    dire('AVANT LA MISE À JOUR :', JSON.stringify(await etatDuCache(s.page)));

    // LE CODE DU PARCOURS SE CALCULE DANS NODE, et c'est une leçon payée : un
    // `import()` lancé DANS la page pour le calculer réchauffe le cache du
    // navigateur avec les modules du jeu, et la mesure hors ligne qui suit
    // mesure alors ce réchauffage. Tout ce qu'une sonde fait faire à la page
    // avant la mesure fait partie de la mesure.
    const { Shortcodes } = await import('../js/core/shortcodes.js');
    const { makePath, makeStep } = await import('../js/core/path.js');
    const code = Shortcodes.encodePath(
        makePath('Essai', [makeStep('log-tasuko', {}, { nbItems: 3, threshold: 1 })]));

    // ── 2. ON DÉPLOIE. Le rituel, celui que Rémy lance à chaque dépôt. ─────
    dire('\n--- node tools/version.mjs ---');
    dire(execFileSync('node', ['tools/version.mjs'], { cwd: RACINE, encoding: 'utf8' })
        .split('\n').filter(l => l.trim()).slice(-2).join('\n'));

    // ── 3. LA TABLETTE RECHARGE. C'est tout ce qu'elle fait. ───────────────
    await s.page.goto(`http://127.0.0.1:${s.port}/index.html`);
    await s.page.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
    let apres = null;
    for (const t of [2, 10, 15, 25, 40]) {
        await dormir(t === 2 ? 2000 : 5000);
        apres = await etatDuCache(s.page);
        dire(`  à ${String(t).padStart(2)} s :`, JSON.stringify(apres));
    }

    // ── 4. HORS LIGNE, LE JEU TOURNE-T-IL ENCORE ? ─────────────────────────
    const auJeu = async (quand) => {
        await s.ctx.setOffline(true);
        await s.page.goto(`http://127.0.0.1:${s.port}/index.html?code=${encodeURIComponent(code)}`);
        await dormir(6000);
        const vu = await s.page.evaluate(() => ({
            plateau: !!document.querySelector('.tk-grille, .game-question, #game-board'),
            corps: document.body.innerText.replace(/\s+/g, ' ').slice(0, 140)
        }));
        dire(`\nHORS LIGNE ${quand} :`, JSON.stringify(vu));
        await s.ctx.setOffline(false);
        return vu;
    };
    await auJeu('APRÈS LA MISE À JOUR');

    // ── 5. ET SI ELLE REFAIT LA PRÉPARATION ? ──────────────────────────────
    await s.page.goto(`http://127.0.0.1:${s.port}/index.html?preparer`);
    await attendreLeVerdict(s.page);
    dire('\nVERDICT APRÈS NOUVELLE PRÉPARATION :',
        (await s.page.textContent('[data-verdict]')).replace(/\s+/g, ' ').trim());
    dire('CACHE :', JSON.stringify(await etatDuCache(s.page)));
    await auJeu('APRÈS NOUVELLE PRÉPARATION');

    dire('\nfenêtres natives :', s.fenetresNatives.length, '| erreurs :', s.erreurs.length);
    if (s.erreurs.length) dire(s.erreurs.slice(0, 5));
} finally {
    remettre();
    await s.fermer();
}
