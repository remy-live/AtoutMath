// SUR UN ÉCRAN TACTILE, LE SURVOL RESTE COLLÉ.
//
// Rémy, capture de « La Chute des Décimaux » : « des intervalles sont allumés
// alors que je n'avais pas appuyé dessus ». Deux cases éclairées sur la droite
// graduée, dont une seule — celle qui porte une bordure — est le curseur du
// jeu. L'autre est un `:hover` que son doigt a laissé derrière lui : sur iOS,
// la pseudo-classe se pose au toucher et NE SE RETIRE QU'AU TOUCHER SUIVANT,
// ailleurs. Dans un jeu où le survol ressemble à « case choisie », cela raconte
// une réponse que l'élève n'a pas donnée.
//
// CE N'ÉTAIT PAS UN DÉFAUT DE CE JEU. Compté sur tout le dépôt : 297 règles
// `:hover` changeaient l'apparence, et NEUF étaient protégées.
//
// MESURÉ DANS LE NAVIGATEUR, à 390 × 844 au doigt, en comptant les règles de
// survol que le navigateur applique ENCORE :
//
//     avant : 222 vivantes · 17 éteintes
//     après :   8 vivantes · 231 éteintes
//
// LES HUIT QUI RESTENT NE CHANGENT QU'UN SOULIGNEMENT (`.ec-lien:hover` et ses
// pareilles). Un soulignement qui s'attarde ne se confond avec aucune réponse ;
// c'est la frontière que `tools/survolColle.mjs` s'est donnée, et elle est
// écrite : on protège ce qui se VOIT comme un état — fond, bordure, ombre,
// couleur, transformation.
//
// ET L'ORDINATEUR NE CHANGE PAS D'UN PIXEL : `@media (hover: hover)` est vrai
// partout où un pointeur peut survoler, souris, pavé tactile, portable
// tactile. Seul le téléphone perd un effet qu'il ne pouvait de toute façon pas
// produire honnêtement.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyser } from '../tools/survolColle.mjs';

test('AUCUNE RÈGLE DE SURVOL NE S\'APPLIQUE ENCORE SUR UN TÉLÉPHONE', () => {
    // L'ÉPREUVE ET L'OUTIL LISENT LE MÊME CODE, et c'est voulu : une épreuve
    // qui réécrirait la même analyse finirait par juger autre chose que ce que
    // l'outil corrige.
    const restants = analyser();
    const dit = restants.map(r => `${r.fichier} (${r.comptes})`).join(', ');
    assert.equal(restants.length, 0,
        'ces fichiers posent un survol qui se VOIT, sans le protéger de '
        + `@media (hover: hover) — sur un téléphone il resterait collé : ${dit}`);
});

test('LE JEU QUI L\'A RÉVÉLÉ PORTE LA CORRECTION', () => {
    const JEU = readFileSync(new URL('../js/games/chuteDecimaux.js', import.meta.url), 'utf8');
    // La case de la droite graduée : son survol et son curseur portaient la
    // MÊME couleur de fond, ce qui rendait les deux indiscernables sur la
    // capture de Rémy.
    const i = JEU.indexOf('.cd-case:hover');
    assert.ok(i > 0, 'la règle de survol des cases doit exister');
    const avant = JEU.slice(Math.max(0, i - 200), i);
    assert.match(avant, /@media \(hover: hover\) \{/,
        'le survol des cases doit être sous la requête : c\'est lui que le doigt '
        + 'laissait allumé');
});
