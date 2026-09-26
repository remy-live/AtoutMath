// OUVRIR UN EXERCICE DANS UN VRAI NAVIGATEUR, ET DIRE CE QUI NE TIENT PAS.
//
// NÉ DE DEUX FRICTIONS, relevées par l'audit de rendu du 26 septembre :
//
//   1. « Ouvrir un exercice par le meneur demande de recopier sept lignes à
//      chaque sonde. » Sept lignes, plus le site d'essai, plus l'attente du
//      montage, plus le clic sur « JOUER » des jeux à canevas.
//   2. « Une sonde de rendu qui n'annonce pas `pointer: coarse` ment sur toutes
//      les tailles de cibles. » Deux heures de faux signalements : le plancher
//      de 44 px du dépôt vit sous `@media (pointer: coarse)`, et un navigateur
//      d'ordinateur rétréci annonce un pointeur FIN. On mesurait une fenêtre
//      étroite, pas un téléphone.
//
// D'où le défaut de cet outil : TOUTE TAILLE SOUS 768 px S'OUVRE AU DOIGT,
// avec `hasTouch` et `isMobile`. C'est la seule façon d'obtenir les vraies
// tailles de cibles, et ce n'est pas une option qu'on pense à cocher.
//
//     node tools/ouvrirExercice.mjs calc-sudoku
//     node tools/ouvrirExercice.mjs calc-sudoku 360x640,768x900,1440x900
//     node tools/ouvrirExercice.mjs geo-patchwork 390x844 --image
//
// CE QU'IL DIT, par taille : ce qui dépasse SOUS la fenêtre (le défaut le plus
// grave possible — l'élève ne peut pas répondre), ce qui sort du plateau, les
// cibles sous 44 px, le débordement horizontal de la page, et les erreurs.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as attendre } from 'node:timers/promises';

const EXO = process.argv[2];
if (!EXO) {
    console.log('usage : node tools/ouvrirExercice.mjs <id> [LxH,LxH…] [--image]');
    process.exit(2);
}
const TAILLES = (process.argv[3] && !process.argv[3].startsWith('--')
    ? process.argv[3] : '360x640,768x900,1440x900')
    .split(',').map(t => { const [l, h] = t.split('x').map(Number); return { l, h }; });
const IMAGE = process.argv.includes('--image');

const PORT = String(9400 + Math.floor(Math.random() * 180));
const srv = spawn('php', ['tools/siteEssai.php', PORT], { stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((ok, ko) => {
    const t = setTimeout(() => ko(new Error('le site d\'essai n\'a pas démarré')), 30000);
    srv.stdout.on('data', d => { if (String(d).includes('"port"')) { clearTimeout(t); ok(); } });
    srv.on('error', ko);
});
await attendre(400);

const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
let defauts = 0;

for (const { l, h } of TAILLES) {
    // LE DOIGT SOUS 768, LA SOURIS AU-DESSUS. Voir le préambule : c'est la
    // raison d'être de cet outil.
    const auDoigt = l <= 768;
    const ctx = await nav.newContext({
        viewport: { width: l, height: h },
        hasTouch: auDoigt, isMobile: auDoigt, deviceScaleFactor: 2
    });
    const p = await ctx.newPage();
    const soucis = [];
    p.on('pageerror', e => soucis.push(String(e).slice(0, 160)));
    p.on('dialog', async (d) => { soucis.push('FENÊTRE NATIVE : ' + d.message()); await d.dismiss(); });

    await p.goto(`http://127.0.0.1:${PORT}/index.html`);
    await p.waitForFunction(() => window.__atoutmathPret === true, { timeout: 20000 });

    const monte = await p.evaluate(async (exoId) => {
        const { getExerciseById } = await import('./js/data/catalog.js');
        const exo = getExerciseById(exoId);
        if (!exo) return 'inconnu au catalogue';
        const { makeStep, makePath } = await import('./js/core/path.js');
        const { politiquePerso } = await import('./js/core/mesExercices.js');
        const { Runner } = await import('./js/core/runner.js');
        const pas = makeStep(exo.id, {}, { stepId: 's1', nbItems: 8, threshold: 0 });
        new Runner({ path: makePath('Sonde', [pas], politiquePerso()), deviceMode: 'none' }).start();
        return null;
    }, EXO);
    if (monte) { console.log(`  ${EXO} : ${monte}`); process.exit(2); }
    await attendre(3200);

    // LES JEUX À CANEVAS S'OUVRENT SUR UN ÉCRAN « JOUER ». Sans ce clic, on
    // mesure une page d'accueil en croyant mesurer un jeu.
    await p.evaluate(() => {
        const b = [...document.querySelectorAll('#game-layer button')]
            .filter(x => x.getBoundingClientRect().width > 0)
            .find(x => /^(jouer|commencer|c'est parti|démarrer|go)/i.test((x.textContent || '').trim()));
        if (b) b.click();
    });
    await attendre(2000);

    const m = await p.evaluate(() => {
        const vu = (e) => {
            const r = e.getBoundingClientRect();
            const s = getComputedStyle(e);
            return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
        };
        const nom = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 26)
            || e.getAttribute('aria-label') || e.className || e.tagName;
        const H = document.documentElement.clientHeight;
        const W = document.documentElement.clientWidth;
        const couche = document.getElementById('game-layer');
        const plateau = document.getElementById('game-board') || document.querySelector('.canvas-area');

        const cliquables = [...(couche ? couche.querySelectorAll('button, [role="button"], a, input, select') : [])]
            .filter(vu);

        return {
            // LE DÉFAUT LE PLUS GRAVE : un bouton sous la fenêtre. L'élève ne
            // peut pas répondre, et rien ne le lui dit.
            sousLaFenetre: cliquables
                .map(e => ({ q: nom(e), bas: Math.round(e.getBoundingClientRect().bottom) }))
                .filter(x => x.bas > H + 1),
            aDefiler: plateau ? Math.max(0, plateau.scrollHeight - plateau.clientHeight) : 0,
            horsPlateau: (() => {
                if (!plateau) return null;
                const pr = plateau.getBoundingClientRect();
                return [...plateau.children].filter(vu).map(e => {
                    const r = e.getBoundingClientRect();
                    return { q: nom(e), depasse: Math.round(Math.max(0, r.right - pr.right, pr.left - r.left)) };
                }).filter(x => x.depasse > 1);
            })(),
            // LES CASES D'UNE GRILLE NE SONT PAS DES BOUTONS QU'ON DESSINE.
            //
            // Neuf colonnes de sudoku dans 360 px font 40 px chacune, et aucun
            // réglage n'y changera rien : c'est la grille qui décide, pas la
            // case. Les signaler, c'est rendre cinquante-huit fausses pistes
            // par exercice — la faute même que ce dépôt a payée deux fois
            // (voir `tools/apercusVides.mjs` et `tools/nouvelExercice.mjs`).
            //
            // On ne garde donc que les cibles HORS GRILLE : celles dont la
            // taille est un choix, et qu'on peut donc corriger.
            cibles: cliquables.filter(e => {
                // ON REMONTE DE TROIS CRANS : la case est souvent enveloppée,
                // et regarder le seul parent laissait passer toutes les cases
                // de sudoku. Mesuré : 58 fausses pistes par exercice.
                // UN TABLEAU EST UNE GRILLE, LUI AUSSI. Les cellules d'un
                // tableau à double entrée se dimensionnent par colonnes ; cinq
                // colonnes dans 360 px ne feront jamais 44 px chacune.
                if (e.closest('table')) return false;
                let p = e.parentElement;
                for (let n = 0; n < 3 && p; n++, p = p.parentElement) {
                    const g = getComputedStyle(p).display;
                    if ((g === 'grid' || g === 'inline-grid') && p.children.length > 8) return false;
                }
                return true;
            }).map(e => {
                const r = e.getBoundingClientRect();
                return { q: nom(e), w: Math.round(r.width), h: Math.round(r.height) };
            }).filter(x => x.w < 44 || x.h < 44),
            pageDeborde: Math.round(document.documentElement.scrollWidth - W),
            aLire: ((couche && couche.innerText) || '').replace(/\s+/g, ' ').trim().length
        };
    });

    const mot = auDoigt ? 'doigt' : 'souris';
    console.log(`\n  ${EXO} · ${l}×${h} (${mot})`);
    console.log(`    à lire : ${m.aLire} signes · page déborde de ${m.pageDeborde} px`
        + ` · plateau à défiler : ${m.aDefiler} px`);
    if (m.sousLaFenetre.length) {
        defauts++;
        console.log('    SOUS LA FENÊTRE :');
        m.sousLaFenetre.forEach(x => console.log(`      · « ${x.q} » à ${x.bas} (fenêtre ${h})`));
    }
    if (m.horsPlateau && m.horsPlateau.length) {
        defauts++;
        m.horsPlateau.forEach(x => console.log(`    HORS DU PLATEAU : « ${x.q} » de ${x.depasse} px`));
    }
    if (auDoigt && m.cibles.length) {
        defauts++;
        m.cibles.slice(0, 6).forEach(x => console.log(`    CIBLE HORS GRILLE ${x.w}×${x.h} : « ${x.q} »`));
        if (m.cibles.length > 6) console.log(`    … et ${m.cibles.length - 6} autre(s)`);
    }
    if (soucis.length) { defauts++; soucis.slice(0, 3).forEach(x => console.log('    ERREUR : ' + x)); }
    if (IMAGE) {
        const f = `tools/tmp/exo-${EXO}-${l}x${h}.png`;
        await p.screenshot({ path: f });
        console.log('    ' + f);
    }
    await ctx.close();
}

console.log(`\n${defauts ? defauts + ' défaut(s)' : 'rien à signaler'}`);
await nav.close();
srv.kill();
process.exit(defauts ? 1 : 0);
