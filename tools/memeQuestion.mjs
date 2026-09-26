// LE PROFESSEUR VOIT-IL LA MÊME QUESTION QUE SON ÉLÈVE ?
//
// Rémy : « on ne peut jamais vraiment voir l'écran de l'élève, juste son
// exercice, car c'est créé de façon aléatoire. »
//
// C'est la seule mesure qui répond à cette phrase, et elle ne peut pas se faire
// sans navigateur : il y a deux pages, un serveur entre les deux, un battement
// de cœur toutes les dix secondes, et un bouton à cliquer. Un essai unitaire
// dirait que la graine est bien recopiée d'un objet à l'autre ; il ne dirait
// jamais que les deux écrans portent le même énoncé.
//
//     node tools/memeQuestion.mjs
//
// On garde cette sonde — ce qu'elle mesure, on voudra le remesurer à chaque
// fois qu'on touchera au relevé d'écran, au direct ou aux graines.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as attendre } from 'node:timers/promises';

const PORT = String(8600 + Math.floor(Math.random() * 150));
const srv = spawn('php', ['tools/siteEssai.php', PORT], { stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((ok, ko) => {
    const t = setTimeout(() => ko(new Error('le site d\'essai n\'a pas démarré')), 30000);
    srv.stdout.on('data', d => { if (String(d).includes('"port"')) { clearTimeout(t); ok(); } });
    srv.on('error', ko);
});
await attendre(400);

const BASE = `http://127.0.0.1:${PORT}`;
const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const soucis = [];
const ok = (q, v, d = '') => {
    console.log((v ? '  ok   ' : '  NON  ') + q + (d ? '  — ' + d : ''));
    if (!v) process.exitCode = 1;
};

// L'EXERCICE CHOISI EST UN EXERCICE À QUESTIONS GÉNÉRÉES, et c'est le cas qui
// nous intéresse : c'est lui que Rémy décrit — « créé de façon aléatoire ».
const EXO = 'calc-prio';

console.log('\nLE PROFESSEUR ET SON ÉLÈVE, DEVANT LA MÊME QUESTION');
console.log('─'.repeat(64));

async function pretE(page) {
    await page.waitForFunction(() => window.__atoutmathPret === true, { timeout: 20000 });
}

// ─────────────────────────────────── LE PROFESSEUR MONTE SA CLASSE ──────────

const prof = await nav.newPage({ viewport: { width: 1500, height: 1000 } });
prof.on('pageerror', e => soucis.push('prof: ' + String(e).slice(0, 200)));
prof.on('dialog', async (d) => { soucis.push('FENÊTRE NATIVE: ' + d.message()); await d.dismiss(); });
await prof.goto(`${BASE}/index.html`);
await pretE(prof);
await prof.evaluate(async () => {
    const { identifierProf } = await import('./js/core/verrouProf.js');
    await identifierProf('remy@essai.test', 'motdepassetreslong');
});
// UNE SONDE S'IDENTIFIE PUIS RECHARGE : sans le rechargement, la page garde
// l'état d'avant l'identification et l'on mesure un écran d'inconnu.
await prof.reload();
await pretE(prof);

const classe = await prof.evaluate(async () => {
    const { creerClasse, apercuDeListe, importerListe, listeDeClasse } =
        await import('./js/core/espaceProf.js');
    const c = await creerClasse('6B', '6e');
    const ap = await apercuDeListe(c.id, 'GARCIA;Léa\nMARTIN;Gabriel\n', '');
    await importerListe(c.id, ap.apercu.texte);
    const l = await listeDeClasse(c.id);
    return { id: c.id, eleves: (l.eleves || []).map(e => ({ login: e.login, code: e.code, prenom: e.prenom })) };
});
ok('la classe est montée avec ses deux élèves', classe.eleves.length === 2,
    classe.eleves.map(e => e.prenom).join(', '));
const lea = classe.eleves.find(e => /Léa/.test(e.prenom)) || classe.eleves[0];

/**
 * ENTRER DANS LA CLASSE, PAR LE CHEMIN DU PROFESSEUR.
 *
 * `#top-btn-classe` ramène à la LISTE des classes ; il faut ensuite rouvrir la
 * carte. Écrit deux fois dans cette sonde, donc écrit une fois.
 */
async function entrerDansLaClasse() {
    await prof.click('#top-btn-classe');
    await prof.waitForSelector('.ec-carte[data-ouvrir]', { timeout: 15000 });
    for (let essai = 0; essai < 6; essai++) {
        await prof.evaluate(() => {
            const c = [...document.querySelectorAll('.ec-carte[data-ouvrir]')]
                .find(x => /6B/.test(x.textContent || '')) || document.querySelector('.ec-carte[data-ouvrir]');
            if (c) c.click();
        });
        await prof.waitForTimeout(1200);
        if (await prof.evaluate(() => document.querySelectorAll('.ec-rang').length > 0)) break;
    }
    await prof.waitForTimeout(2200);
}

// ─────────────────────────────── L'ÉLÈVE OUVRE SON EXERCICE, POUR DE VRAI ───

const el = await nav.newPage({ viewport: { width: 1100, height: 900 } });
el.on('pageerror', e => soucis.push('élève: ' + String(e).slice(0, 200)));
el.on('dialog', async (d) => { soucis.push('FENÊTRE NATIVE: ' + d.message()); await d.dismiss(); });
await el.goto(`${BASE}/index.html`);
await pretE(el);
await el.evaluate(async ({ base, e }) => {
    const { loginEleve } = await import('./js/core/sync.js');
    await loginEleve({ apiUrl: base + '/api', login: e.login, code: e.code });
}, { base: BASE, e: lea });
await el.reload();
await pretE(el);

// ON PASSE PAR LE MENEUR, comme « Mes exercices » le fait pour un exercice
// ouvert seul (voir `js/ui/mesExercicesUI.js`). C'est le chemin de l'élève : la
// question est tirée par le générateur, le relevé part par le vrai battement.
await el.evaluate(async (exoId) => {
    const { getExerciseById } = await import('./js/data/catalog.js');
    const { makeStep, makePath } = await import('./js/core/path.js');
    const { politiquePerso } = await import('./js/core/mesExercices.js');
    const { Runner } = await import('./js/core/runner.js');
    const exo = getExerciseById(exoId);
    const pas = makeStep(exo.id, {}, { stepId: 's1', nbItems: 8, threshold: 0 });
    new Runner({ path: makePath('Essai', [pas], politiquePerso()), deviceMode: 'none' }).start();
}, EXO);
await el.waitForTimeout(3000);

const chezLEleve = await el.evaluate(async () => {
    const { ceQuOnVoit } = await import('./js/core/ecran.js');
    const r = ceQuOnVoit();
    // CE QUI EST ÉCRIT SUR SON ÉCRAN, lu dans le DOM et non dans l'objet : si
    // les deux divergeaient, c'est l'écran qui aurait raison.
    const zone = document.getElementById('game-layer');
    return {
        releve: r,
        surLEcran: zone ? (zone.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 300) : ''
    };
});
ok('l\'élève a bien un exercice à l\'écran', !!chezLEleve.surLEcran,
    chezLEleve.surLEcran.slice(0, 80) || '(écran vide)');
ok('IL SAIT DIRE CE QU\'IL VOIT, GRAINE COMPRISE',
    !!(chezLEleve.releve && chezLEleve.releve.graine && chezLEleve.releve.question),
    chezLEleve.releve
        ? `graine ${chezLEleve.releve.graine} · « ${chezLEleve.releve.question} »`
        : '(aucun relevé)');
// L'ÉNONCÉ ANNONCÉ N'EST PAS MOT POUR MOT CELUI DE L'ÉCRAN, et c'est normal :
// le relevé porte le `prompt.text` du générateur — « Quelle opération est
// prioritaire dans 2 + 3 × 3 ? » — quand l'activité l'abrège à sa façon —
// « Priorité ? 2 + 3 × 3 ». On ne l'exige donc pas ; on exige que les NOMBRES
// soient les mêmes, parce que ce sont eux qui font la question.
const nombresDe = (t) => String(t).match(/\d+/g) || [];
ok('l\'énoncé annoncé porte les mêmes nombres que son écran',
    !!chezLEleve.releve && nombresDe(chezLEleve.releve.question).length > 0
        && nombresDe(chezLEleve.releve.question).every(n => chezLEleve.surLEcran.includes(n)),
    'annoncé : ' + ((chezLEleve.releve || {}).question || ''));

// LE BATTEMENT DE CŒUR, DÉCLENCHÉ À LA MAIN. En classe il part tout seul toutes
// les dix secondes ; ici on ne va pas attendre dix secondes pour mesurer un
// chemin qui ne dépend pas de l'horloge.
const parti = await el.evaluate(async () => {
    const { rafraichirSeance } = await import('./js/core/sync.js');
    await rafraichirSeance();
    return true;
});
ok('le relevé est parti au serveur', parti);

// ─────────────────────── LE PROFESSEUR OUVRE SON DIRECT ET REGARDE ──────────

await entrerDansLaClasse();

// On déplie la fiche de Léa : Rémy — « il faut aussi pouvoir cliquer sur
// l'élève, voir où il en est ».
await prof.evaluate(() => {
    const r = [...document.querySelectorAll('.ec-rang')].find(x => /Léa/.test(x.textContent || ''));
    const b = r && r.querySelector('[data-fiche]');
    if (b) b.click();
    else if (r) r.click();
});
await prof.waitForTimeout(1800);

const chezLeProf = await prof.evaluate(() => {
    const f = document.querySelector('.ec-fiche');
    const yeux = f && f.querySelector('.ec-fiche-yeux');
    const b = f && f.querySelector('[data-voir-exo]');
    return {
        yeux: yeux ? (yeux.innerText || '').replace(/\s+/g, ' ').trim() : '',
        bouton: b ? (b.textContent || '').trim() : '',
        graine: b ? b.getAttribute('data-graine') : null
    };
});
ok('LE DIRECT ÉCRIT CE QUE L\'ÉLÈVE A SOUS LES YEUX', !!chezLeProf.yeux,
    chezLeProf.yeux || '(rien d\'affiché)');
ok('et le bouton a reçu la graine',
    chezLeProf.graine === (chezLEleve.releve || {}).graine,
    `bouton « ${chezLeProf.bouton} » · graine ${chezLeProf.graine || '(aucune)'}`);
ok('le bouton ne promet plus « son exercice » mais SA QUESTION',
    /sa question/i.test(chezLeProf.bouton), chezLeProf.bouton);

// ─────────────────────────────── ET IL CLIQUE : MÊME QUESTION, OU NON ? ─────

await prof.evaluate(() => {
    const b = document.querySelector('.ec-fiche [data-voir-exo]');
    if (b) b.click();
});
await prof.waitForTimeout(3500);

const ouvert = await prof.evaluate(() => {
    const zone = document.getElementById('game-layer');
    return zone ? (zone.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 300) : '';
});
console.log('\n  CHEZ L\'ÉLÈVE  :', chezLEleve.surLEcran.slice(0, 120));
console.log('  CHEZ LE PROF  :', ouvert.slice(0, 120));

// LA VRAIE MESURE : on compare LES DEUX ÉCRANS, pas un écran à un texte. Le
// compteur de questions diffère légitimement — le professeur ne refait pas la
// série de son élève, il regarde UNE question —, donc on l'ôte des deux côtés.
const sansCompteur = (t) => String(t).replace(/\d+\s*\/\s*\d+\s*questions?/gi, '')
    .replace(/\s+/g, ' ').trim();
const vuEleve = sansCompteur(chezLEleve.surLEcran);
const vuProf = sansCompteur(ouvert);
ok('LE PROFESSEUR A LA MÊME QUESTION SOUS LES YEUX QUE SON ÉLÈVE',
    !!vuEleve && vuEleve === vuProf,
    vuEleve === vuProf ? vuEleve.slice(0, 110) : 'les deux écrans diffèrent');
if (vuEleve !== vuProf) {
    console.log('      élève :', vuEleve.slice(0, 170));
    console.log('      prof  :', vuProf.slice(0, 170));
}

// ────────────────────────── ET QUAND L'ÉLÈVE QUITTE, ON NE MENT PLUS ────────
//
// Le relevé pourrait simplement vieillir : trois minutes pendant lesquelles le
// professeur croirait son élève sur une question qu'il a quittée, c'est trois
// minutes de conseil donné à côté. On vérifie donc que le départ s'ÉCRIT.

await el.evaluate(async () => {
    // LE VRAI CHEMIN : l'élève ferme son exercice, et c'est le meneur qui oublie
    // — on ne l'appelle pas à sa place. Sans meneur ouvert, on n'a rien à
    // mesurer, et la sonde le dira.
    const { state } = await import('./js/core/state.js');
    const r = state.activeSequenceRunner;
    if (r) r.finish(true);
    const { rafraichirSeance } = await import('./js/core/sync.js');
    await rafraichirSeance();
});
await attendre(600);

const apres = await prof.evaluate(async (classId) => {
    const { leDirect } = await import('./js/core/espaceProf.js');
    const d = await leDirect(classId);
    const l = (d.eleves || []).find(x => /Léa/.test(x.prenom || ''));
    return l ? { a: Object.prototype.hasOwnProperty.call(l, 'ecran'), ecran: l.ecran } : null;
}, classe.id);
ok('QUAND IL FERME SON EXERCICE, L\'ÉCRAN S\'EFFACE TOUT DE SUITE',
    !!apres && apres.a && apres.ecran === null,
    apres ? JSON.stringify(apres.ecran) : '(élève introuvable)');


// ══════════════════════ ET LES GRILLES, QUI N'ONT PAS D'ÉNONCÉ ══════════════
//
// C'est la moitié la plus visible de la plainte de Rémy : un patchwork n'a pas
// de question écrite, il a une GRILLE, et deux grilles tirées au hasard ne se
// ressemblent jamais. Un jeu autonome ne portait aucune graine — il appelait
// `makeRng(undefined)` —, donc sa grille n'était reproductible par personne, pas
// même par l'élève lui-même. Le meneur lui en donne une maintenant.

const EMPREINTE = () => {
    const g = document.querySelector('[data-grille]');
    if (!g) return '';
    // L'EMPREINTE D'UNE GRILLE : la suite des couleurs de fond de ses cases,
    // dans l'ordre. C'est ce que l'élève voit, et c'est ce que deux grilles
    // différentes ne peuvent pas avoir en commun.
    return [...g.querySelectorAll('[data-i]')]
        .map(c => (c.getAttribute('style') || '').replace(/\s+/g, ''))
        .join('|');
};

await el.evaluate(async (exoId) => {
    const { getExerciseById } = await import('./js/data/catalog.js');
    const { makeStep, makePath } = await import('./js/core/path.js');
    const { politiquePerso } = await import('./js/core/mesExercices.js');
    const { Runner } = await import('./js/core/runner.js');
    const exo = getExerciseById(exoId);
    const pas = makeStep(exo.id, {}, { stepId: 'sg', nbItems: 3, threshold: 0 });
    new Runner({ path: makePath('Essai grille', [pas], politiquePerso()), deviceMode: 'none' }).start();
}, 'geo-patchwork');
await el.waitForTimeout(3500);

const grilleEleve = await el.evaluate(async (src) => {
    const { ceQuOnVoit } = await import('./js/core/ecran.js');
    // eslint-disable-next-line no-new-func
    const empreinte = new Function('return (' + src + ')()')();
    const { rafraichirSeance } = await import('./js/core/sync.js');
    await rafraichirSeance();
    return { releve: ceQuOnVoit(), empreinte, cases: (document.querySelectorAll('[data-i]') || []).length };
}, EMPREINTE.toString());

ok('UN JEU AUTONOME DIT SA GRAINE, LUI AUSSI',
    !!(grilleEleve.releve && grilleEleve.releve.graine),
    grilleEleve.releve ? `graine ${grilleEleve.releve.graine} · ${grilleEleve.cases} cases`
        : '(aucun relevé)');
const attenduGraine = (grilleEleve.releve || {}).graine || null;
ok('et le direct dit qu\'il n\'y a pas d\'énoncé plutôt que d\'en inventer un',
    !!(grilleEleve.releve && !grilleEleve.releve.question),
    (grilleEleve.releve || {}).etape || '');

// LE PROFESSEUR SORT DE L'EXERCICE QU'IL REGARDAIT, ET REVIENT À SON DIRECT.
//
// ET IL FAUT ATTENDRE SON PROPRE BATTEMENT. Le direct se relit toutes les vingt
// secondes ; forcer la lecture depuis la sonde mesurerait un chemin que Rémy
// n'emprunte pas. On attend donc, en regardant la graine du bouton changer —
// c'est exactement ce que lui verra.
// `finish()` SEUL NE SUFFIT PAS : il laisse la couche d'exercice à l'écran (elle
// porte le bilan), et cette couche intercepte tous les clics — la sonde ne
// pouvait plus atteindre le bouton des classes. C'est `exit()` qui la range,
// comme le fait le bouton « Quitter » de l'élève.
await prof.evaluate(async () => {
    const { state } = await import('./js/core/state.js');
    const r = state.activeSequenceRunner;
    if (r) { r.finish(true); r.exit(); }
});
await attendre(1800);
await entrerDansLaClasse();

let graineGrille = null;
for (let essai = 0; essai < 20; essai++) {
    await prof.evaluate(() => {
        if (document.querySelector('.ec-fiche')) return;
        const r = [...document.querySelectorAll('.ec-rang')].find(x => /Léa/.test(x.textContent || ''));
        const b = r && r.querySelector('[data-fiche]');
        if (b) b.click(); else if (r) r.click();
    });
    graineGrille = await prof.evaluate(() => {
        const b = document.querySelector('.ec-fiche [data-voir-exo]');
        return b ? b.getAttribute('data-graine') : null;
    });
    if (graineGrille && graineGrille === attenduGraine) break;
    await attendre(2000);
}
ok('la graine de la grille arrive au bouton du professeur',
    !!graineGrille && graineGrille === (grilleEleve.releve || {}).graine,
    graineGrille || '(aucune)');

await prof.evaluate(() => {
    const b = document.querySelector('.ec-fiche [data-voir-exo]');
    if (b) b.click();
});
await prof.waitForTimeout(3500);
const grilleProf = await prof.evaluate((src) => {
    // eslint-disable-next-line no-new-func
    return new Function('return (' + src + ')()')();
}, EMPREINTE.toString());

ok('LE PROFESSEUR A LA MÊME GRILLE SOUS LES YEUX QUE SON ÉLÈVE',
    !!grilleEleve.empreinte && grilleEleve.empreinte === grilleProf,
    grilleEleve.empreinte === grilleProf
        ? `${grilleEleve.cases} cases, même découpe`
        : 'les deux grilles diffèrent');
if (grilleEleve.empreinte !== grilleProf) {
    console.log('      élève :', String(grilleEleve.empreinte).slice(0, 150));
    console.log('      prof  :', String(grilleProf).slice(0, 150));
}


console.log('\n' + '─'.repeat(64));
console.log(`fenêtres natives et erreurs de page : ${soucis.length}`);
soucis.slice(0, 8).forEach(x => console.log('   · ' + x));
if (soucis.length) process.exitCode = 1;

await nav.close();
srv.kill();
