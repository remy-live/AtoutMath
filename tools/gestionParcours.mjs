// LE GESTIONNAIRE DE PARCOURS — cocher, ranger, jeter, ressortir.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « il me faudrait clairement un gestionnaire de parcours pour en
// sélectionner plusieurs les trier les classer car là du coup on a tout
// retrouvé. Supprimer en bloc, mettre dans la corbeille. »
//
// CE QUE SEULE UNE SONDE PEUT DIRE : que cocher ne déclenche pas l'ouverture du
// parcours (la case est DANS la ligne, et la ligne est un bouton), que la barre
// n'apparaît qu'à partir d'une case, que le geste en bloc fait UN aller-retour
// et non trente, que l'ordre choisi change vraiment l'ordre affiché — et que ce
// qui est jeté ne revient pas au rechargement, ce qui est tout l'objet.
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const s = await ouvrirSonde({ largeur: 1400, hauteur: 950 });
let ratés = 0;
const dire = (q, ok, d = '') => {
    if (!ok) ratés++;
    console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${q}${d ? ' — ' + d : ''}`);
};

await s.identifier();
await dormir(1500);
await s.page.click('#top-btn-preparer');
await dormir(1200);

// ON CLIQUE L'ONGLET « Parcours », ET SURTOUT PAS `montrerPanneau` À LA MAIN.
//
// DEUX MESURES PERDUES AVANT DE COMPRENDRE. Appeler `montrerPanneau` déplie
// bien le panneau — et n'affiche AUCUN parcours : la liste n'est dessinée que
// par le rappel `auRendu` que `initTiroirOnglets` déclenche SUR LE CLIC (voir
// `js/ui/tiroirParcours.js`). La sonde voyait donc un panneau ouvert, un
// `<select>` visible, et zéro ligne — c'est-à-dire un écran qui n'existe que
// pour elle. Le témoin l'a dit : même « Parcours découverte », présent depuis
// le premier démarrage, manquait.
await s.page.click('[data-tiroir="parcours"]');
await dormir(900);

// ── TROIS PARCOURS AUX NOMS ET AUX TAILLES CONNUS ───────────────────────────
//
// Les dates sont posées à la main : une sonde qui attend une seconde entre deux
// enregistrements mesure sa propre lenteur, et trois parcours créés dans la
// même milliseconde ne se trient pas.
console.log('\n\x1b[1mTROIS PARCOURS À RANGER\x1b[0m');
await s.page.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    const { makePath, makeStep } = await import('./js/core/path.js');
    const { politiquePerso } = await import('./js/core/mesExercices.js');
    const poser = (nom, combien, quand) => {
        const pas = Array.from({ length: combien }, (_, i) =>
            makeStep('calc-add', {}, { stepId: 's' + i, nbItems: 4 }));
        const e = state.saveTeacherPath(nom, makePath(nom, pas, politiquePerso()));
        e.timestamp = quand;
    };
    poser('Zèbre du mardi', 3, Date.now() - 1000);
    poser('Alpha des fractions', 1, Date.now() - 90 * 86400000);
    poser('Mimosa', 2, Date.now() - 3 * 86400000);
    state.saveTeacherPaths();
});
// ON REDESSINE PAR LA PORTE DE L'ÉCRAN : un clic sur l'onglet, qui est
// exactement ce que fait Rémy en revenant à sa bibliothèque.
await s.page.click('[data-tiroir="exercices"]');
await s.page.click('[data-tiroir="parcours"]');
await dormir(800);

/** Les noms affichés, dans l'ordre de l'écran. */
const noms = () => s.page.evaluate(() =>
    [...document.querySelectorAll('#path-browser-list .path-browser-name')]
        .map((e) => e.textContent.trim()));

// ── L'ORDRE CHOISI CHANGE L'ORDRE AFFICHÉ ───────────────────────────────────
console.log('\n\x1b[1mLES RANGEMENTS\x1b[0m');
const ordres = {};
for (const o of ['recent', 'ancien', 'nom', 'taille']) {
    await s.page.selectOption('#pb-ordre', o);
    await dormir(500);
    ordres[o] = (await noms()).filter((n) => /Zèbre|Alpha|Mimosa/.test(n));
    console.log(`   ${o.padEnd(7)} ${ordres[o].join(' · ')}`);
}
dire('« du plus récent » met le plus récent en tête',
    ordres.recent[0] === 'Zèbre du mardi', ordres.recent[0]);
dire('« du plus ancien » le retourne',
    ordres.ancien[0] === 'Alpha des fractions', ordres.ancien[0]);
dire('« par nom » range par ordre alphabétique',
    ordres.nom.join('|') === 'Alpha des fractions|Mimosa|Zèbre du mardi', ordres.nom.join(' · '));
dire('« du plus petit » met le parcours d\'une activité en tête',
    ordres.taille[0] === 'Alpha des fractions', ordres.taille[0]);
// ET L'EN-TÊTE DIT L'ORDRE : une liste dont le titre ment, on cherche en bas ce
// qui est en haut.
const titre = await s.page.evaluate(() =>
    (document.querySelector('#path-browser-list .path-section-title, '
        + '#path-browser-list .path-browser-root > *') || {}).textContent || '');
dire('et l\'en-tête annonce le rangement choisi', /petit/i.test(titre), titre.trim().slice(0, 48));

// ── COCHER ──────────────────────────────────────────────────────────────────
console.log('\n\x1b[1mCOCHER, SANS OUVRIR\x1b[0m');
await s.page.selectOption('#pb-ordre', 'nom');
await dormir(500);
const avantOuvert = await s.page.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    return state.currentPathId || '';
});
const barreAvant = await s.page.evaluate(() =>
    (document.getElementById('pb-selection') || {}).hidden);
dire('la barre des cochés est cachée tant que rien n\'est coché', barreAvant === true);

// On coche les deux premiers — Alpha et Mimosa.
await s.page.evaluate(() => {
    const cases = [...document.querySelectorAll('#path-browser-list .pb-choix')];
    cases[0].click(); cases[1].click();
});
await dormir(500);
const apresCoche = await s.page.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    const barre = document.getElementById('pb-selection');
    return {
        cache: barre.hidden,
        dit: (barre.querySelector('[data-pb-combien]') || {}).textContent || '',
        ouvert: state.currentPathId || '',
        marquees: document.querySelectorAll('.path-browser-item--coche').length
    };
});
dire('la barre apparaît et dit combien', !apresCoche.cache && /2 parcours/.test(apresCoche.dit),
    apresCoche.dit);
dire('COCHER N\'OUVRE PAS LE PARCOURS', apresCoche.ouvert === avantOuvert,
    apresCoche.ouvert ? 'un parcours s\'est ouvert' : 'aucun');
dire('les deux lignes cochées se voient', apresCoche.marquees === 2,
    String(apresCoche.marquees));

// ── JETER EN BLOC ───────────────────────────────────────────────────────────
console.log('\n\x1b[1mJETER EN BLOC\x1b[0m');
await s.page.click('[data-pb-jeter]');
await dormir(800);
if (s.erreurs.length) {
    console.log('   \x1b[31merreurs de page pendant le geste :\x1b[0m');
    s.erreurs.forEach((e) => console.log('     ' + e));
}
// ON LIT LA FENÊTRE VISIBLE, pas une classe devinée.
//
// `.modal-title` ne porte pas le titre d'une confirmation — onzième sélecteur
// inventé de ce chantier. La fenêtre s'ouvrait parfaitement ; la sonde
// annonçait « on ne demande pas avant de jeter », ce qui était faux ET
// inquiétant. Les deux crochets employés ici sont LUS dans `js/ui/modal.js` :
// `.modal-overlay` pour la fenêtre, `.confirm-ok-btn` pour le bouton qui
// confirme.
const demande = await s.page.evaluate(() =>
    [...document.querySelectorAll('.modal-overlay')]
        .filter((e) => e.getBoundingClientRect().width > 0)
        .map((e) => e.textContent.replace(/\s+/g, ' ').trim().slice(0, 90)));
dire('on demande avant de jeter', demande.some((t) => /corbeille/i.test(t)),
    demande.join(' · ').slice(0, 70) || '(aucune fenêtre)');
await s.page.click('.confirm-ok-btn');
await dormir(1800);
let restants = (await noms()).filter((n) => /Zèbre|Alpha|Mimosa/.test(n));
dire('les deux ont quitté la liste', restants.length === 1 && restants[0] === 'Zèbre du mardi',
    restants.join(' · ') || '(liste vide)');
const compteur = await s.page.evaluate(() => {
    const b = document.getElementById('btn-corbeille');
    return { cache: b.hidden, dit: b.textContent.replace(/\s+/g, ' ').trim() };
});
dire('le bouton de la corbeille s\'affiche, avec son compte',
    !compteur.cache && /\(2\)/.test(compteur.dit), compteur.dit);

// ── ILS NE REVIENNENT PAS ───────────────────────────────────────────────────
console.log('\n\x1b[1mLE LENDEMAIN MATIN\x1b[0m');
await s.page.reload();
await s.page.waitForFunction(() => window.__atoutmathPret === true, { timeout: 30000 });
await dormir(6000);
const auReveil = await s.page.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    return state.teacherPaths.map((p) => p.name);
});
dire('LES PARCOURS JETÉS NE REVIENNENT PAS',
    !auReveil.includes('Alpha des fractions') && !auReveil.includes('Mimosa'),
    auReveil.filter((n) => /Zèbre|Alpha|Mimosa/.test(n)).join(' · ') || '(aucun des trois)');
dire('et celui qu\'on a gardé est toujours là', auReveil.includes('Zèbre du mardi'));

// ── LES RESSORTIR ───────────────────────────────────────────────────────────
console.log('\n\x1b[1mLES RESSORTIR DE LA CORBEILLE\x1b[0m');
await s.page.click('#top-btn-preparer');
await dormir(1200);
const dedans = await s.page.evaluate(async () => {
    const { laCorbeille } = await import('./js/core/parcoursServeur.js');
    const c = await laCorbeille();
    return { noms: (c.parcours || []).map((p) => p.name), jours: c.jours };
});
console.log(`   la corbeille contient : ${JSON.stringify(dedans.noms)}`);
dire('les deux y sont', dedans.noms.length === 2);
dire('et le serveur dit combien de jours il les garde', dedans.jours === 30, String(dedans.jours));

const remis = await s.page.evaluate(async () => {
    const { sortirDeLaCorbeille, laCorbeille } = await import('./js/core/parcoursServeur.js');
    const c = await laCorbeille();
    const alpha = (c.parcours || []).find((p) => /Alpha/.test(p.name));
    await sortirDeLaCorbeille([alpha.id]);
    const { state } = await import('./js/core/state.js');
    return state.teacherPaths.map((p) => p.name);
});
dire('UN PARCOURS RESSORTI REVIENT DANS LA BIBLIOTHÈQUE',
    remis.includes('Alpha des fractions'), remis.join(' · '));

console.log(`\nerreurs de page : ${s.erreurs.length} · fenêtres natives : ${s.fenetresNatives.length}`);
s.erreurs.slice(0, 4).forEach((e) => console.log('   ' + e));
if (s.erreurs.length || s.fenetresNatives.length) ratés++;

console.log(ratés
    ? `\n\x1b[31m${ratés} RATÉ(S)\x1b[0m`
    : '\n\x1b[32mON COCHE, ON RANGE, ON JETTE — ET CE QUI EST JETÉ NE REVIENT PAS.\x1b[0m');
await s.fermer();
process.exit(ratés ? 1 : 0);
