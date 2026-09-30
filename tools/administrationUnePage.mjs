// L'ADMINISTRATION, OUVERTE COMME RÉMY L'OUVRE.
// On se connecte avec le mot de passe, on regarde ce qu'il y a, on déplie, et
// l'on vérifie que les anciennes adresses mènent encore quelque part.
import { chromium } from 'playwright';

const PORT = Number(process.argv[2] || 8391);
const BASE = `http://127.0.0.1:${PORT}`;
const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await nav.newPage({ viewport: { width: 1100, height: 900 } });
const erreurs = [];
page.on('pageerror', (e) => erreurs.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') erreurs.push(m.text()); });

let ratés = 0;
const dire = (q, ok, d = '') => { if (!ok) ratés++;
    console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${q}${d ? ' — ' + d : ''}`); };

await page.goto(`${BASE}/api/admin/index.php`, { waitUntil: 'domcontentloaded' });
dire('la page de connexion s\'affiche', await page.locator('input[name=email]').count() === 1);
await page.fill('input[name=email]', 'remy@essai.test');
await page.fill('input[name=mdp]', 'motdepassetreslong');
await page.click('button');
await page.waitForLoadState('domcontentloaded');

const vu = await page.evaluate(() => ({
    sections: [...document.querySelectorAll('details.bloc')].map(d => ({
        id: d.id,
        titre: (d.querySelector('.titre-bloc') || {}).firstChild?.textContent?.trim() || '',
        ouverte: d.open,
        etiquette: (d.querySelector('.etiquette') || {}).textContent || ''
    })),
    nav: document.querySelectorAll('header nav a').length,
    classes: /Mes classes|Conduire la séance|Nouvelle classe/.test(document.body.innerText),
    avis: (document.querySelector('.avis') || {}).textContent || '',
    titre: document.title
}));

console.log(`\n\x1b[1m${vu.titre}\x1b[0m`);
for (const s of vu.sections) {
    console.log(`   ${s.ouverte ? '▾' : '▸'} ${s.titre.padEnd(34)} ${s.etiquette}`);
}
dire('cinq sections, pas six pages', vu.sections.length === 5, `${vu.sections.length}`);
dire('le DÉPÔT est en premier et déplié',
    vu.sections[0] && vu.sections[0].id === 'depot' && vu.sections[0].ouverte,
    vu.sections[0] ? vu.sections[0].id : '(aucune)');
dire('la SANTÉ vient juste après',
    vu.sections[1] && vu.sections[1].id === 'sante', vu.sections[1]?.id || '');
dire('plus une seule trace des classes', !vu.classes);
dire('plus de barre de navigation', vu.nav === 0, String(vu.nav));
dire('chaque section dit son état sans qu\'on la déplie',
    vu.sections.every(s => s.etiquette.trim() !== '' || s.id === 'rapport' || s.id === 'compte'),
    vu.sections.map(s => s.id + ':' + (s.etiquette.trim() || '—')).join(' '));

// ON DÉPLIE CE QUI EST REPLIÉ, et rien d'autre : cliquer sur une section déjà
// ouverte la REFERME. La première version cliquait les quatre sans regarder, et
// refermait la santé — qui s'ouvre d'elle-même quand un point est grave.
for (const id of ['sante', 'ranger', 'rapport', 'compte']) {
    const ouverte = await page.evaluate((x) => document.getElementById(x).open, id);
    if (!ouverte) await page.click(`#${id} > summary`);
}
await page.waitForTimeout(300);
const apres = await page.evaluate(() => [...document.querySelectorAll('details.bloc')]
    .filter(d => d.open).map(d => d.id));
dire('les cinq se déplient', apres.length === 5, apres.join(' '));

// LES ANCIENNES ADRESSES MÈNENT ENCORE QUELQUE PART.
for (const [ancien, ancre] of [['sante.php', 'sante'], ['rapport.php', 'rapport'],
    ['ranger.php', 'ranger']]) {
    const r = await page.goto(`${BASE}/api/admin/${ancien}`, { waitUntil: 'domcontentloaded' });
    dire(`${ancien} mène à la section`, page.url().endsWith('index.php#' + ancre)
        || page.url().includes('index.php'), page.url().replace(BASE, ''));
}
// ET LES PAGES DES CLASSES ONT VRAIMENT DISPARU.
//
// ON NE MESURE PAS UN 404 ICI, et c'est une leçon payée : le serveur de
// développement de PHP sert `index.php` pour TOUT `.php` manquant d'un dossier
// qui en contient un. Vérifié avec un nom tiré au hasard — `zzz.php` répond 200
// lui aussi. Sur un vrai Apache, ces adresses rendent 404 ; ici, la seule chose
// qu'on puisse mesurer, c'est que le FICHIER n'est plus là et que ce qui
// s'affiche n'est plus l'ancienne console de séance.
const { existsSync } = await import('node:fs');
for (const mort of ['classe.php', 'eleves.php']) {
    dire(`${mort} n'est plus dans le dépôt`, !existsSync('api/admin/' + mort));
    await page.goto(`${BASE}/api/admin/${mort}`, { waitUntil: 'domcontentloaded' });
    const texte = await page.evaluate(() => document.body.innerText);
    dire(`et son adresse ne sert plus la console de séance`,
        !/Conduire la séance|Verrouiller|Élèves de la classe/.test(texte));
}

console.log(`\nerreurs de page : ${erreurs.length}`);
erreurs.slice(0, 5).forEach(e => console.log('   ' + e));
if (erreurs.length) ratés++;
await page.goto(`${BASE}/api/admin/index.php`, { waitUntil: 'domcontentloaded' });
await page.locator('main').screenshot({ path: 'tools/tmp/admin.png' });
console.log(ratés ? `\n\x1b[31m${ratés} raté(s)\x1b[0m` : '\n\x1b[32mUNE SEULE PAGE\x1b[0m');
await nav.close();
