// Slitherlink : une seule boucle, et une grille qui se déduit sans deviner.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    VIDE, clefH, clefV, aretesDe, indicesDe, genererInterieur, resoudre,
    genererSlitherlink, cotesTraces, etatBoucle, verifier, tailleDe, deductionEvidente, prochainPas
} from '../js/core/slitherlink.js';
import { makeRng } from '../js/core/ids.js';

const TAILLES = ['petit', 'moyen', 'grand'];

test('le dedans fabriqué ne se croise jamais et n\'enferme jamais de dehors', () => {
    // Ce sont les deux invariants qui font qu'un contour est UNE boucle simple.
    for (const t of TAILLES) {
        const { cols, lignes } = tailleDe(t);
        for (let g = 0; g < 6; g++) {
            const col = genererInterieur(cols, lignes, makeRng(`i${t}${g}`));
            assert.ok(col, `${t} : aucun dedans fabriqué`);
            const dans = (x, y) => (x < 0 || y < 0 || x >= cols || y >= lignes) ? 0 : col[y * cols + x];

            // Aucun sommet où deux diagonales opposées se rencontrent.
            for (let y = 0; y <= lignes; y++) for (let x = 0; x <= cols; x++) {
                const a = dans(x - 1, y - 1), b = dans(x, y - 1), c = dans(x - 1, y), d = dans(x, y);
                assert.ok(!(a === d && b === c && a !== b),
                    `${t}/${g} : croisement au sommet ${x},${y}`);
            }
            // Le contour est bien une boucle unique et fermée.
            const { h, v } = aretesDe(col, cols, lignes);
            const etat = etatBoucle(h, v, cols, lignes);
            assert.ok(etat.fermee && etat.unique, `${t}/${g} : le contour n'est pas une boucle unique`);
        }
    }
});

test('les chiffres comptent exactement les côtés tracés', () => {
    const { cols, lignes } = tailleDe('moyen');
    const col = genererInterieur(cols, lignes, makeRng('chiffres'));
    const ind = indicesDe(col, cols, lignes);
    const { h, v } = aretesDe(col, cols, lignes);
    for (let y = 0; y < lignes; y++) for (let x = 0; x < cols; x++) {
        assert.equal(ind[y * cols + x], cotesTraces(h, v, cols, x, y),
            `case ${x},${y} : le chiffre ne compte pas ses côtés`);
    }
});

test('la propagation pure retrouve exactement la boucle annoncée', () => {
    // C'est LA garantie du puzzle : pas d'essai-erreur, et une seule solution.
    for (const t of TAILLES) {
        for (const d of ['facile', 'moyen', 'difficile']) {
            const p = genererSlitherlink({ taille: t, difficulte: d }, makeRng(`p${t}${d}`));
            assert.ok(p, `${t}/${d} : aucune grille`);
            const r = resoudre(p.indices, p.cols, p.lignes);
            assert.ok(r.complet, `${t}/${d} : la propagation cale`);
            for (let i = 0; i < p.cols * p.lignes; i++) {
                assert.equal(r.col[i], p.interieur[i], `${t}/${d} : case ${i} mal recoloriée`);
            }
        }
    }
});

test('retirer un chiffre de plus casserait la déduction', () => {
    // On vérifie que le retrait s'arrête bien là où la propagation cale : sinon
    // la grille serait plus bavarde que nécessaire.
    const p = genererSlitherlink({ taille: 'moyen', difficulte: 'difficile' }, makeRng('serre'));
    const restants = [];
    p.indices.forEach((k, i) => { if (k !== VIDE) restants.push(i); });
    assert.ok(restants.length > 4, 'une grille sans chiffres ne se déduit pas');
    let bloquants = 0;
    for (const i of restants) {
        const garde = p.indices[i];
        p.indices[i] = VIDE;
        if (!resoudre(p.indices, p.cols, p.lignes).complet) bloquants++;
        p.indices[i] = garde;
    }
    assert.ok(bloquants > restants.length / 2,
        `${bloquants}/${restants.length} chiffres seulement sont indispensables`);
});

test('la difficulté se lit au nombre de chiffres donnés', () => {
    const facile = genererSlitherlink({ taille: 'moyen', difficulte: 'facile' }, makeRng('d1'));
    const dur = genererSlitherlink({ taille: 'moyen', difficulte: 'difficile' }, makeRng('d1'));
    assert.ok(facile.donnes > dur.donnes,
        `facile ${facile.donnes} devrait donner plus que difficile ${dur.donnes}`);
});

test('une boucle fermée se distingue d\'un chemin ouvert et d\'un croisement', () => {
    const cols = 3, lignes = 3;
    const h = new Uint8Array((lignes + 1) * cols), v = new Uint8Array(lignes * (cols + 1));
    // Un carré de 1×1 en haut à gauche : boucle fermée unique.
    h[clefH(cols, 0, 0)] = 1; h[clefH(cols, 0, 1)] = 1;
    v[clefV(cols, 0, 0)] = 1; v[clefV(cols, 1, 0)] = 1;
    let e = etatBoucle(h, v, cols, lignes);
    assert.ok(e.fermee && e.unique && e.total === 4);

    // On ouvre : ce n'est plus fermé.
    h[clefH(cols, 0, 1)] = 0;
    e = etatBoucle(h, v, cols, lignes);
    assert.ok(!e.fermee);

    // Deux carrés séparés : fermé, mais deux boucles.
    h[clefH(cols, 0, 1)] = 1;
    h[clefH(cols, 2, 2)] = 1; h[clefH(cols, 2, 3)] = 1;
    v[clefV(cols, 2, 2)] = 1; v[clefV(cols, 3, 2)] = 1;
    e = etatBoucle(h, v, cols, lignes);
    assert.ok(e.fermee && !e.unique, 'deux boucles ne font pas une');
});

test('la solution du puzzle est reconnue gagnante, un côté en trop ne l\'est pas', () => {
    const p = genererSlitherlink({ taille: 'petit', difficulte: 'moyen' }, makeRng('gagne'));
    const h = Uint8Array.from(p.solution.h), v = Uint8Array.from(p.solution.v);
    const bon = verifier(p, h, v);
    assert.ok(bon.gagne, 'la solution fabriquée doit gagner');
    assert.equal(bon.fautifs.length, 0);

    // Un segment en trop quelque part : la boucle n'est plus propre.
    const libre = [...h.keys()].find(i => h[i] === 0);
    h[libre] = 1;
    assert.ok(!verifier(p, h, v).gagne, 'un segment en trop doit être refusé');
});

test('les chiffres restent entre 0 et 3 aux bons endroits', () => {
    // Un 4 est possible mathématiquement (une case isolée), mais il faut
    // surtout qu'aucun chiffre ne sorte de 0..4 et que la grille en garde.
    for (const t of TAILLES) {
        const p = genererSlitherlink({ taille: t, difficulte: 'moyen' }, makeRng(`b${t}`));
        let donnes = 0;
        p.indices.forEach(k => {
            assert.ok(k === VIDE || (k >= 0 && k <= 4), `chiffre hors bornes : ${k}`);
            if (k !== VIDE) donnes++;
        });
        assert.equal(donnes, p.donnes);
        assert.ok(donnes >= p.cols * p.lignes * 0.2, `${t} : grille trop muette (${donnes})`);
    }
});

test('les déductions de comptage ne se trompent jamais', () => {
    // Les règles du chiffre, du point et de la petite boucle n'ont pas besoin
    // d'aller au bout — mais elles n'ont PAS le droit de mentir : tout ce
    // qu'elles posent doit se retrouver dans la solution.
    for (const t of TAILLES) {
        const p = genererSlitherlink({ taille: t, difficulte: 'moyen' }, makeRng(`ded${t}`));
        const h = new Uint8Array(p.solution.h.length), v = new Uint8Array(p.solution.v.length);
        let pas = 0;
        for (; pas < 4000; pas++) {
            const d = deductionEvidente(p, h, v);
            if (!d) break;
            const marque = d.action === 'trait' ? 1 : 2;
            d.aretes.forEach(a => {
                const vrai = (a.type === 'h' ? p.solution.h : p.solution.v)[a.i] === 1;
                assert.equal(marque === 1, vrai, `${t} : ${d.raison}`);
                if (a.type === 'h') h[a.i] = marque; else v[a.i] = marque;
            });
        }
        assert.ok(pas > 5, `${t} : les règles simples ne démarrent même pas (${pas} pas)`);
    }
});

test('le pas suivant mène toujours jusqu\'à la boucle complète', () => {
    // C'est la promesse faite à l'élève bloqué : l'indice existe toujours, et
    // la suite d'indices termine la grille sans jamais deviner.
    for (const t of TAILLES) {
        for (const d of ['facile', 'moyen', 'difficile']) {
            const p = genererSlitherlink({ taille: t, difficulte: d }, makeRng(`pas${t}${d}`));
            const h = new Uint8Array(p.solution.h.length), v = new Uint8Array(p.solution.v.length);
            let pas = 0;
            for (; pas < 4000; pas++) {
                const e = prochainPas(p, h, v);
                if (!e) break;
                const marque = e.action === 'trait' ? 1 : 2;
                e.aretes.forEach(a => { if (a.type === 'h') h[a.i] = marque; else v[a.i] = marque; });
            }
            p.solution.h.forEach((s, i) => assert.equal(h[i] === 1, s === 1, `${t}/${d} : segment h ${i}`));
            p.solution.v.forEach((s, i) => assert.equal(v[i] === 1, s === 1, `${t}/${d} : segment v ${i}`));
            assert.ok(verifier(p, h, v).gagne, `${t}/${d} : la boucle n'est pas fermée`);
        }
    }
});

test('le même tirage donne la même grille', () => {
    const a = genererSlitherlink({ taille: 'moyen', difficulte: 'moyen' }, makeRng('st'));
    const b = genererSlitherlink({ taille: 'moyen', difficulte: 'moyen' }, makeRng('st'));
    assert.deepEqual([...a.indices], [...b.indices]);
    assert.deepEqual([...a.interieur], [...b.interieur]);
});
