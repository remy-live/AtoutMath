// CE QUE jsPDF MESURE POUR UNE ESPACE INSÉCABLE, contre une espace ordinaire.
//
//   node tools/largeurInsecable.mjs
//
// Rémy : « parfois tes exposants sont un peu décalés ». C'était ça : jsPDF
// compte l'insécable presque deux fois plus large que ce que le lecteur de
// PDF dessine. Voir `pourPdf` dans js/ui/ficheRendu.js.
import { chromium } from 'playwright';
import fs from 'node:fs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage();
await p.setContent('<html><body></body></html>');
await p.addScriptTag({ content: fs.readFileSync('vendor/jspdf/jspdf.umd.min.js', 'utf8') });
const r = await p.evaluate(() => {
  const pdf = new window.jspdf.jsPDF({ unit: 'mm' });
  pdf.setFont('helvetica'); pdf.setFontSize(12);
  const w = (s) => +pdf.getTextWidth(s).toFixed(3);
  return { espace: w('9 330'), insecable: w('9 330'), fine: w('9 330'), un: w(' '), nb: w(' ') };
});
console.log(r);
await b.close();
