// LES DOSSIERS DE PARCOURS SURVIVENT-ILS À UNE SESSION ?
//
// RÉMY : « j'ai créé des dossiers pour y mettre des parcours à ma session
// précédente, il ne sont pas restés ».
//
// CE QUE CET OUTIL MESURE, et qu'aucune épreuve de texte ne peut dire : ce que
// le SERVEUR garde, et ce qu'une machine NEUVE retrouve. Le défaut ne se voit
// qu'en vidant le navigateur — sur le poste où l'on vient de ranger, tout a
// l'air parfait, puisque le rangement est là, en local.
//
// MESURÉ AVANT :
//   le serveur rendait  ["id","name","data","updated_at","donne"]
//   après vidage        dossiers: []  ·  « Révisions » → racine
// MESURÉ APRÈS :
//   le serveur rend     [… ,"folder_id", …] et la liste des dossiers
//   après vidage        dossiers: ["Sixièmes"]  ·  « Révisions » → son dossier
//
// À relancer dès qu'on touche à `paths`, à `parcoursServeur.js` ou à
// `arbitrageParcours.js` : c'est le seul endroit où le trajet entier se voit.
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const s = await ouvrirSonde({ largeur: 1280, hauteur: 900 });
await s.identifier();

// 1 · Le professeur crée un dossier et y range un parcours — par la porte du
//     logiciel, celle qu'emploie l'explorateur.
const pose = await s.page.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    const { makePath, makeStep } = await import('./js/core/path.js');
    const d = state.addTeacherFolder('Sixièmes');
    const p = makePath('Révisions', [makeStep('calc-add', {}, { stepId: 's1' })]);
    const entree = state.saveTeacherPath('Révisions', p, d.id);
    return { dossier: d.id, parcours: entree && entree.id,
        rangeDans: (state.teacherPaths.find(x => x.id === (entree && entree.id)) || {}).folderId };
});
console.log('1 · posé :', JSON.stringify(pose));
await dormir(4000);   // le temps que la bibliothèque monte au serveur

// 2 · Ce que le SERVEUR en sait.
const auServeur = await s.page.evaluate(async () => {
    const { auServeur: appel } = await import('./js/core/espaceProf.js');
    const r = await appel('/teacher/paths', { action: 'list' });
    const liste = (r && (r.paths || r.data || r.liste)) || [];
    return { erreur: r && r.erreur, combien: liste.length,
        premiere: liste[0] ? Object.keys(liste[0]) : null,
        dossiers: liste.map(p => p.folderId ?? p.folder_id ?? null) };
});
console.log('2 · au serveur :', JSON.stringify(auServeur));

// 3 · UNE AUTRE SESSION : on vide ce que le navigateur garde, et l'on recharge.
//     C'est exactement « ma session précédente » — un autre poste, ou le même
//     après un vidage.
await s.page.evaluate(async () => {
    const bases = await (indexedDB.databases ? indexedDB.databases() : []);
    await Promise.all(bases.map(b => new Promise(ok => {
        const r = indexedDB.deleteDatabase(b.name); r.onsuccess = r.onerror = r.onblocked = ok;
    })));
    localStorage.clear();
});
await s.page.reload({ waitUntil: 'networkidle' });
await s.identifier();
await dormir(5000);
const apres = await s.page.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    return {
        dossiers: (state.teacherFolders || []).map(f => f.name),
        parcours: (state.teacherPaths || []).map(p => ({ n: p.name, d: p.folderId }))
    };
});
console.log('3 · après une nouvelle session :', JSON.stringify(apres));
console.log('erreurs :', s.erreurs.slice(0, 2).join(' | '));
await s.fermer();
