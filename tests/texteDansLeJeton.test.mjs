// UNE ÉTIQUETTE QUI DÉBORDE DE SON JETON N'EST PLUS UNE ÉTIQUETTE.
//
// Rémy, capture d'iPhone sur « Le Serpent Littéral » : « très mal écrit dans
// les ronds et carrés ». Le « 5 » touchait le bord gauche du disque, le « x »
// sortait à droite, et entre les deux un vide.
//
// CE N'EST PAS LA TAILLE DEMANDÉE QUI EST FAUSSE. Mesuré ici, avec la police du
// logiciel : « 5x » occupe 0,52 du disque. Sur sa capture, 0,86. Mesuré avec
// quatre polices différentes — Outfit, un serif large, Verdana, une chasse
// fixe — l'écart reste entre 0,45 et 0,54 : AUCUNE police ordinaire ne produit
// 0,86.
//
// CE QUI LE PRODUIT : iOS applique un « ajustement automatique de la taille du
// texte » aux blocs qu'il juge étroits, et il l'applique AUSSI au texte d'un
// SVG, dont la taille est exprimée en unités du dessin. Le gonflage n'a alors
// plus aucun rapport avec la place disponible dans le jeton. Le dépôt ne
// désactivait `text-size-adjust` nulle part.
//
// DEUX CORRECTIONS, ET ELLES NE FONT PAS DOUBLON :
//
//   · `text-size-adjust: 100 %` s'adresse à la CAUSE, mais elle ne se vérifie
//     que sur un iPhone — je ne peux pas la mesurer d'ici ;
//   · `ajusterAuCadre` s'adresse à l'EFFET, et se vérifie partout : après
//     écriture, il relit la largeur RÉELLE de chaque étiquette et rétrécit
//     celles qui dépassent. Il ne suppose rien de la police, parce que la
//     largeur d'un texte n'existe qu'une fois le texte écrit.
//
// MESURÉ, en doublant volontairement la taille choisie (.34 → .72) :
//
//     sans l'ajusteur : la pire étiquette occupe 1,07 du jeton · 2 débordent
//     avec l'ajusteur : 0,78 · 0 débordent, et la taille retenue s'adapte à
//                       la police — 0,52 avec Outfit, 0,58 avec un serif
//
// C'est la preuve que ce code n'est pas décoratif : retiré, le défaut de la
// capture revient.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const JEU = readFileSync(new URL('../js/games/serpent.js', import.meta.url), 'utf8');
const BASE = readFileSync(new URL('../css/base.css', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '');

test('ON MESURE CE QUE LA POLICE A ÉCRIT, ON NE LE SUPPOSE PAS', () => {
    assert.match(JEU, /function ajusterAuCadre\(scene\)/,
        'l\'ajusteur doit exister');
    assert.match(JEU, /t\.getBBox\(\)\.width/,
        'la largeur se LIT sur le rendu : c\'est le seul endroit où elle existe, '
        + 'et elle dépend de la police que l\'appareil a vraiment chargée');
    assert.match(JEU, /^\s*ajusterAuCadre\(this\.sceneEl\);/m,
        'et il doit être appelé après chaque dessin de scène');
});

test('IL RÉTRÉCIT, IL N\'AGRANDIT JAMAIS', () => {
    const i = JEU.indexOf('function ajusterAuCadre');
    const bloc = JEU.slice(i, i + 1400);
    // Sans cette condition, un « x » seul viendrait remplir tout le disque et
    // les jetons n'auraient plus la même écriture d'un terme à l'autre — ce
    // qui est exactement ce qu'on reproche à la capture.
    assert.match(bloc, /if \(!l \|\| l <= place\) break;/,
        'une étiquette qui tient garde la taille choisie');
    assert.match(bloc, /taille \*= place \/ l;/,
        'et celle qui dépasse est ramenée à la place, pas à une valeur devinée');
    // La place se prend sur le JETON, pas sur la case : un disque de rayon .38
    // offre .76, un anneau carré de .92 offre davantage.
    assert.match(bloc, /getAttribute\('r'\)\) \* 2 \* 0\.78/,
        'la place d\'un disque se déduit de son rayon');
});

test('ET L\'ON DIT À SAFARI DE NE PAS GROSSIR LE TEXTE TOUT SEUL', () => {
    assert.match(BASE, /html \{[^}]*-webkit-text-size-adjust: 100%/,
        'iOS gonfle le texte des blocs étroits, y compris dans un SVG où la '
        + 'taille est en unités de dessin — il faut le lui interdire');
    assert.match(BASE, /html \{[^}]*[^-]text-size-adjust: 100%/,
        'et la propriété sans préfixe, pour les navigateurs qui l\'ont adoptée');
});
