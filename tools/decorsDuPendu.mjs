// LES TROIS DÉCORS DU PENDU, COTE À COTE, DE ZÉRO À SIX ERREURS.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/decorsDuPendu.mjs [sortie.png]
//
// RÉMY : « fais moi des propositions d'abord », dit deux fois sur des choix de
// dessin. Un décor de pendu en est un. Cet outil fabrique la planche qu'on lui
// montre : les trois décors en lignes, les sept états en colonnes, et l'on
// voit d'un coup d'œil lequel se lit et lequel ne se lit pas.
//
// IL SERT AUSSI APRÈS LE CHOIX : le jour où l'on retouche un décor, on relance
// et l'on compare. Un dessin qui se dégrade en six étapes ne se vérifie pas en
// regardant la sixième.

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { decorSvg, } from '../js/core/penduDecors.js';
import { DECORS, ERREURS_MAX } from '../js/core/generators/pendu.js';

const sortie = process.argv[2] || 'tools/tmp/pendu-decors.png';
mkdirSync('tools/tmp', { recursive: true });

const lignes = Object.entries(DECORS).map(([cle, nom]) => {
    const cases = Array.from({ length: ERREURS_MAX + 1 }, (_, n) =>
        `<td><div class="c">${decorSvg(cle, n, { taille: 108 })}</div>
            <div class="n">${n}</div></td>`).join('');
    return `<tr><th>${nom}<br><span class="cle">${cle}</span></th>${cases}</tr>`;
}).join('');

const html = `<!doctype html><meta charset="utf-8"><style>
  body { font: 15px system-ui, sans-serif; background: #fff; color: #1a202c; margin: 24px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  p { color: #6e7684; margin: 0 0 18px; }
  table { border-collapse: collapse; }
  th { text-align: left; padding: 10px 16px 10px 0; font-size: 14px; width: 190px;
       vertical-align: middle; }
  .cle { color: #9aa1ad; font-weight: 400; font-size: 12px; }
  td { padding: 4px; text-align: center; }
  .c { width: 108px; height: 108px; display: flex; align-items: center;
       justify-content: center; border: 1px solid #e3e6ec; border-radius: 10px; }
  .n { font-size: 12px; color: #9aa1ad; margin-top: 2px; }
  tr:nth-child(2) .c { color: #1a202c; }
</style>
<h1>Le Pendu — les trois décors proposés</h1>
<p>De gauche à droite : 0 erreur, puis 1, 2, 3, 4, 5 et 6. À six, c'est perdu.</p>
<table>${lignes}</table>`;

const page = 'tools/tmp/pendu-decors.html';
writeFileSync(page, html);

const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await nav.newPage({ viewport: { width: 1180, height: 620 } });
await p.goto('file://' + process.cwd() + '/' + page);
await p.screenshot({ path: sortie, fullPage: true });
await nav.close();
console.log(`planche écrite : ${sortie}`);
