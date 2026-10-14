// « JUSTE LA SÉANCE IMPOSÉE FONCTIONNE » — ET LE RESTE DU TEMPS, SON MOT.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « j'aimerai aussi le fait de bloquer les élèves chez eux. C'est à dire
// que juste la séance imposée fonctionne mais par contre si il se connecte, on
// leur dit que pour l'instant ce n'est disponible qu'au collège (je peux mettre
// le message de mon choix) », puis, sur ce qu'il veut vraiment : « Je peux
// choisir qu'il ne puisse avoir accès à rien à la maison pour la simple raison
// que pour le moment je veux suivre ce qu'ils font et voir le debug ».
//
// CE QU'AUCUNE ÉPREUVE DE `npm test` NE PEUT DIRE, et qui est tout l'objet de
// cette sonde : que le réglage posé sur l'écran du PROFESSEUR arrive jusqu'à
// l'écran de l'ÉLÈVE, et qu'il s'en aille quand le professeur impose sa séance.
// Trois morceaux — une case, une colonne de base, un voile — et c'est entre eux
// que les choses se perdent.
//
// DEUX NAVIGATEURS, ET IL EN FAUT DEUX : le professeur et l'élève gardent leur
// identité dans le même stockage, sur la même origine. Un seul onglet pour les
// deux ferait de l'élève un professeur déguisé, c'est-à-dire la seule personne
// pour qui la porte reste toujours ouverte.
//
//   node tools/fermeHorsSeance.mjs
//
import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const vert = (t) => `\x1b[32m${t}\x1b[0m`;
const rouge = (t) => `\x1b[31m${t}\x1b[0m`;
const gris = (t) => `\x1b[90m${t}\x1b[0m`;
let ratés = 0;
const dire = (q, ok, d = '') => { if (!ok) ratés++;
    console.log(`  ${ok ? vert('✓') : rouge('✗')} ${q}${d ? gris(' — ' + d) : ''}`); };

const MOT = 'Rendez-vous au collège : on travaille ensemble en classe.';

const s = await ouvrirSonde({ largeur: 1400, hauteur: 950 });
await s.identifier();
await dormir(1200);

// ── 1. LE PROFESSEUR FERME, DEPUIS SON ÉCRAN ────────────────────────────────
const cliquerTexte = (motif) => s.page.evaluate((m) => {
    const re = new RegExp(m, 'i');
    const b = [...document.querySelectorAll('button, [role="button"], a')]
        .find((x) => re.test((x.textContent || '').trim()));
    if (b) { b.click(); return true; }
    return false;
}, motif);

await cliquerTexte('^la classe$');
await dormir(2500);
await s.page.evaluate(() => {
    const c = [...document.querySelectorAll('*')].find((e) => e.children.length === 0
        && /^6e B$/.test((e.textContent || '').trim()));
    if (c) (c.closest('button, [role="button"], article, li, .card') || c).click();
});
await dormir(2000);

await s.doitExister('[data-maison]', 'la case « Fermé hors séance »');
await s.page.click('[data-maison]');
await s.page.fill('#ec-maison-mot', MOT);
await s.page.click('[data-maison-mot]');
await dormir(1500);
const coche = await s.page.evaluate(() =>
    !!(document.querySelector('[data-maison]') || {}).checked);
dire('la case reste cochée après l\'aller-retour', coche,
    'une case qui se décoche toute seule fait reposer le réglage à chaque heure');
await s.photo('.ec-pilote', 'tools/tmp/ferme-pilote.png');

// ── 2. L'ÉLÈVE ARRIVE, ET LIT SON MOT ───────────────────────────────────────
const ctxEleve = await s.nav.newContext({ viewport: { width: 1100, height: 800 } });
const eleve = await ctxEleve.newPage();
const erreursEleve = [];
eleve.on('pageerror', (e) => erreursEleve.push(String(e).slice(0, 140)));
eleve.on('dialog', async (d) => { erreursEleve.push('FENÊTRE NATIVE: ' + d.message()); await d.dismiss(); });

await eleve.goto(`http://127.0.0.1:${s.port}/index.html`);
await eleve.waitForFunction(() => window.__atoutmathPret === true, { timeout: 20000 });
await eleve.fill('#portail-login', 'tom.b');
await eleve.fill('#portail-code-eleve', '7777');
await eleve.click('#portail-connecter');
await dormir(4000);

/** Ce que l'élève a sous les yeux, et ce qu'il peut atteindre. */
const chezLEleve = () => eleve.evaluate(() => {
    const voile = document.getElementById('eleve-ferme');
    const mot = voile ? (voile.querySelector('.eleve-ecarte-mot') || {}).textContent || '' : '';
    // CE QU'IL PEUT TOUCHER : on interroge le centre de l'écran. Un voile qui
    // existe dans le document mais que rien ne peint laisserait l'application
    // cliquable dessous — c'est exactement ce qu'on vient vérifier.
    const qui = (x, y) => document.elementFromPoint(x, y);
    const au = qui(window.innerWidth / 2, window.innerHeight / 2);
    // ET LA BARRE DU HAUT, QUI N'EST PAS AU CENTRE. Mesurer le milieu de
    // l'écran ne dit rien des onglets « Code », « Parcours » et « Profil » :
    // ils sont posés en haut, et une barre qui resterait cliquable sous le
    // voile ouvrirait tout ce qu'on vient de fermer. Vu sur la photo : elle
    // paraît plus claire que le reste, ce qui ne prouve rien — on demande.
    const barre = [...document.querySelectorAll('.top-nav-tab, #top-btn-path, #btn-role')]
        .filter((e) => e.getBoundingClientRect().width > 2);
    const couverts = barre.filter((e) => {
        const r = e.getBoundingClientRect();
        const sous = qui(r.x + r.width / 2, r.y + r.height / 2);
        return !!(voile && sous && (voile === sous || voile.contains(sous)));
    });
    return {
        voile: !!voile,
        mot: mot.trim(),
        porte: !!document.getElementById('portail'),
        auCentre: au ? (au.id || au.className || au.tagName) : '(rien)',
        souslevoile: !!(voile && au && (voile === au || voile.contains(au))),
        barre: barre.length,
        barreCouverte: couverts.length
    };
});

let vu = await chezLEleve();
console.log('\n\x1b[1mCHEZ L\'ÉLÈVE, SANS SÉANCE IMPOSÉE\x1b[0m');
console.log('   au centre de l\'écran : ' + vu.auCentre);
dire('son billet l\'a fait entrer', !vu.porte, 'il est resté sur la porte');
dire('le voile est là', vu.voile);
dire('et il porte le mot du professeur', vu.mot === MOT, vu.mot || '(rien)');
dire('rien d\'autre n\'est atteignable', vu.souslevoile,
    'le voile existe mais l\'application reste cliquable dessous');
dire(`la barre du haut est couverte (${vu.barreCouverte}/${vu.barre})`,
    vu.barre > 0 && vu.barreCouverte === vu.barre,
    'des onglets restent cliquables au-dessus du voile');
await eleve.screenshot({ path: 'tools/tmp/ferme-eleve.png' });

// ── 3. LE PROFESSEUR IMPOSE SA SÉANCE, ET LA PORTE S'OUVRE ──────────────────
//
// On passe par l'API pour ce geste-là : il est déjà mesuré ailleurs
// (tools/pleinEcranImpose.mjs), et ce qu'on veut voir ici est l'effet chez
// l'élève, pas le chemin de clics du professeur.
const parcours = await s.page.evaluate(async () => {
    const { imposerLaSeance, mesClasses, auServeur } = await import('./js/core/espaceProf.js');
    // `mesClasses` rend la LISTE elle-même, pas un objet qui la contient.
    const cls = await mesClasses();
    const toutes = Array.isArray(cls) ? cls : [];
    const classe = toutes.find((c) => c.name === '6e B') || toutes[0];
    if (!classe) return 'aucune classe';
    // LE SITE D'ESSAI N'A PAS DE PARCOURS AU SERVEUR : on en pose un, comme
    // Rémy le ferait depuis son atelier. C'est l'effet CHEZ L'ÉLÈVE qu'on
    // mesure ici, pas le chemin de clics qui fabrique une séance.
    const fait = await auServeur('/teacher/paths', { action: 'save',
        path: { name: 'Séance d\'essai', steps: [{ stepId: 's1', exerciseId: 'calc-add' }] } });
    const id = fait.pathId;
    if (!id) return 'aucun parcours';
    await imposerLaSeance(classe.id, id, false);
    return 'Séance d\'essai';
});
console.log('\n\x1b[1mLE PROFESSEUR IMPOSE\x1b[0m  ' + parcours);

// L'élève redemande sa séance toutes les dix secondes : on attend un battement.
await dormir(13000);
vu = await chezLEleve();
console.log('   au centre de l\'écran : ' + vu.auCentre);
dire('le voile est parti tout seul', !vu.voile,
    'il faut recharger la page, ce que l\'élève ne fera pas');

console.log(`\nerreurs de page : ${s.erreurs.length + erreursEleve.length}`
    + ` · fenêtres natives : ${s.fenetresNatives.length}`);
[...s.erreurs, ...erreursEleve].slice(0, 4).forEach((e) => console.log('   ' + e));
await ctxEleve.close();
await s.fermer();
const sale = ratés || s.erreurs.length || erreursEleve.length || s.fenetresNatives.length;
console.log(sale ? rouge(`\n${ratés} mesure(s) en échec.`)
    : vert('\nFermé hors séance, ouvert pendant.'));
process.exit(sale ? 1 : 0);
