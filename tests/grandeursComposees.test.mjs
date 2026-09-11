// Les grandeurs composées : l'unité dicte l'opération.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import '../js/core/activities/index.js';
import { makeRng } from '../js/core/ids.js';
import { getGenerator } from '../js/core/registry.js';
import { getExerciseById } from '../js/data/catalog.js';
import { GRANDEURS, CONVERSIONS } from '../js/core/generators/grandeursComposees.js';

const gen = () => getGenerator('mes.grandeurs-composees');
const suite = (n, params = {}) => Array.from({ length: n }, (_, i) =>
    gen().generate(params, { rng: makeRng(`gc-${i}`), index: i }));

test('LES TROIS QUESTIONS SONT LA MÊME RELATION, ET LE CALCUL TOMBE JUSTE', () => {
    // Le chapitre n'est pas un chapitre de calcul : si le nombre est laid,
    // l'élève doute de son arithmétique au lieu de douter de son raisonnement.
    for (let i = 0; i < 120; i++) {
        const it = gen().generate({}, { rng: makeRng(`juste-${i}`), index: i });
        assert.equal(typeof it.answer, 'number', it.prompt.text);
        assert.ok(Number.isFinite(it.answer) && it.answer > 0, it.prompt.text);
        // Au plus trois décimales : au-delà, c'est une division qui ne tombe pas.
        const dec = String(it.answer).split('.')[1] || '';
        assert.ok(dec.length <= 3, `${it.prompt.text} → ${it.answer}`);
    }
});

test('L\'UNITÉ EST TOUJOURS ÉCRITE, ET L\'EXPLICATION COMMENCE PAR LA RELIRE', () => {
    // C'est tout le chapitre : « 7,9 g/cm³, c'est 7,9 g pour 1 cm³ ». Une
    // explication qui donnerait le calcul sans relire l'unité enseignerait une
    // formule de plus à retenir.
    for (const it of suite(20)) {
        assert.match(it.prompt.text, /\(en .+\)$/, it.prompt.text);
        assert.ok(it.explanation.length > 25, it.prompt.text);
        if (it.meta.quoi === 'convertir') {
            assert.match(it.explanation, /parce que/);
        } else {
            assert.match(it.explanation, /pour 1 /, it.explanation);
        }
        assert.equal(it.hints.length, 3);
        assert.match(it.hints[0], /unité|deux unités/i);
    }
});

test('LE FRANÇAIS DES ÉNONCÉS EST CORRECT', () => {
    // Vu à la génération : « un morceau de le plomb », et « Quelle est le
    // débit ». Un énoncé mal accordé se relit deux fois, et l'élève doute de sa
    // lecture avant de douter de son calcul.
    for (let i = 0; i < 200; i++) {
        const t = gen().generate({}, { rng: makeRng(`fr-${i}`), index: i }).prompt.text;
        assert.equal(/de le |de les |de un |de une /.test(t), false, t);
        assert.equal(/Quelle est le |Quel est la /.test(t), false, t);
        assert.equal(/ {2}| \?\?|,,/.test(t), false, t);
        assert.match(t, /^[A-ZÀÉÈ]/, t);
    }
    // Et chaque grandeur porte bien son genre.
    GRANDEURS.forEach(g => {
        assert.ok(g.genre === 'm' || g.genre === 'f', g.id);
        assert.equal(g.nom.startsWith(g.genre === 'f' ? 'la ' : 'le '), true, g.id);
    });
});

test('LES VALEURS SONT CELLES D\'UN VRAI TABLEAU', () => {
    // Le fer pèse 7,9 g/cm³, pas 340. Un énoncé invraisemblable apprend à ne
    // pas se relire — et c'est exactement ce qu'on veut éviter ici.
    const fer = GRANDEURS.find(g => g.id === 'masse-volumique').sujets.find(s => s.quoi === 'fer');
    assert.equal(fer.valeur, 7.9);
    GRANDEURS.forEach(g => {
        assert.ok(g.sujets.length >= 3, g.id);
        assert.ok(g.bases.length >= 4, g.id);
        assert.ok(g.unite.includes('/'), `${g.id} : une grandeur composée a une barre`);
        assert.ok(g.haut.unite && g.bas.unite, g.id);
        g.sujets.forEach(s => assert.ok(s.valeur > 0, `${g.id}/${s.quoi}`));
    });
    // La vitesse n'est PAS dans la liste : elle a son propre exercice.
    assert.equal(GRANDEURS.some(g => g.unite === 'km/h'), false);
});

test('LES CONVERSIONS SE DÉMONTRENT AU LIEU DE SE RETENIR', () => {
    const parId = Object.fromEntries(CONVERSIONS.map(c => [`${c.de}->${c.vers}`, c]));
    // Le facteur 3,6 doit être exact, et son inverse aussi.
    assert.equal(parId['m/s->km/h'].facteur, 3.6);
    assert.ok(Math.abs(parId['km/h->m/s'].facteur * 3.6 - 1) < 1e-12);
    assert.equal(parId['g/cm³->kg/m³'].facteur, 1000);
    CONVERSIONS.forEach(c => {
        assert.ok(c.pourquoi.length > 30, `${c.de} : le « pourquoi » manque`);
        assert.ok(c.valeurs.length >= 4, c.de);
    });
    // Et sur les items : 36 km/h font bien 10 m/s.
    let vu = false;
    for (let i = 0; i < 60 && !vu; i++) {
        const it = gen().generate({ chercher: 'convertir' }, { rng: makeRng(`cv-${i}`), index: i });
        if (!/36 km\/h/.test(it.prompt.text)) continue;
        assert.equal(it.answer, 10);
        vu = true;
    }
    assert.ok(vu, '36 km/h devrait sortir au moins une fois');
});

test('on peut ne travailler qu\'une grandeur, ou qu\'un sens', () => {
    const debits = suite(12, { grandeurs: ['debit'], chercher: 'composee' });
    debits.forEach(it => {
        assert.equal(it.meta.grandeur, 'debit');
        assert.equal(it.meta.quoi, 'composee');
        assert.equal(it.meta.unite, 'L/min');
    });
    const bas = suite(10, { chercher: 'bas' });
    bas.forEach(it => assert.equal(it.meta.quoi, 'bas'));
});

test('l\'exercice du catalogue tient debout', () => {
    const exo = getExerciseById('mes-grandeurs-composees');
    assert.ok(exo, 'l\'exercice doit être au catalogue');
    assert.equal(exo.generatorId, 'mes.grandeurs-composees');
    assert.ok(gen(), 'le générateur doit être enregistré');
    // Les grandeurs proposées au professeur existent toutes.
    const schema = gen().params.find(p => p.id === 'grandeurs');
    schema.options.forEach(o => assert.ok(GRANDEURS.some(g => g.id === o.value), o.value));
});

test('LE SCHÉMA MONTRE LES PAQUETS, et ne donne jamais la réponse', () => {
    // Rémy : « pour les grandeurs composées, peut-être faut-il des schémas ? »
    // Un seul, et le même que pour la vitesse : la bande découpée en paquets,
    // chacun portant ce qu'il y a POUR UN. C'est la multiplication rendue
    // évidente — et la division dans l'autre sens.
    for (let i = 0; i < 60; i++) {
        const it = gen().generate({}, { rng: makeRng('sch-' + i), index: i });
        if (it.meta.quoi === 'convertir') continue;   // une conversion n'a pas de paquets
        const outils = it.meta.outils;
        assert.equal(outils.length, 2, it.prompt.text);
        assert.deepEqual(outils.map(o => o.id), ['schema', 'methode']);
        const svg = outils[0].html;
        assert.equal(/NaN|undefined/.test(svg), false, svg);
        // Quelque chose est marqué inconnu, et c'est la grandeur cherchée.
        assert.match(svg, /\?/, it.prompt.text);
        // La phrase qui EST la méthode est écrite sous le dessin.
        assert.match(svg, /pour 1 /, svg);
    }
});

test('LA MÉTHODE TIENT EN TROIS GESTES, sans qu\'on dise lequel prendre', () => {
    const html = gen().generate({ chercher: 'haut' }, { rng: makeRng('m'), index: 0 })
        .meta.outils[1].html;
    ['total ÷ nombre', 'taux × nombre', 'total ÷ taux'].forEach(g =>
        assert.ok(html.includes(g), g));
    assert.match(html, /pour un/);
    // Rien ne désigne le bon : choisir est l'exercice.
    assert.equal(/juste|bonne|surlign|--actif/.test(html), false, html);
});
