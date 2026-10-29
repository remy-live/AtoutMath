// LES PENTAMINOS — 29 octobre.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, devant la maquette : « les penamios, ca me va ».
//
// CE QUE CETTE ÉPREUVE GARDE :
//
//   · LES DOUZE PIÈCES SONT LES DOUZE PENTAMINOS. Cinq cases chacune, toutes
//     d'un seul tenant, et deux à deux différentes même en les tournant. Une
//     faute de frappe dans la table donnerait une treizième pièce ou un doublon,
//     et rien ne le dirait : le jeu se jouerait pareil, en moins juste.
//   · LE NOMBRE D'ORIENTATIONS EST CELUI DE LA SYMÉTRIE. Le X n'en a qu'une,
//     le I deux, le T quatre, le F huit. Ce n'est pas un détail de code :
//     c'est ce que l'élève manipule quand il appuie sur « Tourner » sans que
//     rien ne change, et l'instruction le lui dit.
//   · TOUTE GRILLE SERVIE A UN PAVAGE. On ne tire jamais un jeu de pièces au
//     hasard pour voir ensuite s'il rentre : la plupart des paquets de quatre
//     pentaminos ne pavent AUCUN 4 × 5, et l'élève chercherait une solution
//     qui n'existe pas. C'est la garde la plus importante du fichier.
//   · ET UNE POSE QUI SORT OU QUI CHEVAUCHE EST REFUSÉE.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import '../js/core/activities/index.js';
import { exercices } from '../js/data/catalog.js';
import { getGenerator } from '../js/core/registry.js';
import { makeRng } from '../js/core/ids.js';
import {
    FORMES, NIVEAUX, TEINTES, couvertes, estFini, normaliser, orientations,
    posees, poseTient, resoudre, retourner, tirerPuzzle, tourner
} from '../js/core/pentaminos.js';

const ID = 'logi-pentaminos';
const empreinte = (c) => normaliser(c).map(p => p.join(',')).join(' ');

test('LES DOUZE PIÈCES SONT LES DOUZE PENTAMINOS', () => {
    const ids = Object.keys(FORMES);
    assert.equal(ids.length, 12, `${ids.length} pièces au lieu de douze`);
    const vues = new Map();
    for (const id of ids) {
        const cells = FORMES[id];
        assert.equal(cells.length, 5, `${id} n'a pas cinq cases`);
        assert.equal(new Set(cells.map(c => c.join(','))).size, 5,
            `${id} a deux fois la même case`);
        // D'UN SEUL TENANT : une pièce en deux morceaux se poserait en deux
        // endroits à la fois, et le pavage trouvé serait un mensonge.
        const vu = new Set([cells[0].join(',')]);
        const file = [cells[0]];
        while (file.length) {
            const [x, y] = file.pop();
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const k = `${x + dx},${y + dy}`;
                if (vu.has(k)) continue;
                if (!cells.some(c => c[0] === x + dx && c[1] === y + dy)) continue;
                vu.add(k); file.push([x + dx, y + dy]);
            }
        }
        assert.equal(vu.size, 5, `${id} n'est pas d'un seul tenant`);
        // ET TOUTES DIFFÉRENTES, MÊME TOURNÉES : deux pièces identiques à une
        // rotation près, c'est un pentamino manquant et un doublon servi.
        for (const o of orientations(cells)) {
            const e = empreinte(o);
            assert.ok(!vues.has(e) || vues.get(e) === id,
                `${id} et ${vues.get(e)} sont la même pièce, tournée`);
            vues.set(e, id);
        }
        assert.ok(TEINTES[id], `${id} n'a pas de couleur`);
    }
});

test('LE NOMBRE D\'ORIENTATIONS EST CELUI DE LA SYMÉTRIE DE LA PIÈCE', () => {
    // Les douze valeurs sont connues depuis toujours et ne dépendent pas de
    // nous : c'est pour cela qu'elles font une bonne garde. Le X est le plus
    // symétrique — une croix se ressemble dans les quatre sens —, le I n'a que
    // l'horizontale et la verticale, et le F, le L, le N, le P, le Y n'ont
    // aucune symétrie du tout.
    const ATTENDU = { F: 8, I: 2, L: 8, N: 8, P: 8, T: 4, U: 4, V: 4, W: 4, X: 1, Y: 8, Z: 4 };
    for (const [id, n] of Object.entries(ATTENDU)) {
        assert.equal(orientations(FORMES[id]).length, n,
            `${id} : ${orientations(FORMES[id]).length} orientations au lieu de ${n}`);
    }
});

test('ET QUATRE QUARTS DE TOUR RAMÈNENT LA PIÈCE OÙ ELLE ÉTAIT', () => {
    for (const id of Object.keys(FORMES)) {
        const d = normaliser(FORMES[id]);
        assert.equal(empreinte(tourner(tourner(tourner(tourner(d))))), empreinte(d),
            `${id} : quatre quarts de tour ne reviennent pas au départ`);
        assert.equal(empreinte(retourner(retourner(d))), empreinte(d),
            `${id} : deux miroirs ne reviennent pas au départ`);
    }
});

test('TOUTE GRILLE SERVIE A UN PAVAGE, ET C\'EST CELUI QU\'ON SERT', () => {
    // CE QUE CETTE GARDE EMPÊCHE : qu'on tire un jour les pièces au hasard
    // « pour varier ». La plupart des paquets de quatre pentaminos ne pavent
    // aucun 4 × 5, et l'élève chercherait pendant dix minutes une solution qui
    // n'existe pas — c'est la pire chose qu'un jeu de placement puisse faire.
    for (const niveau of [1, 2, 3]) {
        const { largeur, hauteur } = NIVEAUX[niveau];
        for (let i = 0; i < 25; i++) {
            const p = tirerPuzzle(makeRng(`pz${niveau}-${i}`), niveau);
            assert.equal(p.largeur, largeur);
            assert.equal(p.hauteur, hauteur);
            assert.equal(p.combien, (largeur * hauteur) / 5);
            assert.equal(p.pieces.length, p.combien, 'le compte des pièces ne suit pas');
            assert.equal(new Set(p.pieces).size, p.combien,
                `la même pièce est servie deux fois : ${p.pieces.join(' ')}`);
            assert.equal(p.solution.length, p.combien);
            assert.ok(estFini(p.solution, largeur, hauteur),
                `le pavage servi ne remplit pas le ${largeur} × ${hauteur}`);
            // Et il emploie EXACTEMENT les pièces du jeu, chacune une fois.
            assert.deepEqual([...p.solution.map(s => s.id)].sort(), [...p.pieces].sort());
            for (const s of p.solution) {
                assert.equal(s.cells.length, 5, `${s.id} posé avec ${s.cells.length} cases`);
                for (const [a, b] of posees(s.cells, s.x, s.y)) {
                    assert.ok(a >= 0 && b >= 0 && a < largeur && b < hauteur,
                        `${s.id} déborde du rectangle`);
                }
            }
        }
    }
});

test('UNE POSE QUI SORT OU QUI CHEVAUCHE EST REFUSÉE', () => {
    const forme = normaliser(FORMES.I);          // cinq cases en colonne
    assert.ok(poseTient(forme, 0, 0, 4, 5, new Set()), 'une pose valide est refusée');
    assert.ok(!poseTient(forme, 0, 1, 4, 5, new Set()), 'une pose qui sort par le bas passe');
    assert.ok(!poseTient(forme, -1, 0, 4, 5, new Set()), 'une pose qui sort à gauche passe');
    assert.ok(!poseTient(forme, 4, 0, 4, 5, new Set()), 'une pose qui sort à droite passe');
    const prises = couvertes([{ cells: forme, x: 0, y: 0 }]);
    assert.ok(!poseTient(forme, 0, 0, 4, 5, prises), 'un chevauchement passe');
    assert.ok(poseTient(forme, 1, 0, 4, 5, prises), 'une pose à côté est refusée');
});

test('LE SOLVEUR REFUSE CE QUI NE SE PAVE PAS', () => {
    // Quatre I ne pavent pas un 4 × 5 : ils feraient quatre colonnes de cinq,
    // soit un 4 × 5… mais ils ne sont servis qu'une fois chacun. Le solveur
    // doit donc rendre `null` quand on lui demande l'impossible — ici, paver
    // un 4 × 5 avec les SEULES pièces X et I, qui ne s'emboîtent pas.
    assert.equal(resoudre(4, 5, ['X', 'I'], 4), null,
        'le solveur annonce un pavage qui n\'existe pas');
    assert.ok(resoudre(4, 5, Object.keys(FORMES), 4),
        'le solveur ne trouve pas de pavage du 4 × 5');
});

test('LES PENTAMINOS SONT AU CATALOGUE, AVEC LEUR ÉCRAN ET LEUR PAPIER', () => {
    const exo = exercices.find(e => e.id === ID);
    assert.ok(exo, 'les pentaminos ont disparu du catalogue');
    assert.equal(exo.activityId, 'pentaminos');
    assert.ok(exo.printable, 'les pentaminos ne s\'impriment pas');
    assert.equal(exo.params.niveau, '1',
        'le jeu n\'ouvre pas sur le rectangle le plus facile');
    assert.ok(exo.instruction && exo.instruction.length > 120,
        'pas d\'explication de la règle dans la fiche');
});

test('ET LA RÉPONSE ATTENDUE EST CELLE QUE L\'ÉCRAN ENVERRA', () => {
    const exo = exercices.find(e => e.id === ID);
    const gen = getGenerator(exo.generatorId);
    for (const niveau of ['1', '2', '3']) {
        for (let i = 0; i < 4; i++) {
            const it = gen.generate({ niveau }, { rng: makeRng(`r${niveau}${i}`), index: i });
            // L'ÉCRAN N'ENVOIE QUE « PLEIN », ET C'EST VOULU : il existe souvent
            // plusieurs pavages, et compter faux une solution juste parce
            // qu'elle n'est pas CELLE du générateur serait le pire défaut
            // possible dans un jeu de placement.
            assert.equal(it.answer, 'plein');
            assert.ok(it.meta.solution.length === it.meta.combien);
            assert.ok(it.hints.length >= 3, 'moins de trois indices');
        }
    }
});

test('ET LES PENTAMINOS SE FABRIQUENT SANS SE FAIRE ATTENDRE', () => {
    const t = performance.now();
    for (const niveau of [1, 2, 3]) {
        for (let i = 0; i < 20; i++) tirerPuzzle(makeRng(`t${niveau}${i}`), niveau);
    }
    const dt = Math.round(performance.now() - t);
    // UNE MARGE FRANCHE, ET C'EST UNE LEÇON DU 28 OCTOBRE : une épreuve de
    // durée à 1 % de marge clignote sous charge et coûte quatre minutes de
    // relance pour dire « la machine était occupée ». Soixante tirages tiennent
    // en 120 ms ; on autorise vingt-cinq fois plus.
    assert.ok(dt < 3000, `${dt} ms pour soixante tirages`);
});
