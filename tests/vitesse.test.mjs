// Temps, distance, vitesse : une formule, trois questions, zéro nombre sale.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { vitesseGenerator } from '../js/core/generators/vitesse.js';
import { makeRng } from '../js/core/ids.js';
import { schemaVitesseSvg, FORMULES_VITESSE } from '../js/core/vitesseSchema.js';

const tirer = (params, graine) => vitesseGenerator.generate(params, { rng: makeRng(graine), index: 0 });

test('les trois questions sortent, et chacune est cohérente avec d = v × t', () => {
    const vus = new Set();
    for (let g = 0; g < 60; g++) {
        const it = tirer({ chercher: 'melange', difficulte: 2 }, `m${g}`);
        const { quoi, v, t, d } = it.meta;
        vus.add(quoi);
        assert.equal(v * t, d, 'd = v × t doit être vrai par construction');
        assert.equal(it.answer, quoi === 'distance' ? d : quoi === 'vitesse' ? v : t);
        assert.ok(!/undefined|NaN/.test(it.prompt.text + it.explanation));
    }
    assert.deepEqual([...vus].sort(), ['distance', 'duree', 'vitesse']);
});

test('les distances restent entières, même avec des demi-heures', () => {
    // 15 × 1,5 = 22,5 ne se corrige pas en calcul mental de ce niveau : le
    // générateur n'a pas le droit de le produire.
    for (let g = 0; g < 80; g++) {
        const it = tirer({ chercher: 'melange', difficulte: 2 }, `e${g}`);
        assert.ok(Number.isInteger(it.meta.d), `distance non entière : ${it.meta.d} km`);
        assert.ok(Number.isInteger(it.meta.v), `vitesse non entière : ${it.meta.v}`);
    }
});

test('au niveau 1, les durées sont des heures entières', () => {
    for (let g = 0; g < 40; g++) {
        const it = tirer({ chercher: 'melange', difficulte: 1 }, `h${g}`);
        assert.ok(Number.isInteger(it.meta.t), `durée fractionnaire au niveau 1 : ${it.meta.t}`);
    }
});

test('le piège des durées est corrigé en toutes lettres', () => {
    // « 1 h 30 = 1,5 h » doit être ÉCRIT quelque part dès qu'une durée
    // fractionnaire apparaît — c'est l'obstacle du chapitre.
    let vus = 0;
    for (let g = 0; g < 120 && vus < 5; g++) {
        const it = tirer({ chercher: 'distance', difficulte: 2 }, `p${g}`);
        if (!Number.isInteger(it.meta.t)) {
            vus++;
            assert.ok(it.meta.conversion, 'la conversion doit accompagner la durée fractionnaire');
            assert.match(it.explanation + it.hints.join(' '), /=\s*[\d,]+\s*h/);
        }
    }
    assert.ok(vus >= 3, 'les durées fractionnaires doivent réellement sortir au niveau 2');
});

test('chaque véhicule garde une vitesse vraisemblable', () => {
    // L'ordre de grandeur est un OUTIL de vérification qu'on enseigne : un
    // randonneur à 90 km/h le détruirait.
    for (let g = 0; g < 60; g++) {
        const it = tirer({ chercher: 'vitesse', difficulte: 1 }, `v${g}`);
        if (/randonneur/i.test(it.meta.mobile)) assert.ok(it.meta.v <= 6);
        if (/train/i.test(it.meta.mobile)) assert.ok(it.meta.v >= 120);
    }
});

test('la question demandée est la question obtenue', () => {
    assert.equal(tirer({ chercher: 'distance' }, 'q1').meta.quoi, 'distance');
    assert.equal(tirer({ chercher: 'vitesse' }, 'q2').meta.quoi, 'vitesse');
    assert.equal(tirer({ chercher: 'duree' }, 'q3').meta.quoi, 'duree');
});

// --- LE SCHÉMA ET LES FORMULES ------------------------------------------------

test('LE SCHÉMA MONTRE L\'ÉNONCÉ, ET NE DONNE JAMAIS LA RÉPONSE', () => {
    // Rémy : « on pourrait avoir un bouton schéma et un bouton formule ». Un
    // schéma qui écrirait la grandeur cherchée ferait l'exercice à la place de
    // l'élève — et il faudrait alors le compter comme une aide. Celui-ci
    // remet l'énoncé en image : la grandeur cherchée y porte un « ? ».
    for (let g = 0; g < 40; g++) {
        const it = tirer({ chercher: 'melange', difficulte: 2 }, `sch${g}`);
        const outils = it.meta.outils;
        assert.equal(outils.length, 2, 'schéma et formules');
        assert.deepEqual(outils.map(o => o.id), ['schema', 'formule']);
        outils.forEach(o => assert.ok(o.label && o.html, o.id));

        const svg = outils[0].html;
        assert.equal(/NaN|undefined/.test(svg), false, svg);
        // La réponse n'est écrite nulle part dans le dessin.
        const cherche = { distance: 'd', vitesse: 'v', duree: 't' }[it.meta.quoi];
        assert.ok(svg.includes(`${cherche} = ?`), `${it.meta.quoi} : ${svg}`);
        // Les deux autres, si : c'est l'énoncé qu'on redessine.
        ['d', 'v', 't'].filter(l => l !== cherche).forEach(l => {
            assert.equal(svg.includes(`${l} = ?`), false, `${l} ne devrait pas être inconnue`);
            assert.match(svg, new RegExp(`${l} = [0-9]`), `${l} manque sa valeur`);
        });
    }
});

test('LES TROIS FORMULES SONT MONTRÉES SANS QU\'ON DÉSIGNE LA BONNE', () => {
    // Choisir la bonne EST l'exercice : la souligner ferait le travail, et le
    // bouton cesserait d'être gratuit.
    assert.equal(FORMULES_VITESSE.length, 3);
    assert.deepEqual(FORMULES_VITESSE.map(f => f.formule), ['d = v × t', 'v = d ÷ t', 't = d ÷ v']);
    const html = tirer({ chercher: 'vitesse', difficulte: 1 }, 'f1').meta.outils[1].html;
    FORMULES_VITESSE.forEach(f => assert.ok(html.includes(f.formule), f.formule));
    // Rien ne distingue l'une des trois — ni classe, ni marque.
    assert.equal(/juste|bonne|surlign|--actif/.test(html), false, html);
});

test('le schéma tient dans son cadre, quelles que soient les valeurs', () => {
    // Une longue valeur (« 1 000 km ») ne doit pas sortir du dessin : tout est
    // centré sur des repères fixes, et le SVG déclare sa boîte.
    const svg = schemaVitesseSvg({ quoi: 'duree', direV: '1 000 km/h', direD: '12 500 km', direT: '12,5 h' });
    assert.match(svg, /viewBox="0 0 320 /);
    assert.ok(svg.includes('t = ?'));
    assert.ok(svg.includes('12 500 km'));
    assert.equal(/NaN/.test(svg), false);
});
