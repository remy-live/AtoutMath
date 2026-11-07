// LIRE LA FRACTION D'UNE FIGURE — ce qui doit tenir pour qu'on puisse la lire.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY : « on a même pas fait d'exercice de fraction où il faut écrire la
// fraction en fonction d'un camembert, pavage et avec la difficulté que
// parfois les parts ne sont pas identiques et que du coup, on sépare
// mentalement et en indice on peut voir la découpe ».
//
// DEUX CHOSES SE GARDENT ICI, ET ELLES SONT DE NATURES DIFFÉRENTES.
//
// LA PREMIÈRE EST DE L'ARITHMÉTIQUE : la figure doit valoir UN. C'est le tout
// dont on prend une fraction ; s'il lui manque un morceau, la question n'a
// pas de réponse. Le premier pavage écrit ici SORTAIT TROUÉ — les morceaux se
// posaient à la file et passaient à la ligne quand le suivant ne tenait plus.
// Vu sur la planche de contact, invisible dans le code : le SVG était bien
// formé, avec le bon nombre de rectangles.
//
// LA SECONDE EST DE LA DIDACTIQUE : la fraction doit être IRRÉDUCTIBLE. Si la
// figure montrait 6 parts dont 3 coloriées, « 1/2 » serait une réponse JUSTE
// que la grille compterait fausse — la comparaison des réponses ne sait pas
// accepter deux écritures. On ne punit personne pour avoir simplifié.

import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../js/core/ids.js';
import {
    pgcd, numerateursPossibles, decouper, choisirPleins, colonnesPour,
    camembertSvg, pavageSvg, question, ETAPES, lireUneFractionGenerator, TEINTES_FIGURE
} from '../js/core/generators/lireUneFraction.js';
import '../js/core/activities/index.js';
import { exercices } from '../js/data/catalog.js';

const marche = (id) => ETAPES.find(e => e.id === id);
const unItem = (id, g = 'g') => lireUneFractionGenerator.generate(
    { marches: [id] }, { rng: makeRng(`${id}-${g}`), index: 0, total: 1 });

test('LA FIGURE VAUT TOUJOURS UN, ET LES COLORIÉES FONT LE NUMÉRATEUR', () => {
    // SANS CELA LA QUESTION N'A PAS DE RÉPONSE : une figure à qui il manque un
    // morceau n'est plus le tout dont on prend une fraction.
    for (const e of ETAPES) {
        for (let g = 0; g < 30; g++) {
            const q = question(e, makeRng(`un-${e.id}-${g}`));
            const total = q.morceaux.reduce((s, m) => s + m.poids, 0);
            assert.equal(total, q.n,
                `${e.id} : les morceaux font ${total} pour un tout de ${q.n}`);
            const pleins = q.morceaux.filter(m => m.plein).reduce((s, m) => s + m.poids, 0);
            assert.equal(pleins, q.k,
                `${e.id} : ${pleins} parts coloriées pour une réponse de ${q.k}`);
        }
    }
});

test('LA FRACTION EST TOUJOURS IRRÉDUCTIBLE', () => {
    // « 3/6 » ferait écrire « 1/2 » à un élève qui a raison, et la grille le
    // compterait faux. On choisit donc toujours un numérateur premier avec le
    // dénominateur : une seule écriture possible.
    for (const e of ETAPES) {
        for (let g = 0; g < 30; g++) {
            const q = question(e, makeRng(`irr-${e.id}-${g}`));
            assert.equal(pgcd(q.k, q.n), 1, `${e.id} : ${q.k}/${q.n} se simplifie`);
            assert.ok(q.k >= 1 && q.k < q.n, `${e.id} : ${q.k}/${q.n} n'est pas une part du tout`);
        }
    }
});

test('UN PAVAGE PAVE : NI TROU, NI DÉBORDEMENT', () => {
    // LE DÉFAUT QUE LA PLANCHE DE CONTACT A DIT. On recompose la grille case
    // par case : chaque case doit être couverte UNE fois, exactement.
    const rng = makeRng('pave');
    for (const n of [4, 6, 8, 9, 10, 12]) {
        for (const inegal of [false, true]) {
            const k = numerateursPossibles(n)[0];
            const colonnes = colonnesPour(n);
            const morceaux = decouper(n, k, rng, inegal, colonnes);
            const svg = pavageSvg(morceaux, n);
            const cases = new Map();
            for (const r of svg.matchAll(
                /<rect x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)"/g)) {
                const [x, y, w] = [Number(r[1]) / 34, Number(r[2]) / 34, Number(r[3]) / 34];
                for (let i = 0; i < w; i++) {
                    const clef = `${x + i},${y}`;
                    assert.ok(!cases.has(clef), `n=${n} : deux morceaux se chevauchent en ${clef}`);
                    cases.set(clef, true);
                }
            }
            assert.equal(cases.size, n, `n=${n} : ${cases.size} cases couvertes sur ${n}`);
            for (let y = 0; y < n / colonnes; y++) {
                for (let x = 0; x < colonnes; x++) {
                    assert.ok(cases.has(`${x},${y}`), `n=${n} : la case (${x}, ${y}) est un TROU`);
                }
            }
        }
    }
});

test('UNE MARCHE « PARTS INÉGALES » EST VRAIMENT INÉGALE', () => {
    // UNE FIGURE INÉGALE QUI SORT TOUTE ÉGALE N'ENSEIGNE RIEN : c'est le sujet
    // de la marche, pas un bonus. Et le nombre de MORCEAUX doit alors être
    // plus petit que le nombre de PARTS — sans quoi compter les morceaux
    // donnerait la bonne réponse, et le piège n'existerait pas.
    for (const id of ['camembert-inegal', 'pavage-inegal', 'melange-inegal']) {
        let piegees = 0;
        for (let g = 0; g < 30; g++) {
            const q = question(marche(id), makeRng(`ineg-${id}-${g}`));
            assert.ok(new Set(q.morceaux.map(m => m.poids)).size >= 2,
                `${id} : tous les morceaux font la même taille`);
            if (q.visibles < q.n) piegees++;
        }
        assert.equal(piegees, 30, `${id} : ${30 - piegees} figure(s) se comptent au morceau`);
    }
});

test('LE SECOND INDICE DESSINE TOUJOURS — ET JAMAIS LA MÊME FIGURE', () => {
    // RÉMY : « pour l'indice, dessine les traits de séparation ».
    //
    // MESURÉ AVANT, dans un navigateur, sur les deux familles de marches : aux
    // parts INÉGALES le second indice redécoupait déjà la figure, et aux parts
    // ÉGALES il ne montrait RIEN. Or les trois premières marches sont les
    // marches égales : c'est celles-là qu'on voit en ouvrant l'exercice.
    //
    // ET LA RÈGLE D'AVANT TIENT TOUJOURS, c'est elle qu'on garde ici : un
    // indice qui remontre la MÊME figure en promettant du neuf est pire que
    // pas d'indice. Ce qu'on exige n'est donc pas « un dessin », c'est un
    // dessin DIFFÉRENT de celui de la question — pointillés quand il y a à
    // redécouper, numéros quand il n'y a plus qu'à compter.
    for (const e of ETAPES) {
        const it = unItem(e.id, 'indice');
        const dessin = (it.schemas || [])[1] || '';
        assert.equal((it.schemas || [])[0], '', `${e.id} : le premier indice porte un dessin`);
        assert.match(dessin, /^<svg /, `${e.id} : le second indice ne dessine rien`);
        assert.notEqual(dessin, it.prompt.html.match(/<svg [\s\S]*?<\/svg>/)[0],
            `${e.id} : l'indice remontre EXACTEMENT la figure de la question`);
        if (e.inegal) {
            assert.ok(dessin.includes('stroke-dasharray'),
                `${e.id} : la découpe n'a aucun trait en pointillés`);
        } else {
            // Rien à redécouper : pas de pointillé, mais les parts numérotées
            // de 1 au dénominateur.
            assert.ok(!dessin.includes('stroke-dasharray'),
                `${e.id} : des pointillés sur une figure déjà coupée en parts égales`);
            const numeros = [...dessin.matchAll(/paint-order="stroke">(\d+)</g)].map(m => +m[1]);
            assert.deepEqual(numeros, Array.from({ length: it.meta.n }, (_, i) => i + 1),
                `${e.id} : les parts ne sont pas numérotées de 1 à ${it.meta.n}`);
        }
    }
});

test('LA TEINTE DE LA FIGURE CHANGE, ET NE CHANGE PAS ENTRE DEUX RENDUS', () => {
    // RÉMY : « Pour Lis la fraction, n'hésite pas à changer de couleur. »
    // Elle valait `var(--primary)` sur toutes les figures.
    const teintes = new Set();
    for (let g = 0; g < 40; g++) {
        const q = question(marche('melange-egal'), makeRng(`teinte-${g}`));
        assert.ok(TEINTES_FIGURE.includes(q.teinte), `teinte inconnue : ${q.teinte}`);
        assert.ok(q.figure.includes(q.teinte), 'la figure ne porte pas sa teinte');
        assert.ok(!q.figure.includes('var(--primary)'),
            'la figure est encore peinte de la couleur de l\'application');
        teintes.add(q.teinte);
    }
    assert.ok(teintes.size >= 4, `${teintes.size} teinte(s) sur 40 tirages`);

    // ET LA MÊME QUESTION REDONNE LA MÊME TEINTE : la fiche dessine l'aperçu
    // puis le PDF puis la page des solutions, et ce doit être la même figure.
    const a = question(marche('camembert-egal'), makeRng('stable'));
    const b = question(marche('camembert-egal'), makeRng('stable'));
    assert.equal(a.teinte, b.teinte, 'deux tirages de la même graine changent de teinte');
});

test('LE PIÈGE DU COMPTAGE DE MORCEAUX A UN NOM', () => {
    // LUI DIRE « FAUX » NE LUI APPREND RIEN. Sur une figure inégale, compter
    // les morceaux est l'erreur de presque tout le monde la première fois :
    // le diagnostic doit la nommer, pas la constater.
    const it = unItem('camembert-inegal', 'piege');
    const d = it.diagnostics || [];
    assert.equal(d.length, 1, 'aucun diagnostic sur une figure inégale');
    assert.equal(d[0].value.split('|')[1], String(it.meta.visibles),
        'le piège ne propose pas le nombre de MORCEAUX comme dénominateur');
    assert.notEqual(d[0].value, it.answer, 'le piège EST la bonne réponse');
    assert.match(d[0].why, /MORCEAUX/, 'le diagnostic ne nomme pas la confusion');
    // ET PAS DE DIAGNOSTIC LÀ OÙ IL N'Y A PAS DE PIÈGE : aux parts égales,
    // compter les morceaux EST la bonne méthode.
    assert.equal(unItem('camembert-egal', 'piege').diagnostics, null);
});

test('LA RÉPONSE EST UNE PAIRE RANGÉE, ET LA FIGURE EST DANS L\'ÉNONCÉ', () => {
    for (const e of ETAPES) {
        const it = unItem(e.id, 'forme');
        assert.equal(it.answerKind, 'text', `${e.id} : la réponse n'est pas une paire`);
        assert.equal(it.meta.trous, 2, `${e.id} : le pavé n'aura pas deux trous`);
        assert.match(it.answer, /^\d+\|\d+$/, `${e.id} : réponse « ${it.answer} »`);
        assert.equal(it.answer, `${it.meta.k}|${it.meta.n}`);
        // LA FIGURE EST L'ÉNONCÉ : sans elle, la question ne demande rien.
        assert.ok(it.prompt.html.includes('lf-figure'), `${e.id} : pas de figure à l'écran`);
        assert.equal((it.prompt.html.match(/data-trou/g) || []).length, 2,
            `${e.id} : il n'y a pas deux trous à remplir`);
    }
});

test('AUCUN SECTEUR NE SORT DU DISQUE, AUCUNE CASE DU CADRE', () => {
    const rng = makeRng('cadre');
    for (const n of [4, 6, 8, 9, 10, 12]) {
        const k = numerateursPossibles(n)[0];
        for (const fin of [false, true]) {
            const svg = camembertSvg(decouper(n, k, rng, true), n, fin);
            const vue = /viewBox="0 0 (\d+) (\d+)"/.exec(svg);
            const [L, H] = [Number(vue[1]), Number(vue[2])];
            for (const p of svg.matchAll(/[ML] ([\d.]+) ([\d.]+)/g)) {
                const [x, y] = [Number(p[1]), Number(p[2])];
                assert.ok(x >= -0.5 && x <= L + 0.5 && y >= -0.5 && y <= H + 0.5,
                    `n=${n} : un point (${x}, ${y}) sort du cadre ${L}×${H}`);
            }
        }
    }
});

test('L\'EXERCICE EST AU CATALOGUE, AVEC SON PAVÉ', () => {
    const exo = exercices.find(e => e.id === 'frac-lire');
    assert.ok(exo, 'l\'exercice n\'est pas au catalogue');
    assert.equal(exo.generatorId, 'frac.lire');
    assert.equal(exo.activityId, 'numpad', 'la fraction ne se tape plus');
    // ET IL EST LE SEUL À LIRE UNE FIGURE : c'était le trou du chapitre.
    // « La Pizzeria » fait l'inverse — on donne la fraction, l'élève colorie.
    assert.notEqual(exo.id, 'frac-pizza');
});
