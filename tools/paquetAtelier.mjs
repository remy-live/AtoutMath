#!/usr/bin/env node
// L'ATELIER D'ESSAI EN UN SEUL FICHIER — à ouvrir d'un double-clic.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « pour l'atelier, donne-le-moi directement ici sous forme de fichier. »
//
// ── POURQUOI UN OUTIL, ET PAS UN COPIER-COLLER ─────────────────────────────
//
// Le même atelier existe déjà en cinq fichiers, servis par le site. En faire une
// copie à la main pour l'envoyer, c'est fabriquer une SECONDE source : la
// correction suivante irait dans l'une et pas dans l'autre, et l'on passerait
// une demi-heure à comprendre pourquoi le fichier reçu ne fait pas ce que le
// site fait. Cet outil la fabrique à partir des sources, à la demande.
//
// ── POURQUOI IL FAUT TOUT METTRE DEDANS ────────────────────────────────────
//
// Un fichier ouvert depuis le disque vit sous `file://`, où un navigateur REFUSE
// les imports de modules — même entre deux fichiers du même dossier. La page du
// site n'a pas ce problème : elle est servie. Ici, tout doit tenir dans un seul
// document : les deux feuilles de style, les quatre modules, la page.
//
// ── COMMENT ON RECOUD LES MODULES SANS LES MÉLANGER ────────────────────────
//
// Trois des quatre modules déclarent un `esc` ; deux déclarent un `n`. Collés
// bout à bout dans la même portée, ils se redéclareraient et le fichier ne
// s'ouvrirait même pas. On enferme donc CHACUN dans sa propre fonction, qui rend
// ce qu'il exporte — c'est ce que fait un module, écrit à la main :
//
//     __M['dingbatLibre'] = (function () { … ; return { TOILE, COULEURS, … }; })();
//
// et chaque `import { A, B } from './x.js'` devient `const { A, B } = __M['x'];`.
// Les noms privés restent privés, et rien ne se mélange.
//
// ON NE DEVINE PAS : si une forme d'import ou d'export inattendue apparaît, on
// s'arrête et on le dit. Un paquet à moitié recousu s'ouvre sur une page blanche,
// et c'est le genre de fichier qu'on envoie sans l'avoir ouvert.
//
//   node tools/paquetAtelier.mjs        → tools/tmp/atelier-dingbats-autonome.html

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const lire = (f) => readFileSync(f, 'utf8');
const arreter = (dit) => { console.error(`\n  ARRÊT — ${dit}\n`); process.exit(1); };

/** Les modules, dans l'ordre où ils doivent être posés : un module avant ceux qui l'emploient. */
const MODULES = [
    { nom: 'indiceQuiDonne', chemin: 'js/core/indiceQuiDonne.js' },
    { nom: 'svgSobre', chemin: 'js/core/svgSobre.js' },
    { nom: 'dingbatLibre', chemin: 'js/core/dingbatLibre.js' },
    { nom: 'dingbat', chemin: 'js/core/dingbat.js' },
    { nom: 'atelierToile', chemin: 'js/ui/atelierToile.js' },
    { nom: 'montage', chemin: 'js/essai/montage.js' }
];

/** Le nom de module que désigne un chemin d'import, quel que soit le `../`. */
const nomDe = (chemin) => chemin.replace(/^.*\//, '').replace(/\.js$/, '');

function recoudre(source, nom) {
    let s = source;

    // 1. LES IMPORTS, y compris ceux qui tiennent sur plusieurs lignes.
    s = s.replace(/^import\s*\{([\s\S]*?)\}\s*from\s*'([^']+)';?$/gm, (tout, noms, chemin) => {
        const cible = nomDe(chemin);
        if (!MODULES.some(m => m.nom === cible)) {
            arreter(`${nom} importe « ${chemin} », qui n'est pas dans la liste des modules à coudre`);
        }
        return `const {${noms}} = __M['${cible}'];`;
    });
    if (/^import /m.test(s)) {
        arreter(`${nom} porte un import d'une forme que je ne sais pas recoudre :\n    `
            + (s.match(/^import .*/m) || [''])[0]);
    }

    // 2. LES EXPORTS. On relève les noms AVANT de retirer le mot-clé.
    const noms = [...s.matchAll(/^export\s+(?:const|let|function)\s+([A-Za-z_$][\w$]*)/gm)]
        .map(m => m[1]);
    if (/^export\s*\{/m.test(s) || /^export\s+default/m.test(s)) {
        arreter(`${nom} emploie « export { … } » ou « export default », que je ne sais pas recoudre`);
    }
    s = s.replace(/^export\s+(const|let|function)\s/gm, '$1 ');

    return `__M['${nom}'] = (function () {\n${s}\nreturn { ${noms.join(', ')} };\n})();`;
}

// --- ON COUD ---------------------------------------------------------------

const script = [
    '// Les modules d\'AtoutMath, recousus par tools/paquetAtelier.mjs.',
    '// LA SOURCE EST DANS LE DÉPÔT : ne pas corriger ici, la correction serait perdue.',
    'const __M = {};',
    ...MODULES.map(m => recoudre(lire(m.chemin), m.nom))
].join('\n\n');

const styles = ['css/base.css', 'css/atelierEssai.css']
    .map(f => `/* ===== ${f} ===== */\n${lire(f)}`).join('\n\n');

let page = lire('atelier-dingbats.html');

// On retire ce qui pointait vers des fichiers voisins, et l'on pose le contenu.
const avant = page;
page = page
    .replace(/^\s*<link rel="stylesheet" href="css\/[^"]+">\s*$/gm, '')
    .replace(/^\s*<script type="module" src="js\/essai\/[^"]+"><\/script>\s*$/gm, '');
if (page === avant) arreter('la page ne porte plus les `<link>` et le `<script>` attendus');

page = page
    .replace('</head>', `<style>\n${styles}\n</style>\n</head>`)
    // UN `<script>` ORDINAIRE, PAS UN MODULE : il n'y a plus rien à importer, et
    // un module se charge de façon différée — ce qui, sous `file://`, ajoute une
    // occasion de se tromper sans rien apporter.
    .replace('</body>', `<script>\n${script}\n</script>\n</body>`);

// LE FICHIER DIT CE QU'IL EST ET D'OÙ IL VIENT. Reçu par courriel dans six mois,
// il ne doit pas laisser croire qu'on peut le corriger : sa source est ailleurs.
page = page.replace('<title>', '<!--\n'
    + '    FICHIER AUTONOME — fabriqué par `node tools/paquetAtelier.mjs`.\n'
    + '    Tout est dedans : les feuilles de style et les quatre modules. On\n'
    + '    l\'ouvre d\'un double-clic, sans serveur et sans réseau.\n'
    + '    NE PAS LE CORRIGER ICI : la source vit dans le dépôt AtoutMath\n'
    + '    (atelier-dingbats.html, css/atelierEssai.css, js/essai/atelierEssai.js,\n'
    + '    js/core/dingbat*.js) et ce fichier se refabrique d\'une commande.\n'
    + '-->\n<title>');

mkdirSync('tools/tmp', { recursive: true });
const sortie = 'tools/tmp/atelier-dingbats-autonome.html';
writeFileSync(sortie, page);

const ko = Math.round(page.length / 1024);
console.log(`\n  ${sortie}`);
console.log(`  ${ko} Ko · ${MODULES.length} modules recousus, 2 feuilles de style`);
console.log('  Aucun fichier voisin : il s\'ouvre d\'un double-clic.\n');
