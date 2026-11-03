// LE MODE DÉCOUVERTE — 3 novembre.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « j'aimerai bien un mode démo dans l'accueil avec un apercu des
// exercices et aussi un mode qui montre et explique les possibilités », puis
// « les deux et pouvoir faire qqs exercices. »
//
// CE QUE CETTE ÉPREUVE GARDE, ET POURQUOI ELLE EXISTE :
//
// La vitrine est une liste ÉCRITE À LA MAIN. C'est un choix — Rémy a demandé
// que ce soit moi qui compose —, et c'est exactement ce qui la fait dériver :
// un exercice renommé, un identifiant changé, et la carte renvoie vers rien.
// Personne ne le verra en relisant la liste ; le visiteur, lui, le verra du
// premier clic.
//
// ET LA COUVERTURE SE PERD ENCORE PLUS SILENCIEUSEMENT. Ma première version
// tenait six exercices, tous du même domaine — pas de géométrie, pas de
// grandeurs, pas de troisième — sous un commentaire qui affirmait le
// contraire. Je l'avais écrite en croyant couvrir. C'est une mesure de dix
// lignes qui l'a dit, et c'est elle qu'on garde ici.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import '../js/core/activities/index.js';
import { exercices } from '../js/data/catalog.js';
import { getGenerator } from '../js/core/registry.js';
import { makeRng } from '../js/core/ids.js';
import { VISITE, VITRINE, couvertureDeLaVitrine, vitrineJouable } from '../js/core/decouverte.js';

const trouver = (id) => exercices.find(e => e.id === id);

test('CHAQUE EXERCICE DE LA VITRINE EXISTE ENCORE AU CATALOGUE', () => {
    const { bonnes, perdues } = vitrineJouable(trouver);
    assert.deepEqual(perdues, [],
        `la vitrine renvoie vers ${perdues.length} exercice(s) disparu(s) : `
            + perdues.join(', '));
    assert.equal(bonnes.length, VITRINE.length);
    // ET AUCUN N'Y FIGURE DEUX FOIS : une vitrine qui répète un exercice a
    // l'air plus courte qu'elle n'est, et c'est l'erreur qu'on fait en
    // ajoutant une ligne sans relire les dix autres.
    const vus = new Set(VITRINE.map(v => v.id));
    assert.equal(vus.size, VITRINE.length, 'un exercice est deux fois dans la vitrine');
});

test('ET LA VITRINE COUVRE LES DOMAINES ET LES NIVEAUX', () => {
    const { domaines, niveaux } = couvertureDeLaVitrine(trouver);
    // Les cinq grands domaines du catalogue. Un visiteur doit pouvoir dire
    // « ah, il y a aussi de la géométrie » — c'est tout l'objet d'une vitrine.
    for (const attendu of ['Nombres et calculs', 'Espace et géométrie',
        'Grandeurs et mesures', 'Organisation de données', 'Défis et énigmes']) {
        assert.ok(domaines.includes(attendu),
            `la vitrine ne montre rien de « ${attendu} » — elle en montre : `
                + domaines.join(', '));
    }
    // Du CM2 à la troisième : une vitrine qui ne montrerait que de la sixième
    // ferait croire à un logiciel de sixième.
    for (const niveau of ['CM2', '6ème', '5ème', '4ème', '3ème']) {
        assert.ok(niveaux.includes(niveau),
            `aucun exercice de ${niveau} dans la vitrine — elle montre : `
                + niveaux.join(', '));
    }
});

test('ET CHAQUE CARTE DIT POURQUOI ON LA REGARDE', () => {
    for (const { id, pourquoi } of VITRINE) {
        assert.ok(pourquoi && pourquoi.length > 25,
            `${id} : la phrase de la carte est vide ou trop courte`);
        // ELLE NE RÉPÈTE PAS LE TITRE. « Les Pentaminos — les pentaminos » ne
        // dit rien ; la carte doit dire ce que l'exercice TRAVAILLE.
        const exo = trouver(id);
        assert.ok(!pourquoi.toLowerCase().startsWith(String(exo.title).toLowerCase()),
            `${id} : la phrase recommence par le titre`);
    }
});

test('LES EXERCICES DE LA VITRINE SE FABRIQUENT SANS JETER', () => {
    // UNE CARTE MUETTE EST LE DÉFAUT SILENCIEUX DE CET ÉCRAN : le générateur
    // refuse ses réglages, l'aperçu est vide, et rien ne le dit. On accepte
    // qu'un exercice n'ait PAS de générateur — les sept défis du catalogue
    // sont des jeux autonomes, et l'écran leur donne une face « ça se joue » —
    // mais on n'accepte pas qu'il en ait un qui échoue.
    for (const { id } of VITRINE) {
        const exo = trouver(id);
        const gen = getGenerator(exo.generatorId);
        if (!gen || typeof gen.generate !== 'function') continue;
        let item = null;
        assert.doesNotThrow(() => {
            item = gen.generate({ ...(exo.params || {}) },
                { rng: makeRng(`decouverte-${id}`), index: 0, total: 4 });
        }, `${id} : le générateur jette sur les réglages du catalogue`);
        assert.ok(item && item.prompt, `${id} : aucun énoncé à montrer`);
        assert.ok((item.prompt.html || item.prompt.text || '').trim().length > 0,
            `${id} : l'énoncé est vide`);
    }
});

test('ET LA VISITE ANNONCE DES ÉTAPES COMPLÈTES', () => {
    assert.ok(VISITE.length >= 5, 'moins de cinq étapes : ce n\'est plus une visite');
    const vus = new Set();
    for (const e of VISITE) {
        for (const champ of ['id', 'titre', 'quoi', 'ou', 'bouton']) {
            assert.ok(e[champ], `une étape de la visite n'a pas de « ${champ} »`);
        }
        assert.ok(!vus.has(e.id), `deux étapes portent l'identifiant ${e.id}`);
        vus.add(e.id);
        assert.ok(e.quoi.length > 30,
            `${e.id} : « ${e.quoi} » n'explique rien`);
    }
});
