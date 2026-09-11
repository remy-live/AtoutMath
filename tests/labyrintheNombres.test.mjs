// Le labyrinthe des nombres : le nombre dit de combien on saute.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    TAILLES, CONSIGNE, genererLabyrinthe, sautsPossibles, peutSauter, resoudre,
    casesVivantes, traceVide, peutAvancer, avancer, verifier, prochainSaut,
    conseil, valeur, clef, memeCase
} from '../js/core/labyrintheNombres.js';
import { makeRng } from '../js/core/ids.js';

const labyDe = (cfg, graine) => genererLabyrinthe({ ...cfg, rng: makeRng(graine) });

test('toute grille tirée est résoluble, et pas en deux sauts', () => {
    Object.entries(TAILLES).forEach(([nom, cfg]) => {
        for (let i = 0; i < 3; i++) {
            const laby = labyDe(cfg, `${nom}-${i}`);
            assert.ok(laby, `${nom} : grille produite`);
            const court = resoudre(laby);
            assert.ok(court, `${nom} : résoluble`);
            assert.ok(court.length - 1 >= 3, `${nom} : ${court.length - 1} sauts, c'est trop peu`);
            assert.equal(laby.longueur, court.length - 1);
        }
    });
});

test('la sortie n\'a pas de nombre, les autres cases en ont un', () => {
    const laby = labyDe(TAILLES.moyen, 'nombres');
    assert.equal(valeur(laby, laby.sortie[0], laby.sortie[1]), 0);
    let sansNombre = 0;
    for (let y = 0; y < laby.h; y++) {
        for (let x = 0; x < laby.l; x++) if (!valeur(laby, x, y)) sansNombre++;
    }
    assert.equal(sansNombre, 1, 'une seule case sans nombre : la sortie');
    assert.deepEqual(sautsPossibles(laby, laby.sortie), [], 'on ne repart pas de la sortie');
});

test('un saut fait exactement le nombre de cases écrit, jamais en diagonale', () => {
    const laby = labyDe(TAILLES.moyen, 'sauts');
    for (let y = 0; y < laby.h; y++) {
        for (let x = 0; x < laby.l; x++) {
            const n = valeur(laby, x, y);
            sautsPossibles(laby, [x, y]).forEach(([nx, ny]) => {
                const dx = Math.abs(nx - x), dy = Math.abs(ny - y);
                assert.ok(dx === 0 || dy === 0, 'pas de diagonale');
                assert.equal(dx + dy, n, `depuis (${x};${y}) portant ${n}`);
                assert.ok(nx >= 0 && ny >= 0 && nx < laby.l && ny < laby.h, 'dans la grille');
            });
        }
    }
});

test('une case au milieu dont le nombre dépasse la grille est une impasse', () => {
    const laby = {
        l: 5, h: 5, depart: [0, 0], sortie: [4, 4],
        grille: [
            [1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1],
            [1, 1, 4, 1, 1],   // au centre d'un 5 × 5 : quatre cases sortent partout
            [1, 1, 1, 1, 1],
            [1, 1, 1, 1, 0]
        ]
    };
    assert.deepEqual(sautsPossibles(laby, [2, 2]), []);
    assert.equal(peutSauter(laby, [2, 2], [2, 3]), false);
    // Depuis un bord, en revanche, un 4 traverse la grille.
    assert.equal(peutSauter(laby, [0, 0], [1, 0]), true);
});

test('le plus court chemin est bien le plus court', () => {
    const laby = labyDe(TAILLES.grand, 'court');
    const court = resoudre(laby);
    // Chaque pas du chemin est un saut légal.
    for (let i = 1; i < court.length; i++) {
        assert.ok(peutSauter(laby, court[i - 1], court[i]), `saut ${i} illégal`);
    }
    // Et aucun raccourci d'un saut : sinon le parcours en largeur l'aurait pris.
    assert.ok(!peutSauter(laby, laby.depart, laby.sortie) || court.length === 2);
});

test('les cases vivantes sont celles d\'où l\'on peut encore sortir', () => {
    const laby = labyDe(TAILLES.moyen, 'vivantes');
    const vivantes = casesVivantes(laby);
    assert.ok(vivantes.has(clef(...laby.depart)), 'le départ mène à la sortie');
    assert.ok(vivantes.has(clef(...laby.sortie)));
    // Une case vivante a bien un saut vers une autre case vivante (ou EST la sortie).
    vivantes.forEach(k => {
        const [x, y] = k.split(',').map(Number);
        if (memeCase([x, y], laby.sortie)) return;
        assert.ok(sautsPossibles(laby, [x, y]).some(v => vivantes.has(clef(...v))), k);
    });
});

test('le tracé refuse ce qui n\'est pas un saut, et le dit', () => {
    const laby = labyDe(TAILLES.moyen, 'refus');
    const chemin = traceVide(laby);
    const [x, y] = laby.depart;
    const n = valeur(laby, x, y);

    // La case juste à côté, si le nombre n'est pas 1 : refusée, avec la raison.
    if (n !== 1 && x + 1 < laby.l) {
        const v = peutAvancer(laby, chemin, [x + 1, y]);
        assert.equal(v.ok, false);
        assert.match(v.raison, new RegExp(`sauter de ${n} cases`));
    }
    // La diagonale : refusée aussi.
    if (x + n < laby.l && y + n < laby.h) {
        const d = peutAvancer(laby, chemin, [x + n, y + n]);
        assert.equal(d.ok, false);
        assert.match(d.raison, /diagonale/);
    }
    // Un vrai saut : accepté.
    const bons = sautsPossibles(laby, laby.depart);
    assert.ok(bons.length, 'le départ n\'est pas une impasse');
    assert.equal(peutAvancer(laby, chemin, bons[0]).ok, true);
});

test('revenir en arrière efface le dernier saut', () => {
    const laby = labyDe(TAILLES.moyen, 'retour');
    let chemin = traceVide(laby);
    const bons = sautsPossibles(laby, laby.depart);
    chemin = avancer(laby, chemin, bons[0]);
    assert.equal(chemin.length, 2);
    chemin = avancer(laby, chemin, laby.depart);
    assert.equal(chemin.length, 1);
    assert.deepEqual(chemin[0], laby.depart);
});

test('arriver sur l\'étoile gagne, et le nombre de sauts est dit', () => {
    const laby = labyDe(TAILLES.petit, 'gagne');
    const court = resoudre(laby);
    let chemin = traceVide(laby);
    court.slice(1).forEach(c => { chemin = avancer(laby, chemin, c); });
    assert.equal(chemin.length, court.length, 'tout le chemin a été accepté');
    const bilan = verifier(laby, chemin);
    assert.equal(bilan.gagne, true);
    assert.match(bilan.message, /le plus court/);
    assert.equal(verifier(laby, traceVide(laby)).gagne, false);
});

test('une impasse se signale', () => {
    const laby = {
        l: 5, h: 5, depart: [2, 2], sortie: [4, 4],
        grille: [
            [1, 1, 1, 1, 1], [1, 1, 1, 1, 1], [1, 1, 4, 1, 1],
            [1, 1, 1, 1, 1], [1, 1, 1, 1, 0]
        ]
    };
    const bilan = verifier(laby, [[2, 2]]);
    assert.equal(bilan.gagne, false);
    assert.equal(bilan.bloque, true);
    assert.match(bilan.message, /Impasse/);
});

test('le conseil dit combien compter, et dans quel sens', () => {
    const laby = labyDe(TAILLES.moyen, 'conseil');
    const chemin = traceVide(laby);
    const suite = prochainSaut(laby, chemin);
    assert.ok(suite, 'il y a un pas suivant');
    assert.ok(peutSauter(laby, laby.depart, suite));
    const dit = conseil(laby, chemin);
    assert.match(dit, /compte \d+ cases (à droite|à gauche|vers le bas|vers le haut)/);
    // Et il prévient de l'erreur classique : compter la case où l'on est.
    assert.match(dit, /juste à côté/);
});

test('la consigne dit la règle entière', () => {
    assert.match(CONSIGNE, /DE COMBIEN/);
    assert.match(CONSIGNE, /diagonale/);
    assert.match(CONSIGNE, /étoile/);
});
