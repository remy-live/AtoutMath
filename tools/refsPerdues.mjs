// CHERCHER LES RÉFÉRENCES ORPHELINES DANS LES FICHES.
//
//     node tools/refsPerdues.mjs
//
// Un module qui APPELLE une fonction sans l'importer se compile très bien :
// l'erreur n'arrive qu'à l'exécution, sur un exercice précis, peut-être devant
// une classe. `node --check` ne la voit pas. On la cherche donc ici : pour
// chaque fichier, tout identifiant qui est déclaré QUELQUE PART dans le dossier
// des fiches doit être, ICI, soit déclaré sur place, soit importé.
//
// C'est la garde du découpage de `printSheet.js` (voir `decouperPrintSheet.mjs`) :
// elle a trouvé `calculerFiche` partie avec la mauvaise famille, et `PAGE` que
// le socle ne réexportait pas.
import fs from 'node:fs';
const reDecl = /^(?:export\s+)?(?:async\s+)?(?:function\s+([A-Za-z_$][\w$]*)|(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=)/;
// Le vocabulaire du dossier : tout ce que les fiches déclarent, où que ce soit.
const FICHIERS = [...fs.readdirSync('js/ui/fiches').map(f => 'js/ui/fiches/' + f),
                  'js/ui/printSheet.js'];
const avant = new Set(FICHIERS.flatMap(f => fs.readFileSync(f, 'utf8').split('\n'))
    .map(l => l.match(reDecl)).filter(Boolean).map(m => m[1] || m[2]));

const fichiers = FICHIERS;
let total = 0;
for (const f of fichiers) {
    const src = fs.readFileSync(f, 'utf8');
    const declare = new Set(src.split('\n').map(l => l.match(reDecl)).filter(Boolean).map(m => m[1] || m[2]));
    const importe = new Set();
    for (const m of src.matchAll(/import\s+([\s\S]*?)\s+from\s+['"][^'"]+['"]/g)) {
        const nomme = m[1].match(/\{([\s\S]*)\}/);
        if (nomme) for (const t of nomme[1].split(',')) {
            const s = t.trim(); if (!s) continue;
            // « X as Y » : les DEUX noms comptent. Y est ce qu'on écrit ici, X
            // est ce qui apparaît dans la clause — et l'un comme l'autre ne
            // sont pas des références orphelines.
            const a = s.match(/^(\S+)\s+as\s+(\S+)$/);
            if (a) { importe.add(a[1]); importe.add(a[2]); } else importe.add(s);
        }
        const def = m[1].replace(/\{[\s\S]*\}/, '').replace(/,/g, '').trim();
        if (def) importe.add(def);
    }
    // Les identifiants utilisés HORS des imports, ET HORS DE LA PROSE : dans ce
    // dépôt, « pose », « compte », « angles », « chemin » sont à la fois des
    // mots français et des noms de fonctions.
    const sansProse = src
        .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ')
        .replace(/'(?:[^'\\]|\\.)*'/g, ' ').replace(/"(?:[^"\\]|\\.)*"/g, ' ');
    const corps = sansProse.replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, '');
    const perdus = new Set();
    for (const m of corps.matchAll(/\b([A-Za-z_$][\w$]*)\b/g)) {
        const n = m[1];
        if (!avant.has(n) || declare.has(n) || importe.has(n)) continue;
        perdus.add(n);
    }
    if (perdus.size) {
        total += perdus.size;
        console.log(`\n\x1b[31m${f}\x1b[0m utilise sans déclarer ni importer :`);
        console.log('   ' + [...perdus].sort().join(', '));
    }
}
console.log(total ? `\n${total} référence(s) orpheline(s).` : '\nAucune référence orpheline.');
process.exit(total ? 1 : 0);
