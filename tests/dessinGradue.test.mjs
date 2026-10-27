// LE DESSIN GRADUÉ — 27 octobre.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// RÉMY, quatre captures d'une publication de collègues : « Tu pourrais créer
// ce genre d'exercice pour vec des dessins simplifiées pour téléphone
// portable et évidemment on peut relier les points etc… »
//
// CE QUE CETTE ÉPREUVE GARDE :
//
//   · UN DESSIN REMPLIT TOUTES SES DROITES. Une droite sans point, c'est une
//     ligne qu'on relit pour rien à chaque fois qu'on cherche la bonne —
//     quatre dessins sur cinq en avaient au premier jet, et cela ne se voyait
//     que sur la planche.
//   · AUCUN POINT ORPHELIN. Un point qu'aucune forme n'emploie, c'est du
//     travail sans récompense : l'élève le place et rien n'apparaît.
//   · UN HABIT DÉNOTE SON NOMBRE. « quatre dixièmes » doit valoir 0,4 — et
//     l'épreuve le relit AVEC SA PROPRE TABLE DE MOTS, écrite à la main plus
//     bas. On ne demande jamais au témoin de confirmer son témoignage : si la
//     table du module se trompe, celle d'ici ne se trompera pas avec elle.
//   · UN HABIT N'EST JAMAIS PLUS DUR QUE LE NOMBRE QU'IL HABILLE. « le double
//     de 0,005 », « 91 + 39 » : deux écritures justes, et deux calculs à
//     poser là où l'on voulait faire lire une droite.
//   · LA RÉPONSE ATTENDUE EST CELLE QUE L'ÉCRAN ENVOIE, comme partout.
//   · DEUX DROITES NE SE TOUCHENT PAS À TRENTE PIXELS L'UNE DE L'AUTRE, quelle
//     que soit la largeur de l'écran.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import '../js/core/activities/index.js';
import { exercices } from '../js/data/catalog.js';
import { getGenerator } from '../js/core/registry.js';
import { makeRng } from '../js/core/ids.js';
import { evaluate } from '../js/core/items.js';
import {
    DESSINS, ECHELLES, COLONNES, abscisseDe, maxDeLaLigne, HABITS, geometrie
} from '../js/core/dessinsGradues.js';
import { ecrirePlacements } from '../js/core/generators/dessinGradue.js';

const ID = 'num-dessin-gradue';

function tirer(combien = 6, params = null) {
    const exo = exercices.find(e => e.id === ID);
    assert.ok(exo, `${ID} a disparu du catalogue`);
    const gen = getGenerator(exo.generatorId);
    assert.ok(gen, `${ID} : générateur non enregistré`);
    return Array.from({ length: combien }, (_, i) =>
        gen.generate(params || { ...(exo.params || {}) }, { rng: makeRng(ID + i), index: i }));
}

// ── LA TABLE DE MOTS DE L'ÉPREUVE, ÉCRITE À LA MAIN ─────────────────────────
//
// Elle ne vient PAS de `dessinsGradues.js`. C'est tout l'intérêt : importer
// `UNITES` ferait relire le témoignage par le témoin, et « un dizaine »
// passerait au vert aussi longtemps que le module l'écrirait ainsi.
const MOTS = {
    'zéro': 0, 'un': 1, 'une': 1, 'deux': 2, 'trois': 3, 'quatre': 4, 'cinq': 5,
    'six': 6, 'sept': 7, 'huit': 8, 'neuf': 9, 'dix': 10
};

const nombreDe = (t) => /^-?\d+(,\d+)?$/.test(t) ? Number(t.replace(',', '.')) : null;

/** Ce que cet énoncé veut dire, relu par l'épreuve. `null` si incompris. */
function relire(texte) {
    const t = String(texte).trim();
    const nu = nombreDe(t);
    if (nu !== null) return nu;
    let m;
    if ((m = /^(\d+)\/10$/.exec(t))) return Number(m[1]) / 10;
    if ((m = /^(\S+) dixièmes?$/.exec(t))) {
        return MOTS[m[1]] === undefined ? null : MOTS[m[1]] / 10;
    }
    if ((m = /^(\S+) dizaines?$/.exec(t))) {
        return MOTS[m[1]] === undefined ? null : MOTS[m[1]] * 10;
    }
    if ((m = /^le double de (.+)$/.exec(t))) {
        const v = nombreDe(m[1]);
        return v === null ? null : v * 2;
    }
    if ((m = /^(\d+) \+ (\d+)$/.exec(t))) return Number(m[1]) + Number(m[2]);
    if ((m = /^(\d+) × (\d+)$/.exec(t))) return Number(m[1]) * Number(m[2]);
    return null;
}

const pareil = (a, b) => Math.abs(a - b) < 1e-9;

test('chaque dessin remplit toutes ses droites', () => {
    for (const [cle, d] of Object.entries(DESSINS)) {
        const lignes = new Set(Object.values(d.points).map(([, l]) => l));
        for (let l = 1; l <= d.lignes; l++) {
            assert.ok(lignes.has(l),
                `${cle} : la droite ${l} n'a aucun point — l'élève la relit pour rien`);
        }
        assert.equal(Math.max(...lignes), d.lignes,
            `${cle} : un point est sur une droite qui n'existe pas`);
    }
});

test('chaque sommet cité est un point déclaré, et tient dans la grille', () => {
    for (const [cle, d] of Object.entries(DESSINS)) {
        const noms = new Set(Object.keys(d.points));
        for (const f of d.formes) {
            for (const s of f.sommets) {
                assert.ok(noms.has(s), `${cle} : la forme « ${f.sommets} » cite ${s}, inconnu`);
            }
            assert.ok(f.sommets.length >= 3,
                `${cle} : « ${f.sommets} » n'est pas un polygone`);
        }
        for (const [a, b] of (d.traits || [])) {
            assert.ok(noms.has(a) && noms.has(b), `${cle} : le trait ${a}-${b} cite un inconnu`);
        }
        for (const [nom, [c, l]] of Object.entries(d.points)) {
            assert.ok(Number.isInteger(c) && c >= 0 && c <= COLONNES,
                `${cle} : ${nom} est en colonne ${c}, hors de 0…${COLONNES}`);
            assert.ok(Number.isInteger(l) && l >= 1 && l <= d.lignes,
                `${cle} : ${nom} est sur la droite ${l}, hors de 1…${d.lignes}`);
        }
    }
});

test('aucun point orphelin : chacun sert à une forme ou à un trait', () => {
    for (const [cle, d] of Object.entries(DESSINS)) {
        const servis = new Set();
        d.formes.forEach(f => [...f.sommets].forEach(s => servis.add(s)));
        (d.traits || []).forEach(([a, b]) => { servis.add(a); servis.add(b); });
        for (const nom of Object.keys(d.points)) {
            assert.ok(servis.has(nom),
                `${cle} : ${nom} se place et ne dessine rien — travail sans récompense`);
        }
    }
});

test('chaque échelle a dix intervalles qui tombent juste', () => {
    for (const [cle, e] of Object.entries(ECHELLES)) {
        e.lignes.forEach((l, i) => {
            const max = maxDeLaLigne(l);
            assert.ok(pareil(max, l.min + COLONNES * l.pas),
                `${cle}, ligne ${i + 1} : le maximum ne tombe pas sur la dixième graduation`);
            for (let c = 0; c <= COLONNES; c++) {
                const v = abscisseDe(c, i + 1, e);
                assert.ok(pareil(v, l.min + c * l.pas),
                    `${cle}, ligne ${i + 1}, colonne ${c} : abscisse ${v} décalée`);
                assert.ok(!/\d{4,}/.test(String(v).split('.')[1] || ''),
                    `${cle}, ligne ${i + 1}, colonne ${c} : ${v} traîne des décimales flottantes`);
            }
        });
    }
});

test('chaque habit dénote exactement le nombre qu\'il habille', () => {
    // On balaie toutes les abscisses que les échelles savent produire.
    const vus = new Set();
    for (const e of Object.values(ECHELLES)) {
        e.lignes.forEach((_, i) => {
            for (let c = 0; c <= COLONNES; c++) vus.add(abscisseDe(c, i + 1, e));
        });
    }
    const rng = makeRng('habits');
    for (const v of vus) {
        for (const [nom, f] of Object.entries(HABITS)) {
            const texte = f(v, rng);
            if (texte === null) continue;
            const lu = relire(texte);
            assert.notEqual(lu, null, `l'habit « ${nom} » écrit « ${texte} », illisible`);
            assert.ok(pareil(lu, v),
                `l'habit « ${nom} » écrit « ${texte} » pour ${v}, qui vaut ${lu}`);
        }
    }
});

test('« une dizaine » et non « un dizaine »', () => {
    assert.equal(HABITS.dizaines(10), 'une dizaine');
    assert.equal(HABITS.dizaines(40), 'quatre dizaines');
});

test('un habit n\'est jamais plus dur que le nombre qu\'il habille', () => {
    const vus = new Set();
    for (const e of Object.values(ECHELLES)) {
        e.lignes.forEach((_, i) => {
            for (let c = 0; c <= COLONNES; c++) vus.add(abscisseDe(c, i + 1, e));
        });
    }
    const rng = makeRng('durete');
    for (const v of vus) {
        const dbl = HABITS.double(v, rng);
        if (dbl) {
            const moitie = dbl.replace('le double de ', '');
            const apres = (moitie.split(',')[1] || '').length;
            assert.ok(apres <= 2,
                `« ${dbl} » : la moitié a ${apres} décimales, plus que le nombre lui-même`);
        }
        const som = HABITS.somme(v, rng);
        if (som && v >= 20) {
            const a = Number(som.split(' + ')[0]);
            assert.equal(a % 10, 0,
                `« ${som} » : le premier terme n'est pas rond, l'élève doit poser l'addition`);
        }
    }
});

test('chaque point a un énoncé non vide, à sa place', () => {
    for (const echelles of Object.keys(ECHELLES)) {
        for (const ecriture of ['nombre', 'varie']) {
            for (const item of tirer(4, { dessin: 'tous', echelles, ecriture })) {
                const d = DESSINS[item.meta.dessin];
                assert.ok(d, `dessin inconnu : ${item.meta.dessin}`);
                assert.equal(item.meta.points.length, Object.keys(d.points).length);
                for (const p of item.meta.points) {
                    assert.ok(String(p.enonce).trim(),
                        `${item.meta.dessin}/${echelles}/${ecriture} : ${p.nom} sans énoncé`);
                    const droite = item.meta.droites[p.ligne - 1];
                    assert.ok(droite, `${p.nom} renvoie à une droite qui n'est pas dessinée`);
                    assert.ok(pareil(p.abscisse, droite.min + p.colonne * droite.pas),
                        `${p.nom} : l'abscisse annoncée ne tombe pas sur sa graduation`);
                    const lu = relire(p.enonce);
                    assert.notEqual(lu, null, `${p.nom} : « ${p.enonce} » illisible`);
                    assert.ok(pareil(lu, p.abscisse),
                        `${p.nom} : « ${p.enonce} » vaut ${lu}, attendu ${p.abscisse}`);
                }
            }
        }
    }
});

test('la réponse attendue est celle que l\'écran enverrait', () => {
    for (const item of tirer(6)) {
        assert.equal(item.answer, ecrirePlacements(item.meta.points),
            'l\'écran et le générateur n\'écrivent pas la même réponse');
        assert.equal(evaluate(item, item.answer).correct, true);
        // Un seul point déplacé d'une graduation, et c'est faux.
        const triche = item.meta.points.map((p, i) => i === 0
            ? { ...p, colonne: (p.colonne + 1) % (COLONNES + 1) } : p);
        assert.equal(evaluate(item, ecrirePlacements(triche)).correct, false,
            'un point déplacé d\'un cran passe pour juste');
    }
});

test('les dessins tournent avec le rang', () => {
    const gen = getGenerator('num.dessin-gradue');
    const vus = Array.from({ length: Object.keys(DESSINS).length }, (_, i) =>
        gen.generate({ dessin: 'tous', echelles: 'entiers', ecriture: 'nombre' },
            { rng: makeRng('rotation'), index: i }).meta.dessin);
    assert.equal(new Set(vus).size, vus.length,
        `une feuille sert deux fois le même dessin : ${vus.join(', ')}`);
});

test('un dessin choisi à la main est servi tel quel', () => {
    for (const cle of Object.keys(DESSINS)) {
        const item = tirer(1, { dessin: cle, echelles: 'entiers', ecriture: 'nombre' })[0];
        assert.equal(item.meta.dessin, cle);
        assert.equal(item.meta.droites.length, DESSINS[cle].lignes);
    }
});

test('deux droites restent deux cibles séparées, de 280 à 1400 px', () => {
    for (let l = 280; l <= 1400; l += 17) {
        const g = geometrie(l);
        assert.ok(g.pas >= 58, `à ${l} px, deux droites sont à ${g.pas} px l'une de l'autre`);
        assert.ok(g.colonne > 20, `à ${l} px, deux graduations sont à ${g.colonne} px`);
        assert.ok(g.x1 > g.x0, `à ${l} px, la droite est à l'envers`);
        assert.ok(g.x1 <= l, `à ${l} px, la droite déborde du cadre`);
    }
});
