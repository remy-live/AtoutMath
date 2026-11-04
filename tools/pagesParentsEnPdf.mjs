// LA PAGE PARENTS, FABRIQUÉE POUR DE VRAI ET REGARDÉE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/pagesParentsEnPdf.mjs [--eleves=3] [--sortie=tools/tmp/parents]
//
// « est-ce que Louis peut avoir un corrigé, ou ses parents ? » — la fiche de
// reprise part avec l'élève, cette page part avec ses parents. Et le défaut
// qu'on craint ici ne se compte pas : c'est une page qui NOTE sans le dire, ou
// une page qui désigne la moins mauvaise des notions ratées parce que la liste
// du bilan vient de la mieux maîtrisée à la moins bonne.
//
// L'outil monte le site d'essai, charge les cinq classes de démonstration,
// fabrique le PDF DEPUIS LA PAGE — donc par le chemin du professeur —, et le
// rend en images. Il imprime pour chaque élève ses trois colonnes et le conseil
// du soir : c'est ce qui permet de voir d'un coup d'œil que deux élèves voisins
// ne reçoivent pas la même page.

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
const COMBIEN = Number(option('eleves', 3));
const SORTIE = option('sortie', 'tools/tmp/parents');

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

const vu = await s.page.evaluate(async ({ combien }) => {
    const { classesDeDemo } = await import('./js/core/demoClasses.js');
    const { bilanClasse } = await import('./js/core/bilan.js');
    const m = await import('./js/ui/pageParents.js');

    const classe = classesDeDemo({})[0];
    const bilan = bilanClasse(classe);
    const actifs = (bilan.eleves || []).filter(e => e.questions > 0);
    const garde = actifs.slice(0, combien);
    const r = await m.telechargerLesPagesParents(garde, {
        classe: classe.nom, periode: 'Novembre', date: '4 novembre'
    });
    return {
        classe: classe.nom, eleves: (classe.eleves || []).length,
        actifs: actifs.length, muets: (bilan.eleves || []).length - actifs.length,
        rendu: r,
        detail: garde.map(e => {
            const c = m.troisColonnes(e);
            return {
                eleve: e.nom,
                phrase: m.phraseParents(e, c),
                acquis: c.acquis.map(x => x.nom),
                encours: c.encours.map(x => x.nom),
                reprendre: c.reprendre.map(x => x.nom),
                conseil: m.conseilMaison(c).slice(0, 90),
                // CE QU'UNE PAGE PARENTS NE DOIT JAMAIS PORTER.
                note: /\bmoyenne\b|\/20|\brang\b/i.test(JSON.stringify(c))
            };
        })
    };
}, { combien: COMBIEN });

await dormir(2500);

console.log(`classe ${vu.classe} · ${vu.eleves} élèves, ${vu.actifs} ont déposé quelque chose`);
console.log(`  document : ${vu.rendu.pages} page(s) — une par élève`);
console.log(`  ${vu.muets} élève(s) sans page : ils n'ont rien déposé`);
for (const d of vu.detail) {
    console.log(`\n  · ${d.eleve}`);
    console.log(`      « ${d.phrase} »`);
    console.log(`      acquis     : ${d.acquis.join(' · ') || '—'}`);
    console.log(`      en cours   : ${d.encours.join(' · ') || '—'}`);
    console.log(`      à reprendre: ${d.reprendre.join(' · ') || '—'}`);
    console.log(`      le soir    : ${d.conseil}…`);
}

// DEUX ÉLÈVES VOISINS NE REÇOIVENT PAS LA MÊME PAGE.
const signatures = vu.detail.map(d => [d.acquis, d.encours, d.reprendre].join('|'));
console.log(signatures.length > 1 && new Set(signatures).size === 1
    ? '\n  ⚠ TOUTES LES PAGES DISENT LA MÊME CHOSE'
    : `\n  ${new Set(signatures).size} page(s) différente(s) sur ${signatures.length}`);

console.log(`\nerreurs de page : ${s.erreurs.length}, fenêtres natives : ${s.fenetresNatives.length}`);
s.erreurs.slice(0, 4).forEach(e => console.log('  ! ' + String(e).slice(0, 180)));
await s.fermer();

if (!telechargements.length) {
    console.log('\nAUCUN PDF N\'EST ARRIVÉ — le document ne s\'est pas enregistré.');
    process.exit(1);
}
// ON REGARDE TOUTES LES PAGES, PAS LA PREMIÈRE : la page d'un élève qui a tout
// réussi et celle d'un élève en peine ne se composent pas pareil, et c'est la
// seconde qui déborde.
for (const pdf of telechargements) {
    for (let page = 1; page <= vu.rendu.pages; page++) {
        const img = `${SORTIE}/p${page}.png`;
        await executer('node', ['tools/pdfEnImage.mjs', pdf, img, '2', String(page)])
            .then(r => console.log('  ' + r.stdout.trim()))
            .catch(() => console.log(`  (page ${page} : pas rendue)`));
    }
}
process.exit(0);
