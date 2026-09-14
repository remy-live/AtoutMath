// Temps, distance, vitesse : une formule, trois questions, zéro nombre sale.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { vitesseGenerator } from '../js/core/generators/vitesse.js';
import { makeRng } from '../js/core/ids.js';
import { schemaTauxSvg, decouper } from '../js/core/schemaTaux.js';
import { FORMULES_VITESSE } from '../js/core/generators/vitesse.js';

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

test('LE SCHÉMA MONTRE LA RÉPÉTITION, ET NE DONNE JAMAIS LA RÉPONSE', () => {
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
        // LA GRANDEUR CHERCHÉE PORTE UN « ? », les deux autres leur valeur :
        // le schéma remet l'énoncé en image, il ne le résout pas — c'est ce qui
        // permet de l'offrir gratuitement, sans le compter comme une aide.
        const nombres = [...svg.matchAll(/>([^<]*)<\/text>/g)].map(m => m[1]);
        // ON COMPARE DES NOMBRES, PAS DES MORCEAUX DE TEXTE. « 15 km » contient
        // « 5 » : la recherche par sous-chaîne déclarait la vitesse 5 km/h
        // divulguée par le total 15 km, et le test accusait à tort.
        const valeurs = nombres.flatMap(x =>
            (x.match(/[0-9]+(?:,[0-9]+)?/g) || []).map(n => Number(n.replace(',', '.'))));
        const dit = (n) => valeurs.includes(Number(n));
        assert.ok(nombres.some(x => x.includes('?')), 'rien n\'est marqué inconnu');
        // UN SEUL PAQUET, ET LE PAQUET EST LA RÉPONSE. Une heure à 60 km/h, une
        // demi-heure à 300 : le dessin montre alors une case qui vaut le total.
        // Ce n'est pas une fuite mais la conséquence d'un schéma JUSTE devant
        // une question immédiate — et c'est précisément ce qu'on veut que
        // l'élève voie. On l'écarte donc de la vérification, en le disant.
        if (it.meta.quoi === 'distance' && decouper(it.meta.t).length > 1) {
            assert.equal(dit(it.meta.d), false, 'la distance est donnée');
        }
        if (it.meta.quoi === 'vitesse' && decouper(it.meta.t).length > 1) {
            assert.equal(dit(it.meta.v), false, 'la vitesse est donnée');
        }
        // La répétition est là : autant de paquets que d'unités de temps.
        if (it.meta.quoi !== 'duree' && it.meta.t <= 6) {
            const paquets = (svg.match(/<rect/g) || []).length;
            assert.equal(paquets, decouper(it.meta.t).length,
                `${it.meta.t} h devrait faire ${decouper(it.meta.t).length} paquets`);
        }
    }
});

test('LES PAQUETS SONT CE QU\'IL Y A « POUR UN », et le dernier peut être partiel', () => {
    // 1 h 30 à 60 km/h, ce sont un paquet de 60 et un DEMI-paquet de 30 : c'est
    // la façon la plus courte de faire comprendre pourquoi on multiplie par 1,5.
    assert.deepEqual(decouper(3), [1, 1, 1]);
    assert.deepEqual(decouper(1.5), [1, 0.5]);
    assert.deepEqual(decouper(0.25), [0.25]);
    const svg = schemaTauxSvg({
        parUn: { valeur: 60, unite: 'km' }, combien: { valeur: 1.5, unite: 'h' },
        total: { valeur: 90, unite: 'km' }, cherche: 'total', taux: '60 km/h'
    });
    assert.match(svg, /60 km/);
    assert.match(svg, /30 km/, 'le demi-paquet vaut la moitié');
    assert.equal(/90 km/.test(svg), false, 'le total cherché reste inconnu');
});

test('un très grand nombre de paquets s\'abrège au lieu de devenir illisible', () => {
    // Cent centimètres cubes ne se dessinent pas en cent cases : trois, des
    // points de suite, et le compte écrit sous la bande.
    const svg = schemaTauxSvg({
        parUn: { valeur: 7.9, unite: 'g' }, combien: { valeur: 100, unite: 'cm³' },
        total: { valeur: 790, unite: 'g' }, cherche: 'total', taux: '7,9 g/cm³'
    });
    assert.ok((svg.match(/<rect/g) || []).length <= 5, 'trop de cases dessinées');
    assert.match(svg, /100 cm³/);
    assert.match(svg, /…/);
});

test('LES TROIS FORMULES SONT MONTRÉES SANS QU\'ON DÉSIGNE LA BONNE', () => {
    // Choisir la bonne EST l'exercice : la souligner ferait le travail, et le
    // bouton cesserait d'être gratuit.
    assert.equal(FORMULES_VITESSE.length, 3);
    assert.deepEqual(FORMULES_VITESSE.map(f => f.quoi), ['d = v × t', 'v = d ÷ t', 't = d ÷ v']);
    const html = tirer({ chercher: 'vitesse', difficulte: 1 }, 'f1').meta.outils[1].html;
    FORMULES_VITESSE.forEach(f => assert.ok(html.includes(f.quoi), f.quoi));
    // Rien ne distingue l'une des trois — ni classe, ni marque.
    assert.equal(/juste|bonne|surlign|--actif/.test(html), false, html);
});

test('le schéma tient dans son cadre, quelles que soient les valeurs', () => {
    // Une longue valeur ne doit pas sortir du dessin ni déborder sur la case
    // voisine : le corps du texte se règle sur la place, et le SVG déclare sa
    // boîte.
    const svg = schemaTauxSvg({
        parUn: { valeur: 1000, unite: 'km' }, combien: { valeur: 12.5, unite: 'h' },
        total: { valeur: 12500, unite: 'km' }, cherche: 'combien', taux: '1000 km/h'
    });
    assert.match(svg, /viewBox="0 0 330 /);
    assert.match(svg, /12 ?500 km|12500 km/);
    assert.equal(/NaN/.test(svg), false);
    // Aucun texte ne sort du cadre : les x restent dans [0, 330].
    [...svg.matchAll(/<text x="([-0-9.]+)"/g)].forEach(m => {
        const x = Number(m[1]);
        assert.ok(x >= 0 && x <= 330, `texte en x = ${x}`);
    });
});
