// UNE GRILLE IMPRIMÉE SEULE PEUT-ELLE ÊTRE REMPLISSABLE ?
//
// ─────────────────────────────────────────────────────────────────────────────
//
// C'ÉTAIT NON, ET PERSONNE NE POUVAIT LE VOIR. Il y a trois portes vers le
// papier : la fiche des QUESTIONS (`#fq-champs`), le poly d'un PARCOURS
// (`#pp-champs`), et la fiche d'UN exercice — qui n'avait pas de case du tout.
// Cinquante-neuf rendus posaient donc des champs que cette porte-là ne
// demandait jamais : le code était juste, le réglage n'existait pas.
//
// Un trou de cette forme ne se voit dans AUCUNE épreuve de code — le rendu
// pose bien ses champs quand on le lui demande — et pas davantage dans
// `tools/champsRemplissables.mjs`, qui appelle le rendu directement. Il ne se
// voit qu'en empruntant le chemin du professeur : ouvrir la fiche d'un
// exercice, déplier « Papier et impression », cocher, télécharger, et compter
// dans le fichier.
//
//     node tools/grilleSeuleRemplissable.mjs

import { mkdir, readFile } from 'node:fs/promises';
import { setTimeout as dormir } from 'node:timers/promises';
import { ouvrirSonde } from './sonde.mjs';

const DOSSIER = 'tools/tmp/grille-seule';
await mkdir(DOSSIER, { recursive: true });

const s = await ouvrirSonde({ largeur: 1500, hauteur: 1000 });
await s.identifier();

let manques = 0;
const dire = (ok, texte) => {
    if (!ok) manques++;
    console.log(`  ${ok ? '\x1b[32mok  \x1b[0m' : '\x1b[31mnon \x1b[0m'}${texte}`);
};

// Trois exercices : une grille de chiffres, un tableau, un QCM dessiné.
for (const [id, attenduTexte, attenduCoches] of [
    ['calc-sudoku', 20, 0],
    ['mes-conversion', 20, 0],
    ['geo-appartenance', 0, 4]
]) {
    await s.page.evaluate(async (exoId) => {
        document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
        const cat = await import('./js/data/catalog.js');
        const ps = await import('./js/ui/printSheet.js');
        const e = cat.exercices.find(x => x.id === exoId);
        ps.ouvrirFicheModal(e, { ...(e.params || {}) }, null, { flottant: false, nbItems: 4 });
    }, id);
    await dormir(3000);

    const existe = await s.page.$('#fp-champs');
    dire(!!existe, `${id} : la fiche offre la case « remplissable »`);
    if (!existe) continue;
    await s.deplier('#fp-champs');
    await s.page.check('#fp-champs');
    await dormir(1500);

    const attente = s.page.waitForEvent('download', { timeout: 30000 });
    await s.page.click('#fp-telecharger');
    const chemin = `${DOSSIER}/${id}.pdf`;
    await (await attente).saveAs(chemin);
    const brut = await readFile(chemin, 'latin1');
    const texte = (brut.match(/\/FT\s*\/Tx/g) || []).length;
    const coches = (brut.match(/\/FT\s*\/Btn/g) || []).length;
    console.log(`        ${texte} saisie(s), ${coches} case(s) à cocher`);
    dire(texte >= attenduTexte && coches >= attenduCoches,
        `${id} : au moins ${attenduTexte} saisie(s) et ${attenduCoches} coche(s)`);
}

console.log('\n' + '─'.repeat(74));
console.log(`fenêtres natives : ${s.fenetresNatives.length} · erreurs de page : ${s.erreurs.length}`);
s.erreurs.slice(0, 5).forEach(e => console.log('  ' + e));
console.log(manques ? `\x1b[31m${manques} point(s) à reprendre.\x1b[0m`
    : '\x1b[32mLA TROISIÈME PORTE EST OUVERTE.\x1b[0m');
await s.fermer();
process.exitCode = manques || s.erreurs.length ? 1 : 0;
