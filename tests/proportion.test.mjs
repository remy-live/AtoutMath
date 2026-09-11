import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import {
    tirerTableau, attendu, colonnesCompletes, verifierCase, termine,
    expliquer, ecrire, lire, titreLigne, IDS_NIVEAUX, CONTEXTES
} from '../js/core/proportion.js';
import { makeRng } from '../js/core/ids.js';

const NIVEAUX = IDS_NIVEAUX;

test('le tableau est VRAIMENT proportionnel, colonne par colonne', () => {
    for (const n of NIVEAUX) {
        for (let g = 1; g <= 60; g++) {
            const t = tirerTableau(n, makeRng(`${n}-${g}`));
            assert.equal(t.a.length, t.b.length);
            t.a.forEach((a, i) => {
                assert.ok(Math.abs(t.b[i] - a * t.coef) < 1e-9,
                    `${n} ${g} : colonne ${i} hors proportion (${a} → ${t.b[i]}, coef ${t.coef})`);
            });
        }
    }
});

test('tous les nombres affichés s\'écrivent avec au plus deux décimales', () => {
    // Trois décimales dans une case de tableau, personne ne les recopie.
    for (const n of NIVEAUX) {
        for (let g = 1; g <= 60; g++) {
            const t = tirerTableau(n, makeRng(`e-${n}-${g}`));
            [...t.a, ...t.b].forEach(v => {
                assert.ok(Math.abs(v * 100 - Math.round(v * 100)) < 1e-9, `${n} ${g} : ${v} illisible`);
            });
        }
    }
});

test('AU MOINS UNE COLONNE reste complète : sans elle rien n\'est déductible', () => {
    for (const n of NIVEAUX) {
        for (let g = 1; g <= 60; g++) {
            const t = tirerTableau(n, makeRng(`c-${n}-${g}`));
            assert.ok(colonnesCompletes(t).length >= 1,
                `${n} ${g} : aucune colonne complète, le coefficient est indéterminé`);
        }
    }
});

test('jamais les DEUX cases d\'une même colonne', () => {
    for (const n of NIVEAUX) {
        for (let g = 1; g <= 60; g++) {
            const t = tirerTableau(n, makeRng(`d-${n}-${g}`));
            const cols = t.trous.map(x => x.col);
            assert.equal(new Set(cols).size, cols.length,
                `${n} ${g} : une colonne creusée deux fois`);
        }
    }
});

test('il y a toujours de quoi travailler, et jamais trop', () => {
    for (const n of NIVEAUX) {
        for (let g = 1; g <= 40; g++) {
            const t = tirerTableau(n, makeRng(`t-${n}-${g}`));
            assert.ok(t.trous.length >= 2, `${n} ${g} : ${t.trous.length} trou seulement`);
            assert.ok(t.trous.length < t.a.length, `${n} ${g} : tout est creusé`);
            // Au moins un trou sur la ligne du bas : c'est le sens direct.
            assert.ok(t.trous.some(x => x.ligne === 'b'), `${n} ${g} : aucun trou en bas`);
        }
    }
});

test('« facile » ne creuse que la ligne du bas', () => {
    // On n'apprend pas à diviser par le coefficient avant de savoir le
    // multiplier.
    for (let g = 1; g <= 40; g++) {
        const t = tirerTableau('facile', makeRng(`f${g}`));
        t.trous.forEach(x => assert.equal(x.ligne, 'b', `graine ${g} : trou en haut au niveau facile`));
        assert.ok(Number.isInteger(t.coef), `graine ${g} : coefficient décimal au niveau facile`);
    }
});

test('les niveaux supérieurs font AUSSI remonter le tableau', () => {
    let remontees = 0;
    for (const n of ['moyen', 'difficile']) {
        for (let g = 1; g <= 40; g++) {
            const t = tirerTableau(n, makeRng(`r-${n}-${g}`));
            if (t.trous.some(x => x.ligne === 'a')) remontees++;
        }
    }
    assert.ok(remontees > 20, `seulement ${remontees} tableaux demandent de diviser`);
});

test('la bonne valeur est acceptée, partout', () => {
    for (const n of NIVEAUX) {
        for (let g = 1; g <= 40; g++) {
            const t = tirerTableau(n, makeRng(`ok-${n}-${g}`));
            t.trous.forEach(trou => {
                const r = verifierCase(t, trou, attendu(t, trou));
                assert.ok(r.ok, `${n} ${g} : bonne réponse refusée`);
            });
            assert.equal(termine(t, t.trous.map(x => attendu(t, x))), true);
        }
    }
});

test('L\'ERREUR ADDITIVE est reconnue et nommée', () => {
    // « 4 stylos coûtent 6 €, donc 5 stylos coûtent 7 € » : on a ajouté 1 des
    // deux côtés. C'est l'erreur du chapitre, et elle survit jusqu'au lycée si
    // personne ne la nomme.
    let vues = 0;
    for (const n of NIVEAUX) {
        for (let g = 1; g <= 60; g++) {
            const t = tirerTableau(n, makeRng(`add-${n}-${g}`));
            const ref = colonnesCompletes(t)[0];
            for (const trou of t.trous) {
                const faux = trou.ligne === 'b'
                    ? t.b[ref] + (t.a[trou.col] - t.a[ref])
                    : t.a[ref] + (t.b[trou.col] - t.b[ref]);
                if (Math.abs(faux - attendu(t, trou)) < 1e-9) continue;   // par hasard juste
                const r = verifierCase(t, trou, faux);
                assert.equal(r.ok, false);
                if (r.faute === 'additif') {
                    vues++;
                    assert.match(r.message, /MULTIPLIANT/);
                }
            }
        }
    }
    assert.ok(vues > 50, `seulement ${vues} erreurs additives reconnues`);
});

test('confondre le coefficient avec la réponse est dit comme tel', () => {
    const t = tirerTableau('facile', makeRng('coef'));
    const trou = t.trous.find(x => x.ligne === 'b');
    if (Math.abs(t.coef - attendu(t, trou)) > 1e-9) {
        const r = verifierCase(t, trou, t.coef);
        assert.equal(r.faute, 'coefficient');
        assert.match(r.message, /coefficient, pas la réponse/);
    }
});

test('multiplier au lieu de diviser est distingué d\'une erreur quelconque', () => {
    let vues = 0;
    for (let g = 1; g <= 60; g++) {
        const t = tirerTableau('moyen', makeRng(`inv${g}`));
        const trou = t.trous.find(x => x.ligne === 'a');
        if (!trou) continue;
        const faux = Math.round(t.b[trou.col] * t.coef * 100) / 100;
        if (Math.abs(faux - attendu(t, trou)) < 1e-9) continue;
        const r = verifierCase(t, trou, faux);
        if (r.faute === 'inverse') { vues++; assert.match(r.message, /divise/); }
    }
    assert.ok(vues > 5, `seulement ${vues} inversions reconnues`);
});

test('une case vide ou du charabia ne passe pas pour une réponse', () => {
    const t = tirerTableau('facile', makeRng('vide'));
    assert.equal(verifierCase(t, t.trous[0], null).faute, 'vide');
    assert.equal(lire(''), null);
    assert.equal(lire('abc'), null);
    assert.equal(lire('12'), 12);
    assert.equal(lire('7,5'), 7.5);
    assert.equal(lire(' 3.25 '), 3.25);
    assert.equal(lire('1 2'), 12, 'les espaces de saisie ne doivent pas bloquer');
});

test('la correction montre le coefficient ET le calcul', () => {
    for (const n of NIVEAUX) {
        for (let g = 1; g <= 20; g++) {
            const t = tirerTableau(n, makeRng(`x-${n}-${g}`));
            t.trous.forEach(trou => {
                const e = expliquer(t, trou);
                assert.equal(e.length, 3);
                e.forEach(l => assert.ok(!/undefined|NaN/.test(l), `${n} : ${l}`));
                // La dernière ligne se termine sur la valeur cherchée.
                assert.ok(e[2].includes(ecrire(attendu(t, trou))),
                    `${n} ${g} : la correction ne donne pas la réponse (${e[2]})`);
            });
        }
    }
});

test('LE COEFFICIENT EST PLAUSIBLE pour son contexte', () => {
    // Un coefficient tiré indépendamment du contexte donne « 14 h de route
    // pour 16,8 km », soit une voiture à 1,2 km/h. L'élève n'apprend pas la
    // proportionnalité là-dedans : il apprend que les énoncés de maths ne
    // veulent rien dire.
    for (const n of NIVEAUX) {
        for (let g = 1; g <= 80; g++) {
            const t = tirerTableau(n, makeRng(`pl-${n}-${g}`));
            assert.ok(t.contexte.coefs.includes(t.coef),
                `${n} ${g} : coefficient ${t.coef} hors de la liste de « ${t.contexte.id} »`);
            assert.ok(Math.max(...t.a) <= t.contexte.aMax,
                `${n} ${g} : ${Math.max(...t.a)} dépasse le plafond de « ${t.contexte.id} »`);
        }
    }
});

test('une vitesse reste une vitesse, un prix reste un prix', () => {
    // Quelques bornes de bon sens, contexte par contexte.
    const bornes = { route: [30, 130], essence: [1.2, 2.5], farine: [40, 200], plan: [0.4, 12] };
    for (const n of NIVEAUX) {
        for (let g = 1; g <= 80; g++) {
            const t = tirerTableau(n, makeRng(`bs-${n}-${g}`));
            const b = bornes[t.contexte.id];
            if (!b) continue;
            assert.ok(t.coef >= b[0] && t.coef <= b[1],
                `${n} ${g} : « ${t.contexte.id} » avec un coefficient de ${t.coef}`);
        }
    }
});

test('chaque niveau trouve des contextes à sa mesure', () => {
    // Si un niveau ne laissait passer qu'un seul contexte, on tournerait en
    // rond au bout de trois tableaux.
    for (const n of NIVEAUX) {
        const vus = new Set();
        for (let g = 1; g <= 60; g++) vus.add(tirerTableau(n, makeRng(`v-${n}-${g}`)).contexte.id);
        assert.ok(vus.size >= 3, `${n} : seulement ${vus.size} contexte(s) — ${[...vus]}`);
    }
});

test('les nombres s\'écrivent à la française', () => {
    assert.equal(ecrire(12), '12');
    assert.equal(ecrire(7.5), '7,5');
    assert.equal(ecrire(1.25), '1,25');
    assert.equal(ecrire(0.5), '0,5');
    assert.equal(ecrire(null), '');
});

test('chaque contexte a deux grandeurs nommées, et l\'unité suit', () => {
    CONTEXTES.forEach(c => {
        assert.ok(c.a && c.b && c.sujet, `${c.id} incomplet`);
    });
    const t = tirerTableau('facile', makeRng('titre'));
    const ta = titreLigne(t, 'a'), tb = titreLigne(t, 'b');
    assert.ok(ta.length > 3 && tb.length > 3);
    assert.ok(!/undefined/.test(ta + tb));
});

test('deux graines différentes donnent deux tableaux différents', () => {
    for (const n of NIVEAUX) {
        const x = tirerTableau(n, makeRng(`a-${n}`));
        const y = tirerTableau(n, makeRng(`b-${n}`));
        assert.notEqual(JSON.stringify([x.a, x.b]), JSON.stringify([y.a, y.b]), `${n} : toujours le même`);
    }
});
