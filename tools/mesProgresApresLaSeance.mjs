// « DANS MES PROGRÈS, ELLE N'A RIEN » — et, quelques instants plus tard, si.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/mesProgresApresLaSeance.mjs
//
// RÉMY, 4 novembre : « j'ai aussi fait une séance avec les élèves et en allant
// dans le profil d'une élève je vois que dans mes progès, elle n'a rien », puis
// aussitôt : « en fait ca n'apparait pas tout de suite ».
//
// ── CE QU'IL FAUT MESURER N'EST PAS « EST-CE QUE ÇA ARRIVE » ───────────────
//
// Ça arrive. Le journal remonte au serveur en quelques secondes, et redescend
// sur l'appareil suivant au premier `syncNow`. Ce qui se voit mal, c'est ce que
// l'écran fait PENDANT ce temps-là, et surtout ce qu'il fait APRÈS :
//
//   · il se dessine avant que le journal soit arrivé — donc vide ;
//   · et il ne se redessine pas quand il arrive.
//
// L'élève (ou le professeur par-dessus son épaule) lit alors « Joue à quelques
// exercices » sur un appareil qui VIENT de recevoir une séance entière. Il
// faut recharger la page pour que la vérité apparaisse — ce que personne ne
// pense à faire, parce que rien ne le dit.
//
// ── POURQUOI UN DEUXIÈME TIROIR, ET NON UN RECHARGEMENT ───────────────────
//
// `?poste=2` ouvre un tiroir NEUF sur la même machine : un `localStorage`
// préfixé, une base IndexedDB à part. C'est exactement la situation de Rémy —
// un appareil qui n'a pas fait la séance et qui doit tout recevoir du serveur.
// Recharger le premier tiroir n'aurait rien mesuré : le journal y est déjà.

import { setTimeout as dormir } from 'node:timers/promises';
import { ouvrirSonde } from './sonde.mjs';

let ratés = 0;
const dire = (q, ok, d = '') => {
    if (!ok) ratés++;
    console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${q}${
        d ? ` \x1b[2m— ${d}\x1b[0m` : ''}`);
};

const s = await ouvrirSonde({ largeur: 1280, hauteur: 900 });
await s.identifier();
const classeId = s.info.classe;

// ── LE PROFESSEUR DONNE UNE SÉANCE ─────────────────────────────────────────
console.log('\n\x1b[1mLE PROFESSEUR DONNE UNE SÉANCE\x1b[0m');
const seance = await s.page.evaluate(async ([cid]) => {
    const { state } = await import('./js/core/state.js');
    const { makePath, makeStep } = await import('./js/core/path.js');
    const { politiquePerso } = await import('./js/core/mesExercices.js');
    const { donnerAuServeur } = await import('./js/core/parcoursServeur.js');
    const p = makePath('La séance du jeudi',
        ['calc-add', 'calc-sub'].map((e, i) =>
            makeStep(e, {}, { stepId: 'e' + i, nbItems: 8, threshold: 0 })),
        politiquePerso());
    const r = await donnerAuServeur(state.saveTeacherPath(p.name, p), cid);
    return { id: r.pathId || null, erreur: r.erreur || '' };
}, [classeId]);
dire('la séance part au serveur', !!seance.id, seance.erreur);

const billet = await s.page.evaluate(async ([cid]) => {
    const { listeDeClasse } = await import('./js/core/espaceProf.js');
    const r = await listeDeClasse(cid);
    const e = (r.eleves || []).find((x) => x.login && x.code);
    return e ? `${e.login}/${e.code}` : null;
}, [classeId]);
dire('un billet d\'élève est disponible', !!billet, String(billet));

// ── L'ÉLÈVE FAIT LA SÉANCE SUR LE POSTE DE LA CLASSE ───────────────────────
console.log('\n\x1b[1mL\'ÉLÈVE FAIT LA SÉANCE\x1b[0m');
const a = await s.ctx.newPage();
await a.goto(`http://127.0.0.1:${s.port}/index.html?poste=1#billet=${encodeURIComponent(billet)}`);
await a.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });

await s.page.evaluate(async ([cid, pid]) => {
    const { imposerLaSeance } = await import('./js/core/espaceProf.js');
    await imposerLaSeance(cid, pid);
}, [classeId, seance.id]);
await dormir(13000);

await a.evaluate(async () => {
    const m = await import('./js/ui/pathView.js');
    try { m.renderStudentPathView(); } catch (e) { /* la carte peut être déjà là */ }
});
for (let i = 0; i < 70; i++) {
    const quoi = await a.evaluate(async () => {
        const { state } = await import('./js/core/state.js');
        const r = state.activeSequenceRunner;
        const vis = (e) => e.getBoundingClientRect().width > 0
            && e.dataset.eliminated !== '1' && getComputedStyle(e).pointerEvents !== 'none';
        const compris = document.querySelector('.fb-card--blocking .fb-close');
        if (compris && compris.getBoundingClientRect().width > 0) { compris.click(); return 'correction'; }
        const choix = [...document.querySelectorAll('#game-layer [data-idx]')].filter(vis);
        if (choix.length) {
            const it = r && r.session && r.session.current;
            const bonne = it && (it.choices || []).find(c => c.correct);
            const t = bonne ? String(bonne.label).trim() : null;
            (choix.find(b => (b.textContent || '').trim() === t) || choix[0]).click();
            return 'question';
        }
        const champ = [...document.querySelectorAll('#game-layer input[type="text"], #game-layer input:not([type])')]
            .filter(e => e.getBoundingClientRect().width > 0)[0];
        if (champ) {
            const it = r && r.session && r.session.current;
            champ.focus();
            champ.value = it && it.answer !== undefined ? String(it.answer) : '0';
            champ.dispatchEvent(new Event('input', { bubbles: true }));
            champ.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
            return 'saisie';
        }
        const suite = document.getElementById('btn-run-next');
        if (suite && suite.getBoundingClientRect().width > 0) { suite.click(); return 'suite'; }
        const jouer = document.querySelector('.world-map-play');
        if (jouer && jouer.getBoundingClientRect().width > 0) { jouer.click(); return 'carte'; }
        const fin = document.getElementById('btn-report-close');
        if (fin && fin.getBoundingClientRect().width > 0) { fin.click(); return 'bilan'; }
        return 'rien';
    });
    if (quoi === 'bilan') break;
    await dormir(450);
}
const faites = await a.evaluate(async () => {
    const { journal } = await import('./js/core/journal.js');
    return journal.all().filter(e => e.type === 'attempt').length;
});
dire('ET IL A VRAIMENT RÉPONDU — sans quoi la suite ne mesure rien',
    faites >= 10, `${faites} tentative(s)`);
await a.evaluate(async () => {
    const { syncNow } = await import('./js/core/sync.js');
    try { await syncNow({ silent: true }); } catch (e) { /* on relira */ }
});
await dormir(2500);

// ── ET L'ON OUVRE SON PROFIL SUR UN APPAREIL QUI N'A RIEN VU ───────────────
console.log('\n\x1b[1mSON PROFIL, SUR UN APPAREIL QUI N\'A RIEN VU\x1b[0m');
const b = await s.ctx.newPage();
const erreursB = [];
b.on('pageerror', (e) => erreursB.push(String(e).slice(0, 160)));
b.on('dialog', async (d) => { erreursB.push('FENÊTRE NATIVE : ' + d.message()); await d.dismiss(); });
await b.goto(`http://127.0.0.1:${s.port}/index.html?poste=2#billet=${encodeURIComponent(billet)}`);
await b.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });

/** Ouvre « Mes progrès » et dit ce qu'on y lit, SANS recharger. */
async function lireLesProgres() {
    return b.evaluate(async () => {
        const { setTopNavMode } = await import('./js/ui/navigation.js');
        setTopNavMode('profile');
        const onglet = document.querySelector('.prof-onglets [data-onglet="progres"]');
        if (onglet) onglet.click();
        const c = document.getElementById('skill-stats-container');
        const { journal } = await import('./js/core/journal.js');
        return {
            texte: c ? (c.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 110) : null,
            lignes: c ? c.querySelectorAll('.skill-row').length : 0,
            vide: !!(c && c.querySelector('.empty-state-msg')),
            auJournal: journal.all().filter(e => e.type === 'attempt').length
        };
    });
}

// TOUT DE SUITE : le journal n'est probablement pas encore arrivé, et c'est
// normal. Ce qui n'est pas normal, c'est ce que l'écran en dit.
await dormir(1200);
const tot = await lireLesProgres();
console.log(`   tout de suite  : ${tot.lignes} ligne(s), ${tot.auJournal} au journal`);
console.log(`                    « ${tot.texte} »`);

// ET QUINZE SECONDES PLUS TARD, SANS RECHARGER. C'est LE geste que personne ne
// fait : on regarde l'écran, on ne le recharge pas.
await dormir(15000);
const apres = await lireLesProgres();
console.log(`   15 s plus tard : ${apres.lignes} ligne(s), ${apres.auJournal} au journal`);
console.log(`                    « ${apres.texte} »`);

dire('LE JOURNAL EST BIEN REDESCENDU SUR CET APPAREIL — témoin de la mesure',
    apres.auJournal >= 10, `${apres.auJournal} tentative(s) reçues`);
// LA MESURE DE RÉMY : l'écran se remplit TOUT SEUL, sans rechargement.
dire('ET « MES PROGRÈS » SE REMPLIT TOUT SEUL, SANS RECHARGER',
    apres.lignes > 0 || !apres.vide,
    `${apres.lignes} ligne(s) — « ${apres.texte} »`);

console.log(`\nerreurs de page : ${s.erreurs.length + erreursB.length}, `
    + `fenêtres natives : ${s.fenetresNatives.length}`);
erreursB.slice(0, 3).forEach(e => console.log('  ! ' + e));
if (s.fenetresNatives.length) ratés++;
await s.fermer();

console.log(ratés ? `\n\x1b[31m${ratés} chose(s) à regarder.\x1b[0m` : '\n\x1b[32mTOUT PASSE.\x1b[0m');
process.exit(ratés ? 1 : 0);
