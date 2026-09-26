// LES QUATRE PIÈGES D'UN EXERCICE NEUF, VÉRIFIÉS EN DEUX SECONDES.
//
// Né d'une friction, la première que `/distill` aura servi à résoudre. Ajouter
// Le Patchwork au catalogue a demandé QUATRE passages de `npm test` — seize
// minutes d'attente — pour découvrir une à une des règles qu'aucun message ne
// dit à l'avance :
//
//   1. la compétence citée doit exister dans `js/data/skills.js` ;
//   2. le code dicté doit tenir dans l'alphabet à 23 lettres (ni I, ni O, ni Q,
//      qui se recopient en 1, 0 et O) — et un code hors alphabet ne casse pas
//      franchement : il fait retomber l'exercice sur le format long, et deux
//      tests sans rapport apparent tombent ;
//   3. un fichier de `js/data/` ne doit JAMAIS importer un module de
//      `js/games/` : le jeu touche le DOM au chargement, et dix-neuf fichiers
//      de tests tombent d'un coup sur « document is not defined » ;
//   4. les jetons de couleur employés par un module doivent exister dans
//      `css/base.css`.
//
// Ces quatre règles sont DÉJÀ testées — le harnais les attrape. Il les attrape
// seulement au bout de quatre minutes, mélangées à trois mille autres, et sans
// dire comment les corriger. Cet outil-ci ne remplace pas le harnais : il le
// devance.
//
//     node tools/nouvelExercice.mjs            → tout le catalogue
//     node tools/nouvelExercice.mjs geo-patchwork
//
// Sortie : 0 si tout va bien, 1 sinon, et une ligne par problème qui dit QUOI
// FAIRE — pas seulement ce qui ne va pas.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const RACINE = new URL('..', import.meta.url).pathname;
const lire = (p) => readFileSync(join(RACINE, p), 'utf8');

// L'alphabet des codes dictés — la copie de `js/core/shortcodes.js`, et l'on
// vérifie plus bas qu'elle n'a pas divergé.
const ALPHABET = 'ABCDEFGHJKLMNPRSTUVWXYZ';

const problemes = [];
const faute = (quoi, quoiFaire) => problemes.push({ quoi, quoiFaire });

// --- 3. Un fichier de données n'importe pas un jeu ---------------------------
//
// On le vérifie en premier parce que c'est le plus brutal : il ne casse pas
// l'exercice, il casse TOUS les tests.
for (const f of readdirSync(join(RACINE, 'js/data'))) {
    if (!f.endsWith('.js')) continue;
    const src = lire(`js/data/${f}`);
    const m = src.match(/^import .*from '\.\.\/games\/[^']+';$/m);
    if (m) {
        faute(`js/data/${f} importe un module de jeu : ${m[0].trim()}`,
            'Déplacer ce qui est importé dans js/core/ : un module de jeu touche le '
            + 'DOM au chargement, et tous les tests tombent sur « document is not defined ».');
    }
}

// SI UN FICHIER DE DONNÉES IMPORTE UN JEU, ON S'ARRÊTE ICI.
//
// Les vérifications qui suivent IMPORTENT le catalogue. Or c'est exactement ce
// qu'un import de jeu fait tomber : le module touche le DOM au chargement, et
// l'outil meurt sur « document is not defined » — en donnant le même message
// illisible que le harnais, ce qu'on cherchait justement à éviter. On dit donc
// la faute, et on sort.
if (problemes.length) dire();

// --- 2. Les codes dictés -----------------------------------------------------
//
// ON IMPORTE, ON NE DEVINE PAS. Première version : une expression régulière sur
// le texte des fichiers. Elle a rendu 1214 « problèmes », tous faux — elle
// prenait les identifiants de RÉGLAGES (`mode`, `taille`, `rythme`) pour des
// exercices, et ne voyait aucune compétence. Un outil censé faire gagner du
// temps qui rend mille fausses pistes en fait perdre : les deux règles qui
// peuvent se lire depuis les modules se lisent donc depuis les modules.
const { CODES_EXERCICES } = await import('../js/data/codesExercices.js');
const { exercices } = await import('../js/data/catalog.js');
const { SKILLS, matchSkills } = await import('../js/data/skills.js');

if (!lire('js/core/shortcodes.js').includes(`'${ALPHABET}'`)) {
    faute('l\u2019alphabet des codes a changé dans js/core/shortcodes.js',
        'Mettre à jour la constante ALPHABET en tête de cet outil.');
}
const vus = new Map();
for (const [id, code] of Object.entries(CODES_EXERCICES)) {
    for (const lettre of String(code)) {
        if (!ALPHABET.includes(lettre)) {
            faute(`${id} porte le code « ${code} », et « ${lettre} » n\u2019est pas dans l\u2019alphabet`,
                `Choisir deux lettres parmi ${ALPHABET} (ni I, ni O, ni Q : recopiées à la `
                + 'main elles deviennent 1, 0 et O).');
        }
    }
    if (vus.has(code)) {
        faute(`le code « ${code} » est porté par ${vus.get(code)} ET par ${id}`,
            'Deux exercices ne peuvent pas partager un code : en choisir un autre.');
    }
    vus.set(code, id);
}
// Et l'inverse : un exercice sans code n'a pas de code court à dicter.
const cible = process.argv[2] || '';
for (const e of exercices) {
    if (cible && e.id !== cible) continue;
    if (!CODES_EXERCICES[e.id]) {
        faute(`${e.id} n\u2019a pas de code dicté`,
            'Lui donner deux lettres libres dans js/data/codesExercices.js, sans quoi son '
            + 'lien restera long.');
    }
}

// --- 1. Les compétences citées existent --------------------------------------
for (const e of exercices) {
    if (cible && e.id !== cible) continue;
    for (const nom of e.skills || []) {
        const existe = String(nom).includes('*')
            ? matchSkills(nom).length > 0
            : !!SKILLS[nom];
        if (!existe) {
            faute(`${e.id} cite la compétence « ${nom} », qui n\u2019existe pas`,
                'L\u2019ajouter à js/data/skills.js (label, chemin, niveaux, prereqs, '
                + 'descriptor, lesson) ou en citer une existante.');
        }
    }
}

// --- 4. Les jetons de couleur existent ---------------------------------------
//
// ON RAMASSE LES DÉCLARATIONS PARTOUT, comme le fait le harnais : dans TOUS les
// fichiers de `css/`, et dans les modules eux-mêmes, qui déclarent leurs jetons
// en ligne (`--pw-cote`) ou par `setProperty`. Première version : seulement
// `css/base.css`. Elle a rendu 1202 faux problèmes — `--text-muted` vit dans
// `css/ui.css`, et `--an-cote` dans le gabarit du jeu qui s'en sert.
//
// Et `var(--x, repli)` porte sa valeur de secours : il ne casse rien, on ne le
// signale pas.
const declarees = new Set();
for (const f of readdirSync(join(RACINE, 'css'))) {
    if (!f.endsWith('.css')) continue;
    for (const m of lire(`css/${f}`).matchAll(/(--[\w-]+)\s*:/g)) declarees.add(m[1]);
}
const modules = [];
const ramasser = (d) => {
    for (const f of readdirSync(join(RACINE, d), { withFileTypes: true })) {
        if (f.isDirectory()) ramasser(`${d}/${f.name}`);
        else if (f.name.endsWith('.js')) modules.push(`${d}/${f.name}`);
    }
};
ramasser('js');
for (const f of modules) {
    const src = lire(f);
    for (const m of src.matchAll(/(--[\w-]+)\s*:/g)) declarees.add(m[1]);
    for (const m of src.matchAll(/setProperty\(\s*['"`](--[\w-]+)/g)) declarees.add(m[1]);
}
const dejaDit = new Set();
for (const f of modules) {
    for (const m of lire(f).matchAll(/var\(\s*(--[\w-]+)\s*\)/g)) {
        const cle = `${f} ${m[1]}`;
        if (declarees.has(m[1]) || dejaDit.has(cle)) continue;
        dejaDit.add(cle);
        faute(`${f} emploie ${m[1]}, qui n\u2019est déclaré nulle part`,
            'Employer un jeton déclaré dans css/ (par exemple --text-main, --border, '
            + '--bg-panel, --bg-plateau, --primary, --danger, --success), le déclarer '
            + 'dans le gabarit du module, ou lui donner une valeur de secours.');
    }
}

// --- Le verdict --------------------------------------------------------------

/** Dire ce qu'on a trouvé, et sortir. */
function dire() {
    console.log(`\u001b[31m${problemes.length} problème(s)\u001b[0m — à corriger avant `
        + '`npm test`, qui mettra quatre minutes à dire la même chose :\n');
    problemes.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.quoi}`);
        console.log(`     → ${p.quoiFaire}\n`);
    });
    process.exit(1);
}

if (!problemes.length) {
    console.log('\u001b[32mLes quatre pièges sont évités.\u001b[0m '
        + `${vus.size} codes dictés, ${Object.keys(SKILLS).length} compétences, `
        + `${exercices.length} exercices.`);
    process.exit(0);
}
dire();
