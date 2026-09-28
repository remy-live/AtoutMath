// QUEL TEXTE NE SE LIT PAS, ET OÙ ?
//
// Rémy, capture du « Patron qui se Plie » en thème sombre, un seul mot :
// « illisible ». Deux boutons blancs portant un texte blanc.
//
// LA CAUSE EST UN JETON FANTÔME. `.pa-btn` écrit
// `background: var(--card-bg, #fff); color: var(--text-main)`. Or `--card-bg`
// n'est déclaré NULLE PART dans ce dépôt : le repli `#fff` s'applique donc
// toujours, y compris en thème sombre où `--text-main` vaut du blanc. Compté :
// 82 jetons sont employés sans être déclarés, dont une quinzaine portent un nom
// de surface ou de texte et retombent sur une couleur claire écrite en dur.
//
// MAIS LE NOM DU JETON N'EST PAS LE CRITÈRE — le contraste l'est. Un `#fff`
// écrit en dur sous un texte sombre se lit très bien ; c'est le COUPLE qui
// décide. Cet outil ne cherche donc pas des noms, il MESURE des couples, dans
// le thème qui les met en défaut.
//
// ET IL NE FAIT PAS CONFIANCE AUX CHAÎNES. `getComputedStyle` rend
// `color-mix(...)` sous la forme `oklab(0.24 0.003 -0.06)`, que rien ne sait
// lire à la main — une passe entière du dépôt a déjà été refaite pour cette
// raison. On demande donc au navigateur de PEINDRE chaque couleur dans un
// canevas d'un pixel et l'on relit le pixel : c'est exact, et cela vaut pour
// toutes les syntaxes présentes et à venir.
//
//   node tools/quiEstIllisible.mjs                 (tout le catalogue)
//   node tools/quiEstIllisible.mjs pat-plier,...   (une liste)
//   node tools/quiEstIllisible.mjs --theme clair
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const ARGS = process.argv.slice(2);
const iTheme = ARGS.indexOf('--theme');
const THEME = iTheme >= 0 ? (ARGS[iTheme + 1] === 'clair' ? null : ARGS[iTheme + 1]) : 'dark';
// `ARGS[iTheme + 1]` VAUT `ARGS[0]` QUAND IL N'Y A PAS DE `--theme`, puisque
// `indexOf` rend -1 : la liste d'exercices s'excluait donc elle-même, et l'outil
// balayait tout le catalogue en croyant n'en faire qu'un. Dix minutes à regarder
// une sortie vide en croyant qu'il était bloqué.
const iValeur = iTheme >= 0 ? iTheme + 1 : -1;
const CHOISIS = (ARGS.find((a, i) => !a.startsWith('--') && i !== iValeur) || '')
    .split(',').map(s => s.trim()).filter(Boolean);
/** Le seuil du texte courant. 3 suffirait à du gros texte ; on ne trie pas ici. */
const SEUIL = 4.5;

const s = await ouvrirSonde({ largeur: 390, hauteur: 844, theme: THEME });
await s.identifier();
if (THEME) await s.theme(THEME);

const liste = await s.page.evaluate(async (choisis) => {
    const { exercices } = await import('./js/data/catalog.js');
    const tous = exercices.map(e => e.id);
    return choisis.length ? tous.filter(id => choisis.includes(id)) : tous;
}, CHOISIS);

console.log(`${liste.length} exercice(s), thème ${THEME || 'clair'}, 390 × 844\n`);
let fautifs = 0, vus = 0;
for (const id of liste) {
    if (await s.ouvrirExercice(id)) continue;
    await dormir(320);
    const vu = await s.page.evaluate((SEUIL) => {
        // LE PIXEL PLUTÔT QUE LA CHAÎNE : on peint, on relit.
        const cv = document.createElement('canvas');
        cv.width = cv.height = 1;
        const ctx = cv.getContext('2d', { willReadFrequently: true });
        const cache = new Map();
        const enPixels = (couleur) => {
            if (cache.has(couleur)) return cache.get(couleur);
            ctx.clearRect(0, 0, 1, 1);
            ctx.fillStyle = '#000';
            try { ctx.fillStyle = couleur; } catch (e) { return null; }
            ctx.fillRect(0, 0, 1, 1);
            const d = ctx.getImageData(0, 0, 1, 1).data;
            const out = d[3] === 0 ? null : [d[0], d[1], d[2], d[3] / 255];
            cache.set(couleur, out);
            return out;
        };
        const lum = ([r, g, b]) => {
            const c = [r, g, b].map(x => x / 255)
                .map(x => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
            return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
        };
        const ratio = (a, b) => {
            const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
            return (x + 0.05) / (y + 0.05);
        };
        // LE FOND VU PAR LE TEXTE : le premier ancêtre qui peint vraiment. Un
        // fond à moitié transparent se compose sur celui d'en dessous, sinon on
        // juge une couleur que personne ne voit.
        const fondDe = (el) => {
            let pile = [];
            for (let e = el; e; e = e.parentElement) {
                const c = enPixels(getComputedStyle(e).backgroundColor);
                if (!c) continue;
                pile.push(c);
                if (c[3] >= 0.999) break;
            }
            if (!pile.length) return [255, 255, 255];
            let [r, g, b] = pile[pile.length - 1];
            for (let i = pile.length - 2; i >= 0; i--) {
                const [R, G, B, A] = pile[i];
                r = R * A + r * (1 - A); g = G * A + g * (1 - A); b = B * A + b * (1 - A);
            }
            return [r, g, b];
        };
        const couche = document.querySelector('#game-layer');
        if (!couche) return { erreur: 'pas de couche' };
        const mauvais = [];
        for (const el of couche.querySelectorAll('*')) {
            // On ne juge que ce qui PORTE du texte en propre.
            const propre = [...el.childNodes]
                .filter(n => n.nodeType === 3 && n.textContent.trim()).length;
            if (!propre) continue;
            const st = getComputedStyle(el);
            if (st.display === 'none' || st.visibility === 'hidden' || +st.opacity === 0) continue;
            const r = el.getBoundingClientRect();
            if (r.width < 8 || r.height < 6) continue;
            const encre = enPixels(st.color);
            if (!encre) continue;
            const c = ratio(encre, fondDe(el));
            if (c < SEUIL) mauvais.push({
                quoi: (el.className || el.tagName).toString().slice(0, 26),
                texte: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 26),
                contraste: +c.toFixed(2)
            });
        }
        return { mauvais };
    }, SEUIL);
    if (vu.erreur) continue;
    vus++;
    if (vu.mauvais.length) {
        fautifs++;
        console.log(`  ILLISIBLE  ${id.padEnd(24)} ${vu.mauvais.length} texte(s)`);
        vu.mauvais.slice(0, 3).forEach(m =>
            console.log(`             ${String(m.contraste).padStart(5)} · ${m.quoi} · « ${m.texte} »`));
    }
}
console.log(`\n${vus} exercice(s) ouverts · ${fautifs} portent du texte sous ${SEUIL}`);
console.log(`erreurs de page : ${s.erreurs.length}`);
await s.fermer();
process.exit(fautifs ? 1 : 0);
