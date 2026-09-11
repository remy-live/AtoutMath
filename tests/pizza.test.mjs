import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    pgcd, ppcm, ppcmListe, simplifier, enParts, direFraction,
    tirerCommande, verifier, expliquer, INGREDIENTS
} from '../js/core/pizza.js';

function rngFixe(graine = 11) {
    let s = graine >>> 0;
    return { next: () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; } };
}

test('le PPCM de deux dénominateurs est le découpage commun', () => {
    assert.equal(ppcm(3, 4), 12);
    assert.equal(ppcm(2, 4), 4);
    assert.equal(ppcm(6, 4), 12);
    assert.equal(ppcm(5, 5), 5);
    assert.equal(ppcmListe([2, 3, 4]), 12);
    assert.equal(ppcmListe([3, 5]), 15);
});

test('le PPCM est bien un multiple commun, et le plus petit', () => {
    for (let a = 2; a <= 12; a++) {
        for (let b = 2; b <= 12; b++) {
            const m = ppcm(a, b);
            assert.equal(m % a, 0, `${m} n'est pas multiple de ${a}`);
            assert.equal(m % b, 0, `${m} n'est pas multiple de ${b}`);
            for (let k = 1; k < m; k++) {
                assert.ok(!(k % a === 0 && k % b === 0), `${k} est un multiple commun plus petit que ${m}`);
            }
        }
    }
});

test('deux tiers d\'une pizza en douze parts font huit parts', () => {
    assert.equal(enParts(2, 3, 12), 8);
    assert.equal(enParts(1, 4, 12), 3);
    assert.equal(enParts(1, 2, 12), 6);
    assert.equal(enParts(5, 6, 12), 10);
});

test('une fraction se dit comme on la commande', () => {
    assert.equal(direFraction(1, 2), 'la moitié');
    assert.equal(direFraction(2, 3), 'les deux tiers');
    assert.equal(direFraction(1, 4), 'le quart');
    assert.equal(direFraction(3, 4), 'les trois quarts');
    assert.equal(direFraction(5, 6), 'les cinq sixièmes');
});

test('simplifier ramène à la forme irréductible', () => {
    assert.deepEqual(simplifier(8, 12), { num: 2, den: 3 });
    assert.deepEqual(simplifier(6, 3), { num: 2, den: 1 });
    assert.deepEqual(simplifier(5, 7), { num: 5, den: 7 });
});

test('une commande tient TOUJOURS sur une seule pizza', () => {
    // La contrainte qui compte : une commande dont la somme dépasse 1 est
    // impossible, et l'élève chercherait une erreur qui n'est pas la sienne.
    for (let g = 1; g <= 40; g++) {
        for (const nb of [2, 3]) {
            const c = tirerCommande({ rng: rngFixe(g * 13 + nb), nbFractions: nb });
            assert.ok(c, `aucune commande (graine ${g}, ${nb} fractions)`);
            const somme = c.fractions.reduce((s, f) => s + f.num / f.den, 0);
            assert.ok(somme <= 1 + 1e-9, `somme ${somme} > 1 (graine ${g})`);
            const parts = Object.values(c.cible).reduce((s, n) => s + n, 0);
            assert.ok(parts <= c.parts, `${parts} parts garnies sur ${c.parts}`);
        }
    }
});

test('chaque fraction commandée est irréductible', () => {
    // « Deux quarts » apprendrait à ne pas simplifier, et ferait tomber le
    // PPCM juste pour la mauvaise raison.
    for (let g = 1; g <= 40; g++) {
        const c = tirerCommande({ rng: rngFixe(g * 7), nbFractions: 2 });
        c.fractions.forEach(f => {
            assert.equal(pgcd(f.num, f.den), 1, `${f.num}/${f.den} est réductible (graine ${g})`);
            assert.ok(f.num >= 1 && f.num < f.den, `${f.num}/${f.den} hors bornes`);
        });
    }
});

test('le nombre de parts est le PPCM des dénominateurs commandés', () => {
    for (let g = 1; g <= 30; g++) {
        const c = tirerCommande({ rng: rngFixe(g * 3 + 1), nbFractions: 2 });
        assert.equal(c.parts, ppcmListe(c.fractions.map(f => f.den)));
        // Et chaque fraction tombe sur un nombre ENTIER de parts : c'est
        // exactement ce que garantit le PPCM, et ce qui rend la pizza jouable.
        c.fractions.forEach(f => {
            const n = c.cible[f.ingredient];
            assert.equal(n, f.num * (c.parts / f.den));
            assert.equal(n % 1, 0, `${f.num}/${f.den} ne tombe pas juste sur ${c.parts} parts`);
        });
    }
});

test('deux fractions n\'ont jamais le même dénominateur ni le même ingrédient', () => {
    for (let g = 1; g <= 30; g++) {
        const c = tirerCommande({ rng: rngFixe(g * 29), nbFractions: 3, denominateurs: [2, 3, 4, 6, 8] });
        const dens = c.fractions.map(f => f.den);
        assert.equal(new Set(dens).size, dens.length, `dénominateurs en double (graine ${g})`);
        const ing = c.fractions.map(f => f.ingredient);
        assert.equal(new Set(ing).size, ing.length, `ingrédients en double (graine ${g})`);
        ing.forEach(id => assert.ok(INGREDIENTS.some(i => i.id === id), `ingrédient inconnu ${id}`));
    }
});

test('la garniture attendue est acceptée, quel que soit l\'ordre des parts', () => {
    for (let g = 1; g <= 25; g++) {
        const c = tirerCommande({ rng: rngFixe(g * 17), nbFractions: 2 });
        // On remplit dans un ordre volontairement mélangé : la position d'une
        // part ne doit rien changer, seul son nombre compte.
        const cases = Array.from({ length: c.parts }, (_, i) => i);
        for (let i = cases.length - 1; i > 0; i--) {
            const j = Math.floor(rngFixe(g + i).next() * (i + 1));
            [cases[i], cases[j]] = [cases[j], cases[i]];
        }
        const garniture = new Array(c.parts).fill(null);
        let k = 0;
        for (const [id, n] of Object.entries(c.cible)) {
            for (let i = 0; i < n; i++) garniture[cases[k++]] = id;
        }
        const r = verifier(c, garniture);
        assert.ok(r.ok, `garniture juste refusée (graine ${g}) : ${JSON.stringify(r.detail)}`);
        assert.equal(r.nature, c.nature);
    }
});

test('un compte faux est repéré, chiffré et expliqué', () => {
    const c = {
        parts: 12, nature: 1,
        fractions: [{ ingredient: 'champignons', num: 2, den: 3 }, { ingredient: 'tomate', num: 1, den: 4 }],
        cible: { champignons: 8, tomate: 3 }
    };
    const garniture = new Array(12).fill(null);
    for (let i = 0; i < 7; i++) garniture[i] = 'champignons';   // une de moins
    for (let i = 7; i < 10; i++) garniture[i] = 'tomate';

    const r = verifier(c, garniture);
    assert.equal(r.ok, false);
    const champ = r.detail.find(d => d.ingredient === 'champignons');
    assert.equal(champ.pose, 7);
    assert.equal(champ.attendu, 8);
    assert.equal(champ.ecart, -1);
    assert.ok(r.detail.find(d => d.ingredient === 'tomate').ok, 'la tomate était juste');

    const phrase = expliquer(c, champ);
    assert.match(phrase, /les deux tiers/);
    assert.match(phrase, /2 × 4 = 8 parts/);
    assert.match(phrase, /garni 7/);
});

test('un ingrédient hors commande est signalé à part', () => {
    const c = {
        parts: 4, nature: 1,
        fractions: [{ ingredient: 'tomate', num: 3, den: 4 }],
        cible: { tomate: 3 }
    };
    const r = verifier(c, ['tomate', 'tomate', 'tomate', 'olives']);
    assert.equal(r.ok, false);
    assert.deepEqual(r.intrus, ['olives']);
    assert.ok(r.detail[0].ok, 'la tomate, elle, était juste');
});

test('une pizza vide n\'est jamais acceptée', () => {
    const c = tirerCommande({ rng: rngFixe(4), nbFractions: 2 });
    const r = verifier(c, new Array(c.parts).fill(null));
    assert.equal(r.ok, false);
    r.detail.forEach(d => assert.equal(d.pose, 0));
});
