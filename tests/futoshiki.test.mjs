// Le futoshiki : un carré latin sous inégalités, résoluble sans deviner.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    carreLatinAleatoire, resoudre, genererFutoshiki, verifierSaisie
} from '../js/core/futoshiki.js';
import { makeRng } from '../js/core/ids.js';

test('le carré latin mélangé en est toujours un', () => {
    for (let g = 0; g < 20; g++) {
        for (const n of [4, 5]) {
            const grille = carreLatinAleatoire(n, makeRng(`cl${n}-${g}`));
            for (let r = 0; r < n; r++) {
                const ligne = grille.slice(r * n, (r + 1) * n);
                assert.equal(new Set(ligne).size, n, `ligne ${r} : doublon`);
                const colonne = Array.from({ length: n }, (_, k) => grille[k * n + r]);
                assert.equal(new Set(colonne).size, n, `colonne ${r} : doublon`);
            }
        }
    }
});

test('chaque puzzle se résout par propagation pure, sur LA solution annoncée', () => {
    for (let g = 0; g < 15; g++) {
        for (const n of [4, 5]) {
            const p = genererFutoshiki({ taille: n }, makeRng(`fu${n}-${g}`));
            const r = resoudre(p);
            assert.ok(r.complet, `taille ${n}, graine ${g} : non résoluble sans essai-erreur`);
            assert.deepEqual(r.grille, p.solution, 'la déduction doit retomber sur la solution');
        }
    }
});

test('toutes les inégalités du puzzle sont vraies dans la solution', () => {
    for (let g = 0; g < 12; g++) {
        const p = genererFutoshiki({ taille: 4 }, makeRng(`vi${g}`));
        assert.ok(p.inegalites.length >= 2, 'un futoshiki sans signes n\'en est pas un');
        p.inegalites.forEach(ing => {
            assert.ok(p.solution[ing.petit] < p.solution[ing.grand],
                `inégalité fausse : case ${ing.petit} < case ${ing.grand}`);
            // Et toujours entre cases VOISINES.
            const d = Math.abs(ing.petit - ing.grand);
            assert.ok(d === 1 || d === p.n, 'une inégalité relie deux voisines');
        });
    }
});

test('en « difficile », aucun indice n\'est de trop', () => {
    // C'est le vrai futoshiki : rien de superflu. Les modes plus doux, eux,
    // rendent volontairement des cases — voir le test suivant.
    const p = genererFutoshiki({ taille: 4, difficulte: 'difficile' }, makeRng('min'));
    p.inegalites.forEach((_, k) => {
        const sans = p.inegalites.filter((__, x) => x !== k);
        assert.ok(!resoudre({ ...p, inegalites: sans }).complet,
            `l'inégalité ${k} ne sert à rien`);
    });
    p.donnees.forEach((v, i) => {
        if (!v) return;
        const sans = p.donnees.slice(); sans[i] = 0;
        assert.ok(!resoudre({ ...p, donnees: sans }).complet, `la donnée en ${i} ne sert à rien`);
    });
});

test('les premières grilles donnent de quoi accrocher, sans jamais mentir', () => {
    // Une grille dépouillée est la plus belle et la plus dure : un élève qui
    // découvre le futoshiki se retrouve devant quatre signes et rien d'autre.
    // On rend donc des cases — mais une case rendue vient de LA solution, elle
    // n'apporte que de l'information vraie, et la grille reste déductible.
    for (const n of [4, 5]) {
        let precedent = 99;
        for (const d of ['facile', 'moyen', 'difficile']) {
            const p = genererFutoshiki({ taille: n, difficulte: d }, makeRng(`d${n}${d}`));
            const donnes = p.donnees.filter(Boolean).length;
            assert.ok(donnes <= precedent, `${n}/${d} : ${donnes} n'est pas plus dépouillé que ${precedent}`);
            precedent = donnes;
            // Chaque case rendue est la bonne, et la grille se déduit toujours.
            p.donnees.forEach((v, i) => {
                if (v) assert.equal(v, p.solution[i], `${n}/${d} : case ${i} fausse`);
            });
            const r = resoudre(p);
            assert.ok(r.complet, `${n}/${d} : la propagation cale`);
            assert.deepEqual([...r.grille], [...p.solution], `${n}/${d} : mauvaise solution`);
        }
    }
});

test('le journal du solveur explique chaque case à trouver', () => {
    const p = genererFutoshiki({ taille: 4 }, makeRng('jou'));
    const aTrouver = p.donnees.filter(v => !v).length;
    const posees = new Set(p.etapes.map(e => e.case));
    assert.equal(posees.size, aTrouver, 'chaque case vide doit avoir son étape');
    p.etapes.forEach(e => assert.equal(p.solution[e.case], e.valeur));
});

test('la vérification distingue la faute du vide', () => {
    const p = genererFutoshiki({ taille: 4 }, makeRng('vs'));
    const juste = {};
    p.solution.forEach((v, i) => { if (!p.donnees[i]) juste[i] = v; });
    assert.ok(verifierSaisie(p, juste).ok);
    const trou = { ...juste };
    const premier = Object.keys(juste)[0];
    delete trou[premier];
    const b = verifierSaisie(p, trou);
    assert.ok(!b.ok);
    assert.equal(b.fautes.length, 0);
    assert.equal(b.vides, 1);
});

test('le même tirage donne le même puzzle', () => {
    const a = genererFutoshiki({ taille: 5 }, makeRng('st'));
    const b = genererFutoshiki({ taille: 5 }, makeRng('st'));
    assert.deepEqual(a.solution, b.solution);
    assert.deepEqual(a.inegalites, b.inegalites);
    assert.deepEqual(a.donnees, b.donnees);
});

// --- Ce que l'aide a le droit de dire ----------------------------------------

test('chaque étape du solveur nomme la règle qui la ferme', () => {
    const regles = new Set();
    for (let i = 0; i < 60; i++) {
        const p = genererFutoshiki({ taille: 4 + (i % 2) }, makeRng('regle_' + i));
        assert.ok(p.etapes.length > 0, 'une grille résoluble a des étapes');
        for (const e of p.etapes) {
            assert.ok(['unicite', 'trop-grand', 'trop-petit', 'seule-place'].includes(e.regle),
                `règle inconnue : ${e.regle}`);
            if (e.regle === 'seule-place') {
                assert.ok(e.unite && ['ligne', 'colonne'].includes(e.unite.type));
                assert.ok(e.unite.index >= 0 && e.unite.index < p.n);
            }
            regles.add(e.regle);
        }
    }
    // Les trois familles servent réellement : sans quoi l'aide n'aurait qu'une
    // phrase, et on serait revenu au message unique qu'on vient de remplacer.
    assert.ok(regles.has('unicite'), 'la règle de ligne/colonne doit servir');
    assert.ok(regles.has('trop-grand') || regles.has('trop-petit'),
        'les inégalités doivent fermer des cases — c\'est le sujet du jeu');
});

test('les premières grilles sont plus garnies, sans cesser d\'être uniques', () => {
    for (let i = 0; i < 20; i++) {
        const debut = genererFutoshiki({ taille: 4, partDonnees: 0.5 }, makeRng('debut_' + i));
        const fin = genererFutoshiki({ taille: 4, difficulte: 'facile' }, makeRng('debut_' + i));
        const compte = (p) => p.donnees.filter(Boolean).length;
        assert.ok(compte(debut) >= compte(fin),
            `la grille de démarrage doit être au moins aussi garnie (${compte(debut)} vs ${compte(fin)})`);
        // Une case donnée en plus n'apporte que de l'information vraie : la
        // grille reste résoluble par propagation, donc faisable sans deviner.
        assert.ok(resoudre(debut).complet, 'la grille de démarrage reste déductible');
    }
});
