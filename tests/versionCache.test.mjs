// LE NUMÉRO DE CACHE — la corvée manuelle qui se trompe en silence.
//
// Rémy : « et on peut automatiser cela ? »
//
// À chaque livraison, il faut incrémenter `?v=NNN` — six fois dans
// `index.html`, six fois dans `sw.js`. C'est mécanique, donc c'est exactement le
// genre de geste qu'on rate un jour sur dix. Et la panne qui s'ensuit est la
// pire espèce : INVISIBLE POUR CELUI QUI PUBLIE.
//
// Car celui qui publie recharge la page, vide son cache au besoin, et voit son
// correctif. L'élève, lui, garde l'ancien fichier — le navigateur n'a aucune
// raison de redemander une adresse qui n'a pas changé. Le correctif est en
// ligne, et il n'arrive pas. On le découvre en cours, devant la classe, en
// disant « pourtant je l'ai corrigé ».
//
// D'où ces trois vérifications. Elles ne remplacent pas l'incrémentation — je
// la fais toujours à la main — mais elles rendent IMPOSSIBLE de la faire à
// moitié, ce qui est le seul cas dangereux.
//
// POURQUOI PAS DE COMPARAISON AVEC `CACHE = 'atoutmath-vNNN'`. Ce numéro-là est
// délibérément indépendant : il nomme le bac du service worker, et on ne le
// change que lorsqu'on veut vraiment jeter tout ce qui y est. Les deux
// numérotations ne se suivent pas, et c'est voulu.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const lire = (f) => fs.readFileSync(path.join(RACINE, f), 'utf8');

/** Tous les numéros écrits en dur dans un fichier, sans les `?v=${…}`. */
function numeros(source) {
    return [...source.matchAll(/\?v=(\d+)/g)].map(m => m[1]);
}

test("index.html n'a qu'un seul numéro de version", () => {
    const vus = new Set(numeros(lire('index.html')));
    assert.equal(vus.size, 1,
        `index.html mélange les versions ${[...vus].join(', ')} — `
        + 'un fichier a été oublié pendant l\'incrémentation.');
});

test("sw.js n'a qu'un seul numéro de version", () => {
    const vus = new Set(numeros(lire('sw.js')));
    assert.equal(vus.size, 1,
        `sw.js mélange les versions ${[...vus].join(', ')}.`);
});

test('index.html et sw.js annoncent la MÊME version', () => {
    // C'EST LA VÉRIFICATION QUI COMPTE. Les deux fichiers listent les mêmes
    // ressources ; si leurs numéros divergent, le service worker met en cache
    // des adresses que la page ne demande jamais, et la page en demande que le
    // cache n'a pas. L'application marche — plus lentement, et plus du tout
    // hors ligne. Personne ne le remarque avant le jour sans réseau.
    const page = numeros(lire('index.html'))[0];
    const sw = numeros(lire('sw.js'))[0];
    assert.equal(sw, page,
        `index.html publie la v${page} et sw.js la v${sw} : le mode hors ligne `
        + 'mettrait en cache des fichiers que personne ne demande.');
});

test('les deux fichiers listent les mêmes ressources', () => {
    // Un fichier CSS ajouté à la page et oublié dans le service worker, c'est
    // une page qui s'affiche nue dès qu'on coupe le réseau. On compare donc les
    // chemins eux-mêmes, pas seulement les numéros.
    const chemins = (s) => new Set(
        [...s.matchAll(/['"(]\.?\.?\/?((?:css|js)\/[\w./-]+)\?v=\d+/g)].map(m => m[1])
    );
    const page = chemins(lire('index.html'));
    const sw = chemins(lire('sw.js'));

    const oublies = [...page].filter(c => !sw.has(c));
    assert.deepEqual(oublies, [],
        `${oublies.length} ressource(s) chargée(s) par index.html et absente(s) de `
        + `sw.js : ${oublies.join(', ')} — la page ne s'affichera pas hors ligne.`);
});
