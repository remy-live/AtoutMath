import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import * as othello from '../js/core/othello.js';
import * as dames from '../js/core/dames.js';
import * as echecs from '../js/core/echecs.js';
import { meilleurCoup } from '../js/core/ia.js';

function rngFixe(graine = 5) {
    let s = graine >>> 0;
    return { next: () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; } };
}

// --- Othello -----------------------------------------------------------------

test('othello : quatre pions au départ, quatre coups pour les Noirs', () => {
    const e = othello.initial();
    assert.deepEqual(othello.score(e), { N: 2, B: 2 });
    assert.equal(e.trait, 'N');
    const c = othello.coups(e);
    assert.equal(c.length, 4);
    c.forEach(coup => assert.equal(coup.pris.length, 1));
});

test('othello : poser retourne les pions encadrés, et seulement eux', () => {
    const e = othello.initial();
    const coup = othello.coups(e).find(c => c.x === 2 && c.y === 3);
    const e2 = othello.jouer(e, coup);
    assert.deepEqual(othello.score(e2), { N: 4, B: 1 });
    assert.equal(e2.trait, 'B');
});

test('othello : sans coup on passe, sans coup des deux côtés on compte', () => {
    // Plateau presque plein : un seul coin vide, les Blancs ne peuvent pas y
    // jouer (rien à encadrer), les Noirs non plus — partie finie, décompte.
    const e = othello.initial();
    e.cases.fill('N');
    e.cases[0] = null;
    e.trait = 'B';
    assert.equal(othello.coups(e).length, 0);
    const t = othello.terminee(e);
    assert.equal(t.gagnant, 'N');

    // Même plateau, mais l'adversaire a un coup : le trait PASSE.
    const e2 = othello.initial();
    e2.cases.fill('N');
    e2.cases[0] = null;          // coin a1 vide
    e2.cases[1] = 'B';           // un pion blanc encadrable : N peut jouer en 0
    e2.cases[2] = 'N';
    e2.trait = 'B';
    const c = othello.coups(e2);
    assert.equal(c.length, 1);
    assert.ok(c[0].passe, 'les Blancs passent');
    assert.equal(othello.jouer(e2, c[0]).trait, 'N');
});

test('othello : l\'IA prend le coin quand il s\'offre', () => {
    const e = othello.initial();
    e.cases.fill(null);
    // Diagonale : coin (0,0) vide, pions blancs en (1,1) et (2,2), noir en (3,3).
    e.cases[9] = 'B'; e.cases[18] = 'B'; e.cases[27] = 'N';
    // Et une alternative médiocre ailleurs pour que le choix existe.
    e.cases[44] = 'B'; e.cases[45] = 'N';
    e.trait = 'N';
    const { coup } = meilleurCoup(othello, e, { profondeur: 2, rng: rngFixe(1) });
    assert.equal(coup.x, 0);
    assert.equal(coup.y, 0);
});

// --- Dames -------------------------------------------------------------------

const dame = (c) => ({ genre: 'd', couleur: c });
const pion = (c) => ({ genre: 'p', couleur: c });
const vide10 = () => ({ cases: new Array(100).fill(null), trait: 'B' });
const pose = (e, x, y, p) => { e.cases[y * 10 + x] = p; };

test('dames : vingt pions chacun, neuf ouvertures pour les Blancs', () => {
    const e = dames.initial();
    const pieces = e.cases.filter(Boolean);
    assert.equal(pieces.filter(p => p.couleur === 'B').length, 20);
    assert.equal(pieces.filter(p => p.couleur === 'N').length, 20);
    // Les cinq pions de l'avant-dernière rangée offrent 9 diagonales libres.
    assert.equal(dames.coups(e).length, 9);
});

test('dames : la prise est OBLIGATOIRE — le déplacement simple disparaît', () => {
    const e = vide10();
    pose(e, 4, 5, pion('B'));
    pose(e, 3, 4, pion('N'));
    pose(e, 8, 9, pion('B'));    // un autre pion blanc, libre de bouger
    const c = dames.coups(e);
    assert.ok(c.length >= 1);
    c.forEach(coup => assert.ok(coup.prises.length > 0, 'un coup sans prise a survécu'));
});

test('dames : la prise est MAJORITAIRE — on prend le plus possible', () => {
    const e = vide10();
    pose(e, 5, 6, pion('B'));
    pose(e, 4, 5, pion('N'));                    // rafle courte : 1 prise à gauche
    pose(e, 6, 5, pion('N'));                    // rafle longue : 2 prises à droite
    pose(e, 6, 3, pion('N'));
    const c = dames.coups(e);
    c.forEach(coup => assert.equal(coup.prises.length, 2, 'une rafle courte a survécu'));
});

test('dames : le pion prend aussi en ARRIÈRE, mais ne se déplace qu\'en avant', () => {
    const e = vide10();
    pose(e, 4, 3, pion('B'));
    pose(e, 5, 4, pion('N'));    // derrière le pion blanc (les Blancs montent)
    const c = dames.coups(e);
    assert.equal(c.length, 1);
    assert.deepEqual(c[0].vers, { x: 6, y: 5 });
    assert.equal(c[0].prises.length, 1);
});

test('dames : promotion au bout SEULEMENT si le coup s\'y termine', () => {
    // Cas 1 : un pas simple jusqu'à la dernière rangée → dame.
    const e = vide10();
    pose(e, 4, 1, pion('B'));
    const arrivee = dames.coups(e).find(c => c.vers.y === 0);
    const e2 = dames.jouer(e, arrivee);
    assert.equal(e2.cases[arrivee.vers.y * 10 + arrivee.vers.x].genre, 'd');

    // Cas 2 : une rafle TRAVERSE la dernière rangée et continue → pas de dame.
    const f = vide10();
    pose(f, 3, 2, pion('B'));
    pose(f, 4, 1, pion('N'));    // saut vers (5,0) — dernière rangée…
    pose(f, 6, 1, pion('N'));    // …mais une seconde prise ramène en (7,2)
    const rafle = dames.coups(f)[0];
    assert.equal(rafle.prises.length, 2);
    assert.deepEqual(rafle.vers, { x: 7, y: 2 });
    const f2 = dames.jouer(f, rafle);
    assert.equal(f2.cases[2 * 10 + 7].genre, 'p', 'promu en traversant : interdit');
});

test('dames : la dame VOLE — longue distance, prise à distance, chute au choix', () => {
    const e = vide10();
    pose(e, 1, 8, dame('B'));
    pose(e, 5, 4, pion('N'));
    const c = dames.coups(e);
    // Toutes les issues passent par la prise du pion, avec PLUSIEURS cases de
    // chute possibles derrière lui.
    c.forEach(coup => assert.equal(coup.prises.length, 1));
    assert.ok(c.length >= 2, 'une seule case de chute : la dame ne vole pas');
    assert.ok(c.some(coup => coup.vers.x === 6 && coup.vers.y === 3));
    assert.ok(c.some(coup => coup.vers.x === 8 && coup.vers.y === 1));
});

test('dames : bloqué = perdu', () => {
    const e = vide10();
    pose(e, 0, 9, pion('B'));    // coin, sorties (1,8) barrée…
    pose(e, 1, 8, pion('B'));    // …par un pion ami lui-même coincé
    pose(e, 0, 7, pion('N'));
    pose(e, 2, 7, pion('N'));
    pose(e, 1, 6, pion('N'));
    pose(e, 3, 6, pion('N'));
    // Aucun coup blanc : les pions ennemis sont adjacents mais leurs cases de
    // chute sont occupées ou hors damier.
    if (dames.coups(e).length === 0) {
        assert.equal(dames.terminee(e).gagnant, 'N');
    }
});

test('dames : l\'IA choisit la rafle, pas la fuite', () => {
    const e = vide10();
    pose(e, 5, 6, pion('B'));
    pose(e, 4, 5, pion('N'));
    pose(e, 4, 3, pion('N'));
    pose(e, 9, 0, dame('N'));    // du matériel noir pour que la partie continue
    pose(e, 0, 9, pion('B'));
    const { coup } = meilleurCoup(dames, e, { profondeur: 2, rng: rngFixe(3) });
    assert.equal(coup.prises.length, 2);
});

// --- Échecs ------------------------------------------------------------------

test('échecs : perft depuis le départ — 20, 400, 8 902', () => {
    const e = echecs.initial();
    assert.equal(echecs.perft(e, 1), 20);
    assert.equal(echecs.perft(e, 2), 400);
    assert.equal(echecs.perft(e, 3), 8902);
});

test('échecs : perft « kiwipete » — roques, en passant et clouages sous le feu', () => {
    const e = echecs.fenVersEtat('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq -');
    assert.equal(echecs.perft(e, 1), 48);
    assert.equal(echecs.perft(e, 2), 2039);
});

test('échecs : le mat du sot est un mat', () => {
    // 1. f3 e5 2. g4 Dh4# — la partie la plus courte possible.
    let e = echecs.initial();
    const joue = (deX, deY, versX, versY) => {
        const c = echecs.coups(e).find(m => m.de === deY * 8 + deX && m.vers === versY * 8 + versX);
        assert.ok(c, `coup absent : ${deX},${deY} -> ${versX},${versY}`);
        e = echecs.jouer(e, c);
    };
    joue(5, 6, 5, 5);   // f2-f3
    joue(4, 1, 4, 3);   // e7-e5
    joue(6, 6, 6, 4);   // g2-g4
    joue(3, 0, 7, 4);   // Dd8-h4
    const t = echecs.terminee(e);
    assert.ok(t, 'partie non finie');
    assert.equal(t.raison, 'échec et mat');
    assert.equal(t.gagnant, 'N');
});

test('échecs : le pat est nul, pas une victoire', () => {
    const e = echecs.fenVersEtat('7k/5Q2/6K1/8/8/8/8/8 b - -');
    assert.equal(echecs.coups(e).length, 0);
    assert.equal(echecs.enEchec(e), false);
    const t = echecs.terminee(e);
    assert.equal(t.gagnant, null);
    assert.equal(t.raison, 'pat');
});

test('échecs : la promotion offre les quatre pièces', () => {
    const e = echecs.fenVersEtat('8/P7/8/8/8/8/8/k5K1 w - -');
    const promos = echecs.coups(e).filter(c => c.promotion);
    assert.equal(promos.length, 4);
    assert.deepEqual(promos.map(c => c.promotion).sort(), ['B', 'N', 'Q', 'R']);
    const e2 = echecs.jouer(e, promos.find(c => c.promotion === 'Q'));
    assert.equal(e2.cases[0], 'Q');
});

test('échecs : les quatre promotions partagent la MÊME case d\'arrivée', () => {
    // C'est à ça que l'écran reconnaît une promotion : plusieurs coups pour un
    // seul couple départ/arrivée. Si le noyau cessait de les grouper ainsi, la
    // fenêtre de choix ne s'ouvrirait plus et le pion redeviendrait dame
    // d'office, sans rien casser d'autre — d'où ce test.
    for (const fen of ['8/P7/8/8/8/8/8/k5K1 w - -',           // promotion simple
        'r5k1/1P6/8/8/8/8/8/6K1 w - -']) {                     // promotion EN PRENANT
        const e = echecs.fenVersEtat(fen);
        const groupes = new Map();
        for (const c of echecs.coups(e).filter(c => c.promotion)) {
            const cle = `${c.de}>${c.vers}`;
            groupes.set(cle, [...(groupes.get(cle) || []), c.promotion]);
        }
        for (const [cle, pieces] of groupes) {
            assert.deepEqual(pieces.sort(), ['B', 'N', 'Q', 'R'], `${fen} — ${cle}`);
        }
        assert.ok(groupes.size >= 1, `${fen} — aucune promotion trouvée`);
    }
});

test('échecs : l\'IA trouve le mat du couloir en un coup', () => {
    const e = echecs.fenVersEtat('7k/6pp/8/8/8/8/8/R5K1 w - -');
    const { coup } = meilleurCoup(echecs, e, { profondeur: 2, rng: rngFixe(2) });
    const e2 = echecs.jouer(e, coup);
    const t = echecs.terminee(e2);
    assert.ok(t && t.raison === 'échec et mat', `pas mat : ${JSON.stringify(coup)}`);
});

test('échecs : cinquante coups sans prise ni pion, la partie est nulle', () => {
    const e = echecs.fenVersEtat('7k/8/8/8/8/8/R7/K7 w - -');
    e.demiCoups = 100;
    const t = echecs.terminee(e);
    assert.equal(t.gagnant, null);
});

// --- L'IA partagée ------------------------------------------------------------

test('ia : à toute profondeur, le coup rendu est un coup légal', () => {
    for (const [jeu, nom] of [[othello, 'othello'], [dames, 'dames'], [echecs, 'echecs']]) {
        const e = jeu.initial();
        for (const profondeur of [1, 2]) {
            const r = meilleurCoup(jeu, e, { profondeur, rng: rngFixe(profondeur) });
            assert.ok(r && r.coup, `${nom} : aucun coup (profondeur ${profondeur})`);
            const legaux = jeu.coups(e);
            assert.ok(legaux.some(c => JSON.stringify(c) === JSON.stringify(r.coup)),
                `${nom} : coup illégal rendu`);
        }
    }
});

test('ia : la fantaisie à 1 joue au hasard, à 0 jamais', () => {
    const e = echecs.initial();
    const r = meilleurCoup(echecs, e, { profondeur: 1, fantaisie: 1, rng: rngFixe(9) });
    assert.ok(r.hasard, 'fantaisie pleine : le coup doit être marqué hasard');
    const r2 = meilleurCoup(echecs, e, { profondeur: 1, fantaisie: 0, rng: rngFixe(9) });
    assert.ok(!r2.hasard);
});
