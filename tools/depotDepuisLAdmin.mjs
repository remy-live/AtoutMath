// LE DÉPÔT, DE BOUT EN BOUT, DEPUIS L'ADMINISTRATION.
//
// C'est la demande de Rémy — « j'aimerai en une seule page même pour le
// déposer » —, donc c'est ce qu'il faut voir marcher : ouvrir le guichet,
// envoyer une archive, lire l'aperçu, poser, et retrouver le fichier écrit.
//
// ON FABRIQUE UNE ARCHIVE PIÉGÉE : un fichier légitime, et trois entrées qui
// essaient de sortir du dossier ou de toucher aux secrets. Les règles qui les
// refusent vivent dans `deposer.php` ; cette sonde vérifie que l'administration
// les applique vraiment, et non qu'elle prétend le faire.
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';

const PORT = Number(process.argv[2] || 8391);
const BASE = `http://127.0.0.1:${PORT}`;
let ratés = 0;
const dire = (q, ok, d = '') => { if (!ok) ratés++;
    console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${q}${d ? ' — ' + d : ''}`); };

// --- L'archive d'essai ------------------------------------------------------
const bac = 'tools/tmp/archive';
rmSync(bac, { recursive: true, force: true });
mkdirSync(bac + '/api', { recursive: true });
writeFileSync(bac + '/temoin-du-depot.txt', 'posé par la sonde\n');
writeFileSync(bac + '/api/config.php', '<?php return ["VOLE" => true];');
const zip = 'tools/tmp/essai-depot.zip';
rmSync(zip, { force: true });
execFileSync('zip', ['-q', '-r', '../essai-depot.zip', '.'], { cwd: bac });
// Les entrées piégées se posent à la main : `zip` refuse d'écrire « ../ ».
execFileSync('python3', ['-c', `
import zipfile
z = zipfile.ZipFile('${zip}', 'a')
z.writestr('../dehors.php', '<?php // hors du site')
z.writestr('/absolu.php', '<?php // chemin absolu')
z.writestr('api/data/base.sqlite', 'la base des eleves')
z.close()
`]);

const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await nav.newPage({ viewport: { width: 1100, height: 900 } });
const erreurs = [];
page.on('pageerror', (e) => erreurs.push(String(e)));

await page.goto(`${BASE}/api/admin/index.php`, { waitUntil: 'domcontentloaded' });
await page.fill('input[name=email]', 'remy@essai.test');
await page.fill('input[name=mdp]', 'motdepassetreslong');
await page.click('button');
await page.waitForLoadState('domcontentloaded');

// ON PART D'UN ÉTAT CONNU. Le guichet reste ouvert trente minutes : deux
// exécutions de suite, et la seconde ne mesurait plus la fermeture mais
// l'héritage de la première. Une sonde qui dépend de ce qu'a laissé la
// précédente ne mesure pas deux fois la même chose.
if (await page.locator('#depot button:has-text("Refermer")').count()) {
    await page.click('#depot button:has-text("Refermer")');
    await page.waitForLoadState('domcontentloaded');
}

// 1. LE GUICHET EST FERMÉ, ET IL FERME VRAIMENT.
const champAvant = await page.locator('input[type=file]').count();
dire('guichet fermé : aucun champ de fichier', champAvant === 0);

await page.click('#depot button:has-text("Ouvrir le guichet")');
await page.waitForLoadState('domcontentloaded');
dire('le guichet s\'ouvre', (await page.locator('input[type=file]').count()) === 1);

// 2. ON ENVOIE L'ARCHIVE, ET L'APERÇU DIT CE QU'IL VA FAIRE.
await page.setInputFiles('input[type=file]', zip);
await page.click('#depot button:has-text("Envoyer")');
await page.waitForLoadState('domcontentloaded');
const apercu = await page.evaluate(() => (document.querySelector('#depot .dedans') || {}).innerText || '');
dire('l\'aperçu annonce ce qui sera écrit', /fichiers seront écrits/.test(apercu),
    (apercu.match(/\d+ fichiers seront écrits/) || ['?'])[0]);
dire('et il NOMME ce qui sera refusé', /refusé/.test(apercu),
    (apercu.match(/\d+ refusés?\s*:[^\n]*/) || ['aucun refus annoncé'])[0].slice(0, 80));

// 3. ON POSE, et l'on va voir sur le disque.
const avant = readFileSync('api/config.php', 'utf8');
await page.click('#depot button:has-text("Poser")');
await page.waitForLoadState('domcontentloaded');
const fait = await page.evaluate(() => (document.querySelector('#depot .dedans') || {}).innerText || '');
dire('la pose dit combien de fichiers sont écrits', /fichiers? écrits?/.test(fait),
    (fait.match(/\d+ fichiers? écrits?/) || ['?'])[0]);
dire('le fichier légitime est là', existsSync('temoin-du-depot.txt'));
dire('« ../dehors.php » n\'est PAS sorti du site', !existsSync('../dehors.php'));
dire('« /absolu.php » n\'a pas été écrit', !existsSync('/absolu.php'));
dire('api/config.php est INTACT', readFileSync('api/config.php', 'utf8') === avant);
dire('api/data/ n\'a pas été touché', !existsSync('api/data/base.sqlite'));

// 4. LE JOURNAL DES DÉPÔTS garde la trace.
await page.goto(`${BASE}/api/admin/index.php`, { waitUntil: 'domcontentloaded' });
const journal = await page.evaluate(() => (document.querySelector('#depot .dedans') || {}).innerText || '');
dire('le dépôt est inscrit au journal', /essai-depot\.zip/.test(journal));

console.log(`\nerreurs de page : ${erreurs.length}`);
erreurs.slice(0, 4).forEach(e => console.log('   ' + e));
if (erreurs.length) ratés++;
// On nettoie ce que la sonde a posé sur le dépôt.
rmSync('temoin-du-depot.txt', { force: true });
rmSync(bac, { recursive: true, force: true });
console.log(ratés ? `\n\x1b[31m${ratés} raté(s)\x1b[0m` : '\n\x1b[32mLE DÉPÔT SE FAIT ICI, ET IL REFUSE CE QU\'IL DOIT REFUSER\x1b[0m');
await nav.close();
