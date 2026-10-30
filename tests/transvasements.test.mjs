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

test('ET UNE FEUILLE NE POSE JAMAIS DEUX FOIS LA MÊME ÉNIGME', () => {
    // CETTE ÉPREUVE A DÉJÀ MENTI UNE FOIS, et c'est pour cela qu'elle est
    // écrite ainsi. La version d'avant tirait les deux énigmes AVEC LA MÊME
    // GRAINE et ne changeait que le rang : elle restait verte pendant que la
    // vraie feuille — qui tire UNE GRAINE PAR BLOC — répétait une quantité sur
    // 82 % des pages, et servait « 5/3 → 4 » DEUX FOIS sur la même.
    //
    // On emprunte donc le chemin de la feuille : le générateur, une graine par
    // bloc, et `themesExclus` rempli comme `printSheet` le remplit.
    const gen = getGenerator(exercices.find(e => e.id === ID).generatorId);
    const feuille = (f, n, niveau) => {
        const items = [];
        for (let i = 0; i < n; i++) {
            items.push(gen.generate({ niveau }, {
                rng: makeRng(`f${f}-${i}`), index: items.length, total: n, papier: true,
                themesExclus: items.map(it => it.meta && it.meta.theme).filter(Boolean)
            }));
        }
        return items.map(it => `${it.meta.caps.join('/')}→${it.meta.cible}`);
    };
    for (const niveau of ['1', '2', '3']) {
        for (let f = 0; f < 40; f++) {
            for (const n of [4, 6]) {
                const l = feuille(f, n, niveau);
                assert.equal(new Set(l).size, l.length,
                    `niveau ${niveau}, feuille ${f} : ${l.join('  ')}`);
                // ET LES BIDONS EUX-MÊMES DIFFÈRENT : deux blocs qui montrent
                // le même dessin se lisent comme une erreur d'impression,
                // même si la quantité demandée change.
                const bidons = l.map(x => x.split('→')[0]);
                assert.equal(new Set(bidons).size, bidons.length,
                    `niveau ${niveau}, feuille ${f} : les mêmes bidons deux fois — `
                        + l.join('  '));
            }
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

test('LA PREMIÈRE ÉNIGME DU NIVEAU 1 EST LA PLUS CÉLÈBRE', () => {
    // RÉMY, 29 octobre : « Tu as mis aussi l'énigme comment faire 4 litres avec
    // un seau de 3 et un seau de 5 litres ». Elle y était — et elle sortait UNE
    // FOIS SUR DOUZE, mesuré sur soixante tirages. Pour n'importe quelle autre,
    // ce serait bien ; pour celle-là, non.
    //
    // ON NE VÉRIFIE PAS SEULEMENT LES BIDONS ET LA CIBLE : on vérifie aussi que
    // la solution fait bien SIX gestes, parce que ce nombre n'est écrit nulle
    // part — il est calculé. Une ouverture dont on aurait codé la réponse à la
    // main serait la seule énigme du fichier que rien ne contrôle.
    for (const graine of ['a', 'b', 'c', 'd', 'e', 'f']) {
        const e = tirerEnigme(makeRng(graine), 1, 0);
        assert.deepEqual(e.caps, [5, 3], `graine ${graine} : l'ouverture n'est pas 5 / 3`);
        assert.equal(e.cible, 4, `graine ${graine} : l'ouverture ne demande pas 4 L`);
        assert.equal(e.minimum, 6, `l'ouverture se fait en ${e.minimum} gestes, pas six`);
        assert.deepEqual(e.depart, [0, 0], 'l\'ouverture ne part pas de deux bidons vides');
    }
    // ET LA ROTATION REPREND ENSUITE : si le rang 1 servait lui aussi la même,
    // le jeu n'aurait plus qu'une énigme.
    const vus = new Set();
    for (let i = 0; i < 20; i++) {
        const e = tirerEnigme(makeRng(`suite${i}`), 1, 1);
        vus.add(`${e.caps.join('/')}→${e.cible}`);
    }
    assert.ok(vus.size >= 4,
        `au rang 1, seulement ${vus.size} énigme(s) différente(s) : ${[...vus].join(' ')}`);
    // Les niveaux 2 et 3 n'ont pas d'ouverture imposée : ils s'adressent à qui
    // a déjà vu la célèbre.
    assert.ok(!NIVEAUX[2].ouverture && !NIVEAUX[3].ouverture,
        'un niveau au-delà du premier impose une énigme d\'ouverture');
});

test('AUCUNE FAMILLE DE BIDONS NE DORT DANS LA LISTE', () => {
    // CE DÉFAUT A VÉCU UNE VERSION ENTIÈRE SANS QUE RIEN NE LE DISE. Le niveau
    // 2 annonçait six familles de bidons ; deux d'entre elles — 9 L / 6 L et
    // 12 L / 8 L — ne portaient AUCUNE énigme, parce que leur unique cible
    // possible s'obtient en deux gestes et que le jeu en exige trois. Elles
    // n'étaient donc jamais servies : le niveau tournait sur quatre familles,
    // et une feuille de six blocs devait en répéter.
    //
    // Une liste trop courte ne se voit pas en la lisant — il faut COMPTER les
    // énigmes de chaque ligne. C'est ce que fait cette garde.
    for (const [niveau, def] of Object.entries(NIVEAUX)) {
        const liste = def.famille === 'partage' ? def.triples : def.paires;
        for (const caps of liste) {
            const combien = mesurables(caps, def.famille)
                .filter(v => v > 0 && !caps.includes(v))
                .filter(cible => {
                    const route = resoudre(caps, cible, def.famille);
                    return route && route.length >= 3;
                }).length;
            assert.ok(combien >= 1,
                `niveau ${niveau} : ${caps.join(' / ')} ne porte aucune énigme — `
                    + 'la famille est dans la liste et ne sort jamais');
        }
        // ET IL Y EN A ASSEZ POUR UNE FEUILLE DE SIX BLOCS, sans quoi deux
        // blocs montrent forcément les mêmes bidons.
        assert.ok(liste.length >= 6,
            `niveau ${niveau} : ${liste.length} familles seulement, une feuille `
                + 'de six blocs en répétera');
        // ET LES BIDONS SE DESSINENT : la hauteur d'un bidon suit sa capacité,
        // et quinze litres font 416 px sur un téléphone — la moitié de l'écran
        // pour un seul bidon. Douze est le plafond tenu par les trois niveaux.
        for (const caps of liste) {
            assert.ok(Math.max(...caps) <= 12,
                `niveau ${niveau} : ${caps.join(' / ')} déborde l'écran d'un téléphone`);
        }
    }
});

test('ET ELLE NE REDEMANDE PRESQUE JAMAIS LA MÊME QUANTITÉ', () => {
    // DEUX GÊNES DISTINCTES, DEUX GARDES. L'épreuve précédente interdit deux
    // fois les MÊMES BIDONS ; celle-ci surveille la QUANTITÉ demandée, qui
    // peut se répéter d'un bloc à l'autre avec des bidons différents. Rémy
    // l'avait signalé pour « il faut 1 L », servi deux fois sur une feuille.
    //
    // ON NE L'INTERDIT PAS : une feuille longue finit par épuiser les cinq ou
    // six quantités qu'une famille de bidons permet, et refuser la dernière
    // rendrait l'énigme impossible. On MESURE donc, et le code choisit la
    // quantité par rotation en sautant celles que la feuille a déjà posées.
    // Mesuré : 90 % des feuilles de quatre posent quatre quantités
    // différentes, contre 33 % quand la cible se tirait au sort.
    const gen = getGenerator(exercices.find(e => e.id === ID).generatorId);
    let toutesDifferentes = 0;
    const feuilles = 200;
    for (let f = 0; f < feuilles; f++) {
        const items = [];
        for (let i = 0; i < 4; i++) {
            items.push(gen.generate({ niveau: '1' }, {
                rng: makeRng(`c${f}-${i}`), index: items.length, total: 4, papier: true,
                themesExclus: items.map(it => it.meta && it.meta.theme).filter(Boolean)
            }));
        }
        const cibles = items.map(it => it.meta.cible);
        if (new Set(cibles).size === cibles.length) toutesDifferentes++;
    }
    const part = Math.round(toutesDifferentes / feuilles * 100);
    // Une marge franche sous les 90 % mesurés : une garde posée au ras de la
    // mesure clignote au premier changement de liste — leçon du 28 octobre.
    assert.ok(part >= 75,
        `seules ${part} % des feuilles posent quatre quantités différentes`);
});
