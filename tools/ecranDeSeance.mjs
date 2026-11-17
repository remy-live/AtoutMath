// L'ÉCRAN DE SÉANCE, SUR LE CHEMIN DE L'ÉLÈVE : l'écran de départ, le plein
// écran, le profil fermé, et ce qui le rouvre.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, le 14 octobre : « est ce que lorsque j'impose une séance, et que l'élève
// découvre la carte du monde je peux forcer le plein écran ? », puis : « oui si
// la séance est imposée et laisse le bouton ».
//
// RÉMY, le 17 novembre : « quand j'impose une séance on pourrait pas mettre une
// popup (en option chèck de base) et quand l'élève valide ça met le parcours
// vraiment en plein écran […] et il ne peut accéder à son profil que si je l'y
// autorise ou qu'il a fini la séance », puis, sur le soir à la maison : « le
// verrou meurt si il a fait la séance ou au moins un bout ».
//
// CETTE SONDE S'APPELAIT `pleinEcranImpose.mjs`. Le plein écran n'est plus
// qu'un tiers de ce que la case commande, et une sonde qui porte le nom d'un
// tiers de son sujet ne se rouvre pas quand il faut.
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
// ── CE QUE LE 17 NOVEMBRE A AJOUTÉ ─────────────────────────────────────────
//
// LE GESTE A CHANGÉ DE PORTE, et c'est le cœur de la correction : le plein
// écran ne part plus au premier appui QUELCONQUE — un doigt posé pour faire
// défiler n'est pas toujours un geste aux yeux du navigateur, et la demande
// échouait alors en silence. Il part du bouton « Commencer » de l'écran de
// départ, qui est le geste le plus propre qui existe.
//
// ET TROIS MESURES DE PLUS, dont aucune ne se lit dans la source :
//
//   · l'écran de départ EXISTE quand la séance s'impose toute seule ;
//   · le profil est FERMÉ — les deux portes, et le refus de route ;
//   · il se ROUVRE sur une étape terminée, sans passer par le réseau.
//
//     node tools/ecranDeSeance.mjs

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as attendre } from 'node:timers/promises';

let serveur = null;
// LE PORT EST LE PREMIER ARGUMENT QUI N'EST PAS UN DRAPEAU. `process.argv[2]`
// tout court attrapait « --photos » et la sonde allait frapper à
// `http://127.0.0.1:--photos/` — une erreur de navigation pour un drapeau.
let PORT = process.argv.slice(2).find(a => !a.startsWith('--'));
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
    // DEUX ÉLÈVES, ET C'EST NÉCESSAIRE : Léo travaille et rouvre son profil
    // par le travail ; Léa ne fait rien, et c'est à elle que Rémy rend le sien.
    // Un seul élève ne permettrait pas de distinguer les deux ouvertures.
    const ap = await apercuDeListe(c.id, 'ROUX Léo;leo.r;2024\nMARTIN Léa;lea.m;2025\n', '');
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
// AU DOIGT, ET NON À LA SOURIS. 390 px de large : c'est la tablette de la
// salle en portrait et le téléphone de l'élève — le seul écran où l'on
// découvre qu'un écran de départ déborde.
const ctxEleve = await n.newContext({ viewport: { width: 390, height: 844 } });
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
        boutonsSortie: document.querySelectorAll('[data-plein-ecran]').length,
        // L'ÉCRAN DE DÉPART, ET LES DEUX PORTES DU PROFIL.
        //
        // On mesure la VISIBILITÉ CALCULÉE et non la présence du nœud : les
        // deux boutons restent dans le DOM, c'est une règle CSS qui les
        // efface — et une sonde qui compterait les nœuds dirait « ouvert »
        // sur un logiciel sain.
        ecranDeDepart: !!document.getElementById('ecran-seance'),
        profilFerme: document.body.classList.contains('seance-profil-ferme'),
        portesVisibles: ['top-btn-profile', 'mob-btn-profile'].filter(id => {
            const b = document.getElementById(id);
            return b && getComputedStyle(b).display !== 'none';
        }).length
    };
});

/** Le profil s'ouvre-t-il VRAIMENT ? On essaie la route, on regarde où on tombe. */
const routeVersLeProfil = async (page) => await page.evaluate(async () => {
    const m = await import('./js/ui/navigation.js');
    m.setTopNavMode('profile');
    const v = document.getElementById('view-profile');
    return !!(v && v.style.display && v.style.display !== 'none');
});

const avant = await etat();
// LA PHOTO, PARCE QU'AUCUNE MESURE NE DIT SI C'EST LISIBLE. `--photos` écrit
// dans `tools/tmp/`, ignoré par git : on la regarde, on ne la garde pas.
if (process.argv.includes('--photos')) {
    await eleve.screenshot({ path: 'tools/tmp/ecran-de-depart.png' });
}
ok('l\'élève reçoit la séance imposée', avant.imposeRecue, JSON.stringify(avant));
ok('et il n\'est PAS encore en plein écran', !avant.pleinEcranClasse);
ok('L\'ÉCRAN DE DÉPART EST LÀ, sans qu\'il ait rien lancé', avant.ecranDeDepart,
    JSON.stringify(avant));
ok('son profil est fermé', avant.profilFerme);
ok('et les DEUX portes du profil sont closes', avant.portesVisibles === 0,
    'portes encore visibles : ' + avant.portesVisibles);
ok('la route elle-même refuse le profil — cacher un bouton ne ferme pas une porte',
    (await routeVersLeProfil(eleve)) === false);

// LE GESTE. Le bouton « Commencer » de l'écran de départ, et lui seul : c'est
// toute la correction du 17 novembre. On le clique comme un élève le touche,
// par Playwright, pour que le navigateur le compte comme un VRAI geste.
await eleve.click('#es-go');
await eleve.waitForTimeout(1200);

const apres = await etat();
if (process.argv.includes('--photos')) {
    await eleve.screenshot({ path: 'tools/tmp/ecran-de-seance.png' });
}
ok('LE PLEIN ÉCRAN PART DU BOUTON « COMMENCER »', apres.pleinEcranClasse,
    JSON.stringify(apres));
ok('et l\'écran de départ s\'efface derrière lui', !apres.ecranDeDepart);
ok('et le bouton pour en SORTIR est là — Rémy : « laisse le bouton »',
    apres.boutonsSortie > 0, 'boutons : ' + apres.boutonsSortie);
console.log('      (plein écran natif du navigateur : '
    + (apres.pleinEcranNatif ? 'accordé' : 'refusé par cet environnement')
    + ' — non exigé, voir l\'en-tête)');

// ── UNE ÉTAPE TERMINÉE REND LE PROFIL, SANS PASSER PAR LE RÉSEAU ──────────
//
// RÉMY : « le verrou meurt si il a fait la séance ou au moins un bout ». C'est
// la mesure qui compte le plus de toute cette sonde, parce que c'est la seule
// qui dise que l'élève peut SORTIR de l'écran de séance par son travail. Et
// l'on vérifie qu'elle ne passe pas par le serveur : on ne synchronise pas, on
// termine l'étape et l'on regarde tout de suite.
console.log('\nUNE ÉTAPE FINIE, ET LE PROFIL REVIENT');
console.log('─'.repeat(64));
await eleve.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    const etapes = (state.studentPath && state.studentPath.steps) || [];
    state.markStudentPathStepCompleted(etapes[0] && etapes[0].stepId);
});
await eleve.waitForTimeout(600);
const fini = await etat();
ok('le profil n\'est plus fermé', !fini.profilFerme, JSON.stringify(fini));
ok('ses deux portes sont revenues', fini.portesVisibles === 2,
    'portes visibles : ' + fini.portesVisibles);
ok('et la route le laisse enfin passer', (await routeVersLeProfil(eleve)) === true);
ok('le plein écran, LUI, RESTE — Rémy : « le profil s\'ouvre, le plein écran reste »',
    fini.pleinEcranClasse);

// ── ET L'AUTORISATION DE RÉMY, QUI N'ATTEND AUCUN TRAVAIL ─────────────────
//
// RÉMY : « il ne peut accéder à son profil que si JE L'Y AUTORISE ou qu'il a
// fini la séance ». Léa n'a rien fait : c'est la seule autre porte.
console.log('\nLÉA N\'A RIEN FAIT, ET RÉMY LUI REND SON PROFIL');
console.log('─'.repeat(64));
const ctxLea = await n.newContext({ viewport: { width: 900, height: 800 } });
const lea = await ctxLea.newPage();
lea.on('pageerror', e => erreurs.push('Léa: ' + String(e).slice(0, 140)));
lea.on('dialog', async d => { erreurs.push('FENÊTRE NATIVE: ' + d.message()); await d.dismiss(); });
await lea.goto(URL);
await lea.waitForFunction(() => window.__atoutmathPret === true, { timeout: 20000 });
await lea.fill('#portail-login', 'lea.m');
await lea.fill('#portail-code-eleve', '2025');
await lea.click('#portail-connecter');
await lea.waitForTimeout(3500);

/** L'état du profil chez Léa, après un battement demandé à la main. */
const chezLea = async () => {
    // ON DEMANDE LE BATTEMENT PLUTÔT QUE DE L'ATTENDRE. Il passe toutes les dix
    // secondes ; une sonde qui dort dix secondes par mesure devient une sonde
    // qu'on ne lance plus. `rafraichirSeance` est la même porte, appelée tout
    // de suite.
    await lea.evaluate(async () => {
        const { rafraichirSeance } = await import('./js/core/sync.js');
        await rafraichirSeance();
    });
    await lea.waitForTimeout(400);
    return await lea.evaluate(() => ({
        ferme: document.body.classList.contains('seance-profil-ferme'),
        portes: ['top-btn-profile', 'mob-btn-profile'].filter(id => {
            const b = document.getElementById(id);
            return b && getComputedStyle(b).display !== 'none';
        }).length
    }));
};

const leaAvant = await chezLea();
ok('sans rien avoir fait, son profil est fermé', leaAvant.ferme, JSON.stringify(leaAvant));

const sonId = await prof.evaluate(async (classId) => {
    const { leDirect } = await import('./js/core/espaceProf.js');
    const d = await leDirect(classId);
    const elle = (d.eleves || []).find(e => (e.prenom || '').includes('Léa'));
    return elle ? elle.id : '';
}, monte.classId);
ok('le direct nomme Léa', !!sonId, 'identifiant : ' + sonId);

await prof.evaluate(async ([classId, sid]) => {
    const { ouvrirLeProfil } = await import('./js/core/espaceProf.js');
    return await ouvrirLeProfil(classId, sid, true);
}, [monte.classId, sonId]);
const leaRendu = await chezLea();
ok('RÉMY LUI REND SON PROFIL, ET IL S\'OUVRE', !leaRendu.ferme, JSON.stringify(leaRendu));
ok('ses deux portes sont là', leaRendu.portes === 2, 'portes : ' + leaRendu.portes);

// ET IL SE REFERME : une autorisation qui ne se reprend pas n'est pas une
// autorisation, c'est un réglage à sens unique.
await prof.evaluate(async ([classId, sid]) => {
    const { ouvrirLeProfil } = await import('./js/core/espaceProf.js');
    return await ouvrirLeProfil(classId, sid, false);
}, [monte.classId, sonId]);
ok('et il se referme quand il le reprend', (await chezLea()).ferme);

// PUIS TOUTE LA CLASSE D'UN COUP — le geste de fin d'heure.
await prof.evaluate(async (classId) => {
    const { ouvrirLesProfils } = await import('./js/core/espaceProf.js');
    return await ouvrirLesProfils(classId, true);
}, monte.classId);
ok('ET LE BOUTON « OUVRIR LES PROFILS » LES REND AUX TRENTE', !(await chezLea()).ferme);
await prof.evaluate(async (classId) => {
    const { ouvrirLesProfils } = await import('./js/core/espaceProf.js');
    return await ouvrirLesProfils(classId, false);
}, monte.classId);
ok('et les referme aussi', (await chezLea()).ferme);

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
console.log(echecs ? `\n${echecs} POINT(S) À REVOIR.`
    : '\nL\'ÉCRAN DE SÉANCE OBÉIT, ET LE TRAVAIL ROUVRE LE PROFIL.');

await n.close();
ranger();
process.exit(echecs || erreurs.length ? 1 : 0);
