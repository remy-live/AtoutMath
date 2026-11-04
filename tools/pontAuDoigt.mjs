// LE PONT ET LA LAMPE, JOUÉ AU DOIGT — et les dix-sept minutes obtenues.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/pontAuDoigt.mjs
//
// RÉMY, 4 novembre : « Oui super et il faut que ce soit joli », puis « le A ».
//
// ── CE QUE LES ÉPREUVES DE NOYAU NE PEUVENT PAS DIRE ───────────────────────
//
// `tests/pontLampe.test.mjs` prouve que le minimum vaut dix-sept et que le
// chemin est jouable. Il ne prouve pas qu'un élève puisse le JOUER : entre le
// calcul et son doigt il y a quatre marcheurs à toucher, un bouton à presser,
// une lampe qui change de rive et un compteur qui doit suivre. Chacun de ces
// maillons peut casser sans qu'une seule épreuve rougisse.
//
// ON JOUE DONC LA SOLUTION, coup par coup, et l'on regarde le compteur. S'il
// n'affiche pas dix-sept à la fin, c'est l'écran qui ment — pas le calcul.
//
// ET L'ON VÉRIFIE LA RÈGLE QUI SE VOIT LE MOINS : on ne monte que du côté de
// la lampe. C'est elle qui fait qu'un élève touche trois fois le même marcheur
// en croyant que l'écran ne répond pas.

import { setTimeout as dormir } from 'node:timers/promises';
import { ouvrirSonde } from './sonde.mjs';

let ratés = 0;
const dire = (q, ok, d = '') => {
    if (!ok) ratés++;
    console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${q}${
        d ? ` \x1b[2m— ${d}\x1b[0m` : ''}`);
};

const s = await ouvrirSonde({ largeur: 1280, hauteur: 1060 });
await s.identifier();
const raté = await s.ouvrirExercice('logi-pont-lampe', { niveau: '2' }, { questions: 2 });
if (raté) throw new Error(`ouverture : ${raté}`);
await dormir(800);

// LES CROCHETS SE DÉCLARENT : un sélecteur inventé rend `false`, c'est-à-dire
// la même réponse qu'un écran cassé.
await s.doitExister('.pl-scene', 'la scène du pont');
await s.doitExister('[data-pion="0"]', 'le premier marcheur');
await s.doitExister('[data-traverser]', 'le bouton « Traverser »');
await s.doitExister('[data-minutes]', 'le compteur de minutes');

const vu = () => s.page.evaluate(() => ({
    minutes: (document.querySelector('[data-minutes]') || {}).textContent || '',
    statut: ((document.querySelector('.pl-statut') || {}).textContent || '').trim(),
    surLePont: document.querySelectorAll('.pl-marcheur--sur').length,
    peutTraverser: !(document.querySelector('[data-traverser]') || {}).disabled,
    ok: !!document.querySelector('.pl-scene--ok'),
    presque: !!document.querySelector('.pl-scene--presque')
}));

const depart = await s.page.evaluate(() => [...document.querySelectorAll('[data-pion]')]
    .map(g => (g.getAttribute('aria-label') || '')));
console.log('   au départ :', depart.join(' · '));

dire('personne n\'est sur le pont, et « Traverser » attend',
    !(await vu()).surLePont && !(await vu()).peutTraverser);

// ── LA RÈGLE QUI SE VOIT LE MOINS ──────────────────────────────────────────
//
// Tout le monde est à gauche avec la lampe : impossible de la vérifier avant
// d'avoir fait passer quelqu'un. On la mesure donc APRÈS la première
// traversée, quand la lampe est à droite et que les restants ne peuvent plus
// partir.

/** Touche des marcheurs, puis traverse. */
async function traverser(...qui) {
    for (const i of qui) {
        await s.page.click(`[data-pion="${i}"]`);
        await dormir(220);
    }
    await s.page.click('[data-traverser]');
    await dormir(1300);
}

await traverser(0, 1);
let v = await vu();
dire('la première traversée coûte le temps du PLUS LENT des deux',
    v.minutes === '2 min', `compteur : ${v.minutes}`);

// Zoé est restée à gauche, la lampe est à droite : elle ne peut pas partir.
await s.page.click('[data-pion="2"]');
await dormir(300);
v = await vu();
dire('ON NE MONTE QUE DU CÔTÉ DE LA LAMPE, et l\'écran dit pourquoi',
    v.surLePont === 0 && /lampe n'y est pas/.test(v.statut), v.statut);

await traverser(0);            // Léa rapporte la lampe — 1 min
await traverser(2, 3);         // les deux plus lents ensemble — 10 min
v = await vu();
dire('LES DEUX PLUS LENTS ENSEMBLE NE COÛTENT QU\'UNE FOIS',
    v.minutes === '13 min', `2 + 1 + 10 = 13, compteur : ${v.minutes}`);

await traverser(1);            // Tom rapporte la lampe — 2 min
await traverser(0, 1);         // et les deux rapides repassent — 2 min
await dormir(600);
v = await vu();
dire('TOUT LE MONDE PASSE EN 17 MINUTES, au doigt',
    v.minutes === '17 min' && v.ok, `${v.minutes} — ${v.statut}`);
dire('et l\'écran dit que c\'est le minimum', /le minimum/.test(v.statut), v.statut);

console.log(`\nerreurs de page : ${s.erreurs.length}, fenêtres natives : ${s.fenetresNatives.length}`);
s.erreurs.slice(0, 3).forEach(e => console.log('  ! ' + String(e).slice(0, 160)));
if (s.erreurs.length || s.fenetresNatives.length) ratés++;

await s.photo('.pl-layout', 'tools/tmp/pont-fini.png', 0);
await s.fermer();

console.log(ratés ? `\n\x1b[31m${ratés} chose(s) à regarder.\x1b[0m`
    : '\n\x1b[32mTOUT PASSE.\x1b[0m');
process.exit(ratés ? 1 : 0);
