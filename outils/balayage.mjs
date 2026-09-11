// LE BALAYAGE — la moitié mécanique du banc d'essai.
//
// Le banc d'essai (palette d'auteur → ✓) sert à ce qu'une machine ne sait pas
// juger : est-ce que l'indice AIDE, est-ce que le robot montre la bonne façon
// de faire, est-ce que la fiche est imprimable telle quelle. Tout le reste est
// mécanique, et n'a aucune raison d'occuper quelqu'un :
//
//   · l'exercice se lance-t-il sans lever d'erreur ?
//   · dessine-t-il quelque chose, ou reste-t-il vide ?
//   · déborde-t-il horizontalement sur un téléphone ?
//   · sa fiche papier produit-elle des questions ?
//
// Ce script passe TOUS les exercices du catalogue, sur les tailles d'écran
// qu'on veut, et rend un rapport au MÊME FORMAT que le carnet du banc : les
// deux se lisent ensemble, et se fusionnent.
//
//   npm run balayage                  — téléphone, tous les exercices
//   npm run balayage -- --large       — ajoute la tablette et le poste fixe
//   npm run balayage -- --seul=geo-   — seulement les exercices dont l'id commence ainsi
//
// Il demande `playwright-core` et un Chromium : ce sont des outils d'auteur,
// pas des dépendances de l'application — celle-ci n'en a toujours aucune.

import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const PORT = 8137;
const args = process.argv.slice(2);
const seul = (args.find(a => a.startsWith('--seul=')) || '').slice(7);
const large = args.includes('--large');

const ECRANS = [
    { nom: 'telephone', largeur: 390, hauteur: 734, tactile: true },
    ...(large ? [
        { nom: 'tablette', largeur: 820, hauteur: 1080, tactile: true },
        { nom: 'bureau', largeur: 1440, hauteur: 900, tactile: false }
    ] : [])
];

let chromium;
try { ({ chromium } = await import('playwright-core')); }
catch (e) {
    console.error('Le balayage a besoin de playwright-core :\n'
        + '  npm install --no-save playwright-core\n'
        + 'et d\'un Chromium (PLAYWRIGHT_BROWSERS_PATH, ou --navigateur=/chemin/vers/chrome).');
    process.exit(2);
}

const serveur = spawn('python3', ['-m', 'http.server', String(PORT)], { stdio: 'ignore' });
const finir = (code) => { serveur.kill(); process.exit(code); };
process.on('SIGINT', () => finir(130));
await new Promise(r => setTimeout(r, 1200));

const chemin = (args.find(a => a.startsWith('--navigateur=')) || '').slice(13);
const nav = await chromium.launch(chemin ? { executablePath: chemin } : {});
const lignes = [];
let appareilPrincipal = null;

for (const ecran of ECRANS) {
    const ctx = await nav.newContext({
        viewport: { width: ecran.largeur, height: ecran.hauteur },
        isMobile: ecran.tactile, hasTouch: ecran.tactile
    });
    const page = await ctx.newPage();
    const erreurs = [];
    page.on('pageerror', e => erreurs.push(String(e.message).slice(0, 200)));
    page.on('console', m => { if (m.type() === 'error') erreurs.push(m.text().slice(0, 200)); });

    await page.goto(`http://localhost:${PORT}/index.html`);
    await page.waitForTimeout(2200);
    await page.evaluate(() => {
        const a = document.getElementById('accueil-modal');
        if (a) a.style.display = 'none';
    });

    const infos = await page.evaluate(async () => {
        const { decrireAppareil, nommerAppareil } = await import('/js/core/bancEssai.js');
        const { exercices } = await import('/js/data/catalog.js');
        const a = decrireAppareil(window);
        return { appareil: a, nom: nommerAppareil(a), exercices: exercices.map(e => ({
            id: e.id, titre: e.title, activite: e.activityId || '' })) };
    });
    if (!appareilPrincipal) appareilPrincipal = infos.appareil;
    const liste = infos.exercices.filter(e => !seul || e.id.startsWith(seul));
    console.log(`\n— ${infos.nom} : ${liste.length} exercices`);

    for (const exo of liste) {
        erreurs.length = 0;
        const bilan = await essayer(page, exo.id);
        const verdicts = {
            marche: bilan.lance && !erreurs.length ? 'ok' : 'ko',
            'mise-en-page': bilan.deborde ? 'ko' : (bilan.lance ? 'ok' : 'na')
        };
        const notes = [];
        if (!bilan.lance) notes.push('ne se lance pas (rien ne s\'affiche dans la couche de jeu)');
        if (bilan.deborde) notes.push(`déborde en largeur : ${bilan.deborde}`);
        if (erreurs.length) notes.push(`erreur : ${[...new Set(erreurs)].join(' | ')}`);
        lignes.push({
            exercice: exo.id, titre: exo.titre, activite: exo.activite,
            appareilNom: infos.nom, version: bilan.version, date: Date.now(),
            verdicts, note: notes.join(' ; '), tags: null
        });
        const signe = verdicts.marche === 'ok' && verdicts['mise-en-page'] !== 'ko' ? '·' : '✗';
        process.stdout.write(signe);
    }
    await ctx.close();
}
await nav.close();

/** Lance un exercice, regarde ce qu'il devient, puis referme. */
async function essayer(page, id) {
    const bilan = await page.evaluate(async (exoId) => {
        const { exercices } = await import('/js/data/catalog.js');
        const { openGameLayer } = await import('/js/games/engine.js');
        const exo = exercices.find(e => e.id === exoId);
        const couche = document.getElementById('game-layer');
        couche.style.display = 'none';
        openGameLayer({ ...exo, params: { ...(exo.params || {}) }, paramSchema: exo.paramSchema });
        await new Promise(r => setTimeout(r, 1100));
        document.getElementById('btn-student-config-start')?.click();
        await new Promise(r => setTimeout(r, 1600));

        const zone = couche.querySelector('.game-canvas-area, #game-board') || couche;
        const contenu = (zone.textContent || '').trim().length + zone.querySelectorAll('svg,canvas,button,input').length;
        // LE DÉBORDEMENT QUI COMPTE est celui qu'on subit : la zone de jeu
        // elle-même défile en largeur. Signaler tout élément plus large que sa
        // boîte remontait des décors volontairement débordants — un outil qui
        // crie pour rien finit par ne plus être lu.
        let deborde = '';
        if (zone.scrollWidth > zone.clientWidth + 2) {
            const bord = zone.getBoundingClientRect().right;
            let pire = null, plus = 0;
            zone.querySelectorAll('*').forEach(el => {
                const d = el.getBoundingClientRect().right - bord;
                if (d > plus) { plus = d; pire = el; }
            });
            deborde = `${zone.scrollWidth}>${zone.clientWidth}`
                + (pire ? ` — le plus large : ${pire.className || pire.tagName} (+${Math.round(plus)} px)` : '');
        }
        const version = document.getElementById('db-version')?.textContent?.trim() || '';
        return { lance: contenu > 3, deborde, version };
    }, id);
    // ON FERME PAR LA CROIX, comme un utilisateur. Vider la zone de jeu à la
    // main laissait le moteur tourner sur des nœuds disparus : chaque jeu
    // animé rendait alors un « Cannot set properties of null » qui n'existait
    // que dans le balayage. Un outil qui invente ses propres pannes ne sert à
    // rien — il faut passer par le chemin de sortie du logiciel.
    await page.evaluate(() => document.getElementById('btn-close-game')?.click());
    await page.waitForTimeout(350);
    return bilan;
}

const { versMarkdown } = await import('../js/core/bancEssai.js');
const carnet = {
    format: 1, version: lignes[0]?.version || '', debut: Date.now(),
    appareil: appareilPrincipal || {}, lignes
};
const md = versMarkdown(carnet, { titre: 'Balayage automatique' });
writeFileSync('balayage.md', md + '\n\n<!-- CARNET -->\n```json\n' + JSON.stringify(carnet) + '\n```\n');
const casses = lignes.filter(l => l.verdicts.marche === 'ko' || l.verdicts['mise-en-page'] === 'ko');
console.log(`\n\n${lignes.length} passages, ${casses.length} à regarder. → balayage.md`);
casses.forEach(l => console.log(`  ✗ ${l.titre} (${l.exercice}) — ${l.note}`));
finir(casses.length ? 1 : 0);
