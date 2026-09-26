// UN MOT PAR CHOSE, ET UNE CHOSE PAR MOT.
//
// L'audit a relevé quatre dérives de vocabulaire, toutes mesurables :
//
//   · LE MÊME NOMBRE portait trois noms — « étoiles » dans la barre du haut,
//     « Points totaux » dans le profil, « XP » deux cartes plus bas. C'est
//     littéralement le même : le niveau vaut score ÷ 100, la barre montre
//     score % 100.
//   · LA MÊME CHOSE portait quatre noms — « Montre-moi », « Mode
//     démonstration », « Aperçu », « Le robot ».
//   · L'ÉCRAN DE PRÉPARATION portait trois noms à deux cents pixels les uns
//     des autres.
//   · LA MOITIÉ DES RUBRIQUES était en capitale anglaise (« Calcul Mental »),
//     que le français n'emploie pas.
//
// Ce que ces épreuves tiennent, c'est que ça ne revienne pas. Un mot se
// réintroduit sans rien casser : rien ne le signalerait autrement.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const lire = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
/** Le HTML sans ses commentaires : on teste ce qui s'affiche. */
const sansCommentairesHtml = (s) => s.replace(/<!--[\s\S]*?-->/g, '');
const sansCommentairesJs = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const HTML = sansCommentairesHtml(lire('index.html'));
const PROFIL = sansCommentairesJs(lire('js/ui/profileUI.js'));
const EXPLOITS = sansCommentairesJs(lire('js/core/gamification.js'));
const TAGS = sansCommentairesJs(lire('js/data/tags.js'));

test('LE COMPTEUR N\'A QU\'UN SEUL NOM : des points', () => {
    assert.ok(!/\bXP\b/.test(PROFIL), 'le profil ne dit plus « XP »');
    assert.ok(!/\bXP\b/.test(EXPLOITS), 'les exploits non plus');
    assert.ok(!/\bXP\b/.test(HTML), 'la page non plus');
    // Et il ne s'appelle plus « étoiles » non plus : l'étoile est le DESSIN,
    // « points » est le mot. Les deux peuvent cohabiter — l'un se voit, l'autre
    // se dit — mais un seul des deux se lit.
    assert.ok(!/[ée]toiles?\s*-\s*voir mon profil/i.test(HTML));
    assert.match(HTML, /Mes points/, 'le profil affiche « Mes points »');
});

test('LE ROBOT S\'APPELLE LE ROBOT', () => {
    // « Montre-moi » reste et ne compte pas : ce n'est pas le NOM de la chose,
    // c'est ce que l'élève lui demande.
    assert.ok(!/Mode d[ée]monstration/i.test(HTML), 'plus de « Mode démonstration »');
    const moteur = sansCommentairesJs(lire('js/games/engine.js'));
    assert.ok(!/textContent = `Aper[çc]u/.test(moteur), 'la bande ne dit plus « Aperçu »');
    assert.match(moteur, /Le robot joue/);
    assert.match(HTML, /Le robot joue/);
});

test('L\'ÉCRAN DE PRÉPARATION N\'A QU\'UN NOM', () => {
    assert.ok(!/Mode [ÉE]dition de Parcours/i.test(HTML), 'le bandeau du haut a disparu');
    assert.ok(!/Construction de Parcours/i.test(HTML), 'l\'ancien en-tête aussi');
    assert.match(HTML, /Préparer un parcours/, 'il reste le verbe de l\'onglet qui y mène');
});

test('LE FRANÇAIS N\'A PAS DE CAPITALE À CHAQUE MOT', () => {
    // On ne teste que les RUBRIQUES de rangement : les titres d'exercices sont
    // des noms d'œuvres, et c'est leur auteur qui les orthographie.
    const etiquettes = [...TAGS.matchAll(/^\s*[A-Z_]+:\s*"([^"]+)"/gm)].map(m => m[1]);
    assert.ok(etiquettes.length > 20, `on lit bien les rubriques (${etiquettes.length})`);
    const petits = new Set(['de', 'des', 'du', 'la', 'le', 'les', 'et', 'à', 'en', 'dans', 'd\'']);
    const fautifs = etiquettes.filter(e => {
        const mots = e.split(/[\s']+/).filter(Boolean);
        return mots.slice(1).some(m =>
            /^[A-ZÉÈÀÊÎÔÛÇ]/.test(m) && !petits.has(m.toLowerCase()));
    });
    assert.deepEqual(fautifs, [],
        'en français, seul le premier mot prend la majuscule (les niveaux « CM2 », « 6ème » sont des sigles)');
});

test('les titres d\'exploits suivent la même règle', () => {
    const titres = [...EXPLOITS.matchAll(/title: '([^']+)'/g)].map(m => m[1]);
    assert.ok(titres.length >= 6, `on lit bien les exploits (${titres.length})`);
    const fautifs = titres.filter(t => t.split(' ').slice(1)
        .some(m => /^[A-ZÉÈÀÊÎÔÛÇ]/.test(m) && !['de', 'des', 'du'].includes(m.toLowerCase())));
    assert.deepEqual(fautifs, []);
});

test('les quatre titres de niveau aussi', () => {
    const rangs = [...PROFIL.matchAll(/rank = '([^']+)'/g)].map(m => m[1]);
    assert.equal(rangs.length, 4, 'les quatre titres sont là');
    const fautifs = rangs.filter(t => t.split(' ').slice(1)
        .some(m => /^[A-ZÉÈÀÊÎÔÛÇ]/.test(m) && !['de', 'des', 'du'].includes(m.toLowerCase())));
    assert.deepEqual(fautifs, []);
});

test('OÙ J\'EN SUIS NE SE DIT PAS DEUX FOIS', () => {
    // Mesuré sur un téléphone, première question d'une séance de trois : trois
    // nombres dans les quarante-cinq pixels du haut — « Étape 1 sur 3 » (le
    // fil), « Additions Mystères (1/3) » (le titre) et « 0 / 4 » (la pastille).
    // Les deux premiers disaient la même chose, dans deux écritures ; le
    // troisième en disait une autre, dans la même écriture que le deuxième.
    const runner = sansCommentairesJs(lire('js/core/runner.js'));
    assert.ok(!/\$\{step\.title\} \(\$\{this\.index \+ 1\}\/\$\{this\.steps\.length\}\)/.test(runner),
        'le titre de l\'exercice ne répète plus le numéro d\'étape');
    assert.match(runner, /titleEl\.textContent = step\.title;/);
    // Et le fil, lui, le dit — en toutes lettres et en cases.
    const fil = sansCommentairesJs(lire('js/ui/filSeance.js'));
    assert.match(fil, /Étape \$\{Math\.min\(av\.faites \+ 1, av\.etapes\)\} sur \$\{av\.etapes\}/);
});
