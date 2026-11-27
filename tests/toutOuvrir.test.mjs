// « TOUT OUVRIR » EN FIN D'HEURE — ce que l'ardoise en conclut.
//
// Rémy, 27 novembre : « quand on est en direct, les élèves font leur exercice
// et j'aimerais par exemple 10 minutes avant la fin ouvrir tous les
// exercices ». Le chemin des deux navigateurs est gardé par
// `node tools/toutOuvrir.mjs`, le serveur par `php tools/testApi.php` ; ce
// fichier garde la règle de l'ardoise : la porte se referme À L'HEURE, même
// sans réseau, et même quand l'horloge de la tablette est fausse.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { appliquerEtat, resteOuvert, toutOuvert, ceQueVoitLEleve } from '../js/core/seanceDistante.js';

test('OUVERT DIX MINUTES : L\'ARDOISE COMPTE, ET REFERME TOUTE SEULE', () => {
    // L'HEURE D'AUJOURD'HUI : `ceQueVoitLEleve` lit la vraie horloge.
    const t0 = Math.floor(Date.now() / 1000);
    appliquerEtat({ toutOuvertJusqua: t0 + 600, maintenant: t0 }, t0);
    assert.equal(resteOuvert(t0), 600);
    assert.equal(toutOuvert(t0 + 599), true);
    assert.equal(toutOuvert(t0 + 600), false, 'à l\'heure dite, la porte doit se refermer sans attendre le réseau');
    assert.ok(Math.abs(ceQueVoitLEleve().toutOuvert - 600) <= 1);
    assert.equal(ceQueVoitLEleve({ professeur: true }).toutOuvert, 0,
        'le professeur qui repasse côté élève ne s\'annonce pas sa propre ouverture');
});

test('UNE TABLETTE EN AVANCE DE DIX MINUTES NE REFERME PAS DÈS L\'OUVERTURE', () => {
    const serveur = 1_800_000_000;
    const tablette = serveur + 600; // son horloge avance de dix minutes
    appliquerEtat({ toutOuvertJusqua: serveur + 600, maintenant: serveur }, tablette);
    assert.equal(resteOuvert(tablette), 600, 'l\'écart des horloges doit être corrigé');
});

test('FERMÉ, C\'EST FERMÉ', () => {
    appliquerEtat({ toutOuvertJusqua: null, maintenant: 1_800_000_000 }, 1_800_000_000);
    assert.equal(toutOuvert(1_800_000_000), false);
    assert.equal(resteOuvert(1_800_000_000), 0);
});
