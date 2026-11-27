// LE NOM DES SOLIDES — ce que l'élève lit doit être juste, et ne pas revenir.
//
// Rémy, 27 novembre : « cube, pavé droit, cylindre, prisme droit, pyramide,
// cône, sphère, boule ». Regardé à l'écran (`tools/tmp/sondeNoms.mjs`) et sur la
// feuille (`ficheEnPdf`) ; ce fichier garde les règles qui l'ont été.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import { nomDesSolidesGenerator as G } from '../js/core/generators/nomDesSolides.js';
import { DESSINS, dessinDe, VOISINS, SOLIDES_NOMMES, MARCHES_SOLIDES } from '../js/core/nomDesSolides.js';

const tirer = (marche, graine, ctx = {}) =>
    G.generate({ marches: [marche] }, { rng: makeRng(graine), index: 0, ...ctx });

test('LES HUIT SOLIDES DE LA LISTE DE RÉMY SONT LÀ', () => {
    assert.deepEqual(SOLIDES_NOMMES.map(s => s.id),
        ['cube', 'pave', 'prisme', 'pyramide', 'cylindre', 'cone', 'sphere', 'boule']);
});

test('UN LEURRE N\'EST JAMAIS UNE RÉPONSE JUSTE', () => {
    // Un cube EST un pavé droit et un prisme droit ; un pavé droit EST un prisme
    // droit. Les proposer comme fausses compterait faux une réponse juste.
    for (const parent of ['pave', 'prisme']) assert.ok(!VOISINS.cube.includes(parent), `« ${parent} » proposé pour un cube`);
    assert.ok(!VOISINS.pave.includes('prisme'), '« prisme droit » proposé pour un pavé droit');
    // Sur un dessin, la sphère et la boule se dessinent pareil.
    assert.ok(!VOISINS.boule.includes('sphere'), '« sphère » proposée pour un dessin de boule');
    // Et les prismes qu'on dessine n'ont jamais une base à quatre côtés : sinon
    // « pavé droit », leurre du prisme, serait vrai.
    for (const d of DESSINS.filter(x => x.id === 'prisme')) assert.notEqual(d.variante, 'pave');
});

test('CHAQUE MARCHE POSE UNE QUESTION À QUATRE CHOIX DONT UN SEUL EST JUSTE', () => {
    for (const { id } of MARCHES_SOLIDES) {
        for (let g = 0; g < 40; g++) {
            const it = tirer(id, `${id}-${g}`);
            const justes = it.choices.filter(c => c.correct);
            assert.equal(justes.length, 1, `${id} : ${justes.length} bonne(s) réponse(s)`);
            assert.equal(justes[0].value, it.answer);
            assert.equal(it.choices.length, 4);
            assert.ok(it.meta.clef, `${id} : pas de clef, la question pourrait revenir`);
        }
    }
});

test('CHAQUE DESSIN SE DESSINE, ET SANS COTE', () => {
    const rng = makeRng('dessins');
    for (const d of DESSINS) {
        const svg = dessinDe(d, rng);
        assert.match(svg, /<svg[^>]*vol-svg/, `${d.cle} : pas de dessin`);
        assert.match(svg, /vol-arete/, `${d.cle} : pas d'arête`);
        assert.doesNotMatch(svg, /r = |h = | cm</, `${d.cle} : une cote est restée sur le dessin`);
    }
    // Les polyèdres ont leurs arêtes cachées en pointillés.
    for (const d of DESSINS.filter(x => ['cube', 'pave', 'prisme', 'pyramide'].includes(x.id))) {
        assert.match(dessinDe(d, rng), /vol-cache/, `${d.cle} : aucune arête cachée`);
    }
});

test('SUR LE PAPIER, AUCUNE QUESTION SANS SON DESSIN, ET AUCUNE QUI REVIENT', () => {
    // Regardé sur la fiche : cinq « Quel est ce solide ? » sans rien à
    // regarder, et « le plot de chantier » deux fois. La feuille passe
    // `papier` et `themesExclus` ; on refait ici ce qu'elle fait.
    for (const marche of ['dessin', 'objet', 'proprietes', 'sphere']) {
        const vus = [];
        const n = marche === 'proprietes' ? 9 : 8;
        for (let i = 0; i < n; i++) {
            const it = tirer(marche, `papier-${marche}-${i}`, { papier: true, themesExclus: vus.slice() });
            assert.doesNotMatch(it.prompt.papier, /Quel est ce solide/, 'une question de dessin est arrivée sur le papier');
            assert.ok(!vus.includes(it.meta.theme), `${marche} : « ${it.prompt.text} » revient`);
            vus.push(it.meta.theme);
        }
    }
});
