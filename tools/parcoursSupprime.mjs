// UN PARCOURS SUPPRIMÉ REVIENT-IL ?
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « il me faudrait clairement un gestionnaire de parcours pour en
// sélectionner plusieurs les trier les classer car là du coup on a tout
// retrouvé. Supprimer en bloc, mettre dans la corbeille. »
//
// CE QU'IL FAUT SAVOIR AVANT DE DESSINER QUOI QUE CE SOIT, et qui ne se devine
// pas : depuis que la bibliothèque REDESCEND du serveur au démarrage (v906),
// supprimer un parcours dans le navigateur ne le supprime nulle part. La route
// `/teacher/paths` n'accepte que `save` et `list` — il n'existe AUCUNE façon de
// retirer un parcours du serveur.
//
// LA CONSÉQUENCE SE MESURE EN TROIS GESTES : on supprime, on recharge, on
// regarde. Si le parcours est de retour, alors le bouton « Supprimer » que
// Rémy a sous les yeux depuis des mois est un bouton qui ne supprime rien — et
// un gestionnaire de bibliothèque bâti par-dessus serait un gestionnaire qui
// ment à chaque geste.
//
// C'EST EXACTEMENT LA MESURE QU'IL FAUT FAIRE AVANT D'ÉCRIRE L'ÉCRAN, et pas
// après : l'écran est une demi-journée, la route et la colonne qui la rendent
// vraie sont le vrai travail.
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const s = await ouvrirSonde({ largeur: 1300, hauteur: 900 });
let ratés = 0;
const dire = (q, ok, d = '') => {
    if (!ok) ratés++;
    console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${q}${d ? ' — ' + d : ''}`);
};

await s.identifier();
await dormir(1500);

// ── ON POSE UN PARCOURS, ET ON LE LAISSE MONTER ─────────────────────────────
console.log('\n\x1b[1m1. UN PARCOURS, ENREGISTRÉ ET MONTÉ\x1b[0m');
const pose = await s.page.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    const { makePath, makeStep } = await import('./js/core/path.js');
    const { politiquePerso } = await import('./js/core/mesExercices.js');
    const p = makePath('À SUPPRIMER', [makeStep('calc-add', {}, { nbItems: 4 })],
        politiquePerso());
    const entree = state.saveTeacherPath(p.name, p);
    return { id: entree.id, combien: state.teacherPaths.length };
});
// La veille attend deux secondes après la dernière retouche.
await dormir(4000);
const auServeur = async () => s.page.evaluate(async () => {
    const { auServeur: appel } = await import('./js/core/espaceProf.js');
    const r = await appel('/teacher/paths', { action: 'list' });
    return (r.paths || []).map((x) => x.name);
});
let noms = await auServeur();
dire('il est au serveur', noms.includes('À SUPPRIMER'), JSON.stringify(noms));

// ── ON LE SUPPRIME, COMME LE BOUTON LE FAIT ─────────────────────────────────
console.log('\n\x1b[1m2. ON LE SUPPRIME\x1b[0m');
const apres = await s.page.evaluate(async ([id]) => {
    const { state } = await import('./js/core/state.js');
    state.removeTeacherPath(id);
    return { local: state.teacherPaths.map((p) => p.name) };
}, [pose.id]);
dire('il a bien quitté la bibliothèque de ce poste',
    !apres.local.includes('À SUPPRIMER'));
await dormir(3500);
noms = await auServeur();
dire('ET IL A QUITTÉ LE SERVEUR', !noms.includes('À SUPPRIMER'),
    noms.includes('À SUPPRIMER') ? 'toujours là' : 'parti');

// ── ON RECHARGE : C'EST LE GESTE QUI TRANCHE ────────────────────────────────
//
// Le professeur ferme son navigateur le soir et le rouvre le matin. C'est tout
// ce que ce rechargement imite.
console.log('\n\x1b[1m3. ON RECHARGE LA PAGE, COMME LE LENDEMAIN MATIN\x1b[0m');
await s.page.reload();
await s.page.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
await dormir(6000);
const auReveil = await s.page.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    return state.teacherPaths.map((p) => p.name || (p.data || {}).name || '?');
});
console.log(`   la bibliothèque au réveil : ${JSON.stringify(auReveil)}`);
dire('IL NE REVIENT PAS', !auReveil.includes('À SUPPRIMER'),
    auReveil.includes('À SUPPRIMER') ? 'LE PARCOURS EST REVENU' : 'parti pour de bon');

console.log(`\nerreurs de page : ${s.erreurs.length}`);
s.erreurs.slice(0, 3).forEach((e) => console.log('   ' + e));

console.log(ratés
    ? `\n\x1b[31m${ratés} RATÉ(S) — « Supprimer » ne supprime pas.\x1b[0m`
    : '\n\x1b[32mSUPPRIMER SUPPRIME, ET CELA TIENT AU RECHARGEMENT.\x1b[0m');
await s.fermer();
process.exit(ratés ? 1 : 0);
