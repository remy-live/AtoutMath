// « RELIE LES POINTS » N'ÉCRIT PAS SON TITRE DEUX FOIS SUR UN ÉCRAN COURT.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, capture d'iPhone du 13 octobre : « idem c'est petit ». Sur l'image, on
// lit « Relie les points » DEUX fois — une dans la barre du haut, que le
// meneur affiche pour tout exercice, et une dans le jeu lui-même.
//
// MESURÉ : dans un plateau de 354 px, le mobilier prend 252 px — titre 77,
// barre des boutons 144, note 31 — et la grille reçoit les 170 qui restent.
// Vingt de ces pixels n'étaient qu'une répétition.
//
// ── CE QUE CETTE ÉPREUVE GARDE, ET CE QU'ELLE NE GARDE PAS ────────────────
//
// Elle garde que le titre du jeu se tait quand la place manque — et seulement
// alors : sur le téléphone d'un élève, le plateau fait 758 px et le titre
// reste, parce qu'il n'y coûte rien.
//
// Elle ne garde PAS la taille de la grille, qui ne se règle pas ici : à 844 px
// elle fait 330 px, soit 85 % de la largeur de l'écran, et c'est le maximum
// qu'une grille carrée puisse prendre. `node tools/apercuContreEleve.mjs` le
// mesure, et c'est lui qui a répondu à la vraie question de Rémy — « est-ce
// manière générale, ou parce que c'est le mode aperçu ? »

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('js/games/relier.js', 'utf8');

test('LE TITRE DU JEU SE TAIT QUAND LE PLATEAU EST COURT', () => {
    // On cherche le bloc de requête par la hauteur, puis le titre DEDANS :
    // trouver « .rp-titre { display: none } » n'importe où dans le fichier ne
    // garderait rien, car la règle pourrait être devenue inconditionnelle et
    // le titre aurait alors disparu aussi chez l'élève.
    const i = source.indexOf('@container (max-height: 520px)');
    assert.notEqual(i, -1,
        'le bloc « @container (max-height: 520px) » a disparu de js/games/relier.js :\n'
        + 'le titre du jeu redeviendra visible sur un plateau court, où il répète\n'
        + 'simplement celui de la barre du haut et coûte 20 px à la grille.');
    const bloc = source.slice(i, source.indexOf('}', source.indexOf('{', i) + 1) + 1);
    assert.match(bloc, /\.rp-titre\s*\{[^}]*display:\s*none/,
        'le bloc des plateaux courts ne fait plus taire le titre du jeu.\n'
        + `      ${bloc.replace(/\s+/g, ' ').slice(0, 120)}`);
});

test('ET IL RESTE VISIBLE PARTOUT AILLEURS', () => {
    // L'autre moitié, et celle qu'on oublie : une règle inconditionnelle
    // passerait la première épreuve en cachant le titre à TOUT LE MONDE.
    const horsBloc = source.split('@container (max-height: 520px)')[0];
    assert.ok(!/\.rp-titre\s*\{[^}]*display:\s*none/.test(horsBloc),
        'le titre du jeu est caché SANS condition de hauteur : il disparaîtra\n'
        + 'aussi sur le téléphone d\'un élève, où le plateau fait 758 px et où\n'
        + 'il ne coûte rien.');
});
