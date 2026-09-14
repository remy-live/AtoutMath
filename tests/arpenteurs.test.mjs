import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    VIDE, decompositions, nombresDeLaTable, creerPartie, idx, libre,
    placementPossible, ciblesPossibles, tirerCible, poser, restant, score, conseil,
    utiliserJoker, formes
} from '../js/core/arpenteurs.js';
import { makeRng } from '../js/core/ids.js';

test('les décompositions d\'un nombre, sans doublon ni miroir', () => {
    // Le nombre vient de la table de Pythagore, la FORME non : 36 se clôture
    // aussi en 3 × 12, ce qui fait toute la richesse tactique du jeu.
    assert.deepEqual(decompositions(36), [[2, 18], [3, 12], [4, 9], [6, 6]]);
    assert.deepEqual(decompositions(12), [[2, 6], [3, 4]]);
    assert.deepEqual(decompositions(100), [[4, 25], [5, 20], [10, 10]]);
    // Une bande d'une seule case de large est exclue par défaut : toujours
    // disponible, elle ferait de la fin de partie un remplissage mécanique.
    assert.deepEqual(decompositions(7), [], '7 = 1 × 7 seulement');
    assert.deepEqual(decompositions(7, 30, 1), [[1, 7]], 'sauf si on l\'autorise');
});

test('16 offre bien deux formes : c\'est là tout l\'intérêt tactique', () => {
    assert.deepEqual(decompositions(16), [[2, 8], [4, 4]]);
});

test('les nombres de la table sont ceux des produits de 2 à 10', () => {
    const n = nombresDeLaTable(10);
    assert.ok(n.includes(4) && n.includes(36) && n.includes(100));
    assert.ok(!n.includes(7), '7 n\'est le produit d\'aucun couple de la table');
    assert.ok(!n.includes(1), 'la table commence à 2 × 2');
    assert.deepEqual(n, [...n].sort((a, b) => a - b), 'les nombres sortent triés');
    assert.equal(new Set(n).size, n.length, 'aucun doublon');
});

test('un rectangle ne se pose que dans le terrain et sur des cases libres', () => {
    const e = creerPartie({ cols: 10, rows: 6 });
    assert.equal(libre(e, 0, 0, 4, 4), true);
    assert.equal(libre(e, 8, 0, 4, 4), false, 'il dépasse à droite');
    assert.equal(libre(e, 0, 4, 4, 4), false, 'il dépasse en bas');
    assert.equal(libre(e, -1, 0, 2, 2), false);
    e.cases[idx(e, 2, 2)] = 1;
    assert.equal(libre(e, 0, 0, 4, 4), false, 'il mord sur une case prise');
    assert.equal(libre(e, 3, 0, 4, 2), true, 'à côté, ça passe toujours');
});

test('poser une parcelle juste : le terrain se remplit et la main change', () => {
    const e = creerPartie({ cols: 12, rows: 8 });
    e.cible = 36;
    const r = poser(e, 0, 0, 6, 6);
    assert.equal(r.ok, true);
    assert.equal(r.message, '6 × 6 = 36');
    assert.equal(score(e, 1), 36);
    assert.equal(score(e, 2), 0);
    assert.equal(restant(e), 12 * 8 - 36);
    assert.equal(e.joueur, 2, 'c\'est à l\'autre de jouer');
    assert.equal(e.tour, 1);
});

test('une parcelle refusée dit POURQUOI, avec l\'aire réellement tracée', () => {
    const e = creerPartie({ cols: 12, rows: 8 });
    e.cible = 36;

    const trop = poser(e, 0, 0, 5, 7);
    assert.equal(trop.ok, false);
    assert.equal(trop.raison, 'aire');
    assert.match(trop.message, /5 × 7 = 35/);
    assert.match(trop.message, /36/);
    assert.equal(e.joueur, 1, 'un coup refusé ne fait pas passer la main');
    assert.equal(restant(e), 96, 'et ne pose rien');

    e.cible = 8;
    const mince = poser(e, 0, 0, 1, 8);
    assert.equal(mince.raison, 'trop-mince', 'une bande d\'une case est interdite par défaut');

    e.cible = 36;
    poser(e, 0, 0, 6, 6);
    e.cible = 36;
    const dessus = poser(e, 0, 0, 6, 6);
    assert.equal(dessus.raison, 'occupe');
});

test('on trouve une place tant qu\'il y en a une, et on n\'en invente pas', () => {
    const e = creerPartie({ cols: 6, rows: 6 });
    assert.ok(placementPossible(e, 36), '6 × 6 tient tout juste');
    assert.equal(placementPossible(e, 49), null, 'aucune forme de 49 ne tient dans 6 × 6');

    e.cible = 36;
    poser(e, 0, 0, 6, 6);
    assert.equal(placementPossible(e, 4), null, 'le terrain est plein');
});

test('la place trouvée est réellement libre', () => {
    const e = creerPartie({ cols: 10, rows: 7 });
    e.cible = 20;
    poser(e, 0, 0, 4, 5);
    const p = placementPossible(e, 24);
    assert.ok(p, 'il reste de la place pour 24');
    assert.equal(libre(e, p.x, p.y, p.w, p.h), true);
    assert.equal(p.w * p.h, 24);
});

test('le tirage ne sort qu\'un nombre encore posable', () => {
    const rng = makeRng('tirage');
    const e = creerPartie({ cols: 9, rows: 9 });
    for (let tour = 0; tour < 6; tour++) {
        const n = tirerCible(e, rng);
        if (n === null) break;
        const p = placementPossible(e, n);
        assert.ok(p, `le tirage a sorti ${n}, impossible à poser`);
        assert.equal(poser(e, p.x, p.y, p.w, p.h).ok, true);
    }
});

test('quand plus rien ne se pose, celui dont c\'est le tour a perdu', () => {
    const e = creerPartie({ cols: 6, rows: 6 });
    e.cible = 36;
    poser(e, 0, 0, 6, 6);   // le terrain est plein, la main passe au joueur 2
    assert.equal(e.joueur, 2);
    assert.equal(tirerCible(e, makeRng('fin')), null);
    assert.equal(e.perdant, 2, 'c\'est celui qui ne peut plus poser');
    assert.deepEqual(ciblesPossibles(e), []);
});

test('une partie entière se termine toujours, et le terrain reste cohérent', () => {
    const rng = makeRng('partie');
    const e = creerPartie({ cols: 26, rows: 18 });
    let coups = 0;
    while (coups < 500) {
        const n = tirerCible(e, rng);
        if (n === null) break;
        const p = placementPossible(e, n);
        assert.equal(poser(e, p.x, p.y, p.w, p.h).ok, true);
        coups++;
    }
    assert.ok(e.perdant === 1 || e.perdant === 2, 'la partie a un perdant');
    assert.ok(coups > 5, 'une partie de 26 × 18 dure plus de cinq coups');
    assert.equal(score(e, 1) + score(e, 2) + restant(e), 26 * 18,
        'chaque case est soit libre, soit à l\'un des deux');
    // Les parcelles ne se recouvrent jamais : on recompte à la main.
    const compte = new Array(26 * 18).fill(0);
    e.parcelles.forEach(p => {
        for (let j = 0; j < p.h; j++) for (let i = 0; i < p.w; i++) compte[idx(e, p.x + i, p.y + j)]++;
    });
    assert.ok(compte.every(c => c <= 1), 'deux parcelles se chevauchent');
});

test('il reste toujours des trous à la fin — l\'aire ne dit pas la forme', () => {
    const rng = makeRng('trous');
    const e = creerPartie({ cols: 20, rows: 14 });
    while (tirerCible(e, rng) !== null) {
        const p = placementPossible(e, e.cible);
        poser(e, p.x, p.y, p.w, p.h);
    }
    assert.ok(restant(e) > 0,
        'un terrain entièrement rempli serait un hasard : la fin de partie doit laisser des trous inutilisables');
    assert.equal(placementPossible(e, 4), null, 'et même le plus petit rectangle n\'y tient plus');
});

test('le conseil énumère les décompositions, sans donner le coup', () => {
    const e = creerPartie({ cols: 20, rows: 14 });
    e.cible = 36;
    const c = conseil(e);
    assert.match(c, /4 × 9/);
    assert.match(c, /6 × 6/);

    assert.match(c, /3 × 12/, 'la forme allongée compte autant que le carré');

    // 4 n'a qu'une forme : le conseil doit le dire au lieu d'énumérer un seul
    // élément comme s'il y avait un choix.
    e.cible = 4;
    assert.match(conseil(e), /ne s'écrit que d'une façon/);
});

test('deux joueurs se partagent le terrain, personne ne joue deux fois', () => {
    const rng = makeRng('alternance');
    const e = creerPartie({ cols: 16, rows: 12 });
    const ordre = [];
    while (tirerCible(e, rng) !== null) {
        ordre.push(e.joueur);
        const p = placementPossible(e, e.cible);
        poser(e, p.x, p.y, p.w, p.h);
    }
    for (let i = 1; i < ordre.length; i++) {
        assert.notEqual(ordre[i], ordre[i - 1], 'un joueur a joué deux fois de suite');
    }
    assert.deepEqual(e.parcelles.map(p => p.joueur), ordre);
});

// --- Le joker et la partie solo ----------------------------------------------

test('le joker change le nombre, une seule fois par joueur', () => {
    const rng = makeRng('joker');
    const e = creerPartie({ cols: 20, rows: 14, table: 10 });
    tirerCible(e, rng);
    const avant = e.cible;
    const r = utiliserJoker(e, rng);
    assert.equal(r.ok, true);
    assert.notEqual(r.cible, avant, 'le joker doit donner un AUTRE nombre');
    assert.equal(e.jokers[1], 0);
    // Deuxième usage : refusé, et le nombre ne bouge plus.
    const encore = utiliserJoker(e, rng);
    assert.equal(encore.ok, false);
    assert.equal(encore.raison, 'epuise');
    assert.equal(e.cible, r.cible);
    // Le joker de l'autre joueur est intact : c'est un par personne.
    assert.equal(e.jokers[2], 1);
});

test('un joker inutile ne se consomme pas', () => {
    const rng = makeRng('joker2');
    // Terrain minuscule : il ne reste qu'un seul nombre posable.
    const e = creerPartie({ cols: 3, rows: 2, table: 10 });
    tirerCible(e, rng);
    const possibles = ciblesPossibles(e);
    if (possibles.length === 1) {
        const r = utiliserJoker(e, rng);
        assert.equal(r.ok, false);
        assert.equal(r.raison, 'seul-possible');
        assert.equal(e.jokers[1], 1, 'on ne dépense pas un joker qui ne peut rien changer');
    }
});

test('en solo, la main ne change jamais de joueur', () => {
    const rng = makeRng('solo');
    const e = creerPartie({ cols: 20, rows: 14, table: 10, joueurs: 1 });
    assert.equal(e.joueurs, 1);
    for (let coup = 0; coup < 6; coup++) {
        const n = tirerCible(e, rng);
        if (n === null) break;
        // `formes` rend des couples [a, b] : on essaie les deux orientations.
        let pose = false;
        for (const [a, bb] of formes(e, n)) {
            for (const [w, h] of [[a, bb], [bb, a]]) {
                for (let y = 0; y < e.rows && !pose; y++) for (let x = 0; x < e.cols && !pose; x++) {
                    if (libre(e, x, y, w, h)) pose = poser(e, x, y, w, h).ok;
                }
                if (pose) break;
            }
            if (pose) break;
        }
        if (!pose) break;
        assert.equal(e.joueur, 1, 'en solo, c\'est toujours au même de jouer');
    }
    assert.ok(score(e, 1) > 0, 'le joueur solo a bien clôturé');
    assert.equal(score(e, 2), 0, 'aucune case ne doit appartenir à un second joueur');
});

// --- L'adversaire de la machine ---------------------------------------------

test('le contact compte les côtés qui touchent un bord ou une clôture', async () => {
    const { creerPartie, contact, poser, tirerCible } = await import('../js/core/arpenteurs.js');
    const e = creerPartie({ cols: 10, rows: 10, table: 6 });
    // Un carré 2 × 2 dans le coin : quatre côtés touchent les deux bords.
    assert.equal(contact(e, 0, 0, 2, 2), 4);
    // Le même carré en plein milieu ne touche rien.
    assert.equal(contact(e, 4, 4, 2, 2), 0);
});

test('la machine préfère se coller aux bords', async () => {
    const { creerPartie, coupOrdinateur, placements } = await import('../js/core/arpenteurs.js');
    const { makeRng } = await import('../js/core/ids.js');
    const e = creerPartie({ cols: 10, rows: 10, table: 6 });
    e.cible = 4;
    const tous = placements(e, 4);
    const meilleure = Math.max(...tous.map(c => c.qualite));
    for (let i = 0; i < 20; i++) {
        const c = coupOrdinateur(e, makeRng(`f${i}`), 'fort');
        assert.ok(Math.abs(c.qualite - meilleure) < 1e-9,
            'le mode fort doit prendre la meilleure place');
        assert.equal(c.w * c.h, 4);
    }
});

test('la machine remplit un terrain sans jamais poser un coup illégal', async () => {
    const { creerPartie, tirerCible, coupOrdinateur, poser, restant } = await import('../js/core/arpenteurs.js');
    const { makeRng } = await import('../js/core/ids.js');
    const rng = makeRng('remplir');
    const e = creerPartie({ cols: 12, rows: 9, table: 6 });
    let coups = 0;
    while (coups < 40) {
        tirerCible(e, rng);
        if (!e.cible) break;
        const c = coupOrdinateur(e, rng, 'normal');
        if (!c) break;
        const r = poser(e, c.x, c.y, c.w, c.h);
        assert.ok(r.ok, `coup refusé : ${r.raison}`);
        coups++;
    }
    assert.ok(coups > 5, `la machine n'a joué que ${coups} coups`);
    // Elle laisse peu de place perdue : c'est tout l'intérêt de l'heuristique.
    assert.ok(restant(e) < 12 * 9 * 0.25, `${restant(e)} cases laissées libres`);
});

test('la machine ne joue son joker que si un autre nombre vaut nettement mieux', async () => {
    const { creerPartie, jokerUtile } = await import('../js/core/arpenteurs.js');
    const { makeRng } = await import('../js/core/ids.js');
    const e = creerPartie({ cols: 10, rows: 10, table: 6 });
    // Terrain vide, cible 4 : il y a des coins partout, aucun besoin de joker.
    e.cible = 4;
    assert.equal(jokerUtile(e, makeRng('j')), false);
    // Sans joker en réserve, jamais.
    e.jokers[e.joueur] = 0;
    assert.equal(jokerUtile(e, makeRng('j')), false);
});
