// « Le Chat Géomètre » : la machine virtuelle des blocs et la notation du
// tracé sont des modules purs, donc entièrement vérifiables ici. Ce sont eux
// qui décident si un élève a réussi : une erreur de repère ou de tolérance
// se paierait en réussites refusées à tort.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { executer, normaliser, compterBlocs, contientBoucle, profondeurBoucles } from '../js/core/scratchVM.js';
import { comparerTrace, distancePointSegment, echantillonner, verifierExigences } from '../js/core/scratchScore.js';

const outils = { compterBlocs, contientBoucle, profondeurBoucles };
const av = (n) => ({ type: 'avancer', valeur: n });
const dr = (n) => ({ type: 'droite', valeur: n });
const stylo = () => ({ type: 'stylo' });
const rep = (n, corps) => ({ type: 'repeter', valeur: n, corps });

// --- Repère et déplacements -------------------------------------------------

test('la direction 90 fait avancer vers la DROITE', () => {
    const { sprite } = executer([av(100)], { dir: 90 });
    assert.equal(Math.round(sprite.x), 100);
    assert.equal(Math.round(sprite.y), 0);
});

test('la direction 0 fait avancer vers le HAUT (y positif)', () => {
    const { sprite } = executer([av(50)], { dir: 0 });
    assert.equal(Math.round(sprite.x), 0);
    assert.equal(Math.round(sprite.y), 50);
});

test('les angles négatifs reviennent dans [0, 360[', () => {
    assert.equal(normaliser(-90), 270);
    assert.equal(normaliser(450), 90);
    assert.equal(normaliser(-370), 350);
});

test('stylo levé : le chat se déplace sans laisser de trait', () => {
    const { traces } = executer([av(100), dr(90), av(100)]);
    assert.equal(traces.length, 0);
});

test('le stylo posé sans bouger ne compte pas comme un trait', () => {
    const { traces } = executer([stylo(), dr(90)]);
    assert.equal(traces.length, 0);
});

test('« aller à » ne trace pas le saut', () => {
    const r = executer([stylo(), av(100), { type: 'allerA', valeur: -200, valeur2: -200 }, av(100)]);
    // Deux traits distincts, jamais un seul qui relierait les deux zones.
    assert.equal(r.traces.length, 2);
    r.traces.forEach(t => assert.ok(t.length >= 2));
});

// --- Le carré, avec et sans boucle ------------------------------------------

const CARRE_MAIN = [stylo(), av(100), dr(90), av(100), dr(90), av(100), dr(90), av(100), dr(90)];
const CARRE_BOUCLE = [stylo(), rep(4, [av(100), dr(90)])];

test('le carré à la main revient à son point de départ', () => {
    const { sprite } = executer(CARRE_MAIN);
    assert.ok(Math.hypot(sprite.x, sprite.y) < 0.5, `arrivée en ${sprite.x}, ${sprite.y}`);
    assert.equal(Math.round(sprite.dir), 90);
});

test('carré à la main et carré avec boucle donnent EXACTEMENT le même tracé', () => {
    const a = executer(CARRE_MAIN).traces;
    const b = executer(CARRE_BOUCLE).traces;
    assert.equal(a.length, b.length);
    assert.deepEqual(
        a[0].map(p => [Math.round(p.x), Math.round(p.y)]),
        b[0].map(p => [Math.round(p.x), Math.round(p.y)])
    );
});

test('un polygone régulier se ferme avec un angle de 360 ÷ n', () => {
    for (const n of [3, 5, 6, 8, 12]) {
        const { sprite } = executer([stylo(), rep(n, [av(80), dr(360 / n)])]);
        assert.ok(Math.hypot(sprite.x, sprite.y) < 0.5, `polygone à ${n} côtés non fermé`);
    }
});

test('une boucle démesurée s’arrête au lieu de figer la page', () => {
    const r = executer([stylo(), rep(1000, [rep(1000, [av(1), dr(1)])])]);
    assert.equal(r.debordement, true);
});

// --- Mesure de la distance --------------------------------------------------

test('distance à un segment : projection à l’intérieur et aux extrémités', () => {
    const a = { x: 0, y: 0 }, b = { x: 100, y: 0 };
    assert.equal(distancePointSegment({ x: 50, y: 10 }, a, b), 10);
    assert.equal(distancePointSegment({ x: -30, y: 0 }, a, b), 30);
    assert.equal(distancePointSegment({ x: 130, y: 0 }, a, b), 30);
});

test('l’échantillonnage ne laisse pas de trou plus grand que le pas', () => {
    const pts = echantillonner([{ x: 0, y: 0 }, { x: 100, y: 0 }], 6);
    for (let i = 1; i < pts.length; i++) {
        assert.ok(Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y) <= 6.01);
    }
});

// --- Notation ---------------------------------------------------------------

const FIGURE_CARRE = executer(CARRE_BOUCLE).traces;

test('le bon carré est accepté', () => {
    const r = comparerTrace(executer(CARRE_MAIN).traces, FIGURE_CARRE);
    assert.equal(r.reussi, true);
    assert.equal(r.couverture, 1);
    assert.equal(r.proprete, 1);
});

test('un carré tracé dans l’autre sens est accepté : c’est la même figure', () => {
    const gauche = [stylo(), rep(4, [av(100), { type: 'gauche', valeur: 90 }])];
    const r = comparerTrace(executer(gauche).traces, executer([stylo(), rep(4, [av(100), { type: 'gauche', valeur: 90 }])]).traces);
    assert.equal(r.reussi, true);
});

test('trois côtés sur quatre : refusé, et la couverture le dit', () => {
    const r = comparerTrace(executer([stylo(), rep(3, [av(100), dr(90)])]).traces, FIGURE_CARRE);
    assert.equal(r.reussi, false);
    // Un peu au-dessus des 3/4 attendus : les 12 px de tolérance à chaque bout
    // du côté manquant sont comptés comme repassés. C'est voulu — un élève ne
    // doit pas être puni parce qu'il s'arrête un cheveu trop tôt.
    assert.ok(r.couverture > 0.78 && r.couverture < 0.88, `couverture ${r.couverture}`);
    assert.equal(r.proprete, 1);          // ce qui est tracé est juste
});

test('deux côtés sur quatre : la couverture tombe nettement plus bas', () => {
    const r = comparerTrace(executer([stylo(), rep(2, [av(100), dr(90)])]).traces, FIGURE_CARRE);
    assert.ok(r.couverture < 0.65, `couverture ${r.couverture}`);
});

test('un côté trop long : la bavure est détectée', () => {
    const r = comparerTrace(executer([stylo(), av(160), dr(90), av(100), dr(90), av(100), dr(90), av(100)]).traces, FIGURE_CARRE);
    assert.equal(r.reussi, false);
    assert.ok(r.proprete < 0.95, `propreté ${r.proprete}`);
});

test('un mauvais angle sort du tracé', () => {
    const r = comparerTrace(executer([stylo(), rep(4, [av(100), dr(80)])]).traces, FIGURE_CARRE);
    assert.equal(r.reussi, false);
});

test('une page blanche n’est jamais « propre à 100 % »', () => {
    const r = comparerTrace([], FIGURE_CARRE);
    assert.equal(r.reussi, false);
    assert.equal(r.proprete, 0);
    assert.equal(r.couverture, 0);
});

test('un gribouillage qui couvre la figure est refusé pour bavure', () => {
    // Un balayage horizontal dense : il PASSE sur le carré, mais déborde partout.
    const gribouille = [stylo(), rep(20, [av(300), dr(90), av(10), dr(90), av(300), { type: 'gauche', valeur: 90 }, av(10), { type: 'gauche', valeur: 90 }])];
    const r = comparerTrace(executer(gribouille).traces, FIGURE_CARRE);
    assert.equal(r.reussi, false);
    assert.ok(r.proprete < 0.5, `propreté ${r.proprete}`);
});

test('un léger tremblement sous la tolérance reste accepté', () => {
    const trace = FIGURE_CARRE.map(l => l.map((p, i) => ({ x: p.x + (i % 2 ? 4 : -4), y: p.y })));
    assert.equal(comparerTrace(trace, FIGURE_CARRE).reussi, true);
});

// --- Exigences de code ------------------------------------------------------

test('l’exigence de boucle refuse le carré écrit à la main', () => {
    assert.equal(verifierExigences(CARRE_BOUCLE, { boucle: true }, outils), null);
    assert.match(verifierExigences(CARRE_MAIN, { boucle: true }, outils), /boucle/);
});

test('le nombre de blocs est compté à travers les boucles', () => {
    assert.equal(compterBlocs(CARRE_BOUCLE), 4);   // stylo + répéter + avancer + tourner
    assert.equal(compterBlocs(CARRE_MAIN), 9);
    assert.match(verifierExigences(CARRE_MAIN, { maxBlocs: 6 }, outils), /9 blocs/);
});

test('l’imbrication des boucles est mesurée', () => {
    assert.equal(profondeurBoucles(CARRE_BOUCLE), 1);
    assert.equal(profondeurBoucles([rep(12, [rep(4, [av(50), dr(90)]), dr(30)])]), 2);
    assert.equal(verifierExigences([rep(12, [rep(4, [av(50), dr(90)]), dr(30)])], { imbrication: 2 }, outils), null);
    assert.match(verifierExigences(CARRE_BOUCLE, { imbrication: 2 }, outils), /imbriquées/);
});

// --- La progression elle-même ------------------------------------------------
//
// Le plus utile de ces tests : chaque niveau doit être résoluble AVEC SA
// PROPRE palette, tenir dans la scène, et sa solution modèle doit passer sa
// propre validation. Une figure qui déborde ou un bloc absent de la palette
// donnerait un niveau infaisable — et rien ne le signalerait à l'exécution.

import { scratchGenerator, NIVEAUX_SCRATCH, centrerFigure as centrer } from '../js/core/generators/scratch.js';
import { makeRng } from '../js/core/ids.js';

const DEMI_SCENE = 180;   // la scène va de -180 à +180 dans les deux sens

function typesUtilises(script, vus = new Set()) {
    for (const b of script || []) {
        vus.add(b.type);
        if (b.corps) typesUtilises(b.corps, vus);
    }
    return vus;
}

for (const niveau of NIVEAUX_SCRATCH) {
    test(`niveau « ${niveau.titre} » : la solution modèle valide le niveau`, () => {
        const { figure } = centrer(niveau);
        assert.ok(figure.length > 0, 'le modèle ne trace rien');
        const r = comparerTrace(figure, figure);
        assert.equal(r.reussi, true);
        const manque = verifierExigences(niveau.modele, niveau.exigences, outils);
        assert.equal(manque, null, `exigence non tenue par le modèle : ${manque}`);
    });

    test(`niveau « ${niveau.titre} » : tous les blocs du modèle sont dans la palette`, () => {
        const utilises = [...typesUtilises(niveau.modele)];
        const absents = utilises.filter(t => !niveau.palette.includes(t));
        assert.deepEqual(absents, [], `blocs absents de la palette : ${absents.join(', ')}`);
    });

    test(`niveau « ${niveau.titre} » : la figure tient dans la scène`, () => {
        const pts = centrer(niveau).figure.flat();
        const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
        const hors = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
        assert.ok(hors.every(v => Math.abs(v) <= DEMI_SCENE + 0.5),
            `débordement : x ∈ [${Math.round(hors[0])}, ${Math.round(hors[1])}], y ∈ [${Math.round(hors[2])}, ${Math.round(hors[3])}]`);
    });
}

test('le générateur enchaîne les niveaux dans l’ordre', () => {
    const rangs = [0, 1, 2].map(i =>
        scratchGenerator.generate({ depart: 1 }, { rng: makeRng(`s${i}`), index: i }).meta.niveau);
    assert.deepEqual(rangs, [1, 2, 3]);
});

test('le générateur peut démarrer à un niveau choisi', () => {
    const it = scratchGenerator.generate({ depart: 5 }, { rng: makeRng('x'), index: 0 });
    assert.equal(it.meta.niveau, 5);
    assert.ok(it.meta.figure.length > 0);
    assert.ok(it.explanation.length > 20, 'chaque niveau doit porter sa leçon');
});

// --- Diagnostic « bonne forme, mauvaise taille » -----------------------------

import { diagnostiquer } from '../js/core/scratchScore.js';

test('un carré deux fois trop petit est diagnostiqué comme tel, pas comme incomplet', () => {
    const petit = executer([stylo(), rep(4, [av(55), dr(90)])]).traces;
    const r = comparerTrace(petit, FIGURE_CARRE);
    assert.equal(r.reussi, false);
    assert.match(diagnostiquer(r, {}), /trop PETITE/);
});

test('un carré trop grand est diagnostiqué comme tel', () => {
    const grand = executer([stylo(), rep(4, [av(160), dr(90)])]).traces;
    assert.match(diagnostiquer(comparerTrace(grand, FIGURE_CARRE), {}), /trop GRANDE/);
});

test('un côté manquant reste « il manque un côté », pas un problème de taille', () => {
    const r = comparerTrace(executer([stylo(), rep(3, [av(100), dr(90)])]).traces, FIGURE_CARRE);
    assert.match(diagnostiquer(r, {}), /s'arrête trop tôt|manque/);
});

test('une page blanche garde son message propre', () => {
    assert.match(diagnostiquer(comparerTrace([], FIGURE_CARRE), { rienTrace: true }), /n'a rien tracé/);
    assert.match(diagnostiquer(comparerTrace([], FIGURE_CARRE), { rienTrace: true, styloOublie: true }), /stylo/);
});
