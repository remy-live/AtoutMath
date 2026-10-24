// CHOISIR UN EXERCICE EN GRAND.
//
// Rémy : « Tu peux même faire une modale dédiée à ce choix, parce que parfois
// les titres des vignettes ne tiennent pas dans le panneau latéral gauche et ça
// donne une sensation d'oppression. »
//
// MESURÉ. Dans la colonne de 319 px, l'arbre déplié fait 9 076 px pour une
// fenêtre de 595 — quinze écrans et demi — et 51 titres sur 172 sont ROGNÉS :
// « La Tour de Hanoï (Tour de Brahma) » tient dans 154 px quand il lui en faut
// 233. Dans la fenêtre : 172 exercices, 0 titre rogné.
//
// Le comportement complet se vérifie au navigateur (tools/tmp/verifChoix.mjs et
// sa variante téléphone). Ici on tient les décisions qui se défont en silence.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const lire = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const sansCommentaires = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const CX = sansCommentaires(lire('js/ui/choisirExercice.js'));
const BUILDER = sansCommentaires(lire('js/ui/builder.js'));
const HTML = lire('index.html').replace(/<!--[\s\S]*?-->/g, '');
const CSS = lire('css/modules.css');

test('DEUX PORTES MÈNENT À LA FENÊTRE', () => {
    // La loupe de la barre d'outils, et le bouton de l'état vide — c'est le
    // moment où l'on en a le plus besoin.
    assert.match(HTML, /id="btn-choisir-exo"/);
    assert.match(HTML, /id="btn-choisir-exo-vide"/);
    assert.match(BUILDER, /\['btn-choisir-exo', 'btn-choisir-exo-vide'\]/);
    assert.match(BUILDER, /ouvrirChoixExercice\(\{ ajouter: \(exo\) => addStep\(exo\.id\) \}\)/);
});

test('L\'ÉTAT VIDE DONNE LE GESTE, il ne le décrit pas', () => {
    // « Ajoutez des exercices depuis le catalogue » désignait la colonne de
    // gauche — celle où 51 titres sur 172 sont rognés.
    assert.ok(!/Ajoutez des\s+exercices depuis le catalogue/.test(HTML));
    assert.match(HTML, /Ce parcours est vide\./);
    assert.match(HTML, /Choisir un exercice<\/button>/);
});

test('ON N\'AJOUTE PAS UN SECOND CATALOGUE', () => {
    // `filterByStatus` reste la seule autorité sur ce qu'un rôle a le droit de
    // voir : un brouillon ne doit apparaître nulle part, pas même ici.
    assert.match(CX, /filterByStatus\(exercices, \{/);
    assert.match(CX, /only: state\.catalogFilter, teacher: state\.isTeacherMode/);
    // Et la recherche est celle du reste de l'application.
    assert.match(CX, /import \{ correspond \} from '\.\.\/core\/recherche\.js';/);
    assert.match(CX, /correspond\(ficheDe\(e\), mot\)/);
});

test('LA FENÊTRE NE SE FERME PAS QUAND ON AJOUTE', () => {
    // On en ajoute souvent trois à la suite ; rouvrir entre chaque serait deux
    // gestes pour rien. Le bouton dit qu'il a compris, et la fenêtre reste.
    assert.match(CX, /b\.textContent = '✓ Ajouté';/);
    assert.ok(!/fermerChoixExercice\(\);\s*\n\s*\}\;?\s*\n\s*\}\);\s*\n\s*\};/.test(CX));
    // Le seul endroit qui ferme est la réouverture — une fenêtre à la fois.
    assert.match(CX, /export function ouvrirChoixExercice\([\s\S]{0,120}fermerChoixExercice\(\);/);
});

test('L\'APERÇU SUIT LA LISTE', () => {
    // Si ce qu'on montrait disparaît du filtre, il ne reste pas à l'écran comme
    // un choix qu'on ne peut plus faire.
    assert.match(CX, /if \(montre && !g\.some\(e => e\.id === montre\)\)/);
    // Et la géométrie est la même que partout ailleurs, écrite une seule fois.
    assert.match(CX, /import \{ adapterAuContenu, ajusterDesQueDessine, motDeRelance \} from '\.\/apercuTiroir\.js';/);
});

test('CE QUE LE PROFESSEUR TAPE EST ÉCHAPPÉ', () => {
    // La liste se construit en HTML : un titre d'exercice ou un mot cherché
    // qui contiendrait un chevron ne doit pas devenir une balise.
    assert.match(CX, /const echapper = \(t\) =>/);
    assert.match(CX, /echapper\(e\.title\)/);
    assert.match(CX, /echapper\(e\.id\)/);
});

test('la fenêtre tient la règle des 44 px, elle aussi', () => {
    // Mesuré sur un téléphone : les pastilles de niveau tombaient à 36 px et le
    // champ de recherche à 40. Que la fenêtre faite pour choisir confortablement
    // soit la seule à ne pas tenir la règle serait le comble.
    assert.match(CSS, /@media \(pointer: coarse\) \{\s*\n\s*\.cx2-niv \{ min-height: 44px; \}/);
    assert.match(CSS, /\.cx2-ajouter \{[\s\S]{0,260}min-height: 44px;/);
    assert.match(CSS, /\.cx2-voir \{[\s\S]{0,260}min-height: 44px;/);
});
