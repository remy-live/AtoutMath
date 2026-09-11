// Régler plusieurs étapes d'un coup : le seuil est une PART, pas un nombre.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    seuilPourPart, partDe, communDe, appliquerAuxEtapes
} from '../js/core/reglagesGroupes.js';

const etape = (id, nbItems, threshold, extra = {}) => ({
    stepId: id, exerciseId: 'x', nbItems, threshold, weight: 1, ...extra
});

test('70 % NE SE RECOPIE PAS, IL SE TRADUIT dans le total de chaque étape', () => {
    // Rémy : « mettre un seuil commun de réussite minimal (ex 70 %), ça règle
    // tous les curseurs des exercices sélectionnés ». Sept sur dix et quatorze
    // sur vingt sont le MÊME réglage — écrire « 7 » dans les deux aurait donné
    // 70 % ici et 35 % là, sans que rien ne le dise.
    assert.equal(seuilPourPart(10, 70), 7);
    assert.equal(seuilPourPart(20, 70), 14);
    // ON ARRONDIT VERS LE HAUT : sur six questions, 70 % font 4,2, donc cinq —
    // quatre serait 67 %, en dessous de ce qu'on annonce.
    assert.equal(seuilPourPart(6, 70), 5);
    // Jamais au-delà du total, jamais en dessous d'une bonne réponse.
    assert.equal(seuilPourPart(10, 100), 10);
    assert.equal(seuilPourPart(10, 1), 1);
    // ZÉRO POUR CENT, C'EST AUCUNE EXIGENCE — donc `null`, et non un seuil de
    // zéro que le reste du code relirait comme un réglage.
    assert.equal(seuilPourPart(10, 0), null);
});

test('LA PART SE RELIT SUR L\'ÉTAPE, sinon le champ ne pourrait rien afficher', () => {
    assert.equal(partDe(etape('a', 10, 7)), 70);
    assert.equal(partDe(etape('b', 20, 14)), 70);
    assert.equal(partDe(etape('c', 10, null)), null, 'aucune exigence n\'est pas 0 %');
});

test('DES VALEURS MÊLÉES N\'AFFICHENT RIEN, elles ne mentent pas', () => {
    // Montrer celle de la première étape serait un mensonge tranquille : le
    // professeur croirait lire sa sélection entière.
    const pareilles = [etape('a', 10, 7), etape('b', 10, 7)];
    assert.deepEqual(communDe(pareilles), { questions: 10, part: 70 });

    const melees = [etape('a', 10, 7), etape('b', 20, 14)];
    assert.deepEqual(communDe(melees), { questions: null, part: 70 },
        'même part, totaux différents : la part s\'affiche, pas le total');

    const toutMele = [etape('a', 10, 7), etape('b', 20, 10)];
    assert.deepEqual(communDe(toutMele), { questions: null, part: null });
    assert.deepEqual(communDe([]), { questions: null, part: null });
});

test('ON NE TOUCHE QUE CE QU\'ON ÉCRIT, et que les étapes cochées', () => {
    const steps = [etape('a', 10, 7), etape('b', 20, 14), etape('c', 10, 7)];
    const choisies = new Set(['a', 'b']);

    // Le seuil seul : les longueurs ne bougent pas.
    const seuil = appliquerAuxEtapes(steps, choisies, { part: 50 });
    assert.deepEqual(seuil.map(s => [s.nbItems, s.threshold]),
        [[10, 5], [20, 10], [10, 7]]);
    // L'étape non cochée est rendue TELLE QUELLE, pas recopiée.
    assert.equal(seuil[2], steps[2]);

    // Rien à appliquer : on rend la liste sans y toucher.
    assert.deepEqual(appliquerAuxEtapes(steps, choisies, {}).map(s => s.nbItems), [10, 20, 10]);
});

test('RALLONGER UNE ÉTAPE NE DIVISE PAS SON EXIGENCE PAR DEUX', () => {
    // Passer de 10 à 20 questions en laissant « 7 » aurait fait tomber
    // l'exigence de 70 % à 35 % : le professeur a rallongé son étape, il n'a
    // pas changé d'avis sur ce qu'il exige.
    const steps = [etape('a', 10, 7)];
    const plus = appliquerAuxEtapes(steps, new Set(['a']), { questions: 20 });
    assert.deepEqual([plus[0].nbItems, plus[0].threshold], [20, 14]);

    // Et une étape SANS exigence n'en gagne pas au passage.
    const libre = appliquerAuxEtapes([etape('b', 10, null)], new Set(['b']), { questions: 20 });
    assert.deepEqual([libre[0].nbItems, libre[0].threshold], [20, null]);
});

test('LES DEUX RÉGLAGES ENSEMBLE : la part se lit dans le NOUVEAU total', () => {
    // L'ordre inverse aurait calculé 7 sur 10, puis rallongé à 20 en gardant 7.
    const out = appliquerAuxEtapes([etape('a', 10, 7)], new Set(['a']),
        { questions: 20, part: 70 });
    assert.deepEqual([out[0].nbItems, out[0].threshold], [20, 14]);
});

test('UN JEU DE RÉCOMPENSE NE SE VOIT PAS IMPOSER UNE EXIGENCE', () => {
    // Lui en poser une le transformerait en exercice sans que la ligne le dise.
    const out = appliquerAuxEtapes([etape('j', 10, null, { bonus: true })],
        new Set(['j']), { part: 80 });
    assert.equal(out[0].threshold, null);
    // Sa longueur, elle, se règle : une récompense doit quand même s'arrêter.
    const long = appliquerAuxEtapes([etape('j', 10, null, { bonus: true })],
        new Set(['j']), { questions: 25 });
    assert.equal(long[0].nbItems, 25);
});
