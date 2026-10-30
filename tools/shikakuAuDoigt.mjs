// LE SHIKAKU, DU PREMIER GLISSER À LA GRILLE VALIDÉE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/shikakuAuDoigt.mjs            sur ordinateur
//   node tools/shikakuAuDoigt.mjs --doigt    en 390 × 844, au doigt
//
// RÉMY, capture d'écran à l'appui : « Tu pourrais me créer ce jeu là ».
//
// CE QU'ON MESURE, et pourquoi chaque ligne y est :
//
//   · LA GRILLE EST CELLE QU'ON A DEMANDÉE. Une grille 6 × 7 qui sort en
//     5 × 5 ressemble à un logiciel qui va bien.
//   · LE GESTE POSE UN RECTANGLE. C'est tout l'exercice : on glisse d'un coin
//     à l'autre. On le fait à la SOURIS, comme un élève — pas en appelant une
//     fonction, qui réussirait même si rien n'écoutait le doigt.
//   · UN RECTANGLE FAUX EST REFUSÉ, ET LA PHRASE DIT POURQUOI. « 6 cases,
//     mais le nombre dedans est 8 » apprend quelque chose ; « faux » non.
//   · LA GRILLE ENTIÈRE SE VALIDE. Et la case qui reste se compte : un
//     « Valider » qui accepte une grille trouée mentirait sur la règle.

import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const DOIGT = process.argv.includes('--doigt');
const vert = (t) => `\x1b[32m${t}\x1b[0m`;
const rouge = (t) => `\x1b[31m${t}\x1b[0m`;
const gris = (t) => `\x1b[90m${t}\x1b[0m`;
let ratés = 0;
const dire = (q, ok, d = '') => {
    if (!ok) ratés++;
    console.log(`  ${ok ? vert('ok  ') : rouge('RATÉ')}  ${q}${d ? gris(' — ' + d) : ''}`);
};

const s = await ouvrirSonde(DOIGT
    ? { largeur: 390, hauteur: 844 }
    : { largeur: 1280, hauteur: 900 });
await s.identifier();
await s.ouvrirExercice('logi-shikaku',
    { format: 'classique', difficulte: 'moyen' }, { questions: 2 });
await dormir(1600);

console.log('\nLA GRILLE EST CELLE QU\'ON A DEMANDÉE\n' + '─'.repeat(64));
await s.doitExister('.sk-board', 'le plateau du Shikaku');
const plan = await s.page.evaluate(() => {
    const b = document.querySelector('.sk-board');
    return {
        cases: document.querySelectorAll('.sk-case').length,
        nombres: [...document.querySelectorAll('.sk-nb')].map(e => Number(e.textContent)),
        lignes: Number(getComputedStyle(b).getPropertyValue('--sk-l')),
        colonnes: Number(getComputedStyle(b).getPropertyValue('--sk-c')),
        statut: (document.querySelector('.sk-statut') || {}).textContent || '',
        carre: (() => {
            const c = document.querySelector('.sk-case').getBoundingClientRect();
            return Math.abs(c.width - c.height) < 1.5;
        })()
    };
});
dire('la grille fait 6 × 7', plan.lignes === 6 && plan.colonnes === 7,
    `${plan.lignes} × ${plan.colonnes}`);
dire('et elle a ses 42 cases', plan.cases === 42, `${plan.cases}`);
dire('les cases sont CARRÉES', plan.carre);
dire('les nombres sont écrits', plan.nombres.length >= 4,
    plan.nombres.join(' · '));
dire('et la somme des nombres couvre la grille',
    plan.nombres.reduce((a, b) => a + b, 0) === 42,
    `${plan.nombres.reduce((a, b) => a + b, 0)} pour 42 cases`);
console.log(gris(`        ${plan.statut}`));

// LA SOLUTION, LUE DANS L'EXERCICE : on la rejoue au doigt, on ne la devine pas.
const sol = await s.page.evaluate(async () => {
    const { exercices } = await import('./js/data/catalog.js');
    const { getGenerator } = await import('./js/core/registry.js');
    // L'item courant n'est pas accessible de dehors : on relit la grille à
    // l'écran et l'on redemande au solveur. C'est plus honnête que de garder
    // une copie — si l'écran et le générateur divergeaient, on le verrait.
    const b = document.querySelector('.sk-board');
    const lignes = Number(getComputedStyle(b).getPropertyValue('--sk-l'));
    const colonnes = Number(getComputedStyle(b).getPropertyValue('--sk-c'));
    const indices = [...document.querySelectorAll('.sk-nb')].map(e => {
        const st = e.getAttribute('style');
        const m = /grid-area:\s*(\d+)\s*\/\s*(\d+)/.exec(st);
        return { r: Number(m[1]) - 1, c: Number(m[2]) - 1, n: Number(e.textContent) };
    });
    const { compterSolutions } = await import('./js/core/generators/shikaku.js');
    window.__sk = { lignes, colonnes, indices, n: compterSolutions(lignes, colonnes, indices, 3) };
    return window.__sk;
});
dire('la grille a UNE seule solution', sol.n === 1, `${sol.n} solution(s)`);

const centre = (r, c) => s.page.evaluate(([rr, cc]) => {
    const el = document.querySelector(`.sk-case[data-r="${rr}"][data-c="${cc}"]`);
    const b = el.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
}, [r, c]);

/** On glisse d'un coin à l'autre, à la souris, comme un élève au doigt. */
async function glisser(r0, c0, r1, c1) {
    const a = await centre(r0, c0), b = await centre(r1, c1);
    await s.page.mouse.move(a.x, a.y);
    await s.page.mouse.down();
    await s.page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 4 });
    await s.page.mouse.move(b.x, b.y, { steps: 4 });
    await s.page.mouse.up();
    await dormir(180);
}

const poses = () => s.page.evaluate(() => document.querySelectorAll('.sk-rect').length);
const statut = () => s.page.evaluate(() =>
    (document.querySelector('.sk-statut') || {}).textContent || '');

console.log('\nLE GESTE POSE UN RECTANGLE\n' + '─'.repeat(64));
// Le premier rectangle de la solution, retrouvé par le solveur de l'exercice.
const rects = await s.page.evaluate(async () => {
    const { compterSolutions } = await import('./js/core/generators/shikaku.js');
    // On rejoue le solveur en gardant la première solution trouvée : c'est la
    // seule, puisqu'on vient de le vérifier.
    const { lignes, colonnes, indices } = window.__sk;
    const trouve = [];
    const essai = (i, pris) => {
        if (i === indices.length) return true;
        const moi = indices[i];
        for (let h = 1; h <= moi.n; h++) {
            if (moi.n % h) continue;
            const w = moi.n / h;
            for (let r0 = Math.max(0, moi.r - h + 1); r0 <= Math.min(moi.r, lignes - h); r0++) {
                for (let c0 = Math.max(0, moi.c - w + 1); c0 <= Math.min(moi.c, colonnes - w); c0++) {
                    const r1 = r0 + h - 1, c1 = c0 + w - 1;
                    let ok = true;
                    for (let r = r0; r <= r1 && ok; r++) {
                        for (let c = c0; c <= c1 && ok; c++) if (pris[r][c]) ok = false;
                    }
                    if (ok) {
                        for (const a of indices) {
                            if (a !== moi && a.r >= r0 && a.r <= r1 && a.c >= c0 && a.c <= c1) ok = false;
                        }
                    }
                    if (!ok) continue;
                    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) pris[r][c] = 1;
                    trouve.push({ r0, c0, r1, c1 });
                    if (essai(i + 1, pris)) return true;
                    trouve.pop();
                    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) pris[r][c] = 0;
                }
            }
        }
        return false;
    };
    essai(0, Array.from({ length: lignes }, () => Array(colonnes).fill(0)));
    void compterSolutions;
    return trouve;
});
dire('le solveur retrouve tous les rectangles', rects.length === sol.indices.length,
    `${rects.length} pour ${sol.indices.length} nombres`);

await s.photo('.sk-layout', `tools/tmp/shikaku-depart${DOIGT ? '-doigt' : ''}.png`, 14);

const un = rects[0];
await glisser(un.r0, un.c0, un.r1, un.c1);
dire('un rectangle juste se pose', (await poses()) === 1, `${await poses()} posé(s)`);
await s.photo('.sk-board', `tools/tmp/shikaku-un${DOIGT ? '-doigt' : ''}.png`, 18);

console.log('\nUN RECTANGLE FAUX EST REFUSÉ, ET LA PHRASE DIT POURQUOI\n' + '─'.repeat(64));
// Un rectangle d'UNE case posé sur un nombre : son aire vaut 1, et le nombre
// dedans vaut au moins 2.
//
// ON LE CHOISIT HORS DU RECTANGLE DÉJÀ POSÉ, et la première version ne le
// faisait pas : un appui simple SUR un rectangle posé est la GOMME — la sonde
// l'effaçait, puis annonçait « il n'est pas posé » et « la phrase ne nomme
// rien ». Deux fausses alertes sur un logiciel qui faisait exactement ce
// qu'on lui demande.
const dehors = (i) => !(i.r >= un.r0 && i.r <= un.r1 && i.c >= un.c0 && i.c <= un.c1);
const nb = sol.indices.find(i => i.n > 1 && dehors(i));
await glisser(nb.r, nb.c, nb.r, nb.c);
const dit = await statut();
dire('il n\'est pas posé', (await poses()) === 1, `${await poses()} posé(s)`);
dire('et la phrase nomme les deux nombres',
    /1 case|est \d+/.test(dit) && /\d/.test(dit), dit);

console.log('\nLA GRILLE ENTIÈRE SE VALIDE\n' + '─'.repeat(64));
await s.page.evaluate(() => document.querySelector('[data-recommencer]').click());
await dormir(300);
dire('« Recommencer » vide le plateau', (await poses()) === 0);

await s.cliquer('[data-valider]', 'le bouton « Valider »');
const refus = await statut();
dire('une grille vide est refusée', /reste/i.test(refus), refus);

for (const r of rects) await glisser(r.r0, r.c0, r.r1, r.c1);
dire('tous les rectangles sont posés', (await poses()) === rects.length,
    `${await poses()} pour ${rects.length}`);
await s.photo('.sk-layout', `tools/tmp/shikaku-plein${DOIGT ? '-doigt' : ''}.png`, 14);

const avant = await s.page.evaluate(() =>
    (document.querySelector('.sk-consigne') || {}).textContent || '');
await s.cliquer('[data-valider]', 'le bouton « Valider »');
await dormir(2200);
const apres = await s.page.evaluate(() => ({
    consigne: (document.querySelector('.sk-consigne') || {}).textContent || '',
    poses: document.querySelectorAll('.sk-rect').length,
    nombres: document.querySelectorAll('.sk-nb').length
}));
dire('la grille est comptée juste et la suivante arrive',
    apres.poses === 0 && apres.nombres > 0, `${apres.poses} rectangle(s) sur la nouvelle grille`);
void avant;

console.log('\n' + '─'.repeat(64));
console.log(`fenêtres natives et erreurs de page : ${s.fenetresNatives.length + s.erreurs.length}`);
if (s.erreurs.length) console.log(rouge(s.erreurs.slice(0, 4).join('\n')));
if (s.fenetresNatives.length + s.erreurs.length) ratés++;
console.log(ratés ? rouge(`\n${ratés} mesure(s) manquée(s).`)
    : vert('\nLE SHIKAKU SE JOUE AU DOIGT, ET IL COMPTE JUSTE.'));
await s.fermer();
process.exit(ratés ? 1 : 0);
