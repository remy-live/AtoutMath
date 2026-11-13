// L'ÉCRAN RANGÉ DE L'ÉLÈVE : plein écran, et pas de profil.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « on peut aussi envisager que ce soit plein écran (en option là où on
// choisit le thème) où l'élève n'a pas accès à son profil ».
//
// CE QUE CETTE SONDE MESURE, et qu'aucune épreuve de bureau ne peut dire :
//
//   · QUE LE RÉGLAGE SURVIT AU SERVEUR. Il voyage en JSON, il est revérifié en
//     PHP, il revient. Une valeur refusée côté serveur s'efface EN SILENCE —
//     c'est exactement ce qui est arrivé aux onze mondes neufs le même jour.
//   · QUE LES DEUX PORTES DU PROFIL SONT FERMÉES. Celle du haut sur un écran
//     large, celle du bas sur un téléphone. Une seule suffirait à croire que
//     c'est fait, et l'autre se découvrirait en classe.
//   · ET QUE LE REFUS EST RÉEL. Cacher un bouton ne ferme pas une porte :
//     `setTopNavMode('profile')` doit renvoyer au parcours, pas ouvrir le
//     profil sans ses boutons.
//   · QUE L'ÉCRAN DU PROFESSEUR, LUI, NE CHANGE PAS.
//
//     node tools/ecranRangeDeLEleve.mjs
// ON IMPORTE SANS `?v=`, ET C'EST UNE CORRECTION.
//
// Ajouter une chaine de requete a un module en charge une COPIE : un autre
// objet, avec ses propres variables. La premiere version de cette sonde ecrivait
// le reglage dans la copie de `reglagesSite.js` et le relisait dans l'originale,
// qui ne savait rien — quatre points rouges pour un defaut qui n'existait que
// dans la mesure. Les modules du logiciel se prennent tels qu'ils sont.
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

let ko = 0;
const dire = (bon, quoi) => { if (!bon) ko++; console.log(`  ${bon ? 'ok  ' : 'NON '} ${quoi}`); };

const s = await ouvrirSonde({ largeur: 1280, hauteur: 900 });
await s.identifier();

// ── 1 · LE PROFESSEUR L'ALLUME, ET LE SERVEUR LE GARDE ──────────────────────
console.log('\n── LE RÉGLAGE, ALLER ET RETOUR PAR LE SERVEUR ──');
const ecrit = await s.page.evaluate(async () => {
    const m = await import('/js/core/espaceProf.js');
    const r = await m.reglagesDuSite({ ecranDeLEleve: 'kiosque' });
    // ON MET LE CACHE À JOUR COMME LE FAIT LA ZONE DU PROFESSEUR. `reglageSite`
    // lit le cache local, pas la réponse du serveur : sans ce geste, le serveur
    // dit « kiosque » et le navigateur relit « ». C'est le défaut que cette
    // sonde a trouvé dans le premier jet du réglage.
    const c = await import('/js/core/reglagesSite.js');
    c.noterReglagesSite(r.reglages || {});
    return r;
});
console.log('  le serveur répond :', JSON.stringify(ecrit && ecrit.reglages));
dire(!!ecrit && ecrit.reglages && ecrit.reglages.ecranDeLEleve === 'kiosque',
    'le serveur garde « kiosque » — une valeur refusée s’effacerait en silence');

const relu = await s.page.evaluate(async () => {
    const r = await import('/js/core/reglagesSite.js');
    return r.reglageSite('ecranDeLEleve');
});
console.log('  le navigateur relit :', JSON.stringify(relu));
dire(relu === 'kiosque', 'et le navigateur le relit — c’est le cache qui décide sur ce poste');

// ── 2 · L'ÉCRAN DU PROFESSEUR NE BOUGE PAS ──────────────────────────────────
await s.page.evaluate(async () => {
    const m = await import('/js/ui/ecranDeLEleve.js');
    m.appliquerEcranDeLEleve();
});
const chezLeProf = await s.page.evaluate(() => ({
    prof: document.body.classList.contains('teacher-mode'),
    kiosque: document.body.classList.contains('ecran-kiosque'),
    profilHaut: !!document.getElementById('top-btn-profile')
        && getComputedStyle(document.getElementById('top-btn-profile')).display !== 'none'
}));
console.log('\n── CHEZ LE PROFESSEUR ──');
console.log('  ', JSON.stringify(chezLeProf));
dire(chezLeProf.kiosque === false, 'le mode ne s’applique PAS au professeur');
dire(chezLeProf.profilHaut === true, 'et il garde son onglet « Profil »');

// ── 3 · CHEZ L'ÉLÈVE ────────────────────────────────────────────────────────
//
// On retire la marque du professeur plutôt que de rouvrir une seconde sonde :
// c'est cette marque, et elle seule, que `modeKiosque` regarde.
console.log('\n── CHEZ L’ÉLÈVE ──');
await s.page.evaluate(async () => {
    document.body.classList.remove('teacher-mode');
    const m = await import('/js/ui/ecranDeLEleve.js');
    m.appliquerEcranDeLEleve();
});
await dormir(400);
const chezLEleve = await s.page.evaluate(() => {
    const vu = (id) => {
        const e = document.getElementById(id);
        return e ? getComputedStyle(e).display !== 'none' : null;
    };
    return { kiosque: document.body.classList.contains('ecran-kiosque'),
        profilHaut: vu('top-btn-profile'), profilBas: vu('mob-btn-profile') };
});
console.log('  ', JSON.stringify(chezLEleve));
dire(chezLEleve.kiosque === true, 'l’écran de l’élève est rangé');
dire(chezLEleve.profilHaut === false, 'la porte du haut est fermée');
dire(chezLEleve.profilBas === false, 'et celle du bas aussi — sur un téléphone, c’est elle');

// ET LE REFUS EST RÉEL : on demande le profil par le chemin du code.
const refus = await s.page.evaluate(async () => {
    const nav = await import('/js/ui/navigation.js');
    nav.setTopNavMode('profile');
    const p = document.getElementById('view-profile');
    return { profilAffiche: p ? getComputedStyle(p).display !== 'none' : null };
});
console.log('  on demande le profil malgré tout :', JSON.stringify(refus));
dire(refus.profilAffiche === false,
    'la vue « Profil » reste fermée — cacher un bouton ne ferme pas une porte');

// ── 4 · ON REMET L'ÉCRAN DE TOUJOURS ────────────────────────────────────────
await s.page.evaluate(async () => {
    document.body.classList.add('teacher-mode');
    const m = await import('/js/core/espaceProf.js');
    await m.reglagesDuSite({ ecranDeLEleve: '' });
    const e = await import('/js/ui/ecranDeLEleve.js');
    e.appliquerEcranDeLEleve();
});
const remis = await s.page.evaluate(() =>
    document.body.classList.contains('ecran-kiosque'));
dire(remis === false, 'et le réglage s’éteint aussi bien qu’il s’allume');

console.log(`\nerreurs de page : ${s.erreurs.length} · fenêtres natives : ${s.fenetresNatives.length}`);
ko += s.erreurs.length + s.fenetresNatives.length;
for (const e of s.erreurs.slice(0, 4)) console.log('  !', e);
await s.fermer();
console.log(ko === 0 ? '\nL’ÉCRAN SE RANGE, ET SEULEMENT CHEZ L’ÉLÈVE.' : `\n${ko} POINT(S) ROUGE(S).`);
process.exit(ko === 0 ? 0 : 1);
