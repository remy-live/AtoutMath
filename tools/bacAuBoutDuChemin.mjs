// LE BAC À SABLE AU BOUT DU CHEMIN.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « on rajoute l'apparition du bac à sable si tout est fini qui se
// rajoute au monde ».
//
// CE QUE CETTE SONDE MESURE, et qu'aucune épreuve de bureau ne peut dire :
//
//   · QU'IL N'EST PAS LÀ AVANT. C'est la moitié la plus importante : la règle
//     qui ne se négocie pas est « il ne s'ouvre qu'une fois la séance FINIE »,
//     et une pastille visible dès le départ ferait exactement ce que le bac a
//     été écrit pour empêcher — bâcler pour arriver au jeu.
//   · QU'IL EST LÀ APRÈS, sur la carte, au bout du chemin.
//   · QU'UN CLIC DESSUS OUVRE VRAIMENT LE BAC. La pastille ne porte aucun
//     branchement propre : elle s'en remet à l'écouteur unique de
//     `ui/bacASable.js`. Si cet écouteur n'est pas posé, elle ne fait rien, en
//     silence.
//
//     node tools/bacAuBoutDuChemin.mjs
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

let ko = 0;
const dire = (bon, quoi) => { if (!bon) ko++; console.log(`  ${bon ? 'ok  ' : 'NON '} ${quoi}`); };

const s = await ouvrirSonde({ largeur: 1100, hauteur: 1000 });
await s.identifier();

/** Monte la vue de l'élève sur un parcours d'une seule étape. */
const monterLaVue = () => s.page.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    const { makeStep } = await import('./js/core/path.js');
    document.querySelectorAll('.student-only').forEach(
        e => e.style.setProperty('display', 'block', 'important'));
    document.getElementById('view-path').style.setProperty('display', 'block', 'important');
    state.setStudentPath([makeStep('calc-add', {}, { stepId: 'b1', nbItems: 2 })],
        { pathId: 'bac-essai', name: 'Une seule étape',
            policy: { presentation: 'chemin', decor: 'libre' } });
    const { renderStudentPathView } = await import('./js/ui/pathView.js');
    renderStudentPathView();
    return 'montée';
});

console.log('\n── AVANT : RIEN N’EST FAIT ──');
console.log('  vue :', await monterLaVue());
await s.doitExister('.world-node');
const avant = await s.page.evaluate(() => ({
    pastilles: document.querySelectorAll('.world-node').length,
    bac: document.querySelectorAll('.world-node--bac').length,
    porte: document.querySelectorAll('[data-ouvrir-bac]').length
}));
console.log('  ', JSON.stringify(avant));
dire(avant.bac === 0,
    'AUCUNE pastille de bac à sable tant que la séance n’est pas finie');

// ── ON FAIT LA SÉANCE POUR DE VRAI ──────────────────────────────────────────
// Le bac lit le JOURNAL, pas un drapeau : la seule façon honnête de le voir
// s'ouvrir est de répondre aux questions.
console.log('\n── ON FAIT L’ÉTAPE ──');
// ON VISE LA PASTILLE DU CHEMIN, PAS LE PREMIER BOUTON RENCONTRÉ. La section
// « Une autre séance ? » vit dans le même conteneur et porte elle aussi un
// bouton : la première version ouvrait la fenêtre « Entrer un code », et l'on
// cherchait ensuite pourquoi la séance ne se finissait pas.
await s.page.evaluate(() => document.querySelector('.duo-path .world-node-btn').click());
await dormir(1500);
for (let i = 0; i < 2; i++) {
    const q = await s.questionCourante();
    if (!q) { console.log('  pas de question lisible'); break; }
    console.log(`  question ${i + 1} : ${q.texte} → ${q.reponse}`);
    const clique = await s.page.evaluate((val) => {
        const b = document.querySelector(`.bubble[data-val="${val}"], [data-val="${val}"]`);
        if (b) { b.click(); return true; }
        return false;
    }, q.reponse);
    if (!clique) { console.log('  la bonne proposition n’est pas sur l’écran'); break; }
    await dormir(1800);
}
// LA SÉANCE SE CLÔT QUAND L'ÉLÈVE LE DIT. Le meneur affiche « Voir mon
// bilan » et attend : tant qu'on n'a pas appuyé, aucun `RUN_FINISHED` n'est
// écrit au journal, donc `avancementDuMoment` répond « en-cours » et le bac
// reste fermé. C'est le logiciel qui a raison — une séance qu'on n'a pas
// refermée n'est pas finie — et c'est la sonde qui ne jouait pas le dernier
// geste.
await dormir(1200);
const bilan = await s.page.evaluate(() => {
    const b = [...document.querySelectorAll('#game-layer button, #game-layer [role="button"]')]
        .find(x => /bilan|terminer|j.ai fini/i.test(x.textContent || ''));
    if (b) { b.click(); return b.textContent.trim(); }
    return null;
});
console.log('  on referme la séance :', JSON.stringify(bilan));
await dormir(2200);

// On revient à la carte : le bilan s'est ouvert par-dessus.
await s.page.evaluate(() => {
    document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
});
console.log('\n── APRÈS : TOUT EST FINI ──');
await monterLaVue();
await dormir(600);
const apres = await s.page.evaluate(() => {
    const b = document.querySelector('.world-node--bac');
    return {
        bac: document.querySelectorAll('.world-node--bac').length,
        dernier: b ? b === b.parentElement.lastElementChild : null,
        mot: b ? b.textContent.replace(/\s+/g, ' ').trim() : null,
        pointille: b ? getComputedStyle(b.querySelector('.world-node-btn')).borderStyle : null,
        ouvre: b ? b.querySelector('[data-ouvrir-bac]') !== null : false
    };
});
console.log('  ', JSON.stringify(apres));
dire(apres.bac === 1, 'la pastille du bac à sable est sur la carte');
dire(apres.dernier === true, 'et elle est AU BOUT du chemin, pas au milieu');
dire(apres.pointille === 'dashed', 'son liseré est pointillé — elle n’est pas au programme');
dire(apres.ouvre === true, 'elle porte le branchement qui ouvre le bac');

if (apres.bac === 1) {
    // LA COUCHE DE JEU RECOUVRE ENCORE LA CARTE. `photo` découpe la PAGE à
    // l'endroit de l'élément : sans ce rideau tiré, l'image rendait l'écran
    // « Sans faute ! » sous le nom de la carte.
    await s.page.evaluate(() => {
        const g = document.getElementById('game-layer');
        if (g) g.style.setProperty('display', 'none', 'important');
    });
    // ON FAIT PLACE NETTE AVANT DE PHOTOGRAPHIER ET AVANT DE CLIQUER. Une
    // fenêtre « 2 récompenses débloquées ! » s'ouvre à la fin d'une première
    // séance : elle a d'abord pris le clic — la sonde a conclu que la pastille
    // n'ouvrait rien alors qu'elle n'avait jamais été touchée — puis elle a
    // occupé toute la photo. C'est la friction que `elementFromPoint` a fermée
    // ailleurs ; ici il suffit de retirer les voiles.
    await s.page.evaluate(() =>
        document.querySelectorAll('.modal-overlay').forEach(m => m.remove()));
    await s.photo('.duo-path', 'tools/tmp/bac-au-bout.png');
    await s.page.evaluate(() => document.querySelector('.world-node--bac .world-node-btn').click());
    await dormir(1400);
    const ouvert = await s.page.evaluate(() => {
        const m = document.querySelector('.modal-overlay');
        return { quoi: m ? m.innerText.replace(/[\s]+/g, ' ').slice(0, 140) : 'AUCUNE MODALE',
            ok: !!m && /bac à sable|jouer|partie/i.test(m.innerText || '') };
    });
    console.log('  ce que le clic a ouvert :', JSON.stringify(ouvert));
    dire(ouvert.ok, 'et un clic dessus OUVRE le bac');
}

// ── ET SUR LES CINQ HABILLAGES ──────────────────────────────────────────────
//
// La pastille se pose dans `construireCarte`, le seul endroit où les cinq se
// rejoignent — comme le décor, et pour la même raison. Mais « elle devrait y
// être » et « elle y est » sont deux phrases différentes : le ruban garde ses
// pastilles dans une piste qui défile, pas dans son cadre, et un sixième
// habillage ajouté dans six mois la perdrait sans rien casser.
//
// LA LISTE CLASSIQUE N'EN A PAS, ET C'EST VOULU : elle se lit en toutes
// lettres, et une pastille ronde au bas d'une liste de titres n'y est pas chez
// elle. C'est la décision qui écarte déjà les ornements. La porte du bac reste
// sur l'écran de bilan, où elle a toujours été.
console.log('\n── SUR LES CINQ HABILLAGES ──');
for (const style of ['chemin', 'mondes', 'damier', 'ruban', 'classique']) {
    const vu = await s.page.evaluate(async (st) => {
        const { construireCarte } = await import('/js/ui/pathView.js');
        const { makeStep } = await import('/js/core/path.js');
        const carte = construireCarte(
            [makeStep('calc-add', {}, { stepId: 'a' }), makeStep('frac-add', {}, { stepId: 'b' })],
            { style: st, decor: 'retro', done: new Set(['a', 'b']),
                bac: { ouvert: true, pourquoi: 'fini', dire: 'Tu as fini.' } });
        const n = carte.querySelector('.world-node--bac');
        return { classes: carte.className.split(' ')[0],
            bac: carte.querySelectorAll('.world-node--bac').length,
            dernier: n ? n === n.parentElement.lastElementChild : null };
    }, style);
    console.log(`  ${style.padEnd(10)} ${JSON.stringify(vu)}`);
    const attendu = style === 'classique' ? 0 : 1;
    dire(vu.bac === attendu, style === 'classique'
        ? 'la liste classique n’en a pas — elle se lit en toutes lettres'
        : `« ${style} » porte la pastille du bac`);
    if (attendu) dire(vu.dernier === true, `   et elle y est en DERNIER`);
}

console.log(`\nerreurs de page : ${s.erreurs.length} · fenêtres natives : ${s.fenetresNatives.length}`);
ko += s.erreurs.length + s.fenetresNatives.length;
for (const e of s.erreurs.slice(0, 4)) console.log('  !', e);
await s.fermer();
console.log(ko === 0 ? '\nLE BAC EST AU BOUT DU CHEMIN, ET PAS AVANT.' : `\n${ko} POINT(S) ROUGE(S).`);
process.exit(ko === 0 ? 0 : 1);
