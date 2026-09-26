// « UN TEMPS, RÉGLÉ PAR VOUS » — ce qui borne le bac à sable.
//
// RÉMY, interrogé sur ce qui doit arrêter les jeux du bac maintenant qu'ils ne
// s'arrêtent plus au premier point : « un temps, réglé par vous ».
//
// C'EST LE SEUL RÉGLAGE QUI VAILLE POUR LES TROIS SORTES DE JEUX. Nova et le
// Peintre se terminent tout seuls — on joue jusqu'à perdre. La Tour de Hanoï
// finit un plateau, puis en propose un autre. Mais un Memory compte des
// questions : sans borne, il ne finit JAMAIS, et l'élève s'arrête au hasard. Un
// nombre de questions aurait demandé une règle par famille ; un temps vaut pour
// les trois, et c'est ce qu'un professeur contrôle vraiment en fin d'heure.
//
// ET LE COMPTE PART DE L'ÉLÈVE, pas de l'heure de la classe : celui qui finit
// dix minutes avant les autres a droit aux mêmes dix minutes de jeu. Un compte
// à rebours commun aurait puni le rapide — l'inverse de ce que le bac
// récompense.
//
// MESURÉ, deux onglets : le professeur pose 10 dans Le direct, l'élève reçoit
// `bacMinutes: 10`, et son jeu suivant part avec un chronomètre de 360 secondes
// après quatre minutes de jeu — le RESTE, pas une nouvelle dizaine.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeStep, makePath } from '../js/core/path.js';
import { bacOuvert, parcoursDuBac } from '../js/core/bacASable.js';
import { defaultPolicy } from '../js/core/policy.js';
import { appliquerEtat, resteDuBac } from '../js/core/seanceDistante.js';

const fini = { etat: 'fini', etapes: 2, faites: 2 };

test('SANS DURÉE POSÉE, LE BAC N\'A PAS DE FIN', () => {
    appliquerEtat({ bacMinutes: 0 });
    assert.equal(resteDuBac(Date.now() - 3600 * 1000), null,
        'une durée surgit de nulle part');
    assert.equal(bacOuvert(fini, {}).ouvert, true);
    const p = parcoursDuBac(makeStep, makePath, 'calc-nova', defaultPolicy(), 0);
    assert.equal(p.steps[0].timeLimit, null, 'un chronomètre apparaît sans qu\'on l\'ait posé');
    assert.equal(p.steps[0].sansFin, true);
});

test('LE TEMPS SE COMPTE DEPUIS QUE L\'ÉLÈVE A OUVERT LE BAC', () => {
    appliquerEtat({ bacMinutes: 10 });
    const t = 1_700_000_000_000;
    // Pas encore ouvert : il a tout son temps.
    assert.deepEqual(resteDuBac(0, t), { minutes: 10, reste: 600 });
    // Ouvert il y a quatre minutes : il lui en reste six.
    assert.deepEqual(resteDuBac(t - 4 * 60 * 1000, t), { minutes: 10, reste: 360 });
    // Ouvert il y a une heure : zéro, et jamais un nombre négatif.
    assert.deepEqual(resteDuBac(t - 3600 * 1000, t), { minutes: 10, reste: 0 });
    appliquerEtat({ bacMinutes: 0 });
});

test('CHAQUE JEU REPART AVEC CE QUI RESTE, PAS AVEC LA DURÉE PLEINE', () => {
    // Sans cela, ouvrir un second jeu relancerait la dizaine : le bac
    // durerait aussi longtemps qu'on change de jeu.
    const p = parcoursDuBac(makeStep, makePath, 'calc-nova', defaultPolicy(), 360);
    assert.equal(p.steps[0].timeLimit, 360);
    // Et le compte, lui, ne ferme toujours pas l'étape.
    assert.equal(p.steps[0].sansFin, true);
    assert.equal(p.steps[0].sansTotal, true);
});

test('LE TEMPS ÉPUISÉ FERME LA PORTE, ET LE DIT', () => {
    // Un bouton qui disparaît laisse croire qu'il n'y a rien. Une phrase dit
    // ce qui s'est passé — c'est la règle de `bacOuvert` depuis le début.
    const non = bacOuvert(fini, { budget: { minutes: 10, reste: 0 } });
    assert.equal(non.ouvert, false);
    assert.equal(non.pourquoi, 'bac-epuise');
    assert.match(non.dire, /10 minutes/);
    assert.equal(bacOuvert(fini, { budget: { minutes: 10, reste: 1 } }).ouvert, true);
});

test('CE QUI FERMAIT LE BAC LE FERME TOUJOURS', () => {
    // Une nouvelle raison de refus ne doit pas passer devant les anciennes :
    // une classe fermée reste fermée même avec du temps au compteur.
    assert.equal(bacOuvert(fini, { ferme: true, budget: { minutes: 10, reste: 600 } }).pourquoi,
        'ferme-par-le-prof');
    assert.equal(bacOuvert(fini, { chrono: { reste: 0, aZero: 'terminer' },
        budget: { minutes: 10, reste: 600 } }).pourquoi, 'temps-ecoule');
    // Et une séance pas finie reste une séance pas finie.
    assert.equal(bacOuvert({ etat: 'en-cours', etapes: 3, faites: 1 },
        { budget: { minutes: 10, reste: 600 } }).pourquoi, 'pas-fini');
});
