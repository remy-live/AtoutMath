// LES PAVAGES, COMPOSÉS D'AVANCE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// POURQUOI D'AVANCE, ET PAS AU MOMENT DE LA QUESTION. La même raison que pour
// le Jardin : une mosaïque se trouve par ESSAIS — on pousse, on recule quand ça
// fait un trou, on recommence —, et un élève ne doit pas attendre devant un
// écran blanc pendant qu'un algorithme cherche. Mesuré ici : il faut de
// quelques dizaines à quelques centaines d'essais pour obtenir un pavage riche,
// soit bien plus que les 16 ms d'une image à l'écran.
//
// Et surtout : un pavage livré a été VÉRIFIÉ (`verifierPavage`). Chacune de ses
// relations a été relue — « cette symétrie envoie-t-elle vraiment la pièce 5 sur
// la pièce 9 ? » — avant d'arriver devant un élève. Une question d'exercice ne
// doit jamais pouvoir être fausse.
//
//   node tools/fabriquerPavages.mjs                  # en écrit douze
//   node tools/fabriquerPavages.mjs --combien 20     # vingt
//   node tools/fabriquerPavages.mjs --mesurer        # ne rien écrire, juste dire
//
// Il écrit `js/data/mosaiques.js`.

import { writeFileSync } from 'node:fs';
import '../tests/helpers.mjs';
import { construireMosaique, verifierMosaique, cleMosaique } from '../js/core/mosaique.js';

const arg = (nom, defaut) => {
    const i = process.argv.indexOf(nom);
    return i >= 0 ? Number(process.argv[i + 1]) : defaut;
};
const COMBIEN = arg('--combien', 12);
const MESURER = process.argv.includes('--mesurer');

/**
 * CE QU'ON GARDE, et pourquoi chaque seuil est là.
 *
 *   `pieces`     assez pour que la mosaïque fasse une vraie figure, pas assez
 *                pour que les numéros deviennent illisibles. Rémy en a quinze.
 *   `relations`  c'est le nombre de QUESTIONS possibles. En dessous de huit, on
 *                reposerait deux fois la même à un élève dans la même série.
 *   `genres`     les quatre transformations doivent être représentées, sans
 *                quoi un pavage ne servirait qu'à un seul type de question —
 *                et un élève qui tombe dessus ne travaillerait que la symétrie.
 */
const MINIMUMS = { pieces: 10, relations: 8, genres: 3 };

const retenus = [];
const dejaVus = new Set();
let essais = 0, refuses = { pousse: 0, pauvres: 0, reproches: 0, doublons: 0 };

const debut = Date.now();
for (let n = 0; retenus.length < COMBIEN && n < 4000; n++) {
    essais++;
    const p = construireMosaique({
        graine: `pavage-${n}`,
        largeur: 11, hauteur: 9,
        pieces: 16
    });
    if (!p) { refuses.pousse++; continue; }

    const genres = new Set(p.relations.map(r => r.t.genre));
    if (p.pieces.length < MINIMUMS.pieces
        || p.relations.length < MINIMUMS.relations
        || genres.size < MINIMUMS.genres) { refuses.pauvres++; continue; }

    const dits = verifierMosaique(p);
    if (dits.length) {
        refuses.reproches++;
        console.error(`  graine ${n} : ${dits[0]}`);
        continue;
    }

    const cle = cleMosaique(p);
    if (dejaVus.has(cle)) { refuses.doublons++; continue; }
    dejaVus.add(cle);

    retenus.push({ graine: `pavage-${n}`, ...p });
}
const duree = ((Date.now() - debut) / 1000).toFixed(1);

console.log(`${retenus.length} pavage(s) retenus sur ${essais} essais, en ${duree} s`);
console.log(`refusés : ${refuses.pousse} sans pousse · ${refuses.pauvres} trop pauvres`
    + ` · ${refuses.reproches} avec reproches · ${refuses.doublons} doublons`);
for (const p of retenus) {
    const genres = [...new Set(p.relations.map(r => r.t.genre))].sort();
    console.log(`  ${p.graine.padEnd(12)} ${String(p.pieces.length).padStart(2)} pièces`
        + ` · ${String(p.relations.length).padStart(2)} questions · ${p.sommets.length} sommets`
        + ` · ${genres.join(', ')}`);
}

if (MESURER) { console.log('\n(--mesurer : rien n\'a été écrit)'); process.exit(0); }
if (!retenus.length) { console.error('\nRIEN À ÉCRIRE.'); process.exit(1); }

// ─── L'écriture ───────────────────────────────────────────────────────────────
//
// ON ÉCRIT COMPACT, mais pas illisible : un pavage par ligne de pièce. Le
// fichier se relit en cas de doute, et `git diff` montre ce qui a bougé.

const nombre = (v) => (Number.isInteger(v) ? String(v) : String(v));
const dire = (c) => `[${nombre(c.x)},${nombre(c.y)}]`;

const texte = `// LES MOSAÏQUES DE L'EXERCICE « LE PAVAGE DES TRANSFORMATIONS ».
//
// ÉCRIT PAR \`tools/fabriquerPavages.mjs\` — ON NE LE RETOUCHE PAS À LA MAIN.
// Chaque pavage a été construit PAR ses transformations puis relu par
// \`verifierPavage\` : chaque relation a été vérifiée avant d'arriver ici.
//
// Les cases sont données par leur CENTRE, à coordonnées demi-entières : la case
// qui occupe le carré [2,3] × [4,5] s'écrit [2.5, 4.5]. Les sommets nommés,
// eux, sont à coordonnées entières — ce sont les coins du quadrillage, et c'est
// d'eux que parlent les énoncés (« l'axe (GJ) », « le centre G »).
//
// ${retenus.length} pavages · ${retenus.reduce((s, p) => s + p.relations.length, 0)} questions au total.

export const MOSAIQUES = [
${retenus.map(p => `    {
        graine: '${p.graine}',
        boite: { x0: ${p.boite.x0}, x1: ${p.boite.x1}, y0: ${p.boite.y0}, y1: ${p.boite.y1} },
        sommets: [${p.sommets.map(s => `{ nom: '${s.nom}', x: ${s.x}, y: ${s.y} }`).join(', ')}],
        pieces: [
${p.pieces.map(pi => `            { n: ${pi.n}, cases: [${pi.cases.map(dire).join(',')}] }`).join(',\n')}
        ],
        relations: [
${p.relations.map(r => `            { depuis: ${r.depuis}, vers: ${r.vers}, t: ${JSON.stringify(r.t)} }`).join(',\n')}
        ]
    }`).join(',\n')}
];
`;

writeFileSync(new URL('../js/data/mosaiques.js', import.meta.url), texte);
console.log(`\njs/data/mosaiques.js écrit (${Math.round(texte.length / 1024)} Ko).`);
