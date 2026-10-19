// REGARDER UN PDF, et non le compter.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « et pour l'impression aussi ! ».
//
// CE QUI MANQUAIT, ET QUE CE SCRIPT FERME. Toutes les sondes de fiches de ce
// dépôt téléchargent le PDF, puis en comptent les octets et les segments —
// « 146 segment(s) · 30 Ko ». C'est une mesure utile : un PDF de 4 Ko sans un
// trait se voit tout de suite. Mais elle ne dit RIEN de ce que Rémy a sous les
// yeux. On regardait donc l'APERÇU en croyant regarder la feuille, et c'est
// exactement ainsi qu'un défaut d'impression a survécu à une correction.
//
// `pdftoppm` n'est pas installé dans cet environnement et ne peut pas l'être.
// Mais `pdfjs-dist` est déjà dans `node_modules` — c'est la bibliothèque qui
// sert à l'aperçu — et Chromium est là. On rend donc la page dans une toile et
// on la photographie.
//
//     node tools/pdfEnImage.mjs <fichier.pdf> <image.png> [échelle] [page]
//     node tools/pdfEnImage.mjs <fichier.pdf> <image.png> 5 1 --zone=0.16,0.54,0.46,0.18
//
// L'échelle vaut 2 par défaut : une A4 paysage sort alors en 1683 × 1190, de
// quoi juger un écart d'un millimètre. À 1, on juge la mise en page ; à 4, une
// jonction de traits.
//
// ET `--zone` DÉCOUPE, parce que monter l'échelle ne suffit pas. Une page
// rendue à 5 fait 4209 × 2976 ; qui la regarde la voit RÉDUITE à la largeur de
// sa fenêtre, c'est-à-dire exactement à la résolution qu'on venait de quitter.
// On a monté l'échelle trois fois de suite en se demandant pourquoi le trait
// ne se précisait pas. La zone est donnée en FRACTIONS de la page — `x,y,w,h`
// entre 0 et 1 —, parce qu'on la lit sur l'image entière qu'on vient de
// regarder, et non en pixels d'une échelle qu'on changera au prochain essai.
//
// POUR OBTENIR LE PDF : la sonde `tools/sonde.mjs` accepte les téléchargements,
// et chaque fiche a son bouton « Télécharger le PDF ». Voir par exemple
// `tools/ficheElementsGeo.mjs`, qui le fait déjà pour en compter les segments.

import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const nus = process.argv.slice(2).filter(a => !a.startsWith('--'));
const zoneArg = process.argv.slice(2).find(a => a.startsWith('--zone='));
const ZONE = zoneArg ? zoneArg.slice(7).split(',').map(Number) : null;
if (ZONE && (ZONE.length !== 4 || ZONE.some(v => !Number.isFinite(v)))) {
    console.error('--zone attend quatre nombres : --zone=x,y,largeur,hauteur (fractions de 0 à 1)');
    process.exit(2);
}
const [chemin, sortie, echelle = '2', numero = '1'] = nus;
if (!chemin || !sortie) {
    console.error('emploi : node tools/pdfEnImage.mjs <fichier.pdf> <image.png> [échelle] [page]');
    process.exit(2);
}

const pdf = await fs.readFile(chemin);
// `pdfjs-dist` publie plusieurs variantes selon sa version : on prend celle
// qui existe plutôt que d'en figer une — c'est une dépendance de l'aperçu, pas
// la nôtre, et elle bougera sans nous prévenir.
const lire = async (...noms) => {
    for (const n of noms) {
        try { return await fs.readFile(n, 'utf8'); } catch (e) { /* suivante */ }
    }
    throw new Error(`aucun de ces fichiers : ${noms.join(', ')}`);
};
const lib = await lire('node_modules/pdfjs-dist/build/pdf.min.mjs',
    'node_modules/pdfjs-dist/build/pdf.mjs');
const ouvrier = await lire('node_modules/pdfjs-dist/build/pdf.worker.min.mjs',
    'node_modules/pdfjs-dist/build/pdf.worker.mjs');

const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await nav.newPage({ viewport: { width: 1600, height: 1200 } });
const erreurs = [];
page.on('pageerror', e => erreurs.push(String(e).slice(0, 200)));
// LES POLICES STANDARD SONT SERVIES DEPUIS LE DISQUE.
//
// Sans cela, `pdf.js` va les chercher sur `www.google.com` — quatre requêtes
// refusées par le mandataire à chaque appel, et un message d'erreur qui n'a
// rien à voir avec la feuille qu'on regarde. Elles sont dans `node_modules`,
// à côté de la bibliothèque.
await page.route('**/polices-standard/*', async (route) => {
    const nom = route.request().url().split('/').pop();
    try {
        const corps = await fs.readFile(`node_modules/pdfjs-dist/standard_fonts/${nom}`);
        await route.fulfill({ status: 200, body: corps,
            headers: { 'content-type': 'font/otf' } });
    } catch (e) { await route.fulfill({ status: 404, body: '' }); }
});
await page.setContent('<canvas id="toile"></canvas><canvas id="decoupe"></canvas>');
// L'OUVRIER EST INJECTÉ DANS LA PAGE, pas chargé par le réseau : le site
// d'essai a une CSP, et de toute façon on ne dépend pas d'Internet pour
// regarder une feuille.
await page.addScriptTag({ content: ouvrier, type: 'module' });

const taille = await page.evaluate(async ([src, octets, k, n]) => {
    const blob = new Blob([src], { type: 'text/javascript' });
    const mod = await import(URL.createObjectURL(blob));
    mod.GlobalWorkerOptions.workerSrc = '';
    const doc = await mod.getDocument({
        data: new Uint8Array(octets),
        useWorkerFetch: false, isEvalSupported: false, useSystemFonts: false,
        standardFontDataUrl: '/polices-standard/'
    }).promise;
    if (n > doc.numPages) return { erreur: `la page ${n} n'existe pas (${doc.numPages})` };
    const p = await doc.getPage(n);
    const vue = p.getViewport({ scale: Number(k) });
    const c = document.getElementById('toile');
    c.width = vue.width; c.height = vue.height;
    // LE FOND BLANC EST OBLIGATOIRE : une toile neuve est TRANSPARENTE, et un
    // PDF ne peint pas son papier. Sans cela l'image sort noire sur les
    // visionneuses qui composent sur du noir — le piège de la photo qui
    // ressemble à une photo réussie.
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    await p.render({ canvasContext: ctx, viewport: vue }).promise;
    return { w: c.width, h: c.height, pages: doc.numPages };
}, [lib, [...pdf], echelle, Number(numero)]);

if (taille.erreur) {
    console.error(taille.erreur);
    await nav.close();
    process.exit(1);
}
// LA DÉCOUPE SE FAIT DANS UNE SECONDE TOILE, et non en demandant un rectangle
// à Playwright.
//
// MESURÉ, ET C'EST LE PIÈGE EXACT QUE CE DÉPÔT CONNAÎT DÉJÀ : l'option `clip`
// de `locator.screenshot()` est ACCEPTÉE ET IGNORÉE — seule `page.screenshot()`
// la lit. La première version imprimait donc fièrement « découpé à 1684 × 417 »
// en écrivant la page entière, et l'on regardait l'image en se demandant
// pourquoi la jonction de traits ne se précisait pas. Un outil qui annonce ce
// qu'on lui a DEMANDÉ plutôt que ce qu'il a FAIT ment à son lecteur ; la ligne
// ci-dessous lit donc la toile qu'on photographie vraiment.
const zone = await page.evaluate(([z, w, h]) => {
    const src = document.getElementById('toile');
    const d = document.getElementById('decoupe');
    if (!z) { d.remove(); return null; }
    const x = Math.max(0, Math.round(z[0] * w)), y = Math.max(0, Math.round(z[1] * h));
    const lw = Math.max(1, Math.min(w - x, Math.round(z[2] * w)));
    const lh = Math.max(1, Math.min(h - y, Math.round(z[3] * h)));
    d.width = lw; d.height = lh;
    const ctx = d.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, lw, lh);
    ctx.drawImage(src, x, y, lw, lh, 0, 0, lw, lh);
    src.remove();
    return { x, y, w: lw, h: lh };
}, [ZONE, taille.w, taille.h]);

await page.locator(zone ? '#decoupe' : '#toile').screenshot({ path: sortie });
await nav.close();

console.log(`${sortie} — page ${numero}/${taille.pages}, ${taille.w} × ${taille.h} px`
    + (zone ? `, découpé en (${zone.x}, ${zone.y}) sur ${zone.w} × ${zone.h}` : ''));
erreurs.forEach(e => console.log('  \x1b[33merreur de page\x1b[0m :', e));
