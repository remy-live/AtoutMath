// LE CONTOUR D'UN SERPENT — ce qui remplace la couleur sur le papier.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// À l'écran, l'élève COLORIE : chaque serpent prend une teinte, et c'est ainsi
// qu'on les distingue. Sur une feuille photocopiée, les teintes deviennent des
// gris qui se ressemblent — et l'élève n'a de toute façon pas sept crayons.
//
// Le corrigé trace donc le CONTOUR de chaque serpent. C'est de la géométrie
// pure, elle se tient ici, et elle a une façon précise de se tromper : si l'on
// dessinait TOUS les bords des cases au lieu des seuls bords EXTÉRIEURS, on
// obtiendrait un quadrillage noir où aucun serpent ne se distinguerait plus.
// La feuille serait pleine de traits et vide d'information, et cela ne se voit
// qu'en regardant une grille imprimée.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contourDuSerpent, serpentsFicheGenerator } from '../js/core/generators/serpentsFiche.js';
import { estUnSerpent, PALIERS_SERPENTS } from '../js/core/serpents.js';
import { makeRng } from '../js/core/ids.js';

/** Un bord, en texte, pour comparer deux ensembles sans dépendre de l'ordre. */
const clef = (s) => `${s.x1},${s.y1}-${s.x2},${s.y2}`;
const bords = (cases, l, c) => contourDuSerpent(cases, l, c).map(clef).sort();

test('UNE CASE SEULE A QUATRE BORDS', () => {
    // Le cas le plus simple, et celui qui dit la convention : les coordonnées
    // sont des COINS de case, pas des centres.
    assert.deepEqual(bords([0], 3, 3), ['0,0-0,1', '0,0-1,0', '0,1-1,1', '1,0-1,1'].sort());
});

test('LES BORDS INTÉRIEURS NE SONT JAMAIS TRACÉS', () => {
    // C'est TOUT le sujet. Deux cases voisines du même serpent partagent un
    // bord ; le tracer couperait le serpent en deux aux yeux du lecteur.
    const deux = contourDuSerpent([0, 1], 3, 3);
    assert.equal(deux.length, 6, 'deux cases côte à côte : six bords, pas huit');
    assert.ok(!deux.map(clef).includes('1,0-1,1'),
        'le bord qui sépare les deux cases ne doit pas être tracé');
});

test('UN SERPENT QUI TOURNE GARDE UN CONTOUR FERMÉ', () => {
    // Trois cases en L. Un contour fermé a autant de bords que de côtés
    // extérieurs : 3 cases × 4 côtés − 2 × 2 côtés partagés = 8.
    const L = contourDuSerpent([0, 1, 4], 3, 3);     // (0,0) (0,1) (1,1)
    assert.equal(L.length, 8);
    // ET IL EST FERMÉ : chaque sommet touché l'est un nombre PAIR de fois.
    // Un contour ouvert laisserait un serpent qui « fuit » sur la feuille.
    const sommets = new Map();
    L.forEach(s => {
        for (const p of [`${s.x1},${s.y1}`, `${s.x2},${s.y2}`]) {
            sommets.set(p, (sommets.get(p) || 0) + 1);
        }
    });
    const impairs = [...sommets].filter(([, n]) => n % 2);
    assert.deepEqual(impairs, [], 'un contour ouvert n\'entoure rien');
});

test('LE BORD DE LA GRILLE COMPTE COMME UN DEHORS', () => {
    // Un serpent collé au bord doit quand même être entouré : sans cette
    // règle, il s'ouvrirait sur le vide et l'on ne verrait plus où il finit.
    const coin = contourDuSerpent([0], 1, 1);
    assert.equal(coin.length, 4, 'même seul dans sa grille, il a ses quatre bords');
});

test('LE GÉNÉRATEUR DE FICHE REND UNE GRILLE ENTIÈREMENT COUVERTE', () => {
    // Une case sans serpent est une case que l'élève ne peut pas remplir, et
    // une feuille qu'on ne peut pas corriger.
    for (let i = 0; i < 12; i++) {
        const q = serpentsFicheGenerator.generate(
            { palier: 'facile', etiquettes: 'nombres' },
            { rng: makeRng(), index: i, total: 12, papier: true });
        const m = q.meta;
        const prises = m.serpents.flatMap(s => s.cases);
        assert.equal(new Set(prises).size, prises.length, 'une case prise deux fois');
        assert.equal(prises.length, m.lignes * m.colonnes,
            `${prises.length} cases prises sur ${m.lignes * m.colonnes}`);
        // ET CHAQUE SERPENT EN EST UN, relu par le juge de l'élève lui-même.
        m.serpents.forEach(s => {
            assert.ok(estUnSerpent(s.cases, m.lignes, m.colonnes).ok,
                `un serpent de ${s.cases.length} cases n'en est pas un`);
            assert.equal(s.longueur, s.cases.length);
            assert.ok(s.cases.includes(s.tete), 'la tête doit être une case du serpent');
            assert.ok(s.contour.length > 0, 'chaque serpent porte son contour');
        });
    }
});

test('L\'ÉTIQUETTE EST TIRÉE UNE FOIS, ET ELLE DIT LA LONGUEUR', () => {
    // En « calculs », la tête porte « 2 × 3 » au lieu de 6. Si le calcul était
    // tiré au moment du dessin, il changerait entre l'aperçu et le PDF — et la
    // feuille de l'élève ne dirait pas la même chose que le corrigé.
    const q = serpentsFicheGenerator.generate(
        { palier: 'facile', etiquettes: 'calculs' },
        { rng: makeRng(), index: 0, total: 1, papier: true });
    q.meta.serpents.forEach(s => {
        assert.equal(typeof s.etiquette, 'string');
        assert.ok(s.etiquette.length > 0);
        // Un calcul se relit : il doit valoir la longueur.
        const valeur = Function(`"use strict"; return (${s.etiquette
            .replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-')})`)();
        assert.equal(valeur, s.longueur,
            `« ${s.etiquette} » ne vaut pas ${s.longueur}`);
    });
});

test('LES PALIERS DONNENT BIEN DES GRILLES DE TAILLES DIFFÉRENTES', () => {
    // Un réglage qui ne change rien est un réglage qui ment au professeur.
    const tailles = Object.keys(PALIERS_SERPENTS).map(palier => {
        const q = serpentsFicheGenerator.generate({ palier },
            { rng: makeRng(), index: 0, total: 1, papier: true });
        return `${q.meta.lignes}x${q.meta.colonnes}`;
    });
    assert.equal(new Set(tailles).size, tailles.length,
        `deux paliers donnent la même grille : ${tailles.join(' ')}`);
});
