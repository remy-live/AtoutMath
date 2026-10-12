// LES CHAMPS NOUVELLEMENT POSÉS, COMPTÉS DANS UN VRAI PDF.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// `tools/champsRemplissables.mjs` compte les APPELS au crayon, avec un faux
// jsPDF. C'est rapide et ça balaye les quatre-vingts rendus — mais un appel
// n'est pas un champ : jsPDF peut refuser une boîte, la poser hors de la page,
// ou l'écraser. Rémy imprime des PDF, pas des appels de fonction.
//
// Celle-ci monte un poly par SON chemin, coche « Champs remplissables »,
// télécharge le fichier et compte dedans les annotations AcroForm. Elle rend
// aussi la première page en image : un champ au mauvais endroit se voit, et ne
// se compte pas.
//
//     node tools/champsSurLeVraiPdf.mjs

import { mkdir, readFile } from 'node:fs/promises';
import { setTimeout as dormir } from 'node:timers/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ouvrirSonde } from './sonde.mjs';

const executer = promisify(execFile);
const DOSSIER = 'tools/tmp/champs-vrais';
await mkdir(DOSSIER, { recursive: true });

// SIX EXERCICES NOUVELLEMENT ÉQUIPÉS, et choisis pour couvrir six FAÇONS
// différentes de poser un champ : une ligne tracée, une case de tableau, un
// trou au milieu d'une phrase, une case de grille, une case à cocher, et une
// ligne de rédaction.
const LOT = [
    ['calc-prio-cascade', 'les lignes de la cascade'],
    ['mes-conversion', 'les cases du tableau de conversion'],
    ['geo-repere-lire', 'les deux trous de « A ( … ; … ) »'],
    ['calc-pyramide-nombres', 'les cases vides de la pyramide'],
    ['geo-appartenance', 'un QCM dessiné : de vraies cases à cocher'],
    ['geo-pythagore', 'les lignes de rédaction']
];

const s = await ouvrirSonde({ largeur: 1500, hauteur: 1000 });
await s.identifier();

let manques = 0;
const dire = (ok, texte) => {
    if (!ok) manques++;
    console.log(`  ${ok ? '\x1b[32mok  \x1b[0m' : '\x1b[31mnon \x1b[0m'}${texte}`);
};

await s.page.evaluate(async (ids) => {
    const { makeStep, makePath } = await import('./js/core/path.js');
    const { politiquePerso } = await import('./js/core/mesExercices.js');
    const pp = await import('./js/ui/printParcours.js');
    const pas = ids.map((id, i) => makeStep(id, {}, { stepId: 'c' + i, nbItems: 4 }));
    pp.ouvrirFicheParcours(makePath('Tout ce qui se remplit', pas, politiquePerso()));
}, LOT.map(x => x[0]));
await dormir(5500);

// La case dort dans un repli : voir `sonde.deplier`, qui dit pourquoi notre
// mesure de visibilité ment là-dedans.
await s.deplier('#pp-champs');
await s.page.check('#pp-champs');
await dormir(3500);

const attente = s.page.waitForEvent('download', { timeout: 45000 });
await s.page.click('#pp-dl');
const pdf = `${DOSSIER}/poly.pdf`;
await (await attente).saveAs(pdf);

const brut = await readFile(pdf, 'latin1');
const texte = (brut.match(/\/FT\s*\/Tx/g) || []).length;
const coches = (brut.match(/\/FT\s*\/Btn/g) || []).length;
console.log(`\n  le poly porte \x1b[1m${texte}\x1b[0m saisie(s) et \x1b[1m${coches}\x1b[0m case(s) à cocher`);
LOT.forEach(([id, quoi]) => console.log(`        · ${id.padEnd(24)} ${quoi}`));

// LE SEUIL DIT CE QU'ON ATTEND, ET POURQUOI. Six exercices à quatre questions,
// dont un tableau de conversion qui pose à lui seul une case par colonne : en
// dessous de cinquante saisies, un rendu du lot n'a rien posé.
dire(texte >= 50, `au moins cinquante saisies (${texte})`);
dire(coches >= 4, `le QCM dessiné porte ses cases à cocher (${coches})`);

for (const page of [1, 2]) {
    try {
        await executer('node', ['tools/pdfEnImage.mjs', pdf, `${DOSSIER}/p${page}.png`, '2.2', String(page)]);
        console.log(`        → ${DOSSIER}/p${page}.png`);
    } catch (e) { /* une page de moins, ce n'est pas un défaut */ }
}

console.log('\n' + '─'.repeat(74));
console.log(`fenêtres natives : ${s.fenetresNatives.length} · erreurs de page : ${s.erreurs.length}`);
s.erreurs.slice(0, 6).forEach(e => console.log('  ' + e));
console.log(manques
    ? `\x1b[31m${manques} point(s) à reprendre.\x1b[0m`
    : `\x1b[32mLES CHAMPS SONT DANS LE FICHIER. Les images sont à REGARDER.\x1b[0m`);
await s.fermer();
process.exitCode = manques || s.fenetresNatives.length || s.erreurs.length ? 1 : 0;
