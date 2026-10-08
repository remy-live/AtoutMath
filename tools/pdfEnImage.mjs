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
//
// L'échelle vaut 2 par défaut : une A4 paysage sort alors en 1683 × 1190, de
// quoi juger un écart d'un millimètre. À 1, on juge la mise en page ; à 4, une
// jonction de traits.
//
// POUR OBTENIR LE PDF : la sonde `tools/sonde.mjs` accepte les téléchargements,
// et chaque fiche a son bouton « Télécharger le PDF ». Voir par exemple
// `tools/ficheElementsGeo.mjs`, qui le fait déjà pour en compter les segments.

import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const [chemin, sortie, echelle = '2', numero = '1'] = process.argv.slice(2);
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
await page.setContent('<canvas id="toile"></canvas>');
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
await page.locator('#toile').screenshot({ path: sortie });
await nav.close();

console.log(`${sortie} — page ${numero}/${taille.pages}, ${taille.w} × ${taille.h} px`);
erreurs.forEach(e => console.log('  \x1b[33merreur de page\x1b[0m :', e));
