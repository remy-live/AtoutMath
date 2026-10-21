// TRACER UNE FONCTION — l'écran qui place, et la feuille qui trace.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, bloc 12 de sa progression de quatrième : « Tracé de fonction ». Et sa
// réponse à la question qui touchait la ligne rouge : « les deux ».
//
// CE QUE CES ÉPREUVES GARDENT :
//
//   1. LE POINT DEMANDÉ TOMBE DANS LE REPÈRE. C'est la seule chose qu'aucune
//      relecture ne peut voir : un point hors grille ne peut PAS être cliqué,
//      et l'élève croit alors que le logiciel est cassé. L'activité « repère »
//      ne pose de cibles que de −max à max.
//   2. LA RÉPONSE EST JUSTE, recalculée depuis l'énoncé — et non depuis les
//      nombres que le générateur s'est donnés à lui-même.
//   3. LES DEUX MARCHES DU MILIEU LISENT, ELLES NE CALCULENT PAS. Celle de
//      l'ordonnée à l'origine doit tomber sur l'axe vertical, celle du pas
//      doit tomber à UN carreau à droite. Si l'une des deux dérive, la marche
//      devient un calcul d'image de plus et la progression perd son milieu.
//   4. SUR LA FEUILLE, TOUTES LES IMAGES TIENNENT DANS LE REPÈRE. Un seul
//      point qui sort, et l'élève a juste sans pouvoir le placer : il cherche
//      alors son erreur dans un calcul qui n'en a pas.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../js/core/ids.js';
import {
    fonctionRepereGenerator as G, ETAPES, ecrireAffine
} from '../js/core/generators/fonctionRepere.js';
import { fonctionFicheGenerator as F, tirerFiche } from '../js/core/generators/fonctionFiche.js';

const MAX = 6;
const point = (it) => it.answer.split(',').map(Number);

/** Relit « f(x) = −2x + 3 » pour en retirer a et b, sans croire le générateur. */
function lireAffine(texte) {
    const m = texte.match(/f\(x\) = (−?)(\d*)x(?:\s*([+−])\s*(\d+))?/);
    assert.ok(m, `écriture de f illisible dans « ${texte} »`);
    const a = (m[1] ? -1 : 1) * (m[2] === '' ? 1 : Number(m[2]));
    const b = m[3] ? (m[3] === '−' ? -1 : 1) * Number(m[4]) : 0;
    return { a, b };
}

test('AUCUN POINT NE SORT DU REPÈRE', () => {
    // UN POINT HORS GRILLE N'EST PAS CLIQUABLE, et l'élève ne peut pas le
    // savoir : il voit une question juste et un repère qui ne répond pas.
    for (const e of ETAPES) {
        for (let k = 0; k < 60; k++) {
            const it = G.generate({ marches: [e.id] },
                { rng: makeRng(`${e.id}-${k}`), index: k, total: 60 });
            const [x, y] = point(it);
            assert.ok(Number.isInteger(x) && Number.isInteger(y),
                `${e.id} : (${x} ; ${y}) n'est pas sur un nœud`);
            assert.ok(Math.abs(x) <= MAX && Math.abs(y) <= MAX,
                `${e.id} : (${x} ; ${y}) sort du repère de ${MAX}`);
            assert.equal(it.meta.max, MAX);
            assert.equal(it.meta.relatifs, true);
            assert.equal(it.answerKind, 'point');
        }
    }
});

test('LE POINT EST SUR LA DROITE, ET C\'EST CELUI QU\'ON DEMANDE', () => {
    for (const e of ETAPES) {
        for (let k = 0; k < 50; k++) {
            const it = G.generate({ marches: [e.id] },
                { rng: makeRng(`j-${e.id}-${k}`), index: k, total: 50 });
            const t = it.prompt.text;
            const { a, b } = lireAffine(t);
            const [x, y] = point(it);
            // D'ABORD : LE POINT APPARTIENT À LA DROITE. Vrai des six marches,
            // quelle que soit la façon dont la question est posée.
            assert.equal(y, a * x + b, `${e.id} : (${x} ; ${y}) n'est pas sur f(x) = ${ecrireAffine(a, b)}`);

            // ENSUITE : C'EST LE POINT QUE LA QUESTION DÉSIGNE.
            if (e.id === 'image' || e.id === 'image-relatifs') {
                const vise = Number(t.match(/abscisse est (−?\d+)/)[1].replace('−', '-'));
                assert.equal(x, vise, t);
            }
            if (e.id === 'ordonnee-origine') {
                assert.equal(x, 0, `${t} → l'axe des ordonnées est en x = 0`);
                assert.notEqual(y, 0, `${t} : la droite passerait par l'origine, et la question n'apprendrait rien`);
            }
            if (e.id === 'antecedent-simple' || e.id === 'antecedent') {
                const vise = Number(t.match(/ordonnée est (−?\d+)/)[1].replace('−', '-'));
                assert.equal(y, vise, t);
                assert.notEqual(x, 0, `${t} : l'antécédent serait sur l'axe, ce qui est l'autre marche`);
            }
            if (e.id === 'antecedent-simple') {
                // RÉMY : « il faut résoudre une équation, c'est dur quand même ».
                // Le petit bain ne défait qu'UNE opération : la fonction n'a
                // donc pas de terme constant, et son écriture ne doit porter ni
                // « + » ni « − ». Si un b se glissait là, la marche
                // redeviendrait celle d'à côté sans que rien ne le dise.
                // ON LIT L'EXPRESSION, PAS LA PHRASE. Écrite `/[+−]/` sur le
                // début du texte, la garde prenait le signe du COEFFICIENT pour
                // un terme constant et refusait « f(x) = −2x », qui est
                // pourtant exactement ce que la marche doit produire.
                const expr = t.match(/f\(x\) = (.+?)\./)[1];
                assert.match(expr, /^−?\d*x$/,
                    `${t} : la fonction du petit bain porte un terme constant`);
                assert.equal(a * x, y, t);
                assert.ok(Math.abs(a) >= 2,
                    `${t} : un coefficient de 1 rend la division inexistante`);
            }
            if (e.id === 'zero') {
                assert.equal(y, 0, `${t} → l'axe des abscisses est en y = 0`);
                assert.notEqual(x, 0, `${t} : la droite passerait par l'origine`);
            }
        }
    }
});

test('LE PREMIER PALIER RESTE DANS LE PREMIER QUADRANT', () => {
    // RÉMY : « simple beau progressif ». Calculer 2 × 3 + 1 et cliquer en haut
    // à droite est déjà deux gestes ; y ajouter un signe en ferait trois, et
    // l'on ne saurait plus lequel a manqué.
    for (let k = 0; k < 60; k++) {
        const [x, y] = point(G.generate({ marches: ['image'] },
            { rng: makeRng('q' + k), index: k, total: 60 }));
        assert.ok(x > 0 && y > 0, `(${x} ; ${y}) n'est pas dans le premier quadrant`);
    }
    // ET LA MARCHE SUIVANTE EN SORT VRAIMENT, sinon elle ne travaille rien de
    // plus que la précédente.
    let negatifs = 0;
    for (let k = 0; k < 60; k++) {
        const [x, y] = point(G.generate({ marches: ['image-relatifs'] },
            { rng: makeRng('r' + k), index: k, total: 60 }));
        assert.ok(x < 0 || y < 0, `(${x} ; ${y}) est dans le premier quadrant`);
        if (x < 0 && y < 0) negatifs++;
    }
    assert.ok(negatifs > 0, 'aucun point n\'a ses DEUX coordonnées négatives en soixante tirages');
});

test('LES TEMPS SE SUIVENT, ET TROIS COMPÉTENCES SONT DISTINGUÉES', () => {
    const temps = ETAPES.map(e => e.temps);
    assert.deepEqual([...temps].sort(), temps, `les temps ne se suivent pas : ${temps.join('')}`);
    assert.equal(temps[0], 'A');
    // ET LA MARCHE DU PAS N'EST PLUS LÀ. Rémy : « incompréhensible. ne le
    // fait pas ». Une épreuve qui la nommerait encore passerait au vert sans
    // rien mesurer — un identifiant inventé rend `undefined`, et `ETAPES[0]`
    // prend alors sa place en silence.
    assert.ok(!ETAPES.some(e => e.id === 'le-pas'), 'la marche du pas est revenue');
    assert.equal(ETAPES.length, 6);
    const vues = new Set(ETAPES.map(e =>
        G.generate({ marches: [e.id] }, { rng: makeRng('s' + e.id), index: 0, total: 1 }).skillId));
    assert.deepEqual([...vues].sort(),
        ['alg.fonction.antecedent', 'alg.fonction.graphique', 'alg.fonction.image']);
});

test('LA FEUILLE NE SORT AUCUN POINT DU REPÈRE', () => {
    // SUR LE PAPIER, UN POINT HORS GRILLE EST PIRE QU'À L'ÉCRAN : l'élève a
    // juste, il ne peut pas placer, et il cherche son erreur dans un calcul
    // qui n'en a pas.
    for (let k = 0; k < 120; k++) {
        const it = F.generate({ max: 6 }, { rng: makeRng('f' + k), index: k, total: 120 });
        const m = it.meta;
        assert.ok(m.xs.length >= 4, `${m.ecriture} : ${m.xs.length} valeurs seulement`);
        assert.equal(m.points.length, m.xs.length);
        m.points.forEach((p, i) => {
            assert.equal(p.x, m.xs[i]);
            assert.equal(p.y, m.a * p.x + m.b);
            assert.ok(Math.abs(p.y) <= m.max,
                `${m.ecriture} : f(${p.x}) = ${p.y} sort du repère de ${m.max}`);
        });
        // LES x SE SUIVENT D'UN EN UN : un tableau de valeurs dont les abscisses
        // sautent n'apprend pas que le pas est constant, qui est tout le propos.
        m.xs.forEach((x, i) => { if (i) assert.equal(x, m.xs[i - 1] + 1, String(m.xs)); });
        assert.notEqual(m.a, 0, 'une fonction constante n\'est pas une droite à tracer');
    }
});

test('LA FEUILLE TIENT AUSSI AVEC UN PETIT REPÈRE', () => {
    // LE RÉGLAGE VA DE 4 À 8, et c'est le 4 qui serre : avec un coefficient de
    // 3 et cinq valeurs, les images balaient douze carreaux pour huit
    // disponibles. `tirerFiche` doit alors retomber sur quatre valeurs — et
    // s'il n'en trouve aucune, il rendrait `undefined` sans rien dire.
    for (const max of [4, 5, 6, 7, 8]) {
        for (let k = 0; k < 40; k++) {
            const { a, b, xs } = tirerFiche(makeRng(`p${max}-${k}`), max);
            // TROIS VALEURS AU MINIMUM : avec un repère de quatre et un
            // coefficient de 3, c'est tout ce qui tient — et c'est assez pour
            // qu'un point hors de la ligne se voie.
            assert.ok(xs && xs.length >= 3, `max=${max} : aucune plage trouvée`);
            xs.forEach(x => assert.ok(Math.abs(a * x + b) <= max,
                `max=${max}, f(x) = ${ecrireAffine(a, b)} : f(${x}) = ${a * x + b}`));
        }
    }
});

test('L\'ÉCRITURE DE LA FONCTION SE LIT COMME AU TABLEAU', () => {
    // ON N'ÉCRIT NI « 1x », NI « −1x », NI « + 0 », NI « + −3 ». Ce sont les
    // quatre écritures qu'un élève ne voit jamais dans un manuel, et dont
    // chacune lui ferait croire à une règle qui n'existe pas.
    assert.equal(ecrireAffine(1, 0), 'x');
    assert.equal(ecrireAffine(-1, 0), '−x');
    assert.equal(ecrireAffine(1, 4), 'x + 4');
    assert.equal(ecrireAffine(-1, -4), '−x − 4');
    assert.equal(ecrireAffine(3, 0), '3x');
    assert.equal(ecrireAffine(-2, 5), '−2x + 5');
    assert.equal(ecrireAffine(2, -5), '2x − 5');
    for (let a = -3; a <= 3; a++) {
        if (!a) continue;
        for (let b = -5; b <= 5; b++) {
            const s = ecrireAffine(a, b);
            assert.ok(!/1x/.test(s), `« ${s} » écrit le coefficient 1`);
            assert.ok(!/[+−]\s*0$/.test(s), `« ${s} » écrit un terme nul`);
            assert.ok(!/[+−]\s*−/.test(s), `« ${s} » met deux signes à la suite`);
            assert.ok(!/-/.test(s), `« ${s} » emploie un trait d'union comme signe moins`);
        }
    }
});
