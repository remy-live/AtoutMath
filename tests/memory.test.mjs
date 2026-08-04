// Disposition du jeu des paires : le nombre de colonnes ne doit plus dépendre
// du seul nombre de cartes, mais de l'espace RÉELLEMENT disponible — c'est ce
// qui produisait des lamelles verticales de 50 × 80 px sur téléphone.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { meilleuresColonnes, mesurerCarte, FORMAT_MIN, FORMAT_MAX } from '../js/games/memoryLayout.js';

// Cadres de jeu réellement mesurés dans le navigateur.
const CADRES = [
    ['iPhone portrait', 334, 594],
    ['iPhone paysage', 700, 300],
    ['tablette portrait', 780, 1050],
    ['ordinateur', 1000, 700],
    ['grand écran', 1200, 800]
];

test('téléphone en portrait : les cartes ne sont plus des lamelles', () => {
    const cols = meilleuresColonnes(20, 334, 594, 8);
    assert.ok(cols <= 4, `${cols} colonnes sur un téléphone en portrait, c'est trop`);
    const { largeurCarte } = mesurerCarte(20, cols, 334, 594, 8);
    assert.ok(largeurCarte >= 72, `cartes de ${largeurCarte.toFixed(0)} px de large — un calcul n'y tient pas`);
});

test('le découpage bancal du départ est écarté', () => {
    // Le cas exact du signalement : 20 cartes sur un iPhone en portrait
    // donnaient six colonnes de lamelles.
    assert.notEqual(meilleuresColonnes(20, 334, 594, 8), 6);
});

test('une dernière rangée incomplète ne laisse jamais un grand trou', () => {
    // Elle est centrée à l'affichage, mais il ne doit pas y manquer la moitié
    // d'une rangée pour autant.
    for (const [nom, l, h] of CADRES) {
        for (const n of [12, 16, 20, 24]) {
            const cols = meilleuresColonnes(n, l, h, 10);
            const manquantes = (cols - n % cols) % cols;
            assert.ok(manquantes <= Math.floor(cols / 2),
                `${nom} (${n} cartes) : ${cols} colonnes laissent ${manquantes} cases vides`);
        }
    }
});

test('les cartes restent dans un format lisible', () => {
    for (const [nom, l, h] of CADRES) {
        for (const n of [12, 16, 20, 24]) {
            const cols = meilleuresColonnes(n, l, h, 10);
            const { largeurCarte, hauteurCarte } = mesurerCarte(n, cols, l, h, 10);
            const format = largeurCarte / hauteurCarte;
            assert.ok(format >= FORMAT_MIN - 0.001 && format <= FORMAT_MAX + 0.001,
                `${nom} (${n} cartes) : format ${format.toFixed(2)} hors bornes`);
            assert.ok(largeurCarte >= 44 && hauteurCarte >= 44,
                `${nom} (${n} cartes) : ${largeurCarte.toFixed(0)}×${hauteurCarte.toFixed(0)} px, trop petit pour un doigt`);
        }
    }
});

test('le plateau tient toujours dans le cadre', () => {
    for (const [nom, l, h] of CADRES) {
        for (const n of [8, 12, 16, 20, 24]) {
            const gap = 10;
            const cols = meilleuresColonnes(n, l, h, gap);
            const { largeurCarte, hauteurCarte, lignes } = mesurerCarte(n, cols, l, h, gap);
            const largeurTotale = largeurCarte * cols + gap * (cols - 1);
            const hauteurTotale = hauteurCarte * lignes + gap * (lignes - 1);
            assert.ok(largeurTotale <= l + 0.5,
                `${nom} (${n}) : débordement horizontal (${largeurTotale.toFixed(0)} > ${l})`);
            assert.ok(hauteurTotale <= h + 0.5,
                `${nom} (${n}) : débordement vertical (${hauteurTotale.toFixed(0)} > ${h})`);
        }
    }
});

test('le plateau occupe vraiment la place disponible', () => {
    // L'ancien plateau laissait un grand vide sous les cartes : on exige que
    // l'une des deux dimensions soit remplie à au moins 80 %.
    for (const [nom, l, h] of CADRES) {
        const gap = 10;
        const cols = meilleuresColonnes(20, l, h, gap);
        const { largeurCarte, hauteurCarte, lignes } = mesurerCarte(20, cols, l, h, gap);
        const occL = (largeurCarte * cols + gap * (cols - 1)) / l;
        const occH = (hauteurCarte * lignes + gap * (lignes - 1)) / h;
        assert.ok(Math.max(occL, occH) >= 0.8,
            `${nom} : plateau à ${(occL * 100).toFixed(0)} % en largeur et ${(occH * 100).toFixed(0)} % en hauteur`);
    }
});

test('le découpage retenu donne bien les cartes les plus grandes', () => {
    const aire = (n, c, l, h, gap) => {
        const m = mesurerCarte(n, c, l, h, gap);
        return m.largeurCarte * m.hauteurCarte;
    };
    for (const [nom, l, h] of CADRES) {
        const n = 20, gap = 10;
        const cols = meilleuresColonnes(n, l, h, gap);
        const retenue = aire(n, cols, l, h, gap);
        for (let c = 1; c <= n; c++) {
            // 20 % de tolérance : tout ce qu'on cède pour un plateau mieux dessiné.
            assert.ok(retenue / 0.8 + 1 >= aire(n, c, l, h, gap),
                `${nom} : ${c} colonnes donnent une carte plus grande que celle retenue`);
        }
    }
});

test('un nombre premier de cartes ne dégénère pas en bande', () => {
    const cols = meilleuresColonnes(13, 334, 594, 8);
    assert.ok(cols > 1 && cols < 13, `${cols} colonnes pour 13 cartes : bande dégénérée`);
});
