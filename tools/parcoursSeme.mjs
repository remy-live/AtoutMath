// RENOMMER UNE SÉANCE NE DOIT PAS LA DUPLIQUER — le geste de Rémy, refait.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/parcoursSeme.mjs
//
// RÉMY, 31 octobre : « Quand je change le nom d'une épreuve ca le duplique ».
//
// CE QUE LES ÉPREUVES NE PEUVENT PAS DIRE, et qui se mesure donc ici : le
// doublon n'apparaît PAS au renommage. Il apparaît au DÉMARRAGE SUIVANT, quand
// le semeur de « Tout sur papier » ne retrouve plus sa feuille — il la
// cherchait par son nom — et en repose une neuve. Toute mesure qui s'arrête au
// renommage voit donc un logiciel correct ; il faut recharger la page.
//
// C'est la même leçon que la traînée des Pentaminos, par l'autre bout : là il
// fallait mesurer PENDANT le geste, ici il faut mesurer APRÈS le redémarrage.
// Dans les deux cas, l'instant où l'on regarde est le fond du problème.

import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const s = await ouvrirSonde({ largeur: 1280, hauteur: 900 });
await s.identifier();
const liste = () => s.page.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    return state.teacherPaths.map(p => p.name);
});
await dormir(600);
console.log('à l\'ouverture :', JSON.stringify(await liste()));

// Rémy renomme la feuille « Tout sur papier » comme il renommerait n'importe
// quelle séance à lui.
const renomme = await s.page.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    const p = state.teacherPaths.find(x => /^Tout sur papier/.test(x.name));
    if (!p) return null;
    state.updateTeacherPath(p.id, 'Ma feuille de contrôle', p.data);
    return p.id;
});
console.log('renommé :', renomme);
console.log('juste après :', JSON.stringify(await liste()));

// ET L'ON RECHARGE LA PAGE, comme il le fait le lendemain matin.
await s.page.reload({ waitUntil: 'networkidle' });
await dormir(1500);
const apres = await liste();
console.log('après rechargement :', JSON.stringify(apres));
const papier = apres.filter(n => /^Tout sur papier/.test(n)).length;
const sienne = apres.filter(n => n === 'Ma feuille de contrôle').length;
const duplique = papier && sienne;
console.log(duplique
    ? `  ⇒ DUPLIQUÉ : sa feuille renommée (${sienne}) ET « Tout sur papier » reposé (${papier}).`
    : '  ⇒ pas de duplication.');

// ET SON NOM À LUI A SURVÉCU. L'autre façon de ne pas pouvoir renommer serait
// que le démarrage remette d'office le nom semé : pas de doublon, et pas de
// renommage non plus. Les deux se mesurent ensemble ou pas du tout.
const garde = sienne === 1;
console.log(garde ? '  ⇒ et le nom qu\'il a écrit a tenu au rechargement.'
    : '  ⇒ SON NOM A ÉTÉ REMIS D\'OFFICE : le renommage ne tient pas.');

console.log(`erreurs de page : ${s.erreurs.length}`);
s.erreurs.slice(0, 3).forEach(e => console.log('  ! ' + e));
const fautes = (duplique ? 1 : 0) + (garde ? 0 : 1) + s.erreurs.length;
console.log(fautes ? `\n${fautes} chose(s) à regarder.` : '\nTOUT PASSE.');
await s.fermer();
process.exitCode = fautes ? 1 : 0;
