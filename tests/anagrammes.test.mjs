// LES ANAGRAMMES DU VOCABULAIRE.
//
// Trois promesses, et ce sont elles qu'on vérifie : le mélange emploie
// EXACTEMENT les lettres du mot, il n'est jamais le mot lui-même, et il se
// regarde — un empilement de consonnes ne donne envie de rien.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    normaliser, memesLettres, lisibilite, melanger, motsJouables,
    tirerAnagramme, verifier, analyser, debutDevoile, THEMES
} from '../js/core/anagrammes.js';
import { LEXIQUE, motsDisponibles } from '../js/core/motsCaches.js';
import { makeRng } from '../js/core/ids.js';

test('un mot se lit malgré ses accents, sa casse et ses espaces', () => {
    assert.equal(normaliser('Médiatrice'), 'MEDIATRICE');
    assert.equal(normaliser('  bissectrice '), 'BISSECTRICE');
    assert.equal(normaliser('numéra-teur'), 'NUMERATEUR');
    assert.equal(normaliser(null), '');
});

test('LE MÉLANGE EMPLOIE EXACTEMENT LES LETTRES DU MOT', () => {
    const rng = makeRng('lettres');
    LEXIQUE.forEach(({ mot }) => {
        const m = melanger(mot, rng);
        assert.ok(memesLettres(m, mot), `« ${m} » n'a pas les lettres de « ${mot} »`);
        assert.equal(m.length, mot.length);
    });
});

test('LE MÉLANGE N\'EST JAMAIS LE MOT — sinon il n\'y a rien à chercher', () => {
    // Sur tout le lexique et vingt graines : une seule fuite suffirait à
    // donner une question sans énigme.
    for (let g = 0; g < 20; g++) {
        const rng = makeRng(`g${g}`);
        LEXIQUE.forEach(({ mot }) => {
            assert.notEqual(melanger(mot, rng), mot, `« ${mot} » est ressorti tel quel`);
        });
    }
});

test('un mélange qui s\'empile est moins bien noté qu\'un mélange qui alterne', () => {
    assert.ok(lisibilite('RACER', 'CARRE') < lisibilite('RRCAE', 'CARRE'));
    assert.ok(lisibilite('TARINGLE') < lisibilite('TRNGLIAE'));
    // Commencer comme le mot le rend devinable : c'est une pénalité.
    assert.ok(lisibilite('CAERR', 'CARRE') > lisibilite('RACER', 'CARRE'));
});

test('EN PRATIQUE, LES MÉLANGES SE LISENT', () => {
    // La mesure qui compte : sur tout le lexique, aucun mélange ne doit
    // empiler quatre consonnes — c'est le seuil au-delà duquel l'œil renonce.
    const rng = makeRng('lisible');
    const voyelles = new Set(['A', 'E', 'I', 'O', 'U', 'Y']);
    LEXIQUE.forEach(({ mot }) => {
        const m = melanger(mot, rng);
        let suite = 0, pire = 0;
        for (const c of m) { suite = voyelles.has(c) ? 0 : suite + 1; pire = Math.max(pire, suite); }
        assert.ok(pire <= 3, `« ${m} » (${mot}) empile ${pire} consonnes`);
    });
});

test('le tirage rend un mot du thème demandé, avec sa définition', () => {
    const rng = makeRng('tir');
    for (let i = 0; i < 30; i++) {
        const q = tirerAnagramme(rng, { theme: 'angles' });
        assert.ok(q, 'aucune énigme tirée');
        const dans = motsDisponibles({ theme: 'angles' }).some(m => m.mot === q.mot);
        assert.ok(dans, `« ${q.mot} » n'est pas du vocabulaire des angles`);
        assert.ok(q.def && q.def.length > 10, 'une énigme sans définition n\'a pas de filet');
        assert.ok(memesLettres(q.melange, q.mot));
    }
});

test('LA DÉFINITION NE CONTIENT PAS LE MOT QU\'ELLE DÉFINIT', () => {
    // Sinon l'énigme se résout en lisant l'indice, ce qui n'apprend rien.
    LEXIQUE.forEach(({ mot, def }) => {
        assert.ok(!normaliser(def).includes(normaliser(mot)),
            `la définition de « ${mot} » contient le mot`);
    });
});

test('un mot déjà tombé ne retombe pas tout de suite', () => {
    const rng = makeRng('evit');
    const dispo = motsJouables({ theme: 'angles' }).map(m => m.mot);
    const eviter = dispo.slice(0, dispo.length - 1);
    const q = tirerAnagramme(rng, { theme: 'angles', eviter });
    assert.equal(q.mot, dispo[dispo.length - 1], 'il ne restait qu\'un mot possible');
});

test('quand tout a été vu, on recommence plutôt que de rendre rien', () => {
    const rng = makeRng('tout');
    const tous = motsJouables({ theme: 'angles' }).map(m => m.mot);
    const q = tirerAnagramme(rng, { theme: 'angles', eviter: tous });
    assert.ok(q && tous.includes(q.mot));
});

test('les mots trop courts ne font pas d\'énigme', () => {
    const courts = motsJouables({ longueurMin: 4 }).filter(m => m.mot.length < 4);
    assert.equal(courts.length, 0);
    assert.ok(motsJouables({ longueurMin: 3 }).length >= motsJouables({ longueurMin: 4 }).length);
});

test('la réponse est jugée sur les lettres, pas sur la frappe', () => {
    assert.ok(verifier('médiatrice', 'MEDIATRICE'));
    assert.ok(verifier('  CARRE ', 'CARRE'));
    assert.ok(!verifier('CARREE', 'CARRE'));
});

test('UNE FAUTE EST EXPLIQUÉE SELON CE QU\'ELLE EST', () => {
    assert.equal(analyser('', 'CARRE').etat, 'vide');
    assert.equal(analyser('CARRE', 'CARRE').etat, 'juste');
    assert.equal(analyser('CARR', 'CARRE').etat, 'longueur');
    assert.equal(analyser('CARIE', 'CARRE').etat, 'lettres');
    // Les bonnes lettres, le mauvais mot : c'est le cas intéressant, et il
    // renvoie à la définition plutôt qu'aux lettres.
    const presque = analyser('RACER', 'CARRE');
    assert.equal(presque.etat, 'faux');
    assert.match(presque.message, /définition/);
});

test('l\'indice découvre le DÉBUT, jamais le mot entier', () => {
    assert.equal(debutDevoile('BISSECTRICE', 0), '');
    assert.equal(debutDevoile('BISSECTRICE', 3), 'BIS');
    assert.equal(debutDevoile('BISSECTRICE', 99), 'BISSECTRIC', 'la dernière lettre ne se donne pas');
    assert.equal(debutDevoile('BISSECTRICE', -4), '');
});

test('les thèmes annoncés existent tous dans le lexique', () => {
    Object.keys(THEMES).filter(t => t !== 'tout').forEach(t => {
        assert.ok(motsDisponibles({ theme: t }).length >= 8,
            `le thème « ${t} » n'a pas assez de mots pour un exercice`);
    });
});

test('LE MÊME TIRAGE DONNE LA MÊME ÉNIGME — une graine est une question', () => {
    const a = tirerAnagramme(makeRng('meme'), { theme: 'tout' });
    const b = tirerAnagramme(makeRng('meme'), { theme: 'tout' });
    assert.deepEqual(a, b);
});
