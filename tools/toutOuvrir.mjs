// « TOUT OUVRIR » DEPUIS LE DIRECT — le professeur appuie, l'élève voit.
//
//   node tools/toutOuvrir.mjs
//
// Rémy, 27 novembre : « quand on est en direct, les élèves font leur exercice
// et j'aimerais par exemple 10 minutes avant la fin ouvrir tous les
// exercices ».
//
// Deux navigateurs, le chemin de chacun :
//   · le PROFESSEUR ouvre « La classe », la 6e B, « Le direct », et appuie sur
//     « 🔓 Tout ouvrir » ;
//   · l'ÉLÈVE (tom.b) s'est connecté par la porte. Avant : le catalogue est
//     caché (le site n'est pas en libre accès). Après le battement : il
//     apparaît, et un mot le lui dit. Puis le professeur referme, et le
//     catalogue se cache de nouveau.
// La sonde exige aussi que la séance imposée ne retienne plus l'élève
// pendant l'ouverture (plus de plein écran forcé ni de profil fermé).

import { ouvrirSonde } from './sonde.mjs';
import { setTimeout as dormir } from 'node:timers/promises';

const echecs = [];
const exiger = (vrai, quoi, detail = '') => {
    if (!vrai) echecs.push(quoi);
    console.log(`  ${vrai ? '✓' : '✗'} ${quoi}${detail ? ` — ${detail}` : ''}`);
};

const s = await ouvrirSonde({ largeur: 1400, hauteur: 950 });
let ctx = null;
try {
    await s.identifier();
    await dormir(1200);

    // UNE VRAIE SÉANCE IMPOSÉE, AVEC L'ÉCRAN DE SÉANCE : c'est elle qui retient
    // l'élève, et c'est elle que « Tout ouvrir » doit relâcher. Sans elle, la
    // vérification plus bas comparerait des vides — vu au premier essai.
    const impose = await s.page.evaluate(async () => {
        const { mesClasses, auServeur, imposerLaSeance } = await import('./js/core/espaceProf.js');
        const { identiteDeParcours } = await import('./js/core/shortcodes.js');
        const { makePath, makeStep } = await import('./js/core/path.js');
        const { defaultPolicy } = await import('./js/core/policy.js');
        const r = await mesClasses();
        const c = ((r && r.classes) || r || []).find((x) => /6e B/.test(x.name || ''));
        const p = makePath('Séance de l\'heure', [makeStep('calc-add', {}, { stepId: 'a', nbItems: 3, threshold: 1 })], defaultPolicy());
        const enr = await auServeur('/teacher/paths', { action: 'save', path: { ...p, id: identiteDeParcours(p) } });
        await auServeur('/teacher/assign', { pathId: enr.pathId, classId: c.id });
        const imp = await imposerLaSeance(c.id, enr.pathId, true);
        return { ok: !!(imp && !imp.erreur), erreur: (imp && imp.erreur) || '' };
    });
    exiger(impose.ok, 'une séance est imposée à la 6e B, avec l\'écran de séance', impose.erreur);

    // ── L'ÉLÈVE ARRIVE PAR LA PORTE ─────────────────────────────────────────
    ctx = await s.nav.newContext({ viewport: { width: 1100, height: 800 } });
    const eleve = await ctx.newPage();
    const erreursEleve = [];
    eleve.on('pageerror', (e) => erreursEleve.push(String(e).slice(0, 140)));
    eleve.on('dialog', async (d) => { erreursEleve.push('FENÊTRE NATIVE'); await d.dismiss(); });
    await eleve.goto(`http://127.0.0.1:${s.port}/index.html`);
    await eleve.waitForFunction(() => window.__atoutmathPret === true, { timeout: 20000 });
    await eleve.fill('#portail-login', 'tom.b');
    await eleve.fill('#portail-code-eleve', '7777');
    await eleve.click('#portail-connecter');
    await dormir(4000);
    const catalogueCache = () => eleve.evaluate(() => document.body.classList.contains('sans-mode-libre'));
    const avant = await catalogueCache();
    const retenu = await eleve.evaluate(async () => {
        const m = await import('./js/core/seanceDistante.js');
        const imp = m.seanceImposee();
        return imp ? { pleinEcran: imp.pleinEcran, profilFerme: imp.profilFerme } : null;
    });
    exiger(!!retenu && retenu.pleinEcran && retenu.profilFerme,
        'avant, la séance imposée retient l\'élève (plein écran, profil fermé)', JSON.stringify(retenu));
    exiger(avant, 'avant, le catalogue est caché à l\'élève (le site n\'est pas en libre accès)');

    // ── LE PROFESSEUR, SUR SON DIRECT ───────────────────────────────────────
    await s.doitExister('#top-btn-classe', 'la porte « Mes classes »');
    await s.page.click('#top-btn-classe');
    await dormir(2500);
    await s.page.evaluate(() => {
        const nom = [...document.querySelectorAll('#ec-racine [data-ouvrir] .ec-carte-nom')]
            .find((e) => /6e B/.test(e.textContent || ''));
        if (nom) nom.click();
    });
    await dormir(1800);
    await s.doitExister('#ec-racine [data-onglet="direct"]', 'l\'onglet « Le direct »');
    await s.page.click('#ec-racine [data-onglet="direct"]');
    await dormir(1800);
    await s.doitExister('[data-tout-ouvrir="1"]', 'le bouton « Tout ouvrir »');
    await s.doitExister('#ec-tout-minutes', 'la durée à côté du bouton');
    await s.page.selectOption('#ec-tout-minutes', '10');
    await s.page.click('[data-tout-ouvrir="1"]');
    await dormir(1500);
    const libelle = await s.page.evaluate(() =>
        (document.querySelector('[data-tout-ouvrir]') || {}).textContent || '');
    exiger(/Refermer/.test(libelle) && /jusqu'à \d+ h \d\d/.test(libelle),
        'le bouton dit qu\'on peut refermer, et jusqu\'à quelle heure c\'est ouvert', libelle.replace(/\s+/g, ' ').trim());
    await s.photo('.ec-pilote-rangee', 'tools/tmp/tout-ouvrir-prof.png');

    // ── CHEZ L'ÉLÈVE, AU BATTEMENT SUIVANT (dix secondes au plus) ──────────
    let ouvert = false;
    for (let i = 0; i < 16 && !ouvert; i++) { await dormir(1000); ouvert = !(await catalogueCache()); }
    exiger(ouvert, 'chez l\'élève, le catalogue apparaît');
    const mot = await eleve.evaluate(() =>
        [...document.querySelectorAll('#toast-container *')].map(e => e.textContent).join(' '));
    exiger(/Tous les exercices sont ouverts pendant 10 minutes/.test(mot), 'un mot le dit à l\'élève', mot.slice(0, 90));
    const etat = await eleve.evaluate(async () => {
        const m = await import('./js/core/seanceDistante.js');
        const imp = m.seanceImposee();
        return { reste: m.resteOuvert(), verrou: m.estVerrouille(),
            pleinEcran: imp ? imp.pleinEcran : null, profilFerme: imp ? imp.profilFerme : null };
    });
    exiger(etat.reste > 540 && etat.reste <= 600, 'l\'ardoise sait combien de temps il reste', `${etat.reste} s`);
    exiger(etat.pleinEcran === false && etat.profilFerme === false,
        'la séance imposée est toujours là, mais ne retient plus l\'élève', JSON.stringify(etat));

    // ── LE PROFESSEUR REFERME ───────────────────────────────────────────────
    await s.page.click('[data-tout-ouvrir="0"]');
    await dormir(1200);
    exiger(await s.page.evaluate(() => !!document.querySelector('[data-tout-ouvrir="1"]')),
        'le bouton redevient « Tout ouvrir »');
    let referme = false;
    for (let i = 0; i < 16 && !referme; i++) { await dormir(1000); referme = await catalogueCache(); }
    exiger(referme, 'chez l\'élève, le catalogue se cache de nouveau');

    exiger(!s.erreurs.length && !erreursEleve.length, 'erreurs de page : 0',
        [...s.erreurs, ...erreursEleve].join(' | '));
    exiger(!s.fenetresNatives.length, 'aucune fenêtre native');
} finally {
    if (ctx) await ctx.close();
    await s.fermer();
}
if (echecs.length) { console.log(`\nÉCHEC : ${echecs.length}`); process.exit(1); }
console.log('\nTOUT S\'OUVRE ET SE REFERME DEPUIS LE DIRECT.');
