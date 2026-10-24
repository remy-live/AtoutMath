// Coder une figure : ce que la figure dit, et ce que l'élève en écrit.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    TYPES_CODAGE, ORDRE_SEGMENTS, ORDRE_COTES, POINTS_ANGLE,
    construireFigure, longueur, classesDeLongueur, estAngleDroit, anglesDroitsDe,
    canoniser, codageAttendu, verifierCodage, PROPRIETES, segmentsDe, pointsAngleDe, direLeCodage, direLeCodageAttendu
} from '../js/core/codage.js';

const carre = () => construireFigure('carre', { cote: 10 });
const rectangle = () => construireFigure('rectangle', { L: 12, l: 5 });
const losange = () => construireFigure('losange', { p: 16, q: 12 });
const parallelo = () => construireFigure('parallelogramme', { base: 12, hauteur: 6, decalage: 4 });

test('les quatre familles se construisent avec leurs huit segments', () => {
    [carre(), rectangle(), losange(), parallelo()].forEach(fig => {
        ORDRE_SEGMENTS.forEach(id => {
            assert.ok(longueur(fig, id) > 0, `${fig.type} : ${id} est de longueur nulle`);
        });
    });
});

test('les diagonales se coupent en leur milieu dans les quatre familles', () => {
    [carre(), rectangle(), losange(), parallelo()].forEach(fig => {
        assert.ok(Math.abs(longueur(fig, 'AO') - longueur(fig, 'OC')) < 1e-9, fig.type);
        assert.ok(Math.abs(longueur(fig, 'BO') - longueur(fig, 'OD')) < 1e-9, fig.type);
    });
});

test('le carré : quatre côtés égaux, quatre demi-diagonales égales, tout droit', () => {
    const fig = carre();
    assert.deepEqual(classesDeLongueur(fig), [
        ['AB', 'BC', 'CD', 'DA'],
        ['AO', 'OC', 'BO', 'OD']
    ]);
    assert.deepEqual(anglesDroitsDe(fig), ['A', 'B', 'C', 'D', 'O']);
    assert.equal(codageAttendu(fig), '11112222/ABCDO');
});

test('le rectangle : côtés opposés, diagonales égales, pas d\'angle droit au centre', () => {
    const fig = rectangle();
    assert.deepEqual(classesDeLongueur(fig), [
        ['AB', 'CD'],
        ['BC', 'DA'],
        ['AO', 'OC', 'BO', 'OD']
    ]);
    assert.deepEqual(anglesDroitsDe(fig), ['A', 'B', 'C', 'D']);
    assert.equal(estAngleDroit(fig, 'O'), false);
    assert.equal(codageAttendu(fig), '12123333/ABCD');
});

test('le losange : quatre côtés égaux, diagonales perpendiculaires et inégales', () => {
    const fig = losange();
    assert.deepEqual(classesDeLongueur(fig), [
        ['AB', 'BC', 'CD', 'DA'],
        ['AO', 'OC'],
        ['BO', 'OD']
    ]);
    assert.equal(longueur(fig, 'AB'), 10);   // 8-6-10
    assert.deepEqual(anglesDroitsDe(fig), ['O']);
    assert.equal(codageAttendu(fig), '11112233/O');
});

test('le parallélogramme : quatre paquets, aucun angle droit', () => {
    const fig = parallelo();
    assert.deepEqual(classesDeLongueur(fig), [
        ['AB', 'CD'], ['BC', 'DA'], ['AO', 'OC'], ['BO', 'OD']
    ]);
    assert.deepEqual(anglesDroitsDe(fig), []);
    assert.equal(codageAttendu(fig), '12123344/');
});

test('pencher la figure ne change rien à son codage', () => {
    TYPES_CODAGE.forEach(type => {
        const dims = { carre: { cote: 10 }, rectangle: { L: 12, l: 5 },
            losange: { p: 16, q: 12 },
            parallelogramme: { base: 12, hauteur: 6, decalage: 4 } }[type];
        const droite = construireFigure(type, dims, 0);
        const penchee = construireFigure(type, dims, 0.7);
        assert.equal(codageAttendu(penchee), codageAttendu(droite), type);
        ORDRE_SEGMENTS.forEach(id => {
            assert.ok(Math.abs(longueur(penchee, id) - longueur(droite, id)) < 1e-9, `${type} ${id}`);
        });
    });
});

test('le symbole choisi ne compte pas, seul le partage compte', () => {
    const a = { marques: { AB: 1, BC: 1, CD: 1, DA: 1, AO: 2, OC: 2, BO: 2, OD: 2 }, angles: {} };
    const b = { marques: { AB: 3, BC: 3, CD: 3, DA: 3, AO: 1, OC: 1, BO: 1, OD: 1 }, angles: {} };
    assert.equal(canoniser(a), canoniser(b));
    // ... mais un partage différent donne bien une autre chaîne.
    const c = { marques: { AB: 1, BC: 2, CD: 1, DA: 2, AO: 3, OC: 3, BO: 3, OD: 3 }, angles: {} };
    assert.notEqual(canoniser(c), canoniser(a));
});

test('un segment nu se voit dans la forme canonique', () => {
    const pose = { marques: { AB: 1, BC: 1, CD: 1 }, angles: {} };
    assert.equal(canoniser(pose), '11100000/');
});

test('le codage juste est accepté, dans les quatre familles', () => {
    [carre(), rectangle(), losange(), parallelo()].forEach(fig => {
        const marques = {};
        classesDeLongueur(fig).forEach((classe, i) => classe.forEach(id => { marques[id] = i + 1; }));
        const angles = {};
        anglesDroitsDe(fig).forEach(p => { angles[p] = true; });
        const v = verifierCodage(fig, { marques, angles });
        assert.equal(v.correct, true, `${fig.type} : ${JSON.stringify(v.problemes)}`);
        assert.equal(canoniser({ marques, angles }), codageAttendu(fig));
    });
});

test('la même marque sur deux longueurs différentes est refusée, et dite', () => {
    const fig = rectangle();
    const v = verifierCodage(fig, {
        marques: { AB: 1, BC: 1, CD: 1, DA: 1, AO: 2, OC: 2, BO: 2, OD: 2 },
        angles: { A: true, B: true, C: true, D: true }
    });
    assert.equal(v.correct, false);
    const faux = v.problemes.find(p => p.genre === 'faux-egal');
    assert.ok(faux, 'la fausse égalité doit être signalée');
    assert.match(faux.message, /pas la même longueur/);
});

test('une égalité vraie mais codée différemment est signalée', () => {
    const fig = carre();
    const v = verifierCodage(fig, {
        marques: { AB: 1, BC: 2, CD: 1, DA: 2, AO: 3, OC: 3, BO: 3, OD: 3 },
        angles: { A: true, B: true, C: true, D: true, O: true }
    });
    assert.equal(v.correct, false);
    assert.ok(v.problemes.some(p => p.genre === 'egalite-oubliee'));
});

test('l\'angle droit au centre est refusé sur un rectangle, exigé sur un losange', () => {
    const rect = rectangle();
    const trop = verifierCodage(rect, {
        marques: { AB: 1, BC: 2, CD: 1, DA: 2, AO: 3, OC: 3, BO: 3, OD: 3 },
        angles: { A: true, B: true, C: true, D: true, O: true }
    });
    assert.ok(trop.problemes.some(p => p.genre === 'faux-angle'));
    assert.match(trop.problemes.find(p => p.genre === 'faux-angle').message, /diagonales/);

    const los = losange();
    const manque = verifierCodage(los, {
        marques: { AB: 1, BC: 1, CD: 1, DA: 1, AO: 2, OC: 2, BO: 3, OD: 3 },
        angles: {}
    });
    assert.ok(manque.problemes.some(p => p.genre === 'angle-oublie'));
});

test('ce qui manque est annoncé avant ce qui est faux', () => {
    const fig = carre();
    const v = verifierCodage(fig, { marques: { AB: 1 }, angles: { A: true } });
    assert.equal(v.problemes[0].genre, 'manque');
    assert.match(v.problemes[0].message, /7 segments/);
});

test('une figure vierge : rien n\'est codé, et on le dit gentiment', () => {
    const v = verifierCodage(carre(), { marques: {}, angles: {} });
    assert.equal(v.problemes[0].genre, 'manque');
    assert.match(v.problemes[0].message, /Rien n'est codé/);
});

test('sans les diagonales, on ne code que les côtés et les sommets', () => {
    const fig = rectangle();
    const ids = segmentsDe(false), pts = pointsAngleDe(false);
    assert.deepEqual(ids, ORDRE_COTES);
    assert.ok(!pts.includes('O'));
    assert.equal(codageAttendu(fig, ids, pts), '1212/ABCD');
    const v = verifierCodage(fig, {
        marques: { AB: 1, BC: 2, CD: 1, DA: 2 },
        angles: { A: true, B: true, C: true, D: true }
    }, ids, pts);
    assert.equal(v.correct, true);
});

test('chaque famille a ses propriétés, en français', () => {
    TYPES_CODAGE.forEach(t => {
        assert.ok(Array.isArray(PROPRIETES[t]) && PROPRIETES[t].length >= 3, t);
        PROPRIETES[t].forEach(p => assert.equal(typeof p, 'string'));
    });
    assert.equal(POINTS_ANGLE.length, 5);
});

// ── CE QUE LE CARNET D'ERREURS ÉCRIT ────────────────────────────────────────
//
// RÉMY : « le carnet d'erreur code la figure ne veut rien dire ». Il y lisait
// « ta réponse : 11223300/ABD, attendu : 11223344/ABCD » — la forme CANONIQUE,
// celle qui sert à juger. Elle reste ; une seconde forme, lisible, part
// désormais au journal.

test('le codage se dit en français, et la phrase nomme les segments marqués', () => {
    const fig = rectangle();
    const ids = segmentsDe(true), pts = pointsAngleDe(true);
    const dit = direLeCodageAttendu(fig, ids, pts);

    // AUCUN CHIFFRE DE LA FORME CANONIQUE NE DOIT SUBSISTER. C'est le défaut
    // exact que Rémy décrit : une suite de chiffres et une barre oblique.
    assert.ok(!/\d{3,}\//.test(dit), `la forme canonique a fui dans la phrase : ${dit}`);
    // Les quatre côtés d'un rectangle vont deux par deux, et les quatre
    // demi-diagonales ensemble : la phrase doit MONTRER ces paquets.
    assert.match(dit, /\[AB\] = \[CD\]/, dit);
    assert.match(dit, /\[BC\] = \[DA\]/, dit);
    assert.match(dit, /\[AO\] = \[OC\] = \[BO\] = \[OD\]/, dit);
    assert.match(dit, /angles droits en A, B, C, D/, dit);
});

test('une figure non codée le dit, au lieu de rendre une suite de zéros', () => {
    const ids = segmentsDe(true), pts = pointsAngleDe(true);
    const dit = direLeCodage({}, ids, pts);
    assert.match(dit, /sans marque/, dit);
    assert.match(dit, /aucun angle droit/, dit);
    assert.ok(!/0{3,}/.test(dit), dit);
});

test('une marque posée toute seule est nommée comme telle', () => {
    // C'EST LA FAUTE FRÉQUENTE, et la taire rendrait la phrase fausse : une
    // marque sur un seul segment n'affirme aucune égalité.
    const ids = segmentsDe(false), pts = pointsAngleDe(false);
    const dit = direLeCodage({ marques: { AB: 1 }, angles: {} }, ids, pts);
    assert.match(dit, /\[AB\] marqué seul/, dit);
});

test('la phrase et la forme canonique décrivent le MÊME codage', () => {
    // Deux routes vers la même vérité : si l'une ment, l'autre le dit. On
    // compte les paquets dans chacune, et les deux comptes doivent coïncider.
    for (const fig of [carre(), rectangle(), losange(), parallelo()]) {
        const ids = segmentsDe(true), pts = pointsAngleDe(true);
        const canon = codageAttendu(fig, ids, pts);
        const paquets = new Set(canon.split('/')[0].split('').filter(c => c !== '0')).size;
        const dit = direLeCodageAttendu(fig, ids, pts);
        const groupes = dit.split(' — ')[0].split(' ; ').filter(g => !/^sans marque/.test(g)).length;
        assert.equal(groupes, paquets,
            `${fig.type} : ${paquets} paquets dans « ${canon} », ${groupes} dans « ${dit} »`);
        const droits = (canon.split('/')[1] || '').length;
        const ditDroits = /aucun angle droit/.test(dit)
            ? 0 : dit.split('en ').pop().split(', ').length;
        assert.equal(ditDroits, droits, `${fig.type} : ${dit}`);
    }
});
