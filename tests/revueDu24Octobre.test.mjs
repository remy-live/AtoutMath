// LA REVUE DE RÉMY DU 24 OCTOBRE — la feuille, et la place pour répondre.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// Douze relevés reçus en une matinée, onze remarques dans les carnets. Les
// douze contrôles automatiques disent « rien à signaler » : ce qu'il remonte
// là n'est pas de la panne, c'est du MÉTIER — et c'est exactement ce qu'aucun
// sondage ne sait voir. D'où ces épreuves, qui gardent ses décisions à lui.
//
// ── CE QUE CE FICHIER GARDE ────────────────────────────────────────────────
//
//   · les colonnes qu'il a demandées, exercice par exercice ;
//   · la LIGNE à compléter au lieu d'une question suivie de deux lignes
//     vides ;
//   · et la place que chaque question demande pour elle-même.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { readFileSync } from 'node:fs';
import { exercices } from '../js/data/catalog.js';
import { makeRng } from '../js/core/ids.js';
import { divisionFractionsGenerator } from '../js/core/generators/divisionFractions.js';
import pythagoreReciproqueGenerator from '../js/core/generators/pythagoreReciproque.js';
import { texteImprime } from '../js/core/fiche.js';

test('LES COLONNES QU\'IL A DEMANDÉES', () => {
    // « en impression, 3 colonnes de base » — deux fois, mot pour mot. Et
    // « par défaut, mets 2 colonnes dans l'impression » sur Pythagore.
    const colonnes = (id) => {
        const e = exercices.find(x => x.id === id);
        assert.ok(e, `l'exercice ${id} doit exister`);
        return e.colonnesPapier;
    };
    assert.equal(colonnes('calc-detour-rond'), 3);
    assert.equal(colonnes('num-relatifs-melange-sprint'), 3);
    assert.equal(colonnes('geo-pythagore-reciproque'), 2);
});

test('SUR LE PAPIER, ON ÉCRIT LA LIGNE À COMPLÉTER', () => {
    // CE QUE LA FEUILLE FAISAIT : « Quel est l'inverse de 9/2 ? » et, dessous,
    // deux longues lignes de pointillés. Deux lignes ne demandent pas une
    // fraction, elles demandent une phrase — et l'élève y écrit un nombre à
    // virgule. La FORME de la place à remplir enseigne ce qu'on attend.
    const vues = new Map();
    for (let i = 0; i < 60; i++) {
        const it = divisionFractionsGenerator.generate({},
            { index: i, total: 60, rng: makeRng('r' + i), papier: true });
        vues.set(it.meta.marche, it.prompt.papier);
    }
    // « …/… » est ce que la mise en page reconnaît comme un étage de fraction
    // vide : elle empile alors deux cases sous une barre.
    assert.match(vues.get('inverse'), /^Inverse de \d+\/\d+ : …\/…$/);
    assert.match(vues.get('inverse-entier'), /^Inverse de \d+ : …\/…$/);
    assert.match(vues.get('produit-un'), /^\d+\/\d+ × …\/… = 1$/);
    assert.match(vues.get('par-un-entier'), /^\d+\/\d+ ÷ \d+ = …\/…$/);
    // LA LIGNE QU'IL A ÉCRITE DANS SON CARNET, mot pour mot :
    // « 3/2 : 6/7 = .../... * .../.... = ».
    assert.match(vues.get('par-une-fraction'),
        /^\d+\/\d+ ÷ \d+\/\d+ = …\/… × …\/… = …\/…$/);
    // ET L'ÉCRAN NE BOUGE PAS : il pose la question en toutes lettres.
    const ecran = divisionFractionsGenerator.generate({ marches: ['inverse'] },
        { index: 0, total: 1, rng: makeRng('e') });
    assert.match(ecran.prompt.text, /^Quel est l'inverse de/);
});

test('ET CES LIGNES-LÀ DONNENT DE VRAIS TROUS DE FRACTION', () => {
    // L'ÉPREUVE QUI MANQUAIT À LA PREMIÈRE. Écrire « …/… » ne sert à rien si
    // la mise en page n'y voit pas une fraction à deux étages vides : on
    // aurait une belle chaîne et deux traits côte à côte sur le papier.
    // `texteImprime` transforme chaque suite de points en une place bordée
    // d'insécables, et c'est CETTE forme que le motif des fractions reconnaît
    // (voir TROU_PERCE dans core/fiche.js).
    const t = texteImprime('Inverse de 7/3 : …/…', '3|7');
    const etages = t.split('/');
    assert.equal(etages.length, 3, `« ${t} » doit porter deux barres de fraction`);
    assert.match(etages[2], /^  {3,} $/,
        'le second étage doit être une place à remplir, pas des points');
});

test('CHAQUE QUESTION DEMANDE LA PLACE QU\'IL FAUT', () => {
    // RÉMY : « Quand tu demandes quel est le côté le plus long, une seule
    // ligne suffit pour répondre. Quand on demande si le triangle est
    // rectangle (et qu'il faut calculer), tu peux laisser un peu plus de ligne
    // (6 de pointillé) ».
    const vues = new Map();
    for (let i = 0; i < 60; i++) {
        const it = pythagoreReciproqueGenerator.generate({},
            { index: i, total: 60, rng: makeRng('p' + i) });
        vues.set(it.meta.marche, it.meta.lignesPapier);
    }
    assert.equal(vues.get('le-plus-long'), 1);
    assert.equal(vues.get('le-sommet'), 1);
    assert.equal(vues.get('conclure'), 6);
    assert.equal(vues.get('conclure-donne'), 6);
    assert.equal(vues.get('probleme'), 6);
});

test('LA FEUILLE HONORE CE QUE LA QUESTION DEMANDE', () => {
    // LE CHAÎNON QUI PORTE TOUT : sans lui, le générateur déclare dans le vide.
    // Trois fichiers, trois lignes, et une seule qui manque suffit à rendre la
    // déclaration muette — c'est le genre de chemin qu'on croit branché.
    const print = readFileSync(new URL('../js/ui/printQuestions.js', import.meta.url), 'utf8');
    assert.match(print, /lignes: \(item\.meta && item\.meta\.lignesPapier\) \|\| null,/);
    const fiche = readFileSync(new URL('../js/core/fiche.js', import.meta.url), 'utf8');
    // LA QUESTION PASSE DEVANT LE RÉGLAGE DE LA FEUILLE, et pas l'inverse :
    // un exercice qui sait ce qu'il attend en sait plus qu'un menu global.
    assert.match(fiche, /const nRepQ = Math\.max\(0, Math\.round\(Number\(q\.lignes\) \|\| 0\)\);/);
    assert.match(fiche, /const nRep = nRepQ \|\| Math\.max\(0, Math\.round\(Number\(o\.lignesReponse\) \|\| 0\)\);/);
    // UNE LIGNE VAUT SEPT MILLIMÈTRES, le même chiffre que le menu : six
    // lignes demandées ici et six demandées là-bas doivent donner la même
    // hauteur, sinon le réglage et la déclaration se contredisent sur la même
    // feuille.
    assert.match(fiche, /const hRep = nRepQ \? Math\.max\(o\.ligneReponse, 7 \* nRepQ\) : ligneRep;/);
    assert.match(fiche, /nRep, hRep,/);
    assert.match(fiche, /const pas = \(cell\.hRep \|\| ligneRep\) \/ nRep;/);
});
