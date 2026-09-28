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
let fautifs = 0, vus = 0, degradesTotal = 0, dessinsTotal = 0;
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
        // UN DÉGRADÉ N'EST PAS UNE COULEUR, ET LE PRÉTENDRE FAIT CRIER AU LOUP.
        // `background-color` vaut `transparent` sous un `background-image` : la
        // première version remontait alors jusqu'au fond de la page et comparait
        // l'encre d'une plaque jaune au bleu nuit du plateau — 1,19 annoncé sur
        // un jeton parfaitement lisible. On ne devine pas la couleur moyenne
        // d'un dégradé : on DIT qu'on ne sait pas, et on laisse l'oeil trancher.
        // UNE FORME PEINTE SOUS LE GLYPHE change le fond, et la sonde ne sait
        // pas laquelle : on s'abstient plutôt que d'inventer.
        const surUneForme = (el) => {
            const b = el.getBoundingClientRect();
            const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
            for (const f of el.ownerSVGElement.querySelectorAll('circle, rect, ellipse, polygon, path')) {
                const s2 = getComputedStyle(f);
                if (!s2.fill || s2.fill === 'none') continue;
                const r2 = f.getBoundingClientRect();
                if (cx >= r2.left && cx <= r2.right && cy >= r2.top && cy <= r2.bottom) return true;
            }
            return false;
        };
        const surDegrade = (el) => {
            for (let e = el; e; e = e.parentElement) {
                const st = getComputedStyle(e);
                if (st.backgroundImage && st.backgroundImage !== 'none') return true;
                const c = enPixels(st.backgroundColor);
                if (c && c[3] >= 0.999) return false;
            }
            return false;
        };
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
        let degrades = 0, dessins = 0;
        for (const el of couche.querySelectorAll('*')) {
            // On ne juge que ce qui PORTE du texte en propre.
            const propre = [...el.childNodes]
                .filter(n => n.nodeType === 3 && n.textContent.trim()).length;
            if (!propre) continue;
            const st = getComputedStyle(el);
            if (st.display === 'none' || st.visibility === 'hidden' || +st.opacity === 0) continue;
            // DANS UN DESSIN, L'ENCRE S'APPELLE `fill` OU `stroke`.
            //
            // Rémy : « il faut faire attention aux contrastes selon les modes ».
            // Sa capture montrait un cercle et des lettres peints en noir écrit
            // en dur sur le bleu nuit du plateau — 1,14 de contraste, et rien à
            // voir. Une première version de cette sonde SAUTAIT les dessins :
            // elle n'aurait jamais trouvé ce défaut-là.
            //
            // CE QU'ON MESURE, ET CE QU'ON NE MESURE PAS : l'encre d'un dessin
            // contre le PLATEAU, qui est ce qu'il y a derrière la figure. Si le
            // glyphe est posé sur une FORME peinte — le chiffre d'une île de
            // Hashi sur son cercle blanc —, le plateau n'est pas le bon fond ;
            // on ne juge donc que ce qui n'a aucune forme sous lui, et l'on
            // compte les autres à part.
            if (el.ownerSVGElement) {
                const encreSvg = enPixels(st.fill && st.fill !== 'none' ? st.fill : st.stroke);
                if (!encreSvg) { dessins++; continue; }
                if (surUneForme(el)) { dessins++; continue; }
                const c2 = ratio(encreSvg, fondDe(el.ownerSVGElement));
                if (c2 < SEUIL) mauvais.push({
                    quoi: 'dessin ' + el.tagName,
                    texte: (el.textContent || '').trim().slice(0, 20) || el.tagName,
                    contraste: +c2.toFixed(2)
                });
                continue;
            }
            if (el.tagName.toLowerCase() === 'svg') continue;
            const r = el.getBoundingClientRect();
            if (r.width < 8 || r.height < 6) continue;
            const encre = enPixels(st.color);
            if (!encre) continue;
            if (surDegrade(el)) { degrades++; continue; }
            const fond = fondDe(el);
            // L'OPACITÉ FAIT PARTIE DE L'ENCRE. Un texte à 55 % n'est pas de la
            // couleur qu'il déclare : il se compose avec ce qu'il y a dessous, et
            // c'est ce mélange que l'oeil lit. Une opacité posée sur un ANCÊTRE
            // compte aussi — elle s'applique à tout ce qu'il contient.
            let alpha = encre[3];
            for (let e = el; e; e = e.parentElement) alpha *= +getComputedStyle(e).opacity;
            const vu = [0, 1, 2].map(i => encre[i] * alpha + fond[i] * (1 - alpha));
            const c = ratio(vu, fond);
            if (c < SEUIL) mauvais.push({
                quoi: (el.className || el.tagName).toString().slice(0, 26),
                texte: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 26),
                contraste: +c.toFixed(2)
            });
        }
        return { mauvais, degrades, dessins };
    }, SEUIL);
    if (vu.erreur) continue;
    vus++;
    if (vu.degrades) degradesTotal += vu.degrades;
    if (vu.dessins) dessinsTotal += vu.dessins;
    if (vu.mauvais.length) {
        fautifs++;
        console.log(`  ILLISIBLE  ${id.padEnd(24)} ${vu.mauvais.length} texte(s)`);
        vu.mauvais.slice(0, 3).forEach(m =>
            console.log(`             ${String(m.contraste).padStart(5)} · ${m.quoi} · « ${m.texte} »`));
    }
}
console.log(`\n${vus} exercice(s) ouverts · ${fautifs} portent du texte sous ${SEUIL}`);
console.log(`${degradesTotal} texte(s) posés sur un dégradé, non jugés : `
    + 'une couleur moyenne de dégradé se devine, elle ne se mesure pas');
console.log(`${dessinsTotal} texte(s) dans un dessin, non jugés : leur encre est `
    + 'un `fill` et ce qu\'il y a dessous est une forme, pas un fond de boîte');
console.log(`erreurs de page : ${s.erreurs.length}`);
await s.fermer();
process.exit(fautifs ? 1 : 0);
