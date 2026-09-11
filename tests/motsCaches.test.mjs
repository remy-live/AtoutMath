import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    LEXIQUE, THEMES, DIRECTIONS, motsDisponibles, tirerMots, creerGrille,
    segment, lire, motTrouve, toutTrouve
} from '../js/core/motsCaches.js';
import { makeRng } from '../js/core/ids.js';

const sansAccents = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const grille = (o = {}) => creerGrille({
    taille: 12, nbMots: 10, rng: makeRng('test'),
    mots: motsDisponibles({ theme: 'geometrie' }), ...o
});

test('le lexique est propre : majuscules sans accent, et une définition partout', () => {
    for (const e of LEXIQUE) {
        assert.match(e.mot, /^[A-Z]+$/, `« ${e.mot} » n'est pas en majuscules sans accent ni espace`);
        assert.ok(e.def && e.def.length > 12, `« ${e.mot} » n'a pas de vraie définition`);
        assert.ok(THEMES[e.theme], `thème inconnu pour « ${e.mot} » : ${e.theme}`);
        assert.ok(e.niveau >= 1 && e.niveau <= 3, `niveau hors bornes pour « ${e.mot} »`);
        // Une définition qui contient le mot à trouver le donne : c'est raté.
        // (En mot entier : « surface » a le droit de contenir « face ».)
        assert.ok(!new RegExp(`\\b${e.mot}`, 'i').test(sansAccents(e.def)),
            `la définition de « ${e.mot} » contient le mot`);
    }
});

test('aucun doublon dans le lexique', () => {
    const vus = new Set();
    for (const e of LEXIQUE) {
        assert.ok(!vus.has(e.mot), `« ${e.mot} » est présent deux fois`);
        vus.add(e.mot);
    }
});

test('le tri par thème et par niveau fait son travail', () => {
    const geo = motsDisponibles({ theme: 'geometrie' });
    assert.ok(geo.length > 8);
    assert.ok(geo.every(m => m.theme === 'geometrie'));

    const debutants = motsDisponibles({ theme: 'tout', niveauMax: 1 });
    assert.ok(debutants.every(m => m.niveau === 1));
    assert.ok(debutants.length < LEXIQUE.length, 'le niveau 1 ne peut pas tout contenir');
});

test('chaque mot annoncé est réellement lisible dans la grille, à sa place', () => {
    const g = grille();
    assert.ok(g.mots.length >= 8, 'trop peu de mots placés');
    for (const m of g.mots) {
        let lu = '';
        for (let i = 0; i < m.longueur; i++) lu += g.grille[m.y + m.dy * i][m.x + m.dx * i];
        assert.equal(lu, m.mot, `« ${m.mot} » n'est pas où la grille le dit`);
    }
});

test('la grille est pleine, carrée, et n\'utilise que des majuscules', () => {
    const g = grille({ taille: 14 });
    assert.equal(g.grille.length, 14);
    for (const ligne of g.grille) {
        assert.equal(ligne.length, 14);
        ligne.forEach(c => assert.match(c, /^[A-Z]$/));
    }
});

test('aucun mot ne sort de la grille', () => {
    const g = grille({ taille: 10, nbMots: 12 });
    for (const m of g.mots) {
        const fx = m.x + m.dx * (m.longueur - 1), fy = m.y + m.dy * (m.longueur - 1);
        for (const v of [m.x, m.y, fx, fy]) {
            assert.ok(v >= 0 && v < 10, `« ${m.mot} » dépasse le bord`);
        }
    }
});

test('un mot plus long que la grille n\'est pas proposé du tout', () => {
    const g = creerGrille({
        taille: 6, nbMots: 20, rng: makeRng('court'),
        mots: motsDisponibles({ theme: 'tout' })
    });
    g.mots.forEach(m => assert.ok(m.longueur <= 6, `« ${m.mot} » (${m.longueur}) ne tient pas en 6 cases`));
    assert.ok(g.mots.length >= 3, 'une petite grille doit quand même se remplir');
});

test('sans diagonales, tous les mots sont en ligne ou en colonne', () => {
    const g = grille({ diagonales: false, taille: 13 });
    g.mots.forEach(m => assert.ok(m.dx === 0 || m.dy === 0, `« ${m.mot} » est en diagonale`));
});

test('sans le mode « à l\'envers », aucun mot ne se lit de droite à gauche', () => {
    const g = grille({ envers: false, taille: 13 });
    g.mots.forEach(m => assert.ok(m.dx >= 0, `« ${m.mot} » se lit à l'envers`));
});

test('la même graine redonne exactement la même grille', () => {
    const a = creerGrille({ taille: 12, nbMots: 8, rng: makeRng('graine-1'), mots: motsDisponibles({ theme: 'calcul' }) });
    const b = creerGrille({ taille: 12, nbMots: 8, rng: makeRng('graine-1'), mots: motsDisponibles({ theme: 'calcul' }) });
    assert.deepEqual(a.grille, b.grille);
    assert.deepEqual(a.mots.map(m => m.mot), b.mots.map(m => m.mot));
});

test('un glissement droit donne ses cases, un glissement de travers n\'en donne aucune', () => {
    assert.deepEqual(segment(0, 0, 2, 0), [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }]);
    assert.deepEqual(segment(2, 2, 0, 0), [{ x: 2, y: 2 }, { x: 1, y: 1 }, { x: 0, y: 0 }]);
    assert.equal(segment(0, 0, 3, 1), null, 'ni ligne, ni colonne, ni diagonale');
    assert.deepEqual(segment(4, 4, 4, 4), [{ x: 4, y: 4 }], 'une case seule reste une case');
});

test('on reconnaît un mot glissé dans le bon sens comme à l\'envers', () => {
    const g = grille();
    const m = g.mots[0];
    const cases = [];
    for (let i = 0; i < m.longueur; i++) cases.push({ x: m.x + m.dx * i, y: m.y + m.dy * i });

    assert.equal(lire(g, cases), m.mot);
    assert.equal(motTrouve(g, cases)?.mot, m.mot);
    // L'élève qui repère le mot puis glisse dans l'autre sens a trouvé aussi.
    assert.equal(motTrouve(g, cases.slice().reverse())?.mot, m.mot);
});

test('un glissement au hasard ne valide pas un mot, et une case seule non plus', () => {
    const g = grille();
    assert.equal(motTrouve(g, [{ x: 0, y: 0 }]), null, 'une seule case ne fait pas un mot');
    assert.equal(motTrouve(g, null), null);
});

test('la définition voyage avec le mot : c\'est tout l\'intérêt du jeu', () => {
    const g = grille();
    for (const m of g.mots) {
        assert.ok(m.def && m.def.length > 12, `« ${m.mot} » a perdu sa définition en chemin`);
    }
});

test('la partie est gagnée quand tous les mots sont trouvés, pas avant', () => {
    const g = grille();
    const noms = g.mots.map(m => m.mot);
    assert.equal(toutTrouve(g, noms.slice(0, -1)), false);
    assert.equal(toutTrouve(g, noms), true);
});

test('les croisements existent vraiment — sinon ce ne sont pas des mots cachés', () => {
    // Deux mots qui partagent une case : c'est ce qui rend la grille dense.
    const g = grille({ taille: 12, nbMots: 12 });
    const occupees = new Map();
    let croisements = 0;
    for (const m of g.mots) {
        for (let i = 0; i < m.longueur; i++) {
            const k = `${m.x + m.dx * i},${m.y + m.dy * i}`;
            if (occupees.has(k)) croisements++;
            occupees.set(k, m.mot);
        }
    }
    assert.ok(croisements > 0, 'aucun mot n\'en croise un autre');
});

test('toutes les directions déclarées sont des directions valides', () => {
    for (const d of DIRECTIONS) {
        assert.ok(Math.abs(d.dx) <= 1 && Math.abs(d.dy) <= 1);
        assert.ok(d.dx !== 0 || d.dy !== 0, 'une direction immobile');
        assert.ok(d.nom, 'une direction sans nom lisible');
    }
});

// --- La variété du placement, et la fiche papier -----------------------------

test('une grille ne pose pas tous ses mots dans le même sens', () => {
    // Le croisement est rare — il faut la même lettre au point de rencontre —
    // donc presque tous les candidats valaient zéro, et le hasard suivait le
    // sens qui offre le plus de positions : une grille sur quatre sortait tout
    // en lignes ou tout en colonnes. C'est une liste, plus un mot caché.
    let pauvres = 0;
    for (let i = 0; i < 40; i++) {
        const rng = makeRng('var' + i);
        const g = grille({ rng, mots: tirerMots({ theme: 'tout', nbMots: 10, rng }) });
        const sens = new Set(g.mots.map(m => `${m.dx},${m.dy}`));
        assert.ok(sens.size >= 2, `grille ${i} : tous les mots dans le sens ${[...sens][0]}`);
        if (sens.size === 2) pauvres++;
    }
    // Et la grande majorité en utilise trois ou quatre.
    assert.ok(pauvres < 10, `${pauvres} grilles sur 40 n'utilisent que deux sens`);
});

test('la fiche papier ne sert pas que les mots les plus longs', async () => {
    const { motsCachesFicheGenerator: G } = await import('../js/core/generators/motsCachesFiche.js');
    const vus = new Set();
    for (let i = 0; i < 25; i++) {
        const it = G.generate({ theme: 'tout', taille: 12, nbMots: 10 },
            { rng: makeRng('fiche' + i) });
        it.meta.mots.forEach(m => vus.add(m.mot));
        assert.ok(it.meta.mots.length >= 7, `grille trop pauvre : ${it.meta.mots.length} mots`);
    }
    // Le placeur pose les plus longs d'abord ; sans tirage préalable, il
    // servait les dix mêmes mots interminables à chaque feuille.
    const courts = [...vus].filter(m => m.length <= 6);
    assert.ok(courts.length >= 5, `aucun mot court n'est jamais tiré : ${[...vus].join(', ')}`);
    assert.ok(vus.size > 25, `seulement ${vus.size} mots différents sur 25 feuilles`);
});

test('la fiche annonce des mots réellement présents dans sa grille', async () => {
    const { motsCachesFicheGenerator: G } = await import('../js/core/generators/motsCachesFiche.js');
    for (let i = 0; i < 20; i++) {
        const it = G.generate({ theme: 'tout', taille: 12, nbMots: 8, envers: true },
            { rng: makeRng('lit' + i) });
        const { grille: gr, mots } = it.meta;
        for (const w of mots) {
            let lu = '';
            for (let k = 0; k < w.longueur; k++) lu += gr[w.y + w.dy * k][w.x + w.dx * k];
            assert.equal(lu, w.mot, `« ${w.mot} » ne se lit pas là où la solution le dit`);
        }
    }
});
