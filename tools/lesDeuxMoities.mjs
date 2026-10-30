// LES DEUX MOITIÉS DU BILAN, ET LE TABLEAU À DOUBLE ENTRÉE.
//
// RÉMY : « juste un switch de détail et au début du bilan, mettre ce qu'il faut
// revoir et ce qui a été compris pour la classe, permettre d'imprimer un pdf
// que tu génères […] et pour le 4 colonne séance choisie ».
//
// ─────────────────────────────────────────────────────────────────────────────
//
// POURQUOI UNE SONDE À PART DE `classeVirtuelle.mjs`.
//
// Celle-là monte trente élèves pour éprouver des écrans qui DÉBORDENT. Mais sa
// classe travaille à 58 % : chacune de ses notions est fragile pour plus
// d'élèves qu'elle n'est acquise, et le bloc « Ce qui est compris » s'y tait —
// ce qui est la bonne réponse, et ce qui ne montre rien. Les deux listes ne se
// voient ensemble que sur une classe qui a VRAIMENT compris quelque chose, et
// cette classe-là doit être fabriquée exprès.
//
// CE QUI SE MESURE ICI, ET NULLE PART AILLEURS :
//
//   · que les deux blocs s'affichent ensemble et se distinguent à l'œil ;
//   · qu'une notion acquise ET fragile dise POUR COMBIEN elle ne tient pas
//     encore — sans quoi « 4 élèves » se lit « la classe sait » ;
//   · que la bascule du détail ouvre un tableau dont les colonnes sont LE PLAN
//     DE LA SÉANCE : l'exercice que personne n'a atteint garde sa colonne,
//     vide, et c'est l'information la plus utile de l'écran ;
//   · que le PDF se fabrique vraiment — un bouton qui ne produit pas de
//     fichier est un bouton qui ne sert à rien, et ça ne se voit pas à l'œil.
//
// RIEN N'EST TRUQUÉ : six élèves se connectent, poussent de vrais événements
// par le vrai `/sync`, et le serveur reprojette tout.
//
// Usage :  node tools/lesDeuxMoities.mjs

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as attendre } from 'node:timers/promises';
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';

const EXOS = ['calc-poser', 'calc-poser-division', 'calc-prio'];
const NOTIONS = ['num.add.entiers', 'num.div.quotient', 'num.prio'];
const TITRES = ['Additions posées', 'Divisions posées', 'Priorités'];

/**
 * SIX HISTOIRES CHOISIES POUR CE QU'ELLES PRODUISENT À L'ÉCRAN.
 *
 * `etapes` dit jusqu'où l'élève est allé, `justes` combien il a réussi sur huit
 * questions de chaque étape qu'il a ouverte.
 *
 *   · QUATRE RÉUSSISSENT LA PREMIÈRE ÉTAPE (7 ou 8 sur 8) et DEUX LA RATENT
 *     (1 sur 8) : la première notion est donc acquise par quatre et fragile
 *     pour deux. Quatre est strictement plus que deux : elle entre dans « ce
 *     qui est compris », EN DISANT qu'elle est encore fragile pour deux.
 *   · DEUX SEULEMENT ATTEIGNENT LA DEUXIÈME ÉTAPE, et ils la ratent : la
 *     colonne est rouge, mais sur deux élèves — on veut voir que l'écran ne
 *     confond pas ça avec « la classe entière a échoué ».
 *   · PERSONNE N'ATTEINT LA TROISIÈME : sa colonne doit exister, et rester
 *     vide. C'est le défaut qu'un tableau bâti sur les réponses ne peut pas
 *     montrer.
 */
const CLASSE = [
    { nom: 'ABEL;Alice', etapes: 2, justes: [8, 2] },
    { nom: 'BRUN;Bruno', etapes: 2, justes: [7, 1] },
    { nom: 'CAMUS;Clara', etapes: 1, justes: [8] },
    { nom: 'DUMAS;David', etapes: 1, justes: [7] },
    { nom: 'ERNAUX;Elena', etapes: 1, justes: [1] },
    { nom: 'FARID;Farida', etapes: 1, justes: [1] }
];

const PORT = String(8960 + Math.floor(Math.random() * 120));
const srv = spawn('php', ['tools/siteEssai.php', PORT], { stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((ok, ko) => {
    const t = setTimeout(() => ko(new Error('le site d\'essai n\'a pas démarré')), 30000);
    srv.stdout.on('data', d => { if (String(d).includes('"port"')) { clearTimeout(t); ok(); } });
    srv.on('error', ko);
});
await attendre(400);
const BASE = `http://127.0.0.1:${PORT}`;

// LE DOSSIER DES TÉLÉCHARGEMENTS EST VIDÉ AVANT, PAS APRÈS. Un PDF resté d'un
// essai précédent ferait passer cette sonde alors que le bouton ne produit
// plus rien — et c'est exactement le défaut qu'on vient vérifier.
const TELECHARGE = 'tools/tmp/telechargements';
if (existsSync(TELECHARGE)) rmSync(TELECHARGE, { recursive: true, force: true });
mkdirSync(TELECHARGE, { recursive: true });

const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const err = [];
const ok = (q, v, d = '') => {
    console.log((v ? '  ok   ' : '  NON  ') + q + (d ? '  — ' + d : ''));
    if (!v) process.exitCode = 1;
};

console.log('\nLES DEUX MOITIÉS DU BILAN, SUR UN VRAI SERVEUR');
console.log('─'.repeat(64));

// ───────────────────────────────── LE PROFESSEUR, SA CLASSE, SA SÉANCE ──────

const prof = await nav.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 2 });
prof.on('pageerror', e => err.push('prof: ' + String(e).slice(0, 180)));
await prof.goto(`${BASE}/index.html`);
await prof.waitForFunction(() => window.__atoutmathPret === true, { timeout: 20000 });
await prof.evaluate(async () => {
    const { identifierProf } = await import('./js/core/verrouProf.js');
    await identifierProf('remy@essai.test', 'motdepassetreslong');
});
await prof.reload();
await prof.waitForFunction(() => window.__atoutmathPret === true, { timeout: 20000 });

const monte = await prof.evaluate(async ({ noms, exos, titres }) => {
    const { creerClasse, apercuDeListe, importerListe, listeDeClasse } =
        await import('./js/core/espaceProf.js');
    const { donnerAuServeur } = await import('./js/core/parcoursServeur.js');
    const { makeStep } = await import('./js/core/path.js');

    const c = await creerClasse('5B', '5e');
    const ap = await apercuDeListe(c.id, noms.join('\n') + '\n', '');
    await importerListe(c.id, ap.apercu.texte);
    const l = await listeDeClasse(c.id);

    // LA SÉANCE, AVEC SES TROIS ÉTAPES : c'est ELLE qui fera les colonnes du
    // tableau croisé, et non les réponses des élèves.
    const parcours = {
        id: 'p_deux_moities', name: 'Devoir du mardi', version: 2,
        steps: exos.map((ex, i) => makeStep(ex, {}, { stepId: 'sc_' + i, nbItems: 8 })),
        policy: { mode: 'entrainement' }
    };
    parcours.steps.forEach((s, i) => { s.title = titres[i]; });
    const donne = await donnerAuServeur(parcours, c.id);
    return {
        id: c.id, donne: !!donne.ok, erreur: donne.erreur || '',
        eleves: (l.eleves || []).map(e => ({ login: e.login, code: e.code, prenom: e.prenom }))
    };
}, { noms: CLASSE.map(e => e.nom), exos: EXOS, titres: TITRES });

ok('la classe et sa séance sont montées',
    monte.eleves.length === CLASSE.length && monte.donne,
    `${monte.eleves.length} élèves · ${monte.erreur || 'séance donnée'}`);

// ──────────────────────────────────────── CHACUN TRAVAILLE, POUR DE VRAI ────

let arrives = 0;
for (let i = 0; i < monte.eleves.length; i++) {
    const h = CLASSE[i];
    const e = monte.eleves[i];
    const page = await nav.newPage();
    page.on('pageerror', x => err.push('élève: ' + String(x).slice(0, 180)));
    await page.goto(`${BASE}/index.html`);
    await page.waitForFunction(() => window.__atoutmathPret === true, { timeout: 20000 });
    const fait = await page.evaluate(async ({ e, h, base, exos, notions, titres }) => {
        const { loginEleve, syncNow } = await import('./js/core/sync.js');
        await loginEleve({ apiUrl: base + '/api', login: e.login, code: e.code });
        const { journal, EventTypes } = await import('./js/core/journal.js');
        const runId = 'run_' + e.login;

        // LE RUN PORTE LE PARCOURS, et c'est indispensable : `parSeance` croise
        // l'exercice de la réponse avec le parcours de son run. Sans
        // `run_started`, les réponses n'appartiennent à aucune séance et le
        // tableau croisé reste vide — mesuré en écrivant l'essai du serveur.
        journal.emit(EventTypes.RUN_STARTED, {
            runId, pathId: 'p_deux_moities', pathName: 'Devoir du mardi',
            mode: 'entrainement', stepCount: exos.length
        });

        for (let k = 0; k < h.etapes; k++) {
            const justes = h.justes[k];
            for (let q = 0; q < 8; q++) {
                journal.emit(EventTypes.ATTEMPT, {
                    runId, stepId: 'sc_' + k, exerciseId: exos[k], skillId: notions[k],
                    itemSeed: `${k}:${q}`, correct: q < justes, attemptIndex: 0,
                    msElapsed: 22000
                });
            }
            journal.emit(EventTypes.STEP_COMPLETED, {
                runId, pathId: 'p_deux_moities', stepId: 'sc_' + k, title: titres[k],
                exerciseId: exos[k], questions: 8, solved: justes, required: 6,
                passed: justes >= 6
            });
            journal.emit(EventTypes.TIME_SPENT, { exerciseId: exos[k], seconds: 200 });
        }
        for (let n = 0; n < 25 && journal.pending().length; n++) {
            await syncNow();
            if (journal.pending().length) await new Promise(r => setTimeout(r, 300));
        }
        return { reste: journal.pending().length };
    }, { e, h, base: BASE, exos: EXOS, notions: NOTIONS, titres: TITRES });
    if (!fait.reste) arrives++;
    await page.close();
}
ok('chacun a poussé son journal par le vrai /sync', arrives === CLASSE.length,
    arrives + ' journaux arrivés');

// ───────────────────────────────────────── CE QUE LE PROFESSEUR VOIT ────────

await prof.click('#top-btn-classe');
await prof.waitForSelector('.ec-carte[data-ouvrir]', { timeout: 15000 });
for (let essai = 0; essai < 6; essai++) {
    await prof.evaluate(() => {
        const c = [...document.querySelectorAll('.ec-carte[data-ouvrir]')]
            .find(x => /5B/.test(x.textContent || '')) || document.querySelector('.ec-carte[data-ouvrir]');
        if (c) c.click();
    });
    await prof.waitForTimeout(1000);
    if (await prof.evaluate(() => document.querySelectorAll('.ec-onglet').length > 0)) break;
}
await prof.evaluate(() => {
    const b = [...document.querySelectorAll('.ec-onglet')].find(x => /bilan/i.test(x.textContent || ''));
    if (b) b.click();
});
await prof.waitForSelector('.ec-table--bilan', { timeout: 15000 });

const lire = (ou) => [...document.querySelectorAll(ou + ' .ec-reprendre')].map(n => ({
    quoi: (n.querySelector('b') || {}).textContent,
    combien: (n.querySelector('.ec-reprendre-combien') || {}).textContent,
    qui: (n.querySelector('.ec-reprendre-qui') || {}).textContent
}));

const tete = await prof.evaluate((src) => {
    const lire = eval('(' + src + ')');
    const bord = (sel) => {
        const el = document.querySelector(sel);
        return el ? getComputedStyle(el).borderLeftColor : '';
    };
    return {
        aReprendre: lire('.ec-bloc--reprendre'),
        compris: lire('.ec-bloc--compris'),
        bordReprendre: bord('.ec-bloc--reprendre'),
        bordCompris: bord('.ec-bloc--compris')
    };
}, lire.toString());

console.log('\n  EN TÊTE DU BILAN');
console.log('    à reprendre :', tete.aReprendre.map(n => `${n.quoi} (${n.combien})`).join(' · ') || '(rien)');
console.log('    compris     :', tete.compris.map(n => `${n.quoi} (${n.combien})`).join(' · ') || '(rien)');

ok('LES DEUX MOITIÉS S\'AFFICHENT ENSEMBLE',
    tete.aReprendre.length > 0 && tete.compris.length > 0,
    `${tete.aReprendre.length} / ${tete.compris.length}`);
ok('et elles ne se confondent pas à l\'œil',
    !!tete.bordReprendre && !!tete.bordCompris && tete.bordReprendre !== tete.bordCompris,
    `${tete.bordReprendre} contre ${tete.bordCompris}`);
ok('LA NOTION ACQUISE PAR QUATRE DIT QU\'ELLE EST ENCORE FRAGILE POUR DEUX',
    // Sans cette fin de ligne, « Additionner des entiers : 4 élèves » se lit
    // « la classe sait », et l'on raye une leçon dont deux élèves ont besoin.
    tete.compris.some(n => /fragile pour 2/.test(n.qui || '')),
    tete.compris.map(n => n.qui).join(' | ') || '(rien)');
await prof.screenshot({ path: 'tools/tmp/deux-moities-tete.png', fullPage: true });

// ─────────────────────────────────────────── LA BASCULE DU DÉTAIL ───────────

ok('LE DÉTAIL EST FERMÉ EN ARRIVANT — le bilan est bien « car concis »',
    await prof.evaluate(() => !document.querySelector('.ec-table--croise')
        && !!document.querySelector('[data-detail-bilan]')));

await prof.click('[data-detail-bilan]');
await prof.waitForSelector('.ec-table--croise', { timeout: 8000 });

const croise = await prof.evaluate(() => {
    const th = [...document.querySelectorAll('.ec-table--croise thead th')].map(x => x.textContent.trim());
    const lignes = [...document.querySelectorAll('.ec-table--croise tbody tr')].map(tr => ({
        qui: (tr.querySelector('b') || {}).textContent,
        cases: [...tr.querySelectorAll('.ec-case')].map(td => ({
            texte: td.textContent.trim(),
            vide: td.classList.contains('ec-case--vide'),
            bulle: td.getAttribute('title') || ''
        }))
    }));
    const pied = [...document.querySelectorAll('.ec-table--croise tfoot td')].map(x => x.textContent.trim());
    return {
        th, lignes, pied,
        seances: [...document.querySelectorAll('[data-seance-detail] option')].map(o => o.textContent),
        phrase: (document.querySelector('.ec-phrase-tableau') || {}).textContent || '',
        large: Math.round(document.documentElement.scrollWidth - document.documentElement.clientWidth)
    };
});

console.log('\n  LE TABLEAU CROISÉ');
console.log('    colonnes :', croise.th.join(' | '));
for (const l of croise.lignes) console.log('   ', l.qui, '→', l.cases.map(c => c.vide ? '·' : c.texte).join(' '));
console.log('    la classe :', croise.pied.join(' | '));
console.log('    phrase    :', croise.phrase || '(aucune)');

ok('LE TABLEAU A UNE COLONNE PAR EXERCICE DE LA SÉANCE',
    // Élève + 3 exercices + « Sa séance » = 5 en-têtes.
    croise.th.length === 5, croise.th.join(' | '));
ok('ET L\'EXERCICE QUE PERSONNE N\'A ATTEINT GARDE SA COLONNE, VIDE',
    // C'est l'information la plus utile de l'écran : la séance était trop
    // longue. Un tableau bâti sur les réponses l'aurait perdue.
    croise.lignes.length === CLASSE.length
    && croise.lignes.every(l => l.cases.length === 3 && l.cases[2].vide),
    croise.lignes.map(l => l.cases.filter(c => c.vide).length).join(','));
ok('UNE CASE VIDE DIT POURQUOI, et ne dit pas « 0 % »',
    croise.lignes[0].cases[2].texte === ''
    && /pas atteint/.test(croise.lignes[0].cases[2].bulle),
    croise.lignes[0].cases[2].bulle || '(aucune bulle)');
ok('UNE CASE PLEINE DIT LES TROIS NOMBRES EN PASSANT DESSUS',
    croise.lignes.some(l => /question/.test(l.cases[0].bulle)
        && /du premier coup/.test(l.cases[0].bulle)),
    croise.lignes[0].cases[0].bulle || '(aucune bulle)');
ok('LE PIED DIT LA COLONNE, ET COMBIEN L\'ONT ATTEINTE',
    croise.pied.length === 5 && /él\./.test(croise.pied[1]) && /—/.test(croise.pied[3]),
    croise.pied.join(' | '));
ok('la séance se choisit dans une liste', croise.seances.length >= 1, croise.seances.join(', '));
ok('rien ne déborde en largeur', croise.large === 0, croise.large + ' px');
// LA CAPTURE PORTE SUR LE TABLEAU, PAS SUR LA PAGE ENTIÈRE : en pleine page,
// le tableau se retrouve en bas d'une image de trois mille pixels de haut, et
// l'on ne voit plus ce qu'on venait regarder.
await (await prof.$('.ec-table--croise'))
    .screenshot({ path: 'tools/tmp/deux-moities-croise.png' });

// ──────────────────────────────────────────────────── LE PDF ────────────────

// LE PDF SE FABRIQUE VRAIMENT. Un bouton qui n'écrit aucun fichier ne se voit
// pas à l'œil : l'écran ne change pas, et l'on croit que le PDF est parti.
const session = await prof.context().newCDPSession(prof);
await session.send('Browser.setDownloadBehavior', {
    behavior: 'allow', downloadPath: TELECHARGE, eventsEnabled: true
});
const attendu = prof.waitForEvent('download', { timeout: 30000 }).catch(() => null);
await prof.click('[data-bilan-pdf]');
const telecharge = await attendu;
const nom = telecharge ? telecharge.suggestedFilename() : '';
if (telecharge) await telecharge.saveAs(`${TELECHARGE}/${nom}`);
const fichiers = existsSync(TELECHARGE) ? readdirSync(TELECHARGE) : [];
ok('LE BOUTON PRODUIT VRAIMENT UN PDF',
    !!telecharge && /\.pdf$/.test(nom) && fichiers.some(f => /\.pdf$/.test(f)),
    nom || fichiers.join(', ') || '(aucun fichier)');

// ────────────────────────────────────────────────────── LA FIN ──────────────

console.log('\n' + '─'.repeat(64));
console.log('erreurs de page :', err.length, err.slice(0, 4));
if (err.length) process.exitCode = 1;
console.log(process.exitCode ? 'IL Y A QUELQUE CHOSE À REPRENDRE.' : 'LES DEUX MOITIÉS TIENNENT.');

await nav.close();
srv.kill();
