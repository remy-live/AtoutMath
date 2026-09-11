// LE CHASSEUR DE DIVISEURS.
//
// Rémy : « un jeu un peu futuriste pour travailler la décomposition et la
// divisibilité, où il y a des nombres qui arrivent et on peut tirer des
// diviseurs dessus. Exemple 30 : on peut tirer 6, du coup ça se transforme en
// 5, et on ne peut capturer que les nombres premiers. »
//
// Deux promesses tiennent tout le jeu, et ce sont celles qu'on vérifie :
// une cible est TOUJOURS décomposable avec les facteurs annoncés par le
// niveau — sinon elle est indestructible et l'élève ne sait pas pourquoi —
// et l'on ne capture QUE les nombres premiers.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    estPremier, diviseursStricts, facteursPremiers, ecrireDecomposition,
    tirerCible, tirer, coupsPossibles, pointsDeCapture, POINTS, NIVEAUX,
    creerPartie, ajouterCible, tirerSur, perdreCible, bilan
} from '../js/core/diviseurs.js';
import { makeRng } from '../js/core/ids.js';

test('les premiers sont les premiers', () => {
    assert.deepEqual([...Array(32).keys()].filter(estPremier),
        [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31]);
    assert.ok(!estPremier(1));
    assert.ok(!estPremier(0));
    assert.ok(!estPremier(-7));
    assert.ok(!estPremier(2.5));
    assert.ok(estPremier(211));
});

test('la décomposition en facteurs premiers redonne le nombre', () => {
    for (let n = 2; n <= 400; n++) {
        const f = facteursPremiers(n);
        assert.ok(f.every(estPremier), `${n} : un facteur n'est pas premier`);
        assert.equal(f.reduce((a, b) => a * b, 1), n, `${n} : le produit ne retombe pas juste`);
    }
    assert.deepEqual(facteursPremiers(60), [2, 2, 3, 5]);
    assert.equal(ecrireDecomposition(60), '60 = 2 × 2 × 3 × 5');
    assert.equal(ecrireDecomposition(13), '13 est premier');
});

test('les diviseurs stricts excluent 1 et le nombre lui-même', () => {
    assert.deepEqual(diviseursStricts(30), [2, 3, 5, 6, 10, 15]);
    assert.deepEqual(diviseursStricts(13), []);
    assert.deepEqual(diviseursStricts(4), [2]);
});

// --- LE TIR ------------------------------------------------------------------

test('L\'EXEMPLE DE RÉMY : on tire 6 sur 30, il devient 5', () => {
    const r = tirer(30, 6);
    assert.ok(r.ok);
    assert.equal(r.reste, 5);
    assert.equal(r.capture, false);
    assert.match(r.message, /30 ÷ 6 = 5/);
    assert.match(r.message, /premier/, 'le jeu doit dire que 5 se capture');
    // Et 5, premier, se capture.
    const c = tirer(5, 5);
    assert.ok(c.ok);
    assert.ok(c.capture);
});

test('ON NE CAPTURE QUE LES NOMBRES PREMIERS', () => {
    const refus = tirer(30, 30);
    assert.equal(refus.ok, false);
    assert.equal(refus.raison, 'pas-premier');
    assert.match(refus.message, /Décompose/);
    // Sur tous les nombres jusqu'à 200 : se tirer dessus ne marche que si l'on
    // est premier. C'est la règle du jeu, elle ne souffre pas d'exception.
    for (let n = 2; n <= 200; n++) {
        assert.equal(tirer(n, n).ok, estPremier(n), `${n} : capture mal jugée`);
    }
});

test('un tir qui ne divise pas est refusé, et l\'on dit pourquoi', () => {
    const r = tirer(30, 7);
    assert.equal(r.ok, false);
    assert.equal(r.raison, 'ne-divise-pas');
    assert.match(r.message, /il reste 2/, 'le reste est la clef de l\'explication');
});

test('tirer 1, tirer plus grand, ou tirer n\'importe quoi : trois refus distincts', () => {
    assert.equal(tirer(30, 1).raison, 'trop-petit');
    assert.equal(tirer(30, 0).raison, 'trop-petit');
    assert.equal(tirer(30, -3).raison, 'trop-petit');
    assert.equal(tirer(30, 2.5).raison, 'trop-petit');
    assert.equal(tirer(30, 45).raison, 'trop-grand');
});

test('les coups possibles : ses diviseurs, ou sa capture s\'il est premier', () => {
    assert.deepEqual(coupsPossibles(30), [2, 3, 5, 6, 10, 15]);
    assert.deepEqual(coupsPossibles(13), [13]);
});

// --- LES CIBLES ----------------------------------------------------------------

test('UNE CIBLE EST TOUJOURS DÉCOMPOSABLE AVEC LES FACTEURS DE SON NIVEAU', () => {
    // La promesse la plus importante : un 91 dans un niveau « 2, 3 et 5 »
    // serait indestructible, et l'élève n'aurait aucun moyen de le savoir.
    Object.entries(NIVEAUX).forEach(([nom, cfg]) => {
        const permis = new Set(cfg.premiers);
        for (let g = 0; g < 60; g++) {
            const rng = makeRng(`${nom}${g}`);
            for (let rang = 0; rang < 12; rang++) {
                const { valeur, facteurs } = tirerCible(rng, nom, rang);
                assert.ok(valeur >= 2, `${nom} : cible ${valeur}`);
                assert.ok(valeur <= 400, `${nom} : ${valeur} est trop grand à lire`);
                facteursPremiers(valeur).forEach(f => {
                    assert.ok(permis.has(f), `${nom} : ${valeur} contient le facteur ${f}, hors niveau`);
                });
                assert.equal(facteurs.reduce((a, b) => a * b, 1), valeur);
            }
        }
    });
});

test('les premières cibles sont simples, les suivantes se décomposent', () => {
    const rng = makeRng('rang');
    const debut = [], plusLoin = [];
    for (let i = 0; i < 40; i++) {
        debut.push(facteursPremiers(tirerCible(rng, 'moyen', 0).valeur).length);
        plusLoin.push(facteursPremiers(tirerCible(rng, 'moyen', 9).valeur).length);
    }
    const moy = (t) => t.reduce((a, b) => a + b, 0) / t.length;
    assert.ok(moy(plusLoin) > moy(debut), 'les cibles doivent s\'épaissir avec les vagues');
});

test('LE MÊME TIRAGE DONNE LA MÊME CIBLE', () => {
    assert.deepEqual(tirerCible(makeRng('x'), 'moyen', 4), tirerCible(makeRng('x'), 'moyen', 4));
});

// --- LA PARTIE -------------------------------------------------------------------

test('UNE DÉCOMPOSITION COMPLÈTE SE JOUE, ET S\'ENREGISTRE', () => {
    const p = creerPartie({ niveau: 'facile' });
    const c = { id: 1, valeur: 60, depart: 60, chemin: [], fautes: 0 };
    p.cibles = [c]; p.prochainId = 2;

    let r = tirerSur(p, 1, 4);
    assert.ok(r.ok); assert.equal(c.valeur, 15);
    r = tirerSur(p, 1, 3);
    assert.ok(r.ok); assert.equal(c.valeur, 5);
    r = tirerSur(p, 1, 5);
    assert.ok(r.capture, '5 est premier : il se capture');
    assert.equal(p.cibles.length, 0);
    assert.deepEqual(p.journal[0].chemin, [4, 3, 5]);
    assert.equal(p.journal[0].fautes, 0);
    // Le bilan se lit comme au tableau.
    const b = bilan(p);
    assert.equal(b[0].texte, '60 = 2 × 2 × 3 × 5');
    assert.equal(b[0].chemin, '60 → 4 → 3 → 5');
});

test('UNE FAUTE COÛTE UN BOUCLIER — sinon on essaie tous les nombres', () => {
    const p = creerPartie({ niveau: 'facile', boucliers: 3 });
    p.cibles = [{ id: 1, valeur: 30, depart: 30, chemin: [], fautes: 0 }];
    const r = tirerSur(p, 1, 7);
    assert.equal(r.ok, false);
    assert.equal(p.boucliers, 2);
    assert.equal(p.cibles[0].valeur, 30, 'une faute ne change pas la cible');
    assert.equal(p.cibles[0].fautes, 1);
});

test('sans bouclier, la partie est finie', () => {
    const p = creerPartie({ boucliers: 1 });
    p.cibles = [{ id: 1, valeur: 30, depart: 30, chemin: [], fautes: 0 }];
    tirerSur(p, 1, 7);
    assert.equal(p.boucliers, 0);
    assert.equal(p.finie, true);
    // Et plus rien ne répond.
    assert.equal(tirerSur(p, 1, 2).ok, false);
});

test('une cible qui touche le sol coûte aussi un bouclier', () => {
    const p = creerPartie({ boucliers: 2 });
    const c = ajouterCible(p, makeRng('sol'), 0);
    assert.equal(p.cibles.length, 1);
    perdreCible(p, c.id);
    assert.equal(p.cibles.length, 0);
    assert.equal(p.boucliers, 1);
    assert.equal(perdreCible(p, 999), null, 'une cible inconnue ne coûte rien');
});

test('UNE DÉCOMPOSITION SANS FAUTE VAUT LE DOUBLE', () => {
    const propre = pointsDeCapture(60, [4, 3, 5], 0);
    const salie = pointsDeCapture(60, [4, 3, 5], 2);
    assert.equal(propre, salie * POINTS.sansFaute);
    // Et un nombre à quatre facteurs vaut plus qu'un nombre premier tout seul.
    assert.ok(pointsDeCapture(60, [], 0) > pointsDeCapture(7, [], 0));
});

test('UNE PARTIE ENTIÈRE SE JOUE SANS IMPASSE', () => {
    // On décompose comme un élève méthodique : on cherche le plus petit
    // diviseur, on tire, on recommence. Aucune cible ne doit résister.
    for (const niveau of Object.keys(NIVEAUX)) {
        const rng = makeRng(`jouer-${niveau}`);
        const p = creerPartie({ niveau, boucliers: 3 });
        for (let vague = 0; vague < 10; vague++) {
            const c = ajouterCible(p, rng, vague);
            let garde = 0;
            while (p.cibles.some(x => x.id === c.id) && garde++ < 12) {
                const cible = p.cibles.find(x => x.id === c.id);
                const d = estPremier(cible.valeur) ? cible.valeur : diviseursStricts(cible.valeur)[0];
                const r = tirerSur(p, c.id, d);
                assert.ok(r.ok, `${niveau} : ${cible.valeur} refuse le tir ${d} (${r.message})`);
            }
            assert.equal(p.cibles.length, 0, `${niveau} : ${c.depart} n'a pas pu être capturé`);
        }
        assert.equal(p.boucliers, 3, `${niveau} : un jeu propre ne doit rien coûter`);
        assert.ok(p.score > 0);
        assert.equal(p.journal.length, 10);
    }
});
