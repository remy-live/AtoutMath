// LES FENÊTRES DU PROFESSEUR : LEUR BOUTON EST-IL ATTEIGNABLE ?
//
// NÉE D'UNE FRICTION relevée par un audit : « il n'existe aucun outil pour
// ouvrir une fenêtre de l'espace professeur à une taille donnée et dire si son
// bouton de validation est atteignable ». Trois sondes l'avaient refait chacune
// à leur façon.
//
// LE TEST QUI COMPTE n'est pas « le bouton est-il sous la ligne de flottaison »
// mais « L'EST-IL ENCORE APRÈS UN DÉFILEMENT ». Un bouton sous la ligne dans
// une boîte qui défile se rattrape ; le même dans une boîte qui ne défile pas
// est perdu, et c'était le cas de toutes les fenêtres de `demander.js`.
//
// ET LE TITRE SE MESURE AVANT DE TOUCHER À QUOI QUE CE SOIT : le mesurer après
// avoir fait défiler soi-même, c'est rapporter comme un défaut du logiciel ce
// qu'on vient de provoquer — un audit a failli le faire.
//
//     node tools/fenetresDuProf.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as attendre } from 'node:timers/promises';
const PORT = String(9650 + Math.floor(Math.random() * 40));
const srv = spawn('php', ['tools/siteEssai.php', PORT], { stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((ok) => srv.stdout.on('data', d => { if (String(d).includes('"port"')) ok(); }));
await attendre(400);
const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ok = (q, v, d = '') => { console.log((v ? '  ok   ' : '  NON  ') + q + (d ? '  — ' + d : '')); if (!v) process.exitCode = 1; };

for (const [L, H] of [[360, 640], [640, 360]]) {
    const ctx = await nav.newContext({ viewport: { width: L, height: H }, hasTouch: L <= 768, isMobile: L <= 768 });
    const p = await ctx.newPage();
    p.on('pageerror', e => console.log('   ERREUR :', String(e).slice(0, 140)));
    p.on('dialog', async d => { console.log('   FENÊTRE NATIVE :', d.message()); await d.dismiss(); });
    await p.goto(`http://127.0.0.1:${PORT}/index.html`);
    await p.waitForFunction(() => window.__atoutmathPret === true, { timeout: 20000 });
    console.log(`\n  ── ${L} × ${H}`);

    // UNE FENÊTRE `demander` AVEC BEAUCOUP DE CONTENU : c'est le cas mesuré par
    // l'audit — six propositions d'indice, deux de 150 signes.
    const vu = await p.evaluate(async () => {
        const { demander } = await import('./js/ui/demander.js');
        demander('Un coup de pouce pour Marie-Ange', {
            aide: ('Une phrase de coup de pouce assez longue pour déborder. ').repeat(40), bouton: 'Souffler', valeur: ''
        });
        await new Promise(r => setTimeout(r, 400));
        const b = document.querySelector('#demander-ok');
        if (!b) return null;
        // LE TITRE SE LIT À L'OUVERTURE, AVANT QU'ON TOUCHE À QUOI QUE CE SOIT.
        // Le mesurer APRÈS un `scrollIntoView` sur le bouton, c'est mesurer sa
        // position après avoir soi-même fait défiler la boîte en bas — la faute
        // qu'un audit a déjà failli rapporter comme un défaut du logiciel.
        const titreAvant = Math.round(
            (document.querySelector('#demander-titre') || {}).getBoundingClientRect
                ? document.querySelector('#demander-titre').getBoundingClientRect().top : 0);
        b.scrollIntoView({ block: 'center' });
        await new Promise(r => setTimeout(r, 250));
        const r = b.getBoundingClientRect();
        const boite = document.querySelector('.demander-boite');
        const titre = document.querySelector('#demander-titre');
        return {
            bas: Math.round(r.bottom), haut: Math.round(r.top), h: Math.round(r.height),
            hautTitre: titreAvant, void0: titre ? 1 : 0,
            defile: boite ? Math.max(0, boite.scrollHeight - boite.clientHeight) : 0,
            fenetre: document.documentElement.clientHeight
        };
    });
    ok('la fenêtre s\'ouvre', !!vu);
    if (vu) {
        ok('le bouton de validation est DANS l\'écran, après défilement',
            vu.bas <= vu.fenetre, `bas ${vu.bas}, fenêtre ${vu.fenetre}`);
        ok('et le titre n\'est pas au-dessus du bord', vu.hautTitre >= 0, `titre à ${vu.hautTitre}`);
        ok('la boîte défile quand elle déborde', vu.defile > 0 || vu.bas <= vu.fenetre,
            `${vu.defile} px à défiler`);
        if (L <= 768) ok('le bouton se vise au doigt', vu.h >= 44, `${vu.h} px de haut`);
    }
    await ctx.close();
}
await nav.close(); srv.kill();
