// LES FICHES DE REPRISE, FABRIQUÉES POUR DE VRAI ET REGARDÉES.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/reprisesEnPdf.mjs [--detachable] [--eleves=3]
//
// « Une feuille, ça se regarde » — et une feuille PAR ÉLÈVE encore plus : le
// défaut qu'on craint ici n'est pas qu'elle soit vide, c'est qu'elle soit la
// MÊME pour tout le monde, ou que le corrigé de Louis parte avec la feuille
// d'Emma. Rien de tout cela ne se voit en comptant des pages.
//
// L'outil monte le site d'essai, charge les cinq classes de démonstration,
// fabrique le PDF depuis la PAGE — donc par le chemin du professeur —, et le
// rend en images. Il imprime aussi, pour chaque élève, ses notions : c'est ce
// qui permet de vérifier d'un coup d'œil que deux élèves voisins n'ont pas la
// même feuille.

import { mkdir } from 'node:fs/promises';
import { setTimeout as dormir } from 'node:timers/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ouvrirSonde } from './sonde.mjs';

const executer = promisify(execFile);
const args = process.argv.slice(2);
const option = (nom, defaut) => {
    const t = args.find(a => a.startsWith(`--${nom}=`));
    return t ? t.slice(nom.length + 3) : defaut;
};
const DETACHABLE = args.includes('--detachable');
const COMBIEN = Number(option('eleves', 3));
const SORTIE = option('sortie', 'tools/tmp/reprises');

await mkdir(SORTIE, { recursive: true });
const s = await ouvrirSonde({ largeur: 1280, hauteur: 900 });
await s.identifier();
await dormir(600);

const telechargements = [];
s.page.on('download', async (d) => {
    const chemin = `${SORTIE}/${d.suggestedFilename()}`;
    await d.saveAs(chemin);
    telechargements.push(chemin);
});

const vu = await s.page.evaluate(async ({ detachable, combien }) => {
    const { classesDeDemo } = await import('./js/core/demoClasses.js');
    const { bilanClasse } = await import('./js/core/bilan.js');
    // `exercicePourLaFeuille` ET NON `firstExerciseForSkill` : sur une FEUILLE,
    // le premier venu se trompe une fois sur deux — voir `amelioration.js`.
    const { exercicePourLaFeuille } = await import('./js/core/amelioration.js');
    const { reprisesDeLaClasse } = await import('./js/core/reprise.js');
    const { telechargerLesReprises } = await import('./js/ui/fichesDeReprise.js');

    const classe = classesDeDemo({})[0];
    const bilan = bilanClasse(classe);
    const { fiches, ecartes } = reprisesDeLaClasse(bilan.eleves, exercicePourLaFeuille);
    const garde = fiches.slice(0, combien);
    const r = await telechargerLesReprises(garde, {
        classe: classe.nom, detachable, corriges: true
    });
    return {
        classe: classe.nom, eleves: (classe.eleves || []).length,
        fiches: fiches.length, ecartes: ecartes.length,
        rendu: r,
        detail: garde.map(f => ({
            eleve: f.eleve,
            notions: f.notions.map(n => n.nom),
            erreur: f.erreur ? `${f.erreur.donne} au lieu de ${f.erreur.attendu}` : null
        }))
    };
}, { detachable: DETACHABLE, combien: COMBIEN });

await dormir(2500);

console.log(`classe ${vu.classe} · ${vu.eleves} élèves`);
console.log(`  ${vu.fiches} feuille(s) à faire, ${vu.ecartes} élève(s) écarté(s)`);
console.log(`  document : ${vu.rendu.feuilles} feuille(s), ${vu.rendu.pages} page(s)`);
for (const d of vu.detail) {
    console.log(`  · ${d.eleve.padEnd(10)} ${d.notions.join(' · ')}`
        + (d.erreur ? `   [${d.erreur}]` : ''));
}

// DEUX ÉLÈVES VOISINS N'ONT PAS LA MÊME FEUILLE : c'est ce qu'on vient
// vérifier, et c'est la seule chose qu'un comptage de pages ne dirait pas.
const signatures = vu.detail.map(d => d.notions.join('|'));
const toutesPareilles = signatures.length > 1 && new Set(signatures).size === 1;
console.log(toutesPareilles
    ? '\n  ⚠ TOUTES LES FEUILLES PORTENT LES MÊMES NOTIONS'
    : `\n  ${new Set(signatures).size} composition(s) différente(s) sur ${signatures.length}`);

console.log(`\nerreurs de page : ${s.erreurs.length}, fenêtres natives : ${s.fenetresNatives.length}`);
s.erreurs.slice(0, 4).forEach(e => console.log('  ! ' + String(e).slice(0, 180)));
await s.fermer();

if (!telechargements.length) {
    console.log('\nAUCUN PDF N\'EST ARRIVÉ — le document ne s\'est pas enregistré.');
    process.exit(1);
}
for (const pdf of telechargements) {
    for (const page of [1, 2, vu.rendu.pages]) {
        const img = `${SORTIE}/p${page}.png`;
        await executer('node', ['tools/pdfEnImage.mjs', pdf, img, '2', String(page)])
            .then(r => console.log('  ' + r.stdout.trim()))
            .catch(() => console.log(`  (page ${page} : pas rendue)`));
    }
}
process.exit(vu.erreurs === 0 ? 0 : 0);
