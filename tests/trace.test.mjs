// Construire le trait : trois morceaux, quatre objets, et onze impasses.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    MORCEAUX, traceVide, traceDe, ecritureDe, verifierTrace, roleDuMorceau, memeObjet
} from '../js/core/trace.js';

test('les quatre objets du chapitre se tracent, et se relisent', () => {
    // A à gauche, B à droite : le cas ordinaire.
    const cas = [
        ['droite', 'A', 'B', '(AB)'],
        ['segment', 'A', 'B', '[AB]'],
        ['demi-droite', 'A', 'B', '[AB)'],
        // Et le piège du chapitre : la même figure nommée depuis l'autre bout.
        ['demi-droite', 'B', 'A', '[BA)']
    ];
    for (const [type, a, b, attendu] of cas) {
        const t = traceDe(type, a, b, 'A');
        assert.equal(ecritureDe(t, 'A', 'B'), attendu, `${type} ${a}${b}`);
    }
});

test('[AB) et [BA) ne prennent pas le même morceau', () => {
    // C'est TOUT le chapitre : l'origine est le premier point nommé, celui où
    // le trait s'arrête — pas celui de gauche.
    const ab = traceDe('demi-droite', 'A', 'B', 'A');
    const ba = traceDe('demi-droite', 'B', 'A', 'A');
    assert.deepEqual(ab, { avant: false, entre: true, apres: true });
    assert.deepEqual(ba, { avant: true, entre: true, apres: false });
});

test('le dessin ne dépend pas de l\'ordre des lettres dans l\'écriture', () => {
    // On peut dessiner B à gauche : [AB) reste la demi-droite d'origine A,
    // c'est-à-dire, à l'écran, celle qui s'arrête À DROITE et file à gauche.
    const t = traceDe('demi-droite', 'A', 'B', 'B');
    assert.deepEqual(t, { avant: true, entre: true, apres: false });
    assert.equal(ecritureDe(t, 'B', 'A'), '[AB)');
});

test('un trait qui ne relie pas les deux points ne désigne rien', () => {
    for (const t of [
        { avant: false, entre: false, apres: false },
        { avant: true, entre: false, apres: false },
        { avant: false, entre: false, apres: true },
        { avant: true, entre: false, apres: true }
    ]) {
        assert.equal(ecritureDe(t, 'A', 'B'), null);
    }
});

test('la correction NOMME ce qui a été tracé', () => {
    // « Tu as tracé le segment » apprend quelque chose ; « c'est faux » non.
    const segment = traceDe('segment', 'A', 'B', 'A');
    const bilan = verifierTrace(segment, '(AB)', 'A', 'B');
    assert.equal(bilan.juste, false);
    assert.equal(bilan.obtenu, '[AB]');
    assert.match(bilan.message, /\[AB\].*\(AB\)/);

    const juste = verifierTrace(traceDe('droite', 'A', 'B', 'A'), '(AB)', 'A', 'B');
    assert.equal(juste.juste, true);
});

test('un tracé vide se dit autrement qu\'un tracé faux', () => {
    const vide = verifierTrace(traceVide(), '[AB]', 'A', 'B');
    assert.equal(vide.juste, false);
    assert.equal(vide.obtenu, null);
    assert.match(vide.message, /rien de tracé/);

    const sansMilieu = verifierTrace({ avant: true, entre: false, apres: true }, '(AB)', 'A', 'B');
    assert.equal(sansMilieu.obtenu, null);
    assert.match(sansMilieu.message, /manque/);
});

test('l\'ordre des lettres ne compte que sur une demi-droite', () => {
    // (AB) et (BA) sont la même droite, [AB] et [BA] le même segment. Mais
    // [AB) et [BA) sont deux demi-droites différentes : là, l'ordre EST la
    // notion, et l'on ne pardonne rien.
    assert.ok(memeObjet('(AB)', '(BA)'));
    assert.ok(memeObjet('[AB]', '[BA]'));
    assert.ok(!memeObjet('[AB)', '[BA)'));
    assert.ok(!memeObjet('(AB)', '[AB]'));
    // Une droite tracée « à l'envers » est juste, et on la lui renomme comme
    // l'énoncé l'avait nommée.
    const bilan = verifierTrace(traceDe('droite', 'A', 'B', 'B'), '(AB)', 'B', 'A');
    assert.equal(bilan.juste, true);
    assert.equal(bilan.obtenu, '(AB)');
});

test('les trois morceaux se disent en français', () => {
    assert.equal(MORCEAUX.length, 3);
    for (const nom of MORCEAUX) {
        const dit = roleDuMorceau(nom, 'A', 'B');
        assert.equal(typeof dit, 'string');
        assert.ok(dit.length > 8, `« ${dit} » ne dit rien`);
        assert.match(dit, /[AB]/, 'le rôle d\'un morceau se dit avec les points');
    }
});

// --- Ce que produit le générateur -------------------------------------------

import { notationGenerator } from '../js/core/generators/notation.js';
import { makeRng } from '../js/core/ids.js';

test('le sens « dessin » se trace, et il n\'a plus de propositions', () => {
    let vus = 0;
    for (let i = 0; i < 24; i++) {
        const it = notationGenerator.generate({}, { rng: makeRng(`tr${i}`), index: i });
        if (it.meta.sens !== 'dessin') continue;
        vus++;
        assert.equal(it.meta.composable, 'trace');
        assert.equal(it.meta.saisieSeule, true);
        assert.match(it.prompt.text, /^Trace /);
        // Les propositions restent dans l'item — le carnet d'erreurs en a
        // besoin — mais ce sont des ÉCRITURES, plus des vignettes de dessin :
        // il n'y a plus rien à reconnaître à l'œil.
        assert.ok(it.choices.every(c => /^[[(][A-Z]{2}[\])]$/.test(String(c.value))),
            'les propositions d\'un tracé sont des écritures, pas des images');
        // Les lettres dessinées sont bien les deux du triangle… pardon, du trait.
        assert.ok([it.meta.a, it.meta.b].includes(it.meta.gauche));
        assert.ok([it.meta.a, it.meta.b].includes(it.meta.droite));
        assert.notEqual(it.meta.gauche, it.meta.droite);
        // Et le tracé attendu se relit bien comme la réponse.
        const type = it.meta.objet;
        const t = traceDe(type, it.meta.a, it.meta.b, it.meta.gauche);
        assert.ok(memeObjet(ecritureDe(t, it.meta.gauche, it.meta.droite), String(it.answer)),
            `${ecritureDe(t, it.meta.gauche, it.meta.droite)} ≠ ${it.answer}`);
        assert.equal(verifierTrace(t, String(it.answer), it.meta.gauche, it.meta.droite).juste, true);
    }
    assert.ok(vus >= 6, `le sens « dessin » doit revenir souvent (vu ${vus} fois)`);
});

test('l\'exercice conseille au moins quinze questions', () => {
    // Rémy : « c'est typiquement le genre d'exercice où il faudrait au moins
    // 15 questions ».
    assert.ok(typeof notationGenerator.conseil === 'function');
    assert.ok(notationGenerator.conseil({}) >= 15);
});
