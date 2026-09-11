// LES MOTS CROISÉS.
//
// Rémy : « il faut que la grille soit optimisée ». Deux choses se vérifient
// ici, et la première est la plus importante : une grille de mots croisés est
// JUSTE ou elle ne sert à rien. Tout ce qui se lit dedans doit être un mot de
// la liste — sinon l'élève voit une suite de lettres, la cherche dans les
// définitions, et ne trouve rien.
//
// La seconde est la densité : sans croisements, ce n'est plus une grille, c'est
// une liste de définitions déguisée.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    creerGrille, grilleOptimisee, qualite, suitesParasites, definitions,
    estResolue, casesFausses, poseValide, numeroter, THEMES
} from '../js/core/motsCroises.js';
import { makeRng } from '../js/core/ids.js';

const THEMES_JOUABLES = Object.keys(THEMES);

/** Toutes les grilles d'un balayage : plusieurs thèmes, plusieurs graines. */
function balayage(n = 6, options = {}) {
    const out = [];
    THEMES_JOUABLES.forEach(theme => {
        for (let g = 0; g < n; g++) {
            out.push({
                theme, graine: g,
                grille: creerGrille({ theme, nbMots: 10, rng: makeRng(`${theme}-${g}`), ...options })
            });
        }
    });
    return out;
}

test('CHAQUE MOT DÉCLARÉ SE LIT VRAIMENT DANS LA GRILLE', () => {
    balayage().forEach(({ theme, graine, grille }) => {
        grille.mots.forEach(m => {
            const lu = [...m.mot].map((_, i) =>
                m.dir === 'h' ? grille.cases[m.y][m.x + i] : grille.cases[m.y + i][m.x]).join('');
            assert.equal(lu, m.mot, `${theme}/${graine} : « ${m.mot} » ne se lit pas à sa place`);
        });
    });
});

test('RIEN NE SE LIT QUI NE SOIT UN MOT DE LA LISTE', () => {
    // La propriété qui rend la grille jouable. Une seule suite parasite suffit
    // à faire chercher l'élève pour rien.
    balayage(8).forEach(({ theme, graine, grille }) => {
        const p = suitesParasites(grille);
        assert.deepEqual(p, [], `${theme}/${graine} : ${p.map(s => s.suite).join(', ')}`);
    });
});

test('une grille fabriquée à la main qui triche est démasquée', () => {
    // Le contrôle doit vraiment contrôler : on lui donne une grille où deux
    // mots se touchent côte à côte, ce qui fait apparaître « AB » et « CD ».
    const grille = {
        largeur: 2, hauteur: 2,
        cases: [['A', 'B'], ['C', 'D']],
        mots: [{ dir: 'v', x: 0, y: 0, mot: 'AC', def: '' }, { dir: 'v', x: 1, y: 0, mot: 'BD', def: '' }],
        numeros: []
    };
    const p = suitesParasites(grille);
    assert.equal(p.length, 2, 'les deux lignes horizontales sont des parasites');
    assert.deepEqual(p.map(s => s.suite).sort(), ['AB', 'CD']);
});

test('TOUS LES MOTS SE CROISENT — aucune île isolée', () => {
    balayage(6).forEach(({ theme, graine, grille }) => {
        const touche = (a, b) => {
            const cases = (m) => [...m.mot].map((_, i) =>
                m.dir === 'h' ? `${m.x + i},${m.y}` : `${m.x},${m.y + i}`);
            const s = new Set(cases(a));
            return cases(b).some(c => s.has(c));
        };
        // Un parcours en largeur depuis le premier mot doit atteindre tous
        // les autres : c'est ce qui fait qu'une réponse en débloque une autre.
        const vus = new Set([0]);
        const file = [0];
        while (file.length) {
            const i = file.shift();
            grille.mots.forEach((m, j) => {
                if (!vus.has(j) && touche(grille.mots[i], m)) { vus.add(j); file.push(j); }
            });
        }
        assert.equal(vus.size, grille.mots.length,
            `${theme}/${graine} : ${grille.mots.length - vus.size} mot(s) détaché(s)`);
    });
});

test('LA GRILLE EST SERRÉE — au moins un croisement par mot ou presque', () => {
    balayage(6).forEach(({ theme, graine, grille }) => {
        const q = qualite(grille);
        assert.ok(q.mots >= 6, `${theme}/${graine} : seulement ${q.mots} mots placés`);
        assert.ok(q.croisements >= q.mots - 1,
            `${theme}/${graine} : ${q.croisements} croisements pour ${q.mots} mots`);
        assert.ok(q.remplissage >= 0.2,
            `${theme}/${graine} : la grille n'est remplie qu'à ${(q.remplissage * 100).toFixed(0)} %`);
    });
});

test('l\'optimisation choisit mieux que le premier tirage venu', () => {
    // Elle ne peut pas faire pire : elle compare et garde le meilleur.
    const rngPour = (i) => makeRng(`opt${i}`);
    const meilleure = grilleOptimisee({ theme: 'angles', nbMots: 12, essais: 10, rngPour });
    const premiere = creerGrille({ theme: 'angles', nbMots: 12, rng: rngPour(0) });
    const note = (g) => { const q = qualite(g); return q.mots * 10 + q.croisements * 4 - q.surface * 0.05; };
    assert.ok(note(meilleure) >= note(premiere));
    assert.deepEqual(suitesParasites(meilleure), []);
});

test('la grille est recadrée : pas de marge blanche autour', () => {
    balayage(4).forEach(({ theme, graine, grille }) => {
        const pleine = (t) => t.some(c => c !== null);
        assert.ok(pleine(grille.cases[0]), `${theme}/${graine} : première ligne vide`);
        assert.ok(pleine(grille.cases[grille.hauteur - 1]), `${theme}/${graine} : dernière ligne vide`);
        assert.ok(pleine(grille.cases.map(l => l[0])), `${theme}/${graine} : première colonne vide`);
        assert.ok(pleine(grille.cases.map(l => l[grille.largeur - 1])), `${theme}/${graine} : dernière colonne vide`);
    });
});

test('LA NUMÉROTATION EST CELLE D\'UNE GRILLE DE JOURNAL', () => {
    balayage(4).forEach(({ theme, graine, grille }) => {
        // Les numéros se suivent dans l'ordre de lecture.
        const ordre = [...grille.numeros];
        for (let i = 1; i < ordre.length; i++) {
            assert.equal(ordre[i].num, ordre[i - 1].num + 1);
            const avant = ordre[i - 1], apres = ordre[i];
            assert.ok(apres.y > avant.y || (apres.y === avant.y && apres.x > avant.x),
                `${theme}/${graine} : les numéros ne suivent pas la lecture`);
        }
        // Chaque mot porte le numéro de sa case de départ.
        grille.mots.forEach(m => {
            const n = grille.numeros.find(p => p.x === m.x && p.y === m.y);
            assert.ok(n, `${theme}/${graine} : « ${m.mot} » commence sur une case sans numéro`);
            assert.equal(m.num, n.num);
        });
    });
});

test('deux mots qui partent de la même case partagent leur numéro', () => {
    const cases = [['A', 'B'], ['C', null]];
    const mots = [
        { x: 0, y: 0, dir: 'h', mot: 'AB' },
        { x: 0, y: 0, dir: 'v', mot: 'AC' }
    ];
    const numeros = numeroter(cases, mots);
    assert.equal(numeros.length, 1);
    assert.equal(mots[0].num, 1);
    assert.equal(mots[1].num, 1);
});

test('les définitions se rangent en horizontal et vertical, numérotées', () => {
    const grille = creerGrille({ theme: 'angles', nbMots: 10, rng: makeRng('def') });
    const d = definitions(grille);
    assert.ok(d.horizontal.length && d.vertical.length, 'une grille doit croiser dans les deux sens');
    [...d.horizontal, ...d.vertical].forEach(e => {
        assert.ok(e.num > 0);
        assert.ok(e.def && e.def.length > 8, `« ${e.mot} » sans définition utile`);
        assert.equal(e.longueur, e.mot.length);
    });
    // Rangées par numéro.
    const croissant = (t) => t.every((e, i) => i === 0 || e.num > t[i - 1].num);
    assert.ok(croissant(d.horizontal) && croissant(d.vertical));
});

test('une pose est refusée si elle allonge un mot existant', () => {
    const g = [
        ['A', 'B', 'C', null],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null]
    ];
    // Juste après ABC : le mot deviendrait ABCXY à la lecture.
    assert.equal(poseValide(g, 'XY', 3, 0, 'h'), -1);
    // Collé en dessous, sans croiser : deux mots parallèles côte à côte.
    assert.equal(poseValide(g, 'XY', 0, 1, 'h'), -1);
    // En croisant le B, c'est bon.
    assert.equal(poseValide(g, 'XBY', 1, -1, 'v'), -1, 'hors grille');
    assert.equal(poseValide(g, 'BY', 1, 0, 'v'), 1, 'un croisement sur le B');
});

test('une lettre différente au croisement interdit la pose', () => {
    const g = [['A', 'B'], [null, null]];
    assert.equal(poseValide(g, 'XY', 0, 0, 'v'), -1, 'X ne peut pas se poser sur A');
});

test('LE MÊME TIRAGE DONNE LA MÊME GRILLE', () => {
    const a = creerGrille({ theme: 'calcul', nbMots: 10, rng: makeRng('stable') });
    const b = creerGrille({ theme: 'calcul', nbMots: 10, rng: makeRng('stable') });
    assert.deepEqual(a.cases, b.cases);
    assert.deepEqual(a.mots.map(m => m.mot), b.mots.map(m => m.mot));
});

test('le nombre de mots demandé est respecté', () => {
    [6, 8, 12].forEach(n => {
        const g = creerGrille({ theme: 'tout', nbMots: n, rng: makeRng(`n${n}`) });
        assert.ok(g.mots.length <= n, `${g.mots.length} mots pour ${n} demandés`);
        assert.ok(g.mots.length >= Math.min(n, 5), `seulement ${g.mots.length} mots placés`);
    });
});

test('la grille se dit résolue quand elle est juste, et pas avant', () => {
    const grille = creerGrille({ theme: 'angles', nbMots: 8, rng: makeRng('sol') });
    const juste = {};
    grille.cases.forEach((l, y) => l.forEach((c, x) => { if (c !== null) juste[`${x},${y}`] = c; }));
    assert.ok(estResolue(grille, juste));
    assert.deepEqual(casesFausses(grille, juste), []);

    const premiere = grille.mots[0];
    const cle = `${premiere.x},${premiere.y}`;
    const faux = { ...juste, [cle]: juste[cle] === 'Z' ? 'W' : 'Z' };
    assert.ok(!estResolue(grille, faux));
    assert.deepEqual(casesFausses(grille, faux), [{ x: premiere.x, y: premiere.y }]);

    // Une case laissée VIDE n'est pas une faute : elle n'est pas remplie.
    const partielle = { ...juste };
    delete partielle[cle];
    assert.ok(!estResolue(grille, partielle));
    assert.deepEqual(casesFausses(grille, partielle), []);
});

test('un lexique vide ne fait pas planter le générateur', () => {
    const g = creerGrille({ theme: 'angles', niveauMax: 0, nbMots: 10, rng: makeRng('vide') });
    assert.equal(g.mots.length, 0);
    assert.equal(g.hauteur, 1);
    assert.deepEqual(suitesParasites(g), []);
});
