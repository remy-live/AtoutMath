import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import {
    pairesPossibles, compterDecoupages, propager, creerTasuko, saisieVide,
    paireDe, casesCouvertes, sommesEmployees, chevauchements, sommesEnDouble,
    estResoluTasuko, diagnostic, prochaineAddition, qualiteTasuko,
    nombreDePaires, chiffreMaxPour, TAILLES_TASUKO
} from '../js/core/tasuko.js';
import { tasukoFicheGenerator as GT } from '../js/core/generators/tasukoFiche.js';
import { exercices } from '../js/data/catalog.js';

// --- LA RÈGLE, RELUE SUR LA CAPTURE DU VRAI JEU ---------------------------------
//
// C'est le test le plus important du fichier : il fige la règle que j'avais
// comprise de travers. La grille ci-dessous est celle que Rémy a envoyée, lue
// case par case, et ses huit capsules colorées sont ses huit paires.

const CAPTURE = [[0, 0, 0, 3],
    [1, 2, 3, 3],
    [3, 4, 1, 2],
    [3, 3, 4, 4]];
const CAPSULES = [
    [[0, 0], [0, 1]], [[1, 0], [1, 1]], [[2, 0], [3, 0]], [[2, 1], [2, 2]],
    [[3, 1], [3, 2]], [[0, 2], [1, 2]], [[0, 3], [1, 3]], [[2, 3], [3, 3]]
];

test('la capture du vrai jeu : huit paires, et les sommes 1 à 8', () => {
    const sommes = CAPSULES.map(c => c.reduce((s, [x, y]) => s + CAPTURE[y][x], 0));
    assert.deepEqual([...sommes].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8],
        'les sommes des capsules doivent être exactement 1 à 8');
    // ET LA PREUVE QUI NE PEUT PAS ÊTRE UNE COÏNCIDENCE : le total des chiffres
    // de la grille vaut la somme des sommes, c'est-à-dire 1+2+⋯+8.
    const total = CAPTURE.flat().reduce((a, b) => a + b, 0);
    assert.equal(total, 36);
    assert.equal(total, (8 * 9) / 2);
    // Chaque capsule est bien un domino : deux cases voisines, jamais en diagonale.
    CAPSULES.forEach(([[xa, ya], [xb, yb]]) => {
        assert.equal(Math.abs(xa - xb) + Math.abs(ya - yb), 1);
    });
    // Aucun chiffre ne dépasse ⌈8/2⌉ = 4 : le plafond bas est voulu.
    assert.equal(Math.max(...CAPTURE.flat()), 4);
    assert.equal(chiffreMaxPour(8), 4);
});

test('le solveur retrouve exactement le coloriage de la capture', () => {
    // La preuve que la règle est bien celle-là : on donne au solveur la grille
    // nue, sans les couleurs, et il ressort les huit capsules de la capture.
    const paires = pairesPossibles(CAPTURE, 8);
    const { decoupage } = compterDecoupages(16, 8, paires, 1);
    assert.ok(decoupage, 'aucun découpage trouvé');
    assert.deepEqual(decoupage.map(p => p.somme).sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8]);
    const cle = (cases) => cases.map(c => c.join(',')).sort().join('|');
    assert.deepEqual(decoupage.map(p => cle(p.cases)).sort(), CAPSULES.map(cle).sort());
});

test('MAIS LA GRILLE DU VRAI JEU EN A DEUX, et c\'est là qu\'on est plus exigeant', () => {
    // Le coin bas-gauche de la capture vaut
    //
    //     3 4
    //     3 3
    //
    // et il se découpe de DEUX façons qui donnent les mêmes sommes 6 et 7 : en
    // lignes (3+4 et 3+3) ou en colonnes (3+3 et 4+3). C'est exactement le
    // « motif mortel » des sudokus — un carré de deux sur deux qui bascule sans
    // que rien ne le départage. Le vrai jeu s'en accommode ; nous non : la règle
    // de la maison veut UNE solution et aucun coup de dé, du sudoku au hashi.
    // Ce test n'est donc pas un reproche à l'application de Rémy, c'est la
    // frontière entre ce qu'elle accepte et ce que notre générateur refuse.
    assert.equal(compterDecoupages(16, 8, pairesPossibles(CAPTURE, 8), 5).nombre, 2);
    assert.equal(propager(16, 8, pairesPossibles(CAPTURE, 8)).fini, false,
        'la propagation seule ne peut pas trancher ce carré-là');
    // Une grille de chez nous, de même taille, n'a pas cette faiblesse.
    const g = creerTasuko({ taille: 'moyenne', rng: makeRng('exigence') });
    assert.equal(compterDecoupages(g.l * g.h, g.n, g.paires, 5).nombre, 1);
    assert.ok(propager(g.l * g.h, g.n, g.paires).fini);
});

// --- Les paires candidates -----------------------------------------------------

test('une paire, c\'est deux voisines dont la somme est à trouver', () => {
    const grille = [[1, 2, 9],
        [3, 0, 4]];
    // n = 3 : on ne cherche que les sommes 1, 2 et 3.
    const lues = pairesPossibles(grille, 3)
        .map(p => `${p.cases.map(c => c.join(',')).join(' ')} = ${p.somme}`).sort();
    assert.deepEqual(lues, [
        '0,0 1,0 = 3',   // 1 + 2, en ligne
        '0,1 1,1 = 3',   // 3 + 0, en ligne
        '1,0 1,1 = 2'    // 2 + 0, en colonne
    ], 'seules les sommes de 1 à 3 sont candidates');
    // Le 9 et le 4 ne servent à rien : toutes leurs paires dépassent 3.
    assert.ok(!lues.some(v => v.startsWith('2,')));
    // Pas de diagonale : le 1 (0,0) et le 0 (1,1) ne forment pas de paire.
    assert.ok(!lues.includes('0,0 1,1 = 1'));
    // Et une somme nulle n'est candidate à rien.
    assert.equal(pairesPossibles([[0, 0]], 4).length, 0, '0 + 0 = 0 n\'est pas une somme');
});

// --- La couverture exacte à deux étages ----------------------------------------

test('la somme compte autant que la case : deux découpages sinon confondus', () => {
    // 1 · 1 · 2 · 2 en ligne. Les paires voisines : 1+1=2, 1+2=3, 2+2=4.
    // Avec n = 2 il faut les sommes 1 et 2 : impossible, aucun 1 ne se fait.
    assert.equal(compterDecoupages(4, 2, pairesPossibles([[1, 1, 2, 2]], 2), 3).nombre, 0);
    // Avec n = 2 sur 0 · 1 · 1 · 1 : 0+1=1 et 1+1=2, il y a de quoi.
    const g = [[0, 1, 1, 1]];
    const { nombre, decoupage } = compterDecoupages(4, 2, pairesPossibles(g, 2), 3);
    assert.equal(nombre, 1);
    assert.deepEqual(decoupage.map(p => p.somme).sort(), [1, 2]);
});

test('propager applique les deux règles, et seulement elles', () => {
    // 0 · 1 · 1 · 1, sommes 1 et 2. La somme 1 ne peut se faire qu'au bout
    // gauche (0+1) : elle est forcée, et le reste suit.
    const paires = pairesPossibles([[0, 1, 1, 1]], 2);
    const { fini, posees } = propager(4, 2, paires);
    assert.ok(fini);
    assert.deepEqual(posees.map(p => p.somme).sort(), [1, 2]);
});

// --- Les grilles fabriquées ----------------------------------------------------

test('toute grille fabriquée respecte la règle, dans toutes les tailles', () => {
    for (const t of Object.values(TAILLES_TASUKO)) {
        assert.equal((t.l * t.h) % 2, 0, `${t.id} : l'aire doit être paire`);
        const g = creerTasuko({ taille: t.id, rng: makeRng(`tk-${t.id}`) });
        assert.ok(g, `${t.id} : aucune grille fabriquée`);
        assert.equal(g.n, nombreDePaires(t.l, t.h));
        assert.equal(g.solution.length, g.n);

        // LE TOTAL DES CHIFFRES VAUT 1+2+⋯+n. C'est l'invariant du jeu, et il
        // se vérifie sans rien résoudre.
        const total = g.grille.flat().reduce((a, b) => a + b, 0);
        assert.equal(total, (g.n * (g.n + 1)) / 2, `${t.id} : le total des chiffres`);

        // Aucun chiffre au-dessus du plafond voulu.
        assert.equal(g.chiffreMax, chiffreMaxPour(g.n));
        assert.ok(Math.max(...g.grille.flat()) <= g.chiffreMax, `${t.id} : un chiffre déborde`);

        // La solution : des dominos, des sommes 1 à n, et toutes les cases.
        const sol = g.solution.map(id => paireDe(g, id));
        assert.deepEqual(sol.map(p => p.somme).sort((a, b) => a - b),
            Array.from({ length: g.n }, (_, i) => i + 1), `${t.id} : les sommes`);
        sol.forEach(p => {
            const [[xa, ya], [xb, yb]] = p.cases;
            assert.equal(Math.abs(xa - xb) + Math.abs(ya - yb), 1, `${t.id} : pas un domino`);
            assert.equal(g.grille[ya][xa] + g.grille[yb][xb], p.somme);
        });
        assert.ok(casesCouvertes(g, g.solution).every(Boolean), `${t.id} : des cases oubliées`);
        assert.ok(estResoluTasuko(g, g.solution), `${t.id} : la solution n'est pas reconnue`);
    }
});

test('une seule solution, et trouvable sans deviner', () => {
    for (const t of Object.values(TAILLES_TASUKO)) {
        const g = creerTasuko({ taille: t.id, rng: makeRng(`u-${t.id}`) });
        assert.equal(compterDecoupages(g.l * g.h, g.n, g.paires, 2).nombre, 1, `${t.id}`);
        assert.ok(propager(g.l * g.h, g.n, g.paires).fini, `${t.id} : il faudrait deviner`);
    }
});

test('IL Y A DES PIÈGES, sinon ce n\'est pas un casse-tête', () => {
    // Si la grille ne se lisait qu'avec les bonnes paires, il suffirait de les
    // entourer : la règle « chaque somme une seule fois » ne se rencontrerait
    // jamais, et c'est pourtant elle qui fait le jeu.
    for (const t of Object.values(TAILLES_TASUKO)) {
        const g = creerTasuko({ taille: t.id, rng: makeRng(`p-${t.id}`) });
        const pieges = g.paires.length - g.n;
        assert.ok(pieges >= Math.max(2, Math.round(g.n / 2)),
            `${t.id} : seulement ${pieges} pièges pour ${g.n} sommes`);
    }
});

test('la même graine redonne exactement la même grille', () => {
    const a = creerTasuko({ taille: 'moyenne', rng: makeRng('pareil') });
    const b = creerTasuko({ taille: 'moyenne', rng: makeRng('pareil') });
    assert.deepEqual(a.grille, b.grille);
    assert.deepEqual(a.solution, b.solution);
});

// --- L'état d'une partie -------------------------------------------------------

test('les deux fautes ne sont pas la même, et le diagnostic les distingue', () => {
    const g = creerTasuko({ taille: 'moyenne', rng: makeRng('fautes') });
    assert.deepEqual(saisieVide(), []);
    assert.deepEqual(diagnostic(g, []), { ok: false, quoi: 'manque', n: g.l * g.h });

    // Deux paires qui se partagent une case.
    const p0 = paireDe(g, g.solution[0]);
    const voisine = g.paires.find(p => p.id !== p0.id
        && p.cellules.some(c => p0.cellules.includes(c)));
    assert.ok(voisine, 'il faut deux paires qui se chevauchent pour ce test');
    const avecChevauchement = [p0.id, voisine.id];
    assert.equal(chevauchements(g, avecChevauchement).length, 2);
    assert.equal(diagnostic(g, avecChevauchement).quoi, 'chevauchement');

    // Deux paires DISJOINTES mais de même somme : l'autre faute, la plus fine —
    // rien ne se chevauche, et pourtant c'est perdu.
    const memeSomme = g.paires.find(p => p.id !== p0.id && p.somme === p0.somme
        && !p.cellules.some(c => p0.cellules.includes(c)));
    if (memeSomme) {
        const deux = [p0.id, memeSomme.id];
        assert.equal(chevauchements(g, deux).length, 0, 'rien ne se chevauche');
        assert.equal(sommesEnDouble(g, deux).length, 2);
        assert.equal(diagnostic(g, deux).quoi, 'sommeDouble');
        assert.equal(estResoluTasuko(g, deux), false);
    }
});

test('sommesEmployees dit quelles sommes sont faites, et par qui', () => {
    const g = creerTasuko({ taille: 'petite', rng: makeRng('emp') });
    const deux = g.solution.slice(0, 2);
    const par = sommesEmployees(g, deux);
    assert.equal(par.size, 2);
    deux.forEach(id => {
        const p = paireDe(g, id);
        assert.deepEqual(par.get(p.somme), [id]);
    });
});

test('l\'indice finit la grille tout seul, et sans jamais deviner', () => {
    for (const t of Object.values(TAILLES_TASUKO)) {
        const g = creerTasuko({ taille: t.id, rng: makeRng(`i-${t.id}`) });
        const choisies = [];
        let garde = 0;
        while (!estResoluTasuko(g, choisies) && garde++ < 100) {
            const p = prochaineAddition(g, choisies);
            assert.ok(p, `${t.id} : l'indice s'est arrêté en route`);
            // Il doit TOUJOURS conclure par un raisonnement, jamais par défaut.
            assert.ok(p.parLaSomme !== null || p.parLaCase !== null,
                `${t.id} : l'indice a dû deviner`);
            choisies.push(p.paire.id);
        }
        assert.ok(estResoluTasuko(g, choisies), `${t.id} : pas fini`);
        assert.equal(choisies.length, g.n);
    }
});

test('l\'indice préfère la somme à la case — c\'est la lecture qu\'on n\'a pas', () => {
    const g = creerTasuko({ taille: 'moyenne', rng: makeRng('lecture') });
    let parLaSomme = 0;
    const choisies = [];
    while (!estResoluTasuko(g, choisies)) {
        const p = prochaineAddition(g, choisies);
        if (p.parLaSomme !== null) parLaSomme++;
        choisies.push(p.paire.id);
    }
    assert.ok(parLaSomme > 0, 'aucun indice ne passe par la somme');
});

test('le corrigé se lit dans l\'ordre des sommes', () => {
    const g = creerTasuko({ taille: 'petite', rng: makeRng('corrige') });
    const q = qualiteTasuko(g);
    assert.equal(q.additions, g.n);
    assert.equal(q.cases, g.l * g.h);
    assert.equal(q.lignes.length, g.n);
    q.lignes.forEach((ligne, i) => {
        assert.ok(ligne.endsWith(`= ${i + 1}`), `la ligne ${i} devrait donner ${i + 1} : ${ligne}`);
        const [a, b] = ligne.split(' = ')[0].split(' + ').map(Number);
        assert.equal(a + b, i + 1);
    });
});

// --- La fiche et le catalogue --------------------------------------------------

test('le générateur de fiche porte la grille, les sommes et le corrigé', () => {
    const it = GT.generate({ taille: 'moyenne' }, { rng: makeRng('fiche') });
    assert.equal(it.meta.l, 4);
    assert.equal(it.meta.h, 4);
    assert.equal(it.meta.n, 8);
    assert.equal(it.meta.solution.length, 8);
    assert.deepEqual(it.meta.solution.map(p => p.somme).sort((a, b) => a - b),
        [1, 2, 3, 4, 5, 6, 7, 8]);
    it.meta.solution.forEach(p => assert.equal(p.a + p.b, p.somme));
    assert.ok(it.explanation.includes('1 à 8'));
    // Un réglage farfelu retombe sur la grille par défaut plutôt que de casser.
    assert.equal(GT.generate({ taille: 'douze' }, { rng: makeRng('x') }).meta.n, 8);
});

test('la consigne du catalogue décrit la vraie règle', () => {
    const e = exercices.find(x => x.id === 'log-tasuko');
    assert.ok(e, 'log-tasuko manque au catalogue');
    // Elle doit parler de PAIRES et de SOMMES 1, 2, 3… — pas de trois cases.
    assert.ok(/voisines/i.test(e.instruction));
    assert.ok(/1, 2, 3/.test(e.instruction), 'la suite des sommes doit être annoncée');
    assert.ok(!/trois cases/i.test(e.instruction), 'reste de l\'ancienne règle');
    assert.ok(e.instruction.length > 200);
});
