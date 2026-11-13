// UNE PLANCHE : toutes les images d'un coup, légendées.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// « UN DESSIN QUI NE TRACE RIEN NE LÈVE AUCUNE ERREUR, ET UN DESSIN QUI TRACE
// LA MAUVAISE CHOSE ENCORE MOINS. » C'est écrit dans le message du 12 novembre,
// et c'est ce qui a fait reprendre sept dessins de la frise : regardés UN PAR
// UN ils passaient, regardés TOUS ENSEMBLE la fourmi était un nœud papillon.
//
// La planche a été refaite à la main deux fois — une fois pour les vingt et un
// dessins de l'Échelle des Tailles, une fois pour les seize mondes. Les mêmes
// vingt lignes : un gabarit HTML, des images en `data:`, une capture.
//
// POURQUOI DES `data:` ET PAS DES CHEMINS. Une page ouverte en `file://` ne
// charge pas toujours ses voisines — selon la version de Chromium et le dossier,
// l'image reste vide SANS lever d'erreur, et l'on regarde une planche blanche
// en croyant regarder des dessins. Encoder le fichier dans la page supprime la
// question.
//
//     node tools/planche.mjs tools/tmp/planche.png tools/tmp/decor-*.png
//     node tools/planche.mjs --colonnes=3 sortie.png a.png b.png c.png
//
// La légende de chaque case est le nom du fichier, sans dossier ni extension :
// c'est ce qu'on veut lire sous une image qu'on compare à ses voisines.
import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import { basename, extname } from 'node:path';

const args = process.argv.slice(2);
const colonnes = Number((args.find(a => a.startsWith('--colonnes=')) || '').split('=')[1]) || 4;
const largeurCase = Number((args.find(a => a.startsWith('--largeur=')) || '').split('=')[1]) || 420;
const reste = args.filter(a => !a.startsWith('--'));
const [sortie, ...images] = reste;

if (!sortie || !images.length) {
    console.error('emploi : node tools/planche.mjs <sortie.png> <image.png>… [--colonnes=4] [--largeur=420]');
    process.exit(2);
}

const TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.webp': 'image/webp', '.svg': 'image/svg+xml' };

const cases = [];
for (const chemin of images) {
    try {
        const brut = await readFile(chemin);
        const type = TYPES[extname(chemin).toLowerCase()] || 'image/png';
        cases.push({
            nom: basename(chemin, extname(chemin)),
            src: `data:${type};base64,${brut.toString('base64')}`
        });
    } catch (e) {
        // ON LE DIT, ON NE L'AVALE PAS : une case manquante sur une planche de
        // seize se remarque mal, et c'est exactement l'image qu'on voulait voir.
        console.error(`  ! ${chemin} : ${e.message}`);
    }
}
if (!cases.length) { console.error('aucune image lisible'); process.exit(1); }

const echapper = (s) => String(s).replace(/[&<>"]/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// LE FOND EST CELUI DE L'APPLICATION, PAS DU BLANC. Une planche sur fond blanc
// montre un dessin que l'élève ne verra jamais — la leçon est déjà écrite dans
// `tools/decorsDuPendu.mjs`.
const page = `<!doctype html><meta charset="utf-8"><style>
  body { margin: 0; background: #eef2f7; font: 13px/1.3 system-ui, sans-serif; color: #1e293b; }
  /* La largeur max-content n'est pas une coquetterie. Une grille a colonnes
     fixes DEBORDE de son conteneur sans s'elargir : sa boite mesure alors la
     largeur de la fenetre, et la capture rendait une planche coupee a la
     premiere colonne — mesure, 800 px au lieu de 1500. (Pas d'accent grave
     ici : ce commentaire vit DANS un gabarit, et un accent grave le fermerait.) */
  .planche { display: grid; width: max-content;
             grid-template-columns: repeat(${colonnes}, ${largeurCase}px); gap: 14px; padding: 14px; }
  figure { margin: 0; background: #fff; border: 1px solid #cbd5e1; border-radius: 10px; overflow: hidden; }
  img { display: block; width: 100%; height: auto; }
  figcaption { padding: 6px 8px; font-weight: 700; border-top: 1px solid #e2e8f0; }
</style><div class="planche">${cases.map(c => `<figure>
  <img src="${c.src}" alt=""><figcaption>${echapper(c.nom)}</figcaption></figure>`).join('')}</div>`;

const brouillon = sortie.replace(/\.png$/i, '') + '-planche.html';
await writeFile(brouillon, page, 'utf8');

const navigateur = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
// deviceScaleFactor 2 : la planche est faite pour être REGARDÉE, et un dessin
// jugé à l'échelle 1 se juge mal.
const onglet = await navigateur.newPage({ viewport: { width: 400, height: 400 }, deviceScaleFactor: 2 });
await onglet.goto('file://' + (brouillon.startsWith('/') ? brouillon : process.cwd() + '/' + brouillon));
await onglet.waitForLoadState('networkidle');
const boite = await onglet.locator('.planche').boundingBox();
await onglet.setViewportSize({ width: Math.ceil(boite.width), height: Math.ceil(boite.height) });
await onglet.locator('.planche').screenshot({ path: sortie });
await navigateur.close();

console.log(`planche écrite : ${sortie}  (${cases.length} image(s), ${colonnes} colonnes)`);
