// SORTIR SON TRAVAIL DE L'APPLICATION — et ne pas le perdre en le sortant.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « j'ai mis copier les verdicts, ça ne copie rien, et j'ai tout trié
// dans tout le quotidien, je ne veux pas que mon travail soit supprimé. »
//
// Deux cents entrées triées une par une, et le bouton qui les sort ne rend
// rien. C'est la pire sorte de défaut : il ne casse rien à l'écran, il rend le
// travail INATTEIGNABLE — et le seul bouton voisin est celui qui l'efface.
//
// ── POURQUOI AUCUNE ÉPREUVE NE L'AVAIT VU ──────────────────────────────────
//
// Parce qu'ici le presse-papiers MARCHE. Chromium, contexte sûr, fenêtre au
// premier plan : `navigator.clipboard.writeText` réussit, et toute mesure qui
// s'arrête là passe au vert. Chez Rémy rien de cela n'est garanti —
// `navigator.clipboard` n'existe pas hors HTTPS, Safari refuse si le geste
// n'est plus « récent », et le presse-papiers d'une page web se perd d'une
// application à l'autre sur iPhone.
//
// CETTE SONDE CASSE DONC LE PRESSE-PAPIERS EXPRÈS, et exige que le texte soit
// là quand même. C'est la seule façon de mesurer le chemin que lui emprunte.
//
//   node tools/sortirLeTravail.mjs

import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';
const s = await ouvrirSonde({ largeur: 1400, hauteur: 980 });
let manques = 0;
const dire = (ok, quoi, detail = '') => { if (!ok) manques++;
  console.log(`  ${ok ? '\x1b[32mok  \x1b[0m' : '\x1b[31mnon \x1b[0m'}${quoi}` + (detail ? `  — ${detail}` : '')); };
await s.identifier();
const a = `http://127.0.0.1:${s.port}/index.html?auteur=1`;
await s.page.goto(a);
await s.page.evaluate(() => { try { localStorage.removeItem('atoutmath.quotidien.verdicts'); } catch (e) {} });
await s.page.goto(a);
await s.page.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
if (await s.page.evaluate(() => document.getElementById('debug-toolbar').classList.contains('dbg--folded'))) { await s.page.click('#db-fold'); await dormir(300); }

console.log('\nLE TRI DU QUOTIDIEN : CE QUI SORT, ET CE QUI NE S\'EFFACE PAS');
console.log('─'.repeat(78));
await s.page.click('#db-revue'); await dormir(900);
await s.page.click('[data-vue="quotidien"]'); await dormir(900);
await s.doitExister('[data-tri-copier]');
await s.doitExister('[data-tri-fichier]');
await s.doitExister('[data-tri-vider]');
await s.page.click('.banc-q-oui[data-verdict="0"]', { force: true }); await dormir(400);
await s.page.click('.banc-q-non[data-verdict="1"]', { force: true }); await dormir(400);
await s.page.click('.banc-q-non[data-verdict="2"]', { force: true }); await dormir(400);
dire((await s.page.textContent('[data-tri-compte]')).includes('3 relues'),
  'trois verdicts posés', (await s.page.textContent('[data-tri-compte]')).trim());

// 1. LE TEXTE PARAÎT, QUOI QUE FASSE LE PRESSE-PAPIERS
await s.page.click('[data-tri-copier]', { force: true }); await dormir(700);
const boite = await s.page.evaluate(() => {
  const t = document.querySelector('[data-sortie-texte]');
  if (!t) return null;
  const r = t.getBoundingClientRect();
  return { h: Math.round(r.height), n: t.value.length, debut: t.value.slice(0, 40) };
});
dire(!!boite && boite.h >= 150 && boite.n > 40,
  'le texte paraît dans une zone visible, qu\'on ait copié ou non',
  boite ? `${boite.h}px, ${boite.n} caractères — « ${boite.debut}… »` : 'AUCUNE ZONE');

// 1 bis. ET MÊME QUAND LE PRESSE-PAPIERS EST CASSÉ — c'est le cas de Rémy.
await s.page.evaluate(() => {
  Object.defineProperty(navigator, 'clipboard', { get() { throw new Error('refusé'); }, configurable: true });
});
await s.page.evaluate(() => { const t = document.querySelector('[data-sortie-texte]'); if (t) t.remove(); });
await s.page.click('[data-tri-copier]', { force: true }); await dormir(700);
const casse = await s.page.evaluate(() => {
  const t = document.querySelector('[data-sortie-texte]');
  return t ? { n: t.value.length, dit: document.querySelector('[data-tri-copier]').textContent } : null;
});
dire(!!casse && casse.n > 40,
  'PRESSE-PAPIERS CASSÉ : le texte est quand même là, et le bouton le dit',
  casse ? `${casse.n} caractères · « ${casse.dit.trim()} »` : 'RIEN — le bouton ne fait rien');

// 2. LE FICHIER
const [recu] = await Promise.all([
  s.page.waitForEvent('download', { timeout: 15000 }),
  s.page.click('[data-tri-fichier]', { force: true })
]);
const texte = await (await import('node:fs/promises')).readFile(await recu.path(), 'utf8');
dire(texte.includes('À SUPPRIMER (2)') && texte.includes('À GARDER (1)'),
  'le fichier porte les deux tas, comptés', recu.suggestedFilename());

// 3. « TOUT REMETTRE À ZÉRO » NE S'EFFACE PLUS EN UN APPUI
await s.page.click('[data-tri-vider]', { force: true }); await dormir(400);
dire(/Appuie encore/.test(await s.page.textContent('[data-tri-vider]')),
  'le premier appui DEMANDE', (await s.page.textContent('[data-tri-vider]')).trim());
dire((await s.page.evaluate(() => localStorage.getItem('atoutmath.quotidien.verdicts'))) !== null
  && (await s.page.textContent('[data-tri-compte]')).includes('3 relues'),
  'ET LES TROIS VERDICTS SONT TOUJOURS LÀ après ce premier appui');
await s.page.click('[data-tri-vider]', { force: true }); await dormir(600);
dire((await s.page.textContent('[data-tri-compte]')).includes('Aucune relue'),
  'le second appui efface bel et bien');

// 4. LA QUESTION SE RETIRE TOUTE SEULE
await s.page.click('.banc-q-oui[data-verdict="0"]', { force: true }); await dormir(400);
await s.page.click('[data-tri-vider]', { force: true }); await dormir(400);
await dormir(6500);
dire(!/Appuie encore/.test(await s.page.textContent('[data-tri-vider]')),
  'et la question posée se retire au bout de six secondes, sans rien effacer');
dire((await s.page.textContent('[data-tri-compte]')).includes('1 relues'),
  'le verdict posé entre-temps est intact');

console.log('─'.repeat(78));
dire(s.fenetresNatives.length === 0, 'aucune fenêtre native', s.fenetresNatives.join(' | '));
dire(s.erreurs.length === 0, 'aucune erreur de page', s.erreurs.slice(0, 2).join(' | '));
console.log(manques ? `\x1b[31m${manques} mesure(s) manquent.\x1b[0m`
  : '\x1b[32mUN BOUTON QUI SORT UN TEXTE NE PEUT PLUS NE RIEN FAIRE.\x1b[0m');
await s.fermer();
process.exit(manques ? 1 : 0);
