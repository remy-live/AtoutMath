import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.mjs';
import { makeRng } from '../js/core/ids.js';
import '../js/core/activities/index.js';
import {
    ZONES, SOL_MOYEN, zoneDe, relief, pas, etatInitial, REGLES, regleDe,
    tirerConsigne, convient, pourquoiPas, tirerVolee, qualiteAiles,
    GRAVITE, GRAVITE_PLONGEE, VX_MIN, VX_MAX, quitteLeSol
} from '../js/core/petitesAiles.js';
import { getExerciseById } from '../js/data/catalog.js';

/** Un joueur, décrit par ce qu'il fait de la pente sous ses pieds. */
function courir(zone, joue, secondes = 30, graine = 0.7) {
    let e = etatInitial(zone, graine);
    let air = 0, n = 0;
    for (let t = 0; t < secondes; t += 1 / 60) {
        const sol = relief(e.x, zone, graine);
        e = pas(e, 1 / 60, joue(sol.pente, sol.courbure), zone, graine);
        if (!e.auSol) air++;
        n++;
        assert.ok(Number.isFinite(e.x) && Number.isFinite(e.y) && Number.isFinite(e.vx),
            `la simulation a divergé à t = ${t.toFixed(2)}`);
    }
    return { x: e.x, vx: e.vx, partAir: air / n };
}

const PARFAIT = (pente) => pente < 0;
const JAMAIS = () => false;
const TOUJOURS = () => true;

// --- Le relief ---------------------------------------------------------------------

test('LA PENTE ET LA COURBURE SONT LES VRAIES DÉRIVÉES', () => {
    // Tout le jeu en dépend : la pente décide de l'accélération, la courbure du
    // décollage. Une dérivée approchée par différence de deux points ferait
    // vibrer la vitesse, et le jeu deviendrait nerveux sans qu'on sache pourquoi.
    for (const zone of ZONES) {
        let ecartPente = 0, ecartCourbure = 0;
        for (let x = 0; x < 4000; x += 7.3) {
            const h = 0.02;
            const numPente = (relief(x + h, zone, 0.3).hauteur
                - relief(x - h, zone, 0.3).hauteur) / (2 * h);
            const numCourbure = (relief(x + h, zone, 0.3).pente
                - relief(x - h, zone, 0.3).pente) / (2 * h);
            const r = relief(x, zone, 0.3);
            ecartPente = Math.max(ecartPente, Math.abs(numPente - r.pente));
            ecartCourbure = Math.max(ecartCourbure, Math.abs(numCourbure - r.courbure));
        }
        assert.ok(ecartPente < 1e-5, `zone ${zone.id} : pente ${ecartPente}`);
        assert.ok(ecartCourbure < 1e-4, `zone ${zone.id} : courbure ${ecartCourbure}`);
    }
});

test('le relief reste dans des altitudes jouables', () => {
    for (const zone of ZONES) {
        let bas = Infinity, haut = -Infinity;
        for (let x = 0; x < 8000; x += 3.1) {
            const h = relief(x, zone, 1.4).hauteur;
            bas = Math.min(bas, h); haut = Math.max(haut, h);
        }
        assert.ok(bas > SOL_MOYEN - zone.amplitude - 1, `zone ${zone.id} : creux trop bas`);
        assert.ok(haut < SOL_MOYEN + zone.amplitude + 1, `zone ${zone.id} : crête trop haute`);
        // Et il monte VRAIMENT : un relief plat ne ferait pas un jeu.
        assert.ok(haut - bas > zone.amplitude, `zone ${zone.id} : relief trop plat`);
    }
});

test('les zones se succèdent avec la distance', () => {
    assert.equal(zoneDe(0).id, 1);
    assert.equal(zoneDe(3500).id, 2);
    assert.equal(zoneDe(99999).id, ZONES.length);
    let amplitude = 0, periode = Infinity;
    ZONES.forEach(z => {
        assert.ok(z.amplitude > amplitude, `la zone ${z.id} n'est pas plus haute`);
        assert.ok(z.periode < periode, `la zone ${z.id} n'est pas plus serrée`);
        amplitude = z.amplitude; periode = z.periode;
    });
});

// --- La physique -----------------------------------------------------------------------

test('BIEN JOUER PAIE, DANS TOUTES LES ZONES', () => {
    // C'est la seule chose qui compte dans un jeu d'adresse, et cela ne se
    // devine pas : il faut le mesurer. Trois joueurs, la même graine, le même
    // temps — celui qui plonge dans les descentes doit gagner partout.
    for (const zone of ZONES) {
        const parfait = courir(zone, PARFAIT);
        const jamais = courir(zone, JAMAIS);
        const toujours = courir(zone, TOUJOURS);
        assert.ok(parfait.x > jamais.x * 1.1,
            `zone ${zone.id} : ne rien faire (${Math.round(jamais.x)}) vaut presque `
            + `bien jouer (${Math.round(parfait.x)})`);
        assert.ok(parfait.x > toujours.x * 1.05,
            `zone ${zone.id} : appuyer sans arrêt (${Math.round(toujours.x)}) bat le jeu `
            + `parfait (${Math.round(parfait.x)})`);
    }
});

test('ON DÉCOLLE AU SOMMET, ET SEULEMENT SI L\'ON VA ASSEZ VITE', () => {
    // La condition est physique : suivre le sol demande une accélération de v²
    // fois la courbure ; si la gravité ne fournit pas autant, on part tout droit.
    // LE CRITÈRE LUI-MÊME. Un creux (courbure positive) ne lance jamais ;
    // une bosse lance dès que la vitesse suffit.
    assert.equal(quitteLeSol(0.1, 400, GRAVITE), false, 'un creux ne lance pas');
    assert.equal(quitteLeSol(-0.02, 100, GRAVITE), false, 'trop lent pour décoller');
    assert.equal(quitteLeSol(-0.02, 400, GRAVITE), true, 'assez vite : on décolle');
    // Et le seuil est bien à l'égalité : v² = g / courbure.
    const vSeuil = Math.sqrt(GRAVITE / 0.02);
    assert.equal(quitteLeSol(-0.02, vSeuil * 0.99, GRAVITE), false);
    assert.equal(quitteLeSol(-0.02, vSeuil * 1.01, GRAVITE), true);
    // Appuyer, c'est peser : à la même courbure, il faut aller plus vite.
    assert.equal(quitteLeSol(-0.02, vSeuil * 1.01, GRAVITE_PLONGEE), false);
    const zone = ZONES[2];

    // SUR LES DUNES, LES PLUS DOUCES, une vitesse minimale ne suffit jamais à
    // décoller : la courbure y est trop faible. Sur les crêtes, en revanche,
    // même un oiseau lent quitte le sol — et c'est juste, c'est la physique.
    const douce = ZONES[0];
    let lent = { ...etatInitial(douce, 0.7), vx: VX_MIN };
    let envole = false;
    for (let t = 0; t < 10; t += 1 / 60) {
        lent = pas({ ...lent, vx: VX_MIN }, 1 / 60, false, douce, 0.7);
        if (!lent.auSol) envole = true;
    }
    assert.equal(envole, false, 'sur les dunes, à vitesse minimale, on reste au sol');

    // En jouant bien, on finit forcément en l'air une partie du temps.
    assert.ok(courir(zone, PARFAIT).partAir > 0.05,
        'un bon joueur doit passer du temps en vol');
    // Et en appuyant sans arrêt, jamais : appuyer, c'est peser.
    assert.equal(courir(zone, TOUJOURS).partAir, 0);
});

test('la vitesse reste dans ses bornes, quoi qu\'on fasse', () => {
    for (const zone of ZONES) {
        for (const joue of [PARFAIT, JAMAIS, TOUJOURS, () => Math.random() < 0.5]) {
            let e = etatInitial(zone, 2.2);
            for (let t = 0; t < 40; t += 1 / 60) {
                const sol = relief(e.x, zone, 2.2);
                e = pas(e, 1 / 60, joue(sol.pente, sol.courbure), zone, 2.2);
                assert.ok(e.vx >= VX_MIN - 1e-9 && e.vx <= VX_MAX + 1e-9,
                    `vitesse hors bornes : ${e.vx}`);
                // On ne passe jamais sous le sol.
                assert.ok(e.y >= relief(e.x, zone, 2.2).hauteur - 1e-6,
                    'l\'oiseau est passé sous le relief');
            }
        }
    }
});

test('appuyer pèse : la gravité de plongée est plus forte', () => {
    assert.ok(GRAVITE_PLONGEE > GRAVITE * 1.5);
    // Et en l'air, cela se voit tout de suite : à même position, celui qui
    // appuie tombe plus vite.
    const zone = ZONES[1];
    const base = { x: 100, y: relief(100, zone, 0).hauteur + 200, vx: 300, vy: 0, auSol: false };
    const plane = pas(base, 0.2, false, zone, 0);
    const plonge = pas(base, 0.2, true, zone, 0);
    assert.ok(plonge.y < plane.y, 'plonger devrait faire descendre plus vite');
});

// --- Les règles du décor ------------------------------------------------------------------

test('chaque règle sait juger, et surtout DIRE POURQUOI', () => {
    const rng = makeRng('regles');
    for (const r of REGLES) {
        for (const n of r.parametres) {
            for (let i = 0; i < 60; i++) {
                const v = r.tirer(rng, n);
                assert.ok(Number.isInteger(v) && v >= 0, `${r.id} : ${v} n'est pas un entier`);
                if (r.convient(v, n)) continue;
                const phrase = r.pourquoi(v, n);
                assert.ok(phrase.length > 12, `${r.id} : explication trop courte`);
                assert.ok(phrase.includes(String(v)),
                    `${r.id} : l'explication ne parle pas du nombre refusé`);
            }
        }
    }
});

test('les règles disent vrai', () => {
    const j = (id, v, n) => regleDe(id).convient(v, n);
    assert.equal(j('multiples', 63, 7), true);
    assert.equal(j('multiples', 62, 7), false);
    assert.equal(j('pairs', 38), true);
    assert.equal(j('pairs', 37), false);
    assert.equal(j('carres', 144), true);
    assert.equal(j('carres', 145), false);
    assert.equal(j('diviseurs', 6, 24), true);
    assert.equal(j('diviseurs', 7, 24), false);
    assert.equal(j('plusGrand', 51, 50), true);
    assert.equal(j('plusGrand', 50, 50), false, '« plus grand que 50 » exclut 50');
    // Une règle inconnue retombe sur la première plutôt que de casser en vol.
    assert.ok(regleDe('inexistante'));
});

test('UNE VOLÉE SANS BON NOMBRE EST UNE PUNITION : il y en a toujours', () => {
    const rng = makeRng('volees');
    for (let i = 0; i < 200; i++) {
        const c = tirerConsigne(rng);
        const v = tirerVolee(rng, c, 9);
        assert.equal(v.length, 9);
        const bons = v.filter(x => convient(c, x)).length;
        assert.ok(bons >= 3, `« ${c.titre} » : seulement ${bons} bons sur 9 — ${v.join(' ')}`);
        // Et il y a aussi des mauvais, sinon il n'y a rien à décider.
        assert.ok(bons < 9 || c.id === 'diviseurs', `« ${c.titre} » : que des bons`);
        v.filter(x => !convient(c, x)).forEach(x =>
            assert.ok(pourquoiPas(c, x).length > 12));
    }
});

test('la consigne change vraiment quand on le demande', () => {
    const rng = makeRng('consignes');
    for (let i = 0; i < 100; i++) {
        const a = tirerConsigne(rng);
        const b = tirerConsigne(rng, a.id);
        assert.notEqual(b.id, a.id, 'la nouvelle consigne répète la précédente');
        assert.ok(a.titre.length > 5);
    }
});

test('la qualité résume la partie', () => {
    assert.deepEqual(qualiteAiles(1234.6, 8, 2),
        { distance: 1235, bons: 8, rates: 2, taux: 80 });
    assert.equal(qualiteAiles(0, 0, 0).taux, 100, 'aucune tentative : pas de note négative');
});

// --- Le rangement --------------------------------------------------------------------------

test('Les Petites Ailes sont au catalogue, en calcul mental', () => {
    const e = getExerciseById('jeu-petites-ailes');
    assert.ok(e, 'jeu-petites-ailes manque au catalogue');
    assert.equal(e.activityId, 'petites-ailes');
    assert.deepEqual(e.skills, ['num.aile.reconnaitre']);
    assert.ok(e.instruction.length > 400);
    // La consigne doit expliquer LE geste, qui est tout le jeu.
    assert.ok(/plonger/i.test(e.instruction));
    assert.ok(/relâche/i.test(e.instruction));
});
