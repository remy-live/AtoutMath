// LE PLEIN ÉCRAN PART-IL AU PREMIER APPUI D'UNE SÉANCE IMPOSÉE ?
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « est ce que lorsque j'impose une séance, et que l'élève découvre la
// carte du monde je peux forcer le plein écran ? », puis : « oui si la séance
// est imposée et laisse le bouton ».
//
// ── POURQUOI UNE SONDE, ET NON UNE ÉPREUVE DE SOURCE ───────────────────────
//
// Le risque de cette correction est un ÉCHEC SILENCIEUX, et c'est le pire du
// dépôt : `pleinEcranSiSeanceImposee` compare l'identité du parcours qu'on
// ouvre à celle du parcours imposé. Si les deux ne coïncident jamais — un
// `normalizePath` qui ne normalise pas pareil, un nom qui diffère —, la
// fonction rend `false`, personne ne rougit, aucune erreur n'apparaît, et le
// plein écran ne part tout simplement jamais. Une lecture de source ne peut pas
// le voir : elle lirait un appel bien placé qui ne fait rien.
//
// ON MONTE DONC TOUT : un serveur PHP, une base neuve, un professeur qui impose
// sa séance, et un élève sur un autre poste qui appuie sur son bouton.
//
// ── CE QU'ELLE MESURE, ET CE QU'ELLE NE PEUT PAS MESURER ───────────────────
//
// Elle mesure la classe `body.plein-ecran`, que `basculerPleinEcran` pose
// SYNCHRONEMENT — donc notre décision, celle dont on vient de changer le code.
// Elle regarde aussi `document.fullscreenElement`, mais ne le réclame pas : un
// navigateur sans tête peut refuser le plein écran natif pour ses propres
// raisons, et exiger ce que l'environnement ne donne pas ferait une sonde qui
// crie au défaut sur du code sain.
//
// ET ELLE MESURE AUSSI LE CONTRAIRE, parce qu'une mesure qui ne regarde que ce
// qu'on a corrigé ne voit pas ce qu'on a cassé : séance NON imposée, le même
// appui ne doit RIEN déclencher.
//
//     node tools/pleinEcranImpose.mjs

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as attendre } from 'node:timers/promises';

let serveur = null;
let PORT = process.argv[2];
if (!PORT) {
    PORT = String(8800 + Math.floor(Math.random() * 300));
    serveur = spawn('php', ['tools/siteEssai.php', PORT], { stdio: ['ignore', 'pipe', 'pipe'] });
    await new Promise((pret, rate) => {
        const minuteur = setTimeout(() => rate(new Error('le site d\'essai n\'a pas démarré')), 30000);
        serveur.stdout.on('data', (d) => {
            if (String(d).includes('"port"')) { clearTimeout(minuteur); pret(); }
        });
        serveur.on('error', rate);
    });
    await attendre(400);
}
const URL = `http://127.0.0.1:${PORT}/index.html`;
const ranger = () => { if (serveur) { try { serveur.kill(); } catch (e) { /* déjà parti */ } } };

const n = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const erreurs = [];
let echecs = 0;
const ok = (quoi, vrai, detail = '') => {
    if (!vrai) echecs++;
    console.log((vrai ? '  ok   ' : '  NON  ') + quoi + (detail ? '  — ' + detail : ''));
};

// ── LE PROFESSEUR : sa classe, son parcours, et il l'IMPOSE ────────────────
const ctxProf = await n.newContext({ viewport: { width: 1320, height: 900 } });
const prof = await ctxProf.newPage();
prof.on('pageerror', e => erreurs.push('prof: ' + String(e).slice(0, 140)));
prof.on('dialog', async d => { erreurs.push('FENÊTRE NATIVE: ' + d.message()); await d.dismiss(); });

await prof.goto(URL);
await prof.waitForFunction(() => window.__atoutmathPret === true, { timeout: 20000 });
await prof.evaluate(async () => {
    const { identifierProf } = await import('./js/core/verrouProf.js');
    return await identifierProf('remy@essai.test', 'motdepassetreslong');
});
await prof.reload();
await prof.waitForFunction(() => window.__atoutmathPret === true, { timeout: 20000 });

const monte = await prof.evaluate(async () => {
    const { creerClasse, apercuDeListe, importerListe, auServeur, imposerLaSeance } =
        await import('./js/core/espaceProf.js');
    const { Shortcodes, identiteDeParcours } = await import('./js/core/shortcodes.js');
    const { makePath, makeStep } = await import('./js/core/path.js');
    const { defaultPolicy } = await import('./js/core/policy.js');

    const c = await creerClasse('Plein écran', '6e');
    const ap = await apercuDeListe(c.id, 'ROUX Léo;leo.r;2024\n', '');
    await importerListe(c.id, ap.apercu.texte);

    const parcours = makePath('Séance imposée', [
        makeStep('calc-add', {}, { stepId: 'a', nbItems: 2, threshold: 1 })
    ], defaultPolicy());
    const enr = await auServeur('/teacher/paths',
        { action: 'save', path: { ...parcours, id: identiteDeParcours(parcours) } });
    await auServeur('/teacher/assign', { pathId: enr.pathId, classId: c.id });
    const imp = await imposerLaSeance(c.id, enr.pathId, true);
    return { classId: c.id, pathId: enr.pathId, impose: imp && !imp.erreur,
             erreur: (imp && imp.erreur) || '' };
});
ok('le professeur impose sa séance à la classe', monte.impose, monte.erreur);

// ── L'ÉLÈVE, SUR UN AUTRE POSTE ───────────────────────────────────────────
const ctxEleve = await n.newContext({ viewport: { width: 900, height: 800 } });
const eleve = await ctxEleve.newPage();
eleve.on('pageerror', e => erreurs.push('élève: ' + String(e).slice(0, 140)));
eleve.on('dialog', async d => { erreurs.push('FENÊTRE NATIVE: ' + d.message()); await d.dismiss(); });

await eleve.goto(URL);
await eleve.waitForFunction(() => window.__atoutmathPret === true, { timeout: 20000 });
await eleve.fill('#portail-login', 'leo.r');
await eleve.fill('#portail-code-eleve', '2024');
await eleve.click('#portail-connecter');
await eleve.waitForTimeout(3500);

/** Ce que l'élève a sous les yeux, et où en est le plein écran. */
const etat = async () => await eleve.evaluate(async () => {
    const { seanceImposee } = await import('./js/core/seanceDistante.js');
    const { state } = await import('./js/core/state.js');
    const imp = seanceImposee();
    return {
        imposeRecue: !!(imp && imp.path),
        parcoursCharge: state.studentPath ? state.studentPath.pathId : null,
        // LES VRAIS CROCHETS, LUS DANS `ui/pathView.js` ET NON DEVINÉS.
        // La première écriture de cette sonde cherchait `.path-step` et
        // `.path-pastille` : des sélecteurs inventés, qui rendent « rien à
        // toucher » — c'est-à-dire la même réponse qu'un logiciel cassé.
        //
        //   · `.world-map-play` : le bouton « Jouer : <titre> » de la carte,
        //     celui que l'élève a sous le doigt quand sa séance est chargée ;
        //   · `.path-ouvrir-seance` : « Commencer ma séance », quand AUCUN
        //     parcours n'est encore chargé.
        bouton: !!document.querySelector('.world-map-play, .path-ouvrir-seance'),
        etapes: document.querySelectorAll('.world-map-play, .salle-jeu').length,
        pleinEcranClasse: document.body.classList.contains('plein-ecran'),
        pleinEcranNatif: !!document.fullscreenElement,
        boutonsSortie: document.querySelectorAll('[data-plein-ecran]').length
    };
});

const avant = await etat();
ok('l\'élève reçoit la séance imposée', avant.imposeRecue, JSON.stringify(avant));
ok('et il n\'est PAS encore en plein écran', !avant.pleinEcranClasse);

// LE GESTE. On clique ce que l'élève a sous le doigt — le bouton de la carte
// s'il est là, sinon la première étape. Les deux passent par `launchAssigned`.
const clique = await eleve.evaluate(() => {
    const jouer = document.querySelector('.world-map-play');
    if (jouer) { jouer.click(); return 'Jouer (carte)'; }
    const b = document.querySelector('.path-ouvrir-seance');
    if (b) { b.click(); return 'Commencer ma séance'; }
    const j = document.querySelector('.salle-jeu');
    if (j) { j.click(); return 'salle de jeux'; }
    return null;
});
ok('il a quelque chose à toucher sur sa carte', !!clique, String(clique));
await eleve.waitForTimeout(1800);

const apres = await etat();
ok('LE PLEIN ÉCRAN PART À SON PREMIER APPUI', apres.pleinEcranClasse,
    JSON.stringify(apres));
ok('et le bouton pour en SORTIR est là — Rémy : « laisse le bouton »',
    apres.boutonsSortie > 0, 'boutons : ' + apres.boutonsSortie);
console.log('      (plein écran natif du navigateur : '
    + (apres.pleinEcranNatif ? 'accordé' : 'refusé par cet environnement')
    + ' — non exigé, voir l\'en-tête)');

// ── ET LE CONTRAIRE : LA CASE DÉCOCHÉE ────────────────────────────────────
//
// C'EST LA MESURE QUI COMPTE DEPUIS QUE RÉMY A DEMANDÉ UN RÉGLAGE : « après
// peut être vaut il mieux le mettre en paramètre ». La séance reste imposée —
// seule la case change. Un réglage qui ne retient rien est pire qu'un réglage
// absent : il donne l'illusion du choix.
console.log('\nSÉANCE IMPOSÉE MAIS CASE DÉCOCHÉE : RIEN NE DOIT PARTIR');
console.log('─'.repeat(64));
const decoche = await prof.evaluate(async ([classId, pathId]) => {
    const { imposerLaSeance } = await import('./js/core/espaceProf.js');
    const r = await imposerLaSeance(classId, pathId, false);
    return { pleinEcran: r && r.pleinEcran, erreur: (r && r.erreur) || '' };
}, [monte.classId, monte.pathId]);
ok('le serveur retient que la case est décochée', decoche.pleinEcran === false,
    JSON.stringify(decoche));

const ctxLibre = await n.newContext({ viewport: { width: 900, height: 800 } });
const libre = await ctxLibre.newPage();
libre.on('pageerror', e => erreurs.push('élève libre: ' + String(e).slice(0, 140)));
await libre.goto(URL);
await libre.waitForFunction(() => window.__atoutmathPret === true, { timeout: 20000 });
await libre.fill('#portail-login', 'leo.r');
await libre.fill('#portail-code-eleve', '2024');
await libre.click('#portail-connecter');
await libre.waitForTimeout(3500);

const sansImpose = await libre.evaluate(async () => {
    const { seanceImposee } = await import('./js/core/seanceDistante.js');
    const imp = seanceImposee();
    const b = document.querySelector('.world-map-play')
        || document.querySelector('.path-ouvrir-seance')
        || document.querySelector('.salle-jeu');
    if (b) b.click();
    return {
        imposeRecue: !!(imp && imp.path),
        pleinEcranDemande: !!(imp && imp.pleinEcran),
        aCliqué: !!b
    };
});
await libre.waitForTimeout(1500);
const finLibre = await libre.evaluate(() => ({
    pleinEcranClasse: document.body.classList.contains('plein-ecran'),
    pleinEcranNatif: !!document.fullscreenElement
}));
ok('la séance est toujours imposée, mais sans plein écran',
    sansImpose.imposeRecue && !sansImpose.pleinEcranDemande, JSON.stringify(sansImpose));
ok('ET LE PLEIN ÉCRAN NE PART PAS', !finLibre.pleinEcranClasse, JSON.stringify(finLibre));

// ── Le verdict ────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(64));
console.log('fenêtres natives et erreurs de page : ' + erreurs.length);
for (const e of erreurs.slice(0, 5)) console.log('  · ' + e);
console.log(echecs ? `\n${echecs} POINT(S) À REVOIR.` : '\nLE PLEIN ÉCRAN OBÉIT À LA SÉANCE IMPOSÉE.');

await n.close();
ranger();
process.exit(echecs || erreurs.length ? 1 : 0);
