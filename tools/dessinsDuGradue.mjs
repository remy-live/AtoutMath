// LES DESSINS GRADUÉS, VUS COMME L'ÉLÈVE LES VERRA UNE FOIS FINIS.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/dessinsDuGradue.mjs [sortie.png]
//
// POURQUOI CET OUTIL EXISTE AVANT LE RESTE. Un dessin gradué se conçoit sur
// une grille — des colonnes et des lignes — et rien, dans cette grille, ne dit
// si l'on obtient un poisson ou une tache. La leçon des décors du pendu, la
// veille : un dessin qu'on n'a pas REGARDÉ n'est pas un dessin, et la planche
// avait alors montré deux décors sur trois illisibles.
//
// On la relance à chaque fois qu'on touche à un sommet.

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { DESSINS, COLONNES } from '../js/core/dessinsGradues.js';

const sortie = process.argv[2] || 'tools/tmp/dessins-gradues.png';
mkdirSync('tools/tmp', { recursive: true });

const ENCRES = { corps: '#38bdf8', toit: '#f97316', detail: '#facc15' };

const cases = Object.entries(DESSINS).map(([cle, d]) => {
    const X = (c) => 10 + (c / COLONNES) * 180;
    const Y = (l) => 10 + ((l - 1) / (d.lignes - 1)) * 180;
    const formes = d.formes.map(f => {
        const pts = [...f.sommets].map(n => {
            const [c, l] = d.points[n];
            return `${X(c).toFixed(1)},${Y(l).toFixed(1)}`;
        }).join(' ');
        return `<polygon points="${pts}" fill="${ENCRES[f.couleur] || '#94a3b8'}"
            stroke="#1a202c" stroke-width="2" stroke-linejoin="round" />`;
    }).join('');
    const traits = (d.traits || []).map(([a, b]) => {
        const [c1, l1] = d.points[a], [c2, l2] = d.points[b];
        return `<line x1="${X(c1)}" y1="${Y(l1)}" x2="${X(c2)}" y2="${Y(l2)}"
            stroke="#1a202c" stroke-width="3" stroke-linecap="round" />`;
    }).join('');
    // LES LIGNES DU FOND : on les dessine aussi, parce que c'est ainsi que
    // l'élève voit le dessin — posé SUR ses droites graduées, jamais seul.
    const regles = Array.from({ length: d.lignes }, (_, i) =>
        `<line x1="10" y1="${Y(i + 1)}" x2="190" y2="${Y(i + 1)}"
            stroke="#cbd5e1" stroke-width="1" />`).join('');
    const noms = Object.entries(d.points).map(([n, [c, l]]) =>
        `<circle cx="${X(c)}" cy="${Y(l)}" r="2.5" fill="#1a202c" />
         <text x="${X(c) + 4}" y="${Y(l) - 4}" font-size="9" fill="#475569">${n}</text>`).join('');
    return `<div class="c">
        <svg viewBox="0 0 200 200" width="230" height="230">${regles}${formes}${traits}${noms}</svg>
        <div class="n">${d.nom} <span>${cle} · ${Object.keys(d.points).length} points
        · ${d.lignes} lignes</span></div></div>`;
}).join('');

const html = `<!doctype html><meta charset="utf-8"><style>
  body { font: 14px system-ui, sans-serif; background:#fff; color:#1a202c; margin:22px; }
  h1 { font-size:19px; margin:0 0 4px; } p { color:#6e7684; margin:0 0 16px; }
  .g { display:flex; flex-wrap:wrap; gap:14px; }
  .c { border:1px solid #e3e6ec; border-radius:12px; padding:8px; }
  .n { font-weight:700; text-align:center; margin-top:4px; }
  .n span { display:block; font-weight:400; color:#9aa1ad; font-size:12px; }
</style>
<h1>Les Dessins Gradués — ce que l'élève obtient</h1>
<p>Les traits gris sont les droites graduées ; les points nommés sont ceux qu'il place.</p>
<div class="g">${cases}</div>`;

const page = 'tools/tmp/dessins-gradues.html';
writeFileSync(page, html);
const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await nav.newPage({ viewport: { width: 1150, height: 700 } });
await p.goto('file://' + process.cwd() + '/' + page);
await p.screenshot({ path: sortie, fullPage: true });
await nav.close();
console.log(`planche écrite : ${sortie}`);
