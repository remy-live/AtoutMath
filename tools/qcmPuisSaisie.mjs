// « QCM D'ABORD, SAISIE ENSUITE » — on vérifie la BASCULE, pas seulement le QCM.
// C'est le seul chemin du barreau 1 qu'aucune mesure n'avait emprunté.
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';
const s = await ouvrirSonde({ largeur: 1100, hauteur: 820 });
await s.identifier();
await s.ouvrirExercice('calc-prio-oppose', { niveau: 1 });
await dormir(1300);
const lire = () => s.page.evaluate(() => {
  const g = document.getElementById('game-layer');
  return { enonce: (g.querySelector('.pr-ligne') || {}).textContent || '',
    choix: [...g.querySelectorAll('.pr-choix')].map(b => b.textContent.trim()),
    trou: !!g.querySelector('.pr-trou'),
    score: (g.querySelector('.pr-score') || {}).textContent || '' };
});
// LA BONNE RÉPONSE SE CALCULE ICI : −(−4) vaut 4. Second chemin, pas le jeu.
// « −(−3) » → l'intérieur est −3, la réponse 3. La première version enlevait
// tous les signes non numériques et obtenait « −−3 », donc NaN : la sonde ne
// cliquait jamais rien et accusait le jeu de ne pas basculer.
const bonne = (e) => {
  const m = e.match(/\(([+−-])(\d+)\)/);
  if (!m) return '?';
  const v = (m[1] === '+' ? 1 : -1) * Number(m[2]);
  return String(-v).replace('-', '−');
};
for (let q = 1; q <= 4; q++) {
  const v = await lire();
  console.log(`  question ${q} · « ${v.enonce.trim()} » · ${v.choix.length ? 'QCM ' + v.choix.join(' ') : 'saisie'} · ${v.score}`);
  if (q === 4) {
    console.log(v.trou && !v.choix.length
      ? '\x1b[32m  ✓ la quatrième question se TAPE : la bascule a lieu\x1b[0m'
      : '\x1b[31m  ✗ la quatrième question est encore un QCM\x1b[0m');
    break;
  }
  const att = bonne(v.enonce);
  await s.page.evaluate((a) => {
    const b = [...document.querySelectorAll('.pr-choix')].find(x => x.textContent.trim() === a);
    if (b) b.click();
  }, att);
  await dormir(2200);
}
// ET L'ON RÉPOND EN TAPANT, pour voir que ce chemin-là marche aussi.
const v = await lire();
if (v.trou) {
  await s.page.fill('.pr-trou', bonne(v.enonce));
  await s.page.press('.pr-trou', 'Enter');
  await dormir(700);
  const f = await s.page.evaluate(() => (document.querySelector('.pr-note') || {}).textContent || '');
  console.log(/✅/.test(f) ? `\x1b[32m  ✓ et la réponse tapée est acceptée — ${f.trim()}\x1b[0m`
    : `\x1b[31m  ✗ la réponse tapée n'est pas acceptée — ${f.trim()}\x1b[0m`);
}
console.log(`\nerreurs de page : ${s.erreurs.length} · natives : ${s.fenetresNatives.length}`);
await s.fermer();
