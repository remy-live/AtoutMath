// Segment, droite, demi-droite : la notation et son dessin.
//
// Ce qu'on vérifie ici n'est pas un calcul mais une CORRESPONDANCE : que le
// trait dessiné s'arrête bien là où le crochet le dit, et que les propositions
// n'offrent jamais deux fois la même chose sous deux apparences.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { notationGenerator } from '../js/core/generators/notation.js';
import { traceSvg } from '../js/core/figures.js';
import { makeRng } from '../js/core/ids.js';

const tirer = (index, params = {}) => notationGenerator.generate(
    params, { rng: makeRng(`n${index}`), index });

/** Les deux bouts du trait tracé, lus dans le SVG. */
function extremites(svg) {
    const m = /<line class="tr-trait" x1="([\d.]+)" y1="[\d.]+" x2="([\d.]+)"/.exec(svg);
    assert.ok(m, 'trait introuvable');
    return [Number(m[1]), Number(m[2])];
}

test('le trait s\'arrête là où le crochet le dit', () => {
    // Les deux points sont à 70 et 140 dans le repère du dessin.
    const [sd, sf] = extremites(traceSvg({ type: 'segment' }));
    assert.equal(sd, 70, 'un segment part de son premier point');
    assert.equal(sf, 140, 'un segment s\'arrête à son second point');

    const [dd, df] = extremites(traceSvg({ type: 'droite' }));
    assert.ok(dd < 70 && df > 140, 'une droite dépasse des deux côtés');

    const [hd, hf] = extremites(traceSvg({ type: 'demi-droite' }));
    assert.equal(hd, 70, 'une demi-droite part de son origine');
    assert.ok(hf > 140, 'une demi-droite continue au-delà du second point');
});

test('le dessin nomme les deux points, dans l\'ordre demandé', () => {
    const svg = traceSvg({ type: 'segment', a: 'C', b: 'D' });
    const noms = [...svg.matchAll(/class="tr-nom"[^>]*>([A-Z])</g)].map(m => m[1]);
    assert.deepEqual(noms, ['C', 'D']);
});

test('chaque question a une bonne réponse et quatre propositions distinctes', () => {
    for (let i = 0; i < 60; i++) {
        const it = tirer(i);
        assert.equal(it.choices.filter(c => c.correct).length, 1, `question ${i}`);
        assert.equal(it.choices.length, 4, `question ${i}`);
        assert.equal(new Set(it.choices.map(c => String(c.value))).size, 4, `question ${i}`);
        assert.equal(it.choices.find(c => c.correct).value, it.answer);
    }
});

test('la bonne écriture correspond à l\'objet dessiné', () => {
    const attendu = { segment: /^\[[A-Z]{2}\]$/, droite: /^\([A-Z]{2}\)$/, 'demi-droite': /^\[[A-Z]{2}\)$/ };
    for (let i = 0; i < 60; i++) {
        const it = tirer(i, { sens: ['ecrire'] });
        assert.match(String(it.answer), attendu[it.meta.objet],
            `${it.meta.objet} noté ${it.answer}`);
    }
});

test('la bonne image montre bien l\'objet demandé', () => {
    for (let i = 0; i < 60; i++) {
        const it = tirer(i, { sens: ['dessin'] });
        const bon = it.choices.find(c => c.correct);
        assert.equal(bon.value, `${it.meta.objet}-${it.meta.a}${it.meta.b}`);
        // Le libellé est un dessin : il doit dire en mots ce qu'il montre,
        // sans quoi « Montre-moi » afficherait du SVG à l'élève.
        assert.ok(bon.texte && !/[<>]/.test(bon.texte), `texte de secours manquant : ${bon.texte}`);
        assert.match(bon.label, /<svg/, 'la proposition doit être un dessin');
    }
});

test('la demi-droite propose son inverse comme piège', () => {
    // [AB) et [BA) sont deux demi-droites différentes : c'est LA confusion du
    // chapitre, et elle doit être proposée.
    let vus = 0;
    for (let i = 0; i < 90; i++) {
        const it = tirer(i, { objets: ['demi-droite'] });
        const { a, b } = it.meta;
        const inverse = it.meta.sens === 'dessin' ? `demi-droite-${b}${a}`
            : it.meta.sens === 'ecrire' ? `[${b}${a})` : `la demi-droite [${b}${a})`;
        if (it.choices.some(c => String(c.value) === inverse)) vus++;
    }
    assert.ok(vus > 60, `l'inverse n'est proposé que ${vus} fois sur 90`);
});

test('les deux points portent toujours des lettres différentes', () => {
    for (let i = 0; i < 120; i++) {
        const it = tirer(i);
        assert.notEqual(it.meta.a, it.meta.b, `question ${i}`);
    }
});

test('objets et sens tournent : sur neuf questions, tout est vu', () => {
    const objets = new Set(), sens = new Set();
    for (let i = 0; i < 9; i++) {
        const it = tirer(i);
        objets.add(it.meta.objet); sens.add(it.meta.sens);
    }
    assert.equal(objets.size, 3, [...objets].join(', '));
    assert.equal(sens.size, 3, [...sens].join(', '));
});

test('un réglage restreint est respecté', () => {
    for (let i = 0; i < 20; i++) {
        const it = tirer(i, { objets: ['segment', 'droite'], sens: ['dire'] });
        assert.notEqual(it.meta.objet, 'demi-droite');
        assert.equal(it.meta.sens, 'dire');
    }
});

test('chaque mauvaise réponse dit ce qu\'elle piège', () => {
    for (let i = 0; i < 20; i++) {
        const it = tirer(i);
        it.choices.filter(c => !c.correct).forEach(c => {
            assert.ok(c.why && c.why.length > 10,
                `question ${i} : une proposition n'explique pas l'erreur`);
        });
    }
});
