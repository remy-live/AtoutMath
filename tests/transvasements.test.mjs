// LES TRANSVASEMENTS — 29 octobre.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « j'aime bien les transvasements […] il faudra faire du drag drop
// plutôt ».
//
// CE QUE CETTE ÉPREUVE GARDE :
//
//   · AUCUNE ÉNIGME SERVIE N'EST IMPOSSIBLE. C'est la garde la plus importante
//     du fichier : un élève qui cherche pendant dix minutes ce qui n'existe
//     pas n'apprend rien, il abandonne.
//   · CE QU'ON PEUT MESURER, CE SONT LES MULTIPLES DU PGCD. C'est le théorème
//     qui est derrière tout le jeu, et c'est ce que l'élève rencontrera au
//     quatrième sous le nom de Bézout. Si le code s'en écartait, le jeu
//     enseignerait une fausse frontière.
//   · UN VERSEMENT S'ARRÊTE QUAND L'UN EST VIDE OU L'AUTRE PLEIN. Pas de
//     demi-mesure : c'est ce qui fait de ce jeu de l'arithmétique et non de
//     l'adresse.
//   · ET AU NIVEAU 3, RIEN NE SE PERD. Sans robinet ni évier, la somme des
//     bidons ne change jamais — un geste qui en ferait disparaître changerait
//     le problème sans le dire.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import '../js/core/activities/index.js';
import { exercices } from '../js/data/catalog.js';
import { getGenerator } from '../js/core/registry.js';
import { makeRng } from '../js/core/ids.js';
import {
    NIVEAUX, appliquer, atteint, depart, gestes, mesurables, pgcd, resoudre, tirerEnigme
} from '../js/core/transvasements.js';

const ID = 'logi-transvasements';

test('AUCUNE ÉNIGME SERVIE N\'EST IMPOSSIBLE', () => {
    for (const niveau of [1, 2, 3]) {
        for (let i = 0; i < 25; i++) {
            const e = tirerEnigme(makeRng(`e${niveau}-${i}`), niveau, i);
            const route = resoudre(e.caps, e.cible, e.famille);
            assert.ok(route, `${e.caps.join('/')} → ${e.cible} n'a pas de solution`);
            assert.equal(route.length, e.minimum,
                `${e.caps.join('/')} → ${e.cible} : ${route.length} coups, ${e.minimum} annoncés`);
            // ON NE SERT PAS UNE CIBLE QUI EST UNE CAPACITÉ : il suffirait de
            // remplir le bidon, et ce ne serait plus une énigme.
            assert.ok(!e.caps.includes(e.cible),
                `la cible ${e.cible} est la capacité d'un bidon`);
            assert.ok(e.minimum >= 3, `${e.minimum} gestes seulement : trop facile`);
            // Et la suite de gestes mène VRAIMENT à la cible, geste après geste.
            let etat = e.depart.slice();
            for (const g of route) {
                const suite = appliquer(etat, e.caps, e.famille, g.quoi, g.de, g.vers);
                assert.ok(suite, `le geste ${g.quoi} n'est pas permis en cours de route`);
                etat = suite;
            }
            assert.ok(atteint(etat, e.cible), 'la solution n\'atteint pas la cible');
        }
    }
});

test('CE QU\'ON PEUT MESURER, CE SONT LES MULTIPLES DU PGCD', () => {
    // LE THÉORÈME EST DERRIÈRE TOUT LE JEU. Avec 5 L et 3 L on obtient tout ;
    // avec 6 L et 4 L on n'obtiendra jamais 3 L, et l'on peut verser une heure.
    // C'est Bézout, que l'élève rencontrera au quatrième — ici il le voit.
    for (const [a, b] of [[5, 3], [6, 4], [9, 6], [8, 3], [12, 8], [10, 4]]) {
        const d = pgcd(a, b);
        const vus = mesurables([a, b], 'robinet');
        const attendus = [];
        for (let v = 0; v <= Math.max(a, b); v += d) attendus.push(v);
        assert.deepEqual(vus, attendus,
            `${a}/${b} : on mesure ${vus.join(' ')} au lieu des multiples de ${d}`);
    }
    // Et la frontière se voit : 3 L n'est PAS atteignable avec 6 L et 4 L.
    assert.equal(resoudre([6, 4], 3, 'robinet'), null,
        '3 L sort de bidons de 6 L et 4 L — le PGCD vaut pourtant 2');
});

test('UN VERSEMENT S\'ARRÊTE QUAND L\'UN EST VIDE OU L\'AUTRE PLEIN', () => {
    const caps = [7, 4];
    // Sept litres versés dans un bidon de quatre : il en reste trois.
    assert.deepEqual(appliquer([7, 0], caps, 'robinet', 'verser', 0, 1), [3, 4]);
    // Deux litres versés dans un bidon vide de quatre : tout passe.
    assert.deepEqual(appliquer([2, 0], caps, 'robinet', 'verser', 0, 1), [0, 2]);
    // ET RIEN NE SE CRÉE NI NE SE PERD dans un versement, jamais.
    for (const etat of [[7, 0], [3, 2], [0, 4], [5, 1]]) {
        for (const g of gestes(etat, caps, 'robinet')) {
            if (g.quoi !== 'verser') continue;
            assert.equal(g.etat[0] + g.etat[1], etat[0] + etat[1],
                `un versement depuis ${etat.join('/')} change le total`);
            assert.ok(g.etat.every((v, i) => v >= 0 && v <= caps[i]),
                'un versement déborde ou passe sous zéro');
            assert.ok(g.etat[g.de] === 0 || g.etat[g.vers] === caps[g.vers],
                'un versement s\'arrête avant que l\'un soit vide ou l\'autre plein');
        }
    }
});

test('AU NIVEAU 3, RIEN N\'ENTRE ET RIEN NE SORT', () => {
    for (const caps of NIVEAUX[3].triples) {
        const total = caps[0];
        // Aucun geste de remplissage ni de vidage n'est seulement PROPOSÉ.
        const d = depart(caps, 'partage');
        assert.deepEqual(d, [caps[0], 0, 0], 'le grand bidon n\'est pas plein au départ');
        const vus = new Set([d.join(',')]);
        let file = [d];
        while (file.length) {
            const suivante = [];
            for (const etat of file) {
                assert.equal(etat.reduce((x, y) => x + y, 0), total,
                    `${caps.join('/')} : l'état ${etat.join('/')} ne fait plus ${total} L`);
                for (const g of gestes(etat, caps, 'partage')) {
                    assert.equal(g.quoi, 'verser',
                        `${caps.join('/')} : le geste « ${g.quoi} » existe sans robinet`);
                    const k = g.etat.join(',');
                    if (vus.has(k)) continue;
                    vus.add(k);
                    suivante.push(g.etat);
                }
            }
            file = suivante;
        }
    }
});

test('LE NIVEAU 1 NE SERT QUE DES BIDONS PREMIERS ENTRE EUX', () => {
    // CE QUE CETTE GARDE PROTÈGE : qu'un élève qui ouvre le jeu pour la
    // première fois ne tombe jamais sur une cible impossible. Au niveau 1 le
    // PGCD vaut 1, donc TOUTE cible entière existe ; les frontières sont le
    // sujet du niveau 2, et on les y garde exprès.
    for (const [a, b] of NIVEAUX[1].paires) {
        assert.equal(pgcd(a, b), 1, `${a} et ${b} ne sont pas premiers entre eux`);
        assert.ok(a > b, `${a}/${b} : le grand bidon n'est pas en premier`);
    }
    // Et le niveau 2 en sert au moins une dont le PGCD dépasse 1, sinon il ne
    // se distingue du niveau 1 que par la taille des nombres.
    assert.ok(NIVEAUX[2].paires.some(([a, b]) => pgcd(a, b) > 1),
        'le niveau 2 ne sert aucune frontière');
});

test('ET DEUX ÉNIGMES DE SUITE NE SE RESSEMBLENT PAS', () => {
    // Mesuré sur la fiche imprimée : deux énigmes tirées au sort sur une liste
    // de six donnaient DEUX FOIS « 5 L et 2 L » côte à côte. Une feuille qui
    // pose deux fois la même question ne se fait qu'une fois.
    for (const niveau of [1, 2, 3]) {
        for (let i = 0; i < 10; i++) {
            const a = tirerEnigme(makeRng(`d${niveau}${i}`), niveau, i);
            const b = tirerEnigme(makeRng(`d${niveau}${i}`), niveau, i + 1);
            assert.notDeepEqual([a.caps, a.cible], [b.caps, b.cible],
                `niveau ${niveau}, rang ${i} : deux énigmes de suite sont identiques`);
        }
    }
});

test('LES TRANSVASEMENTS SONT AU CATALOGUE, AVEC LEUR ÉCRAN ET LEUR PAPIER', () => {
    const exo = exercices.find(e => e.id === ID);
    assert.ok(exo, 'les transvasements ont disparu du catalogue');
    assert.equal(exo.activityId, 'transvasements');
    assert.ok(exo.printable, 'les transvasements ne s\'impriment pas');
    assert.equal(exo.params.niveau, '1', 'le jeu n\'ouvre pas sur le niveau le plus facile');
    assert.ok(exo.instruction && exo.instruction.length > 120,
        'pas d\'explication de la règle dans la fiche');
});

test('ET LA RÉPONSE ATTENDUE EST CELLE QUE L\'ÉCRAN ENVERRA', () => {
    const exo = exercices.find(e => e.id === ID);
    const gen = getGenerator(exo.generatorId);
    for (const niveau of ['1', '2', '3']) {
        for (let i = 0; i < 4; i++) {
            const it = gen.generate({ niveau }, { rng: makeRng(`q${niveau}${i}`), index: i });
            assert.equal(it.answer, String(it.meta.cible));
            assert.equal(it.meta.caps.length, niveau === '3' ? 3 : 2);
            assert.ok(it.hints.length >= 3, 'moins de trois indices');
            assert.ok(it.meta.noms.length === it.meta.caps.length,
                'il manque un nom de bidon');
        }
    }
});

test('ET LES TRANSVASEMENTS SE FABRIQUENT SANS SE FAIRE ATTENDRE', () => {
    const t = performance.now();
    for (const niveau of [1, 2, 3]) {
        for (let i = 0; i < 20; i++) tirerEnigme(makeRng(`v${niveau}${i}`), niveau, i);
    }
    const dt = Math.round(performance.now() - t);
    // Une marge franche : soixante tirages tiennent en une vingtaine de
    // millisecondes, et une épreuve de durée à 1 % de marge clignote sous
    // charge — leçon du 28 octobre.
    assert.ok(dt < 3000, `${dt} ms pour soixante tirages`);
});
