// DESSINER AVEC LA TORTUE — et dire si c'est la bonne figure.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, 19 novembre : « aussi des fonctions et du dessin », puis « des petits
// jeux simples c'est toujours motivant ». Le jeu est le plus simple qui soit :
// un modèle est tracé à côté, et il faut écrire le programme qui le refait.
//
// ── CE QUI SE GARDE ICI, ET CE QUI NE PEUT PAS S'Y GARDER ────────────────
//
// Le VRAI verdict se mesure dans un navigateur, avec la vraie tortue :
// `node tools/dessinPython.mjs` imprime le tableau des ressemblances et exige
// qu'un trou sépare les figures justes des fausses. C'est lui qui a fixé le
// seuil, et c'est lui qu'il faut relire quand on touche à la grille.
//
// CE FICHIER-CI GARDE LA MÉCANIQUE, en quatre millisecondes : qu'un dessin
// vide ne ressemble à rien, qu'un décalage d'une case soit pardonné et pas
// davantage, et que les marches de dessin portent bien ce qu'il faut pour que
// le modèle puisse être tracé. Sans cela, le défaut ne se verrait qu'à
// l'écran, et seulement si quelqu'un regarde.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import { ressemblance, memeFigure, SEUIL, COTE_GRILLE } from '../js/core/python/dessin.js';
import { pythonEcrireGenerator, ETAPES } from '../js/core/generators/pythonPasAPas.js';

const MARCHES_DESSIN = ETAPES.filter((e) => e.genre === 'dessin').map((e) => e.id);

/** Une grille vide. */
const vide = () => new Array(COTE_GRILLE * COTE_GRILLE).fill('0');

/** Le contour d'un carré, posé en (x, y), de côté `c` cases. */
function carre(x, y, c) {
    const g = vide();
    const mettre = (i, j) => {
        if (i < 0 || j < 0 || i >= COTE_GRILLE || j >= COTE_GRILLE) return;
        g[j * COTE_GRILLE + i] = '1';
    };
    for (let k = 0; k < c; k++) {
        mettre(x + k, y); mettre(x + k, y + c - 1);
        mettre(x, y + k); mettre(x + c - 1, y + k);
    }
    return g.join('');
}

test('UN DESSIN VIDE NE RESSEMBLE À RIEN', () => {
    // Rendre 1 pour deux dessins vides déclarerait JUSTE un programme qui ne
    // dessine pas — c'est-à-dire la copie blanche.
    assert.equal(ressemblance(vide().join(''), vide().join('')), 0);
    assert.equal(ressemblance(vide().join(''), carre(10, 10, 20)), 0);
    assert.equal(ressemblance(carre(10, 10, 20), vide().join('')), 0);
    assert.ok(!memeFigure(vide().join(''), carre(10, 10, 20)));
});

test('UN DÉCALAGE D’UNE CASE EST PARDONNÉ, PAS DAVANTAGE', () => {
    // ── POURQUOI ON PARDONNE ─────────────────────────────────────────────
    //
    // La tortue part du centre, et un trait qui commence au pixel 200 ou 201
    // ne tombe pas dans la même case. Refuser une figure juste pour un pixel
    // est la pire chose qu'un exercice de programmation puisse faire.
    const modele = carre(20, 20, 20);
    assert.ok(memeFigure(carre(21, 20, 20), modele), 'une case de décalage est refusée');
    assert.ok(memeFigure(carre(20, 21, 20), modele));
    // ── ET POURQUOI ON NE PARDONNE PAS PLUS ──────────────────────────────
    //
    // Au-delà, ce n'est plus un pixel d'arrondi : c'est une figure posée
    // ailleurs, et l'élève le VOIT, puisque le modèle est à côté.
    assert.ok(!memeFigure(carre(26, 20, 20), modele), 'six cases de décalage sont acceptées');
});

test('UNE FIGURE DEUX FOIS TROP GRANDE N’EST PAS LA MÊME', () => {
    const modele = carre(20, 20, 16);
    assert.ok(!memeFigure(carre(20, 20, 32), modele));
    assert.ok(!memeFigure(carre(20, 20, 8), modele));
});

test('ET LA MESURE PUNIT LE TRAIT EN TROP AUTANT QUE LE TRAIT EN MOINS', () => {
    // ── LA RAISON DU `Math.min` ──────────────────────────────────────────
    //
    // Une mesure qui ne regarderait que « le modèle est-il couvert ? »
    // accepterait un dessin qui contient le modèle ET tout le reste — un
    // gribouillage plein écran serait déclaré juste.
    const modele = carre(20, 20, 16);
    const griffonnage = modele.split('').map((c, i) =>
        (c === '1' || i % 3 === 0) ? '1' : '0').join('');
    assert.ok(!memeFigure(griffonnage, modele),
        'un dessin qui recouvre tout passe pour le modèle');
});

test('LES MARCHES DE DESSIN PORTENT DE QUOI TRACER LE MODÈLE', () => {
    assert.ok(MARCHES_DESSIN.length >= 4, `${MARCHES_DESSIN.length} marche(s) de dessin`);
    const jetons = new Set();
    for (const m of MARCHES_DESSIN) {
        for (let k = 0; k < 6; k++) {
            const it = pythonEcrireGenerator.generate({ marches: [m] },
                { rng: makeRng(`${m}/${k}`), index: 0, total: 1 });
            assert.equal(it.meta.genre, 'dessin', `${m} n’est pas marquée « dessin »`);
            assert.equal(it.answerKind, 'text');
            // SANS `solution`, L'ACTIVITÉ N'A RIEN À FAIRE TRACER : l'élève
            // verrait une planche vide en guise d'énoncé. Le générateur ne
            // peut pas dessiner lui-même — il n'a pas de navigateur.
            assert.match(it.meta.solution || '', /turtle/, `${m} n’a pas de modèle`);
            assert.match(it.meta.depart || '', /import turtle/,
                `${m} ne donne pas la tortue de départ`);
            // LE DÉPART NE DOIT PAS CONTENIR LA SOLUTION : ce serait l'énoncé
            // qui répond à sa propre question, le piège du 18 novembre.
            assert.ok(!it.meta.depart.includes('forward'),
                `${m} donne déjà le tracé dans le champ`);
            // LE JETON EST PROPRE À LA QUESTION : un jeton partagé laisserait
            // la réponse d'une figure valider la suivante.
            assert.match(it.answer, /^figure\//, `${m} : réponse « ${it.answer} »`);
            jetons.add(it.answer);
        }
    }
    assert.equal(jetons.size, MARCHES_DESSIN.length * 6,
        'deux questions de dessin partagent le même jeton de réponse');
});

test('LE SEUIL RESTE DANS LE TROU MESURÉ', () => {
    // `tools/dessinPython.mjs` mesure, dans un vrai navigateur, que les
    // figures justes rendent 1,000 et les fausses au plus 0,821. Si quelqu'un
    // déplace le seuil hors de ce trou, la mesure ne veut plus rien dire — et
    // il vaut mieux l'apprendre ici qu'en corrigeant des copies.
    assert.ok(SEUIL > 0.83 && SEUIL < 0.99, `seuil ${SEUIL} hors du trou mesuré`);
});
