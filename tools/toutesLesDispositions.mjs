// TOUTES LES DISPOSITIONS DE DINGBAT SUR UNE SEULE FEUILLE.
//
// Une planche de dingbats tire au hasard : pour voir les vingt-deux
// dispositions il faudrait imprimer vingt feuilles et espérer. Celle-ci en
// pose UNE DE CHAQUE, dans l'ordre de la grammaire, avec son nom dessous —
// c'est la seule façon de regarder ce qu'on vient d'écrire.
//
//     node tools/toutesLesDispositions.mjs [sortie.pdf]
//
// Le verdict de cet outil est « va regarder » : il imprime le chemin de
// l'image et s'arrête là.

import { writeFile, mkdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ouvrirSonde } from './sonde.mjs';

const executer = promisify(execFile);
const sortie = process.argv[2] || 'tools/tmp/dispositions/dingbats.pdf';
await mkdir(sortie.replace(/\/[^/]+$/, ''), { recursive: true });

const s = await ouvrirSonde({ largeur: 1200, hauteur: 900 });
const uri = await s.page.evaluate(async () => {
    const { DINGBATS } = await import('./js/data/dingbats.js');
    const { RENDUS } = await import('./js/ui/printSheet.js');
    const { teindreDoc } = await import('./js/ui/ficheRendu.js');
    const { chargerJsPDF } = await import('./js/ui/printSheet.js');
    // LA BIBLIOTHÈQUE SE CHARGE À LA DEMANDE, comme pour une vraie fiche :
    // `window.jspdf` n'existe pas tant que personne n'a cliqué « Télécharger ».
    await chargerJsPDF();
    const { jsPDF } = window.jspdf;
    const rendu = RENDUS.dingbat;

    // UNE ÉNIGME PAR DISPOSITION, la première du catalogue qui l'emploie.
    const vues = new Set();
    const choisies = DINGBATS.filter(d => {
        if (vues.has(d.forme)) return false;
        vues.add(d.forme);
        return true;
    });

    const doc = teindreDoc(new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' }));
    const COLS = 3;
    const RANGS = 3;
    const M = 10;
    const W = (297 - M * 2) / COLS;
    const H = (210 - M * 2 - 8) / RANGS;
    choisies.forEach((d, i) => {
        const page = Math.floor(i / (COLS * RANGS));
        const n = i % (COLS * RANGS);
        if (n === 0 && page) doc.addPage();
        const x = M + (n % COLS) * W;
        const y = M + 8 + Math.floor(n / COLS) * H;
        doc.setDrawColor(210, 214, 224);
        doc.setLineWidth(0.2);
        doc.rect(x, y, W - 3, H - 3, 'S');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(110, 118, 132);
        doc.text(`${d.forme}  —  ${d.reponse}`, x + 2, y + 4);
        const item = { meta: { dingbat: d }, reponsePapier: d.reponse };
        try {
            rendu.pdfGrille(doc, item, { boite: { x: x + 2, y: y + 6, w: W - 7, h: H - 11 } },
                false, null);
        } catch (e) {
            doc.setTextColor(200, 40, 40);
            doc.text(`JETÉ : ${e.message}`.slice(0, 60), x + 3, y + 14);
        }
    });
    return doc.output('datauristring');
});

await writeFile(sortie, Buffer.from(uri.split(',')[1], 'base64'));
const pages = [1, 2, 3];
for (const p of pages) {
    const png = sortie.replace(/\.pdf$/, `-p${p}.png`);
    try {
        await executer('node', ['tools/pdfEnImage.mjs', sortie, png, '2', String(p)]);
        console.log(`  ${png}`);
    } catch (e) { /* la page n'existe pas */ }
}
console.log(`\n  ${s.erreurs.length} erreur(s) de page. Va regarder.\n`);
await s.fermer();
