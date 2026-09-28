// LE RITUEL DE VERSION, EN UNE COMMANDE.
//
// NÉ DE LA PREMIÈRE FRICTION DU JOURNAL, marquée quatre fois dans la seule
// journée du 26 septembre : « le rituel de version se refait à la main à chaque
// commit ». Il tient en trois gestes, tous obligatoires, tous silencieux quand
// on les oublie :
//
//   1. `?v=NNN` monte d'un, dans `index.html` ET dans `sw.js` — six fois dans
//      chacun ;
//   2. `const CACHE = 'atoutmath-vNNN'` monte d'un dans `sw.js`, avec sa
//      PROPRE numérotation, qui n'a rien à voir avec la première ;
//   3. `node tools/csp.mjs --ecrire` dès qu'un script en ligne a bougé.
//
// CE QUE COÛTE L'OUBLI : le navigateur des élèves garde l'ancienne version, et
// la correction qu'on vient de faire n'existe pas. Rien ne le signale — ni un
// essai, ni un harnais, ni le serveur. On s'en aperçoit quand un élève dit que
// le bogue est toujours là.
//
// CE QUE CET OUTIL REFUSE DE FAIRE : deviner. S'il trouve autre chose que six
// occurrences par fichier, ou deux numéros différents entre `index.html` et
// `sw.js`, il s'arrête et le dit. Un rituel à moitié fait est pire que pas de
// rituel : on croit l'avoir fait.
//
//     node tools/version.mjs            monte d'un cran et écrit la CSP
//     node tools/version.mjs --dire     ne touche à rien, dit où l'on en est
//
// Il imprime la ligne à recopier dans le message de commit.

import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const DIRE = process.argv.includes('--dire');

const OCCURRENCES_ATTENDUES = 6;   // par fichier, et c'est le CLAUDE.md qui le dit

/** Toutes les occurrences de `?v=NNN` d'un texte. */
function versions(texte) {
    return [...texte.matchAll(/\?v=(\d+)/g)].map(m => Number(m[1]));
}

function lire(chemin) {
    try { return readFileSync(chemin, 'utf8'); }
    catch (e) { arreter(`${chemin} est illisible : ${e.message}`); }
}

function arreter(pourquoi) {
    console.error('\nON NE MONTE RIEN : ' + pourquoi);
    console.error('Le rituel se fait en entier ou pas du tout — un `?v=` monté');
    console.error('dans un seul fichier laisse le navigateur mélanger deux versions.');
    process.exit(1);
}

const index = lire('index.html');
const sw = lire('sw.js');

// --- 1. OÙ EN EST-ON ? ---------------------------------------------------
const vIndex = versions(index);
const vSw = versions(sw);
const cache = /const CACHE = 'atoutmath-v(\d+)'/.exec(sw);

if (!cache) arreter('`const CACHE = \'atoutmath-vNNN\'` est introuvable dans sw.js');
if (!vIndex.length) arreter('aucun `?v=` dans index.html');

const uniques = (t) => [...new Set(t)];
if (uniques(vIndex).length !== 1) {
    arreter(`index.html porte ${uniques(vIndex).length} numéros différents `
        + `(${uniques(vIndex).join(', ')}) : une montée précédente s'est arrêtée en chemin`);
}
if (uniques(vSw).length !== 1) {
    arreter(`sw.js porte ${uniques(vSw).length} numéros différents (${uniques(vSw).join(', ')})`);
}
if (vIndex[0] !== vSw[0]) {
    arreter(`index.html est à v${vIndex[0]} et sw.js à v${vSw[0]} : ils doivent être égaux`);
}
// On COMPTE, parce que le nombre est la seule preuve qu'on les a tous eus. Si
// quelqu'un ajoute une septième feuille de style demain, cet outil doit le dire
// plutôt que d'en monter six et d'en laisser une derrière.
if (vIndex.length !== OCCURRENCES_ATTENDUES || vSw.length !== OCCURRENCES_ATTENDUES) {
    arreter(`index.html en a ${vIndex.length} et sw.js ${vSw.length}, on en attend `
        + `${OCCURRENCES_ATTENDUES} de chaque.\n  Si le dépôt a vraiment changé, c'est `
        + 'OCCURRENCES_ATTENDUES qu\'il faut corriger ici — en le sachant.');
}

const v = vIndex[0];
const c = Number(cache[1]);

if (DIRE) {
    console.log(`?v=${v}  (${vIndex.length} dans index.html, ${vSw.length} dans sw.js)`);
    console.log(`CACHE atoutmath-v${c}`);
    console.log(`\nLa montée donnerait : ?v=${v + 1} · CACHE atoutmath-v${c + 1}`);
    process.exit(0);
}

// --- 2. ON MONTE ---------------------------------------------------------
writeFileSync('index.html', index.replaceAll(`?v=${v}`, `?v=${v + 1}`));
writeFileSync('sw.js', sw
    .replaceAll(`?v=${v}`, `?v=${v + 1}`)
    .replace(`const CACHE = 'atoutmath-v${c}'`, `const CACHE = 'atoutmath-v${c + 1}'`));

// --- 3. ON RELIT CE QU'ON VIENT D'ÉCRIRE ---------------------------------
//
// Une écriture qui n'a rien remplacé ne se plaint pas : `replaceAll` rend la
// chaîne inchangée et s'en va. On relit donc les fichiers depuis le disque.
const index2 = lire('index.html');
const sw2 = lire('sw.js');
const ok = versions(index2).every(x => x === v + 1)
    && versions(sw2).every(x => x === v + 1)
    && versions(index2).length === OCCURRENCES_ATTENDUES
    && new RegExp(`const CACHE = 'atoutmath-v${c + 1}'`).test(sw2);
if (!ok) arreter('la relecture ne retrouve pas les nouveaux numéros — rien n\'est sûr, vérifier à la main');

// --- 4. LA CSP ------------------------------------------------------------
//
// Elle ne change QUE si un script en ligne a bougé ; `csp.mjs` le sait et ne
// réécrit `.htaccess` que dans ce cas. On l'appelle toujours : c'est le geste
// que l'on oublie, et le faire pour rien ne coûte rien.
let csp = '';
try {
    csp = execFileSync('node', ['tools/csp.mjs', '--ecrire'], { encoding: 'utf8' }).trim();
} catch (e) {
    arreter('`node tools/csp.mjs --ecrire` a échoué : ' + String(e.message).slice(0, 200));
}

console.log(`v${v} → v${v + 1}   ·   CACHE atoutmath-v${c} → v${c + 1}`);
console.log(`${OCCURRENCES_ATTENDUES} occurrences dans index.html, ${OCCURRENCES_ATTENDUES} dans sw.js, relues sur le disque.`);
console.log(csp ? '   ' + csp.replace(/\n/g, '\n   ') : '   (csp.mjs n\'a rien dit)');
console.log('\nÀ recopier dans le message de commit :');
console.log(`  Rituel de version : ?v=${v} → ${v + 1} (six par fichier), `
    + `CACHE v${c} → v${c + 1}, node tools/csp.mjs --ecrire.`);
