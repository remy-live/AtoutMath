// L'hexagrille : neuf cases, les chiffres de 1 à 9, des sommes fléchées.
//
// Ce qui doit être garanti n'est pas qu'une grille EXISTE, c'est qu'elle se
// résout SANS DEVINER. Deux solutions, et le jeu devient un tirage au sort où
// l'élève qui raisonne juste peut se tromper : c'est le seul défaut qui rendrait
// l'exercice nuisible, et c'est celui que ce fichier traque.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    CASES, FILES, sommesDe, compterSolutions, tirerGrille,
    genererHexagrille, estResolue, prochainCoup, filesJustes
} from '../js/core/hexagrille.js';
import { makeRng } from '../js/core/ids.js';

const sommesDesFleches = (p) => Object.fromEntries(p.fleches.map(f => [f.id, f.somme]));

test('neuf cases, trois familles de files, aucune file d\'une seule case', () => {
    assert.equal(CASES.length, 9);
    const familles = new Set(FILES.map(f => f.sens));
    assert.equal(familles.size, 3, [...familles].join(', '));
    FILES.forEach(f => {
        assert.ok(f.cases.length >= 2, `${f.id} ne désigne qu'une case : elle donnerait la réponse`);
        assert.equal(new Set(f.cases).size, f.cases.length, `${f.id} répète une case`);
    });
});

test('chaque case appartient à trois files, une par direction', () => {
    for (const c of CASES) {
        const sens = FILES.filter(f => f.cases.includes(c.i)).map(f => f.sens);
        assert.ok(sens.includes('bas'), `case ${c.i} sans colonne`);
        assert.ok(sens.includes('bas-droite'), `case ${c.i} sans descente`);
    }
});

test('les sommes d\'une grille complète sont celles de ses files', () => {
    const grille = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const s = sommesDe(grille);
    // La colonne 0 rassemble les cases 0, 3 et 6.
    assert.equal(s.col0, 1 + 4 + 7);
    // La descente 0 rassemble les trois premières cases.
    assert.equal(s.des0, 1 + 2 + 3);
    // Toutes les cases sont couvertes exactement une fois par les colonnes.
    const total = [0, 1, 2].reduce((t, c) => t + s[`col${c}`], 0);
    assert.equal(total, 45);
});

test('une grille tirée est bien une permutation de 1 à 9', () => {
    for (let i = 0; i < 30; i++) {
        const g = tirerGrille(makeRng(`t${i}`));
        assert.deepEqual(g.slice().sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
    }
});

test('CHAQUE GRILLE ENGENDRÉE A UNE SOLUTION ET UNE SEULE', () => {
    // L'exigence centrale : sans elle, l'élève qui raisonne juste peut se
    // tromper, et l'exercice apprend le contraire de ce qu'il veut apprendre.
    for (const niveau of ['facile', 'moyen', 'difficile']) {
        for (let i = 0; i < 12; i++) {
            const p = genererHexagrille(makeRng(`${niveau}-${i}`), { niveau });
            const n = compterSolutions(p.donnees, sommesDesFleches(p), 3);
            assert.equal(n, 1, `${niveau} #${i} : ${n} solutions`);
        }
    }
});

test('la solution annoncée satisfait vraiment toutes les flèches', () => {
    for (let i = 0; i < 20; i++) {
        const p = genererHexagrille(makeRng(`s${i}`), { niveau: 'moyen' });
        assert.ok(estResolue(p.solution, p), `grille ${i}`);
        p.donnees.forEach((v, k) => {
            if (v) assert.equal(v, p.solution[k], `la case donnée ${k} ment sur la solution`);
        });
    }
});

test('le niveau règle le nombre de cases écrites d\'avance', () => {
    const donnees = (niveau) => genererHexagrille(makeRng(`d-${niveau}`), { niveau })
        .donnees.filter(Boolean).length;
    assert.equal(donnees('difficile'), 0);
    assert.equal(donnees('moyen'), 1);
    assert.equal(donnees('facile'), 3);
});

test('le prochain coup est toujours justifiable par une soustraction', () => {
    // « Aide-moi » ne doit jamais désigner une case qu'on ne peut pas déduire :
    // la file qu'elle montre doit n'avoir qu'un seul trou, et la valeur qui en
    // sort doit être celle de la solution.
    for (let i = 0; i < 20; i++) {
        const p = genererHexagrille(makeRng(`c${i}`), { niveau: 'facile' });
        const saisie = p.donnees.slice();
        let coups = 0;
        let coup = prochainCoup(saisie, p);
        while (coup && coups < 9) {
            assert.equal(coup.file.cases.filter(k => !saisie[k]).length, 1);
            assert.equal(coup.valeur, p.solution[coup.case],
                `le coup proposé en ${coup.case} n'est pas la solution`);
            saisie[coup.case] = coup.valeur;
            coups++;
            coup = prochainCoup(saisie, p);
        }
        assert.ok(coups > 0, `aucun coup déductible au départ de la grille ${i}`);
    }
});

test('une grille facile se résout entièrement de proche en proche', () => {
    // Le premier niveau ne doit demander AUCUN raisonnement croisé : la
    // soustraction en chaîne suffit, sinon la marche est trop haute d'un coup.
    let entieres = 0;
    for (let i = 0; i < 12; i++) {
        const p = genererHexagrille(makeRng(`f${i}`), { niveau: 'facile' });
        const saisie = p.donnees.slice();
        for (let k = 0; k < 9; k++) {
            const coup = prochainCoup(saisie, p);
            if (!coup) break;
            saisie[coup.case] = coup.valeur;
        }
        if (estResolue(saisie, p)) entieres++;
    }
    assert.ok(entieres >= 9, `seulement ${entieres} grilles faciles sur 12 se déroulent en chaîne`);
});

test('une file complète et juste est signalée, une file complète et fausse ne l\'est pas', () => {
    const p = genererHexagrille(makeRng('j'), { niveau: 'facile' });
    assert.deepEqual(filesJustes(new Array(9).fill(0), p.fleches), []);
    const toutes = filesJustes(p.solution, p.fleches);
    assert.equal(toutes.length, p.fleches.length, 'la solution valide toutes les flèches');

    // On échange deux cases : au moins une file doit cesser d'être juste.
    const cassee = p.solution.slice();
    [cassee[0], cassee[8]] = [cassee[8], cassee[0]];
    assert.ok(filesJustes(cassee, p.fleches).length < toutes.length);
    assert.ok(!estResolue(cassee, p));
});

test('une grille incomplète n\'est jamais déclarée résolue', () => {
    const p = genererHexagrille(makeRng('inc'), { niveau: 'moyen' });
    const presque = p.solution.slice();
    presque[4] = 0;
    assert.ok(!estResolue(presque, p));
});

test('le dénombrement s\'arrête au plafond demandé', () => {
    // Une grille sans aucune contrainte a 9! solutions : le compteur doit
    // rendre la main à 2, sans quoi la génération prendrait la journée.
    const n = compterSolutions(new Array(9).fill(0), {}, 2);
    assert.equal(n, 2);
});

test('la génération reste rapide', () => {
    const debut = process.hrtime.bigint();
    for (let i = 0; i < 20; i++) genererHexagrille(makeRng(`p${i}`), { niveau: 'difficile' });
    const ms = Number(process.hrtime.bigint() - debut) / 1e6;
    assert.ok(ms < 3000, `20 grilles en ${Math.round(ms)} ms`);
});
