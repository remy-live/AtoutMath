import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import {
    COULEURS, palette, indices, tousLesCodes, compatible, compatibles, certitudes,
    estResoluMastermind, creerMastermind, creerDeduction, qualiteMastermind, FORMATS
} from '../js/core/mastermind.js';
import { mastermindFicheGenerator as G } from '../js/core/generators/mastermindFiche.js';

const C = (s) => s.split('');

test('les deux nombres sont ceux du jeu de société', () => {
    assert.deepEqual(indices(C('RBVJ'), C('RBVJ')), { places: 4, presents: 0 });
    assert.deepEqual(indices(C('RBVJ'), C('JVBR')), { places: 0, presents: 4 });
    assert.deepEqual(indices(C('RBVJ'), C('RBJV')), { places: 2, presents: 2 });
    // Une couleur absente ne compte jamais, où qu'elle soit.
    assert.deepEqual(indices(C('RBVJ'), C('MMMM')), { places: 0, presents: 0 });
});

test('UNE COULEUR RÉPÉTÉE NE COMPTE PAS DEUX FOIS', () => {
    // C'est LA faute d'implémentation du mastermind, et la subtilité que
    // l'exercice fait rencontrer. Secret R B B V, essai B B R R : un B bien
    // placé (le deuxième) ; il reste { R, B, V } dans le secret et { B, R }
    // dans l'essai — donc DEUX mal placés, pas trois.
    assert.deepEqual(indices(C('RBBV'), C('BBRR')), { places: 1, presents: 2 });
    // Deux jetons proposés de la même couleur, un seul dans le code.
    assert.deepEqual(indices(C('RBVJ'), C('RRRR')), { places: 1, presents: 0 });
    // Deux dans le code, un seul proposé.
    assert.deepEqual(indices(C('RRVJ'), C('RVJM')), { places: 1, presents: 2 });
    // Le total ne dépasse jamais la longueur du code.
    const codes = tousLesCodes(palette(4), 4, true);
    for (let i = 0; i < 200; i++) {
        const a = codes[i * 7 % codes.length], b = codes[i * 13 % codes.length];
        const r = indices(a, b);
        assert.ok(r.places + r.presents <= 4, `${a.join('')} / ${b.join('')} : ${JSON.stringify(r)}`);
    }
});

test('la réponse est symétrique : compter d\'un côté ou de l\'autre donne la même chose', () => {
    // Ce n'est pas une coquetterie : c'est ce qui permet de filtrer les
    // candidats en comparant `indices(candidat, essai)` à la réponse obtenue
    // pour `indices(secret, essai)`. Si la fonction n'était pas symétrique,
    // tout le filtrage serait faux.
    const codes = tousLesCodes(palette(4), 4, true);
    for (let i = 0; i < 300; i++) {
        const a = codes[i * 11 % codes.length], b = codes[i * 29 % codes.length];
        assert.deepEqual(indices(a, b), indices(b, a), `${a.join('')} / ${b.join('')}`);
    }
});

test('l\'espace des codes a la taille qu\'on annonce', () => {
    assert.equal(tousLesCodes(palette(6), 4, true).length, 1296);
    assert.equal(tousLesCodes(palette(4), 4, true).length, 256);
    assert.equal(tousLesCodes(palette(8), 5, true).length, 32768);
    // Sans répétition : 6 × 5 × 4 × 3.
    assert.equal(tousLesCodes(palette(6), 4, false).length, 360);
    tousLesCodes(palette(6), 4, false).forEach(c =>
        assert.equal(new Set(c).size, 4, `${c.join('')} répète une couleur`));
});

test('les couleurs ont toutes une initiale différente', () => {
    // C'est l'initiale qui porte l'information sur une fiche photocopiée : deux
    // couleurs partageant leur lettre rendraient l'exercice insoluble en noir
    // et blanc.
    assert.equal(new Set(COULEURS.map(c => c.id)).size, COULEURS.length);
    COULEURS.forEach(c => {
        assert.match(c.id, /^[A-Z]$/);
        assert.match(c.hex, /^#[0-9a-f]{6}$/);
        assert.ok(c.nom && c.nom.length > 2);
    });
});

test('les cases certaines sont celles que TOUS les candidats partagent', () => {
    assert.deepEqual(certitudes([C('RBVJ'), C('RBVM'), C('RBOM')]), ['R', 'B', null, null]);
    assert.deepEqual(certitudes([C('RBVJ')]), ['R', 'B', 'V', 'J']);
    assert.deepEqual(certitudes([]), []);
});

test('une grille imprimée a UNE solution, et c\'est celle qu\'on garde', () => {
    // Sans unicité, deux élèves rendent deux réponses justes et différentes, et
    // la correction devient impossible.
    for (const format of Object.keys(FORMATS)) {
        for (const repetitions of [true, false]) {
            for (let i = 0; i < 4; i++) {
                const g = creerDeduction({
                    format, repetitions, rng: makeRng(`u-${format}-${repetitions}-${i}`)
                });
                assert.ok(g, `${format}/${repetitions} : aucune grille`);
                const codes = tousLesCodes(g.couleurs, g.longueur, g.repetitions);
                const restants = compatibles(codes, g.lignes);
                assert.equal(restants.length, 1,
                    `${format}/${repetitions} #${i} : ${restants.length} solutions`);
                assert.deepEqual(restants[0], g.secret);
            }
        }
    }
});

test('aucune ligne imprimée n\'est inutile', () => {
    // Une ligne qui n'apprend rien fait chercher pour rien — et fait douter de
    // celles qui servent. On vérifie qu'en retirer n'importe laquelle rend le
    // code ambigu.
    for (const format of Object.keys(FORMATS)) {
        for (let i = 0; i < 4; i++) {
            const g = creerDeduction({ format, rng: makeRng(`m-${format}-${i}`) });
            const codes = tousLesCodes(g.couleurs, g.longueur, g.repetitions);
            g.lignes.forEach((_, k) => {
                const sans = g.lignes.filter((__, j) => j !== k);
                assert.ok(compatibles(codes, sans).length > 1,
                    `${format} #${i} : la ligne ${k + 1} ne sert à rien`);
            });
        }
    }
});

test('une grille imprimée compte assez de lignes pour se déduire', () => {
    // Une énigme d'une ligne n'est pas une énigme : elle se devine.
    for (const format of Object.keys(FORMATS)) {
        for (let i = 0; i < 6; i++) {
            const g = creerDeduction({ format, rng: makeRng(`n-${format}-${i}`) });
            assert.ok(g.lignes.length >= 3, `${format} #${i} : ${g.lignes.length} ligne(s)`);
            assert.ok(g.lignes.length <= 8, `${format} #${i} : ${g.lignes.length} lignes, trop`);
        }
    }
});

test('la ligne imprimée n\'est jamais le code lui-même', () => {
    // Elle donnerait la réponse : quatre bien placés, zéro mal placé.
    for (let i = 0; i < 12; i++) {
        const g = creerDeduction({ rng: makeRng('s' + i) });
        g.lignes.forEach(l => {
            assert.notEqual(l.code.join(''), g.secret.join(''), 'une ligne donne la réponse');
            assert.ok(l.places < g.longueur, 'une ligne annonce tout bien placé');
        });
    }
});

test('les réponses imprimées sont VRAIES', () => {
    // Le noyau les a calculées ; on les recalcule ici depuis le secret, pour que
    // personne ne puisse un jour les recopier de travers.
    for (let i = 0; i < 12; i++) {
        const g = creerDeduction({ format: 'difficile', rng: makeRng('v' + i) });
        g.lignes.forEach(l => {
            assert.deepEqual(indices(g.secret, l.code),
                { places: l.places, presents: l.presents });
        });
    }
});

test('sans répétition, ni le code ni les essais ne répètent une couleur', () => {
    for (let i = 0; i < 8; i++) {
        const g = creerDeduction({ format: 'moyen', repetitions: false, rng: makeRng('r' + i) });
        assert.equal(new Set(g.secret).size, g.longueur);
        g.lignes.forEach(l => assert.equal(new Set(l.code).size, g.longueur,
            `${l.code.join('')} répète une couleur`));
    }
});

test('la partie à l\'écran donne un secret jouable et un nombre d\'essais sensé', () => {
    for (const format of Object.keys(FORMATS)) {
        const m = creerMastermind({ format, rng: makeRng('e' + format) });
        assert.equal(m.secret.length, m.longueur);
        assert.equal(m.couleurs.length, FORMATS[format].nbCouleurs);
        m.secret.forEach(id => assert.ok(m.couleurs.some(c => c.id === id)));
        assert.ok(m.essaisMax >= 5 && m.essaisMax <= 12);
        assert.ok(estResoluMastermind(m.secret, m.secret));
        assert.ok(!estResoluMastermind(m.secret, m.secret.slice().reverse())
            || m.secret.every(c => c === m.secret[0]));
    }
});

test('le filtrage des candidats garde toujours le secret', () => {
    // Le jeu compte « il reste N codes possibles » : si le filtrage éliminait
    // le vrai code, ce nombre mentirait et l'indice donnerait une fausse
    // certitude.
    const m = creerMastermind({ format: 'moyen', rng: makeRng('filtre') });
    const codes = tousLesCodes(m.couleurs, m.longueur, m.repetitions);
    const lignes = [];
    let restants = codes;
    for (let i = 0; i < 4 && restants.length > 1; i++) {
        const essai = restants[(i * 37) % restants.length];
        lignes.push({ code: essai, ...indices(m.secret, essai) });
        restants = compatibles(codes, lignes);
        assert.ok(restants.some(c => c.join('') === m.secret.join('')),
            'le filtrage a éliminé le vrai code');
        assert.ok(compatible(m.secret, lignes));
        // Ce qui est certain doit l'être : le secret porte ces couleurs-là.
        certitudes(restants).forEach((c, k) => {
            if (c) assert.equal(m.secret[k], c, `case ${k} annoncée ${c} à tort`);
        });
    }
});

test('le générateur de fiche rend de quoi imprimer ET corriger', () => {
    const it = G.generate({ format: 'moyen', repetitions: true },
        { rng: makeRng('fiche'), index: 0 });
    const m = it.meta;
    assert.equal(m.secret.length, 4);
    assert.equal(m.depart, 1296);
    assert.equal(it.answer, m.secret.join(''));
    // Le corrigé montre la DESCENTE : c'est la leçon du jeu, on n'a pas deviné,
    // on a éliminé.
    assert.ok(it.explanation.includes('1296'));
    assert.equal(m.etapes.length, m.lignes.length);
    assert.equal(m.etapes[m.etapes.length - 1].apres, 1);
    // Chaque essai réduit strictement le nombre de possibles.
    m.etapes.forEach(e => assert.ok(e.apres < e.avant, `${e.code} n'élimine rien`));
});

test('un réglage impossible ne rend jamais un bloc vide', () => {
    // Cinq cases sans répétition dans une palette de quatre n'existe pas : le
    // générateur doit retomber sur un format qui marche plutôt que de laisser
    // un trou dans la fiche.
    const it = G.generate({ format: 'inconnu', repetitions: false },
        { rng: makeRng('bof'), index: 0 });
    assert.ok(it.meta.lignes.length >= 3);
    assert.equal(it.meta.secret.length, it.meta.longueur);
});

test('la qualité raconte la partie', () => {
    const g = creerDeduction({ format: 'facile', rng: makeRng('q') });
    const q = qualiteMastermind(g);
    assert.equal(q.depart, 256);
    assert.equal(q.secret, g.secret.join(''));
    assert.equal(q.etapes[q.etapes.length - 1].apres, 1);
});
