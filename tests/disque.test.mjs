// LE DISQUE — la valeur exacte, puis la valeur arrondie.
//
// Deux promesses tiennent tout l'exercice, et aucune ne se voit à l'œil nu :
//
//   · UNE VALEUR EXACTE NE SE TAPE PAS. « 25π » n'est pas un nombre qu'on
//     saisit avec des chiffres. Les quatre premières étapes restent donc en
//     propositions QUOI QU'ON RÈGLE — un exercice qui offrirait le pavé sur
//     ces questions-là serait injouable, et personne ne s'en apercevrait avant
//     un élève bloqué devant son écran.
//   · 3,14 ET LA TOUCHE π DONNENT LE MÊME ARRONDI. Sinon l'exercice compte
//     faux une réponse juste, et l'on ne sait pas laquelle des deux méthodes
//     est en cause.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import {
    MARCHES_DISQUE, ETAPES_EXACTES, PI_COLLEGE, arrondiStable, arrondir, decimalesDe,
    tirerDisque, enonceDe, reponseDe, uniteDe, expliquer, indicesDe, leurresDe,
    figureDisqueSvg, FORMULE_PERIMETRE, FORMULE_AIRE
} from '../js/core/disque.js';
import { disqueGenerator } from '../js/core/generators/disque.js';

const ETAPES = MARCHES_DISQUE.map(m => m.id);

test('3,14 ET LA TOUCHE π DOIVENT TOMBER SUR LE MÊME ARRONDI', () => {
    // Le cas qui a motivé le filtre : un disque de rayon 11. Son aire vaut
    // 379,94 avec 3,14 et 380,13 avec π — au dixième, deux réponses.
    assert.equal(arrondiStable(121, 1), false, 'r = 11 : l’aire diverge au dixième');
    assert.equal(arrondiStable(121, 0), true, 'à l’unité, les deux méthodes s’accordent');

    // Et la garantie sur TOUS les tirages : entre 3,14 et π, la fonction est
    // croissante — si les deux bornes s'accordent, tout ce qu'il y a entre
    // s'accorde aussi. On le vérifie sur quelques valeurs intermédiaires.
    for (const marche of ['perimetre-arrondi', 'aire-arrondie']) {
        for (let k = 0; k < 60; k++) {
            const t = tirerDisque(makeRng(`pi-${marche}-${k}`), marche);
            const dec = decimalesDe(t.surLAire);
            [PI_COLLEGE, 3.1416, 3.14159, Math.PI].forEach(pi => {
                assert.equal(arrondir(t.coefficient * pi, dec), t.arrondi,
                    `${marche} r=${t.r} : π ≈ ${pi} donne un autre arrondi`);
            });
        }
    }
});

test('LE PÉRIMÈTRE S\'ARRONDIT AU DIXIÈME, L\'AIRE À L\'UNITÉ', () => {
    // Mesuré : au dixième, l'arrondi de l'aire n'est stable que pour trois
    // rayons sur dix — il ne resterait presque aucune variété. À l'unité, dix
    // sur dix. C'est aussi l'usage : « 380 cm² » se lit, « 380,1 cm² » affiche
    // une précision que la mesure n'a pas.
    assert.equal(decimalesDe(false), 1);
    assert.equal(decimalesDe(true), 0);
    const rayons = new Set();
    for (let k = 0; k < 80; k++) rayons.add(tirerDisque(makeRng(`v${k}`), 'aire-arrondie').r);
    assert.ok(rayons.size >= 6, `seulement ${rayons.size} rayons différents sur l’aire arrondie`);
});

test('UNE VALEUR EXACTE NE SE TAPE PAS : ces étapes restent en propositions', () => {
    const total = ETAPES.length;
    // Même en demandant la saisie partout, les quatre premières étapes
    // proposent : ce n'est pas un choix pédagogique qu'on retire au
    // professeur, c'est qu'aucun clavier de chiffres n'écrit π.
    const params = {
        reponseParMarche: ETAPES.map(id => `${id}:saisie`).join(',')
    };
    const genres = {};
    for (let i = 0; i < total; i++) {
        const it = disqueGenerator.generate(params, { index: i, total, rng: makeRng(`x${i}`) });
        genres[it.meta.marche] = it.answerKind;
        if (ETAPES_EXACTES.includes(it.meta.marche)) {
            assert.equal(it.answerKind, 'choice', `${it.meta.marche} : le pavé ne sait pas écrire π`);
            assert.equal(typeof it.answer, 'string');
            assert.equal(it.choices.length, 4);
        } else {
            assert.equal(it.answerKind, 'numeric', `${it.meta.marche} : la saisie doit être respectée`);
            assert.equal(typeof it.answer, 'number');
        }
    }
    assert.deepEqual(Object.keys(genres).sort(), [...ETAPES].sort());
});

test('et les étapes arrondies obéissent au réglage', () => {
    const total = ETAPES.length;
    const params = { reponseParMarche: 'perimetre-arrondi:choix,aire-arrondie:choix' };
    for (let i = 0; i < total; i++) {
        const it = disqueGenerator.generate(params, { index: i, total, rng: makeRng(`y${i}`) });
        assert.equal(it.answerKind, 'choice', `${it.meta.marche}`);
        assert.equal(it.choices.filter(c => c.correct).length, 1);
    }
});

test('LES FORMULES NE SE CONFONDENT PAS', () => {
    for (let k = 0; k < 40; k++) {
        const t = tirerDisque(makeRng(`f${k}`), 'formule');
        const juste = reponseDe(t);
        assert.equal(juste, t.surLAire ? FORMULE_AIRE : FORMULE_PERIMETRE);
        // L'autre formule est toujours proposée : c'est LA confusion à lever.
        const autre = t.surLAire ? FORMULE_PERIMETRE : FORMULE_AIRE;
        assert.ok(leurresDe(t).some(l => l.value === autre),
            'la formule de l’autre grandeur doit figurer parmi les propositions');
    }
    // Et les deux questions tombent : ne poser que le périmètre ferait une
    // question à retenir une fois, pas à distinguer.
    const vues = new Set();
    for (let k = 0; k < 40; k++) vues.add(tirerDisque(makeRng(`fa${k}`), 'formule').surLAire);
    assert.equal(vues.size, 2, 'l’étape « quelle formule ? » doit alterner aire et périmètre');
});

test('LE DIAMÈTRE EST LE PIÈGE, ET IL EST POSÉ COMME TEL', () => {
    for (let k = 0; k < 40; k++) {
        const t = tirerDisque(makeRng(`d${k}`), 'diametre');
        assert.equal(t.d, 2 * t.r, 'le diamètre vaut deux rayons');
        assert.equal(enonceDe(t).includes(`diamètre de ${t.d}`), true, enonceDe(t));
        assert.equal(enonceDe(t).includes(`rayon`), false, 'l’énoncé ne doit pas donner le rayon');
        assert.equal(reponseDe(t), t.exact);
        // L'erreur « j'ai pris le diamètre pour le rayon » est proposée.
        assert.ok(leurresDe(t).some(l => String(l.value).startsWith(`${t.d * t.d}π`)),
            'le piège du diamètre doit figurer parmi les propositions');
        // La figure montre le diamètre, pas le rayon : sinon la question
        // n'aurait plus de difficulté.
        const svg = figureDisqueSvg(t);
        assert.ok(svg.includes(`${t.d} cm`), 'la figure doit porter le diamètre');
        assert.ok(!svg.includes(`>${t.r} cm<`), 'la figure ne doit pas donner le rayon');
    }
});

test('l\'unité suit la grandeur', () => {
    for (const marche of ETAPES) {
        for (let k = 0; k < 20; k++) {
            const t = tirerDisque(makeRng(`u-${marche}-${k}`), marche);
            const u = uniteDe(t);
            if (ETAPES_EXACTES.includes(marche)) {
                assert.equal(u, '', 'une valeur exacte porte déjà son unité');
                if (marche !== 'formule') {
                    assert.ok(t.exact.endsWith(t.surLAire ? 'cm²' : 'cm'), t.exact);
                }
            } else {
                assert.equal(u, t.surLAire ? 'cm²' : 'cm');
            }
        }
    }
});

test('l\'explication porte la réponse, et les indices ne la donnent pas', () => {
    for (const marche of ETAPES) {
        for (let k = 0; k < 20; k++) {
            const t = tirerDisque(makeRng(`e-${marche}-${k}`), marche);
            const dit = expliquer(t);
            assert.ok(dit.length <= 220, `${marche} : ${dit.length} caractères`);
            if (marche !== 'formule') {
                const attendu = ETAPES_EXACTES.includes(marche)
                    ? t.exact.split(' ')[0] : String(t.arrondi).replace('.', ',');
                assert.ok(dit.includes(attendu), `${marche} : ${attendu} absent de « ${dit} »`);
            }
            const indices = indicesDe(t);
            assert.equal(indices.length, 3, `${marche} : ${indices.length} indices`);
            indices.forEach(h => assert.ok(h.length < 110, `${marche} : indice trop long — ${h}`));
        }
    }
});

test('LES FAUSSES RÉPONSES SONT TOUTES DIFFÉRENTES, ET AUCUNE N\'EST LA BONNE', () => {
    for (const marche of ETAPES) {
        for (let k = 0; k < 40; k++) {
            const t = tirerDisque(makeRng(`l-${marche}-${k}`), marche);
            const juste = String(reponseDe(t));
            const leurres = leurresDe(t);
            assert.ok(leurres.length >= 3, `${marche} : ${leurres.length} leurre(s)`);
            const vus = new Set();
            leurres.forEach(l => {
                const cle = String(l.value);
                assert.notEqual(cle, juste, `${marche} : un leurre vaut la bonne réponse`);
                assert.equal(vus.has(cle), false, `${marche} : leurre en double « ${cle} »`);
                vus.add(cle);
                assert.ok(l.why && l.why.length > 15, `${marche} : leurre sans explication`);
            });
        }
    }
});

test('CHAQUE ÉTAPE COCHÉE EST JOUÉE, et la figure part avec la question', () => {
    const total = ETAPES.length;
    const vues = new Set();
    for (let i = 0; i < total; i++) {
        const it = disqueGenerator.generate({}, { index: i, total, rng: makeRng(`g${i}`) });
        vues.add(it.meta.marche);
        assert.ok(it.prompt.html.includes('<svg'), 'la question doit porter sa figure');
        assert.ok(['mes.perimetre.disque', 'mes.aire.disque'].includes(it.skillId));
    }
    assert.deepEqual([...vues].sort(), [...ETAPES].sort());
});
