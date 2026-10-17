// ON JOUE « SOMME OU PRODUIT ? » — la bonne, la mauvaise, et ce qu'on lit.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « en ce moment avec mes 4ᵉ, je fais les additions, soustractions,
// simplification et multiplications de nombres relatifs, c'est pas simple pour
// eux ». Et, sur le choix de l'exercice : « et après on peut aussi demander le
// résultat ».
//
// CE QUE CETTE SONDE MESURE, ET QU'AUCUNE ÉPREUVE NE PEUT DIRE : que les deux
// écritures arrivent VRAIMENT côte à côte sous les yeux de l'élève, que la
// paire montrée soit la même des deux côtés, et que se tromper lui réponde
// autre chose que « faux ». Le reste — qu'il y ait toujours une réponse et une
// seule, que le premier piège soit le résultat de l'autre opération — se garde
// dans `tests/sommeOuProduit.test.mjs`, qui ne demande pas de navigateur.
//
//   node tools/sommeOuProduit.mjs
//
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';
const vert = (t) => `\x1b[32m${t}\x1b[0m`, rouge = (t) => `\x1b[31m${t}\x1b[0m`;
let ratés = 0;
const dire = (q, ok, d = '') => { if (!ok) ratés++;
    console.log(`  ${ok ? vert('✓') : rouge('✗')} ${q}${d ? '\x1b[90m — ' + d + '\x1b[0m' : ''}`); };

const s = await ouvrirSonde({ largeur: 1360, hauteur: 1040 });
await s.identifier();
await s.ouvrirExercice('num-relatifs-melange');
await dormir(1800);
await s.doitExister('.prio-btn', 'les boutons de réponse');

const etat = () => s.page.evaluate(() => ({
    question: (document.querySelector('.game-question') || {}).textContent || '',
    boutons: [...document.querySelectorAll('.prio-btn')].map(e => e.textContent.trim()),
    carte: (document.querySelector('.fb-message') || {}).textContent || '',
    detail: (document.querySelector('.fb-detail') || {}).textContent || ''
}));

let v = await etat();
console.log('\n\x1b[1mLA PREMIÈRE QUESTION\x1b[0m');
console.log('   ' + v.question.replace(/\s+/g, ' '));
console.log('   ' + v.boutons.join('   |   '));
dire('les deux écritures sont là, la même paire des deux côtés',
    v.boutons.length === 2 && v.boutons.some(b => b.includes('+')) && v.boutons.some(b => b.includes('×')));
dire('on ne demande pas de calculer', /Lequel donne un résultat/.test(v.question));

// ── ON SE TROMPE EXPRÈS, et l'on regarde ce qu'il lit ──────────────────────
const cherchePositif = /POSITIF/.test(v.question);
const faux = await s.page.evaluate((pos) => {
    const bs = [...document.querySelectorAll('.prio-btn')];
    // La somme et le produit : on clique celui qui N'EST PAS la réponse.
    const somme = bs.find(b => b.textContent.includes('+') && !b.textContent.includes('×'));
    const produit = bs.find(b => b.textContent.includes('×'));
    const txt = (e) => e.textContent.trim();
    // On recalcule à la main : deux nombres, deux opérations.
    const n = txt(produit).match(/−?\d+/g).map(x => Number(x.replace('−', '-')));
    const sProd = n[0] * n[1] > 0 ? 'positif' : 'négatif';
    const bon = (pos ? (sProd === 'positif') : (sProd === 'négatif')) ? produit : somme;
    const mauvais = bon === produit ? somme : produit;
    mauvais.click();
    return txt(mauvais);
}, cherchePositif);
await dormir(1200);
v = await etat();
console.log('\n\x1b[1mON SE TROMPE\x1b[0m  (cliqué : ' + faux + ')');
console.log('   ' + (v.carte + ' ' + v.detail).replace(/\s+/g, ' ').trim());
dire('on lui dit ce qui s\'est passé', (v.carte + v.detail).length > 10);
dire('et le mot qui compte y est : SOMME ou PRODUIT',
    /SOMME|PRODUIT/.test(v.carte + v.detail));
await s.photo('#game-layer', 'tools/tmp/melange-faux.png');
console.log('\x1b[90m  erreurs de page : ' + s.erreurs.length + ' · fenêtres natives : ' + s.fenetresNatives.length + '\x1b[0m');
s.erreurs.slice(0, 3).forEach(e => console.log('   ' + e));
await s.fermer();
const sale = ratés || s.erreurs.length || s.fenetresNatives.length;
console.log(sale ? rouge(`\n${ratés} mesure(s) en échec.`) : vert('\nL\'exercice fait choisir la règle.'));
process.exit(sale ? 1 : 0);
