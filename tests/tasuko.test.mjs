import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import {
    additionsPossibles, compterDecoupages, propager, creerTasuko, saisieVide,
    additionDe, casesCouvertes, chevauchements, estResoluTasuko, diagnostic,
    prochaineAddition, qualiteTasuko, TAILLES_TASUKO, CHIFFRE_MAX
} from '../js/core/tasuko.js';
import { tasukoFicheGenerator as G } from '../js/core/generators/tasukoFiche.js';

const TAILLES = Object.keys(TAILLES_TASUKO);

test('une addition se lit dans les deux sens, mais son résultat est TOUJOURS à un bout', () => {
    // C'est la règle exacte, et la moitié qu'on oublie : 4 · 7 · 3 contient
    // bien 4 + 3 = 7, mais le résultat est au milieu — ce n'est pas une
    // addition écrite.
    assert.equal(additionsPossibles([[3, 4, 7]]).length, 1);
    assert.equal(additionsPossibles([[7, 4, 3]]).length, 1, 'lue à l\'envers, elle compte');
    assert.equal(additionsPossibles([[4, 7, 3]]).length, 0, 'le résultat au milieu ne compte pas');
    assert.equal(additionsPossibles([[1, 1, 1]]).length, 0);
    // Rangée dans l'ordre où elle se lit : a + b = somme.
    const [a] = additionsPossibles([[7, 4, 3]]);
    assert.deepEqual([a.a, a.b, a.somme], [3, 4, 7]);
    assert.deepEqual(a.cases, [[2, 0], [1, 0], [0, 0]]);
});

test('les additions se cherchent en ligne ET en colonne', () => {
    const g = [[1, 9, 9], [2, 9, 9], [3, 9, 9]];
    const trouvees = additionsPossibles(g);
    // 1 · 2 · 3 dans la première colonne, et rien d'autre.
    assert.equal(trouvees.length, 1);
    assert.deepEqual(trouvees[0].cases, [[0, 0], [0, 1], [0, 2]]);
});

test('un trio ne peut pas se lire dans les deux sens à la fois', () => {
    // p + q = r et r + q = p donneraient q = 0, et il n'y a pas de zéro dans
    // une grille. C'est ce qui permet de ranger chaque trio dans UN ordre.
    for (let p = 1; p <= CHIFFRE_MAX; p++) {
        for (let q = 1; q <= CHIFFRE_MAX; q++) {
            for (let r = 1; r <= CHIFFRE_MAX; r++) {
                assert.ok(!(p + q === r && r + q === p), `${p} ${q} ${r}`);
            }
        }
    }
});

test('le découpage compte les couvertures exactes, pas les additions', () => {
    // Une grille 1 × 3 : une addition, un découpage.
    let a = additionsPossibles([[3, 4, 7]]);
    assert.equal(compterDecoupages(3, a, 2).nombre, 1);
    // Une grille où aucune addition ne couvre tout : zéro découpage.
    a = additionsPossibles([[3, 4, 7, 1]]);
    assert.equal(compterDecoupages(4, a, 2).nombre, 0, 'quatre cases ne se pavent pas par trois');
});

test('toute grille tirée a UN seul découpage, et il se trouve sans deviner', () => {
    // Sans unicité, deux élèves rendent deux feuilles justes et différentes.
    // Sans la propagation, il faudrait essayer au hasard — et un élève qui
    // devine n'apprend pas ce qu'on voulait lui apprendre.
    for (const taille of TAILLES) {
        for (let i = 0; i < 6; i++) {
            const g = creerTasuko({ taille, rng: makeRng(`u-${taille}-${i}`) });
            assert.ok(g, `${taille} #${i} : aucune grille`);
            const { nombre } = compterDecoupages(g.l * g.h, g.additions, 2);
            assert.equal(nombre, 1, `${taille} #${i} : ${nombre} découpages`);
            const { fini } = propager(g.l * g.h, g.additions);
            assert.ok(fini, `${taille} #${i} : la propagation reste bloquée`);
        }
    }
});

test('la solution annoncée couvre exactement la grille', () => {
    for (const taille of TAILLES) {
        for (let i = 0; i < 5; i++) {
            const g = creerTasuko({ taille, rng: makeRng(`s-${taille}-${i}`) });
            assert.equal(g.solution.length, (g.l * g.h) / 3);
            assert.ok(estResoluTasuko(g, g.solution), `${taille} #${i}`);
            assert.deepEqual(chevauchements(g, g.solution), []);
            // Et chaque addition de la solution est arithmétiquement vraie.
            g.solution.forEach(id => {
                const a = additionDe(g, id);
                assert.equal(a.a + a.b, a.somme, `${a.a} + ${a.b} ≠ ${a.somme}`);
                const lus = a.cases.map(([x, y]) => g.grille[y][x]);
                assert.deepEqual(lus, [a.a, a.b, a.somme], 'la case ne porte pas le bon chiffre');
            });
        }
    }
});

test('la grille ne contient que des chiffres de 1 à 9', () => {
    // Un zéro rendrait « p + q = r » lisible dans les deux sens, et un nombre
    // à deux chiffres ne tiendrait pas dans une case.
    for (const taille of TAILLES) {
        const g = creerTasuko({ taille, rng: makeRng('c' + taille) });
        g.grille.flat().forEach(v => assert.ok(v >= 1 && v <= CHIFFRE_MAX, `chiffre ${v}`));
        assert.equal(g.grille.length, g.h);
        g.grille.forEach(l => assert.equal(l.length, g.l));
    }
});

test('il y a TOUJOURS des pièges — sinon ce n\'est pas un casse-tête', () => {
    // Quand toutes les additions lisibles sont dans la solution, il suffit
    // d'entourer ce qu'on voit : la seconde règle ne se rencontre jamais, et
    // c'est pourtant elle qui fait le jeu.
    for (const taille of TAILLES) {
        for (let i = 0; i < 6; i++) {
            const g = creerTasuko({ taille, rng: makeRng(`p-${taille}-${i}`) });
            const q = qualiteTasuko(g);
            assert.ok(q.pieges >= 1, `${taille} #${i} : aucun piège`);
            assert.ok(q.pieges >= Math.round(q.additions / 3),
                `${taille} #${i} : ${q.pieges} pièges pour ${q.additions} additions`);
        }
    }
});

test('la grille vide n\'est jamais résolue, et le diagnostic dit ce qui manque', () => {
    const g = creerTasuko({ taille: 'moyenne', rng: makeRng('diag') });
    assert.equal(estResoluTasuko(g, saisieVide()), false);
    assert.deepEqual(diagnostic(g, saisieVide()), { ok: false, quoi: 'manque', n: g.l * g.h });
    assert.deepEqual(diagnostic(g, g.solution), { ok: true });
});

test('deux additions qui se partagent un chiffre sont signalées ensemble', () => {
    // C'est LA faute du jeu, et elle n'est pas une faute de calcul : les deux
    // additions sont justes, elles ne peuvent simplement pas coexister.
    const g = creerTasuko({ taille: 'grande', rng: makeRng('chev') });
    const piege = g.additions.find(a => !g.solution.includes(a.id));
    assert.ok(piege, 'aucun piège dans cette grille');
    const voisine = g.solution
        .map(id => additionDe(g, id))
        .find(a => a.cellules.some(c => piege.cellules.includes(c)));
    assert.ok(voisine, 'le piège ne recouvre aucune addition de la solution');
    const doubles = chevauchements(g, [voisine.id, piege.id]);
    assert.equal(doubles.length, 2, 'les DEUX doivent être montrées, pas seulement la dernière');
    assert.deepEqual(diagnostic(g, [voisine.id, piege.id]),
        { ok: false, quoi: 'chevauchement', n: 2 });
});

test('les cases couvertes le sont exactement une fois par la solution', () => {
    const g = creerTasuko({ taille: 'moyenne', rng: makeRng('cov') });
    assert.ok(casesCouvertes(g, g.solution).every(Boolean));
    assert.equal(casesCouvertes(g, []).filter(Boolean).length, 0);
});

test('l\'indice montre une case COINCÉE, pas une addition au hasard', () => {
    // C'est la seule règle dont le joueur ait besoin ; la lui montrer une fois
    // vaut mieux que de lui offrir dix réponses.
    const g = creerTasuko({ taille: 'grande', rng: makeRng('aide') });
    const choisies = [];
    for (let n = 0; n < 40; n++) {
        const p = prochaineAddition(g, choisies);
        if (!p) break;
        assert.notEqual(p.parLaCase, null, 'une grille jouable ne bloque jamais la propagation');
        // La case annoncée doit vraiment n'avoir qu'un seul candidat.
        const pris = casesCouvertes(g, choisies);
        const pour = g.additions.filter(a =>
            a.cellules.includes(p.parLaCase) && a.cellules.every(c => !pris[c]));
        assert.equal(pour.length, 1, 'la case montrée n\'est pas coincée');
        assert.equal(pour[0].id, p.addition.id);
        assert.ok(g.solution.includes(p.addition.id), 'l\'indice donne un piège');
        choisies.push(p.addition.id);
    }
    assert.ok(estResoluTasuko(g, choisies), 'les indices seuls ne finissent pas la grille');
});

test('le générateur de fiche rend de quoi imprimer ET corriger', () => {
    const it = G.generate({ taille: 'moyenne' }, { rng: makeRng('fiche'), index: 0 });
    const m = it.meta;
    assert.equal(m.grille.length, 4);
    assert.equal(m.grille[0].length, 6);
    assert.equal(m.solution.length, 8);
    // Le corrigé dessine les capsules : il lui faut les cases, pas seulement
    // les nombres.
    m.solution.forEach(a => {
        assert.equal(a.cases.length, 3);
        assert.equal(a.a + a.b, a.somme);
        const lus = a.cases.map(([x, y]) => m.grille[y][x]);
        assert.deepEqual(lus, [a.a, a.b, a.somme]);
    });
    assert.ok(it.explanation.includes('pièges'));
});

test('un réglage farfelu retombe sur la grille par défaut', () => {
    const it = G.generate({ taille: 'énorme' }, { rng: makeRng('bof'), index: 0 });
    assert.equal(it.meta.taille, 'moyenne');
    assert.equal(it.meta.l, 6);
});

test('deux graines donnent deux grilles différentes', () => {
    const vues = new Set(Array.from({ length: 12 }, (_, i) =>
        JSON.stringify(creerTasuko({ taille: 'moyenne', rng: makeRng('v' + i) }).grille)));
    assert.ok(vues.size >= 10, `${vues.size} grilles différentes sur douze`);
});
