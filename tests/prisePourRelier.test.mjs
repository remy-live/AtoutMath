// UNE CIBLE DE QUATORZE PIXELS NE SE VISE PAS AU DOIGT.
//
// Rémy, capture d'iPhone sur « Relier sans Croiser » : « dur dur au
// téléphone ». Il ne parlait pas de la difficulté du jeu.
//
// MESURÉ : un carré à relier fait 14 px de côté sur un téléphone de 390 px,
// contre 27 sur un ordinateur. Il fallait poser le doigt DEDANS pour commencer
// un trait, puis le relever DEDANS pour le finir. Le dépôt exige 44 px de cible
// partout ailleurs — « la largeur moyenne de la pulpe d'un index » ; ici on en
// demandait un tiers, pour un geste de précision.
//
// ON NE GROSSIT PAS LES CARRÉS. Leur taille EST la figure, et l'élève doit voir
// à l'écran le même dessin que sur la feuille qu'il aura à tracer au crayon.
// C'est la PRISE qu'on élargit : viser à côté revient à viser dedans, et le
// point retenu est ramené SUR le carré — sans quoi `verifierTrait`, qui exige
// un départ et une arrivée dans un carré, refuserait le trait qu'on vient
// d'aider. La tolérance vaut 22 px d'écran, convertis en unités de dessin pour
// qu'elle soit la même à toutes les tailles d'écran.
//
// MESURÉ EN REFAISANT LE GESTE, appui à N pixels du BORD du carré :
//
//                        avant      après
//     dedans ..........  démarre    démarre
//     à  5 px du bord .  RIEN       démarre
//     à 15 px du bord .  RIEN       démarre
//     à 60 px du bord .  RIEN       RIEN
//
// La dernière ligne compte autant que les autres : une tolérance sans limite
// n'est plus une aide, c'est un tirage au sort. La cible utile passe de 14 px
// à 58 — au-dessus du plancher du dépôt — sans qu'un seul pixel du dessin
// change.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const JEU = readFileSync(new URL('../js/games/sansCroiser.js', import.meta.url), 'utf8');

test('LA PRISE EST PLUS LARGE QUE LE CARRÉ', () => {
    assert.match(JEU, /carreVise\(p\) \{/,
        'le carré visé doit se chercher, pas seulement se contenir');
    assert.match(JEU, /const portee = 22 \* this\.uniteParPixel\(\);/,
        'la portée se compte en PIXELS D\'ÉCRAN puis se convertit : une tolérance '
        + 'exprimée en unités de dessin changerait de taille avec l\'écran');
    assert.match(JEU, /return mieux <= portee \? meilleur : null;/,
        'et elle a une limite — sans quoi n\'importe quel appui démarrerait '
        + 'n\'importe quel trait');
});

test('LE POINT RETENU EST RAMENÉ SUR LE CARRÉ', () => {
    // LE PIÈGE : aider le doigt sans corriger le point donnerait un trait dont
    // le premier point est HORS du carré, et `verifierTrait` le refuserait —
    // on aurait rendu le jeu plus facile à commencer et impossible à réussir.
    const i = JEU.indexOf('carreVise(p) {');
    const bloc = JEU.slice(i, i + 700);
    assert.match(bloc, /Math\.min\(Math\.max\(p\.x, k\.x\), k\.x \+ k\.l\)/,
        'le point est projeté sur le carré le plus proche');
    assert.match(bloc, /meilleur = \{ carre: k, point: \{ x, y \} \}/,
        'et c\'est ce point-là qu\'on retient, pas celui du doigt');
});

test('L\'ARRIVÉE SE RATTRAPE COMME LE DÉPART', () => {
    // Relever le doigt à côté du carré jumeau annulait tout le trait qu'on
    // venait de tracer — le pire moment pour perdre un élève.
    assert.match(JEU, /const bout = t\.points\[t\.points\.length - 1\];\s*\n\s*const vise = this\.carreVise\(bout\);/,
        'le dernier point cherche lui aussi son carré');
    assert.match(JEU, /if \(vise && !dansRect\(bout, vise\.carre\)\) t\.points\.push\(vise\.point\);/,
        'et on ne rallonge le trait que s\'il n\'y était pas déjà');
});
