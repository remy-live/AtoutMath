// LA NOTICE D'INSTALLATION SUR LES TABLETTES D'UNE CLASSE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, pour sa sœur institutrice : « Tu me fais un petit tuto pdf pour l
// installation sur plusieurs tablettes ».
//
// POURQUOI UN OUTIL PLUTÔT QU'UN PDF ÉCRIT UNE FOIS. L'adresse change selon
// l'hébergement, les gestes changent quand l'application change, et une
// notice fausse est pire qu'une notice absente — celle-ci se refait en deux
// secondes. C'est la même raison que le bandeau des icônes, qui se construit
// à partir des boutons plutôt que d'être recopié.
//
// LE QR CODE EST DANS LA FEUILLE, et c'est la décision de cette notice. Une
// maîtresse qui prépare ses tablettes n'a pas forcément un vidéoprojecteur
// allumé : une feuille posée sur la table se scanne aussi bien, et elle peut
// la passer à la tablette suivante.
//
//   node tools/tutoTablettes.mjs [adresse] [sortie.pdf]
//
// L'adresse par défaut est celle du site ; on la passe en argument pour une
// autre installation. Elle est écrite EN CLAIR sous le QR : un code qu'on ne
// peut pas relire est un code qu'on ne peut pas vérifier.

import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { qrcodeSVG } from '../js/core/qrcode.js';

const SITE = (process.argv[2] || 'https://atout-math.fr').replace(/\/+$/, '');
const SORTIE = process.argv[3] || 'tools/tmp/atoutmath-tablettes.pdf';
const ADRESSE = `${SITE}/?preparer`;

const qr = qrcodeSVG(ADRESSE, { module: 6, marge: 4, titre: 'Préparer une tablette' });

// LA FEUILLE. Pas de dépendance, pas de gabarit : du HTML et une feuille de
// style d'impression, que Chromium transforme en PDF par le MÊME chemin que
// « Enregistrer au format PDF ».
const page = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>AtoutMath sur les tablettes de la classe</title>
<style>
  @page { size: A4; margin: 16mm 15mm; }
  * { box-sizing: border-box; }
  body { font: 11.5pt/1.55 "Segoe UI", system-ui, -apple-system, sans-serif;
         color: #0f172a; margin: 0; }
  h1 { font-size: 20pt; margin: 0 0 2mm; letter-spacing: -.01em; }
  .sous { color: #475569; margin: 0 0 7mm; font-size: 11pt; }
  h2 { font-size: 12.5pt; margin: 7mm 0 2mm; padding-bottom: 1.5mm;
       border-bottom: 1.5pt solid #0f172a; }
  /* LE PAS NUMÉROTÉ EST UNE INFORMATION : sur un iPad, le partage vient
     AVANT le choix « sur l'écran d'accueil ». L'ordre compte vraiment. */
  ol { margin: 0; padding-left: 6mm; }
  li { margin: 0 0 2.5mm; }
  ul { margin: 1.5mm 0 0; padding-left: 5mm; }
  b { font-weight: 700; }
  .boite { border: 1pt solid #cbd5e1; border-radius: 3mm; padding: 4mm 5mm;
           margin: 3mm 0; background: #f8fafc; }
  .vert { border-color: #2f855a; background: #f0fdf4; color: #14532d; }
  .vert b { color: #14532d; }
  .scan { display: flex; gap: 6mm; align-items: center; margin: 3mm 0 0; }
  .scan svg { width: 38mm; height: 38mm; flex: 0 0 auto; }
  .adresse { font-family: "Consolas", ui-monospace, monospace; font-size: 11pt;
             background: #f1f5f9; padding: 1mm 2mm; border-radius: 1.5mm; }
  .note { color: #475569; font-size: 10.5pt; }
  .pied { margin-top: 8mm; color: #94a3b8; font-size: 9pt; text-align: center; }
  /* RIEN NE SE COUPE AU MILIEU D'UN PAS : une consigne à cheval sur deux
     pages se lit deux fois, et la première moitié se fait sans la seconde. */
  li, .boite, h2 { break-inside: avoid; }
  h2 { break-after: avoid; }
</style></head><body>

<h1>AtoutMath sur les tablettes de la classe</h1>
<p class="sous">À faire <b>une seule fois</b>, avant la première séance.
   Comptez une dizaine de minutes pour vingt-cinq tablettes.</p>

<div class="boite">Il faut du <b>wifi pendant cette préparation</b> — et c'est
tout. Ensuite, les tablettes travaillent <b>sans internet</b>.</div>

<h2>1. Sur chaque tablette, ouvrez cette adresse</h2>
<div class="scan">
  ${qr}
  <div>
    <p style="margin:0 0 2mm">Avec l'<b>appareil photo</b> de la tablette&nbsp;:
       visez ce carré, puis touchez le lien qui apparaît.</p>
    <p style="margin:0 0 2mm">Ou tapez l'adresse dans le navigateur&nbsp;:</p>
    <p style="margin:0"><span class="adresse">${ADRESSE}</span></p>
    <p class="note" style="margin:2.5mm 0 0">Sur iPad, faites-le dans
       <b>Safari</b>&nbsp;: c'est le navigateur que l'appareil photo ouvrira
       aussi le jour de la séance.</p>
  </div>
</div>

<h2>2. Suivez les trois lignes de la page</h2>
<ol>
  <li><b>Mettre AtoutMath sur l'écran d'accueil.</b>
    <ul>
      <li>Sur <b>Android</b>&nbsp;: un bouton «&nbsp;Installer&nbsp;» apparaît
          — touchez-le. S'il tarde, attendez quelques secondes.</li>
      <li>Sur <b>iPad</b>&nbsp;: touchez <b>Partager</b> (le carré avec une
          flèche), puis <b>«&nbsp;Sur l'écran d'accueil&nbsp;»</b>.</li>
    </ul>
  </li>
  <li><b>Mettre tous les exercices en mémoire.</b> Cela se fait tout seul —
      environ 3&nbsp;Mo. Laissez la page ouverte jusqu'à la coche verte.</li>
  <li><b>Autoriser la caméra.</b> Touchez le bouton et acceptez. C'est ce qui
      permettra aux élèves de scanner votre QR code sans être interrompus en
      pleine séance.</li>
</ol>

<h2>3. Attendez la phrase verte</h2>
<div class="boite vert"><b>«&nbsp;Cette tablette est prête à travailler sans
internet.&nbsp;»</b></div>
<p class="note" style="margin:0">Si la page dit «&nbsp;PAS prête&nbsp;», elle
   écrit juste au-dessus ce qui manque. Rechargez-la et recommencez.</p>

<h2>4. Vérifiez — une tablette suffit</h2>
<ol>
  <li>Coupez le wifi de la tablette.</li>
  <li>Ouvrez AtoutMath depuis l'<b>écran d'accueil</b>.</li>
  <li>Elle doit s'ouvrir normalement. Si oui, les autres iront bien aussi.</li>
</ol>

<h2>Le jour de la séance</h2>
<ol>
  <li>Préparez votre séance sur votre ordinateur.</li>
  <li>Affichez son <b>QR code</b> et projetez-le (ou imprimez-le).</li>
  <li>Les élèves ouvrent AtoutMath, touchent <b>«&nbsp;J'ai un code&nbsp;»</b>,
      puis <b>«&nbsp;Scanner le QR code&nbsp;»</b>, et visent le tableau.</li>
</ol>
<p class="note" style="margin:1mm 0 0">Aucune tablette n'a besoin d'internet
   ce jour-là.</p>

<h2>Ce qui ne marche pas sans internet</h2>
<p style="margin:0"><b>Les résultats ne vous reviennent pas.</b> Chaque élève
   voit son propre bilan sur sa tablette&nbsp;; vous passez dans les rangs.
   Pour récupérer les résultats de la classe, il faut du réseau.</p>

<h2>Si ça coince</h2>
<ul style="padding-left:5mm; margin:0">
  <li><b>La page ne s'ouvre pas</b> — la tablette n'a plus de wifi. La
      préparation, elle, en a besoin.</li>
  <li><b>Pas de bouton «&nbsp;Installer&nbsp;» sur Android</b> — attendez
      quelques secondes&nbsp;; sinon, menu <b>⋮</b> du navigateur puis
      «&nbsp;Installer l'application&nbsp;».</li>
  <li><b>Un élève scanne et tombe sur une page blanche</b> — il a visé avec
      l'appareil photo. Il faut passer par AtoutMath&nbsp;:
      «&nbsp;J'ai un code&nbsp;» puis «&nbsp;Scanner le QR code&nbsp;».</li>
  <li><b>Un exercice refuse de s'ouvrir en classe</b> — cette tablette-là n'a
      pas fini sa préparation. Refaites l'étape&nbsp;1 avec du wifi.</li>
</ul>

<p class="pied">AtoutMath — ${ADRESSE}</p>
</body></html>`;

const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const fenetre = await nav.newPage();
await fenetre.setContent(page, { waitUntil: 'load' });
await fenetre.pdf({ path: SORTIE, format: 'A4', printBackground: true });

// ── ON RELIT CE QU'ON VIENT D'ÉCRIRE, DANS LE PDF ───────────────────────────
//
// « Compter les segments d'un PDF dit qu'il n'est pas vide, jamais qu'il est
// juste. » On relit donc le TEXTE DU PDF — pas celui du gabarit, qui ne
// prouverait que ma propre copie — et l'on exige les phrases dont l'absence
// rendrait la notice inutilisable.
//
// AVEC `pdfjs` ET NON `pdftotext` : poppler n'est pas installé ici, et il ne
// le sera pas davantage sur la machine de Rémy. `pdfjs-dist` est déjà dans
// `node_modules` — c'est la bibliothèque de l'aperçu —, et c'est le même
// chemin que `tools/pdfEnImage.mjs` emprunte pour REGARDER une feuille.
const lire = async (...noms) => {
    for (const n of noms) {
        try { return await readFile(n, 'utf8'); } catch (e) { /* suivante */ }
    }
    throw new Error(`aucun de ces fichiers : ${noms.join(', ')}`);
};
const lib = await lire('node_modules/pdfjs-dist/build/pdf.min.mjs',
    'node_modules/pdfjs-dist/build/pdf.mjs');
// L'OUVRIER DE `pdfjs` EST INJECTÉ DANS LA PAGE, et non chargé par le
// réseau : `pdf.js` refuse de s'initialiser sans lui, avec un message qui
// parle de `PDFWorker` et non du PDF qu'on relit.
const ouvrier = await lire('node_modules/pdfjs-dist/build/pdf.worker.min.mjs',
    'node_modules/pdfjs-dist/build/pdf.worker.mjs');
const octets = [...await readFile(SORTIE)];
await fenetre.setContent('<p>relecture</p>');
await fenetre.addScriptTag({ content: ouvrier, type: 'module' });
const relu = await fenetre.evaluate(async ([src, donnees]) => {
    const blob = new Blob([src], { type: 'text/javascript' });
    const mod = await import(URL.createObjectURL(blob));
    mod.GlobalWorkerOptions.workerSrc = '';
    const doc = await mod.getDocument({ data: new Uint8Array(donnees),
        useWorkerFetch: false, isEvalSupported: false, useSystemFonts: false }).promise;
    let texte = '';
    for (let n = 1; n <= doc.numPages; n++) {
        const c = await (await doc.getPage(n)).getTextContent();
        texte += c.items.map(i => i.str).join(' ') + '\n';
    }
    return { pages: doc.numPages, texte };
}, [lib, octets]);
await nav.close();

// LES ESPACES INSÉCABLES DEVIENNENT DES ESPACES : le gabarit en pose partout
// (`&nbsp;` avant un deux-points, dans « 3 Mo »…), et les chercher tels quels
// ferait échouer la relecture sur une typographie correcte.
const texte = relu.texte.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
const pages = relu.pages;
const exige = [
    ['l\'adresse de préparation', ADRESSE],
    ['la phrase verte', 'prête à travailler sans internet'],
    ['le geste d\'iPad', 'Sur l\'écran d\'accueil'],
    ['le geste de la séance', 'Scanner le QR code'],
    ['ce qui ne passe pas', 'Les résultats ne vous reviennent pas']
];
const manque = exige.filter(([, quoi]) => !texte.includes(quoi));

console.log(`${SORTIE} — ${pages} page(s), ${texte.trim().split(/\s+/).length} mots.`);
console.log(`adresse : ${ADRESSE}`);
if (manque.length) {
    console.error('\nIL MANQUE DANS LE PDF :');
    manque.forEach(([nom, quoi]) => console.error(`  ✗ ${nom} — « ${quoi} »`));
    process.exit(1);
}
console.log('Les cinq phrases indispensables sont dans le PDF.');
