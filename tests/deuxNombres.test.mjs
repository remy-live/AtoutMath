// LES DEUX NOMBRES — deux lectures d'une même suite, qui se chevauchent.
//
// RÉMY, quatre pages d'un magazine de jeux à l'appui : « j'aimerais bien ces
// jeux en français et en rapport avec les maths ». Le quatrième s'appelait
// « A 1-Off Puzzle » : « RABT » y cache BAR et TAB, qui partagent deux lettres.
//
// JE LUI AI DIT QUE C'ÉTAIT LE PLUS FAIBLE DES QUATRE côté mathématiques —
// c'est un jeu de lettres, et le catalogue en a déjà deux. Il a répondu « fais
// les tous ». L'idée est gardée, la matière a changé : des CHIFFRES, et deux
// NOMBRES liés par une phrase.
//
// CE QUE ÇA TRAVAILLE, et qui n'est pas une évidence : « 2 4 8 » contient 24 et
// 48, mais PAS 28 — les chiffres ne se sautent pas. Puis le chevauchement
// oblige à compter un chiffre deux fois, ce qui dérange, et s'apprend.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import {
    genererDeuxNombres, verifierDeuxNombres, placesDe, RELATIONS, PALIERS_DEUX_NOMBRES
} from '../js/core/deuxNombres.js';

test('UN NOMBRE SE LIT D\'AFFILÉE, ET LES CHIFFRES NE SE SAUTENT PAS', () => {
    const ligne = ['2', '4', '8'];
    assert.deepEqual(placesDe(ligne, 24), [0]);
    assert.deepEqual(placesDe(ligne, 48), [1]);
    assert.deepEqual(placesDe(ligne, 4), [1]);
    // C'est la leçon du jeu : 28 est dans la ligne à l'œil, pas à la lecture.
    assert.deepEqual(placesDe(ligne, 28), []);
    assert.deepEqual(placesDe(ligne, 248), [0]);
    // Un chiffre répété se lit à ses deux places.
    assert.deepEqual(placesDe(['3', '3', '3'], 33), [0, 1]);
});

test('CHAQUE RELATION SAIT SE DIRE ET SE VÉRIFIER AU MÊME ENDROIT', () => {
    // Une phrase qui s'écrirait ici et se vérifierait ailleurs finirait par
    // mentir — c'est arrivé ailleurs dans ce dépôt, deux fois.
    for (const [cle, R] of Object.entries(RELATIONS)) {
        assert.ok(R.texte && R.texte.length > 20, `${cle} : pas de phrase`);
        assert.ok(R.court && R.court.length > 5, `${cle} : pas de forme courte`);
        for (let a = 1; a <= 200; a++) {
            assert.equal(R.tient(a, R.deA(a)), true, `${cle} : deA et tient divergent en ${a}`);
        }
        assert.equal(R.tient(10, R.deA(10) + 1), false, `${cle} : accepte n'importe quoi`);
    }
});

test('LE FABRICANT CACHE VRAIMENT DEUX NOMBRES QUI SE CHEVAUCHENT', () => {
    for (const [nom, P] of Object.entries(PALIERS_DEUX_NOMBRES)) {
        for (let i = 0; i < 100; i++) {
            const g = genererDeuxNombres({ rng: makeRng(nom + i), ...P });
            assert.ok(g, `${nom} : pas de ligne au tirage ${i}`);
            const { a, b } = g.solution;
            // La relation annoncée est vraie.
            assert.equal(RELATIONS[g.relation].tient(a, b), true, `${nom} : ${a} et ${b}`);
            // Les deux ont la longueur promise par le palier.
            assert.equal(String(a).length, P.chiffres, `${nom} : ${a}`);
            assert.equal(String(b).length, P.chiffres, `${nom} : ${b}`);
            // Ils se lisent dans la ligne, et se chevauchent d'un chiffre.
            assert.equal(verifierDeuxNombres(g, a, b).ok, true,
                `${nom} tirage ${i} : ${g.ligne.join(' ')} → ${a} et ${b}`);
            // Et la ligne porte bien le bruit annoncé : sans lui, elle
            // commencerait toujours par le nombre de gauche.
            assert.equal(g.ligne.length, 2 * P.chiffres - 1 + P.bruit, `${nom} : ligne trop courte`);
        }
    }
});

test('LE JUGE REFUSE POUR LA BONNE RAISON', () => {
    const g = {
        ligne: ['1', '2', '4', '8'], relation: 'double',
        texte: RELATIONS.double.texte, court: RELATIONS.double.court, chiffres: 2,
        solution: { a: 12, b: 24, debutA: 0, debutB: 1 }
    };
    // La bonne paire, et une AUTRE bonne paire : la ligne en cache deux, et
    // refuser la seconde serait une faute d'énoncé.
    assert.equal(verifierDeuxNombres(g, 12, 24).ok, true);
    assert.equal(verifierDeuxNombres(g, 24, 48).ok, true, '24 et 48 sont aussi dans 1 2 4 8');
    // Un nombre absent : on dit POURQUOI, et c'est la leçon.
    const absent = verifierDeuxNombres(g, 18, 36);
    assert.equal(absent.problemes[0].genre, 'absent');
    assert.match(absent.problemes[0].message, /ne se lit pas/);
    // La relation fausse.
    assert.equal(verifierDeuxNombres(g, 12, 48).problemes[0].genre, 'relation');
    // Rien d'écrit.
    assert.equal(verifierDeuxNombres(g, '', '').problemes[0].genre, 'vide');
});

test('DEUX NOMBRES COLLÉS NE SONT PAS DEUX NOMBRES QUI SE CHEVAUCHENT', () => {
    // C'est tout le jeu : il leur faut UN chiffre en commun, pas zéro.
    const g = {
        ligne: ['1', '2', '2', '4'], relation: 'double',
        texte: RELATIONS.double.texte, court: RELATIONS.double.court, chiffres: 2,
        solution: { a: 12, b: 24, debutA: 0, debutB: 2 }
    };
    const r = verifierDeuxNombres(g, 12, 24);
    assert.equal(r.ok, false);
    assert.equal(r.problemes[0].genre, 'chevauchement');
    assert.match(r.problemes[0].message, /sans se chevaucher/);
});
