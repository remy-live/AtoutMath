/**
 * METTRE TOUTE LA CLASSE EN PAUSE — depuis le bouton, jusqu'à l'écran de l'élève.
 *
 * RÉMY : « je n'ai pas réussi à mettre toute la classe en pause ».
 *
 * Il n'y arrivait pas parce que cela n'existait pas : le voile de pause ne
 * pouvait être déclenché que par un COMPTE À REBOURS arrivé à zéro, et le
 * bouton qui portait les mots « Mettre en pause » fermait en réalité le
 * catalogue — ce qui ne se voit pas chez l'élève qui travaille déjà.
 *
 * CETTE SONDE PREND SON CHEMIN : il ouvre l'écran de sa classe, il appuie, et
 * l'on regarde l'écran d'un élève qui est en train de travailler. Puis il rend
 * la main, et l'élève doit retrouver sa question — « une pause qui perd le
 * travail en cours n'est pas une pause, c'est une punition ».
 *
 *   node tools/pauseDeLaClasse.mjs
 */
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

let rates = 0;
const dire = (quoi, bon, detail = '') => {
    if (!bon) rates++;
    console.log(`  ${bon ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${quoi}`
        + (detail ? ` \x1b[2m— ${detail}\x1b[0m` : ''));
};

const s = await ouvrirSonde({ largeur: 1280, hauteur: 900 });
await s.identifier();
const cid = s.info.classe;

// Une séance imposée, pour que l'élève soit EN TRAIN DE TRAVAILLER : c'est le
// seul cas qui compte — en pause, il doit retrouver sa question.
const pid = await s.page.evaluate(async ([cid]) => {
    const { state } = await import('./js/core/state.js');
    const { makePath, makeStep } = await import('./js/core/path.js');
    const { politiquePerso } = await import('./js/core/mesExercices.js');
    const { donnerAuServeur } = await import('./js/core/parcoursServeur.js');
    const p = makePath('Séance de la pause', [
        makeStep('calc-add', {}, { stepId: 'a', nbItems: 8 }),
    ], politiquePerso());
    const e = state.saveTeacherPath(p.name, p);
    const r = await donnerAuServeur(e, cid);
    return r.pathId || null;
}, [cid]);
await dormir(1200);
await s.page.evaluate(async ([cid, pid]) => {
    const { imposerLaSeance } = await import('./js/core/espaceProf.js');
    await imposerLaSeance(cid, pid);
}, [cid, pid]);

const billet = await s.page.evaluate(async ([cid]) => {
    const { listeDeClasse } = await import('./js/core/espaceProf.js');
    const r = await listeDeClasse(cid);
    const e = (r.eleves || []).find((x) => x.login && x.code);
    return `${e.login}/${e.code}`;
}, [cid]);

const ctx = await s.nav.newContext({ viewport: { width: 1100, height: 800 } });
const p = await ctx.newPage();
const erreursEleve = [];
p.on('pageerror', (e) => erreursEleve.push(String(e).slice(0, 160)));
p.on('dialog', async (d) => { erreursEleve.push('FENÊTRE NATIVE : ' + d.message()); await d.dismiss(); });
await p.goto(`http://127.0.0.1:${s.port}/index.html?poste=1#billet=${encodeURIComponent(billet)}`);
await p.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
await dormir(13000);

// L'élève ouvre sa séance et joue. `.world-map-play` est LU dans
// js/ui/pathView.js — c'est le bouton « Jouer : … » du bas de la carte.
// (`.path-ouvrir-seance` existe aussi dans ce fichier, mais sur une AUTRE
// branche : il rend 0 ici, c'est-à-dire la même réponse qu'un logiciel cassé.)
const n = await p.locator('.world-map-play').count();
dire('l\'élève a sa séance, et le bouton pour l\'ouvrir', n > 0, String(n));
if (n) {
    await p.locator('.world-map-play').first().click();
    await dormir(2200);
    await p.evaluate(() => {
        const b = [...document.querySelectorAll('#game-layer button')]
            .filter(x => x.getBoundingClientRect().width > 0)
            .find(x => /^(jouer|commencer|c'est parti|démarrer)/i.test((x.textContent || '').trim()));
        if (b) b.click();
    });
    await dormir(2500);
}

/**
 * Ce que l'élève a sous les yeux. Crochets LUS : `#le-moment-pause` et
 * `.moment-pause-carte` (js/ui/leMoment.js), `#game-board` / `.game-question`
 * (index.html et les jeux).
 */
const ecran = () => p.evaluate(() => {
    const v = document.getElementById('le-moment-pause');
    const q = document.querySelector('#game-board .game-question, #game-board canvas');
    return {
        voile: !!(v && v.getBoundingClientRect().width > 0),
        mot: v ? ((v.querySelector('p') || {}).textContent || '').trim() : null,
        // LA QUESTION RESTE MONTÉE DESSOUS : c'est la moitié de la promesse.
        question: !!(q && q.getBoundingClientRect().width > 0),
        texte: q ? (q.textContent || '').trim().slice(0, 30) : null,
    };
});

const avant = await ecran();
dire('il travaille, et aucun voile ne le couvre', !avant.voile && avant.question,
    JSON.stringify(avant));

// ── LE PROFESSEUR APPUIE SUR SON BOUTON ────────────────────────────────────
console.log('\n\x1b[1mLE PROFESSEUR MET LA CLASSE EN PAUSE\x1b[0m');
const dit = await s.page.evaluate(async ([cid]) => {
    const { mettreLaClasseEnPause } = await import('./js/core/espaceProf.js');
    const r = await mettreLaClasseEnPause(cid, 'On corrige au tableau.');
    return { ok: !!r.ok, dit: r.dit || r.erreur || '' };
}, [cid]);
dire('le serveur a pris la pause', dit.ok, dit.dit);

await dormir(13000);
const pendant = await ecran();
dire('L\'ÉCRAN DE L\'ÉLÈVE SE COUVRE', pendant.voile, JSON.stringify(pendant));
dire('et le voile porte le mot du professeur',
    /corrige au tableau/i.test(pendant.mot || ''), JSON.stringify(pendant.mot));
dire('SON TRAVAIL EST RESTÉ DESSOUS', pendant.question,
    JSON.stringify(pendant.texte));
await p.screenshot({ path: 'tools/tmp/pause-eleve.png' });

// ── ET IL REND LA MAIN ─────────────────────────────────────────────────────
console.log('\n\x1b[1mLE PROFESSEUR REND LA MAIN\x1b[0m');
await s.page.evaluate(async ([cid]) => {
    const { rendreLaMain } = await import('./js/core/espaceProf.js');
    await rendreLaMain(cid);
}, [cid]);
await dormir(13000);
const apres = await ecran();
dire('LE VOILE PART', !apres.voile, JSON.stringify(apres));
dire('et l\'élève retrouve sa question, à l\'identique',
    apres.question && apres.texte === avant.texte,
    `${JSON.stringify(avant.texte)} → ${JSON.stringify(apres.texte)}`);

// ── LE BOUTON DU PROFESSEUR DIT CE QU'IL FAIT ──────────────────────────────
console.log('\n\x1b[1mSON ÉCRAN À LUI\x1b[0m');
const boutons = await s.page.evaluate(async ([cid]) => {
    const { leDirect } = await import('./js/core/espaceProf.js');
    const r = await leDirect(cid);
    return { pause: r.pause || null };
}, [cid]);
dire('le direct dit que la classe n\'est plus en pause',
    boutons.pause === null, JSON.stringify(boutons));

console.log('\n' + '─'.repeat(60));
const toutes = [...s.erreurs, ...erreursEleve];
console.log(`fenêtres natives et erreurs de page : ${s.fenetresNatives.length + toutes.length}`);
if (toutes.length) console.log(toutes.slice(0, 6).join('\n'));
const bon = rates === 0 && toutes.length === 0 && s.fenetresNatives.length === 0;
console.log(bon ? '\x1b[32mTOUT PASSE\x1b[0m' : `\x1b[31m${rates} mesure(s) en échec\x1b[0m`);
await s.fermer();
process.exit(bon ? 0 : 1);
