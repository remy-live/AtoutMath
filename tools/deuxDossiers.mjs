// ON CHERCHE L'EXERCICE LÀ OÙ RÉMY L'A CHERCHÉ.
// « j'ai cherché l'exercice des nombres relatifs, il était dans priorités mais
// il peut être aussi dans nombre relatifs » — donc on ouvre le catalogue, on
// entre dans « Nombres relatifs », et l'on regarde s'il y est.
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';
const s = await ouvrirSonde({ largeur: 1280, hauteur: 900 });
await s.identifier();
let ratés = 0;
const dire = (q, ok, d = '') => { if (!ok) ratés++;
  console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${q}${d ? ' — ' + d : ''}`); };
await dormir(1200);

const dansLeDossier = async (nom) => s.page.evaluate((n) => {
  // On passe par le module plutôt que par des clics : l'arbre se déplie
  // autrement selon la largeur, et ce qu'on mesure est le RANGEMENT.
  return import('./js/core/rangement.js').then(async (r) => {
    const c = await import('./js/data/catalog.js');
    return c.exercices.filter(e => r.cheminsDe(e, 'domaine')
      .some(ch => ch[1] === n)).map(e => e.id);
  });
}, nom);

const prio = await dansLeDossier('Priorités opératoires');
const rel = await dansLeDossier('Nombres relatifs');
console.log(`\n  « Priorités opératoires » : ${prio.length} exercices`);
console.log(`  « Nombres relatifs »      : ${rel.length} exercices`);

for (const id of ['calc-prio-relatifs', 'calc-oppose-regle', 'calc-oppose-enlever', 'calc-prio-oppose']) {
  dire(`${id} est dans LES DEUX dossiers`, prio.includes(id) && rel.includes(id),
    `prio ${prio.includes(id)} · relatifs ${rel.includes(id)}`);
}
// ET CE QUI N'A RIEN À Y FAIRE N'Y EST PAS : un outil qui range tout partout ne
// range plus rien.
dire('« Priorités : ligne par ligne » reste aux priorités seules',
  prio.includes('calc-prio-cascade') && !rel.includes('calc-prio-cascade'));

console.log(`\nerreurs de page : ${s.erreurs.length} · natives : ${s.fenetresNatives.length}`);
if (s.erreurs.length) { ratés++; s.erreurs.slice(0,3).forEach(e => console.log('   ' + e)); }
await s.fermer();
console.log(ratés ? `\n\x1b[31m${ratés} raté(s)\x1b[0m` : '\n\x1b[32mON LE TROUVE AUX DEUX ENDROITS\x1b[0m');
