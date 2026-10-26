// LES ÉNONCÉS DU CATALOGUE, DU PLUS LONG AU PLUS COURT — ET CEUX QUI DICTENT
// LA MÉTHODE.
//
// ─────────────────────────────────────────────────────────────────────────────
//
//   node tools/enoncesDuCatalogue.mjs            les trente plus longs
//   node tools/enoncesDuCatalogue.mjs --methode  ceux qui donnent la méthode
//   node tools/enoncesDuCatalogue.mjs --tous     tout, pour un diff
//   node tools/enoncesDuCatalogue.mjs <id>       un exercice en entier
//
// POURQUOI CET OUTIL EXISTE. Rémy, 26 octobre : « de manière générale, les
// énoncés doivent être plus court, vraiment sans exception. On n'a pas à
// expliquer qu'il faut ranger dans l'ordre croissant pour calculer une
// médiane ».
//
// DEUX DÉFAUTS DIFFÉRENTS, ET LE SECOND EST LE PIRE :
//
//   · LONG. Un énoncé long tient mal dans une colonne de fiche, et l'élève
//     qui lit mal en lit encore moins.
//   · QUI DONNE LA MÉTHODE. « Range les nombres dans l'ordre croissant, puis
//     trouve la médiane » n'est pas une question, c'est la correction. Ce
//     qu'on voulait mesurer — sait-il qu'il faut ranger ? — est écrit dans la
//     question.
//
// LA LIGNE DE PARTAGE : la méthode appartient à l'INDICE et au ROBOT, qui se
// déplient quand l'élève le demande. L'énoncé, lui, ne se déplie pas.
//
// ON MESURE LES DEUX FORMES. `prompt.text` est ce que l'élève lit à l'écran,
// `prompt.papier` ce qu'il lit sur la fiche — elles diffèrent souvent, et la
// seconde est la plus serrée (une colonne de fiche fait 78 mm).

import './../tests/helpers.mjs';
import '../js/core/activities/index.js';
import { exercices } from '../js/data/catalog.js';
import { getGenerator } from '../js/core/registry.js';
import { makeRng } from '../js/core/ids.js';

const ARGS = process.argv.slice(2);
const UN = ARGS.find(a => !a.startsWith('--'));
const TOUS = ARGS.includes('--tous');
const METHODE = ARGS.includes('--methode');
const TIRAGES = Number(process.env.TIRAGES || 6);

/**
 * LES MOTS QUI TRAHISSENT UNE MÉTHODE DANS UN ÉNONCÉ.
 *
 * Chacun a été relevé dans le catalogue, pas imaginé : ce sont les tournures
 * par lesquelles une question se met à expliquer comment on y répond.
 * « Calcule la médiane » est une question ; « Range d'abord les nombres, puis
 * prends celui du milieu » est la correction imprimée au-dessus du blanc.
 */
const METHODES = [
    /\bd['’]abord\b/i, /\bpuis\b/i, /\bensuite\b/i, /\bcommence par\b/i,
    /\bn['’]oublie pas\b/i, /\bpense à\b/i, /\battention\b/i, /\brappelle-toi\b/i,
    /\bpour cela\b/i, /\bil faut\b/i, /\bon range\b/i, /\brange(?:r|z)? les\b/i,
    /\bdans l['’]ordre croissant\b/i, /\bsouviens-toi\b/i, /\btu peux\b/i,
    /\bméthode\b/i, /\bastuce\b/i
];

const nettoyer = (t) => String(t ?? '').replace(/\s+/g, ' ').trim();

const lignes = [];
for (const exo of exercices) {
    if (UN && exo.id !== UN) continue;
    const gen = getGenerator(exo.generatorId);
    if (!gen || typeof gen.generate !== 'function') continue;
    // ON NE GARDE QU'UNE FOIS CHAQUE ÉNONCÉ. Un générateur tire des nombres,
    // pas des phrases : vingt tirages de la même marche rendent vingt fois le
    // même moule, et c'est le MOULE qu'on relit.
    const vus = new Set();
    for (let i = 0; i < TIRAGES; i++) {
        let it;
        try {
            it = gen.generate({ ...(exo.params || {}) },
                { rng: makeRng(exo.id + 'enonce' + i), index: i });
        } catch (e) { continue; }
        if (!it || !it.prompt) continue;
        for (const [ou, brut] of [['écran', it.prompt.text], ['papier', it.prompt.papier]]) {
            const t = nettoyer(brut);
            if (!t) continue;
            // Le moule, c'est la phrase sans ses nombres : deux tirages de
            // « 3/4 ÷ 2/5 » ne sont pas deux énoncés.
            const moule = t.replace(/\d+/g, '#');
            if (vus.has(ou + moule)) continue;
            vus.add(ou + moule);
            const methode = METHODES.filter(r => r.test(t)).map(r => String(r));
            lignes.push({ id: exo.id, titre: exo.title, ou, n: t.length, t, methode });
        }
    }
}

const dire = (l) => console.log(`${String(l.n).padStart(4)}  ${l.id.padEnd(26)}`
    + ` ${l.ou}  ${l.methode.length ? '⚑ ' : '  '}${l.t}`);

if (UN) {
    lignes.sort((a, b) => b.n - a.n).forEach(dire);
} else if (METHODE) {
    const f = lignes.filter(l => l.methode.length).sort((a, b) => b.n - a.n);
    f.forEach(dire);
    console.log(`\n${f.length} énoncé(s) donnent la méthode, sur ${lignes.length} relevés`
        + ` — ${new Set(f.map(l => l.id)).size} exercice(s).`);
} else {
    const tri = lignes.slice().sort((a, b) => b.n - a.n);
    (TOUS ? tri : tri.slice(0, 30)).forEach(dire);
    const n = lignes.length;
    const long = (seuil) => lignes.filter(l => l.n > seuil).length;
    const exoLongs = new Set(lignes.filter(l => l.n > 90).map(l => l.id));
    console.log(`\n${n} énoncé(s) relevés sur ${new Set(lignes.map(l => l.id)).size} exercices`);
    console.log(`  > 60 caractères : ${long(60)}   > 90 : ${long(90)}   > 120 : ${long(120)}`
        + `   > 160 : ${long(160)}`);
    console.log(`  ${exoLongs.size} exercice(s) ont au moins un énoncé de plus de 90 caractères.`);
    console.log(`  ${new Set(lignes.filter(l => l.methode.length).map(l => l.id)).size}`
        + ' exercice(s) donnent la méthode dans l\'énoncé (--methode).');
}
