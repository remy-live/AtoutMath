// L'AXE AU CENTIÈME — ce que ses épreuves gardent.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, après avoir essayé la cascade de loupes : « Cascade de loupe, on
// comprend pas trop en fait », et ce qu'il voulait à la place :
//
// > « un axe qui va de 8 à 9 donc 10 séparations et entre chaque dixième encore
// > dix séparations (avec un trait rouge pour les milieux) et on place un point
// > et il faut lire, il faut évidemment qu'il y ait de la place en largeur »
//
// Puis, en le voyant : « ne mets pas la croix au dessus, il faut qu'elle soit
// sur l'axe et tu peux mettre plusieurs points et aussi des axe qui commence à
// 3,5 et finissent à 3,6 pour faire des millièmes ».
//
// CE QUE CES ÉPREUVES GARDENT :
//
//   · CHAQUE CROIX TOMBE SUR LA GRADUATION QU'ON FAIT LIRE. Le dessin place la
//     croix au cran `p.cran` ; la réponse se calcule depuis `debut` et ce cran.
//     Si les deux divergent, le dessin montre un point et la correction en
//     attend un autre — et rien ne plante.
//   · LES TROIS MARCHES SONT TROIS DISTANCES AU REPÈRE, et non trois tailles de
//     nombre : ce qui coûte ici, c'est le nombre de petits traits à compter.
//   · LES DEUX ÉCHELLES SONT LE MÊME DESSIN, UN CRAN PLUS FIN. De 8 à 9 on lit
//     des centièmes ; de 3,5 à 3,6, des millièmes.
//   · PLUSIEURS POINTS NE SE RECOUVRENT PAS, et il y a autant de cases que de
//     points — sinon le pavé n'a pas où écrire.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import { lireAuCentiemeGenerator as G } from '../js/core/generators/lireAuCentieme.js';

const MARCHES = ['reperes', 'cote', 'entre'];
const ECHELLES = ['entiers', 'dixiemes'];
const item = (marche, i, opts = {}) => G.generate(
    { marches: [marche], echelle: opts.echelle || 'entiers', points: opts.points || '1' },
    { rng: makeRng(`cent-${marche}-${opts.echelle || 'e'}-${opts.points || 1}-${i}`),
        index: opts.index || 0, total: 3 });

test('CHAQUE CROIX TOMBE EXACTEMENT SUR LA GRADUATION QU’ON FAIT LIRE', () => {
    for (const e of ECHELLES) {
        for (const m of MARCHES) {
            for (let i = 0; i < 25; i++) {
                const it = item(m, i, { echelle: e, points: '3' });
                const { debut, rang, points } = it.meta;
                const unite = Math.pow(10, -rang);
                const dits = String(it.answer).split('|');
                points.forEach((p, k) => {
                    const ou = `${e}/${m} #${i} point ${k}`;
                    // LE DESSIN PLACE LA CROIX AU CRAN `p.cran` ; la réponse dit
                    // `p.valeur`. Les deux doivent désigner le MÊME point, sinon
                    // l'élève lit juste et le logiciel lui dit qu'il a faux.
                    assert.equal(Number((debut + p.cran * unite).toFixed(rang)), p.valeur,
                        `${ou} : croix au cran ${p.cran} de ${debut}, mais on attend ${p.valeur}`);
                    assert.equal(dits[k], String(p.valeur).replace('.', ','),
                        `${ou} : la réponse dit « ${dits[k] } » pour ${p.valeur}`);
                    // ET LE CRAN EST DANS L'AXE, bornes exclues : au cran 0 ou
                    // 100 la croix se poserait sur un nombre déjà écrit, et il
                    // n'y aurait rien à lire.
                    assert.ok(p.cran >= 1 && p.cran <= 99,
                        `${ou} : le cran ${p.cran} est sur un bout`);
                });
            }
        }
    }
});

test('LES TROIS MARCHES SONT TROIS DISTANCES AU REPÈRE', () => {
    // UN REPÈRE EST UN GRAND TRAIT (multiple de 10) OU LE TRAIT ROUGE DU MILIEU
    // (multiple de 5). Entre deux repères il n'y a que QUATRE petits traits,
    // donc aucun point n'est à plus de DEUX traits d'un repère.
    //
    // C'EST CE COMPTE QUI A CORRIGÉ LA PROGRESSION : les marches « à un ou deux
    // traits » et « n'importe où » demandaient le MÊME travail, et cette
    // épreuve l'a dit en refusant de trouver un seul cas plus difficile sur
    // quarante tirages. Une marche qui n'est pas plus dure que la précédente
    // est un décor.
    const distance = (c) => Math.min(c % 5, 5 - (c % 5));
    const attendu = { reperes: 0, cote: 1, entre: 2 };
    for (const m of MARCHES) {
        for (let i = 0; i < 30; i++) {
            item(m, i, { points: '3' }).meta.points.forEach((p) => {
                assert.equal(distance(p.cran), attendu[m],
                    `${m} #${i} : le cran ${p.cran} est à ${distance(p.cran)} traits `
                    + `d’un repère, pas ${attendu[m]}`);
            });
        }
    }
});

test('LES DEUX ÉCHELLES SONT LE MÊME DESSIN, UN CRAN PLUS FIN', () => {
    for (let i = 0; i < 25; i++) {
        const cent = item('entre', i, { echelle: 'entiers' });
        const mil = item('entre', i, { echelle: 'dixiemes' });
        // DE 8 À 9 : deux décimales, et l'axe mesure 1.
        assert.equal(cent.meta.rang, 2, `entiers #${i} : rang ${cent.meta.rang}`);
        assert.equal(Number((cent.meta.fin - cent.meta.debut).toFixed(6)), 1,
            `entiers #${i} : l’axe ne mesure pas 1`);
        assert.equal(cent.meta.debut % 1, 0, `entiers #${i} : le bout gauche n’est pas entier`);
        // DE 3,5 À 3,6 : trois décimales, et l'axe mesure un dixième. C'est la
        // demande de Rémy, mot pour mot.
        assert.equal(mil.meta.rang, 3, `dixiemes #${i} : rang ${mil.meta.rang}`);
        assert.equal(Number((mil.meta.fin - mil.meta.debut).toFixed(6)), 0.1,
            `dixiemes #${i} : l’axe mesure ${mil.meta.fin - mil.meta.debut}, pas 0,1`);
        // ET SON BOUT GAUCHE EST UN DIXIÈME ROND : un axe de 3,54 à 3,55 ne se
        // gradue pas en cent millièmes.
        assert.equal(Number((mil.meta.debut * 10).toFixed(6)) % 1, 0,
            `dixiemes #${i} : le bout gauche ${mil.meta.debut} n’est pas un dixième rond`);
    }
    // ET « LES DEUX » ALTERNE SUR LE RANG : une feuille de six droites doit en
    // montrer trois de chaque, et non six tirages dont cinq tomberaient du même
    // côté.
    const vues = [0, 1, 2, 3].map(n => item('entre', 0, { echelle: 'melange', index: n })
        .meta.echelle);
    assert.deepEqual(vues, ['entiers', 'dixiemes', 'entiers', 'dixiemes'],
        `« les deux » donne ${vues.join(', ')}`);
});

test('PLUSIEURS POINTS NE SE RECOUVRENT PAS, ET CHACUN A SA CASE', () => {
    for (const n of [1, 2, 3]) {
        for (const m of MARCHES) {
            for (let i = 0; i < 20; i++) {
                const it = item(m, i, { points: String(n) });
                const ou = `${n} point(s)/${m} #${i}`;
                assert.equal(it.meta.points.length, n, `${ou} : pas ${n} points`);
                assert.equal(it.meta.cases, n, `${ou} : les cases ne sont pas déclarées`);
                assert.equal(String(it.answer).split('|').length, n,
                    `${ou} : la réponse n’a pas ${n} morceaux`);
                // AUTANT DE CASES DANS L'ÉNONCÉ QUE DE POINTS — le pavé les
                // COMPTE. Et il n'en pose aucune à un seul point : son
                // mécanisme ne s'allume qu'à partir de DEUX, et une case unique
                // resterait décorative.
                const trous = (it.prompt.html.match(/data-trou=/g) || []).length;
                assert.equal(trous, n > 1 ? n : 0,
                    `${ou} : ${trous} case(s) dessinée(s)`);
                // DIX CRANS D'ÉCART AU MOINS : la croix fait quatorze unités de
                // large et sa lettre autant, pour un cran de 8,6 unités. À cinq
                // crans, deux croix se touchent ; à trois, les lettres se
                // recouvrent et l'on ne sait plus laquelle va avec laquelle.
                const crans = it.meta.points.map(p => p.cran).sort((a, b) => a - b);
                for (let k = 1; k < crans.length; k++) {
                    assert.ok(crans[k] - crans[k - 1] >= 10,
                        `${ou} : deux croix à ${crans[k] - crans[k - 1]} crans l’une de l’autre`);
                }
                // ET LES LETTRES SUIVENT L'ORDRE A, B, C — jamais l'ordre des
                // abscisses : c'est à l'élève de trouver où chacune se trouve.
                if (n > 1) {
                    assert.deepEqual(it.meta.points.map(p => p.lettre),
                        ['A', 'B', 'C'].slice(0, n), `${ou} : les lettres ne suivent pas`);
                }
            }
        }
    }
});

test('LA RÉPONSE S’ÉCRIT COMME UN ÉLÈVE L’ÉCRIT', () => {
    for (const e of ECHELLES) {
        for (const m of MARCHES) {
            for (let i = 0; i < 20; i++) {
                const it = item(m, i, { echelle: e });
                const ou = `${e}/${m} #${i} (${it.answer})`;
                // VIRGULE ET NON POINT, pas de zéro inutile à la fin — « 8,50 »
                // se tape « 8,5 » et serait refusé.
                assert.match(it.answer, /^[1-9](,\d{1,3})?$/, `${ou} : écriture inattendue`);
                assert.ok(!/,\d*0$/.test(it.answer), `${ou} : un zéro inutile à la fin`);
                // ET LA PARTIE ENTIÈRE N'EST JAMAIS ZÉRO : un axe de 0 à 1
                // ferait écrire « 0,47 », où le zéro de tête est un piège
                // d'ÉCRITURE qui n'a rien à voir avec la lecture.
                assert.ok(Math.floor(it.meta.debut) >= 1 && Math.floor(it.meta.debut) <= 9,
                    `${ou} : l’axe part de ${it.meta.debut}`);
                assert.equal(it.meta.decimal, true, `${ou} : pas de virgule au pavé`);
                assert.equal(it.answerKind, 'numeric', `${ou} : ce n’est pas le pavé qui répond`);
            }
        }
    }
});

test('LES TROIS FAUTES DE LA LECTURE SONT NOMMÉES', () => {
    let vues = 0;
    const fautes = new Set();
    for (const m of ['cote', 'entre']) {
        for (let i = 0; i < 20; i++) {
            const it = item(m, i);
            const ou = `${m} #${i}`;
            const bonnes = (it.choices || []).filter(c => c.correct);
            assert.equal(bonnes.length, 1, `${ou} : pas une seule bonne réponse`);
            assert.equal(bonnes[0].value, it.answer);
            const vals = (it.choices || []).map(c => String(c.value));
            assert.equal(new Set(vals).size, vals.length, `${ou} : deux propositions identiques`);
            const pourquoi = (it.choices || []).map(c => c.why || '').join(' ');
            [/arrêté\s+au (dixième|centième)/, /partant de la DROITE/, /il part\s+de \d/]
                .forEach((r, k) => { if (r.test(pourquoi)) fautes.add(k); });
            assert.ok((it.choices || []).some(c => c.why),
                `${ou} : aucune proposition n’explique ce qu’elle incarne`);
            vues += 1;
        }
    }
    assert.ok(vues >= 40, `seulement ${vues} questions examinées`);
    // LES TROIS SE RENCONTRENT SUR L'ENSEMBLE. On n'exige pas les trois à
    // chaque question : une faute qui donne la bonne réponse est supprimée, et
    // c'est normal.
    assert.equal(fautes.size, 3, `seules ${fautes.size} des trois fautes se rencontrent`);
    // ET À PLUSIEURS POINTS, IL N'Y A PAS DE QCM DU TOUT : la réponse est une
    // suite de nombres, et des propositions n'auraient aucun sens.
    // `makeItem` NORMALISE `undefined` EN `null` : on vérifie donc qu'il n'y a
    // PAS DE PROPOSITIONS, et non une valeur précise. Épingler `undefined`
    // aurait fait tomber cette épreuve sur un détail de normalisation, pas sur
    // la règle qu'elle garde.
    const aPlusieurs = item('entre', 0, { points: '3' }).choices;
    assert.ok(!aPlusieurs || aPlusieurs.length === 0,
        'un QCM est proposé alors qu’il y a trois points à lire');
});

test('ET LA FEUILLE SAIT QUOI DESSINER', () => {
    // LE RENDU IMPRIMÉ LIT `meta` : les deux bouts, le rang, et chaque point
    // avec son cran et sa lettre. Sans l'un d'eux, la feuille sort des droites
    // sans croix — ce qui est, mot pour mot, une feuille impossible à faire.
    // C'est arrivé trois fois.
    for (const e of ECHELLES) {
        for (const n of [1, 3]) {
            const it = item('cote', 5, { echelle: e, points: String(n) });
            const ou = `${e}/${n} point(s)`;
            for (const clef of ['debut', 'fin', 'rang', 'points', 'echelle', 'cases']) {
                assert.ok(it.meta[clef] !== undefined, `${ou} : la feuille n’a pas « ${clef} »`);
            }
            it.meta.points.forEach((p, k) => {
                for (const clef of ['cran', 'valeur']) {
                    assert.ok(p[clef] !== undefined, `${ou} point ${k} : « ${clef} » manque`);
                }
            });
            // LE CORRIGÉ IMPRIMÉ NE MONTRE PAS LA FORME INTERNE : « 8,4|8,6 »
            // est ce que le pavé envoie, pas ce qu’un professeur lit.
            assert.ok(!String(it.reponsePapier).includes('|'),
                `${ou} : le corrigé imprime « ${it.reponsePapier} »`);
            // ET L'ÉNONCÉ NOMME LES DEUX BOUTS : sur un écran étroit la figure
            // glisse dans sa boîte, et les deux nombres peuvent se trouver hors
            // du cadre au moment où l'on regarde la croix.
            const dit = (v) => it.prompt.text.includes(String(v).replace('.', ','));
            assert.ok(dit(it.meta.debut) && dit(it.meta.fin),
                `${ou} : l’énoncé « ${it.prompt.text} » ne nomme pas les deux bouts`);
        }
    }
});
