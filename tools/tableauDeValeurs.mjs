// LE TABLEAU DE VALEURS DANS « TRACER UNE FONCTION », DE BOUT EN BOUT.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/tableauDeValeurs.mjs
//
// RÉMY : « pour tracer une fonction, ce serait bien de pouvoir aussi avoir des
// questions avec remplissage de tableau ».
//
// CE QU'ON MESURE, et pourquoi chaque ligne y est :
//
//   · LE TABLEAU PARAÎT, avec ses trois cases à remplir. Un `[data-trou]`
//     oublié rendrait un pavé qui envoie UN nombre pour une réponse qui en
//     demande trois — et « faux » sans qu'on sache pourquoi.
//   · LE PAVÉ PREND LA MAIN. L'activité de cet exercice pose des POINTS : si
//     elle ne passait pas la main, on verrait un repère sous une question qui
//     demande d'écrire.
//   · ON RÉPOND JUSTE, ET C'EST COMPTÉ JUSTE.
//   · PUIS LE REPÈRE REVIENT. C'est la moitié qu'on oublie : passer la main
//     est facile, la reprendre l'est moins, et sans cela tout le reste de
//     l'exercice se jouerait au clavier.

import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const vert = (t) => `\x1b[32m${t}\x1b[0m`;
const rouge = (t) => `\x1b[31m${t}\x1b[0m`;
const gris = (t) => `\x1b[90m${t}\x1b[0m`;
let ratés = 0;
const dire = (q, ok, d = '') => {
    if (!ok) ratés++;
    console.log(`  ${ok ? vert('ok  ') : rouge('RATÉ')}  ${q}${d ? gris(' — ' + d) : ''}`);
};

const s = await ouvrirSonde({ largeur: 1280, hauteur: 900 });
await s.identifier();
// DEUX MARCHES, ET IL EN FAUT DEUX. Premier jet avec la seule marche
// « tableau » : la question suivante était encore un tableau, et la sonde
// annonçait que le repère n'était pas revenu — alors que personne ne le lui
// avait demandé. On prend donc le tableau PUIS le point, qui est le passage
// qu'on veut mesurer.
// DEUX QUESTIONS, UNE PAR MARCHE : la progression répartit les marches sur le
// TOTAL, et quatre questions donnaient deux tableaux puis deux points — la
// sonde regardait donc le second tableau en croyant regarder le premier point.
await s.ouvrirExercice('alg-fonction-repere',
    { marches: ['tableau', 'image'] }, { questions: 2 });
await s.page.waitForTimeout(600);
await s.photo('.numpad-layout, .game-shell', 'tools/tmp/tableau-avant.png', 12);
await dormir(1500);

console.log('\nLE TABLEAU PARAÎT, ET LE PAVÉ AVEC\n' + '─'.repeat(64));
await s.doitExister('.fn-valeurs', 'le tableau de valeurs');
const vu = await s.page.evaluate(() => ({
    trous: document.querySelectorAll('.fn-valeurs [data-trou]').length,
    colonnes: document.querySelectorAll('.fn-valeurs tr:first-child td').length,
    pave: !!document.querySelector('.numpad, [class*="numpad"]'),
    repere: !!document.querySelector('.rep-svg, svg .rep-hit'),
    question: (document.querySelector('.game-question') || {}).textContent || '',
    touches: [...document.querySelectorAll('.np-key, [data-key]')].map(b => b.textContent.trim())
}));
dire('trois cases à remplir', vu.trous === 3, `${vu.trous}`);
dire('et trois colonnes au-dessus', vu.colonnes === 3, `${vu.colonnes}`);
dire('le pavé a pris la main', vu.pave);
dire('et le repère s\'est retiré', !vu.repere);
// LA TOUCHE DU SIGNE EST « ± », PAS « − », et c'est voulu : elle BASCULE le
// signe de ce qu'on vient de taper au lieu de l'effacer. Premier jet de cette
// sonde : on cherchait « − », on ne le trouvait pas, et l'on accusait le
// réglage `meta.signe`.
dire('la touche de signe est là', vu.touches.some(t => t === '±'),
    vu.touches.slice(0, 14).join(' '));
console.log(gris(`        ${vu.question}`));

console.log('\nON RÉPOND, ET C\'EST COMPTÉ JUSTE\n' + '─'.repeat(64));
// ON CALCULE LA RÉPONSE COMME L'ÉLÈVE, EN LISANT L'ÉCRAN. Premier jet : on
// allait la chercher dans `window.__session`, qui n'existe pas — la sonde
// rendait alors une chaîne vide et toute la suite mesurait un écran où
// personne n'avait rien tapé, sans rien dire. On lit donc l'écriture de la
// fonction dans l'énoncé, et les abscisses dans le tableau.
const ecrit = (vu.question.match(/f\(x\)\s*=\s*(.+?)\./) || [])[1] || '';
const nb = (t) => Number(String(t).replace('−', '-').replace(/\s/g, ''));
const mA = /(−?-?\d*)x/.exec(ecrit);
const a = mA ? (mA[1] === '' ? 1 : mA[1] === '−' || mA[1] === '-' ? -1 : nb(mA[1])) : 0;
const mB = /x\s*([+−-])\s*(\d+)/.exec(ecrit);
const b = mB ? (mB[1] === '+' ? nb(mB[2]) : -nb(mB[2])) : 0;
const xs = await s.page.evaluate(() =>
    [...document.querySelectorAll('.fn-valeurs tr:first-child td')].map(t => t.textContent.trim()));
const attendu = xs.map(x => a * nb(x) + b).join('|');
dire('la réponse attendue a trois morceaux', attendu.split('|').length === 3,
    `f(x) = ${ecrit} · x = ${xs.join(' ; ')} → ${attendu}`);

const toucher = (k) => s.page.evaluate((t) => {
    const btn = [...document.querySelectorAll('.np-key, [data-key]')]
        .find(x => x.textContent.trim() === t);
    if (btn) btn.click();
}, k);

for (const [i, valeur] of attendu.split('|').entries()) {
    await s.page.evaluate((n) => {
        const t = document.querySelectorAll('.fn-valeurs [data-trou]')[n];
        if (t) t.click();
    }, i);
    await dormir(200);
    for (const c of String(Math.abs(Number(valeur)))) { await toucher(c); await dormir(120); }
    // LE SIGNE SE POSE APRÈS LES CHIFFRES : « ± » bascule ce qui est déjà là.
    if (Number(valeur) < 0) { await toucher('±'); await dormir(150); }
}
await dormir(300);
const avantEnvoi = await s.page.evaluate(() =>
    [...document.querySelectorAll('.fn-valeurs [data-trou]')].map(t => t.textContent.trim()));
dire('les trois cases portent les chiffres tapés',
    avantEnvoi.every(t => t && !/\?/.test(t)), avantEnvoi.join(' | '));

await s.page.evaluate(() => {
    const b = [...document.querySelectorAll('button')]
        .find(x => /valider|ok|envoyer/i.test(x.textContent || '') && !x.disabled);
    if (b) b.click();
});
await dormir(1800);

console.log('\nET LE REPÈRE REVIENT À LA QUESTION SUIVANTE\n' + '─'.repeat(64));
const apres = await s.page.evaluate(() => ({
    juste: document.querySelectorAll('.np-trou--ok, .choice--ok, [class*="--ok"]').length,
    repere: !!document.querySelector('.rep-hit'),
    tableau: !!document.querySelector('.fn-valeurs'),
    question: (document.querySelector('.game-question') || {}).textContent || ''
}));
console.log(gris(`        ${apres.question}`));
dire('la question a changé', !!apres.question);
dire('le repère est revenu', apres.repere, apres.repere ? '' : 'toujours le pavé');
dire('et le tableau est parti', !apres.tableau);

// UNE IMAGE POUR RÉMY : « simple beau progressif et qu on puisse imprimer ».
await s.photo('.rep-layout, .numpad-layout', 'tools/tmp/tableau-valeurs.png', 12);

console.log('\n' + '─'.repeat(64));
console.log(`fenêtres natives et erreurs de page : ${s.fenetresNatives.length + s.erreurs.length}`);
if (s.erreurs.length) console.log(rouge(s.erreurs.slice(0, 4).join('\n')));
console.log(ratés ? rouge(`\n${ratés} mesure(s) manquée(s).`)
    : vert('\nLE TABLEAU SE REMPLIT, ET LE REPÈRE REPREND LA MAIN.'));
await s.fermer();
process.exit(ratés ? 1 : 0);
